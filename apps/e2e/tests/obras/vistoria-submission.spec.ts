import { test, expect } from '@playwright/test';
import { GESTOR, TOMADOR } from '../../fixtures/auth.fixture';
import { VistoriaPage } from '../../page-objects/VistoriaPage';
import { loginViaApi, getObras } from '../../fixtures/api-helpers';

test.use({ storageState: GESTOR.storageState });

async function findVistoriaEtapa() {
  // Use tomador token to fetch obras (gestor may see all obras via a different endpoint)
  const token = await loginViaApi(TOMADOR.email, TOMADOR.password);
  const obras = await getObras(token);

  for (const obra of obras) {
    const etapa = obra.etapas?.find((e) => e.status === 'AGUARDANDO_VISTORIA');
    if (etapa) return { obraId: obra.obraId, etapaId: etapa.etapaId };
  }
  return null;
}

test.describe('Vistoria submission', () => {
  test('vistoria page renders correctly', async ({ page }) => {
    const data = await findVistoriaEtapa();
    if (!data) {
      test.skip(true, 'No etapa in AGUARDANDO_VISTORIA state in seed data');
      return;
    }

    const vp = new VistoriaPage(page);
    await vp.goto(data.obraId, data.etapaId);

    await expect(vp.aguardandoBadge).toBeVisible();
    await expect(vp.getLiberacaoText()).toBeVisible();
    await expect(vp.getEvidenciasHeading()).toBeVisible();
    await expect(vp.parecerTextarea).toBeVisible();
    await expect(vp.aprovarBtn).toBeVisible();
    await expect(vp.rejeitarBtn).toBeVisible();
  });

  test('breadcrumb shows Obras link', async ({ page }) => {
    const data = await findVistoriaEtapa();
    if (!data) {
      test.skip(true, 'No etapa in AGUARDANDO_VISTORIA state in seed data');
      return;
    }

    const vp = new VistoriaPage(page);
    await vp.goto(data.obraId, data.etapaId);

    await expect(vp.breadcrumbObras).toBeVisible();
    await expect(vp.breadcrumbObras).toHaveAttribute('href', '/dashboard/obras');
  });

  test('aprovar etapa redirects to obra detail', async ({ page }) => {
    const data = await findVistoriaEtapa();
    if (!data) {
      test.skip(true, 'No etapa in AGUARDANDO_VISTORIA state in seed data');
      return;
    }

    // Mock the approval API so the test is idempotent
    await page.route(`**/api/etapas/${data.etapaId}/validar`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const vp = new VistoriaPage(page);
    await vp.goto(data.obraId, data.etapaId);
    await vp.aprovar('Aprovado em teste automatizado');

    await page.waitForURL(`**/dashboard/obras/${data.obraId}`, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Cronograma de Etapas' })).toBeVisible();
  });

  test('rejeitar etapa shows button and allows rejection', async ({ page }) => {
    const data = await findVistoriaEtapa();
    if (!data) {
      test.skip(true, 'No etapa in AGUARDANDO_VISTORIA state in seed data');
      return;
    }

    // Mock the rejection API
    await page.route(`**/api/etapas/${data.etapaId}/validar`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const vp = new VistoriaPage(page);
    await vp.goto(data.obraId, data.etapaId);
    await expect(vp.rejeitarBtn).toBeVisible();
    await vp.rejeitar('Documentação insuficiente — teste');

    await page.waitForURL(`**/dashboard/obras/${data.obraId}`, { timeout: 15_000 });
  });
});
