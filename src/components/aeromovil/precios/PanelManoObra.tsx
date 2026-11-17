/**
 * The «Mano de obra» tab (2026-11-17, Eugenio: «incluye la mano de obra como un apartado añadido donde se le puede
 * poner un precio, y ponlo en el menú»). One line per item: hours × €/h = €. A tap on a line opens its two sliders
 * (hours and €/h) and «Volver al estimado»; the rest stays a calm list. The subtotal feeds «Proyecto › Coste».
 */
import { useState } from 'react';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { Bloque, Deslizador } from '../controles';
import type { Parametros } from '../geometria';
import { eur } from './precios';
import { conManoObra, type Ajuste } from './manoObra';
import type { CosteProyecto } from './coste';

export function PanelManoObra({ c, P, set }: { c: CosteProyecto; P: Parametros; set: (k: 'manoObra', v: Parametros['manoObra']) => void }) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const cambiar = (id: string, v: Ajuste | null) => set('manoObra', conManoObra(P, id, v));
  const horas = c.partidas.reduce((a, p) => a + p.h, 0);
  return (
    <>
      <Bloque titulo="Mano de obra" nota={`${Math.round(horas)} h · ${eur(c.manoObra)}`}>
        <p className="text-xs text-slate-500">Las horas para construir un prototipo, por trabajos. Pulsa uno para cambiar sus horas o lo que cuesta la hora; lo que pongas se guarda con el diseño.</p>
        <ul className="flex flex-col divide-y divide-slate-100">
          {c.partidas.map(p => (
            <li key={p.id} className="py-1">
              <Button variant="ghost" onClick={() => setAbierta(a => (a === p.id ? null : p.id))} aria-expanded={abierta === p.id}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-1 py-1 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
                <span className="truncate text-slate-700">{p.nombre}{p.propio && <span className="ml-1.5 rounded bg-sky-100 px-1 text-[9px] font-semibold uppercase text-sky-800">tuyo</span>}</span>
                <span className="font-mono text-xs tabular-nums text-slate-800">{eur(p.eur)}</span>
                <span className={cn('col-span-2 font-mono text-[11px] tabular-nums', p.propio ? 'text-sky-800' : 'text-slate-400')}>{Math.round(p.h)} h × {eur(p.eurh)}/h</span>
              </Button>
              {abierta === p.id && (
                <div className="mt-1 flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-2">
                  <Deslizador id={`mo-h-${p.id}`} etiqueta="Horas" valor={p.h} min={0} max={Math.max(10, Math.ceil(p.hEst * 3 / 5) * 5, p.h)} paso={1} mostrar={`${Math.round(p.h)} h`} alCambiar={v => cambiar(p.id, { h: v })} />
                  <Deslizador id={`mo-e-${p.id}`} etiqueta="Precio de la hora" valor={p.eurh} min={0} max={Math.max(120, p.eurh)} paso={1} mostrar={`${eur(p.eurh)}/h`} alCambiar={v => cambiar(p.id, { eurh: v })} />
                  <p className="text-[11px] leading-snug text-slate-400">{p.que}. Estimado: {Math.round(p.hEst)} h a {eur(p.eurhEst)}/h.</p>
                  <div className="flex justify-end gap-2">
                    {p.propio && <Button variant="outline" onClick={() => cambiar(p.id, null)} className="px-2 py-0.5 text-[10px]">Volver al estimado ({eur(p.hEst * p.eurhEst)})</Button>}
                    <Button variant="ghost" onClick={() => setAbierta(null)} className="px-2 py-0.5 text-[10px]">Hecho</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between border-t border-slate-300 pt-1.5 text-[13px]">
          <span className="font-semibold text-slate-800">Subtotal mano de obra</span>
          <span className="font-mono text-sm font-bold tabular-nums text-slate-900">{eur(c.manoObra)}</span>
        </div>
      </Bloque>
      <Bloque titulo="Con los materiales" nota={eur(c.total)}>
        <div className="flex flex-col gap-0.5 text-[13px]">
          <div className="flex justify-between"><span className="text-slate-600">Materiales y piezas</span><span className="font-mono text-xs tabular-nums">{eur(c.materiales)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Mano de obra</span><span className="font-mono text-xs tabular-nums">{eur(c.manoObra)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><span>Total del prototipo</span><span className="font-mono text-sm tabular-nums text-teal-800">{eur(c.total)}</span></div>
        </div>
        <p className="text-xs text-slate-500">Son estimaciones para un taller pequeño en España, no presupuestos: para tener cifras de verdad hay que pedirlas (Proyecto › Pendiente). El reparto completo está en «Proyecto».</p>
      </Bloque>
    </>
  );
}
