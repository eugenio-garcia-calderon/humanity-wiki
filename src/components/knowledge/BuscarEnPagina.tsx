import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

// ============================================================================
// BUSCAR EN LA PÁGINA, ⌘F PROPIO (2026-10-06, carril editorB, #29)
// ============================================================================
// El ⌘F del navegador no ve lo que el editor tiene escondido en un desplegable,
// no distingue entre el texto de la página y el de los menús, y se pierde cada
// vez que la página se repinta. Éste busca SÓLO en el contenido de la página,
// sin importar tildes ni mayúsculas, dice «3 de 12», salta al siguiente con
// Intro (anterior con ⇧Intro) y se cierra con Escape.
//
// RESALTA SIN TOCAR EL DOM. Meter `<mark>` en un editor donde el texto vive en
// elementos `contentEditable` que React no controla es pedir que se rompa el
// cursor. La API de resaltado de CSS (`CSS.highlights`) pinta rangos sin
// cambiar ni un nodo. Si el navegador no la tiene, la coincidencia actual se
// selecciona (se ve igual de bien; sólo faltan las demás).
//
// Si la página cambia mientras se busca (se escribe, llega un guardado de otra
// persona), se vuelve a buscar solo.

/** Un carácter, sin tilde y en minúscula, UNO A UNO: así las posiciones de la
 *  búsqueda siguen siendo las del texto original. */
const plano = (s: string) => {
  let o = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const d = c.normalize('NFD')[0] || c;
    o += d.toLowerCase().length === 1 ? d.toLowerCase() : c.toLowerCase().charAt(0);
  }
  return o;
};

const BLOQUE = 'div,p,li,h1,h2,h3,td,th,pre,blockquote,summary,figcaption';

export function buscarRangos(raiz: HTMLElement, consulta: string): Range[] {
  const q = plano(consulta.trim());
  if (!q) return [];
  const nodos: { n: Text; ini: number }[] = [];
  let todo = '';
  let ultimoBloque: Element | null = null;
  const andador = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = andador.nextNode() as Text | null; n; n = andador.nextNode() as Text | null) {
    const p = n.parentElement;
    if (!p || p.closest('script,style,textarea,.katex-mathml,[data-no-buscar]')) continue;
    if (!n.data) continue;
    // Lo que no se ve no cuenta.
    if (!p.getClientRects().length) continue;
    const bloque = p.closest(BLOQUE);
    // Entre un bloque y otro se pone un salto: una coincidencia no cruza
    // de un párrafo a otro.
    if (ultimoBloque && bloque !== ultimoBloque) todo += '\n';
    ultimoBloque = bloque;
    nodos.push({ n, ini: todo.length });
    todo += n.data;
  }
  const t = plano(todo);
  const out: Range[] = [];
  const buscar = (pos: number) => {
    // El nodo que contiene la posición `pos` (búsqueda binaria sencilla).
    let lo = 0, hi = nodos.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (nodos[m].ini <= pos) lo = m; else hi = m - 1; }
    return nodos[lo];
  };
  for (let i = t.indexOf(q); i >= 0 && out.length < 500; i = t.indexOf(q, i + q.length)) {
    const a = buscar(i), b = buscar(i + q.length - 1);
    if (!a || !b) continue;
    const r = document.createRange();
    r.setStart(a.n, i - a.ini);
    r.setEnd(b.n, Math.min(b.n.data.length, i + q.length - b.ini));
    out.push(r);
  }
  return out;
}

const hayResaltado = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof (window as any).Highlight !== 'undefined';

export default function BuscarEnPagina({ raiz, inicial, senal, onCerrar }: {
  raiz: React.RefObject<HTMLElement | null>;
  inicial?: string;
  /** Sube cada vez que se vuelve a pedir (⌘F con la barra ya abierta). */
  senal: number;
  onCerrar: () => void;
}) {
  const [q, setQ] = useState(inicial || '');
  const [total, setTotal] = useState(0);
  const [actual, setActual] = useState(0);
  const rangos = useRef<Range[]>([]);
  const entrada = useRef<HTMLInputElement>(null);
  const indice = useRef(0);

  useEffect(() => { entrada.current?.focus(); entrada.current?.select(); }, [senal]);

  const pintar = useCallback((irA: boolean) => {
    const rs = rangos.current;
    const i = Math.min(indice.current, Math.max(0, rs.length - 1));
    indice.current = i;
    setTotal(rs.length);
    setActual(rs.length ? i + 1 : 0);
    if (hayResaltado()) {
      const H = (window as any).Highlight;
      (CSS as any).highlights.set('busqueda', new H(...rs));
      if (rs[i]) (CSS as any).highlights.set('busqueda-actual', new H(rs[i])); else (CSS as any).highlights.delete('busqueda-actual');
    }
    if (irA && rs[i]) {
      const r = rs[i];
      // Dentro de un `<details>` cerrado (la lectura): se abre.
      let el: Element | null = r.startContainer.parentElement;
      while (el) { if (el.tagName === 'DETAILS') el.setAttribute('open', ''); el = el.parentElement; }
      r.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (!hayResaltado()) { const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); }
    }
  }, []);

  const buscar = useCallback((irA: boolean) => {
    const r = raiz.current;
    rangos.current = r && q.trim() ? buscarRangos(r, q) : [];
    pintar(irA);
  }, [raiz, q, pintar]);

  // Al escribir: se busca desde el principio.
  useEffect(() => { indice.current = 0; buscar(true); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si la página cambia, se vuelve a buscar (sin saltar de sitio).
  useEffect(() => {
    const r = raiz.current;
    if (!r) return;
    let t: any;
    const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => buscar(false), 250); });
    o.observe(r, { childList: true, subtree: true, characterData: true });
    return () => { o.disconnect(); clearTimeout(t); };
  }, [raiz, buscar]);

  // Al cerrar, fuera los resaltados.
  useEffect(() => () => {
    if (hayResaltado()) { (CSS as any).highlights.delete('busqueda'); (CSS as any).highlights.delete('busqueda-actual'); }
  }, []);

  const mover = (d: 1 | -1) => {
    const n = rangos.current.length;
    if (!n) return;
    indice.current = (indice.current + d + n) % n;
    pintar(true);
  };

  return (
    <div data-no-buscar role="search" aria-label="Buscar en la página"
      className="fixed top-16 right-4 sm:right-8 z-[95] flex items-center gap-1 pl-3 pr-1 h-11 rounded-xl bg-white border border-slate-200 shadow-xl">
      <Search className="w-4 h-4 text-slate-400 shrink-0" />
      <input ref={entrada} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en la página…" aria-label="Texto que buscar"
        onKeyDown={e => {
          if (e.key === 'Escape') { e.preventDefault(); onCerrar(); }
          else if (e.key === 'Enter') { e.preventDefault(); mover(e.shiftKey ? -1 : 1); }
        }}
        className="w-40 sm:w-56 h-9 px-2 text-sm text-slate-800 outline-none bg-transparent" />
      <span className="text-xs font-bold text-slate-400 tabular-nums min-w-[3.5rem] text-center" aria-live="polite" data-contador-busqueda>
        {q.trim() ? (total ? `${actual} de ${total}` : 'Sin resultados') : ''}
      </span>
      <button type="button" onClick={() => mover(-1)} disabled={!total} aria-label="Anterior" title="Anterior (⇧Intro)"
        className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
      <button type="button" onClick={() => mover(1)} disabled={!total} aria-label="Siguiente" title="Siguiente (Intro)"
        className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
      <button type="button" onClick={onCerrar} aria-label="Cerrar la búsqueda" title="Cerrar (Esc)"
        className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
    </div>
  );
}
