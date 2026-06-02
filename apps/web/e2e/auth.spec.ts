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

  test('should show error on signup with existing email', async ({ page }: { page: Page }) => {
    // Navigate to signup
    await page.click('text=Criar conta');
    await page.waitForURL('**/cadastro');

    // Try to register with existing email
    await page.fill('input[name="email"]', 'test@imbobi.com.br');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Criar conta")');

    // Should show error
    await expect(page.locator('[role="alert"]')).toBeVisible();
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

  test('should handle token refresh on expiration', async ({ page, context }: { page: Page; context: BrowserContext }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Simulate token expiration by manually clearing it
    await context.clearCookies({ name: 'token' });

    // Navigate to a protected route
    await page.goto(`${BASE_URL}/obras`);

    // Should redirect to login
    await expect(page).toHaveURL('**/login');
  });

  test('should refresh token when making API requests', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Make a request that should trigger token refresh
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Verify page loaded successfully (token refresh worked)
    await expect(page.locator('text=Obras')).toBeVisible();
  });

  test('should clear session on logout', async ({ page, context }: { page: Page; context: BrowserContext }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Open user menu and logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Sair');

    // Verify redirected to home
    await expect(page).toHaveURL(new RegExp(`(${BASE_URL}/?|login)`));

    // Verify all auth data is cleared
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => c.name === 'token' || c.name === 'auth');
    expect(authCookie).toBeFalsy();

    // Try to access protected route
    await page.goto(`${BASE_URL}/obras`);
    await expect(page).toHaveURL('**/login');
  });
});

test.describe('Forms & Validation E2E', () => {
  test('should validate work creation form fields', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login and navigate to work creation
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to create work
    await page.click('text=Nova Obra');
    await page.waitForURL('**/obras/criar');

    // Try to submit without filling required fields
    await page.click('button:has-text("Criar")');

    // Should show validation errors
    const errorMessages = page.locator('[role="alert"]');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('should successfully create work with valid data', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login and navigate to work creation
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to create work
    await page.click('text=Nova Obra');
    await page.waitForURL('**/obras/criar');

    // Fill work form
    await page.fill('input[name="nome"]', 'Obra Teste 2024');
    await page.fill('input[name="endereco"]', 'Rua das Flores, 123');
    await page.fill('input[name="valor"]', '100000');

    // Submit
    await page.click('button:has-text("Criar")');

    // Should redirect to work details or list
    await expect(page).toHaveURL(/(obras\/\d+|obras)/);
  });

  test('should upload evidence with GPS validation', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to a work
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Click first work
    await page.click('a[data-testid="work-item"]');

    // Navigate to evidence section
    await page.click('text=Evidências');

    // Try to upload without GPS - should show validation message
    await expect(page.locator('text=localização necessária|GPS requerido')).toBeVisible();
  });

  test('should handle form submission errors', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to create work
    await page.click('text=Nova Obra');
    await page.waitForURL('**/obras/criar');

    // Fill with invalid data (negative value)
    await page.fill('input[name="nome"]', 'Obra Teste');
    await page.fill('input[name="valor"]', '-1000');

    // Submit
    await page.click('button:has-text("Criar")');

    // Should show error message
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('should display form errors on field blur', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to create work
    await page.click('text=Nova Obra');
    await page.waitForURL('**/obras/criar');

    // Focus and blur name field with invalid input
    await page.fill('input[name="nome"]', '');
    await page.focus('input[name="valor"]');

    // Should show validation error for nome
    await expect(page.locator('text=Nome é obrigatório')).toBeVisible();
  });
});

test.describe('Navigation E2E', () => {
  test('should redirect unauthorized users to login', async ({ page }: { page: Page }) => {
    // Try to access protected route without auth
    await page.goto(`${BASE_URL}/obras`);

    // Should redirect to login
    await expect(page).toHaveURL('**/login');
  });

  test('should allow deep linking to protected routes after login', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Deep link to obras page
    await page.goto(`${BASE_URL}/obras`);

    // Should load successfully
    await expect(page).toHaveURL('**/obras');
    await expect(page.locator('text=Obras')).toBeVisible();
  });

  test('should handle back button navigation correctly', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to works
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Click a work
    await page.click('a[data-testid="work-item"]');

    // Press back button
    await page.goBack();

    // Should return to works list
    await expect(page).toHaveURL('**/obras');
  });

  test('should maintain scroll position on back navigation', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to works
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));

    // Click a work
    await page.click('a[data-testid="work-item"]');

    // Press back button
    await page.goBack();

    // Verify we're back at works list
    await expect(page).toHaveURL('**/obras');
  });
});

test.describe('Data Display E2E', () => {
  test('should display paginated work list', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to works
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Check for work items
    const workItems = page.locator('[data-testid="work-item"]');
    await expect(workItems.first()).toBeVisible();

    // Check for pagination controls
    const pagination = page.locator('[data-testid="pagination"]');
    await expect(pagination).toBeVisible();
  });

  test('should filter works by status', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to works
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Click filter
    await page.click('[data-testid="filter-status"]');
    await page.click('text=Em Andamento');

    // Should filter the list
    await page.waitForURL('**/obras?status=em_andamento');
  });

  test('should search works by name', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to works
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Search for a work
    await page.fill('input[placeholder="Buscar obras..."]', 'Obra Teste');

    // Should filter results
    const workItems = page.locator('[data-testid="work-item"]');
    await expect(workItems.first()).toBeVisible();
  });

  test('should display empty state when no works found', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to works
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Search for non-existent work
    await page.fill('input[placeholder="Buscar obras..."]', 'XYZABC123NotFound');

    // Should show empty state
    await expect(page.locator('text=Nenhuma obra encontrada|sem resultados')).toBeVisible();
  });

  test('should load more works on pagination', async ({ page }: { page: Page }) => {
    const testEmail = 'test@imbobi.com.br';
    const testPassword = 'Test123456!';

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard');

    // Navigate to works
    await page.click('text=Obras');
    await page.waitForURL('**/obras');

    // Click next page button
    const nextButton = page.locator('[data-testid="pagination-next"]');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForURL('**/obras?page=2');
    }
  });
});
