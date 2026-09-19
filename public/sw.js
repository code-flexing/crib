// SafeCrib service worker — foundation only.
//
// This intentionally does the minimum right now: it establishes an
// installable, versioned cache for a small app shell and serves it when
// offline. It does NOT implement runtime caching strategies for API
// responses, authentication, or user data — that will be added once the
// backend exists, and must never cache anything sensitive.

const CACHE_NAME = "safecrib-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests. Everything else (API calls,
  // cross-origin requests, non-GET methods) passes straight through so we
  // never accidentally cache authentication or private data.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request))
  );
});
