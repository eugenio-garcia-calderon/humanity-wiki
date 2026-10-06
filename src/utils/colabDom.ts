// ============================================================================
// EDICIÓN COLABORATIVA: TOCAR EL TEXTO DE UN BLOQUE EN EL DOM (2026-10-06)
// ============================================================================
// El bloque que se está escribiendo es un `contentEditable` cuyo texto es del
// DOM, no de React (ver `BloqueEditable` en `Documento.tsx`): si React lo
// reescribiera, el cursor saltaría al principio. Cuando otra persona escribe
// en ESE bloque, el texto nuevo hay que ponerlo a mano y llevar el cursor (y la
// selección) de quien escribe a donde corresponde: si la otra persona escribe
// delante, el cursor se desplaza con lo escrito; si escribe detrás, se queda.
// No importa `yjs`: el editor lo carga siempre.
// ============================================================================

import { ponerCursor, repintar } from './marcadoVivo';
import { diferencia, indiceTrasDiferencia } from './colabTexto';

/** Offset (en caracteres del texto de `el`) de un punto del DOM. */
function offsetDe(el: HTMLElement, nodo: Node, desp: number): number {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setEnd(nodo, desp);
  return r.toString().length;
}

/** La selección dentro de `el` (ancla y foco), o `null` si no está ahí. */
export function leerSeleccion(el: HTMLElement): { a: number; f: number } | null {
  const s = window.getSelection();
  if (!s || !s.rangeCount || !s.anchorNode || !s.focusNode) return null;
  if (!el.contains(s.anchorNode) || !el.contains(s.focusNode)) return null;
  return { a: offsetDe(el, s.anchorNode, s.anchorOffset), f: offsetDe(el, s.focusNode, s.focusOffset) };
}

function ubicar(el: HTMLElement, n: number): { nodo: Node; desp: number } {
  const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let quedan = n;
  let nodo = andador.nextNode();
  let ultimo: Node | null = null;
  while (nodo) {
    const largo = nodo.textContent?.length ?? 0;
    if (quedan <= largo) return { nodo, desp: quedan };
    quedan -= largo; ultimo = nodo; nodo = andador.nextNode();
  }
  return ultimo ? { nodo: ultimo, desp: ultimo.textContent?.length ?? 0 } : { nodo: el, desp: 0 };
}

export function ponerSeleccion(el: HTMLElement, a: number, f: number) {
  if (a === f) { ponerCursor(el, a); return; }
  const A = ubicar(el, a), F = ubicar(el, f);
  const s = window.getSelection();
  if (!s) return;
  s.removeAllRanges();
  const r = document.createRange();
  r.setStart(A.nodo, A.desp); r.collapse(true);
  s.addRange(r);
  try { s.extend(F.nodo, F.desp); } catch { /* sin selección */ }
}

/**
 * Pone `nuevo` como texto de `el` (el bloque activo) sin que quien escribe
 * pierda el sitio. `cursorFinal` (en el texto NUEVO) manda sobre el
 * desplazamiento: es lo que se usa al deshacer, que lleva el cursor al cambio.
 */
export function parchearBloque(el: HTMLElement, nuevo: string, vivo: boolean, cursorFinal?: number | null) {
  const viejo = el.textContent || '';
  if (viejo === nuevo) return;
  const d = diferencia(viejo, nuevo)!;
  const enfocado = document.activeElement === el;
  const sel = enfocado ? leerSeleccion(el) : null;
  el.textContent = nuevo;
  // Con el formato a la vista (negrita…), como al montar el bloque.
  if (vivo) repintar(el, null);
  if (!enfocado) return;
  if (cursorFinal != null) { ponerCursor(el, Math.min(cursorFinal, nuevo.length)); return; }
  if (sel) ponerSeleccion(el, indiceTrasDiferencia(sel.a, d), indiceTrasDiferencia(sel.f, d));
}

/** Cierto mientras alguien compone con teclas muertas o un IME (á, ñ en
 *  algunos teclados, japonés…): tocar el DOM a mitad de una composición la
 *  rompe, así que lo remoto espera. */
let componiendo = false;
if (typeof document !== 'undefined') {
  document.addEventListener('compositionstart', () => { componiendo = true; }, true);
  document.addEventListener('compositionend', () => { componiendo = false; }, true);
}
export const estaComponiendo = () => componiendo;

/**
 * De un offset en el texto CRUDO (con `**`, `[…](…)`) al offset en el texto
 * que se VE (lo que pinta un bloque que no se está escribiendo). Sirve para
 * poner el cursor de otra persona en su sitio dentro de un bloque que aquí se
 * ve ya con formato. Devuelve también el largo del texto visible, para que
 * quien llama compruebe que coincide con el DOM y, si no, no se invente nada.
 */
export function crudoAVisible(raw: string, idx: number): { visible: number; largo: number } {
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(([^)]+)\))/g;
  let ultimo = 0, vis = 0, res: number | null = null;
  const poner = (r: number) => { if (res === null) res = r; };
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    if (idx < m.index) poner(vis + (idx - ultimo));
    vis += m.index - ultimo;
    const s = m[0];
    let marca = 0, dentro = s;
    if (s.startsWith('**')) { marca = 2; dentro = s.slice(2, -2); }
    else if (s.startsWith('`') || s.startsWith('*')) { marca = 1; dentro = s.slice(1, -1); }
    else { marca = 1; dentro = s.slice(1, s.indexOf('](')); }
    if (idx >= m.index && idx < m.index + s.length) poner(vis + Math.max(0, Math.min(dentro.length, idx - m.index - marca)));
    vis += dentro.length;
    ultimo = m.index + s.length;
  }
  if (idx >= ultimo) poner(vis + (idx - ultimo));
  vis += raw.length - ultimo;
  return { visible: Math.min(res ?? vis, vis), largo: vis };
}

/** Rectángulos (relativos a `contenedor`) de un tramo de texto de `el`. */
export function rectasDeTramo(el: HTMLElement, contenedor: HTMLElement, a: number, f: number): { x: number; y: number; w: number; h: number }[] {
  const ubi = (n: number): { nodo: Node; desp: number } | null => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let quedan = n, nodo = w.nextNode(), ult: Node | null = null;
    while (nodo) {
      const l = nodo.textContent?.length ?? 0;
      if (quedan <= l) return { nodo, desp: quedan };
      quedan -= l; ult = nodo; nodo = w.nextNode();
    }
    return ult ? { nodo: ult, desp: ult.textContent?.length ?? 0 } : null;
  };
  const A = ubi(Math.min(a, f)), F = ubi(Math.max(a, f));
  if (!A || !F) return [];
  const r = document.createRange();
  r.setStart(A.nodo, A.desp); r.setEnd(F.nodo, F.desp);
  const base = contenedor.getBoundingClientRect();
  let rects = [...r.getClientRects()];
  if (!rects.length) {
    // Un cursor sin selección: si el navegador no da rectángulo (línea vacía),
    // se usa el del elemento.
    const e = el.getBoundingClientRect();
    rects = [{ left: e.left, top: e.top, width: 0, height: e.height || 20 } as DOMRect];
  }
  return rects.map(q => ({ x: q.left - base.left, y: q.top - base.top, w: q.width, h: q.height }));
}
