/* global self, caches, fetch, URL, clients */
// Offline support. The build (vite.config.ts) prepends VERSION and PRECACHE:
// every built file plus everything in public/, so the whole app opens with no
// connection. Supabase API calls are cross-origin and never touched here.

const CACHE = `gym-app-${VERSION}`
const scoped = (path) => new URL(path, self.registration.scope).href
const SHELL = scoped('index.html')

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map(scoped)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('gym-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return

  // Every route is the same single-page app: answer from the cached shell
  // (instant, works offline) and fall back to the network.
  if (request.mode === 'navigate') {
    event.respondWith(caches.match(SHELL, { ignoreVary: true }).then((cached) => cached || fetch(request)))
    return
  }

  // Built files have hashed names and never change: cache first, then network
  // (adding anything new to the cache for next time).
  // ignoreVary: module scripts send an Origin header that the precache
  // requests did not, and servers answer with `Vary: Origin`.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})

// Push notifications (sent by the send-push Edge Function): show them, and open
// the right screen on a tap. `url` is relative to the app, '' = Today.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    (async () => {
      // "Rest is over": an open app on Android has already buzzed by itself, so
      // skip a second alert there (Chrome allows that while the site is on
      // screen). Same rule as showRestPush in src/lib/rest-alert.ts.
      if (data.tag === 'rest' && /Android/i.test(self.navigator.userAgent)) {
        const open = await clients.matchAll({ type: 'window', includeUncontrolled: true })
        if (open.some((c) => c.visibilityState === 'visible')) return
      }
      await self.registration.showNotification(data.title || 'Gym App', {
        body: data.body || '',
        tag: data.tag,
        icon: scoped('icon-192.png'),
        data: { url: data.url || '' },
        ...(Array.isArray(data.vibrate) ? { vibrate: data.vibrate, renotify: true } : {}),
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = scoped((event.notification.data && event.notification.data.url) || '')
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((open) => {
      // Reuse an open window of the app when there is one.
      const app = open.find((c) => c.url.startsWith(self.registration.scope))
      if (app)
        return app
          .navigate(target)
          .then((c) => (c || app).focus())
          .catch(() => clients.openWindow(target))
      return clients.openWindow(target)
    }),
  )
})
