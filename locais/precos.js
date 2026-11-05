/* Páginas locais (cafés gelados, açaí, café): preços do momento.
   Lê os mesmos preços que o menu lê do servidor (Gestão > Menu). Sem resposta, ficam os escritos na página.
   · <b data-preco="Nome" data-t="m|g" data-base="350"> → preço desse produto (médio ou grande)
   · <article data-n="Nome"> → sai da página se o produto foi retirado do menu na Gestão
   · <div class="combo" data-partes='[[["Nome",preço],…],…]'> → soma das partes −5%, arredondado aos 5 (como no menu) */
(function(){
 var API="https://wispy-cherry-ee2e.joaomleal88.workers.dev";
 /* nomes antigos ainda guardados no servidor (iguais a NOMES_NOVOS do index.html) */
 var NOVOS={"Frape Clássico":"Frappé Clássico","Frape Chocolate":"Frappé de Chocolate","Frape Caramelo":"Frappé de Caramelo",
  "Caramelo Latte":"Latte de Caramelo","Iced Caramelo Latte":"Iced Latte de Caramelo","Mocha Chocolate":"Mocha",
  "Muffin Chocolate":"Muffin de Chocolate","Donut Chocolate":"Donut de Chocolate","Donut Doce de Leite":"Donut de Doce de Leite",
  "Pão Rech. Frango":"Pão Recheado de Frango","Pão Rech. Caprese":"Pão Recheado Caprese"};
 var atual=function(k){ return NOVOS[k]||k; };
 function aplicar(ed){
  var p0=(ed&&ed.p)||{}, p={}, off=((ed&&ed.off)||[]).map(atual);
  Object.keys(p0).forEach(function(k){ var n=atual(k); if(!(n in p)||k===n) p[n]=p0[k]; });
  var preco=function(n,t,base){ if(off.indexOf(n)>=0) return 0; var o=p[n], v=o&&o[t]; return +(v!=null?v:base)||0; };
  document.querySelectorAll("[data-n]").forEach(function(c){ if(off.indexOf(c.getAttribute("data-n"))>=0) c.classList.add("fora"); });
  document.querySelectorAll("[data-preco]").forEach(function(b){
   var v=preco(b.getAttribute("data-preco"), b.getAttribute("data-t")||"m", +b.getAttribute("data-base"));
   if(v) b.textContent=(/^\+/.test(b.textContent)?"+":"")+v+"$";
   else if(b.getAttribute("data-t")==="g" && b.parentNode) b.parentNode.style.display="none";
  });
  document.querySelectorAll(".combo[data-partes]").forEach(function(c){
   var partes; try{ partes=JSON.parse(c.getAttribute("data-partes")); }catch(e){ return; }
   var soma=0, ok=true;
   partes.forEach(function(op){ var v=op.map(function(x){ return preco(x[0],"m",x[1]); }).filter(function(x){ return x>0; });
    if(!v.length) ok=false; else soma+=Math.max.apply(null,v); });
   if(!ok){ c.classList.add("fora"); return; }
   c.querySelector("i").textContent=(Math.floor(soma*95/100/5)*5)+"$";
  });
 }
 try{
  var ctl=window.AbortController?new AbortController():null, t=ctl?setTimeout(function(){ ctl.abort(); },5000):0;
  fetch(API+"/menu-edit",ctl?{signal:ctl.signal}:undefined).then(function(r){ return r.json(); })
   .then(function(d){ clearTimeout(t); if(d && !d.erro && d.edit) aplicar(d.edit); }).catch(function(){});
 }catch(e){}
})();
