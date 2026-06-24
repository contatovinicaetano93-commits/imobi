import { readFileSync } from 'fs';
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { mockJornada, MOCK_JORNADA_KYC } from '../../fixtures/jornada.fixture';

function tomadorCookies() {
  const state = JSON.parse(readFileSync(TOMADOR.storageState, 'utf-8')) as {
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'Strict' | 'Lax' | 'None';
    }>;
  };
  const base = process.env.BASE_URL ?? 'http://localhost:3000';
  const host = new URL(base).hostname;
  const secure = base.startsWith('https');
  return state.cookies.map((c) => ({
    ...c,
    domain: host,
    secure,
    sameSite: c.sameSite ?? 'Lax',
  }));
}

test.describe('Login', () => {
  test('renders login form', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await expect(lp.brand).toBeVisible();
    await expect(lp.email).toBeVisible();
    await expect(lp.senha).toBeVisible();
    await expect(lp.submitBtn).toBeVisible();
    await expect(lp.cadastroLink).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.submitBtn.click();
    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('shows API error for wrong credentials', async ({ page }) => {
    await page.route((url) => url.href.includes('/api/proxy/auth/login'), (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Credenciais inválidas' }) })
    );
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('wrong@email.com', 'WrongPass123!');
    await expect(lp.errorMsg).toBeVisible({ timeout: 30_000 });
  });

  test('redirects to próximo passo da jornada after valid login', async ({ page }) => {
    await mockJornada(page, MOCK_JORNADA_KYC);
    const fulfillLogin = async (route: import('@playwright/test').Route) => {
      await page.context().addCookies(tomadorCookies());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, role: 'CONSTRUTOR', nome: 'Cliente Tomador', email: TOMADOR.email }),
      });
    };
    await page.route((url) => url.href.includes('/web-api/auth/login'), fulfillLogin);
    await page.route((url) => url.href.includes('/api/proxy/auth/login'), fulfillLogin);
    await page.route('**/web-api/auth/session', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    );
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL(/\/dashboard\/kyc/, { timeout: 120_000 });
    await expect(page).toHaveURL(/\/dashboard\/kyc/);
  });

  test('sets access_token cookie after login', async () => {
    const state = JSON.parse(readFileSync(TOMADOR.storageState, 'utf-8')) as {
      cookies: Array<{ name: string }>;
    };
    expect(state.cookies.some((c) => c.name === 'access_token')).toBe(true);
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    await mockJornada(page, MOCK_JORNADA_KYC);
    const fulfillLogin = async (route: import('@playwright/test').Route) => {
      await page.context().addCookies(tomadorCookies());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, role: 'CONSTRUTOR', nome: 'Cliente Tomador', email: TOMADOR.email }),
      });
    };
    await page.route((url) => url.href.includes('/web-api/auth/login'), fulfillLogin);
    await page.route((url) => url.href.includes('/api/proxy/auth/login'), fulfillLogin);
    await page.route('**/web-api/auth/session', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    );
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL(/\/dashboard\/kyc/, { timeout: 60_000 });

    await page.evaluate(async () => {
      await fetch('/api/auth/session', { method: 'DELETE' });
    });
    await page.goto('/login');
    await expect(lp.brand).toBeVisible();

    await page.goto('/dashboard/construtor');
    await page.waitForURL('**/login**', { timeout: 30_000 });
  });
});
