// ============================================================================
// CUADRICICLO BASCULANTE · la forma (2026-11-15, Eugenio)
// ============================================================================
// «…falta un vehículo de cuatro ruedas basculantes entre la moto y el microcoche
// tipo Twizy de unos 250 kg, como el francés [el Lumeneo Smera], pero reclinado
// como el velomóvil… con un techo un 25 % más bajo y un culo terminado más como
// el Aptera de forma curva hasta la cola, y hazle el carenado a las ruedas
// delanteras… y que bascule, con un botón».
//
// Pure (no three.js): the viewer, the masses, the checks and the wind tunnel's
// Web Worker all read the same functions.
//
// Axes (m): x forward with the front axle at x = 0, y up from the ground, z to
// the side (+z right). The body is ONE closed skin: every cross-section is two
// superellipses (an upper and a lower half) that share the waist, at a height
// `centro` of the way from the belly to the roof. Its three outlines along x —
// the roof line, the belly line and the half-width — are monotone cubic splines
// (Fritsch–Carlson) through a handful of points, so between two points a line
// never overshoots: no bumps, whatever the sliders say. The nose closes to a
// point (an elliptic or parabolic cap), the tail to a thin straight edge (the
// Aptera's), capped by a flat face.
//
// Between the front wheels the body narrows by itself: its half-width can never
// come closer than `hueco` to the space the front wheel fairings sweep when they
// steer to full lock and lean to the maximum angle (`limiteCarenados`). That is
// what lets the fairings turn and lean with their wheels, as the Aptera's turn.

export type P3 = [number, number, number];

/** Monotone cubic interpolation (Fritsch–Carlson) through points with strictly increasing x; straight beyond the ends. */
export function pchip(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n < 2) return () => ys[0] ?? 0;
  const h: number[] = [], d: number[] = [];
  for (let k = 0; k < n - 1; k++) { h.push(xs[k + 1] - xs[k]); d.push((ys[k + 1] - ys[k]) / h[k]); }
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) { m[k] = 0; continue; }
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
  }
  // the ends: one-sided, kept monotone (and flat where the data turns)
  for (const [k, j] of [[0, 0], [n - 1, n - 2]] as const) if (d[j] === 0 || Math.sign(m[k]) !== Math.sign(d[j])) m[k] = 0; else if (Math.abs(m[k]) > 3 * Math.abs(d[j])) m[k] = 3 * d[j];
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    const t = (x - xs[lo]) / h[lo], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[lo] + (t3 - 2 * t2 + t) * h[lo] * m[lo] + (-2 * t3 + 3 * t2) * ys[lo + 1] + (t3 - t2) * h[lo] * m[lo + 1];
  };
}
/** Points sorted by x and with duplicates merged (pchip needs strictly increasing x). */
function ordenar(p: [number, number][]): [number[], number[]] {
  const q = [...p].sort((a, b) => a[0] - b[0]), xs: number[] = [], ys: number[] = [];
  for (const [x, y] of q) { if (xs.length && x - xs[xs.length - 1] < 1e-4) { ys[ys.length - 1] = y; continue; } xs.push(x); ys.push(y); }
  return [xs, ys];
}
/** Smooth minimum (soft, width k): equals min(a, b) far from a = b, rounds the corner where they meet. */
export const smin = (a: number, b: number, k = 0.015) => {
  if (!Number.isFinite(b)) return a;
  const m = Math.min(a, b);
  return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k));
};
export const smax = (a: number, b: number, k = 0.01) => -smin(-a, -b, k);
const spow = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

/** Everything the body's shape needs, already clamped (geometriaBasculante.ts resolves the sliders into these). */
export interface DimForma {
  /** nose tip and tail edge (m, x) */
  xn: number; xt: number;
  /** roof height, body width, belly clearance (m) */
  H: number; W: number; suelo: number;
  /** nose: tip height (m), 0 parabolic point … 1 round, length of the rounded cap (m), width of the nose zone (fraction of W) */
  yMorro: number; puntaMorro: number; largoPunta: number; anchoMorro: number;
  /** bonnet height at the windscreen base (m), windscreen base x (m), windscreen length along x (m), where the roof starts falling (x, m) */
  yCapo: number; xParabrisas: number; largoParabrisas: number; xCaida: number;
  /** tail: edge height (m), the Aptera curve's exponent, its width (fraction of W), its thickness (m), where the belly starts rising (x, m) */
  yCola: number; curvaCola: number; anchoCola: number; grosorCola: number; xBajosCola: number;
  /** where the belly starts rising towards the nose (x, m) */
  xBajosMorro: number;
  /** section: upper and lower superellipse exponents, the waist's height as a fraction of belly → roof */
  nU: number; nL: number; centro: number;
  /** the full width runs from xAncho0 back to xAncho1 (x, m) */
  xAncho0: number; xAncho1: number;
  /** windows: belt as a fraction of the upper half, window top likewise; where the side glass ends (x, m) */
  cintura: number; ventAlto: number; xCupFin: number;
}

export interface Seccion { x: number; top: number; bot: number; hw: number; yc: number }

export interface FormaBasculante {
  D: DimForma;
  frame: (x: number) => Seccion;
  /** a point on the section at x, at angle θ (0 the right waist, π/2 the roof, π the left waist, 3π/2 the belly), `off` metres outwards */
  sec: (f: Seccion, th: number, off?: number) => P3;
  /** half-width of the body at (x, y) (m); NaN outside its height */
  ladoZ: (x: number, y: number) => number;
  /** roof height at x */
  techo: (x: number) => number;
  /** the belly's height at x */
  bajos: (x: number) => number;
  /** silhouette every 3 cm, nose to tail: [x, belly, roof, half-width] (the tunnel's input) */
  envolvente: () => [number, number, number, number][];
  /** area of the section at x (m²) */
  areaSeccion: (x: number, n?: number) => number;
  /** the angles of the belt and the window top on the upper half, and the top of the black belly band on the lower half */
  thCintura: number; thVentana: number; thBajos: number;
  /** the body's own half-width before the fairings narrow it (for the explanations) */
  hwLibre: (x: number) => number;
}

/** The belly band: from the bottom up to this fraction of the lower half-height. */
const BANDA_BAJOS = 0.55;

/**
 * What the body must hold inside (2026-11-15, Eugenio: «quiero que el carenado frontal, el morro, envuelva las 2 ruedas
 * delanteras basculantes con una sola pieza muy aerodinámica»): points (x, y, z ≥ 0, mirrored to −z) that must lie inside
 * the skin, and `sobre`, the roof's height over the highest of them (m). The front wheel wells' roofs and outer walls.
 */
export interface Envuelve { pts: P3[]; sobre: number }

/** The nose cap's profile for a design: 0 at the tip, 1 from `largoPunta` back (the body's own outlines multiply by it). */
function capNariz(D: DimForma) {
  const Lp = Math.max(0.05, Math.min(D.largoPunta, D.xn - D.xParabrisas - 0.02));
  return (x: number) => {
    const s = Math.min(1, Math.max(0, (D.xn - x) / Lp));
    if (s >= 1) return 1;
    const par = 1 - (1 - s) * (1 - s), eli = Math.sqrt(Math.max(0, 1 - (1 - s) * (1 - s)));
    return par + (eli - par) * D.puntaMorro;
  };
}
/**
 * How far back of the foremost point to hold, the nose must reach so that its cap does not squeeze them (the cap's
 * profile ≥ 0.99 there): the least `xn − x` (m) for this cap's length and roundness.
 */
export function largoCapNariz(D: Pick<DimForma, 'largoPunta' | 'puntaMorro'>, minimo = 0.99): number {
  const f = (s: number) => { const par = 1 - (1 - s) * (1 - s), eli = Math.sqrt(Math.max(0, 1 - (1 - s) * (1 - s))); return par + (eli - par) * D.puntaMorro; };
  let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (f(mid) >= minimo) hi = mid; else lo = mid; }
  return hi * Math.max(0.05, D.largoPunta);
}

/**
 * A requirement line (m, along x): every point's need, falling away from it as a parabola of radius `rho` (so the
 * body reaches it in a curve, not a step), then held going back from the nose (a running maximum: it never falls again
 * behind the wheels, so no waist and no bump), then averaged over the 8 cm behind each x (the running maximum only
 * grows going back, so the average is never under it). Tabulated every 5 mm from `x1` (the nose) back to `x0`;
 * −Infinity outside.
 */
function lineaRequisito(pts: [number, number][], x0: number, x1: number, rho: number): (x: number) => number {
  if (!pts.length || x1 <= x0) return () => -Infinity;
  const paso = 0.005, n = Math.ceil((x1 - x0) / paso) + 1, crudo: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = x1 - i * paso; let m = -Infinity;
    for (const [px, v] of pts) { const r = v - (x - px) * (x - px) / (2 * rho); if (r > m) m = r; }
    crudo.push(i ? Math.max(m, crudo[i - 1]) : m);
  }
  const w = Math.round(0.08 / paso), tabla = crudo.map((_, i) => { let s = 0, k = 0; for (let j = i; j <= Math.min(n - 1, i + w); j++) { s += crudo[j]; k++; } return s / k; });
  return (x: number) => {
    if (x > x1 + 1e-9 || x < x0 - 1e-9) return -Infinity;
    const u = Math.min(n - 1, Math.max(0, (x1 - x) / paso)), i = Math.min(n - 2, Math.floor(u)), t = u - i;
    return tabla[i] + (tabla[i + 1] - tabla[i]) * t;
  };
}

/**
 * The body. `limite(x)`: the half-width the front fairings leave free at x (m), or Infinity away from them
 * (`limiteCarenados`); the body's half-width is the smooth minimum of its own and this. `envuelve`: what it must hold
 * inside instead (the front wheels in the nose): the roof and the half-width grow to hold it, monotonically from the
 * nose, so the guarantee of no bumps stands; the roof's height and the body's width grow too if it asks for more.
 */
export function crearForma(D0: DimForma, limite: (x: number) => number = () => Infinity, envuelve?: Envuelve): FormaBasculante {
  if (!envuelve || !envuelve.pts.length) return construirForma(D0, limite, null);
  const g = capNariz(D0);
  // 1. the roof over the points: the body's own roof line (rising from the nose to xC) or this, whichever is higher
  const narizDe = (H: number) => { const yCapo = Math.min(D0.yCapo, H - 0.12); return { yM: Math.min(D0.yMorro, yCapo - 0.04) }; };
  const necesTecho = (yM: number) => envuelve.pts.map(([px, py]) => [px, yM + (py + envuelve.sobre - yM) / Math.max(0.05, g(px))] as [number, number]);
  let H = Math.max(D0.H, Math.max(...envuelve.pts.map(p => p[1])) + envuelve.sobre + 0.03);
  H = Math.max(H, Math.max(...necesTecho(narizDe(H).yM).map(p => p[1])) + 0.01);
  const xC = Math.min(D0.xCaida, D0.xParabrisas - D0.largoParabrisas - 0.06);
  const reqTecho = lineaRequisito(necesTecho(narizDe(H).yM), xC, D0.xn, 0.30);
  // 2. the half-width each point needs in the section that roof gives (the superellipse through it), before the cap
  const F0 = construirForma({ ...D0, H }, limite, { techo: reqTecho, ancho: () => -Infinity });
  const necAncho: [number, number][] = [];
  for (const [px, py, pz] of envuelve.pts) {
    const f = F0.frame(px); if (py <= f.bot + 1e-4) continue;   // under the belly: it shows there, as any car's wheel does
    const arriba = py >= f.yc, n = arriba ? D0.nU : D0.nL, hh = arriba ? f.top - f.yc : f.yc - f.bot;
    const s = Math.min(0.97, Math.pow(Math.min(1, Math.abs(py - f.yc) / Math.max(1e-6, hh)), n));
    necAncho.push([px, Math.abs(pz) / Math.pow(1 - s, 1 / n) / Math.max(0.05, g(px))]);
  }
  // the plan: the requirement held from the nose to its widest (at the wheels), then narrowing in one smooth curve
  // (a half cosine, flat at both ends) to the body's own width where the tail starts: widest at the front wheels and
  // narrowing all the way back, a teardrop seen from above (one top, no waist), and the cabin keeps its own width
  // where the riders' shoulders are and where its lower corners must clear the road at full lean
  const pico = Math.max(0, ...necAncho.map(p => p[1]));
  const W = D0.W;
  const subida = lineaRequisito(necAncho, D0.xAncho1, D0.xn, 0.15);
  let xPico = D0.xn; for (let x = D0.xn; x >= D0.xAncho1; x -= 0.005) { if (subida(x) >= pico - 1e-6) { xPico = x; break; } }
  // behind the widest, never inside any point either: the least line that only narrows going back and holds them all
  // (each point's need, falling away as the same parabola, and the largest of those from the tail forwards)
  const paso = 0.005, nB = Math.max(1, Math.ceil((xPico - D0.xAncho1) / paso)), detras: number[] = [];
  for (let i = 0; i <= nB; i++) {
    const x = D0.xAncho1 + i * paso; let v = -Infinity;
    for (const [px, n] of necAncho) { const r = n - (x - px) * (x - px) / (2 * 0.15); if (r > v) v = r; }
    detras.push(i ? Math.max(v, detras[i - 1]) : v);
  }
  const reqDetras = (x: number) => { const u = Math.min(nB, Math.max(0, (x - D0.xAncho1) / paso)), i = Math.min(nB - 1, Math.floor(u)), t = u - i; return nB < 1 ? detras[0] : detras[i] + (detras[i + 1] - detras[i]) * t; };
  const reqAncho = pico <= W / 2 ? subida : (x: number) => {
    if (x >= xPico) return subida(x);
    if (x < D0.xAncho1) return -Infinity;
    const t = (xPico - x) / Math.max(1e-6, xPico - D0.xAncho1);
    return Math.max(reqDetras(x), W / 2 + (pico - W / 2) * (1 + Math.cos(Math.PI * t)) / 2);
  };
  return construirForma({ ...D0, H, W }, limite, { techo: reqTecho, ancho: reqAncho });
}

function construirForma(D: DimForma, limite: (x: number) => number, req: { techo: (x: number) => number; ancho: (x: number) => number } | null): FormaBasculante {
  const { xn, xt, H, W, suelo } = D;
  // ── the roof line: the Aptera curve from the tail edge up to `xCaida`, the roof, the windscreen, the bonnet, the nose
  const yTop = D.yCola + D.grosorCola / 2, yBot = D.yCola - D.grosorCola / 2;
  const xC = Math.min(D.xCaida, D.xParabrisas - D.largoParabrisas - 0.06);
  const pt: [number, number][] = [[xt, yTop]];
  for (let k = 1; k < 10; k++) { const t = 1 - k / 10, x = xC - (xC - xt) * t; pt.push([x, yTop + (H - yTop) * (1 - Math.pow(t, D.curvaCola))]); }
  const xTechoIni = D.xParabrisas - D.largoParabrisas, yCapo = Math.min(D.yCapo, H - 0.12);
  pt.push([xC, H], [xTechoIni, H - 0.012], [D.xParabrisas - 0.45 * D.largoParabrisas, yCapo + 0.80 * (H - yCapo)], [D.xParabrisas, yCapo]);
  const yM = Math.min(D.yMorro, yCapo - 0.04);
  pt.push([xn - 0.45 * (xn - D.xParabrisas), yM + 0.70 * (yCapo - yM)], [xn, yM]);
  const topLinea = pchip(...ordenar(pt));
  // (the requirement only from the roof's top forwards, where this line only rises going back: the higher of two rising
  // lines rises too; at xC the roof is already above the requirement, so the two meet there with no step)
  const topRaw = req ? (x: number) => x >= xC ? Math.max(topLinea(x), req.techo(x)) : topLinea(x) : topLinea;
  // ── the belly: the tail's long rising curve (the Aptera's diffuser), flat, and up to the nose tip
  const xB = Math.min(D.xBajosCola, D.xBajosMorro - 0.05), xBM = Math.min(D.xBajosMorro, xn - 0.12);
  const pb: [number, number][] = [[xt, Math.max(suelo + 0.005, yBot)]];
  for (let k = 1; k < 8; k++) { const t = 1 - k / 8, x = xB - (xB - xt) * t; pb.push([x, suelo + (Math.max(suelo + 0.005, yBot) - suelo) * Math.pow(t, 1.7)]); }
  pb.push([xB, suelo], [xBM, suelo], [xBM + 0.55 * (xn - xBM), suelo + 0.30 * (yM - suelo)], [xn, yM]);
  const botRaw = pchip(...ordenar(pb));
  // ── the half-width in plan: full from xAncho0 to xAncho1, the tail narrowing to its edge, the nose to its zone
  const ph: [number, number][] = [[xt, W / 2 * D.anchoCola]];
  for (let k = 1; k < 8; k++) { const t = 1 - k / 8, x = D.xAncho1 - (D.xAncho1 - xt) * t; ph.push([x, W / 2 * (1 - (1 - D.anchoCola) * Math.pow(t, 1.8))]); }
  ph.push([D.xAncho1, W / 2], [D.xAncho0, W / 2], [D.xAncho0 + 0.5 * (xn - D.xAncho0), W / 2 * (D.anchoMorro + (1 - D.anchoMorro) * 0.45)], [xn, W / 2 * D.anchoMorro]);
  const hwLinea = pchip(...ordenar(ph));
  // (likewise from the full width's end forwards, where this line only widens going back; there it is W/2, which the
  // requirement never passes: crearForma widened W to hold it)
  const hwRaw = req ? (x: number) => x >= D.xAncho1 ? Math.max(hwLinea(x), req.ancho(x)) : hwLinea(x) : hwLinea;
  // ── the nose cap: 0 a parabolic point, 1 a quarter ellipse (round); both reach the body with no kink
  const g = capNariz(D);
  const frame = (x: number): Seccion => {
    const xx = Math.min(xn, Math.max(xt, x)), k = g(xx);
    const top = yM + (topRaw(xx) - yM) * k, bot = yM - (yM - botRaw(xx)) * k;
    const hw = Math.max(0, smin(hwRaw(xx), limite(xx))) * k;
    return { x: xx, top, bot, hw, yc: bot + (top - bot) * D.centro };
  };
  const punto = (f: Seccion, th: number): [number, number] => {
    // (cos(3π/2) is −1.8e−16, not 0: snapped, so the grid's first and last angle are the very same point and the skin closes)
    const c0 = Math.cos(th), s0 = Math.sin(th), c = Math.abs(c0) < 1e-12 ? 0 : c0, s = Math.abs(s0) < 1e-12 ? 0 : s0, arriba = s >= 0, n = arriba ? D.nU : D.nL;
    return [f.hw * spow(c, 2 / n), f.yc + (arriba ? f.top - f.yc : f.yc - f.bot) * spow(s, 2 / n)];
  };
  const sec = (f: Seccion, th: number, off = 0): P3 => {
    const [z, y] = punto(f, th);
    if (!off) return [f.x, y, z];
    const e = 1e-3, a = punto(f, th - e), b = punto(f, th + e), tz = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tz, ty) || 1;
    return [f.x, y - tz / L * off, z + ty / L * off];
  };
  const ladoZ = (x: number, y: number) => {
    const f = frame(x);
    if (y > f.top || y < f.bot) return NaN;
    const arriba = y >= f.yc, n = arriba ? D.nU : D.nL, hh = arriba ? f.top - f.yc : f.yc - f.bot;
    if (hh <= 1e-9) return f.hw;
    const s = Math.pow(Math.min(1, Math.abs(y - f.yc) / hh), n / 2), c = Math.sqrt(Math.max(0, 1 - s * s));
    return f.hw * Math.pow(c, 2 / n);
  };
  const areaSeccion = (x: number, n = 72) => {
    const f = frame(x); let a = 0, p = punto(f, 0);
    for (let j = 1; j <= n; j++) { const q = punto(f, 2 * Math.PI * j / n); a += p[0] * q[1] - q[0] * p[1]; p = q; }
    return Math.abs(a) / 2;
  };
  const envolvente = (): [number, number, number, number][] => {
    const o: [number, number, number, number][] = [];
    for (let x = xn; x > xt + 1e-6; x -= 0.03) { const f = frame(x); o.push([x, f.bot, f.top, f.hw]); }
    const f = frame(xt); o.push([xt, f.bot, f.top, f.hw]);
    return o;
  };
  const th = (frac: number, n: number) => Math.asin(Math.min(1, Math.pow(Math.min(1, Math.max(0, frac)), n / 2)));
  return {
    D, frame, sec, ladoZ, techo: x => frame(x).top, bajos: x => frame(x).bot, envolvente, areaSeccion,
    thCintura: th(D.cintura, D.nU), thVentana: th(D.ventAlto, D.nU), thBajos: -th(BANDA_BAJOS, D.nL),
    hwLibre: x => Math.max(0, hwRaw(Math.min(xn, Math.max(xt, x)))) * g(Math.min(xn, Math.max(xt, x))),
  };
}

// ------------------------------------------------------------------ the front wheel fairings
/** A wheel fairing's sizes (m and factors). */
export interface DimPod {
  r: number; w: number;
  /** tyre to the fairing's inside (m) */
  hueco: number;
  /** height (× the tyre's radius + gap), width (×), front and tail length (× radius + gap) */
  alto: number; ancho: number; frente: number; cola: number;
  /** tail: 0 round … 1 pointed */
  forma: number;
  /** how far below the axle it comes down, as a fraction of the radius (0: down to the axle) */
  cubre: number;
  /** section exponent (2 an ellipse, more a rounded box) */
  n: number;
}
export interface Pod {
  D: DimPod;
  /** front and tail ends along x' (m, from the axle; the tail negative) */
  x0: number; x1: number;
  /** half-height and half-width at x' */
  hy: (xl: number) => number; hz: (xl: number) => number;
  /** the opening's height (m, from the axle; negative) */
  yCorte: number;
  /** the lowest and highest angle of the shell at x' (the shell runs over the top from θ0 to π − θ0) */
  th0: (xl: number) => number;
  /** a point of the shell (local: x' forward, y up from the axle, z outwards from the wheel's plane) */
  punto: (xl: number, th: number) => P3;
}

export function crearPod(D: DimPod): Pod {
  const R = D.r + D.hueco, H0 = R * D.alto, Lf = R * D.frente, Lb = R * D.cola, ws = D.w / 2 + D.hueco;
  const q = 0.5 + 0.5 * D.forma;
  const f = (xl: number) => {
    if (xl >= 0) { const u = Math.min(1, xl / Lf); return Math.sqrt(Math.max(0, 1 - u * u)); }
    const u = Math.min(1, -xl / Lb); return Math.pow(Math.max(0, 1 - u * u), q);
  };
  // never lower than the tyre (with 12 % to spare) where the tyre is: a tail or a nose too short for the shape asked for
  // grows round the tyre instead of cutting it (the check «Neumático dentro de su carenado» says how much room is left)
  const hy = (xl: number) => { const ht = Math.sqrt(Math.max(0, R * R - xl * xl)); return smax(H0 * f(xl), ht * 1.12 + (ht > 0 ? 0.004 : 0), 0.006); };
  // the width that holds the tyre's corner (half its width plus the gap, at the tyre's height there), never less than
  // the fairing's own tapered width; the requirement fades out over 10 cm past the tyre so the outline has no step
  const hz = (xl: number) => {
    const ht = Math.sqrt(Math.max(0, R * R - xl * xl)), h = hy(xl);
    let req: number;
    if (Math.abs(xl) < R) req = ht >= h * 0.995 ? ws * 3 : ws / Math.pow(1 - Math.pow(ht / h, D.n), 1 / D.n);
    else { const u = (Math.abs(xl) - R) / 0.10; req = u >= 1 ? 0 : ws * (1 - u * u); }
    return smax(req, ws * D.ancho * Math.pow(f(xl), 0.6), 0.008);
  };
  const yCorte = -D.r * D.cubre;
  const th0 = (xl: number) => {
    const h = hy(xl);
    if (h <= -yCorte + 1e-6) return -Math.PI / 2;
    return -Math.asin(Math.min(1, Math.pow(-yCorte / h, D.n / 2)));
  };
  const punto = (xl: number, th: number): P3 => {
    const c = Math.cos(th), s = Math.sin(th);
    return [xl, hy(xl) * spow(s, 2 / D.n), hz(xl) * spow(c, 2 / D.n)];
  };
  return { D, x0: -Lb, x1: Lf, hy, hz, yCorte, th0, punto };
}

/** The steering and lean of one front corner as seen from the body: where its kingpin is, and how its wheel turns. */
export interface EsquinaDel {
  /** axle x (m), the kingpin's z at rest (m, right side), the wheel's plane's offset outboard of the kingpin (m) */
  x: number; zK: number; e: number;
  /** arm half-length to the kingpin (m) and the most the arms rotate against the body (rad) */
  Lk: number; betaMax: number;
  /** full steering lock (rad): this wheel as the inner one (it turns towards the body's other side, its fairing's tail
   *  swinging in) and as the outer one (Ackermann: less, its fairing's nose swinging in) */
  giroDentro: number; giroFuera: number;
}

/**
 * The half-width the front fairings leave free along the body (m, as a function of x): every point of the fairing's
 * inner half, with the wheel steered anywhere up to full lock and the arms swung to the maximum lean (which pulls the
 * fairing in by Lk·(1 − cos β)), minus `hueco`. Away from a point the limit grows as a parabola of radius `rho`, so the
 * body comes back to its own width in a smooth curve and not in a step. Tabulated every 5 mm.
 */
export function limiteCarenados(pod: Pod, q: EsquinaDel, hueco: number, rho = 0.15): (x: number) => number {
  const pts: [number, number][] = [];
  const nx = 28, nth = 9, ng = 9;
  const dentro = q.Lk * (1 - Math.cos(q.betaMax));
  for (let i = 0; i <= nx; i++) {
    const xl = pod.x0 + (pod.x1 - pod.x0) * i / nx;
    for (let j = 0; j <= nth; j++) {
      // the inner half (towards the body): θ from π/2 (top) to 3π/2 (bottom), at the shell's own lower edge
      const th = Math.PI / 2 + Math.PI * j / nth, t0 = pod.th0(xl);
      if (Math.sin(th) < Math.sin(t0) - 1e-9) continue;
      const p = pod.punto(xl, th);
      // from the kingpin: x' forward, z outward (+e is the wheel's plane outboard of it)
      const lx = p[0], lz = q.e + p[2];
      for (let k = 0; k < ng; k++) {
        // (+ turns the nose to −z: for the right-hand corner that is a left turn, where it is the outer wheel)
        const d = -q.giroDentro + (q.giroDentro + q.giroFuera) * k / (ng - 1), cs = Math.cos(d), sn = Math.sin(d);
        const x = q.x + lx * cs + lz * sn, z = q.zK - dentro + (-lx * sn + lz * cs);
        pts.push([x, z]);
      }
    }
  }
  const x0 = Math.min(...pts.map(p => p[0])) - 0.6, x1 = Math.max(...pts.map(p => p[0])) + 0.6, paso = 0.005;
  const crudo: number[] = [];
  for (let x = x0; x <= x1 + 1e-9; x += paso) {
    let m = Infinity;
    for (const [px, pz] of pts) { const v = pz - hueco + (x - px) * (x - px) / (2 * rho); if (v < m) m = v; }
    crudo.push(m);
  }
  // No bump between the fairings: going forwards the limit never widens again (a running minimum from the back), so
  // the nose does not bulge at the axle where the fairings, swinging in front and behind, leave a little more room.
  // Then a box average over the next 8 cm forwards: it smooths the corner where the minimum starts to hold, and since
  // the running minimum only falls going forwards, the average is never wider than the limit itself.
  for (let i = 1; i < crudo.length; i++) crudo[i] = Math.min(crudo[i], crudo[i - 1]);
  const w = Math.round(0.08 / paso), tabla = crudo.map((_, i) => { let s = 0, n = 0; for (let j = i; j <= Math.min(crudo.length - 1, i + w); j++) { s += crudo[j]; n++; } return s / n; });
  return (x: number) => {
    if (x < x0 || x > x1) return Infinity;
    const u = (x - x0) / paso, i = Math.min(tabla.length - 2, Math.floor(u)), t = u - i;
    return tabla[i] + (tabla[i + 1] - tabla[i]) * t;
  };
}
