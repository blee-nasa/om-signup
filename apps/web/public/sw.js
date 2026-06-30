// Hand-rolled service worker for the Open Mic Sign-Up PWA.
// Strategy:
//   - /api/*        -> never cached (health/data must be live)
//   - navigations   -> network-first, fall back to cached app shell offline
//   - static assets -> cache-first (Vite fingerprints filenames per build)
// Bump CACHE to invalidate everything on the next activation.
const CACHE = "om-signup-v1";

self.addEventListener("install", (event) => {
  // Precache the app shell so a cold start works offline after the first
  // (online) install. Without this, an offline cold start has no /app-shell to
  // fall back to and the page fails to load.
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        const res = await fetch("/index.html", { cache: "no-cache" });
        if (res && res.ok) await cache.put("/app-shell", res.clone());
      } catch {
        // Installed offline — the navigation handler will populate it later.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Live data only — let API requests always hit the network.
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const cache = await caches.open(CACHE);
            cache.put("/app-shell", res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match("/app-shell")) ||
            (await cache.match(req)) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })(),
  );
});
