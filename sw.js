const CACHE_NAME = 'berkeley-paths-v130';
const TILE_CACHE_NAME = 'berkeley-paths-tiles'; // persistent across app updates

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/app.jsx',
  './src/styles.css',
  './src/tailwind.css',
  './assets/icon.png',
  './data/paths-data.json',
];

// On install, cache all static assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Allow the page to trigger activation when user approves the update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// On activate, delete old app caches but keep tile cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== TILE_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isDataRequest = url.pathname.startsWith('/data/');
  const isTile = url.hostname === 'server.arcgisonline.com';

  // Serve OSM tiles from tile cache (cache-first, persistent)
  if (isTile) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Only handle same-origin and data requests; let other CDN requests go to network
  if (!isSameOrigin && !isDataRequest) {
    return;
  }

  // Always fetch version.json from network — never cache it
  if (url.pathname.endsWith('/version.json')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful same-origin responses
        if (response.ok && isSameOrigin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
