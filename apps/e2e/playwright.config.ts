import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.e2e') });

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 300_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ...(process.env.CI ? [['github'] as [string]] : []),
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    actionTimeout: 15_000,
    navigationTimeout: 180_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      timeout: 300_000,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
      grep: /@cross-browser/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      grep: /@cross-browser/,
    },
  ],
  webServer: process.env.E2E_SKIP_SERVERS
    ? []
    : [
        {
          command: 'pnpm --filter @imbobi/api dev:test',
          url: 'http://localhost:4000/api/v1/health',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
        {
          command: 'pnpm --filter @imbobi/web dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ],
});
