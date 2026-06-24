#!/usr/bin/env node
/**
 * Marca todas as migrations como aplicadas em um banco já provisionado (ex.: db push).
 * Resolve Prisma P3005 ("database schema is not empty") antes de migrate deploy.
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

function run(cmd) {
  execSync(cmd, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...deployEnv },
  });
}

function listMigrations() {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Pasta de migrations não encontrada: ${migrationsDir}`);
  }
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

const migrations = listMigrations();
if (migrations.length === 0) {
  console.error("Nenhuma migration encontrada.");
  process.exit(1);
}

const dbUrl = databaseUrl;
const host = dbUrl.includes("@") ? dbUrl.split("@")[1]?.split("/")[0] : "default";
console.log(`── Baseline Prisma (${migrations.length} migrations) ──`);
console.log(`DATABASE: ${host || "(services/api/.env)"}\n`);

for (const name of migrations) {
  console.log(`→ resolve --applied ${name}`);
  try {
    run(
      `pnpm --filter @imbobi/api exec prisma migrate resolve --applied "${name}" --schema prisma/schema.prisma`,
    );
  } catch {
    // Já marcada — segue
  }
}

console.log("\n✅ Baseline concluído. Agora: pnpm db:migrate:deploy\n");
