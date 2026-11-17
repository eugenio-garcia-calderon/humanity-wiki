import { E, type Est } from './forma';

/*
 * ELA Eclipse REVO autogyro: dimensions and the pod's shape (2026-11-17). The mesh is in `autogiroModelo.ts`, the
 * garage entry with its sources in `autogiro.ts`. Garage axes: x forward (nose wheel at x = 0), y up, z to the right; m.
 *
 * PUBLISHED: rotor 8.53 m and propeller 1.72 m (DULV type sheet of the ELA 10-Eclipse EVO, 988-22; the REVO is the
 * same airframe with a Rotax 916 iS and a reworked prerotator). Everything else here is ESTIMATED from photos (the one
 * Eugenio sent, copper, three-quarter front) and from the published rotor and propeller as scale: ELA does not publish
 * length, height, width, track or wheelbase in text (its technical sheet is an image that could not be fetched).
 */

/** Rotor and propeller diameters (m): published. */
export const ROTOR = 8.53, HELICE = 1.72;
/** Nose tip x (m). */
export const X_PUNTA = 0.42;
/** Main wheels: x of their axle and track (m). Estimated. */
export const X_PRINCIPAL = -1.95, VIA_PRINCIPAL = 1.70;
/** Wheel radii (m): nose and main. Estimated (the nose tyre is a 4.00-6 type, the mains similar). */
export const R_MORRO = 0.19, R_PRINCIPAL = 0.2;
/** Rotor mast: base and head (x, y), the blades' height and their back tilt (rad; level when parked, so the published-style height is the head). Estimated. */
export const MASTIL_BASE: [number, number] = [-1.86, 1.42], MASTIL_CABEZA: [number, number] = [-1.98, 2.56];
export const Y_ROTOR = 2.66, INCLINACION_ROTOR = 0;
/** Propeller hub (x, y): right behind the engine cowl. */
export const HELICE_CENTRO: [number, number] = [-2.5, 1.12];
/** The tail: the central fin's trailing edge is the aircraft's last point. */
export const X_COLA = -4.68;
export const LARGO = Math.round((X_PUNTA - X_COLA) * 100) / 100;
/** Width on the ground: the main wheel spats (the stabiliser is narrower). */
export const ANCHO = 1.94;
/** Height to the top of the rotor head. */
export const ALTO = 2.7;

/**
 * The pod, nose to the engine cowl's end: x, belly, top, half-widths low / middle / high, exponent.
 * The pointed nose sits low (its tip at about 0.58 m, over the nose wheel), the bubble canopy is the top half from
 * the windscreen to behind the rear seat, and the cowl over the engine tapers into the propeller hub. Cabin 0.80 m
 * wide (tandem seats).
 */
export const POD: Est[] = [
  E(X_PUNTA, 0.575, 0.595, 0.008, 0.01, 0.008, 2),
  E(0.30, 0.50, 0.70, 0.07, 0.09, 0.06, 2.1),
  E(0.10, 0.43, 0.84, 0.16, 0.20, 0.14, 2.2),
  E(-0.15, 0.37, 1.00, 0.25, 0.30, 0.22, 2.3),
  E(-0.45, 0.33, 1.25, 0.31, 0.37, 0.28, 2.4),
  E(-0.85, 0.31, 1.47, 0.34, 0.40, 0.31, 2.5),
  E(-1.25, 0.31, 1.55, 0.34, 0.40, 0.31, 2.5),
  E(-1.60, 0.33, 1.54, 0.32, 0.38, 0.28, 2.5),
  E(-1.95, 0.40, 1.48, 0.27, 0.34, 0.24, 2.4),
  E(-2.20, 0.55, 1.42, 0.20, 0.27, 0.19, 2.3),
  E(-2.36, 0.76, 1.34, 0.12, 0.17, 0.12, 2.2),
  E(-2.44, 1.05, 1.19, 0.03, 0.05, 0.03, 2),
];

/** The canopy seen from the side: an ellipse (centre x, y and half-axes) over the top half of the cabin. */
const CUPULA = { x: -0.98, y: 1.32, a: 0.84, b: 0.45 };
/** The canopy's lower edge at x (m): the bottom of that ellipse; Infinity where there is no glass. */
export const bordeCupula = (x: number): number => {
  const u = (x - CUPULA.x) / CUPULA.a;
  return Math.abs(u) < 1 ? CUPULA.y - CUPULA.b * Math.sqrt(1 - u * u) : Infinity;
};
