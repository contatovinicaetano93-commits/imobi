/**
 * Carrega .env.local antes do Prisma Client (que só lê .env por padrão).
 * Importar como primeira linha de main.ts.
 * Em produção (Render), variáveis vêm do ambiente — dotenv fica em devDependencies.
 */
import { resolve } from "path";

if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require("dotenv") as typeof import("dotenv");
  const apiRoot = resolve(__dirname, "..");
  config({ path: resolve(apiRoot, ".env") });
  config({ path: resolve(apiRoot, ".env.local"), override: true });
}
