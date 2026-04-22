// Bump this version on every deploy to invalidate the cache
const CACHE_VERSION = 3;
const CACHE_NAME = `habitual-v${CACHE_VERSION}`;
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/quotes.js',
    '/js/storage.js',
    '/js/sync.js',
    '/js/app.js',
    '/manifest.json',
    '/assets/favicon-light.svg',
    '/assets/favicon-dark.svg',
    '/assets/icon-light-192.png',
    '/assets/icon-light-512.png',
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Network-first for sync API calls
    if (url.hostname.includes('workers.dev')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // Cache-first for static assets
    e.respondWith(
        caches.match(e.request)
            .then((cached) => cached || fetch(e.request))
    );
});
