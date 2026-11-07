import type { Explicaciones } from './tipos';

// ============================================================================
// Explicaciones de MECÁNICA, ENERGÍA y MASAS del Aeromóvil 1 (2026-11-07)
// ============================================================================
// Eugenio: «al pinchar en un parámetro, que se abra un cuadro que explique más
// sobre ese parámetro, la importancia que tiene y las ventajas y desventajas
// de una configuración más alta o más baja».
//
// Todas las cifras «del modelo» salen de ejecutar `calcular` /
// `estimarMasasA1` con `PARAMETROS_A1` (el diseño de serie) el 2026-11-07 y
// moviendo un solo parámetro cada vez. Las de coches reales llevan su fuente.
// Si cambian las fórmulas de `geometriaA1.ts`, estas cuentas se quedan viejas:
// vuelve a correrlas antes de fiarte de un número.
//
// El diseño de serie, para tener la referencia a mano:
//   382 kg sin ocupantes (batería 164 kg, ruedas 32, suspensión 27, motor +
//   inversor + reductora + palieres 37, carrocería 32, varios 25, chasis 20,5,
//   asientos 14, frenos 11, dirección 7, cúpula 7, paneles 6).
//   542 kg con dos personas de 80 kg.
//   A 100 km/h: 42,5 Wh/km (4,25 kWh/100 km), 584 km de autonomía con el 92 %
//   usable de 27 kWh; de esos 4,25 kW, 2,2 son aire y 1,3 rodadura.
//   170 km/h sostenidos con 15 kW; 225 km/h de punta con 32 kW; 0–50 en 3,5 s;
//   0–100 en 9,7 s; 6,4 % de pendiente sostenida a 100 km/h.
//   Paneles: 2,9 m², 608 W de pico, 1,63 kWh y 38 km al día con 4,5 horas de sol.
//
// Lo que la homologación europea pide a un cuadriciclo pesado (clase L7e-A,
// Reglamento (UE) 168/2013, anexo I y artículo 5): potencia continua ≤ 15 kW
// y masa en orden de marcha ≤ 450 kg SIN contar las baterías de propulsión.
// El Aeromóvil 1 de serie pesa 218 kg sin batería: sobra mucho margen de masa;
// la potencia continua es el límite que de verdad aprieta.

export const EXPLICACIONES: Explicaciones = {
  // ── Chasis ───────────────────────────────────────────────────────────────
  spineD: {
    nombre: 'Largueros Ø',
    queEs: 'Diámetro exterior, en milímetros, de los dos tubos largos («largueros») que recorren el chasis de un eje al otro. Se elige entre 32, 40, 50 y 60 mm.',
    porQueImporta: 'Los largueros son la columna vertebral del coche: sobre ellos van el piloto, el pasajero y la batería (unos 320 kg entre los ejes). Cuando el coche pasa un bache, esos tubos se doblan como una viga apoyada en las dos ruedas. La resistencia de un tubo a doblarse crece con el cubo del diámetro: pasar de 40 a 50 mm (un 25 % más de diámetro) multiplica por 1,6 lo que aguanta, y pasar a 60 mm, por 2,4. Con el diseño de serie (Ø 40 × 2 mm de aluminio) el cálculo de «Estructura» da un coeficiente de seguridad de 0,67, en rojo: la tensión en un bache fuerte (356 MPa) supera el límite usable del aluminio (240 MPa). Ojo: ese cálculo solo cuenta los dos largueros y desprecia el resto del entramado, así que es pesimista; pero es la cifra que la pantalla enseña.',
    masAlto: {
      ventajas: [
        'Más resistencia por casi nada de peso: Ø 50 × 2 sube el coeficiente de seguridad de 0,67 a 1,09 y añade 1 kg; Ø 60 × 2 lo lleva a 1,60 por 2 kg (modelo).',
        'El chasis se vuelve más rígido a torsión: menos ruidos, mejor comportamiento en curva y las puertas cierran igual con el coche cargado.',
        'Con tubo más gordo se puede bajar la pared («Pared de los largueros») y acabar pesando lo mismo con más seguridad.',
      ],
      desventajas: [
        'Ocupa sitio: los largueros corren a ±32 cm del centro, justo donde van los módulos de batería (de ±40 a ±42 cm) y los brazos de suspensión; cada centímetro de tubo es un centímetro menos para ellos.',
        'Tubo de Ø 60 en aluminio 6061-T6 es menos corriente que el de 40 y cuesta más por metro (el catálogo de componentes estima 9 €/m el Ø 40 × 2).',
        'Más diámetro con la misma pared se abolla más fácil en un golpe puntual (un bordillo contra el larguero).',
      ],
    },
    masBajo: {
      ventajas: [
        'Ahorra algo menos de 1 kg y deja hueco: Ø 32 × 2 pesa 0,8 kg menos que el de serie (modelo).',
        'Tubo más barato y más fácil de curvar para seguir el fondo de la carrocería hacia el morro y la cola.',
      ],
      desventajas: [
        'Ø 32 × 2 deja el coeficiente de seguridad en 0,42: la viga se doblaría de forma permanente en el primer bache serio (modelo).',
        'Un chasis que flexa agrieta la carrocería de fibra pegada encima y desalinea la dirección.',
        'Nada que ganar en autonomía: 1 kg son 0,03 Wh/km, menos de 1 km en 584 (modelo).',
      ],
    },
    referencias: [
      'Caterham Seven / Locost (patrón de la «versión 2» en celosía): tubos de acero de 25 mm cuadrados o redondos triangulados; la rigidez la da la triangulación, no el grosor del tubo (chasisCelosia.ts, comentario de cabecera).',
      'VW XL1: monocasco de fibra de carbono, sin largueros; el acero y el hierro son 184 kg de sus 795 kg (Wikipedia, Volkswagen 1-litre car).',
      'Aluminio 6061-T6: límite elástico 276 MPa en el tubo; baja a 103 MPa junto a una soldadura si no se vuelve a tratar, y recupera 276 con tratamiento T6 posterior (Industrial Monitor Direct, «6061-T6 aluminum weld strength»). El modelo usa 240 MPa como límite usable ya soldado.',
    ],
    relacionados: ['spineT', 'matChasis', 'chasis', 'extraChasis', 'kWh', 'mOcc'],
  },
  spineT: {
    nombre: 'Pared de los largueros',
    queEs: 'Espesor de la pared del tubo de los largueros, en milímetros (el tubo es hueco). Se elige entre 1,5, 2, 2,5 y 3 mm.',
    porQueImporta: 'Para una viga, la pared manda menos que el diámetro: duplicar la pared de 1,5 a 3 mm sube la resistencia un 78 %, mientras que subir el diámetro de 40 a 60 mm la multiplica por 2,4 (modelo). Pero la pared es lo que decide si el tubo se abolla al soldarlo o al recibir un golpe, y lo que hace soldable el aluminio: con menos de 2 mm una soldadura TIG en 6061 pierde material y se quema. El peso crece casi en línea recta con la pared.',
    masAlto: {
      ventajas: [
        'Pared de 3 mm: coeficiente de seguridad de 0,67 a 0,94 por 2 kg más (modelo).',
        'Más tolerante a la soldadura, a las abolladuras y a la corrosión: un tubo grueso perdona errores de taller.',
        'Las uniones (pletinas, tornillos) muerden más material: menos riesgo de rasgar el tubo en un anclaje de suspensión.',
      ],
      desventajas: [
        'Es la forma cara de ganar resistencia: 3 mm en Ø 40 pesa casi lo mismo que 2 mm en Ø 60 y aguanta bastante menos (0,94 frente a 1,60, modelo).',
        'Más peso donde no hace falta: la pared gruesa añade material cerca del eje del tubo, que apenas trabaja a flexión.',
      ],
    },
    masBajo: {
      ventajas: [
        'Pared de 1,5 mm: 1 kg menos que la de serie (modelo); es la pared típica de un chasis de acero cromoly, que es más resistente.',
        'Tubo más barato por metro.',
      ],
      desventajas: [
        'En aluminio, 1,5 mm baja el coeficiente de seguridad a 0,53 (modelo) y es difícil de soldar sin perforarlo.',
        'Pared fina se abolla con un golpe de piedra o al apretar una abrazadera de más.',
        'La alternativa «Acero cromoly» del catálogo de componentes aplica justo 1,5 mm: en acero va bien (coeficiente 1,01), en aluminio no.',
      ],
    },
    referencias: [
      'Cuadros de bicicleta de aluminio 6061: paredes de 0,9–1,5 mm, pero en tubos de 35–50 mm con cargas diez veces menores (conocimiento general; sin cifra de fuente comprobada hoy).',
      'Chasis Locost (tipo Seven): tubo de acero de 25 × 25 × 1,6 mm en la celosía (chasisCelosia.ts, cabecera); la pared fina funciona porque está triangulado.',
    ],
    relacionados: ['spineD', 'matChasis', 'chasis', 'extraChasis'],
  },
  matChasis: {
    nombre: 'Material del chasis',
    queEs: 'De qué están hechos los tubos del chasis: aluminio 6061-T6 (de serie), acero cromoly 4130 o tubo de fibra de carbono. Cambia la densidad (cuánto pesa cada metro) y el límite elástico (a qué tensión se dobla sin volver).',
    porQueImporta: 'El modelo usa tres parejas de números (densidad en kg/m³ · límite usable en MPa): aluminio 2.700 · 240, cromoly 7.850 · 460, carbono 1.550 · 500. Con los mismos tubos (Ø 40 × 2), el acero pesa 2,9 veces más por metro pero aguanta casi el doble: el chasis pasa de 20,5 a 51 kg (+31 kg en el coche, 413 kg) y el coeficiente de seguridad de 0,67 a 1,29, por fin por encima del mínimo de 1,3 casi. El carbono pesa un 43 % menos que el aluminio (chasis de 14,5 kg, coche de 376 kg) con seguridad 1,41, pero no se suelda: cada unión es una pieza mecanizada y encolada. El aluminio es el término medio: ligero, soldable, barato, con la pega de que hay que tratarlo térmicamente (T6) después de soldar o la soldadura queda a un tercio de resistencia.',
    masAlto: {
      ventajas: [
        'Cromoly: la soldadura no pierde resistencia (no hace falta tratamiento T6), se repara en cualquier taller y admite paredes de 1,5 mm; con ellas el chasis queda en 48 kg y seguridad 1,01 (modelo).',
        'Cromoly: tubo a ≈ 16 €/m frente a 62 €/m el de carbono, y sin los 300 € de tratamiento T6 del aluminio (catálogo de componentes).',
        'Carbono: −6 kg respecto al aluminio y la mayor seguridad de los tres (1,41) sin cambiar diámetros (modelo).',
      ],
      desventajas: [
        'Cromoly: +31 kg (+8 % del coche), que son +0,8 Wh/km y −11 km de autonomía a 100 km/h, y 0,4 s más de 0 a 100 (modelo).',
        'Cromoly: se oxida; hay que imprimar y pintar por dentro y por fuera.',
        'Carbono: ≈ 4.800 € de chasis frente a ≈ 1.500–1.900 € (catálogo de componentes), y cada anclaje de suspensión es una pieza de aluminio encolada que hay que diseñar y ensayar.',
        'Carbono: un golpe que en metal abolla, en carbono puede dejar una rotura interna invisible.',
      ],
    },
    masBajo: {
      ventajas: [
        'Aluminio (de serie): ligero (20,5 kg de chasis), fácil de cortar y curvar, y no se oxida.',
        'Tubo barato y en todas las medidas (≈ 9 €/m el Ø 40 × 2, catálogo de componentes).',
      ],
      desventajas: [
        'Junto a cada soldadura el 6061-T6 baja de 276 a 103 MPa; recuperarlo exige meter el chasis entero en un horno de tratamiento T6 (≈ 300 €, y hay que encontrar un horno donde quepa un chasis de 3,4 m).',
        'Con los largueros de serie el coeficiente de seguridad es 0,67: en aluminio hace falta subir a Ø 50 o Ø 60 (modelo).',
        'Fatiga: el aluminio no tiene «límite de fatiga»; cada bache le quita vida, y un chasis de aluminio soldado hay que inspeccionarlo.',
      ],
    },
    referencias: [
      'Aluminio 6061-T6: 276 MPa de límite elástico; 103 MPa en la zona afectada por la soldadura; 276 MPa de nuevo tras tratamiento T6 posterior (Industrial Monitor Direct, «6061-T6 aluminum weld strength»).',
      'Renault Twizy: chasis tubular de acero bajo una carrocería de plástico; 474 kg con 100 kg de batería (Wikipedia, Renault Twizy). No encontré publicado el peso del chasis a solas.',
      'VW XL1: monocasco de fibra de carbono (CFRP), 795 kg en total (Wikipedia, Volkswagen 1-litre car).',
      'Los 460 MPa del cromoly y los 500 del carbono son los que trae `MATERIALES_CHASIS`; no los he contrastado con una fuente externa hoy.',
    ],
    relacionados: ['spineD', 'spineT', 'chasis', 'extraChasis', 'matCarenado'],
  },
  chasis: {
    nombre: 'Versión del chasis',
    queEs: 'Qué entramado de tubos lleva el coche: «Versión 1», largueros y travesaños (dos vigas largas con barras transversales, como una escalera), o «Versión 2», celosía triangulada (todo en triángulos, como un Caterham Seven o un puente de hierro).',
    porQueImporta: 'En una escalera de tubos, cada tubo trabaja doblándose, y doblarse es la forma más débil de trabajar un tubo. En una celosía, los tubos forman triángulos y cada uno solo se estira o se comprime, que es la forma más fuerte: con el mismo peso, una celosía es varias veces más rígida a torsión. El modelo da 382 kg con la versión 1 y 384 con la versión 2 (2 kg más de tubo), y las comprobaciones salen iguales porque la celosía ancla la suspensión, el salpicadero, los estribos y el arco en los mismos puntos. Lo que no cambia es el cálculo de «Estructura»: solo mira los dos largueros, así que el coeficiente de seguridad sale igual (0,67) en las dos versiones; la ventaja real de la celosía no está medida en pantalla, está en «Comparar chasis».',
    masAlto: {
      ventajas: [
        'Celosía: mucha más rigidez a torsión por el mismo peso (+2 kg, modelo); el coche no se «retuerce» en una curva con un bache.',
        'Las cargas entran por nudos (torretas, pivotes, travesaño del asiento, cremallera): cada anclaje reparte su fuerza entre tres o cuatro tubos.',
        'Tubos más finos y cortos: más fáciles de manejar y de sustituir si uno se daña.',
      ],
      desventajas: [
        'Muchos más tubos y muchas más soldaduras: horas de taller y de plantilla; en aluminio, más zonas afectadas por el calor.',
        'Dos sitios no se pudieron triangular: el arco de seguridad (la diagonal cruzaría al pasajero) y el suelo bajo el motor; ahí sigue trabajando a flexión (chasisCelosia.ts).',
        'Una diagonal estribo–cordón roza la esquina del módulo de batería del piloto: hay que achaflanar 6 × 10 cm ese módulo (chasisCelosia.ts).',
        'Mientras la versión 2 la termina un bot, el botón puede aparecer desactivado.',
      ],
    },
    masBajo: {
      ventajas: [
        'Largueros (de serie): pocos tubos, pocas soldaduras, fácil de entender y de modificar.',
        'El suelo queda despejado para los módulos de batería y el motor; nada cruza por el habitáculo.',
        'Es el patrón del Twizy (chasis tubular sencillo con carrocería de plástico encima).',
      ],
      desventajas: [
        'Rigidez a torsión baja: lo que aguanta el coche lo aguantan los dos largueros doblándose, y con Ø 40 × 2 de aluminio no llegan (seguridad 0,67, modelo).',
        'Para que llegue hay que engordar los largueros (Ø 60: 1,60) o pasar a acero (+31 kg); la celosía lo resolvería con tubo fino.',
      ],
    },
    referencias: [
      'Caterham Seven / Locost: celosía de tubo de acero fino; el chasis desnudo de un Locost ronda los 50–60 kg según los constructores (dato de foros de constructores, no de una ficha oficial: no lo he podido comprobar hoy).',
      'Renault Twizy: chasis tubular de acero (Wikipedia, Renault Twizy).',
      'VW XL1: ni largueros ni celosía, monocasco de carbono (Wikipedia, Volkswagen 1-litre car).',
    ],
    relacionados: ['spineD', 'spineT', 'matChasis', 'extraChasis', 'altBat'],
  },
  extraChasis: {
    nombre: 'Uniones, chapas y tornillería',
    queEs: 'Kilos que se suman al chasis por todo lo que no es tubo: cartelas (chapas en las esquinas), pletinas de anclaje, soportes del motor y la batería, tornillos, tuercas y casquillos. De serie, 6 kg; rango 3–12.',
    porQueImporta: 'El modelo pesa los tubos uno a uno (14,5 kg de serie) y no sabe cuántas chapas hacen falta: eso lo pones tú aquí. En un chasis real las uniones son entre un 20 y un 50 % del peso de los tubos, y es donde se concentran las roturas, así que no conviene escatimar. Cada kilo aquí es un kilo en el coche: 10 kg más son +0,27 Wh/km y −3 km de autonomía a 100 km/h (modelo). Es un parámetro de honestidad: sirve para que el peso total no salga optimista.',
    masAlto: {
      ventajas: [
        'Cuenta con las piezas que luego aparecen siempre (soportes del cargador, anclajes del cinturón, refuerzos del arco): el peso final no da sorpresas.',
        'Un chasis con cartelas en los nudos aguanta más fatiga que uno de tubos a tope.',
      ],
      desventajas: [
        '12 kg en vez de 6: +6 kg en el coche, −2 km de autonomía a 100 km/h (modelo).',
        'Pletinas y tornillos de más suelen esconder uniones mal diseñadas: mejor triangular (ver «Versión del chasis») que atornillar.',
      ],
    },
    masBajo: {
      ventajas: [
        '3 kg: −3 kg en el coche, +2 km de autonomía (modelo). Es lo que se consigue soldando casi todo y con casquillos de aluminio.',
        'Menos piezas sueltas: menos tornillos que revisar y que aflojar con la vibración.',
      ],
      desventajas: [
        'Por debajo de 4–5 kg en un chasis de 14 kg de tubo, lo normal es que el valor sea optimista y el coche real pese más de lo que dice la pantalla.',
        'Sin cartelas, los nudos soldados de aluminio son el punto de fallo por fatiga.',
      ],
    },
    referencias: [
      'El catálogo de componentes estima ≈ 900 € de soldadura con plantilla y 300 € de tratamiento T6 para el chasis de aluminio (componentes.ts).',
      'No he encontrado una fuente pública que separe el peso de uniones y tornillería en un chasis tubular de coche ligero; el rango 3–12 kg es el de `RANGOS_MASA_A1`.',
    ],
    relacionados: ['spineD', 'spineT', 'matChasis', 'chasis'],
  },
  // ── Rodaje ───────────────────────────────────────────────────────────────
  comp: {
    nombre: 'Compresión de la suspensión',
    queEs: 'Cuánto se ve hundida la suspensión en el visor 3D, de 0 % (estirada, coche en el aire) a 100 % (a tope, los 9 cm de recorrido). Es solo para mirar.',
    porQueImporta: 'Este deslizador no cambia ningún cálculo: ni el peso, ni la autonomía, ni las comprobaciones. Las comprobaciones de «Rueda delantera girada 22° y hundida» y «Rueda trasera hundida» siempre usan el recorrido completo de 9 cm (`TRAVEL_A1`), muevas o no este mando. Sirve para ver cómo quedan las ruedas dentro de los pasos de rueda, dónde acaban los amortiguadores McPherson en la torreta y si el brazo tirado trasero toca algo, en cualquier punto del recorrido. En un coche real, en reposo con dos personas la suspensión suele ir hundida un tercio de su recorrido.',
    masAlto: {
      ventajas: [
        'Al 100 % ves el peor caso: la rueda arriba del todo, como en un bache a fondo, que es lo que comprueban las holguras.',
        'Sirve para revisar que el amortiguador tumbado trasero no choca con el suelo del maletero en su tope.',
      ],
      desventajas: [
        'No es la postura del coche parado: si ajustas la altura de la carrocería mirando el 3D al 100 %, el coche real irá 6 cm más alto.',
        'Ningún número de «Rendimiento», «Estructura» ni «Peso» cambia: si esperas ver algo moverse, no lo verás.',
      ],
    },
    masBajo: {
      ventajas: [
        'Al 0 % ves la suspensión estirada: útil para comprobar que los palieres y las bieletas de dirección no se salen de ángulo con la rueda colgando (coche en el elevador).',
        'Es la posición que exportan los planos y el STEP: con el 3D al 0 % lo que ves coincide con el CAD.',
      ],
      desventajas: [
        'Tampoco es la postura real; el reposo con dos personas está en torno al 30–35 %.',
        'Con la rueda abajo del todo parece que sobra sitio en el paso de rueda, y no es verdad.',
      ],
    },
    referencias: [
      'Recorrido de suspensión del modelo: 90 mm (`TRAVEL_A1`, geometriaA1.ts). Giro máximo de rueda comprobado: 22° (`GIRO_A1`).',
      'Renault Twizy: 120 mm de altura libre al suelo (evspecs.org, Twizy Urban 80); su recorrido de suspensión no está publicado en las fuentes que he visto.',
    ],
    relacionados: ['clear', 'mSuspension', 'viaF', 'viaR', 'neumF', 'neumR'],
    comprobaciones: ['Rueda delantera girada 22° y hundida', 'Rueda trasera hundida'],
  },
  mRueda: {
    nombre: 'Una rueda con neumático',
    queEs: 'Masa de una rueda completa (llanta de 13″ + neumático) en kilos; el coche lleva cuatro. De serie 8 kg (llanta 5 + neumático 3); rango 5–12.',
    porQueImporta: 'Las ruedas son el 8 % del coche (32 kg de 382) y son «masa no suspendida»: no la sujeta la suspensión, así que cada kilo ahí se nota el doble en cómo sigue la rueda el suelo y en lo que le cuesta al motor acelerarla (una rueda hay que empujarla hacia delante y además hacerla girar). Para la autonomía cuenta como cualquier kilo: las cuatro ruedas al mínimo (5 kg) quitan 12 kg y dan 5 km más a 100 km/h; al máximo (12 kg) añaden 16 kg y quitan 6 km (modelo). Las llantas de 13″ son las del Twizy: pequeñas y ligeras; el neumático 125/80 R13 tiene índice de carga 65, es decir 290 kg por rueda, y la carga máxima por rueda del modelo es 194 kg, cómodo.',
    masAlto: {
      ventajas: [
        'Llanta de acero del Twizy (≈ 9,5 kg con neumático): 45 € frente a 90 € la de aluminio, y aguanta un bordillo sin agrietarse (catálogo de componentes).',
        'Neumático más ancho o de más capa (más kilos) soporta más carga y frena mejor en mojado.',
      ],
      desventajas: [
        '12 kg por rueda: +16 kg en el coche, −6 km de autonomía a 100 km/h y 0,2 s más de 0 a 100 (modelo).',
        'Masa no suspendida alta: la rueda rebota en lugar de seguir el suelo; peor agarre en carretera rota y más trabajo para el amortiguador.',
        'Una rueda pesada tarda más en acelerar su giro: el 0–50 se nota más que lo que dice el modelo, que no cuenta la inercia de giro.',
      ],
    },
    masBajo: {
      ventajas: [
        '5 kg por rueda (llanta forjada de aluminio, ≈ 3,5 kg): −12 kg en el coche, +5 km a 100 km/h (modelo), y el mejor comportamiento en baches.',
        'Menos masa girando: la frenada regenerativa y la aceleración responden antes.',
      ],
      desventajas: [
        'Llanta forjada ≈ 260 € cada una frente a 90 € (catálogo de componentes): +680 € por 12 kg.',
        'Por debajo de 5 kg entras en llantas de competición o de velomóvil, que no están homologadas para 290 kg por rueda a 130 km/h.',
        'Un neumático muy ligero suele ser también muy fino: pincha más y dura menos.',
      ],
    },
    referencias: [
      'Renault Twizy: neumáticos 125/80 R13 delante y 145/80 R13 detrás (evspecs.org, Twizy Urban 80).',
      'Continental Conti.eContact 125/80 R13 65M: índice de carga 65 = 290 kg por rueda, índice de velocidad M = 130 km/h, etiqueta de rodadura D, ≈ 74 € (oponeo.ie). El peso del neumático no viene en la ficha.',
      'VW XL1: 115/80 R15 delante y 145/55 R16 detrás, aún más estrechos (Wikipedia, Volkswagen 1-litre car).',
      'Velomóvil Quest: 28 kg el vehículo entero con batería, con ruedas de bicicleta 28-406 y 50-559 (velomobiel.nl, Quest technical details).',
      'No he encontrado el peso publicado de la llanta ni del neumático del Twizy: los 5 + 3 kg de serie son la estimación del catálogo de componentes.',
    ],
    relacionados: ['neumF', 'neumR', 'mSuspension', 'mFrenos', 'viaF', 'viaR'],
    comprobaciones: ['Carga por neumático (índice 65: 290 kg)'],
  },
  mSuspension: {
    nombre: 'Cuatro McPherson con manguetas',
    queEs: 'Masa, en kilos, de todo lo comprado de la suspensión: las dos columnas McPherson delanteras (muelle y amortiguador en uno), los dos amortiguadores traseros, las cuatro manguetas (la pieza que une rueda, freno y suspensión), rótulas y barras estabilizadoras. De serie 26 kg; rango 16–40. Los brazos fabricados en tubo (1,3 kg) los pesa el modelo aparte.',
    porQueImporta: 'Es el segundo bloque más pesado del rodaje después de las ruedas (27 kg de 382) y, como ellas, en buena parte masa no suspendida (manguetas, la mitad de los amortiguadores). Lo que decide aquí no es la autonomía (de 16 a 40 kg son 24 kg: 588 frente a 579 km a 100 km/h, modelo), sino de dónde vienen las piezas: las columnas de Twizy de recambio (≈ 130 € cada una) pesan lo que pesan; los amortiguadores de quad con muelle (1,3 kg) y manguetas mecanizadas en aluminio bajan a 22 kg pero cuestan el doble. La suspensión trasera del modelo ya es de brazo tirado con amortiguador tumbado, precisamente para no llevar torretas y dejar el maletero plano.',
    masAlto: {
      ventajas: [
        'Piezas de serie del Twizy (nuevas o de desguace, ≈ 30 kg): baratas (450 € el juego usado), homologadas y con recambio en cualquier taller (catálogo de componentes).',
        'Amortiguadores más grandes disipan más calor: aguantan mejor una carretera rota larga sin perder efecto.',
      ],
      desventajas: [
        '40 kg: +14 kg en el coche y −5 km a 100 km/h (modelo).',
        'Manguetas de fundición pesadas empeoran el seguimiento del suelo (masa no suspendida).',
        'Las columnas de Twizy están pensadas para 474 kg de coche; en uno de 382 kg los muelles van duros si no se cambian.',
      ],
    },
    masBajo: {
      ventajas: [
        '16 kg: −10 kg en el coche, +4 km (modelo), y amortiguadores regulables en altura y dureza (los de quad/kart-cross).',
        'Manguetas de aluminio a medida permiten colocar la rótula y el disco exactamente donde el modelo los pone.',
      ],
      desventajas: [
        'Amortiguadores Öhlins/Fox + manguetas mecanizadas ≈ 2.000 € frente a ≈ 1.000 € (catálogo de componentes).',
        'Piezas de competición sin homologación de automoción: el técnico de la ITV querrá verlas con informe.',
        'Por debajo de 16 kg para cuatro esquinas de coche de 540 kg en carga no hay piezas serias: los 16 kg son el suelo de `RANGOS_MASA_A1`.',
      ],
    },
    referencias: [
      'Renault Twizy: McPherson delante y detrás con barra estabilizadora, discos ventilados de 214/204 mm (geometriaA1.ts, cabecera, a partir de la ficha del Twizy).',
      'Catálogo de componentes: columnas McPherson de Twizy ≈ 130 € cada una (KYB, Monroe), rótulas 20–40 €; alternativa ligera 22 kg, alternativa de desguace 30 kg (componentes.ts).',
      'No he encontrado publicado el peso de una columna McPherson de Twizy; el reparto de 26 kg es la estimación del catálogo.',
    ],
    relacionados: ['mRueda', 'mFrenos', 'mDireccion', 'comp', 'clear', 'viaF', 'viaR'],
  },
  mFrenos: {
    nombre: 'Un freno de disco con pinza',
    queEs: 'Masa, en kilos, del freno de una rueda: disco, pinza con pastillas y su parte de bomba, servo y latiguillos. El coche lleva cuatro. De serie 2,8 kg; rango 1,8–5.',
    porQueImporta: 'En un eléctrico el motor frena casi siempre (freno regenerativo, que devuelve energía a la batería); los discos quedan para la frenada fuerte y para parar del todo, pero en esa frenada fuerte tienen que parar 540 kg desde 140 km/h, y eso es calor: un disco pequeño se calienta más. Los cuatro frenos pesan 11 kg (3 % del coche); ir de 1,8 a 5 kg por rueda son 13 kg de diferencia, 5 km de autonomía a 100 km/h (modelo). Es masa no suspendida y, además, masa girando (el disco), así que pesa doble en el comportamiento.',
    masAlto: {
      ventajas: [
        'Discos de Twizy de desguace (≈ 3,2 kg por rueda): 300 € las cuatro esquinas completas con mangueta (catálogo de componentes).',
        'Un disco más grande y pesado absorbe más calor: menos riesgo de que el freno «se vaya» bajando un puerto largo.',
        'Pinzas de fundición: robustas, con recambio de pastillas en cualquier tienda.',
      ],
      desventajas: [
        '5 kg por rueda: +9 kg en el coche, −3 km a 100 km/h (modelo).',
        'Más masa no suspendida y más inercia de giro: peor en baches y más consumo al acelerar.',
        'Si la frenada regenerativa ya hace el 80 % del trabajo, el disco grande casi nunca llega a calentarse: peso que viaja de balde.',
      ],
    },
    masBajo: {
      ventajas: [
        'Discos macizos de moto de Ø 200 mm en inoxidable con pinza de aluminio de dos pistones (clase Brembo P2): 1,8 kg por rueda, −4 kg en el coche, misma frenada (catálogo de componentes).',
        'Pinza de aluminio: no se oxida y no se agarrota tras semanas parado.',
      ],
      desventajas: [
        'Piezas de moto ≈ 230 € por rueda frente a ≈ 180 € las de Twizy (catálogo de componentes).',
        'Un disco pequeño y macizo se calienta más en un puerto bajando a tope; con regeneración fuerte va bien, sin ella es justo.',
        'Homologación: los frenos de un cuadriciclo tienen que pasar su ensayo (Reglamento 168/2013 y actos delegados); con piezas de moto hay que documentarlo.',
      ],
    },
    referencias: [
      'Renault Twizy: discos ventilados de 214 mm delante y 204 mm detrás (geometriaA1.ts, `DISCO_F` / `DISCO_R`, de la ficha del Twizy).',
      'Catálogo de componentes: discos 50–60 €, pinzas 90–120 €, pastillas 30 € (Autodoc); alternativa de moto 1,8 kg; desguace 3,2 kg (componentes.ts).',
      'VW XL1: 795 kg con un tren motriz de 227 kg (Wikipedia, Volkswagen 1-litre car). No he encontrado publicado el peso de sus frenos por rueda.',
    ],
    relacionados: ['mRueda', 'mSuspension', 'kWPico', 'mOcc'],
  },
  mDireccion: {
    nombre: 'Dirección completa',
    queEs: 'Masa, en kilos, de toda la dirección: cremallera (la barra dentada que convierte el giro del volante en movimiento lateral), dos bieletas, columna con junta cardán y el volante. De serie 7 kg; rango 4–12.',
    porQueImporta: 'Es un bloque pequeño (2 % del coche) y sin asistencia: con unos 110 kg sobre el eje delantero no hace falta servo (ficha de componentes). Entre 4 y 12 kg hay 8 kg, 3 km de autonomía a 100 km/h (modelo). Lo que importa de la dirección no es el peso sino la geometría (giro de 22°, radio de giro ≈ 4,3 m) y la seguridad: la columna tiene que ceder en un choque frontal y no clavarse en el piloto, y eso suele pesar un poco más.',
    masAlto: {
      ventajas: [
        'Cremallera, columna y bieletas de Twizy de desguace (≈ 8 kg): 180 € y piezas homologadas (catálogo de componentes).',
        'Columna con absorción de impacto y junta cardán de automoción: más segura en un choque.',
      ],
      desventajas: [
        '12 kg: +5 kg en el coche, −1 km (modelo). Poco, pero es peso en el morro, delante del eje.',
        'Una cremallera larga de coche grande no cabe entre las ruedas con vía de 1,22 m sin bieletas cortas, que empeoran el ángulo.',
      ],
    },
    masBajo: {
      ventajas: [
        'Cremallera corta de aluminio de kart-cross + columna de aluminio + volante de carbono: 5 kg, −2 kg (catálogo de componentes).',
        'Volante pequeño y ligero: menos inercia, dirección más directa.',
      ],
      desventajas: [
        '≈ 800 € frente a 520 € la de serie o 180 € de desguace (catálogo de componentes).',
        'Piezas de competición sin columna colapsable: hay que resolver aparte la seguridad en choque.',
      ],
    },
    referencias: [
      'Ficha de la dirección: cremallera manual de 2,6 vueltas, giro de 22° (radio ≈ 4,3 m), volante Ø 300 mm inclinado 35°, 7 kg (componentes.ts). Cremallera nueva de Twizy 250–400 €.',
      'Renault Twizy: círculo de giro de 6,8 m entre bordillos (evspecs.org, Twizy Urban 80).',
    ],
    relacionados: ['mSuspension', 'viaF', 'volAlt', 'volDist'],
  },
  // ── Motor y transmisión ──────────────────────────────────────────────────
  kWNom: {
    nombre: 'Potencia nominal',
    queEs: 'Potencia que el motor puede dar de forma continua, sin sobrecalentarse, en kilovatios (kW). De serie 15 kW; el deslizador va de 4 a 40.',
    porQueImporta: 'Es la cifra legal: un cuadriciclo pesado L7e-A tiene que tener como máximo 15 kW de potencia continua (Reglamento (UE) 168/2013, anexo I). Por encima deja de ser cuadriciclo y pasa a ser un coche M1, con todas sus exigencias (choque, ESP, etc.). Técnicamente es lo que fija la velocidad que se puede mantener en llano y la pendiente que se sube sin perder velocidad: con 15 kW el modelo da 170 km/h sostenidos y un 6,4 % de pendiente a 100 km/h; con 10 kW, 145 km/h y 3,4 %; con 20 kW, 189 km/h y 9,4 %. Como a 100 km/h solo hacen falta 4,25 kW, el consumo y la autonomía no cambian con este parámetro: solo cambian hasta dónde puedes ir rápido. Ojo con los neumáticos: el 125/80 R13 65M está homologado hasta 130 km/h, menos que lo que el motor permite.',
    masAlto: {
      ventajas: [
        '20 kW: 189 km/h sostenidos y sube un 9,4 % a 100 km/h sin perder velocidad (modelo).',
        'El motor va menos exigido en su uso normal: menos calor, más vida.',
        'Permite remolcar o cargar el maletero sin que el puerto de montaña se haga cuesta arriba.',
      ],
      desventajas: [
        'Por encima de 15 kW continuos el vehículo ya no es L7e (Reglamento 168/2013, anexo I): homologación de coche, cinco veces más cara y lenta.',
        'Un motor de más potencia continua es más grande y pesa más: la ficha del Motenergy ME1616 (20 kW) da 21,8 kg frente a los 16 kg de serie (catálogo de componentes).',
        'No da más autonomía: a 100 km/h el consumo es el mismo (42,5 Wh/km) con 10, 15 o 20 kW (modelo).',
        'La velocidad que permite (170 km/h) ya supera lo que el neumático admite (130 km/h, índice M).',
      ],
    },
    masBajo: {
      ventajas: [
        'Motor más ligero y barato: un PMSM de 10 kW nominales (Motenergy ME1507/ME1905) cuesta menos y pesa menos que el de 15 (catálogo de componentes).',
        'Con 8 kW el modelo aún mantiene 132 km/h en llano: para uso por carretera sigue sobrando.',
        'Por debajo de 6 kW y 45 km/h entraría en L6e (cuadriciclo ligero, ≤ 425 kg), que en varios países se conduce con permiso de ciclomotor.',
      ],
      desventajas: [
        '10 kW: solo un 3,4 % de pendiente sostenida a 100 km/h; 8 kW: un 2,2 % (modelo). En un puerto del 7 % hay que bajar a 60–70 km/h.',
        'La comprobación «Velocidad máxima sostenida (objetivo 140 km/h)» se pone en rojo por debajo de 9,2 kW (modelo).',
        'Un motor trabajando siempre cerca de su nominal se calienta: hace falta refrigeración líquida y aun así dura menos.',
      ],
    },
    referencias: [
      'Reglamento (UE) 168/2013, anexo I: L7e-A, L7e-B2 y L7e-C «≤ 15 kW» de potencia continua nominal o neta; L6e-B ≤ 6 kW y ≤ 45 km/h (legislation.gov.uk, texto del anexo).',
      'Renault Twizy 80: 13 kW (17 CV) y 57 N·m; Twizy 45: 4 kW. Las fichas no dicen si es continua o de pico (evspecs.org; Wikipedia, Renault Twizy).',
      'VW XL1: motor eléctrico de 20 kW más diésel de 35 kW; 158 km/h limitados (Wikipedia, Volkswagen 1-litre car).',
      'EMRAX 188: 23 kW continuos refrigerado por aire, 29 kW por líquido, en 7,1–7,9 kg (datasheet EMRAX 188 v1.7).',
      'Continental eContact 125/80 R13 65M: índice M = 130 km/h (oponeo.ie).',
    ],
    relacionados: ['kWPico', 'speed', 'mMotor', 'mInversor', 'mReductora', 'kWh'],
    comprobaciones: ['Velocidad máxima sostenida (objetivo 140 km/h)'],
  },
  kWPico: {
    nombre: 'Potencia máxima',
    queEs: 'Potencia que el motor y el inversor pueden dar durante unos segundos (típicamente 30 s) antes de calentarse de más, en kW. De serie 32 kW; va desde la nominal hasta 80.',
    porQueImporta: 'Es la potencia de acelerar y de adelantar. El modelo la usa para el 0–50, el 0–100 y la velocidad punta: con 32 kW, 3,5 s a 50 km/h, 9,7 s a 100 km/h y 225 km/h de punta (si los neumáticos y la ley lo permitieran); con 20 kW, 4,1 s, 14,7 s y 189 km/h; con 50 kW, 3,4 s, 7,5 s y 264 km/h. Fíjate en que el 0–50 casi no mejora a partir de 32 kW: lo limita la adherencia de las ruedas traseras (el modelo supone que el 50 % del peso va sobre ellas y un agarre de 0,85), no el motor. No cuenta para la homologación L7e, que solo mira la potencia continua, pero sí dimensiona el inversor (≈ 400 A a 96 V para 32 kW) y el cableado de alta tensión.',
    masAlto: {
      ventajas: [
        '50 kW: 0–100 en 7,5 s en vez de 9,7 (modelo); adelantar en carretera es más seguro.',
        'Más potencia de pico es también más freno regenerativo: se recupera más energía en cada frenada.',
        'Sigue siendo L7e: la ley solo limita la continua (Reglamento 168/2013, anexo I).',
      ],
      desventajas: [
        'El inversor crece con el pico: 400 A para 32 kW; para 50 kW harían falta ≈ 600 A, otra talla de inversor (más caro y más pesado; Sevcon Gen4 talla 8 en vez de talla 6, sin cifra de peso comprobada).',
        'La batería tiene que entregar esa corriente: 50 kW de 27 kWh es casi 2C, al límite de celdas NMC de energía; LFP lo lleva peor.',
        'Por encima de ≈ 35 kW el 0–50 no mejora (3,4 s) porque patinan las ruedas (modelo): potencia que solo sirve a más de 60 km/h.',
        'Cables, contactores y fusible de más sección: +2–3 kg en «Varios».',
      ],
    },
    masBajo: {
      ventajas: [
        'Con el pico igual a la nominal (15 kW) basta un inversor de 200 A, más barato y ligero (la alternativa Fardriver/Votol de 4 kg del catálogo de componentes).',
        'Menos corriente de pico: batería y cables más tranquilos, menos calor, más vida.',
      ],
      desventajas: [
        '15 kW de pico: 0–50 en 4,9 s y 0–100 en 19,8 s (modelo); incorporarse a una autovía se hace largo.',
        '20 kW: 14,7 s a 100 km/h, parecido al XL1 (11,9 s con 55 kW combinados, 795 kg).',
        'Menos freno regenerativo: más trabajo para los discos.',
      ],
    },
    referencias: [
      'Ficha del motor de serie: PMSM 15 kW nominales / 32 kW de pico (30 s), 96–120 V, ≈ 110 N·m, 16 kg; inversor de 400 A de pico (componentes.ts).',
      'EMRAX 188: 60 kW de pico (30 s) con 23–29 kW continuos, 7,1–7,9 kg (datasheet EMRAX 188 v1.7).',
      'Aptera Launch Edition: 128 kW con tres motores en rueda, 0–60 mph en 4,0 s (Green Car Reports, ene. 2023).',
      'VW XL1: 0–100 km/h en 11,9 s con 20 kW eléctricos + 35 kW diésel (Wikipedia, Volkswagen 1-litre car).',
    ],
    relacionados: ['kWNom', 'mInversor', 'mMotor', 'kWh', 'mOcc', 'mFrenos'],
  },
  speed: {
    nombre: 'Velocidad de cálculo',
    queEs: 'La velocidad, en km/h, a la que el panel «Rendimiento» calcula el consumo, la potencia necesaria y la autonomía en las filas «a X km/h». De serie 100 km/h; va de 30 a 160.',
    porQueImporta: 'No cambia el coche: cambia la pregunta que le haces. La resistencia del aire crece con el cubo de la velocidad, así que la autonomía se hunde al ir rápido: el modelo da 880 km a 60 km/h, 727 a 80, 584 a 100, 468 a 120 y 378 a 140. La potencia necesaria pasa de 1,7 kW a 60 km/h a 9,2 kW a 140. Las filas «a 100 km/h» y la comprobación de 140 km/h sostenidos no se mueven con este deslizador: están fijas para poder comparar diseños. Úsalo para ver tu trayecto real (ciudad a 50, carretera a 90, autovía a 120) y no la cifra de catálogo.',
    masAlto: {
      ventajas: [
        'Ves el caso malo: a 140 km/h el coche consume 66 Wh/km (6,6 kWh/100 km) y hace 378 km (modelo); si eso te vale, todo lo demás sobra.',
        'A 120 km/h se ve cuánto pesa el aire (CdA) frente a la masa: a esa velocidad el 70 % de la potencia es aerodinámica.',
      ],
      desventajas: [
        'Por encima de 130 km/h el neumático 125/80 R13 65M está fuera de su índice de velocidad M (oponeo.ie); el número sale pero el coche no debería ir ahí.',
        'A 160 km/h hacen falta 12,9 kW (80 Wh/km, 309 km), casi la potencia nominal: el motor iría al límite y el modelo no cuenta el calentamiento (modelo).',
      ],
    },
    masBajo: {
      ventajas: [
        'A 60 km/h: 28 Wh/km y 880 km de autonomía (modelo); muestra por qué un coche así en ciudad apenas necesita batería.',
        'A baja velocidad manda la rodadura (masa y neumáticos), no el aire: sirve para decidir si vale la pena quitar kilos o afinar la forma.',
      ],
      desventajas: [
        'El modelo no incluye paradas, arranques ni calefacción: a 30 km/h en ciudad el consumo real es mayor que los 26 Wh/km que salen (y fíjate en que a 30 ya no baja de los 26 de 50 km/h: son los 250 W de equipos, que corren aunque estés parado en un semáforo).',
        'Una autonomía de 1.000 km a 50 km/h es verdad en la fórmula y mentira en la práctica: nadie hace 20 h seguidas.',
      ],
    },
    referencias: [
      'Renault Twizy 80: 6,3 kWh/100 km y 100 km WLTP con 6,1 kWh usables; unos 80 km reales y ≈ 50 km a velocidad alta (evspecs.org; Wikipedia, Renault Twizy).',
      'Aptera Launch Edition: 42 kWh para 400 millas (≈ 640 km), lo que sale a ≈ 65 Wh/km en ciclo EPA, con Cd 0,13 (Green Car Reports, ene. 2023; el Wh/km es cuenta mía).',
      'VW XL1: CdA 0,28 m² (Cd 0,186–0,189 × 1,5 m²) frente a los 0,17 m² del modelo (Cd 0,153 × 1,11 m²) (Wikipedia, Volkswagen 1-litre car).',
    ],
    relacionados: ['kWNom', 'kWh', 'mOcc', 'L', 'W', 'H'],
  },
  mMotor: {
    nombre: 'Motor',
    queEs: 'Masa del motor eléctrico, en kilos. De serie 16 kg (un motor síncrono de imanes permanentes, refrigerado por líquido, de 15/32 kW); rango 9–30.',
    porQueImporta: 'El bloque motor + inversor + reductora + palieres pesa 37 kg (10 % del coche), y el motor es casi la mitad. Pesa lo que pesa según su tecnología: un motor radial industrial de 15 kW con carcasa de hierro ronda los 28 kg; uno de flujo axial (EMRAX 188) da 23–29 kW continuos en 7–8 kg. El sitio también importa: el motor va bajo y pegado al suelo delante del eje trasero (Eugenio, 2026-11-06), así que su masa está baja y centrada, que es donde menos daño hace. Para la autonomía: de 8 a 28 kg hay 20 kg, 8 km a 100 km/h (modelo).',
    masAlto: {
      ventajas: [
        'PMSM industrial chino de 15/30 kW, refrigerado por aire forzado: 28 kg pero ≈ 850 € frente a 1.700 € el de serie (catálogo de componentes).',
        'Un motor grande y pesado es también un motor que se calienta despacio: aguanta mejor subir un puerto a tope.',
        'Refrigeración por aire: sin bomba, radiador ni circuito de líquido (menos en «Varios»).',
      ],
      desventajas: [
        '28 kg: +12 kg en el coche, −4 km a 100 km/h, 0,2 s más de 0 a 100 (modelo).',
        'La comprobación «Motor, reductora, inversor y cargador dentro de la carrocería» ya va justa (−0,7 cm con la configuración base): un motor más grande es también más voluminoso.',
      ],
    },
    masBajo: {
      ventajas: [
        'Flujo axial clase EMRAX 188: 7,1–7,9 kg con 23–29 kW continuos y 60 kW de pico (datasheet v1.7): −8 kg en el coche y el doble de potencia.',
        'Más sitio en la cola para el maletero plano.',
      ],
      desventajas: [
        '≈ 4.200 € el EMRAX frente a 1.700 € (catálogo de componentes).',
        'Con 23–29 kW continuos hay que limitar por programa a 15 kW para seguir en L7e, y documentarlo en la homologación.',
        'Por debajo de 9 kg no hay motores de 15 kW continuos con refrigeración seria: es el suelo de `RANGOS_MASA_A1`.',
      ],
    },
    referencias: [
      'EMRAX 188: 7,1 kg (aire) / 7,9 kg (líquido), 23/29 kW continuos, 60 kW pico, 100 N·m, 8.000 rpm (datasheet EMRAX 188 v1.7).',
      'Motenergy ME1616: 20 kW nominales / 55 kW de pico, 21,8 kg, líquido (ficha del proveedor en componentes.ts; no la he vuelto a comprobar hoy).',
      'VW XL1: tren motriz completo (motor eléctrico, diésel, caja y batería) de 227 kg (Wikipedia, Volkswagen 1-litre car).',
    ],
    relacionados: ['kWNom', 'kWPico', 'mInversor', 'mReductora', 'mVarios'],
    comprobaciones: ['Motor, reductora, inversor y cargador dentro de la carrocería'],
  },
  mInversor: {
    nombre: 'Inversor',
    queEs: 'Masa del inversor (el controlador electrónico que convierte la corriente continua de la batería en trifásica para el motor y regula el acelerador y el freno regenerativo), en kilos. De serie 6 kg; rango 3–10.',
    porQueImporta: 'Su peso lo fija la corriente de pico que tiene que manejar (400 A para 32 kW a 96 V) y la refrigeración: con líquido es compacto; con aire, lleva un disipador grande. Es poco peso (1,5 % del coche: de 3 a 10 kg son 7 kg, 3 km de autonomía), pero es la pieza que decide cómo se siente el coche: suavidad del acelerador, fuerza del freno regenerativo, y si habla CAN con la pantalla y el cargador. Va detrás del eje trasero, bajo el suelo del maletero.',
    masAlto: {
      ventajas: [
        'Inversores de automoción (Sevcon/BorgWarner Gen4, Curtis): refrigeración por líquido en el mismo circuito que el motor, CAN, programación documentada, ≈ 1.500 € (catálogo de componentes).',
        'Disipador grande: aguanta picos repetidos sin recortar potencia.',
      ],
      desventajas: [
        '10 kg: +4 kg en el coche, −1 km (modelo). Despreciable.',
        'Más volumen en la cola, donde «Motor, reductora, inversor y cargador dentro de la carrocería» ya va justa.',
      ],
    },
    masBajo: {
      ventajas: [
        'Controladores de moto eléctrica (Fardriver, Votol): 4 kg, 350–400 A de fase, ≈ 480 € (catálogo de componentes).',
        'Programables por Bluetooth, sin licencia de programación.',
      ],
      desventajas: [
        'Sin CAN de automoción ni documentación seria: la pantalla, el cargador y el BMS no se entienden con él sin trabajo extra.',
        'Refrigeración por aire en una cola cerrada: hay que meterle flujo de aire o recorta potencia en verano.',
      ],
    },
    referencias: [
      'Ficha del inversor de serie: 96–120 V, 400 A de pico, 200 A continuos, CAN, líquido, 6 kg (componentes.ts).',
      'No he podido comprobar hoy el peso del Sevcon Gen4 talla 6 (la ficha en Scribd no lo muestra); el dato de 6 kg es la estimación del catálogo.',
    ],
    relacionados: ['kWPico', 'kWNom', 'mMotor', 'mVarios'],
    comprobaciones: ['Motor, reductora, inversor y cargador dentro de la carrocería'],
  },
  mReductora: {
    nombre: 'Reductora con diferencial',
    queEs: 'Masa de la reductora (un escalón de engranajes, ≈ 8:1, que baja las vueltas del motor a las de la rueda) con su diferencial (que deja girar a distinta velocidad las dos ruedas en curva), en kilos; los 4 kg de palieres van aparte. De serie 11 kg; rango 6–18.',
    porQueImporta: 'Un motor eléctrico gira a 6.000 rpm y la rueda a 1.000: sin reductora no hay coche. Es una pieza mecánica densa (carcasa de aluminio, engranajes de acero, aceite) y por eso pesa. La elección real es entre una reductora de vehículo ligero (600–900 €, 11 kg), la del Twizy de desguace (relación 9,23:1, ≈ 16 kg, 420 €, hay que adaptar la brida al motor) y una correa dentada con diferencial de kart-cross (7 kg, 950 €, más ruido). De 6 a 18 kg hay 12 kg, 4 km de autonomía a 100 km/h (modelo).',
    masAlto: {
      ventajas: [
        'Transeje del Twizy de segunda mano: 420 €, probado en 30.000 coches, con sus palieres (catálogo de componentes).',
        'Carcasa de fundición y engranajes grandes: silenciosa y sin mantenimiento.',
      ],
      desventajas: [
        '18 kg: +7 kg en el coche, −2 km (modelo).',
        'La relación del Twizy (9,23:1) está pensada para 80 km/h: con un motor de 6.000 rpm y la rueda trasera de 56 cm sale una punta de ≈ 69 km/h (6.000 / 9,23 = 650 vueltas de rueda por minuto × 1,77 m); para 140 km/h hace falta ≈ 4,5:1 o un motor que gire 12.000 rpm. Ojo: a la de serie (≈ 8:1, 6.000 rpm) le pasa lo mismo, ≈ 80 km/h; la ficha del motor y la de la reductora no cuadran con los 140 km/h y hay que revisarlas.',
        'Hay que mecanizar una brida de adaptación motor–reductora.',
      ],
    },
    masBajo: {
      ventajas: [
        'Correa dentada + diferencial compacto de kart-cross: 7 kg, −4 kg en el coche, piezas de catálogo y relación a medida cambiando poleas (catálogo de componentes).',
        'Más sitio bajo el suelo del maletero.',
      ],
      desventajas: [
        'La correa hay que tensarla y revisarla; algo más de ruido.',
        'Un diferencial de kart-cross no está pensado para 540 kg a 140 km/h durante horas: hay que verificar su carga.',
        'Por debajo de 6 kg no hay reductora con diferencial para 110 N·m: es el suelo de `RANGOS_MASA_A1`.',
      ],
    },
    referencias: [
      'Ficha de la transmisión: ≈ 8:1 helicoidal, diferencial abierto, baño de aceite 0,5 L, 11 kg + 4 kg de palieres, ≈ 1.800 €; alternativa Twizy 9,23:1 de desguace 16 kg / 420 €; correa + diferencial 7 kg / 950 € (componentes.ts).',
      'No he encontrado publicado el peso de la reductora del Twizy; los 16 kg son la estimación del catálogo.',
    ],
    relacionados: ['mMotor', 'kWNom', 'neumR', 'mInversor'],
    comprobaciones: ['Motor, reductora, inversor y cargador dentro de la carrocería'],
  },
  // ── Batería y energía ───────────────────────────────────────────────────
  kWh: {
    nombre: 'Batería',
    queEs: 'Energía que almacena la batería, en kilovatios-hora (kWh): 1 kWh mueve este coche unos 21 km a 100 km/h. De serie 27 kWh; el deslizador va de 5 a 45.',
    porQueImporta: 'Es el parámetro que más mueve a la vez autonomía, peso y precio. El modelo cuenta el 92 % como usable (24,8 kWh) y da 584 km a 100 km/h. Cada kWh que añades son ≈ 6,1 kg (a 165 Wh/kg), ≈ 5 L de volumen (a 200 Wh/L), ≈ 300 € (catálogo de componentes, precio de prototipo) y ≈ 20 km más a 100 km/h, porque el kilo extra se come parte de la ganancia: 28 kWh dan 604 km, 35 kWh 734 km con 49 kg más, 45 kWh 909 km con 110 kg más. Hacia abajo, 20 kWh dan 445 km y quitan 42 kg; 10 kWh, 232 km y 103 kg menos. Para la homologación no cuenta: la masa L7e (≤ 450 kg) se mide sin batería (Reglamento 168/2013, art. 5). La batería va en dos módulos finos (9 cm) bajo el piloto y el pasajero; si no cabe, un tercero en la cola.',
    masAlto: {
      ventajas: [
        '35 kWh: 734 km a 100 km/h; 45 kWh: 909 km (modelo). Casi nunca hay que cargar fuera de casa.',
        'Más celdas en paralelo: cada una trabaja menos, la batería dura más ciclos y admite más potencia de pico.',
        'Más capacidad de carga rápida en kW con la misma tasa (C) por celda.',
      ],
      desventajas: [
        '+6,1 kg y ≈ +300 € por kWh (modelo; catálogo de componentes): 45 kWh son +110 kg y ≈ +5.400 €.',
        'Con 45 kWh el coeficiente de seguridad de los largueros cae de 0,67 a 0,40 y la carga por rueda sube de 194 a 259 kg (modelo): la batería va justo entre los ejes.',
        'A partir de ≈ 28 kWh (a 200 Wh/L) no cabe en los dos módulos de 9 cm y aparece el tercero en la cola (3,4 cm con 30 kWh, 10 cm con 35), que se come maletero y pone peso detrás del eje (modelo).',
        'Más peso parado: el coche pasa el 95 % de su vida llevando 584 km de autonomía que casi nunca usa.',
      ],
    },
    masBajo: {
      ventajas: [
        '20 kWh: −42 kg (340 kg el coche), 445 km a 100 km/h, ≈ −2.100 €; 0–100 en 9,2 s en vez de 9,7 (modelo).',
        'Módulos más finos: el pasajero se sienta más bajo y gana cabeza (con 27 kWh su módulo es de 8,5 cm).',
        'Un coche más ligero gasta menos en ciudad, donde manda la rodadura.',
      ],
      desventajas: [
        '10 kWh: 232 km a 100 km/h y 147 km a 140 (modelo); dependes del cargador.',
        'Menos celdas en paralelo: con 32 kW de pico sobre 10 kWh la batería va a más de 3C, fuera de lo razonable para celdas de energía.',
        'La carga de 3,3 kW se hace relativamente más lenta de vaciar a llenar en proporción: mismo ritmo, menos reserva.',
      ],
    },
    referencias: [
      'Renault Twizy: 6,1 kWh usables (7 brutos), 100 kg de batería, 100 km WLTP, 474 kg (evspecs.org; Wikipedia, Renault Twizy).',
      'Renault Zoe ZE50: 52 kWh usables (54,7 brutos), 326 kg de paquete, 395 km de la ficha (PushEVs, «New generation Renault ZOE battery details», 2020).',
      'Aptera Launch Edition: 42 kWh para 400 millas (≈ 640 km) (Green Car Reports, ene. 2023).',
      'VW XL1: 5,5 kWh para 50 km eléctricos, el resto con diésel (Wikipedia, Volkswagen 1-litre car).',
      'Reglamento (UE) 168/2013, art. 5.2: la masa en orden de marcha excluye «en el caso de un vehículo híbrido o eléctrico puro, las baterías de propulsión» (legislation.gov.uk).',
      'Catálogo de componentes: ≈ 300 €/kWh el paquete a medida con BMS; BloombergNEF 2025 da 99 $/kWh en gran serie (componentes.ts).',
    ],
    relacionados: ['whKg', 'whL', 'altBat', 'speed', 'kWPico', 'spineD', 'sol'],
    comprobaciones: ['Batería: cabe en los módulos', 'Batería dentro de la carrocería (no asoma por la panza)', 'Módulo bajo el pasajero de la batería dentro de la carrocería', 'Carga por neumático (índice 65: 290 kg)'],
  },
  whKg: {
    nombre: 'Densidad del paquete (masa)',
    queEs: 'Cuánta energía cabe en cada kilo de batería completa (celdas + BMS + caja + cables + refrigeración), en vatios-hora por kilo (Wh/kg). De serie 165; rango 100–220.',
    porQueImporta: 'Divide los kWh entre esto y tienes los kilos de batería: 27.000 / 165 = 164 kg, el 43 % del coche. Es el parámetro de masa más potente de todo el panel: subir a 190 Wh/kg (celdas 21700 de alta energía) quita 21 kg; bajar a 125 (LFP, litio-ferrofosfato) añade 53 kg. En autonomía son 593 frente a 565 km a 100 km/h (modelo). No cambia el volumen (eso es Wh/L) ni la energía: cambia la química y lo bien empaquetada que esté. Una referencia honesta: en el Zoe las celdas son el 63 % del peso del paquete; el resto es caja, módulos, BMS y refrigeración.',
    masAlto: {
      ventajas: [
        '190 Wh/kg (Molicel P50B / Samsung 50S en paquete): −21 kg, +9 km a 100 km/h, coeficiente de seguridad de 0,67 a 0,78 (modelo; catálogo de componentes).',
        '220 Wh/kg: −40 kg (batería de 123 kg), 601 km (modelo). Es el techo de lo que hoy se compra.',
        'Menos peso entre ejes: largueros menos cargados, menos carga por rueda (169 kg frente a 194).',
      ],
      desventajas: [
        'Celdas de alta energía cuestan un tercio más (≈ 400 €/kWh frente a 300, catálogo de componentes).',
        'Química NMC de alto níquel: más sensible a la temperatura, menos ciclos (1.000–1.500 frente a 3.000+ en LFP) y más riesgo en caso de daño.',
        'Un paquete muy denso suele serlo porque lleva poca caja y poca refrigeración: hay que compensarlo con cuidado en el diseño.',
      ],
    },
    masBajo: {
      ventajas: [
        'LFP a 125 Wh/kg: ≈ 180 €/kWh (−40 %), más segura (no arde con facilidad), 3.000+ ciclos y tolera cargar al 100 % a diario (catálogo de componentes).',
        'Celdas prismáticas grandes: menos conexiones, montaje más sencillo.',
      ],
      desventajas: [
        '125 Wh/kg: +53 kg (coche de 435 kg), −19 km a 100 km/h, 0–100 en 10,4 s, coeficiente de seguridad 0,51 y 225 kg por rueda (modelo).',
        '100 Wh/kg (celdas sueltas de baja calidad o paquete muy blindado): +106 kg, batería de 270 kg (modelo).',
        'LFP rinde peor en frío: en invierno pierde potencia y autonomía más que NMC.',
      ],
    },
    referencias: [
      'Renault Zoe ZE50: 168 Wh/kg de paquete (54,7 kWh en 326 kg) con celdas NMC 712 de LG a 265 Wh/kg; las celdas son 206 kg, el 63 % (PushEVs, 2020).',
      'Renault Twizy: 6,1 kWh usables en 100 kg, es decir ≈ 61–70 Wh/kg según se cuente usable o bruta (Wikipedia; evspecs.org). Tecnología de 2012.',
      'Nota del lateral: «Celdas NMC en paquete: 150–180 Wh/kg y 200–250 Wh/L. LFP: 110–130 Wh/kg» (Aeromovil.tsx).',
      'Los 190 Wh/kg de Molicel P50B / Samsung 50S en paquete y los 125 de LFP son los de las alternativas del catálogo (componentes.ts).',
    ],
    relacionados: ['kWh', 'whL', 'spineD', 'mOcc', 'kWPico'],
    comprobaciones: ['Carga por neumático (índice 65: 290 kg)'],
  },
  whL: {
    nombre: 'Densidad del paquete (volumen)',
    queEs: 'Cuánta energía cabe en cada litro de batería completa, en vatios-hora por litro (Wh/L). De serie 200; rango 120–320.',
    porQueImporta: 'Divide los kWh entre esto y tienes los litros: 27.000 / 200 = 135 L. No cambia el peso ni la autonomía: cambia cuánto sitio ocupa y, con ello, cuántos módulos hacen falta y cuánto sobresalen del suelo. El modelo reparte la batería en módulos de 9 cm como mucho: bajo el piloto (1,14 × 0,84 m), bajo el pasajero (0,72 × 0,80 m) y, si falta, en la cola. Con 200 Wh/L los dos primeros van a 9,0 y 8,5 cm; con 150 Wh/L aparece un tercero de 12 cm en la cola; con 120 Wh/L, uno de 25 cm que se come el maletero. Con 250 Wh/L el del pasajero baja a 3,8 cm y el pasajero se sienta casi 5 cm más bajo; con 320, cabe todo bajo el piloto en 8,8 cm. Como los asientos apoyan sobre los módulos, este número mueve la altura de las caderas y las holguras de cabeza.',
    masAlto: {
      ventajas: [
        '250 Wh/L: el módulo del pasajero baja a 3,8 cm y gana ≈ 5 cm de cabeza; 320 Wh/L: un solo módulo bajo el piloto y el pasajero directamente en el suelo (modelo).',
        'Más sitio para el suelo plano del maletero y para bajar el centro de gravedad.',
        'Permite subir kWh sin que aparezca el módulo de la cola (a 250 Wh/L caben ≈ 34 kWh en los dos módulos; a 200, solo ≈ 27,5; modelo).',
      ],
      desventajas: [
        'Un paquete compacto deja poco hueco para refrigerar y para que las celdas se hinchen: más caliente y menos vida.',
        'Por encima de 250 Wh/L en paquete estás en celdas de alta energía y cajas de automoción en serie, no en un prototipo (no he encontrado paquetes a medida publicados por encima).',
      ],
    },
    masBajo: {
      ventajas: [
        'LFP y celdas 21700 en caja ventilada: fáciles de montar, bien refrigeradas, seguras.',
        'Módulos más gruesos sirven de asiento: a 200 Wh/L el piloto va sentado sobre 9 cm de batería, que es exactamente lo que `altPil` espera.',
      ],
      desventajas: [
        '150 Wh/L: tercer módulo de 12 cm en la cola, menos maletero y peso detrás del eje (modelo).',
        '120 Wh/L: 225 L en total y un módulo de cola de 25 cm que puede salir en rojo en «Batería dentro de la carrocería (no asoma por la panza)» y chocar con el motor.',
        'Los asientos suben con el módulo (tope 9 cm): con menos Wh/L la cabeza del pasajero, que ya va a 0 cm en la configuración base, no gana nada.',
      ],
    },
    referencias: [
      'Nota del lateral: NMC en paquete 200–250 Wh/L (Aeromovil.tsx). Alternativas del catálogo: LFP 180 Wh/L, 21700 de alta energía 230 Wh/L (componentes.ts).',
      'Renault Twizy: batería bajo el asiento delantero (Wikipedia, Renault Twizy); su volumen no está publicado en las fuentes que he visto.',
      'No he encontrado una cifra pública de Wh/L del paquete del Zoe ZE50; el Aptera tampoco publica el volumen.',
    ],
    relacionados: ['kWh', 'whKg', 'altBat', 'altPil', 'altPas', 'clear'],
    comprobaciones: ['Batería: cabe en los módulos', 'Batería dentro de la carrocería (no asoma por la panza)', 'Módulo bajo el piloto de la batería dentro de la carrocería', 'Módulo bajo el pasajero de la batería dentro de la carrocería', 'Cúpula sobre la cabeza del pasajero'],
  },
  sol: {
    nombre: 'Sol al día (horas pico)',
    queEs: 'Horas solares pico al día: cuántas horas de sol «a tope» (1.000 W/m²) equivalen a la energía que recibe un metro cuadrado horizontal en un día medio. Es lo mismo que decir kWh/m² al día. De serie 4,5; rango 1,5–7.',
    porQueImporta: 'No cambia el coche: describe dónde vive. El modelo multiplica la superficie de paneles (2,9 m², 608 W de pico al 21 % de rendimiento) por estas horas, por un 70 % porque la carrocería no mira al cielo de plano y por un 85 % de pérdidas del regulador, y obtiene la energía solar de un día: 1,63 kWh con 4,5 h, que son 38 km a 100 km/h (más en ciudad). Con 2 h (invierno en el norte), 0,72 kWh y 17 km; con 6 h (verano en el sur), 2,17 kWh y 51 km. Un trayecto diario de 30 km, en Madrid, sale casi del sol de media anual; en Bilbao, no.',
    masAlto: {
      ventajas: [
        '6 h: 51 km al día de sol; 7 h (verano en Almería): 60 km (modelo). El coche de diario no se enchufa.',
        'Con el coche aparcado al sol semanas, la batería se mantiene cargada sola.',
      ],
      desventajas: [
        'Más de 5,5 h de media anual solo existen en el sureste y Canarias (Endesa: Almería y Murcia 5,5–6,0); en verano sí, todo el año no.',
        'A pleno sol la cúpula se calienta: los paneles en el techo ayudan a no hacer invernadero, pero habrá que ventilar.',
      ],
    },
    masBajo: {
      ventajas: [
        'Con 2 h el cálculo es honesto para el norte en invierno (AEMET, diciembre 2025: Santiago 1,15 kWh/m²·día, Madrid 1,58).',
        'Sirve para decidir si los 6,4 kg y ≈ 1.300 € de paneles compensan en tu sitio: con 1,5 h son 13 km al día.',
      ],
      desventajas: [
        '1,5–2 h: 13–17 km al día (modelo); el panel solo sirve para no perder carga parado.',
        'En invierno, además, el consumo sube (calefacción, luces) y la batería rinde menos: el balance real es peor que el del modelo.',
      ],
    },
    referencias: [
      'Horas solares pico medias por provincia: Almería y Murcia 5,5–6,0; Sevilla 5,4–5,9; Madrid 4,8–5,3; Barcelona 4,6–5,1; Bilbao 3,8–4,3; A Coruña 3,5–4,0 (blog de Endesa, «Hora solar pico: qué es y cómo se calcula»).',
      'AEMET, informe de radiación de diciembre de 2025: Madrid 1,58 kWh/m²·día; mínimo peninsular 1,15 (Santiago), máximo 2,30 (Almería); Canarias 3,2–3,8 (repositorio.aemet.es).',
      'Aptera: 700 W de paneles y «hasta 40 millas al día» (≈ 64 km) de sol en el sur de California (Green Car Reports, ene. 2023).',
    ],
    relacionados: ['mSolarM2', 'inicioSolar', 'kWh', 'speed', 'techo'],
  },
  mSolarM2: {
    nombre: 'Paneles solares por m²',
    queEs: 'Masa, en kilos por metro cuadrado, del laminado solar flexible (células de silicio dentro de una película que se pega sobre la carrocería). De serie 2,2 kg/m²; rango 1,2–3,5.',
    porQueImporta: 'El coche lleva 2,9 m² de paneles (capó, lomo a los lados de la cúpula y techo), así que de serie pesan 6,4 kg; al mínimo 3,5 kg y al máximo 10,1 kg. No cambia la energía que producen (eso lo fija el rendimiento, 21 %, y las horas de sol): solo el peso y, en la práctica, la durabilidad y el precio. Cada kg/m² son 2,9 kg en el coche, 1 km de autonomía a 100 km/h (modelo). Es un parámetro menor para la autonomía y mayor para la carrocería: un panel pesado sobre una piel de carbono de 1,8 mm pide refuerzo donde va pegado.',
    masAlto: {
      ventajas: [
        'Laminado PET con células PERC (2,6 kg/m²): un 40 % más barato (catálogo de componentes).',
        'Más capa protectora: aguanta mejor granizo, pisadas y lavados a presión.',
      ],
      desventajas: [
        '3,5 kg/m²: +3,7 kg en el coche, −1 km (modelo).',
        'Los laminados PET duran 5–8 años al sol frente a los 20+ de ETFE con células de contacto posterior (catálogo de componentes).',
        'Más peso en lo más alto del coche (el techo): el peor sitio para el centro de gravedad.',
      ],
    },
    masBajo: {
      ventajas: [
        'Laminado ultraligero sin capa trasera rígida (Solbian SP Flex, 1,5 kg/m²): −2 kg (catálogo de componentes).',
        'Más fino: sigue mejor la curva del techo y del lomo.',
      ],
      desventajas: [
        'El doble de precio por vatio (catálogo de componentes).',
        'Sin capa trasera, el panel depende de la rigidez de la carrocería y se marca con cualquier golpe.',
        'Por debajo de 1,2 kg/m² no hay laminados comerciales con células de silicio; es el suelo de `RANGOS_MASA_A1`.',
      ],
    },
    referencias: [
      'Solbian serie SP (células SunPower de contacto posterior, 23 %): SP 144 de 144 W, 1.490 × 546 mm, 1,9 kg y 2 mm → ≈ 177 W/m² y ≈ 2,3 kg/m² (datasheet SP, seapower.hr; el W/m² y el kg/m² son cuenta mía).',
      'Aptera: 700 W de paneles integrados (Green Car Reports, ene. 2023); la superficie y el peso no vienen en la noticia.',
      'Modelo: 2,9 m² de paneles, 608 W de pico al 21 % (`RENDIMIENTO_SOLAR`), 1,63 kWh/día con 4,5 h.',
    ],
    relacionados: ['sol', 'inicioSolar', 'espCarenado', 'matCarenado', 'techo'],
  },
  // ── Ocupantes y asientos ────────────────────────────────────────────────
  mOcc: {
    nombre: 'Masa por ocupante',
    queEs: 'Kilos que pesa cada persona a bordo (con ropa y lo que lleve encima). De serie 80 kg; rango 50–110. Se multiplica por las plazas (dos de serie).',
    porQueImporta: 'Los ocupantes son el 30 % del peso en marcha (160 de 542 kg): más que la batería. Como el modelo calcula consumo, aceleración, pendiente y carga por rueda con el coche cargado, este número mueve casi todo lo que hay en «Rendimiento»: con dos de 50 kg, 482 kg y 608 km a 100 km/h; con dos de 110 kg, 602 kg y 562 km, 0–100 en 10,5 s y un 5,7 % de pendiente (modelo). Para el reparto de masas y la viga, el piloto y el pasajero van justo entre los ejes, así que su peso carga los largueros y los neumáticos. La ley usa 75 kg para el conductor y 65 para el pasajero (Reglamento 168/2013, art. 5); 80 es un margen razonable.',
    masAlto: {
      ventajas: [
        'Diseñar con 100–110 kg es diseñar para todo el mundo con equipaje: el coche real nunca irá más cargado de lo que el modelo supone.',
        'Las holguras de cabeza, hombros y rodillas no dependen de este número (el maniquí tiene medidas fijas): solo cambia el peso.',
      ],
      desventajas: [
        '110 kg × 2: +60 kg en marcha, −22 km a 100 km/h, 209 kg por rueda (aún lejos de 290) y pendiente sostenida del 5,7 % (modelo).',
        'La viga va más cargada: el momento máximo en los largueros sube con cada kilo entre ejes.',
      ],
    },
    masBajo: {
      ventajas: [
        '50 kg: 608 km a 100 km/h y 7,3 % de pendiente (modelo).',
        'Sirve para ver el coche «vacío» de verdad: con «Monoplaza» y 50 kg te acercas a las 382 kg del vehículo solo.',
      ],
      desventajas: [
        'Diseñar con 50–60 kg es engañarse: las cifras de autonomía y aceleración no se cumplirán con un adulto medio.',
        'Para la homologación, el fabricante declara la carga útil; declarar poco limita legalmente a quién puede subir.',
      ],
    },
    referencias: [
      'Reglamento (UE) 168/2013, art. 5.2: la masa en orden de marcha se calcula sin el conductor (75 kg) ni el pasajero (65 kg) (legislation.gov.uk).',
      'Renault Twizy: 474 kg en vacío con batería y dos plazas en tándem (Wikipedia, Renault Twizy).',
      'Velomóvil Quest: 28 kg de vehículo; con un ciclista de 80 kg, el 74 % del conjunto es la persona (velomobiel.nl).',
    ],
    relacionados: ['plazas', 'mAsiento', 'kWh', 'kWPico', 'speed', 'spineD'],
    comprobaciones: ['Carga por neumático (índice 65: 290 kg)'],
  },
  mAsiento: {
    nombre: 'Un asiento',
    queEs: 'Masa de un asiento completo (carcasa tipo baquet reclinada, cojín, reposacabezas y su anclaje), en kilos. De serie 7 kg; rango 4–14. Van tantos como plazas.',
    porQueImporta: 'Los dos asientos pesan 14 kg (4 % del coche) y, como van justo entre los ejes, el modelo los suma a los ocupantes en la carga de los largueros. Entre 4 y 14 kg hay 20 kg en el coche (dos plazas), 8 km de autonomía a 100 km/h (modelo). El asiento es también lo que fija la postura (reclinado 39°/30°, reposacabezas casi vertical) y, con ella, la altura de la cúpula; pero eso lo mandan `recPil`, `recPas` y `altPil`, no el peso. Lo que sí decide este número es el material: fibra de vidrio (≈ 9 kg, 280 €), composite (7 kg, 650 €) o carbono (4 kg, 1.300 €).',
    masAlto: {
      ventajas: [
        'Baquet de fibra de vidrio de gama básica: ≈ 280 € frente a 650 € (catálogo de componentes).',
        'Más acolchado y más estructura: más cómodo en viajes largos y más tolerante a un cinturón de cuatro puntos mal tensado.',
      ],
      desventajas: [
        '14 kg por asiento: +14 kg en el coche, −5 km (modelo).',
        'Un asiento de 14 kg es un asiento de coche normal con raíles: no reclina a 39° ni deja la cabeza recta sin rehacerlo.',
      ],
    },
    masBajo: {
      ventajas: [
        'Baquet de carbono con reposacabezas: 4 kg, −6 kg en el coche, +3 km (modelo; catálogo de componentes).',
        'Carcasa rígida fina: deja más sitio al pasajero, que lleva las piernas a los lados del asiento del piloto.',
      ],
      desventajas: [
        '≈ 1.300 € por asiento en carbono (catálogo de componentes).',
        'Por debajo de 4 kg estás en asientos de kart (Tillett B6: 4,2 kg; B2 de carbono: 3 kg) sin cojín ni reposacabezas, que para un coche de carretera no sirven tal cual.',
      ],
    },
    referencias: [
      'Tillett (catálogo de asientos de coche): B6 4,2 kg, B5 4,5 kg, B6 Screamer 6 kg, B2 carbono 3 kg; +1 kg con paneles de tapizado (TILLET_CAR_BROCHURE.pdf, pesos ±10 %).',
      'Catálogo de componentes: baquet de composite 7 kg / 650 €; carbono 4 kg / 1.300 €; fibra de vidrio 9 kg / 280 € (componentes.ts).',
    ],
    relacionados: ['plazas', 'mOcc', 'recPil', 'recPas', 'altPil', 'altPas'],
  },
  mVarios: {
    nombre: 'Varios: cables, cargador, luces, cierres',
    queEs: 'Kilos de todo lo que no tiene deslizador propio: cargador a bordo (6 kg), cableado de alta tensión con contactores y fusible (5), herrajes de las puertas (4), de los maleteros (2), luces y retrovisores (2), y lo que queda (6 kg de serie) para pantalla, cinturones, extintor, bomba y radiador de refrigeración, cableado de 12 V, claxon. De serie 25 kg; rango 12–45.',
    porQueImporta: 'Es el cajón de sastre, y en un prototipo es donde se esconde el peso que nadie contó: en coches reales el «resto» acaba siendo el 10–15 % del total. El modelo pone 25 kg (6,5 % de 382); de 12 a 45 kg hay 33 kg, 13 km de autonomía a 100 km/h (modelo). Si escribes el peso real de cargador, cableado, puertas, maleteros o luces en su ficha de componente, «Varios» se ajusta solo (`masaFija`). Es el parámetro que más conviene subir cuando el coche empieza a existir de verdad.',
    masAlto: {
      ventajas: [
        '45 kg es una cifra prudente para un primer prototipo con cableado de taller, soportes improvisados y herramientas a bordo: el peso final no sorprenderá.',
        'Deja sitio para lo que la homologación añade: segundo circuito de freno, limpiaparabrisas, claxon homologado, catadióptricos, extintor.',
      ],
      desventajas: [
        '45 kg: +20 kg en el coche, −7 km a 100 km/h (modelo).',
        'Si el valor es alto «por si acaso», la cifra de peso deja de servir para tomar decisiones sobre el resto.',
      ],
    },
    masBajo: {
      ventajas: [
        '12 kg: −13 kg, +6 km (modelo). Es lo que da un cargador con DC-DC integrado (5 kg), cierres manuales en vez de eléctricos (3,6 kg) y cámaras en vez de retrovisores (1,4 kg), según el catálogo de componentes.',
        'Obliga a pesar cada pieza pequeña en vez de dejarla en el cajón: es la única forma de que el peso total sea de verdad.',
      ],
      desventajas: [
        'Por debajo de los 19 kg de las cinco piezas fijas (cargador, cableado, puertas, maleteros, luces) el resto sale negativo: el modelo lo recorta a cero y el peso real se queda sin contar.',
        'Quitar peso aquí suele ser quitar seguridad (contactores, fusible, precarga, interbloqueo de alta tensión): el cableado HV es «sin esto el vehículo no es seguro ni legal» (ficha del cableado).',
      ],
    },
    referencias: [
      'Masas fijas del modelo: cargador 6, cableado HV 5, puertas 4, maleteros 2, luces 2 kg (`MASAS_FIJAS_A1`, geometria.ts); fichas con precio en componentes.ts (cargador 650 €, cableado HV 600 €, puertas 380 €, maleteros 150 €, luces 320 €, equipo 600 €).',
      'Renault Twizy: cargador a bordo de 2,3 kW (evspecs.org); su peso no está publicado en las fuentes que he visto.',
    ],
    relacionados: ['mInversor', 'mMotor', 'kWPico', 'puerta'],
  },
};
