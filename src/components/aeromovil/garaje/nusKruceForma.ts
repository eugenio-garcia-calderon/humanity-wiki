/*
 * Shape of the NUS KRUCE (Kent Ridge Urban Concept Ecocar, National University
 * of Singapore, Shell Eco-marathon UrbanConcept class): one closed skin swept
 * along X. The sources and what is measured or estimated are in `nusKruce.ts`.
 *
 * Every station x has a half-section (right side, z >= 0) through nine control
 * points, bottom centre to top centre, joined with centripetal Catmull-Rom:
 *   P0 bottom centre, P1 end of the flat floor, P2 middle of the lower corner,
 *   P3 widest point of the side (the round "tub" of the lower body), P4 the
 *   soft shoulder over the wheels, P5 the beltline (base of the side glass),
 *   P6 up the side glass, P7 the roof rail (edge of the glass roof), P8 top
 *   centre. Ahead of the windscreen and behind the cabin P5..P8 are the crown
 *   of the short bonnet and of the tail.
 * Each control coordinate is its own monotone cubic over x (Fritsch-Carlson:
 * no overshoot, so the maximum height and width are exactly the keyframes').
 * Nose and tail are closed by scaling the last section towards a centre point
 * (a superelliptic cap), so the skin has no flat end faces.
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
/** Length 2.7 m (TODAY, 21 April 2009, at the car's launch: «the 2.7m-long single seater»). */
export const LARGO = 2.70;

// ---------------------------------------------------------------- estimated
/**
 * Not published: measured on the three photos with solved cameras (launch
 * side-rear view, rear view, race front-three-quarter view), inside the
 * UrbanConcept rules of those years (height 1.00-1.30 m, width 1.20-1.30 m,
 * wheelbase >= 1.20 m, tracks >= 1.00 m front and >= 0.80 m rear, ground
 * clearance >= 10 cm, 16 or 17-inch rims).
 */
export const ALTO = 1.19, ANCHO = 1.26, BATALLA = 1.65;
export const VIA_DEL = 1.10, VIA_TRAS = 1.04;
/** 16-inch rims (the rule) with a narrow high-pressure tyre: outer radius 0.275 m, 9 cm wide. */
export const NEU = { ancho: 0.09, R: 0.275 };
export const R_LLANTA = 0.2032;
/** Loaded radius (high-pressure tyres flatten a few mm). */
export const RC = 0.271;
/** Front overhang (nose ahead of the front axle). */
export const X_MORRO = 0.62;
export const X_COLA = X_MORRO - LARGO; // -2.08
/** Nose cap from XN0 to the tip, scaled towards (0, CYN); tail cap likewise. */
const XN0 = 0.30, CYN = 0.37, PNZ = 2.4, PNY = 2.5, CN: [number, number, number] = [0, 0, 0.04];
const XT0 = -1.85, CYT = 0.47, PTZ = 2.8, PTY = 3.0, CT: [number, number, number] = [0, 0, 0];

type P2 = [number, number]; // [z, y]

// --------------------------------------------- monotone cubic (Fritsch-Carlson)
export function monotona(pares: P2[]): (x: number) => number {
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
// Each control coordinate over x, [x, value] from the nose back, fitted to the
// three photos with solved cameras (see `nusKruce.ts`).
const K = {
  /** floor: the nose and tail lift a little; ~12 cm under the cabin */
  yb: monotona([[XN0, 0.165], [0.15, 0.148], [0.0, 0.138], [-0.2, 0.128], [-1.35, 0.128], [-1.6, 0.145], [-1.75, 0.17], [XT0, 0.195]]),
  /** widest half-width (the round lower tub) and its height; the rear fenders flare over the rear wheels */
  hw: monotona([[XN0, 0.597], [0.15, 0.613], [0.0, 0.62], [-0.3, 0.622], [-0.8, 0.622], [-1.2, 0.626], [-1.5, 0.63], [-1.65, 0.63], [-1.75, 0.624], [XT0, 0.61]]),
  ys: monotona([[XN0, 0.41], [0.0, 0.42], [-0.5, 0.44], [-1.3, 0.46], [-1.7, 0.48], [XT0, 0.49]]),
  rb: monotona([[XN0, 0.12], [-1.4, 0.12], [XT0, 0.13]]),
  /** soft shoulder over the wheels */
  zs: monotona([[XN0, 0.555], [0.15, 0.572], [-0.2, 0.585], [-0.8, 0.585], [-1.35, 0.592], [-1.65, 0.598], [-1.75, 0.594], [XT0, 0.582]]),
  ysh: monotona([[XN0, 0.605], [0.1, 0.632], [-0.4, 0.655], [-1.0, 0.665], [-1.5, 0.68], [XT0, 0.695]]),
  /** beltline: base of the side glass (ahead of and behind it, a point on the crown) */
  z5: monotona([[XN0, 0.48], [0.15, 0.505], [-0.2, 0.52], [-0.8, 0.52], [-1.3, 0.512], [-1.65, 0.495], [XT0, 0.478]]),
  y5: monotona([[XN0, 0.645], [0.15, 0.69], [-0.1, 0.725], [-0.6, 0.745], [-1.1, 0.765], [-1.5, 0.79], [XT0, 0.81]]),
  /** up the side glass (or the crown) */
  z6: monotona([[XN0, 0.39], [0.15, 0.43], [-0.2, 0.475], [-0.8, 0.48], [-1.3, 0.47], [-1.65, 0.45], [XT0, 0.432]]),
  /** the roof rail (or the crown) */
  z7: monotona([[XN0, 0.235], [0.15, 0.28], [-0.2, 0.345], [-0.8, 0.365], [-1.3, 0.36], [-1.65, 0.345], [XT0, 0.33]]),
  /** top centre: short bonnet, long raked windscreen, glass roof peaking over the driver's head, steep rear glass */
  yt: monotona([[XN0, 0.675], [0.22, 0.71], [0.1, 0.765], [0.0, 0.82], [-0.2, 0.93], [-0.4, 1.03], [-0.6, 1.11], [-0.78, 1.16], [-0.95, 1.185], [-1.1, 1.19], [-1.25, 1.18], [-1.42, 1.145], [-1.58, 1.085], [-1.72, 1.005], [XT0, 0.94]]),
  /** how far up between the beltline and the rail P6 sits, and how far P7 is below the top */
  f6: monotona([[XN0, 0.5], [0.15, 0.5], [-0.3, 0.55], [-1.3, 0.55], [XT0, 0.52]]),
  d7: monotona([[XN0, 0.012], [0.0, 0.02], [-0.5, 0.045], [-1.1, 0.055], [-1.6, 0.045], [XT0, 0.035]]),
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
export const TS = [0, 0.10, 0.15, 0.27, 0.40, 0.50, 0.66, 0.84, 1];
export const T3 = TS[3], T5 = TS[5];

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
/** t on the lower side (from the floor to the widest point) where the section reaches height y. */
export function tAbajo(s: Sec, y: number): number {
  let lo = TS[1], hi = T3;
  if (punto(s, lo)[1] >= y) return lo;
  if (punto(s, hi)[1] <= y) return hi;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (punto(s, m)[1] < y) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** Top line (centre) height at x. */
export const techoEn = (x: number) => controles(Math.max(X_COLA + 1e-4, Math.min(X_MORRO - 1e-4, x)))[8][1];

// ------------------------------------------------------- fast lookups (cache)
// Projections query thousands of points: the half-section is cached as a
// polyline every 8 mm in x and blended between neighbours; within 6 cm of the
// nose and tail tips, where the section shrinks to a point over a few
// millimetres, every 1 mm.
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
export function detrasX(z: number, y: number): number { return bordeX(z, y, -1.4, X_COLA); }

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
    [VIA_DEL / 2 - NEU.ancho / 2, VIA_DEL / 2 + NEU.ancho / 2, 2 * RC],
    [VIA_TRAS / 2 - NEU.ancho / 2, VIA_TRAS / 2 + NEU.ancho / 2, 2 * RC],
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
