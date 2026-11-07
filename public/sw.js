// fintrace service worker: lets the installed app open offline so Quick Record can queue entries.
// Hashed build assets are cached on first use; the Overview and Record pages are cached each time
// they load online and served from the cache only when the network fails.
const STATIC = "fintrace-static-v2";
const PAGES = "fintrace-pages-v2";
const OFFLINE_PAGES = ["/", "/record"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            // Clone before returning: once the page reads the body, it can't be copied.
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(caches.open(STATIC).then((c) => c.put(request, copy)));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate" && OFFLINE_PAGES.includes(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Signed out: drop the private pages this device kept.
          if (res.redirected && new URL(res.url).pathname === "/login") event.waitUntil(caches.delete(PAGES));
          else if (res.ok) {
            const copy = res.clone();
            event.waitUntil(caches.open(PAGES).then((c) => c.put(url.pathname, copy)));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/")) || (await caches.match("/record")) || Response.error()),
    );
  }
});
