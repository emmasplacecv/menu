/* ============================================================
   EMMA'S PLACE — MENU EM PDF GERADO NO MOMENTO (25-10-2026)
   O PDF é feito no telemóvel/computador do cliente quando toca em "Descarregar menu (PDF)",
   a partir do MESMO menu que o site está a mostrar nesse instante:
     · preços, produtos novos, retirados, ordem e categorias do /admin (Gestão > Menu)
     · combos à venda (os escondidos por falta de um produto não aparecem), com o preço automático
     · milkshakes (16 oz / baunilha), leite à escolha, extras dos sumos, açaí (preços e toppings)
     · bebidas "em breve"
     · no idioma escolhido no site (PT/EN/FR/DE/NL)
   Antes o PDF era um ficheiro fixo que deixava de corresponder ao site a cada mudança no /admin.
   O ficheiro fixo (menu-emmas-place.pdf, na raiz) fica só como reserva, se isto falhar.
   Chamado por menuPDF() no index.html. Biblioteca: jsPDF 4.2.1 (licença MIT, pdf/jspdf.umd.min.js).
   Letras: Playfair Display e Jost (licença SIL OFL), em pdf/fonts/ — as mesmas do site.
   Nada aqui guarda preços: se o menu mudar no site, o PDF muda sozinho.
   ============================================================ */
(function(){
"use strict";

const PDF_TX={
 pt:{precos:"Preços em ECV",data:"Menu de {d}",pag:"Página {n} de {t}",leite:"Leite",incl:"incluído",
     extras:"Extras",topx:"Toppings extra",comoT:"Como encomendar",site:"emmasplace.cv"},
 en:{precos:"Prices in ECV",data:"Menu of {d}",pag:"Page {n} of {t}",leite:"Milk",incl:"included",
     extras:"Extras",topx:"Extra toppings",comoT:"How to order",site:"emmasplace.cv"},
 fr:{precos:"Prix en ECV",data:"Menu du {d}",pag:"Page {n} sur {t}",leite:"Lait",incl:"inclus",
     extras:"Suppléments",topx:"Toppings en plus",comoT:"Comment commander",site:"emmasplace.cv"},
 de:{precos:"Preise in ECV",data:"Menü vom {d}",pag:"Seite {n} von {t}",leite:"Milch",incl:"inklusive",
     extras:"Extras",topx:"Extra-Toppings",comoT:"So bestellen Sie",site:"emmasplace.cv"},
 nl:{precos:"Prijzen in ECV",data:"Menu van {d}",pag:"Pagina {n} van {t}",leite:"Melk",incl:"inbegrepen",
     extras:"Extra's",topx:"Extra toppings",comoT:"Zo bestel je",site:"emmasplace.cv"}};
const px=k=>{ const L=(typeof LANG!=="undefined"&&PDF_TX[LANG])?PDF_TX[LANG]:PDF_TX.pt; return L[k]!=null?L[k]:PDF_TX.pt[k]; };

/* cores do site (as mesmas variáveis do CSS) */
const COR={ink:[52,37,29],ink2:[120,91,66],gold:[184,120,61],roxo:[74,37,69],roxo3:[55,26,51],
           lilas:[230,210,225],cream:[247,241,228],card:[255,252,246],line:[231,220,200],dot:[203,182,147]};

/* texto do site -> texto do PDF: sem HTML, sem emojis nem símbolos que as letras não têm (♡ …) */
function limpa(s){
 return String(s==null?"":s)
  .replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g,"")
  .replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  .replace(/[←-⇿☀-➿️‍]|[\uD800-\uDBFF][\uDC00-\uDFFF]/g,"")
  .replace(/\s+/g," ").trim();
}
const T=(k)=>limpa(t(k));
const D=(s)=>limpa(td(s));

/* letras: ficheiros .ttf -> jsPDF */
const LETRAS=[["Playfair","playfair-700.ttf"],["Jost","jost-400.ttf"],["JostM","jost-500.ttf"],["JostS","jost-600.ttf"]];
let _letras=null;
function b64(buf){
 const u=new Uint8Array(buf); let s="";
 for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));
 return btoa(s);
}
function carregarLetras(){
 if(!_letras) _letras=Promise.all(LETRAS.map(([n,f])=>fetch("pdf/fonts/"+f).then(r=>{ if(!r.ok) throw new Error(f); return r.arrayBuffer(); }).then(b=>[n,f,b64(b)])))
  .catch(e=>{ _letras=null; throw e; });
 return _letras;
}

/* data de hoje em Cabo Verde, dd/mm/aaaa */
function hojeCV(){
 try{
  const p={}; new Intl.DateTimeFormat("en-GB",{timeZone:"Atlantic/Cape_Verde",day:"2-digit",month:"2-digit",year:"numeric"})
   .formatToParts(new Date()).forEach(x=>{ p[x.type]=x.value; });
  if(p.day&&p.month&&p.year) return {d:p.day,m:p.month,a:p.year};
 }catch(e){}
 const d=new Date(Date.now()-3600e3), z=n=>("0"+n).slice(-2);
 return {d:z(d.getUTCDate()),m:z(d.getUTCMonth()+1),a:String(d.getUTCFullYear())};
}

window.gerarMenuPDF=async function(opc){
 opc=opc||{};
 const letras=await carregarLetras();
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF({unit:"pt",format:"a4",compress:true});
 letras.forEach(([n,f,b])=>{ doc.addFileToVFS(f,b); doc.addFont(f,n,"normal"); });
 const dia=hojeCV(), dataTxt=dia.d+"/"+dia.m+"/"+dia.a;
 doc.setProperties({title:"Emma's Place — "+T("menu")+" "+dataTxt,author:"Emma's Place",subject:"emmasplace.cv",creator:"emmasplace.cv"});
 doc.setLanguage && doc.setLanguage((typeof LANG!=="undefined"?LANG:"pt"));

 const W=doc.internal.pageSize.getWidth(), H=doc.internal.pageSize.getHeight();
 const MX=34, GUT=26, COLW=(W-2*MX-GUT)/2, FUNDO=H-54, CAB1=126, CABN=58;
 const colX=c=>MX+c*(COLW+GUT);
 const fonte=(f,tam,cor)=>{ doc.setFont(f,"normal"); doc.setFontSize(tam); doc.setTextColor.apply(doc,cor||COR.ink); };
 const larg=(s)=>doc.getTextWidth(s);
 const partir=(s,w)=>doc.splitTextToSize(s,w);

 /* ---------- topo ---------- */
 function topoPag1(){
  doc.setFillColor.apply(doc,COR.roxo); doc.rect(0,0,W,104,"F");
  doc.setFillColor.apply(doc,COR.gold); doc.rect(0,104,W,2.2,"F");
  fonte("Playfair",27,COR.cream); doc.text("EMMA'S PLACE",W/2,42,{align:"center"});
  fonte("Jost",9,COR.lilas); doc.text(T("tag"),W/2,59,{align:"center"});
  fonte("JostS",8.5,[222,170,110]); doc.text(T("menu").split("").join(" "),W/2,77,{align:"center"});
  fonte("Jost",8,COR.lilas); doc.text(T("morada")+"  ·  "+T("horario"),W/2,93,{align:"center"});
 }
 function topoPagN(){
  fonte("Playfair",11,COR.roxo); doc.text("EMMA'S PLACE",MX,32);
  fonte("JostS",7.5,COR.gold); doc.text(T("menu").split("").join(" "),W-MX,32,{align:"right"});
  doc.setDrawColor.apply(doc,COR.line); doc.setLineWidth(0.7); doc.line(MX,40,W-MX,40);
 }
 function rodape(n,tot){
  doc.setDrawColor.apply(doc,COR.line); doc.setLineWidth(0.7); doc.line(MX,H-38,W-MX,H-38);
  fonte("Jost",7.5,COR.ink2);
  doc.text(px("precos")+"  ·  "+px("data").replace("{d}",dataTxt),MX,H-25);
  doc.text(px("site")+"  ·  "+px("pag").replace("{n}",n).replace("{t}",tot),W-MX,H-25,{align:"right"});
 }

 /* ---------- linhas (cada uma sabe a sua altura e desenhar-se) ---------- */
 const PRECO_W_G=88, PRECO_W_1=46;
 function linhaTitulo(txt,temG,notas){
  fonte("Jost",7.6); const nl=[]; (notas||[]).filter(Boolean).forEach(s=>partir(s,COLW).forEach(l=>nl.push(l)));
  const h=22+(nl.length?4+nl.length*9.8:0)+7;
  return {h,tit:true,draw(x,y){
   fonte("Playfair",13.5,COR.roxo); doc.text(txt,x,y+13);
   if(temG){ fonte("JostS",7,COR.ink2);
    doc.text(tm("M"),x+COLW-44,y+13,{align:"right"}); doc.text(tm("G"),x+COLW,y+13,{align:"right"}); }
   doc.setDrawColor.apply(doc,COR.gold); doc.setLineWidth(0.8); doc.line(x,y+19,x+COLW,y+19);
   fonte("Jost",7.6,COR.ink2); nl.forEach((l,k)=>doc.text(l,x,y+30+k*9.8));
  }};
 }
 function pontos(x1,x2,y){
  if(x2-x1<10) return;
  doc.setFillColor.apply(doc,COR.dot);
  for(let x=x1;x<=x2;x+=2.8) doc.circle(x,y,0.42,"F");
 }
 /* item: nome, preço(s) à direita com pontinhos, descrição e linhas extra por baixo */
 function linhaItem(nome,precos,desc,extra,opt){
  opt=opt||{};
  const pw=opt.temG?PRECO_W_G:PRECO_W_1, fN=opt.fonteNome||"JostM", tN=opt.tamNome||9.6;
  fonte(fN,tN); const nl=partir(nome,COLW-pw-6);
  fonte("Jost",7.6); const dl=desc?partir(desc,COLW-(precos?18:0)):[];
  const el=[]; (extra||[]).filter(Boolean).forEach(s=>partir(s,COLW-18).forEach(l=>el.push(l)));
  const h=nl.length*12+dl.length*9.6+el.length*9.6+(dl.length||el.length?2:0)+7;
  return {h,draw(x,y){
   fonte(fN,tN,opt.corNome||COR.ink);
   nl.forEach((l,k)=>doc.text(l,x,y+10+k*12));
   const yb=y+10+(nl.length-1)*12, fimNome=x+larg(nl[nl.length-1]);
   if(precos){
    fonte("JostS",9.6,COR.ink);
    let ini;
    if(precos.length===2){
     doc.text(String(precos[0]),x+COLW-44,yb,{align:"right"}); doc.text(String(precos[1]),x+COLW,yb,{align:"right"});
     ini=x+COLW-44-larg(String(precos[0]));
    }else{
     const dir=opt.temG?x+COLW-22:x+COLW;          // tamanho único numa categoria com M/G: entre as duas colunas
     doc.text(String(precos[0]),dir,yb,{align:"right"}); ini=dir-larg(String(precos[0]));
    }
    pontos(fimNome+5,ini-5,yb-2.6);
   }
   let yy=yb+(dl.length||el.length?2:0);
   fonte("Jost",7.6,COR.ink2); dl.forEach(l=>{ yy+=9.6; doc.text(l,x,yy); });
   fonte("Jost",7.6,COR.gold); el.forEach(l=>{ yy+=9.6; doc.text(l,x,yy); });
  }};
 }
 function caixaComo(){
  const linhas=[]; fonte("Jost",8.2);
  [T("fluxo"),T("encomendas")+" · "+px("site")].filter(Boolean).forEach(s=>partir(s,COLW-24).forEach(l=>linhas.push(l)));
  const h=12+14+linhas.length*11+12;
  return {h,draw(x,y){
   doc.setFillColor.apply(doc,COR.cream); doc.setDrawColor.apply(doc,COR.line); doc.setLineWidth(0.7);
   doc.roundedRect(x,y,COLW,h-6,8,8,"FD");
   fonte("Playfair",11.5,COR.roxo); doc.text(px("comoT"),x+12,y+19);
   fonte("Jost",8.2,COR.ink); linhas.forEach((l,k)=>doc.text(l,x+12,y+33+k*11));
  }};
 }

 /* ---------- conteúdo: o menu tal como o site o mostra ---------- */
 if(typeof recalcularCombos==="function") recalcularCombos();
 const blocos=[];
 ordemCats().forEach(ci=>{
  const c=MENU[ci]; if(!c||!c.items||!c.items.length) return;
  const temG=c.items.some(i=>i.g);
  const notas=[];
  if(c.note && !(/poke/i.test(c.note) && !c.items.some(x=>/poke/i.test(x.n)))) notas.push(D(c.note));   // a mesma regra do site
  if(c.milk && typeof LEITES!=="undefined"){
   const alt=LEITES.filter(l=>l[1]>0), mesmo=alt.every(l=>l[1]===alt[0][1]);
   const nb=x=>x.replace(/ /g,"\u00A0");                                   // "Sem lactose" não se parte
   if(alt.length) notas.push(px("leite")+": "+D(LEITES[0][0])+" ("+px("incl")+") · "+
     (mesmo ? "+"+alt[0][1]+": "+alt.map(l=>nb(D(l[0]))).join(", ") : alt.map(l=>nb(D(l[0])+" +"+l[1])).join(", ")));
  }
  if(c.extras&&c.extras.length) notas.push(px("extras")+": "+c.extras.map(e=>D(e[0])+" +"+e[1]).join(" · "));
  const rows=[linhaTitulo(frase(limpa(rotuloCat(c))),temG,notas)];
  c.items.forEach(i=>{
   const extra=[];
   if(i.top){                                                   // açaí: o outro preço e os toppings pagos
    if(i.sp) extra.push(frase(T("acaiN_sp"))+": "+i.sp);
    if(i.xt&&i.xt.length&&i.xp) extra.push(px("topx")+" ("+i.xt.map(D).join(", ")+"): +"+i.xp);
   }
   rows.push(linhaItem(D(i.n), i.g?[i.p,i.g]:[i.p], i.d?D(i.d):"", extra, {temG}));
  });
  blocos.push(rows);
 });
 const combos=(typeof COMBOS!=="undefined"?COMBOS:[]).filter(c=>!c.indisp && c.p>0);
 if(combos.length){
  const rows=[linhaTitulo(frase(T("combos")),false,[])];
  combos.forEach(c=>rows.push(linhaItem(D(c.n),[c.p],D(c.d),[],{fonteNome:"JostS",tamNome:9.2,corNome:COR.roxo})));
  blocos.push(rows);
 }
 if(typeof EM_BREVE!=="undefined" && EM_BREVE.length){
  const rows=[linhaTitulo(frase(limpa(tm("breve")))+" · "+limpa(tm("breveTit")),false,[limpa(tm("breveSub"))])];
  EM_BREVE.forEach(i=>rows.push(linhaItem(D(i.n),null,i.d?D(i.d):"",[],{corNome:COR.ink2})));
  blocos.push(rows);
 }
 blocos.push([caixaComo()]);

 /* ---------- paginação: 2 colunas, categoria inteira na mesma coluna sempre que possível ----------
    1.º calcula onde fica cada linha; depois, se a última página só usar a coluna da esquerda,
    reparte-a pelas duas (corte entre categorias, o mais ao meio possível); só então desenha. */
 function paginar(corteUltima){
  const pos=[]; let pag=1, col=0, topo=CAB1, y=topo, ultimaDesde=-1;
  const seguinte=()=>{ if(col===0){ col=1; y=topo; } else { pag++; col=0; topo=CABN; y=topo; } };
  blocos.forEach((rows,bi)=>{
   if(corteUltima && bi===corteUltima.bloco && col===0 && pag===corteUltima.pag) seguinte();
   const hb=rows.reduce((s,r)=>s+r.h,0), livre=FUNDO-y, cheia=FUNDO-topo;
   // não cabe no que resta: se cabe inteira numa coluna nova e aqui sobra pouco, começa lá; senão parte-se entre colunas
   if(y>topo && hb>livre && ((hb<=cheia && livre<cheia*0.45) || livre<cheia*0.12)) seguinte();
   rows.forEach((r,k)=>{
    const precisa=r.h+(r.tit&&rows[k+1]?rows[k+1].h:0);                      // título nunca fica sozinho no fundo
    if(y>topo && y+precisa>FUNDO) seguinte();
    pos.push({r,pag,col,y,bi}); y+=r.h;
   });
   y+=14;
  });
  return pos;
 }
 let pos=paginar(null);
 const ultPag=pos[pos.length-1].pag, naUltima=pos.filter(p=>p.pag===ultPag);
 if(naUltima.every(p=>p.col===0)){
  const blocosU=[...new Set(naUltima.map(p=>p.bi))];
  if(blocosU.length>1){
   const topoU=naUltima[0].y, fimU=naUltima[naUltima.length-1].y+naUltima[naUltima.length-1].r.h;
   let melhor=null;
   blocosU.slice(1).forEach(bi=>{
    const ini=naUltima.find(p=>p.bi===bi).y-topoU, total=fimU-topoU, maior=Math.max(ini-14,total-ini);
    if(!melhor||maior<melhor.maior) melhor={bloco:bi,maior};
   });
   const tentativa=paginar({bloco:melhor.bloco,pag:ultPag});
   if(tentativa[tentativa.length-1].pag===ultPag) pos=tentativa;               // só se não criar outra página
  }
 }
 topoPag1();
 for(let n=2;n<=pos[pos.length-1].pag;n++){ doc.addPage(); topoPagN(); }
 pos.forEach(p=>{ doc.setPage(p.pag); p.r.draw(colX(p.col),p.y); });
 const tot=doc.getNumberOfPages();
 for(let n=1;n<=tot;n++){ doc.setPage(n); rodape(n,tot); }

 const sufixo=(typeof LANG!=="undefined"&&LANG!=="pt")?"-"+LANG:"";
 const nome="menu-emmas-place-"+dia.d+"-"+dia.m+"-"+dia.a+sufixo+".pdf";
 if(opc.blob) return {blob:doc.output("blob"),nome};
 doc.save(nome);
 return {nome};
};
})();
