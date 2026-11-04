# Velocidade no telemóvel e informação para o Google — página principal (04-11-2026)

## O que mudou (sem mudar o aspecto)

| Mudança | Porquê |
|---|---|
| Letras do Google pedidas por `<link>` no início, com `preconnect` (antes: `@import` dentro do CSS) | o telemóvel pede as letras mais cedo; as letras são as mesmas |
| Microsoft Clarity descarregado só depois de a página carregar | não disputa a rede nem o processador com o menu; os eventos ficam em fila e seguem na mesma |
| `fetchpriority="high"` na foto da capa; `fetchpriority="low"` nas fotos que já eram "lazy" | a capa chega primeiro |
| Sombras das estantes: medir todas e só depois marcar | menos trabalho do processador ao abrir |
| Formatador da data de Cabo Verde criado uma vez | era criado em cada chamada |
| `canonical`, `og:url`, `og:image`, `og:site_name`, `og:locale`, `twitter:card` | endereço oficial para o Google; pré-visualização com imagem no WhatsApp e no Facebook |
| Dados estruturados do café: `@id`, `url`, `sameAs` (Instagram), `hasMap`, `currenciesAccepted`, `areaServed` (Praia) | só informação que já está no site |

**Prova de que o aspecto não mudou:** captura da página inteira em telemóvel (412 px), com o relógio parado, antes e
depois das mudanças: os dois ficheiros PNG são **idênticos byte a byte**.

## Medições (telemóvel simulado: CPU 4× mais lenta, rede 4G lenta 1,6 Mbit/s, 150 ms)

| | Antes | Depois |
|---|---|---|
| Primeiro conteúdo no ecrã (FCP) | 948 ms | 948 ms |
| Maior conteúdo no ecrã (LCP) | 4772 ms | ~4710 ms |
| Trabalho do processador ao abrir ("marcar" estantes) | 160 ms | < 10 ms |

**Ganho honesto: pequeno.** As medições foram feitas num servidor local sem compressão, e o Clarity estava bloqueado
nos dois casos (por isso o ganho dele não aparece aqui). No telemóvel real, o ganho do Clarity e das letras deve ser maior,
mas não o consegui medir: não tenho acesso ao site publicado a partir daqui.

## O que realmente pesa (precisa de decisão — mexe no código do design)

1. **`index.html` com 411 KB** (125 KB comprimido): textos em 5 línguas, menu e todo o programa num só ficheiro.
   O menu só aparece depois de o ficheiro inteiro chegar. Separar as línguas e o programa em ficheiros próprios pode
   poupar 1 a 2 s em rede fraca. Risco médio.
2. **~600 KB de fotos ao abrir:** as 4 fotos da capa (as 3 escondidas descarregam logo) e as fotos das estantes.
   Carregar as capas 2–4 só depois de a página abrir poupa ~100 KB no arranque. Risco baixo a médio (mexe no carrossel).
3. **Ficheiros repetidos na raiz** (`capa-2.webp`, `pao.jpg`, …): não pesam no site, mas confundem. Atenção: `logo.jpg`
   passa a ser usado na pré-visualização (`og:image`) e não deve ser apagado.

## Sugestões para o Google que não fiz (decisão do dono)

- Registar o site na **Google Search Console** e na ficha do **Google Business Profile**, com a mesma morada e o mesmo horário.
- Telefone nos dados estruturados: não acrescentei. O site diz "encomendas só pelo site", e o número do WhatsApp
  só aparece depois da encomenda.
