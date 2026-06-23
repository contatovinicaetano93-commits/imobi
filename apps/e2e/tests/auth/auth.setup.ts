import { test as setup } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { TOMADOR, GESTOR, ENGENHEIRO } from '../../fixtures/auth.fixture';

const authDir = path.resolve(__dirname, '../../.auth');
const NEST_API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const ROLES = (process.env.E2E_ROLES ?? 'tomador,gestor,engenheiro')
  .split(',')
  .map((r) => r.trim().toLowerCase())
  .filter(Boolean);

const ROLE_CONFIG = {
  tomador: { email: TOMADOR.email, password: TOMADOR.password, file: 'tomador.json' },
  gestor: { email: GESTOR.email, password: GESTOR.password, file: 'gestor.json' },
  engenheiro: { email: ENGENHEIRO.email, password: ENGENHEIRO.password, file: 'engenheiro.json' },
} as const;

async function assertApiHealthy() {
  const res = await fetch(`${NEST_API}/health`, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok) {
    throw new Error(
      `API indisponível em ${NEST_API}. Rode: pnpm dev:kill-api && pnpm dev:api`,
    );
  }
}

async function saveAuthState(email: string, password: string, outFile: string): Promise<string> {
  const res = await fetch(`${NEST_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha: password }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(
      `Login API falhou (${res.status}) para ${email}: ${body}\n` +
        '→ Rode: pnpm seed:dev (usuários em services/api/src/seeds/dev-seed.ts)',
    );
  }
  const data = (await res.json()) as { accessToken: string; refreshToken?: string };

  const now = Math.floor(Date.now() / 1000);
  const base = { domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' as const };

  await writeFile(
    outFile,
    JSON.stringify(
      {
        cookies: [
          { ...base, name: 'access_token', value: data.accessToken, expires: now + 8 * 3600 },
          ...(data.refreshToken
            ? [{ ...base, name: 'refresh_token', value: data.refreshToken, expires: now + 7 * 24 * 3600 }]
            : []),
        ],
        origins: [],
      },
      null,
      2,
    ),
    'utf-8',
  );

  return data.accessToken;
}

setup.beforeAll(async () => {
  await mkdir(authDir, { recursive: true });
  await assertApiHealthy();
});

setup('auth:all', async ({ page }) => {
  const loginWarmup = page
    .goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 280_000 })
    .catch(() => {});

  const saves = ROLES.map((role) => {
    const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
    if (!cfg) return Promise.resolve('');
    return saveAuthState(cfg.email, cfg.password, path.join(authDir, cfg.file));
  });

  const tokens = await Promise.all(saves);
  const tomadorToken = tokens[0];

  if (tomadorToken) {
    await page.context().addCookies([
      {
        name: 'access_token',
        value: tomadorToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await Promise.all([
      loginWarmup,
      page.goto(`${BASE_URL}/dashboard/inicio`, { waitUntil: 'domcontentloaded', timeout: 280_000 }).catch(() => {}),
    ]);
  } else {
    await loginWarmup;
  }
});
