/**
 * The price of every part, section, department and vehicle (2026-11-17, Eugenio: «aparte del peso, vamos a añadir en
 * todas las secciones y todos los componentes el precio … y el precio global tiene que aparecer sumado debajo de
 * proyecto»).
 *
 * It mirrors the mass model and reuses it: the parts are the SAME parts `masasSecciones.ts` puts in each section (the
 * parts list of «Peso: todos los componentes», with the body's laminate split by zone). Nothing here makes a second
 * list of components. Each part gets:
 *  - a default price: the catalogue's published price when the design picked a priced part there (`catalogoTren.ts`),
 *    otherwise an ESTIMATE from its class (per unit, per kg of material, per m², per kWh) written next to it, so it
 *    can be checked and argued with;
 *  - the user's own price, when they set one (`P.precios[nombre]`, stored with the design). A saved design without
 *    `precios` gets the defaults; nothing else in it changes.
 * Sums: section = its parts; department = its own sections + the parts with no section; vehicle = departments.
 * `scripts/precios-secciones.ts` checks it and ends «Todo OK».
 *
 * Prices are what buying the materials and parts costs for ONE prototype (shop prices, VAT roughly included), not
 * the labour: that is «Mano de obra» (`manoObra.ts`).
 */
import type { Parametros, Resultados } from '../geometria';
import { MATERIALES_CHASIS } from '../geometria';
import { A_MEDIDA, EUR_POR_USD, motorDe, precioEuros, termicoDe, type Precio } from '../catalogoTren';
import { clave, type DepPeso, type PartePeso, type PesosSecciones, type SeccionPeso } from '../masasSecciones';

export interface PrecioParte {
  nombre: string; kg: number;
  /** what counts: the user's price if they set one, else the default */
  eur: number;
  /** the default (catalogue or estimate) */
  estimado: number;
  /** the user set this price (`P.precios`) */
  propio: boolean;
  origen: 'catalogo' | 'estimado';
  /** how the default was reached, in plain Spanish («35 €/kg de laminado de carbono-lino») */
  como: string;
  /** the editor's slider range */
  max: number; paso: number;
}
export interface PrecioSeccion { eur: number; tipo: SeccionPeso['tipo']; partes: PrecioParte[] }
export interface PreciosDiseno {
  secciones: Record<string, PrecioSeccion>;
  sinSeccion: Partial<Record<DepPeso, PrecioParte[]>>;
  /** each department: its own sections + its parts with no section */
  porDep: Partial<Record<DepPeso, number>>;
  /** the whole vehicle's materials and parts */
  total: number;
  /** how many parts carry the user's own price */
  propios: number;
}

/** What the estimates need from the design. */
export interface ContextoPrecio {
  P: Parametros;
  /** the model (only a few counts are read: wheels, seats, battery kWh) */
  modelo: { tipo: string } & Record<string, unknown>;
  res: Resultados;
}

// ------------------------------------------------------------------ formatting
/** «1.234 €» (es-ES does not group four-digit numbers by itself). */
export const eur = (v: number) => `${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
const n1 = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });
/** Estimates are rounded: to 1 € under 50, to 5 € under 500, to 10 € above (a price is not known to the euro). */
const redondo = (v: number) => (v < 50 ? Math.round(v) : v < 500 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10);

// ------------------------------------------------------------------ the estimates
/**
 * €/kg of finished laminate, materials only (fabric, resin, core, consumables), for a one-off. Orders of magnitude
 * from retail composite suppliers (fibreglass cloth some 5–10 €/m², epoxy 15–25 €/kg; carbon cloth 25–45 €/m²; flax
 * and carbon-flax in between): an estimate.
 */
const EUR_KG_LAMINADO: Record<string, [number, string]> = { vidrio: [14, 'fibra de vidrio'], carbonoLino: [32, 'carbono-lino'], carbono: [55, 'fibra de carbono'] };
/** €/kg of frame tube bought in lengths (estimate; carbon tube is sold by the piece and costs far more). */
const EUR_KG_TUBO: Record<string, number> = { cromoly: 18, al6061: 12, carbono: 140 };
/** €/kWh of a battery pack built from cells with its BMS and box, one-off (estimate; cells alone, some 100–150 €/kWh). */
export const EUR_KWH = 230;

type Estimacion = { eur: number; como: string; origen?: 'catalogo' };
const est = (eur: number, como: string): Estimacion => ({ eur: redondo(eur), como });

/** «QS 273 8 kW: 898 $ (≈ 772 €) en e-smartway.com, leído el 2026-11-17» */
function deCatalogo(nombre: string, p: Precio, n: number): Estimacion {
  const e = precioEuros(p)!, web = p.fuente.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  const moneda = p.moneda === 'EUR' ? `${n1(p.valor)} €` : `${n1(p.valor)} $ (≈ ${eur(p.valor * EUR_POR_USD)}, a ${EUR_POR_USD.toLocaleString('es-ES')} €/$)`;
  return { eur: e * n, origen: 'catalogo', como: `catálogo: ${nombre}, ${moneda} en ${web}, leído el ${p.leido}${n > 1 ? `, × ${n}` : ''}; IVA ${p.iva}` };
}

function estimar(nombre: string, kg: number, cx: ContextoPrecio): Estimacion {
  const P = cx.P as Parametros & Record<string, unknown>, m = cx.modelo;
  const num = (k: string, d: number) => (typeof P[k] === 'number' ? P[k] as number : d);
  // the body's laminate (and the pods, the floor): per kg of laminate, by material
  const matLam = String(P.tMatCarenado ?? P.qMatCarenado ?? P.matCarenado ?? 'vidrio');
  const [kgLam, nLam] = EUR_KG_LAMINADO[matLam] ?? EUR_KG_LAMINADO.vidrio;
  if (/^(Carrocería|Carenados)/.test(nombre)) return est(kg * kgLam, `estimado: ${n1(kg)} kg de laminado de ${nLam} a ${kgLam} €/kg (tela, resina y consumibles; sin moldes ni horas)`);
  // 2026-11-17: the BWB fairing (triciclo/bwb.ts): its skin is the body's laminate; the inner structure a sandwich of
  // the same cloth with foam; the fold two hinges with their locks (≈ 60 € each) and two 12 V linear actuators (≈ 120 € each)
  if (/^Carenado BWB: piel/.test(nombre)) return est(kg * kgLam, `estimado: ${n1(kg)} kg de laminado de ${nLam} a ${kgLam} €/kg (tela, resina y consumibles; sin moldes ni horas)`);
  if (/^Carenado BWB: largueros/.test(nombre)) return est(kg * kgLam * 1.3, `estimado: ${n1(kg)} kg de largueros y costillas de ${nLam} con espuma a ${Math.round(kgLam * 1.3)} €/kg`);
  if (/^Carenado BWB: bisagras/.test(nombre)) return est(2 * (60 + 120), 'estimado: por ala, una bisagra de piano con cierre (≈ 60 €) y un actuador lineal de 12 V (≈ 120 €)');
  if (/^Suelo de sándwich/.test(nombre)) return est(kg * kgLam * 1.3, `estimado: ${n1(kg)} kg de sándwich de ${nLam} a ${Math.round(kgLam * 1.3)} €/kg (con el núcleo)`);
  // the canopy: a thermoformed polycarbonate canopy made to measure, by its area
  if (/^Cúpula/.test(nombre)) {
    const a = cx.res.areas.cristal || kg / 3.6;
    return est(150 + 300 * a, `estimado: cúpula de policarbonato termoformada a medida, 150 € + 300 €/m² × ${n1(a)} m²`);
  }
  if (/^Marco de la cúpula/.test(nombre)) return est(220, 'estimado: marco, bisagra y dos amortiguadores de gas');
  if (/^Paneles solares/.test(nombre)) {
    const a = cx.res.areas.solar || kg / 2.5;
    return est(220 * a, `estimado: paneles flexibles a 220 €/m² (≈ 1,1 €/W) × ${n1(a)} m²`);
  }
  if (/^Bastidor/.test(nombre)) {
    const mat = String(P.tChMat ?? P.qChMat ?? 'cromoly'), k = EUR_KG_TUBO[mat] ?? 18;
    return est(kg * k + 60, `estimado: ${n1(kg)} kg de ${(MATERIALES_CHASIS as Record<string, { n: string }>)[mat]?.n.toLowerCase() ?? 'tubo'} a ${k} €/kg (tubo y chapa) + 60 € de tornillería`);
  }
  // running gear
  const ruedas = Array.isArray(m.ruedas) ? (m.ruedas as unknown[]).length : 4, rombo = !!m.rombo;
  if (/^Rueda delantera, freno y horquilla/.test(nombre)) {
    const kR = Math.max(1, kg - 5 - num('tMFreno', 1.2));
    return est(40 + 9 * kR + 70 + 150, `estimado: llanta y neumático (40 € + 9 €/kg × ${n1(kR)} kg), un freno de disco (70 €) y una horquilla (150 €)`);
  }
  if (/^(Ruedas|Llanta|Neumátic)/.test(nombre)) {
    const n = /delanteras|traseras/.test(nombre) ? 2 : Math.max(1, ruedas - (rombo ? 1 : 0)), porRueda = kg / n;
    return est(n * (40 + 9 * porRueda), `estimado: ${n} rueda${n > 1 ? 's' : ''} (llanta y neumático) a 40 € + 9 €/kg × ${n1(porRueda)} kg cada una`);
  }
  if (/^Frenos/.test(nombre)) {
    const n = /cuatro/.test(nombre) ? 4 : Math.max(1, ruedas - (rombo ? 1 : 0));
    return est(70 * n + 80, `estimado: ${n} frenos de disco hidráulicos a 70 € y la bomba y los latiguillos (80 €)`);
  }
  if (/^Suspensión (delantera|trasera)/.test(nombre)) return est(2 * 180, 'estimado: dos esquinas a 180 € (amortiguador con muelle 120 € y brazos 60 €)');
  if (/^Basculante y amortiguador/.test(nombre)) return est(260, 'estimado: brazo basculante (140 €) y amortiguador (120 €)');
  if (/^Pilares telescópicos/.test(nombre)) return est(4 * 160, 'estimado: cuatro pilares con muelle y amortiguador a 160 €');
  if (/^Paralelogramos/.test(nombre)) return est(kg * 25 + 120, `estimado: ${n1(kg)} kg de brazos a 25 €/kg y cojinetes (120 €)`);
  if (/^Dirección/.test(nombre)) return est(250, 'estimado: cremallera, columna y rótulas');
  // the tilt system (Rombo Bala and the Basculante)
  if (/^Basculación: balancín/.test(nombre)) return est(260, 'estimado: balancín de aluminio 7075 mecanizado con su eje y dos rodamientos');
  if (/^Basculación: bieletas/.test(nombre)) return est(70, 'estimado: dos bieletas de tubo con cuatro rótulas M10');
  if (/^(Basculación: actuador|Actuador)/.test(nombre)) return est(480, 'estimado: motor sin escobillas de 48 V con reductora planetaria y sin fin, y su codificador');
  if (/^Basculación: centralita/.test(nombre)) return est(250, 'estimado: centralita de seguridad de doble núcleo con bus CAN');
  if (/^Basculación: sensores/.test(nombre)) return est(160, 'estimado: unidad inercial de 6 ejes y tres codificadores de ángulo');
  if (/^Basculación: cableado/.test(nombre)) return est(40, 'estimado: cable, fusible y relé de corte');
  // powertrain: the catalogue's motor if the design picked one with a price, else by power
  if (/^Motor(es)? de buje/.test(nombre)) {
    const n = /dos/.test(nombre) ? 2 : 1, cat = motorDe(P.tCatMotor as string | undefined);
    if (cat?.precio && P.tCatMotor !== A_MEDIDA) return deCatalogo(`${cat.marca} ${cat.modelo}`, cat.precio, cat.montaje === 'buje' ? n : 1);
    const kW = num('tKWPico', num('qKWPico', 8)) / n;
    return est(n * (250 + 35 * kW), `estimado: ${n > 1 ? `${n} motores` : 'un motor'} de buje de ${n1(kW)} kW de pico a 250 € + 35 €/kW (los QS del catálogo cuestan de 330 a 770 €)`);
  }
  if (/^Controlador/.test(nombre)) {
    const kW = num('tKWPico', num('qKWPico', 8));
    return est(150 + 12 * kW, `estimado: 150 € + 12 €/kW × ${n1(kW)} kW de pico (un Kelly de su clase)`);
  }
  if (/^Motor: reductora/.test(nombre)) return est(380, 'estimado: reductora planetaria de su tamaño (las del catálogo no publican precio)');
  if (/^Motor de gasolina/.test(nombre)) {
    const cat = termicoDe(P.tCatTermico as string | undefined);
    if (cat?.precio && P.tCatTermico !== A_MEDIDA) return deCatalogo(`${cat.marca} ${cat.modelo}`, cat.precio, 1);
    const kW = num('tPhevKW', 10);
    return est(400 + 45 * kW, `estimado: motor de gasolina de ${n1(kW)} kW a 400 € + 45 €/kW, con su escape`);
  }
  if (/^Motor: (engranaje|generador|embrague|motor-generador)/.test(nombre)) return est(kg * 35, `estimado: ${n1(kg)} kg a 35 €/kg`);
  if (/^Depósito/.test(nombre)) return est(120, 'estimado: depósito, tapón y bomba (la gasolina no cuenta)');
  // energy
  if (/^Batería/.test(nombre)) {
    const kWh = typeof m.kWh === 'number' ? m.kWh : typeof (m.bateria as { kWh?: number } | undefined)?.kWh === 'number' ? (m.bateria as { kWh: number }).kWh : kg * 0.19;
    return est(kWh * EUR_KWH, `estimado: ${n1(kWh)} kWh a ${EUR_KWH} €/kWh (celdas, BMS, caja y cableado)`);
  }
  if (/^Varios/.test(nombre)) return est(600, 'estimado: cargador (300 €), cableado y fusibles (200 €), batería de 12 V y convertidor (100 €)');
  // interior
  if (/^Asientos/.test(nombre)) {
    const nA = Array.isArray(m.asientosFilas) && m.filas ? (m.asientosFilas as unknown[]).length : 2;
    return est(nA * 130, `estimado: ${nA} asientos a 130 € (carcasa, espuma y anclajes)`);
  }
  if (/^Volante y columna/.test(nombre)) return est(180, 'estimado: volante y columna (lo que cuestan de más que el manillar)');
  if (/^Volante, pedales/.test(nombre)) return est(450, 'estimado: volante, pedales y salpicadero');
  if (/^Salpicadero/.test(nombre)) return est(kg > 5 ? 750 : 450, 'estimado: salpicadero con una pantalla de 7″ y sus mandos');
  // doors, lights, mirrors
  if (/^Puertas de atrás/.test(nombre)) return est(120, 'estimado: bisagras, cierres y amortiguadores de las puertas de atrás');
  if (/^Puertas/.test(nombre)) return est(150, 'estimado: bisagras, cierres y amortiguadores de gas');
  if (/^Portón/.test(nombre)) return est(90, 'estimado: bisagras y dos amortiguadores de gas');
  if (/^Montantes/.test(nombre)) return est(60, 'estimado: insertos de aluminio y tela de refuerzo');
  if (/^Retrovisores/.test(nombre)) return est(60, 'estimado: dos retrovisores homologados');
  if (/^Faro/.test(nombre)) return est(90, 'estimado: un faro LED homologado');
  if (/^Barra de luz/.test(nombre)) return est(140, 'estimado: tira LED con su perfil, difusor y fuente');
  if (/^Luces, cámaras/.test(nombre)) return est(400, 'estimado: luces LED, cámaras de retrovisión y juntas');
  if (/^Ventilación/.test(nombre)) return est(180, 'estimado: ventilador, conductos y resistencia de desempañado');
  // anything else (trim, upholstery, belts…): by its weight
  if (/^(Interior|Tapicería|Cinturones|Forro)/.test(nombre)) return est(Math.max(10, kg * 30), `estimado: ${n1(kg)} kg a 30 €/kg (material de acabado)`);
  return est(Math.max(10, kg * 20), `estimado: ${n1(kg)} kg a 20 €/kg (una pieza de su clase)`);
}

/** The editor's range: up to three times the default (at least 100 €), in steps that suit the size. */
function rango(e: number): { max: number; paso: number } {
  const max = Math.max(100, e * 3), paso = max > 5000 ? 50 : max > 1000 ? 10 : max > 200 ? 5 : 1;
  return { max: Math.ceil(max / paso) * paso, paso };
}

/** The price of one part of the mass model (by its name, as the section lists it). */
export function precioParte(p: PartePeso, cx: ContextoPrecio): PrecioParte {
  const e = estimar(p.nombre, p.kg, cx), propio = cx.P.precios?.[p.nombre];
  const usa = typeof propio === 'number' && Number.isFinite(propio) && propio >= 0;
  return { nombre: p.nombre, kg: p.kg, eur: usa ? propio : e.eur, estimado: e.eur, propio: usa, origen: e.origen ?? 'estimado', como: e.como, ...rango(e.eur) };
}

const suma = (ps: { eur: number }[]) => ps.reduce((a, p) => a + p.eur, 0);

/** Every section's, department's and the vehicle's price, from the sections of the mass model. */
export function preciosDiseno(ps: PesosSecciones, cx: ContextoPrecio): PreciosDiseno {
  const cache = new Map<string, PrecioParte>();
  const precio = (p: PartePeso) => { let r = cache.get(p.nombre); if (!r) { r = precioParte(p, cx); cache.set(p.nombre, r); } return r; };
  const out: PreciosDiseno = { secciones: {}, sinSeccion: {}, porDep: {}, total: 0, propios: 0 };
  for (const [k, s] of Object.entries(ps.secciones)) {
    const partes = s.partes.map(precio);
    out.secciones[k] = { eur: suma(partes), tipo: s.tipo, partes };
    if (s.tipo === 'propia') { const d = k.split('|')[0] as DepPeso; out.porDep[d] = (out.porDep[d] ?? 0) + out.secciones[k].eur; }
  }
  for (const [d, l] of Object.entries(ps.sinSeccion) as [DepPeso, PartePeso[]][]) {
    out.sinSeccion[d] = l.map(precio);
    out.porDep[d] = (out.porDep[d] ?? 0) + suma(out.sinSeccion[d]!);
  }
  out.total = Object.values(out.porDep).reduce((a, b) => a + (b ?? 0), 0);
  out.propios = [...cache.values()].filter(p => p.propio).length;
  return out;
}

/** One section's price, or null (no parts). */
export function precioSeccion(p: PreciosDiseno | null, dep: string, bloque: string): PrecioSeccion | null {
  const s = p?.secciones[clave(dep, bloque)];
  return s && s.partes.length ? s : null;
}

/** «4,8 kg · 120 €» for a section's header: the weight's text with the price after it. */
export const textoPesoPrecio = (peso: string | null, s: PrecioSeccion | null) => (peso ? (s ? `${peso} · ${eur(s.eur)}` : peso) : s ? eur(s.eur) : null);

/** A copy of the design's own prices with one part's price set (null: back to the estimate). */
export function conPrecio(P: Parametros, nombre: string, v: number | null): Record<string, number> | undefined {
  const o = { ...(P.precios ?? {}) };
  if (v == null) delete o[nombre]; else o[nombre] = Math.max(0, Math.round(v));
  return Object.keys(o).length ? o : undefined;
}
