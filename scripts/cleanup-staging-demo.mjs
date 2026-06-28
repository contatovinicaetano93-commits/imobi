#!/usr/bin/env node
/** Remove obras demo no Postgres staging (via DATABASE_URL do Render). */
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

async function resolveDatabaseUrl() {
  const fromEnv = process.env.DATABASE_URL?.trim();
  if (fromEnv) {
    assertDatabaseUrl(fromEnv);
    return fromEnv;
  }

  const fileEnv = loadRenderEnvFile();
  if (fileEnv.DATABASE_URL?.trim()) {
    assertDatabaseUrl(fileEnv.DATABASE_URL);
    return fileEnv.DATABASE_URL.trim();
  }

  const token = resolveRenderApiKey(fileEnv);
  if (!token) {
    throw new Error('RENDER_API_KEY ou DATABASE_URL ausente em .env.render.local');
  }

  const render = createRenderApi(token);
  const serviceId = await render.resolveStagingServiceId(
    process.env.RENDER_SERVICE_ID ?? fileEnv.RENDER_SERVICE_ID,
  );
  const databaseUrl = await render.getServiceEnvVar(serviceId, 'DATABASE_URL');
  assertDatabaseUrl(databaseUrl);
  return databaseUrl.trim();
}

const databaseUrl = await resolveDatabaseUrl();

console.log('→ Limpando obras fictícias no staging…');
const result = spawnSync(
  'pnpm',
  ['--filter', '@imbobi/api', 'exec', 'tsx', 'src/seeds/cleanup-staging-demo.ts'],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  },
);

process.exit(result.status ?? 1);
