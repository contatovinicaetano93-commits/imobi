import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../page-objects/DashboardPage';

test.describe('Tomador dashboard (MVP)', () => {
  test.use({ storageState: TOMADOR.storageState });

  test('shows construtor painel (hero, erro ou painel completo)', async ({ page }) => {
    const dp = new DashboardPage(page);
    await dp.goto();

    if (await dp.hero.isVisible()) {
      await expect(dp.nextStepHeading()).toBeVisible();
      await expect(dp.hero).toContainText(/próximo passo|etapas/i);
    } else if (await dp.jornadaError.isVisible()) {
      await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
    } else {
      await expect(dp.fullPanel).toBeVisible();
      await expect(page.getByText('Cronograma de Pagamentos')).toBeVisible();
    }
  });
});
