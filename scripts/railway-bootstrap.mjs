#!/usr/bin/env node
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: "/bin/bash" });
}

function setVar(key, value) {
  run(`railway variables --set '${key}=${value.replace(/'/g, "'\\''")}'`);
}

const jwt = process.env.JWT_SECRET ?? randomBytes(48).toString("base64url");

console.log("\n=== Railway bootstrap: @imbobi/api ===\n");

setVar("NODE_ENV", "production");
setVar("DATABASE_URL", "${{Postgres.DATABASE_URL}}");
setVar("JWT_SECRET", jwt);
setVar("JWT_EXPIRES_IN", "15m");
setVar("JWT_REFRESH_EXPIRES_IN", "7d");
setVar("DISABLE_IN_PROCESS_WORKERS", "true");
setVar("CORS_ORIGIN", "https://imobi-web-ten.vercel.app");

console.log("\nDone. Add Redis later: REDIS_URL=${{Redis.REDIS_URL}}\n");
