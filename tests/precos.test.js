/* Preços, descontos, taxas, códigos promocionais, stock e horários do site (index.html).
   Corre o site verdadeiro num navegador sem ecrã, com um servidor falso e o relógio fixo
   numa terça-feira às 10h00 de Cabo Verde. Os valores esperados saem das regras escritas no código
   (ver CLAUDE.md, "Regras de negócio"). Se um teste falhar depois de mudar uma regra de propósito,
   actualize o valor esperado aqui. */
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { abrir } = require("./lib/ambiente");

const TERCA_10H = new Date("2026-11-03T11:00:00Z");      // 10h00 em Cabo Verde (UTC−1)
let amb, page;

before(async () => {
  amb = await abrir({ servidor: { promos: {
    DEZ: { tipo: "pct", v: 10, d: "10% em tudo" },
    FRIA: { tipo: "catfree", cat: "BEBIDAS FRIAS", d: "bebida fria grátis" },
    ENTREGA: { tipo: "entrega", d: "entrega grátis", modo: "entrega" },
    MIN1000: { tipo: "fixo", v: 100, min: 1000, d: "100$ acima de 1000$" },
    SOLEVANTAR: { tipo: "fixo", v: 50, modo: "recolha", d: "50$ a levantar" }
  }, stock: { "Frappé de Caramelo": 10, "Açaí": 3 } } });
  page = await amb.context.newPage();
  page.on("dialog", d => d.dismiss().catch(() => {}));
  await page.clock.setFixedTime(TERCA_10H);
  await page.goto(amb.base + "/");
  await page.waitForFunction(() => typeof total === "function" && Array.isArray(MENU) && MENU.length > 5);
  await page.evaluate(() => { window.__limpar = () => {
    cart = []; promo = null; zona = null; piso = 0; semElevador = null; mode = "recolha"; timeMode = "asap"; slotVal = "";
    campAcai = false; escAcai = false; cfgCamp = null; cfgEsc = null; asapOff = false;
  };
  /* junta um produto pelo mesmo caminho que o cliente: abrir a ficha, escolher, "Adicionar" */
  window.__por = (nome, q, tam, leite) => {
    const f = findMenuItem(nome); if (!f) throw new Error("não está no menu: " + nome);
    for (let k = 0; k < (q || 1); k++) {
      pick(f.ci, f.ii);
      if (tam === "G") cur.size = "G";
      if (leite) cur.milk = leite;
      confirmAdd();
    }
    closeAll();
  };
  window.__contas = () => ({ sub: sub(), descOnline: descOnline(), descCamp: descCamp(), desconto: desconto(),
    subLiq: subLiq(), taxa: taxa(), andar: taxaAndar(), servico: servico(), total: total() }); });
});
after(async () => { if (amb) await amb.fechar(); });

const contas = fn => page.evaluate(fn);

/* ---------------- PREÇOS ---------------- */
test("preços: tamanho grande e leite vegetal somam ao preço", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 1, "G", "Aveia"); return { p: cart[0].price, o: cart[0].opts }; });
  assert.equal(c.p, 375 + 100);
  assert.deepEqual(c.o, ["Grande", "leite aveia"]);
});

test("preços: açaí com granola/leite em pó = 950", async () => {
  const p = await contas(() => { __limpar(); __por("Açaí", 1); return cart[0].price; });
  assert.equal(p, 950);
});

test("preços: combo = soma das partes −5%, arredondado para baixo aos 5 ECV", async () => {
  const r = await contas(() => COMBOS.map(c => ({ n: c.n, p: c.p, auto: precoComboAuto(c.partes, n => { const f = findMenuItem(n); return f ? +f.item.p : 0; }) })));
  for (const c of r) { assert.equal(c.p, c.auto, "combo " + c.n); assert.equal(c.p % 5, 0, "combo " + c.n + " não é múltiplo de 5"); }
  assert.equal(r.find(c => c.n === "PEQUENO-ALMOÇO").p, Math.floor((85 + 150) * 0.95 / 5) * 5);
});

/* ---------------- DESCONTOS ---------------- */
test("descontos: levantar com hora marcada = −5%", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 2); timeMode = "marcada"; slotVal = "10:30"; return __contas(); });
  assert.equal(c.sub, 700); assert.equal(c.descOnline, 35); assert.equal(c.total, 665);
});

test("descontos: 'assim que possível' não tem desconto", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 2); return __contas(); });
  assert.equal(c.descOnline, 0); assert.equal(c.total, 700);
});

test("descontos: açaí com hora marcada = −7,9% por copo (950 → 875)", async () => {
  const c = await contas(() => { __limpar(); __por("Açaí", 2); timeMode = "marcada"; slotVal = "10:30"; return __contas(); });
  assert.equal(c.descOnline, 75 * 2); assert.equal(c.total, 875 * 2);
});

test("descontos: combos não levam os 5% (já têm −5% no preço)", async () => {
  const c = await contas(() => { __limpar(); addCombo(0); closeAll(); __por("Frappé de Caramelo", 1); timeMode = "marcada"; slotVal = "10:30"; return Object.assign(__contas(), { combo: cart[0].price }); });
  assert.equal(c.descOnline, Math.round(350 * 0.05));
  assert.equal(c.total, c.combo + 350 - Math.round(350 * 0.05));
});

test("descontos: não acumulam — fica o maior (código 10% contra 5% online)", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 2); timeMode = "marcada"; slotVal = "10:30";
    promo = { c: "DEZ", tipo: "pct", v: 10 }; return __contas(); });
  assert.equal(c.descOnline, 0, "o 5% online devia ser anulado"); assert.equal(c.desconto, 70); assert.equal(c.total, 630);
});

test("descontos: empate entre código e desconto online — fica o código", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 2); timeMode = "marcada"; slotVal = "10:30";
    promo = { c: "X", tipo: "fixo", v: 35 }; return __contas(); });
  assert.equal(c.desconto, 35); assert.equal(c.descOnline, 0);
});

/* ---------------- CÓDIGOS PROMOCIONAIS ---------------- */
test("códigos: bebida fria grátis vale só para UMA bebida (a mais cara)", async () => {
  const c = await contas(() => { __limpar(); __por("Iced Latte", 1); __por("Frappé de Caramelo", 2);
    promo = { c: "FRIA", tipo: "catfree", cat: "BEBIDAS FRIAS" }; return __contas(); });
  assert.equal(c.desconto, 350); assert.equal(c.total, 225 + 700 - 350);
});

test("códigos: o código é verificado no servidor (código inválido recusado)", async () => {
  const msg = await contas(async () => { __limpar(); __por("Frappé de Caramelo", 1); openCheckout();
    document.getElementById("fPromo").value = "NAOEXISTE"; await aplicarPromo(); return { m: document.getElementById("promoMsg").innerText, promo }; });
  assert.equal(msg.promo, null); assert.match(msg.m, /inválido/i);
});

test("códigos: código com mínimo é retirado se o pedido descer abaixo do mínimo", async () => {
  const r = await contas(async () => { __limpar(); __por("Frappé de Caramelo", 3); openCheckout();
    document.getElementById("fPromo").value = "MIN1000"; await aplicarPromo(); const antes = !!promo;
    chg(cart[0].key, -1); refreshChk(); return { antes, depois: !!promo, msg: document.getElementById("promoMsg").innerText }; });
  assert.equal(r.antes, true, "com 1050 o código devia entrar");
  assert.equal(r.depois, false, "com 700 o código devia sair");
  assert.match(r.msg, /1000/, "a mensagem devia dizer o mínimo (1000 ECV)");
});

test("códigos: código só para levantar sai ao mudar para entrega, com a mensagem certa", async () => {
  const r = await contas(async () => { __limpar(); __por("Frappé de Caramelo", 1); openCheckout();
    document.getElementById("fPromo").value = "SOLEVANTAR"; await aplicarPromo(); const antes = !!promo;
    mode = "entrega"; refreshChk(); return { antes, depois: !!promo, msg: document.getElementById("promoMsg").innerText }; });
  assert.equal(r.antes, true); assert.equal(r.depois, false);
  assert.match(r.msg, /levantamento no local/, "a mensagem devia dizer para que modo o código vale");
});

test("códigos: código só para entregas sai ao mudar para levantar, com a mensagem certa", async () => {
  const r = await contas(async () => { __limpar(); __por("Frappé de Caramelo", 1); mode = "entrega"; openCheckout();
    document.getElementById("fPromo").value = "ENTREGA"; await aplicarPromo(); const antes = !!promo;
    mode = "recolha"; refreshChk(); return { antes, depois: !!promo, msg: document.getElementById("promoMsg").innerText }; });
  assert.equal(r.antes, true); assert.equal(r.depois, false);
  assert.match(r.msg, /entregas/, "a mensagem devia dizer que o código é para entregas");
});

test("códigos: código de entrega grátis não deixa cobrar a entrega", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 1); mode = "entrega"; zona = ZONAS.find(z => z.p === 300);
    promo = { c: "ENTREGA", tipo: "entrega", modo: "entrega" }; return __contas(); });
  assert.equal(c.taxa, 0);
});

/* ---------------- TAXAS DE ENTREGA ---------------- */
test("taxas: entrega na zona do Plateau (200) + 5% de serviço", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 2); mode = "entrega"; zona = ZONAS.find(z => z.n === "Platô / Plateau"); return __contas(); });
  assert.equal(c.taxa, 200); assert.equal(c.servico, 35); assert.equal(c.total, 700 + 200 + 35);
});

test("taxas: 750 certos ainda pagam entrega; acima de 750 é grátis (zona < 350)", async () => {
  const r = await contas(() => { __limpar(); mode = "entrega"; zona = ZONAS.find(z => z.p === 250);
    cart = [{ key: "a", name: "Teste", price: 750, opts: [], q: 1, meta: {}, icat: null, pt: 2 }];
    const t750 = taxa(); cart[0].price = 755; return { t750, t755: taxa() }; });
  assert.equal(r.t750, 250); assert.equal(r.t755, 0);
});

test("taxas: zona ≥ 350 acima de 750 só é grátis com hora marcada", async () => {
  const r = await contas(() => { __limpar(); mode = "entrega"; zona = ZONAS.find(z => z.p === 400);
    cart = [{ key: "a", name: "Teste", price: 900, opts: [], q: 1, meta: {}, icat: null, pt: 2 }];
    const asap = taxa(); timeMode = "marcada"; slotVal = "11:00"; return { asap, marcada: taxa() }; });
  assert.equal(r.asap, 400); assert.equal(r.marcada, 0);
});

test("taxas: sobretaxa de andar (1.º–3.º = 50, 4.º+ = 100, 4.º+ sem elevador = 150)", async () => {
  const r = await contas(() => { __limpar(); mode = "entrega"; const v = [];
    for (const [p, se] of [[0, null], [2, null], [4, false], [4, true]]) { piso = p; semElevador = se; v.push(taxaAndar()); }
    mode = "recolha"; piso = 4; v.push(taxaAndar()); return v; });
  assert.deepEqual(r, [0, 50, 100, 150, 0]);
});

test("taxas: levantar no local não paga entrega nem serviço", async () => {
  const c = await contas(() => { __limpar(); __por("Frappé de Caramelo", 1); return __contas(); });
  assert.equal(c.taxa, 0); assert.equal(c.servico, 0);
});

test("taxas: o Espresso sai do pedido ao mudar para entrega", async () => {
  page.removeAllListeners("dialog"); page.on("dialog", d => d.accept().catch(() => {}));   // o cliente diz "OK" ao aviso
  const r = await contas(() => { __limpar(); __por("Espresso", 1); __por("Frappé de Caramelo", 1); openCheckout(); setMode("entrega", true);
    return cart.map(i => i.name); });
  page.removeAllListeners("dialog"); page.on("dialog", d => d.dismiss().catch(() => {}));
  assert.ok(!r.includes("Espresso"), "o Espresso não vai para entrega");
  assert.ok(r.includes("Frappé de Caramelo"));
});

/* ---------------- HORÁRIOS ---------------- */
test("horários: janelas de levantamento e entrega por dia", async () => {
  const r = await contas(() => ({ seg: janelaDia(1, "recolha"), sab: janelaDia(6, "recolha"), dom: janelaDia(0, "recolha"),
    segEnt: janelaDia(1, "entrega"), sabEnt: janelaDia(6, "entrega") }));
  assert.deepEqual(r.seg, [8 * 60 + 30, 17 * 60 - 15]);
  assert.deepEqual(r.sab, [9 * 60 + 30, 15 * 60 - 15]);
  assert.equal(r.dom, null, "domingo fechado");
  assert.deepEqual(r.segEnt, [8 * 60 + 90, 17 * 60 - 60]);
  assert.deepEqual(r.sabEnt, [9 * 60 + 90, 15 * 60 - 60]);
});

test("horários: hora de Cabo Verde é UTC−1 (terça 10h00)", async () => {
  const r = await contas(() => agoraCV());
  assert.deepEqual(r, { dow: 2, min: 600 });
});

test("horários: os dados para o Google (JSON-LD) e o texto do site batem com o horário do código", async () => {
  const r = await contas(() => {
    const ld = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    return { ld: ld.openingHoursSpecification, h: HORARIO, txt: I18N.pt.horario };
  });
  const hm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  const dias = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
  for (const s of r.ld) for (const d of [].concat(s.dayOfWeek)) {
    assert.deepEqual([s.opens, s.closes], r.h[dias[d]].map(hm), "horário de " + d);
  }
  assert.equal(r.txt, "Seg–Sex 08h–17h · Sáb 09h–15h");
});

test("horários: o horário é igual no site, na Gestão e na Cozinha", async () => {
  const site = await contas(() => HORARIO);
  for (const [cam, nome] of [["/admin/", "HORARIO_GES"], ["/cozinha/", "HORARIO_COZ"]]) {
    const p = await amb.context.newPage();
    await p.goto(amb.base + cam);
    const h = await p.evaluate(n => eval(n), nome);
    await p.close();
    assert.deepEqual(h, site, nome);
  }
});

/* ---------------- STOCK ---------------- */
test("stock: a encomenda do site desconta as quantidades certas (combos ficam de fora)", async () => {
  const r = await contas(async () => { __limpar(); __por("Frappé de Caramelo", 2); __por("Frappé de Caramelo", 1, "G"); addCombo(0); closeAll();
    openCheckout(); document.getElementById("fName").value = "Teste"; document.getElementById("fTel").value = "9912345";
    banco = BANCOS[0]; const t = total(); await sendWA(); return t; });
  const ped = amb.falso.todos().at(-1);
  assert.ok(ped, "a encomenda não chegou ao servidor");
  assert.deepEqual(ped.stock, { "Frappé de Caramelo": 3 });
  assert.equal(amb.falso.stock["Frappé de Caramelo"], 7);
  assert.equal(ped.total, r, "o total guardado é o que o cliente viu");
  assert.equal(ped.linhas.reduce((s, l) => s + l.q * l.p, 0), 350 * 2 + 375 + ped.linhas.find(l => /^Combo/.test(l.n)).p);
});

test("stock: produto esgotado não pode ser escolhido", async () => {
  const r = await contas(async () => { __limpar(); esgotados = ["Frappé de Caramelo"]; build();
    const card = [...document.querySelectorAll("#menu *")].find(e => /Frappé de Caramelo/.test(e.textContent) && e.children.length < 6);
    const ok = /acabou|esgot/i.test((card && card.closest("[class]") && card.closest("[class]").parentElement.innerText) || "");
    esgotados = []; build(); return ok; });
  assert.ok(r, "o cartão do produto esgotado devia dizer que acabou");
});

/* ---------------- CONSISTÊNCIA ENTRE PÁGINAS ---------------- */
test("consistência: os preços do menu são iguais no site, nas Vendas, na Cozinha e na Gestão", async () => {
  const site = await contas(() => { const m = {}; MENU.forEach(c => c.items.forEach(i => { m[i.n] = [i.p, i.g || null]; })); return m; });
  const dif = [];
  for (const [cam, nome] of [["/vendas/", "MENU"], ["/cozinha/", "MENU_STK"], ["/admin/", "MENU"]]) {
    const p = await amb.context.newPage();
    await p.goto(amb.base + cam);
    const m = await p.evaluate(n => { const o = {}; eval(n).forEach(([, l]) => l.forEach(i => { o[i.n] = [i.m, i.g || null]; })); return o; }, nome);
    await p.close();
    for (const [n, v] of Object.entries(site)) {
      if (n === "Açaí") continue;                     // o açaí tem três preços próprios (ACAI_LINHAS)
      if (!(n in m)) dif.push(cam + " não tem «" + n + "»");
      else if (m[n][0] !== v[0] || m[n][1] !== v[1]) dif.push(cam + " «" + n + "»: " + m[n] + " (site " + v + ")");
    }
  }
  assert.deepEqual(dif, []);
});
