import { test, expect } from '@playwright/test';
import { TOMADOR, GESTOR, ENGENHEIRO } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../page-objects/DashboardPage';
import { GestorPage } from '../../page-objects/GestorPage';

test.describe('Tomador dashboard', () => {
  test.use({ storageState: TOMADOR.storageState });

  test('shows painel construtor with operação ou estado vazio', async ({ page }) => {
    const dp = new DashboardPage(page);
    await dp.goto();

    await expect(page.getByText(/Operação ativa|Nenhuma operação ativa/).first()).toBeVisible();
    await expect(page.getByText('Cronograma de Pagamentos')).toBeVisible();
  });

  test('sidebar shows expected nav links', async ({ page }) => {
    const dp = new DashboardPage(page);
    await dp.goto();

    await expect(dp.obrasLink).toBeVisible();
    await expect(dp.simuladorLink).toBeVisible();
    await expect(dp.documentosLink).toBeVisible();
  });
});

const MOCK_STATS = { filaAprovacoes: 3, filaKyc: 2, creditosAtivos: 5, obrasAtivas: 8 };

test.describe('Gestor dashboard', () => {
  test.use({ storageState: GESTOR.storageState });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/proxy/manager/dashboard**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STATS) })
    );
    await page.route('**/api/proxy/jornada**', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    );
  });

  test('shows Painel do Gestor with stat cards', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();

    await expect(page.getByText('Etapas Pendentes')).toBeVisible();
    await expect(page.getByText('KYC Pendentes')).toBeVisible();
    await expect(page.getByText('Créditos Ativos')).toBeVisible();
    await expect(page.getByText('Obras em Execução')).toBeVisible();
  });

  test('shows Revisar Etapas and Revisar KYC quick actions', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();

    await expect(gp.revirarEtapasLink).toBeVisible();
    await expect(gp.revisarKycLink).toBeVisible();
  });

  test('Revisar Etapas links to /dashboard/gestor/etapas', async ({ page }) => {
    const gp = new GestorPage(page);
    await gp.goto();
    await expect(gp.revirarEtapasLink).toHaveAttribute('href', '/dashboard/gestor/etapas');
  });
});

test.describe('Engenheiro dashboard', () => {
  test.use({ storageState: ENGENHEIRO.storageState });

  test('shows portal do engenheiro with KPI cards', async ({ page }) => {
    await page.goto('/dashboard/engenheiro', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Vistorias e Obras' })).toBeVisible({ timeout: 60_000 });

    await expect(page.getByText('Obras ativas')).toBeVisible();
    await expect(page.getByText('Vistorias agendadas')).toBeVisible();
  });
});
