import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Removed account routes', () => {
  test('shows the English 404 with a way back to the timer for an old My Page bookmark', async ({
    page,
  }) => {
    // Arrange
    const removedPage = '/en/mypage'

    // Act
    const response = await page.goto(removedPage)

    // Assert
    expect(response?.status()).toBe(404)
    await expect(page).toHaveURL(/\/en\/mypage$/)
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()

    // Act
    await page.getByRole('link', { name: 'Back to timer' }).click()

    // Assert
    await expect(page).toHaveURL(/\/en$/)
    await expect(
      page.getByRole('button', { name: 'Start', exact: true }),
    ).toBeVisible()
  })

  test('shows the Japanese 404 and returns to the Japanese timer', async ({
    page,
  }) => {
    // Arrange
    const removedPage = '/ja/mypage'

    // Act
    const response = await page.goto(removedPage)

    // Assert
    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { name: 'ページが見つかりません' }),
    ).toBeVisible()

    // Act
    await page.getByRole('link', { name: 'タイマーに戻る' }).click()

    // Assert
    await expect(page).toHaveURL(/\/ja$/)
    await expect(
      page.getByRole('button', { name: '開始', exact: true }),
    ).toBeVisible()
  })

  // Value: protects=multi-segment unknown URLs under a locale render the localized 404 (HTTP 404)
  // fails_when=catch-all is narrowed to a single segment, so nested old URLs hit the shell-less root 404
  // why_new=existing 404 tests only request single-segment /en/mypage and /ja/mypage; seam=none
  // no_claim=every unknown URL shape; only one nested English path on a production build is exercised
  test('shows the localized 404 for a deeply nested unknown URL', async ({
    page,
  }) => {
    // Arrange
    const nestedUnknownPage = '/en/mypage/history/2026/05'

    // Act
    const response = await page.goto(nestedUnknownPage)

    // Assert
    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back to timer' }),
    ).toBeVisible()
  })

  // Value: protects=old bookmarks saved without a locale prefix still reach the localized 404 (HTTP 404)
  // fails_when=the proxy matcher or its locale redirect changes, so /mypage or /sign-in stops at the shell-less root 404
  // why_new=every other 404 test requests a URL that already starts with /en or /ja; seam=none
  // no_claim=locale negotiation from Accept-Language; only the default-locale redirect is exercised
  test('redirects old bookmarks without a locale to the localized 404', async ({
    page,
  }) => {
    // Arrange
    const oldMyPageBookmark = '/mypage'

    // Act
    const myPageResponse = await page.goto(oldMyPageBookmark)

    // Assert
    expect(myPageResponse?.status()).toBe(404)
    await expect(page).toHaveURL(/\/en\/mypage$/)
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()

    // Arrange
    const oldSignInBookmark = '/sign-in'

    // Act
    const signInResponse = await page.goto(oldSignInBookmark)

    // Assert
    expect(signInResponse?.status()).toBe(404)
    await expect(page).toHaveURL(/\/en\/sign-in$/)
    await expect(
      page.getByRole('link', { name: 'Back to timer' }),
    ).toBeVisible()
  })

  test('404 page has no WCAG 2.1 AA violations', async ({ page }) => {
    // Arrange
    await page.goto('/en/mypage')
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()

    // Act
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    // Assert
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('home header offers language and settings but no account controls', async ({
    page,
  }) => {
    // Arrange and Act
    await page.goto('/en')

    // Assert
    await expect(page.getByRole('combobox', { name: 'Language' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Open settings' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'My Page' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sign Out' })).toHaveCount(0)
  })

  test('service worker upgrade purges old app caches and keeps unrelated ones', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Cache Storage upgrade is verified on Chromium only',
    )

    // Arrange: an inert same-origin page, so caches exist before any app page registers the worker
    await page.route('**/__cache-seed.html', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>cache seed</title>',
      }),
    )
    await page.goto('/__cache-seed.html')
    const seededCaches = await page.evaluate(async () => {
      await caches.open('share-timer-v3')
      await caches.open('share-timer-static-v3')
      await caches.open('share-timer-dynamic-v3')
      await caches.open('sentinel-cache')
      return (await caches.keys()).sort()
    })
    expect(seededCaches).toEqual([
      'sentinel-cache',
      'share-timer-dynamic-v3',
      'share-timer-static-v3',
      'share-timer-v3',
    ])

    // Act
    await page.goto('/en')

    // Assert
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await caches.keys()).filter((name) => name.endsWith('-v3')),
        ),
      )
      .toEqual([])
    expect(await page.evaluate(() => caches.has('sentinel-cache'))).toBe(true)
    await expect
      .poll(() =>
        page.evaluate(async () => {
          // Checking the name first keeps this from creating the cache it is looking for
          if (!(await caches.has('share-timer-static-v4'))) return false
          const staticCache = await caches.open('share-timer-static-v4')
          return (await staticCache.match('/icon-192x192.png')) !== undefined
        }),
      )
      .toBe(true)
  })

  test('removed account endpoints and unknown paths outside a locale answer 404', async ({
    request,
  }) => {
    // Act
    const sessionEndpoint = await request.get('/api/auth/get-session')
    const historyEndpoint = await request.get('/api/timer-sessions')
    const missingAsset = await request.get('/sounds/missing.mp3')

    // Assert
    expect(sessionEndpoint.status()).toBe(404)
    expect(historyEndpoint.status()).toBe(404)
    expect(missingAsset.status()).toBe(404)
  })
})
