import { E, areaFrontal, envolventeDe, type Est } from './forma';

/*
 * Shape of the Tesla Model Y (2025 «Juniper» refresh) for the garage: two
 * bodies of superelliptic stations (`forma.ts`), the lower body and the glass
 * greenhouse sitting on it, from which the mesh (`modeloYModelo.ts`), the wind
 * tunnel silhouette and the frontal area all come.
 *
 * Garage axes: X forward (nose at x > 0), Y up, Z sideways. Front axle at
 * x = 0, rear axle at x = −BATALLA, ground at y = 0. Metres.
 *
 * PUBLISHED (sources in `modeloY.ts`): length 4 797 mm, width 1 920 mm without
 * mirrors (2 129 mm with them), height 1 624 mm, wheelbase 2 890 mm, tracks
 * 1 636 mm front and rear, ground clearance 167 mm, tyres 255/45 R19.
 *
 * ESTIMATED (no dimensioned drawing was available, and no photos were used:
 * image hosts are usually blocked from the environment it was built in and
 * none was tried. The shape comes from the published figures and from written
 * descriptions of the car):
 * - Overhangs 0.93 m front and 0.977 m rear (only their sum, 1.907 m, follows
 *   from the published length and wheelbase).
 * - Side-view lines: a blunt nose, its tip at about 0.48 m, the hood's leading
 *   edge (where the light bar runs) at about 0.82 m, cowl at x = −0.36 m and
 *   1.03 m, windscreen rising to the roof at x ≈ −1.45, roof peak (the published height) at x ≈ −1.75, then
 *   the fastback down to a short ducktail at about 1.14 m, and a near-vertical tail.
 * - Beltline from 1.00 m at the A-pillar to 1.10 m at the tail; greenhouse
 *   half-width 0.875 m at the beltline narrowing to 0.565 m at the roof
 *   (tumblehome); body sides almost vertical, widest (0.96 m) at about 0.72 m.
 * Each station's (wb, wm, wt, n) was fitted by least squares to target
 * half-widths at four or five heights (the targets above); the fit is within
 * 5–15 mm at the targets. After a first look at the model (2026-11-12) the nose
 * and hood were raised 2–6 cm (the first try read as a low sedan's wedge),
 * keeping each station's widths.
 */

export const LARGO = 4.797, ANCHO = 1.92, ALTO = 1.624, BATALLA = 2.89;
export const VIA_DEL = 1.636, VIA_TRAS = 1.636;
/** Overhangs: estimated split of the published 1.907 m. */
export const VOLADIZO_DEL = 0.93;
export const X_MORRO = VOLADIZO_DEL, X_COLA = VOLADIZO_DEL - LARGO; // 0.93 and −3.867
/** 255/45 R19: 0.4826 + 2 × 0.255 × 0.45 = 0.712 m. */
export const R_RUEDA = 0.356, ANCHO_RUEDA = 0.255, R_LLANTA = 0.2413;
/** Wheel openings in side view: a circle round each wheel (centre a little above the axle). */
export const ARCO = { y: 0.385, r: 0.43, zDentro: 0.60 };

/** Lower body: from the nose to the tail, its top is the hood and, under the greenhouse, a hidden deck. */
const CUERPO_AJUSTE: Est[] = [
  E(0.930, 0.420, 0.540, 0.000, 0.320, 0.091, 2.00),
  E(0.925, 0.390, 0.590, 0.302, 0.396, 0.310, 2.60),
  E(0.915, 0.335, 0.670, 0.557, 0.552, 0.522, 3.10),
  E(0.900, 0.306, 0.725, 0.628, 0.626, 0.588, 3.50),
  E(0.880, 0.284, 0.775, 0.704, 0.700, 0.663, 3.80),
  E(0.850, 0.265, 0.815, 0.804, 0.774, 0.760, 3.86),
  E(0.800, 0.257, 0.845, 0.879, 0.830, 0.834, 3.87),
  E(0.720, 0.243, 0.865, 0.949, 0.876, 0.903, 3.87),
  E(0.600, 0.230, 0.885, 1.004, 0.912, 0.956, 3.89),
  E(0.450, 0.215, 0.905, 1.043, 0.933, 0.994, 3.91),
  E(0.250, 0.204, 0.932, 1.062, 0.943, 1.013, 3.95),
  E(0.000, 0.190, 0.958, 1.075, 0.946, 1.027, 4.00),
  E(-0.250, 0.180, 0.990, 1.079, 0.946, 1.032, 4.06),
  E(-0.360, 0.176, 1.030, 1.076, 0.945, 1.031, 4.16),
  E(-0.600, 0.171, 1.060, 1.076, 0.945, 1.032, 4.22),
  E(-0.900, 0.168, 1.075, 1.075, 0.945, 1.032, 4.25),
  E(-1.200, 0.167, 1.086, 1.074, 0.945, 1.032, 4.28),
  E(-1.450, 0.167, 1.093, 1.072, 0.945, 1.030, 4.31),
  E(-1.750, 0.167, 1.101, 1.069, 0.945, 1.027, 4.34),
  E(-2.050, 0.167, 1.110, 1.066, 0.946, 1.025, 4.38),
  E(-2.350, 0.169, 1.119, 1.061, 0.946, 1.021, 4.42),
  E(-2.700, 0.182, 1.130, 1.048, 0.947, 1.009, 4.52),
  E(-3.000, 0.203, 1.140, 1.033, 0.949, 0.996, 4.61),
  E(-3.300, 0.240, 1.146, 1.018, 0.946, 0.981, 4.63),
  E(-3.550, 0.290, 1.148, 0.994, 0.926, 0.956, 4.56),
  E(-3.720, 0.340, 1.140, 0.945, 0.881, 0.906, 4.46),
  E(-3.800, 0.381, 1.110, 0.863, 0.810, 0.825, 4.34),
  E(-3.850, 0.432, 1.050, 0.710, 0.681, 0.675, 4.19),
  E(X_COLA, 0.450, 0.860, 0.547, 0.629, 0.502, 4.83),
];
/** The fit overshoots the widest point by 11 mm a side (0.971 m): scaled so the body is the published 1.920 m wide. */
const K_ANCHO = 0.96 / 0.971;
export const CUERPO: Est[] = CUERPO_AJUSTE.map(e => ({ ...e, wb: e.wb * K_ANCHO, wm: e.wm * K_ANCHO, wt: e.wt * K_ANCHO }));

/**
 * The greenhouse (windscreen, glass roof, side windows, rear glass): from the
 * cowl to where the rear glass meets the ducktail. Its lower part and both
 * ends are inside the lower body.
 */
export const CABINA: Est[] = [
  E(-0.330, 0.901, 1.000, 0.874, 0.821, 0.559, 6),
  E(-0.360, 0.902, 1.040, 0.874, 0.821, 0.559, 6),
  E(-0.450, 0.904, 1.096, 0.874, 0.821, 0.559, 6),
  E(-0.600, 0.909, 1.190, 0.874, 0.821, 0.559, 6),
  E(-0.900, 0.917, 1.370, 0.938, 0.786, 0.634, 6),
  E(-1.200, 0.926, 1.525, 0.959, 0.773, 0.669, 6),
  E(-1.450, 0.933, 1.597, 0.967, 0.769, 0.681, 6),
  E(-1.750, 0.941, 1.624, 0.969, 0.768, 0.684, 6),
  E(-2.050, 0.950, 1.615, 0.967, 0.769, 0.681, 6),
  E(-2.350, 0.959, 1.575, 0.962, 0.772, 0.672, 6),
  E(-2.700, 0.970, 1.490, 0.949, 0.779, 0.651, 6),
  E(-3.000, 0.980, 1.390, 0.929, 0.792, 0.620, 6),
  E(-3.300, 0.989, 1.270, 0.890, 0.812, 0.601, 6),
  E(-3.550, 0.996, 1.175, 0.890, 0.812, 0.601, 6),
  E(-3.700, 1.000, 1.130, 0.890, 0.812, 0.601, 6),
];

/** Beltline (side view): where the side glass starts. */
export const CINTURA: [number, number][] = [[-0.3, 1.0], [-1.0, 1.02], [-2.4, 1.06], [-3.0, 1.08], [-3.7, 1.10]];

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

/** Mirror heads (each side): x, y, z of the centre and half-sizes; with them the car is 2.129 m wide. */
export const ESPEJO = { x: -0.56, y: 1.07, z: 0.985, a: 0.075, b: 0.05, c: 0.08 };

/** Frontal area (m²): lower body, greenhouse, mirrors and the tyres below the body. */
export function area(): number {
  const ruedas = [1, -1].map(s => ({ rect: [s * VIA_DEL / 2 - ANCHO_RUEDA / 2, s * VIA_DEL / 2 + ANCHO_RUEDA / 2, 0, 0.215] as [number, number, number, number] }));
  // (a rect is [z0, z1, y0, y1])
  const espejos = [1, -1].map(s => ({ rect: [Math.min(s * (ESPEJO.z - ESPEJO.c), s * (ESPEJO.z + ESPEJO.c)), Math.max(s * (ESPEJO.z - ESPEJO.c), s * (ESPEJO.z + ESPEJO.c)), ESPEJO.y - ESPEJO.b, ESPEJO.y + ESPEJO.b] as [number, number, number, number] }));
  return areaFrontal([{ es: CUERPO, z0: 0 }, { es: CABINA, z0: 0 }, ...ruedas, ...espejos]);
}
