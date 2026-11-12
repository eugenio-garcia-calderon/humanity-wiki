// ============================================================================
// PENSIONS BY TIER AND BUDGETS BY SCALE (2026-11-11, Eugenio)
// ============================================================================
// Two sections of the «Modelo socioeconómico optimizado» page:
//   · Pensiones: Spain's contributory pensions in five tiers (maximum, upper
//     middle, middle, lower middle, minimum), with how many there are, what they
//     cost and their share of the monthly payroll.
//   · Presupuestos: where the money goes at each order of magnitude: the EU,
//     Spain, the Comunidad de Madrid, Torrelodones, a block of flats and a family.
//
// HONESTY RULES (same as modeloSocioeconomico.ts): every figure carries a source
// id from `FUENTES`; what is estimated says so in `estimado` / `nota`.
//
// HOW THE PENSION TIERS ARE BUILT. There is no public table of July 2026 with
// every amount bracket. What exists:
//   · total pensions and payroll, July 2026 (pensiones-2026);
//   · the top: 497.476 pensions of 3.300 € or more in July 2026
//     (330.877 + 2.721 at the cap + 163.878 above it, pensiones-cuantias);
//   · the split around 1.000 € (51,2 % above; of those, 41 % 1.000-1.500,
//     22 % 1.500-2.000, the rest above 2.000), 2025 (pensiones-reparto).
// The 2025 shares are applied to July 2026's total, so the middle tiers are an
// ESTIMATE (2026's raise pushes some pensions up a tier: the upper tiers are, if
// anything, understated). The average of tiers 1-4 is estimated from the bracket
// limits; the bottom tier's average is what is left of the real payroll, so the
// five tiers add up to the real total by construction.
import { HOY, numero } from './modeloSocioeconomico';

// ── PENSIONS ────────────────────────────────────────────────────────────────
export type TramoPensionId = 'maxima' | 'superior' | 'media' | 'inferior' | 'minima';
export interface TramoPension {
  id: TramoPensionId;
  nombre: string;
  rango: string;
  /** Number of pensions (not people: about 1 in 10 pensioners gets two). */
  pensiones: number;
  /** Average monthly amount (€, one of 14 payments). */
  media: number;
  /** The figure shown big: the cap for the top tier, the legal minimum for the bottom one, else the average. */
  cifra: number;
  cifraEtiqueta: string;
  estimado: boolean;
  nota: string;
  fuente: string;
}

const TOTAL_PENSIONES = HOY.pensionesContributivas; // 10.517.634, July 2026
const NOMINA_MES = HOY.nominaPensionesMes * 1e6; // € per month
const EN_EL_TOPE = 330_877 + 2_721 + 163_878; // 3.300 € or more
const SOBRE_MIL = Math.round(TOTAL_PENSIONES * 0.512);
const DE_MIL_A_1500 = Math.round(SOBRE_MIL * 0.41);
const DE_1500_A_2000 = Math.round(SOBRE_MIL * 0.22);
const SOBRE_2000 = SOBRE_MIL - DE_MIL_A_1500 - DE_1500_A_2000;
const BAJO_MIL = TOTAL_PENSIONES - SOBRE_MIL;

/** The 2026 cap and the legal minimum of a retirement pension (65+, no dependent spouse). */
export const PENSION_MAXIMA = 3_359.60;
export const PENSION_MINIMA_JUBILACION = 936.20;
export const PENSION_NO_CONTRIBUTIVA = 628.80;
export const PERSONAS_PENSIONISTAS = 9_500_000; // «cerca de 9,5 millones», May 2026
export const CON_COMPLEMENTO_MINIMOS = 2_108_559; // March 2026

const MEDIA_TOPE = Math.round((330_877 * 3_340 + 2_721 * PENSION_MAXIMA + 163_878 * 3_500) / EN_EL_TOPE);
const MEDIA_SUPERIOR = 2_550;
const MEDIA_MEDIA = 1_740;
const MEDIA_INFERIOR = 1_240;
const MEDIA_MINIMA = Math.round(
  (NOMINA_MES - EN_EL_TOPE * MEDIA_TOPE - (SOBRE_2000 - EN_EL_TOPE) * MEDIA_SUPERIOR
    - DE_1500_A_2000 * MEDIA_MEDIA - DE_MIL_A_1500 * MEDIA_INFERIOR) / BAJO_MIL,
);

export const TRAMOS_PENSION: TramoPension[] = [
  {
    id: 'maxima', nombre: 'Pensión máxima', rango: '3.300 € o más al mes', pensiones: EN_EL_TOPE, media: MEDIA_TOPE,
    cifra: PENSION_MAXIMA, cifraEtiqueta: 'tope de 2026', estimado: false, fuente: 'pensiones-cuantias',
    nota: 'Las que están en el tope o casi. 163.878 lo superan un poco porque se les suma un complemento, como el de maternidad.',
  },
  {
    id: 'superior', nombre: 'Medias superiores', rango: 'de 2.000 a 3.300 €', pensiones: SOBRE_2000 - EN_EL_TOPE, media: MEDIA_SUPERIOR,
    cifra: MEDIA_SUPERIOR, cifraEtiqueta: 'media estimada', estimado: true, fuente: 'pensiones-reparto',
    nota: 'Sobre todo jubilaciones de carreras largas con sueldos altos.',
  },
  {
    id: 'media', nombre: 'Medias', rango: 'de 1.500 a 2.000 €', pensiones: DE_1500_A_2000, media: MEDIA_MEDIA,
    cifra: MEDIA_MEDIA, cifraEtiqueta: 'media estimada', estimado: true, fuente: 'pensiones-reparto',
    nota: 'La pensión media de jubilación, 1.573,65 €, cae en este tramo.',
  },
  {
    id: 'inferior', nombre: 'Medias inferiores', rango: 'de 1.000 a 1.500 €', pensiones: DE_MIL_A_1500, media: MEDIA_INFERIOR,
    cifra: MEDIA_INFERIOR, cifraEtiqueta: 'media estimada', estimado: true, fuente: 'pensiones-reparto',
    nota: 'La pensión media de todo el sistema, 1.372,16 €, cae en este tramo.',
  },
  {
    id: 'minima', nombre: 'Mínimas y por debajo', rango: 'menos de 1.000\u00A0€', pensiones: BAJO_MIL, media: MEDIA_MINIMA,
    cifra: PENSION_MINIMA_JUBILACION, cifraEtiqueta: 'mínima de jubilación', estimado: true, fuente: 'pensiones-limites',
    nota: `La media del tramo, unos ${MEDIA_MINIMA} €, es menor que la mínima porque aquí están también las de orfandad (552 € de media), muchas de viudedad y las que se cobran junto a otra pensión.`,
  },
];

/** Monthly cost of a tier, in €. */
export const costeMes = (t: TramoPension) => t.pensiones * t.media;
export const NOMINA_PENSIONES_MES = NOMINA_MES;
export const TOTAL_PENSIONES_CONTRIBUTIVAS = TOTAL_PENSIONES;

// ── BUDGETS BY SCALE ────────────────────────────────────────────────────────
/** The six things Eugenio asked to compare across every scale. */
export type Categoria = 'pensiones' | 'deuda' | 'educacion' | 'sanidad' | 'infraestructuras' | 'defensa';
export const CATEGORIAS: { id: Categoria; nombre: string }[] = [
  { id: 'pensiones', nombre: 'Pensiones' },
  { id: 'deuda', nombre: 'Intereses de la deuda' },
  { id: 'educacion', nombre: 'Educación' },
  { id: 'sanidad', nombre: 'Sanidad' },
  { id: 'infraestructuras', nombre: 'Infraestructuras' },
  { id: 'defensa', nombre: 'Defensa' },
];

export interface Partida { nombre: string; euros: number; cat?: Categoria; nota?: string }
export type EscalaPresupuestoId = 'ue' | 'espana' | 'madrid' | 'torrelodones' | 'comunidad' | 'familia';
export interface EscalaPresupuesto {
  id: EscalaPresupuestoId;
  nombre: string;
  /** What the figure is, in one line: whose money, which year, what kind. */
  que: string;
  partidas: Partida[];
  /** Debt that falls due in the year and is paid by borrowing again (not spending). */
  amortizacion?: { euros: number; nota: string; fuente: string };
  /** A category that does not exist at this scale, and why. */
  ausentes?: string;
  estimado: boolean;
  fuente: string;
}

const M = 1e6;
const EPF_HOGAR = 34_044; // € per household and year, 2024 (ine-epf-hogar)
// The EPF groups as a share of all spending (ine-epf), imputed rent left out:
// it is what an owner «would pay» to live in their own home, not money that
// leaves the household.
const epf = (pct: number) => Math.round(EPF_HOGAR * pct / 100);

export const PRESUPUESTOS: EscalaPresupuesto[] = [
  {
    id: 'ue', nombre: 'Unión Europea', que: 'Presupuesto de la Unión para 2026, compromisos. No incluye lo que gasta cada país por su cuenta.',
    estimado: false, fuente: 'ue-presupuesto',
    partidas: [
      { nombre: 'Cohesión, resiliencia y valores', euros: 71_649.8 * M, nota: 'fondos regionales, sociales y Erasmus+' },
      { nombre: 'Agricultura, pesca y medio ambiente', euros: 56_529.4 * M },
      { nombre: 'Mercado único, investigación y digital', euros: 22_160 * M },
      { nombre: 'Vecindad y resto del mundo', euros: 15_600 * M, nota: 'cooperación y ayuda humanitaria' },
      { nombre: 'Migración y fronteras', euros: 5_020 * M },
      { nombre: 'Seguridad y defensa', euros: 2_810 * M, cat: 'defensa' },
      { nombre: 'Administración e instrumentos especiales', euros: (192_800 - 71_649.8 - 56_529.4 - 22_160 - 15_600 - 5_020 - 2_810) * M, nota: 'lo que queda hasta el total' },
    ],
    ausentes: 'La Unión no paga pensiones ni sanidad ni educación: eso lo hacen los países. Los intereses de su deuda común (NextGenerationEU) no salen separados en este resumen.',
  },
  {
    id: 'espana', nombre: 'España', que: 'Gasto de todas las administraciones juntas (Estado, comunidades, ayuntamientos y Seguridad Social) en 2024, el último año cerrado.',
    estimado: false, fuente: 'igae-cofog',
    partidas: [
      { nombre: 'Pensiones', euros: HOY.pensiones2024 * M, cat: 'pensiones' },
      { nombre: 'Sanidad', euros: 102_942 * M, cat: 'sanidad' },
      { nombre: 'Otra protección social', euros: (297_532 - HOY.pensiones2024) * M, nota: 'paro, dependencia, familia, vivienda social' },
      { nombre: 'Educación', euros: 65_862 * M, cat: 'educacion' },
      { nombre: 'Intereses de la deuda', euros: 39_644 * M, cat: 'deuda' },
      { nombre: 'Transporte e infraestructuras', euros: 28_634 * M, cat: 'infraestructuras' },
      { nombre: 'Orden público y justicia', euros: 28_628 * M },
      { nombre: 'Defensa', euros: 14_233 * M, cat: 'defensa' },
      { nombre: 'Todo lo demás', euros: (725_001 - 297_532 - 102_942 - 65_862 - 39_644 - 28_634 - 28_628 - 14_233) * M, nota: 'servicios generales, ayudas a la economía, medio ambiente, cultura' },
    ],
    amortizacion: {
      euros: (285_693 - 55_000) * M, fuente: 'tesoro-2026',
      nota: 'Deuda del Estado que vence en 2026 (285.693 M€ que se emiten menos 55.000 M€ de deuda nueva). Se devuelve pidiendo prestado otra vez: no es gasto, pero hay que tenerla.',
    },
  },
  {
    id: 'madrid', nombre: 'Comunidad de Madrid', que: 'Presupuesto de la Comunidad de Madrid para 2026, gasto no financiero.',
    estimado: false, fuente: 'cam-presupuesto',
    partidas: [
      { nombre: 'Sanidad', euros: 11_009.5 * M, cat: 'sanidad' },
      { nombre: 'Educación y universidades', euros: 6_959 * M, cat: 'educacion' },
      { nombre: 'Vivienda, transportes e infraestructuras', euros: 3_292.9 * M, cat: 'infraestructuras' },
      { nombre: 'Familia y servicios sociales', euros: 2_904.1 * M },
      { nombre: 'Intereses de la deuda', euros: 1_251.2 * M, cat: 'deuda' },
      { nombre: 'Presidencia, justicia y ayuntamientos', euros: 1_226.7 * M },
      { nombre: 'Economía y empleo', euros: (331.7 + 696.3) * M },
      { nombre: 'Medio ambiente, agricultura e interior', euros: 778.8 * M },
      { nombre: 'Todo lo demás', euros: (30_663.6 - 11_009.5 - 6_959 - 3_292.9 - 2_904.1 - 1_251.2 - 1_226.7 - 331.7 - 696.3 - 778.8) * M, nota: 'digitalización, cultura, fondo de imprevistos, Asamblea' },
    ],
    amortizacion: { euros: 2_552 * M, fuente: 'cam-presupuesto', nota: 'Préstamos y bonos que la Comunidad devuelve en 2026.' },
    ausentes: 'Las pensiones las paga la Seguridad Social, no la comunidad. Defensa es solo del Estado.',
  },
  {
    id: 'torrelodones', nombre: 'Torrelodones', que: 'Presupuesto del Ayuntamiento para 2024, un municipio de la sierra de Madrid. El resumen publicado va por tipo de gasto, no por servicio.',
    estimado: false, fuente: 'torrelodones-2024',
    partidas: [
      { nombre: 'Compras y servicios contratados', euros: 14_026_240, nota: 'recogida de basura, limpieza viaria, luz, mantenimiento' },
      { nombre: 'Personal', euros: 13_745_800, nota: 'policía local, escuelas infantiles, cultura, deporte, oficinas' },
      { nombre: 'Obras e inversiones', euros: 7_163_300 + 500_000, cat: 'infraestructuras' },
      { nombre: 'Ayudas y aportaciones', euros: 2_065_650, nota: 'asociaciones, mancomunidades, ayudas sociales' },
      { nombre: 'Préstamos al personal y depósitos', euros: 158_500 },
    ],
    ausentes: 'Intereses y devolución de deuda: cero, el Ayuntamiento no tiene préstamos en este presupuesto. Colegios y centros de salud los paga la Comunidad; la parte municipal de educación va dentro de personal y compras.',
  },
  {
    id: 'comunidad', nombre: 'Comunidad de vecinos', que: 'Un ejemplo de presupuesto anual de un edificio con ascensor y zona verde. Cada comunidad es distinta.',
    estimado: true, fuente: 'housfy-comunidad',
    partidas: [
      { nombre: 'Jardinería', euros: 2_160 },
      { nombre: 'Mantenimiento del ascensor', euros: 1_520, cat: 'infraestructuras' },
      { nombre: 'Limpieza', euros: 1_250 },
      { nombre: 'Seguro del edificio', euros: 940 },
      { nombre: 'Luz de las zonas comunes', euros: 730 },
      { nombre: 'Fondo de reserva', euros: 720, nota: 'ahorro obligatorio: al menos el 10 % del presupuesto' },
      { nombre: 'Agua', euros: 600 },
    ],
    ausentes: 'Si hay una obra grande, se paga con una derrama o con un préstamo aparte, fuera de este presupuesto.',
  },
  {
    id: 'familia', nombre: 'Familia', que: 'Gasto medio de un hogar en España en 2024 (34.044 € con el alquiler imputado; aquí sin él, solo el dinero que sale de casa).',
    estimado: false, fuente: 'ine-epf',
    partidas: [
      { nombre: 'Comida y bebidas', euros: epf(15.8) },
      { nombre: 'Alquiler, agua, luz y gas', euros: epf(32.4 - 19.0) },
      { nombre: 'Transporte', euros: epf(11.4) },
      { nombre: 'Restaurantes y alojamiento', euros: epf(9.9) },
      { nombre: 'Ocio, deporte y cultura', euros: epf(5.0) },
      { nombre: 'Ropa y calzado', euros: epf(4.2) },
      { nombre: 'Salud', euros: epf(4.0), cat: 'sanidad' },
      { nombre: 'Seguros y servicios financieros', euros: epf(3.7) },
      { nombre: 'Muebles y cuidado del hogar', euros: epf(3.7) },
      { nombre: 'Móvil, internet, cuidado personal y otros', euros: epf(3.2 + 3.6 + 1.3) },
      { nombre: 'Educación', euros: epf(1.6), cat: 'educacion' },
    ],
    ausentes: 'La cuota de la hipoteca no aparece: la encuesta cuenta lo que se consume, no lo que se devuelve de un préstamo. Los impuestos y las cotizaciones tampoco, porque salen de la nómina antes de llegar a casa.',
  },
];

export const totalEscala = (e: EscalaPresupuesto) => e.partidas.reduce((s, p) => s + p.euros, 0);
/** Share (0-1) of a scale's budget that goes to a category; null when that scale has none. */
export function cuotaCategoria(e: EscalaPresupuesto, c: Categoria): number | null {
  const v = e.partidas.filter(p => p.cat === c).reduce((s, p) => s + p.euros, 0);
  return v > 0 ? v / totalEscala(e) : null;
}

/** «1.234 €», «38,5 M€», «725.001 M€». */
export function importe(e: number) {
  if (Math.abs(e) >= 1e9) return `${numero(e / M)}\u00A0M€`;
  if (Math.abs(e) >= 1e6) return `${numero(e / M, 1)}\u00A0M€`;
  return `${numero(e)}\u00A0€`;
}
