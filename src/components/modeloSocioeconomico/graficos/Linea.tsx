// A line over time: one series, dated points (years need not be evenly
// spaced: the x axis is proportional to time, so a gap in the data reads as a
// gap). Drawn in SVG at the container's real width, so text stays 12-13 px at
// any size. Every point gets its value written where there is room (first,
// last and highest always); the rest are in the reading line on hover/focus
// and in the accessible list.
import { useState, type ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Figura, Lectura, PUNTO, TRAZO, useAncho, type Serie } from './comun';

export interface Punto { x: number; y: number; etiqueta?: string; nota?: ReactNode }

export function Linea({ titulo, subtitulo, puntos, formato, desde, hasta, serie = 'tinta', pie, className, referencia, alto = 220, ayuda = 'Pasa el ratón o el dedo por la línea, o recórrela con el tabulador, para leer cada punto.' }: {
  titulo: string; subtitulo?: ReactNode; puntos: Punto[]; formato: (v: number) => string;
  /** Bottom of the y axis (say it in `subtitulo` or `pie` when it is not zero). */
  desde?: number; hasta?: number; serie?: Exclude<Serie, 'trama' | 'claro'>; pie?: ReactNode; className?: string;
  /** A level to compare against (a legal limit, an average), drawn as a hairline with its label. */
  referencia?: { valor: number; texto: string }; alto?: number; ayuda?: string;
}) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);
  const H = alto, m = { l: 12, r: 16, t: 28, b: 26 };
  const xs = puntos.map(p => p.x), ys = puntos.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = desde ?? Math.min(0, ...ys), y1 = hasta ?? Math.max(...ys) * 1.08;
  // Leave room for the end labels: half a label's width inside each edge.
  const pad = 22;
  const x = (v: number) => m.l + pad + ((v - x0) / (x1 - x0 || 1)) * (W - m.l - m.r - 2 * pad);
  const y = (v: number) => H - m.b - ((v - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);
  const iMax = ys.indexOf(Math.max(...ys));
  const a = activo !== null ? puntos[activo] : null;
  /** Whether the active point's label would sit on top of point i's (same side, too close). */
  const tapa = (i: number, hueco: number, valor: boolean) =>
    activo !== null && i !== activo && (!valor || abajo[i] === abajo[activo]) && Math.abs(x(puntos[i].x) - x(puntos[activo].x)) < hueco;
  // Hit areas: each point owns the band halfway to its neighbours.
  const corte = (i: number) => (i === 0 ? 0 : (x(puntos[i - 1].x) + x(puntos[i].x)) / 2);
  // A value label goes below its point when the point dips under its neighbours (and there is
  // room above the axis), above otherwise: peaks and troughs then never fight for the same line.
  const abajo = puntos.map((p, i) => {
    const vecinos = [puntos[i - 1], puntos[i + 1]].filter(Boolean).map(q => q.y);
    const media = vecinos.reduce((t, v) => t + v, 0) / (vecinos.length || 1);
    return p.y < media && y(p.y) + 20 < y(y0) - 4;
  });
  // Keep labels at least `hueco` px apart (only against labels on the same side): the must-have
  // ones first (first, last, highest), then every other point that fits, left to right.
  const espaciar = (hueco: number, obligados: number[], lado?: boolean[]) => {
    const dentro = new Set<number>();
    const cabe = (i: number) => [...dentro].every(k => (lado && lado[k] !== lado[i]) || Math.abs(x(puntos[k].x) - x(puntos[i].x)) >= hueco);
    obligados.forEach(i => { if (dentro.size === 0 || cabe(i)) dentro.add(i); });
    puntos.forEach((_, i) => { if (!dentro.has(i) && cabe(i)) dentro.add(i); });
    return dentro;
  };
  const ticks = espaciar(40, [puntos.length - 1, 0]);
  const valores = espaciar(52, [iMax, puntos.length - 1, 0], abajo);

  return (
    <Figura titulo={titulo} subtitulo={subtitulo} pie={pie} className={className}>
      <div ref={ref} className="w-full">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full overflow-visible"
          role="img" aria-label={puntos.map(p => `${p.etiqueta ?? p.x}: ${formato(p.y)}`).join('; ')}
          onMouseLeave={() => setActivo(null)}>
          <line x1={m.l} x2={W - m.r} y1={y(y0)} y2={y(y0)} className="stroke-slate-200" />
          {referencia && (
            <g aria-hidden>
              <line x1={m.l} x2={W - m.r} y1={y(referencia.valor)} y2={y(referencia.valor)} className="stroke-slate-400" />
            </g>
          )}
          {activo !== null && <line x1={x(puntos[activo].x)} x2={x(puntos[activo].x)} y1={m.t - 6} y2={y(y0)} className="stroke-slate-300" />}
          <polyline points={puntos.map(p => `${x(p.x)},${y(p.y)}`).join(' ')} fill="none" className={TRAZO[serie]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {puntos.map((p, i) => (
            <g key={p.x}>
              <circle cx={x(p.x)} cy={y(p.y)} r={i === activo ? 6 : 4.5} className={cn(PUNTO[serie], 'stroke-white')} strokeWidth={2} />
              {((valores.has(i) && !tapa(i, 52, true)) || i === activo) && (
                <text x={x(p.x)} y={abajo[i] ? y(p.y) + 20 : y(p.y) - 11} textAnchor="middle" className="fill-slate-900 text-[13px] font-semibold tabular-nums">{formato(p.y)}</text>
              )}
              {((ticks.has(i) && !tapa(i, 40, false)) || i === activo) && (
                <text x={x(p.x)} y={H - 7} textAnchor="middle" className={cn('text-[12px] tabular-nums', i === activo ? 'fill-slate-900 font-semibold' : 'fill-slate-500')}>{p.etiqueta ?? p.x}</text>
              )}
              <rect x={corte(i)} y={0} width={(i === puntos.length - 1 ? W : (x(p.x) + x(puntos[i + 1].x)) / 2) - corte(i)} height={H}
                fill="transparent" tabIndex={0} aria-label={`${p.etiqueta ?? p.x}: ${formato(p.y)}`}
                className="cursor-crosshair outline-none focus-visible:stroke-slate-900 focus-visible:stroke-2"
                onMouseEnter={() => setActivo(i)} onFocus={() => setActivo(i)} onBlur={() => setActivo(null)} onClick={() => setActivo(i)} />
            </g>
          ))}
        </svg>
      </div>
      {referencia && (
        <p className="mt-1 flex items-center gap-2 text-[12px] text-slate-600">
          <span aria-hidden className="h-px w-5 bg-slate-400" />{referencia.texto}
        </p>
      )}
      <Lectura>
        {a ? <><strong className="font-semibold text-slate-900">{a.etiqueta ?? a.x}: {formato(a.y)}.</strong>{a.nota ? <> {a.nota}</> : null}</> : ayuda}
      </Lectura>
    </Figura>
  );
}
