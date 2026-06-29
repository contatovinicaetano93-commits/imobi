import { test, expect } from '@playwright/test';
import { TOMADOR } from '../../fixtures/auth.fixture';
import { mockJornada, MOCK_JORNADA_VIABILIDADE } from '../../fixtures/jornada.fixture';

test.use({ storageState: TOMADOR.storageState });

test.describe('Legacy simulador redirect', () => {
  test('redirects /dashboard/simulador to proposta-credito', async ({ page }) => {
    await mockJornada(page, MOCK_JORNADA_VIABILIDADE);
    await page.goto('/dashboard/simulador', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page).toHaveURL(/\/dashboard\/proposta-credito/, { timeout: 60_000 });
  });
});
