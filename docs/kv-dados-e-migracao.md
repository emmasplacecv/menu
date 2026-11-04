# Dados no Cloudflare KV — o que está guardado, se aguenta e como migrar (04-11-2026)

> **Limite desta análise:** o código do Worker (`wispy-cherry-ee2e…workers.dev`) **não está no repositório**.
> Não consigo dizer *exactamente* que chaves existem no KV, nem se algum dado já está noutro serviço (R2, D1).
> Este documento separa o que é **facto** (o que as páginas enviam e recebem) do que é **dedução** (como o Worker o guarda).
> Para passar de dedução a facto: juntar o Worker ao repositório, ou correr `wrangler kv key list --binding=<NOME>`
> e colar aqui **só os nomes das chaves** (sem valores nem segredos).
> **Nada foi migrado nem alterado no servidor.**

## 1. Que dados são guardados (pelo que as páginas mostram)

| Dado | Escrito por | Lido por | Forma (facto: o que circula) | Como o Worker o guarda (dedução) |
|---|---|---|---|---|
| **Menu e opções** | `/menu-set` (Gestão) | todas as páginas (`/menu-edit`) | `{p, off, add, ord, cp, coff, cadd, cord}`: preços por produto `{m,g}`, produtos retirados e criados, ordem, combos, e as opções `__cfg:*` (campanhas, só hora marcada) e `__cat:*` (categorias, leite) | 1 chave única, reescrita inteira em cada gravação |
| **Estado da loja** | `/estado-set`, `/entregas-set` | site, Gestão | aberto/fechado, mensagem, entregas suspensas | 1 ou 2 chaves |
| **Esgotados do dia** | `/soldout-set` (Gestão, Cozinha) | site, Vendas | lista de nomes, mais extras `@x:tipo:nome` | 1 chave por dia (repõe-se sozinha à meia-noite) |
| **Stock do dia** | `/stock-set`, `/stock-item` (manhã), `/stock-baixa` (Cozinha/Vendas), `/order` (desconta), `/order-del` (devolve) | site, Vendas, Cozinha, Gestão | `{produto: quantidade}` | 1 chave por dia com o objecto todo |
| **Encomendas** | `/order` (site e Vendas) | `/orders?dia=` (painéis) | pedido inteiro: código, nome, telefone, morada, zona, andar, linhas com preço, itens, total, notas, `pago`, `balcao*`, `stock` | por dia: 1 chave com a lista do dia **ou** 1 chave por pedido; com prazo de validade (o `/renovar` "regrava com os prazos novos", sinal de `expirationTtl`) |
| **Mudanças nos pedidos** | `/order-status`, `/order-pago`, `/order-visto`, `/order-del` | painéis | estado, pago e método, hora "visto" | reescrita do pedido (ou da lista do dia) |
| **Horas de preparação** | `/reserve` (site, Vendas) | `/slots` | capacidade por bloco de 15 min, partilhada entre entregas e levantamentos | 1 chave por dia com os blocos ocupados |
| **Códigos promocionais** | criados fora das páginas (consola ou outro meio) | `/check`, `/redeem` | `{tipo, v, cat, min, modo, d}` + "já usado" | 1 chave por código, ou uma lista |
| **Comprovativos** | `POST /comprovativo` (site) | `GET /comprovativo` (painéis) | ficheiro em base64 (foto ≤1400 px em JPEG, ou PDF até 3,5 MB → ~4,7 MB em base64) | 1 chave por código de pedido (valor até 25 MiB no KV), **ou** R2 |
| **Notificações** | `/push-sub`, `/push-chave` | Worker | endereços de subscrição dos aparelhos, chave pública VAPID; `/push-log` | 1 chave por aparelho + registo |

**Dados pessoais** (RGPD/GDPR e lei cabo-verdiana de protecção de dados): nome, telefone, morada e localização GPS dos
clientes, e comprovativos bancários (com nome e, por vezes, número de conta). Têm de ter prazo de apagamento definido.

## 2. O KV é adequado? **Para o menu e o estado, sim. Para stock, horas, códigos e encomendas, não.**

Como o KV funciona (documentação oficial da Cloudflare):
- **Consistência eventual:** uma escrita pode levar **60 s ou mais** a ser vista noutros pontos da rede da Cloudflare.
- **Sem transacções nem "ler-mudar-gravar" atómico:** dois pedidos ao mesmo tempo lêem o mesmo valor e o segundo a gravar apaga o primeiro.
- **1 escrita por segundo na mesma chave**; acima disso dá erro 429.
- **Plano gratuito: 1000 escritas por dia** (em chaves diferentes). Plano pago: escritas a 5 USD/milhão, com 1 milhão incluído.

### Situações reais com dois clientes ao mesmo tempo

| Situação | O que acontece com KV | Consequência |
|---|---|---|
| Dois clientes compram o **último açaí** no mesmo segundo | os dois lêem stock 1 e os dois gravam 0 | **vende-se o que não há**: um cliente paga e não recebe |
| Duas encomendas chegam juntas e o dia é **1 chave com a lista** | as duas lêem a lista, cada uma junta a sua e grava | **uma encomenda desaparece**, mesmo tendo o cliente recebido "pedido feito" e transferido |
| Encomenda do site e "stock −1" da cozinha juntos | o segundo a gravar apaga a baixa do primeiro | stock errado, a mais |
| Dois clientes reservam a **última hora** livre | os dois vêem a hora livre | horário com mais pedidos do que a cozinha consegue fazer |
| O mesmo código promocional em dois telemóveis | os dois `/redeem` lêem "não usado" | código de uso único usado duas vezes |
| Hora de ponta (site + Vendas + Cozinha) | várias escritas por segundo na chave do dia | erro 429 → a encomenda falha e as Vendas guardam-na na fila offline |
| Telemóveis em operadoras diferentes (ex.: CV Móvel e Unitel T+) chegam a centros da Cloudflare diferentes | cada centro vê a sua cópia até 60 s | um vê "esgotado" e o outro ainda vê "tem"; a Gestão pode não ver logo a encomenda |
| Envio repetido quando a rede cai (fila offline, `sendBeacon` do site) | a procura do código em `/orders` pode ainda não ver a encomenda gravada | **encomenda em duplicado** |
| Plano gratuito | cada encomenda custa cerca de 5 a 8 escritas (pedido, stock, hora, estado ×3–4, pago, visto) | com ~150 encomendas/dia acabam as 1000 escritas e **o servidor deixa de gravar até à meia-noite UTC (23h00 na Praia)** |

**Pressuposto a verificar:** a gravidade depende de o Worker guardar a lista do dia numa só chave e de o plano ser
gratuito ou pago. Com poucas encomendas por dia o risco é baixo, mas cresce com campanhas e horas de ponta, que são
precisamente os momentos em que o stock é curto.

**Contra-argumento mais forte:** "até agora funcionou". É verdade com o volume actual. Mas as falhas de concorrência
não avisam: aparecem como "o cliente diz que pagou e o pedido não está lá" ou "o stock não bate". Sem registos não se
distinguem de enganos humanos. Ou seja, o facto de não se ter visto o problema não prova que ele não existe.

## 3. Opções dentro da Cloudflare

| | **D1** (SQLite gerido) | **Durable Objects** (SQLite dentro de um objecto) |
|---|---|---|
| Consistência | forte (uma base principal) | forte; um objecto atende um pedido de cada vez |
| Transacções | `batch()` atómico; `UPDATE … WHERE q >= n` e restrições `CHECK`/`UNIQUE` | transacções completas dentro do objecto |
| Ver os dados | consola da Cloudflare mostra tabelas e permite SQL; exportação fácil | só por código |
| Relatórios e CSV | SQL directo (`GROUP BY produto, hora`) | por código |
| Complexidade | baixa | média (classe nova, migrações do objecto) |
| Plano gratuito | 5 M linhas lidas/dia, 100 000 linhas escritas/dia, 5 GB | 100 000 pedidos/dia, 13 000 GB-s/dia, 5 GB SQLite |
| Plano pago (Workers Paid, 5 USD/mês) | 25 mil milhões de linhas lidas e 50 milhões escritas por mês incluídas | 1 milhão de pedidos e 400 000 GB-s por mês incluídos |

**Recomendação: D1** para encomendas, stock, horas e códigos. Fica **KV** para o menu, o estado e os esgotados, que são
muito lidos, pouco escritos, e onde um atraso de segundos não faz mal. Se os comprovativos estiverem no KV, passam para **R2**.
Durable Objects só se, mais tarde, se quiser a cozinha actualizada ao segundo (WebSockets).

Porquê D1 e não Durable Objects: para uma loja, as duas aguentam. O D1 deixa o dono ou a contabilista ver as tabelas
na consola sem programar, e os relatórios saem com uma consulta. O D1 também resolve as situações da tabela:
- **Stock:** `UPDATE stock SET q = q - ? WHERE dia = ? AND item = ? AND q >= ?`. Se não mudar nenhuma linha, esgotou e o pedido é recusado.
- **Encomenda + stock + código + hora num só `batch()`** (tudo ou nada): ou fica tudo registado, ou nada.
- **Duplicados:** `UNIQUE(dia, code)`. Um segundo envio do mesmo código é recusado sem erro e devolve o id do primeiro (idempotência).
- **Horas:** `UPDATE slots SET usado = usado + ? WHERE dia = ? AND bloco = ? AND usado + ? <= capacidade`.

Esquema mínimo (proposta):
```sql
CREATE TABLE pedidos (id TEXT PRIMARY KEY, dia TEXT NOT NULL, code TEXT NOT NULL, criado TEXT, origem TEXT,
  modo TEXT, estado TEXT, total INTEGER, total_servidor INTEGER, pago INTEGER, metodo TEXT, dados TEXT,
  UNIQUE(dia, code));
CREATE TABLE linhas (pedido_id TEXT, produto TEXT, q INTEGER, preco INTEGER);
CREATE TABLE stock (dia TEXT, item TEXT, q INTEGER CHECK (q >= 0), PRIMARY KEY (dia, item));
CREATE TABLE slots (dia TEXT, bloco TEXT, usado INTEGER, capacidade INTEGER, PRIMARY KEY (dia, bloco));
CREATE TABLE promos (code TEXT PRIMARY KEY, regra TEXT, usado_em TEXT, pedido_id TEXT);
```

## 4. Migração faseada (proposta, não executada)

Princípio: **as páginas não mudam**. Os mesmos endereços (`/order`, `/orders`, `/stock-dia`…) com as mesmas respostas;
só muda onde o Worker guarda. Um interruptor no Worker (`FONTE = "kv" | "d1"`, variável de ambiente) decide de onde se lê.
Fazer as mudanças ao **domingo** (loja fechada).

| Fase | O que se faz | Duração | Como saber que correu bem | Reverter |
|---|---|---|---|---|
| **0. Preparar** | Juntar o Worker ao repositório; cópia completa do KV (`wrangler kv key list` + `get`); criar a base D1 na região Europa Ocidental; testes com o servidor falso de `tests/` | 1 semana | cópia guardada fora da Cloudflare; testes verdes | nada a reverter |
| **1. Escrita em sombra** | O Worker continua a usar o KV, e também grava cada encomenda, stock e hora no D1. Lê-se só do KV | 2 semanas | relatório diário KV vs D1: mesmo n.º de pedidos e mesmo total por dia | desligar a escrita no D1 (1 linha) |
| **2. Códigos e horas no D1** | `/check`, `/redeem`, `/slots`, `/reserve` passam a decidir pelo D1 (atómico); o KV continua a ser actualizado | 1 semana | nenhum código usado 2×; nenhuma hora acima da capacidade | `FONTE_PROMO=kv` |
| **3. Encomendas e stock no D1** | `/order` faz encomenda + stock + código + hora num `batch()`; `/orders` e `/stock-dia` lêem do D1; o KV continua a receber cópia | 2 semanas | fecho do dia nas /vendas igual ao relatório do D1; zero duplicados (`UNIQUE`) | `FONTE=kv` (o KV tem tudo, porque a cópia continuou) |
| **4. Arrumar** | Deixar de escrever encomendas, stock, horas e códigos no KV; comprovativos para R2; definir prazo de apagamento dos dados pessoais | 1 dia | uma semana sem alertas | voltar a ligar a cópia no KV e correr o script D1→KV |

### Riscos

| Risco | Probabilidade | Impacto | Como reduzir |
|---|---|---|---|
| Erro no Worker novo em hora de ponta | média | alto (encomendas falham) | publicar ao domingo; interruptor `FONTE`; as Vendas e a Cozinha já guardam na fila offline |
| Diferenças entre KV e D1 durante a sombra | média | médio | relatório diário; só avançar com 14 dias seguidos sem diferenças |
| A fila offline das Vendas envia vendas antigas depois da mudança | baixa | médio | `UNIQUE(dia, code)` e campo `dia` já enviado pelas Vendas |
| Limites do plano gratuito (D1: 100 000 linhas escritas/dia) | baixa | alto | com índices, cada encomenda escreve ~10–20 linhas: dá para milhares por dia |
| Latência Praia → base D1 na Europa (~100–150 ms por consulta) | certa | baixo | uma só `batch()` por encomenda; o menu continua no KV (rápido) |
| Perda de dados na migração | baixa | alto | cópia da fase 0; o KV fica intacto até à fase 4 |
| Falta de quem mantenha o Worker | **alta** | alto | documentar no repositório; testes automáticos; não começar sem o código do Worker no Git |

### Custos (preços oficiais da Cloudflare, Novembro 2026)

- **Plano gratuito:** provavelmente chega para o volume actual em D1 (100 000 linhas escritas/dia). O limite apertado é o
  do **KV gratuito** (1000 escritas/dia), que a migração alivia.
- **Workers Paid: 5 USD/mês** (≈ 500 ECV), com D1, KV e Durable Objects incluídos muito acima do que a loja usa.
  Recomendado de qualquer forma: quando se passa um limite gratuito, o serviço **pára** até à meia-noite UTC, que são as 23h00 na Praia.
- **Trabalho:** cerca de 3 a 5 dias de programação mais 4 a 6 semanas de acompanhamento. É o custo principal.

### O que decide o dono

1. Confirmar o plano Cloudflare actual (gratuito ou pago) e, se for gratuito, se compensa passar ao pago (5 USD/mês).
2. Entregar o código do Worker (sem segredos) para confirmar as deduções deste documento.
3. Aceitar o calendário: fases aos domingos, com 2 semanas de sombra antes de mudar a fonte.
4. Definir o prazo de apagamento dos dados pessoais e dos comprovativos (sugestão: o que a contabilista precisar; o resto, 90 dias).

## Fontes

- [Workers KV — How KV works (consistência eventual, 60 s)](https://developers.cloudflare.com/kv/concepts/how-kv-works/)
- [Workers KV — Limits (1 escrita/s por chave; 1000 escritas/dia no gratuito)](https://developers.cloudflare.com/kv/platform/limits/)
- [Workers KV — Pricing](https://developers.cloudflare.com/kv/platform/pricing/)
- [D1 — Pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [D1 — Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Durable Objects — Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) · [Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Escolher o tipo de armazenamento (Cloudflare)](https://developers.cloudflare.com/workers/platform/storage-options/)
