import type { Est } from './forma';
import { monotona, punto, type FormaBala } from './balaForma';

/*
 * The «Cuadriciclo Bala»'s hand-placed measurements, apart from the skin:
 * the lateral wheel pods and their arms, the fin, the seats, the handlebar's
 * reach and the canopy's outline. Pure (no three.js), so the editor's checks,
 * its frontal area and the wind tunnel's Web Worker read the same numbers the
 * 3D model is built from (balaPiezas.ts, balaModelo.ts).
 *
 * Each is drawn for the reference shape (balaForma.ts, DIM_REF) and follows
 * another shape through its x map, its belly lift and its lateral wheel.
 */

const E = (x: number, yb: number, yt: number, wb: number, wm: number, wt: number, n = 2.6): Est => ({ x, yb, yt, wb, wm, wt, n });
/** The wheels sit this much lower than their radius: the tyre is flattened at the contact patch (apteraDetalle.ts). */
export const APLASTADO_BALA = 0.007;

/** Top centre of the skin (y) at x. */
export const techoEn = (F: FormaBala, x: number) => punto(F.sec(x), 1)[1];

// ======================================================================= pods
/**
 * Fairing of a lateral wheel, centred on its axle (x relative to the axle,
 * z = 0, +z outwards): Aptera-like, a slim «D» in side view with a rounded
 * front and a tapering tail, an aerofoil in plan; the tyre shows below it.
 * Drawn for the 20″ wheel (radius 0.254 m).
 */
export const POD: Est[] = [
  E(0.385, 0.262, 0.318, 0.006, 0.008, 0.006, 2.2),
  E(0.370, 0.190, 0.400, 0.030, 0.036, 0.030, 2.4),
  E(0.340, 0.130, 0.470, 0.050, 0.058, 0.050, 2.7),
  E(0.280, 0.095, 0.530, 0.064, 0.072, 0.062, 3.0),
  E(0.180, 0.078, 0.565, 0.071, 0.079, 0.068, 3.2),
  E(0.050, 0.072, 0.580, 0.073, 0.080, 0.069, 3.3),
  E(-0.080, 0.072, 0.572, 0.072, 0.079, 0.068, 3.3),
  E(-0.200, 0.078, 0.545, 0.066, 0.073, 0.062, 3.1),
  E(-0.300, 0.092, 0.500, 0.054, 0.060, 0.051, 2.9),
  E(-0.390, 0.120, 0.440, 0.038, 0.043, 0.036, 2.7),
  E(-0.470, 0.165, 0.375, 0.020, 0.023, 0.019, 2.5),
  E(-0.530, 0.215, 0.320, 0.007, 0.008, 0.007, 2.3),
  E(-0.550, 0.245, 0.290, 0.002, 0.002, 0.002, 2.2),
];
/** The pod's half-width at its widest (for the overall width): 0.08 m. */
export const POD_SEMIANCHO = 0.080;
/** Radius of the reference lateral wheel (20″): the pod is drawn for it and scales with the wheel. */
export const R_LAT_REF = 0.254;
/** The pod for this shape's lateral wheel: x and heights scale with the wheel's radius (exactly the drawing at 20″). */
export function podDe(F: FormaBala): Est[] {
  const k = F.R_LAT / R_LAT_REF, o = F.D.pod;
  if (!o) return POD.map(e => ({ ...e, x: e.x * k, yb: e.yb * k, yt: e.yt * k }));
  // The Triciclo's pods (2026-11-10): `esc` scales the whole pod about the wheel's
  // centre, `ancho` its width and `cola` the length of its tail (behind the axle).
  const yc = R_LAT_REF * k, Y = (y: number) => yc + (y * k - yc) * o.esc, W = o.esc * o.ancho;
  return POD.map(e => ({ ...e, x: e.x * k * o.esc * (e.x < 0 ? o.cola : 1), yb: Y(e.yb), yt: Y(e.yt), wb: e.wb * W, wm: e.wm * W, wt: e.wt * W }));
}
/** A pod's half-width at its widest (m): the Cuadriciclo's is `POD_SEMIANCHO`. */
export const anchoMaxPod = (F: FormaBala) => (F.D.pod ? POD_SEMIANCHO * F.D.pod.esc * F.D.pod.ancho : POD_SEMIANCHO);
/** Half-width of a pod at (x relative to its axle, y); 0 outside it. */
export const semiAncho = (POD: Est[]) => (x: number, y: number): number => {
  let k = 0; while (k < POD.length - 2 && POD[k + 1].x > x) k++;
  const a = POD[k], b = POD[k + 1], t = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x)));
  const L = (p: number, q: number) => p + (q - p) * t;
  const yb = L(a.yb, b.yb), yt = L(a.yt, b.yt), w = L(a.wm, b.wm), n = L(a.n ?? 2.6, b.n ?? 2.6);
  if (y <= yb || y >= yt) return 0;
  const u = Math.abs(y - (yb + yt) / 2) / ((yt - yb) / 2);
  return w * Math.pow(Math.max(0, 1 - Math.pow(u, n)), 1 / n);
};
/** Bottom and top of a pod at x relative to its axle (linear between stations), or null outside it. */
export function alturasPod(POD: Est[], x: number): [number, number] | null {
  if (x > POD[0].x || x < POD[POD.length - 1].x) return null;
  let k = 0; while (k < POD.length - 2 && POD[k + 1].x > x) k++;
  const a = POD[k], b = POD[k + 1], t = Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x)));
  return [a.yb + (b.yb - a.yb) * t, a.yt + (b.yt - a.yt) * t];
}

/** Upper arm (main, streamlined) and lower link from the body to each pod: chord, thickness, height. */
const BRAZOS = [
  { x: 0.03, cuerda: 0.20, grueso: 0.034, y: 0.43 },
  { x: -0.01, cuerda: 0.13, grueso: 0.024, y: 0.18 },
];
/** The arms of this shape: they scale with the pod, and the lower link stays 5.6 cm above a raised belly (it must meet the skin). */
export function brazosDe(F: FormaBala) {
  const k = F.R_LAT / R_LAT_REF, cuerda = F.D.cuerdaBrazo;
  return BRAZOS.map((b, i) => ({ ...b, ...(i === 0 && cuerda != null ? { cuerda } : {}), x: b.x * k, y: i === 1 && F.dSuelo > 0 ? Math.max(b.y * k, F.D.suelo + 0.056) : b.y * k }));
}

// ======================================================================= fin
/**
 * The tail fin: a small swept stabiliser on the end of the tail cone, as on a
 * jet. Root chord along the skin from x = −2.50 to −3.05; tip chord 0.14 m at
 * 1.00 m up (about 0.35 m above the falling tail); leading edge swept ~45°.
 * Symmetric aerofoil section (NACA 00xx thickness, 3 cm at the root, 1.2 cm
 * at the tip), navy with a red tip cap (painted).
 */
export const ALETA = { raiz: [-2.50, -3.05] as [number, number], punta: [[-2.875, 1.0], [-3.015, 0.99]] as [[number, number], [number, number]], grueso: [0.016, 0.007] as [number, number] }; // half-thickness at root and tip

// ======================================================================= seats
/** Where the riders sit: hip x (negative: behind the front axle) and the saddle's height under each, above the road. */
export interface Asientos { xPiloto: number; yPiloto: number; xPasajero: number; yPasajero: number }
export const ASIENTO: Asientos = { xPiloto: -1.06, yPiloto: 0.44, xPasajero: -1.54, yPasajero: 0.47 };
/** Half-width of the reference handlebar at the bar-end weight's outer face (m). */
const MANILLAR = 0.325 + 0.006;
/**
 * How wide the handlebar is, as a fraction of the reference one: it narrows with a narrower
 * body, and further if the canopy is tight where the grips are (1.2 cm from the skin), but
 * never below 70 % (narrower is not rideable: then it pokes out, and the check says so).
 */
export function escalaManillar(F: FormaBala, d: [number, number] = [0, 0]): number {
  const kz = Math.min(1, F.kW), cabe = (F.ladoZ(-0.592 + d[0], 0.870 + F.dSuelo + d[1]) - 0.012) / MANILLAR;
  return Number.isFinite(cabe) ? Math.max(0.7, Math.min(kz, cabe)) : 0.7;
}
/**
 * The outer end of the handlebar (the bar-end weight's outer face), for the check that it stays inside the body: [x, y, z].
 * `d` moves the bars (the Triciclo's handlebar sliders, 2026-11-10: [x, y], m); the Cuadriciclo's never move.
 */
export const extremoManillar = (F: FormaBala, d: [number, number] = [0, 0]): [number, number, number] => [-0.592 + d[0], 0.870 + F.dSuelo + d[1], MANILLAR * escalaManillar(F, d)];

// ======================================================================= canopy
/** Lower edge of the canopy glass in side view (reference drawing). Where it meets the top line, the glass ends (rounded in plan). */
export const Y_VIDRIO_REF = monotona([[-0.10, 0.80], [-0.25, 0.815], [-0.45, 0.815], [-0.8, 0.815], [-1.2, 0.83], [-1.5, 0.855], [-1.65, 0.90], [-1.78, 0.99], [-1.9, 1.10], [-2.0, 1.20], [-2.1, 1.30]]);
/** The navy canopy frame: this much below the glass, all round it. Its outer edge is the canopy's shut line. */
export const MARCO_CUPULA = 0.035;
/** The canopy of a shape: its glass edge and frame edge in side view, and where each meets the top line. */
export function contornoCupula(F: FormaBala) {
  const Y_VIDRIO = (x: number) => F.alturaArriba(Y_VIDRIO_REF(F.R(x)));
  const yMarco = (x: number) => Y_VIDRIO(x) - MARCO_CUPULA;
  /** Where a side-view line meets the top line, by bisection between xa (line below the top) and xb (line above it). */
  const cruce = (linea: (x: number) => number, xa: number, xb: number): number => {
    let a = xa, b = xb;
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (techoEn(F, m) - linea(m) > 0) a = m; else b = m; }
    return (a + b) / 2;
  };
  return {
    Y_VIDRIO, yMarco,
    /** Glass from XC1 to XC0, frame from XF1 to XF0. */
    XC0: cruce(Y_VIDRIO, F.X(-0.30), F.X(-0.08)), XC1: cruce(Y_VIDRIO, F.X(-1.75), F.X(-2.3)),
    XF0: cruce(yMarco, F.X(-0.30), F.X(0.0)), XF1: cruce(yMarco, F.X(-1.75), F.X(-2.4)),
  };
}
