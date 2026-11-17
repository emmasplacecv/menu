/* App de cliente (17-11-2026): manifesto, ícones, service worker sem tocar nos painéis, os meus pedidos e sem rede. */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const { abrir } = require("./lib/ambiente");
const RAIZ = path.join(__dirname, "..");
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

test("manifesto válido, ícones existem e o service worker não toca nos painéis", () => {
  const m = JSON.parse(fs.readFileSync(path.join(RAIZ, "manifest.webmanifest"), "utf8"));
  assert.equal(m.display, "standalone"); assert.equal(m.scope, "/"); assert.equal(m.start_url, "/?app=1");
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(RAIZ, i.src)), i.src);
  assert.ok(m.icons.some(i => i.sizes === "512x512" && i.purpose === "maskable"));
  const sw = fs.readFileSync(path.join(RAIZ, "sw.js"), "utf8");
  assert.match(sw, /PAINEIS = \/\^\\\/\(admin\|cozinha\|vendas\)/);
  assert.match(sw, /if \(req\.method !== "GET"\) return;/);
  for (const f of sw.match(/ESSENCIAL = \[([^\]]+)\]/)[1].match(/"([^"]+)"/g).map(x => x.slice(1, -1)))
    assert.ok(f === "/" || fs.existsSync(path.join(RAIZ, f)), "falta " + f);
});

test("os meus pedidos: botão do pedido em curso, folha e repetir", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const page = await amb.context.newPage(); const erros = []; page.on("pageerror", e => erros.push(String(e)));
    await page.goto(amb.base + "/"); await page.waitForFunction(() => window.EP_PEDIDOS && document.querySelector("#bestGrid .best-card"));
    await page.evaluate(() => localStorage.setItem("ep_pedidos", JSON.stringify([
      { code: "PED-1711-AAA", t: Date.now(), total: 350, modo: "entrega", est: "pronto", prePaga: true, s: "", itens: ["1x Frappé de Caramelo"], items: [{ n: "Frappé de Caramelo", m: {}, q: 1 }] },
      { code: "PED-1011-BBB", t: Date.now() - 5 * 864e5, total: 150, modo: "recolha", est: "entregue", prePaga: false, itens: ["1x Americano"], items: [{ n: "Americano", m: { size: "M" }, q: 1 }] }])));
    await page.reload(); await page.waitForFunction(() => window.EP_PEDIDOS && document.querySelector("#bestGrid .best-card")); await page.waitForTimeout(400);
    assert.match(await page.textContent("#pedPill"), /PED-1711-AAA/);
    await page.tap("#pedPill"); await page.waitForSelector("#pedSheet.on");
    const t = await page.textContent("#pedSheet");
    assert.match(t, /Em curso/); assert.match(t, /Anteriores/); assert.match(t, /✓ Levantado/);
    await page.tap('#pedSheet [data-a="rep"][data-c="PED-1011-BBB"]'); await page.waitForSelector("#cartSheet.on");
    assert.deepEqual(await page.evaluate(() => cart.map(i => i.name)), ["Americano"]);
    assert.match(await page.textContent("#pedNoCarrinho"), /Os meus pedidos \(2\)/);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("sem rede: faixa no topo e o pedido não sai", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const page = await amb.context.newPage(); const erros = [], alertas = []; page.on("pageerror", e => erros.push(String(e)));
    page.on("dialog", d => { alertas.push(d.message()); d.dismiss().catch(() => {}); });
    await page.goto(amb.base + "/"); await page.waitForFunction(() => window.EP_PEDIDOS && document.querySelector("#bestGrid .best-card")); await page.waitForTimeout(500);
    await page.evaluate(() => { abrirProduto("Frappé de Caramelo"); confirmAdd(); closeAll(); openCheckout(); });
    await page.fill("#fName", "Teste"); await page.fill("#fTel", "991 22 33");
    await amb.context.setOffline(true); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.getElementById("epSemRede").hidden), false);
    await page.tap("#nvPayB"); await page.waitForTimeout(500);
    assert.equal(amb.falso.chamadas.filter(c => c.caminho === "/order").length, 0);
    assert.ok(alertas.some(a => /sem rede/i.test(a)));
    await amb.context.setOffline(false);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
