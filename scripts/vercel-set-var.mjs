#!/usr/bin/env node
/**
 * Set/update a SINGLE env var on a Vercel project for chosen targets.
 * Complementa vercel-push-env.mjs (que cuida só das vars core).
 *
 *   node scripts/vercel-set-var.mjs KEY VALUE [--targets preview,production] [--type plain|encrypted] [--project imobi-web]
 *
 * Token em .env.vercel.local (VERCEL_TOKEN) — gitignored.
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
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

const key = args[0];
const value = args[1];
if (!key || value === undefined || key.startsWith('--')) {
  console.error('Uso: node scripts/vercel-set-var.mjs KEY VALUE [--targets preview,production] [--type plain] [--project imobi-web]');
  process.exit(1);
}

const targets = flag('--targets', 'preview').split(',').map((s) => s.trim()).filter(Boolean);
const type = flag('--type', 'plain');
const projectName = flag('--project', 'imobi-web');

const fileEnv = loadEnvFile(envPath);
const token = process.env.VERCEL_TOKEN ?? fileEnv.VERCEL_TOKEN;
if (!token) {
  console.error('❌ VERCEL_TOKEN ausente em .env.vercel.local');
  process.exit(1);
}

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
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

let project;
try {
  project = await api(`/v9/projects/${encodeURIComponent(projectName)}`);
} catch {
  const list = await api('/v9/projects?limit=50');
  const projects = list?.projects ?? [];
  project = projects.find((p) => p.name === projectName || p.name?.includes('imobi'));
  if (!project) {
    console.error('❌ Projeto não encontrado. Projetos:', projects.map((p) => p.name).join(', '));
    process.exit(1);
  }
}

const projectId = project.id;
console.log(`Projeto: ${project.name} (${projectId})`);
console.log(`Set ${key}=${value} → targets: ${targets.join(', ')} (type: ${type})`);

const existing = await api(`/v9/projects/${projectId}/env`);
const envs = Array.isArray(existing?.envs) ? existing.envs : [];
// Remove entradas que colidem nos targets escolhidos.
for (const e of envs) {
  if (e.key !== key) continue;
  const overlap = (e.target ?? []).some((t) => targets.includes(t));
  if (overlap) {
    await api(`/v9/projects/${projectId}/env/${e.id}`, { method: 'DELETE' });
    console.log(`  removida entrada antiga (${(e.target ?? []).join(',')})`);
  }
}

await api(`/v10/projects/${projectId}/env`, {
  method: 'POST',
  body: JSON.stringify({ key, value, type, target: targets }),
});

console.log('✅ ok. NEXT_PUBLIC_* é inlined no build → gere um novo deploy nos targets afetados.');
