// ============================================================================
// The Triciclo / Cuadriciclo Bala's interior finish (2026-11-16, Eugenio)
// ============================================================================
// Eugenio: «Quiero que también el interior se pueda escoger… y quiero que el interior se diseñe en 3D y se pueda
// elegir con mucho detalle. Este sería la inspiración para el diseño interior a nivel de detalle y calidad visual
// con esos paneles que recubren el interior del chasis tubular» (a photo of the Cirrus Vision Jet's cabin: cognac
// leather seats with geometric contrast stitching and dark brown sides, a light suede headliner and side panels, a
// dark overhead console with spot lights, a centre armrest, dark trim lines with cupholders, belts).
//
// Pure (no three.js): the model and the masses read it, the wind tunnel's worker builds it with the model, and the
// 3D builder (garaje/balaInterior.ts) draws exactly the regions described here.
//
// Every option's default is what there was before (no lining, the grey quilted seats, nothing else), so a saved
// design opens exactly as it was, with the same masses.
//
// The lining follows the inside of the skin, addressed as the skin is, by (x, t) on its sections (balaForma.ts):
//  - the sides, from the floor up to the canopy glass's lower edge, from the windscreen's foot back to the canopy's
//    end (the doors' part rides on each door);
//  - the headliner, under the opaque roof (the solar panel and its frame), where there is one;
//  - the floor, on top of the frame's rails, from side to side, and a cover over the rear shock tower.
// Masses are estimates for parts of their class (sources in the comments), not weighed parts.

import { punto, tAbajo, tArriba, type FormaBala } from './garaje/balaForma';
import type { Ventanas } from './garaje/balaMedidas';
import { MONTANTE_B, type Puerta } from './garaje/balaPuertas';

export type Acabado = 'chasis' | 'paneles' | 'lujo';
export type Tapiz = 'serie' | 'cueroCognac' | 'cueroNegro' | 'alcantara' | 'tela';
export type Costura = 'no' | 'recta' | 'geometrica';
export type ColorCostura = 'crema' | 'naranja' | 'negro' | 'rojo' | 'gris';
export type ColorForro = 'crema' | 'gris' | 'negro' | 'blanco';
export type Moldura = 'carbono' | 'madera' | 'aluminio';
export type ConsolaTecho = 'no' | 'apagada' | 'encendida';
export type Cinturon = 'no' | 'negro' | 'gris' | 'marron' | 'rojo';
export type Ambiente = 'no' | 'blanca' | 'ambar' | 'azul';

type Opcion<K extends string> = { k: K; n: string };
export const ACABADOS: Opcion<Acabado>[] = [
  { k: 'chasis', n: 'Sin forro: el chasis tubular a la vista (como hasta ahora)' },
  { k: 'paneles', n: 'Paneles forrados de tela y moqueta' },
  { k: 'lujo', n: 'Lujo: paneles acolchados de ante, moqueta gruesa y aislamiento' },
];
export const TAPICES: Opcion<Tapiz>[] = [
  { k: 'serie', n: 'De serie: vinilo gris acolchado (como hasta ahora)' },
  { k: 'cueroCognac', n: 'Cuero coñac con laterales marrón oscuro' },
  { k: 'cueroNegro', n: 'Cuero negro' },
  { k: 'alcantara', n: 'Alcántara gris' },
  { k: 'tela', n: 'Tela técnica gris oscuro' },
];
export const COSTURAS: Opcion<Costura>[] = [
  { k: 'no', n: 'Sin costura vista' },
  { k: 'recta', n: 'Recta: canales a lo largo' },
  { k: 'geometrica', n: 'Geométrica: líneas cruzadas, como el Vision Jet' },
];
export const COLORES_COSTURA: Opcion<ColorCostura>[] = [
  { k: 'crema', n: 'Crema' }, { k: 'naranja', n: 'Naranja' }, { k: 'negro', n: 'Negro' }, { k: 'rojo', n: 'Rojo' }, { k: 'gris', n: 'Gris claro' },
];
export const COLORES_FORRO: Opcion<ColorForro>[] = [
  { k: 'crema', n: 'Crema (ante claro, como el Vision Jet)' }, { k: 'gris', n: 'Gris' }, { k: 'negro', n: 'Negro' }, { k: 'blanco', n: 'Blanco roto' },
];
export const MOLDURAS: Opcion<Moldura>[] = [
  { k: 'carbono', n: 'Fibra de carbono' }, { k: 'madera', n: 'Madera oscura' }, { k: 'aluminio', n: 'Aluminio cepillado' },
];
export const CONSOLAS_TECHO: Opcion<ConsolaTecho>[] = [
  { k: 'no', n: 'Sin consola en el techo' }, { k: 'apagada', n: 'Consola con focos, apagados' }, { k: 'encendida', n: 'Consola con focos, encendidos' },
];
export const CONSOLAS_CENTRALES: Opcion<'no' | 'si'>[] = [
  { k: 'no', n: 'No' }, { k: 'si', n: 'Sí: reposabrazos con portavasos (y consola entre los asientos de la fila 2)' },
];
export const CINTURONES: Opcion<Cinturon>[] = [
  { k: 'no', n: 'Sin dibujar (como hasta ahora)' }, { k: 'negro', n: 'Negros' }, { k: 'gris', n: 'Grises' }, { k: 'marron', n: 'Marrón oscuro' }, { k: 'rojo', n: 'Rojos' },
];
export const AMBIENTES: Opcion<Ambiente>[] = [
  { k: 'no', n: 'Sin luz ambiente' }, { k: 'blanca', n: 'Blanca cálida' }, { k: 'ambar', n: 'Ámbar' }, { k: 'azul', n: 'Azul' },
];

/**
 * Lining, kg per m² of panel. «Paneles»: a 2.5–3 mm natural-fibre/PP board (about 1.0–1.2 kg/m², the usual door-card
 * substrate) with a laminated fabric and its clips: 1.5. «Lujo»: the same board, 5 mm of foam, a suede-like microfibre
 * (Alcantara is about 0.3 kg/m²) and an acoustic felt behind (about 0.8–1.0 kg/m²): 2.6. Estimates.
 */
export const KG_M2_PANEL: Record<Acabado, number> = { chasis: 0, paneles: 1.5, lujo: 2.6 };
/** The floor: a 4 mm board on the rails and a needle-punch carpet (paneles, 2.0 kg/m²); a tufted carpet with felt (lujo, 3.0). */
export const KG_M2_SUELO: Record<Acabado, number> = { chasis: 0, paneles: 2.0, lujo: 3.0 };
/** How far the lining's visible face stands inside the skin (m): skin, clips and board; the luxury one's foam on top. */
export const GROSOR_FORRO: Record<Acabado, number> = { chasis: 0, paneles: 0.014, lujo: 0.022 };
/**
 * Seat covers, kg per m² (the foam and the shell are in «Un asiento»): the standard one is a PVC-coated fabric (about
 * 0.6–0.7); automotive leather 1.0–1.3 mm about 1.1–1.2; Alcantara about 0.3; a technical knit about 0.45.
 */
export const KG_M2_TAPIZ: Record<Tapiz, number> = { serie: 0.65, cueroCognac: 1.15, cueroNegro: 1.15, alcantara: 0.35, tela: 0.45 };
/** Trim strip along both sides, kg per metre: carbon 2 mm about 0.12; a wood veneer on its substrate 0.30; brushed aluminium 0.25. */
export const KG_M_MOLDURA: Record<Moldura, number> = { carbono: 0.12, madera: 0.30, aluminio: 0.25 };
/** A three-point belt with its retractor, buckle and anchors (about 1.0–1.3 kg each on a car). */
export const KG_CINTURON = 1.1;
/** An armrest with its cupholder (foam on a moulded base, covered): about 1.2 kg; the console between row 2's seats 2.2. */
export const KG_REPOSABRAZOS = 1.2, KG_CONSOLA_CENTRAL = 2.2;

/** What the interior finish asks for (the `t…` fields), defaults as before. */
export interface CamposInterior {
  tAcabado: Acabado; tTapiz: Tapiz; tCostura: Costura; tCosturaColor: ColorCostura; tForroColor: ColorForro;
  tMoldura: Moldura; tConsolaTecho: ConsolaTecho; tConsolaCentral: 'no' | 'si'; tCinturon: Cinturon; tAmbiente: Ambiente;
}

/** A band of lining on the skin's right side (mirrored on the left): rows x from `x1` (front) to `x0`, t from `tLo(x)` to `tHi(x)`. */
export interface BandaForro { x0: number; x1: number; tLo: (x: number) => number; tHi: (x: number) => number }
export interface SeatInterior { x: number; y: number; z: number; fila: 1 | 2 | 3; piloto: boolean; rec: number }
export interface PiezaInterior { nombre: string; kg: number; x: number; y: number; nota?: string }
export interface InteriorTriciclo {
  campos: CamposInterior;
  /** The lining, or null with «Sin forro». */
  forro: null | {
    grosor: number;
    lados: BandaForro;
    techo: BandaForro | null;
    /** The floor's height (m) and its x range; its half-width at x is the skin's at that height less the lining's. */
    suelo: { y: number; x0: number; x1: number };
    /** The trim line along the sides: its height at x (m) and its x range. */
    moldura: { y: (x: number) => number; x0: number; x1: number };
    /** The cover over the rear shock tower (x, top y, half-width), or null when there is none in the cabin. */
    torreta: { x0: number; x1: number; y: number; hz: number } | null;
    /** The door leaves' x ranges (front first) and the test for a point on a door, or null without doors. */
    puerta: null | { enHoja: (x: number, y: number) => number };
    areas: { lados: number; techo: number; suelo: number };
  };
  /** The seats (hips x, cushion y, z, row): belts, armrests and the overhead lights go by them. */
  asientos: SeatInterior[];
  /** The overhead console's x range under the headliner (front, rear), or null. */
  consola: null | { x0: number; x1: number };
  piezas: PiezaInterior[];
}

/** Is this finish today's look (nothing added, seats as they were)? */
export const interiorDeSerie = (c: CamposInterior) =>
  c.tAcabado === 'chasis' && c.tTapiz === 'serie' && c.tConsolaCentral === 'no' && c.tCinturon === 'no';

/**
 * The interior finish of a Triciclo. `yPiso`: the rails' top (m); `xTorreta`: the rear shock tower's top (x, y), if
 * there is one; `glass`: the canopy glass's lower edge as a height at x and its x range (`cup`); `V` the windows (the
 * opaque roof panel and its frame); `P` the Aptera doors; `seats` the seats; `funda`: their covers' total area (m²).
 */
export function interiorTriciclo(c: CamposInterior, o: {
  F: FormaBala; cup: { Y_VIDRIO: (x: number) => number; XC0: number; XC1: number }; V: Ventanas | null; P: Puerta | null;
  yPiso: number; torreta: [number, number] | null; seats: SeatInterior[]; funda: number; nombreFunda: string;
}): InteriorTriciclo {
  const { F, cup, V } = o;
  const piezas: PiezaInterior[] = [];
  const ySeat = o.seats.length ? o.seats.reduce((a, s) => a + s.y, 0) / o.seats.length : 0.45;
  const xSeats = o.seats.map(s => s.x);
  let forro: InteriorTriciclo['forro'] = null, consola: InteriorTriciclo['consola'] = null;
  if (c.tAcabado !== 'chasis') {
    const g = GROSOR_FORRO[c.tAcabado];
    // the floor sits on the rails' top (with its board); the sides start there
    const yS = o.yPiso + 0.006;
    // from the windscreen's foot (where the glass edge meets the top line) back to the canopy's end
    const x1 = cup.XC0 - 0.01, x0 = cup.XC1 + 0.01;
    const tC = (x: number) => (V ? V.tC(x) : tArriba(F.sec(x), cup.Y_VIDRIO(x)));
    // (ahead and behind the glass the band reaches the top centre; 2 mm of t below the glass edge, so the trim covers it)
    const lados: BandaForro = { x0, x1, tLo: x => tAbajo(F.sec(x), yS), tHi: x => (x < cup.XC1 || x > cup.XC0 ? 1 : Math.max(tAbajo(F.sec(x), yS) + 0.02, tC(x) - 0.002)) };
    // the headliner: under the opaque roof (the panel, and its laminate frame when there is one)
    let techo: BandaForro | null = null;
    if (V?.panel) {
      const p = V.panel, lo = V.marco ? V.marco.tLo : p.tLow, xa = Math.max(x0, p.x0), xb = Math.min(x1, V.marco ? V.marco.x1 : p.x1);
      if (xb > xa + 0.05) techo = { x0: xa, x1: xb, tLo: x => Math.min(0.995, lo(x) + 0.004), tHi: () => 1 };
    }
    const lados2 = areaXTRango(F, lados), techo2 = techo ? areaXTRango(F, techo) : { area: 0, x: 0, y: 0 };
    // the floor: from side to side at its height, its area by the skin's half-width there
    let aS = 0, axS = 0;
    for (let i = 0; i < 60; i++) {
      const x = x1 + (x0 - x1) * (i + 0.5) / 60, z = F.ladoZ(x, yS + 0.002);
      if (Number.isFinite(z) && z > g) { const da = 2 * (z - g) * (x1 - x0) / 60; aS += da; axS += da * x; }
    }
    // the trim line: 22 cm above the seats, never closer than 5 cm under the glass edge
    const yM = (x: number) => Math.min(ySeat + 0.22, cup.Y_VIDRIO(Math.min(cup.XC0 - 0.05, Math.max(cup.XC1 + 0.05, x))) - 0.05);
    const xm1 = Math.min(x1 - 0.05, Math.max(...xSeats, x0) + 0.45), xm0 = x0 + 0.05;
    // the shock tower, when it stands inside the lined cabin (its top 6 cm under the cover)
    const torreta = o.torreta && o.torreta[0] > x0 - 0.15 ? { x0: o.torreta[0] - 0.14, x1: o.torreta[0] + 0.16, y: o.torreta[1] + 0.06, hz: 0.12 } : null;
    const P = o.P, enHoja = P ? (x: number, y: number) => {
      if (!(x <= P.xTip && x >= P.xR && y >= P.yLo(x) - 1e-4 && y <= P.yHi(x) + 1e-4)) return -1;
      if (P.segunda) { if (Math.abs(x - P.segunda.xS) < MONTANTE_B / 2) return -1; return x < P.segunda.xS ? 1 : 0; }
      return 0;
    } : null;
    forro = { grosor: g, lados, techo, suelo: { y: yS, x0, x1 }, moldura: { y: yM, x0: xm0, x1: xm1 }, torreta, puerta: enHoja ? { enHoja } : null, areas: { lados: lados2.area, techo: techo2.area, suelo: aS } };
    const kP = KG_M2_PANEL[c.tAcabado];
    piezas.push({ nombre: `Interior: paneles de los costados${techo ? ' y del techo' : ''}`, kg: (lados2.area + techo2.area) * kP, x: (lados2.area * lados2.x + techo2.area * techo2.x) / Math.max(1e-6, lados2.area + techo2.area), y: (lados2.area * lados2.y + techo2.area * techo2.y) / Math.max(1e-6, lados2.area + techo2.area),
      nota: `${fmt2(lados2.area + techo2.area)} m² a ${fmt1(kP)} kg/m²${c.tAcabado === 'lujo' ? ': tablero, espuma, ante y fieltro acústico' : ': tablero forrado de tela y sus grapas'}` });
    piezas.push({ nombre: 'Interior: suelo y moqueta', kg: aS * KG_M2_SUELO[c.tAcabado], x: aS ? axS / aS : (x0 + x1) / 2, y: yS, nota: `${fmt2(aS)} m² a ${fmt1(KG_M2_SUELO[c.tAcabado])} kg/m²` });
    if (torreta) piezas.push({ nombre: 'Interior: funda de la torreta del amortiguador', kg: c.tAcabado === 'lujo' ? 0.9 : 0.6, x: o.torreta![0], y: torreta.y - 0.1 });
    const largo = 2 * (xm1 - xm0), kM = KG_M_MOLDURA[c.tMoldura];
    piezas.push({ nombre: `Interior: molduras de ${c.tMoldura === 'carbono' ? 'carbono' : c.tMoldura === 'madera' ? 'madera' : 'aluminio'}`, kg: largo * kM, x: (xm0 + xm1) / 2, y: ySeat + 0.22, nota: `${fmt2(largo)} m por los dos costados a ${fmt2(kM)} kg/m` });
    // the overhead console: under the headliner, from 10 cm behind its front edge back over the last seat
    if (c.tConsolaTecho !== 'no' && techo) {
      const a = techo.x1 - 0.10, b = Math.max(techo.x0 + 0.05, Math.min(...xSeats, a) - 0.30);
      if (a > b + 0.25) {
        consola = { x0: b, x1: a };
        const L = a - b, y = F.arribaY((a + b) / 2, 0) - 0.06;
        // (a carbon or moulded shell about 0.6 kg/m, LED spots 60 g each, their wiring and switches 0.4 kg, two brackets)
        piezas.push({ nombre: 'Interior: consola de techo con focos', kg: 0.6 * L + 0.06 * 2 * o.seats.length + 0.4 + 0.3, x: (a + b) / 2, y, nota: `${fmt2(L)} m, ${2 * o.seats.length} focos LED` });
      }
    }
    if (c.tAmbiente !== 'no') piezas.push({ nombre: 'Interior: luz ambiente (tiras LED)', kg: 0.25, x: (xm0 + xm1) / 2, y: ySeat + 0.2, nota: 'tiras bajo las molduras y su fuente' });
  }
  // seats: the cover's difference with the standard one (it is in «Un asiento»); belts; armrests
  if (c.tTapiz !== 'serie') {
    const d = (KG_M2_TAPIZ[c.tTapiz] - KG_M2_TAPIZ.serie) * o.funda;
    piezas.push({ nombre: `Tapicería: ${TAPICES.find(t => t.k === c.tTapiz)!.n.toLowerCase()}`, kg: d, x: o.seats.length ? xSeats.reduce((a, x) => a + x, 0) / xSeats.length : -1.2, y: ySeat + 0.15,
      nota: `${fmt2(o.funda)} m² de funda (${o.nombreFunda}) a ${fmt2(KG_M2_TAPIZ[c.tTapiz])} kg/m², frente a ${fmt2(KG_M2_TAPIZ.serie)} del vinilo de serie, que ya cuenta «Un asiento»` });
  }
  if (c.tCinturon !== 'no') piezas.push({ nombre: `Cinturones de tres puntos (${o.seats.length})`, kg: KG_CINTURON * o.seats.length, x: xSeats.length ? xSeats.reduce((a, x) => a + x, 0) / xSeats.length : -1.2, y: ySeat + 0.3, nota: 'cinta, enrollador, hebilla y anclajes' });
  if (c.tConsolaCentral === 'si') {
    const fila2 = o.seats.filter(s => s.fila === 2 && s.z !== 0).length >= 2;
    const n = o.seats.filter(s => !(fila2 && s.fila === 2)).length * 2 + (fila2 ? 2 : 0);
    piezas.push({ nombre: 'Interior: reposabrazos con portavasos', kg: n * KG_REPOSABRAZOS + (fila2 ? KG_CONSOLA_CENTRAL : 0), x: xSeats.length ? xSeats.reduce((a, x) => a + x, 0) / xSeats.length : -1.2, y: ySeat + 0.15, nota: `${n} reposabrazos${fila2 ? ' y la consola entre los dos asientos de la fila 2' : ''}` });
  }
  return { campos: c, forro, asientos: o.seats, consola, piezas };
}

const fmt1 = (v: number) => v.toFixed(1).replace('.', ','), fmt2 = (v: number) => v.toFixed(2).replace('.', ',');
/** The area (m², both sides) and centroid of a band, on the skin's own sections (as `areaXT`). */
function areaXTRango(F: FormaBala, b: BandaForro): { area: number; x: number; y: number } {
  let A = 0, ax = 0, ay = 0, prev: [number, number, number][] | null = null;
  const nx = 60, nt = 12;
  for (let i = 0; i <= nx; i++) {
    const x = b.x1 + (b.x0 - b.x1) * i / nx, s = F.sec(x), lo = b.tLo(x), hi = Math.max(lo, b.tHi(x)), fila: [number, number, number][] = [];
    for (let j = 0; j <= nt; j++) { const [z, y] = punto(s, lo + (hi - lo) * j / nt); fila.push([x, y, z]); }
    if (prev) for (let j = 0; j < nt; j++) {
      const p = prev[j], q = prev[j + 1], r = fila[j], u = fila[j + 1];
      const k = 2 * (tri(p, q, r) + tri(q, u, r));
      A += k; ax += k * (p[0] + u[0]) / 2; ay += k * (p[1] + u[1]) / 2;
    }
    prev = fila;
  }
  return { area: A, x: A ? ax / A : (b.x0 + b.x1) / 2, y: A ? ay / A : 1 };
}
function tri(p: number[], q: number[], r: number[]) {
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
}
