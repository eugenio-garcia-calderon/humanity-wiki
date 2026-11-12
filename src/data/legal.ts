// Data for the «Legal» window of the «Modelo socioeconómico optimizado»
// (Eugenio, 2026-11-12): one rule per basic matter, the same text across the
// country and later across Europe; smaller scales only adjust inside margins.
// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
//
// Every real figure carries a source id from `FUENTES_LEGAL`, all checked on
// 2026-11-12. Anything marked `propuesta` is the proposal, not today's law.
import type { EscalaId } from './modeloSocioeconomico';

export const APARTADOS: { id: string; t: string }[] = [
  { id: 'legal', t: 'Resumen' },
  { id: 'legal-quien', t: 'Quién legisla' },
  { id: 'legal-cifras', t: 'Cuántas normas' },
  { id: 'legal-sectores', t: 'Dónde más duele' },
  { id: 'legal-propuesta', t: 'La propuesta' },
  { id: 'legal-licencias', t: 'Licencias' },
  { id: 'legal-escalas', t: 'Cada escala' },
  { id: 'legal-retos', t: 'Retos' },
  { id: 'legal-prueba', t: 'Ponte a prueba' },
  { id: 'legal-fuentes', t: 'Fuentes' },
];

// ── SOURCES ─────────────────────────────────────────────────────────────────
export interface FuenteLegal { id: string; titulo: string; url: string }
export const FUENTES_LEGAL: FuenteLegal[] = [
  { id: 'bde-blog', titulo: 'Banco de España · La complejidad normativa en España, un freno para las empresas (2025)', url: 'https://www.bde.es/wbe/es/noticias-eventos/blog/series/retos-economia-espanola/la-complejidad-normativa-en-espana-un-freno-para-las-empresas-y-el-crecimiento-economico.html' },
  { id: 'bde-dt2202', titulo: 'Banco de España · Mora-Sanguinetti y Soler, La regulación sectorial en España (DT 2202, 2022)', url: 'https://repositorio.bde.es/bitstream/123456789/20526/1/dt2202.pdf' },
  { id: 'ceoe-2024', titulo: 'CEOE · Producción normativa en 2024 (resumen en Forbes)', url: 'https://forbes.es/economia/754738/ceoe-denuncia-que-el-exceso-de-la-burocracia-frena-la-inversion-tras-aumentar-un-5-las-normas-en-2024/' },
  { id: 'bde-lgum', titulo: 'Banco de España · Mecanismos de protección de la Ley de unidad de mercado (Documento ocasional, 2026)', url: 'https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/documentos-ocasionales/un-analisis-de-los-mecanismos-de-proteccion-de-los-operadores-economicos-establecidos-por-la-ley-de-garantia-de-la-unidad-de-mercado.html' },
  { id: 'cnmc-um-2026', titulo: 'CNMC · Actuaciones de unidad de mercado, septiembre de 2026', url: 'https://www.cnmc.es/sites/default/files/editor_contenidos/Notas%20de%20prensa/2026/UM%20-%20septiembre%202026.pdf' },
  { id: 'cnmc-suelo', titulo: 'CNMC · Propuesta para reducir trabas urbanísticas (E/CNMC/001/25, junio de 2026)', url: 'https://cnmc.es/prensa/estudio-suelo-vivienda-20260629' },
  { id: 'mpt-conflictividad', titulo: 'Ministerio de Política Territorial · Boletín de conflictividad Estado-comunidades, 3.er trimestre de 2024', url: 'https://mptmd.gob.es/content/dam/mpt/politica-territorial/autonomica/regimen_juridico/Boletin_de_Conflictividad_3_Trimestre_2024.pdf' },
  { id: 'mpt-lexter', titulo: 'Ministerio de Política Territorial · Base de datos LEXTER abierta al público (julio de 2026)', url: 'https://mptmd.gob.es/content/dam/mpt/prensa/notas_de_prensa/notas/2026/07/20260708RECURSOS_LEXTER.pdf' },
  { id: 'tc-2024', titulo: 'Tribunal Constitucional · Memoria 2024 (resumen en El Derecho)', url: 'https://elderecho.com/el-presidente-del-tc-presenta-a-sm-el-rey-la-memoria-2024' },
  { id: 'ine-municipios', titulo: 'INE · Relación de municipios, provincias y comunidades autónomas', url: 'https://ine.es/daco/daco42/codmun/cod_num_muni_provincia_ccaa.htm' },
  { id: 'constitucion', titulo: 'BOE · Constitución Española (arts. 137, 140, 148, 149, 150, 167 y 168)', url: 'https://www.boe.es/eli/es/c/1978/12/27/(1)/con' },
  { id: 'carta-local', titulo: 'BOE · Carta Europea de Autonomía Local', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1989-4370' },
  { id: 'ley-lgum', titulo: 'BOE · Ley 20/2013, de garantía de la unidad de mercado', url: 'https://www.boe.es/eli/es/l/2013/12/09/20/con' },
  { id: 'stc-79-2017', titulo: 'Legal Today · El TC anula la «eficacia nacional» de la Ley de unidad de mercado (STC 79/2017)', url: 'https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/el-tc-avala-la-ley-de-unidad-de-mercado-pero-exige-un-estandar-normativo-comun-para-aplicar-el-principio-de-eficacia-en-todo-el-territorio-nacional-2017-06-27/' },
  { id: 'loapa', titulo: 'El Debate · La LOAPA, el intento fallido de ley de armonización (2022)', url: 'https://www.eldebate.com/espana/20220812/loapa-fallido-intento-ucd-psoe-reordenar-competencias-autonomicas_54139.html' },
  { id: 'ley-ruido', titulo: 'BOE · Ley 37/2003, del Ruido', url: 'https://www.boe.es/eli/es/l/2003/11/17/37/con' },
  { id: 'ley-clima', titulo: 'BOE · Ley 7/2021, de cambio climático (art. 14: zonas de bajas emisiones)', url: 'https://www.boe.es/eli/es/l/2021/05/20/7/con' },
  { id: 'zbe-149', titulo: 'Maldita · Al menos 149 municipios deben tener zona de bajas emisiones (padrón del INE de 2021)', url: 'https://maldita.es/malditodato/20220523/zonas-bajas-emisiones-espana/' },
  { id: 'aire-ue', titulo: 'Consejo de la UE · Nueva directiva de calidad del aire (2024/2881)', url: 'https://www.consilium.europa.eu/es/policies/air-quality/' },
  { id: 'ley-residuos', titulo: 'BOE · Ley 7/2022, de residuos (art. 11.3: tasa de basuras)', url: 'https://www.boe.es/eli/es/l/2022/04/08/7/con' },
  { id: 'ley-horarios', titulo: 'BOE · Ley 1/2004, de horarios comerciales', url: 'https://www.boe.es/eli/es/l/2004/12/21/1/con' },
  { id: 'ley-12-2012', titulo: 'BOE · Ley 12/2012, de liberalización del comercio (licencia exprés)', url: 'https://www.boe.es/eli/es/l/2012/12/26/12/con' },
  { id: 'ley-39-2015', titulo: 'BOE · Ley 39/2015, del procedimiento administrativo (art. 69)', url: 'https://www.boe.es/eli/es/l/2015/10/01/39/con' },
  { id: 'ley-suelo', titulo: 'BOE · Texto refundido de la Ley de Suelo y Rehabilitación Urbana (2015)', url: 'https://www.boe.es/eli/es/rdlg/2015/10/30/7/con' },
  { id: 'rdl-vtc', titulo: 'BOE · Real Decreto-ley 13/2018, sobre VTC', url: 'https://www.boe.es/eli/es/rdl/2018/09/28/13/con' },
  { id: 'rd-registro', titulo: 'BOE · Real Decreto 1312/2024, Registro Único de Arrendamientos', url: 'https://www.boe.es/eli/es/rd/2024/12/23/1312/con' },
  { id: 'ts-registro', titulo: 'Osborne Clarke · El Supremo anula el registro estatal de alquileres de corta duración (STS 620/2026)', url: 'https://www.osborneclarke.com/es/insights/el-tribunal-supremo-anula-el-registro-nacional-de-alquileres-de-corta-duracion' },
  { id: 'caza', titulo: 'Junta de Extremadura · Licencia interautonómica de caza y pesca (convenio de 2026)', url: 'https://www.juntaex.es/w/caza-3' },
  { id: 'ley-animales', titulo: 'BOE · Ley 7/2023, de bienestar animal (preámbulo)', url: 'https://www.boe.es/eli/es/l/2023/03/28/7/con' },
  { id: 'eu-inc', titulo: 'Comisión Europea · EU Inc, un régimen único de empresa para toda la UE (marzo de 2026)', url: 'https://commission.europa.eu/news-and-media/news/eu-inc-making-business-easier-european-union-2026-03-18_es' },
  { id: 'oioo-ue', titulo: 'Comisión Europea · El enfoque «una entra, una sale»', url: 'https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification/one-one-out-approach_es' },
  { id: 'oioo-es', titulo: 'Ministerio para la Transformación Digital · Informe «one in, one out» 2021', url: 'https://digital.gob.es/content/dam/portal-mtdfp/funcion-publica/gobernanza-publica/simplificacion/compensacion-cargas-administrativas-/oioo/INFORME_ONE_IN_ONE_OUT_2021_Def.pdf' },
];
export const FUENTE_LEGAL = Object.fromEntries(FUENTES_LEGAL.map(f => [f.id, f])) as Record<string, FuenteLegal>;

// ── FIGURES ─────────────────────────────────────────────────────────────────
export const NORMAS = {
  /** Norms approved by all Spanish administrations, 1979–2021 (bde-blog). */
  desde1979: 411_804,
  /** New provisions in 2022 alone (bde-blog). */
  en2022: 11_775,
  /** Sectoral norms of the autonomous communities, 1995–2020 (bde-dt2202). */
  sectorialesCCAA: 206_777,
  /** CEOE count for 2024: state and regional norms, and bulletin pages (ceoe-2024). */
  ceoe2024: { estatales: 719, autonomicas: 175, paginas: 300_000, actosUE: 2_790, origenUE: 46 },
  /** Municipalities (ine-municipios). */
  municipios: 8_132,
  ccaa: 17,
};

/** Municipalities over 50,000 inhabitants, obliged to have a low-emission zone (zbe-149, 2021 census). */
export const MUNICIPIOS_ZBE = 149;

/** Upper bound of distinct texts that can regulate one matter (EU + State + 17 regions + every municipality). */
export const TEXTOS_MAXIMOS = 1 + 1 + NORMAS.ccaa + NORMAS.municipios;

/**
 * Challenges between the State and the regions before the Constitutional Court
 * (mpt-conflictividad: «Total por anualidades» and the 1980–2024 total of 1,806).
 * 2010–2024 is derived: the total minus the earlier rows (the table we could read stops at 2012).
 */
export const IMPUGNACIONES = {
  total: 1_806, porEstado: 652, porCCAA: 1_154,
  periodos: [
    { t: '1980–1989', total: 748, anos: 10 },
    { t: '1990–1999', total: 275, anos: 10 },
    { t: '2000–2009', total: 355, anos: 10 },
    { t: '2010–2024', total: 428, anos: 15, derivado: true },
  ],
  /** Appeals avoided by negotiating (art. 33.2 LOTC, since 2000) (mpt-lexter). */
  evitadas: 606,
  /** Appeals and competence disputes in LEXTER over 45 years (mpt-lexter). */
  lexter: 2_325,
  /** Unconstitutionality appeals of every kind lodged in 2024 (tc-2024). */
  recursosTC2024: 30,
};

/** Complaints under the market-unity law, 2014–2024 (bde-lgum). */
export const RECLAMACIONES_LGUM = 1_000;

// ── WHO LEGISLATES: today and with the proposal, matter by matter ───────────
export type NivelId = 'ue' | 'estado' | 'ccaa' | 'diputacion' | 'municipio';
export interface Nivel { id: NivelId; nombre: string; cuantos: string; escala: EscalaId }
export const NIVELES: Nivel[] = [
  { id: 'ue', nombre: 'Unión Europea', cuantos: '1', escala: 'continente' },
  { id: 'estado', nombre: 'Estado', cuantos: '1', escala: 'nacion' },
  { id: 'ccaa', nombre: 'Comunidades autónomas', cuantos: '17, y Ceuta y Melilla', escala: 'region' },
  { id: 'diputacion', nombre: 'Diputaciones, cabildos y consejos insulares', cuantos: 'una por provincia o isla', escala: 'provincia' },
  { id: 'municipio', nombre: 'Ayuntamientos', cuantos: '8.132', escala: 'municipio' },
];

export interface Materia {
  id: string; nombre: string;
  /** What each level does today, and the source. */
  hoy: Record<NivelId, string>;
  /** What each level would do with the proposal. */
  propuesta: Record<NivelId, string>;
  fuentes: string[];
}
export const MATERIAS: Materia[] = [
  {
    id: 'ruido', nombre: 'Ruido', fuentes: ['ley-ruido'],
    hoy: {
      ue: 'Pide mapas de ruido de grandes ciudades, carreteras y aeropuertos.',
      estado: 'Fija unos límites de ruido para todo el país.',
      ccaa: 'Su ley va primero, y puede poner límites más estrictos.',
      diputacion: 'Sin papel propio.',
      municipio: 'Aprueba su propia ordenanza de ruido, con sus límites, horarios y multas.',
    },
    propuesta: {
      ue: 'A futuro, los mismos límites en toda Europa.',
      estado: 'Un solo texto con los límites de día, tarde y noche para cada tipo de zona.',
      ccaa: 'No escribe otra norma: vigila que se cumpla.',
      diputacion: 'Mide y presta los aparatos a los pueblos pequeños.',
      municipio: 'Elige qué calles son zona tranquila o de ocio, dentro de los tipos fijados, y multa con la tabla común.',
    },
  },
  {
    id: 'licencias', nombre: 'Licencias de actividad', fuentes: ['ley-12-2012', 'ley-39-2015'],
    hoy: {
      ue: 'La directiva de servicios pide no exigir permisos sin motivo.',
      estado: 'Las tiendas de hasta 750 m² ya no necesitan licencia: basta una declaración.',
      ccaa: 'Sus leyes de actividades, espectáculos y medio ambiente deciden qué necesita licencia.',
      diputacion: 'Ayuda a tramitar a los pueblos pequeños.',
      municipio: 'Cada uno tiene su ordenanza, sus impresos, sus plazos y sus tasas.',
    },
    propuesta: {
      ue: 'A futuro, el mismo catálogo de actividades en toda Europa.',
      estado: 'Un catálogo único: cada actividad, en uno de tres niveles (aviso, declaración o licencia).',
      ccaa: 'No añade requisitos: inspecciona.',
      diputacion: 'Presta personal técnico a los pueblos para revisar y visitar.',
      municipio: 'Recibe el trámite en la ventanilla única, comprueba y, si toca, da la licencia en el plazo común.',
    },
  },
  {
    id: 'aire', nombre: 'Calidad del aire', fuentes: ['aire-ue', 'ley-clima', 'zbe-149'],
    hoy: {
      ue: 'Fija los límites de contaminación del aire para todos los países; en 2030, más estrictos.',
      estado: 'Traslada esos límites y obliga a los municipios de más de 50.000 habitantes a tener una zona de bajas emisiones.',
      ccaa: 'Mide el aire con sus estaciones, hace planes de mejora y puede poner normas más protectoras.',
      diputacion: 'Sin papel propio.',
      municipio: 'Decide su zona de bajas emisiones: qué coches entran, cuándo y con qué multa.',
    },
    propuesta: {
      ue: 'Los mismos límites de aire en toda Europa, como ya pasa hoy.',
      estado: 'Unas mismas reglas para todas las zonas de bajas emisiones: qué coches, qué horarios, qué multas.',
      ccaa: 'Mide el aire y avisa cuando se pasa el límite.',
      diputacion: 'Presta estaciones de medida a las comarcas que no tienen.',
      municipio: 'Dibuja dónde está su zona de bajas emisiones; dentro, rigen las reglas comunes.',
    },
  },
  {
    id: 'residuos', nombre: 'Residuos', fuentes: ['ley-residuos'],
    hoy: {
      ue: 'Directivas de residuos: objetivos de reciclaje para cada país.',
      estado: 'Ley de residuos: obliga a cada ayuntamiento a cobrar una tasa propia que cubra el coste.',
      ccaa: 'Hace su plan autonómico de residuos.',
      diputacion: 'A menudo agrupa a los pueblos para tratar la basura.',
      municipio: 'Decide cómo se separa y se recoge, y cuánto se cobra.',
    },
    propuesta: {
      ue: 'Un código común: los mismos tipos de residuo y los mismos colores en toda Europa.',
      estado: 'Un único código de residuos, con la misma separación en todo el país.',
      ccaa: 'Planifica dónde van las plantas de tratamiento.',
      diputacion: 'Gestiona el tratamiento que un pueblo solo no puede pagar.',
      municipio: 'Recoge, con el mismo código y una tarifa calculada con la misma fórmula.',
    },
  },
  {
    id: 'suelo', nombre: 'Urbanismo y suelo', fuentes: ['constitucion', 'ley-suelo', 'cnmc-suelo'],
    hoy: {
      ue: 'Casi nada: pide evaluar el impacto ambiental de los planes.',
      estado: 'La ley del suelo fija solo unas condiciones básicas.',
      ccaa: 'Es competencia suya: cada una tiene su propia ley de urbanismo.',
      diputacion: 'Asesora a los pueblos que no tienen arquitecto.',
      municipio: 'Aprueba su plan general, con sus propias categorías de suelo, y da las licencias de obra.',
    },
    propuesta: {
      ue: 'A futuro, las mismas categorías de suelo para comparar entre países.',
      estado: 'Un catálogo único de usos del suelo y una sola tramitación de licencias de obra.',
      ccaa: 'Ordena el territorio a gran escala: corredores, espacios protegidos.',
      diputacion: 'Presta arquitectura e ingeniería a los pueblos pequeños.',
      municipio: 'Dibuja su plan con las categorías comunes y decide qué va en cada sitio.',
    },
  },
];

// ── SECTORS where fragmentation hurts most ──────────────────────────────────
export interface Sector {
  id: string; nombre: string;
  /** Today, in one or two short sentences. */
  hoy: string;
  /** A concrete example. */
  ejemplo: string;
  /** What the proposal changes. */
  propuesta: string;
  fuentes: string[];
}
/** In order of how much they come up in the market-unity complaints and the CNMC reports; an editorial order, not a measured ranking. */
export const SECTORES: Sector[] = [
  {
    id: 'licencias', nombre: 'Licencias para abrir un negocio',
    hoy: 'Cada ayuntamiento tiene sus impresos, plazos y tasas. Los ayuntamientos son la administración con más quejas por trabas.',
    ejemplo: 'En septiembre de 2026, la CNMC recurrió a un ayuntamiento que exigía la firma de un arquitecto, y no de un ingeniero, para el proyecto de un supermercado.',
    propuesta: 'Un catálogo único de actividades en tres niveles, igual en los 8.132 municipios, con un plazo máximo común.',
    fuentes: ['bde-lgum', 'cnmc-um-2026'],
  },
  {
    id: 'suelo', nombre: 'Urbanismo, suelo y licencias de obra',
    hoy: 'Cada comunidad tiene su ley de urbanismo y cada municipio su plan, con sus propias categorías de suelo.',
    ejemplo: 'La CNMC dice que España tiene una de las normas de uso del suelo más restrictivas de la OCDE, y que el suelo puede llegar al 45 % del precio de una vivienda.',
    propuesta: 'Un catálogo único de usos del suelo y una sola forma de tramitar una licencia de obra.',
    fuentes: ['cnmc-suelo', 'ley-suelo'],
  },
  {
    id: 'ruido', nombre: 'Ruido',
    hoy: 'El Estado fija unos límites, la comunidad puede endurecerlos y cada ayuntamiento aprueba su ordenanza.',
    ejemplo: 'Un bar o una obra a un lado y otro de una calle que separa dos municipios pueden tener límites, horarios y multas distintos.',
    propuesta: 'Los mismos límites por tipo de zona en todo el país. El municipio solo elige qué zona es cada calle.',
    fuentes: ['ley-ruido'],
  },
  {
    id: 'aire', nombre: 'Calidad del aire y zonas de bajas emisiones',
    hoy: 'Los municipios de más de 50.000 habitantes debían tener una zona de bajas emisiones antes de 2023, y cada uno decide qué coches entran, cuándo y con qué multa.',
    ejemplo: 'La Unión Europea ya hace lo que pide la propuesta: un mismo límite para todos. En 2030, 10 microgramos de partículas finas por metro cúbico, menos de la mitad que hoy.',
    propuesta: 'Límites de aire únicos y unas mismas reglas de acceso para todas las zonas de bajas emisiones.',
    fuentes: ['ley-clima', 'aire-ue'],
  },
  {
    id: 'residuos', nombre: 'Residuos',
    hoy: 'La ley obliga a cada ayuntamiento a tener una tasa de basura propia que cubra el coste. Cada uno la calcula a su manera.',
    ejemplo: 'Desde abril de 2025 todos los ayuntamientos debían tener esa tasa. Cada uno ha hecho la suya, con su propia fórmula.',
    propuesta: 'Un código único de residuos y una sola fórmula para calcular la tarifa; cambia el coste, no la regla.',
    fuentes: ['ley-residuos'],
  },
  {
    id: 'turistica', nombre: 'Vivienda de uso turístico',
    hoy: 'Cada comunidad tiene su norma y su registro. El Estado creó un registro único en 2025.',
    ejemplo: 'En mayo de 2026 el Tribunal Supremo anuló ese registro único: dijo que invadía competencias de las comunidades.',
    propuesta: 'Un solo registro y unas mismas reglas. Hoy, para eso, hace falta cambiar quién tiene la competencia (ver «Retos»).',
    fuentes: ['rd-registro', 'ts-registro'],
  },
  {
    id: 'comercio', nombre: 'Comercio y horarios',
    hoy: 'La ley estatal deja abrir 16 domingos y festivos al año, pero cada comunidad puede subirlo, o bajarlo hasta un mínimo de 10.',
    ejemplo: 'Una cadena con tiendas en varias comunidades tiene un calendario distinto en cada una.',
    propuesta: 'Un único calendario común, con un margen pequeño para fiestas locales.',
    fuentes: ['ley-horarios'],
  },
  {
    id: 'vtc', nombre: 'Transporte con conductor (VTC)',
    hoy: 'Desde 2018 cada comunidad y cada ciudad pueden fijar cuánto antes hay que reservar, horarios y recorridos.',
    ejemplo: 'Una misma empresa puede tener que esperar distinto tiempo entre la reserva y el viaje según la ciudad.',
    propuesta: 'Las mismas condiciones en todo el país; la ciudad solo regula dónde se para y se aparca.',
    fuentes: ['rdl-vtc'],
  },
  {
    id: 'caza', nombre: 'Caza y pesca',
    hoy: 'La licencia es de cada comunidad. Hay una licencia común, pero solo para 10 de las 17.',
    ejemplo: 'Quien caza en Navarra, Cataluña o el País Vasco necesita sacar otra licencia en cada una.',
    propuesta: 'Una licencia única para todo el país; cada región solo fija las temporadas según su clima y sus especies.',
    fuentes: ['caza'],
  },
  {
    id: 'animales', nombre: 'Bienestar animal',
    hoy: 'Hay una ley estatal desde 2023, pero convive con las leyes de cada comunidad y las ordenanzas municipales.',
    ejemplo: 'La propia ley estatal reconoce que las normas autonómicas forman un conjunto heterogéneo.',
    propuesta: 'Un solo texto con los derechos y obligaciones, el mismo en todo el país.',
    fuentes: ['ley-animales'],
  },
];
/** Sectors also often named, without a figure we could verify; kept in a «Más». */
export const SECTORES_SIN_CIFRA = [
  { nombre: 'Juego y apuestas', t: 'Cada comunidad regula sus salones y apuestas; el Estado, el juego por internet.' },
  { nombre: 'Espectáculos y horarios de cierre', t: 'Cada comunidad tiene su catálogo de espectáculos y sus horas de cierre.' },
  { nombre: 'Profesiones reguladas', t: 'Colegios profesionales autonómicos y requisitos que cambian de una comunidad a otra.' },
  { nombre: 'Carreteras', t: 'Estado, comunidades y diputaciones tienen cada uno sus carreteras, con normas técnicas y señales propias.' },
  { nombre: 'Alquiler de vivienda', t: 'Cada comunidad decide si aplica las zonas tensionadas y con qué reglas.' },
];

// ── THE PROPOSAL ────────────────────────────────────────────────────────────
export interface Pieza { id: string; t: string; d: string; mas: string; fuentes?: string[] }
export const PROPUESTA: Pieza[] = [
  {
    id: 'comun', t: 'Una norma común por materia básica',
    d: 'Ruido, aire, residuos, licencias, suelo: un solo texto, el mismo en todo el país, y a futuro en toda Europa.',
    mas: 'Es el punto de partida, y vale por defecto. Si una escala pequeña no dice nada, rige el texto común. Las escalas pequeñas no escriben otra ley sobre lo mismo.',
  },
  {
    id: 'margenes', t: 'Las escalas pequeñas solo ajustan, dentro de márgenes',
    d: 'El texto común dice qué se puede ajustar y hasta dónde. Fuera de eso, no.',
    mas: 'Ejemplo: el límite de ruido nocturno es igual en todo el país; el municipio decide qué calles son zona tranquila, de entre los tipos de zona que fija el texto común. Una región puede mover la temporada de caza unas semanas según su clima, pero no inventar otra licencia.',
  },
  {
    id: 'niveles', t: 'Licencias en tres niveles, iguales en todas partes',
    d: 'Aviso, declaración responsable o licencia. Cada actividad está en un nivel, y es el mismo en cualquier pueblo.',
    mas: 'La ley ya define los dos primeros: con un aviso o una declaración se empieza el mismo día y se comprueba después. Lo nuevo es el catálogo: una lista única que dice qué actividad va en cada nivel.',
    fuentes: ['ley-39-2015'],
  },
  {
    id: 'suelo', t: 'Un catálogo único de usos del suelo',
    d: 'Las mismas categorías y los mismos nombres en todos los planes.',
    mas: 'Hoy cada comunidad y cada plan llaman distinto a lo mismo. Con un catálogo común, «residencial», «industrial» o «protegido» significan lo mismo en todas partes, y un plano se lee igual en cualquier sitio.',
  },
  {
    id: 'ventanilla', t: 'Una ventanilla única',
    d: 'Un solo sitio, en el móvil, para cualquier trámite con cualquier administración.',
    mas: 'Se presenta una vez y la administración se pasa los datos por dentro. Nadie pide un papel que ya tiene otra administración.',
  },
  {
    id: 'dos-salen', t: '«Una norma entra, dos salen»',
    d: 'Quien aprueba una norma nueva tiene que derogar dos de su misma materia, hasta que el número total baje.',
    mas: 'Hay precedentes más suaves. Desde 2015, el Estado debe quitar una carga de coste parecido por cada carga nueva a las empresas. La Comisión Europea compensa costes desde 2021, y avisa de que no se aplica a ciegas: no se puede quitar una protección solo para cuadrar la cuenta. La propuesta lo lleva al número de normas, con esa misma salvaguarda.',
    fuentes: ['oioo-es', 'oioo-ue'],
  },
  {
    id: 'caducidad', t: 'Normas con fecha de caducidad',
    d: 'Cada norma dice cuándo se revisa. Si nadie la revisa a tiempo, deja de valer.',
    mas: 'Propuesta: diez años para las normas generales y cinco para las de detalle. La revisión mide si la norma consiguió lo que prometía, con datos públicos.',
  },
  {
    id: 'consolidado', t: 'Un texto consolidado único y buscable',
    d: 'Todas las normas vigentes, ya con sus cambios incorporados, en un solo buscador.',
    mas: 'Hoy el BOE consolida muchas normas estatales, pero las de 17 comunidades y 8.132 ayuntamientos están repartidas en decenas de boletines y webs. La propuesta: un único buscador público, con cada artículo enlazado a su versión anterior.',
  },
];

// ── LICENCES: the three levels and a sample catalogue (proposal) ────────────
export type NivelLicencia = 'aviso' | 'declaracion' | 'licencia';
export const NIVELES_LICENCIA: { id: NivelLicencia; t: string; d: string; cuando: string }[] = [
  { id: 'aviso', t: 'Aviso', d: 'Avisas de que empiezas, con tus datos. No hay que esperar.', cuando: 'Cambios que no afectan a nadie: un cambio de dueño, de nombre.' },
  { id: 'declaracion', t: 'Declaración responsable', d: 'Firmas que cumples las reglas y empiezas el mismo día. La inspección viene después.', cuando: 'Actividades de bajo riesgo: tiendas, oficinas, reformas interiores.' },
  { id: 'licencia', t: 'Licencia', d: 'Esperas el permiso antes de empezar, porque el riesgo es alto o afecta a muchos.', cuando: 'Ruido, mucha gente junta, estructura, medio ambiente.' },
];
export interface Actividad { id: string; t: string; nivel: NivelLicencia; hoy: string; plazo?: string; fuentes?: string[] }
export const ACTIVIDADES: Actividad[] = [
  { id: 'dueno', t: 'Traspasar un negocio a otra persona', nivel: 'aviso', hoy: 'Depende del ayuntamiento: en unos basta comunicarlo, en otros hay que pedir el cambio de titular de la licencia.' },
  { id: 'tienda', t: 'Abrir una tienda de 200 m²', nivel: 'declaracion', hoy: 'La ley estatal ya permite hacerlo con una declaración hasta 750 m². Pero los impresos, tasas y documentos los fija cada ayuntamiento.', fuentes: ['ley-12-2012'] },
  { id: 'reforma', t: 'Reformar la cocina o el baño', nivel: 'declaracion', hoy: 'Depende de la ley de urbanismo de la comunidad y de la ordenanza del municipio: aviso, declaración o licencia.' },
  { id: 'placas', t: 'Poner placas solares en el tejado', nivel: 'declaracion', hoy: 'Depende de la comunidad y del ayuntamiento; en algunos se pide licencia de obra.' },
  { id: 'bar', t: 'Abrir un bar con música', nivel: 'licencia', plazo: 'Propuesta: respuesta en dos meses como mucho; si no hay respuesta, se entiende concedida.', hoy: 'Licencia casi siempre, con las reglas de ruido, aforo y horario de cierre de la comunidad y del municipio.' },
  { id: 'concierto', t: 'Organizar un concierto en la calle', nivel: 'licencia', plazo: 'Propuesta: respuesta en un mes como mucho.', hoy: 'Permiso del ayuntamiento, con las reglas de espectáculos de cada comunidad.' },
  { id: 'casa', t: 'Construir una casa nueva', nivel: 'licencia', plazo: 'Propuesta: respuesta en tres meses como mucho.', hoy: 'Licencia de obra según la ley de urbanismo de la comunidad y el plan del municipio.' },
  { id: 'granja', t: 'Abrir una granja grande o una fábrica', nivel: 'licencia', plazo: 'Propuesta: respuesta en seis meses como mucho, con la evaluación ambiental incluida.', hoy: 'Licencia y, según el tamaño, evaluación ambiental de la comunidad.' },
];

// ── EACH SCALE ──────────────────────────────────────────────────────────────
export const PAPEL_ESCALA: Record<EscalaId, { hace: string; ejemplo: string }> = {
  persona: { hace: 'Cumple, y puede consultar cualquier norma en un solo buscador, en lenguaje claro.', ejemplo: 'Antes de abrir su tienda, mira en el catálogo que le toca una declaración, la firma en el móvil y abre ese día.' },
  vecindad: { hace: 'Pone sus normas de convivencia, sin contradecir el texto común.', ejemplo: 'El edificio decide a qué hora se puede hacer obra los sábados, dentro del horario que permite la norma común.' },
  municipio: { hace: 'Aplica, tramita e inspecciona. Ajusta solo lo que el texto común le deja ajustar.', ejemplo: 'Marca qué calles son zona tranquila y cuáles de ocio, y en cada una rige el límite común de ese tipo de zona.' },
  provincia: { hace: 'Presta técnicos, aparatos y laboratorios a los municipios que solos no pueden.', ejemplo: 'Un equipo comarcal mide el ruido o revisa proyectos de obra para veinte pueblos.' },
  region: { hace: 'Ordena el territorio grande y adapta lo que depende del clima o de la geografía, dentro de márgenes.', ejemplo: 'Mueve unas semanas la temporada de caza según sus especies, con la misma licencia para todo el país.' },
  nacion: { hace: 'Escribe la norma común de cada materia básica y mantiene el texto consolidado.', ejemplo: 'Un solo texto de ruido, uno de residuos, uno de licencias y uno de suelo.' },
  continente: { hace: 'A futuro, la norma común de lo que cruza fronteras.', ejemplo: 'Ya pasa con el aire: los mismos límites para toda la UE. Y la UE propone una sola forma de empresa para los 27 países.' },
  planeta: { hace: 'Acuerdos mínimos que todos cumplen: clima, océanos, sustancias peligrosas.', ejemplo: 'Una lista mundial común de sustancias prohibidas, para que un producto no sea legal en un país y tóxico en el de al lado.' },
};

// ── QUIZ ────────────────────────────────────────────────────────────────────
export interface Pregunta { id: string; p: string; opciones: string[]; bien: number; porque: string; repasar: { id: string; t: string } }
export const PREGUNTAS: Pregunta[] = [
  {
    id: 'ruido', p: 'Hoy, ¿quién decide cuánto ruido puede hacer un bar?',
    opciones: ['Solo el Estado, igual en todo el país', 'Solo el ayuntamiento, con su ordenanza', 'El Estado, la comunidad y el ayuntamiento'], bien: 2, repasar: { id: 'legal-quien', t: 'Quién legisla' },
    porque: 'El Estado fija unos límites, la comunidad puede endurecerlos y el ayuntamiento tiene su ordenanza. Por eso cambia de un pueblo a otro.',
  },
  {
    id: 'declaracion', p: '¿Qué es una declaración responsable?',
    opciones: ['Firmar que cumples y empezar ese día', 'Un permiso que se espera meses', 'Un aviso solo para cambiar de dueño'], bien: 0, repasar: { id: 'legal-licencias', t: 'Licencias' },
    porque: 'Con ella la actividad empieza el día que la presentas, y la inspección llega después. Si mentiste, la paras y respondes por ello.',
  },
  {
    id: 'contradicciones', p: '¿Hay una cifra oficial de cuántas leyes se contradicen?',
    opciones: ['Sí: el Constitucional cuenta unas 500', 'Sí: el BOE marca las que chocan', 'No: solo se cuentan las que se recurren'], bien: 2, repasar: { id: 'legal-cifras', t: 'Cuántas normas' },
    porque: 'Nadie lo cuenta. Sí se cuentan 1.806 choques entre el Estado y las comunidades llevados al Constitucional (1980-2024) y más de 1.000 quejas por trabas (2014-2024).',
  },
  {
    id: 'tc', p: 'En 2017 el Constitucional anuló que un permiso de una comunidad valiera en toda España. ¿Por qué?',
    opciones: ['Porque Europa prohíbe permisos nacionales', 'Porque no había una norma común debajo', 'Porque no se consultó a los ayuntamientos'], bien: 1, repasar: { id: 'legal-retos', t: 'Retos' },
    porque: 'Dijo que una comunidad no tiene por qué aceptar las reglas de otra si no hay un estándar común. Con una norma común, sí cabría. Por eso la propuesta empieza por ahí.',
  },
  {
    id: 'municipio', p: 'Con la propuesta, ¿qué puede hacer un ayuntamiento con el ruido?',
    opciones: ['Elegir qué calles son zona tranquila', 'Escribir su propia ordenanza de límites', 'Nada: todo lo decide el Estado'], bien: 0, repasar: { id: 'legal-propuesta', t: 'La propuesta' },
    porque: 'Las escalas pequeñas ajustan dentro de márgenes. El límite de cada tipo de zona es común; el ayuntamiento decide qué calle es de cada tipo.',
  },
  {
    id: 'margenes', p: '¿Por qué la propuesta deja márgenes a las regiones y los municipios?',
    opciones: ['Porque el clima y las calles cambian; sin tope, volvería el lío de hoy', 'Porque así cada región puede cobrar sus propias tasas', 'Porque Europa obliga a que cada región tenga su ley'], bien: 0, repasar: { id: 'legal-retos', t: 'Retos' },
    porque: 'No es igual Canarias que el Pirineo, ni una calle de bares que una de casas. Pero si los márgenes son demasiado anchos, cada sitio vuelve a tener su regla, como hoy.',
  },
  {
    id: 'bar', p: 'Caso: quieres abrir un bar con música. Con la propuesta, ¿qué necesitas?',
    opciones: ['Un aviso', 'Una declaración responsable', 'Una licencia'], bien: 2, repasar: { id: 'legal-licencias', t: 'Licencias' },
    porque: 'La música, el aforo y el horario afectan a los vecinos: es una actividad de riesgo alto, así que va en el nivel de licencia, el mismo en cualquier pueblo.',
  },
  {
    id: 'registro', p: 'Caso: ¿en qué sector anuló el Supremo en 2026 un registro único estatal?',
    opciones: ['Licencias de caza', 'Pisos turísticos', 'Zonas de bajas emisiones'], bien: 1, repasar: { id: 'legal-sectores', t: 'Dónde más duele' },
    porque: 'Anuló el registro estatal de alquileres de corta duración porque esa materia es de las comunidades. Unificarla pide cambiar quién tiene la competencia.',
  },
  {
    id: 'medir', p: 'Caso: con la propuesta, ¿quién mide el ruido en un pueblo de 400 habitantes?',
    opciones: ['El ayuntamiento, con aparatos propios', 'El Estado, con inspectores nacionales', 'La provincia o comarca, con técnicos comunes'], bien: 2, repasar: { id: 'legal-escalas', t: 'Cada escala' },
    porque: 'Un pueblo pequeño no puede pagar aparatos ni técnicos. La provincia o comarca los presta a todos sus pueblos, y se aplica el límite común.',
  },
  {
    id: 'escalas', p: 'Con la propuesta, ¿qué escala escribe la norma común de cada materia básica?',
    opciones: ['La región', 'La nación', 'El municipio'], bien: 1, repasar: { id: 'legal-escalas', t: 'Cada escala' },
    porque: 'La nación escribe el texto común, y a futuro Europa en lo que cruza fronteras. Las demás escalas ajustan dentro de márgenes, aplican y ayudan.',
  },
];
