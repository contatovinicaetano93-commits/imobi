import type { Page } from '@playwright/test';

export class VistoriaPage {
  readonly aguardandoBadge = this.page.getByText('Aguardando vistoria');
  readonly parecerTextarea = this.page.getByPlaceholder('Observações (opcional)...');
  readonly aprovarBtn = this.page.getByRole('button', { name: /Aprovar etapa/ });
  readonly rejeitarBtn = this.page.getByRole('button', { name: /Rejeitar/ });
  readonly erroMsg = this.page.locator('p.text-red-600');
  readonly breadcrumbObras = this.page.getByRole('link', { name: 'Obras', exact: true });

  constructor(private page: Page) {}

  async goto(obraId: string, etapaId: string) {
    const path = `/dashboard/obras/${obraId}/vistoria/${etapaId}`;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const jornadaReady = this.page.waitForResponse(
        (r) => r.url().includes('/api/proxy/jornada') && r.ok(),
        { timeout: 30_000 },
      );
      await this.page.goto(path, { waitUntil: 'domcontentloaded' });
      await jornadaReady.catch(() => undefined);
      if (this.page.url().includes('/vistoria/')) break;
      await this.page.waitForTimeout(1_500);
    }
    await this.aguardandoBadge.waitFor({ timeout: 60_000 });
  }

  async aprovar(observacao?: string) {
    if (observacao) await this.parecerTextarea.fill(observacao);
    await this.aprovarBtn.click();
  }

  async rejeitar(observacao?: string) {
    if (observacao) await this.parecerTextarea.fill(observacao);
    await this.rejeitarBtn.click();
  }

  getEvidenciasHeading() {
    return this.page.locator('h2').filter({ hasText: /Evidências/ });
  }

  getLiberacaoText() {
    return this.page.getByText('Liberação ao aprovar');
  }
}
