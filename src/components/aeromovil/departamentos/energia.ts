import type { Departamento } from './tipos';

// Escrito por el bot de producto y compras (2026-11-06) a partir de
// `componentes.ts`, `geometriaA1.ts`, el changelog y lo encontrado en la web.
// Regla de oro: nada inventado. Cada precio lleva su fuente y su fecha; lo que
// no se ha podido comprobar dice «por confirmar».
//
// Vocabulario (para quien no es ingeniero):
// - Celda: la unidad de batería que se compra (un «ladrillo» prismático o un
//   cilindro 21700 de 21 mm × 70 mm). Se juntan en serie (suma tensión) y en
//   paralelo (suma capacidad). «30s3p» = 30 en serie por 3 en paralelo.
// - LFP (litio-ferrofosfato) y NMC (níquel-manganeso-cobalto): las dos
//   químicas. LFP es más segura, barata y dura más ciclos; NMC pesa menos.
// - BMS: el gestor de la batería: vigila cada celda, equilibra, corta si algo
//   va mal y le dice al inversor y al cargador cuánto pueden pedir.
// - Contactor: un relé grande que conecta la batería al coche; precarga: la
//   resistencia que evita el chispazo al conectar.
// - Cargador a bordo: convierte el enchufe de casa (230 V) en la corriente
//   continua que carga la batería. Tipo 2: la toma normalizada europea.
// - DC-DC: el convertidor que saca 12 V de la batería grande para luces,
//   pantalla y bombas.
// - MPPT: el regulador que saca de los paneles solares la máxima potencia y la
//   convierte a la tensión de la batería.
// - Wh/kg, Wh/L: cuánta energía cabe por kilo y por litro del paquete entero.
export const DEPARTAMENTO: Departamento = {
  id: 'energia', nombre: 'Batería, carga y energía solar', lema: 'la energía: celdas, BMS, cargador, cableado de alta tensión y paneles',
  mision: 'Dar al Aeromóvil 1 sus 27 kWh (unos 500 km a 100 km/h según el modelo) en módulos de 9 cm de alto pegados al suelo del chasis bajo el piloto y el pasajero, con un gestor que no deje que ninguna celda se pase, un cargador de 3,3 kW con toma Tipo 2, el cableado naranja y las protecciones que exige la seguridad eléctrica de los cuadriciclos (UN R136), y los paneles solares del capó, el lomo y el techo con su regulador. Para el prototipo 1, lo que importa es que la batería sea segura, se pueda montar con las manos y las herramientas de un taller, y que su peso y su precio reales entren en el modelo.',
  responsabilidades: [
    'Elegir la química y el formato de celda (LFP prismática o NMC 21700), el número de celdas en serie y en paralelo, y comprobar que caben en los módulos de 9 cm del plano (`geometriaA1.ts`: bajo el piloto 1,14 × 0,84 m, bajo el pasajero 0,72 × 0,80 m).',
    'Diseñar los módulos: caja, compresión de las celdas, barras de conexión, aislamiento, fijación al chasis y la tapa que sostiene el asiento.',
    'Elegir y configurar el BMS: vigilancia celda a celda, equilibrado, temperaturas, límites de corriente comunicados por CAN al inversor y al cargador, calefacción de celdas si hace falta.',
    'Diseñar la caja de distribución de alta tensión: contactores positivo y negativo, precarga, fusible principal, medida de corriente, interbloqueo (corta la tensión al abrir la caja) y desconectador de servicio.',
    'Especificar el cableado naranja de alta tensión, los conectores y la protección contra contacto directo, conforme a UN R136.',
    'Elegir el cargador a bordo (3,3 kW, CAN, estanco) y la toma Tipo 2 en el morro, lado izquierdo, y el convertidor DC-DC de 12 V.',
    'Diseñar la integración solar: células o paneles flexibles sobre el capó, las franjas del lomo y el techo plano, el cableado y el regulador MPPT, y medir cuánto aporta de verdad.',
    'Planificar los ensayos de seguridad de la batería (UN R136 para homologar; UN 38.3 solo si hay que transportar el paquete montado) con un laboratorio.',
    'Escribir el procedimiento de trabajo seguro con alta tensión (guantes, herramientas aisladas, dos personas, extintor) y formar a quien monte.',
    'Pedir presupuestos, llevar el coste y el peso reales a `componentes.ts` y a la ficha «La pieza real, escrita a mano».',
  ],
  parametros: ['kWh', 'whKg', 'whL', 'altBat', 'mSolarM2', 'sol'],
  componentes: ['bateria', 'cargador', 'cableado', 'solar'],
  tareas: [
    {
      titulo: 'Fijar con Propulsión la tensión del sistema (96 V) y las corrientes',
      detalle: 'La batería tiene que dar 160 A continuos (15 kW) y 330 A de pico (32 kW) a 96 V, y aceptar 35 A del cargador y lo que den los paneles. Acordar la ventana de tensión (mínima, nominal, máxima) y escribirla en la hoja «Arquitectura eléctrica v1». Con LFP son 30 celdas en serie (96 V nominales, 109,5 V llena, 75 V vacía); con NMC, 26 en serie (96 V nominales, 109 V llena).',
      prioridad: 'alta', semanas: 1, entregable: 'Hoja «Arquitectura eléctrica v1» firmada por los dos departamentos',
    },
    {
      titulo: 'Medir el hueco real de los módulos y decidir el formato de celda',
      detalle: 'Con el 3D (`baterias` en el modelo): bajo el piloto 1,14 × 0,84 m y bajo el pasajero 0,72 × 0,80 m, 9 cm de alto. Una celda EVE LF105 mide 36,7 × 200,5 × 130,3 mm: tumbada son dos capas (73 mm) en 9 cm; 90 celdas (30s3p) ocupan 1,17 m² de los 1,54 m² disponibles. Una LF280K (280 Ah) necesitaría solo 30 celdas; comprobar sus medidas y si cabe tumbada en 9 cm. Dibujar la disposición de las dos opciones.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Fijar con Propulsión la tensión del sistema (96 V) y las corrientes'], entregable: 'Plano de disposición de celdas en los dos módulos, con peso y Wh/kg estimados',
    },
    {
      titulo: 'Pedir presupuesto y ficha técnica de las celdas',
      detalle: 'A NKON (Países Bajos): EVE LF105 (26,40 € sin IVA a partir de 32 unidades, en stock, nov. 2026), EVE LF280K (precio por confirmar) y Molicel P50B 21700 (4,37 € a partir de 200). Pedir la ficha con corrientes de carga y descarga continuas y de pico, el certificado UN 38.3 del lote (lo necesitan para enviarlas) y la fecha de fabricación. Para 27 kWh: 90 × LF105 ≈ 2.376 €; 1.500 × P50B ≈ 6.555 €.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Medir el hueco real de los módulos y decidir el formato de celda'], entregable: 'Tabla de celdas con precio, peso, medidas, corrientes y plazo',
    },
    {
      titulo: 'Decidir la química y el formato (ver decisión «Celdas»)',
      detalle: 'Con el plano y la tabla: LFP prismática (90 celdas o 30 celdas, montaje manual, ≈ 125–140 Wh/kg de paquete) o NMC 21700 (1.500 celdas, soldadura por puntos, ≈ 165 Wh/kg). Actualizar `whKg` y `whL` en el diseño y mirar que las 22 comprobaciones sigan en verde (sobre todo «Batería: cabe en los módulos» y «no asoma por la panza»).',
      prioridad: 'alta', semanas: 1, dependeDe: ['Pedir presupuesto y ficha técnica de las celdas'], entregable: 'Decisión escrita; `whKg`/`whL` actualizados en el diseño por defecto',
    },
    {
      titulo: 'Elegir el BMS y pedirlo',
      detalle: 'Orion BMS 2 (Ewert Energy, EE. UU.; en EVShop.eu: 770 € sin IVA para 24 celdas, 880 € para 36, más sensor de corriente 90–115 € y adaptador CAN 85 €), Batrium (Australia, pensado para celdas LFP sueltas), EMUS G1 (Lituania, a través de Electric Motorsport) o BMS-EV (Polonia, 500 €, orientado a paquetes de coches de serie). Pedir la lista de inversores y cargadores con los que ya hablan por CAN.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Decidir la química y el formato (ver decisión «Celdas»)'], entregable: 'BMS elegido y pedido; mapa de los mensajes CAN que publica',
    },
    {
      titulo: 'Diseñar los dos módulos: caja, compresión, barras y aislamiento',
      detalle: 'Las celdas prismáticas LFP tienen que ir comprimidas entre placas (el fabricante da la vida útil «con 300 kg de presión»): dos placas de aluminio con tirantes, celdas con láminas aislantes entre sí, barras de cobre o aluminio con el par de apriete del fabricante, sensores de temperatura cada 4–6 celdas, tapa de 3 mm que sostiene el asiento y soporta al piloto (es lo que hace de suelo bajo las caderas). Salida por un conector de alta tensión estanco. Dibujar en el CAD y comprobar con Chasis la fijación al «travesaño del asiento» y a los largueros.',
      prioridad: 'alta', semanas: 3, dependeDe: ['Decidir la química y el formato (ver decisión «Celdas»)'], entregable: 'Planos de los módulos y lista de materiales',
    },
    {
      titulo: 'Diseñar la caja de distribución de alta tensión',
      detalle: 'Dos contactores (TE Kilovac LEV200, 500 A, bobina 12 V: 289 € sin IVA cada uno en RS España, nov. 2026), relé y resistencia de precarga, fusible principal (250–300 A, por confirmar modelo), sensor de corriente del BMS, desconectador de servicio accesible y el circuito de interbloqueo (si se abre la tapa, caen los contactores). Todo en una caja de aluminio con prensaestopas, cerca del módulo del pasajero.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Elegir el BMS y pedirlo'], entregable: 'Esquema unifilar de alta tensión y lista de compra',
    },
    {
      titulo: 'Especificar el cableado naranja, los conectores y la protección contra contacto',
      detalle: 'Cable de 35 mm² naranja con doble aislamiento (clase de automoción) de la batería a la caja, de la caja al inversor (≈ 1,5 m hasta la cola) y al cargador (en el morro, bajo el salpicadero); conectores estancos con interbloqueo; todo lo que lleve más de 60 V tapado y marcado. UN R136 pide aislamiento ≥ 100 Ω/V (medir con megóhmetro) y protección contra contacto directo: anotar cómo se cumple cada punto.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Diseñar la caja de distribución de alta tensión'], entregable: 'Lista de cables y conectores con longitudes; hoja de cumplimiento R136',
    },
    {
      titulo: 'Elegir y pedir el cargador a bordo y la toma Tipo 2',
      detalle: 'TC Charger 3,3 kW CAN 96 V (34–132 V, 32 A, IP67, 6,4 kg; 650 € sin IVA en EVShop.eu, sin stock en nov. 2026) o Zivan NG3 CAN en versión 96 V (ATECH, Alemania, precio bajo petición, IP20). El cargador tiene que obedecer al BMS por CAN. Toma Tipo 2 de vehículo (32 A monofásica) con tapa en el morro, lado izquierdo; el cargador necesita leer el pilotaje de la toma (señal CP) o un pequeño módulo que lo haga.',
      prioridad: 'media', semanas: 2, dependeDe: ['Elegir el BMS y pedirlo'], entregable: 'Cargador y toma pedidos; esquema de la carga',
    },
    {
      titulo: 'Elegir el convertidor DC-DC de 12 V y la batería auxiliar',
      detalle: '500 W (luces LED, pantalla, bombas, limpiaparabrisas, contactores) desde 75–110 V a 13,8 V, aislado. Candidatos: el DC-DC de Thunderstruck Motors o el de TC Charger integrado en el cargador (ficha «Cargador 3,3 kW con DC-DC integrado»); modelo y precio por confirmar. Una pequeña batería de 12 V (2–5 Ah) para cerrar los contactores al arrancar.',
      prioridad: 'media', semanas: 1, dependeDe: ['Elegir y pedir el cargador a bordo y la toma Tipo 2'], entregable: 'DC-DC elegido; esquema de 12 V con Luces',
    },
    {
      titulo: 'Montar un módulo de prueba pequeño (8–10 celdas) y ensayarlo',
      detalle: 'Antes de hacer los dos módulos grandes: un módulo de 8 celdas LFP con el BMS, cargar y descargar a 1C, medir temperaturas, equilibrado y la caída de tensión a 330 A durante 30 s. Sirve también de batería de ensayo para el banco de Propulsión si se hacen 30 celdas (96 V).',
      prioridad: 'alta', semanas: 2, dependeDe: ['Diseñar los dos módulos: caja, compresión, barras y aislamiento', 'Elegir el BMS y pedirlo'], entregable: 'Informe del módulo de prueba y ajustes de diseño',
    },
    {
      titulo: 'Montar los dos módulos definitivos y la caja de distribución',
      detalle: 'Celdas numeradas y con la tensión medida una a una antes de montar (todas en ±10 mV); apriete de barras con llave dinamométrica; medición de aislamiento con megóhmetro a 500 V antes de cerrar; primera conexión con la precarga y el BMS en modo vigilancia. Dos personas, guantes aislantes, zona despejada.',
      prioridad: 'alta', semanas: 3, dependeDe: ['Montar un módulo de prueba pequeño (8–10 celdas) y ensayarlo', 'Especificar el cableado naranja, los conectores y la protección contra contacto'], entregable: 'Batería montada; hoja de medidas de cada celda y del aislamiento',
    },
    {
      titulo: 'Primera carga completa y medida de capacidad',
      detalle: 'Con el cargador por CAN: carga completa, equilibrado, descarga controlada (en el banco de Propulsión o con una carga resistiva) y cálculo de los kWh reales. Comparar con los 27 kWh del diseño y con los 24,8 kWh usables que dice la ficha.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Montar los dos módulos definitivos y la caja de distribución', 'Elegir y pedir el cargador a bordo y la toma Tipo 2'], entregable: 'kWh medidos; curva de carga',
    },
    {
      titulo: 'Pedir presupuesto de paneles o células solares y del regulador',
      detalle: 'Medir en el modelo la superficie solar (capó, dos franjas del lomo y techo plano; `areas.solar`). Pedir: Solbian (Italia) paneles a medida con células SunPower (de catálogo: SP144 de 144 W, 0,83 m², 1,9 kg, 1.339 $ en EE. UU., ≈ 9 $/W), Sunbeam Systems (Suecia; Tough 58 W a 379 € con IVA en Países Bajos, 23,7 %), Sono Solar (Múnich; integración solar en vehículos, reguladores de 12/24 V y a medida de 48/400/800 V). Preguntar expresamente por un regulador que cargue a 96–110 V: Genasun GVB-8 llega a 56,8 V (48 V de litio) y voltajes a medida «de fábrica», máximo por confirmar.',
      prioridad: 'media', semanas: 2, entregable: 'Tabla de paneles (W, kg/m², €/W) y respuesta sobre el MPPT a 110 V',
    },
    {
      titulo: 'Decidir la integración solar del prototipo 1 (ver decisión «Solar»)',
      detalle: 'Con las ofertas: paneles pegados sobre la carrocería ya laminada (reversible, rápido) frente a células laminadas en el molde (más bonito, irreversible). Y a qué tensión carga: a la batería grande (necesita un MPPT elevador a 110 V que no se ha encontrado de catálogo) o a los 12 V de servicios (regulador de catálogo, 135 $). Actualizar `mSolarM2` con el peso de la oferta.',
      prioridad: 'media', semanas: 1, dependeDe: ['Pedir presupuesto de paneles o células solares y del regulador'], entregable: 'Decisión escrita y pedido',
    },
    {
      titulo: 'Montar los paneles y medir un día entero de sol',
      detalle: 'Pegar o fijar los paneles con Carrocería, pasar el cableado por el interior del lomo, conectar el MPPT y registrar durante un día despejado la energía que entra (Wh). Compararlo con `solarDia` del modelo (que supone un 70 % de la superficie plana) y corregir el modelo si hace falta.',
      prioridad: 'baja', semanas: 1, dependeDe: ['Decidir la integración solar del prototipo 1 (ver decisión «Solar»)'], entregable: 'Wh medidos en un día; `RENDIMIENTO_SOLAR` corregido si toca',
    },
    {
      titulo: 'Planificar con CIDETEC o IDIADA los ensayos de la batería',
      detalle: 'Para el prototipo que rueda en pista cerrada no hace falta certificar; para homologar sí: UN R136 (vibración, choque térmico, caída, cortocircuito, sobrecarga, sobredescarga, sobretemperatura y, desde septiembre de 2025, sobrecorriente). Pedir a CIDETEC (San Sebastián; ensaya según UN 38.3, IEC 62660, ISO 12405, R100 v2) y a Applus IDIADA presupuesto y qué muestras necesitan (normalmente un módulo o un paquete de sacrificio: contar con comprar celdas de más).',
      prioridad: 'media', semanas: 2, dependeDe: ['Decidir la química y el formato (ver decisión «Celdas»)'], entregable: 'Presupuesto y plan de ensayos; número de celdas extra a comprar',
    },
    {
      titulo: 'Escribir el procedimiento de seguridad de alta tensión y formar al equipo',
      detalle: 'Una página plastificada en el taller: quién puede tocar la batería, cómo se desconecta (desconectador de servicio), guantes y herramientas aisladas, qué hacer si una celda se hincha o humea (extintor, sacar el coche, no echar agua a chorro), teléfono de emergencias. Formación de una hora a todo el que entre en el taller.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Diseñar la caja de distribución de alta tensión'], entregable: 'Procedimiento firmado por todos los que montan',
    },
    {
      titulo: 'Actualizar las fichas con pesos y precios reales',
      detalle: 'Pesar los módulos, la caja, el cargador y los paneles; meter las facturas. La ficha de serie estima la batería a 300 €/kWh (8.100 €): con celdas LFP a 26 € la unidad las celdas solas salen a unos 79 €/kWh (26,40 € por 336 Wh), y el resto es BMS, caja y mano de obra. Que el número de la web sea el real.',
      prioridad: 'media', semanas: 1, dependeDe: ['Primera carga completa y medida de capacidad'], entregable: 'Fichas al día y entrada en el changelog',
    },
  ],
  decisiones: [
    {
      tema: 'Celdas: química y formato',
      contexto: 'Hay que meter 27 kWh en dos módulos de 9 cm de alto bajo los asientos. Las celdas son el 30–50 % del coste del coche y la parte que más tiempo de montaje lleva. El modelo de serie supone NMC 21700 a 165 Wh/kg (164 kg).',
      opciones: [
        { nombre: 'LFP prismática EVE LF105 (105 Ah), 30 en serie × 3 en paralelo = 90 celdas', pros: 'Precio público y en stock en la UE (26,40 € sin IVA a partir de 32 unidades, NKON); 3.500 ciclos; química muy segura; montaje con barras y tornillos, sin soldar; caben tumbadas en dos capas (73 mm) en los 9 cm; 2.376 € en celdas.', contras: 'Más pesada: ≈ 180 kg de celdas (≈ 125–150 Wh/kg de paquete, por confirmar con el peso real de la celda), unos 20–50 kg más que el diseño de serie; a −10 °C carga mal (hace falta calefacción de celdas).', coste: '≈ 2.376 € las celdas (NKON, nov. 2026) + BMS, caja y barras' },
        { nombre: 'LFP prismática EVE LF280K (280 Ah), 30 en serie = 30 celdas', pros: 'Solo 30 celdas y 30 conexiones: el montaje más sencillo posible; misma química segura; menos cajas y menos cable.', contras: 'Precio y medidas por confirmar (no se ha encontrado ficha ni precio en esta búsqueda); una celda de 280 Ah es grande (≈ 5,4 kg): hay que ver si cabe tumbada en 9 cm; una celda mala para la vida del paquete entero.', coste: 'por confirmar (si el €/Wh es el de la LF105, ≈ 2.400 €)' },
        { nombre: 'NMC 21700 Molicel P50B (5 Ah), 26 en serie × 58 en paralelo ≈ 1.500 celdas', pros: 'La más ligera (≈ 105 kg de celdas, 200 Wh/kg de celda; el paquete ronda los 165–190 Wh/kg); 60 A por celda: potencia sobrada.', contras: '1.500 celdas y unas 3.000 soldaduras por puntos: hace falta máquina, plantillas y días de trabajo; portaceldas y níquel aparte; un error de soldadura es un punto caliente; 6.555 € solo en celdas.', coste: '≈ 6.555 € las celdas (4,37 € a partir de 200, NKON, nov. 2026) + níquel, portaceldas y soldadura' },
        { nombre: 'Módulos de coche eléctrico de desguace (BMW i3, Tesla, Leaf)', pros: 'Módulos ya hechos con sus celdas de automoción y su refrigeración; EVShop.eu tiene un mercado de paquetes usados con informe de salud.', contras: 'Tensiones y formas que no encajan en 9 cm (los módulos del i3 miden más); precio «bajo petición»; estado desconocido; BMS del coche original que hay que sustituir.', coste: 'por confirmar' },
      ],
      recomendacion: 'LFP prismática: 30s3p de EVE LF105 si la LF280K no cabe tumbada o no tiene precio claro; en los dos casos, calefacción de celdas y `whKg` del diseño bajado a 130–140.',
      porQue: 'Para un primer prototipo pesa más la seguridad y poder montarlo en un taller con una llave dinamométrica que 30 kg de diferencia. Y las celdas cuestan la tercera parte que las NMC. El coste de la decisión es ese peso (unos 25 km menos de autonomía según el modelo) y la calefacción en invierno. Lo que no se ha podido comprobar: el peso exacto de la LF105 y todo lo de la LF280K.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'BMS (gestor de la batería)',
      contexto: 'El BMS es lo que convierte 90 celdas en una batería de coche: equilibra, protege y le dice al inversor y al cargador cuánta corriente pueden mover. Tiene que hablar CAN con un Sevcon o un Curtis y con un TC Charger o un Zivan.',
      opciones: [
        { nombre: 'Orion BMS 2 (Ewert Energy, EE. UU.)', pros: 'El más usado en conversiones; hasta 180 celdas en serie; dos buses CAN; perfiles para cargadores TC/Elcon; se compra en la UE (EVShop.eu).', contras: 'Configuración larga (un vendedor rival habla de 50 horas); sin stock en EVShop en nov. 2026; 880 € sin IVA para 36 celdas, más sensor y adaptador.', coste: '880 € (36 celdas) + 90–115 € sensor + 85 € adaptador CAN (EVShop.eu, nov. 2026)' },
        { nombre: 'Batrium (Australia)', pros: 'Pensado para paquetes de celdas LFP sueltas; muy documentado; monitorización por módulo.', contras: 'Más de almacenamiento estacionario que de automoción; integración CAN con el inversor a comprobar; precio por confirmar; envío desde Australia.', coste: 'por confirmar' },
        { nombre: 'EMUS G1 (Lituania)', pros: 'Fabricante de la UE; hasta 255 celdas; controla cargadores Elcon/TC por CAN; se vende en kits (Electric Motorsport).', contras: 'Precio del kit por confirmar; menos comunidad que Orion.', coste: 'por confirmar' },
        { nombre: 'BMS-EV (Polonia) o Daly (China)', pros: 'BMS-EV: 500 €, soporte en la UE; Daly: muy barato, Bluetooth.', contras: 'BMS-EV está hecho para paquetes de coches de serie, no para celdas sueltas (lo dice su propia comparativa); Daly no tiene CAN de automoción ni perfiles de inversor: vale para un patinete, no para un coche de 32 kW.', coste: '500 € (BMS-EV) · Daly por confirmar' },
      ],
      recomendacion: 'Orion BMS 2 de 36 celdas, pedido ya por la cola de espera de EVShop, y pedir precio del EMUS G1 por si llega antes.',
      porQue: 'Es el que seguro habla con el inversor y el cargador que vamos a comprar, y el que más gente ha instalado en coches: cada problema que tengamos lo ha tenido alguien antes. Las horas de configuración son reales: contarlas en las tareas.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Cargador a bordo y toma',
      contexto: 'La ficha de serie pide 3,3 kW desde un enchufe normal (≈ 9 h para 27 kWh) con toma Tipo 2. El cargador tiene que obedecer al BMS por CAN y estar en el morro, bajo el salpicadero, junto a la toma.',
      opciones: [
        { nombre: 'TC Charger 3,3 kW CAN 96 V (34–132 V, 32 A)', pros: 'IP67 (estanco), −35 a +85 °C, protocolos CAN que entienden Orion y EMUS, 650 € sin IVA en EVShop.eu, 239 × 135 × 125 mm.', contras: 'Sin stock en nov. 2026; 6,4 kg según la ficha técnica (la de serie supone 6 kg para cargador + DC-DC); no lee por sí solo la señal de la toma Tipo 2.', coste: '650 € sin IVA (EVShop.eu, nov. 2026)' },
        { nombre: 'Zivan NG3 CAN, versión 96 V (Italia; en Alemania a través de ATECH)', pros: 'Fabricante europeo de cargadores de vehículos industriales; CAN; versiones de 96 y 120 V.', contras: 'IP20 (no estanco: va dentro, seco); 220 × 430 × 95 mm, más grande; precio bajo petición; rendimiento > 85 % (el TC dice ≥ 93 %).', coste: 'por confirmar' },
        { nombre: 'Cargador 3,3 kW con DC-DC integrado (TC Charger, serie con DC-DC)', pros: 'Una caja en vez de dos: menos peso y cable (es la alternativa de la ficha de serie).', contras: 'Modelo exacto y precio por confirmar; si falla uno, fallan los dos.', coste: 'por confirmar (la ficha estima 520 €)' },
      ],
      recomendacion: 'TC Charger 3,3 kW CAN 96 V más un módulo que lea la toma Tipo 2, y DC-DC aparte.',
      porQue: 'Estanco, barato, con el CAN que entienden los BMS candidatos, y cabe en el hueco del plano. El Zivan es la reserva europea si el TC no vuelve a stock. El DC-DC aparte deja que luces y bombas sigan si el cargador se estropea.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Caja de distribución y protecciones de alta tensión',
      contexto: 'Sin contactores, precarga, fusible e interbloqueo el coche no es seguro ni cumple UN R136. Es una caja pequeña pero es donde se decide que un fallo no acabe en incendio.',
      opciones: [
        { nombre: 'Componentes de automoción sueltos (TE Kilovac LEV200/EV200, fusible de vehículo eléctrico, relé de precarga) montados por nosotros', pros: 'Piezas con ficha y certificación; se compran en RS/Farnell España (LEV200: 289 € sin IVA, 500 A, 900 V); diseño a nuestra medida.', contras: 'Dos contactores son 580 € y hay que diseñar y cablear la caja; RS da el LEV200 sin stock hasta finales de noviembre de 2026.', coste: '≈ 580 € contactores + fusible, precarga, sensor y caja ≈ 250 € (por confirmar)' },
        { nombre: 'Caja de distribución de vehículo ligero chino ya montada (alternativa «kit» de la ficha de serie)', pros: 'Contactores, precarga y cables ya montados por 320 €.', contras: 'Solo por Alibaba, sin certificación comprobable; hay que revisar cada crimpado y cada contactor para fiarse.', coste: '320 € (estimación de la ficha de serie)' },
      ],
      recomendacion: 'Componentes de automoción sueltos (TE Kilovac) en caja propia.',
      porQue: 'La caja de alta tensión es lo que un laboratorio mira primero, y con fichas de TE se puede demostrar cada elección. Son 500 € más que el kit; es el precio de poder enseñar la caja sin disculparse.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Paneles solares: cómo se integran y a qué cargan',
      contexto: 'El plano pone paneles en el capó, en dos franjas del lomo y en el techo plano hasta la cola. El modelo supone 200 W/m² y 2,2 kg/m² y que cargan la batería de tracción. El problema práctico: no se ha encontrado un regulador de catálogo que cargue a 96–110 V desde paneles de vehículo.',
      opciones: [
        { nombre: 'Paneles flexibles de catálogo (Solbian, Sunbeam) pegados sobre la carrocería terminada, cargando los 12 V de servicios con un MPPT de catálogo', pros: 'Todo existe y tiene precio: Solbian SP144 (144 W, 0,83 m², 1,9 kg = 2,3 kg/m², 1.339 $), Genasun GVB-8 (8 A, 135 $); montaje en un día; se puede quitar; alivia a la batería grande de luces, bombas y pantalla.', contras: '≈ 9 $/W: unos 4.000 $ para 2,5 m² (la ficha de serie suponía 2 €/W); los kilómetros «al sol» del modelo suponen que la energía entra en la batería de tracción, y así entra solo indirectamente.', coste: '≈ 4.000 $ paneles (Solbian, lista de precios de EE. UU.) + 135 $ MPPT + cable' },
        { nombre: 'Paneles a medida de Solbian o integración de Sono Solar con regulador a medida que cargue la batería de 96 V', pros: 'Carga directa a tracción como en el Aptera; Sono Solar ofrece reguladores a medida de 48/400/800 V y desarrollo de integración.', contras: 'Precio y plazo por confirmar (proyecto de ingeniería, no catálogo); el regulador a 110 V es un desarrollo.', coste: 'por confirmar' },
        { nombre: 'Células sueltas (SunPower Maxeon) laminadas en el molde de la carrocería', pros: 'Es lo más integrado y lo más bonito; sigue cualquier curva.', contras: 'Laminar células en una pieza de carbono es un proceso que hay que aprender (roturas, sombras, encapsulado ETFE); si una célula falla hay que rehacer la pieza; proveedor de células y laminador no encontrados en esta búsqueda.', coste: 'por confirmar' },
      ],
      recomendacion: 'Para el prototipo 1, paneles de catálogo pegados (Solbian a medida o Sunbeam) cargando los 12 V de servicios; en paralelo, pedir a Sono Solar y a Genasun un regulador a 110 V para el prototipo 2.',
      porQue: 'Lo primero es que el coche ruede y que los paneles no retrasen la carrocería. Cargar los 12 V ya ahorra a la batería grande los 250 W de equipos que el modelo descuenta. Cuesta aceptar que, hasta tener el regulador, los «km al sol» del modelo son una promesa: hay que decirlo en la web.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Ensayos de seguridad: qué laboratorio y cuándo',
      contexto: 'Para rodar en pista cerrada no hace falta certificado; para homologar hace falta UN R136 sobre la batería y el sistema de alta tensión. Los ensayos destruyen muestras.',
      opciones: [
        { nombre: 'CIDETEC Energy Storage (San Sebastián)', pros: 'Laboratorio de baterías de referencia en Europa, 4.000 m², ensayos de abuso (cortocircuito, sobrecarga, térmicos), UN 38.3, IEC 62660, ISO 12405, R100 v2; a dos horas de muchos talleres del norte.', contras: 'No cita UN R136 en su web (preguntar); presupuesto por confirmar; hay que llevar módulos de sacrificio.', coste: 'por confirmar' },
        { nombre: 'Applus IDIADA (Tarragona)', pros: 'Hace el expediente de homologación entero, no solo el ensayo; laboratorio de motores en el mismo sitio.', contras: 'Presupuesto por confirmar; orientado a fabricantes grandes.', coste: 'por confirmar' },
      ],
      recomendacion: 'Pedir presupuesto a los dos ahora, ensayar en CIDETEC cuando exista el segundo juego de módulos, y dejar a IDIADA el expediente.',
      porQue: 'Pedir presupuesto no cuesta nada y dice cuántas celdas de más hay que comprar. Ensayar antes de tener el diseño cerrado es tirar el dinero.',
      cuando: 'antes de probar',
    },
  ],
  partners: [
    { nombre: 'NKON', tipo: 'proveedor', pais: 'Países Bajos', web: 'https://www.nkon.nl/en/eve-lf105-prismatic-105ah-105a-lifepo4-a-grade.html', que: 'Celdas de litio con precio público y stock en la UE: EVE LF105 (26,40 € sin IVA desde 32 uds.), LF280K, Molicel P50B 21700 (4,37 € desde 200), Samsung 21700.', porQue: 'Es donde se compran celdas sueltas en Europa sin pedido mínimo industrial; precios comprobados en nov. 2026.', estado: 'por contactar', verificado: true },
    { nombre: 'EVShop.eu', tipo: 'proveedor', pais: 'Rumanía', web: 'https://evshop.eu/en/home/222-tc-charger-33kw-can-96v-34-132v-32a.html', que: 'Cargadores TC Charger (3,3 kW CAN 96 V: 650 € sin IVA), kits Orion BMS 2 (770–1.116 € según celdas), módulos y paquetes de coches eléctricos usados con informe de salud.', porQue: 'Un solo proveedor europeo para cargador y BMS, con precios públicos; el inconveniente es el stock.', estado: 'por contactar', verificado: true },
    { nombre: 'Ewert Energy Systems (Orion BMS)', tipo: 'fabricante', pais: 'EE. UU.', web: 'https://www.orionbms.com/manuals/pdf/orionbms2_purchasing_guide.pdf', que: 'Orion BMS 2 y Jr 2; manuales de cableado, compra y funcionamiento públicos.', porQue: 'El fabricante del BMS recomendado; su guía de compra dice exactamente qué pedir (número de celdas, sensores, arneses).', estado: 'por contactar', verificado: true },
    { nombre: 'Batrium', tipo: 'fabricante', pais: 'Australia', web: 'https://wiki.batrium.com/documents/batrium_bms_product_guide.pdf', que: 'BMS Watchmon para paquetes de celdas LFP sueltas; guía de producto pública.', porQue: 'Alternativa si el Orion no llega; muy documentado.', estado: 'por contactar', verificado: true },
    { nombre: 'Electric Motorsport (kits EMUS BMS)', tipo: 'proveedor', pais: 'EE. UU.', web: 'https://www.electricmotorsport.com/emus-g1-bms-kit.html', que: 'Kits del BMS EMUS G1 (Lituania): unidad de control, módulos de grupo CAN, hasta 255 celdas; controla cargadores Elcon/TC por CAN.', porQue: 'Camino para el EMUS (fabricante de la UE) con kit cerrado; y ya sería proveedor de Propulsión.', estado: 'por contactar', verificado: true },
    { nombre: 'BMS-EV', tipo: 'fabricante', pais: 'Polonia', web: 'https://bms-ev.com/en/2026/07/31/best-bms-ev-battery-conversion-comparison/', que: 'Controlador BMS de 500 € para paquetes de coches de serie reutilizados; soporte en la UE.', porQue: 'Solo si se eligiera la opción de módulos de desguace; su propia comparativa manda a Batrium o a Orion para celdas sueltas.', estado: 'por contactar', verificado: true },
    { nombre: 'ATECH Antriebstechnik (Zivan / Zapi)', tipo: 'proveedor', pais: 'Alemania', web: 'https://www.atech-antriebstechnik.de/en/motiontechnology/zapi-inverters-controller-l-motor-controller-steering-systems/detail-1/charger-ng3-can/zivan-charging-and-discharging-devices', que: 'Cargadores Zivan NG3 CAN (versiones 96 y 120 V, IP20), inversores Zapi.', porQue: 'Reserva europea del cargador si el TC Charger no vuelve a stock.', estado: 'por contactar', verificado: true },
    { nombre: 'Thunderstruck Motors', tipo: 'proveedor', pais: 'EE. UU.', web: 'https://www.thunderstruck-ev.com/tc-hk-j-440-10-charger-clone.html', que: 'Cargadores TC, convertidores DC-DC, contactores, cables y conectores de alta tensión para conversiones.', porQue: 'Si Propulsión le compra el kit de motor, el DC-DC y el cableado pueden ir en el mismo envío.', estado: 'por contactar', verificado: true },
    { nombre: 'RS Components España', tipo: 'proveedor', pais: 'España', web: 'https://es.rs-online.com/web/p/contactores/2798782', que: 'Contactores TE Kilovac LEV200/EV200 (289 € sin IVA, 500 A, 900 V), fusibles, relés, sensores, cable y conectores de alta tensión de TE y Amphenol.', porQue: 'Piezas certificadas con ficha, entrega en España en días; lo que pide un laboratorio.', estado: 'por contactar', verificado: true },
    { nombre: 'Solbian', tipo: 'fabricante', pais: 'Italia', web: 'https://www.nauticexpo.com/prod/solbian-energie-alternative-srl/product-34359-375268.html', que: 'Paneles flexibles con células SunPower, de catálogo (serie SP: 104–144 W, 2,3 kg/m²) y a medida; lista de precios de su distribuidor de EE. UU.: 959–1.339 $ por panel.', porQue: 'El proveedor de la ficha de serie; el único con peso por m² comprobado igual al del modelo.', estado: 'por contactar', verificado: true },
    { nombre: 'Sunbeam Systems (a través de Solar Power Supply)', tipo: 'proveedor', pais: 'Suecia (fabricante) · Países Bajos (tienda)', web: 'https://solarpowersupply.eu/sunbeamsystem-tough-58w', que: 'Paneles Tough con células SunPower al 23,7 % (58 W, 54 × 54 cm, 1,3 kg, 379 € con IVA), muy resistentes al pisado.', porQue: 'Formato cuadrado pequeño que encaja en las franjas del lomo; tienda en la UE.', estado: 'por contactar', verificado: true },
    { nombre: 'Sono Solar (Sono Motors GmbH)', tipo: 'ingeniería', pais: 'Alemania', web: 'https://sono-solar.com/?p=1630', que: 'Integración solar en vehículos: módulos, reguladores de 12/24 V y a medida de 48/400/800 V, desarrollo de soluciones.', porQue: 'La única empresa encontrada que hace de oficio lo que queremos (solar en carrocería de vehículo) y ofrece reguladores a medida: la pregunta del MPPT a 110 V va a ellos.', estado: 'por contactar', verificado: true },
    { nombre: 'Genasun (a través de eMarine Systems)', tipo: 'proveedor', pais: 'EE. UU.', web: 'https://www.emarineinc.com/Genasun-8A-Lithium-MPPT-Controller-Solar-BOOST-105-350W', que: 'Reguladores MPPT elevadores GVB-8 (8 A de entrada, salidas de litio 14,2–56,8 V, voltajes a medida de fábrica; 135 $).', porQue: 'El MPPT de catálogo para la opción «solar a 12 V»; y a quien preguntar si pueden programar una salida a 110 V.', estado: 'por contactar', verificado: true },
    { nombre: 'CIDETEC Energy Storage', tipo: 'laboratorio', pais: 'España (Donostia / San Sebastián)', web: 'https://energystorage.cidetec.es/en/our-offer/battery-testing/', que: 'Ensayos de celdas, módulos y paquetes: rendimiento, envejecimiento, climáticos, vibración, abuso y seguridad; UN 38.3, IEC 62660, ISO 12405, R100 v2.', porQue: 'El laboratorio español de referencia para baterías; cerca y con todos los ensayos que pide la homologación.', estado: 'por contactar', verificado: true },
    { nombre: 'Applus IDIADA', tipo: 'laboratorio', pais: 'España (Santa Oliva, Tarragona)', web: 'https://www.applusidiada.com/en/activity/homologation_and_product_certification_-1328274726542', que: 'Homologación y certificación de vehículos y componentes, incluidos los de categoría L y la seguridad eléctrica.', porQue: 'Quien al final firma el expediente; conviene que vea la batería antes de cerrarla.', estado: 'por contactar', verificado: true },
    { nombre: 'Millor Battery', tipo: 'fabricante', pais: 'España (Terrassa)', que: 'Fabricante español de baterías de litio a medida para vehículos (autobuses, camiones, movilidad).', porQue: 'Si se decide encargar los módulos en vez de montarlos: un fabricante cercano. No se ha podido ver su web ni confirmar que acepten un pedido de un prototipo.', estado: 'por contactar', verificado: false },
    { nombre: 'Cegasa', tipo: 'fabricante', pais: 'España (Vitoria)', que: 'Fabricante de baterías de litio (almacenamiento y movilidad) con centro de innovación.', porQue: 'Segunda opción nacional para encargar módulos; sin web comprobada en esta búsqueda.', estado: 'por contactar', verificado: false },
  ],
  mensajes: [
    {
      para: 'NKON', canal: 'correo', idioma: 'en', asunto: 'Quote request: 100 × EVE LF105 (or 32 × LF280K) for a 96 V vehicle prototype, Spain',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype (EU L7e, 96 V nominal, 27 kWh) in Spain. We plan a 30s3p pack of EVE LF105 (90 cells plus spares) or, if they fit our 90 mm tall modules, 30 × EVE LF280K.\n\nCould you send us:\n- price for 100 × LF105 and for 32 × LF280K, excluding VAT, and the price for 10 vehicles (1,000 / 320 cells)\n- the cell datasheets (dimensions, weight, continuous and peak charge/discharge current, cycle life, recommended compression)\n- the UN 38.3 test summary and the manufacturing date of the batch\n- lead time and shipping cost to Spain, and whether the cells are matched by capacity\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Precio por 100 LF105 y por 32 LF280K; precio para 10 vehículos', 'Plazo y envío a España', 'Cantidad mínima', 'Fichas técnicas con medidas, peso y corrientes', 'Resumen de ensayo UN 38.3 y fecha de fabricación', 'Condiciones de pago y garantía'],
    },
    {
      para: 'EVShop.eu', canal: 'correo', idioma: 'en', asunto: 'Availability and quote: TC Charger 3.3 kW CAN 96 V and Orion BMS 2 kit (36 cells) for a vehicle prototype in Spain',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype (EU L7e, 96 V nominal LFP pack, 30 cells in series, 27 kWh) in Spain.\n\nYour shop lists the TC charger 3.3 kW CAN 96 V (34–132 V, 32 A) and the Orion 2 BMS kit as out of stock. Could you tell us:\n- the expected restock date and the price and lead time for 1 unit of each, and for 10 units\n- for the Orion 2 kit for 36 cells: the recommended current sensor (we need 400 A peak) and harness options, and the CAN adapter\n- a DC-DC converter 96 V → 12 V, 500 W, that you recommend with this charger\n- shipping cost to Spain\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Fecha de reposición', 'Precio por 1 y por 10 del cargador y del kit Orion 2', 'Plazo y envío a España', 'Fichas técnicas', 'DC-DC recomendado y precio', 'Condiciones de pago y garantía'],
    },
    {
      para: 'Ewert Energy Systems (Orion BMS)', canal: 'correo', idioma: 'en', asunto: 'Compatibility question: Orion BMS 2 with Sevcon Gen4 and TC Charger on a 30s LFP pack',
      cuerpo: 'Hello,\n\nWe are designing a 30s3p LFP pack (EVE LF105, 96 V nominal, 27 kWh) for a light vehicle prototype in Spain, with a Sevcon Gen4 size 6 controller and a TC Charger 3.3 kW CAN. Before ordering an Orion BMS 2 (36-cell version) through a European distributor, could you confirm:\n- that Orion 2 can send charge and discharge current limits to the Sevcon Gen4 over CAN, and which CAN profile to use\n- the TC Charger CAN protocol it supports (CAN1000 / CAN997 / CAN1430?)\n- the recommended current sensor for 400 A peak / 160 A continuous\n- whether a European distributor you recommend has stock\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Compatibilidad CAN con Sevcon Gen4 y con TC Charger', 'Sensor de corriente recomendado', 'Distribuidor europeo con stock', 'Precio por 1 y por 10', 'Plazo', 'Documentación de configuración'],
    },
    {
      para: 'Sono Solar (Sono Motors GmbH)', canal: 'correo', idioma: 'en', asunto: 'Vehicle-integrated solar for a lightweight L7e prototype: panels on bonnet, flanks and roof, charge controller to a 96 V pack',
      cuerpo: 'Dear Sono Solar team,\n\nWe are building the Aeromóvil 1, a two-seat aerodynamic electric quadricycle (EU L7e, about 385 kg, 27 kWh, 96 V nominal battery) in Spain, with solar surfaces on the bonnet, two strips along the flanks and the flat roof: roughly [X] m² in total, on a composite body.\n\nWe would like to know:\n- whether you can supply custom-shaped solar modules for these surfaces (or recommend a module format), with weight per m² and W per m²\n- whether you can supply or develop a charge controller (MPPT) that charges our 96 V traction pack (75–110 V) directly, and its price and lead time\n- an indicative price for the integration of a single prototype, and for 10 vehicles\n\nContact: [nombre], [correo], [teléfono].\n\nBest regards,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Precio orientativo para 1 prototipo y para 10 vehículos', 'Plazo', 'Peso por m² y potencia por m² de los módulos', 'Regulador a 96–110 V: existe, precio, plazo', 'Fichas técnicas', 'Condiciones'],
    },
    {
      para: 'Solbian', canal: 'correo', idioma: 'en', asunto: 'Quote request: custom flexible panels (SunPower cells) for a vehicle roof and bonnet, Spain',
      cuerpo: 'Hello,\n\nWe are building a lightweight electric vehicle prototype in Spain with solar surfaces on the bonnet, two side strips and a flat roof (about [X] m² in total, gently curved composite body). We are considering your SP series or custom panels with SunPower cells, bonded to the body.\n\nCould you send us:\n- price per panel for the SP 104 / SP 118 / SP 144 in the EU (excl. VAT) and the price for custom shapes (we can send DXF outlines)\n- weight per m², cell efficiency, warranty and the recommended adhesive for a painted composite surface\n- lead time to Spain, and the price for 10 vehicles\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Precio por panel (catálogo y a medida) para 1 y para 10 vehículos', 'Plazo', 'Peso por m² y rendimiento', 'Adhesivo recomendado y garantía', 'Fichas técnicas', 'Condiciones'],
    },
    {
      para: 'CIDETEC Energy Storage', canal: 'correo', idioma: 'es', asunto: 'Consulta: ensayos UN R136 / UN 38.3 de una batería LFP de 96 V y 27 kWh para un prototipo de cuadriciclo eléctrico',
      cuerpo: 'Buenos días,\n\nEstamos desarrollando el Aeromóvil 1, un prototipo de cuadriciclo pesado eléctrico (categoría L7e, dos plazas, batería LFP de 96 V y 27 kWh en dos módulos de 9 cm de alto, BMS Orion 2) en [ciudad].\n\nNos gustaría saber:\n1. Si pueden realizar los ensayos de seguridad que exige el Reglamento UN R136 para vehículos de categoría L (vibración, choque térmico, caída, resistencia al fuego, cortocircuito, sobrecarga, sobredescarga, sobretemperatura y sobrecorriente) y, en su caso, el UN 38.3 para el transporte del paquete.\n2. Presupuesto orientativo y plazo por ensayo o por paquete completo, y cuántas muestras (módulos o paquetes) necesitan.\n3. Si pueden revisar el diseño de los módulos y de la caja de alta tensión antes de fabricarlos, como servicio de ingeniería.\n\nContacto: [nombre], [correo], [teléfono].\n\nMuchas gracias,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Si ensayan según UN R136', 'Presupuesto por ensayo y por paquete completo', 'Plazo', 'Número de muestras necesarias', 'Servicio de revisión de diseño y su coste', 'Validez del informe para la homologación'],
    },
    {
      para: 'RS Components España', canal: 'formulario web', idioma: 'es', asunto: 'Presupuesto: 2 contactores TE Kilovac LEV200 (bobina 12 V), fusible de vehículo eléctrico 300 A y conectores de alta tensión',
      cuerpo: 'Buenos días,\n\nPara un prototipo de vehículo eléctrico ligero (96 V, 330 A de pico) necesitamos presupuesto y plazo de:\n- 2 × contactor TE Kilovac LEV200, 500 A, bobina 12 V (ref. RS 279-8782 o equivalente con bobina económica)\n- 1 × relé de precarga y resistencia de precarga (50 W, por confirmar valor)\n- 1 × fusible de vehículo eléctrico 300 A, 150 V DC o superior, con portafusible\n- conectores de alta tensión estancos (2 polos, 35 mm²) con interbloqueo, 4 parejas\n- 10 m de cable naranja de automoción de 35 mm²\n\nSu web indica el LEV200 sin stock hasta el 30 de noviembre de 2026: ¿pueden confirmar fecha? ¿Precio para 10 vehículos?\n\nContacto: [nombre], [correo], [empresa/NIF].\n\nGracias,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Precio por 1 y por 10 de cada referencia', 'Plazo y fecha de reposición del LEV200', 'Fichas técnicas', 'Alternativas con stock', 'Condiciones de pago'],
    },
    {
      para: 'Millor Battery', canal: 'correo', idioma: 'es', asunto: 'Consulta: fabricación de dos módulos LFP de 96 V (27 kWh en total) para un prototipo de cuadriciclo eléctrico',
      cuerpo: 'Estimados señores,\n\nSomos [nombre del equipo], de humanity.wiki, y estamos construyendo el Aeromóvil 1, un cuadriciclo pesado eléctrico (L7e) de dos plazas en tándem con carrocería aerodinámica. La batería son 27 kWh a 96 V nominales en dos módulos planos de 9 cm de alto bajo los asientos (1,14 × 0,84 m y 0,72 × 0,80 m).\n\n¿Fabrican módulos a medida para un prototipo (una unidad) y, más adelante, para series cortas de 10 vehículos? Nos gustaría conocer un precio orientativo por kWh con BMS y caja, el plazo, y si trabajan con celdas LFP prismáticas (EVE LF105 o LF280K).\n\nContacto: [nombre], [correo], [teléfono].\n\nUn saludo,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Si aceptan un pedido de 1 unidad', 'Precio orientativo por kWh para 1 y para 10', 'Plazo', 'Química y celdas que usan', 'Certificaciones (UN 38.3, R136/R100)', 'Condiciones'],
    },
  ],
  referencias: [
    { titulo: 'UN R136 · seguridad eléctrica y de la batería (REESS) en vehículos de categoría L (resumen)', url: 'https://www.batterydesign.net/legislation-rules-and-regulations/ece-r136/', nota: 'Es el reglamento que aplica a los cuadriciclos (R100 es para turismos). Ensayos: aislamiento, agua, vibración, choque térmico, caída, fuego, cortocircuito, sobrecarga, sobredescarga, sobretemperatura y, obligatorio desde el 1 de septiembre de 2025, sobrecorriente.' },
    { titulo: 'Texto del Reglamento UN R136 (PDF)', url: 'https://data.thaiauto.or.th/iu3/images/stories/PDF/Law/UNECE/R136.pdf', nota: 'El texto completo, para leer los ensayos uno a uno.' },
    { titulo: 'Reglamento (UE) 168/2013 · Anexo I: categoría L7e', url: 'https://legislation.gov.uk/eur/2013/168/annex/I/2016-01-01', nota: 'Masa en orden de marcha ≤ 450 kg (por confirmar si la batería cuenta: el anexo no lo excluye para L7e) y potencia nominal continua ≤ 15 kW.' },
    { titulo: 'Reglamento delegado (UE) 3/2014 · seguridad funcional (texto en español, BOE)', url: 'https://www.boe.es/doue/2014/007/L00001-00102.pdf', nota: 'Anexo IV sobre seguridad eléctrica y carga; lista de reglamentos UN aplicables.' },
    { titulo: 'Reglamento delegado (UE) 2016/1824 · modificaciones (R10 de compatibilidad electromagnética para L1e–L7e; inhibición de marcha con el cargador conectado)', url: 'https://www.legislation.gov.uk/eur/2016/1824/adopted/data.html', nota: 'El cargador y el cableado tienen que pasar R10; el coche no debe poder moverse mientras carga.' },
    { titulo: 'EVE LF105 en NKON (26,40 € sin IVA desde 32 uds., en stock)', url: 'https://www.nkon.nl/en/eve-lf105-prismatic-105ah-105a-lifepo4-a-grade.html', nota: '105 Ah, 3,2 V, 36,7 × 200,5 × 130,3 mm, 1C, 3.500 ciclos al 80 % con 300 kg de compresión.' },
    { titulo: 'Molicel INR21700-P50B en NKON (4,37 € desde 200 uds.)', url: 'https://www.nkon.nl/en/molicel-inr21700-p50b-5000mah-50a.html', nota: '5.000 mAh, 70 g, 60 A de descarga.' },
    { titulo: 'Kit Orion BMS 2 en EVShop.eu (770–1.116 € sin IVA según celdas)', url: 'https://evshop.eu/en/bms/558-standard-orion-2-bms-kit-configurator.html', nota: 'Hasta 180 celdas en serie, dos CAN, sensor de corriente de 200–1.000 A aparte; sin stock en nov. 2026.' },
    { titulo: 'Guía de compra del Orion BMS 2 (Ewert Energy)', url: 'https://www.orionbms.com/manuals/pdf/orionbms2_purchasing_guide.pdf', nota: 'Qué pedir exactamente: versión por número de celdas, sensores, arneses, adaptador.' },
    { titulo: 'TC Charger 3,3 kW CAN 96 V en EVShop.eu (650 € sin IVA)', url: 'https://evshop.eu/en/home/222-tc-charger-33kw-can-96v-34-132v-32a.html', nota: '34–132 V, 32 A, IP67, ≥ 93 %, 6,4 kg, protocolos CAN1000/997/998/1430 y 1197/1198/1200.' },
    { titulo: 'Zivan NG3 CAN (ATECH, Alemania)', url: 'https://www.atech-antriebstechnik.de/en/motiontechnology/zapi-inverters-controller-l-motor-controller-steering-systems/detail-1/charger-ng3-can/zivan-charging-and-discharging-devices', nota: 'Versiones de 96 y 120 V, CAN, IP20, 220 × 430 × 95 mm; precio bajo petición.' },
    { titulo: 'Contactor TE Kilovac LEV200 en RS España (289,36 € sin IVA)', url: 'https://es.rs-online.com/web/p/contactores/2798782', nota: '500 A, 900 V DC, bobina 12 V; sin stock hasta el 30 de noviembre de 2026.' },
    { titulo: 'Lista de precios Solbian serie SP (distribuidor de EE. UU.)', url: 'https://www.coastalclimatecontrol.com/images/PDF/solar/2021_Solbian_Specs-Price_List.pdf', nota: 'SP104 959 $, SP118L 1.099 $, SP144 1.339 $: ≈ 9,2–9,3 $/W y 2,3 kg/m².' },
    { titulo: 'Sunbeam Tough 58 W (Solar Power Supply, Países Bajos)', url: 'https://solarpowersupply.eu/sunbeamsystem-tough-58w', nota: '379 € con IVA, 54 × 54 cm, 1,3 kg, células SunPower al 23,7 %; marcado como no disponible en nov. 2026.' },
    { titulo: 'Genasun GVB-8 (MPPT elevador, 135 $)', url: 'https://www.emarineinc.com/Genasun-8A-Lithium-MPPT-Controller-Solar-BOOST-105-350W', nota: 'Entrada 8 A y hasta 63 V en vacío; salidas de litio hasta 56,8 V; «voltajes a medida programados en fábrica», máximo por confirmar.' },
    { titulo: 'Sono Solar · productos y servicios', url: 'https://sono-solar.com/?p=1630', nota: 'Módulos, reguladores de 12/24 V y a medida de 48/400/800 V, desarrollo de integración. Múnich.' },
    { titulo: 'CIDETEC · laboratorio de ensayo de baterías', url: 'https://energystorage.cidetec.es/en/our-offer/battery-testing/', nota: 'UN 38.3, IEC 62660, ISO 12405, ISO 19453, R100 v2; abuso y seguridad; San Sebastián.' },
    { titulo: 'BloombergNEF 2025: precio medio del paquete de coche eléctrico (99 $/kWh en gran serie)', url: 'https://www.energy-storage.news/li-ion-battery-pack-prices-fell-8-since-last-year-despite-metals-prices-rising-bloombergnef-says/', nota: 'Referencia de la ficha de serie: el paquete de un prototipo cuesta 3 veces eso; las celdas LFP sueltas ya están en ≈ 79 €/kWh.' },
    { titulo: 'Comparativa de BMS para conversiones (BMS-EV, Polonia)', url: 'https://bms-ev.com/en/2026/07/31/best-bms-ev-battery-conversion-comparison/', nota: 'Es un blog de un vendedor: útil por la lista de opciones y sus precios (Orion 700–1.200 €), no por el veredicto.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de producto y compras (búsquedas web del 2026-11-06; precios sin IVA salvo que se diga)' },
};
