const CACHE_VERSION = 'v2024.02.01-1';
const CORE_FILES = [
  '/jellykids/',
  '/jellykids/index.html',
  '/jellykids/app.js',
  '/jellykids/manifest.json',
  '/jellykids/icons/icon-192x192.png',
  '/jellykids/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CORE_FILES))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_VERSION)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
