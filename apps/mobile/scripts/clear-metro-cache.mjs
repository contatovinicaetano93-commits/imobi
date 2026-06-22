import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = path.resolve(mobileRoot, "../..");

function rmDirSafe(dir) {
  if (!fs.existsSync(dir)) return false;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

export function clearMetroCache() {
  const targets = [
    path.join(mobileRoot, ".expo"),
    path.join(os.tmpdir(), "metro-cache"),
    path.join(os.tmpdir(), "haste-map-"),
    path.join(monorepoRoot, "node_modules", ".cache"),
    path.join(mobileRoot, "node_modules", ".cache"),
  ];

  let cleared = 0;
  for (const target of targets) {
    if (target.endsWith("-")) {
      const parent = path.dirname(target);
      const prefix = path.basename(target);
      if (!fs.existsSync(parent)) continue;
      for (const entry of fs.readdirSync(parent)) {
        if (entry.startsWith(prefix) && rmDirSafe(path.join(parent, entry))) cleared++;
      }
      continue;
    }
    if (rmDirSafe(target)) cleared++;
  }

  console.log(`Cache Metro: ${cleared} pasta(s) removida(s).`);
}

if (process.argv[1]?.endsWith("clear-metro-cache.mjs")) {
  clearMetroCache();
}
