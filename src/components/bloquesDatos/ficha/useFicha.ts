import { useEffect, useState } from 'react';
import { aTablaFicha, type Ficha, type TablaFicha } from './modelo';

// ============================================================================
// THE SHEET OF A PAGE, IN THE BROWSER (2026-10-18, Wikiproducts W1)
// ============================================================================
// Every data block of a sheet asks for the same thing: the sheet of the page
// it sits on. One request per page, shared by all of them, never one each.
//
// ── WHAT THE SERVER ALREADY WROTE ───────────────────────────────────────────
// The published page arrives with its sheet inside (`pagina.ficha`, set by
// the ampliación in `server/bd/plantillaFicha.ts`) in `window.__SITIO__`.
// `utils/precargado.ts` hands that page to its screen and then forgets it, so
// the sheets are copied here AT LOAD TIME: this module is imported by the
// blocks' definitions, which the registry imports eagerly, before any page is
// painted. With it, the first paint already has the data and matches the HTML
// the server wrote — no flash of an empty table.

const precargadas = new Map<string, Ficha>();
try {
  const paginas = (typeof window !== 'undefined' && (window as any).__SITIO__?.paginas) || {};
  for (const [id, p] of Object.entries<any>(paginas)) if (p?.ficha) precargadas.set(id, p.ficha);
} catch { /* nothing preloaded */ }

const enCurso = new Map<string, Promise<Ficha | null>>();

function pedirFicha(paginaId: string): Promise<Ficha | null> {
  let p = enCurso.get(paginaId);
  if (!p) {
    p = fetch(`/api/bd/ficha/${encodeURIComponent(paginaId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => (j?.ficha as Ficha) || null)
      .catch(() => null);
    enCurso.set(paginaId, p);
    // Kept for a short while: the blocks of one page share it, and a page
    // opened again later asks again (its data may have changed).
    p.finally(() => setTimeout(() => enCurso.delete(paginaId), 30_000));
  }
  return p;
}

export type EstadoFicha = { ficha: Ficha | null; cargando: boolean };

/** The sheet of `paginaId`: null while loading and when the page is not a
 *  row of any database (or its table cannot be seen). */
export function useFicha(paginaId: string | undefined): EstadoFicha {
  const inicial = paginaId ? precargadas.get(paginaId) || null : null;
  const [estado, setEstado] = useState<EstadoFicha>({ ficha: inicial, cargando: !!paginaId && !inicial });
  useEffect(() => {
    if (!paginaId) { setEstado({ ficha: null, cargando: false }); return; }
    const ya = precargadas.get(paginaId);
    if (ya) { setEstado({ ficha: ya, cargando: false }); return; }
    let vivo = true;
    setEstado(e => ({ ficha: e.ficha?.pagina_id === paginaId ? e.ficha : null, cargando: true }));
    pedirFicha(paginaId).then(f => { if (vivo) setEstado({ ficha: f, cargando: false }); });
    return () => { vivo = false; };
  }, [paginaId]);
  return estado;
}

/** A whole table as a `TablaFicha`, for a comparator pinned to a database
 *  rather than to the current row. */
export function useTablaFicha(tablaId: string | undefined): { tabla: TablaFicha | null; cargando: boolean } {
  const [estado, setEstado] = useState<{ tabla: TablaFicha | null; cargando: boolean }>({ tabla: null, cargando: !!tablaId });
  useEffect(() => {
    if (!tablaId) { setEstado({ tabla: null, cargando: false }); return; }
    let vivo = true;
    setEstado({ tabla: null, cargando: true });
    fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo) setEstado({ tabla: j ? aTablaFicha(j, { ocultarInternas: true }) : null, cargando: false }); })
      .catch(() => { if (vivo) setEstado({ tabla: null, cargando: false }); });
    return () => { vivo = false; };
  }, [tablaId]);
  return estado;
}
