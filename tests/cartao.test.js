/* Pagamento por cartão (SISP/vinti4): desligado não muda nada; ligado, o pedido segue com pag:"cartao". */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
async function checkout(amb, qs) {
  const page = await amb.context.newPage(); const erros = []; page.on("pageerror", e => erros.push(String(e)));
  await page.goto(amb.base + "/" + (qs || "")); await page.waitForFunction(() => document.querySelector("#bestGrid .best-card") && window.EP_CARTAO);
  await page.waitForTimeout(600);
  return { page, erros };
}
test("cartão desligado: checkout igual ao de sempre", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const { page, erros } = await checkout(amb);
    await page.evaluate(() => { abrirProduto("Frappé de Caramelo"); confirmAdd(); closeAll(); openCheckout(); });
    const chips = await page.evaluate(() => [...document.querySelectorAll("#bankChips .chip")].map(c => c.textContent.trim()));
    assert.equal(chips.length, 2); assert.ok(!chips.join().includes("Cartão"));
    assert.ok(await page.evaluate(() => /Emma's Place, Lda\..*NIF 210436336/.test(document.querySelector(".site-footer").textContent)));
    assert.ok(await page.evaluate(() => !!document.querySelector('.site-footer a[href="tel:+2389895324"]')));
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
test("cartão ligado: opção em primeiro, pedido leva pag:cartao; sem endereço para pagar cai na transferência", async () => {
  const amb = await abrir({ contexto: TEL, servidor: { extra: (m, cam) => cam === "/estado" ? { ok: true, fechado: false, msg: "", entregasOff: false, cartao: true } : null } });
  try {
    const { page, erros } = await checkout(amb);
    await page.evaluate(() => { abrirProduto("Frappé de Caramelo"); confirmAdd(); closeAll(); openCheckout(); });
    await page.fill("#fName", "Cliente Teste"); await page.fill("#fTel", "991 22 33");
    const chips = await page.evaluate(() => [...document.querySelectorAll("#bankChips .chip")].map(c => ({ t: c.textContent.trim(), sel: c.classList.contains("sel") })));
    assert.equal(chips.length, 3); assert.ok(chips[0].t.startsWith("Cartão") && chips[0].sel);
    assert.match(await page.textContent("#bankCard"), /SISP/);
    await page.tap("#nvPayB"); await page.waitForTimeout(400);                          // falta o email: não envia
    assert.equal(amb.falso.chamadas.filter(c => c.caminho === "/order").length, 0);
    await page.fill("#cfEmail", "cliente@example.com"); await page.fill("#cfMorada", "Rua 5, Palmarejo");
    await page.tap("#nvPayB"); await page.waitForSelector("#doneSheet.on");            // o servidor de teste não dá endereço para pagar
    const p = JSON.parse(amb.falso.chamadas.filter(c => c.caminho === "/order")[0].corpo);
    assert.equal(p.pag, "cartao");
    assert.deepEqual(p.fat, { email: "cliente@example.com", morada: "Rua 5, Palmarejo", cidade: "Praia", cp: "7600" });
    assert.match(await page.textContent("#okPay"), /BCA/);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
test("regresso da SISP: mensagem certa e endereço limpo", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const { page, erros } = await checkout(amb, "?cartao=ok&c=PED-1611-N8A");
    assert.ok(await page.evaluate(() => document.getElementById("cartaoFim").classList.contains("ok")));
    assert.match(await page.textContent("#cartaoFim"), /PED-1611-N8A/);
    assert.equal(await page.evaluate(() => location.search), "");
    await page.tap("#cfFechar"); assert.equal(await page.$("#cartaoFim"), null);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
