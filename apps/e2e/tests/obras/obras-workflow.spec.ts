import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { ObraDetailPage } from '../../page-objects/ObraDetailPage';
import { loginViaApi, getObras } from '../../fixtures/api-helpers';

test.use({ storageState: TOMADOR.storageState });

test.describe('Obras workflow', () => {
  test('obras list page loads', async ({ page }) => {
    await page.goto('/dashboard/obras');
    // The page renders (either list or empty state)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking an obra navigates to detail page with cronograma', async ({ page }) => {
    // Get first obra via API to ensure we have an ID
    let token: string;
    try { token = await loginViaApi(TOMADOR.email, TOMADOR.password); }
    catch { test.skip(true, 'API unavailable'); return; }
    const obras = await getObras(token);

    if (obras.length === 0) {
      test.skip(true, 'No obras in seed data for this user');
      return;
    }

    const obra = obras[0];
    const dp = new ObraDetailPage(page);
    await dp.goto(obra.id);

    // h1 is the obra name
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
    const dp = new ObraDetailPage(page);
    await dp.goto(obra.id);

    // At least one status badge should be visible
    const badges = page.locator('span.text-xs.font-semibold.px-3.py-1\\.5.rounded-full');
    await expect(badges.first()).toBeVisible();
  });

  test('etapa with AGUARDANDO_VISTORIA shows Vistorar button', async ({ page }) => {
    let token: string;
    try { token = await loginViaApi(TOMADOR.email, TOMADOR.password); }
    catch { test.skip(true, 'API unavailable'); return; }
    const obras = await getObras(token);

    const obraComVistoria = obras.find((o) =>
      o.etapas?.some((e) => e.status === 'AGUARDANDO_VISTORIA')
    );

    if (!obraComVistoria) {
      test.skip(true, 'No etapa in AGUARDANDO_VISTORIA state in seed data');
      return;
    }

    const dp = new ObraDetailPage(page);
    await dp.goto(obraComVistoria.id);
    await expect(dp.vistorarButtons.first()).toBeVisible();
  });

  test('Vistorar button navigates to vistoria page', async ({ page }) => {
    let token: string;
    try { token = await loginViaApi(TOMADOR.email, TOMADOR.password); }
    catch { test.skip(true, 'API unavailable'); return; }
    const obras = await getObras(token);

    const obraComVistoria = obras.find((o) =>
      o.etapas?.some((e) => e.status === 'AGUARDANDO_VISTORIA')
    );

    if (!obraComVistoria) {
      test.skip(true, 'No etapa in AGUARDANDO_VISTORIA state in seed data');
      return;
    }

    const dp = new ObraDetailPage(page);
    await dp.goto(obraComVistoria.id);
    await dp.vistorarButtons.first().click();
    await page.waitForURL('**/vistoria/**');
    await expect(page.getByText('Aguardando vistoria')).toBeVisible();
  });
});
