import { test as setup } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { TOMADOR, GESTOR, ENGENHEIRO } from '../../fixtures/auth.fixture';

const authDir = path.resolve(__dirname, '../../.auth');
const NEST_API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

function cookieBaseFromUrl(baseUrl: string) {
  const u = new URL(baseUrl);
  return {
    domain: u.hostname,
    path: '/',
    httpOnly: true,
    secure: u.protocol === 'https:',
    sameSite: 'Lax' as const,
  };
}

async function assertApiReachable(): Promise<void> {
  const healthUrl = NEST_API.replace(/\/api\/v1\/?$/, '') + '/api/v1/health';
  const res = await fetch(healthUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    throw new Error(`API health failed (${res.status}): ${healthUrl}`);
  }
}

const RETRYABLE_LOGIN_STATUSES = new Set([429, 500, 502, 503, 504]);

function loginRetryDelayMs(status: number, attempt: number): number {
  if (status === 429) return Math.min(60_000, 5_000 * attempt);
  return Math.min(30_000, 2_000 * attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Bypasses the UI entirely: calls NestJS directly to get JWT, then writes the
// Playwright storageState file with the cookie pre-set.  This avoids the
// Next.js + NestJS cold-start chain (can exceed 5 min on WSL2 PostgreSQL).
async function saveAuthState(email: string, password: string, outFile: string): Promise<string> {
  let lastError = '';
  for (let attempt = 1; attempt <= 8; attempt++) {
    const res = await fetch(`${NEST_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password }),
      signal: AbortSignal.timeout(120_000),
    });
    if (RETRYABLE_LOGIN_STATUSES.has(res.status)) {
      lastError = await res.text().catch(() => res.statusText);
      await sleep(loginRetryDelayMs(res.status, attempt));
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      const hint =
        res.status === 401
          ? ' Verifique seed: pnpm seed:staging:from-render'
          : '';
      throw new Error(`NestJS login failed (${res.status}) for ${email}: ${body}${hint}`);
    }
    const data = await res.json() as { accessToken: string; refreshToken?: string };

    const now = Math.floor(Date.now() / 1000);
    const base = cookieBaseFromUrl(BASE_URL);
    const role =
      (() => {
        try {
          const part = data.accessToken.split('.')[1];
          if (!part) return null;
          const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
          const payload = JSON.parse(json) as { role?: string; tipo?: string };
          return payload.role ?? payload.tipo ?? null;
        } catch {
          return null;
        }
      })() ?? undefined;

    await writeFile(outFile, JSON.stringify({
      cookies: [
        { ...base, name: 'access_token',  value: data.accessToken,              expires: now + 8 * 3600 },
        ...(role ? [{ ...base, name: 'session_role', value: role, expires: now + 8 * 3600 }] : []),
        ...(data.refreshToken ? [{ ...base, name: 'refresh_token', value: data.refreshToken, expires: now + 7 * 24 * 3600 }] : []),
      ],
      origins: [],
    }, null, 2), 'utf-8');

    return data.accessToken;
  }
  throw new Error(
    `NestJS login failed after retries for ${email} (last: ${lastError}). ` +
      'Render pode estar com rate limit — aguarde 1 min e tente de novo.',
  );
}

setup.beforeAll(async () => {
  await mkdir(authDir, { recursive: true });
});

// Warm up Next.js only when the web app is reachable (staging Vercel may be down).
setup('auth:all', async ({ page }) => {
  await assertApiReachable();

  const cookieBase = cookieBaseFromUrl(BASE_URL);

  const webProbe = await fetch(`${BASE_URL}/login`, {
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  const webBody = webProbe ? await webProbe.text().catch(() => '') : '';
  const webOk = webProbe?.ok && !webBody.includes('DEPLOYMENT_NOT_FOUND');

  const loginWarmup = webOk
    ? page
        .goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 280_000 })
        .catch(() => {})
    : Promise.resolve();

  if (!webOk) {
    console.warn(
      `[auth.setup] Web ${BASE_URL} indisponível (HTTP ${webProbe?.status ?? 'n/a'}) — pulando warm-up do Next.js`,
    );
  }

  const tomadorToken = await saveAuthState(TOMADOR.email, TOMADOR.password, path.join(authDir, 'tomador.json'));
  await sleep(3_000);
  await saveAuthState(GESTOR.email, GESTOR.password, path.join(authDir, 'gestor.json'));
  await sleep(3_000);
  await saveAuthState(ENGENHEIRO.email, ENGENHEIRO.password, path.join(authDir, 'engenheiro.json'));

  // Warm up /dashboard with a real JWT cookie so the authenticated route's
  // JS chunks are also compiled before the actual tests run.
  await page.context().addCookies([{
    name: 'access_token',
    value: tomadorToken,
    ...cookieBase,
  }]);

  await Promise.all([
    loginWarmup,
    webOk
      ? page
          .goto(`${BASE_URL}/dashboard/construtor`, { waitUntil: 'domcontentloaded', timeout: 280_000 })
          .catch(() => {})
      : Promise.resolve(),
  ]);
});
