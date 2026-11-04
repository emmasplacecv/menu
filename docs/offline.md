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

## Corrigido neste PR (erro de duplicação)

**Problema:** quando a ligação cai **depois** de o servidor gravar a venda, o aparelho não sabe que ela chegou.
Antes de reenviar, procura-a na lista do servidor. Mas o KV da Cloudflare pode demorar até ~60 s a mostrar
o que acabou de gravar. Se o aparelho procurar cedo demais, não a vê e envia-a outra vez: **venda em duplicado e stock descontado duas vezes**.
O teste "servidor lento a mostrar o que gravou" falha no código antigo e passa no novo.

**Correcção** (`painel-offline.js`): uma venda que já tentou ir e falhou a meio espera **90 s** antes de ser
procurada e reenviada. Quase não muda nada para quem trabalha: a venda já está no ecrã e na cozinha deste aparelho.
O ficheiro passa a `?v=2` nas três páginas, para os aparelhos irem buscar a versão nova.

## Limites que continuam (não se resolvem no aparelho)

| # | Limite | Risco | Como reduzir |
|---|---|---|---|
| O1 | Dois aparelhos sem internet vendem o mesmo último produto: os dois aceitam; o servidor fica com stock 0 mas vendeu 2 | médio | servidor com stock atómico (ver `docs/kv-dados-e-migracao.md`); vender os produtos limitados num só aparelho |
| O2 | Sem internet, **os pedidos do site não chegam** à Cozinha nem às Vendas, e o stock do aparelho não conta as vendas do site | alto em dia de rede fraca | já avisado no ecrã; ter um telemóvel com dados móveis de reserva |
| O3 | A fila só segue **com a app aberta** | médio | não fechar a app das Vendas até aparecer "✓ Tudo enviado" |
| O4 | Apagar os dados do Chrome ou desinstalar a app **apaga a fila por enviar** | alto se acontecer | não limpar dados; o aviso já aparece no ecrã |
| O5 | Datas pela hora do aparelho: um tablet com a data errada grava a venda noutro dia | baixo | aparelhos em hora automática, fuso de Cabo Verde |
| O6 | Duplicados vindos do **site** (não dos painéis): se a resposta de `/order` se perder, o site reenvia com `sendBeacon` | médio | o servidor deve recusar o mesmo código duas vezes (Worker) |
| O7 | Em navegadores sem `navigator.locks` (iPhone/iPad antigos, iOS < 15.4), dois separadores no mesmo aparelho podem enviar a mesma fila ao mesmo tempo | baixo | uma só janela das Vendas aberta por aparelho |
| O8 | A primeira entrada num aparelho novo precisa de internet | baixo | instalar e entrar com rede |

## Como testar à mão (5 minutos)

1. Abrir `/vendas` com internet e entrar. Fechar e voltar a abrir uma vez.
2. Pôr o telemóvel em **modo avião**. Fazer uma venda de teste com o nome "TESTE". Deve aparecer "📴 Sem internet".
3. Tirar o modo avião. Em menos de um minuto deve aparecer "✓ Tudo enviado para o servidor".
4. Na Gestão: a venda "TESTE" aparece **uma vez** e o stock desceu uma vez. Apagar a venda de teste (o stock volta).
