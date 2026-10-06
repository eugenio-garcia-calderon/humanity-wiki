// ============================================================================
// AVISOS DE «ESTO SE HA MOVIDO», TAMBIÉN A LAS OTRAS PESTAÑAS (2026-10-05)
// ============================================================================
// Mover una página o un bloque desde el menú cambia lo guardado de dos
// páginas. Si una de ellas está abierta —en esta pestaña o en otra—, su
// editor tiene la copia de antes, y su próximo autoguardado desharía el
// cambio. Por eso cada movimiento se anuncia aquí: en esta pestaña como
// evento de `window`, y en las demás por un `BroadcastChannel`, que las
// vuelve a emitir como el mismo evento. Quien escucha no distingue de dónde
// viene.

const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('humanity-paginas') : null;
canal?.addEventListener('message', e => {
  const { tipo, detalle } = e.data || {};
  if (typeof tipo === 'string' && tipo.startsWith('humanity:')) window.dispatchEvent(new CustomEvent(tipo, { detail: detalle }));
});

export function avisarMovimiento(tipo: 'humanity:pagina-movida' | 'humanity:bloque-movido' | 'humanity:sincronizado-cambiado', detalle: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent(tipo, { detail: detalle }));
  try { canal?.postMessage({ tipo, detalle }); } catch { /* sin canal: sólo esta pestaña */ }
}
