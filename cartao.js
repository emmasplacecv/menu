/* PAGAMENTO POR CARTÃO — SISP / rede vinti4 (16-11-2026)
   - Só aparece quando o servidor diz que o cartão está ligado (/estado → cartao:true). Até lá este
     ficheiro não muda nada no site.
   - O cliente paga na página segura da SISP: o site e o servidor da Emma's Place nunca veem o cartão.
   - O valor cobrado é o que o servidor calculou, não o que o telemóvel mostra.
   - Se o pagamento falhar ou for cancelado, o pedido fica guardado: tentar outra vez ou transferir.
   Carrega depois do código principal. Se falhar, o site funciona como antes, só com transferência. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); };
  var LS = "ep_cartao", PRAZO = 45 * 60000;
  var TX = {
    pt: { fTit: "Dados pedidos pelo banco (3-D Secure)", fEmail: "Email", fMorada: "Morada", fCidade: "Cidade", fCp: "Código postal", fNota: "Servem só para o banco confirmar que o cartão é seu.", errEmail: "Escreva um email válido, por favor.", errMorada: "Escreva a sua morada, cidade e código postal, por favor.",
      pagTit: "Pagamento", pagNota: "Escolha como quer pagar:", chip: "Cartão", tit: "Cartão (rede vinti4)", l1: "Paga na página segura da SISP (rede vinti4). A Emma's Place não vê nem guarda os dados do seu cartão.",
      l2: "Sem comprovativo: o pedido fica confirmado assim que o pagamento é aprovado.", valor: "Valor a pagar",
      okT: "Pagamento recebido", okP: "O pedido {c} está confirmado e já seguiu para a cozinha. Não precisa de enviar comprovativo.",
      falT: "Pagamento não concluído", falP: "Não foi cobrado nada. O pedido {c} fica guardado durante 45 minutos.",
      canT: "Pagamento cancelado", expT: "Já não é possível pagar este pedido", expP: "O prazo deste pedido terminou. Faça um pedido novo, por favor.",
      errP: "Não conseguimos confirmar o pagamento. Se o valor saiu da sua conta, fale connosco: geral@emmasplace.cv.",
      outra: "Tentar outra vez com cartão", transf: "Pagar por transferência", fechar: "Fechar", ref: "Referência" },
    en: { fTit: "Details required by the bank (3-D Secure)", fEmail: "Email", fMorada: "Address", fCidade: "City", fCp: "Postcode", fNota: "Only used so the bank can confirm the card is yours.", errEmail: "Please enter a valid email.", errMorada: "Please enter your address, city and postcode.",
      pagTit: "Payment", pagNota: "Choose how you want to pay:", chip: "Card", tit: "Card (rede vinti4)", l1: "You pay on the secure SISP page (vinti4 network). Emma's Place never sees or stores your card details.",
      l2: "No proof of payment needed: the order is confirmed as soon as the payment is approved.", valor: "Amount to pay",
      okT: "Payment received", okP: "Order {c} is confirmed and already with the kitchen. No proof of payment needed.",
      falT: "Payment not completed", falP: "Nothing was charged. Order {c} is kept for 45 minutes.",
      canT: "Payment cancelled", expT: "This order can no longer be paid", expP: "The time for this order has run out. Please place a new order.",
      errP: "We could not confirm the payment. If the amount left your account, contact us: geral@emmasplace.cv.",
      outra: "Try again by card", transf: "Pay by bank transfer", fechar: "Close", ref: "Reference" },
    fr: { fTit: "Informations demandées par la banque (3-D Secure)", fEmail: "E-mail", fMorada: "Adresse", fCidade: "Ville", fCp: "Code postal", fNota: "Elles servent uniquement à la banque pour confirmer que la carte est la vôtre.", errEmail: "Merci d'indiquer un e-mail valide.", errMorada: "Merci d'indiquer votre adresse, ville et code postal.",
      pagTit: "Paiement", pagNota: "Choisissez comment payer :", chip: "Carte", tit: "Carte (rede vinti4)", l1: "Vous payez sur la page sécurisée de la SISP (réseau vinti4). Emma's Place ne voit ni ne conserve les données de votre carte.",
      l2: "Sans justificatif : la commande est confirmée dès que le paiement est approuvé.", valor: "Montant à payer",
      okT: "Paiement reçu", okP: "La commande {c} est confirmée et déjà en cuisine. Aucun justificatif à envoyer.",
      falT: "Paiement non abouti", falP: "Rien n'a été débité. La commande {c} est conservée 45 minutes.",
      canT: "Paiement annulé", expT: "Cette commande ne peut plus être payée", expP: "Le délai de cette commande est écoulé. Merci de passer une nouvelle commande.",
      errP: "Nous n'avons pas pu confirmer le paiement. Si le montant a été débité, contactez-nous : geral@emmasplace.cv.",
      outra: "Réessayer par carte", transf: "Payer par virement", fechar: "Fermer", ref: "Référence" },
    de: { fTit: "Von der Bank verlangte Angaben (3-D Secure)", fEmail: "E-Mail", fMorada: "Adresse", fCidade: "Stadt", fCp: "Postleitzahl", fNota: "Sie dienen nur dazu, dass die Bank bestätigen kann, dass die Karte Ihnen gehört.", errEmail: "Bitte geben Sie eine gültige E-Mail an.", errMorada: "Bitte geben Sie Adresse, Stadt und Postleitzahl an.",
      pagTit: "Zahlung", pagNota: "Wählen Sie, wie Sie zahlen möchten:", chip: "Karte", tit: "Karte (rede vinti4)", l1: "Sie zahlen auf der sicheren Seite der SISP (vinti4-Netz). Emma's Place sieht und speichert Ihre Kartendaten nicht.",
      l2: "Kein Zahlungsnachweis nötig: Die Bestellung ist bestätigt, sobald die Zahlung genehmigt ist.", valor: "Zu zahlender Betrag",
      okT: "Zahlung erhalten", okP: "Bestellung {c} ist bestätigt und bereits in der Küche. Kein Zahlungsnachweis nötig.",
      falT: "Zahlung nicht abgeschlossen", falP: "Es wurde nichts abgebucht. Bestellung {c} bleibt 45 Minuten gespeichert.",
      canT: "Zahlung abgebrochen", expT: "Diese Bestellung kann nicht mehr bezahlt werden", expP: "Die Frist für diese Bestellung ist abgelaufen. Bitte bestellen Sie neu.",
      errP: "Wir konnten die Zahlung nicht bestätigen. Falls der Betrag abgebucht wurde, schreiben Sie uns: geral@emmasplace.cv.",
      outra: "Erneut mit Karte versuchen", transf: "Per Überweisung zahlen", fechar: "Schließen", ref: "Referenz" },
    nl: { fTit: "Gegevens gevraagd door de bank (3-D Secure)", fEmail: "E-mail", fMorada: "Adres", fCidade: "Stad", fCp: "Postcode", fNota: "Alleen zodat de bank kan bevestigen dat de kaart van u is.", errEmail: "Vul een geldig e-mailadres in.", errMorada: "Vul uw adres, stad en postcode in.",
      pagTit: "Betaling", pagNota: "Kies hoe u wilt betalen:", chip: "Kaart", tit: "Kaart (rede vinti4)", l1: "U betaalt op de beveiligde pagina van SISP (vinti4-netwerk). Emma's Place ziet en bewaart uw kaartgegevens niet.",
      l2: "Geen betalingsbewijs nodig: de bestelling is bevestigd zodra de betaling is goedgekeurd.", valor: "Te betalen bedrag",
      okT: "Betaling ontvangen", okP: "Bestelling {c} is bevestigd en al bij de keuken. Geen betalingsbewijs nodig.",
      falT: "Betaling niet voltooid", falP: "Er is niets afgeschreven. Bestelling {c} blijft 45 minuten bewaard.",
      canT: "Betaling geannuleerd", expT: "Deze bestelling kan niet meer betaald worden", expP: "De tijd voor deze bestelling is verstreken. Plaats een nieuwe bestelling.",
      errP: "We konden de betaling niet bevestigen. Is het bedrag afgeschreven, neem dan contact op: geral@emmasplace.cv.",
      outra: "Opnieuw met kaart proberen", transf: "Betalen per overschrijving", fechar: "Sluiten", ref: "Referentie" }
  };
  function tx(k) { var l = "pt"; try { l = LANG; } catch (e) { } return (TX[l] || TX.pt)[k] || TX.pt[k] || k; }
  function ler() { try { var d = JSON.parse(localStorage.getItem(LS) || "null"); return d && Date.now() - d.t < 6 * 3600000 ? d : null; } catch (e) { return null; } }
  function gravar(d) { try { if (d) localStorage.setItem(LS, JSON.stringify(d)); else localStorage.removeItem(LS); } catch (e) { } }

  /* dados que os bancos pedem para a autenticação 3-D Secure: email e morada de faturação.
     Ficam lembrados neste telemóvel para a próxima vez. */
  var LSF = "ep_cartao_fat", F = { email: "", morada: "", cidade: "Praia", cp: "7600" };
  try { var f0 = JSON.parse(localStorage.getItem(LSF) || "null"); if (f0) ["email", "morada", "cidade", "cp"].forEach(function (k) { if (typeof f0[k] === "string" && f0[k]) F[k] = f0[k].slice(0, 100); }); } catch (e) { }
  function fat(el) { F[el.name] = el.value; try { localStorage.setItem(LSF, JSON.stringify(F)); } catch (e) { } }
  function dados() { return { email: F.email.trim(), morada: F.morada.trim(), cidade: F.cidade.trim(), cp: F.cp.trim() }; }
  function dadosOk() {
    var d = dados(), foco = function (id, k) { alert(tx(k)); var el = $(id); if (el) { el.scrollIntoView({ block: "center" }); el.focus(); } return false; };
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(d.email)) return foco("cfEmail", "errEmail");
    if (d.morada.length < 3) return foco("cfMorada", "errMorada");
    if (d.cidade.length < 2) return foco("cfCidade", "errMorada");
    if (!/[A-Za-z0-9]/.test(d.cp)) return foco("cfCp", "errMorada");
    return true;
  }
  /* quadro mostrado no checkout quando o cliente escolhe «Cartão» */
  function caixa(total) {
    if (!F.morada) { try { var a = $("fAddr"); if (a && mode === "entrega" && a.value.trim()) F.morada = a.value.trim().slice(0, 50); } catch (e) { } }
    var campo = function (id, k, nome, tipo, auto, max) {
      return '<label class="cf-c' + (nome === "cidade" || nome === "cp" ? " meio" : "") + '"><span>' + E(tx(k)) + '</span><input id="' + id + '" name="' + nome + '" type="' + tipo + '" autocomplete="' + auto +
        '" maxlength="' + max + '" value="' + E(F[nome]) + '" oninput="EP_CARTAO.fat(this)" data-clarity-mask="true"></label>';
    };
    return '<div class="bk">' + E(tx("tit")) + '</div><div class="bnota">' + E(tx("l1")) + '</div><div class="bnota">' + E(tx("l2")) + '</div>' +
      '<div class="cf-campos"><b>' + E(tx("fTit")) + '</b>' + campo("cfEmail", "fEmail", "email", "email", "email", 100) + campo("cfMorada", "fMorada", "morada", "text", "street-address", 50) +
      campo("cfCidade", "fCidade", "cidade", "text", "address-level2", 50) + campo("cfCp", "fCp", "cp", "text", "postal-code", 16) + '<small>' + E(tx("fNota")) + '</small></div>' +
      '<div class="ln"><span>' + E(tx("valor")) + '</span><span class="amt">' + E(total) + ' ECV</span></div>';
  }
  /* depois de o pedido ficar registado: guardar o essencial e seguir para a SISP */
  function ir(url, info) {
    var u; try { u = new URL(url); } catch (e) { return false; }
    try { if (u.origin !== new URL(PROMO_API).origin || u.pathname !== "/pagar") return false; } catch (e) { return false; }
    var l = "pt"; try { l = LANG; } catch (e) { }
    u.searchParams.set("l", l === "pt" ? "pt" : "en");
    gravar({ t: Date.now(), url: u.href, code: info.code, nome: info.nome, tel: info.tel, total: info.total, resumo: info.resumo });
    location.href = u.href;
    return true;
  }
  /* o pedido já está registado; passa a ser pago por transferência, pelo caminho de sempre */
  function paraTransferencia(info) {
    var b = BANCOS.find(function (x) { return x.pref; }) || BANCOS[0];
    var bloco = ["*PAGAMENTO — TRANSFERÊNCIA*", "Banco: " + b.b, "Titular: " + b.t, b.lbl + ": " + b.c, "Valor: " + info.total + " ECV", "Descrição: " + info.code, "", MARCA_COMP].join("\n");
    gravar(null); fechar();
    mostrarConfirmacao(true, { code: info.code, nome: info.nome, tel: info.tel, total: info.total, banco: b,
      resumo: String(info.resumo || "").replace("*PAGAMENTO — CARTÃO (vinti4)*", bloco) });
  }
  function fechar() { var s = $("cartaoFim"); if (s) s.remove(); document.body.style.overflow = ""; }
  /* o cliente voltou da SISP: ?cartao=ok|falhou|cancelado|expirou|erro&c=REFERÊNCIA */
  function voltou() {
    var q = new URLSearchParams(location.search), st = q.get("cartao");
    if (!st) return;
    var cod = (q.get("c") || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 24), g = ler();
    if (g && cod && g.code !== cod) g = null;
    q.delete("cartao"); q.delete("c");
    try { history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } catch (e) { }
    var ok = st === "ok", tentar = (st === "falhou" || st === "cancelado") && g && Date.now() - g.t < PRAZO;
    var tit = ok ? tx("okT") : st === "cancelado" ? tx("canT") : st === "falhou" ? tx("falT") : tx("expT");
    var txt = ok ? tx("okP") : (st === "falhou" || st === "cancelado") ? tx("falP") : st === "expirou" ? tx("expP") : tx("errP");
    if (ok) gravar(null);
    var s = document.createElement("div");
    s.id = "cartaoFim"; s.className = "cartao-fim" + (ok ? " ok" : ""); s.setAttribute("role", "dialog"); s.setAttribute("aria-modal", "true");
    s.innerHTML = '<div class="cf-cx"><div class="cf-ic" aria-hidden="true">' + (ok ? "✓" : "!") + '</div><h2>' + E(tit) + '</h2>' +
      '<p>' + E(txt.replace("{c}", cod || "")) + '</p>' + (cod ? '<div class="cf-ref"><small>' + E(tx("ref")) + '</small><b>' + E(cod) + '</b></div>' : "") +
      (tentar ? '<button type="button" class="go" id="cfOutra">' + E(tx("outra")) + '</button><button type="button" class="gs" id="cfTransf">' + E(tx("transf")) + '</button>' : "") +
      '<button type="button" class="gs" id="cfFechar">' + E(tx("fechar")) + '</button></div>';
    document.body.appendChild(s); document.body.style.overflow = "hidden";
    $("cfFechar").onclick = fechar;
    if (tentar) {
      $("cfOutra").onclick = function () { location.href = g.url; };
      $("cfTransf").onclick = function () { paraTransferencia(g); };
    }
  }
  window.EP_CARTAO = { tx: tx, caixa: caixa, ir: ir, paraTransferencia: paraTransferencia, fat: fat, dados: dados, dadosOk: dadosOk };
  try { voltou(); } catch (e) { }
})();
