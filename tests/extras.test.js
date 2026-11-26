/* 21-11-2026: canela (Latte Espanhol) e molhos das saladas no TEM / ACABOU dos extras do dia.
   Gestão e Cozinha marcam; o site e as Vendas bloqueiam; com os dois molhos em ACABOU a salada vai «sem molho». */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { abrir, CHAVE } = require("./lib/ambiente");
const MOSTARDA = "@x:molho:Mostarda e mel", IOGURTE = "@x:molho:Iogurte com maionese", CANELA = "@x:com:Canela";

async function painel(caminho, chaveLS) {
  const amb = await abrir({});
  await amb.context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, [chaveLS, CHAVE]);
  const page = await amb.context.newPage();
  page.on("dialog", d => d.dismiss().catch(() => {}));
  return { amb, page };
}

test("site: canela e molho em ACABOU ficam bloqueados; os dois molhos acabados = «sem molho»", async () => {
  const amb = await abrir({ contexto: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } });
  try {
    amb.falso.esgotados = [CANELA, MOSTARDA];
    const page = await amb.context.newPage(); const erros = []; page.on("pageerror", e => erros.push(String(e)));
    await page.goto(amb.base + "/"); await page.waitForFunction(() => document.querySelector("#bestGrid .best-card")); await page.waitForTimeout(500);

    await page.evaluate(() => abrirProduto("Latte Espanhol")); await page.waitForSelector("#optSheet.on");
    assert.equal(await page.evaluate(() => [...document.querySelectorAll("#optBody .chip")].filter(b => /Canela/.test(b.textContent))[0].disabled), true);

    await page.evaluate(() => { closeAll(); abrirProduto("Salada Fria de Atum"); }); await page.waitForSelector("#optSheet.on");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("#molhoC .chip")].map(b => b.disabled)), [true, false, false]);
    await page.tap("#molhoC .chip:nth-child(2)"); await page.tap("#optAdd");
    assert.deepEqual(await page.evaluate(() => cart.map(i => i.opts.join(","))), ["molho iogurte natural com maionese e mostarda"]);

    /* o iogurte acaba depois de estar no carrinho: sai do pedido e a salada fica «sem molho», mesmo preço */
    amb.falso.esgotados.push(IOGURTE);
    const r = await page.evaluate(async () => { await carregarEsgotados(); const m = exLimparCarrinho(); return { m, c: cart.map(i => [i.opts.join(","), i.price]) }; });
    assert.equal(r.m.length, 1);
    assert.deepEqual(r.c, [["sem molho", 475]]);

    /* com os dois molhos acabados a salada abre já com «sem molho» e entra no carrinho sem mais nada */
    await page.evaluate(() => { cart = []; closeAll(); abrirProduto("Salada Fria de Frango"); }); await page.waitForSelector("#optSheet.on");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("#molhoC .chip")].map(b => [b.disabled, b.classList.contains("sel")])),
      [[true, false], [true, false], [false, true]]);
    await page.tap("#optAdd");
    assert.deepEqual(await page.evaluate(() => cart.map(i => [i.name, i.opts.join(",")])), [["Salada Fria de Frango", "sem molho"]]);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("vendas: canela e molho em ACABOU ficam bloqueados", async () => {
  const { amb, page } = await painel("/vendas/", "ep_vendas_key");
  try {
    amb.falso.esgotados = [CANELA, MOSTARDA];
    const erros = []; page.on("pageerror", e => erros.push(String(e)));
    await page.goto(amb.base + "/vendas/"); await page.waitForTimeout(2500);
    const abrirP = n => page.evaluate(n => { const ci = MENU.findIndex(c => c[1].some(i => i.n === n)); add(ci, MENU[ci][1].findIndex(i => i.n === n)); }, n);
    await abrirP("Latte Espanhol");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("#tCorpo .tp")].filter(b => /canela/i.test(b.textContent)).map(b => [b.textContent.trim(), b.disabled])), [["Sem canela acabou", true]]);
    await page.evaluate(() => fecharTamanho());
    await abrirP("Salada Fria de Atum");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll("#tCorpo .tp")].map(b => b.disabled)), [true, false, false]);
    await page.evaluate(() => { opMolho(1); escolherTamanho("M"); });
    assert.deepEqual(await page.evaluate(() => balcoes[activo].itens.map(x => [x.nome, x.xk])),
      [["Salada Fria de Atum (molho iogurte natural com maionese e mostarda)", [IOGURTE]]]);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

for (const [caminho, chave, lista, botao] of [["/admin/", "ep_admin_key", "#listaEx", "button.sw"], ["/cozinha/", "ep_cozinha_key", "#extrasLista", "button.stog"]]) {
  test(caminho + ": canela e molhos aparecem nos extras e gravam a chave certa", async () => {
    const { amb, page } = await painel(caminho, chave);
    try {
      const erros = []; page.on("pageerror", e => erros.push(String(e)));
      await page.goto(amb.base + caminho); await page.waitForTimeout(2500);
      await page.evaluate(() => { if (typeof verAba === "function") verAba("esg"); if (typeof verSeccao === "function") verSeccao("stk"); });
      await page.waitForFunction(l => /Canela/.test(document.querySelector(l).innerText), lista, { timeout: 15000 });
      const txt = await page.evaluate(l => document.querySelector(l).innerText, lista);
      for (const n of ["Canela", "Mostarda e mel", "Iogurte com maionese"]) assert.match(txt, new RegExp(n));
      await page.evaluate(([l, b]) => [...document.querySelectorAll(l + " " + b)].find(x => /Iogurte com maionese/.test(x.parentNode.innerText)).click(), [lista, botao]);
      await page.waitForTimeout(400);
      assert.ok(amb.falso.esgotados.includes("@x:molho:Iogurte com maionese"), "não gravou o molho como ACABOU");
      assert.deepEqual(erros, []);
    } finally { await amb.fechar(); }
  });
}
