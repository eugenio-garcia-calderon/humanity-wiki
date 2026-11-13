// The «europa» scale of the model: the European Union as the model's
// «continente» scale (Eugenio, 2026-11-13: «el gradiente de Europa»).
// Every figure carries its source; what is our own arithmetic says «estimación».
// Searched and checked on 2026-11-13.
//
// THE MODEL'S ESTIMATE FOR THIS SCALE. The continent receives one eighth of
// what the single tax collects. `cuentasPais('literal')` gives, for Spain,
// 1.516 € per person and scale (35,3 % of GDP collected in all). Two ways to
// carry that to the EU, both estimates:
//   · by population: 1.516 € × 452,0 M people ≈ 685.000 M€ a year;
//   · by income: 35,26 % / 8 = 4,41 % of the EU's GDP (18,8 billones €) ≈ 829.000 M€.
// The EU earns more per person than Spain, so the second is likely closer.
// Against today's 192.800 M€ budget (2026) that is 3,5 to 4,3 times more.
// Spain alone would send ≈ 74.500 M€ (`porEscala`), against 13.985,71 M€ gross in 2023 (Hacienda,
// «Relaciones financieras entre España y la UE 2024», the same source as escalas.ts `ueHacienda`).
// Per-area amounts below use the continent row of MATRIZ (same range).
import type { Ambito, FuenteAmbito } from './tipos';

const F = {
  poblacion: { url: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260710-3', titulo: 'Eurostat · La población de la UE siguió creciendo en 2025: 452,0 millones el 1-1-2026 (10-7-2026)' },
  hacienda: { url: 'https://www.fondoseuropeos.hacienda.gob.es/sitios/dgfc/es-ES/rpue/rfeue/Documents/RELACIONES%20FINANCIERAS%20ENTRE%20ESPA%C3%91A%20Y%20LA%20UE%202024%20PDF%20ACCESIBLE.pdf', titulo: 'Ministerio de Hacienda · Relaciones financieras entre España y la UE 2024: aportación bruta de España en 2023, 13.985,71 M€' },
  pib: { url: 'https://www.brusselstimes.com/2261095/eu-gdp-hits-e18-8-trillion-as-wealth-gaps-between-nations-persist', titulo: 'The Brussels Times, con datos de Eurostat («Key figures on Europe 2026») · El PIB de la UE en 2025: 18,8 billones de euros (6-8-2026)' },
  presupuesto2026: { url: 'https://www.consilium.europa.eu/en/infographics/2026-eu-budget-main-areas/', titulo: 'Consejo de la UE · Presupuesto de la UE para 2026 por grandes áreas' },
  pe2026: { url: 'https://www.europarl.europa.eu/news/en/press-room/20251120IPR31500/meps-adopt-2026-eu-budget-focus-on-competitiveness-research-and-security', titulo: 'Parlamento Europeo · El pleno aprueba el presupuesto de 2026 (20-11-2025)' },
  mfp: { url: 'https://www.consilium.europa.eu/es/policies/eu-long-term-budget/', titulo: 'Consejo de la UE · El presupuesto a largo plazo de la UE (2021-2027 y negociación de 2028-2034)' },
  mfp2028: { url: 'https://commission.europa.eu/topics/budget/eu-budget-2028-2034-explained_es', titulo: 'Comisión Europea · El presupuesto de la UE 2028-2034, explicado' },
  ingresos2023: { url: 'https://www.eldiario.es/economia/ue-recaudo-7-200-millones-euros-2023-nuevo-impuesto-envases-plastico_1_11655928.amp.html', titulo: 'elDiario.es, con datos del Tribunal de Cuentas Europeo · Ingresos de la UE en 2023 por recurso propio' },
  plastico: { url: 'https://commission.europa.eu/strategy-and-policy/eu-budget/long-term-eu-budget/2021-2027/revenue/own-resources/plastics-own-resource_es', titulo: 'Comisión Europea · El recurso propio basado en el plástico (0,80 € por kilo no reciclado)' },
  rnb: { url: 'https://epthinktank.eu/2025/02/10/future-of-eu-long-term-financing-post-2027-needs-and-how-to-finance-them/breakdown-of-current-own-resources', titulo: 'Servicio de Estudios del Parlamento Europeo · Reparto de los recursos propios actuales (2024)' },
  deuda: { url: 'https://www.eunews.it/en/2025/10/09/court-of-auditors-eu-in-debt-loans-will-impact-upcoming-multi-year-budgets/', titulo: 'Eunews, sobre el informe anual 2024 del Tribunal de Cuentas Europeo · La deuda de la UE y su coste (9-10-2025)' },
  euro: { url: 'https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr260101~c830245e42.en.html', titulo: 'Banco Central Europeo · Bulgaria entra en el euro: 21 países y 358 millones de personas (1-1-2026)' },
  bceTipos: { url: 'https://www.caixabankresearch.com/es/publicaciones/notas-breves-actualidad-economica-y-financiera/observatorio-bancos-centrales-122', titulo: 'CaixaBank Research · El BCE mantiene el tipo de depósito en el 2,50 % (29-10-2026)' },
  tfue123: { url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:12008E123', titulo: 'EUR-Lex · Tratado de Funcionamiento de la UE, artículo 123 (el BCE no puede prestar a los gobiernos)' },
  bancos: { url: 'https://www.bankingsupervision.europa.eu/framework/supervised-banks/html/index.ga.html', titulo: 'BCE, Supervisión Bancaria · Lista de bancos supervisados directamente (23-10-2026)' },
  unionBancaria: { url: 'https://www.europarl.europa.eu/erpl-app-public/factsheets/pdf/es/FTU_2.6.5.pdf', titulo: 'Parlamento Europeo · Ficha temática: la unión bancaria (abril de 2025)' },
  fmi: { url: 'https://www.imf.org/en/Publications/fandd/issues/2025/06/europes-integration-imperative-alfred-kammer', titulo: 'FMI, Finance & Development · «Europe’s Integration Imperative», Alfred Kammer (junio de 2025)' },
  euInc: { url: 'https://commission.europa.eu/news-and-media/news/eu-inc-making-business-easier-european-union-2026-03-18_es', titulo: 'Comisión Europea · EU Inc, un régimen único de empresa para toda la UE (18-3-2026)' },
  iva: { url: 'https://eur-lex.europa.eu/eli/dir/2006/112/oj/spa', titulo: 'EUR-Lex · Directiva 2006/112/CE, del sistema común del IVA' },
  subsidiariedad: { url: 'https://eur-lex.europa.eu/eli/treaty/teu_2016/art_5/oj/spa', titulo: 'EUR-Lex · Tratado de la Unión Europea, artículo 5: el principio de subsidiariedad' },
  cartera: { url: 'https://es.euronews.com/2026/09/16/solo-tres-paises-de-la-ue-cumplen-el-plazo-de-implantacion-de-la-cartera-digital-de-identi', titulo: 'Euronews · Solo tres países de la UE cumplen el plazo de la cartera digital de identidad (16-9-2026)' },
  eidas2: { url: 'https://eur-lex.europa.eu/eli/reg/2024/1183/oj/spa', titulo: 'EUR-Lex · Reglamento (UE) 2024/1183 (cartera europea de identidad digital)' },
  frontexCuerpo: { url: 'https://www.frontex.europa.eu/careers/standing-corps/about', titulo: 'Frontex · El cuerpo permanente: 10.000 personas en 2027' },
  frontex2026: { url: 'https://commission.europa.eu/news-and-media/news/reinforcing-frontex-stronger-protection-eus-external-borders-2026-10-27_es', titulo: 'Comisión Europea · Propuesta para reforzar Frontex hasta 30.000 agentes (27-10-2026)' },
  europol: { url: 'https://thenextweb.com/news/eu-strengthen-europol-cross-border-crime', titulo: 'The Next Web · La Comisión propone convertir Europol en una policía operativa (junio de 2026)' },
  eeds: { url: 'https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space-regulation-ehds_en', titulo: 'Comisión Europea · Reglamento del Espacio Europeo de Datos de Salud: calendario' },
  eedsEs: { url: 'https://www.sanidad.gob.es/areas/saludDigital/espacioEuropeoDS/home.htm', titulo: 'Ministerio de Sanidad · Espacio Europeo de Datos de Salud (Reglamento 2025/327)' },
  erasmus: { url: 'https://erasmus-plus.ec.europa.eu/whats-new/news/almost-15-million-people-went-on-an-erasmus-mobility-in-2024-according-to-latest-report', titulo: 'Comisión Europea · Casi 1,5 millones de personas hicieron un Erasmus+ en 2024 (14-11-2025)' },
  vivienda: { url: 'https://es.euronews.com/2025/12/17/ue-frenar-especulacion-aumentar-transparencia-mercado-vivienda', titulo: 'Euronews · El primer Plan Europeo de Vivienda Asequible (17-12-2025)' },
} satisfies Record<string, FuenteAmbito>;

export const AMBITO: Ambito | null = {
  id: 'europa',
  nombre: 'Unión Europea',
  escala: 'continente',
  quien: 'Las instituciones de la Unión Europea: el Parlamento Europeo, el Consejo de los gobiernos, la Comisión Europea y el Banco Central Europeo',
  resumen: [
    'Con el modelo, Europa sería la escala de lo que cruza fronteras: trenes y redes eléctricas entre países, ayuda a las regiones con menos medios, la defensa común, el Erasmus y la compra conjunta de vacunas. Lo cercano (escuelas, hospitales, policía de barrio) lo siguen haciendo los países, las regiones y los pueblos.',
    'Hoy la Unión vive sobre todo de lo que le pasan los gobiernos. Con el modelo recibiría directamente una octava parte del impuesto único, sin pasar por ningún gobierno.',
    'Estimación nuestra: con la misma recaudación por persona que el modelo calcula para España, Europa recibiría unos 685.000 millones de euros al año; con la misma proporción de lo que produce la economía europea, unos 829.000 millones. Son entre 3,5 y 4,3 veces el presupuesto de 2026. Solo España mandaría unos 74.500 millones al año, frente a los 13.986 millones que aportó en 2023 (aportación bruta, sin restar lo que recibe; Ministerio de Hacienda, «Relaciones financieras entre España y la UE 2024»). La Unión no es todo el continente: Noruega, Suiza o Reino Unido quedan fuera.',
    'Como todas las escalas, lo repartiría en tres tercios (producir, cuidar y libre), guardaría al menos una quinta parte del tercio libre en una caja de contingencias (unos 46.000 a 55.000 millones al año) y no podría endeudarse.',
    'Las prioridades las fijarían el Parlamento Europeo y asambleas ciudadanas europeas elegidas por sorteo, cada cinco años y revisadas cada año.',
  ],
  cifras: [
    { valor: '452,0 millones', texto: 'Personas que vivían en la Unión Europea el 1 de enero de 2026, en 27 países.', fuente: F.poblacion },
    { valor: '192.800 M€', texto: 'Presupuesto de la Unión para 2026 (compromisos de gasto): unos 427 € por habitante (cálculo nuestro).', fuente: F.presupuesto2026 },
    { valor: '342.000 M€', texto: 'Deuda que la Unión tenía pendiente al terminar 2024, sobre todo por el fondo de recuperación NextGenerationEU. El Tribunal de Cuentas Europeo espera que llegue a unos 567.000 M€ en 2027.', fuente: F.deuda },
    { valor: '21 países', texto: 'Usan el euro desde que entró Bulgaria el 1 de enero de 2026: 358 millones de personas.', fuente: F.euro },
  ],
  areas: {
    escalas: {
      hoy: 'Los tratados ya dicen que la Unión solo actúa cuando los países solos no pueden hacerlo bien (el «principio de subsidiariedad»). Pero se financia sobre todo con lo que le pasan los gobiernos, que negocian cada siete años cuánto ponen.',
      propuesta: [
        'Europa recibe su octava parte directamente del sistema de pago, sin que dependa de una negociación entre gobiernos.',
        'Hace solo lo que cruza fronteras: un tren de Madrid a París, una red eléctrica entre España y Francia, la compra conjunta de vacunas.',
        'Ayuda hacia abajo y hacia los lados: préstamos al IPC (sin intereses, solo ajustados a la subida de precios) a regiones y países, y donaciones puntuales en una catástrofe.',
      ],
      cifras: [
        { valor: 'Artículo 5', texto: 'Del Tratado de la Unión Europea: la Unión actúa solo si el objetivo se consigue mejor a escala europea.', fuente: F.subsidiariedad },
      ],
    },
    impuestos: {
      hoy: 'La Unión no cobra impuestos a las personas. Se financia con «recursos propios»: una aportación de cada país según su renta (la mayor parte), una parte del IVA, los aranceles de aduanas y, desde 2021, 0,80 € por cada kilo de envase de plástico que no se recicla.',
      propuesta: [
        'Todos los recursos propios de hoy se sustituyen por la octava parte del impuesto único, la misma en los 27 países.',
        'Hay un obstáculo legal: una directiva europea obliga a todos los países a tener IVA, con un tipo general de al menos el 15 %. España no puede quitar el IVA sola. Habría que cambiar esa directiva, y para eso hace falta la unanimidad de los 27.',
        'Los aranceles a lo que entra de fuera de Europa seguirían existiendo, porque son política comercial, no un impuesto a quien vive aquí.',
      ],
      cifras: [
        { valor: '61,5 %', texto: 'Parte de los recursos propios de la Unión que en 2024 vino de la aportación de cada país según su renta.', fuente: F.rnb },
        { valor: '7.200 M€', texto: 'Recaudó en 2023 el recurso del plástico no reciclado, un 4 % del presupuesto. Ese año los aranceles dieron 22.100 M€ y la parte del IVA, 22.500 M€.', fuente: F.ingresos2023 },
      ],
    },
    presupuestos: {
      hoy: 'El presupuesto de 2021 a 2027 es de unos 1,2 billones de euros, más 807.000 millones del fondo de recuperación. Para 2028-2034 la Comisión propone casi 2 billones (1,26 % de la renta de la Unión). Los gobiernos querían cerrar el acuerdo antes de que acabe 2026.',
      propuesta: [
        'El presupuesto deja de negociarse entre gobiernos cada siete años: llega solo, cada mes, con lo que se paga en toda Europa.',
        'Se reparte en tres tercios. Producir: redes eléctricas entre países, almacenamiento de energía, trenes, satélites. Cuidar: ayuda a las regiones con menos medios, vacunas, refugio. Libre: defensa común, Erasmus y el funcionamiento de las instituciones.',
        'Con el reparto por áreas del modelo, la Unión pondría un 14 % en apoyo y cohesión entre regiones, un 12 % en trenes y redes, un 12 % en defensa y un 9 % en el campo (estimación: entre 96.000 y 116.000 M€ al año para cohesión).',
      ],
      cifras: [
        { valor: '1,216 billones €', texto: 'Presupuesto a largo plazo de 2021 a 2027, más 807.000 M€ del fondo de recuperación NextGenerationEU.', fuente: F.mfp },
        { valor: '≈ 2 billones €', texto: 'Propuesta de la Comisión para 2028-2034, con cinco recursos propios nuevos (derechos de emisión de CO₂, ajuste en frontera por carbono, residuos electrónicos, tabaco y grandes empresas) que darían unos 58.500 M€ al año.', fuente: F.mfp2028 },
      ],
    },
    deuda: {
      hoy: 'Hasta 2020 la Unión casi no tenía deuda. Para salir de la pandemia pidió prestado en nombre de todos para el fondo NextGenerationEU. Lo devolverá desde 2028 hasta 2058, y los intereses han salido mucho más caros de lo previsto.',
      propuesta: [
        'Con el modelo, Europa no puede endeudarse, como ninguna escala. Una crisis como la pandemia se paga con la caja de contingencias, que se llena cada año con al menos una quinta parte del tercio libre.',
        'La deuda que ya existe se devuelve en sus plazos con el tercio libre, sin pedir prestado para devolverla.',
        'Los proyectos que dan un rendimiento (una interconexión eléctrica, un tren) los financian personas, cooperativas o bancos fuera del sistema público y se devuelven con lo que cobran.',
      ],
      cifras: [
        { valor: '4.200 M€', texto: 'Subida inesperada del coste de la deuda del fondo de recuperación en 2026: el doble de lo que calculó la Comisión.', fuente: F.pe2026 },
        { valor: '> 30.000 M€', texto: 'Intereses de esa deuda que podría pagar la Unión entre 2021 y 2027, según el Tribunal de Cuentas Europeo; la Comisión había previsto 14.900 M€.', fuente: F.deuda },
      ],
    },
    moneda: {
      hoy: 'El euro lo gestiona el Banco Central Europeo, que es independiente de los gobiernos. Su objetivo es que los precios suban un 2 % al año y no puede prestar dinero a los gobiernos. En octubre de 2026 mantuvo su tipo de interés de referencia en el 2,5 %.',
      propuesta: [
        'El euro sigue siendo la moneda común de Europa: la escala continental es la natural para una moneda.',
        'El Banco Central Europeo sigue defendiendo el 2 % y la prohibición de financiar a los gobiernos, que encaja con que ninguna escala se endeude.',
        'Queda abierta la gran pregunta del modelo: cómo nace el dinero nuevo y quién lo recibe. Europa sería la escala que tendría que decidirlo, por ejemplo con el euro digital que hoy se negocia.',
      ],
      cifras: [
        { valor: '2,5 %', texto: 'Tipo de interés al que el Banco Central Europeo paga los depósitos de los bancos (octubre de 2026). Su objetivo de inflación es el 2 %.', fuente: F.bceTipos },
        { valor: 'Artículo 123', texto: 'Del Tratado de Funcionamiento de la UE: el banco central no puede prestar a gobiernos ni comprarles deuda directamente.', fuente: F.tfue123 },
      ],
    },
    banca: {
      hoy: 'Desde 2014 el Banco Central Europeo vigila directamente a los bancos grandes de la zona euro (la «unión bancaria»). Hay también una autoridad común para cerrar bancos en quiebra. Falta el tercer pilar, un seguro común de depósitos: se propuso en 2015 y sigue sin acuerdo.',
      propuesta: [
        'La regla del modelo para la banca (dinero nuevo de los bancos solo para producir y para la primera y la segunda vivienda) se aplicaría en toda su fuerza a escala europea, porque las reglas de los bancos son europeas.',
        'Un seguro común de depósitos, pagado por los propios bancos, para que un ahorro en un banco español valga lo mismo que en uno alemán.',
        'Mientras Europa no lo adopte, cada país usa las herramientas que la ley europea ya le da, como los límites a las hipotecas según el sueldo.',
      ],
      cifras: [
        { valor: '109 bancos', texto: 'Vigilados directamente por el Banco Central Europeo (lista de octubre de 2026).', fuente: F.bancos },
        { valor: 'Desde 2015', texto: 'Está propuesto el seguro europeo de depósitos, el tercer pilar de la unión bancaria, sin que los países se hayan puesto de acuerdo.', fuente: F.unionBancaria },
      ],
    },
    legal: {
      hoy: 'La Unión hace dos tipos de normas. El «reglamento» vale igual en los 27 países desde el primer día. La «directiva» fija un objetivo y cada país lo pasa a su ley a su manera, así que la misma norma acaba escrita de 27 formas distintas.',
      propuesta: [
        'Para lo que cruza fronteras, reglamentos en vez de directivas: un solo texto para todos, como ya pasa con los límites de calidad del aire.',
        'Un ejemplo ya en marcha: la Comisión propone una forma única de empresa para toda la Unión, que se crea en 48 horas, por menos de 100 € y sin capital mínimo.',
        'Cada norma nueva, con una vieja que desaparece, y las escalas pequeñas solo ajustan dentro de márgenes.',
      ],
      cifras: [
        { valor: '44 % y 110 %', texto: 'Lo que encarecen las barreras entre países europeos, según el Fondo Monetario Internacional: como un arancel del 44 % a los productos fabricados y del 110 % a los servicios.', fuente: F.fmi },
        { valor: '48 horas', texto: 'Para crear una empresa con la propuesta «EU Inc», por menos de 100 € y sin capital mínimo (marzo de 2026; aún no aprobada).', fuente: F.euInc },
      ],
    },
    digital: {
      hoy: 'Una ley europea de 2024 obliga a cada país a ofrecer, antes de que acabe 2026, una cartera digital gratuita en el móvil para identificarse, guardar documentos y firmar en toda la Unión. La mayoría de los países no llega a tiempo.',
      propuesta: [
        'Europa garantiza que la firma con el móvil valga igual en los 27 países: abrir una cuenta en Lisboa con el DNI español, sin certificados ni programas que instalar.',
        'Pone las normas técnicas comunes y comprueba que se cumplen. Cada país da la aplicación.',
        'Quien no tiene móvil puede identificarse por teléfono o en persona en su municipio.',
      ],
      cifras: [
        { valor: 'Solo 3', texto: 'Países de la Unión que cumplían en septiembre de 2026 el plazo de la cartera digital. Las empresas deberán aceptarla a finales de 2027.', fuente: F.cartera },
        { valor: '2024/1183', texto: 'Reglamento que crea la cartera europea de identidad digital.', fuente: F.eidas2 },
      ],
    },
    seguridad: {
      hoy: 'Frontex, la agencia europea de fronteras, tendrá en 2027 un cuerpo permanente de 10.000 personas (3.000 suyas y 7.000 enviadas por los países), y en octubre de 2026 la Comisión propuso llegar a 30.000. Europol, la agencia europea de policía, ayuda a las policías de cada país en delitos que cruzan fronteras; las detenciones las hacen ellas.',
      propuesta: [
        'La sección europea del cuerpo único de «guardianes» del modelo: fronteras comunes, salvamento en el mar y delitos que cruzan fronteras, con la misma formación y la misma escala de sueldos.',
        'Con el reparto del modelo (5 % a seguridad), entre 34.000 y 41.000 M€ al año; con el 12 % de defensa común, otros 82.000 a 99.000 M€ (estimación). Hoy el presupuesto de 2026 dedica 5.000 M€ a migración y fronteras.',
        'Salvar vidas en el mar es una obligación de esta escala, no de la buena voluntad de cada país.',
      ],
      cifras: [
        { valor: '30.000', texto: 'Agentes de fronteras que propone la Comisión para Frontex (27 de octubre de 2026), tres veces el objetivo actual de 10.000 para 2027.', fuente: F.frontex2026 },
        { valor: '5.020 M€', texto: 'Para migración y gestión de fronteras en el presupuesto de 2026 (compromisos).', fuente: F.presupuesto2026 },
      ],
    },
    justicia: {
      hoy: 'Hay tribunales europeos que vigilan que se cumpla la ley de la Unión, una fiscalía europea para el fraude con dinero europeo y una orden de detención que vale en todos los países.',
      propuesta: [
        'Europa juzga lo que cruza fronteras: el fraude con dinero común, las grandes redes de delincuencia y los derechos de las personas frente a los países.',
        'Lo demás lo juzgan las escalas más cercanas, con juzgados de proximidad.',
      ],
    },
    sanidad: {
      hoy: 'La sanidad la llevan los países y las regiones. La Unión compra vacunas en común, aprueba medicamentos con su agencia y en 2025 aprobó el Espacio Europeo de Datos de Salud para que el historial médico se pueda leer en otro país.',
      propuesta: [
        'Que el expediente único de salud de cada persona se lea en toda Europa: si alguien de Talamanca se pone enfermo en Oporto, el médico ve su historial y su receta.',
        'Europa compra en común vacunas y medicamentos caros, y prepara las reservas para la próxima pandemia.',
        'Con el reparto del modelo (6 % a salud), entre 41.000 y 50.000 M€ al año (estimación).',
      ],
      cifras: [
        { valor: 'Marzo de 2029', texto: 'Desde entonces el resumen de salud de cada paciente y la receta electrónica deberán poder leerse en todos los países. Imágenes, análisis e informes de alta, en 2031.', fuente: F.eeds },
        { valor: '2025/327', texto: 'Reglamento del Espacio Europeo de Datos de Salud, en vigor desde marzo de 2025.', fuente: F.eedsEs },
      ],
    },
    educacion: {
      hoy: 'La educación la llevan los países y las regiones. La Unión paga el Erasmus+, para estudiar, formarse o enseñar en otro país, y ayuda a que los títulos se reconozcan entre países.',
      propuesta: [
        'Erasmus para todas las edades, no solo para universitarios: también para un aprendiz de carpintería o una persona mayor que quiere aprender un idioma.',
        'La «mochila educativa» del modelo, el dinero que cada persona tiene para aprender, se puede usar estudiando en otro país de Europa.',
        'Con el reparto del modelo (8 % a educación), entre 55.000 y 66.000 M€ al año (estimación): más de diez veces el Erasmus+ de hoy.',
      ],
      cifras: [
        { valor: '1,5 millones', texto: 'Personas que hicieron una estancia Erasmus+ en 2024. El programa tuvo 4.700 M€ ese año.', fuente: F.erasmus },
      ],
    },
    vivienda: {
      hoy: 'La Unión no tiene competencia en vivienda. En diciembre de 2025 presentó su primer Plan Europeo de Vivienda Asequible: más margen para que los gobiernos ayuden a la vivienda social, una ley sobre pisos turísticos y más dinero europeo.',
      propuesta: [
        'Europa presta al IPC a los parques públicos de vivienda de regiones y municipios, y comprueba que lo prestado se usa en vivienda que no se vende.',
        'Unos mínimos comunes de vivienda digna y eficiente, y un registro europeo de pisos turísticos.',
        'Con el reparto del modelo (3 % a vivienda), entre 21.000 y 25.000 M€ al año (estimación), cada año, para prestar.',
      ],
      cifras: [
        { valor: '11.500 M€', texto: 'Que el plan saca del presupuesto europeo para vivienda, más los 43.000 M€ ya comprometidos para vivienda social, asequible y sostenible.', fuente: F.vivienda },
        { valor: '+60 %', texto: 'Lo que ha subido el precio de la vivienda en la Unión desde 2013; los alquileres, cerca de un 20 %.', fuente: F.vivienda },
      ],
    },
  },
  revisado: '2026-11-13',
};
