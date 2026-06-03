import { test as setup } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { TOMADOR, GESTOR, ENGENHEIRO } from '../../fixtures/auth.fixture';

const authDir = path.resolve(__dirname, '../../.auth');
const NEST_API = process.env.API_URL ?? 'http://localhost:4000/api/v1';

// Bypasses the UI entirely: calls NestJS directly to get JWT, then writes the
// Playwright storageState file with the cookie pre-set.  This avoids the
// Next.js + NestJS cold-start chain (can exceed 5 min on WSL2 PostgreSQL).
async function saveAuthState(email: string, password: string, outFile: string) {
  setup.setTimeout(180_000);

  const res = await fetch(`${NEST_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`NestJS login failed (${res.status}) for ${email}: ${body}`);
  }
  const data = await res.json() as { accessToken: string; refreshToken?: string };

  const now = Math.floor(Date.now() / 1000);
  const base = { domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' as const };

  await writeFile(outFile, JSON.stringify({
    cookies: [
      { ...base, name: 'access_token',  value: data.accessToken,              expires: now + 8 * 3600 },
      ...(data.refreshToken ? [{ ...base, name: 'refresh_token', value: data.refreshToken, expires: now + 7 * 24 * 3600 }] : []),
    ],
    origins: [],
  }, null, 2), 'utf-8');
}

setup.beforeAll(async () => {
  await mkdir(authDir, { recursive: true });
});

setup('auth:tomador', async () => {
  await saveAuthState(TOMADOR.email, TOMADOR.password, path.join(authDir, 'tomador.json'));
});

setup('auth:gestor', async () => {
  await saveAuthState(GESTOR.email, GESTOR.password, path.join(authDir, 'gestor.json'));
});

setup('auth:engenheiro', async () => {
  await saveAuthState(ENGENHEIRO.email, ENGENHEIRO.password, path.join(authDir, 'engenheiro.json'));
});
