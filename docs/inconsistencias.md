# Inconsistências encontradas pelos testes e pela leitura do código (04-11-2026)

Testes: `tests/precos.test.js` (28 testes: preços, descontos, taxas, códigos promocionais, stock, horários, consistência entre páginas).
Correr: `npm install` e depois `npm test`.

## Corrigidas neste PR (baixo risco)

| # | O quê | Onde | Efeito para o cliente |
|---|---|---|---|
| I1 | Ao retirar um código promocional por o pedido ter descido abaixo do mínimo, a mensagem dizia **"precisa de 0 ECV em produtos"** | `index.html`, `refreshChk()` | mensagem errada; agora diz o mínimo verdadeiro |
| I2 | Ao retirar um código só para entregas (o cliente mudou para levantar), a mensagem dizia **"só válido para levantamento no local"** | `index.html`, `refreshChk()` | mensagem ao contrário; agora diz "entregas" |

A causa das duas era a mesma: a mensagem lia o código depois de o apagar. Os preços e os totais já estavam certos; só o texto do aviso estava errado.

## Por decidir ou por tratar no servidor (não mexi)

| # | Inconsistência | Risco | Quem decide |
|---|---|---|---|
| I3 | Os códigos promocionais devem ser tratados no mesmo passo em que a encomenda fica registada | médio | Worker |
| I4 | Quando a rede cai a meio de um envio, o site pode enviar a encomenda outra vez. O servidor deve tratar o mesmo código como a mesma encomenda | médio | Worker |
| I5 | **Combos não descontam stock no site** (descontam nas /vendas). Um combo do site com o último donut não o tira do stock | médio | Dono |
| I6 | "Entrega grátis acima de 750$" conta o subtotal **depois** dos descontos. Um pedido de 780$ com código de 50$ paga entrega | baixo | Dono (texto ou regra) |
| I7 | Nas entregas há sempre **taxa de serviço de 5%**, mesmo com "entrega grátis". O texto "Entregas grátis" não fala dela | baixo/reputação | Dono |
| I8 | Nas zonas de 350 ECV ou mais, a entrega só é grátis acima de 750$ **com hora marcada**. O texto "Entrega grátis acima de 750$" não o diz | baixo | Dono |
| I9 | A categoria "MATCHA &amp; COCO" é guardada no carrinho com `&amp;`. Um código promocional criado para "MATCHA & COCO" (com `&`) não encontraria os produtos | a confirmar no Worker | Worker |
| I10 | A Gestão, as Vendas e a fila offline usam a **data do aparelho**; o site usa a hora de Cabo Verde. Um aparelho com a hora errada mostra o dia errado | baixo | Dono (aparelhos na hora certa) |
| I11 | O menu, os combos, os milkshakes e o horário estão **copiados em 4 ficheiros**. Hoje coincidem (o teste de consistência passa), mas é fácil desalinhar | médio a prazo | Programação |
| I12 | Na Gestão, `COMBOS_BASE` ainda tem os preços antigos (225, 405, 500…). Só servem quando um produto do combo sai do menu (o preço automático passa a 0) | baixo | Programação |
| I13 | Os comentários do código dizem "zonas de **400** ECV para cima", mas a regra usa **350** (`ZONA_MARCADA_MIN`). Falam também de um `ZONA_FREE_MAX` que não existe e de "açaí a 790" (hoje 950). Só os comentários estão errados; o código está certo | nenhum | — |

## Confirmado pelos testes (está certo)

- Tamanho grande e leite vegetal (+100) somam ao preço; açaí 950 (com granola/leite em pó).
- Combos = soma das partes −5%, arredondado aos 5 ECV, igual no site e nas Vendas.
- 5% para levantar com hora marcada; açaí −7,9% por copo (950 → 875); combos sem os 5%.
- Descontos não acumulam: fica o maior; em empate fica o código.
- Código "bebida fria grátis" vale para uma só bebida (a mais cara).
- Entrega: 750 certos pagam, 755 não (zonas < 350); zona ≥ 350 grátis só com hora marcada; andar 50/100/150; serviço 5%.
- Espresso sai do pedido ao escolher entrega.
- Horário: Seg–Sex 08–17, Sáb 09–15, domingo fechado; janelas de levantamento e entrega; igual no site, na Gestão,
  na Cozinha e nos dados para o Google.
- Stock: a encomenda do site desconta as quantidades certas no servidor (falso) e não desconta combos.
- Preços dos produtos iguais no site, Vendas, Cozinha e Gestão.

## Pressupostos

- Os valores esperados saem das regras escritas nos comentários do código e no `CLAUDE.md`.
  Se a regra do negócio for outra, o teste mostra a diferença e quem decide é o dono.
- Os testes usam os preços do código (de reserva). Os preços do servidor (Gestão > Menu) podem ser diferentes.
