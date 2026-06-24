/**
 * Carrega .env.local antes do Prisma Client (que só lê .env por padrão).
 * Importar como primeira linha de main.ts.
 */
import { config } from "dotenv";
import { resolve } from "path";

const apiRoot = resolve(__dirname, "..");
config({ path: resolve(apiRoot, ".env") });
config({ path: resolve(apiRoot, ".env.local"), override: true });
