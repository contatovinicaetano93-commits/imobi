import type { Page } from '@playwright/test';

export class GestorPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/gestor', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await this.pageHeading().waitFor({ timeout: 90_000 });
  }

  pageHeading() {
    return this.page.getByRole('heading', { name: /Operação em tempo real/i });
  }

  continueButton() {
    return this.page.getByRole('link', { name: /Continuar/i });
  }
}
