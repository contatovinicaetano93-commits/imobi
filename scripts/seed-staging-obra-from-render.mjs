#!/usr/bin/env node
/**
 * Seed 1ª obra + crédito no Postgres staging (via DATABASE_URL do Render).
 *
 *   pnpm seed:staging:obra
 *
 * Requer RENDER_API_KEY em .env.render.local (mesmo fluxo que seed:staging:from-render).
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

function runObraSeed(databaseUrl) {
  console.log('→ Gerando Prisma client…');
  const gen = spawnSync('pnpm', ['db:generate'], { cwd: root, stdio: 'inherit' });
  if (gen.status !== 0) process.exit(gen.status ?? 1);

  console.log('→ Garantindo usuários (seed:dev)…');
  const users = spawnSync('pnpm', ['seed:dev'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (users.status !== 0) process.exit(users.status ?? 1);

  console.log('→ Criando 1ª obra + crédito ativo…');
  const obra = spawnSync('pnpm', ['--filter', '@imbobi/api', 'seed:dev:obra'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (obra.status !== 0) process.exit(obra.status ?? 1);

  console.log('\n✅ Obra staging OK.');
  console.log('   Login: tomador@imobi.com.br / Tomador@123');
  console.log('   E2E:   pnpm test:e2e:staging -- tests/obras/vistoria-submission.spec.ts\n');
}

const fileEnv = loadRenderEnvFile();
const token = resolveRenderApiKey(fileEnv);

if (!token) {
  console.error('❌ RENDER_API_KEY ausente. Rode: pnpm render:init');
  process.exit(1);
}

let render;
try {
  render = createRenderApi(token);
} catch (e) {
  console.error(`❌ ${e.message}`);
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
  process.exit(1);
}

runObraSeed(databaseUrl.trim());
