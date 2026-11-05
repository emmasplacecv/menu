# ROADMAP — Emma's Place

Estado em 05-11-2026. Prioridade: **P0** = mais importante · **P1** = importante · **P2** = melhoria.
Cada linha diz quem decide ou quem faz: **Dono** = decisão do negócio · **Worker** = precisa do código do servidor.

## Já preparado (pull requests abertos, à espera de aprovação)

| Área | Pull request | Estado |
|---|---|---|
| 1. Documentação (este ficheiro e `CLAUDE.md`) | ramo `claude/hopeful-hypatia-gzxhed` | por aprovar |
| 2. Painéis e encomendas | ramo `claude/seguranca-paineis` | **integrado** |
| Dados no KV e migração para D1 (análise, nada executado) | `docs/kv-dados-e-migracao.md` neste PR | por decidir |
| 3. Testes de preços, descontos, taxas, códigos, stock e horários | ramo `claude/testes-precos` | por aprovar |
| 4. Funcionamento sem internet (/vendas e /cozinha) | ramo `claude/offline-vendas-cozinha` | por aprovar |
| 5. Exportação mensal CSV, cópia de segurança e relatório | ramo `claude/relatorios-mensais` | por aprovar |
| 6. Velocidade no telemóvel e informação para o Google | ramo `claude/velocidade-seo` | por aprovar |
| 7. Página "Cafés gelados" (pesquisa local) | ramo `claude/pagina-cafes-gelados` | por aprovar |
| 8. Pedido «feito» só quando o servidor aceita; aviso de stock em falta | ramo `claude/pedido-aceite-stockfalta` | rascunho |
| 9. Páginas para o Google: açaí, café, cafés gelados | ramo `claude/google-paginas-locais` | rascunho |
| 10. Textos para o Perfil no Google | ramo `claude/perfil-google` | rascunho |
| 11. Imagens mais leves | ramo `claude/velocidade-imagens` | rascunho |
| 12. Ligações no rodapé (sobre o 9) | ramo `claude/rodape-paginas-locais` | rascunho |
| 13. Documento de segurança neutro | ramo `claude/seguranca-doc-neutro` | rascunho |
| 14. Medição do funil (sobre o 12) | ramo `claude/medicao-funil` | rascunho |

## P0 — fazer primeiro

1. **Validação das encomendas no servidor** (Worker, no repositório privado): o servidor confirma os preços e o total
   de cada encomenda com o menu. A Gestão já mostra o aviso «Confirmar valores». → *Worker*
2. **Encomendas sem repetição** (Worker): uma segunda encomenda com o mesmo código `PED-…`/`BAL-…` no mesmo dia
   é tratada como a mesma (idempotência). Útil quando a rede cai a meio de um envio. → *Worker*
3. **Stock, horários e pedidos em D1:** migração faseada, com reversão, descrita em `docs/kv-dados-e-migracao.md`. → *Dono + Worker*

## P1

4. Códigos promocionais tratados no mesmo passo em que a encomenda fica registada. → *Worker*
5. Combos não descontam o stock no site (o componente só se sabe no balcão). Decidir: descontar o componente mais provável
   ou pedir a escolha ao cliente. → *Dono*
6. Retenção dos pedidos no servidor: confirmar quantos dias o Worker guarda. A cópia mensal (PR 5) deve ser feita **todos os meses**. → *Dono*
7. Revisão periódica do servidor e das chaves dos painéis (trocar quando alguém sai da equipa ou se perde um aparelho). → *Dono + Worker*
8. Repositório público: qualquer pessoa lê o código e a documentação. Manter aqui só documentação neutra; os pormenores
   do servidor ficam no repositório privado do Worker. → *Dono*
9. RGPD/GDPR e lei cabo-verdiana de protecção de dados (Lei n.º 133/V/2001, revista pela Lei n.º 41/VIII/2013):
   há nomes, telefones e moradas de clientes guardados no servidor e nos aparelhos; o Microsoft Clarity grava sessões.
   Falta uma página de privacidade publicada (existe um rascunho no ramo `melhorias-20-pontos`, nunca integrado). → *Dono*

## P2

10. Ficheiros de imagem repetidos na raiz (`capa-2.webp`, `pao.jpg`, …): confirmar que nada os usa e apagar (excepto `logo.jpg`, usado na pré-visualização das partilhas).
11. Unificar o menu num só ficheiro de dados lido pelas quatro páginas (hoje está copiado em quatro sítios).
12. Ramos antigos por limpar: `New`, `backup-2026-10-21-antes-v4`, `balcao-*`, `stock-acai-19-out`, `menu-fotos-21-out`,
    `ref-fotos-tmp`, `melhorias-20-pontos`, `claude/acai-8-banner-tropical`. Confirmar e apagar os que já não servem.
13. `LEIA-ME.txt` desactualizado (fala de `assets/`, que já não existe).
14. Testes automáticos a correr sozinhos em cada pull request (GitHub Actions).

## Pressupostos usados nesta revisão

- O código do servidor (Worker) está num repositório privado. O que aqui se diz sobre o servidor vem do que as páginas enviam e recebem.
- Os aparelhos da loja estão na hora de Cabo Verde (UTC−1).
- Os preços correctos são os do servidor (Gestão > Menu). Os do código são de reserva.
- O site é publicado pelo GitHub Pages a partir do `main`, pasta raiz.
