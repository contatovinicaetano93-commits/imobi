import { test, expect, type Page } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { ObraDetailPage } from '../../page-objects/ObraDetailPage';
import { loginViaApi, getObras } from '../../fixtures/api-helpers';

test.use({ storageState: TOMADOR.storageState });

// Mock client-side proxy calls so tests don't depend on NestJS /obras/:id
// response time (which can exceed 45 s on cold WSL2 PostgreSQL).
async function mockObraRoutes(page: Page, obraId: string, obraNome: string, obraStatus: string) {
  const etapas = [
    { id: 'etapa-m1', nome: 'Fundação', ordem: 1, percentualObra: 50, valorLiberacao: 50000, status: 'APROVADA', evidencias: [] },
    { id: 'etapa-m2', nome: 'Estrutura', ordem: 2, percentualObra: 50, valorLiberacao: 50000, status: 'AGUARDANDO_VISTORIA', evidencias: [] },
  ];

  await page.route('**/api/proxy/obras/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/progresso')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '50' });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: obraId, nome: obraNome, status: obraStatus,
          geoLatitude: -23.5505, geoLongitude: -46.6333, raioValidacaoMetros: 100, etapas }),
      });
    }
  });
}

test.describe('Obras workflow', () => {
  test('obras list page loads', async ({ page }) => {
    await page.goto('/dashboard/obras', { timeout: 60_000 });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 60_000 });
  });

  test('clicking an obra navigates to detail page with cronograma', async ({ page }) => {
    let token: string;
    try { token = await loginViaApi(TOMADOR.email, TOMADOR.password); }
    catch { test.skip(true, 'API unavailable'); return; }
    const obras = await getObras(token);

    if (obras.length === 0) {
      test.skip(true, 'No obras in seed data for this user');
      return;
    }

    const obra = obras[0];
    const obraId: string = (obra as any).id ?? (obra as any).obraId;
    await mockObraRoutes(page, obraId, obra.nome, obra.status);

    const dp = new ObraDetailPage(page);
    await dp.goto(obraId);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(obra.nome);
    await expect(dp.cronogramaHeading).toBeVisible();
  });

  test('obra detail shows etapas with status badges', async ({ page }) => {
    let token: string;
    try { token = await loginViaApi(TOMADOR.email, TOMADOR.password); }
    catch { test.skip(true, 'API unavailable'); return; }
    const obras = await getObras(token);

    if (obras.length === 0) {
      test.skip(true, 'No obras in seed data for this user');
      return;
    }

    const obra = obras[0];
    const obraId: string = (obra as any).id ?? (obra as any).obraId;
    await mockObraRoutes(page, obraId, obra.nome, obra.status);

    const dp = new ObraDetailPage(page);
    await dp.goto(obraId);

    const badges = page.locator('span.text-xs.font-semibold.px-3.py-1\\.5.rounded-full');
    await expect(badges.first()).toBeVisible();
  });

  test('etapa with AGUARDANDO_VISTORIA shows Vistorar button', async ({ page }) => {
    let token: string;
    try { token = await loginViaApi(TOMADOR.email, TOMADOR.password); }
    catch { test.skip(true, 'API unavailable'); return; }
    const obras = await getObras(token);

    if (obras.length === 0) {
      test.skip(true, 'No obras in seed data for this user');
      return;
    }

    // mockObraRoutes always returns an etapa with AGUARDANDO_VISTORIA status
    const obra = obras[0];
    const obraId: string = (obra as any).id ?? (obra as any).obraId;
    await mockObraRoutes(page, obraId, obra.nome, obra.status);

    const dp = new ObraDetailPage(page);
    await dp.goto(obraId);
    await expect(dp.vistorarButtons.first()).toBeVisible();
  });

  test('Vistorar button navigates to vistoria page', async ({ page }) => {
    let token: string;
    try { token = await loginViaApi(TOMADOR.email, TOMADOR.password); }
    catch { test.skip(true, 'API unavailable'); return; }
    const obras = await getObras(token);

    if (obras.length === 0) {
      test.skip(true, 'No obras in seed data for this user');
      return;
    }

    // mockObraRoutes always returns an etapa with AGUARDANDO_VISTORIA status (etapa-m2)
    const obra = obras[0];
    const obraId: string = (obra as any).id ?? (obra as any).obraId;
    await mockObraRoutes(page, obraId, obra.nome, obra.status);

    // Also mock the vistoria page API so it loads after clicking Vistorar
    await page.route('**/api/proxy/manager/etapas/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          etapaId: 'etapa-m2', nome: 'Estrutura', ordem: 2, percentualObra: 50,
          valorLiberacao: 50000, evidenciasCount: 0, criadoEm: '2025-01-01T00:00:00.000Z',
          status: 'AGUARDANDO_VISTORIA', evidencias: [],
          obra: { obraId, nome: obra.nome, endereco: 'Rua Teste, 123',
            usuario: { usuarioId: 'u1', nome: 'Test', email: 'test@test.com', cpf: '000.000.000-00' } },
        }),
      });
    });
    await page.route('**/api/proxy/evidencias/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    const dp = new ObraDetailPage(page);
    await dp.goto(obraId);
    const href = await dp.vistorarButtons.first().getAttribute('href');
    await page.goto(href!, { timeout: 90_000 });
    await expect(page.getByText('Aguardando vistoria')).toBeVisible({ timeout: 60_000 });
  });
});
