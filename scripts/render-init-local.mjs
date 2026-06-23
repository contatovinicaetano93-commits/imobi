#!/usr/bin/env node
/**
 * Prepara .env.render.local sem placeholders que quebram os scripts.
 *
 *   pnpm render:init
 *   # Cole RENDER_API_KEY real → pnpm render:key:check → pnpm seed:staging:from-render
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const example = resolve(root, '.env.render.example');
const target = resolve(root, '.env.render.local');

const UNICODE_ELLIPSIS = /\u2026|…/g;
const BAD_KEY_PATTERNS = [/^rnd_…/, /^rnd_\u2026/, /CHANGE_ME/, /REPLACE_ME/];

function sanitizeContent(raw) {
  let changed = false;
  const lines = raw.split('\n').map((line) => {
    if (!line.trim() || line.trim().startsWith('#')) return line;
    const eq = line.indexOf('=');
    if (eq < 1) return line;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (UNICODE_ELLIPSIS.test(value)) {
      changed = true;
      value = value.replace(UNICODE_ELLIPSIS, '');
      if (key === 'RENDER_API_KEY' && value.length < 20) {
        return '# RENDER_API_KEY=COLE_AQUI_A_CHAVE_COMPLETA_DO_RENDER';
      }
    }

    if (key === 'RENDER_API_KEY') {
      const bare = value.replace(/^["']|["']$/g, '');
      if (BAD_KEY_PATTERNS.some((p) => p.test(bare)) || bare.length < 20) {
        changed = true;
        return '# RENDER_API_KEY=COLE_AQUI_A_CHAVE_COMPLETA_DO_RENDER';
      }
    }

    if (value.includes('CHANGE_ME') || value.includes('REPLACE_ME')) {
      changed = true;
      return `# ${key}=PREENCHER_MANUALMENTE`;
    }

    return line;
  });

  return { text: lines.join('\n'), changed };
}

if (!existsSync(target)) {
  if (!existsSync(example)) {
    console.error('❌ .env.render.example ausente');
    process.exit(1);
  }
  copyFileSync(example, target);
  console.log('✅ Criado .env.render.local a partir do exemplo\n');
} else {
  const raw = readFileSync(target, 'utf8');
  const { text, changed } = sanitizeContent(raw);
  if (changed) {
    writeFileSync(target, text, 'utf8');
    console.log('✅ .env.render.local sanitizado (removidos … e placeholders inválidos)\n');
  } else {
    console.log('ℹ️  .env.render.local já existe\n');
  }
}

console.log('Próximos passos:');
console.log('  1. https://dashboard.render.com/u/settings#api-keys → Create API Key');
console.log('  2. Edite .env.render.local → linha RENDER_API_KEY=rnd_... (40+ chars, SEM …)');
console.log('  3. pnpm render:key:check');
console.log('  4. pnpm seed:staging:from-render');
console.log('  5. pnpm test:e2e:staging\n');
