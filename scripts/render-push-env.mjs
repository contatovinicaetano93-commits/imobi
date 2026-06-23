#!/usr/bin/env node
/**
 * Push Imobi API env vars to Render + optional redeploy.
 *
 *   pnpm render:env:push                    # staging (default — Vercel)
 *   pnpm render:env:push -- --service srv-d8hnpmflk1mc73fc1h3g  # imobi-api prod URL
 *   pnpm render:env:push -- --no-deploy
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.render.local');

/** @returns {Record<string, string>} */
function loadEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  const raw = readFileSync(path, 'utf8');
  let key = '';
  let value = '';
  let inQuotes = false;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (!key) {
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      key = trimmed.slice(0, eq).trim();
      const rest = trimmed.slice(eq + 1);
      if (rest.startsWith('"') && !rest.endsWith('"')) {
        inQuotes = true;
        value = rest.slice(1);
      } else if (rest.startsWith('"') && rest.endsWith('"')) {
        env[key] = rest.slice(1, -1).replace(/\\n/g, '\n');
        key = '';
        value = '';
      } else {
        env[key] = rest.trim();
        key = '';
      }
      continue;
    }

    if (inQuotes) {
      if (trimmed.endsWith('"')) {
        value += (value ? '\n' : '') + trimmed.slice(0, -1);
        env[key] = value.replace(/\\n/g, '\n');
        key = '';
        value = '';
        inQuotes = false;
      } else {
        value += (value ? '\n' : '') + trimmed;
      }
    }
  }
  return env;
}

const fileEnv = loadEnvFile(envPath);
const args = process.argv.slice(2);
const serviceIdx = args.indexOf('--service');
const noDeploy = args.includes('--no-deploy');

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

const PROD_SERVICE_ID = 'srv-d8hnpmflk1mc73fc1h3g';
const PROD_APP_URL = 'https://imobi-api-efgg.onrender.com';
const trim = (v) => (v ?? '').trim();

/** @param {Record<string, string>} fileEnv */
function resolveRedisUrl(fileEnv) {
  const url = trim(fileEnv.REDIS_URL);
  if (url) return url;

  const host = trim(fileEnv.REDIS_HOST);
  const port = trim(fileEnv.REDIS_PORT);
  if (!host || !port) return '';

  const password = trim(fileEnv.REDIS_PASSWORD ?? '');
  return password
    ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
    : `redis://${host}:${port}`;
}

const redisUrl = resolveRedisUrl(fileEnv);
if (!redisUrl) {
  console.error(
    '❌ Redis ausente em .env.render.local — defina REDIS_URL ou REDIS_HOST + REDIS_PORT (sem ID hardcoded)',
  );
  process.exit(1);
}

const env = {
  NODE_ENV: 'production',
  PORT: '4000',
  DATABASE_URL: trim(fileEnv.DATABASE_URL),
  JWT_SECRET: trim(fileEnv.JWT_SECRET),
  REDIS_URL: redisUrl,
  APP_URL: trim(fileEnv.APP_URL ?? 'https://imobi-api-staging.onrender.com'),
  CORS_ORIGIN: trim(
    fileEnv.CORS_ORIGIN ??
      'https://imobi-web.vercel.app,http://localhost:3000,https://imobi-api-staging.onrender.com',
  ),
  EMAIL_PROVIDER: trim(fileEnv.EMAIL_PROVIDER ?? 'ses'),
  AWS_REGION: trim(fileEnv.AWS_REGION ?? fileEnv.AWS_S3_REGION ?? 'sa-east-1'),
  AWS_ACCESS_KEY_ID: trim(fileEnv.AWS_ACCESS_KEY_ID),
  AWS_SECRET_ACCESS_KEY: trim(fileEnv.AWS_SECRET_ACCESS_KEY),
  AWS_S3_BUCKET: trim(fileEnv.AWS_S3_BUCKET ?? 'imobi-evidencias-prod'),
  AWS_S3_REGION: trim(fileEnv.AWS_S3_REGION ?? 'sa-east-1'),
  ENABLE_S3_STORAGE: trim(fileEnv.ENABLE_S3_STORAGE ?? 'true'),
  FIREBASE_PROJECT_ID: trim(fileEnv.FIREBASE_PROJECT_ID ?? 'imobi-staging'),
  FIREBASE_CLIENT_EMAIL: trim(
    fileEnv.FIREBASE_CLIENT_EMAIL ??
      'firebase-adminsdk-fbsvc@imobi-staging.iam.gserviceaccount.com',
  ),
  FIREBASE_PRIVATE_KEY: trim(fileEnv.FIREBASE_PRIVATE_KEY ?? ''),
  ENABLE_PUSH_NOTIFICATIONS: trim(fileEnv.ENABLE_PUSH_NOTIFICATIONS ?? 'false'),
  DISABLE_IN_PROCESS_WORKERS: trim(fileEnv.DISABLE_IN_PROCESS_WORKERS ?? 'true'),
  PAYMENT_PROVIDER: trim(fileEnv.PAYMENT_PROVIDER ?? 'console'),
};

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

async function resolveServiceId() {
  if (serviceId) {
    try {
      await api(`/v1/services/${serviceId}`);
      return serviceId;
    } catch {
      console.warn(`⚠️  Service ${serviceId} não encontrado — listando...`);
    }
  }

  const list = await api('/v1/services?limit=50');
  const services = (list ?? [])
    .map((row) => row.service ?? row)
    .filter(Boolean);

  const match =
    services.find((s) => s.name === 'imobi-api-staging') ??
    services.find((s) => s.name === 'imobi-api') ??
    services.find((s) => s.name?.includes('imobi'));
  if (!match) {
    console.error('❌ Serviço imobi não encontrado. Serviços:', services.map((s) => s.name).join(', '));
    process.exit(1);
  }
  return match.id;
}

async function deleteEnvVar(sid, key) {
  await api(`/v1/services/${sid}/env-vars/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
}

async function upsertEnvVar(sid, key, value) {
  await api(`/v1/services/${sid}/env-vars/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

async function deploy(sid) {
  await api(`/v1/services/${sid}/deploys`, {
    method: 'POST',
    body: JSON.stringify({ clearCache: 'do_not_clear' }),
  });
}

const required = ['DATABASE_URL', 'JWT_SECRET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'FIREBASE_PRIVATE_KEY'];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error('❌ Faltam em .env.render.local:', missing.join(', '));
  process.exit(1);
}

console.log('=== Render env push (API) ===\n');

const sid = await resolveServiceId();
const service = await api(`/v1/services/${sid}`);
console.log(`Serviço: ${service.name ?? service.service?.name} (${sid})\n`);

if (sid === PROD_SERVICE_ID) {
  env.APP_URL = PROD_APP_URL;
}

const keys = Object.keys(env).filter((k) => env[k] !== undefined && env[k] !== '');
for (const key of keys) {
  const display = key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY') || key === 'DATABASE_URL'
    ? '***'
    : env[key].slice(0, 60);
  process.stdout.write(`  ${key} = ${display}${env[key].length > 60 ? '…' : ''} ... `);
  await upsertEnvVar(sid, key, env[key]);
  console.log('ok');
}

// REDIS_URL tem prioridade na API — remover HOST/PORT legados que causam health com newline
for (const legacy of ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD']) {
  try {
    await deleteEnvVar(sid, legacy);
    console.log(`  ${legacy} removido (usa REDIS_URL)`);
  } catch {
    /* já ausente */
  }
}

if (!noDeploy) {
  console.log('\n→ Disparando redeploy...');
  await deploy(sid);
  console.log('✅ Redeploy iniciado.');
}

console.log(`\n→ Health: curl ${env.APP_URL}/api/v1/health`);
console.log(`→ Dashboard: https://dashboard.render.com/web/${sid}`);
