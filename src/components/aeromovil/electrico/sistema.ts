/**
 * The Triciclo family's electrical system, sized from the design (2026-11-17, «consumos»): system voltage, cells in
 * series, the solar strings and one MPPT per string, BMS, on-board charger, DC-DC, inlet, contactors, fuse, precharge,
 * service disconnect, high-voltage wiring and the 12 V battery. Each picks the first catalogue part
 * (`catalogo.ts`) that fits; when none fits, the part is null and its check fails, which is the honest answer.
 *
 * Masses: these parts are what the «Varios: cargador, cables, luces, 12 V» slider (`tMVarios`) has always stood for.
 * They do NOT add to the vehicle: `desgloseVarios` splits that slider's mass into them (remainder: lights and the rest),
 * so every saved design weighs, rolls and ranges exactly as before. When the parts weigh more than the slider, the split
 * is scaled down to it with a warning and a check says how far to raise «Varios». The solar panels keep their own part
 * («Paneles solares», `tSolarM2`); the motor controller is counted in Motor (`tMInversor`).
 *
 * Efficiencies: the consumption at the battery does not change. What the parts add is the consumption at the plug (the
 * charger's losses) and the breakdown of the solar estimate's 85 % (the MPPT's share of it).
 */
import { RENDIMIENTO_SOLAR, type ModeloTriciclo, type Resultados } from '../geometria';
import { AUXILIARES, KWH_LITRO_GASOLINA, limitarTriciclo } from '../geometriaTriciclo';
import { controladorDe, precioEuros, type Precio } from '../catalogoTren';
import type { PartePeso } from '../masasSecciones';
import {
  BATERIA_12, BMSS, CARGADORES, CELULA, CONTACTOR, DCDCS, GENERICOS, MPPTS, SECCIONES_CABLE, TOMA, kgMetroCable, kgOrion,
  type PiezaElectrica,
} from './catalogo';

/** Where a part's mass is counted: split out of «Varios», in the solar panels' own part, or in Motor. */
export type CuentaEn = 'Varios' | 'Techo solar' | 'Motor';
export interface ComponenteElectrico {
  id: string;
  /** what it does, in Spanish («Regulador solar MPPT del techo») */
  funcion: string;
  pieza: PiezaElectrica | null;
  cantidad: number;
  /** mass of one (kg): the published one, or the estimate; and whether it is an estimate */
  kgUd: number; kgEstimado: boolean;
  kg: number;
  cuentaEn: CuentaEn;
  /** why this size, in Spanish, with this design's numbers */
  dimensionado: string;
  precio: Precio | null;
}
export interface ComprobacionElectrica { nombre: string; holgura: number; minimo: number; mostrar?: string; dep: 'energia' }
export interface CadenaSolar {
  zona: string; area: number; celulas: number; vmp: number; voc: number; imp: number; wpCelulas: number; wpEditor: number; cadenas: number; mppt: PiezaElectrica | null;
  /** zones joined in series to this string, or the zone this one is joined to (then it has no MPPT of its own) */
  unidas?: CadenaSolar[]; enSerieCon?: string;
}

export interface SistemaElectrico {
  tension: number; origenTension: string;
  quimica: 'NMC' | 'LFP'; serie: number; vMin: number; vMax: number;
  /** battery current at the motor's nominal and peak power (A) */
  aCont: number; aPico: number;
  solar: CadenaSolar[];
  componentes: ComponenteElectrico[];
  /** the mass the parts split out of «Varios» need, and what «Varios» holds (kg) */
  kgVariosNecesario: number; kgVarios: number;
  /** charging: hours from empty with the on-board charger at full power and with a household socket (Schuko, 10 A) */
  horasCarga: number | null; horasSchuko: number | null;
  rendCargador: number | null; rendMppt: number | null; rendDcdc: number | null;
  comprobaciones: ComprobacionElectrica[];
}

const f1 = (v: number, d = 1) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const kgDe = (p: PiezaElectrica) => p.kg ?? p.kgEstimado ?? 0;
/** Household socket (Schuko) through a mode-2 cable: 10 A × 230 V. */
export const W_SCHUKO = 2300;

export function sistemaElectrico(m: ModeloTriciclo, res: Resultados): SistemaElectrico {
  const T = m.campos, L = (k: Parameters<typeof limitarTriciclo>[0]) => limitarTriciclo(k, T);
  const kWPico = L('tKWPico'), kWNom = L('tKWNom');
  // system voltage: the chosen controller's, or a rule by peak power (a small car runs 48 V, a fast one 96 V)
  const ctrl = controladorDe(T.tCatCtrl);
  const tension = ctrl?.vNom ?? (kWPico <= 12 ? 48 : kWPico <= 25 ? 72 : 96);
  const origenTension = ctrl?.vNom ? `la del controlador elegido (${ctrl.marca} ${ctrl.modelo})` : `supuesta por la potencia de pico (${f1(kWPico)} kW): 48 V hasta 12 kW, 72 V hasta 25 kW, 96 V por encima. Al elegir un controlador en Motor, manda la suya`;
  // chemistry from the pack's density: above 170 Wh/kg of pack only NMC gets there
  const quimica: 'NMC' | 'LFP' = T.tWhKg >= 170 ? 'NMC' : 'LFP';
  const [vNomC, vMaxC, vMinC] = quimica === 'NMC' ? [3.65, 4.2, 3.0] : [3.2, 3.65, 2.5];
  const serie = Math.round(tension / vNomC), vMin = serie * vMinC, vMax = serie * vMaxC;
  const aCont = kWNom * 1000 / tension, aPico = kWPico * 1000 / tension;
  const comps: ComponenteElectrico[] = [];
  const out: ComprobacionElectrica[] = [];
  const c = (nombre: string, holgura: number, minimo: number, mostrar?: string) => out.push({ dep: 'energia', nombre, holgura, minimo, mostrar });
  const poner = (id: string, funcion: string, pieza: PiezaElectrica | null, cantidad: number, cuentaEn: CuentaEn, dimensionado: string, kgUd?: number) => {
    const ku = kgUd ?? (pieza ? kgDe(pieza) : 0);
    comps.push({ id, funcion, pieza, cantidad, kgUd: ku, kgEstimado: kgUd == null && !!pieza && pieza.kg == null, kg: ku * cantidad, cuentaEn, dimensionado, precio: pieza?.precio ?? null });
  };

  // ── solar: one string per zone (they face different ways: each needs its own tracker), one MPPT per string
  const zonas: [string, number][] = [['Techo (sobre la cúpula)', m.solar?.area ?? 0], ['Cola', m.solarCola?.area ?? 0], ['Morro', m.solarMorro?.area ?? 0]];
  const solar: CadenaSolar[] = [];
  // the first catalogue MPPT that takes `celulas` cells, in 1 to 4 strings of equal length
  const elegirMppt = (celulas: number): { mppt: PiezaElectrica | null; cadenas: number } => {
    for (let k = 1; k <= 4; k++) {
      const n = Math.floor(celulas / k), vmp = n * CELULA.vmp, voc = n * CELULA.voc, w = n * CELULA.wp;
      for (const p of MPPTS) {
        if (p.vEntMax == null || p.a == null || p.vBatMin == null || p.vBatMax == null) continue;   // inputs not published: not chosen automatically
        if (tension < p.vBatMin || tension > p.vBatMax) continue;
        if (voc > p.vEntMax || (p.boost && CELULA.imp > p.a)) continue;
        if (p.boost ? vmp >= vMin * 0.95 || vmp < (p.vEntMin ?? 0) : vmp < vMax + 5) continue;
        if (p.w != null && w > p.w) continue;
        return { mppt: p, cadenas: k };
      }
    }
    return { mppt: null, cadenas: 1 };
  };
  for (const [zona, area] of zonas) {
    if (area < 0.05) continue;
    // cells laid on a curved skin: 90 % of the area is cell (the rest, gaps and edges)
    const celulas = Math.max(1, Math.floor(area * 0.9 / CELULA.area));
    solar.push({ zona, area, celulas, vmp: 0, voc: 0, imp: CELULA.imp, wpCelulas: celulas * CELULA.wp, wpEditor: area * RENDIMIENTO_SOLAR * 1000, cadenas: 1, mppt: null });
  }
  // a zone too small for any tracker on its own (the nose's few cells) goes in series with the roof's string: it then
  // loses some when the sun does not reach both alike, which is the price of not carrying one more MPPT
  const base = solar[0];
  for (const s of solar) s.mppt = elegirMppt(s.celulas).mppt;
  for (const s of solar.slice(1)) {
    if (s.mppt || !base) continue;
    const juntas = elegirMppt(base.celulas + (base.unidas ?? []).reduce((a, u) => a + u.celulas, 0) + s.celulas);
    if (juntas.mppt) { (base.unidas ??= []).push(s); s.enSerieCon = base.zona; }
  }
  for (const s of solar) {
    if (s.enSerieCon) { s.mppt = null; continue; }
    const total = s.celulas + (s.unidas ?? []).reduce((a, u) => a + u.celulas, 0), e = elegirMppt(total), n = Math.floor(total / e.cadenas);
    Object.assign(s, { mppt: e.mppt, cadenas: e.cadenas, vmp: n * CELULA.vmp, voc: n * CELULA.voc });
  }
  for (const s of solar) {
    if (s.enSerieCon) continue;
    const total = s.celulas + (s.unidas ?? []).reduce((a, u) => a + u.celulas, 0);
    const donde = s.unidas?.length ? `${s.zona.toLowerCase()} y ${s.unidas.map(u => u.zona.toLowerCase()).join(' y ')} en serie` : s.zona.toLowerCase();
    const txt = `${total} células (${donde}) en ${s.cadenas === 1 ? 'una cadena' : `${s.cadenas} cadenas`} de ${Math.floor(total / s.cadenas)} en serie: ${f1(s.vmp, 0)} V y ${f1(s.imp)} A en su punto de máxima potencia (${f1(s.voc, 0)} V en vacío), para una batería de ${tension} V`;
    poner(`mppt-${s.zona}`, `Regulador solar MPPT · ${donde}`, s.mppt, s.cadenas, 'Varios', s.mppt ? `${txt}. ${s.mppt.boost ? 'Elevador: el panel da menos tensión que la batería.' : 'Reductor: el panel da más tensión que la batería.'}${s.unidas?.length ? ` ${s.unidas.map(u => u.zona).join(' y ')}: pocas células para un regulador propio; en serie con esta cadena pierde algo cuando el sol no les da igual.` : ''}` : `${txt}. Ningún regulador del catálogo sirve para esta cadena y esta batería.`);
    c(`Solar (${donde}): hay regulador MPPT para ${f1(s.vmp, 0)} V de panel y ${tension} V de batería`, s.mppt ? 1 : -1, 0, s.mppt ? `${s.mppt.marca} ${s.mppt.modelo}${s.cadenas > 1 ? ` × ${s.cadenas}` : ''}` : 'ninguno del catálogo: uno a medida o otra tensión');
  }
  if (solar.length) poner('celulas', 'Células solares (los paneles)', CELULA, solar.reduce((a, s) => a + s.celulas, 0), 'Techo solar',
    `${f1(res.areas.solar, 2)} m² de panel; ${solar.map(s => `${s.zona.toLowerCase()} ${s.celulas}`).join(', ')}. En placa ${f1(solar.reduce((a, s) => a + s.wpCelulas, 0), 0)} W; el editor cuenta ${f1(res.solarPico, 0)} W (células al ${Math.round(RENDIMIENTO_SOLAR * 100)} %, más prudente). Su masa es la de «Paneles solares» (kg por m²), no se cuenta aparte.`, 0);

  // ── BMS
  const bms = serie <= (BMSS[0].celdasMax ?? 0) && aPico <= (BMSS[0].a ?? 0) ? BMSS[0] : BMSS[1];
  poner('bms', 'Gestor de la batería (BMS)', bms, 1, 'Varios', `${serie} celdas ${quimica} en serie (${f1(vMin, 0)}–${f1(vMax, 0)} V); ${f1(aPico, 0)} A de pico de batería.${bms.id === 'orion-bms2' ? ' Con más de 24 celdas o 100 A, un BMS que mande contactores.' : ''}`, bms.id === 'orion-bms2' ? kgOrion(serie) : undefined);
  c(`BMS: vigila las ${serie} celdas en serie`, (bms.celdasMax ?? 0) - serie, 0, `${serie} de ${bms.celdasMax}`);

  // ── on-board charger
  const obc = CARGADORES.find(p => (p.vBatMin ?? 0) <= vMin && (p.vBatMax ?? 0) >= vMax) ?? null;
  poner('obc', 'Cargador a bordo (de alterna a la batería)', obc, 1, 'Varios', obc ? `Carga de ${f1(vMin, 0)} a ${f1(vMax, 0)} V; ${f1(obc.w! / 1000)} kW.` : `Ninguno del catálogo cubre ${f1(vMin, 0)}–${f1(vMax, 0)} V.`);
  c(`Cargador a bordo: cubre la tensión de la batería (${f1(vMin, 0)}–${f1(vMax, 0)} V)`, obc ? Math.min(vMin - obc.vBatMin!, obc.vBatMax! - vMax) : -1, 0, obc ? `${obc.vBatMin}–${obc.vBatMax} V` : 'ninguno');
  const rendCargador = obc?.rendimiento ?? null;
  const horasCarga = obc && obc.w ? m.kWh * 1000 / (obc.w * (rendCargador ?? 0.9)) : null;
  const horasSchuko = obc && obc.w ? m.kWh * 1000 / (Math.min(obc.w, W_SCHUKO) * (rendCargador ?? 0.9)) : null;
  if (obc && obc.a != null) c('Cargador: corriente de carga para la batería (hasta 1 C)', m.kWh * 1000 / tension - obc.a, 0, `${f1(obc.a, 0)} A · la batería admite ~${f1(m.kWh * 1000 / tension, 0)} A`);

  // ── charge inlet
  poner('toma', 'Toma de carga (Tipo 2)', TOMA, 1, 'Varios', `${f1(TOMA.a!, 0)} A de alterna: de sobra para los ${obc?.w ? f1(obc.w / 230, 0) : '—'} A del cargador a 230 V.`);

  // ── DC-DC
  const dcdc = DCDCS.find(p => (p.vEntMin ?? 0) <= vMin && (p.vEntMax ?? 0) >= vMax) ?? null;
  const a12 = AUXILIARES / 12;
  poner('dcdc', 'Convertidor DC-DC a 12 V', dcdc, 1, 'Varios', dcdc ? `Entrada ${dcdc.vEntMin}–${dcdc.vEntMax} V para una batería de ${f1(vMin, 0)}–${f1(vMax, 0)} V; ${AUXILIARES} W de equipos son ${f1(a12, 1)} A a 12 V.` : `Ninguno del catálogo admite ${f1(vMin, 0)}–${f1(vMax, 0)} V de entrada.`);
  c(`DC-DC: admite la tensión de la batería (${f1(vMin, 0)}–${f1(vMax, 0)} V)`, dcdc ? Math.min(vMin - dcdc.vEntMin!, dcdc.vEntMax! - vMax) : -1, 0, dcdc ? `${dcdc.vEntMin}–${dcdc.vEntMax} V` : 'ninguno');
  if (dcdc?.a != null) c(`DC-DC: corriente para los equipos (${AUXILIARES} W)`, dcdc.a - a12, 0, `${f1(a12, 1)} de ${dcdc.a} A`);

  // ── switching and protection
  poner('contactores', 'Contactores (positivo y negativo)', CONTACTOR, 2, 'Varios', `${f1(aCont, 0)} A continuos y ${f1(aPico, 0)} A de pico; cada uno aguanta ${CONTACTOR.a} A.`);
  c('Contactores: corriente continua de la batería', CONTACTOR.a! - aCont, 0, `${f1(aCont, 0)} de ${CONTACTOR.a} A`);
  for (const g of GENERICOS) {
    const extra = g.id === 'fusible' ? ` Para unos ${Math.ceil(aPico * 1.25 / 50) * 50} A (el pico de batería × 1,25).` : '';
    poner(g.id, g.modelo, g, 1, 'Varios', `${g.notas ?? ''}${extra}`);
  }

  // ── high-voltage wiring: the section by the continuous current, two conductors from the pack to the controller and
  // the charger (a run of 60 % of the car plus 1 m; estimate by rule)
  const seccion = (SECCIONES_CABLE.find(([, a]) => a >= aCont) ?? SECCIONES_CABLE[SECCIONES_CABLE.length - 1])[0];
  const metros = 2 * (0.6 * m.F.LARGO + 1);
  poner('cableado', `Cable naranja de alta tensión (${seccion} mm²) y conectores`, { id: 'cable', tipo: 'cableado', marca: 'Por elegir', modelo: `Cable de ${seccion} mm² de doble aislamiento`, generico: true, fuente: null, tipoFuente: null, leido: '2026-11-17', kg: null, kgEstimado: kgMetroCable(seccion), notaKg: 'cobre (8,96 kg/dm³) más un 25 % de aislamiento', rendimiento: null, precio: null },
    1, 'Varios', `${f1(metros, 1)} m (dos conductores, del paquete al controlador y al cargador) de ${seccion} mm² para ${f1(aCont, 0)} A continuos: ${f1(kgMetroCable(seccion), 2)} kg/m.`, kgMetroCable(seccion) * metros);

  // ── 12 V battery
  poner('bat12', 'Batería auxiliar de 12 V', BATERIA_12, 1, 'Varios', BATERIA_12.notas ?? '');

  // ── the motor controller: listed, counted in Motor
  const kgCtrl = L('tMInversor');
  comps.push({ id: 'controlador', funcion: 'Controlador del motor (inversor)', pieza: null, cantidad: 1, kgUd: kgCtrl, kgEstimado: false, kg: kgCtrl, cuentaEn: 'Motor',
    dimensionado: ctrl ? `${ctrl.marca} ${ctrl.modelo}, elegido en Motor › Motor eléctrico; su masa es la del deslizador «controlador».` : 'Se elige en Motor › Motor eléctrico (catálogo de controladores); su masa es la del deslizador «controlador», que cuenta en Motor.',
    precio: null });

  const kgVarios = L('tMVarios');
  const kgVariosNecesario = comps.filter(x => x.cuentaEn === 'Varios').reduce((a, x) => a + x.kg, 0);
  c('«Varios» pesa lo que el sistema eléctrico de catálogo', kgVarios - kgVariosNecesario, 0, `${f1(kgVariosNecesario)} kg de piezas · «Varios» ${f1(kgVarios)} kg${kgVariosNecesario > kgVarios ? ` (súbelo a ${Math.ceil(kgVariosNecesario + 1)} kg con las luces)` : ''}`);
  const mppts = solar.filter(s => s.mppt?.rendimiento != null);
  const rendMppt = mppts.length ? mppts.reduce((a, s) => a + s.mppt!.rendimiento! * s.area, 0) / mppts.reduce((a, s) => a + s.area, 0) : null;
  return {
    tension, origenTension, quimica, serie, vMin, vMax, aCont, aPico, solar, componentes: comps, kgVariosNecesario, kgVarios,
    horasCarga, horasSchuko, rendCargador, rendMppt, rendDcdc: dcdc?.rendimiento ?? null, comprobaciones: out,
  };
}

/**
 * «Varios» split into the electrical parts (masasSecciones.ts): adds up to the slider's mass exactly. The remainder is
 * the lights, screen, locks and the rest; when the parts weigh more, they are scaled down to it and the note says so.
 */
export function desgloseVarios(kgVarios: number, s: SistemaElectrico): PartePeso[] {
  const ps = s.componentes.filter(x => x.cuentaEn === 'Varios' && x.kg > 0);
  const total = ps.reduce((a, x) => a + x.kg, 0);
  const k = total > kgVarios ? kgVarios / total : 1;
  const out: PartePeso[] = ps.map(x => ({
    nombre: `${x.funcion}${x.cantidad > 1 ? ` (× ${x.cantidad})` : ''}`, kg: x.kg * k,
    nota: `${x.pieza ? `${x.pieza.marca} ${x.pieza.modelo}` : 'ninguno del catálogo'}${x.kgEstimado ? ' · masa estimada' : ''}${k < 1 ? ` · ${f1(x.kg, 2)} kg de catálogo, escalado a lo que da «Varios»` : ''}`,
  }));
  const resto = kgVarios - out.reduce((a, p) => a + p.kg, 0);
  out.push({ nombre: 'Luces, pantalla, cierre y el resto', kg: Math.max(0, resto), nota: k < 1 ? `«Varios» (${f1(kgVarios)} kg) no llega para las piezas de catálogo (${f1(total)} kg): súbelo en Batería › Varios` : 'lo que queda de «Varios»' });
  // the remainder makes the sum exact (floating point)
  out[out.length - 1].kg += kgVarios - out.reduce((a, p) => a + p.kg, 0);
  return out;
}

/** Total price of the listed parts in euros (only those with a price), and how many have none. */
export function precioSistema(s: SistemaElectrico) {
  let eur = 0, sin = 0;
  for (const x of s.componentes) { if (x.cuentaEn === 'Motor' || x.cuentaEn === 'Techo solar') continue; const p = precioEuros(x.precio); if (p == null) sin++; else eur += p * x.cantidad; }
  return { eur, sin };
}

/** kWh/100 km → litres of petrol with the same energy per 100 km (8,9 kWh per litre, the hybrid's own figure). */
export const litrosEquivalentes = (kWh100: number) => kWh100 / KWH_LITRO_GASOLINA;
