import type { Departamento } from './tipos';

// Escrito por el bot de producto y compras (2026-11-06) a partir de
// `componentes.ts`, `geometriaA1.ts`, el changelog y lo encontrado en la web.
// Regla de oro: nada inventado. Cada precio lleva su fuente y su fecha; lo que
// no se ha podido comprobar dice «por confirmar».
//
// Vocabulario (para quien no es ingeniero):
// - kW nominales / de pico: lo que el motor aguanta todo el rato sin
//   calentarse de más (nominal) y lo que da durante unos segundos (pico).
// - Inversor (o controlador): la caja electrónica que convierte la corriente
//   continua de la batería en la trifásica que mueve el motor y que decide
//   cuánto par da según el pedal. También hace el freno regenerativo
//   (recuperar energía al frenar).
// - Reductora: el engranaje fijo entre el motor y las ruedas (el motor gira
//   mucho más deprisa que las ruedas). Con diferencial para que las dos
//   ruedas traseras giren distinto en las curvas. No hay cambio de marchas.
// - Palier: el eje con juntas que lleva el giro de la reductora a cada rueda.
// - CAN: el «idioma» por el que se hablan inversor, batería, cargador y pantalla.
export const DEPARTAMENTO: Departamento = {
  id: 'propulsion', nombre: 'Motor, inversor y transmisión', lema: 'la fuerza: motor, electrónica de potencia, reductora y palieres',
  mision: 'Mover el Aeromóvil 1 a 140 km/h sostenidos con 15 kW y acelerar con 32 kW de pico, con el menor peso y coste que permita homologarlo como cuadriciclo pesado (clase L7e del Reglamento (UE) 168/2013, que limita la potencia nominal continua a 15 kW). Para el prototipo 1 eso significa elegir un motor y un inversor de 96 V que ya existan en catálogo, acoplarlos a una reductora con diferencial de vehículo ligero, montarlos bajos y detrás del pasajero como manda el plano, y probarlos primero en un banco y después en el coche, con el cable de 12 V del pedal y el software del inversor ajustados para que el coche sea suave y seguro.',
  responsabilidades: [
    'Fijar la cadena de tracción completa: motor, inversor, reductora con diferencial, palieres, refrigeración y pedal; que sea coherente con la batería de 96 V que elige Energía.',
    'Comprobar que el conjunto da 140 km/h sostenidos (15 kW nominales, por cálculo del modelo) y 32 kW de pico sin pasar de los límites legales de L7e (15 kW de potencia nominal continua, medida según el Reglamento (UE) 134/2014).',
    'Diseñar el soporte del motor y la reductora en el chasis (bajo, delante del eje trasero, según `geometriaA1.ts`) con Chasis, y los anclajes de los palieres con Rodaje.',
    'Definir el circuito de refrigeración líquida (bomba de 12 V, radiador pequeño en la cola, mangueras) y comprobar que el motor no pasa de 100 °C a 140 km/h sostenidos.',
    'Elegir y cablear el pedal acelerador, el selector de marcha (adelante, neutro, atrás) y las seguridades (no arrancar con marcha puesta, freno pisado para salir del neutro).',
    'Programar el inversor: curvas de par, límite de potencia nominal, freno regenerativo, protección térmica y comunicación CAN con la batería y la pantalla.',
    'Montar un banco de pruebas (motor + inversor + batería de ensayo) para verificar potencia, calentamiento y consumo antes de meterlo en el coche.',
    'Pedir presupuesto, plazo y ficha técnica a los proveedores y mantener al día el coste y el peso en `componentes.ts`.',
    'Documentar el esquema eléctrico de potencia y de mando, el par de apriete de cada tornillo del tren motriz y el procedimiento de puesta en marcha.',
  ],
  parametros: ['kWNom', 'kWPico', 'mMotor', 'mInversor', 'mReductora'],
  componentes: ['motor', 'inversor', 'transmision'],
  tareas: [
    {
      titulo: 'Fijar la tensión del sistema en 96 V y el reparto de potencia con Energía',
      detalle: 'Antes de pedir nada, acordar con Energía que la batería es de 96 V nominales (unos 75–110 V entre vacía y llena, según la química). De eso depende qué motor e inversor valen: a 96 V, 32 kW de pico son unos 330 A, y 15 kW nominales unos 160 A. Escribirlo en un documento de una página: tensión mínima, nominal y máxima, corriente continua y de pico, y el conector entre batería e inversor.',
      prioridad: 'alta', semanas: 1, entregable: 'Hoja «Arquitectura eléctrica v1» con tensiones y corrientes firmada por Propulsión y Energía',
    },
    {
      titulo: 'Confirmar qué significa «15 kW» para la homologación L7e',
      detalle: 'El Reglamento (UE) 168/2013 limita la «potencia nominal continua máxima» del cuadriciclo pesado a 15 kW, medida según el Reglamento (UE) 134/2014 (que remite al UN R85). Con Homologación, confirmar con un laboratorio (Applus IDIADA) cómo se mide esa potencia para un motor eléctrico, durante cuánto tiempo, y si los 32 kW de pico son admisibles como «potencia máxima» del inversor. Esto decide si el inversor se programa con un límite de 15 kW continuos y 32 kW durante 30 s.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Fijar la tensión del sistema en 96 V y el reparto de potencia con Energía'], entregable: 'Nota de dos páginas con la respuesta del laboratorio y el límite de potencia a programar',
    },
    {
      titulo: 'Pedir presupuesto y ficha técnica de los tres motores candidatos',
      detalle: 'Motenergy ME1616 (20 kW nominales / 55 kW de pico, 48–120 V, refrigerado por líquido; 1.170 $ en Thunderstruck Motors, nov. 2026), EMRAX 188 (23–29 kW continuos, 7,1–7,9 kg; precio solo bajo petición y el fabricante avisa de que lo va a descatalogar) y QS Motor QS180 90H (8 kW nominales, hasta 20 kW; por confirmar si llega a 15 kW continuos con líquido). Pedir a cada uno: curva de par y potencia a 96 V, peso real, refrigeración, encoder, precio por 1 y por 10 y plazo.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Fijar la tensión del sistema en 96 V y el reparto de potencia con Energía'], entregable: 'Tabla comparativa de motores con precio, peso y curva a 96 V',
    },
    {
      titulo: 'Pedir presupuesto de los inversores candidatos y de su programación',
      detalle: 'Sevcon (BorgWarner) Gen4 tamaño 6 G8055 (36–116 V, 550 A de pico, 220 A continuos; 1.200 $ en Thunderstruck, que cobra la programación aparte desde 100 $), Curtis 1238E 96 V 650 A (2.655 € sin IVA en Technotrade, Chequia, bajo pedido) y Kelly KLS de 96 V (por confirmar: en OZO Electric, Francia, solo aparece la versión de 72 V a 189 €). Preguntar expresamente: ¿viene emparejado con el motor elegido? ¿quién lo programa y con qué herramienta? ¿lleva CAN de automoción?',
      prioridad: 'alta', semanas: 2, dependeDe: ['Pedir presupuesto y ficha técnica de los tres motores candidatos'], entregable: 'Tabla comparativa de inversores y oferta de programación',
    },
    {
      titulo: 'Decidir motor e inversor (par motor-inversor que el proveedor ya haya probado junto)',
      detalle: 'Elegir con las dos tablas. Criterio: que el proveedor entregue motor e inversor ya emparejados y programados (ahorra semanas de ajuste), que el peso real entre en el modelo (`mMotor`, `mInversor`) y que la potencia continua a 96 V llegue a 15 kW con margen. Actualizar `componentes.ts` con el precio y el peso de la oferta.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Pedir presupuesto de los inversores candidatos y de su programación'], entregable: 'Decisión escrita y fichas de motor e inversor puestas al día',
    },
    {
      titulo: 'Elegir la reductora con diferencial y la relación de transmisión',
      detalle: 'Con el motor elegido (su régimen máximo y su par) calcular la relación: para 140 km/h con rueda de 562 mm (145/80 R13) y 6.000 rpm de motor hacen falta unas 4,5:1; con 8:1 el motor iría a 10.600 rpm, fuera de rango. Es decir: la relación «≈ 8:1» de la ficha de serie hay que revisarla con el motor real. Opciones: transeje del Twizy de desguace (relación por confirmar; se venden en eBay.de), transeje de vehículo ligero chino a la relación que toca, o correa dentada + diferencial de kart-cross.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Decidir motor e inversor (par motor-inversor que el proveedor ya haya probado junto)'], entregable: 'Cálculo de la relación y decisión de reductora, con brida de acople al motor dibujada',
    },
    {
      titulo: 'Comprar un transeje y dos palieres de Twizy para medir y adaptar',
      detalle: 'Aunque al final no sea la reductora definitiva, tener uno en la mesa permite medir la brida, la distancia entre ejes de salida, el aceite y el ruido, y da los palieres y las manguetas compatibles con las ruedas de 13″ ya elegidas. Pedir en desguaces (eBay.de tiene piezas de Twizy; precio por confirmar) y en Autodoc las rótulas nuevas.',
      prioridad: 'media', semanas: 3, dependeDe: ['Elegir la reductora con diferencial y la relación de transmisión'], entregable: 'Transeje y palieres en el taller, medidos y dibujados en el CAD',
    },
    {
      titulo: 'Diseñar el soporte del motor y la reductora en el chasis',
      detalle: 'El plano (`geometriaA1.ts`) pone el motor transversal bajo y justo detrás de las caderas del pasajero, pegado al suelo del chasis y delante del eje trasero; la reductora en el eje y el inversor detrás del eje. Diseñar con Chasis tres puntos de apoyo con silentblocks (tacos de goma) al «travesaño del motor» y a los largueros, comprobando en el 3D la holgura de 2 cm con la carrocería (la comprobación «Motor, reductora, inversor y cargador dentro de la carrocería» ya existe) y el ángulo de los palieres con la suspensión hundida.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Elegir la reductora con diferencial y la relación de transmisión'], entregable: 'Plano del soporte (chapa de aluminio de 5 mm o tubo) y lista de silentblocks',
    },
    {
      titulo: 'Diseñar el circuito de refrigeración líquida',
      detalle: 'Motor e inversor comparten circuito: bomba eléctrica de 12 V (tipo Bosch o Pierburg, de las que usan los coches híbridos), radiador pequeño con ventilador en la cola, vaso de expansión y mangueras de 3/8″ (las tomas del ME1616 son de 3/8″ según su ficha). Dimensionar para evacuar las pérdidas (≈ 1,5–2 kW a 15 kW de tracción con un 88–90 % de rendimiento). Pedir al proveedor del motor el caudal mínimo.',
      prioridad: 'media', semanas: 1, dependeDe: ['Decidir motor e inversor (par motor-inversor que el proveedor ya haya probado junto)'], entregable: 'Esquema del circuito con caudal, potencia a evacuar y lista de compra',
    },
    {
      titulo: 'Elegir pedal acelerador, selector de marcha y seguridades de arranque',
      detalle: 'Pedal con dos potenciómetros (señal doble: si una falla, el inversor corta), interruptor de freno (el inversor tiene que saber que se frena) y selector adelante/neutro/atrás con llave. Secuencia de arranque: llave, freno pisado, marcha; sin eso el motor no da par. Cada inversor exige un tipo de pedal: preguntar al proveedor cuál recomienda y comprarlo con el inversor.',
      prioridad: 'media', semanas: 1, dependeDe: ['Decidir motor e inversor (par motor-inversor que el proveedor ya haya probado junto)'], entregable: 'Lista de mandos y esquema de las entradas del inversor',
    },
    {
      titulo: 'Montar el banco de pruebas',
      detalle: 'Bancada con el motor, la reductora, el inversor, el radiador, una batería de ensayo de 96 V (puede ser un módulo pequeño de Energía) y un freno de carga (un segundo motor o un freno de disco con célula de carga). Medir par, potencia, temperatura del motor y del inversor y consumo a 5, 10, 15 kW durante 30 minutos y a 32 kW durante 30 segundos. Si no hay sitio ni medios, alquilar el banco del laboratorio de motores eléctricos de Applus IDIADA o del INSIA (UPM).',
      prioridad: 'alta', semanas: 3, dependeDe: ['Diseñar el circuito de refrigeración líquida', 'Elegir pedal acelerador, selector de marcha y seguridades de arranque'], entregable: 'Informe de banco con curvas de potencia y temperatura',
    },
    {
      titulo: 'Programar el inversor: curvas, límites y regeneración',
      detalle: 'Con el programador del fabricante (Sevcon: herramienta DVT y adaptador CAN; Curtis: 1313 o software VCL; Kelly: USB), fijar el límite de 15 kW continuos y 32 kW de pico, la rampa del pedal (suave al salir), el freno regenerativo al soltar el pedal (ajustable: en un coche ligero y aerodinámico demasiada regeneración se nota), el corte por temperatura y por tensión mínima de batería. Guardar el fichero de parámetros en el repositorio.',
      prioridad: 'alta', semanas: 2, dependeDe: ['Montar el banco de pruebas'], entregable: 'Fichero de parámetros del inversor v1 y hoja con cada ajuste explicado',
    },
    {
      titulo: 'Definir el CAN entre inversor, batería, cargador y pantalla',
      detalle: 'Escribir con Energía y Luces la lista de mensajes: la batería (BMS) le dice al inversor cuánta corriente puede dar y aceptar; el inversor publica régimen, par, temperaturas y fallos; la pantalla lo lee. Fijar velocidad (250 o 500 kbit/s), identificadores y qué pasa si se pierde la comunicación (el inversor reduce par y avisa).',
      prioridad: 'media', semanas: 1, dependeDe: ['Programar el inversor: curvas, límites y regeneración'], entregable: 'Tabla de mensajes CAN v1',
    },
    {
      titulo: 'Montar el tren motriz en el chasis y alinear los palieres',
      detalle: 'Fijar motor y reductora al soporte, montar los palieres a las manguetas traseras, llenar la reductora de aceite, conectar refrigeración e inversor. Comprobar con la suspensión en reposo y hundida que las juntas homocinéticas no pasan del ángulo que admite el fabricante (típicamente 20–25°).',
      prioridad: 'alta', semanas: 2, dependeDe: ['Diseñar el soporte del motor y la reductora en el chasis', 'Programar el inversor: curvas, límites y regeneración'], entregable: 'Tren motriz montado; hoja de pares de apriete',
    },
    {
      titulo: 'Primera rodadura en pista cerrada',
      detalle: 'Con el coche sobre caballetes primero (ruedas en el aire) y después en pista cerrada: arranque, marcha atrás, regeneración, 0–50 km/h, temperatura tras 10 minutos a 80 km/h. Registrar por CAN. Nadie en la pista sin casco y sin un extintor a mano.',
      prioridad: 'alta', semanas: 1, dependeDe: ['Montar el tren motriz en el chasis y alinear los palieres'], entregable: 'Registro de la primera rodadura y lista de ajustes',
    },
    {
      titulo: 'Ensayo de velocidad sostenida y de potencia nominal',
      detalle: 'En pista larga o en el banco de rodillos de un laboratorio: 30 minutos a la velocidad máxima que permita la pista, registrando potencia y temperaturas. Es el dato que luego pide la homologación (potencia nominal continua) y el que confirma el consumo de 4 kWh/100 km a 100 km/h que promete el modelo.',
      prioridad: 'media', semanas: 1, dependeDe: ['Primera rodadura en pista cerrada'], entregable: 'Informe de velocidad sostenida y consumo medido frente al modelo',
    },
    {
      titulo: 'Actualizar el modelo y las fichas con los pesos y precios reales',
      detalle: 'Escribir en cada ficha (`componentes.ts` y «La pieza real, escrita a mano» en la web) el peso pesado en báscula y el precio de la factura. El motor de serie de la ficha pesa 16 kg; el ME1616 pesa 21,8–25 kg según la tienda: hay que meter el real para que el peso total y las comprobaciones sean verdad.',
      prioridad: 'media', semanas: 1, dependeDe: ['Montar el tren motriz en el chasis y alinear los palieres'], entregable: 'Fichas al día y entrada en el changelog',
    },
  ],
  decisiones: [
    {
      tema: 'Motor de tracción',
      contexto: 'Hace falta un motor que dé 15 kW todo el rato y 32 kW unos segundos a 96 V, refrigerado por líquido, y que quepa tumbado bajo el maletero (Ø ≈ 21 cm, 26 cm de largo en el plano). El peso manda: cada 10 kg de motor son 10 kg de los 385 kg del coche.',
      opciones: [
        { nombre: 'Motenergy ME1616 (EE. UU.)', pros: '20 kW continuos y 55 kW de pico según el fabricante, 48–120 V, líquido, encoder; muy usado en conversiones y en barcos; hay inversores (Sevcon, Curtis) ya emparejados y tiendas que lo venden con el inversor.', contras: 'Pesa 21,8–25 kg (48–55 lb según la tienda), no los 16 kg de la ficha de serie; viene de EE. UU. (aduana e IVA).', coste: '1.170 $ (Thunderstruck Motors, nov. 2026) o por confirmar en Electric Motorsport' },
        { nombre: 'EMRAX 188 (Eslovenia)', pros: '23–29 kW continuos y 60 kW de pico en 7,1–7,9 kg: la mitad de peso y el doble de potencia; fabricante europeo.', contras: 'Precio solo bajo petición (la ficha de serie estima 4.200 €); la versión de baja tensión da su potencia de pico a 160 V, a 96 V da menos (pedir la curva); el fabricante avisa en la ficha de que el 188 se va descatalogando, lo que compromete repuestos.', coste: 'por confirmar (estimación de la ficha: 4.200 €)' },
        { nombre: 'QS Motor QS180 90H o Golden Motor HPM-20KW (China)', pros: 'Baratos en tiendas europeas y chinas; el QS138 90H refrigerado por agua se vende a 675 $ y el QS180 90H de 8 kW nominales llega a 20 kW; Golden Motor HPM-20KW en 72/96/120 V.', contras: 'El QS180 se queda corto de potencia continua (8 kW nominales); el Golden Motor cuesta 2.639 $ en su tienda (no es la opción barata que decía la ficha); documentación y soporte escasos.', coste: '675 $ (QS138 90H, Watt-Wheels) · 2.639 $ (Golden Motor HPM-20KW, goldenmotor.bike)' },
        { nombre: 'Motor + inversor del Renault Twizy de desguace', pros: 'Muy barato y con reductora y palieres incluidos.', contras: 'Es un motor asíncrono de 13 kW (57 N·m) con inversor integrado para una batería de 58 V: no vale para 96 V ni llega a 15/32 kW. Solo sirve la reductora.', coste: 'por confirmar (piezas en eBay.de)' },
      ],
      recomendacion: 'Motenergy ME1616 con el inversor que el vendedor ya tenga emparejado, y pedir en paralelo la curva a 96 V y el precio del EMRAX 188 por si el peso lo justifica.',
      porQue: 'Es el único de los cuatro que, con precio público y a 96 V, cumple los 15 kW continuos con margen y tiene inversores ya probados con él. Cuesta unos 6–9 kg más que la ficha de serie: hay que aceptarlos o pagar el EMRAX. Lo que no se ha podido comprobar: el precio del EMRAX y su potencia real a 96 V.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Inversor (controlador del motor)',
      contexto: 'Tiene que aguantar 330 A de pico y 160 A continuos a 96 V (hasta unos 110 V con la batería llena), hablar CAN con la batería y la pantalla, y poderse programar. Si el motor y el inversor no están emparejados por el proveedor, la puesta a punto puede comerse semanas.',
      opciones: [
        { nombre: 'Sevcon (BorgWarner) Gen4 tamaño 6, modelo G8055', pros: '36–116 V de funcionamiento, 550 A de pico (660 A 10 s), 220 A continuos, 4,2 kg; CAN de automoción (CANopen); es el estándar de los vehículos ligeros europeos.', contras: 'Hay que programarlo con la herramienta del fabricante (licencia y adaptador CAN); Thunderstruck lo vende sin conector ni pedal y cobra la programación aparte.', coste: '1.200 $ + programación desde 100 $ + mazo desde 150 $ (Thunderstruck Motors, nov. 2026)' },
        { nombre: 'Curtis 1238E / 1239E (96 V, 650 A)', pros: 'Muy robusto, IP65, programable con el programador Curtis; distribuidor europeo con precio público (Technotrade, Chequia) y envío en un día.', contras: 'El más caro: 2.655 € sin IVA; «bajo pedido» con entrega estimada en enero de 2027; el F6-A de 80 V está descatalogado.', coste: '2.655 € sin IVA (Technotrade, nov. 2026)' },
        { nombre: 'Kelly KLS (senoidal, 96 V)', pros: 'Barato, programable por USB, se compra en Europa (OZO Electric, Francia).', contras: 'Solo se ha encontrado la versión de 72 V (189 €); la de 96 V, por confirmar; sin CAN de automoción; menos protecciones y menos documentación.', coste: '189 € la de 72 V (OZO Electric); 96 V por confirmar' },
        { nombre: 'VESC de potencia (Trampa 100/250 o derivados)', pros: 'Software abierto, comunidad grande, muy barato por amperio.', contras: 'Límite de 100 V: con una batería de 96 V nominales que llega a 109 V cargada no sirve. Solo valdría bajando la batería a 72 V, que obliga a más corriente en todo.', coste: 'por confirmar' },
      ],
      recomendacion: 'Sevcon Gen4 tamaño 6 (G8055) comprado junto con el ME1616 y con la programación base incluida en el pedido.',
      porQue: 'Es el que cubre 96 V con margen (hasta 116 V), da los 330 A de pico sobrados y lleva el CAN que necesita la batería. Cuesta la mitad que el Curtis y, a diferencia del Kelly y el VESC, está comprobado con este motor. El riesgo es la programación: por eso se pide incluida.',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Reductora con diferencial y relación',
      contexto: 'Sin cambio de marchas, una sola relación tiene que servir para arrancar en cuesta y para 140 km/h. Con rueda trasera de 562 mm, 140 km/h son 1.320 rpm de rueda: a 6.000 rpm de motor la relación es 4,5:1; la «≈ 8:1» de la ficha de serie solo vale con un motor que gire a 10.500 rpm. Hay que fijarla con el motor real.',
      opciones: [
        { nombre: 'Transeje del Renault Twizy, de desguace', pros: 'Reductora con diferencial, palieres y manguetas compatibles con las ruedas de 13″ ya elegidas; barato; se vende suelto (eBay.de).', contras: 'Relación fija (por confirmar; la ficha dice 9,23:1), hecha para 80 km/h: con el ME1616 a 6.000 rpm daría unos 70 km/h. Habría que cambiar el par de engranajes o descartarla. Brida a adaptar.', coste: 'por confirmar (la ficha de serie estima 420 €)' },
        { nombre: 'Transeje de vehículo eléctrico ligero (fabricantes chinos, a la relación que toca)', pros: 'Se pide con la relación calculada (4,5–5:1), carcasa de aluminio, 10–30 kW, con diferencial.', contras: 'Solo por Alibaba; calidad y plazo variables; brida al motor casi nunca coincide.', coste: 'por confirmar (la ficha de serie estima 600–900 €)' },
        { nombre: 'Correa dentada + diferencial compacto de kart-cross', pros: 'La relación se elige con las poleas (fácil de cambiar en pruebas), 7 kg, piezas de catálogo (Gates), silenciosa a baja velocidad.', contras: 'Hay que tensar y proteger la correa; a 32 kW la polea pequeña exige correa ancha; diseño propio del soporte.', coste: 'por confirmar (la ficha de serie estima 950 €)' },
      ],
      recomendacion: 'Para el prototipo 1, correa dentada con poleas intercambiables y diferencial de kart-cross; comprar igualmente un transeje de Twizy para los palieres y las manguetas.',
      porQue: 'Es la única opción en la que la relación se puede cambiar en una tarde cuando el banco diga que el motor real no gira como pensábamos; y evita depender de un pedido a China sin ficha. Lo que cuesta: diseñar el soporte y el tensor (una semana de dibujo).',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Refrigeración del motor y del inversor',
      contexto: 'A 140 km/h sostenidos el motor trabaja a su potencia nominal durante media hora o más: sin líquido se calienta. El inversor también. El plano ya reserva un radiador pequeño en la cola y una bomba de 12 V en «Equipo».',
      opciones: [
        { nombre: 'Un circuito de líquido compartido (motor + inversor), bomba de 12 V y radiador en la cola', pros: 'Una bomba, un radiador, un vaso; es lo que usan las conversiones con ME1616 y Sevcon.', contras: 'Mangueras largas hasta la cola; el inversor conviene ponerlo el primero en el circuito (más frío).', coste: 'bomba 80–150 €, radiador 60–120 €, mangueras y vaso 60 € (por confirmar con catálogo)' },
        { nombre: 'Motor refrigerado por aire forzado', pros: 'Sin bomba ni radiador: menos peso y menos cosas que fallan.', contras: 'Los motores de 15 kW continuos por aire pesan 28 kg (ficha «PMSM industrial»); y dentro de una carrocería cerrada el aire no circula.', coste: 'motor 850 € (ficha de serie)' },
      ],
      recomendacion: 'Circuito de líquido compartido, con el inversor antes que el motor en el recorrido del agua.',
      porQue: 'La carrocería cerrada y aerodinámica no deja pasar aire al motor; el líquido es lo único que garantiza los 140 km/h sostenidos. Son 2–3 kg más y unos 300 €.',
      cuando: 'antes de diseñar',
    },
    {
      tema: 'Dónde se compra y quién lo pone a punto',
      contexto: 'Los componentes vienen de EE. UU., Eslovenia, China o Chequia; la programación del inversor es la parte que más semanas puede comerse. Hay que decidir si se compra todo suelto o se compra el kit a una tienda que lo entregue emparejado.',
      opciones: [
        { nombre: 'Kit motor + inversor + pedal + programación de una tienda especializada (Thunderstruck o Electric Motorsport, EE. UU.)', pros: 'Llega emparejado y con parámetros base; soporte por correo; precios públicos.', contras: 'Aduana, IVA y transporte desde EE. UU. (sumar un 25–30 %, por confirmar con la agencia de aduanas); horario americano.', coste: 'motor 1.170 $ + inversor 1.200 $ + programación y mazo ≈ 250 $ (Thunderstruck, nov. 2026)' },
        { nombre: 'Comprar suelto en Europa (Technotrade, OZO, EMRAX) y programar nosotros', pros: 'Sin aduana; entrega rápida (Technotrade envía en 1 día).', contras: 'Nadie garantiza que motor e inversor trabajen bien juntos; comprar la herramienta de programación (Sevcon: licencia; Curtis: programador 1313) y aprender a usarla.', coste: 'inversor Curtis 2.655 € + programador por confirmar' },
        { nombre: 'Encargar la puesta a punto a una ingeniería española (Applus IDIADA, INSIA)', pros: 'Banco de pruebas y medida de potencia nominal válida para homologar en el mismo sitio.', contras: 'Presupuesto por horas de ingeniería (por confirmar); sobredimensionado para un prototipo.', coste: 'por confirmar' },
      ],
      recomendacion: 'Kit emparejado de Thunderstruck Motors (ME1616 + Gen4 G8055 + pedal + programación), y el ensayo de potencia nominal en IDIADA solo cuando el coche ruede.',
      porQue: 'Compra más lo que ahorra en semanas de ajuste que lo que cuesta la aduana. La alternativa europea suelta sale más cara (Curtis) o sin soporte (Kelly).',
      cuando: 'antes de comprar',
    },
    {
      tema: 'Pedal, selector y seguridades',
      contexto: 'En un coche eléctrico el pedal es un sensor: si falla, el inversor tiene que saberlo. Y la ley (Reglamento delegado (UE) 3/2014, anexo sobre seguridad funcional) exige que el coche no pueda ponerse en marcha solo ni dar marcha atrás por sorpresa.',
      opciones: [
        { nombre: 'Pedal de doble potenciómetro + selector con llave + interruptor de freno, los que recomiende el fabricante del inversor', pros: 'El inversor ya tiene la lógica hecha (secuencia de arranque, fallo de pedal, bloqueo de marcha atrás en movimiento).', contras: 'Hay que comprarlo del catálogo del inversor; no vale cualquier pedal.', coste: 'pedal 80–150 €, selector 30–60 € (por confirmar con la tienda)' },
        { nombre: 'Pedal de coche de desguace + pequeña electrónica propia', pros: 'Más barato y con tacto de coche.', contras: 'Hay que programar las seguridades nosotros y demostrarlas al laboratorio; cualquier error es un coche que sale solo.', coste: '30 €' },
      ],
      recomendacion: 'Pedal y selector del catálogo del inversor.',
      porQue: 'Las seguridades vienen hechas y probadas por el fabricante; es lo que un laboratorio acepta sin discutir. La diferencia de precio son 100 €.',
      cuando: 'antes de comprar',
    },
  ],
  partners: [
    { nombre: 'Thunderstruck Motors', tipo: 'proveedor', pais: 'EE. UU.', web: 'https://www.thunderstruck-ev.com/me1616.html', que: 'Motor Motenergy ME1616 (1.170 $), inversor Sevcon Gen4 tamaño 6 G8055 (1.200 $), programación, mazos, pedales, cargadores y convertidores DC-DC. Kits emparejados.', porQue: 'Precios públicos y el par motor-inversor que necesitamos, ya probado junto. Es el camino más corto al banco de pruebas.', estado: 'por contactar', verificado: true },
    { nombre: 'Electric Motorsport', tipo: 'proveedor', pais: 'EE. UU.', web: 'https://www.electricmotorsport.com/ev-parts/motors/brushless-pmac-ipm-motors/me1616-brushless-65hp-liquid-cooled-ipm-motor-24-120v.html', que: 'Motores Motenergy (ME1616: 20 kW continuos, 55 kW de pico, 48–120 V, líquido, 21,8 kg), inversores Sevcon y Curtis, disipadores, BMS EMUS, cables. Ficha técnica completa del ME1616 en su web.', porQue: 'Segunda fuente del ME1616 y la ficha técnica más completa; sirve para comparar precio con Thunderstruck.', estado: 'por contactar', verificado: true },
    { nombre: 'EMRAX', tipo: 'fabricante', pais: 'Eslovenia', web: 'https://emrax.com/wp-content/uploads/2025/03/EMRAX-188_datasheet_v1.7.pdf', que: 'Motores de flujo axial: EMRAX 188 (23–29 kW continuos, 60 kW de pico, 7,1–7,9 kg) y la nueva generación que lo sustituye.', porQue: 'La única forma de bajar 14 kg del motor. Fabricante de la UE (sin aduana). Hay que pedir precio y la curva a 96 V, y preguntar por el sustituto del 188.', estado: 'por contactar', verificado: true },
    { nombre: 'Golden Motor', tipo: 'fabricante', pais: 'China', web: 'https://goldenmotor.bike/products/hpm-20-kw-liquid-cooled-bldc-motor', que: 'Motor HPM-20KW refrigerado por líquido en 72/96/120/144 V (2.639 $ en su tienda), con su controlador.', porQue: 'Opción de catálogo a 96 V; pero su precio público es más alto que el ME1616, no más bajo como suponía la ficha de serie.', estado: 'por contactar', verificado: true },
    { nombre: 'Watt-Wheels (QS Motor)', tipo: 'proveedor', pais: 'por confirmar (tienda online de motores QS)', web: 'https://www.watt-wheels.com/products/qs-138-90h-water-cooled-mid-drive-motor-high-performance-electric-motorcycle-motor', que: 'Motores QS Motor: QS138 90H refrigerado por agua (675 $) y QS180 90H (8 kW nominales, hasta 20 kW).', porQue: 'La opción barata si se rebaja la velocidad objetivo; para 15 kW continuos probablemente se queda corto (pedir la curva).', estado: 'por contactar', verificado: true },
    { nombre: 'Technotrade (distribuidor Curtis)', tipo: 'proveedor', pais: 'Chequia', web: 'https://eshop.technotrade.cz/en/motor-controller-1238e-96v-650a-390327621', que: 'Inversores Curtis: 1238E 96 V 650 A (2.655 € sin IVA, bajo pedido), AC F6-A (descatalogado), programadores. Envío DHL en 1 día a Europa.', porQue: 'El único distribuidor europeo con precio público de un inversor Curtis de 96 V.', estado: 'por contactar', verificado: true },
    { nombre: 'OZO Electric', tipo: 'proveedor', pais: 'Francia', web: 'https://ozo-electric.com/en/256-controleur-kelly', que: 'Controladores Kelly KLS (senoidales, programables): 12–72 V a 189 €; versiones de mayor tensión por confirmar.', porQue: 'Plan B barato en la UE si se baja la tensión del sistema a 72 V.', estado: 'por contactar', verificado: true },
    { nombre: 'VESC Project / Trampa', tipo: 'comunidad', pais: 'Reino Unido / Suecia', web: 'https://vesc-project.com/node/3933', que: 'Controladores VESC de potencia (75/300, 100/250) y software abierto.', porQue: 'Solo si el sistema fuera de 72 V: el límite de 100 V los deja fuera con batería de 96 V. Se anota por si cambia la arquitectura.', estado: 'descartado', verificado: false },
    { nombre: 'eBay.de (piezas de Renault Twizy de desguace)', tipo: 'proveedor', pais: 'Alemania (vendedores varios)', web: 'https://www.ebay.de/itm/376479267938', que: 'Transeje, palieres, manguetas, cables de carga y otras piezas de Twizy de segunda mano.', porQue: 'Para tener en la mesa la reductora y los palieres de referencia sin esperar a un proveedor nuevo.', estado: 'por contactar', verificado: true },
    { nombre: 'Kit Elec Shop (e-kart.fr)', tipo: 'proveedor', pais: 'Francia', que: 'Kits de motor ME1616 para barco y kart, soportes y transmisiones; blog técnico en francés.', porQue: 'Posible fuente europea del ME1616 (sin aduana). No se ha podido ver su catálogo ni sus precios.', estado: 'por contactar', verificado: false },
    { nombre: 'Applus IDIADA · laboratorio de motores eléctricos', tipo: 'laboratorio', pais: 'España (Santa Oliva, Tarragona)', web: 'https://www.applusidiada.com/dam/PDFServices/IDIADA/GLOBAL/laboratorio-de-motores-eléctricos-_es.pdf', que: 'Bancos de ensayo de motores eléctricos, medida de potencia nominal y de pico con certificación R85, mapas de eficiencia, ensayos térmicos; también homologación de vehículos.', porQue: 'Mide la «potencia nominal continua» tal y como la pide la homologación L7e; y resuelve la duda de los 15 kW antes de comprar.', estado: 'por contactar', verificado: true },
    { nombre: 'INSIA (Universidad Politécnica de Madrid)', tipo: 'universidad', pais: 'España (Madrid)', web: 'https://insia-upm.es/en/?p=217', que: 'Instituto del automóvil de la UPM: laboratorios de motores y tren motriz, instrumentación de vehículos, pista de pruebas, ensayos oficiales.', porQue: 'Alternativa pública y cercana para el banco de pruebas y la primera rodadura instrumentada; posible colaboración con estudiantes.', estado: 'por contactar', verificado: true },
    { nombre: 'Hainzl (distribuidor Curtis)', tipo: 'proveedor', pais: 'Austria', web: 'https://shop.hainzl.at/media/pdf/d9/c0/09/ACF4610A_datasheet_en.pdf', que: 'Distribuidor de controladores Curtis con fichas técnicas públicas (AC F4/F6).', porQue: 'Segunda fuente europea de Curtis para comparar precio y plazo con Technotrade.', estado: 'por contactar', verificado: false },
  ],
  mensajes: [
    {
      para: 'Thunderstruck Motors', canal: 'correo', idioma: 'en', asunto: 'Quote request: ME1616 + Sevcon Gen4 size 6 kit for a 96 V light electric vehicle prototype (Spain)',
      cuerpo: 'Hello,\n\nWe are building the first prototype of the Aeromóvil 1, a two-seat, four-wheel light electric vehicle (EU category L7e, about 385 kg, 96 V nominal battery of 27 kWh) in [ciudad], Spain. We need 15 kW continuous and about 32 kW peak at the motor, liquid cooled, with regenerative braking and CAN communication with the BMS.\n\nWe would like a quote for a matched kit:\n- 1 × Motenergy ME1616 motor\n- 1 × Sevcon Gen4 size 6 controller (G8055) programmed for the ME1616 at 96 V nominal (battery range about 75–110 V), with the parameter file\n- throttle pedal, direction switch and wiring harness recommended for this controller\n- heatsink or cooling plate recommended for the controller\n\nPlease tell us also what you need from us to program the controller (motor encoder type, battery limits) and whether you ship to Spain (Incoterm, carrier).\n\nContact: [nombre], [correo], [teléfono].\n\nThank you,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Precio por 1 kit y por 10 kits', 'Plazo de entrega a España y forma de envío', 'Cantidad mínima', 'Ficha técnica del ME1616 con curva de par y potencia a 96 V', 'Fichero de parámetros del Gen4 y qué herramienta hace falta para retocarlo', 'Certificaciones (CE, UN R10 de compatibilidad electromagnética si las tienen)', 'Condiciones de pago y garantía'],
    },
    {
      para: 'Electric Motorsport', canal: 'correo', idioma: 'en', asunto: 'Quote and datasheet request: ME1616 motor and matched controller, 96 V, for a prototype in Spain',
      cuerpo: 'Hello,\n\nWe are building a four-wheel light electric vehicle prototype (EU L7e, 96 V nominal, 15 kW continuous / 32 kW peak) in Spain. We are considering the Motenergy ME1616 with a Sevcon Gen4 size 6 or a Curtis controller.\n\nCould you send us:\n- a quote for the ME1616 (1 unit and 10 units) and for the controller you recommend for it at 96 V, programmed\n- the shipping cost and lead time to Spain\n- the motor datasheet with torque/power curves at 96 V and the required coolant flow\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Precio por 1 y por 10', 'Plazo y coste de envío a España', 'Cantidad mínima', 'Ficha técnica con curvas a 96 V y caudal de refrigerante', 'Certificaciones', 'Condiciones de pago'],
    },
    {
      para: 'EMRAX', canal: 'correo', idioma: 'en', asunto: 'Quote request: EMRAX 188 (or its successor), LV liquid-cooled, for a 96 V light vehicle prototype',
      cuerpo: 'Dear EMRAX team,\n\nWe are developing the Aeromóvil 1, a lightweight two-seat electric vehicle prototype (EU L7e, about 385 kg) in Spain. Our battery is 96 V nominal (about 75–110 V). We need 15 kW continuous and about 32 kW peak, liquid cooled.\n\nYour EMRAX 188 datasheet states that it is being phased out in favour of a new generation. Could you tell us:\n- which current motor you recommend for 96 V with at least 15 kW continuous, and its price for 1 and for 10 units\n- its continuous and peak power curves at 96 V DC (not at the 160 V shown in the datasheet)\n- which inverters you have validated with it at this voltage\n- lead time and warranty\n\nContact: [nombre], [correo].\n\nBest regards,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Precio por 1 y por 10', 'Plazo', 'Cantidad mínima', 'Curvas de potencia a 96 V', 'Inversores validados', 'Certificaciones', 'Garantía y condiciones'],
    },
    {
      para: 'Technotrade (distribuidor Curtis)', canal: 'correo', idioma: 'en', asunto: 'Quote request: Curtis 1238E/1239E 96 V controller and programmer for a PMSM motor, prototype in Spain',
      cuerpo: 'Hello,\n\nWe are building a light electric vehicle prototype in Spain (96 V nominal battery, 15 kW continuous, about 330 A peak). We are considering the Curtis 1238E or 1239E at 96 V for a permanent-magnet motor (Motenergy ME1616).\n\nCould you confirm:\n- price and real lead time for the 1238E 96 V 650 A (your shop shows "on request", delivery January 2027)\n- whether you can supply it with the Curtis programmer (1313 or software) and a basic parameter set for the ME1616\n- price for 10 units\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Precio por 1 y por 10', 'Plazo real', 'Programador y parámetros base', 'Ficha técnica', 'Certificaciones', 'Condiciones'],
    },
    {
      para: 'Applus IDIADA · laboratorio de motores eléctricos', canal: 'formulario web', idioma: 'es', asunto: 'Consulta: medida de potencia nominal continua (L7e, 15 kW) y banco de ensayo para un prototipo de cuadriciclo eléctrico',
      cuerpo: 'Buenos días,\n\nEstamos desarrollando el Aeromóvil 1, un prototipo de cuadriciclo pesado eléctrico (categoría L7e, dos plazas, unos 385 kg, batería de 96 V y 27 kWh, motor de 15 kW nominales y unos 32 kW de pico) en [ciudad].\n\nNos gustaría saber:\n1. Cómo se mide la «potencia nominal continua máxima» de un motor eléctrico a efectos del Reglamento (UE) 168/2013 y del Reglamento (UE) 134/2014 (UN R85), y si un inversor programado a 15 kW continuos y 32 kW durante 30 s encaja en la categoría L7e.\n2. Presupuesto orientativo y plazo de un ensayo de potencia y mapa de eficiencia de nuestro motor e inversor (Motenergy ME1616 + Sevcon Gen4) en su banco.\n3. Si ofrecen un paquete de homologación completo para L7e.\n\nContacto: [nombre], [correo], [teléfono].\n\nMuchas gracias,\n[nombre] · Aeromóvil 1 · humanity.wiki',
      quePedimos: ['Criterio de medida de la potencia nominal continua para L7e', 'Presupuesto del ensayo de potencia (1 motor)', 'Plazo', 'Qué documentación hay que llevar', 'Si el ensayo vale para el expediente de homologación'],
    },
    {
      para: 'INSIA (Universidad Politécnica de Madrid)', canal: 'correo', idioma: 'es', asunto: 'Propuesta de colaboración: banco de pruebas y primera rodadura de un prototipo de cuadriciclo eléctrico ligero',
      cuerpo: 'Estimados señores,\n\nSomos [nombre del equipo], de humanity.wiki, y estamos construyendo el Aeromóvil 1: un cuadriciclo pesado eléctrico (L7e) de dos plazas en tándem, carrocería aerodinámica con paneles solares, 96 V, 15 kW nominales y 32 kW de pico, 27 kWh.\n\nBuscamos un laboratorio donde ensayar el motor y el inversor (potencia, temperatura, consumo) antes de montarlos en el chasis, y donde instrumentar la primera rodadura. Nos gustaría saber si el INSIA puede ofrecerlo como servicio o como colaboración con estudiantes (trabajos fin de grado), con qué condiciones y qué coste orientativo.\n\nContacto: [nombre], [correo], [teléfono].\n\nUn saludo,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Disponibilidad del banco y de la pista', 'Coste orientativo por día o por ensayo', 'Posibilidad de colaboración académica', 'Plazo', 'Qué necesitan de nosotros (seguros, documentación)'],
    },
    {
      para: 'Watt-Wheels (QS Motor)', canal: 'correo', idioma: 'en', asunto: 'Question: QS180 90H continuous power at 96 V with liquid cooling, and quote',
      cuerpo: 'Hello,\n\nWe are building a four-wheel light electric vehicle prototype (96 V nominal, 385 kg, target 15 kW continuous and 32 kW peak). Could you tell us whether any QS Motor mid-drive (QS180 90H or larger) reaches 15 kW continuous at 96 V with liquid cooling, and send the torque/power curves, weight, price for 1 and for 10, and lead time to Spain? Which controller do you recommend with it?\n\nContact: [nombre], [correo].\n\nThank you,\n[nombre] · Aeromóvil 1',
      quePedimos: ['Potencia continua real a 96 V', 'Precio por 1 y por 10', 'Plazo a España', 'Ficha técnica con curvas', 'Controlador recomendado', 'Certificaciones'],
    },
  ],
  referencias: [
    { titulo: 'Reglamento (UE) 168/2013 · Anexo I: clasificación de la categoría L7e (masa ≤ 450 kg, potencia nominal continua ≤ 15 kW; L7e-C limitada a 90 km/h)', url: 'https://legislation.gov.uk/eur/2013/168/annex/I/2016-01-01', nota: 'La ley que fija el tope de 15 kW. Ojo: la subcategoría L7e-C (habitáculo cerrado) tiene velocidad máxima de diseño ≤ 90 km/h; para 140 km/h habría que encajar en L7e-A2 (dos plazas no a horcajadas). Decisión de Homologación.' },
    { titulo: 'Reglamento delegado (UE) 3/2014 · seguridad funcional de los vehículos L (texto en español, BOE)', url: 'https://www.boe.es/doue/2014/007/L00001-00102.pdf', nota: 'Anexos de mandos, marcha atrás, seguridad eléctrica y lista de reglamentos UN aplicables a L7e.' },
    { titulo: 'Reglamento delegado (UE) 2016/1824 · modificaciones de 3/2014 y 44/2014 (incluye R10 de compatibilidad electromagnética para L1e–L7e)', url: 'https://www.legislation.gov.uk/eur/2016/1824/adopted/data.html', nota: 'Entre otras cosas, el inversor y el cableado tienen que pasar compatibilidad electromagnética (UN R10).' },
    { titulo: 'UN R136 · seguridad eléctrica de los vehículos de categoría L (resumen)', url: 'https://www.batterydesign.net/legislation-rules-and-regulations/ece-r136/', nota: 'Para cuadriciclos aplica el R136, no el R100 (que es de turismos). Afecta al aislamiento del inversor y del cableado de alta tensión.' },
    { titulo: 'Ficha técnica Motenergy ME1616 (Electric Motorsport)', url: 'https://www.electricmotorsport.com/ev-parts/motors/brushless-pmac-ipm-motors/me1616-brushless-65hp-liquid-cooled-ipm-motor-24-120v.html', nota: '20 kW continuos, 55 kW de pico, 48–120 V, 6.000 rpm, par de pico 134 N·m, 48 lb, refrigeración por agua-glicol con tomas de 3/8″.' },
    { titulo: 'ME1616 en Thunderstruck Motors (precio 1.170 $)', url: 'https://www.thunderstruck-ev.com/me1616.html', nota: '250 A continuos, 600 A de pico, hasta 100 V, 55 lb según esta tienda (la otra dice 48 lb: pesar el real).' },
    { titulo: 'Sevcon Gen4 tamaño 6 G8055 en Thunderstruck Motors (precio 1.200 $)', url: 'https://www.thunderstruck-ev.com/sevcon-g8055.html', nota: '36–116 V, 550 A de pico (660 A 10 s), 220 A continuos, 9,2 lb; programación desde 100 $, mazo desde 150 $.' },
    { titulo: 'Curtis 1238E 96 V 650 A en Technotrade (2.655 € sin IVA)', url: 'https://eshop.technotrade.cz/en/motor-controller-1238e-96v-650a-390327621', nota: '72–96 V nominales, 200 A durante 60 min, 650 A durante 2 min; bajo pedido.' },
    { titulo: 'Ficha técnica EMRAX 188 v1.7', url: 'https://emrax.com/wp-content/uploads/2025/03/EMRAX-188_datasheet_v1.7.pdf', nota: '23–29 kW continuos, 60 kW de pico, 7,1–7,9 kg; la versión LV da su pico a 160 V; aviso de descatalogación progresiva.' },
    { titulo: 'Golden Motor HPM-20KW (2.639 $)', url: 'https://goldenmotor.bike/products/hpm-20-kw-liquid-cooled-bldc-motor', nota: '72/96/120/144 V, refrigerado por líquido; peso y par no aparecen en la página.' },
    { titulo: 'Renault Twizy · datos técnicos (GoingElectric)', url: 'https://www.goingelectric.de/wiki/Renault-Twizy/', nota: 'Motor asíncrono de 13 kW y 57 N·m, batería de 6,1 kWh, cargador de 2 kW, 80 km/h, 487 kg: referencia de lo que vale y lo que no del Twizy de desguace.' },
    { titulo: 'Laboratorio de motores eléctricos de Applus IDIADA', url: 'https://www.applusidiada.com/dam/PDFServices/IDIADA/GLOBAL/laboratorio-de-motores-eléctricos-_es.pdf', nota: 'Medida de potencia nominal y de pico con certificación R85, mapas de eficiencia, ensayos térmicos y de vibración.' },
    { titulo: 'INSIA · laboratorios (UPM)', url: 'https://insia-upm.es/en/?p=217', nota: 'Campus Sur UPM, Madrid; bancos de motores, instrumentación y pista.' },
  ],
  revisado: { fecha: '2026-11-06', por: 'bot de producto y compras (búsquedas web del 2026-11-06; precios sin IVA salvo que se diga)' },
};
