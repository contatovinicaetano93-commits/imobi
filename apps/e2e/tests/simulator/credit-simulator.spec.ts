import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { mockJornada, MOCK_JORNADA_ACOMPANHAR } from '../../fixtures/jornada.fixture';

test.use({ storageState: TOMADOR.storageState });

test.describe('Estudo de Viabilidade', () => {
  test.beforeEach(async ({ page }) => {
    await mockJornada(page, { ...MOCK_JORNADA_ACOMPANHAR, passoAtual: 'credito', href: '/dashboard/simulador' });
    await page.goto('/dashboard/simulador', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Estudo de Viabilidade' })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('renders wizard steps', async ({ page }) => {
    const stepper = page.locator('.flex.items-center.gap-0').first();
    for (const step of ['Empreendimento', 'Custos', 'Financiamento', 'Resultado']) {
      await expect(stepper.getByText(step, { exact: true })).toBeVisible();
    }
  });

  test('step 1 shows project form fields', async ({ page }) => {
    await expect(page.getByText('Dados do Empreendimento')).toBeVisible();
    await expect(page.getByPlaceholder('Ex: Residencial Gralha Azul')).toBeVisible();
    await expect(page.getByText('VGV — Valor Geral de Vendas')).toBeVisible();
    await expect(page.getByText('Número de unidades')).toBeVisible();
  });

  test('VGV input accepts currency values', async ({ page }) => {
    const input = vgvInput(page);
    await input.click();
    await input.fill('1500000');
    await expect(input).toHaveValue(/1\.500\.000/);
  });

  test('Próximo enabled after filling required fields', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: 'Próximo' });
    await expect(nextBtn).toBeDisabled();

    await page.getByPlaceholder('Ex: Residencial Gralha Azul').fill('Residencial E2E');
    await vgvInput(page).fill('2000000');
    await expect(nextBtn).toBeEnabled();
  });
});

function vgvInput(page: import('@playwright/test').Page) {
  return page.locator('label').filter({ hasText: 'VGV — Valor Geral de Vendas' }).locator('..').locator('input');
}
