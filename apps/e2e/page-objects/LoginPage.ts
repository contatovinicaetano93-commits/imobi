import type { Page } from '@playwright/test';

export class LoginPage {
  readonly email = this.page.locator('input[type="email"]');
  readonly senha = this.page.locator('input[type="password"]');
  readonly submitBtn = this.page.getByRole('button', { name: /Entrar/ });
  readonly errorMsg = this.page.locator('p.text-red-600');
  readonly cadastroLink = this.page.getByRole('link', { name: 'Cadastre-se' });
  readonly brand = this.page.getByRole('heading', { name: 'imbobi' });

  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded' });
    await this.brand.waitFor({ timeout: 300_000 });
    await this.email.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.senha.fill(password);
    await this.submitBtn.click();
  }

  async expectError(text: string) {
    await this.errorMsg.waitFor();
    await this.errorMsg.filter({ hasText: text }).waitFor();
  }
}
