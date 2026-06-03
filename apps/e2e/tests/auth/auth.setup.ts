import { test as setup, expect, type Page } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';
import { TOMADOR, GESTOR, ENGENHEIRO } from '../../fixtures/auth.fixture';

const authDir = path.resolve(__dirname, '../../.auth');

async function saveAuthState(page: Page, email: string, password: string, outFile: string) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'imbobi' })).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await page.context().storageState({ path: outFile });
}

setup.beforeAll(async () => {
  await mkdir(authDir, { recursive: true });
});

setup('auth:tomador', async ({ page }) => {
  await saveAuthState(page, TOMADOR.email, TOMADOR.password, path.join(authDir, 'tomador.json'));
});

setup('auth:gestor', async ({ page }) => {
  await saveAuthState(page, GESTOR.email, GESTOR.password, path.join(authDir, 'gestor.json'));
});

setup('auth:engenheiro', async ({ page }) => {
  await saveAuthState(page, ENGENHEIRO.email, ENGENHEIRO.password, path.join(authDir, 'engenheiro.json'));
});
