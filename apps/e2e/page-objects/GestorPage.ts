import type { Page } from '@playwright/test';

export class GestorPage {
  readonly heading = this.page.getByRole('heading', { name: 'Painel do Gestor' });
  readonly revirarEtapasLink = this.page.getByRole('link', { name: /Revisar Etapas/ });
  readonly revisarKycLink = this.page.getByRole('link', { name: /Revisar KYC/ });
  /** The "Carregando..." spinner that is visible while the API call is in flight */
  private readonly loadingText = this.page.getByText('Carregando...');

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/gestor');
    // Wait for the heading to appear (present in loading, error and success states).
    await this.heading.waitFor();
    // Then wait for the loading spinner to disappear so that we are no longer
    // in the loading state before making assertions about dynamic content.
    await this.loadingText.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  getStatCard(label: string) {
    return this.page.locator('[aria-label]').filter({ hasText: label });
  }
}
