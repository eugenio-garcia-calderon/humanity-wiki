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
export function rendimientoHibrido(arq: ArqHibrido, mec: number, elec: number, caja: number): number {
  if (arq === 'serie') return elec;
  if (arq === 'paralelo') return caja;
  return mec * REND_PLANETARIO + (1 - mec) * elec;
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
  caja: { a: [number, number]; ra: number; b: [number, number]; rb: number; z0: number; z1: number; nombre: string } | null;
  /** The chain: from the output sprocket to the wheel's (or the differential's), in the plane z. */
  cadena: { a: [number, number]; ra: number; b: [number, number]; rb: number; z: number } | null;
  /** Four wheels: the differential on the rear axle and its half-shafts out to the pods. */
  diferencial: { c: V3; r: number; zSemieje: number } | null;
  /** Series: the high-voltage cable from the generator to the controller. */
  cable: V3[] | null;
  deposito: CajaZ;
  /** The exhaust: the headers from each port, the silencer (a cylinder along x) and the tailpipe's end. */
  escape: { colectores: V3[][]; silencioso: { x0: number; x1: number; y: number; z: number; r: number }; salida: number };
  holguras: { motor: number; transmision: number; deposito: number; escape: number; torreta: number | null; respaldo: number | null };
  centros: { motor: [number, number]; transmision: [number, number]; deposito: [number, number] };
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

export interface EntradaHibrido {
  F: FormaBala; arq: ArqHibrido; kW: number; litros: number;
  xR: number; rR: number; yEje: number; recTras: number; cuatro: boolean; viaTras: number;
  pivote: [number, number]; torreta: [number, number];
  /** The backrest's front limit at height y (x), the last seat's: the engine stands behind it. */
  respaldo: (y: number) => number;
  /** Boxes already there (battery, controller): the engine sits above whichever it overlaps. */
  cajas: { x0: number; x1: number; y0: number; y1: number; hz: number }[];
  yPiso: number; inversor: { x0: number; x1: number; y0: number; y1: number };
}

/**
 * Where the hybrid's parts go and how big they are. The engine stands across the car (its crank along z) in the
 * boot: with the wheel in the tail, between the last backrest and the rear shock tower, above the controller; with
 * two rear wheels in pods, behind the frame's tower, where the tail is empty. Its connection hangs off its left end
 * (−z), and the chain runs on that side of the rear wheel; the exhaust on the right (+z) to the tail. The tank rides
 * over the rear wheel (or over the differential). Nothing is moved to make room: what does not fit, the checks say.
 */
export function disponerHibrido(e: EntradaHibrido): DisposicionHibrido {
  const { F, arq, kW } = e;
  // ── the engine's size from its power: 24 cc per kW, square bore and stroke; one cylinder up to 12 kW, two up to 32, then three
  const n = kW <= 12 ? 1 : kW <= 32 ? 2 : 3, cc = CC_POR_KW * kW, bore = Math.cbrt(4 * cc / n / Math.PI) / 100;
  const W = n * (bore + 0.02) + 0.07, D = Math.max(0.17, 2.3 * bore + 0.02);
  const hC = 0.06 + 1.3 * bore, hB = 1.5 * bore + 0.02, hH = 0.045 + 0.45 * bore, hA = 0.05;
  const H = hC + hB + hH + hA;
  const z0 = -0.085, z1 = z0 + W;
  // ── where: along x first (it decides what it stands on)
  let x1: number, x0: number;
  if (!e.cuatro) { x1 = e.respaldo(0.75) - 0.02; x0 = x1 - D; }
  else { x1 = e.pivote[0] - 0.15; x0 = x1 - D; }
  // and in height: on the floor, above the swing arm's pivot and whatever box it overlaps
  let y0 = Math.max(e.yPiso + 0.01, e.pivote[1] + 0.04);
  for (const c of e.cajas) if (c.x1 > x0 && c.x0 < x1 && c.hz > z0 && -c.hz < z1) y0 = Math.max(y0, c.y1 + 0.015);
  // (with two rear wheels, at least at the axle's height: the clutch and the P2 hang off its side, and the tail's floor curves up)
  if (e.cuatro) y0 = Math.max(y0, e.yEje);
  // (with the wheel in the tail, recompute the backrest at the engine's real top: it leans back as it rises)
  if (!e.cuatro) { x1 = Math.min(x1, e.respaldo(y0 + H) - 0.02); x0 = x1 - D; for (const c of e.cajas) if (c.x1 > x0 && c.x0 < x1) y0 = Math.max(y0, c.y1 + 0.015); }
  const yTop = y0 + H, xc = (x0 + x1) / 2, yc = y0 + hC * 0.45;
  const dB = bore + 0.045, dH = bore + 0.06;
  const carter: CajaZ = { x0, x1, y0, y1: y0 + hC, z0, z1 };
  const bloque: CajaZ = { x0: xc - dB / 2, x1: xc + dB / 2, y0: y0 + hC, y1: y0 + hC + hB, z0: z0 + 0.025, z1: z1 - 0.025 };
  const culata: CajaZ = { x0: xc - dH / 2, x1: xc + dH / 2, y0: bloque.y1, y1: bloque.y1 + hH, z0: z0 + 0.015, z1: z1 - 0.015 };
  const admision: CajaZ = { x0: xc - dH / 2 + 0.01, x1: xc + dH / 2 - 0.01, y0: culata.y1 + 0.02, y1: yTop, z0: z0 + 0.04, z1: z1 - 0.04 };
  const zm = (z0 + z1) / 2, cilindrosZ = Array.from({ length: n }, (_, i) => zm + (i - (n - 1) / 2) * (bore + 0.02));

  // ── the connection, on the crank axis at the engine's left end
  const ejes: CilZ[] = [];
  let caja: DisposicionHibrido['caja'] = null, cadena: DisposicionHibrido['cadena'] = null, diferencial: DisposicionHibrido['diferencial'] = null, cable: V3[] | null = null;
  const zCadena = z0 - 0.035;
  // the output sprocket: at the swing arm's pivot (the chain keeps its length as the arm swings), or, with two rear
  // wheels, low at the engine's rear, chained back to a differential on the rear axle
  const salida: [number, number] = e.cuatro ? [x0 + 0.05, y0 + 0.05] : [e.pivote[0], e.pivote[1]];
  const rueda: [number, number] = [e.xR, e.yEje];
  if (arq === 'reparto') {
    ejes.push({ nombre: 'planetario', x: xc, y: yc, r: 0.10, z0: z0 - 0.07, z1: z0 });
    ejes.push({ nombre: 'MG1', x: xc, y: yc, r: 0.085, z0: z0 - 0.15, z1: z0 - 0.07 });
    caja = { a: [xc, yc], ra: 0.06, b: salida, rb: 0.05, z0: z0 - 0.062, z1: z0 - 0.008, nombre: 'salida de la corona' };
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
    if (!e.cuatro) cadena = { a: salida, ra: 0.045, b: rueda, rb: 0.10, z: zCadena };
    else {
      cadena = { a: salida, ra: 0.045, b: rueda, rb: 0.09, z: zCadena };
      diferencial = { c: [e.xR, e.yEje, 0], r: 0.08, zSemieje: e.viaTras / 2 - 0.07 };
    }
  }

  // ── the tank: over the rear wheel and its travel (or over the differential), as far forward as the engine lets it.
  // Its shape is searched: the shortest box, 8–20 cm tall, as wide as the body there allows (3 cm in from the skin),
  // that holds the litres; if none does, the biggest is drawn at the litres asked for, and its check turns red
  const V = e.litros / 1000, yT0 = e.cuatro ? e.yEje + 0.13 : e.yEje + e.rR + e.recTras + 0.03, xT1 = x0 - 0.03;
  const mitad = (xa: number, xb: number, ya: number, yb: number) => { let mn = 9; for (let x = xb; x >= xa - 1e-9; x -= 0.02) for (const y of [ya, (ya + yb) / 2, yb]) { const z = F.ladoZ(x, y); mn = Math.min(mn, Number.isFinite(z) ? z : 0); } return mn; };
  let deposito: CajaZ | null = null;
  busca: for (let L = 0.15; L <= 0.80 + 1e-9; L += 0.01) for (let h = 0.08; h <= 0.20 + 1e-9; h += 0.01) {
    const w = Math.min(0.6, 2 * (mitad(xT1 - L, xT1, yT0, yT0 + h) - 0.03)); if (w < 0.12 || L * w * h * 0.92 < V) continue;
    const ww = V / (L * h * 0.92), c: CajaZ = { x0: xT1 - L, x1: xT1, y0: yT0, y1: yT0 + h, z0: -ww / 2, z1: ww / 2 };
    if (cajaH(F, c) >= 0.01) { deposito = c; break busca; }
  }
  if (!deposito) { const L = 0.5, h = 0.16, w = V / (L * h * 0.92); deposito = { x0: xT1 - L, x1: xT1, y0: yT0, y1: yT0 + h, z0: -w / 2, z1: w / 2 }; }
  const w = deposito.z1 - deposito.z0;

  // ── the exhaust: a header from each port on the head's rear face, down to a silencer on the right of the rear wheel
  // (where it fits: on the right, clear of the wheel and the swing arm (of the half-shafts with four wheels), searched
  // from the outside in and from low up; if nowhere, the first place, and its check turns red)
  const rS = 0.05, xS1 = Math.min(e.xR + 0.22, x0 - 0.06), xS0 = xS1 - 0.30;
  let zS = 0.17, yS = e.yEje + 0.07;
  sitio: for (const z of e.cuatro ? [0.17, 0.15, 0.13, 0.11, 0.09] : [0.17, 0.16, 0.15, 0.14]) for (const y of [e.yEje + 0.07, e.yEje + 0.1, e.yEje + 0.13, e.yEje + 0.16]) {
    let hh = 9; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; for (const x of [xS0, xS1]) hh = Math.min(hh, dentroPielH(F, x, y + rS * Math.sin(a), z + rS * Math.cos(a))); }
    if (hh >= 0.01) { zS = z; yS = y; break sitio; }
  }
  let salidaX = xS0; while (salidaX > F.X_COLA && F.dentroPiel(salidaX, yS, zS)) salidaX -= 0.01;
  const yPuerto = culata.y0 + 0.35 * hH;
  const colectores = cilindrosZ.map(z => [[culata.x0, yPuerto, z], [culata.x0 - 0.06, yPuerto - 0.02, z + 0.02], [x0 - 0.06, (yPuerto + yS) / 2, (z + zS) / 2 + 0.02], [xS1 + 0.02, yS, zS]] as V3[]);

  // ── checks
  const tr = [...ejes.map(c => cilH(F, c)), ...(caja ? [cilH(F, { nombre: '', x: caja.a[0], y: caja.a[1], r: caja.ra, z0: caja.z0, z1: caja.z1 }), cilH(F, { nombre: '', x: caja.b[0], y: caja.b[1], r: caja.rb, z0: caja.z0, z1: caja.z1 })] : [])];
  const holguras = {
    motor: Math.min(cajaH(F, carter), cajaH(F, culata), cajaH(F, admision)),
    transmision: tr.length ? Math.min(...tr) : 9,
    deposito: cajaH(F, deposito),
    escape: (() => { let hh = 9; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; for (const x of [xS0, xS1]) hh = Math.min(hh, dentroPielH(F, x, yS + rS * Math.sin(a), zS + rS * Math.cos(a))); } return hh; })(),
    // the wheel in the tail: the rear shock's top mount is right behind the engine (a part outside the box above)
    torreta: e.cuatro ? null : x0 - (e.torreta[0] + 0.035),
    respaldo: e.cuatro ? null : e.respaldo(yTop) - x1,
  };
  const transmision: [number, number] = ejes.length ? [ejes.reduce((a, c) => a + c.x, 0) / ejes.length, ejes.reduce((a, c) => a + c.y, 0) / ejes.length] : [xc, yc];
  const ocupa = [
    { x0, x1, y0, y1: yTop, z: Math.max(Math.abs(z0), Math.abs(z1)) },
    ...ejes.map(c => ({ x0: c.x - c.r, x1: c.x + c.r, y0: c.y - c.r, y1: c.y + c.r, z: Math.abs(c.z0) })),
    { x0: deposito.x0, x1: deposito.x1, y0: deposito.y0, y1: deposito.y1, z: w / 2 },
  ];
  return {
    arq, motor: { n, bore, cc, xc, yc, z0, z1, x0, x1, y0, yTop, carter, bloque, culata, admision, cilindrosZ },
    ejes, caja, cadena, diferencial, cable, deposito,
    escape: { colectores, silencioso: { x0: xS0, x1: xS1, y: yS, z: zS, r: rS }, salida: salidaX },
    holguras, centros: { motor: [xc, y0 + 0.42 * H], transmision, deposito: [(deposito.x0 + deposito.x1) / 2, (deposito.y0 + deposito.y1) / 2] }, ocupa,
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
