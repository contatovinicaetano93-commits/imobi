#!/usr/bin/env node
/**
 * E2E local — requer pnpm dev:api + pnpm dev:web (ou E2E_SKIP_SERVERS=0).
 *
 *   pnpm test:e2e:local
 *   pnpm test:e2e:local -- tests/auth/login.spec.ts
 */
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const e2eDir = resolve(root, 'apps/e2e');
const extra = process.argv.slice(2);

const env = {
  ...process.env,
  BASE_URL: process.env.BASE_URL ?? 'http://localhost:3000',
  API_URL: process.env.API_URL ?? 'http://localhost:4000/api/v1',
  E2E_SKIP_SERVERS: process.env.E2E_SKIP_SERVERS ?? '1',
  E2E_TOMADOR_EMAIL: process.env.E2E_TOMADOR_EMAIL ?? 'tomador@imobi.com.br',
  E2E_TOMADOR_PASSWORD: process.env.E2E_TOMADOR_PASSWORD ?? 'Tomador@123',
  E2E_GESTOR_EMAIL: process.env.E2E_GESTOR_EMAIL ?? 'gestor@imobi.com.br',
  E2E_GESTOR_PASSWORD: process.env.E2E_GESTOR_PASSWORD ?? 'Gestor@123',
  E2E_ENGENHEIRO_EMAIL: process.env.E2E_ENGENHEIRO_EMAIL ?? 'eng@imobi.com.br',
  E2E_ENGENHEIRO_PASSWORD: process.env.E2E_ENGENHEIRO_PASSWORD ?? 'Eng@123',
};

const child = spawn(
  'pnpm',
  ['exec', 'playwright', 'test', '--project=chromium', ...extra],
  { cwd: e2eDir, env, stdio: 'inherit', shell: true },
);

child.on('exit', (code) => process.exit(code ?? 1));
