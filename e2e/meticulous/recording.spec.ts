import { expect, test } from '@playwright/test'
import { MOBILE_VIEWPORT, TIMER_COMPLETION_TIMEOUT_MS } from './constants'
import {
  flushMeticulousRecording,
  openMeticulousRecording,
} from './recording-helpers'

test.describe('Meticulous Coffee Timer journeys', () => {
  test.afterEach(async ({ page }, testInfo) => {
    // Meticulous must receive buffered events before Playwright closes this fresh context.
    await flushMeticulousRecording(page, testInfo)
  })

  test('edits a duration with inputs, steppers, arrow keys, and boundaries', async ({
    page,
  }) => {
    // Arrange
    await openMeticulousRecording(page, '/en')
    const minutesInput = page.getByTestId('time-input-minutes')
    const secondsInput = page.getByTestId('time-input-seconds')
    const timerDisplay = page.getByTestId('timer-display')
    const minutesStepper = minutesInput.locator('..')

    await expect(minutesInput).toHaveValue('05')
    await expect(secondsInput).toHaveValue('00')

    // Act
    await minutesStepper.getByRole('button', { name: /increase/i }).click()
    await expect(minutesInput).toHaveValue('06')
    await minutesStepper.getByRole('button', { name: /decrease/i }).click()
    await minutesInput.fill('25')
    await secondsInput.fill('45')
    await secondsInput.press('ArrowUp')
    await expect(timerDisplay).toContainText('25:46')
    await secondsInput.fill('99')

    // Assert
    await expect(secondsInput).toHaveValue('59')
    await expect(timerDisplay).toContainText('25:59')
  })

  test('starts, pauses, resumes, and resets a timer', async ({ page }) => {
    // Arrange
    await openMeticulousRecording(page, '/en')
    await page.getByTestId('time-input-minutes').fill('0')
    await page.getByTestId('time-input-seconds').fill('15')
    const timerDisplay = page.getByTestId('timer-display')
    const startButton = page.getByTestId('timer-start-button')

    // Act
    await startButton.click()
    await expect(page.getByTestId('timer-pause-button')).toBeVisible()
    await page.getByTestId('timer-pause-button').click()
    await expect(startButton).toBeVisible()
    await startButton.click()
    await expect(page.getByTestId('timer-pause-button')).toBeVisible()
    await page.getByTestId('timer-reset-button').click()

    // Assert
    await expect(timerDisplay).toContainText('00:15')
    await expect(startButton).toBeVisible()
  })

  test('completes a countdown with sound and can restart it', async ({
    page,
  }) => {
    // Arrange
    await openMeticulousRecording(page, '/en')
    await page.getByTestId('time-input-minutes').fill('0')
    await page.getByTestId('time-input-seconds').fill('2')
    const timerDisplay = page.getByTestId('timer-display')
    const soundRequest = page.waitForRequest(
      (request) =>
        request.url().includes('/sounds/') && request.url().endsWith('.mp3'),
      { timeout: TIMER_COMPLETION_TIMEOUT_MS },
    )

    // Act
    await page.getByTestId('timer-start-button').click()

    // Assert
    await soundRequest
    await expect(timerDisplay).toContainText('00:00', {
      timeout: TIMER_COMPLETION_TIMEOUT_MS,
    })
    await page.getByTestId('timer-start-button').click()
    await expect(page.getByTestId('timer-pause-button')).toBeVisible()
    await page.getByTestId('timer-reset-button').click()
    await expect(timerDisplay).toContainText('00:02')
  })

  test('switches through every deterministic theme', async ({ page }) => {
    // Arrange
    await openMeticulousRecording(page, '/en')
    await page.getByRole('button', { name: /open settings/i }).click()
    const themeSelector = page.getByTestId('theme-selector')
    const html = page.locator('html')

    // Act and Assert
    await themeSelector.click()
    await page.getByRole('option', { name: 'Dark', exact: true }).click()
    await expect(html).toHaveAttribute('data-theme', 'dark')

    await themeSelector.click()
    await page.getByRole('option', { name: 'Light', exact: true }).click()
    await expect(html).toHaveAttribute('data-theme', 'light')

    await themeSelector.click()
    await page.getByRole('option', { name: 'Coffee', exact: true }).click()
    await expect(html).toHaveAttribute('data-theme', 'coffee')

    await themeSelector.click()
    await page.getByRole('option', { name: 'Glass Light', exact: true }).click()
    await expect(html).toHaveAttribute('data-theme', 'liquid-glass-light')

    await themeSelector.click()
    await page.getByRole('option', { name: 'Glass Dark', exact: true }).click()
    await expect(html).toHaveAttribute('data-theme', 'liquid-glass-dark')

    await themeSelector.click()
    await page
      .getByRole('option', { name: 'Glass Coffee', exact: true })
      .click()
    await expect(html).toHaveAttribute('data-theme', 'liquid-glass-coffee')
  })

  test('previews and selects sound, changes volume, and toggles notifications', async ({
    context,
    page,
  }) => {
    // Arrange
    await context.grantPermissions(['notifications'], {
      origin: 'http://localhost:3009',
    })
    await openMeticulousRecording(page, '/en')
    await page.getByRole('button', { name: /open settings/i }).click()
    const soundSelector = page.getByTestId('sound-selector')
    const notificationToggle = page.getByRole('switch', {
      name: /notifications/i,
    })
    const soundRequest = page.waitForRequest(
      (request) => request.url().includes('/sounds/ascending-chime.mp3'),
      { timeout: TIMER_COMPLETION_TIMEOUT_MS },
    )

    // Act
    await soundSelector.click()
    await page.getByRole('button', { name: /preview ascending chime/i }).click()
    await soundRequest
    await page.getByRole('option', { name: 'Bright Ding', exact: true }).click()
    const volumeSlider = page.getByTestId('volume-slider-thumb')
    await volumeSlider.press('Home')
    await expect(volumeSlider).toHaveAttribute('aria-valuenow', '0')
    await volumeSlider.press('End')
    await expect(notificationToggle).toHaveAttribute('aria-checked', 'true')
    await notificationToggle.click()
    await expect(notificationToggle).toHaveAttribute('aria-checked', 'false')
    await notificationToggle.click()
    await page.getByTestId('settings-done-button').click()
    const sendTestButton = page.getByRole('button', { name: /send test/i })
    const notificationShown = page.waitForEvent('console', {
      predicate: (message) =>
        message.text() === '[Notifications] Notification shown successfully',
      timeout: TIMER_COMPLETION_TIMEOUT_MS,
    })
    await sendTestButton.click()
    await notificationShown

    // Assert
    await expect(page.getByTestId('settings-panel')).toBeHidden()
  })

  test('switches the timer and settings interface to Japanese', async ({
    page,
  }) => {
    // Arrange
    await openMeticulousRecording(page, '/en')

    // Act
    await page.getByRole('combobox', { name: 'Language' }).click()
    await page.getByRole('option', { name: '日本語', exact: true }).click()

    // Assert
    await expect(page).toHaveURL(/\/ja/)
    await expect(page.getByRole('button', { name: '開始' })).toBeVisible()
    await page.getByRole('button', { name: '設定を開く' }).click()
    await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible()
    await page.getByRole('button', { name: '完了' }).click()
  })

  test('opens settings from the PWA settings shortcut', async ({ page }) => {
    // Arrange and Act
    await openMeticulousRecording(page, '/?action=settings')

    // Assert
    await expect(page).toHaveURL(/\/en/)
    await expect(page.getByRole('dialog', { name: /settings/i })).toBeVisible()
    await page.getByTestId('settings-done-button').click()
  })

  test('starts the default timer from the PWA start shortcut', async ({
    page,
  }) => {
    // Arrange and Act
    await openMeticulousRecording(page, '/?action=start')

    // Assert
    await expect(page).toHaveURL(/\/en/)
    await expect(page.getByTestId('timer-pause-button')).toBeVisible()
    await page.getByTestId('timer-reset-button').click()
    await expect(page.getByTestId('timer-display')).toContainText('05:00')
  })

  test('uses the critical timer and settings controls on a mobile viewport', async ({
    page,
  }) => {
    // Arrange
    await page.setViewportSize(MOBILE_VIEWPORT)
    await openMeticulousRecording(page, '/en')
    await page.getByTestId('time-input-minutes').fill('1')
    await page.getByTestId('time-input-seconds').fill('30')

    // Act
    await page.getByTestId('timer-start-button').click()
    await expect(page.getByTestId('timer-pause-button')).toBeVisible()
    await page.getByTestId('timer-pause-button').click()
    await page.getByTestId('timer-reset-button').click()
    await page.getByRole('button', { name: /open settings/i }).click()

    // Assert
    await expect(page.getByTestId('settings-panel')).toBeVisible()
    await page.getByTestId('settings-done-button').click()
    await expect(page.getByTestId('timer-display')).toContainText('01:30')
  })
})
