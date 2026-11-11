/* menu-base.json = os preços e regras de base do site, lidos pelo servidor (Worker) para confirmar
   o valor de cada pedido. Este teste abre o site verdadeiro e compara: se alguém mudar um preço,
   um combo, uma zona ou uma regra no index.html e se esquecer de regenerar o ficheiro, falha.
   Para regenerar:  ATUALIZAR=1 node --test tests/menu-base.test.js                              */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { abrir, RAIZ } = require("./lib/ambiente");
const FICHEIRO = path.join(RAIZ, "menu-base.json");

async function lerDoSite() {
  const amb = await abrir();
  try {
    const page = await amb.context.newPage();
    await page.goto(amb.base + "/");
    await page.waitForFunction(() => typeof MENU !== "undefined" && typeof COMBOS !== "undefined" && document.querySelector(".footer-legal a"));
    await page.waitForTimeout(1200);          // menu-edit (vazio) e combos automáticos aplicados
    return await page.evaluate(() => ({
      v: 1,
      regras: { FREE, TAXA, ZONA_MARCADA_MIN, DESC_ONLINE, DESC_ACAI, TAXA_SERVICO, COMBO_DESC, ESC_PRECO2, ESC_PRECO3, CAMP_PCT2,
        CAMP_PROD, CFG_CAMP, CFG_ESC, PROMO_UMA_UNIDADE, SO_BALCAO: "Espresso" },
      leites: LEITES, leitePadrao: LEITE_PADRAO, acaiK: ACAI_K,
      premium: ACAI_PREMIUM.map(x => ({ n: x.n, p: x.p, granola: !!x.granola })),
      shakes16: SHAKES_16OZ, nomes: NOMES_NOVOS, chaveExtraAcai: exK("acai", "§"),
      menu: MENU.map(c => ({ cat: c.cat, tk: c.tk || "", extras: c.extras || [],
        items: c.items.map(i => { const o = { n: i.n, p: i.p }; if (i.g) o.g = i.g; if (i.nm) o.nm = 1;
          if (i.top) { o.top = i.top; o.base = i.base || []; o.xt = i.xt || []; o.sp = i.sp; o.xp = i.xp; } return o; }) })),
      combos: COMBOS.map(c => c.partes ? { n: c.n, p: c.p, partes: c.partes } : { n: c.n, p: c.p }),
      zonas: Object.fromEntries(ZONAS.map(z => [z.n, z.p]))
    }));
  } finally { await amb.fechar(); }
}

test("menu-base.json está igual ao menu do site", async () => {
  const doSite = await lerDoSite();
  if (process.env.ATUALIZAR === "1") fs.writeFileSync(FICHEIRO, JSON.stringify(doSite) + "\n");
  const guardado = JSON.parse(fs.readFileSync(FICHEIRO, "utf8"));
  assert.deepEqual(guardado, doSite, "menu-base.json desactualizado: correr  ATUALIZAR=1 node --test tests/menu-base.test.js");
  assert.ok(doSite.menu.length >= 8 && Object.keys(doSite.zonas).length >= 50);
});
