/**
 * The price of one part, and its inline editor (2026-11-17, Eugenio: «que sea un slider para que podamos indicar el
 * precio … que no sea un engorro total, tantos sliders … como un poco más escondido»). No slider is visible until the
 * price is tapped: each line of «De qué está hecho este peso» shows its price as a quiet link; a tap opens, under that
 * line only, a slider and a number box with the range that suits that part, where the estimate comes from, and
 * «Volver al estimado». A price the user set reads «tuyo».
 */
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { Deslizador } from '../controles';
import { eur, type PrecioParte } from './precios';

/** The price on a part's line: a link that opens the editor. «≈» for an estimate, «tuyo» for the user's own. */
export function BotonPrecio({ p, abierto, alPulsar }: { p: PrecioParte; abierto: boolean; alPulsar: () => void }) {
  return (
    <Button variant="ghost" onClick={alPulsar} aria-expanded={abierto}
      title={p.propio ? `Tu precio (estimado: ${eur(p.estimado)}). Pulsa para cambiarlo` : `${p.como}. Pulsa para poner tu precio`}
      className={cn('shrink-0 rounded px-1 py-0 font-mono text-[11px] font-normal normal-case tracking-normal tabular-nums underline decoration-dotted underline-offset-2',
        p.propio ? 'text-sky-800 decoration-sky-400' : 'text-slate-500 decoration-slate-300', abierto && 'bg-slate-100')}>
      {p.propio ? '' : p.origen === 'estimado' ? '≈ ' : ''}{eur(p.eur)}{p.propio && <span className="ml-1 rounded bg-sky-100 px-1 text-[9px] font-semibold uppercase text-sky-800">tuyo</span>}
    </Button>
  );
}

/** The editor, under the line. Changes reach the design after a short pause (each one recalculates the vehicle). */
export function EditorPrecio({ p, alCambiar, alCerrar }: { p: PrecioParte; alCambiar: (v: number | null) => void; alCerrar: () => void }) {
  const [v, setV] = useState(p.eur);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setV(p.eur); }, [p.eur]);
  useEffect(() => () => clearTimeout(t.current), []);
  const poner = (x: number) => {
    const y = Math.max(0, Math.round(x)); setV(y);
    clearTimeout(t.current); t.current = setTimeout(() => alCambiar(y), 250);
  };
  const max = Math.max(p.max, v);
  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-slate-200 bg-white p-2">
      <Deslizador id={`precio-${p.nombre}`} etiqueta={`Precio de ${p.nombre.toLowerCase()}`} valor={v} min={0} max={max} paso={p.paso} mostrar={eur(v)} alCambiar={poner} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-slate-600">
          Escribir
          <input type="number" inputMode="numeric" min={0} step={1} value={v} onChange={e => { const x = Number(e.target.value); if (Number.isFinite(x)) poner(x); }}
            className="w-24 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-right font-mono text-xs" aria-label={`Precio de ${p.nombre} en euros`} />
          €
        </label>
        <span className="flex-1" />
        {p.propio && <Button variant="outline" onClick={() => { clearTimeout(t.current); alCambiar(null); }} className="px-2 py-0.5 text-[10px]">Volver al estimado ({eur(p.estimado)})</Button>}
        <Button variant="ghost" onClick={alCerrar} className="px-2 py-0.5 text-[10px]">Hecho</Button>
      </div>
      <p className="text-[11px] leading-snug text-slate-400">{p.origen === 'catalogo' ? 'Precio publicado' : 'Estimado'} — {p.como.replace(/^(estimado|catálogo): /, '')}. Solo la pieza o el material, sin horas de montaje (esas van en «Mano de obra»).</p>
    </div>
  );
}
