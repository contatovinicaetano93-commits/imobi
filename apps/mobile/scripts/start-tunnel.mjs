import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { resetNgrokConfig } from "./reset-ngrok.mjs";
import { ensureAssets } from "./ensure-assets.mjs";
import {
  freeMetroPorts,
  getLanIp,
  loadEnvFile,
  spawnExpo,
  syncApiUrlToLan,
} from "./expo-utils.mjs";
import { warmupMetroBundle, printConnectInstructions } from "./warmup-metro.mjs";

const require = createRequire(import.meta.url);
const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.EXPO_DEV_PORT ?? "8082";

// Expo tunnel integrado exige :8081 (Windows usa essa porta). Ngrok manual em :8082.
const NGROK_AUTH = "5W1bR67GNbWcXqmxZzBG1_56GezNeaX6sSRvn8npeQ8";

loadEnvFile(mobileRoot);
ensureAssets();
resetNgrokConfig();
freeMetroPorts([8081, 8082, 8083, 19000, 19001]);
await new Promise((r) => setTimeout(r, 3000));

const host = getLanIp();
const apiUrl = syncApiUrlToLan(mobileRoot);

console.log("══════════════════════════════════════════════");
console.log("  IMOBI MOBILE — modo TUNNEL (ngrok :8082)");
console.log("══════════════════════════════════════════════");
console.log("  Use quando LAN der timeout no iPhone.");
console.log("  Desative VPN/antivírus. Login: expo whoami");
console.log("══════════════════════════════════════════════\n");

const child = spawnExpo(
  mobileRoot,
  ["start", "--lan", "--port", port],
  {
    REACT_NATIVE_PACKAGER_HOSTNAME: host,
    EXPO_PUBLIC_API_URL: apiUrl,
  },
);

const bundled = await warmupMetroBundle(port);

let tunnelUrl = null;
if (bundled) {
  try {
    console.log("\n⏳ Abrindo tunnel ngrok (pode levar ~30s)...\n");
    const ngrok = require("@expo/ngrok");
    const configPath = path.join(
      process.env.USERPROFILE ?? process.env.HOME ?? "",
      ".expo",
      "ngrok.yml",
    );
    tunnelUrl = await ngrok.connect({
      addr: Number(port),
      authtoken: NGROK_AUTH,
      configPath,
      onStatusChange(status) {
        if (status === "connected") console.log("Tunnel ngrok conectado.");
      },
    });
    const tunnelHost = new URL(tunnelUrl).hostname;
    const expUrl = `exp://${tunnelHost}`;
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║  ✅ TUNNEL PRONTO — escaneie ESTE URL no iPhone  ║");
    console.log("╠══════════════════════════════════════════════════╣");
    console.log(`║  ${expUrl}`.padEnd(51) + "║");
    console.log("╠══════════════════════════════════════════════════╣");
    console.log("║  NÃO use 192.168.x.x — só o URL .exp.direct acima ║");
    console.log("╚══════════════════════════════════════════════════╝\n");
  } catch (err) {
    console.error("\n[TUNNEL FALHOU]", err.message ?? err);
    console.error("\nAlternativa — Hotspot do iPhone:");
    console.error("  1. iPhone: Ajustes → Dados → Compart. Internet → ON");
    console.error("  2. PC conecta no Wi‑Fi do iPhone");
    console.error("  3. pnpm dev:kill && pnpm dev:device");
    console.error("  4. Escaneie QR com IP 172.20.10.x\n");
    printConnectInstructions(host, port);
  }
} else {
  printConnectInstructions(host, port);
}

child.on("exit", (code) => process.exit(code ?? 1));

process.on("SIGINT", async () => {
  try {
    const ngrok = require("@expo/ngrok");
    await ngrok.kill();
  } catch {
    // ignore
  }
  process.exit(0);
});
