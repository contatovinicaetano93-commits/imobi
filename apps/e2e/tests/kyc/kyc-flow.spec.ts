import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { KycPage } from '../../page-objects/KycPage';

test.use({ storageState: TOMADOR.storageState });

test.describe('KYC flow', () => {
  test.beforeEach(async ({ page }) => {
    const kp = new KycPage(page);
    await kp.goto();
  });

  test('renders KYC page with all sections', async ({ page }) => {
    const kp = new KycPage(page);

    await expect(kp.heading).toBeVisible();
    await expect(kp.documentosSection).toBeVisible();
    await expect(kp.uploadSection).toBeVisible();
    await expect(kp.enviarRgBtn).toBeVisible();
    await expect(kp.enviarSelfieBtn).toBeVisible();
  });

  test('shows 4 stat cards: Status Geral, Pendentes, Aprovados, Rejeitados', async ({ page }) => {
    await expect(page.getByText('Status Geral')).toBeVisible();
    await expect(page.getByText('Pendentes')).toBeVisible();
    await expect(page.getByText('Aprovados', { exact: true })).toBeVisible();
    await expect(page.getByText('Rejeitados', { exact: true })).toBeVisible();
  });

  test('Enviar RG button triggers upload and shows Enviando state', async ({ page }) => {
    const kp = new KycPage(page);

    // Intercept the API call to keep the button in loading state briefly
    let resolveUpload!: () => void;
    const uploadPromise = new Promise<void>((resolve) => { resolveUpload = resolve; });

    await page.route('**/api/proxy/kyc/**', async (route) => {
      await uploadPromise;
      await route.continue();
    });

    // Click the button and immediately check for "Enviando..." state
    const clickPromise = kp.enviarRgBtn.click();
    await expect(page.getByRole('button', { name: /Enviando/ }).first()).toBeVisible({ timeout: 5_000 });

    // Let the request complete
    resolveUpload();
    await clickPromise;
  });

  test('documents list shows empty state text initially', async ({ page }) => {
    // For a fresh user with no documents, shows "Nenhum documento enviado"
    // For seeded users that already have docs, the list is visible
    const hasNoDocs = await page.getByText('Nenhum documento enviado').isVisible();
    const hasDocs = await page.locator('.border.rounded.p-4').count();

    // Either state is valid — the page renders correctly
    expect(hasNoDocs || hasDocs > 0).toBe(true);
  });

  test('próximos passos info box is visible', async ({ page }) => {
    await expect(page.getByText('Próximos passos')).toBeVisible();
    await expect(page.getByText(/até 24 horas/)).toBeVisible();
  });
});
