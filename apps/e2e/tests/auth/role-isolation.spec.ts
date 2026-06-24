import { test, expect } from '@playwright/test';
import { GESTOR, TOMADOR } from '../../fixtures/auth.fixture';

test.describe('Role isolation (MVP middleware)', () => {
  test('tomador cannot access gestor panel', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: TOMADOR.storageState });
    const page = await ctx.newPage();
    await page.goto('/dashboard/gestor', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/construtor/);
    await ctx.close();
  });

  test('gestor cannot access admin panel', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: GESTOR.storageState });
    const page = await ctx.newPage();
    await page.goto('/dashboard/admin', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/gestor/);
    await ctx.close();
  });
});
