const CACHE = "kilode-shell-v11";
const SHELL = ["/", "/offline.html", "/site.webmanifest", "/favicon-32.png", "/apple-touch-icon.png", "/pwa-192.png", "/kilode-word.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_server") || url.pathname.startsWith("/__")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")) || (await caches.match("/offline.html")) || new Response("Offline", { status: 503 })),
    );
    return;
  }

  if (/\.(?:js|css|png|jpg|jpeg|svg|webp|woff2?|ico|webmanifest)$/.test(url.pathname) || url.pathname === "/sw.js") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || new Response("Offline", { status: 503 }))),
    );
  }
});
