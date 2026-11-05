/* Página /sobre/ (português e inglês): sem erros, sem deslizar para o lado no telemóvel, as bebidas são as do menu
   do site (todas as de café e matcha à venda), espaços dos fundadores marcados, botões para o menu, sem afirmações
   sobre o café usado, alergénios ou saúde. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const { abrir } = require("./lib/ambiente");

for (const [w, h] of [[360, 740], [430, 932]]) {
  test(`/sobre/ no telemóvel ${w}px: português e inglês, bebidas do menu, botões, espaços por preencher`, async () => {
    const amb = await abrir({ contexto: { viewport: { width: w, height: h }, isMobile: true, hasTouch: true } });
    try {
      const site = await amb.context.newPage();
      await site.goto(amb.base + "/");
      await site.waitForFunction(() => typeof findMenuItem === "function" && MENU.length > 5);
      const aVenda = await site.evaluate(() => MENU.filter(c => ["BEBIDAS QUENTES", "BEBIDAS FRIAS", "MATCHA &amp; COCO"].includes(c.cat))
        .flatMap(c => c.items.map(i => i.n)));
      await site.close();

      const page = await amb.context.newPage(); const erros = [];
      page.on("pageerror", e => erros.push(e.message));
      await page.goto(amb.base + "/sobre/", { waitUntil: "load" });
      const ver = () => page.evaluate(() => ({
        lang: document.documentElement.lang,
        h1: [...document.querySelectorAll("h1")].filter(e => e.offsetParent !== null).map(e => e.textContent.trim()),
        largura: document.documentElement.scrollWidth, ecra: innerWidth,
        texto: document.body.innerText
      }));
      let r = await ver();
      assert.deepEqual(erros, []);
      assert.equal(r.lang, "pt"); assert.deepEqual(r.h1, ["Sobre a Emma's Place"]);
      assert.ok(r.largura <= r.ecra, "desliza para o lado (pt): " + r.largura);
      await page.click('.linguas button[data-set="en"]');
      r = await ver();
      assert.equal(r.lang, "en"); assert.deepEqual(r.h1, ["About Emma's Place"]);
      assert.ok(r.largura <= r.ecra, "desliza para o lado (en): " + r.largura);
      assert.doesNotMatch(r.texto, /Sobre a Emma|Quem está por trás/, "texto em português à vista na versão inglesa");

      const d = await page.evaluate(() => ({
        bebidas: [...document.querySelectorAll(".beb h3")].map(e => e.textContent.trim()),
        semEstado: [...document.querySelectorAll(".beb")].filter(b => !b.querySelector("small")).length,
        verMenu: [...document.querySelectorAll(".sitebar .topcart, .intro .go")].map(a => a.getAttribute("href")),
        encomendar: document.querySelector(".fim .go").getAttribute("href"),
        porPreencher: document.querySelectorAll(".por-preencher").length,
        fotos: [...document.querySelectorAll(".beb img")].map(i => i.getAttribute("src"))
      }));
      assert.deepEqual(d.bebidas.slice().sort(), aVenda.slice().sort(), "as bebidas da página têm de ser as de café e matcha à venda no menu");
      assert.equal(d.semEstado, 0, "cada bebida diz se é confirmada ou composição habitual");
      assert.deepEqual(d.verMenu, ["/", "/"]); assert.equal(d.encomendar, "/#menu");
      assert.ok(d.porPreencher >= 3, "faltam os espaços marcados dos fundadores");
      for (const f of d.fotos) assert.ok(fs.existsSync(path.join(__dirname, "..", f)), "foto que não existe no site: " + f);

      for (const l of ["pt", "en"]) {
        await page.click(`.linguas button[data-set="${l}"]`);
        const t = await page.evaluate(() => document.body.innerText);
        assert.doesNotMatch(t, /alerg[ée]nio|allergen|saud[áa]vel|healthy|o melhor|the best|100 ?%|premium|biol[óo]gico|organic/i, "afirmação não confirmada (" + l + ")");
        assert.doesNotMatch(t, /usamos|servimos (café|grão)|o nosso café é|we use|our coffee is/i, "não pode dizer que café a Emma's Place usa (" + l + ")");
      }
    } finally { await amb.fechar(); }
  });
}

test("página principal: uma só ligação discreta para /sobre/; sitemap tem /sobre/", async () => {
  const s = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.equal((s.match(/href="\/sobre\/"/g) || []).length, 1);
  assert.match(s, /<span class="footer-locais">[^<]*<a href="\/sobre\/">/);
  assert.ok(fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8").includes("<loc>https://emmasplace.cv/sobre/</loc>"));
});
