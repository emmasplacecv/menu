/* Service worker da APP DE CLIENTE da Emma's Place (17-11-2026)
   1) torna o site instalável como app (com manifest.webmanifest);
   2) guarda o site neste telemóvel para abrir SEM REDE.
      Páginas, código e dados do menu: vai primeiro à rede (fica sempre a versão nova) e,
      sem rede, usa a cópia guardada. Fotos e letra: usa a cópia e actualiza por trás.
   NÃO mexe nos painéis (/admin, /cozinha, /vendas): têm o seu próprio service worker.
   Os dados do servidor (menu, preços, esgotados) são guardados pela própria página (ver app.js),
   e os envios (pedidos, comprovativos) nunca passam por aqui. */
const VERSAO = "ep-site-v1";            /* mudar o número sempre que a lista ESSENCIAL mudar */
const FOTOS = "ep-site-fotos";          /* fotos e letra: cache à parte, limitada */
const ESSENCIAL = ["/", "/desenho.js", "/app.js", "/app.css", "/movel.js", "/movel.css", "/conta.js", "/conta.css",
  "/cartao.js", "/cartao.css", "/pedidos.js", "/menu-base.json", "/manifest.webmanifest", "/img/logo.webp",
  "/app/icon-192.png", "/legal.css"];
const PAINEIS = /^\/(admin|cozinha|vendas)(\/|$)/;
const MAX_FOTOS = 160;

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(VERSAO)
    .then(c => Promise.all(ESSENCIAL.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys()
    .then(n => Promise.all(n.filter(x => x.indexOf("ep-site-v") === 0 && x !== VERSAO).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

function guardar(nome, req, resp) {
  if (!resp || (!resp.ok && resp.type !== "opaque")) return;
  const copia = resp.clone();
  caches.open(nome).then(c => c.put(req, copia)).then(() => { if (nome === FOTOS) aparar(); }).catch(() => {});
}
let aparando = false;
function aparar() {
  if (aparando) return; aparando = true;
  caches.open(FOTOS).then(c => c.keys().then(k => Promise.all(k.slice(0, Math.max(0, k.length - MAX_FOTOS)).map(x => c.delete(x)))))
    .catch(() => {}).then(() => { aparando = false; });
}
/* rede primeiro; sem rede (ou rede a demorar mais de 6 s), a cópia */
function redePrimeiro(ev, chaveCache) {
  const req = ev.request;
  return new Promise(resolve => {
    let feito = false;
    const daCopia = () => caches.match(chaveCache || req, { ignoreSearch: !chaveCache && req.mode === "navigate" })
      .then(c => c || (req.mode === "navigate" ? caches.match("/") : null));
    const t = setTimeout(() => daCopia().then(c => { if (c && !feito) { feito = true; resolve(c); } }), 6000);
    fetch(req).then(r => {
      clearTimeout(t);
      if (r.ok) guardar(VERSAO, chaveCache || req, r);
      if (!feito) { feito = true; resolve(r); }
    }).catch(() => {
      clearTimeout(t);
      daCopia().then(c => { if (!feito) { feito = true; resolve(c || Response.error()); } });
    });
  });
}
/* a cópia primeiro; actualiza por trás */
function copiaPrimeiro(ev) {
  const req = ev.request;
  return caches.open(FOTOS).then(c => c.match(req).then(guardada => {
    const rede = fetch(req).then(r => { guardar(FOTOS, req, r); return r; }).catch(() => null);
    if (guardada) { ev.waitUntil(rede); return guardada; }
    return rede.then(r => r || Response.error());
  }));
}

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (PAINEIS.test(u.pathname)) return;                                     /* painéis: não tocar */
    if (u.pathname === "/sw.js") return;
    if (req.mode === "navigate") {
      /* a página principal guarda-se sempre como "/", com ou sem ?app=1, #pedidos, ?cartao=… */
      const principal = u.pathname === "/" || u.pathname === "/index.html";
      return ev.respondWith(redePrimeiro(ev, principal ? "/" : null));
    }
    if (/\.(webp|jpe?g|png|svg|gif)$/i.test(u.pathname)) return ev.respondWith(copiaPrimeiro(ev));
    return ev.respondWith(redePrimeiro(ev));                                   /* .js, .css, .json, .pdf */
  }
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") return ev.respondWith(copiaPrimeiro(ev));
  /* tudo o resto (servidor da Emma's Place, métricas, mapas): passa directo */
});
