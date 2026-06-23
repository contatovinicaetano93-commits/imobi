#!/usr/bin/env node
/**
 * Aponta o serviço Render para a branch que compila e dispara deploy.
 *
 *   pnpm render:deploy:fix
 *   pnpm render:deploy:fix -- --service srv-d8hnpmflk1mc73fc1h3g  # prod
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_BRANCH = 'main';
const DEFAULT_SERVICE = 'srv-d8fl07h9rddc73ajs7ag';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.render.local');

function loadEnv() {
  const env = {};
  if (!existsSync(envPath)) return env;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const fileEnv = loadEnv();
const args = process.argv.slice(2);
const branchIdx = args.indexOf('--branch');
const serviceIdx = args.indexOf('--service');
const statusOnly = args.includes('--status');
const branch = branchIdx >= 0 ? args[branchIdx + 1] : DEFAULT_BRANCH;

const token = process.env.RENDER_API_KEY ?? fileEnv.RENDER_API_KEY;
let sid = process.env.RENDER_SERVICE_ID ?? fileEnv.RENDER_SERVICE_ID ?? DEFAULT_SERVICE;
if (serviceIdx >= 0) sid = args[serviceIdx + 1];
if (!token) {
  console.error('❌ RENDER_API_KEY ausente em .env.render.local');
  process.exit(1);
}
if (!sid.startsWith('srv-')) sid = `srv-${sid}`;

async function api(path, opts = {}) {
  const res = await fetch(`https://api.render.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...opts.headers,
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

console.log(`=== Render: branch → ${branch} ===\n`);

const before = await api(`/v1/services/${sid}`);
const name = before.name ?? before.service?.name ?? sid;
const oldBranch = before.branch ?? before.service?.branch ?? '?';
console.log(`Serviço: ${name} (${sid})`);
console.log(`Branch atual: ${oldBranch}`);

if (statusOnly) {
  const deploys = await api(`/v1/services/${sid}/deploys?limit=1`);
  const dep = (deploys[0] ?? {}).deploy ?? deploys[0] ?? {};
  console.log(`Último deploy: ${dep.status} (${dep.id ?? '?'})`);
  if (dep.commit) {
    console.log(`Commit: ${dep.commit.id?.slice(0, 8)} — ${dep.commit.message?.slice(0, 80)}`);
  }
  process.exit(0);
}

if (oldBranch !== branch) {
  await api(`/v1/services/${sid}`, {
    method: 'PATCH',
    body: JSON.stringify({ branch }),
  });
  console.log(`Branch atualizada: ${branch}`);
} else {
  console.log('Branch já correta.');
}

console.log('\n→ Disparando deploy...');
await api(`/v1/services/${sid}/deploys`, {
  method: 'POST',
  body: JSON.stringify({ clearCache: 'do_not_clear' }),
});

console.log('✅ Deploy iniciado.');
console.log(`→ Dashboard: https://dashboard.render.com/web/${sid}`);
console.log(`→ Health: curl https://imobi-api-staging.onrender.com/api/v1/health`);
