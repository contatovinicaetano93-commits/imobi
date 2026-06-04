import type { Page, Locator } from '@playwright/test';

export class ObraDetailPage {
  readonly cronogramaHeading = this.page.getByRole('heading', { name: 'Cronograma de Etapas' });
  readonly vistorarButtons = this.page.getByRole('link', { name: 'Vistorar' });

  constructor(private page: Page) {}

  async goto(obraId: string) {
    await this.page.goto(`/dashboard/obras/${obraId}`);
    // Server component fetches obra data from NestJS; allow extra time for
    // first Next.js dev compilation and API round-trip.
    await this.cronogramaHeading.waitFor({ timeout: 90_000 });
  }

  getEtapaRows(): Locator {
    return this.page.locator('.bg-white.rounded-2xl.border').filter({ hasText: /PENDENTE|EM PROGRESSO|APROVADA|AGUARDANDO VISTORIA|REJEITADA/ });
  }

  async getObraNome(): Promise<string> {
    return this.page.locator('h1').first().innerText();
  }
}
