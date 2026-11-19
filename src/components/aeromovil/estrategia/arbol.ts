// The strategy tree of the Aeromóvil («Estrategia», /aeromovil/estrategia, 2026-11-19). Eugenio: «quiero verlo de forma
// visual e ir pudiendo tomar decisiones de forma ramificada… que me vayas haciendo preguntas».
//
// THE TREE AS DATA. One node = one goal, milestone, decision, option, assumption or step. Claude edits this file as the
// conversation with Eugenio advances; his own marks (sí / no / dudo, notes, answers) live in his browser
// (`almacen.ts`) until he pastes them back and they are written here.
//
// Two rules for whoever edits it:
// - `comprobado: 'leido'` only when the source in `fuentes` was actually read and says it. Everything else is
//   'por-confirmar' and the panel shows it as such. Never upgrade a guess.
// - This page is public. No personal figures of Eugenio (savings, family, names of friends) in this file.

export type TipoNodo = 'meta' | 'hito' | 'decision' | 'opcion' | 'supuesto' | 'regla';
/** Where the option stands today, by the research — not Eugenio's own mark, which is stored apart. */
export type EstadoNodo = 'ahora' | 'elegida' | 'prometedora' | 'por-explorar' | 'dudosa' | 'descartada' | 'despues';
export type Comprobado = 'leido' | 'por-confirmar';

export interface Fuente { titulo: string; url: string }
/** A message ready to send: the next small step, already written. Placeholders in [brackets]. */
export interface Borrador { para: string; asunto: string; cuerpo: string }

export interface NodoEstrategia {
  id: string;
  padre: string | null;
  tipo: TipoNodo;
  titulo: string;
  /** one or two plain sentences: what it is */
  resumen: string;
  estado?: EstadoNodo;
  comprobado?: Comprobado;
  detalle?: string[];
  aFavor?: string[];
  enContra?: string[];
  coste?: string;
  plazo?: string;
  /** the next small step: a win that costs days, not months */
  siguiente?: string;
  /** what Claude needs Eugenio to answer to go further on this node */
  preguntas?: string[];
  fuentes?: Fuente[];
  borrador?: Borrador;
  /** what Eugenio has already answered or decided on this node, with its date */
  decidido?: string[];
}

const F = {
  placasRojas: { titulo: 'DGT: matrículas temporales de empresa (placas rojas)', url: 'https://sede.dgt.gob.es/es/vehiculos/tramites-para-empresas/matriculas-temporales-placas-rojas/' },
  esav: { titulo: 'DGT: pruebas o ensayos de investigación (programa ES-AV)', url: 'https://sede.dgt.gob.es/en/vehiculos/tramites-para-empresas/vehiculos-de-conduccion-automatizada/pruebas-o-ensayos-de-investigacion/' },
  ley9: { titulo: 'Ley 9/2025, de Movilidad Sostenible (BOE), arts. 62 a 80', url: 'https://www.boe.es/eli/es/l/2025/12/03/9' },
  rd866: { titulo: 'Real Decreto 866/2010, reformas de vehículos (BOE)', url: 'https://www.boe.es/eli/es/rd/2010/07/02/866/con' },
  manual: { titulo: 'Manual de Reformas de Vehículos (revisión 3)', url: 'https://www.aeca-itv.com/wp-content/uploads/2017/06/ManualReformasVehiculosRev3.pdf' },
  inta: { titulo: 'INTA: solicitud de homologación individual', url: 'https://www.inta.es/export/sites/default/.galleries/Galeria-PDF-Plataformas/Solicitud-de-HIndividual-V26.pdf' },
  industria: { titulo: 'Ministerio de Industria: homologación de vehículos', url: 'https://industria.gob.es/Calidad-Industrial/vehiculos/Paginas/homologacion-vehiculos.aspx' },
  artesanal: { titulo: 'Resolución de 24-9-2025: homologación de L3e y L5e de fabricación artesanal (BOE)', url: 'https://www.boe.es/boe/dias/2025/10/08/pdfs/BOE-A-2025-20062.pdf' },
  manual7: { titulo: 'Resolución de 27-1-2026: corrección segunda de la revisión 7 del Manual de Reformas (BOE)', url: 'https://boe.es/boe/dias/2026/02/05/pdfs/BOE-A-2026-2709.pdf' },
  twizy: { titulo: 'Renault Twizy 80: medidas y datos', url: 'https://www.evspecs.org/tech-specs/renault/twizy/urban-80' },
  solares: { titulo: 'Electrek (2023): Lightyear, Sono Motors y Aptera', url: 'https://electrek.co/2023/01/26/the-future-of-solar-evs-dims/' },
};

export const RAIZ = 'meta';

export const ARBOL: NodoEstrategia[] = [
  {
    id: 'meta', padre: null, tipo: 'meta', titulo: 'Una fábrica de Aeromóviles',
    resumen: 'Fabricar y vender un vehículo ligero y aerodinámico que gasta entre la tercera y la cuarta parte que un coche, a un precio de coche pequeño. Se llega por hitos pequeños: cada uno se puede ganar sin jugarse el siguiente.',
    detalle: [
      'El árbol se lee de izquierda a derecha: meta, hitos, decisiones y opciones. Lo que está más cerca en el tiempo está más desarrollado; lo lejano sólo está apuntado.',
      'Cada opción dice si lo que afirma está leído en su fuente o está por confirmar. Ninguna cifra legal de aquí sustituye a la respuesta por escrito de un laboratorio o de la administración.',
    ],
  },

  // ── Rules of the game ───────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'reglas', padre: 'meta', tipo: 'regla', titulo: 'Reglas del juego', estado: 'ahora',
    resumen: 'Lo que no se negocia mientras se avanza. Están aquí porque tú las has dicho; si alguna no es exacta, se cambia.',
    detalle: [
      'Victorias pequeñas: cada paso tiene que poder terminarse en semanas y dejar algo que se ve o se toca.',
      'No se pone en riesgo dinero de otras personas hasta que haya un vehículo que rueda.',
      'El dinero propio que se arriesga tiene un tope decidido antes de empezar, no durante.',
      'Salud y familia van antes que el calendario.',
      'El control de la empresa se protege: llegar lo más lejos posible con recursos propios antes de dar entrada a nadie.',
    ],
    preguntas: [
      '¿Cuántas horas a la semana puedes dedicarle de forma sostenida sin que lo pague tu casa? Una cifra, aunque sea aproximada.',
      '¿Qué cantidad máxima estás dispuesto a perder del todo en el hito 1? No hace falta que la escribas aquí: dímela en el chat y aquí sólo aparecerá como «tope fijado».',
      '¿Qué señal te haría parar o cambiar de plan? Por ejemplo: un plazo, un gasto o una respuesta negativa de la administración.',
    ],
  },

  // ── Milestone 1 ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'h1', padre: 'meta', tipo: 'hito', titulo: 'Hito 1 · Un Aeromóvil rodando legal por España', estado: 'ahora',
    resumen: 'Un solo vehículo, el tuyo, con matrícula o con un permiso que te deje circular por carretera. Es el único hito que importa ahora: todo lo demás depende de él.',
    detalle: [
      'Tres decisiones lo definen: por qué puerta legal entra, qué se construye primero y con qué tope de dinero y de tiempo.',
      'Las tres se condicionan: la puerta legal fija la potencia, el peso y la velocidad máximos, y eso decide qué se construye.',
    ],
  },
  {
    id: 'h1-legal', padre: 'h1', tipo: 'decision', titulo: '¿Por qué puerta legal entra?', estado: 'ahora',
    resumen: 'Tras la segunda ronda de lectura quedan dos puertas fuertes que no compiten, se suman: la reforma del Twizy para rodar pronto, y el triciclo artesanal con ruedas traseras gemelas para el vehículo definitivo. La homologación individual como cuadriciclo queda de reserva.',
    detalle: [
      'Primero la reforma del Twizy: es eléctrica, usa lo que ya hay y da matrícula desde el primer día.',
      'En paralelo, una consulta sobre el triciclo artesanal: es la única vía que la norma española describe para un vehículo hecho unidad a unidad, y admite el híbrido sin tope de potencia.',
      'Cada una tiene su borrador de consulta escrito dentro de su caja.',
    ],
    siguiente: 'Enviar las dos consultas. Son dos correos y ninguno compromete a nada.',
    decidido: ['19-11-2026: las cuatro ruedas son innegociables.', '19-11-2026: vale un Aeromóvil eléctrico como hito 1; el híbrido viene después.'],
  },
  {
    id: 'p-individual-l7e', padre: 'h1-legal', tipo: 'opcion', titulo: 'Homologación individual como cuadriciclo pesado (L7e)', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'La vía general para un vehículo único con chasis propio. Queda de reserva: para cuadriciclos no existe la lista reducida de requisitos que sí existe para triciclos artesanales.',
    detalle: [
      'Marco: Real Decreto 750/2010, homologación individual. Los prototipos sólo pueden matricularse a nombre del fabricante que los desarrolla.',
      'Leído: la resolución de fabricación artesanal de 2025 cubre sólo motos (L3e) y triciclos (L5e). No menciona los cuadriciclos, así que aquí se aplicaría la lista completa.',
      'Límites de la categoría, según la pestaña «Homologación»: 15 kW continuos, 450 kg sin batería, 3,70 m de largo y 1,50 m de ancho, y 90 km/h por construcción en la subcategoría de habitáculo cerrado.',
      'El formulario del INTA no dice si admite la categoría L ni publica tarifas.',
    ],
    aFavor: ['Chasis propio con las medidas del diseño.', 'Cada ensayo que se guarde sirve después para la serie corta de cuadriciclos, de hasta 150 al año.'],
    enContra: ['Potencia y velocidad por debajo de lo que quieres para carretera.', 'Sin lista reducida: más ensayos que el triciclo artesanal.', 'Coste y plazo sin cifra.'],
    siguiente: 'Preguntarla en la misma consulta del triciclo artesanal, como alternativa. No merece un correo aparte.',
    fuentes: [F.inta, F.industria, F.artesanal],
  },
  {
    id: 'p-individual-m1', padre: 'h1-legal', tipo: 'opcion', titulo: 'Homologación individual como turismo (M1)', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'La misma vía, pero como coche. Quita los topes de potencia, peso y velocidad de los cuadriciclos, a cambio de la reglamentación de turismos.',
    aFavor: ['Velocidad legal de coche y autopistas.', 'Sin discusión de categoría: es lo que el vehículo quiere ser.'],
    enContra: ['Los requisitos de un turismo son muchos más: frenos, control de estabilidad, estructura.', 'No está leído cuáles se pueden sustituir por requisitos alternativos en un vehículo único.', 'Es probablemente la más cara.'],
    siguiente: 'Preguntar en la misma consulta al laboratorio qué exigiría como M1 un vehículo único de menos de 600 kg.',
    fuentes: [F.industria],
  },
  {
    id: 'p-individual-l5e', padre: 'h1-legal', tipo: 'opcion', titulo: 'Triciclo artesanal (L5e) con ruedas traseras gemelas', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'Cuatro ruedas en el suelo, tres para la ley. Dos ruedas del mismo eje a 46 cm o menos cuentan como una, y para triciclos hechos unidad a unidad hay una resolución de 2025 con una lista de requisitos más corta. Es la candidata para el vehículo definitivo.',
    detalle: [
      'Leído en la resolución de 24 de septiembre de 2025: vale para homologación individual y para tipo nacional de vehículos artesanales, definidos como producidos unidad a unidad por un fabricante que no pasa de 10 al año.',
      'Leído: en triciclos, la velocidad máxima y la potencia las declara el fabricante. No hay tope de potencia en la categoría.',
      'Leído: hasta el 1 de enero de 2029 las emisiones del motor de gasolina se miden con límites anteriores, más fáciles. Eso favorece al híbrido si llega antes de esa fecha.',
      'Leído: una lista de puntos no se aplica y otros se resuelven con declaración del fabricante. Sí se ensayan frenos, alumbrado, seguridad eléctrica, compatibilidad electromagnética, salientes exteriores, masas y dimensiones, e integridad de la estructura, entre otros.',
      'Leído en la pestaña «Homologación»: la regla de las ruedas gemelas está en el artículo 3, punto 72, del Reglamento 168/2013. El triciclo admite hasta 1.000 kg, 4 m de largo y 2 m de ancho.',
      'Por confirmar: que un servicio técnico acepte como triciclo un vehículo con dos ruedas traseras gemelas; quién puede figurar como fabricante artesanal; qué velocidad legal tiene en autovía; y el coste.',
    ],
    aFavor: ['Mantiene las cuatro ruedas físicas.', 'Sin tope de potencia: cabe el híbrido enchufable.', 'Diez unidades al año con la misma vía: es también el camino a los primeros clientes.', 'Las dos ruedas juntas caben dentro de la cola, sin carenados traseros.'],
    enContra: ['El eje trasero estrecho no ayuda contra el vuelco: toda la estabilidad la da la vía delantera.', 'El largo máximo es de 4 m.', 'Hay que rediseñar la parte trasera.', 'Depende de una interpretación que nadie ha confirmado por escrito.'],
    coste: 'Sin cifra. Pedirla en la consulta.',
    siguiente: 'Enviar la consulta a un servicio técnico de homologación. El borrador está abajo.',
    preguntas: ['¿Te vale que las dos ruedas traseras vayan juntas, a menos de 46 cm, dentro de la cola? Siguen siendo cuatro ruedas, pero el vehículo se parece más al Triciclo Bala que al de la imagen.'],
    borrador: {
      para: 'Un servicio técnico de homologación (IDIADA, INSIA, INTA o TÜV Rheinland)',
      asunto: 'Consulta previa: homologación individual de un L5e de fabricación artesanal con ruedas traseras gemelas',
      cuerpo: `Buenos días:

Estoy desarrollando un vehículo ligero de dos plazas en tándem, carrozado y cerrado, y quiero confirmar la vía de homologación antes de construirlo. Adjunto un dibujo con sus medidas.

Datos principales: dos ruedas delanteras con vía de [1,20] m y dos ruedas traseras en el mismo eje con sus huellas a menos de 460 mm entre centros. Largo [3,90] m, ancho [1,40] m, masa en orden de marcha de unos [350] kg. Primera unidad eléctrica; más adelante, híbrida enchufable con un motor de gasolina pequeño.

Mis preguntas:

1. Con las dos ruedas traseras a 460 mm o menos (ruedas gemelas, artículo 3.72 del Reglamento (UE) 168/2013), ¿el vehículo se clasifica como L5e-A?
2. ¿Puede acogerse a la Resolución de 24 de septiembre de 2025 sobre vehículos L3e y L5e de fabricación artesanal, por homologación individual, con los requisitos de su anexo II?
3. ¿Quién puede figurar como fabricante artesanal: una persona física, o hace falta una empresa inscrita en el Registro de Fabricantes?
4. Para la versión eléctrica, ¿qué ensayos del anexo II se harían y con cuántas muestras? ¿Y qué se añade para la híbrida?
5. ¿El habitáculo cerrado añade requisitos (parabrisas, limpiaparabrisas, desempañado, cinturones)?
6. Como alternativa, ¿qué diferencia de ensayos y de coste habría si se homologara como cuadriciclo L7e por homologación individual?
7. Coste y plazo orientativos de todo el proceso con ustedes.

Si lo ven viable, me gustaría concertar una reunión previa.

Gracias y un saludo,
[tu nombre y teléfono]`,
    },
    fuentes: [F.artesanal, F.industria],
  },
  {
    id: 'p-reforma', padre: 'h1-legal', tipo: 'opcion', titulo: 'Reforma profunda del Twizy 80', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'Cambiarle la carrocería al Twizy conservando su bastidor, su número de bastidor y su mecánica. No se homologa un vehículo nuevo: se legaliza una reforma. Es la vía para rodar pronto.',
    detalle: [
      'Leído en el Manual de Reformas, sección de categoría L: existe el código 8.51, «modificaciones que afectan a la carrocería», y pide proyecto técnico, certificación final de obra, informe de conformidad y certificado del taller.',
      'Leído: el código 4.2, cambio de la distancia entre ejes, incluye los cuadriciclos pesados y pide la misma documentación. El 2.3, sustitución del motor, también los incluye.',
      'Leído: añadir un segundo motor (código 2.4) sólo se contempla para pasar de térmico a híbrido. Un Twizy no puede hacerse híbrido por esta vía.',
      'Aviso: lo leído es la revisión 3 del Manual. La vigente es la revisión 7, corregida en enero de 2026, y no he podido leer su texto. Hay que confirmarlo sobre la vigente.',
      'El Twizy 80 mide 2,34 m de largo y 1,23 m de ancho, con 1,69 m entre ejes, 474 kg, 13 kW y 80 km/h. Ya lleva dos plazas en tándem y cuatro ruedas.',
      'El resultado sigue siendo un Twizy para la ley: su categoría, su potencia y sus 80 km/h. El tope de su categoría es de 3,70 m de largo y 1,50 m de ancho.',
    ],
    aFavor: ['Matrícula desde el primer día.', 'El donante ya es un tándem de cuatro ruedas: es la base más parecida que existe.', 'Permite la prueba que lo vende todo: el mismo Twizy, con la misma batería, antes y después de la carrocería.'],
    enContra: ['Con 1,69 m entre ejes, una carrocería de 3,70 m deja mucho voladizo; alargar la batalla es otra reforma.', '80 km/h y la autonomía de su batería.', 'El informe de conformidad lo firma el fabricante o un servicio técnico: pueden pedir ensayos.'],
    coste: 'Proyecto, informe de conformidad e ITV: sin cifra hasta preguntar. La carrocería es el gasto principal.',
    siguiente: 'Enviar la consulta a un ingeniero de reformas. El borrador está abajo.',
    decidido: ['19-11-2026: el donante es un Twizy 80.', '19-11-2026: vale como hito 1 aunque sea sólo eléctrico.'],
    preguntas: [
      '¿El Twizy está matriculado a tu nombre y con la ITV en vigor?',
      '¿La batería es tuya o es de alquiler con Renault? Muchos Twizy se vendieron con la batería alquilada, y eso condiciona modificarlo.',
    ],
    borrador: {
      para: 'Un ingeniero de reformas o un servicio técnico de reformas',
      asunto: 'Consulta previa: cambio completo de carrocería en un Renault Twizy 80 (L7e)',
      cuerpo: `Buenos días:

Tengo un Renault Twizy 80 matriculado y quiero sustituir su carrocería por una nueva, aerodinámica y cerrada, de fibra, conservando el bastidor con su número de identificación, la suspensión, los frenos, la dirección, el motor y la batería de origen. Adjunto un dibujo con las medidas previstas sobre las del Twizy.

Antes de fabricar nada necesito saber si se puede legalizar. Mis preguntas:

1. ¿Puede tramitarse como reforma por el código 8.51 (y el 8.52 si procede) de la sección de categoría L del Manual de Reformas vigente?
2. ¿Hasta qué largo, ancho y voladizos puede llegar la carrocería nueva? Entiendo que el tope de la categoría es de 3,70 m por 1,50 m.
3. Si además alargo la distancia entre ejes (código 4.2), ¿qué debe justificar el proyecto?
4. ¿Qué límites de masa y de reparto por eje debo respetar?
5. ¿Quién emitiría el informe de conformidad, Renault o un servicio técnico, y qué ensayos o comprobaciones pediría (salientes exteriores, campo de visión, limpiaparabrisas y desempañado al cerrar el habitáculo, alumbrado recolocado)?
6. ¿Hay algún punto a partir del cual dejaría de considerarse una reforma y pasaría a ser un vehículo nuevo?
7. Coste y plazo orientativos del proyecto, el informe y la inspección.

Gracias y un saludo,
[tu nombre y teléfono]`,
    },
    fuentes: [F.rd866, F.manual, F.manual7, F.twizy],
  },
  {
    id: 'r-batalla', padre: 'p-reforma', tipo: 'decision', titulo: '¿Conservar la batalla del Twizy o alargarla?', estado: 'por-explorar',
    resumen: 'Con sus 1,69 m entre ejes la reforma es sólo de carrocería. Alargarla acerca la forma al diseño, pero toca el bastidor y pide más proyecto.',
    aFavor: ['Conservarla: una sola reforma, bastidor intacto, menos riesgo de que la rechacen.'],
    enContra: ['Conservarla: la forma de cigarro pide más distancia entre ejes de la que hay; habrá voladizo delante y detrás.'],
    siguiente: 'Dibujar en el editor una versión del Aeromóvil con las medidas del Twizy y ver cuánto empeora el coeficiente aerodinámico. Lo preparo cuando me digas.',
  },
  {
    id: 'r-prueba', padre: 'p-reforma', tipo: 'opcion', titulo: 'La prueba del antes y el después', estado: 'prometedora',
    resumen: 'Medir la autonomía del Twizy tal como está, a velocidad constante, y repetir la medida con la carrocería nueva. Misma batería, mismo motor, mismo conductor: la diferencia es sólo la forma.',
    aFavor: ['Convierte el cálculo del consumo en una medida.', 'Se entiende en una frase y en un vídeo.', 'La primera mitad se puede hacer ya, sin fabricar nada.'],
    siguiente: 'Medir ahora el Twizy de serie: kilómetros recorridos a 50 y a 80 km/h con una carga, en un recorrido llano de ida y vuelta.',
  },
  {
    id: 'p-placas-rojas', padre: 'h1-legal', tipo: 'opcion', titulo: 'Placas rojas de empresa', estado: 'por-explorar', comprobado: 'leido',
    resumen: 'Matrícula temporal para vehículos sin matricular. Sirve para pruebas o ensayos de investigación, transporte y exhibición. No es una matrícula definitiva.',
    detalle: [
      'La DGT las concede a fabricantes, carroceros, importadores y laboratorios oficiales.',
      'Requisitos: empresa del sector con licencia de apertura y alta en el impuesto de actividades económicas, libro-talonario con un boletín por cada viaje, tasa de 20,61 € y seguro aparte. Valen un año.',
      'Por confirmar: si una vuelta a España de exhibición cabe en el uso permitido, y si un particular puede optar a ellas.',
    ],
    aFavor: ['Permite rodar por carretera antes de homologar.', 'Trámite barato.'],
    enContra: ['Hace falta una empresa del sector.', 'Cada viaje se anota; no es para uso diario.'],
    preguntas: ['¿Tienes ya una sociedad que pueda darse de alta como fabricante de vehículos, o habría que crearla?'],
    fuentes: [F.placasRojas],
  },
  {
    id: 'p-investigacion', padre: 'h1-legal', tipo: 'opcion', titulo: 'Proyecto de investigación con una universidad o un centro tecnológico', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'No legaliza el vehículo por sí solo, pero aporta un socio con condición de laboratorio, acceso a ensayos y a ayudas públicas que no quitan propiedad de la empresa.',
    detalle: [
      'El socio puede ser un instituto universitario del automóvil o un centro tecnológico que ya sea servicio técnico de homologación.',
      'Ayudas: el IDAE ha financiado proyectos singulares de movilidad en convocatorias anteriores. No he comprobado si hay una convocatoria abierta ahora ni si un prototipo de vehículo encaja.',
    ],
    aFavor: ['Dinero sin ceder participación.', 'Credibilidad y acceso a bancos de ensayo.'],
    enContra: ['Las convocatorias tienen plazos y papeleo.', 'Suelen pagar después de gastar.', 'Un socio público puede pedir publicar resultados.'],
    siguiente: 'Buscar las convocatorias abiertas de IDAE y CDTI y leer sus bases. Lo hago yo cuando me digas.',
  },
  {
    id: 'p-circuito', padre: 'h1-legal', tipo: 'opcion', titulo: 'Circuito y exhibición primero, sin matrícula', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'En un circuito privado no hace falta homologar nada: seguro y permiso del circuito. El vehículo viaja en remolque. No es el hito 1, pero es una victoria antes de él.',
    aFavor: ['Se puede hacer en cuanto ruede.', 'Permite medir el consumo real, que es el dato que lo vende todo.', 'Da vídeo y prensa sin esperar a la administración.'],
    enContra: ['No es circular por España.', 'Un remolque y un circuito cuestan cada salida.'],
    siguiente: 'Ninguno hasta que haya vehículo.',
  },
  {
    id: 'p-otro-pais', padre: 'h1-legal', tipo: 'opcion', titulo: 'Matricularlo en otro país europeo y traerlo', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Algunos países tienen fama de aprobar vehículos únicos con más facilidad. No lo he investigado: no sé si España reconocería esa aprobación.',
    siguiente: 'Investigarlo sólo si las vías españolas se cierran.',
  },
  {
    id: 'p-sandbox', padre: 'h1-legal', tipo: 'opcion', titulo: 'Sandbox de la Ley de Movilidad Sostenible', estado: 'dudosa', comprobado: 'leido',
    resumen: 'La Ley 9/2025 crea un espacio controlado de pruebas para proyectos piloto de movilidad. Existe, pero no parece hecho para saltarse la homologación de un vehículo.',
    detalle: [
      'Leído: la solicitud se presenta en la ventanilla única del Ministerio de Transportes; una comisión de expertos informa en tres meses; se firma un protocolo de pruebas con seguro o aval.',
      'Leído: pide innovación sin cobertura en la regulación existente y un prototipo con funcionalidad mínima.',
      'Leído en el preámbulo: la ley no regula el funcionamiento de los vehículos ni sus condiciones de seguridad. Las excepciones son las que se acuerden en el protocolo, sin lista.',
      'No leído: si la oficina que lo gestiona está ya en marcha ni cuándo se puede solicitar.',
    ],
    aFavor: ['Encaja mejor con el modelo de financiación colectiva o de uso compartido que con el vehículo.'],
    enContra: ['Exige tener ya un prototipo.', 'Tramitación de meses.', 'La homologación depende de Industria, no de Transportes.'],
    fuentes: [F.ley9],
  },
  {
    id: 'p-dgt-pruebas', padre: 'h1-legal', tipo: 'opcion', titulo: 'Autorización de pruebas de la DGT', estado: 'descartada', comprobado: 'leido',
    resumen: 'Cerrada. La autorización de pruebas o ensayos de investigación de la DGT es sólo para vehículos de conducción automatizada, y además exige que el vehículo ya esté matriculado o tenga permiso temporal.',
    fuentes: [F.esav],
  },

  {
    id: 'h1-alcance', padre: 'h1', tipo: 'decision', titulo: '¿Qué se construye primero?', estado: 'ahora',
    resumen: 'El primer vehículo no tiene que ser el definitivo. Cuanto menos lleve, antes rueda y menos cuesta equivocarse.',
  },
  {
    id: 'a-twizy', padre: 'h1-alcance', tipo: 'opcion', titulo: 'Un Twizy con carrocería de Aeromóvil', estado: 'elegida', comprobado: 'por-confirmar',
    resumen: 'El donante pone bastidor, suspensión, frenos, dirección, motor y batería. Se fabrica sólo la carrocería. Es el primer vehículo, si la consulta de la reforma sale bien.',
    aFavor: ['Es lo más corto hasta algo que rueda.', 'La carrocería es justo lo que hay que aprender a fabricar.', 'Se mide el consumo real de la forma.'],
    enContra: ['Las medidas las pone el Twizy.', 'Sólo eléctrico, a 80 km/h y con su autonomía.'],
    decidido: ['19-11-2026: aceptado como hito 1.'],
  },
  {
    id: 'a-electrico', padre: 'h1-alcance', tipo: 'opcion', titulo: 'Prototipo propio, eléctrico primero', estado: 'por-explorar',
    resumen: 'Chasis propio con las medidas del diseño y mecánica de donante. El motor de gasolina se añade después, cuando el eléctrico esté matriculado.',
    aFavor: ['Ya es el vehículo, con su forma y su postura.', 'Homologar el eléctrico es más sencillo que el híbrido.'],
    enContra: ['Chasis nuevo: más meses y homologación individual completa.'],
  },
  {
    id: 'a-hibrido', padre: 'h1-alcance', tipo: 'opcion', titulo: 'Prototipo completo, híbrido enchufable', estado: 'despues',
    resumen: 'El vehículo definitivo desde el primer día. Es lo que más tarda y lo que más ensayos pide.',
    enContra: ['Junta todos los riesgos en el primer intento.', 'Los ensayos de emisiones del motor de gasolina se suman a todo lo demás.'],
  },
  {
    id: 'h1-tope', padre: 'h1', tipo: 'decision', titulo: '¿Con qué tope de dinero y de tiempo?', estado: 'ahora',
    resumen: 'Hay dos deseos que tiran en sentidos opuestos: poner en este hito lo que haga falta y no perder los ahorros. Un tope escrito antes de empezar resuelve la contradicción.',
    detalle: [
      'El tope no es el presupuesto: es la cantidad a partir de la cual se para y se replantea, pase lo que pase.',
      'Lo mismo con el tiempo: una fecha de revisión en la que se decide seguir, cambiar de puerta o parar.',
    ],
    preguntas: ['¿Prefieres un tope único para todo el hito 1 o un tope por etapa, que se renueva sólo si la etapa anterior salió bien?'],
  },

  // ── Assumptions ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: 'supuestos', padre: 'meta', tipo: 'supuesto', titulo: 'Lo que damos por cierto y hay que probar', estado: 'ahora',
    resumen: 'El plan descansa en cinco ideas que hoy son cálculos o intuiciones. Ninguna está medida. Cada una tiene una prueba barata.',
  },
  {
    id: 's-consumo', padre: 'supuestos', tipo: 'supuesto', titulo: 'Gasta entre 1,5 y 2 litros a los 100 km', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Sale del túnel de viento virtual y del cálculo de esta web. No hay ninguna medida real.',
    siguiente: 'Medirlo con el primer vehículo que ruede, aunque sea el Twizy carrozado: consumo eléctrico a velocidad constante.',
  },
  {
    id: 's-coste', padre: 'supuestos', tipo: 'supuesto', titulo: 'Se fabrica por unos 13.000 €', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Es un objetivo, no un presupuesto. El coste por unidad depende de cuántas se hagan: el del prototipo será varias veces mayor.',
    siguiente: 'Usar el coste que ya calcula la pestaña «Proyecto» y separar: unidad 1, lote de 10 y lote de 100.',
  },
  {
    id: 's-demanda', padre: 'supuestos', tipo: 'supuesto', titulo: 'La gente lo va a pedir en masa', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Es la idea más importante y la menos probada. Gustar no es pagar: se mide con dinero sobre la mesa, no con comentarios.',
    detalle: [
      'Tres empresas de coches solares tuvieron reservas e ilusión y aun así se quedaron sin dinero antes de fabricar: en 2023 Lightyear quebró, Sono Motors recaudó unos 47 millones de euros en su campaña y no llegó a la mitad de lo que necesitaba, y Aptera había recaudado 85 millones de dólares y necesitaba otros 50.',
      'La lección no es que no haya demanda. Es que la demanda no paga la fábrica: el dinero se acaba entre el prototipo y la producción.',
    ],
    siguiente: 'Se prueba en el hito 2, con el vehículo delante de la gente.',
    fuentes: [F.solares],
  },
  {
    id: 's-financiacion', padre: 'supuestos', tipo: 'supuesto', titulo: 'Los clientes se financian al 3 %', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Depende de que haya personas dispuestas a prestar a ese interés para comprar vehículos de una marca nueva, y de que la plataforma tenga los permisos para hacerlo.',
    siguiente: 'Revisar qué autorización necesita una plataforma de préstamos colectivos para este uso. Lo investigo cuando lleguemos al hito 2.',
  },
  {
    id: 's-seguridad', padre: 'supuestos', tipo: 'supuesto', titulo: 'Un vehículo tan ligero se percibe como seguro', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'La categoría de cuadriciclos no exige ensayo de choque, y los que se han ensayado han sacado notas bajas. Quien compre un vehículo para carretera lo va a preguntar.',
    siguiente: 'Decidir qué seguridad se añade por encima de lo obligatorio. Está planteado en la pestaña «Homologación».',
  },

  // ── Later milestones: only sketched ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'h2', padre: 'meta', tipo: 'hito', titulo: 'Hito 2 · Demostrar la demanda sin fabricar', estado: 'despues',
    resumen: 'Con el vehículo rodando: la vuelta a España, el consumo medido y una lista de personas que lo quieren. Todavía sin fábrica y sin dinero de nadie en riesgo.',
  },
  {
    id: 'h2-reservas', padre: 'h2', tipo: 'decision', titulo: '¿Cómo se mide el interés?', estado: 'despues',
    resumen: 'De menos a más compromiso: lista de correo, reserva sin dinero, depósito reembolsable guardado aparte, o preventa.',
    detalle: ['Un depósito es dinero de otras personas. Si se acepta, se guarda en una cuenta separada y no se gasta en el desarrollo: así se respeta la regla de no arriesgar dinero ajeno.'],
  },
  {
    id: 'h3', padre: 'meta', tipo: 'hito', titulo: 'Hito 3 · Una serie corta', estado: 'despues',
    resumen: 'Decenas de unidades al año con un solo expediente: la serie corta nacional. Según la ficha de Homologación de esta web, hasta 150 cuadriciclos pesados al año, sólo matriculables en España.',
  },
  {
    id: 'h3-fabricar', padre: 'h3', tipo: 'decision', titulo: '¿Quién fabrica?', estado: 'despues',
    resumen: 'Taller propio, fabricación subcontratada a quien ya hace carrocerías y chasis, o venta en kit para que monte el cliente o un taller asociado.',
  },
  {
    id: 'dinero', padre: 'meta', tipo: 'hito', titulo: 'Dinero y control de la empresa', estado: 'despues',
    resumen: 'De dónde sale el dinero en cada hito y qué se entrega a cambio. El orden importa: primero lo que no quita propiedad.',
  },
  {
    id: 'd-propio', padre: 'dinero', tipo: 'opcion', titulo: 'Recursos propios con tope', estado: 'ahora',
    resumen: 'Lo que financia el hito 1. No diluye. El riesgo es tuyo y por eso lleva tope.',
  },
  {
    id: 'd-ayudas', padre: 'dinero', tipo: 'opcion', titulo: 'Ayudas públicas y proyectos de investigación', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'No quitan propiedad. Son lentas y suelen pagar después de gastar.',
  },
  {
    id: 'd-clientes', padre: 'dinero', tipo: 'opcion', titulo: 'Dinero de clientes: depósitos y preventas', estado: 'despues',
    resumen: 'No diluye, pero es dinero ajeno con una promesa de entrega. Sólo cuando haya fecha de fabricación creíble.',
  },
  {
    id: 'd-inversores', padre: 'dinero', tipo: 'opcion', titulo: 'Inversores con pactos', estado: 'despues',
    resumen: 'Cuanto más demostrado esté el vehículo, más vale la empresa y menos se cede. Los pactos que mencionas, como mayoría de voto y derecho de recompra, se negocian mejor con el hito 2 cumplido. Los redacta un abogado mercantil.',
  },
  {
    id: 'abierto', padre: 'meta', tipo: 'decision', titulo: '¿Código abierto, cerrado o semiabierto?', estado: 'por-explorar',
    resumen: 'Decide quién puede copiar el diseño y quién puede ayudarte. No hace falta resolverlo para el hito 1, pero conviene no cerrarse puertas: lo que se publica no se puede despublicar.',
    decidido: ['19-11-2026: la estrategia sigue siendo pública.'],
  },
  {
    id: 'ab-abierto', padre: 'abierto', tipo: 'opcion', titulo: 'Abierto', estado: 'por-explorar',
    resumen: 'Diseño publicado con licencia libre.',
    aFavor: ['Atrae comunidad, voluntarios y prensa.', 'Encaja con el resto del proyecto.'],
    enContra: ['Cualquiera con más dinero puede fabricarlo antes.', 'Un inversor valora menos lo que no es exclusivo.'],
  },
  {
    id: 'ab-semi', padre: 'abierto', tipo: 'opcion', titulo: 'Semiabierto', estado: 'por-explorar',
    resumen: 'Se publica lo que crea comunidad, como la herramienta de diseño y los resultados, y se reserva lo que cuesta copiar: moldes, utillaje, proveedores, marca y homologación.',
    aFavor: ['Mantiene la comunidad sin regalar la ventaja.', 'La marca y la homologación protegen más que los planos.'],
    enContra: ['Hay que decidir pieza por pieza qué va a cada lado.'],
  },
  {
    id: 'ab-cerrado', padre: 'abierto', tipo: 'opcion', titulo: 'Cerrado', estado: 'por-explorar',
    resumen: 'Nada se publica y lo patentable se registra.',
    aFavor: ['Es lo que espera un inversor clásico.'],
    enContra: ['Sin comunidad.', 'Parte del diseño ya es público en esta web.', 'Las patentes cuestan y hay que defenderlas.'],
  },
  {
    id: 'fabrica', padre: 'meta', tipo: 'hito', titulo: 'La fábrica de millones', estado: 'despues',
    resumen: 'Es la meta, no el siguiente paso. No se decide nada aquí hasta que el hito 3 dé cifras reales de coste y de demanda.',
  },
];

/** The children of a node, in the order of the file. */
export const hijosDe = (id: string): NodoEstrategia[] => ARBOL.filter(n => n.padre === id);
export const nodo = (id: string): NodoEstrategia | undefined => ARBOL.find(n => n.id === id);

/** Every open question, with the node that asks it. */
export function preguntasAbiertas(): { nodo: NodoEstrategia; i: number; texto: string }[] {
  return ARBOL.flatMap(n => (n.preguntas ?? []).map((texto, i) => ({ nodo: n, i, texto })));
}

/** Problems of the data itself (duplicate ids, missing parents, a 'leido' without a source). Empty when sound. */
export function fallosArbol(): string[] {
  const f: string[] = [], ids = new Set<string>();
  for (const n of ARBOL) {
    if (ids.has(n.id)) f.push(`id repetido: ${n.id}`);
    ids.add(n.id);
  }
  for (const n of ARBOL) {
    if (n.padre === null ? n.id !== RAIZ : !ids.has(n.padre)) f.push(`padre desconocido en ${n.id}`);
    if (n.comprobado === 'leido' && !(n.fuentes && n.fuentes.length)) f.push(`«leído» sin fuente: ${n.id}`);
  }
  return f;
}
