// Data for the «Seguridad» window of the «Modelo socioeconómico optimizado»
// (Eugenio, 2026-11-12): the budget and the headcount of every security force
// in Spain — the armed forces, the two State police forces, the regional
// police forces and some 1.700 local police forces —, their duplications and
// pay gaps, and the proposal: one single body of «guardianes» with one pay
// scale, one hierarchy and one training, sections by scale, the army apart but
// coordinated, and an independent oversight.
//
// Every figure carries a source id from `FUENTES` below. Figures marked as an
// estimate are our own arithmetic on sourced figures, and the page says so.
import { ESPANA } from './modeloSocioeconomico';

// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'seguridad', t: 'Resumen' },
  { id: 'seguridad-hoy', t: 'Quién hay hoy' },
  { id: 'seguridad-quien', t: 'Quién manda' },
  { id: 'seguridad-dinero', t: 'Dinero y sueldos' },
  { id: 'seguridad-duplicidades', t: 'Duplicidades' },
  { id: 'seguridad-propuesta', t: 'La propuesta' },
  { id: 'seguridad-guardianes', t: 'Guardianes' },
  { id: 'seguridad-escalas', t: 'Cada escala' },
  { id: 'seguridad-retos', t: 'Retos' },
  { id: 'seguridad-fuentes', t: 'Fuentes' },
];

export interface FuenteSeg { id: string; titulo: string; url: string }
export const FUENTES_SEG: FuenteSeg[] = [
  { id: 'epsap', titulo: 'Ministerio para la Transformación Digital y de la Función Pública · Boletín estadístico del personal de las administraciones públicas, enero de 2026', url: 'https://digital.gob.es/content/dam/portal-mtdfp/funcion-publica/rcp/boletin/2026_01/EPSAP_Enero_2026.pdf' },
  { id: 'ign', titulo: 'Instituto Geográfico Nacional · Atlas Nacional de España, capítulo «Seguridad y justicia» (2026), datos de 2023', url: 'https://www.ign.es/web/resources/docs/IGNCnig/ANE/Capitulos/16_Seguridad_y_justicia_2026.pdf' },
  { id: 'mossos-plantilla', titulo: '3Cat · Acuerdo para ampliar los Mossos d’Esquadra hasta 25.000 agentes en 2030 (2025)', url: 'https://www.3cat.cat/324/acord-per-ampliar-la-plantilla-dels-mossos-fins-als-25000-agents-el-2030/noticia/3337361/' },
  { id: 'mossos-presupuesto', titulo: 'Generalitat de Catalunya · Presupuestos de 2026, programa 221 «Seguridad ciudadana»', url: 'https://aplicacions.economia.gencat.cat/wpres/2026/pdf/MP_IT09.pdf' },
  { id: 'ertzaintza', titulo: 'Onda Vasca · La Ertzaintza terminó 2022 con 7.771 agentes (2023)', url: 'https://www.ondavasca.com/la-ertzaintza-terminara-el-ano-con-7-770-agentes-200-mas-que-la-media-anual/' },
  { id: 'seguridad-vasca', titulo: 'Orain · El Departamento de Seguridad vasco tendrá 850 millones en 2026', url: 'https://orain.eus/es/politica/2025/11/05/el-presupuesto-del-departamento-seguridad-sube-un-64-en-2026-alcanzara-los-850-millones-euros/' },
  { id: 'foral', titulo: 'elDiario.es · Los Gobiernos central y navarro acuerdan ampliar la Policía Foral hasta 1.600 agentes (julio de 2026)', url: 'https://www.eldiario.es/navarra/gobiernos-central-navarro-acuerdan-ampliar-policia-foral-1-600-efectivos_1_13419014.html' },
  { id: 'canaria', titulo: 'El Español · La Policía Canaria solo opera en dos de las ocho islas (abril de 2026)', url: 'https://www.elespanol.com/reportajes/20260414/guanchancha-policia-autonomica-canaria-senalada-oposiciones-irregulares-solo-opera-islas/1003744204789_0.amp.html' },
  { id: 'locales', titulo: 'DGT · Expertos y policías ante los retos de la movilidad segura en las ciudades: 70.000 policías locales en 1.700 municipios (2025)', url: 'https://www.dgt.es/comunicacion/notas-de-prensa/20250919-expertos-institucionales-y-policiales-retos-de-la-movilidad-segura-ciudades' },
  { id: 'igae', titulo: 'IGAE (Ministerio de Hacienda) · Gasto de las administraciones públicas por funciones (COFOG), 2020-2024', url: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP_A/Funcional%202020-2024.pdf' },
  { id: 'bde', titulo: 'Banco de España · El gasto público en defensa, orden público y seguridad en España y en la UE (Boletín Económico 2024/T3)', url: 'https://repositorio.bde.es/bitstream/123456789/37332/1/be2403-art05.pdf' },
  { id: 'defensa-2025', titulo: 'La Moncloa · Plan Industrial y Tecnológico para la Seguridad y la Defensa (abril de 2025)', url: 'https://www.lamoncloa.gob.es/presidente/actividades/paginas/2025/220425-sanchez-plan-seguridad-defensa.aspx' },
  { id: 'euronews', titulo: 'Euronews · Sueldos de la policía en Europa y policías por habitante, con datos de Eurostat (2025)', url: 'https://www.euronews.com/next/2025/03/30/police-wages-in-europe-which-countries-pay-officers-the-highest-and-lowest-salaries' },
  { id: 'statista', titulo: 'Statista · Policías por 100.000 habitantes en la UE, con datos de Eurostat (2022)', url: 'https://www.statista.com/chart/16515/police-officers-per-100000-inhabitants-in-the-eu' },
  { id: 'equiparacion', titulo: 'La Moncloa · Acuerdo de equiparación salarial de Policía Nacional y Guardia Civil (febrero de 2018)', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/mir/Paginas/2018/270218acuerdo.aspx' },
  { id: 'mossos-subida', titulo: 'El Español · La subida de los Mossos: casi 970 euros al mes más que un policía nacional (marzo de 2026)', url: 'https://www.elespanol.com/alicante/20260306/policias-alicante-estallan-subida-salarial-mossos-desquadra-sacan-euros-mes/1003744157611_0.html' },
  { id: 'pge-interior', titulo: 'Ministerio de Hacienda · Presupuestos Generales del Estado 2023, programa 132A «Seguridad ciudadana» (Policía y Guardia Civil)', url: 'https://www.sepg.pap.hacienda.gob.es/Presup/PGE2023Ley/MaestroTomos/PGE-ROM/doc/L_23_E_G6.PDF' },
  { id: 'pge-defensa', titulo: 'Moncloa.com · El presupuesto de Defensa para 2023 alcanza 12.825 millones (2022)', url: 'https://www.moncloa.com/2022/10/07/espana-espera-alcanzar-12-pib-gasto-defensa-2023-aumento-258-presupuestos-1651024/' },
  { id: 'lo-2-1986', titulo: 'BOE · Ley Orgánica 2/1986, de Fuerzas y Cuerpos de Seguridad', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1986-6859' },
  { id: 'constitucion', titulo: 'BOE · Constitución española (artículos 8, 104 y 149.1.29.ª)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229' },
  { id: 'cpt', titulo: 'Universitat de Barcelona · Resumen del informe de 2025 del Comité contra la Tortura del Consejo de Europa sobre España', url: 'https://www.ub.edu/portal/documents/10080835/10975974/Resumen+Informe+CPT+2025/9d3c8d49-327f-dd74-c1af-f4a8b4bc383a' },
  { id: 'camaras', titulo: 'Vozpópuli · Interior adjudica 10,3 millones en cámaras personales para la Policía Nacional (octubre de 2024)', url: 'https://www.vozpopuli.com/espana/interior-10-millones-camaras-personales-policia-ley-mordaza.html' },
  { id: 'amnistia', titulo: 'Amnistía Internacional · Ocho medidas para la transparencia y la rendición de cuentas en España (marzo de 2025)', url: 'https://www.es.amnesty.org/en-que-estamos/noticias/noticia/articulo/amnistia-internacional-reclama-un-escudo-legislativo-de-ocho-medidas-para-fortalecer-la-transparencia-la-rendicion-de-cuentas-y-los-derechos-humanos-en-espana/' },
];
export const FUENTE_SEG = Object.fromEntries(FUENTES_SEG.map(f => [f.id, f])) as Record<string, FuenteSeg>;

// ── HEADCOUNT ───────────────────────────────────────────────────────────────
export interface Cuerpo {
  id: string;
  nombre: string;
  /** Who it answers to today. */
  depende: string;
  /** Where and what. */
  hace: string;
  agentes: number;
  /** «≈» in front when the figure is rounded or a ceiling. */
  aprox?: boolean;
  fecha: string;
  fuente: string;
  nota?: string;
  /** Yearly budget, M€, with its year, source and what it covers. */
  presupuesto?: { m: number; ano: string; fuente: string; que?: string };
  grupo: 'ejercito' | 'estado' | 'autonomica' | 'local';
}

export const FUERZAS_ARMADAS = 123_504; // epsap, 1-1-2026
export const POLICIA_NACIONAL = 78_740; // epsap
export const GUARDIA_CIVIL = 82_609; // epsap
export const AUTONOMICAS_2023 = 26_981; // ign (all four regional forces, 2023)
export const MOSSOS = 19_070; // mossos-plantilla, September 2024
export const MOSSOS_PUESTOS_2026 = 23_761; // mossos-presupuesto: budgeted posts in 2026
export const ERTZAINTZA = 7_771; // ertzaintza, end of 2022
export const FORAL = 1_200; // foral: the previous ceiling, already reached
export const LOCALES = 70_000; // locales
export const MUNICIPIOS_CON_POLICIA = 1_700; // locales

export const CUERPOS: Cuerpo[] = [
  { id: 'ffaa', grupo: 'ejercito', nombre: 'Fuerzas Armadas', depende: 'Ministerio de Defensa', hace: 'Defender el país. Tierra, mar, aire y la Unidad Militar de Emergencias.', agentes: FUERZAS_ARMADAS, fecha: 'enero de 2026', fuente: 'epsap', presupuesto: { m: 14_233, ano: '2024', fuente: 'igae', que: 'gasto en defensa según la contabilidad pública' } },
  { id: 'pn', grupo: 'estado', nombre: 'Policía Nacional', depende: 'Ministerio del Interior', hace: 'Capitales de provincia y grandes ciudades. DNI, pasaportes, extranjería, drogas.', agentes: POLICIA_NACIONAL, fecha: 'enero de 2026', fuente: 'epsap', presupuesto: { m: 3_709, ano: '2023', fuente: 'pge-interior', que: 'programa de seguridad ciudadana' } },
  { id: 'gc', grupo: 'estado', nombre: 'Guardia Civil', depende: 'Interior, y Defensa en misiones militares', hace: 'El resto del país y el mar. Carreteras, armas, contrabando, costas, naturaleza.', agentes: GUARDIA_CIVIL, fecha: 'enero de 2026', fuente: 'epsap', nota: 'Es un cuerpo de naturaleza militar, con grados militares.', presupuesto: { m: 3_337, ano: '2023', fuente: 'pge-interior', que: 'programa de seguridad ciudadana' } },
  { id: 'mossos', grupo: 'autonomica', nombre: 'Mossos d’Esquadra', depende: 'Generalitat de Cataluña', hace: 'Casi toda la policía en Cataluña.', agentes: MOSSOS, fecha: 'septiembre de 2024', fuente: 'mossos-plantilla', nota: 'El presupuesto de 2026 ya cuenta 23.761 puestos; el objetivo es 25.000 en 2030.', presupuesto: { m: 1_641, ano: '2026', fuente: 'mossos-presupuesto', que: 'seguridad ciudadana de Cataluña' } },
  { id: 'ertzaintza', grupo: 'autonomica', nombre: 'Ertzaintza', depende: 'Gobierno Vasco', hace: 'Casi toda la policía en el País Vasco.', agentes: ERTZAINTZA, fecha: 'finales de 2022', fuente: 'ertzaintza', nota: 'El objetivo es 8.000 en 2030.', presupuesto: { m: 850, ano: '2026', fuente: 'seguridad-vasca', que: 'todo el Departamento de Seguridad, también emergencias' } },
  { id: 'foral', grupo: 'autonomica', nombre: 'Policía Foral', depende: 'Gobierno de Navarra', hace: 'Seguridad y tráfico en Navarra, junto a Policía Nacional y Guardia Civil.', agentes: FORAL, aprox: true, fecha: 'julio de 2026', fuente: 'foral', nota: 'Es el tope que ya ha alcanzado; se acaba de ampliar a 1.600.' },
  { id: 'canaria', grupo: 'autonomica', nombre: 'Policía Canaria', depende: 'Gobierno de Canarias', hace: 'Edificios y normas del Gobierno canario. Hoy solo en dos de las ocho islas.', agentes: 0, fecha: 'abril de 2026', fuente: 'canaria', nota: 'No hay cifra oficial publicada: unos pocos cientos, con 726 puestos en su catálogo.' },
  { id: 'locales', grupo: 'local', nombre: 'Policías locales', depende: 'Cada ayuntamiento', hace: 'Tráfico en la ciudad, convivencia, ordenanzas municipales.', agentes: LOCALES, aprox: true, fecha: '2025', fuente: 'locales', nota: 'Unos 1.700 cuerpos distintos, uno por municipio con policía.', presupuesto: { m: 6_634, ano: '2024', fuente: 'igae', que: 'toda la seguridad municipal, también bomberos' } },
];

/** Every police and guard, without the army: State + regional (2023 total) + local. Estimate: mixes dates. */
export const POLICIAS_TOTAL = POLICIA_NACIONAL + GUARDIA_CIVIL + AUTONOMICAS_2023 + LOCALES;
/** Bodies with their own command: two State forces, four regional ones and one per municipality with police. */
export const CUERPOS_CON_MANDO = 2 + 4 + MUNICIPIOS_CON_POLICIA;

// ── POLICE PER 100.000 INHABITANTS ──────────────────────────────────────────
export const POR_CIEN_MIL = {
  ue: 341, // euronews: EU average, 2022 (Eurostat)
  espanaEurostat: 370, // statista: Spain in Eurostat's series (2018-2020)
  espanaTodos: Math.round((POLICIAS_TOTAL / ESPANA.poblacion) * 100_000), // our count, every force
};

// ── MONEY (millions of euros) ───────────────────────────────────────────────
export const GASTO = {
  // igae, COFOG 2024, all administrations
  defensa2024: 14_233,
  ordenPublico2024: 28_628,
  ordenCentral2024: 14_956,
  ordenRegional2024: 7_038,
  ordenLocal2024: 6_634,
  policia2024: 17_541,
  bomberos2024: 3_014,
  // defensa-2025: what the Government counts as «security and defence» to reach 2 % of GDP
  seguridadDefensa2025: 33_123,
  // bde, 2022, % of GDP
  policiaPibEs: 1.2,
  policiaPibUe: 0.9,
  ordenPibEs: 1.9,
  ordenPibUe: 1.7,
  defensaPibEs: 1.1,
  defensaPibUe: 1.3,
  // regional
  mossos2026: 1_641, // mossos-presupuesto: programme 221, whole
  mossosPersonal2026: 1_399, // mossos-presupuesto: Mossos' staff costs
  seguridadVasca2026: 850, // seguridad-vasca: the whole department
};

// ── PAY ─────────────────────────────────────────────────────────────────────
export const SUELDOS = {
  equiparacion2018: 807, // M€ over three years (equiparacion)
  equiparacionGC: 476.7,
  equiparacionPN: 331,
  brechaMossosPN: 970, // € a month more for a mosso after the 2026 raise (mossos-subida)
  subidaMossos2026: 4_000, // € gross a year (mossos-subida)
  agenteEspanaMes: 2_271, // € gross a month, 2023, Eurostat salary calculator (euronews)
};

// ── DUPLICATIONS ────────────────────────────────────────────────────────────
export const DUPLICIDADES: { t: string; d: string; fuente?: string }[] = [
  { t: 'Dos policías del Estado que se reparten el mapa', d: 'La Policía Nacional cubre las capitales y las grandes ciudades; la Guardia Civil, todo lo demás. Cada una tiene su propia sede en cada provincia, sus jefes, su academia, sus compras y sus ordenadores.', fuente: 'lo-2-1986' },
  { t: 'Dos de casi todo', d: 'Las dos tienen su unidad contra el crimen organizado, su grupo de asalto, su servicio de información y su equipo contra delitos en internet. Son unidades paralelas que hacen el mismo tipo de trabajo, cada una para su cuerpo.' },
  { t: 'Tres policías en la misma calle', d: 'En una ciudad grande pueden coincidir la policía local, la Nacional y, en algunas regiones, la autonómica. Las leyes reparten tareas, pero muchas son compartidas: orden en la calle, ayuda en accidentes, apoyo a los jueces.', fuente: 'lo-2-1986' },
  { t: 'Unos 1.700 cuerpos locales distintos', d: 'Cada ayuntamiento con policía tiene la suya: su uniforme, su sueldo, sus turnos, sus coches y su emisora. Las comunidades autónomas solo pueden coordinarlas.', fuente: 'locales' },
  { t: 'Un número de teléfono por cuerpo', d: 'El 091 llama a la Policía Nacional, el 062 a la Guardia Civil, el 092 a la policía local, y el 112 a las emergencias. Quien está en apuros no tiene por qué saber cuál le toca.' },
  { t: 'Un cuerpo militar haciendo de policía', d: 'La Guardia Civil es policía y es militar a la vez: depende de Interior para su trabajo diario y de Defensa para las misiones militares. Sus agentes tienen grados y disciplina militares.', fuente: 'lo-2-1986' },
];

// ── TODAY AND THE PROPOSAL, SIDE BY SIDE ────────────────────────────────────
export const COMPARA: { t: string; hoy: string; propuesta: string }[] = [
  { t: 'Cuerpos', hoy: 'Unos 1.700: dos del Estado, cuatro autonómicos y uno por cada municipio con policía.', propuesta: 'Uno: los guardianes. Con secciones en cada escala, de la calle al continente.' },
  { t: 'Sueldo', hoy: 'Distinto en cada cuerpo y en cada ayuntamiento, por el mismo trabajo.', propuesta: 'Una sola tabla: el mismo puesto cobra lo mismo en cualquier lugar, con pluses claros por peligro, noche o coste de la vida.' },
  { t: 'Jerarquía', hoy: 'Grados militares en la Guardia Civil, civiles en la Nacional, y los de cada autonómica y cada ayuntamiento.', propuesta: 'Una sola escalera de mando, civil, igual para todos, y con la misma forma de subir: por mérito y con evaluación.' },
  { t: 'Formación', hoy: 'Cada cuerpo forma a los suyos en su propia academia, con temarios distintos.', propuesta: 'Una sola academia con sedes en cada región y un tronco común largo: leyes, derechos, desescalada y mediación.' },
  { t: 'Teléfono', hoy: '091, 062, 092 y 112.', propuesta: 'Solo el 112, que manda a quien esté más cerca.' },
  { t: 'Quién vigila', hoy: 'Cada cuerpo investiga a los suyos; si hay delito, un juez. No hay un órgano independiente solo para la policía.', propuesta: 'Una inspección independiente, fuera del cuerpo, que recibe quejas, revisa grabaciones y publica sus datos.' },
  { t: 'Ejército', hoy: 'Aparte, con Defensa. Comparte con la Guardia Civil la naturaleza militar.', propuesta: 'Aparte y solo militar, con la Unidad Militar de Emergencias coordinada con los guardianes en catástrofes.' },
];

// ── «GUARDIANES, NO AGRESORES» ──────────────────────────────────────────────
export const GUARDIANES: { t: string; d: string }[] = [
  { t: 'Formarse para no tener que usar la fuerza', d: 'Muchas horas de desescalada (calmar una situación tensa hablando), mediación y atención a personas en crisis, y prácticas cada año, no solo al entrar.' },
  { t: 'La fuerza, lo último', d: 'Primero hablar, después avisar, y solo al final la fuerza mínima. Cada vez que se usa, se anota y se revisa.' },
  { t: 'Cámara en el uniforme', d: 'Se enciende en cada intervención y la grabación no la puede borrar el agente. Protege a la persona y al guardián.' },
  { t: 'Número visible', d: 'Cada guardián lleva su número a la vista, también con casco o con la cara tapada.' },
  { t: 'Control independiente', d: 'Un órgano que no depende del cuerpo recibe las quejas, investiga y puede proponer sanciones. Lo dirigen personas sin carrera policial.' },
  { t: 'Cuentas públicas', d: 'Cada año se publican las quejas, los usos de la fuerza, las detenciones y cómo se resolvieron, por escala y por barrio.' },
  { t: 'Cuidar al que cuida', d: 'Apoyo psicológico, descansos y cambios de destino después de intervenciones duras. Un guardián agotado es un riesgo.' },
];

// ── PAY SCALE (proposal) ────────────────────────────────────────────────────
/** Five steps, as multiples of the first. Proposal and estimate: not a figure from any source. */
export const ESCALONES: { t: string; x: number; responde: string }[] = [
  { t: 'Guardián', x: 1, responde: 'De su patrulla y de cada intervención, ante su jefe de equipo y la inspección.' },
  { t: 'Guardián con experiencia', x: 1.15, responde: 'Además, de enseñar a quien empieza.' },
  { t: 'Jefe de equipo', x: 1.35, responde: 'De un equipo de 6 a 10 personas y de cómo usa la fuerza.' },
  { t: 'Mando', x: 1.6, responde: 'De una sección (un municipio, una provincia), ante el mando superior y la asamblea de esa escala.' },
  { t: 'Alto mando', x: 2, responde: 'De la región o la nación, ante el parlamento y la inspección.' },
];

// ── SAVINGS FROM UNIFYING: an order of magnitude, not a study ──────────────
/** Assumed share of police spending saved by merging headquarters, academies, purchasing and call rooms. Assumption. */
export const AHORRO_SUPUESTO = { min: 0.02, max: 0.05 };

// ── EACH SCALE ──────────────────────────────────────────────────────────────
/** What security means at each of the eight scales under the proposal. */
export const SEG_ESCALA: Record<string, { quien: string; hace: string }> = {
  persona: { quien: '', hace: 'Conoce sus derechos y el 112, puede pedir mediación antes de que un conflicto crezca, y puede quejarse a la inspección independiente.' },
  vecindad: { quien: 'Comunidad vecinal', hace: 'Tiene un guardián de referencia que conoce el barrio por su nombre. La mediación vecinal resuelve ruidos y peleas antes de que lleguen a denuncia.' },
  municipio: { quien: 'Sección municipal', hace: 'Guardianes de proximidad: patrulla a pie y en bici, tráfico en el pueblo o la ciudad, convivencia, violencia en casa. La asamblea municipal fija sus prioridades.' },
  provincia: { quien: 'Sección provincial', hace: 'Carreteras, rescate en montaña y en el agua, investigación de delitos que pasan de un pueblo a otro, y apoyo a los municipios pequeños.' },
  region: { quien: 'Sección regional', hace: 'Unidades especializadas (delitos graves, ciberdelito cercano, policía científica), la sede regional de la academia y la sala del 112.' },
  nacion: { quien: 'Mando nacional', hace: 'El mando único, la escala salarial, la academia, las fronteras, el crimen organizado y el terrorismo. Aquí también se coordina con el ejército.' },
  continente: { quien: 'Europa', hace: 'Cooperación con otras policías de Europa (como Europol, la agencia europea de policía), fronteras comunes y la defensa europea, en la que encaja el ejército.' },
  planeta: { quien: 'Todo el planeta', hace: 'Misiones de paz de la ONU, ayuda en grandes catástrofes y búsqueda de personas y delitos entre países (como Interpol).' },
};

// ── HONEST CHALLENGES ───────────────────────────────────────────────────────
export const RETOS: { t: string; d: string; fuente?: string }[] = [
  { t: 'La Constitución', d: 'Dice que las fuerzas de seguridad dependen del Gobierno y que una ley orgánica fija sus funciones. También permite que las comunidades creen sus policías según sus estatutos. Un cuerpo único necesita cambiar leyes orgánicas, y probablemente la Constitución.', fuente: 'constitucion' },
  { t: 'Los estatutos de autonomía', d: 'Los Mossos, la Ertzaintza y la Policía Foral están en los estatutos de Cataluña, el País Vasco y Navarra, y son parte de su autogobierno. Integrarlos solo es posible con su acuerdo. Una salida: que sean la sección regional del cuerpo único, con su nombre y su mando regional.', fuente: 'lo-2-1986' },
  { t: 'La Guardia Civil es militar', d: 'Pasar a un cuerpo civil cambia sus grados, su disciplina y su forma de asociarse. Es un cambio cultural grande para más de 80.000 personas.', fuente: 'lo-2-1986' },
  { t: 'Nadie puede cobrar menos', d: 'Igualar sueldos es subir a quien cobra menos, no bajar a quien cobra más. Eso cuesta dinero cada año (abajo hay una cuenta orientativa).' },
  { t: 'Una transición larga', d: 'Más de 250.000 personas con plazas, antigüedad, pensiones y destinos distintos. Haría falta un calendario de varios años: primero el sueldo y la formación comunes, después el mando.' },
  { t: 'A quién rinden cuentas los guardianes', d: 'Son garantes de la ley, no dueños de ella: obedecen a los jueces cuando investigan delitos, responden ante la inspección independiente por cómo actúan y ante la asamblea de cada escala por sus prioridades. Diseñar bien esa triple rendición de cuentas es la parte más delicada.' },
  { t: 'Un cuerpo muy grande, mucho poder', d: 'Unificar concentra poder. Por eso la propuesta pone contrapesos: la inspección independiente, las prioridades fijadas por cada escala y los datos públicos.' },
  { t: 'No perder la cercanía', d: 'La policía local conoce su pueblo. El riesgo es que un mando lejano decida por todos. La sección municipal tiene que seguir siendo de su municipio.' },
];
