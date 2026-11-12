// Data for the «Sanidad» window of the «Modelo socioeconómico optimizado»
// (Eugenio, 2026-11-12): average waits for some appointments, how collapsed the
// health system is, the proposal, and the problem of a medical record that does
// not travel between regions or between public and private care: one single
// record per person, with one profile that holds all their health information.
//
// Every real figure carries the id of its source (FUENTES_SANIDAD). Anything that
// is a proposal says so in the text of the component.

// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'sanidad', t: 'Resumen' },
  { id: 'sanidad-esperas', t: 'Cuánto se espera' },
  { id: 'sanidad-comunidades', t: 'Cada comunidad' },
  { id: 'sanidad-gasto', t: 'Lo que cuesta' },
  { id: 'sanidad-expediente', t: 'El expediente hoy' },
  { id: 'sanidad-propuesta', t: 'La propuesta' },
  { id: 'sanidad-escalas', t: 'Cada escala' },
  { id: 'sanidad-retos', t: 'Retos' },
  { id: 'sanidad-fuentes', t: 'Fuentes' },
];

export interface FuenteSanidad { id: string; titulo: string; url: string }
export const FUENTES_SANIDAD: FuenteSanidad[] = [
  { id: 'sisle-nota', titulo: 'Ministerio de Sanidad · Listas de espera de la sanidad pública a 31-12-2025, nota resumen', url: 'https://www.sanidad.gob.es/gl/estadEstudios/estadisticas/inforRecopilaciones/docs/Nota_Resumen_SISLE__dic25.pdf' },
  { id: 'sisle-rectificacion', titulo: 'Ministerio de Sanidad · Nota de rectificación de las listas de espera de diciembre de 2025 (corrige Castilla-La Mancha)', url: 'https://www.sanidad.gob.es/eu/estadEstudios/estadisticas/inforRecopilaciones/docs/Nota_Aclaratoria_Rectificacion_Dic_2025.pdf' },
  { id: 'sisle-2019', titulo: 'Ministerio de Sanidad · Listas de espera a 31-12-2019', url: 'https://mirror.mscbs.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS_PUBLICACION_dic19.pdf' },
  { id: 'sisle-2021', titulo: 'Ministerio de Sanidad · Listas de espera a 31-12-2021 (con la diferencia frente a 2020)', url: 'https://vsf-iwsold-pro-01.mscbs.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS_PUBLICACION_dic21.pdf' },
  { id: 'sisle-2023', titulo: 'Ministerio de Sanidad · Listas de espera a 31-12-2023', url: 'https://vsf-iwsold-pre-portal.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS_PUBLICACION_dic2023.pdf' },
  { id: 'sisle-informe', titulo: 'Ministerio de Sanidad · Informe de situación de las listas de espera, diciembre de 2025', url: 'https://www.msps.es/estadEstudios/estadisticas/inforRecopilaciones/docs/Informe_situacion_listas_de_espera_dic_2025_V1.pdf' },
  { id: 'sisle-ccaa', titulo: 'Ministerio de Sanidad · Listas de espera por comunidad autónoma, diciembre de 2025', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS%5FPUBLICACION%5FDic%5F2025.pdf' },
  { id: 'barometro-2026', titulo: 'Ministerio de Sanidad y CIS · Barómetro Sanitario 2026, segunda oleada (julio de 2026)', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2026/2Oleada/2026_2_OLA_NOTA_TECNICA.pdf' },
  { id: 'barometro-2025', titulo: 'Ministerio de Sanidad y CIS · Barómetro Sanitario 2025, infografía del año', url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/BarometroSanitario/Barom_Sanit_2025/Totales/Infografia-Barometro_Sanitario-2025.pdf' },
  { id: 'igae-cofog', titulo: 'Intervención General del Estado (IGAE) · Gasto de las administraciones públicas por funciones 2020-2024', url: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP_A/Funcional%202020-2024.pdf' },
  { id: 'egsp-2024', titulo: 'Ministerio de Sanidad · El gasto sanitario público alcanzó 101.739 millones de euros en 2024 (mayo de 2026)', url: 'https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6908' },
  { id: 'scs-2022', titulo: 'Ministerio de Sanidad · Informe anual del Sistema Nacional de Salud 2024, resumen (gasto de 2022, urgencias de 2023)', url: 'https://www.sanidad.gob.es/gabinetePrensa/notaPrensa/pdf/Infor041225111735562.pdf' },
  { id: 'rd-1039', titulo: 'Boletín Oficial del Estado · Real Decreto 1039/2011, tiempos máximos de espera en la sanidad pública', url: 'https://www.boe.es/eli/es/rd/2011/07/15/1039' },
  { id: 'hcdsns', titulo: 'Ministerio de Sanidad · Historia Clínica Digital del Sistema Nacional de Salud', url: 'https://www.sanidad.gob.es/profesionales/hcdsns/home.htm' },
  { id: 'resns', titulo: 'Ministerio de Sanidad · Receta electrónica que funciona entre comunidades', url: 'https://www.sanidad.gob.es/areas/saludDigital/recetaElectronicaSNS/home.htm' },
  { id: 'europa-2023', titulo: 'Ministerio de Sanidad · Resumen de historia y receta electrónica con otros países europeos (agosto de 2023)', url: 'https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6205' },
  { id: 'ley-salud-digital', titulo: 'Ministerio de Sanidad · Consulta pública de la Ley de Salud Digital (septiembre de 2025)', url: 'https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6750' },
  { id: 'ehds', titulo: 'Comisión Europea · Reglamento del Espacio Europeo de Datos de Salud', url: 'https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space-regulation-ehds_en' },
  { id: 'ocde-2025', titulo: 'OCDE · Health at a Glance 2025, ficha de España (médicos y enfermeras por habitante)', url: 'https://www.oecd.org/en/publications/health-at-a-glance-2025_15a55280-en/spain_d37fc9b6-en.html' },
];
export const FS = Object.fromEntries(FUENTES_SANIDAD.map(f => [f.id, f])) as Record<string, FuenteSanidad>;

/** The three doors of the public system and how long each takes (the Ministry's waiting-list register and the CIS). */
export const ESPERAS = {
  // Waiting list for non-urgent surgery, 31-12-2025 (sisle-nota)
  // Rectified in the note of the Ministry after Castilla-La Mancha corrected its data (sisle-rectificacion)
  cirugia: { dias: 122, pacientes: 853_740, mas6meses: 21.6, porMil: 17.69, diasAnoAntes: 126 },
  // First visit with a hospital specialist, 31-12-2025 (sisle-nota, sisle-informe)
  especialista: { dias: 102, pacientesAprox: 4_000_000, mas60dias: 61.5, porMil: 84.42, diasAnoAntes: 105 },
  // Family doctor, July 2026 (barometro-2026): only for those not seen the same or the next day
  primaria: { dias: 9.71, mismoDiaOSiguiente: 21, dias2025: 9.15 },
};

/** Share of people who had each test and waited a month or less since their doctor asked for it, 2025 (barometro-2025). */
export const PRUEBAS: { t: string; enUnMes: number }[] = [
  { t: 'Ecografía', enUnMes: 55.7 },
  { t: 'Escáner', enUnMes: 53 },
  { t: 'Resonancia', enUnMes: 48.4 },
  { t: 'Colonoscopia', enUnMes: 38.1 },
];

/** Specialties with the longest and shortest averages (sisle-nota). */
export const ESPECIALIDADES = {
  cirugiaMas: [{ t: 'Cirugía plástica', d: 269 }, { t: 'Neurocirugía', d: 172 }, { t: 'Cirugía vascular', d: 152 }],
  cirugiaMenos: [{ t: 'Dermatología', d: 64 }, { t: 'Cirugía del corazón', d: 77 }, { t: 'Oftalmología', d: 80 }],
  consultaMas: [{ t: 'Traumatología', d: 132 }, { t: 'Dermatología', d: 127 }],
  consultaMenos: [{ t: 'Cirugía general', d: 61 }, { t: 'Ginecología', d: 64 }, { t: 'Cardiología', d: 68 }],
};

/** The five operations with a legal maximum of 180 days (rd-1039) and how they did at 31-12-2025 (sisle-nota). */
export const GARANTIZADAS: { t: string; dias: number; fuera: number }[] = [
  { t: 'Bypass del corazón', dias: 54, fuera: 1.6 },
  { t: 'Cambio de una válvula del corazón', dias: 71, fuera: 6.9 },
  { t: 'Cataratas', dias: 68, fuera: 2.6 },
  { t: 'Prótesis de cadera', dias: 98, fuera: 13.7 },
  { t: 'Prótesis de rodilla', dias: 105, fuera: 15.9 },
];

/**
 * Each region at 31-12-2025 (sisle-ccaa): average days for surgery, share waiting
 * more than six months, average days for a first specialist visit and people
 * waiting for one. Ceuta and Melilla are left out (run by the State, very small).
 */
export interface Comunidad { id: string; nombre: string; cirugia: number; mas6: number; consulta: number; enConsulta: number }
export const COMUNIDADES: Comunidad[] = [
  { id: 'and', nombre: 'Andalucía', cirugia: 173, mas6: 32.2, consulta: 136, enConsulta: 852_889 },
  { id: 'ara', nombre: 'Aragón', cirugia: 132, mas6: 21.7, consulta: 138, enConsulta: 124_482 },
  { id: 'ast', nombre: 'Asturias', cirugia: 91, mas6: 10.4, consulta: 103, enConsulta: 116_483 },
  { id: 'bal', nombre: 'Baleares', cirugia: 105, mas6: 22.4, consulta: 71, enConsulta: 90_670 },
  { id: 'can', nombre: 'Canarias', cirugia: 106, mas6: 17.4, consulta: 162, enConsulta: 143_744 },
  { id: 'cnt', nombre: 'Cantabria', cirugia: 137, mas6: 26.2, consulta: 61, enConsulta: 37_331 },
  { id: 'cyl', nombre: 'Castilla y León', cirugia: 87, mas6: 13.8, consulta: 102, enConsulta: 185_112 },
  { id: 'clm', nombre: 'Castilla-La Mancha', cirugia: 92, mas6: 16.5, consulta: 64, enConsulta: 52_788 },
  { id: 'cat', nombre: 'Cataluña', cirugia: 142, mas6: 32.0, consulta: 120, enConsulta: 509_602 },
  { id: 'val', nombre: 'Comunidad Valenciana', cirugia: 88, mas6: 16.1, consulta: 95, enConsulta: 434_023 },
  { id: 'ext', nombre: 'Extremadura', cirugia: 135, mas6: 23.1, consulta: 112, enConsulta: 92_290 },
  { id: 'gal', nombre: 'Galicia', cirugia: 73, mas6: 5.7, consulta: 63, enConsulta: 205_248 },
  { id: 'mad', nombre: 'Madrid', cirugia: 50, mas6: 0.8, consulta: 68, enConsulta: 965_548 },
  { id: 'mur', nombre: 'Murcia', cirugia: 103, mas6: 19.3, consulta: 89, enConsulta: 112_064 },
  { id: 'nav', nombre: 'Navarra', cirugia: 96, mas6: 16.7, consulta: 152, enConsulta: 61_166 },
  { id: 'pvs', nombre: 'País Vasco', cirugia: 64, mas6: 2.3, consulta: 49, enConsulta: 75_612 },
  { id: 'rio', nombre: 'La Rioja', cirugia: 78, mas6: 6.4, consulta: 32, enConsulta: 8_481 },
];

/** Money (millions of euros). */
export const GASTO = {
  // Public spending on health per the statistics office of the Ministry, 2024 (egsp-2024)
  publicoEGSP2024: 101_739, pctPIB: 6.4, porHabitante: 2_084, comunidadesPct: 93.6, sueldosPct: 44.8, hospitalesPct: 62.1,
  porHabitanteMax: { t: 'País Vasco', v: 2_332 }, porHabitanteMin: { t: 'Andalucía', v: 1_658 }, porHabitanteMadrid: 1_779,
  // Public and private, 2022 (scs-2022): the latest year with both
  total2022: 134_023, publico2022: 99_347, privado2022: 34_676, bolsillo2022: 25_143, privadoPct2022: 25.9,
};

/** What the CIS found about the record (barometro-2026). */
export const EXPEDIENTE_HOY = {
  hanEntrado: 39.2, nuncaEntraron: 60.4,
  conocenQueOtraComunidadVe: 44.9,
  atendidosFuera: 6.2, medicoConsultoInformes: 25.4,
  seguroPrivado: 21.9, seguroEmpresa: 6.7,
  creenQueEmpeora: 40.7,
};

/**
 * Proposed maximum waits. A proposal of this page, to be debated: no official
 * source. Today only five operations have a legal maximum (180 days, rd-1039).
 */
export const PLAZOS_PROPUESTOS: { puerta: string; hoy: string; propuesta: string }[] = [
  { puerta: 'Médico de familia', hoy: '9,7 días si no hay cita para hoy o mañana; sin plazo legal', propuesta: '48 horas; el mismo día si es urgente' },
  { puerta: 'Primera visita al especialista', hoy: '102 días de media; sin plazo legal común', propuesta: '30 días; 15 si el médico de familia lo marca preferente' },
  { puerta: 'Pruebas (resonancia, escáner, ecografía)', hoy: 'No hay dato oficial de espera media; según el CIS, cerca de la mitad tarda más de un mes', propuesta: '30 días' },
  { puerta: 'Operación no urgente', hoy: '122 días de media; plazo legal de 180 solo en cinco operaciones', propuesta: '90 días para todas; 30 si es cáncer o corazón' },
];

/** Average days to wait for an operation, every 31 December. */
export const EVOLUCION_CIRUGIA: { ano: number; dias: number; fuente: string }[] = [
  { ano: 2019, dias: 121, fuente: 'sisle-2019' },
  { ano: 2020, dias: 155, fuente: 'sisle-2021' }, // 2021's 123 days are 32 fewer than 2020
  { ano: 2021, dias: 123, fuente: 'sisle-2021' },
  { ano: 2022, dias: 120, fuente: 'sisle-ccaa' }, // the 2025 report charts Dec 2022 to Dec 2025
  { ano: 2023, dias: 128, fuente: 'sisle-2023' },
  { ano: 2024, dias: 126, fuente: 'sisle-nota' },
  { ano: 2025, dias: 122, fuente: 'sisle-rectificacion' },
];

/** Hospital emergency departments, 2023 (scs-2022, the same annual report). No official waiting time exists. */
export const URGENCIAS = { visitas2023: 24_895_110, porPersona: 0.52, subida10anos: 17.0 };

/** Practising doctors and nurses per 1.000 inhabitants, Spain and the OECD average (ocde-2025). */
export const PERSONAL = { medicos: 4.4, medicosOCDE: 3.9, enfermeras: 5.9, enfermerasOCDE: 9.2 };
