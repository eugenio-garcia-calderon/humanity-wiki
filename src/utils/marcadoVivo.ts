// ============================================================================
// LA NEGRITA SE VE MIENTRAS ESCRIBES (2026-10-02)
// ============================================================================
// Eugenio: «haz que si se colocan dos asteriscos al inicio y dos al final de
// una palabra, esta se ponga en negrita, en cualquier texto de los creadores
// de páginas».
//
// La negrita ya se guardaba y se veía… en los bloques que NO estás editando.
// En el que tiene el cursor, el texto era plano y salían los asteriscos tal
// cual, así que parecía que no funcionaba.
//
// Ahora el bloque activo se pinta con formato según escribes: `**palabra**`
// sale en negrita con los asteriscos en gris claro, como en Typora. El texto
// del bloque SIGUE SIENDO el mismo markdown —los asteriscos están dentro, en
// un `<span>`—, así que `textContent` devuelve exactamente lo de antes y nada
// del guardado cambia. Lo único delicado es el cursor: al repintar se mide
// dónde estaba, en caracteres, y se vuelve a poner ahí.

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 2026-10-06 (#6, #19): las menciones (`[@Ana](/personas/…)`) y las fórmulas
// (`$x^2$`) también se ven mientras se escriben: la mención como una etiqueta
// con su dirección en gris, y la fórmula con el TeX en mono. El texto sigue
// siendo el mismo.
const RE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|(?<![\\$\w])\$(?![\s$])[^$\n]+?(?<![\s\\])\$(?![\d$])|\[@?[^\]\n]+\]\((?:\/personas\/|\/paginas\/|fecha:)[^)\s]+\)|(?<![*\w])\*[^*\s\n][^*\n]*\*(?![*\w]))/g;

/** El HTML del bloque activo: el mismo texto, con el formato a la vista. */
export function marcadoVivo(texto: string): string {
  let out = '';
  let ultimo = 0;
  RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(texto))) {
    out += esc(texto.slice(ultimo, m.index));
    const s = m[0];
    const marca = (x: string) => `<span class="md-marca">${x}</span>`;
    if (s.startsWith('**')) out += `${marca('**')}<strong>${esc(s.slice(2, -2))}</strong>${marca('**')}`;
    else if (s.startsWith('`')) out += `${marca('`')}<code class="md-codigo">${esc(s.slice(1, -1))}</code>${marca('`')}`;
    else if (s.startsWith('$')) out += `${marca('$')}<span class="md-formula">${esc(s.slice(1, -1))}</span>${marca('$')}`;
    else if (s.startsWith('[')) {
      const l = s.match(/^\[([^\]]+)\](\(.*\))$/)!;
      out += `${marca('[')}<span class="md-mencion">${esc(l[1])}</span>${marca(']' + l[2])}`;
    }
    else out += `${marca('*')}<em>${esc(s.slice(1, -1))}</em>${marca('*')}`;
    ultimo = m.index + s.length;
  }
  return out + esc(texto.slice(ultimo));
}

/** Dónde está el cursor dentro de `el`, en caracteres de su texto. */
export function offsetCursor(el: HTMLElement): number | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount || !el.contains(sel.anchorNode)) return null;
  const r = sel.getRangeAt(0).cloneRange();
  r.selectNodeContents(el);
  r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
  return r.toString().length;
}

/** Pone el cursor en el carácter `n` del texto de `el`, crucen o no etiquetas. */
export function ponerCursor(el: HTMLElement, n: number) {
  const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let quedan = n;
  let nodo: Node | null = andador.nextNode();
  let ultimo: Node | null = null;
  while (nodo) {
    const largo = nodo.textContent?.length ?? 0;
    if (quedan <= largo) {
      const r = document.createRange();
      r.setStart(nodo, quedan); r.collapse(true);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
      return;
    }
    quedan -= largo; ultimo = nodo; nodo = andador.nextNode();
  }
  const r = document.createRange();
  if (ultimo) r.setStart(ultimo, ultimo.textContent?.length ?? 0); else r.selectNodeContents(el);
  r.collapse(ultimo ? true : false);
  const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
}

/**
 * Repinta `el` si su formato ha cambiado, sin mover el cursor. Devuelve el
 * HTML aplicado, para no repintar si la próxima vez sale el mismo.
 */
export function repintar(el: HTMLElement, anterior: string | null): string {
  // Con saltos de línea del navegador (`<br>`, `<div>`) no se toca: el
  // repintado se los llevaría por delante.
  if (el.querySelector('br,div,p')) return anterior || '';
  const texto = el.textContent || '';
  const html = marcadoVivo(texto);
  // Sin nada que formatear y sin formato puesto: se deja el DOM del navegador
  // tal cual. Es lo normal al teclear texto corriente y así no se toca nada.
  if (html === anterior || (html === esc(texto) && !el.querySelector('span,strong,em,code'))) return html;
  const cursor = offsetCursor(el);
  el.innerHTML = html;
  if (cursor !== null) ponerCursor(el, cursor);
  return html;
}
