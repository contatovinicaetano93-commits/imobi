import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const RENDER_ENV_PATH = resolve(root, '.env.render.local');

const PLACEHOLDER_MARKERS = [
  '\u2026', // … (unicode ellipsis — quebra headers HTTP)
  '…',
  'REPLACE_ME',
  'CHANGE_ME',
  'PASSWORD_HERE',
  'YOUR_',
  'your-',
  'senha@dpg-xxxxx',
  'user:senha@',
  'rnd_…',
  'redis://…',
];

/** @returns {Record<string, string>} */
export function loadRenderEnvFile(path = RENDER_ENV_PATH) {
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

/** @param {string} value */
export function hasPlaceholder(value) {
  if (!value || !value.trim()) return true;
  const v = value.trim();
  return PLACEHOLDER_MARKERS.some((m) => v.includes(m));
}

/** @param {string} value @param {string} label */
export function assertAsciiSecret(value, label) {
  if (!value?.trim()) {
    throw new Error(`${label} ausente em .env.render.local`);
  }
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 255) {
      throw new Error(
        `${label} contém caractere inválido (posição ${i}, U+${value.charCodeAt(i).toString(16)}). ` +
          'Provável cópia do .env.render.example com "…" — substitua pelo valor real do dashboard Render.',
      );
    }
  }
}

/** @param {string} url */
export function assertDatabaseUrl(url) {
  if (!url?.trim()) {
    throw new Error('DATABASE_URL ausente em .env.render.local');
  }
  if (hasPlaceholder(url)) {
    throw new Error(
      'DATABASE_URL ainda é placeholder. Render dashboard → Postgres → Connect → External Database URL.',
    );
  }
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    throw new Error('DATABASE_URL deve começar com postgresql://');
  }
}

/** @param {Record<string, string>} fileEnv */
export function validateRenderCredentials(fileEnv) {
  assertAsciiSecret(fileEnv.RENDER_API_KEY, 'RENDER_API_KEY');
  if (!fileEnv.RENDER_API_KEY.startsWith('rnd_')) {
    throw new Error('RENDER_API_KEY deve começar com rnd_ (API key do Render)');
  }
}

/** @param {string} token */
export function createRenderApi(token) {
  assertAsciiSecret(token, 'RENDER_API_KEY');

  async function api(path) {
    const res = await fetch(`https://api.render.com${path}`, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/json',
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
      throw new Error(`${res.status} ${path}`);
    }
    return body;
  }

  async function resolveStagingServiceId(preferredId) {
    let serviceId = (preferredId ?? '').trim();
    if (serviceId && !serviceId.startsWith('srv-')) {
      serviceId = `srv-${serviceId}`;
    }
    if (serviceId) {
      try {
        await api(`/v1/services/${serviceId}`);
        return serviceId;
      } catch {
        /* list fallback */
      }
    }
    const list = await api('/v1/services?limit=50');
    const services = (list ?? []).map((r) => r.service ?? r).filter(Boolean);
    const match =
      services.find((s) => s.name === 'imobi-api-staging') ??
      services.find((s) => s.name === 'imobi-api');
    if (!match) throw new Error('Serviço imobi-api-staging não encontrado no Render');
    return match.id;
  }

  async function getServiceEnvVar(serviceId, key) {
    const rows = await api(`/v1/services/${serviceId}/env-vars`);
    for (const row of rows ?? []) {
      const item = row.envVar ?? row;
      if (item?.key === key) return item.value ?? '';
    }
    return '';
  }

  return { api, resolveStagingServiceId, getServiceEnvVar };
}

/** RENDER_API_KEY: process.env tem prioridade sobre arquivo */
export function resolveRenderApiKey(fileEnv = loadRenderEnvFile()) {
  return (process.env.RENDER_API_KEY ?? fileEnv.RENDER_API_KEY ?? '').trim();
}
