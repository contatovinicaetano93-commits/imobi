import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.PORT ?? process.env.API_PORT ?? "4001";

function freePort(p) {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(`netstat -ano | findstr ":${p} " | findstr LISTENING`, {
      encoding: "utf8",
      timeout: 8000,
    });
    const pids = new Set(
      out
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid) && pid !== "0"),
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore", timeout: 5000 });
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

function resolveNodeBin() {
  const bundled = path.join(
    apiRoot,
    "..",
    "..",
    "apps",
    "mobile",
    ".tools",
    "node-v20.19.0-win-x64",
    "node.exe",
  );
  if (process.platform === "win32" && fs.existsSync(bundled)) {
    const major = Number(process.version.slice(1).split(".")[0]);
    if (major !== 20) {
      console.log(
        `Node ${process.version} → usando Node 20 bundled (nest crasha no Node 24 no Windows)\n`,
      );
    }
    return bundled;
  }
  return process.execPath;
}

freePort(port);
const nodeBin = resolveNodeBin();
const nestCli = path.join(apiRoot, "node_modules", "@nestjs", "cli", "bin", "nest.js");

if (!fs.existsSync(nestCli)) {
  console.error("Nest CLI não encontrado. Rode: pnpm install");
  process.exit(1);
}

const child = spawn(nodeBin, [nestCli, "start", "--watch"], {
  cwd: apiRoot,
  stdio: "inherit",
  env: process.env,
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 1));
