import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import type { Parametros } from './geometria';
import { COLORES_ACENTO, COLORES_CARROCERIA, coloresDe, nombreColor, type ColorNombrado } from './coloresCarroceria';

/**
 * The body's colour (2026-11-13, Eugenio: «permite también cambiar el color de la carrocería»), in every vehicle's
 * «Carrocería»: a row of named swatches and a free colour picker, for the paint and for the accent. It writes
 * `colorCarroceria` and `colorAcento`, which the design saves; the 3D only recolours its materials.
 */
export function ColoresCarroceria({ P, set }: { P: Parametros; set: <K extends keyof Parametros>(k: K, v: Parametros[K]) => void }) {
  const c = coloresDe(P);
  return (
    <div className="flex flex-col gap-3">
      <Fila id="color-carroceria" etiqueta="Pintura" lista={COLORES_CARROCERIA} valor={c.carroceria} alCambiar={v => set('colorCarroceria', v)} />
      <Fila id="color-acento" etiqueta="Detalles (morro, faldón, carenados, montantes)" lista={COLORES_ACENTO} valor={c.acento} alCambiar={v => set('colorAcento', v)} />
      <p className="text-xs text-slate-500">Solo cambia el color: la pintura sigue con su grano y su barniz, y la forma, el peso y el Cd no cambian. Se guarda con el diseño.</p>
    </div>
  );
}

function Fila({ id, etiqueta, lista, valor, alCambiar }: { id: string; etiqueta: string; lista: ColorNombrado[]; valor: string; alCambiar: (v: string) => void }) {
  const nombre = nombreColor(lista, valor) ?? 'a medida';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[13px] text-slate-700">
        <label htmlFor={id}>{etiqueta}</label>
        <span className="font-mono text-xs text-slate-500">{nombre}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={etiqueta}>
        {lista.map(o => {
          const elegido = o.hex.toLowerCase() === valor;
          return (
            <Button key={o.k} type="button" variant="outline" title={o.n} aria-label={o.n} aria-pressed={elegido} onClick={() => alCambiar(o.hex.toLowerCase())}
              className={cn('h-7 w-7 rounded-full border-slate-300 p-0 shadow-inner', elegido && 'ring-2 ring-teal-700 ring-offset-2')}
              style={{ backgroundColor: o.hex }} />
          );
        })}
        <input id={id} type="color" value={valor} onChange={e => alCambiar(e.target.value.toLowerCase())} title="Otro color" aria-label={`${etiqueta}: otro color`}
          className="h-7 w-10 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5" />
      </div>
    </div>
  );
}
