import type { Explicaciones } from './tipos';

// ============================================================================
// Explicaciones de los parámetros de FORMA del Aeromóvil 1 (2026-11-07)
// ============================================================================
// Eugenio: «al pinchar en un parámetro, que se abra un cuadro que explique más
// sobre ese parámetro, la importancia que tiene y las ventajas y desventajas
// de una configuración más alta o más baja».
//
// Cómo se escribió. Las cifras «del modelo» salen de ejecutar `crearModelo` +
// `calcular` con `PARAMETROS_A1` (3,94 × 1,55 × 1,11 m, batalla 2,05, vías
// 1,22/1,00, bajos 19 cm) y moviendo cada parámetro de uno en uno: área
// frontal 1,11 m², Cd 0,153, CdA 0,170 m², 42,5 Wh/km a 100 km/h, 382 kg en
// vacío. Son estimaciones del propio modelo (el Cd es una fórmula orientativa,
// no un túnel de viento): sirven para comparar, no para prometer.
//
// Las cifras de coches reales llevan su fuente entre paréntesis:
//   · Twizy: ficha técnica en auto-data.net (Renault Twizy ZE 6.1 kWh).
//   · VW XL1: Wikipedia, «Volkswagen 1-litre car» (versión de producción 2013).
//   · Aptera: Wikipedia, «Aptera (solar electric vehicle)» (2023) y Green Car
//     Reports, «Aptera 2e full production specs released» (2009).
//   · SZEmission: datos publicados por el SZEnergy Team (Univ. Széchenyi) y
//     artículo de SciEngineer sobre la Shell Eco-marathon Europe 2026.
//   · Twike: twike.com (FAQ «How aerodynamic is the TWIKE 5») y Wikipedia.
//   · Velomóviles: medición comparativa en túnel de viento de la Ostfalia
//     (HUM, «Velomobil Vergleichsmessung») y ficha del Quest en velomobiel.nl.
//   · Homologación: Reglamento (UE) 168/2013, anexo I (texto en legislation.gov.uk).
//   · Shell Eco-marathon UrbanConcept: página del equipo H2polito (Politecnico
//     di Torino) y ficha del SwRI; la medida de la puerta (500 × 800 mm) es la
//     que usa el modelo, tomada del comentario del código y no verificada en
//     el reglamento.
// Lo que no tiene fuente va como razonamiento, no como dato.

const C = {
  cabezaPil: 'Cúpula sobre la cabeza del piloto',
  cabezaPas: 'Cúpula sobre la cabeza del pasajero',
  hombrosPil: 'Hombros del piloto a la cúpula',
  hombrosPas: 'Hombros del pasajero a la cúpula',
  rodillasPil: 'Rodillas del piloto al salpicadero y la carrocería',
  rodillasPas: 'Rodillas del pasajero al salpicadero y la carrocería',
  piesPil: 'Pies del piloto dentro del morro',
  piesPas: 'Pies del pasajero dentro del morro',
  volante: 'Volante a la cúpula',
  ruedaF: 'Rueda delantera girada 22° y hundida',
  ruedaR: 'Rueda trasera hundida',
  torretas: 'Torretas de suspensión dentro de la carrocería',
  arco: 'Arco de seguridad bajo la cúpula',
  batPil: 'Módulo bajo el piloto de la batería dentro de la carrocería',
  batPas: 'Módulo bajo el pasajero de la batería dentro de la carrocería',
  batCabe: 'Batería: cabe en los módulos',
  batPanza: 'Batería dentro de la carrocería (no asoma por la panza)',
  motor: 'Motor, reductora, inversor y cargador dentro de la carrocería',
  puertaAncho: 'Hueco de la puerta: ancho (mín. 0,50 m)',
  puertaAlto: 'Hueco de la puerta: alto (mín. 0,80 m)',
  vmax: 'Velocidad máxima sostenida (objetivo 140 km/h)',
  cargaNeum: 'Carga por neumático (índice 65: 290 kg)',
};

export const EXPLICACIONES: Explicaciones = {
  // ── Carrocería y cúpula ───────────────────────────────────────────────────
  L: {
    nombre: 'Largo total',
    queEs: 'Lo que mide el coche de la punta del morro a la punta de la cola, en metros. Todo lo demás que se expresa «en fracción del largo» (voladizo del morro, dónde empieza el parabrisas, dónde acaba la cúpula) se estira o se encoge con él.',
    porQueImporta: 'El largo es el parámetro que más decide cuánto espacio hay dentro: con el mismo ancho y alto, 20 cm más de coche son un 5 % más de volumen interior (2,50 → 2,63 m³ en el modelo) y 50 litros más de maletero trasero (196 → 247 L). Al aire casi no le importa: la resistencia aerodinámica depende sobre todo del área frontal (la «sombra» que proyecta el coche de frente) y del Cd (el coeficiente aerodinámico: cuánto frena el aire a esa sombra), y el largo no cambia ninguno de los dos; un cuerpo más alargado en proporción suele tener incluso mejor Cd. Lo que sí sube es el peso (unos 2,3 kg por cada 20 cm de carrocería de carbono) y, sobre todo, la homologación: el Reglamento (UE) 168/2013 limita los cuadriciclos L7e a 4,0 m de largo en general y a 3,7 m los L7e-C (los «cuadrimóviles» cerrados, la clase del Twizy). Con 3,94 m el Aeromóvil 1 no cabe como L7e-C; tendría que ir como L7e-A (hasta 4,0 m, sin el tope de 90 km/h de los L7e-C). Esa es una decisión de Eugenio, no del modelo.',
    masAlto: {
      ventajas: [
        'Más sitio detrás: el espacio de cama/maletero tras el piloto pasa de 0,97 a 1,08 m de largo con 20 cm más de coche (modelo).',
        'Maleteros más grandes: delantero 75 → 89 L y trasero 196 → 247 L con L = 4,14 m (modelo).',
        'Más techo para paneles solares: +0,14 m² (2,90 → 3,04 m²), unos 2 km más al día de sol (modelo).',
        'La cola puede cerrarse más despacio, que es lo que de verdad baja el Cd en un cuerpo de gota (el modelo no premia esto todavía: su Cd apenas cambia con L).',
      ],
      desventajas: [
        'Peso: +2,4 kg por cada 20 cm (carrocería de carbono de 1,8 mm) y algo más de chasis que el modelo no cuenta.',
        'Homologación: por encima de 4,00 m ya no es un cuadriciclo L7e de ningún tipo (Reglamento 168/2013, anexo I); el deslizador llega a 4,40 m, pero de 4,00 en adelante es otro vehículo.',
        'Aparcar y maniobrar: con el mismo giro de ruedas el radio de giro crece con la batalla, y una carrocería más larga sobresale más en las curvas.',
        'Más lámina de carbono que laminar y un molde más grande: el coste del molde crece con la superficie, no con el volumen.',
      ],
    },
    masBajo: {
      ventajas: [
        'Ligereza y coste: −2,2 kg y menos carbono con 3,74 m (modelo).',
        'Entra en la clase L7e-C (≤ 3,70 m): la del Twizy, con homologación más sencilla y conocida.',
        'Más fácil de aparcar; el SZEmission original, del que sale la forma, mide unos 2,8 m.',
      ],
      desventajas: [
        'Con 3,74 m el motor, la reductora y el inversor ya no caben en la cola: la comprobación pasa de −0,7 a −3,6 cm (modelo).',
        'Maletero trasero 196 → 150 L y espacio de cama 0,97 → 0,88 m (modelo).',
        'La rueda trasera hundida roza más (−12,4 → −15,7 cm) porque la cola se estrecha antes sobre ella (modelo).',
        '−0,14 m² de panel solar.',
      ],
    },
    referencias: [
      'Renault Twizy: 2,338 m (ficha técnica, auto-data.net).',
      'VW XL1: 3,888 m (Wikipedia, «Volkswagen 1-litre car»).',
      'Aptera 2023: 4,496 m (Wikipedia); Aptera 2e de 2009: 173 pulgadas = 4,39 m (Green Car Reports).',
      'SZEmission: ≈ 2,8 m, estimado por proporción en las fotos (no publicado por el equipo).',
      'Velomóvil Quest: 2,85 m (velomobiel.nl).',
      'Límite L7e: 4,00 m en general, 3,70 m para L7e-C (Reglamento (UE) 168/2013, anexo I). Shell Eco-marathon UrbanConcept: entre 2,20 y 3,50 m (H2polito).',
    ],
    relacionados: ['B', 'fMorro', 'posMorro', 'cupX0', 'cupX1', 'parabrisas', 'W', 'H'],
    comprobaciones: [C.motor, C.ruedaR, C.ruedaF, C.cabezaPil, C.puertaAlto],
  },

  fMorro: {
    nombre: 'Voladizo del morro',
    queEs: 'Qué parte del largo total queda por delante del eje delantero, en fracción (0,22 = el 22 % del largo; con 3,94 m son 0,87 m de la punta del morro al centro de las ruedas delanteras). Como la batalla es otro deslizador, lo que sobra al final del coche es la cola: largo − morro − batalla = 1,02 m de voladizo trasero.',
    porQueImporta: 'Reparte el largo del coche entre el morro y la cola sin cambiar el total. Delante del eje van los pies del piloto, el maletero delantero bajo el capó y la cremallera de dirección; detrás del eje trasero van el motor, la reductora, el inversor y el maletero trasero. Mover el eje delantero hacia atrás (más voladizo) da sitio delante y lo quita detrás, y además cambia cómo encaja la rueda delantera en el morro: donde el morro ya se ha estrechado la rueda girada no cabe. En un coche real el voladizo también fija el ángulo de ataque (lo que raspa en un badén) y el reparto de pesos sobre cada eje.',
    masAlto: {
      ventajas: [
        'Maletero delantero mucho mayor: 75 → 123 L con 26 % (modelo), porque el capó queda más lejos de los pies.',
        'La rueda delantera girada a 22° cabe mejor en una zona más ancha del morro: de −9,1 a −4,6 cm (modelo).',
        'Las rodillas del piloto ganan sitio bajo el salpicadero (−4,1 → −2,7 cm) y la cabeza baja 1 cm respecto al techo, porque el piloto queda bajo una parte más alta de la cúpula (modelo).',
      ],
      desventajas: [
        'Se come la cola: maletero trasero 196 → 145 L y el motor ya no cabe (−0,7 → −4,6 cm) con 26 % (modelo).',
        'La rueda trasera hundida roza mucho más (−12,4 → −17,1 cm): la cola que queda es más corta y se estrecha antes (modelo).',
        'El espacio de cama detrás del piloto se acorta de 0,97 a 0,81 m (modelo).',
        'Más morro por delante del eje = más momento en un choque frontal y peor ángulo de ataque en rampas.',
      ],
    },
    masBajo: {
      ventajas: [
        'La cola gana: maletero trasero 196 → 261 L con 18 % y el motor cabe con 1,8 cm de margen (modelo).',
        'La rueda trasera hundida pasa de −12,4 a −8,9 cm (modelo).',
        'Las ruedas delanteras más cerca de la punta = menos voladizo que raspe en badenes y rampas de garaje.',
      ],
      desventajas: [
        'La rueda delantera girada se clava en el morro estrecho: −9,1 → −15,9 cm (modelo).',
        'Maletero delantero 75 → 44 L; las rodillas del piloto pierden 2 cm y el volante queda a 1,5 cm de la cúpula (modelo).',
        'Las torretas de la suspensión delantera asoman más por la carrocería (−7,5 → −9,5 cm) y el módulo de batería bajo el piloto queda a 1,2 cm de la piel (modelo).',
      ],
    },
    referencias: [
      'Renault Twizy: largo 2,338 m y batalla 1,686 m, así que los dos voladizos suman 0,65 m (ficha técnica, auto-data.net); el reparto delante/detrás no lo publica la ficha.',
      'VW XL1: largo 3,888 m y batalla 2,225 m, voladizos de 1,66 m en total (Wikipedia).',
      'Aptera 2023: 4,496 m con batalla 2,743 m; 1,75 m de voladizos en total (Wikipedia).',
      'Garaje del visor: el eje delantero se coloca a (largo − batalla)/2 del morro, es decir, voladizos iguales, para los coches del catálogo.',
    ],
    relacionados: ['L', 'B', 'posMorro', 'morroA1', 'xPil', 'pedDist', 'viaF'],
    comprobaciones: [C.ruedaF, C.ruedaR, C.motor, C.rodillasPil, C.piesPil, C.torretas, C.batPil, C.volante],
  },

  W: {
    nombre: 'Ancho máximo',
    queEs: 'El ancho de la carrocería en su punto más ancho, en metros, de costado a costado y sin retrovisores. Las ruedas tienen que quedar dentro: con vía delantera de 1,22 m y neumáticos de 12,5 cm, 1,55 m deja unos 10 cm de piel y hueco por fuera de cada rueda.',
    porQueImporta: 'El ancho multiplica directamente el área frontal, que es la mitad de la resistencia aerodinámica (la otra mitad es el Cd, el coeficiente que dice cuánto frena el aire a esa área). En el modelo, cada 10 cm de ancho son ≈ 5,9 % de área frontal (1,11 → 1,18 m²) y ≈ 3 % de consumo a 100 km/h (42,5 → 43,8 Wh/km), unos 17 km de autonomía. Pero el ancho es también lo que mete a dos ruedas, un piloto con los codos sueltos y una puerta por la que se entra. Y es un límite legal: 1,50 m para los L7e-C y 2,00 m para el resto de L7e (Reglamento 168/2013); 1,55 m deja al Aeromóvil 1 fuera de la clase del Twizy.',
    masAlto: {
      ventajas: [
        'Las ruedas caben mejor: la delantera girada pasa de −9,1 a −4,8 cm con 1,65 m (modelo).',
        'Más sitio para los hombros, los codos y el espacio de cama (0,60 → 0,64 m de ancho útil con 1,65 m).',
        'Más superficie de lomo para paneles solares: +0,17 m², unos 1 km más al día (modelo).',
        'Más vía posible = más estabilidad en curva (ver «Vía delantera»).',
      ],
      desventajas: [
        '+5,9 % de área frontal y +3,1 % de consumo por cada 10 cm (modelo).',
        '+1,9 kg de carrocería por cada 10 cm (modelo).',
        'A partir de 1,50 m ya no es L7e-C; a partir de 2,00 m ya no es L7e (Reglamento 168/2013). El deslizador llega a 2,00 m.',
        'Peor entre coches y en carriles bici o de moto; el Twizy mide 1,24 m precisamente para colarse.',
      ],
    },
    masBajo: {
      ventajas: [
        '−5,9 % de área frontal y −3 % de consumo por cada 10 cm; +18 km de autonomía a 100 km/h (modelo).',
        '−1,9 kg de carrocería por cada 10 cm.',
        'Por debajo de 1,50 m entra en L7e-C, la clase del Twizy.',
        'Es la variable más barata para ganar eficiencia sin tocar la mecánica.',
      ],
      desventajas: [
        'Las ruedas se salen: la delantera girada pasa a −13,5 cm y la trasera a −13,7 cm con 1,45 m (modelo). Hay que estrechar las vías a la vez.',
        'Menos hombros: con un piloto de 50 cm de ancho de asiento y dos costados, cada centímetro cuenta.',
        'La puerta de gaviota necesita ancho de techo para su bisagra; la cabina (`cupW`) es una fracción de este ancho, así que se estrecha con él.',
        '−0,17 m² de panel solar por cada 10 cm.',
      ],
    },
    referencias: [
      'Renault Twizy: 1,237 m sin retrovisores, 1,381 m con ellos (ficha técnica, auto-data.net).',
      'VW XL1: 1,666 m, área frontal 1,50 m² (Wikipedia).',
      'Aptera 2023: 2,225 m (Wikipedia); Aptera 2e: 91 pulgadas = 2,31 m (Green Car Reports). Las ruedas van fuera del cuerpo, en carenados propios.',
      'Twike 5: 1,55 m (Wikipedia, «Twike»).',
      'Velomóvil Quest: 0,765 m (velomobiel.nl); Milan SL: área frontal 0,393 m² (túnel de viento Ostfalia/HUM).',
      'Límites: L7e-C ≤ 1,50 m, L7e ≤ 2,00 m (Reglamento 168/2013, anexo I); Shell Eco-marathon UrbanConcept 1,20–1,30 m (H2polito).',
    ],
    relacionados: ['H', 'viaF', 'viaR', 'cupW', 'nU', 'nL', 'neumF', 'neumR'],
    comprobaciones: [C.ruedaF, C.ruedaR, C.torretas, C.hombrosPil, C.hombrosPas, C.puertaAncho],
  },

  H: {
    nombre: 'Alto total (techo de la cúpula)',
    queEs: 'La altura del punto más alto del coche sobre el suelo, en metros: el borde de arriba del parabrisas, que es donde la cúpula hace pico. Incluye los bajos (la altura libre) y la carrocería, porque la cubierta se define como fracción de esta altura.',
    porQueImporta: 'Es el parámetro con más efecto sobre la aerodinámica de todo el lateral: cada 10 cm de altura son ≈ 10,5 % de área frontal (1,11 → 1,23 m²) y ≈ 5,3 % de consumo a 100 km/h (42,5 → 44,8 Wh/km), unos 30 km de autonomía (modelo). A 100 km/h el aire es cerca de dos tercios de la resistencia que vence el motor (2,2 kW de 3,5 kW en el modelo), así que lo que se gana aquí se nota en cada viaje. La contrapartida es la cabeza: la cúpula tiene que pasar 3 cm por encima del piloto reclinado 39° y del pasajero a 30°, y con 1,11 m el modelo está justo (3,0 cm sobre el piloto, 0 sobre el pasajero). Subir el alto también sube la cubierta (es una fracción) y con ella las rodillas y las torretas ganan sitio.',
    masAlto: {
      ventajas: [
        'Cabeza y rodillas: con 1,21 m las rodillas del piloto pasan de −4,1 a +1,9 cm, la cabeza del pasajero de 0 a 0,9 cm y las torretas de suspensión de −7,5 a +1,0 cm (modelo).',
        'La puerta se hace más alta: el hueco pasa de −20 a −10 cm respecto al mínimo de 0,80 m (modelo).',
        'Más espacio de cama en vertical (0,57 → 0,64 m) y maleteros mayores (modelo).',
        'Entrar y salir cuesta menos; el XL1 (1,15 m) es famoso por lo que cuesta.',
      ],
      desventajas: [
        '+10,5 % de área frontal y +5,4 % de consumo por cada 10 cm; −30 km de autonomía a 100 km/h (modelo).',
        '+1,9 kg de carrocería y cúpula por cada 10 cm (modelo).',
        'El centro de gravedad sube con el piloto y el techo: menos margen antes de volcar en curva (ver vías).',
        'Velocidad sostenida con 15 kW: 170 → 165 km/h (modelo).',
      ],
    },
    masBajo: {
      ventajas: [
        '−10,5 % de área frontal y −5,2 % de consumo por cada 10 cm; +32 km de autonomía (modelo).',
        '−1,8 kg (modelo). Velocidad sostenida 170 → 175 km/h.',
        'Centro de gravedad más bajo y menos viento lateral que empuje.',
      ],
      desventajas: [
        'Con 1,01 m la cúpula toca la cabeza del piloto (0 cm) y la del pasajero, el volante queda a 1,2 cm de la cúpula y las rodillas a −10,1 cm del salpicadero (modelo).',
        'Las torretas de suspensión asoman −15,8 cm por encima de la carrocería: habría que bajar también la suspensión (modelo).',
        'La puerta queda a −29,5 cm del mínimo de 0,80 m: se entra tumbándose (modelo).',
        'Visibilidad: con los ojos a menos de 1 m los coches de alrededor tapan todo; los velomóviles (0,87 m) sufren exactamente eso.',
      ],
    },
    referencias: [
      'Renault Twizy: 1,454 m (ficha técnica, auto-data.net).',
      'VW XL1: 1,153 m (Wikipedia).',
      'Aptera 2023: 1,422 m (Wikipedia); Aptera 2e: 53 pulgadas = 1,35 m (Green Car Reports).',
      'SZEmission: ≈ 1,03 m, a escala de las fotos (no publicado); el Aeromóvil 1 nació como «un 30 % mayor» = 1,34 m, y Eugenio lo bajó después a 1,11 m.',
      'Velomóvil Quest: 0,87 m (velomobiel.nl).',
      'Shell Eco-marathon UrbanConcept: entre 1,00 y 1,30 m (H2polito). L7e: ≤ 2,50 m (Reglamento 168/2013).',
    ],
    relacionados: ['deck', 'clear', 'W', 'recPil', 'recPas', 'altPil', 'altPas', 'techo', 'parabrisas'],
    comprobaciones: [C.cabezaPil, C.cabezaPas, C.rodillasPil, C.volante, C.torretas, C.puertaAlto, C.arco, C.vmax],
  },

  deck: {
    nombre: 'Altura de la cubierta',
    queEs: 'A qué altura del suelo está la cubierta, el «lomo» de la carrocería baja sobre el que se apoya la cúpula de cristal, en fracción del alto total (0,622 × 1,11 m = 0,69 m). El lateral lo enseña ya en metros. Por debajo es carrocería opaca (carbono con paneles solares); por encima, cúpula.',
    porQueImporta: 'Reparte la altura total entre dos piezas distintas: la carrocería, que es la que esconde ruedas, suspensión, batería, motor y las piernas, y la cúpula, que es cristal y techo solar. Subir la cubierta hace la carrocería más alta y la cúpula más baja y plana, con el mismo alto total. Como la cúpula es más estrecha que la carrocería (0,81 m frente a 1,55 m), subir la cubierta añade área frontal: cada 5 cm son ≈ 4 % de área y 2 % de consumo (modelo). A cambio todo lo que va dentro de la carrocería gana sitio: con 5 cm más las rodillas del piloto pasan de −4,1 a +1,2 cm y las torretas de la suspensión de −7,5 a +0,1 cm.',
    masAlto: {
      ventajas: [
        'Rodillas, torretas y rueda trasera caben: −4,1 → +1,2 cm, −7,5 → +0,1 cm y −12,4 → −6,6 cm con 5 cm más (modelo).',
        'Menos cristal (−6 %) y más carrocería opaca: menos efecto invernadero y −0,08 m² de policarbonato (modelo).',
        'Lomo más alto = cintura más alta = el piloto va más «dentro» (mejor en un choque lateral y psicológicamente).',
        'Maleteros algo mayores (75 → 84 L delante, 196 → 215 L detrás).',
      ],
      desventajas: [
        '+4 % de área frontal y +2 % de consumo por cada 5 cm (modelo).',
        'La cúpula se aplana: el parabrisas arranca más alto y queda más tumbado, y el hueco de la puerta pierde altura de cristal (sigue a −18,8 cm).',
        'Menos visibilidad lateral: la ventanilla es lo que queda entre la cubierta y el techo.',
      ],
    },
    masBajo: {
      ventajas: [
        '−4 % de área frontal y −2 % de consumo por cada 5 cm (modelo); +12 km de autonomía.',
        'Cúpula más alta y más luminosa, ventanillas mayores, cintura baja como en el SZEmission (cubierta al 63 % de su altura).',
        'Más superficie de cristal donde Eugenio quiere ver las piernas desde fuera.',
      ],
      desventajas: [
        'Todo lo mecánico asoma: rodillas −9,4 cm, torretas −14,9 cm, rueda trasera hundida −19,3 cm con 5 cm menos (modelo).',
        'La batería y el suelo no bajan con la cubierta (dependen de los bajos), así que el hueco entre suelo y lomo se estrecha.',
        '+6 % de cristal: más peso de policarbonato y más calor dentro.',
      ],
    },
    referencias: [
      'SZEmission: cubierta a 0,63 de su alto total, medido en las fotos por el bot evaluador (no es dato publicado).',
      'VW XL1: la cintura va alta y el cristal es una franja estrecha; el Aptera lleva la cintura baja y mucho cristal. No hay cifra publicada de «altura de cintura» para ninguno de los dos.',
      'Twizy: no tiene cúpula; sus ventanillas son opcionales y la carrocería llega hasta el techo (ficha Renault).',
    ],
    relacionados: ['H', 'clear', 'cupW', 'techoW', 'cupX0', 'parabrisas', 'nU'],
    comprobaciones: [C.rodillasPil, C.torretas, C.ruedaR, C.ruedaF, C.motor, C.puertaAlto, C.cabezaPil],
  },

  morroA1: {
    nombre: 'Redondez del morro',
    queEs: 'La forma de la punta delantera entre la nariz y la sección máxima: de 0 a 1 sin unidades. 0 es ojival (como una bala: la punta sube en cuña, como el SZEmission), 0,7 es una elipse llena (como el Aptera) y 1 es roma (como media esfera). Técnicamente es el exponente de la superelipse con la que crecen el alto y el ancho desde la punta.',
    porQueImporta: 'En un cuerpo que va a 100 km/h el morro casi nunca es el problema: el aire se abre con facilidad delante y lo que cuesta es cerrarlo detrás. Por eso un morro redondeado (0,5–0,7) es lo habitual en todos los coches de bajo Cd, y una punta afilada sólo sirve a velocidades supersónicas. El modelo penaliza alejarse de 0,5 con +0,012 de Cd por unidad de distancia (0 → +1,6 %, 1 → +1,6 % de Cd). Lo que sí cambia mucho es el volumen del morro: un morro lleno tiene sitio para el maletero delantero (56 L en cuña, 130 L romo) y para la rueda delantera girada (−13,7 cm en cuña, −2,1 cm romo). También es la pieza azul marino de la punta, donde van el logo y la toma de carga.',
    masAlto: {
      ventajas: [
        'Maletero delantero: 75 → 113 L con 0,7 y 130 L con 1 (modelo).',
        'La rueda delantera girada a 22° cabe casi: −9,1 → −3,7 cm (0,7) y −2,1 cm (1) (modelo).',
        'Rodillas del piloto: −4,1 → −2,4 cm; torretas −7,5 → −6,3 cm (modelo).',
        'Más tolerante a los golpes de aparcamiento y mejor para peatones (sin arista).',
      ],
      desventajas: [
        'Por encima de 0,7 el Cd vuelve a subir: 1 = +1,6 % de Cd y +0,4 Wh/km (modelo).',
        '+1,2 kg (0,7) o +1,6 kg (1) de carrocería, porque hay más piel delante (modelo).',
        'Un morro romo pierde el aire de «gota» que Eugenio pidió; el modelo sólo redondea, no cambia la planta.',
      ],
    },
    masBajo: {
      ventajas: [
        '−0,9 kg de piel con 0 (modelo).',
        'Es la forma de las fotos del SZEmission, el coche con Cd 0,1365 del que sale todo.',
        'Faros en rendija y capó bajo: mejor visión del suelo justo delante.',
      ],
      desventajas: [
        'La cuña se come el maletero delantero (75 → 56 L) y la rueda girada roza −13,7 cm (modelo).',
        '+1,6 % de Cd y +0,4 Wh/km con 0 (modelo): la arista hace que el aire se desprenda al primer bache.',
        'Rodillas del piloto −5,4 cm, torretas −8,7 cm (modelo).',
      ],
    },
    referencias: [
      'SZEmission: morro en cuña recta a ≈ 26° hasta la base del parabrisas, leído en las fotos por el bot evaluador (sin dato publicado).',
      'Aptera 2023: morro elíptico, Cd 0,13 (Wikipedia); su forma es la que Eugenio pidió copiar (2026-11-06).',
      'VW XL1: morro redondeado y bajo, Cd 0,186–0,189 (Wikipedia).',
      'Renault Twizy: morro vertical y romo, Cd 0,64 (ficha técnica, auto-data.net): es el precio de no tener morro.',
    ],
    relacionados: ['posMorro', 'fMorro', 'colaA1', 'nU', 'nL'],
    comprobaciones: [C.ruedaF, C.rodillasPil, C.torretas, C.piesPil],
  },

  posMorro: {
    nombre: 'Largo del morro (hasta la sección máxima)',
    queEs: 'Dónde acaba la pieza del morro y empieza la carrocería de las fotos del SZEmission, en fracción del largo sumada a 0,32 (−0,02 por defecto = el morro termina a 0,30 × 3,94 = 1,18 m de la punta). El lateral lo enseña en metros. De la punta a ese punto, el alto y el ancho crecen con la curva de «Redondez del morro»; a partir de él, mandan las curvas medidas en las fotos.',
    porQueImporta: 'Decide cuánto coche se dedica a abrir el aire. Un morro largo crece despacio y da la gota «homogénea» que Eugenio quiere; pero como todo lo que hay dentro (rueda delantera, torretas, pies, batería del piloto) está fijado por el eje y no por el morro, alargar el morro hace que esas piezas caigan en una zona todavía estrecha. Con +0,10 (morro de 1,65 m) la rueda delantera girada pasa de −9,1 a −17,7 cm y la batería bajo el piloto asoma por la panza −1,3 cm. En Cd el modelo no distingue: la fórmula no mira dónde está la sección máxima (sólo el alargamiento total); en la realidad, mover la sección máxima hacia atrás suele bajar algo la resistencia de forma y subir el riesgo de desprendimiento en la cola, que queda más corta.',
    masAlto: {
      ventajas: [
        'Curva más tendida y una gota más pura en planta y alzado.',
        '−1,5 kg de carrocería con +0,10, porque la piel del morro es más pequeña en promedio (modelo).',
        'Capó más bajo delante de la base del parabrisas: mejor visión del suelo inmediato.',
      ],
      desventajas: [
        'La rueda delantera girada roza −17,7 cm y las torretas −11,8 cm con +0,10 (modelo).',
        'Maletero delantero 75 → 54 L; rodillas del piloto −7,0 cm (modelo).',
        'La batería bajo el piloto asoma por la panza (−1,3 cm) donde el fondo aún sube hacia la punta (modelo).',
        '−0,13 m² de panel solar en el capó.',
      ],
    },
    masBajo: {
      ventajas: [
        'Todo cabe antes: rueda girada −9,1 → −4,6 cm, rodillas −4,1 → −0,4 cm, torretas −7,5 → −3,2 cm con −0,10 (modelo).',
        'Maletero delantero 75 → 99 L (modelo).',
        '+0,03 m² de capó solar.',
      ],
      desventajas: [
        'Morro más abultado: +0,8 kg (modelo) y la gota se vuelve «cabezona»; el modelo no lo penaliza en Cd, pero una sección máxima muy adelantada deja una cola larguísima que es cara de laminar.',
        'El capó sube antes y tapa la carretera cercana; el salpicadero queda más alto.',
      ],
    },
    referencias: [
      'SZEmission: ancho máximo en u ≈ 0,36 del largo (fotos, bot evaluador); el Aeromóvil 1 lo lleva a 0,30.',
      'Cuerpos de mínima resistencia (perfiles laminares NACA 66, fuselajes de planeador): el espesor máximo se pone entre el 40 y el 60 % del largo; en coches con ruedas y cabina queda más adelante porque la cabina obliga. Esto es razonamiento de manual, no una cifra medida en el Aeromóvil.',
    ],
    relacionados: ['morroA1', 'fMorro', 'L', 'cupX0', 'colaA1'],
    comprobaciones: [C.ruedaF, C.torretas, C.rodillasPil, C.batPil, C.batPanza, C.piesPil],
  },

  colaA1: {
    nombre: 'Forma de la cola',
    queEs: 'Cómo se estrecha la planta (vista desde arriba) detrás del punto más ancho: de 0 a 1 sin unidades. 0 es afilada, 0,5 la curva de las fotos del SZEmission y 1 «llena», con la cola casi tan ancha como el cuerpo hasta el final. Es el exponente con el que se eleva la curva de anchos medida en las fotos.',
    porQueImporta: 'La cola es donde se gana o se pierde el Cd. El aire que se ha abierto en el morro tiene que volver a juntarse despacio detrás; si la carrocería se cierra demasiado deprisa, el flujo se despega y deja una estela ancha que frena como un paracaídas. Una cola llena (1) es justo eso: el modelo le suma +4,9 % de Cd y +2,9 % de consumo. Una cola afilada (0) es aerodinámicamente limpia, pero quita volumen al maletero trasero y pone en peligro la rueda trasera, que queda dentro de una carrocería ya estrecha. El punto medio es la forma del SZEmission, que tiene 0,1365 de Cd publicado.',
    masAlto: {
      ventajas: [
        'Maletero trasero 196 → 212 L (modelo).',
        'La rueda trasera hundida roza menos: −12,4 → −11,4 cm (modelo).',
        '+0,10 m² de lomo para paneles solares (modelo).',
        'Cola ancha = sitio para una luz trasera a lo ancho (como la barra del XL1) y para el motor transversal.',
      ],
      desventajas: [
        '+4,9 % de Cd (0,153 → 0,161) y +1,3 Wh/km a 100 km/h; −17 km de autonomía (modelo).',
        '+1,3 kg de carrocería (modelo).',
        'Velocidad sostenida 170 → 167 km/h (modelo).',
      ],
    },
    masBajo: {
      ventajas: [
        'Cola más limpia; el modelo no premia por debajo de 0,5 (ya está en el mínimo de su fórmula), pero tampoco castiga.',
        '−1,0 kg de carrocería (modelo).',
        'Es la forma de gota que pide la intuición: punta de lágrima.',
      ],
      desventajas: [
        'Maletero trasero 196 → 182 L y −0,11 m² de solar (modelo).',
        'La rueda trasera hundida roza −13,5 cm (modelo): la piel se estrecha sobre ella.',
        'Una punta muy afilada es frágil, difícil de laminar y acaba en un «corte Kamm» en los coches reales (Aptera, XL1): mejor cortar la cola limpia a media altura que perseguir la punta.',
      ],
    },
    referencias: [
      'SZEmission: Cd 0,1365 con las ruedas carenadas por completo (dato publicado por el SZEnergy Team); cola en labio horizontal ancho en planta.',
      'Aptera 2023: Cd 0,13 (Wikipedia); cola de cúpula ancha hasta el final con corte Kamm.',
      'VW XL1: Cd 0,186–0,189 (Wikipedia); cola truncada con barra de luz.',
      'Velomóvil Milan GT: CdA ≈ 0,046 m² a 71 km/h con 0,45 m² de área frontal, Cd ≈ 0,10, gracias a una cola larga y fina (túnel Ostfalia/HUM).',
    ],
    relacionados: ['cupX1', 'techo', 'nU', 'morroA1', 'viaR', 'B'],
    comprobaciones: [C.ruedaR, C.motor],
  },

  nU: {
    nombre: 'Sección superior de la carrocería',
    queEs: 'La forma del corte transversal de la carrocería por encima de su «ecuador» (la línea de ancho máximo, al 40 % de la altura de la carrocería): un número sin unidades entre 2 y 3,4. 2 es una elipse, 3,4 casi un rectángulo de esquinas redondeadas. Es el exponente de la superelipse que dibuja cada cuaderna.',
    porQueImporta: 'Con el mismo ancho y la misma altura, una sección cuadrada encierra más área (y más volumen) que una elíptica: en el modelo pasar de 3,3 a 2,0 quita un 4,8 % de área frontal y un 2,4 % de consumo. Pero el espacio que se pierde es justo el de los hombros de la carrocería, donde van las torretas de la suspensión, la rueda trasera y las franjas de panel solar del lomo (−9,3 % de solar con 2,0). La cúpula se apoya en este lomo: cuanto más redondo, más se hunde y más cristal asoma (+12 % de cúpula con 2,0). Una sección cuadrada es también la más fácil de laminar en un molde de dos mitades.',
    masAlto: {
      ventajas: [
        'Lomo plano: +0,27 m² de panel solar respecto a la elipse (modelo, 3,3 frente a 2,0).',
        'Torretas de suspensión y rueda trasera con más hueco: −7,5 y −12,4 cm frente a −10,7 y −18,6 cm con 2,0 (modelo).',
        'Menos cristal de cúpula (−12 %) y más carrocería opaca.',
        'Costados más verticales = puertas más fáciles y mejor sitio para los codos.',
      ],
      desventajas: [
        'Entre 2,6 y 3,3 el modelo suma 1,9 % de área y 1 % de consumo; de 3,3 a 3,4 ya no cambia nada.',
        'Las esquinas vivas generan torbellinos en los cantos del lomo: el modelo no lo mide, pero es la razón por la que ningún coche de bajo Cd tiene la sección cuadrada.',
        '+0,8 kg de piel (modelo, 3,3 frente a 2,6).',
      ],
    },
    masBajo: {
      ventajas: [
        '−4,8 % de área frontal y −2,4 % de consumo con 2,0 (modelo); +14 km de autonomía.',
        '−1,5 kg (modelo).',
        'Es la sección de un fuselaje: el aire la recorre sin cantos.',
      ],
      desventajas: [
        'Torretas −10,7 cm y rueda trasera hundida −18,6 cm con 2,0 (modelo): la mecánica no cabe en una elipse.',
        '−0,27 m² de paneles solares en el lomo (−9 %, unos 2,7 km al día menos).',
        'La cúpula se hunde más en la carrocería y crece el cristal (+12 %).',
        'Peor sitio para los codos y para la bisagra de la puerta en el canto.',
      ],
    },
    referencias: [
      'SZEmission: sección «superelíptica» con el ancho máximo al 40 % de la altura de la carrocería, medido en la foto frontal (bot evaluador; sin dato publicado).',
      'Velomóviles (Quest, Milan): sección casi elíptica, de ahí su Cd ≈ 0,10–0,13 (túnel Ostfalia/HUM); pero no llevan torretas ni ruedas de coche dentro.',
      'VW XL1 y Aptera: lomo plano con cantos redondeados grandes; no hay cifra publicada del exponente.',
    ],
    relacionados: ['nL', 'W', 'deck', 'cupW', 'techoW', 'jaguar'],
    comprobaciones: [C.torretas, C.ruedaR, C.ruedaF, C.hombrosPil, C.hombrosPas],
  },

  nL: {
    nombre: 'Fondo',
    queEs: 'La forma del corte transversal de la carrocería por debajo del ecuador, entre 2 y 5 sin unidades: 2 es un fondo redondo (media elipse), 4 es casi plano con las esquinas redondeadas, 5 es una bandeja. Es el exponente de la superelipse de la mitad de abajo.',
    porQueImporta: 'El fondo plano es lo que hace que la carrocería baja parezca un coche y no un submarino, y es donde apoyan el suelo del chasis, los largueros y los módulos de batería (anchos: 0,84 m el del piloto). Un fondo redondo quita área frontal (−3,9 % con 2,0) pero se mete contra la batería: el módulo bajo el piloto asoma por la panza (−0,9 cm) y el motor pierde 0,4 cm. En aerodinámica de coche, el fondo plano y liso es lo correcto: el aire bajo el coche va canalizado entre el suelo y la carrocería, y un fondo redondo lo deja escapar por los lados (el modelo no mide ese efecto, sólo el área).',
    masAlto: {
      ventajas: [
        'Batería, largueros y suelo plano caben con margen (5,1 cm de panza con 4,0; −0,9 cm con 2,0) (modelo).',
        'Fondo liso, como piden todos los manuales para el flujo bajo el coche.',
        'Bajos negros más anchos = más carrocería que protege de piedras.',
        'Más fácil de fabricar: el fondo puede ser una plancha.',
      ],
      desventajas: [
        'Entre 4,0 y 5,0 el área sube un 0,6 % y el consumo un 0,3 % (modelo): poco.',
        'Las esquinas inferiores vivas son otro par de cantos en el flujo.',
        '+0,2 kg (modelo, 5 frente a 4).',
      ],
    },
    masBajo: {
      ventajas: [
        '−3,9 % de área frontal y −1,9 % de consumo con 2,0 (modelo); +12 km de autonomía.',
        '−0,6 kg (modelo).',
      ],
      desventajas: [
        'El módulo de batería bajo el piloto asoma por la panza (−0,9 cm) con 2,0 (modelo).',
        'Motor y cargador pierden sitio (−0,7 → −1,1 cm) (modelo).',
        'El suelo plano del chasis y los estribos quedan colgados en una panza curva: hay que rellenar con espuma lo que no sea estructura.',
        'Menos altura libre efectiva en las esquinas inferiores (badenes de lado).',
      ],
    },
    referencias: [
      'SZEmission: suelo plano a 13,5 cm en las fotos (bot evaluador; su reglamento exige ≥ 10 cm de altura libre: ficha SwRI UrbanConcept).',
      'Velomóvil Quest: fondo redondo de cápsula, 0,765 m de ancho (velomobiel.nl); no lleva batería plana debajo.',
      'VW XL1 y Aptera: fondo plano carenado hasta la cola (descripciones de prensa; no hay cifra de curvatura publicada).',
    ],
    relacionados: ['nU', 'clear', 'altBat', 'W', 'viaF', 'viaR'],
    comprobaciones: [C.batPanza, C.batPil, C.batPas, C.motor, C.ruedaF, C.ruedaR],
  },

  cupX0: {
    nombre: 'Parabrisas: dónde empieza',
    queEs: 'Dónde arranca la cúpula (la base del parabrisas) desde la punta del morro, en fracción del largo (0,19 × 3,94 = 0,75 m). El lateral lo enseña en metros. El capó, con su tapa de maletero y sus paneles solares, es todo lo que queda delante de este punto.',
    porQueImporta: 'Mueve la base del parabrisas, y con ella el salpicadero, el montante y la puerta, hacia delante o hacia atrás sin mover al piloto. Si el parabrisas empieza antes, el cristal es más largo y baja más (el borde de arriba se mantiene donde dice «Inclinación del parabrisas»), la cabina cubre más carrocería y la puerta gana largo (hueco: de −20 a −14,9 cm con 0,14). Si empieza después, el capó es más largo, pero la cúpula arranca encima del volante: con 0,24 el volante toca la cúpula (0 cm) y el hueco de la puerta pierde 13 cm. Es también donde empieza a verse la carretera: cuanto más atrás, más capó ciego delante.',
    masAlto: {
      ventajas: [
        'Capó más largo: más tapa de maletero y +0,004 m² de solar en el capó (apenas) (modelo).',
        '−1,2 % de área frontal y −0,6 % de consumo con 0,24 (modelo): la cúpula empieza donde la carrocería ya es alta y sobresale menos.',
        '−4,4 % de cristal (modelo).',
        'Morro más «de coche» y menos de burbuja.',
      ],
      desventajas: [
        'El volante toca la cúpula (9,8 → 0 cm) con 0,24 (modelo).',
        'La puerta se acorta: hueco de −20 a −32,9 cm respecto al mínimo de 0,80 m (modelo).',
        'La cabeza del piloto queda bajo una zona más baja: 3,0 → 2,1 cm (modelo).',
        'Más capó ciego delante del conductor.',
      ],
    },
    masBajo: {
      ventajas: [
        'La puerta gana largo: hueco −20 → −14,9 cm con 0,14 (modelo).',
        'Mejor visión del suelo cercano: el cristal baja casi hasta el morro, como en el Aptera.',
        'El salpicadero y el montante se adelantan: más cabina por delante del piloto para el volante (sigue a 9,8 cm de la cúpula).',
      ],
      desventajas: [
        'La cabeza del piloto pierde 1 cm (3,0 → 2,0) porque el parabrisas, al ser más largo, llega más tumbado al pico (modelo).',
        '+0,8 % de área y +0,4 % de consumo (modelo).',
        'Menos capó para el maletero delantero y para la tapa; la bisagra del capó queda más cerca de las ruedas.',
        'Cristal más grande y más tumbado = más sol en las piernas (efecto invernadero que Eugenio quiere evitar).',
      ],
    },
    referencias: [
      'SZEmission: la cúpula arranca en 0,19 del largo, medido en las fotos (bot evaluador).',
      'Aptera 2023: el parabrisas nace casi en la punta del morro, en una curva continua con el capó (fotos; no hay cifra publicada).',
      'VW XL1: capó corto y parabrisas que arranca sobre las ruedas delanteras (fotos; sin cifra).',
    ],
    relacionados: ['parabrisas', 'cupX1', 'posMorro', 'xPil', 'volDist', 'volAlt', 'deck'],
    comprobaciones: [C.volante, C.puertaAlto, C.puertaAncho, C.cabezaPil, C.rodillasPil],
  },

  cupX1: {
    nombre: 'Cúpula: dónde acaba',
    queEs: 'Dónde termina la cúpula hacia atrás, en fracción del largo desde el morro (0,995 = a 2 cm de la punta de la cola). El lateral lo enseña como distancia a la cola. Detrás del arco de seguridad la cúpula es el maletero trasero con su tapa y el techo solar.',
    porQueImporta: 'La cúpula del SZEmission se alarga hasta la cola en una lágrima que se funde con el lomo: eso es lo que da el Cd bajo, porque el techo baja despacio hasta la punta sin dejar un escalón. Cortarla antes deja un escalón entre el techo y el lomo (que el modelo cierra en 1,4 cm de cola) y quita techo solar y maletero: con 0,90 (0,39 m de la cola) el panel pierde 0,11 m², el maletero trasero baja de 196 a 156 L y el espacio de cama de 0,97 a 0,77 m. A cambio ahorra 1,3 kg y un 11 % de cúpula. El modelo no castiga en Cd el escalón (su fórmula no lo ve); en la realidad una cúpula que muere antes que la carrocería es una cola de dos pisos, y eso se paga.',
    masAlto: {
      ventajas: [
        'Techo en una sola curva hasta la cola, sin escalón: la razón del Cd del SZEmission y del Aptera.',
        'Maletero trasero y cama más largos: 196 L y 0,97 m con 0,995 frente a 133 L y 0,57 m con 0,80 (modelo).',
        '+0,24 m² de techo solar respecto a 0,80 (modelo).',
      ],
      desventajas: [
        '+2,5 kg de cúpula y carrocería respecto a 0,80 (modelo).',
        'La tapa del maletero trasero es enorme (toda la cola de la cúpula): bisagra larga y cierre delicado.',
        'Cuesta más laminar una pieza de cúpula de 3 m.',
      ],
    },
    masBajo: {
      ventajas: [
        '−1,3 kg (0,90) o −2,5 kg (0,80) (modelo).',
        'Cúpula más corta y más barata; tapa de maletero manejable.',
        'Separa claramente cabina y cola, como el Twizy.',
      ],
      desventajas: [
        'Escalón en la cola: la cúpula muere sobre el lomo y deja una cola de dos niveles que el aire no sigue (no medido por el modelo).',
        'Maletero trasero 196 → 156 L (0,90) o 133 L (0,80); cama 0,97 → 0,77 o 0,57 m (modelo).',
        '−3,6 % (0,90) o −8,4 % (0,80) de panel solar (modelo).',
      ],
    },
    referencias: [
      'SZEmission: cúpula desde 0,19 hasta 0,99 del largo, fundida con la cola sin escalón (fotos, bot evaluador).',
      'Aptera 2023: la cabina baja en una sola curva hasta el corte Kamm de la cola (fotos); Cd 0,13 (Wikipedia).',
      'Renault Twizy: cabina corta y cola vertical, Cd 0,64 (ficha técnica, auto-data.net).',
    ],
    relacionados: ['techo', 'colaA1', 'inicioSolar', 'xPas', 'L', 'cupX0'],
    comprobaciones: [C.arco, C.cabezaPas],
  },

  cupW: {
    nombre: 'Cabina: ancho de la base',
    queEs: 'El ancho de la cúpula donde se apoya en la cubierta, en fracción del ancho máximo (0,523 × 1,55 = 0,81 m). El lateral lo enseña en metros. La cúpula es más estrecha que la carrocería porque sólo tiene que albergar una persona (tándem): a los lados quedan las franjas de lomo con paneles solares.',
    porQueImporta: 'Es el ancho de la «burbuja» donde van los hombros y la cabeza, y una de las pocas maneras de recortar área frontal sin tocar el ancho de las ruedas. Cada 10 cm de cabina (±0,065 del deslizador) son ≈ 4 % de área frontal y ≈ 2 % de consumo (modelo). Lo que se gana en aire se pierde en hombros: la holgura de hombros del piloto es de 16,3 cm con 0,81 m, pero el pasajero va detrás con las piernas a los lados del asiento del piloto y necesita ancho abajo. Una cabina más estrecha también deja más lomo a cada lado para los paneles (+2 % de solar con 0,70 m).',
    masAlto: {
      ventajas: [
        'Más hombros y más cama: 0,60 → 0,69 m de ancho útil con 0,93 m de cabina (modelo).',
        'Puerta más ancha y más fácil de entrar; el pasajero mete las piernas sin encajarlas.',
        'Más cristal lateral: mejor visión en los cruces.',
      ],
      desventajas: [
        '+4,2 % de área frontal y +2,1 % de consumo con 0,93 m (modelo); −12 km de autonomía.',
        '−5,9 % de panel solar: las franjas del lomo se estrechan (modelo).',
        '+7,9 % de policarbonato (modelo); más calor dentro.',
        'La cúpula se acerca a los cantos del lomo, donde la carrocería ya cae: peor unión y más riesgo de «S» en planta (lo que Eugenio pidió corregir).',
      ],
    },
    masBajo: {
      ventajas: [
        '−4 % de área frontal y −1,9 % de consumo con 0,70 m (modelo); +12 km de autonomía.',
        '+2,1 % de solar en el lomo y −7 % de cristal (modelo).',
        'Es la receta del XL1: parabrisas «más estrecho, que sólo tiene que albergar al piloto».',
      ],
      desventajas: [
        'Hombros más justos: el modelo mantiene 16 cm, pero la cama baja a 0,50 m de ancho con 0,70 m de cabina.',
        'Las piernas del pasajero (a 20–27 cm del eje) van ya pegadas al cristal.',
        'Puerta más estrecha: el hueco de 0,50 m mínimo sigue cumpliéndose (58 cm), pero con menos margen.',
      ],
    },
    referencias: [
      'SZEmission: cúpula de 0,48 del ancho en su base (fotos, bot evaluador); el Aeromóvil 1 la lleva a 0,52.',
      'VW XL1: dos plazas escalonadas (no tándem puro) bajo una cabina de 1,67 m de ancho (Wikipedia); su parabrisas es plano y estrecho.',
      'Velomóvil Quest: 0,765 m de ancho total, cabina incluida, para un solo ocupante (velomobiel.nl).',
    ],
    relacionados: ['W', 'techoW', 'nU', 'deck', 'plazas', 'puerta'],
    comprobaciones: [C.hombrosPil, C.hombrosPas, C.puertaAncho, C.arco],
  },

  techoW: {
    nombre: 'Cabina: ancho del techo',
    queEs: 'Cuánto mide el techo de la cúpula respecto a su base, en fracción (0,78 × 0,81 = 0,63 m). 1 son costados verticales; 0,7 costados muy inclinados hacia dentro, como en la foto frontal del XL1. El lateral lo enseña en metros y con la palabra.',
    porQueImporta: 'Inclinar los costados de la cabina es la forma más barata de quitar área frontal sin quitar hombros: la sección se estrecha arriba, donde sólo está la cabeza, y no abajo, donde están los codos. Cada 0,2 del deslizador (±13 cm de techo) son ≈ 3,3 % de área frontal y ≈ 1,7 % de consumo (modelo). También da el aire «de avión» que Eugenio pidió con la foto del XL1. La contrapartida es que el techo solar plano es más estrecho (−5,8 % de solar con 0,6) y la bisagra de la puerta de gaviota, que va en el canto del techo, queda más cerca del centro.',
    masAlto: {
      ventajas: [
        'Techo solar más ancho: +6,5 % de solar con costados verticales (modelo).',
        'Más cristal lateral y más aire en la cabeza; la cama gana ancho arriba (0,60 → 0,66 m).',
        'Puerta de gaviota con la bisagra más fuera: abre más limpia.',
      ],
      desventajas: [
        '+3,6 % de área frontal y +1,9 % de consumo con 1,0 (modelo); −11 km de autonomía.',
        '+1,4 kg de cúpula y +7,4 % de cristal (modelo).',
        'Cabina «de caja»: los cantos verticales del techo son dos aristas más para el aire, y se pierde el parecido con el XL1.',
      ],
    },
    masBajo: {
      ventajas: [
        '−3 % de área frontal y −1,5 % de consumo con 0,6 (modelo); +9 km de autonomía.',
        '−0,9 kg y −4,7 % de cristal (modelo).',
        'Es la cabina del XL1: «empieza ancha en el carenado y termina estrecha en el techo».',
      ],
      desventajas: [
        '−5,8 % de panel solar: el techo plano se estrecha (modelo).',
        'Cama más estrecha arriba (0,54 m) y cabeza más cerca del cristal lateral.',
        'Las puertas de gaviota se vuelven «de tienda de campaña»: al abrirse suben casi verticales y la bisagra queda cerca del centro.',
      ],
    },
    referencias: [
      'VW XL1: cabina en trapecio, techo claramente más estrecho que la base, según su foto frontal (sin cifra publicada); Eugenio fijó 0,78 «como el XL1».',
      'Aptera 2023: costados casi verticales con techo plano y ancho para los paneles solares (fotos; sin cifra).',
    ],
    relacionados: ['cupW', 'nU', 'inicioSolar', 'puerta', 'H'],
    comprobaciones: [C.hombrosPil, C.hombrosPas, C.cabezaPil, C.cabezaPas, C.arco],
  },

  parabrisas: {
    nombre: 'Inclinación del parabrisas',
    queEs: 'El largo del parabrisas, de su base en el capó a su borde de arriba, en fracción del largo total (0,254 × 3,94 = 1,00 m). Como la altura entre la base y el pico la fijan «Alto total» y «Altura de la cubierta», un parabrisas más largo es un parabrisas más tumbado: 1,00 m para subir unos 0,42 m es un ángulo de ≈ 23° sobre la horizontal. El lateral lo enseña en metros y con la palabra.',
    porQueImporta: 'El parabrisas es el primer escalón que ve el aire después del capó. Cuanto más tumbado, más suave es el escalón y menos presión acumula; los estudios de parabrisas (p. ej. el trabajo de la UPV «Study of the effects of windshield angle on the drag force of cars») miden caídas de Cd de varios puntos porcentuales al tumbar la luna. El modelo lo refleja poco (−1,2 % de CdA entre 0,15 y 0,32) porque su fórmula de Cd no mira el parabrisas; lo que sí mueve es la cabeza del piloto, el techo solar y la puerta. Un parabrisas muy tumbado también es un parabrisas enorme: más policarbonato, más sol en las piernas (efecto invernadero) y reflejos del salpicadero en la luna.',
    masAlto: {
      ventajas: [
        '−1,5 % de área frontal y −0,7 % de consumo con 1,26 m (modelo); en la realidad el beneficio en Cd es mayor de lo que el modelo cuenta.',
        'Capó y cúpula en «una curva constante», como el Aptera, que es lo que Eugenio pidió.',
        'Más cama: el pico del techo queda más atrás, 0,97 → 1,10 m de largo (modelo).',
      ],
      desventajas: [
        'El techo baja antes sobre el pasajero: la cabeza del piloto pasa de 3,0 a 1,9 cm con 1,26 m (modelo).',
        '−4,8 % de panel solar (el techo plano empieza más atrás) y +5,7 % de cristal (modelo).',
        'La puerta pierde largo: hueco −20 → −26,1 cm (modelo), porque el montante termina más atrás.',
        'Sol en las piernas y reflejos: lo que Eugenio llamó «efecto invernadero».',
      ],
    },
    masBajo: {
      ventajas: [
        'Techo solar más largo: +7,8 % de solar con 0,59 m (modelo), unos 3 km más al día.',
        '−8,2 % de cristal y menos calor (modelo).',
        'La puerta gana: hueco −20 → −14,8 cm (modelo).',
        'Luna más vertical = menos reflejos y más fácil de limpiar.',
      ],
      desventajas: [
        'El pico queda casi sobre la cabeza del piloto y la holgura cae de 3,0 a 0,4 cm con 0,59 m (modelo).',
        '+0,4 % de área (modelo) y, sobre todo, un escalón brusco que el modelo no penaliza pero el aire sí.',
        'Se pierde la línea continua capó-parabrisas del Aptera.',
      ],
    },
    referencias: [
      'Aptera 2023: parabrisas muy tumbado en continuidad con el capó; Cd 0,13 (Wikipedia). Ángulo no publicado.',
      'VW XL1: parabrisas plano y tumbado; Cd 0,186–0,189 (Wikipedia). Ángulo no publicado.',
      'Renault Twizy: luna casi vertical, Cd 0,64 (ficha técnica, auto-data.net).',
      'Bot de cabina (ronda 1, 2026-11-06): cuerda del parabrisas ≈ 33° y montante ≈ 35° en el XL1/Aptera, medidos en fotos.',
      'Efecto del ángulo sobre el Cd: estudio de la UPV (riunet.upv.es, «Study of the effects of windshield angle on the drag force of cars»); no pude leer las cifras concretas, sólo que el efecto existe.',
    ],
    relacionados: ['cupX0', 'techo', 'inicioSolar', 'H', 'deck', 'xPil'],
    comprobaciones: [C.cabezaPil, C.puertaAlto, C.volante, C.arco],
  },

  techo: {
    nombre: 'Caída del techo',
    queEs: 'Cómo baja el techo de la cúpula desde su pico (el borde de arriba del parabrisas) hasta la cola, sin unidades, de 1 a 3. Es el exponente de la curva altura = pico − (pico − cola)·s^techo: 1 es una recta desde el pico, 1,6 la curva del Aptera, 3 se mantiene alto casi hasta el final y cae de golpe.',
    porQueImporta: 'Decide cuánto techo hay sobre la cabeza del pasajero y sobre la cama, y cuánta «cola» tiene la cúpula para cerrar el aire. Con 1 (recta) la cabeza del piloto se queda a 0,4 cm y la cama a 0,47 m de largo; con 3 la cama llega a 1,28 m y el maletero trasero a 220 L. El aire prefiere lo contrario de la comodidad: una bajada suave y temprana (exponente bajo) es la lágrima de los velomóviles y del SZEmission; un techo que se mantiene alto y cae al final es una cola truncada, que funciona si el corte es limpio (Kamm) pero no si cae en curva cerrada, donde el flujo se despega. El modelo no mide ese efecto: su Cd no cambia con este deslizador.',
    masAlto: {
      ventajas: [
        'Cama: 0,97 → 1,28 m de largo y 0,60 m de alto con 3 (modelo).',
        'Maletero trasero 196 → 220 L; cabeza del pasajero con margen (modelo).',
        'Techo plano más largo: +0,4 % de solar (modelo).',
      ],
      desventajas: [
        '+0,8 kg de cúpula y +2,8 % de cristal (modelo).',
        'Cola de cúpula que cae de golpe: el aire se despega y la estela crece (no medido por el modelo; razón del corte Kamm en Aptera y XL1).',
        'Más volumen de cúpula (+2,9 %) sin más plazas.',
      ],
    },
    masBajo: {
      ventajas: [
        '−1,3 kg y −7,8 % de cristal con 1 (modelo).',
        'Lágrima pura: la cola cierra el aire despacio desde el pico, lo que mejor funciona en los velomóviles.',
        'Menos efecto invernadero: menos cúpula.',
      ],
      desventajas: [
        'Cabeza del piloto a 0,4 cm de la cúpula con 1 (modelo): hay que subir el alto total o bajar el asiento.',
        'Cama de 0,47 m de largo y maletero trasero 166 L (modelo).',
        'La cabeza del pasajero queda bajo un techo que ya baja (el modelo ya está a 0 cm en el defecto).',
      ],
    },
    referencias: [
      'Aptera 2023: techo plano sobre los ocupantes y caída continua hasta la cola, ≈ 1,6 en esta escala según el bot de cabina (fotos; sin cifra publicada). Eugenio fijó 1,9.',
      'SZEmission: pico sobre el piloto en 0,42 del largo y bajada casi recta hasta fundirse con la cola en 0,9 (fotos, bot evaluador).',
      'Velomóvil Milan: cola larga y fina, CdA ≈ 0,041–0,046 m² (túnel Ostfalia/HUM).',
    ],
    relacionados: ['parabrisas', 'cupX1', 'H', 'xPas', 'recPas', 'inicioSolar'],
    comprobaciones: [C.cabezaPil, C.cabezaPas, C.arco],
  },

  inicioSolar: {
    nombre: 'Techo solar: dónde empieza',
    queEs: 'A qué distancia detrás del borde de arriba del parabrisas empieza el panel solar del techo, en metros (0 = pegado al cristal). Del parabrisas hasta ahí el techo es carrocería blanca; de ahí a la cola, células de 125 mm.',
    porQueImporta: 'Sólo mueve dónde empieza el panel: no cambia la forma ni el peso de la cúpula (el panel pesa 2,2 kg/m² y es lo único que varía). Cada 10 cm de retraso son unos 0,047 m² de panel menos, −1,6 % de energía solar y unos 0,6 km menos al día de sol (modelo: de 2,90 m² y 38,3 km/día con 0 a 2,62 m² y 34,7 km con 60 cm). La razón para retrasarlo es práctica: justo detrás del parabrisas el techo todavía está curvándose y una célula rígida no se pega bien en curva; además esa franja es por donde pasa la bisagra de la puerta de gaviota y el arco de seguridad.',
    masAlto: {
      ventajas: [
        'Franja de techo libre para la bisagra de la gaviota y la goma del parabrisas.',
        'Las células van en la parte plana, donde el laminado no se arruga (lo que Eugenio pidió: «en la parte plana, no en la curva»).',
        '−0,3 kg (30 cm) o −0,6 kg (60 cm) de panel (modelo).',
      ],
      desventajas: [
        '−5 % de energía solar con 30 cm y −9,5 % con 60 cm; 38,3 → 36,4 → 34,7 km al día (modelo).',
        'Una franja blanca entre cristal y panel que se ve desde fuera.',
      ],
    },
    masBajo: {
      ventajas: [
        'Máximo panel: 2,90 m² y 38 km al día de sol con 4,5 horas pico (modelo).',
        'Techo visualmente de una pieza: cristal y panel seguidos.',
      ],
      desventajas: [
        'Las primeras células caen en techo curvado: hay que usar células flexibles o cortarlas pequeñas.',
        'Compite con la bisagra de la puerta de gaviota y la goma del parabrisas por los mismos centímetros.',
      ],
    },
    referencias: [
      'Aptera 2023: hasta 64 km al día de sol con células Maxeon en techo, capó y cola (Wikipedia); superficie de panel no publicada.',
      'Modelo: paneles al 21 % de rendimiento, el 70 % del área mirando bien al cielo, 85 % de pérdidas de sistema (constantes de `calcularA1`).',
    ],
    relacionados: ['parabrisas', 'techo', 'techoW', 'cupX1'],
    comprobaciones: [],
  },

  // ── Opción Jaguar ─────────────────────────────────────────────────────────
  jaguar: {
    nombre: 'Opción Jaguar',
    queEs: 'Activa o no el abombamiento redondo de la carrocería sobre cada rueda, como las aletas del Jaguar D-Type: una campana suave que sale de la piel y se funde sin arista. Sin unidades: sí o no.',
    porQueImporta: 'Es una decisión de estilo con una consecuencia útil: donde la carrocería se estrecha (la cola sobre las ruedas traseras, el morro sobre las delanteras), el bulto da espacio a la rueda hundida y girada sin ensanchar todo el coche. En el modelo es un desplazamiento sobre la piel: añade 0,7 kg y 0,18 m² de carrocería, y las comprobaciones de holgura siguen midiendo contra la piel sin abombar (caso más desfavorable), así que no las mejora en el lateral aunque sí en la realidad. En aerodinámica, cuatro bultos son cuatro perturbaciones: un bulto suave y largo cuesta poco, uno corto y alto cuesta bastante; el modelo no lo cuenta en el Cd.',
    masAlto: {
      ventajas: [
        'Sitio real para la rueda hundida y girada sin ensanchar la carrocería entera.',
        'Aire de clásico (D-Type) que Eugenio pidió.',
        '+2,7 % de panel solar: el bulto añade piel en el lomo (modelo).',
      ],
      desventajas: [
        '+0,7 kg de carrocería (modelo) con los valores por defecto.',
        'Cuatro perturbaciones en el flujo; el modelo no las penaliza, pero existen.',
        'Molde más complicado (cuatro campanas) y más difícil de pulir.',
      ],
    },
    masBajo: {
      ventajas: [
        'Carrocería limpia de una sola curva, como SZEmission y Aptera (que saca las ruedas fuera, en carenados aparte).',
        'Molde más simple.',
      ],
      desventajas: [
        'Las ruedas sólo caben si la carrocería es ancha ahí: en el defecto la delantera girada roza −9,1 cm y la trasera hundida −12,4 cm (modelo).',
        'Para que quepan hay que ensanchar toda la carrocería (+5,9 % de área por cada 10 cm) o estrechar las vías.',
      ],
    },
    referencias: [
      'Jaguar D-Type (1954): aletas abombadas sobre las ruedas; es la referencia visual de Eugenio (2026-11-06). Sin cifra de Cd publicada que pueda citar.',
      'Aptera 2023: ruedas fuera del cuerpo en carenados independientes; Cd 0,13 (Wikipedia).',
    ],
    relacionados: ['jagAlto', 'jagLargo', 'jagAncho', 'viaF', 'viaR', 'neumF', 'neumR'],
    comprobaciones: [C.ruedaF, C.ruedaR],
  },

  jagAlto: {
    nombre: 'Jaguar: cuánto sobresale',
    queEs: 'Cuánto sobresale el abombamiento de la piel en su punto más alto, sobre cada rueda, en metros (6 cm por defecto). Sólo cuenta con la Opción Jaguar activada.',
    porQueImporta: 'Es el «radio extra» que gana la rueda. La rueda delantera girada a 22° y con la suspensión hundida 9 cm necesita en el modelo 9,1 cm más de los que tiene con la carrocería por defecto, y la trasera hundida 12,4 cm: un bulto de 6 cm no basta y uno de 12–15 sí. Pero el bulto también es área frontal (el modelo no lo suma) y una colina que el aire tiene que rodear; a igual largo, un bulto el doble de alto tiene el doble de pendiente.',
    masAlto: {
      ventajas: [
        'Más sitio para la rueda: con 15 cm cubriría lo que falta a la trasera hundida (−12,4 cm en el defecto).',
        'Aletas más marcadas, más D-Type.',
      ],
      desventajas: [
        'Pendientes más fuertes para el aire; cuatro bultos de 15 cm son casi cuatro pasos de rueda de coche normal.',
        'Más piel (más kg y más molde): el modelo suma ≈ 0,7 kg con 6 cm, más con más altura.',
        'Más ancho total real que el deslizador «Ancho máximo» no refleja (sobresale por fuera de él).',
      ],
    },
    masBajo: {
      ventajas: [
        'Bulto apenas perceptible: aerodinámicamente casi gratis.',
        'Menos piel y molde más fácil.',
      ],
      desventajas: [
        'No resuelve la holgura de la rueda: con 1–3 cm es sólo decoración.',
        'Un bulto bajo y largo se lee desde fuera como una abolladura, no como una aleta.',
      ],
    },
    referencias: [
      'Sin cifra publicada de altura de aleta del D-Type que pueda citar; la medida sale de la foto que Eugenio enseñó (2026-11-06).',
      'Modelo: la delantera necesita +9,1 cm y la trasera +12,4 cm con los valores por defecto (comprobaciones de rueda).',
    ],
    relacionados: ['jaguar', 'jagLargo', 'jagAncho', 'W', 'viaF', 'viaR'],
    comprobaciones: [C.ruedaF, C.ruedaR],
  },

  jagLargo: {
    nombre: 'Jaguar: largo del abombamiento',
    queEs: 'Cuánto mide el abombamiento a lo largo del coche, centrado en cada eje, en metros (1,10 m por defecto: 55 cm por delante y 55 por detrás del eje). Sólo con la Opción Jaguar activada.',
    porQueImporta: 'Para la misma altura, el largo fija la pendiente de la colina: 6 cm en 1,10 m es una subida del 11 %, en 0,6 m del 20 %. Una rueda de 53–56 cm de diámetro con 9 cm de recorrido necesita que el bulto la cubra entera, así que menos de ≈ 0,7 m deja el bulto corto. Y con batalla 2,05 m, dos bultos de 2,0 m cada uno se solapan en el centro: la carrocería se vuelve una aleta continua, que es más aerodinámica (una sola subida y una sola bajada) pero deja de ser «sobre cada rueda».',
    masAlto: {
      ventajas: [
        'Pendiente más suave: aerodinámicamente mejor para la misma altura.',
        'Cubre la rueda entera con margen por delante y por detrás (hundida y girada).',
        'Con ≥ 2 m los dos bultos se funden en una aleta continua, como una carrocería de los años 50.',
      ],
      desventajas: [
        'Más piel abombada: más kg y más molde.',
        'Se pierde el «círculo sobre la rueda» del D-Type; el ojo deja de leerlo como aleta.',
      ],
    },
    masBajo: {
      ventajas: [
        'Aleta compacta, muy marcada.',
        'Menos piel extra.',
      ],
      desventajas: [
        'Pendientes fuertes: con 0,6 m y 6 cm el bulto sube al 20 %, que es una perturbación clara.',
        'Por debajo de ≈ 0,7 m no cubre la rueda hundida de punta a punta (diámetro 0,53–0,56 m + recorrido).',
      ],
    },
    referencias: [
      'Neumáticos del modelo: 125/80 R13 = 0,530 m y 145/80 R13 = 0,562 m de diámetro (tabla `NEUMATICOS`, dimensiones de catálogo).',
      'Recorrido de suspensión comprobado: 9 cm (`TRAVEL_A1`).',
    ],
    relacionados: ['jaguar', 'jagAlto', 'jagAncho', 'B', 'neumF', 'neumR'],
    comprobaciones: [C.ruedaF, C.ruedaR],
  },

  jagAncho: {
    nombre: 'Jaguar: alcance en vertical',
    queEs: 'Cuánto abarca el abombamiento alrededor de la sección, en fracción de media vuelta (0,30 por defecto ≈ 54° de arco, centrado un poco por encima de la cintura): 0,12 sólo la cintura, 0,5 de la cintura hasta el hombro. El lateral lo enseña con palabras.',
    porQueImporta: 'Decide si el bulto es una aleta que cubre el costado entero (y protege la rueda por arriba) o sólo un labio en la cintura. La rueda roza arriba (hundida) y hacia fuera (girada): para que el bulto sirva tiene que llegar al hombro, no quedarse en la cintura. En aerodinámica, un bulto ancho en vertical mueve más aire pero con menos curvatura; el modelo no lo cuenta.',
    masAlto: {
      ventajas: [
        'Cubre la rueda hundida por arriba, que es donde roza (−12,4 cm detrás).',
        'Aleta continua de cintura a hombro, como el D-Type.',
      ],
      desventajas: [
        'Afecta al lomo, donde van las franjas de paneles solares: el bulto curva el panel.',
        'Más piel abombada: algo más de kg.',
      ],
    },
    masBajo: {
      ventajas: [
        'Un labio discreto en la cintura, sin tocar el lomo ni los paneles.',
        'Menos piel abombada: molde más sencillo y menos peso.',
      ],
      desventajas: [
        'No llega a donde roza la rueda: la holgura de arriba no mejora.',
        'Un labio estrecho y alto es la perturbación aerodinámica más fea: curvatura fuerte en poco espacio.',
      ],
    },
    referencias: [
      'Sin cifra publicada; es una variable de dibujo del modelo (campana coseno² centrada en 0,10π sobre la cintura).',
    ],
    relacionados: ['jaguar', 'jagAlto', 'jagLargo', 'nU'],
    comprobaciones: [C.ruedaF, C.ruedaR],
  },

  // ── Material y espesores ──────────────────────────────────────────────────
  matCarenado: {
    nombre: 'Material de la carrocería',
    queEs: 'De qué está hecha la piel de la carrocería (no la cúpula): fibra de carbono (1,55 kg por m² y por mm de espesor, con resina), carbono-lino (1,35) o fibra de vidrio (1,85). Cambia el peso por metro cuadrado y lo que cuesta; la forma no.',
    porQueImporta: 'Con 11,4 m² de carrocería y 1,8 mm, el material es una diferencia de 10 kg entre el más ligero y el más pesado: 378 kg con carbono-lino, 382 con carbono, 389 con vidrio (modelo). En consumo son apenas ±0,4 % a 100 km/h porque a esa velocidad manda el aire, pero en ciudad y en cuesta cada kilo cuenta. Lo que no cuenta el modelo es la rigidez: a igual espesor el carbono es mucho más rígido que el vidrio, así que una carrocería de vidrio necesita más milímetros (y más kilos) para no ondular a 100 km/h; el lino es el menos rígido de los tres y se usa por su amortiguación y su origen vegetal. Y el precio: el vidrio es con diferencia el más barato por m².',
    masAlto: {
      ventajas: [
        'Carbono: la mayor rigidez por kilo; es lo que llevan SZEmission (monocasco), XL1 (carrocería CFRP) y los velomóviles Quest/Milan.',
        'Carbono-lino: −4,1 kg frente al carbono puro (modelo), buena amortiguación de vibraciones y fibra vegetal.',
      ],
      desventajas: [
        'Carbono: caro, conductor (hay que aislar la alta tensión), y una reparación exige laminar de nuevo.',
        'Carbono-lino: menos rígido que el carbono; el lino absorbe humedad si no queda bien sellado.',
      ],
    },
    masBajo: {
      ventajas: [
        'Fibra de vidrio: la más barata, la más fácil de laminar y reparar a mano, aislante eléctrico.',
        'Fibra de vidrio: se consigue en cualquier tienda náutica y no exige horno ni bolsa de vacío para un primer prototipo.',
      ],
      desventajas: [
        '+6,1 kg con el mismo espesor (modelo), y en la práctica hay que subir el espesor para igualar la rigidez: el peso real es mayor.',
        'Menos rigidez = más riesgo de que los paneles solares pegados encima se agrieten con la flexión.',
      ],
    },
    referencias: [
      'SZEmission: monocasco de carbono, 95 kg en total (SZEnergy Team, SciEngineer 2026).',
      'VW XL1: chasis y carrocería de polímero reforzado con fibra de carbono (Wikipedia).',
      'Velomóvil Quest: carbono, 28 kg completo con batería (velomobiel.nl).',
      'Densidades usadas por el modelo (kg/m²·mm): carbono 1,55, carbono-lino 1,35, vidrio 1,85 (`MATERIALES_CARENADO`); son valores típicos de laminado con resina, no medidos.',
    ],
    relacionados: ['espCarenado', 'espCristal', 'L', 'W', 'H'],
    comprobaciones: [C.vmax, C.cargaNeum],
  },

  espCarenado: {
    nombre: 'Espesor de la carrocería',
    queEs: 'El grosor del laminado de la carrocería, en milímetros (1,8 mm por defecto). El peso de la carrocería es área × espesor × densidad del material.',
    porQueImporta: 'Es el deslizador de peso más potente de todo el coche: con 11,4 m² de carbono, cada milímetro son 17,6 kg (1,0 mm → 368 kg; 3,0 mm → 404 kg en vacío, modelo). En consumo a 100 km/h son ±1 % por milímetro; en ciudad y arrancadas, más. Pero el espesor es rigidez: un panel de 1 mm de carbono de 1,5 m de ancho ondula con el viento y con la mano, y un panel solar pegado encima se agrieta. En los coches ligeros reales la solución no es engordar el laminado sino hacerlo sándwich (dos pieles finas con espuma o nido de abeja en medio), que el modelo no contempla: pesa menos que 3 mm macizos y es mucho más rígido.',
    masAlto: {
      ventajas: [
        'Más rigidez y más resistencia a golpes de aparcamiento y gravilla.',
        'Panel solar pegado sin grietas; puertas que cierran con sonido de coche.',
        'Más margen en la unión con el chasis (tornillos, bisagras).',
      ],
      desventajas: [
        '+17,6 kg por milímetro con carbono (+21 kg a 3,0 mm, modelo).',
        '+1,4 % de consumo a 100 km/h con 3,0 mm (modelo) y peor en ciudad.',
        'Más resina y más horas de laminado.',
      ],
    },
    masBajo: {
      ventajas: [
        '−14 kg con 1,0 mm (modelo), −0,9 % de consumo a 100 km/h.',
        'Es lo que hacen SZEmission (95 kg) y los velomóviles (28 kg): laminados finos.',
      ],
      desventajas: [
        'Paneles grandes que ondulan: 1,55 m de ancho sin nervios ni sándwich no aguanta.',
        'Un golpe de aparcamiento atraviesa.',
        'Los paneles solares rígidos se agrietan con la flexión.',
      ],
    },
    referencias: [
      'SZEmission: 95 kg completo con monocasco de carbono (SZEnergy Team); espesor no publicado.',
      'Velomóvil Quest: 28 kg completo (velomobiel.nl); espesor no publicado.',
      'Modelo: 11,37 m² de carrocería × 1,55 kg/m²·mm (carbono) = 17,6 kg por mm.',
    ],
    relacionados: ['matCarenado', 'espCristal', 'L', 'W', 'H'],
    comprobaciones: [C.vmax, C.cargaNeum],
  },

  espCristal: {
    nombre: 'Espesor de la cúpula (policarbonato)',
    queEs: 'El grosor del policarbonato transparente del parabrisas y las ventanillas, en milímetros (4,0 por defecto). El modelo lo pesa a 1,2 kg por m² y por mm.',
    porQueImporta: 'La cúpula tiene 1,40 m² de cristal, así que cada milímetro son 1,7 kg (3 mm → −1,7 kg; 6 mm → +3,4 kg, modelo): poco frente a la carrocería. Lo que decide el espesor no es el peso sino la rigidez y la homologación: el policarbonato es flexible, y una luna de 1 m de largo y 4 mm se abomba con el viento a 100 km/h si no va bien enmarcada. Para un vehículo matriculado el parabrisas tiene que cumplir la normativa de acristalamiento (Reglamento UNECE n.º 43, que distingue vidrio de plásticos rígidos); no he comprobado qué acepta para la luna delantera de un L7e, y eso es lo que un bot no puede decidir: hay que preguntarlo al homologador antes de elegir policarbonato.',
    masAlto: {
      ventajas: [
        'Luna más rígida: menos abombamiento y menos distorsión óptica a 100 km/h.',
        'Mejor contra piedras y golpes; el policarbonato de 6 mm aguanta mucho más que el de 3.',
        'Más fácil de homologar como «rígido».',
      ],
      desventajas: [
        '+1,7 kg por milímetro (modelo); +3,4 kg a 6 mm.',
        'Más difícil de curvar en frío: un parabrisas con la panza del Aptera en 6 mm necesita molde y horno.',
        'Más caro.',
      ],
    },
    masBajo: {
      ventajas: [
        '−1,7 kg por milímetro (modelo).',
        'Se curva en frío sobre el marco: fabricación sencilla.',
      ],
      desventajas: [
        'Se abomba y vibra con el viento; distorsiona la visión.',
        'Se raya y se agrieta con facilidad; 3 mm es lo mínimo que se ve en velomóviles y ultraligeros.',
        'Homologación más dudosa como parabrisas.',
      ],
    },
    referencias: [
      'Velomóviles (Quest, Milan): cúpulas de policarbonato de 2–3 mm, según los fabricantes (no he encontrado la cifra en una ficha oficial; dato de uso general en el sector).',
      'Rango del deslizador: 3–6 mm (`RANGOS_MASA_A1`).',
      'Normativa de acristalamiento: Reglamento UNECE n.º 43; no he verificado qué exige para L7e en concreto.',
    ],
    relacionados: ['espCarenado', 'matCarenado', 'cupW', 'parabrisas', 'cupX1'],
    comprobaciones: [C.vmax],
  },

  // ── Ejes, ruedas y suspensión ─────────────────────────────────────────────
  B: {
    nombre: 'Batalla: eje delantero a trasero',
    queEs: 'La distancia entre el centro de las ruedas delanteras y el de las traseras, en metros (2,05 m). Como el largo total y el voladizo del morro son otros deslizadores, lo que la batalla come o deja se lo lleva la cola: cola = largo − morro − batalla.',
    porQueImporta: 'Una batalla larga es un coche que no cabecea (los baches entran en cada eje por separado), que va recto solo en autopista y que reparte mejor el peso de dos ocupantes en tándem; es la razón por la que el XL1 (2,22 m) y el Aptera (2,74 m) la llevan larga. Pero cada centímetro de batalla es un centímetro menos de cola: con 2,25 m el motor, la reductora y el inversor ya no caben detrás del eje (−0,7 → −5,7 cm) y la rueda trasera hundida roza −18,6 cm (modelo). Y el radio de giro crece con ella: con el giro de 22° del modelo, cada 10 cm de batalla son unos 25 cm más de radio (R ≈ B / tan 22°). La batalla no mueve el Cd ni el área frontal.',
    masAlto: {
      ventajas: [
        'Más estabilidad a 100–140 km/h y menos cabeceo en baches; mejor con el pasajero detrás.',
        'Mejor reparto de pesos: el pasajero y el motor caen más cerca del centro de la batalla y cargan menos un solo eje.',
        'Más sitio entre ejes para batería y ocupantes sin mover los voladizos.',
      ],
      desventajas: [
        'Se come la cola: motor −5,7 cm y rueda trasera hundida −18,6 cm con 2,25 m (modelo).',
        'Radio de giro: +25 cm por cada 10 cm de batalla (razonamiento geométrico con 22° de giro).',
        'Los largueros entre ejes trabajan a más momento con las mismas cargas (modelo de viga): más tensión en el chasis.',
      ],
    },
    masBajo: {
      ventajas: [
        'Cola más larga: el motor cabe (OK con 1,85 m) y la rueda trasera hundida mejora a −8,2 cm (modelo).',
        'Gira en menos sitio: el Twizy (1,69 m) tiene 6,8 m de diámetro de giro (ficha).',
        'Menos momento en los largueros.',
      ],
      desventajas: [
        'Más cabeceo y menos aplomo a velocidad alta; con dos personas en tándem el pasajero cae cerca del eje trasero.',
        'El bot evaluador propuso 1,46 m para parecerse más al SZEmission y Eugenio no lo aceptó: con pasajero no cabe.',
      ],
    },
    referencias: [
      'Renault Twizy: 1,686 m, diámetro de giro 6,8 m (ficha técnica, auto-data.net).',
      'VW XL1: 2,225 m (Wikipedia).',
      'Aptera 2023: 2,743 m (Wikipedia); Aptera 2e: 111 pulgadas = 2,82 m (Green Car Reports).',
      'SZEmission: ≈ 1,15–1,2 m, estimado en las fotos (no publicado); Shell UrbanConcept del SwRI: 1,796 m (ficha SwRI).',
    ],
    relacionados: ['L', 'fMorro', 'xPil', 'xPas', 'viaF', 'viaR', 'colaA1'],
    comprobaciones: [C.motor, C.ruedaR, C.cargaNeum],
  },

  viaF: {
    nombre: 'Vía delantera',
    queEs: 'La distancia entre los centros de las dos ruedas delanteras, en metros (1,22 m). Con neumáticos de 12,5 cm, los bordes exteriores de las ruedas quedan a 1,22 + 0,125 = 1,35 m, dentro de los 1,55 m de carrocería.',
    porQueImporta: 'La vía es lo que separa un coche de un triciclo que vuelca: la estabilidad al vuelco es, a grandes rasgos, la mitad de la vía dividida por la altura del centro de gravedad. Con 1,22 m de vía y un centro de gravedad que en un coche tan bajo rondará los 40–45 cm (no lo calcula el modelo), el margen es muy bueno; el Twizy, con 1,09 m y un centro de gravedad más alto, también se tiene en pie. El límite lo pone el encaje: con 1,35 m de vía la rueda girada a 22° y hundida sale por la piel −15,6 cm y las torretas −9,0 cm; con 1,10 m cabe casi (−3,1 cm) (modelo). La vía también fija cómo de ancho tiene que ser el morro justo donde el morro quiere ser estrecho.',
    masAlto: {
      ventajas: [
        'Más estabilidad en curva y contra el viento lateral; menos balanceo.',
        'Más sitio entre las ruedas para los pies y la cremallera.',
      ],
      desventajas: [
        'La rueda girada a 22° y hundida se sale de la carrocería: −15,6 cm con 1,35 m (modelo); hay que ensanchar el morro o activar la Opción Jaguar.',
        'Torretas de suspensión más fuera: −9,0 cm (modelo).',
        'Más ancho de carrocería necesario, con su +5,9 % de área frontal por cada 10 cm.',
      ],
    },
    masBajo: {
      ventajas: [
        'La rueda girada casi cabe (−3,1 cm con 1,10 m) y las torretas mejoran a −6,5 cm (modelo).',
        'Permite un morro más estrecho en planta, más de gota.',
        'Menos fricción al girar parado.',
      ],
      desventajas: [
        'Menos margen al vuelco en curva y más balanceo; el tándem pone a las dos personas en el eje, lo que ayuda.',
        'Las dos ruedas más juntas en una carrocería ancha dejan dos «hombros» huecos a cada lado: peso de piel sin función.',
      ],
    },
    referencias: [
      'Renault Twizy: 1,094 m delante (ficha técnica, auto-data.net).',
      'Aptera 2e: 80,5 pulgadas = 2,04 m delante, con las ruedas fuera del cuerpo (Green Car Reports).',
      'VW XL1: vías no publicadas en la ficha que he consultado (Wikipedia no las da).',
      'Shell UrbanConcept del SwRI: 1,15 m (ficha SwRI); el SZEmission ≈ 0,96–1,00 m, estimado.',
    ],
    relacionados: ['W', 'viaR', 'neumF', 'fMorro', 'posMorro', 'jaguar', 'clear'],
    comprobaciones: [C.ruedaF, C.torretas],
  },

  viaR: {
    nombre: 'Vía trasera',
    queEs: 'La distancia entre los centros de las dos ruedas traseras, en metros (1,00 m). Es más estrecha que la delantera (1,22 m) para que la cola pueda cerrarse en planta sin que las ruedas asomen.',
    porQueImporta: 'La vía trasera decide cuánto puede estrecharse la cola, que es donde se gana el Cd. En el SZEmission la trasera es ≈ 0,80 m frente a ≈ 1,00 delante, y por eso su planta es una gota; en el Twizy son casi iguales (1,08 y 1,09) y la cola es un cubo. El modelo lo enseña en la rueda trasera hundida: −10,0 cm con 0,90 m, −12,4 con 1,00, −18,2 con 1,20. Las traseras llevan el motor (palieres de 0,16 a vía/2 − 0,10 m): una vía estrecha deja palieres cortos, que es más barato pero exige ángulos de homocinética mayores con la suspensión hundida.',
    masAlto: {
      ventajas: [
        'Más estabilidad trasera y menos tendencia a levantar la rueda interior en curva (con el motor detrás pesa).',
        'Palieres más largos, con menos ángulo: duran más.',
      ],
      desventajas: [
        'La rueda trasera hundida roza −18,2 cm con 1,20 m (modelo): obliga a una cola ancha (colaA1 alto) y eso es +4,9 % de Cd.',
        '+0,13 m² de carrocería (modelo).',
      ],
    },
    masBajo: {
      ventajas: [
        'Cola más estrecha en planta sin que las ruedas asomen: rueda hundida −10,0 cm con 0,90 m (modelo).',
        'Es la receta de la gota del SZEmission (≈ 0,80 m).',
      ],
      desventajas: [
        'Menos estabilidad del eje que lleva el motor; por debajo de 0,9 m el coche empieza a parecer un triciclo.',
        'Palieres muy cortos: ángulos grandes en las juntas con la suspensión hundida.',
        'La reductora con diferencial (0,20 m de ancho) y dos palieres necesitan sitio entre las ruedas.',
      ],
    },
    referencias: [
      'Renault Twizy: 1,080 m detrás (ficha técnica, auto-data.net).',
      'SZEmission: ≈ 0,80 m detrás, estimado en fotos; el reglamento UrbanConcept pide un mínimo que el código fija en 0,80 m (comentario del código, no verificado en el reglamento).',
      'Aptera: una sola rueda trasera (Wikipedia): la vía trasera es cero, y de ahí su cola de pez.',
    ],
    relacionados: ['viaF', 'W', 'colaA1', 'neumR', 'B', 'jaguar'],
    comprobaciones: [C.ruedaR, C.motor],
  },

  clear: {
    nombre: 'Altura de los bajos',
    queEs: 'La altura libre del fondo de la carrocería al suelo, en metros (19 cm). Sube y baja todo el interior con ella: suelo del chasis (bajos + 4,5 cm), batería, asientos, ocupantes, volante y pedales; las ruedas se quedan en el suelo y la suspensión se estira hasta ellas. La cubierta y el techo no se mueven.',
    porQueImporta: 'Es un deslizador con dos caras. Subir los bajos saca ruedas del aire (parte de la rueda asoma por debajo de la carrocería y es lo que más estropea el Cd: el modelo suma 0,30 × (área de rueda asomada / área frontal)): con 12 cm el Cd baja un 7,2 % y con 25 cm sube un 7 %. Pero como el techo no se mueve, subir el suelo aplasta el interior: con 25 cm la cabeza del piloto toca (0 cm), las rodillas quedan a −9,9 cm y el motor a −7 cm; con 12 cm todo eso cabe (modelo). Los bajos son también lo que raspa en badenes y rampas y lo que decide si el coche es «de carretera» (los L7e-B todoterreno exigen ≥ 18 cm; para L7e-A no hay mínimo en el reglamento que he leído).',
    masAlto: {
      ventajas: [
        'Badenes, rampas de garaje y bordillos sin rascar la panza de carbono.',
        'Más sitio bajo el suelo para colgar la batería hacia abajo (`altBat`).',
        '−5,3 % de área frontal con 25 cm porque la carrocería se acorta en vertical (modelo), aunque el Cd suba más.',
      ],
      desventajas: [
        'Cd +7 % con 25 cm (más rueda al aire) y CdA +1,3 % (modelo).',
        'El interior se aplasta contra el techo fijo: cabeza 0 cm, rodillas −9,9 cm, volante 3,3 cm, motor −7,0 cm, puerta −26 cm con 25 cm (modelo).',
        'Centro de gravedad más alto: menos margen al vuelco y más balanceo.',
        'Suspensión más larga (brazos y amortiguadores) para llegar a las ruedas.',
      ],
    },
    masBajo: {
      ventajas: [
        'Cd −7,2 % con 12 cm: menos rueda asomando (modelo).',
        'Todo cabe: rodillas OK, motor OK, puerta −12,7 cm con 12 cm (modelo).',
        'Centro de gravedad más bajo; es la altura del Twizy (12 cm).',
      ],
      desventajas: [
        'Rasca en badenes y rampas; con la suspensión hundida 9 cm quedan 3 cm.',
        '+6,2 % de área frontal con 12 cm (la carrocería crece hacia abajo) y +1,7 kg; el CdA sólo mejora 1,4 % (modelo).',
        'La batería (a 4,5 cm + 0,5 cm sobre el fondo) queda a 17 cm del asfalto: cualquier piedra grande la encuentra.',
      ],
    },
    referencias: [
      'Renault Twizy: 120 mm (ficha técnica, auto-data.net).',
      'Aptera 2e: 5 pulgadas = 12,7 cm (Green Car Reports).',
      'SZEmission: ≈ 13 cm en las fotos; el reglamento UrbanConcept exige ≥ 100 mm (ficha SwRI).',
      'VW XL1: no publicado en la ficha consultada.',
      'L7e-B (todoterreno): ≥ 180 mm; para L7e-A y L7e-C el anexo I no fija mínimo (Reglamento 168/2013).',
    ],
    relacionados: ['H', 'deck', 'altBat', 'nL', 'neumF', 'neumR', 'altPil'],
    comprobaciones: [C.cabezaPil, C.cabezaPas, C.rodillasPil, C.volante, C.motor, C.puertaAlto, C.batPanza, C.torretas],
  },

  neumF: {
    nombre: 'Neumáticos delanteros',
    queEs: 'La medida del neumático delantero, de la lista de tamaños de coche pequeño: por defecto 125/80 R13, el del Twizy (12,5 cm de ancho, 53 cm de diámetro). El primer número es el ancho en mm, el segundo la altura del flanco en % del ancho, el tercero la llanta en pulgadas.',
    porQueImporta: 'El neumático fija tres cosas: cuánto asoma por debajo de la carrocería (el modelo cuenta ancho × 2 × bajos como área al aire, y eso castiga el Cd), cuánto sitio necesita en el paso de rueda al girar 22° y hundirse 9 cm, y cuánto peso aguanta (índice de carga: el 125/80 R13 del Twizy, índice 65, admite 290 kg). Un neumático más ancho agarra más y frena mejor, pero pesa más, rueda peor y cuesta más carenar: pasar de 125 a 145 mm delante son +1,2 % de Cd y +1,1 % de consumo (modelo), y a 175/65 R15 +3,1 % de Cd, +2,7 % de consumo y una rueda que ya no cabe girada (−14,5 cm). El modelo usa una rodadura fija (0,009) para todos: no distingue el neumático «eco» del normal, y esa diferencia real es grande (un 20–30 % de la resistencia a baja velocidad).',
    masAlto: {
      ventajas: [
        'Más agarre y frenada (más goma en el suelo), útil con 32 kW de pico.',
        'Más capacidad de carga: margen para el pasajero y el equipaje.',
        'Más diámetro = menos revoluciones del motor y mejor sobre baches.',
      ],
      desventajas: [
        '+2,7 % de consumo con 175/65 R15 (modelo); más masa no suspendida.',
        'No cabe girada: −14,5 cm con 175/65 R15; torretas −10,5 cm (modelo).',
        'Más caro y más pesado (el modelo no cambia el peso de la rueda con el tamaño; hay que ajustar «Una rueda con neumático» a mano).',
      ],
    },
    masBajo: {
      ventajas: [
        'Menos rueda al aire: el 125/80 R13 es el más estrecho de la lista y el de mejor Cd del modelo.',
        'Cabe mejor en un morro estrecho; es exactamente lo que monta el Twizy.',
        'Más barato y más ligero.',
      ],
      desventajas: [
        'Menos agarre: con lluvia y 32 kW de pico, el 125 es justo.',
        'Índice de carga 65 (290 kg por rueda): el modelo lo comprueba y hoy sobra (96 kg de margen), pero con batería y dos personas no hay mucho más que crecer.',
        'Oferta de neumáticos «eco» muy corta en 125/80 R13.',
      ],
    },
    referencias: [
      'Renault Twizy: 125/80 R13 delante (ficha técnica, auto-data.net).',
      'VW XL1: 115/80 R15 delante, según la prensa de 2013 (no verificado en una ficha oficial).',
      'Aptera 2e: no publicado en la fuente consultada.',
      'Velomóvil Quest: 28-406 delante (velomobiel.nl), ruedas de bicicleta: 2,8 cm de ancho.',
    ],
    relacionados: ['neumR', 'viaF', 'clear', 'fMorro', 'jaguar', 'W'],
    comprobaciones: [C.ruedaF, C.torretas, C.cargaNeum],
  },

  neumR: {
    nombre: 'Neumáticos traseros',
    queEs: 'La medida del neumático trasero: por defecto 145/80 R13, el del Twizy (14,5 cm de ancho, 56 cm de diámetro). Detrás van más anchos porque es el eje que empuja (motor, reductora y palieres).',
    porQueImporta: 'El eje trasero lleva la tracción y, con el motor detrás del pasajero, más peso: el neumático trasero es el que convierte los 32 kW en empuje sin patinar (el modelo limita la aceleración al 85 % del peso sobre el eje trasero). Es también el que tiene que caber en la cola, que se estrecha: hundido ya roza −12,4 cm con 145/80 R13 y −19,3 cm con 175/65 R15 (modelo). En Cd pesa menos que el delantero porque la cola lo tapa más: +1,8 % con 175/65 R15.',
    masAlto: {
      ventajas: [
        'Más tracción y frenada en el eje que empuja; mejor 0–50 km/h.',
        'Más capacidad de carga en el eje que lleva motor y pasajero.',
      ],
      desventajas: [
        'No cabe hundido: −19,3 cm con 175/65 R15; torretas −10,5 cm (modelo).',
        '+1,6 % de consumo con 175/65 R15 (modelo).',
        'Obliga a una cola más ancha (colaA1 alto) o a la Opción Jaguar.',
      ],
    },
    masBajo: {
      ventajas: [
        'Cola más estrecha posible; menos consumo.',
        'Misma medida delante y detrás (125/80 R13) = una sola rueda de repuesto y neumáticos rotables.',
      ],
      desventajas: [
        'Menos tracción con 32 kW de pico y lluvia.',
        'Índice de carga más justo en el eje más cargado.',
      ],
    },
    referencias: [
      'Renault Twizy: 145/80 R13 detrás (ficha técnica, auto-data.net).',
      'VW XL1: 145/55 R16 detrás, según la prensa de 2013 (no verificado en ficha oficial).',
      'Velomóvil Quest: 50-559 detrás (velomobiel.nl).',
    ],
    relacionados: ['neumF', 'viaR', 'colaA1', 'B', 'jaguar', 'clear'],
    comprobaciones: [C.ruedaR, C.torretas, C.cargaNeum, C.motor],
  },

  // ── Puertas y plazas ──────────────────────────────────────────────────────
  puerta: {
    nombre: 'Tipo de puerta',
    queEs: 'Cómo se entra: alas de gaviota (la ventanilla con su costado y el panel lateral suben juntos, bisagra en el canto del techo; el techo no se mueve), cúpula basculante (toda la cúpula gira hacia delante, como en un ultraligero) o laterales tipo Aptera (panel y media cúpula con bisagra delante, inclinada, que sube al abrirse).',
    porQueImporta: 'No cambia ni el peso ni la aerodinámica en el modelo (las tres dan los mismos números); cambia cómo se entra, qué pasa en un vuelco y cuánto sitio hace falta al lado. La gaviota deja el techo fijo (ahí van el arco de seguridad, el panel solar y la bisagra) y abre hacia arriba: necesita altura (unos 1,9 m con la puerta abierta) pero muy poco ancho. La cúpula basculante es la más simple de fabricar y sella mejor, pero si el coche vuelca sobre el techo no se abre, y con lluvia entra todo. La tipo Aptera abre hacia delante y arriba, ocupa poco al lado y es la que Aptera homologa. El reglamento L7e no fija el tipo; la Shell Eco-marathon exige un hueco de 500 × 800 mm (dato del código, no verificado).',
    masAlto: {
      ventajas: [
        'Gaviota (defecto): techo fijo con arco de seguridad y panel; poco ancho al lado; es la elección de Eugenio «como las del Aptera».',
        'Tipo Aptera: abre hacia delante, se puede abrir en un hueco estrecho y sigue la línea de la cúpula.',
      ],
      desventajas: [
        'Gaviota: en un vuelco la puerta queda bloqueada; necesita techo libre para abrir (garajes bajos).',
        'Tipo Aptera: bisagra inclinada cara y compleja; la puerta pesa (panel + media cúpula) y necesita muelles de gas.',
      ],
    },
    masBajo: {
      ventajas: [
        'Cúpula basculante: una sola pieza, sin junta lateral, el mejor sellado y el molde más simple; es lo que llevan los velomóviles y los ultraligeros.',
        'Cúpula basculante: con ella abierta se entra por los dos lados y el pasajero no tiene que pasar por el hueco del piloto.',
      ],
      desventajas: [
        'Cúpula basculante: con la cúpula abierta llueve dentro; en un vuelco no se abre; el pasajero entra por el mismo hueco que el piloto.',
        'Hay que levantar 1,4 m² de policarbonato con su marco: necesita muelles de gas grandes.',
      ],
    },
    referencias: [
      'Aptera 2023: puertas laterales con bisagra delante que suben al abrirse (fotos y prensa; Wikipedia no detalla).',
      'VW XL1: puertas de ala de gaviota con bisagra en el techo y el pilar A (prensa de 2013; Wikipedia no detalla).',
      'Renault Twizy: puertas de tijera opcionales, bisagra delante (ficha Renault; prensa).',
      'Velomóviles Quest/Milan: cúpula o escotilla que se quita o bascula (velomobiel.nl).',
    ],
    relacionados: ['cupW', 'techoW', 'cupX0', 'parabrisas', 'xPil'],
    comprobaciones: [C.puertaAncho, C.puertaAlto, C.arco],
  },

  plazas: {
    nombre: 'Plazas',
    queEs: 'Monoplaza (como el SZEmission) o tándem 1+1 (piloto y pasajero en fila, como el Twizy). En tándem el pasajero va tumbado tipo Fórmula 1 con las piernas a los lados del asiento del piloto, y la batería lleva un módulo bajo cada asiento; en monoplaza el segundo módulo va detrás del piloto.',
    porQueImporta: 'Es la decisión que más pesa sin tocar ningún centímetro de carrocería: el modelo cuenta 80 kg por ocupante y 7 kg por asiento, así que el monoplaza pesa 8 kg menos en vacío y 88 kg menos en marcha, y consume un 5,8 % menos a 100 km/h (40,0 frente a 42,5 Wh/km), con 36 km más de autonomía. En monoplaza todo lo que era pasajero es maletero: 452 L detrás frente a 196 L. El tándem, a cambio, es lo que convierte el coche en un coche: dos personas en 1,55 m de ancho es la ventaja del tándem frente al XL1 (dos plazas escalonadas en 1,67 m) y el Twizy (1,24 m). Para la homologación L7e-A2 son «máximo dos plazas no a horcajadas» en cualquier caso.',
    masAlto: {
      ventajas: [
        'Dos personas con el área frontal de una: es la razón del tándem.',
        'Piernas del pasajero a los lados del asiento del piloto: el coche no crece de largo por la segunda plaza (sólo 0,69 m entre caderas).',
        'Cabe en L7e-A2 (máximo dos plazas, Reglamento 168/2013).',
      ],
      desventajas: [
        '+8,3 kg en vacío y +88 kg en marcha; +5,8 % de consumo a 100 km/h (modelo).',
        'Maletero trasero 452 → 196 L (modelo).',
        'La cúpula tiene que cubrir dos cabezas: la del pasajero está hoy a 0 cm del techo (modelo).',
        'Puerta sólo del piloto: el pasajero entra echando el asiento adelante o por el hueco.',
      ],
    },
    masBajo: {
      ventajas: [
        '−5,8 % de consumo y +36 km de autonomía (modelo).',
        '452 L de maletero detrás; cama completa sin quitar nada.',
        'Cúpula un 22 % más corta en cristal: menos peso, menos calor (modelo).',
        'Es la configuración del SZEmission (95 kg) y de todos los velomóviles.',
      ],
      desventajas: [
        'Un coche de una plaza se vende y se homologa igual, pero se usa menos: no lleva a nadie.',
        'El segundo módulo de batería pasa a la cola, detrás del piloto: más peso en el eje trasero.',
      ],
    },
    referencias: [
      'Renault Twizy: 2 plazas en tándem, 1,237 m de ancho (ficha técnica, auto-data.net).',
      'VW XL1: 2 plazas escalonadas («staggered side-by-side»), 1,666 m (Wikipedia).',
      'Aptera 2023: 2 plazas lado a lado, 2,225 m de ancho (Wikipedia).',
      'SZEmission: 1 plaza, 95 kg (SZEnergy Team). Twike: 2 plazas lado a lado en 1,55 m (Wikipedia, Twike 5).',
    ],
    relacionados: ['xPas', 'recPas', 'altPas', 'cupX1', 'techo', 'B'],
    comprobaciones: [C.cabezaPas, C.hombrosPas, C.rodillasPas, C.piesPas, C.batCabe, C.cargaNeum],
  },

  // ── Interior ──────────────────────────────────────────────────────────────
  xPil: {
    nombre: 'Piloto: cadera al eje delantero',
    queEs: 'Dónde va sentado el piloto: la distancia de su cadera al eje delantero, hacia atrás, en metros (0,62 m). El volante, el reposapiés y el salpicadero se colocan respecto a la cadera, así que se mueven con ella; el arco de seguridad va 30 cm detrás de su cuello y la puerta llega hasta el arco.',
    porQueImporta: 'Mueve al piloto entero (y todo lo que cuelga de él) a lo largo del coche sin cambiar la forma. Hacia delante gana cola (cama 0,97 → 1,10 m con 0,50 m) pero mete los pies en el morro estrecho: maletero delantero 75 → 51 L, rodillas −5,5 cm, volante a 3,4 cm de la cúpula y la puerta pierde 5 cm. Hacia atrás (0,75 m) es lo contrario: 113 L de maletero delantero, rodillas −2,9 cm, pero la cabeza entra bajo la bajada del techo (3,0 → 2,3 cm) y el pasajero (cuyo mínimo es xPil + 0,60) se va a la cola. Es también el reparto de peso: el piloto a 0,62 m del eje delantero en una batalla de 2,05 m pone el 70 % de sus 80 kg sobre el eje delantero.',
    masAlto: {
      ventajas: [
        'Pies en la zona ancha del morro: maletero delantero 75 → 113 L, rodillas −4,1 → −2,9 cm con 0,75 m (modelo).',
        'Puerta más larga hacia delante: hueco −20 → −16 cm (modelo).',
        'Más peso sobre el eje trasero (el que tracciona).',
      ],
      desventajas: [
        'La cabeza entra en la bajada del techo: 3,0 → 2,3 cm (modelo); el arco de seguridad y la puerta se van atrás.',
        'El pasajero se desplaza con él (mínimo xPil + 0,60): cama 0,97 → 0,85 m (modelo).',
        'Menos visibilidad del morro: el capó se alarga delante de los ojos.',
      ],
    },
    masBajo: {
      ventajas: [
        'Más cama y maletero detrás: 0,97 → 1,10 m con 0,50 m (modelo).',
        'Ojos más cerca del parabrisas: más visión del suelo cercano.',
        'Más peso delante: dirección más aplomada.',
      ],
      desventajas: [
        'Los pies se meten en el morro estrecho: rodillas −5,5 cm, maletero delantero 51 L (modelo).',
        'El volante queda a 3,4 cm de la cúpula (mínimo 4) y la puerta pierde 5 cm (modelo).',
        'Los pies quedan sobre el eje delantero: en un choque frontal, lo primero que entra.',
      ],
    },
    referencias: [
      'VW XL1 y Twizy: posición del asiento no publicada en las fichas consultadas.',
      'Velomóvil Quest: asiento reclinado 35–40°, pies por delante de la rueda delantera (velomobiel.nl).',
      'Eugenio fijó 0,62 m el 2026-11-06 a las 23:08 (configuración base).',
    ],
    relacionados: ['xPas', 'recPil', 'altPil', 'volDist', 'pedDist', 'fMorro', 'cupX0'],
    comprobaciones: [C.cabezaPil, C.rodillasPil, C.piesPil, C.volante, C.puertaAlto, C.puertaAncho, C.arco],
  },

  xPas: {
    nombre: 'Pasajero: cadera al eje delantero',
    queEs: 'Dónde va la cadera del pasajero, hacia atrás del eje delantero, en metros (1,31 m: 0,69 m detrás de la del piloto). El deslizador no le deja acercarse a menos de 0,60 m del piloto ni alejarse más de 1,20 m. Sólo en tándem.',
    porQueImporta: 'El pasajero va tumbado con las piernas a los lados del asiento del piloto, así que lo que importa es cuánto se solapa con él y cuánta cola deja detrás. Cerca (1,22 m) deja 234 L de maletero trasero; lejos (1,45 m), 148 L (modelo). La cabeza del pasajero es hoy el punto más crítico de la cúpula (0 cm): cuanto más atrás, más baja el techo sobre ella (el modelo con 1,45 la deja en 0 cm también porque el techo cae en toda la cola). El reparto de peso también: a 1,31 m en una batalla de 2,05, el 64 % de sus 80 kg va al eje trasero.',
    masAlto: {
      ventajas: [
        'Más sitio entre los dos: las rodillas del pasajero (36 cm de margen) y las del piloto no se tocan.',
        'Más peso sobre el eje trasero (tracción).',
      ],
      desventajas: [
        'Maletero trasero 196 → 148 L con 1,45 m (modelo).',
        'La cabeza va bajo un techo que ya baja: hay que subir «Caída del techo» o el alto total.',
        'Los pies del pasajero (0,96 m delante de su cadera) se acercan al salpicadero del piloto.',
      ],
    },
    masBajo: {
      ventajas: [
        'Maletero trasero 196 → 234 L con 1,22 m (modelo).',
        'Cabeza bajo la parte alta del techo.',
        'Peso más centrado.',
      ],
      desventajas: [
        'Las piernas del pasajero abrazan el asiento del piloto: por debajo de 0,60 m de separación el deslizador no deja.',
        'Los pies del pasajero llegan al reposapiés del piloto; el respaldo del piloto (reclinado 39°) cae sobre el pecho del pasajero.',
      ],
    },
    referencias: [
      'Renault Twizy: tándem con el pasajero justo detrás, con las piernas a los lados del asiento delantero (descripción de Renault; cifra no publicada).',
      'Eugenio fijó 1,31 m el 2026-11-06 a las 23:08.',
    ],
    relacionados: ['xPil', 'recPas', 'altPas', 'plazas', 'techo', 'cupX1', 'B'],
    comprobaciones: [C.cabezaPas, C.hombrosPas, C.rodillasPas, C.piesPas, C.arco],
  },

  recPil: {
    nombre: 'Reclinado del piloto',
    queEs: 'Cuánto se tumba el respaldo del piloto, en grados desde la vertical (39°). La cabeza no va con el tronco: el cuello la endereza hasta un tercio del ángulo (reposacabezas casi vertical), como en un velomóvil.',
    porQueImporta: 'Es la manera de bajar la cabeza sin bajar el asiento: el hombro va 50 cm por encima de la cadera a lo largo del tronco, así que pasar de 39° a 25° lo sube 6,4 cm (0,5 × cos 25° − 0,5 × cos 39°) y la cabeza llega a tocar la cúpula (0 cm); pasar a 50° lo baja 6,7 cm y la deja con margen (modelo). Tumbado es más aerodinámico (menos alto total) y más cómodo en viajes largos (los velomóviles van a 35–40°), pero peor para ver por encima del capó, para mirar atrás y para entrar; un respaldo muy tumbado también hace que el cinturón trabaje mal en un frenazo (el cuerpo se desliza por debajo: «submarining»). La cama detrás se acorta al tumbar: 1,08 m a 25°, 0,91 m a 50°.',
    masAlto: {
      ventajas: [
        'Cabeza más baja: permite un alto total menor (cada 10 cm de alto son 5 % de consumo).',
        'Postura de velomóvil, descansada en viajes largos.',
        'Cabeza del piloto con margen sobre la cúpula a 50° (modelo).',
      ],
      desventajas: [
        'Peor visión por encima del capó y hacia atrás; cuesta más entrar y salir.',
        'El cinturón trabaja mal con el tronco tumbado: riesgo de deslizarse bajo él en un frenazo.',
        'El respaldo invade la cama: 0,97 → 0,91 m a 50° (modelo).',
        'Postura de conducir con volante poco natural por encima de ≈ 45°.',
      ],
    },
    masBajo: {
      ventajas: [
        'Postura de coche normal (los turismos van a 20–28°): mejor visión, mejor cinturón, entrar y salir fácil.',
        'Más cama detrás: 1,08 m a 25° (modelo).',
      ],
      desventajas: [
        'La cabeza toca la cúpula a 25° (0 cm, modelo): hay que subir el alto total o bajar el asiento.',
        'Más alto de cúpula = más área frontal.',
      ],
    },
    referencias: [
      'Velomóvil Quest: respaldo ajustable entre 35° y 40° (velomobiel.nl).',
      'Turismos: respaldo entre 20° y 28° es lo habitual (dato de diseño de asientos; no tengo una ficha concreta que citar).',
      'Eugenio fijó 39° el 2026-11-06 a las 23:08; el Gota lleva 28°.',
    ],
    relacionados: ['altPil', 'xPil', 'H', 'volAlt', 'volDist', 'parabrisas'],
    comprobaciones: [C.cabezaPil, C.hombrosPil, C.volante, C.rodillasPil],
  },

  recPas: {
    nombre: 'Reclinado del pasajero',
    queEs: 'Cuánto se tumba el respaldo del pasajero, en grados desde la vertical (30°). El deslizador llega a 85°: casi tumbado, tipo Fórmula 1. La cabeza se endereza a un tercio del ángulo, como la del piloto.',
    porQueImporta: 'El pasajero es el que decide la altura de la cúpula en la cola: su cabeza está hoy a 0 cm del techo (modelo). Tumbarlo la baja; sentarlo la sube. Pero a 45° su respaldo invade el maletero trasero (196 → 182 L) y a 20° lo libera (203 L). Un pasajero muy tumbado ve poco, se marea más y necesita que el reposacabezas haga su trabajo; a 85° va acostado, que es la postura de «cama» que Eugenio quiere poder enseñar.',
    masAlto: {
      ventajas: [
        'Cabeza más baja bajo un techo que ya cae; permite una cúpula más baja detrás.',
        'Postura de descanso; a 85° es la cama.',
      ],
      desventajas: [
        'Maletero trasero 196 → 182 L a 45° (modelo).',
        'Visión casi nula y más mareo; el cinturón protege peor.',
        'El respaldo tumbado necesita largo de cola: compite con el motor y el maletero.',
      ],
    },
    masBajo: {
      ventajas: [
        'Maletero trasero 196 → 203 L a 20° (modelo).',
        'Pasajero sentado como en un coche: ve, habla, se abrocha bien.',
      ],
      desventajas: [
        'La cabeza sube: con la cúpula por defecto ya está a 0 cm (modelo), así que sentarlo obliga a subir el techo o la «Caída del techo».',
        'Sentado más derecho, los hombros se acercan a los costados de la cúpula, que se estrechan hacia la cola.',
      ],
    },
    referencias: [
      'Renault Twizy: pasajero sentado casi vertical detrás del piloto (ficha Renault; cifra no publicada).',
      'Eugenio fijó 30° el 2026-11-06 a las 23:08.',
    ],
    relacionados: ['xPas', 'altPas', 'techo', 'cupX1', 'plazas', 'H'],
    comprobaciones: [C.cabezaPas, C.hombrosPas, C.arco],
  },

  altPil: {
    nombre: 'Altura del asiento del piloto',
    queEs: 'Cuánto sube la cadera del piloto por encima del módulo de batería sobre el que apoya el asiento, en metros (6 cm). La cadera queda a suelo del chasis + lo que asoma la batería (9 cm) + este valor: 0,385 m sobre el suelo del chasis y 0,575 m sobre el asfalto con los valores por defecto.',
    porQueImporta: 'Es el cojín: 6 cm es un asiento de velomóvil, 20 cm uno de coche. Cada centímetro sube la cabeza, las rodillas y las manos a la vez, y el modelo está justo: con 12 cm la cabeza toca la cúpula (0 cm), las rodillas pasan a −6,2 cm y el volante a 3,8 cm de la cúpula; con 20 cm el volante toca (0 cm). A cambio, sentado más alto se ve mejor por encima del capó, el cinturón trabaja mejor y se entra con menos esfuerzo. Y en un golpe lateral, la cadera por encima del estribo (a 22 cm sobre el suelo del chasis) es lo que protege.',
    masAlto: {
      ventajas: [
        'Mejor visión sobre el capó y más fácil entrar (la cadera cerca del estribo).',
        'Más cojín = más confort; sitio bajo el asiento para cables o un módulo de batería más gordo.',
      ],
      desventajas: [
        'Cabeza contra la cúpula a 12 cm (0 cm), rodillas −6,2 cm, volante 3,8 cm; a 20 cm el volante toca (modelo).',
        'Centro de gravedad más alto.',
        'Obliga a subir el alto total: +5 % de consumo por cada 10 cm.',
      ],
    },
    masBajo: {
      ventajas: [
        'Cabeza, rodillas y volante con el máximo margen: 6 cm es lo mejor que da el modelo.',
        'Centro de gravedad bajo; postura de velomóvil.',
      ],
      desventajas: [
        'Sentado sobre la batería con 6 cm de asiento: cojín fino, hay que confiar en la forma del respaldo.',
        'Peor visión y cuesta más salir (cadera 17 cm por debajo del estribo).',
      ],
    },
    referencias: [
      'Velomóviles: asiento de cáscara con cojín de 1–3 cm, cadera a pocos centímetros del suelo de la cápsula (uso general; cifra no publicada en las fichas consultadas).',
      'Renault Twizy: altura del asiento no publicada en la ficha consultada.',
    ],
    relacionados: ['altBat', 'recPil', 'clear', 'H', 'volAlt', 'pedAlt'],
    comprobaciones: [C.cabezaPil, C.rodillasPil, C.volante, C.hombrosPil],
  },

  altPas: {
    nombre: 'Altura del asiento del pasajero',
    queEs: 'Cuánto sube la cadera del pasajero por encima de su módulo de batería, en metros (6 cm). Igual que la del piloto, pero el pasajero apoya en el módulo trasero (8,5 cm).',
    porQueImporta: 'La cabeza del pasajero es hoy el punto más justo del coche (0 cm a la cúpula con 6 cm de asiento, modelo): subir el asiento la clava en el techo; bajarlo no se puede (6 cm es el mínimo del deslizador). Como el pasajero va tumbado tipo Fórmula 1, un asiento alto tampoco le sirve para ver; lo que gana es cojín y facilidad para entrar por el hueco. La solución para subirlo está en los otros deslizadores: «Caída del techo» más alta o alto total mayor.',
    masAlto: {
      ventajas: [
        'Más cojín; cadera más cerca del estribo para entrar por el hueco.',
        'Las piernas, que van a los lados del asiento del piloto, quedan más a la altura de sus codos y menos en el suelo.',
      ],
      desventajas: [
        'Cabeza del pasajero contra la cúpula (ya está en 0 cm; con 12 cm, peor) (modelo).',
        'Hombros más cerca de los costados de la cúpula, que se estrechan hacia atrás.',
      ],
    },
    masBajo: {
      ventajas: [
        'Cabeza lo más baja posible bajo el techo que cae; 6 cm es el mínimo y el mejor caso del modelo.',
        'Centro de gravedad más bajo: 80 kg de pasajero que no suben.',
      ],
      desventajas: [
        'Cojín de velomóvil: fino.',
        'Entrar al hueco de atrás tumbándose más.',
      ],
    },
    referencias: [
      'Renault Twizy: plaza trasera elevada respecto a la delantera para ver por encima del piloto (descripción de Renault; cifra no publicada). Aquí es al revés: el pasajero va tumbado.',
    ],
    relacionados: ['altPil', 'recPas', 'xPas', 'techo', 'H', 'altBat'],
    comprobaciones: [C.cabezaPas, C.hombrosPas],
  },

  altBat: {
    nombre: 'Altura de la batería',
    queEs: 'A qué altura van los módulos de batería respecto al suelo del chasis, en metros: 0 = apoyados en el suelo; negativo = bajan hacia la panza (entre el suelo del chasis y el fondo de la carrocería hay 4,5 cm); positivo = suben. Los asientos apoyan sobre los módulos, así que los ocupantes suben y bajan con ellos (cuando el módulo queda bajo el suelo, el asiento apoya en el suelo).',
    porQueImporta: 'La batería de 27 kWh pesa 164 kg (27 000 / 165 Wh/kg): es el 43 % del coche en vacío. Dónde va fija el centro de gravedad y las holguras de todo lo de arriba. Bajarla 5 cm mete a los ocupantes 5 cm más abajo (rodillas −4,1 → −1,9 cm) pero saca los módulos por la panza (−5,0 cm bajo el piloto, modelo): no hay 5 cm entre el suelo del chasis y la piel. Subirla 6 cm levanta al piloto 6 cm: cabeza 0 cm, rodillas −6,2, volante 3,8 (modelo). El sitio que busca Eugenio («más finita y pegada al chasis») es exactamente 0.',
    masAlto: {
      ventajas: [
        'La batería queda lejos del asfalto y de las piedras; más fácil de sacar por arriba para mantenimiento.',
        'Sitio debajo para cableado y refrigeración.',
      ],
      desventajas: [
        'Levanta a los ocupantes: cabeza del piloto 0 cm, rodillas −6,2 cm, volante 3,8 cm con +6 cm (modelo).',
        'Centro de gravedad más alto: 164 kg que suben.',
      ],
    },
    masBajo: {
      ventajas: [
        'Ocupantes más abajo: rodillas −4,1 → −1,9 cm con −5 cm (modelo); centro de gravedad más bajo.',
        'Permitiría un alto total menor.',
      ],
      desventajas: [
        'Los módulos asoman por la panza: −5,0 cm bajo el piloto y −0,9 bajo el pasajero con −5 cm (modelo); sólo hay 4,5 cm de hueco y el fondo sube hacia el morro.',
        'Batería a menos de 17 cm del asfalto: la primera piedra la encuentra; necesita una bandeja de protección (más peso).',
      ],
    },
    referencias: [
      'Renault Twizy: batería de 6,1 kWh y 98 kg bajo el asiento del piloto (ficha Renault).',
      'VW XL1: batería de 5,5 kWh delante del motor, bajo el suelo (prensa 2013; Wikipedia no da la posición).',
      'Modelo: módulos de 9 cm de grosor como máximo, 0,84 m de ancho bajo el piloto (`T_MOD`, `modulos`).',
    ],
    relacionados: ['altPil', 'altPas', 'clear', 'nL', 'H'],
    comprobaciones: [C.batPil, C.batPas, C.batPanza, C.batCabe, C.cabezaPil, C.rodillasPil, C.volante],
  },

  volAlt: {
    nombre: 'Volante: altura',
    queEs: 'Cuánto más alto (+) o más bajo (−) que de serie va el volante, en metros (0 por defecto). De serie el centro del volante está 34 cm por encima de la cadera del piloto; el volante mide 30 cm de diámetro y va inclinado 35°.',
    porQueImporta: 'El volante va entre las rodillas y la cúpula, y las dos cosas están justas: su borde de arriba queda a 9,8 cm del cristal (mínimo 4) y las rodillas a −4,1 cm del salpicadero. Subirlo 8 cm lo deja a 1,8 cm de la cúpula (modelo); bajarlo 8 cm lo acerca a las rodillas (el modelo no mide volante-rodilla, pero existe). Con el tronco reclinado 39°, las manos van 40 cm por delante del hombro: un volante alto obliga a levantar los brazos (cansa), uno bajo roza los muslos al girar.',
    masAlto: {
      ventajas: [
        'Más hueco entre el volante y los muslos: se gira sin rozar y se entra más fácil.',
        'Manos a la altura del pecho con el tronco tumbado: postura más natural a 39°.',
      ],
      desventajas: [
        'Volante a 1,8 cm de la cúpula con +8 cm (modelo); tapa parte de la vista del parabrisas.',
        'Brazos más altos = más cansancio.',
      ],
    },
    masBajo: {
      ventajas: [
        'Vista despejada por encima del volante; más margen a la cúpula.',
        'Postura de volante bajo tipo deportivo.',
      ],
      desventajas: [
        'Roza los muslos al girar y estorba al entrar (el modelo no lo comprueba).',
        'Con las rodillas ya a −4,1 cm, bajar el volante las aprieta más.',
      ],
    },
    referencias: [
      'Renault Twizy y VW XL1: volante fijo, sin regulación en altura (fichas de prensa; sin cifra).',
      'Modelo: centro del volante en cadera + 0,34 m, radio 0,15 m, inclinación 35° (`volante`).',
    ],
    relacionados: ['volDist', 'recPil', 'altPil', 'cupX0', 'parabrisas'],
    comprobaciones: [C.volante, C.rodillasPil],
  },

  volDist: {
    nombre: 'Volante: distancia al piloto',
    queEs: 'Cuánto más lejos (+) o más cerca (−) del piloto va el volante respecto a la posición de serie, en metros (−12 cm por defecto: Eugenio lo acercó). De serie el centro está 44 cm por delante de la cadera.',
    porQueImporta: 'Acercar el volante lo saca de debajo del parabrisas, que baja hacia el morro: con −12 cm el borde de arriba está a 9,8 cm de la cúpula; a 0 cm queda a 3,4 cm y a +10 cm toca (0 cm) (modelo). Alejarlo estira los brazos y mete el volante en la zona del salpicadero, que ya está a −4,1 cm de las rodillas. Es un ajuste de ergonomía: con el tronco a 39° las manos quedan 40 cm delante del hombro, y el volante tiene que estar donde caen.',
    masAlto: {
      ventajas: [
        'Brazos más estirados, postura deportiva; más sitio entre el volante y el pecho (airbag, si lo hubiera).',
        'El volante se aleja de los muslos.',
      ],
      desventajas: [
        'Entra en la bajada del parabrisas: 3,4 cm a 0 cm de ajuste y 0 cm a +10 (modelo).',
        'Se acerca al salpicadero y a las rodillas.',
      ],
    },
    masBajo: {
      ventajas: [
        'Sale de debajo del parabrisas: 9,8 cm de margen con −12 cm (modelo).',
        'Brazos relajados con el tronco reclinado.',
      ],
      desventajas: [
        'Demasiado cerca del pecho: menos espacio para entrar y para girar con los codos.',
        'Tapa el salpicadero (pantalla bajo el parabrisas).',
      ],
    },
    referencias: [
      'Eugenio fijó −12 cm el 2026-11-06 a las 23:08.',
      'Modelo: centro del volante en cadera + 0,44 m hacia delante (`volante`).',
    ],
    relacionados: ['volAlt', 'recPil', 'xPil', 'cupX0', 'parabrisas'],
    comprobaciones: [C.volante, C.rodillasPil],
  },

  pedDist: {
    nombre: 'Pedales: distancia al piloto',
    queEs: 'Cuánto más lejos (+) o más cerca (−) del piloto va el reposapiés (no hay pedales de pedaleo: es donde apoyan los pies y van los pedales de freno y acelerador), en metros (−3 cm por defecto). De serie está 86 cm por delante de la cadera.',
    porQueImporta: 'Fija el ángulo de las rodillas: con las piernas de 45 + 47 cm del maniquí, un reposapiés a 83 cm de la cadera deja la rodilla doblada y alta (a −4,1 cm del salpicadero); alejarlo 10 cm estira la pierna y baja la rodilla (OK en el modelo), acercarlo 12 cm la sube hasta −11,6 cm. Es también el maletero delantero: los pies marcan dónde empieza (75 L por defecto, 44 L con los pies 10 cm más adelante, 103 L con 12 cm más atrás). Un reposapiés muy lejos mete los pies en el morro, donde el modelo comprueba «Pies del piloto dentro del morro» (5,8 cm de margen hoy).',
    masAlto: {
      ventajas: [
        'Rodillas más bajas: caben bajo el salpicadero con +10 cm (modelo).',
        'Pierna estirada, postura de velomóvil/F1.',
      ],
      desventajas: [
        'Maletero delantero 75 → 44 L con +10 cm (modelo).',
        'Pies más dentro del morro, hacia el eje delantero y la cremallera: la holgura de los pies baja.',
        'Pierna demasiado estirada = menos fuerza en el pedal de freno.',
      ],
    },
    masBajo: {
      ventajas: [
        'Maletero delantero 75 → 103 L con −12 cm (modelo).',
        'Pies lejos del eje delantero (mejor en un choque frontal).',
      ],
      desventajas: [
        'Rodillas altas contra el salpicadero: −11,6 cm con −12 cm (modelo).',
        'Postura de rodillas dobladas: incómoda en viajes largos y peor para el cinturón.',
      ],
    },
    referencias: [
      'Modelo: reposapiés en cadera + 0,86 m; muslo 0,45 m y pierna 0,47 m (`reposapies`, `ikKnee`).',
      'Eugenio fijó −3 cm el 2026-11-06 a las 23:08.',
    ],
    relacionados: ['pedAlt', 'xPil', 'recPil', 'fMorro', 'posMorro'],
    comprobaciones: [C.rodillasPil, C.piesPil],
  },

  pedAlt: {
    nombre: 'Pedales: altura',
    queEs: 'Cuánto más alto (+) o más bajo (−) que de serie va el reposapiés, en metros (−8 cm por defecto: Eugenio lo bajó). De serie está 16 cm por encima del suelo del chasis; con −8 cm queda a 8 cm del suelo, sobre el fondo de la carrocería.',
    porQueImporta: 'Junto con la distancia, decide la altura de las rodillas: subir los pies 6 cm sube las rodillas hasta −10,9 cm del salpicadero (modelo). Bajarlos es lo que hizo Eugenio para que las piernas vayan estiradas y bajas, como en un velomóvil, y de paso para que las rodillas no choquen con el salpicadero; el deslizador no deja bajar más de −8 cm porque debajo está el suelo. Unos pies altos son la postura de Fórmula 1 (pies por encima de la cadera), que es la que menos altura de cúpula necesita pero la que peor sienta a las piernas en atascos.',
    masAlto: {
      ventajas: [
        'Pies más lejos del fondo de la carrocería: sitio debajo para la cremallera de dirección y el cargador.',
        'Postura F1 con pies altos: permite una cabina más baja si los muslos van planos.',
      ],
      desventajas: [
        'Rodillas más altas: −10,9 cm al salpicadero con +6 cm (modelo).',
        'Pies por encima de la cadera cansan en ciudad; peor circulación en viajes largos.',
      ],
    },
    masBajo: {
      ventajas: [
        'Rodillas más bajas y piernas estiradas: es el mejor caso del modelo (−4,1 cm, aún roza).',
        'Postura de velomóvil, cómoda.',
      ],
      desventajas: [
        'El reposapiés queda a 8 cm del suelo del chasis: no cabe nada debajo (cremallera y cargador se van a los lados).',
        'Pies bajos y adelante = justo donde el morro es más estrecho en vertical.',
      ],
    },
    referencias: [
      'Modelo: reposapiés en suelo del chasis + 0,16 m (`reposapies`).',
      'Eugenio fijó −8 cm el 2026-11-06 a las 23:08.',
    ],
    relacionados: ['pedDist', 'xPil', 'clear', 'altPil', 'nL'],
    comprobaciones: [C.rodillasPil, C.piesPil],
  },
};
