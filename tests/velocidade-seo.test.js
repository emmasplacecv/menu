/* Página principal: abre sem erros e tem a informação que o Google lê. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");

test("página principal: sem erros, letras pedidas no <head>, dados estruturados válidos", async () => {
  const amb = await abrir();
  try {
    const page = await amb.context.newPage(); const erros = [];
    page.on("pageerror", e => erros.push(e.message));
    await page.goto(amb.base + "/", { waitUntil: "load" });
    await page.waitForFunction(() => typeof total === "function" && document.querySelectorAll("#menu *").length > 20);
    assert.deepEqual(erros, []);
    const r = await page.evaluate(() => ({
      canonical: (document.querySelector('link[rel="canonical"]') || {}).href,
      fontes: !!document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]'),
      importa: [...document.querySelectorAll("style")].some(s => /@import/.test(s.textContent)),
      ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
      titulo: document.title, desc: document.querySelector('meta[name="description"]').content,
      og: document.querySelector('meta[property="og:image"]').content
    }));
    assert.equal(r.canonical, "https://emmasplace.cv/");
    assert.ok(r.fontes && !r.importa, "as letras devem ser pedidas por <link>, não por @import");
    assert.equal(r.ld["@type"], "CafeOrCoffeeShop");
    assert.equal(r.ld.url, "https://emmasplace.cv/");
    assert.equal(r.ld.address.addressLocality, "Praia");
    assert.ok(r.ld.openingHoursSpecification.length >= 2);
    assert.ok(r.titulo.length <= 80 && /Emma's Place/.test(r.titulo));
    assert.ok(r.desc.length >= 70 && r.desc.length <= 230);
    assert.match(r.og, /^https:\/\/emmasplace\.cv\//);
  } finally { await amb.fechar(); }
});
