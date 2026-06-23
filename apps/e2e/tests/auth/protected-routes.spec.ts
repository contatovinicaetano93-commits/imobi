import { test, expect } from '@playwright/test';

// All tests run without auth state (no storageState configured)
test.describe('Protected routes redirect unauthenticated users', () => {
  const protectedPaths = [
    '/dashboard',
    '/dashboard/obras',
    '/dashboard/credito',
    '/dashboard/gestor',
    '/dashboard/kyc',
    '/dashboard/score',
  ];

  for (const path of protectedPaths) {
    test(`redirects ${path} to /login with next param`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(`**/login**`, { timeout: 30_000 });
      expect(page.url()).toContain('next=');
      expect(page.url()).toContain(encodeURIComponent(path));
    });
  }

  test('public routes are accessible without auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/login/);

    await page.goto('/login');
    await expect(page.getByText('IMOBI', { exact: true }).first()).toBeVisible();

    await page.goto('/cadastro', { waitUntil: 'commit' });
    await expect(page).not.toHaveURL(/login/);
  });
});
