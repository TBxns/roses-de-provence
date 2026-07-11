// Service worker voor Rosés de Provence
// Strategie:
//  - Kaarttegels (tile.openstreetmap.org): cache-first, zodat eerder bekeken kaartdelen offline werken.
//  - Alles van dezelfde origin (de app zelf): network-first met cache-fallback,
//    zodat je altijd de nieuwste versie krijgt zolang je online bent, en de laatst
//    geladen versie offline nog werkt.

const CACHE_NAME = "roses-de-provence-v1";
const TILE_HOST = "tile.openstreetmap.org";

self.addEventListener("install", (event) => {
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
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // Kaarttegels: cache-first (blijven werken zonder internet zodra eenmaal geladen)
  if (url.hostname.includes(TILE_HOST)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                cache.put(req, res.clone());
              }
              return res;
            })
            .catch(() => cached);
        })
      )
    );
    return;
  }

  // Eigen bestanden (index.html, manifest.json, enz.): network-first met cache-fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cache.match(req))
      )
    );
  }
});
