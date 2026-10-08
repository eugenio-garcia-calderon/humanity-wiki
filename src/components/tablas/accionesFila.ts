// ============================================================================
// TABLAS · LO QUE SE HACE CON UNA ENTRADA (2026-10-08)
// ============================================================================
// Duplicar, eliminar y deshacer: los usan el menú de la tarjeta de la galería
// (clic derecho, dos dedos en el Mac, «⋯» en el móvil) y el «⋯» de la página de
// la entrada. Eliminar no borra de verdad: la entrada queda 15 días recuperable,
// y por eso se puede ofrecer «Deshacer» en vez de preguntar «¿seguro?».

async function llamar(url: string, metodo: string): Promise<any> {
  const r = await fetch(url, { method: metodo, credentials: 'include' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'No se pudo hacer.');
  return j;
}

export const duplicarFila = (id: string): Promise<{ id: string; pagina_id: string | null }> =>
  llamar(`/api/bd/filas/${id}/duplicar`, 'POST');
export const eliminarFila = (id: string) => llamar(`/api/bd/filas/${id}`, 'DELETE');
export const restaurarFila = (id: string) => llamar(`/api/bd/filas/${id}/restaurar`, 'POST');
