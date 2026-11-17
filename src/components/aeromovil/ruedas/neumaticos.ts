// The tyre TYPE, apart from the wheel SIZE (2026-11-17, Eugenio: «Permite también añadir el tipo de neumático»).
// For a chosen size (`catalogo.ts`, or a vehicle's own older sizes) each axle picks the kind of tyre — road, sport,
// semi-slick, eco, rain, winter, trail, knobbly, scooter — and its construction (radial or bias, tube or tubeless,
// run-flat). Each one changes rolling resistance, mass, grip, life and price RELATIVE TO THE TYRE THE SIZE ALREADY HAS
// («De serie»): a sport size is already a sport tyre, a knobbly enduro size is already knobbly. So «De serie» is a factor
// of exactly 1 everywhere and a saved design keeps exactly its numbers.
// Pure data, no three.js: the tunnel's Web Worker loads the Triciclo model, which reads this file.
import { fichaRueda, type FichaRueda, type GrupoRueda, type PerfilRueda } from './catalogo';

export type TipoNeumatico = 'carretera' | 'deportivo' | 'hiper' | 'eco' | 'lluvia' | 'invierno' | 'trail90' | 'trail50' | 'tacos' | 'scooter';
export type OpcionTipo = 'serie' | TipoNeumatico;
export type Construccion = 'radialSin' | 'radialCamara' | 'diagonalSin' | 'diagonalCamara' | 'runflat';
export type OpcionConstruccion = 'serie' | Construccion;

interface FichaTipo {
  n: string;
  /** Rolling resistance, tyre mass and price relative to a road/touring tyre of the same size. */
  crr: number; kg: number; precio: number;
  /** Peak friction on dry and on wet asphalt, relative to a road tyre's dry grip (the editors' «AGARRE» 0.9 g is a road tyre's). */
  seco: number; mojado: number;
  /** Life of a rear motorcycle tyre on the road (km); a front lasts about 1.5 times as long. */
  km: number;
}

/**
 * Sources (read on 2026-11-17) and how the figures were set:
 * - Life: touring 16,000–32,000 km, sport 4,800–9,700, adventure 8,000–19,300, cruiser 12,900–24,100 (tyrescart.ae,
 *   «How long do motorcycle tyres last?»); sport rears «well under half the mileage a touring tyre would give», 90/10 and
 *   80/20 adventure tyres last well, 50/50 shorter, aggressive off-road a «short life», scooter compounds hard-wearing,
 *   track tyres little grip cold or in standing water (blackcircles.com, «Motorcycle tyre categories explained»). The
 *   semi-slick's 3,000 km and the knobbly's 3,500 on asphalt are estimates in that ordering, not measured.
 * - Grip: a road tyre on dry asphalt ≈ 0.9–1.0, sport compounds up to ≈ 1.1–1.3, wet ≈ 0.5–0.8 of that (V. Cossalter,
 *   «Motorcycle Dynamics», 2006, ch. 2; the same book as the catalogue's rolling resistance). Wet grip ordering from the
 *   categories above and the EU label's wet grip classes (Regulation (EU) 2020/740: class A ≥ 1.55 × the reference tyre,
 *   class E 1.10–1.24). The ratios here are estimates in that ordering.
 * - Rolling resistance: eco/low rolling tyres ≈ 15 % less (EU label class A ≤ 6.5 kg/t against class C 7.8–9.0: a car's
 *   «eco» vs «normal» is 20–30 %; on a motorcycle tyre less is claimed, so 15 %); winter compounds and deeper sipes
 *   ≈ +10–15 %; knobbly on asphalt ≈ +0.004 over a road tyre at its pressure (the catalogue's enduro sizes: 0.0225 against
 *   the trail 21″'s 0.0167, ×1.35); 50/50 half way. Sport and semi-slick a few % more (softer compound, thinner tread
 *   wins some back): +5 % and +10 %. All estimates around published orderings, not measurements of these sizes.
 * - Construction: a radial rolls with less loss than a bias ply (barrystiretech.com, «Bias vs Radial Tires»: «radials
 *   greatly exceed bias ply tires» there; car literature gives 20–30 %, we take 12 % for motorcycle sizes); an inner tube
 *   adds its rubber's hysteresis (+3 %) and about 8 % of the wheel's mass (a motorcycle tube 0.6–0.9 kg, a bicycle's
 *   0.1–0.2); a run-flat's stiff sidewalls weigh about 25 % more tyre and roll about 8 % worse. Estimates.
 * - Price: a rough rule by width and outer diameter for a road tyre (`precioNeumatico`), ±40 %; NOT checked in shops today.
 *   Sport ×1.15, semi-slick ×1.35, scooter ×0.9, knobbly ×0.85 (their usual order in a catalogue).
 */
export const TIPOS_NEUMATICO: Record<TipoNeumatico, FichaTipo> = {
  carretera: { n: 'Carretera / turismo', crr: 1.00, kg: 1.00, precio: 1.00, seco: 1.00, mojado: 0.75, km: 20000 },
  deportivo: { n: 'Deportivo', crr: 1.05, kg: 0.97, precio: 1.15, seco: 1.10, mojado: 0.72, km: 8000 },
  hiper: { n: 'Hiperdeportivo / semi-slick', crr: 1.10, kg: 0.93, precio: 1.35, seco: 1.22, mojado: 0.50, km: 3000 },
  eco: { n: 'Eco, baja rodadura', crr: 0.85, kg: 0.95, precio: 1.05, seco: 0.94, mojado: 0.68, km: 22000 },
  lluvia: { n: 'Lluvia / mixto', crr: 1.03, kg: 1.00, precio: 1.05, seco: 0.97, mojado: 0.82, km: 15000 },
  invierno: { n: 'Todo tiempo / invierno', crr: 1.12, kg: 1.05, precio: 1.10, seco: 0.88, mojado: 0.76, km: 13000 },
  trail90: { n: 'Trail 90/10 (casi todo asfalto)', crr: 1.05, kg: 1.05, precio: 1.00, seco: 0.97, mojado: 0.72, km: 14000 },
  trail50: { n: 'Trail 50/50', crr: 1.18, kg: 1.10, precio: 1.00, seco: 0.90, mojado: 0.62, km: 9000 },
  tacos: { n: 'Tacos / off-road', crr: 1.35, kg: 1.15, precio: 0.85, seco: 0.80, mojado: 0.52, km: 3500 },
  scooter: { n: 'Scooter / urbano', crr: 1.00, kg: 0.95, precio: 0.90, seco: 0.95, mojado: 0.75, km: 12000 },
};
export const IDS_TIPO = Object.keys(TIPOS_NEUMATICO) as TipoNeumatico[];

const CONSTRUCCIONES: Record<Construccion, { n: string; radial: boolean; camara: boolean; runflat?: boolean }> = {
  radialSin: { n: 'Radial sin cámara', radial: true, camara: false },
  radialCamara: { n: 'Radial con cámara', radial: true, camara: true },
  diagonalSin: { n: 'Diagonal sin cámara', radial: false, camara: false },
  diagonalCamara: { n: 'Diagonal con cámara', radial: false, camara: true },
  runflat: { n: 'Run-flat (rueda sin pinchazo)', radial: true, camara: false, runflat: true },
};
export const IDS_CONSTRUCCION = Object.keys(CONSTRUCCIONES) as Construccion[];

/** Options of the two selectors, «De serie» first (the default of every axle). */
export const OPCIONES_TIPO: { k: OpcionTipo; n: string }[] = [{ k: 'serie', n: 'De serie (el de la medida)' }, ...IDS_TIPO.map(k => ({ k, n: TIPOS_NEUMATICO[k].n }))];
export const OPCIONES_CONSTRUCCION: { k: OpcionConstruccion; n: string }[] = [{ k: 'serie', n: 'De serie (la de la medida)' }, ...IDS_CONSTRUCCION.map(k => ({ k, n: CONSTRUCCIONES[k].n }))];

/** What a size is fitted with today: its kind, its construction, and what price and life need (width, diameter, profile). */
export interface PropioNeumatico { tipo: TipoNeumatico; radial: boolean; camara: boolean; d: number; w: number; perfil: PerfilRueda }

const TIPO_DEL_GRUPO: Record<GrupoRueda, TipoNeumatico> = {
  Scooter: 'scooter', 'Ciclomotor y 125': 'carretera', Deportiva: 'deportivo', Turismo: 'carretera', 'Trail y aventura': 'trail90',
  'Enduro y motocross': 'tacos', Custom: 'carretera', 'Café racer': 'carretera', Sidecar: 'carretera', 'Moto eléctrica': 'carretera',
  'Eco de coche': 'eco', Velomóvil: 'carretera',
};
const propioCatalogo = (f: FichaRueda): PropioNeumatico => ({
  tipo: TIPO_DEL_GRUPO[f.grupo], radial: /\bZ?R\d/.test(f.medida), camara: f.llanta === 'radios' || f.llanta === 'buje', d: f.d, w: f.w, perfil: f.perfil,
});
/** A size's own tyre: the catalogue's from its sheet, a vehicle's older sizes from `legado` (the vehicle says what they are). */
export const propioDe = (rueda: string, legado: (k: string) => PropioNeumatico): PropioNeumatico => {
  const f = fichaRueda(rueda);
  return f ? propioCatalogo(f) : legado(rueda);
};

/** Share of a wheel-with-tyre's mass that is the tyre (a 175/55 R15 is 7.3 of 13.3 kg; a 180/55 ZR17 about 6 of 11). */
const FRACCION_NEUMATICO = 0.55;
const valido = <T extends string>(v: string | undefined, ids: readonly T[]): T | null => v && (ids as readonly string[]).includes(v) ? v as T : null;
const construccion = (p: PropioNeumatico, c: Construccion | null) => c ? CONSTRUCCIONES[c] : { n: '', radial: p.radial, camara: p.camara, runflat: false };
const fCrrCons = (c: { radial: boolean; camara: boolean; runflat?: boolean }) => (c.radial ? 1 : 1.12) * (c.camara ? 1.03 : 1) * (c.runflat ? 1.08 : 1);
const fMuCons = (c: { radial: boolean; runflat?: boolean }) => (c.radial ? 1 : 0.95) * (c.runflat ? 0.98 : 1);
const fKgNeuCons = (c: { runflat?: boolean }) => c.runflat ? 1.25 : 1;
const fPrecioCons = (c: { radial: boolean; camara: boolean; runflat?: boolean }) => (c.radial ? 1 : 0.8) * (c.runflat ? 1.4 : 1) + (c.camara ? 0.12 : 0);
const fKmPerfil: Record<PerfilRueda, number> = { moto: 1, coche: 2.5, bici: 0.4 };

/** A road tyre's price in this size (€ per tyre): a rough rule, 1.1 €/mm of width − 60 + 1.5 € per inch of outer diameter over 10; car tyres ×0.6, at least 30 €. ±40 %. */
export const precioNeumatico = (p: Pick<PropioNeumatico, 'd' | 'w' | 'perfil'>) =>
  Math.max(30, (1.1 * p.w * 1000 - 60 + 1.5 * (p.d / 0.0254 - 10)) * (p.perfil === 'coche' ? 0.6 : 1));

export interface EfectoNeumatico {
  tipo: TipoNeumatico; nombre: string; construccion: string;
  /** Multipliers over today's numbers for that size: exactly 1 with «De serie». */
  fCrr: number; fKg: number; fSeco: number; fMojado: number;
  /** Peak friction with this tyre, dry and wet, given the vehicle's dry grip with the size's own tyre (`agarre`, 0.9 g). */
  muSeco: number; muMojado: number;
  /** Life (km, `delantera` ×1.5) and price (€ per tyre, estimate). */
  km: number; precio: number;
  serie: boolean;
}

/** What the tyre chosen for one axle does, relative to the tyre the size has. */
export function efectoNeumatico(rueda: string, tipo: string | undefined, cons: string | undefined, legado: (k: string) => PropioNeumatico, agarre: number, delantera = false): EfectoNeumatico {
  const p = propioDe(rueda, legado), t = valido(tipo, IDS_TIPO), c = valido(cons, IDS_CONSTRUCCION);
  const T0 = TIPOS_NEUMATICO[p.tipo], T1 = TIPOS_NEUMATICO[t ?? p.tipo], c0 = construccion(p, null), c1 = construccion(p, c);
  const serie = !t && !c;
  // tyre part of the mass scales with the type and a run-flat's sidewalls; a tube adds 8 % of the wheel; the rim does not change
  const tubo = (c1.camara ? 0.08 : 0) - (c0.camara ? 0.08 : 0);
  const fKg = serie ? 1 : 1 + FRACCION_NEUMATICO * (T1.kg * fKgNeuCons(c1) / (T0.kg * fKgNeuCons(c0)) - 1) + tubo;
  const fCrr = serie ? 1 : T1.crr * fCrrCons(c1) / (T0.crr * fCrrCons(c0));
  const fSeco = serie ? 1 : T1.seco * fMuCons(c1) / (T0.seco * fMuCons(c0));
  const fMojado = T1.mojado * fMuCons(c1) / (T0.seco * fMuCons(c0));
  const km = T1.km * fKmPerfil[p.perfil] * (c1.radial ? 1 : 0.9) * (delantera ? 1.5 : 1);
  const precio = precioNeumatico(p) * T1.precio * fPrecioCons(c1);
  return {
    tipo: t ?? p.tipo, nombre: TIPOS_NEUMATICO[t ?? p.tipo].n, construccion: `${c1.radial ? 'radial' : 'diagonal'} ${c1.camara ? 'con cámara' : 'sin cámara'}${c1.runflat ? ', run-flat' : ''}`,
    fCrr, fKg, fSeco, fMojado, muSeco: agarre * fSeco, muMojado: agarre * fMojado, km, precio, serie,
  };
}

const n2 = (x: number, d = 2) => x.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (f: number) => { const p = Math.round((f - 1) * 100); return p === 0 ? '=' : `${p > 0 ? '+' : '−'}${Math.abs(p)} %`; };
/** The one-line card under the selectors: «Deportivo, radial sin cámara: rodadura +5 %, masa −2 %, agarre 0,99 g seco / 0,65 mojado, ≈ 8.000 km, ≈ 170 € cada uno». */
export const lineaNeumatico = (e: EfectoNeumatico) =>
  `${e.nombre}${e.serie ? ' (de serie)' : ''}, ${e.construccion}: rodadura ${pct(e.fCrr)}, masa de la rueda ${pct(e.fKg)}, agarre ${n2(e.muSeco)} g en seco y ${n2(e.muMojado)} en mojado, dura ≈ ${(Math.round(e.km / 500) * 500).toLocaleString('es-ES')} km, ≈ ${Math.round(e.precio / 5) * 5} € cada neumático (estimado).`;

/**
 * Rolling resistance of a vehicle whose axles roll on different tyres, each tyre's own type applied: Σ nᵢ·Crrᵢ·fᵢ / Σ nᵢ
 * (same load per wheel, as `crrMezcla`). With every axle on an older size and «De serie», exactly `legado`.
 */
export function crrEjes(ejes: { k: string; n: number; f: number }[], legado: number): number {
  if (ejes.every(e => !fichaRueda(e.k) && e.f === 1)) return legado;
  let s = 0, n = 0;
  for (const e of ejes) { s += e.n * (fichaRueda(e.k)?.crr ?? legado) * e.f; n += e.n; }
  return n ? s / n : legado;
}
