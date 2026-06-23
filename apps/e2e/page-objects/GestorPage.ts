import type { Page } from '@playwright/test';

export class GestorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/gestor', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await this.page.getByLabel('Próximo passo').waitFor({ timeout: 90_000 });
  }

  nextStepHeading() {
    return this.page.getByLabel('Próximo passo').getByRole('heading').first();
  }

  continueButton() {
    return this.page.getByRole('link', { name: /Continuar/i });
  }
}
