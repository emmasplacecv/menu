# Segurança — boas práticas do Emma's Place

Este documento explica, em linguagem simples, como o site e os painéis devem ser usados com segurança.
Não descreve pormenores técnicos de protecção: o repositório é público.

## Como o site está organizado

- **Site público** (`emmasplace.cv`): menu, encomendas e páginas de produtos. Qualquer pessoa pode abrir.
- **Painéis internos** (Gestão, Vendas, Cozinha e Relatórios): só para a equipa, com chave de acesso. Não aparecem no Google.
- **Servidor** (Cloudflare): guarda os pedidos, o stock e o menu. O código do servidor não está neste repositório.

## O que a equipa deve fazer

| Regra | Porquê |
|---|---|
| Não partilhar a chave dos painéis por mensagem, foto ou papel visível | quem tem a chave pode mexer em pedidos e no menu |
| Trocar a chave quando alguém sai da equipa ou um aparelho se perde | a chave fica guardada no aparelho |
| Carregar em "Sair" nos aparelhos partilhados | apaga a chave desse aparelho |
| Usar os aparelhos da loja só para trabalho e com o sistema actualizado | menos risco de programas indesejados |
| Confirmar na Gestão o valor de cada pedido antes de aceitar o comprovativo | o aviso «Confirmar valores» ajuda nessa verificação |
| Não guardar cópias de pedidos (com dados de clientes) em sítios públicos | são dados pessoais |

## Dados pessoais

Os pedidos têm nome, telefone e morada dos clientes. Devem ser usados só para preparar e entregar o pedido.
Guardar as cópias mensais (página Relatórios) num sítio privado e apagar o que já não for preciso.

## Alterações ao código

- Cada alteração passa por um pull request, com testes automáticos (`npm test`), antes de chegar ao site.
- Os dados escritos pelos clientes são sempre mostrados como texto nos painéis.
- Nunca escrever chaves, palavras-passe ou códigos promocionais no código, nos commits ou nos pull requests.

## Encontrou um problema de segurança?

Não o descreva numa issue pública nem num comentário. Fale directamente com o dono do projecto.

## Nota sobre versões anteriores deste documento

Este ficheiro substitui uma versão anterior mais técnica. **A versão anterior continua acessível no histórico do Git
e no pull request #2**: apagar um ficheiro não o retira do histórico de um repositório público.
Para o retirar de vez seria preciso reescrever o histórico do repositório e pedir ao GitHub que limpe as cópias guardadas.
Isso tem riscos (cópias e ramos antigos deixam de bater certo) e não foi feito.
