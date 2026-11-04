# Auditoria de segurança — site, painéis e encomendas (04-11-2026)

Âmbito: `index.html`, `admin/`, `vendas/`, `cozinha/`, `painel-offline.js`, service workers.
**Fora do âmbito:** o código do Worker da Cloudflare, que não está no repositório. Tudo o que se diz sobre o servidor
foi deduzido do que as páginas enviam e recebem.

Legenda: **Facto** = confirmado no código ou em teste · **Dedução** = provável, a confirmar no Worker.

## Resumo

| # | Risco | Gravidade | Estado |
|---|---|---|---|
| S1 | Código escondido no nome, morada ou notas do pedido corria dentro da Gestão, da Cozinha e das Vendas | **Crítica** | **Corrigido neste PR** (com teste) |
| S2 | O cliente pode mudar preços, descontos e total da encomenda | **Crítica** | **Mitigado** (aviso na Gestão); a correcção definitiva é no Worker |
| S3 | Indicação de "pago" e estado inicial vêm do cliente | Alta | Dedução; a confirmar no Worker |
| S4 | Código promocional: verificação e gasto em passos separados; sem limite de tentativas visível | Média | Worker |
| S5 | Reservas de hora (`/reserve`) e encomendas (`/order`) sem chave nem limite de pedidos | Média | Worker |
| S6 | A chave dos painéis vai no endereço (`?key=`) e é a mesma para tudo | Média | Worker |
| S7 | A chave fica guardada no aparelho (`localStorage`) sem prazo | Baixa | Decisão do dono |
| S8 | Repositório público | Informação | Decisão do dono |

## S1 — Código escondido nos dados do cliente (corrigido)

**Facto.** A Gestão (lista de pedidos), a Cozinha (hora, código, estado) e as Vendas (botões dos pedidos `BAL-…`)
punham campos do pedido directamente no HTML. Esses campos são escritos pelo cliente no site, ou por qualquer pessoa
que chame o servidor directamente. Um nome preparado para isso corria como programa dentro do painel, onde a chave
está guardada. Com a chave é possível mudar preços, apagar pedidos e ler dados de clientes.

**Correcção:** todos os campos do pedido passam por `hEsc()`/`esc()`/`escA()` no HTML e por `jsArg()` dentro
de `onclick`. O aspecto não muda.
**Teste:** `tests/seguranca.test.js` cria pedidos com código escondido e confirma que não corre nos três painéis.
Com o código antigo, os três testes falham. Com o novo, passam.

**Depois de aprovar:** trocar a chave dos painéis no Worker (precaução: não há registos para provar que nunca aconteceu).

## S2 — O cliente consegue alterar preços ou descontos? **Sim, tecnicamente.**

**Facto (lado do site):** o pedido enviado para `/order` leva `linhas` (nome, quantidade, **preço**), `itens`
(texto) e **`total`**, todos calculados no telemóvel do cliente: preços, 5% online, 7,9% do açaí, campanhas,
código promocional, taxa de entrega, taxa de serviço e sobretaxa de andar.
**Dedução (servidor):** a Gestão mostra o `total` tal como chegou, e o cliente recebe esse mesmo valor como
"Valor exacto" a transferir. Não há sinal nas páginas de que o Worker recalcule o preço.

Consequência: uma pessoa com conhecimentos técnicos pode enviar uma encomenda de 1 ECV, transferir 1 ECV e anexar
um comprovativo verdadeiro. O comprovativo bate com o total mostrado e a funcionária confirma.
Um cliente normal, pelo site, **não** consegue: os botões e as contas do site estão certos.

**Mitigação neste PR:** a Gestão compara cada pedido do site com o menu de agora e mostra
"⚠ Confirmar valores antes de aceitar" quando:
- uma linha está abaixo de 80% do preço do produto no menu (os descontos não mexem no preço da linha);
- o total é menos de metade da soma das linhas (só um código promocional grande o explica);
- a quantidade, o preço ou o total são inválidos.

Combos e milkshakes não são comparados (as regras deles estão espalhadas pelas páginas). O aviso só informa: não bloqueia nem muda nada.

**Correcção definitiva (Worker):** o servidor deve recalcular o total com o menu dele (`/menu-edit`), as regras de
desconto e as zonas. Deve guardar o seu próprio total e recusar, ou marcar, os pedidos cujo total difere.
É preciso o código do Worker.

## S3 — "Pago" e estado vêm do cliente (dedução)

O site envia `pago: true/false`, e as Vendas enviam `balcao: true`, `balcaoPago`. Se o Worker aceitar estes campos
sem chave, alguém pode criar pedidos que aparecem como vendas do balcão, ou já pagas. Recomendação: `/order` sem chave
só pode criar pedidos do site com estado "aguarda"; os campos `balcao*` só com a chave das Vendas.

## S4 — Códigos promocionais

- `/check` diz se um código existe. Sem limite de tentativas, os códigos curtos podem ser adivinhados.
- `/redeem` gasta o código **antes** de `/order` registar a encomenda. Se o registo falhar, o código fica gasto.
- O desconto do código é calculado no telemóvel (ver S2).
Recomendação: limitar tentativas por IP, gastar o código **no mesmo passo** em que se regista a encomenda e
recalcular o desconto no servidor.

## S5 — Pedidos e reservas sem limite

`/order` e `/reserve` aceitam pedidos sem chave (é preciso, para os clientes). Sem limite por IP, ou sem
Cloudflare Turnstile, alguém pode encher as horas de preparação ou a lista de pedidos.
Recomendação: regra de limite de pedidos (rate limiting) da Cloudflare em `/order`, `/reserve`, `/check` e `/redeem`.

## S6 — Chave no endereço e chave única

O `?key=` fica nos registos de acesso e no histórico do navegador. A mesma chave abre Gestão, Vendas e Cozinha.
Recomendação: cabeçalho `Authorization`, uma chave por painel, e as Vendas e a Cozinha sem acesso a `/menu-set`,
`/estado-set` e `/stock-set`.

## S7 — Chave guardada no aparelho

É intencional (não pedir a chave sempre). Num aparelho partilhado ou perdido, a chave fica lá.
O botão "Sair" apaga-a. Se um aparelho se perder: trocar a chave no Worker.

## Verificado e sem problema

- Não há chaves, tokens nem palavras-passe no código nem no histórico do Git (procurei `key`, `token`, `secret`, `senha`).
  Os NIB/contas bancárias mostrados no site são públicos de propósito.
- Os painéis têm `noindex, nofollow` (não aparecem no Google).
- A chave é testada no servidor antes de abrir o painel (`/soldout-set?item=__teste__`).
- Os campos do checkout não estão desmascarados no Microsoft Clarity (só o carrinho e o menu estão).
  O código do pedido e o botão do WhatsApp estão mascarados.
- O histórico da Gestão (`hEsc`) e as Vendas (`esc`) já escapavam a maior parte dos campos.
