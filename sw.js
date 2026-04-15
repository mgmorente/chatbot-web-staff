/**
 * PACCMAN STAFF - Service Worker
 * Network-first para HTML/JS/CSS propios y API
 * Cache-first para assets externos (CDN, fuentes, imágenes)
 */

// La versión se obtiene dinámicamente del último commit (via version.php).
// Si falla (offline o sin git) cae a un fallback basado en la fecha del SW.
let CACHE_NAME = `paccman-staff-fallback-${Date.now()}`;

async function resolveCacheName(base) {
    try {
        const res = await fetch(base + 'version.php?format=json', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return `paccman-staff-${data.hash || data.version || Date.now()}`;
    } catch (err) {
        console.warn('[SW Staff] No se pudo obtener versión, usando fallback:', err.message);
        return CACHE_NAME;
    }
}

// ===== INSTALL: cachear assets estáticos =====
self.addEventListener('install', (event) => {
    const swUrl = new URL(self.registration.scope);
    const base = swUrl.pathname;

    const staticAssets = [
        base,
        base + 'index.html',
        base + 'login.html',
        base + 'styles.css',
        base + 'login.css',
        base + 'avatar.jpg',
        base + 'manifest.json',
        base + 'offline.html',
    ];

    event.waitUntil((async () => {
        CACHE_NAME = await resolveCacheName(base);
        console.log('[SW Staff] Cache name:', CACHE_NAME);
        const cache = await caches.open(CACHE_NAME);
        console.log('[SW Staff] Cacheando assets desde:', base);
        await Promise.allSettled(
            staticAssets.map(url => cache.add(url).catch(err => {
                console.warn('[SW Staff] No se pudo cachear:', url, err.message);
            }))
        );
        await self.skipWaiting();
    })());
});

// ===== ACTIVATE: limpiar cachés antiguos =====
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW Staff] Eliminando caché antiguo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ===== FETCH: estrategia de caché según tipo de petición =====
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls → network-first
    if (url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // env.js → network-first (config puede cambiar)
    if (url.pathname.endsWith('env.js')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // HTML/CSS/JS propios → network-first (actualizaciones inmediatas)
    const swScope = new URL(self.registration.scope).pathname;
    if ((url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) && url.pathname.startsWith(swScope)) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Navegación → network-first
    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Resto (imágenes, fuentes, CDN) → cache-first
    event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('offline.html') || await caches.match(new URL('offline.html', self.registration.scope).href);
            if (offlinePage) return offlinePage;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;

        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('offline.html') || await caches.match(new URL('offline.html', self.registration.scope).href);
            if (offlinePage) return offlinePage;
        }

        return new Response(
            JSON.stringify({ error: 'Sin conexión a internet' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
