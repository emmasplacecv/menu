# /vendas e /cozinha sem internet — verificação (04-11-2026)

Testes: `tests/offline.test.js` (7 testes). Correr: `npm install` e depois `npm test`.

## Funciona (confirmado em teste)

| Situação | Resultado |
|---|---|
| Venda ao balcão sem internet | fica guardada no aparelho; a funcionária vê "📴 Sem internet — guardado neste aparelho" |
| A internet volta | a fila segue sozinha, pela ordem em que foi feita; a venda chega **uma vez** |
| Stock | desce **uma vez** no servidor; sem rede, o aparelho já mostra o stock com as vendas por enviar |
| Várias vendas offline | chegam todas, pela ordem, com o pago/método certos e códigos diferentes |
| Cozinha sem internet ("Começar", "Pronto"…) | fica na fila e chega ao servidor quando a rede volta |
| Abrir as Vendas sem internet | abre (cópia guardada pelo service worker), desde que tenha sido aberta uma vez com rede |
| Resposta do servidor perdida a meio | não duplica: antes de reenviar, o aparelho procura a venda no servidor |

## Melhoria neste PR

Quando a ligação cai a meio de um envio, o aparelho passa a esperar um pouco (90 s) antes de confirmar no servidor
se a venda já lá está, e só depois a reenvia. Assim cada venda fica registada **uma só vez**, com o stock certo.
Para quem trabalha não muda nada: a venda já aparece no ecrã e na cozinha deste aparelho.
O ficheiro passa a `?v=2` nas três páginas, para os aparelhos irem buscar a versão nova.

## Boas práticas para trabalhar sem internet

| Regra | Porquê |
|---|---|
| Deixar a app das Vendas aberta até aparecer "✓ Tudo enviado para o servidor" | a fila segue com a app aberta |
| Não apagar os dados do navegador nem desinstalar a app com vendas por enviar | as vendas por enviar estão guardadas no aparelho |
| Ter os aparelhos em hora automática, no fuso de Cabo Verde | as vendas ficam no dia certo |
| Vender os produtos com pouco stock num só aparelho quando não há internet | os aparelhos só acertam o stock entre si quando voltam a ter rede |
| Ter um telemóvel com dados móveis de reserva | sem internet, os pedidos do site só chegam quando a rede volta |
| Usar uma só janela das Vendas por aparelho | evita envios em paralelo da mesma fila |
| Entrar pela primeira vez num aparelho novo com internet | a primeira entrada precisa de rede |

## Como testar à mão (5 minutos)

1. Abrir `/vendas` com internet e entrar. Fechar e voltar a abrir uma vez.
2. Pôr o telemóvel em **modo avião**. Fazer uma venda de teste com o nome "TESTE". Deve aparecer "📴 Sem internet".
3. Tirar o modo avião. Em menos de um minuto deve aparecer "✓ Tudo enviado para o servidor".
4. Na Gestão: a venda "TESTE" aparece **uma vez** e o stock desceu uma vez. Apagar a venda de teste (o stock volta).
