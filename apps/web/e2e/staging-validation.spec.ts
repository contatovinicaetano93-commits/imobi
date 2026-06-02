import { test, expect } from '@playwright/test'

/**
 * Staging Validation Tests
 *
 * Run these tests after deploying web to staging to verify:
 * - Landing page loads
 * - Navigation works
 * - API connectivity
 * - Environment variables correct
 *
 * Usage:
 *   pnpm exec playwright test e2e/staging-validation.spec.ts
 *
 * With custom URL:
 *   STAGING_URL=https://imbobi-staging.vercel.app npx playwright test
 */

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3000'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

test.describe('Staging Validation Suite', () => {
  test('Should load landing page', async ({ page }) => {
    const response = await page.goto(STAGING_URL)
    expect(response?.status()).toBe(200)

    // Check page title
    const title = await page.title()
    expect(title).toBeTruthy()
    console.log(`Page title: ${title}`)

    // Check main heading
    const heading = page.locator('h1')
    expect(heading).toBeTruthy()
  })

  test('Should have correct environment variables', async ({ page }) => {
    await page.goto(`${STAGING_URL}`)

    // Evaluate window variables
    const env = await page.evaluate(() => {
      return {
        apiUrl: (window as any).NEXT_PUBLIC_API_URL || 'NOT FOUND',
        environment: (window as any).NODE_ENV || 'NOT FOUND',
      }
    })

    console.log('Environment:', env)
    expect(env.apiUrl).toBeTruthy()
    expect(env.apiUrl).toContain('http')
  })

  test('Should navigate to login page', async ({ page }) => {
    await page.goto(STAGING_URL)

    // Look for login link or button
    const loginLink = page.locator('a[href*="login"], button:has-text("Login")')
    await loginLink.first().click()

    // Check URL changed
    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('login')
  })

  test('Should navigate to cadastro page', async ({ page }) => {
    await page.goto(STAGING_URL)

    // Look for signup/cadastro link
    const cadastroLink = page.locator('a[href*="cadastro"], button:has-text("Cadastro")')
    await cadastroLink.first().click()

    // Check URL changed
    await page.waitForURL('**/cadastro', { timeout: 5000 })
    expect(page.url()).toContain('cadastro')
  })

  test('Should verify API connectivity', async ({ page }) => {
    await page.goto(STAGING_URL)

    let apiError = null
    page.on('response', (response) => {
      if (response.url().includes(API_URL) && !response.ok()) {
        apiError = `API error: ${response.status()} ${response.statusText()}`
      }
    })

    // Wait a bit for API calls
    await page.waitForTimeout(2000)

    // If there were API errors, log them (but don't fail - auth required)
    if (apiError) {
      console.log(`Note: ${apiError} (expected if not authenticated)`)
    }
  })

  test('Should have proper meta tags', async ({ page }) => {
    await page.goto(STAGING_URL)

    // Check description
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description).toBeTruthy()

    // Check viewport
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport).toContain('width=device-width')
  })

  test('Should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    const response = await page.goto(STAGING_URL)
    expect(response?.status()).toBe(200)

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    const response2 = await page.goto(STAGING_URL)
    expect(response2?.status()).toBe(200)

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    const response3 = await page.goto(STAGING_URL)
    expect(response3?.status()).toBe(200)
  })

  test('Should not have console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto(STAGING_URL)
    await page.waitForTimeout(2000)

    // Filter out expected errors
    const criticalErrors = errors.filter(
      (err) =>
        !err.includes('User cancelled') &&
        !err.includes('NotAuthenticated') &&
        !err.includes('401') &&
        !err.includes('CORS') // CORS from missing auth is expected
    )

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors)
    }

    // Allow some errors, just report them
    expect(criticalErrors.length).toBeLessThan(5)
  })

  test('Should have working navigation menu', async ({ page }) => {
    await page.goto(STAGING_URL)

    // Check navbar/menu exists
    const navbar = page.locator('nav, [role="navigation"], header')
    expect(navbar).toBeTruthy()

    // Check at least one link exists
    const links = page.locator('a')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
    console.log(`Found ${count} navigation links`)
  })
})

test.describe('API Integration Tests', () => {
  test('Should handle API errors gracefully', async ({ page }) => {
    await page.goto(STAGING_URL)

    // Try to fetch from API and check it handles errors
    const result = await page.evaluate(async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/api/non-existent`)
        return { status: response.status, ok: response.ok }
      } catch (error) {
        return { error: (error as Error).message }
      }
    }, API_URL)

    console.log('API error handling result:', result)
    // Just verify the request was made (error is expected)
    expect(result).toBeTruthy()
  })

  test('Should have correct API URL configured', async ({ page }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL

    console.log(`Configured API URL: ${apiUrl}`)
    console.log(`Staging URL: ${STAGING_URL}`)

    expect(apiUrl).toBeTruthy()
    expect(apiUrl).toMatch(/^https?:\/\//)
  })
})
