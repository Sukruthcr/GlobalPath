const CACHE_NAME = 'globalpath-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Use Network First strategy for all requests to ensure updates work
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        // Cache the new response
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET' && !event.request.url.startsWith('chrome-extension://')) {
            cache.put(event.request, responseToCache);
          }
        });
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});
