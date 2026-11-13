// Data for the «Moneda» part of the «Economía» window of the «Modelo Público Optimizado»
// (Eugenio, 2026-11-13: «Economía» holds Deuda · Banca · Moneda, each with its proposals,
// inspired by his text on debt debasement through inflation). What money is and who
// creates the euro; inflation in Spain and who wins and loses; how inflation shrinks a
// debt, the Fisher effect and the debt-sustainability equation; fiscal dominance; the
// proposals; what each scale can do; the open question of how new money is born.
// Every figure carries a source from `FUENTES_MONEDA`; checked on 2026-11-13.
// How banks create money is in «Banca» (#banca-dinero) and is linked, not repeated.
// `APARTADOS` drives the submenu: the first id is the part's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'moneda', t: 'Resumen' },
  { id: 'moneda-euro', t: 'Quién crea el euro' },
  { id: 'moneda-inflacion', t: 'La inflación' },
  { id: 'moneda-licuacion', t: 'Inflación y deuda' },
  { id: 'moneda-sostenible', t: 'Cuándo una deuda se sostiene' },
  { id: 'moneda-dominancia', t: 'Dominancia fiscal' },
  { id: 'moneda-propuesta', t: 'La propuesta' },
  { id: 'moneda-escalas', t: 'Cada escala' },
  { id: 'moneda-retos', t: 'Retos y gran pregunta' },
  { id: 'moneda-lecturas', t: 'Para leer más' },
  { id: 'moneda-fuentes', t: 'Fuentes' },
];

export interface FuenteMoneda { url: string; titulo: string }

/** Sources of this part, by id. Titles say who publishes and when. */
export const FUENTES_MONEDA: Record<string, FuenteMoneda> = {
  'bce-dinero': { url: 'https://www.ecb.europa.eu/ecb-and-you/explainers/tell-me-more/html/what_is_money.en.html', titulo: 'BCE · «What is money?», explicación divulgativa (en inglés)' },
  'bde-crea': { url: 'https://www.bde.es/wbe/es/areas-actuacion/politica-monetaria/preguntas-frecuentes/definicion-funciones-del-dinero/como-se-crea-el-dinero.html', titulo: 'Banco de España · ¿Cómo se crea el dinero? (preguntas frecuentes, 2022)' },
  'pe-bce': { url: 'https://www.europarl.europa.eu/erpl-app-public/factsheets/pdf/es/FTU_1.3.11.pdf', titulo: 'Parlamento Europeo · Fichas temáticas: «El Banco Central Europeo» (artículos 123, 127 y 130 del Tratado)' },
  'tfue-123': { url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:12008E123', titulo: 'EUR-Lex · Tratado de Funcionamiento de la Unión Europea, artículo 123' },
  'bce-2': { url: 'https://www.ecb.europa.eu/press/pr/date/2025/html/ecb.pr250630~aabf988af8.en.html', titulo: 'BCE · El Consejo de Gobierno actualiza su estrategia y confirma el objetivo simétrico del 2 % (30-6-2025)' },
  'bce-tipos': { url: 'https://www.caixabankresearch.com/es/publicaciones/notas-breves-actualidad-economica-y-financiera/observatorio-bancos-centrales-122', titulo: 'CaixaBank Research · Observatorio de bancos centrales: el BCE mantiene el tipo de depósito en el 2,50 % (29-10-2026)' },
  'ipc-medias': { url: 'https://www.vozpopuli.com/economia/el-ine-confirma-que-la-inflacion-bajo-una-decima-en-diciembre-y-cerro-2025-con-una-media-del-27.html', titulo: 'Medias anuales del IPC según el INE, recogidas por Vozpópuli · «El INE confirma que la inflación cerró 2025 con una media del 2,7 %»' },
  'ine-2025': { url: 'https://www.ine.es/prodyser/espa_cifras/05_CONDICIONES_DE_VIDA.pdf', titulo: 'INE · España en cifras, «Condiciones de vida»: IPC medio de 2025, 2,7 %' },
  'ine-jul-2022': { url: 'https://www.ine.es/daco/daco42/daco421/ipc0722.pdf', titulo: 'INE · IPC de julio de 2022: 10,8 %, la tasa más alta desde septiembre de 1984' },
  'ipc-oct-2026': { url: 'https://www.caixabankresearch.com/es/publicaciones/notas-breves-actualidad-economica-y-financiera/espana/inflacion-se-mantiene-49', titulo: 'CaixaBank Research · La inflación se mantiene en el 4,9 % en octubre (dato adelantado del INE, 30-10-2026)' },
  'guerra-2026': { url: 'https://es.euronews.com/2026/10/01/plan-gobierno-espanol-contener-inflacion-crisis-oriente-medio', titulo: 'Euronews · El plan del Gobierno para contener la inflación por la crisis de Oriente Medio (1-10-2026)' },
  'bde-quien': { url: 'https://www.bde.es/wbe/es/noticias-eventos/blog/la-inflacion-no-nos-afecta-a-todos-por-igual-de-que-depende-su-impacto.html', titulo: 'Banco de España · Blog: «La inflación no nos afecta a todos por igual» (3-9-2024)' },
  'fmi-2023': { url: 'https://www.imf.org/en/Publications/WP/Issues/2023/05/05/The-Effects-of-Inflation-on-Public-Finances-533099', titulo: 'FMI · García-Macía, «The Effects of Inflation on Public Finances», documento de trabajo 23/93 (mayo de 2023)' },
  'fmi-2024': { url: 'https://www.imf.org/en/blogs/articles/2024/03/28/the-fiscal-and-financial-risks-of-a-high-debt-slow-growth-world', titulo: 'FMI · Adrian, Gaspar y Gourinchas, «The Fiscal and Financial Risks of a High-Debt, Slow-Growth World» (28-3-2024)' },
  'bde-deuda-2023': { url: 'https://repositorio.bde.es/bitstream/123456789/36757/1/be2403-art01.pdf', titulo: 'Banco de España · «La evolución de la deuda pública en España en 2023», Boletín Económico 2024/T3 (24-6-2024)' },
  'bde-fisher': { url: 'https://portaleducativo.bde.es/f/webeduca/INF/Secciones/Home/generacioneuro/Factors_price_development_ES.pdf', titulo: 'Banco de España y Eurosistema · Generación €uro, «Factores determinantes de la evolución de los precios»' },
  'tresor-2023': { url: 'https://www.tresor.economie.gouv.fr/Articles/2023/10/17/interest-rates-growth-and-public-debt-sustainability', titulo: 'Tesoro francés · «Interest Rates, Growth and Public Debt Sustainability» (17-10-2023)' },
  'schnabel-2020': { url: 'https://www.suerf.org/policynotes/17607/the-shadow-of-fiscal-dominance-misconceptions-perceptions-and-perspectives', titulo: 'Isabel Schnabel (BCE) · «The shadow of fiscal dominance», SUERF Policy Note 198 (8-10-2020)' },
  'vollgeld-2018': { url: 'https://www.centralbanking.com/central-banks/monetary-policy/operating-framework/3567961/swiss-reject-radical-monetary-proposals', titulo: 'Central Banking · Suiza rechaza la iniciativa del «dinero soberano» (10-6-2018)' },
  'vollgeld-snb': { url: 'https://www.bloomberg.com/news/articles/2018-06-10/swiss-reject-plan-that-would-have-revolutionized-banking-ji9fmz44', titulo: 'Bloomberg · Swiss Reject Plan That Would Have Revolutionized Banking (10-6-2018)' },
  'chicago-2012': { url: 'https://imf.org/external/pubs/ft/wp/2012/wp12202.PDF', titulo: 'FMI · Benes y Kumhof, «The Chicago Plan Revisited», documento de trabajo 12/202 (agosto de 2012)' },
  'euro-digital-faq': { url: 'https://www.ecb.europa.eu/paym/digital_euro/faqs/html/ecb.faq_digital_euro.es.html', titulo: 'BCE · Preguntas frecuentes sobre el euro digital' },
  'euro-digital-2026': { url: 'https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/europes-digital-euro-heads-to-last-stage-of-negotiations-what-council-and-parl-102nbx6', titulo: 'Freshfields · El euro digital entra en la última fase de negociación entre Consejo y Parlamento (15-7-2026)' },
  'werner-2014': { url: 'https://eprints.soton.ac.uk/372866', titulo: 'Werner (2014) · «Can banks individually create money out of nothing? The theories and the empirical evidence», International Review of Financial Analysis 36' },
  'fisher-1933': { url: 'https://fraser.stlouisfed.org/title/debt-deflation-theory-great-depressions-3596/fulltext', titulo: 'Fisher (1933) · «The Debt-Deflation Theory of Great Depressions», Econometrica (archivo de la Reserva Federal de San Luis)' },
  'minsky-1986': { url: 'https://www.levyinstitute.org/publications/stabilizing-an-unstable-economy/', titulo: 'Minsky (1986) · «Stabilizing an Unstable Economy» (Levy Economics Institute)' },
};

/** Spain's CPI, annual average change (%). */
export const IPC_ANUAL: { ano: number; v: number; fuente: string }[] = [
  { ano: 2021, v: 3.1, fuente: 'ipc-medias' },
  { ano: 2022, v: 8.4, fuente: 'ipc-medias' },
  { ano: 2023, v: 3.5, fuente: 'ipc-medias' },
  { ano: 2024, v: 2.8, fuente: 'ipc-medias' },
  { ano: 2025, v: 2.7, fuente: 'ine-2025' },
];
/** Latest month: October 2026, year-on-year (INE flash), and the 2022 peak month. */
export const IPC_ULTIMO = { mes: 'octubre de 2026', v: 4.9, subyacente: 3.1, fuente: 'ipc-oct-2026' };
export const IPC_PICO = { mes: 'julio de 2022', v: 10.8, fuente: 'ine-jul-2022' };
/** ECB: inflation target and deposit rate (October 2026). */
export const BCE = { objetivo: 2, tipoDeposito: 2.5 };
/** Banco de España: nominal GDP growth cut the debt ratio by these points of GDP. */
export const EFECTO_DENOMINADOR = { 2022: 10.8, 2023: 8.8 };
/** IMF (García-Macía 2023): a 1-point inflation surprise lowers the debt ratio by about 0,6 points over time, where debt is above 50 % of GDP. */
export const FMI_SORPRESA = 0.6;

/**
 * What cost 100 € on average in 2021 cost on average in 2025 (own estimate):
 * the 2021 average is the base, so only the 2022–2025 changes compound.
 */
export const PRECIO_2025_DE_100_2021 = IPC_ANUAL.filter(a => a.ano > 2021).reduce((p, a) => p * (1 + a.v / 100), 100);

/** Debt ratio after an unexpected inflation, everything else equal: d / (1 + π). */
export function licuar(deudaPct: number, inflacion: number) {
  return deudaPct / (1 + inflacion / 100);
}

/**
 * Debt ratio year by year: d' = d·(1+i)/(1+g) − s, the exact form of
 * Δd ≈ (i − g)·d − s, with i the real interest rate, g real growth and s the
 * primary surplus, all in % (of GDP for s).
 */
export function trayectoria(d0: number, i: number, g: number, s: number, anos = 10) {
  const out = [d0];
  let d = d0;
  for (let k = 0; k < anos; k++) {
    d = Math.max(0, (d * (1 + i / 100)) / (1 + g / 100) - s);
    out.push(d);
  }
  return out;
}

/** Who wins and who loses with inflation (Banco de España, 2024; IMF, 2023). */
export const GANAN_PIERDEN: { quien: string; efecto: 'pierde' | 'gana' | 'depende'; por: string }[] = [
  { quien: 'Quien ahorra en la cuenta o en depósitos', efecto: 'pierde', por: 'Sus euros compran menos cada año. En España, los más afectados en 2021 fueron los mayores de 65 años con menos ingresos, porque guardan casi todo en depósitos.' },
  { quien: 'Quien vive de un sueldo o una ayuda que no sube igual', efecto: 'pierde', por: 'Si el sueldo sube menos que los precios, se puede comprar menos con él.' },
  { quien: 'Quien debe a tipo fijo (una hipoteca fija)', efecto: 'gana', por: 'La cuota no cambia, pero los euros con que la paga valen menos. Por eso muchos jóvenes con hipoteca salieron ganando.' },
  { quien: 'Quien debe a tipo variable', efecto: 'depende', por: 'Si el banco central sube los tipos para frenar los precios, la cuota sube, y puede perder.' },
  { quien: 'Quien tiene casa o acciones', efecto: 'depende', por: 'Su valor suele seguir a los precios, así que se protege mejor que el dinero en la cuenta.' },
  { quien: 'El Estado, que debe mucho', efecto: 'gana', por: 'Solo si la inflación llega por sorpresa: su deuda pesa menos. Si se esperaba, los que le prestan ya pidieron más interés.' },
];

/** How inflation treats each kind of debt (from Eugenio's text; IMF 2023). */
export const TIPOS_DEUDA: { tipo: string; efecto: string }[] = [
  { tipo: 'A tipo fijo y a largo plazo', efecto: 'Gana quien debe: devuelve euros que valen menos.' },
  { tipo: 'A tipo variable', efecto: 'El interés puede subir rápido y encarecerla.' },
  { tipo: 'Ligada a la inflación', efecto: 'Se actualiza con los precios: no se encoge.' },
  { tipo: 'En otra moneda', efecto: 'Puede encarecerse si la propia moneda pierde valor.' },
];
