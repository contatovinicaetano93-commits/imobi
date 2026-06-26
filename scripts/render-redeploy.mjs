#!/usr/bin/env node
/** Trigger Render redeploy only. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const { RENDER_API_KEY, RENDER_SERVICE_ID } = loadEnv();
const args = process.argv.slice(2);
const serviceIdx = args.indexOf('--service');
const token = process.env.RENDER_API_KEY ?? RENDER_API_KEY;
let sid =
  (serviceIdx >= 0 ? args[serviceIdx + 1] : null) ??
  process.env.RENDER_SERVICE_ID ??
  RENDER_SERVICE_ID;
if (!token || !sid) {
  console.error('❌ RENDER_API_KEY e RENDER_SERVICE_ID em .env.render.local');
  process.exit(1);
}
if (!sid.startsWith('srv-')) sid = `srv-${sid}`;

const res = await fetch(`https://api.render.com/v1/services/${sid}/deploys`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ clearCache: 'do_not_clear' }),
});

if (!res.ok) {
  console.error(`❌ Deploy failed (${res.status}):`, await res.text());
  process.exit(1);
}

console.log('✅ Redeploy iniciado.');
console.log(`https://dashboard.render.com/web/${sid}`);
