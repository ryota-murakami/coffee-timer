import { test, expect } from '@playwright/test'

test.describe('Notification Settings', () => {
  test('renders notification and sound readiness controls', async ({
    page,
  }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    const settingsButton = page.getByRole('button', { name: /open settings/i })
    await settingsButton.click()

    const dialog = page.getByRole('dialog', { name: /settings/i })
    await expect(dialog).toBeVisible()

    await expect(
      page.getByRole('switch', { name: 'Notifications', exact: true }),
    ).toBeVisible()
    await expect(dialog.getByText('Browser permission:')).toBeVisible()
    await expect(
      page.getByRole('switch', { name: 'Sound alerts', exact: true }),
    ).toBeChecked()
    await expect(dialog.getByText('Browser audio playback:')).toBeVisible()
    await expect(page.getByRole('button', { name: /play test/i })).toBeVisible()
  })

  test('sound toggle turns sound off and restores the previous preset', async ({
    page,
  }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /open settings/i }).click()

    const soundToggle = page.getByRole('switch', {
      name: 'Sound alerts',
      exact: true,
    })
    const soundSelector = page.getByRole('combobox', {
      name: /select sound/i,
    })

    await expect(soundToggle).toBeChecked()
    await soundToggle.click()
    await expect(soundToggle).not.toBeChecked()
    await expect(soundSelector).toContainText('None')
    await expect(
      page.getByRole('button', { name: /play test/i }),
    ).toBeDisabled()

    await soundToggle.click()
    await expect(soundToggle).toBeChecked()
    await expect(soundSelector).toContainText('Ascending Chime')
    await expect(page.getByRole('button', { name: /play test/i })).toBeEnabled()
  })

  test('selecting None preserves a previously saved non-default preset', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'settings-storage',
        JSON.stringify({
          state: { soundPreset: 'service-bell', volume: 70 },
          version: 0,
        }),
      )
    })

    await page.goto('/en')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /open settings/i }).click()

    const soundToggle = page.getByRole('switch', {
      name: 'Sound alerts',
      exact: true,
    })
    const soundSelector = page.getByRole('combobox', {
      name: /select sound/i,
    })

    await expect(soundSelector).toContainText('Service Bell')
    await soundSelector.click()
    await page.getByRole('option', { name: 'None', exact: true }).click()
    await expect(soundToggle).not.toBeChecked()

    await soundToggle.click()
    await expect(soundSelector).toContainText('Service Bell')
  })

  test('sound test initializes browser audio and requests the selected file', async ({
    page,
  }) => {
    await page.goto('/en')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /open settings/i }).click()

    const soundRequestPromise = page.waitForRequest(
      (request) => request.url().includes('/sounds/ascending-chime.mp3'),
      { timeout: 5000 },
    )

    await page.getByRole('button', { name: /play test/i }).click()
    await soundRequestPromise
    await expect(page.getByText('Browser audio playback: Ready')).toBeVisible()
  })

  test('granted notification permission is shown with a test action', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: () => Promise.resolve('granted'),
        },
        writable: true,
        configurable: true,
      })
    })

    await page.goto('/en')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /open settings/i }).click()

    await expect(page.getByText('Browser permission: Allowed')).toBeVisible()
    await expect(
      page.getByRole('switch', { name: 'Notifications', exact: true }),
    ).toBeChecked()
    await expect(page.getByTestId('notification-test-button')).toBeVisible()
  })
})
