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
import { STAGING_API_URL, STAGING_WEB_URL } from './lib/staging-urls.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const e2eDir = resolve(root, 'apps/e2e');
const extra = process.argv.slice(2).filter((a) => a !== '--');

const env = {
  ...process.env,
  BASE_URL: process.env.E2E_BASE_URL ?? STAGING_WEB_URL,
  API_URL: `${(process.env.STAGING_API_URL ?? STAGING_API_URL).replace(/\/$/, '')}/api/v1`,
  E2E_SKIP_SERVERS: '1',
  E2E_TOMADOR_EMAIL: 'tomador@imobi.com.br',
  E2E_TOMADOR_PASSWORD: 'Tomador@123',
  E2E_GESTOR_EMAIL: 'gestor@imobi.com.br',
  E2E_GESTOR_PASSWORD: 'Gestor@123',
  E2E_ENGENHEIRO_EMAIL: 'eng@imobi.com.br',
  E2E_ENGENHEIRO_PASSWORD: 'Eng@123',
};

console.log('E2E staging:', env.BASE_URL, '→', env.API_URL);

const healthUrl = `${env.API_URL.replace(/\/api\/v1\/?$/, '')}/api/v1/health`;
let health = null;
for (let attempt = 1; attempt <= 5; attempt++) {
  health = await fetch(healthUrl, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (health?.ok) break;
  await new Promise((r) => setTimeout(r, 3000 * attempt));
}

if (!health?.ok) {
  console.error(`\n❌ Staging API indisponível: ${healthUrl} → HTTP ${health?.status ?? 'n/a'}`);
  console.error('   Render pode estar acordando — aguarde 1–2 min e tente de novo.');
  console.error('   Smoke: pnpm test:smoke -- --api-only\n');
  process.exit(1);
}

const webProbe = await fetch(`${env.BASE_URL}/login`, {
  signal: AbortSignal.timeout(20_000),
}).catch(() => null);
const webBody = webProbe ? await webProbe.text().catch(() => '') : '';
if (!webProbe?.ok || webBody.includes('DEPLOYMENT_NOT_FOUND')) {
  console.error(`\n❌ Staging web indisponível: ${env.BASE_URL}/login → HTTP ${webProbe?.status ?? 'n/a'}`);
  console.error('   Vercel: Production Branch = main + Redeploy');
  console.error('   Smoke só API: pnpm test:smoke -- --api-only');
  console.error('   E2E UI exige web no ar.\n');
  process.exit(1);
}

console.log('✓ API health OK');
console.log(`✓ Web ${env.BASE_URL}/login → HTTP ${webProbe.status}`);

const child = spawn(
  'pnpm',
  ['exec', 'playwright', 'test', '--project=chromium', ...extra],
  { cwd: e2eDir, env, stdio: 'inherit', shell: true },
);

child.on('exit', (code) => process.exit(code ?? 1));
