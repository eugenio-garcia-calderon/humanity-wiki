// Horizontal bars, one series: magnitude by category, with an optional
// reference line (an average to compare against). One bar can be the point
// (`serie: 'tinta'`); the rest stay grey as context.
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Figura, Lectura, RELLENO, useResalte, type Serie } from './comun';

export interface Barra { etiqueta: string; valor: number; texto: string; serie?: Serie; nota?: ReactNode }

export function Barras({ titulo, subtitulo, barras, referencia, pie, className, ayuda = 'Pasa el ratón o el dedo por una barra para leerla.' }: {
  className?: string; titulo: string; subtitulo?: ReactNode; barras: Barra[]; referencia?: { valor: number; texto: string }; pie?: ReactNode; ayuda?: string;
}) {
  const { activo, marca } = useResalte();
  // Leave a fifth of the row for the value written at the bar's tip.
  const tope = Math.max(...barras.map(b => b.valor), referencia?.valor ?? 0) / 0.8 || 1;
  const pct = (v: number) => `${(Math.max(0, v) / tope) * 100}%`;
  const a = activo !== null ? barras[activo] : null;

  return (
    <Figura titulo={titulo} subtitulo={subtitulo} pie={pie} className={className}>
      <ul className="space-y-1">
        {barras.map((b, i) => {
          const m = marca(i);
          return (
            <li key={b.etiqueta} {...m} className={cn(m.className, 'grid cursor-default gap-x-3 gap-y-1 px-1 py-1.5 sm:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] sm:items-center')}>
              <span className={cn('text-[13px] leading-tight', b.serie === 'tinta' ? 'font-semibold text-slate-900' : 'text-slate-700')}>{b.etiqueta}</span>
              <span className="relative flex items-center gap-2">
                <span className={cn('h-4 shrink rounded-r-[4px]', RELLENO[b.serie ?? 'gris'])} style={{ width: pct(b.valor) }} />
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">{b.texto}</span>
                {referencia && (
                  <span aria-hidden className="pointer-events-none absolute -bottom-1.5 -top-1.5 w-px bg-slate-500" style={{ left: pct(referencia.valor) }} />
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {referencia && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-slate-600 sm:pl-[10.5rem]">
          <span aria-hidden className="h-3 w-px bg-slate-500" />{referencia.texto}
        </p>
      )}
      <Lectura>
        {a ? <><strong className="font-semibold text-slate-900">{a.etiqueta}: {a.texto}.</strong>{a.nota ? <> {a.nota}</> : null}</> : ayuda}
      </Lectura>
    </Figura>
  );
}
