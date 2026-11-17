// The «Proyecto» tab of the Triciclo family and the Basculante (2026-11-17, Eugenio: «en PROYECTO lo dejas despejado
// como una lista de cosas pendientes, y también una revisión de los puntos críticos a mejorar que no están OK»).
// Two lists: what is still to do on this design, and every check that is not OK (red or amber), grouped by the
// department that fixes it, each with a button that opens that tab. The masses moved to «Masas»; the performance,
// the boot and the rollover stay in their own tabs (Motor, Energía, Interior, Rodaje). All the checks, folded, last.
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/core';
import type { Comprobacion } from './geometria';
import { Bloque, ListaComprobaciones } from './controles';
import type { Pendiente } from './triciclo/pendientes';

const NOMBRES: Record<string, string> = { carroceria: 'Carrocería', interior: 'Interior', chasis: 'Chasis', rodaje: 'Rodaje', propulsion: 'Motor', energia: 'Energía', masas: 'Masas', homologacion: 'Homologación' };
/** The tab a check is fixed in: the first department it names (the checks list «dep» as «a,b»). */
const depDe = (c: Comprobacion) => (c.dep ?? 'carroceria').split(',')[0];

export function PanelProyecto({ checks, pendientes, alIr }: { checks: Comprobacion[]; pendientes: Pendiente[]; alIr: (dep: string) => void }) {
  const [todas, setTodas] = useState(false);
  const rojas = checks.filter(c => c.holgura < 0), justas = checks.filter(c => c.holgura >= 0 && c.holgura < c.minimo);
  const grupos = [...new Set([...rojas, ...justas].map(depDe))].sort((a, b) => Object.keys(NOMBRES).indexOf(a) - Object.keys(NOMBRES).indexOf(b));
  return (
    <>
      <Bloque titulo="Pendiente" nota={`${pendientes.length} cosas`}>
        {pendientes.length ? (
          <ol className="flex flex-col gap-2 text-[13px]">
            {pendientes.map((p, i) => (
              <li key={p.titulo} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                <span className="mt-0.5 rounded-full bg-slate-100 px-1.5 font-mono text-[11px] text-slate-500">{i + 1}</span>
                <span><span className="font-medium text-slate-800">{p.titulo}</span><span className="block text-xs text-slate-500">{p.porQue}</span></span>
                <Button variant="outline" onClick={() => alIr(p.dep)} className="px-2 py-0.5 text-[11px]" title={`Abrir ${NOMBRES[p.dep] ?? p.dep}`}>{NOMBRES[p.dep] ?? p.dep}<ArrowRight className="ml-1 h-3 w-3" /></Button>
              </li>
            ))}
          </ol>
        ) : <p className="text-xs text-slate-500">Nada pendiente en este diseño.</p>}
      </Bloque>

      <Bloque titulo="Revisión de puntos críticos" nota={rojas.length + justas.length ? `${rojas.length} mal · ${justas.length} justos` : 'todo OK'}>
        {grupos.length ? grupos.map(g => {
          const lista = [...rojas, ...justas].filter(c => depDe(c) === g);
          return (
            <div key={g} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-0.5">
                <span className="text-[13px] font-semibold text-slate-800">{NOMBRES[g] ?? g} <span className="font-normal text-slate-400">({lista.length})</span></span>
                <Button variant="ghost" onClick={() => alIr(g)} className="px-1.5 py-0.5 text-[11px] text-sky-700">Arreglar en {NOMBRES[g] ?? g}<ArrowRight className="ml-1 h-3 w-3" /></Button>
              </div>
              <ListaComprobaciones lista={lista} />
            </div>
          );
        }) : <p className="text-xs text-emerald-700">Todas las comprobaciones de este diseño están bien.</p>}
        <p className="text-xs text-slate-500">En rojo, lo que no cabe o no cumple (cuánto le falta); en ámbar, lo que cumple por poco. Cada grupo es el departamento donde se arregla: el botón lo abre. Las cifras son estimaciones de un primer diseño.</p>
      </Bloque>

      <Bloque titulo="Todas las comprobaciones" nota={`${checks.length}`} plegable={{ abierto: todas, alAlternar: () => setTodas(v => !v) }}>
        <ListaComprobaciones lista={checks} />
      </Bloque>
    </>
  );
}
