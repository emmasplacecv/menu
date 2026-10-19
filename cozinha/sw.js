/* Service worker do Emma's Place — COZINHA
   Faz três coisas:
   1) torna a página instalável como app;
   2) recebe notificações de pedidos novos mesmo com a app fechada;
   3) (15-10-2026) guarda a página neste aparelho para abrir SEM INTERNET.
      Com internet vai sempre buscar a versão nova primeiro; sem internet usa a cópia.
      O que se vende sem internet fica numa fila (ver /painel-offline.js). */

const VERSAO = "ep-cozinha-v9";       /* mudar o número sempre que este ficheiro mudar */
const ESSENCIAL = ["./", "manifest-cozinha.json", "/painel-offline.js", "icon-192.png", "icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSAO)
      .then(c => Promise.all(ESSENCIAL.map(u => c.add(new Request(u, {cache: "reload"})).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n.indexOf("ep-cozinha-") === 0 && n !== VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;                                   /* envios: a página trata */
  const url = new URL(req.url);
  if (url.origin === self.location.origin) { event.respondWith(redePrimeiro(req)); return; }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cachePrimeiro(req)); return;
  }
  /* servidor (Worker) e o resto: não mexe — o painel-offline.js trata disso */
});

function comPrazo(promessa, ms) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error("prazo")), ms);
    promessa.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); });
  });
}

/* páginas e ficheiros do próprio site: rede primeiro (para receber actualizações), cópia se não houver rede */
async function redePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  const navegar = req.mode === "navigate";
  const pedido = navegar ? new Request(req.url, {cache: "no-cache", credentials: "same-origin"}) : req;
  const rede = fetch(pedido).then(async r => {
    if (!r || !r.ok || r.type === "opaque") return r;
    let limpa = r;
    if (r.redirected) limpa = new Response(await r.clone().blob(), {status: r.status, statusText: r.statusText, headers: r.headers});
    cache.put(req, limpa.clone()).catch(() => {});
    return limpa;
  });
  rede.catch(() => {});                                            /* evita aviso na consola */
  try {
    return await comPrazo(rede, navegar ? 4500 : 6000);
  } catch (e) {
    const copia = (await cache.match(req, {ignoreSearch: true})) ||
                  (navegar ? (await cache.match("./")) || (await cache.match(self.registration.scope)) : null);
    if (copia) return copia;
    try { return await rede; } catch (e2) {}
    return new Response(navegar ? "<meta charset=utf-8><h2 style='font-family:sans-serif;padding:24px'>Sem internet e sem cópia guardada neste aparelho.<br><small>Abra esta página uma vez com internet.</small></h2>" : "",
      {status: 503, headers: {"Content-Type": navegar ? "text/html; charset=utf-8" : "text/plain"}});
  }
}

/* letra (Google Fonts): guardada na primeira vez, depois sempre da cópia */
async function cachePrimeiro(req) {
  const cache = await caches.open(VERSAO);
  const copia = await cache.match(req);
  if (copia) return copia;
  try {
    const r = await fetch(req);
    if (r && (r.ok || r.type === "opaque")) cache.put(req, r.clone()).catch(() => {});
    return r;
  } catch (e) { return new Response("", {status: 503}); }
}

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
