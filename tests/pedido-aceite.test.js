/* 1) O site só mostra "pedido feito" quando o servidor aceita o pedido; se recusar, mostra a mensagem do servidor.
   2) Gestão e Cozinha mostram em destaque "STOCK EM FALTA" quando o pedido traz stockFalta. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir, CHAVE } = require("./lib/ambiente");

const TERCA_10H = new Date("2026-11-03T11:00:00Z");      // 10h00 em Cabo Verde
const hoje = () => new Date(Date.now() - 36e5).toISOString().slice(0, 10);

/* abre o site, junta 1 Frappé de Caramelo e envia o pedido; devolve o que o cliente viu */
async function encomendar(amb, respostaOrder) {
  amb.enviosOrder = 0;
  if (respostaOrder) await amb.context.route(amb.API + "/order", route =>
    (++amb.enviosOrder, respostaOrder === "rede") ? route.abort("internetdisconnected")
      : route.fulfill({ status: respostaOrder.status, contentType: "application/json", body: JSON.stringify(respostaOrder.corpo) }));
  const page = await amb.context.newPage();
  const alertas = [];
  page.on("dialog", d => { alertas.push(d.message()); d.accept().catch(() => {}); });
  await page.clock.setFixedTime(TERCA_10H);
  await page.goto(amb.base + "/");
  await page.waitForFunction(() => typeof sendWA === "function" && Array.isArray(MENU) && MENU.length > 5);
  const r = await page.evaluate(async () => {
    const f = findMenuItem("Frappé de Caramelo"); pick(f.ci, f.ii); confirmAdd(); closeAll();
    openCheckout(); document.getElementById("fName").value = "Teste"; document.getElementById("fTel").value = "9912345";
    banco = BANCOS[0];
    await sendWA();
    let guardado = null; try { guardado = localStorage.getItem("ep_ultimo_pedido"); } catch (e) {}
    return { feito: !!ultimoPedido, carrinho: cart.length, guardado: !!guardado,
      okVisivel: !!document.querySelector(".sheet.on #okCode, #okCode:not(:empty)") };
  });
  return Object.assign(r, { alertas, page });
}

test("site: servidor aceita → «pedido feito» e o carrinho fica vazio", async () => {
  const amb = await abrir();
  try {
    const r = await encomendar(amb);
    assert.equal(r.feito, true); assert.equal(r.carrinho, 0); assert.equal(r.guardado, true);
    assert.equal(amb.falso.todos().length, 1);
  } finally { await amb.fechar(); }
});

test("site: servidor recusa (com mensagem) → mostra a mensagem e NÃO diz «pedido feito»", async () => {
  for (const status of [200, 409]) {
    const amb = await abrir();
    try {
      const r = await encomendar(amb, { status, corpo: { erro: "Já não há Frappé de Caramelo suficiente. Retire 1 do pedido." } });
      assert.equal(r.feito, false, "não pode mostrar «pedido feito» (HTTP " + status + ")");
      assert.equal(r.carrinho, 1, "o pedido fica no ecrã para corrigir");
      assert.equal(r.guardado, false, "pedido recusado não fica em «Repetir este pedido»");
      assert.ok(r.alertas.includes("Já não há Frappé de Caramelo suficiente. Retire 1 do pedido."), "devia mostrar a mensagem do servidor");
    } finally { await amb.fechar(); }
  }
});

test("site: sem resposta do servidor → aviso de ligação, sem «pedido feito» e sem segundo envio", async () => {
  const amb = await abrir();
  try {
    const r = await encomendar(amb, "rede");
    assert.equal(r.feito, false); assert.equal(r.carrinho, 1);
    assert.ok(r.alertas.some(a => /Não foi possível registar o pedido/.test(a)));
    assert.equal(amb.enviosOrder, 1, "o site só pode tentar uma vez por toque");
  } finally { await amb.fechar(); }
});

test("site: erro do servidor sem mensagem (HTTP 500) → aviso de ligação, sem «pedido feito»", async () => {
  const amb = await abrir();
  try {
    const r = await encomendar(amb, { status: 500, corpo: {} });
    assert.equal(r.feito, false);
    assert.ok(r.alertas.some(a => /Não foi possível registar o pedido/.test(a)));
  } finally { await amb.fechar(); }
});

/* ---------- Gestão e Cozinha ---------- */
function pedido(amb, extra) {
  amb.falso.hoje = hoje();
  amb.falso.responder("POST", new URL(amb.API + "/order"), JSON.stringify(Object.assign({
    code: "PED-0511-ABC", nome: "Ana", tel: "9912345", modo: "recolha", slot: "10:00", itens: ["2x Açaí"],
    linhas: [{ n: "Açaí", q: 2, p: 950 }], total: 1750, pago: true, dia: hoje() }, extra)));
}
async function painel(amb, cam, chave) {
  await amb.context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [chave, CHAVE]);
  const page = await amb.context.newPage();
  page.on("dialog", d => d.dismiss().catch(() => {}));
  await page.goto(amb.base + cam);
  return page;
}

for (const [forma, valor, esperado] of [
  ["mapa", { "Açaí": 1 }, /STOCK EM FALTA: Açaí \(falta 1\)/],
  ["lista", ["Açaí", "Granola"], /STOCK EM FALTA: Açaí · Granola/],
  ["lista de objectos", [{ n: "Açaí", q: 2 }], /STOCK EM FALTA: Açaí \(falta 2\)/],
  ["true", true, /STOCK EM FALTA/]
]) {
  test("Gestão: aviso em destaque com stockFalta (" + forma + ")", async () => {
    const amb = await abrir();
    try {
      pedido(amb, { stockFalta: valor });
      const page = await painel(amb, "/admin/", "ep_admin_key");
      await page.waitForSelector("#pedidos .ped", { timeout: 15000 });
      const aviso = page.locator("#pedidos .ped .stkf");
      assert.equal(await aviso.count(), 1);
      assert.match(await aviso.innerText(), esperado);
    } finally { await amb.fechar(); }
  });
}

test("Gestão: sem stockFalta não há aviso; nomes estranhos aparecem como texto", async () => {
  const amb = await abrir();
  try {
    pedido(amb, {});
    pedido(amb, { code: "PED-0511-XYZ", stockFalta: { '<img src=x onerror="window.__xss=1">': 1 } });
    const page = await painel(amb, "/admin/", "ep_admin_key");
    await page.waitForSelector("#pedidos .ped", { timeout: 15000 });
    assert.equal(await page.locator("#pedidos .ped .stkf").count(), 1);
    assert.equal(await page.evaluate(() => window.__xss || 0), 0);
  } finally { await amb.fechar(); }
});

test("Cozinha: aviso no cartão tapado e no cartão aberto", async () => {
  const amb = await abrir();
  try {
    pedido(amb, { stockFalta: { "Açaí": 1 } });
    amb.falso.todos()[0].status = "confirmado";
    const page = await painel(amb, "/cozinha/", "ep_cozinha_key");
    await page.waitForSelector("#lista .ped", { timeout: 15000 });
    const tapado = await page.locator("#lista .ped").first().innerText();
    if (/Toque para abrir/.test(tapado)) {
      assert.match(tapado, /STOCK EM FALTA/, "o cartão tapado devia avisar");
      await page.click("#lista .ped.capa");
      await page.waitForSelector("#lista .ped:not(.capa) .stkf", { timeout: 10000 });
    }
    assert.match(await page.locator("#lista .ped .stkf").first().innerText(), /STOCK EM FALTA: Açaí \(falta 1\)/);
  } finally { await amb.fechar(); }
});
