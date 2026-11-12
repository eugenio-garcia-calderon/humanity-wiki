// «Otras propuestas» for the «deuda» window. Camps checked on 2026-11-12,
// during the campaign for the general election of 29 November 2026. The
// regional debt write-off (83.252 M€, in Congress since December 2025) is
// where the four camps' positions on debt are most concrete. Every card says
// when its proposals were published (`cuando`). No 2025-2026 proposal from the
// left on fiscal rules was found, so its 2018 bill stays, marked as such.
import type { Espectro } from './tipos';
import { RESERVA_MIN_LIBRE } from '../modeloSocioeconomico';

export const ESPECTRO: Espectro | null = {
  tema: 'la deuda pública',
  modelo: [
    'Ninguna administración puede pedir prestado: ninguna escala tiene deuda.',
    'Los proyectos que dan un servicio o un ahorro los financian personas, cooperativas o bancos fuera del sistema público, y si salen mal pierde quien prestó.',
    `Las crisis se pagan con una caja de contingencias, llena con al menos un ${Math.round(RESERVA_MIN_LIBRE * 100)} % del tercio libre de cada escala, que nunca baja de cero.`,
    'Una escala puede ayudar a otra con lo ahorrado: donaciones o préstamos sin intereses, solo ajustados a la subida de los precios.',
    'La deuda heredada se paga a su vencimiento y no se renueva.',
  ],
  limites: [
    'Falta decidir de dónde sale, durante la transición, el dinero para pagar la deuda heredada.',
    'Llenar la caja hasta poder pagar una crisis como la de la pandemia llevaría muchos años.',
    'Lo que no da retorno, como una carretera o un hospital, solo se construye cuando ya está ahorrado, y eso puede retrasarlo.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar e Izquierda Unida (hoy en el Frente Amplio)',
      cuando: 'Alegaciones de Sumar a la ley del perdón de deuda autonómica, septiembre de 2025, y proyecto de ley de Izquierda Unida de 2018',
      idea: 'Que pagar la deuda no vaya por delante de la sanidad y la educación.',
      propone: [
        'Que el perdón de deuda a las comunidades exija que no bajen los impuestos de sucesiones y patrimonio (Sumar, 2025).',
        'Que el Estado asuma además 7.000 millones de la Comunitat Valenciana por la dana, las inundaciones de octubre de 2024 (Sumar, 2025).',
        'Reestructurar la deuda que quede a las comunidades más endeudadas (Sumar, 2025).',
        'Cambiar la ley para que los servicios públicos vayan antes que los intereses de la deuda, y quitar la regla de gasto (Izquierda Unida, 2018).',
      ],
      argumento: 'Dicen que la reforma de 2011 del artículo 135 de la Constitución puso la deuda por delante de todo y trajo recortes en sanidad y educación.',
      critica: 'Sus críticos dicen que relajar las reglas sube la deuda y los intereses, y choca con las reglas fiscales europeas.',
      fuentes: [
        { url: 'https://www.vozpopuli.com/espana/sumar-exige-a-sanchez-condicionar-la-quita-de-deuda-a-que-las-ccaa-no-bajen-impuestos.html', titulo: 'Vozpópuli · Sumar exige condicionar la quita de deuda (1-9-2025)' },
        { url: 'https://www.publico.es/politica/iu-propone-modificar-constitucion-priorice-gasto-social-pago-deuda.html', titulo: 'Público · IU propone que se priorice el gasto social sobre el pago de la deuda (7-3-2018)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Ley del perdón de deuda autonómica (aprobada por el Gobierno en 2025, en el Congreso en 2026) y plan fiscal de 2024',
      idea: 'Bajar la deuda poco a poco, sin recortes, y aliviar la de las comunidades.',
      propone: [
        'Que el Estado asuma 83.252 millones de deuda de las comunidades autónomas, con un ahorro de unos 6.700 millones en intereses.',
        'Que ese alivio libere dinero para sanidad, educación y vivienda.',
        'Reducir el déficit y la deuda de forma gradual, con un plan fiscal de 2025 a 2028 acordado con la Unión Europea.',
      ],
      argumento: 'Dicen que el perdón de deuda corrige desequilibrios que las comunidades arrastran desde hace más de una década, con criterios iguales para todas, y que el déficit es el mejor en 18 años.',
      critica: 'Se le reprocha que la deuda no desaparece, sino que pasa al Estado y la pagan todos, y que pactó ese perdón con Esquerra Republicana para seguir gobernando.',
      fuentes: [
        { url: 'https://es.euronews.com/2025/09/02/el-gobierno-aprueba-la-condonacion-de-83252-millones-de-deuda-autonomica', titulo: 'Euronews · El Gobierno aprueba la condonación de 83.252 millones de deuda autonómica (2-9-2025)' },
        { url: 'https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/el-congreso-reactiva-la-ley-para-condonar-deuda-a-las-comunidades-autonomas-tras-casi-un-ano-guardada-en-un-cajon-2026-09-29/', titulo: 'Legal Today · El Congreso reactiva la ley para condonar deuda a las comunidades (29-9-2026)' },
        { url: 'https://www.hacienda.gob.es/CDI/Estabilidad%20Presupuestaria/PlanFiscalEstructural/Plan-FiscalEstructural-2025-2028.pdf', titulo: 'Ministerio de Hacienda · Plan fiscal y estructural de medio plazo 2025-2028 (octubre de 2024)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026, y voto en el Congreso de julio de 2026',
      idea: 'Que cada comunidad responda de su deuda y bajar la del país gastando mejor.',
      propone: [
        'Objetivos de reducción de la deuda para cada año, conforme a las reglas europeas, y bajar el déficit estructural.',
        'Más poderes para la Autoridad Fiscal independiente (AIReF) sobre el gasto y la deuda de todas las administraciones.',
        'Reestructurar la deuda de las comunidades con las mismas reglas para todas y retirar poco a poco los préstamos de rescate del Estado.',
        'Rechazar el perdón de deuda autonómica del Gobierno (votó en contra en julio de 2026).',
      ],
      argumento: 'Dicen que perdonar deuda premia a quien más se endeudó, va contra la responsabilidad fiscal y es injusto con los demás.',
      critica: 'Sus críticos dicen que no pone cifras a la bajada de la deuda, y el Gobierno le reprocha rechazar un perdón que beneficia sobre todo a comunidades que gobierna el PP.',
      fuentes: [
        { url: 'https://www.democrata.es/uploads/s1/35/09/79/8/la-reconstruccion-nacional.pdf', titulo: 'PP · La reconstrucción nacional, programa electoral 29N (10-11-2026), medidas 4, 102 y 107' },
        { url: 'https://es.ara.cat/economia/cuentas-publicas/perdon-deuda-autonomias-esquiva-veto-vox-pp-congreso_1_5807235.html', titulo: 'Ara · El perdón de la deuda a las autonomías esquiva el veto de Vox y el PP (23-7-2026)' },
        { url: 'https://es.euronews.com/2025/09/02/el-gobierno-aprueba-la-condonacion-de-83252-millones-de-deuda-autonomica', titulo: 'Euronews · El Gobierno aprueba la condonación de 83.252 millones de deuda autonómica (2-9-2025)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Votos y debates en el Congreso de noviembre de 2025 y julio de 2026, y propuestas de campaña de octubre de 2026',
      idea: 'Frenar la deuda recortando gasto, sin perdones a las comunidades.',
      propone: [
        'Rechazar el perdón de deuda autonómica (votó en contra en julio de 2026).',
        'Que el gasto no crezca más que la economía: votó contra el límite de gasto de 2026 por esa razón (2025).',
        'Pasar las pensiones a un sistema mixto, que vincula con frenar la deuda (2026).',
      ],
      nota: 'No hemos encontrado objetivos concretos de reducción de la deuda en sus textos publicados para el 29-N.',
      argumento: 'Dicen que la deuda es uno de los mayores problemas de las cuentas públicas y que perdonarla premia a las comunidades que han gastado de forma irresponsable.',
      critica: 'Sus críticos dicen que bajar los ingresos decenas de miles de millones al año, sin recortes cuantificados, subiría la deuda que dice querer frenar.',
      fuentes: [
        { url: 'https://es.ara.cat/economia/cuentas-publicas/perdon-deuda-autonomias-esquiva-veto-vox-pp-congreso_1_5807235.html', titulo: 'Ara · El perdón de la deuda a las autonomías esquiva el veto de Vox y el PP (23-7-2026)' },
        { url: 'https://forbes.es/economia/835512/pp-vox-y-junts-confirman-que-tumbaran-en-el-congreso-la-senda-de-deficit-del-gobierno/', titulo: 'Forbes · PP, Vox y Junts tumbarán la senda de déficit del Gobierno (27-11-2025)' },
        { url: 'https://www.democrata.es/elecciones-generales-espana/vox-lleva-29n-su-receta-economica-con-rebajas-fiscales-recorte-gasto-reforma-pensiones/', titulo: 'Demócrata · Vox lleva al 29N su receta económica (7-10-2026)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};
