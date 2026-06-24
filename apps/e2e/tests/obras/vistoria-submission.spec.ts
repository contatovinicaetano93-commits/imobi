import { test, expect } from '@playwright/test';
import { GESTOR, TOMADOR } from '../../fixtures/auth.fixture';
import { VistoriaPage } from '../../page-objects/VistoriaPage';
import { loginViaApi, findEtapaWithStatus, readAccessTokenFromStorage } from '../../fixtures/api-helpers';
import { mockJornada, MOCK_JORNADA_GESTOR_OBRAS } from '../../fixtures/jornada.fixture';
import { STAGING_OBRA_VISTORIA } from '../../fixtures/staging-seed.fixture';

test.use({ storageState: GESTOR.storageState });

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getVistoriaIds(): Promise<{ obraId: string; etapaId: string }> {
  const fallback = {
    obraId: STAGING_OBRA_VISTORIA.obraId,
    etapaId: STAGING_OBRA_VISTORIA.etapaId,
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const token = readAccessTokenFromStorage(TOMADOR.storageState);
      if (!token && attempt < 4) {
        await sleep(2_000 * attempt);
        continue;
      }
      const accessToken =
        token ?? (await loginViaApi(TOMADOR.email, TOMADOR.password));
      const result = await findEtapaWithStatus('AGUARDANDO_VISTORIA', accessToken);
      if (result) {
        const { obra, etapa } = result;
        const obraId =
          (obra as { obraId?: string; id?: string }).obraId ??
          (obra as { id?: string }).id ??
          '';
        const etapaId =
          (etapa as { etapaId?: string; id?: string }).etapaId ??
          (etapa as { id?: string }).id ??
          '';
        if (obraId && etapaId) return { obraId, etapaId };
      }
    } catch {
      /* rate limit / cold start — retry ou fallback */
    }
    if (attempt < 4) await sleep(2_000 * attempt);
  }

  return fallback;
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
  let sharedIds: { obraId: string; etapaId: string };

  test.beforeAll(async () => {
    sharedIds = await getVistoriaIds();
  });

  test.beforeEach(async ({ page }) => {
    const { obraId, etapaId } = sharedIds;
    await mockJornada(page, {
      ...MOCK_JORNADA_GESTOR_OBRAS,
      href: `/dashboard/obras/${obraId}/vistoria/${etapaId}`,
    });
    await mockObraAndEvidencias(page, obraId, etapaId);
  });

  test('vistoria page renders correctly', async ({ page }) => {
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
    const { obraId, etapaId } = sharedIds;

    const vp = new VistoriaPage(page);
    await vp.goto(obraId, etapaId);

    await expect(vp.breadcrumbObras).toBeVisible();
    await expect(vp.breadcrumbObras).toHaveAttribute('href', '/dashboard/obras');
  });

  test('aprovar etapa redirects to obra detail', async ({ page }) => {
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
