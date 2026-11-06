import type { Departamento } from './tipos';

// Escrito por el bot de producto y compras (2026-11-06) a partir de
// `componentes.ts`, `geometriaA1.ts`, el changelog y lo encontrado en la web.
// Regla de oro: nada inventado. Cada precio lleva su fuente y su fecha; lo que
// no se ha podido comprobar dice «por confirmar».
//
// Vocabulario (para quien no es ingeniero):
// - Marca E (E-mark): el sello que lleva una luz o un retrovisor que ha pasado
//   el ensayo de un reglamento UN (p. ej. «E1 149R») y que un laboratorio
//   acepta sin volver a ensayarlo. Sin esa marca, la pieza no se puede matricular.
// - UN R148 / R149 / R150: los tres reglamentos nuevos que agrupan las luces de
//   señalización (posición, freno, intermitentes, matrícula, diurna), las de
//   alumbrado (cruce, carretera, antiniebla) y los catadióptricos. Sustituyen a
//   los antiguos R6, R7, R23, R38, R87, R112, R3…: una pieza marcada con los
//   antiguos sigue valiendo.
// - Cruce / carretera: luz corta (no deslumbra) y luz larga.
// - CMS: sistema de cámara y pantalla que sustituye a un retrovisor (UN R46).
// - CAN: el «idioma» por el que inversor, batería y cargador cuentan a la
//   pantalla lo que pasa.
// - Mazo: el conjunto de cables de 12 V ya cortados, con sus conectores.
export const DEPARTAMENTO: Departamento = {
  id: 'luces', nombre: 'Luces, retrovisores y electrónica', lema: 'ver y ser visto: faros, pilotos, cámaras, pantalla y cableado de baja tensión',
  mision: 'Que el Aeromóvil 1 vea de noche, se vea de día y pueda matricularse: faros de cruce y carretera, luces de posición, diurnas, intermitentes, freno, matrícula y catadióptricos con marca E (UN R148, R149 y R150), dos retrovisores homologados en los pods tipo Aptera de la base del parabrisas, una pantalla que lea por CAN velocidad, batería y avisos, claxon, limpiaparabrisas, cámara trasera y todo el cableado de 12 V con su caja de fusibles. Para el prototipo 1 la regla es sencilla: ninguna luz ni retrovisor sin marca E, aunque sea más feo, y el estilo (la ceja LED del hombro, la barra roja de la cola) se consigue con piezas homologadas o se deja como adorno sin función.',
  responsabilidades: [
    'Fijar con Homologación la lista de luces obligatorias y opcionales para un L7e y los reglamentos de cada una (Reglamento delegado (UE) 3/2014, anexo IX, y la lista de reglamentos UN de su anexo I).',
    'Elegir faros, pilotos, intermitentes, luz de matrícula, diurnas y catadióptricos con marca E, y diseñar con Carrocería sus huecos en el morro, el hombro y el labio de la cola.',
    'Elegir los retrovisores (dos pods en la base del parabrisas) con cabeza homologada y comprobar el campo de visión que exige el reglamento; preparar el camino para sustituirlos por cámaras en un prototipo posterior.',
    'Definir la pantalla e instrumentación: velocímetro (obligatorio), carga de la batería, potencia, temperaturas, avisos del inversor y del BMS, todo por CAN.',
    'Diseñar el sistema de 12 V: convertidor DC-DC (de Energía), batería auxiliar pequeña, caja de fusibles, relés, masa única y el mazo de cables con conectores estancos.',
    'Elegir claxon, limpiaparabrisas con lavaparabrisas y desempañado del parabrisas (anexo VI de 3/2014), y la cámara de marcha atrás.',
    'Cumplir la compatibilidad electromagnética (UN R10): el inversor, el DC-DC y el cargador no deben perturbar la radio ni la pantalla, ni al revés.',
    'Montar, probar función a función, regular la altura de los faros y preparar la inspección de instalación de luces con el laboratorio.',
    'Pedir presupuestos y llevar el peso y el coste reales a la ficha «Luces y retrovisores» (la de serie supone 2 kg y 320 €: los dos se van a quedar cortos).',
  ],
  parametros: [],
  componentes: ['luces'],
  tareas: [
    {
      titulo: 'Escribir con Homologación la lista de luces y su reglamento',
      detalle: 'Leer el anexo IX del Reglamento delegado (UE) 3/2014 (instalación de dispositivos de alumbrado en vehículos L) y su anexo I (lista de reglamentos UN que aplican a L7e: R1, R3, R6, R7, R8, R19, R20, R37, R38, R50, R57, R72, R87, R112, R113, hoy agrupados en R148/R149/R150; R46 y R81 para retrovisores; R43 cristales; R16 cinturones). Sacar una tabla: función, obligatoria u opcional, número y color, altura mínima y máxima sobre el suelo, separación, reglamento de la pieza.',
      prioridad: 'alta', semanas: 1, entregable: 'Tabla «Luces L7e v1» con una fila por función',
    },
    {
      titulo: 'Decidir el faro de cruce y carretera (ver decisión «Faros»)',
      detalle: 'La «ceja LED fina» del 3D no puede ser el faro de cruce: el cruce necesita una óptica homologada. Opción de referencia: módulo Hella de 90 mm Bi-LED L 4565 (cruce y carretera en uno, marca E según UN R149 clase B, ≈ 1,3 kg cada uno; el Performance Bi-LED de 90 mm se vende a 543 £ en Reino Unido). Dos módulos por coche, uno a cada lado del morro, y la ceja queda como luz de posición y diurna homologada.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Escribir con Homologación la lista de luces y su reglamento'], entregable: 'Faro elegido con referencia y marca E; hueco acotado para Carrocería',
    },
    {
      titulo: 'Pedir presupuesto de faros, pilotos y luces diurnas',
      detalle: 'A Hella (formulario de distribuidores en España), a Lights & Styling (Países Bajos: pilotos WAS W171DD multifunción a 124 € sin IVA; Lazer Linear-18 Elite de carretera a 521 € sin IVA) y a Lazer Lamps (Reino Unido: Sentinel 7″ Elite 375–427 € con R149 clase B solo de carretera y R148 de posición). Pedir el certificado de marca E de cada referencia (número y reglamento) y la ficha con dimensiones y consumo.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Decidir el faro de cruce y carretera (ver decisión «Faros»)'], entregable: 'Tabla de luces con precio, peso, consumo y certificado',
    },
    {
      titulo: 'Diseñar con Carrocería los huecos de los faros en el morro',
      detalle: 'Un módulo de 90 mm necesita un corte de unos 98–99 mm de diámetro y 182 mm de profundidad (ficha Hella del Performance Bi-LED), justo donde el plano pone la pieza azul del morro y, detrás, la rueda delantera girada 22° (comprobación «Rueda delantera girada y hundida»: hoy 21 mm de holgura). Colocar los dos módulos a la altura que exige el anexo IX (medirla en la tabla de la tarea 1) y comprobar en el 3D. Si se tapan con un cristal transparente de carrocería, avisar al laboratorio: el ensayo del faro se hizo sin esa tapa.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Decidir el faro de cruce y carretera (ver decisión «Faros»)'], entregable: 'Hueco de faros en el CAD y nota al laboratorio sobre la tapa',
    },
    {
      titulo: 'Elegir pilotos, intermitentes, freno, matrícula y catadióptricos de la cola',
      detalle: 'El plano lleva una barra roja en el borde de fuga con una pestaña vertical en cada esquina. Opción de catálogo: un piloto multifunción con marca E en cada esquina (WAS W171DD: posición, freno, intermitente, marcha atrás y antiniebla, 350 × 131 × 81 mm, 12–24 V) y la barra central como tercera luz de freno homologada o como adorno sin función. Más la luz de matrícula y dos catadióptricos rojos (R150) no triangulares. Pedir las fichas y comprobar la separación mínima entre intermitentes.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Escribir con Homologación la lista de luces y su reglamento'], entregable: 'Lista de pilotos con referencias y marca E; posición en el labio de cola',
    },
    {
      titulo: 'Decidir los retrovisores (ver decisión «Retrovisores»)',
      detalle: 'El anexo I de 3/2014 lista R46 y R81 para L7e: confirmar con el laboratorio cuál aplica a un L7e con carrocería cerrada (R46 es el de los coches, R81 el de las motos) y qué campo de visión hay que cubrir. Con eso, elegir una cabeza de retrovisor con marca E (Puig, España, fabrica retrovisores de moto homologados) y diseñar el pod en la base del montante con el ángulo correcto.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Escribir con Homologación la lista de luces y su reglamento'], entregable: 'Retrovisor elegido y campo de visión dibujado en planta',
    },
    {
      titulo: 'Definir la pantalla y la lista de datos que muestra',
      detalle: 'Obligatorio: velocímetro. Útil: estado de carga, autonomía estimada, potencia instantánea, temperatura de motor, inversor y batería, avisos (aislamiento, celda fuera de rango, sobretemperatura), marcha seleccionada, intermitentes y luces. Todo llega por CAN del inversor y del BMS (tabla de mensajes de Propulsión). Opciones: AiM MXS 1.2 Strada de 5″ con CAN (1.440 € en ORECA Store, Francia) o una pantalla propia (microcontrolador con CAN y pantalla de 7″; coste de piezas bajo, pero trabajo de programación).',
      prioridad: 'media', semanas: 2, dependeDe: ['Escribir con Homologación la lista de luces y su reglamento'], entregable: 'Pantalla elegida y lista de datos con su mensaje CAN',
    },
    {
      titulo: 'Elegir claxon, limpiaparabrisas, lavaparabrisas y desempañado',
      detalle: 'Claxon con marca E (UN R28; el anexo de avisador acústico de 3/2014). Limpiaparabrisas: DOGA (Abrera, Barcelona) fabrica motores de limpiaparabrisas a medida; su motor de 85° de 12 V se vende a 110 £ sin IVA en Reino Unido. Bomba y depósito de lavaparabrisas, y desempañado del parabrisas (ventilador con resistencia o hilos en el policarbonato: hablar con Carrocería). El anexo VI de 3/2014 dice qué parabrisas obligan a llevar limpia y desempañado.',
      prioridad: 'media', semanas: 1, dependeDe: ['Escribir con Homologación la lista de luces y su reglamento'], entregable: 'Referencias de claxon, limpia, lavaparabrisas y desempañado',
    },
    {
      titulo: 'Dibujar el esquema de 12 V',
      detalle: 'Del DC-DC de Energía (13,8 V, 500 W) a una caja de fusibles con relés: luces (cruce, carretera, posición, diurna, intermitentes con su relé, freno con interruptor de pedal, matrícula, marcha atrás), bomba de refrigeración, ventilador, pantalla, claxon, limpia, cámara, contactores de la batería (los manda el BMS), llave de contacto. Una masa única en el chasis. Batería auxiliar de 12 V (2–5 Ah) para que arranque sin la batería grande.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Definir la pantalla y la lista de datos que muestra', 'Elegir claxon, limpiaparabrisas, lavaparabrisas y desempañado'], entregable: 'Esquema de 12 V con secciones de cable y fusibles',
    },
    {
      titulo: 'Diseñar y fabricar el mazo de cables',
      detalle: 'Medir en el 3D las longitudes (morro–salpicadero–cola, ≈ 4 m de ida), elegir cable de automoción (FLRY) y conectores estancos (Deutsch DT o similares), funda y pasacables en cada paso de chapa. Hacerlo nosotros con material de un proveedor de electricidad de automoción (Auto Electric Supplies, Reino Unido, vende cable, fusibles, relés y terminales) o encargarlo. Etiquetar cada cable.',
      prioridad: 'media', semanas: 2, dependeDe: ['Dibujar el esquema de 12 V'], entregable: 'Mazo montado y etiquetado; lista de materiales',
    },
    {
      titulo: 'Elegir la cámara trasera y dónde se ve',
      detalle: 'Cámara de marcha atrás de automoción (gran angular, estanca, con guías) en el labio de la cola, vista en la pantalla al meter marcha atrás. No sustituye a los retrovisores en el prototipo 1; es ayuda. Si la pantalla es la AiM, hace falta un monitor aparte (la AiM no muestra vídeo): tenerlo en cuenta al decidir la pantalla.',
      prioridad: 'baja', semanas: 1, dependeDe: ['Definir la pantalla y la lista de datos que muestra'], entregable: 'Cámara y monitor elegidos',
    },
    {
      titulo: 'Mandos y testigos: volante, palanca de intermitentes, símbolos',
      detalle: 'El anexo VII de 3/2014 fija los símbolos y colores de los testigos (luces, intermitentes, avisos). Elegir una palanca de intermitentes y luces de coche (desguace vale), botón de claxon en el volante, interruptores de limpia y luces de emergencia, y que la pantalla muestre los testigos con los símbolos del anexo.',
      prioridad: 'media', semanas: 1, dependeDe: ['Definir la pantalla y la lista de datos que muestra'], entregable: 'Lista de mandos y pantalla con testigos',
    },
    {
      titulo: 'Montar y probar función a función',
      detalle: 'Con el coche en el taller: cada luz, cada intermitente (frecuencia 60–120 por minuto), freno con el pedal, matrícula, claxon, limpia, cámara, pantalla con el CAN en marcha. Medir el consumo total de 12 V con todo encendido (tiene que quedar por debajo de los 500 W del DC-DC). Regular la altura de los faros en una pared a 10 m.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Diseñar y fabricar el mazo de cables'], entregable: 'Hoja de pruebas firmada; consumo medido',
    },
    {
      titulo: 'Preinspección de instalación de luces y retrovisores con el laboratorio',
      detalle: 'Antes de la homologación formal, pedir a Applus IDIADA (o al LCOE, el laboratorio oficial español de alumbrado) una revisión del vehículo: alturas, separaciones, ángulos de visibilidad de cada luz, campo de visión de los retrovisores y el efecto de las tapas transparentes sobre los faros. Corregir lo que digan mientras aún es barato.',
      prioridad: 'media', semanas: 1, dependeDe: ['Montar y probar función a función', 'Decidir los retrovisores (ver decisión «Retrovisores»)'], entregable: 'Informe de preinspección y lista de correcciones',
    },
    {
      titulo: 'Plan de compatibilidad electromagnética (UN R10)',
      detalle: 'El Reglamento delegado (UE) 2016/1824 hace obligatorio el R10 para todos los L. Medidas de diseño: cables de potencia apantallados y lejos del mazo de 12 V, masa única, ferritas en la alimentación de la pantalla, filtro en el DC-DC. Pedir al laboratorio el presupuesto del ensayo de vehículo completo para el expediente.',
      prioridad: 'media', semanas: 1, dependeDe: ['Dibujar el esquema de 12 V'], entregable: 'Lista de medidas de diseño y presupuesto del ensayo R10',
    },
    {
      titulo: 'Actualizar la ficha «Luces y retrovisores» con pesos y precios reales',
      detalle: 'Dos módulos Hella Bi-LED (≈ 1,3 kg cada uno), dos pilotos WAS (0,55–1,5 kg según la fuente), dos retrovisores, cámara y pantalla: pesar todo. La ficha de serie dice 2 kg y 320 €; lo encontrado apunta a 5–6 kg y a más de 1.500 € solo en faros y pilotos. Meter los números y avisar a Carrocería y a Proyecto del cambio de peso.',
      prioridad: 'media', semanas: 1, dependeDe: ['Montar y probar función a función'], entregable: 'Ficha al día y entrada en el changelog',
    },
  ],
  decisiones: [
    {
      tema: 'Faros de cruce y carretera',
      contexto: 'El 3D muestra una ceja LED fina en el hombro del morro, al estilo Aptera. Para matricular, el cruce tiene que ser una óptica con marca E (UN R149, antes R112/R113). Una tira fina de LED de catálogo no lo es. Hay que decidir cómo se consigue la luz legal sin perder la cara del coche.',
      opciones: [
        { nombre: 'Dos módulos Hella de 90 mm Bi-LED (cruce + carretera en uno), empotrados en el morro, y la ceja como luz de posición y diurna homologada', pros: 'Pieza de automoción con marca E (R149 clase B), multitensión, 1,3 kg; se vende en toda Europa; el Bi-LED hace las dos luces en un solo hueco de 90 mm.', contras: 'Dos huecos redondos de ≈ 99 mm y 182 mm de profundidad en la pieza más bonita del coche; el Performance Bi-LED de 90 mm cuesta 543 £ en Reino Unido (agotado en nov. 2026; precio del L 4565 por confirmar); si se tapan con un cristal hay que validarlo con el laboratorio.', coste: '≈ 2 × 543 £ (Arnold Clark Autoparts, nov. 2026; L 4565 por confirmar)' },
        { nombre: 'Barra LED de carretera Lazer (Linear-18 Elite, R149 de carretera) + módulos de cruce aparte', pros: 'La barra fina del estilo Aptera existe y está homologada… como luz de carretera (larga): 520 × 40 mm, 1,1 kg, 521 € sin IVA.', contras: 'Solo es luz larga: el cruce sigue necesitando sus módulos; 126 W; es un faro de todoterreno, no de turismo.', coste: '521 € sin IVA (Lights & Styling, nov. 2026) + módulos de cruce' },
        { nombre: 'Faros de un coche pequeño de desguace (p. ej. del Twizy)', pros: 'Baratos y ya homologados como conjunto.', contras: 'Forma y tamaño del Twizy: no caben en nuestro morro sin destrozarlo; la marca E vale para la pieza, pero la instalación se ensaya igual.', coste: 'por confirmar' },
      ],
      recomendacion: 'Dos módulos Hella de 90 mm Bi-LED empotrados, con la ceja LED del hombro como posición y diurna homologada (R148).',
      porQue: 'Es la única opción que da cruce y carretera legales en el menor hueco posible y con una pieza que cualquier laboratorio conoce. Cuesta dos agujeros en el morro y unos 1.200 € en faros: hay que dibujarlos ya, antes de cerrar el molde de la carrocería.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Pilotos y la barra roja de la cola',
      contexto: 'El plano lleva una barra roja en todo el borde de fuga. Las luces de posición, freno e intermitentes tienen que ir en las esquinas, a cierta altura y separación, y cada una con marca E.',
      opciones: [
        { nombre: 'Un piloto multifunción con marca E en cada esquina (WAS W171DD o similar) y la barra central solo como tercera luz de freno homologada o como adorno', pros: 'Cinco funciones en una pieza de 350 × 131 mm, 12–24 V, marca E (R6, R7, R23, R38, R10), 124 € sin IVA cada uno; cabe en la pestaña vertical de cada esquina.', contras: 'Es un piloto de remolque y furgoneta: hay que integrarlo con gusto; 0,55–1,5 kg según la fuente (pesarlo).', coste: '2 × 124 € sin IVA (Lights & Styling, nov. 2026) + tercera luz y matrícula por confirmar' },
        { nombre: 'Barra de luz roja a medida en toda la cola, fabricada por nosotros', pros: 'Es el diseño del 3D, tal cual.', contras: 'Una luz fabricada por nosotros no tiene marca E: habría que homologarla como componente (ensayo fotométrico en laboratorio, miles de euros y meses).', coste: 'por confirmar (ensayo de componente)' },
      ],
      recomendacion: 'Pilotos homologados en las esquinas; la barra, tercera luz de freno homologada o adorno.',
      porQue: 'Lo que no tiene marca E no se matricula, y homologar una luz propia cuesta más que todo el sistema de luces. La estética se conserva con la barra como adorno.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Retrovisores: pods con espejo o cámaras',
      contexto: 'El diseño lleva dos pods tipo Aptera en la base del parabrisas. El anexo I de 3/2014 lista R46 (espejos y cámaras de coches) y R81 (espejos de motos) para L7e; cuál aplica a un L7e cerrado lo tiene que decir el laboratorio. Los espejos cuestan resistencia aerodinámica; las cámaras, dinero y homologación.',
      opciones: [
        { nombre: 'Pods con cabeza de retrovisor de moto homologada (Puig, España) en un brazo propio', pros: 'Cabeza con marca E; barato (decenas de euros); fácil de orientar; Puig es español.', contras: 'Hay que demostrar el campo de visión en el coche; el brazo propio debe plegarse al golpe; si el laboratorio pide R46, la cabeza de moto podría no valer (por confirmar).', coste: 'por confirmar (retrovisores de moto Puig en tiendas españolas)' },
        { nombre: 'Retrovisores exteriores de un coche pequeño de desguace', pros: 'Marca E según R46 seguro; con el campo de visión de un coche.', contras: 'Grandes y pesados para este morro: más resistencia aerodinámica (el modelo ya descuenta algo por retrovisores).', coste: '30–80 € el par (desguace, por confirmar)' },
        { nombre: 'Cámaras y pantallas (CMS) homologadas (Stoneridge-Orlaco MirrorEye) o desarrollo con Ficosa', pros: 'Menos resistencia y 1 kg menos (alternativa «Cámaras» de la ficha); Orlaco tiene un sistema aprobado para sustituir espejos en camiones; Ficosa (Barcelona) desarrolla retrovisores digitales para fabricantes.', contras: 'Precio de un sistema de camión (por confirmar, miles de euros) y homologación aparte de la instalación; Ficosa trabaja para fabricantes, no para prototipos.', coste: 'por confirmar' },
      ],
      recomendacion: 'Pods con cabeza homologada (Puig) para el prototipo 1, tras confirmar R46/R81 con IDIADA; cámaras para el prototipo 2.',
      porQue: 'Un espejo con marca E cuesta decenas de euros y se instala en una tarde; un CMS cuesta miles y meses. La pregunta R46/R81 se resuelve con un correo antes de comprar.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Pantalla e instrumentación',
      contexto: 'Hace falta un velocímetro legal y conviene ver batería, potencia y avisos. Todo viene por CAN del inversor y del BMS.',
      opciones: [
        { nombre: 'AiM MXS 1.2 Strada (5″, CAN)', pros: 'Pantalla de competición lista para usar, configurable por software, CAN doble, se compra en la UE.', contras: '1.440 € (ORECA Store, Francia); hay que escribirle el protocolo CAN de nuestro inversor y BMS; no muestra vídeo de la cámara.', coste: '1.440 € (ORECA Store, nov. 2026)' },
        { nombre: 'Pantalla propia: microcontrolador con CAN + pantalla de 7″', pros: 'Piezas por unos 150 € (por confirmar); muestra lo que queramos, incluida la cámara; se puede publicar el código en humanity.wiki.', contras: 'Semanas de programación y pruebas; un fallo en el velocímetro es un fallo de homologación; sin garantía de nadie.', coste: '≈ 150 € en piezas (por confirmar) + trabajo' },
        { nombre: 'Pantalla del fabricante del inversor (Sevcon o Curtis)', pros: 'Habla el CAN del inversor sin programar nada.', contras: 'Modelo y precio por confirmar; suelen ser pantallas pequeñas de carretilla; no leen el BMS.', coste: 'por confirmar' },
      ],
      recomendacion: 'Pantalla propia para el prototipo 1 si hay alguien en el equipo que programe; si no, AiM MXS Strada.',
      porQue: 'La pantalla propia es la que encaja con el espíritu del proyecto (abierta, con cámara, barata) y el riesgo se controla haciendo que el velocímetro venga directo del inversor. La AiM es la red de seguridad: 1.440 € a cambio de cero programación.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Mazo de 12 V: hacerlo o encargarlo',
      contexto: 'Unos 4 m de coche, una veintena de consumidores, conectores estancos. Para un prototipo cambia cada semana.',
      opciones: [
        { nombre: 'Hacerlo nosotros con material de automoción (cable FLRY, conectores Deutsch, caja de fusibles, relés)', pros: 'Se puede cambiar en el taller cada vez que algo se mueve; material barato y con ficha (Auto Electric Supplies, RS).', contras: 'Horas de trabajo y hay que saber crimpar bien; etiquetar todo.', coste: '≈ 300–500 € de material (por confirmar)' },
        { nombre: 'Encargar el mazo a un fabricante de cableado de automoción', pros: 'Acabado profesional, prensado y probado.', contras: 'Para una unidad y con el diseño cambiando no compensa; no se ha encontrado un fabricante español que confirme series de una unidad.', coste: 'por confirmar' },
      ],
      recomendacion: 'Hacerlo nosotros, con esquema y etiquetas, y encargarlo en el prototipo 2 cuando el diseño esté quieto.',
      porQue: 'En el prototipo 1 el mazo se va a abrir diez veces; un mazo encargado es un mazo que no se puede tocar.',
      cuando: 'antes de fabricar',
    },
    {
      tema: 'Dónde se revisa la instalación de luces',
      contexto: 'La marca E de cada pieza no basta: el laboratorio mira dónde está cada luz, a qué altura, con qué ángulos de visibilidad y qué campo cubren los retrovisores. Mejor saberlo antes de cerrar la carrocería.',
      opciones: [
        { nombre: 'Applus IDIADA (Tarragona)', pros: 'Hace el expediente L7e completo; una sola interlocución para luces, batería y motor.', contras: 'Presupuesto por confirmar; orientado a fabricantes grandes.', coste: 'por confirmar' },
        { nombre: 'LCOE · Laboratorio Central Oficial de Electrotecnia (Madrid)', pros: 'Laboratorio oficial español de alumbrado de vehículos; especialista en fotometría.', contras: 'Solo luces; no se ha podido comprobar su web ni su oferta en esta búsqueda.', coste: 'por confirmar' },
      ],
      recomendacion: 'Preinspección con IDIADA (por el expediente completo) y consulta al LCOE si hay dudas de fotometría con las tapas de los faros.',
      porQue: 'Una visita de un día antes de cerrar la carrocería evita rehacer el morro.',
      cuando: 'antes de fabricar',
    },
  ],
  partners: [
    { nombre: 'Hella', tipo: 'fabricante', pais: 'Alemania', web: 'https://www.hella.com/australiansolutions/assets/documents_global/Hella-90mm-Module-Brochure-0224.pdf', que: 'Módulos de faro de 90 mm: cruce, carretera, Bi-LED L 4565 (R149 clase B), antiniebla, con posición y diurna integradas en algunos; multitensión.', porQue: 'El faro homologado más compacto que existe para un morro a medida; catálogo público con referencias y pesos.', estado: 'por contactar', verificado: true },
    { nombre: 'Arnold Clark Autoparts', tipo: 'proveedor', pais: 'Reino Unido', web: 'https://www.arnoldclarkautoparts.com/products/hella-1bl-010-820-801-de-led-headlight-90mm-performance-bi-led-l70-12v', que: 'Faros Hella de 90 mm con precio público: Performance Bi-LED (ref. 1BL 010 820-801) a 543,48 £.', porQue: 'Referencia de precio del Bi-LED; comprar en la UE si un distribuidor español lo iguala.', estado: 'por contactar', verificado: true },
    { nombre: 'Agri-Lighting', tipo: 'proveedor', pais: 'Reino Unido', web: 'https://agri-lighting.co.uk/?p=7049', que: 'Insertos y faros Hella de 90 mm (Essential L4565, Performance Bi-LED L70 y L5570).', porQue: 'Segunda fuente de los módulos de 90 mm con catálogo completo.', estado: 'por contactar', verificado: true },
    { nombre: 'Lazer Lamps', tipo: 'fabricante', pais: 'Reino Unido', web: 'https://www.lazerlamps.com/eu/sentinel-7-elite.html', que: 'Faros LED de carretera con marca E: Sentinel 7″ Elite (R149 clase B de carretera, R148 de posición, R10; 375–427 €), barras Linear (R149 de carretera).', porQue: 'Si se quiere una luz larga en barra fina al estilo del 3D, es la única homologada encontrada; no da cruce.', estado: 'por contactar', verificado: true },
    { nombre: 'Lights & Styling', tipo: 'proveedor', pais: 'Países Bajos', web: 'https://www.lightsandstyling.com/en/brands/was/was-w171dd-l-rear-light-multifunctional-left-ip68.html', que: 'Tienda de iluminación de vehículos con marca E: pilotos WAS W171DD (124 € sin IVA), Lazer Linear-18 Elite (521 € sin IVA), Aspöck y otros.', porQue: 'Un solo pedido en la UE para pilotos y barra de carretera, con precios públicos.', estado: 'por contactar', verificado: true },
    { nombre: 'WAS (a través de Unitrailer)', tipo: 'fabricante', pais: 'Polonia (fabricante) · Reino Unido / Irlanda (tienda)', web: 'https://unitrailer.co.uk/product-eng-15441-WAS-W245-LED-rear-lamp-6-functions-universal.html', que: 'Pilotos LED multifunción con marca E (W245, W171, W150) para remolques, furgonetas y vehículos especiales.', porQue: 'Fabricante europeo barato de pilotos homologados; formatos finos que caben en las pestañas de la cola.', estado: 'por contactar', verificado: true },
    { nombre: 'Aspöck Systems', tipo: 'fabricante', pais: 'Austria', web: 'https://www.aspoeck.com/aspoeck/products/product-catalogs/spare-parts/2025/ASP_SPAREPARTS_05_DE_%20EN_2025_digital_reduced.pdf', que: 'Pilotos traseros LED homologados (Ecoled, Multiled, Flatpoint), luces de matrícula, catadióptricos; catálogo 2025 público.', porQue: 'Alternativa a WAS con más gama de luces de matrícula y catadióptricos homologados.', estado: 'por contactar', verificado: true },
    { nombre: 'Puig', tipo: 'fabricante', pais: 'España (Barcelona)', web: 'https://www.tradeinn.com/motardinn/es/iluminacion-puig/16706/7460/x', que: 'Retrovisores y accesorios de moto con homologación; el proveedor de la ficha de serie.', porQue: 'Cabeza de retrovisor homologada, española y barata para los pods; su catálogo se vende en tiendas de moto.', estado: 'por contactar', verificado: true },
    { nombre: 'Ficosa', tipo: 'fabricante', pais: 'España (Barcelona)', que: 'Fabricante de retrovisores y de sistemas de retrovisión digital (cámara y pantalla) para fabricantes de coches.', porQue: 'Para la versión con cámaras del prototipo 2: es el especialista español. Trabaja para fabricantes grandes; sin web comprobada en esta búsqueda.', estado: 'por contactar', verificado: false },
    { nombre: 'Stoneridge-Orlaco', tipo: 'fabricante', pais: 'Países Bajos / EE. UU.', que: 'Sistemas de cámara y pantalla para vehículos industriales; MirrorEye, aprobado para sustituir los retrovisores de camiones.', porQue: 'Referencia de CMS homologado si algún día se quitan los espejos. Sin web comprobada en esta búsqueda.', estado: 'por contactar', verificado: false },
    { nombre: 'DOGA', tipo: 'fabricante', pais: 'España (Abrera, Barcelona)', web: 'https://digital.agritechnica.com/newfront/exhibitor/doga-sa', que: 'Sistemas de limpiaparabrisas a medida, motores de corriente continua, depósitos y lavaparabrisas.', porQue: 'Fabricante español de limpiaparabrisas para vehículos especiales; su motor de 85° de 12 V se vende a 110 £ en Reino Unido.', estado: 'por contactar', verificado: true },
    { nombre: 'Auto Electric Supplies', tipo: 'proveedor', pais: 'Reino Unido', web: 'https://autoelectricsupplies.co.uk/p/doga-11213802b00-850-wiper', que: 'Cable de automoción, fusibles y cajas, relés, terminales y conectores, interruptores, motores DOGA de limpia (110 £ sin IVA).', porQue: 'Todo el material del mazo de 12 V y el limpia en una tienda con catálogo público.', estado: 'por contactar', verificado: true },
    { nombre: 'ORECA Store (AiM)', tipo: 'proveedor', pais: 'Francia', web: 'https://en.oreca-store.com/aim-mxs-1-2-strada-dashboard-road-version-display-can-connection.html', que: 'Pantallas AiM: MXS 1.2 Strada de 5″ con CAN (1.440 €), MXG de 7″.', porQue: 'La pantalla de catálogo si no se programa una propia; tienda de la UE con precio público.', estado: 'por contactar', verificado: true },
    { nombre: 'RS Components España', tipo: 'proveedor', pais: 'España', web: 'https://es.rs-online.com/web/p/contactores/2798782', que: 'Conectores Deutsch/TE, relés, fusibles, cable, ferritas, herramientas de crimpar.', porQue: 'Entrega en días en España para todo lo pequeño del mazo.', estado: 'por contactar', verificado: true },
    { nombre: 'Applus IDIADA', tipo: 'laboratorio', pais: 'España (Santa Oliva, Tarragona)', web: 'https://www.applusidiada.com/en/activity/homologation_and_product_certification_-1328274726542', que: 'Homologación de vehículos L: instalación de luces, retrovisores, compatibilidad electromagnética (R10), expediente completo.', porQue: 'Quien responde a R46/R81 y revisa la instalación antes de cerrar la carrocería.', estado: 'por contactar', verificado: true },
    { nombre: 'LCOE · Laboratorio Central Oficial de Electrotecnia (UPM)', tipo: 'laboratorio', pais: 'España (Madrid)', que: 'Laboratorio oficial español de ensayos de alumbrado y señalización de vehículos.', porQue: 'Especialista en fotometría para la duda de las tapas transparentes sobre los faros. Sin web comprobada en esta búsqueda.', estado: 'por contactar', verificado: false },
  ],
  mensajes: [
    {
      para: 'Hella', canal: 'formulario web', idioma: 'es', asunto: 'Consulta: módulos de 90 mm Bi-LED L 4565 para un prototipo de cuadriciclo eléctrico (L7e) en España',
      cuerpo: 'Buenos días,\n\nEstamos desarrollando el Aeromóvil 1, un cuadriciclo pesado eléctrico (categoría L7e, dos plazas, carrocería aerodinámica) en [ciudad]. Queremos montar dos módulos de 90 mm Bi-LED L 4565 (cruce y carretera) empotrados en el morro, con una tapa transparente de carrocería delante.\n\nNos gustaría saber:\n- qué distribuidor en España nos puede servir 2 unidades (y 20 para una serie corta), precio y plazo\n- el certificado de homologación de cada referencia (número de marca E y reglamento, R149) y la ficha con consumo, peso, corte de montaje y profundidad\n- si la homologación admite una tapa transparente delante del módulo o si hay que ensayar el conjunto\n- qué módulo de 90 mm recomiendan para posición y luz diurna (R148)\n\nContacto: [nombre], [correo], [teléfono].\n\nGracias,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Distribuidor en España', 'Precio por 2 y por 20', 'Plazo', 'Certificados de marca E (R149, R148)', 'Fichas técnicas con corte de montaje', 'Respuesta sobre la tapa transparente'],
    },
    {
      para: 'Lights & Styling', canal: 'correo', idioma: 'en', asunto: 'Quote request: WAS W171DD rear lamps, number plate lamp, reflectors and Lazer Linear-18 Elite for a vehicle prototype in Spain',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype (EU L7e) in Spain and need E-marked lighting:\n- 2 × WAS W171DD multifunction rear lamps (left and right)\n- 1 × E-marked number plate lamp and 2 × red non-triangular reflectors\n- 1 × E-marked third brake lamp (slim, about 300–500 mm wide, if you have one)\n- 1 × Lazer Linear-18 Elite\n\nCould you send us the price excluding VAT for 1 vehicle and for 10 vehicles, lead time to Spain, and for each item the E-mark approval number and regulation (R148/R149/R150 or the former R6/R7/R23/R38/R4/R3/R112) and the datasheet with dimensions and weight?\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Precio por 1 y por 10 vehículos', 'Plazo a España', 'Número de marca E y reglamento de cada pieza', 'Fichas con medidas y peso', 'Condiciones de pago'],
    },
    {
      para: 'Lazer Lamps', canal: 'correo', idioma: 'en', asunto: 'Question: E-marked dipped beam options and Sentinel/Linear approvals for an L7e prototype',
      cuerpo: 'Hello,\n\nWe are building a lightweight electric quadricycle prototype (EU L7e) in Spain with a very slim front end. Your Sentinel 7″ Elite and Linear-18 Elite are approved as driving (high) beams under R149 class B. Do you have any product approved as a dipped (low) beam, or a recommended combination with a dipped-beam module? Please send prices excluding VAT for 1 and for 10 vehicles, lead time to Spain, and the approval certificates (R149, R148, R10).\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Si tienen luz de cruce homologada', 'Precio por 1 y por 10', 'Plazo a España', 'Certificados R149/R148/R10', 'Fichas técnicas', 'Condiciones'],
    },
    {
      para: 'Puig', canal: 'correo', idioma: 'es', asunto: 'Consulta: cabezas de retrovisor homologadas para un prototipo de cuadriciclo eléctrico (L7e)',
      cuerpo: 'Buenos días,\n\nEstamos desarrollando el Aeromóvil 1, un cuadriciclo pesado eléctrico (L7e) de dos plazas con carrocería cerrada, en [ciudad]. Queremos montar dos retrovisores pequeños sobre brazos propios en la base del parabrisas (como los del Aptera) y necesitamos cabezas de retrovisor con homologación.\n\n¿Qué modelos de su catálogo tienen marca E y bajo qué reglamento (R81 de motocicletas o R46)? ¿Pueden indicarnos precio para 2 y para 20 unidades, plazo y la ficha con la superficie del espejo y el radio de curvatura (necesarios para justificar el campo de visión)?\n\nContacto: [nombre], [correo], [teléfono].\n\nGracias,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Modelos con marca E y reglamento (R81 / R46)', 'Precio por 2 y por 20', 'Plazo', 'Ficha con superficie y radio de curvatura del espejo', 'Condiciones'],
    },
    {
      para: 'DOGA', canal: 'correo', idioma: 'es', asunto: 'Consulta: limpiaparabrisas de 12 V para un parabrisas de policarbonato de un prototipo de cuadriciclo eléctrico',
      cuerpo: 'Buenos días,\n\nEstamos desarrollando el Aeromóvil 1, un cuadriciclo pesado eléctrico (L7e) en [ciudad], con un parabrisas plano de policarbonato de unos [ancho] × [alto] mm, inclinado unos 33°. Necesitamos un limpiaparabrisas de 12 V de un brazo, con lavaparabrisas, para un prototipo (1 unidad) y una serie corta posterior (10–20).\n\n¿Pueden recomendarnos un motor y un brazo de su catálogo (ángulo de barrido, par, consumo), con precio para 1 y para 10 unidades, plazo y ficha técnica? ¿Tienen escobillas aptas para policarbonato con tratamiento antirrayas?\n\nContacto: [nombre], [correo], [teléfono].\n\nGracias,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Motor y brazo recomendados', 'Precio por 1 y por 10', 'Plazo', 'Ficha técnica (ángulo, par, consumo)', 'Escobilla apta para policarbonato', 'Condiciones'],
    },
    {
      para: 'ORECA Store (AiM)', canal: 'correo', idioma: 'en', asunto: 'Question: AiM MXS 1.2 Strada with a custom CAN stream (EV inverter + BMS) and video input',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype in Spain. Before ordering an AiM MXS 1.2 Strada (CAN version), could you confirm:\n- that we can define a custom CAN protocol (messages from a Sevcon Gen4 inverter and an Orion BMS 2) with the AiM software\n- whether any AiM display can show a rear camera video input\n- price excluding VAT for 1 and for 10 units, and lead time to Spain\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Protocolo CAN personalizable', 'Entrada de vídeo', 'Precio por 1 y por 10', 'Plazo a España', 'Condiciones'],
    },
    {
      para: 'Applus IDIADA', canal: 'formulario web', idioma: 'es', asunto: 'Consulta: preinspección de instalación de luces y retrovisores (R46 o R81) de un prototipo L7e antes de cerrar la carrocería',
      cuerpo: 'Buenos días,\n\nEstamos desarrollando el Aeromóvil 1, un cuadriciclo pesado eléctrico (L7e, dos plazas en tándem, carrocería cerrada aerodinámica) en [ciudad]. Antes de fabricar el molde de la carrocería queremos resolver tres dudas de instalación:\n1. Para un L7e con habitáculo cerrado, ¿los retrovisores se rigen por el UN R46 o por el R81, y qué campo de visión hay que cubrir? ¿Se admite un sistema de cámaras (CMS) como alternativa?\n2. Si empotramos dos módulos de faro de 90 mm homologados (Hella Bi-LED, R149) detrás de una tapa transparente de carrocería, ¿hace falta ensayar el conjunto?\n3. Alturas y separaciones mínimas de pilotos e intermitentes para nuestra cola (anexo IX del Reglamento delegado (UE) 3/2014).\n\n¿Ofrecen una revisión de diseño o preinspección de un día, y con qué presupuesto y plazo? Nos interesa también su oferta para el expediente completo de homologación L7e.\n\nContacto: [nombre], [correo], [teléfono].\n\nGracias,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['R46 o R81 para nuestro caso y campo de visión', 'Tapa transparente sobre faros homologados: sí o no', 'Alturas y separaciones de luces', 'Presupuesto y plazo de una preinspección', 'Oferta de expediente L7e completo'],
    },
    {
      para: 'Auto Electric Supplies', canal: 'correo', idioma: 'en', asunto: 'Quote request: 12 V wiring material for a vehicle prototype (cable, fuse box, relays, Deutsch connectors) and DOGA 85° wiper motor',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype in Spain and would like a quote, excluding VAT, with shipping to Spain, for:\n- 1 × DOGA 11213802B00 85° wiper motor 12 V and a matching arm and blade for a 600 mm flat windscreen\n- a 12-way blade fuse box, 6 × 12 V 30 A relays with sockets\n- thin-wall automotive cable: 25 m each of 1.0, 1.5 and 2.5 mm², and 5 m of 6 mm²\n- Deutsch DT connector kit (2, 4, 6 and 12-way, with terminals) and a crimping tool\n- braided sleeving and grommets\n\nPlease tell us the lead time and whether you ship to Spain after Brexit (customs handling).\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Precio sin IVA de cada partida', 'Plazo y envío a España (aduana)', 'Fichas técnicas del motor de limpia', 'Condiciones de pago'],
    },
  ],
  referencias: [
    { titulo: 'Reglamento delegado (UE) 3/2014 · seguridad funcional de los vehículos L (texto en español, BOE)', url: 'https://www.boe.es/doue/2014/007/L00001-00102.pdf', nota: 'Anexo I: lista de reglamentos UN aplicables a L7e (luces R1–R113, retrovisores R46 y R81, cristales R43, cinturones R16). Anexo VI: cristales, limpia y desempañado. Anexo VII: mandos y testigos. Anexo IX: instalación de luces. Anexo X: visión indirecta.' },
    { titulo: 'Reglamento delegado (UE) 2016/1824 · modificaciones (R10 para L1e–L7e; luz de marcha atrás según R23; encendido automático de faros o diurnas en vehículos eléctricos)', url: 'https://www.legislation.gov.uk/eur/2016/1824/adopted/data.html', nota: 'Hace obligatoria la compatibilidad electromagnética en toda la categoría L.' },
    { titulo: 'Reglamento (UE) 168/2013 · Anexo I: categoría L7e', url: 'https://legislation.gov.uk/eur/2013/168/annex/I/2016-01-01', nota: 'Para saber en qué subcategoría se homologa (L7e-A2 o L7e-C), que condiciona la velocidad máxima y, con ella, algunos requisitos de luces y retrovisores.' },
    { titulo: 'UN R148 · dispositivos de señalización luminosa (texto)', url: 'https://www.marklines.com/statics/unece/pdf_202004/R148e.pdf', nota: 'Posición, freno, intermitentes, matrícula, diurna, marcha atrás, antiniebla trasera: lo que antes eran R6, R7, R23, R38, R87, R91, R4.' },
    { titulo: 'UN R149 · dispositivos de alumbrado de la calzada (índice de documentos)', url: 'https://globalautoregs.com/rules/218/documents?year=2021', nota: 'Cruce, carretera y antiniebla delantera: lo que antes eran R112, R113, R19, R98, R123. Los faros Hella de 90 mm van marcados «R149 clase B».' },
    { titulo: 'UN R150 · catadióptricos y marcados retrorreflectantes (índice de documentos)', url: 'https://globalautoregs.com/rules/219/documents?year=2021', nota: 'Los catadióptricos rojos traseros (antes R3).' },
    { titulo: 'UN R48 · instalación de luces en vehículos (texto consolidado)', url: 'https://www.tralert.com/wp-content/uploads/2025/08/R048r13e_0.pdf', nota: 'Es el de los coches (M y N); el anexo IX de 3/2014 fija lo de los L, pero las definiciones de altura, separación y ángulos de visibilidad se leen aquí.' },
    { titulo: 'UN R81 · retrovisores de motocicletas (índice)', url: 'https://lexaris.de/library/tableofcontents/2048502', nota: 'Uno de los dos reglamentos de retrovisores que el anexo I de 3/2014 lista para L7e.' },
    { titulo: 'Hella · folleto de módulos de 90 mm (2024)', url: 'https://www.hella.com/australiansolutions/assets/documents_global/Hella-90mm-Module-Brochure-0224.pdf', nota: 'Referencias: Bi-LED L 4565 Essential 1LL 015 318-011 (1.307 g) y Performance 1LL 015 318-041 (1.366 g); R149 clase B; cortes de montaje de 98–99 mm.' },
    { titulo: 'Hella 90 mm Performance Bi-LED L70 (543,48 £, Arnold Clark Autoparts)', url: 'https://www.arnoldclarkautoparts.com/products/hella-1bl-010-820-801-de-led-headlight-90mm-performance-bi-led-l70-12v', nota: '12 V, cruce y carretera, 143 mm de alto y 182 mm de profundidad; agotado en nov. 2026.' },
    { titulo: 'WAS W171DD piloto multifunción (124 € sin IVA, Lights & Styling)', url: 'https://www.lightsandstyling.com/en/brands/was/was-w171dd-l-rear-light-multifunctional-left-ip68.html', nota: 'Freno, posición, intermitente dinámico, marcha atrás, antiniebla; marca E (R6, R7, R23, R38, R10); 350 × 131 × 81 mm; 12–24 V.' },
    { titulo: 'Lazer Sentinel 7″ Elite (375–427 €)', url: 'https://www.lazerlamps.com/eu/sentinel-7-elite.html', nota: 'R149 clase B de carretera (solo en modo de baja potencia, 23 W, 2.049 lm), R148 de posición blanca, R10. Sin luz de cruce.' },
    { titulo: 'Lazer Linear-18 Elite (521 € sin IVA, Lights & Styling)', url: 'https://www.lightsandstyling.com/en/brands/lazer/lazer-linear-18-elite.html', nota: '520 × 40 × 62 mm, 1.090 g, 126 W, luz de carretera R149/R112.' },
    { titulo: 'AiM MXS 1.2 Strada CAN (1.440 €, ORECA Store)', url: 'https://en.oreca-store.com/aim-mxs-1-2-strada-dashboard-road-version-display-can-connection.html', nota: 'Pantalla de 5″ 800 × 480, CAN doble.' },
    { titulo: 'DOGA 11213802B00 motor de limpiaparabrisas 85° 12 V (110 £ sin IVA, Auto Electric Supplies)', url: 'https://autoelectricsupplies.co.uk/p/doga-11213802b00-850-wiper', nota: 'Fabricante español (Abrera, Barcelona); la tienda vende además cable, fusibles, relés y conectores.' },
    { titulo: 'DOGA, S.A. · ficha de expositor (dirección y productos)', url: 'https://digital.agritechnica.com/newfront/exhibitor/doga-sa', nota: 'Autovía A-2 km 583, Abrera; sistemas de limpiaparabrisas a medida, motores DC, lavaparabrisas.' },
    { titulo: 'Ficosa · retrovisor digital (noticia)', url: 'https://www.vozpopuli.com/motor/empresa-espanola-ficosa-retrovisor-europa_0_1176783742.html', nota: 'Referencia del fabricante español de sistemas de retrovisión digital, para la opción de cámaras del prototipo 2.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de producto y compras (búsquedas web del 2026-11-06; precios sin IVA salvo que se diga)' },
};
