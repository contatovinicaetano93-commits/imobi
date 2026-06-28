#!/usr/bin/env node
/**
 * Corrige Prisma P3009 (migration falha bloqueando deploy) e renomeia entradas antigas.
 *
 * Cenário típico: reorder 0_init → 00_init deixou registro failed + histórico com nomes antigos.
 *
 *   pnpm db:fix:p3009 -- --staging
 *   pnpm db:fix:p3009 -- --staging --dry-run
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { loadRenderEnvFile, RENDER_ENV_PATH } from "./render-env-utils.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = resolve(root, "services/api");
const require = createRequire(resolve(apiRoot, "package.json"));
const { PrismaClient } = require("@prisma/client");

const args = process.argv.slice(2);
const staging = args.includes("--staging");
const dryRun = args.includes("--dry-run");

function loadApiDatabaseUrl() {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    const p = resolve(apiRoot, file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  }
  return env.DATABASE_URL ?? "";
}

function resolveDatabaseUrl() {
  if (staging) {
    const render = loadRenderEnvFile();
    if (render.DATABASE_URL) return render.DATABASE_URL;
    console.error(`❌ --staging requer DATABASE_URL em ${RENDER_ENV_PATH}`);
    process.exit(1);
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const local = loadApiDatabaseUrl();
  if (!local) {
    console.error("❌ Defina DATABASE_URL ou use --staging");
    process.exit(1);
  }
  return local;
}

const RENAMES = [
  ["0_init", "00_init"],
  ["1_add_notifications", "01_add_notifications"],
  ["2_add_kyc_documents", "02_add_kyc_documents"],
  ["3_add_performance_indexes", "03_add_performance_indexes"],
  ["4_add_audit_logs", "04_add_audit_logs"],
  ["5_add_usuario_deletado_em", "05_add_usuario_deletado_em"],
  ["6_add_lgpd_consent_fields", "06_add_lgpd_consent_fields"],
  ["7_add_comercial_pipeline", "07_add_comercial_pipeline"],
  ["8_add_password_reset", "08_add_password_reset"],
  ["9_add_staff_roles", "09_add_staff_roles"],
  ["20260612_add_documentos", "18_add_documentos"],
  [
    "20260623010920_add_obra_homologada_notification",
    "19_add_obra_homologada_notification",
  ],
];

const DOCUMENTOS_CHECKSUM =
  "ceabce95e4f167c3e621738fb80f7c7008a4baa4d6357737b4f6afb6298e4675";

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  const hostHint = (() => {
    try {
      return new URL(databaseUrl.replace(/^postgres:/, "postgresql:")).hostname;
    } catch {
      return "(url inválida)";
    }
  })();

  console.log("── Fix Prisma P3009 + rename migrations ──\n");
  console.log(`Alvo: ${hostHint}${staging ? " (staging)" : ""}\n`);

  if (staging && (hostHint.includes("localhost") || hostHint === "127.0.0.1")) {
    console.error("❌ --staging com DATABASE_URL apontando para localhost");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    const before = (await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY started_at
    `) ;

    const failed = before.filter((r) => !r.finished_at && !r.rolled_back_at);
    console.log(`Migrations: ${before.length} total, ${failed.length} failed\n`);

    if (failed.length) {
      for (const row of failed) {
        const renamedFrom = RENAMES.find(([, to]) => to === row.migration_name)?.[0];
        const renamedTo = RENAMES.find(([from]) => from === row.migration_name)?.[1];
        const equivalentApplied =
          (renamedFrom &&
            before.some(
              (r) =>
                r.migration_name === renamedFrom &&
                r.finished_at &&
                !r.rolled_back_at,
            )) ||
          (renamedTo &&
            before.some(
              (r) =>
                r.migration_name === renamedTo && r.finished_at && !r.rolled_back_at,
            ));

        if (equivalentApplied) {
          const note = renamedTo
            ? `"${row.migration_name}" (schema já em "${renamedTo}")`
            : `"${row.migration_name}" (já aplicada como "${renamedFrom}")`;
          console.log(`  → Remover failed ${note}`);
          if (!dryRun) {
            await prisma.$executeRaw`
              DELETE FROM "_prisma_migrations"
              WHERE migration_name = ${row.migration_name}
                AND finished_at IS NULL
            `;
          }
        } else {
          console.log(`  → Marcar rolled-back: "${row.migration_name}"`);
          if (!dryRun) {
            await prisma.$executeRaw`
              UPDATE "_prisma_migrations"
              SET rolled_back_at = NOW()
              WHERE migration_name = ${row.migration_name}
                AND finished_at IS NULL
            `;
          }
        }
      }
    } else {
      console.log("  Nenhuma migration failed.\n");
    }

    const current = dryRun
      ? before
      : ((await prisma.$queryRaw`
          SELECT migration_name, finished_at, rolled_back_at
          FROM "_prisma_migrations"
        `) );

    console.log("\nRenomeando entradas antigas:");
    for (const [from, to] of RENAMES) {
      const exists = current.some((r) => r.migration_name === from);
      const targetExists = current.some((r) => r.migration_name === to);
      if (!exists) continue;
      if (targetExists) {
        console.log(`  ↷ ${from} → ${to} (destino já existe, pulando)`);
        continue;
      }
      console.log(`  ✓ ${from} → ${to}`);
      if (!dryRun) {
        if (to === "18_add_documentos") {
          await prisma.$executeRaw`
            UPDATE "_prisma_migrations"
            SET migration_name = ${to}, checksum = ${DOCUMENTOS_CHECKSUM}
            WHERE migration_name = ${from}
          `;
        } else {
          await prisma.$executeRaw`
            UPDATE "_prisma_migrations"
            SET migration_name = ${to}
            WHERE migration_name = ${from}
          `;
        }
      }
    }

    if (dryRun) {
      console.log("\n(dry-run — nada alterado)");
      return;
    }

    const afterFailed = (await prisma.$queryRaw`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `) ;
    if (afterFailed.length > 0) {
      console.error("\n❌ Ainda há migrations failed:", afterFailed.map((r) => r.migration_name));
      process.exit(1);
    }

    console.log("\n✅ P3009 resolvido. Próximo passo:");
    console.log("   pnpm db:migrate:deploy:staging");
    console.log(
      "   bash scripts/post-deploy-verification.sh https://imobi-api-staging.onrender.com\n",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌", err.message ?? err);
  process.exit(1);
});
