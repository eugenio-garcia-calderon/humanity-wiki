// The «Homologación» page's written guides (2026-11-24, Eugenio: «vamos a poner diferentes informaciones que tenemos
// sobre las homologaciones … en modo tabla y súper claro … paso a paso … y conecta la información de los requisitos con
// el diseño 3D»). THE TEXT AS DATA: the page (PaginaHomologacion.tsx) only draws it. The figures a design can be checked
// against live in normas.ts (`REQUISITOS`); here `req` names the requirement a row is tied to, so its row shows the
// design's verdict. UI text is Spanish; comments are English.
import type { IdCategoria, IdFuente } from './normas';

/** What a row says about the claim it checks: confirmed in the legal text, true with a nuance, or not checked. */
export type Veredicto = 'confirmado' | 'matiz' | 'no comprobado';

export interface FilaNorma { concepto: string; norma: string; ref: string; fuente: IdFuente; /** id of a `REQUISITOS` entry: the design's verdict goes beside the row */ req?: string }
export interface Revision { texto: string; veredicto: Veredicto; comentario: string; fuente?: IdFuente }
export interface Paso { titulo: string; resumen: string; quien: string; detalle: string[]; /** the phase of the steps this one opens (shown as a heading when it changes) */ fase?: string }
export interface Via {
  id: string; nombre: string; unidades: string; valeEn: string; cuando: string;
  /** The rows of «qué se pide»: a document, a test or a certificate, each with what it means and who gives it. */
  piden: { cosa: string; que: string; quien: string }[];
  pasos: string[]; ojo: string[]; fuentes: IdFuente[];
}
export interface Guia {
  id: string; titulo: string; lema: string; categorias: IdCategoria[];
  /** The category the design is evaluated against by default. */
  porDefecto: IdCategoria;
  tabla: FilaNorma[]; revision: Revision[]; pasos: Paso[]; vias: string[];
  /** A homologation with its own way instead of the three (the pedal cycle: the maker certifies it himself). */
  propia?: Via;
  /** «Trámites que sí y que no»: [procedure, needed, note] */
  tramites?: { tramite: string; hace: boolean; nota?: string }[];
  /** Questions whose answer changes the procedure (use, steering, body, market), each with why. */
  cuestiones?: { pregunta: string; opciones: string; porque: string }[];
}

// ───────────────────────────────────────────────────────────── the three ways to approve
/** Small-series limits per type and year (168/2013, annex III, read on legislation.gov.uk on 24-11-2026). */
export const LIMITES_SERIE_CORTA: [string, string, number][] = [
  ['L1e-A', 'ciclo de motor', 50], ['L3e', 'moto de dos ruedas', 75], ['L4e', 'moto con sidecar', 150], ['L5e-A', 'triciclo', 75], ['L5e-B', 'triciclo comercial', 150],
  ['L6e-A', 'cuadriciclo ligero de carretera (quad)', 30], ['L6e-B', 'cuadrimóvil ligero («coche sin carné»)', 150],
  ['L7e-A', 'cuadriciclo pesado de carretera (quad)', 30], ['L7e-B', 'cuadriciclo pesado todoterreno', 50], ['L7e-C', 'cuadrimóvil pesado', 150],
];

export const VIAS: Via[] = [
  {
    id: 'individual', nombre: 'Homologación individual (una unidad)', unidades: '1 vehículo', valeEn: 'España',
    cuando: 'El prototipo o un vehículo único: sirve para esa unidad y no para fabricar otras con el mismo expediente.',
    piden: [
      { cosa: 'Solicitud de homologación individual', que: 'El impreso con el que pides al Ministerio que apruebe este vehículo.', quien: 'Tú (el titular del vehículo o tu representante).' },
      { cosa: 'Ficha reducida sellada por el servicio técnico', que: 'Un resumen de las características del vehículo (medidas, masas, motor, frenos, ruedas, luces…) que el servicio técnico revisa y sella.', quien: 'La rellena el ingeniero; la sella el servicio técnico (INTA, IDIADA, INSIA, TÜV…).' },
      { cosa: 'Acta de ensayo de homologación individual', que: 'El informe del servicio técnico de que el vehículo cumple los requisitos aplicables, o los alternativos que se hayan acordado.', quien: 'El servicio técnico designado en España, con el vehículo delante.' },
      { cosa: 'Certificados y requisitos alternativos', que: 'Copia de los certificados de los componentes homologados (luces, neumáticos, baterías, etc.) y, donde un requisito no se pueda cumplir al pie de la letra, el requisito alternativo que se acepta.', quien: 'Los fabricantes de cada pieza; el servicio técnico decide qué requisito alternativo vale.' },
      { cosa: 'Inscripción en el Registro de fabricantes', que: 'Se puede omitir si la solicitud la hace el titular del vehículo o su representante.', quien: 'El Ministerio de Industria.' },
    ],
    pasos: ['Cerrar las características técnicas y hablar con un servicio técnico.', 'Construir el vehículo con las piezas definitivas.', 'Presentar la ficha reducida y el vehículo al servicio técnico; ensayos y acta.', 'Presentar el expediente a la autoridad de homologación (en España, el Ministerio de Industria).', 'Recibir la homologación individual, con un número HIA-xxxxx.', 'Pasar la ITV y matricular en la DGT.'],
    ojo: ['El número tiene el formato HIA-XXXXX (las letras HIA y al menos cinco cifras).', 'Valen para esa unidad; si luego quieres hacer más, hace falta serie corta o tipo UE.'],
    fuentes: ['rd750anx', 'rd750'],
  },
  {
    id: 'serie-corta', nombre: 'Homologación nacional de serie corta', unidades: 'hasta el límite por tipo y año (50 en L1e-A)', valeEn: 'España (otros países pueden aceptarla)',
    cuando: 'Una serie pequeña de un mismo modelo, con algunos requisitos técnicos sustituidos por otros equivalentes que apruebe el país.',
    piden: [
      { cosa: 'Ficha de características del tipo', que: 'La descripción completa del modelo (no de una unidad): dimensiones, masas, propulsión, frenos, luces, materiales…', quien: 'El fabricante, con su ingeniero.' },
      { cosa: 'Lista de actos reglamentarios y matriz TVV', que: 'La lista de las normas que se aplican y la tabla «tipo, variante y versión» que dice qué versiones del modelo cubre el expediente.', quien: 'El ingeniero, acordada con el servicio técnico.' },
      { cosa: 'Ensayos y certificados', que: 'Los que fije la lista acordada: en un ciclo de motor suelen ser frenado, seguridad eléctrica de la batería, compatibilidad electromagnética, luces, manipulación del limitador de potencia y velocidad. Se pueden sustituir algunos por requisitos alternativos, nunca los de seguridad sin una alternativa equivalente.', quien: 'El servicio técnico designado (o el laboratorio que él acepte).' },
      { cosa: 'Control de la producción', que: 'Cómo garantizas que cada vehículo de la serie es igual al ensayado: procedimientos, inspección de piezas y qué haces si cambias una pieza.', quien: 'El fabricante; lo revisa el servicio técnico o la autoridad.' },
      { cosa: 'Registro del fabricante y número de homologación', que: 'El fabricante figura en el Registro y recibe un número de homologación nacional de serie corta.', quien: 'El Ministerio de Industria.' },
    ],
    pasos: ['Elegir el tipo (L1e-A, L6e-A…) y comprobar que tu serie anual cabe en su límite.', 'Acordar con el servicio técnico la lista de requisitos y qué se sustituye por alternativos.', 'Fabricar el vehículo representativo y ensayarlo.', 'Presentar el expediente al Ministerio de Industria.', 'Producir la serie con el control acordado y emitir la documentación de cada unidad.', 'Cada comprador la matricula con esa documentación.'],
    ojo: ['El límite es por tipo, por año y por Estado miembro (anexo III): 50 al año en L1e-A, 30 en L6e-A, 150 en L6e-B y en L7e-C, 30 en L7e-A.', 'La aprobación vale en el Estado que la concede; los demás Estados la aceptan salvo que tengan motivos para pensar que sus requisitos no son equivalentes, y tienen tres meses para decidirlo (art. 42).', 'Dos años seguidos con 50 y 50 es posible; 100 en un mismo año, con este camino, no.'],
    fuentes: ['r168art42', 'r168anx3', 'rd750anx'],
  },
  {
    id: 'tipo-ue', nombre: 'Homologación de tipo de la Unión Europea', unidades: 'sin el tope anual de la serie corta', valeEn: 'toda la UE',
    cuando: 'Cuando quieres vender muchas unidades o en otros países: es el camino de un negocio, con todos los ensayos y la fábrica auditada.',
    piden: [
      { cosa: 'Fabricante identificado y responsable', que: 'La empresa que asume ante la ley el diseño, la fabricación y que cada unidad sea conforme.', quien: 'Tú, como empresa fabricante.' },
      { cosa: 'Ensayos completos de todos los actos reglamentarios', que: 'Todos los de los reglamentos delegados (seguridad funcional 3/2014, construcción 44/2014, medio ambiente y propulsión 134/2014), sin sustituir ninguno.', quien: 'Un servicio técnico designado: lo normal es que lo haga él o supervise a un laboratorio.' },
      { cosa: 'Evaluación inicial de conformidad de la producción', que: 'Una auditoría de cómo fabricas: calidad, trazabilidad, inspección de piezas y gestión de cambios.', quien: 'La autoridad de homologación o su servicio técnico.' },
      { cosa: 'Identificación de cada vehículo', que: 'Número de bastidor (VIN) y placas reglamentarias en cada unidad.', quien: 'El fabricante.' },
      { cosa: 'Certificado de conformidad (CoC) por unidad', que: 'El documento que acompaña a cada vehículo y que el comprador usa para matricularlo en cualquier país de la UE; se entrega sin coste.', quien: 'El fabricante, para cada unidad que vende.' },
    ],
    pasos: ['Registrar la empresa como fabricante y fijar el sistema de bastidores.', 'Preparar el expediente con todos los requisitos aplicables.', 'Hacer todos los ensayos con el servicio técnico.', 'Superar la evaluación de la conformidad de producción.', 'Obtener la homologación de tipo de la autoridad.', 'Fabricar y emitir un CoC por cada vehículo; vender y matricular.'],
    ojo: ['Es la vía más cara y larga; compensa si tu plan es más de unas decenas de unidades al año o vender fuera de España.', 'Un cambio de pieza esencial después del ensayo puede obligar a repetirlo: conviene fabricar el prototipo con las piezas definitivas.'],
    fuentes: ['r168', 'r44', 'r3', 'r134'],
  },
];

// ───────────────────────────────────────────────────────────── L1e-A, the bicycle-class quadricycle
export const GUIA_L1EA: Guia = {
  id: 'l1ea', titulo: 'L1e-A · cuadriciclo estilo bicicleta', lema: 'Ciclo de pedales de tres o cuatro ruedas con motor que ayuda, corta a 25 km/h y no pasa de 1.000 W',
  categorias: ['L1e-A'], porDefecto: 'L1e-A',
  tabla: [
    { concepto: 'Número de ruedas', norma: 'Dos, o tres o cuatro si cumplen lo demás: cuentan como «técnicamente equivalentes» a un L1e-A de dos ruedas.', ref: 'Anexo I, criterio 12', fuente: 'r168anx3', req: 'l1eaRuedas' },
    { concepto: 'Propulsión', norma: 'Ciclo diseñado para pedalear: se mueve pedaleando y el motor ayuda, no lo sustituye. Un pedalier que solo mueve un generador (sin cadena) no queda dicho en el texto: se confirma con el servicio técnico.', ref: 'Anexo I, criterios 9 y 10', fuente: 'r168anx3', req: 'l1eaPedales' },
    { concepto: 'Función del motor', norma: 'Su fin principal es ayudar a pedalear.', ref: 'Anexo I, criterio 9', fuente: 'r168anx3' },
    { concepto: 'Velocidad a la que corta la ayuda', norma: '25 km/h o menos. No limita lo que el vehículo alcance con las piernas o cuesta abajo, sino a qué velocidad deja de empujar el motor.', ref: 'Anexo I, criterio 10', fuente: 'r168anx3', req: 'l1eaVelocidad' },
    { concepto: 'Potencia continua máxima', norma: '1.000 W (potencia nominal continua o neta). Todo L1e, además, 4.000 W y 45 km/h como techo de diseño.', ref: 'Anexo I, criterio 11 y criterios comunes de L1e', fuente: 'r168anx3', req: 'l1eaPotencia' },
    { concepto: 'Ancho máximo', norma: '1.000 mm. Es el límite de todo L1e y es el que más condiciona el diseño: con más de un metro no es L1e-A.', ref: 'Anexo I, criterios comunes (ancho)', fuente: 'r168anx3', req: 'ancho' },
    { concepto: 'Largo máximo', norma: '4.000 mm.', ref: 'Anexo I, criterios comunes (largo)', fuente: 'r168anx3', req: 'largo' },
    { concepto: 'Alto máximo', norma: '2.500 mm.', ref: 'Anexo I, criterios comunes (alto)', fuente: 'r168anx3', req: 'alto' },
    { concepto: 'Masa', norma: 'En los criterios de L1e-A que leí no hay límite de masa: no existe un tope de 35 kg ni de otra cifra.', ref: 'Anexo I', fuente: 'r168anx3' },
    { concepto: 'Luces y reflectores', norma: 'Alumbrado y señalización homologados, incluido el reflector trasero; la lista exacta de L1e se confirma con el servicio técnico.', ref: 'Reglamento 3/2014, anexo IX', fuente: 'r3', req: 'l1eaLuces' },
    { concepto: 'Frenado', norma: 'Ensayo de frenado de las ruedas (Reglamento UN 78 y anexo III del 3/2014): hace falta un prototipo en pista.', ref: 'Reglamento 3/2014, anexo III', fuente: 'r3', req: 'frenos' },
    { concepto: 'Seguridad eléctrica', norma: 'La batería y el sistema eléctrico se certifican (mejor con piezas que traigan su certificado UN 100 o UN 38.3).', ref: 'Reglamento 3/2014, anexo IV', fuente: 'r3', req: 'electrica' },
    { concepto: 'Compatibilidad electromagnética', norma: 'Ensayo en cámara (Reglamento UN 10): el controlador y el cableado no deben molestar a otros aparatos ni dejarse molestar.', ref: 'Reglamento 44/2014, anexo VII', fuente: 'r44', req: 'cem' },
  ],
  revision: [
    { texto: 'Se puede fabricar un vehículo de cuatro ruedas con pedales y asistencia eléctrica hasta 25 km/h y estudiar su homologación como L1e-A.', veredicto: 'confirmado', comentario: 'Los criterios 9 a 11 definen el L1e-A y el criterio 12 dice que los ciclos de tres y cuatro ruedas que los cumplen son técnicamente equivalentes al de dos ruedas.', fuente: 'r168anx3' },
    { texto: 'Ancho máximo de 1.000 mm.', veredicto: 'confirmado', comentario: 'Está en los criterios comunes del anexo I: ancho de 2.000 mm o menos, o de 1.000 mm o menos para un vehículo L1e. Largo 4.000 mm y alto 2.500 mm también coinciden.', fuente: 'r168anx3' },
    { texto: 'Potencia continua máxima de 1.000 W y corte de la ayuda a 25 km/h.', veredicto: 'confirmado', comentario: 'Criterios 10 y 11 del anexo I. Matiz: todo L1e tiene además un techo de 4.000 W y 45 km/h, que en L1e-A no se alcanza.', fuente: 'r168anx3' },
    { texto: 'No hay un límite general de 35 kg.', veredicto: 'confirmado', comentario: 'En los criterios de L1e-A no aparece ningún límite de masa.', fuente: 'r168anx3' },
    { texto: 'Serie corta nacional: 50 unidades de L1e-A por tipo y año.', veredicto: 'confirmado', comentario: 'Anexo III: L1e-A, 50. El artículo 42 lo hace por Estado miembro y año, vale en el Estado que la concede y los demás la aceptan salvo motivos de no equivalencia (tres meses para decidir).', fuente: 'r168art42' },
    { texto: 'Homologación individual con número HIA-XXXXX, con solicitud, ficha reducida sellada y acta de ensayos.', veredicto: 'confirmado', comentario: 'Artículos 4.4 y 7.3 del RD 750/2010 y anexo II, apéndice 1: «HIA» más al menos cinco cifras. Los requisitos aplicables están en el apéndice 4 y 5 del anexo II.', fuente: 'rd750anx' },
    { texto: 'La homologación individual sirve solo para esa unidad.', veredicto: 'confirmado', comentario: 'El artículo 4.4 la concede «para esa unidad» y le asigna un número.', fuente: 'rd750anx' },
    { texto: 'La Instrucción de la DGT 2019/S-149 dice que los L1e-A necesitan autorización para circular y permiso AM.', veredicto: 'matiz', comentario: 'La instrucción de la DGT sobre L1e-A es la 19/V-134 (24-5-2019), no «2019/S-149»: dice que se homologan y se matriculan y enumera seguro, ITV, casco y permiso de conducir, pero el texto que leí no concreta que sea el AM. A confirmar con la DGT.', fuente: 'dgtL1eA' },
    { texto: 'La Ley 5/2025 cita los ciclos de motor con asistencia por encima de 25 km/h pero no los L1e-A limitados a 25 km/h: discrepancia con la DGT.', veredicto: 'no comprobado', comentario: 'No pude abrir el texto de la ley (BOE-A-2025-15424) desde aquí: ni lo confirmo ni lo desmiento. Antes de circular, pide por escrito a la DGT y a una aseguradora si el seguro es obligatorio.' },
    { texto: 'La homologación de tipo de la UE no tiene el límite de 50 unidades al año.', veredicto: 'matiz', comentario: 'Cierto: el anexo III solo limita las series cortas. Pero exige todos los ensayos y una auditoría de la fábrica; el artículo del reglamento que enumera los ensayos (se cita el 32) no lo he releído.', fuente: 'r168anx3' },
    { texto: 'El coste de homologar no es una tarifa fija: depende de los ensayos.', veredicto: 'confirmado', comentario: 'Coincide con lo que dice el INTA; no se pone una cifra hasta tener una propuesta técnica del servicio técnico.' },
  ],
  pasos: [
    { titulo: 'Cerrar las características técnicas', resumen: 'Que el diseño entre en los criterios de L1e-A antes de construir nada.', quien: 'Tú y el ingeniero; esta pantalla te dice qué falla.', detalle: ['Ancho de 1,00 m o menos, largo de 4,00 m o menos, alto de 2,50 m o menos.', 'Motor de hasta 1.000 W continuos, con la ayuda cortada a 25 km/h o antes.', 'Se mueve pedaleando y el motor solo ayuda.', 'Pide por escrito a un servicio técnico que tu diseño concreto de cuatro ruedas entra en L1e-A: es el paso más importante.'] },
    { titulo: 'Contratar ingeniero y servicio técnico', resumen: 'Dos figuras distintas que trabajan juntas.', quien: 'Un ingeniero (diseño y cálculos) y un servicio técnico designado (INTA, IDIADA, INSIA, TÜV…).', detalle: ['El ingeniero hace los cálculos de estructura, los planos y la documentación.', 'El servicio técnico decide qué ensayos aplican y los hace o supervisa; es quien firma que cumples.', 'No empieces el vehículo completo sin tener acordada con él la lista de requisitos y ensayos.'] },
    { titulo: 'Preparar el expediente técnico', resumen: 'La documentación de cada parte del vehículo.', quien: 'El ingeniero.', detalle: ['Estructura: planos del chasis, materiales y cálculos.', 'Geometría: dimensiones, masas y reparto de cargas.', 'Tracción: motor, potencia continua, transmisión y controlador; cómo se garantiza que no pasa de 1.000 W continuos y que la ayuda corta a 25 km/h.', 'Batería con sus protecciones; frenos, dirección, ruedas, iluminación e identificación (fabricante, modelo y bastidor).'] },
    { titulo: 'Fabricar el prototipo con las piezas definitivas', resumen: 'Mismo motor, batería, frenos, controlador y estructura que tendrá la serie.', quien: 'Tú.', detalle: ['Cambiar después una pieza esencial puede obligar a repetir ensayos.'] },
    { titulo: 'Ensayos', resumen: 'Pruebas de frenado, potencia y velocidad, electricidad, compatibilidad electromagnética, estructura, dirección, ruedas, luces, medidas y masas, y protección contra la manipulación.', quien: 'El servicio técnico decide cuáles y las hace o las supervisa.', detalle: ['Cada ensayo y su estado están en la tabla de «Tu diseño frente al L1e-A» de arriba.'] },
    { titulo: 'Elegir la vía de homologación', resumen: 'Una unidad, serie corta nacional o tipo UE.', quien: 'Tú, con el servicio técnico.', detalle: ['Una unidad: homologación individual. Hasta 50 al año por tipo: serie corta nacional. Más o fuera de España: tipo UE. Detalle de cada una, en «Vías de homologación».'] },
    { titulo: 'Matricular y circular', resumen: 'ITV, matrícula en la DGT, seguro, permiso.', quien: 'La DGT y la ITV; en serie, cada comprador.', detalle: ['Con la homologación se tramita la autorización de circulación y la matrícula.', 'Antes de circular, confirma por escrito con la DGT qué permiso hace falta y con una aseguradora si el seguro es obligatorio (ver «Lo que contrasté»).'] },
  ],
  vias: ['individual', 'serie-corta', 'tipo-ue'],
};

// ───────────────────────────────────────────────────────────── pedal cycle with pedal assistance (EPAC), EN 15194
export const GUIA_EPAC: Guia = {
  id: 'epac', titulo: 'Ciclo de pedales con pedaleo asistido · EN 15194', lema: 'Cuatro ruedas con pedales y motor de 250 W que corta a 25 km/h: sin homologación de vehículo, con ensayos, expediente y declaración del fabricante',
  categorias: ['EPAC'], porDefecto: 'EPAC',
  tabla: [
    { concepto: 'Qué es', norma: 'Un ciclo con pedales y un motor eléctrico auxiliar de potencia nominal continua de 250 W o menos, cuya ayuda baja poco a poco y se corta antes de 25 km/h o si el ciclista deja de pedalear. El Reglamento español de vehículos lo define así desde julio de 2025 y lo saca de la definición de «vehículo a motor».', ref: 'Orden PJC/780/2025 (anexo II del Reglamento General de Vehículos)', fuente: 'pjc780' },
    { concepto: 'Por qué no se homologa', norma: 'El Reglamento europeo 168/2013 excluye de su sistema de homologación de vehículos los ciclos con pedaleo asistido que cumplen 250 W, corte al dejar de pedalear y 25 km/h. Por eso no hay límite de 50 unidades al año, ni homologación de tipo, ni matrícula.', ref: 'Reglamento 168/2013, art. 2.2.h', fuente: 'r168excl' },
    { concepto: 'Número de ruedas', norma: 'Al menos dos. Con tres o cuatro entra, pero se le aplica además el anexo VI («ciclos de más de dos ruedas»), mientras no existan normas armonizadas para ellos.', ref: 'RD 339/2014, art. 2 y disposición transitoria segunda', fuente: 'rd339', req: 'epacRuedas' },
    { concepto: 'Propulsión', norma: 'Sobre todo muscular: los pedales mueven el vehículo y el motor ayuda. Unos pedales decorativos que solo activan un motor no valen.', ref: 'RD 339/2014, art. 2', fuente: 'rd339', req: 'epacPedales' },
    { concepto: 'Potencia', norma: '250 W nominales continuos como mucho (no de pico).', ref: 'Orden PJC/780/2025', fuente: 'pjc780', req: 'epacPotencia' },
    { concepto: 'Velocidad de la ayuda', norma: 'Se corta a 25 km/h o antes. No limita la velocidad que se alcanza con las piernas o cuesta abajo.', ref: 'Orden PJC/780/2025', fuente: 'pjc780', req: 'epacVelocidad' },
    { concepto: 'Corte del motor', norma: 'Al dejar de pedalear el motor se corta, y al acercarse a 25 km/h la potencia baja de forma progresiva (no de golpe).', ref: 'Orden PJC/780/2025; EN 15194, apartado 4.2', fuente: 'pjc780', req: 'epacCorte' },
    { concepto: 'Batería', norma: 'La EN 15194 se escribe para ciclos de hasta 48 V de corriente continua (o con cargador integrado de 230 V). La batería y el cargador se certifican; la EN 17860-5 es la norma eléctrica de los ciclos de carga.', ref: 'EN 15194 (alcance); EN 17860-5; anexo VI, punto 8', fuente: 'en15194', req: 'epacTension' },
    { concepto: 'Ocupantes, masa y carga declaradas', norma: 'El fabricante declara cuántos ocupantes lleva, la masa en vacío, la carga máxima admisible y la velocidad máxima recomendada.', ref: 'RD 339/2014, anexo VI, punto 1', fuente: 'rd339', req: 'epacDeclarar' },
    { concepto: 'Ancho, largo, alto y masa máximos', norma: 'En el texto leído del RD 339/2014 no aparece ningún tope de medidas ni de masa. No es lo mismo que un permiso para circular por cualquier sitio: las normas de circulación y los carriles bici pueden pedir otras cosas (por confirmar).', ref: 'RD 339/2014 (anexo VI completo)', fuente: 'rd339' },
    { concepto: 'Esquinas y transmisión', norma: 'Nada cortante donde el cuerpo pueda tocar; la cadena o la correa protegidas contra atrapamientos.', ref: 'RD 339/2014, anexo VI, puntos 1.1 y 1.2', fuente: 'rd339', req: 'epacEsquinas' },
    { concepto: 'Frenos', norma: 'Frenos que actúen por separado en las ruedas delanteras y en las traseras; palanca delantera a la izquierda y trasera a la derecha; que paren el ciclo de forma segura en seco.', ref: 'RD 339/2014, anexo VI, punto 2', fuente: 'rd339', req: 'epacFrenos' },
    { concepto: 'Dirección', norma: 'Declarar el radio de giro a la velocidad máxima recomendada; puños o protectores en el manillar.', ref: 'RD 339/2014, anexo VI, punto 3', fuente: 'rd339', req: 'epacDireccion' },
    { concepto: 'Neumáticos', norma: 'La presión recomendada, moldeada en el flanco y visible.', ref: 'RD 339/2014, anexo VI, punto 4', fuente: 'rd339', req: 'epacNeumaticos' },
    { concepto: 'Estabilidad', norma: 'El reparto de masas tiene que evitar el vuelco longitudinal y el lateral en todos los usos previstos.', ref: 'RD 339/2014, anexo VI, punto 10', fuente: 'rd339', req: 'epacEstabilidad' },
    { concepto: 'Luces y reflectores', norma: 'Una luz blanca delante, una roja detrás, un catadióptrico rojo trasero no triangular y cuatro catadióptricos laterales amarillos (dos en las ruedas delanteras y dos en las traseras, uno por lado), todos homologados UN 3.', ref: 'RD 339/2014, anexo VI, punto 6, y anexo V', fuente: 'rd339', req: 'epacLuces' },
    { concepto: 'Timbre', norma: 'Obligatorio (advertencia acústica).', ref: 'RD 339/2014, anexo VI, punto 11', fuente: 'rd339', req: 'epacTimbre' },
    { concepto: 'Pasajeros', norma: 'Si lleva pasajeros, cada uno con un sistema de retención.', ref: 'RD 339/2014, anexo VI, punto 9', fuente: 'rd339', req: 'epacPasajeros' },
    { concepto: 'Expediente y declaración', norma: 'Expediente técnico (anexo III) y declaración de conformidad firmada (anexo I), guardados 10 años desde la última unidad. Sin control previo de la Administración.', ref: 'RD 339/2014, art. 4 y anexos I y III', fuente: 'rd339', req: 'epacExpediente' },
    { concepto: 'Manual', norma: 'Con cada unidad, en castellano, con el contenido mínimo del anexo II.', ref: 'RD 339/2014, anexo II', fuente: 'rd339', req: 'epacManual' },
    { concepto: 'Placa', norma: 'Razón social, dirección completa y número de serie, visibles e indelebles; modelo identificado.', ref: 'RD 339/2014, art. 3', fuente: 'rd339', req: 'epacPlaca' },
    { concepto: 'Marcado CE de máquinas', norma: 'Aparte de lo anterior; puede aplicar. Directiva 2006/42/CE hasta el 19 de enero de 2027 y Reglamento 2023/1230 desde el 20.', ref: 'EN 15194, anexo ZA; 2006/42/CE; 2023/1230', fuente: 'maq2023', req: 'epacMaquinas' },
  ],
  revision: [
    { texto: 'Un vehículo de cuatro ruedas con pedales y asistencia de hasta 25 km/h puede venderse sin homologación de vehículo.', veredicto: 'confirmado', comentario: 'El artículo 2.2.h del Reglamento 168/2013 excluye esos ciclos y la Orden PJC/780/2025 los define como «ciclo de pedales con pedaleo asistido», sin limitar el número de ruedas. Condición: que cumpla de verdad la definición (250 W continuos, pedales, corte a 25 km/h o al dejar de pedalear).', fuente: 'r168excl' },
    { texto: 'La Orden PJC/780/2025 actualiza el Reglamento General de Vehículos.', veredicto: 'confirmado', comentario: 'Orden de 21 de julio de 2025 (BOE 23-7-2025): modifica los anexos II, IX, X y XVIII e inserta la definición del ciclo de pedales con pedaleo asistido; la «bicicleta de pedales con pedaleo asistido» pasa a ser el de dos ruedas. También excluye estos ciclos de la definición de «vehículo a motor».', fuente: 'pjc780' },
    { texto: 'Potencia máxima de 250 W nominales continuos, no de pico, y 25 km/h.', veredicto: 'confirmado', comentario: 'Es la definición literal de la Orden: potencia nominal continua máxima de 250 W o menos, que disminuya progresivamente y se interrumpa antes de 25 km/h o si el ciclista deja de pedalear.', fuente: 'pjc780' },
    { texto: 'La propulsión debe ser sobre todo muscular; los pedales no pueden ser decorativos.', veredicto: 'confirmado', comentario: 'El RD 339/2014 define el ciclo como propulsado «exclusiva o principalmente por la energía muscular». Si el pedalier mueve solo un generador (sin cadena a las ruedas), no está claro que cuente: se confirma por escrito con el servicio técnico. Es el caso de los «Pedales del conductor (sin cadena)» del editor.', fuente: 'rd339' },
    { texto: 'El anexo VI del RD 339/2014 es el que regula los ciclos de tres o más ruedas.', veredicto: 'confirmado', comentario: 'Anexo VI, «especificaciones generales aplicables a los ciclos de más de dos ruedas». La disposición transitoria segunda lo aplica hasta que haya normas armonizadas para esos ciclos. Además de lo que dice el texto pegado, el anexo VI pide palanca delantera a la izquierda y trasera a la derecha, puños en el manillar, marca de inserción mínima de la potencia y del tubo del sillín, y rueda centrada en la horquilla.', fuente: 'rd339' },
    { texto: 'Hay que declarar ocupantes, masa en vacío, carga máxima y velocidad recomendada, y el radio de giro.', veredicto: 'confirmado', comentario: 'Anexo VI, puntos 1 y 3.3. Sin esquinas cortantes (1.1), transmisión protegida (1.2), frenos separados delante y detrás (2.1), presión en el neumático (4.1), retención de pasajeros (9), estabilidad (10) y timbre (11).', fuente: 'rd339' },
    { texto: 'Iluminación: luz blanca delante, roja detrás, catadióptrico trasero rojo no triangular y cuatro laterales amarillos.', veredicto: 'confirmado', comentario: 'Anexo VI, punto 6: catadióptrico trasero de categoría IA (UN 3), cuatro laterales amarillos de categoría IVA (dos en las ruedas delanteras y dos en las traseras, uno por lado) y luces con 4 a 60 candelas delante y 4 a 12 detrás (anexo V).', fuente: 'rd339' },
    { texto: 'Expediente técnico de 10 años, declaración de conformidad del anexo I, manual en castellano y placa con razón social, dirección y número de serie.', veredicto: 'confirmado', comentario: 'Artículos 3 y 4 y anexos I, II y III del RD 339/2014, con el mismo contenido que el texto pegado. La declaración la firma el fabricante sin control previo; si no presenta el expediente cuando se lo piden, se presume que el ciclo no cumple.', fuente: 'rd339' },
    { texto: 'Hay que aplicar la norma EN 15194.', veredicto: 'matiz', comentario: 'Para un ciclo de más de dos ruedas el anexo VI, punto 8, remite a la EN 15194 solo en su apartado 4.2 (la asistencia eléctrica). El anexo IV del RD todavía cita la edición de 2009; la vigente es la EN 15194:2017+A1:2023. Y su definición de bicicleta es de dos ruedas y su alcance habla de un sillín a 635 mm o más de altura: no cubre entero un cuadriciclo de asiento bajo, como el texto pegado ya advierte. El texto completo es de pago; solo leí su ficha pública.', fuente: 'en15194' },
    { texto: 'UNE-EN 17860-3:2024 (mecánica), 17860-5:2025 (electricidad) y 17860-6:2026 (pasajeros).', veredicto: 'matiz', comentario: 'La parte 3 existe y está vigente desde el 16-9-2024; la parte 5 figura como de 2024 (vigente desde el 31-12-2024), no 2025; la parte 6 no la encontré en el catálogo que consulté. Son normas de «ciclos de carga» (carrier cycles): que sirvan para un cuadriciclo de pasajeros lo decide el servicio técnico.', fuente: 'en17860' },
    { texto: 'El marcado CE de máquinas puede aplicar; el Reglamento 2023/1230 se aplica desde el 20 de enero de 2027.', veredicto: 'matiz', comentario: 'La EN 15194 trae un anexo informativo que la enlaza con la Directiva de máquinas 2006/42/CE; la fecha del Reglamento 2023/1230 coincide con lo que consta públicamente, pero no he releído el texto. Si el vehículo es una máquina a estos efectos no se da por hecho: hace falta la evaluación escrita que el texto aconseja.', fuente: 'maq2023' },
    { texto: 'No hace falta matrícula, ITV ni autorización de circulación.', veredicto: 'matiz', comentario: 'Cierto mientras el vehículo cumpla la definición: la Orden PJC/780/2025 lo excluye de «vehículo a motor». Pero la orden no dice «autorización de circulación» con esas palabras, y la frase de la DGT que cita el texto pegado no la he podido leer. Antes de vender, pide a la DGT una confirmación por escrito.', fuente: 'pjc780' },
    { texto: 'Volante, carrocería cerrada o pasajeros aumentan el riesgo de que no se considere un ciclo.', veredicto: 'no comprobado', comentario: 'Es una cautela razonable del autor del texto, pero no está en ninguna de las normas que leí: el RD 339/2014 no habla de volante ni de carrocería, y sí pide sistema de retención si lleva pasajeros. Por eso la evaluación de clasificación escrita es el primer paso.' },
  ],
  pasos: [
    { fase: 'Fase 1 · Diseñar conforme a la norma', titulo: 'Definir las especificaciones legales', resumen: 'La ficha técnica inicial: lo que tiene que cumplir para seguir siendo un ciclo.', quien: 'Tú y el ingeniero; esta pantalla te dice qué falla.', detalle: ['Motor de 250 W nominales continuos como mucho; ayuda hasta 25 km/h, que baja de forma progresiva y se corta al dejar de pedalear.', 'Pedales que de verdad propulsen; propulsión sobre todo muscular.', 'Cuatro ruedas permitidas en la definición de ciclo.', 'Pide por escrito a un ingeniero especializado que confirme que el diseño es un ciclo de pedales con pedaleo asistido y no un L1e-A o un L6e: es la primera inversión.'] },
    { titulo: 'Diseñar el chasis y los sistemas', resumen: 'Estructura, dirección, suspensión, transmisión, motor, batería, frenos, ruedas, asiento y protecciones.', quien: 'El ingeniero de diseño industrial o mecánico.', detalle: ['Chasis y estructura; dirección; suspensión si la lleva; transmisión por pedales.', 'Motor auxiliar, batería y controlador; frenos delanteros y traseros; ruedas y neumáticos.', 'Asiento y retención de pasajeros si hay; protecciones de las partes móviles.', 'Diseña desde el principio pensando en la estabilidad y el frenado: en cuatro ruedas son lo más importante.'] },
    { titulo: 'Cumplir lo específico de más de dos ruedas (anexo VI)', resumen: 'Es la base de diseño del primer prototipo.', quien: 'El ingeniero, con la tabla de arriba.', detalle: ['Declarar ocupantes, masa en vacío, carga máxima, velocidad recomendada y radio de giro.', 'Sin esquinas cortantes; transmisión protegida; frenos separados delante y detrás; presión en el neumático; estabilidad; timbre; retención de pasajeros.', 'Luces: blanca delante, roja detrás, reflector trasero rojo y cuatro laterales amarillos.'] },
    { fase: 'Fase 2 · Construir y validar el prototipo', titulo: 'Fabricar la primera unidad', resumen: 'Representativa del producto: la misma estructura y las mismas piezas que la serie.', quien: 'Tú.', detalle: ['Mismo chasis, motor, batería, controlador, frenos, neumáticos y geometría de dirección.', 'No cambies motor ni frenos después para fabricar las unidades: podría obligar a repetir la evaluación.'] },
    { titulo: 'Hacer los ensayos de seguridad', resumen: 'No hay homologación previa, pero sí hay que demostrar que se puede montar y usar con seguridad.', quien: 'Un laboratorio de ensayos mecánicos y eléctricos.', detalle: ['Estructura: resistencia del chasis. Frenado: parar el vehículo cargado. Estabilidad: vuelco lateral y longitudinal.', 'Dirección: control y radio de giro. Transmisión: sin atrapamientos.', 'Motor: potencia continua máxima; velocidad: corte de la ayuda a 25 km/h; pedaleo: corte al dejar de pedalear.', 'Batería: seguridad, cortocircuitos y sobrecalentamiento. Electricidad: cableado y conexiones.'] },
    { titulo: 'Elegir las normas técnicas de los ensayos', resumen: 'EN 15194 (apartado 4.2) para la asistencia, y la serie EN 17860 para mecánica, electricidad y pasajeros.', quien: 'El ingeniero, con el laboratorio.', detalle: ['Que sean normas EN o UNE-EN no las hace armonizadas ni da presunción legal de conformidad: comprobar su aplicabilidad y su publicación en el Diario Oficial de la UE.', 'Se compran en AENOR; las partes 3 y 5 de la EN 17860 son las más útiles para cuatro ruedas.'] },
    { titulo: 'Resolver el marcado CE de máquinas', resumen: 'Es independiente de la homologación de tráfico.', quien: 'Un ingeniero u organismo, por escrito.', detalle: ['Pide una evaluación escrita de si la normativa de máquinas aplica a tu vehículo; no des por hecho que la EN 15194 de bicicletas lo cubre entero.', 'Si aplica: evaluación de riesgos, expediente técnico, declaración CE, marcado CE y manual.', 'Si vas a fabricar en 2027, diseña ya con el Reglamento 2023/1230, aplicable desde el 20 de enero.', 'Revisa además batería, cargador, compatibilidad electromagnética y componentes electrónicos.'] },
    { fase: 'Fase 3 · Documentación para comercializar', titulo: 'Preparar el expediente técnico', resumen: 'El documento central: lo conserva el fabricante 10 años.', quien: 'El fabricante, con su ingeniero.', detalle: ['Descripción general, planos, cálculos de resistencia y estabilidad, evaluación de riesgos.', 'Normas aplicadas, informes de ensayo, documentación de motor, batería y frenos, manual, declaración de conformidad y procedimientos de producción.', 'Se guarda al menos 10 años desde la fabricación o, en serie, desde la última unidad.'] },
    { titulo: 'Firmar la declaración de conformidad', resumen: 'La firma el fabricante, sin que la Administración conceda nada antes.', quien: 'El responsable del fabricante.', detalle: ['Nombre y dirección del fabricante, marca y modelo, identificación del vehículo, normas usadas, legislación aplicable, sistema de control de la producción, fecha, lugar y firma.', 'No sustituye a la declaración CE que corresponda por la normativa de máquinas.'] },
    { titulo: 'Escribir el manual de instrucciones', resumen: 'Con cada unidad, en castellano como mínimo.', quien: 'El fabricante.', detalle: ['Descripción, uso previsto y límites, ocupantes y carga máxima, uso, advertencias de seguridad, mantenimiento.', 'Ajuste de frenos y transmisión, presión de neumáticos y riesgos residuales.'] },
    { titulo: 'Identificar cada vehículo', resumen: 'Una placa visible, legible e indeleble en cada unidad.', quien: 'El fabricante.', detalle: ['Razón social, dirección completa y número de serie; el modelo, marcado de forma permanente.', 'Ejemplo: Fabricante, modelo, número de serie y año de fabricación (los dos últimos son orientativos).'] },
    { fase: 'Fase 4 · Fabricar la serie', titulo: 'Montar el control de producción', resumen: 'No se homologa cada unidad, pero todas deben ser como el modelo documentado.', quien: 'El fabricante.', detalle: ['Inspección de materiales en cada recepción; verificación del chasis, pares de apriete, frenos y electricidad en cada unidad.', 'Control de soldaduras según un plan; corte de la ayuda a 25 km/h y al dejar de pedalear, y la inspección final, en cada unidad.', 'Número de serie individual y registro de los componentes; documentar cada cambio de diseño (motor, batería, frenos).'] },
    { titulo: 'Comercializar', resumen: 'Cada unidad sale con su documentación y sin matrícula.', quien: 'El fabricante.', detalle: ['Fabricar, asignar número de serie, inspección final.', 'Entregar la declaración de conformidad, el manual y la documentación y el marcado CE que corresponda.', 'No hace falta CoC de homologación ni matricular cada unidad.'] },
  ],
  vias: [],
  propia: {
    id: 'autocertificacion', nombre: 'Autocertificación del fabricante (RD 339/2014)', unidades: 'sin tope anual (100 o las que sean)', valeEn: 'España; para vender en otros países hay que ver sus reglas (por consultar)',
    cuando: 'No hay homologación previa ni una autoridad que la conceda: el fabricante demuestra él mismo que el ciclo es seguro y firma que cumple. Si no puede demostrarlo cuando se lo piden, se presume que no cumple.',
    piden: [
      { cosa: 'Evaluación escrita de clasificación', que: 'Un informe que dice que tu diseño concreto es un ciclo de pedales con pedaleo asistido y no un L1e-A o un L6e. Es lo que te protege si alguien lo discute.', quien: 'Un ingeniero especializado o un servicio técnico (INTA, IDIADA, INSIA, TÜV…).' },
      { cosa: 'Ensayos de seguridad', que: 'Estructura, frenado, estabilidad, dirección, transmisión, potencia, corte a 25 km/h, corte al dejar de pedalear, batería y electricidad.', quien: 'Un laboratorio de ensayos mecánicos y eléctricos (no hace falta uno designado por el Ministerio).' },
      { cosa: 'Normas técnicas aplicadas', que: 'Los documentos de pago con los que se hacen los ensayos: EN 15194 (apartado 4.2) y la serie EN 17860 (partes 3, 5 y, si hay pasajeros, la 6).', quien: 'AENOR las vende; el laboratorio sabe cuáles aplicar.' },
      { cosa: 'Expediente técnico', que: 'La carpeta que demuestra que el ciclo cumple: descripción, planos, cálculos, riesgos, normas, informes de ensayo, componentes, manual, declaración y control de producción.', quien: 'El fabricante con su ingeniero; se guarda 10 años.' },
      { cosa: 'Declaración de conformidad', que: 'El documento en el que el fabricante firma que el ciclo cumple el Real Decreto. Acompaña a cada unidad.', quien: 'El responsable del fabricante.' },
      { cosa: 'Manual y placa', que: 'El manual en castellano con cada unidad y una placa indeleble con razón social, dirección y número de serie.', quien: 'El fabricante.' },
      { cosa: 'Control de la producción', que: 'Las comprobaciones que haces a cada unidad para que todas sean como el modelo ensayado, y el registro de los componentes de cada una.', quien: 'El fabricante.' },
      { cosa: 'Evaluación de máquinas (marcado CE), si corresponde', que: 'Evaluación de riesgos, declaración CE y marcado CE, si la normativa de máquinas le aplica al vehículo.', quien: 'Un ingeniero u organismo, que lo deja por escrito.' },
    ],
    pasos: ['Cerrar por escrito que es un ciclo y no un L1e-A ni un L6e.', 'Diseñar con el anexo VI delante y construir el prototipo con las piezas definitivas.', 'Ensayar en un laboratorio y guardar los informes.', 'Preparar el expediente, la declaración de conformidad, el manual y la placa.', 'Resolver el marcado CE de máquinas.', 'Fabricar la serie con control de producción y entregar la documentación con cada unidad.'],
    ojo: ['Todo cuelga de seguir cumpliendo la definición: un motor de más de 250 W, un acelerador sin pedalear o un corte por encima de 25 km/h lo convierten en L1e-A o L6e, con homologación.', 'Sin límite anual no significa sin responsabilidad: el fabricante responde del diseño y de cada unidad.', 'Un cambio de motor, batería o frenos puede obligar a repetir ensayos: documéntalo siempre.'],
    fuentes: ['rd339', 'pjc780', 'en15194', 'en17860'],
  },
  tramites: [
    { tramite: 'Homologación individual de vehículo', hace: false }, { tramite: 'Homologación europea de tipo L1e', hace: false }, { tramite: 'Homologación nacional de serie corta', hace: false, nota: 'Por eso no rige el límite de 50 unidades al año de las series cortas.' },
    { tramite: 'Autorización administrativa de circulación', hace: false, nota: 'A confirmar con la DGT por escrito.' }, { tramite: 'Matrícula de la DGT', hace: false }, { tramite: 'Ficha técnica de ITV', hace: false }, { tramite: 'ITV periódica como vehículo L', hace: false },
    { tramite: 'Expediente técnico del fabricante', hace: true }, { tramite: 'Evaluación de seguridad y ensayos', hace: true }, { tramite: 'Declaración de conformidad', hace: true }, { tramite: 'Manual de instrucciones', hace: true },
    { tramite: 'Identificación de cada unidad', hace: true }, { tramite: 'Control de producción', hace: true }, { tramite: 'Evaluación CE de máquinas', hace: true, nota: 'Cuando corresponda.' },
  ],
  cuestiones: [
    { pregunta: '¿Para qué se usará?', opciones: 'Solo conductor · conductor y pasajeros · mercancías', porque: 'Con pasajeros, el anexo VI pide sistema de retención y la parte 6 de la EN 17860; con mercancías cuenta la carga máxima declarada.' },
    { pregunta: '¿Cómo se dirige?', opciones: 'Manillar de bicicleta · volante', porque: 'El RD 339/2014 no habla de volante. El autor del texto pegado lo considera un riesgo de que no se vea como ciclo: no está en las normas leídas, y la evaluación de clasificación lo debe resolver.' },
    { pregunta: '¿Cómo es la carrocería?', opciones: 'Abierto · con techo · habitáculo cerrado', porque: 'Igual que con el volante: no hay norma leída que lo prohíba, pero cuanto más se parezca a un coche, más hay que justificar que es un ciclo.' },
    { pregunta: '¿Cuál es el mercado?', opciones: 'Particulares · alquiler y turismo · flotas y empresas · toda la UE', porque: 'El RD 339/2014 es español; para vender en otros países hay que ver sus reglas (por consultar). El alquiler y las flotas cuentan como comercialización.' },
  ],
};

// ───────────────────────────────────────────────────────────── L6e / L7e, the heavy quadricycle
export const GUIA_PESADO: Guia = {
  id: 'pesado', titulo: 'L6e / L7e · cuadriciclo pesado', lema: 'Cuadriciclo de motor (coche sin carné o cuadriciclo pesado): ruedas, masa, potencia y plazas que dan su categoría',
  categorias: ['L6e-A', 'L6e-BP', 'L7e-CP', 'L7e-A2', 'L7e-A1'], porDefecto: 'L7e-CP',
  tabla: [
    { concepto: 'Ruedas', norma: 'Cuatro (las parejas a 460 mm o menos del mismo eje cuentan como una).', ref: 'Reglamento 168/2013, art. 3.72 y anexo I', fuente: 'r168art', req: 'ruedas' },
    { concepto: 'Masa en orden de marcha', norma: 'L6e hasta 425 kg; L7e de pasajeros hasta 450 kg; sin contar la batería de tracción ni los ocupantes.', ref: 'Anexo I; art. 5', fuente: 'r168art', req: 'masa' },
    { concepto: 'Potencia continua', norma: 'L6e-A: 4 kW; L6e-BP: 6 kW; L7e: hasta 15 kW.', ref: 'Anexo I', fuente: 'r168', req: 'potencia' },
    { concepto: 'Velocidad máxima', norma: 'L6e: 45 km/h; L7e-CP: 90 km/h.', ref: 'Anexo I', fuente: 'r168', req: 'vmax' },
    { concepto: 'Largo y ancho', norma: 'L6e-A y L7e-A hasta 4,00 × 2,00 m; L6e-B hasta 3,00 × 1,50 m; L7e-C hasta 3,70 × 1,50 m. Alto 2,50 m.', ref: 'Anexo I', fuente: 'r168', req: 'ancho' },
    { concepto: 'Plazas', norma: 'L6e: dos como mucho, con el conductor; L7e-CP: cuatro; L7e-A: dos.', ref: 'Anexo I', fuente: 'r168', req: 'plazas' },
    { concepto: 'Seguridad pasiva', norma: 'Cinturones, asientos, interior, estructura y salientes de 3/2014 y 44/2014; sin ensayos de choque como un turismo.', ref: 'Reglamentos 3/2014 y 44/2014', fuente: 'r3', req: 'cinturones' },
  ],
  revision: [
    { texto: 'Esta guía recoge lo que ya estaba en el catálogo de requisitos del editor (categorías L2e, L5e, L6e, L7e y M1).', veredicto: 'confirmado', comentario: 'Leído el 17-11-2026; los pasos concretos de esta homologación se desarrollarán en su propia página, como la de L1e-A, cuando Eugenio aporte su información.', fuente: 'r168' },
  ],
  pasos: [
    { titulo: 'Elegir la categoría', resumen: 'La que le toca al diseño por ruedas, masa, plazas y potencia.', quien: 'Esta pantalla (y luego el servicio técnico).', detalle: ['Debajo, el diseño frente a cada categoría pesada con lo que cumple y lo que no.'] },
    { titulo: 'Elegir la vía', resumen: 'Individual, serie corta o tipo UE.', quien: 'Tú, con el servicio técnico.', detalle: ['Las series cortas de L6e-A y L7e-A: 30 al año; L6e-B y L7e-C: 150 al año.'] },
  ],
  vias: ['individual', 'serie-corta', 'tipo-ue'],
};

export const GUIAS: Guia[] = [GUIA_EPAC, GUIA_L1EA, GUIA_PESADO];
