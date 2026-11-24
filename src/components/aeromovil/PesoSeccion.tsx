/**
 * What a section's weight is made of (2026-11-17, masasSecciones.ts): its parts with their kg, and the parts of a
 * part (the frame's tubes by group, its joints split into bolts, brackets and gussets). Folded, except where it says
 * `abierto` (the frame: Eugenio asked to see the tubes and the bolts apart).
 */
import { useState } from 'react';
import { fmt } from './controles';
import type { PartePeso, SeccionPeso } from './masasSecciones';
// (2026-11-17, «precios»: each part's price on its line, tap to edit — precios/)
import { eur, type PrecioSeccion } from './precios/precios';
import { BotonPrecio, EditorPrecio } from './precios/EditorPrecio';
import { BotonPeso, EditorPeso } from './precios/EditorPeso';
import { ProveedorParte } from './proveedores/ProveedorParte';

/** The prices of a section's parts and how to change one (absent: weights only, as before). */
export interface PreciosDesglose { s: PrecioSeccion | null; alCambiar: (nombre: string, v: number | null) => void }

/** The weights the user may set, part by part (2026-11-24): the model's estimate of each, the user's own, and how to change one. */
export interface PesosEditables { base: Record<string, number>; propios?: Record<string, number>; alCambiar: (nombre: string, v: number | null) => void }

function Parte({ p, nivel, precios, pesos, editando, alEditar }: { p: PartePeso; nivel: number; precios?: PreciosDesglose; pesos?: PesosEditables; editando?: string | null; alEditar?: (n: string | null) => void }) {
  const pr = nivel === 0 ? precios?.s?.partes.find(x => x.nombre === p.nombre) : undefined;
  const est = nivel === 0 ? pesos?.base[p.nombre] : undefined;
  const pp = est && est > 0 && pesos ? { nombre: p.nombre, kg: p.kg, estimado: est, propio: pesos.propios?.[p.nombre] != null } : undefined;
  const kPeso = `kg:${p.nombre}`;
  return (
    <li className={nivel ? 'border-l border-slate-200 pl-2' : ''}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={nivel ? 'text-slate-600' : 'font-medium text-slate-700'}>{p.nombre}</span>
        <span className="flex shrink-0 items-baseline gap-1.5">
          {pp && alEditar ? <BotonPeso p={pp} abierto={editando === kPeso} alPulsar={() => alEditar(editando === kPeso ? null : kPeso)} />
            : <span className="font-mono tabular-nums text-slate-700">{fmt(p.kg, p.kg < 1 ? 2 : 1)} kg</span>}
          {pr && alEditar && <BotonPrecio p={pr} abierto={editando === p.nombre} alPulsar={() => alEditar(editando === p.nombre ? null : p.nombre)} />}
        </span>
      </div>
      {pp && pesos && alEditar && editando === kPeso && <EditorPeso p={pp} alCambiar={v => pesos.alCambiar(p.nombre, v)} alCerrar={() => alEditar(null)} />}
      {pr && precios && alEditar && editando === p.nombre && <EditorPrecio p={pr} alCambiar={v => precios.alCambiar(p.nombre, v)} alCerrar={() => alEditar(null)} />}
      {/* (2026-11-17, «proveedores») supplier, model and files of the part (proveedores/ProveedorParte.tsx) */}
      {nivel === 0 && <ProveedorParte nombre={p.nombre} />}
      {p.nota && <p className="text-[11px] leading-snug text-slate-400">{p.nota}</p>}
      {p.hijos && <ul className="mt-1 flex flex-col gap-1">{p.hijos.map(h => <Parte key={h.nombre} p={h} nivel={nivel + 1} />)}</ul>}
    </li>
  );
}

export function DesglosePeso({ s, abierto, precios, pesos }: { s: SeccionPeso | null; abierto?: boolean; precios?: PreciosDesglose; pesos?: PesosEditables }) {
  const [editando, setEditando] = useState<string | null>(null);
  if (!s) return null;
  const ps = precios?.s ? ` · ${eur(precios.s.eur)}` : '';
  return (
    <details open={abierto} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs">
      <summary className="cursor-pointer select-none font-semibold text-slate-600">
        {s.tipo === 'ajusta' ? `Lo que ajustan estos deslizadores: ${fmt(s.kg, 1)} kg${ps}` : `De qué está hecho este peso: ${fmt(s.kg, 1)} kg${ps}`}
      </summary>
      <ul className="mt-1.5 flex flex-col gap-1.5">{s.partes.map(p => <Parte key={p.nombre} p={p} nivel={0} precios={precios} pesos={pesos} editando={editando} alEditar={setEditando} />)}</ul>
      {s.nota && <p className="mt-1 text-[11px] text-slate-400">{s.nota}{s.tipo === 'ajusta' ? '; estas piezas cuentan en sus propios desplegables.' : ''}</p>}
      <p className="mt-1 text-[11px] text-slate-400">Estimaciones del modelo para piezas de su clase, no pesadas: las mismas cifras que la lista «Peso: todos los componentes».{precios?.s ? ' Los precios con «≈» son estimados; pulsa uno para poner el tuyo. La suma de todo está en «Proyecto».' : ''}</p>
    </details>
  );
}

/** The parts of a department that no section owns, so its tab's total is all accounted for. */
export function SinSeccion({ partes }: { partes: PartePeso[] | undefined }) {
  if (!partes?.length) return null;
  return (
    <p className="text-xs text-slate-500">Sin desplegable propio: {partes.map(p => `${p.nombre.toLowerCase()} (${fmt(p.kg, 1)} kg)`).join(', ')}.</p>
  );
}
