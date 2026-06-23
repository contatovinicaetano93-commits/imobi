#!/usr/bin/env node
/**
 * Valida env vars críticas no Render (sem imprimir secrets).
 *
 *   pnpm render:env:verify
 *   pnpm render:env:verify -- --service srv-d8fl07h9rddc73ajs7ag
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const renderEnvPath = resolve(root, '.env.render.local');
const vercelEnvPath = resolve(root, '.env.vercel.local');

const CRITICAL = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
];

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

function mask(key, value) {
  if (!value) return '(vazio)';
  if (key.includes('SECRET') || key.includes('PASSWORD') || key === 'DATABASE_URL') {
    return `*** (${value.length} chars)`;
  }
  const trimmed = value.trim();
  const hasNewline = value !== trimmed || /[\r\n]/.test(value);
  const preview = trimmed.slice(0, 80);
  return `${preview}${trimmed.length > 80 ? '…' : ''}${hasNewline ? ' ⚠️ contém newline' : ''}`;
}

function checkRedis(vars) {
  const issues = [];
  const host = vars.REDIS_HOST?.value ?? '';
  const url = vars.REDIS_URL?.value ?? '';
  const port = vars.REDIS_PORT?.value ?? '';

  if (host && (host !== host.trim() || host.includes('\n'))) {
    issues.push('REDIS_HOST tem espaço/newline — use trim no dashboard ou pnpm render:env:push');
  }
  if (url) {
    try {
      const h = new URL(url).hostname;
      if (h !== h.trim() || h.includes('\n')) {
        issues.push('REDIS_URL hostname inválido (newline?)');
      }
    } catch {
      issues.push('REDIS_URL malformada');
    }
  }
  if (!url && !(host.trim() && port.trim())) {
    issues.push('Falta REDIS_URL ou par REDIS_HOST + REDIS_PORT');
  }
  if (url && host.trim()) {
    issues.push('REDIS_HOST ainda definido — remova no Render (API usa REDIS_URL). Rode: pnpm render:env:push');
  }
  return issues;
}

function checkCors(value) {
  const issues = [];
  if (!value?.trim()) {
    issues.push('CORS_ORIGIN vazio');
    return issues;
  }
  const origins = value.split(',').map((o) => o.trim()).filter(Boolean);
  if (!origins.includes('https://imobi-web-ten.vercel.app')) {
    issues.push('CORS_ORIGIN deve incluir https://imobi-web-ten.vercel.app');
  }
  if (!origins.includes('http://localhost:3000')) {
    issues.push('CORS_ORIGIN deve incluir http://localhost:3000 (dev local)');
  }
  return issues;
}

const fileEnv = loadEnvFile(renderEnvPath);
const vercelEnv = loadEnvFile(vercelEnvPath);
const args = process.argv.slice(2);
const serviceIdx = args.indexOf('--service');
const token = process.env.RENDER_API_KEY ?? fileEnv.RENDER_API_KEY;

if (!token) {
  console.error('❌ RENDER_API_KEY ausente em .env.render.local');
  process.exit(1);
}

let serviceId =
  (serviceIdx >= 0 ? args[serviceIdx + 1] : null) ??
  process.env.RENDER_SERVICE_ID ??
  fileEnv.RENDER_SERVICE_ID ??
  '';

if (serviceId && !serviceId.startsWith('srv-')) {
  serviceId = `srv-${serviceId}`;
}

async function api(path) {
  const res = await fetch(`https://api.render.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return body;
}

async function resolveServiceId() {
  if (serviceId) {
    try {
      await api(`/v1/services/${serviceId}`);
      return serviceId;
    } catch {
      /* fall through */
    }
  }
  const list = await api('/v1/services?limit=50');
  const services = (list ?? []).map((r) => r.service ?? r).filter(Boolean);
  const match =
    services.find((s) => s.name === 'imobi-api-staging') ??
    services.find((s) => s.name === 'imobi-api');
  if (!match) throw new Error('Serviço imobi não encontrado no Render');
  return match.id;
}

const sid = await resolveServiceId();
const service = await api(`/v1/services/${sid}`);
const name = service.name ?? service.service?.name ?? sid;

const rows = await api(`/v1/services/${sid}/env-vars`);
const vars = {};
for (const row of rows ?? []) {
  const item = row.envVar ?? row;
  if (item?.key) vars[item.key] = item;
}

console.log(`=== Render env verify: ${name} (${sid}) ===\n`);

const allIssues = [];

for (const key of CRITICAL) {
  const v = vars[key];
  console.log(`  ${key}: ${mask(key, v?.value ?? '')}`);
}

console.log('');

allIssues.push(...checkRedis(vars));
allIssues.push(...checkCors(vars.CORS_ORIGIN?.value));

if (!vars.DATABASE_URL?.value?.trim()) {
  allIssues.push('DATABASE_URL ausente');
}
if (!vars.JWT_SECRET?.value?.trim()) {
  allIssues.push('JWT_SECRET ausente');
}

const localJwt = vercelEnv.JWT_SECRET?.trim();
const renderJwt = vars.JWT_SECRET?.value?.trim();
if (localJwt && renderJwt && localJwt !== renderJwt) {
  allIssues.push('JWT_SECRET no Render ≠ JWT_SECRET em .env.vercel.local (login web falha)');
} else if (localJwt && renderJwt) {
  console.log('  JWT alinhado com .env.vercel.local ✓');
}

if (allIssues.length) {
  console.log('Problemas:\n');
  for (const i of allIssues) console.log(`  ❌ ${i}`);
  console.log('\nCorrigir: pnpm render:env:push && pnpm vercel:env:push');
  process.exit(1);
}

console.log('✅ Env vars críticas OK no Render.');
const appUrl =
  vars.APP_URL?.value?.trim() || 'https://imobi-api-staging.onrender.com';
console.log(`→ curl ${appUrl}/api/v1/health`);
