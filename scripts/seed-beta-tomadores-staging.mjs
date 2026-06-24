#!/usr/bin/env node
/**
 * Cria 3 tomadores beta no Postgres staging (KYC pendente).
 *
 *   pnpm seed:staging:beta-tomadores
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRenderEnvFile,
  createRenderApi,
  resolveRenderApiKey,
  assertDatabaseUrl,
} from './render-env-utils.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const fileEnv = loadRenderEnvFile();
const token = resolveRenderApiKey(fileEnv);

if (!token) {
  console.error('❌ RENDER_API_KEY ausente. Rode: pnpm render:init');
  process.exit(1);
}

const render = createRenderApi(token);
const serviceId = await render.resolveStagingServiceId(
  process.env.RENDER_SERVICE_ID ?? fileEnv.RENDER_SERVICE_ID,
);

console.log(`→ Buscando DATABASE_URL do serviço ${serviceId}…`);
const databaseUrl = await render.getServiceEnvVar(serviceId, 'DATABASE_URL');
assertDatabaseUrl(databaseUrl);

console.log('→ Gerando Prisma client…');
const gen = spawnSync('pnpm', ['db:generate'], { cwd: root, stdio: 'inherit' });
if (gen.status !== 0) process.exit(gen.status ?? 1);

console.log('→ Criando 3 tomadores beta…');
const seed = spawnSync(
  'pnpm',
  ['--filter', '@imbobi/api', 'exec', 'tsx', 'src/seeds/seed-beta-tomadores.ts'],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl.trim(),
      BETA_WEB_URL: 'https://imobi-web-ten.vercel.app',
    },
  },
);
process.exit(seed.status ?? 1);
