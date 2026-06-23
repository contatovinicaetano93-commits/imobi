#!/usr/bin/env node
/**
 * Popula usuários de teste no Postgres staging (Render).
 *
 * Caminhos (do mais fácil ao mais completo):
 *   pnpm seed:staging:from-render     # só RENDER_API_KEY (busca DATABASE_URL no Render)
 *   DATABASE_URL=postgresql://… pnpm seed:staging
 *   pnpm seed:staging                 # DATABASE_URL em .env.render.local
 *   pnpm seed:staging -- --setup      # SETUP_SECRET no Render
 */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  RENDER_ENV_PATH,
  loadRenderEnvFile,
  assertDatabaseUrl,
  hasPlaceholder,
} from './render-env-utils.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STAGING_API = 'https://imobi-api-staging.onrender.com/api/v1';
const useSetup = process.argv.includes('--setup');

async function seedViaSetup(secret) {
  const url = `${STAGING_API}/setup?secret=${encodeURIComponent(secret)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const body = await res.text();
  if (!res.ok) {
    console.error(`❌ Setup HTTP ${res.status}: ${body}`);
    if (res.status === 403) {
      console.error('\n   SETUP_SECRET inválido ou não deployado no Render.');
      console.error('   Alternativa mais simples: pnpm seed:staging:from-render\n');
    }
    process.exit(1);
  }
  console.log('✅ Setup concluído:', body);
}

function seedViaDatabase(databaseUrl) {
  console.log('→ Gerando Prisma client…');
  const gen = spawnSync('pnpm', ['db:generate'], { cwd: root, stdio: 'inherit', env: process.env });
  if (gen.status !== 0) process.exit(gen.status ?? 1);

  console.log('→ Rodando seed:dev no banco staging…');
  const seed = spawnSync('pnpm', ['seed:dev'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (seed.status !== 0) process.exit(seed.status ?? 1);
  console.log('\n✅ Seed staging OK. Valide: pnpm test:e2e:staging');
}

const fileEnv = existsSync(RENDER_ENV_PATH) ? loadRenderEnvFile() : {};

if (useSetup) {
  const secret = (process.env.SETUP_SECRET ?? fileEnv.SETUP_SECRET ?? '').trim();
  if (!secret || hasPlaceholder(secret)) {
    console.error('❌ SETUP_SECRET ausente ou placeholder.');
    console.error('   Mais fácil: pnpm seed:staging:from-render (só RENDER_API_KEY)\n');
    process.exit(1);
  }
  await seedViaSetup(secret);
} else {
  const databaseUrl = (process.env.DATABASE_URL ?? fileEnv.DATABASE_URL ?? '').trim();
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não informado.');
    console.error('\n   Opção A (recomendada): pnpm seed:staging:from-render');
    console.error('   Opção B: DATABASE_URL=postgresql://… pnpm seed:staging');
    console.error('   Opção C: cole DATABASE_URL em .env.render.local\n');
    process.exit(1);
  }
  try {
    assertDatabaseUrl(databaseUrl);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    console.error('   Opção mais fácil: pnpm seed:staging:from-render\n');
    process.exit(1);
  }
  seedViaDatabase(databaseUrl);
}
