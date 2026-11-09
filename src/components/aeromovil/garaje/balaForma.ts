/*
 * Shape of the «Cuadriciclo Bala»: one closed skin swept along X.
 *
 * Not a real vehicle: Eugenio's own design of 2026-11-09, a two-seat,
 * motorcycle-style version of the Aeromóvil Gota (same rhombus of wheels,
 * pilot in front and one passenger behind, astride). Every number here is a
 * design proposal, not a measurement.
 *
 * Every station x has a half-section (right side, z >= 0) through nine control
 * points, bottom centre to top centre, joined with centripetal Catmull-Rom:
 *   P0 bottom centre, P1 end of the flat belly, P2 the lower flank (the body
 *   is narrow down where the riders' feet are, so the lateral wheel pods can
 *   stand clear of it), P3 the widest point (elbows and knees), P4 the
 *   shoulder (the canopy sits a little inboard of the widest point, like a
 *   fighter's canopy on its fuselage), P5..P7 the canopy bubble (an ellipse
 *   from the shoulder to the top), P8 top centre. Ahead of and behind the
 *   canopy, P4..P8 are simply the crown of the nose and of the tail cone.
 * Each control quantity is a monotone cubic over x (Fritsch-Carlson: no
 * overshoot). The long pointed nose and the tail cone are end caps: the
 * section where each starts is scaled towards the tip with the slope the
 * body has there (no kink at the joint), which gives an ogive.
 *
 * The skin is addressed by (x, t): t in [0, 1] runs along the half-section
 * from P0 (t = 0) to P8 (t = 1); the left side is the mirror image. Body,
 * glass, decals, the wind-tunnel envelope and the frontal area all read the
 * same sections, so they cannot disagree.
 *
 * Axes: X forward (front axle at x = 0), Y up (ground y = 0), Z lateral
 * (+Z is the vehicle's right). Metres.
 */

// --------------------------------------------------- from the Aeromóvil Gota
// PARAMETROS_GOTA (geometria.ts): 24″ front and rear wheels (0.61 m), 20″
// lateral wheels (0.508 m) at mid-wheelbase (xLm 1.22). The Bala keeps those
// sizes and the rhombus, with two changes (see bala.ts): wheelbase 2.45 m
// instead of 2.60 and lateral track 1.10 m instead of 1.05.
export const BATALLA = 2.45;
export const R_DEL = 0.305, R_LAT = 0.254;
/** Lateral wheels at mid-wheelbase, as on the Gota (xLm 1.22 of 2.60 there; 1.225 of 2.45 here). */
export const X_LAT = -BATALLA / 2;
export const VIA_LAT = 1.10;
/** Tyre sections: moped-size (80 / 70 mm) instead of the Gota's 55 mm bicycle tyres, for two riders and a motor. */
export const ANCHO_NEU = 0.08, ANCHO_NEU_LAT = 0.07;

// ------------------------------------------------------------- the envelope
export const X_MORRO = 0.60, X_COLA = -3.10;
export const LARGO = X_MORRO - X_COLA; // 3.70
/** Nose cap: from XN0 to the tip, scaled towards (0, CYN); tail cap likewise. */
const XN0 = 0.20, CYN = 0.34, PN = 0.75;
const XT0 = -2.55, CYT = 0.47, PT = 0.72;

type P2 = [number, number]; // [z, y]

// --------------------------------------------- monotone cubic (Fritsch-Carlson)
function monotona(pares: P2[]): (x: number) => number {
  const s = [...pares].sort((a, b) => a[0] - b[0]);
  const xs = s.map(p => p[0]), ys = s.map(p => p[1]);
  const n = xs.length, d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], q = a * a + b * b;
    if (q > 9) { const t = 3 / Math.sqrt(q); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
export { monotona };

// ------------------------------------------------------------ keyframes
// Each control quantity over x, [x, value], between the two caps.
const K = {
  /** belly: 12–13 cm above the road, flat under the riders */
  yb: monotona([[XN0, 0.162], [0.10, 0.139], [0.0, 0.129], [-0.2, 0.126], [-0.5, 0.124], [-2.1, 0.124], [-2.35, 0.132], [XT0, 0.158]]),
  /**
   * Top line: nose, the canopy rising at ~42° to its crest over both helmets
   * (1.452 m at x = -1.25) and the long tail line at ~32°.
   */
  yt: monotona([[XN0, 0.655], [0.10, 0.70], [0.0, 0.738], [-0.1, 0.78], [-0.2, 0.835], [-0.35, 0.955], [-0.5, 1.10], [-0.65, 1.235], [-0.8, 1.345], [-0.95, 1.415], [-1.1, 1.445], [-1.25, 1.452], [-1.4, 1.452], [-1.55, 1.442], [-1.7, 1.403], [-1.85, 1.33], [-2.0, 1.245], [-2.2, 1.12], [-2.4, 0.995], [XT0, 0.905]]),
  /** widest half-width: 0.85 m body from the pilot's knees to the passenger's back */
  hw: monotona([[XN0, 0.222], [0.10, 0.258], [0.0, 0.29], [-0.2, 0.338], [-0.4, 0.375], [-0.6, 0.403], [-0.85, 0.42], [-1.1, 0.425], [-1.5, 0.425], [-1.8, 0.414], [-2.05, 0.39], [-2.3, 0.345], [XT0, 0.285]]),
  /** height of the widest point */
  ys: monotona([[XN0, 0.38], [0.0, 0.43], [-0.4, 0.56], [-0.8, 0.65], [-1.2, 0.68], [-1.8, 0.68], [-2.2, 0.64], [XT0, 0.58]]),
  /** half-width of the flat belly */
  zk: monotona([[XN0, 0.07], [0.0, 0.10], [-0.4, 0.15], [-1.0, 0.17], [-1.8, 0.17], [-2.3, 0.13], [XT0, 0.11]]),
  /** lower flank P2: how far out (fraction from the belly edge to the widest point) */
  f2: monotona([[XN0, 0.70], [-0.4, 0.62], [-2.0, 0.62], [XT0, 0.66]]),
  /** shoulder P4: height as a fraction from the widest point to the top, and half-width as a fraction of the widest */
  fsh: monotona([[XN0, 0.45], [-0.1, 0.42], [-0.4, 0.26], [-0.7, 0.21], [-1.6, 0.20], [-2.0, 0.26], [-2.3, 0.36], [XT0, 0.40]]),
  ksh: monotona([[XN0, 0.89], [-0.2, 0.90], [-0.6, 0.93], [-1.8, 0.93], [-2.2, 0.91], [XT0, 0.90]]),
};
/** Height of the lower flank point between the belly and the widest point. */
const F2Y = 0.32;
/** The canopy bubble: an ellipse from the shoulder to the top, these angles for P5..P7. */
const ANG_CUPULA = [28, 55, 78].map(a => a * Math.PI / 180);

/** The nine control points of the half-section, before the end caps. */
function controlesBase(x: number): P2[] {
  const yb = K.yb(x), yt = K.yt(x), hw = K.hw(x), ys = K.ys(x), zk = K.zk(x);
  const z2 = zk + (hw - zk) * K.f2(x), y2 = yb + (ys - yb) * F2Y;
  const ysh = ys + (yt - ys) * K.fsh(x), zs = hw * K.ksh(x);
  const out: P2[] = [[0, yb], [zk, yb], [z2, y2], [hw, ys], [zs, ysh]];
  for (const a of ANG_CUPULA) out.push([zs * Math.cos(a), ysh + (yt - ysh) * Math.sin(a)]);
  out.push([0, yt]);
  return out;
}
/** Height of the shoulder (P4) at x, between the caps: the canopy's sill line runs just above it. */
export const alturaHombro = (x: number) => { const ys = K.ys(x); return ys + (K.yt(x) - ys) * K.fsh(x); };

/**
 * An end cap scales the base section towards a centre point (0, cy): z by kz,
 * y above the centre by kUp and below it by kDn. Each is an ogive,
 * k(s) = (1 - s)^m (1 + (m - g) s), with g the slope the body has where the
 * cap begins (so no notch at the joint) and m < 1 the sharpness of the point:
 * it closes in a point with a rounded tip at s = 1 (a rocket's nose cone).
 */
interface Tapa { x0: number; largo: number; cy: number; m: number; base: P2[]; g: [number, number, number] }
function tapa(x0: number, xPunta: number, cy: number, m: number): Tapa {
  const dir = Math.sign(xPunta - x0), largo = Math.abs(xPunta - x0), e = 0.01;
  const b = controlesBase(x0), a = controlesBase(x0 - dir * e);
  const rel = (v0: number, vIn: number, ref: number) => Math.min(0.95, Math.max(0, ((vIn - v0) / e) * largo / Math.max(1e-3, ref)));
  const hw0 = b[3][0], yt0 = b[8][1], yb0 = b[0][1];
  return { x0, largo, cy, m, base: b, g: [rel(hw0, a[3][0], hw0), rel(yt0, a[8][1], yt0 - cy), rel(cy - yb0, cy - a[0][1], cy - yb0)] };
}
const TAPA_MORRO = tapa(XN0, X_MORRO, CYN, PN), TAPA_COLA = tapa(XT0, X_COLA, CYT, PT);
function enTapa(T: Tapa, x: number): P2[] {
  const s = Math.min(1, Math.abs(x - T.x0) / T.largo);
  const k = (g: number) => { const m = Math.max(T.m, g); return Math.pow(1 - s, m) * (1 + (m - g) * s); };
  const kz = k(T.g[0]), kUp = k(T.g[1]), kDn = k(T.g[2]);
  // towards the tip the section turns into an ellipse, so its corners do not
  // run into the point as creases
  const a = T.base[3][0], bUp = T.base[8][1] - T.cy, bDn = T.cy - T.base[0][1], beta = s * s * s;
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
/** t at each control point. */
export const TS = [0, 0.07, 0.19, 0.34, 0.47, 0.60, 0.76, 0.89, 1];
export const T3 = TS[3];

/** Centripetal Catmull-Rom between p1 and p2 (Barry-Goldman pyramid, written out). */
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

/** t on the upper side (from the widest point to the top) where the section reaches height y. */
export function tArriba(s: Sec, y: number): number {
  let lo = T3, hi = 1;
  if (punto(s, lo)[1] >= y) return lo;
  if (punto(s, hi)[1] <= y) return 1;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (punto(s, m)[1] < y) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** t on the lower side (from the belly to the widest point) where the section reaches height y. */
export function tAbajo(s: Sec, y: number): number {
  let lo = TS[1], hi = T3;
  if (punto(s, lo)[1] >= y) return lo;
  if (punto(s, hi)[1] <= y) return hi;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (punto(s, m)[1] < y) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// ------------------------------------------------------- fast lookups (cache)
// Projections query thousands of points: the half-section is cached as a
// polyline every 8 mm in x and blended between neighbours; within 6 cm of the
// tips, where the section shrinks to a point, every 1 mm.
const NT = 120;
const PASO_CACHE = 0.008;
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
const PASO_FINO = 0.001, LARGO_FINO = 0.06, N_FINO = Math.round(LARGO / PASO_FINO);
const cacheFino = new Map<number, Float64Array>();
function polilineaFina(i: number): Float64Array {
  let p = cacheFino.get(i);
  if (!p) {
    const s = sec(Math.min(X_MORRO, X_COLA + i * PASO_FINO));
    p = new Float64Array(NT * 2 + 2);
    for (let k = 0; k <= NT; k++) { const [z, y] = punto(s, k / NT); p[2 * k] = z; p[2 * k + 1] = y; }
    cacheFino.set(i, p);
  }
  return p;
}
function vecinos(x: number): [Float64Array, Float64Array, number] {
  if (X_MORRO - x < LARGO_FINO || x - X_COLA < LARGO_FINO) {
    const f = Math.min(N_FINO - 1e-9, Math.max(0, (x - X_COLA) / PASO_FINO)), i = Math.floor(f);
    return [polilineaFina(i), polilineaFina(i + 1), f - i];
  }
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
/** Is the point (x, y, z) inside the skin? */
export function dentroPiel(x: number, y: number, z: number): boolean {
  if (x >= X_MORRO || x <= X_COLA) return false;
  const [a, b, w] = vecinos(x);
  return dentro(a, b, w, z, y);
}
/** x where the skin is crossed going from xIn (inside) towards xOut: bisection in x. NaN if xIn is outside. */
function bordeX(z: number, y: number, xIn: number, xOut: number): number {
  if (!dentroPiel(xIn, y, z)) return NaN;
  let lo = xIn, hi = xOut;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (dentroPiel(m, y, z)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** x of the skin seen from the front at (z, y), or NaN. */
export function frenteX(z: number, y: number): number { return bordeX(z, y, 0.0, X_MORRO); }
/** x of the skin seen from behind at (z, y), or NaN. */
export function detrasX(z: number, y: number): number { return bordeX(z, y, -2.3, X_COLA); }

// --------------------------------------------------------- envelope and area
/**
 * [x, floor, top, max half-width] every `paso` m, from the same sections as
 * the mesh. The body only: the lateral wheel pods, their arms and the tail
 * fin stand outside it and are not part of the wind tunnel's silhouette.
 */
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

/** Largest cross-section area of the body (m²) and the half-width and height of that section. */
export function seccionMayor(): { area: number; x: number; hw: number; alto: number } {
  let best = { area: 0, x: 0, hw: 0, alto: 0 };
  for (let x = 0; x > -2.4; x -= 0.05) {
    const s = sec(x); let A = 0, hw = 0, y0 = Infinity, y1 = -Infinity;
    let [zp, yp] = punto(s, 0);
    for (let k = 1; k <= 200; k++) { const [z, y] = punto(s, k / 200); A += (zp + z) / 2 * (y - yp); zp = z; yp = y; hw = Math.max(hw, z); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (2 * A > best.area) best = { area: 2 * A, x, hw, alto: y1 - y0 };
  }
  return best;
}
