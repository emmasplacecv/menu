# Dados do servidor e migração para D1 — proposta (05-11-2026)

> O código do servidor (Worker) e a análise completa estão no **repositório privado do Worker**.
> Este documento é a versão pública: o que existe, porque se propõe mudar e como mudar por fases.
> **Nada foi migrado nem alterado no servidor.**

## 1. Que dados o servidor guarda

| Dado | Quem escreve | Quem lê |
|---|---|---|
| Menu e opções (preços, produtos retirados e criados, ordem, combos, campanhas) | Gestão | todas as páginas |
| Estado da loja (aberta/fechada, entregas) | Gestão | site, Gestão |
| Esgotados do dia (produtos e extras) | Gestão, Cozinha | site, Vendas |
| Stock do dia | Gestão (manhã), Cozinha e Vendas (baixas), encomendas | site, Vendas, Cozinha, Gestão |
| Encomendas e o seu estado (pago, preparação, visto) | site, Vendas, Cozinha, Gestão | painéis |
| Horas de preparação | site, Vendas | site |
| Códigos promocionais | Gestão | site |
| Comprovativos de transferência | site | painéis |
| Subscrições de notificações dos aparelhos | painéis | servidor |

**Dados pessoais:** nome, telefone, morada e localização dos clientes, e comprovativos bancários.
Devem ter prazo de apagamento definido (RGPD/GDPR e lei cabo-verdiana de protecção de dados).

## 2. Porque mudar

Hoje os dados estão no **Workers KV**. A documentação da Cloudflare recomenda o KV para dados **muito lidos e pouco escritos**,
onde um atraso de alguns segundos a propagar não faz mal: é o caso do menu, do estado da loja e dos esgotados.

Para dados que mudam muitas vezes e ao mesmo tempo — **stock, horas de preparação, encomendas e códigos** — a Cloudflare
recomenda **D1** ou **Durable Objects**. Estes garantem que duas operações simultâneas (por exemplo, dois clientes a comprar
ao mesmo tempo) ficam registadas pela ordem certa, sem se atropelarem. Com o crescimento das encomendas, esta garantia
passa a valer a pena.

O plano gratuito do KV permite 1000 escritas por dia. Cada encomenda faz várias escritas (pedido, stock, hora, estados),
por isso o limite pode ser atingido em dias com muitas encomendas.

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
na consola sem programar, e os relatórios saem com uma consulta. Com o D1:
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
| **0. Preparar** | Cópia completa do KV (`wrangler kv key list` + `get`); criar a base D1 na região Europa Ocidental; testes com o servidor falso de `tests/` | 1 semana | cópia guardada fora da Cloudflare; testes verdes | nada a reverter |
| **1. Escrita em sombra** | O Worker continua a usar o KV, e também grava cada encomenda, stock e hora no D1. Lê-se só do KV | 2 semanas | relatório diário KV vs D1: mesmo n.º de pedidos e mesmo total por dia | desligar a escrita no D1 (1 linha) |
| **2. Códigos e horas no D1** | `/check`, `/redeem`, `/slots`, `/reserve` passam a decidir pelo D1 (atómico); o KV continua a ser actualizado | 1 semana | códigos e horas iguais nos dois sistemas | `FONTE_PROMO=kv` |
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
| Falta de quem mantenha o Worker | média | alto | documentar no repositório privado do Worker; testes automáticos |

### Custos (preços oficiais da Cloudflare, Novembro 2026)

- **Plano gratuito:** provavelmente chega para o volume actual em D1 (100 000 linhas escritas/dia). O limite apertado é o
  do **KV gratuito** (1000 escritas/dia), que a migração alivia.
- **Workers Paid: 5 USD/mês** (≈ 500 ECV), com D1, KV e Durable Objects incluídos muito acima do que a loja usa.
  Recomendado de qualquer forma: quando se passa um limite gratuito, o serviço **pára** até à meia-noite UTC, que são as 23h00 na Praia.
- **Trabalho:** cerca de 3 a 5 dias de programação mais 4 a 6 semanas de acompanhamento. É o custo principal.

### O que decide o dono

1. Confirmar o plano Cloudflare actual (gratuito ou pago) e, se for gratuito, se compensa passar ao pago (5 USD/mês).
2. Rever esta proposta com o código do Worker, no repositório privado.
3. Aceitar o calendário: fases aos domingos, com 2 semanas de sombra antes de mudar a fonte.
4. Definir o prazo de apagamento dos dados pessoais e dos comprovativos (sugestão: o que a contabilista precisar; o resto, 90 dias).

## Fontes

- [Workers KV — How KV works (consistência eventual, 60 s)](https://developers.cloudflare.com/kv/concepts/how-kv-works/)
- [Workers KV — Limits (1 escrita/s por chave; 1000 escritas/dia no gratuito)](https://developers.cloudflare.com/kv/platform/limits/)
- [Workers KV — Pricing](https://developers.cloudflare.com/kv/platform/pricing/)
- [D1 — Pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [D1 — Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Durable Objects — Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) · [Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Escolher o tipo de armazenamento (Cloudflare)](https://developers.cloudflare.com/workers/platform/storage-options/)
