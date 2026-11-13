// ============================================================================
// The garage in two rows (2026-11-13)
// ============================================================================
// Eugenio: «quiero que todos los diseños estén en el desplegable… todos esos estén desplegados en el garaje, en la
// primera fila. En la segunda fila pones los otros que no son proyectos que se puedan modificar… como el Aptera y el
// Tesla, que están atrás». The rows are seen from the default camera, which looks at the cars from their left side
// (from −z): a row is a line of cars across the screen, nose to tail along x, and the second row stands behind the
// first, further from the camera (+z). Lined up across z instead, each car would hide the next one from that camera.
//
// The design being edited is always at the origin (the viewer builds it there, and its dimension lines, tunnel and
// labels assume it), so the whole layout is shifted to put that design's front axle at x = 0, z = 0. Picking another
// design shifts the layout again; the viewer moves the camera by the same amount and then eases it onto the new one.
//
// Pure functions, no three.js: the page and the scripts can call them.

/** A car in a row: where its nose and tail are from its own front axle (x, m; the nose is > 0), and its width (m). */
export interface CocheFila { id: string; morro: number; cola: number; ancho: number }
export interface Plaza { x: number; z: number }

/** Free length between one car's tail and the next car's nose in a row (m). */
export const HUECO_EN_FILA = 1.2;
/** With the wind tunnel on, the reference cars' wakes need room before the next car (m). */
export const HUECO_CON_TUNEL = 3.5;
/** Free width between the widest car of the first row and the widest of the second (m). */
export const HUECO_ENTRE_FILAS = 1.4;

/** Front-axle x of each car in a line, the first at 0 and the rest behind it (towards −x), `hueco` apart. */
function enLinea(coches: CocheFila[], hueco: number): number[] {
  const xs: number[] = [];
  coches.forEach((c, i) => { xs.push(i === 0 ? 0 : xs[i - 1] + coches[i - 1].cola - hueco - c.morro); });
  return xs;
}
const centro = (coches: CocheFila[], xs: number[]) => coches.length ? (xs[0] + coches[0].morro + xs[xs.length - 1] + coches[coches.length - 1].cola) / 2 : 0;

/**
 * Where every car goes. `fila1` is our designs in the list's order (the first one leftmost on screen, which is +x);
 * `activo` is the id of the one being edited, which lands at the origin; `fila2` is the reference cars on show,
 * centred behind the first row. A car missing from the result is not placed (an empty row, or `activo` not in it).
 */
export function colocarFilas(fila1: CocheFila[], activo: string, fila2: CocheFila[], { huecoFila2 = HUECO_EN_FILA } = {}): Map<string, Plaza> {
  const out = new Map<string, Plaza>();
  const x1 = enLinea(fila1, HUECO_EN_FILA), x2 = enLinea(fila2, huecoFila2);
  const k = fila1.findIndex(c => c.id === activo);
  const dx = k >= 0 ? -x1[k] : 0;
  fila1.forEach((c, i) => out.set(c.id, { x: x1[i] + dx, z: 0 }));
  if (fila2.length) {
    const ancho1 = Math.max(0, ...fila1.map(c => c.ancho)), ancho2 = Math.max(0, ...fila2.map(c => c.ancho));
    const z = Math.round((ancho1 / 2 + HUECO_ENTRE_FILAS + ancho2 / 2) * 100) / 100;
    const corrimiento = (fila1.length ? centro(fila1, x1) : 0) - centro(fila2, x2) + dx;
    fila2.forEach((c, i) => out.set(c.id, { x: x2[i] + corrimiento, z }));
  }
  return out;
}

/** «Cuadriciclo Bala clásico (copia)», or «… (copia 2)» and up if that name is taken. At most 80 characters (the server's limit). */
export function nombreDeCopia(nombre: string, ocupados: string[]): string {
  const base = nombre.replace(/ \(copia(?: \d+)?\)$/, '');
  const usado = new Set(ocupados);
  for (let n = 1; ; n++) {
    const sufijo = n === 1 ? ' (copia)' : ` (copia ${n})`;
    const candidato = base.slice(0, 80 - sufijo.length) + sufijo;
    if (!usado.has(candidato)) return candidato;
  }
}
