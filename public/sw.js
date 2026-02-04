const CACHE_NAME = 'victor-portfolio-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/src/style.css',
    '/src/main.js',
    '/victorstack.png',
    '/vite.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Cache Strategy for Thum.io images: Cache First, then Network
    // Because they take forever to load, once we have them, we KEEP them.
    if (url.hostname.includes('thum.io')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    // Clone the response to store it in cache
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                });
            })
        );
    } else {
        // Default strategy for other assets: Network first, fall back to cache
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    }
});
