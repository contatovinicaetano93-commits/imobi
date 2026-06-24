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

    await expect
      .poll(async () => (await page.context().cookies()).some((c) => c.name === 'access_token'), {
        timeout: 180_000,
      })
      .toBe(true);

    await page.goto('/dashboard/construtor', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/(construtor|kyc|credito|obras|simulador)/, {
      timeout: 60_000,
    });
  });
});
