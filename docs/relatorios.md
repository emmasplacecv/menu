# Relatórios mensais — `emmasplace.cv/relatorios`

Página interna (não aparece no Google), só de leitura: nunca muda pedidos, stock nem preços.
Entra com a **chave da Gestão**. Se já entrou na Gestão neste aparelho, não pede outra vez.

## Como usar (todos os meses, no dia 1 ou 2)

1. Abrir `emmasplace.cv/relatorios` no computador ou no telemóvel da Gestão.
2. Escolher o mês e tocar em **Ver o mês**. Esperar que leia todos os dias.
3. Se aparecer "Sem resposta do servidor nestes dias", voltar a carregar antes de enviar.
4. Descarregar:

| Ficheiro | Para quem | Conteúdo |
|---|---|---|
| `vendas-AAAA-MM.csv` | contabilista | um pedido por linha: data, hora, código, origem (balcão/website), modo, estado, forma de pagamento, total, artigos; total do mês no fim. **Sem nome, telefone nem morada** |
| `resumo-diario-AAAA-MM.csv` | contabilista | por dia: n.º de pedidos, balcão, website, total, e por forma de pagamento |
| `produto-hora-AAAA-MM.csv` | dono | quantidade e valor por produto, com uma coluna por hora do dia |
| `copia-pedidos-AAAA-MM.json` | dono (guardar) | **cópia de segurança** de todos os pedidos, com os dados dos clientes |

Os ficheiros CSV abrem no Excel com os acentos certos (separador `;`).
Os **comprovativos** (fotos/PDF) continuam na Gestão > Histórico > «Guardar cópia completa» (ZIP).

## Regras de contagem

- **Cancelados** aparecem no CSV com o estado "Cancelado", mas não contam nos totais.
- **Dia** = o dia em que o pedido está guardado no servidor. Encomendas feitas fora de horas ficam no dia do levantamento.
- **Hora** = a hora em que o pedido foi feito. Nas vendas feitas sem internet, a hora real em que foram feitas.
- **Valor por produto** = preço do produto antes dos descontos do pedido. Os descontos estão no total de cada pedido,
  por isso a soma por produto pode ser maior do que o total vendido.
- **Pagamento:** website = transferência (ou "no balcão" para o Espresso a levantar); balcão = dinheiro, Vinti4 (POS),
  transferência, dividido ou "por cobrar".
- Se o servidor já não tiver um dia, usa-se a cópia que a Gestão guardou **neste aparelho** (até 70 dias) e isso fica avisado.

## O que decide o dono

- **IVA:** o relatório mostra valores com tudo incluído, tal como o cliente pagou. Não separa o IVA (taxa normal de 15%
  em Cabo Verde) nem emite factura. A contabilista confirma como quer os dados.
- **Onde guardar a cópia JSON:** tem dados pessoais. Sugestão: uma pasta privada no Google Drive, um ficheiro por mês.
- **Quanto tempo o servidor guarda os pedidos:** não sei (falta o código do Worker). Por isso a cópia deve ser feita **todos os meses**.
