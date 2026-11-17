/* APP DE CLIENTE da Emma's Place (17-11-2026) — parte que corre ANTES do resto da página.
   - Guarda no telemóvel a última resposta do servidor para o menu, os preços, os esgotados e o estado
     da loja. Sem rede (ou com rede a falhar), a página recebe essa cópia e o menu abre na mesma.
   - Regista o service worker (sw.js), que guarda o próprio site para abrir sem rede.
   - Apanha o convite do Android para instalar a app (o botão aparece em pedidos.js).
   Se este ficheiro falhar, o site funciona como antes, só que sem modo sem rede. */
(function () {
  "use strict";
  var W = window, D = document, H = D.documentElement;
  var SERVIDOR = "wispy-cherry-ee2e.joaomleal88.workers.dev";
  var GUARDAR = { "/menu-edit": 1, "/estado": 1, "/soldout": 1, "/stock-dia": 1 };
  var LS = "ep_rede:";
  var app = W.EP_APP = { copiaDesde: 0, convite: null, instalada: false };

  /* ---- modo app (aberta pelo ícone) e sem rede ---- */
  app.emApp = !!((W.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true);
  if (app.emApp) H.classList.add("ep-app");
  function rede() {
    var sem = navigator.onLine === false;
    H.classList.toggle("ep-semrede", sem);
    try { W.dispatchEvent(new CustomEvent("ep-rede", { detail: { semRede: sem } })); } catch (e) { }
  }
  W.addEventListener("online", rede); W.addEventListener("offline", rede); rede();

  /* ---- cópia das respostas do servidor (só leituras, nunca envios) ---- */
  var fetchOriginal = W.fetch && W.fetch.bind(W);
  function chaveDe(entrada, opcoes) {
    try {
      var metodo = ((opcoes && opcoes.method) || (entrada && entrada.method) || "GET").toUpperCase();
      if (metodo !== "GET") return null;
      var u = new URL(typeof entrada === "string" ? entrada : entrada.url, location.href);
      return (u.hostname === SERVIDOR && GUARDAR[u.pathname]) ? u.pathname : null;
    } catch (e) { return null; }
  }
  function lerCopia(k) { try { var d = JSON.parse(localStorage.getItem(LS + k) || "null"); return d && typeof d.b === "string" ? d : null; } catch (e) { return null; } }
  if (fetchOriginal) {
    W.fetch = function (entrada, opcoes) {
      var k = chaveDe(entrada, opcoes);
      if (!k) return fetchOriginal(entrada, opcoes);
      return fetchOriginal(entrada, opcoes).then(function (r) {
        if (r && r.ok) r.clone().text().then(function (b) {
          try { if (b && b.charAt(0) === "{" && b.indexOf('"erro"') < 0) localStorage.setItem(LS + k, JSON.stringify({ t: Date.now(), b: b })); } catch (e) { }
        }).catch(function () { });
        return r;
      }, function (erro) {
        var c = lerCopia(k);
        if (!c) throw erro;
        if (!app.copiaDesde || c.t < app.copiaDesde) app.copiaDesde = c.t;
        try { W.dispatchEvent(new CustomEvent("ep-copia", { detail: { t: c.t } })); } catch (e) { }
        return new Response(c.b, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "X-EP-Copia": String(c.t) } });
      });
    };
  }

  /* ---- service worker ---- */
  var seguro = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && seguro && !/[?&]semapp\b/.test(location.search)) {
    W.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () { }); });
  }

  /* ---- instalar ---- */
  W.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault(); app.convite = ev;
    try { W.dispatchEvent(new CustomEvent("ep-instalar")); } catch (e) { }
  });
  W.addEventListener("appinstalled", function () {
    app.convite = null; app.instalada = true;
    try { localStorage.setItem("ep_app_instalada", String(Date.now())); W.dispatchEvent(new CustomEvent("ep-instalar")); } catch (e) { }
  });
})();
