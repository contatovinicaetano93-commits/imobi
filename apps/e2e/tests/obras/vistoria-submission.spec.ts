import { test, expect } from '@playwright/test';
import { GESTOR, TOMADOR } from '../../fixtures/auth.fixture';
import { VistoriaPage } from '../../page-objects/VistoriaPage';
import { loginViaApi, findEtapaWithStatus } from '../../fixtures/api-helpers';

// Gestor (ADMIN) reviews vistorias; after NestJS buscar fix, ADMIN can access any obra.
test.use({ storageState: GESTOR.storageState });

// Get a real obra/etapa with AGUARDANDO_VISTORIA from the TOMADOR's obras (seeded data).
async function getVistoriaIds(): Promise<{ obraId: string; etapaId: string } | null> {
  try {
    const token = await loginViaApi(TOMADOR.email, TOMADOR.password);
    const result = await findEtapaWithStatus('AGUARDANDO_VISTORIA', token);
    if (!result) return null;
    const { obra, etapa } = result;
    return {
      obraId: (obra as any).obraId ?? (obra as any).id,
      etapaId: (etapa as any).etapaId ?? (etapa as any).id,
    };
  } catch {
    return null;
  }
}

test.describe('Vistoria submission', () => {
  test('vistoria page renders correctly', async ({ page }) => {
    const ids = await getVistoriaIds();
    if (!ids) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = ids;

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
    const ids = await getVistoriaIds();
    if (!ids) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = ids;

    const vp = new VistoriaPage(page);
    await vp.goto(obraId, etapaId);

    await expect(vp.breadcrumbObras).toBeVisible();
    await expect(vp.breadcrumbObras).toHaveAttribute('href', '/dashboard/obras');
  });

  test('aprovar etapa redirects to obra detail', async ({ page }) => {
    const ids = await getVistoriaIds();
    if (!ids) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = ids;

    // Mock the Next.js API route so we don't actually modify DB state
    await page.route(`**/api/etapas/${etapaId}/validar`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    );

    const vp = new VistoriaPage(page);
    await vp.goto(obraId, etapaId);
    await vp.aprovar('Aprovado em teste automatizado');

    await page.waitForURL(`**/dashboard/obras/${obraId}`, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Cronograma de Etapas' })).toBeVisible({ timeout: 90_000 });
  });

  test('rejeitar etapa shows button and allows rejection', async ({ page }) => {
    const ids = await getVistoriaIds();
    if (!ids) { test.skip(true, 'No AGUARDANDO_VISTORIA etapa in seed data'); return; }
    const { obraId, etapaId } = ids;

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
