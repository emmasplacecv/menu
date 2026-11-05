/* Limpeza visual da página principal (05-11-2026), no telemóvel pequeno (360×740) e grande (430×932), nos 5 idiomas:
   barra do topo opaca com categorias, idioma em selector, música na barra (nunca por cima de botões de compra),
   açaí e mais pedidos no topo, banner do açaí com a foto real, barra do carrinho em baixo, preços sempre "950$",
   "Em breve" depois dos produtos à venda, texto curto do açaí com o aviso de disponibilidade,
   e uma encomenda completa feita com toques nos botões (servidor falso). */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");

const TERCA_10H = new Date("2026-11-03T11:00:00Z");
const LINGUAS = ["pt", "en", "fr", "de", "nl"];
const TELEMOVEIS = [[360, 740, "pequeno"], [430, 932, "grande"]];
const VER_CARRINHO = { pt: "Ver carrinho", en: "View cart", fr: "Voir le panier", de: "Warenkorb ansehen", nl: "Winkelwagen bekijken" };

async function abrirSite(lang, w, h) {
  const amb = await abrir({ contexto: { viewport: { width: w, height: h }, isMobile: true, hasTouch: true } });
  await amb.context.addInitScript(l => { try { localStorage.setItem("ep_lang", l); } catch (e) {} }, lang);
  const page = await amb.context.newPage(); const erros = [];
  page.on("pageerror", e => erros.push(e.message));
  page.on("dialog", d => d.accept().catch(() => {}));
  await page.clock.setFixedTime(TERCA_10H);
  await page.goto(amb.base + "/");
  await page.waitForFunction(() => typeof sendWA === "function" && document.querySelectorAll("#menuCards .pc").length > 20);
  await page.waitForTimeout(300);
  return { amb, page, erros };
}

for (const [w, h, tam] of TELEMOVEIS) for (const lang of LINGUAS) {
  test(`telemóvel ${tam} · ${lang}: topo, ordem, preços, carrinho e encomenda completa`, async () => {
    const { amb, page, erros } = await abrirSite(lang, w, h);
    try {
      const r = await page.evaluate(() => {
        const topo = document.querySelector(".topo-fixo"), y = id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top + scrollY : null; };
        const fundo = getComputedStyle(topo).backgroundColor;
        const musica = document.getElementById("musicBtn"), sel = document.getElementById("langSel");
        return {
          lang: document.documentElement.lang, fundo, posTopo: getComputedStyle(topo).position,
          catnavNoTopo: !!document.querySelector(".topo-fixo #catNav"), nCats: document.querySelectorAll("#catNav button").length,
          musicaNoTopo: !!musica.closest(".topo-fixo"), musicaPos: getComputedStyle(musica).position,
          linguas: [...sel.options].map(o => o.value), linguaEscolhida: sel.value, botoesLingua: document.querySelectorAll(".langs button").length,
          acai: y("novidades"), mais: y("mais-pedidos"), ecra: innerHeight,
          largura: document.documentElement.scrollWidth, larguraEcra: innerWidth,
          emBreveDepois: !!(document.getElementById("cat-combos").compareDocumentPosition(document.getElementById("cat-embreve")) & 4)
            && !!(document.getElementById("menuCards").compareDocumentPosition(document.getElementById("cat-embreve")) & 4),
          ultimaCat: [...document.querySelectorAll("#catNav button")].pop().dataset.alvo,
          barraVisivel: getComputedStyle(document.querySelector(".bar")).display !== "none",
          trop: getComputedStyle(document.getElementById("capaTropFundo"), "::before").backgroundImage,
          desenhoVisivel: [...document.querySelectorAll("#capaTropFundo > *, #capaMuralFundo > *")].some(e => getComputedStyle(e).display !== "none"),
          precos: [...document.querySelectorAll(".pc-pr b, .best-price, .cp, .drop-price:not(:empty)")].map(e => e.textContent.trim()),
          textoAcai: document.querySelector('#novidades [data-i18n="dropSub"]').textContent.trim(),
          avisoAcai: document.querySelector('#novidades [data-i18n="dropNote"]').textContent.trim(),
          ecvVisivel: (document.body.innerText.match(/\d\s*ECV/g) || [])
        };
      });
      assert.deepEqual(erros, [], "erros na página");
      assert.equal(r.lang, lang);
      // 3) barra do topo: cabeçalho + categorias, fixa e opaca
      assert.equal(r.posTopo, "sticky"); assert.ok(r.catnavNoTopo); assert.ok(r.nCats >= 10);
      assert.match(r.fundo, /^rgb\(/, "o fundo da barra do topo tem de ser opaco: " + r.fundo);
      // 2) idiomas num selector pequeno
      assert.deepEqual(r.linguas, LINGUAS); assert.equal(r.linguaEscolhida, lang); assert.equal(r.botoesLingua, 0);
      // 5) música mantém-se, na barra do topo (não flutua por cima dos botões de compra)
      assert.ok(r.musicaNoTopo); assert.notEqual(r.musicaPos, "fixed");
      // 1) açaí e mais pedidos o mais acima possível
      assert.ok(r.acai < r.ecra * 0.5, `açaí a ${r.acai}px`); assert.ok(r.mais < r.ecra * 1.25, `mais pedidos a ${r.mais}px`);
      // 4) banner do açaí: foto real, sem o desenho
      assert.match(r.trop, /capa-4\.webp/); assert.equal(r.desenhoVisivel, false);
      // 7) preços sempre "950$"
      assert.ok(r.precos.length > 30);
      for (const p of r.precos) assert.match(p, /^\d+\$( · \d+\$)?$|^\d+\$\s*$/, "preço fora do formato: «" + p + "»");
      assert.deepEqual(r.ecvVisivel, [], "valores em ECV à vista");
      // 8) "Em breve" depois dos produtos à venda (e no fim da barra de categorias)
      assert.ok(r.emBreveDepois); assert.equal(r.ultimaCat, "cat-embreve");
      // 9) texto do açaí: até duas frases + aviso de disponibilidade
      assert.ok((r.textoAcai.match(/[.!?](\s|$)/g) || []).length <= 2, "texto do açaí com mais de 2 frases: " + r.textoAcai);
      assert.ok(r.avisoAcai.length > 20 && r.avisoAcai.length < 140);
      assert.ok(r.largura <= r.larguraEcra, "a página desliza para o lado");
      assert.equal(r.barraVisivel, false, "a barra do carrinho só aparece com produtos");

      // ---- encomenda completa, com toques nos botões ----
      await page.locator('#menuCards .pc[data-k="Frappé de Caramelo"] .pc-add').click();
      await page.locator("#optAdd").click();                                       // Médio, leite normal
      await page.locator("#cartSheet .gs").click();                                // continuar a escolher
      await page.locator('#novidades figure[data-prod="Açaí"] .drop-add').click();
      await page.locator("#optAdd").click();
      await page.locator("#cartSheet .gs").click();
      // 6) barra em baixo: quantidade, total e "Ver carrinho"
      const barra = await page.evaluate(() => ({ vis: getComputedStyle(document.querySelector(".bar")).display !== "none",
        txt: document.getElementById("cartBtn").innerText.replace(/\s+/g, " ").trim(), sub: sub(),
        alturaBarra: document.querySelector(".bar").getBoundingClientRect().height,
        folga: parseFloat(getComputedStyle(document.body).paddingBottom) }));
      assert.ok(barra.vis);
      assert.equal(barra.txt, `2 ${VER_CARRINHO[lang]} ${barra.sub}$`);
      assert.ok(barra.folga >= barra.alturaBarra, "a barra de baixo não pode tapar o fim da página");
      await page.locator("#cartBtn").click();
      const linhas = await page.locator("#cartBody .cp2").allInnerTexts();
      assert.ok(linhas.length === 2 && linhas.every(x => /^\d+\$$/.test(x.trim())), "linhas do carrinho: " + linhas);
      await page.locator("#toCheckout").click();
      await page.fill("#fName", "Teste"); await page.fill("#fTel", "9912345");
      const totais = await page.locator("#chkTotals").innerText();
      assert.doesNotMatch(totais, /ECV/); assert.match(totais, /\d+\$/);
      const totalVisto = await page.evaluate(() => total());
      await page.locator('button[onclick="sendWA()"]').click();
      await page.waitForSelector("#doneSheet.on", { timeout: 10000 });
      const ped = amb.falso.todos().at(-1);
      assert.ok(ped, "o pedido não chegou ao servidor");
      assert.equal(ped.total, totalVisto);
      assert.deepEqual(ped.linhas.map(l => l.n).sort(), ["Açaí", "Frappé de Caramelo"]);
      assert.deepEqual(erros, [], "erros na página durante a encomenda");
    } finally { await amb.fechar(); }
  });
}

test("idioma: o selector muda o site para a língua escolhida", async () => {
  const { amb, page } = await abrirSite("pt", 360, 740);
  try {
    await page.selectOption("#langSel", "en");
    await page.waitForFunction(() => document.documentElement.lang === "en");
    assert.match(await page.locator("#topoFixo").innerText(), /ICED|COLD|HOT/i);
  } finally { await amb.fechar(); }
});

test("música: o botão continua a ligar e desligar, agora na barra do topo", async () => {
  const { amb, page } = await abrirSite("pt", 360, 740);
  try {
    const antes = await page.evaluate(() => epMusicaEstado().ligada);
    await page.locator(".topo-fixo #musicBtn").click();
    const depois = await page.evaluate(() => epMusicaEstado().ligada);
    assert.notEqual(antes, depois);
  } finally { await amb.fechar(); }
});
