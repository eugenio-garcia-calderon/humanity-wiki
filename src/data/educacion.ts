// Data for the «Educación» window of the «Modelo socioeconómico optimizado»
// (Eugenio, 2026-11-12): a budget assigned to every person from birth to 25 to
// learn — an «educational backpack» that follows the pupil to the school they
// choose — instead of today's public / state-subsidised / private split; older
// pupils teaching younger ones as part of their own curriculum; groups by pace
// inside each class; project-based learning; and trades (building, electricity,
// carpentry) in the ordinary curriculum, not only in vocational training.
//
// Every real figure carries the id of its source (FUENTES_EDU). What is
// computed here, or proposed, says so in the component.

import { numero } from './modeloSocioeconomico';

// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'educacion', t: 'Resumen' },
  { id: 'educacion-hoy', t: 'Cómo es hoy' },
  { id: 'educacion-mochila', t: 'La mochila' },
  { id: 'educacion-riesgos', t: 'Lo que enseñan otros países' },
  { id: 'educacion-aula', t: 'La escuela por dentro' },
  { id: 'educacion-bot', t: 'El bot evaluador' },
  { id: 'educacion-escalas', t: 'Cada escala' },
  { id: 'educacion-retos', t: 'Retos' },
  { id: 'educacion-fuentes', t: 'Fuentes' },
];

export interface FuenteEdu { id: string; titulo: string; url: string }
export const FUENTES_EDU: FuenteEdu[] = [
  { id: 'datos-cifras', titulo: 'Ministerio de Educación · Datos y cifras, curso escolar 2025/2026 (coste por alumno, alumnado por red, ratio, escolarización de 0 a 3 años)', url: 'https://www.libreria.educacion.gob.es/ebook/186407/free_download' },
  { id: 'gasto-2024', titulo: 'Ministerio de Educación (La Moncloa) · El gasto público en educación superó en 2024 los 71.300 M€ (marzo de 2026)', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/educacion-fp-deportes/Paginas/2026/180326-gasto-educacion-2024.aspx' },
  { id: 'avance-2526', titulo: 'Ministerio de Educación · Avance de la estadística de enseñanzas no universitarias, curso 2025-26', url: 'https://www.educacionfpydeportes.gob.es/dam/jcr:e7a0bdc6-411e-4a1d-9758-746d87ac5837/nota-avance2025-26.pdf' },
  { id: 'concertada-2023', titulo: 'Fundación Ramón Areces y Fundación Europea Sociedad y Educación · Indicadores comentados 2026: gasto público por alumno en pública y concertada (2023), según El Español', url: 'https://www.elespanol.com/observatorio-educacion/20260924/madrid-pais-vasco-navarra-comunidades-financian-concertada-ranking-autonomias/1003744395238_0.html' },
  { id: 'cuotas-esade', titulo: 'EsadeEcPol (Gortázar, Martínez y Bonal) · Las cuotas de la concertada, según El Diario de la Educación (2024)', url: 'https://eldiariodelaeducacion.com/2024/04/24/la-cuota-de-acceso-a-la-concertada-se-situa-en-espana-entre-los-680-y-los-860-euros/' },
  { id: 'eag-2026', titulo: 'OCDE · Panorama de la educación 2026: gasto por alumno de España frente a la media, según El Español', url: 'https://www.elespanol.com/observatorio-educacion/20260929/espana-gasta-euros-estudiante-primaria-universidad-media-ocde/1003744400650_0.html' },
  { id: 'abandono-2025', titulo: 'Funcas · Informe sobre el abandono educativo temprano en España (febrero de 2026)', url: 'https://www.funcas.es/wp-content/uploads/2026/02/Informe-sobre-el-abandono-educativo-temprano-en-Espana.pdf' },
  { id: 'abandono-ue', titulo: 'Euronews, con datos de Eurostat · Abandono escolar temprano en la UE en 2025 (junio de 2026)', url: 'https://es.euronews.com/2026/06/16/que-pais-de-la-ue-tiene-mas-abandono-escolar-temprano' },
  { id: 'pisa-2022', titulo: 'INEE, Ministerio de Educación · Boletín de Educación nº 79: resultados de PISA 2022', url: 'https://libreria.educacion.gob.es/ebook/184853/free_download' },
  { id: 'esade-pisa', titulo: 'EsadeEcPol · Todo lo que debes saber de PISA 2022 sobre equidad (segregación y repetición)', url: 'https://www.esade.edu/ecpol/es/publicaciones/todo-lo-que-debes-saber-de-pisa-2022-sobre-equidad/' },
  { id: 'ine-edad', titulo: 'INE · Población residente por edad a 1 de enero de 2025 (tabla 56934)', url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=56934' },
  { id: 'ine-nacimientos', titulo: 'INE · España en cifras: población y nacimientos de 2024', url: 'https://ine.es/prodyser/espa_cifras/02_POBLACION.pdf' },
  { id: 'eef-tutoria', titulo: 'Education Endowment Foundation · Peer tutoring (tutoría entre iguales), Teaching and Learning Toolkit', url: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/peer-tutoring' },
  { id: 'eef-grupos', titulo: 'Education Endowment Foundation · Within-class attainment grouping (grupos por nivel dentro de la clase)', url: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/within-class-attainment-grouping' },
  { id: 'eef-separar', titulo: 'Education Endowment Foundation · Setting and streaming (separar a los alumnos en clases por nivel)', url: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/setting-and-streaming' },
  { id: 'eef-proyectos', titulo: 'Education Endowment Foundation · Ensayo «Learning through REAL Projects» (aprendizaje por proyectos), 2014-2016', url: 'https://educationendowmentfoundation.org.uk/projects-and-evaluation/projects/project-based-learning' },
  { id: 'proyectos-ap', titulo: 'Saavedra y Rapaport (The 74, 2021) · Ensayo aleatorio de aprendizaje por proyectos en 68 institutos de EE. UU.', url: 'https://www.the74million.org/article/analysis-project-based-learning-or-lectures-our-research-shows-pbl-helps-low-income-students-do-better-in-ap-classes-earn-college-credit/' },
  { id: 'suecia', titulo: 'IFAU (Holmlund, Böhlmark y Lindahl, 2015) · School choice and segregation: evidence from Sweden', url: 'https://ifau.se/en/Press/Abstracts/School-choice-and-segregation-evidence-from-Sweden' },
  { id: 'chile-1981', titulo: 'Hsieh y Urquiola (Princeton, 2002) · When schools compete, how do they compete? El cheque escolar de Chile', url: 'https://swh.princeton.edu/~ceps/workingpapers/79hsieh.pdf' },
  { id: 'chile-2015', titulo: 'Libertad y Desarrollo · Serie Informe Social 204: el fin del copago en Chile (agosto de 2024)', url: 'https://lyd.org/wp-content/uploads/2024/08/SISO_204_Fin_del_copago-ago2024.pdf' },
  { id: 'holanda', titulo: 'Comisión Europea, Eurydice · Países Bajos: financiación de la educación', url: 'https://eurydice.eacea.ec.europa.eu/national-education-systems/netherlands/funding-education' },
  { id: 'universidad-2324', titulo: 'Ministerio de Ciencia, Innovación y Universidades · Informe del sistema universitario: 1.762.459 estudiantes en 2023-2024', url: 'https://www.ciencia.gob.es/Noticias/2025/enero/informe-universidades-espanolas.html' },
  { id: 'finlandia', titulo: 'Agencia Nacional de Educación de Finlandia · Crafts (trabajos manuales) en la educación básica', url: 'https://www.oph.fi/en/education-and-qualifications/crafts-craft-and-design-or-handicraft-finnish-education' },
];
export const FE = Object.fromEntries(FUENTES_EDU.map(f => [f.id, f])) as Record<string, FuenteEdu>;

// ── TODAY ───────────────────────────────────────────────────────────────────
/**
 * What one pupil costs a year in a public school, by stage, 2022, in euros
 * (datos-cifras, OECD method: all the money spent in public schools, mostly
 * public). 0-3 has no figure of its own: «Infantil» covers 0 to 6.
 */
export const COSTE_ALUMNO = {
  infantil: 7_145, primaria: 6_919, eso: 8_158, bachillerato: 7_762, fpMedia: 11_359,
  fpSuperior: 8_485, universidad: 11_428, total: 8_318,
};

/** Share of pupils in each network, 2023-2024, in % (datos-cifras). */
export interface Red { publica: number; concertada: number; privada: number }
export const REDES: { id: string; etapa: string; r: Red }[] = [
  { id: 'inf1', etapa: 'Infantil de 0 a 3 años', r: { publica: 53.7, concertada: 21.5, privada: 24.8 } },
  { id: 'inf2', etapa: 'Infantil de 3 a 6 años', r: { publica: 67.5, concertada: 28.6, privada: 3.9 } },
  { id: 'pri', etapa: 'Primaria', r: { publica: 67.7, concertada: 28.2, privada: 4.1 } },
  { id: 'eso', etapa: 'ESO', r: { publica: 67.0, concertada: 28.9, privada: 4.1 } },
  { id: 'bach', etapa: 'Bachillerato', r: { publica: 72.2, concertada: 10.7, privada: 17.0 } },
  { id: 'fpm', etapa: 'FP de grado medio', r: { publica: 68.8, concertada: 16.8, privada: 14.4 } },
  { id: 'fps', etapa: 'FP de grado superior', r: { publica: 63.2, concertada: 8.4, privada: 28.4 } },
];
export const RED_TOTAL: Red = { publica: 66.9, concertada: 24.5, privada: 8.6 };

/** Pupils enrolled, 2025-26, provisional (avance-2526). */
export const ALUMNADO = {
  inf1: 491_811, inf2: 1_053_397, primaria: 2_662_252, eso: 2_065_484, bachillerato: 701_678,
  fp: 1_211_062, especial: 48_082, total: 8_249_174, profesores: 806_178,
  fpBasica: 86_157, fpMedia: 474_617, fpSuperior: 640_640,
  universidad: 1_762_459, // 2023-2024, all ages (universidad-2324)
};

/** Money, in millions of euros unless said otherwise. */
export const DINERO = {
  publico2024: 71_348.8, // gasto-2024
  infantilPrimariaPct: 33.5, secundariaFpPct: 30.4, universidadPct: 18.8, // gasto-2024
  personal2024: 42_460, becas2024: 3_304.5, // gasto-2024
  conciertosPct2023: 11.4, // datos-cifras: «conciertos y subvenciones a la enseñanza privada»
  // Public money per pupil, 2023, non-university (concertada-2023)
  porAlumnoPublica: 7_943, porAlumnoConcertada: 4_705, porAlumnoMadridConcertada: 3_400,
  // What families who pay give to the concertada a year (cuotas-esade)
  cuotaMin: 680, cuotaMax: 860, cuotasTotalMin: 950, cuotasTotalMax: 1_200,
};

export const RESULTADOS = {
  abandono2025: 12.8, abandonoHombres: 15.9, abandonoMujeres: 9.5, abandonoExtranjeros: 30.7, abandonoEspanoles: 9.8, // abandono-2025
  abandonoUE2025: 9.1, // abandono-ue
  ratio: 11.2, ratioPrimaria: 12.3, ratioEso: 10.9, // datos-cifras: pupils per full-time teacher, 2022-2023
  pisaMat: 473, pisaLec: 474, pisaCie: 485, ocdeMat: 472, ocdeLec: 476, ocdeCie: 485, // pisa-2022
  repetidores: 22, // esade-pisa: % of 15-year-olds who have repeated a year
  escolarizados0: 16.6, escolarizados1: 54.8, escolarizados2: 74.7, // datos-cifras, 2024-2025
  bajoPorDebajoOcde: 11, // eag-2026: spending per pupil, primary to university, % below the OECD average
};

/** People of each age, 0 to 24, on 1-1-2025 (ine-edad). */
export const POBLACION_EDAD = [
  318_907, 329_282, 343_526, 356_354, 364_199, 385_703, 405_639, 432_715, 456_068, 468_748,
  477_242, 472_932, 499_324, 511_119, 522_305, 530_839, 551_743, 534_300, 541_048, 539_336,
  542_720, 541_011, 530_297, 534_266, 545_337,
];
export const NACIMIENTOS_2024 = 318_005; // ine-nacimientos

// ── THE BACKPACK: A CALCULATION OF THIS PAGE ────────────────────────────────
// Each year of life from 0 to 24 gets what a pupil of that age costs today in a
// public school (COSTE_ALUMNO). Choices at 16 and 18 change the yearly amount.
export type Tras16 = 'bachillerato' | 'fp';
export type Tras18 = 'universidad' | 'fp' | 'trabajo';
export type Etapa = 'infantil' | 'primaria' | 'eso' | 'bachillerato' | 'fpMedia' | 'universidad' | 'fpSuperior' | 'sinUsar';

export const ETAPA_NOMBRE: Record<Etapa, string> = {
  infantil: 'Infantil (0 a 6)', primaria: 'Primaria (6 a 12)', eso: 'ESO (12 a 16)', bachillerato: 'Bachillerato',
  fpMedia: 'FP de grado medio', universidad: 'Universidad', fpSuperior: 'FP de grado superior', sinUsar: 'Sin usar todavía',
};

export interface Ano { edad: number; etapa: Etapa; euros: number }

/**
 * The backpack year by year. `anosEstudio`: years of study between 18 and 25
 * (0 to 7). With 'fp' after 18, two years are the higher vocational course and
 * the rest are paid at that same rate (more courses, a second qualification).
 * Years not studied are left in the backpack, «sin usar» (what happens to them
 * is an open question, see RETOS). `extra`: share added for pupils who need
 * more support (a proposal: 0 to 0,5).
 */
export function mochila(tras16: Tras16, tras18: Tras18, anosEstudio: number, extra = 0): Ano[] {
  const anos: Ano[] = [];
  const c = COSTE_ALUMNO;
  for (let edad = 0; edad < 25; edad++) {
    let etapa: Etapa; let e: number;
    if (edad < 6) { etapa = 'infantil'; e = c.infantil; }
    else if (edad < 12) { etapa = 'primaria'; e = c.primaria; }
    else if (edad < 16) { etapa = 'eso'; e = c.eso; }
    else if (edad < 18) { etapa = tras16 === 'bachillerato' ? 'bachillerato' : 'fpMedia'; e = tras16 === 'bachillerato' ? c.bachillerato : c.fpMedia; }
    else {
      const estudia = tras18 !== 'trabajo' && edad - 18 < anosEstudio;
      const tarifa = tras18 === 'fp' ? c.fpSuperior : c.universidad;
      etapa = estudia ? (tras18 === 'fp' ? 'fpSuperior' : 'universidad') : 'sinUsar';
      e = tras18 === 'trabajo' ? c.universidad : tarifa;
    }
    anos.push({ edad, etapa, euros: Math.round(e * (1 + extra)) });
  }
  return anos;
}

/** The standard backpack: Bachillerato and seven years at the university rate. Computed. */
export const MOCHILA_BASE = mochila('bachillerato', 'universidad', 7).reduce((s, a) => s + a.euros, 0);

/**
 * What the whole country would cost if every person aged 0 to 24 used the
 * standard backpack every year: people of each age × that year's amount.
 * Computed from ine-edad and datos-cifras; an upper bound, not a forecast.
 */
export const COSTE_PAIS_MAXIMO = (() => {
  const m = mochila('bachillerato', 'universidad', 7);
  return POBLACION_EDAD.reduce((s, p, edad) => s + p * m[edad].euros, 0) / 1e6;
})();

/**
 * A realistic scenario: today's pupils (avance-2526; universities 2023-2024,
 * universidad-2324), each paid what the backpack gives for their stage. Only
 * those who study today count, in every network. Leaves out special education
 * and other programmes (≈ 64.000 pupils). Computed, M€ a year.
 */
export const COSTE_PAIS_REAL = (() => {
  const a = ALUMNADO, c = COSTE_ALUMNO;
  return (
    (a.inf1 + a.inf2) * c.infantil + a.primaria * c.primaria + a.eso * c.eso + a.bachillerato * c.bachillerato +
    (a.fpBasica + a.fpMedia) * c.fpMedia + a.fpSuperior * c.fpSuperior + a.universidad * c.universidad
  ) / 1e6;
})();

/** Lifelong learning credit (proposal): unused years become courses until 65, paid at the higher vocational rate. */
export const CREDITO = { hasta: 65, tarifa: COSTE_ALUMNO.fpSuperior };

// ── RULES OF THE BACKPACK (proposal) ────────────────────────────────────────
export const REGLAS: { t: string; d: string }[] = [
  { t: 'El dinero va con el alumno', d: 'Cada año, la escuela que elige la familia (o el propio alumno, cuando ya es mayor) recibe lo que le toca de su mochila. Si cambia de escuela, el dinero cambia con él.' },
  { t: 'Quien acepta la mochila no cobra nada más', d: 'Ni cuotas, ni «donativos», ni actividades obligatorias de pago. Si una escuela quiere cobrar, queda fuera de la mochila y es privada del todo.' },
  { t: 'Nadie elige a sus alumnos', d: 'La escuela no puede hacer exámenes de entrada ni entrevistas. Si hay más solicitudes que plazas, se sortea, con preferencia para hermanos y para quien vive cerca.' },
  { t: 'Más dinero para quien lo necesita', d: 'La mochila de un niño con discapacidad, de una familia con pocos ingresos o de quien llega sin saber el idioma lleva una parte más. Así a ninguna escuela le conviene rechazarlo, y la que lo acoge tiene con qué atenderle.' },
  { t: 'Las mismas reglas para todas', d: 'Mismo currículo básico, mismas evaluaciones, cuentas abiertas y la misma inspección. Da igual quién sea el dueño del edificio: lo que cuenta es que cumple.' },
  { t: 'Una plaza para cada niño, siempre', d: 'Cada municipio garantiza que hay escuela cerca para todos. La mochila no puede dejar a nadie sin plaza porque las escuelas prefieran a otros.' },
];

// ── WHAT OTHER COUNTRIES LEARNED ────────────────────────────────────────────
export const PAISES: { id: string; pais: string; que: string; paso: string; leccion: string; fuentes: string[] }[] = [
  {
    id: 'chile', pais: 'Chile, desde 1981',
    que: 'El Estado paga a cada escuela por alumno, sea pública o privada. Durante décadas las privadas subvencionadas podían cobrar además a las familias (copago) y elegir alumnos.',
    paso: 'Las familias de clase media se marcharon de la escuela pública, y la media de resultados no mejoró más donde hubo más competencia. En 2015 una ley prohibió el copago nuevo, la selección y el lucro, y dio más dinero por alumno vulnerable. Siete años después, la segregación por renta seguía sin bajar.',
    leccion: 'Si la escuela puede cobrar más o elegir alumnos, la mochila separa a ricos y pobres. Y una vez separados, deshacerlo cuesta mucho.',
    fuentes: ['chile-1981', 'chile-2015'],
  },
  {
    id: 'suecia', pais: 'Suecia, desde 1992',
    que: 'Un cheque escolar universal: las familias eligen escuela y el dinero va con el alumno, también a las nuevas escuelas independientes.',
    paso: 'Donde más se usó la elección, más aumentó la separación entre alumnos de origen inmigrante y nativos, y entre hijos de padres con más y menos estudios. El efecto fue pequeño y Suecia sigue en un nivel bajo o medio de segregación.',
    leccion: 'Aunque nadie pague de más, las familias con más información eligen antes y mejor. Hace falta reparto activo de plazas y ayuda para elegir.',
    fuentes: ['suecia'],
  },
  {
    id: 'holanda', pais: 'Países Bajos, desde 1917',
    que: 'La Constitución obliga a financiar igual a las escuelas públicas y a las de iniciativa privada. Cada escuela recibe un presupuesto anual y decide en qué gastarlo.',
    paso: 'Primaria y secundaria no cobran matrícula. Es lo más parecido a la mochila que funciona desde hace un siglo: «pública» o «privada» deja de ser un debate de dinero.',
    leccion: 'Se puede: igual financiación para todas, sin matrícula, y libertad para elegir proyecto educativo.',
    fuentes: ['holanda'],
  },
];

// ── INSIDE THE SCHOOL ───────────────────────────────────────────────────────
export const EVIDENCIA: { id: string; t: string; meses: string; tono: 'bien' | 'neutro' | 'mal'; d: string; fuente: string }[] = [
  { id: 'tutoria', t: 'Alumnos que enseñan a alumnos', meses: '+6 meses', tono: 'bien', d: 'Lo que avanzan de más, de media, en un curso. Ganan los dos: quien enseña repasa y ordena lo que sabe, y quien aprende recibe atención de uno a uno. Los que más ganan son los que van más atrasados. Funciona mejor con menos de tres años de diferencia, 4 o 5 sesiones a la semana y tutores formados. Cuesta muy poco.', fuente: 'eef-tutoria' },
  { id: 'grupos', t: 'Grupos de avance dentro de la clase', meses: '+2 meses', tono: 'neutro', d: 'De media; en matemáticas, unos 4 meses. Solo si los grupos se rehacen a menudo y nadie se queda fijo «en el de abajo». Las pruebas son todavía pocas.', fuente: 'eef-grupos' },
  { id: 'separar', t: 'Separar en clases distintas por nivel', meses: '0 meses', tono: 'mal', d: 'De media no mejora nada, y a los que van más atrasados les perjudica un poco. Por eso la propuesta mezcla edades y niveles dentro de la clase, en vez de separar.', fuente: 'eef-separar' },
];

export const PROYECTOS_EVIDENCIA = {
  reinoUnido: { meses: -2, mesesDesfavorecidos: -3, escuelas: 24 }, // eef-proyectos
  eeuu: { puntos: 8, conProyectos: 45, sinProyectos: 37, escuelas: 68, alumnos: 3_645 }, // proyectos-ap
};

/** What a week could look like in 3º de ESO under the proposal. An example, not a timetable. */
export const SEMANA: { t: string; horas: string; d: string }[] = [
  { t: 'Materias básicas en grupos de avance', horas: '≈ 15 h', d: 'Lengua, matemáticas, ciencias e idiomas. Cada alumno trabaja a su nivel dentro de la clase; los grupos cambian cada pocas semanas.' },
  { t: 'Proyecto de grupo', horas: '≈ 5 h', d: 'Por ejemplo, diseñar la instalación solar del patio: calcular, presupuestar, presentar al claustro y, si se aprueba, montarla con ayuda de un profesional.' },
  { t: 'Taller de oficios', horas: '≈ 4 h', d: 'Carpintería, electricidad, fontanería, cocina, costura, reparación. Por turnos a lo largo del curso, como en Finlandia, donde los trabajos manuales son obligatorios de 1º a 7º.' },
  { t: 'Enseñar a los pequeños', horas: '≈ 2 h', d: 'Tutoría con alumnos de 1º de ESO o de primaria: lectura en voz alta, problemas de matemáticas, apoyo en su proyecto. Cuenta en su nota.' },
  { t: 'Proyecto propio', horas: '≈ 2 h', d: 'Algo real y suyo, con un tutor: arreglar una bicicleta, construir un mueble, montar un pequeño huerto, grabar un documental del barrio.' },
];

// ── THE EVALUATOR BOT (proposal) ────────────────────────────────────────────
export const BOT: { t: string; d: string }[] = [
  { t: 'Lee los datos abiertos', d: 'Cuánto recibe cada escuela, cuántos alumnos tiene, cómo avanzan, cuántos abandonan, cuántos alumnos con más necesidades acoge, qué opinan familias y alumnos.' },
  { t: 'Compara con lo que funciona', d: 'Contrasta cada medida con las pruebas disponibles (como las de la Education Endowment Foundation) y avisa cuando algo se hace sin pruebas o contra ellas.' },
  { t: 'Busca lo que sobra', d: 'Trámites repetidos, normas que se contradicen, papeles que nadie lee. Propone qué quitar para que el sistema sea más sencillo.' },
  { t: 'Vigila que la mochila no separe', d: 'Si en una escuela empiezan a faltar alumnos con más necesidades, o una zona se queda sin plazas, da la alarma.' },
  { t: 'Explica y no decide', d: 'Publica cada evaluación en lenguaje claro, con sus datos y su método. Las decisiones las toman las asambleas de cada escala.' },
];

/**
 * A made-up school, to show what the bot's report would look like. SIMULATED:
 * no real school, no real data. The main indicator is progress against where
 * the pupils started (value added), not raw marks.
 */
export const FICHA_EJEMPLO = {
  nombre: 'Escuela Los Almendros (inventada)',
  alumnos: 412,
  indicadores: [
    { t: 'Progreso de sus alumnos', v: '+0,4 cursos', d: 'Lo que avanzan en un año comparado con alumnos que llegaron con el mismo nivel a otras escuelas. Es el indicador principal: no premia tener alumnos «fáciles», sino hacerles avanzar.', tono: 'bien' as const },
    { t: 'Alumnos con más necesidades', v: '11 % (barrio: 23 %)', d: 'Acoge la mitad de los que le tocarían por su barrio.', tono: 'mal' as const },
    { t: 'Siguen estudiando a los 18', v: '91 %', d: 'Alumnos que terminan bachillerato o FP.', tono: 'bien' as const },
    { t: 'Tutoría entre alumnos', v: '2 h / semana', d: 'Media por alumno de 3º y 4º de ESO; los pequeños tutorizados avanzan algo más que el resto.', tono: 'neutro' as const },
    { t: 'Familias satisfechas', v: '8,1 / 10', d: 'Encuesta anual, anónima.', tono: 'neutro' as const },
  ],
  alarma: 'Recibe muchas menos solicitudes de familias con pocos ingresos que las escuelas vecinas. El bot revisa cómo informa del sorteo y pide al municipio que oriente a esas familias hacia ella.',
  simplificar: 'Hace tres informes trimestrales distintos (para la inspección, para la región y para las familias) con casi los mismos datos. Propuesta: uno solo, generado de los datos abiertos, que cada cual lee a su nivel.',
};

/** Who looks after each person, from birth to 25 (proposal: «cuidado y encauzado por la sociedad»). */
export const ACOMPANAN: { edad: string; quien: string }[] = [
  { edad: '0 a 3 años', quien: 'La familia, con grupos de crianza en la vecindad y una educadora del municipio que la visita. Escuela infantil si la familia quiere.' },
  { edad: '3 a 12 años', quien: 'La escuela que elige la familia, con un tutor de clase y alumnos mayores que le ayudan.' },
  { edad: '12 a 18 años', quien: 'El instituto o la FP, su tutor y un orientador. Ya enseña a los más pequeños.' },
  { edad: '18 a 25 años', quien: 'Elige ella. El mismo orientador la acompaña si cambia de estudios o empieza a trabajar.' },
];

/** Two more pieces of the backpack (proposals). */
export const PIEZAS_MOCHILA: { t: string; d: string }[] = [
  { t: 'Un portafolio que viaja con la mochila', d: 'Un único expediente de cada persona, suyo y en el móvil: sus proyectos, los oficios que ha practicado, las horas de tutoría que ha dado y recibido, y sus títulos. Si cambia de escuela, de ciudad o de país, va con ella. Sirve para que la nueva escuela la conozca y para buscar trabajo.' },
  { t: 'Lo que no se usa, para toda la vida', d: 'Lo que queda en la mochila a los 25 años se convierte en crédito de formación hasta los 65, a precio de FP superior. Quien empezó a trabajar a los 18 puede volver a estudiar a los 30 o a los 50 sin pagar.' },
];

// ── WHAT EACH SCALE DOES WITH THE BACKPACK (proposal, on top of MATRIZ) ─────
export const ESCALA_MOCHILA: Record<string, string> = {
  persona: 'Elige escuela con su familia y, desde los 16, decide ella. Al hacerse mayor, enseña a los más pequeños como parte de su propio currículo.',
  vecindad: 'Grupos de crianza de 0 a 3 años, sala de estudio y apoyo escolar entre vecinos. Puede acoger el «proyecto propio» de un alumno: arreglar un banco, pintar un portal.',
  municipio: 'Garantiza plaza cercana para cada niño, reparte las plazas por sorteo y ofrece talleres de oficios con artesanos del pueblo.',
  provincia: 'Institutos y FP que los pueblos solos no sostienen, transporte escolar y el equipo de orientación que comparten varios municipios.',
  region: 'Pone el dinero de la mochila, forma y paga al profesorado, sostiene las universidades y hace la inspección.',
  nacion: 'Fija el currículo básico, cuánto vale la mochila en cada etapa y cuánto más reciben quienes lo necesitan; publica los datos para el bot evaluador.',
  continente: 'Erasmus para todas las edades y reconocimiento de títulos entre países: la mochila se puede usar estudiando fuera.',
  planeta: 'Escuelas donde faltan y aprendizaje abierto y gratuito en internet para cualquiera.',
};

// ── WHAT IS STILL OPEN ──────────────────────────────────────────────────────
export const RETOS: { t: string; d: string }[] = [
  { t: 'Cuesta más que hoy', d: `Con quienes estudian hoy, la mochila costaría unos ${numero(Math.round((COSTE_PAIS_REAL - DINERO.publico2024) / 1000) * 1000)} M€ más al año que el gasto público actual; si todo el mundo la usara entera, unos ${numero(Math.round((COSTE_PAIS_MAXIMO - DINERO.publico2024) / 1000) * 1000)} M€ más. Hay que decidir de qué tercio y de qué escala sale la diferencia, o rebajar alguna etapa.` },
  { t: 'Lo que no se usa: propuesta y coste', d: 'La propuesta es que lo que queda sin usar a los 25 se convierta en crédito de formación hasta los 65, a precio de FP superior. Es justo con quien empezó a trabajar pronto, pero ese dinero hay que guardarlo durante años: falta decidir en qué caja y qué parte se paga cada año.' },
  { t: 'De 0 a 3 años, ¿escuela o casa?', d: 'Muchas familias prefieren cuidar en casa. Si la mochila solo paga escuela infantil, empuja a llevar a los bebés. Si también paga crianza en casa, hay que acompañarla para que sea educativa.' },
  { t: 'Familias que no eligen', d: 'Elegir bien pide tiempo e información. Sin ayuda, las familias con menos recursos acaban en las escuelas que nadie quiere. Hace falta un orientador público y una plaza asignada por defecto.' },
  { t: 'Escuelas que se vacían', d: 'Si una escuela pierde alumnos, pierde dinero y puede cerrar, también en un pueblo donde es la única. Las escuelas rurales necesitan un mínimo garantizado, aunque tengan pocos alumnos.' },
  { t: 'Enseñar no puede ser trabajo gratis', d: 'Los alumnos mayores que enseñan aprenden, pero no pueden sustituir a profesores. Hay que limitar sus horas, formarlos y que cuente en su nota, no en la plantilla.' },
  { t: 'Talleres que cuestan', d: 'Un taller de carpintería o electricidad necesita espacio, herramientas, seguridad y profesores que sepan el oficio. Al principio, compartir talleres entre escuelas y con la FP.' },
  { t: 'Cambiar las leyes y los conciertos', d: 'Hoy la concertada funciona con conciertos que firma cada comunidad autónoma. Pasar a la mochila exige una ley nueva y un tiempo de transición para que ninguna escuela cierre de golpe.' },
];
