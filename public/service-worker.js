// L'ancien site enregistrait ce service worker. Cette version le désinstalle
// chez les visiteurs qui l'auraient encore, pour qu'ils voient le nouveau site.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cles = await caches.keys();
      await Promise.all(cles.map((cle) => caches.delete(cle)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => client.navigate(client.url));
    })(),
  );
});
