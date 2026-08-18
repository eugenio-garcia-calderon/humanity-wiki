// ============================================================================
// JUEGO VITAL — world palette and deterministic layout helpers.
//
// three.js materials take raw colour strings, so the project rule "no hex in
// pages" is honoured by concentrating every world colour HERE, outside
// src/pages/. Re-skinning the whole world is editing this file.
// ============================================================================

export const PALETA = {
  // Atmosphere
  cielo: '#dfeef7',
  luzSol: '#fff3d6',
  luzAmbiente: '#eaf4ff',
  luzCielo: '#cfe8ff',
  luzSuelo: '#9db86f',

  // Terrain
  prado: '#7cb356',
  pradoClaro: '#8fc167',
  pradoOscuro: '#6da34c',
  camino: '#d9c9a3',
  plaza: '#cbbfa4',
  arena: '#cbbb90',

  // Water
  aguaRio: '#4fa3d1',
  aguaLago: '#3f93c4',

  // Vegetation & props
  tronco: '#7a5636',
  pino: '#3f7d44',
  pinoClaro: '#4f9155',
  hoja: '#63a84f',
  hojaClara: '#7dbc5e',
  arbusto: '#5c9c49',
  piedra: '#9aa2a6',
  madera: '#a9825a',
  flor: ['#f7f3e8', '#f2d16b', '#e58fb1'],

  // Village
  casas: ['#f2e3c9', '#e8d3b4', '#f5efe3', '#e5c9a8', '#f0dbc0', '#dfc9ad'],
  tejados: ['#c96f4a', '#b5563b', '#d17f55', '#a94f38'],
  puerta: '#6b4a33',
  ventana: '#bfe3f2',
  ventanaLuz: '#fff2c4',
  nave: '#8fa3ad',
  naveTecho: '#6d7f88',
  navePuerta: '#5b6a72',
  fuentePiedra: '#b8b2a4',

  // Characters
  piel: '#e8b98f',
  pelo: '#4a3527',
  ropa: '#3e8f6f',
  pantalon: '#4a5568',
  robotCuerpo: '#f4f7f8',
  robotDetalle: '#324049',
  robotLuz: '#34d399',

  // Project district
  edificiosProyecto: ['#7ba8c9', '#c9a87b', '#9dc97b', '#c97b9d', '#8d7bc9', '#c9c07b'],
  tejadoPlano: '#55606a',
  cartel: '#f8f5ec',
  poste: '#8a6b4c',
  barraFondo: '#d7d2c4',
} as const;

/** Deterministic pseudo-random generator (LCG). Same seed → same village
 *  forever: the world must not reshuffle between visits. Persistence in DB
 *  arrives with the Builder (F2). */
export function crearAzar(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Winding centre (x) of the river at a given z — shared by the river ribbon,
 *  the bridge and the tree scatterer (to keep trees off the water). */
export function centroRio(z: number): number {
  return 95 + 40 * Math.sin(z * 0.006) + 18 * Math.sin(z * 0.0023 + 1.3);
}
