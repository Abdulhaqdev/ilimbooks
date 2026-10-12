// Self-destroying service worker.
// Eski Boostify admin PWA service worker'ini va uning keshini olib tashlaydi,
// so'ng ochiq tablarni yangilaydi. Yangi landing'da PWA/SW ishlatilmaydi.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        try { client.navigate(client.url); } catch (e) {}
      }
    } catch (e) {}
  })());
});
