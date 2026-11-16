/* CONTA DE CLIENTE E CARTÃO DE BEBIDAS (16-11-2026)
   - Conta: nome + telemóvel + password. A password nunca sai do telemóvel: aqui é transformada numa
     "prova" (PBKDF2-SHA256, 600 000 voltas) e só a prova segue para o servidor.
   - Perfil: guarda as opções do checkout (levantar/entrega, zona, morada, piso, elevador) e mostra
     os pedidos feitos com a conta e o cartão de bebidas (a cada 9 pagas, a 10.ª é grátis).
   - Não mexe em preços: a bebida grátis entra pelas contas dos códigos promocionais (tipo "oferta").
   Carrega depois do código principal do site. Se falhar, o site funciona como antes, sem contas. */
(function () {
  "use strict";
  var API; try { API = PROMO_API; } catch (e) { return; }
  var $ = function (id) { return document.getElementById(id); };
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var LS = "ep_conta", VOLTAS = 600000;
  var sessao = "", conta = null, nomeGuardado = "", aba = "entrar", vista = "", msg = null, ocupado = false, ed = null, prefsPostas = false, trocar = false;
  try { var g = JSON.parse(localStorage.getItem(LS) || "null"); if (g && /^[0-9a-f]{64}$/.test(g.s)) { sessao = g.s; nomeGuardado = String(g.n || ""); } } catch (e) { }

  var TX = {
    pt: { conta: "A minha conta", entrar: "Entrar", criar: "Criar conta", nome: "O SEU NOME", tel: "TELEMÓVEL", senha: "PASSWORD", senha8: "Mínimo 8 caracteres. Fica só consigo: nem nós a conseguimos ler.",
      criarBtn: "Criar a minha conta", pq: "Com conta, os seus dados ficam guardados, vê os seus pedidos e, a cada 9 bebidas, a 10.ª é grátis.",
      priv: 'Ao criar conta aceita a <a href="privacidade/" target="_blank" rel="noopener">Política de Privacidade</a>.',
      esqueci: "Esqueceu a password? Peça uma provisória no balcão ou por mensagem no Instagram @emmasplace.cv.",
      e_nome: "Escreva o seu nome.", e_tel: "Número de telemóvel inválido.", e_senha: "A password precisa de pelo menos 8 caracteres (e de ser diferente da anterior).", e_existe: "Já existe uma conta com este número. Entre com a sua password.",
      e_dados: "Número ou password errados.", e_bloqueada: "Demasiadas tentativas. Tente daqui a 15 minutos.", e_rede: "Sem ligação. Tente outra vez.", e_sessao: "A sessão terminou. Entre outra vez.",
      e_travado: "Demasiados pedidos seguidos. Tente daqui a uns minutos.", e_nav: "Este navegador não permite criar conta em segurança. Actualize-o ou use outro.",
      ola: "Olá, {n}", cartao: "CARTÃO DE BEBIDAS", q: "Bebidas quentes", f: "Bebidas frias", m: "Matcha & coco", s: "Sumos naturais", k: "Milkshakes", q1: "bebida quente", f1: "bebida fria", m1: "bebida de matcha & coco", s1: "sumo natural", k1: "milkshake",
      regra: "A cada 9 bebidas pagas da mesma categoria, a 10.ª dessa categoria é grátis. Cada categoria tem o seu cartão (não se misturam) e cada bebida conta durante 30 dias.",
      regra2: "Conta quando confirmamos o pagamento de um pedido feito com a conta aberta. Açaí, comida e combos não contam.",
      de9: "{n} de 9", sai: "A mais antiga deixa de contar a {d}.", vazio: "Ainda sem bebidas neste cartão.",
      gratis: "1 {c} grátis", ateV: "até {v} ECV", valida: "válida até {d}", usar: "Usar neste pedido", emuso: "✓ Aplicada a este pedido", semcat: "Junte primeiro uma {c} ao pedido.",
      teto: "A bebida grátis vale até ao valor médio das 9 que pagou; a diferença, se houver, paga-se.",
      dados: "OS MEUS DADOS", guardar: "Guardar", guardado: "Guardado ✓", hist: "OS MEUS PEDIDOS", semhist: "Ainda não fez pedidos com a conta.",
      aguarda: "A aguardar confirmação", confirmado: "Confirmado", cancelado: "Cancelado",
      mudar: "Mudar a password", atual: "PASSWORD ACTUAL", nova: "NOVA PASSWORD", mudarBtn: "Guardar nova password", mudada: "Password mudada ✓", trocar: "Entrou com uma password provisória. Escolha agora a sua.",
      sair: "Sair", apagar: "Apagar a minha conta", apagarQ: "Apaga a conta, o cartão e o histórico. Não dá para desfazer. Escreva a sua password para confirmar.", apagarBtn: "Apagar definitivamente", voltar: "Voltar",
      chkFora: "A cada 9 bebidas da mesma categoria, a 10.ª é grátis.", chkEntrar: "Entrar ou criar conta", chkDentro: "Conta de {n}: este pedido conta para o cartão.", ver: "Ver", mostrar: "mostrar", esconder: "esconder", aguarde: "Um momento…", sempiso: "R/C" },
    en: { conta: "My account", entrar: "Sign in", criar: "Create account", nome: "YOUR NAME", tel: "MOBILE NUMBER", senha: "PASSWORD", senha8: "At least 8 characters. It stays with you: not even we can read it.",
      criarBtn: "Create my account", pq: "With an account your details are saved, you see your orders and, after every 9 drinks, the 10th is free.",
      priv: 'By creating an account you accept the <a href="privacidade/" target="_blank" rel="noopener">Privacy Policy</a>.',
      esqueci: "Forgot your password? Ask for a temporary one at the counter or by message on Instagram @emmasplace.cv.",
      e_nome: "Please write your name.", e_tel: "Invalid mobile number.", e_senha: "The password needs at least 8 characters (and must differ from the previous one).", e_existe: "There is already an account with this number. Sign in with your password.",
      e_dados: "Wrong number or password.", e_bloqueada: "Too many attempts. Try again in 15 minutes.", e_rede: "No connection. Please try again.", e_sessao: "Your session has ended. Please sign in again.",
      e_travado: "Too many requests. Try again in a few minutes.", e_nav: "This browser cannot create an account safely. Update it or use another one.",
      ola: "Hello, {n}", cartao: "DRINKS CARD", q: "Hot drinks", f: "Cold drinks", m: "Matcha & coconut", s: "Fresh juices", k: "Milkshakes", q1: "hot drink", f1: "cold drink", m1: "matcha & coconut drink", s1: "fresh juice", k1: "milkshake",
      regra: "After every 9 paid drinks of the same category, the 10th of that category is free. Each category has its own card (they do not mix) and each drink counts for 30 days.",
      regra2: "It counts when we confirm payment of an order placed while signed in. Açaí, food and combos do not count.",
      de9: "{n} of 9", sai: "The oldest one stops counting on {d}.", vazio: "No drinks on this card yet.",
      gratis: "1 free {c}", ateV: "up to {v} ECV", valida: "valid until {d}", usar: "Use on this order", emuso: "✓ Applied to this order", semcat: "Add a {c} to your order first.",
      teto: "The free drink is worth up to the average of the 9 you paid for; you pay any difference.",
      dados: "MY DETAILS", guardar: "Save", guardado: "Saved ✓", hist: "MY ORDERS", semhist: "No orders with this account yet.",
      aguarda: "Awaiting confirmation", confirmado: "Confirmed", cancelado: "Cancelled",
      mudar: "Change password", atual: "CURRENT PASSWORD", nova: "NEW PASSWORD", mudarBtn: "Save new password", mudada: "Password changed ✓", trocar: "You signed in with a temporary password. Choose your own now.",
      sair: "Sign out", apagar: "Delete my account", apagarQ: "This deletes the account, the card and the history. It cannot be undone. Type your password to confirm.", apagarBtn: "Delete permanently", voltar: "Back",
      chkFora: "After every 9 drinks, the 10th is free.", chkEntrar: "Sign in or create account", chkDentro: "{n}'s account: this order counts towards the card.", ver: "View", mostrar: "show", esconder: "hide", aguarde: "One moment…", sempiso: "Ground" },
    fr: { conta: "Mon compte", entrar: "Se connecter", criar: "Créer un compte", nome: "VOTRE NOM", tel: "TÉLÉPHONE PORTABLE", senha: "MOT DE PASSE", senha8: "Au moins 8 caractères. Il reste avec vous : même nous ne pouvons pas le lire.",
      criarBtn: "Créer mon compte", pq: "Avec un compte, vos données sont enregistrées, vous voyez vos commandes et, toutes les 9 boissons, la 10e est offerte.",
      priv: 'En créant un compte, vous acceptez la <a href="privacidade/" target="_blank" rel="noopener">Politique de confidentialité</a>.',
      esqueci: "Mot de passe oublié ? Demandez-en un provisoire au comptoir ou par message sur Instagram @emmasplace.cv.",
      e_nome: "Écrivez votre nom.", e_tel: "Numéro de portable invalide.", e_senha: "Le mot de passe doit avoir au moins 8 caractères (et être différent du précédent).", e_existe: "Un compte existe déjà avec ce numéro. Connectez-vous avec votre mot de passe.",
      e_dados: "Numéro ou mot de passe incorrect.", e_bloqueada: "Trop de tentatives. Réessayez dans 15 minutes.", e_rede: "Pas de connexion. Réessayez.", e_sessao: "La session est terminée. Reconnectez-vous.",
      e_travado: "Trop de demandes. Réessayez dans quelques minutes.", e_nav: "Ce navigateur ne permet pas de créer un compte en sécurité. Mettez-le à jour ou utilisez-en un autre.",
      ola: "Bonjour, {n}", cartao: "CARTE BOISSONS", q: "Boissons chaudes", f: "Boissons froides", m: "Matcha & coco", s: "Jus naturels", k: "Milkshakes", q1: "boisson chaude", f1: "boisson froide", m1: "boisson matcha & coco", s1: "boisson jus naturel", k1: "boisson milkshake",
      regra: "Toutes les 9 boissons payées de la même catégorie, la 10e de cette catégorie est offerte. Chaque catégorie a sa carte (elles ne se mélangent pas) et chaque boisson compte pendant 30 jours.",
      regra2: "Elle compte quand nous confirmons le paiement d'une commande passée en étant connecté. Açaí, plats et menus ne comptent pas.",
      de9: "{n} sur 9", sai: "La plus ancienne ne comptera plus le {d}.", vazio: "Pas encore de boissons sur cette carte.",
      gratis: "1 {c} offerte", ateV: "jusqu'à {v} ECV", valida: "valable jusqu'au {d}", usar: "Utiliser sur cette commande", emuso: "✓ Appliquée à cette commande", semcat: "Ajoutez d'abord une {c} à la commande.",
      teto: "La boisson offerte vaut jusqu'à la moyenne des 9 payées ; la différence éventuelle reste à payer.",
      dados: "MES DONNÉES", guardar: "Enregistrer", guardado: "Enregistré ✓", hist: "MES COMMANDES", semhist: "Pas encore de commandes avec ce compte.",
      aguarda: "En attente de confirmation", confirmado: "Confirmée", cancelado: "Annulée",
      mudar: "Changer le mot de passe", atual: "MOT DE PASSE ACTUEL", nova: "NOUVEAU MOT DE PASSE", mudarBtn: "Enregistrer le nouveau mot de passe", mudada: "Mot de passe changé ✓", trocar: "Vous êtes entré avec un mot de passe provisoire. Choisissez le vôtre maintenant.",
      sair: "Se déconnecter", apagar: "Supprimer mon compte", apagarQ: "Supprime le compte, la carte et l'historique. Irréversible. Saisissez votre mot de passe pour confirmer.", apagarBtn: "Supprimer définitivement", voltar: "Retour",
      chkFora: "Toutes les 9 boissons, la 10e est offerte.", chkEntrar: "Se connecter ou créer un compte", chkDentro: "Compte de {n} : cette commande compte pour la carte.", ver: "Voir", mostrar: "afficher", esconder: "masquer", aguarde: "Un instant…", sempiso: "RDC" },
    de: { conta: "Mein Konto", entrar: "Anmelden", criar: "Konto erstellen", nome: "IHR NAME", tel: "HANDYNUMMER", senha: "PASSWORT", senha8: "Mindestens 8 Zeichen. Es bleibt bei Ihnen: Auch wir können es nicht lesen.",
      criarBtn: "Mein Konto erstellen", pq: "Mit Konto bleiben Ihre Daten gespeichert, Sie sehen Ihre Bestellungen und nach je 9 Getränken ist das 10. gratis.",
      priv: 'Mit dem Erstellen des Kontos akzeptieren Sie die <a href="privacidade/" target="_blank" rel="noopener">Datenschutzerklärung</a>.',
      esqueci: "Passwort vergessen? Fragen Sie an der Theke oder per Nachricht auf Instagram @emmasplace.cv nach einem vorläufigen.",
      e_nome: "Bitte Namen eingeben.", e_tel: "Ungültige Handynummer.", e_senha: "Das Passwort braucht mindestens 8 Zeichen (und muss sich vom vorherigen unterscheiden).", e_existe: "Mit dieser Nummer gibt es bereits ein Konto. Melden Sie sich mit Ihrem Passwort an.",
      e_dados: "Nummer oder Passwort falsch.", e_bloqueada: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.", e_rede: "Keine Verbindung. Bitte erneut versuchen.", e_sessao: "Die Sitzung ist beendet. Bitte erneut anmelden.",
      e_travado: "Zu viele Anfragen. Bitte in einigen Minuten erneut versuchen.", e_nav: "Dieser Browser kann kein sicheres Konto erstellen. Bitte aktualisieren oder einen anderen verwenden.",
      ola: "Hallo, {n}", cartao: "GETRÄNKEKARTE", q: "Heiße Getränke", f: "Kalte Getränke", m: "Matcha & Kokos", s: "Frische Säfte", k: "Milkshakes", q1: "heißes Getränk", f1: "kaltes Getränk", m1: "Matcha-&-Kokos-Getränk", s1: "Saftgetränk", k1: "Milkshake-Getränk",
      regra: "Nach je 9 bezahlten Getränken derselben Kategorie ist das 10. dieser Kategorie gratis. Jede Kategorie hat ihre eigene Karte (sie werden nicht gemischt), jedes Getränk zählt 30 Tage.",
      regra2: "Es zählt, sobald wir die Zahlung einer angemeldet aufgegebenen Bestellung bestätigen. Açaí, Speisen und Menüs zählen nicht.",
      de9: "{n} von 9", sai: "Das älteste zählt ab {d} nicht mehr.", vazio: "Noch keine Getränke auf dieser Karte.",
      gratis: "1 × {c} gratis", ateV: "bis {v} ECV", valida: "gültig bis {d}", usar: "Für diese Bestellung nutzen", emuso: "✓ Auf diese Bestellung angewendet", semcat: "Bitte zuerst ein {c} zur Bestellung hinzufügen.",
      teto: "Das Gratisgetränk gilt bis zum Durchschnittswert der 9 bezahlten; eine Differenz wird bezahlt.",
      dados: "MEINE DATEN", guardar: "Speichern", guardado: "Gespeichert ✓", hist: "MEINE BESTELLUNGEN", semhist: "Noch keine Bestellungen mit diesem Konto.",
      aguarda: "Wartet auf Bestätigung", confirmado: "Bestätigt", cancelado: "Storniert",
      mudar: "Passwort ändern", atual: "AKTUELLES PASSWORT", nova: "NEUES PASSWORT", mudarBtn: "Neues Passwort speichern", mudada: "Passwort geändert ✓", trocar: "Sie haben sich mit einem vorläufigen Passwort angemeldet. Wählen Sie jetzt Ihr eigenes.",
      sair: "Abmelden", apagar: "Mein Konto löschen", apagarQ: "Löscht Konto, Karte und Verlauf. Nicht rückgängig zu machen. Zur Bestätigung Passwort eingeben.", apagarBtn: "Endgültig löschen", voltar: "Zurück",
      chkFora: "Nach je 9 Getränken ist das 10. gratis.", chkEntrar: "Anmelden oder Konto erstellen", chkDentro: "Konto von {n}: Diese Bestellung zählt für die Karte.", ver: "Ansehen", mostrar: "zeigen", esconder: "verbergen", aguarde: "Einen Moment…", sempiso: "EG" },
    nl: { conta: "Mijn account", entrar: "Inloggen", criar: "Account aanmaken", nome: "UW NAAM", tel: "MOBIEL NUMMER", senha: "WACHTWOORD", senha8: "Minstens 8 tekens. Het blijft bij u: zelfs wij kunnen het niet lezen.",
      criarBtn: "Mijn account aanmaken", pq: "Met een account blijven uw gegevens bewaard, ziet u uw bestellingen en is na elke 9 drankjes het 10e gratis.",
      priv: 'Door een account aan te maken accepteert u het <a href="privacidade/" target="_blank" rel="noopener">Privacybeleid</a>.',
      esqueci: "Wachtwoord vergeten? Vraag een tijdelijk wachtwoord aan de balie of via een bericht op Instagram @emmasplace.cv.",
      e_nome: "Vul uw naam in.", e_tel: "Ongeldig mobiel nummer.", e_senha: "Het wachtwoord heeft minstens 8 tekens nodig (en moet anders zijn dan het vorige).", e_existe: "Er bestaat al een account met dit nummer. Log in met uw wachtwoord.",
      e_dados: "Nummer of wachtwoord onjuist.", e_bloqueada: "Te veel pogingen. Probeer het over 15 minuten opnieuw.", e_rede: "Geen verbinding. Probeer het opnieuw.", e_sessao: "De sessie is beëindigd. Log opnieuw in.",
      e_travado: "Te veel verzoeken. Probeer het over een paar minuten opnieuw.", e_nav: "Deze browser kan geen veilig account aanmaken. Werk hem bij of gebruik een andere.",
      ola: "Hallo, {n}", cartao: "DRANKENKAART", q: "Warme dranken", f: "Koude dranken", m: "Matcha & kokos", s: "Verse sappen", k: "Milkshakes", q1: "warm drankje", f1: "koud drankje", m1: "matcha-&-kokosdrankje", s1: "sapdrankje", k1: "milkshakedrankje",
      regra: "Na elke 9 betaalde drankjes van dezelfde categorie is het 10e van die categorie gratis. Elke categorie heeft een eigen kaart (ze worden niet gemengd) en elk drankje telt 30 dagen.",
      regra2: "Het telt zodra wij de betaling bevestigen van een bestelling die ingelogd is geplaatst. Açaí, eten en combo's tellen niet.",
      de9: "{n} van 9", sai: "Het oudste telt niet meer vanaf {d}.", vazio: "Nog geen drankjes op deze kaart.",
      gratis: "1 gratis {c}", ateV: "tot {v} ECV", valida: "geldig tot {d}", usar: "Gebruiken bij deze bestelling", emuso: "✓ Toegepast op deze bestelling", semcat: "Voeg eerst een {c} toe aan de bestelling.",
      teto: "Het gratis drankje is waard tot het gemiddelde van de 9 betaalde; een eventueel verschil betaalt u.",
      dados: "MIJN GEGEVENS", guardar: "Opslaan", guardado: "Opgeslagen ✓", hist: "MIJN BESTELLINGEN", semhist: "Nog geen bestellingen met dit account.",
      aguarda: "Wacht op bevestiging", confirmado: "Bevestigd", cancelado: "Geannuleerd",
      mudar: "Wachtwoord wijzigen", atual: "HUIDIG WACHTWOORD", nova: "NIEUW WACHTWOORD", mudarBtn: "Nieuw wachtwoord opslaan", mudada: "Wachtwoord gewijzigd ✓", trocar: "U bent ingelogd met een tijdelijk wachtwoord. Kies nu uw eigen wachtwoord.",
      sair: "Uitloggen", apagar: "Mijn account verwijderen", apagarQ: "Verwijdert het account, de kaart en de geschiedenis. Kan niet ongedaan worden gemaakt. Typ uw wachtwoord om te bevestigen.", apagarBtn: "Definitief verwijderen", voltar: "Terug",
      chkFora: "Na elke 9 drankjes is het 10e gratis.", chkEntrar: "Inloggen of account aanmaken", chkDentro: "Account van {n}: deze bestelling telt voor de kaart.", ver: "Bekijken", mostrar: "tonen", esconder: "verbergen", aguarde: "Een moment…", sempiso: "BG" }
  };
  function L() { try { return LANG; } catch (e) { return "pt"; } }
  function T(k) { var d = TX[L()] || TX.pt; return d[k] != null ? d[k] : (TX.pt[k] != null ? TX.pt[k] : k); }
  function TS(k) { try { var v = t(k); if (v) return v; } catch (e) { } return k; }          // textos que o site já tem
  function dataC(ms) { try { return new Intl.DateTimeFormat(L(), { day: "numeric", month: "short" }).format(new Date(ms)).replace(/\.$/, ""); } catch (e) { return ""; } }

  /* ---- password -> prova (igual à cópia que está na Gestão, para as passwords provisórias) ---- */
  function telLimpo(v) {
    var d = String(v == null ? "" : v).replace(/\D/g, "");
    if (d.indexOf("00") === 0) d = d.slice(2);
    if (d.length === 10 && d.indexOf("238") === 0) d = d.slice(3);
    return (d.length >= 7 && d.length <= 15) ? d : "";
  }
  async function prova(tel, senha) {
    var enc = new TextEncoder();
    var k = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveBits"]);
    var b = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode("emmasplace.cv|conta|v1|" + tel), iterations: VOLTAS }, k, 256);
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
  }
  var podeProva = !!(window.crypto && crypto.subtle && window.TextEncoder);

  async function pedir(acao, corpo) {
    try {
      var r = await fetch(API + "/" + acao, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(corpo || {}) });
      if (r.status === 429) return { erro: "travado" };
      return await r.json();
    } catch (e) { return { erro: "rede" }; }
  }
  function guardarLocal() { try { if (sessao) localStorage.setItem(LS, JSON.stringify({ s: sessao, n: conta ? conta.nome : nomeGuardado })); else localStorage.removeItem(LS); } catch (e) { } }
  function entrou(d) { sessao = d.sessao || sessao; if (d.conta) conta = d.conta; trocar = !!d.trocar; nomeGuardado = conta ? conta.nome : ""; ed = null; prefsPostas = false; guardarLocal(); vista = trocar ? "senha" : ""; }
  function saiu() {
    sessao = ""; conta = null; nomeGuardado = ""; ed = null; trocar = false; vista = ""; guardarLocal();
    try { if (promo && promo.tipo === "oferta") tirarPromo(); } catch (e) { }
  }
  function erroTxt(c) { var k = "e_" + c; return (TX.pt[k] ? T(k) : (c || T("e_rede"))); }
  async function carregar() {
    if (!sessao) return;
    var d = await pedir("conta-eu", { sessao: sessao });
    if (d && d.ok) { conta = d.conta; trocar = !!d.trocar; nomeGuardado = conta.nome; guardarLocal(); if (trocar) vista = "senha"; }
    else if (d && d.erro === "sessao") saiu();
    tudo();
  }

  /* ---------------- desenho ---------------- */
  var folha, botao, chk;
  function campoSenha(id, rot, auto) {
    return '<div class="lbl">' + T(rot) + '</div><div class="c-senha"><input class="fld" id="' + id + '" type="password" autocomplete="' + auto + '" maxlength="80" required><button type="button" data-a="olho" data-id="' + id + '">' + T("mostrar") + '</button></div>';
  }
  function htmlMsg() { return msg ? '<div class="c-msg' + (msg.ok ? " ok" : "") + '" role="status">' + E(msg.t) + '</div>' : ""; }
  function htmlFora() {
    var c = aba === "criar";
    return '<h3>' + T("conta") + '</h3><div class="sd">' + T("pq") + '</div>' +
      '<div class="c-abas"><button type="button" data-a="aba" data-v="entrar" class="' + (c ? "" : "sel") + '">' + T("entrar") + '</button><button type="button" data-a="aba" data-v="criar" class="' + (c ? "sel" : "") + '">' + T("criar") + '</button></div>' +
      '<form data-f="' + aba + '" novalidate>' +
      (c ? '<div class="lbl">' + T("nome") + '</div><input class="fld" id="cNome" autocomplete="name" maxlength="60" required>' : "") +
      '<div class="lbl">' + T("tel") + '</div><input class="fld" id="cTel" inputmode="tel" autocomplete="username" maxlength="24" placeholder="991 22 33" required>' +
      campoSenha("cSenha", "senha", c ? "new-password" : "current-password") +
      (c ? '<div class="c-nota">' + T("senha8") + '</div>' : "") + htmlMsg() +
      '<button class="go" type="submit"' + (ocupado ? " disabled" : "") + '>' + (ocupado ? T("aguarde") : T(c ? "criarBtn" : "entrar")) + '</button>' +
      (c ? '<p class="cpriv">' + T("priv") + '</p>' : '<p class="cpriv">' + T("esqueci") + '</p>') +
      '</form><button class="gs" type="button" data-a="fechar">' + T("voltar") + '</button>';
  }
  function htmlCartao(k) {
    var c = (conta.cartao && conta.cartao[k]) || { n: 0 }, s = "";
    for (var i = 1; i <= 9; i++) s += '<span class="' + (i <= c.n ? "on" : "") + '">' + (i <= c.n ? "✓" : i) + '</span>';
    s += '<span class="pr">🎁</span>';
    return '<div class="c-cartao' + (c.n ? "" : " z") + '"><b>' + T(k) + '</b><small>' + T("de9").replace("{n}", c.n) + '</small><div class="c-selos" aria-hidden="true">' + s + '</div><p>' +
      (c.n ? T("sai").replace("{d}", dataC(c.expira)) : T("vazio")) + '</p></div>';
  }
  /* a categoria como o site a escreve no carrinho (ex.: "MATCHA &amp; COCO") */
  function catDoSite(nome) {
    var nm = function (x) { return String(x || "").replace(/&amp;/g, "&").trim().toUpperCase(); };
    try { for (var i = 0; i < MENU.length; i++) if (nm(MENU[i].cat) === nm(nome)) return MENU[i].cat; } catch (e) { }
    return nome;
  }
  function ofertaEmUso(o) { try { return !!(promo && promo.c === o.c); } catch (e) { return false; } }
  function htmlOfertas() {
    return (conta.ofertas || []).map(function (o) {
      return '<div class="c-oferta"><b>🎁 ' + T("gratis").replace("{c}", T(o.k + "1")) + '</b><span>' + (o.v > 0 ? T("ateV").replace("{v}", o.v) + " · " : "") + T("valida").replace("{d}", dataC(o.ate)) + '</span>' +
        '<button type="button" data-a="usar" data-c="' + E(o.c) + '"' + (ofertaEmUso(o) ? " disabled" : "") + '>' + T(ofertaEmUso(o) ? "emuso" : "usar") + '</button></div>';
    }).join("");
  }
  function htmlDentro() {
    if (!ed) { var p = conta.prefs || {}; ed = { nome: conta.nome, modo: p.modo || "recolha", zona: p.zona || "", morada: p.morada || "", piso: p.piso || 0, semElevador: !!p.semElevador }; }
    var zs = ""; try { zs = ZONAS.map(function (z) { return '<option' + (z.n === ed.zona ? " selected" : "") + '>' + E(z.n) + '</option>'; }).join(""); } catch (e) { }
    var h = '<h3>' + T("ola").replace("{n}", E(conta.nome.split(" ")[0])) + '</h3>' + htmlMsg() +
      '<div class="lbl">' + T("cartao") + '</div><div class="c-cartoes">' + Object.keys(conta.cartao || {}).sort(function (a, b) { return conta.cartao[b].n - conta.cartao[a].n; }).map(htmlCartao).join("") + '</div>' + htmlOfertas() +
      '<div class="c-nota">' + T("regra") + ' ' + T("regra2") + ((conta.regras && conta.regras.teto === "media") ? " " + T("teto") : "") + '</div>' +
      '<form data-f="guardar" novalidate><div class="lbl">' + T("dados") + '</div>' +
      '<input class="fld" id="pNome" autocomplete="name" maxlength="60" value="' + E(ed.nome) + '" aria-label="' + T("nome") + '">' +
      '<input class="fld" value="' + E(conta.tel) + '" disabled aria-label="' + T("tel") + '" style="margin-top:8px;opacity:.7">' +
      '<div class="lbl">' + TS("comorec2") + '</div><div class="chips"><button type="button" class="chip' + (ed.modo === "recolha" ? " sel" : "") + '" data-a="modo" data-v="recolha">' + TS("recolha") + '</button><button type="button" class="chip' + (ed.modo === "entrega" ? " sel" : "") + '" data-a="modo" data-v="entrega">' + TS("entrega") + '</button></div>' +
      '<div id="pEnt" style="display:' + (ed.modo === "entrega" ? "block" : "none") + '">' +
      '<div class="lbl">' + TS("zonal") + '</div><select class="fld" id="pZona"><option value="">—</option>' + zs + '</select>' +
      '<div class="lbl">' + TS("moradal") + '</div><input class="fld" id="pMorada" maxlength="160" autocomplete="street-address" value="' + E(ed.morada) + '">' +
      '<div class="lbl">' + TS("pisol") + '</div><div class="c-piso"><button type="button" data-a="piso" data-v="-1" aria-label="−">−</button><b id="pPiso">' + (ed.piso || T("sempiso")) + '</b><button type="button" data-a="piso" data-v="1" aria-label="+">+</button></div>' +
      (ed.piso >= 4 ? '<div class="lbl">' + TS("elevp") + '</div><div class="chips"><button type="button" class="chip' + (!ed.semElevador ? " sel" : "") + '" data-a="elev" data-v="1">' + TS("sim") + '</button><button type="button" class="chip' + (ed.semElevador ? " sel" : "") + '" data-a="elev" data-v="0">' + TS("nao") + '</button></div>' : "") +
      '</div><button class="go" type="submit"' + (ocupado ? " disabled" : "") + '>' + (ocupado ? T("aguarde") : T("guardar")) + '</button></form>' +
      '<div class="lbl">' + T("hist") + '</div>';
    var hs = conta.hist || [];
    h += hs.length ? hs.map(function (p) {
      return '<div class="c-ped"><div><span>' + dataC(p.t) + ' · ' + (p.total | 0) + ' ECV</span><em class="' + E(p.est) + '">' + T(TX.pt[p.est] ? p.est : "aguarda") + '</em></div><p>' + (p.itens || []).map(E).join("<br>") + '</p></div>';
    }).join("") : '<div class="c-nota">' + T("semhist") + '</div>';
    h += '<div class="c-links"><button type="button" data-a="vista" data-v="senha">' + T("mudar") + '</button><button type="button" data-a="sair">' + T("sair") + '</button><button type="button" class="per" data-a="vista" data-v="apagar">' + T("apagar") + '</button></div>' +
      '<button class="gs" type="button" data-a="fechar">' + T("voltar") + '</button>';
    return h;
  }
  function htmlSenha() {
    return '<h3>' + T("mudar") + '</h3>' + (trocar ? '<div class="sd">' + T("trocar") + '</div>' : "") + '<form data-f="senha" novalidate>' +
      campoSenha("sAtual", "atual", "current-password") + campoSenha("sNova", "nova", "new-password") + '<div class="c-nota">' + T("senha8") + '</div>' + htmlMsg() +
      '<button class="go" type="submit"' + (ocupado ? " disabled" : "") + '>' + (ocupado ? T("aguarde") : T("mudarBtn")) + '</button></form>' +
      (trocar ? '<button class="gs" type="button" data-a="sair">' + T("sair") + '</button>' : '<button class="gs" type="button" data-a="vista" data-v="">' + T("voltar") + '</button>');
  }
  function htmlApagar() {
    return '<h3>' + T("apagar") + '</h3><div class="sd">' + T("apagarQ") + '</div><form data-f="apagar" novalidate>' + campoSenha("aSenha", "senha", "current-password") + htmlMsg() +
      '<button class="go" type="submit" style="background:#8C2F2F;color:#fff"' + (ocupado ? " disabled" : "") + '>' + (ocupado ? T("aguarde") : T("apagarBtn")) + '</button></form>' +
      '<button class="gs" type="button" data-a="vista" data-v="">' + T("voltar") + '</button>';
  }
  function guardarCampos() {     // o que já estava escrito não se perde ao redesenhar
    var o = {}; if (!folha) return o;
    folha.querySelectorAll("input[id],select[id]").forEach(function (i) { o[i.id] = i.value; });
    return o;
  }
  function desenhar() {
    if (!folha) return;
    var antes = guardarCampos(), foco = document.activeElement && document.activeElement.id;
    var corpo = !sessao ? htmlFora() : (!conta ? '<h3>' + T("conta") + '</h3><div class="sd">' + T("aguarde") + '</div>' + htmlMsg() + '<div class="c-links"><button type="button" data-a="sair">' + T("sair") + '</button></div>' :
      (vista === "senha" ? htmlSenha() : vista === "apagar" ? htmlApagar() : htmlDentro()));
    folha.innerHTML = '<div class="grab"></div>' + corpo;
    Object.keys(antes).forEach(function (id) { var i = $(id); if (i && !i.disabled && id.charAt(0) !== "p") i.value = antes[id]; });
    if (foco && $(foco) && folha.contains($(foco))) { try { $(foco).focus(); } catch (e) { } }
  }
  function desenharBotao() {
    if (!botao) return;
    var n = conta ? (conta.ofertas || []).length : 0;
    botao.className = "conta-btn" + (sessao ? " dentro" : "") + (n ? " oferta" : "");
    botao.setAttribute("aria-label", T("conta"));
    botao.querySelector("i").textContent = n || "";
  }
  function desenharChk() {
    if (!chk) return;
    var h;
    if (!sessao) h = "🎁 " + T("chkFora") + ' <button type="button" data-a="abrir">' + T("chkEntrar") + '</button>';
    else {
      h = T("chkDentro").replace("{n}", E((conta ? conta.nome : nomeGuardado).split(" ")[0])) + ' <button type="button" data-a="abrir">' + T("ver") + '</button>';
      if (conta) (conta.ofertas || []).forEach(function (o) {
        h += '<button type="button" class="of" data-a="usar" data-c="' + E(o.c) + '"' + (ofertaEmUso(o) ? " disabled" : "") + '>🎁 ' + (ofertaEmUso(o) ? T("emuso") : T("usar") + ": " + T("gratis").replace("{c}", T(o.k + "1"))) + '</button>';
      });
    }
    chk.innerHTML = h;
  }
  function tudo() { desenhar(); desenharBotao(); desenharChk(); }

  /* ---------------- acções ---------------- */
  function abrir() { msg = null; if (sessao && !conta) carregar(); desenhar(); show("contaSheet"); folha.scrollTop = 0; }
  function usar(cod) {
    var o = conta && (conta.ofertas || []).filter(function (x) { return x.c === cod; })[0];
    if (!o) return;
    try {
      var cat = catDoSite(o.cat);
      if (!temCategoria(cat)) { msg = { t: T("semcat").replace("{c}", T(o.k + "1")) }; if (folha.classList.contains("on")) desenhar(); else alert(msg.t); return; }
      promo = { c: o.c, tipo: "oferta", cat: cat, v: o.v, d: T("gratis").replace("{c}", T(o.k + "1")) };
      $("fPromo").value = o.c;
      if (folha.classList.contains("on")) { if (cart.length) openCheckout(); else closeAll(); } else refreshChk();
      desenharPromo();
    } catch (e) { }
    tudo();
  }
  async function submeter(f) {
    if (ocupado) return;
    var tipo = f.getAttribute("data-f"), d, v = function (id) { return $(id) ? $(id).value : ""; };
    msg = null;
    if (tipo === "guardar") {
      ed.nome = v("pNome").trim(); if ($("pZona")) ed.zona = v("pZona"); if ($("pMorada")) ed.morada = v("pMorada").trim();
      if (ed.nome.length < 2) { msg = { t: T("e_nome") }; return desenhar(); }
      ocupado = true; desenhar();
      d = await pedir("conta-guardar", { sessao: sessao, nome: ed.nome, prefs: { modo: ed.modo, zona: ed.zona, morada: ed.morada, piso: ed.piso, semElevador: ed.semElevador } });
      ocupado = false;
      if (d.ok) { conta = d.conta; nomeGuardado = conta.nome; ed = null; prefsPostas = false; guardarLocal(); msg = { ok: 1, t: T("guardado") }; }
      else if (d.erro === "sessao") { saiu(); msg = { t: T("e_sessao") }; } else msg = { t: erroTxt(d.erro) };
      tudo(); folha.scrollTop = 0; return;
    }
    if (!podeProva) { msg = { t: T("e_nav") }; return desenhar(); }
    if (tipo === "entrar" || tipo === "criar") {
      var tel = telLimpo(v("cTel")), senha = v("cSenha"), nome = v("cNome").trim();
      if (tipo === "criar" && nome.length < 2) { msg = { t: T("e_nome") }; return desenhar(); }
      if (!tel) { msg = { t: T("e_tel") }; return desenhar(); }
      if (tipo === "criar" && senha.length < 8) { msg = { t: T("e_senha") }; return desenhar(); }
      if (!senha) { msg = { t: T("e_dados") }; return desenhar(); }
      ocupado = true; desenhar();
      try {
        var pr = await prova(tel, senha), corpo = { tel: tel, prova: pr };
        if (tipo === "criar") {
          corpo.nome = nome; corpo.prefs = {};
          try { corpo.prefs = { modo: mode, zona: zona ? zona.n : "", morada: $("fAddr").value.trim(), piso: piso, semElevador: !!semElevador }; } catch (e) { }
        }
        d = await pedir(tipo === "criar" ? "conta-criar" : "conta-entrar", corpo);
      } catch (e) { d = { erro: "nav" }; }
      ocupado = false;
      if (d.ok) { entrou(d); msg = null; porNoCheckout(); } else { msg = { t: erroTxt(d.erro) }; if (d.erro === "existe") aba = "entrar"; }
      tudo(); return;
    }
    if (tipo === "senha" || tipo === "apagar") {
      var at = v(tipo === "senha" ? "sAtual" : "aSenha"), nv = v("sNova");
      if (!at) { msg = { t: T("e_dados") }; return desenhar(); }
      if (tipo === "senha" && (nv.length < 8 || nv === at)) { msg = { t: T("e_senha") }; return desenhar(); }
      ocupado = true; desenhar();
      try {
        var c2 = { sessao: sessao, prova: await prova(conta.tel, at) };
        if (tipo === "senha") c2.nova = await prova(conta.tel, nv);
        d = await pedir(tipo === "senha" ? "conta-senha" : "conta-apagar", c2);
      } catch (e) { d = { erro: "nav" }; }
      ocupado = false;
      if (d.ok && tipo === "senha") { sessao = d.sessao; trocar = false; vista = ""; guardarLocal(); msg = { ok: 1, t: T("mudada") }; }
      else if (d.ok) { saiu(); closeAll(); }
      else if (d.erro === "sessao") { saiu(); msg = { t: T("e_sessao") }; }
      else msg = { t: erroTxt(d.erro) };
      tudo();
    }
  }
  function clique(ev) {
    var b = ev.target.closest("[data-a]"); if (!b) return;
    var a = b.getAttribute("data-a"), v = b.getAttribute("data-v");
    if (a === "abrir") return abrir();
    if (a === "fechar") return closeAll();
    if (a === "usar") return usar(b.getAttribute("data-c"));
    if (a === "olho") { var i = $(b.getAttribute("data-id")); if (i) { i.type = i.type === "password" ? "text" : "password"; b.textContent = T(i.type === "password" ? "mostrar" : "esconder"); } return; }
    if (a === "aba") { aba = v; msg = null; return desenhar(); }
    if (a === "vista") { vista = v; msg = null; desenhar(); folha.scrollTop = 0; return; }
    if (a === "sair") { var s = sessao; saiu(); msg = null; tudo(); if (s) pedir("conta-sair", { sessao: s }); return; }
    if (ed && (a === "modo" || a === "piso" || a === "elev")) {
      ed.nome = $("pNome").value; if ($("pMorada")) ed.morada = $("pMorada").value; if ($("pZona")) ed.zona = $("pZona").value;
      if (a === "modo") ed.modo = v;
      if (a === "piso") { ed.piso = Math.max(0, Math.min(30, ed.piso + (+v))); if (ed.piso < 4) ed.semElevador = false; }
      if (a === "elev") ed.semElevador = v === "0";
      desenhar();
    }
  }
  /* põe no checkout o que está guardado na conta (uma vez por visita; não passa por cima do que o cliente já escreveu) */
  function porNoCheckout() {
    if (!conta) return;
    try {
      var n = $("fName"), tl = $("fTel"), p = conta.prefs || {};
      if (n && !n.value.trim()) n.value = conta.nome;
      if (tl && !tl.value.trim()) tl.value = conta.tel;
      if (prefsPostas) return; prefsPostas = true;
      if (p.zona && !zona) escolherZona(p.zona);
      var a = $("fAddr"); if (a && !a.value.trim() && p.morada) a.value = p.morada;
      if (p.piso > 0 && piso === 0) { for (var k = 0; k < p.piso; k++) mudarPiso(1); if (p.piso >= 4) setElevador(!p.semElevador); }
      if (p.modo === "entrega" && mode !== "entrega" && !modoEscolhido && !entregasOff && !cart.some(function (i) { return i.nd; })) setMode("entrega", false);
    } catch (e) { }
  }

  function montar() {
    var barra = document.querySelector(".sitebar"), cs = $("chkSheet"), ov = $("ov");
    if (!barra || !cs || !ov) return;
    botao = document.createElement("button"); botao.type = "button"; botao.id = "contaBtn";
    botao.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg><i></i>';
    botao.addEventListener("click", abrir);
    barra.insertBefore(botao, barra.querySelector(".topcart"));
    folha = document.createElement("div"); folha.className = "sheet"; folha.id = "contaSheet"; folha.setAttribute("role", "dialog"); folha.setAttribute("aria-modal", "true");
    folha.setAttribute("data-clarity-mask", "true");
    cs.parentNode.insertBefore(folha, cs);
    folha.addEventListener("click", clique);
    folha.addEventListener("submit", function (ev) { ev.preventDefault(); submeter(ev.target); });
    chk = document.createElement("div"); chk.className = "conta-chk"; chk.id = "contaChk"; chk.addEventListener("click", clique);
    var antes = cs.querySelector(".lbl"); if (antes) cs.insertBefore(chk, antes);
    /* fechar tudo também fecha a conta; abrir o checkout preenche-o com a conta */
    var fechar0 = window.closeAll; window.closeAll = function () { folha.classList.remove("on"); return fechar0.apply(this, arguments); };
    var chk0 = window.openCheckout; window.openCheckout = function () { porNoCheckout(); var r = chk0.apply(this, arguments); desenharChk(); return r; };
    try { new MutationObserver(function () { tudo(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) { }
    try { new MutationObserver(desenharChk).observe($("promoMsg"), { childList: true, subtree: true }); } catch (e) { }
    tudo(); carregar();
  }
  window.EP_CONTA = {
    sessao: function () { return sessao; },
    depoisDoPedido: function () { if (sessao) setTimeout(carregar, 1200); },
    abrir: function () { if (folha) abrir(); },
    prova: prova, telLimpo: telLimpo
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();
