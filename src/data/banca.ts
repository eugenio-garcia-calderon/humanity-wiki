// Data for the «Banca» window of the «Modelo Público Optimizado» (Eugenio, 2026-11-12):
// how banks create money, Richard Werner's work, banking in Spain today with sources,
// and the proposal: newly created bank money only for production and for a person's
// first and second home; a third home, or a company buying homes, only with money that
// already exists. Every figure carries its source; checked in November 2026.
// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'banca', t: 'Resumen' },
  { id: 'banca-dinero', t: 'Cómo nace el dinero' },
  { id: 'banca-werner', t: 'Richard Werner' },
  { id: 'banca-hoy', t: 'Hoy en España' },
  { id: 'banca-propuesta', t: 'La propuesta' },
  { id: 'banca-vivienda', t: '¿Puedo pedir un préstamo?' },
  { id: 'banca-inclusiva', t: 'Banca para todos' },
  { id: 'banca-escalas', t: 'Cada escala' },
  { id: 'banca-retos', t: 'Retos' },
  { id: 'banca-fuentes', t: 'Fuentes' },
];

export interface FuenteBanca { url: string; titulo: string }

/** Sources of this window, by id. Titles say who publishes and the date. */
export const FUENTES_BANCA: Record<string, FuenteBanca> = {
  'bde-crea': { url: 'https://www.bde.es/wbe/es/areas-actuacion/politica-monetaria/preguntas-frecuentes/definicion-funciones-del-dinero/como-se-crea-el-dinero.html', titulo: 'Banco de España · ¿Cómo se crea el dinero? (preguntas frecuentes)' },
  'boe-2014': { url: 'https://www.bankofengland.co.uk/quarterly-bulletin/2014/q1/money-creation-in-the-modern-economy', titulo: 'Banco de Inglaterra · McLeay, Radia y Thomas, «Money creation in the modern economy», Quarterly Bulletin 2014 T1' },
  'bundesbank-2017': { url: 'https://bundesbank.de/resource/blob/654284/df66c4444d065a7f519e2ab0c476df58/m/2017-04-money-creation-process-data.pdf', titulo: 'Bundesbank · «The role of banks, non-banks and the central bank in the money creation process», informe mensual de abril de 2017' },
  'fmi-2016': { url: 'https://www.imf.org/external/Pubs/FT/fandd/spa/2016/03/pdf/kumhof.pdf', titulo: 'FMI · Kumhof y Jakab, «La verdad sobre los bancos», Finanzas & Desarrollo, marzo de 2016' },
  'werner-1997': { url: 'https://eprints.soton.ac.uk/36569', titulo: 'Werner (1997) · «Towards a new monetary paradigm: a quantity theorem of disaggregated credit, with evidence from Japan», Kredit und Kapital 30(2)' },
  'werner-libros': { url: 'https://professorwerner.org/pubtype/book-authored/', titulo: 'Richard A. Werner · lista de sus libros (Princes of the Yen, 2003; New Paradigm in Macroeconomics, 2005; Where does money come from?, 2011)' },
  'werner-2005': { url: 'https://www.palgrave.com/gb/book/9781403920737', titulo: 'Palgrave Macmillan · Werner (2005), «New Paradigm in Macroeconomics»' },
  'werner-2013': { url: 'https://doi.org/10.3790/ccm.46.3.357', titulo: 'Werner (2013) · «Towards a more stable and sustainable financial architecture», Credit and Capital Markets 46(3)' },
  'werner-2014a': { url: 'https://doi.org/10.1016/j.irfa.2014.07.015', titulo: 'Werner (2014) · «Can banks individually create money out of nothing?», International Review of Financial Analysis 36' },
  'werner-2014b': { url: 'https://doi.org/10.1016/j.irfa.2014.10.013', titulo: 'Werner (2014) · «How do banks create money, and why can other firms not do the same?», International Review of Financial Analysis 36' },
  'werner-2016': { url: 'https://doi.org/10.1016/j.irfa.2015.08.014', titulo: 'Werner (2016) · «A lost century in economics: Three theories of banking and the conclusive evidence», International Review of Financial Analysis 46' },
  'werner-2021': { url: 'https://rbes.fa.ru/jour/article/download/169/170', titulo: 'Werner (2021) · «Banks and Economic Growth: The General Theory in a Basic Disequilibrium Model with Five Rationing Regimes», Review of Business and Economics Studies 9(4)' },
  'credito-2026': { url: 'https://www.bolsamania.com/noticias_print/economia/economia--el-credito-a-familias-se-eleva-en-junio-a-719878-millones-impulsado-por-prestamos-al-consumo-e-hipotecas--23173162.html', titulo: 'Europa Press con datos del Banco de España (3-8-2026) · El crédito a familias en junio de 2026' },
  'ief-2025': { url: 'https://www.bde.es/f/webbe/Secciones/Publicaciones/InformesBoletinesRevistas/InformesEstabilidadFinancera/25/IEF_2025_2_Cap4.pdf', titulo: 'Banco de España · Informe de Estabilidad Financiera, otoño de 2025, capítulo 4' },
  'ief-2026': { url: 'https://www.bde.es/wbe/p/b248c7ed1b52e910VgnVCM100000dec89783RCRD/webbe/GAP/informacion-embargada/20260514_IEF_Primavera2026.pdf', titulo: 'Banco de España · Informe de Estabilidad Financiera, primavera de 2026' },
  'ccyb-2025': { url: 'https://www.bde.es/f/webbe/GAP/Secciones/SalaPrensa/NotasInformativas/25/presbe2025-90.pdf', titulo: 'Banco de España (1-10-2025) · Sube el colchón de capital anticíclico al 1 %' },
  'promotor-2023': { url: 'https://www.vozpopuli.com/economia_y_finanzas/banca/banco-de-espana-vigilar-ladrillo-113000-millones-creditos-promotoras.html', titulo: 'Vozpópuli con datos del Informe de Estabilidad Financiera del Banco de España (15-4-2024) · Crédito a construcción e inmobiliarias' },
  'linde-2017': { url: 'https://repositorio.bde.es/bitstream/123456789/22503/1/IIPP-2017-017.pdf', titulo: 'Banco de España · Comparecencia del gobernador Luis M. Linde ante la comisión de investigación de la crisis financiera, Congreso, 12-7-2017' },
  'ivie-2026': { url: 'https://finanzasdigital.com/cierre-de-sucursales-bancarias-en-espana-cae-63-por-ciento-desde-2008-ivie/', titulo: 'Ivie, Observatorio de Inclusión Financiera (octubre de 2026) · Oficinas bancarias y municipios sin acceso' },
  'cr5': { url: 'https://es.ara.cat/economia/banca/grandes-estados-ue-espana-mayor-concentracion-bancaria_1_5409992.html', titulo: 'Ara, con datos del Banco Central Europeo (2023) · Cuota de los cinco mayores bancos' },
  'concentracion-vivienda': { url: 'https://www.menorca.info/actualidad/nacional/2026/04/27/2617613/cada-vez-menos-hogares-acceden-vivienda-propia-pero-crece-acumulacion-inmuebles-entre-propietarios.html', titulo: 'Europa Press (27-4-2026) · Informe «El problema de la concentración inmobiliaria en España», Ministerio de Consumo y CSIC, con datos de la Agencia Tributaria' },
  'cuenta-basica': { url: 'https://www.economistjurist.es/actualidad-juridica/legislacion/se-regula-un-regimen-gratuito-de-cuentas-de-pago-basicas-para-personas-en-situacion-de-vulnerabilidad-o-con-riesgo-de-exclusion-financiera', titulo: 'Economist & Jurist · Cuenta de pago básica: Real Decreto-ley 19/2017, Real Decreto 164/2019 y Orden ECE/228/2019' },
  'presencial-2022': { url: 'https://clientebancario.bde.es/pcb/es/blog/las-entidades-de-credito-prestaran-servicios-financieros-presenciales-en-todos-los-municipios-espanoles.html', titulo: 'Banco de España, Portal del Cliente Bancario (27-10-2022) · Servicios financieros presenciales en todos los municipios' },
  'protocolo-mayores': { url: 'https://www.ceca.es/wp-content/uploads/2022/03/Documento-consolidado_Protocolo-estrategico-banca.pdf', titulo: 'AEB, CECA y UNACC (2022) · Protocolo estratégico para reforzar el compromiso social y sostenible de la banca' },
  'bundesbank-2025': { url: 'https://www.bundesbank.de/de/presse/pressemitteilungen/bankstellenentwicklung-im-jahr-2025-951792', titulo: 'Bundesbank · Bancos y oficinas en Alemania en 2025' },
  'bancaetica': { url: 'https://www.ocu.org/dinero/cuenta-bancaria/noticias/banca-etica', titulo: 'OCU (2014) · Banca ética: Triodos Bank y Fiare Banca Ética' },
  'ico-verde': { url: 'https://www.bolsasymercados.es/ing/Media/Press-Release/20220602/nota_20220602_6/BME_admits_a_new_500_million_euro_Green_Bond_from_ICO', titulo: 'BME (junio de 2022) · Bono verde del ICO de 500 millones para la transición ecológica de empresas' },
  'ico-avales': { url: 'https://www.eldebate.com/economia/20260114/gobierno-extiende-hasta-2027-avales-vivienda-pesar-solo-20-han-acogido-ellos_373978.html', titulo: 'El Debate (14-1-2026) · Los avales ICO para la primera vivienda se amplían hasta 2027' },
};

/** Spain today. Amounts in millions of euros. */
export const HOY_BANCA = {
  // Banco de España via Europa Press, June 2026.
  hipotecas2026: 527_669,
  hogares2026: 719_878,
  empresas2026: 960_233,
  consumo2026: 120_437,
  // Share of home-purchase loans in all bank credit to households and firms, June 2025 (IEF autumn 2025).
  hipotecasPct: 42.5,
  // Credit to construction and real-estate firms, end of 2023, and its share of credit to the private sector.
  promotor2023: 113_000,
  promotorPct: 8.3,
  // Branches and access (Ivie, 2025 data).
  oficinas2025: 17_101,
  oficinasCaida: 63,
  municipiosSinAcceso: 2_072,
  poblacionSinOficina: 3.21,
  poblacionSinAcceso: 0.6,
  // Market share of the five largest banks, 2023 (ECB).
  cr5: 69.5,
  // House prices in 2025, nominal (IEF spring 2026).
  precios2025: 12.7,
  // Countercyclical capital buffer, from 1 October 2026.
  colchon: 1,
  // Housing ownership (Ministry of Consumer Affairs and CSIC, tax data).
  propietarios2008: 79,
  propietarios2022: 63.9,
  viviendasGrandes2008: 138_000,
  viviendasGrandes2025: 626_000,
  // Germany, end of 2025.
  sparkassen: 344,
  cooperativas: 647,
};

/** Growth between 2001 and 2007, in %, from the Banco de España governor's 2017 testimony. */
export const BURBUJA: { t: string; v: number; tono: 'pib' | 'credito' | 'precio' }[] = [
  { t: 'Lo que produce el país (PIB)', v: 67, tono: 'pib' },
  { t: 'Precio de la vivienda', v: 150, tono: 'precio' },
  { t: 'Todo el crédito al sector privado', v: 221, tono: 'credito' },
  { t: 'Hipotecas para comprar casa', v: 250, tono: 'credito' },
  { t: 'Crédito a constructoras e inmobiliarias', v: 513, tono: 'credito' },
];

/** Richard Werner's works, one card each. All checked against the publisher or a repository. */
export const WERNER: { ano: number; titulo: string; donde: string; fuente: string; que: string }[] = [
  {
    ano: 1997, fuente: 'werner-1997',
    titulo: 'Towards a new monetary paradigm: a quantity theorem of disaggregated credit, with evidence from Japan',
    donde: 'Kredit und Kapital, vol. 30, n.º 2, págs. 276–309',
    que: 'Presenta por primera vez su «teoría cuantitativa del crédito»: separa el crédito que va a la economía real del que va a comprar activos financieros e inmuebles, y con datos de Japón muestra que este segundo explica la burbuja de los años 80.',
  },
  {
    ano: 2003, fuente: 'werner-libros',
    titulo: 'Princes of the Yen: Japan’s Central Bankers and the Transformation of the Economy',
    donde: 'Libro, M. E. Sharpe (edición original japonesa de 2001)',
    que: 'Cuenta cómo el Banco de Japón decía a cada banco cuánto podía prestar y a qué sectores (la «guía de ventana»), y cómo eso alimentó y luego pinchó la burbuja. Es su tesis más discutida por otros historiadores.',
  },
  {
    ano: 2005, fuente: 'werner-2005',
    titulo: 'New Paradigm in Macroeconomics: Solving the Riddle of Japanese Macroeconomic Performance',
    donde: 'Libro, Palgrave Macmillan',
    que: 'Desarrolla la teoría cuantitativa del crédito como alternativa a la economía de manual y la pone a prueba con la economía de Japón.',
  },
  {
    ano: 2011, fuente: 'werner-libros',
    titulo: 'Where does money come from? A guide to the UK monetary and banking system',
    donde: 'Libro, New Economics Foundation (con Ryan-Collins, Greenham y Jackson)',
    que: 'Guía divulgativa de cómo se crea el dinero en el Reino Unido: la mayor parte la crean los bancos al prestar.',
  },
  {
    ano: 2013, fuente: 'werner-2013',
    titulo: 'Towards a more stable and sustainable financial architecture – A discussion and application of the quantity theory of credit',
    donde: 'Credit and Capital Markets (Kredit und Kapital), vol. 46, n.º 3, págs. 357–387',
    que: 'Usa su teoría para cuatro cosas: ver venir y evitar las crisis bancarias, crecer de forma estable, salir rápido y barato de una recesión, y diseñar un sistema financiero que consiga todo eso.',
  },
  {
    ano: 2014, fuente: 'werner-2014a',
    titulo: 'Can banks individually create money out of nothing? — The theories and the empirical evidence',
    donde: 'International Review of Financial Analysis, vol. 36, págs. 1–19',
    que: 'Pide un préstamo a un banco alemán y mira sus cuentas por dentro: el dinero prestado no sale de otros clientes, se crea en ese momento. Fue la primera prueba directa.',
  },
  {
    ano: 2014, fuente: 'werner-2014b',
    titulo: 'How do banks create money, and why can other firms not do the same? An explanation for the coexistence of lending and deposit-taking',
    donde: 'International Review of Financial Analysis, vol. 36, págs. 71–77',
    que: 'Explica por qué solo un banco puede hacerlo: la ley le permite anotar lo que debe al cliente como un «depósito», cosa que a cualquier otra empresa le está prohibida.',
  },
  {
    ano: 2016, fuente: 'werner-2016',
    titulo: 'A lost century in economics: Three theories of banking and the conclusive evidence',
    donde: 'International Review of Financial Analysis, vol. 46, págs. 361–379',
    que: 'Compara las tres teorías sobre qué hace un banco, repite la prueba y concluye que solo encaja la de la creación de crédito. Añade que los países con muchos bancos pequeños y con crédito orientado han crecido más estables.',
  },
  {
    ano: 2021, fuente: 'werner-2021',
    titulo: 'Banks and Economic Growth: The General Theory in a Basic Disequilibrium Model with Five Rationing Regimes',
    donde: 'Review of Business and Economics Studies, vol. 9, n.º 4, págs. 9–22',
    que: 'Lo dice con todas las letras: el crédito para producir no sube los precios, el de consumo sí, y el de comprar activos infla esos activos. Propone que el banco central oriente el crédito y defiende muchos bancos pequeños y locales, como en Alemania.',
  },
];

/** The three kinds of credit in Werner's quantity theory of credit. */
export const TRES_CREDITOS: { id: 'producir' | 'consumir' | 'activos'; t: string; ejemplo: string; efecto: string; tono: 'bien' | 'medio' | 'mal' }[] = [
  { id: 'producir', t: 'Para producir', ejemplo: 'Una máquina, un taller, una granja, casas nuevas', efecto: 'Hay más dinero, pero también más cosas que comprar. La economía crece sin que suban los precios, sobre todo si hay gente y máquinas sin usar, o si el crédito permite producir más con lo mismo.', tono: 'bien' },
  { id: 'consumir', t: 'Para consumir', ejemplo: 'Un coche, unas vacaciones, una tarjeta de crédito', efecto: 'Hay más dinero, pero las mismas cosas. Suben los precios de lo que se compra a diario.', tono: 'medio' },
  { id: 'activos', t: 'Para comprar lo que ya existe', ejemplo: 'Una casa usada, un terreno, acciones', efecto: 'Hay más dinero persiguiendo las mismas casas. Sube su precio, se forman burbujas y, cuando el crédito para, llega la crisis.', tono: 'mal' },
];

/** Open questions, said plainly. `enlace` points to another window when the subject lives there. */
export const RETOS_BANCA: { t: string; d: string; enlace?: { href: string; texto: string } }[] = [
  { t: 'El dinero puede buscar otro camino', d: 'Si los bancos no pueden crear dinero para comprar la tercera casa, quien ya tiene dinero la pagará al contado, y los fondos de inversión pueden traer dinero de fuera. La regla frena el crédito nuevo, no el ahorro que ya existe. Por eso hace falta también el impuesto del modelo (la segunda vivienda paga un 20 %) y la vivienda pública.' },
  { t: 'Que se construya menos', d: 'Si las empresas no pueden pedir crédito, podría construirse menos. La salida: construir una casa nueva es producir, así que ese crédito sí se permite. Lo que no se permite es comprar casas o suelo que ya existen. Esa frontera hay que vigilarla: un «promotor» que solo compra y revende no construye nada.' },
  { t: 'España no controla el euro', d: 'La política monetaria la decide el Banco Central Europeo para toda la zona euro, y las reglas de los bancos son en gran parte europeas. España no puede prohibir sola un tipo de préstamo. Lo que sí puede hacer el Banco de España: límites a las hipotecas según el valor de la casa o lo que se gana, y colchones de capital, que la ley europea ya permite.', enlace: { href: '#moneda', texto: 'Más sobre el euro y la inflación, en Moneda' } },
  { t: 'Saber cuántas casas tiene cada uno', d: 'Hace falta un registro que diga cuántas viviendas tiene cada persona, también a través de empresas o familiares. Los datos existen (Catastro, Registro de la Propiedad, Hacienda), pero hay que cruzarlos y evitar que alguien ponga casas a nombre de otros.' },
  { t: 'Incluso la primera casa empuja los precios', d: 'Según Werner, cualquier crédito para comprar una casa que ya existe sube su precio, también si es la primera. La propuesta lo acepta a propósito, para proteger a quien necesita un hogar, pero conviene ponerle un techo: un máximo de préstamo según el precio de la casa y el sueldo.' },
  { t: 'El crédito al consumo', d: 'Werner dice que el crédito para consumir sube los precios. Este modelo todavía no dice nada de él. Queda por decidir si se limita, y cómo.' },
  { t: 'La transición', d: 'No se tocan los préstamos ya firmados. La regla vale para los nuevos, y conviene anunciarla con tiempo y aplicarla poco a poco para que los precios no caigan de golpe sobre quien acaba de comprar.' },
];

/** What each of the eight scales does in banking under the proposal. */
export const ESCALAS_BANCA: Record<string, { hace: string; detalle: string[] }> = {
  persona: {
    hace: 'Tiene una cuenta básica gratis y sabe a qué crédito tiene derecho: el de su primera y su segunda casa, con interés regulado.',
    detalle: ['Puede pedir consejo financiero gratuito en su municipio antes de firmar una hipoteca.', 'Declara cuántas viviendas tiene, también a través de empresas, al pedir un préstamo.'],
  },
  vecindad: {
    hace: 'La comunidad vecinal o la familia puede ahorrar junta y prestar ese ahorro, que es dinero que ya existe.',
    detalle: ['Por ejemplo, para arreglar el edificio o ayudar a un vecino a pagar la entrada de su casa.', 'No crea dinero: solo mueve el que sus miembros ya tienen.'],
  },
  municipio: {
    hace: 'Garantiza que haya atención en persona: una oficina, un cajero, un agente o un servicio móvil, sobre todo para las personas mayores.',
    detalle: ['Ofrece consejo financiero gratuito y ayuda con la banca por internet.', 'Avisa si un banco quiere cerrar el último punto de atención del pueblo.'],
  },
  provincia: {
    hace: 'Es la escala natural de los bancos locales: cajas y cooperativas que prestan a las empresas y familias de su comarca.',
    detalle: ['Como las 344 cajas de ahorro y las 647 cooperativas de crédito de Alemania, cada una en su territorio.', 'Prestan, sobre todo, a pequeñas empresas que producen.'],
  },
  region: {
    hace: 'Puede tener un banco público de desarrollo que preste a proyectos productivos de la región y a vivienda nueva.',
    detalle: ['Al estilo del ICO (el Instituto de Crédito Oficial), pero a escala regional.', 'Su crédito sigue las mismas reglas: producir sí, comprar lo que ya existe no.'],
  },
  nacion: {
    hace: 'Aprueba la ley de las reglas del crédito y el registro de cuántas viviendas tiene cada persona. El Banco de España vigila que se cumplan.',
    detalle: ['El Banco de España usa sus herramientas: límites a las hipotecas según el valor de la casa y el sueldo, y colchones de capital.', 'Fija cada año el interés máximo del crédito para la primera y la segunda vivienda.', 'Garantiza la cuenta básica gratuita y la atención en persona.'],
  },
  continente: {
    hace: 'El Banco Central Europeo decide la política monetaria del euro, y la Unión Europea, gran parte de las reglas de los bancos.',
    detalle: ['Para aplicar la regla en toda su fuerza, haría falta que la Unión la aceptara o la adoptara.', 'Mientras, cada país puede usar las herramientas que la ley europea ya le da.'],
  },
  planeta: {
    hace: 'Los acuerdos de Basilea fijan cuánto capital propio debe tener un banco en casi todo el mundo.',
    detalle: ['Que el crédito para comprar activos pidiera más capital que el crédito para producir haría la regla más fácil en todas partes.'],
  },
};
