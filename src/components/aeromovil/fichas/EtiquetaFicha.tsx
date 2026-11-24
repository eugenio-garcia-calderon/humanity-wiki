// The small label that follows the pointer over a component in the 3D (2026-11-24): its number, its name and 2–3 facts.
// It does not catch the pointer (so hovering never gets in the way of turning the view or clicking the part).
import { numeroPorDefecto } from './registro';
import type { HoverFicha } from './usarFichas';

export function EtiquetaFicha({ h, numero, datos, ancho }: { h: HoverFicha | null; numero?: string; datos: string[]; ancho: number }) {
  if (!h) return null;
  // flip to the left of the pointer near the right edge, so it never leaves the viewer
  const derecha = h.x > ancho - 220;
  return (
    <div role="tooltip" data-etiqueta-ficha className="pointer-events-none absolute z-[14] max-w-[13rem] rounded-lg border border-teal-700/60 bg-white/95 px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: derecha ? undefined : h.x + 14, right: derecha ? ancho - h.x + 14 : undefined, top: Math.max(4, h.y - 8) }}>
      <p className="font-semibold text-slate-900"><span className="mr-1 font-mono text-[11px] text-teal-800">{numero?.trim() || numeroPorDefecto(h.ficha)}</span>{h.ficha.nombre}</p>
      {datos.length > 0 && <p className="text-slate-600">{datos.join(' · ')}</p>}
      <p className="text-[10px] text-slate-400">Clic para ver la ficha</p>
    </div>
  );
}
