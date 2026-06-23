import type { Page, Locator } from '@playwright/test';

export class ObraDetailPage {
  readonly etapasTab = this.page.getByRole('button', { name: 'Etapas', exact: true });
  readonly visaoGeralTab = this.page.getByRole('button', { name: 'Visão Geral', exact: true });
  readonly vistorarLinks = this.page.getByRole('link', { name: 'Vistorar' });

  constructor(private page: Page) {}

  async goto(obraId: string) {
    await this.page.goto(`/dashboard/obras/${obraId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await this.page.locator('h1').first().waitFor({ timeout: 90_000 });
    await this.visaoGeralTab.waitFor({ timeout: 30_000 });
  }

  async openEtapasTab() {
    await this.etapasTab.click();
    await this.page
      .getByText(/Fundação|Estrutura|Nenhuma etapa cadastrada/)
      .first()
      .waitFor({ timeout: 30_000 });
  }

  getEtapaRows(): Locator {
    return this.page.locator('div').filter({
      hasText: /Aprovada|Aguardando Vistoria|Em Execução|Pendente|Reprovada|Concluída/i,
    });
  }

  async getObraNome(): Promise<string> {
    return this.page.locator('h1').first().innerText();
  }
}
