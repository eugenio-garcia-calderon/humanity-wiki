import { E, areaFrontal, envolventeDe, type Est } from './forma';

/*
 * Shape of the Lumeneo Smera (Paris Motor Show 2008) for the garage: a narrow,
 * tall, four-wheel tilting tandem. Two bodies of superelliptic stations
 * (`forma.ts`): a narrow dark keel low between the wheels and the white
 * capsule on top of it (the cabin, its glass and the shoulder over the
 * wheels). The four wheels sit at the corners, outside the keel and under the
 * capsule's shoulder, each with a black mudguard on its carrier; a
 * parallelogram linkage on each axle (upper and lower transverse arms
 * pivoting on the keel) lets the body and the wheels lean together.
 *
 * Garage axes: X forward (nose at x > 0), Y up, Z sideways (+ is the car's
 * right). Front axle at x = 0, rear axle at x = −BATALLA, ground at y = 0. Metres.
 *
 * PUBLISHED (sources in `smera.ts`): length 2 380 mm, width 800 mm, height
 * 1 450 mm, wheelbase 1 700 mm, track 655 mm front and rear, two seats one
 * behind the other, tilting up to 25°.
 *
 * ESTIMATED (no dimensioned drawing, and no photo could be looked at: image
 * hosts are blocked from the environment it was built in; the shape follows
 * the figures and the written descriptions: «sharp lines, a slim profile and a
 * prominent side shoulder», four wheels that lean with the cabin):
 * - Overhangs 0.36 m front and 0.32 m rear (only their sum, 0.68 m, follows
 *   from the published length and wheelbase).
 * - (Tyres: 145/70 R14, published for the later prototype by auto123.com, as the circuit's table cites it
 *   (`circuito/datos.ts`); not fetched here, and assumed for the 2008 car too.)
 * - Ground clearance 0.15 m; the capsule's shoulder 0.72 m wide, the 0.80 m
 *   overall width being the wheels' mudguards (track 0.655 + tyre 0.145); the glass line, the windscreen's rake, the roof.
 * - The linkage: arm pivots on the keel at 0.20 and 0.42 m, arms 0.245 m
 *   long to the wheel carriers. The lean axis is the line through the
 *   centres of the tyres' round crowns, `R_CORONA` above the road, as it is
 *   for any parallelogram tilting car with round-crowned tyres.
 */

export const LARGO = 2.38, ANCHO = 0.80, ALTO = 1.45, BATALLA = 1.70;
export const VIA_DEL = 0.655, VIA_TRAS = 0.655;
/** Maximum lean (°), published. */
export const INCLINACION_MAX = 25;
/** Overhangs: estimated split of the published 0.68 m. */
export const VOLADIZO_DEL = 0.36;
export const X_MORRO = VOLADIZO_DEL, X_COLA = VOLADIZO_DEL - LARGO; // 0.36 and −2.02
/** 145/70 R14 (auto123.com, later prototype; see above): 0.3556 + 2 × 0.145 × 0.70 = 0.5586 m. */
export const R_RUEDA = 0.2793, ANCHO_RUEDA = 0.145, R_LLANTA = 0.1778;
/** The tyre's crown is round, as on a scooter (it has to be, to lean): radius in the cross-section. */
export const R_CORONA = 0.062;
/** Parallelogram linkage (estimated): arm pivots on the keel's centre line, arm length to the carrier. */
export const LINK = { yInf: 0.20, ySup: 0.42, brazo: 0.245 };
/** Black mudguard over each wheel, on its carrier: inner radius and how far round the tyre it reaches (rad, from the top). */
export const GUARDABARROS = { r: R_RUEDA + 0.03, ancho: 0.155, delante: 1.05, detras: 0.95 };

/** The keel: narrow, dark, from the nose to the tail, low between the wheels. Its top is hidden inside the capsule. */
export const QUILLA: Est[] = [
  E(0.360, 0.250, 0.500, 0.000, 0.050, 0.030, 2.2),
  E(0.330, 0.205, 0.600, 0.090, 0.130, 0.090, 2.6),
  E(0.250, 0.175, 0.700, 0.140, 0.165, 0.150, 3.0),
  E(0.100, 0.160, 0.750, 0.150, 0.166, 0.160, 3.2),
  E(-0.150, 0.150, 0.760, 0.158, 0.170, 0.164, 3.4),
  E(-0.400, 0.150, 0.720, 0.215, 0.245, 0.240, 3.6),
  E(-0.650, 0.150, 0.700, 0.235, 0.275, 0.270, 3.8),
  E(-1.050, 0.150, 0.700, 0.235, 0.275, 0.270, 3.8),
  E(-1.300, 0.150, 0.720, 0.215, 0.245, 0.240, 3.6),
  E(-1.550, 0.155, 0.760, 0.158, 0.170, 0.164, 3.4),
  E(-1.800, 0.170, 0.760, 0.150, 0.166, 0.160, 3.2),
  E(-1.930, 0.210, 0.740, 0.140, 0.160, 0.140, 3.0),
  E(-2.000, 0.290, 0.700, 0.080, 0.110, 0.080, 2.6),
  E(X_COLA + 0.005, 0.350, 0.650, 0.000, 0.040, 0.000, 2.2),
];

/**
 * The capsule: cabin, glass and the shoulder over the wheels. Its underside
 * rises over each axle (the wheels go up into it when the car leans) and
 * comes down between them, where the door is; widest (0.72 m) at about 0.95 m.
 */
export const CAPSULA: Est[] = [
  E(0.320, 0.600, 0.700, 0.000, 0.080, 0.040, 2.2),
  E(0.280, 0.590, 0.800, 0.120, 0.180, 0.110, 2.5),
  E(0.200, 0.640, 0.900, 0.210, 0.265, 0.190, 2.8),
  E(0.080, 0.720, 0.990, 0.260, 0.315, 0.240, 3.0),
  E(-0.060, 0.730, 1.080, 0.285, 0.345, 0.265, 3.0),
  E(-0.200, 0.680, 1.180, 0.290, 0.355, 0.270, 3.0),
  E(-0.360, 0.600, 1.300, 0.285, 0.360, 0.260, 3.0),
  E(-0.560, 0.540, 1.400, 0.280, 0.360, 0.245, 3.0),
  E(-0.800, 0.520, 1.445, 0.280, 0.360, 0.235, 3.0),
  E(-1.050, 0.520, 1.450, 0.280, 0.360, 0.230, 3.0),
  E(-1.280, 0.560, 1.430, 0.282, 0.358, 0.225, 3.0),
  E(-1.480, 0.680, 1.380, 0.290, 0.355, 0.215, 3.0),
  E(-1.700, 0.725, 1.290, 0.290, 0.350, 0.205, 3.0),
  E(-1.850, 0.680, 1.180, 0.270, 0.330, 0.185, 2.9),
  E(-1.950, 0.640, 1.050, 0.220, 0.275, 0.150, 2.7),
  E(-2.005, 0.620, 0.920, 0.120, 0.165, 0.080, 2.4),
  E(X_COLA, 0.660, 0.800, 0.000, 0.050, 0.000, 2.2),
];

/** Glass line (side view): below it the capsule is painted, above it glass, from the windscreen to the rear quarter. */
export const CINTURA: [number, number][] = [[0.08, 0.93], [-0.30, 0.96], [-1.00, 0.99], [-1.55, 1.01], [-1.80, 1.02]];

/** Silhouette for the wind tunnel: the keel's, with the capsule's top and width where they are larger. */
export function envolvente(): [number, number, number, number][] {
  const q = envolventeDe(QUILLA), c = envolventeDe(CAPSULA);
  const en = (t: [number, number, number, number][], x: number) => {
    let k = 0; while (k < t.length - 2 && !((t[k][0] - x) * (t[k + 1][0] - x) <= 0)) k++;
    const a = t[k], b = t[k + 1];
    if (!b || (a[0] - x) * (b[0] - x) > 0) return null;
    const u = b[0] !== a[0] ? (x - a[0]) / (b[0] - a[0]) : 0;
    return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u];
  };
  return q.map(([x, yb, yt, hw]) => {
    const s = en(c, x); if (!s) return [x, yb, yt, hw];
    const r = (v: number) => Math.round(v * 1000) / 1000;
    return [x, yb, r(Math.max(yt, s[1])), r(Math.max(hw, s[2]))];
  });
}

/** Frontal area (m²): keel, capsule, the four tyres and their mudguards, as seen from in front (upright). */
export function area(): number {
  const ruedas = [1, -1].map(s => ({ rect: [s * VIA_DEL / 2 - ANCHO_RUEDA / 2, s * VIA_DEL / 2 + ANCHO_RUEDA / 2, 0, 2 * R_RUEDA] as [number, number, number, number] }));
  const guardas = [1, -1].map(s => ({ rect: [s * VIA_DEL / 2 - GUARDABARROS.ancho / 2, s * VIA_DEL / 2 + GUARDABARROS.ancho / 2, 2 * R_RUEDA, R_RUEDA + GUARDABARROS.r + 0.012] as [number, number, number, number] }));
  return areaFrontal([{ es: QUILLA, z0: 0 }, { es: CAPSULA, z0: 0 }, ...ruedas, ...guardas]);
}

/**
 * The linkage at a lean of `grados` (towards the car's right for > 0): how far each arm turns relative to the body
 * (ψ, rad) and where each wheel carrier goes, in the body's own frame (it only translates: the carriers stay
 * parallel to the body). Derivation: the arms are rigid bars across the keel, pivoting on its centre line; a lean of
 * ψ moves the right carrier by (a·cosψ − a, a·sinψ) in (z, y) and the left one by the opposite. The two crowns'
 * centres must then lie on a line parallel to the road, which fixes the body's lean θ: tan θ = a·sinψ / (c − a + a·cosψ),
 * with c the half-track and a the arm. With a = c the arms would stay level; here a < c (the carriers are inboard of
 * the wheels), so the arms turn a little more than the body does.
 */
export function varillaje(grados: number): { psi: number; dz: number; dy: number } {
  const th = Math.abs(grados) * Math.PI / 180, a = LINK.brazo, c = VIA_DEL / 2, s = Math.sign(grados) || 1;
  let lo = 0, hi = Math.PI / 2;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (Math.atan2(a * Math.sin(m), c - a + a * Math.cos(m)) < th) lo = m; else hi = m; }
  const psi = (lo + hi) / 2;
  return { psi: s * psi, dz: a * Math.cos(psi) - a, dy: s * a * Math.sin(psi) };
}
