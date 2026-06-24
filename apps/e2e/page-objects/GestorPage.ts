import type { Page } from '@playwright/test';

export class GestorPage {
  readonly hero = this.page.getByRole('region', { name: 'Próximo passo' });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/gestor', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await this.hero.waitFor({ timeout: 90_000 });
  }

  nextStepHeading() {
    return this.hero.getByRole('heading', { level: 1 });
  }

  continueButton() {
    return this.page.getByRole('link', { name: /Continuar/i });
  }
}
