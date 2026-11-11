/* Páginas legais: Termos, Privacidade e Cancelamentos/Reembolsos.
   - as três abrem, têm título e ligam umas às outras;
   - o rodapé do site liga às três (com aviso "(PT)" nas outras línguas);
   - o checkout mostra a nota de aceitação com os três links, a abrir noutro separador (para não perder o carrinho). */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");

const PAGINAS = [
  ["/termos/", "Termos e Condições"],
  ["/privacidade/", "Política de Privacidade"],
  ["/reembolsos/", "Cancelamentos e Reembolsos"]
];

test("as três páginas legais abrem, têm título e ligam umas às outras", async () => {
  const amb = await abrir();
  try {
    const page = await amb.context.newPage();
    const erros = [];
    page.on("pageerror", e => erros.push(String(e)));
    for (const [caminho, titulo] of PAGINAS) {
      const r = await page.goto(amb.base + caminho);
      assert.equal(r.status(), 200, caminho);
      assert.equal((await page.textContent("h1")).trim(), titulo, caminho);
      assert.match(await page.textContent(".lg-meta"), /Última actualização/);
      const links = await page.$$eval(".lg-rodape nav a", as => as.map(a => a.getAttribute("href")));
      for (const [outro] of PAGINAS) assert.ok(links.includes(outro), caminho + " sem link para " + outro);
      const cssOk = await page.evaluate(() => getComputedStyle(document.querySelector(".lg-top")).backgroundColor);
      assert.equal(cssOk, "rgb(47, 33, 25)", caminho + ": legal.css não carregou");
    }
    assert.deepEqual(erros, []);
  } finally { await amb.fechar(); }
});

test("rodapé do site liga às três páginas, em todas as línguas", async () => {
  const amb = await abrir();
  try {
    const page = await amb.context.newPage();
    await page.goto(amb.base + "/");
    await page.waitForFunction(() => document.querySelector(".footer-legal a") && document.querySelector(".footer-legal a").textContent.length > 3);
    const pt = await page.$$eval(".footer-legal a", as => as.map(a => [a.getAttribute("href"), a.textContent.trim()]));
    assert.deepEqual(pt, [["/termos/", "Termos e Condições"], ["/privacidade/", "Política de Privacidade"], ["/reembolsos/", "Cancelamentos e Reembolsos"]]);
    for (const l of ["en", "fr", "de", "nl"]) {
      await page.evaluate(x => setLang(x), l);
      const txt = await page.$$eval(".footer-legal a", as => as.map(a => a.textContent.trim()));
      assert.equal(txt.length, 3, l);
      txt.forEach(x => assert.match(x, /\(PT\)$/, l + ": " + x));
    }
  } finally { await amb.fechar(); }
});

test("checkout: nota de aceitação com os três links, noutro separador", async () => {
  const amb = await abrir();
  try {
    const page = await amb.context.newPage();
    await page.goto(amb.base + "/");
    await page.waitForFunction(() => document.querySelector(".legal-aceito") && document.querySelector(".legal-aceito").innerHTML.length > 20);
    const links = await page.$$eval(".legal-aceito a", as => as.map(a => [a.getAttribute("href"), a.target, a.rel]));
    assert.deepEqual(links.map(x => x[0]), ["/termos/", "/reembolsos/", "/privacidade/"]);
    links.forEach(x => { assert.equal(x[1], "_blank"); assert.equal(x[2], "noopener"); });
    /* a nota fica logo antes do botão «Confirmar encomenda» */
    const antes = await page.evaluate(() => document.querySelector(".legal-aceito").nextElementSibling.getAttribute("onclick"));
    assert.equal(antes, "sendWA()");
  } finally { await amb.fechar(); }
});
