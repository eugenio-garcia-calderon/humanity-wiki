// Las clases de una tarjeta de sección (2026-10-18, Wikiproducts W2). Las
// usan `SeccionesSitio.tsx` y el HTML del servidor (`buscadorSitio.ts`):
// en un solo sitio, para que la página no salte cuando React la retoma.
//
// Eugenio: «que las categorías sean visualmente más atractivas, no una lista
// … sino que haya también imágenes». Una foto grande arriba (la del primer
// producto del catálogo si la sección no tiene portada), el nombre, cuántos
// productos tiene y, desde tableta, una línea de qué incluye.
export const CLASES_TARJETA = {
  lista: 'grid gap-3 grid-cols-2 lg:grid-cols-3',
  enlace: 'flex flex-col h-full rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-slate-400 hover:shadow-md transition',
  marco: 'relative flex items-center justify-center aspect-[4/3] bg-slate-50 text-slate-500',
  imagen: 'absolute inset-0 w-full h-full object-contain p-3',
  cuerpo: 'flex flex-col gap-0.5 p-3',
  titulo: 'text-base font-bold leading-snug text-slate-900',
  cuenta: 'text-base text-slate-600',
  descripcion: 'hidden sm:block mt-1 text-base text-slate-700 line-clamp-2',
} as const;

/** Las primeras seis tarjetas (dos filas en escritorio, tres en el teléfono)
 *  cargan su foto enseguida: con `lazy`, «Baterías domésticas» se quedaba en
 *  blanco a la vista hasta que el navegador decidía pedirla (comprobado en
 *  producción, 2026-10-18). Un sitio suele tener menos secciones que esto. */
export const CARGA_INMEDIATA = 6;

// LA PORTADA, EN GRUPOS (ronda 2 del evaluador, 2026-10-18). Las cinco
// tarjetas eran una rejilla plana que no separaba lo portátil de lo
// doméstico, y a 1440 px sólo se veían tres sin bajar. Agrupadas por la
// categoría de la que cuelgan, con su título enlazado; en escritorio los
// grupos van en UNA fila (cada uno tan ancho como tarjetas tiene) y en el
// teléfono cada tarjeta es una línea con su foto pequeña.
export type GrupoSecciones<S> = { id: string; titulo: string; slug: string | null; secciones: S[] };

/** Los grupos, o `null` si no hay nada que agrupar (un solo grupo, o cada
 *  sección es su propio grupo). */
export function agruparSecciones<S extends { grupo?: { id: string; titulo: string; slug: string | null; orden?: number } | null }>(lista: S[]): GrupoSecciones<S>[] | null {
  const grupos = new Map<string, GrupoSecciones<S> & { orden: number }>();
  for (const s of lista) {
    if (!s.grupo) return null;
    const g = grupos.get(s.grupo.id) || { id: s.grupo.id, titulo: s.grupo.titulo, slug: s.grupo.slug, orden: s.grupo.orden ?? 0, secciones: [] };
    g.secciones.push(s); grupos.set(g.id, g);
  }
  const out = [...grupos.values()].sort((a, b) => a.orden - b.orden);
  return out.length >= 2 && out.some(g => g.secciones.length >= 2) ? out : null;
}

export const CLASES_GRUPOS = {
  fila: 'flex flex-col gap-3 sm:gap-5 lg:flex-row lg:gap-6',
  grupo: 'min-w-0',
  titulo: 'text-base font-black text-slate-900 sm:mb-1 sm:text-lg',
  // 44 px de alto para el dedo (ronda 3), sin margen: la altura ya separa.
  enlaceTitulo: 'inline-flex items-center min-h-11 hover:underline',
  // `--n`: cuántas tarjetas tiene el grupo (lo pone quien pinta).
  // En el teléfono, dos por fila y pequeñas: las cinco caben en la primera
  // pantalla de la portada (ronda 2, comprobación en producción).
  lista: 'grid gap-2 grid-cols-2 sm:gap-3 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))]',
} as const;

export const CLASES_COMPACTA = {
  enlace: 'flex items-center gap-1.5 h-full rounded-xl border border-slate-200 bg-white overflow-hidden p-1.5 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0 hover:border-slate-400 hover:shadow-md transition',
  marco: 'relative shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-slate-50 text-slate-500 sm:w-auto sm:h-auto sm:aspect-[4/3] sm:rounded-none',
  imagen: 'absolute inset-0 w-full h-full object-contain p-0.5 sm:p-3',
  cuerpo: 'flex flex-col min-w-0 sm:gap-0.5 sm:p-3',
  titulo: 'text-base font-bold leading-tight text-slate-900 line-clamp-3 sm:line-clamp-2 sm:leading-snug',
  cuenta: 'text-sm text-slate-600 sm:text-base',
  descripcion: 'hidden lg:block mt-1 text-base text-slate-700 line-clamp-2',
} as const;
