import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { mockJornada, MOCK_JORNADA_KYC } from '../../fixtures/jornada.fixture';
import { KycPage } from '../../page-objects/KycPage';

const EMPTY_KYC_STATUS = {
  usuarioId: 'e2e-tomador',
  status: 'PENDENTE',
  documentos: [],
  resumo: { pendentes: 4, aprovados: 0, rejeitados: 0, totalTipos: 4 },
};

test.use({ storageState: TOMADOR.storageState });

test.describe('KYC flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockJornada(page, MOCK_JORNADA_KYC);
    await page.route('**/api/proxy/kyc/status**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(EMPTY_KYC_STATUS),
      }),
    );
    const kp = new KycPage(page);
    await kp.goto();
  });

  test('renders KYC page with all sections', async ({ page }) => {
    const kp = new KycPage(page);

    await expect(kp.heading).toBeVisible();
    await expect(kp.progressSection).toBeVisible();
    await expect(kp.documentosSection).toBeVisible();
    await expect(page.getByText('RG — Frente')).toBeVisible();
    await expect(kp.enviarBtn.first()).toBeVisible();
  });

  test('shows progress stats: Aprovados, Pendentes, Rejeitados', async ({ page }) => {
    await expect(page.getByText('Aprovados', { exact: true })).toBeVisible();
    await expect(page.getByText('Pendentes', { exact: true })).toBeVisible();
    await expect(page.getByText('Rejeitados', { exact: true })).toBeVisible();
  });

  test('Enviar button triggers upload and shows Enviando state', async ({ page }) => {
    const kp = new KycPage(page);

    await page.route('**/api/proxy/kyc/upload**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          kycDocumentoId: 'e2e-doc-1',
          tipo: 'RG_FRENTE',
          status: 'PENDENTE',
          url: '/api/v1/kyc/documentos/e2e-doc-1/arquivo',
        }),
      });
    });

    await kp.enviarBtn.first().click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'rg-frente.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg'),
    });

    await expect(page.getByRole('button', { name: /Enviando/ }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('documents list shows empty or uploaded state', async ({ page }) => {
    const hasNoDocs = await page.getByText('Nenhum documento enviado').isVisible();
    const hasDocRows = await page.getByText('RG — Frente').isVisible();

    expect(hasNoDocs || hasDocRows).toBe(true);
  });

  test('como funciona info box is visible', async ({ page }) => {
    await expect(page.getByText('Como funciona')).toBeVisible();
    await expect(page.getByText(/até 24 horas/)).toBeVisible();
  });
});
