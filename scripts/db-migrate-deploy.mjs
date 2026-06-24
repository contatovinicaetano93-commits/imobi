#!/usr/bin/env node
/**
 * prisma migrate deploy com fallback de baseline (P3005) em dev local.
 *
 *   pnpm db:migrate:deploy
 *   pnpm db:migrate:deploy -- --staging   # usa DATABASE_URL de .env.render.local
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const staging = args.includes("--staging");

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

function loadApiDatabaseUrl() {
  const apiRoot = resolve(root, "services/api");
  const env = {
    ...loadEnvFile(resolve(apiRoot, ".env")),
    ...loadEnvFile(resolve(apiRoot, ".env.local")),
  };
  return env.DATABASE_URL ?? "";
}

function loadRenderEnv() {
  const path = resolve(root, ".env.render.local");
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

const extraEnv = staging ? loadRenderEnv() : {};
const databaseUrl = extraEnv.DATABASE_URL ?? process.env.DATABASE_URL ?? loadApiDatabaseUrl();
if (databaseUrl) extraEnv.DATABASE_URL = databaseUrl;
if (staging && !extraEnv.DATABASE_URL && !process.env.DATABASE_URL) {
  console.error("❌ --staging requer DATABASE_URL em .env.render.local");
  process.exit(1);
}

function runDeploy() {
  return execSync(
    "pnpm --filter @imbobi/api exec prisma migrate deploy --schema prisma/schema.prisma",
    { cwd: root, env: { ...process.env, ...extraEnv }, encoding: "utf8" },
  );
}

try {
  const out = runDeploy();
  if (out) process.stdout.write(out);
  console.log("\n✅ migrate deploy OK");
} catch (err) {
  const msg = String(err.stdout ?? "") + String(err.stderr ?? "") + String(err.message ?? "");
  if (!msg.includes("P3005")) {
    process.stderr.write(msg);
    process.exit(err.status ?? 1);
  }

  const dbUrl = databaseUrl;
  const isLocal =
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("imobi_development");

  if (!isLocal && !staging) {
    console.error(
      "\n❌ P3005: banco não vazio sem histórico de migrations.\n" +
        "   Staging/produção: pnpm db:baseline (com DATABASE_URL correto) ou baseline manual.\n" +
        "   Local: pnpm db:setup ou pnpm db:baseline && pnpm db:migrate:deploy\n",
    );
    process.exit(1);
  }

  console.log("\n⚠️  P3005 — banco local criado com db push. Aplicando baseline...\n");
  execSync("node scripts/db-baseline.mjs", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });

  const out2 = runDeploy();
  if (out2) process.stdout.write(out2);
  console.log("\n✅ migrate deploy OK (após baseline)");
}
