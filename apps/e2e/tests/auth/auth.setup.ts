import { test as setup } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { TOMADOR, GESTOR, ENGENHEIRO } from '../../fixtures/auth.fixture';

const authDir = path.resolve(__dirname, '../../.auth');
const NEST_API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

// Bypasses the UI entirely: calls NestJS directly to get JWT, then writes the
// Playwright storageState file with the cookie pre-set.  This avoids the
// Next.js + NestJS cold-start chain (can exceed 5 min on WSL2 PostgreSQL).
async function saveAuthState(email: string, password: string, outFile: string): Promise<string> {
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

  return data.accessToken;
}

setup.beforeAll(async () => {
  await mkdir(authDir, { recursive: true });
});

// Warm up Next.js dev server using a real Chromium browser so that Next.js
// compiles BOTH the HTML route AND the JavaScript chunks on first visit.
// A plain Node.js fetch only triggers HTML compilation; the JS chunks (which
// tests depend on) are compiled lazily on the first browser request and can
// add 3-8 minutes to the first test.  Running the browser warm-up concurrently
// with the NestJS auth saves means the extra cost is near-zero.
setup('auth:all', async ({ page }) => {
  // Start /login warm-up immediately using the real browser so Next.js
  // compiles JS chunks.  waitUntil:'domcontentloaded' means we don't wait for
  // every resource — just enough to guarantee the chunk compilation kicked off.
  const loginWarmup = page
    .goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 280_000 })
    .catch(() => {});

  // Save all three auth states in parallel (~4 s on WSL2)
  const [tomadorToken] = await Promise.all([
    saveAuthState(TOMADOR.email, TOMADOR.password, path.join(authDir, 'tomador.json')),
    saveAuthState(GESTOR.email, GESTOR.password, path.join(authDir, 'gestor.json')),
    saveAuthState(ENGENHEIRO.email, ENGENHEIRO.password, path.join(authDir, 'engenheiro.json')),
  ]);

  // Warm up /dashboard with a real JWT cookie so the authenticated route's
  // JS chunks are also compiled before the actual tests run.
  await page.context().addCookies([{
    name: 'access_token',
    value: tomadorToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);

  await Promise.all([
    loginWarmup,
    page
      .goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 280_000 })
      .catch(() => {}),
  ]);
});
