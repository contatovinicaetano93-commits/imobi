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
    await this.page.goto('/login');
    await this.brand.waitFor({ timeout: 180_000 });
    // Wait for React root hydration. __reactContainer$ is set on the mount
    // point by ReactDOM.createRoot() — more stable than __reactFiber$ on inputs
    // because it's tied to the root mount, not an individual element.
    await this.page.waitForFunction(
      () => {
        for (const el of [document.getElementById('__next'), document.body, document.documentElement]) {
          if (el && Object.keys(el).some(k => k.startsWith('__reactContainer$'))) return true;
        }
        return false;
      },
      undefined,
      { timeout: 60_000 }
    );
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
