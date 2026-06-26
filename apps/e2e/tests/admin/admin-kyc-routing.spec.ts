import { test, expect } from '@playwright/test';
import { seedAuthCookies } from '../../fixtures/api-helpers';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@imobi.com.br';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123';

test.describe('Admin KYC routing (sem painel gestor)', () => {
  test.beforeEach(async ({ context }) => {
    await seedAuthCookies(context, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('admin em /dashboard/gestor/kyc redireciona para /dashboard/admin/kyc', async ({ page }) => {
    await page.goto('/dashboard/gestor/kyc', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/admin\/kyc/, { timeout: 30_000 });
    await expect(page.getByText('Centro de Comando')).toBeVisible();
    await expect(page.getByText('Fila KYC — Aprovação')).toBeVisible();
  });

  test('admin em /dashboard/gestor/etapas redireciona para /dashboard/admin/vistorias', async ({
    page,
  }) => {
    await page.goto('/dashboard/gestor/etapas', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/admin\/vistorias/, { timeout: 30_000 });
  });
});
