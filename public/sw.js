const CACHE_NAME = "defensa-electoral-v4";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/123.jpeg"
];

const CACHEABLE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNextAsset = url.pathname.startsWith("/_next/");
  const isApiRoute = url.pathname.startsWith("/api/");
  const isSwFile = url.pathname === "/sw.js";
  const isManifest = url.pathname === "/manifest.webmanifest";
  const isAppIcon = url.pathname === "/123.jpeg";
  const hasCacheableExtension = CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (!isSameOrigin || isNextAsset || isApiRoute || isSwFile) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isManifest || isAppIcon) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match("/"))
    );
    return;
  }

  if (!hasCacheableExtension && !PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const shouldCache = response && response.status === 200;
        if (shouldCache) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
