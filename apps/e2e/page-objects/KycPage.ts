import type { Page } from '@playwright/test';

export class KycPage {
  readonly heading = this.page.getByRole('heading', { name: 'Verificação de Identidade (KYC)' });
  readonly enviarRgBtn = this.page.getByRole('button', { name: /Enviar RG/ });
  readonly enviarSelfieBtn = this.page.getByRole('button', { name: /Enviar Selfie/ });
  readonly documentosSection = this.page.getByRole('heading', { name: 'Documentos Enviados' });
  readonly uploadSection = this.page.getByRole('heading', { name: 'Enviar Documentos' });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/kyc');
    // Explicit timeout: KYC page fetches from the API on mount; on first
    // Next.js dev compile the response can be slow, so give it 30s.
    await this.heading.waitFor({ timeout: 60_000 });
  }

  getStatCard(label: string) {
    return this.page.locator('div').filter({ hasText: label }).filter({ hasText: /^\d+$|Pendente|Enviado/ }).first();
  }

  getStatusBadge(status: string) {
    return this.page.locator('span').filter({ hasText: status });
  }
}
