/* Preços do /admin e esgotados chegam ao ecrã sem pedidos em fila: com o servidor lento, os preços certos
   aparecem depois de UMA espera (antes eram três: menu do dia → esgotados → stock do dia). */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");

test("servidor lento (2 s): preços do /admin em ~2 s, esgotados e stock a zero aplicados", async () => {
  const amb = await abrir({ servidor: { edit: { p: { "Frape Caramelo": { m: 360, g: 390 } }, off: [], add: [], ord: {} },
    stock: { "Frappé de Chocolate": 0, "Açaí": 5 } } });
  try {
    amb.falso.esgotados = ["Iced Mocha"];
    amb.falso.atrasoMs = 2000;
    const page = await amb.context.newPage(); const erros = [];
    page.on("pageerror", e => erros.push(e.message));
    const t0 = Date.now();
    await page.goto(amb.base + "/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => { const b = document.querySelector('#menuCards .pc[data-k="Frappé de Caramelo"] .pc-p b');
      return b && b.textContent.indexOf("360") === 0; }, null, { timeout: 15000, polling: 100 });
    const t = Date.now() - t0;
    assert.ok(t < 4500, "os preços do /admin demoraram " + t + " ms (servidor a 2 s)");
    await page.waitForFunction(() => esgotados.includes("Iced Mocha") && esgotados.includes("Frappé de Chocolate"), null, { timeout: 15000 });
    const r = await page.evaluate(() => ({
      mocha: !!document.querySelector('#menuCards .pc.blk[data-k="Iced Mocha"]'),
      choc: !!document.querySelector('#menuCards .pc.blk[data-k="Frappé de Chocolate"]'),
      acai: esgotados.includes("Açaí") }));
    assert.ok(r.mocha, "esgotado do dia não aparece bloqueado");
    assert.ok(r.choc, "produto com stock 0 não aparece bloqueado");
    assert.equal(r.acai, false);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
