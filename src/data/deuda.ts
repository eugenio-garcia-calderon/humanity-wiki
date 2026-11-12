// The «Deuda» window (Eugenio, 2026-11-12): Spain's public debt and the
// regions', split into capital and interest; its history and how it has been
// abused; and the proposal — a public system that cannot borrow, projects with
// a return financed outside it, and a surplus kept in a contingency box that
// never goes below zero, fed by at least a fifth of every scale's free third.
//
// Every figure carries a source id from `FUENTES` (modeloSocioeconomico.ts);
// what is computed here says so.
import { ESPANA, ESCALAS, HOY, RESERVA_MIN_LIBRE, cuentasPais, type Modo } from './modeloSocioeconomico';

const PIB = ESPANA.pib; // M€, 2025

/** Debt at the end of 2025, in % of GDP (Banco de España, PDE definition). */
export const DEUDA_PCT = { central: 79.2, ccaa: 20.2, local: 1.2, total: 100.7 }; // deuda-2025
/** In millions of euros. Regions: published; the rest computed from % of GDP. */
export const DEUDA = {
  total: (DEUDA_PCT.total / 100) * PIB,
  central: (DEUDA_PCT.central / 100) * PIB,
  ccaa: 341_642, // deuda-ccaa-2025
  local: (DEUDA_PCT.local / 100) * PIB,
};

export interface Deudor { id: 'central' | 'ccaa' | 'local'; nombre: string; quien: string; escala: string; deuda: number; pct: number; fuente: string }
export const DEUDORES: Deudor[] = [
  { id: 'central', nombre: 'Estado y Seguridad Social', quien: 'El Gobierno de España, sus organismos y la caja de las pensiones', escala: 'Nación', deuda: DEUDA.central, pct: DEUDA_PCT.central, fuente: 'deuda-2025' },
  { id: 'ccaa', nombre: 'Comunidades autónomas', quien: 'Las diecisiete comunidades', escala: 'Región', deuda: DEUDA.ccaa, pct: DEUDA_PCT.ccaa, fuente: 'deuda-ccaa-2025' },
  { id: 'local', nombre: 'Ayuntamientos y diputaciones', quien: 'Municipios, diputaciones, cabildos y consejos insulares', escala: 'Municipio y provincia', deuda: DEUDA.local, pct: DEUDA_PCT.local, fuente: 'deuda-2025' },
];

/** What a year of debt costs. M€. */
export const PAGOS = {
  intereses: HOY.intereses2025, // 40.314 M€ in 2025, all administrations (intereses-2025)
  /** The State's debt that falls due in 2026, paid by issuing new debt (tesoro-2026). */
  vencimientosEstado: 285_693 - 55_000,
  emisionBrutaEstado: 285_693,
  emisionNetaEstado: 55_000,
  /** Regions' interest: 3.608 M€ in 2022, 11.789 M€ in 2028 if everything is refinanced (Fedea, intereses-ccaa). */
  interesesCCAA2022: 3_608,
  interesesCCAA2028: 11_789,
  /** Regional debt the State takes over (condonacion), and what regions owed the State in 2023 (fla-deuda). */
  condonacion: 83_252,
  debenAlEstado2023: 191_750,
  /** Deficit 2025: spending minus revenue, % of GDP (bde-ingresos). */
  deficitPct: HOY.gastoPublicoPct2025 - HOY.ingresosPublicosPct2025,
};
export const TIPO_MEDIO = PAGOS.intereses / DEUDA.total; // computed: interest paid / debt

/** Debt as % of GDP over time: a few dated points, each with its source. */
export const HISTORIA_PCT: { ano: number; pct: number; nota: string; fuente: string }[] = [
  { ano: 1980, pct: 17, nota: '16.000 M€', fuente: 'deuda-1980' },
  { ano: 1992, pct: 45.4, nota: 'año de la Expo y los Juegos', fuente: 'deuda-1980' },
  { ano: 1996, pct: 67.5, nota: 'tras la crisis del 93', fuente: 'deuda-1980' },
  { ano: 2007, pct: 35.6, nota: 'con superávit', fuente: 'deuda-2007' },
  { ano: 2016, pct: 99.0, nota: 'tras la crisis financiera', fuente: 'deuda-2007' },
  { ano: 2020, pct: 120, nota: 'pandemia y Sareb', fuente: 'deuda-2020' },
  { ano: 2021, pct: 125.3, nota: 'máximo histórico', fuente: 'deuda-2021' },
  { ano: 2025, pct: 100.7, nota: '1,70 billones', fuente: 'deuda-2025' },
];

/** How the debt has been abused: what happened, and what the proposal does instead. */
export const ABUSOS: { id: string; t: string; d: string; fuentes: string[]; remedio: string }[] = [
  { id: 'eterna', t: 'Una deuda que nunca se devuelve',
    d: 'Cada año vence una parte y se paga pidiendo otra vez prestado. En 2026 el Estado devuelve unos 230.700 M€ emitiendo 285.700 M€: devuelve, y además debe 55.000 M€ más.',
    fuentes: ['tesoro-2026'], remedio: 'Ninguna administración puede pedir prestado: lo que vence de la deuda heredada se paga y no se renueva.' },
  { id: 'corriente', t: 'Préstamos para pagar el día a día',
    d: 'La deuda se pidió sobre todo para cubrir déficits, no para invertir: en las comunidades, entre 2003 y 2025 el gasto corriente creció y la inversión cayó a la mitad.',
    fuentes: ['ccaa-bbva'], remedio: 'Solo se financian proyectos concretos que dan un servicio o generan un ahorro, y fuera del sistema público.' },
  { id: 'crisis', t: 'Sube en cada crisis y no baja en las bonanzas',
    d: 'En 2007 había superávit y la deuda era del 35,6 % del PIB. Con la crisis financiera llegó al 99 % en 2016, y con la pandemia al 125 % en 2021. En 2025 sigue por encima del 100 %.',
    fuentes: ['superavit-2007', 'deuda-2007', 'deuda-2021', 'deuda-2025'], remedio: 'Las crisis se pagan con la caja de contingencias, ahorrada antes, que nunca baja de cero.' },
  { id: 'rescates', t: 'Rescates que cambian la deuda de mano',
    d: 'En 2012 el Estado creó el Fondo de Liquidez Autonómico para prestar a las comunidades que ya no conseguían crédito; en 2023 le debían 191.750 M€. Ahora el Estado asume 83.252 M€ de esa deuda: no desaparece, la pagan todos.',
    fuentes: ['fla-2012', 'fla-deuda', 'condonacion'], remedio: 'Una escala puede ayudar a otra con lo que tiene ahorrado, en préstamos al IPC o donaciones, nunca con dinero prestado.' },
  { id: 'privada', t: 'Pérdidas privadas convertidas en deuda pública',
    d: 'La Sareb, el banco que se quedó con los inmuebles de las cajas rescatadas, pasó a contar como deuda pública en 2020: tres puntos del PIB de golpe.',
    fuentes: ['sareb-2020'], remedio: 'Lo que financia un proyecto privado lo arriesga quien presta: si sale mal, pierde él, no el contribuyente.' },
  { id: 'prioridad', t: 'La deuda antes que todo lo demás',
    d: 'Desde 2011 la Constitución (artículo 135) dice que pagar los intereses y el capital de la deuda tiene «prioridad absoluta» sobre cualquier otro gasto.',
    fuentes: ['art-135'], remedio: 'Sin deuda no hay a quién dar prioridad: lo primero vuelven a ser los servicios.' },
];

/** Today against the proposal, row by row. */
export const COMPARA: { t: string; hoy: string; propuesta: string }[] = [
  { t: '¿Puede la administración pedir prestado?', hoy: 'Sí, sin fecha de devolución: lo que vence se renueva.', propuesta: 'No. Ninguna escala puede tener deuda.' },
  { t: 'Un proyecto que da servicio (un tranvía, placas solares)', hoy: 'Se paga con deuda pública, aunque el proyecto no devuelva nada.', propuesta: 'Lo financian personas, cooperativas o bancos fuera del sistema público, y lo devuelve con lo que cobra o con lo que ahorra.' },
  { t: 'Si el proyecto sale mal', hoy: 'Lo pagan los contribuyentes, con intereses.', propuesta: 'Pierde quien prestó. Lo público solo paga el servicio que recibe.' },
  { t: 'Un desastre o una crisis', hoy: 'Más déficit y más deuda: del 2,9 % al 11 % del PIB en 2020.', propuesta: 'Se paga con la caja de contingencias, que se llenó antes.' },
  { t: 'Cada año', hoy: `Déficit: se gasta más de lo que se ingresa.`, propuesta: 'Superávit: al menos una quinta parte del tercio libre de cada escala va a la caja.' },
  { t: 'Intereses', hoy: 'Unos 40.300 M€ al año.', propuesta: 'Cero. El dinero ahorrado puede dar rendimiento a la caja.' },
  { t: 'Lo que se deja a los que vienen', hoy: 'Una deuda que pagarán sus impuestos.', propuesta: 'Una caja con ahorros y ninguna deuda.' },
];

/** The contingency box in the proposal: at least a fifth of the free third of every scale. */
export function caja(modo: Modo = 'literal', parte = RESERVA_MIN_LIBRE) {
  const pais = cuentasPais(modo);
  const porEscala = (pais.porEscala / 3) * parte; // M€ a year, each scale across Spain
  return { porEscala, total: porEscala * ESCALAS.length, porPersona: (porEscala * ESCALAS.length * 1e6) / ESPANA.poblacion };
}

/** The pandemic's extra deficit, for scale: from 2,9 % to 11 % of GDP (deficit-2020), at today's GDP. */
export const PANDEMIA = ((11 - 2.9) / 100) * PIB;

/**
 * Paying off the inherited debt: a fixed amount a year, interest at today's
 * average rate. Returns the years it takes and the interest paid on the way,
 * or null if the amount does not even cover the interest.
 */
export function amortizar(pagoAnual: number, deuda = DEUDA.total, tipo = TIPO_MEDIO) {
  let d = deuda, intereses = 0, anos = 0;
  if (pagoAnual <= d * tipo) return null;
  while (d > 0 && anos < 200) {
    const i = d * tipo;
    intereses += i;
    d = d + i - pagoAnual;
    anos++;
  }
  return { anos, intereses };
}
