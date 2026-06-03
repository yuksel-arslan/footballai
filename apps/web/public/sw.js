// Bump on any caching-strategy change so `activate` purges stale caches.
const CACHE_NAME = 'footballai-v3';
const OFFLINE_URL = '/offline';

// Only precache the offline shell + static brand assets. NEVER precache '/'
// (the HTML document) — a cached HTML points at hashed JS chunks that no longer
// exist after a deploy, which breaks the app until the cache is cleared.
const PRECACHE_ASSETS = [
  '/offline',
  '/site.webmanifest',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Don't let one missing asset fail the whole install.
      Promise.allSettled(PRECACHE_ASSETS.map((a) => cache.add(a)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  // 1) Navigations (HTML documents): NETWORK-FIRST. Always fetch the latest
  //    document so it references the current build's chunks. Fall back to the
  //    offline page only when the network is unavailable.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })()
    );
    return;
  }

  // 2) API calls: network-first, cache as offline backup.
  if (req.url.includes('/api/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const cached = await cache.match(req);
          if (cached) return cached;
          throw new Error('network error');
        }
      })()
    );
    return;
  }

  // 3) Everything else (mostly /_next/static hashed, immutable assets):
  //    cache-first with background refresh. Safe because hashed filenames
  //    change per build, so a stale chunk is never served for a new build.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) {
        event.waitUntil(
          fetch(req)
            .then((res) => {
              if (res.ok) cache.put(req, res.clone());
            })
            .catch(() => {})
        );
        return cached;
      }
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })()
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'FootballAI', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
