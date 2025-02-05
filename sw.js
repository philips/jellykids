const CACHE_VERSION = 'v2024.02.05-3';
const CORE_FILES = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icons/48-48.png',
  './icons/72-72.png',
  './icons/96-96.png',
  './icons/144-144.png',
  './icons/192-192.png',
  './icons/512-512.png'
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
        const request = event.request;
        
        // Bypass caching for non-GET requests and sensitive endpoints
        if (request.method !== 'GET' || 
            request.url.includes('/Videos/') ||
            request.url.includes('/Users/') ||
            request.url.includes('api_key=')) {
          return fetch(request);
        }

        // Try to get from cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache, try network
        const networkResponse = await fetch(request);
        
        // Only cache successful responses for core files
        if (networkResponse.ok && CORE_FILES.some(file => request.url.endsWith(file))) {
          const cache = await caches.open(CACHE_VERSION);
          try {
            await cache.put(request, networkResponse.clone());
          } catch (err) {
            console.error('Failed to cache response:', err);
          }
        }
        
        return networkResponse;
      } catch (error) {
        console.error('Fetch handler failed:', error);
        throw error;
      }
    })()
  );
});
