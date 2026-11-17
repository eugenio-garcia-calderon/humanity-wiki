// Shared panel controls of the Aeromóvil editor: slider, selector, collapsible block, explanation popup, checks list, number formats.
// Moved out of pages/Aeromovil.tsx unchanged (2026-11-16, refactor «ordenar»). See ./CLAUDE.md for the layout.
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import type { Comprobacion, Parametros } from './geometria';
import { explicacion } from './explicaciones';
import { BotonNotas, PanelNotas } from './notas/NotasSeccion';

export const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
export const m2 = (v: number) => `${fmt(v)} m`;

/**
 * Deslizador compacto (2026-11-07, Eugenio: «más compacto para que quepan más
 * parámetros en menos espacio»). Con `centro` (el valor del diseño por
 * defecto), el recorrido se recoloca para que ese valor quede en el punto
 * medio: así se ve de un vistazo si un parámetro se ha movido y hacia dónde.
 * El recorrido conserva su anchura mientras cabe dentro de los límites
 * físicos; si no cabe, se estrecha de forma simétrica (y nunca por debajo de
 * un tercio).
 */
/**
 * El cuadro que se abre al pinchar en el nombre de un parámetro (2026-11-07,
 * Eugenio): qué es, por qué importa, y qué se gana y se pierde subiéndolo o
 * bajándolo. El texto viene de `explicaciones/` (lo escriben bots).
 */
export function Explicacion({ clave, alCerrar }: { clave: keyof Parametros; alCerrar: () => void }) {
  const e = explicacion(clave);
  return (
    <div className="col-span-2 mt-1 rounded-lg border border-teal-200 bg-teal-50/60 p-2.5 text-[12.5px] text-slate-700">
      {!e ? <p className="text-slate-500">La explicación de este parámetro la está escribiendo un bot; en cuanto termine aparecerá aquí.</p> : (<>
        <p className="leading-relaxed"><span className="font-semibold text-slate-900">{e.nombre}.</span> {e.queEs}</p>
        <p className="mt-1.5 whitespace-pre-line leading-relaxed">{e.porQueImporta}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {([['Más alto', e.masAlto], ['Más bajo', e.masBajo]] as const).map(([t, m]) => (
            <div key={t} className="rounded-md border border-slate-200 bg-white p-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t}</div>
              <ul className="mt-1 space-y-0.5">{m.ventajas.map((v, i) => <li key={'v' + i} className="text-emerald-800">+ {v}</li>)}{m.desventajas.map((v, i) => <li key={'d' + i} className="text-red-800">− {v}</li>)}</ul>
            </div>
          ))}
        </div>
        {e.referencias.length > 0 && <p className="mt-2 text-[11.5px] text-slate-600"><span className="font-semibold">Referencias:</span> {e.referencias.join(' · ')}</p>}
        {e.comprobaciones?.length ? <p className="mt-1 text-[11.5px] text-slate-600"><span className="font-semibold">Comprobaciones que se resienten:</span> {e.comprobaciones.join(' · ')}</p> : null}
      </>)}
      <div className="mt-1.5 text-right"><button type="button" onClick={alCerrar} className="text-[11px] text-teal-800 hover:underline">cerrar</button></div>
    </div>
  );
}

/**
 * Deslizador (2026-11-07, Eugenio: «no tan compactos» y «al pinchar en el
 * nombre que se abra un cuadro que explique el parámetro»). Con `centro` (el
 * valor del diseño por defecto), el recorrido se recoloca para que ese valor
 * quede en el punto medio: así se ve de un vistazo si un parámetro se ha
 * movido y hacia dónde. El recorrido conserva su anchura mientras cabe dentro
 * de los límites físicos; si no cabe, se estrecha de forma simétrica (nunca
 * por debajo de un tercio).
 */
export function Deslizador({ id, etiqueta, valor, min, max, paso, mostrar, alCambiar, desactivado, centro, clave }: {
  id: string; etiqueta: string; valor: number; min: number; max: number; paso: number; mostrar: string; alCambiar: (v: number) => void; desactivado?: boolean; centro?: number; clave?: keyof Parametros;
}) {
  const [abierto, setAbierto] = useState(false);
  let lo = min, hi = max;
  if (centro != null && Number.isFinite(centro)) {
    const span = max - min, mitad = span / 2;
    lo = centro - mitad; hi = centro + mitad;
    if (lo < min) { lo = min; hi = centro + (centro - min); }
    if (hi > max) { hi = max; lo = centro - (max - centro); }
    if (hi - lo < span / 3) { lo = Math.max(min, centro - span / 6); hi = Math.min(max, lo + span / 3); lo = Math.max(min, hi - span / 3); }
  }
  const fuera = valor < lo || valor > hi;
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-0.5', desactivado && 'opacity-60')}>
      {clave
        ? <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} className={cn('truncate text-left text-[13px] text-slate-700 underline decoration-dotted decoration-slate-300 underline-offset-2 hover:text-teal-800', abierto && 'text-teal-800')} title="Pincha para saber más de este parámetro">{etiqueta}</button>
        : <label htmlFor={id} className="truncate text-[13px] text-slate-700" title={etiqueta}>{etiqueta}</label>}
      <output htmlFor={id} className={cn('font-mono text-xs tabular-nums', fuera ? 'text-amber-700' : 'text-slate-900')}>{mostrar}</output>
      <input id={id} type="range" min={fuera ? Math.min(lo, valor) : lo} max={fuera ? Math.max(hi, valor) : hi} step={paso} value={valor} disabled={desactivado}
        onChange={e => alCambiar(Number(e.target.value))} className="col-span-2 w-full accent-teal-700" />
      {abierto && clave && <Explicacion clave={clave} alCerrar={() => setAbierto(false)} />}
    </div>
  );
}

export function Bloque({ titulo, nota, children, plegable, id, peso }: {
  titulo: string; nota?: string; children: React.ReactNode;
  /** (2026-11-17) the section's weight, «8,4 kg» (`textoPesoSeccion`, masasSecciones.ts); absent or null: no weight */
  peso?: string | null;
  /** (2026-11-15) an accordion: folded, only its title shows, and a click opens or closes it */
  plegable?: { abierto: boolean; alAlternar: () => void };
  id?: string;
}) {
  // (2026-11-17) every section takes notes: an icon in the header (notas/NotasSeccion.tsx), the list under it
  const [notas, setNotas] = useState(false);
  const botonNotas = <BotonNotas seccion={titulo} abierto={notas} alAlternar={() => setNotas(a => !a)} />;
  if (plegable) return (
    <section id={id} className={cn('flex flex-col rounded-xl border bg-white', plegable.abierto ? 'gap-2.5 border-slate-300 p-3.5 pt-1.5' : 'border-slate-200 p-1.5', notas && !plegable.abierto && 'gap-1.5')}>
      <div className="-mx-1 flex w-[calc(100%+0.5rem)] items-center">
      <Button variant="ghost" onClick={plegable.alAlternar} aria-expanded={plegable.abierto}
        className="min-w-0 flex-1 justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50">
        <span>{titulo}</span>
        <span className="flex items-center gap-2">{peso && <PesoCabecera texto={peso} />}{nota && <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-slate-400">{nota}</span>}<ChevronDown className={cn('h-4 w-4 transition-transform', plegable.abierto && 'rotate-180')} /></span>
      </Button>
      {botonNotas}
      </div>
      {notas && <PanelNotas seccion={titulo} />}
      {plegable.abierto && children}
    </section>
  );
  return (
    <section id={id} className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5">
      <h3 className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {titulo}<span className="flex items-center gap-2">{peso && <PesoCabecera texto={peso} />}{nota && <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-slate-400">{nota}</span>}<span className="-my-1 -mr-1.5">{botonNotas}</span></span>
      </h3>
      {notas && <PanelNotas seccion={titulo} />}
      {children}
    </section>
  );
}

/** A section's weight in its header (2026-11-17): darker than the note, so it reads first. */
function PesoCabecera({ texto }: { texto: string }) {
  return <span className="whitespace-nowrap font-mono text-[11px] font-semibold normal-case tracking-normal text-teal-800" title="Lo que pesa lo que controla este desplegable (estimación del modelo)">{texto}</span>;
}

export function Selector<T extends string>({ id, etiqueta, valor, opciones, alCambiar, clave }: { id: string; etiqueta: string; valor: T; opciones: { k: T; n: string }[]; alCambiar: (v: T) => void; clave?: keyof Parametros }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-0.5">
      {clave
        ? <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} className={cn('truncate text-left text-[13px] text-slate-700 underline decoration-dotted decoration-slate-300 underline-offset-2 hover:text-teal-800', abierto && 'text-teal-800')} title="Pincha para saber más de este parámetro">{etiqueta}</button>
        : <label htmlFor={id} className="text-[13px] text-slate-700">{etiqueta}</label>}
      {/* (2026-11-13) a select is as wide as its longest option: at 390 px «Ventanas laterales con montante (Aptera)» pushed the page to 490 px */}
      <select id={id} value={valor} onChange={e => alCambiar(e.target.value as T)} className="max-w-[min(14rem,55vw)] rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs">
        {opciones.map(o => <option key={o.k} value={o.k}>{o.n}</option>)}
      </select>
      {abierto && clave && <Explicacion clave={clave} alCerrar={() => setAbierto(false)} />}
    </div>
  );
}

/** Una lista de comprobaciones: holgura en cm, o la cifra que traiga (`mostrar`: el vuelco en g, el bastidor en ×). */
export function ListaComprobaciones({ lista }: { lista: Comprobacion[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {lista.map(c => {
        const cl = c.holgura < 0 ? 'border-red-300 bg-red-50 text-red-700' : c.holgura < c.minimo ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-700';
        const mal = c.mostrar ? (c.nombre.startsWith('Vuelco') ? 'vuelca' : 'no') : 'roza';
        return (
          <li key={c.nombre} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-[13px]">
            <span className={cn('rounded-full border px-1.5 text-[10px] font-bold uppercase', cl)}>{c.holgura < 0 ? mal : c.holgura < c.minimo ? 'justo' : 'ok'}</span>
            <span className="text-slate-700">{c.nombre}</span>
            <span className="font-mono text-xs tabular-nums">{c.mostrar ?? `${c.holgura < 0 ? '−' : ''}${fmt(Math.abs(c.holgura) * 100, 1)} cm`}</span>
          </li>
        );
      })}
    </ul>
  );
}
