// Kill-switch for the old FootballAI PWA worker (footballai-v3).
// Served at the same /sw.js path, so browsers that installed the app pick
// this up as an update: it drops every cache, unregisters itself and reloads
// open tabs — otherwise they would keep seeing the cached (dead) app shell
// instead of the maintenance page.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach((c) => c.navigate(c.url))
    })()
  )
})
