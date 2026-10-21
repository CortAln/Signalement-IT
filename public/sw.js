/* Service worker — Signalement IT
   Stratégie :
   - Précache du shell applicatif (page de signalement) pour un démarrage hors-ligne.
   - Network-first avec repli sur cache pour les pages.
   - La file d'attente hors-ligne des signalements est gérée côté client
     (localStorage, voir src/components/PwaClient.tsx). */

const CACHE = "sit-shell-v2";
const SHELL = [
  "/",
  "/r",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;
  // Ne pas mettre en cache les appels API (données toujours fraîches)
  if (new URL(request.url).pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
