import { freeApiPort, freeMetroPorts, resolveApiPort } from "./expo-utils.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiPort = resolveApiPort(mobileRoot);

console.log("Liberando portas 8081, 8082, 8083, 19000, 19001...");
freeMetroPorts([8081, 8082, 8083, 19000, 19001]);
console.log(`Liberando porta da API (${apiPort})...`);
freeApiPort(apiPort);
console.log("Pronto. Rode: pnpm dev:api e depois pnpm dev:hotspot");
