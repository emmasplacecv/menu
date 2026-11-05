/* Segurança dos painéis: um pedido com código escondido no nome, na morada ou nas notas
   NÃO pode correr dentro da Gestão, da Cozinha nem das Vendas (onde está guardada a chave).
   E a Gestão avisa quando os valores do pedido não batem com o menu. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir, CHAVE } = require("./lib/ambiente");

const ATAQUE = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
const ATAQUE_JS = "x');window.__xss=(window.__xss||0)+1;//";
const hoje = () => new Date(Date.now() - 36e5).toISOString().slice(0, 10);

function pedidoMalicioso(extra) {
  return Object.assign({
    code: "PED-0111-" + ATAQUE_JS, nome: ATAQUE, tel: "991 23 45" + ATAQUE, modo: "entrega", slot: ATAQUE,
    zona: ATAQUE, morada: ATAQUE, notas: ATAQUE, itens: ["1x Frappé de Caramelo " + ATAQUE],
    linhas: [{ n: "Frappé de Caramelo", q: 1, p: 1 }], total: 1, pago: true, piso: 0, stock: {}
  }, extra || {});
}

async function painel(caminho, chaveLS, servidor) {
  const amb = await abrir({ servidor });
  await amb.context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [chaveLS, CHAVE]);
  const page = await amb.context.newPage();
  page.on("dialog", d => d.dismiss().catch(() => {}));
  return { amb, page, url: amb.base + caminho };
}

test("Gestão: dados do cliente aparecem como texto e o código não corre", async () => {
  const { amb, page, url } = await painel("/admin/", "ep_admin_key");
  try {
    amb.falso.responder("POST", new URL(amb.API + "/order"), JSON.stringify(Object.assign(pedidoMalicioso(), { dia: hoje() })));
    amb.falso.hoje = hoje();
    await page.goto(url);
    await page.waitForSelector("#pedidos .ped", { timeout: 15000 });
    const r = await page.evaluate(() => ({ xss: window.__xss || 0, img: document.querySelectorAll("#pedidos img[src='x']").length,
      texto: document.querySelector("#pedidos").innerText }));
    assert.equal(r.xss, 0, "o código escondido correu na Gestão");
    assert.equal(r.img, 0, "apareceu uma imagem vinda do nome do cliente");
    assert.match(r.texto, /<img src=x/, "o nome deve aparecer como texto");
    assert.match(r.texto, /Confirmar valores/, "falta o aviso de valores abaixo do menu");
    // os botões continuam a funcionar com códigos estranhos
    await page.click("#pedidos .ped .bok");
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.__xss || 0), 0);
    assert.equal(amb.falso.todos()[0].status, "confirmado", "o botão «Comprovativo recebido» deixou de funcionar");
  } finally { await amb.fechar(); }
});

test("Gestão: pedido com preços certos não mostra aviso", async () => {
  const { amb, page, url } = await painel("/admin/", "ep_admin_key");
  try {
    amb.falso.hoje = hoje();
    amb.falso.responder("POST", new URL(amb.API + "/order"), JSON.stringify({ code: "PED-0111-ABC", nome: "Ana", tel: "9912345",
      modo: "recolha", slot: "10:00", itens: ["1x Frappé de Caramelo"], linhas: [{ n: "Frappé de Caramelo", q: 1, p: 350 }],
      total: 333, pago: true, dia: hoje() }));
    await page.goto(url);
    await page.waitForSelector("#pedidos .ped", { timeout: 15000 });
    assert.doesNotMatch(await page.locator("#pedidos").innerText(), /Confirmar valores/);
  } finally { await amb.fechar(); }
});

test("Cozinha: dados do cliente aparecem como texto e o código não corre", async () => {
  const { amb, page, url } = await painel("/cozinha/", "ep_cozinha_key");
  try {
    amb.falso.hoje = hoje();
    amb.falso.responder("POST", new URL(amb.API + "/order"), JSON.stringify(Object.assign(pedidoMalicioso({ pago: false }), { dia: hoje() })));
    amb.falso.todos()[0].visto = "09:00";          // cartão já aberto: mostra tudo
    await page.goto(url);
    await page.waitForSelector("#lista .ped", { timeout: 15000 });
    await page.click("#lista .ped").catch(() => {});
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => ({ xss: window.__xss || 0, img: document.querySelectorAll("#lista img[src='x']").length }));
    assert.equal(r.xss, 0, "o código escondido correu na Cozinha");
    assert.equal(r.img, 0);
  } finally { await amb.fechar(); }
});

test("Vendas: pedido BAL- com código estranho não corre", async () => {
  const { amb, page, url } = await painel("/vendas/", "ep_vendas_key");
  try {
    amb.falso.hoje = hoje();
    amb.falso.responder("POST", new URL(amb.API + "/order"), JSON.stringify(Object.assign(pedidoMalicioso({ balcao: true, balcaoPago: false,
      code: "BAL-0111-" + ATAQUE_JS }), { dia: hoje() })));
    await page.goto(url);
    await page.waitForTimeout(2500);
    const cob = page.locator("button.cobrar2").first();
    if (await cob.count()) await cob.click().catch(() => {});
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__xss || 0), 0, "o código escondido correu nas Vendas");
  } finally { await amb.fechar(); }
});
