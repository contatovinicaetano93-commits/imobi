import { test, expect } from '@playwright/test';
import { GESTOR } from '../../fixtures/auth.fixture';
import { GestorPage } from '../../page-objects/GestorPage';

test.describe('Gestor dashboard (KPI-only)', () => {
  test.use({ storageState: GESTOR.storageState });

  test('shows operational KPI dashboard without journey UI', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await expect(gp.pageHeading()).toBeVisible();
    await expect(page.getByRole('link', { name: /Continuar/i })).toHaveCount(0);
    await expect(page.getByText(/Seu próximo passo/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /KPIs da operação/i })).toBeVisible();
  });

  test('KPI cards link to drill-downs', async ({ page }) => {
    await page.goto('/dashboard/gestor', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page.getByRole('link', { name: /KYC na fila/i })).toHaveAttribute(
      'href',
      '/dashboard/gestor/kyc',
    );
    await expect(page.getByRole('link', { name: /Etapas no pipe/i })).toHaveAttribute(
      'href',
      '/dashboard/gestor/etapas',
    );
  });
});
