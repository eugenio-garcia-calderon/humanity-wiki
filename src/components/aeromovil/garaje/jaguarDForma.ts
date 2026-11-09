/*
 * Shape of the garage Jaguar D-Type (1955 short-nose production car): one
 * closed skin swept along X, the same method as the VW 1-Litre
 * (`unLitroForma.ts`), with a section that can dip between two humps.
 *
 * Every station x has a half-section (right side, z >= 0) through nine control
 * points, bottom centre to top centre, joined with centripetal Catmull-Rom:
 *   P0 bottom centre, P1 end of the flat floor, P2 middle of the lower corner,
 *   P3 widest point of the side, P4 outer shoulder of the wing, P5 crest of the
 *   wing, P6 inner shoulder, P7 the bonnet or deck beside the centre, P8 top
 *   centre. Over the wheels P5 stands higher than P7 and P8: that is the D-Type's
 *   wing bulge with the bonnet sunk between the two. Along the cockpit the nine
 *   points lie on a flat deck.
 * Each control point comes from a table over x, interpolated with monotone
 * cubics. The nose ends in the oval air intake: the sections turn into an
 * ellipse and shrink, along a quarter circle seen from the side, to the mouth
 * (the lip). The tail closes in a round cap. The offset bonnet bulge is a
 * smooth bump added to the top of the skin.
 *
 * Axes: X forward (front axle at x = 0), Y up (ground y = 0), Z lateral
 * (+Z is the car's right: the driver's side on this right-hand-drive car). Metres.
 */

// ------------------------------------------------------------------ sourced
// Length 3 912 mm: supercars.net «1954 Jaguar D-Type» spec table and
// uniquecarsandparts.com.au (production car); the 1955 works long nose is
// 7½ in longer, 4 102 mm (ultimatecarpage.com spec 1598, Wikipedia), which
// agrees. Width: 1 664 mm (supercars.net) and 1 651 mm (uniquecarsandparts):
// the model sits in between. Height 800 mm (uniquecarsandparts; the same on
// ultimatecarpage): the body, without the fin. Wheelbase 2 300 mm and track
// 1 270 / 1 219 mm (supercars.net); 2 286 and 2 294 mm elsewhere.
export const LARGO = 3.912, ANCHO = 1.66, ALTO = 0.80, BATALLA = 2.30;
export const VIA_DEL = 1.27, VIA_TRAS = 1.219;
/** Tyres 6.50-16 on 16 x 5.5 in wheels front and rear (supercars.net). */
export const R_LLANTA = 0.2032, ANCHO_NEU = 0.165;
/** 6.50-16 cross-ply: section 165 mm, about 92 % high: 406 + 2 x 152 = 710 mm across (estimated, no published diameter). */
export const R_NEU = 0.355;

// ---------------------------------------------------------------- estimated
/** Loaded radius (a racing cross-ply squats ~6 mm under ~220 kg a wheel). */
export const RC = 0.349;
/** Front overhang: NOT published (only the sum, 3.912 - 2.300 = 1.612 m); read from the side photo. */
export const X_MORRO = 0.79;
export const X_COLA = X_MORRO - LARGO; // -3.122
/** The nose lip starts at XN0 and ends in the mouth at the tip; the tail cap starts at XT0. */
export const XN0 = 0.655;
const XT0 = -2.90, CYT = 0.43, PT = 2.0;
/** The air intake: a horizontal ellipse at the tip (half-width, half-height, centre height). */
export const BOCA = { a: 0.205, b: 0.098, cy: 0.372 };

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
// lower-corner radius rb, outer shoulder (zo, yo), crest (zc, yc), inner
// shoulder (zi, yi), deck beside the centre (zv, yv), top centre yt.
// Estimated from the side and 3/4 photo within the published sizes.
//        x       yb     hw     ys     rb     zo     yo     zc     yc     zi     yi     zv     yv     yt
const TABLA: number[][] = [
  [0.655,  0.215, 0.500, 0.380, 0.120, 0.470, 0.500, 0.390, 0.556, 0.270, 0.546, 0.130, 0.536, 0.536],
  [0.56,   0.192, 0.640, 0.392, 0.130, 0.600, 0.562, 0.480, 0.636, 0.330, 0.602, 0.160, 0.576, 0.578],
  [0.43,   0.170, 0.745, 0.415, 0.140, 0.700, 0.628, 0.550, 0.712, 0.372, 0.652, 0.200, 0.604, 0.606],
  [0.22,   0.150, 0.800, 0.445, 0.145, 0.748, 0.670, 0.575, 0.778, 0.405, 0.700, 0.240, 0.642, 0.645],
  [0.00,   0.140, 0.830, 0.470, 0.150, 0.775, 0.695, 0.585, 0.798, 0.415, 0.735, 0.265, 0.678, 0.682],
  [-0.25,  0.137, 0.822, 0.480, 0.170, 0.770, 0.705, 0.592, 0.797, 0.435, 0.762, 0.285, 0.718, 0.722],
  [-0.50,  0.136, 0.785, 0.490, 0.200, 0.742, 0.708, 0.622, 0.770, 0.465, 0.783, 0.295, 0.767, 0.768],
  [-0.75,  0.136, 0.752, 0.495, 0.215, 0.722, 0.705, 0.655, 0.748, 0.500, 0.792, 0.300, 0.800, 0.800],
  [-1.10,  0.136, 0.745, 0.495, 0.220, 0.716, 0.702, 0.660, 0.745, 0.500, 0.788, 0.300, 0.797, 0.798],
  [-1.50,  0.136, 0.762, 0.495, 0.215, 0.732, 0.694, 0.648, 0.755, 0.500, 0.786, 0.300, 0.795, 0.797],
  [-1.85,  0.137, 0.790, 0.488, 0.190, 0.752, 0.686, 0.600, 0.780, 0.440, 0.775, 0.250, 0.768, 0.769],
  [-2.30,  0.140, 0.808, 0.475, 0.160, 0.760, 0.682, 0.575, 0.796, 0.400, 0.745, 0.220, 0.728, 0.729],
  [-2.65,  0.158, 0.770, 0.472, 0.150, 0.722, 0.662, 0.540, 0.752, 0.360, 0.690, 0.200, 0.664, 0.665],
  [-2.90,  0.192, 0.672, 0.462, 0.135, 0.632, 0.615, 0.475, 0.676, 0.320, 0.625, 0.170, 0.603, 0.603],
];
const CURVAS = (() => {
  const filas = [...TABLA].reverse();
  const xs = filas.map(f => f[0]);
  return Array.from({ length: 13 }, (_, k) => monotona(xs, filas.map(f => f[k + 1])));
})();

/** The nine control points of the half-section, before the nose and tail. */
function controlesBase(x: number): P2[] {
  const v = CURVAS.map(c => c(x));
  const [yb, hw, ys, rb, zo, yo, zc, yc, zi, yi, zv, yv, yt] = v;
  return [[0, yb], [hw - rb, yb], [hw - rb * 0.293, yb + rb * 0.293], [hw, ys], [zo, yo], [zc, yc], [zi, yi], [zv, yv], [0, yt]];
}

/**
 * Nose: from XN0 to the tip the base section turns into an ellipse and
 * shrinks to the mouth, along a quarter circle seen from the side (x = XN0 +
 * L sin φ, size = mouth + (1 − mouth) cos φ): at XN0 it carries on the body's
 * line, at the tip it faces forward. That band is the lip of the intake.
 */
const LN = X_MORRO - XN0;
const BASE_N = controlesBase(XN0);
function enMorro(x: number): P2[] {
  const u = Math.min(1, Math.max(0, (x - XN0) / LN)), c = Math.sqrt(Math.max(0, 1 - u * u));
  const b = BASE_N, cy = BOCA.cy, a = b[3][0], bUp = b[8][1] - cy, bDn = cy - b[0][1];
  const beta = Math.min(1, u * 1.6);
  const kz = BOCA.a / a + (1 - BOCA.a / a) * c, kUp = BOCA.b / bUp + (1 - BOCA.b / bUp) * c, kDn = BOCA.b / bDn + (1 - BOCA.b / bDn) * c;
  return b.map(([z, y]) => {
    const dy = y - cy, q = Math.hypot(z / a, dy / (dy > 0 ? bUp : bDn));
    const f = q > 1e-6 ? 1 + beta * (1 / q - 1) : 1;
    return [z * f * kz, cy + dy * f * (dy > 0 ? kUp : kDn)] as P2;
  });
}

/** Tail: the base section scaled towards (0, CYT), round in side view and in plan (as `unLitroForma`). */
interface Tapa { x0: number; largo: number; cy: number; p: number; base: P2[]; g: [number, number, number] }
function tapa(x0: number, xPunta: number, cy: number, p: number): Tapa {
  const dir = Math.sign(xPunta - x0), largo = Math.abs(xPunta - x0), e = 0.01;
  const b = controlesBase(x0), a = controlesBase(x0 - dir * e);
  const rel = (v0: number, vIn: number, ref: number) => Math.min(0.85, Math.max(0, ((vIn - v0) / e) * largo / Math.max(1e-3, ref)));
  const hw0 = b[3][0], yt0 = b[8][1], yb0 = b[0][1];
  return { x0, largo, cy, p, base: b, g: [rel(hw0, a[3][0], hw0), rel(yt0, a[8][1], yt0 - cy), rel(cy - yb0, cy - a[0][1], cy - yb0)] };
}
const TAPA_COLA = tapa(XT0, X_COLA, CYT, PT);
function enTapa(T: Tapa, x: number): P2[] {
  const s = Math.min(1, Math.abs(x - T.x0) / T.largo), r = Math.pow(Math.max(0, 1 - Math.pow(s, T.p)), 1 / T.p);
  const [kz, kUp, kDn] = T.g.map(g => r * (1 - g * s));
  const a = T.base[3][0], bUp = T.base[8][1] - T.cy, bDn = T.cy - T.base[0][1], beta = s * s;
  return T.base.map(([z, y]) => {
    const dy = y - T.cy, b = dy > 0 ? bUp : bDn, q = Math.hypot(z / a, dy / b);
    const f = q > 1e-6 ? 1 + beta * (1 / q - 1) : 1;
    return [z * f * kz, T.cy + dy * f * (dy > 0 ? kUp : kDn)] as P2;
  });
}

/** Control points at x, nose and tail included. */
export function controles(x: number): P2[] {
  if (x > XN0) return enMorro(x);
  if (x < XT0) return enTapa(TAPA_COLA, x);
  return controlesBase(x);
}

// -------------------------------------------------- parameter t along the section
/** t at each control point. */
export const TS = [0, 0.10, 0.15, 0.27, 0.42, 0.54, 0.66, 0.80, 1];

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
/** Point (z, y) of the half-section at parameter t (no bonnet bulge). */
export function punto(s: Sec, t: number): P2 {
  const tt = Math.min(1, Math.max(0, t));
  let k = 0; while (k < 7 && tt > TS[k + 1]) k++;
  const u = (tt - TS[k]) / (TS[k + 1] - TS[k]);
  const e = s.ext;
  return cr(e[k], e[k + 1], e[k + 2], e[k + 3], u);
}

// ------------------------------------------------------------- bonnet bulge
/**
 * The bonnet bulge, offset to the right (+z): the XK six leans 8½° and the
 * bulge clears the ram pipes of the Webers on the right (Wikipedia, after
 * Porter). A smooth blister from the front of the bonnet back to the scuttle.
 */
const BULTO = { z: 0.135, w: 0.165, h: 0.034, x0: 0.50, x1: 0.30, x2: -0.42, x3: -0.70 };
const suaveEscalon = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function bulto(x: number, z: number): number {
  const dz = Math.abs(z - BULTO.z) / BULTO.w; if (dz >= 1) return 0;
  const fx = suaveEscalon(BULTO.x0, BULTO.x1, x) * suaveEscalon(BULTO.x3, BULTO.x2, x);
  if (fx <= 0) return 0;
  const c = Math.cos(dz * Math.PI / 2);
  return BULTO.h * fx * c * c;
}

// ------------------------------------------------------- fast lookups (cache)
const NT = 96;            // points per cached half-section
const PASO_CACHE = 0.008; // stations blended linearly in between
const cache = new Map<number, Float64Array>();
function polilinea(i: number): Float64Array {
  let p = cache.get(i);
  if (!p) {
    const s = sec(Math.min(X_MORRO, X_COLA + i * PASO_CACHE));
    p = new Float64Array(NT * 2 + 2);
    for (let k = 0; k <= NT; k++) { const [z, y] = punto(s, k / NT); p[2 * k] = z; p[2 * k + 1] = y; }
    cache.set(i, p);
  }
  return p;
}
const N_CACHE = Math.ceil(LARGO / PASO_CACHE);
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
/** Outer skin z (right side) at height y, or NaN (the outermost crossing). */
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
/** Skin height seen from above at (x, z), bonnet bulge included, or NaN. */
export function arribaY(x: number, z: number): number {
  const [a, b, w] = vecinos(x), az = Math.abs(z); let best = NaN;
  let z0 = a[0] + (b[0] - a[0]) * w, y0 = a[1] + (b[1] - a[1]) * w;
  for (let k = 1; k <= NT; k++) {
    const z1 = a[2 * k] + (b[2 * k] - a[2 * k]) * w, y1 = a[2 * k + 1] + (b[2 * k + 1] - a[2 * k + 1]) * w;
    if ((az - z0) * (az - z1) <= 0 && z0 !== z1) { const yy = y0 + (y1 - y0) * (az - z0) / (z1 - z0); if (!(yy <= best)) best = yy; }
    z0 = z1; y0 = y1;
  }
  return best + bulto(x, z);
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
function bordeX(z: number, y: number, iIn: number, iOut: number): number {
  const P = polilinea;
  if (!dentro(P(iIn), P(iIn), 0, z, y)) return NaN;
  let lo = iIn, hi = iOut;
  if (dentro(P(hi), P(hi), 0, z, y)) return X_COLA + hi * PASO_CACHE;
  while (Math.abs(hi - lo) > 1) { const m = Math.round((lo + hi) / 2); if (dentro(P(m), P(m), 0, z, y)) lo = m; else hi = m; }
  const a = P(lo), b = P(hi); let wl = 0, wh = 1;
  for (let k = 0; k < 6; k++) { const wm = (wl + wh) / 2; if (dentro(a, b, wm, z, y)) wl = wm; else wh = wm; }
  return X_COLA + (lo + (hi - lo) * (wl + wh) / 2) * PASO_CACHE;
}
const iDe = (x: number) => Math.round((x - X_COLA) / PASO_CACHE);
/** x of the skin seen from the front at (z, y), searching forward from `desde` (inside the body), or NaN. */
export function frenteX(z: number, y: number, desde = 0.3): number { return bordeX(z, y, iDe(desde), N_CACHE); }
/** x of the skin seen from behind at (z, y), or NaN. */
export function detrasX(z: number, y: number, desde = -2.5): number { return bordeX(z, y, iDe(desde), 0); }

// --------------------------------------------------------- envelope
/** [x, floor, top, max half-width] every `paso` m, from the same sections as the mesh (the body: no fin, no screen). */
export function envolvente(paso = 0.05): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let x = X_MORRO; x >= X_COLA - 1e-9; x -= paso) {
    const s = sec(Math.max(X_COLA + 1e-4, Math.min(X_MORRO - 1e-4, x)));
    let yb = Infinity, yt = -Infinity, hw = 0;
    for (let k = 0; k <= 80; k++) { const [z, y] = punto(s, k / 80); yb = Math.min(yb, y); yt = Math.max(yt, y + bulto(x, z)); hw = Math.max(hw, z); }
    const r = (v: number) => Math.round(v * 1000) / 1000;
    out.push([r(x), r(yb), r(yt), r(hw)]);
  }
  return out;
}
