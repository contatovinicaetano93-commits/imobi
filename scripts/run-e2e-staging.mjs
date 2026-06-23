#!/usr/bin/env node
/**
 * E2E contra staging (Vercel + Render). Não sobe servidores locais.
 *
 *   pnpm test:e2e:staging
 *   pnpm test:e2e:staging -- tests/auth/login.spec.ts
 */
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const e2eDir = resolve(root, 'apps/e2e');
const extra = process.argv.slice(2);

const env = {
  ...process.env,
  BASE_URL: 'https://imobi-web.vercel.app',
  API_URL: 'https://imobi-api-staging.onrender.com/api/v1',
  E2E_SKIP_SERVERS: '1',
  E2E_TOMADOR_EMAIL: 'tomador@imobi.com.br',
  E2E_TOMADOR_PASSWORD: 'Tomador@123',
  E2E_GESTOR_EMAIL: 'gestor@imobi.com.br',
  E2E_GESTOR_PASSWORD: 'Gestor@123',
  E2E_ENGENHEIRO_EMAIL: 'eng@imobi.com.br',
  E2E_ENGENHEIRO_PASSWORD: 'Eng@123',
};

console.log('E2E staging:', env.BASE_URL, '→', env.API_URL);

const preflight = await fetch(`${env.API_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.E2E_TOMADOR_EMAIL, senha: env.E2E_TOMADOR_PASSWORD }),
  signal: AbortSignal.timeout(30_000),
});

if (!preflight.ok) {
  console.error('\n❌ Staging: login tomador falhou — usuários de teste ausentes no banco Render.');
  console.error('   Claude/backend: rodar seed ou GET /api/v1/setup?secret=SETUP_SECRET no staging.');
  console.error('   Local: pnpm seed:dev (com DATABASE_URL do Render)\n');
  process.exit(1);
}

const child = spawn(
  'pnpm',
  ['exec', 'playwright', 'test', '--project=chromium', ...extra],
  { cwd: e2eDir, env, stdio: 'inherit', shell: true },
);

child.on('exit', (code) => process.exit(code ?? 1));
