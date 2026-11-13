// The «madrid» scale of the model: the Comunidad de Madrid, the model's «region»
// (Eugenio, 2026-11-13). Figures checked on 2026-11-13; each carries its source.
// What the region would receive is computed from `cuentasPais('literal')`, so it
// follows the model if a rate changes; it is an estimate and the text says so.
import type { Ambito, FuenteAmbito } from './tipos';
import { cuentasPais, euros, MATRIZ, millones, numero, RESERVA_MIN_LIBRE } from '../modeloSocioeconomico';

// ── SOURCES ─────────────────────────────────────────────────────────────────
const F: Record<string, FuenteAmbito> = {
  madridEconomia: { url: 'https://observatorioeconomico.madrid.es/wp-content/uploads/2026/07/Madrid-Economia-2026.pdf', titulo: 'Ayuntamiento de Madrid · Madrid Economía 2026 (población de la región según el INE y PIB regional de 2024)' },
  presupuesto: { url: 'https://www.comunidad.madrid/file/497589/download', titulo: 'Comunidad de Madrid · Presupuestos Generales 2026' },
  deuda: { url: 'https://www.comunidad.madrid/inversion-empresa/ratings-estructura-deuda', titulo: 'Comunidad de Madrid · Ratings y estructura de la deuda (datos del Banco de España, junio de 2026)' },
  deudaBde: { url: 'https://www.bde.es/wbe/es/noticias-eventos/actualidad-banco-espana/deuda-aapp-2026t2.html', titulo: 'Banco de España · Deuda de las administraciones públicas, segundo trimestre de 2026' },
  sucesiones: { url: 'https://www.comunidad.madrid/docs/2026-02/cte-11-25-s.pdf', titulo: 'Comunidad de Madrid · Consulta tributaria CTE 11-25: bonificaciones en el impuesto de sucesiones (Ley 2/2025)' },
  listas: { url: 'https://www.sanidad.gob.es/estadEstudios/estadisticas/inforRecopilaciones/docs/LISTAS%5FPUBLICACION%5FDic%5F2025.pdf', titulo: 'Ministerio de Sanidad · Listas de espera por comunidad autónoma, diciembre de 2025' },
  gastoSanitario: { url: 'https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6908', titulo: 'Ministerio de Sanidad · Gasto sanitario público 2024, por comunidad (mayo de 2026)' },
  esicam: { url: 'https://www.comunidad.madrid/node/60074', titulo: 'Comunidad de Madrid · ESICAM179, el modelo regional de seguridad y policía local que sustituye a las BESCAM (2021)' },
  planVive: { url: 'https://www.comunidad.madrid/notas-prensa/2025/11/17/comunidad-madrid-alcanza-5175-viviendas-entregadas-plan-vive-incorporar-dos-nuevas-promociones-mostoles', titulo: 'Comunidad de Madrid · El Plan Vive alcanza 5.175 viviendas entregadas (17-11-2025)' },
  modelo: { url: 'https://humanity.wiki/modelo-socioeconomico', titulo: 'humanity.wiki · Modelo de optimización socioeconómica (cálculo propio, lectura literal)' },
};

// ── FIGURES ─────────────────────────────────────────────────────────────────
/** Residents at 1-1-2025, INE (as published in Madrid Economía 2026). */
const POBLACION = 7_113_886;
/** Non-financial budget 2026, M€ (cam-presupuesto); health and education lines from the same document. */
const PRESUPUESTO_2026 = 30_663.6;
const SANIDAD_2026 = 11_009.5;
const EDUCACION_2026 = 6_959;
const INTERESES_2026 = 1_251.2;
const AMORTIZACION_2026 = 2_552;
/** Outstanding debt at 30-6-2026, M€, and % of regional GDP (Banco de España). */
const DEUDA_2026 = 42_296;
const DEUDA_PCT = 12.3;
/** Regional GDP 2024, M€. */
const PIB_2024 = 316_193.4;

// What the model gives this region: one eighth of the collection, per resident (estimate).
const pais = cuentasPais('literal');
const porHabitante = pais.porPersonaEscala;
const RECIBE = (porHabitante * POBLACION) / 1e6; // M€ a year, the region's eighth
const TERCIO = RECIBE / 3;
const CAJA = TERCIO * RESERVA_MIN_LIBRE;
const ANOS_DEUDA = DEUDA_2026 / AMORTIZACION_2026;
/** Share of today's spending the eighth would cover (estimate). */
const FRACCION_HOY = RECIBE / PRESUPUESTO_2026;
/** Health weights in MATRIZ: region 24 % (hospitals, specialists, mental health, dependency), nation 18 % (medicines, vaccines, transplants). */
const SALUD_REGION = (MATRIZ.region.salud.peso ?? 0) / 100;
const SALUD_NACION = (MATRIZ.nacion.salud.peso ?? 0) / 100;
const SALUD_PROVINCIA = (MATRIZ.provincia.salud.peso ?? 0) / 100;

export const AMBITO: Ambito | null = {
  id: 'madrid',
  nombre: 'Comunidad de Madrid',
  escala: 'region',
  quien: 'Gobierno de la Comunidad de Madrid y su Asamblea',
  resumen: [
    'La Comunidad de Madrid es la escala «región» del modelo: le tocan los hospitales, las universidades y el profesorado, el transporte regional y la vivienda pública. No le tocan las pensiones, la defensa ni la ley común: eso es de la nación.',
    `Con el modelo recibiría su octavo del impuesto único: unos ${euros(porHabitante)} al año por habitante, es decir, unos ${millones(RECIBE)} al año (estimación de esta página, no cifra oficial). Es más o menos un tercio de lo que gasta hoy, ${millones(PRESUPUESTO_2026)}: solo la sanidad le cuesta hoy ${millones(SANIDAD_2026)}, más que todo su octavo.`,
    'Por eso la región haría menos cosas que hoy. Los medicamentos, las vacunas, los trasplantes y la alta especialización los pagaría la nación; los centros de salud y las urgencias, la provincia; el consultorio, el municipio. A la región le quedarían los hospitales, los especialistas, la salud mental y la dependencia.',
    `Madrid tiene una sola provincia, así que la región y la provincia ocupan el mismo territorio. Si las dos escalas se mantienen, la provincia recibiría otro octavo igual (unos ${millones(RECIBE)}), que se podría repartir entre comarcas como la Sierra Norte.`,
    'Una asamblea ciudadana de 150 personas por sorteo fija cada año las prioridades. Reparte lo recibido en tres tercios: producir, cuidar y libre. No puede pedir prestado: lo que no tiene, no lo gasta.',
  ],
  cifras: [
    { valor: numero(POBLACION), texto: 'habitantes a 1 de enero de 2025 (INE). La ciudad de Madrid es casi la mitad.', fuente: F.madridEconomia },
    { valor: millones(PRESUPUESTO_2026), texto: 'presupuesto de 2026, sin contar la deuda que devuelve. Sanidad y educación son casi seis de cada diez euros.', fuente: F.presupuesto },
    { valor: millones(DEUDA_2026), texto: `de deuda en junio de 2026: el ${numero(DEUDA_PCT, 1)} % de lo que produce la región en un año, de las más bajas de España.`, fuente: F.deuda },
    { valor: millones(PIB_2024), texto: 'produjo la región en 2024 (su PIB), casi una quinta parte de toda España.', fuente: F.madridEconomia },
  ],
  areas: {
    escalas: {
      hoy: 'Hoy la Comunidad es a la vez región y provincia: no tiene diputación. Por debajo hay 179 municipios, desde la capital hasta pueblos de pocos cientos de vecinos.',
      propuesta: [
        'La asamblea regional, de 150 personas por sorteo renovadas cada año, fija prioridades; la ciudadanía las ratifica en una votación digital.',
        'Un comité técnico elegido por concurso las ejecuta, con todas las cuentas abiertas.',
        'Hay que decidir qué pasa con el octavo de la provincia: una opción es repartirlo entre comarcas (Sierra Norte, Henares, Sur…), que darían a los pueblos pequeños lo que solos no pueden sostener.',
      ],
    },
    impuestos: {
      hoy: 'Hoy cobra su parte del IRPF con su propia escala, bonifica al 100 % el impuesto sobre el patrimonio y casi entero el de sucesiones entre familiares cercanos. El Estado creó en 2022 un impuesto a las grandes fortunas que grava los patrimonios de más de 3 millones de euros también en las comunidades que bonifican el de patrimonio.',
      propuesta: [
        'Con el modelo no hay impuestos propios de la región: hay un solo impuesto, que cobra el sistema de pago, y la región recibe su octavo.',
        'Se acaba la competencia entre comunidades a base de rebajar impuestos, y también las declaraciones distintas en cada región.',
        'La región ya no decide cuánto se paga: decide en qué se gasta lo que recibe.',
      ],
      cifras: [
        { valor: '99 %', texto: 'de bonificación en sucesiones entre padres, hijos y cónyuges. Para hermanos, tíos y sobrinos, el 50 % desde julio de 2025.', fuente: F.sucesiones },
      ],
    },
    presupuestos: {
      hoy: `En 2026 gasta ${millones(PRESUPUESTO_2026)}: ${millones(SANIDAD_2026)} en sanidad, ${millones(EDUCACION_2026)} en educación y universidades, y ${millones(INTERESES_2026)} solo en intereses de la deuda.`,
      propuesta: [
        `Con el modelo recibiría unos ${millones(RECIBE)} al año (estimación). Un tercio, unos ${millones(TERCIO)}, iría a producir: renovables, trenes, equipos de hospital y vivienda pública.`,
        'Otro tercio iría a cuidar: hospitales, dependencia y préstamos al IPC a los municipios (préstamos sin intereses, solo ajustados a la subida de los precios).',
        `El tercio libre pagaría universidades, cultura y emergencias, y al menos ${millones(CAJA)} al año irían a la caja de contingencias.`,
      ],
      cifras: [
        { valor: `${numero(FRACCION_HOY * 100)} %`, texto: `de lo que gasta hoy cubriría su octavo (${millones(RECIBE)} frente a ${millones(PRESUPUESTO_2026)}). Cálculo propio.`, fuente: F.modelo },
        { valor: millones(RECIBE), texto: `al año con el modelo: ${euros(porHabitante)} por habitante. Estimación de esta página, no cifra oficial.`, fuente: F.modelo },
      ],
    },
    deuda: {
      hoy: `Debe ${millones(DEUDA_2026)} (junio de 2026). En 2026 devuelve ${millones(AMORTIZACION_2026)} de préstamos y bonos y paga ${millones(INTERESES_2026)} de intereses, pero vuelve a pedir prestado para devolver.`,
      propuesta: [
        'Con el modelo la región no puede pedir prestado más. La deuda que ya existe se devuelve según vence, sin renovarla.',
        `Al ritmo de vencimientos de 2026, eso llevaría unos ${numero(ANOS_DEUDA)} años (cálculo propio).`,
        'Si llega una emergencia, la paga la caja de contingencias, que nunca baja de cero.',
      ],
      cifras: [
        { valor: `${numero(DEUDA_PCT, 1)} %`, texto: 'de su PIB en deuda, por debajo del límite legal del 13 %. La media de las comunidades es el 20,4 %.', fuente: F.deudaBde },
      ],
    },
    banca: {
      hoy: 'Hoy la Comunidad no tiene un banco propio. Ayuda a empresas con avales y préstamos a través de Avalmadrid, una sociedad de avales en la que participa.',
      propuesta: [
        'Podría tener un banco público de desarrollo regional, al estilo del Instituto de Crédito Oficial pero en pequeño.',
        'Prestaría solo para producir y para vivienda nueva, nunca para comprar lo que ya existe.',
        'Ejemplo: financiar una cooperativa de placas solares en un polígono de Getafe.',
      ],
    },
    pensiones: {
      hoy: 'Las pensiones las paga la Seguridad Social, no la Comunidad. La Comunidad gestiona las pensiones no contributivas, la renta mínima y la dependencia.',
      propuesta: [
        'La región no paga pensiones. Con su tercio de cuidados sostiene la dependencia y las residencias.',
        'Presta «al IPC» (sin intereses, solo ajustado a la subida de los precios) a los municipios que quieran abrir un centro de día y no tengan ahorros.',
        'El apoyo constante a personas con discapacidad, en especie siempre que se pueda, lo comparte con la nación.',
      ],
    },
    vivienda: {
      hoy: 'Regula el suelo con su propia ley (Ley 9/2001 del Suelo) y tiene un plan de alquiler asequible, el Plan Vive, en suelo público.',
      propuesta: [
        'Una agencia regional de vivienda, con cuentas abiertas, publica cada trimestre el precio de referencia del alquiler por barrio.',
        'Cada año publica el valor del suelo rústico de cada comarca, para que nadie se haga rico solo porque el campo pase a ser urbanizable.',
        'Lo que gana el suelo al recalificarse va a vivienda pública. Ejemplo: préstamos al IPC a Talamanca de Jarama para rehabilitar casas vacías.',
      ],
      cifras: [
        { valor: '5.175', texto: 'viviendas entregadas del Plan Vive hasta noviembre de 2025.', fuente: F.planVive },
      ],
    },
    seguridad: {
      hoy: 'Madrid no tiene policía autonómica propia. Paga parte de las policías locales: primero con las BESCAM y, desde 2021, con ESICAM179. También tiene el 112 y sus bomberos.',
      propuesta: [
        'Con el modelo hay un solo cuerpo de «guardianes» en todo el país. La región tiene su sección regional.',
        'Esa sección lleva las unidades especializadas (delitos graves, ciberdelito, policía científica), la sede regional de la academia y la sala del 112.',
        'El dinero que hoy reparte ESICAM pasa a ser parte de ese cuerpo único, con un solo sueldo por puesto.',
      ],
      cifras: [
        { valor: '110', texto: 'ayuntamientos en ESICAM179 en 2021, con más de 74 millones de euros ese año para sus policías locales.', fuente: F.esicam },
      ],
    },
    justicia: {
      hoy: 'Desde 2003 la Comunidad pone los medios de los juzgados en su territorio: edificios, funcionarios y ordenadores. Los jueces y las leyes son del Estado.',
      propuesta: [
        'Un mismo expediente digital para policía, juzgado y fiscalía en toda la región.',
        'Juzgados de proximidad donde están los guardianes, para poder declarar en la misma comisaría.',
        'Juicios a distancia cuando se pueda, para que nadie cruce la región para cinco minutos de vista.',
      ],
    },
    sanidad: {
      hoy: `Gestiona toda la sanidad pública de la región: ${millones(SANIDAD_2026)} en 2026. Tiene las esperas quirúrgicas más cortas de España, pero gasta menos por habitante que la media.`,
      propuesta: [
        `La salud es lo que más pesa en la región: el ${numero(SALUD_REGION * 100)} % de lo que recibe, unos ${millones(RECIBE * SALUD_REGION)} al año (estimación). Hoy gasta ${millones(SANIDAD_2026)}: el modelo no lo cubre todo desde la región.`,
        `El resto se reparte entre escalas: la nación paga medicamentos, vacunas, trasplantes y alta especialización (el ${numero(SALUD_NACION * 100)} % de su octavo); la provincia, que en Madrid es el mismo territorio, los centros de salud y las urgencias (el ${numero(SALUD_PROVINCIA * 100)} %); el municipio, el consultorio.`,
        'A la región le quedan los hospitales, los especialistas, la salud mental y la dependencia, y la lista única de espera, de cuyos plazos responde.',
        'Un solo expediente por persona, que se lee igual en la pública, en la privada y en cualquier otra comunidad.',
      ],
      cifras: [
        { valor: '50 días', texto: 'de espera media para operarse en diciembre de 2025, la menor de España. Para ver al especialista, 68 días.', fuente: F.listas },
        { valor: '1.779 €', texto: 'de gasto sanitario público por habitante en 2024, frente a 2.084 € de media en España.', fuente: F.gastoSanitario },
      ],
    },
    educacion: {
      hoy: `Paga los colegios públicos y concertados, el profesorado y seis universidades públicas: ${millones(EDUCACION_2026)} en 2026.`,
      propuesta: [
        'La región pone el dinero de la «mochila educativa», que sigue a cada alumno hasta los 25 años a la escuela que elija.',
        'Forma y paga al profesorado, sostiene las universidades y hace la inspección.',
        'Un solo informe por escuela, hecho con datos abiertos, en vez de tres casi iguales.',
      ],
    },
    legal: {
      hoy: 'Su Asamblea hace leyes propias en sus temas: suelo, sanidad, educación, comercio, caza. Cada comunidad tiene las suyas, a menudo distintas para lo mismo.',
      propuesta: [
        'Una sola norma básica para todo el país. La región solo la ajusta dentro de márgenes, por clima o geografía.',
        'Ejemplo: la misma licencia de caza en toda España; Madrid solo mueve unas semanas la temporada según sus especies.',
        'Ordena el territorio grande: dónde van los corredores verdes, los polígonos y las grandes redes.',
      ],
    },
    digital: {
      hoy: 'Tiene su propia sede electrónica y su propia agencia digital, Madrid Digital. Muchos trámites piden certificado o programas que hay que instalar.',
      propuesta: [
        'Usa la misma firma con el móvil que el resto del país: sin certificados ni programas propios.',
        'Una línea de teléfono para quien no tiene móvil.',
        'Los datos de la región (esperas, gasto, contratos) se publican abiertos, para que la asamblea decida con ellos.',
      ],
    },
  },
  revisado: '2026-11-13',
};
