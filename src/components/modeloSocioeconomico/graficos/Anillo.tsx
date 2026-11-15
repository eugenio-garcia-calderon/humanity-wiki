// A ring: one whole split into two to four parts (who brings the cases, who
// uses a service…). Parts are separated by a 2 px surface gap; the legend
// beside it carries every name, value and share, so colour is never the only
// key. Hover or focus a legend row to light that part of the ring.
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Figura, Lectura, RELLENO, TRAZO, useResalte, type Serie } from './comun';

export interface Parte { etiqueta: string; valor: number; texto: string; serie: Exclude<Serie, 'trama'>; nota?: ReactNode }

export function Anillo({ titulo, subtitulo, partes, centro, centroTexto, pie, className, formatoPct = p => `${Math.round(p)} %` }: {
  titulo: string; subtitulo?: ReactNode; partes: Parte[]; centro: string; centroTexto: string; pie?: ReactNode; className?: string; formatoPct?: (p: number) => string;
}) {
  const { activo, marca } = useResalte();
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1;
  const R = 62, C = 2 * Math.PI * R, hueco = 2.5;
  let acum = 0;
  const a = activo !== null ? partes[activo] : null;

  return (
    <Figura titulo={titulo} subtitulo={subtitulo} pie={pie} className={className}>
      <div className="grid items-center gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
        <svg viewBox="0 0 160 160" className="mx-auto h-40 w-40" role="img"
          aria-label={partes.map(p => `${p.etiqueta}: ${p.texto} (${formatoPct((p.valor / total) * 100)})`).join('; ')}>
          {partes.map((p, i) => {
            const largo = (p.valor / total) * C;
            const el = (
              <circle key={p.etiqueta} cx={80} cy={80} r={R} fill="none" strokeWidth={activo === i ? 24 : 20}
                className={cn(TRAZO[p.serie], 'transition-[stroke-width,opacity] duration-150 motion-reduce:transition-none', activo !== null && activo !== i && 'opacity-40')}
                strokeDasharray={`${Math.max(0, largo - hueco)} ${C}`} strokeDashoffset={-acum} transform="rotate(-90 80 80)" />
            );
            acum += largo;
            return el;
          })}
          <text x={80} y={80} textAnchor="middle" className="fill-slate-900 text-[22px] font-[800] tabular-nums">{a ? formatoPct((a.valor / total) * 100) : centro}</text>
          <text x={80} y={100} textAnchor="middle" className="fill-slate-500 text-[11px]">{a ? 'del total' : centroTexto}</text>
        </svg>
        <ul className="space-y-1">
          {partes.map((p, i) => {
            const m = marca(i);
            return (
              <li key={p.etiqueta} {...m} className={cn(m.className, 'flex cursor-default items-start gap-2.5 px-1.5 py-1.5')}>
                <span aria-hidden className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', RELLENO[p.serie])} />
                <span className="min-w-0 text-[13px] leading-snug text-slate-700">
                  <span className="font-semibold tabular-nums text-slate-900">{p.texto}</span>, el {formatoPct((p.valor / total) * 100)}
                  <span className="block">{p.etiqueta}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <Lectura>
        {a ? <><strong className="font-semibold text-slate-900">{a.etiqueta}: {a.texto}.</strong>{a.nota ? <> {a.nota}</> : null}</> : 'Pasa el ratón o el dedo por una parte para resaltarla.'}
      </Lectura>
    </Figura>
  );
}
