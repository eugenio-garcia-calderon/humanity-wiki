// ============================================================================
// THE PLUG-IN HYBRID'S ARCHITECTURE AND ITS PARTS (2026-11-16, Eugenio)
// ============================================================================
// Eugenio: «que aparezca también más información del engranaje planetario y las
// opciones que hay para conectar el motor híbrido y el eléctrico. Y también que
// se dibuje en 3D el motor de gasolina y las opciones que hay para conectarlo al
// sistema planetario».
//
// Three real ways of joining a petrol engine to this car's electric drive (the
// hub motor in the rear wheel, or one in each rear wheel with four wheels):
//   · power split ('reparto'), Toyota's THS (Prius): engine on the planet carrier,
//     generator MG1 on the sun, the ring to the wheels (here by a chain to the
//     rear wheel; the hub motor plays MG2, on the same wheel);
//   · series ('serie'), BMW i3 REx / Nissan e-Power: the engine only turns a
//     generator; the wheels are always driven by the electric motor;
//   · parallel P2: engine → clutch → a motor-generator → a gearbox → the wheel.
// P4 (engine on one axle, electric on the other) is left out on purpose: the
// front wheels steer inside pods on faired arms (or the nose wheel steers), and a
// driveshaft out to them is not something this body can carry. The explanation
// (explicaciones/triciclo.ts, `tHibArq`) says so.
//
// Pure (no three.js): the model (geometriaTriciclo.ts) calls `disponerHibrido`,
// the viewer draws what it returns (hibrido3d.ts), and the energy figures read
// `rendimientoHibrido` and `cifrasHibrido`. Every number here is an estimate for a
// first design, not a measurement.

import type { FormaBala } from './garaje/balaForma';
import { techoEn } from './garaje/balaMedidas';

export type ArqHibrido = 'reparto' | 'serie' | 'paralelo';
export const ARQUITECTURAS_HIBRIDO: { k: ArqHibrido; n: string }[] = [
  { k: 'reparto', n: 'Reparto con engranaje planetario (Toyota Prius)' },
  { k: 'serie', n: 'En serie: la gasolina solo mueve un generador (BMW i3 REx, Nissan e-Power)' },
  { k: 'paralelo', n: 'En paralelo P2: embrague, motor-generador y caja de cambios' },
];
/** The planetary path's efficiency (gear mesh and chain to the wheel): fixed, it hardly varies. */
export const REND_PLANETARIO = 0.97;
/**
 * 2026-11-17 (Eugenio: «haz que el motor eléctrico del aeromóvil S no esté en el buje de la rueda, sino que esté junto al
 * motor de gasolina y que se conecte al engranaje planetario»). Where the traction motor (MG2) goes with the power split:
 * in the rear wheel's hub (until now: the hub motor plays MG2), or central, on the planetary's ring next to the engine, as
 * in Toyota's THS: engine → carrier, MG1 → sun, MG2 and the output → ring, and from the ring the same drop case and chain
 * (and, with two rear wheels, the differential) to the wheels. Only the power split has it; series and P2 keep the hub.
 */
export type PosMG2 = 'buje' | 'planetario';
export const POSICIONES_MG2: { k: PosMG2; n: string }[] = [
  { k: 'buje', n: 'En el buje de la rueda trasera (hace de MG2)' },
  { k: 'planetario', n: 'Central, junto al motor de gasolina, unido a la corona del planetario (MG2, como el Prius)' },
];
/**
 * From the ring to the wheel: the drop case and the chain (and the differential with two rear wheels), ≈ 97 %. A central
 * MG2 drives through it; a hub motor does not. Estimate (a roller chain 97–98 %, a spur gear pair 98–99 %).
 */
export const REND_SALIDA = 0.97;
/**
 * A central MG2's size from its mass and peak power (m): radius 7 cm plus 1 mm per kW (EMRAX 208: Ø 208 mm for 68 kW
 * peak; Motenergy ME1616: Ø 206 mm), and as long as its mass needs at ≈ 4,200 kg/m³ of envelope (EMRAX 208: 9.4 kg in
 * Ø 208 × 85 mm, 3,250 kg/m³; a radial-flux motor of this class is denser). Estimates.
 */
export function medidasMG2(kg: number, kWPico: number): { r: number; largo: number } {
  const r = Math.min(0.12, Math.max(0.08, 0.07 + 0.001 * kWPico));
  return { r, largo: Math.min(0.25, Math.max(0.06, kg / (4200 * Math.PI * r * r))) };
}
/** The Prius's power-split gear: 78 teeth on the ring, 30 on the sun. */
export const DIENTES_PLANETARIO = { corona: 78, sol: 30 };
export const RAZON_PLANETARIO = DIENTES_PLANETARIO.corona / DIENTES_PLANETARIO.sol;
/** The chain from the ring (or the gearbox) is chosen so the ring turns this at 100 km/h, whatever the wheel. */
export const CORONA_A_100 = 3000;
/** Parallel: the engine's rpm at 100 km/h in top gear. */
export const MOTOR_A_100_PARALELO = 2800;
/** Above this a small petrol engine of this class does not turn. */
export const RPM_MAX_MOTOR = 6000;
/** cc per kW of a modern naturally-aspirated Atkinson engine (the Prius's 1.8 L gives 72 kW: 25 cc/kW). */
const CC_POR_KW = 24;

/**
 * The share of the engine's power that reaches the wheels, by architecture.
 * `mec`: power split, the share that goes straight through the planetary (0–1); `elec`: the electrical path
 * (generator, two inverters, motor; 0–1); `caja`: parallel, gearbox and chain (0–1).
 */
export function rendimientoHibrido(arq: ArqHibrido, mec: number, elec: number, caja: number, mg2Central = false): number {
  if (arq === 'serie') return elec;
  if (arq === 'paralelo') return caja;
  // (2026-11-17: with MG2 central, on the ring, the electrical share also goes through the drop case and the chain)
  return mec * REND_PLANETARIO + (1 - mec) * elec * (mg2Central ? REND_SALIDA : 1);
}
/**
 * A design saved before 2026-11-16 had one slider, «Conversión mecánica» (`tRendTrans`, 75–97 %): it opens as a power
 * split whose mechanical share and electrical path give back exactly that efficiency (scripts/triciclo-disenos.ts).
 */
export function migrarRendTrans(rendTrans: number): { mec: number; elec: number } {
  const r = Math.min(0.97, Math.max(0.75, rendTrans / 100));
  if (r >= 0.83 + 0.14 * 0.2) return { mec: (r - 0.83) / 0.14 * 100, elec: 83 };
  return { mec: 20, elec: (r - 0.2 * REND_PLANETARIO) / 0.8 * 100 };
}

/** Parallel: the engine is tied to the wheels; at part load it runs off its best point (an approximate curve). */
export const factorCargaParcial = (carga: number) => Math.min(1, 0.75 + 0.5 * Math.max(0, carga));

export type V3 = [number, number, number];
/** A cylinder along z (axis at x, y), from z0 to z1. */
export interface CilZ { nombre: string; x: number; y: number; r: number; z0: number; z1: number }
export interface CajaZ { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }
export interface DisposicionHibrido {
  arq: ArqHibrido;
  /** The engine: cylinders, bore, its crank axis, and its boxes from the bottom up. */
  motor: {
    n: number; bore: number; cc: number; xc: number; yc: number; z0: number; z1: number; x0: number; x1: number; y0: number; yTop: number;
    carter: CajaZ; bloque: CajaZ; culata: CajaZ; admision: CajaZ; cilindrosZ: number[];
  };
  /** The connection: the parts on the crank axis (planetary and MG1, generator, clutch and P2), the drop case or gearbox, the chain. */
  ejes: CilZ[];
  /** 2026-11-17: the central traction motor (MG2) on the planetary's ring, outboard of it on the same axis; null: in the hub. */
  mg2: CilZ | null;
  caja: { a: [number, number]; ra: number; b: [number, number]; rb: number; z0: number; z1: number; nombre: string } | null;
  /** The chain: from the output sprocket to the wheel's (or the differential's), in the plane z. */
  cadena: { a: [number, number]; ra: number; b: [number, number]; rb: number; z: number } | null;
  /** Four wheels: the differential on the rear axle and its half-shafts out to the pods. */
  diferencial: { c: V3; r: number; zSemieje: number } | null;
  /** Series: the high-voltage cable from the generator to the controller. */
  cable: V3[] | null;
  /** 2026-11-17 (capo): the engine in the nose: the shaft from its output back to the chain's sprocket; null behind. */
  arbol: V3[] | null;
  deposito: CajaZ;
  /** The exhaust: the headers from each port, the silencer (a cylinder along x) and the tailpipe's end. */
  escape: { colectores: V3[][]; silencioso: { x0: number; x1: number; y: number; z: number; r: number }; salida: number };
  holguras: { motor: number; transmision: number; deposito: number; escape: number; torreta: number | null; respaldo: number | null; choques: Choque[] };
  centros: { motor: [number, number]; transmision: [number, number]; deposito: [number, number] };
  /** 2026-11-17: each one's centre across the car (m, + to the right), for the centre of gravity's side. */
  centrosZ: { motor: number; transmision: number; deposito: number };
  /** 2026-11-17: where each went before the user's move (the engine's crankcase back and bottom; the tank's back, bottom and centre across). */
  porDefecto: { motor: V3; deposito: V3 };
  /** What the boot loses (symmetric boxes for `volumenMaletero`). */
  ocupa: { x0: number; x1: number; y0: number; y1: number; z: number }[];
}

/** How far (m) a point is inside the skin (negative: outside); as `dentroDe` in geometriaTriciclo.ts. */
export function dentroPielH(F: FormaBala, x: number, y: number, z: number): number {
  const zb = F.ladoZ(x, y); if (!Number.isFinite(zb)) return -0.05;
  if (y < techoEn(F, x) && y > 0) { const s = F.seccionRapida(x); let yb = Infinity; for (let j = 1; j < s.length; j += 2) yb = Math.min(yb, s[j]); if (y < yb) return y - yb; }
  return zb - Math.abs(z);
}
const cajaH = (F: FormaBala, c: CajaZ) => { let h = 9; for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [c.z0, c.z1]) h = Math.min(h, dentroPielH(F, x, y, z)); return h; };
const cilH = (F: FormaBala, c: CilZ) => { let h = 9; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; for (const z of [c.z0, c.z1]) h = Math.min(h, dentroPielH(F, c.x + c.r * Math.cos(a), c.y + c.r * Math.sin(a), z)); } return h; };

/** What a part must keep clear of (2026-11-17): one or more boxes (a slanted tube, as a row of small boxes along it). */
export interface Obstaculo { nombre: string; cajas: CajaZ[] }
/** A tube from a to b (radius r) as `n` small boxes along it, for `Obstaculo`. */
export function tuboCajas(a: V3, b: V3, r: number, n = 8): CajaZ[] {
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t; return { x0: x - r, x1: x + r, y0: y - r, y1: y + r, z0: z - r, z1: z + r }; });
}
/** A seat and the person on it: from its backrest (`atras(y)`, it leans back as it rises) forward to the toes, from under its cushion up. */
export interface ZonaAsiento { nombre: string; atras: (y: number) => number; delante: number; y0: number; y1?: number; z0: number; z1: number }
/** One clearance of the engine or the tank to something around it (m; negative: they overlap that much). */
export interface Choque { pieza: 'motor' | 'deposito'; con: string; holgura: number; minimo: number }

export interface EntradaHibrido {
  F: FormaBala; arq: ArqHibrido; kW: number; litros: number;
  xR: number; rR: number; yEje: number; recTras: number; cuatro: boolean; viaTras: number;
  pivote: [number, number]; torreta: [number, number];
  /** The backrest's front limit at height y (x), the last seat's: the engine stands behind it. */
  respaldo: (y: number) => number;
  /** Boxes already there (battery, controller): the engine sits above whichever it overlaps. */
  cajas: { x0: number; x1: number; y0: number; y1: number; hz: number; nombre?: string }[];
  yPiso: number; inversor: { x0: number; x1: number; y0: number; y1: number };
  // ── 2026-11-17 (masas; Eugenio: «haz que el motor por defecto esté mucho más cerca de la rueda trasera y más abajo… y que
  // el depósito también se pueda colocar de manera libre, también haz que el motor se pueda colocar de manera libre»)
  /** Every seat with its occupant (all rows): neither the engine nor the tank may enter one. */
  asientos?: ZonaAsiento[];
  /** Fixed things to keep clear of: the tail wheel with its travel, the rear shock and its tower (or the frame's tower). */
  obstaculos?: Obstaculo[];
  /** The swing arm (one wheel in the tail): from its pivot to the axle, which rises `rec` at full bump; legs at ±z. */
  brazo?: { pivote: [number, number]; eje: [number, number]; rec: number; z: number } | null;
  /** The user's move of each from where it goes by default (m: forward, up, to the right): `tMot…`, `tDep…`. */
  mover?: { motor: V3; deposito: V3 };
  /** 2026-11-17: the power split's MG2 central, on the ring (its mass and peak power size it); absent or null: in the hub. */
  mg2?: { kg: number; kWPico: number } | null;
  /**
   * 2026-11-17 (capo; Eugenio: «que el motor se pueda colocar atrás o delante»): the engine in the nose, between `xMin`
   * (ahead of the pilot's toes) and `xMax` (the nose's front), clear of `obstaculos` (the nose wheel…). Its drive goes
   * back to the rear wheel by a shaft along the floor (`arbol`); the tank stays behind the seats; the exhaust runs
   * under the floor to the tail. Absent: behind, as always.
   */
  delante?: { xMin: number; xMax: number; obstaculos: Obstaculo[] } | null;
}

/** The gap between two boxes (m): positive, how far apart along the axis that separates them; negative, how deep they overlap. */
export function separacion(a: CajaZ, b: CajaZ): number {
  return Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1, b.z0 - a.z1, a.z0 - b.z1);
}
/** A box against a seat zone: the backrest at the box's top (the furthest back it reaches there). */
export function separacionAsiento(a: CajaZ, s: ZonaAsiento): number {
  return separacion(a, { x0: s.atras(Math.min(a.y1, 1.6)), x1: s.delante, y0: s.y0, y1: s.y1 ?? 2, z0: s.z0, z1: s.z1 });
}
/** A box above the swing arm at full bump (its legs ±z, 3.5 cm of tube above its line): the height between them (9: not over it). */
export function sobreBrazo(a: CajaZ, b: NonNullable<EntradaHibrido['brazo']>): number {
  const xa = Math.max(a.x0, b.eje[0]), xb = Math.min(a.x1, b.pivote[0]);
  if (xa > xb || a.z1 < -b.z - 0.025 || a.z0 > b.z + 0.025) return 9;
  const arriba = (x: number) => b.pivote[1] + (b.eje[1] + b.rec - b.pivote[1]) * (b.pivote[0] - x) / (b.pivote[0] - b.eje[0]) + 0.035;
  return a.y0 - Math.max(arriba(xa), arriba(xb));
}

/**
 * Where the hybrid's parts go and how big they are. The engine stands across the car (its crank along z).
 * 2026-11-17 (masas): by default as close to the rear wheel and as low as it fits: with the wheel in the tail, its back
 * right ahead of the rear shock and its tower (the swing arm and the wheel behind them), standing on the floor or on
 * whatever box is under it; with two rear wheels, right ahead of the differential, as low as the tail lets it. The
 * place is searched: rearmost and lowest first (1.5 cm of height cost as much as 1 cm of length), clear of the wheel and
 * its travel, the swing arm at full bump, the shock, every seat and the skin. Then the user's `mover` moves it freely,
 * and nothing more is corrected: what collides, the checks say (`choques`).
 * Its connection hangs off its left end (−z), and the chain runs on that side of the rear wheel; the exhaust on the
 * right (+z) to the tail. The tank, by default low on the floor right ahead of the engine (near the centre of gravity)
 * when it fits there, otherwise over the rear wheel (or over the differential), as before; then its own `mover`.
 */
export function disponerHibrido(e: EntradaHibrido): DisposicionHibrido {
  const { F, arq, kW } = e;
  const mover = e.mover ?? { motor: [0, 0, 0] as V3, deposito: [0, 0, 0] as V3 };
  const asientos = e.asientos ?? [], delante = e.delante ?? null, obst = delante ? delante.obstaculos : e.obstaculos ?? [], brazo = delante ? null : e.brazo ?? null;
  // ── the engine's size from its power: 24 cc per kW, square bore and stroke; one cylinder up to 12 kW, two up to 32, then three
  const n = kW <= 12 ? 1 : kW <= 32 ? 2 : 3, cc = CC_POR_KW * kW, bore = Math.cbrt(4 * cc / n / Math.PI) / 100;
  const W = n * (bore + 0.02) + 0.07, D = Math.max(0.17, 2.3 * bore + 0.02);
  const hC = 0.06 + 1.3 * bore, hB = 1.5 * bore + 0.02, hH = 0.045 + 0.45 * bore, hA = 0.05;
  const H = hC + hB + hH + hA;
  const dB = bore + 0.045, dH = bore + 0.06;
  // what hangs off its left end, by architecture: radius and how far out (the parts on the crank axis)
  // (2026-11-17: a central MG2 adds its length outboard of the planetary, 1 cm apart, and may be wider than it)
  const mg2 = arq === 'reparto' && e.mg2 ? medidasMG2(e.mg2.kg, e.mg2.kWPico) : null;
  const lado = arq === 'reparto' ? (mg2 ? { r: Math.max(0.10, mg2.r), fuera: 0.155 + mg2.largo } : { r: 0.10, fuera: 0.145 }) : arq === 'serie' ? { r: 0.095, fuera: 0.12 } : { r: 0.10, fuera: 0.17 };
  /** The engine's boxes and its connection's cylinders with its crankcase's back at x0, its bottom at y0, moved dz sideways. */
  const piezas = (x0: number, y0: number, dz: number) => {
    const x1 = x0 + D, xc = (x0 + x1) / 2, yc = y0 + hC * 0.45, z0 = -0.085 + dz, z1 = z0 + W;
    const carter: CajaZ = { x0, x1, y0, y1: y0 + hC, z0, z1 };
    const bloque: CajaZ = { x0: xc - dB / 2, x1: xc + dB / 2, y0: y0 + hC, y1: y0 + hC + hB, z0: z0 + 0.025, z1: z1 - 0.025 };
    const culata: CajaZ = { x0: xc - dH / 2, x1: xc + dH / 2, y0: bloque.y1, y1: bloque.y1 + hH, z0: z0 + 0.015, z1: z1 - 0.015 };
    const admision: CajaZ = { x0: xc - dH / 2 + 0.01, x1: xc + dH / 2 - 0.01, y0: culata.y1 + 0.02, y1: y0 + H, z0: z0 + 0.04, z1: z1 - 0.04 };
    // what it must keep clear of: its body, and the connection on its left (which hangs lower)
    const cuerpo: CajaZ = { x0, x1, y0, y1: y0 + H, z0, z1 }, conexion: CajaZ = { x0: xc - lado.r, x1: xc + lado.r, y0: yc - lado.r, y1: yc + lado.r, z0: z0 - lado.fuera, z1: z0 };
    const todo: CajaZ = { x0: Math.min(x0, conexion.x0), x1: Math.max(x1, conexion.x1), y0: Math.min(y0, conexion.y0), y1: y0 + H, z0: conexion.z0, z1 };
    return { x1, xc, yc, z0, z1, carter, bloque, culata, admision, todo, cajas: [cuerpo, conexion] };
  };
  const pielMotor = (p: ReturnType<typeof piezas>) => Math.min(cajaH(F, p.carter), cajaH(F, p.culata), cajaH(F, p.admision),
    cilH(F, { nombre: '', x: p.xc, y: p.yc, r: lado.r, z0: p.z0 - lado.fuera, z1: p.z0 }));
  /** Every clearance of a box (the engine's or the tank's) to what is around it. */
  const choquesDe = (cs: CajaZ[], pieza: 'motor' | 'deposito', conCajas: boolean): Choque[] => {
    const o: Choque[] = [], min = (f: (c: CajaZ) => number) => Math.min(...cs.map(f));
    for (const b of obst) o.push({ pieza, con: b.nombre, holgura: min(c => Math.min(...b.cajas.map(k => separacion(c, k)))), minimo: 0.01 });
    if (brazo) o.push({ pieza, con: 'el basculante, con la suspensión comprimida del todo', holgura: min(c => sobreBrazo(c, brazo)), minimo: 0.01 });
    if (asientos.length) o.push({ pieza, con: 'los asientos y quien va sentado', holgura: min(c => Math.min(...asientos.map(s => separacionAsiento(c, s)))), minimo: 0.01 });
    if (conCajas && e.cajas.length) o.push({ pieza, con: 'la batería y el controlador', holgura: min(c => Math.min(...e.cajas.map(b => separacion(c, { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, z0: -b.hz, z1: b.hz })))), minimo: 0 });
    return o;
  };
  /** What it stands on: the floor on the rails, or the top of a box (battery, controller) under its footprint. */
  // (the engine's connection hangs `cuelga` under its crankcase on its left: over a box, that is what rests on it)
  const cuelga = Math.max(0, lado.r - hC * 0.45);
  const apoyo = (x0: number, x1: number, z0: number, z1: number, motor = false) => {
    let y = e.yPiso + 0.01;
    for (const c of e.cajas) {
      if (c.x1 > x0 && c.x0 < x1 && c.hz > z0 && -c.hz < z1) y = Math.max(y, c.y1 + 0.015);
      const xc = (x0 + x1) / 2;
      if (motor && c.x1 > xc - lado.r && c.x0 < xc + lado.r && c.hz > z0 - lado.fuera && -c.hz < z0) y = Math.max(y, c.y1 + 0.015 + cuelga);
    }
    return y;
  };
  // (2026-11-17: with MG2 the engine and what hangs off its left are some 55 cm across: with two rear wheels (the chain goes
  // to the differential in the middle) the whole row is centred in the car by default, the engine moved right, so its left
  // end does not stick out of the narrowing tail. With the wheel in the tail the chain must run beside it: as before)
  const dz0 = mg2 && e.cuatro ? (lado.fuera - W) / 2 + 0.085 : 0;
  // ── where by default: the rearmost and lowest place that is clear of everything
  // (the rear limit: the tail wheel's travel, or the differential with two rear wheels; the front limit, where it went
  // until 2026-11-17: right behind the last backrest)
  const xAtras = e.cuatro ? e.xR + 0.08 + 0.03 : e.xR + e.rR + 0.05;
  let xDelante = e.cuatro ? e.pivote[0] - 0.15 - D : e.respaldo(0.75) - 0.02 - D;
  xDelante = Math.max(xDelante, xAtras + 0.6);
  // (2026-11-17, capo: where the tank goes when the engine is in the nose: the rear spot's front end, low)
  const xTrasMotor = xDelante + D;
  // (the engine in the nose: the search runs from the pilot's toes forward, the place nearest the cabin first)
  const xIni = delante ? delante.xMin : xAtras, xFin = delante ? Math.max(delante.xMin, delante.xMax - D) : xDelante;
  if (delante) xDelante = xFin;
  // (low before clean: it stands on what is under it and may rise at most 5 cm to clear something; if nothing in that band
  // is clear, it takes the place there that overlaps least, and the checks say by how much: an engine lifted 13 cm to
  // clear a tower tube by 1 cm is not what anyone asked for)
  let mejor: { x0: number; y0: number; coste: number } | null = null, menosMalo = { x0: xFin, y0: apoyo(xFin, xFin + D, -0.085 + dz0, W - 0.085 + dz0, true), peor: -9, coste: 9 };
  const yMin = e.yPiso + 0.01;
  for (let x0 = xIni; x0 <= xFin + 1e-9; x0 += 0.02) {
    const y00 = apoyo(x0, x0 + D, -0.085 + dz0, W - 0.085 + dz0, true);
    for (let y0 = y00; y0 <= y00 + 0.05 + 1e-9; y0 += 0.01) {
      const coste = (x0 - xIni) + 1.5 * (y0 - yMin);
      if (mejor && coste >= mejor.coste) break;
      const p = piezas(x0, y0, dz0);
      const hs = choquesDe(p.cajas, 'motor', false), peor = Math.min(9, pielMotor(p) - 0.01, ...hs.map(h => h.holgura - h.minimo));
      if (peor > menosMalo.peor + 1e-6 || (Math.abs(peor - menosMalo.peor) <= 1e-6 && coste < menosMalo.coste)) menosMalo = { x0, y0, peor, coste };
      if (peor >= 0) { mejor = { x0, y0, coste }; break; }
    }
  }
  const sitio = mejor ?? menosMalo;
  // the user's move (forward, up, to the right), on top of it: from here on, nothing is corrected
  const x0 = sitio.x0 + mover.motor[0], y0 = sitio.y0 + mover.motor[1], dzM = dz0 + mover.motor[2];
  const pm = piezas(x0, y0, dzM);
  const { x1, xc, yc, z0, z1, carter, bloque, culata, admision } = pm;
  const yTop = y0 + H;
  const zm = (z0 + z1) / 2, cilindrosZ = Array.from({ length: n }, (_, i) => zm + (i - (n - 1) / 2) * (bore + 0.02));

  // ── the connection, on the crank axis at the engine's left end
  const ejes: CilZ[] = [];
  let caja: DisposicionHibrido['caja'] = null, cadena: DisposicionHibrido['cadena'] = null, diferencial: DisposicionHibrido['diferencial'] = null, cable: V3[] | null = null, arbol: V3[] | null = null;
  const zCadena = z0 - 0.035;
  // the output sprocket: at the swing arm's pivot (the chain keeps its length as the arm swings), or, with two rear
  // wheels, low at the engine's rear, chained back to a differential on the rear axle
  const pinon: [number, number] = e.cuatro ? (delante ? [e.xR + 0.40, e.yEje + 0.05] : [x0 + 0.05, y0 + 0.05]) : [e.pivote[0], e.pivote[1]];
  // (in the nose, 2026-11-17: the drop case or gearbox comes down to a shaft low on the engine, which runs back along the
  // floor to that same sprocket)
  const salida: [number, number] = delante ? [xc - 0.02, y0 + 0.03] : pinon;
  if (delante && arq !== 'serie') arbol = [[salida[0], salida[1], zCadena], [salida[0] - 0.12, e.yPiso + 0.02, zCadena], [pinon[0] + 0.15, e.yPiso + 0.02, zCadena], [pinon[0], pinon[1], zCadena]];
  const rueda: [number, number] = [e.xR, e.yEje];
  if (arq === 'reparto') {
    // (MG1 against the engine, the crankshaft through its hollow rotor to the carrier, the planetary outermost: in the
    // 3D its see-through housing shows the gears face on. The ring drives the drop case back past MG1, on a sleeve)
    ejes.push({ nombre: 'MG1', x: xc, y: yc, r: 0.085, z0: z0 - 0.075, z1: z0 });
    ejes.push({ nombre: 'planetario', x: xc, y: yc, r: 0.10, z0: z0 - 0.145, z1: z0 - 0.075 });
    // (2026-11-17: MG2 outboard of the planetary on the same axis, its rotor on the ring's shaft, as in the Prius's transaxle)
    if (mg2) ejes.push({ nombre: 'MG2', x: xc, y: yc, r: mg2.r, z0: z0 - 0.155 - mg2.largo, z1: z0 - 0.155 });
    caja = { a: [xc, yc], ra: 0.06, b: salida, rb: 0.05, z0: z0 - 0.05, z1: z0 - 0.008, nombre: 'salida de la corona' };
  } else if (arq === 'serie') {
    ejes.push({ nombre: 'generador', x: xc, y: yc, r: 0.095, z0: z0 - 0.12, z1: z0 });
    const iv = e.inversor;
    cable = [[xc, yc + 0.06, z0 - 0.07], [xc - 0.02, (yc + iv.y1) / 2 + 0.05, z0 - 0.1], [(iv.x0 + iv.x1) / 2, iv.y1 + 0.02, -0.1]];
  } else {
    // (the gearbox's case against the engine, from the crank down to the output; the clutch and the P2 outboard on its
    // input shaft, as on a motorcycle's clutch: so the low end stays narrow where the body is)
    caja = { a: [xc, yc], ra: 0.095, b: salida, rb: 0.07, z0: z0 - 0.062, z1: z0 - 0.004, nombre: 'caja de cambios' };
    ejes.push({ nombre: 'embrague', x: xc, y: yc, r: 0.1, z0: z0 - 0.107, z1: z0 - 0.062 });
    ejes.push({ nombre: 'P2', x: xc, y: yc, r: 0.095, z0: z0 - 0.17, z1: z0 - 0.107 });
  }
  if (arq !== 'serie') {
    if (!e.cuatro) cadena = { a: pinon, ra: 0.045, b: rueda, rb: 0.10, z: zCadena };
    else {
      cadena = { a: pinon, ra: 0.045, b: rueda, rb: 0.09, z: zCadena };
      diferencial = { c: [e.xR, e.yEje, 0], r: 0.08, zSemieje: e.viaTras / 2 - 0.07 };
    }
  }

  // ── the tank. Its shape is searched: the shortest box, 8–20 cm tall, as wide as the body there allows (3 cm in from
  // the skin), that holds the litres. First, low on the floor right ahead of the engine (2026-11-17: near the centre of
  // gravity, clear of the seats); if it does not fit there, over the rear wheel and its travel (or over the
  // differential), as far forward as the engine lets it; if nowhere, the biggest is drawn at the litres asked for, and
  // its check turns red. Then the user's move.
  const V = e.litros / 1000;
  // (the body's half-width, remembered on a 5 mm grid while the search runs: the search asks for the same points many times)
  const anchos = new Map<number, number>();
  const ladoZ = (x: number, y: number) => { const k = Math.round(x * 200) * 4096 + Math.round(y * 200); let z = anchos.get(k); if (z === undefined) { z = F.ladoZ(Math.round(x * 200) / 200, Math.round(y * 200) / 200); anchos.set(k, z); } return z; };
  const mitad = (xa: number, xb: number, ya: number, yb: number) => { let mn = 9; for (let x = xb; x >= xa - 1e-9; x -= 0.02) for (const y of [ya, (ya + yb) / 2, yb]) { const z = ladoZ(x, y); mn = Math.min(mn, Number.isFinite(z) ? z : 0); } return mn; };
  const motorCajas = pm.cajas;
  const delanteM = !!e.delante;
  const buscar = (delante: boolean): CajaZ | null => {
    for (let L = 0.15; L <= 0.80 + 1e-9; L += 0.01) for (let h = 0.08; h <= 0.20 + 1e-9; h += 0.01) {
      let xa: number, xb: number, ya: number;
      if (delanteM) { xb = xTrasMotor; xa = xb - L; ya = apoyo(xa, xb, -0.15, 0.15); }
      else if (delante) { xa = x1 + 0.03; xb = xa + L; ya = apoyo(xa, xb, -0.15, 0.15); }
      else { xb = (delanteM ? xTrasMotor - D : x0) - 0.03; xa = xb - L; ya = e.cuatro ? e.yEje + 0.13 : e.yEje + e.rR + e.recTras + 0.03; }
      const w = Math.min(0.6, 2 * (mitad(xa, xb, ya, ya + h) - 0.03)); if (w < 0.12 || L * w * h * 0.92 < V) continue;
      const ww = V / (L * h * 0.92), c: CajaZ = { x0: xa, x1: xb, y0: ya, y1: ya + h, z0: -ww / 2, z1: ww / 2 };
      if (cajaH(F, c) < 0.01) continue;
      if ((delante || delanteM) && (Math.min(...motorCajas.map(k => separacion(c, k))) < 0.02 || choquesDe([c], 'deposito', true).some(k => k.holgura < k.minimo))) continue;
      return c;
    }
    return null;
  };
  let deposito = buscar(true) ?? buscar(false);
  const xTope = (delanteM ? xTrasMotor - D : x0) - 0.03;
  if (!deposito) { const L = 0.5, h = 0.16, w = V / (L * h * 0.92), yT0 = e.cuatro ? e.yEje + 0.13 : e.yEje + e.rR + e.recTras + 0.03; deposito = { x0: xTope - L, x1: xTope, y0: yT0, y1: yT0 + h, z0: -w / 2, z1: w / 2 }; }
  { const [dx, dy, dz] = mover.deposito; deposito = { x0: deposito.x0 + dx, x1: deposito.x1 + dx, y0: deposito.y0 + dy, y1: deposito.y1 + dy, z0: deposito.z0 + dz, z1: deposito.z1 + dz }; }
  const w = deposito.z1 - deposito.z0;

  // ── the exhaust: a header from each port on the head's rear face, down to a silencer on the right of the rear wheel
  // (where it fits: on the right, clear of the wheel and the swing arm (of the half-shafts with four wheels), searched
  // from the outside in and from low up; if nowhere, the first place, and its check turns red)
  const rS = 0.05, xS1 = delanteM ? e.xR + 0.22 : Math.min(e.xR + 0.22, x0 - 0.06), xS0 = xS1 - 0.30;
  let zS = 0.17, yS = e.yEje + 0.07;
  sitioS: for (const z of e.cuatro ? [0.17, 0.15, 0.13, 0.11, 0.09] : [0.17, 0.16, 0.15, 0.14]) for (const y of [e.yEje + 0.07, e.yEje + 0.1, e.yEje + 0.13, e.yEje + 0.16]) {
    let hh = 9; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; for (const x of [xS0, xS1]) hh = Math.min(hh, dentroPielH(F, x, y + rS * Math.sin(a), z + rS * Math.cos(a))); }
    if (hh >= 0.01) { zS = z; yS = y; break sitioS; }
  }
  let salidaX = xS0; while (salidaX > F.X_COLA && F.dentroPiel(salidaX, yS, zS)) salidaX -= 0.01;
  const yPuerto = culata.y0 + 0.35 * hH;
  const colectores = delanteM
    // (the engine in the nose: down behind it and back under the floor, on the right of the rails, to the silencer)
    ? cilindrosZ.map(z => [[culata.x0, yPuerto, z], [culata.x0 - 0.06, yPuerto - 0.02, z + 0.02], [x0 - 0.08, e.yPiso + 0.03, 0.17], [xS1 + 0.12, e.yPiso + 0.03, zS], [xS1 + 0.02, yS, zS]] as V3[])
    : cilindrosZ.map(z => [[culata.x0, yPuerto, z], [culata.x0 - 0.06, yPuerto - 0.02, z + 0.02], [x0 - 0.06, (yPuerto + yS) / 2, (z + zS) / 2 + 0.02], [xS1 + 0.02, yS, zS]] as V3[]);

  // ── checks
  const tr = [...ejes.map(c => cilH(F, c)), ...(caja ? [cilH(F, { nombre: '', x: caja.a[0], y: caja.a[1], r: caja.ra, z0: caja.z0, z1: caja.z1 }), cilH(F, { nombre: '', x: caja.b[0], y: caja.b[1], r: caja.rb, z0: caja.z0, z1: caja.z1 })] : [])];
  const choques = [...choquesDe(pm.cajas, 'motor', true), ...choquesDe([deposito], 'deposito', true),
    { pieza: 'deposito' as const, con: 'el motor de gasolina', holgura: Math.min(...pm.cajas.map(k => separacion(deposito, k))), minimo: 0.02 }];
  const asientoMotor = choques.find(k => k.pieza === 'motor' && k.con.startsWith('los asientos'));
  const torretaMotor = choques.find(k => k.pieza === 'motor' && /amortiguador|torreta/.test(k.con));
  const holguras = {
    motor: Math.min(cajaH(F, carter), cajaH(F, culata), cajaH(F, admision)),
    transmision: tr.length ? Math.min(...tr) : 9,
    deposito: cajaH(F, deposito),
    escape: (() => { let hh = 9; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; for (const x of [xS0, xS1]) hh = Math.min(hh, dentroPielH(F, x, yS + rS * Math.sin(a), zS + rS * Math.cos(a))); } return hh; })(),
    // (kept for the 3D's red: the rear shock's tower, and the seats)
    torreta: torretaMotor ? torretaMotor.holgura : null,
    respaldo: asientoMotor ? asientoMotor.holgura : null,
    choques,
  };
  // (the connection's own mass centre: MG2 is the electric motor's mass, counted where it is by the model)
  const ejesT = ejes.filter(c => c.nombre !== 'MG2');
  const transmision: [number, number] = ejesT.length ? [ejesT.reduce((a, c) => a + c.x, 0) / ejesT.length, ejesT.reduce((a, c) => a + c.y, 0) / ejesT.length] : [xc, yc];
  const ocupa = [
    { x0, x1, y0, y1: yTop, z: Math.max(Math.abs(z0), Math.abs(z1)) },
    ...ejes.map(c => ({ x0: c.x - c.r, x1: c.x + c.r, y0: c.y - c.r, y1: c.y + c.r, z: Math.abs(c.z0) })),
    { x0: deposito.x0, x1: deposito.x1, y0: deposito.y0, y1: deposito.y1, z: Math.max(Math.abs(deposito.z0), Math.abs(deposito.z1)) },
  ];
  return {
    arq, motor: { n, bore, cc, xc, yc, z0, z1, x0, x1, y0, yTop, carter, bloque, culata, admision, cilindrosZ },
    ejes, mg2: ejes.find(c => c.nombre === 'MG2') ?? null, caja, cadena, diferencial, cable, arbol, deposito,
    escape: { colectores, silencioso: { x0: xS0, x1: xS1, y: yS, z: zS, r: rS }, salida: salidaX },
    holguras, centros: { motor: [xc, y0 + 0.42 * H], transmision, deposito: [(deposito.x0 + deposito.x1) / 2, (deposito.y0 + deposito.y1) / 2] },
    centrosZ: { motor: (z0 + z1) / 2, transmision: ejesT.length ? ejesT.reduce((a, c) => a + (c.z0 + c.z1) / 2, 0) / ejesT.length : (z0 + z1) / 2, deposito: (deposito.z0 + deposito.z1) / 2 },
    porDefecto: { motor: [sitio.x0, sitio.y0, dz0], deposito: [deposito.x0 - mover.deposito[0], deposito.y0 - mover.deposito[1], (deposito.z0 + deposito.z1) / 2 - mover.deposito[2]] },
    ocupa,
  };
}

/**
 * The figures at one speed: the wheel's, the ring's, the engine's and the generator's rpm, by architecture.
 * `kmh` the speed, `dRueda` the driven wheel's diameter (m), `pMotorW` the power the engine has to give (W),
 * `kW` its maximum, `mec` the power split's mechanical share (0–1).
 */
export function cifrasHibrido(arq: ArqHibrido, kmh: number, dRueda: number, pMotorW: number, kW: number, mec: number) {
  const rpmRueda = (v: number) => v / 3.6 / (Math.PI * dRueda) * 60;
  const rueda = rpmRueda(kmh), cadena = CORONA_A_100 / rpmRueda(100);
  const R = DIENTES_PLANETARIO.corona, S = DIENTES_PLANETARIO.sol;
  const carga = pMotorW / (kW * 1000);
  if (arq === 'reparto') {
    // Willis: ω_corona·R + ω_sol·S = ω_portasatélites·(R + S). The mechanical share is (R/(R+S))·ω_corona/ω_portasatélites,
    // so the share chosen fixes the engine's speed for the ring's (the wheel's) speed
    const corona = rueda * cadena, motor = corona * R / ((R + S) * Math.max(0.05, mec)), sol = (motor * (R + S) - corona * R) / S;
    return { rueda, cadena, corona, motor, mg1: sol, carga, factor: 1 };
  }
  if (arq === 'serie') {
    // the engine turns where it burns least for the power asked of it, whatever the speed
    return { rueda, cadena: 0, corona: 0, motor: 1500 + 4000 * Math.min(1, carga), mg1: 0, carga, factor: 1 };
  }
  // parallel, in top gear: tied to the wheel
  const motor = MOTOR_A_100_PARALELO * kmh / 100;
  return { rueda, cadena: MOTOR_A_100_PARALELO / rpmRueda(100), corona: 0, motor, mg1: 0, carga, factor: factorCargaParcial(carga) };
}
