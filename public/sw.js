// GVM Corp — Service Worker v5
// Estrategia CONSERVADORA para no romper la navegación de Next App Router:
//  - Solo cache-first para assets con hash (/_next/static/*), que son inmutables.
//  - Navegaciones de documento completas (mode=navigate): red, con fallback /offline.
//  - Peticiones RSC / datos / imágenes: NO se interceptan (van siempre a la red).
//
// Por qué: la versión anterior hacía network-first cacheando TODO, incluidas las
// peticiones RSC que usa la navegación entre módulos. Al despertar tras inactividad,
// cualquier fallo transitorio hacía que el SW respondiera con la página /offline a una
// petición RSC → el router recibía HTML en vez de RSC y la app se "congelaba".

const CACHE_NAME = 'gvm-corp-v5';
const STATIC_ASSETS = ['/offline', '/logo-gvm.png'];

// Instalación — precachear solo lo mínimo (nunca páginas autenticadas)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
    );
    self.skipWaiting();
});

// Activación — limpiar caches antiguas y tomar control de inmediato
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo GET del mismo origen
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== location.origin) return;

    // Assets estáticos con hash: cache-first (inmutables)
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(request).then((cached) =>
                cached ?? fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
                    return response;
                })
            )
        );
        return;
    }

    // SOLO navegaciones de documento completas (recarga / primera carga de una ruta).
    // Las peticiones RSC de navegación entre módulos NO tienen mode 'navigate', así que
    // NO se interceptan y siempre van a la red (evita cuelgues por respuestas cacheadas).
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() =>
                caches.match(request).then((cached) => cached ?? caches.match('/offline'))
            )
        );
        return;
    }

    // Resto (RSC, datos, imágenes, etc.): passthrough — red normal, sin cache.
});
