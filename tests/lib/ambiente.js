/* Ambiente de testes — Emma's Place
   - Serve os ficheiros do repositório em http://127.0.0.1:<porta> (como o GitHub Pages).
   - Substitui o Worker da Cloudflare por um SERVIDOR FALSO em memória: os testes nunca tocam no servidor verdadeiro.
   - Bloqueia tudo o resto da internet (Clarity, Google Fonts…), para os testes darem sempre o mesmo resultado.
   Não usa chaves verdadeiras: a chave dos testes é "chave-de-teste". */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const RAIZ = path.resolve(__dirname, "..", "..");
const API = "https://wispy-cherry-ee2e.joaomleal88.workers.dev";
const CHAVE = "chave-de-teste";
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".pdf": "application/pdf",
  ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".css": "text/css" };

function servirFicheiros() {
  return new Promise(ok => {
    const srv = http.createServer((req, res) => {
      let u = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let f = path.join(RAIZ, u);
      if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
        if (!u.endsWith("/")) { res.writeHead(301, { Location: u + "/" }); return res.end(); }
        f = path.join(f, "index.html");
      }
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, "127.0.0.1", () => ok({ srv, base: "http://127.0.0.1:" + srv.address().port }));
  });
}

/* ---------------- servidor falso (imita o Worker, pelo que as páginas mostram que ele faz) ---------------- */
function novoServidorFalso(opc) {
  opc = opc || {};
  const s = {
    pedidos: {},            // dia -> [pedido]
    stock: Object.assign({}, opc.stock || {}),
    esgotados: [],
    edit: opc.edit || { p: {}, off: [], add: [], ord: {}, cp: {}, coff: [], cadd: [], cord: [] },
    estado: { fechado: false, msg: "", entregasOff: false },
    promos: Object.assign({}, opc.promos || {}),
    usados: new Set(),
    chamadas: [],           // registo de tudo o que as páginas pediram
    rede: true,             // false = "sem internet" (o pedido falha como numa rede em baixo)
    atrasoMs: 0,
    hoje: opc.hoje || null, // "AAAA-MM-DD"; por omissão o dia do computador
    slotDia: opc.slotDia || null
  };
  const hoje = () => s.hoje || new Date().toISOString().slice(0, 10);
  const lista = dia => (s.pedidos[dia] = s.pedidos[dia] || []);
  let nId = 0;
  const novoId = () => Date.now().toString(36) + (++nId).toString(36).padStart(4, "0");

  s.responder = function (metodo, u, corpo) {
    const q = u.searchParams, cam = u.pathname, temChave = q.get("key") === CHAVE;
    const precisaChave = ["/orders", "/order-status", "/order-del", "/order-pago", "/order-visto", "/stock-baixa", "/stock-item",
      "/stock-set", "/soldout-set", "/menu-set", "/estado-set", "/entregas-set", "/renovar", "/push-sub", "/push-teste", "/push-log"];
    if (precisaChave.includes(cam) && !temChave) return { erro: "Chave errada." };
    switch (cam) {
      case "/menu-edit": return { edit: s.edit };
      case "/estado": return s.estado;
      case "/soldout": return { itens: s.esgotados };
      case "/soldout-set": {
        const it = q.get("item");
        if (it && it !== "__teste__") { if (q.get("on") === "1") { if (!s.esgotados.includes(it)) s.esgotados.push(it); } else s.esgotados = s.esgotados.filter(x => x !== it); }
        return { ok: true, itens: s.esgotados };
      }
      case "/stock-dia": return { itens: s.stock };
      case "/stock-baixa": {
        const it = q.get("item"), n = +(q.get("n") || 1);
        if (it in s.stock) s.stock[it] = Math.max(0, s.stock[it] - n);
        return { ok: true, itens: s.stock };
      }
      case "/slots": return { slots: opc.slots || ["10:00", "10:15", "10:30", "11:00"], hoje: !s.slotDia, dia: s.slotDia || hoje(), quando: s.slotDia ? "amanhã" : "" };
      case "/reserve": return { ok: true, slot: q.get("slot") === "asap" ? "10:15" : q.get("slot"), hoje: !s.slotDia, dia: s.slotDia || hoje() };
      case "/check": {
        const c = (q.get("code") || "").toUpperCase(), p = s.promos[c];
        if (!p) return { erro: "Código inválido." };
        if (s.usados.has(c)) return { erro: "Código já utilizado." };
        return { promo: Object.assign({ c }, p) };
      }
      case "/redeem": {
        const c = (q.get("code") || "").toUpperCase();
        if (!s.promos[c]) return { erro: "Código inválido." };
        if (s.usados.has(c)) return { erro: "Código já utilizado." };
        s.usados.add(c); return { ok: true };
      }
      case "/order": {
        let d = {}; try { d = JSON.parse(corpo || "{}"); } catch (e) { return { erro: "JSON" }; }
        const dia = d.dia || hoje();
        const p = Object.assign({}, d, { id: novoId(), status: d.balcao ? "confirmado" : (d.pago ? "aguarda" : "confirmado"),
          criado: new Date().toTimeString().slice(0, 5) });
        if (p.nome) p.nome = String(p.nome).slice(0, 60);
        lista(dia).push(p);
        if (dia === hoje()) Object.entries(d.stock || {}).forEach(([n, k]) => { if (n in s.stock) s.stock[n] = Math.max(0, s.stock[n] - (+k || 0)); });
        return { ok: true, id: p.id };
      }
      case "/orders": return { pedidos: lista(q.get("dia") || hoje()) };
      case "/order-status": case "/order-pago": case "/order-del": case "/order-visto": {
        const dia = q.get("dia") || hoje(), id = q.get("id");
        const l = lista(dia), p = l.find(x => x.id === id);
        if (!p) return { erro: "Pedido não encontrado" };
        if (cam === "/order-status") p.status = q.get("st");
        if (cam === "/order-pago") { p.balcaoPago = q.get("on") === "1"; p.balcaoMetodo = q.get("met") || ""; }
        if (cam === "/order-visto") p.visto = "10:00";
        if (cam === "/order-del") {
          s.pedidos[dia] = l.filter(x => x !== p);
          if (dia === hoje()) Object.entries(p.stock || {}).forEach(([n, k]) => { if (n in s.stock) s.stock[n] += (+k || 0); });
        }
        return { ok: true };
      }
      case "/comprovativo": return metodo === "POST" ? { ok: true } : { erro: "sem comprovativo" };
      case "/push-chave": return { chave: "" };
      default: return { ok: true };
    }
  };
  s.todos = () => Object.values(s.pedidos).flat();
  return s;
}

async function abrir(opc) {
  opc = opc || {};
  const { srv, base } = await servirFicheiros();
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const context = await browser.newContext(Object.assign({ locale: "pt-PT", timezoneId: "Atlantic/Cape_Verde",
    serviceWorkers: opc.serviceWorkers || "block" }, opc.contexto || {}));
  const falso = novoServidorFalso(opc.servidor);
  await context.route("**/*", async route => {
    const req = route.request(), url = req.url();
    if (url.startsWith(base)) return route.continue();
    if (url.startsWith(API)) {
      const u = new URL(url);
      falso.chamadas.push({ metodo: req.method(), caminho: u.pathname, url, corpo: req.postData() });
      if (!falso.rede) return route.abort("internetdisconnected");
      if (falso.atrasoMs) await new Promise(r => setTimeout(r, falso.atrasoMs));
      const r = falso.responder(req.method(), u, req.postData());
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(r) });
    }
    return route.abort();   // Clarity, Google Fonts, etc.
  });
  const fechar = async () => { await browser.close(); srv.close(); };
  return { base, browser, context, falso, fechar, API, CHAVE };
}

module.exports = { abrir, API, CHAVE, RAIZ };
