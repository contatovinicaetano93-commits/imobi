import { test, expect } from '@playwright/test';
import { GESTOR } from '../../fixtures/auth.fixture';
import { GestorPage } from '../../page-objects/GestorPage';

const MOCK_JORNADA_GESTOR_KYC = {
  perfil: 'gestor',
  passoAtual: 'gestor_kyc',
  titulo: 'Acompanhar fila KYC',
  descricao: '2 documento(s) na fila — visualização somente leitura',
  href: '/dashboard/gestor/kyc',
  concluido: false,
  passosConcluidos: 0,
  totalPassos: 2,
  progressoPct: 0,
  fila: { kyc: 2, etapas: 0 },
};

test.describe('Gestor dashboard (MVP)', () => {
  test.use({ storageState: GESTOR.storageState });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/proxy/jornada**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_JORNADA_GESTOR_KYC),
      }),
    );
  });

  test('shows next pending action', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await expect(gp.nextStepHeading()).toContainText('KYC');
    await expect(gp.continueButton()).toBeVisible();
  });

  test('continue links to kyc queue', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await expect(gp.continueButton()).toHaveAttribute('href', '/dashboard/gestor/kyc');
  });
});
