// The conformity matrix of the pedal cycle with pedal assistance (2026-11-24, Eugenio: «matriz de conformidad normativa,
// requisito por requisito, donde cada obligación legal esté vinculada a un plano, cálculo, ensayo, inspección o documento
// que demuestre su cumplimiento… creo que es la clave»). THE CATALOGUE AS DATA: what must exist. What somebody did about
// it (state, note, files) lives on the server (`almacen.ts`); this file never changes with it.
//
// One OBLIGATION (a legal duty) has one or more SLOTS («huecos»): the evidence that proves it. A slot is a plan, a
// calculation, a test, an inspection or a document. A slot tied to a test (`ensayo`) or a document (`doc`) takes its
// state from that test or document (ensayos.ts, documentos.ts); the rest are marked by hand.
//
// `verificada`: the obligation's wording was read in the legal text on 2026-11-24 (RD 339/2014 on the BOE). false: it
// comes from the text Eugenio pasted or from a standard we only know through its public summary, and the page says so.
import type { IdFuente } from '../normas';

export type TipoEvidencia = 'plano' | 'calculo' | 'ensayo' | 'inspeccion' | 'documento';
export const TIPOS: Record<TipoEvidencia, { nombre: string; plural: string }> = {
  plano: { nombre: 'Plano', plural: 'Planos' },
  calculo: { nombre: 'Cálculo', plural: 'Cálculos' },
  ensayo: { nombre: 'Ensayo', plural: 'Ensayos' },
  inspeccion: { nombre: 'Inspección', plural: 'Inspecciones' },
  documento: { nombre: 'Documento', plural: 'Documentos' },
};

export interface Hueco {
  id: string;
  tipo: TipoEvidencia;
  /** What exactly has to exist, in plain Spanish. */
  que: string;
  /** This slot IS that test / that document: its state comes from there. */
  ensayo?: string;
  doc?: string;
  /** This slot is the manufacturer's details being complete (the «Fabricante» form). */
  fab?: true;
  /** Checked on every unit that leaves the workshop, not once on the model. */
  porUnidad?: true;
}

export type IdGrupoMatriz = 'clasif' | 'mecanica' | 'electrica' | 'marcado' | 'expediente' | 'produccion';
export const GRUPOS_MATRIZ: { id: IdGrupoMatriz; nombre: string; lema: string }[] = [
  { id: 'clasif', nombre: 'Clasificación', lema: '¿es realmente un ciclo de pedales con pedaleo asistido y no un vehículo a motor?' },
  { id: 'mecanica', nombre: 'Seguridad mecánica', lema: 'frenos, dirección, estabilidad, luces, aristas y estructura (anexo VI del RD 339/2014)' },
  { id: 'electrica', nombre: 'Seguridad eléctrica y de máquinas', lema: 'motor, controlador, batería, cableado, cargador, CEM, software y marcado CE' },
  { id: 'marcado', nombre: 'Lo que lleva cada unidad', lema: 'placa, número de serie, modelo, manual, advertencias y reflectores: lo primero que mira una inspección' },
  { id: 'expediente', nombre: 'Expediente y declaraciones', lema: 'el expediente técnico, la declaración de conformidad y su archivo durante 10 años' },
  { id: 'produccion', nombre: 'Producción en serie', lema: 'cómo se garantiza que cada unidad es igual que la que se ensayó' },
];

export interface Obligacion {
  id: string;
  grupo: IdGrupoMatriz;
  /** 3: sin esto no se puede vender · 2: importante · 1: buena práctica o por confirmar. Orders the list and weights the %. */
  peso: 1 | 2 | 3;
  titulo: string;
  /** What the law asks, in one or two sentences. */
  exige: string;
  ref: string;
  fuente: IdFuente;
  verificada: boolean;
  /** Id of the design requirement (normas.ts) that checks this against the 3D design, so its verdict shows here. */
  diseno?: string;
  huecos: Hueco[];
}

const h = (id: string, tipo: TipoEvidencia, que: string, extra: Partial<Hueco> = {}): Hueco => ({ id, tipo, que, ...extra });

export const OBLIGACIONES: Obligacion[] = [
  // ───────────────────────────────────────────────────────────── Clasificación
  {
    id: 'O01', grupo: 'clasif', peso: 3, titulo: 'Es un ciclo: al menos dos ruedas, movido por la fuerza de las piernas',
    exige: 'Un ciclo es un vehículo de al menos dos ruedas propulsado exclusiva o principalmente por la energía muscular de las personas que lo utilizan.',
    ref: 'RD 339/2014, art. 2', fuente: 'rd339', verificada: true, diseno: 'epacRuedas',
    huecos: [h('a', 'plano', 'Plano de conjunto con el número y la posición de las ruedas'), h('b', 'documento', 'Declaración de clasificación del vehículo como ciclo de pedales con pedaleo asistido', { doc: 'd01' })],
  },
  {
    id: 'O02', grupo: 'clasif', peso: 3, titulo: 'Los pedales mueven el vehículo y no hay nada que lo mueva sin pedalear',
    exige: 'La propulsión es principalmente muscular. Los pedales no pueden ser decorativos, y no puede haber acelerador, puño ni botón que mueva el motor sin pedalear: eso lo convertiría en vehículo a motor.',
    ref: 'RD 339/2014, art. 2; Orden PJC/780/2025', fuente: 'pjc780', verificada: true, diseno: 'epacPedales',
    huecos: [
      h('a', 'plano', 'Diagrama de la transmisión: de los pedales a las ruedas'),
      h('b', 'inspeccion', 'Comprobar en el vehículo terminado que no existe ningún mando que mueva el motor sin pedalear'),
      h('c', 'ensayo', 'Ensayo: el motor no empuja si no se pedalea', { ensayo: 'e03' }),
    ],
  },
  {
    id: 'O03', grupo: 'clasif', peso: 3, titulo: 'Potencia nominal continua del motor de 250 W como mucho',
    exige: 'El motor auxiliar tiene una potencia nominal continua máxima de 250 W (no cuenta la punta). Con más, deja de ser un ciclo de pedales: pasa a ser un vehículo a motor, con otra normativa.',
    ref: 'Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h', fuente: 'pjc780', verificada: true, diseno: 'epacPotencia',
    huecos: [
      h('a', 'documento', 'Ficha técnica del motor y justificación de la potencia nominal continua'),
      h('b', 'documento', 'Características del controlador: límite de corriente y de potencia programado'),
      h('c', 'ensayo', 'Medición de la potencia nominal continua', { ensayo: 'e01' }),
    ],
  },
  {
    id: 'O04', grupo: 'clasif', peso: 3, titulo: 'La ayuda se corta a 25 km/h',
    exige: 'La asistencia se interrumpe antes de superar los 25 km/h. No limita la velocidad que se alcance pedaleando: limita hasta dónde empuja el motor.',
    ref: 'Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h', fuente: 'pjc780', verificada: true, diseno: 'epacVelocidad',
    huecos: [h('a', 'ensayo', 'Ensayo de corte de la asistencia a 25 km/h', { ensayo: 'e02' }), h('b', 'documento', 'Procedimiento de medida de la velocidad: sensor, tamaño de rueda usado y cómo se calibra')],
  },
  {
    id: 'O05', grupo: 'clasif', peso: 3, titulo: 'El motor se corta al dejar de pedalear',
    exige: 'Al dejar de pedalear la asistencia se interrumpe, y baja de forma progresiva al acercarse a la velocidad de corte.',
    ref: 'Orden PJC/780/2025; EN 15194 (apartado 4.2, citado por el anexo VI.8 del RD 339/2014)', fuente: 'pjc780', verificada: true, diseno: 'epacCorte',
    huecos: [h('a', 'ensayo', 'Ensayo de desconexión al dejar de pedalear', { ensayo: 'e03' }), h('b', 'plano', 'Diagrama de funcionamiento del sistema de asistencia: sensor de pedaleo → controlador → motor')],
  },
  {
    id: 'O06', grupo: 'clasif', peso: 2, titulo: 'Tensión nominal de la batería de 48 V como mucho',
    exige: 'La EN 15194 se aplica a ciclos con motor auxiliar de tensión nominal de hasta 48 V en corriente continua. Con más tensión queda fuera de la norma y de esta vía.',
    ref: 'EN 15194, campo de aplicación (ficha pública; la norma es de pago)', fuente: 'en15194', verificada: false, diseno: 'epacTension',
    huecos: [h('a', 'documento', 'Ficha de la batería con su tensión nominal'), h('b', 'inspeccion', 'Medir la tensión de la batería cargada y comprobar que la nominal declarada no pasa de 48 V')],
  },
  {
    id: 'O07', grupo: 'clasif', peso: 3, titulo: 'Revisión final de la clasificación antes de congelar el diseño',
    exige: 'Verificar que la arquitectura sigue siendo la de un ciclo y que no se ha introducido nada que lo convierta en vehículo a motor, sobre todo con volante, pasajeros o un sistema de aceleración independiente de los pedales.',
    ref: 'Recomendación del texto aportado; RD 339/2014, art. 2', fuente: 'rd339', verificada: false,
    huecos: [h('a', 'documento', 'Decisión de clasificación firmada, con el diseño congelado', { doc: 'd01' }), h('b', 'inspeccion', 'Revisión de volante, plazas y mandos del diseño congelado')],
  },

  // ───────────────────────────────────────────────────────────── Seguridad mecánica (anexo VI)
  {
    id: 'O10', grupo: 'mecanica', peso: 3, titulo: 'Declarar plazas, masa, carga máxima y velocidad máxima recomendada',
    exige: 'El fabricante declara el número de ocupantes, la masa del vehículo, la carga máxima y la velocidad máxima recomendada, y los pone en la documentación.',
    ref: 'RD 339/2014, anexo VI, punto 1', fuente: 'rd339', verificada: true, diseno: 'epacDeclarar',
    huecos: [h('a', 'documento', 'Ficha técnica con plazas, masa en vacío, carga máxima y velocidad recomendada', { doc: 'd10' }), h('b', 'documento', 'Los mismos datos en el manual', { doc: 'd08' })],
  },
  {
    id: 'O11', grupo: 'mecanica', peso: 2, titulo: 'Sin esquinas cortantes',
    exige: 'Ninguna arista o esquina del vehículo puede ser cortante o producir lesiones.',
    ref: 'RD 339/2014, anexo VI, punto 1.1', fuente: 'rd339', verificada: true, diseno: 'epacEsquinas',
    huecos: [h('a', 'inspeccion', 'Inspección visual y al tacto de todas las aristas, con fotos', { porUnidad: true }), h('b', 'ensayo', 'Inspección de aristas y protecciones', { ensayo: 'e14' })],
  },
  {
    id: 'O12', grupo: 'mecanica', peso: 3, titulo: 'Transmisión protegida contra atrapamientos',
    exige: 'Los elementos de la transmisión (cadena, plato, correa) van protegidos de forma que no atrapen ropa ni dedos.',
    ref: 'RD 339/2014, anexo VI, punto 1.2', fuente: 'rd339', verificada: true, diseno: 'epacEsquinas',
    huecos: [h('a', 'plano', 'Plano de las protecciones de la transmisión'), h('b', 'ensayo', 'Inspección de aristas y protecciones', { ensayo: 'e14' })],
  },
  {
    id: 'O13', grupo: 'mecanica', peso: 3, titulo: 'Frenos independientes delante y detrás, regulables',
    exige: 'Frenos que actúan por separado en las ruedas delanteras y traseras, con la palanca delantera a la izquierda y la trasera a la derecha, y regulables.',
    ref: 'RD 339/2014, anexo VI, punto 2', fuente: 'rd339', verificada: true, diseno: 'epacFrenos',
    huecos: [
      h('a', 'plano', 'Plano del sistema de frenos con la posición de las palancas'),
      h('b', 'documento', 'Fichas de los componentes de freno (frenos, palancas, latiguillos o cables)'),
      h('c', 'ensayo', 'Ensayo de frenado', { ensayo: 'e04' }),
    ],
  },
  {
    id: 'O14', grupo: 'mecanica', peso: 3, titulo: 'Frenada estable: parada segura en seco, sin perder el control',
    exige: 'Las prestaciones de frenado permiten detener el vehículo de forma segura en suelo seco, sin pérdida de control.',
    ref: 'RD 339/2014, anexo VI, punto 2', fuente: 'rd339', verificada: true, diseno: 'epacFrenos',
    huecos: [h('a', 'calculo', 'Cálculo de la distancia de frenado y del reparto de frenada delante y detrás'), h('b', 'ensayo', 'Ensayo de frenado', { ensayo: 'e04' })],
  },
  {
    id: 'O15', grupo: 'mecanica', peso: 3, titulo: 'Dirección: puños, marca de inserción y radio de giro declarado',
    exige: 'Puños adecuados, marca de inserción mínima del manillar o la potencia, rueda delantera centrada y radio de giro declarado a la velocidad máxima recomendada.',
    ref: 'RD 339/2014, anexo VI, punto 3', fuente: 'rd339', verificada: true, diseno: 'epacDireccion',
    huecos: [h('a', 'plano', 'Plano de la dirección y el manillar'), h('b', 'ensayo', 'Ensayo de radio de giro y dirección', { ensayo: 'e06' }), h('c', 'inspeccion', 'Marca de inserción mínima visible y dirección centrada', { porUnidad: true })],
  },
  {
    id: 'O16', grupo: 'mecanica', peso: 2, titulo: 'Presión de inflado recomendada marcada en el neumático',
    exige: 'Los neumáticos llevan marcada la presión de inflado recomendada.',
    ref: 'RD 339/2014, anexo VI, punto 4.1', fuente: 'rd339', verificada: true, diseno: 'epacNeumaticos',
    huecos: [h('a', 'inspeccion', 'Comprobar el marcado de presión en cada neumático, con foto', { porUnidad: true }), h('b', 'documento', 'La presión recomendada, en el manual', { doc: 'd08' })],
  },
  {
    id: 'O17', grupo: 'mecanica', peso: 1, titulo: 'Sillín: marca de inserción mínima',
    exige: 'El sillín lleva una marca de inserción mínima.',
    ref: 'RD 339/2014, anexo VI, punto 5.1', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'inspeccion', 'Marca de inserción mínima visible en el sillín o su tija', { porUnidad: true })],
  },
  {
    id: 'O18', grupo: 'mecanica', peso: 3, titulo: 'Luz blanca delante y luz roja detrás',
    exige: 'Al menos una luz blanca delante y una luz roja detrás, con la intensidad de los anexos V y VI (delante entre 4 y 60 candelas, detrás entre 4 y 12).',
    ref: 'RD 339/2014, anexo VI, punto 6, y anexo V', fuente: 'rd339', verificada: true, diseno: 'epacLuces',
    huecos: [h('a', 'plano', 'Esquema eléctrico y posición de las luces'), h('b', 'documento', 'Fichas de las luces: marca de homologación e intensidad'), h('c', 'ensayo', 'Luces y catadióptricos', { ensayo: 'e13' })],
  },
  {
    id: 'O19', grupo: 'mecanica', peso: 3, titulo: 'Un reflector trasero rojo y cuatro laterales amarillos',
    exige: 'Un catadióptrico trasero rojo no triangular (categoría IA) y cuatro laterales amarillos no triangulares (categoría IVA): dos en las ruedas delanteras, dos en las traseras, uno por lado.',
    ref: 'RD 339/2014, anexo VI, punto 6, y anexo V (Reglamento UN 3)', fuente: 'rd339', verificada: true, diseno: 'epacLuces',
    huecos: [h('a', 'documento', 'Marcado de homologación de los catadióptricos (UN 3) en la ficha del proveedor'), h('b', 'inspeccion', 'En cada unidad: 1 trasero rojo y 4 laterales amarillos, visibles y bien colocados', { porUnidad: true })],
  },
  {
    id: 'O20', grupo: 'mecanica', peso: 3, titulo: 'Estabilidad: el reparto de masas evita el vuelco longitudinal y el lateral',
    exige: 'La distribución de masas evita el vuelco longitudinal y lateral en las condiciones de uso previstas. La ley no da una cifra: la fija el ensayo.',
    ref: 'RD 339/2014, anexo VI, punto 10', fuente: 'rd339', verificada: true, diseno: 'epacEstabilidad',
    huecos: [h('a', 'calculo', 'Cálculo del umbral de vuelco y del reparto de masas (sale del modelo 3D)'), h('b', 'ensayo', 'Ensayo de estabilidad: vacío, carga máxima, carga desplazada, giro y frenada', { ensayo: 'e05' })],
  },
  {
    id: 'O21', grupo: 'mecanica', peso: 2, titulo: 'Retención de los pasajeros',
    exige: 'Si el ciclo lleva pasajeros, cada uno lleva un sistema de retención que lo proteja. Si solo lleva al conductor, no aplica.',
    ref: 'RD 339/2014, anexo VI, punto 9', fuente: 'rd339', verificada: true, diseno: 'epacPasajeros',
    huecos: [h('a', 'plano', 'Plano de cada plaza con su cinturón o arnés (o la declaración de que solo lleva conductor)'), h('b', 'ensayo', 'Resistencia de dirección, horquilla, ejes y anclajes', { ensayo: 'e08' })],
  },
  {
    id: 'O22', grupo: 'mecanica', peso: 2, titulo: 'Timbre conforme al Reglamento General de Vehículos',
    exige: 'Advertencia acústica conforme al artículo 22 del Reglamento General de Vehículos: un timbre al alcance del conductor.',
    ref: 'RD 339/2014, anexo VI, punto 11; RGV art. 22', fuente: 'rd339', verificada: true, diseno: 'epacTimbre',
    huecos: [h('a', 'inspeccion', 'Timbre montado al alcance del conductor y audible', { porUnidad: true }), h('b', 'documento', 'Ficha del timbre')],
  },
  {
    id: 'O23', grupo: 'mecanica', peso: 3, titulo: 'Resistencia estructural del bastidor',
    exige: 'El vehículo resiste las cargas del uso previsto sin roturas ni deformaciones peligrosas. No hay una cifra en el RD 339/2014: se justifica con cálculos y ensayos (la EN 17860-3 es la referencia técnica de ciclos utilitarios, por confirmar).',
    ref: 'Texto aportado («¿es estructuralmente seguro?»); EN 17860-3', fuente: 'en17860', verificada: false,
    huecos: [h('a', 'plano', 'Planos constructivos y especificación de materiales'), h('b', 'calculo', 'Cálculo estructural del bastidor: cargas máximas y fatiga'), h('c', 'ensayo', 'Resistencia estructural del bastidor', { ensayo: 'e07' })],
  },
  {
    id: 'O24', grupo: 'mecanica', peso: 3, titulo: 'Asistencia eléctrica según el apartado 4.2 de la EN 15194',
    exige: 'La asistencia eléctrica cumple el apartado 4.2 de la UNE-EN 15194. Es la única vez que el RD 339/2014 manda aplicar esa norma, y por eso se necesita su texto (de pago).',
    ref: 'RD 339/2014, anexo VI, punto 8', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Tabla del apartado 4.2 de la EN 15194: cada punto y dónde se cumple'), h('b', 'ensayo', 'Corte de la asistencia a 25 km/h', { ensayo: 'e02' })],
  },

  // ───────────────────────────────────────────────────────────── Seguridad eléctrica y de máquinas
  {
    id: 'O30', grupo: 'electrica', peso: 3, titulo: 'Análisis de riesgos del vehículo',
    exige: 'Lista de peligros, evaluación de riesgos, medidas de prevención y protección, riesgos residuales y justificación de las soluciones (método de la EN ISO 12100).',
    ref: 'Directiva 2006/42/CE, anexo I; EN ISO 12100; RD 339/2014, anexo III', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'documento', 'Evaluación de riesgos', { doc: 'd04' }), h('b', 'documento', 'Revisión de la evaluación tras los resultados de los ensayos')],
  },
  {
    id: 'O31', grupo: 'electrica', peso: 2, titulo: 'Motor: potencia, funcionamiento y comportamiento ante fallos',
    exige: 'Está documentado cómo funciona el motor y qué pasa si falla (corte, bloqueo, sobretemperatura).',
    ref: 'Texto aportado (sección C); Directiva 2006/42/CE, anexo I', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'documento', 'Ficha técnica del motor del proveedor'), h('b', 'ensayo', 'Temperatura del motor, el controlador y la batería', { ensayo: 'e11' })],
  },
  {
    id: 'O32', grupo: 'electrica', peso: 3, titulo: 'Controlador: límites de potencia y de velocidad',
    exige: 'El controlador impone el límite de potencia y el de velocidad, y no se pueden saltar con un gesto sencillo.',
    ref: 'Texto aportado (sección C); EN 15194', fuente: 'en15194', verificada: false,
    huecos: [h('a', 'documento', 'Ficha del controlador y capturas de los parámetros programados'), h('b', 'ensayo', 'Corte de la asistencia a 25 km/h', { ensayo: 'e02' })],
  },
  {
    id: 'O33', grupo: 'electrica', peso: 3, titulo: 'Sensor de pedaleo: funcionamiento y desconexión segura',
    exige: 'El sensor de pedaleo activa la asistencia solo al pedalear y la desconecta al dejar de hacerlo, también si el sensor falla.',
    ref: 'Texto aportado (sección C); EN 15194', fuente: 'en15194', verificada: false,
    huecos: [h('a', 'documento', 'Ficha del sensor de pedaleo'), h('b', 'ensayo', 'Desconexión al dejar de pedalear', { ensayo: 'e03' })],
  },
  {
    id: 'O34', grupo: 'electrica', peso: 3, titulo: 'Batería segura: protecciones, BMS y documentación del fabricante de la batería',
    exige: 'Una batería sellada de hasta 25 kg para tracción es una batería LMT. Su fabricante da la declaración UE de conformidad, el marcado CE, el modelo y el lote, la documentación técnica y las instrucciones de seguridad. Si la batería la diseñas y vendes con tu marca, asumes tú esas obligaciones.',
    ref: 'Reglamento (UE) 2023/1542', fuente: 'bat2023', verificada: false,
    huecos: [
      h('a', 'documento', 'Declaración UE de conformidad y marcado CE de la batería'),
      h('b', 'documento', 'Modelo y lote, documentación técnica, instrucciones y advertencias de seguridad del proveedor'),
      h('c', 'ensayo', 'Batería y cargador: protecciones y carga', { ensayo: 'e10' }),
    ],
  },
  {
    id: 'O35', grupo: 'electrica', peso: 2, titulo: 'Cableado: secciones, aislamiento, protecciones y conexiones',
    exige: 'Los cables están dimensionados para su corriente, aislados, protegidos del roce y con conexiones que no se sueltan.',
    ref: 'Texto aportado (sección C); Directiva 2006/42/CE, anexo I', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'plano', 'Esquema eléctrico con las secciones de cable y los conectores'), h('b', 'ensayo', 'Seguridad eléctrica: aislamiento, protecciones, cableado y fusibles', { ensayo: 'e09' })],
  },
  {
    id: 'O36', grupo: 'electrica', peso: 3, titulo: 'Fusibles: protección frente a sobreintensidades',
    exige: 'Un fallo no puede dejar pasar una corriente que caliente cables o batería: hay una protección dimensionada para ello.',
    ref: 'Texto aportado (sección C); Directiva 2006/42/CE, anexo I', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'calculo', 'Cálculo del fusible o disyuntor según la corriente máxima'), h('b', 'ensayo', 'Seguridad eléctrica: aislamiento, protecciones, cableado y fusibles', { ensayo: 'e09' })],
  },
  {
    id: 'O37', grupo: 'electrica', peso: 2, titulo: 'Cargador: seguridad eléctrica y compatibilidad',
    exige: 'El cargador es seguro y compatible con la batería, y lleva su propio marcado y documentación.',
    ref: 'Texto aportado (sección C); Reglamento (UE) 2023/1542', fuente: 'bat2023', verificada: false,
    huecos: [h('a', 'documento', 'Marcado CE y ficha del cargador'), h('b', 'ensayo', 'Batería y cargador: protecciones y carga', { ensayo: 'e10' })],
  },
  {
    id: 'O38', grupo: 'electrica', peso: 2, titulo: 'Perturbaciones electromagnéticas (CEM)',
    exige: 'La electrónica no se estropea por interferencias ni las produce por encima de lo permitido.',
    ref: 'Texto aportado (sección C); Directiva 2006/42/CE, anexo I', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'documento', 'Declaraciones de CEM del motor, el controlador y el cargador'), h('b', 'ensayo', 'Compatibilidad electromagnética', { ensayo: 'e12' })],
  },
  {
    id: 'O39', grupo: 'electrica', peso: 2, titulo: 'Sin sobrecalentamientos peligrosos',
    exige: 'Ni el motor, ni el controlador, ni la batería alcanzan temperaturas peligrosas en uso previsto.',
    ref: 'Texto aportado (sección C)', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'calculo', 'Estimación térmica del motor, el controlador y la batería'), h('b', 'ensayo', 'Temperatura del motor, el controlador y la batería', { ensayo: 'e11' })],
  },
  {
    id: 'O40', grupo: 'electrica', peso: 2, titulo: 'Software: gestión de seguridad y protección frente a modificaciones peligrosas',
    exige: 'El programa del controlador no se puede alterar fácilmente para saltarse los límites.',
    ref: 'Texto aportado (sección C)', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'documento', 'Descripción del firmware y de cómo se protegen los parámetros'), h('b', 'inspeccion', 'Parámetros bloqueados en la unidad entregada', { porUnidad: true })],
  },
  {
    id: 'O41', grupo: 'electrica', peso: 3, titulo: 'Marcado CE y declaración UE de conformidad de máquinas',
    exige: 'Es una segunda capa, distinta de la declaración española: hasta el 19-1-2027 rige la Directiva 2006/42/CE y desde el 20-1-2027 el Reglamento (UE) 2023/1230. Para una máquina ordinaria basta el control interno de la producción. Una declaración no sustituye a la otra.',
    ref: 'Directiva 2006/42/CE; Reglamento (UE) 2023/1230', fuente: 'maq2023', verificada: false, diseno: 'epacMaquinas',
    huecos: [
      h('a', 'documento', 'Declaración UE de conformidad de máquinas', { doc: 'd07' }),
      h('b', 'documento', 'Justificación de que se usa el control interno de la producción (no es máquina de alto riesgo)'),
      h('c', 'inspeccion', 'Marcado CE colocado en cada unidad', { porUnidad: true }),
    ],
  },
  {
    id: 'O42', grupo: 'electrica', peso: 1, titulo: 'Seguridad general de los productos',
    exige: 'El texto aportado cita este reglamento como referencia: datos de contacto y trazabilidad del producto. Si aplica o no a este vehículo hay que confirmarlo.',
    ref: 'Reglamento (UE) 2023/988', fuente: 'gpsr2023', verificada: false,
    huecos: [h('a', 'documento', 'Confirmar si aplica y, si aplica, datos de contacto y trazabilidad en el producto')],
  },

  // ───────────────────────────────────────────────────────────── Lo que lleva cada unidad
  {
    id: 'O50', grupo: 'marcado', peso: 3, titulo: 'Placa del fabricante: razón social, dirección completa y número de serie',
    exige: 'Cada unidad lleva una placa visible, legible e indeleble con la razón social, la dirección completa del fabricante (o su representante) y el número de serie.',
    ref: 'RD 339/2014, art. 3', fuente: 'rd339', verificada: true, diseno: 'epacPlaca',
    huecos: [
      h('a', 'plano', 'Plano de la placa: texto, tamaño, material y lugar'),
      h('b', 'documento', 'Datos del fabricante completos', { fab: true }),
      h('c', 'inspeccion', 'Placa colocada y legible en cada unidad, con foto', { porUnidad: true }),
    ],
  },
  {
    id: 'O51', grupo: 'marcado', peso: 3, titulo: 'Modelo identificado de forma legible y permanente',
    exige: 'El modelo del ciclo está identificado de forma legible y permanente en el propio vehículo.',
    ref: 'RD 339/2014, art. 3', fuente: 'rd339', verificada: true, diseno: 'epacPlaca',
    huecos: [h('a', 'inspeccion', 'Modelo grabado o marcado de forma permanente', { porUnidad: true })],
  },
  {
    id: 'O52', grupo: 'marcado', peso: 2, titulo: 'Año de fabricación y formato del número de serie',
    exige: 'El número de serie tiene un formato fijado y trazable. El año de fabricación lo pide además el marcado de máquinas (anexo I, 1.7.3 de la Directiva 2006/42/CE: por confirmar).',
    ref: 'RD 339/2014, art. 3; Directiva 2006/42/CE, anexo I, 1.7.3', fuente: 'maq2006', verificada: false,
    huecos: [h('a', 'documento', 'Regla del número de serie y del año de fabricación'), h('b', 'inspeccion', 'Año y número de serie en la placa de cada unidad', { porUnidad: true })],
  },
  {
    id: 'O53', grupo: 'marcado', peso: 3, titulo: 'Documentación de conformidad y manual con cada unidad',
    exige: 'Cada unidad comercializada va acompañada de la documentación de conformidad y del manual de instrucciones.',
    ref: 'RD 339/2014, art. 3', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Declaración de conformidad en el paquete de cada unidad', { doc: 'd06' }), h('b', 'inspeccion', 'Cada unidad sale con ambos documentos', { porUnidad: true })],
  },
  {
    id: 'O54', grupo: 'marcado', peso: 3, titulo: 'Manual de instrucciones en castellano con el contenido del anexo II',
    exige: 'Manual en castellano (o traducción marcada «Traducción del manual original»): uso previsto y mal uso previsible, carga máxima, plazas, riesgos residuales, montaje, mantenimiento y eliminación.',
    ref: 'RD 339/2014, anexo II y anexo VI, punto 12', fuente: 'rd339', verificada: true, diseno: 'epacManual',
    huecos: [h('a', 'documento', 'Manual de instrucciones y mantenimiento', { doc: 'd08' }), h('b', 'inspeccion', 'Lectura del manual por alguien que no lo escribió: ¿se entiende?')],
  },
  {
    id: 'O55', grupo: 'marcado', peso: 3, titulo: 'Información y advertencias de seguridad, al menos en castellano',
    exige: 'Toda la información y las advertencias necesarias para un uso seguro están disponibles al menos en castellano.',
    ref: 'RD 339/2014, art. 3', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Advertencias y marcado', { doc: 'd11' }), h('b', 'inspeccion', 'Etiquetas de advertencia visibles en el vehículo', { porUnidad: true })],
  },
  {
    id: 'O56', grupo: 'marcado', peso: 2, titulo: 'Carga máxima, plazas y límites de uso a la vista',
    exige: 'El comprador sabe cuánta carga y cuántas plazas admite el vehículo, y para qué uso está pensado.',
    ref: 'RD 339/2014, anexos II y VI, punto 1', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Etiqueta con carga máxima y número de plazas', { doc: 'd11' })],
  },

  // ───────────────────────────────────────────────────────────── Expediente y declaraciones
  {
    id: 'O60', grupo: 'expediente', peso: 3, titulo: 'Expediente técnico elaborado antes de comercializar',
    exige: 'El fabricante elabora el expediente técnico antes de comercializar el ciclo: planos, cálculos, resultados de ensayos, normas aplicadas y control de la producción. No hay control previo de la Administración.',
    ref: 'RD 339/2014, art. 4 y anexo III', fuente: 'rd339', verificada: true, diseno: 'epacExpediente',
    huecos: [h('a', 'documento', 'Expediente técnico de diseño y fabricación', { doc: 'd03' }), h('b', 'documento', 'Índice del expediente con cada apartado enlazado a su evidencia', { doc: 'd02' })],
  },
  {
    id: 'O61', grupo: 'expediente', peso: 3, titulo: 'Declaración de conformidad con los ocho datos del anexo I',
    exige: 'Razón social y dirección, descripción con marca y modelo, declaración de que cumple el real decreto, normas armonizadas y otras normas usadas, sistema de control de la producción, lugar y fecha, e identificación, cargo y firma de la persona que firma.',
    ref: 'RD 339/2014, anexo I', fuente: 'rd339', verificada: true, diseno: 'epacExpediente',
    huecos: [h('a', 'documento', 'Declaración de conformidad del RD 339/2014', { doc: 'd06' }), h('b', 'documento', 'Datos del fabricante completos', { fab: true })],
  },
  {
    id: 'O62', grupo: 'expediente', peso: 2, titulo: 'Conservar el expediente al menos diez años',
    exige: 'El expediente y la declaración están disponibles para las autoridades al menos diez años desde la fabricación, o desde la de la última unidad en una serie.',
    ref: 'RD 339/2014, art. 4', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Procedimiento de archivo: dónde, quién y copia de seguridad durante diez años')],
  },
  {
    id: 'O63', grupo: 'expediente', peso: 2, titulo: 'Normas armonizadas y otras especificaciones, referenciadas',
    exige: 'La declaración y el expediente citan las normas armonizadas usadas y las demás especificaciones técnicas, con lo que cubre cada una.',
    ref: 'RD 339/2014, anexos I y III; anexo IV', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Matriz de requisitos legales y normativa aplicable', { doc: 'd02' })],
  },
  {
    id: 'O64', grupo: 'expediente', peso: 2, titulo: 'Poder responder a una inspección de vigilancia del mercado',
    exige: 'La Administración puede comprobar productos ya comercializados, pedir documentación y, si detecta incumplimientos, ordenar su corrección, prohibir su comercialización, retirarlos o incluso destruirlos.',
    ref: 'RD 339/2014, art. 5', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Procedimiento de respuesta: quién contesta, en cuánto tiempo y cómo se retira una unidad')],
  },

  // ───────────────────────────────────────────────────────────── Producción en serie
  {
    id: 'O70', grupo: 'produccion', peso: 3, titulo: 'Sistema de control de la producción',
    exige: 'El fabricante describe y aplica el sistema con el que cada unidad fabricada es conforme con el tipo ensayado. Es el sexto dato de la declaración.',
    ref: 'RD 339/2014, anexo I (dato 6) y anexo III', fuente: 'rd339', verificada: true,
    huecos: [h('a', 'documento', 'Plan de control de producción y trazabilidad', { doc: 'd09' })],
  },
  {
    id: 'O71', grupo: 'produccion', peso: 2, titulo: 'Control de proveedores e inspección de los componentes que llegan',
    exige: 'Los componentes críticos vienen de proveedores conocidos y se comprueban a la entrada.',
    ref: 'Texto aportado (producción en serie)', fuente: 'rd339', verificada: false,
    huecos: [h('a', 'documento', 'Lista de proveedores y criterios de aceptación'), h('b', 'inspeccion', 'Registro de recepción de la primera partida')],
  },
  {
    id: 'O72', grupo: 'produccion', peso: 3, titulo: 'Controles de montaje y verificación final de cada unidad',
    exige: 'Cada unidad pasa una hoja de control final (frenos, luces, placa, timbre, par de apriete, reflectores) antes de salir.',
    ref: 'Texto aportado (producción en serie)', fuente: 'rd339', verificada: false,
    huecos: [h('a', 'documento', 'Hoja de control final de cada unidad'), h('b', 'inspeccion', 'Hoja rellenada para la unidad 1', { porUnidad: true })],
  },
  {
    id: 'O73', grupo: 'produccion', peso: 2, titulo: 'Trazabilidad: número de serie, componentes y pruebas',
    exige: 'Si la Administración pregunta por una unidad, se puede reconstruir qué componentes se montaron, qué inspecciones se hicieron y qué resultados dieron.',
    ref: 'Texto aportado (producción en serie)', fuente: 'rd339', verificada: false,
    huecos: [h('a', 'documento', 'Registro de unidades fabricadas')],
  },
  {
    id: 'O74', grupo: 'produccion', peso: 1, titulo: 'Gestión de modificaciones',
    exige: 'Cualquier cambio de diseño o de componente se registra y decide qué hay que volver a ensayar.',
    ref: 'Texto aportado (producción en serie)', fuente: 'rd339', verificada: false,
    huecos: [h('a', 'documento', 'Procedimiento de cambios: qué se vuelve a ensayar')],
  },
];

export const obligacion = (id: string) => OBLIGACIONES.find(o => o.id === id);
/** The matrix's keys on the server: one JSON per obligation (≈13 KB at the very most), far under the server's 80 KB limit. */
export const claveObligacion = (id: string) => `matriz-${id.toLowerCase()}`;
/** Obligations whose slots are this test / this document (the reverse of the link, never written twice). */
export const obligacionesDeEnsayo = (id: string) => OBLIGACIONES.filter(o => o.huecos.some(x => x.ensayo === id));
export const obligacionesDeDoc = (id: string) => OBLIGACIONES.filter(o => o.huecos.some(x => x.doc === id));
