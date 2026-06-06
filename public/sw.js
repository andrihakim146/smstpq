/* ============================================================
   SMSTPQ Service Worker
   Workbox CDN (offline caching) + Web Push Notifications
   ============================================================ */

// ── Workbox dari CDN ─────────────────────────────────────────────────────────
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js')

const { registerRoute, NavigationRoute, setDefaultHandler } = workbox.routing
const { NetworkFirst, CacheFirst, StaleWhileRevalidate }    = workbox.strategies
const { ExpirationPlugin }                                  = workbox.expiration
const { precacheAndRoute, createHandlerBoundToURL }         = workbox.precaching
const { setCacheNameDetails }                               = workbox.core

setCacheNameDetails({ prefix: 'smstpq' })

// ── Precache aset statis Next.js ─────────────────────────────────────────────
// (diisi otomatis oleh build jika menggunakan workbox-webpack-plugin;
//  untuk build manual, kita cache lazily via runtimeCaching)
precacheAndRoute(self.__WB_MANIFEST || [])

// ── Runtime Caching ──────────────────────────────────────────────────────────

// Aset statis Next.js (_next/static): cache-first, 30 hari
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/static/'),
  new CacheFirst({
    cacheName: 'smstpq-next-static',
    plugins:   [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

// Next.js image optimization: stale-while-revalidate, 7 hari
registerRoute(
  ({ url }) => url.pathname.startsWith('/_next/image'),
  new StaleWhileRevalidate({
    cacheName: 'smstpq-images',
    plugins:   [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  }),
)

// Google Fonts: cache-first, 1 tahun
registerRoute(
  ({ url }) => url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com'),
  new CacheFirst({
    cacheName: 'smstpq-fonts',
    plugins:   [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

// Halaman wali santri: network-first, cache 1 jam
registerRoute(
  ({ url }) => url.pathname.startsWith('/santri/'),
  new NetworkFirst({
    cacheName:            'smstpq-santri',
    networkTimeoutSeconds: 5,
    plugins:              [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 })],
  }),
)

// API routes: JANGAN di-cache — offline queue via localStorage sudah menangani
// (tidak ada rule → browser/SW melewatkan ke network secara default)

// Fallback halaman navigasi: network-first, cache 5 menit
const pageHandler = new NetworkFirst({
  cacheName:            'smstpq-pages',
  networkTimeoutSeconds: 8,
  plugins:              [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 })],
})
registerRoute(new NavigationRoute(pageHandler, {
  // Kecualikan rute auth & admin dari cache navigasi
  denylist: [/^\/api\//, /^\/admin\//, /^\/pengajar\//],
}))

// Default fallback saat offline
setDefaultHandler(new NetworkFirst({ cacheName: 'smstpq-default' }))

// ── Lifecycle ─────────────────────────────────────────────────────────────────
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('smstpq-') && !['smstpq-next-static','smstpq-images',
            'smstpq-fonts','smstpq-santri','smstpq-pages','smstpq-default'].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  )
})

// ── Push Notification ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try   { data = event.data ? event.data.json() : {} }
  catch { data = { body: event.data ? event.data.text() : 'Ada pembaruan baru.' } }

  const title   = data.title   || 'SMSTPQ'
  const options = {
    body:     data.body   || 'Ada pembaruan baru untuk santri Anda.',
    icon:     data.icon   || '/icon-192x192.png',
    badge:    data.badge  || '/badge-72x72.png',
    tag:      data.tag    || 'smstpq-notif',
    renotify: true,
    data: { url: data.url || '/', santriNis: data.santriNis || '' },
    actions: data.actions || [
      { action: 'view',  title: 'Lihat Detail' },
      { action: 'close', title: 'Tutup'        },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'close') return

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) return client.focus()
        }
        return self.clients.openWindow(url)
      }),
  )
})

// ── Push Subscription Change ──────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .catch(() => {}),
  )
})
