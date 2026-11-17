/* movel.js — DESENHO NOVO DA VERSÃO DE TELEMÓVEL (16-11-2026)
   Só mexe no aspecto e na arrumação da página. Não calcula preços, não cria pedidos, não fala com o
   servidor: usa as funções que o site já tem (openCart, abrirProduto, sendWA, setLang, total…).
   Liga-se e desliga-se em desenho.js. Só actua em ecrãs de telemóvel (a decisão é tomada no <head>
   do index.html, que põe a classe "nv" no <html>); no computador e no tablet o site fica como estava.
   Este ficheiro corre ANTES do script principal, para a página já estar arrumada quando o menu é desenhado. */
(function () {
  "use strict";
  var D = document, H = D.documentElement;
  if (!H.classList.contains("nv")) return;
  /* a folha de estilos movel.css não chegou: fica o desenho antigo, inteiro */
  try { if (!getComputedStyle(H).getPropertyValue("--nv-ok").trim()) { H.classList.remove("nv"); return; } } catch (e) { H.classList.remove("nv"); return; }

  var $ = function (id) { return D.getElementById(id); };
  var el = function (html) { var t = D.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  var IC = {
    casa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></svg>',
    copo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10l-1 16H8z"/><path d="M6 8h12"/></svg>',
    saco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    visto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>'
  };

  /* ---------- textos novos, nas 5 línguas do site ---------- */
  var TX = {
    pt: { inicio: "Início", menu: "Menu", pedido: "O meu pedido", ver: "Ver pedido", montar: "Montar o meu açaí", vermenu: "Ver o menu", vertudo: "Ver tudo",
      so: "SÓ NO SITE", noacai: "NO AÇAÍ", aberto: "Aberto · fecha às {h}", abre: "Fechado · abre às {h}", amanha: "Fechado · abre amanhã às {h}", segunda: "Fechado · abre segunda às {h}", fechado: "Fechado agora",
      p1: "Pedido", p2: "Dados", p3: "Comprovativo", p3b: "Envio", totalp: "Total a pagar", editar: "Editar", idioma: "Idioma", destaque: "Destaque" },
    en: { inicio: "Home", menu: "Menu", pedido: "My order", ver: "View order", montar: "Build my açaí", vermenu: "See the menu", vertudo: "See all",
      so: "ONLINE ONLY", noacai: "ON AÇAÍ", aberto: "Open · closes {h}", abre: "Closed · opens {h}", amanha: "Closed · opens tomorrow {h}", segunda: "Closed · opens Monday {h}", fechado: "Closed now",
      p1: "Order", p2: "Details", p3: "Receipt", p3b: "Send", totalp: "Total to pay", editar: "Edit", idioma: "Language", destaque: "Featured" },
    fr: { inicio: "Accueil", menu: "Menu", pedido: "Ma commande", ver: "Voir la commande", montar: "Composer mon açaí", vermenu: "Voir le menu", vertudo: "Tout voir",
      so: "SUR LE SITE", noacai: "SUR L'AÇAÍ", aberto: "Ouvert · ferme à {h}", abre: "Fermé · ouvre à {h}", amanha: "Fermé · ouvre demain à {h}", segunda: "Fermé · ouvre lundi à {h}", fechado: "Fermé pour le moment",
      p1: "Commande", p2: "Coordonnées", p3: "Justificatif", p3b: "Envoi", totalp: "Total à payer", editar: "Modifier", idioma: "Langue", destaque: "À la une" },
    de: { inicio: "Start", menu: "Menü", pedido: "Bestellung", ver: "Bestellung ansehen", montar: "Mein Açaí zusammenstellen", vermenu: "Zum Menü", vertudo: "Alle ansehen",
      so: "NUR ONLINE", noacai: "AUF AÇAÍ", aberto: "Geöffnet · schließt {h}", abre: "Geschlossen · öffnet {h}", amanha: "Geschlossen · öffnet morgen {h}", segunda: "Geschlossen · öffnet Montag {h}", fechado: "Derzeit geschlossen",
      p1: "Bestellung", p2: "Daten", p3: "Beleg", p3b: "Senden", totalp: "Gesamtbetrag", editar: "Ändern", idioma: "Sprache", destaque: "Highlight" },
    nl: { inicio: "Start", menu: "Menu", pedido: "Bestelling", ver: "Bekijk bestelling", montar: "Stel mijn açaí samen", vermenu: "Bekijk het menu", vertudo: "Alles bekijken",
      so: "ALLEEN ONLINE", noacai: "OP AÇAÍ", aberto: "Open · sluit {h}", abre: "Gesloten · opent {h}", amanha: "Gesloten · opent morgen {h}", segunda: "Gesloten · opent maandag {h}", fechado: "Nu gesloten",
      p1: "Bestelling", p2: "Gegevens", p3: "Betaalbewijs", p3b: "Versturen", totalp: "Totaal te betalen", editar: "Wijzigen", idioma: "Taal", destaque: "Uitgelicht" }
  };
  var lingua = function () { try { return (typeof LANG === "string" && TX[LANG]) ? LANG : "pt"; } catch (e) { return "pt"; } };
  var tx = function (k) { return TX[lingua()][k] || TX.pt[k]; };
  var hora = function (min) {
    var h = Math.floor(min / 60), m = min % 60, l = lingua(), mm = (m < 10 ? "0" : "") + m;
    if (l === "pt" || l === "fr") return h + "h" + (m ? mm : "");
    if (l === "de") return h + (m ? ":" + mm : "") + " Uhr";
    return (h < 10 ? "0" : "") + h + ":" + mm;
  };

  /* =====================================================================
     1. ARRUMAR A PÁGINA (antes de o site desenhar o menu)
     ===================================================================== */
  var wrap = D.querySelector(".wrap"), zona = $("menu"), main = $("inicio");
  var capa = D.querySelector(".home-hero.capa"), best = $("mais-pedidos"), nav = $("catNav");
  var painel = D.querySelector(".order-panel"), again = $("againBox"), busca = D.querySelector(".msearch");
  var barra = D.querySelector(".sitebar"), marca = D.querySelector(".brand-lockup span");
  if (!wrap || !zona || !main || !capa || !best || !nav || !barra) { H.classList.remove("nv"); return; }   // a página mudou: não arriscar

  /* topo: estado (aberto/fechado) por baixo do nome e botão do idioma no lugar do carrinho */
  var estado = el('<span class="nv-status" id="nvStatus" aria-live="polite"><i></i><b></b></span>');
  if (marca) marca.appendChild(estado);
  var btLang = el('<button type="button" class="nv-lang" id="nvLang" aria-haspopup="true" aria-expanded="false">PT</button>');
  barra.appendChild(btLang);

  /* capa: foto com a frase (a capa animada dos descontos desce para depois dos mais pedidos) */
  var hero = el(
    '<section class="nv-hero" id="nvHero">' +
    '<img id="nvHeroImg" src="img/capa-4.webp" alt="" decoding="async">' +
    '<div class="nv-hero-g"></div>' +
    '<div class="nv-hero-t">' +
    '<span class="nv-hero-b" id="nvHeroB" hidden></span>' +
    '<h2 class="nv-hero-h"><span id="nvHeroA"></span><span id="nvHeroT"></span></h2>' +
    '<div class="nv-hero-c"><button type="button" class="c1" id="nvHeroC1" hidden></button><button type="button" class="c2" id="nvHeroC2"></button></div>' +
    '</div></section>');
  main.insertBefore(hero, main.firstChild);
  if (again) main.parentNode.insertBefore(again, main.nextSibling);          // «pedir outra vez» fica logo a seguir à capa

  /* ordem nova dentro do menu: categorias → mais pedidos → descontos → levantar/entrega → Menu + pesquisa → resto */
  var promo = el('<div class="nv-promo" id="nvPromo"></div>');
  /* 16-11-2026 (pedido do Miguel): a capa animada dos descontos fica SEMPRE no topo da página, como antes.
     A capa com foto (nv-hero) deixa de se mostrar; fica no código só para não partir o resto. */
  promo.appendChild(capa);
  main.insertBefore(promo, main.firstChild);
  nav.parentNode.insertBefore(best, nav.nextSibling);
  if (painel) best.parentNode.insertBefore(painel, best.nextSibling);
  var menuT = el('<div class="nv-menu-h"><h2 id="nvMenuT">Menu</h2></div>');
  if (busca) busca.parentNode.insertBefore(menuT, busca); else zona.insertBefore(menuT, (painel || promo).nextSibling);
  var cabBest = best.querySelector(".section-heading");
  var verTudo = el('<button type="button" class="nv-vertudo" id="nvVerTudo"></button>');
  if (cabBest) cabBest.appendChild(verTudo);

  /* barra de baixo: Início · Menu · O meu pedido */
  var nvNav = el(
    '<nav class="nv-nav" id="nvNav" data-clarity-unmask="true">' +
    '<button type="button" id="nvT1" class="on">' + IC.casa + '<span></span></button>' +
    '<button type="button" id="nvT2">' + IC.copo + '<span></span></button>' +
    '<button type="button" id="nvT3"><b class="nv-b" id="nvCnt">0</b>' + IC.saco + '<span></span></button>' +
    '</nav>');
  D.body.appendChild(nvNav);

  /* finalizar: passos no topo, resumo do pedido e total sempre à vista com o botão de confirmar */
  var chk = $("chkSheet");
  if (chk) {
    var passos = el(
      '<div class="nv-steps" id="nvSteps" aria-hidden="true">' +
      '<span class="ok"><i>' + IC.visto + '</i><em id="nvP1"></em></span><u></u>' +
      '<span class="now"><i>2</i><em id="nvP2"></em></span><u></u>' +
      '<span><i>3</i><em id="nvP3"></em></span></div>');
    var grab = chk.querySelector(".grab");
    chk.insertBefore(passos, grab ? grab.nextSibling : chk.firstChild);
    var resumo = el('<button type="button" class="nv-res" id="nvRes"><span id="nvResT"></span><b id="nvResE"></b></button>');
    var primLbl = chk.querySelector(".lbl");
    if (primLbl) chk.insertBefore(resumo, primLbl);
    var pagar = el(
      '<div class="nv-pay" id="nvPay"><div><small id="nvPayL"></small><b id="nvPayT"></b></div>' +
      '<button type="button" class="go" id="nvPayB" data-i18n="enviarwa"></button></div>');
    chk.appendChild(pagar);
  }
  window.EP_NV_OK = true;

  /* =====================================================================
     2. DAR VIDA (depois de o script principal do site estar carregado)
     ===================================================================== */
  function seguro(f) { return function () { try { return f.apply(this, arguments); } catch (e) { } }; }

  var textos = seguro(function () {
    $("nvT1").lastChild.textContent = tx("inicio");
    $("nvT2").lastChild.textContent = tx("menu");
    $("nvMenuT").textContent = tx("menu");
    verTudo.textContent = tx("vertudo");
    btLang.textContent = lingua().toUpperCase();
    btLang.setAttribute("aria-label", tx("idioma") + ": " + lingua().toUpperCase());
    hero.setAttribute("aria-label", tx("destaque"));
    nvNav.setAttribute("aria-label", tx("menu"));
    if ($("nvP1")) { $("nvP1").textContent = tx("p1"); $("nvP2").textContent = tx("p2"); $("nvPayL").textContent = tx("totalp"); $("nvResE").textContent = tx("editar"); }
    desenharEstado(); desenharHero(); desenharPedido(); desenharPagar();
  });

  /* aberto / fechado, pelo horário do site (HORARIO, hora de Cabo Verde) e pelo interruptor da Gestão */
  var desenharEstado = seguro(function () {
    var a = agoraCV(), h = HORARIO[a.dow], txt, off = true;
    if (typeof lojaFechada !== "undefined" && lojaFechada) txt = tx("fechado");
    else if (h && a.min >= h[0] && a.min < h[1]) { txt = tx("aberto").replace("{h}", hora(h[1])); off = false; }
    else if (h && a.min < h[0]) txt = tx("abre").replace("{h}", hora(h[0]));
    else {
      var d1 = (a.dow + 1) % 7, d = d1, n = 0;
      while (!HORARIO[d] && n < 7) { d = (d + 1) % 7; n++; }
      txt = HORARIO[d] ? tx(d === d1 ? "amanha" : "segunda").replace("{h}", hora(HORARIO[d][0])) : tx("fechado");
    }
    estado.classList.toggle("off", off);
    estado.lastChild.textContent = txt;
  });

  /* capa: o açaí primeiro; com o açaí esgotado, o primeiro produto com foto que haja */
  var heroAlvo = null;
  var desenharHero = seguro(function () {
    var esc = null, ordem = [3, 0, 1, 2];
    for (var k = 0; k < ordem.length && !esc; k++) {
      var c = CAPA[ordem[k]]; if (!c || !c.prod || c.camp || c.mural) continue;
      var f = findMenuItem(c.prod); if (f && !esgotados.includes(f.item.n)) esc = { i: ordem[k], c: c, f: f };
    }
    var pt = lingua() === "pt", fechada = (typeof lojaFechada !== "undefined" && lojaFechada);
    var c0 = esc ? esc.c : CAPA[3], i0 = esc ? esc.i : 3;
    $("nvHeroImg").src = "img/capa-" + (i0 + 1) + ".webp";
    $("nvHeroA").textContent = (pt ? c0.a : ht("heroKicker")) + " ";
    $("nvHeroT").textContent = pt ? c0.b : ht("heroTitle");
    $("nvHeroA").parentNode.classList.toggle("k", !pt);          // noutras línguas a 1.ª linha é um mote pequeno, não uma fala
    var ehAcai = !!(esc && esc.c.prod === CAMP_PROD);
    var b = $("nvHeroB"), c1 = $("nvHeroC1");
    b.hidden = !esc;
    if (esc) b.textContent = tx("so") + " · −" + (ehAcai && acaiNaCapa() ? DESC_ACAI_TXT + "% " + tx("noacai") : DESC_ONLINE + "%");
    heroAlvo = (esc && !fechada) ? esc : null;
    c1.hidden = !heroAlvo;
    if (heroAlvo) c1.textContent = ehAcai ? tx("montar") : "+ " + td(esc.f.item.n) + " · " + esc.f.item.p + "$";
    $("nvHeroC2").textContent = tx("vermenu");
  });

  /* separador «O meu pedido»: copia o que a barra antiga já mostra (quantidade e valor) */
  var desenharPedido = seguro(function () {
    var velha = D.querySelector(".bar"), n = parseInt(($("cnt") || {}).textContent, 10) || 0, t3 = $("nvT3");
    $("nvCnt").textContent = n;
    t3.classList.toggle("tem", n > 0);
    t3.lastChild.textContent = n > 0 ? t("verped") + " · " + (($("ctot") || {}).textContent || "") : tx("pedido");
    t3.hidden = !!(velha && velha.style.display === "none");                 // loja fechada na Gestão: não há pedidos
    nvNav.classList.toggle("dois", t3.hidden);
  });

  var desenharPagar = seguro(function () {
    if (!$("nvPayT")) return;
    $("nvPayT").textContent = total() + " ECV";
    var n = cart.reduce(function (s, i) { return s + i.q; }, 0);
    $("nvResT").textContent = n + " " + (n === 1 ? t("item") : t("itens")) + ": " + cart.map(function (i) { return td(i.name); }).join(", ");
    $("nvP3").textContent = pagaAntes() ? tx("p3") : tx("p3b");
  });

  var irMenu = function () { try { $("nvMenuT").scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) { $("nvMenuT").scrollIntoView(); } };
  var marcarSeparador = seguro(function () {
    var noMenu = $("nvMenuT").getBoundingClientRect().top < window.innerHeight * 0.45;
    $("nvT1").classList.toggle("on", !noMenu); $("nvT2").classList.toggle("on", noMenu);
  });

  function ligar() {
    /* toques */
    $("nvT1").addEventListener("click", function () { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); } });
    $("nvT2").addEventListener("click", irMenu);
    $("nvT3").addEventListener("click", seguro(function () { openCart(); }));
    $("nvHeroC2").addEventListener("click", irMenu);
    verTudo.addEventListener("click", irMenu);
    $("nvHeroC1").addEventListener("click", seguro(function () {
      if (!heroAlvo) return;
      if (heroAlvo.c.prod === CAMP_PROD) abrirProduto(CAMP_PROD); else pick(heroAlvo.f.ci, heroAlvo.f.ii);
    }));
    var marcaA = D.querySelector(".brand-lockup");
    if (marcaA) marcaA.addEventListener("click", function (e) { e.preventDefault(); $("nvT1").click(); });

    /* idioma: o botão abre a lista que o site já tinha (#langs) */
    var fecharLang = function () { H.classList.remove("nv-lg"); btLang.setAttribute("aria-expanded", "false"); };
    btLang.addEventListener("click", function (e) { e.stopPropagation(); var a = H.classList.toggle("nv-lg"); btLang.setAttribute("aria-expanded", a ? "true" : "false"); });
    D.addEventListener("click", function (e) { if (H.classList.contains("nv-lg") && !e.target.closest("#nvLang")) fecharLang(); });
    window.addEventListener("scroll", function () { if (H.classList.contains("nv-lg")) fecharLang(); }, { passive: true });

    /* finalizar */
    if ($("nvPayB")) {
      $("nvRes").addEventListener("click", seguro(function () { openCart(); }));
      $("nvPayB").addEventListener("click", async function () {
        try { await sendWA(); } catch (e) { }
        /* o pedido não seguiu por faltar a zona ou o banco (o site já avisou): mostra-se onde é, porque o botão está sempre à vista */
        try {
          if (!chk.classList.contains("on")) return;
          var falta = (mode === "entrega" && !zona) ? $("deliveryBox")
            : ($("fName").value.trim() && $("fTel").value.replace(/\D/g, "").length >= 7 && pagaAntes() && !banco) ? $("payBox") : null;
          if (falta) falta.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) { }
      });
    }

    /* acompanhar o site sem lhe mexer: quando ele muda os números ou a língua, copia-se */
    var ver = function (alvo, opc, f) { if (alvo && window.MutationObserver) new MutationObserver(f).observe(alvo, opc); };
    ver(H, { attributes: true, attributeFilter: ["lang"] }, textos);
    ver($("cnt"), { childList: true, characterData: true, subtree: true }, desenharPedido);
    ver($("ctot"), { childList: true, characterData: true, subtree: true }, desenharPedido);
    ver(D.querySelector(".bar"), { attributes: true, attributeFilter: ["style", "class"] }, function () { desenharPedido(); desenharEstado(); });
    ver($("chkTotals"), { childList: true, characterData: true, subtree: true }, desenharPagar);
    ver($("bestGrid"), { childList: true }, function () { desenharHero(); desenharEstado(); });       // o menu foi redesenhado (esgotados, loja fechada…)
    var pend = false;
    window.addEventListener("scroll", function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; marcarSeparador(); }); }, { passive: true });
    setInterval(desenharEstado, 60000);

    textos(); marcarSeparador();
    try { if (typeof desenharNav === "function") desenharNav(); } catch (e) { }
  }
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", ligar); else ligar();
})();
