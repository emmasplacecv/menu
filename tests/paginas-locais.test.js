/* Páginas locais /cafes-gelados/, /acai/ e /cafe/: preços iguais aos do menu do site e aos dados para o Google,
   preços do servidor aplicados, sem erros, sem deslizar para o lado no telemóvel, sem repetir palavras-chave. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");

const PAGINAS = ["/cafes-gelados/", "/acai/", "/cafe/"];

async function menuDoSite(amb) {
  const site = await amb.context.newPage();
  await site.goto(amb.base + "/");
  await site.waitForFunction(() => typeof findMenuItem === "function" && COMBOS.length > 0);
  const m = await site.evaluate(() => {
    const p = {}; MENU.forEach(c => c.items.forEach(i => { p[i.n] = { m: i.p, g: i.g || null, sp: i.sp || null, xp: i.xp || null }; }));
    return { p, combos: Object.fromEntries(COMBOS.map(c => [c.d, c.p])) };
  });
  await site.close();
  return m;
}

for (const cam of PAGINAS) {
  test("página " + cam + ": preços = menu do site = dados estruturados; telemóvel; título e descrição", async () => {
    const amb = await abrir({ contexto: { viewport: { width: 360, height: 780 }, isMobile: true } });
    try {
      const menu = await menuDoSite(amb);
      const page = await amb.context.newPage(); const erros = [];
      page.on("pageerror", e => erros.push(e.message));
      await page.goto(amb.base + cam, { waitUntil: "load" });
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => ({
        precos: [...document.querySelectorAll("[data-preco]")].map(b => ({ n: b.dataset.preco, t: b.dataset.t, v: parseInt(b.textContent.replace("+", "")) })),
        combos: [...document.querySelectorAll(".combo")].map(c => ({ d: c.querySelector("span").textContent, v: parseInt(c.querySelector("i").textContent) })),
        ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
        largura: document.documentElement.scrollWidth, ecra: innerWidth,
        encomendar: [...document.querySelectorAll("a.go, a.topcart")].map(a => a.getAttribute("href")),
        ligacoes: [...document.querySelectorAll("nav.mais a")].map(a => a.getAttribute("href")),
        canonical: document.querySelector('link[rel="canonical"]').href,
        texto: document.body.innerText, title: document.title, desc: document.querySelector('meta[name="description"]').content
      }));
      assert.deepEqual(erros, []);
      const ACAI = { "Açaí · com granola e/ou leite em pó": "m", "Açaí · sem granola nem leite em pó": "sp", "Açaí · topping extra": "xp" };
      for (const x of r.precos) {
        const esperado = ACAI[x.n] ? menu.p["Açaí"][ACAI[x.n]] : menu.p[x.n] && menu.p[x.n][x.t];
        assert.equal(x.v, esperado, cam + " preço de " + x.n + " (" + x.t + ")");
      }
      for (const c of r.combos) assert.equal(c.v, menu.combos[c.d], cam + " combo «" + c.d + "»");
      const g = r.ld["@graph"], cafe = g.find(x => x["@type"] === "CafeOrCoffeeShop"), m = g.find(x => x["@type"] === "Menu");
      assert.match(cafe.address.streetAddress, /Amílcar Cabral, Plateau/);
      assert.equal(cafe.openingHoursSpecification.length, 2);
      for (const it of m.hasMenuSection.hasMenuItem) {
        if (/^Combo /.test(it.name)) { assert.equal(+it.offers[0].price, menu.combos[it.description], "dados: " + it.name); continue; }
        const p = menu.p[it.name]; assert.ok(p, "dados: produto que não existe no menu: " + it.name);
        const esperados = it.name === "Açaí" ? [p.m, p.sp] : [p.m, p.g].filter(Boolean);
        assert.deepEqual(it.offers.map(o => +o.price), esperados, "dados: " + it.name);
      }
      assert.ok(r.largura <= r.ecra, cam + " desliza para o lado no telemóvel");
      assert.ok(r.encomendar.every(h => h === "/#menu"));
      assert.equal(r.ligacoes.length, PAGINAS.length);          // as outras duas + menu completo
      assert.equal(r.canonical, "https://emmasplace.cv" + cam);
      assert.ok(r.title.length <= 60, cam + " título longo: " + r.title.length);
      assert.ok(r.desc.length <= 160, cam + " descrição longa: " + r.desc.length);
      assert.doesNotMatch(r.texto, /avalia|estrelas|★/i, "não pode haver avaliações");
      const palavra = { "/cafes-gelados/": /caf[ée]s? gelados?/gi, "/acai/": /açaí/gi, "/cafe/": /\bcaf[ée]\b/gi }[cam];
      const n = (r.title + " " + r.desc).match(palavra) || [];
      assert.ok(n.length <= 3, cam + ": palavra-chave repetida " + n.length + " vezes no título e na descrição");
    } finally { await amb.fechar(); }
  });
}

test("páginas locais: usam os preços do servidor (Gestão > Menu) e escondem o que saiu do menu", async () => {
  const amb = await abrir({ servidor: { edit: { p: { "Frape Caramelo": { m: 360, g: 390 }, "Açaí · com granola e/ou leite em pó": { m: 990 },
    "Espresso": { m: 90 } }, off: ["Iced Mocha", "Água de Coco Grande"], add: [], ord: {} } } });
  try {
    const page = await amb.context.newPage();
    const ler = async (cam, sel) => { await page.goto(amb.base + cam, { waitUntil: "load" }); await page.waitForTimeout(700); return page.evaluate(sel); };
    let r = await ler("/cafes-gelados/", () => ({ m: document.querySelector('[data-preco="Frappé de Caramelo"][data-t="m"]').textContent,
      g: document.querySelector('[data-preco="Frappé de Caramelo"][data-t="g"]').textContent,
      mocha: getComputedStyle(document.querySelector('[data-n="Iced Mocha"]')).display }));
    assert.deepEqual(r, { m: "360$", g: "390$", mocha: "none" });
    r = await ler("/acai/", () => ({ a: document.querySelector('[data-preco="Açaí · com granola e/ou leite em pó"]').textContent,
      x: document.querySelector('[data-preco="Açaí · topping extra"]').textContent,
      coco: getComputedStyle(document.querySelector('[data-n="Água de Coco Grande"]')).display }));
    assert.deepEqual(r, { a: "990$", x: "+50$", coco: "none" });
    r = await ler("/cafe/", () => ({ e: document.querySelector('[data-preco="Espresso"]').textContent,
      combo: document.querySelector(".combo i").textContent }));
    assert.deepEqual(r, { e: "90$", combo: Math.floor((90 + 150) * 0.95 / 5) * 5 + "$" });
  } finally { await amb.fechar(); }
});

test("sitemap.xml tem a página principal e as três páginas locais", async () => {
  const s = require("fs").readFileSync(require("path").join(__dirname, "..", "sitemap.xml"), "utf8");
  for (const c of ["/", ...PAGINAS]) assert.ok(s.includes("<loc>https://emmasplace.cv" + c + "</loc>"), c);
});
