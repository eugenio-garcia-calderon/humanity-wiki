// ============================================================================
// LO QUE EL SERVIDOR YA METIÓ EN EL HTML (2026-10-01)
// ============================================================================
// Eugenio: «el dominio propio tarda muchísimo en mostrar la primera imagen o
// el primer título. Que cargue en menos de un segundo».
//
// Medido ese día en luzhumanidad.com: el título salía a los 2,5 s, después de
// CINCO viajes en fila — la aplicación entera, «¿a qué apunta este dominio?»,
// la pantalla, «dame la página» y la imagen. Cada uno esperaba al anterior.
//
// Ahora el servidor, que ya sabía todo eso al servir el HTML (lo usaba para el
// título y la vista previa), lo deja escrito dentro en `window.__SITIO__`. El
// navegador lo lee aquí en vez de volver a preguntarlo.
//
// SE LEE UNA SOLA VEZ. Es la foto del momento en que se sirvió el HTML: si al
// navegar dentro del sitio se vuelve a una página, se pide de nuevo como
// siempre, no se enseña la foto vieja.

type Precargado = {
  /** Lo mismo que contesta `/api/dominios/resolver`: `{ status, body }`. */
  resolver?: { host: string; status: number; body: any };
  /** Lo mismo que contesta `/api/sitio/pagina/:id`, por id. */
  paginas?: Record<string, any>;
  /** La dirección legible de una ficha y su página: `{ '/powerbanks/x': id }`. */
  rutas?: Record<string, string>;
  /** La dirección legible de cada ficha enlazada en la página: `{ id: 'powerbanks/x' }`.
   *  La lee `rutasLegibles.ts`. */
  legibles?: Record<string, string>;
  /** La pestaña de la red o las migas de una entrada en su contexto, por dirección (`porContexto`, 2026-10-21). */
  contextos?: Record<string, ContextoRuta>;
};

export type ContextoRuta = {
  seccion: { slug: string; nombre: string } | null;
  contexto: { madre: { id: string; titulo: string; camino: string }; grupo: { nombre: string; camino: string } } | null;
};

const datos: Precargado =
  (typeof window !== 'undefined' && (window as any).__SITIO__) || {};

/** La respuesta del resolvedor para este anfitrión, si vino en el HTML. */
export function resolverPrecargado(host: string): { status: number; body: any } | null {
  const r = datos.resolver;
  if (!r || r.host !== host) return null;
  datos.resolver = undefined;
  return { status: r.status, body: r.body };
}

/** La página con este id, si vino en el HTML. */
export function paginaPrecargada(id: string | undefined | null): any | null {
  if (!id || !datos.paginas?.[id]) return null;
  const p = datos.paginas[id];
  delete datos.paginas[id];
  return p;
}

/** Qué página es esta dirección legible, si vino en el HTML. No se borra al
 *  leerla, como lo demás: es sólo un id, no una foto que se pueda quedar
 *  vieja, y en las rutas que cargan aparte el componente se monta dos veces. */
export function rutaPrecargada(camino: string): string | null {
  return datos.rutas?.[camino] || null;
}

/** El contexto de esta dirección (pestaña o migas), si vino en el HTML. */
export function contextoPrecargado(camino: string): ContextoRuta | null {
  return datos.contextos?.[camino] || null;
}
