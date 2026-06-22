import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAssets } from "./ensure-assets.mjs";
import {
  freeMetroPorts,
  loadEnvFile,
  spawnExpo,
  syncApiUrlToLan,
} from "./expo-utils.mjs";
import { warmupMetroBundle } from "./warmup-metro.mjs";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.EXPO_DEV_PORT ?? "8082";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @returns {Promise<{ host: string; https: string }>} */
function startCloudflareTunnel(port) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("cloudflared demorou >2 min")),
      120_000,
    );

    const cf = spawn(
      "npx",
      ["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${port}`, "--no-autoupdate"],
      { shell: true, stdio: ["ignore", "pipe", "pipe"] },
    );

    startCloudflareTunnel._proc = cf;

    function onLine(line) {
      const m = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (!m) return;
      clearTimeout(timer);
      const https = m[0];
      resolve({ host: new URL(https).hostname, https });
    }

    cf.stdout.on("data", (buf) => {
      for (const line of buf.toString().split(/\r?\n/)) onLine(line);
    });
    cf.stderr.on("data", (buf) => {
      for (const line of buf.toString().split(/\r?\n/)) onLine(line);
    });
    cf.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    cf.on("exit", (code) => {
      if (code) console.warn(`\n[WARN] cloudflared parou (${code}). Rode pnpm dev:go de novo.\n`);
    });
  });
}

function printConnect({ host, https }) {
  const expUrl = `exp://${host}:443`;
  const loadingUrl = `${https}/_expo/loading?platform=ios`;

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  ✅ CONECTE O IPHONE — NÃO use 127.0.0.1         ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  OPÇÃO A (recomendada): Safari no iPhone:         ║");
  console.log(`║  ${loadingUrl.slice(0, 48)}`.padEnd(51) + "║");
  if (loadingUrl.length > 48) {
    console.log(`║  ${loadingUrl.slice(48)}`.padEnd(51) + "║");
  }
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  OPÇÃO B: Expo Go → digitar URL:                 ║");
  console.log(`║  ${expUrl}`.padEnd(51) + "║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log("║  ❌ NÃO escaneie QR localhost / 192.168 / Recentes║");
  console.log("╚══════════════════════════════════════════════════╝\n");
}

loadEnvFile(mobileRoot);
ensureAssets();
freeMetroPorts([8081, 8082, 8083, 19000, 19001]);
await sleep(3000);
syncApiUrlToLan(mobileRoot);

console.log("══════════════════════════════════════════════");
console.log("  IMOBI — TUNNEL Cloudflare");
console.log("══════════════════════════════════════════════");
console.log("  1/3 Abrindo tunnel...");
console.log("══════════════════════════════════════════════\n");

const tunnel = await startCloudflareTunnel(port);

console.log("  2/3 Tunnel OK:", tunnel.https);
console.log("  3/3 Iniciando Metro (sem localhost)...\n");

// Só EXPO_PACKAGER_PROXY_URL — hostname separado forçava porta :8082 (errado)
const child = spawnExpo(mobileRoot, ["start", "--port", port], {
  EXPO_PACKAGER_PROXY_URL: tunnel.https,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});

await warmupMetroBundle(port);
printConnect(tunnel);

process.on("SIGINT", () => {
  startCloudflareTunnel._proc?.kill();
  child.kill();
  process.exit(0);
});

child.on("exit", (code) => {
  startCloudflareTunnel._proc?.kill();
  process.exit(code ?? 1);
});
