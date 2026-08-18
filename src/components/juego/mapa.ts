// ============================================================================
// JUEGO VITAL — la distribución de la aldea, en un solo sitio (2026-08-18)
// ============================================================================
// El mundo 3D y el minimapa 2D leen ESTAS mismas constantes. Si cada uno
// tuviera su copia, moverías una casa en el mundo y el mapa seguiría
// enseñándola donde estaba: un mapa que miente es peor que no tener mapa.
import { crearAzar, centroRio } from './paleta';

export { centroRio };

/** Media anchura del mundo: 118 ha ≈ 1090 × 1090 m. */
export const MITAD = 545;

/** Radio de la plaza empedrada. */
export const PLAZA_R = 13;

/** Caminos: [centro x, centro z, ancho, largo]. */
export const CAMINOS: Array<[number, number, number, number]> = [
  [70, 0, 120, 4],    // este: plaza → distrito de proyectos → puente
  [-53, 0, 86, 4],    // oeste: plaza → naves
  [0, 38, 4, 54],     // norte
  [0, -38, 4, 54],    // sur
];

/** Las 4 naves industriales, al oeste. */
export const NAVES = [-36, -12, 12, 36].map(z => ({ x: -70, z, ancho: 16, fondo: 10 }));

/** Los dos lagos. */
export const LAGOS = [
  { x: -230, z: 190, rx: 46, rz: 33 },
  { x: 180, z: -260, rx: 56, rz: 40 },
];

/** El distrito de proyectos (los edificios de tus proyectos reales). */
export const DISTRITO = { x0: 34, x1: 90, z0: -44, z1: 26 };

export interface CasaAldea { x: number; z: number; rot: number; modelo: number }

/**
 * Las 14 casas del anillo. Deterministas: misma semilla, misma aldea siempre.
 * `modelo` es el índice dentro del catálogo de casas.
 */
export function casasAldea(): CasaAldea[] {
  const azar = crearAzar(20260818);
  const lista: CasaAldea[] = [];
  for (let i = 0; i < 14; i++) {
    const ang = 0.45 + (i / 14) * (Math.PI * 2 - 0.9);
    const r = (i % 2 === 0 ? 27 : 36) + azar() * 4;
    // Se consumen los mismos números que consumía la versión con cajas, para
    // que las posiciones no se muevan al cambiar el aspecto de las casas.
    azar(); azar(); azar(); azar();
    lista.push({
      x: Math.cos(ang) * r,
      z: Math.sin(ang) * r,
      rot: -ang - Math.PI / 2,
      modelo: i,
    });
  }
  return lista;
}

/** Medio ancho y medio fondo del edificio de un proyecto, para colisiones. */
export const RADIO_EDIFICIO = 4.6;

/**
 * Dónde se planta el edificio del proyecto número `i` del distrito.
 * Lo usan el mundo 3D, los obstáculos y el minimapa: si cada uno lo calculara
 * por su cuenta, moverías el distrito y el mapa (o las colisiones) se
 * quedarían apuntando al sitio viejo. Ya pasó con las casas.
 */
export function posicionProyecto(i: number): { x: number; z: number } {
  return { x: 42 + (i % 3) * 19, z: -36 + Math.floor(i / 3) * 21 };
}

/** El río, como línea quebrada de (x, z) para pintarlo en el mapa. */
export function trazadoRio(paso = 40): Array<[number, number]> {
  const puntos: Array<[number, number]> = [];
  for (let z = -MITAD; z <= MITAD; z += paso) puntos.push([centroRio(z), z]);
  return puntos;
}
