const CACHE_VERSION = 'v2024.02.05-2';
const CORE_FILES = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Add files individually with error handling
      for (const url of CORE_FILES) {
        try {
          await cache.add(url);
        } catch (error) {
          console.warn(`Failed to cache ${url}:`, error);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      try {
        await Promise.all(
          cacheNames
            .filter(name => name !== CACHE_VERSION)
            .map(name => caches.delete(name))
        );
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        // Try to get from cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, try network
        const networkResponse = await fetch(event.request);
        
        // Only cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_VERSION);
          try {
            await cache.put(event.request, networkResponse.clone());
          } catch (err) {
            console.error('Failed to cache response:', err);
          }
        }
        
        return networkResponse;
      } catch (error) {
        console.error('Fetch handler failed:', error);
        throw error; // Re-throw to let the browser handle the error
      }
    })()
  );
});
