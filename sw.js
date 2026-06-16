const CACHE_NAME = 'berkeley-paths-v34';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/app.jsx',
  './src/styles.css',
  './assets/icon.png',
  './data/paths-data.json',
];

// On install, cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Don't skipWaiting automatically — wait for user to tap "Update now"
});

// Allow the page to trigger activation when user approves the update
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// On activate, delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Only handle same-origin and data requests; let CDN requests go to network
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isDataRequest = url.pathname.startsWith('/data/');

  if (!isSameOrigin && !isDataRequest) {
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
