#!/usr/bin/env node
/**
 * Valida só RENDER_API_KEY (mínimo para pnpm seed:staging:from-render).
 *   pnpm render:key:check
 */
import { existsSync } from 'node:fs';
import {
  RENDER_ENV_PATH,
  loadRenderEnvFile,
  resolveRenderApiKey,
  hasPlaceholder,
} from './render-env-utils.mjs';

const DASHBOARD = 'https://dashboard.render.com/u/settings#api-keys';

if (!existsSync(RENDER_ENV_PATH)) {
  console.error('❌ Arquivo ausente: .env.render.local');
  console.error('   cp .env.render.example .env.render.local');
  console.error(`   Crie API key: ${DASHBOARD}\n`);
  process.exit(1);
}

const key = resolveRenderApiKey();

if (!key) {
  console.error('❌ RENDER_API_KEY ausente em .env.render.local');
  console.error(`   1. ${DASHBOARD}`);
  console.error('   2. Create API Key → copie o valor completo');
  console.error('   3. RENDER_API_KEY=rnd_xxxxxxxx (uma linha, sem aspas)\n');
  process.exit(1);
}

for (let i = 0; i < key.length; i++) {
  if (key.charCodeAt(i) > 255) {
    console.error(`❌ RENDER_API_KEY inválida: caractere unicode na posição ${i} (U+${key.charCodeAt(i).toString(16).toUpperCase()})`);
    console.error(`   Valor atual tem ${key.length} caracteres — parece placeholder "rnd_…" do exemplo.`);
    console.error(`   1. ${DASHBOARD}`);
    console.error('   2. Apague a linha RENDER_API_KEY e cole a chave REAL (~40+ caracteres)\n');
    process.exit(1);
  }
}

if (key.length < 20) {
  console.error(`❌ RENDER_API_KEY muito curta (${key.length} chars) — não é uma API key real do Render.`);
  console.error('   Você provavelmente tem: RENDER_API_KEY=rnd_…  (placeholder do docs)');
  console.error(`   1. ${DASHBOARD} → Create API Key`);
  console.error('   2. Substitua a linha inteira em .env.render.local');
  console.error('   3. pnpm render:key:check  (deve mostrar OK)');
  console.error('   4. pnpm seed:staging:from-render\n');
  process.exit(1);
}

if (hasPlaceholder(key)) {
  console.error('❌ RENDER_API_KEY ainda é placeholder — substitua pelo valor real do dashboard Render.');
  console.error(`   Valor atual tem ${key.length} caracteres, mas contém texto de exemplo (CHANGE_ME, REPLACE_ME, …).`);
  console.error(`   1. ${DASHBOARD} → Create API Key`);
  console.error('   2. Substitua a linha inteira em .env.render.local');
  console.error('   3. pnpm render:key:check  (deve mostrar OK)');
  console.error('   4. pnpm seed:staging:from-render\n');
  process.exit(1);
}

if (!key.startsWith('rnd_')) {
  console.error('❌ RENDER_API_KEY deve começar com rnd_');
  process.exit(1);
}

console.log(`✅ RENDER_API_KEY OK (${key.length} chars, ASCII)`);
console.log('   Próximo: pnpm seed:staging:from-render');
