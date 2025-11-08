// DishCovery Service Worker
const CACHE_NAME = 'dishcovery-v6'; // Updated to force cache refresh (v6 = no user data caching)
const RUNTIME_CACHE = 'dishcovery-runtime-v6';

// Assets to cache on install (ONLY static assets, NO user-specific pages)
const PRECACHE_URLS = [
  '/manifest.json',
  '/android/android-launchericon-192-192.png',
  '/android/android-launchericon-512-512.png',
  '/ios/180.png',
  '/main.png',
  '/offline.html'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching essential files');
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL old caches to force fresh start (including user data caches)
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Force claim all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that cache is cleared
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // NEVER cache API calls, Next.js bundles, or user-specific pages - always fetch fresh
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('webpack') ||
      url.pathname.includes('.hot-update.') ||
      // Don't cache user-specific pages (they contain user data)
      url.pathname.startsWith('/user/') ||
      url.pathname.startsWith('/admin/') ||
      // Don't cache pages with query parameters (might be user-specific)
      url.search.includes('token') ||
      url.search.includes('userId') ||
      url.search.includes('_rsc')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For other requests (static assets only), use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache runtime requests (only static assets)
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Fetch failed', error);
            // Return offline page if available
            return caches.match('/offline.html');
          });
      })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Clear all caches when requested (e.g., on logout)
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('🗑️ Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ All caches cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});
