// The steering's geometry, as numbers (2026-11-24): what the angles of the two front wheels must be, the turning circle,
// how much rack a steering arm needs. Pure, no three.js. The model's own 3D uses the IDEAL Ackermann wheel angles
// (`triciclo/medidas.ts` `anguloFuera`): this file is the same formula, written out for the screens that explain it.
//
// Axes of the top view: x forward (the front axle at x = 0, the rear axle at x = -L), z to the right of the driver.
// Angles in degrees on the way in and out, radians inside.

const RAD = Math.PI / 180, DEG = 180 / Math.PI;

/** The outer wheel's angle (°) that makes the two wheels' perpendiculars meet on the rear axle, for an inner wheel at `dentro` (°). */
export function fueraIdeal(dentro: number, batalla: number, via: number): number {
  const di = Math.abs(dentro) * RAD;
  if (di < 1e-9) return 0;
  return Math.atan(batalla / (batalla / Math.tan(di) + via)) * DEG;
}

export interface PuntoCurva { dentro: number; fuera: number; paralelo: number; diferencia: number; radio: number }
/** The ideal outer angle against the inner one, from straight ahead to `maximo`°, next to what parallel steering would give (the outer = the inner). */
export function curvaAckermann(batalla: number, via: number, maximo: number, pasos = 12): PuntoCurva[] {
  const o: PuntoCurva[] = [];
  for (let i = 0; i <= pasos; i++) {
    const dentro = maximo * i / pasos, fuera = fueraIdeal(dentro, batalla, via);
    o.push({ dentro, fuera, paralelo: dentro, diferencia: dentro - fuera, radio: fuera > 1e-6 ? batalla / Math.sin(fuera * RAD) : Infinity });
  }
  return o;
}

export interface CirculoGiro {
  /** from the turning centre to the inner wheel, to the middle of the rear axle and to the outer wheel's tyre (m) */
  dentro: number; centroEje: number; fuera: number;
  /** the whole circle the outer wheel draws (m) */
  diametro: number;
}
/** The turning circle at an inner angle: the centre sits on the rear axle's line, `batalla / tan(dentro)` from the inner wheel. */
export function circuloDeGiro(dentro: number, batalla: number, via: number): CirculoGiro | null {
  const di = Math.abs(dentro) * RAD;
  if (di < 1e-6) return null;
  const rDentro = batalla / Math.tan(di), rFuera = Math.hypot(rDentro + via, batalla);
  return { dentro: rDentro, centroEje: rDentro + via / 2, fuera: rFuera, diametro: 2 * rFuera };
}

/**
 * The angle (°) of each steering arm to the car's centre line when the arms, extended, meet at the middle of the rear
 * axle: the classic construction of 100 % Ackermann. Arms pointing to the rear axle's centre from each kingpin.
 */
export const anguloBrazoAckermann = (batalla: number, via: number) => Math.atan((via / 2) / batalla) * DEG;

/**
 * About how long the steering arm has to be so that a rack travelling `recorridoPorLado` (m) to each side turns the inner
 * wheel to `dentro`°: the arm's tip moves sideways by its length × sin(angle). A first-order figure (arm at a right
 * angle to the rod at the centre), enough to see whether a rack is in the right range, not to draw the arm.
 */
export const brazoNecesario = (recorridoPorLado: number, dentro: number) => recorridoPorLado / Math.sin(Math.max(1e-6, Math.abs(dentro) * RAD));

/** Turns of the steering wheel from lock to lock and the ratio (degrees of wheel per degree of road wheel) of a rack, for the inner wheel at its lock. */
export function relacionDeDireccion(vueltasTopeATope: number, dentro: number, fuera: number) {
  const ruedaGrados = vueltasTopeATope * 360, medias = (dentro + fuera) / 2;
  return { vueltasTopeATope, ratio: medias > 0 ? ruedaGrados / (2 * medias) : Infinity };
}

/** How much the two wheels disagree with parallel steering at full lock (°): how much one of them has to skid sideways in every turn. */
export const errorParalelo = (dentro: number, batalla: number, via: number) => Math.abs(dentro) - fueraIdeal(dentro, batalla, via);
