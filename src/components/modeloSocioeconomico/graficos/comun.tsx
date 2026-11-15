// Shared frame for the charts of the «Modelo» page (graficos/*). Built in
// plain HTML so text wraps and measures itself at 390 px; every value a hover
// reveals is also written on the chart, so hovering only adds emphasis.
//
// Marks follow one spec across all charts: bars at most 16 px thick, 4 px
// rounded at the data end and square at the baseline, a 2 px surface gap
// between touching segments, one ink (slate) plus a single accent. Colours:
//   claro    slate-200       the remainder of a whole (always labelled: below 3:1 on white)
//   gris     slate-400       context / today
//   tinta    slate-800       the series the chart is about
//   acento   emerald-600     this model's proposal (as everywhere on the page)
//   trama    emerald stripes a second part of the proposal (texture, not a new hue)
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type Serie = 'claro' | 'gris' | 'tinta' | 'acento' | 'trama';
export const RELLENO: Record<Serie, string> = {
  claro: 'bg-slate-200',
  gris: 'bg-slate-400',
  tinta: 'bg-slate-800',
  acento: 'bg-emerald-600',
  trama: 'bg-[repeating-linear-gradient(135deg,var(--color-emerald-600)_0_3px,var(--color-emerald-200)_3px_6px)]',
};

/** The same colours as SVG strokes and fills (rings and lines). */
export const TRAZO: Record<Exclude<Serie, 'trama'>, string> = {
  claro: 'stroke-slate-200', gris: 'stroke-slate-400', tinta: 'stroke-slate-800', acento: 'stroke-emerald-600',
};
export const PUNTO: Record<Exclude<Serie, 'trama'>, string> = {
  claro: 'fill-slate-200', gris: 'fill-slate-400', tinta: 'fill-slate-800', acento: 'fill-emerald-600',
};

/** Width in CSS pixels of an element, kept up to date, so SVG charts draw at 1:1 and their text stays 12-13 px. */
export function useAncho<T extends HTMLElement>(inicial = 600) {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

/** A figure: title, one line of what it shows, the chart, an optional legend and a source line. */
export function Figura({ titulo, subtitulo, leyenda, pie, children, className }: {
  titulo: string; subtitulo?: ReactNode; leyenda?: { serie: Serie; texto: string }[]; pie?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <figure data-grafico className={cn('min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.04] sm:p-6', className)}>
      <figcaption>
        <p className="text-base font-bold leading-snug text-slate-900">{titulo}</p>
        {subtitulo && <p className="mt-1 text-sm leading-snug text-slate-600">{subtitulo}</p>}
      </figcaption>
      {leyenda && leyenda.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-700">
          {leyenda.map(l => (
            <li key={l.texto} className="flex items-center gap-1.5">
              <span aria-hidden className={cn('h-2.5 w-4 rounded-[3px]', RELLENO[l.serie])} />{l.texto}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5">{children}</div>
      {pie && <p className="mt-4 text-xs leading-relaxed text-slate-500">{pie}</p>}
    </figure>
  );
}

/**
 * Which row is under the pointer or the keyboard focus. `marca(i)` gives a row
 * its handlers and a dim class for the rows that are not the active one.
 */
export function useResalte() {
  const [activo, setActivo] = useState<number | null>(null);
  const marca = (i: number) => ({
    tabIndex: 0,
    onMouseEnter: () => setActivo(i),
    onMouseLeave: () => setActivo(null),
    onFocus: () => setActivo(i),
    onBlur: () => setActivo(null),
    onClick: () => setActivo(a => (a === i ? null : i)),
    className: cn(
      'rounded-lg outline-none transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 motion-reduce:transition-none',
      activo !== null && activo !== i && 'opacity-40',
    ),
  });
  return { activo, marca };
}

/** The line under a chart that reads out the active row (or says how to get one). */
export function Lectura({ children }: { children: ReactNode }) {
  return (
    <p aria-live="polite" className="mt-4 min-h-[2.5rem] border-t border-slate-100 pt-3 text-[13px] leading-snug text-slate-600">
      {children}
    </p>
  );
}
