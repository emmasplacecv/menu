# ROADMAP — Emma's Place

Estado em 04-11-2026. Prioridade: **P0** = risco de perder dinheiro ou dados · **P1** = importante · **P2** = melhoria.
Cada linha diz quem decide ou quem faz: **Dono** = decisão do negócio · **Worker** = precisa do código do servidor.

## Já preparado (pull requests abertos, à espera de aprovação)

| Área | Pull request | Estado |
|---|---|---|
| 1. Documentação (este ficheiro e `CLAUDE.md`) | ramo `claude/hopeful-hypatia-gzxhed` | por aprovar |
| 2. Segurança dos painéis e das encomendas | ramo `claude/seguranca-paineis` | por aprovar |
| Dados no KV e migração para D1 (análise, nada executado) | `docs/kv-dados-e-migracao.md` neste PR | por decidir |
| 3. Testes de preços, descontos, taxas, códigos, stock e horários | ramo `claude/testes-precos` | por aprovar |
| 4. Funcionamento sem internet (/vendas e /cozinha) | ramo `claude/offline-vendas-cozinha` | por aprovar |
| 5. Exportação mensal CSV, cópia de segurança e relatório | ramo `claude/relatorios-mensais` | por aprovar |
| 6. Velocidade no telemóvel e informação para o Google | ramo `claude/velocidade-seo` | por aprovar |
| 7. Página "Cafés gelados" (pesquisa local) | ramo `claude/pagina-cafes-gelados` | por aprovar |

## P0 — fazer primeiro

1. **O servidor tem de recalcular o preço de cada encomenda** (Worker). Hoje o total, os preços das linhas
   e os descontos são calculados no telemóvel do cliente e o servidor guarda-os tal como chegam.
   Uma pessoa com conhecimentos técnicos pode enviar uma encomenda com preço errado.
   O PR de segurança acrescenta um **aviso na Gestão** quando os preços não batem com o menu, mas a correcção
   definitiva é no Worker. → *Worker*
2. **Juntar o código do Worker a este repositório** (pasta `worker/`, sem segredos), para poder ser revisto e testado. → *Dono*
3. **Trocar a chave dos painéis** depois de aprovar o PR de segurança. Até agora, um nome de cliente com código
   escondido podia correr dentro da Gestão e ler a chave guardada. Não há sinais de que isso tenha acontecido,
   mas não há forma de o confirmar sem os registos do Worker. → *Dono*
4. **Encomenda repetida pelo mesmo código** (Worker): o servidor deve recusar uma segunda encomenda com o mesmo
   código `PED-…`/`BAL-…` no mesmo dia (idempotência). Protege contra envios repetidos quando a rede cai a meio. → *Worker*

4b. **Stock, horas, códigos e encomendas no KV não aguentam dois clientes ao mesmo tempo** (vende-se o que não há,
   encomendas podem perder-se). Proposta de migração faseada para D1 em `docs/kv-dados-e-migracao.md`. → *Dono + Worker*

## P1

5. Código promocional gasto antes de a encomenda ficar registada: se o registo falhar, o cliente perde o código.
   O servidor deve gastar o código no mesmo passo em que regista a encomenda. → *Worker*
6. Combos não descontam o stock no site (o componente só se sabe no balcão). Decidir: descontar o componente mais provável
   ou pedir a escolha ao cliente. → *Dono*
7. Retenção dos pedidos no servidor: confirmar quantos dias o Worker guarda. A cópia mensal (PR 5) deve ser feita **todos os meses**. → *Dono*
8. Chave dos painéis no endereço (`?key=`): fica nos registos da Cloudflare. Passar para um cabeçalho `Authorization`
   e confirmar que a chave de cada painel só abre o que precisa (as Vendas não precisam de mexer em preços). → *Worker*
9. Comprovativos (`POST /comprovativo`): limitar tamanho e tipo de ficheiro no servidor. → *Worker*
10. Repositório público: qualquer pessoa lê o código e a documentação. Avaliar repositório privado
    (o GitHub Pages em repositório privado exige plano pago). → *Dono*
11. RGPD/GDPR e lei cabo-verdiana de protecção de dados (Lei n.º 133/V/2001, revista pela Lei n.º 41/VIII/2013):
    há nomes, telefones e moradas de clientes guardados no servidor e nos aparelhos; o Microsoft Clarity grava sessões.
    Falta uma página de privacidade publicada (existe um rascunho no ramo `melhorias-20-pontos`, nunca integrado). → *Dono*

## P2

12. Ficheiros de imagem repetidos na raiz (`capa-2.webp`, `pao.jpg`, …): confirmar que nada os usa e apagar.
13. Unificar o menu num só ficheiro de dados lido pelas quatro páginas (hoje está copiado em quatro sítios).
14. Ramos antigos por limpar: `New`, `backup-2026-10-21-antes-v4`, `balcao-*`, `stock-acai-19-out`, `menu-fotos-21-out`,
    `ref-fotos-tmp`, `melhorias-20-pontos`, `claude/acai-8-banner-tropical`. Confirmar e apagar os que já não servem.
15. `LEIA-ME.txt` desactualizado (fala de `assets/`, que já não existe).
16. Testes automáticos a correr sozinhos em cada pull request (GitHub Actions).

## Pressupostos usados nesta revisão

- Não tive acesso ao Worker nem aos seus registos. Tudo o que digo sobre o servidor foi deduzido das páginas.
- Os aparelhos da loja estão na hora de Cabo Verde (UTC−1).
- Os preços correctos são os do servidor (Gestão > Menu). Os do código são de reserva.
- O site é publicado pelo GitHub Pages a partir do `main`, pasta raiz.
