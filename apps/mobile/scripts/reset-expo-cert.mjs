import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EAS_PROJECT_ID = "6bf955c5-863a-4344-ac39-6a55c89658d4";
const cacheDir = path.join(os.homedir(), ".expo", "codesigning", EAS_PROJECT_ID);

fs.rmSync(cacheDir, { recursive: true, force: true });
console.log(`Cleared Expo development certificate cache: ${cacheDir}`);
console.log("Next: ensure you are logged in with `pnpm exec expo login`, then start without --offline.");
