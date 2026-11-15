import { E, areaFrontal, envolventeDe, type Est } from './forma';

/*
 * Shape of the Mercedes-Benz Vision EQXX (2022) for the garage: two bodies of
 * superelliptic stations (`forma.ts`), the lower body and the glass
 * greenhouse sitting on it, from which the mesh (`eqxxModelo.ts`), the wind
 * tunnel silhouette and the frontal area all come. Built the same way as the
 * Model Y (`modeloYForma.ts`).
 *
 * Garage axes: X forward (nose at x > 0), Y up, Z sideways. Front axle at
 * x = 0, rear axle at x = −BATALLA, ground at y = 0. Metres.
 *
 * PUBLISHED (sources in `eqxx.ts`): length 4 977 mm, width 1 870 mm, height
 * 1 350 mm, wheelbase 2 800 mm, rear track 50 mm narrower than the front,
 * tyres 185/65 R20, wheels flush with the body, a teardrop profile ending in a
 * kammback, conventional mirrors, light bars across the front and the rear,
 * solar cells on the roof. Frontal area 2.12 m².
 *
 * ESTIMATED (no dimensioned drawing, and no photo could be looked at: image
 * hosts are blocked from the environment it was built in; the shape follows
 * the figures and the written descriptions):
 * - Overhangs 0.92 m front and 1.257 m rear (only their sum, 2.177 m,
 *   follows from the length and the wheelbase; the EQXX's tail is long).
 * - Tracks 1.585 m front and 1.535 m rear (only their difference is published).
 * - Ground clearance 0.13 m; the side-view lines: a low nose (tip at about
 *   0.46 m), the hood rising to the cowl at x ≈ −0.25 m and 0.88 m, a long
 *   windscreen to the roof's peak (the published height) at x ≈ −1.75 m, then
 *   a long falling roof to the cut-off tail at about 0.95 m.
 * - In plan, the body narrows from the rear wheels to the tail (0.70 m a
 *   side at the cut), the «teardrop» the descriptions speak of; the
 *   greenhouse narrows strongly towards the roof.
 */

export const LARGO = 4.977, ANCHO = 1.87, ALTO = 1.35, BATALLA = 2.8;
/** Estimated: only «the rear track is 50 mm narrower than the front» is published. */
export const VIA_DEL = 1.585, VIA_TRAS = 1.535;
/** Overhangs: estimated split of the published 2.177 m. */
export const VOLADIZO_DEL = 0.92;
export const X_MORRO = VOLADIZO_DEL, X_COLA = VOLADIZO_DEL - LARGO; // 0.92 and −4.057
/** 185/65 R20: 0.508 + 2 × 0.185 × 0.65 = 0.7485 m. */
export const R_RUEDA = 0.374, ANCHO_RUEDA = 0.185, R_LLANTA = 0.254;
/** Wheel openings in side view: a circle round each wheel (centre a little above the axle). */
export const ARCO = { y: 0.388, r: 0.415, zDentro: 0.64 };

/** Lower body: from the nose to the tail; its top is the hood and, under the greenhouse, a hidden deck. */
const CUERPO_AJUSTE: Est[] = [
  E(0.920, 0.400, 0.520, 0.000, 0.300, 0.080, 2.00),
  E(0.910, 0.330, 0.580, 0.300, 0.400, 0.300, 2.60),
  E(0.890, 0.260, 0.630, 0.560, 0.580, 0.500, 3.10),
  E(0.850, 0.210, 0.665, 0.660, 0.680, 0.600, 3.50),
  E(0.780, 0.180, 0.700, 0.740, 0.760, 0.680, 3.80),
  E(0.650, 0.160, 0.735, 0.820, 0.830, 0.750, 3.90),
  E(0.450, 0.145, 0.790, 0.870, 0.880, 0.800, 4.60),
  E(0.250, 0.140, 0.850, 0.900, 0.910, 0.840, 5.20),
  E(0.000, 0.130, 0.895, 0.920, 0.930, 0.870, 5.60),
  E(-0.300, 0.130, 0.895, 0.925, 0.932, 0.875, 5.30),
  E(-0.600, 0.130, 0.890, 0.925, 0.935, 0.875, 4.80),
  E(-1.000, 0.130, 0.900, 0.925, 0.935, 0.880, 4.60),
  E(-1.500, 0.130, 0.905, 0.925, 0.935, 0.880, 4.50),
  E(-2.000, 0.130, 0.910, 0.920, 0.930, 0.875, 4.50),
  E(-2.500, 0.135, 0.915, 0.910, 0.925, 0.865, 4.50),
  E(-2.900, 0.145, 0.920, 0.895, 0.915, 0.850, 4.60),
  E(-3.300, 0.170, 0.925, 0.870, 0.890, 0.820, 4.40),
  E(-3.600, 0.210, 0.930, 0.830, 0.855, 0.780, 4.20),
  E(-3.850, 0.280, 0.935, 0.780, 0.800, 0.720, 4.00),
  E(-3.980, 0.340, 0.935, 0.740, 0.760, 0.670, 3.80),
  E(X_COLA, 0.420, 0.925, 0.690, 0.710, 0.610, 3.60),
];
/** Scaled so the body is the published 1.870 m wide (the fit's widest point is measured, not guessed). */
const anchoAjuste = (() => {
  let m = 0;
  for (const e of CUERPO_AJUSTE) for (let k = 0; k <= 40; k++) {
    const t = k / 40, w = Math.max(0, e.wb * (1 - t) * (1 - 2 * t) + 4 * e.wm * t * (1 - t) + e.wt * t * (2 * t - 1));
    m = Math.max(m, w);
  }
  return m;
})();
const K_ANCHO = (ANCHO / 2) / anchoAjuste;
export const CUERPO: Est[] = CUERPO_AJUSTE.map(e => ({ ...e, wb: e.wb * K_ANCHO, wm: e.wm * K_ANCHO, wt: e.wt * K_ANCHO }));

/**
 * The greenhouse (windscreen, side windows, the solar roof, rear glass): from the cowl to the tail. Its lower part
 * (down to 0.70 m) is buried in the lower body, so it comes out of it along the beltline with no gap.
 */
export const CABINA: Est[] = [
  E(-0.220, 0.700, 0.890, 0.800, 0.760, 0.520, 6),
  E(-0.300, 0.700, 0.935, 0.810, 0.760, 0.520, 6),
  E(-0.450, 0.700, 1.010, 0.820, 0.760, 0.520, 6),
  E(-0.700, 0.700, 1.130, 0.830, 0.750, 0.560, 6),
  E(-1.000, 0.700, 1.240, 0.840, 0.740, 0.580, 6),
  E(-1.350, 0.700, 1.320, 0.840, 0.735, 0.600, 6),
  E(-1.750, 0.700, 1.350, 0.840, 0.735, 0.600, 6),
  E(-2.150, 0.700, 1.335, 0.835, 0.735, 0.590, 6),
  E(-2.550, 0.700, 1.290, 0.825, 0.730, 0.570, 6),
  E(-2.950, 0.700, 1.220, 0.800, 0.720, 0.540, 6),
  E(-3.300, 0.700, 1.140, 0.770, 0.700, 0.510, 6),
  E(-3.600, 0.700, 1.060, 0.730, 0.670, 0.480, 6),
  E(-3.850, 0.700, 0.990, 0.680, 0.630, 0.450, 6),
  E(-3.950, 0.700, 0.950, 0.640, 0.590, 0.420, 6),
];

/** Silhouette for the wind tunnel: the lower body's, with the greenhouse's top where it is higher. */
export function envolvente(): [number, number, number, number][] {
  const cuerpo = envolventeDe(CUERPO), cabina = envolventeDe(CABINA);
  return cuerpo.map(([x, yb, yt, hw]) => {
    let k = 0; while (k < cabina.length - 2 && !((cabina[k][0] - x) * (cabina[k + 1][0] - x) <= 0)) k++;
    const a = cabina[k], b = cabina[k + 1];
    if (!b || (a[0] - x) * (b[0] - x) > 0) return [x, yb, yt, hw];
    const t = b[0] !== a[0] ? (x - a[0]) / (b[0] - a[0]) : 0, ytc = a[2] + (b[2] - a[2]) * t;
    return [x, yb, Math.round(Math.max(yt, ytc) * 1000) / 1000, hw];
  });
}

/** Mirror heads (each side): centre and half-sizes. Small, on short stalks (the EQXX kept glass mirrors). */
export const ESPEJO = { x: -0.48, y: 0.96, z: 0.985, a: 0.065, b: 0.042, c: 0.075 };

/** Frontal area (m²): lower body, greenhouse, mirrors and the tyres below the body. */
export function area(): number {
  const ruedas = [1, -1].map(s => ({ rect: [s * VIA_DEL / 2 - ANCHO_RUEDA / 2, s * VIA_DEL / 2 + ANCHO_RUEDA / 2, 0, 0.18] as [number, number, number, number] }));
  const espejos = [1, -1].map(s => ({ rect: [Math.min(s * (ESPEJO.z - ESPEJO.c), s * (ESPEJO.z + ESPEJO.c)), Math.max(s * (ESPEJO.z - ESPEJO.c), s * (ESPEJO.z + ESPEJO.c)), ESPEJO.y - ESPEJO.b, ESPEJO.y + ESPEJO.b] as [number, number, number, number] }));
  return areaFrontal([{ es: CUERPO, z0: 0 }, { es: CABINA, z0: 0 }, ...ruedas, ...espejos]);
}
