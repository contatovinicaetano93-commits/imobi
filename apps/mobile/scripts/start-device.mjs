import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureAssets } from "./ensure-assets.mjs";
import {
  freeMetroPorts,
  getLanIp,
  loadEnvFile,
  spawnExpo,
  syncApiUrlToLan,
} from "./expo-utils.mjs";
import { warmupMetroBundle, printConnectInstructions } from "./warmup-metro.mjs";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.EXPO_DEV_PORT ?? "8082";

loadEnvFile(mobileRoot);
ensureAssets();
// Cache clear only via `pnpm dev:reset` — --clear here hangs Metro for minutes on Windows.

freeMetroPorts([8081, 8082, 8083, 19000, 19001]);
await new Promise((r) => setTimeout(r, 3000));

const host = getLanIp();
const apiUrl = syncApiUrlToLan(mobileRoot);

console.log("══════════════════════════════════════════════");
console.log("  IMOBI MOBILE — modo LAN (Expo Go)");
console.log("══════════════════════════════════════════════");
console.log(`  URL:  exp://${host}:${port}  (NÃO use :8081 — Windows ocupa essa porta)`);
console.log(`  API:  ${apiUrl}`);
console.log("");
console.log("  iPhone: Ajustes → Expo Go → Rede local → ON");
console.log("  Mesma Wi-Fi. Modo avião OFF.");
console.log("");
console.log("  ⛔ NÃO ESCANEIE O QR ATÉ VER a mensagem abaixo:");
console.log("     (aguarde: >>> BUNDLE PRONTO <<< aparecer no final)");
console.log("");
console.log("  No iPhone: lista 'Development servers' pode ficar vazia");
console.log("  (normal no Windows). Use o QR ou toque em 'IMOBI' em Recentes.");
console.log("");
console.log("  Se der TIMEOUT no iPhone:");
console.log(`  A) Safari: http://${host}:${port}/status`);
console.log("  B) Se Safari falhar → pnpm dev:go (tunnel)");
console.log("  C) Hotspot iPhone: PC no Wi‑Fi do celular → dev:device");
console.log("══════════════════════════════════════════════\n");

const child = spawnExpo(
  mobileRoot,
  ["start", "--lan", "--port", port],
  {
    REACT_NATIVE_PACKAGER_HOSTNAME: host,
    EXPO_PUBLIC_API_URL: apiUrl,
  },
);

await warmupMetroBundle(port);
printConnectInstructions(host, port);

child.on("exit", (code) => process.exit(code ?? 1));
