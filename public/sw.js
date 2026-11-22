// FundPilot Service Worker — Network-First with Offline Fallback
const CACHE_NAME = 'fundpilot-v4-20261122';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/manifest.json']).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      let deletedLegacyCache = false;
      for (const key of keys) {
        if (key !== CACHE_NAME) {
          await caches.delete(key);
          deletedLegacyCache = true;
        }
      }
      await self.clients.claim();
      // If a legacy cache (such as fundpilot-v2) was serving stale HTML, refresh open windows immediately
      if (deletedLegacyCache) {
        const windowClients = await self.clients.matchAll({ type: 'window' });
        for (const client of windowClients) {
          try {
            client.postMessage({ type: 'SW_UPDATED_RELOAD' });
            if ('navigate' in client) {
              await client.navigate(client.url);
            }
          } catch {
            // Ignore navigation errors on cross-origin or closing tabs
          }
        }
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // If fetching FX API while offline, let client handle cache fallback
  if (event.request.url.includes('/api/fx')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // Network-first for all app pages & assets so production deployments appear immediately;
  // fall back to cache only when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/');
        });
      })
  );
});
