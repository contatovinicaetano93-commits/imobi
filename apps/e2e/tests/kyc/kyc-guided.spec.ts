import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { mockJornada } from '../../fixtures/jornada.fixture';

const MOCK_KYC = {
  perfil: 'tomador',
  passoAtual: 'kyc',
  titulo: 'Verificação de identidade',
  descricao: 'Envie seus documentos',
  href: '/dashboard/kyc',
  concluido: false,
  passosConcluidos: 0,
  totalPassos: 5,
  progressoPct: 0,
};

test.describe('KYC guided flow (MVP)', () => {
  test.use({ storageState: TOMADOR.storageState });

  test.beforeEach(async ({ page }) => {
    await mockJornada(page, MOCK_KYC);
  });

  test('renders GuidedFlowShell with progress and document list', async ({ page }) => {
    await page.goto('/dashboard/kyc', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page.getByRole('heading', { name: /Verificação de identidade/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('Progresso', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Documentos obrigatórios' })).toBeVisible();
    await expect(page.getByText('RG — Frente')).toBeVisible();
  });
});
