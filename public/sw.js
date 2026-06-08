// Buzzy Service Worker — Cache offline para assets estáticos + media
const CACHE_NAME = 'buzzy-static-v1';
const MEDIA_CACHE = 'buzzy-media-v1';
const AVATAR_CACHE = 'buzzy-avatars-v1';
const AUDIO_CACHE = 'buzzy-audio-v1';

// Assets críticos que deben funcionar sin internet
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// ── Install: pre-cachear assets críticos ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: limpiar caches viejos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== MEDIA_CACHE && k !== AVATAR_CACHE && k !== AUDIO_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estrategia por tipo de recurso ─────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // En dev (Vite HMR) nunca interceptar — dejar que el browser siempre vaya a la red
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // No interceptar requests de API — siempre van a la red
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) return;

  // Avatares e imágenes de perfil → Cache First (raramente cambian)
  if (
    url.pathname.includes('/media/profile_pics/') ||
    url.pathname.includes('/media/thumbnails/')
  ) {
    event.respondWith(cacheFirst(request, AVATAR_CACHE));
    return;
  }

  // Audio tracks → Cache First (el audio de un video publicado nunca cambia)
  if (url.pathname.includes('/media/audio_tracks/')) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }

  // Videos y media pesada → Network First con fallback al cache
  if (url.pathname.startsWith('/media/')) {
    event.respondWith(networkFirst(request, MEDIA_CACHE));
    return;
  }

  // Assets estáticos (JS, CSS, fonts, íconos) → Cache First
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // HTML (navegación) → Network First, fallback a index.html para SPA
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((r) => r ?? Response.error())
      )
    );
    return;
  }
});

// ── Estrategia Cache First ────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

// ── Estrategia Network First ──────────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? Response.error();
  }
}
