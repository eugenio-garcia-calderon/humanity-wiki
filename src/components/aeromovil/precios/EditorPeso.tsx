/**
 * The weight of one part, and its inline editor (2026-11-24, Eugenio: «en la parte de qué está hecho este peso, donde
 * aparece el precio que se puede modificar, también permite modificar el peso en kilogramos con un slider»). As the
 * price's (`EditorPrecio.tsx`): the weight on a line is a quiet link; a tap opens, under that line, a slider and a number
 * box, and «Volver al estimado». A weight the user set reads «tuyo». It is stored in the design (`P.pesos`, by the
 * part's name) and everything that adds up masses reads it: the totals, the centre of gravity, the checks.
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { Deslizador, fmt } from '../controles';

/** A copy of the design's own weights with one part's set (null: back to the estimate). */
export function conPeso(propios: Record<string, number> | undefined, nombre: string, v: number | null): Record<string, number> | undefined {
  const o = { ...(propios ?? {}) };
  if (v == null) delete o[nombre]; else o[nombre] = Math.max(0.001, v);
  return Object.keys(o).length ? o : undefined;
}

const kg = (v: number) => `${fmt(v, v < 1 ? 2 : 1)} kg`;

/** What the editor needs of a part: its weight now, the model's estimate, whether the weight is the user's. */
export interface PesoParte { nombre: string; kg: number; estimado: number; propio: boolean }

/** The weight on a part's line: a link that opens the editor. */
export function BotonPeso({ p, abierto, alPulsar }: { p: PesoParte; abierto: boolean; alPulsar: () => void }) {
  return (
    <Button variant="ghost" onClick={alPulsar} aria-expanded={abierto}
      title={p.propio ? `Tu peso (estimado: ${kg(p.estimado)}). Pulsa para cambiarlo` : 'Estimación del modelo. Pulsa para poner tu peso'}
      className={cn('shrink-0 rounded px-1 py-0 font-mono text-xs font-normal normal-case tracking-normal tabular-nums underline decoration-dotted underline-offset-2',
        p.propio ? 'text-sky-800 decoration-sky-400' : 'text-slate-700 decoration-slate-300', abierto && 'bg-slate-100')}>
      {kg(p.kg)}{p.propio && <span className="ml-1 rounded bg-sky-100 px-1 text-[9px] font-semibold uppercase text-sky-800">tuyo</span>}
    </Button>
  );
}

/** The editor, under the line. Changes reach the design after a short pause (each one recalculates the vehicle). */
export function EditorPeso({ p, alCambiar, alCerrar }: { p: PesoParte; alCambiar: (v: number | null) => void; alCerrar: () => void }) {
  const [v, setV] = useState(p.kg);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setV(p.kg); }, [p.kg]);
  useEffect(() => () => clearTimeout(t.current), []);
  const paso = p.estimado < 3 ? 0.01 : p.estimado < 30 ? 0.1 : 0.5;
  const poner = (x: number) => {
    const y = Math.max(paso, Math.round(x / paso) * paso); setV(y);
    clearTimeout(t.current); t.current = setTimeout(() => alCambiar(Math.round(y * 1000) / 1000), 250);
  };
  const min = Math.max(paso, Math.round(p.estimado * 0.1 / paso) * paso), max = Math.max(Math.ceil(p.estimado * 3 / paso) * paso, v);
  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-slate-200 bg-white p-2">
      <Deslizador id={`peso-${p.nombre}`} etiqueta={`Peso de ${p.nombre.toLowerCase()}`} valor={Math.max(min, v)} min={min} max={max} paso={paso} mostrar={kg(v)} alCambiar={poner} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-slate-600">
          Escribir
          <input type="number" inputMode="decimal" min={paso} step={paso} value={Number(v.toFixed(3))} onChange={e => { const x = Number(e.target.value); if (Number.isFinite(x) && x > 0) poner(x); }}
            className="w-24 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-mono text-xs" aria-label={`Peso de ${p.nombre} en kilogramos`} />
          kg
        </label>
        <span className="flex-1" />
        {p.propio && <Button variant="outline" onClick={() => { clearTimeout(t.current); alCambiar(null); }} className="px-2 py-0.5 text-[10px]">Volver al estimado ({kg(p.estimado)})</Button>}
        <Button variant="ghost" onClick={alCerrar} className="px-2 py-0.5 text-[10px]">Hecho</Button>
      </div>
      <p className="text-[11px] leading-snug text-slate-400">Tu peso sustituye a la estimación en el peso total, el centro de gravedad y las comprobaciones. Si el precio de esta pieza es estimado por kilo, también cambia.</p>
    </div>
  );
}
