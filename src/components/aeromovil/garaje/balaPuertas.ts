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
}
export interface OpcionesPorton { x: number; abre: number }

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
  const xR = Math.min(o.tras, xTip - 0.3), xD = Math.min(xTip - 0.04, Math.max(xR + 0.25, o.del));
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
  return { xTip, yTip, xR, xD, yLo, yHi, tLo, tHi, yCintura, cintura: o.cintura, bisagra: [hx, hy, Number.isFinite(hz) ? hz : 0] as V3, eje, abre: o.abre, filas, banda: bb };
}
/** Is (x, y) inside the door's outline in side view? */
export const enPuerta = (P: Puerta, x: number, y: number) => x <= P.xTip && x >= P.xR && y >= P.yLo(x) - 1e-4 && y <= P.yHi(x) + 1e-4;

/** The hatch's side edge along the tail: the shoulder of the section (balaForma.ts P4, t = 0.47). */
export const T_HOMBRO = 0.47;
export type Porton = ReturnType<typeof portonDe>;
/** The Aptera-style hatch, from its hinge `o.x` back to the tail ring `xFin`, over a door `P`. */
export function portonDe(F: FormaBala, P: Puerta, C: Contorno, o: OpcionesPorton, xFin: number) {
  // never ahead of the roof's highest point: ahead of it the roof still rises, and the hatch's front edge, lifting
  // about a hinge lower than itself, would swing forward into the fixed roof
  let xCima = P.xTip, yCima = -1;
  for (let x = P.xTip; x > C.XF1; x -= 0.01) { const y = techoEn(F, x); if (y > yCima + 1e-4) { yCima = y; xCima = x; } }
  const xH = Math.min(P.xTip - 0.30, xCima, Math.max(C.XF1 + 0.25, o.x));
  const dentroBanda = enX(P.banda.dentro), finBanda = P.banda.dentro[P.banda.dentro.length - 1][0];
  const tBanda = (x: number) => (x >= finBanda ? tDeY(F, x, dentroBanda(x)) : tMarco(F, C, x));
  // behind the door the side edge eases down in 35 cm to the tail's shoulder (t = T_HOMBRO) and follows it back: the
  // whole upper rear opens, as on the Aptera, above the rear arms, the charging flap and the rear vents. (A first try
  // followed the round-three lid's line, the canopy frame's edge: on this tail that is its crown, and only a strip opened.)
  const tLo = (x: number) => {
    if (x >= P.xR) return P.tHi(x);
    const w = suave((P.xR - x) / 0.35);
    return w >= 1 ? T_HOMBRO : tBanda(x) * (1 - w) + T_HOMBRO * w;
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
/** Points on the right door's skin (a 16 × 8 grid over its outline), for the swing checks. */
export function puntosPuerta(F: FormaBala, P: Puerta): V3[] {
  const o: V3[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = P.xR + (P.xTip - P.xR) * i / 16, a = P.tLo(x), b = P.tHi(x);
    for (let j = 0; j <= 8; j++) { const [z, y] = punto(F.sec(x), a + (b - a) * j / 8); o.push([x, y, z]); }
  }
  return o;
}
/**
 * The door's swing, checked in 12 steps to its full opening: how deep it goes into the fixed body (anything outside
 * its own opening; points within 4 cm of the hinge axis are the hinge itself and are left out), how close it comes
 * to the front pod and its arms (wheels straight), and how low it gets. `extra`: points that swing with it (the mirror).
 */
export function vueloPuerta(F: FormaBala, P: Puerta, extra: V3[] = []): { entra: number; carenado: number; suelo: number; punta: number } {
  const pts = [...puntosPuerta(F, P), ...extra], h = P.bisagra, u = P.eje;
  const POD = podDe(F), ancho = semiAncho(POD), zp = F.VIA_LAT / 2, br = brazosDe(F);
  const dEje = (p: V3) => { const v: V3 = [p[0] - h[0], p[1] - h[1], p[2] - h[2]], k = v[0] * u[0] + v[1] * u[1] + v[2] * u[2]; return Math.hypot(v[0] - k * u[0], v[1] - k * u[1], v[2] - k * u[2]); };
  let entra = 0, carenado = 9, suelo = 9, punta = 0;
  for (let s = 1; s <= 12; s++) {
    const th = P.abre * Math.PI / 180 * s / 12;
    for (const p of pts) {
      const q = girar(p, h, u, th);
      suelo = Math.min(suelo, q[1]); punta = Math.max(punta, q[2]);
      if (dEje(p) > 0.04 && !enPuerta(P, q[0], q[1]) && F.dentroPiel(q[0], q[1], q[2])) {
        const z = F.ladoZ(q[0], q[1]); if (Number.isFinite(z)) entra = Math.max(entra, Math.min(0.2, z - Math.abs(q[2])));
      }
      // the front pod round its wheel (straight ahead), and its two faired arms from the body
      const xr = q[0] - F.X_LAT, alt = alturasPod(POD, xr);
      if (alt && q[1] > alt[0] - 0.05 && q[1] < alt[1] + 0.05) {
        const w = ancho(xr, Math.min(alt[1] - 1e-3, Math.max(alt[0] + 1e-3, q[1])));
        carenado = Math.min(carenado, Math.hypot(Math.max(0, Math.abs(q[2] - zp) - w), q[1] < alt[0] ? alt[0] - q[1] : q[1] > alt[1] ? q[1] - alt[1] : 0));
      }
      for (const b of br) {
        const dx = Math.max(0, Math.abs(q[0] - (F.X_LAT + b.x)) - b.cuerda / 2), dy = Math.max(0, Math.abs(q[1] - (b.y + b.yCuerpo) / 2) - b.grueso / 2 - Math.abs(b.yCuerpo - b.y) / 2);
        const zc = F.ladoZ(F.X_LAT + b.x, b.yCuerpo), dz = Number.isFinite(zc) ? Math.max(0, Math.max(zc - q[2], q[2] - (zp - 0.02))) : 0;
        carenado = Math.min(carenado, Math.hypot(dx, dy, dz));
      }
    }
  }
  return { entra, carenado, suelo, punta };
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
