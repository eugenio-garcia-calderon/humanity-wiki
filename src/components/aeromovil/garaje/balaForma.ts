/*
 * Shape of the «Cuadriciclo Bala en rombo»: one closed skin swept along X.
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
 *
 * EDITABLE (2026-11-09, Eugenio: «permíteme editarlo»): the shape is built
 * from a set of dimensions (`DimBala`). The hand-drawn keyframes below are the
 * garage model's, written for `DIM_REF`; other dimensions reach them through
 * a stretch along x (piecewise linear between the nose tip, the front axle,
 * the two ends of the canopy, the rear axle and the tail tip), a width
 * factor, a lift of the belly and a scale of everything above the widest
 * point up to the canopy's crest. With `DIM_REF` every one of those is the
 * identity, written so that it is exactly the identity in floating point
 * (v + 0, v · 1): the garage model is the same to the last vertex
 * (scripts/bala-huella.ts checks it).
 */

// ------------------------------------------------------------ the dimensions
/** What the editor's sliders change (see `geometriaBala.ts`). Metres unless said. */
export interface DimBala {
  /** Front axle to rear axle. */
  batalla: number;
  /** Front axle to the tip of the nose. */
  morro: number;
  /** Rear axle to the tip of the tail. */
  cola: number;
  /** Body width at its widest (the lateral pods stand outside it). */
  ancho: number;
  /** Top of the canopy above the road. */
  alto: number;
  /** Lowest point of the belly above the road. */
  suelo: number;
  /** Where the canopy rises (behind the front axle) and where it has come down (behind the front axle). */
  cupIni: number; cupFin: number;
  /** Sharpness of the nose cone (the ogive's exponent: higher is more pointed). */
  puntaMorro: number;
  /** Height the tail cone closes to. */
  puntaCola: number;
  /** Wheel radii (front and rear; lateral) and tyre widths. */
  rDel: number; rLat: number; anchoNeu: number; anchoNeuLat: number;
  /** Lateral track: centre to centre of the lateral wheels. */
  via: number;
  /**
   * The «Triciclo Bala» (2026-11-10) only: where the wheels in pods stand (x of
   * their axle; the Cuadriciclo en rombo has them at mid-wheelbase), and the pods' and
   * arms' own shape (balaMedidas.ts `podDe`, `brazosDe`). The body never reads
   * these: with them absent every number is the Cuadriciclo en rombo's.
   */
  xLat?: number;
  pod?: { esc: number; ancho: number; cola: number };
  cuerdaBrazo?: number;
  /**
   * The Triciclo only (2026-11-11, round three: «que la altura libre sobre el suelo sea mucho mayor»): a rigid
   * lift of the whole body (m). `suelo` is still the real belly height; the shape below it is drawn with the
   * belly at `suelo − elevar` and then raised `elevar`, so above 15.8 cm the cabin keeps its size and the whole
   * body (with everything built on its floor) rises. Absent, 0: every number is the Cuadriciclo en rombo's, bit for bit.
   */
  elevar?: number;
  /**
   * The «Cuadriciclo Bala clásico» (2026-11-11) only: on the rear pods' view of the shape, the belly's height under
   * the arms' roots at the rear axle (absolute, m). The tail sweeps up there, so the lower link meets the body
   * higher than it meets its pod (balaMedidas.ts `brazosDe`). The body never reads it; absent, nothing changes.
   */
  vientreBrazos?: number;
  // ── Round 3 body (2026-11-12, the «Cuadriciclo Bala clásico»: nose, tail, roof). The Triciclo only; each absent or 0
  // leaves the shape exactly as it was, bit for bit (every one of them is applied only when it is set).
  /** The nose tip: 0 the ogive's point, 1 a wide, flat leading «line» like the Aptera's (round in plan, thin in side view). */
  morroLinea?: number;
  /** The nose tip's height moved this much (m, + up): the centre the nose cone closes to. */
  morroAlto?: number;
  /** The tail tip: 0 the pointed cone, 1 a flat, wide, truncated trailing edge like the Aptera's. */
  colaPlana?: number;
  /** The top of every section: 0 the round crown (an ellipse), 1 a flat one (a squarer curve through the same top). */
  techoPlano?: number;
  /** How the roof falls from its crest into the tail (−1…1): + it stays high longer and drops late, − it drops early. */
  caida?: number;
  /**
   * The line where the painted body ends and the canopy glass begins, moved this much (m, + up), all round the car
   * (balaMedidas.ts `contornoCupula`): the glass edge, the frame under it, the door windows and the roof rail follow it.
   */
  lineaCupula?: number;
  // ── The smooth («lisa») body, 2026-11-13 (Eugenio on the clásico: «la cola y el maletero tienen que ser la misma pieza…
  // nunca se permita que haya esos montículos»). Every key below is read only when `lisa` is set: absent, the shape is
  // built exactly as before, bit for bit. See `cubiertaLisa` for the deck model.
  /** 1: the tops of the nose and of the tail come from the deck model (convex sections, lines that only fall towards the ends). */
  lisa?: number;
  /** The tail's width in plan towards its end: 0 today's taper … 1 the body's full width to a straight trailing edge (Aptera). */
  colaAncho?: number;
  /** The nose's width in plan: 0 today's … 1 the body's full width with a broad rounded-square front (Aptera). */
  morroAncho?: number;
  /** Thickness of the tail's trailing edge and of the nose's leading edge (m): 0 they close to a point, as before. */
  colaGrosor?: number; morroGrosor?: number;
  /** How much the rear deck and the hood rise above the straight line from their side edge to the centre (m): 0 flat. */
  colaBombeo?: number; morroBombeo?: number;
  /** The belly's sweep up to the trailing edge: where it starts (m ahead of the rear axle; − behind it) and how much (0 today's … 1 a long curve, Aptera). */
  bajosIni?: number; bajosCurva?: number;
}

// --------------------------------------------------- from the Aeromóvil Gota
// PARAMETROS_GOTA (geometria.ts): 24″ front and rear wheels (0.61 m), 20″
// lateral wheels (0.508 m) at mid-wheelbase (xLm 1.22). The Bala keeps those
// sizes and the rhombus, with two changes (see bala.ts): wheelbase 2.45 m
// instead of 2.60 and lateral track 1.10 m instead of 1.05.
/**
 * The garage model, as drawn on 2026-11-09. Tyre sections: moped-size (80 / 70 mm)
 * instead of the Gota's 55 mm bicycle tyres, for two riders and a motor.
 */
export const DIM_REF: DimBala = {
  batalla: 2.45, morro: 0.60, cola: 0.65, ancho: 0.85, alto: 1.452, suelo: 0.124, cupIni: 0.15, cupFin: 2.00,
  puntaMorro: 0.75, puntaCola: 0.47, rDel: 0.305, rLat: 0.254, anchoNeu: 0.08, anchoNeuLat: 0.07, via: 1.10,
};
/** The stretch anchors of the reference drawing: nose tip, front axle, canopy start, canopy end, rear axle, tail tip. */
const ANCLAS_REF = [0.60, 0, -0.15, -2.00, -2.45, -3.10];
/** Everything above this height (the widest point) scales with the canopy's crest; below it stays. */
const BASE_ALTO = 0.68;

/** Nose cap: from XN0 to the tip, scaled towards (0, CYN); tail cap likewise (reference drawing). */
const XN0_REF = 0.20, CYN = 0.34;
const XT0_REF = -2.55, PT = 0.72;

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

/**
 * A piecewise-linear map from one list of anchors to another (both decreasing),
 * extended beyond the ends with the end slopes. Written as x + offset + (x − a)(s − 1),
 * so that equal anchors give back x itself, bit for bit.
 */
export function tramos(de: number[], a: number[]): (x: number) => number {
  const n = de.length;
  return (x: number) => {
    let i = 0; while (i < n - 2 && x < de[i + 1]) i++;
    const s = (a[i + 1] - a[i]) / (de[i + 1] - de[i]);
    return x + (a[i] - de[i]) + (x - de[i]) * (s - 1);
  };
}

/** 2026-11-13: the same anchors joined by a monotone cubic (C1, no overshoot); outside them, `lineal` (whose end slopes it shares). */
function tramosSuaves(de: number[], a: number[], lineal: (x: number) => number): (x: number) => number {
  const f = monotona(de.map((v, i) => [v, a[i]] as P2)), lo = Math.min(...de), hi = Math.max(...de);
  return (x: number) => (x <= lo || x >= hi ? lineal(x) : f(x));
}
/** The inverse of an increasing map, by bisection around a first guess. */
function inversa(f: (x: number) => number, guia: (y: number) => number): (y: number) => number {
  return (y: number) => {
    let lo = guia(y) - 0.5, hi = guia(y) + 0.5;
    while (f(lo) > y) lo -= 0.5; while (f(hi) < y) hi += 0.5;
    for (let i = 0; i < 52; i++) { const m = (lo + hi) / 2; if (f(m) < y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
}

// ------------------------------------------------------------ keyframes
// Each control quantity over x of the REFERENCE drawing, [x, value], between the two caps.
const K = {
  /** belly: 12–13 cm above the road, flat under the riders */
  yb: monotona([[XN0_REF, 0.162], [0.10, 0.139], [0.0, 0.129], [-0.2, 0.126], [-0.5, 0.124], [-2.1, 0.124], [-2.35, 0.132], [XT0_REF, 0.158]]),
  /**
   * Top line: nose, the canopy rising at ~42° to its crest over both helmets
   * (1.452 m at x = -1.25) and the long tail line at ~32°.
   */
  yt: monotona([[XN0_REF, 0.655], [0.10, 0.70], [0.0, 0.738], [-0.1, 0.78], [-0.2, 0.835], [-0.35, 0.955], [-0.5, 1.10], [-0.65, 1.235], [-0.8, 1.345], [-0.95, 1.415], [-1.1, 1.445], [-1.25, 1.452], [-1.4, 1.452], [-1.55, 1.442], [-1.7, 1.403], [-1.85, 1.33], [-2.0, 1.245], [-2.2, 1.12], [-2.4, 0.995], [XT0_REF, 0.905]]),
  /** widest half-width: 0.85 m body from the pilot's knees to the passenger's back */
  hw: monotona([[XN0_REF, 0.222], [0.10, 0.258], [0.0, 0.29], [-0.2, 0.338], [-0.4, 0.375], [-0.6, 0.403], [-0.85, 0.42], [-1.1, 0.425], [-1.5, 0.425], [-1.8, 0.414], [-2.05, 0.39], [-2.3, 0.345], [XT0_REF, 0.285]]),
  /** height of the widest point */
  ys: monotona([[XN0_REF, 0.38], [0.0, 0.43], [-0.4, 0.56], [-0.8, 0.65], [-1.2, 0.68], [-1.8, 0.68], [-2.2, 0.64], [XT0_REF, 0.58]]),
  /** half-width of the flat belly */
  zk: monotona([[XN0_REF, 0.07], [0.0, 0.10], [-0.4, 0.15], [-1.0, 0.17], [-1.8, 0.17], [-2.3, 0.13], [XT0_REF, 0.11]]),
  /** lower flank P2: how far out (fraction from the belly edge to the widest point) */
  f2: monotona([[XN0_REF, 0.70], [-0.4, 0.62], [-2.0, 0.62], [XT0_REF, 0.66]]),
  /** shoulder P4: height as a fraction from the widest point to the top, and half-width as a fraction of the widest */
  fsh: monotona([[XN0_REF, 0.45], [-0.1, 0.42], [-0.4, 0.26], [-0.7, 0.21], [-1.6, 0.20], [-2.0, 0.26], [-2.3, 0.36], [XT0_REF, 0.40]]),
  ksh: monotona([[XN0_REF, 0.89], [-0.2, 0.90], [-0.6, 0.93], [-1.8, 0.93], [-2.2, 0.91], [XT0_REF, 0.90]]),
};
/** Height of the lower flank point between the belly and the widest point. */
const F2Y = 0.32;
/** The canopy bubble: an ellipse from the shoulder to the top, these angles for P5..P7. */
const ANG_CUPULA = [28, 55, 78].map(a => a * Math.PI / 180);

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

/**
 * A section ready to evaluate: control points with the mirror ghosts at both ends. `lisa` (2026-11-13): on a smooth
 * body's nose and tail, the deck model's own section (`cubiertaLisa`), blended in by `w`.
 */
export interface Sec { x: number; c: P2[]; ext: P2[]; lisa?: SeccionLisa }
/** The deck model's section: below the widest point a Catmull-Rom through its own points, above it `arriba(t)`; `w` its weight against the plain one. */
export interface SeccionLisa { w: number; ext: P2[]; arriba: (t: number) => P2 }
/** The Catmull-Rom half-section through `e` (control points with their ghosts) at t. */
function enCurva(e: P2[], tt: number): P2 {
  let k = 0; while (k < 7 && tt > TS[k + 1]) k++;
  const u = (tt - TS[k]) / (TS[k + 1] - TS[k]);
  return cr(e[k], e[k + 1], e[k + 2], e[k + 3], u);
}
/** Point (z, y) of the half-section at parameter t. */
export function punto(s: Sec, t: number): P2 {
  const tt = Math.min(1, Math.max(0, t));
  const l = s.lisa;
  if (!l) return enCurva(s.ext, tt);
  const d = tt > T3 ? l.arriba(tt) : enCurva(l.ext, tt);
  if (l.w >= 1) return d;
  const o = enCurva(s.ext, tt);
  return [o[0] + (d[0] - o[0]) * l.w, o[1] + (d[1] - o[1]) * l.w];
}

// ------------------------------------------------------- the smooth deck (2026-11-13)
/*
 * Eugenio, 2026-11-13, on the clásico's tail: «la cola y el maletero tienen que ser la misma pieza, porque siempre tiene
 * que ser todo líneas planas. Ahora mismo quedan líneas curvas con montículos… tienes que desarrollar un sistema en el
 * que nunca se permita que haya esos montículos». The same rule for the hood.
 *
 * Behind the canopy glass (and ahead of the windscreen), the half-section above its widest point P3 is not drawn
 * through the canopy's control points any more. It is built from three numbers per station: P3 (the widest point),
 * the centre's height yC (the plain shape's own top line) and the deck's drop from the centre to its side edge:
 *
 *   - the deck, from the centre (z = 0) out to its edge zE = (1 − RHO)·hw: y = yC − drop·u², u = z / zE. A parabola:
 *     its highest point is the centre, it falls all the way to the edge, and it rises above the chord from the edge to
 *     the centre by drop / 4 at most (the «bombeo», the slider).
 *   - the side and the edge, from P3 up to the deck's edge: one cubic Bézier that leaves P3 straight up and meets the
 *     deck with the deck's own slope. Its control polygon is convex (checked by construction below), so the curve is.
 *   - below P3, the plain Catmull-Rom with its next point mirrored about P3's height, so it reaches P3 straight up too.
 *   So the whole upper half is convex, with one highest point, on the centre line.
 *
 * Along the car a line on the deck at a fixed fraction u of its half-width is y = yC − drop·u². The drop is
 * `bombeo · 4 · σ(v)`, v = κ(yC − cFin) / (4 · bombeo), σ(v) = v / (1 + v⁴)^¼ (σ' in (0, 1]): it is the full drop while
 * the deck is high and shrinks with the height left above the end's centre `cFin`. So dy = dyC·(1 − κσ'u²) with
 * κσ'u² < 1: every line falls exactly where the centre line falls, and nowhere rises. The centre line itself is the
 * plain shape's top (monotone: the roof's fall and the end caps' ogives). A bump on the deck cannot be drawn.
 *
 * Between the canopy and the deck the two sections are blended, point by point at equal t, over `LARGO_MEZCLA`
 * ahead of the glass's end (and behind the windscreen's start): the canopy's shoulders fade out there, on the glass.
 */
/** The deck's side edge, inboard of the widest point by this fraction of the half-width. */
export const RHO_LISA = 0.14;
/** Where the deck begins along the section (t), and how much the drop shrinks towards the ends (κ). */
export const T_CUBIERTA = 0.60;
const KAPPA_LISA = 0.35, LAMBDA_LISA = 0.55;
/** The blend between the canopy's section and the deck's (m). */
export const LARGO_MEZCLA = 0.30;
/** The deck's numbers at a station: what `arriba` draws, and what scripts/bala-cola-lisa.ts checks against. */
export interface Cubierta { zE: number; yC: number; drop: number; w: number }
function cubiertaLisa(P2: P2, P3: P2, yC: number, drop: number): { arriba: (t: number) => P2; ctrl4: P2; zE: number } {
  const [hw, ys] = P3, yE = yC - drop;
  // the side edge RHO inboard, or further out where the side above the widest point is too short for the edge's curve to
  // stay convex (alto ≥ |s|·(hw − zE), with a 20 % margin). The lines along the deck do not depend on zE (y = yC − drop·u²).
  const alto0 = yE - ys, zE = alto0 > 0 && drop > 0 ? Math.max(hw * (1 - RHO_LISA), hw * 2 * drop / (0.8 * alto0 + 2 * drop)) : hw * (1 - RHO_LISA);
  // the deck's slope at its edge, going outwards (dy/dz ≤ 0)
  const s = zE > 1e-9 ? -2 * drop / zE : 0;
  // the Bézier P3 → C1 → C2 → E: C1 straight above P3, C2 back from E along the deck's tangent. Its control polygon
  // turns one way only when C2 is not outboard of P3 (lam ≤ hw − zE) and ys ≤ C1.y ≤ C2.y − |s|·(hw − C2.z) = yE − |s|·(hw − zE)
  // (= y1max). y1max ≥ ys needs yE − ys ≥ |s|·RHO·hw ≈ 0.33·drop: the caller keeps drop ≤ 0.7·(yC − ys), which gives it.
  const alto = yE - ys, lam = 0.5 * (hw - zE);
  const C2: P2 = [zE + lam, yE + lam * s];
  const y1max = yE + s * (hw - zE);
  const C1: P2 = [hw, alto > 0 ? ys + 0.8 * Math.max(0, y1max - ys) : ys];
  const E: P2 = [zE, yE];
  const arriba = (t: number): P2 => {
    if (t >= T_CUBIERTA) { const u = (1 - t) / (1 - T_CUBIERTA); return [zE * u, yC - drop * u * u]; }
    const b = (t - T3) / (T_CUBIERTA - T3), a = 1 - b;
    const k0 = a * a * a, k1 = 3 * a * a * b, k2 = 3 * a * b * b, k3 = b * b * b;
    return [k0 * hw + k1 * C1[0] + k2 * C2[0] + k3 * E[0], k0 * ys + k1 * C1[1] + k2 * C2[1] + k3 * E[1]];
  };
  // the plain curve's next point after P3, mirrored about P3's height: it reaches P3 going straight up
  return { arriba, ctrl4: [P2[0], 2 * ys - P2[1]], zE };
}
/**
 * 2026-11-13: the monotone rational quadratic (Delbourgo and Gregory, 1985) from 0 to 1 with end slopes a, b ≥ 0:
 * φ(u) = (u² + a·u(1−u)) / (1 + (a + b − 2)·u(1−u)), φ'(u) = (b·u² + 2u(1−u) + a(1−u)²) / den² > 0. It never overshoots and
 * never ripples, for any end slopes, which a cubic does not promise.
 */
const racional = (u: number, a: number, b: number) => { const w = u * (1 - u); return (u * u + a * w) / (1 + (a + b - 2) * w); };
/**
 * A guide line from (x0, y0), leaving with slope m0 (dy/dx), to (x1, y1), arriving with `beta` times its mean slope: one
 * `racional`. Flat beyond x1. Its start slope is taken only while it heads the line's way (else 0).
 */
function guia(x0: number, y0: number, m0: number, x1: number, y1: number, beta: number): (x: number) => number {
  const L = Math.abs(x1 - x0), dy = y1 - y0, a = dy !== 0 ? Math.max(0, m0 * Math.sign(x1 - x0) * L / dy) : 0;
  return (x: number) => y0 + dy * racional(Math.min(1, Math.max(0, (x - x0) / (x1 - x0))), a, beta);
}
/** σ(v) = v / (1 + v⁴)^¼: v for small v, 1 for large, σ' in (0, 1]. */
const satura = (v: number) => (v <= 0 ? 0 : v / Math.pow(1 + v * v * v * v, 0.25));
const suaveL = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
/** The lower edge of the canopy glass in side view (reference drawing); balaMedidas.ts reads it from here. */
export const Y_VIDRIO_REF = monotona([[-0.10, 0.80], [-0.25, 0.815], [-0.45, 0.815], [-0.8, 0.815], [-1.2, 0.83], [-1.5, 0.855], [-1.65, 0.90], [-1.78, 0.99], [-1.9, 1.10], [-2.0, 1.20], [-2.1, 1.30]]);
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

/**
 * An end cap scales the base section towards a centre point (0, cy): z by kz,
 * y above the centre by kUp and below it by kDn. Each is an ogive,
 * k(s) = (1 - s)^m (1 + (m - g) s), with g the slope the body has where the
 * cap begins (so no notch at the joint) and m < 1 the sharpness of the point:
 * it closes in a point with a rounded tip at s = 1 (a rocket's nose cone).
 */
interface Tapa {
  x0: number; largo: number; cy: number; m: number; base: P2[]; g: [number, number, number]; linea?: number; pe?: number;
  /**
   * 2026-11-13, the smooth body: the plan towards a superellipse of exponent `pa` at full width (`ancho`); the top follows
   * the guide line `techo` (which ends at the edge's top); the belly closes onto the edge's bottom, keeping `td` of the
   * joint's height below the centre, leaving the joint with its slope `gDn` (unclamped).
   */
  liso?: { ancho: number; pa: number; td: number; gDn: number; techo: (x: number) => number };
}

/** Half-section polyline resolution of the lookup cache. */
const NT = 120;
const PASO_CACHE = 0.008, PASO_FINO = 0.001, LARGO_FINO = 0.06;

/** Everything about one shape: its dimensions, the stretch maps and every lookup the model needs. */
export type FormaBala = ReturnType<typeof crearForma>;

/** The shape for a set of dimensions. Pure (no three.js): the tunnel's Web Worker builds it too. */
export function crearForma(D: DimBala) {
  // ---------------------------------------------------------------- layout
  const BATALLA = D.batalla, X_MORRO = D.morro, X_COLA = -D.batalla - D.cola;
  const LARGO = X_MORRO - X_COLA;
  /** Lateral wheels at mid-wheelbase, as on the Gota (xLm 1.22 of 2.60 there; 1.225 of 2.45 here); the Triciclo's at its front axle. */
  const X_LAT = D.xLat ?? -BATALLA / 2;
  const anclas = [X_MORRO, 0, -D.cupIni, -D.cupFin, -BATALLA, X_COLA];
  /** New x → x of the reference drawing, and back. */
  // (2026-11-13, the smooth body: the piecewise-linear stretch puts a crease in every keyframe curve at each anchor, where
  // the stretch factor jumps: 7° on the clásico's roof line at the rear axle. With `lisa` the map is a monotone cubic
  // through the same anchors (no overshoot, C1), linear beyond them as before; its inverse by bisection.)
  const R0 = tramos(anclas, ANCLAS_REF), X0 = tramos(ANCLAS_REF, anclas);
  const R = D.lisa ? tramosSuaves(anclas, ANCLAS_REF, R0) : R0, X = D.lisa ? inversa(R, X0) : X0;
  const XN0 = X(XN0_REF), XT0 = X(XT0_REF);
  /** Width factor, belly lift, and the canopy scale above BASE_ALTO (k − 1, so the reference is an exact 0). */
  // `elevar` (the Triciclo's rigid lift) is added last, so with 0 every height is the same number bit for bit (v + 0)
  const elevar = D.elevar ?? 0;
  const kW = D.ancho / DIM_REF.ancho, dSuelo = (D.suelo - elevar) - DIM_REF.suelo, kAlto1 = (D.alto - BASE_ALTO) / (DIM_REF.alto - BASE_ALTO) - 1;
  /** A height of the reference drawing in this shape: the belly and the widest point lift, the canopy scales (and the whole body rises `elevar`). */
  const alturaArriba = (y: number) => y + (y - BASE_ALTO) * kAlto1 + elevar;
  const yb = (x: number) => K.yb(R(x)) + dSuelo + elevar;
  // round 3 (2026-11-12): the roof's fall from its crest (x_ref −1.40) to the tail cap (XT0_REF), re-timed by `caida`
  const caida = D.caida ?? 0, XCIMA = -1.40;
  const ytRef = caida ? (xr: number) => {
    if (xr >= XCIMA || xr <= XT0_REF) return K.yt(xr);
    const u = (XCIMA - xr) / (XCIMA - XT0_REF), w = u - caida * u * (1 - u);
    return K.yt(XCIMA - (XCIMA - XT0_REF) * w);
  } : K.yt;
  // (2026-11-13, the smooth body: the canopy's scale switched on at BASE_ALTO puts a crease in the top line where it
  // crosses that height, on the hood: 5° on the clásico. With `lisa` it eases in over ±4 cm, C1 and still increasing)
  const DELTA_ALTO = 0.04, rampa = (u: number) => (u <= -DELTA_ALTO ? 0 : u >= DELTA_ALTO ? u : (u + DELTA_ALTO) * (u + DELTA_ALTO) / (4 * DELTA_ALTO));
  const yt = D.lisa ? (x: number) => { const v = ytRef(R(x)); return v + rampa(v - BASE_ALTO) * kAlto1 + elevar; }
    : (x: number) => { const v = ytRef(R(x)); return v > BASE_ALTO ? alturaArriba(v) : v + elevar; };
  const ysW = (x: number) => K.ys(R(x)) + dSuelo * 0.6 + elevar;

  const plano = D.techoPlano ?? 0, ePlano = 1 - 0.65 * plano;
  // ── the smooth body (2026-11-13): only with `lisa`; otherwise nothing below is used
  const lisa = !!D.lisa, c01 = (v: number | undefined) => Math.min(1, Math.max(0, v ?? 0));
  const aCola = lisa ? c01(D.colaAncho) : 0, aMorro = lisa ? c01(D.morroAncho) : 0;
  /** The body's widest half-width (the reference drawing's 0.425 m from x_ref −1.1 to −1.5, scaled). */
  const HW_MAX = 0.425 * kW;
  /**
   * The plan's widening factor at x_ref: behind x_ref −1.5 towards the full width (converging by 5 % at the tail's
   * end: the Aptera's sides run back nearly straight), ahead of −1.1 towards it (12 % narrower at the nose's tip).
   * Both leave the widest stretch with zero slope (the drawing is flat there), so there is no kink where they start.
   */
  const anchoPlan = aCola || aMorro ? (xr: number, hw: number) => {
    if (aCola && xr < -1.5) { const w = Math.min(1, (-1.5 - xr) / 1.6), plan = HW_MAX * (1 - 0.05 * w * w); return (hw + aCola * (plan - hw)) / hw; }
    if (aMorro && xr > -1.1) { const w = Math.min(1, (xr + 1.1) / 1.7), plan = HW_MAX * (1 - 0.12 * w * w); return (hw + aMorro * (plan - hw)) / hw; }
    return 1;
  } : null;
  // (round 3: the nose's tip height `morroAlto`, and the Aptera-like line / flat tail: `linea` with a round (2) or square (4) plan)
  const cyMorro0 = D.morroAlto ? CYN + dSuelo * 0.5 + elevar + D.morroAlto : CYN + dSuelo * 0.5 + elevar;
  // (2026-11-13, the smooth body: each edge's height stays between the belly and the top where its cap begins, 3 cm clear
  // of each with the edge's thickness, so the hood and the deck only ever fall towards the ends and the belly only rises)
  const gMorro = lisa ? Math.max(0, D.morroGrosor ?? 0) : 0, gCola = lisa ? Math.max(0, D.colaGrosor ?? 0) : 0;
  const entre = (cy: number, x0: number, g: number, techo = yt(x0)) => Math.min(techo - g / 2 - 0.03, Math.max(yb(x0) + g / 2 + 0.03, cy));
  // (the tail's edge, also never above the body's widest line where its cap begins: then the belly's sweep, which ends
  // under the edge, always stays under the widest point and the section's lower half keeps its shape)
  const cyMorro = lisa ? entre(cyMorro0, XN0, gMorro) : cyMorro0, cyCola = lisa ? entre(D.puntaCola + elevar, XT0, gCola, Math.min(yt(XT0), ysW(XT0) + gCola / 2 + 0.02)) : D.puntaCola + elevar;
  /**
   * The deck zones (smooth body): behind the canopy glass's end and ahead of the windscreen's start, each 1 cm onto the
   * glass, with the blend `LARGO_MEZCLA` long on the canopy's side. Found as `contornoCupula` (balaMedidas.ts) finds
   * them, where the glass line meets the plain top line; the deck's top line leaves from there with the same height and
   * slope, so the glass's ends move by under a millimetre.
   */
  const zonas = lisa ? (() => {
    const dl = D.lineaCupula ?? 0, vidrio = (x: number) => alturaArriba(Y_VIDRIO_REF(R(x))) + dl;
    const cruce = (xa: number, xb: number) => { let a = xa, b = xb; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (yt(m) - vidrio(m) > 0) a = m; else b = m; } return (a + b) / 2; };
    const xc0 = dl ? cruce(X(-1.30), X(0.30)) : cruce(X(-0.30), X(-0.08)), xc1 = dl ? cruce(X(-1.30), X(-2.86)) : cruce(X(-1.75), X(-2.3));
    return { delante: xc0 - 0.01, detras: xc1 + 0.01 };
  })() : null;
  /**
   * The smooth body's guide lines: the top's centre line over the rear deck and over the hood, and (below) the belly's
   * sweep. Each one is ONE monotone rational curve (`guia`) from where it leaves the plain shape, with that shape's height
   * and slope, to the edge at the end: it cannot rise again, overshoot or ripple whatever the sliders say (the hand-drawn
   * keyframes and the end caps it replaces had a crease at every anchor). The rear deck arrives at its trailing edge with
   * 60 % of its mean slope, the hood at its leading edge with a quarter: nearly flat, the Aptera's raised nose.
   */
  const pendiente = (f: (x: number) => number, x: number) => (f(x + 0.002) - f(x - 0.002)) / 0.004;
  const xGuiaCola = zonas ? Math.max(zonas.detras, XT0 + 0.02) : 0, xGuiaMorro = zonas ? Math.min(zonas.delante, XN0 - 0.02) : 0;
  const techoCola = zonas ? guia(xGuiaCola, yt(xGuiaCola), pendiente(yt, xGuiaCola), X_COLA, cyCola + gCola / 2, 0.6) : null;
  const techoMorro = zonas ? guia(xGuiaMorro, yt(xGuiaMorro), pendiente(yt, xGuiaMorro), X_MORRO, cyMorro + gMorro / 2, 0.25) : null;
  // (and the belly stays flat from where the drawing starts to raise it, x_ref −2.1, back to where the sweep starts: its
  // own rise there, compressed by a long canopy into a few centimetres, would be a crease just ahead of the sweep)
  const xPlano = lisa ? X(-2.1) : -Infinity;
  const ytL = techoCola && techoMorro ? (x: number) => (x <= xGuiaCola ? techoCola(x) : x >= xGuiaMorro ? techoMorro(x) : yt(x)) : yt;
  /** The nine control points of the half-section, before the end caps. */
  function controlesBase(x: number): P2[] {
    const xr = R(x);
    const b = x < xPlano ? yb(xPlano) : yb(x), t = ytL(x), ys = ysW(x);
    let hw = K.hw(xr) * kW, zk = K.zk(xr) * kW;
    // 2026-11-13 (smooth body only): the plan widened towards the body's widest, behind and ahead of it
    if (anchoPlan) { const k = anchoPlan(xr, hw); hw *= k; zk *= k; }
    const z2 = zk + (hw - zk) * K.f2(xr), y2 = b + (ys - b) * F2Y;
    const ysh = ys + (t - ys) * K.fsh(xr), zs = hw * K.ksh(xr);
    const out: P2[] = [[0, b], [zk, b], [z2, y2], [hw, ys], [zs, ysh]];
    // (round 3: a flatter crown bends the same three points out towards a square through the shoulder and the top)
    if (plano) for (const a of ANG_CUPULA) out.push([zs * Math.pow(Math.cos(a), ePlano), ysh + (t - ysh) * Math.pow(Math.sin(a), ePlano)]);
    else for (const a of ANG_CUPULA) out.push([zs * Math.cos(a), ysh + (t - ysh) * Math.sin(a)]);
    out.push([0, t]);
    return out;
  }
  /** Height of the shoulder (P4) at x, between the caps: the canopy's sill line runs just above it. */
  const alturaHombro = (x: number) => { const ys = ysW(x); return ys + (yt(x) - ys) * K.fsh(R(x)); };

  function tapa(x0: number, xPunta: number, cy: number, m: number, linea = 0, pe = 2, liso?: { ancho: number; pa: number; grosor: number; techo: (x: number) => number }): Tapa {
    const dir = Math.sign(xPunta - x0), largo = Math.abs(xPunta - x0), e = 0.01;
    const b = controlesBase(x0), a = controlesBase(x0 - dir * e);
    const rel = (v0: number, vIn: number, ref: number) => Math.min(0.95, Math.max(0, ((vIn - v0) / e) * largo / Math.max(1e-3, ref)));
    const hw0 = b[3][0], yt0 = b[8][1], yb0 = b[0][1];
    const T: Tapa = { x0, largo, cy, m, base: b, g: [rel(hw0, a[3][0], hw0), rel(yt0, a[8][1], yt0 - cy), rel(cy - yb0, cy - a[0][1], cy - yb0)], ...(linea ? { linea, pe } : {}) };
    // (the smooth body: the top's and the belly's slopes at the joint unclamped up to 4, so a raised tip, whose cone must
    // fall faster than a straight line at first, still leaves the joint with the body's slope: no crease there)
    const relL = (v0: number, vIn: number, ref: number) => Math.min(4, Math.max(0, ((vIn - v0) / e) * largo / Math.max(1e-3, ref)));
    if (liso) T.liso = { ancho: liso.ancho, pa: liso.pa, td: Math.min(0.9, liso.grosor / 2 / Math.max(0.01, cy - yb0)), gDn: relL(cy - yb0, cy - a[0][1], cy - yb0), techo: liso.techo };
    return T;
  }
  const TAPA_MORRO = lisa ? tapa(XN0, X_MORRO, cyMorro, D.puntaMorro, D.morroLinea ?? 0, 2, { ancho: aMorro, pa: 2 + 2.5 * aMorro, grosor: gMorro, techo: techoMorro! }) : tapa(XN0, X_MORRO, cyMorro, D.puntaMorro, D.morroLinea ?? 0, 2);
  const TAPA_COLA = lisa ? tapa(XT0, X_COLA, cyCola, PT, D.colaPlana ?? 0, 4, { ancho: aCola, pa: 4 + 6 * aCola, grosor: gCola, techo: techoCola! }) : tapa(XT0, X_COLA, D.puntaCola + elevar, PT, D.colaPlana ?? 0, 4);
  function enTapa(T: Tapa, x: number): P2[] {
    const s = Math.min(1, Math.abs(x - T.x0) / T.largo);
    const k = (g: number) => { const m = Math.max(T.m, g); return Math.pow(1 - s, m) * (1 + (m - g) * s); };
    let kz = k(T.g[0]), kUp = k(T.g[1]), kDn = k(T.g[2]);
    if (T.linea) {
      // Round 3 (2026-11-12): towards a wide, thin edge. In plan a superellipse of exponent `pe` (2: round, the Aptera's
      // nose; 4: nearly square, its truncated tail) that leaves the joint with the body's own slope (g) and keeps half of
      // its width or more until close to the tip; in side view the cone thins into a wedge. Blended by `linea`.
      const g = T.g[0], ancho = Math.pow(Math.max(0, 1 - Math.pow(s, T.pe!)), 1 / T.pe!) * (1 - g * s + g * s * s / 2), cuna = 1 - 0.5 * T.linea * s;
      kz += (ancho - kz) * T.linea; kUp *= cuna; kDn *= cuna;
    }
    if (T.liso) {
      // 2026-11-13, the smooth body. In plan, towards a superellipse of exponent `pa` that keeps the joint's width and
      // slope (a straight trailing edge with rounded corners at 10; a broad rounded-square nose at 4.5), blended by `ancho`.
      // In side view the top follows the guide line; the belly closes onto the edge's bottom instead of a point:
      // k → td + (1 − td)·k, which still only falls (k does), with the joint's slope given back by asking k for g / (1 − td).
      // (the wedge here closes as s², not s: it leaves the joint with no slope of its own, so the top and the belly keep
      // the body's; the round-3 wedge put a 4° crease at the clásico's nose joint)
      const L = T.liso, cuna = T.linea ? 1 - 0.5 * T.linea * s * s : 1;
      if (L.ancho) { const g = T.g[0], sq = Math.pow(Math.max(0, 1 - Math.pow(s, L.pa)), 1 / L.pa) * (1 - g * s + g * s * s / 2); kz += (sq - kz) * L.ancho; }
      // the top: the guide line's height over the centre (the guide reached the joint as the body's top, so k(0) = 1)
      kUp = (L.techo(x) - T.cy) / (T.base[8][1] - T.cy);
      kDn = L.td + (1 - L.td) * k(L.gDn / (1 - L.td)) * cuna;
    }
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
  function controlesTapas(x: number): P2[] {
    if (x > XN0) return enTapa(TAPA_MORRO, x);
    if (x < XT0) return enTapa(TAPA_COLA, x);
    return controlesBase(x);
  }
  /**
   * 2026-11-13, the smooth body: the belly's sweep up to the trailing edge («el aptera hace una línea curva desde abajo
   * de la carrocería que sube hasta encontrarse con la punta… configúralo»). From `xU` (`bajosIni` ahead of the rear axle)
   * back, the belly's centre is a guide line (`guia`) that leaves the plain belly with its height and slope and reaches
   * the trailing edge's underside; `bajosCurva` sets how it arrives there: 0 steeply, with 4 times its mean slope (it
   * stays low and rises late, as the plain tail does), 1 with its mean slope (a long, even curve: the Aptera's). The
   * section below its widest point is squeezed in height between P3 and the new belly (affine: convex stays convex).
   */
  const subirBajos = zonas ? (() => {
    // (never behind the tail cap's joint: the cap's own belly would put its joint's crease in the line)
    const xU = Math.max(X_COLA + 0.15, XT0 + 0.02, Math.min(-BATALLA + 1.0, -BATALLA + (D.bajosIni ?? 0)));
    const fondo = (x: number) => controlesTapas(x)[0][1];
    const bajo = guia(xU, fondo(xU), pendiente(fondo, xU), X_COLA, cyCola - gCola / 2, 4 - 3 * c01(D.bajosCurva));
    return (x: number, c: P2[]): P2[] => {
      if (x >= xU) return c;
      const yB0 = c[0][1], yB = bajo(x), ys = c[3][1], den = ys - yB0; if (den <= 1e-6) return c;
      const r = Math.max(0.02, (ys - yB) / den);
      return c.map((p, i) => (i < 3 ? [p[0], ys - (ys - p[1]) * r] as P2 : p));
    };
  })() : null;
  function controles(x: number): P2[] {
    const c = controlesTapas(x);
    return subirBajos ? subirBajos(x, c) : c;
  }
  const bombCola = lisa ? Math.max(0, D.colaBombeo ?? 0) : 0, bombMorro = lisa ? Math.max(0, D.morroBombeo ?? 0) : 0;
  /** The deck's weight at x: 1 on the deck, easing to 0 over the blend, 0 on the canopy. */
  const pesoLisa = (x: number) => !zonas ? 0 : x <= zonas.detras ? 1 : x >= zonas.delante ? 1
    : x < zonas.detras + LARGO_MEZCLA ? suaveL((zonas.detras + LARGO_MEZCLA - x) / LARGO_MEZCLA)
      : x > zonas.delante - LARGO_MEZCLA ? suaveL((x - zonas.delante + LARGO_MEZCLA) / LARGO_MEZCLA) : 0;
  /** The deck at x, from its control points (see `cubiertaLisa`). */
  function deckEn(x: number, c: P2[]) {
    const atras = x < (zonas!.detras + zonas!.delante) / 2, cFin = atras ? cyCola : cyMorro, D0 = 4 * (atras ? bombCola : bombMorro);
    const yC = c[8][1];
    // The widest point never higher than LAMBDA_LISA of the way from the end's centre up to the deck's centre (a smooth
    // minimum): where the deck comes down early (a short canopy, a low end) the sides come down with it, and the deck
    // stays the top of its section. The part below is squeezed in height to follow (affine: convex stays convex).
    let q = c;
    const h = c[3][1] - cFin, lim = LAMBDA_LISA * (yC - cFin);
    if (h > 0 && lim > 0) {
      const hs = Math.pow(Math.pow(h, -6) + Math.pow(lim, -6), -1 / 6), y3 = cFin + hs, yB = c[0][1], den = c[3][1] - yB;
      if (den > 1e-6 && y3 > yB) { const r = (y3 - yB) / den; q = c.map((p, i) => (i <= 3 ? [p[0], yB + (p[1] - yB) * r] as P2 : p)); }
    }
    const P3 = q[3];
    // (never more than 95 % of the height over the widest point: with the widest point kept low this never binds, but a
    // closing tip, millimetres wide, may need it)
    const drop = D0 > 0 ? Math.max(0, Math.min(D0 * satura(KAPPA_LISA * (yC - cFin) / D0), 0.95 * (yC - P3[1]))) : 0;
    return { ...cubiertaLisa(q[2], P3, yC, drop), yC, drop, q };
  }
  function sec(x: number): Sec {
    const c = controles(x);
    const s: Sec = { x, c, ext: [[-c[1][0], c[1][1]], ...c, [-c[7][0], c[7][1]]] };
    const w = pesoLisa(x);
    if (w > 0) {
      const d = deckEn(x, c), c2 = d.q.slice(); c2[4] = d.ctrl4;
      s.lisa = { w, arriba: d.arriba, ext: [[-c2[1][0], c2[1][1]], ...c2, [-c2[7][0], c2[7][1]]] };
    }
    return s;
  }
  /** The deck's numbers at x (scripts/bala-cola-lisa.ts samples the built skin along them); null off the deck or without `lisa`. */
  function cubierta(x: number): Cubierta | null {
    const w = pesoLisa(x); if (!(w > 0)) return null;
    const d = deckEn(x, controles(x));
    return { zE: d.zE, yC: d.yC, drop: d.drop, w };
  }

  // ------------------------------------------------------- fast lookups (cache)
  // Projections query thousands of points: the half-section is cached as a
  // polyline every 8 mm in x and blended between neighbours; within 6 cm of the
  // tips, where the section shrinks to a point, every 1 mm.
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
  const N_FINO = Math.round(LARGO / PASO_FINO);
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
  function seccionRapida(x: number): Float64Array {
    const [a, b, w] = vecinos(x), out = new Float64Array(a.length);
    for (let k = 0; k < a.length; k++) out[k] = a[k] + (b[k] - a[k]) * w;
    return out;
  }
  /** Outer skin z (right side) at height y, or NaN. */
  function ladoZ(x: number, y: number): number {
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
  function arribaY(x: number, z: number): number {
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
      const zb = a[2 * k] + (b[2 * k] - a[2 * k]) * w, yb2 = a[2 * k + 1] + (b[2 * k + 1] - a[2 * k + 1]) * w;
      if ((ya > y) !== (yb2 > y) && az < (zb - za) * (y - ya) / (yb2 - ya) + za) c = !c;
      za = zb; ya = yb2;
    }
    return c;
  }
  /** Is the point (x, y, z) inside the skin? */
  function dentroPiel(x: number, y: number, z: number): boolean {
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
  const frenteX = (z: number, y: number) => bordeX(z, y, X(0.0), X_MORRO);
  /** x of the skin seen from behind at (z, y), or NaN. */
  const detrasX = (z: number, y: number) => bordeX(z, y, X(-2.3), X_COLA);

  // --------------------------------------------------------- envelope and area
  /**
   * [x, floor, top, max half-width] every `paso` m, from the same sections as
   * the mesh. The body only: the lateral wheel pods, their arms and the tail
   * fin stand outside it and are not part of the wind tunnel's silhouette.
   */
  function envolvente(paso = 0.05): [number, number, number, number][] {
    const out: [number, number, number, number][] = [];
    for (let x = X_MORRO; x >= X_COLA - 1e-9; x -= paso) {
      const s = sec(Math.max(X_COLA + 1e-4, Math.min(X_MORRO - 1e-4, x)));
      let b = Infinity, t = -Infinity, hw = 0;
      for (let k = 0; k <= 80; k++) { const [z, y] = punto(s, k / 80); b = Math.min(b, y); t = Math.max(t, y); hw = Math.max(hw, z); }
      const r = (v: number) => Math.round(v * 1000) / 1000;
      out.push([r(x), r(b), r(t), r(hw)]);
    }
    return out;
  }
  /** Area (m²) of the full section at x (both halves), its half-width and its height. */
  function areaSeccion(x: number, n = 200): { area: number; hw: number; alto: number } {
    const s = sec(x); let A = 0, hw = 0, y0 = Infinity, y1 = -Infinity;
    let [zp, yp] = punto(s, 0);
    for (let k = 1; k <= n; k++) { const [z, y] = punto(s, k / n); A += (zp + z) / 2 * (y - yp); zp = z; yp = y; hw = Math.max(hw, z); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { area: 2 * A, hw, alto: y1 - y0 };
  }
  /** Largest cross-section area of the body (m²) and the half-width and height of that section. */
  function seccionMayor(): { area: number; x: number; hw: number; alto: number } {
    let best = { area: 0, x: 0, hw: 0, alto: 0 };
    for (let x = X(0); x > X(-2.4); x -= 0.05) {
      const a = areaSeccion(x);
      if (a.area > best.area) best = { ...a, x };
    }
    return best;
  }

  /**
   * The tail's light ring (where the navy tail cone, the lamps, the hatch's and the tail panel's ends are), x_ref −2.86.
   * Round 3: a flat tail (`colaPlana`) carries it back towards the trailing edge, to 8 cm from it when fully flat, as
   * the Aptera's light bar is on its trailing edge; the panel and the hatch reach it.
   */
  /** And the nose's light ring (x_ref 0.30): a nose that ends in a line carries it forward, to 12 cm from the tip (the Aptera's light bar runs along its leading line). */
  const X_ARO_MORRO0 = D.morroLinea ? X(0.30) + (X_MORRO - 0.12 - X(0.30)) * Math.min(1, D.morroLinea) : X(0.30);
  const X_ARO_COLA0 = D.colaPlana ? X(-2.86) + (X_COLA + 0.08 - X(-2.86)) * Math.min(1, D.colaPlana) : X(-2.86);
  // (2026-11-13, the smooth body: a wide tail carries the light bar onto its trailing edge, 3 cm from the end, and the
  // hatch and the tail panel with it; a wide nose carries its band to 5 cm from the leading edge)
  const X_ARO_MORRO = aMorro ? X_ARO_MORRO0 + (X_MORRO - 0.05 - X_ARO_MORRO0) * aMorro : X_ARO_MORRO0;
  const X_ARO_COLA = aCola ? X_ARO_COLA0 + (X_COLA + 0.03 - X_ARO_COLA0) * aCola : X_ARO_COLA0;
  return {
    D, BATALLA, X_MORRO, X_COLA, LARGO, X_LAT, XN0, XT0, X_ARO_MORRO, X_ARO_COLA,
    R_DEL: D.rDel, R_LAT: D.rLat, VIA_LAT: D.via, ANCHO_NEU: D.anchoNeu, ANCHO_NEU_LAT: D.anchoNeuLat,
    /** x of the reference drawing → x in this shape, and back. */
    X, R,
    /**
     * Heights of the reference drawing in this shape: above the widest point (canopy, scaled) and the belly lift.
     * `dSuelo` is the shape's own belly lift; `elevar` the Triciclo's rigid lift on top of it (0 elsewhere):
     * what stands on the floor rises `dSuelo + elevar`.
     */
    alturaArriba, dSuelo, elevar, kW,
    controles, sec, alturaHombro, seccionRapida,
    /** The smooth body's deck at x (2026-11-13), and where its two zones begin; null without `lisa`. */
    cubierta, zonasLisa: zonas,
    /** The heights the nose's and the tail's edges close to (m), as asked and as built (the smooth body keeps them in range). */
    puntas: { morro: cyMorro, morroPedida: cyMorro0, cola: cyCola, colaPedida: D.puntaCola + elevar }, ladoZ, arribaY, dentroPiel, frenteX, detrasX, envolvente, seccionMayor, areaSeccion,
    /** x where the skin is crossed going from xIn (inside) towards xOut, at (z, y); NaN if xIn is outside. */
    bordeX,
  };
}

/** The garage model's shape. */
export const FORMA_REF = crearForma(DIM_REF);
