import type { Page } from '@playwright/test';

export class GestorPage {
  readonly heading = this.page.getByRole('heading', { name: 'Painel do Gestor' });
  readonly revirarEtapasLink = this.page.getByRole('link', { name: /Revisar Etapas/ });
  readonly revisarKycLink = this.page.getByRole('link', { name: /Revisar KYC/ });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/gestor');
    await this.heading.waitFor();
  }

  getStatCard(label: string) {
    return this.page.locator('[aria-label]').filter({ hasText: label });
  }
}
