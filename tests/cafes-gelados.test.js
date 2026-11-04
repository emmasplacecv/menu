/* Página /cafes-gelados: preços iguais aos do menu, dados estruturados certos, preços do servidor aplicados,
   sem erros e sem deslizar para o lado num telemóvel. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");

const NOMES = ["Iced Latte", "Café Instantâneo Gelado", "Frappé Clássico", "Frappé de Chocolate", "Frappé de Caramelo",
  "Iced Latte de Caramelo", "Iced Mocha", "Iced Caramel Macchiato"];

test("cafés gelados: preços e combos iguais aos do menu do site, e nos dados para o Google", async () => {
  const amb = await abrir({ contexto: { viewport: { width: 360, height: 780 }, isMobile: true } });
  try {
    const site = await amb.context.newPage();
    await site.goto(amb.base + "/");
    await site.waitForFunction(() => typeof findMenuItem === "function" && COMBOS.length > 0);
    const menu = await site.evaluate(n => ({ p: n.map(x => { const f = findMenuItem(x); return f ? [f.item.p, f.item.g] : null; }),
      combos: Object.fromEntries(COMBOS.map(c => [c.n, c.p])) }), NOMES);
    const page = await amb.context.newPage(); const erros = [];
    page.on("pageerror", e => erros.push(e.message));
    await page.goto(amb.base + "/cafes-gelados/", { waitUntil: "load" });
    await page.waitForTimeout(800);
    const r = await page.evaluate(n => ({
      cartoes: n.map(x => { const c = document.querySelector('.pc[data-n="' + x + '"]'); return c ? [...c.querySelectorAll(".pc-pr b")].map(b => parseInt(b.textContent)) : null; }),
      combos: Object.fromEntries([...document.querySelectorAll(".combo")].map(c => [c.dataset.c, parseInt(c.querySelector("i").textContent)])),
      ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
      largura: document.documentElement.scrollWidth, ecra: innerWidth,
      encomendar: [...document.querySelectorAll('a.go, a.topcart')].map(a => a.getAttribute("href")),
      h1: document.querySelector("h1").textContent, title: document.title,
      desc: document.querySelector('meta[name="description"]').content
    }), NOMES);
    assert.deepEqual(erros, []);
    NOMES.forEach((n, i) => assert.deepEqual(r.cartoes[i], menu.p[i], "preço de " + n));
    assert.equal(r.combos["LANCHE"], menu.combos["LANCHE"]);
    assert.equal(r.combos["SUPER COMBO"], menu.combos["SUPER COMBO"]);
    const g = r.ld["@graph"], cafe = g.find(x => x["@type"] === "CafeOrCoffeeShop"), m = g.find(x => x["@type"] === "Menu");
    assert.match(cafe.address.streetAddress, /Amílcar Cabral, Plateau/);
    assert.equal(cafe.address.addressLocality, "Praia");
    assert.equal(cafe.openingHoursSpecification.length, 2);
    const itens = m.hasMenuSection.hasMenuItem;
    NOMES.forEach((n, i) => { const it = itens.find(x => x.name === n); assert.ok(it, n + " nos dados");
      assert.deepEqual(it.offers.map(o => +o.price), menu.p[i], "dados estruturados de " + n); });
    assert.ok(r.largura <= r.ecra, "a página desliza para o lado no telemóvel");
    assert.ok(r.encomendar.every(h => h === "/#menu"));
    assert.ok(r.title.length <= 60, "título demasiado longo para o Google: " + r.title.length);
    assert.ok(r.desc.length <= 160, "descrição demasiado longa: " + r.desc.length);
    assert.ok(!/(café gelado.*){4,}/i.test(r.h1 + r.title + r.desc), "repetição artificial de palavras-chave");
  } finally { await amb.fechar(); }
});

test("cafés gelados: usa os preços do servidor (Gestão > Menu) e esconde o que saiu do menu", async () => {
  const amb = await abrir({ servidor: { edit: { p: { "Frape Caramelo": { m: 360, g: 390 } }, off: ["Iced Mocha"], add: [], ord: {} } } });
  try {
    const page = await amb.context.newPage();
    await page.goto(amb.base + "/cafes-gelados/", { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector('.pc[data-n="Frappé de Caramelo"] .pc-p b').textContent === "360$");
    const r = await page.evaluate(() => ({ g: document.querySelector('.pc[data-n="Frappé de Caramelo"] .pc-g b').textContent,
      mocha: getComputedStyle(document.querySelector('.pc[data-n="Iced Mocha"]')).display }));
    assert.equal(r.g, "390$"); assert.equal(r.mocha, "none");
  } finally { await amb.fechar(); }
});
