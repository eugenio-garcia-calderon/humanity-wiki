import { T3, punto, tAbajo, tArriba, type FormaBala } from './balaForma';
import { alturasPod, bandaMarco, brazosDe, podDe, semiAncho, techoEn, type Ventanas } from './balaMedidas';

/*
 * Aptera-style side doors and boot hatch for the Triciclo family (2026-11-12, Eugenio, on the «Cuadriciclo Bala
 * clásico»: «unas puertas idénticas a las que tiene… la Aptera, pero adaptándolas a la forma actual… y que el
 * maletero sea lo más posible parecido al maletero de la Aptera, que se abre desde muy adelante, como casi la mitad
 * del vehículo»). Pure (no three.js): the model's checks and the 3D builder (balaModelo.ts) read the same outline.
 *
 * What the Aptera does (press photos and renders; no drawings are published, see the report and memory/03):
 *  - Two doors, one a side, cut from the windscreen pillar back to just behind the seats. Each carries its side
 *    window with its dark frame; the windscreen and the roof stay. The front edge runs down from the pillar's foot
 *    and back (the front wheel's pod is ahead of it); the bottom is a low sill; the rear edge is nearly vertical.
 *  - They open on hinges on the windscreen pillar: the axis rises backwards along the pillar and leans inwards at
 *    the top, so the door swings out, forward and up at once (a «butterfly» door), and needs little room beside.
 *  - The hatch is the whole top of the tail from about the roof's highest point back: hinged across the roof there,
 *    it lifts the rear window, the roof's rear panel and the tail's top in one piece.
 *
 * Here everything is drawn on this body's own surface in (x, t), like the windows (balaMedidas.ts `ventanasDe`):
 *  - The door's top edge is the OUTER edge of the window frame band (pillar + rail): the band belongs to the door.
 *  - Its bottom is the sill (`umbral`, height above the road), its front edge a straight line in side view from the
 *    pillar's foot down and back to the bottom-front corner (`del`), its rear edge the row x = `tras`, with rounded
 *    bottom and top rear corners. In side view the door is «vertically simple»: at each x it covers heights
 *    yLo(x)..yHi(x); on the skin, t from tLo(x) to tHi(x). The 3D builder cuts the skin's cells exactly along these
 *    two curves (linear between rows, with rows added at the door's ends and corners).
 *  - The hatch covers, from its hinge `x` back to the tail ring, everything above its side edge: the door's top
 *    while beside a door, then from the frame band's inner edge down in 35 cm to the tail's shoulder (`T_HOMBRO`)
 *    and along it to the tail ring: the rear window, the roof's rear panel and the whole upper tail.
 */

export interface OpcionesPuertas {
  /** x of the door's bottom-front corner and of its rear edge (shape coordinates, negative: behind x = 0). */
  del: number; tras: number;
  /** Sill height above the road (m, absolute). */
  umbral: number;
  /** The door window's lower edge raised this much above the canopy glass edge (m): below it the door is painted. */
  cintura: number;
  /** The hinge point: where along the pillar's edge (0 its foot, 1 where it meets the roof rail). */
  bisagraY: number;
  /** Hinge axis: turned from the pillar's tangent there (°, + steeper) and leaned in at the top (°); opening (°). */
  inc: number; dentro: number; abre: number;
  /**
   * Round 3 (2026-11-12): a second door per side for the passengers, or absent/null (one door, as before). The opening is
   * split at x = `parte` (shape coordinates): ahead of it the pilot's door as before, behind it the passengers' door,
   * hinged on the opening's rear edge (`bisagraY`: 0 its bottom, 1 its top) and swinging up and back.
   */
  segunda?: OpcionesSegunda | null;
}
/** The passengers' door: where the opening is split, its hinge along the rear edge, the axis tilted forward (°) and its opening (°). */
export interface OpcionesSegunda { parte: number; bisagraY: number; inc: number; abre: number }
/** One opening leaf: the stretch x1..x0 of the opening (x0 > x1), its hinge point, its unit axis and its opening (°, positive opens); `paso`: the stretch of sill it is the way in over. */
export interface Hoja { x0: number; x1: number; bisagra: V3; eje: V3; abre: number; paso?: [number, number] }
/**
 * Round 3: the fixed pillars of the second door (m along x). The B-pillar stands between the two doors: without it the
 * two meeting edges, swinging about axes at opposite ends, cross each other near the sill (measured on the clásico:
 * 0.3 to 2.7 cm for every hinge tried), so each door shuts against it instead. The C-pillar, behind the passengers'
 * door, carries that door's hinges: the door hangs from it.
 */
export const MONTANTE_B = 0.08, MONTANTE_C = 0.07;
/** The hatch: its hinge's x, its opening (°) and (round 2) how high its side edges sit on the tail: their elevation seen from the section's centre (°). */
export interface OpcionesPorton { x: number; abre: number; lado: number }

type Contorno = { Y_VIDRIO: (x: number) => number; yMarco: (x: number) => number; XC0: number; XC1: number; XF0: number; XF1: number };
export type V3 = [number, number, number];

/** t on the section at x where it reaches height y (below the widest point on the lower side, above it on the upper). */
export function tDeY(F: FormaBala, x: number, y: number): number {
  const s = F.sec(x), ys = punto(s, T3)[1];
  return y <= ys ? tAbajo(s, y) : tArriba(s, y);
}
const suave = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
/** The canopy frame's outer edge in t (balaModelo.ts `bandas` tF): eased to t = 0.62 within 15 cm outside the frame. */
export function tMarco(F: FormaBala, C: Contorno, x: number): number {
  const dF = x > C.XF0 ? x - C.XF0 : x < C.XF1 ? C.XF1 - x : 0;
  return dF > 0 ? 1 - (1 - 0.62) * suave(dF / 0.15) : tArriba(F.sec(x), C.yMarco(x));
}
/** A point of the skin (right side) and its outward normal, from (x, t). */
export function pielXT(F: FormaBala, x: number, t: number): { p: V3; n: V3 } {
  const e = 0.002, s = F.sec(x), [z, y] = punto(s, t);
  const pa = punto(F.sec(x + e), t), pb = punto(F.sec(x - e), t), q1 = punto(s, Math.min(1, t + e)), q0 = punto(s, Math.max(0, t - e));
  const X: V3 = [2 * e, pa[1] - pb[1], pa[0] - pb[0]], T: V3 = [0, q1[1] - q0[1], q1[0] - q0[0]];
  let n: V3 = [X[1] * T[2] - X[2] * T[1], X[2] * T[0] - X[0] * T[2], X[0] * T[1] - X[1] * T[0]];
  const l = Math.hypot(...n) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
  if (n[1] * (y - 0.6) + n[2] * z < 0 && Math.abs(n[0]) < 0.9) n = [-n[0], -n[1], -n[2]];
  return { p: [x, y, z], n };
}

/** Side-view polyline (x decreasing) → y at x, linear, clamped at the ends. */
function enX(pl: [number, number][]): (x: number) => number {
  return (x: number) => {
    if (x >= pl[0][0]) return pl[0][1];
    for (let i = 1; i < pl.length; i++) if (x >= pl[i][0]) { const [x0, y0] = pl[i - 1], [x1, y1] = pl[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1); }
    return pl[pl.length - 1][1];
  };
}
/** The frame band's two edges in side view: outer (towards the windscreen and the roof) and inner, x decreasing. */
function bordesBanda(F: FormaBala, V: Ventanas, C: Contorno): { fuera: [number, number][]; dentro: [number, number][] } | null {
  const b = bandaMarco(V, C.XC1 + 0.004); if (!b) return null;
  const P = b.pts.map(([x, t]) => pielXT(F, x, Math.min(t, 0.995)));
  const fuera: [number, number][] = [], dentro: [number, number][] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)].p, c = P[Math.min(P.length - 1, i + 1)].p, n = P[i].n, p = P[i].p;
    const T: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let B: V3 = [n[1] * T[2] - n[2] * T[1], n[2] * T[0] - n[0] * T[2], n[0] * T[1] - n[1] * T[0]];
    const l = Math.hypot(...B) || 1, w = b.ancho[i] / 2; B = [B[0] / l * w, B[1] / l * w, B[2] / l * w];
    const e1: [number, number] = [p[0] + B[0], p[1] + B[1]], e2: [number, number] = [p[0] - B[0], p[1] - B[1]];
    const [o, d] = e1[0] + e1[1] >= e2[0] + e2[1] ? [e1, e2] : [e2, e1];
    // keep each edge monotone in x (the pillar leaves its foot straight up)
    if (!fuera.length || o[0] < fuera[fuera.length - 1][0] - 1e-5) fuera.push(o);
    if (!dentro.length || d[0] < dentro[dentro.length - 1][0] - 1e-5) dentro.push(d);
  }
  return { fuera, dentro };
}

export type Puerta = NonNullable<ReturnType<typeof puertaDe>>;
/** The right door (the left is its mirror). Null without a window frame (the doors need the pillar). */
export function puertaDe(F: FormaBala, V: Ventanas, C: Contorno, o: OpcionesPuertas) {
  const bb = bordesBanda(F, V, C); if (!bb) return null;
  const arriba = enX(bb.fuera);
  const [xTip, yTip] = bb.fuera[0];
  // (round 2: the rear edge at least 20 cm ahead of the canopy's end, where the tail crown starts)
  const xR = Math.min(xTip - 0.3, Math.max(o.tras, C.XC1 + 0.20)), xD = Math.min(xTip - 0.04, Math.max(xR + 0.25, o.del));
  const RA = 0.07, RB = 0.06, K = 0.05;
  const linea = (x: number) => o.umbral + (yTip - o.umbral) * (x - xD) / (xTip - xD);
  const smax = (a: number, b: number) => (a + b + Math.sqrt((a - b) ** 2 + K * K)) / 2;
  const redondeo = (x: number, r: number) => { const d = r - (x - xR); return d > 0 ? r - Math.sqrt(Math.max(0, r * r - d * d)) : 0; };
  const yLo = (x: number) => (x > xD - 0.12 ? smax(o.umbral, linea(x)) : o.umbral) + redondeo(x, RB);
  const yHi = (x: number) => arriba(x) - redondeo(x, RA);
  const tLo = (x: number) => tDeY(F, x, Math.min(yLo(x), yHi(x)));
  const tHi = (x: number) => tDeY(F, x, yHi(x));
  // the door window's lower edge: the canopy glass edge raised `cintura`
  const yCintura = (x: number) => C.Y_VIDRIO(x) + o.cintura;
  // The hinge. The pillar's edge is a curve that rises from its foot and bends back into the roof rail; a straight
  // axis through two of its points would leave the stretch between them above the axis, and that part of the door
  // would swing into the pillar. The axis is the edge's TANGENT at the hinge point instead: the curve bends away
  // below it on both sides (it is concave), so the whole door is under the axis and swings out. `bisagraY` is where
  // along the pillar (0 its foot, 1 where it meets the rail: there the tangent is level and the door is a gull wing;
  // at the foot it is nearly upright, a plain front-hinged door); `inc` turns the axis from that tangent (+: steeper),
  // `dentro` leans it in at the top. The Aptera's sits about halfway: its doors rise and swing out together.
  const xTop = V.pilar ? Math.max(bb.fuera[bb.fuera.length - 1][0], V.pilar.xT) : xTip - 0.4;
  const f = Math.min(0.95, Math.max(0.05, o.bisagraY)), hx = xTip + (xTop - xTip) * f, hy = arriba(hx);
  const pend = (arriba(hx - 0.01) - arriba(hx + 0.01)) / 0.02, a = Math.atan(pend) + o.inc * Math.PI / 180, d = o.dentro * Math.PI / 180;
  const hz = F.ladoZ(hx, hy);
  const eje: V3 = [-Math.cos(a) * Math.cos(d), Math.sin(a) * Math.cos(d), -Math.sin(d)];
  /** Rows the skin needs for a clean cut: the two ends, and dense ones at the tip, the front corner and the rear corners. */
  const filas: number[] = [xTip, xR];
  for (let k = 1; k <= 12; k++) filas.push(xTip - 0.006 * k);
  for (let k = -6; k <= 6; k++) filas.push(xD + 0.012 * k);
  for (let k = 1; k <= 10; k++) filas.push(xR + 0.008 * k);
  const bisagra: V3 = [hx, hy, Number.isFinite(hz) ? hz : 0];
  // ── round 3: the passengers' door behind the split, hinged on the rear edge
  let segunda: null | (Hoja & { xS: number }) = null;
  // (only where each door keeps 30 cm along the sill and the B-pillar fits between them; else one door, and the
  // model's check «Segunda puerta: cabe» says so)
  if (o.segunda && xD - xR >= 0.60 + MONTANTE_B) {
    const g = o.segunda, xS = Math.min(xD - 0.30, Math.max(xR + 0.30, g.parte)), xB = xS - MONTANTE_B / 2;
    // The hinge: a point on the opening's rear edge (the section at xR, between the door's bottom and top there) and
    // the axis along the edge's TANGENT there, as the pilot's door takes the pillar's: the rear edge is the section's
    // own curve, convex, so the whole edge lies inside the tangent and swings away from the fixed body behind it.
    // `inc` tilts the axis's top forward: 0 a plain rear-hinged door that swings out and back, more and it rises as it
    // swings back (the pilot's door's mirror image).
    const sR = F.sec(xR), ta = tLo(xR), tb = tHi(xR), f = Math.min(0.95, Math.max(0.05, g.bisagraY)), tg = ta + (tb - ta) * f;
    const [z0, y0] = punto(sR, tg), [z1, y1] = punto(sR, Math.min(1, tg + 0.004)), [z2, y2] = punto(sR, Math.max(0, tg - 0.004));
    let ty = y1 - y2, tz = z1 - z2; const lt = Math.hypot(ty, tz) || 1; ty /= lt; tz /= lt; if (ty < 0) { ty = -ty; tz = -tz; }
    const a2 = g.inc * Math.PI / 180;
    let e2: V3 = [Math.sin(a2), Math.cos(a2) * ty, Math.cos(a2) * tz];
    const h2: V3 = [xR, y0, z0];
    // the axis's sense: a positive angle must take the door's middle outwards
    const xm = (xB + xR) / 2, [zm, ym] = punto(F.sec(xm), (tLo(xm) + tHi(xm)) / 2), prueba = girar([xm, ym, zm], h2, e2, 0.05);
    if (prueba[2] < zm) e2 = [-e2[0], -e2[1], -e2[2]];
    // (the way in under it: its opening less the 12 cm by its hinges, where the open door always stands)
    segunda = { xS, x0: xB, x1: xR, bisagra: h2, eje: e2, abre: g.abre, paso: [xR + 0.12, xB] };
    for (const xc of [xS + MONTANTE_B / 2, xB]) { filas.push(xc); for (let k = 1; k <= 3; k++) filas.push(xc + 0.004 * k, xc - 0.004 * k); }
  }
  return { xTip, yTip, xR, xD, yLo, yHi, tLo, tHi, yCintura, cintura: o.cintura, bisagra, eje, abre: o.abre, filas, banda: bb, segunda };
}
/** Round 3: the opening's leaves, front to back (one, or the pilot's and the passengers'). */
export function hojasPuerta(P: Puerta): Hoja[] {
  const x1 = P.segunda ? P.segunda.xS + MONTANTE_B / 2 : P.xR;
  const delante: Hoja = { x0: P.xTip, x1, bisagra: P.bisagra, eje: P.eje, abre: P.abre, paso: [x1, P.xD] };
  return P.segunda ? [delante, P.segunda] : [delante];
}
/** Is (x, y) inside the door's outline in side view? */
export const enPuerta = (P: Puerta, x: number, y: number) => x <= P.xTip && x >= P.xR && y >= P.yLo(x) - 1e-4 && y <= P.yHi(x) + 1e-4
  // (round 3: the B-pillar between two doors is body)
  && !(P.segunda && Math.abs(x - P.segunda.xS) < MONTANTE_B / 2);

/** The hatch's side edge along the tail: the shoulder of the section (balaForma.ts P4, t = 0.47). */
export const T_HOMBRO = 0.47;
export type Porton = ReturnType<typeof portonDe>;
/** The Aptera-style hatch, from its hinge `o.x` back to the tail ring `xFin`, over a door `P`. */
export function portonDe(F: FormaBala, P: Puerta, C: Contorno, o: OpcionesPorton, xFin: number) {
  // never ahead of the roof's highest point: ahead of it the roof still rises, and the hatch's front edge, lifting
  // about a hinge lower than itself, would swing forward into the fixed roof
  let xCima = P.xTip, yCima = -1;
  for (let x = P.xTip; x > C.XF1; x -= 0.01) { const y = techoEn(F, x); if (y > yCima + 1e-4) { yCima = y; xCima = x; } }
  // (round 3, 2026-11-12: «que el maletero empiece un poco más atrás, como en el Aptera»: the hinge may go back past the
  // canopy's end, to 45 cm ahead of the tail ring; before, never behind 25 cm ahead of the canopy frame's rear tip)
  const xH = Math.min(P.xTip - 0.30, xCima, Math.max(xFin + 0.45, o.x));
  const dentroBanda = enX(P.banda.dentro), finBanda = P.banda.dentro[P.banda.dentro.length - 1][0];
  const tBanda = (x: number) => (x >= finBanda ? tDeY(F, x, dentroBanda(x)) : tMarco(F, C, x));
  // Behind the door the side edge eases in 35 cm to the line `o.lado` degrees up from the section's centre and follows
  // it back to the tail ring: the upper rear opens, as on the Aptera, whose hatch is about half the body wide (its
  // edges about 60° up on the tail section). Never below the tail's shoulder (T_HOMBRO), so the rear arms, the
  // charging flap and the rear vents stay on the body. (A first try followed the round-three lid's line: on this tail
  // that is its crown, and only a strip opened; a second one, the shoulder, opened 93 % of the width.)
  const fi = o.lado * Math.PI / 180;
  const tLado = (x: number) => {
    const s = F.sec(x), yc = (punto(s, 0)[1] + punto(s, 1)[1]) / 2, ang = (t: number) => { const [z, y] = punto(s, t); return Math.atan2(y - yc, z); };
    let a = T_HOMBRO, b = 0.999;
    if (ang(a) >= fi) return a;
    for (let i = 0; i < 30; i++) { const mm = (a + b) / 2; if (ang(mm) < fi) a = mm; else b = mm; }
    return (a + b) / 2;
  };
  const tLo = (x: number) => {
    if (x >= P.xR) return P.tHi(x);
    const w = suave((P.xR - x) / 0.35), tl = tLado(x);
    return w >= 1 ? tl : tBanda(x) * (1 - w) + tl * w;
  };
  const filas = [xH, xFin]; for (let k = 1; k <= 6; k++) filas.push(xH - 0.01 * k, xH + 0.01 * k);
  return { xH, xFin, tLo, bisagra: [xH, techoEn(F, xH)] as [number, number], abre: o.abre, filas };
}

/** Rotation of p about the axis through h along unit u by θ (Rodrigues). */
export function girar(p: V3, h: V3, u: V3, th: number): V3 {
  const v: V3 = [p[0] - h[0], p[1] - h[1], p[2] - h[2]], c = Math.cos(th), s = Math.sin(th);
  const k = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) * (1 - c);
  const x: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return [h[0] + v[0] * c + x[0] * s + u[0] * k, h[1] + v[1] * c + x[1] * s + u[1] * k, h[2] + v[2] * c + x[2] * s + u[2] * k];
}
/**
 * Points on the right door's skin, for the swing checks: a 24 × 10 grid over it, and (round 2, 2026-11-12: a coarse
 * grid missed the top edge cutting 5.8 cm into the tail crown) its whole outline every centimetre, where it meets the
 * fixed body first.
 */
export function puntosPuerta(F: FormaBala, P: Puerta): V3[] {
  const o: V3[] = [], en = (x: number, t: number) => { const [z, y] = punto(F.sec(x), Math.min(1, t)); o.push([x, y, z]); };
  for (let i = 0; i <= 24; i++) { const x = P.xR + (P.xTip - P.xR) * i / 24, a = P.tLo(x), b = P.tHi(x); for (let j = 0; j <= 10; j++) en(x, a + (b - a) * j / 10); }
  const n = Math.ceil((P.xTip - P.xR) / 0.01);
  for (let i = 0; i <= n; i++) { const x = P.xR + (P.xTip - P.xR) * i / n; en(x, P.tHi(x)); en(x, P.tLo(x)); }
  const a = P.tLo(P.xR), b = P.tHi(P.xR); for (let j = 0; j <= 40; j++) en(P.xR, a + (b - a) * j / 40);
  return o;
}
/**
 * The door's swing, checked in 24 steps to its full opening:
 *  - `entra`: how deep it goes into the fixed body (anything outside its own opening; points within 4 cm of the hinge
 *    axis are the hinge itself and are left out);
 *  - `carenado`: how close it comes to the front pod (straight ahead and at full lock either way, `giros`: the inner
 *    and outer wheels' angles) and to its two faired arms;
 *  - `suelo`, `punta`: how low it gets and how far out (from the centre line);
 *  - `entrada` (round 2): the lowest point of the open door over the way in, the floor between the sill's front and
 *    the door's rear edge from 5 cm inside the body's side out to 40 cm beyond it (9: nothing over it), and `alto`, its top.
 * `extra`: points that swing with it (the mirror).
 */
export function vueloPuerta(F: FormaBala, P: Puerta, extra: V3[] = [], giros: number[] = [], hoja?: Hoja, traseras?: FormaBala | null): { entra: number; carenado: number; suelo: number; punta: number; entrada: number; alto: number } {
  // (round 3: one leaf of a split opening, densely sampled, with its own hinge; and the rear pods too, which do not steer)
  const pts = [...(hoja ? puntosHoja(F, P, hoja, 0.03) : puntosPuerta(F, P)), ...extra], h = hoja ? hoja.bisagra : P.bisagra, u = hoja ? hoja.eje : P.eje, abre = hoja ? hoja.abre : P.abre;
  const vistas = traseras ? [F, traseras] : [F];
  // (round 3, for speed, the same numbers: each arm's root on the body once, and a bound on each pod's reach about its
  // wheel's vertical axis, so a point that cannot come closer than the closest so far skips that pod)
  const pods = vistas.map((V, i) => {
    const POD = podDe(V), br = brazosDe(V).map(b => ({ b, zc: F.ladoZ(V.X_LAT + b.x, b.yCuerpo) }));
    const alcance = Math.hypot(Math.max(...POD.map(e => Math.abs(e.x))), Math.max(...POD.map(e => e.wm))), y0 = Math.min(...POD.map(e => e.yb)), y1 = Math.max(...POD.map(e => e.yt));
    return { V, POD, ancho: semiAncho(POD), zp: V.VIA_LAT / 2, br, x0p: POD[POD.length - 1].x, x1p: POD[0].x, gira: i === 0, alcance, y0, y1 };
  });
  const zCuerpo = F.D.ancho / 2 + 0.005;
  const estados = [0, ...giros.flatMap(g => [g, -g])].map(g => ({ c: Math.cos(g), s: Math.sin(g) }));
  const quieto = [{ c: 1, s: 0 }];
  const dEje = (p: V3) => { const v: V3 = [p[0] - h[0], p[1] - h[1], p[2] - h[2]], k = v[0] * u[0] + v[1] * u[1] + v[2] * u[2]; return Math.hypot(v[0] - k * u[0], v[1] - k * u[1], v[2] - k * u[2]); };
  let entra = 0, carenado = 9, suelo = 9, punta = 0, entrada = 9, alto = 0;
  const N = 24;
  for (let s = 1; s <= N; s++) {
    const th = abre * Math.PI / 180 * s / N;
    for (const p of pts) {
      const q = girar(p, h, u, th);
      suelo = Math.min(suelo, q[1]); punta = Math.max(punta, q[2]);
      if (s === N) {
        alto = Math.max(alto, q[1]);
        if (q[0] <= (hoja?.paso ? hoja.paso[1] : P.xD) && q[0] >= (hoja?.paso ? hoja.paso[0] : P.xR)) { const lado = F.ladoZ(q[0], 0.6); if (Number.isFinite(lado) && q[2] > lado - 0.05 && q[2] < lado + 0.40) entrada = Math.min(entrada, q[1]); }
      }
      if (Math.abs(q[2]) < zCuerpo && dEje(p) > 0.04 && !enPuerta(P, q[0], q[1]) && F.dentroPiel(q[0], q[1], q[2])) {
        const z = F.ladoZ(q[0], q[1]); if (Number.isFinite(z)) entra = Math.max(entra, Math.min(0.2, z - Math.abs(q[2])));
      }
      // the front pod round its wheel, which turns about its vertical axis (as the viewer steers it); the rear pods straight
      for (const { V, POD, ancho, zp, br, x0p, x1p, gira, alcance, y0, y1 } of pods) {
        const dx = q[0] - V.X_LAT, dz = q[2] - zp;
        const lejos = Math.hypot(Math.max(0, Math.hypot(dx, dz) - alcance), q[1] < y0 ? y0 - q[1] : q[1] > y1 ? q[1] - y1 : 0) >= carenado;
        if (!lejos) for (const e of gira ? estados : quieto) {
          const xr = dx * e.c + dz * e.s, zl = -dx * e.s + dz * e.c, xc = Math.min(x1p - 1e-4, Math.max(x0p + 1e-4, xr)), alt = alturasPod(POD, xc);
          if (!alt) continue;
          const w = ancho(xc, Math.min(alt[1] - 1e-3, Math.max(alt[0] + 1e-3, q[1])));
          carenado = Math.min(carenado, Math.hypot(Math.abs(xr - xc), Math.max(0, Math.abs(zl) - w), q[1] < alt[0] ? alt[0] - q[1] : q[1] > alt[1] ? q[1] - alt[1] : 0));
        }
        for (const { b, zc } of br) {
          const ddx = Math.max(0, Math.abs(q[0] - (V.X_LAT + b.x)) - b.cuerda / 2), dy = Math.max(0, Math.abs(q[1] - (b.y + b.yCuerpo) / 2) - b.grueso / 2 - Math.abs(b.yCuerpo - b.y) / 2);
          const ddz = Number.isFinite(zc) ? Math.max(0, Math.max(zc - q[2], q[2] - (zp - 0.02))) : 0;
          carenado = Math.min(carenado, Math.hypot(ddx, dy, ddz));
        }
      }
    }
  }
  return { entra, carenado, suelo, punta, entrada, alto };
}
/** The hatch's swing about its hinge across the roof: how deep it goes into the fixed body, and how high it reaches. */
export function vueloPorton(F: FormaBala, Q: Porton, extra: V3[] = []): { entra: number; alto: number } {
  const pts: V3[] = [...extra];
  for (let i = 0; i <= 24; i++) {
    const x = Q.xFin + (Q.xH - Q.xFin) * i / 24, a = Q.tLo(x);
    for (let j = 0; j <= 8; j++) { const [z, y] = punto(F.sec(x), a + (1 - a) * j / 8); pts.push([x, y, z]); }
  }
  const [hx, hy] = Q.bisagra; let entra = 0, alto = 0;
  const encima = (x: number, y: number) => x <= Q.xH && x >= Q.xFin && y >= punto(F.sec(x), Q.tLo(x))[1] - 1e-3;
  for (let s = 1; s <= 12; s++) {
    const th = -Q.abre * Math.PI / 180 * s / 12, c = Math.cos(th), sn = Math.sin(th);
    for (const p of pts) {
      const dx = p[0] - hx, dy = p[1] - hy; if (Math.hypot(dx, dy) < 0.04) continue;
      const q: V3 = [hx + dx * c - dy * sn, hy + dx * sn + dy * c, p[2]];
      alto = Math.max(alto, q[1]);
      if (!encima(q[0], q[1]) && F.dentroPiel(q[0], q[1], q[2])) { const z = F.ladoZ(q[0], q[1]); if (Number.isFinite(z)) entra = Math.max(entra, Math.min(0.2, z - Math.abs(q[2]))); }
    }
  }
  return { entra, alto };
}

// ============================================================ round 3 (2026-11-12): two leaves, and leaves against the hatch
/** The skin's outward normal at (x, t) on a row whose sections at x and x ± 2 mm are given (right side). */
function normalFila(s: ReturnType<FormaBala['sec']>, sa: ReturnType<FormaBala['sec']>, sb: ReturnType<FormaBala['sec']>, t: number): V3 {
  const e = 0.002, pa = punto(sa, t), pb = punto(sb, t), q1 = punto(s, Math.min(1, t + e)), q0 = punto(s, Math.max(0, t - e)), [z, y] = punto(s, t);
  const X: V3 = [2 * e, pa[1] - pb[1], pa[0] - pb[0]], T: V3 = [0, q1[1] - q0[1], q1[0] - q0[0]];
  let n: V3 = [X[1] * T[2] - X[2] * T[1], X[2] * T[0] - X[0] * T[2], X[0] * T[1] - X[1] * T[0]];
  const l = Math.hypot(...n) || 1; n = [n[0] / l, n[1] / l, n[2] / l];
  if (n[1] * (y - 0.6) + n[2] * z < 0 && Math.abs(n[0]) < 0.9) n = [-n[0], -n[1], -n[2]];
  return n;
}
/** A piece of skin as points with their outward normals, and which of them are 1.5 cm or more inside its outline. */
interface Nube { p: V3[]; n: V3[]; dentro?: boolean[] }
/** Rows of a region of the skin, x1..x0, t from lo(x) to hi(x): every `paso` along x and about every `paso` / 1.3 along the skin, plus the outline every centimetre. */
function nubeRegion(F: FormaBala, x0: number, x1: number, lo: (x: number) => number, hi: (x: number) => number, paso: number, bordes: boolean, espejo = false): Nube {
  const o: Nube = { p: [], n: [], dentro: [] };
  const fila = (x: number, n?: number) => {
    const s = F.sec(x), a = lo(x), b = Math.min(1, hi(x)), sa = F.sec(x + 0.002), sb = F.sec(x - 0.002), lejosX = x <= x0 - 0.015 && x >= x1 + 0.015;
    const pon = (t: number, d: boolean) => { const [z, y] = punto(s, t), nn = normalFila(s, sa, sb, Math.min(t, 0.995)); o.p.push([x, y, z]); o.n.push(nn); o.dentro!.push(d); if (espejo) { o.p.push([x, y, -z]); o.n.push([nn[0], nn[1], -nn[2]]); o.dentro!.push(d); } };
    if (!(b > a)) { pon(Math.min(1, a), false); return; }
    const [za, ya] = punto(s, a), [zb, yb] = punto(s, b), arco = Math.hypot(yb - ya, zb - za), k = n ?? Math.max(2, Math.ceil(arco * 1.3 / paso));
    // (the top centre of a hatch is its middle, not an edge)
    for (let j = 0; j <= k; j++) { const u = j / k; pon(a + (b - a) * u, lejosX && u * arco >= 0.015 && (espejo || (1 - u) * arco >= 0.015)); }
  };
  const nx = Math.max(2, Math.ceil((x0 - x1) / paso));
  for (let i = 0; i <= nx; i++) fila(x1 + (x0 - x1) * i / nx);
  if (bordes) {
    const n = Math.ceil((x0 - x1) / 0.01);
    for (let i = 0; i <= n; i++) fila(x1 + (x0 - x1) * i / n, 1);
    for (const x of [x0, x1]) fila(x, 40);
  }
  return o;
}
/**
 * Points on one leaf of the opening: rows every `paso` along x and, on each row, about every `paso` / 1.3 along the
 * skin; and the leaf's whole outline every centimetre. Spaced so that two of these surfaces that cut each other always
 * have a pair of points closer than 3 cm (the half-diagonal of a cell is under 1.3 cm): the mutual checks below rely on it.
 */
export function puntosHoja(F: FormaBala, P: Puerta, H: Pick<Hoja, 'x0' | 'x1'>, paso = 0.02): V3[] { return nubeHoja(F, P, H, paso).p; }
const nubeHoja = (F: FormaBala, P: Puerta, H: Pick<Hoja, 'x0' | 'x1'>, paso = 0.02) => nubeRegion(F, H.x0, H.x1, P.tLo, P.tHi, paso, true);
/** The hatch's skin as points (both halves), as dense as a leaf's. */
export function puntosPorton(F: FormaBala, Q: Porton, paso = 0.02): V3[] { return nubeRegion(F, Q.xH, Q.xFin, Q.tLo, () => 1, paso, true, true).p; }
/** A point cloud in a uniform grid of 3 cm cells, for «closest point within 3 cm» queries (hashed integer keys; every candidate's distance is measured, so a collision of keys costs time, never a wrong answer). */
function rejillaPuntos(pts: V3[]) {
  const C = 0.03, m = new Map<number, number[]>(), clave = (a: number, b: number, c: number) => ((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) | 0;
  pts.forEach((p, i) => { const k = clave(Math.floor(p[0] / C), Math.floor(p[1] / C), Math.floor(p[2] / C)); let l = m.get(k); if (!l) m.set(k, l = []); l.push(i); });
  return (p: V3, f: (j: number) => void) => {
    const a = Math.floor(p[0] / C), b = Math.floor(p[1] / C), c = Math.floor(p[2] / C);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const l = m.get(clave(a + i, b + j, c + k)); if (l) for (const q of l) f(q); }
  };
}
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/**
 * Two moving pieces of skin (points with normals): how close they come (m; 3 cm when nothing comes nearer), or how far
 * one goes through the other (negative). Pairs that start more than 4 cm apart must stay 3 cm apart. Pairs that start
 * closer lie along a shared edge (the doors' meeting edge; the hatch's side edge on a door's top), where the two pieces
 * may slide past each other as they open: there a point fails only if it ends up more than 2 mm behind the other piece's
 * surface (against that point's normal) within 1.3 cm of it sideways, i.e. under the other piece.
 * `A[i]`, `B[i]`: positions and normals in each state; `pares`: which [i, j] to compare.
 */
function cercania(A0: Nube, B0: Nube, A: Nube[], B: Nube[], pares: [number, number][]): number {
  let h = 0.03;
  const rejillas = new Map<number, { buscar: ReturnType<typeof rejillaPuntos>; lo: number[]; hi: number[] }>();
  // (q's surface there must be its inside, not its edge: past an edge a point is beside the piece, not under it)
  const debajo = (p: V3, q: V3, n: V3, d: number, qDentro: boolean | undefined) => { if (!qDentro) return 0; const off = (p[0] - q[0]) * n[0] + (p[1] - q[1]) * n[1] + (p[2] - q[2]) * n[2]; return off < -0.002 && d * d - off * off < 0.013 * 0.013 ? off : 0; };
  for (const [ia, ib] of pares) {
    const Bp = B[ib].p, Bn = B[ib].n, Ap = A[ia].p, An = A[ia].n;
    let r = rejillas.get(ib);
    // (only what is within 3 cm of B's box can come within 3 cm of B)
    if (!r) { const lo = [9, 9, 9], hi = [-9, -9, -9]; for (const q of Bp) for (let k = 0; k < 3; k++) { if (q[k] < lo[k]) lo[k] = q[k]; if (q[k] > hi[k]) hi[k] = q[k]; } rejillas.set(ib, r = { buscar: rejillaPuntos(Bp), lo: lo.map(v => v - 0.03), hi: hi.map(v => v + 0.03) }); }
    const { buscar, lo, hi } = r;
    Ap.forEach((p, i) => p[0] >= lo[0] && p[0] <= hi[0] && p[1] >= lo[1] && p[1] <= hi[1] && p[2] >= lo[2] && p[2] <= hi[2] && buscar(p, j => {
      const d = dist(p, Bp[j]); if (d >= 0.03) return;
      if (dist(A0.p[i], B0.p[j]) >= 0.04) { if (d < h) { h = d; } return; }
      h = Math.min(h, debajo(p, Bp[j], Bn[j], d, B0.dentro?.[j]) || 0.03, debajo(Bp[j], p, An[i], d, A0.dentro?.[i]) || 0.03);
    }));
  }
  return h;
}
const girarNube = (c: Nube, H: Hoja, f: number): Nube => { const th = H.abre * Math.PI / 180 * f, o: V3 = [0, 0, 0]; return { p: c.p.map(p => girar(p, H.bisagra, H.eje, th)), n: c.n.map(n => girar(n, o, H.eje, th)), dentro: c.dentro }; };
/**
 * Round 3: the leaves against each other and against the hatch as they all swing (m; 3 cm or more: nothing within 3 cm,
 * which, with points under 1.3 cm from any point of each surface, means they never cut each other at those positions;
 * negative: how far one goes under the other along a shared edge).
 *  - `entreHojas`: the pilot's and the passengers' doors opening together (as «Abrir puertas» opens them), in 24 steps;
 *    `extra` are points that ride on the pilot's door (the mirror).
 *  - `conPorton`: every leaf at each of its 24 steps against the hatch at each of its 12 steps (each opens on its own
 *    button, so every pair of positions is reachable). Null without a hatch; `entreHojas` null with one leaf.
 * Between two steps a point moves up to 8 cm (a 110° door's far corner): a graze shorter than that can fall between them.
 */
export function choquesHojas(F: FormaBala, P: Puerta, extra: V3[], Q: Porton | null): { entreHojas: number | null; conPorton: number | null } {
  const hojas = hojasPuerta(P), nubes = hojas.map((H, i) => { const c = nubeHoja(F, P, H); return i === 0 && extra.length ? { p: [...c.p, ...extra], n: [...c.n, ...extra.map(() => [0, 1, 0] as V3)], dentro: [...c.dentro!, ...extra.map(() => false)] } : c; });
  const N = 24, pasos = Array.from({ length: N }, (_, k) => (k + 1) / N);
  let entreHojas: number | null = null;
  if (hojas.length === 2) entreHojas = cercania(nubes[0], nubes[1], pasos.map(f => girarNube(nubes[0], hojas[0], f)), pasos.map(f => girarNube(nubes[1], hojas[1], f)), pasos.map((_, k) => [k, k]));
  let conPorton: number | null = null;
  if (Q) {
    const P0 = nubeRegion(F, Q.xH, Q.xFin, Q.tLo, () => 1, 0.02, true, true), [hx, hy] = Q.bisagra;
    const abierto = (f: number): Nube => {
      const th = -Q.abre * Math.PI / 180 * f, c = Math.cos(th), sn = Math.sin(th);
      return { p: P0.p.map(p => { const dx = p[0] - hx, dy = p[1] - hy; return [hx + dx * c - dy * sn, hy + dx * sn + dy * c, p[2]] as V3; }), n: P0.n.map(n => [n[0] * c - n[1] * sn, n[0] * sn + n[1] * c, n[2]] as V3), dentro: P0.dentro };
    };
    const portones = [0, ...Array.from({ length: 12 }, (_, k) => (k + 1) / 12)].map(abierto);
    hojas.forEach((H, i) => {
      const giradas = [0, ...pasos].map(f => girarNube(nubes[i], H, f)), pares: [number, number][] = [];
      // (both shut is the body as built: the hatch's own swing check covers it)
      portones.forEach((_, a) => giradas.forEach((_g, b) => { if (a || b) pares.push([b, a]); }));
      const h = cercania(nubes[i], P0, giradas, portones, pares);
      conPorton = conPorton === null ? h : Math.min(conPorton, h);
    });
  }
  return { entreHojas, conPorton };
}
