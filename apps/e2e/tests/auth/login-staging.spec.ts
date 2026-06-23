import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';
import { TOMADOR } from '../../fixtures/auth.fixture';

/**
 * Login real contra API staging (sem mock de route).
 * Só roda quando BASE_URL aponta para Vercel.
 */
test.describe('Login staging (API real)', () => {
  test.skip(
    !process.env.BASE_URL?.includes('vercel.app'),
    'Apenas em staging (BASE_URL com vercel.app)',
  );

  test('tomador faz login e chega ao dashboard', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.login(TOMADOR.email, TOMADOR.password);
    await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 180_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
