import type { Page } from '@playwright/test';

export class GestorPage {
  readonly heading = this.page.getByRole('heading', { name: 'Painel do Gestor' });
  readonly revirarEtapasLink = this.page.getByRole('link', { name: /Revisar Etapas/ });
  readonly revisarKycLink = this.page.getByRole('link', { name: /Revisar KYC/ });
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/gestor');
    // Wait for heading (present in all states: loading, error, success).
    await this.heading.waitFor({ timeout: 60_000 });
    // Allow React to hydrate so loading text actually enters the DOM.
    // Then wait for it to disappear (API call complete).
    // Uses waitForFunction to avoid the race where hydration hasn't run yet.
    await this.page.waitForFunction(
      () => !document.body.textContent?.includes('Carregando...'),
      undefined,
      { timeout: 60_000 }
    );
  }

  getStatCard(label: string) {
    return this.page.locator('[aria-label]').filter({ hasText: label });
  }
}
