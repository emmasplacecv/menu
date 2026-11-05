# Página /sobre/ — como editar e reverter

Ficheiro: `sobre/index.html`. Usa o mesmo estilo das páginas do Google (`/locais/estilo.css`).
Português e inglês estão **na mesma página**: o botão PT/EN no topo troca a língua (e lembra-a para o site).

## Como editar os textos (no GitHub, sem programar)

1. Abrir `sobre/index.html` no GitHub e carregar no lápis (editar).
2. Cada texto aparece **duas vezes**: uma com `data-l="pt"` (português) e outra com `data-l="en"` (inglês). Mudar as duas.
   Exemplo:
   ```html
   <p data-l="pt">Uma cafetaria móvel no Plateau…</p>
   <p data-l="en">A mobile café in Plateau…</p>
   ```
3. Ingredientes de uma bebida: cada etiqueta é um `<span class="i-…">`. As cores: `i-cafe` café, `i-leite` leite,
   `i-gelo` gelo, `i-xarope` xarope/caramelo, `i-choc` chocolate, `i-matcha` matcha, `i-coco` coco, `i-agua` água.
4. Quando uma receita estiver confirmada, trocar "Composição habitual" pela frase certa e pôr `class="ok"` no `<small>`
   (fica a verde). Lista do que falta confirmar: `docs/confirmar-sobre.md`.
5. Fundadores: trocar os textos entre [ ] e apagar `por-preencher` da classe do bloco já preenchido.
   Para a foto, trocar o bloco `<div class="por-preencher foto-vazia">…</div>` por
   `<img src="/img/fundadores.webp" alt="Fundadores da Emma's Place" style="width:100%;border-radius:14px">`.
6. Se quiser publicar a página antes de ter a história: apagar a secção inteira entre
   `<!-- ============ FUNDADORES` e o `</section>` seguinte.
7. "Commit changes". O site actualiza em cerca de 1 minuto (depois de o PR estar integrado).
8. Antes de integrar, correr `npm test`: o teste confirma que as bebidas da página são as do menu e que nada desliza para o lado.

## Como reverter

- Fechar o PR ou, depois do merge, botão "Revert".
- Só tirar a ligação da página principal: no `index.html`, apagar ` · <a href="/sobre/">Sobre nós</a>` no rodapé.
