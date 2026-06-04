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
    this.page.setDefaultNavigationTimeout(180_000);
    await this.page.goto('/login');
    await this.brand.waitFor({ timeout: 180_000 });
    // React hydration: RSC payload + JS events not attached until networkidle
    await this.page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
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
