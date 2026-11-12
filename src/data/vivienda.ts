// ============================================================================
// THE «VIVIENDA» WINDOW (2026-11-12, Eugenio)
// ============================================================================
// «Vamos a añadir también el apartado de vivienda en el menú, donde actualmente
// apenas se hace nada por parte de las administraciones. Y vamos a poner en cada
// una de las 8 escalas qué se va a promulgar y cómo van a regular.»
//
// Every real figure carries a source id from `FUENTES_VIVIENDA`, looked up in
// November 2026. What is an estimate of the model says so on the page.
import { ESCALAS, MATRIZ, SUPUESTOS, cuentasPais, type EscalaId } from './modeloSocioeconomico';

// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'vivienda', t: 'Resumen' },
  { id: 'vivienda-hoy', t: 'Cómo está hoy' },
  { id: 'vivienda-quien', t: 'Quién manda hoy' },
  { id: 'vivienda-propuesta', t: 'La propuesta' },
  { id: 'vivienda-escalas', t: 'Las 8 escalas' },
  { id: 'vivienda-retos', t: 'Lo que falta' },
  { id: 'vivienda-fuentes', t: 'Fuentes' },
];

// ── SOURCES ─────────────────────────────────────────────────────────────────
export interface FuenteV { titulo: string; url: string }
export const FUENTES_VIVIENDA: Record<string, FuenteV> = {
  'housing-europe': { titulo: 'Housing Europe · The State of Housing in the EU 2025, ficha de España (vivienda pública ≈ 1,7 %, ≈ 318.000 viviendas, listas de espera)', url: 'https://www.housingeurope.eu/wp-content/uploads/2025/10/spain_the_state_of_housing_in_the_eu_2025_digital.pdf' },
  'ocde-social': { titulo: 'OCDE · Affordable Housing Database, PH4.2: viviendas sociales de alquiler sobre el total (2022 o último año)', url: 'https://webfs.oecd.org/Els-com/Affordable_Housing_Database/PH4-2-Social-rental-housing-stock.pdf' },
  'igae-cofog': { titulo: 'IGAE · Gasto de las administraciones públicas por funciones 2020-2024 (grupos 06.1 y 10.6)', url: 'https://www.igae.pap.hacienda.gob.es/sitios/igae/es-ES/Contabilidad/ContabilidadNacional/Publicaciones/Documents/AAPP_A/Funcional%202020-2024.pdf' },
  'eurostat-ayudas': { titulo: 'Euronews con datos de Eurostat · Gasto en vivienda social y ayudas al alquiler por habitante, 2024', url: 'https://es.euronews.com/2026/02/20/vivienda-social-y-ayudas-al-alquiler-cuanto-gastan-los-gobiernos-por-persona' },
  'ine-ipv': { titulo: 'INE · Índice de Precios de Vivienda, segundo trimestre de 2026', url: 'https://www.ine.es/dyngs/Prensa/IPV2T26.htm' },
  'sobrecarga-es': { titulo: 'Eurostat vía Trading Economics · Inquilinos a precio de mercado que dedican más del 40 % de su renta a la vivienda: España, 2025', url: 'https://tradingeconomics.com/spain/housing-cost-overburden-rate-tenant-rent-at-market-price-eurostat-data.html' },
  'sobrecarga-ue': { titulo: 'Eurostat vía Trading Economics · Lo mismo para la media de la UE, 2025', url: 'https://tradingeconomics.com/european-union/housing-cost-overburden-rate-tenant-rent-at-market-price-eurostat-data.html' },
  'bde-2025': { titulo: 'Banco de España, Informe Anual 2025, vía elDiario.es · Déficit de 750.000 viviendas y 6,8 años de renta para comprar', url: 'https://www.eldiario.es/economia/banco-espana-eleva-750-000-viviendas-faltan-anticipa-deficit-agravara-proximos-anos_1_13313634.amp.html' },
  'ine-vacias': { titulo: 'INE, Censo de Población y Viviendas 2021, vía Valencia Plaza · 3.837.328 viviendas vacías', url: 'https://valenciaplaza.com/ine-cifra-numero-viviendas-vacias-mas-de-3-8-millones' },
  'protegidas': { titulo: 'La Moncloa · Viviendas protegidas iniciadas y terminadas, del 4.º trimestre de 2024 al 3.º de 2025', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/vivienda-agenda-urbana/Paginas/2025/181225-estadistica-viviendas-protegidas.aspx' },
  'ley-vivienda': { titulo: 'BOE · Ley 12/2023, de 24 de mayo, por el derecho a la vivienda', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-12203' },
  'constitucion': { titulo: 'BOE · Constitución española, artículos 47 y 148.1.3.ª', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229' },
  'lrbrl': { titulo: 'BOE · Ley 7/1985 de Bases del Régimen Local, artículo 25.2.a', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1985-5392' },
  'zonas': { titulo: 'Ara · Zonas tensionadas en agosto de 2026: 317 municipios en cinco comunidades', url: 'https://es.ara.cat/economia/inmobiliario/tope-alquiler-llega-municipios-espanoles-funciona_1_5815492.html' },
  'plan-estatal': { titulo: 'El Independiente · El Plan Estatal de Vivienda 2026-2030, aprobado el 21 de abril de 2026, con 7.000 M€', url: 'https://www.elindependiente.com/economia/2026/04/21/gobierno-blinda-especulacion-parque-publico-nuevo-plan-estatal-vivienda/' },
  'plan-ue': { titulo: 'Cuatrecasas · El primer Plan Europeo de Vivienda Asequible (16 de diciembre de 2025)', url: 'https://www.cuatrecasas.com/en/spain/real-estate/art/european-affordable-housing-plan' },
  'onu-habitat': { titulo: 'ONU DESA con datos de ONU-Hábitat · 318 millones de personas sin hogar y 2.800 millones sin vivienda adecuada', url: 'https://social.desa.un.org/world-summit-2025/blog/300million-people-homeless-worldwide' },
  'dudh': { titulo: 'ONU · Declaración Universal de Derechos Humanos, artículo 25', url: 'https://www.un.org/es/about-us/universal-declaration-of-human-rights' },
  'iva': { titulo: 'BOE · Ley 37/1992 del IVA: el alquiler de vivienda, exento (art. 20); la vivienda nueva, al 10 % (art. 91)', url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740' },
};

// ── TODAY, IN FIGURES ───────────────────────────────────────────────────────
export const HOY_VIVIENDA = {
  /** Public social rental housing as % of all dwellings, and units (housing-europe). */
  publicaPct: 1.7,
  publicas: 318_000,
  /** Households waiting for one (housing-europe). */
  esperaMin: 180_000, esperaMax: 250_000,
  /** Social rental housing, EU average, % of dwellings (ocde-social). */
  socialUE: 8,
  /** Netherlands, Austria, Denmark: «more than 20 %» (ocde-social). */
  socialTop: 20,
  /** COFOG 2024, M€ (igae-cofog): 06.1 housing development + 10.6 housing within social protection. */
  urbanismo2024: 2_756,
  ayudas2024: 657,
  /** The whole COFOG division 06, with water and street lighting (igae-cofog). */
  division2024: 7_613,
  /** Housing benefits per inhabitant, 2024, € (eurostat-ayudas). */
  ayudaPersonaES: 36,
  ayudaPersonaUE: 148,
  /** House prices, annual change, Q2 2026, % (ine-ipv). */
  precios: 12.2, preciosNueva: 7.4, preciosUsada: 12.9,
  /** Tenants at market price spending > 40 % of income on housing, 2025, % (sobrecarga-es / -ue). */
  sobrecargaES: 26.8, sobrecargaUE: 18.5,
  /** Banco de España (bde-2025). */
  deficit: 750_000,
  anosRenta: 6.8,
  hogaresNuevos2025: 240_000,
  viviendasNuevas2025: 92_000,
  /** Census 2021 (ine-vacias). */
  vacias: 3_837_328, vaciasPct: 14.4, totalViviendas: 26_623_708,
  /** Protected housing, last 12 months to Q3 2025 (protegidas). */
  protegidasIniciadas: 23_179, libresIniciadas: 115_755, protegidasTerminadas: 14_317,
  /** Rent-capped areas, August 2026 (zonas). */
  zonasMunicipios: 317, zonasComunidades: 5,
  /** Plan Estatal 2026-2030, M€ (plan-estatal). */
  planEstatal: 7_000,
};
export const GASTO_HOY = HOY_VIVIENDA.urbanismo2024 + HOY_VIVIENDA.ayudas2024;

// ── THE MODEL: WHAT EACH SCALE PUTS INTO HOUSING ───────────────────────────
// Weight of housing in each scale's budget comes from MATRIZ; each scale's
// budget from cuentasPais('literal'). For the neighbourhood, continent and planet
// it is Spain's share only. An estimate of the model, not a measured figure.
const PAIS = cuentasPais('literal');
export const POR_ESCALA = PAIS.porEscala;
export const VIVIENDA_ESCALA: Record<EscalaId, number> = Object.fromEntries(
  ESCALAS.map(e => [e.id, ((MATRIZ[e.id].vivienda.peso ?? 0) / 100) * POR_ESCALA]),
) as Record<EscalaId, number>;
/** Housing proper (build, buy, rent, rehabilitate): municipality to nation. */
export const PUBLICAS_MODELO: EscalaId[] = ['municipio', 'provincia', 'region', 'nacion'];
export const GASTO_MODELO = PUBLICAS_MODELO.reduce((s, e) => s + VIVIENDA_ESCALA[e], 0);

// ── WHO DOES WHAT TODAY ─────────────────────────────────────────────────────
export interface NivelHoy { nivel: string; manda: string; hace: string; fuentes: string[] }
export const QUIEN_HOY: NivelHoy[] = [
  {
    nivel: 'Comunidades autónomas',
    manda: 'Tienen la competencia plena: cada una hace su ley y su plan de vivienda.',
    hace: `Deciden si hay zonas con alquiler limitado. En agosto de 2026 solo lo aplicaban ${HOY_VIVIENDA.zonasComunidades} comunidades, en ${HOY_VIVIENDA.zonasMunicipios} municipios, casi todos en Cataluña. La Asamblea de Madrid rechazó pedirlo para diez municipios.`,
    fuentes: ['constitucion', 'zonas'],
  },
  {
    nivel: 'Ayuntamientos',
    manda: 'El urbanismo (dónde y cuánto se construye) y la vivienda protegida de su municipio.',
    hace: 'Pueden subir hasta un 150 % el IBI de los pisos vacíos más de dos años, si el dueño tiene cuatro o más.',
    fuentes: ['lrbrl', 'ley-vivienda'],
  },
  {
    nivel: 'Estado',
    manda: 'Las reglas básicas iguales para todos: la Ley 12/2023 por el derecho a la vivienda, el alquiler (LAU) y los impuestos.',
    hace: `Reparte dinero a las comunidades con el Plan Estatal: ${HOY_VIVIENDA.planEstatal.toLocaleString('es-ES')} M€ para 2026-2030.`,
    fuentes: ['ley-vivienda', 'plan-estatal'],
  },
  {
    nivel: 'Unión Europea',
    manda: 'No tiene competencia en vivienda: solo puede animar, financiar y poner reglas de mercado.',
    hace: 'Presentó su primer Plan Europeo de Vivienda Asequible en diciembre de 2025: más margen para ayudas públicas y préstamos.',
    fuentes: ['plan-ue'],
  },
];

/** What the 2023 housing law does, in plain words (ley-vivienda). */
export const LEY_2023: { t: string; d: string }[] = [
  { t: 'Zonas tensionadas', d: 'La comunidad autónoma puede declarar una zona con escasez. Allí, el alquiler nuevo no puede subir respecto al anterior, y a los grandes propietarios se les aplica un precio de referencia.' },
  { t: 'Gran propietario', d: 'Quien tiene más de diez viviendas, o más de cinco en una zona tensionada si la comunidad lo decide.' },
  { t: 'Suelo para vivienda protegida', d: 'Al urbanizar suelo nuevo, el 40 % de lo que se construya debe ser vivienda protegida; al renovar ciudad, el 20 %.' },
  { t: 'Vivienda protegida para siempre', d: 'La que se hace en suelo reservado no puede pasar a ser libre. La que se hace en otro suelo, como mínimo 30 años.' },
  { t: 'Pisos vacíos', d: 'El ayuntamiento puede cobrar más IBI, hasta un 150 % extra, por pisos vacíos más de dos años de quien tiene cuatro o más.' },
  { t: 'Lo que no hace', d: 'No obliga a ninguna comunidad a aplicar nada: si una comunidad no declara zonas, la ley no cambia nada allí.' },
];

// ── THE PROPOSAL, SCALE BY SCALE ────────────────────────────────────────────
// What each scale enacts («promulga») and how it regulates («regula»). These are
// proposals for Eugenio's model, built on MATRIZ (vivienda), TERCIOS_ESCALA and
// the tax tiers; nothing here describes a law in force except the `hoy` lines.
export interface ViviendaEscala {
  /** One sentence, shown first. */
  resumen: string;
  /** Norms and programmes it approves (empty: it approves none). */
  promulga: string[];
  /** What it does with its money and its people. */
  hace: string[];
  /** How it regulates: who checks, which register, what happens if a rule is broken. */
  regula: string[];
  /** In one line: what this scale's money does for housing. */
  dinero: string;
  /** The nearest thing that exists today, for contrast. */
  hoy: string;
}
export const PROPUESTA_ESCALAS: Record<EscalaId, ViviendaEscala> = {
  persona: {
    resumen: 'Elige dónde vive y declara una sola casa como la suya, la habitual.',
    promulga: ['No aprueba normas; solo declara cuál es su casa habitual.'],
    hace: [
      'Paga su alquiler o su hipoteca. Su casa habitual paga el tramo básico, un 10 %; una segunda, el secundario, un 20 %.',
      'Puede poner su tercio para producir en una cooperativa de vivienda o en la casa de su comunidad.',
    ],
    regula: [
      'Con una declaración: su casa habitual queda apuntada en el registro único de vivienda, unida a su identidad digital.',
      'Si declara como habitual una casa que no lo es, el registro lo ve al cruzar el padrón con el consumo de luz y agua: paga la diferencia hasta el 20 % y una multa.',
    ],
    dinero: 'Paga su casa con su sueldo y su dividendo. No tiene un presupuesto fijo para vivienda.',
    hoy: 'Hoy paga distintos impuestos según compre, alquile o herede, y cada año el IBI. Todo eso desaparece en el modelo.',
  },
  vecindad: {
    resumen: 'Cuida el edificio sin cuotas y pone sus propias normas de convivencia.',
    promulga: [
      'Los estatutos del edificio o de la urbanización: convivencia, zonas comunes, si se admiten pisos turísticos.',
      'Un plan de mantenimiento del edificio a varios años.',
    ],
    hace: [
      'Arregla tejado, fachada, ascensor, accesibilidad y aislamiento con su parte del impuesto, sin cuotas.',
      'Presta al IPC a una familia del edificio que pase un mal momento.',
    ],
    regula: [
      'Votan todas las personas que viven allí, no solo las propietarias, y las cuentas están abiertas a todos en la web.',
      'Un técnico del municipio revisa el edificio cada diez años y dice qué obras son urgentes.',
      'Si alguien incumple los estatutos (por ejemplo, un piso turístico no permitido), la junta avisa; si sigue, lo pasa al municipio, que puede multar.',
    ],
    dinero: 'Dedica a vivienda el 30 % de su presupuesto, su gasto principal, en lugar de los unos 40.000 M€ de cuotas de comunidad de hoy.',
    hoy: 'Hoy la comunidad de propietarios cobra cuotas, y solo votan los dueños.',
  },
  municipio: {
    resumen: 'Decide dónde se construye y tiene casas de alquiler que no se venden.',
    promulga: [
      'El plan del pueblo o la ciudad: dónde se construye, cuánto, y qué suelo queda para vivienda pública.',
      'Una ordenanza de uso: cuántos pisos turísticos caben en cada barrio.',
      'La bolsa municipal de alquiler, abierta a cualquier vecino y a cualquier dueño.',
    ],
    hace: [
      'Con su tercio para producir compra, construye o rehabilita vivienda municipal en alquiler, que no se vende nunca.',
      'Da las licencias de obra en semanas, con un técnico que acompaña.',
    ],
    regula: [
      'Sus inspectores de vivienda comprueban que cada casa sea habitable y que cada piso turístico tenga licencia; sin licencia, multa y cierre.',
      'Lleva el registro de viviendas vacías del municipio, cruzado con el consumo de luz y agua.',
      'Reparte la vivienda municipal por sorteo público entre quienes cumplen los requisitos, con la lista en la web.',
    ],
    dinero: 'Dedica a vivienda el 10 % de su presupuesto.',
    hoy: 'Hoy el ayuntamiento hace el urbanismo y puede gestionar vivienda protegida. Entre todas las administraciones de España suman unas 318.000 viviendas públicas de alquiler.',
  },
  provincia: {
    resumen: 'Lleva vivienda a los pueblos y hace los proyectos que un pueblo pequeño no puede.',
    promulga: [
      'Un plan comarcal de vivienda rural, para que los pueblos no se vacíen.',
      'Una oficina técnica comarcal de vivienda.',
    ],
    hace: [
      'Rehabilita casas en pueblos y las ofrece a nuevos pobladores, en alquiler o con compra a plazos.',
      'Coordina el suelo entre municipios vecinos, para que no compitan entre ellos.',
    ],
    regula: [
      'Su oficina técnica revisa los proyectos y las obras de los pueblos pequeños y firma la licencia en nombre del municipio.',
      'Lleva el registro comarcal de casas rehabilitadas: si una casa cedida queda vacía más de un año, vuelve a la bolsa comarcal.',
    ],
    dinero: 'Dedica a vivienda el 6 % de su presupuesto.',
    hoy: 'Hoy las diputaciones ayudan a los pueblos pequeños en general, sin una tarea propia de vivienda.',
  },
  region: {
    resumen: 'Mantiene los grandes parques de alquiler y fija el precio de referencia donde falta casa.',
    promulga: [
      'Un plan regional que aplica la ley común a su territorio: cuántas viviendas faltan y dónde.',
      'Una agencia regional de vivienda pública, con cuentas abiertas.',
    ],
    hace: [
      'Mantiene el parque público de alquiler grande: edificios enteros en las ciudades con escasez.',
      'Presta al IPC a los municipios que quieren construir y no tienen ahorros suficientes.',
    ],
    regula: [
      'Su agencia publica cada trimestre el precio de referencia del alquiler por barrio, con los datos de los contratos registrados.',
      'En las zonas con escasez revisa los contratos: si un alquiler pasa del precio de referencia, el inquilino recupera la diferencia y el dueño paga una multa.',
      'Revisa cada año las cuentas de vivienda de sus municipios.',
    ],
    dinero: 'Dedica a vivienda el 8 % de su presupuesto.',
    hoy: 'Hoy es quien tiene la competencia plena, y la mayoría no aplica las zonas tensionadas.',
  },
  nacion: {
    resumen: 'Hace una sola ley de vivienda para todo el país y lleva los registros comunes.',
    promulga: [
      'Una sola ley de vivienda que haga exigible el derecho a una vivienda digna (artículo 47 de la Constitución).',
      'Las reglas comunes de construcción: calidad, accesibilidad y energía.',
    ],
    hace: [
      'Mantiene un fondo de garantía y suelo público estatal para las regiones que lo necesiten.',
    ],
    regula: [
      'Lleva el registro único de vivienda habitual y de viviendas vacías, y lo cruza con el padrón y los consumos.',
      'Fija qué es vivienda habitual (10 %) y qué es segunda (20 %), y la multa por declarar mal.',
      'La ley prohíbe vender el parque público: una venta así no vale, y quien la firma responde.',
    ],
    dinero: 'Dedica a vivienda el 3 % de su presupuesto.',
    hoy: 'Hoy el Estado solo pone las reglas básicas y reparte dinero a las comunidades.',
  },
  continente: {
    resumen: 'Pone unos mínimos comunes en Europa y presta a los parques públicos.',
    promulga: [
      'Unas normas mínimas comunes de vivienda digna y eficiente en toda Europa.',
      'Un registro europeo de pisos turísticos.',
    ],
    hace: [
      'Presta al IPC a los parques públicos de vivienda de regiones y municipios.',
      'Publica datos comparables de precios, esfuerzo y vivienda social país por país.',
    ],
    regula: [
      'Cada plataforma da los mismos datos de sus pisos turísticos; la que anuncia uno sin número de registro paga una multa.',
      'Comprueba que lo prestado se usa en vivienda que no se vende; si no, se devuelve.',
    ],
    dinero: 'Dedica a vivienda el 3 % de su presupuesto. La cifra es solo lo que pondría España.',
    hoy: 'Hoy la Unión Europea no tiene competencia en vivienda. Hizo su primer plan en 2025, y en mayo de 2026 empezó a aplicarse su registro de alquileres cortos.',
  },
  planeta: {
    resumen: 'Hace del techo digno un derecho medible y da refugio a quien lo pierde.',
    promulga: [
      'El derecho a la vivienda como compromiso medible de todos los países (artículo 25 de la Declaración Universal).',
      'Un estándar mínimo de vivienda digna: techo seguro, agua, saneamiento y luz.',
    ],
    hace: [
      'Da refugio a personas desplazadas por guerras o desastres, y ayuda a reconstruir después de una catástrofe.',
    ],
    regula: [
      'Publica cada año, país por país, cuántas personas viven sin hogar o en una vivienda inadecuada, con los datos abiertos.',
      'El país que no avanza hacia el estándar mínimo lo explica ante la asamblea del planeta. No hay multas: la presión es pública.',
    ],
    dinero: 'Dedica a vivienda el 2 % de su presupuesto. La cifra es solo lo que pondría España.',
    hoy: 'Hoy ONU-Hábitat estudia, aconseja y apoya proyectos, pero no obliga a ningún país.',
  },
};

// ── THE TAX ON A HOME, IN THE MODEL ─────────────────────────────────────────
export type UsoVivienda = 'habitual' | 'segunda' | 'alquiler';
export const TIPO_USO: Record<UsoVivienda, number> = { habitual: 0.1, segunda: 0.2, alquiler: 0.1 };

// ── WHAT IS STILL OPEN ──────────────────────────────────────────────────────
export const RETOS: { t: string; d: string }[] = [
  { t: 'El alquiler sube un 10 %', d: `Hoy el alquiler de vivienda no paga IVA. Con el modelo paga el tramo básico: con 900 € al mes, 90 € más. A cambio, el dueño deja de pagar el IBI (el modelo usa una estimación de ${SUPUESTOS.ibi} € al año por hogar, unos ${Math.round(SUPUESTOS.ibi / 12)} € al mes) y el IRPF por lo que cobra, que depende de su renta. Si el dueño baja el alquiler con lo que se ahorra no está calculado: no hay forma de saberlo de antemano.` },
  { t: 'La bolsa de casas vacías puede no bastar', d: 'Si los dueños no quieren llevar sus pisos a la bolsa municipal, las casas siguen cerradas. Las alternativas (alquiler obligatorio o un recargo) están en «La propuesta», y las decide Eugenio.' },
  { t: 'Qué es «habitual»', d: 'La diferencia entre el 10 % y el 20 % invita a declarar como habitual lo que no lo es. Hace falta un registro único fiable, y saber qué pasa con las parejas, los hijos que estudian fuera o quien trabaja en dos ciudades.' },
  { t: 'Construir lleva años', d: `Pasar de menos del 2 % de vivienda social a la media europea del 8 % es multiplicar el parque por más de cuatro. El Banco de España calcula que ya faltan ${HOY_VIVIENDA.deficit.toLocaleString('es-ES')} viviendas, y hoy hay menos gente trabajando en la construcción que en los noventa.` },
  { t: 'Más dinero puede subir los precios', d: 'Si las escalas compran pisos que ya existen, compiten con las familias y el precio sube. Por eso el tercio para producir debe ir, sobre todo, a construir y a rehabilitar casas vacías, no a comprar en el mercado.' },
  { t: 'Quién vota en el edificio', d: 'Que voten todas las personas que viven allí, y no solo las dueñas, choca con la ley de propiedad horizontal de hoy. Hay que decidir qué se vota entre residentes y qué sigue siendo de quien es propietario.' },
  { t: 'El paso desde hoy', d: 'Hoy la vivienda es competencia plena de las comunidades. Una sola ley para todo el país, como propone el modelo, necesitaría cambiar el reparto de competencias.' },
  { t: 'Los pisos turísticos', d: 'Leemos que un alquiler turístico es alojamiento de viaje, y por tanto tramo del ocio (40 %). Es nuestra lectura de las categorías, y Eugenio debe confirmarla.' },
];
