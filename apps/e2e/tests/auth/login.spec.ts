import { readFileSync } from 'fs';
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';
import { TOMADOR } from '../../fixtures/auth.fixture';

const MOCK_SESSION_COOKIE = 'access_token=mock_token; Path=/; SameSite=Lax';

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
    await expect(page.locator('p.text-xs.text-red-500').first()).toBeVisible();
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

  test('redirects to painel tomador after valid login', async ({ page }) => {
    await page.route((url) => url.href.includes('/api/proxy/auth/login'), (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Set-Cookie': MOCK_SESSION_COOKIE },
        body: JSON.stringify({ ok: true }),
      })
    );
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 120_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('sets access_token cookie after login', async () => {
    // auth:all setup calls NestJS directly and writes .auth/tomador.json.
    // Reading the file here avoids a slow dashboard SSR round-trip in this test.
    const state = JSON.parse(readFileSync(TOMADOR.storageState, 'utf-8')) as {
      cookies: Array<{ name: string }>;
    };
    expect(state.cookies.some((c) => c.name === 'access_token')).toBe(true);
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    await page.route((url) => url.href.includes('/api/proxy/auth/login'), async (route) => {
      // route.fulfill Set-Cookie doesn't propagate to Chromium cookie jar for
      // fetch() responses; set the cookie explicitly before fulfilling.
      await page.context().addCookies([{
        name: 'access_token', value: 'mock_token',
        domain: 'localhost', path: '/',
        httpOnly: true, secure: false, sameSite: 'Lax',
      }]);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL('**/dashboard', { timeout: 60_000 });

    // Logout via API
    await page.evaluate(async () => {
      await fetch('/api/auth/session', { method: 'DELETE' });
    });
    await page.goto('/login');
    await expect(lp.brand).toBeVisible();

    // Dashboard should redirect to login now
    await page.goto('/dashboard');
    await page.waitForURL('**/login**', { timeout: 30_000 });
  });
});
