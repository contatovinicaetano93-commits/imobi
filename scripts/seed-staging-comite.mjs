#!/usr/bin/env node
/** Seed solicitação PENDENTE para fluxo comitê (staging). */
import { execSync } from "node:child_process";
import { loadRenderEnvFile } from "./render-env-utils.mjs";

const env = loadRenderEnvFile();
const databaseUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL ausente (.env.render.local)");
  process.exit(1);
}

execSync("pnpm --filter @imbobi/api exec tsx src/seeds/seed-staging-comite.ts", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
});
