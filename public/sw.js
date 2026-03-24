// ManuMan Service Worker — PWA offline support
const CACHE = "manuMan-v1";
const STATIC = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Network first per API Supabase, cache first per assets statici
  const url = new URL(e.request.url);
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/api")) {
    // Network only per API
    e.respondWith(fetch(e.request).catch(() => new Response("offline", {status: 503})));
  } else {
    // Cache + network fallback per assets
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          if (res.ok && e.request.method === "GET") {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        });
        return cached || networkFetch;
      })
    );
  }
});
