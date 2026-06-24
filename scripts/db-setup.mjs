#!/usr/bin/env node
/**
 * Sobe PostgreSQL + Redis (Docker), aplica migrations e seed de dev.
 *
 * Uso: pnpm db:setup
 *
 * Requer DATABASE_URL em services/api/.env.local apontando para:
 * postgresql://imobi_user:imobi_secure_password_123@localhost:5432/imobi_development
 */
import { execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

async function waitForPostgres(maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      execSync("docker exec imobi-postgres-local pg_isready -U imobi_user", {
        stdio: "pipe",
        cwd: root,
      });
      return;
    } catch {
      if (i === maxAttempts) {
        throw new Error("PostgreSQL não ficou pronto a tempo. Verifique: docker compose ps");
      }
      process.stdout.write(`Aguardando PostgreSQL... (${i}/${maxAttempts})\n`);
      await sleep(1000);
    }
  }
}

console.log("── IMOBI db:setup ──\n");

console.log("1/4 Subindo Docker (PostgreSQL + Redis)...");
run("docker compose up -d");

console.log("\n2/4 Aguardando PostgreSQL...");
await waitForPostgres();

console.log("\n3/4 Migrations + Prisma client...");
run("pnpm db:generate");
run("pnpm --filter @imbobi/api exec prisma migrate deploy --schema prisma/schema.prisma");

console.log("\n4/4 Seed de usuários de dev...");
run("pnpm seed:dev");

console.log("\n✅ Banco local pronto.\n");
console.log("DATABASE_URL=postgresql://imobi_user:imobi_secure_password_123@localhost:5432/imobi_development");
console.log("REDIS_HOST=localhost REDIS_PORT=6379");
console.log("\nContas: tomador@imobi.com.br / Tomador@123 | admin@imobi.com.br / Admin@123");
console.log("Inicie: pnpm dev\n");
