import { test, expect } from '@playwright/test';
import { GESTOR } from '../../fixtures/auth.fixture';
import { GestorPage } from '../../page-objects/GestorPage';

test.use({ storageState: GESTOR.storageState });

const MOCK_STATS = { filaAprovacoes: 3, filaKyc: 2, creditosAtivos: 5, obrasAtivas: 8 };

test.describe('Gestor approval panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/proxy/manager/dashboard**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STATS) })
    );
  });

  test('gestor page loads with heading and summary', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await expect(gp.heading).toBeVisible();
    // Summary line: "X itens pendentes de análise"
    await expect(page.getByText(/itens pendentes de análise/)).toBeVisible();
  });

  test('stat cards are clickable links', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();

    const etapasCard = page.getByRole('link').filter({ hasText: 'Etapas Pendentes' }).first();
    const kycCard = page.getByRole('link').filter({ hasText: 'KYC Pendentes' }).first();

    await expect(etapasCard).toBeVisible();
    await expect(kycCard).toBeVisible();
  });

  test('Revisar Etapas navigates to etapas queue', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await gp.revirarEtapasLink.click();
    await page.waitForURL('**/gestor/etapas**', { timeout: 30_000 });
  });

  test('Revisar KYC navigates to kyc queue', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await gp.revisarKycLink.click();
    await page.waitForURL('**/gestor/kyc**', { timeout: 30_000 });
  });

  test('dicas section is visible', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await expect(page.getByText('Dicas')).toBeVisible();
    await expect(page.getByText(/geolocalização/)).toBeVisible();
  });
});
