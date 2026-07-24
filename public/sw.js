// Service worker mínimo do OficinaPro: habilita instalação (PWA) e mostra uma
// página offline em navegações sem rede. Não faz cache de dados autenticados.
const CACHE = "oficinapro-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icon.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Só intercepta navegações (troca de página); dados e assets seguem normal.
  if (req.mode !== "navigate") return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
