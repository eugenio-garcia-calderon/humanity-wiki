// The «talamanca» scale of the model: one municipality of the Comunidad de
// Madrid, Talamanca de Jarama (ESCALAS id 'municipio'), with what its
// neighbourhoods (the 'vecindad' scale) would do. Written 2026-11-13.
//
// Model figures come from cuentasPais('literal') in modeloSocioeconomico.ts:
// 1.516 € per person and scale × 4.607 residents ≈ 6,98 M€ a year. Every such
// figure is marked as an estimate. Area amounts use the orientative weights of
// MATRIZ.municipio (vivienda 10 %, educación 9 %, salud 8 %…).
//
// Not verified in a primary source (said so in the text): the official
// outstanding debt (shown as «lo que aún debe») from Hacienda — its 2024 report could not be
// read past the provinces before Madrid —, the 2025 budget figures (only the
// initial approval notice was found), the name of the public school and the
// health centre of reference, and current housing figures.
import type { Ambito, FuenteAmbito } from './tipos';

const F = {
  ine: { url: 'https://www.ine.es/jaxiT3/Tabla.htm?t=2881', titulo: 'INE · Cifras oficiales de población de los municipios de Madrid, 1 de enero de 2025' },
  presupuesto2024: { url: 'https://www.bocm.es/boletin/CM_Orden_BOCM/2024/02/09/BOCM-20240209-66.PDF', titulo: 'BOCM, 9-2-2024 · Talamanca de Jarama: presupuesto general de 2024 y plantilla de personal (aprobación definitiva)' },
  presupuesto2025: { url: 'https://bocm.es/boletin/CM_Orden_BOCM/2025/06/06/BOCM-20250606-82.PDF', titulo: 'BOCM, 6-6-2025 · Talamanca de Jarama: aprobación inicial del presupuesto de 2025' },
  pir: { url: 'https://comunidad.madrid/sites/default/files/doc/municipios/bocm211022_pir2022-2026.pdf', titulo: 'BOCM · Programa de Inversión Regional de la Comunidad de Madrid 2022-2026: asignación por municipio' },
  edificio: { url: 'https://www.comunidad.madrid/noticias/2023/10/14/comunidad-madrid-avanza-construccion-edificio-servicios-municipales-talamanca-jarama', titulo: 'Comunidad de Madrid (14-10-2023) · Edificio de servicios municipales de Talamanca de Jarama' },
  consultorio: { url: 'https://www.comunidad.madrid/centros/punto-informacion-ambiental/Temas/salud-19267/municipio/talamanca-jarama-20202/tipos-centro/salud-20018', titulo: 'Comunidad de Madrid · Centros de salud en Talamanca de Jarama: consultorio local' },
  justicia: { url: 'https://www.comunidad.madrid/centros/oficina-judicial-municipal-talamanca-jarama', titulo: 'Comunidad de Madrid · Oficina Judicial Municipal de Talamanca de Jarama' },
  infantil: { url: 'https://www.comunidad.madrid/centros/escuela-educacion-infantil-casa-ninos-talamanca-jarama', titulo: 'Comunidad de Madrid · Escuela de Educación Infantil-Casa de Niños de Talamanca de Jarama' },
  dunas: { url: 'https://www.comunidad.madrid/transparencia/sites/default/files/regulation/documents/prop_modif_nnss_urbanizacion_las_dunas.pdf', titulo: 'Comunidad de Madrid · Avance de modificación de las Normas Subsidiarias: urbanización Las Dunas (junio de 2017)' },
  ficha: { url: 'https://gestiona.comunidad.madrid/iestadis/fijas/estructu/general/territorio/descarga/talamanca07.pdf', titulo: 'Instituto de Estadística de la Comunidad de Madrid · Ficha municipal de Talamanca de Jarama' },
  turismo: { url: 'https://www.visitmadrid.es/donde-ir/area-metropolitana/talamanca-jarama', titulo: 'Turismo de la Comunidad de Madrid · Talamanca de Jarama: puente, Ábside de los Milagros, murallas y Cartuja' },
  cartuja: { url: 'https://www.comunidad.madrid/node/64932', titulo: 'Comunidad de Madrid (10-12-2022) · La Cartuja de Talamanca de Jarama, declarada Bien de Interés Cultural' },
  bus: { url: 'https://www.crtm.es/datos_lineas/horarios/8197EH2.pdf', titulo: 'Consorcio Regional de Transportes de Madrid · Horario de la línea 197E (Torrelaguna – Talamanca de Jarama)' },
  modelo: { url: 'https://humanity.wiki/modelo-socioeconomico', titulo: 'humanity.wiki · Modelo de optimización socioeconómica: lo que recibe cada escala (cálculo propio)' },
} satisfies Record<string, FuenteAmbito>;

export const AMBITO: Ambito | null = {
  id: 'talamanca',
  nombre: 'Talamanca de Jarama',
  escala: 'municipio',
  quien: 'Ayuntamiento de Talamanca de Jarama: el Pleno de concejales y la alcaldía',
  resumen: [
    'Talamanca de Jarama es un pueblo de 4.607 habitantes en la vega del río Jarama, a unos 55 km de Madrid. Hoy su Ayuntamiento gasta unos 3,4 millones de euros al año, unos 740 € por vecino.',
    'Con el modelo, el municipio recibe su parte de la recaudación y la reparte en asamblea abierta a todo vecino desde los 16 años. Estimación: unos 1.516 € por habitante y año, cerca de 7 millones de euros, el doble de hoy. A cambio desaparecen los impuestos que hoy cobra el pueblo, como el de bienes inmuebles.',
    'Le toca lo cercano: agua, calles, basura, escuela infantil, biblioteca, deporte, el plan del suelo y dar trabajo a quien se queda sin ingresos. No le toca el hospital, el instituto ni la policía de todo el país: eso lo hacen la comarca, la región y la nación.',
    'Nada se paga a crédito: el pueblo no se endeuda, y al menos una quinta parte de su tercio libre (unos 465.000 € al año, estimación) va a una caja de contingencias que nunca baja de cero.',
    'Debajo del pueblo está la vecindad: cada hogar o urbanización registrada recibe también unos 1.516 € al año por persona que vive allí (estimación) y decide en su junta qué arregla: calles interiores, placas solares, un huerto.',
  ],
  cifras: [
    { valor: '4.607 habitantes', texto: 'A 1 de enero de 2025. Eran 4.533 un año antes: 74 vecinos más en un año.', fuente: F.ine },
    { valor: '3,41 M€', texto: 'Presupuesto del Ayuntamiento para 2024: unos 740 € por habitante. El de 2025 se aprobó en junio de 2025, pero no hemos encontrado sus cifras publicadas.', fuente: F.presupuesto2024 },
    { valor: '0 €', texto: 'Previstos en 2024 para devolver préstamos, y solo 1.800 € de gastos financieros: indica poca o ninguna deuda. La cifra oficial de lo que aún debe, que publica el Ministerio de Hacienda, no la hemos podido comprobar.', fuente: F.presupuesto2024 },
    { valor: '39,4 km²', texto: 'Superficie del municipio. El pueblo construido es una parte pequeña; el resto es campo, vega del Jarama y espacios protegidos de la Red Natura 2000.', fuente: F.ficha },
  ],
  areas: {
    escalas: {
      hoy: 'El Ayuntamiento depende del dinero que le llega de otros: en 2024, 1,25 de sus 3,4 millones eran transferencias del Estado y de la Comunidad. Las obras grandes las pide a la Comunidad por su programa de inversiones.',
      propuesta: [
        'El pueblo recibe su parte directamente y decide en asamblea abierta, con presupuestos participativos en la web municipal.',
        'Lo que solo no puede (un instituto, urgencias, bomberos) lo hace la comarca del Jarama con los pueblos vecinos, como Torrelaguna o Valdetorres.',
        'La vecindad decide lo más cercano: la junta de cada urbanización o el propio hogar, si vive en una casa.',
      ],
      cifras: [
        { valor: '1,25 M€', texto: 'Transferencias corrientes que el pueblo esperaba recibir en 2024, el 37 % de sus ingresos.', fuente: F.presupuesto2024 },
      ],
    },
    impuestos: {
      hoy: 'El pueblo cobra sus propios impuestos y tasas: en 2024 esperaba 1,11 millones de impuestos directos (sobre todo el de bienes inmuebles) y 0,7 millones de tasas y precios públicos.',
      propuesta: [
        'Esos impuestos municipales desaparecen: el pueblo recibe su octava parte de la recaudación única, repartida por habitante.',
        'Estimación: unos 7 millones al año en lugar de los 3,4 de hoy, sin recibos de bienes inmuebles, de vehículos ni de plusvalía.',
        'Los precios de servicios como la piscina o la escuela infantil los fija la asamblea, y pueden bajar a cero si así lo decide.',
      ],
      cifras: [
        { valor: '≈ 6,98 M€ al año', texto: 'Estimación del modelo: 1.516 € por habitante y escala, por 4.607 habitantes.', fuente: F.modelo },
      ],
    },
    presupuestos: {
      hoy: 'En 2024 el Ayuntamiento gastó 1,45 millones en personal, 1,27 en compras y servicios, 0,39 en ayudas y solo 0,31 en inversiones. Las obras grandes llegan de la Comunidad: 3,39 millones asignados para 2022-2026.',
      propuesta: [
        'El presupuesto se reparte en tres tercios de unos 2,3 millones cada uno (estimación): producir, cuidar y libre.',
        'Producir: placas solares sobre los edificios municipales, tierras de cultivo en la vega, vivienda municipal en alquiler.',
        'Cuidar: ayuda en casa a los mayores, la escuela infantil, trabajo para quien lo pierde. Libre: calles, agua, cultura, fiestas y la caja de contingencias.',
      ],
      cifras: [
        { valor: '306.300 €', texto: 'Inversiones previstas por el propio Ayuntamiento en 2024, el 9 % de su gasto.', fuente: F.presupuesto2024 },
        { valor: '3,39 M€', texto: 'Asignación de la Comunidad de Madrid a Talamanca en su programa de inversiones 2022-2026; con él se ha hecho, por ejemplo, un edificio de servicios municipales de más de 930.000 €.', fuente: F.pir },
      ],
    },
    deuda: {
      hoy: 'El presupuesto de 2024 no prevé devolver préstamos ni pedirlos, y solo 1.800 € de intereses. La cifra oficial de lo que aún debe cada ayuntamiento, que publica Hacienda, no la hemos podido leer.',
      propuesta: [
        'Con el modelo el pueblo no puede endeudarse: para una obra grande ahorra en su caja o pide un préstamo sin intereses, solo ajustado a la subida de precios, a la comarca o a la región.',
        'Talamanca ya funciona casi así: sería mantener lo que hace y guardar cada año al menos unos 465.000 € (estimación) para imprevistos, como una riada del Jarama.',
      ],
    },
    banca: {
      hoy: 'No hemos encontrado una fuente oficial sobre la oficina bancaria o el cajero del pueblo.',
      propuesta: [
        'El Ayuntamiento garantiza atención en persona: una oficina, un cajero o un servicio móvil, sobre todo para las personas mayores.',
        'Ofrece consejo financiero gratuito antes de firmar una hipoteca, en la propia oficina municipal.',
      ],
    },
    pensiones: {
      hoy: 'Las pensiones las paga la Seguridad Social; el Ayuntamiento solo da ayudas sociales y empleo temporal. En 2024 tenía 44 puestos de trabajo propios.',
      propuesta: [
        'Trabajo antes que paga: quien se queda sin ingresos recibe primero una ocupación del pueblo, por ejemplo cuidando la chopera, los caminos o la vega.',
        'El tercio de cuidados paga ayuda en casa a los mayores y préstamos sin intereses a hogares en apuros. Estimación: unos 490.000 € al año para apoyo mutuo y empleo (el 7 % orientativo del modelo).',
      ],
    },
    vivienda: {
      hoy: 'El pueblo se rige por unas Normas Subsidiarias de 2004. Casi todo el término es suelo no urbanizable, gran parte protegido por la Red Natura 2000. Hay urbanizaciones en suelo rústico pendientes de regularizar desde hace décadas, como Las Dunas, según un documento de la Comunidad de 2017.',
      propuesta: [
        'Precio del suelo regulado: si el pueblo pasa campo a urbanizable, nadie puede revenderlo por encima del valor rústico más un 10 %, y la subida va a vivienda pública.',
        'Casas en el campo con la regla 10/10/80: en una finca de 2.300 m², como las de Las Dunas, se podrían construir unos 230 m² de vivienda, otros 230 de uso productivo, y plantar árboles en los 1.840 restantes. Sería una vía posible para regularizar, que decidirían el pueblo y sus vecinos.',
        'Con el 10 % orientativo del modelo, unos 700.000 € al año (estimación) para vivienda municipal en alquiler y rehabilitar casas vacías del casco.',
        'La vecindad: la junta de cada urbanización decide y paga sus calles interiores, su depuración y su agua. Recibe por quien vive allí todo el año, no por quien tiene una segunda casa.',
      ],
      cifras: [
        { valor: '17,5 ha', texto: 'Superficie de Las Dunas en el documento de 2017, con parcelas de unos 2.300 m².', fuente: F.dunas },
        { valor: '51 %', texto: 'De las viviendas eran segundas residencias en el censo de 2001. No hemos encontrado el dato actual.', fuente: F.ficha },
      ],
    },
    seguridad: {
      hoy: 'El Ayuntamiento tiene dos plazas de policía local en su plantilla de 2024. La seguridad del Estado en los pueblos como este la presta la Guardia Civil.',
      propuesta: [
        'Una sección municipal de guardianes de proximidad, a pie y en bici, con prioridades fijadas por la asamblea del pueblo.',
        'Con dos agentes no hay turnos para todo el día: el pueblo comparte guardia con la comarca del Jarama. Estimación: unos 350.000 € al año para convivencia y seguridad (el 5 % orientativo).',
        'Protección civil propia para riadas e incendios en la vega, con voluntariado vecinal.',
      ],
      cifras: [
        { valor: '2 plazas', texto: 'De policía local en la plantilla municipal de 2024.', fuente: F.presupuesto2024 },
      ],
    },
    justicia: {
      hoy: 'El pueblo tiene una Oficina Judicial Municipal, la heredera del antiguo juzgado de paz. Los juzgados están en otro municipio.',
      propuesta: [
        'Esa oficina es la puerta de entrada: con un punto de videollamada, un vecino denuncia o declara sin viajar.',
        'Mediación vecinal en el pueblo para conflictos de lindes, ruidos o caminos, antes de llegar a un juzgado.',
      ],
      cifras: [
        { valor: '1 oficina', texto: 'Oficina Judicial Municipal en la calle Fuente del Arca.', fuente: F.justicia },
      ],
    },
    sanidad: {
      hoy: 'Hay un consultorio local, que depende de la Comunidad de Madrid. El centro de salud de referencia y el hospital están en otros municipios; no hemos podido confirmar cuáles.',
      propuesta: [
        'El consultorio sigue siendo de la región, pero el pueblo se ocupa de la salud de cercanía: prevención y atención a mayores en casa.',
        'Estimación: unos 560.000 € al año para salud cercana (el 8 % orientativo), por ejemplo transporte a consulta para quien no conduce.',
      ],
      cifras: [
        { valor: '1 consultorio', texto: 'Consultorio de Talamanca, en la avenida de Alcalá.', fuente: F.consultorio },
      ],
    },
    educacion: {
      hoy: 'El pueblo tiene una escuela infantil y casa de niños. El Ayuntamiento paga 8 educadoras infantiles, el conserje del colegio público, una biblioteca y un educador de personas adultas. Los maestros los paga la Comunidad.',
      propuesta: [
        'Plaza cercana para cada niño, de 0 a 12 años, repartida por sorteo si falta sitio. La población sigue creciendo: el pueblo debe planear plazas antes de que falten.',
        'Talleres de oficios con artesanos y agricultores de la vega. Estimación: unos 630.000 € al año para educación (el 9 % orientativo).',
        'El instituto lo comparte con la comarca.',
      ],
      cifras: [
        { valor: '8 educadoras', texto: 'Infantiles en la plantilla municipal de 2024.', fuente: F.presupuesto2024 },
      ],
    },
    legal: {
      hoy: 'El Ayuntamiento hace sus propias ordenanzas y da las licencias de obra con un solo arquitecto técnico en plantilla. Su plan de suelo es de 2004 y cada cambio, como el de Las Dunas, tarda años.',
      propuesta: [
        'Usa las categorías comunes de suelo y licencias, iguales en todos los municipios, y solo dibuja qué va en cada sitio.',
        'La comarca le presta arquitectura e ingeniería para revisar el plan y regularizar las urbanizaciones.',
        'Protege por ordenanza su patrimonio: el puente viejo, el Ábside de los Milagros, la muralla y la Cartuja.',
      ],
      cifras: [
        { valor: 'Siglo XIII', texto: 'Del Ábside de los Milagros, lo único que queda de una iglesia románico-mudéjar. La muralla rodea 91 hectáreas.', fuente: F.turismo },
        { valor: '2022', texto: 'Año en que la Cartuja de Talamanca, del siglo XVII, fue declarada Bien de Interés Cultural.', fuente: F.cartuja },
      ],
    },
    digital: {
      hoy: 'No hemos encontrado datos oficiales sobre la conexión a internet del pueblo. Hay biblioteca municipal con dos personas.',
      propuesta: [
        'La oficina municipal da de alta en persona y ayuda a firmar: es la puerta para quien no tiene móvil.',
        'Publica sus cuentas y sus actas en abierto, y vota sus presupuestos participativos en la web.',
        'Transporte a demanda reservado por internet o por teléfono: hoy el pueblo depende de autobuses como el 197E a Torrelaguna y no tiene tren.',
      ],
      cifras: [
        { valor: 'Línea 197E', texto: 'Autobús Torrelaguna – Valdepiélagos – Talamanca, del Consorcio Regional de Transportes.', fuente: F.bus },
      ],
    },
  },
  revisado: '2026-11-13',
};
