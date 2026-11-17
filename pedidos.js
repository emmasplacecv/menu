/* APP DE CLIENTE da Emma's Place (17-11-2026) — parte que corre DEPOIS do resto da página.
   - OS MEUS PEDIDOS: cada pedido feito neste telemóvel fica guardado aqui (60 dias), com «Repetir».
   - SEGUIR O PEDIDO: o servidor dá a cada pedido uma senha; com ela a app pergunta o estado
     (recebido → pagamento confirmado → em preparação → pronto/a caminho → entregue) de 20 em 20 s.
   - SEM REDE: faixa no topo; o menu abre com a cópia guardada; o pedido só se envia com rede.
   - CARRINHO GUARDADO: fechar a app não perde o carrinho (24 h).
   - INSTALAR: cartão «Instale a app» no telemóvel, e instruções no iPhone e no Instagram/Facebook.
   Se este ficheiro falhar, o site funciona como antes. */
(function () {
  "use strict";
  var W = window, D = document, H = D.documentElement;
  var $ = function (id) { return D.getElementById(id); };
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); };
  var LSP = "ep_pedidos", LSC = "ep_carrinho", LSI = "ep_app_nao", DIA = 86400000;
  var APP = W.EP_APP || {};

  var TX = {
    pt: { tit: "Os meus pedidos", vazio: "Ainda não fez pedidos neste telemóvel.", emCurso: "Em curso", anteriores: "Anteriores",
      s0: "Recebido", s1p: "Pago", s1: "Confirmado", s2: "Em preparação", s3r: "Pronto", s3e: "A caminho", s4r: "Levantado", s4e: "Entregue",
      aTransf: "À espera da transferência e do comprovativo.", aComp: "Comprovativo recebido. Estamos a confirmar o pagamento.", aConf: "Estamos a confirmar o pedido.",
      fila: "Pagamento confirmado. Na fila da cozinha.", filaB: "Pedido confirmado. Na fila da cozinha.", visto: "A cozinha já viu o seu pedido.", prep: "A preparar agora.",
      prontoR: "Pode levantar no balcão, na carrinha do Plateau.", prontoE: "O pedido saiu para entrega.", fim: "Obrigado! Bom proveito.",
      canc: "Cancelado", cancT: "Se já tinha pago, fale connosco: geral@emmasplace.cv ou +238 989 53 24.",
      semEst: "O estado deste pedido não está disponível. Siga pelo WhatsApp.", atual: "Actualizado às {h}", velho: "Sem rede: o estado pode estar desactualizado.",
      repetir: "Repetir", tirar: "Tirar da lista", hora: "Hora marcada: {h}", recolha: "Levantar", entrega: "Entrega",
      toastR: "O seu pedido {c} está pronto! Pode levantar.", toastE: "O seu pedido {c} saiu para entrega!",
      pill: "Pedido {c}", ver: "Ver",
      semRede: "Sem rede. Pode ver o menu e preparar o pedido; para o enviar precisa de rede.", copia: "Menu guardado às {h}.",
      semRedeEnv: "Está sem rede. O pedido fica no carrinho: envie-o quando a rede voltar.",
      instTit: "Instale a app da Emma's Place", instTxt: "Fica no ecrã do telemóvel, abre sem rede e mostra o estado do pedido.", instBt: "Instalar", instRod: "📲 Instalar a app",
      iosTit: "Instalar no iPhone", ios1: "No Safari, toque em Partilhar: o quadrado com a seta para cima, em baixo.", ios2: "Escolha «Adicionar ao ecrã principal».", ios3: "Toque em «Adicionar». A app fica no ecrã.",
      andTit: "Instalar no Android", and1: "No Chrome, toque no menu ⋮, em cima à direita.", and2: "Escolha «Instalar app» ou «Adicionar ao ecrã principal».",
      inTit: "Abra no navegador", inTxt: "Dentro do Instagram, Facebook ou TikTok não é possível instalar. Abra esta página no Chrome (Android) ou no Safari (iPhone) e instale a partir daí.",
      copiar: "Copiar o endereço", copiado: "Copiado ✓", fechar: "Fechar", jaInst: "A app já está instalada neste telemóvel." },
    en: { tit: "My orders", vazio: "You haven't ordered on this phone yet.", emCurso: "In progress", anteriores: "Earlier",
      s0: "Received", s1p: "Paid", s1: "Confirmed", s2: "Preparing", s3r: "Ready", s3e: "On the way", s4r: "Collected", s4e: "Delivered",
      aTransf: "Waiting for the transfer and the proof of payment.", aComp: "Proof of payment received. We are confirming the payment.", aConf: "We are confirming the order.",
      fila: "Payment confirmed. In the kitchen queue.", filaB: "Order confirmed. In the kitchen queue.", visto: "The kitchen has seen your order.", prep: "Being prepared now.",
      prontoR: "You can collect it at the counter, at the van in Plateau.", prontoE: "Your order is out for delivery.", fim: "Thank you! Enjoy.",
      canc: "Cancelled", cancT: "If you had already paid, contact us: geral@emmasplace.cv or +238 989 53 24.",
      semEst: "The status of this order is not available. Follow it on WhatsApp.", atual: "Updated at {h}", velho: "No connection: the status may be out of date.",
      repetir: "Order again", tirar: "Remove from list", hora: "Scheduled time: {h}", recolha: "Pick-up", entrega: "Delivery",
      toastR: "Your order {c} is ready! You can collect it.", toastE: "Your order {c} is out for delivery!",
      pill: "Order {c}", ver: "View",
      semRede: "No connection. You can browse the menu and build your order; you need a connection to send it.", copia: "Menu saved at {h}.",
      semRedeEnv: "You are offline. The order stays in your basket: send it when the connection is back.",
      instTit: "Install the Emma's Place app", instTxt: "It sits on your home screen, opens offline and shows your order status.", instBt: "Install", instRod: "📲 Install the app",
      iosTit: "Install on iPhone", ios1: "In Safari, tap Share: the square with the arrow pointing up, at the bottom.", ios2: "Choose “Add to Home Screen”.", ios3: "Tap “Add”. The app appears on your home screen.",
      andTit: "Install on Android", and1: "In Chrome, tap the ⋮ menu, top right.", and2: "Choose “Install app” or “Add to Home screen”.",
      inTit: "Open in your browser", inTxt: "You can't install from inside Instagram, Facebook or TikTok. Open this page in Chrome (Android) or Safari (iPhone) and install from there.",
      copiar: "Copy the address", copiado: "Copied ✓", fechar: "Close", jaInst: "The app is already installed on this phone." },
    fr: { tit: "Mes commandes", vazio: "Vous n'avez pas encore commandé sur ce téléphone.", emCurso: "En cours", anteriores: "Précédentes",
      s0: "Reçue", s1p: "Payée", s1: "Confirmée", s2: "En préparation", s3r: "Prête", s3e: "En route", s4r: "Retirée", s4e: "Livrée",
      aTransf: "En attente du virement et du justificatif.", aComp: "Justificatif reçu. Nous confirmons le paiement.", aConf: "Nous confirmons la commande.",
      fila: "Paiement confirmé. Dans la file de la cuisine.", filaB: "Commande confirmée. Dans la file de la cuisine.", visto: "La cuisine a vu votre commande.", prep: "En préparation.",
      prontoR: "Vous pouvez la retirer au comptoir, au camion du Plateau.", prontoE: "Votre commande est partie en livraison.", fim: "Merci ! Bon appétit.",
      canc: "Annulée", cancT: "Si vous aviez déjà payé, contactez-nous : geral@emmasplace.cv ou +238 989 53 24.",
      semEst: "Le statut de cette commande n'est pas disponible. Suivez-la sur WhatsApp.", atual: "Mis à jour à {h}", velho: "Hors ligne : le statut peut ne pas être à jour.",
      repetir: "Recommander", tirar: "Retirer de la liste", hora: "Heure prévue : {h}", recolha: "À emporter", entrega: "Livraison",
      toastR: "Votre commande {c} est prête ! Vous pouvez la retirer.", toastE: "Votre commande {c} est partie en livraison !",
      pill: "Commande {c}", ver: "Voir",
      semRede: "Hors ligne. Vous pouvez consulter le menu et préparer la commande ; il faut une connexion pour l'envoyer.", copia: "Menu enregistré à {h}.",
      semRedeEnv: "Vous êtes hors ligne. La commande reste dans le panier : envoyez-la quand la connexion revient.",
      instTit: "Installez l'app Emma's Place", instTxt: "Elle reste sur l'écran du téléphone, s'ouvre hors ligne et montre le statut de la commande.", instBt: "Installer", instRod: "📲 Installer l'app",
      iosTit: "Installer sur iPhone", ios1: "Dans Safari, touchez Partager : le carré avec la flèche vers le haut, en bas.", ios2: "Choisissez « Sur l'écran d'accueil ».", ios3: "Touchez « Ajouter ». L'app apparaît sur l'écran.",
      andTit: "Installer sur Android", and1: "Dans Chrome, touchez le menu ⋮, en haut à droite.", and2: "Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
      inTit: "Ouvrir dans le navigateur", inTxt: "Impossible d'installer depuis Instagram, Facebook ou TikTok. Ouvrez cette page dans Chrome (Android) ou Safari (iPhone) et installez-la depuis là.",
      copiar: "Copier l'adresse", copiado: "Copiée ✓", fechar: "Fermer", jaInst: "L'app est déjà installée sur ce téléphone." },
    de: { tit: "Meine Bestellungen", vazio: "Sie haben auf diesem Handy noch nicht bestellt.", emCurso: "Laufend", anteriores: "Frühere",
      s0: "Erhalten", s1p: "Bezahlt", s1: "Bestätigt", s2: "In Zubereitung", s3r: "Fertig", s3e: "Unterwegs", s4r: "Abgeholt", s4e: "Geliefert",
      aTransf: "Warten auf die Überweisung und den Zahlungsnachweis.", aComp: "Zahlungsnachweis erhalten. Wir bestätigen die Zahlung.", aConf: "Wir bestätigen die Bestellung.",
      fila: "Zahlung bestätigt. In der Warteschlange der Küche.", filaB: "Bestellung bestätigt. In der Warteschlange der Küche.", visto: "Die Küche hat Ihre Bestellung gesehen.", prep: "Wird jetzt zubereitet.",
      prontoR: "Sie können sie an der Theke abholen, am Wagen im Plateau.", prontoE: "Ihre Bestellung ist unterwegs.", fim: "Danke! Guten Appetit.",
      canc: "Storniert", cancT: "Falls Sie schon bezahlt haben, schreiben Sie uns: geral@emmasplace.cv oder +238 989 53 24.",
      semEst: "Der Status dieser Bestellung ist nicht verfügbar. Verfolgen Sie sie über WhatsApp.", atual: "Aktualisiert um {h}", velho: "Offline: Der Status ist eventuell nicht aktuell.",
      repetir: "Erneut bestellen", tirar: "Aus der Liste entfernen", hora: "Vereinbarte Zeit: {h}", recolha: "Abholung", entrega: "Lieferung",
      toastR: "Ihre Bestellung {c} ist fertig! Sie können sie abholen.", toastE: "Ihre Bestellung {c} ist unterwegs!",
      pill: "Bestellung {c}", ver: "Ansehen",
      semRede: "Offline. Sie können das Menü ansehen und die Bestellung vorbereiten; zum Senden brauchen Sie Internet.", copia: "Menü gespeichert um {h}.",
      semRedeEnv: "Sie sind offline. Die Bestellung bleibt im Warenkorb: Senden Sie sie, sobald Sie wieder Internet haben.",
      instTit: "Installieren Sie die Emma's Place App", instTxt: "Sie liegt auf dem Startbildschirm, öffnet offline und zeigt den Status der Bestellung.", instBt: "Installieren", instRod: "📲 App installieren",
      iosTit: "Auf dem iPhone installieren", ios1: "Tippen Sie in Safari auf Teilen: das Quadrat mit dem Pfeil nach oben, unten.", ios2: "Wählen Sie „Zum Home-Bildschirm“.", ios3: "Tippen Sie auf „Hinzufügen“. Die App erscheint auf dem Bildschirm.",
      andTit: "Auf Android installieren", and1: "Tippen Sie in Chrome oben rechts auf das Menü ⋮.", and2: "Wählen Sie „App installieren“ oder „Zum Startbildschirm hinzufügen“.",
      inTit: "Im Browser öffnen", inTxt: "In Instagram, Facebook oder TikTok kann man nicht installieren. Öffnen Sie diese Seite in Chrome (Android) oder Safari (iPhone) und installieren Sie dort.",
      copiar: "Adresse kopieren", copiado: "Kopiert ✓", fechar: "Schließen", jaInst: "Die App ist auf diesem Handy schon installiert." },
    nl: { tit: "Mijn bestellingen", vazio: "U heeft op deze telefoon nog niet besteld.", emCurso: "Lopend", anteriores: "Eerdere",
      s0: "Ontvangen", s1p: "Betaald", s1: "Bevestigd", s2: "In bereiding", s3r: "Klaar", s3e: "Onderweg", s4r: "Opgehaald", s4e: "Bezorgd",
      aTransf: "Wachten op de overschrijving en het betalingsbewijs.", aComp: "Betalingsbewijs ontvangen. We bevestigen de betaling.", aConf: "We bevestigen de bestelling.",
      fila: "Betaling bevestigd. In de wachtrij van de keuken.", filaB: "Bestelling bevestigd. In de wachtrij van de keuken.", visto: "De keuken heeft uw bestelling gezien.", prep: "Wordt nu bereid.",
      prontoR: "U kunt hem ophalen aan de balie, bij de wagen in Plateau.", prontoE: "Uw bestelling is onderweg.", fim: "Dank u! Eet smakelijk.",
      canc: "Geannuleerd", cancT: "Als u al betaald had, neem contact op: geral@emmasplace.cv of +238 989 53 24.",
      semEst: "De status van deze bestelling is niet beschikbaar. Volg hem via WhatsApp.", atual: "Bijgewerkt om {h}", velho: "Offline: de status kan verouderd zijn.",
      repetir: "Opnieuw bestellen", tirar: "Uit de lijst halen", hora: "Afgesproken tijd: {h}", recolha: "Afhalen", entrega: "Bezorging",
      toastR: "Uw bestelling {c} is klaar! U kunt hem ophalen.", toastE: "Uw bestelling {c} is onderweg!",
      pill: "Bestelling {c}", ver: "Bekijk",
      semRede: "Offline. U kunt het menu bekijken en de bestelling voorbereiden; om te versturen heeft u internet nodig.", copia: "Menu opgeslagen om {h}.",
      semRedeEnv: "U bent offline. De bestelling blijft in het mandje: verstuur hem zodra u weer internet heeft.",
      instTit: "Installeer de Emma's Place-app", instTxt: "Staat op uw beginscherm, opent offline en toont de status van uw bestelling.", instBt: "Installeren", instRod: "📲 App installeren",
      iosTit: "Installeren op iPhone", ios1: "Tik in Safari op Deel: het vierkant met de pijl omhoog, onderaan.", ios2: "Kies ‘Zet op beginscherm’.", ios3: "Tik op ‘Voeg toe’. De app staat op uw scherm.",
      andTit: "Installeren op Android", and1: "Tik in Chrome rechtsboven op het menu ⋮.", and2: "Kies ‘App installeren’ of ‘Toevoegen aan startscherm’.",
      inTit: "Open in uw browser", inTxt: "Binnen Instagram, Facebook of TikTok kunt u niet installeren. Open deze pagina in Chrome (Android) of Safari (iPhone) en installeer daar.",
      copiar: "Adres kopiëren", copiado: "Gekopieerd ✓", fechar: "Sluiten", jaInst: "De app is al geïnstalleerd op deze telefoon." }
  };
  function lang() { try { return TX[LANG] ? LANG : "pt"; } catch (e) { return "pt"; } }
  function T(k) { return (TX[lang()] || TX.pt)[k] || TX.pt[k] || k; }
  function hora(t) { var d = new Date(t), p = function (n) { return ("0" + n).slice(-2); }; return p(d.getHours()) + ":" + p(d.getMinutes()); }
  function data(t) {
    var d = new Date(t), hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return hora(t);
    try { return d.toLocaleDateString(lang() === "pt" ? "pt-PT" : lang(), { day: "numeric", month: "short" }).replace(/\.$/, "") + " · " + hora(t); } catch (e) { return hora(t); }
  }

  /* ================= OS MEUS PEDIDOS (guardados no telemóvel) ================= */
  function ler() { try { var l = JSON.parse(localStorage.getItem(LSP) || "[]"); return Array.isArray(l) ? l.filter(function (p) { return p && p.code && Date.now() - p.t < 60 * DIA; }) : []; } catch (e) { return []; } }
  function gravar(l) { try { localStorage.setItem(LSP, JSON.stringify(l.slice(0, 20))); } catch (e) { } }
  var FINAIS = { entregue: 1, cancelado: 1 };
  function ativo(p) { return !FINAIS[p.est] && Date.now() - p.t < 2 * DIA; }
  function segue(p) { return ativo(p) && /^[0-9a-f]{24}$/.test(p.s || ""); }

  /* chamado pelo site quando um pedido fica registado (antes de limpar o carrinho) */
  function novo(info, resp, extra) {
    extra = extra || {};
    var p = { code: String(info.code || ""), t: Date.now(), total: info.total, modo: extra.modo === "entrega" ? "entrega" : "recolha",
      slot: extra.slot || "", quando: extra.quando || "", itens: (extra.itens || []).slice(0, 15), items: (extra.items || []).slice(0, 30),
      prePaga: !!extra.prePaga, est: "aguarda" };
    if (resp && resp.ok && resp.id && resp.seg && /^\d{4}-\d{2}-\d{2}$/.test(resp.dia || "")) { p.id = resp.id; p.dia = resp.dia; p.s = resp.seg; }
    var l = ler().filter(function (x) { return x.code !== p.code; });
    l.unshift(p); gravar(l);
    desenharPill();
    setTimeout(function () { perguntar(true); }, 4000);
  }

  /* ---------- perguntar o estado ao servidor ---------- */
  var aPerguntar = false;
  async function perguntar(ja) {
    if (aPerguntar || navigator.onLine === false) return;
    if (!ja && D.hidden) return;
    var l = ler(), alvo = l.filter(segue).slice(0, 3);
    if (!alvo.length) return;
    aPerguntar = true;
    var mudou = false;
    for (var i = 0; i < alvo.length; i++) {
      var p = alvo[i];
      try {
        var r = await fetch(PROMO_API + "/pedido?dia=" + p.dia + "&id=" + encodeURIComponent(p.id) + "&s=" + p.s, { cache: "no-store" });
        var d = await r.json();
        if (d && d.ok) {
          var antes = p.est;
          p.est = d.est; p.conf = !!d.conf; p.visto = !!d.visto; p.comp = !!d.comp; p.cartao = !!d.cartao; p.prePaga = !!d.prePaga; p.upd = Date.now(); p.falhas = 0;
          if (d.slot) p.slot = d.slot; if (d.quando) p.quando = d.quando;
          mudou = true;
          if (antes !== p.est && (p.est === "pronto" || (p.est === "entregue" && antes !== "pronto" && p.modo === "entrega"))) avisarPronto(p);
        } else if (d && d.erro && /encontrado/i.test(d.erro)) { p.falhas = (p.falhas || 0) + 1; if (p.falhas >= 4) p.s = ""; mudou = true; }
      } catch (e) { }
    }
    if (mudou) { var todos = ler(); alvo.forEach(function (a) { var j = todos.findIndex(function (x) { return x.code === a.code; }); if (j >= 0) todos[j] = a; }); gravar(todos); }
    aPerguntar = false;
    desenharPill(); if (folhaAberta()) desenharFolha();
  }
  function avisarPronto(p) {
    try { if (navigator.vibrate) navigator.vibrate([220, 120, 220]); } catch (e) { }
    torrada(T(p.modo === "entrega" ? "toastE" : "toastR").replace("{c}", p.code));
  }
  function torrada(txt) {
    var t = $("epTorrada");
    if (!t) { t = D.createElement("div"); t.id = "epTorrada"; t.className = "ep-torrada"; t.setAttribute("role", "status"); D.body.appendChild(t); }
    t.textContent = txt; t.classList.add("on");
    clearTimeout(torrada.t); torrada.t = setTimeout(function () { t.classList.remove("on"); }, 7000);
  }

  /* ---------- passos do pedido ---------- */
  function passos(p) {
    var e = p.modo === "entrega";
    var nomes = [T("s0"), p.prePaga ? T("s1p") : T("s1"), T("s2"), T(e ? "s3e" : "s3r"), T(e ? "s4e" : "s4r")];
    var i = { aguarda: 0, confirmado: 1, preparar: 2, pronto: 3, entregue: 4 }[p.est];
    if (i == null) i = 0;
    var sub = p.est === "aguarda" ? (p.prePaga && !p.cartao ? (p.comp ? T("aComp") : T("aTransf")) : T("aConf"))
      : p.est === "confirmado" ? (p.visto ? T("visto") : T(p.prePaga ? "fila" : "filaB"))
      : p.est === "preparar" ? T("prep") : p.est === "pronto" ? T(e ? "prontoE" : "prontoR") : T("fim");
    return { nomes: nomes, i: i, sub: sub };
  }
  function htmlPedido(p, aberto) {
    var cab = '<div class="ep-pc-cab"><b>' + E(p.code) + '</b><span>' + E(data(p.t)) + ' · ' + E(T(p.modo)) + ' · ' + E(p.total) + ' ECV</span></div>';
    var corpo = "";
    if (p.est === "cancelado") corpo = '<div class="ep-canc"><b>' + E(T("canc")) + '</b><small>' + E(T("cancT")) + '</small></div>';
    else if (ativo(p) && !p.s) corpo = '<div class="ep-sub">' + E(T("semEst")) + '</div>';
    else if (ativo(p) || aberto) {
      var ps = passos(p);
      corpo = '<ol class="ep-passos" style="--n:' + ps.i + '">' + ps.nomes.map(function (n, k) {
        return '<li class="' + (k < ps.i ? "feito" : k === ps.i ? "agora" : "") + '"><i></i><span>' + E(n) + '</span></li>';
      }).join("") + '</ol><div class="ep-sub">' + E(ps.sub) + '</div>';
      if (p.slot && p.est !== "entregue") corpo += '<div class="ep-hora">' + E(T("hora").replace("{h}", p.slot + (p.quando && p.quando !== "hoje" ? " · " + p.quando : ""))) + '</div>';
      if (ativo(p)) corpo += '<div class="ep-upd">' + E(navigator.onLine === false ? T("velho") : p.upd ? T("atual").replace("{h}", hora(p.upd)) : "") + '</div>';
    } else {
      var ps2 = passos(p);
      corpo = '<div class="ep-fim">✓ ' + E(ps2.nomes[ps2.i]) + '</div>';
    }
    var itens = (p.itens || []).length ? '<div class="ep-itens">' + p.itens.map(E).join("<br>") + '</div>' : "";
    var bts = '<div class="ep-bts">' + ((p.items || []).length ? '<button type="button" class="ep-rep" data-a="rep" data-c="' + E(p.code) + '">↻ ' + E(T("repetir")) + '</button>' : "") +
      (!ativo(p) ? '<button type="button" class="ep-tira" data-a="tira" data-c="' + E(p.code) + '">' + E(T("tirar")) + '</button>' : "") + '</div>';
    return '<article class="ep-pc' + (ativo(p) ? " ativo" : "") + (p.est === "pronto" ? " pronto" : "") + '">' + cab + corpo + itens + bts + '</article>';
  }

  /* ---------- folha «Os meus pedidos» ---------- */
  var folha = null;
  function folhaAberta() { return !!(folha && folha.classList.contains("on")); }
  function criarFolha() {
    if (folha) return;
    folha = D.createElement("div");
    folha.className = "sheet ep-folha"; folha.id = "pedSheet";
    folha.setAttribute("role", "dialog"); folha.setAttribute("aria-modal", "true"); folha.setAttribute("aria-labelledby", "pedTit");
    folha.setAttribute("data-clarity-mask", "true");
    D.body.appendChild(folha);
    folha.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-a]"); if (!b) return;
      var a = b.getAttribute("data-a"), c = b.getAttribute("data-c");
      if (a === "fechar") return fechar();
      if (a === "rep") return repetir(c);
      if (a === "tira") { gravar(ler().filter(function (x) { return x.code !== c; })); desenharFolha(); desenharPill(); return; }
    });
  }
  function desenharFolha() {
    criarFolha();
    var l = ler(), at = l.filter(ativo), ant = l.filter(function (p) { return !ativo(p); });
    var h = '<div class="grab"></div><div class="ep-cab"><h3 id="pedTit">' + E(T("tit")) + '</h3><button type="button" class="ep-x" data-a="fechar" aria-label="' + E(T("fechar")) + '">✕</button></div>';
    if (!l.length) h += '<p class="ep-vazio">' + E(T("vazio")) + '</p>';
    if (at.length) h += '<div class="ep-sec">' + E(T("emCurso")) + '</div>' + at.map(function (p) { return htmlPedido(p, true); }).join("");
    if (ant.length) h += '<div class="ep-sec">' + E(T("anteriores")) + '</div>' + ant.slice(0, 10).map(function (p) { return htmlPedido(p, false); }).join("");
    h += '<button type="button" class="gs" data-a="fechar">' + E(T("fechar")) + '</button>';
    folha.innerHTML = h;
  }
  function abrir() {
    criarFolha(); desenharFolha();
    try { show("pedSheet"); } catch (e) { folha.classList.add("on"); }
    perguntar(true);
  }
  function fechar() { try { closeAll(); } catch (e) { if (folha) folha.classList.remove("on"); } }
  function repetir(code) {
    var p = ler().find(function (x) { return x.code === code; }); if (!p || !(p.items || []).length) return;
    var k = "ep_ultimo_pedido", antes = null;
    try { antes = localStorage.getItem(k); localStorage.setItem(k, JSON.stringify({ t: Date.now(), mode: p.modo, items: p.items })); } catch (e) { return; }
    try { closeAll(); repetirUltimo(); } catch (e) { }
    try { if (antes) localStorage.setItem(k, antes); else localStorage.removeItem(k); mostrarRepetir(); } catch (e) { }
  }

  /* ---------- botão flutuante do pedido em curso ---------- */
  var pill = null;
  function desenharPill() {
    var p = ler().filter(ativo)[0];
    if (!p) { if (pill) pill.hidden = true; return; }
    if (!pill) {
      pill = D.createElement("button"); pill.type = "button"; pill.id = "pedPill"; pill.className = "ep-pill";
      pill.addEventListener("click", abrir); D.body.appendChild(pill);
    }
    var ps = passos(p);
    pill.hidden = false;
    pill.classList.toggle("pronto", p.est === "pronto");
    pill.innerHTML = '<span class="ep-pt"><b>' + E(T("pill").replace("{c}", p.code)) + '</b><small>' + E(p.s ? ps.nomes[ps.i] + " · " + ps.sub : T("semEst")) + '</small></span><span class="ep-pv">' + E(T("ver")) + ' ›</span>';
  }

  /* ---------- entrada no carrinho ---------- */
  function botaoNoCarrinho() {
    var cs = $("cartSheet"); if (!cs) return;
    var b = $("pedNoCarrinho");
    var n = ler().length;
    if (!n) { if (b) b.remove(); return; }
    if (!b) {
      b = D.createElement("button"); b.type = "button"; b.id = "pedNoCarrinho"; b.className = "ep-nocarrinho";
      b.addEventListener("click", abrir);
      var h3 = cs.querySelector("h3"); if (h3) cs.insertBefore(b, h3); else cs.appendChild(b);
    }
    b.textContent = "📋 " + T("tit") + " (" + n + ")";
  }

  /* ================= SEM REDE ================= */
  var faixa = null;
  function desenharRede() {
    var sem = navigator.onLine === false;
    if (!faixa) { faixa = D.createElement("div"); faixa.id = "epSemRede"; faixa.className = "ep-semrede"; faixa.setAttribute("role", "status"); D.body.appendChild(faixa); }
    faixa.hidden = !sem;
    if (sem) faixa.textContent = "📵 " + T("semRede") + (APP.copiaDesde ? " " + T("copia").replace("{h}", data(APP.copiaDesde)) : "");
    if (!sem) perguntar(true);
    desenharPill(); if (folhaAberta()) desenharFolha();
  }
  function avisoSemRede() { try { alert(T("semRedeEnv")); } catch (e) { } }

  /* ================= CARRINHO GUARDADO ================= */
  function guardarCarrinho() {
    try {
      if (typeof cart === "undefined") return;
      if (!cart.length) { localStorage.removeItem(LSC); return; }
      localStorage.setItem(LSC, JSON.stringify({ t: Date.now(), mode: mode, items: cart.map(function (i) { return { n: i.name, m: i.meta, q: i.q }; }) }));
    } catch (e) { }
  }
  function restaurarCarrinho() {
    var d = null; try { d = JSON.parse(localStorage.getItem(LSC) || "null"); } catch (e) { }
    if (!d || !Array.isArray(d.items) || !d.items.length || Date.now() - d.t > DIA) { try { localStorage.removeItem(LSC); } catch (e) { } return; }
    try { if (cart.length) return; } catch (e) { return; }
    var k = "ep_ultimo_pedido", antes = null, oc = W.openCart, al = W.alert, mt = W.mtr;
    try { antes = localStorage.getItem(k); localStorage.setItem(k, JSON.stringify({ t: Date.now(), mode: d.mode, items: d.items })); } catch (e) { return; }
    W.openCart = function () { }; W.alert = function () { }; W.mtr = function () { };
    try { repetirUltimo(); } catch (e) { }
    W.openCart = oc; W.alert = al; W.mtr = mt;
    try { if (antes) localStorage.setItem(k, antes); else localStorage.removeItem(k); mostrarRepetir(); } catch (e) { }
  }

  /* ================= INSTALAR ================= */
  var UA = navigator.userAgent || "";
  var ios = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  var dentroDeApp = /Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|Snapchat|Line\//i.test(UA);
  var android = /Android/i.test(UA);
  function podeMostrarCartao() {
    if (APP.emApp || APP.instalada) return false;
    try { if (Date.now() - Number(localStorage.getItem(LSI) || 0) < 30 * DIA) return false; if (localStorage.getItem("ep_app_instalada")) return false; } catch (e) { }
    var tel = H.classList.contains("nv") || (W.matchMedia && matchMedia("(pointer:coarse)").matches);
    return tel && !!(APP.convite || ios || dentroDeApp);
  }
  var cartaoInst = null;
  function desenharInstalar() {
    var rod = $("epInstRod"), pe = D.querySelector(".site-footer .footer-emp") || D.querySelector(".site-footer .footer-bottom");
    var algum = !APP.emApp && !APP.instalada && !!(APP.convite || ios || dentroDeApp || android);
    if (algum && pe && !rod) {
      rod = D.createElement("button"); rod.type = "button"; rod.id = "epInstRod"; rod.className = "ep-instrod";
      rod.addEventListener("click", instalar); pe.parentNode.insertBefore(rod, pe);
    }
    if (rod) { rod.hidden = !algum; rod.textContent = T("instRod"); }
    var mostrar = podeMostrarCartao();
    if (mostrar && !cartaoInst) {
      cartaoInst = D.createElement("div"); cartaoInst.className = "ep-inst"; cartaoInst.id = "epInst";
      cartaoInst.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-a]"); if (!b) return;
        if (b.getAttribute("data-a") === "inst") instalar();
        else { try { localStorage.setItem(LSI, String(Date.now())); } catch (e) { } cartaoInst.remove(); cartaoInst = null; }
      });
      var ancora = $("nvPromo") || D.querySelector(".home-hero") || D.querySelector("main");
      if (ancora && ancora.parentNode) ancora.parentNode.insertBefore(cartaoInst, ancora.nextSibling); else D.body.appendChild(cartaoInst);
    }
    if (!mostrar && cartaoInst) { cartaoInst.remove(); cartaoInst = null; }
    if (cartaoInst) cartaoInst.innerHTML = '<img src="/app/icon-192.png" alt="" width="48" height="48"><div><b>' + E(T("instTit")) + '</b><small>' + E(T("instTxt")) + '</small></div>' +
      '<button type="button" class="ep-ib" data-a="inst">' + E(T("instBt")) + '</button><button type="button" class="ep-ix" data-a="nao" aria-label="' + E(T("fechar")) + '">✕</button>';
  }
  function instalar() {
    if (APP.convite) {
      var c = APP.convite; APP.convite = null;
      try { c.prompt(); c.userChoice.then(function (r) { if (r && r.outcome === "accepted") { APP.instalada = true; } desenharInstalar(); }); } catch (e) { }
      return;
    }
    var h;
    if (APP.emApp || APP.instalada) h = '<p>' + E(T("jaInst")) + '</p>';
    else if (dentroDeApp) h = '<h3>' + E(T("inTit")) + '</h3><p>' + E(T("inTxt")) + '</p><button type="button" class="go" data-a="copiar">' + E(T("copiar")) + '</button>';
    else if (ios) h = '<h3>' + E(T("iosTit")) + '</h3><ol class="ep-ios"><li><span class="ep-share" aria-hidden="true"></span>' + E(T("ios1")) + '</li><li>' + E(T("ios2")) + '</li><li>' + E(T("ios3")) + '</li></ol>';
    else h = '<h3>' + E(T("andTit")) + '</h3><ol class="ep-ios"><li>' + E(T("and1")) + '</li><li>' + E(T("and2")) + '</li></ol>';
    var s = $("instSheet");
    if (!s) {
      s = D.createElement("div"); s.className = "sheet ep-folha"; s.id = "instSheet"; s.setAttribute("role", "dialog"); s.setAttribute("aria-modal", "true");
      D.body.appendChild(s);
      s.addEventListener("click", function (ev) {
        var b = ev.target.closest("[data-a]"); if (!b) return;
        if (b.getAttribute("data-a") === "copiar") {
          var u = location.origin + "/?app=1";
          try { navigator.clipboard.writeText(u).then(function () { b.textContent = T("copiado"); }); } catch (e) { prompt("", u); }
        } else fechar();
      });
    }
    s.innerHTML = '<div class="grab"></div>' + h + '<button type="button" class="gs" data-a="fechar">' + E(T("fechar")) + '</button>';
    try { show("instSheet"); } catch (e) { s.classList.add("on"); }
  }

  /* ================= ligar ao site ================= */
  try {
    var closeOrig = W.closeAll;
    if (typeof closeOrig === "function") W.closeAll = function () {
      var r = closeOrig.apply(this, arguments);
      ["pedSheet", "instSheet"].forEach(function (i) { var s = $(i); if (s) s.classList.remove("on"); });
      return r;
    };
    var refreshOrig = W.refresh;
    if (typeof refreshOrig === "function") W.refresh = function () { var r = refreshOrig.apply(this, arguments); guardarCarrinho(); botaoNoCarrinho(); return r; };
    var setLangOrig = W.setLang;
    if (typeof setLangOrig === "function") W.setLang = function () { var r = setLangOrig.apply(this, arguments); tudo(); return r; };
  } catch (e) { }
  function tudo() { desenharPill(); botaoNoCarrinho(); desenharInstalar(); desenharRede(); if (folhaAberta()) desenharFolha(); }

  W.EP_PEDIDOS = { novo: novo, abrir: abrir, avisoSemRede: avisoSemRede, perguntar: perguntar, lista: ler, instalar: instalar };
  W.addEventListener("ep-rede", desenharRede);
  W.addEventListener("ep-copia", function () { if (navigator.onLine === false) desenharRede(); });
  W.addEventListener("ep-instalar", desenharInstalar);
  D.addEventListener("visibilitychange", function () { if (!D.hidden) perguntar(true); });
  setInterval(function () { perguntar(false); }, 20000);
  tudo();
  try { if (typeof _menuPronto !== "undefined") _menuPronto.then(restaurarCarrinho); } catch (e) { }
  if (location.hash === "#pedidos") setTimeout(abrir, 300);
  if (location.hash === "#menu") setTimeout(function () { var m = $("menuCards") || $("catNav"); if (m) m.scrollIntoView({ block: "start" }); }, 600);
  setTimeout(function () { perguntar(true); }, 1500);
})();
