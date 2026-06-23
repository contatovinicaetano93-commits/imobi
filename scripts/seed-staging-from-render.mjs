#!/usr/bin/env node
/**
 * Seed staging usando DATABASE_URL já configurada no Render (via API).
 * Só precisa de RENDER_API_KEY válida — não precisa copiar DATABASE_URL localmente.
 *
 *   1. Render → Account Settings → API Keys → Create
 *   2. Cole em .env.render.local: RENDER_API_KEY=rnd_xxxxxxxx
 *   3. pnpm seed:staging:from-render
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

function runSeed(databaseUrl) {
  console.log('→ Gerando Prisma client…');
  const gen = spawnSync('pnpm', ['db:generate'], { cwd: root, stdio: 'inherit' });
  if (gen.status !== 0) process.exit(gen.status ?? 1);

  console.log('→ Rodando seed:dev no Postgres staging…');
  const seed = spawnSync('pnpm', ['seed:dev'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (seed.status !== 0) process.exit(seed.status ?? 1);
  console.log('\n✅ Seed staging OK. Valide: pnpm test:e2e:staging');
}

const fileEnv = loadRenderEnvFile();
const token = resolveRenderApiKey(fileEnv);

if (!token) {
  console.error('❌ RENDER_API_KEY ausente.');
  console.error('\n   Render dashboard → Account Settings → API Keys → Create API Key');
  console.error('   Cole em .env.render.local (só esta linha já basta para este comando):\n');
  console.error('   RENDER_API_KEY=rnd_sua_chave_aqui\n');
  process.exit(1);
}

let render;
try {
  render = createRenderApi(token);
} catch (e) {
  console.error(`❌ ${e.message}`);
  console.error('\n   Abra .env.render.local e substitua rnd_… pelo valor real (sem caractere …).\n');
  process.exit(1);
}

const serviceId = await render.resolveStagingServiceId(
  process.env.RENDER_SERVICE_ID ?? fileEnv.RENDER_SERVICE_ID,
);

console.log(`→ Buscando DATABASE_URL do serviço ${serviceId}…`);
const databaseUrl = await render.getServiceEnvVar(serviceId, 'DATABASE_URL');

try {
  assertDatabaseUrl(databaseUrl);
} catch (e) {
  console.error(`❌ ${e.message}`);
  console.error('   Configure DATABASE_URL no Render (Postgres linkado ao serviço API) e rode de novo.\n');
  process.exit(1);
}

runSeed(databaseUrl.trim());
