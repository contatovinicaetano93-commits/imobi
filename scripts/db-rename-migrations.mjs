#!/usr/bin/env node
/**
 * Renomeia migration_name em _prisma_migrations (staging/prod) após reorder local.
 *
 *   pnpm db:rename-migrations -- --staging          # usa DATABASE_URL de .env.render.local
 *   pnpm db:rename-migrations -- --dry-run --staging
 *   DATABASE_URL=... pnpm db:rename-migrations
 *
 * Depois: pnpm db:migrate:deploy:staging
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRenderEnvFile, RENDER_ENV_PATH } from "./render-env-utils.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = resolve(root, "scripts/sql/rename-prisma-migration-names.sql");
const args = process.argv.slice(2);
const staging = args.includes("--staging");
const dryRun = args.includes("--dry-run");

function loadApiDatabaseUrl() {
  const apiRoot = resolve(root, "services/api");
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
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (staging) {
    const render = loadRenderEnvFile();
    if (render.DATABASE_URL) return render.DATABASE_URL;
    console.error(`❌ --staging requer DATABASE_URL em ${RENDER_ENV_PATH}`);
    process.exit(1);
  }
  const local = loadApiDatabaseUrl();
  if (!local) {
    console.error("❌ Defina DATABASE_URL ou use --staging");
    process.exit(1);
  }
  return local;
}

const databaseUrl = resolveDatabaseUrl();
const hostHint = (() => {
  try {
    return new URL(databaseUrl.replace(/^postgres:/, "postgresql:")).hostname;
  } catch {
    return "(url inválida)";
  }
})();

console.log("── rename _prisma_migrations ──\n");
console.log(`Alvo: ${hostHint}${staging ? " (staging)" : ""}`);
console.log(`SQL:  ${sqlPath}\n`);

if (dryRun) {
  console.log("Modo --dry-run. SQL a executar:\n");
  console.log(readFileSync(sqlPath, "utf8"));
  console.log("\nPara aplicar: pnpm db:rename-migrations -- --staging");
  process.exit(0);
}

if (staging && (hostHint.includes("localhost") || hostHint === "127.0.0.1")) {
  console.error("❌ --staging com DATABASE_URL apontando para localhost. Verifique .env.render.local");
  process.exit(1);
}

try {
  execSync(`psql "${databaseUrl}" -v ON_ERROR_STOP=1 -f "${sqlPath}"`, {
    stdio: "inherit",
    env: process.env,
  });
} catch {
  console.error("\n❌ Falhou. Instale psql ou rode o SQL manualmente no dashboard Neon/Render.");
  console.error("   Arquivo: scripts/sql/rename-prisma-migration-names.sql");
  process.exit(1);
}

console.log("\n✅ Nomes atualizados. Próximo passo:");
console.log("   pnpm db:migrate:deploy:staging");
console.log("   bash scripts/post-deploy-verification.sh https://imobi-api-staging.onrender.com\n");
