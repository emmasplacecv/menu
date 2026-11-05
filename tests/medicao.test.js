/* Medição do funil (MEDICAO.md): conta visita, carrinho e checkout uma vez por dia, sem dados pessoais.
   O site, o carrinho e o pedido têm de funcionar mesmo que o servidor ainda não tenha a rota /m. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir, CHAVE } = require("./lib/ambiente");

const TERCA_10H = new Date("2026-11-03T11:00:00Z");

async function site(amb, comoResponde, semMetricas) {
  const m = [];
  await amb.context.route(amb.API + "/m?**", route => {
    m.push(new URL(route.request().url()).searchParams.get("e"));
    if (comoResponde === "rede") return route.abort("internetdisconnected");
    if (comoResponde === "404") return route.fulfill({ status: 404, contentType: "text/html", body: "<h1>Not found</h1>" });
    return route.fulfill({ status: 204, body: "" });
  });
  if (semMetricas) await amb.context.addInitScript(() => { try { localStorage.setItem("ep_sem_metricas", "1"); } catch (e) {} });
  const page = await amb.context.newPage(); const erros = [], alertas = [];
  page.on("pageerror", e => erros.push(e.message));
  page.on("dialog", d => { alertas.push(d.message()); d.accept().catch(() => {}); });
  await page.clock.setFixedTime(TERCA_10H);
  await page.goto(amb.base + "/");
  await page.waitForFunction(() => typeof sendWA === "function" && Array.isArray(MENU) && MENU.length > 5);
  return { page, m, erros, alertas };
}
async function encomendar(page) {
  return page.evaluate(async () => {
    const f = findMenuItem("Frappé de Caramelo"); pick(f.ci, f.ii); confirmAdd(); closeAll();
    openCheckout(); document.getElementById("fName").value = "Teste"; document.getElementById("fTel").value = "9912345";
    banco = BANCOS[0]; await sendWA(); return !!ultimoPedido;
  });
}

for (const caso of ["404", "rede"]) {
  test("sem a rota /m no servidor (" + caso + "): site, carrinho e pedido funcionam", async () => {
    const amb = await abrir();
    try {
      const { page, m, erros } = await site(amb, caso);
      const feito = await encomendar(page);
      await page.waitForTimeout(500);
      assert.deepEqual(erros, [], "erros na página");
      assert.equal(feito, true, "o pedido devia ficar feito");
      assert.equal(amb.falso.todos().length, 1, "o pedido devia chegar ao servidor");
      assert.ok(m.includes("visita"), "a visita devia ter sido contada (mesmo sem resposta)");
    } finally { await amb.fechar(); }
  });
}

test("conta visita, carrinho e checkout uma só vez por dia, sem dados pessoais", async () => {
  const amb = await abrir();
  try {
    const { page, m, erros } = await site(amb, "204");
    await encomendar(page);
    await page.evaluate(() => { const f = findMenuItem("Iced Latte"); pick(f.ci, f.ii); confirmAdd(); closeAll(); openCheckout(); });
    await page.reload(); await page.waitForFunction(() => typeof sendWA === "function");
    await page.waitForTimeout(500);
    assert.deepEqual(erros, []);
    assert.deepEqual(m.sort(), ["carrinho", "checkout", "visita"], "cada passo conta uma vez por dia");
  } finally { await amb.fechar(); }
});

test("«Não registar a minha visita»: não conta nada", async () => {
  const amb = await abrir();
  try {
    const { page, m } = await site(amb, "204", true);
    await encomendar(page);
    await page.waitForTimeout(500);
    assert.deepEqual(m, []);
  } finally { await amb.fechar(); }
});

test("o texto do rodapé diz que se contam as visitas sem dados pessoais", async () => {
  const amb = await abrir();
  try {
    const { page } = await site(amb, "204");
    const t = await page.locator("#privBox").innerText();
    assert.match(t, /Microsoft Clarity/); assert.match(t, /contamos as visitas por dia, sem dados pessoais/);
  } finally { await amb.fechar(); }
});

test("Gestão: ligação discreta «Funil do site»", async () => {
  const amb = await abrir();
  try {
    await amb.context.addInitScript(([k]) => { try { localStorage.setItem("ep_admin_key", k); } catch (e) {} }, [CHAVE]);
    const page = await amb.context.newPage();
    await page.goto(amb.base + "/admin/");
    await page.waitForSelector("#painel", { state: "visible", timeout: 15000 });
    const a = page.locator(".funil a");
    assert.equal(await a.getAttribute("href"), "https://wispy-cherry-ee2e.joaomleal88.workers.dev/metricas-pagina");
    assert.equal(await a.getAttribute("target"), "_blank");
    assert.ok(await a.isVisible());
  } finally { await amb.fechar(); }
});
