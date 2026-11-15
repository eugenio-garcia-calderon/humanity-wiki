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
 *
 * `fijas` (2026-11-13, «permite pinchar y arrastrar los modelos… para cambiarlos de posición»): cars that were dragged
 * somewhere, in the rows' own frame (the frame before the shift that puts `activo` at the origin, so a place does not
 * move when another design is opened). `origen` is where `activo` stands in that frame: a dropped car's place in the
 * frame is its place on screen plus `origen`.
 */
export function colocarFilas(fila1: CocheFila[], activo: string, fila2: CocheFila[], { huecoFila2 = HUECO_EN_FILA, fijas }: { huecoFila2?: number; fijas?: Map<string, Plaza> } = {}): { plazas: Map<string, Plaza>; origen: Plaza } {
  const marco = new Map<string, Plaza>();
  const x1 = enLinea(fila1, HUECO_EN_FILA), x2 = enLinea(fila2, huecoFila2);
  fila1.forEach((c, i) => marco.set(c.id, { x: x1[i], z: 0 }));
  if (fila2.length) {
    const ancho1 = Math.max(0, ...fila1.map(c => c.ancho)), ancho2 = Math.max(0, ...fila2.map(c => c.ancho));
    const z = Math.round((ancho1 / 2 + HUECO_ENTRE_FILAS + ancho2 / 2) * 100) / 100;
    const corrimiento = (fila1.length ? centro(fila1, x1) : 0) - centro(fila2, x2);
    fila2.forEach((c, i) => marco.set(c.id, { x: x2[i] + corrimiento, z }));
  }
  for (const [id, p] of fijas ?? []) if (marco.has(id)) marco.set(id, p);
  const origen = marco.get(activo) ?? { x: 0, z: 0 };
  const plazas = new Map<string, Plaza>();
  for (const [id, p] of marco) plazas.set(id, { x: Math.round((p.x - origen.x) * 1000) / 1000, z: Math.round((p.z - origen.z) * 1000) / 1000 });
  return { plazas, origen };
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

/**
 * The garage from the smallest to the largest (2026-11-15, Eugenio: «Garaje con todos los modelos desde el más
 * pequeño al más grande»): by length, then by kerb mass (a car with no known mass after the ones of the same length
 * that have one), then by name so the order never depends on the list it came from.
 */
export function compararTamano(a: { largo: number; masa?: number; nombre?: string }, b: { largo: number; masa?: number; nombre?: string }): number {
  const dl = Math.round(a.largo * 1000) - Math.round(b.largo * 1000);
  if (dl) return dl;
  const ma = a.masa ?? Infinity, mb = b.masa ?? Infinity;
  if (ma !== mb) return ma < mb ? -1 : 1;
  return (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es');
}
