// EL FILTRO DE LA PÁGINA (2026-10-25): un bloque (p. ej. «Territorio: España»)
// filtra las bases de datos de su página. Se dicen por un evento y se recuerda
// aquí la última elección por tabla, para la que se monte después.
export type FiltroPagina = { columna_id: string; valor: string };
const ultimos = new Map<string, FiltroPagina>();
export const EVENTO_FILTRO = 'filtro-pagina';
export function ponerFiltroPagina(tablaId: string, f: FiltroPagina) {
  ultimos.set(tablaId, f);
  window.dispatchEvent(new CustomEvent(EVENTO_FILTRO, { detail: { tablaId, ...f } }));
}
export const filtroPaginaDe = (tablaId: string) => ultimos.get(tablaId) || null;
