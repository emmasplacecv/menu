/* /vendas e /cozinha SEM INTERNET (painel-offline.js):
   - a venda feita offline fica guardada no aparelho e segue sozinha quando a rede volta;
   - não fica em duplicado, nem quando a resposta do servidor se perde a meio;
   - o stock desconta uma vez só;
   - a página abre sem internet (service worker) depois de aberta uma vez com rede. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir, CHAVE } = require("./lib/ambiente");

const espera = ms => new Promise(r => setTimeout(r, ms));
async function ate(fn, ms, txt) {
  const fim = Date.now() + (ms || 20000);
  while (Date.now() < fim) { if (await fn()) return; await espera(250); }
  throw new Error("tempo esgotado: " + (txt || ""));
}

async function vendas(opc) {
  const amb = await abrir(Object.assign({ servidor: { stock: { "Frappé de Caramelo": 5, "Açaí": 1 } } }, opc || {}));
  await amb.context.addInitScript(([k]) => { try { localStorage.setItem("ep_vendas_key", k); } catch (e) {} window.EPO_T_DUVIDA = 3000; }, [CHAVE]);
  const page = await amb.context.newPage();
  page.on("dialog", d => d.accept().catch(() => {}));
  await page.goto(amb.base + "/vendas/");
  await page.waitForFunction(() => window.EPO && typeof enviar === "function" && typeof KEY === "string" && KEY.length > 0, null, { timeout: 15000 });
  await espera(1500);                                       // primeiras leituras guardadas no aparelho
  return { amb, page };
}
/* uma venda ao balcão, pelo mesmo botão "Enviar" das funcionárias */
const vender = (page, nome, q, preco) => page.evaluate(async ([n, q, p]) => {
  balcoes[activo].itens = [{ nome: n, q, preco: p }]; balcoes[activo].pago = true; balcoes[activo].met = "dinheiro";
  await enviar(); return document.getElementById("envMsg").textContent;
}, [nome, q, preco]);
const porEnviar = page => page.evaluate(() => EPO.porEnviar());

test("venda sem internet fica guardada e chega UMA vez quando a rede volta; stock desconta uma vez", async () => {
  const { amb, page } = await vendas();
  try {
    amb.falso.rede = false;
    const msg = await vender(page, "Frappé de Caramelo", 2, 350);
    assert.match(msg, /Sem internet/, "a funcionária deve ver que ficou guardado no aparelho");
    assert.equal(await porEnviar(page), 1);
    assert.equal(amb.falso.todos().length, 0);
    amb.falso.rede = true;
    await page.evaluate(() => EPO.sincronizar());
    await ate(async () => (await porEnviar(page)) === 0 && amb.falso.todos().length === 1, 30000, "sincronizar");
    await espera(1500); await page.evaluate(() => EPO.sincronizar()); await espera(1000);
    const ped = amb.falso.todos();
    assert.equal(ped.length, 1, "a venda ficou duplicada");
    assert.equal(ped[0].total, 700);
    assert.equal(ped[0].feitoOffline, true);
    assert.equal(amb.falso.stock["Frappé de Caramelo"], 3, "stock devia descer 2, uma vez");
  } finally { await amb.fechar(); }
});

test("resposta perdida a meio (o servidor gravou, o aparelho não soube): não duplica", async () => {
  const { amb, page } = await vendas();
  try {
    let perder = 1;
    await amb.context.route(amb.API + "/order?**", async route => {
      if (route.request().method() === "POST" && perder > 0) {
        perder--;
        amb.falso.responder("POST", new URL(route.request().url()), route.request().postData());   // o servidor grava…
        return route.abort("connectionreset");                                                   // …e a resposta perde-se
      }
      return route.fallback();
    });
    await vender(page, "Frappé de Caramelo", 1, 350);
    assert.equal(amb.falso.todos().length, 1);
    assert.equal(await porEnviar(page), 1, "o aparelho não sabe que chegou: fica na fila");
    await page.evaluate(() => EPO.sincronizar());
    await ate(async () => (await porEnviar(page)) === 0, 30000, "fila vazia");
    assert.equal(amb.falso.todos().length, 1, "a venda ficou duplicada");
    assert.equal(amb.falso.stock["Frappé de Caramelo"], 4);
  } finally { await amb.fechar(); }
});

test("resposta perdida + servidor lento a mostrar o que gravou (como o KV): continua sem duplicar", async () => {
  const { amb, page } = await vendas();
  try {
    let perder = 1; const escondido = new Map();          // id -> instante em que foi gravado
    await amb.context.route(amb.API + "/order?**", async route => {
      if (route.request().method() === "POST" && perder > 0) {
        perder--;
        const r = amb.falso.responder("POST", new URL(route.request().url()), route.request().postData());
        escondido.set(r.id, Date.now());
        return route.abort("connectionreset");
      }
      return route.fallback();
    });
    await amb.context.route(amb.API + "/orders?**", async route => {        // a lista só mostra o pedido 2,5 s depois
      const u = new URL(route.request().url());
      const d = amb.falso.responder("GET", u, null);
      if (d.pedidos) d.pedidos = d.pedidos.filter(p => !(escondido.has(p.id) && Date.now() - escondido.get(p.id) < 2500));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(d) });
    });
    await vender(page, "Frappé de Caramelo", 1, 350);
    await page.evaluate(() => EPO.sincronizar());             // logo a seguir: a lista ainda não mostra a venda
    await ate(async () => (await porEnviar(page)) === 0, 30000, "fila vazia");
    assert.equal(amb.falso.todos().length, 1, "a venda ficou duplicada (o aparelho reenviou antes de o servidor a mostrar)");
  } finally { await amb.fechar(); }
});

test("várias vendas offline seguem pela ordem e com o pago/estado certos", async () => {
  const { amb, page } = await vendas();
  try {
    amb.falso.rede = false;
    await vender(page, "Frappé de Caramelo", 1, 350);
    await vender(page, "Açaí", 1, 950);
    await vender(page, "Frappé de Caramelo", 1, 350);
    assert.equal(await porEnviar(page), 3);
    amb.falso.rede = true;
    await page.evaluate(() => EPO.sincronizar());
    await ate(async () => (await porEnviar(page)) === 0, 30000, "fila vazia");
    const ped = amb.falso.todos();
    assert.equal(ped.length, 3);
    assert.deepEqual(ped.map(p => p.total), [350, 950, 350]);
    assert.ok(ped.every(p => p.balcao && p.balcaoPago === true));
    assert.equal(new Set(ped.map(p => p.code)).size, 3, "códigos repetidos");
    assert.equal(amb.falso.stock["Frappé de Caramelo"], 3);
    assert.equal(amb.falso.stock["Açaí"], 0);
  } finally { await amb.fechar(); }
});

test("stock sem internet: o aparelho mostra o stock já com as vendas por enviar", async () => {
  const { amb, page } = await vendas();
  try {
    amb.falso.rede = false;
    await vender(page, "Frappé de Caramelo", 2, 350);
    const st = await page.evaluate(async () => (await (await fetch("https://wispy-cherry-ee2e.joaomleal88.workers.dev/stock-dia")).json()).itens);
    assert.equal(st["Frappé de Caramelo"], 3);
  } finally { await amb.fechar(); }
});

test("cozinha sem internet: mudar o estado fica na fila e chega depois", async () => {
  const amb = await abrir();
  try {
    const hoje = new Date(Date.now() - 36e5).toISOString().slice(0, 10);
    amb.falso.hoje = hoje;
    amb.falso.responder("POST", new URL(amb.API + "/order?key=" + CHAVE), JSON.stringify({ code: "BAL-0411-AAA", nome: "Cliente 1",
      modo: "recolha", slot: "10:00", itens: ["1x Frappé de Caramelo"], linhas: [{ n: "Frappé de Caramelo", q: 1, p: 350 }], total: 350,
      balcao: true, balcaoPago: true, dia: hoje }));
    await amb.context.addInitScript(([k]) => { try { localStorage.setItem("ep_cozinha_key", k); } catch (e) {} }, [CHAVE]);
    const page = await amb.context.newPage();
    page.on("dialog", d => d.accept().catch(() => {}));
    await page.goto(amb.base + "/cozinha/");
    await page.waitForSelector("#lista .ped .bnx", { timeout: 15000 });
    amb.falso.rede = false;
    await page.click("#lista .ped .bnx");                // "Começar"
    await ate(async () => (await page.evaluate(() => EPO.porEnviar())) === 1, 10000, "estado na fila");
    assert.equal(amb.falso.todos()[0].status, "confirmado");
    amb.falso.rede = true;
    await page.evaluate(() => EPO.sincronizar());
    await ate(async () => amb.falso.todos()[0].status === "preparar", 20000, "estado no servidor");
  } finally { await amb.fechar(); }
});

test("as Vendas abrem sem internet depois de abertas uma vez com rede", async () => {
  const amb = await abrir({ serviceWorkers: "allow" });
  try {
    await amb.context.addInitScript(([k]) => { try { localStorage.setItem("ep_vendas_key", k); } catch (e) {} }, [CHAVE]);
    const page = await amb.context.newPage();
    await page.goto(amb.base + "/vendas/");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();                                   // agora controlada pelo service worker: fica copiada
    await espera(1500);
    await amb.context.setOffline(true);
    amb.falso.rede = false;
    await page.reload();
    await page.waitForFunction(() => typeof enviar === "function", null, { timeout: 15000 });
    assert.match(await page.title(), /Vendas/);
  } finally { await amb.fechar(); }
});
