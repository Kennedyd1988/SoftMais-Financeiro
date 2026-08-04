// SOFT+ Financeiro — Service Worker
// Estratégia: network-first (busca versão nova primeiro, cache só como fallback offline).
// Por quê: garante que o usuário sempre veja a versão mais recente do app sem precisar
// reinstalar; o cache só entra em ação se a rede falhar (modo offline).

const CACHE_NAME = 'softplus-financeiro-v1'; // ATUALIZAR este número a cada nova versão publicada

// Arquivos essenciais para o app abrir mesmo sem internet.
// Ajuste os caminhos se os arquivos não estiverem na mesma pasta do sw.js.
const APP_SHELL = [
  './softplus-financeiro_3.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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

self.addEventListener('fetch', (event) => {
  // Só intercepta requisições GET de mesmo domínio (não mexe em chamadas ao Firebase/Google APIs).
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Rede OK: atualiza o cache com a versão mais nova e devolve ela.
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return networkResponse;
      })
      .catch(() => {
        // Rede falhou (offline): usa o que tiver em cache.
        return caches.match(event.request);
      })
  );
});
