import type { Est } from './forma';
import { monotona, punto, tArriba, type FormaBala } from './balaForma';

/*
 * The «Cuadriciclo Bala en rombo»'s hand-placed measurements, apart from the skin:
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
  // A tyre wider than the drawn 70 mm (round two: car tyres up to 175 mm) widens the pod by 1.8 times what it adds
  // (the pod narrows towards its top, a car tyre does not).
  const yc = R_LAT_REF * k, Y = (y: number) => yc + (y * k - yc) * o.esc, W = o.esc * o.ancho + masNeu(F);
  return POD.map(e => ({ ...e, x: e.x * k * o.esc * (e.x < 0 ? o.cola : 1), yb: Y(e.yb), yt: Y(e.yt), wb: e.wb * W, wm: e.wm * W, wt: e.wt * W }));
}
/** The Triciclo's pods: what a tyre wider than the drawn 70 mm adds to their width factor (0 with it). */
const masNeu = (F: FormaBala) => Math.max(0, F.ANCHO_NEU_LAT - 0.07) / 2 * 1.8 / POD_SEMIANCHO;
/** A pod's half-width at its widest (m): the Cuadriciclo en rombo's is `POD_SEMIANCHO`. */
export const anchoMaxPod = (F: FormaBala) => (F.D.pod ? POD_SEMIANCHO * (F.D.pod.esc * F.D.pod.ancho + masNeu(F)) : POD_SEMIANCHO);
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
/**
 * The arms of this shape: they scale with the pod, and the lower link stays 5.6 cm above a raised belly (it must meet the skin).
 * `y` is the height at the pod; `yCuerpo` at the body. They differ only on a Triciclo lifted rigidly (`F.elevar`, round three,
 * 2026-11-11): the pods stay round their wheels on the road and the body rises, so each arm runs down and out from the body to
 * its pod, as on a car with long suspension. With no lift `yCuerpo` is `y` itself.
 */
export function brazosDe(F: FormaBala) {
  const k = F.R_LAT / R_LAT_REF, cuerda = F.D.cuerdaBrazo, e = F.elevar;
  // the belly of the shape before the lift (the real one, `D.suelo`, is `e` higher)
  const vientre = F.D.suelo - e;
  return BRAZOS.map((b, i) => {
    const y = i === 1 && F.dSuelo > 0 ? Math.max(b.y * k, vientre + 0.056) : b.y * k;
    // the rear pods of the «Cuadriciclo Bala clásico» (2026-11-11): each arm meets the body at least 5.6 cm above the
    // tail's belly there (`vientreBrazos`), and runs down to its pod if it has to
    const vb = F.D.vientreBrazos;
    if (vb != null) { const yc = Math.max(y + e, vb + 0.056 + (i === 0 ? 0.10 : 0)); return { ...b, ...(i === 0 && cuerda != null ? { cuerda } : {}), x: b.x * k, y, yCuerpo: yc }; }
    return { ...b, ...(i === 0 && cuerda != null ? { cuerda } : {}), x: b.x * k, y, yCuerpo: e > 0 ? y + e : y };
  });
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
/**
 * Round 3 interior (2026-11-12, Eugenio: «los asientos por los bonitos como los de la Aptera»): the Triciclo's bucket
 * seat, sculpted as the Aptera's (press photos of Aptera's interior: a light one-piece shell, white outside, with a dark
 * cushion and backrest pad and the headrest grown out of the shell; no drawings are published, so the sizes are a car
 * bucket's). Metres from the rider's hips (x) and the cushion's top (y), along the backrest for its heights.
 */
export const BUTACA = {
  delante: 0.31,   // the cushion's front edge, ahead of the hips
  detras: 0.21,    // the shell's back at the cushion, behind the hips
  bisagra: 0.17,   // the backrest's front face at its foot, behind the hips (as the car seats': the trunk leans on it)
  pan: 0.06,       // the shell's underside below the cushion's top (as `PAN_ASIENTO`)
  respaldo: 0.62,  // the backrest's height along it, from the cushion
  cabezal: 0.21,   // the headrest above it, out of the same shell
  grueso: 0.075,   // the backrest shell's thickness
  semi: { cojin: 0.25, pie: 0.24, hombros: 0.225, cuello: 0.115, cabezal: 0.135 },
} as const;
/** The bucket's backrest half-width `h` metres up from the cushion (m): wide at its foot, the shoulders' wings, a waist at the neck and the headrest. */
export function semiRespaldoButaca(h: number): number {
  const B = BUTACA, S = B.semi, R = B.respaldo;
  if (h <= 0) return S.pie;
  if (h <= R) return S.pie + (S.hombros - S.pie) * h / R;
  const u = (h - R) / B.cabezal;
  if (u <= 0.25) return S.hombros + (S.cuello - S.hombros) * u / 0.25;
  return u >= 1 ? S.cabezal * 0.9 : S.cuello + (S.cabezal - S.cuello) * Math.min(1, (u - 0.25) / 0.35);
}
/** Half-width of the reference handlebar at the bar-end weight's outer face (m). */
const MANILLAR = 0.325 + 0.006;
/**
 * How wide the handlebar is, as a fraction of the reference one: it narrows with a narrower
 * body, and further if the canopy is tight where the grips are (1.2 cm from the skin), but
 * never below 70 % (narrower is not rideable: then it pokes out, and the check says so).
 */
export function escalaManillar(F: FormaBala, d: [number, number] = [0, 0]): number {
  const kz = Math.min(1, F.kW), cabe = (F.ladoZ(-0.592 + d[0], 0.870 + F.dSuelo + F.elevar + d[1]) - 0.012) / MANILLAR;
  return Number.isFinite(cabe) ? Math.max(0.7, Math.min(kz, cabe)) : 0.7;
}
/**
 * The outer end of the handlebar (the bar-end weight's outer face), for the check that it stays inside the body: [x, y, z].
 * `d` moves the bars (the Triciclo's handlebar sliders, 2026-11-10: [x, y], m); the Cuadriciclo en rombo's never move.
 */
export const extremoManillar = (F: FormaBala, d: [number, number] = [0, 0]): [number, number, number] => [-0.592 + d[0], 0.870 + F.dSuelo + F.elevar + d[1], MANILLAR * escalaManillar(F, d)];

// ======================================================================= canopy
/** Lower edge of the canopy glass in side view (reference drawing). Where it meets the top line, the glass ends (rounded in plan). */
export const Y_VIDRIO_REF = monotona([[-0.10, 0.80], [-0.25, 0.815], [-0.45, 0.815], [-0.8, 0.815], [-1.2, 0.83], [-1.5, 0.855], [-1.65, 0.90], [-1.78, 0.99], [-1.9, 1.10], [-2.0, 1.20], [-2.1, 1.30]]);
/** The navy canopy frame: this much below the glass, all round it. Its outer edge is the canopy's shut line. */
export const MARCO_CUPULA = 0.035;
/** The canopy of a shape: its glass edge and frame edge in side view, and where each meets the top line. */
export function contornoCupula(F: FormaBala) {
  // round 3 (2026-11-12): the body/glass line moved `lineaCupula` (absent: exactly as before, the same brackets too)
  const dl = F.D.lineaCupula ?? 0;
  const Y_VIDRIO = dl ? (x: number) => F.alturaArriba(Y_VIDRIO_REF(F.R(x))) + dl : (x: number) => F.alturaArriba(Y_VIDRIO_REF(F.R(x)));
  const yMarco = (x: number) => Y_VIDRIO(x) - MARCO_CUPULA;
  /** Where a side-view line meets the top line, by bisection between xa (line below the top) and xb (line above it). */
  const cruce = (linea: (x: number) => number, xa: number, xb: number): number => {
    let a = xa, b = xb;
    for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (techoEn(F, m) - linea(m) > 0) a = m; else b = m; }
    return (a + b) / 2;
  };
  // (a moved line meets the top line elsewhere: searched from the crest to the nose ring and to the tail ring)
  if (dl) return {
    Y_VIDRIO, yMarco,
    XC0: cruce(Y_VIDRIO, F.X(-1.30), F.X(0.30)), XC1: cruce(Y_VIDRIO, F.X(-1.30), F.X(-2.86)),
    XF0: cruce(yMarco, F.X(-1.30), F.X(0.30)), XF1: cruce(yMarco, F.X(-1.30), F.X(-2.86)),
  };
  return {
    Y_VIDRIO, yMarco,
    /** Glass from XC1 to XC0, frame from XF1 to XF0. */
    XC0: cruce(Y_VIDRIO, F.X(-0.30), F.X(-0.08)), XC1: cruce(Y_VIDRIO, F.X(-1.75), F.X(-2.3)),
    XF0: cruce(yMarco, F.X(-0.30), F.X(0.0)), XF1: cruce(yMarco, F.X(-1.75), F.X(-2.4)),
  };
}

// ======================================================= the Triciclo's solar roof and side windows
/*
 * Round two of the Triciclo Bala (2026-11-10, Eugenio): «como está ahora la cúpula, en verano sería mucho
 * calor… un techo solar que llegaba hasta la altura de la cabeza del piloto», and «como el Aptera original…
 * ventanas laterales con un frame que separa el cristal frontal parabrisas con las ventanas laterales. De una
 * forma elegante y curva». The canopy's SHAPE does not change: everything here lies on the canopy glass's own
 * surface, addressed by (x, t) like the skin (balaForma.ts). The Cuadriciclo en rombo never reads any of this.
 *
 *  - tC(x): the glass's lower edge (where the canopy glass begins on the side).
 *  - tR(x) = tC + alto · (1 − tC): the roof rail, a fixed fraction of the way from that edge to the top centre.
 *    Below it on each side, the side window; above it, the roof. Near the canopy's two ends the glass edge
 *    rises to the top line, and the rail with it: the side window closes in a long teardrop, as on the Aptera.
 *  - The solar panel: the roof above the rail, from the canopy's rear end forward to `solar`, with a rounded
 *    leading edge (it reaches `BOMBEO` further forward on the centre line than at the rail). Opaque.
 *  - The A-pillar (`pilar`): a band from the glass's lower edge at `x` that rises and sweeps back to meet the
 *    rail `barrido` metres further back. Its centre line is a quarter ellipse in (x, height between the two
 *    edges): it leaves the lower edge going straight up the side and meets the rail tangentially, so the
 *    windscreen's edge is one curve that flows into the roof line. Ahead of it, the windscreen (which runs
 *    over the top up to the panel); behind it, the side window. The rail behind the pillar carries the same
 *    dark band, narrower: the frame between the side window and the roof.
 */
export interface OpcionesVentanas {
  /** x where the solar panel starts at the rail (shape coordinates), or null: no panel. */
  solar: number | null;
  /** Height of the side window (and of the panel's side edge): fraction of the glass from its lower edge to the top. */
  alto: number;
  /** The A-pillar and the rail frame, or null (a single bubble, as the Cuadriciclo en rombo's). */
  pilar: { x: number; barrido: number; ancho: number } | null;
}
/** How much further forward the panel reaches on the centre line than at the rail (m): its rounded leading edge. */
export const BOMBEO_SOLAR = 0.14;
type Contorno = Pick<ReturnType<typeof contornoCupula>, 'Y_VIDRIO' | 'XC0' | 'XC1'>;
/** The windows and the panel of a shape, as curves on the glass in (x, t). */
export function ventanasDe(F: FormaBala, C: Contorno, o: OpcionesVentanas) {
  const tC = (x: number) => tArriba(F.sec(x), C.Y_VIDRIO(x));
  const tR = (x: number) => { const c = tC(x); return c + o.alto * (1 - c); };
  // ── the panel
  let panel: null | { x0: number; x1: number; xS: number; tLow: (x: number) => number } = null;
  if (o.solar != null && o.solar > C.XC1 + 0.03) {
    const xS = Math.min(C.XC0 - 0.05, o.solar), x1 = Math.min(C.XC0 - 0.01, xS + BOMBEO_SOLAR);
    const tLow = (x: number) => {
      const r = tR(x); if (x <= xS) return r;
      const u = (2 / Math.PI) * Math.asin(Math.min(1, (x - xS) / BOMBEO_SOLAR));
      return r + u * (1 - r);
    };
    panel = { x0: C.XC1 + 1e-4, x1, xS, tLow };
  }
  // ── the pillar and the rail
  let pilar: null | { xP: number; xT: number; punto: (s: number) => [number, number]; ancho: number } = null;
  if (o.pilar) {
    const xP = Math.min(C.XC0 - 0.06, Math.max(C.XC1 + 0.3, o.pilar.x)), xT = Math.max(C.XC1 + 0.1, xP - o.pilar.barrido);
    pilar = {
      xP, xT, ancho: o.pilar.ancho,
      punto: (s: number) => {
        const a = Math.PI / 2 * Math.min(1, Math.max(0, s)), x = xP + (xT - xP) * (1 - Math.cos(a)), c = tC(x);
        // from just below the glass edge (into the navy canopy frame) up to the rail
        return [x, c - 0.01 + (o.alto * (1 - c) + 0.01) * Math.sin(a)];
      },
    };
  }
  return { tC, tR, panel, pilar };
}
export type Ventanas = ReturnType<typeof ventanasDe>;
/**
 * The frame's band as (x, t) points (right side): up the pillar, then back along the rail to the canopy's
 * rear end; and its width at each point (the pillar slims by a quarter towards the roof, the rail is 75 %
 * of the pillar, tapering out at the end). The 3D builder draws exactly this, and the mass counts its area.
 */
export function bandaMarco(V: Ventanas, xFin: number): { pts: [number, number][]; ancho: number[] } | null {
  const p = V.pilar; if (!p) return null;
  const pts: [number, number][] = [], ancho: number[] = [], NP = 40;
  for (let i = 0; i <= NP; i++) { pts.push(p.punto(i / NP)); ancho.push(p.ancho * (1 - 0.25 * Math.sin(Math.PI / 2 * i / NP) ** 2)); }
  const xs: number[] = []; for (let x = p.xT - 0.01; x > xFin; x -= 0.012) xs.push(x); xs.push(xFin);
  xs.forEach((x, i) => { const u = i / Math.max(1, xs.length - 1); pts.push([x, V.tR(x)]); ancho.push(p.ancho * 0.75 * (1 - 0.2 * u) * Math.min(1, (1 - u) * 12)); });
  return { pts, ancho };
}
/** 2026-11-12, the Triciclo's dashboard: its half-width at (x, y), 2 cm inside the skin and never under 5 cm (the model's check and the 3D read this). */
export const anchoSalpicadero = (F: FormaBala, x: number, y: number) => { const z = F.ladoZ(x, y); return Number.isFinite(z) ? Math.max(0.05, z - 0.02) : 0.05; };
/** Area of that band (m², both sides): its length on the skin times its width. */
export function areaMarco(F: FormaBala, b: { pts: [number, number][]; ancho: number[] } | null): number {
  if (!b) return 0;
  let A = 0;
  for (let i = 1; i < b.pts.length; i++) {
    const [x0, t0] = b.pts[i - 1], [x1, t1] = b.pts[i], [z0, y0] = punto(F.sec(x0), t0), [z1, y1] = punto(F.sec(x1), t1);
    A += Math.hypot(x1 - x0, y1 - y0, z1 - z0) * (b.ancho[i - 1] + b.ancho[i]) / 2;
  }
  return 2 * A;
}

/**
 * Area (m², both sides) of a region of the skin given by rows x0..x1 and, on each row, t from `rango(x)[0]`
 * to `rango(x)[1]`; with its centroid (x, y). Triangles on the skin's own sections, as `pielBala`.
 */
export function areaXT(F: FormaBala, x0: number, x1: number, rango: (x: number) => [number, number], nx = 90, nt = 16): { area: number; x: number; y: number } {
  let A = 0, ax = 0, ay = 0, prev: [number, number, number][] | null = null;
  const tri = (p: number[], q: number[], r: number[]) => {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
    return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  };
  for (let i = 0; i <= nx; i++) {
    const x = x0 + (x1 - x0) * i / nx, s = F.sec(x), [a, b] = rango(x), fila: [number, number, number][] = [];
    for (let j = 0; j <= nt; j++) { const [z, y] = punto(s, a + (b - a) * j / nt); fila.push([x, y, z]); }
    if (prev) for (let j = 0; j < nt; j++) {
      const k = 2 * (tri(prev[j], prev[j + 1], fila[j]) + tri(prev[j + 1], fila[j + 1], fila[j]));
      A += k; ax += k * (prev[j][0] + fila[j + 1][0]) / 2; ay += k * (prev[j][1] + fila[j + 1][1]) / 2;
    }
    prev = fila;
  }
  return { area: A, x: A ? ax / A : (x0 + x1) / 2, y: A ? ay / A : 1 };
}
