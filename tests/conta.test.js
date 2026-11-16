/* Conta de cliente e cartão de bebidas (conta.js + conta.css). O servidor aqui é falso: estes testes
   vêem o que o SITE faz — a password nunca sai do telemóvel, o checkout enche-se com a conta, o pedido
   leva a sessão e a bebida grátis entra nas contas do site. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { abrir, RAIZ } = require("./lib/ambiente");
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const SESSAO = "ab".repeat(32);

function servidorDeContas(conta) {
  const visto = [];
  const extra = (metodo, cam, corpo) => {
    if (cam === "/redeem") return { ok: true };            // como o servidor verdadeiro faz com as bebidas grátis (OF-…)
    if (!cam.startsWith("/conta-")) return null;
    const b = JSON.parse(corpo || "{}"); visto.push({ cam, b });
    if (cam === "/conta-criar") { conta.nome = b.nome; conta.tel = b.tel; conta.prefs = b.prefs; return { ok: true, sessao: SESSAO, conta }; }
    if (cam === "/conta-entrar") return { erro: "dados" };
    if (b.sessao !== SESSAO) return { erro: "sessao" };
    if (cam === "/conta-guardar") { conta.nome = b.nome; conta.prefs = b.prefs; return { ok: true, conta }; }
    return { ok: true, conta };
  };
  return { extra, visto };
}
const contaNova = () => ({ nome: "", tel: "", prefs: {}, hist: [], ofertas: [],
  cartao: { q: { n: 0, expira: 0 }, f: { n: 0, expira: 0 }, m: { n: 0, expira: 0 }, s: { n: 0, expira: 0 }, k: { n: 0, expira: 0 } },
  regras: { n: 9, dias: 30, diasOferta: 30, teto: "media" } });

async function pagina(amb) {
  const page = await amb.context.newPage();
  const erros = [];
  page.on("pageerror", e => erros.push(String(e)));
  page.on("dialog", d => { if (process.env.DIAL) console.log("DIALOGO:", d.message().slice(0, 200)); d.dismiss().catch(() => {}); });
  await page.goto(amb.base + "/");
  await page.waitForFunction(() => document.querySelector("#bestGrid .best-card") && document.getElementById("contaBtn"));
  await page.waitForTimeout(500);
  return { page, erros };
}

test("criar conta: a password não sai do telemóvel; perfil, checkout e pedido usam a conta", async () => {
  const conta = contaNova(), srv = servidorDeContas(conta);
  const amb = await abrir({ contexto: TEL, servidor: { extra: srv.extra } });
  try {
    const { page, erros } = await pagina(amb);
    await page.tap("#contaBtn"); await page.waitForSelector("#contaSheet.on");
    await page.tap('#contaSheet [data-a="aba"][data-v="criar"]');
    await page.fill("#cNome", "Ana <b>Silva</b>"); await page.fill("#cTel", "+238 991 22 33"); await page.fill("#cSenha", "segredo-da-ana-1");
    await page.tap('#contaSheet form button[type="submit"]');
    await page.waitForSelector("#contaSheet .c-cartoes", { timeout: 30000 });
    const criar = srv.visto.find(x => x.cam === "/conta-criar").b;
    const certa = crypto.pbkdf2Sync("segredo-da-ana-1", "emmasplace.cv|conta|v1|9912233", 600000, 32, "sha256").toString("hex");
    assert.equal(criar.tel, "9912233");
    assert.equal(criar.prova, certa, "a prova tem de ser PBKDF2-SHA256, 600 000 voltas, com o número como sal");
    assert.ok(!JSON.stringify(amb.falso.chamadas).includes("segredo-da-ana"), "a password não pode ir em nenhum pedido ao servidor");
    assert.ok(!(await page.evaluate(() => JSON.stringify(localStorage))).includes("segredo-da-ana"), "nem ficar guardada no telemóvel");
    assert.equal(await page.locator("#contaSheet h3 b").count(), 0, "o nome aparece como texto, não como HTML");
    assert.equal(await page.locator("#contaSheet .c-cartao").count(), 5);
    /* a Gestão faz a mesma prova para as passwords provisórias */
    const adm = fs.readFileSync(path.join(RAIZ, "admin", "index.html"), "utf8");
    const fn = adm.slice(adm.indexOf("function ctTelLimpo"), adm.indexOf("function ctEsc"));
    const daGestao = await page.evaluate(async src => { const f = new Function(src + "; return ctProva(ctTelLimpo('00238 9912233'), 'segredo-da-ana-1');"); return f(); }, fn);
    assert.equal(daGestao, certa, "Gestão e site têm de fazer a mesma prova");
    /* guardar dados de entrega */
    await page.tap('#contaSheet [data-a="modo"][data-v="entrega"]');
    await page.selectOption("#pZona", "Palmarejo"); await page.fill("#pMorada", "Rua 5");
    await page.tap('#contaSheet [data-a="piso"][data-v="1"]');
    await page.tap('#contaSheet form[data-f="guardar"] button[type="submit"]');
    await page.waitForSelector("#contaSheet .c-msg.ok");
    assert.deepEqual(conta.prefs, { modo: "entrega", zona: "Palmarejo", morada: "Rua 5", piso: 1, semElevador: false });
    /* checkout preenchido e pedido com a sessão */
    await page.evaluate(() => { closeAll(); abrirProduto("Iced Latte"); confirmAdd(); closeAll(); openCheckout(); });
    await page.waitForSelector("#chkSheet.on");
    const chk = await page.evaluate(() => ({ nome: fName.value, tel: fTel.value, modo: mode, zona: zona && zona.n, morada: fAddr.value, piso, faixa: document.getElementById("contaChk").textContent }));
    assert.deepEqual([chk.nome, chk.tel, chk.modo, chk.zona, chk.morada, chk.piso], ["Ana <b>Silva</b>", "9912233", "entrega", "Palmarejo", "Rua 5", 1]);
    assert.match(chk.faixa, /Ana/);
    await page.evaluate(() => { setMode("recolha", true); closeAll(); openCheckout(); });
    await page.waitForTimeout(1200);
    await page.evaluate(async () => { const b = document.querySelector("#bankChips .chip"); if (b) b.click(); await sendWA(); });
    await page.waitForFunction(() => document.getElementById("doneSheet").classList.contains("on"), null, { timeout: 15000 });
    const ped = JSON.parse(amb.falso.chamadas.filter(c => c.caminho === "/order").pop().corpo);
    assert.equal(ped.sessao, SESSAO);
    /* sair */
    await page.evaluate(() => { closeAll(); document.getElementById("contaBtn").click(); });
    await page.tap('#contaSheet [data-a="sair"]');
    assert.equal(await page.evaluate(() => localStorage.getItem("ep_conta")), null);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("bebida grátis do cartão: só na categoria certa, desconta a mais cara até ao tecto e segue no pedido", async () => {
  const conta = Object.assign(contaNova(), { nome: "Rui", tel: "9950000" });
  conta.cartao.f = { n: 4, expira: Date.now() + 9 * 864e5 };
  conta.ofertas = [{ c: "OF-TEST-0001", k: "f", cat: "BEBIDAS FRIAS", v: 250, ate: Date.now() + 20 * 864e5 }];
  conta.hist = [{ id: "x1", code: "PED-1", t: Date.now() - 864e5, dia: "2026-11-15", itens: ["1x Iced Latte", "<img src=x onerror=alert(1)>"], total: 225, modo: "recolha", est: "confirmado" }];
  const srv = servidorDeContas(conta);
  const amb = await abrir({ contexto: TEL, servidor: { extra: srv.extra } });
  try {
    await amb.context.addInitScript(s => { try { localStorage.setItem("ep_conta", JSON.stringify({ s, n: "Rui" })); } catch (e) {} }, SESSAO);
    const { page, erros } = await pagina(amb);
    await page.waitForFunction(() => document.getElementById("contaBtn").classList.contains("oferta"));
    await page.tap("#contaBtn"); await page.waitForSelector("#contaSheet .c-oferta");
    assert.match(await page.textContent("#contaSheet .c-cartao"), /4/);
    assert.equal(await page.locator("#contaSheet .c-ped img").count(), 0, "o histórico aparece como texto");
    /* sem bebida fria no pedido: não aplica */
    await page.evaluate(() => { closeAll(); abrirProduto("Latte Clássico"); confirmAdd(); closeAll(); openCheckout(); });
    await page.tap("#contaChk .of");
    assert.equal(await page.evaluate(() => desconto()), 0);
    /* com uma bebida fria de 300 e outra de 225: desconta 250 (tecto) */
    await page.evaluate(() => { closeAll(); abrirProduto("Frappé Clássico"); cur.size = "G"; confirmAdd(); closeAll(); abrirProduto("Iced Latte"); confirmAdd(); closeAll(); setMode("recolha", true); openCheckout(); });
    await page.tap("#contaChk .of");
    const v = await page.evaluate(() => { refreshChk(); return { d: desconto(), s: sub(), t: total(), cara: maisCaraDaCat("BEBIDAS FRIAS") }; });
    assert.equal(v.cara, 300); assert.equal(v.d, 250); assert.equal(v.t, v.s - 250);
    await page.evaluate(async () => { const b = document.querySelector("#bankChips .chip"); if (b) b.click(); await sendWA(); });
    await page.waitForFunction(() => document.getElementById("doneSheet").classList.contains("on"), null, { timeout: 15000 });
    const ped = JSON.parse(amb.falso.chamadas.filter(c => c.caminho === "/order").pop().corpo);
    assert.equal(ped.calc.promo, "OF-TEST-0001"); assert.equal(ped.total, v.t); assert.equal(ped.sessao, SESSAO);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("sem conta e no desenho antigo o site fica como era; a conta abre nas 5 línguas", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const { page, erros } = await pagina(amb);
    await page.evaluate(() => { abrirProduto("Iced Latte"); confirmAdd(); closeAll(); openCheckout(); });
    await page.fill("#fName", "Sem Conta"); await page.fill("#fTel", "9911111");
    await page.evaluate(async () => { const b = document.querySelector("#bankChips .chip"); if (b) b.click(); await sendWA(); });
    await page.waitForFunction(() => document.getElementById("doneSheet").classList.contains("on"), null, { timeout: 15000 });
    const ped = JSON.parse(amb.falso.chamadas.filter(c => c.caminho === "/order").pop().corpo);
    assert.equal(ped.sessao, "");
    assert.equal(amb.falso.chamadas.filter(c => c.caminho.startsWith("/conta-")).length, 0, "sem conta não se fala com o servidor de contas");
    for (const l of ["pt", "en", "fr", "de", "nl"]) {
      await page.evaluate(x => { closeAll(); setLang(x); document.getElementById("contaBtn").click(); }, l);
      const txt = await page.textContent("#contaSheet");
      assert.ok(txt.length > 150 && !/undefined|\{[a-z]\}/.test(txt), l + ": " + txt.slice(0, 80));
    }
    const p2 = await amb.context.newPage();
    await p2.goto(amb.base + "/?desenho=antigo"); await p2.waitForFunction(() => document.getElementById("contaBtn"));
    assert.equal(await p2.evaluate(() => getComputedStyle(document.getElementById("contaBtn")).display !== "none" && !document.documentElement.classList.contains("nv")), true);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
