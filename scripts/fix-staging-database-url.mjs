#!/usr/bin/env node
/**
 * Aponta imobi-api-staging para o Postgres ativo (imobi-staging-db).
 * O banco imobi-postgres (imobi_prod) pode estar suspended no Render free tier.
 *
 *   pnpm render:fix:staging-db
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RENDER_ENV_PATH,
  loadRenderEnvFile,
  validateRenderCredentials,
  createRenderApi,
} from './render-env-utils.mjs';

const STAGING_SERVICE_ID = 'srv-d8fl07h9rddc73ajs7ag';
const STAGING_DB_ID = 'dpg-d8fkjt99rddc73ajgbqg-a';
const SUSPENDED_DB_ID = 'dpg-d8hno5rtqb8s73aaauj0-a';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fileEnv = loadRenderEnvFile(RENDER_ENV_PATH);

try {
  validateRenderCredentials(fileEnv);
} catch (e) {
  console.error(`❌ ${e.message}`);
  process.exit(1);
}

const token = (process.env.RENDER_API_KEY ?? fileEnv.RENDER_API_KEY ?? '').trim();
const noDeploy = process.argv.includes('--no-deploy');
const { api } = createRenderApi(token);

async function main() {
  const [stagingDb, prodDb] = await Promise.all([
    api(`/v1/postgres/${STAGING_DB_ID}`),
    api(`/v1/postgres/${SUSPENDED_DB_ID}`).catch(() => null),
  ]);

  console.log(`Postgres ativo: ${stagingDb.name} (${stagingDb.status})`);
  if (prodDb) {
    console.log(`Postgres legado: ${prodDb.name} (${prodDb.status})`);
    if (prodDb.status === 'suspended') {
      console.log('⚠️  imobi-postgres está suspended — não use como DATABASE_URL do staging.');
    }
  }

  const conn = await api(`/v1/postgres/${STAGING_DB_ID}/connection-info`);
  const dbUrl = (conn.externalConnectionString ?? conn.internalConnectionString ?? '').trim();
  if (!dbUrl) {
    console.error('❌ Não foi possível obter connection string do imobi-staging-db');
    process.exit(1);
  }

  await api(`/v1/services/${STAGING_SERVICE_ID}/env-vars/DATABASE_URL`, {
    method: 'PUT',
    body: JSON.stringify({ value: dbUrl }),
  });
  console.log('✅ DATABASE_URL atualizado no imobi-api-staging');

  // migrate no boot falha no imobi_staging — subir API direto até migrations saneadas
  await api(`/v1/services/${STAGING_SERVICE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({
      serviceDetails: {
        envSpecificDetails: {
          startCommand: 'cd services/api && node dist/main.js',
        },
      },
    }),
  });
  console.log('✅ startCommand → node dist/main.js (sem migrate no boot)');

  if (existsSync(RENDER_ENV_PATH)) {
    let text = readFileSync(RENDER_ENV_PATH, 'utf8');
    if (/^DATABASE_URL=/m.test(text)) {
      text = text.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${dbUrl}`);
    } else {
      text += `\nDATABASE_URL=${dbUrl}\n`;
    }
    writeFileSync(RENDER_ENV_PATH, text);
    console.log('✅ .env.render.local atualizado');
  }

  if (!noDeploy) {
    await api(`/v1/services/${STAGING_SERVICE_ID}/deploys`, {
      method: 'POST',
      body: JSON.stringify({ clearCache: 'do_not_clear' }),
    });
    console.log('✅ Redeploy iniciado — aguarde ~3 min e teste o login.');
  }

  console.log(`→ Health: curl https://imobi-api-staging.onrender.com/api/v1/health`);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
