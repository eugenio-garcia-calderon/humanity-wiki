// ============================================================================
// LAS DIRECCIONES LEGIBLES QUE YA SE CONOCEN (2026-10-18, Wikiproducts W2)
// ============================================================================
// SEO R2/R7. Una ficha con dirección legible (`/powerbanks/anker-737`) también
// se abre por `/p/:id`, pero eso es un 301 hacia la legible: un salto de más
// para el buscador por cada enlace. Así que un sitio enlaza por la legible
// siempre que la sabe.
//
// Aquí se apunta la de cada página conforme llega: la que el servidor dejó en
// el HTML (`window.__SITIO__.legibles`) y la que trae cada fila de una tabla
// (`pagina.ruta`, ver `Rejilla.tsx`). La que no se sabe sale por `/p/:id`, que
// sigue funcionando.

const conocidas = new Map<string, string>();

const pre = typeof window !== 'undefined' ? (window as any).__SITIO__?.legibles : null;
if (pre && typeof pre === 'object') {
  for (const [id, ruta] of Object.entries(pre)) if (typeof ruta === 'string') conocidas.set(id, ruta);
}

/** Apunta la dirección legible de una página (`categoria/ficha`). */
export function recordarRuta(paginaId: string | null | undefined, ruta: string | null | undefined) {
  if (!paginaId) return;
  if (typeof ruta === 'string' && ruta.includes('/')) conocidas.set(paginaId, ruta);
  // La ficha cambió de nombre o dejó de tenerla: lo que había ya no vale. Salvo
  // el nombre de una entrada de la red (`/movilidad`, un tramo, lo da el servidor).
  else if ((conocidas.get(paginaId) || '').includes('/')) conocidas.delete(paginaId);
}

/** La dirección legible de esta página, codificada para un enlace, si se sabe. */
export function rutaLegible(paginaId: string): string | null {
  const r = conocidas.get(paginaId);
  return r ? r.split('/').map(encodeURIComponent).join('/') : null;
}
