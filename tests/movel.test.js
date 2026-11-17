/* Desenho novo da versão de telemóvel (movel.css + movel.js, ligado em desenho.js).
   - no telemóvel entra, com a página arrumada pela ordem nova e a barra de baixo;
   - o caminho do pedido, com toques verdadeiros, chega ao servidor com o mesmo total que o cliente viu;
   - com desenho.js em "antigo" (ou ?desenho=antigo), e no computador, o site fica como era. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");
const TEL = { contexto: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } };

async function pagina(amb, qs) {
  const page = await amb.context.newPage();
  const erros = [];
  page.on("pageerror", e => erros.push(String(e)));
  page.on("dialog", d => d.dismiss().catch(() => {}));
  await page.goto(amb.base + "/" + (qs || ""));
  await page.waitForFunction(() => document.querySelector("#bestGrid .best-card") && document.querySelector("#catNav button"));
  await page.waitForTimeout(600);
  return { page, erros };
}

test("telemóvel: desenho novo ligado e página pela ordem nova", async () => {
  const amb = await abrir(TEL);
  try {
    const { page, erros } = await pagina(amb);
    const d = await page.evaluate(() => {
      const y = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : -1; };
      const vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== "none"; };
      return {
        nv: document.documentElement.classList.contains("nv"),
        ordem: ["#nvPromo", "#catNav", "#mais-pedidos", "#nvMenuT", ".msearch", "#menuCards"].map(y), fotoCapa: vis("#nvHero"), capaTopo: y("#nvPromo .home-hero") < 200 && vis("#nvPromo .home-hero"),
        barraVelha: vis(".bar"), carrinhoTopo: vis(".topcart"), nav: vis("#nvNav"), linguas: vis("#langs"),
        cats: [...document.querySelectorAll("#catNav button")].slice(0, 2).map(b => b.dataset.alvo),
        estado: document.querySelector("#nvStatus b").textContent, frase: document.querySelector("#nvHeroT").textContent,
        colunas: getComputedStyle(document.getElementById("bestGrid")).gridTemplateColumns.split(" ").length,
        h1: document.querySelectorAll("h1").length, texto: document.body.innerText
      };
    });
    assert.equal(d.nv, true);
    assert.deepEqual(d.ordem, d.ordem.slice().sort((a, b) => a - b), "secções fora da ordem: " + d.ordem);
    assert.ok(d.ordem.every(v => v >= 0));
    assert.equal(d.barraVelha, false); assert.equal(d.carrinhoTopo, false); assert.equal(d.nav, true); assert.equal(d.linguas, false);
    assert.equal(d.cats[0], "mais-pedidos", "a barra de categorias tem de seguir a ordem da página");
    assert.ok(d.estado.length > 5); assert.ok(d.frase.length > 5);
    assert.equal(d.colunas, 2); assert.equal(d.h1, 1);
    assert.ok(!d.texto.includes("${"), "texto por traduzir à vista");
    /* idioma: o botão abre a lista e a barra de baixo muda de língua */
    await page.tap("#nvLang");
    await page.tap('#langs button:nth-child(2)');
    await page.waitForFunction(() => document.querySelector("#nvT1 span").textContent === "Home");
    assert.equal(await page.textContent("#nvLang"), "EN");
    assert.equal(await page.textContent("#nvT3 span"), "My order");
    /* carrinho vazio: mensagem traduzida (antes aparecia o código "${t("vazio")}") */
    await page.tap("#nvT3");
    await page.waitForSelector("#cartSheet.on");
    const vazio = await page.textContent("#cartBody");
    assert.ok(vazio.trim().length > 5 && !vazio.includes("${"), vazio);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("telemóvel: pedido com toques verdadeiros chega ao servidor com o total que o cliente viu", async () => {
  const amb = await abrir(TEL);
  try {
    const { page, erros } = await pagina(amb);
    await page.tap("#bestGrid .best-card .best-add");                 // o «+» do primeiro dos mais pedidos (açaí)
    await page.waitForSelector("#optSheet.on");
    await page.tap("#optAdd");
    await page.waitForSelector("#cartSheet.on");                   // o site abre o pedido depois de adicionar
    await page.tap("#cartSheet .gs");                              // continuar a escolher
    await page.waitForFunction(() => document.getElementById("nvT3").classList.contains("tem"));
    assert.equal(await page.textContent("#nvCnt"), "1");
    assert.match(await page.textContent("#nvT3 span"), /\d+ ECV/);
    await page.tap("#nvT2");                                       // Menu
    await page.waitForFunction(() => document.getElementById("nvT2").classList.contains("on"));
    await page.tap("#nvT3");                                       // O meu pedido
    await page.waitForSelector("#cartSheet.on");
    await page.tap("#toCheckout");
    await page.waitForSelector("#chkSheet.on");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#chkSheet button.go[onclick="sendWA()"]')).display), "none");
    await page.tap("#nvPayB");                                     // falta o nome: o site avisa e não envia
    await page.waitForTimeout(500);
    assert.equal(amb.falso.chamadas.filter(c => c.caminho === "/order").length, 0);
    await page.fill("#fName", "Cliente Teste"); await page.fill("#fTel", "991 22 33");
    const visto = await page.evaluate(() => ({ barra: document.getElementById("nvPayT").textContent, site: total() }));
    assert.equal(visto.barra, visto.site + " ECV");
    await page.tap("#nvPayB");
    await page.waitForSelector("#doneSheet.on");
    const env = amb.falso.chamadas.filter(c => c.caminho === "/order");
    assert.equal(env.length, 1);
    const p = JSON.parse(env[0].corpo);
    assert.equal(p.total, visto.site);
    assert.equal(p.nome, "Cliente Teste");
    assert.equal(p.calc.v, 2);
    assert.match(p.itens[0], /^1x Açaí/);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("interruptor: «antigo» no telemóvel, e computador, ficam com o site como era", async () => {
  const amb = await abrir(TEL);
  try {
    const { page, erros } = await pagina(amb, "?desenho=antigo");
    const d = await page.evaluate(() => ({
      nv: document.documentElement.classList.contains("nv"), nav: !!document.getElementById("nvNav"), hero: !!document.getElementById("nvHero"),
      linguas: getComputedStyle(document.getElementById("langs")).display, primeiro: document.querySelector(".wrap main > *").className,
      cat0: document.querySelector("#catNav button").dataset.alvo
    }));
    assert.deepEqual(d, { nv: false, nav: false, hero: false, linguas: "flex", primeiro: d.primeiro, cat0: d.cat0 });
    assert.match(d.primeiro, /home-hero/);
    assert.notEqual(d.cat0, "mais-pedidos");
    await page.evaluate(() => { abrirProduto("Frappé de Caramelo"); confirmAdd(); closeAll(); });
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector(".bar")).display), "none");
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
  const pc = await abrir({ contexto: { viewport: { width: 1280, height: 800 } } });
  try {
    const { page, erros } = await pagina(pc);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("nv") || !!document.getElementById("nvNav")), false);
    assert.deepEqual(erros, []);
  } finally { await pc.fechar(); }
});

test("capa dos descontos no topo no telemóvel; janela estreita no computador fica com o site de sempre", async () => {
  let amb = await abrir(TEL);
  try {
    const { page, erros } = await pagina(amb);
    const d = await page.evaluate(() => {
      const c = document.querySelector(".home-hero.capa").getBoundingClientRect(), b = document.getElementById("mais-pedidos").getBoundingClientRect();
      return { topo: Math.round(c.top + scrollY), alt: Math.round(c.height), antesDosPedidos: c.bottom <= b.top + 1,
        foto: getComputedStyle(document.getElementById("nvHero")).display, nav: getComputedStyle(document.getElementById("nvNav")).display !== "none" };
    });
    assert.ok(d.topo < 140 && d.alt > 100, JSON.stringify(d));
    assert.ok(d.antesDosPedidos && d.nav); assert.equal(d.foto, "none");
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
  amb = await abrir({ contexto: { viewport: { width: 600, height: 900 } } });            // computador com a janela estreita (rato, sem toque)
  try {
    const { page, erros } = await pagina(amb);
    assert.deepEqual(await page.evaluate(() => [document.documentElement.classList.contains("nv"), !!document.getElementById("nvNav")]), [false, false]);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
