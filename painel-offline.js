/* =====================================================================
   painel-offline.js — Emma's Place · 15-10-2026
   Faz os painéis (Vendas, Cozinha, Gestão) continuarem a trabalhar SEM INTERNET.

   Como funciona (não é preciso mexer no servidor/Worker):
   - LEITURAS (pedidos, stock, esgotados, menu, estado): cada resposta boa do
     servidor fica guardada neste aparelho. Sem internet, a página recebe a
     última cópia guardada, já com as vendas feitas offline somadas por cima.
   - ESCRITAS do dia-a-dia (venda, pago, estado na cozinha, apagar, stock −1,
     acabou/tem): sem internet vão para uma FILA neste aparelho (IndexedDB) e
     a página continua como se tivesse corrido bem. Quando a ligação volta,
     a fila é enviada sozinha, pela ordem em que foi feita.
   - Antes de enviar uma venda guardada, confirma no servidor se o código
     BAL-… já lá está — assim uma ligação que cai a meio não duplica vendas.
   - ALTERAÇÕES DE GESTÃO (preços, menu, abrir/fechar, entregas, stock da
     manhã, campanhas) NÃO vão para a fila: sem internet dão erro claro.
     Mexer no menu às cegas e aplicar horas depois é pior do que esperar.

   Tem de ser carregado ANTES do script principal de cada página.
   ===================================================================== */
(function(){
"use strict";
if (window.EPO) return;                       // carregado duas vezes? ignora

const API = "https://wispy-cherry-ee2e.joaomleal88.workers.dev";
const realFetch = window.fetch.bind(window);

const T_LER = 5000, T_ESCREVER = 12000, T_SONDA = 5000;   // prazos em ms
const AUTO_ENTREGUE_MIN = 30;   // venda offline enviada mais de 30 min depois → entra já como "entregue"
const MSG_BLOQ = "Sem internet: esta alteração precisa de ligação ao servidor e pode não ter ficado guardada. Tente outra vez quando a internet voltar.";
const MSG_1A  = "Sem internet. A primeira entrada neste aparelho tem de ser feita com internet.";
const EST_TXT = {aguarda:"aguarda", confirmado:"na fila", preparar:"a preparar", pronto:"pronto", entregue:"entregue", cancelado:"cancelado"};
const MET_TXT = {dinheiro:"Dinheiro", vinti4:"Vinti4", transf:"Transferência", depois:"Paga depois"};

/* leituras que ficam guardadas no aparelho */
const LEITURAS = {"/orders":1, "/stock-dia":1, "/soldout":1, "/menu-edit":1, "/estado":1};
/* escritas que podem ir para a fila */
const FILA_OK  = {"/order":1, "/order-pago":1, "/order-status":1, "/order-del":1, "/stock-baixa":1, "/soldout-set":1};

/* ---------------- datas ---------------- */
const p2 = n => ("0"+n).slice(-2);
const hojeISO = d => { d = d || new Date(); return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); };
const horaHM  = d => { d = d || new Date(); return p2(d.getHours())+":"+p2(d.getMinutes()); };
function diaDesvio(iso, k){ const [y,m,d] = iso.split("-").map(Number); return hojeISO(new Date(y, m-1, d+k)); }

/* ---------------- base de dados local (IndexedDB) ---------------- */
let _db = null;
function db(){
  if (_db) return _db;
  _db = new Promise((ok, ko) => {
    let r;
    try { r = indexedDB.open("ep-offline", 1); } catch(e){ ko(e); return; }
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore("cache",  {keyPath:"u"});                        // leituras guardadas
      d.createObjectStore("fila",   {keyPath:"n", autoIncrement:true});    // por enviar, por ordem
      d.createObjectStore("ids",    {keyPath:"off"});                      // off-BAL-… → id real
      d.createObjectStore("falhas", {keyPath:"n", autoIncrement:true});    // recusadas pelo servidor
    };
    r.onsuccess = () => ok(r.result);
    r.onerror   = () => ko(r.error);
    r.onblocked = () => ko(new Error("IndexedDB bloqueada"));
  });
  return _db;
}
function tx(store, modo, fn){
  return db().then(d => new Promise((ok, ko) => {
    const t = d.transaction(store, modo), s = t.objectStore(store);
    let res; const q = fn(s);
    if (q) q.onsuccess = () => { res = q.result; };
    t.oncomplete = () => ok(res);
    t.onerror = t.onabort = () => ko(t.error || new Error("IndexedDB"));
  }));
}
const idb = {
  get:   (st,k) => tx(st, "readonly",  s => s.get(k)),
  put:   (st,v) => tx(st, "readwrite", s => s.put(v)),
  add:   (st,v) => tx(st, "readwrite", s => s.add(v)),
  del:   (st,k) => tx(st, "readwrite", s => s.delete(k)),
  all:   (st)   => tx(st, "readonly",  s => s.getAll()),
  count: (st)   => tx(st, "readonly",  s => s.count())
};
let ativo = true;                 // sem IndexedDB (modo privado, etc.) → comporta-se como antes
db().catch(() => { ativo = false; });

/* ---------------- estado da ligação ---------------- */
const est = { offline: navigator.onLine === false, aSincronizar: false, ultimaOk: 0, ultimaFalha: 0, flash: 0, enviados: 0 };
function ficouOffline(){ est.ultimaFalha = Date.now(); if (!est.offline){ est.offline = true; avisar(); } }
function ficouOnline(){ est.ultimaOk = Date.now(); if (est.offline){ est.offline = false; avisar(); agendarSync(300); } }

function json(o, status){
  return new Response(JSON.stringify(o), {status: status || 200,
    headers: {"Content-Type":"application/json; charset=utf-8", "X-EP-Local":"1"}});
}
function erroRede(){ const e = new TypeError("Failed to fetch"); e._rede = true; return e; }
function eRede(e){ return !!e && (e._rede || e._http || e.name === "AbortError" || e.name === "TypeError"); }
async function lerJson(r){ try { return JSON.parse(await r.text()); } catch(e){ return {}; } }

/* fetch verdadeiro, com prazo. 5xx (Cloudflare/servidor em baixo) conta como falha de rede. */
async function redeFetch(url, init, ms){
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  let r;
  try { r = await realFetch(url, Object.assign({}, init || {}, {signal: ac.signal})); }
  catch(e){ const x = erroRede(); x.causa = e; throw x; }
  finally { clearTimeout(t); }
  if (r.status >= 500){ const x = new Error("HTTP " + r.status); x._http = true; throw x; }
  ficouOnline();
  return r;
}

/* ===================== O NOVO fetch ===================== */
window.fetch = function(input, init){
  let url = null;
  try { url = (typeof input === "string") ? input : (input instanceof URL ? input.href : null); } catch(e){}
  if (!url || url.indexOf(API) !== 0 || !ativo) return realFetch(input, init);
  return tratar(url, init || {}).catch(e => {
    if (e && e._interno && !e._enviado) return realFetch(input, init);   // falha do próprio módulo: comportamento antigo
    throw e;
  });
};

async function tratar(url, init){
  try { await db(); } catch(e){ ativo = false; const x = new Error("sem IndexedDB"); x._interno = true; throw x; }
  const u = new URL(url), cam = u.pathname, metodo = String(init.method || "GET").toUpperCase();
  if (navigator.onLine === false) ficouOffline();

  if (metodo === "GET"){
    if (LEITURAS[cam] && guardavel(cam, u)) return ler(url, u, init);
    return passar(url, init, T_LER);
  }
  /* a Gestão confirma a chave com este pedido inofensivo: trata-se como leitura */
  if (cam === "/soldout-set" && u.searchParams.get("item") === "__teste__") return ler(url, u, init);
  if (FILA_OK[cam] && filavel(cam, u)) return escrever(url, u, init);
  return bloqueado(url, init);
}

function guardavel(cam, u){
  if (cam !== "/orders") return true;
  const dia = u.searchParams.get("dia");
  if (!dia) return true;
  const hoje = hojeISO();
  return dia >= diaDesvio(hoje, -3) && dia <= diaDesvio(hoje, 2);    // histórico antigo não ocupa espaço
}
function filavel(cam, u){
  if (cam !== "/soldout-set") return true;
  const it = u.searchParams.get("item");
  return !!it && it !== "__teste__" && u.searchParams.get("limpar") !== "1";
}

/* pedidos que não ficam guardados: sem internet falham logo, sem esperar */
async function passar(url, init, ms){
  if (est.offline) throw erroRede();
  try { return await redeFetch(url, init, ms); }
  catch(e){ if (eRede(e)) ficouOffline(); throw eRede(e) ? erroRede() : e; }
}

/* alterações de gestão: só com internet */
async function bloqueado(url, init){
  if (est.offline) return json({erro: MSG_BLOQ, _offline: true});
  try { return await redeFetch(url, init, T_ESCREVER); }
  catch(e){ if (!eRede(e)) throw e; ficouOffline(); return json({erro: MSG_BLOQ, _offline: true}); }
}

/* ---------------- LEITURAS ---------------- */
async function ler(url, u, init){
  const cam = u.pathname;
  let corpo = null, fresco = false;
  if (!est.offline){
    try {
      const r = await redeFetch(url, init, T_LER);
      const txt = await r.text();
      let d = null; try { d = JSON.parse(txt); } catch(e){}
      if (!d || typeof d !== "object")
        return new Response(txt, {status: r.status, headers: {"Content-Type": r.headers.get("Content-Type") || "text/plain"}});
      if (d.erro) return json(d, r.status);
      corpo = d; fresco = true;
      guardarCache(url, u, d);
    } catch(e){ if (!eRede(e)) throw e; ficouOffline(); }
  }
  if (!corpo){
    let c = null;
    try { c = (cam === "/orders") ? await copiaPedidos(u) : await idb.get("cache", url); } catch(e){}
    if (c && cam === "/orders" && !(await chaveConhecida(u))) c = null;
    corpo = c ? daCache(cam, u, c) : await semCache(cam, u);
    if (corpo && corpo.erro) return json(corpo);
  }
  corpo = Object.assign({}, corpo);
  await juntarPendentes(cam, u, corpo);
  if (!fresco) corpo._offline = true;
  return json(corpo);
}
async function guardarCache(url, u, d){
  try {
    await idb.put("cache", {u: url, t: Date.now(), dia: hojeISO(), corpo: d});
    const k = u.searchParams.get("key");
    if (k && (u.pathname === "/orders" || u.pathname === "/soldout-set"))
      await idb.put("cache", {u: "chave:" + k, t: Date.now(), dia: hojeISO()});
  } catch(e){}
}
/* Pedidos do dia sem internet: usa a cópia MAIS RECENTE que qualquer painel deste aparelho guardou
   (Vendas, Cozinha ou Gestão) — a cozinha pode ter estado fechada enquanto as vendas tinham rede. */
async function copiaPedidos(u){
  const hoje = hojeISO(), dia = u.searchParams.get("dia") || hoje;
  let melhor = null;
  for (const c of await idb.all("cache")){
    if (c.u.indexOf(API + "/orders") !== 0 || c.dia !== hoje || !c.corpo) continue;
    const d = new URL(c.u).searchParams.get("dia") || hoje;
    if (d === dia && (!melhor || c.t > melhor.t)) melhor = c;
  }
  return melhor ? Object.assign({}, melhor, {dia: hoje}) : null;
}
/* cópias de outro dia não servem para o que é diário */
function daCache(cam, u, c){
  const deHoje = c.dia === hojeISO();
  if (cam === "/orders" && !u.searchParams.get("dia")) return deHoje ? c.corpo : {pedidos: []};
  if (cam === "/stock-dia") return deHoje ? c.corpo : {itens: {}};
  if (cam === "/soldout")   return deHoje ? c.corpo : {itens: []};
  if (cam === "/soldout-set") return {itens: deHoje ? ((c.corpo && c.corpo.itens) || []) : []};
  return c.corpo;
}
async function chaveConhecida(u){
  const k = u.searchParams.get("key");
  if (!k) return false;
  try { return !!(await idb.get("cache", "chave:" + k)); } catch(e){ return false; }
}
async function semCache(cam, u){
  if (cam === "/orders")      return (await chaveConhecida(u)) ? {pedidos: []} : {erro: MSG_1A};
  if (cam === "/soldout-set") return (await chaveConhecida(u)) ? {itens: []}   : {erro: MSG_1A};
  if (cam === "/stock-dia")   return {itens: {}};
  if (cam === "/soldout")     return {itens: []};
  return {erro: "Sem internet."};
}
async function juntarPendentes(cam, u, corpo){
  if (cam === "/orders")    corpo.pedidos = await vistaPedidos(corpo.pedidos || [], u.searchParams.get("dia") || hojeISO());
  if (cam === "/stock-dia") corpo.itens   = await vistaStock(corpo.itens || {});
  if (cam === "/soldout" || cam === "/soldout-set") corpo.itens = await vistaEsgotados(corpo.itens || []);
}

/* ---------------- vistas: servidor + fila ---------------- */
async function filaAll(){ try { return await idb.all("fila"); } catch(e){ return []; } }
const anulada = (op, fila) => op.k === "order" && fila.some(o => o.k === "del" && o.alvo === op.id);

async function vistaPedidos(base, dia){
  const fila = await filaAll();
  let lista = base.map(p => Object.assign({}, p));
  const codigos = new Set(lista.map(assinatura));
  const achar = id => lista.find(p => p.id === id || ("off-" + p.code) === id);
  for (const op of fila){
    if (op.k === "order"){
      if (op.dia !== dia || codigos.has(assinatura(op.corpo))) continue;
      lista.push(Object.assign({}, op.corpo, {id: op.id, status: "confirmado", criado: op.hora, _offline: true}));
      codigos.add(assinatura(op.corpo));
    } else if (op.k === "status"){ const p = achar(op.alvo); if (p) p.status = op.st; }
    else if (op.k === "pago"){ const p = achar(op.alvo); if (p){ p.balcaoPago = op.on; p.balcaoMetodo = op.on ? op.met : ""; } }
    else if (op.k === "del"){ const p = achar(op.alvo); if (p) lista = lista.filter(x => x !== p); }
  }
  return lista;
}
async function vistaStock(base){
  const fila = await filaAll(), st = Object.assign({}, base);
  for (const op of fila){
    if (op.k === "order" && !anulada(op, fila))
      Object.entries(op.corpo.stock || {}).forEach(([n, q]) => { if (n in st) st[n] = Math.max(0, st[n] - (+q || 0)); });
    else if (op.k === "baixa" && op.item in st) st[op.item] = Math.max(0, st[op.item] - op.n);
  }
  return st;
}
async function vistaEsgotados(base){
  const fila = await filaAll(), s = new Set(base);
  fila.forEach(op => { if (op.k === "esg"){ if (op.on) s.add(op.item); else s.delete(op.item); } });
  return [...s];
}
async function baseCache(caminho, vazio){
  try { const c = await idb.get("cache", API + caminho); if (c && c.dia === hojeISO()) return c.corpo.itens || vazio; } catch(e){}
  return vazio;
}

/* ---------------- ESCRITAS ---------------- */
async function mapaIds(){
  const m = {}; try { (await idb.all("ids")).forEach(x => { m[x.off] = {real: x.real, dia: x.dia}; }); } catch(e){}
  return m;
}
async function escrever(url, u, init){
  const cam = u.pathname;
  let alvo = u.searchParams.get("id");
  if (alvo && alvo.indexOf("off-") === 0){                    // pedido feito offline que entretanto já chegou?
    const m = (await mapaIds())[alvo];
    if (m){
      u.searchParams.set("id", m.real); alvo = m.real;
      if (m.dia && !u.searchParams.get("dia")) u.searchParams.set("dia", m.dia);   // o servidor procura o pedido no dia em que ficou guardado
      url = u.toString();
    }
  }
  const pendentes = await idb.count("fila");
  const depende = alvo && alvo.indexOf("off-") === 0;          // ainda à espera do seu pedido na fila
  if (!est.offline && !pendentes && !depende){
    try { return await redeFetch(url, init, T_ESCREVER); }
    catch(e){ if (!eRede(e)) throw e; ficouOffline(); }
  }
  const op = criarOp(cam, u, url, init);
  op.desc = await descrever(op);
  await idb.add("fila", op);
  avisar(); agendarSync(est.offline ? 2000 : 200);
  return json(await respostaLocal(op));
}
function criarOp(cam, u, url, init){
  const q = u.searchParams;
  const op = {t: Date.now(), dia: hojeISO(), hora: horaHM(), url, tent: 0};
  if (cam === "/order"){
    op.k = "order";
    try { op.corpo = JSON.parse(init.body); } catch(e){ op.corpo = {}; }
    if (!op.corpo.code) op.corpo.code = "BAL-" + Date.now();
    op.id = "off-" + op.corpo.code;
  }
  else if (cam === "/order-pago")  { op.k = "pago";   op.alvo = q.get("id"); op.on = q.get("on") === "1"; op.met = q.get("met") || ""; }
  else if (cam === "/order-status"){ op.k = "status"; op.alvo = q.get("id"); op.st = q.get("st"); }
  else if (cam === "/order-del")   { op.k = "del";    op.alvo = q.get("id"); }
  else if (cam === "/stock-baixa") { op.k = "baixa";  op.item = q.get("item"); op.n = +(q.get("n") || 1) || 1; }
  else if (cam === "/soldout-set") { op.k = "esg";    op.item = q.get("item"); op.on = q.get("on") === "1"; }
  return op;
}
async function respostaLocal(op){
  const r = {ok: true, offline: true, _offline: true};
  if (op.k === "order") r.id = op.id;
  if (op.k === "baixa") r.itens = await vistaStock(await baseCache("/stock-dia", {}));
  if (op.k === "esg")   r.itens = await vistaEsgotados(await baseCache("/soldout", []));
  return r;
}

/* texto para a lista "por enviar" */
async function nomesPedidos(){
  const m = {};
  try {
    (await idb.all("cache")).forEach(c => {
      if (c.u.indexOf(API + "/orders") === 0 && c.corpo && Array.isArray(c.corpo.pedidos))
        c.corpo.pedidos.forEach(p => { if (p.id) m[p.id] = (p.code || "") + (p.nome ? " · " + p.nome : ""); });
    });
  } catch(e){}
  return m;
}
async function descrever(op){
  if (op.k === "order"){ const c = op.corpo; return "Venda " + c.code + (c.nome ? " · " + c.nome : "") + " · " + (c.total || 0) + " ECV"; }
  let ped = "";
  if (op.alvo){ ped = op.alvo.indexOf("off-") === 0 ? op.alvo.slice(4) : ((await nomesPedidos())[op.alvo] || ("pedido …" + String(op.alvo).slice(-5))); }
  if (op.k === "pago")   return (op.on ? "Pago (" + (MET_TXT[op.met] || op.met || "?") + ")" : "Volta a «por cobrar»") + " · " + ped;
  if (op.k === "status") return "Cozinha: " + (EST_TXT[op.st] || op.st) + " · " + ped + (op.auto ? " (automático)" : "");
  if (op.k === "del")    return "Apagar " + ped;
  if (op.k === "baixa")  return "Stock " + (op.n > 0 ? "−" + op.n : "+" + (-op.n)) + " · " + op.item;
  if (op.k === "esg")    return (op.on ? "Acabou: " : "Voltou a haver: ") + op.item;
  return op.url;
}

/* ===================== SINCRONIZAÇÃO ===================== */
let _tSync = null;
function agendarSync(ms){ clearTimeout(_tSync); _tSync = setTimeout(sincronizar, ms || 0); }

async function sincronizar(){
  if (est.aSincronizar || !ativo) return;
  const correr = async () => {
    est.aSincronizar = true; est.enviados = 0; avisar();
    const codigos = {};
    try {
      for (let volta = 0; volta < 1000; volta++){
        const fila = await filaAll();
        if (!fila.length){ if (est.enviados) est.flash = Date.now(); break; }
        const res = await enviarOp(fila[0], fila, codigos);
        if (res === "rede") break;
        if (res === "ok") est.enviados++;
        avisar();
      }
    } catch(e){ /* tenta outra vez na próxima volta */ }
    finally { est.aSincronizar = false; avisar(); }
  };
  try {
    if (navigator.locks && navigator.locks.request)       // só um painel de cada vez envia a fila
      await navigator.locks.request("ep-sync", {ifAvailable: true}, lk => lk ? correr() : null);
    else await correr();
  } catch(e){ est.aSincronizar = false; }
}

async function falhou(op, msg){
  try { await idb.add("falhas", {op, msg: String(msg || "recusado"), t: Date.now()}); } catch(e){}
  await idb.del("fila", op.n);
  return "falhou";
}
/* Uma venda "já está no servidor" só se coincidir o código E o nome E o total.
   Só o código não chega: o código BAL-ddmm-XXX tem 3 letras ao acaso (32 768 hipóteses) e o
   telemóvel e o tablet podem gerar o mesmo no mesmo dia — a venda do tablet seria dada como enviada e perdia-se. */
const assinatura = p => (p.code || "") + "|" + String(p.nome || "").slice(0, 60).trim() + "|" + (Math.round(+p.total || 0));   // o servidor corta o nome aos 60
async function procurarCodigo(corpo, dias, key, cache, renovar){
  const alvo = assinatura(corpo);
  for (const dia of [...new Set(dias)]){
    const k = dia + "|" + key;
    if (!cache[k] || renovar){
      const r = await redeFetch(API + "/orders?key=" + encodeURIComponent(key) + "&dia=" + dia, {cache: "no-store"}, T_LER);
      const d = await lerJson(r);
      cache[k] = new Map((Array.isArray(d.pedidos) ? d.pedidos : []).map(p => [assinatura(p), p.id]));
    }
    if (cache[k].has(alvo)) return cache[k].get(alvo);
  }
  return null;
}

async function enviarOp(op, fila, codigos){
  try {
    if (op.k === "order"){
      /* apagado/substituído antes de chegar ao servidor: não se envia nada */
      if (anulada(op, fila)){
        for (const o of fila) if (o === op || o.alvo === op.id) await idb.del("fila", o.n);
        return "ok";
      }
      const key = new URL(op.url).searchParams.get("key") || "";
      /* já chegou numa tentativa anterior (a ligação caiu antes da resposta)? */
      let idReal = await procurarCodigo(op.corpo, [op.dia, hojeISO()], key, codigos);
      if (!idReal){
        const corpo = Object.assign({}, op.corpo, {feitoOffline: true, feitoAs: op.hora, feitoDia: op.dia});
        /* o servidor guarda o pedido no dia que vier em "dia" (senão, no dia em que o recebe):
           assim uma venda de ontem enviada hoje conta no fecho de ONTEM */
        if (!corpo.dia) corpo.dia = op.dia;
        /* o servidor desconta o stock sempre no stock de HOJE: uma venda de outro dia não lhe pode mexer */
        if (op.dia !== hojeISO()) corpo.stock = {};
        if (Date.now() - op.t > 5 * 60000)
          corpo.notas = (corpo.notas || "") + " · 📴 feito às " + op.hora +
            (op.dia !== hojeISO() ? " de " + op.dia.split("-").reverse().join("/") : "") + " sem internet";
        const r = await redeFetch(op.url, {method: "POST", headers: {"Content-Type": "text/plain;charset=UTF-8"},
                                           body: JSON.stringify(corpo)}, T_ESCREVER);
        const d = await lerJson(r);
        if (!r.ok || d.erro) return falhou(op, d.erro || ("HTTP " + r.status));
        idReal = d.id || await procurarCodigo(op.corpo, [hojeISO(), op.dia], key, codigos, true);
      }
      if (idReal) await idb.put("ids", {off: op.id, real: idReal, dia: op.corpo.dia || op.dia, t: Date.now()});
      await idb.del("fila", op.n);
      /* venda antiga em que ninguém mexeu na cozinha deste aparelho: o cliente já foi servido,
         por isso entra como "entregue" e não enche a fila da cozinha dos outros aparelhos */
      if (idReal && Date.now() - op.t > AUTO_ENTREGUE_MIN * 60000 &&
          !fila.some(o => (o.k === "status" || o.k === "del") && o.alvo === op.id)){
        const u = new URL(API + "/order-status");
        u.searchParams.set("key", key); u.searchParams.set("id", idReal); u.searchParams.set("st", "entregue");
        u.searchParams.set("dia", op.corpo.dia || op.dia);
        const s = {k: "status", alvo: idReal, st: "entregue", auto: true, url: u.toString(),
                   t: Date.now(), dia: hojeISO(), hora: horaHM(), tent: 0};
        s.desc = "Cozinha: entregue · " + op.corpo.code + " (automático)";
        await idb.add("fila", s);
      }
      return "ok";
    }

    /* operações sobre um pedido / stock / esgotados */
    /* stock e esgotados são do dia: correcções de um dia que já passou não se aplicam ao de hoje */
    if ((op.k === "baixa" || op.k === "esg") && op.dia !== hojeISO()){ await idb.del("fila", op.n); return "ok"; }
    const u = new URL(op.url);
    if (op.alvo && op.alvo.indexOf("off-") === 0){
      const m = (await mapaIds())[op.alvo];
      if (!m){
        if (fila.some(o => o.k === "order" && o.id === op.alvo)) return "rede";   // não devia acontecer: o pedido vem antes
        return falhou(op, "o pedido a que se refere não chegou ao servidor");
      }
      u.searchParams.set("id", m.real);
      if (m.dia && !u.searchParams.get("dia")) u.searchParams.set("dia", m.dia);
    }
    /* o servidor procura o pedido no dia indicado (senão, hoje): a operação feita ontem procura em ontem */
    if ((op.k === "pago" || op.k === "status" || op.k === "del") && !u.searchParams.get("dia")) u.searchParams.set("dia", op.dia);
    const url = u.toString();
    const r = await redeFetch(url, {method: "POST"}, T_ESCREVER);
    const d = await lerJson(r);
    if (!r.ok || d.erro) return falhou(op, d.erro || ("HTTP " + r.status));
    await idb.del("fila", op.n);
    return "ok";
  } catch(e){
    if (eRede(e)){
      ficouOffline();
      if (e._http){                                         // servidor responde mas com erro 5xx
        op.tent = (op.tent || 0) + 1;
        if (op.tent >= 5) return falhou(op, "o servidor deu erro 5 vezes (" + e.message + ")");
        try { await idb.put("fila", op); } catch(_){}
      }
      return "rede";
    }
    return falhou(op, (e && e.message) || String(e));
  }
}

/* ---------------- verificar a ligação ---------------- */
async function sondar(){
  try { await redeFetch(API + "/estado", {cache: "no-store"}, T_SONDA); return true; }
  catch(e){ ficouOffline(); return false; }
}
async function contarFila(){ try { return await idb.count("fila"); } catch(e){ return 0; } }
setInterval(async () => {
  if (!ativo) return;
  const n = await contarFila();
  if (est.offline){ if (await sondar() && n) agendarSync(0); }
  else if (n && !est.aSincronizar) agendarSync(0);
}, 10000);
window.addEventListener("online",  () => { sondar().then(ok => { if (ok) agendarSync(0); }); });
window.addEventListener("offline", () => ficouOffline());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") sondar().then(ok => { if (ok) agendarSync(0); });
});
setTimeout(() => agendarSync(0), 2500);

/* limpeza: cópias com mais de 10 dias e ligações de ids com mais de 3 dias */
setTimeout(async () => {
  try {
    const lim = Date.now() - 10 * 86400000;
    for (const c of await idb.all("cache"))
      if (c.t < lim && c.u.indexOf("chave:") !== 0 && c.u.indexOf("/menu-edit") < 0) await idb.del("cache", c.u);
    const limIds = Date.now() - 3 * 86400000;
    for (const x of await idb.all("ids")) if (x.t < limIds) await idb.del("ids", x.off);
  } catch(e){}
}, 8000);

/* o browser não apaga estes dados para libertar espaço (instalada como app, o Chrome costuma aceitar) */
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}

/* ===================== INDICADOR NO ECRÃ ===================== */
let _tAvisar = null;
function avisar(){ clearTimeout(_tAvisar); _tAvisar = setTimeout(desenhar, 60); }

const CSS = `
.epo-pill{position:fixed;left:50%;top:calc(6px + env(safe-area-inset-top));transform:translateX(-50%);z-index:95;
 display:none;align-items:center;gap:8px;max-width:calc(100vw - 24px);padding:9px 15px;border:0;border-radius:999px;
 font:700 14px/1.15 system-ui,-apple-system,sans-serif;letter-spacing:.2px;color:#fff;background:#2E2018;
 box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.epo-pill.on{display:flex;}
.epo-pill.off{background:#8C2F2F;}
.epo-pill.fila{background:#8A5A12;}
.epo-pill.ok{background:#2E6B32;}
.epo-pill.falha{background:#B5791F;color:#1F140E;}
.epo-pill i{flex:none;width:9px;height:9px;border-radius:50%;background:currentColor;opacity:.9;}
.epo-pill.off i{animation:epoP 1.1s infinite;}
.epo-pill.sinc i{animation:epoP .6s infinite;}
@keyframes epoP{50%{opacity:.2}}
.epo-bg{position:fixed;inset:0;z-index:96;display:none;align-items:flex-end;justify-content:center;background:rgba(20,14,10,.5);}
.epo-bg.on{display:flex;}
.epo-sh{width:100%;max-width:560px;max-height:88vh;overflow:auto;background:#FFFCF6;color:#1F140E;border-radius:20px 20px 0 0;
 padding:18px 16px calc(16px + env(safe-area-inset-bottom));font:400 15px/1.4 system-ui,-apple-system,sans-serif;}
.epo-sh h3{margin:0 0 4px;font-size:19px;}
.epo-st{font-weight:700;margin-bottom:10px;}
.epo-st.off{color:#8C2F2F;} .epo-st.ok{color:#2E6B32;}
.epo-nota{padding:10px 12px;border-radius:12px;background:#FFF4DE;border:1.5px solid #C88A1E;font-size:13.5px;margin-bottom:12px;}
.epo-sec{margin:14px 0 6px;font-size:12px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:#5A4332;}
.epo-l{list-style:none;margin:0;padding:0;}
.epo-l li{padding:9px 0;border-top:1px solid #E7DCC8;font-size:14.5px;}
.epo-l li small{display:block;color:#5A4332;font-size:12.5px;}
.epo-l li .bts{display:flex;gap:8px;margin-top:7px;}
.epo-l li .bts button{flex:1;padding:9px;border-radius:10px;border:2px solid #6F5846;background:#fff;font:700 13.5px/1 system-ui,sans-serif;cursor:pointer;}
.epo-ok{width:100%;margin-top:14px;padding:15px;border:0;border-radius:13px;background:#2E6B32;color:#fff;font:700 16px/1 system-ui,sans-serif;cursor:pointer;}
.epo-ok:disabled{opacity:.45;}
.epo-fx{display:block;width:100%;margin-top:6px;padding:12px;border:0;background:none;color:#5A4332;font:400 15px/1 system-ui,sans-serif;cursor:pointer;}
`;
let pill = null, bg = null, sh = null, _aberto = false;
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function montar(){
  if (pill || !document.body) return;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  pill = document.createElement("button"); pill.type = "button"; pill.className = "epo-pill";
  pill.setAttribute("aria-live", "polite"); pill.onclick = abrir;
  bg = document.createElement("div"); bg.className = "epo-bg";
  bg.onclick = e => { if (e.target === bg) fechar(); };
  sh = document.createElement("div"); sh.className = "epo-sh"; sh.setAttribute("role", "dialog");
  bg.appendChild(sh);
  document.body.appendChild(pill); document.body.appendChild(bg);
  desenhar();
}
async function desenhar(){
  if (!pill) return;
  let n = 0, nf = 0;
  try { n = await idb.count("fila"); nf = await idb.count("falhas"); } catch(e){}
  let cls = "", txt = "";
  if (nf)                   { cls = "falha"; txt = "⚠ " + nf + (nf === 1 ? " operação recusada" : " operações recusadas") + " pelo servidor — tocar"; }
  else if (est.offline)     { cls = "off";   txt = "Sem internet" + (n ? " · " + n + " por enviar" : " · a trabalhar neste aparelho"); }
  else if (est.aSincronizar){ cls = "fila sinc"; txt = "A enviar para o servidor… " + n; }
  else if (n)               { cls = "fila";  txt = n + " por enviar"; }
  else if (Date.now() - est.flash < 4500){ cls = "ok"; txt = "✓ Tudo enviado para o servidor"; setTimeout(avisar, 4600); }
  pill.className = "epo-pill" + (cls ? " on " + cls : "");
  pill.innerHTML = cls ? "<i></i><span>" + esc(txt) + "</span>" : "";
  if (_aberto) desenharFolha(n);
}
function abrir(){ _aberto = true; bg.classList.add("on"); desenharFolha(); }
function fechar(){ _aberto = false; bg.classList.remove("on"); }
async function desenharFolha(){
  let fila = [], falhas = [];
  try { fila = await idb.all("fila"); falhas = await idb.all("falhas"); } catch(e){}
  const quando = t => { const d = new Date(t); return (hojeISO(d) === hojeISO() ? "" : d.toLocaleDateString("pt-PT") + " ") + horaHM(d); };
  sh.innerHTML =
    `<h3>Ligação ao servidor</h3>
     <div class="epo-st ${est.offline ? "off" : "ok"}">${est.offline ? "📴 Sem internet" : (est.aSincronizar ? "↻ A enviar…" : "✓ Ligado")}${est.ultimaOk ? " · última resposta do servidor às " + horaHM(new Date(est.ultimaOk)) : ""}</div>
     ${est.offline ? `<div class="epo-nota"><b>Pode continuar a vender.</b> Tudo fica guardado neste aparelho e segue sozinho para o servidor quando a internet voltar (com a app aberta).<br>
       Enquanto estiver offline: os <b>pedidos do site não chegam aqui</b> e o <b>stock pode não contar as vendas do site</b>. Não apague os dados do Chrome nem desinstale a app.</div>` : ""}
     <div class="epo-sec">Por enviar (${fila.length})</div>
     ${fila.length ? `<ul class="epo-l">${fila.map(o => `<li>${esc(o.desc || o.url)}<small>feito às ${esc(quando(o.t))}</small></li>`).join("")}</ul>`
                   : `<div style="font-size:14px;color:#5A4332">Nada por enviar.</div>`}
     ${falhas.length ? `<div class="epo-sec">Recusadas pelo servidor (${falhas.length})</div>
       <ul class="epo-l">${falhas.map(f => `<li>${esc(f.op.desc || f.op.url)}<small>${esc(f.msg)} · ${esc(quando(f.t))}</small>
         <div class="bts"><button type="button" data-r="${f.n}">Tentar outra vez</button><button type="button" data-d="${f.n}">Descartar</button></div></li>`).join("")}</ul>` : ""}
     <button type="button" class="epo-ok" ${fila.length && !est.aSincronizar ? "" : "disabled"} id="epoJa">Enviar agora</button>
     <button type="button" class="epo-fx" id="epoFx">Fechar</button>`;
  sh.querySelector("#epoFx").onclick = fechar;
  sh.querySelector("#epoJa").onclick = async () => { await sondar(); agendarSync(0); avisar(); };
  sh.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => {
    const f = falhas.find(x => String(x.n) === b.dataset.r); if (!f) return;
    const op = Object.assign({}, f.op); delete op.n; op.tent = 0;
    await idb.add("fila", op); await idb.del("falhas", f.n); agendarSync(0); avisar();
  });
  sh.querySelectorAll("[data-d]").forEach(b => b.onclick = async () => {
    const f = falhas.find(x => String(x.n) === b.dataset.d); if (!f) return;
    if (!confirm("Descartar de vez?\n\n" + (f.op.desc || "") + "\n\nNão vai para o servidor.")) return;
    await idb.del("falhas", f.n); avisar();
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
setInterval(() => { if (pill) desenhar(); }, 3000);

/* para as páginas e para testes */
window.EPO = {
  estado: () => Object.assign({}, est),
  offline: () => est.offline,
  sincronizar: () => sincronizar(),
  porEnviar: () => contarFila(),
  _realFetch: realFetch
};
})();
