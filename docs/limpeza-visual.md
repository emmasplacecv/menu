# Limpeza visual da página principal (05-11-2026)

Marca, cores, fotos, preços, regras e processo de encomenda **iguais**. Só muda a arrumação e o aspecto no telemóvel.
Capturas antes/depois nesta pasta: `docs/limpeza-visual/`.

## O que mudou

| # | Pedido | O que foi feito |
|---|---|---|
| 1 | Açaí e mais pedidos o mais acima possível | No telemóvel pequeno, o açaí passa de 528 px para **301 px** do topo e os mais pedidos de 1174 px para **801 px**. No telemóvel grande, os mais pedidos já aparecem no primeiro ecrã. O painel Recolher/Entrega e a pesquisa passam para depois dos Mais pedidos |
| 2 | Idiomas num selector pequeno | Os 5 botões passam a um selector "PT ▾" na barra do topo |
| 3 | Cabeçalho + categorias numa barra compacta e opaca | Uma só barra fixa, fundo creme opaco, toda a largura do ecrã: marca, idioma, música, carrinho e, por baixo, as categorias. Nada se vê por trás |
| 4 | Banner do açaí elegante com a foto real | O desenho (sol, coqueiro, tucano, flores) dá lugar à foto real `img/capa-4.webp` sobre roxo-açaí. "8% de desconto no açaí, para levantar" e as condições (*Transferência · Hora marcada · Não válido no balcão) ficam legíveis, em 12 px ou mais. O banner dos 5%, que roda na mesma capa, recebeu o mesmo tratamento com a foto real `img/capa-1.webp` |
| 5 | Música | **A música e o botão ficam.** O botão sai do canto (onde tapava o «Adicionar» da água de coco) e passa para a barra do topo |
| 6 | Barra do carrinho em baixo | Só aparece com produtos: quantidade, "Ver carrinho" e total (ex.: **2 · Ver carrinho · 700$**) |
| 7 | Mesmo formato de preço | Tudo o que o cliente vê fica como **950$**, **+50$** e **−35$**: cartões, mais pedidos, combos, pesquisa, opções do produto, açaí, carrinho, totais e pagamento. As mensagens enviadas à equipa com o pedido continuam iguais (em ECV) |
| 8 | "Em breve" depois dos produtos à venda | Passa para depois dos combos, também no fim da barra de categorias |
| 9 | Texto do açaí | Duas frases (copo de 355 ml e o que leva; 875$ no site com transferência e hora marcada, 950$ no balcão) e o aviso "Disponibilidade limitada: pode esgotar durante o dia — vale sempre a disponibilidade indicada no menu" |

Não foram criadas nem alteradas fotos: só se usam fotos que já estavam no site.

## Como testar

**Automático:** `npm install` e depois `npm test` (29/29). O ficheiro `tests/limpeza-visual.test.js` corre no telemóvel pequeno (360×740) e
no grande (430×932), nos 5 idiomas, e faz uma **encomenda completa com toques nos botões**: Frappé de Caramelo e Açaí → "Ver carrinho" → checkout →
nome e telefone → "Confirmar encomenda". Confirma que o pedido chega ao servidor falso com o total que o cliente viu. Estes testes falham na versão anterior.

**À mão, no telemóvel (5 minutos):**
1. Abrir o site: a barra do topo tem a marca, "PT ▾", o botão da música e o carrinho, e por baixo as categorias. Ao deslizar, a barra fica no topo e não se vê texto por trás.
2. Mudar o idioma no "PT ▾".
3. Ver o banner do açaí com a foto e as condições do desconto; logo a seguir, o açaí e os mais pedidos.
4. Juntar dois produtos: em baixo aparece "2 · Ver carrinho · …$". Tocar e fazer uma encomenda de teste. Depois, apagá-la na Gestão.
5. Tocar no botão da música (na barra do topo) para ligar e desligar.

## Como reverter

- Tudo: fechar o PR ou, depois do merge, botão "Revert".
- Só uma parte: no `index.html`, o CSS novo está num bloco marcado `05-11-2026: LIMPEZA VISUAL`. Apagar a parte "2) Banners da capa"
  devolve os desenhos antigos; os textos novos estão num bloco com o mesmo título, antes de `const FREE=750`.

## O que fica por decidir

- O banner dos 5% também mudou para foto (não foi pedido explicitamente, mas era o único desenho que sobrava na capa). Se preferir o desenho, retira-se só essa parte.
- A frase "Código removido: precisa de … ECV" continua em ECV, para não chocar com o PR 3, que corrige essa mensagem. Depois de integrar o PR 3, alinha-se.
