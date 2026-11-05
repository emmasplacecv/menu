# Páginas para o Google: cafés gelados, açaí e café (05-11-2026)

Três páginas para quem procura o Emma's Place no Google:

| Página | Para pesquisas como | Produtos |
|---|---|---|
| `emmasplace.cv/cafes-gelados/` | cafés gelados Praia, cafés frios Praia, café gelado Plateau | 8 bebidas frias com café + combos Lanche e Super combo |
| `emmasplace.cv/acai/` | açaí Praia | Açaí (950 / 1050 / +50 por topping extra) e Água de Coco Grande |
| `emmasplace.cv/cafe/` | café Plateau | 7 bebidas quentes + combo Pequeno-almoço |

Cada página tem:
- título e descrição próprios para o Google, sem repetir palavras;
- produtos e preços reais do menu, com as fotos do menu;
- morada, horário, mapa e botões "Encomendar no site" (levam ao menu);
- ligações para as outras duas páginas e para o menu completo;
- dados para o Google (café, morada, horário, menu com preços em ECV, caminho de navegação);
- **sem avaliações e sem estrelas.**

Página principal: título e descrição revistos (mais curtos, para o Google não os cortar):
- Título: *Emma's Place — café, açaí e encomendas | Plateau, Praia*
- Descrição: *Café, açaí, matcha, sumos, tostas, poke bowls e combos no Plateau, Av. Amílcar Cabral (frente BAI/IMPAR), Praia. Encomende online para levantar ou receber.*

O `sitemap.xml` lista as quatro páginas.

## Preços

Ao abrir, cada página lê os preços da **Gestão > Menu**, tal como o menu principal. Um produto retirado na Gestão
desaparece da página. Os preços que o Google lê (dados estruturados) estão escritos na página: se um preço mudar
na Gestão, é preciso actualizar o ficheiro `ferramentas/gerar-paginas-locais.py`, correr
`python3 ferramentas/gerar-paginas-locais.py .` e depois `npm test` (o teste avisa se os preços não baterem com o menu).

## O que decide o dono

1. **Pôr ligações para estas páginas na página principal** (por exemplo, no rodapé). Não pus, para não mexer no design.
   Sem elas, o Google só as encontra pelo `sitemap.xml`, o que demora mais.
2. Enviar o `sitemap.xml` na Google Search Console e pedir a indexação das três páginas.
3. Confirmar que o mapa mostra o sítio certo.

## Contra-argumento honesto

Para pesquisas locais, o que mais pesa é a ficha do Google (Perfil da Empresa) com fotos, horário certo e avaliações
verdadeiras de clientes. Estas páginas ajudam o Google a perceber o que o Emma's Place vende, mas não substituem a ficha.
