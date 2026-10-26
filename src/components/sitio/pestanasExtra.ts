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
const NADA: string[] = [];
const mapa = new Map<string, PestanaExtra[]>();
/** Grupos de la red que una pestaña del bloque ya enseña mejor (no se repiten). */
const ocultos = new Map<string, string[]>();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

export function ponerPestanasExtra(paginaId: string, lista: PestanaExtra[], ocultar: string[] = NADA) {
  mapa.set(paginaId, lista);
  ocultos.set(paginaId, ocultar);
  avisar();
}
export function quitarPestanasExtra(paginaId: string) {
  ocultos.delete(paginaId);
  if (mapa.delete(paginaId)) avisar();
}
/** Los nombres de los grupos de la red que no hay que enseñar (en minúsculas y sin tildes). */
export function useGruposOcultos(paginaId: string): string[] {
  return useSyncExternalStore(
    f => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => ocultos.get(paginaId) || NADA,
    () => NADA,
  );
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

// ============================================================================
// CÓMO SE ENSEÑA LA RED (2026-10-26, Eugenio: el perfil de una persona)
// ============================================================================
// «Si pinchas en un área del perfil, que salgan los proyectos de ese área; y
// los proyectos, por defecto, más compactos.» El bloque `perfil` pone aquí un
// filtro (las filas que sí) y pide tarjetas pequeñas; `RedRelaciones` lo aplica.
export type OpcionesRed = { compacta?: boolean; filtro?: { etiqueta: string; filas: string[] } | null };
const SIN_OPCIONES: OpcionesRed = {};
const opciones = new Map<string, OpcionesRed>();
export function ponerOpcionesRed(paginaId: string, o: OpcionesRed | null) {
  if (o) opciones.set(paginaId, o); else opciones.delete(paginaId);
  avisar();
}
export function useOpcionesRed(paginaId: string): OpcionesRed {
  return useSyncExternalStore(
    f => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => opciones.get(paginaId) || SIN_OPCIONES,
    () => SIN_OPCIONES,
  );
}
