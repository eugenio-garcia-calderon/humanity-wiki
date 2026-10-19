// ============================================================================
// «COMPARAR» FROM A GALLERY (2026-10-19, W4 · evaluator round 4)
// ============================================================================
// The visitor ticks 2 to 4 cards and opens them side by side. Nothing new is
// built for the comparison itself: the link goes to the first product's sheet
// with `?comparar=b,c,d#comparar`, and the sheet's comparator (mode «fila»,
// `bloquesDatos/comparador`) already reads that address.
//
// Only on a published site, and only for a table whose columns say how to
// compare (`config.comparar` on at least two of them): a gallery of articles
// or of people has nothing to put side by side, and never shows the tick.
//
// The choice lives in memory, per table, shared by every gallery of that
// table on the page (a grouped gallery is one `Galeria` per group). Nothing
// is stored: a reload starts with nothing ticked, which is what a visitor
// expects of a choice they never saved.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Columns3, X } from 'lucide-react';
import { Button } from '../ui/core';
import type { Columna } from './Celda';

export const MAX_COMPARAR_GALERIA = 4;

type Estado = { ids: string[]; paginas: Record<string, string>; nombres: Record<string, string>; dueno: string | null };
const estados = new Map<string, Estado>();
const oyentes = new Map<string, Set<() => void>>();
const vacio = (): Estado => ({ ids: [], paginas: {}, nombres: {}, dueno: null });

function avisar(tablaId: string) { oyentes.get(tablaId)?.forEach(f => f()); }

/** True for a table whose rows can be compared: two or more columns with a
 *  direction. The commission never counts, whatever its config says. */
export const tablaComparable = (columnas: Columna[]) =>
  columnas.filter(c => (c.config as any)?.comparar && (c.config as any)?.ficha !== 'comision').length >= 2;

/** The ticked rows of a table, and how to tick one. `instancia` is the gallery
 *  asking: the bar is painted by whichever gallery was touched last, so a
 *  grouped gallery shows one bar, not one per group. */
export function useComparar(tablaId: string, instancia: string) {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const f = () => refrescar(n => n + 1);
    if (!oyentes.has(tablaId)) oyentes.set(tablaId, new Set());
    oyentes.get(tablaId)!.add(f);
    return () => { oyentes.get(tablaId)?.delete(f); };
  }, [tablaId]);
  const e = estados.get(tablaId) || vacio();
  const alternar = (filaId: string, paginaId: string, nombre: string) => {
    const a = estados.get(tablaId) || vacio();
    const esta = a.ids.includes(filaId);
    if (!esta && a.ids.length >= MAX_COMPARAR_GALERIA) return;
    estados.set(tablaId, {
      ids: esta ? a.ids.filter(x => x !== filaId) : [...a.ids, filaId],
      paginas: { ...a.paginas, [filaId]: paginaId },
      nombres: { ...a.nombres, [filaId]: nombre },
      dueno: instancia,
    });
    avisar(tablaId);
  };
  const vaciar = () => { estados.set(tablaId, vacio()); avisar(tablaId); };
  return { ids: e.ids, nombres: e.nombres, paginas: e.paginas, esDueno: e.dueno === instancia, alternar, vaciar };
}

/** The tick on a card. A label around a real checkbox: the whole 44 px row is
 *  the target, and a click on it never opens the card underneath. */
export function MarcaComparar({ elegida, llena, onCambio, nombre }: { elegida: boolean; llena: boolean; onCambio: () => void; nombre: string }) {
  const bloqueada = llena && !elegida;
  return (
    <label data-sin-arrastre onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
      title={bloqueada ? `Puedes comparar hasta ${MAX_COMPARAR_GALERIA} productos` : undefined}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-0.5 text-sm ${bloqueada ? 'text-slate-400' : 'text-slate-600'}`}>
      {/* The real checkbox is 44 × 44 and invisible, laid over the 20 px box
          drawn beside it: the target a finger (or an audit) measures is the
          input itself, and the box keeps its usual size. */}
      <span className="relative grid h-11 w-11 shrink-0 place-items-center">
        <input type="checkbox" checked={elegida} disabled={bloqueada} onChange={onCambio}
          aria-label={`Comparar ${nombre}`} className="peer absolute inset-0 m-0 h-11 w-11 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
        <span aria-hidden className="pointer-events-none grid h-5 w-5 place-items-center rounded border-2 border-slate-400 bg-white text-white peer-checked:border-sky-700 peer-checked:bg-sky-700 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500 peer-focus-visible:ring-offset-1 peer-disabled:opacity-50">
          {elegida ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
      </span>
      Comparar
    </label>
  );
}

/** The bar at the foot of the screen while something is ticked. */
export function BarraComparar({ ids, nombres, paginas, enlace, onVaciar }: {
  ids: string[]; nombres: Record<string, string>; paginas: Record<string, string>;
  enlace: (paginaId: string) => string; onVaciar: () => void;
}) {
  const navigate = useNavigate();
  if (!ids.length) return null;
  const [primera, ...resto] = ids;
  const href = `${enlace(paginas[primera])}?comparar=${resto.join(',')}#comparar`;
  return (
    <div role="region" aria-label="Productos para comparar"
      className="fixed inset-x-0 bottom-0 z-[300] border-t border-slate-200 bg-white px-4 py-2 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-slate-700">
          <span className="font-semibold">{ids.length === 1 ? 'Elige otro producto para comparar.' : `${ids.length} productos elegidos`}</span>
          {/* The names only where they fit on one line; on a phone the bar
              would otherwise cover half the screen. */}
          <span className="hidden truncate text-slate-500 sm:block">{ids.map(i => nombres[i]).join(' · ')}</span>
        </p>
        <Button variant="outline" onClick={onVaciar} className="min-h-11 gap-1.5 normal-case tracking-normal text-sm">
          <X className="h-4 w-4" /> Quitar
        </Button>
        {ids.length >= 2 ? (
          <Button onClick={() => { onVaciar(); navigate(href); }} className="min-h-11 gap-1.5 normal-case tracking-normal text-sm">
            <Columns3 className="h-4 w-4" /> Comparar {ids.length}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
