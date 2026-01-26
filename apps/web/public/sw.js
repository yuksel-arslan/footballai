const CACHE_NAME = 'futballai-v1';
const OFFLINE_URL = '/offline';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Try network first for API calls
      if (event.request.url.includes('/api/')) {
        try {
          const networkResponse = await fetch(event.request);
          // Cache successful API responses
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Return cached response if available
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;
          throw error;
        }
      }

      // For other requests, try cache first
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        // Fetch and update cache in background
        event.waitUntil(
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
            })
            .catch(() => {})
        );
        return cachedResponse;
      }

      // Fallback to network
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          const offlineResponse = await cache.match(OFFLINE_URL);
          if (offlineResponse) return offlineResponse;
        }
        throw error;
      }
    })()
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'FutballAI', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
