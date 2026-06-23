import type { Page } from '@playwright/test';

export class LoginPage {
  readonly email = this.page.locator('input[type="email"]');
  readonly senha = this.page.locator('input[type="password"]');
  readonly submitBtn = this.page.getByRole('button', {
    name: /Login na plataforma|Entrando/i,
  });
  readonly errorMsg = this.page.locator('p').filter({
    hasText: /inválid|erro|não foi possível|acordando|inesperado/i,
  });
  readonly cadastroLink = this.page.getByRole('link', { name: /Criar conta|Cadastre-se/i });
  readonly brand = this.page.getByText('IMOBI', { exact: true });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'load', timeout: 300_000 });
    await this.brand.waitFor({ timeout: 300_000 });
    await this.email.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.senha.fill(password);
    await this.submitBtn.click();
  }

  async expectError(text: string) {
    await this.errorMsg.waitFor({ timeout: 15_000 });
    await this.errorMsg.filter({ hasText: text }).waitFor({ timeout: 15_000 });
  }
}
