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
  cuenta: 'text-sm text-slate-600',
  descripcion: 'hidden sm:block mt-1 text-sm text-slate-700 line-clamp-2',
} as const;

/** Las primeras seis tarjetas (dos filas en escritorio, tres en el teléfono)
 *  cargan su foto enseguida: con `lazy`, «Baterías domésticas» se quedaba en
 *  blanco a la vista hasta que el navegador decidía pedirla (comprobado en
 *  producción, 2026-10-18). Un sitio suele tener menos secciones que esto. */
export const CARGA_INMEDIATA = 6;
