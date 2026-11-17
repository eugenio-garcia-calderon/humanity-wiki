/**
 * What a section's weight is made of (2026-11-17, masasSecciones.ts): its parts with their kg, and the parts of a
 * part (the frame's tubes by group, its joints split into bolts, brackets and gussets). Folded, except where it says
 * `abierto` (the frame: Eugenio asked to see the tubes and the bolts apart).
 */
import { fmt } from './controles';
import type { PartePeso, SeccionPeso } from './masasSecciones';
import { ProveedorParte } from './proveedores/ProveedorParte';

function Parte({ p, nivel }: { p: PartePeso; nivel: number }) {
  return (
    <li className={nivel ? 'border-l border-slate-200 pl-2' : ''}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={nivel ? 'text-slate-600' : 'font-medium text-slate-700'}>{p.nombre}</span>
        <span className="shrink-0 font-mono tabular-nums text-slate-700">{fmt(p.kg, p.kg < 1 ? 2 : 1)} kg</span>
      </div>
      {/* (2026-11-17, «proveedores») supplier, model and files of the part (proveedores/ProveedorParte.tsx) */}
      {nivel === 0 && <ProveedorParte nombre={p.nombre} />}
      {p.nota && <p className="text-[11px] leading-snug text-slate-400">{p.nota}</p>}
      {p.hijos && <ul className="mt-1 flex flex-col gap-1">{p.hijos.map(h => <Parte key={h.nombre} p={h} nivel={nivel + 1} />)}</ul>}
    </li>
  );
}

export function DesglosePeso({ s, abierto }: { s: SeccionPeso | null; abierto?: boolean }) {
  if (!s) return null;
  return (
    <details open={abierto} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5 text-xs">
      <summary className="cursor-pointer select-none font-semibold text-slate-600">
        {s.tipo === 'ajusta' ? `Lo que ajustan estos deslizadores: ${fmt(s.kg, 1)} kg` : `De qué está hecho este peso: ${fmt(s.kg, 1)} kg`}
      </summary>
      <ul className="mt-1.5 flex flex-col gap-1.5">{s.partes.map(p => <Parte key={p.nombre} p={p} nivel={0} />)}</ul>
      {s.nota && <p className="mt-1 text-[11px] text-slate-400">{s.nota}{s.tipo === 'ajusta' ? '; estas piezas cuentan en sus propios desplegables.' : ''}</p>}
      <p className="mt-1 text-[11px] text-slate-400">Estimaciones del modelo para piezas de su clase, no pesadas: las mismas cifras que la lista «Peso: todos los componentes».</p>
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
