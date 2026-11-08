/*
 * Shape of the VW 1-Litre car (2002): one closed skin swept along X.
 *
 * Every station x has a half-section (right side, z >= 0) through nine control
 * points, bottom centre to top centre, joined with centripetal Catmull-Rom:
 *   P0 bottom centre, P1 end of the flat floor, P2 middle of the lower corner,
 *   P3 widest point of the side, P4 shoulder, P5 base of the canopy (the glass
 *   edge along the sides), P6 and P7 up the bubble, P8 top centre.
 * Each control point comes from a table over x, interpolated with monotone
 * cubics (no overshoot: the maximum height and width are exactly the table's).
 * Nose and tail are closed by scaling the last section towards a centre point
 * (an ellipsoidal cap), so the skin has no flat end faces.
 *
 * The skin is addressed by (x, t): t in [0, 1] runs along the half-section
 * from P0 (t = 0) to P8 (t = 1); the left side is the mirror image. Body,
 * glass, decals, the wind-tunnel envelope and the frontal area all read the
 * same sections, so they cannot disagree.
 *
 * Axes: X forward (front axle at x = 0), Y up (ground y = 0), Z lateral
 * (+Z is the car's right). Metres.
 */

// ------------------------------------------------------------------ sourced
// VW press release (2002) spec table, as reproduced by ultimatecarpage.com and
// supercars.net; traumautoarchiv.de gives the same 3646 x 1248 x 1110 mm.
export const LARGO = 3.646, ANCHO = 1.248, ALTO = 1.110, BATALLA = 2.205;
export const VIA_DEL = 1.000, VIA_TRAS = 0.810;
/** Tyres: 95/80 R16 front, 115/70 R16 rear (supercars.net spec table). */
export const NEU_DEL = { ancho: 0.095, R: (406.4 + 2 * 76) / 2000 };   // 0.2792
export const NEU_TRAS = { ancho: 0.115, R: (406.4 + 2 * 80.5) / 2000 }; // 0.2837
export const R_LLANTA = 0.2032; // 16-inch rim

// ---------------------------------------------------------------- estimated
/** Loaded radius (narrow, high-pressure tyres flatten ~6 mm under 290 kg). */
export const RC_DEL = 0.273, RC_TRAS = 0.278;
/** Front overhang: NOT published (only the sum, 3.646 - 2.205 = 1.441 m). */
export const X_MORRO = 0.60;
export const X_COLA = X_MORRO - LARGO; // -3.046
/** Nose cap: from XN0 to the tip, scaled towards (0, CYN). Tail cap likewise. */
const XN0 = 0.22, CYN = 0.345, PN = 2.2;
const XT0 = -2.80, CYT = 0.44, PT = 2.0;
/** The canopy glass, 1.6 m long (the press kit's "1.5 m gullwing door"). */
export const XC0 = -0.27, XC1 = -1.86;
const RF = 0.24, RR = 0.34; // plan-view rounding of the glass ends

type P2 = [number, number]; // [z, y]

// --------------------------------------------- monotone cubic (Fritsch-Carlson)
function monotona(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length, d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

// ------------------------------------------------------------ section table
// Per station (front to rear): floor yb, widest half-width hw at height ys,
// lower-corner radius rb, shoulder (zs, ysh), canopy base P5 (z5, y5), bubble
// P6 (z6, y6) and P7 (z7, y7), top centre yt. Ahead of and behind the glass,
// P5..P8 are simply the crown of the bonnet and of the engine cover.
//        x       yb     hw     ys     rb     zs     ysh    z5     y5     z6     y6     z7     y7     yt
const TABLA: number[][] = [
  [0.22,   0.130, 0.618, 0.330, 0.120, 0.574, 0.540, 0.440, 0.612, 0.300, 0.632, 0.150, 0.640, 0.642],
  [0.00,   0.128, 0.624, 0.340, 0.120, 0.584, 0.562, 0.448, 0.630, 0.300, 0.650, 0.150, 0.658, 0.660],
  [-0.20,  0.128, 0.623, 0.350, 0.120, 0.584, 0.576, 0.432, 0.648, 0.300, 0.672, 0.150, 0.686, 0.690],
  [-0.40,  0.128, 0.617, 0.360, 0.120, 0.577, 0.590, 0.418, 0.660, 0.345, 0.735, 0.205, 0.785, 0.803],
  [-0.65,  0.128, 0.605, 0.370, 0.120, 0.566, 0.600, 0.408, 0.667, 0.368, 0.815, 0.250, 0.905, 0.936],
  [-0.95,  0.128, 0.591, 0.378, 0.118, 0.553, 0.606, 0.402, 0.672, 0.372, 0.865, 0.260, 1.012, 1.062],
  [-1.25,  0.128, 0.575, 0.384, 0.115, 0.538, 0.610, 0.396, 0.676, 0.367, 0.882, 0.255, 1.055, 1.110],
  [-1.55,  0.130, 0.557, 0.386, 0.110, 0.521, 0.612, 0.386, 0.680, 0.352, 0.866, 0.240, 1.026, 1.080],
  [-1.80,  0.132, 0.541, 0.382, 0.100, 0.506, 0.612, 0.370, 0.684, 0.322, 0.826, 0.210, 0.948, 0.996],
  [-2.05,  0.135, 0.523, 0.376, 0.050, 0.489, 0.608, 0.350, 0.684, 0.285, 0.768, 0.170, 0.862, 0.896],
  [-2.205, 0.138, 0.509, 0.372, 0.036, 0.475, 0.604, 0.335, 0.680, 0.268, 0.742, 0.155, 0.815, 0.840],
  [-2.45,  0.150, 0.479, 0.385, 0.045, 0.447, 0.596, 0.305, 0.660, 0.240, 0.695, 0.130, 0.740, 0.755],
  [-2.65,  0.185, 0.415, 0.405, 0.065, 0.390, 0.580, 0.265, 0.630, 0.205, 0.655, 0.110, 0.677, 0.685],
  [-2.80,  0.235, 0.345, 0.425, 0.060, 0.325, 0.565, 0.225, 0.605, 0.170, 0.625, 0.090, 0.640, 0.645],
];
const CURVAS = (() => {
  const filas = [...TABLA].reverse();
  const xs = filas.map(f => f[0]);
  return Array.from({ length: 13 }, (_, k) => monotona(xs, filas.map(f => f[k + 1])));
})();

/** The nine control points of the half-section, before the end caps. */
function controlesBase(x: number): P2[] {
  const v = CURVAS.map(c => c(x));
  const [yb, hw, ys, rb, zs, ysh, z5, y5, z6, y6, z7, y7, yt] = v;
  return [[0, yb], [hw - rb, yb], [hw - rb * 0.293, yb + rb * 0.293], [hw, ys], [zs, ysh], [z5, y5], [z6, y6], [z7, y7], [0, yt]];
}
/**
 * An end cap scales the base section towards a centre point (0, cy): z by kz,
 * y above the centre by kUp and below it by kDn. Each k(s) = (1 - s^p)^(1/p)
 * * (1 - g s) starts with the slope the body has where the cap begins (so no
 * notch at the joint) and closes in a round tip at s = 1.
 */
interface Tapa { x0: number; largo: number; cy: number; p: number; base: P2[]; g: [number, number, number] }
function tapa(x0: number, xPunta: number, cy: number, p: number): Tapa {
  const dir = Math.sign(xPunta - x0), largo = Math.abs(xPunta - x0), e = 0.01;
  const b = controlesBase(x0), a = controlesBase(x0 - dir * e);
  // how fast the body shrinks towards the tip at x0, as a fraction of the base per unit of s
  const rel = (v0: number, vIn: number, ref: number) => Math.min(0.85, Math.max(0, ((vIn - v0) / e) * largo / Math.max(1e-3, ref)));
  const hw0 = b[3][0], yt0 = b[8][1], yb0 = b[0][1];
  return { x0, largo, cy, p, base: b, g: [rel(hw0, a[3][0], hw0), rel(yt0, a[8][1], yt0 - cy), rel(cy - yb0, cy - a[0][1], cy - yb0)] };
}
const TAPA_MORRO = tapa(XN0, X_MORRO, CYN, PN), TAPA_COLA = tapa(XT0, X_COLA, CYT, PT);
function enTapa(T: Tapa, x: number): P2[] {
  const s = Math.min(1, Math.abs(x - T.x0) / T.largo), r = Math.pow(Math.max(0, 1 - Math.pow(s, T.p)), 1 / T.p);
  const [kz, kUp, kDn] = T.g.map(g => r * (1 - g * s));
  // towards the tip the section turns into an ellipse, so its corners do not
  // run into the point as creases (an X seen from behind, a V under the chin)
  const a = T.base[3][0], bUp = T.base[8][1] - T.cy, bDn = T.cy - T.base[0][1], beta = s * s;
  return T.base.map(([z, y]) => {
    const dy = y - T.cy, b = dy > 0 ? bUp : bDn, q = Math.hypot(z / a, dy / b);
    const f = q > 1e-6 ? 1 + beta * (1 / q - 1) : 1;
    return [z * f * kz, T.cy + dy * f * (dy > 0 ? kUp : kDn)] as P2;
  });
}

/** Control points at x, end caps included. */
export function controles(x: number): P2[] {
  if (x > XN0) return enTapa(TAPA_MORRO, x);
  if (x < XT0) return enTapa(TAPA_COLA, x);
  return controlesBase(x);
}

// -------------------------------------------------- parameter t along the section
/** t at each control point. TL (at P5) splits the lower body from the upper part. */
export const TS = [0, 0.12, 0.17, 0.25, 0.42, 0.55, 0.72, 0.87, 1];
export const TL = TS[5], T4 = TS[4];

/** Centripetal Catmull-Rom between p1 and p2 (Barry-Goldman pyramid, written out: no allocations but the result). */
function cr(p0: P2, p1: P2, p2: P2, p3: P2, u: number): P2 {
  const t1 = Math.max(1e-5, Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])));
  const t2 = t1 + Math.max(1e-5, Math.sqrt(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])));
  const t3 = t2 + Math.max(1e-5, Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1])));
  const v = t1 + (t2 - t1) * u;
  const a1 = (t1 - v) / t1, b1 = v / t1, a2 = (t2 - v) / (t2 - t1), b2 = (v - t1) / (t2 - t1), a3 = (t3 - v) / (t3 - t2), b3 = (v - t2) / (t3 - t2);
  const A1z = p0[0] * a1 + p1[0] * b1, A1y = p0[1] * a1 + p1[1] * b1;
  const A2z = p1[0] * a2 + p2[0] * b2, A2y = p1[1] * a2 + p2[1] * b2;
  const A3z = p2[0] * a3 + p3[0] * b3, A3y = p2[1] * a3 + p3[1] * b3;
  const c1 = (t2 - v) / t2, d1 = v / t2, c2 = (t3 - v) / (t3 - t1), d2 = (v - t1) / (t3 - t1);
  const B1z = A1z * c1 + A2z * d1, B1y = A1y * c1 + A2y * d1, B2z = A2z * c2 + A3z * d2, B2y = A2y * c2 + A3y * d2;
  return [B1z * a2 + B2z * b2, B1y * a2 + B2y * b2];
}

/** A section ready to evaluate: control points with the mirror ghosts at both ends. */
export interface Sec { x: number; c: P2[]; ext: P2[] }
export function sec(x: number): Sec {
  const c = controles(x);
  return { x, c, ext: [[-c[1][0], c[1][1]], ...c, [-c[7][0], c[7][1]]] };
}
/** Point (z, y) of the half-section at parameter t. */
export function punto(s: Sec, t: number): P2 {
  const tt = Math.min(1, Math.max(0, t));
  let k = 0; while (k < 7 && tt > TS[k + 1]) k++;
  const u = (tt - TS[k]) / (TS[k + 1] - TS[k]);
  const e = s.ext;
  return cr(e[k], e[k + 1], e[k + 2], e[k + 3], u);
}

// ---------------------------------------------------------------- canopy edge
/** Plan-view half-width of the glass (or of an outline offset from it by `mas`) at x; 0 outside. */
export function zCristal(x: number, mas = 0): number {
  const x0 = XC0 + mas, x1 = XC1 - mas, rf = RF + mas, rr = RR + mas;
  if (x >= x0 || x <= x1) return 0;
  const z5 = CURVAS[6](x) + mas;
  let f = 1;
  if (x0 - x < rf) { const d = 1 - (x0 - x) / rf; f = Math.sqrt(1 - d * d); }
  else if (x - x1 < rr) { const d = 1 - (x - x1) / rr; f = Math.sqrt(1 - d * d); }
  return z5 * f;
}
/** t on the upper skin where the half-section reaches half-width z (searching down from the top). */
export function tDeZ(s: Sec, z: number, tMin = T4): number {
  if (z <= 0) return 1;
  // walk down from the top centre (z = 0) to the first sample that reaches z, then bisect
  let hi = 1, lo = NaN;
  const paso = 0.01;
  for (let t = 1 - paso; t >= tMin - 1e-9; t -= paso) { if (punto(s, t)[0] >= z) { lo = t; break; } hi = t; }
  if (Number.isNaN(lo)) return tMin;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (punto(s, m)[0] >= z) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** t of the glass edge at station s (1 = no glass there). */
export function tCristal(s: Sec): number {
  const z = zCristal(s.x);
  if (z <= 0) return 1;
  // along the sides the edge is exactly P5
  if (s.x < XC0 - RF - 1e-6 && s.x > XC1 + RR + 1e-6) return TL;
  return Math.max(TL, tDeZ(s, z, TL));
}

// ------------------------------------------------------- fast lookups (cache)
// Projections query thousands of points: the half-section is cached as a
// polyline every 8 mm in x and blended between neighbours.
const NT = 96;            // points per cached half-section (chord error < 0.2 mm)
const PASO_CACHE = 0.008; // stations are blended linearly in between (error < 0.1 mm)
const cache = new Map<number, Float64Array>();
function polilinea(i: number): Float64Array {
  let p = cache.get(i);
  if (!p) {
    const s = sec(X_COLA + i * PASO_CACHE);
    p = new Float64Array(NT * 2 + 2);
    for (let k = 0; k <= NT; k++) { const [z, y] = punto(s, k / NT); p[2 * k] = z; p[2 * k + 1] = y; }
    cache.set(i, p);
  }
  return p;
}
const N_CACHE = Math.ceil(LARGO / PASO_CACHE);
/** The two cached neighbours of x and the weight between them (no allocation). */
function vecinos(x: number): [Float64Array, Float64Array, number] {
  const f = Math.min(N_CACHE - 1e-9, Math.max(0, (x - X_COLA) / PASO_CACHE));
  const i = Math.floor(f);
  return [polilinea(i), polilinea(i + 1), f - i];
}
/** Half-section polyline at x, interpolated from the cache: [z0, y0, z1, y1, ...], NT + 1 points. */
export function seccionRapida(x: number): Float64Array {
  const [a, b, w] = vecinos(x), out = new Float64Array(a.length);
  for (let k = 0; k < a.length; k++) out[k] = a[k] + (b[k] - a[k]) * w;
  return out;
}
/** Outer skin z (right side) at height y, or NaN. */
export function ladoZ(x: number, y: number): number {
  const [a, b, w] = vecinos(x); let best = NaN;
  let z0 = a[0] + (b[0] - a[0]) * w, y0 = a[1] + (b[1] - a[1]) * w;
  for (let k = 1; k <= NT; k++) {
    const z1 = a[2 * k] + (b[2 * k] - a[2 * k]) * w, y1 = a[2 * k + 1] + (b[2 * k + 1] - a[2 * k + 1]) * w;
    if ((y - y0) * (y - y1) <= 0 && y0 !== y1) { const z = z0 + (z1 - z0) * (y - y0) / (y1 - y0); if (!(z <= best)) best = z; }
    z0 = z1; y0 = y1;
  }
  return best;
}
/** Skin height seen from above at (x, z), or NaN. */
export function arribaY(x: number, z: number): number {
  const [a, b, w] = vecinos(x), az = Math.abs(z); let best = NaN;
  let z0 = a[0] + (b[0] - a[0]) * w, y0 = a[1] + (b[1] - a[1]) * w;
  for (let k = 1; k <= NT; k++) {
    const z1 = a[2 * k] + (b[2 * k] - a[2 * k]) * w, y1 = a[2 * k + 1] + (b[2 * k + 1] - a[2 * k + 1]) * w;
    if ((az - z0) * (az - z1) <= 0 && z0 !== z1) { const yy = y0 + (y1 - y0) * (az - z0) / (z1 - z0); if (!(yy <= best)) best = yy; }
    z0 = z1; y0 = y1;
  }
  return best;
}
/** Is (|z|, y) inside the section blended between two cached polylines with weight w? */
function dentro(a: Float64Array, b: Float64Array, w: number, z: number, y: number): boolean {
  const az = Math.abs(z); let c = false;
  let za = a[0] + (b[0] - a[0]) * w, ya = a[1] + (b[1] - a[1]) * w;
  for (let k = 1; k <= NT; k++) {
    const zb = a[2 * k] + (b[2 * k] - a[2 * k]) * w, yb = a[2 * k + 1] + (b[2 * k + 1] - a[2 * k + 1]) * w;
    if ((ya > y) !== (yb > y) && az < (zb - za) * (y - ya) / (yb - ya) + za) c = !c;
    za = zb; ya = yb;
  }
  return c;
}
/**
 * x of the skin seen along X at (z, y): the last cached station (going from
 * `iIn`, inside the body, towards `iOut`) that still contains the point, then
 * a few bisections between the two neighbours. NaN if `iIn` does not contain it.
 */
function bordeX(z: number, y: number, iIn: number, iOut: number): number {
  const P = polilinea;
  if (!dentro(P(iIn), P(iIn), 0, z, y)) return NaN;
  let lo = iIn, hi = iOut; // lo inside, hi outside (or the tip)
  if (dentro(P(hi), P(hi), 0, z, y)) return X_COLA + hi * PASO_CACHE;
  while (Math.abs(hi - lo) > 1) { const m = Math.round((lo + hi) / 2); if (dentro(P(m), P(m), 0, z, y)) lo = m; else hi = m; }
  const a = P(lo), b = P(hi); let wl = 0, wh = 1;
  for (let k = 0; k < 6; k++) { const wm = (wl + wh) / 2; if (dentro(a, b, wm, z, y)) wl = wm; else wh = wm; }
  return X_COLA + (lo + (hi - lo) * (wl + wh) / 2) * PASO_CACHE;
}
const iDe = (x: number) => Math.round((x - X_COLA) / PASO_CACHE);
/** x of the skin seen from the front at (z, y), or NaN. */
export function frenteX(z: number, y: number): number { return bordeX(z, y, iDe(-0.2), N_CACHE); }
/** x of the skin seen from behind at (z, y), or NaN. */
export function detrasX(z: number, y: number): number { return bordeX(z, y, iDe(-2.3), 0); }

// --------------------------------------------------------- envelope and area
/** [x, floor, top, max half-width] every `paso` m, from the same sections as the mesh. */
export function envolvente(paso = 0.05): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let x = X_MORRO; x >= X_COLA - 1e-9; x -= paso) {
    const s = sec(Math.max(X_COLA + 1e-4, Math.min(X_MORRO - 1e-4, x)));
    let yb = Infinity, yt = -Infinity, hw = 0;
    for (let k = 0; k <= 80; k++) { const [z, y] = punto(s, k / 80); yb = Math.min(yb, y); yt = Math.max(yt, y); hw = Math.max(hw, z); }
    const r = (v: number) => Math.round(v * 1000) / 1000;
    out.push([r(x), r(yb), r(yt), r(hw)]);
  }
  return out;
}

/**
 * Frontal area (m2) of the skin plus the tyres that show below it, rows of
 * 5 mm: in each row the widest section wins (every section is symmetric and
 * spans -z..z at that height), and the tyre bands are merged in.
 */
export function areaFrontalModelo(): number {
  const secs: Float64Array[] = [];
  for (let x = X_MORRO - 0.002; x > X_COLA; x -= 0.02) secs.push(seccionRapida(x));
  const ruedas: [number, number, number][] = [
    [VIA_DEL / 2 - NEU_DEL.ancho / 2, VIA_DEL / 2 + NEU_DEL.ancho / 2, 2 * RC_DEL],
    [VIA_TRAS / 2 - NEU_TRAS.ancho / 2, VIA_TRAS / 2 + NEU_TRAS.ancho / 2, 2 * RC_TRAS],
  ];
  let A = 0; const dy = 0.005;
  for (let y = dy / 2; y < ALTO + 0.01; y += dy) {
    let w = 0;
    for (const p of secs) {
      for (let k = 0; k < NT; k++) {
        const y0 = p[2 * k + 1], y1 = p[2 * k + 3];
        if ((y - y0) * (y - y1) <= 0 && y0 !== y1) { const z = p[2 * k] + (p[2 * k + 2] - p[2 * k]) * (y - y0) / (y1 - y0); if (z > w) w = z; }
      }
    }
    // the half-row is [0, w]; add the tyre bands outside it
    const tramos: [number, number][] = [[0, w]];
    for (const [z0, z1, h] of ruedas) if (y < h) tramos.push([z0, z1]);
    tramos.sort((a, b) => a[0] - b[0]);
    let fin = -Infinity, suma = 0;
    for (const [a, b] of tramos) { if (b <= fin) continue; suma += b - Math.max(a, fin); fin = b; }
    A += 2 * suma * dy;
  }
  return A;
}
