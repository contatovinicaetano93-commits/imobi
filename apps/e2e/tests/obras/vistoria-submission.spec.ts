import { test, expect } from '@playwright/test';
import { GESTOR, TOMADOR } from '../../fixtures/auth.fixture';
import { VistoriaPage } from '../../page-objects/VistoriaPage';
import { loginViaApi, findEtapaWithStatus, readAccessTokenFromStorage } from '../../fixtures/api-helpers';
import { mockJornada, MOCK_JORNADA_GESTOR_OBRAS } from '../../fixtures/jornada.fixture';

test.use({ storageState: GESTOR.storageState });

async function getVistoriaIds(): Promise<{ obraId: string; etapaId: string } | null> {
  try {
    const token =
      readAccessTokenFromStorage(TOMADOR.storageState) ??
      (await loginViaApi(TOMADOR.email, TOMADOR.password));
    const result = await findEtapaWithStatus('AGUARDANDO_VISTORIA', token);
    if (!result) return null;
    const { obra, etapa } = result;
    return {
      obraId: (obra as { obraId?: string; id?: string }).obraId ?? (obra as { id?: string }).id ?? '',
      etapaId: (etapa as { etapaId?: string; id?: string }).etapaId ?? (etapa as { id?: string }).id ?? '',
    };
  } catch {
    return null;
  }
}

function fakeObra(obraId: string, etapaId: string) {
  return {
    id: obraId,
    obraId,
    nome: 'Residencial Gralha Azul — Torre A',
    status: 'EM_EXECUCAO',
    geoLatitude: -23.5897,
    geoLongitude: -46.6342,
    raioValidacaoMetros: 80,
    etapas: [
      {
        id: etapaId,
        etapaId,
        nome: 'Estrutura',
        ordem: 2,
        percentualObra: 28,
        valorLiberacao: 238000,
        status: 'AGUARDANDO_VISTORIA',
      },
    ],
  };
}

async function mockObraAndEvidencias(page: import('@playwright/test').Page, obraId: string, etapaId: string) {
  const obraPayload = fakeObra(obraId, etapaId);

  await page.route('**/api/proxy/obras/**', async (route) => {
    const url = route.request().url();
    if (!url.includes(obraId)) {
      await route.continue();
      return;
    }
    if (url.includes('/progresso')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '12' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(obraPayload),
    });
  });

  await page.route(`**/api/proxy/evidencias/${etapaId}**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/proxy/documentos/obra/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

test.describe('Vistoria submission', () => {
  let sharedIds: { obraId: string; etapaId: string } | null = null;

  test.beforeAll(async () => {
    sharedIds = await getVistoriaIds();
  });

  test.beforeEach(async ({ page }) => {
    if (sharedIds) {
      const { obraId, etapaId } = sharedIds;
      await mockJornada(page, {
        ...MOCK_JORNADA_GESTOR_OBRAS,
        href: `/dashboard/obras/${obraId}/vistoria/${etapaId}`,
      });
      await mockObraAndEvidencias(page, obraId, etapaId);
    } else {
      await mockJornada(page, MOCK_JORNADA_GESTOR_OBRAS);
    }
  });

  test('vistoria page renders correctly', async ({ page }) => {
    if (!sharedIds) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = sharedIds;

    const vp = new VistoriaPage(page);
    await vp.goto(obraId, etapaId);

    await expect(vp.aguardandoBadge).toBeVisible();
    await expect(vp.getLiberacaoText()).toBeVisible();
    await expect(vp.getEvidenciasHeading()).toBeVisible();
    await expect(vp.parecerTextarea).toBeVisible();
    await expect(vp.aprovarBtn).toBeVisible();
    await expect(vp.rejeitarBtn).toBeVisible();
  });

  test('breadcrumb shows Obras link', async ({ page }) => {
    if (!sharedIds) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = sharedIds;

    const vp = new VistoriaPage(page);
    await vp.goto(obraId, etapaId);

    await expect(vp.breadcrumbObras).toBeVisible();
    await expect(vp.breadcrumbObras).toHaveAttribute('href', '/dashboard/obras');
  });

  test('aprovar etapa redirects to obra detail', async ({ page }) => {
    if (!sharedIds) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = sharedIds;

    await page.route(`**/api/etapas/${etapaId}/validar`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    );

    const vp = new VistoriaPage(page);
    await vp.goto(obraId, etapaId);
    await vp.aprovar('Aprovado em teste automatizado');

    await page.waitForURL(`**/dashboard/obras/${obraId}`, { timeout: 15_000 });
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole('button', { name: 'Visão Geral' })).toBeVisible();
  });

  test('rejeitar etapa shows button and allows rejection', async ({ page }) => {
    if (!sharedIds) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = sharedIds;

    await page.route(`**/api/etapas/${etapaId}/validar`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    );

    const vp = new VistoriaPage(page);
    await vp.goto(obraId, etapaId);
    await expect(vp.rejeitarBtn).toBeVisible();
    await vp.rejeitar('Documentação insuficiente — teste');

    await page.waitForURL(`**/dashboard/obras/${obraId}`, { timeout: 15_000 });
  });
});
