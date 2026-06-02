import { test, expect, Page, APIRequestContext, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.PLAYWRIGHT_TEST_API_URL || 'http://localhost:4000';

test.describe('Auth Flow E2E', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto(`${BASE_URL}/`);
  });

  test('should complete sign up flow', async ({ page, request }: { page: Page; request: APIRequestContext }) => {
    // Step 1: Navigate to signup
    await page.click('text=Criar conta');
    await page.waitForURL('**/cadastro');

    // Step 2: Fill registration form
    const email = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="confirmPassword"]', password);

    // Accept terms
    await page.check('input[type="checkbox"]');

    // Submit form
    await page.click('button:has-text("Criar conta")');

    // Should redirect to login or email verification
    await expect(page).toHaveURL(/(login|verificar-email)/);
  });

  test('should complete login flow', async ({ page, context }: { page: Page; context: BrowserContext }) => {
    // Pre-registered test user
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Navigate to login
    await page.click('text=Entrar');
    await page.waitForURL('**/login');

    // Fill login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit
    await page.click('button:has-text("Entrar")');

    // Should redirect to dashboard
    await expect(page).toHaveURL('**/dashboard');

    // Verify auth token is set
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'token' || c.name === 'auth');
    expect(authCookie).toBeTruthy();
  });

  test('should access simulator after login', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to simulator
    await page.click('text=Simulador');
    await page.waitForURL('**/simulador');

    // Verify simulator is loaded
    await expect(page).toHaveURL('**/simulador');
    await expect(page.locator('text=Simulador de Crédito')).toBeVisible();

    // Test simulator calculation
    await page.fill('input[name="valor"]', '50000');
    await page.fill('input[name="prazo"]', '24');

    // Trigger calculation
    await page.click('button:has-text("Calcular")');

    // Verify result is displayed
    const resultLocator = page.locator('[data-testid="resultado-simulacao"]');
    await expect(resultLocator).toBeVisible();
  });

  test('should logout', async ({ page, context }: { page: Page; context: BrowserContext }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Open user menu
    await page.click('[data-testid="user-menu"]');

    // Click logout
    await page.click('text=Sair');

    // Should redirect to home/login
    await expect(page).toHaveURL(new RegExp(`(${BASE_URL}/?|login)`));

    // Auth cookie should be cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'token' || c.name === 'auth');
    expect(authCookie).toBeFalsy();
  });

  test('should handle API errors gracefully', async ({ page }: { page: Page }) => {
    // Try login with invalid credentials
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Entrar")');

    // Should show error message
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/credenciais inválidas|usuário não encontrado|erro de autenticação/i);

    // Should not redirect away from login page
    await expect(page).toHaveURL('**/login');
  });

  test('should verify API health check', async ({ request }: { request: APIRequestContext }) => {
    // Test API health endpoint
    const response = await request.get(`${API_URL}/api/v1/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status');
  });
});

test.describe('Session Management E2E', () => {
  test('should maintain session across navigation', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to different pages
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Should still be authenticated (no redirect to login)
    const url = page.url();
    expect(url).toContain('/obras');
    expect(url).not.toContain('/login');

    // Navigate back to dashboard
    await page.click('text=Dashboard');
    await page.waitForURL('**/dashboard');

    // Should still be authenticated
    const url2 = page.url();
    expect(url2).toContain('/dashboard');
    expect(url2).not.toContain('/login');
  });
});
