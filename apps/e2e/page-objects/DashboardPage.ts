import type { Page } from '@playwright/test';

export class DashboardPage {
  readonly obrasLink = this.page.getByRole('link', { name: 'Minhas Obras' });
  readonly simuladorLink = this.page.getByRole('link', { name: 'Simulador' });
  readonly documentosLink = this.page.getByRole('link', { name: 'Documentos' });
  readonly gestorLink = this.page.getByRole('link', { name: 'Painel do Gestor' });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/construtor', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await this.page
      .getByText(/Operação ativa|Nenhuma operação ativa/)
      .first()
      .waitFor({ timeout: 90_000 });
  }

  getKpiCard(label: string) {
    return this.page.locator('.bg-white').filter({ hasText: label });
  }
}
