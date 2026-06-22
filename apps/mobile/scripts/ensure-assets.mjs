import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(mobileRoot, "assets");

/** Minimal valid 1x1 PNG (#0C1A3D placeholder for dev). */
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

const REQUIRED = ["icon.png", "splash.png", "adaptive-icon.png"];

export function ensureAssets() {
  fs.mkdirSync(assetsDir, { recursive: true });
  let created = 0;
  for (const name of REQUIRED) {
    const target = path.join(assetsDir, name);
    if (fs.existsSync(target)) continue;
    fs.writeFileSync(target, PLACEHOLDER_PNG);
    created++;
  }
  if (created > 0) {
    console.log(`Assets: ${created} placeholder(s) criados em assets/`);
  }
}

if (process.argv[1]?.endsWith("ensure-assets.mjs")) {
  ensureAssets();
}
