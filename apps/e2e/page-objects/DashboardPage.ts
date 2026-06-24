import type { Page } from '@playwright/test';

/** Page object — painel construtor (MVP jornada, erro ou painel completo). */
export class DashboardPage {
  readonly hero = this.page.getByLabel('Próximo passo');
  readonly jornadaError = this.page.getByText('Conexão com o servidor');
  readonly fullPanel = this.page.getByText(/Nenhuma operação ativa|Operação ativa/);

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/construtor', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await this.hero.or(this.jornadaError).or(this.fullPanel).first().waitFor({ timeout: 90_000 });
  }

  nextStepHeading() {
    return this.hero.getByRole('heading').first();
  }

  continueButton() {
    return this.page.getByRole('link', { name: /Continuar|Ver extrato/i });
  }
}
