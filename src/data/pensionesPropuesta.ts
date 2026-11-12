// ============================================================================
// THE PENSION PROPOSAL (2026-11-12, Eugenio)
// ============================================================================
// «Que la pensión sea el salario mínimo, que no haya pensión ni máxima ni
// mínima: un único número, para reducir la complejidad y la desigualdad entre
// pensionistas y trabajadores, y fomentar el ahorro privado. Quien necesite más
// (carga familiar, riesgo de exclusión, de desahucio) lo pide a los servicios
// sociales, como una partida aparte. Pon el salario mínimo actual, sin
// modificarlo. Y que las cotizaciones evolucionen poco a poco hacia un fondo
// que invierte y paga las pensiones del futuro con su rendimiento.»
//
// Every figure here carries a source id from `FUENTES`; what is an assumption
// says so and is editable on the page (`SUPUESTOS`), never hidden in a total.
import { HOY } from './modeloSocioeconomico';
import { TRAMOS_PENSION, NOMINA_PENSIONES_MES, TOTAL_PENSIONES_CONTRIBUTIVAS, type TramoPension } from './presupuestos';

const M = 1e6;

/** Salario mínimo interprofesional 2026: 1.221 € in 14 payments (smi-2026). */
export const SMI_MES = 1_221;
export const PAGAS = 14;
export const SMI_ANO = SMI_MES * PAGAS; // 17.094 €

/** People, not pensions: «cerca de 9,5 millones de pensionistas» (pensiones-junio). */
export const PENSIONISTAS = 9_500_000;
/** Non-contributory pensions, March 2026 (pnc-2026), 628,80 € × 14. */
export const PNC = 464_287;
export const PNC_ANO = 8_803.20;

// ── TODAY vs THE PROPOSAL, PER YEAR ─────────────────────────────────────────
/** Contributory payroll × 14 payments + non-contributory pensions, in €. */
export const COSTE_HOY = NOMINA_PENSIONES_MES * PAGAS + PNC * PNC_ANO;
/** One pension per person, the minimum wage, for everyone who gets one today. */
export const PERSONAS_PROPUESTA = PENSIONISTAS + PNC;
export const COSTE_PROPUESTA = PERSONAS_PROPUESTA * SMI_ANO;
export const AHORRO_BRUTO = COSTE_HOY - COSTE_PROPUESTA;
/** About one million people get two pensions (pensions minus pensioners). */
export const PERSONAS_CON_DOS = TOTAL_PENSIONES_CONTRIBUTIVAS - PENSIONISTAS;
/** The saving in two steps: every pension to the minimum wage, then one per person. */
export const AHORRO_IGUALAR = COSTE_HOY - (TOTAL_PENSIONES_CONTRIBUTIVAS + PNC) * SMI_ANO;
export const AHORRO_UNA_POR_PERSONA = PERSONAS_CON_DOS * SMI_ANO;
/** Non-contributory pensioners: from 628,80 € to the minimum wage. */
export const SUBIDA_PNC = SMI_MES - PNC_ANO / PAGAS;
/** Net pay of a minimum-wage worker: the wage minus the worker's contributions (no IRPF at this level). */
export const SMI_NETO_TRABAJADOR = SMI_MES * (1 - (0.0470 + 0.0155 + 0.0010 + 0.0015));

// ── WHO GAINS AND WHO LOSES, BY TODAY'S TIER ────────────────────────────────
// Per pension, against the tier's average. The «medias inferiores» tier
// (1.000-1.500 €) straddles the minimum wage: the share below 1.221 € is
// estimated as if pensions were spread evenly inside the tier.
export interface CambioTramo { tramo: TramoPension; cambioMes: number; ganan: number; pierden: number }
export const CAMBIOS: CambioTramo[] = TRAMOS_PENSION.map(t => {
  const bajo = t.id === 'minima' ? 1 : t.id === 'inferior' ? (SMI_MES - 1_000) / 500 : 0;
  const ganan = Math.round(t.pensiones * bajo);
  return { tramo: t, cambioMes: SMI_MES - t.media, ganan, pierden: t.pensiones - ganan };
});
export const GANAN = CAMBIOS.reduce((s, c) => s + c.ganan, 0);
export const PIERDEN = CAMBIOS.reduce((s, c) => s + c.pierden, 0);

// ── ASSUMPTIONS THE READER CAN MOVE ─────────────────────────────────────────
export const SUPUESTOS = {
  /** Share of the new payroll kept apart for one-off help through social services. */
  ayudasPct: 0.05,
  /** Of those who gain, how many get other help for low income today (no official figure). */
  otrasAyudasCuota: 0.10,
  /** …and how much, per month (no official figure). */
  otrasAyudasMes: 100,
};
/** The one known extra help that the minimum wage would cover: the PNC rent supplement (pnc-alquiler). */
export const COMPLEMENTO_ALQUILER = PNC * 0.0476 * 525;

export function cuentasPropuesta(ayudasPct: number, otrasCuota: number, otrasMes: number) {
  const ayudas = COSTE_PROPUESTA * ayudasPct;
  const otras = GANAN * otrasCuota * otrasMes * 12 + COMPLEMENTO_ALQUILER;
  return { ayudas, otras, neto: AHORRO_BRUTO - ayudas + otras };
}

// ── WHAT A WAGE COSTS TODAY ─────────────────────────────────────────────────
// 2026 contribution rates (cotizaciones-2026). Employer: common contingencies
// 23,60 %, unemployment 5,50 %, FOGASA 0,20 %, training 0,60 %, MEI 0,75 %, plus
// work accidents ≈ 1,50 % (an office; it varies by trade). Worker: 4,70 + 1,55
// + 0,10 + 0,15 = 6,50 %. Income tax withheld: ≈ 12 % for a single person with
// no children at this wage — an estimate, the real figure depends on the person.
export const COTIZA_EMPRESA = 0.2360 + 0.0550 + 0.0020 + 0.0060 + 0.0075 + 0.0150;
export const COTIZA_TRABAJADOR = 0.0470 + 0.0155 + 0.0010 + 0.0015;
export const IRPF_EJEMPLO = 0.12;
export const BRUTO_EJEMPLO = 1_850;
export const NETO_EJEMPLO = BRUTO_EJEMPLO * (1 - COTIZA_TRABAJADOR - IRPF_EJEMPLO);
export const COSTE_EMPRESA_EJEMPLO = BRUTO_EJEMPLO * (1 + COTIZA_EMPRESA);
/** The part of all contributions that is «contingencias comunes», which pays pensions above all. */
export const PENSIONES_EN_COTIZACION = BRUTO_EJEMPLO * (0.2360 + 0.0470);

// ── FROM PAY-AS-YOU-GO TO AN INVESTED FUND ──────────────────────────────────
/** The reserve fund as of 31 March 2026 (fondo-reserva-2026), in €. */
export const FONDO_RESERVA = 15_267 * M;
/** Norway's sovereign fund, June 2026 (fondo-noruega), in €. */
export const FONDO_NORUEGA = 2_070_000 * M;

/** Saving 100 € a month for 40 years and drawing it over 20, at a real return. */
export function ahorroPrivado(mes = 100, anos = 40, cobro = 20, r = 0.035) {
  const capital = mes * 12 * ((1 + r) ** anos - 1) / r;
  const alAno = capital * r / (1 - (1 + r) ** -cobro);
  return { capital, alMes: alAno / 12 };
}

/**
 * Year by year: the fund, and how much of the pensions its return COULD pay.
 * The return is reinvested every year (it pays nothing yet); the day it could
 * pay them all is the day the system switches over. Until then, today's
 * pensions keep being paid as now.
 */
export function simularFondo(aportacion: number, rendimiento: number, coste = COSTE_PROPUESTA, anos = 80) {
  const puntos: { ano: number; fondo: number; cubre: number }[] = [];
  let fondo = FONDO_RESERVA;
  let llega: number | null = null;
  for (let a = 0; a <= anos; a++) {
    const cubre = Math.min(1, (fondo * rendimiento) / coste);
    puntos.push({ ano: a, fondo, cubre });
    if (llega === null && cubre >= 1) llega = a;
    fondo = fondo * (1 + rendimiento) + aportacion;
  }
  return { puntos, llega, necesario: coste / rendimiento };
}

/** Context for the page: today's spending on pensions from the country's accounts. */
export const PENSIONES_GASTO_2024 = HOY.pensiones2024 * M;
export const PENSIONES_CONTRIBUTIVAS = TOTAL_PENSIONES_CONTRIBUTIVAS;
