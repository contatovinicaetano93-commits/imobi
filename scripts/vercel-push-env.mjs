#!/usr/bin/env node
/**
 * Push Imobi WEB env vars to Vercel (API token in .env.vercel.local — gitignored).
 *
 *   pnpm vercel:env:push
 *   pnpm vercel:env:push -- --project imobi-web
 *
 * Secrets stay on Render (API). Vercel web only needs JWT + API URL.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.vercel.local');

function loadEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const args = process.argv.slice(2);
const projectIdx = args.indexOf('--project');
const projectName = projectIdx >= 0 ? args[projectIdx + 1] : 'imobi';

const fileEnv = loadEnvFile(envPath);
const token = process.env.VERCEL_TOKEN ?? fileEnv.VERCEL_TOKEN;
if (!token) {
  console.error('❌ VERCEL_TOKEN ausente em .env.vercel.local');
  process.exit(1);
}

const JWT_SECRET =
  process.env.JWT_SECRET ??
  fileEnv.JWT_SECRET ??
  'aNsc0mF85zpxIe4x4RSS+fBlozx1wDrFb+B+U29QWwQy/ea8rguXy9sQNFgkbtgbNuoZ56VL0PEW1XZhhTmsLQ==';

const NEXT_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  fileEnv.NEXT_PUBLIC_API_URL ??
  'https://imobi-api-staging.onrender.com';

const VARS = [
  { key: 'JWT_SECRET', value: JWT_SECRET, type: 'encrypted' },
  { key: 'NEXT_PUBLIC_API_URL', value: NEXT_PUBLIC_API_URL, type: 'plain' },
  { key: 'NEXT_PUBLIC_APP_NAME', value: 'IMOBI', type: 'plain' },
];

const targets = ['production', 'preview', 'development'];

async function api(path, opts = {}) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
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

async function listExisting(projectId) {
  const data = await api(`/v9/projects/${projectId}/env`);
  return Array.isArray(data?.envs) ? data.envs : [];
}

async function upsertEnv(projectId, { key, value, type }) {
  const existing = await listExisting(projectId);
  const found = existing.filter((e) => e.key === key);

  for (const env of found) {
    await api(`/v9/projects/${projectId}/env/${env.id}`, { method: 'DELETE' });
  }

  await api(`/v10/projects/${projectId}/env`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      value,
      type,
      target: targets,
    }),
  });
}

console.log(`=== Vercel env push → project: ${projectName} ===\n`);

let project;
try {
  project = await api(`/v9/projects/${encodeURIComponent(projectName)}`);
} catch {
  const list = await api('/v9/projects?limit=50');
  const projects = list?.projects ?? [];
  project = projects.find(
    (p) => p.name === projectName || p.name?.includes('imobi'),
  );
  if (!project) {
    console.error('❌ Projeto não encontrado. Tente: pnpm vercel:env:push -- --project SEU_PROJETO');
    console.error('   Projetos:', projects.map((p) => p.name).join(', ') || '(nenhum)');
    process.exit(1);
  }
}

const projectId = project.id;
console.log(`Projeto: ${project.name} (${projectId})\n`);

for (const v of VARS) {
  process.stdout.write(`  ${v.key} ... `);
  await upsertEnv(projectId, v);
  console.log('ok');
}

console.log('\n✅ Variáveis aplicadas (production + preview + development).');
console.log('→ Redeploy: Vercel Dashboard → Deployments → Redeploy');
console.log(`→ Preview: https://${project.name}.vercel.app`);
