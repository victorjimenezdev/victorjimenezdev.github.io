const CACHE_NAME = 'victor-portfolio-v3';

self.addEventListener('install', (event) => {
    // Take control immediately without waiting for old tabs to close
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Delete all old caches (clears the broken v1/v2 caches on existing devices)
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only intercept Thum.io image requests - cache first, then network
    // Everything else passes through to the network normally
    if (url.hostname.includes('thum.io')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
        );
    }
    // All other requests: do not call event.respondWith - browser handles normally
});
