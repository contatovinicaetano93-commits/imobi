import { test, expect, type Page } from '@playwright/test';
import { TOMADOR, GESTOR } from '../../fixtures/auth.fixture';
import { mockJornada, MOCK_JORNADA_ACOMPANHAR, MOCK_JORNADA_GESTOR_ETAPAS } from '../../fixtures/jornada.fixture';
import { ObraDetailPage } from '../../page-objects/ObraDetailPage';
import { loginViaApi, getObras } from '../../fixtures/api-helpers';

const MOCK_OBRA_ID = 'e2e-obra-mock';
const MOCK_OBRA_NOME = 'Obra E2E Mock';
const MOCK_OBRA_STATUS = 'EM_ANDAMENTO';

test.use({ storageState: TOMADOR.storageState });

async function mockObraRoutes(page: Page, obraId: string, obraNome: string, obraStatus: string) {
  const etapas = [
    {
      id: 'etapa-m1',
      etapaId: 'etapa-m1',
      nome: 'Fundação',
      ordem: 1,
      percentualObra: 50,
      valorLiberacao: 50000,
      status: 'APROVADA',
      evidencias: [],
    },
    {
      id: 'etapa-m2',
      etapaId: 'etapa-m2',
      nome: 'Estrutura',
      ordem: 2,
      percentualObra: 50,
      valorLiberacao: 50000,
      status: 'AGUARDANDO_VISTORIA',
      evidencias: [],
    },
  ];

  await page.route('**/api/proxy/obras/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/progresso')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '50' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: obraId,
        obraId,
        nome: obraNome,
        status: obraStatus,
        geoLatitude: -23.5505,
        geoLongitude: -46.6333,
        raioValidacaoMetros: 100,
        etapas,
      }),
    });
  });

  await page.route('**/api/proxy/documentos/obra/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function resolveObraRef(): Promise<{ obraId: string; nome: string; status: string }> {
  try {
    const token = await loginViaApi(TOMADOR.email, TOMADOR.password);
    const obras = await getObras(token);
    if (obras.length > 0) {
      const obra = obras[0];
      const obraId =
        (obra as { obraId?: string; id?: string }).obraId ??
        (obra as { id?: string }).id ??
        MOCK_OBRA_ID;
      return { obraId, nome: obra.nome, status: obra.status };
    }
  } catch {
    /* fallback mock */
  }
  return { obraId: MOCK_OBRA_ID, nome: MOCK_OBRA_NOME, status: MOCK_OBRA_STATUS };
}

test.describe('Obras workflow', () => {
  let obraRef: { obraId: string; nome: string; status: string };

  test.beforeAll(async () => {
    obraRef = await resolveObraRef();
  });

  test.beforeEach(async ({ page }) => {
    await mockObraRoutes(page, obraRef.obraId, obraRef.nome, obraRef.status);
    await mockJornada(page, { ...MOCK_JORNADA_ACOMPANHAR, href: `/dashboard/obras/${obraRef.obraId}` });
  });

  test('obras list page loads', async ({ page }) => {
    await mockJornada(page, { ...MOCK_JORNADA_ACOMPANHAR, href: '/dashboard/obras' });
    await page.goto('/dashboard/obras', { timeout: 60_000 });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 60_000 });
  });

  test('obra detail shows header and tabs', async ({ page }) => {
    const dp = new ObraDetailPage(page);
    await dp.goto(obraRef.obraId);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(obraRef.nome);
    await expect(dp.visaoGeralTab).toBeVisible();
    await expect(dp.etapasTab).toBeVisible();
  });

  test('etapas tab shows status badges', async ({ page }) => {
    const dp = new ObraDetailPage(page);
    await dp.goto(obraRef.obraId);
    await dp.openEtapasTab();

    await expect(page.getByText('Aprovada')).toBeVisible();
    await expect(page.getByText('Aguardando Vistoria')).toBeVisible();
  });
});

test.describe('Obras workflow — gestor MVP', () => {
  test.use({ storageState: GESTOR.storageState });

  test.beforeEach(async ({ page }) => {
    await mockJornada(page, MOCK_JORNADA_GESTOR_ETAPAS);
    await page.route('**/api/proxy/manager/etapas-pendentes**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 1,
          etapas: [
            {
              etapaId: 'etapa-m2',
              nome: 'Estrutura',
              ordem: 2,
              percentualObra: 50,
              valorLiberacao: 50000,
              evidenciasCount: 0,
              criadoEm: new Date().toISOString(),
              obra: {
                nome: MOCK_OBRA_NOME,
                usuario: { nome: 'Cliente Tomador' },
              },
            },
          ],
        }),
      }),
    );
  });

  test('jornada aponta seção de etapas no painel único', async ({ page }) => {
    await page.goto('/dashboard/gestor', { waitUntil: 'domcontentloaded' });
    const hero = page.getByRole('region', { name: 'Próximo passo' });
    await expect(hero).toBeVisible({ timeout: 60_000 });
    await expect(hero.getByRole('heading', { level: 1 })).toContainText(/etapas/i);
    await expect(page.getByRole('link', { name: /KPI · Etapas/i })).toHaveAttribute(
      'href',
      '#secao-etapas',
    );
  });

  test('pipe de etapas visível na página única do gestor', async ({ page }) => {
    await page.goto('/dashboard/gestor', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Etapas recentes no pipe' })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(MOCK_OBRA_NOME)).toBeVisible();
    await expect(page.getByText('Estrutura')).toBeVisible();
  });
});
