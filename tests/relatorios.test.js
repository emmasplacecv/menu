/* /relatorios: CSV para a contabilista, resumo por dia, produto × hora e cópia de segurança. */
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const { abrir, CHAVE } = require("./lib/ambiente");

function semear(falso) {
  const ped = (dia, o) => falso.responder("POST", new URL("https://x/order"), JSON.stringify(Object.assign({ dia, modo: "recolha", stock: {} }, o)));
  ped("2026-10-05", { code: "PED-0510-AAA", nome: "Maria Silva", tel: "9911111", criado: "x", linhas: [{ n: "Frappé de Caramelo", q: 2, p: 350 }], total: 665, pago: true });
  ped("2026-10-05", { code: "BAL-0510-BBB", nome: "Cliente 1", linhas: [{ n: "Açaí", q: 1, p: 950 }], total: 950, balcao: true, balcaoPago: true, balcaoMetodo: "vinti4" });
  ped("2026-10-06", { code: "BAL-0610-CCC", nome: "Cliente 2", linhas: [{ n: "Espresso", q: 3, p: 85 }], total: 255, balcao: true, balcaoPago: true, balcaoMetodo: "dinheiro" });
  ped("2026-10-06", { code: "PED-0610-DDD", nome: "João; \"Zé\"", linhas: [{ n: "Frappé de Caramelo", q: 1, p: 350 }], total: 350, pago: true });
  falso.pedidos["2026-10-05"][0].criado = "09:12";
  falso.pedidos["2026-10-05"][1].criado = "09:40";
  falso.pedidos["2026-10-06"][0].criado = "15:05";
  falso.pedidos["2026-10-06"][1].criado = "15:30";
  falso.pedidos["2026-10-06"][1].status = "cancelado";
}

test("relatórios do mês: totais, CSV sem dados pessoais, cancelados fora dos totais, produto × hora, cópia JSON", async () => {
  const amb = await abrir();
  try {
    semear(amb.falso);
    await amb.context.addInitScript(([k]) => { try { localStorage.setItem("ep_admin_key", k); } catch (e) {} }, [CHAVE]);
    const page = await amb.context.newPage();
    await page.clock.setFixedTime(new Date("2026-11-04T12:00:00Z"));
    await page.goto(amb.base + "/relatorios/");
    await page.waitForSelector("#painel", { state: "visible", timeout: 10000 });
    await page.fill("#fMes", "2026-10");
    await page.click("#btnLer");
    await page.waitForSelector("#res", { state: "visible", timeout: 20000 });
    const kpis = await page.locator("#kpis").innerText();
    assert.match(kpis, /1870 ECV/, "vendido = 665 + 950 + 255 (o cancelado não conta)");
    assert.match(await page.locator("#avisos").innerText(), /cancelado/);

    const ler = async botao => {
      const [dl] = await Promise.all([page.waitForEvent("download"), page.click(`button:has-text("${botao}")`)]);
      return { nome: dl.suggestedFilename(), txt: fs.readFileSync(await dl.path(), "utf8") };
    };
    const c = await ler("CSV para a contabilista");
    assert.equal(c.nome, "vendas-2026-10.csv");
    assert.ok(c.txt.startsWith("﻿Data;Hora;Código;Origem;Modo;Estado;Pagamento;Total (ECV);Artigos"));
    assert.doesNotMatch(c.txt, /Maria|9911111|João/, "o CSV da contabilista não leva nomes nem telefones");
    assert.match(c.txt, /05\/10\/2026;09:12;PED-0510-AAA;Website;Levantar;Vendido;transferência;665;2x Frappé de Caramelo/);
    assert.match(c.txt, /BAL-0510-BBB;Balcão;Levantar;Vendido;Vinti4 \(POS\);950/);
    assert.match(c.txt, /PED-0610-DDD;Website;Levantar;Cancelado/);
    assert.match(c.txt, /Total do mês \(sem cancelados\);;;;;;;1870;3 pedidos/);

    const r = await ler("CSV resumo por dia");
    assert.match(r.txt, /05\/10\/2026;2;950;665;1615;0;950;665;0;0/);
    assert.match(r.txt, /06\/10\/2026;1;255;0;255;255;0;0;0;0/);

    const ph = await ler("CSV produto × hora");
    assert.match(ph.txt, /Produto;Quantidade;Valor \(ECV\);09h;15h/);
    assert.match(ph.txt, /Espresso;3;255;0;3/);
    assert.match(ph.txt, /Frappé de Caramelo;2;700;2;0/, "o frappé cancelado não conta");

    const j = await ler("Cópia de segurança");
    const copia = JSON.parse(j.txt);
    assert.equal(copia.mes, "2026-10");
    assert.equal(copia.dias.flatMap(d => d.pedidos).length, 4, "a cópia leva todos os pedidos, cancelados incluídos");
    assert.ok(copia.dias.flatMap(d => d.pedidos).some(p => p.nome === "Maria Silva"));
    assert.ok(amb.falso.chamadas.every(x => x.caminho === "/orders"), "os relatórios só podem ler");
  } finally { await amb.fechar(); }
});
