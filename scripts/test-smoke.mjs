#!/usr/bin/env node
/**
 * Smoke tests — roda automaticamente antes de considerar staging OK.
 *
 *   pnpm test:smoke              # API staging + web reachability
 *   pnpm test:smoke -- --local   # + type-check + build web
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STAGING_API_URL, STAGING_WEB_URL } from './lib/staging-urls.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const local = args.includes('--local');
const apiOnly = args.includes('--api-only');

const API_BASE = process.env.SMOKE_API_URL ?? STAGING_API_URL;
const WEB_BASE = process.env.SMOKE_WEB_URL ?? STAGING_WEB_URL;

function run(cmd, cmdArgs, opts = {}) {
  console.log(`\n▶ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, { cwd: root, stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

async function checkWeb() {
  const url = `${WEB_BASE}/login`;
  let res;
  let body = '';
  try {
    res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    body = await res.text();
  } catch (err) {
    console.error(`\n❌ Web indisponível: ${url}`);
    console.error(`   Rede: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
  if (res.ok && !body.includes('DEPLOYMENT_NOT_FOUND')) {
    console.log(`✓ Web ${url} → HTTP ${res.status}`);
    return;
  }
  console.error(`\n❌ Web indisponível: ${url} → HTTP ${res.status}`);
  if (body.includes('DEPLOYMENT_NOT_FOUND')) {
    console.error('   Vercel: Production Branch = main + Redeploy no dashboard');
    console.error('   Ou: pnpm vercel:env:push e redeploy manual\n');
  }
  process.exit(1);
}

async function checkApiHealth() {
  const url = `${API_BASE.replace(/\/$/, '')}/api/v1/health`;
  let res;
  let data;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) {
      console.error(`❌ API health falhou: ${url} → HTTP ${res.status}`);
      process.exit(1);
    }
    data = await res.json();
  } catch (err) {
    console.error(`❌ API health inacessível: ${url}`);
    console.error(`   Rede: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  if (data.status !== 'ok') {
    console.error(`❌ API health status != ok:`, data);
    process.exit(1);
  }
  console.log(`✓ API health OK (${url})`);
}

console.log('Smoke tests — Imobi');
console.log(`API: ${API_BASE}`);
console.log(`Web: ${WEB_BASE}`);

if (local) {
  run('pnpm', ['type-check']);
  run('pnpm', ['--filter', '@imbobi/web', 'build']);
}

await checkApiHealth();
run('bash', ['scripts/post-deploy-verification.sh', API_BASE]);
if (!apiOnly) {
  await checkWeb();
} else {
  console.log('(--api-only) pulando verificação web');
}

console.log('\n✅ Smoke tests passed\n');
