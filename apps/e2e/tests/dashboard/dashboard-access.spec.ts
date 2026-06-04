import { test, expect } from '@playwright/test';
import { TOMADOR, GESTOR, ENGENHEIRO } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../page-objects/DashboardPage';
import { GestorPage } from '../../page-objects/GestorPage';

test.describe('Tomador dashboard', () => {
  test.use({ storageState: TOMADOR.storageState });

  test('shows Visão Geral with KPI cards', async ({ page }) => {
    const dp = new DashboardPage(page);
    await dp.goto();

    await expect(dp.getKpiCard('Crédito disponível')).toBeVisible();
    await expect(dp.getKpiCard('Obras ativas')).toBeVisible();
    await expect(dp.getKpiCard('Etapas concluídas')).toBeVisible();
    await expect(dp.getKpiCard('Aguardando vistoria')).toBeVisible();
  });

  test('sidebar shows expected nav links', async ({ page }) => {
    const dp = new DashboardPage(page);
    await dp.goto();

    await expect(dp.obrasLink).toBeVisible();
    await expect(dp.simuladorLink).toBeVisible();
    await expect(dp.kycLink).toBeVisible();
  });
});

const MOCK_STATS = { filaAprovacoes: 3, filaKyc: 2, creditosAtivos: 5, obrasAtivas: 8 };

test.describe('Gestor dashboard', () => {
  test.use({ storageState: GESTOR.storageState });

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/proxy/manager/dashboard**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_STATS) })
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

  test('shows Fila de Visitas with KPI cards', async ({ page }) => {
    await page.goto('/dashboard/engenheiro');
    await expect(page.getByRole('heading', { name: 'Fila de Visitas' })).toBeVisible();

    await expect(page.getByText('Agendadas')).toBeVisible();
    await expect(page.getByText('Iniciadas')).toBeVisible();
    await expect(page.getByText('Concluídas')).toBeVisible();
  });
});
