import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const expoDir = path.join(os.homedir(), ".expo");
const targets = [
  path.join(expoDir, "ngrok.yml"),
  path.join(expoDir, "ngrok.yml.backup"),
];

export function resetNgrokConfig() {
  let removed = 0;
  for (const file of targets) {
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true });
      removed++;
    }
  }

  if (process.platform === "win32") {
    try {
      execSync(
        'powershell -NoProfile -Command "Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue"',
        { stdio: "ignore" },
      );
    } catch {
      // ignore
    }
  }

  console.log(`Ngrok: ${removed} arquivo(s) removido(s) em ~/.expo`);
}

if (process.argv[1]?.endsWith("reset-ngrok.mjs")) {
  resetNgrokConfig();
}
