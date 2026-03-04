// GVM Corp — Service Worker v2
// Estrategia: Cache-first para assets estáticos (solo producción), Network-first para páginas

const CACHE_NAME = 'gvm-corp-v3';
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/offline',
    '/logo-gvm.png',
];

// Instalación — precachear assets críticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activación — limpiar caches antiguas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
                )
        )
    );
    self.clients.claim();
});

// Fetch — Network-first con fallback a cache
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo manejar requests del mismo origen
    if (url.origin !== location.origin) return;

    // API routes: siempre red, nunca cache
    if (url.pathname.startsWith('/api/')) return;

    // Dev chunks (_next/dev): NEVER cache — causes stale module errors
    if (url.pathname.startsWith('/_next/dev/')) return;

    // Assets estáticos de producción (_next/static): cache-first
    // Estos tienen hashes en el nombre, asi que son inmutables
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(request).then((cached) =>
                cached ?? fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
            )
        );
        return;
    }

    // Páginas: network-first con fallback a cache o /offline
    event.respondWith(
        fetch(request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return response;
            })
            .catch(() =>
                caches.match(request).then((cached) =>
                    cached ?? caches.match('/offline')
                )
            )
    );
});
