/*
 * Shape of the production Volkswagen XL1 (2013): one closed skin swept along X.
 *
 * Every station x has a half-section (right side, z >= 0) through nine control
 * points, bottom centre to top centre, joined with centripetal Catmull-Rom:
 *   P0 bottom centre, P1 end of the flat floor, P2 middle of the lower corner,
 *   P3 widest point of the side, P4 the shoulder crease (the sharp edge that
 *   runs from the headlamp over the front wheel and along the door), P5 the
 *   beltline (base of the side glass), P6 and P7 up the glasshouse, P8 top
 *   centre. Ahead of the windscreen and behind the cabin P5..P8 are simply the
 *   crown of the bonnet and of the engine lid.
 * Each control coordinate is its own monotone cubic over x (Fritsch-Carlson:
 * no overshoot, so the maximum height and width are exactly the keyframes').
 * Nose and tail are closed by scaling the last section towards a centre point
 * (a superelliptic cap), so the skin has no flat end faces.
 *
 * The skin is addressed by (x, t): t in [0, 1] runs along the half-section
 * from P0 (t = 0) to P8 (t = 1); the left side is the mirror image. Body,
 * decals, the wind-tunnel envelope and the frontal area all read the same
 * sections, so they cannot disagree.
 *
 * Axes: X forward (front axle at x = 0), Y up (ground y = 0), Z lateral
 * (+Z is the car's right). Metres.
 */

// ------------------------------------------------------------------ sourced
/** VW press kit (Geneva 2013) and the spec tables of cars-data.com, ultimatecarpage.com and ADAC. */
export const LARGO = 3.888, ANCHO = 1.665, ALTO = 1.153, BATALLA = 2.224;
/** Tyres 115/80 R15 front, 145/55 R16 rear (VW press kit, cars-data.com). */
export const NEU_DEL = { ancho: 0.115, R: (381 + 2 * 92) / 2000 };     // 0.2825
export const NEU_TRAS = { ancho: 0.145, R: (406.4 + 2 * 79.75) / 2000 }; // 0.2830
export const R_LLANTA_DEL = 0.1905, R_LLANTA_TRAS = 0.2032;

// ---------------------------------------------------------------- estimated
/**
 * Tracks are not published (every spec table found leaves them blank). Measured
 * on the front and rear photos with solved cameras: the front wheel covers sit
 * almost flush with the body side, the rear wheels well inside the spats.
 */
export const VIA_DEL = 1.46, VIA_TRAS = 1.24;
/** Loaded radius (high-pressure low-rolling-resistance tyres flatten a few mm). */
export const RC_DEL = 0.277, RC_TRAS = 0.278;
/** Front overhang: not published, from the photos (the sum is 3.888 - 2.224 = 1.664 m). */
export const X_MORRO = 0.70;
export const X_COLA = X_MORRO - LARGO; // -3.188
/** Nose cap from XN0 to the tip, scaled towards (0, CYN); tail cap likewise. */
// The nose is a blunt wedge in plan (the headlamps wrap round its diagonal
// corners back to the wheel arches): on top of the superelliptic rounding the
// cap narrows by an extra c * s^1.4 (c per axis: z, up, down).
const XN0 = 0.24, CYN = 0.33, PNZ = 6, PNY = 4, CN: [number, number, number] = [0.40, 0, 0.1];
const XT0 = -3.07, CYT = 0.44, PTZ = 3.6, PTY = 3.6, CT: [number, number, number] = [0, 0, 0];

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

// ------------------------------------------------------------ keyframes
// Each control coordinate over x, [x, value] from the nose back. Side profile
// (yt), plan view (hw) and the glasshouse were fitted to the reference photos
// with solved cameras; see the header of `xl1.ts`.
const K = {
  /** floor */
  yb: monotona([[XN0, 0.125], [0.1, 0.118], [-0.5, 0.112], [-2.0, 0.114], [-2.45, 0.13], [-2.8, 0.165], [XT0, 0.215]]),
  /** widest half-width and its height */
  hw: monotona([[XN0, 0.768], [0.12, 0.805], [0.0, 0.825], [-0.2, 0.8325], [-0.45, 0.8325], [-0.7, 0.828], [-1.2, 0.813], [-1.7, 0.792], [-2.224, 0.762], [-2.6, 0.725], [-2.9, 0.675], [XT0, 0.625]]),
  ys: monotona([[XN0, 0.40], [0.0, 0.41], [-1.0, 0.42], [-2.2, 0.42], [XT0, 0.43]]),
  rb: monotona([[XN0, 0.12], [0.0, 0.10], [-2.0, 0.10], [XT0, 0.12]]),
  /** shoulder crease */
  zs: monotona([[XN0, 0.772], [0.12, 0.79], [0.0, 0.797], [-0.4, 0.799], [-1.0, 0.788], [-1.6, 0.765], [-2.2, 0.733], [-2.6, 0.695], [-2.9, 0.645], [XT0, 0.59]]),
  ysh: monotona([[XN0, 0.585], [0.1, 0.615], [0.0, 0.628], [-0.4, 0.638], [-1.0, 0.65], [-1.6, 0.662], [-2.1, 0.664], [-2.5, 0.664], [-2.9, 0.668], [XT0, 0.672]]),
  /** beltline: base of the side glass (ahead of and behind it, a point on the crown) */
  z5: monotona([[XN0, 0.66], [0.1, 0.68], [-0.15, 0.68], [-0.6, 0.675], [-1.0, 0.668], [-1.5, 0.645], [-2.0, 0.60], [-2.5, 0.55], [-2.9, 0.50], [XT0, 0.47]]),
  y5: monotona([[XN0, 0.632], [0.1, 0.665], [-0.15, 0.735], [-0.6, 0.775], [-1.0, 0.80], [-1.5, 0.83], [-1.9, 0.79], [-2.3, 0.745], [-2.7, 0.71], [XT0, 0.695]]),
  /** glasshouse side (or crown) */
  z6: monotona([[XN0, 0.45], [0.0, 0.48], [-0.2, 0.55], [-0.6, 0.575], [-1.0, 0.565], [-1.4, 0.52], [-1.8, 0.43], [-2.3, 0.34], [XT0, 0.28]]),
  /** roof edge (or crown) */
  z7: monotona([[XN0, 0.22], [-0.1, 0.25], [-0.5, 0.33], [-0.9, 0.39], [-1.2, 0.385], [-1.6, 0.32], [-2.0, 0.25], [-2.5, 0.20], [XT0, 0.16]]),
  /** top centre */
  yt: monotona([[XN0, 0.668], [0.1, 0.70], [0.0, 0.718], [-0.1, 0.742], [-0.3, 0.835], [-0.5, 0.94], [-0.7, 1.04], [-0.85, 1.102], [-1.0, 1.141], [-1.12, 1.153], [-1.25, 1.149], [-1.45, 1.122], [-1.7, 1.068], [-2.0, 0.985], [-2.3, 0.905], [-2.6, 0.832], [-2.85, 0.78], [XT0, 0.742]]),
  /** how far up between the beltline and the roof edge P6 sits, and how far P7 is below the top */
  f6: monotona([[XN0, 0.5], [-0.1, 0.45], [-0.6, 0.6], [-1.2, 0.64], [-1.8, 0.6], [-2.3, 0.5], [XT0, 0.5]]),
  d7: monotona([[XN0, 0.004], [-0.1, 0.008], [-0.6, 0.03], [-1.2, 0.034], [-1.8, 0.03], [-2.4, 0.012], [XT0, 0.006]]),
};

/** The nine control points of the half-section, before the end caps. */
function controlesBase(x: number): P2[] {
  const yb = K.yb(x), hw = K.hw(x), ys = K.ys(x), rb = K.rb(x), zs = K.zs(x), ysh = K.ysh(x);
  const z5 = K.z5(x), y5 = K.y5(x), z6 = K.z6(x), z7 = K.z7(x), yt = K.yt(x);
  const y7 = yt - K.d7(x), y6 = y5 + (y7 - y5) * K.f6(x);
  return [[0, yb], [hw - rb, yb], [hw - rb * 0.293, yb + rb * 0.293], [hw, ys], [zs, ysh], [z5, y5], [z6, y6], [z7, y7], [0, yt]];
}
/**
 * An end cap scales the base section towards a centre point (0, cy): z by kz,
 * y above the centre by kUp and below it by kDn. Each k(s) = (1 - s^p)^(1/p)
 * * (1 - g s) starts with the slope the body has where the cap begins (so no
 * notch at the joint) and closes in a blunt tip at s = 1.
 */
interface Tapa { x0: number; largo: number; cy: number; pz: number; py: number; base: P2[]; g: [number, number, number]; c: [number, number, number] }
function tapa(x0: number, xPunta: number, cy: number, pz: number, py: number, c: [number, number, number]): Tapa {
  const dir = Math.sign(xPunta - x0), largo = Math.abs(xPunta - x0), e = 0.01;
  const b = controlesBase(x0), a = controlesBase(x0 - dir * e);
  const rel = (v0: number, vIn: number, ref: number) => Math.min(0.85, Math.max(0, ((vIn - v0) / e) * largo / Math.max(1e-3, ref)));
  const hw0 = b[3][0], yt0 = b[8][1], yb0 = b[0][1];
  return { x0, largo, cy, pz, py, base: b, g: [rel(hw0, a[3][0], hw0), rel(yt0, a[8][1], yt0 - cy), rel(cy - yb0, cy - a[0][1], cy - yb0)], c };
}
const TAPA_MORRO = tapa(XN0, X_MORRO, CYN, PNZ, PNY, CN), TAPA_COLA = tapa(XT0, X_COLA, CYT, PTZ, PTY, CT);
function enTapa(T: Tapa, x: number): P2[] {
  const s = Math.min(1, Math.abs(x - T.x0) / T.largo);
  const r = (p: number) => Math.pow(Math.max(0, 1 - Math.pow(s, p)), 1 / p);
  const sm = Math.pow(s, 1.4);
  const kz = r(T.pz) * (1 - T.g[0] * s - T.c[0] * sm), kUp = r(T.py) * (1 - T.g[1] * s - T.c[1] * sm), kDn = r(T.py) * (1 - T.g[2] * s - T.c[2] * sm);
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
export const TS = [0, 0.11, 0.16, 0.27, 0.43, 0.52, 0.70, 0.86, 1];
export const T3 = TS[3], T4 = TS[4], T5 = TS[5];

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

// ------------------------------------------------------- fast lookups (cache)
// Projections query thousands of points: the half-section is cached as a
// polyline every 8 mm in x and blended between neighbours; within 6 cm of the
// nose and tail tips, where the section shrinks to a point over a few
// millimetres, every 1 mm (an 8 mm blend there is a cone inside the true
// rounded face, and decals placed on it sank under the skin in rings).
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
  // the half-section ends on the centre line: close it there
  return c;
}
/** Is (|z|, y) inside the skin's section at x (blended from the caches)? */
function dentroEn(x: number, z: number, y: number): boolean { const [a, b, w] = vecinos(x); return dentro(a, b, w, z, y); }
/** x where the skin is crossed going from xIn (inside) towards xOut: bisection in x. NaN if xIn is outside. */
function bordeX(z: number, y: number, xIn: number, xOut: number): number {
  if (!dentroEn(xIn, z, y)) return NaN;
  let lo = xIn, hi = xOut;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (dentroEn(m, z, y)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** Is the point (x, y, z) inside the skin? */
export function dentroPiel(x: number, y: number, z: number): boolean {
  if (x >= X_MORRO || x <= X_COLA) return false;
  const [a, b, w] = vecinos(x);
  return dentro(a, b, w, z, y);
}
/**
 * Where a horizontal ray hits the skin: from `o` along `d` (unit, y = 0),
 * marching `paso` until it is inside and then bisecting. NaN if it misses
 * within `largo` metres.
 */
export function rayoPiel(o: [number, number, number], d: [number, number, number], largo = 1.6, paso = 0.01): [number, number, number] | null {
  let prev = 0;
  for (let s = 0; s <= largo; s += paso) {
    if (dentroPiel(o[0] + d[0] * s, o[1], o[2] + d[2] * s)) {
      let lo = prev, hi = s;
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (dentroPiel(o[0] + d[0] * m, o[1], o[2] + d[2] * m)) hi = m; else lo = m; }
      const t = (lo + hi) / 2;
      return [o[0] + d[0] * t, o[1], o[2] + d[2] * t];
    }
    prev = s;
  }
  return null;
}
/** x of the skin seen from the front at (z, y), or NaN. */
export function frenteX(z: number, y: number): number { return bordeX(z, y, -0.1, X_MORRO); }
/** x of the skin seen from behind at (z, y), or NaN. */
export function detrasX(z: number, y: number): number { return bordeX(z, y, -2.5, X_COLA); }

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
 * 5 mm: in each row the widest section wins, and the tyre bands are merged in.
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
    const tramos: [number, number][] = [[0, w]];
    for (const [z0, z1, h] of ruedas) if (y < h) tramos.push([z0, z1]);
    tramos.sort((a, b) => a[0] - b[0]);
    let fin = -Infinity, suma = 0;
    for (const [a, b] of tramos) { if (b <= fin) continue; suma += b - Math.max(a, fin); fin = b; }
    A += 2 * suma * dy;
  }
  return A;
}
