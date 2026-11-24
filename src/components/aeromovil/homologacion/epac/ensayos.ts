// The 14 tests of the pedal cycle's file (2026-11-24, Eugenio: «crea un programita para poder hacer cada uno de los
// ensayos y apuntar los resultados del ensayo, cómo se ha hecho el ensayo, cómo ha sido la prueba… cuando pongo los
// resultados pues se genera el documento»). THE CATALOGUE AS DATA: what each test is for, with what, how, and which
// results to write down. What was measured (attempts, values, conclusion, signature) lives on the server (`almacen.ts`).
//
// The RD 339/2014 (anexo III) lets the manufacturer run the tests himself. It gives NO test method and almost no
// numbers: the methods come from the standards (EN 15194, ISO 4210, EN 17860: paid texts we have only read as public
// summaries). So `criterioLegal` is true only where the acceptance number is in a law we read (250 W, 25 km/h, the light
// intensities); everywhere else the page says the criterion is the engineer's, and the report records the one he adopted
// and where he took it from. The procedures here are a proposal to follow, not a copy of a standard.
import type { FichaHomologacion } from '../ficha';

export interface CampoResultado {
  id: string; etiqueta: string; tipo: 'num' | 'texto' | 'sino';
  unidad?: string; ayuda?: string;
  /** What the 3D design says for this field, to compare with what is measured (null: the design does not know). */
  diseno?: (f: FichaHomologacion) => string | null;
}

export interface Ensayo {
  id: string; codigo: string; titulo: string;
  /** 3: sin este ensayo no se puede vender · 2: importante · 1: complementario. Weights the % of tests done. */
  peso: 1 | 2 | 3;
  objetivo: string;
  norma: string; normaLeida: boolean;
  instrumentos: string[]; preparacion: string[]; procedimiento: string[]; condiciones: string[];
  criterio: string; criterioLegal: boolean;
  campos: CampoResultado[];
  ojo?: string[];
}

const kg = (v: number | null | undefined) => v == null ? null : `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg`;
const n1 = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** The unit's configuration as the 3D design has it, to pre-fill every report («configuración del vehículo»). */
export function configuracionDeDiseno(f: FichaHomologacion): string {
  const p: string[] = [`Vehículo: ${f.vehiculo}.`, `Ruedas: ${f.ruedasFisicas}${f.plazas != null ? `; plazas: ${f.plazas}` : ''}.`];
  if (f.masaVacio != null) p.push(`Masa en vacío (batería incluida): ${kg(f.masaVacio)}.`);
  if (f.masaMaxima != null) p.push(`Masa máxima (todas las plazas y el equipaje): ${kg(f.masaMaxima)}.`);
  if (f.potenciaCategoria != null) p.push(`Potencia del motor: ${n1(f.potenciaCategoria * 1000)} W.`);
  if (f.vmax != null) p.push(`Velocidad máxima con motor: ${n1(f.vmax)} km/h.`);
  if (f.largo != null && f.ancho != null) p.push(`Largo ${n1(f.largo * 1000)} mm × ancho ${n1(f.ancho * 1000)} mm.`);
  p.push('Componentes (motor, controlador, batería, frenos, neumáticos…): marca y modelo de cada uno, y número de serie de la unidad.');
  return p.join(' ');
}

const SI_NO = (id: string, etiqueta: string, ayuda?: string): CampoResultado => ({ id, etiqueta, tipo: 'sino', ayuda });
const NUM = (id: string, etiqueta: string, unidad: string, extra: Partial<CampoResultado> = {}): CampoResultado => ({ id, etiqueta, tipo: 'num', unidad, ...extra });
const TXT = (id: string, etiqueta: string, ayuda?: string): CampoResultado => ({ id, etiqueta, tipo: 'texto', ayuda });

const SIN_NORMA = 'El RD 339/2014 no da el método ni la cifra: los fija la norma técnica (EN 15194 y la serie ISO 4210, de pago, no leídas). Escribe en el informe el criterio que adoptes y de dónde lo sacas.';

export const ENSAYOS: Ensayo[] = [
  {
    id: 'e01', codigo: 'EN-01', titulo: 'Potencia nominal continua del motor', peso: 3,
    objetivo: 'Demostrar que el motor de ayuda no pasa de 250 W nominales continuos. Es lo que separa un ciclo de pedales de un vehículo a motor.',
    norma: 'Orden PJC/780/2025 (el límite). El método de medida lo da la EN 15194 (de pago, no leída): anota el que uses.', normaLeida: false,
    instrumentos: ['Vatímetro o analizador de potencia en el cable de la batería (tensión y corriente)', 'Banco de rodillos o un tramo llano y largo, y un registrador de datos', 'Termómetro de contacto o infrarrojo'],
    preparacion: ['Batería cargada al 100 % y a temperatura ambiente', 'Anota los parámetros del controlador (límite de corriente y de potencia) con una captura', 'Comprueba que el vatímetro está calibrado o contrastado con otro'],
    procedimiento: ['Con el vehículo en el banco o en un tramo llano, pon la asistencia al máximo y pedalea hasta que el motor entregue su régimen más alto sostenido', 'Mantén ese régimen hasta que la potencia se estabilice y anota la potencia eléctrica que entra al motor', 'Registra la potencia cada segundo durante al menos diez minutos y calcula el valor continuo (no el pico)', 'Repite tres veces y anota la mayor', 'Anota la potencia máxima de pico que se vea y cuánto dura'],
    condiciones: ['Temperatura ambiente', 'Estado de carga de la batería', 'Nivel de asistencia', 'Masa del ocupante y del vehículo'],
    criterio: 'La potencia nominal continua medida es de 250 W o menos.', criterioLegal: true,
    campos: [NUM('pot', 'Potencia nominal continua medida', 'W', { diseno: f => f.potenciaCategoria == null ? null : `${n1(f.potenciaCategoria * 1000)} W` }), NUM('pico', 'Potencia de pico observada', 'W'), NUM('dur', 'Duración del régimen medido', 'min'), TXT('metodo', 'Método de medida usado', 'Instrumento, dónde se conectó y cómo se calculó el valor continuo.')],
    ojo: ['No vale la potencia que dice la etiqueta del motor: vale la que mides y la que programa el controlador.', 'Si superas 250 W continuos, el vehículo ya no es un ciclo: baja el límite en el controlador y repite.'],
  },
  {
    id: 'e02', codigo: 'EN-02', titulo: 'Corte de la asistencia a 25 km/h', peso: 3,
    objetivo: 'Demostrar que el motor deja de empujar antes de superar los 25 km/h.',
    norma: 'Orden PJC/780/2025 (el límite); método en la EN 15194 (de pago, no leída).', normaLeida: false,
    instrumentos: ['Medidor de velocidad independiente del propio vehículo (GPS de ciclismo o banco de rodillos)', 'Registro de la corriente del motor (pinza amperimétrica o datos del controlador)', 'Cronómetro'],
    preparacion: ['Neumáticos a la presión recomendada y medida real del diámetro de rueda', 'Pista llana, seca y sin viento notable (o banco de rodillos)', 'Anota cómo el controlador mide la velocidad (sensor y diámetro programado)'],
    procedimiento: ['Acelera pedaleando con la asistencia máxima', 'Anota la velocidad real a la que la corriente del motor cae a cero', 'Sigue pedaleando por encima de esa velocidad y comprueba que el motor no vuelve a empujar', 'Repite cinco veces, en los dos sentidos de la pista', 'Repite con la carga máxima declarada y con el ocupante más ligero'],
    condiciones: ['Velocidad medida con instrumento independiente', 'Carga del vehículo', 'Pendiente de la pista', 'Viento'],
    criterio: 'La asistencia se interrumpe antes de superar los 25 km/h en todas las repeticiones.', criterioLegal: true,
    campos: [NUM('vcorte', 'Velocidad más alta a la que aún empuja el motor', 'km/h', { diseno: f => f.vmax == null ? null : `${n1(f.vmax)} km/h` }), NUM('rep', 'Repeticiones hechas', ''), TXT('metodo', 'Cómo se midió la velocidad', 'Instrumento y cómo se contrastó con la del controlador.'), SI_NO('sigue', '¿El motor vuelve a empujar por encima del corte?')],
    ojo: ['No es un tope a la velocidad del vehículo: cuesta abajo o con las piernas puede ir más rápido.', 'Mide con un instrumento ajeno al vehículo: el del controlador puede estar mal calibrado.'],
  },
  {
    id: 'e03', codigo: 'EN-03', titulo: 'Desconexión al dejar de pedalear y ausencia de propulsión autónoma', peso: 3,
    objetivo: 'Demostrar que el motor solo ayuda cuando se pedalea y que nada lo mueve por sí solo.',
    norma: 'Orden PJC/780/2025 y definición de ciclo del RD 339/2014, art. 2; apartado 4.2 de la EN 15194 (de pago, no leída).', normaLeida: false,
    instrumentos: ['Cronómetro o registro de corriente del motor', 'El propio vehículo con la batería cargada'],
    preparacion: ['Revisa a mano que no existe puño, botón ni palanca que accione el motor sin pedalear', 'Vehículo parado, sobre un soporte con las ruedas en el aire o en una pista llana'],
    procedimiento: ['Pedalea con asistencia y para de pedalear de golpe: anota en cuánto tiempo el motor deja de empujar', 'Con el vehículo parado, activa todos los niveles de asistencia sin pedalear y comprueba que el motor no mueve el vehículo', 'Pulsa todos los botones y mandos sin pedalear y comprueba lo mismo', 'Gira los pedales hacia atrás y comprueba que el motor no empuja', 'Desconecta el sensor de pedaleo con el sistema encendido y comprueba que el motor no actúa'],
    condiciones: ['Nivel de asistencia', 'Estado de la batería', 'Si el vehículo estaba parado o en marcha'],
    criterio: 'La asistencia se interrumpe al dejar de pedalear, y ningún mando ni fallo del sensor mueve el vehículo sin pedalear.', criterioLegal: true,
    campos: [NUM('tcorte', 'Tiempo hasta que el motor deja de empujar al dejar de pedalear', 's'), SI_NO('autonomo', '¿El motor mueve el vehículo sin pedalear (con algún mando)?'), SI_NO('atras', '¿El motor empuja al pedalear hacia atrás?'), SI_NO('sensor', '¿Con el sensor de pedaleo desconectado el motor sigue actuando?'), TXT('mandos', 'Mandos probados', 'Lista de los botones, puños y palancas que se pulsaron.')],
    ojo: ['Es el ensayo que decide si es un ciclo o un vehículo a motor: hazlo con cuidado y con fotos o vídeo.'],
  },
  {
    id: 'e04', codigo: 'EN-04', titulo: 'Frenado en seco y estabilidad en la frenada', peso: 3,
    objetivo: 'Demostrar que los frenos de delante y de detrás actúan por separado y detienen el vehículo de forma segura y estable en seco.',
    norma: `RD 339/2014, anexo VI, punto 2. ${SIN_NORMA}`, normaLeida: false,
    instrumentos: ['Cinta métrica o rueda medidora', 'Cronómetro o acelerómetro (el del móvil sirve como referencia)', 'Báscula para pesar la carga', 'Medidor de velocidad independiente'],
    preparacion: ['Pista de asfalto seco, llana y limpia', 'Frenos rodados (varios frenazos suaves antes)', 'Carga: conductor y la carga máxima declarada'],
    procedimiento: ['A la velocidad de ensayo, frena solo con la palanca delantera hasta parar y mide la distancia', 'Repite solo con la trasera', 'Repite con las dos a la vez', 'Repite con la carga máxima declarada y con el vehículo vacío', 'Anota si hay bloqueo de ruedas, desvío de la trayectoria, levantamiento de la rueda trasera o pérdida de control'],
    condiciones: ['Velocidad inicial', 'Masa total', 'Estado del firme', 'Temperatura', 'Presión de neumáticos'],
    criterio: 'Parada segura en seco, sin pérdida de control, con cada freno actuando por separado. La distancia máxima la fija el criterio que adoptes.', criterioLegal: false,
    campos: [NUM('v0', 'Velocidad inicial', 'km/h'), NUM('masa', 'Masa total ensayada', 'kg', { diseno: f => kg(f.masaMaxima) }), NUM('dd', 'Distancia de frenado, solo delantero', 'm'), NUM('dt', 'Distancia de frenado, solo trasero', 'm'), NUM('dambos', 'Distancia de frenado, ambos frenos', 'm'), SI_NO('control', '¿Se mantuvo el control y la trayectoria?'), TXT('criterioAdoptado', 'Criterio de aceptación que adoptas y de dónde sale')],
    ojo: ['Sin estas cifras de la norma técnica, el informe debe decir qué criterio usaste: si no, una inspección no sabrá qué compararlo.'],
  },
  {
    id: 'e05', codigo: 'EN-05', titulo: 'Estabilidad: vuelco lateral y longitudinal', peso: 3,
    objetivo: 'Demostrar que el reparto de masas evita el vuelco lateral y longitudinal en las condiciones de uso previstas.',
    norma: `RD 339/2014, anexo VI, punto 10. ${SIN_NORMA} La parte 3 de la EN 17860 es la referencia para ciclos utilitarios de varias ruedas (por confirmar).`, normaLeida: false,
    instrumentos: ['Plataforma basculante o rampa regulable con inclinómetro', 'Conos y cinta métrica para el giro', 'Pesos calibrados para la carga'],
    preparacion: ['Pesa cada rueda con el vehículo cargado para conocer el reparto de masas', 'Define las cargas: vacío, máxima y máxima desplazada hacia un lado y hacia atrás', 'Arneses de seguridad y un ayudante, por si vuelca'],
    procedimiento: ['Inclina el vehículo lateralmente hasta que se levante la primera rueda y anota el ángulo (hacia los dos lados)', 'Inclina longitudinalmente (hacia delante y hacia atrás) y anota el ángulo', 'Repite con la carga máxima y con la carga desplazada', 'En un círculo marcado, aumenta la velocidad poco a poco y anota a cuál se levanta una rueda', 'Frena y gira a la vez a velocidad moderada y anota si se levanta alguna rueda'],
    condiciones: ['Estado de carga', 'Presión de neumáticos', 'Posición del conductor', 'Superficie y su rozamiento'],
    criterio: 'Ninguna rueda se levanta en las condiciones de uso previstas y el umbral medido iguala o supera el del cálculo.', criterioLegal: false,
    campos: [NUM('lat', 'Ángulo de vuelco lateral', '°'), NUM('long', 'Ángulo de vuelco longitudinal', '°'), NUM('vgiro', 'Velocidad a la que se levanta una rueda en giro', 'km/h'), NUM('ssf', 'Umbral de vuelco lateral medido', 'g', { diseno: f => f.vuelcoSsf == null ? null : `${f.vuelcoSsf.toLocaleString('es-ES', { maximumFractionDigits: 2 })} g (objetivo ${f.vuelcoObjetivo?.toLocaleString('es-ES', { maximumFractionDigits: 2 }) ?? '—'} g)` }), SI_NO('rueda', '¿Se levantó alguna rueda en las condiciones de uso previstas?'), TXT('cargas', 'Cargas y posiciones probadas')],
    ojo: ['Hazlo con protección: un ensayo de vuelco puede acabar en vuelco.'],
  },
  {
    id: 'e06', codigo: 'EN-06', titulo: 'Radio de giro y comportamiento de la dirección', peso: 2,
    objetivo: 'Comprobar el radio de giro declarado y que la dirección centra y responde sin holguras.',
    norma: `RD 339/2014, anexo VI, punto 3. ${SIN_NORMA}`, normaLeida: false,
    instrumentos: ['Cinta métrica', 'Tiza o conos', 'Medidor de velocidad'],
    preparacion: ['Superficie lisa y llana', 'Anota el radio de giro declarado en la ficha técnica'],
    procedimiento: ['Gira la dirección a tope hacia cada lado y recorre un círculo completo marcando la huella de la rueda exterior', 'Mide el radio del círculo hacia cada lado', 'Repite a la velocidad máxima recomendada, comprobando que se mantiene el control', 'Con la dirección suelta en marcha recta, comprueba que el vehículo no se desvía', 'Comprueba la marca de inserción mínima del manillar y la posición centrada de la rueda'],
    condiciones: ['Velocidad', 'Presión de neumáticos', 'Carga'],
    criterio: 'El radio medido no supera el declarado, a la velocidad máxima recomendada, y se mantiene el control.', criterioLegal: false,
    campos: [NUM('rizq', 'Radio de giro medido (izquierda)', 'm'), NUM('rder', 'Radio de giro medido (derecha)', 'm'), NUM('rdecl', 'Radio de giro declarado', 'm', { diseno: f => f.radioGiro == null ? null : `${f.radioGiro.toLocaleString('es-ES', { maximumFractionDigits: 2 })} m` }), SI_NO('control', '¿Se mantuvo el control a la velocidad máxima recomendada?'), SI_NO('marca', '¿La marca de inserción mínima es visible?')],
  },
  {
    id: 'e07', codigo: 'EN-07', titulo: 'Resistencia estructural del bastidor', peso: 3,
    objetivo: 'Comprobar que el bastidor aguanta las cargas del uso previsto sin romperse ni deformarse de forma peligrosa.',
    norma: `RD 339/2014, anexo III (ensayos de resistencia) y apartado de la EN 17860-3 que corresponda (por confirmar). ${SIN_NORMA}`, normaLeida: false,
    instrumentos: ['Pesos calibrados o gato con célula de carga', 'Comparador o calibre para medir la deformación', 'Cámara para documentar', 'Líquido penetrante o inspección visual por fisuras'],
    preparacion: ['Define las cargas con el cálculo estructural (cargas máximas y factor de seguridad que adoptes)', 'Marca los puntos de carga y de medida', 'Fotografía el bastidor antes de empezar'],
    procedimiento: ['Aplica la carga máxima declarada de forma estática en los puntos de apoyo (asientos, ejes, anclajes) y mide la deformación', 'Aumenta hasta el factor de seguridad que hayas adoptado y mantén un minuto', 'Descarga y mide la deformación permanente', 'Si has previsto fatiga, aplica el número de ciclos fijado y vuelve a revisar', 'Inspecciona soldaduras y uniones y fotografía cualquier fisura'],
    condiciones: ['Carga aplicada', 'Puntos de carga', 'Temperatura', 'Material y espesor'],
    criterio: 'Sin rotura, fisuras ni deformación permanente que impida el uso o la seguridad.', criterioLegal: false,
    campos: [NUM('carga', 'Carga aplicada', 'kg'), NUM('factor', 'Factor sobre la carga máxima declarada', '×'), NUM('defperm', 'Deformación permanente', 'mm'), SI_NO('fisuras', '¿Aparecen fisuras o roturas?'), NUM('ciclos', 'Ciclos de fatiga aplicados', ''), TXT('puntos', 'Puntos de carga')],
  },
  {
    id: 'e08', codigo: 'EN-08', titulo: 'Resistencia de dirección, horquilla, ejes y anclajes', peso: 2,
    objetivo: 'Comprobar las piezas que, si fallan, causan la pérdida de control: dirección, horquilla, ejes de rueda y anclajes de los asientos y los cinturones.',
    norma: `RD 339/2014, anexo VI, puntos 3 y 9. ${SIN_NORMA}`, normaLeida: false,
    instrumentos: ['Dinamómetro o pesos calibrados', 'Calibre', 'Cámara'],
    preparacion: ['Lista de las piezas críticas con su carga de trabajo', 'Fotografías previas'],
    procedimiento: ['Aplica a cada pieza crítica la carga de trabajo multiplicada por el factor que adoptes', 'Mantén un minuto y mide la deformación', 'Para los anclajes de los cinturones, tira en la dirección de uso con la carga que adoptes', 'Inspecciona tras la descarga y fotografía'],
    condiciones: ['Pieza probada', 'Carga aplicada', 'Factor adoptado'],
    criterio: 'Ninguna pieza se rompe ni se suelta, y las deformaciones no impiden usar el vehículo con seguridad.', criterioLegal: false,
    campos: [TXT('piezas', 'Piezas probadas y carga de cada una'), NUM('factor', 'Factor de seguridad adoptado', '×'), SI_NO('rotura', '¿Alguna pieza se rompió, se soltó o se deformó?'), TXT('criterioAdoptado', 'Criterio de aceptación que adoptas y de dónde sale')],
  },
  {
    id: 'e09', codigo: 'EN-09', titulo: 'Seguridad eléctrica: aislamiento, protecciones, cableado y fusibles', peso: 3,
    objetivo: 'Demostrar que la instalación eléctrica es segura: aislada, protegida contra sobrecorrientes y con conexiones firmes.',
    norma: 'Directiva 2006/42/CE (hasta 19-1-2027) y Reglamento (UE) 2023/1230 (desde 20-1-2027), requisitos esenciales; EN 15194 (de pago, no leída).', normaLeida: false,
    instrumentos: ['Multímetro y medidor de aislamiento (megóhmetro)', 'Pinza amperimétrica', 'Cámara térmica o termómetro infrarrojo', 'Llave dinamométrica'],
    preparacion: ['Esquema eléctrico actualizado', 'Cálculo del fusible o disyuntor'],
    procedimiento: ['Mide la resistencia de aislamiento entre los polos y el bastidor', 'Revisa que ningún cable roza o queda sin protección y que los conectores están firmes', 'Comprueba el par de apriete de las conexiones de potencia', 'Provoca un cortocircuito controlado en el circuito protegido y comprueba que el fusible o la protección actúa', 'Con la carga máxima, mide la temperatura de los cables y conectores tras el uso'],
    condiciones: ['Tensión de ensayo del aislamiento', 'Temperatura ambiente', 'Estado de carga de la batería'],
    criterio: 'Aislamiento suficiente, protecciones que actúan y ninguna conexión ni cable que se caliente de forma peligrosa.', criterioLegal: false,
    campos: [NUM('aisl', 'Resistencia de aislamiento', 'MΩ'), NUM('vens', 'Tensión de ensayo del aislamiento', 'V'), SI_NO('fusible', '¿El fusible o la protección actuó ante el cortocircuito?'), NUM('tcable', 'Temperatura máxima de cables y conectores', '°C'), SI_NO('conect', '¿Todas las conexiones están firmes y al par indicado?'), TXT('criterioAdoptado', 'Criterio de aceptación que adoptas y de dónde sale')],
    ojo: ['Trabaja con la batería desconectada siempre que no sea imprescindible tenerla conectada.'],
  },
  {
    id: 'e10', codigo: 'EN-10', titulo: 'Batería y cargador: protecciones y carga', peso: 3,
    objetivo: 'Comprobar que la batería y el cargador funcionan con seguridad: protecciones del BMS y carga completa sin calentarse.',
    norma: 'Reglamento (UE) 2023/1542 (batería LMT) y datos del fabricante de la batería. Es el proveedor quien debe aportar su declaración UE de conformidad.', normaLeida: false,
    instrumentos: ['Fuente y carga programables o carga resistiva', 'Pinza amperimétrica', 'Termómetro infrarrojo o de contacto', 'Multímetro'],
    preparacion: ['Reúne la ficha de la batería y del cargador', 'Lugar ventilado, con extintor adecuado y sin materiales inflamables cerca'],
    procedimiento: ['Con una carga controlada, comprueba el corte por sobrecorriente y por cortocircuito, según la ficha del proveedor', 'Comprueba el corte por baja tensión al descargar', 'Realiza una carga completa con el cargador y mide la temperatura de la batería y el cargador', 'Comprueba que el cargador corta al terminar y que no se puede cargar con una batería incompatible', 'Anota el modelo y lote de la batería y del cargador'],
    condiciones: ['Temperatura ambiente', 'Modelo y lote de la batería', 'Modelo del cargador'],
    criterio: 'Las protecciones actúan según la ficha del fabricante y no hay temperaturas peligrosas en la carga.', criterioLegal: false,
    campos: [SI_NO('sobrecorriente', '¿Cortó por sobrecorriente o cortocircuito?'), SI_NO('bajatension', '¿Cortó por baja tensión?'), NUM('tcarga', 'Temperatura máxima durante la carga', '°C'), NUM('tiempo', 'Tiempo de carga completa', 'h'), SI_NO('cargadorcorta', '¿El cargador corta al terminar?'), TXT('lote', 'Modelo y lote de batería y cargador')],
    ojo: ['Una batería de litio mal probada puede incendiarse: haz este ensayo con medidas de seguridad.'],
  },
  {
    id: 'e11', codigo: 'EN-11', titulo: 'Temperatura del motor, el controlador y la batería', peso: 2,
    objetivo: 'Comprobar que no hay sobrecalentamientos peligrosos en uso exigente.',
    norma: 'Requisitos esenciales de seguridad de máquinas (Directiva 2006/42/CE y Reglamento 2023/1230); límites de temperatura de cada fabricante.', normaLeida: false,
    instrumentos: ['Termómetros de contacto o sondas', 'Cámara térmica (opcional)', 'Registrador de temperatura'],
    preparacion: ['Anota los límites de temperatura de motor, controlador y batería según sus fabricantes', 'Elige un recorrido exigente: cuesta arriba continua y con carga máxima'],
    procedimiento: ['Coloca las sondas en el motor, el controlador y la batería', 'Recorre la pendiente o simula la carga durante el tiempo que fijes', 'Registra la temperatura al final y la máxima', 'Toca las superficies accesibles y anota si pueden quemar', 'Deja enfriar y anota el tiempo hasta volver a temperatura ambiente'],
    condiciones: ['Temperatura ambiente', 'Pendiente y duración', 'Carga', 'Nivel de asistencia'],
    criterio: 'Ningún componente supera el límite de su fabricante y las superficies accesibles no queman.', criterioLegal: false,
    campos: [NUM('tmotor', 'Temperatura máxima del motor', '°C'), NUM('tctrl', 'Temperatura máxima del controlador', '°C'), NUM('tbat', 'Temperatura máxima de la batería', '°C'), NUM('dur', 'Duración del ensayo', 'min'), SI_NO('quema', '¿Alguna superficie accesible puede quemar?'), TXT('limites', 'Límites de cada fabricante')],
  },
  {
    id: 'e12', codigo: 'EN-12', titulo: 'Compatibilidad electromagnética (CEM)', peso: 2,
    objetivo: 'Comprobar que la electrónica no emite interferencias por encima de lo permitido ni se estropea por las de fuera.',
    norma: 'Requisitos de CEM de las normas aplicables (a confirmar con la EN 15194). Normalmente exige cámara de ensayo: el centro que la tenga lo dirá.', normaLeida: false,
    instrumentos: ['Laboratorio con cámara de CEM, o declaraciones CEM de los componentes'],
    preparacion: ['Pide a los proveedores la declaración CEM del motor, el controlador y el cargador', 'Pregunta a un laboratorio qué ensayos pide para tu configuración'],
    procedimiento: ['Reúne las declaraciones CEM de los componentes', 'Si hace falta, lleva la unidad completa a un laboratorio para los ensayos de emisiones e inmunidad', 'Anota el laboratorio, el número de informe y el resultado', 'Como comprobación previa, arranca el vehículo cerca de emisores (móvil, radio) y observa que no cambia su comportamiento'],
    condiciones: ['Configuración ensayada', 'Laboratorio', 'Fecha del informe'],
    criterio: 'Informe con resultado conforme, o declaraciones CEM de todos los componentes y sin fallos en la comprobación previa.', criterioLegal: false,
    campos: [TXT('lab', 'Laboratorio y número de informe'), SI_NO('emisiones', '¿Pasa las emisiones?'), SI_NO('inmunidad', '¿Pasa la inmunidad?'), SI_NO('decl', '¿Tienes la declaración CEM de motor, controlador y cargador?')],
    ojo: ['Es el único ensayo que seguramente no puedes hacer en tu taller. No se hace en cada unidad: se hace una vez para el modelo.'],
  },
  {
    id: 'e13', codigo: 'EN-13', titulo: 'Luces y catadióptricos', peso: 3,
    objetivo: 'Comprobar la luz blanca delante, la roja detrás, el reflector rojo trasero y los cuatro laterales amarillos.',
    norma: 'RD 339/2014, anexo VI punto 6 y anexo V (Reglamento UN 3 para los catadióptricos). Intensidad: delante entre 4 y 60 candelas, detrás entre 4 y 12.', normaLeida: true,
    instrumentos: ['Luxómetro o fotómetro de intensidad', 'Cinta métrica', 'Cámara', 'Sala oscura o exterior de noche'],
    preparacion: ['Fichas de las luces y los catadióptricos con su marca de homologación', 'Esquema con la posición de cada luz y reflector'],
    procedimiento: ['Comprueba que cada luz enciende y que la delantera es blanca y la trasera roja', 'Mide la intensidad delantera y la trasera en su eje, a la distancia que indique el método del fotómetro', 'Cuenta y localiza los catadióptricos: uno trasero rojo, no triangular, y cuatro laterales amarillos (dos en las ruedas delanteras y dos en las traseras, uno por lado)', 'Comprueba que cada uno lleva el marcado de homologación visible', 'Haz una foto nocturna con un foco para comprobar que los reflectores se ven'],
    condiciones: ['Distancia de medida', 'Estado de carga de la batería', 'Posición de montaje'],
    criterio: 'Luz delantera blanca de 4 a 60 cd; trasera roja de 4 a 12 cd; un reflector trasero rojo y cuatro laterales amarillos, homologados.', criterioLegal: true,
    campos: [NUM('cdd', 'Intensidad de la luz delantera', 'cd'), NUM('cdt', 'Intensidad de la luz trasera', 'cd'), NUM('nlat', 'Catadióptricos laterales amarillos', 'unidades'), SI_NO('rtras', '¿Hay un reflector trasero rojo no triangular?'), SI_NO('marca', '¿Todos llevan marcado de homologación visible?')],
  },
  {
    id: 'e14', codigo: 'EN-14', titulo: 'Aristas y protección de la transmisión', peso: 2,
    objetivo: 'Comprobar que no hay esquinas cortantes y que la transmisión no puede atrapar ropa ni dedos.',
    norma: 'RD 339/2014, anexo VI, puntos 1.1 y 1.2.', normaLeida: true,
    instrumentos: ['Cámara', 'Un trozo de tela y una mano con guante fino para el tacto'],
    preparacion: ['Vehículo limpio y montado como sale a la venta'],
    procedimiento: ['Recorre con la mano enguantada todas las aristas accesibles y fotografía las dudosas', 'Pasa la tela por el contorno de las piezas del conductor: si se engancha o se corta, anótalo', 'Con la transmisión girando despacio, comprueba qué puntos de atrapamiento quedan al alcance', 'Comprueba que las protecciones están bien fijadas y no se sueltan'],
    condiciones: ['Estado del vehículo', 'Protecciones montadas'],
    criterio: 'Ninguna esquina cortante accesible y sin puntos de atrapamiento al alcance en uso normal.', criterioLegal: true,
    campos: [SI_NO('aristas', '¿Hay aristas o esquinas cortantes accesibles?'), SI_NO('atrap', '¿Hay puntos de atrapamiento al alcance?'), SI_NO('prot', '¿Las protecciones de la transmisión están bien fijadas?'), TXT('puntos', 'Puntos dudosos y qué se hizo')],
  },
];

export const ensayo = (id: string) => ENSAYOS.find(e => e.id === id);
