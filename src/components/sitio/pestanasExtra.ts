import { useSyncExternalStore, type ReactNode } from 'react';

// ============================================================================
// PESTAÑAS QUE UN BLOQUE AÑADE A LA RED DE SU PÁGINA (2026-10-25, Eugenio)
// ============================================================================
// «Quita las pestañas del lateral derecho y deja esas pestañas solo abajo junto
// con las otras.» El termómetro de un sistema pone aquí «Salto», «Soluciones»,
// «Diagnóstico» y «Plan», y `RedRelaciones` las enseña delante de las bases de
// datos, en la misma barra. El contenido es del bloque (lo pinta él); la red
// solo lo coloca.

export type PestanaExtra = { id: string; titulo: string; n?: number; contenido: ReactNode };

const VACIO: PestanaExtra[] = [];
const mapa = new Map<string, PestanaExtra[]>();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

export function ponerPestanasExtra(paginaId: string, lista: PestanaExtra[]) {
  mapa.set(paginaId, lista);
  avisar();
}
export function quitarPestanasExtra(paginaId: string) {
  if (mapa.delete(paginaId)) avisar();
}
export function usePestanasExtra(paginaId: string): PestanaExtra[] {
  return useSyncExternalStore(
    f => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => mapa.get(paginaId) || VACIO,
    () => VACIO,
  );
}

/** Abrir una pestaña de la red desde fuera (p. ej. «Qué hace falta para llegar al nivel 5»). */
export const EVENTO_ABRIR_PESTANA = 'red:abrir-pestana';
export function abrirPestanaRed(paginaId: string, id: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_PESTANA, { detail: { paginaId, id } }));
}
