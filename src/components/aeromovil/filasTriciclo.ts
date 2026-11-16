/**
 * Rows 2 and 3 of the Triciclo's «tres filas», row by row (2026-11-16). Eugenio: «permite fila a fila, que se pueda
 * escoger en la fila 2 y en la fila 3 de asientos, el número de plazas y el tipo de asiento».
 *
 * Each of the two rear rows chooses how many places it has (1, 2 or 3 side by side) and what kind of seat:
 *  - 'coche'    the car-style seat there was until now (cushion, bolsters, backrest; row 2's with a headrest), one per place;
 *  - 'banco'    a bench: one cushion and one backrest across the whole row (a headrest per place in row 2), lighter
 *               than separate seats; it folds as one piece;
 *  - 'plegable' a light flip seat (as a tram's or a van's jump seat): a thin pan and backrest on an aluminium frame,
 *               narrower and lighter, no headrest.
 * The defaults (row 2: two car seats; row 3: one car seat) are exactly the layout before this change.
 *
 * This file imports nothing from geometriaTriciclo.ts (that one imports this): plain data and functions.
 */

export type TipoAsientoFila = 'coche' | 'banco' | 'plegable';
export type NumFila = '1' | '2' | '3';

/**
 * The distance between two passengers' centres side by side (m): 49 cm, the shoulder breadth of an average man
 * (bideltoid 49 cm, ANSUR II 2012), so neighbouring shoulders just touch. It is 2 × `Z_FILA2` (geometriaTriciclo.ts),
 * so two places sit at ±24.5 cm, as row 2's two seats always have.
 */
export const PASO_PLAZA = 0.49;

/** A flip seat's size (m): a narrow pan and a short backrest, as a van's jump seat. A proposal, not a product. */
export const PLEGABLE = { ancho: 0.40, fondo: 0.36, respaldo: 0.46 } as const;

/** The centres (z, m) of `n` places side by side, right first (as row 2's two seats were listed: right, then left). */
export function zPlazas(n: number): number[] {
  return Array.from({ length: n }, (_, i) => ((n - 1) / 2 - i) * PASO_PLAZA);
}

/** The number of places a row's selector stores (1–3; anything else, the row's default). */
export const numFila = (v: string | undefined, defecto: number) => (v === '1' || v === '2' || v === '3' ? Number(v) : defecto);

/** What a seat of `tipo` in this row is, before it is placed: its size, from the row's car seat. */
export function medidasAsiento(tipo: TipoAsientoFila, coche: { ancho: number; fondo: number; respaldo: number }, n: number) {
  if (tipo === 'plegable') return { ancho: Math.min(coche.ancho, PLEGABLE.ancho), fondo: Math.min(coche.fondo, PLEGABLE.fondo), respaldo: Math.min(coche.respaldo, PLEGABLE.respaldo) };
  // a bench spans every place: from the outer edge of one end place to the other's
  if (tipo === 'banco') return { ...coche, ancho: (n - 1) * PASO_PLAZA + coche.ancho };
  return { ...coche };
}

/**
 * The seat's mass as a multiple of the «Masa de un asiento» slider. Estimates, not measured: a car seat with its
 * folding hinge 1.5 (row 3's smaller one 1.2), as until now; a bench 1.1 per place (1.0 in row 3): one frame and one
 * hinge for the whole row; a flip seat 0.8 (0.7 in row 3): a thin pan on a light frame.
 */
export function factorMasaAsiento(a: { fila: number; tipo?: TipoAsientoFila; plazas?: number }): number {
  const t = a.tipo ?? 'coche', n = a.plazas ?? 1;
  if (t === 'banco') return n * (a.fila === 3 ? 1.0 : 1.1);
  if (t === 'plegable') return a.fila === 3 ? 0.7 : 0.8;
  return a.fila === 3 ? 1.2 : 1.5;
}

/** The occupants' names in a row of `n` places (right first): «Fila 2 der.», «Fila 2 centro», «Fila 2 izq.»; one place: «Fila 2». */
export function nombrePlaza(fila: number, z: number, n: number): string {
  if (n === 1) return `Fila ${fila}`;
  return `Fila ${fila} ${z > 1e-9 ? 'der.' : z < -1e-9 ? 'izq.' : 'centro'}`;
}

/** The selectors' options. */
export const OPCIONES_NUM_FILA = [{ k: '1', n: 'Una plaza' }, { k: '2', n: 'Dos plazas' }, { k: '3', n: 'Tres plazas' }];
export const OPCIONES_TIPO_FILA = [
  { k: 'coche', n: 'Asientos de coche (uno por plaza)' },
  { k: 'banco', n: 'Banco corrido (uno para toda la fila)' },
  { k: 'plegable', n: 'Plegables ligeros (tipo transportín)' },
];
/** How the page names a row's seats, for its sentences. */
export const NOMBRE_TIPO_FILA: Record<TipoAsientoFila, [string, string]> = { coche: ['asiento de coche', 'asientos de coche'], banco: ['banco corrido', 'banco corrido'], plegable: ['asiento plegable', 'asientos plegables'] };

/** Rows 2 and 3 as chosen: places side by side, their centres (z, right first) and the kind of seat. Defaults: 2 + 1 car seats. */
export function filasDetras(T: { tFila2N?: string; tFila3N?: string; tFila2Tipo?: string; tFila3Tipo?: string }): { fila: 2 | 3; n: number; zs: number[]; tipo: TipoAsientoFila }[] {
  const tipo = (v: string | undefined): TipoAsientoFila => (v === 'banco' || v === 'plegable' ? v : 'coche');
  return ([[2, numFila(T.tFila2N, 2), tipo(T.tFila2Tipo)], [3, numFila(T.tFila3N, 1), tipo(T.tFila3Tipo)]] as const).map(([fila, n, t]) => ({ fila, n, zs: zPlazas(n), tipo: t }));
}

/** A rear row in words, for the page: «dos asientos de coche juntos», «un banco corrido de tres plazas», «un asiento plegable en el centro». */
export function fraseFila(r: { fila: 2 | 3; n: number; tipo: TipoAsientoFila }): string {
  const num = ['una', 'dos', 'tres'][r.n - 1] ?? String(r.n), [uno, varios] = NOMBRE_TIPO_FILA[r.tipo];
  if (r.tipo === 'banco') return `un banco corrido de ${num} plaza${r.n > 1 ? 's' : ''}`;
  const peq = r.fila === 3 && r.tipo === 'coche';
  if (r.n === 1) return `un ${uno}${peq ? ' más pequeño' : ''} en el centro`;
  return `${r.n === 2 ? 'dos' : 'tres'} ${varios}${peq ? ' más pequeños' : ''} juntos`;
}

/** The header's words for three rows: «Cuatro plazas en tres filas (1 + 2 + 1)», with the rows as chosen. */
export function rotuloFilas(T: Parameters<typeof filasDetras>[0]): string {
  const [f2, f3] = filasDetras(T), n = 1 + f2.n + f3.n;
  const num = ['', 'Una', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete'][n] ?? String(n);
  return `${num} plazas en tres filas (1 + ${f2.n} + ${f3.n})`;
}
