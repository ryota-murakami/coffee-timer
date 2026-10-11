// Service Worker for Share Timer Notifications
// Handles notification display, click events, and offline caching

const CACHE_PREFIX = 'share-timer-'
const CACHE_NAME = 'share-timer-v4'
const STATIC_CACHE = 'share-timer-static-v4'
const DYNAMIC_CACHE = 'share-timer-dynamic-v4'
const CURRENT_CACHES = [CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE]

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/api/manifest',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/badge.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  // Current sound presets (updated Oct 2025)
  '/sounds/alert-beep.mp3',
  '/sounds/ascending-chime.mp3',
  '/sounds/bright-ding.mp3',
  '/sounds/cheerful-chirp.mp3',
  '/sounds/double-ping.mp3',
  '/sounds/melodic-bells.mp3',
  '/sounds/notification-pop.mp3',
  '/sounds/service-bell.mp3',
  '/sounds/urgent-alert.mp3',
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - delete this app's caches from earlier versions
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          // Only this app's own caches; caches owned by anything else on the origin are left alone
          .filter(
            (name) =>
              name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name)
          )
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  return self.clients.claim()
})

// Handle notification display requests from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag } = event.data

    const options = {
      body: body || 'Your timer has finished!',
      icon: icon || '/icon-192x192.png',
      badge: badge || '/badge.png',
      tag: tag || 'timer-notification',
      vibrate: [200, 100, 200],
      requireInteraction: true, // Keep notification visible until user interacts
      data: {
        dateOfArrival: Date.now(),
        url: event.data.url || '/',
      },
      actions: [
        {
          action: 'view',
          title: 'View Timer',
          icon: '/icon-192x192.png',
        },
        {
          action: 'close',
          title: 'Dismiss',
          icon: '/badge.png',
        },
      ],
    }

    event.waitUntil(
      self.registration.showNotification(title || 'Share Timer', options)
        .then(() => {
          // Send success response back to main thread if MessageChannel is available
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true })
          }
        })
        .catch((error) => {
          console.error('[Service Worker] Notification failed:', error)
          // Send error response back to main thread if MessageChannel is available
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: false, error: error.message })
          }
        })
    )
  }
})

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action)

  event.notification.close()

  // Handle notification actions
  if (event.action === 'view') {
    // Focus or open the app window
    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // If a window is already open, focus it
          for (const client of clientList) {
            if (client.url === event.notification.data.url && 'focus' in client) {
              return client.focus()
            }
          }
          // Otherwise, open a new window
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data.url)
          }
        })
    )
  } else if (event.action === 'close') {
    // Just close the notification (already done above)
    console.log('[Service Worker] Notification dismissed')
  } else {
    // Default click action (no specific action)
    event.waitUntil(
      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // If a window is already open, focus it
          for (const client of clientList) {
            if (client.url === event.notification.data.url && 'focus' in client) {
              return client.focus()
            }
          }
          // Otherwise, open a new window
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data.url)
          }
        })
    )
  }
})

// Handle push events (for future Web Push integration)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received')

  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icon-192x192.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || '1',
      },
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Share Timer', options)
    )
  }
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip cross-origin requests
  if (!url.origin.includes(self.location.origin)) {
    return
  }

  // Handle different types of requests with appropriate caching strategies
  if (event.request.method === 'GET') {
    // Static assets (images, icons, sounds) - Cache First
    if (isStaticAsset(url.pathname)) {
      event.respondWith(cacheFirstStrategy(event.request, STATIC_CACHE))
    }
    // API calls and dynamic content - Network First with fallback
    else if (isAPIRequest(url.pathname)) {
      event.respondWith(networkFirstStrategy(event.request, DYNAMIC_CACHE))
    }
    // HTML pages - Network First with cache fallback
    else if (isHTMLRequest(event.request)) {
      event.respondWith(networkFirstStrategy(event.request, DYNAMIC_CACHE))
    }
    // Default - Network First
    else {
      event.respondWith(networkFirstStrategy(event.request, DYNAMIC_CACHE))
    }
  }
})

// Cache First Strategy - check cache first, fallback to network
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      console.log('[Service Worker] Serving from cache:', request.url)
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[Service Worker] Cache first strategy failed:', error)
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

// Network First Strategy - try network first, fallback to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', request.url)
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // If no cache and request is for HTML, return offline page
    if (isHTMLRequest(request)) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Share Timer - Offline</title>
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; background: #F9FAFB; color: #374151; }
              .offline { max-width: 400px; margin: 0 auto; }
              h1 { color: #10B981; }
            </style>
          </head>
          <body>
            <div class="offline">
              <h1>You're Offline</h1>
              <p>Please check your internet connection and try again.</p>
              <p>Your timer data is safely stored locally.</p>
            </div>
          </body>
        </html>
      `, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html' }
      })
    }

    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

// Helper functions
function isStaticAsset(pathname) {
  return pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|mp3|wav|ogg|webm|ico|woff|woff2|ttf|eot)$/)
}

function isAPIRequest(pathname) {
  return pathname.startsWith('/api/') || pathname.includes('/_next/data/')
}

function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html')
}
