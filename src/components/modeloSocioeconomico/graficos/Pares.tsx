// Paired bars: two series side by side for each category (here, Spain and
// the OECD average). The series the chart is about is ink; the comparison is
// grey. Legend always shown (two series), values written at each tip.
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Figura, Lectura, RELLENO, useResalte, type Serie } from './comun';

export interface Par { etiqueta: string; a: number; b: number; nota?: ReactNode; formato?: (v: number) => string }

export function Pares({ titulo, subtitulo, series, pares, pie, formato: general = v => String(v), porFila = false, colores = ['tinta', 'gris'], className }: {
  titulo: string; subtitulo?: ReactNode; series: [string, string]; pares: Par[]; pie?: ReactNode; formato?: (v: number) => string;
  /** Each row on its own scale (rows in different units): say so in `subtitulo`. */
  porFila?: boolean; colores?: [Serie, Serie]; className?: string;
}) {
  const { activo, marca } = useResalte();
  const topeComun = Math.max(...pares.flatMap(p => [p.a, p.b])) / 0.82 || 1;
  const tope = (p: Par) => (porFila ? Math.max(p.a, p.b) / 0.82 || 1 : topeComun);
  const pct = (p: Par, v: number) => `${(Math.max(0, v) / tope(p)) * 100}%`;
  const fmt = (p: Par) => p.formato ?? general;
  const a = activo !== null ? pares[activo] : null;
  const dif = (p: Par) => {
    const d = p.a - p.b;
    return d === 0 ? 'lo mismo' : `${d > 0 ? '+' : '−'}${fmt(p)(Math.abs(d))}`;
  };

  return (
    <Figura titulo={titulo} subtitulo={subtitulo} pie={pie} className={className}
      leyenda={[{ serie: colores[0], texto: series[0] }, { serie: colores[1], texto: series[1] }]}>
      <ul className="space-y-1">
        {pares.map((p, i) => {
          const m = marca(i);
          return (
            <li key={p.etiqueta} {...m} className={cn(m.className, 'grid cursor-default gap-x-3 gap-y-1 px-1 py-1.5 sm:grid-cols-[minmax(0,7rem)_minmax(0,1fr)] sm:items-center')}>
              <span className="text-[13px] font-semibold leading-tight text-slate-900">{p.etiqueta}</span>
              <span className="grid gap-0.5">
                {([[colores[0], p.a, series[0]], [colores[1], p.b, series[1]]] as const).map(([serie, v, nombre], k) => (
                  <span key={k} className="flex items-center gap-2">
                    <span className={cn('h-3 shrink rounded-r-[4px]', RELLENO[serie])} style={{ width: pct(p, v) }} />
                    <span className="shrink-0 text-[12px] tabular-nums text-slate-700"><span className="font-semibold text-slate-900">{fmt(p)(v)}</span><span className="sr-only"> {nombre}</span></span>
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      <Lectura>
        {a
          ? <><strong className="font-semibold text-slate-900">{a.etiqueta}:</strong> {series[0]} {fmt(a)(a.a)}, {series[1]} {fmt(a)(a.b)} ({dif(a)}).{a.nota ? <> {a.nota}</> : null}</>
          : 'Pasa el ratón o el dedo por una fila para ver la diferencia.'}
      </Lectura>
    </Figura>
  );
}
