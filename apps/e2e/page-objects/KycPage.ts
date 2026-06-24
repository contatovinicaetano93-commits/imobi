import type { Page } from '@playwright/test';

export class KycPage {
  readonly heading = this.page.getByRole('heading', { name: /Verificação de [Ii]dentidade/i });
  readonly progressSection = this.page.getByText('Progresso', { exact: true }).first();
  readonly documentosSection = this.page.getByRole('heading', { name: 'Documentos obrigatórios' });
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
