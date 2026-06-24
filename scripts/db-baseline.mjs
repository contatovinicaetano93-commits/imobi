#!/usr/bin/env node
/**
 * Marca todas as migrations como aplicadas em um banco já provisionado (ex.: db push).
 * Resolve Prisma P3005 ("database schema is not empty") antes de migrate deploy.
 * P3008 (já aplicada) é ignorado silenciosamente.
 *
 *   pnpm db:baseline
 *   DATABASE_URL=... pnpm db:baseline
 */
import { execSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = resolve(root, "services/api/prisma/migrations");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const apiRoot = resolve(root, "services/api");
  const env = {
    ...loadEnvFile(resolve(apiRoot, ".env")),
    ...loadEnvFile(resolve(apiRoot, ".env.local")),
  };
  return env.DATABASE_URL ?? "";
}

const databaseUrl = resolveDatabaseUrl();
const deployEnv = databaseUrl ? { DATABASE_URL: databaseUrl } : {};

function listMigrations() {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Pasta de migrations não encontrada: ${migrationsDir}`);
  }
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function markApplied(name) {
  const cmd =
    `pnpm --filter @imbobi/api exec prisma migrate resolve --applied "${name}" --schema prisma/schema.prisma`;
  try {
    execSync(cmd, {
      cwd: root,
      env: { ...process.env, ...deployEnv },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return "applied";
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}`;
    if (out.includes("P3008") || out.includes("already recorded as applied")) {
      return "skipped";
    }
    process.stderr.write(out);
    throw err;
  }
}

const migrations = listMigrations();
if (migrations.length === 0) {
  console.error("Nenhuma migration encontrada.");
  process.exit(1);
}

const host = databaseUrl.includes("@")
  ? databaseUrl.split("@")[1]?.split("/")[0]
  : "(services/api/.env)";
console.log(`── Baseline Prisma (${migrations.length} migrations) ──`);
console.log(`DATABASE: ${host}\n`);

let applied = 0;
let skipped = 0;

for (const name of migrations) {
  const result = markApplied(name);
  if (result === "applied") {
    console.log(`  ✓ ${name}`);
    applied += 1;
  } else {
    console.log(`  ↷ ${name} (já registrada)`);
    skipped += 1;
  }
}

console.log(`\n✅ Baseline OK — ${applied} marcada(s), ${skipped} já existente(s).`);
if (applied > 0) {
  console.log("   Próximo passo: pnpm db:migrate:deploy\n");
} else {
  console.log("   Nada pendente. Use: pnpm db:migrate:deploy\n");
}
