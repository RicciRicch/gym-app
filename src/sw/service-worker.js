/* global self, caches, fetch, URL */
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
