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

// ---------------------------------------------------------------------------
// El mobiliario del pueblo, con IDENTIDAD (2026-08-18). Cada pieza tiene un
// `seed_id` estable ('farola:3', 'arbol:517'…) por tres razones que comparten
// código: el rebote al chocar, el clic para editarla y el retoque guardado
// («eliminada», «movida») tienen que hablar del MISMO objeto.
// ---------------------------------------------------------------------------

export interface PiezaAldea {
  seed_id: string;
  /** casa | nave | fuente | farola | banco | puesto | pozo | carro | arbol */
  tipo: string;
  x: number;
  z: number;
  rot: number;
  /** Radio de choque. 0 = no es sólida (no pasa con ninguna de serie). */
  radio: number;
  /** Solo árboles: escala y si es pino. Solo casas: índice de modelo. */
  escala?: number;
  pino?: boolean;
  modelo?: number;
}

/** Bancos, farolas, puestos, pozo y carro de la plaza (antes en Detalles.tsx). */
export const BANCOS = [
  { x: -9, z: 7, rot: 0.5 }, { x: 9, z: 7, rot: -0.5 },
  { x: -9, z: -7, rot: 2.6 }, { x: 9, z: -7, rot: -2.6 },
];
export const FAROLAS = [
  { x: -13, z: 0 }, { x: 13, z: 0 }, { x: 0, z: -13 },
  { x: 30, z: 3 }, { x: 52, z: 3 }, { x: -30, z: 3 }, { x: -52, z: 3 },
  { x: 0, z: 30 }, { x: 0, z: 52 },
];
export const PUESTOS = [
  { x: 15, z: 16, rot: -0.5 },
  { x: 20, z: 10, rot: -1.0 },
  { x: 11, z: 21, rot: -0.2 },
];
export const POZO = { x: -16, z: 13 };
export const CARRO = { x: 17, z: -14, rot: 0.7 };

/** ¿Se puede plantar aquí un árbol de serie? (misma lógica que la vegetación) */
export function sueloLibre(x: number, z: number): boolean {
  if (Math.abs(x) > 540 || Math.abs(z) > 540) return false;
  if (Math.hypot(x, z) < 52) return false;                          // el pueblo
  if (x > 28 && x < 96 && z > -62 && z < 18) return false;          // distrito
  if (Math.abs(x - centroRio(z)) < 16) return false;                // río
  if (x > -94 && x < -46 && z > -50 && z < 50) return false;        // naves
  if (Math.abs(z) < 6 && x > -98 && x < 132) return false;          // caminos E-O
  if (Math.abs(x) < 6 && Math.abs(z) < 68) return false;            // caminos N-S
  for (const l of LAGOS) {
    if (Math.hypot((x - l.x) / (l.rx + 8), (z - l.z) / (l.rz + 8)) < 1) return false;
  }
  return true;
}

/**
 * Los ~1.100 árboles del mundo, deterministas (semilla 118, la misma de
 * siempre: los árboles no se mueven por sacar esta lista de Aldea.tsx).
 */
let cacheArboles: PiezaAldea[] | null = null;
export function arbolesAldea(): PiezaAldea[] {
  if (cacheArboles) return cacheArboles;
  const azar = crearAzar(118);
  const lista: PiezaAldea[] = [];
  let n = 0;
  const meter = (x: number, z: number, s: number, pino: boolean) => {
    lista.push({ seed_id: `arbol:${n++}`, tipo: 'arbol', x, z, rot: 0, radio: 0.9 * s, escala: s, pino });
  };
  const nucleos = [
    [-320, -180], [260, 130], [-150, -380], [320, -320],
    [-350, 260], [150, 330], [430, 80], [-80, 430],
  ];
  // OJO: el orden de consumo del azar es EXACTAMENTE el del código viejo de
  // Aldea.tsx (s y pino solo se sortean si el sitio está libre) — cambiarlo
  // replantaría el bosque entero de otra manera.
  for (const [nx, nz] of nucleos) {
    for (let i = 0; i < 105; i++) {
      const x = nx + (azar() + azar() - 1) * 110;
      const z = nz + (azar() + azar() - 1) * 110;
      if (sueloLibre(x, z)) meter(x, z, 0.75 + azar() * 0.7, azar() > 0.42);
    }
  }
  for (let i = 0; i < 300; i++) {
    const x = (azar() - 0.5) * 1060;
    const z = (azar() - 0.5) * 1060;
    if (sueloLibre(x, z)) meter(x, z, 0.7 + azar() * 0.7, azar() > 0.5);
  }
  cacheArboles = lista;
  return lista;
}

/**
 * TODO el pueblo de serie como piezas con identidad y radio de choque.
 * Lo consumen: el rebote (obstáculos), el editor (clic → seleccionar) y el
 * dibujo (Aldea aplica aquí encima los retoques del jugador).
 */
let cachePiezas: PiezaAldea[] | null = null;
export function piezasAldea(): PiezaAldea[] {
  if (cachePiezas) return cachePiezas;
  const lista: PiezaAldea[] = [];
  casasAldea().forEach((c, i) =>
    lista.push({ seed_id: `casa:${i}`, tipo: 'casa', x: c.x, z: c.z, rot: c.rot, radio: 4.4, modelo: c.modelo }));
  NAVES.forEach((nv, i) =>
    lista.push({ seed_id: `nave:${i}`, tipo: 'nave', x: nv.x, z: nv.z, rot: 0, radio: 8.6 }));
  lista.push({ seed_id: 'fuente:0', tipo: 'fuente', x: 0, z: 0, rot: 0, radio: 2.9 });
  BANCOS.forEach((b, i) =>
    lista.push({ seed_id: `banco:${i}`, tipo: 'banco', x: b.x, z: b.z, rot: b.rot, radio: 1.2 }));
  FAROLAS.forEach((f, i) =>
    lista.push({ seed_id: `farola:${i}`, tipo: 'farola', x: f.x, z: f.z, rot: 0, radio: 0.5 }));
  PUESTOS.forEach((p, i) =>
    lista.push({ seed_id: `puesto:${i}`, tipo: 'puesto', x: p.x, z: p.z, rot: p.rot, radio: 1.9 }));
  lista.push({ seed_id: 'pozo:0', tipo: 'pozo', x: POZO.x, z: POZO.z, rot: 0, radio: 1.4 });
  lista.push({ seed_id: 'carro:0', tipo: 'carro', x: CARRO.x, z: CARRO.z, rot: CARRO.rot, radio: 1.6 });
  lista.push(...arbolesAldea());
  cachePiezas = lista;
  return lista;
}

/** Radio de choque de un prop creado por el jugador, según su tipo. */
export function radioProp(modelo: string | null | undefined): number {
  switch (modelo) {
    case 'casa': return 4.4;
    case 'arbol': case 'pino': return 1.0;
    case 'farola': return 0.5;
    case 'banco': return 1.2;
    case 'puesto': return 1.9;
    case 'pozo': return 1.4;
    case 'roca': return 0.9;
    case 'arbusto': return 0.8;
    default: return 1.0;
  }
}
