#!/usr/bin/env node
/**
 * Railway API boot: preflight → prisma migrate deploy → node dist/main.js
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function log(msg) {
  console.log(`[railway-start] ${msg}`);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd: apiRoot,
    stdio: opts.inherit === false ? "pipe" : "inherit",
    encoding: "utf8",
    env: process.env,
  });
}

for (const key of ["NODE_ENV", "DATABASE_URL", "JWT_SECRET", "PORT"]) {
  log(`${key}: ${process.env[key] ? "set" : "MISSING"}`);
}
log(`RAILWAY_PUBLIC_DOMAIN: ${process.env.RAILWAY_PUBLIC_DOMAIN ?? "not set (enable Public Networking no serviço API)"}`);

if (!process.env.DATABASE_URL) {
  log("FATAL: DATABASE_URL ausente — vincule o Postgres ao serviço API no Railway.");
  process.exit(1);
}
if (!process.env.JWT_SECRET?.trim()) {
  log("FATAL: JWT_SECRET ausente — adicione em Variables do serviço API.");
  process.exit(1);
}

const postgis = spawnSync(
  "pnpm",
  ["exec", "prisma", "db", "execute", "--stdin", "--schema", "prisma/schema.prisma"],
  {
    cwd: apiRoot,
    input: "SELECT PostGIS_Version();",
    encoding: "utf8",
    env: process.env,
  },
);

const postgisOut = `${postgis.stdout ?? ""}${postgis.stderr ?? ""}`;
if (postgis.status !== 0 && /postgis|0A000|not available/i.test(postgisOut)) {
  log("");
  log("FATAL: PostGIS não está disponível neste Postgres do Railway.");
  log("  O Imobi precisa de PostGIS (GPS nas evidências de obra).");
  log("");
  log("  Correção (escolha uma):");
  log("  A) Railway → New → Template → PostGIS → substituir o Postgres vanilla");
  log("     Depois: apague o volume do Postgres antigo OU crie DB novo vazio");
  log("     Variables API: DATABASE_URL = ${{PostGIS.DATABASE_URL}}");
  log("  B) Trocar branch de deploy para sync/mac-migration-2026-06 (init sem postgis)");
  log("     + apagar volume Postgres e redeploy (GPS limitado até PostGIS)");
  log("  C) Usar Render Postgres (já com migrações OK) em vez de Railway DB");
  log("");
  log("  Se migração 0_init falhou antes (P3009): apague o volume Postgres e redeploy.");
  log("");
  process.exit(1);
}

const migrate = run("pnpm", [
  "exec",
  "prisma",
  "migrate",
  "deploy",
  "--schema",
  "prisma/schema.prisma",
]);

if (migrate.status !== 0) {
  const out = `${migrate.stdout ?? ""}${migrate.stderr ?? ""}`;
  log(`prisma migrate deploy failed (exit ${migrate.status ?? 1})`);
  if (/P3009|0_init|postgis/i.test(out)) {
    log("");
    log("P3009 = migração travada. Postgres provavelmente sem PostGIS ou deploy anterior falhou.");
    log("→ Railway: Postgres → Settings → Delete service (ou wipe volume) → PostGIS template → redeploy API");
  }
  process.exit(migrate.status ?? 1);
}

log("starting API");
const start = run("node", ["./dist/main.js"]);
process.exit(start.status ?? 1);
