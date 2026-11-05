# Imagens mais leves e carregamento melhor (05-11-2026)

## O que mudou

| Mudança | Antes | Depois |
|---|---|---|
| Foto Salada Fria de Atum (`img/p/`) | 324 KB, 1448×1086 | 90 KB, 720×540 |
| Foto Pão Recheado de Atum | 316 KB, 1448×1086 | 93 KB, 720×540 |
| Foto Pão Recheado de Frango | 224 KB, 1448×1086 | 76 KB, 720×540 |
| Foto Salada Fria de Frango | 124 KB, 960×720 | 93 KB, 720×540 |
| Foto 2 da capa (`img/capa-2.webp`) | descarregada logo ao abrir | descarregada quando a página já abriu (só aparece depois do mural) |

As outras 72 imagens já estavam leves (cerca de 10 KB cada). Comprimi-las poupava 1 KB por imagem e podia piorar a qualidade, por isso ficaram como estavam.

**Porquê 720×540:** no telemóvel, estas fotos aparecem em cartões de cerca de 170 px. Mesmo num ecrã de alta definição (3×),
720×540 chega e sobra. Antes tinham o dobro do tamanho de que precisavam. A proporção é a mesma, por isso o recorte no cartão é igual.

## Ganho medido no telemóvel

Telemóvel simulado: ecrã de 412 px, processador 4× mais lento e rede 4G lenta (1,6 Mbit/s, 150 ms). Mediana de 3 medições.

| | Antes | Depois | Ganho |
|---|---|---|---|
| Abrir a página: maior conteúdo no ecrã (LCP) | 4,73 s | 4,56 s | **−0,17 s** |
| Percorrer o menu todo: dados descarregados | 2379 KB | 1821 KB | **−558 KB (−23%)** |
| Percorrer o menu todo: só imagens | 1859 KB | 1301 KB | **−30%** |
| Percorrer o menu todo: até todas as fotos aparecerem | 8,4 s | 5,6 s | **−2,8 s (−33%)** |

**Leitura honesta:** ao abrir a página o ganho é pequeno, porque as quatro fotos pesadas só são pedidas quando o cliente
chega ao Almoço e ao Pão recheado. O ganho grande vê-se a percorrer o menu, e também no tarifário de dados de quem visita.
As medições foram feitas num servidor local, sem compressão do GitHub Pages e sem o site real; no telemóvel real os números serão diferentes,
mas a diferença entre antes e depois deve manter-se.

## O aspecto não mudou

Capturas da página inteira em telemóvel, antes e depois, com o relógio parado e o menu todo carregado:
- **página inteira:** semelhança 99,95%. Só 0,03% dos pontos mudam um pouco, e nenhum muda de forma visível;
- **as quatro fotos, em cada cartão:** semelhança entre 97,7% e 98,9%. A diferença média é de 3 em 255 níveis de cor, invisível a olho nu;
- **todas as outras fotos:** idênticas.

Comparação lado a lado (antes à esquerda, depois à direita): `docs/velocidade-imagens/antes-depois-salada.jpg`.

## Como testar

1. `npm install` e depois `npm test` (os testes existentes continuam a passar).
2. À mão, no telemóvel: abrir o site, ir a **Almoço** e **Pão recheado** e confirmar que as fotos estão nítidas e com o mesmo recorte.
3. Esperar uns segundos na capa: a foto 2 do carrossel aparece como antes.

## Como reverter

Botão "Revert" no PR. As fotos originais voltam, porque ficam no histórico do Git.
