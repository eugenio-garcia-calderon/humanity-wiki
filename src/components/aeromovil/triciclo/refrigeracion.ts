// ============================================================================
// THE HYBRID'S COOLING: AIR INTAKE, RADIATOR AND COOLANT PIPES (2026-11-17, bot «capo»)
// ============================================================================
// Eugenio: «permite crear una apertura en el morro que pueda ser de una sola boca o que sean dos bocas, una a cada lado
// del morro, y que pueda jugar con la geometría de esa boca … o una apertura lateral en ambos lados de la cola, al estilo
// branquias, que van como por debajo del carenado antes de que empiece la cola y que son como colectores, una toma de
// aire. Y que se pueda colocar aquí el radiador de refrigeración. O se pueda colocar delante … También con los tubos de
// refrigeración en el circuito.»
//
// Pure (no three.js): the model's numbers. The 3D is `../visor/refrigeracion.ts`, the panel `../RefrigeracionTriciclo.tsx`.
//
// The fields live HERE, not in `campos.ts` (`CamposRefrigeracion`, optional on a design): a design saved before has none
// and reads `REFRIGERACION_DEFECTO` («Ninguna»), so it builds, weighs and consumes exactly as before. They are read from
// the model's `P` (crearModeloTriciclo keeps every key of the design in `m.P`), clamped to `FILAS_REFRIGERACION`.
// Only with the plug-in hybrid (`m.phev`): an electric-only car has nothing here.
//
// Physics, all of it labelled «estimación» on screen (memory/03_DECISIONS.md, 2026-11-17 «capo»):
//  · heat to the coolant at full engine power: 25 % of the fuel's energy (Heywood, «Internal Combustion Engine
//    Fundamentals», 1988, ch. 12: 17–26 % for a spark-ignition engine at full load) = kW × 0,25 / efficiency;
//  · what the radiator gives on a long climb, slow, on a hot day: ε·ṁ·cp·ΔT with ε = 0,5 (air-side effectiveness of a
//    compact car radiator), the air at the core's face 3 m/s (its electric fan; the ram air at 40 km/h through a duct
//    adds little), coolant 105 °C, air 35 °C (ΔT 70 K);
//  · the mouth: at least 25 % of the radiator's face (Hucho, «Aerodynamics of Road Vehicles», 4th ed., cooling air:
//    inlet ≈ 25–40 % of the core);
//  · the drag of the cooling air, which the tunnel cannot see (it reads the silhouette only): ΔCdA ≈ 0,5 × the mouth's
//    area (Hucho: 0,02–0,04 of Cd on a 2 m² car with 0,1–0,15 m² of mouth, i.e. 0,3–0,7 × the mouth). Added to the CdA
//    of the consumption (`energia.ts`), not to the tunnel's Cd;
//  · masses: core 0,25 kg/dm² + 0,4 kg of tanks per radiator; coolant 1,07 kg/L (0,6 L/dm² of core, the engine's
//    jacket 1 L + 0,04 L/kW, the pipes' bore); hose 0,012 kg/m per mm of bore; fan 0,6 kg + 0,12 kg/dm²; each duct 0,25 kg.

import type { FormaBala } from '../garaje/balaForma';
import type { ModeloTriciclo } from './modelo';
import type { PiezaMasa } from './masas';

export type TomaAire = 'ninguna' | 'morro1' | 'morro2' | 'branquias';
export type SitioRadiador = 'toma' | 'delante' | 'lateral';
export type SitioMotor = 'detras' | 'delante';

/** The cooling's fields (optional in a design: absent, `REFRIGERACION_DEFECTO`). Lengths in cm, areas in dm², bore in mm. */
export interface CamposRefrigeracion {
  tToma: TomaAire;
  /** Nose mouth: width and height (cm), its centre's height over the nose's tip (cm), the corners' radius (% of the half height: 100 = oval). */
  tTomaAncho: number; tTomaAlto: number; tTomaY: number; tTomaRadio: number;
  /** Two mouths: their centres' distance from the centre line (cm). */
  tTomaSep: number;
  /** Gills: how many slots per side, the zone's length and height (cm), its rear edge ahead of the rear axle (cm), its centre's height (cm over the ground). */
  tBranqN: number; tBranqLargo: number; tBranqAlto: number; tBranqX: number; tBranqY: number;
  /** The radiator: where (behind the intake, or forced to the nose or the sides), its face's area (dm², all together). */
  tRad: SitioRadiador; tRadArea: number;
  /** The coolant pipes' bore (mm). */
  tTuboD: number;
  /** (2026-11-17, second step) the petrol engine at the back (as always) or in the nose. */
  tMotorPos: SitioMotor;
}
export type ClaveRefrigeracion = keyof CamposRefrigeracion;
export type ClaveNumRefrigeracion = Exclude<ClaveRefrigeracion, 'tToma' | 'tRad' | 'tMotorPos'>;

export const REFRIGERACION_DEFECTO: CamposRefrigeracion = {
  tToma: 'ninguna', tTomaAncho: 28, tTomaAlto: 14, tTomaY: -6, tTomaRadio: 50, tTomaSep: 14,
  tBranqN: 4, tBranqLargo: 32, tBranqAlto: 14, tBranqX: 55, tBranqY: 42,
  tRad: 'toma', tRadArea: 14, tTuboD: 20, tMotorPos: 'detras',
};

/** [key, label, min, max, step, unit, which intake shows it ('morro' both nose mouths, 'morro2' two only, 'branquias', null always)] */
export const FILAS_REFRIGERACION: [ClaveNumRefrigeracion, string, number, number, number, string, 'morro' | 'morro2' | 'branquias' | null][] = [
  ['tTomaAncho', 'Boca: ancho (cada una)', 6, 44, 0.5, 'cm', 'morro'],
  ['tTomaAlto', 'Boca: alto', 3, 22, 0.5, 'cm', 'morro'],
  ['tTomaY', 'Boca: altura sobre la punta del morro', -22, 16, 0.5, 'cm', 'morro'],
  ['tTomaRadio', 'Boca: esquinas (0 rectas, 100 ovalada)', 0, 100, 5, '%', 'morro'],
  ['tTomaSep', 'Dos bocas: separación del centro', 6, 30, 0.5, 'cm', 'morro2'],
  ['tBranqN', 'Branquias: ranuras por lado', 1, 8, 1, '', 'branquias'],
  ['tBranqLargo', 'Branquias: largo de la zona', 10, 70, 1, 'cm', 'branquias'],
  ['tBranqAlto', 'Branquias: alto', 4, 30, 0.5, 'cm', 'branquias'],
  ['tBranqX', 'Branquias: por delante del eje trasero', 10, 160, 1, 'cm', 'branquias'],
  ['tBranqY', 'Branquias: altura del centro sobre el suelo', 20, 80, 0.5, 'cm', 'branquias'],
  ['tRadArea', 'Radiador: área de la cara (todo)', 4, 40, 0.5, 'dm²', null],
  ['tTuboD', 'Tubos de refrigerante: diámetro interior', 12, 40, 1, 'mm', null],
];
export const OPCIONES_TOMA: { k: TomaAire; n: string }[] = [
  { k: 'ninguna', n: 'Ninguna' }, { k: 'morro1', n: 'Morro: una boca' }, { k: 'morro2', n: 'Morro: dos bocas (una a cada lado)' }, { k: 'branquias', n: 'Branquias laterales (delante de la cola)' },
];
export const OPCIONES_RADIADOR: { k: SitioRadiador; n: string }[] = [
  { k: 'toma', n: 'Detrás de la toma de aire' }, { k: 'delante', n: 'Delante, en el morro' }, { k: 'lateral', n: 'A los lados, detrás de las branquias' },
];
export const OPCIONES_MOTOR: { k: SitioMotor; n: string }[] = [{ k: 'detras', n: 'Detrás (junto a la rueda trasera)' }, { k: 'delante', n: 'Delante (en el morro)' }];

/** The cooling's fields of a design, each clamped to its slider (an unknown option or a wrong type: the default). */
export function camposRefrigeracion(P: object): CamposRefrigeracion {
  const Q = P as Record<string, unknown>, o = { ...REFRIGERACION_DEFECTO } as Record<string, unknown>;
  for (const [k, , min, max] of FILAS_REFRIGERACION) { const v = Q[k]; if (typeof v === 'number' && Number.isFinite(v)) o[k] = Math.min(max, Math.max(min, v)); }
  if (OPCIONES_TOMA.some(x => x.k === Q.tToma)) o.tToma = Q.tToma;
  if (OPCIONES_RADIADOR.some(x => x.k === Q.tRad)) o.tRad = Q.tRad;
  if (OPCIONES_MOTOR.some(x => x.k === Q.tMotorPos)) o.tMotorPos = Q.tMotorPos;
  return o as unknown as CamposRefrigeracion;
}

export type V3 = [number, number, number];
export type P2 = [number, number];
/** A box (m), axis-aligned. */
export interface Caja3 { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }
/** One nose mouth: its outline seen from the front (z, y), and its centre. */
export interface Boca { contorno: P2[]; c: P2; ancho: number; alto: number; area: number }
/** One gill slot (right side; the left is its mirror): its outline seen from the side (x, y). */
export interface Ranura { contorno: P2[]; area: number }
/** One radiator core: its centre, its face's normal (unit), width (across the air), height, thickness. */
export interface Radiador { c: V3; n: V3; ancho: number; alto: number; grueso: number; lado: 'centro' | 'der' | 'izq' }
export interface Refrigeracion {
  campos: CamposRefrigeracion;
  toma: TomaAire;
  bocas: Boca[];
  ranuras: Ranura[];
  /** Where the radiator is, as built (the choice «behind the intake» resolved). */
  sitio: 'delante' | 'lateral';
  radiadores: Radiador[];
  /** The two lines of coolant (each a polyline, m): from the engine to the radiator(s) (hot) and back (cold). */
  tubos: { caliente: V3[][]; fria: V3[][]; d: number; largo: number };
  /** The intake's total open area (m², both sides together) and the radiator's face (m²). */
  areaToma: number; areaRadiador: number;
  /** Heat (kW): what the engine gives its coolant at full power, and what the radiator takes out on a slow, hot climb. */
  calor: { motor: number; radiador: number; vCara: number };
  /** ΔCdA of the cooling air (m²): literature, not the tunnel. */
  dCdA: number;
  holguras: { bocas: number; radiador: number; tubos: number; choques: { con: string; holgura: number }[]; radiadorTrasToma: boolean };
}

/** How far (m) a point is inside the skin, by the side (negative: outside). As `medidas.ts` `dentroDe`, without its import. */
function dentro(F: FormaBala, x: number, y: number, z: number): number {
  const zb = F.ladoZ(x, y); if (!Number.isFinite(zb)) return -0.05;
  const s = F.seccionRapida(x); let yb = Infinity, yt = -Infinity;
  for (let j = 1; j < s.length; j += 2) { yb = Math.min(yb, s[j]); yt = Math.max(yt, s[j]); }
  return Math.min(zb - Math.abs(z), y - yb, yt - y);
}
const caja = (r: Radiador): Caja3 => {
  // (an axis-aligned box round the core: good enough for vertical faces along x or z)
  const ax = Math.abs(r.n[0]) > 0.5;
  return ax ? { x0: r.c[0] - r.grueso / 2, x1: r.c[0] + r.grueso / 2, y0: r.c[1] - r.alto / 2, y1: r.c[1] + r.alto / 2, z0: r.c[2] - r.ancho / 2, z1: r.c[2] + r.ancho / 2 }
    : { x0: r.c[0] - r.ancho / 2, x1: r.c[0] + r.ancho / 2, y0: r.c[1] - r.alto / 2, y1: r.c[1] + r.alto / 2, z0: r.c[2] - r.grueso / 2, z1: r.c[2] + r.grueso / 2 };
};
const esquinas = (c: Caja3): V3[] => { const o: V3[] = []; for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [c.z0, c.z1]) o.push([x, y, z]); return o; };
const sep = (a: Caja3, b: Caja3) => Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1, b.z0 - a.z1, a.z0 - b.z1);

/** A rounded rectangle (centre, half sizes, corner radius) as a closed outline, counter-clockwise. */
export function rectRedondo(cx: number, cy: number, hx: number, hy: number, r: number, n = 6): P2[] {
  r = Math.max(0, Math.min(r, hx, hy));
  const o: P2[] = [], esq: [number, number, number][] = [[cx + hx - r, cy + hy - r, 0], [cx - hx + r, cy + hy - r, Math.PI / 2], [cx - hx + r, cy - hy + r, Math.PI], [cx + hx - r, cy - hy + r, 1.5 * Math.PI]];
  for (const [x, y, a0] of esq) for (let k = 0; k <= n; k++) { const a = a0 + (Math.PI / 2) * k / n; o.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
  return o;
}
/** Area of a closed outline (shoelace). */
export const areaContorno = (c: P2[]) => { let a = 0; for (let i = 0; i < c.length; i++) { const p = c[i], q = c[(i + 1) % c.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
/** Is (u, v) inside the closed outline? */
export function enContorno(c: P2[], u: number, v: number): boolean {
  let d = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) { const [xi, yi] = c[i], [xj, yj] = c[j]; if ((yi > v) !== (yj > v) && u < (xj - xi) * (v - yi) / (yj - yi) + xi) d = !d; }
  return d;
}

const CACHE = new WeakMap<object, Refrigeracion | null>();
/** The cooling of this Triciclo, or null (no hybrid, or «Ninguna» and nothing to cool… see below). Memoised per model. */
export function refrigeracionDe(m: ModeloTriciclo): Refrigeracion | null {
  if (CACHE.has(m)) return CACHE.get(m)!;
  const r = calcular(m); CACHE.set(m, r); return r;
}

function calcular(m: ModeloTriciclo): Refrigeracion | null {
  if (!m.phev) return null;
  const C = camposRefrigeracion(m.P);
  // «Ninguna»: the model as it always was (no radiator, no pipes, no masses): saved designs do not change
  if (C.tToma === 'ninguna') return null;
  const F = m.F, cm = (v: number) => v / 100;
  // ── the intake
  const bocas: Boca[] = [], ranuras: Ranura[] = [];
  let hBocas = 9;
  if (C.tToma === 'morro1' || C.tToma === 'morro2') {
    const w = cm(C.tTomaAncho), h = cm(C.tTomaAlto), yc = F.puntas.morro + cm(C.tTomaY), r = (h / 2) * C.tTomaRadio / 100;
    const zs = C.tToma === 'morro1' ? [0] : [cm(C.tTomaSep), -cm(C.tTomaSep)];
    for (const zc of zs) {
      const contorno = rectRedondo(zc, yc, w / 2, h / 2, Math.min(r, w / 2));
      bocas.push({ contorno, c: [zc, yc], ancho: w, alto: h, area: areaContorno(contorno) });
      // every point of the outline (and 1 cm round it, the bezel) must be on the nose seen from the front
      for (const [z, y] of contorno) { const x = F.frenteX(z * 1.08, yc + (y - yc) * 1.15); hBocas = Math.min(hBocas, Number.isFinite(x) ? 0.01 : -0.01); }
    }
  } else {
    // gills: N slanted slots across the zone, each 55 % of its share, leaning back 18° (as a shark's)
    const n = Math.round(C.tBranqN), L = cm(C.tBranqLargo), H = cm(C.tBranqAlto), xFin = m.xR + cm(C.tBranqX), yc = cm(C.tBranqY) + m.elevar;
    const paso = L / n, anchoR = paso * 0.55, inc = Math.tan(18 * Math.PI / 180) * H / 2;
    for (let i = 0; i < n; i++) {
      const xc = xFin + paso * (i + 0.5), rr = anchoR / 2;
      // a parallelogram with rounded ends: its top leans back (−x)
      const pts: P2[] = [];
      for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; pts.push([xc - inc + rr * Math.cos(a), yc + H / 2 - rr + rr * Math.sin(a)]); }
      for (let k = 0; k <= 8; k++) { const a = Math.PI + Math.PI * k / 8; pts.push([xc + inc + rr * Math.cos(a), yc - H / 2 + rr + rr * Math.sin(a)]); }
      ranuras.push({ contorno: pts, area: areaContorno(pts) });
      for (const [x, y] of pts) { const z = F.ladoZ(x, y); hBocas = Math.min(hBocas, Number.isFinite(z) && z > 0.12 ? 0.01 : -0.01); }
    }
  }
  const areaToma = bocas.reduce((a, b) => a + b.area, 0) + 2 * ranuras.reduce((a, b) => a + b.area, 0);
  // ── the radiator
  const sitio: 'delante' | 'lateral' = C.tRad === 'toma' ? (C.tToma === 'branquias' ? 'lateral' : 'delante') : C.tRad;
  const A = C.tRadArea / 100, grueso = 0.045, radiadores: Radiador[] = [];
  const disp = m.phev.disp, mot = disp.motor;
  const cajaMotor: Caja3 = { x0: Math.min(mot.x0, mot.carter.x0), x1: Math.max(mot.x1, mot.carter.x1), y0: mot.y0, y1: mot.yTop, z0: mot.carter.z0 - 0.15, z1: mot.carter.z1 };
  const obst: { con: string; c: Caja3 }[] = [{ con: 'el motor de gasolina', c: cajaMotor }, { con: 'el depósito', c: { ...disp.deposito } }];
  for (const b of m.baterias) obst.push({ con: 'la batería', c: { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, z0: -b.hz, z1: b.hz } });
  if (m.rombo) obst.push({ con: 'la rueda del morro y su recorrido', c: { x0: -m.rR - 0.04, x1: m.rR + 0.04, y0: 0, y1: 2 * m.rR + 0.08, z0: -0.09, z1: 0.09 } });
  let hRad = 9;
  if (sitio === 'delante') {
    // behind the mouth(s): one core for one mouth (or none: the nose's centre), a half core behind each of two mouths;
    // as far forward as fits 1 cm inside the skin, searched back from the mouth
    const centros: P2[] = bocas.length ? bocas.map(b => b.c) : [[0, F.puntas.morro - 0.05]];
    const n = centros.length, alto = Math.sqrt(A / n / (n === 1 ? 1.5 : 1.0)), ancho = A / n / alto;
    for (const [zc, yc] of centros) {
      const xBoca = F.frenteX(zc, yc), x0 = Number.isFinite(xBoca) ? xBoca - 0.06 - grueso / 2 : F.X_MORRO - 0.15;
      let mejor = { x: x0, h: -9 };
      for (let x = x0; x > x0 - 0.9; x -= 0.01) {
        const r: Radiador = { c: [x, yc, zc], n: [1, 0, 0], ancho, alto, grueso, lado: n === 1 ? 'centro' : zc > 0 ? 'der' : 'izq' };
        const h = Math.min(...esquinas(caja(r)).map(p => dentro(F, ...p)));
        if (h > mejor.h + 1e-6) mejor = { x, h };
        if (h >= 0.01) break;
      }
      const r: Radiador = { c: [mejor.x, yc, zc], n: [1, 0, 0], ancho, alto, grueso, lado: n === 1 ? 'centro' : zc > 0 ? 'der' : 'izq' };
      radiadores.push(r); hRad = Math.min(hRad, mejor.h);
    }
  } else {
    // one half behind each side's gills (or, without gills, where they would be), its face along the skin, as far out as
    // keeps its outer corners 1,5 cm inside
    const L = cm(C.tBranqLargo), xFin = m.xR + cm(C.tBranqX), yc = cm(C.tBranqY) + m.elevar;
    const largo = Math.max(L, Math.sqrt(A / 2 * 1.4)), alto = A / 2 / largo, xc = xFin + L / 2;
    for (const s of [1, -1] as const) {
      let zOut = 9;
      for (const x of [xc - largo / 2, xc, xc + largo / 2]) for (const y of [yc - alto / 2, yc, yc + alto / 2]) { const z = F.ladoZ(x, y); zOut = Math.min(zOut, Number.isFinite(z) ? z : 0); }
      const zc = s * (zOut - 0.025 - grueso / 2);
      const r: Radiador = { c: [xc, yc, zc], n: [0, 0, s], ancho: largo, alto, grueso, lado: s > 0 ? 'der' : 'izq' };
      radiadores.push(r); hRad = Math.min(hRad, ...esquinas(caja(r)).map(p => dentro(F, ...p)), Math.abs(zc) - grueso / 2 - 0.05);
    }
  }
  const choques: { con: string; holgura: number }[] = [];
  for (const o of obst) { const h = Math.min(...radiadores.map(r => sep(caja(r), o.c))); if (h < 0.02) choques.push({ con: o.con, holgura: h }); }
  // ── the pipes: from the engine's face towards the radiator(s), low along the floor beside the rails, and up to each core
  const d = C.tTuboD / 1000, zm = (mot.carter.z0 + mot.carter.z1) / 2;
  const xRad = radiadores.reduce((a, r) => a + r.c[0], 0) / radiadores.length, haciaDelante = xRad > (mot.x0 + mot.x1) / 2;
  const xCara = haciaDelante ? Math.max(mot.x1, mot.carter.x1) + 0.03 : Math.min(mot.x0, mot.carter.x0) - 0.03;
  const yBajo = m.yPiso + 0.05;
  const linea = (caliente: boolean): V3[][] => {
    const zLado = caliente ? 0.20 : 0.25, yMotor = caliente ? mot.yTop - 0.06 : mot.y0 + 0.05;
    const inicio: V3 = [xCara, yMotor, zm + (caliente ? 0.03 : -0.03)];
    return radiadores.map(r => {
      const s = r.lado === 'izq' ? -1 : 1, zRun = s * zLado;
      // the core's port: top (hot) or bottom (cold), on its back face, at the side nearest the engine
      const atras = r.n.map(v => -v) as V3, yPuerto = r.c[1] + (caliente ? 1 : -1) * (r.alto / 2 - 0.02);
      const puerto: V3 = Math.abs(r.n[0]) > 0.5
        ? [r.c[0] + atras[0] * (r.grueso / 2 + 0.03), yPuerto, r.c[2] + (r.ancho / 2 - 0.03) * (r.lado === 'izq' ? 1 : -1) * (r.lado === 'centro' ? 0 : 1)]
        : [r.c[0] + (haciaDelante ? -1 : 1) * (r.ancho / 2 - 0.04), yPuerto, r.c[2] + atras[2] * (r.grueso / 2 + 0.03)];
      const p: V3[] = [inicio, [inicio[0] + (haciaDelante ? 0.08 : -0.08), yBajo, zRun], [puerto[0] + (haciaDelante ? -0.10 : 0.10), yBajo, zRun], [puerto[0], puerto[1], puerto[2]]];
      // (a side radiator: the run comes out to its back face)
      if (Math.abs(r.n[2]) > 0.5) p.splice(3, 0, [puerto[0] + (haciaDelante ? -0.04 : 0.04), yPuerto, puerto[2]]);
      return p;
    });
  };
  const caliente = linea(true), fria = linea(false);
  const largoDe = (l: V3[]) => l.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - l[i][0], p[1] - l[i][1], p[2] - l[i][2]), 0);
  const largo = [...caliente, ...fria].reduce((a, l) => a + largoDe(l), 0);
  let hTubos = 9;
  for (const l of [...caliente, ...fria]) for (let i = 1; i < l.length - 1; i++) hTubos = Math.min(hTubos, dentro(F, ...l[i]) - d / 2);
  // ── heat and flow (estimates: see the head of this file)
  const kW = m.phev.kW, motor = kW * 0.25 / Math.max(0.2, m.phev.rendTerm);
  const vClimb = 40 / 3.6, vCara = Math.max(3, 0.5 * vClimb * Math.min(1, areaToma / Math.max(1e-6, A)));
  const radiador = 0.5 * 1.15 * vCara * A * 1005 * 70 / 1000;
  return {
    campos: C, toma: C.tToma, bocas, ranuras, sitio, radiadores,
    tubos: { caliente, fria, d, largo },
    areaToma, areaRadiador: A,
    calor: { motor, radiador, vCara },
    dCdA: 0.5 * areaToma,
    holguras: { bocas: hBocas, radiador: hRad, tubos: hTubos, choques, radiadorTrasToma: (sitio === 'delante') === (C.tToma !== 'branquias') },
  };
}

/** ΔCdA (m²) the cooling air adds to the consumption: 0 without an intake (literature, not the tunnel). */
export const dCdARefrigeracion = (m: ModeloTriciclo) => refrigeracionDe(m)?.dCdA ?? 0;

/** The cooling's parts for the parts list (names start «Motor: …», so `grupoPieza` sends them to Motor). */
export function piezasRefrigeracion(m: ModeloTriciclo): PiezaMasa[] {
  // (and, with the engine in the nose, its shaft back to the rear wheel's sprocket: a Ø 40 × 2 mm steel tube, ≈ 1,9 kg/m,
  // and its two joints, 1 kg: an estimate)
  const a = m.phev?.disp.arbol ?? null;
  const arbol: PiezaMasa[] = a ? (() => { const L = a.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - a[i][0], p[1] - a[i][1], p[2] - a[i][2]), 0); return [{ nombre: 'Motor: árbol de transmisión (motor delante)', kg: 1.9 * L + 1, x: (a[0][0] + a[a.length - 1][0]) / 2, y: (a[0][1] + a[a.length - 1][1]) / 2, z: a[0][2], nota: `${Math.round(L * 10) / 10} m de tubo de acero con sus dos juntas` }]; })() : [];
  const r = refrigeracionDe(m); if (!r) return arbol;
  const A = r.areaRadiador * 100, n = r.radiadores.length;
  const cRad = (k: 0 | 1 | 2) => r.radiadores.reduce((a, q) => a + q.c[k], 0) / n;
  const todos = [...r.tubos.caliente, ...r.tubos.fria].flat(), cTubo = (k: 0 | 1 | 2) => todos.reduce((a, p) => a + p[k], 0) / todos.length;
  const dmm = r.tubos.d * 1000, litrosTubo = Math.PI * (r.tubos.d / 2) ** 2 * r.tubos.largo * 1000;
  const litros = 0.6 * A / 10 + 1 + 0.04 * m.phev!.kW + litrosTubo;
  const mot = m.phev!.disp.centros.motor;
  const nConductos = r.toma === 'morro2' ? 2 : r.toma === 'branquias' ? 2 : 1;
  const xToma = r.bocas.length ? r.radiadores[0].c[0] + 0.06 : cRad(0), yToma = cRad(1);
  return [
    { nombre: `Motor: radiador${n > 1 ? `es (${n})` : ''}`, kg: 0.25 * A + 0.4 * n, x: cRad(0), y: cRad(1), z: cRad(2), nota: `${Math.round(A * 10) / 10} dm² de cara, aluminio` },
    { nombre: 'Motor: ventilador del radiador', kg: 0.6 + 0.12 * A, x: cRad(0), y: cRad(1), z: cRad(2) },
    { nombre: 'Motor: tubos de refrigeración', kg: 0.012 * dmm * r.tubos.largo, x: cTubo(0), y: cTubo(1), z: cTubo(2), nota: `${Math.round(r.tubos.largo * 10) / 10} m de manguito de ${Math.round(dmm)} mm, ida y vuelta` },
    { nombre: 'Motor: refrigerante', kg: 1.07 * litros, x: (mot[0] + cRad(0)) / 2, y: (mot[1] + cRad(1)) / 2, nota: `${Math.round(litros * 10) / 10} L de anticongelante` },
    { nombre: `Motor: conductos de la toma de aire`, kg: 0.25 * nConductos, x: xToma, y: yToma },
    ...arbol,
  ];
}

/** The cooling's checks: [name, slack, minimum, what to show]. With «Ninguna» and a hybrid, one that says it has none. */
export function comprobacionesRefrigeracion(m: ModeloTriciclo): { nombre: string; holgura: number; minimo: number; mostrar?: string }[] {
  const r = refrigeracionDe(m); if (!r) return [];
  const f1 = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const cmT = (v: number) => `${f1(Math.abs(v) * 100)} cm`;
  const o = [
    { nombre: 'Refrigeración: el radiador saca el calor del motor a plena potencia, subiendo despacio un día de calor (estimación)', holgura: (r.calor.radiador - r.calor.motor) / r.calor.motor, minimo: 0, mostrar: `${f1(r.calor.radiador)} de ${f1(r.calor.motor)} kW` },
    { nombre: 'Refrigeración: boca de al menos el 25 % de la cara del radiador (Hucho)', holgura: r.areaToma / r.areaRadiador - 0.25, minimo: 0, mostrar: `${Math.round(r.areaToma / r.areaRadiador * 100)} %` },
    { nombre: r.bocas.length ? 'Refrigeración: la boca cabe en el morro' : 'Refrigeración: las branquias caben en el costado', holgura: r.holguras.bocas, minimo: 0 },
    { nombre: 'Refrigeración: radiador dentro de la carrocería', holgura: r.holguras.radiador, minimo: 0.01, mostrar: r.holguras.radiador < 0.01 ? `asoma ${cmT(r.holguras.radiador - 0.01)}` : undefined },
    { nombre: 'Refrigeración: tubos de refrigerante dentro de la carrocería', holgura: r.holguras.tubos, minimo: 0.005 },
    { nombre: 'Refrigeración: el radiador está detrás de su toma de aire', holgura: r.holguras.radiadorTrasToma ? 1 : -1, minimo: 0, mostrar: r.holguras.radiadorTrasToma ? undefined : 'le haría falta un conducto largo' },
  ];
  for (const c of r.holguras.choques) o.push({ nombre: `Refrigeración: radiador a ${c.con}`, holgura: c.holgura, minimo: 0.02, mostrar: c.holgura < 0 ? `choca ${cmT(c.holgura)}` : undefined });
  return o;
}
