import type { Page } from '@playwright/test';

export class KycPage {
  readonly heading = this.page.getByRole('heading', { name: 'Verificação de Identidade' });
  readonly progressSection = this.page.getByRole('heading', { name: 'Progresso' });
  readonly documentosSection = this.page.getByRole('heading', { name: 'Documentos' });
  readonly enviarBtn = this.page.getByRole('button', { name: /^Enviar$/ });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/kyc', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await this.progressSection.waitFor({ timeout: 90_000 });
  }

  getStatCard(label: string) {
    return this.page.locator('div').filter({ hasText: label }).first();
  }
}
