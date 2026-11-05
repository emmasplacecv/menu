# CLAUDE.md — Emma's Place (site do menu e painéis)

Guia para quem trabalha neste repositório: pessoas ou assistentes de IA.
O dono do projecto não programa. Explique tudo em português de Portugal, com frases curtas.

## O que é

Site estático do café/pastelaria **Emma's Place** (Plateau, Av. Amílcar Cabral, frente BAI/IMPAR, Praia, Cabo Verde),
publicado com **GitHub Pages** no domínio `emmasplace.cv` (ficheiro `CNAME`).
Não há passo de compilação: o que está no ramo `main` é o que o site mostra, cerca de 1 minuto depois.

| Caminho | Para quê | Quem usa |
|---|---|---|
| `index.html` | Menu público, carrinho, checkout, códigos promocionais, pagamento por transferência, comprovativo | Clientes |
| `admin/` | **Gestão**: pedidos, stock da manhã, menu e preços, combos, campanhas, histórico com cópia em ZIP | Dono / gerência |
| `vendas/` | **Vendas ao balcão** (POS): até 10 clientes abertos, cobrança (dinheiro, Vinti4, transferência, dividido), fecho do dia | Balcão |
| `cozinha/` | **Cozinha**: fila de pedidos, estados (a preparar → pronto → entregue), alarme, stock −1, "acabou" | Cozinha |
| `painel-offline.js` | Faz Vendas, Cozinha e Gestão continuarem a trabalhar **sem internet** (cópias + fila em IndexedDB) | Os três painéis |
| `*/sw*.js`, `*/manifest-*.json` | Service workers: app instalável, notificações, página guardada para abrir sem rede | Os três painéis |
| `pdf/` | Gera o menu em PDF no momento (jsPDF + letras Jost/Playfair) | Clientes |
| `img/`, `img/p/` | Fotos (capas, categorias, produtos em WebP) | — |
| Ficheiros soltos na raiz (`capa-2.webp`, `pao.jpg`, …) | Cópias antigas; o site actual usa `img/` | — |

### Servidor (Cloudflare Worker) — repositório privado

Tudo o que é dinâmico (menu do dia, stock, horários, pedidos, comprovativos, notificações) passa pelo Worker
`https://wispy-cherry-ee2e.joaomleal88.workers.dev` (constante `PROMO_API` / `API` nas páginas).
O código do Worker e a sua documentação (pontos de acesso, armazenamento, medições) estão num **repositório privado**.
Alterações que precisem do servidor fazem-se e revêem-se lá; aqui só se muda o lado das páginas.

## Regras de trabalho (obrigatórias)

1. **Nunca trabalhar directamente no `main`.** Um ramo e um pull request por assunto. Não fazer merge sem o dono aprovar.
2. **Não mudar preços, textos comerciais nem o design** sem pedido explícito. Os preços vivem em dois sítios:
   no código (valores de reserva) e no servidor (Gestão > Menu, que manda). Mudar um sem o outro cria diferenças.
3. **Produtos, combos e regras repetidos em vários ficheiros** (o código diz "mudar nos quatro sítios"):
   `index.html`, `vendas/index.html`, `cozinha/index.html`, `admin/index.html`. Ao mudar um, procurar nos outros.
4. **Segredos**: a chave dos painéis é escrita pela pessoa e fica só no aparelho (`localStorage`).
   Nunca escrever chaves, tokens ou palavras-passe no código, nos commits, nos PR ou nos testes.
   Os NIB/contas bancárias que o site mostra são públicos de propósito (para o cliente transferir).
5. **Dados de clientes** (nome, telefone, morada, notas) vêm da internet: ao mostrar em HTML, **escapar sempre**
   (`hEsc` na Gestão, `esc` na Cozinha e nas Vendas). Não montar HTML com texto do cliente sem passar por essas funções.
6. **Hora de Cabo Verde** = UTC−1. O site usa `agoraCV()`/`diaCV()`; os painéis usam a hora do aparelho
   (os aparelhos da loja têm de estar na hora de Cabo Verde).
7. Ao mudar um service worker (`sw.js`, `sw-vendas.js`), **subir o número de `VERSAO`**; senão os aparelhos ficam com a cópia antiga.
8. Comentários e textos em português, no estilo do ficheiro (datas `dd-mm-aaaa` no comentário quando se muda uma regra).
9. Normas e referências técnicas: europeias (EN/IEC, RGPD/GDPR para dados pessoais).

## Regras de negócio (resumo — confirmar sempre no código)

- Horário: Seg–Sex 08h00–17h00 · Sáb 09h00–15h00 · Domingo fechado (`HORARIO` no site e `HORARIO_GES` na Gestão).
- Janela de pedidos: levantamento a partir de 30 min depois de abrir até 15 min antes de fechar; entrega 90 min / 60 min (`JANELA`).
- Entrega: taxa da zona (`ZONAS`, 200–700 ECV; sem zona 225); grátis com subtotal líquido **acima** de 750 ECV,
  excepto zonas ≥ 350 ECV sem hora marcada; zonas ≥ 350 só com hora marcada; taxa de serviço 5% nas entregas;
  sobretaxa de andar 50 (1.º–3.º), 100 (4.º+), 150 (4.º+ sem elevador).
- Descontos do site: 5% para levantar com hora marcada (não se aplica a combos, ao açaí nem aos milkshakes em campanha);
  açaí −7,9% ("8%") por copo; campanhas do açaí e dos milkshakes ligadas na Gestão.
  **Não acumulam com o código promocional**: fica o maior (empate → fica o código).
- Combos: soma das partes −5%, arredondado para baixo aos 5 ECV.
- Espresso: não vai para entrega; só Espresso a levantar paga no balcão; o resto paga por transferência antes de preparar (prazo 15 min).
- Códigos de pedido: `PED-ddmm-XXX` (site) e `BAL-ddmm-XXX` (balcão).

## Como testar

- Testes automáticos (quando existirem na pasta `tests/`): `npm install` e depois `npm test`.
  Usam um navegador sem ecrã (Playwright) e um **servidor falso**: nunca tocam no Worker verdadeiro.
- À mão: abrir o site no telemóvel em modo privado; nos painéis, usar o modo avião para testar o funcionamento sem internet.

## Publicação

GitHub Pages publica o ramo `main` (pasta raiz). O `_config.yml` impede que ficheiros internos
(`CLAUDE.md`, `ROADMAP.md`, `docs/`, `tests/`, `package.json`) apareçam no site.
O repositório é público: **tudo o que está aqui pode ser lido por qualquer pessoa**.
