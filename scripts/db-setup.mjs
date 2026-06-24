#!/usr/bin/env node
/**
 * Sobe PostgreSQL + Redis (Docker), aplica migrations e seed de dev.
 *
 * Uso: pnpm db:setup
 *      pnpm db:setup -- --fresh   # recria volume PostgreSQL do zero
 *
 * Requer DATABASE_URL em services/api/.env.local apontando para:
 * postgresql://imobi_user:imobi_secure_password_123@localhost:5432/imobi_development
 */
import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fresh = process.argv.includes("--fresh");
const DEV_DATABASE_URL =
  "postgresql://imobi_user:imobi_secure_password_123@localhost:5432/imobi_development";

function run(cmd, opts = {}) {
  const { env: extraEnv, ...rest } = opts;
  execSync(cmd, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, ...extraEnv },
    ...rest,
  });
}

function runDb(cmd) {
  run(cmd, { env: { DATABASE_URL: DEV_DATABASE_URL } });
}

function capture(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
}

function postgresStatus() {
  try {
    return capture("docker inspect -f '{{.State.Status}}' imobi-postgres-local");
  } catch {
    return "missing";
  }
}

function postgresLogs() {
  try {
    return capture("docker logs imobi-postgres-local 2>&1 | tail -20");
  } catch {
    return "";
  }
}

function isVersionMismatch(logs) {
  return logs.includes("database files are incompatible with server");
}

function resetPostgresVolume() {
  console.log("\n⚠️  Volume PostgreSQL incompatível (ex.: PG15 → PG16). Recriando volume...\n");
  run("docker compose down -v");
  run("docker compose up -d");
}

async function waitForPostgres(maxAttempts = 45) {
  for (let i = 1; i <= maxAttempts; i++) {
    const status = postgresStatus();

    if (status === "running") {
      try {
        execSync("docker exec imobi-postgres-local pg_isready -U imobi_user -d imobi_development", {
          stdio: "pipe",
          cwd: root,
        });
        return;
      } catch {
        // container up, postgres still initializing
      }
    }

    if (status === "exited") {
      const logs = postgresLogs();
      if (isVersionMismatch(logs)) {
        resetPostgresVolume();
        return waitForPostgres(maxAttempts);
      }
      throw new Error(
        `PostgreSQL parou inesperadamente.\n\n${logs}\n\nTente: pnpm db:setup -- --fresh`,
      );
    }

    if (i === maxAttempts) {
      const logs = postgresLogs();
      throw new Error(
        `PostgreSQL não ficou pronto a tempo (status: ${status}).\n\n${logs}\n\nTente: docker compose ps && pnpm db:setup -- --fresh`,
      );
    }

    process.stdout.write(`Aguardando PostgreSQL... (${i}/${maxAttempts})\n`);
    await sleep(1000);
  }
}

console.log("── IMOBI db:setup ──\n");

if (fresh) {
  console.log("Modo --fresh: recriando volumes Docker...\n");
  run("docker compose down -v");
  run("docker compose up -d");
} else {
  console.log("1/4 Subindo Docker (PostgreSQL + Redis)...");
  run("docker compose up -d");
}

console.log("\n2/4 Aguardando PostgreSQL...");
await waitForPostgres();

console.log("\n3/4 Schema + Prisma client...");
run("pnpm db:generate");
// db push evita ordem lexicográfica quebrada das pastas 10_* vs 1_* em banco novo
runDb("pnpm --filter @imbobi/api exec prisma db push --schema prisma/schema.prisma --accept-data-loss");

console.log("\n4/4 Seed de usuários de dev...");
runDb("pnpm seed:dev");

console.log("\n✅ Banco local pronto.\n");
console.log("DATABASE_URL=postgresql://imobi_user:imobi_secure_password_123@localhost:5432/imobi_development");
console.log("REDIS_HOST=localhost REDIS_PORT=6379");
console.log("\nContas: tomador@imobi.com.br / Tomador@123 | admin@imobi.com.br / Admin@123");
console.log("Inicie: pnpm dev\n");
