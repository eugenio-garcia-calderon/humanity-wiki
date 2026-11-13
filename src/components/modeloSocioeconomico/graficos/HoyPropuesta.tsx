// Today next to the proposal: one bar per row on a shared scale, each bar
// split into parts (2 px surface gap between them). Today is grey; the
// proposal wears the page's accent, a second part of it in stripes. The gap
// between the rows is written underneath, so the comparison is a number too.
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Figura, Lectura, RELLENO, useResalte, type Serie } from './comun';

export interface Fila { etiqueta: string; total: string; partes: { valor: number; texto: string; serie: Serie; nombre: string }[] }

export function HoyPropuesta({ titulo, subtitulo, filas, leyenda, diferencia, pie, className }: {
  className?: string; titulo: string; subtitulo?: ReactNode; filas: Fila[]; leyenda: { serie: Serie; texto: string }[]; diferencia?: ReactNode; pie?: ReactNode;
}) {
  const { activo, marca } = useResalte();
  const suma = (f: Fila) => f.partes.reduce((s, p) => s + Math.max(0, p.valor), 0);
  const tope = Math.max(...filas.map(suma)) || 1;
  const a = activo !== null ? filas[activo] : null;

  return (
    <Figura titulo={titulo} subtitulo={subtitulo} pie={pie} leyenda={leyenda} className={className}>
      <ul className="space-y-3">
        {filas.map((f, i) => {
          const m = marca(i);
          return (
            <li key={f.etiqueta} {...m} className={cn(m.className, 'cursor-default px-1 py-1')}>
              <span className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold text-slate-900">{f.etiqueta}</span>
                <span className="font-semibold tabular-nums text-slate-900">{f.total}</span>
              </span>
              <span className="mt-1.5 flex h-5 gap-0.5 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(suma(f) / tope) * 100}%` }}>
                {f.partes.filter(p => p.valor > 0).map((p, k, todas) => (
                  <span key={p.nombre} title={`${p.nombre}: ${p.texto}`}
                    className={cn('h-full min-w-[3px] transition-[flex-grow] duration-300 motion-reduce:transition-none', RELLENO[p.serie], k === todas.length - 1 && 'rounded-r-[4px]')}
                    style={{ flexGrow: p.valor, flexBasis: 0 }} />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      {diferencia && <p className="mt-4 text-[15px] font-semibold text-slate-900">{diferencia}</p>}
      <Lectura>
        {a
          ? <><strong className="font-semibold text-slate-900">{a.etiqueta}:</strong> {a.partes.map(p => `${p.nombre}, ${p.texto}`).join('; ')}.</>
          : 'Pasa el ratón o el dedo por una barra para ver de qué está hecha.'}
      </Lectura>
    </Figura>
  );
}
