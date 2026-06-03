import type { Page } from '@playwright/test';

export class DashboardPage {
  readonly heading = this.page.getByRole('heading', { name: 'Visão Geral' });
  readonly obrasLink = this.page.getByRole('link', { name: 'Minhas Obras' });
  readonly simuladorLink = this.page.getByRole('link', { name: 'Simulador' });
  readonly kycLink = this.page.getByRole('link', { name: 'KYC' });
  readonly gestorLink = this.page.getByRole('link', { name: 'Painel do Gestor' });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
    await this.heading.waitFor({ timeout: 60_000 });
  }

  getKpiCard(label: string) {
    return this.page.locator('.bg-white').filter({ hasText: label });
  }
}
