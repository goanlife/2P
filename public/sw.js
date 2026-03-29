// ManuMan Service Worker — PWA offline support
// CACHE VERSION: bump questo numero ad ogni deploy per invalidare cache vecchie
const CACHE_VERSION = 6;
const CACHE = `manuMan-v${CACHE_VERSION}`;
const STATIC = ["/", "/index.html"];

// ── Install: precache index ───────────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .catch(() => {}) // non bloccare install se fallisce
  );
  self.skipWaiting();
});

// ── Activate: elimina cache vecchie ──────────────────────────────────────
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: strategia per tipo di risorsa ─────────────────────────────────
self.addEventListener("fetch", e => {
  const { request } = e;

  // Ignora richieste non-GET e richieste chrome-extension
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // ── Network ONLY per API Supabase, auth, funzioni ──────────────────────
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes("/functions/v1/")
  ) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // ── Stale-while-revalidate per assets JS/CSS/img (hash nel nome → immutabili) ──
  if (
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/) &&
    (url.pathname.includes("-") || url.pathname.includes("."))
  ) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(request);

        // Fetch in background per aggiornare la cache
        const networkPromise = fetch(request).then(res => {
          if (res.ok) {
            // BUG FIX: clone PRIMA di mettere in cache, poi ritorna l'originale
            cache.put(request, res.clone());
          }
          return res;
        }).catch(() => null);

        // Ritorna cache se disponibile, altrimenti aspetta rete
        return cached || networkPromise;
      })
    );
    return;
  }

  // ── Network-first per HTML e navigazione ─────────────────────────────
  e.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match("/index.html");
      })
  );
});
