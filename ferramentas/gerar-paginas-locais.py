# Gera /cafes-gelados/, /acai/ e /cafe/ (páginas locais para o Google). Uso: python3 ferramentas/gerar-paginas-locais.py .
# Os produtos e preços vêm do menu do site (index.html): se mudarem lá, mudar aqui e voltar a correr. Depois: npm test.
import json, html, sys, os
RAIZ = sys.argv[1]
H = html.escape
SITE = "https://emmasplace.cv"
MORADA = "Av. Amílcar Cabral, Plateau (frente BAI/IMPAR), Praia"
HORARIO = "Seg–Sex 08h–17h · Sáb 09h–15h"
CAFE = {"@type":"CafeOrCoffeeShop","@id":SITE+"/#cafe","name":"Emma's Place | Coffee & More","url":SITE+"/",
 "image":SITE+"/img/logo.webp","servesCuisine":["Café","Pequeno-almoço","Almoço"],"priceRange":"85–1050 ECV",
 "currenciesAccepted":"CVE","sameAs":["https://instagram.com/emmasplace.cv"],"hasMap":"https://maps.app.goo.gl/PUQn2B7j8WX2Sa9r7",
 "address":{"@type":"PostalAddress","streetAddress":"Av. Amílcar Cabral, Plateau (frente BAI/IMPAR)","addressLocality":"Praia","addressCountry":"CV"},
 "openingHoursSpecification":[
  {"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"08:00","closes":"17:00"},
  {"@type":"OpeningHoursSpecification","dayOfWeek":"Saturday","opens":"09:00","closes":"15:00"}]}
LEITE = "Leite à escolha: normal, ou aveia, coco, soja, amêndoa ou sem lactose (+100$)."
PAGINAS = [
 {"cam":"cafes-gelados","nome":"Cafés gelados",
  "title":"Cafés gelados na Praia, Plateau — Emma's Place",
  "desc":"Iced latte, frappés e iced mocha no Emma's Place, Av. Amílcar Cabral (frente BAI/IMPAR), Plateau, Praia. Preços, horário e encomenda online.",
  "ogt":"Cafés gelados — Emma's Place, Plateau, Praia","ogd":"Iced latte, frappés e iced mocha. Encomende no site para levantar no Plateau ou com entrega na Praia.",
  "ogimg":"/img/p/frappe-de-caramelo.webp",
  "h1":"Cafés gelados no Plateau, Praia",
  "intro":["Cafés frios e frappés no Emma's Place, na Av. Amílcar Cabral, em frente ao BAI/IMPAR, no Plateau. Tamanho médio ou grande, com o leite à escolha."],
  "leve":"Encomende no site para levantar no local ou com entrega na Praia. Entrega grátis acima de 750$.",
  "secao":"Cafés gelados e frappés",
  "itens":[("Iced Latte","",225,250,"iced-latte"),("Café Instantâneo Gelado","",275,300,"cafe-instantaneo-gelado"),
   ("Frappé Clássico","",275,300,"frappe-classico"),("Frappé de Chocolate","",325,350,"frappe-de-chocolate"),
   ("Frappé de Caramelo","",350,375,"frappe-de-caramelo"),("Iced Latte de Caramelo","",350,375,"iced-latte-de-caramelo"),
   ("Iced Mocha","",350,375,"iced-mocha"),("Iced Caramel Macchiato","com leite de coco",450,500,"iced-caramel-macchiato")],
  "nota":LEITE+" Preços em ECV. Imagens meramente ilustrativas.",
  "combosT":"Combos com café gelado",
  "combos":[("Lanche","café gelado ou frappé clássico + donut",400,[[["Café Instantâneo Gelado",275],["Frappé Clássico",275]],[["Donut de Chocolate",150],["Donut de Doce de Leite",150]]]),
   ("Super combo","sopa + pão recheado de frango ou caprese + café gelado ou frappé clássico",760,[[["Sopa do Dia",300]],[["Pão Recheado de Frango",225],["Pão Recheado Caprese",225]],[["Café Instantâneo Gelado",275],["Frappé Clássico",275]]])]},
 {"cam":"acai","nome":"Açaí",
  "title":"Açaí na Praia, Plateau — Emma's Place",
  "desc":"Açaí em copo de 355 ml no Plateau, Praia: granola, leite em pó, fruta e toppings à escolha. Preços, horário e encomenda online no Emma's Place.",
  "ogt":"Açaí — Emma's Place, Plateau, Praia","ogd":"Copo de 355 ml, monte o seu com granola, leite em pó, fruta e toppings. Encomende no site.",
  "ogimg":"/img/p/acai.webp",
  "h1":"Açaí no Plateau, Praia",
  "intro":["Açaí em copo de 355 ml, que vai sempre cheio, no Emma's Place, na Av. Amílcar Cabral, em frente ao BAI/IMPAR, no Plateau.",
           "Monte o seu com granola, leite em pó, banana, morango, frutos vermelhos, kiwi e leite condensado."],
  "leve":"Disponibilidade limitada — pode acabar durante o dia. Encomende no site para levantar no local ou com entrega na Praia.",
  "secao":"Açaí e água de coco",
  "acai":True,
  "itens":[("Água de Coco Grande","coco grande inteiro · natural, servido no coco",400,None,"agua-de-coco-grande")],
  "nota":"Preços em ECV. Imagens meramente ilustrativas.",
  "combosT":None,"combos":[]},
 {"cam":"cafe","nome":"Café",
  "title":"Café no Plateau, Praia — Emma's Place",
  "desc":"Espresso, cappuccino, latte e mocha no Emma's Place, Av. Amílcar Cabral (frente BAI/IMPAR), Plateau, Praia. Preços, horário e encomenda online.",
  "ogt":"Café — Emma's Place, Plateau, Praia","ogd":"Espresso, cappuccino, latte e mocha no Plateau. Encomende no site.",
  "ogimg":"/img/p/cappuccino.webp",
  "h1":"Café no Plateau, Praia",
  "intro":["Coffee & More — sabores que acolhem, momentos que ficam.",
           "Espresso, cappuccino, latte e mocha no Emma's Place, na Av. Amílcar Cabral, em frente ao BAI/IMPAR, no Plateau."],
  "leve":"Encomende no site para levantar no local ou com entrega na Praia. O Espresso não está disponível para entrega.",
  "secao":"Bebidas quentes",
  "itens":[("Espresso","",85,None,"espresso"),("Espresso Duplo","",150,None,"espresso-duplo"),("Latte Clássico","meia de leite",150,175,"latte-classico"),
   ("Americano","",150,175,"americano"),("Cappuccino","",175,200,"cappuccino"),("Mocha","",200,225,"mocha"),("Latte de Caramelo","",200,225,"latte-de-caramelo")],
  "nota":LEITE+" Preços em ECV. Imagens meramente ilustrativas.",
  "combosT":"Combo com café",
  "combos":[("Pequeno-almoço","espresso + donut ou muffin de chocolate",220,[[["Espresso",85]],[["Donut de Chocolate",150],["Donut de Doce de Leite",150],["Muffin de Chocolate",150]]])]},
]
ACAI = [("Açaí · com granola e/ou leite em pó","com granola e/ou leite em pó",950),
        ("Açaí · sem granola nem leite em pó","sem granola nem leite em pó (mesmo com fruta)",1050),
        ("Açaí · topping extra","cada topping extra (caramelo, chocolate, morango)",50)]

def preco(chave,t,v,mais=""):
    return f'<b data-preco="{H(chave)}" data-t="{t}" data-base="{v}">{mais}{v}$</b>'
def cartao(n,d,m,g,foto):
    desc_html = ('<p class="pc-d">'+H(d)+'</p>') if d else ""
    pr = f'<span class="pc-p">{preco(n,"m",m)}{" <small>M</small>" if g else ""}</span>'
    if g: pr += f'<span class="pc-g">{preco(n,"g",g)} <small>G</small></span>'
    return (f'  <article class="pc" data-n="{H(n)}"><div class="pc-foto"><img src="/img/p/{foto}.webp" alt="{H(n)}" width="400" height="400" loading="lazy" decoding="async"></div>\n'
            f'    <div class="pc-txt"><h3 class="pc-n">{H(n)}</h3>{desc_html}<div class="pc-pr">{pr}</div></div></article>')
def cartao_acai():
    linhas = "".join(f'<li><span>{H(t)}</span>{preco(k,"m",v,"+" if "extra" in k else "")}</li>' for k,t,v in ACAI)
    return (f'  <article class="pc largo" data-n="Açaí"><div class="pc-foto"><img src="/img/p/acai.webp" alt="Açaí" width="400" height="400" loading="lazy" decoding="async"></div>\n'
            f'    <div class="pc-txt"><h3 class="pc-n">Açaí</h3><p class="pc-d">copo de 355 ml · monte o seu com granola, leite em pó, fruta e toppings</p><ul class="precos">{linhas}</ul></div></article>')
def oferta(nome,m,g):
    o=[{"@type":"Offer","name":"Médio" if g else "Preço","price":str(m),"priceCurrency":"CVE"}]
    if g: o.append({"@type":"Offer","name":"Grande","price":str(g),"priceCurrency":"CVE"})
    return o
def jsonld(pg):
    url=f"{SITE}/{pg['cam']}/"
    itens=[]
    if pg.get("acai"):
        itens.append({"@type":"MenuItem","name":"Açaí","description":"copo de 355 ml",
          "offers":[{"@type":"Offer","name":t,"price":str(v),"priceCurrency":"CVE"} for k,t,v in ACAI[:2]]})
    for n,d,m,g,f in pg["itens"]:
        it={"@type":"MenuItem","name":n,"offers":oferta(n,m,g)}
        if d: it["description"]=d
        itens.append(it)
    for n,d,p,_ in pg["combos"]:
        itens.append({"@type":"MenuItem","name":"Combo "+n,"description":d,"offers":[{"@type":"Offer","price":str(p),"priceCurrency":"CVE"}]})
    cafe=dict(CAFE); cafe["hasMenu"]={"@id":SITE+"/#menu"}
    g=[cafe,
       {"@type":"Menu","@id":url+"#menu","name":pg["nome"],"inLanguage":"pt",
        "hasMenuSection":{"@type":"MenuSection","name":pg["secao"],"hasMenuItem":itens}},
       {"@type":"WebPage","@id":url,"url":url,"name":pg["title"],"inLanguage":"pt","about":{"@id":SITE+"/#cafe"},
        "mainEntity":{"@id":url+"#menu"},
        "breadcrumb":{"@type":"BreadcrumbList","itemListElement":[
          {"@type":"ListItem","position":1,"name":"Emma's Place","item":SITE+"/"},
          {"@type":"ListItem","position":2,"name":pg["nome"],"item":url}]}}]
    return json.dumps({"@context":"https://schema.org","@graph":g},ensure_ascii=False,indent=1)
def pagina(pg):
    url=f"{SITE}/{pg['cam']}/"
    lista="\n".join(([cartao_acai()] if pg.get("acai") else [])+[cartao(*i) for i in pg["itens"]])
    combos=""
    if pg["combos"]:
        cs="\n".join(f'  <div class="combo" data-partes=\'{H(json.dumps(pt,ensure_ascii=False))}\'><div><b>{H(n)}</b><span>{H(d)}</span></div><i>{p}$</i></div>' for n,d,p,pt in pg["combos"])
        combos=f'\n<h2>{H(pg["combosT"])}</h2>\n<div class="combos">\n{cs}\n</div>\n'
    outras="".join(f'<a href="/{o["cam"]}/">{H(o["nome"])}</a>' for o in PAGINAS if o is not pg)
    intro="\n  ".join(f"<p>{H(x)}</p>" for x in pg["intro"])
    return f'''<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{H(pg["title"])}</title>
<meta name="description" content="{H(pg["desc"])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Emma's Place">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="{H(pg["ogt"])}">
<meta property="og:description" content="{H(pg["ogd"])}">
<meta property="og:image" content="{SITE}{pg["ogimg"]}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/img/logo.webp">
<!-- Página local (gerada a partir do menu do site). Produtos e preços = os do menu (index.html); ao abrir, os preços
     são corrigidos com os da Gestão > Menu (/locais/precos.js). Se mudar um preço no código do menu, mudar também aqui
     e nos dados estruturados (application/ld+json). Encomendar = menu principal. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&amp;family=Jost:wght@300;400;500;600&amp;display=swap">
<link rel="stylesheet" href="/locais/estilo.css">
<script type="application/ld+json">
{jsonld(pg)}
</script>
</head>
<body>
<div class="wrap">

<nav class="sitebar" aria-label="Navegação principal">
  <a class="brand-lockup" href="/" aria-label="Emma's Place — início">
    <img src="/img/logo.webp" alt="Logótipo Emma's Place" width="52" height="52">
    <span><strong>EMMA'S PLACE</strong><small>Plateau · Praia</small></span>
  </a>
  <a class="topcart" href="/#menu">Encomendar</a>
</nav>

<div class="crumb"><a href="/">Emma's Place</a> › {H(pg["nome"])}</div>

<header class="intro">
  <h1>{H(pg["h1"])}</h1>
  {intro}
  <p class="leve">{H(pg["leve"])}</p>
  <a class="go" href="/#menu">Encomendar no site</a>
</header>

<h2 id="menu">{H(pg["secao"])}</h2>
<div class="shelf" id="lista">
{lista}
</div>
<p class="nota">{H(pg["nota"])}</p>
{combos}
<section class="info" aria-labelledby="ondeT">
  <h2 id="ondeT">Onde estamos</h2>
  <dl>
    <dt>Morada</dt><dd>{H(MORADA)}</dd>
    <dt>Horário</dt><dd>{H(HORARIO)}</dd>
    <dt>Instagram</dt><dd><a href="https://instagram.com/emmasplace.cv" target="_blank" rel="noopener">@emmasplace.cv</a></dd>
  </dl>
  <div class="mapa"><iframe title="Mapa: Emma's Place, Av. Amílcar Cabral, Plateau, Praia" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
    src="https://maps.google.com/maps?q=Emma%27s%20Place%2C%20Avenida%20Am%C3%ADlcar%20Cabral%2C%20Plateau%2C%20Praia%2C%20Cabo%20Verde&amp;z=17&amp;output=embed"></iframe></div>
  <a class="mapbtn" href="https://maps.app.goo.gl/PUQn2B7j8WX2Sa9r7" target="_blank" rel="noopener">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>
    <span>Abrir no Google Maps</span>
  </a>
</section>

<nav class="mais" aria-label="Também no Emma's Place"><b>Também no Emma's Place</b>{outras}<a href="/#menu">Menu completo</a></nav>

<div class="fim"><a class="go" href="/#menu">Encomendar no site</a></div>

<footer class="site-footer">
  <div class="footer-brand"><img src="/img/logo.webp" alt="Logótipo Emma's Place" width="72" height="72" loading="lazy"><div><strong>EMMA'S PLACE</strong></div></div>
  <div class="footer-col"><b>Horário</b><span>{H(HORARIO)}</span><span>Plateau, Praia</span></div>
  <div class="footer-col"><b>Contactos</b><a href="/#menu">Encomendar no site</a><a href="https://instagram.com/emmasplace.cv" target="_blank" rel="noopener">@emmasplace.cv</a></div>
  <div class="footer-bottom">Preços em ECV · Imagens meramente ilustrativas</div>
</footer>
</div>
<script src="/locais/precos.js" defer></script>
</body>
</html>
'''
for pg in PAGINAS:
    os.makedirs(os.path.join(RAIZ,pg["cam"]),exist_ok=True)
    open(os.path.join(RAIZ,pg["cam"],"index.html"),"w",encoding="utf-8").write(pagina(pg))
print("ok")
