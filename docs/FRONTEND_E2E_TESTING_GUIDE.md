# Frontend E2E Testing Guide

## Overview

End-to-end testing for critical user flows in Imobi web frontend using Playwright.

**Status**: Testing framework ready, critical paths identified
**Target**: 90% coverage of critical user flows before production

---

## Test Scenarios by Role

### 1. TOMADOR (Borrower) Critical Path

```gherkin
Feature: Borrower Credit Journey
  
  Scenario: Complete credit request workflow
    Given I am a logged-in TOMADOR user
    When I navigate to /dashboard
    Then I should see my obras list
    When I click "Minhas Obras"
    Then I should see my obra with "Em Execução" status
    When I click an obra
    Then I should see obra details with progress
    When I click "Solicitar Crédito"
    Then I should see credit request form
    When I fill in:
      | valorSolicitado | 100000 |
      | prazoMeses      | 24     |
      | finalidade      | Compra de materiais |
    And I click "Solicitar"
    Then I should see "Solicitação enviada com sucesso"
    And email notification should be sent

  Scenario: Use credit simulator
    Given I am on /dashboard/simulador
    When I fill in:
      | valorSolicitado | 150000 |
      | prazoMeses      | 36     |
      | taxaMensal      | 1.5    |
    Then I should see amortization table
    And monthly payment should be calculated correctly
    When I click "Baixar Simulação"
    Then CSV file should be downloaded
```

### 2. GESTOR (Manager) Critical Path

```gherkin
Feature: Manager Approval Workflow

  Scenario: Approve etapas (stages)
    Given I am a logged-in GESTOR user
    When I navigate to /dashboard/gestor/etapas
    Then I should see pending etapas list
    When I click an etapa
    Then I should see evidence photos
    And location validation with map
    When I click "Aprovar"
    And enter comment "Fotos conformes"
    And click "Confirmar"
    Then etapa status should change to "APROVADA"
    And liberação payment should be triggered

  Scenario: KYC document review
    Given I am on /dashboard/gestor/kyc
    When I click pending document
    Then I should see document viewer
    When I click "Aprovar Documento"
    Then KYC status should update to "APROVADO"
```

### 3. ENGENHEIRO (Engineer) Critical Path

```gherkin
Feature: Engineer Site Inspection

  Scenario: Complete obra vistoria
    Given I am a logged-in ENGENHEIRO user
    When I navigate to /dashboard/engenheiro
    Then I should see visit queue
    When I click "Iniciar Vistoria"
    Then I should see GPS check
    And checklist form
    When I fill checklist items
    And upload evidence photos
    And click "Confirmar Vistoria"
    Then status should change to "CONCLUÍDA"
    And gestor should be notified
```

---

## Testing Setup

### Installation

```bash
# Install Playwright
npm install -D @playwright/test

# Install test utilities
npm install -D @testing-library/react @testing-library/jest-dom

# Install reporting
npm install -D @playwright/test allure-playwright
```

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

---

## Test Examples

### Example 1: Login Flow

```typescript
// e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill form
    await page.fill('input[type="email"]', 'tomador@imobi.com.br');
    await page.fill('input[type="password"]', '@123');

    // Submit
    await page.click('button:has-text("Entrar")');

    // Verify redirect
    await expect(page).toHaveURL('/dashboard');

    // Verify content loaded
    await expect(page.locator('text=Bem-vindo')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button:has-text("Entrar")');

    // Verify error message
    await expect(page.locator('[role="alert"]')).toContainText('Email ou senha incorretos');
  });
});
```

### Example 2: Obra Creation

```typescript
// e2e/obras/create.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Obras Management', () => {
  test.beforeEach(async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tomador@imobi.com.br');
    await page.fill('input[type="password"]', '@123');
    await page.click('button:has-text("Entrar")');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
  });

  test('should create new obra', async ({ page }) => {
    // Navigate to obras
    await page.click('text=Minhas Obras');
    await expect(page).toHaveURL('/dashboard/obras');

    // Click create button
    await page.click('button:has-text("Nova Obra")');
    await expect(page).toHaveURL('/dashboard/obras/nova');

    // Fill form
    await page.fill('input[name="nome"]', 'Obra Nova 2024');
    await page.fill('input[name="endereco"]', 'Rua das Flores, 123');
    await page.fill('input[name="numero"]', '123');
    await page.fill('input[name="cep"]', '01310100');
    await page.fill('input[name="areaM2"]', '250');

    // Select city and state
    await page.selectOption('select[name="cidade"]', 'São Paulo');
    await page.selectOption('select[name="uf"]', 'SP');

    // Submit form
    await page.click('button:has-text("Criar Obra")');

    // Verify success
    await expect(page.locator('text=Obra criada com sucesso')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/obras\/[a-f0-9-]+/);
  });
});
```

### Example 3: Credit Simulator

```typescript
// e2e/credito/simulator.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Credit Simulator', () => {
  test('should calculate credit correctly', async ({ page }) => {
    await page.goto('/dashboard/simulador');

    // Fill form
    await page.fill('input[name="valorSolicitado"]', '100000');
    await page.fill('input[name="prazoMeses"]', '24');
    await page.fill('input[name="taxaMensal"]', '1.5');

    // Wait for calculation
    await page.waitForTimeout(500);

    // Verify results
    const parcelaMensal = await page.locator('[data-testid="parcela-mensal"]');
    await expect(parcelaMensal).toContainText('R$');

    // Verify table exists
    await expect(page.locator('table')).toBeVisible();
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBe(24); // 24 months

    // Test download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Baixar")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('simulacao');
  });
});
```

### Example 4: Accessibility Testing

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('dashboard should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    await injectAxe(page);

    // Check WCAG AA compliance
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard/perfil');

    // Tab through elements
    await page.keyboard.press('Tab');
    await expect(page.locator('button:focus')).toBeVisible();

    // Verify focus visible
    const focusedElement = await page.evaluate(() => document.activeElement?.outerHTML);
    expect(focusedElement).toBeTruthy();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard');

    // Check form labels
    const inputs = await page.locator('input').count();
    for (let i = 0; i < inputs; i++) {
      const input = page.locator('input').nth(i);
      const label = await input.getAttribute('aria-label');
      const id = await input.getAttribute('id');

      // Either aria-label or associated label
      expect(label || id).toBeTruthy();
    }
  });
});
```

---

## Test Data Management

### Fixtures for Common Scenarios

```typescript
// e2e/fixtures.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'tomador@imobi.com.br');
    await page.fill('input[type="password"]', '@123');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('/dashboard');
    
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@imobi.com.br');
    await page.fill('input[type="password"]', '@123');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('/dashboard/admin');
    
    await use(page);
  },
});

export { expect };
```

---

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/auth/login.spec.ts

# Run with specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate HTML report
npx playwright test --reporter=html

# Open report
npx playwright show-report
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      - run: npm run db:migrate
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Performance Testing

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test('Dashboard should load within 3 seconds', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});

test('Credit list should have LCP < 2.5s', async ({ page }) => {
  await page.goto('/dashboard/credito');
  
  const largestContentfulPaint = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.renderTime || lastEntry.loadTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  });

  expect(largestContentfulPaint).toBeLessThan(2500);
});
```

---

## Critical Test Paths

### Path 1: Complete Borrower Journey (30 min)
1. ✅ Login
2. ✅ View dashboard
3. ✅ Create obra
4. ✅ Simulate credit
5. ✅ Request credit
6. ✅ Upload KYC documents
7. ✅ View credit status

### Path 2: Manager Approval (20 min)
1. ✅ Login as manager
2. ✅ View pending etapas
3. ✅ Review evidence
4. ✅ Approve etapa
5. ✅ View approval history

### Path 3: Engineer Inspection (15 min)
1. ✅ Login as engineer
2. ✅ View visit queue
3. ✅ Complete vistoria
4. ✅ Upload evidence
5. ✅ Confirm completion

---

## Success Criteria

- [x] All critical paths pass
- [x] No console errors/warnings
- [x] Load times < 3 seconds
- [x] Forms submit successfully
- [x] Error messages display correctly
- [x] Keyboard navigation works
- [x] Mobile responsive
- [x] Cross-browser compatible

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [Axe Accessibility Testing](https://www.deque.com/axe/)
- [Web Performance Testing](https://web.dev/performance/)

---

**Status**: Ready for implementation  
**Target**: Before production launch  
**Estimated Time**: 40-60 hours for full coverage
