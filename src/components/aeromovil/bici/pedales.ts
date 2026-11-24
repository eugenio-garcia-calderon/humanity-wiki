// The bicycle block's own fields and what they do (2026-11-24): the bicycle brake and suspension chosen from the
// catalogue, and THE PEDALS: a crankset at the driver's feet that turns a generator, never a chain («vamos a trabajar
// siempre con chainless electric pedaling», Eugenio). Pure (no three.js): the 3D is `../visor/bici.ts`, the panel
// `../BiciTriciclo.tsx`, the catalogue `./catalogo.ts`.
//
// The fields live HERE, not in `triciclo/campos.ts` (as the cooling's, `triciclo/refrigeracion.ts`): optional on a
// design, read from the model's `P` (crearModeloTriciclo keeps every key of the design in `m.P`) and clamped to
// `FILAS_BICI`. A design saved before has none and reads `BICI_DEFECTO` (no pedals, running gear sized by its load):
// it builds, weighs and consumes exactly as before. Only `tClase` is a Triciclo field (the sliders' ranges read it).
//
// The pedalling, in one line: the legs give `tPedW` watts at the cranks; the generator turns `tPedRend` % of them into
// electricity on the battery's bus; from there they are the battery's own watts (the motor and its controller take
// their 85 %, as always). Nothing reaches the wheels by a chain. So pedalling does not move the vehicle by itself: it
// lowers what the battery gives, and at the speed where the generator covers everything the battery is not touched.
import type { ModeloTriciclo } from '../triciclo/modelo';
import type { PiezaMasa } from '../triciclo/masas';
import { dentroDe } from '../triciclo/medidas';
import type { FormaBala } from '../garaje/balaForma';
import { esBici } from './clase';
import { claseRueda } from '../ruedas/catalogo';
import { A_MEDIDA, FRENOS_BICI, GENERADORES_PEDAL, SUSPENSIONES_BICI, frenoBici, generadorPedal, suspensionBici } from './catalogo';

export interface CamposBici {
  /** the brake at every wheel: a bicycle one from the catalogue, or 'medida' (sized by the load, as before) */
  tBiciFreno: string;
  /** the suspension at every corner: a bicycle one from the catalogue, or 'medida' */
  tBiciSusp: string;
  /** pedals for the driver, turning a generator */
  tPedales: 'no' | 'si';
  /** the pedal generator: one from the catalogue, or 'medida' (the sliders) */
  tPedGen: string;
  /** what the driver's legs give, sustained (W) */
  tPedW: number;
  /** the generator and its rectifier: electricity out over legs in (%) */
  tPedRend: number;
  /** the generator with its cranks and pedals (kg), when no catalogue one is chosen */
  tPedKg: number;
  /** crank length (mm) */
  tPedBiela: number;
  /** the crank axle moved from where the drawn feet put it: forward and up (mm) */
  tPedX: number; tPedY: number;
}
export type ClaveBici = keyof CamposBici;
export type ClaveNumBici = 'tPedW' | 'tPedRend' | 'tPedKg' | 'tPedBiela' | 'tPedX' | 'tPedY';

export const BICI_DEFECTO: CamposBici = { tBiciFreno: A_MEDIDA, tBiciSusp: A_MEDIDA, tPedales: 'no', tPedGen: A_MEDIDA, tPedW: 100, tPedRend: 82, tPedKg: 4.5, tPedBiela: 165, tPedX: 0, tPedY: 0 };
/** What the bicycle proposal sets (with `clase.ts` `VALORES_BICI`): hydraulic discs, an air shock a corner, the driver pedalling a Cixi generator. */
export const BICI_PROPUESTA: Partial<CamposBici> = { tBiciFreno: 'discoHidraulico', tBiciSusp: 'aireMonarch', tPedales: 'si', tPedGen: 'cixi', tPedW: 100, tPedRend: 82, tPedBiela: 165 };

/** [key, label, min, max, step, unit] */
export const FILAS_BICI: [ClaveNumBici, string, number, number, number, string][] = [
  ['tPedW', 'Lo que dan las piernas del conductor, de continuo', 40, 300, 5, 'W'],
  ['tPedRend', 'Generador: electricidad que saca de lo que recibe', 55, 92, 1, '%'],
  ['tPedKg', 'Generador, bielas y pedales', 2.5, 7, 0.1, 'kg'],
  ['tPedBiela', 'Largo de las bielas', 140, 175, 5, 'mm'],
  ['tPedX', 'Eje de los pedales: hacia delante', -100, 150, 10, 'mm'],
  ['tPedY', 'Eje de los pedales: hacia arriba', -100, 250, 10, 'mm'],
];
export const OPCIONES_PEDALES = [{ k: 'no', n: 'Sin pedales' }, { k: 'si', n: 'Pedales del conductor, sin cadena: mueven un generador' }];
/** Cranks and pedals (kg) added to a catalogue generator, whose published mass does not say whether it carries them. An estimate. */
export const BIELAS_Y_PEDALES = 0.9;

export function camposBici(P: object): CamposBici {
  const Q = P as Record<string, unknown>, o = { ...BICI_DEFECTO } as Record<string, unknown>;
  for (const [k, , min, max] of FILAS_BICI) { const v = Q[k]; if (typeof v === 'number' && Number.isFinite(v)) o[k] = Math.min(max, Math.max(min, v)); }
  if (Q.tPedales === 'si') o.tPedales = 'si';
  if (FRENOS_BICI.some(x => x.id === Q.tBiciFreno)) o.tBiciFreno = Q.tBiciFreno;
  if (SUSPENSIONES_BICI.some(x => x.id === Q.tBiciSusp)) o.tBiciSusp = Q.tBiciSusp;
  if (GENERADORES_PEDAL.some(x => x.id === Q.tPedGen)) o.tPedGen = Q.tPedGen;
  return o as unknown as CamposBici;
}

/** The bicycle brake and suspension chosen for this design, or null («a medida»). */
export const piezasRodajeBici = (P: object) => { const C = camposBici(P); return { freno: frenoBici(C.tBiciFreno), suspension: suspensionBici(C.tBiciSusp) }; };

// ------------------------------------------------------------------ the pedals: where they go
/** From the ankle to the pedal's axle with the foot on it (m): the ball of the foot, ahead of and a little above the ankle of a rider sitting back. */
const TOBILLO_A_PEDAL: [number, number] = [0.10, 0.04];
/** A shoe round the pedal's axle (m): how far its toe and heel reach from it, and how far out its outer edge is. */
const ZAPATO = 0.10, MEDIO_ZAPATO = 0.05;
/** The generator's housing round the crank axle (m): radius and width across the car. An estimate of a unit of its class. */
const GENERADOR = { r: 0.075, ancho: 0.11 };

export interface Pedales {
  /** the crank axle (bottom bracket), on the centre line */
  eje: [number, number];
  /** crank length (m) and each pedal's distance from the centre line (m) */
  biela: number; z: number;
  generador: { r: number; ancho: number };
  /** what the unit weighs (kg) and how that figure is made (Spanish: it is shown) */
  kg: number; masa: string;
  /** legs (W), the generator's efficiency (0–1) and the electricity it gives (W) */
  W: number; rend: number; electricos: number;
  /** the catalogue generator, or null (sliders) */
  gen: ReturnType<typeof generadorPedal>;
  /** the least room between the feet going round and the skin (m; negative: they go through it) */
  holgura: number;
  /** the same for the knees, a fist's radius round each: to the skin, and to the steering wheel's rim (null: no steering wheel, or the knees pass outside it) */
  rodillaPiel: number; rodillaVolante: number | null;
  /** what the leg still has to stretch with the pedal at its farthest (m; negative: the foot does not reach it) */
  alcance: number;
}

/** The knee as a ball (m): its radius, for its room to the skin and to the steering wheel. */
const RODILLA = 0.06;
/**
 * The driver's crankset, or null without pedals. It stands where the driver's feet already are in this layout: the
 * drawn leg is the leg at its longest, so the drawn foot is on the pedal at the FRONT of its circle and the crank axle
 * is one crank behind it. Round the circle the foot comes back and the knee rises (hip fixed, thigh and shin of the
 * drawn rider's lengths): the room is measured all the way round, both feet with their shoes and both knees.
 */
export function pedalesDe(m: { P: object; F: FormaBala; plazas: { piloto: boolean; pts: { H: [number, number]; K: [number, number]; F: [number, number]; anchoPiernas?: number[] } }[]; volante?: { c: [number, number]; r: number; inc: number } | null }): Pedales | null {
  const C = camposBici(m.P);
  if (C.tPedales !== 'si') return null;
  const piloto = m.plazas.find(q => q.piloto) ?? m.plazas[0];
  if (!piloto) return null;
  const { H, K, F } = piloto.pts, ap = piloto.pts.anchoPiernas, biela = C.tPedBiela / 1000;
  // the feet's spread of this layout, kept within what a crankset allows (its pedals 9 to 16 cm from the centre)
  const z = Math.min(0.16, Math.max(0.09, ap ? ap[1] : 0.11)), zRodilla = ap ? ap[ap.length > 2 ? 2 : 0] : 0.15;
  const eje: [number, number] = [F[0] + TOBILLO_A_PEDAL[0] - biela + C.tPedX / 1000, F[1] + TOBILLO_A_PEDAL[1] + C.tPedY / 1000];
  const muslo = Math.hypot(K[0] - H[0], K[1] - H[1]), tibia = Math.hypot(F[0] - K[0], F[1] - K[1]);
  // the steering wheel's rim where the knees pass (aroVolante: a circle tilted `inc` from the vertical, its top forward)
  const v = m.volante, aro: [number, number][] = [];
  if (v && zRodilla < v.r) { const s = Math.sqrt(v.r * v.r - zRodilla * zRodilla), up = [Math.sin(v.inc), Math.cos(v.inc)]; aro.push([v.c[0] + up[0] * s, v.c[1] + up[1] * s], [v.c[0] - up[0] * s, v.c[1] - up[1] * s]); }
  let holgura = Infinity, rodillaPiel = Infinity, rodillaVolante = Infinity, alcance = Infinity;
  for (let i = 0; i < 24; i++) {
    const a = 2 * Math.PI * i / 24, px = eje[0] + biela * Math.cos(a), py = eje[1] + biela * Math.sin(a);
    // the shoe on that pedal: toe up and heel down along the foot of a rider sitting back, and its outer edge
    for (const [dx, dy] of [[0, ZAPATO], [0, -ZAPATO], [ZAPATO * 0.6, 0]] as const) holgura = Math.min(holgura, dentroDe(m.F, px + dx, py + dy, z + MEDIO_ZAPATO));
    // the knee for that foot: hip fixed, the two segments' lengths kept, bending upwards
    const tx = px - TOBILLO_A_PEDAL[0], ty = py - TOBILLO_A_PEDAL[1], d = Math.min(muslo + tibia - 1e-6, Math.hypot(tx - H[0], ty - H[1]));
    alcance = Math.min(alcance, muslo + tibia - Math.hypot(tx - H[0], ty - H[1]));
    const u = (muslo * muslo - tibia * tibia + d * d) / (2 * d), h = Math.sqrt(Math.max(0, muslo * muslo - u * u)), ex = (tx - H[0]) / Math.hypot(tx - H[0], ty - H[1]), ey = (ty - H[1]) / Math.hypot(tx - H[0], ty - H[1]);
    // (the hip is behind the foot: «up» is the normal with a positive y)
    const nx = -ey, ny = ex, sg = ny >= 0 ? 1 : -1, kx = H[0] + ex * u + sg * nx * h, ky = H[1] + ey * u + sg * ny * h;
    for (const [dx, dy] of [[0, RODILLA], [RODILLA, 0]] as const) rodillaPiel = Math.min(rodillaPiel, dentroDe(m.F, kx + dx, ky + dy, zRodilla + RODILLA));
    for (const [ax, ay] of aro) rodillaVolante = Math.min(rodillaVolante, Math.hypot(kx - ax, ky - ay) - RODILLA - 0.015);
  }
  const gen = generadorPedal(C.tPedGen);
  const kg = gen ? gen.kg + BIELAS_Y_PEDALES : C.tPedKg;
  const masa = gen ? `${gen.masa}; más bielas y pedales (≈ ${BIELAS_Y_PEDALES.toLocaleString('es-ES')} kg, estimado)` : 'el deslizador «Generador, bielas y pedales»';
  return { eje, biela, z, generador: GENERADOR, kg, masa, W: C.tPedW, rend: C.tPedRend / 100, electricos: C.tPedW * C.tPedRend / 100, gen, holgura, rodillaPiel, rodillaVolante: aro.length ? rodillaVolante : null, alcance };
}

// ------------------------------------------------------------------ masses
/** The pedal unit in the parts list (none without pedals). */
export function piezasPedales(m: ModeloTriciclo): PiezaMasa[] {
  const p = m.pedalesBici;
  return p ? [{ nombre: 'Pedales: generador, bielas y pedales', kg: p.kg, x: p.eje[0], y: p.eje[1], nota: `pedaleo sin cadena: ${p.masa}` }] : [];
}

// ------------------------------------------------------------------ energy
export interface Pedaleo {
  /** legs at the cranks and electricity on the bus (W) */
  W: number; electricos: number;
  /** the share of what the vehicle asks at the speed of calculation that the legs cover (0–1) */
  parte: number;
  /** consumption from the battery while pedalling (Wh/km) and the range it gives (km; Infinity when the legs cover it all) */
  WhKm: number; autonomia: number;
  /** the speed the legs alone sustain, the battery untouched (km/h) */
  vSolo: number;
}
/** `potencia(v)`: what the vehicle draws from the battery's bus at v (m/s), motor losses and equipment included. */
export function pedaleo(p: Pedales | null, potencia: (v: number) => number, kmh: number, utilWh: number): Pedaleo | null {
  if (!p) return null;
  const v = kmh / 3.6, pide = potencia(v), neto = Math.max(0, pide - p.electricos), WhKm = neto / v / 3.6;
  // the speed where the vehicle asks exactly what the generator gives (the draw grows with speed: bisection)
  let a = 0.3, b = 60;
  if (potencia(a) >= p.electricos) b = a; else for (let i = 0; i < 50; i++) { const c = (a + b) / 2; if (potencia(c) < p.electricos) a = c; else b = c; }
  return { W: p.W, electricos: p.electricos, parte: Math.min(1, p.electricos / pide), WhKm, autonomia: WhKm > 1e-6 ? utilWh / WhKm : Infinity, vSolo: b * 3.6 };
}

// ------------------------------------------------------------------ checks
export interface ComprobacionBici { dep: 'rodaje' | 'propulsion' | 'interior'; nombre: string; holgura: number; minimo: number; mostrar?: string }
/**
 * The bicycle block's checks. `cargas`: the static load on the most loaded front and rear wheel (kg), everyone on
 * board and the luggage (`triciclo/masas.ts` `cargasRueda`); `masa`, the whole of it.
 */
export function comprobacionesBici(m: ModeloTriciclo, cargas: { del: number; tras: number; masa: number }): ComprobacionBici[] {
  const o: ComprobacionBici[] = [], p = m.pedalesBici;
  if (p) {
    o.push({ dep: 'interior', nombre: 'Pedales: la vuelta entera de los pies dentro de la carrocería', holgura: p.holgura, minimo: 0.01 });
    o.push({ dep: 'interior', nombre: 'Pedales: las rodillas del conductor dentro de la carrocería, en toda la vuelta', holgura: p.rodillaPiel, minimo: 0.01 });
    o.push({ dep: 'interior', nombre: 'Pedales: la pierna del conductor llega al pedal más lejano sin estirarse del todo', holgura: p.alcance, minimo: 0.02 });
    if (p.rodillaVolante != null) o.push({ dep: 'interior', nombre: 'Pedales: las rodillas del conductor al volante, en toda la vuelta', holgura: p.rodillaVolante, minimo: 0.01 });
  }
  // (the rim's limit only with bicycle wheels on: a bicycle-class vehicle may still roll on moped or car wheels)
  if (esBici(m.campos) && (claseRueda(m.campos.tRuedaDel) === 'bici' || claseRueda(m.campos.tRuedaTras) === 'bici')) {
    // a bicycle rim's own limit: the cargo rim of the catalogue, a Ryde Andra 40, takes an «axle load» of 120 kg at most
    // (sjscycles.co.uk); on a bicycle an axle is one wheel
    const rueda = Math.max(cargas.del, cargas.tras);
    o.push({ dep: 'rodaje', nombre: 'Llantas de bicicleta: carga por rueda (una llanta de carga, Ryde Andra 40, admite 120 kg)', holgura: (120 - rueda) / 120, minimo: 0, mostrar: `${Math.round(rueda)} de 120 kg` });
  }
  return o;
}
