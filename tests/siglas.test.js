/* 23-11-2026: Vendas — pesquisa por sigla (PRF = Pão Recheado de Frango), em paralelo com a pesquisa pelo nome. */
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { abrir, CHAVE } = require("./lib/ambiente");

test("vendas: siglas únicas, pesquisa por sigla e pesquisa pelo nome igual a antes", async () => {
  const amb = await abrir({});
  try {
    await amb.context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, ["ep_vendas_key", CHAVE]);
    const page = await amb.context.newPage(); const erros = []; page.on("pageerror", e => erros.push(String(e)));
    page.on("dialog", d => d.dismiss().catch(() => {}));
    await page.goto(amb.base + "/vendas/"); await page.waitForTimeout(2500);

    const busca = async q => { await page.fill("#fBusca", q); return page.evaluate(() => [...document.querySelectorAll("#prods .prod b")].map(b => b.textContent)); };

    /* siglas: uma por produto, todas diferentes */
    const sg = await page.evaluate(() => { const m = siglas(); return [...m.entries()]; });
    const vals = sg.map(x => x[1]);
    assert.equal(new Set(vals).size, vals.length, "há siglas repetidas: " + JSON.stringify(sg));
    const S = Object.fromEntries(sg);
    assert.equal(S["Pão Recheado de Frango"], "prf");
    assert.equal(S["Salada Fria de Frango"], "sff");
    assert.equal(S["Frappé de Chocolate"], "fch");
    assert.equal(S["Frappé de Caramelo"], "fca");
    assert.equal(S["Frappé Clássico"], "fcl");
    assert.equal(S["Espresso"], "es");
    assert.notEqual(S["Combo SOPA E PÃO"], S["Combo SALADA E PÃO"]);
    assert.ok(!vals.some(v => /\d/.test(v)), "sigla com número de recurso: " + JSON.stringify(sg));

    /* com os milkshakes da Gestão (como em produção) continuam todas diferentes */
    const comShakes = await page.evaluate(() => {
      MENU.push(["SMOOTHIES/ MILKSHAKE/ BATIDOS", ["Morango", "Chocolate", "Baunilha", "Framboesa", "Groselha", "Manga"].map(s => ({ n: "Milkshake de " + s, m: 400 }))]);
      const m = siglas(); const v = [...m.values()]; const r = Object.fromEntries(m); MENU.pop(); return { v, r };
    });
    assert.equal(new Set(comShakes.v).size, comShakes.v.length, "repetidas com milkshakes");
    assert.ok(!comShakes.v.some(v => /\d/.test(v)));

    /* sigla exacta: aparece só esse produto (ou primeiro) */
    assert.deepEqual(await busca("PRF"), ["Pão Recheado de Frango"]);
    assert.deepEqual(await busca("prf"), ["Pão Recheado de Frango"]);
    assert.deepEqual(await busca("SFF"), ["Salada Fria de Frango"]);
    assert.equal((await busca("FCH"))[0], "Frappé de Chocolate");
    /* sigla «à mão», a seguir o nome: FPC e PRDF */
    assert.ok((await busca("FPC")).includes("Frappé de Chocolate"));
    assert.deepEqual(await busca("PRDF"), ["Pão Recheado de Frango"]);
    /* sigla curta: os dois que começam assim, os exactos primeiro */
    assert.deepEqual(await busca("SF"), ["Salada Fria de Frango", "Salada Fria de Atum"]);
    /* a sigla acerta fica realçada no cartão */
    await busca("PRF");
    assert.equal(await page.evaluate(() => document.querySelector("#prods .prod .sig.hit").textContent), "PRF");

    /* pesquisa pelo nome: mesmos resultados e mesma ordem de antes */
    const antes = q => page.evaluate(q => { const b = normalizar(q), o = []; MENU.forEach(c => c[1].forEach(i => { if (normalizar(i.n).includes(b)) o.push(i.n); })); return o; }, q);
    for (const q of ["latte", "frango", "açaí", "mocha", "chocolate", "pão recheado", "iced", "sumo de"]) {
      const r = await busca(q), a = await antes(q);
      for (const n of a) assert.ok(r.includes(n), `«${q}» deixou de encontrar ${n}`);
      if (/\s/.test(q) || q.length > 6) assert.deepEqual(r, a, `«${q}» mudou de ordem`);
    }
    assert.deepEqual(await busca("xyzq"), []);
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});
