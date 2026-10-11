import { test, expect } from '@playwright/test'

test.describe('Service worker cache lookups', () => {
  // Value: protects=a static asset is answered from the app's own cache, never from another cache on the origin
  // fails_when=the cache-first lookup searches every cache on the origin again (unscoped caches.match)
  // why_new=the upgrade test only checks which caches exist, not which cache answers a request; seam=none
  // no_claim=WebKit and Firefox; only the precached icon on Chromium is exercised
  test('serves the precached icon instead of another cache copy of the same URL', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Cache Storage lookups are verified on Chromium only',
    )

    // Arrange: an inert same-origin page, so the foreign cache exists before the app registers the worker
    await page.route('**/__cache-seed.html', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>cache seed</title>',
      }),
    )
    await page.goto('/__cache-seed.html')
    await page.evaluate(async () => {
      const foreignCache = await caches.open('foreign-cache')
      await foreignCache.put(
        '/icon-192x192.png',
        new Response('foreign icon', {
          headers: { 'content-type': 'text/plain' },
        }),
      )
    })
    await page.goto('/en')
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    )
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const precachedIcon = await caches.match('/icon-192x192.png', {
            cacheName: 'share-timer-static-v4',
          })
          return precachedIcon !== undefined
        }),
      )
      .toBe(true)

    // Act
    const iconContentType = await page.evaluate(async () => {
      const response = await fetch('/icon-192x192.png')
      return response.headers.get('content-type')
    })

    // Assert
    expect(iconContentType).toBe('image/png')
  })

  // Value: protects=an offline reload shows the app's own cached timer page, never another cache's copy of the URL
  // fails_when=the network-first fallback searches every cache on the origin again (unscoped caches.match)
  // why_new=no existing test takes the browser offline, so the fallback lookup was never exercised; seam=none
  // no_claim=offline start without a prior online visit; only a reload after two online loads on Chromium
  test('offline reload shows the cached timer instead of another cache copy of the page', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Cache Storage lookups are verified on Chromium only',
    )

    // Arrange: a foreign cache holding a different document for the timer URL
    await page.route('**/__cache-seed.html', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>cache seed</title>',
      }),
    )
    await page.goto('/__cache-seed.html')
    await page.evaluate(async () => {
      const foreignCache = await caches.open('foreign-cache')
      await foreignCache.put(
        '/en',
        new Response(
          '<!doctype html><title>foreign</title><h1>Foreign page</h1>',
          { headers: { 'content-type': 'text/html' } },
        ),
      )
    })
    await page.goto('/en')
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    )
    // A second online load goes through the worker, which stores the page in the app's dynamic cache
    await page.goto('/en')
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const cachedTimerPage = await caches.match('/en', {
            cacheName: 'share-timer-dynamic-v4',
          })
          return cachedTimerPage !== undefined
        }),
      )
      .toBe(true)

    // Act
    await context.setOffline(true)
    await page.reload()

    // Assert
    await expect(
      page.getByRole('heading', { name: 'Coffee Timer' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Foreign page' }),
    ).toHaveCount(0)
  })
})
