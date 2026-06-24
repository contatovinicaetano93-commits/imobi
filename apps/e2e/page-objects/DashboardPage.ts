import type { Page } from '@playwright/test';

/** Page object — painel construtor (MVP jornada, erro ou painel completo). */
export class DashboardPage {
  /** NextStepHero / JornadaHeroStrip — section, não o link do wizard KYC */
  readonly hero = this.page.getByRole('region', { name: 'Próximo passo' });
  readonly jornadaError = this.page.getByText('Conexão com o servidor');
  readonly fullPanel = this.page.locator('#panel-content-operacao-ativa');
  /** Tomador no passo KYC (staging real) — GuidedFlowShell */
  readonly kycGuided = this.page.getByRole('heading', { name: /Verificação de identidade/i });
  readonly guidedJourney = this.page.getByRole('navigation', { name: 'Etapas da jornada' });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/construtor', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await this.hero
      .or(this.jornadaError)
      .or(this.fullPanel)
      .or(this.kycGuided)
      .or(this.guidedJourney)
      .first()
      .waitFor({ timeout: 90_000 });
  }

  nextStepHeading() {
    return this.hero.getByRole('heading').first();
  }

  continueButton() {
    return this.page.getByRole('link', { name: /Continuar|Ver extrato/i });
  }
}
