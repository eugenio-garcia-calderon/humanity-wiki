// Data for the «Justicia» window of the «Modelo socioeconómico optimizado».
// Eugenio, 2026-11-12: put justice in the menu; waiting times and long trials;
// one single complaint instead of having to go to civil or criminal and start
// again; fast and remote trials; judges where the police are, so statements can
// be made at the police station; police and courts not separated; no waiting
// lists. Every real figure carries a source id from FUENTES_JUSTICIA (looked up
// in November 2026). Anything that is a proposal or an estimate says so.

// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'justicia', t: 'Resumen' },
  { id: 'justicia-propuesta', t: 'La propuesta' },
  { id: 'justicia-hoy', t: 'Cómo funciona hoy' },
  { id: 'justicia-civil-penal', t: 'Civil o penal' },
  { id: 'justicia-cola', t: 'Cómo se vacía la cola' },
  { id: 'justicia-escalas', t: 'Cada escala' },
  { id: 'justicia-retos', t: 'Retos' },
  { id: 'justicia-fuentes', t: 'Fuentes' },
];

export interface FuenteJusticia { id: string; url: string; titulo: string }

export const FUENTES_JUSTICIA: FuenteJusticia[] = [
  { id: 'cgpj-2025', url: 'https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Sala-de-Prensa/Archivo-de-notas-de-prensa/Los-organos-judiciales-recibieron-en-2025-un-3-2---menos-asuntos-que-el-ano-anterior-y-aumentaron-en-un-2---su-capacidad-de-resolucion', titulo: 'CGPJ · Actividad de los órganos judiciales en 2025 (nota de 30-3-2026)' },
  { id: 'cgpj-2026t1', url: 'https://www.poderjudicial.es/cgpj/es/Poder-Judicial/En-Portada/El-ingreso-de-nuevos-asuntos-en-los-organos-judiciales-baja-un-20-6---en-el-primer-trimestre-del-ano-tras-el-descenso-del-35-8---en-el-orden-civil-', titulo: 'CGPJ · Primer trimestre de 2026: los asuntos nuevos bajan un 20,6 %' },
  { id: 'cgpj-duraciones', url: 'https://www.poderjudicial.es/cgpj/es/Temas/Estadistica-Judicial/Estadistica-por-temas/Actividad-de-los-organos-judiciales/Estimacion-de-los-tiempos-medios-de-los-asuntos-terminados/', titulo: 'CGPJ · Estimación de los tiempos medios de los asuntos (2002-2025)' },
  { id: 'cepej-2024', url: 'https://rm.coe.int/spain-country-fiche/48802c1531', titulo: 'Consejo de Europa (CEPEJ) para el Cuadro de indicadores de la Justicia de la UE · Ficha de España, datos de 2024' },
  { id: 'cepej-2022', url: 'https://rm.coe.int/spain/1680b1dfd1', titulo: 'Consejo de Europa (CEPEJ) · Perfil de España, datos de 2022' },
  { id: 'ccoo-social', url: 'https://ccoo.es/53afa98d112398189d804bfbc364304e000001.pdf', titulo: 'CCOO · Los retrasos en la jurisdicción social (con datos del CGPJ, «Justicia dato a dato 2024»)' },
  { id: 'cgpj-jueces', url: 'https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/la-presidenta-del-ts-y-del-cgpj-alerta-del-grave-deficit-de-jueces-en-espana-2026-02-04/', titulo: 'Legal Today · La presidenta del Supremo y del CGPJ alerta del déficit de jueces (4-2-2026)' },
  { id: 'moncloa-instancia', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/presidencia-justicia-relaciones-cortes/Paginas/2026/010726-aniversario-tribunales-instancia.aspx', titulo: 'La Moncloa · Primer año de los tribunales de instancia (1-7-2026)' },
  { id: 'lo-1-2025', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-76', titulo: 'BOE · Ley Orgánica 1/2025, de eficiencia del Servicio Público de Justicia' },
  { id: 'rdl-6-2023', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-25758', titulo: 'BOE · Real Decreto-ley 6/2023 (justicia digital y juicios a distancia)' },
  { id: 'sepin-telematico', url: 'https://blog.sepin.es/blog/2024/01/24/denuncias-juicios-telematicos-reforma-lecrim-rdl-6-2023/', titulo: 'Sepin · Denuncias y juicios telemáticos tras el Real Decreto-ley 6/2023' },
  { id: 'lecrim', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1882-6036', titulo: 'BOE · Ley de Enjuiciamiento Criminal (juicios rápidos, arts. 795-803; plazos de instrucción, art. 324; acción civil, arts. 111-114)' },
  { id: 'lec', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2000-323', titulo: 'BOE · Ley de Enjuiciamiento Civil (prejudicialidad penal, art. 40)' },
  { id: 'constitucion', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229', titulo: 'BOE · Constitución Española (arts. 17, 24, 117 y 126)' },
];

export const FUENTE_JUSTICIA = Object.fromEntries(FUENTES_JUSTICIA.map(f => [f.id, f])) as Record<string, FuenteJusticia>;

/** Courts' activity in 2025, whole of Spain (CGPJ, cgpj-2025). */
export const ACTIVIDAD_2025 = {
  ingresados: 7_550_806,
  resueltos: 7_437_033,
  pendientes: 4_673_596,
  pendientesVariacion: 3.4, // % vs 2024
  litigiosidad: 153.7, // cases per 1,000 inhabitants
};

export interface Jurisdiccion {
  id: 'civil' | 'penal' | 'contencioso' | 'social';
  nombre: string;
  /** What it deals with, in plain words. */
  que: string;
  ingresados: number;
  resueltos: number;
  pendientes: number;
  /** % change of pending cases vs 2024. */
  pendientesVar: number;
}

export const JURISDICCIONES: Jurisdiccion[] = [
  { id: 'civil', nombre: 'Civil', que: 'Conflictos entre personas o empresas: deudas, contratos, herencias, divorcios, vecinos.', ingresados: 3_287_980, resueltos: 3_308_215, pendientes: 2_672_464, pendientesVar: -0.6 },
  { id: 'penal', nombre: 'Penal', que: 'Delitos: robos, agresiones, estafas, conducir bebido. Puede acabar en multa o cárcel.', ingresados: 3_550_118, resueltos: 3_451_206, pendientes: 1_255_950, pendientesVar: 11.7 },
  { id: 'contencioso', nombre: 'Contencioso', que: 'Pleitos contra la Administración: multas, licencias, oposiciones, impuestos.', ingresados: 198_961, resueltos: 212_680, pendientes: 219_492, pendientesVar: -2.7 },
  { id: 'social', nombre: 'Social', que: 'Trabajo y Seguridad Social: despidos, salarios, incapacidades.', ingresados: 513_628, resueltos: 464_827, pendientes: 525_652, pendientesVar: 9.4 },
];

/**
 * Disposition time at first instance, in days, 2024: how long it would take to
 * clear the pending cases at the current pace (CEPEJ for the EU Justice Scoreboard 2026).
 * The EU value is the median of the member states.
 */
export const DURACION_DIAS: { id: string; nombre: string; espana: number; ue: number }[] = [
  { id: 'civil', nombre: 'Civil y mercantil', espana: 423, ue: 245 },
  { id: 'contencioso', nombre: 'Contencioso', espana: 386, ue: 327 },
  { id: 'penal', nombre: 'Penal', espana: 225, ue: 115 },
];
/** Second instance (appeal), days, 2024 (cepej-2024). */
export const DURACION_APELACION = { civil: 459, civilUE: 199, contencioso: 428, contenciosoUE: 339, penal: 78, penalUE: 103 };
/** Social courts, average estimated duration, months, 2024 (CGPJ, cited by ccoo-social). */
export const DURACION_SOCIAL_MESES = { total: 11.4, despidos: 8.2 };

/** Judges (cepej-2024, data 2024). */
export const JUECES = { total: 5_431, por100k: 11.1, ue100k: 23.4, primeraInstancia: 3_827 };
/** Budget of the judicial system per inhabitant, 2022 (cepej-2022). */
export const PRESUPUESTO_HAB_2022 = 96.8;

/** The 2025 reform (lo-1-2025, moncloa-instancia). */
export const REFORMA = {
  tribunales: 431,
  juzgadosAntes: 3_900,
  inversion: 1_120, // M€ in this legislature (moncloa-instancia)
  digital: 850, // M€ of it for digitalisation
  litigiosidadCivil: -21, // % civil new cases, July 2025 - June 2026, Ministry territory (moncloa-instancia)
  civilT1_2026: -35.8, // % civil new cases, Q1 2026 vs Q1 2025, all Spain (cgpj-2026t1)
  plazasNuevas: 500, // judge posts announced (moncloa-instancia)
  /** Yearly cost of one judicial post with its staff, € (moncloa-instancia): new model at most, old model about. */
  costePlazaNuevo: 100_000,
  costePlazaAntiguo: 600_000,
};

/**
 * Emptying the queue: an ESTIMATE of ours. Judges needed to reach the EU median
 * per inhabitant, and how long the extra judges would take to clear today's
 * pending cases if they worked at today's average pace and only on the backlog.
 */
export function vaciarCola(nuevos: number, poblacion: number) {
  const faltan = Math.round((poblacion * JUECES.ue100k) / 1e5 - JUECES.total);
  const porJuez = ACTIVIDAD_2025.resueltos / JUECES.total; // cases resolved per judge and year, rough
  return {
    faltan,
    porJuez,
    anos: ACTIVIDAD_2025.pendientes / (nuevos * porJuez),
    costeMin: (nuevos * REFORMA.costePlazaNuevo) / 1e6, // M€ a year
    costeMax: (nuevos * REFORMA.costePlazaAntiguo) / 1e6,
    /** Midpoint of the two costs, M€ a year. */
    costeMedio: (nuevos * (REFORMA.costePlazaNuevo + REFORMA.costePlazaAntiguo)) / 2 / 1e6,
    /** Civil first-instance disposition time if capacity grows with the number of judges (days). */
    diasCivil: DURACION_DIAS[0].espana * JUECES.total / (JUECES.total + nuevos),
    /** Pending cases measured in months of today's output. */
    mesesPendientes: (ACTIVIDAD_2025.pendientes / ACTIVIDAD_2025.resueltos) * 12,
  };
}

/** What changed with the 2025 law, and what it leaves untouched. */
export const CAMBIOS_2025: { t: string; d: string; fuente: string }[] = [
  { t: 'Tribunales de instancia', d: 'Los 3.900 juzgados de un solo juez se agrupan en 431 tribunales, uno por partido judicial, con jueces que comparten personal y trabajo. Se completó el 31 de diciembre de 2025.', fuente: 'moncloa-instancia' },
  { t: 'Negociar antes de demandar', d: 'En lo civil y mercantil hay que intentar antes un acuerdo (mediación, conciliación, una oferta por escrito…). Sin ese intento, la demanda no se admite. No se aplica a lo penal ni a lo laboral.', fuente: 'lo-1-2025' },
  { t: 'Oficinas de justicia en los pueblos', d: 'Sustituyen a los juzgados de paz. Hacen notificaciones, ayudan con el Registro Civil y con los acuerdos, y tienen medios para declarar a distancia.', fuente: 'lo-1-2025' },
  { t: 'Sentencias de palabra y menos vistas', d: 'En juicios civiles sencillos el juez puede decidir que no hace falta vista y dictar la sentencia oralmente, grabada.', fuente: 'lo-1-2025' },
  { t: 'Más acuerdos en lo penal', d: 'Se amplían los casos en que el acusado puede reconocer los hechos y aceptar una pena pactada, sin juicio. La víctima puede ser oída.', fuente: 'lo-1-2025' },
];

export const NO_CAMBIA_2025: string[] = [
  'Siguen existiendo cuatro caminos separados (civil, penal, contencioso y social), cada uno con sus reglas y sus plazos.',
  'Si un asunto civil esconde un posible delito, el juicio civil se sigue parando hasta que acabe el penal.',
  'Policía y juzgados siguen en edificios y sistemas distintos: la denuncia viaja de uno a otro.',
  'No hay un plazo máximo para el juicio entero: solo para la investigación penal.',
];

/** A complaint's journey, step by step. `t`: how long, only when there is a real figure or it is labelled a proposal. */
export interface Paso { t: string; d: string; tiempo?: string; vuelta?: boolean; fuente?: string }

export const RECORRIDO_HOY: Paso[] = [
  { t: 'Denuncias en comisaría', d: 'La policía escribe un informe con lo que cuentas y lo envía al juzgado de guardia.' },
  { t: 'El juzgado lo reparte', d: 'Un juez de instrucción investiga. Si cree que no es delito, lo archiva y te dice que vayas a lo civil.' },
  { t: 'Vuelves a empezar en lo civil', d: 'Con abogado y procurador, intentas antes un acuerdo y presentas una demanda nueva.', vuelta: true },
  { t: 'Y si el juez civil ve un delito', d: 'Para el pleito y lo manda a lo penal hasta que haya sentencia. Es la «prejudicialidad penal».', vuelta: true, fuente: 'lec' },
  { t: 'Juicio en primera instancia', d: 'Según la estimación oficial, un asunto civil tardaría de media más de un año.', tiempo: '423 días de media en lo civil', fuente: 'cepej-2024' },
  { t: 'Apelación', d: 'Si alguien recurre, otra espera.', tiempo: '459 días de media en lo civil', fuente: 'cepej-2024' },
];

export const RECORRIDO_PROPUESTA: Paso[] = [
  { t: 'Una sola puerta', d: 'Denuncias una vez: en la comisaría, en la oficina de justicia del pueblo o desde el móvil. Cuentas lo que pasó una sola vez.' },
  { t: 'El sistema la deriva', d: 'Un equipo de la propia justicia decide si es civil, penal, administrativo o laboral, o varias cosas a la vez, y la envía. Nunca más «esto no es aquí, vuelva a denunciar».', tiempo: 'Propuesta: en 48 horas' },
  { t: 'Un juez de guardia en la comisaría', d: 'En persona o por videollamada desde el tribunal: toma declaración en el momento, dicta órdenes de protección y decide sobre los detenidos sin trasladarlos.', tiempo: 'Propuesta: el mismo día' },
  { t: 'Lo civil y lo penal, en un solo expediente', d: 'Si el juez penal archiva, la parte civil (la indemnización, el contrato, los daños) sigue en el mismo expediente, con lo ya aportado, sin demanda nueva.' },
  { t: 'Juicio rápido o por videollamada', d: 'El juicio rápido, que hoy solo sirve para delitos sencillos, se amplía a pleitos civiles y laborales simples. Las vistas, por vídeo salvo que el juez o la defensa pidan estar en la sala.' },
  { t: 'Sentencia dentro de plazo', d: 'Cada paso tiene un plazo máximo público. Si un juzgado se atasca, recibe refuerzos o sus casos se reparten entre otros.', tiempo: 'Propuesta: 6 meses en primera instancia' },
];

/** Proposed maximum times. These are a proposal to discuss, not figures from any source. */
export const PLAZOS_PROPUESTA: { t: string; plazo: string; hoy: string; fuente?: string }[] = [
  { t: 'Derivar una denuncia al camino correcto', plazo: '48 horas', hoy: 'Sin plazo: si se equivoca de camino, se archiva y vuelve a empezar.' },
  { t: 'Declarar ante un juez si hay detenido', plazo: 'El mismo día, en la comisaría', hoy: 'Hasta 72 horas de detención antes de pasar al juez.', fuente: 'constitucion' },
  { t: 'Juicio rápido (delito sencillo, autor identificado)', plazo: '15 días, como ya dice la ley', hoy: 'Ya existe: el juicio debe celebrarse en 15 días como máximo.', fuente: 'lecrim' },
  { t: 'Investigación de un delito', plazo: '6 meses, 12 si es complejo', hoy: '12 meses, prorrogables varias veces 6 meses más.', fuente: 'lecrim' },
  { t: 'Sentencia en primera instancia (civil, social, contencioso)', plazo: '6 meses desde la demanda', hoy: 'Sin plazo. De media, más de un año en lo civil.', fuente: 'cepej-2024' },
  { t: 'Recurso', plazo: '6 meses', hoy: 'Sin plazo. De media, 459 días en lo civil.', fuente: 'cepej-2024' },
];

/** What each of the 8 scales does for justice under the proposal. */
export const JUSTICIA_ESCALAS: Record<string, { hace: string; ejemplo: string }> = {
  persona: { hace: 'Denunciar una sola vez y seguir su caso desde el móvil, con avisos de cada paso.', ejemplo: 'Ve en qué juzgado está su denuncia y cuándo es su vista.' },
  vecindad: { hace: 'Resolver los roces de convivencia hablando, con un mediador vecinal antes de ir al juzgado.', ejemplo: 'Un ruido o una gotera se arreglan en la junta, con acta.' },
  municipio: { hace: 'Ser la puerta de entrada: oficina de justicia con punto de videollamada para denunciar y declarar sin viajar.', ejemplo: 'En un pueblo de 400 habitantes se declara desde la oficina municipal.' },
  provincia: { hace: 'Tener el tribunal de instancia y los juzgados de guardia en las comisarías comarcales.', ejemplo: 'Un juez de guardia atiende por turnos varias comisarías, en persona o a distancia.' },
  region: { hace: 'Dar los medios: edificios, personal, ordenadores y el expediente digital, que hoy ya gestionan muchas comunidades.', ejemplo: 'Un mismo expediente para policía, juzgado y fiscalía en toda la región.' },
  nacion: { hace: 'Hacer las leyes de procedimiento, fijar los plazos máximos y garantizar jueces suficientes e independientes.', ejemplo: 'Una sola ley de la denuncia, igual en todo el país.' },
  continente: { hace: 'Cooperación entre países y defensa de los derechos: tribunales europeos y fiscalía europea.', ejemplo: 'Una orden de detención europea vale en todos los países de la Unión.' },
  planeta: { hace: 'Juzgar lo que ningún país puede juzgar solo: crímenes de guerra, genocidio y conflictos entre Estados.', ejemplo: 'La Corte Penal Internacional y la Corte Internacional de Justicia.' },
};

/** Honest open questions. */
export const RETOS_JUSTICIA: { t: string; d: string; fuente?: string }[] = [
  { t: 'El juez no puede depender de la policía', d: 'La Constitución dice al revés: la policía judicial depende de los jueces y fiscales. Un juez en la comisaría tiene que tener su propio despacho, su propio jefe (el Consejo General del Poder Judicial) y poder darle órdenes a la policía, nunca recibirlas.', fuente: 'constitucion' },
  { t: 'Que la rapidez no se coma las garantías', d: 'Toda persona tiene derecho a un abogado, a no declarar contra sí misma y a un juicio con todas las garantías. Un juicio rápido o por videollamada no puede saltarse nada de eso. Hoy la ley ya obliga a estar en persona en los delitos graves.', fuente: 'sepin-telematico' },
  { t: 'Juzgar no es acusar', d: 'El juez que escucha la primera declaración en la comisaría no debería ser el mismo que dicte la sentencia, para que llegue al juicio sin opinión formada.' },
  { t: 'Unir lo civil y lo penal tiene un límite', d: 'Para condenar por un delito hacen falta pruebas «más allá de toda duda»; para una indemnización basta con menos. En un mismo expediente pueden ir juntos, pero hay que decidir cada cosa con su regla.' },
  { t: 'Faltan jueces', d: 'Sin más jueces, ningún plazo máximo se cumple. España tiene menos de la mitad de jueces por habitante que la mediana de la UE, y formar a un juez lleva años.', fuente: 'cepej-2024' },
  { t: 'Un plazo máximo necesita una consecuencia', d: 'Si se pasa el plazo, ¿qué ocurre? No puede ser que el caso se cierre sin más. Hay que decidir si se refuerza ese juzgado, se reparte el caso o se indemniza a quien espera.' },
  { t: 'Vídeo y datos seguros', d: 'Declarar a distancia exige identificar bien a cada persona y proteger lo que se graba. Un fallo aquí puede anular un juicio.' },
];
