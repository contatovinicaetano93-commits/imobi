import { freeMetroPorts } from "./expo-utils.mjs";

console.log("Liberando portas 8081, 8082, 8083, 19000, 19001...");
freeMetroPorts([8081, 8082, 8083, 19000, 19001]);
console.log("Pronto. Rode: pnpm dev:device ou pnpm dev:tunnel");
