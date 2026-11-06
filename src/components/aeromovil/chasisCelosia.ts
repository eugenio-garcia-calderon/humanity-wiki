import type { P3, Parametros, Seccion, Tubo } from './geometria';

/**
 * Chasis versión 2 del Aeromóvil 1: celosía tubular triangulada como la del
 * Caterham Seven (pendiente: lo diseña un bot, 2026-11-06, Eugenio: «un chasis
 * tubular con celosías… alta resistencia y ligereza gracias a su diseño
 * triangular; una versión 2 idéntica del coche con este chasis, y comparar
 * resistencia, estructura, peso y forma con la versión 1»).
 *
 * `ContextoChasis` son los puntos duros del coche: la versión 2 tiene que
 * anclar la suspensión, el salpicadero, los estribos, el arco de seguridad y
 * el suelo del maletero en los mismos sitios que la versión 1.
 */
export interface ContextoChasis {
  P: Parametros;
  xF0: number; xR0: number; xR: number; ys: number; zR: number;
  xD: number; yDash: number; xH: number; xArco: number; uArco: number;
  ySill: number; zSill: number; yTow: number; zTF: number; yAmortR: number; yMaletero: number;
  rF: number; rR: number; yFloor: number; xPil: number; xPas: number; hip: number; hipPas: number;
  yLarg: (x: number) => number;
  frame: (u: number) => Seccion; uDeX: (x: number) => number; xDeU: (u: number) => number;
  secC: (f: Seccion, th: number, off?: number) => P3; frameC: (u: number) => Seccion; thBase: (u: number) => number; thPilar: (u: number) => number;
  uBase: number; uW1: number; gomaT: number; gomaU: number;
  baterias: { nombre: string; x0: number; x1: number; y0: number; y1: number; hz: number }[];
  motor: { c: P3; r: number; largo: number };
  reposapies: [number, number]; volanteCentro: P3; cremallera: P3;
  material: string; acero: string;
}

/** Los tubos de la estructura en celosía (sin suspensión, dirección ni transmisión: esos van aparte). */
export function tubosCelosia(_c: ContextoChasis): Tubo[] {
  return [];
}

/** Lo que se compara entre las dos versiones. `rigidezTorsion` en N·m por grado, o null si no se ha podido estimar. */
export interface EvaluacionChasis {
  version: 'largueros' | 'celosia'; nombre: string;
  masaKg: number; nTubos: number; largoM: number; nNudos: number; triangulos: number;
  rigidezTorsion: number | null; rigidezFlexion: number | null;
  notas: string[];
}
export function evaluarChasis(version: 'largueros' | 'celosia', _tubos: Tubo[], _c: ContextoChasis): EvaluacionChasis {
  return { version, nombre: version === 'celosia' ? 'Versión 2 · celosía' : 'Versión 1 · largueros', masaKg: 0, nTubos: 0, largoM: 0, nNudos: 0, triangulos: 0, rigidezTorsion: null, rigidezFlexion: null, notas: ['pendiente'] };
}
