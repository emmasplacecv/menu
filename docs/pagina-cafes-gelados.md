# Página "Cafés gelados" — `emmasplace.cv/cafes-gelados/` (04-11-2026)

Objectivo: aparecer no Google em pesquisas como "Emma's Place", "cafés gelados Praia", "cafés frios Praia" e "café gelado Plateau".

## O que tem (só informação que já está no site ou no pedido)

- Título e descrição para o Google; endereço oficial (`canonical`); pré-visualização para WhatsApp e Facebook.
- 8 bebidas: as 7 "Bebidas frias" do menu e o Iced Caramel Macchiato (está em "Matcha & Coco", leva café), com os preços M/G e as fotos do menu.
- Combos com café gelado: Lanche e Super combo, calculados como no menu (soma −5%).
- Morada (Av. Amílcar Cabral, Plateau, frente BAI/IMPAR, Praia), horário, Instagram, mapa e botão "Abrir no Google Maps".
- Botões "Encomendar" que levam ao menu do site (`/#menu`).
- Dados estruturados: café (`CafeOrCoffeeShop`, o mesmo `@id` da página principal), morada, horário, menu
  (`Menu` → `MenuSection` → `MenuItem` com preços em CVE) e caminho de navegação (`BreadcrumbList`).
- `sitemap.xml` com as duas páginas e `robots.txt` a apontar para ele.
- **Não tem:** avaliações, estrelas, telefone, nem palavras repetidas de forma artificial.

## Preços

A página mostra os preços do código do menu e, ao abrir, lê os preços da **Gestão > Menu** (servidor), tal como o menu principal.
Um produto retirado do menu na Gestão desaparece da página.
**Atenção:** os dados estruturados (o que o Google lê) têm os preços escritos à mão. Se mudar um preço na Gestão,
o Google fica com o preço antigo até alguém actualizar `cafes-gelados/index.html`.

## O que decide o dono

1. **Pôr uma ligação para esta página no site** (por exemplo, no rodapé). Não pus, porque o pedido era não mexer nas
   outras páginas. Sem ligação, o Google encontra a página só pelo `sitemap.xml`, o que é mais lento.
2. Enviar o `sitemap.xml` na **Google Search Console** e pedir a indexação de `/cafes-gelados/`.
3. Confirmar que o mapa mostra o sítio certo. O mapa incorporado procura "Emma's Place, Avenida Amílcar Cabral, Plateau, Praia";
   o botão usa a ligação oficial do Google Maps que já está no site.
4. Microsoft Clarity: não está nesta página (menos dados pessoais e mais rapidez). Se quiser medir esta página, acrescenta-se.

## Contra-argumento honesto

Uma página nova sozinha raramente chega ao topo em pouco tempo. Para pesquisas locais ("café gelado Plateau"), o que mais
pesa é a ficha do **Google Business Profile** (fotos, horário, avaliações verdadeiras de clientes) e as ligações de outros
sítios (Instagram, parceiros). Esta página ajuda, mas não substitui a ficha do Google.
