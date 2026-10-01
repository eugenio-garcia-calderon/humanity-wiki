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
