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
export interface Paso { titulo: string; resumen: string; quien: string; detalle: string[] }
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
    { concepto: 'Propulsión', norma: 'Ciclo diseñado para pedalear: se mueve pedaleando y el motor ayuda, no lo sustituye. Un pedalier que solo mueve un generador (sin cadena) no queda dicho en el texto: se confirma con el servicio técnico.', ref: 'Anexo I, criterios 9 y 10', fuente: 'r168anx3', req: 'epacPedales' },
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

export const GUIAS: Guia[] = [GUIA_L1EA, GUIA_PESADO];
