// The page's side of «click a part in the 3D, see its record» (2026-11-24): which component is selected, which one the
// pointer is over, and what the viewer must show. Kept out of `pages/Aeromovil.tsx` so the page only wires it.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FICHAS, fichaEn, type DefFicha, type DondeVisor } from './registro';
import { ponerVehiculoFichas } from './almacen';

export interface HoverFicha { ficha: DefFicha; x: number; y: number }

/**
 * @param dep      the open department, or '' where there are no records (Proyecto, Homologación, vehicles with no tabs)
 * @param tipo     `modelo.tipo`
 * @param familia  `P.disposicion`: the key of the records on the server
 */
export function usarFichas({ dep, tipo, familia, activo }: { dep: string; tipo: string; familia: string | undefined; activo: boolean }) {
  // the records of this vehicle family are loaded as soon as it is on screen (the hover label shows the stock)
  useEffect(() => { ponerVehiculoFichas(activo ? familia : undefined); }, [activo, familia]);
  const [sel, setSel] = useState<{ id: string; dep: string } | null>(null);
  const [hover, setHover] = useState<HoverFicha | null>(null);
  // the selection belongs to the department it was made in: opening another one drops it with no extra render
  const activa = useMemo(() => (activo && sel && sel.dep === dep ? FICHAS.find(f => f.id === sel.id) ?? null : null), [activo, sel, dep]);
  useEffect(() => { if (sel && sel.dep !== dep) setSel(null); setHover(null); }, [dep, tipo]); // eslint-disable-line react-hooks/exhaustive-deps
  const cerrar = useCallback(() => setSel(null), []);
  useEffect(() => {
    if (!activa) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // while typing, the first Esc only leaves the field (a stray Esc must not close the record under a half-typed note); the next one closes
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) { t.blur(); return; }
      setSel(null);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [activa]);

  /** For the viewer's click: true when it was a component of the open department (the record opens and nothing else happens). */
  const pinchar = useCallback((donde?: DondeVisor): boolean => {
    const f = activo ? fichaEn(donde, dep, tipo) : null;
    if (!f) return false;
    setSel({ id: f.id, dep }); setHover(null);
    return true;
  }, [activo, dep, tipo]);
  /** For the viewer's hover: the component under the pointer, with the pointer's place in the viewer (px). */
  const pasar = useMemo(() => (activo && !activa ? (donde: DondeVisor | null, x: number, y: number) => {
    const f = fichaEn(donde, dep, tipo);
    setHover(h => (!f ? (h ? null : h) : h && h.ficha === f && Math.abs(h.x - x) < 2 && Math.abs(h.y - y) < 2 ? h : { ficha: f, x, y }));
  } : undefined), [activo, activa, dep, tipo]);

  return { activa, hover: activa ? null : hover, pinchar, pasar, cerrar, solo: activa ? { capas: activa.capas, componentes: activa.componentes } : null };
}
