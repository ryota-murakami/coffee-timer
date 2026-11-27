import { test, expect, Page } from '@playwright/test'

/**
 * Visual Regression Tests for Liquid Glass Themes
 *
 * These tests capture screenshots for the Liquid Glass theme variants.
 * Baselines are stored in liquid-glass-visual-regression.spec.ts-snapshots/
 *
 * Coverage: 3 Themes (LiquidGlassLight, LiquidGlassDark, LiquidGlassCoffee) × 3 Breakpoints × 7 States
 *
 * Run: npx playwright test e2e/liquid-glass-visual-regression.spec.ts
 * Update baselines: npx playwright test e2e/liquid-glass-visual-regression.spec.ts --update-snapshots
 */

/** Liquid Glass theme options */
type LiquidGlassTheme =
  'liquid-glass-light' | 'liquid-glass-dark' | 'liquid-glass-coffee'

/**
 * Extracts Liquid Glass theme name from Playwright project name
 * @param projectName - Project name like "Desktop-LiquidGlassLight", etc.
 * @returns Theme name
 */
function getThemeFromProject(projectName: string): LiquidGlassTheme {
  if (projectName.includes('LiquidGlassLight')) return 'liquid-glass-light'
  if (projectName.includes('LiquidGlassDark')) return 'liquid-glass-dark'
  return 'liquid-glass-coffee'
}

/**
 * Sets theme via localStorage before page load
 * @param page - Playwright page object
 * @param theme - Theme to apply
 */
async function setTheme(page: Page, theme: LiquidGlassTheme): Promise<void> {
  await page.addInitScript((t: string) => {
    localStorage.setItem('theme', t)
  }, theme)
}

/**
 * Mocks notification to 'denied' permission for consistent VRT screenshots.
 * This ensures the notification settings UI renders in the same state
 * as when baselines were captured (showing "Notifications blocked" message).
 * @param page - Playwright page object
 */
async function mockNotificationPermission(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Mock Notification.permission to 'denied' to match baseline state
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'denied',
        requestPermission: () => Promise.resolve('denied'),
      },
      writable: true,
      configurable: true,
    })

    // Set notification store state in localStorage to match denied state
    const notificationState = {
      state: {
        permission: 'denied',
        isEnabled: false,
        isServiceWorkerReady: false,
      },
      version: 0,
    }
    localStorage.setItem(
      'notification-storage',
      JSON.stringify(notificationState),
    )
  })
}

test.describe('Liquid Glass Visual Regression Tests', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Only run for LiquidGlass projects
    const isLiquidGlassProject = testInfo.project.name.includes('LiquidGlass')

    if (!isLiquidGlassProject) {
      test.skip()
      return
    }

    const theme = getThemeFromProject(testInfo.project.name)
    await setTheme(page, theme)
    await mockNotificationPermission(page)
  })

  test('home page - initial state', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500) // Wait for animations to settle

    await expect(page).toHaveScreenshot('home-initial.png', { fullPage: true })
  })

  test('home page - timer display component', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const timerDisplay = page.locator('[data-testid="timer-display"]')

    // Fallback to timer container if testid not found
    const timerContainer = timerDisplay.or(page.locator('.timer-container'))
    const target =
      (await timerDisplay.count()) > 0 ? timerDisplay : timerContainer

    await expect(target.first()).toHaveScreenshot('timer-display.png')
  })

  test('settings dialog - open state', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Open settings dialog
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.waitForTimeout(300) // Wait for dialog animation

    await expect(page).toHaveScreenshot('settings-dialog.png', {
      fullPage: true,
    })
  })

  test('settings - sound selector dropdown', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Open settings dialog
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Open sound selector dropdown
    await page.getByRole('combobox', { name: /select sound/i }).click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('sound-selector-open.png', {
      fullPage: true,
    })
  })

  test('settings - theme selector dropdown', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Open settings dialog
    await page.getByRole('button', { name: /settings/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Open theme selector dropdown
    const themeSelector = page.getByTestId('theme-selector')
    await themeSelector.click()
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('theme-selector-open.png', {
      fullPage: true,
    })
  })

  test('timer - paused state', async ({ page }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    // Start and then pause the timer for consistent screenshot
    await page.getByRole('button', { name: /start/i }).click()
    await page.waitForTimeout(500)

    // Pause to capture consistent state (avoids changing timer numbers)
    await page.getByRole('button', { name: /pause/i }).click()
    await page.waitForTimeout(300)

    await expect(page).toHaveScreenshot('timer-paused.png', { fullPage: true })
  })

  test('language - Japanese locale', async ({ page }) => {
    await page.goto('/ja')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await expect(page).toHaveScreenshot('home-japanese.png', { fullPage: true })
  })
})
