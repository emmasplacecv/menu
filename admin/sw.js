/* Service worker do Emma's Place
   Faz duas coisas: torna a página instalável como app, e recebe
   notificações de pedidos novos mesmo com a app fechada. */

self.addEventListener("install",  e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",    e => { /* deixa passar para a rede */ });

/* Chega um pedido novo -> notificação com som e vibração */
self.addEventListener("push", event => {
  let titulo = "Novo pedido", corpo = "Toque para ver os detalhes.";
  try {
    if (event.data) {
      const d = event.data.json();
      if (d.titulo) titulo = d.titulo;
      if (d.corpo)  corpo  = d.corpo;
    }
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: "pedido-novo",           // agrupa; não enche o ecrã
      renotify: true,               // volta a tocar em cada pedido
      requireInteraction: true,     // fica no ecrã até ser tocada
      vibrate: [220, 90, 220, 90, 220],
      data: { url: "./" }
    })
  );
});

/* Tocar na notificação abre a app (ou traz para a frente, se já estiver aberta) */
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(lista => {
      for (const c of lista) {
        if ("focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(destino);
    })
  );
});
