import { test, expect } from '@playwright/test';
import { seedAuthCookies } from '../../fixtures/api-helpers';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@imobi.com.br';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123';

test.describe('Admin KYC routing (sem painel gestor)', () => {
  test.beforeEach(async ({ context }) => {
    await seedAuthCookies(context, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('rotas legadas gestor/kyc redirecionam para painel único', async ({ page }) => {
    await page.goto('/dashboard/gestor/kyc', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/gestor\/?$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Operação do fundo/i })).toBeVisible();
  });

  test('rotas legadas gestor/etapas redirecionam para painel único', async ({ page }) => {
    await page.goto('/dashboard/gestor/etapas', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/dashboard\/gestor\/?$/, { timeout: 30_000 });
  });
});
