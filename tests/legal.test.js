/* Páginas legais: Termos, Privacidade e Cancelamentos/Reembolsos, nas 5 línguas.
   - as três abrem, têm título e ligam umas às outras;
   - abrem na língua escolhida no site (ep_lang) e o selector muda de língua;
   - o rodapé do site liga às três, com o nome certo em cada língua;
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
    const NOMES = {
      en: ["Terms and Conditions", "Privacy Policy", "Cancellations and Refunds"],
      fr: ["Conditions générales", "Politique de confidentialité", "Annulations et remboursements"],
      de: ["AGB", "Datenschutzerklärung", "Stornierung und Erstattung"],
      nl: ["Algemene voorwaarden", "Privacybeleid", "Annuleren en terugbetalen"]
    };
    for (const l of Object.keys(NOMES)) {
      await page.evaluate(x => setLang(x), l);
      const txt = await page.$$eval(".footer-legal a", as => as.map(a => a.textContent.trim()));
      assert.deepEqual(txt, NOMES[l], l);
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

test("as páginas legais abrem na língua do site e o selector muda de língua", async () => {
  const amb = await abrir();
  try {
    const page = await amb.context.newPage();
    const TIT = {
      pt: ["Termos e Condições", "Política de Privacidade", "Cancelamentos e Reembolsos"],
      en: ["Terms and Conditions", "Privacy Policy", "Cancellations and Refunds"],
      fr: ["Conditions générales", "Politique de confidentialité", "Annulations et remboursements"],
      de: ["Allgemeine Geschäftsbedingungen", "Datenschutzerklärung", "Stornierung und Erstattung"],
      nl: ["Algemene voorwaarden", "Privacybeleid", "Annuleren en terugbetalen"]
    };
    await page.goto(amb.base + "/termos/");
    for (const l of Object.keys(TIT)) {
      await page.evaluate(x => localStorage.setItem("ep_lang", x), l);
      for (let i = 0; i < PAGINAS.length; i++) {
        await page.goto(amb.base + PAGINAS[i][0]);
        const h1 = await page.$$eval("h1", hs => hs.filter(h => h.offsetParent !== null).map(h => h.textContent.trim()));
        assert.deepEqual(h1, [TIT[l][i]], l + " " + PAGINAS[i][0]);
        assert.equal(await page.evaluate(() => document.documentElement.lang), l);
        const txt = await page.evaluate(() => document.querySelector(".lg-lang:not([hidden])").innerText);
        assert.match(txt, /geral@emmasplace\.cv/, l + " sem email");
        if (PAGINAS[i][0] !== "/privacidade/") assert.match(txt, /30/, l + " sem prazo de 30 min");
      }
    }
    /* selector: carregar em DE muda a página e fica guardado para o site */
    await page.evaluate(() => localStorage.setItem("ep_lang", "pt"));
    await page.goto(amb.base + "/reembolsos/");
    await page.click('[data-ir="de"]');
    assert.equal(await page.$eval('.lg-lang:not([hidden]) h1', h => h.textContent.trim()), "Stornierung und Erstattung");
    assert.equal(await page.evaluate(() => localStorage.getItem("ep_lang")), "de");
    /* link entre páginas com âncora: /termos/#reclamacoes vai para a secção da língua certa */
    await page.goto(amb.base + "/termos/#reclamacoes");
    const visivel = await page.evaluate(() => { const r = document.getElementById("reclamacoes-de").getBoundingClientRect(); return r.top >= -5 && r.top < innerHeight; });
    assert.ok(visivel, "âncora #reclamacoes não foi para a secção em alemão");
  } finally { await amb.fechar(); }
});
