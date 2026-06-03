import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';
import { TOMADOR } from '../../fixtures/auth.fixture';

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
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login('wrong@email.com', 'WrongPass123!');
    await expect(lp.errorMsg).toBeVisible();
  });

  test('redirects to /dashboard after valid login', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Visão Geral' })).toBeVisible();
  });

  test('sets access_token cookie after login', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'access_token')).toBe(true);
  });

  test('logout clears session and redirects to /login', async ({ page }) => {
    // Login first
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL('**/dashboard', { timeout: 15_000 });

    // Logout via API
    await page.evaluate(async () => {
      await fetch('/api/auth/session', { method: 'DELETE' });
    });
    await page.goto('/login');
    await expect(lp.brand).toBeVisible();

    // Dashboard should redirect to login now
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
  });
});
