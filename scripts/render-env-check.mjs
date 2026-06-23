#!/usr/bin/env node
/**
 * Valida .env.render.local sem chamar a API Render.
 *   pnpm render:env:check
 */
import { existsSync } from 'node:fs';
import {
  RENDER_ENV_PATH,
  loadRenderEnvFile,
  validateRenderCredentials,
  assertDatabaseUrl,
  hasPlaceholder,
} from './render-env-utils.mjs';

if (!existsSync(RENDER_ENV_PATH)) {
  console.error('❌ Arquivo ausente: .env.render.local');
  console.error('   cp .env.render.example .env.render.local');
  console.error('   Preencha com valores reais do dashboard Render (sem "…" ou CHANGE_ME).\n');
  process.exit(1);
}

const env = loadRenderEnvFile();
const issues = [];

try {
  validateRenderCredentials(env);
} catch (e) {
  issues.push(e.message);
}

try {
  assertDatabaseUrl(env.DATABASE_URL);
} catch (e) {
  issues.push(e.message);
}

if (hasPlaceholder(env.REDIS_URL ?? '')) {
  issues.push('REDIS_URL ainda é placeholder');
}

for (const key of ['JWT_SECRET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'FIREBASE_PRIVATE_KEY']) {
  if (hasPlaceholder(env[key] ?? '')) {
    issues.push(`${key} ainda é placeholder`);
  }
}

if (issues.length) {
  console.error('❌ .env.render.local incompleto:\n');
  for (const msg of issues) console.error(`   • ${msg}`);
  console.error('\n   Para só popular o banco staging:');
  console.error('   1. Cole RENDER_API_KEY real (Render → Account Settings → API Keys)');
  console.error('   2. pnpm seed:staging:from-render');
  console.error('\n   Para deploy completo: preencha todas as vars e rode pnpm render:env:check\n');
  process.exit(1);
}

console.log('✅ .env.render.local OK (placeholders ausentes, RENDER_API_KEY ASCII)');
console.log('   Próximo: pnpm render:env:push');
console.log('   Seed:    pnpm seed:staging');
