// ============================================================================
// DATA BLOCKS PRELOADED BEFORE THE FIRST PAINT (2026-10-18, Wikiproducts W1)
// ============================================================================
// Each data block's reading component is its own chunk (`lazy` in its
// `definicion.tsx`), so a page without a comparator never downloads one. The
// cost: on the first paint every block of a product sheet was a 64 px grey
// placeholder that grew into a table a moment later, pushing everything below
// it down. The evaluator measured a layout shift (CLS) of 0.65 on the sheets;
// the target is under 0.1.
//
// The server already wrote the page into `window.__SITIO__`, so the block
// types it needs are known before React starts. `main.tsx` waits for those
// chunks (in parallel with the app's own chunk, and never longer than
// `ESPERA_MAXIMA`) and only then paints. Meanwhile the reader sees the HTML the
// server wrote inside `#root`. Same chunks as the `lazy` imports: Vite gives a
// module one chunk however it is imported, so nothing downloads twice.
//
// This file stays tiny and imports no block: it is part of the entry chunk.

const lecturas = import.meta.glob('./*/Lectura.tsx');

/** Never hold the first paint longer than this for a slow chunk. */
const ESPERA_MAXIMA = 1500;

// The community scores are the one sheet block whose DATA comes after the
// paint (`/api/valoraciones`), and it sits near the top: when it arrived it
// pushed the technical data down (most of what was left of the CLS on
// desktop). Its request starts here, with the chunks, under the same wait.
const valoraciones = new Map<string, any>();
/** The scores read before the first paint, handed over ONCE: a later visit to
 *  the same page asks again, because a vote may have changed them. */
export function valoracionPrecargada(clave: string | undefined): any {
  if (!clave) return null;
  const v = valoraciones.get(clave);
  valoraciones.delete(clave);
  return v ?? null;
}

function tiposDe(bloques: unknown, out: Set<string>, pagina = '', claves?: Set<string>) {
  if (!Array.isArray(bloques)) return;
  for (const b of bloques as any[]) {
    if (!b || typeof b !== 'object') continue;
    if (typeof b.tipo === 'string') out.add(b.tipo);
    if (b.tipo === 'valoracion' && claves) claves.add((typeof b.datos?.fila_id === 'string' && b.datos.fila_id) || pagina);
    // Blocks nested in columns or toggles.
    for (const k of ['hijos', 'bloques', 'columnas']) tiposDe(b[k], out, pagina, claves);
    if (Array.isArray(b.columnas)) for (const c of b.columnas) tiposDe(c?.bloques, out, pagina, claves);
  }
}

// What arrived before the first paint, by block type. `React.lazy` suspends
// once even when its chunk is already in memory (a promise can't be read
// synchronously), and that one suspension paints the placeholder again; so the
// registry paints these components directly. Frozen once the wait ends: a
// chunk that lands later must not switch a block from the lazy component to
// this one mid-life (that would remount it and lose its state).
const listas = new Map<string, any>();
let cerrado = false;

export const lecturaPrecargada = (tipo: string): any => listas.get(tipo);

export function precargarBloquesDePagina(): Promise<unknown> {
  try {
    const paginas = (typeof window !== 'undefined' && (window as any).__SITIO__?.paginas) || {};
    const tipos = new Set<string>();
    const claves = new Set<string>();
    for (const [id, p] of Object.entries<any>(paginas)) tiposDe(p?.config?.bloques, tipos, id, claves);
    const cargas = [...tipos].filter(t => lecturas[`./${t}/Lectura.tsx`]).map(t =>
      (lecturas[`./${t}/Lectura.tsx`]() as Promise<any>)
        .then(m => { if (!cerrado && m?.default) listas.set(t, m.default); })
        .catch(() => undefined));
    for (const clave of claves) {
      if (!clave) continue;
      cargas.push(fetch(`/api/valoraciones/fila/${encodeURIComponent(clave)}`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : null))
        .then(j => { if (!cerrado && j) valoraciones.set(clave, j); })
        .catch(() => undefined));
    }
    if (!cargas.length) { cerrado = true; return Promise.resolve(); }
    return Promise.race([
      Promise.all(cargas),
      new Promise(r => setTimeout(r, ESPERA_MAXIMA)),
    ]).then(() => { cerrado = true; });
  } catch {
    return Promise.resolve();
  }
}
