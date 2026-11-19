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

export type TipoNodo = 'meta' | 'hito' | 'decision' | 'opcion' | 'paso' | 'supuesto' | 'regla';
/** Where the option stands today, by the research — not Eugenio's own mark, which is stored apart. */
export type EstadoNodo = 'ahora' | 'elegida' | 'prometedora' | 'por-explorar' | 'dudosa' | 'descartada' | 'despues';
export type Comprobado = 'leido' | 'por-confirmar';

export interface Fuente { titulo: string; url: string }
/** A message ready to send: the next small step, already written. Placeholders in [brackets]. */
/** Where to send a draft. `correo` only when it is published by the recipient and was read there; otherwise `nota` says how to reach them. */
export interface Contacto { nombre: string; correo?: string; telefono?: string; web?: string; nota?: string }
export interface Borrador { para: string; asunto: string; cuerpo: string; contactos?: Contacto[] }

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
  /** the test that closes this door: «se descarta si…» */
  descarta?: string;
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
  rd750: { titulo: 'Real Decreto 750/2010, homologación de vehículos (BOE, consolidado)', url: 'https://boe.es/buscar/pdf/2010/BOE-A-2010-9994-consolidado.pdf' },
  orden2026: { titulo: 'Orden PJC/528/2026: requisitos de homologación individual y series cortas (BOE)', url: 'https://www.boe.es/boe/dias/2026/05/29/pdfs/BOE-A-2026-11580.pdf' },
  neotec: { titulo: 'CDTI: preguntas frecuentes de Neotec 2026', url: 'https://www.cdti.es/sites/default/files/2026-04/faq_neotec_2026_v1.0.pdf' },
  guia: { titulo: 'Ministerio de Industria: guía de reglamentación sobre homologación de vehículos, v1.3', url: 'https://industria.gob.es/Calidad-Industrial/vehiculos/InfoAdicionalHomologacion/Gu%C3%ADa%20de%20Reglamentaci%C3%B3n%20sobre%20Homologaci%C3%B3n%20de%20veh%C3%ADculos%20v1.3.pdf' },
  gencat: { titulo: 'Generalitat de Catalunya: matriculación de prototipos o preseries', url: 'https://tramits.gencat.cat/es/tramits/tramits-temes/Matriculacio-de-prototipus-o-preseries-de-vehicles' },
  neotecWeb: { titulo: 'Ministerio de Ciencia: convocatoria Neotec 2026', url: 'https://www.ciencia.gob.es/Convocatorias/2026/NEOTEC2026.html' },
  solares: { titulo: 'Electrek (2023): Lightyear, Sono Motors y Aptera', url: 'https://electrek.co/2023/01/26/the-future-of-solar-evs-dims/' },
};

// Contacts. An address is here only if the recipient publishes it; the rest carry a phone, a web form or a note.
const C = {
  idiada: { nombre: 'Applus IDIADA (Tarragona)', correo: 'idiada@idiada.com', web: 'https://www.applusidiada.com/', nota: 'Servicio técnico de homologación.' },
  insia: { nombre: 'INSIA, Universidad Politécnica de Madrid', correo: 'insia.insia@upm.es', nota: 'Instituto universitario del automóvil y servicio técnico.' },
  inta: { nombre: 'INTA, homologación de vehículos (Madrid)', telefono: '+34 91 520 12 52', web: 'https://www.inta.es/', nota: 'No publica correo para este servicio: llamar y pedir la dirección.' },
  tuvR: { nombre: 'TÜV Rheinland Ibérica', web: 'https://www.tuv.com/spain/es/', nota: 'Sin correo publicado: formulario de contacto de su web.' },
  tuvS: { nombre: 'TÜV SÜD, reformas en sus ITV', web: 'https://www.tuvsud.com/es-es/industrias/movilidad-automocion/inspeccion-tecnica-de-vehiculos/servicios-itv/reformas', nota: 'Sin correo publicado: cita desde su web.' },
  ingenieros: { nombre: 'Ingenieros de reformas de tu provincia', web: 'https://www.certicalia.com/homologar-coche-tuning', nota: 'No hay un destinatario único. Un directorio como este, o la ITV habitual, dan nombres. Pedir que firmen reformas de categoría L.' },
  industria: { nombre: 'Ministerio de Industria, Subdirección General de Calidad y Seguridad Industrial', correo: 'csegind@mintur.es', web: 'https://industria.gob.es/Calidad-Industrial/vehiculos/Paginas/homologacion-vehiculos.aspx', nota: 'Es el buzón que publica su guía de homologación, para comentarios. Si no contestan a una consulta, presentarla por el registro electrónico.' },
  dgt: { nombre: 'DGT', telefono: '060', web: 'https://sede.dgt.gob.es/es/vehiculos/tramites-para-empresas/matriculas-temporales-placas-rojas/index.html', nota: 'Sin correo de consultas: teléfono 060 o la Jefatura Provincial de Tráfico.' },
  cdti: { nombre: 'CDTI, programa Neotec', correo: 'neotec@cdti.es', web: 'https://www.ciencia.gob.es/Convocatorias/2026/NEOTEC2026.html' },
  transportes: { nombre: 'Ministerio de Transportes y Movilidad Sostenible', web: 'https://www.transportes.gob.es/', nota: 'No he encontrado contacto de la oficina del espacio de pruebas: sede electrónica del Ministerio o teléfono 060.' },
  circuito: { nombre: 'El circuito más cercano', nota: 'Depende de dónde vivas: dime la provincia y busco los contactos.' },
} satisfies Record<string, Contacto>;

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
      'Una negativa de la administración cierra una puerta, no el proyecto. Por eso se exploran varias a la vez: la señal de parada es que se cierren todas.',
    ],
    decidido: [
      '19-11-2026: dedicación semanal fijada.',
      '19-11-2026: tope de pérdida fijado, y se aplica por etapa.',
      '19-11-2026: señal para parar o cambiar de plan: una respuesta negativa de la administración.',
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
    resumen: 'Once puertas tras tres rondas de lectura: una cerrada, tres dudosas y siete abiertas. Tres consultas por escrito bastan para confirmar o descartar casi todas. Cada puerta dice qué la descartaría.',
    detalle: [
      'Para rodar pronto: la reforma del Twizy 80.',
      'Para el vehículo de chasis propio hay tres puertas que se deciden con una sola consulta a un servicio técnico: matricularlo como prototipo, homologación individual como cuadriciclo y homologación individual como turismo.',
      'De apoyo, no legalizan por sí solas: placas rojas, circuito y ayudas públicas.',
      'Dudosas: matricular en otro país, el sandbox y el triciclo.',
    ],
    siguiente: 'Hay nueve consultas redactadas, cada una en su caja con sus destinatarios. Las cuatro primeras deciden casi todo: ingeniero de reformas, servicio técnico, Ministerio de Industria y DGT.',
    decidido: ['19-11-2026: las cuatro ruedas son innegociables.', '19-11-2026: vale un Aeromóvil eléctrico como hito 1; el híbrido viene después.', '19-11-2026: quieres explorar todas las puertas abiertas antes de elegir.'],
  },
  {
    id: 'p-individual-l7e', padre: 'h1-legal', tipo: 'opcion', titulo: 'Homologación individual como cuadriciclo pesado (L7e)', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'Un servicio técnico ensaya ese vehículo concreto y el Ministerio resuelve. Es más ligera de lo que parecía: una orden de mayo de 2026 deja doce requisitos fuera de la homologación individual en esta categoría, y la puedes pedir tú como titular.',
    detalle: [
      'Leído en el Real Decreto 750/2010, artículo 4.4: la solicita «el interesado». Si la pide el titular del vehículo, puede omitirse la inscripción en el registro de fabricantes.',
      'Leído, artículo 6.2: la autoridad tiene seis meses para resolver. Si no contesta, se entiende denegada.',
      'Leído, artículo 4.4: la autoridad puede eximir a un vehículo concreto de actos reglamentarios si cumple requisitos alternativos. En vehículos singulares puede eximir de requisitos que el fabricante justifique como inaplicables y un servicio técnico certifique.',
      'Leído en la Orden PJC/528/2026: en la categoría L no son obligatorios para la homologación individual la declaración de durabilidad, las estructuras de protección delanteras y traseras, la protección antivuelco, las plazas de asiento, la maniobrabilidad, la placa de limitación de velocidad, la protección de los ocupantes, la potencia y la limitación de velocidad por construcción, la integridad de la estructura, las plataformas de carga, el diagnóstico a bordo y la información de reparación.',
      'Siguen pidiendo acta de ensayo, entre otros, el frenado, el nivel sonoro, la seguridad eléctrica y los ensayos ambientales.',
      'Límites de la categoría, según la pestaña «Homologación»: 15 kW continuos, 450 kg sin batería, 3,70 m por 1,50 m y 90 km/h por construcción con habitáculo cerrado.',
      'Leído en la guía del Ministerio: quien no está inscrito como fabricante la pide como titular del vehículo, y entonces la tarjeta de ITV la emite la comunidad autónoma. El servicio técnico inspecciona el vehículo físicamente, sin excepciones.',
      'Sin leer: tarifas. El formulario del INTA no las publica.',
    ],
    aFavor: ['Chasis propio con las medidas del diseño.', 'No exige constar como fabricante.', 'Sin ensayo de estructura ni de protección de ocupantes.', 'Cada ensayo sirve después para la serie corta de cuadriciclos.'],
    enContra: ['15 kW y 90 km/h: por debajo de lo que quieres para carretera.', 'Coste sin cifra.', 'Vale para ese vehículo: cada unidad repite parte del trámite.'],
    coste: 'Sin cifra. Es la primera pregunta de la consulta.',
    plazo: 'Hasta seis meses de resolución, más los ensayos.',
    siguiente: 'Enviar la consulta al servicio técnico. El mismo correo pregunta por las tres puertas de chasis propio.',
    descarta: 'Se descarta si el presupuesto del servicio técnico supera el tope de la etapa, o si 15 kW y 90 km/h no te bastan ni como primer vehículo.',
    borrador: {
      para: 'Un servicio técnico de homologación (IDIADA, INSIA, INTA o TÜV Rheinland)',
      contactos: [C.idiada, C.insia, C.inta, C.tuvR],
      asunto: 'Consulta previa: vía para matricular un vehículo único de chasis propio (prototipo, individual L7e o individual M1)',
      cuerpo: `Buenos días:

Estoy desarrollando un vehículo ligero de cuatro ruedas y dos plazas en tándem, carrozado y cerrado, con chasis propio. Quiero construir una sola unidad y matricularla en España. Antes de fabricarla necesito elegir la vía. Adjunto un dibujo con sus medidas.

Datos principales: largo [3,70] m, ancho [1,40] m, masa en orden de marcha de unos [350] kg sin batería, propulsión eléctrica de [15] kW continuos. Más adelante, una versión híbrida enchufable.

Mis preguntas:

1. Prototipo (artículo 5.2 del Real Decreto 750/2010): ¿qué exige en la práctica la autorización expresa de la autoridad de homologación? ¿Basta la memoria de actos que no se cumplen con sus medidas sustitutivas y un informe favorable suyo? ¿Hace falta estar inscrito en el Registro de Fabricantes?
2. Homologación individual como L7e: con la Orden PJC/528/2026 (anexo I, apartado 3), ¿qué ensayos quedan para un vehículo así y en qué subcategoría entraría?
3. Homologación individual como M1: en el nuevo apéndice 5 del anexo III, ¿los requisitos de choque frontal y lateral (A20, A21 y A25 a A27) pueden justificarse con declaración del fabricante? ¿Qué se exigiría de control de estabilidad, antibloqueo y ayudas a la conducción (B4 a B7)?
4. ¿Puedo solicitar la homologación individual como titular del vehículo, sin inscribirme como fabricante (artículo 4.4)?
5. Coste y plazo orientativos de cada una de las tres vías con ustedes.

Si alguna la ven viable, me gustaría concertar una reunión previa.

Gracias y un saludo,
[tu nombre y teléfono]`,
    },
    fuentes: [F.rd750, F.orden2026, F.guia, F.inta, F.industria],
  },
  {
    id: 'i-1', padre: 'p-individual-l7e', tipo: 'paso', titulo: '1 · Consulta previa al servicio técnico', estado: 'ahora',
    resumen: 'Un correo, el del borrador. Sirve a la vez para esta puerta, para la del prototipo y para la del turismo.',
    coste: 'Nada, o el precio de una reunión.', plazo: 'Una a tres semanas hasta tener respuesta.',
  },
  {
    id: 'i-2', padre: 'p-individual-l7e', tipo: 'paso', titulo: '2 · Lista de ensayos con presupuesto', estado: 'despues',
    resumen: 'Con la respuesta, pedir por escrito qué ensayos harían, con qué piezas ya homologadas se evitan (luces, cristales, neumáticos, cinturones) y cuánto cuesta cada uno. Es el dato que decide entre las tres puertas.',
  },
  {
    id: 'i-3', padre: 'p-individual-l7e', tipo: 'paso', titulo: '3 · Ficha reducida, ensayos y solicitud', estado: 'despues',
    resumen: 'Con el vehículo construido: ficha reducida sellada por el servicio técnico, acta de ensayo y solicitud al Ministerio. Después, la ITV emite la tarjeta.',
    plazo: 'Hasta seis meses de resolución.',
  },
  {
    id: 'p-prototipo', padre: 'h1-legal', tipo: 'opcion', titulo: 'Matricularlo como prototipo', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'Puerta nueva. El Real Decreto 750/2010 tiene una vía propia para prototipos: el fabricante pide una autorización expresa, el vehículo pasa una inspección única en la ITV y se matricula sólo a nombre del fabricante. Es la que mejor encaja con «sólo necesito uno».',
    detalle: [
      'Leído, artículo 5.1: la solicitud lleva una memoria con los actos reglamentarios que el vehículo no puede cumplir, las razones y las medidas sustitutivas, y un informe favorable de un servicio técnico.',
      'Leído, artículo 5.2: el solicitante es el fabricante. La inspección técnica unitaria favorable da lugar a la tarjeta de ITV.',
      'Leído, artículo 5.2: sólo puede matricularse, de forma ordinaria o temporal, a nombre del fabricante, y así se anota en la tarjeta.',
      'Leído: el texto no fija número de unidades ni duración.',
      'Leído en el trámite de la Generalitat de Catalunya, como ejemplo de comunidad autónoma: sirve para «realizar pruebas en carretera» con proyectos en desarrollo; pide la autorización de exención de homologación del Ministerio, un certificado del fabricante sobre las condiciones de seguridad y una ficha reducida. La tasa que publica es de 128,7.',
      'Leído en la guía del Ministerio: la condición de fabricante se acredita con el código de fabricante del número de bastidor o con una certificación de calidad cuyo alcance incluya la categoría.',
      'Sin leer: qué mínimos exige el Ministerio para conceder la exención, cuánto tarda y si una asociación puede constar como fabricante.',
    ],
    aFavor: ['Está hecha para un vehículo en desarrollo.', 'Permite decir qué no se cumple todavía y con qué se compensa.', 'Da matrícula ordinaria: se puede circular por España.'],
    enContra: ['Depende de una autorización que la autoridad concede caso por caso.', 'Exige constar como fabricante.', 'No se puede vender ni poner a nombre de otra persona: no sirve para clientes.'],
    siguiente: 'Dos consultas: la del servicio técnico, donde es la primera pregunta, y la del Ministerio, cuyo borrador está abajo.',
    descarta: 'Se descarta si el servicio técnico o el Ministerio responden que la autorización de prototipo exige los mismos ensayos que la homologación individual: entonces no aporta nada.',
    borrador: {
      para: 'El Ministerio de Industria, que es la autoridad de homologación',
      contactos: [C.industria],
      asunto: 'Consulta: autorización de prototipo (artículo 5.2 del Real Decreto 750/2010) para un vehículo ligero en desarrollo',
      cuerpo: `Buenos días:

Les escribo en nombre de [nombre de la asociación], asociación constituida en España hace ocho años. Estamos desarrollando un vehículo ligero de cuatro ruedas y dos plazas en tándem, eléctrico, de chasis propio. Queremos construir una unidad y circular con ella para ensayarla en vías abiertas.

Agradecería que me aclarasen lo siguiente:

1. ¿Puede una asociación figurar como fabricante a efectos del artículo 5.2 del Real Decreto 750/2010, o debe ser una sociedad mercantil?
2. ¿Qué documentos acreditan la condición de fabricante en nuestro caso? ¿Basta con el código de fabricante (WMI), y cómo se solicita?
3. ¿Qué debe contener la memoria justificativa del artículo 5.1 y qué informe del servicio técnico la acompaña? ¿Hay un mínimo de requisitos que no se exceptúa nunca (frenado, alumbrado, seguridad eléctrica)?
4. ¿La autorización tiene límite de duración, de kilómetros o de itinerarios?
5. ¿Cuánto tarda la resolución y por dónde se presenta la solicitud?
6. Si el mismo vehículo se aprobara antes en otro Estado miembro, ¿cómo se tramita la evaluación de correspondencia del artículo 6.4?

Gracias y un saludo,
[tu nombre, cargo en la asociación y teléfono]`,
    },
    fuentes: [F.rd750, F.guia, F.gencat, F.industria],
  },
  {
    id: 'pr-1', padre: 'p-prototipo', tipo: 'paso', titulo: '1 · Preguntarlo en la consulta al servicio técnico', estado: 'ahora',
    resumen: 'Qué exige la autorización en la práctica y si ellos emiten el informe favorable.',
  },
  {
    id: 'pr-2', padre: 'p-prototipo', tipo: 'paso', titulo: '2 · Constar como fabricante', estado: 'despues',
    resumen: 'Inscripción en el Registro de Fabricantes y Firmas autorizadas del Ministerio de Industria y código de fabricante para el número de bastidor. Depende de la decisión «¿A nombre de quién?».',
  },
  {
    id: 'pr-3', padre: 'p-prototipo', tipo: 'paso', titulo: '3 · Memoria de lo que no se cumple', estado: 'despues',
    resumen: 'La lista de requisitos que el prototipo no cumple, por qué, y la medida que lo compensa. La pestaña «Homologación» ya calcula qué cumple y qué no: sale de ahí.',
  },
  {
    id: 'p-individual-m1', padre: 'h1-legal', tipo: 'opcion', titulo: 'Homologación individual como turismo (M1)', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'La misma vía, pero como coche: sin topes de potencia, peso ni velocidad. Parecía inalcanzable por los ensayos de choque; la orden de mayo de 2026 indica que en la homologación individual esos requisitos llevan un código que, en la categoría L, significa «declaración del fabricante».',
    detalle: [
      'Leído en la Orden PJC/528/2026: hay una lista nueva de requisitos para la homologación individual de turismos, obligatoria para los procedimientos iniciados desde el 1 de julio de 2026.',
      'Leído: el choque frontal, el lateral, el de poste y el trasero figuran con el código C. La llamada de emergencia figura como no aplicable.',
      'Leído: con código B, que es acta de ensayo del servicio técnico, figuran el acondicionamiento interior, los cinturones, los cristales, el desempañado, el limpiaparabrisas, la visión indirecta y la dirección.',
      'Sin leer: la definición del código C para turismos y las notas que lo acompañan. En la categoría L el código C es «se podrá justificar mediante declaración de conformidad del fabricante»; que valga igual aquí es una suposición mía.',
      'Sin leer: qué se exige de control de estabilidad, antibloqueo, emisiones y ayudas a la conducción. Estas últimas aparecen con una nota que no pude leer.',
    ],
    aFavor: ['Es la única puerta que da un coche de autopista.', 'Sin topes de potencia, peso ni velocidad: cabe el híbrido completo.', 'Si el código C vale, no hay ensayo de choque destructivo.'],
    enContra: ['La lista de requisitos es la más larga.', 'Las ayudas a la conducción obligatorias pueden no caber en un vehículo así.', 'Probablemente la más cara.'],
    siguiente: 'Es la tercera pregunta de la consulta al servicio técnico. Mientras, leo el apéndice completo con sus notas.',
    descarta: 'Se descarta si el servicio técnico confirma que hay que ensayar el choque con un vehículo real, o que se exigen ayudas a la conducción que este vehículo no puede llevar.',
    fuentes: [F.orden2026, F.rd750],
  },
  {
    id: 'm-1', padre: 'p-individual-m1', tipo: 'paso', titulo: '1 · Leer el apéndice completo con sus notas', estado: 'ahora',
    resumen: 'El texto de la orden que pude leer estaba cortado. Falta la definición de los códigos para turismos y las notas. Lo hago yo en la próxima ronda.',
  },
  {
    id: 'm-2', padre: 'p-individual-m1', tipo: 'paso', titulo: '2 · Confirmarlo con el servicio técnico', estado: 'ahora',
    resumen: 'La pregunta 3 del borrador de consulta.',
  },
  {
    id: 'p-individual-l5e', padre: 'h1-legal', tipo: 'opcion', titulo: 'Triciclo artesanal (L5e) con ruedas traseras gemelas', estado: 'dudosa', comprobado: 'por-confirmar',
    resumen: 'Cuatro ruedas en el suelo, tres para la ley. Dos ruedas del mismo eje a 46 cm o menos cuentan como una, y para triciclos hechos unidad a unidad hay una resolución de 2025 con una lista de requisitos más corta. Sigue abierta sólo en su variante de ruedas gemelas.',
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
    siguiente: 'Ninguno hasta que respondas a la pregunta de abajo.',
    decidido: ['19-11-2026: marcada «no» como triciclo de tres ruedas: las cuatro ruedas son innegociables.'],
    descarta: 'Se descarta del todo si tampoco te valen dos ruedas traseras juntas dentro de la cola.',
    preguntas: ['¿Te vale que las dos ruedas traseras vayan juntas, a menos de 46 cm, dentro de la cola? Siguen siendo cuatro ruedas, pero el vehículo se parece más al Triciclo Bala que al de la imagen.'],
    borrador: {
      para: 'Un servicio técnico de homologación (IDIADA, INSIA, INTA o TÜV Rheinland)',
      contactos: [C.idiada, C.insia, C.inta],
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
    descarta: 'Se descarta si el ingeniero confirma que, en la revisión vigente del Manual, el cambio completo de carrocería no cabe como reforma, o que el informe de conformidad exige ensayos más caros que una homologación individual.',
    decidido: ['19-11-2026: el donante es un Twizy 80.', '19-11-2026: vale como hito 1 aunque sea sólo eléctrico.'],
    preguntas: [
      '¿El Twizy está matriculado a tu nombre y con la ITV en vigor?',
      '¿La batería es tuya o es de alquiler con Renault? Muchos Twizy se vendieron con la batería alquilada, y eso condiciona modificarlo.',
    ],
    borrador: {
      para: 'Un ingeniero de reformas o un servicio técnico de reformas',
      contactos: [C.ingenieros, C.tuvS, C.idiada],
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
    id: 'r-1', padre: 'p-reforma', tipo: 'paso', titulo: '1 · Consulta al ingeniero de reformas', estado: 'ahora',
    resumen: 'El correo del borrador, a uno o dos ingenieros que firmen proyectos de reforma de categoría L. La respuesta abre o cierra esta puerta.',
    coste: 'Nada, o una consulta de pago.', plazo: 'Una o dos semanas.',
  },
  {
    id: 'r-prueba', padre: 'p-reforma', tipo: 'opcion', titulo: '2 · Medir el Twizy de serie: el «antes»', estado: 'ahora',
    resumen: 'Medir la autonomía del Twizy tal como está, a velocidad constante, y repetir la medida con la carrocería nueva. Misma batería, mismo motor, mismo conductor: la diferencia es sólo la forma.',
    aFavor: ['Convierte el cálculo del consumo en una medida.', 'Se entiende en una frase y en un vídeo.', 'La primera mitad se puede hacer ya, sin fabricar nada.'],
    siguiente: 'Medir ahora el Twizy de serie: kilómetros recorridos a 50 y a 80 km/h con una carga, en un recorrido llano de ida y vuelta.',
  },
  {
    id: 'r-batalla', padre: 'p-reforma', tipo: 'decision', titulo: '3 · ¿Conservar la batalla del Twizy o alargarla?', estado: 'por-explorar',
    resumen: 'Con sus 1,69 m entre ejes la reforma es sólo de carrocería. Alargarla acerca la forma al diseño, pero toca el bastidor y pide más proyecto.',
    aFavor: ['Conservarla: una sola reforma, bastidor intacto, menos riesgo de que la rechacen.'],
    enContra: ['Conservarla: la forma de cigarro pide más distancia entre ejes de la que hay; habrá voladizo delante y detrás.'],
    siguiente: 'Dibujar en el editor una versión del Aeromóvil con las medidas del Twizy y ver cuánto empeora el coeficiente aerodinámico. Lo preparo cuando me digas.',
  },
  {
    id: 'r-4', padre: 'p-reforma', tipo: 'paso', titulo: '4 · Proyecto, carrocería, ITV y el «después»', estado: 'despues',
    resumen: 'Sólo si los pasos 1 y 3 salen bien: proyecto técnico, fabricación de la carrocería, certificado del taller, inspección en la ITV y la segunda medida de autonomía.',
  },
  {
    id: 'p-placas-rojas', padre: 'h1-legal', tipo: 'opcion', titulo: 'Placas rojas de empresa', estado: 'por-explorar', comprobado: 'leido',
    resumen: 'Matrícula temporal para vehículos sin matricular. Sirve de apoyo para probar el vehículo en carretera antes de homologarlo. No sirve para la vuelta a España.',
    detalle: [
      'Leído en la DGT: las pide una empresa del sector del motor: fabricantes, carroceros, importadores, vendedores, museos de automoción o laboratorios oficiales.',
      'Leído: la circulación se permite «exclusivamente» para ensayos de investigación, pruebas técnicas, transporte del vehículo, traslados entre instalaciones, exhibición de vehículos de museos y pruebas con posibles compradores.',
      'Leído: sólo por los trayectos autorizados en el permiso y dentro de España. Cada viaje lleva su boletín con vehículo, conductor, trayecto y ocupantes.',
      'Leído: vale un año improrrogable y la tasa es de 20,61 €. Exige alta en el impuesto de actividades económicas y licencia de apertura o declaración responsable.',
      'Sin leer: si las concede a un fabricante recién creado que aún no ha homologado nada.',
    ],
    aFavor: ['Permite rodar por carretera antes de homologar.', 'Trámite barato.'],
    enContra: ['Hace falta una sociedad del sector.', 'Trayectos cerrados de antemano: no es para viajar.'],
    siguiente: 'Una pregunta a la DGT. El borrador está abajo.',
    descarta: 'Se descarta si la DGT responde que una asociación no puede pedirlas y no quieres constituir una sociedad.',
    borrador: {
      para: 'La DGT',
      contactos: [C.dgt],
      asunto: 'Consulta: placas rojas para ensayos de un vehículo en desarrollo',
      cuerpo: `Buenos días:

Represento a [nombre de la asociación], una asociación constituida en España hace ocho años que está desarrollando un vehículo ligero. Necesitamos probar el primer prototipo en vías abiertas antes de su homologación.

1. ¿Puede una asociación solicitar el permiso temporal de empresa (placas rojas) para ensayos de investigación y pruebas técnicas, si se da de alta en el impuesto de actividades económicas como fabricante de vehículos? ¿O debe ser una sociedad mercantil?
2. ¿Se concede a un fabricante que todavía no ha homologado ningún vehículo?
3. ¿Los trayectos autorizados pueden ser rutas largas entre provincias, o deben limitarse al entorno de las instalaciones?
4. ¿Qué se exige al vehículo no matriculado para circular con ellas (seguro, inspección, documentación técnica)?

Gracias y un saludo,
[tu nombre, cargo en la asociación y teléfono]`,
    },
    fuentes: [F.placasRojas],
  },
  {
    id: 'p-investigacion', padre: 'h1-legal', tipo: 'opcion', titulo: 'Ayudas públicas y proyecto con una universidad o centro tecnológico', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'No legaliza el vehículo, pero paga parte del desarrollo sin ceder propiedad. La ayuda más a medida es Neotec, del CDTI. Lo único urgente es una fecha: la de constitución de la sociedad.',
    detalle: [
      'Leído en las preguntas frecuentes de Neotec 2026: es para pequeñas empresas innovadoras constituidas entre seis meses y tres años antes del cierre del plazo, con 20.000 € de capital desembolsado.',
      'Leído: el proyecto debe tener un presupuesto de entre 175.000 y 750.000 €. La subvención cubre hasta el 70 %, con un máximo de 250.000 €. Hay anticipo de hasta el 60 % sin garantía.',
      'Leído: cubre personal, materiales, activos y servicios externos. No menciona de forma expresa prototipos ni homologación.',
      'Leído: el plazo de 2026 fue del 14 de abril al 14 de mayo. Está cerrada.',
      'Leído: el beneficiario debe ser una sociedad mercantil. Una asociación no puede pedirla; tendría que hacerlo una sociedad nueva.',
      'Si la de 2027 repite las reglas, la sociedad tendría que existir seis meses antes del cierre. Es una suposición: las bases cambian cada año.',
      'IDAE: no he encontrado ninguna convocatoria abierta para prototipos de vehículos. Las de proyectos singulares de movilidad fueron de 2021 y 2022.',
    ],
    aFavor: ['Dinero sin ceder participación.', 'El anticipo reduce lo que hay que adelantar.'],
    enContra: ['El proyecto mínimo es de 175.000 € y la empresa pone al menos el 30 %.', 'Papeleo, plazos y justificación de gastos.', 'Es competitiva: no está garantizada.'],
    siguiente: 'Preguntar al CDTI por la convocatoria de 2027 y escribir al instituto universitario. Los dos borradores están en los pasos de esta caja.',
    descarta: 'Se descarta si el 30 % propio de un proyecto de 175.000 € supera el tope que has fijado para la etapa.',
    fuentes: [F.neotec, F.neotecWeb],
  },
  {
    id: 'inv-1', padre: 'p-investigacion', tipo: 'paso', titulo: '1 · Preguntar al CDTI por Neotec 2027', estado: 'ahora',
    resumen: 'La convocatoria de 2026 está cerrada. La pregunta es qué haría falta para llegar a la de 2027, sabiendo que la asociación no puede pedirla.',
    borrador: {
      para: 'El CDTI',
      contactos: [C.cdti],
      asunto: 'Consulta Neotec: elegibilidad de una sociedad de nueva creación promovida por una asociación',
      cuerpo: `Buenos días:

Dirijo una asociación que desarrolla un vehículo ligero de muy bajo consumo. Estamos valorando constituir una sociedad mercantil para llevarlo a producción y presentarla a la próxima convocatoria de Neotec.

1. ¿Cuándo está prevista la convocatoria de 2027 y se mantendrá el requisito de que la empresa tenga entre seis meses y tres años en la fecha de cierre?
2. ¿Sería elegible una sociedad nueva cuya socia fundadora sea una asociación, que le aporta el diseño y el prototipo desarrollados hasta ahora?
3. ¿Son financiables la fabricación de prototipos y los ensayos de homologación en un servicio técnico?
4. ¿El desarrollo de un vehículo completo encaja como tecnología propia, o se valora sólo la parte novedosa?

Gracias y un saludo,
[tu nombre y teléfono]`,
    },
  },
  {
    id: 'inv-2', padre: 'p-investigacion', tipo: 'paso', titulo: '2 · Proponer un proyecto conjunto a un instituto universitario', estado: 'por-explorar',
    resumen: 'Ellos ponen bancos de ensayo y estudiantes de fin de grado o de máster; la asociación pone el diseño y el prototipo. El INSIA es además servicio técnico de homologación.',
    borrador: {
      para: 'Un instituto universitario del automóvil',
      contactos: [C.insia],
      asunto: 'Propuesta de colaboración: vehículo ligero de muy bajo consumo, diseño abierto',
      cuerpo: `Buenos días:

Soy ingeniero mecánico y dirijo [nombre de la asociación]. Hemos diseñado un vehículo ligero de cuatro ruedas y dos plazas en tándem, de carrocería muy aerodinámica, y una herramienta web propia que calcula su geometría, sus masas, su aerodinámica y su encaje en la normativa: [enlace a humanity.wiki/aeromovil].

Vamos a construir el primer prototipo y nos gustaría hacerlo con ustedes. Propongo tres formas de colaborar, de menos a más:

1. Trabajos de fin de grado o de máster sobre partes concretas: estructura, frenos, seguridad eléctrica o medida del consumo real.
2. Medir en sus instalaciones lo que la herramienta sólo calcula: resistencia aerodinámica, resistencia a la rodadura y consumo.
3. Un proyecto conjunto para una convocatoria pública de investigación.

¿Con quién podría hablar para valorar si les encaja?

Gracias y un saludo,
[tu nombre y teléfono]`,
    },
  },
  {
    id: 'p-circuito', padre: 'h1-legal', tipo: 'opcion', titulo: 'Circuito y exhibición primero, sin matrícula', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'En un circuito privado no hace falta homologar nada: seguro y permiso del circuito. El vehículo viaja en remolque. No es el hito 1, pero es una victoria antes de él.',
    aFavor: ['Se puede hacer en cuanto ruede.', 'Permite medir el consumo real, que es el dato que lo vende todo.', 'Da vídeo y prensa sin esperar a la administración.'],
    enContra: ['No es circular por España.', 'Un remolque y un circuito cuestan cada salida.'],
    siguiente: 'Ninguno hasta que haya vehículo.',
    descarta: 'No se descarta: es compatible con todas las demás.',
    borrador: {
      para: 'Un circuito o pista de pruebas cercano',
      contactos: [C.circuito],
      asunto: 'Consulta: alquiler de pista para ensayos de un prototipo de vehículo ligero',
      cuerpo: `Buenos días:

Estamos desarrollando un prototipo de vehículo ligero eléctrico de dos plazas y necesitamos medir su consumo a velocidad constante y probar frenada y estabilidad.

1. ¿Alquilan la pista por horas o medias jornadas en exclusiva, y a qué precio?
2. ¿Qué exigen a un vehículo sin matricular (seguro, revisión previa, equipo del conductor)?
3. ¿Disponen de una recta o un óvalo donde mantener 80 km/h durante varios kilómetros?
4. ¿Hay toma de corriente para recargar?

Gracias y un saludo,
[tu nombre y teléfono]`,
    },
  },
  {
    id: 'p-otro-pais', padre: 'h1-legal', tipo: 'opcion', titulo: 'Matricularlo en otro país europeo y traerlo', estado: 'dudosa', comprobado: 'leido',
    resumen: 'No es un atajo. España no acepta sin más la aprobación individual de otro país: hay que pedir a la autoridad española que evalúe si las exigencias técnicas son equivalentes.',
    detalle: [
      'Leído en el Real Decreto 750/2010, artículo 6.4: para vehículos procedentes de otros Estados del espacio económico europeo hay que solicitar a la autoridad española una evaluación de correspondencia de las disposiciones técnicas.',
      'Sin leer: cuánto cuesta en Alemania o en Países Bajos aprobar un vehículo construido desde cero. Lo que encontré habla de modificaciones, no de vehículos nuevos.',
    ],
    enContra: ['Dos administraciones en lugar de una.', 'Hay que llevar el vehículo y, en la práctica, tener domicilio allí.'],
    siguiente: 'Sin consulta propia: va como pregunta 6 en el correo al Ministerio de Industria, dentro de «Matricularlo como prototipo».',
    descarta: 'Queda aparcada mientras haya una vía española abierta.',
    fuentes: [F.rd750],
  },
  {
    id: 'p-sandbox', padre: 'h1-legal', tipo: 'opcion', titulo: 'Sandbox de la Ley de Movilidad Sostenible', estado: 'dudosa', comprobado: 'leido',
    resumen: 'La Ley 9/2025 crea un espacio controlado de pruebas para proyectos piloto de movilidad. Existe, pero no parece hecho para saltarse la homologación de un vehículo.',
    detalle: [
      'Leído: la solicitud se presenta en la ventanilla única del Ministerio de Transportes; una comisión de expertos informa en tres meses; se firma un protocolo de pruebas con seguro o aval.',
      'Leído: pide innovación sin cobertura en la regulación existente y un prototipo con funcionalidad mínima.',
      'Leído en el preámbulo: la ley no regula el funcionamiento de los vehículos ni sus condiciones de seguridad. Las excepciones son las que se acuerden en el protocolo, sin lista.',
      'Leído: el reglamento de la oficina que lo gestiona debía aprobarse antes del 30 de junio de 2026. No he encontrado que esté admitiendo solicitudes.',
    ],
    aFavor: ['Encaja mejor con el modelo de financiación colectiva o de uso compartido que con el vehículo.'],
    enContra: ['Exige tener ya un prototipo.', 'Tramitación de meses.', 'La homologación depende de Industria, no de Transportes.'],
    siguiente: 'Una consulta al Ministerio de Transportes: si la oficina del espacio de pruebas admite ya solicitudes.',
    descarta: 'Se descarta si la oficina todavía no funciona, o si confirma que no puede exceptuar la homologación, que depende de Industria.',
    borrador: {
      para: 'El Ministerio de Transportes y Movilidad Sostenible',
      contactos: [C.transportes],
      asunto: 'Consulta: espacio controlado de pruebas de la Ley 9/2025 para un vehículo ligero innovador',
      cuerpo: `Buenos días:

La Ley 9/2025, de Movilidad Sostenible, crea en sus artículos 62 a 80 un espacio controlado de pruebas. Estamos desarrollando un vehículo ligero de muy bajo consumo y querría saber si puede acogerse.

1. ¿Está ya en funcionamiento la oficina gestora y admite solicitudes? Si no, ¿cuándo está previsto?
2. ¿Puede el protocolo de pruebas permitir la circulación de un vehículo todavía no homologado, o la homologación queda fuera por depender de Industria?
3. ¿Encajaría mejor un proyecto sobre el modelo de uso y de financiación colectiva del vehículo que sobre el vehículo en sí?
4. ¿Puede presentarlo una asociación?

Gracias y un saludo,
[tu nombre y teléfono]`,
    },
    fuentes: [F.ley9],
  },
  {
    id: 'p-dgt-pruebas', padre: 'h1-legal', tipo: 'opcion', titulo: 'Autorización de pruebas de la DGT', estado: 'descartada', comprobado: 'leido',
    resumen: 'Cerrada. La autorización de pruebas o ensayos de investigación de la DGT es sólo para vehículos de conducción automatizada, y además exige que el vehículo ya esté matriculado o tenga permiso temporal.',
    fuentes: [F.esav],
  },

  {
    id: 'h1-alcance', padre: 'h1', tipo: 'decision', titulo: '¿Qué se construye primero?', estado: 'ahora',
    resumen: 'Las tres opciones no compiten: son etapas. Primero lo que rueda antes, y el híbrido completo al final, que es el vehículo que quieres.',
  },
  {
    id: 'a-twizy', padre: 'h1-alcance', tipo: 'opcion', titulo: 'Un Twizy con carrocería de Aeromóvil', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'El donante pone bastidor, suspensión, frenos, dirección, motor y batería. Se fabrica sólo la carrocería. Es el primer vehículo, si la consulta de la reforma sale bien.',
    aFavor: ['Es lo más corto hasta algo que rueda.', 'La carrocería es justo lo que hay que aprender a fabricar.', 'Se mide el consumo real de la forma.'],
    enContra: ['Las medidas las pone el Twizy.', 'Sólo eléctrico, a 80 km/h y con su autonomía.'],
    decidido: ['19-11-2026: aceptado como primer paso, con dudas.'],
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
    decidido: ['19-11-2026: es el vehículo que quieres al final.'],
    enContra: ['Junta todos los riesgos en el primer intento.', 'Los ensayos de emisiones del motor de gasolina se suman a todo lo demás.'],
  },
  {
    id: 'h1-tope', padre: 'h1', tipo: 'decision', titulo: '¿Con qué tope de dinero y de tiempo?', estado: 'ahora',
    resumen: 'Decidido: un tope por etapa. Cada etapa tiene el suyo y la siguiente sólo se abre si la anterior salió bien.',
    detalle: [
      'Etapa 1, consultas y medidas: tres correos y medir el Twizy de serie. Casi sin gasto.',
      'Etapa 2, el Twizy carrozado: proyecto de reforma y carrocería.',
      'Etapa 3, chasis propio eléctrico: por la puerta que la consulta deje abierta.',
      'Etapa 4, el híbrido enchufable.',
      'El tope no es el presupuesto: es la cantidad a partir de la cual se para y se replantea.',
    ],
    siguiente: 'Cuando lleguen los presupuestos de las consultas, repartir el tope total entre las etapas 2 y 3.',
    decidido: ['19-11-2026: tope por etapa.'],
  },
  {
    id: 'h1-figura', padre: 'h1', tipo: 'decision', titulo: '¿A nombre de quién: tú, la asociación o una sociedad?', estado: 'ahora',
    resumen: 'Ya existe una asociación con ocho años de antigüedad. Sirve para ser titular del vehículo y para firmar convenios. Lo que no está claro es si puede constar como fabricante, y para Neotec no vale.',
    decidido: ['19-11-2026: hay una asociación constituida en España desde hace ocho años.'],
    preguntas: ['¿En qué comunidad autónoma matricularías el vehículo? La inspección única y la matrícula de prototipo las tramita la comunidad, y de ahí salen los contactos de la ITV y de los circuitos.'],
  },
  {
    id: 'f-persona', padre: 'h1-figura', tipo: 'opcion', titulo: 'Tú, como titular del vehículo', estado: 'por-explorar', comprobado: 'leido',
    resumen: 'Vale para la reforma del Twizy y para la homologación individual: la norma permite que la pida el titular sin inscribirse como fabricante.',
    aFavor: ['Sin costes de sociedad.', 'Suficiente para el primer vehículo por dos de las puertas.'],
    enContra: ['Cierra el prototipo, las placas rojas y las ayudas.', 'La responsabilidad es personal.'],
    fuentes: [F.rd750],
  },
  {
    id: 'f-asociacion', padre: 'h1-figura', tipo: 'opcion', titulo: 'La asociación que ya existe', estado: 'prometedora', comprobado: 'por-confirmar',
    resumen: 'Puede ser titular del vehículo, pedir la homologación individual como titular y firmar un convenio con una universidad. Sin coste nuevo.',
    detalle: [
      'Leído: la homologación individual la pide «el interesado» y, si es el titular, no necesita estar inscrito como fabricante.',
      'Leído: Neotec exige sociedad mercantil de menos de tres años. La asociación no puede pedirla.',
      'Sin leer: si una asociación puede constar como fabricante para matricular un prototipo, y si la DGT le concede placas rojas. Son la pregunta 1 de los correos al Ministerio y a la DGT.',
    ],
    aFavor: ['Ya existe: no hay que constituir nada.', 'Encaja con un proyecto abierto y con convenios de investigación.', 'Separa el vehículo de tu patrimonio personal.'],
    enContra: ['No reparte beneficios ni admite inversores: no sirve para la fábrica.', 'Fuera de Neotec.', 'Puede no valer como fabricante.'],
    siguiente: 'Enviar los correos al Ministerio y a la DGT: los dos empiezan por esta pregunta.',
    descarta: 'Deja de bastar el día que haga falta vender vehículos o dar entrada a socios.',
    fuentes: [F.rd750, F.neotec],
  },
  {
    id: 'f-sociedad', padre: 'h1-figura', tipo: 'opcion', titulo: 'Una sociedad que conste como fabricante', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Necesaria para optar a Neotec y, más adelante, para vender y dar entrada a socios. Puede hacer falta también para el prototipo y las placas rojas, si la asociación no vale. La fecha de constitución cuenta para las ayudas.',
    aFavor: ['Abre todas las puertas.', 'Separa tu patrimonio del proyecto.', 'Es la que tendrá que existir de todos modos para vender.'],
    enContra: ['Cuesta constituirla y mantenerla cada año aunque no facture.', 'Neotec pide 20.000 € de capital desembolsado.'],
    siguiente: 'Esperar a las respuestas del Ministerio, la DGT y el CDTI: dirán si hace falta ya o puede esperar al hito 2.',
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
