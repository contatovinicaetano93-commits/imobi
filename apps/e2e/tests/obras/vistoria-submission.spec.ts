import { test, expect, type Page } from '@playwright/test';
import { GESTOR } from '../../fixtures/auth.fixture';
import { VistoriaPage } from '../../page-objects/VistoriaPage';

test.use({ storageState: GESTOR.storageState });

const FAKE_OBRA_ID = 'obra-e2e-vistoria-001';
const FAKE_ETAPA_ID = 'etapa-e2e-vistoria-001';

const MOCK_ETAPA = {
  etapaId: FAKE_ETAPA_ID,
  nome: 'Fundação (E2E)',
  ordem: 1,
  percentualObra: 50,
  valorLiberacao: 50000,
  evidenciasCount: 0,
  criadoEm: '2025-01-01T00:00:00.000Z',
  status: 'AGUARDANDO_VISTORIA',
  evidencias: [],
  obra: {
    obraId: FAKE_OBRA_ID,
    nome: 'Obra E2E Vistoria',
    endereco: 'Rua Teste, 123',
    usuario: { usuarioId: 'u1', nome: 'Test User', email: 'test@test.com', cpf: '000.000.000-00' },
  },
};

const MOCK_OBRA = {
  id: FAKE_OBRA_ID,
  nome: 'Obra E2E Vistoria',
  status: 'EM_ANDAMENTO',
  geoLatitude: -23.5505,
  geoLongitude: -46.6333,
  raioValidacaoMetros: 100,
  etapas: [
    { id: FAKE_ETAPA_ID, nome: 'Fundação (E2E)', ordem: 1, percentualObra: 50, valorLiberacao: 50000, status: 'APROVADA', evidencias: [] },
    { id: 'etapa-e2e-002', nome: 'Estrutura', ordem: 2, percentualObra: 50, valorLiberacao: 50000, status: 'PENDENTE', evidencias: [] },
  ],
};

async function setupVistoriaMocks(page: Page) {
  await page.route(`**/api/proxy/manager/etapas/${FAKE_ETAPA_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ETAPA) });
  });
  await page.route(`**/api/proxy/evidencias/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function setupObraMocks(page: Page) {
  await page.route(`**/api/proxy/obras/${FAKE_OBRA_ID}/progresso`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '50' });
  });
  await page.route(`**/api/proxy/obras/${FAKE_OBRA_ID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_OBRA) });
  });
}

test.describe('Vistoria submission', () => {
  test('vistoria page renders correctly', async ({ page }) => {
    await setupVistoriaMocks(page);
    const vp = new VistoriaPage(page);
    await vp.goto(FAKE_OBRA_ID, FAKE_ETAPA_ID);

    await expect(vp.aguardandoBadge).toBeVisible();
    await expect(vp.getLiberacaoText()).toBeVisible();
    await expect(vp.getEvidenciasHeading()).toBeVisible();
    await expect(vp.parecerTextarea).toBeVisible();
    await expect(vp.aprovarBtn).toBeVisible();
    await expect(vp.rejeitarBtn).toBeVisible();
  });

  test('breadcrumb shows Obras link', async ({ page }) => {
    await setupVistoriaMocks(page);
    const vp = new VistoriaPage(page);
    await vp.goto(FAKE_OBRA_ID, FAKE_ETAPA_ID);

    await expect(vp.breadcrumbObras).toBeVisible();
    await expect(vp.breadcrumbObras).toHaveAttribute('href', '/dashboard/obras');
  });

  test('aprovar etapa redirects to obra detail', async ({ page }) => {
    await setupVistoriaMocks(page);
    await setupObraMocks(page);
    await page.route(`**/api/etapas/${FAKE_ETAPA_ID}/validar`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    const vp = new VistoriaPage(page);
    await vp.goto(FAKE_OBRA_ID, FAKE_ETAPA_ID);
    await vp.aprovar('Aprovado em teste automatizado');

    await page.waitForURL(`**/dashboard/obras/${FAKE_OBRA_ID}`, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Cronograma de Etapas' })).toBeVisible({ timeout: 20_000 });
  });

  test('rejeitar etapa shows button and allows rejection', async ({ page }) => {
    await setupVistoriaMocks(page);
    await setupObraMocks(page);
    await page.route(`**/api/etapas/${FAKE_ETAPA_ID}/validar`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    const vp = new VistoriaPage(page);
    await vp.goto(FAKE_OBRA_ID, FAKE_ETAPA_ID);
    await expect(vp.rejeitarBtn).toBeVisible();
    await vp.rejeitar('Documentação insuficiente — teste');

    await page.waitForURL(`**/dashboard/obras/${FAKE_OBRA_ID}`, { timeout: 15_000 });
  });
});
