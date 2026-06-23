import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { ensureAssets } from "./ensure-assets.mjs";
import {
  freeApiPort,
  freeMetroPorts,
  getLanIp,
  resolveApiPort,
  loadEnvFile,
  spawnExpo,
  syncApiUrlToLan,
  syncDevForceLogin,
  ensureFirewallRules,
} from "./expo-utils.mjs";
import { warmupMetroBundle, printConnectInstructions } from "./warmup-metro.mjs";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.env.EXPO_DEV_PORT ?? "8082";

loadEnvFile(mobileRoot);
ensureAssets();
const apiPort = resolveApiPort(mobileRoot);
freeMetroPorts([8081, 8082, 8083, 19000, 19001]);
freeApiPort(apiPort);
await new Promise((r) => setTimeout(r, 3000));

const host = getLanIp();
const apiUrl = syncApiUrlToLan(mobileRoot);
ensureFirewallRules(apiPort);
syncDevForceLogin(mobileRoot, true);
const onHotspot = host.startsWith("172.20.10.");

console.log("══════════════════════════════════════════════");
console.log("  IMOBI — modo HOTSPOT (iPhone → PC)");
console.log("══════════════════════════════════════════════");

if (!onHotspot) {
  console.log("  ⚠️  PC NÃO está no hotspot do iPhone!");
  console.log("  IP atual:", host, "— esperado: 172.20.10.x");
  console.log("");
  console.log("  1. iPhone: Ajustes → Dados → Compart. Internet → ON");
  console.log("  2. PC: desconecte da Wi‑Fi de casa");
  console.log("  3. PC: conecte na rede Wi‑Fi do iPhone");
  console.log("  4. Rode de novo: pnpm dev:hotspot");
  console.log("══════════════════════════════════════════════\n");
  process.exit(1);
}

console.log("  ✅ Hotspot detectado:", host);
console.log("  API:", apiUrl);
console.log("  Teste no iPhone (Safari):", `${apiUrl}/api/v1/health`);
console.log("  Se falhar: rode open-firewall.ps1 como Administrador");
console.log("══════════════════════════════════════════════\n");

const expUrl = `exp://${host}:${port}`;
writeFileSync(
  path.join(mobileRoot, "CONECTAR.txt"),
  `Safari Metro: http://${host}:${port}/status\nSafari API: ${apiUrl}/api/v1/health\nExpo Go: ${expUrl}\n`,
  "utf8",
);

console.log(`  URL: ${expUrl}`);
console.log(`  Teste Safari: http://${host}:${port}/status\n`);

const child = spawnExpo(mobileRoot, ["start", "--lan", "--port", port, "--clear"], {
  REACT_NATIVE_PACKAGER_HOSTNAME: host,
  EXPO_PUBLIC_API_URL: apiUrl,
  EXPO_PUBLIC_DEV_FORCE_LOGIN: "1",
});

const bundleReady = await warmupMetroBundle(port);
printConnectInstructions(host, port, bundleReady);

child.on("exit", (code) => process.exit(code ?? 1));
