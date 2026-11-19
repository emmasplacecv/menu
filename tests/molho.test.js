/* 18-11-2026: molho das saladas (grátis, escolha obrigatória) e Granola Dubai a 100. */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");
test("salada só entra no carrinho com o molho escolhido; Granola Dubai custa 100", async () => {
  const amb = await abrir({ contexto: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } });
  try {
    const page = await amb.context.newPage(); const erros = []; page.on("pageerror", e => erros.push(String(e)));
    await page.goto(amb.base + "/"); await page.waitForFunction(() => document.querySelector("#bestGrid .best-card")); await page.waitForTimeout(500);
    await page.evaluate(() => abrirProduto("Salada Fria de Atum")); await page.waitForSelector("#optSheet.on");
    await page.tap("#optAdd"); assert.equal(await page.evaluate(() => cart.length), 0);
    await page.tap("#molhoC .chip:nth-child(1)"); await page.tap("#optAdd");
    assert.deepEqual(await page.evaluate(() => cart.map(i => [i.name, i.opts.join(","), i.price])), [["Salada Fria de Atum", "molho mostarda e mel", 475]]);
    assert.equal(await page.evaluate(() => ACAI_PREMIUM.find(x => x.n === "Granola Dubai").p), 100);
    for (const l of ["en", "fr", "de", "nl"]) {
      await page.evaluate(l => { closeAll(); setLang(l); abrirProduto("Salada Fria de Frango"); }, l);
      assert.equal(await page.evaluate(() => document.querySelectorAll("#molhoC .chip").length), 3);
    }
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
