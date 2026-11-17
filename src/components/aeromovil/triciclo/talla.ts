// The occupants' size: height and build per seat, and what follows from them (2026-11-17, Eugenio).
// Eugenio: «También en la parte de interior permite cambiar el tamaño de los muñecos para que sean más altos o más
// gordos para ver cómo entran en el vehículo.»
//
// Pure (no three.js). The model (`modelo.ts`) builds each rider with `cuerpoDe`: the stature scales every segment
// (the figure's `escala`, 1 = today's figure), the build scales the widths and the belly, and the mass follows both.
// The fit checks that use them are in `ajusteOcupantes.ts`; the side-panel block is `../TallasOcupantes.tsx`.
//
// The fields are optional and live only here (`CamposTalla`): absent, a rider is today's figure — the 1.756 m man of
// ANSUR II, medium build — with today's mass (`tMOcc`), so every saved design opens exactly as before.
// (They are not in `CamposTriciclo` / `TRICICLO_DEFECTO` yet: see memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md.)
import type { Parametros } from '../geometria';

export type Complexion = 'delgado' | 'medio' | 'corpulento' | 'muy';
/** Stature (m), build and, optionally, a mass typed by hand (kg) for the pilot (`…Pil`) and the passengers (`…Pas`). */
export interface CamposTalla {
  tTallaPil?: number; tTallaPas?: number;
  tComplPil?: Complexion; tComplPas?: Complexion;
  tMPil?: number; tMPas?: number;
}
export type ClaveTalla = keyof CamposTalla;

/**
 * The stature of today's figure (escala 1): the mean US Army man of ANSUR II (Gordon et al., 2014: stature 175.6 cm,
 * sitting height 91.8 cm — the `TALLA_SENTADO.p50` the head checks already use). Every segment scales with stature
 * over this (sitting height is ~52 % of stature for men and women alike, so one ratio is enough for this purpose).
 */
export const ESTATURA_MEDIA = 1.756;
export const ESTATURA_MIN = 1.45, ESTATURA_MAX = 2.05;
/** Masses a person can be typed with by hand (kg). */
export const MASA_MIN = 40, MASA_MAX = 160;

/**
 * Reference statures (m), rounded. Women P5/P50 and men P50/P95/P99: ANSUR II (Gordon et al., 2014; women 162.9 ± 6.4
 * cm, men 175.6 ± 6.9 cm, the percentiles from the normal fit). The very tall: young Dutch men, the tallest population
 * measured (DINED, TU Delft, 2004: 20–30-year-old men's P99 about 2.00 m).
 */
export const TALLAS: { k: string; n: string; m: number }[] = [
  { k: 'mP5', n: 'Mujer baja (P5) · 1,52 m', m: 1.52 },
  { k: 'mP50', n: 'Mujer media (P50) · 1,63 m', m: 1.63 },
  { k: 'hP50', n: 'Hombre medio (P50) · 1,76 m', m: ESTATURA_MEDIA },
  { k: 'hP95', n: 'Hombre alto (P95) · 1,87 m', m: 1.87 },
  { k: 'hP99', n: 'Muy alto (P99) · 1,92 m', m: 1.92 },
  { k: 'nl99', n: 'Neerlandés muy alto (P99) · 2,00 m', m: 2.00 },
];

/**
 * Builds. `ancho`: shoulders, hips and thighs (×, over the stature's own scaling); `fondo`: chest and belly depth (×);
 * `imc`: the body-mass index the mass follows. «Medio» is today's figure (factors 1); its 26 kg/m² is the reference, so
 * a medium man of 1.756 m weighs exactly `tMOcc` (80 kg by default = 25.9 kg/m²). The others: WHO's bands (normal
 * 18.5–25, overweight 25–30, obese ≥ 30) and, for the widths, the spread of hip and chest breadth in ANSUR II (P5 to
 * P95 is about ±10 % of the mean; the belly depth about ±25 %).
 */
export const COMPLEXIONES: { k: Complexion; n: string; ancho: number; fondo: number; imc: number }[] = [
  { k: 'delgado', n: 'Delgado', ancho: 0.92, fondo: 0.85, imc: 21 },
  { k: 'medio', n: 'Medio', ancho: 1, fondo: 1, imc: 26 },
  { k: 'corpulento', n: 'Corpulento', ancho: 1.10, fondo: 1.30, imc: 31 },
  { k: 'muy', n: 'Muy corpulento', ancho: 1.20, fondo: 1.60, imc: 37 },
];
const IMC_REFERENCIA = 26;

/** One rider's size, as the model and the viewer use it. */
export interface Cuerpo {
  /** Stature (m) and its ratio to today's figure: every segment length is multiplied by `k`. */
  estatura: number; k: number;
  complexion: Complexion;
  /** Widths (shoulders, hips, thighs) and depths (chest, belly), ×, on top of `k`. */
  ancho: number; fondo: number;
  /** Mass (kg): by hand, or `tMOcc` × (stature / 1.756)² × (BMI / 26). */
  kg: number; kgEstimada: number; aMano: boolean;
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** The pilot's or the passengers' size, from the design (absent fields: today's figure). `mBase`: `tMOcc`. */
export function cuerpoDe(P: Partial<Parametros>, piloto: boolean, mBase: number): Cuerpo {
  const Q = P as Partial<Parametros> & CamposTalla;
  const h = num(piloto ? Q.tTallaPil : Q.tTallaPas), estatura = h == null ? ESTATURA_MEDIA : limitar(h, ESTATURA_MIN, ESTATURA_MAX);
  const ck = piloto ? Q.tComplPil : Q.tComplPas, c = COMPLEXIONES.find(x => x.k === ck) ?? COMPLEXIONES[1];
  const k = estatura / ESTATURA_MEDIA;
  const kgEstimada = mBase * k * k * (c.imc / IMC_REFERENCIA);
  const mano = num(piloto ? Q.tMPil : Q.tMPas);
  return { estatura, k, complexion: c.k, ancho: c.ancho, fondo: c.fondo, kgEstimada, kg: mano == null ? kgEstimada : limitar(mano, MASA_MIN, MASA_MAX), aMano: mano != null };
}

/** True when a design has changed nobody's size: the figure and the mass are today's. */
export const tallaDeSerie = (P: Partial<Parametros>) => {
  const Q = P as CamposTalla;
  return Q.tTallaPil == null && Q.tTallaPas == null && Q.tComplPil == null && Q.tComplPas == null && Q.tMPil == null && Q.tMPas == null;
};

/** «1,92 m, corpulento, 95 kg». */
export function textoCuerpo(c: Cuerpo): string {
  const n = COMPLEXIONES.find(x => x.k === c.complexion)!.n.toLowerCase();
  return `${c.estatura.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m, ${n}, ${Math.round(c.kg)} kg`;
}

// ── the figure's dimensions at escala 1, the ones the viewer (visor/ocupante.ts) draws and the fit checks measure
/** Half the shoulders' width to the outside of the arm (m): the shoulder ball's centre 19 cm out, 6 cm round. */
export const MEDIO_HOMBROS = 0.25;
/** Half the hips' width (m): the pelvis capsule, 12 cm × 1.35 across. */
export const MEDIA_CADERA = 0.162;
/** The belly ahead of the trunk's axis (m): the abdomen capsule, 12 cm × 0.8 deep. */
export const VIENTRE = 0.096;
/** A knee's radius (m): the thigh capsule's 6.8 cm (the checks of the knees used 6 cm). */
export const RADIO_RODILLA = 0.06;
/** The foot from the ankle to the toes (m). */
export const PIE = 0.17;
