// The wheel catalogue (2026-11-17, Eugenio: «permite añadir más tipos de ruedas, por ejemplo de motos de todo tipo»).
// Real wheel + tyre types — motorcycle wheels of every kind at the core, plus low rolling resistance car and velomobile
// wheels for comparison — that the Triciclo family and the Cuadriciclo Basculante can pick per axle, next to the sizes
// they already had (those stay exactly as they were: a saved design keeps its wheels and its numbers).
// Pure data, no three.js: the tunnel's Web Worker loads the Triciclo model, which reads this file.

/** The tyre's cross-section: a motorcycle's round crown (it rolls onto its shoulder when it leans), a car's flat tread, a bicycle's round small section. */
export type PerfilRueda = 'moto' | 'coche' | 'bici';
/** What carries the tyre: wire spokes, a cast (or forged) alloy wheel, a closed aero disc, or the drum of a hub motor laced to the rim. */
export type LlantaRueda = 'radios' | 'fundida' | 'disco' | 'buje';
export type GrupoRueda = 'Scooter' | 'Ciclomotor y 125' | 'Deportiva' | 'Turismo' | 'Trail y aventura' | 'Enduro y motocross' | 'Custom' | 'Café racer' | 'Sidecar' | 'Moto eléctrica' | 'Eco de coche' | 'Velomóvil';

export interface FichaRueda {
  grupo: GrupoRueda;
  /** The tyre's size code as written on its sidewall, with load index and speed symbol. */
  medida: string;
  /** Rim (bead seat) diameter, inches; the velomobile's ISO 406 is a 20″ bicycle rim. */
  llantaPulg: number;
  /** Outer diameter and section width of the inflated tyre (m). */
  d: number; w: number;
  perfil: PerfilRueda;
  llanta: LlantaRueda;
  /** Wheel with its tyre (kg), without brake disc or hub motor (those have their own sliders). */
  kg: number;
  /** Rolling resistance coefficient on dry asphalt, at the pressure `bar`. */
  crr: number; bar: number;
  /** What one tyre carries (kg, its load index) and its speed symbol's top speed (km/h). */
  carga: number; vmax: number;
  /** Peak power (kW) a hub motor in this rim can credibly give: a rough rule, as `RUEDAS_TRICICLO.kWBuje`. */
  kWBuje: number;
  /** How far it leans on its own tread (°): the Basculante's check. */
  inclina: number;
  /** Real models that use it, and real tyres in this size. */
  ejemplos: string;
  /** Where the diameter and width come from. */
  fuente: string;
}

/**
 * Sources (read on 2026-11-17):
 * - Diameters and widths: Metzeler Technical Manual 2020, «Technical data to standard» (measured on the measuring rim):
 *   https://mail.bigtyres.co.uk/media/landingpages/documents/Metzeler_Technical_Manual_2020.pdf. Where a size is not in
 *   it, `d` = rim + 2 × width × profile, and `fuente` says «calculado de la medida».
 * - Load index → kg and speed symbol → km/h: the ETRTO tables (index 58 = 236 kg, 73 = 365 kg… symbol H = 210, W = 270).
 * - Rolling resistance of motorcycle tyres: V. Cossalter, «Motorcycle Dynamics» (2nd ed., 2006), ch. 2:
 *   f = 0.0085 + 0.018/p + 1.59·10⁻⁶·V²/p (p in bar, V in km/h). We keep the static part at each tyre's usual pressure
 *   (the editor uses one Crr for every speed); at 100 km/h add ≈ 0.016/p. Quoted from the book, not reopened online
 *   today. Knobbly enduro/motocross tyres on asphalt: +0.004 over that (estimate, no source).
 * - Car tyres: EU tyre label, Regulation (EU) 2020/740, class A ≤ 6.5 kg/t, class C 7.8–9.0 kg/t. Bridgestone Ecopia EP500
 *   155/70 R19 84Q is class C (reifen.com); Michelin e.Primacy 175/60 R19 86Q, class A (reifen.com).
 * - Velomobile: Schwalbe Marathon Racer, Crr 0.00737 at 4.1 bar (35-622, bicyclerollingresistance.com); a 20″ rolls a
 *   little worse: 0.008.
 * - Masses: estimates (a typical tyre of that size and a rim of its class); weighed references: a stock cast rear rim
 *   4.9 kg and a forged Marchesini 4.4 kg (canyonchasers.net), a Panigale rear wheel with tyre and disc 11.1 kg
 *   (ducatiforum.co.uk); QS 205 V3 hub motor 12.8 kg bare, 5.7 kW peak at 72 V (em3ev.com).
 * - Ural sidecar: Duro HF308 4.00-19 72P, 27.4″ (696 mm) outer diameter (tiremart.com).
 */
export const CATALOGO_RUEDAS = {
  // ── scooters
  scooter10: { grupo: 'Scooter', medida: '3.50-10 59J', llantaPulg: 10, d: 0.448, w: 0.099, perfil: 'moto', llanta: 'disco', kg: 5.3, crr: 0.0185, bar: 1.8, carga: 243, vmax: 100, kWBuje: 4, inclina: 42,
    ejemplos: 'Vespa PX, Vespa clásica; Metzeler ME 1, Michelin S83', fuente: 'Metzeler 2020' },
  scooter12: { grupo: 'Scooter', medida: '120/70-12 58P', llantaPulg: 12, d: 0.485, w: 0.135, perfil: 'moto', llanta: 'fundida', kg: 6.4, crr: 0.0175, bar: 2.0, carga: 236, vmax: 150, kWBuje: 6, inclina: 45,
    ejemplos: 'Vespa GTS (delante), Honda Grom, NIU NQi; Metzeler Feelfree, Michelin City Grip 2', fuente: 'Metzeler 2020' },
  scooter12t: { grupo: 'Scooter', medida: '130/70-12 62P', llantaPulg: 12, d: 0.499, w: 0.145, perfil: 'moto', llanta: 'fundida', kg: 7.0, crr: 0.0165, bar: 2.25, carga: 265, vmax: 150, kWBuje: 6, inclina: 45,
    ejemplos: 'Vespa GTS (detrás), Honda Grom (detrás); Metzeler Roadtec Scooter', fuente: 'Metzeler 2020' },
  maxi15t: { grupo: 'Scooter', medida: '160/60 R15 67H', llantaPulg: 15, d: 0.573, w: 0.165, perfil: 'moto', llanta: 'fundida', kg: 10.5, crr: 0.0157, bar: 2.5, carga: 307, vmax: 210, kWBuje: 10, inclina: 48,
    ejemplos: 'Yamaha TMAX (detrás), BMW C 400; Bridgestone Battlax SC2, Michelin Power Pure SC', fuente: 'calculado de la medida' },
  // ── mopeds and 125s
  moto125d: { grupo: 'Ciclomotor y 125', medida: '100/80-17 52H', llantaPulg: 17, d: 0.604, w: 0.114, perfil: 'moto', llanta: 'fundida', kg: 6.5, crr: 0.0175, bar: 2.0, carga: 200, vmax: 210, kWBuje: 15, inclina: 48,
    ejemplos: 'Yamaha MT-125 y YZF-R125 (delante), KTM 125 Duke; Metzeler Sportec Street, Michelin Pilot Street 2', fuente: 'Metzeler 2020' },
  moto125t: { grupo: 'Ciclomotor y 125', medida: '130/70-17 62H', llantaPulg: 17, d: 0.626, w: 0.147, perfil: 'moto', llanta: 'fundida', kg: 8.4, crr: 0.0165, bar: 2.25, carga: 265, vmax: 210, kWBuje: 15, inclina: 48,
    ejemplos: 'Yamaha MT-125 (detrás), Honda CBF 125; Metzeler Sportec Street', fuente: 'Metzeler 2020' },
  // ── road sport: naked and supersport (the same 120/70 ZR17 front)
  nakedD: { grupo: 'Deportiva', medida: '120/70 ZR17 58W', llantaPulg: 17, d: 0.612, w: 0.133, perfil: 'moto', llanta: 'fundida', kg: 7.9, crr: 0.0157, bar: 2.5, carga: 236, vmax: 270, kWBuje: 20, inclina: 52,
    ejemplos: 'Yamaha MT-07 y MT-09, Kawasaki Z900, Yamaha R1, Ducati Panigale (delante); Michelin Road 6, Pirelli Diablo Rosso IV', fuente: 'Metzeler 2020' },
  nakedT: { grupo: 'Deportiva', medida: '180/55 ZR17 73W', llantaPulg: 17, d: 0.644, w: 0.196, perfil: 'moto', llanta: 'fundida', kg: 11.1, crr: 0.0147, bar: 2.9, carga: 365, vmax: 270, kWBuje: 20, inclina: 52,
    ejemplos: 'Yamaha MT-07 y MT-09, Kawasaki Z900, BMW R 1250 RS (detrás); Michelin Road 6, Metzeler Sportec M9 RR', fuente: 'Metzeler 2020' },
  superT: { grupo: 'Deportiva', medida: '190/55 ZR17 75W', llantaPulg: 17, d: 0.656, w: 0.203, perfil: 'moto', llanta: 'fundida', kg: 10.9, crr: 0.0147, bar: 2.9, carga: 387, vmax: 270, kWBuje: 20, inclina: 55,
    ejemplos: 'Yamaha R1, Honda CBR1000RR-R, BMW S 1000 RR (detrás, llanta forjada); Pirelli Diablo Supercorsa SP, Metzeler Racetec RR', fuente: 'Metzeler 2020' },
  // ── touring (Gold Wing sizes)
  touringD: { grupo: 'Turismo', medida: '130/70 R18 63H', llantaPulg: 18, d: 0.651, w: 0.145, perfil: 'moto', llanta: 'fundida', kg: 9.0, crr: 0.0157, bar: 2.5, carga: 272, vmax: 210, kWBuje: 20, inclina: 45,
    ejemplos: 'Honda Gold Wing (delante); Bridgestone Exedra G853, Metzeler Marathon Ultra', fuente: 'Metzeler 2020' },
  touringT: { grupo: 'Turismo', medida: '200/55 R16 77H', llantaPulg: 16, d: 0.626, w: 0.205, perfil: 'moto', llanta: 'fundida', kg: 13.5, crr: 0.0147, bar: 2.9, carga: 412, vmax: 210, kWBuje: 18, inclina: 45,
    ejemplos: 'Honda Gold Wing (detrás); Bridgestone Exedra G852, Dunlop Elite 4', fuente: 'calculado de la medida' },
  // ── adventure / trail
  trail21: { grupo: 'Trail y aventura', medida: '90/90-21 54H', llantaPulg: 21, d: 0.707, w: 0.103, perfil: 'moto', llanta: 'radios', kg: 7.5, crr: 0.0167, bar: 2.2, carga: 212, vmax: 210, kWBuje: 20, inclina: 45,
    ejemplos: 'Honda Africa Twin, KTM 890 Adventure, Yamaha Ténéré 700 (delante); Metzeler Karoo 4, Michelin Anakee Wild', fuente: 'Metzeler 2020' },
  trail19: { grupo: 'Trail y aventura', medida: '120/70 R19 60V', llantaPulg: 19, d: 0.663, w: 0.134, perfil: 'moto', llanta: 'fundida', kg: 8.8, crr: 0.0157, bar: 2.5, carga: 250, vmax: 240, kWBuje: 20, inclina: 48,
    ejemplos: 'BMW R 1250 GS, Ducati Multistrada V4 (delante); Metzeler Tourance Next 2, Michelin Anakee Road', fuente: 'Metzeler 2020' },
  trail18t: { grupo: 'Trail y aventura', medida: '150/70 R18 70H', llantaPulg: 18, d: 0.681, w: 0.165, perfil: 'moto', llanta: 'radios', kg: 11.9, crr: 0.0157, bar: 2.5, carga: 335, vmax: 210, kWBuje: 20, inclina: 45,
    ejemplos: 'Honda Africa Twin, KTM 890 Adventure (detrás); Metzeler Karoo Street', fuente: 'Metzeler 2020' },
  trail17t: { grupo: 'Trail y aventura', medida: '170/60 R17 72V', llantaPulg: 17, d: 0.650, w: 0.190, perfil: 'moto', llanta: 'fundida', kg: 11.6, crr: 0.0147, bar: 2.9, carga: 355, vmax: 240, kWBuje: 20, inclina: 48,
    ejemplos: 'BMW R 1250 GS, Ducati Multistrada (detrás); Metzeler Tourance Next 2, Michelin Anakee Road', fuente: 'Metzeler 2020' },
  // ── enduro / motocross (knobbly: rolling resistance and wear on asphalt are bad)
  enduro21: { grupo: 'Enduro y motocross', medida: '80/100-21 51M', llantaPulg: 21, d: 0.713, w: 0.104, perfil: 'moto', llanta: 'radios', kg: 7.5, crr: 0.0225, bar: 1.8, carga: 195, vmax: 130, kWBuje: 20, inclina: 45,
    ejemplos: 'KTM 300 EXC, Husqvarna TE, Beta RR (delante); Metzeler MCE 6 Days Extreme, Michelin Enduro Medium', fuente: 'Metzeler 2020' },
  enduro18t: { grupo: 'Enduro y motocross', medida: '120/90-18 65M', llantaPulg: 18, d: 0.699, w: 0.134, perfil: 'moto', llanta: 'radios', kg: 10.7, crr: 0.0215, bar: 2.0, carga: 290, vmax: 130, kWBuje: 20, inclina: 45,
    ejemplos: 'KTM 300 EXC, Husqvarna TE (detrás); Metzeler MCE 6 Days Extreme, Michelin Enduro Medium', fuente: 'Metzeler 2020' },
  // ── cruiser (fat 16″ and the 240 rear)
  cruiser16d: { grupo: 'Custom', medida: '130/90 B16 73H', llantaPulg: 16, d: 0.656, w: 0.147, perfil: 'moto', llanta: 'radios', kg: 10.6, crr: 0.0157, bar: 2.5, carga: 365, vmax: 210, kWBuje: 18, inclina: 32,
    ejemplos: 'Harley-Davidson Heritage Classic y Road King (delante); Metzeler Cruisetec, Dunlop American Elite', fuente: 'Metzeler 2020' },
  cruiser16t: { grupo: 'Custom', medida: '150/80 B16 77H', llantaPulg: 16, d: 0.662, w: 0.173, perfil: 'moto', llanta: 'radios', kg: 13.0, crr: 0.0149, bar: 2.8, carga: 412, vmax: 210, kWBuje: 18, inclina: 32,
    ejemplos: 'Harley-Davidson Heritage Classic, Road King (detrás); Metzeler Cruisetec, Dunlop American Elite', fuente: 'Metzeler 2020' },
  cruiser240t: { grupo: 'Custom', medida: '240/40 R18 79V', llantaPulg: 18, d: 0.663, w: 0.262, perfil: 'moto', llanta: 'disco', kg: 18.0, crr: 0.0149, bar: 2.8, carga: 437, vmax: 240, kWBuje: 20, inclina: 32,
    ejemplos: 'Harley-Davidson Fat Boy (detrás, llanta maciza Lakester); Metzeler Cruisetec, Michelin Commander III', fuente: 'Metzeler 2020' },
  // ── café racer, spoked
  cafe18d: { grupo: 'Café racer', medida: '100/90-18 56H', llantaPulg: 18, d: 0.649, w: 0.114, perfil: 'moto', llanta: 'radios', kg: 7.5, crr: 0.0167, bar: 2.2, carga: 224, vmax: 210, kWBuje: 18, inclina: 45,
    ejemplos: 'Royal Enfield Continental GT 650, Triumph Thruxton (delante); Pirelli Phantom Sportscomp, Metzeler Sportec Klassik', fuente: 'Metzeler 2020' },
  cafe18t: { grupo: 'Café racer', medida: '130/70-18 63H', llantaPulg: 18, d: 0.651, w: 0.147, perfil: 'moto', llanta: 'radios', kg: 9.5, crr: 0.0157, bar: 2.5, carga: 272, vmax: 210, kWBuje: 18, inclina: 45,
    ejemplos: 'Royal Enfield Continental GT 650 (detrás); Pirelli Phantom Sportscomp, Metzeler Lasertec', fuente: 'Metzeler 2020' },
  // ── sidecar: the Ural's, the same on its three wheels
  sidecar19: { grupo: 'Sidecar', medida: '4.00-19 72P', llantaPulg: 19, d: 0.696, w: 0.102, perfil: 'moto', llanta: 'radios', kg: 10.5, crr: 0.0175, bar: 2.0, carga: 355, vmax: 150, kWBuje: 20, inclina: 40,
    ejemplos: 'Ural Gear Up y cT (las tres ruedas, intercambiables); Duro HF308, Heidenau K37', fuente: 'tiremart.com (27,4″)' },
  // ── electric motorcycle: a hub motor laced into a 17″ rim (the motor's mass and power go in their own sliders)
  buje17: { grupo: 'Moto eléctrica', medida: '2.75-17 47P', llantaPulg: 17, d: 0.572, w: 0.075, perfil: 'moto', llanta: 'buje', kg: 5.5, crr: 0.0157, bar: 2.5, carga: 175, vmax: 150, kWBuje: 5.7, inclina: 45,
    ejemplos: 'Motor de buje QS 205 V3 (12,8 kg, 5,7 kW de pico a 72 V) en llanta de 17 × 1,6″ con radios, como en Super Soco y conversiones; Heidenau K47', fuente: 'calculado de la medida' },
  // ── for comparison: low rolling resistance car tyres and a velomobile wheel
  ecoI3: { grupo: 'Eco de coche', medida: '155/70 R19 84Q', llantaPulg: 19, d: 0.700, w: 0.155, perfil: 'coche', llanta: 'disco', kg: 14.0, crr: 0.0084, bar: 2.5, carga: 500, vmax: 160, kWBuje: 60, inclina: 6,
    ejemplos: 'BMW i3 (alto y estrecho para rodar poco); Bridgestone Ecopia EP500, etiqueta europea C', fuente: 'calculado de la medida' },
  ecoPrimacy: { grupo: 'Eco de coche', medida: '175/60 R19 86Q', llantaPulg: 19, d: 0.693, w: 0.175, perfil: 'coche', llanta: 'disco', kg: 15.5, crr: 0.0063, bar: 2.5, carga: 530, vmax: 160, kWBuje: 60, inclina: 6,
    ejemplos: 'BMW i3 (detrás); Michelin e.Primacy, etiqueta europea A (≤ 6,5 kg/t)', fuente: 'calculado de la medida' },
  velomovil20: { grupo: 'Velomóvil', medida: '40-406 (20 × 1,50″)', llantaPulg: 16, d: 0.486, w: 0.040, perfil: 'bici', llanta: 'radios', kg: 1.5, crr: 0.008, bar: 4.1, carga: 100, vmax: 60, kWBuje: 1, inclina: 45,
    ejemplos: 'Velomóviles Milan, Quest y DF; Schwalbe Marathon Racer, Schwalbe One. Carga máxima estimada (Schwalbe no la publica en esta medida)', fuente: 'calculado de la medida' },
} satisfies Record<string, FichaRueda>;

export type IdRueda = keyof typeof CATALOGO_RUEDAS;
export const IDS_CATALOGO = Object.keys(CATALOGO_RUEDAS) as IdRueda[];
export const esDelCatalogo = (k: string | undefined | null): k is IdRueda => !!k && Object.prototype.hasOwnProperty.call(CATALOGO_RUEDAS, k);
export const fichaRueda = (k: string | undefined | null): FichaRueda | null => esDelCatalogo(k) ? CATALOGO_RUEDAS[k] : null;

const PERFIL_N: Record<PerfilRueda, string> = { moto: 'perfil redondo', coche: 'perfil plano', bici: 'de bici' };
const LLANTA_N: Record<LlantaRueda, string> = { radios: 'radios', fundida: 'llanta de aleación', disco: 'llanta de disco', buje: 'motor de buje' };
/** The label in a selector: «Moto deportiva · 120/70 ZR17 58W · 612 mm, radios». */
export const nombreRueda = (k: IdRueda) => {
  const f = CATALOGO_RUEDAS[k] as FichaRueda;
  return `${f.grupo} · ${f.medida} · ${Math.round(f.d * 1000)} mm, ${LLANTA_N[f.llanta]}, ${PERFIL_N[f.perfil]}`;
};
export const fmtKg = (x: number) => x.toLocaleString('es-ES', { maximumFractionDigits: 1 });
/** One line of the wheel's sheet, for the side panel: what it is, what it weighs, rolls and carries, and who uses it. */
export const lineaRueda = (k: IdRueda) => {
  const f = CATALOGO_RUEDAS[k] as FichaRueda;
  return `${f.medida}: Ø ${Math.round(f.d * 1000)} mm, ${Math.round(f.w * 1000)} mm de ancho, ${fmtKg(f.kg)} kg con llanta, rodadura ${f.crr.toLocaleString('es-ES', { maximumFractionDigits: 4 })} a ${fmtKg(f.bar)} bar, ${f.carga} kg por rueda, hasta ${f.vmax} km/h. ${f.ejemplos}.`;
};

/**
 * Rolling resistance of a vehicle whose axles roll on different tyres: Σ nᵢ·Crrᵢ / Σ nᵢ, each wheel taken to carry the
 * same load (the load split is not known here: `memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md`). A size that is not in
 * the catalogue rolls at `legado`, the constant the vehicle used before — so a saved design keeps exactly its numbers.
 */
export function crrMezcla(ejes: { k: string; n: number }[], legado: number): number {
  if (ejes.every(e => !esDelCatalogo(e.k))) return legado;
  let s = 0, n = 0;
  for (const e of ejes) { s += e.n * (fichaRueda(e.k)?.crr ?? legado); n += e.n; }
  return n ? s / n : legado;
}
