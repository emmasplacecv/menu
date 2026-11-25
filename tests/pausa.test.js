/* Pausa de 27-11 a 13-12-2026 (25-11-2026): aviso na capa, loja fechada só no site e horas fora da pausa.
   As horas são as de Cabo Verde (UTC−1); o relógio da página é fixado em cada fase. */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");
const TEL = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

async function pagina(amb, quando, lingua) {
  const page = await amb.context.newPage(); const erros = []; page.on("pageerror", e => erros.push(String(e)));
  await page.clock.setFixedTime(new Date(quando));
  if (lingua) await page.addInitScript(l => { try { localStorage.setItem("ep_lang", l); } catch (e) {} }, lingua);
  await page.goto(amb.base + "/" + (lingua ? "?lang=" + lingua : ""));
  await page.waitForFunction(() => document.querySelector("#bestGrid .best-card") && document.getElementById("capaA").textContent);
  await page.waitForTimeout(300);
  return { page, erros };
}
/* o relógio fixo baralha a rotação da capa: mostra-se sempre o primeiro da lista antes de ler */
const capa = page => page.evaluate(() => { _capaK = capaLista()[0]; desenharCapa(false); return { a: $("capaA").textContent, b: $("home-title").textContent,
  lista: capaLista().map(i => CAPA[i].pausa ? "pausa" : (CAPA[i].mural || CAPA[i].prod)), fechada: lojaFechada,
  banner: $("bannerFechado").style.display !== "none" ? $("bannerFechado").textContent : "",
  barra: document.querySelector(".bar").style.display, cta: $("capaCta").hidden }; });

test("antes da pausa: aviso abre a capa, encomendas normais", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const { page, erros } = await pagina(amb, "2026-11-25T21:00:00-01:00");
    const c = await capa(page);
    assert.equal(c.lista[0], "pausa"); assert.ok(c.lista.length > 1, "continua a rodar");
    assert.equal(c.a, "Vamos fazer uma pausa curta."); assert.equal(c.b, "Último dia: quinta-feira, até às 17h.");
    assert.equal(c.fechada, false); assert.equal(c.banner, "");
    assert.equal(c.cta, true, "sem botão de produto no aviso");
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("quinta 26-11: «hoje é o último dia» e um pedido que cairia na pausa fica sem horas", async () => {
  const amb = await abrir({ contexto: TEL, servidor: { slotDia: "2026-11-27" } });
  try {
    const { page, erros } = await pagina(amb, "2026-11-26T16:50:00-01:00");
    const c = await capa(page);
    assert.equal(c.b, "Hoje é o último dia, até às 17h."); assert.equal(c.fechada, false);
    await page.evaluate(() => fillSlots());
    await page.waitForFunction(() => !/A carregar/.test($("fSlot").textContent));
    assert.equal(await page.evaluate(() => slotVal), "");
    assert.match(await page.textContent("#slotMsg"), /Já não há horas antes da pausa/);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("durante a pausa: loja fechada no site, só o aviso na capa, sem enviar", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const { page, erros } = await pagina(amb, "2026-11-30T10:00:00-01:00");
    const c = await capa(page);
    assert.deepEqual(c.lista, ["pausa"]);
    assert.equal(c.a, "Estamos em pausa."); assert.equal(c.b, "Voltamos em Dezembro, com novidade.");
    assert.equal(c.fechada, true); assert.match(c.banner, /Estamos em pausa\.Voltamos em Dezembro/); assert.equal(c.barra, "none");
    assert.ok(await page.locator("#bestGrid .best-card.blocked").count() > 0, "produtos bloqueados");
    assert.equal(await page.evaluate(() => { cart.push({ name: "Americano", price: 150, q: 1 }); sendWA(); return enviando; }), false);
    assert.equal(amb.falso.chamadas.filter(x => x.metodo === "POST" && /order/.test(x.caminho)).length, 0);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("a pausa começa com a página aberta: o envio é recusado", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const { page, erros } = await pagina(amb, "2026-11-26T16:59:00-01:00");
    assert.equal((await capa(page)).fechada, false);
    await page.clock.setFixedTime(new Date("2026-11-26T17:01:00-01:00"));
    await page.evaluate(() => { cart.push({ name: "Americano", price: 150, q: 1 }); sendWA(); });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => lojaFechada), true);
    assert.equal(amb.falso.chamadas.filter(x => x.metodo === "POST" && /order/.test(x.caminho)).length, 0);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("sábado 12-12: «Voltamos segunda-feira, 14 de Dezembro», ainda fechada; segunda 14-12 tudo normal", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    let { page, erros } = await pagina(amb, "2026-12-12T10:00:00-01:00");
    let c = await capa(page);
    assert.deepEqual(c.lista, ["pausa"]); assert.equal(c.fechada, true);
    assert.equal(c.b, "Voltamos segunda-feira, 14 de Dezembro. E trazemos novidade.");
    assert.match(c.banner, /Voltamos segunda-feira, 14 de Dezembro/);
    await page.close();
    ({ page, erros } = await pagina(amb, "2026-12-14T08:05:00-01:00"));
    c = await capa(page);
    assert.ok(!c.lista.includes("pausa")); assert.equal(c.fechada, false); assert.equal(c.banner, "");
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("o aviso está traduzido nas 5 línguas", async () => {
  const amb = await abrir({ contexto: TEL });
  try {
    const { page, erros } = await pagina(amb, "2026-11-30T10:00:00-01:00");
    const r = await page.evaluate(() => ["pt", "en", "fr", "de", "nl"].map(l => {
      setLang(l); return [l, $("home-title").textContent, $("bannerFechado").textContent]; }));
    const vistos = new Set(r.map(x => x[1]));
    assert.equal(vistos.size, 5, JSON.stringify(r));
    for (const [l, b, f] of r) { assert.ok(b && f, l); assert.ok(!/temporariamente|temporarily/.test(f), l + ": " + f); }
    assert.equal(await page.evaluate(() => { setLang("pt"); return document.querySelector("#bestGrid .best-card.blocked").textContent.includes("Em pausa."); }), true);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
