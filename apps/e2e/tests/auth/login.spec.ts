import { readFileSync } from 'fs';
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { signTestJwt } from '../../helpers/sign-test-jwt';

async function mockTomadorLogin(page: import('@playwright/test').Page) {
  const token = await signTestJwt('TOMADOR');
  await page.route((url) => url.href.includes('/api/proxy/auth/login'), async (route) => {
    await page.context().addCookies([
      {
        name: 'access_token',
        value: token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, role: 'TOMADOR' }),
    });
  });
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
    await expect(page.locator('form p').first()).toBeVisible();
  });

  test('shows API error for wrong credentials', async ({ page }) => {
    await page.route((url) => url.href.includes('/api/proxy/auth/login'), (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciais inválidas' }),
      }),
    );
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('wrong@email.com', 'WrongPass123!');
    await expect(lp.errorMsg).toBeVisible({ timeout: 30_000 });
  });

  test('redirects to tomador home after valid login', async ({ page }) => {
    await mockTomadorLogin(page);
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL('**/dashboard/inicio**', { timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Olá!' })).toBeVisible({ timeout: 120_000 });
  });

  test('sets access_token cookie after login', () => {
    const state = JSON.parse(readFileSync(TOMADOR.storageState, 'utf-8')) as {
      cookies: Array<{ name: string }>;
    };
    expect(state.cookies.some((c) => c.name === 'access_token')).toBe(true);
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    await mockTomadorLogin(page);
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL('**/dashboard/inicio**', { timeout: 60_000 });

    await page.evaluate(async () => {
      await fetch('/api/auth/session', { method: 'DELETE' });
    });
    await page.goto('/login');
    await expect(lp.brand).toBeVisible();

    await page.goto('/dashboard');
    await page.waitForURL('**/login**', { timeout: 30_000 });
  });
});
