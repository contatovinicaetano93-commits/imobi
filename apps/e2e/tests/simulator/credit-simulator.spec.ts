import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';

test.use({ storageState: TOMADOR.storageState });

test.describe('Simulador de Crédito', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/simulador', { timeout: 60_000 });
    // Explicit 30s timeout: on first Next.js dev compile this route can be slow.
    await expect(page.getByRole('heading', { name: 'Simulador de Crédito' })).toBeVisible({ timeout: 30_000 });
  });

  test('renders sliders and result cards', async ({ page }) => {
    const [valorSlider, prazoSlider] = await page.locator('input[type="range"]').all();
    await expect(valorSlider).toBeVisible();
    await expect(prazoSlider).toBeVisible();

    await expect(page.getByText('Parcela mensal')).toBeVisible();
    await expect(page.getByText('Total pago')).toBeVisible();
    await expect(page.getByText('Total de juros')).toBeVisible();
    await expect(page.getByText('CET ao ano')).toBeVisible();
  });

  test('slider labels show BRL and month formatting', async ({ page }) => {
    // Default values appear in labels — label reads "Valor desejado: R$ 150.000,00"
    await expect(page.getByText(/Valor desejado/i)).toBeVisible();
    await expect(page.getByText(/meses/).first()).toBeVisible();
    await expect(page.getByText('R$ 10.000')).toBeVisible();
    await expect(page.getByText('R$ 1.000.000')).toBeVisible();
    await expect(page.getByText('12 meses')).toBeVisible();
    await expect(page.getByText('48 meses')).toBeVisible();
  });

  test('valor slider change updates the displayed value', async ({ page }) => {
    const valorSlider = page.locator('input[type="range"]').first();
    await valorSlider.fill('500000');
    // The label text should update reactively
    await expect(page.locator('label').filter({ hasText: /R\$/ }).first()).toContainText('500');
  });

  test('solicitar link points to /dashboard/credito/solicitar', async ({ page }) => {
    const link = page.getByRole('link', { name: /Solicitar este crédito/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/dashboard/credito/solicitar');
  });
});
