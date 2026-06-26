import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@imobi.com.br';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  const lp = new LoginPage(page);
  await lp.goto();
  await lp.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

test.describe('Admin KYC routing (sem painel gestor)', () => {
  test('admin em /dashboard/gestor/kyc redireciona para /dashboard/admin/kyc', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/gestor/kyc', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/admin\/kyc/);
    await expect(page.getByText('Centro de Comando')).toBeVisible();
    await expect(page.getByText('Fila KYC — Aprovação')).toBeVisible();
  });

  test('admin em /dashboard/gestor/etapas redireciona para /dashboard/admin/vistorias', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/gestor/etapas', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/admin\/vistorias/);
  });
});
