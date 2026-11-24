// The second strategy (2026-11-24): «Cuadriciclo estilo bicicleta». Eugenio: «créame también una estrategia nueva,
// aparte de la anterior, que sea el desarrollo de un cuadriciclo estilo bicicleta y escoge la opción de comprar un
// cuadriciclo ya casi hecho en China para modificarlo a mi diseño de velomobile».
//
// Same rules as `arbol.ts`: `comprobado: 'leido'` only when the source in `fuentes` was read and says it; the page is
// public, so no personal figures. Ids start with `b-` (the root is `bici`) so they never collide with the first tree.
// What was read on 2026-11-24, and what was NOT:
//  - read: DGT's Instrucción 2019/S-149 TV-108 (pedal-assist bicycles, L1e-A, what needs registration); the European
//    Commission's notice of 24-1-2025 extending the duties on Chinese e-bikes; one reseller's page of a Chinese
//    four-wheeled recumbent (TrikExplor F426E); bike-magazin.de on EN 17860; the Podbike Frikar road test;
//  - not read (the pages did not open from here): the two EUR-Lex regulations with the product definition and each
//    company's duty rate, the Ministry of the Interior's note on pedal-assist bicycles, any Chinese maker's own
//    specification sheet, EN 15194 and EN 17860 themselves (they are sold, not published).
import type { NodoEstrategia } from './arbol';

const F = {
  dgt: { titulo: 'DGT: Instrucción 2019/S-149 TV-108, vehículos ligeros de motor eléctrico', url: 'https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/muevete-con-seguridad/normas-de-trafico/S-sanciones/Intruccion-VMP-y-otros-vehiculos-ligeros.pdf' },
  aranceles: { titulo: 'Comisión Europea (24-1-2025): la UE prorroga los derechos sobre las bicicletas eléctricas de China', url: 'https://policy.trade.ec.europa.eu/news/eu-extends-duties-electric-bicycles-china-2025-01-24_en' },
  f426: { titulo: 'TrikExplor F426E, cuadriciclo reclinado eléctrico (página de un revendedor)', url: 'https://reach.dog/shop/trikexplor/products/4wd-electric-off-road-fat-tire-recumbent-quad' },
  en17860: { titulo: 'BIKE Magazin (2023): la norma europea EN 17860 de bicicletas de carga', url: 'https://www.bike-magazin.de/en/specials/mobility/cargobikes-europe-s-new-standard-for-cargo-bikes/' },
  quattrovelo: { titulo: 'Velomobiel.nl: Quattrovelo, datos técnicos', url: 'https://en.velomobiel.nl/quatrevelo/technische_gegevens.php' },
};

export const RAIZ_BICI = 'bici';

export const ARBOL_BICI: NodoEstrategia[] = [
  {
    id: 'bici', padre: null, tipo: 'meta', titulo: 'Un cuadriciclo de pedales con mi carrocería de velomóvil', estado: 'ahora',
    resumen: 'Una estrategia aparte de la del Aeromóvil: un vehículo de cuatro ruedas hecho con piezas de bicicleta, con pedales y ayuda eléctrica, que legalmente sea una bicicleta. La primera victoria: uno rodando por la calle sin matrícula.',
    detalle: [
      'Por qué merece un árbol propio: si el vehículo es legalmente una bicicleta de pedaleo asistido, no hay homologación, ni matrícula, ni ITV. Es la puerta más barata de todas, a cambio de 25 km/h y 250 W.',
      'El editor ya calcula esta versión: «Vehículo de producción (bicicleta)», en el menú de diseños. Con las piezas de bicicleta del catálogo pesa 144 kg en vacío y sus piezas y materiales rondan los 9.400 €.',
      'No sustituye a la estrategia del Aeromóvil: puede ser su primer escalón (aprender a fabricar la carrocería y enseñarla rodando) o un producto distinto.',
    ],
  },

  // ------------------------------------------------------------------ what it is, legally
  {
    id: 'b-legal', padre: 'bici', tipo: 'decision', titulo: '¿Qué es para la ley?', estado: 'ahora',
    resumen: 'Tres cajones posibles. El primero es el único sin papeles; los otros dos exigen matrícula.',
  },
  {
    id: 'b-epac', padre: 'b-legal', tipo: 'opcion', titulo: 'Bicicleta de pedaleo asistido', estado: 'prometedora', comprobado: 'leido',
    resumen: 'Motor de hasta 250 W de potencia continua, que solo ayuda mientras se pedalea y deja de ayudar a 25 km/h. Queda fuera del reglamento europeo de vehículos: sin matrícula, sin carné y sin seguro obligatorio.',
    detalle: [
      'Leído en la instrucción de la DGT: estas bicicletas quedan excluidas del Reglamento (UE) 168/2013 (artículo 2.2.h) y se consideran «bicicleta a todos los efectos».',
      'La instrucción no pone un número máximo de ruedas, ni un ancho, ni un peso para ser bicicleta de pedaleo asistido. Que no lo ponga no es lo mismo que una confirmación: hay que preguntarlo por escrito para un vehículo de cuatro ruedas y carrozado.',
      'Pedaleo sin cadena: no está claro que unos pedales que solo mueven un generador cuenten como «pedaleo asistido». Mientras no se confirme, el primer vehículo puede llevar la cadena de la base y dejar el generador para después.',
      'Sin acelerador: la ayuda tiene que depender de pedalear.',
    ],
    aFavor: ['Sin homologación, matrícula ni ITV', 'Se puede enseñar y probar en la calle desde el primer día', 'Las piezas se compran en tiendas de bicicletas'],
    enContra: ['25 km/h y 250 W: con dos personas y 300 kg en total, el editor calcula que 250 W sostienen unos 20 km/h en llano', 'Las cuatro ruedas, la carrocería y el pedaleo sin cadena están por confirmar', 'No sirve para carretera abierta entre coches'],
    descarta: 'Se descarta si la DGT responde por escrito que un vehículo de cuatro ruedas carrozado no es una bicicleta, o si no se acepta bajar a 250 W y 25 km/h.',
    siguiente: 'Enviar la consulta escrita a la Jefatura Provincial de Tráfico (borrador abajo).',
    fuentes: [F.dgt],
    borrador: {
      para: 'Jefatura Provincial de Tráfico (consulta escrita)',
      asunto: 'Consulta: ciclo de cuatro ruedas con carrocería y pedaleo asistido de 250 W',
      cuerpo: 'Buenos días:\n\nSoy [nombre], de la asociación [nombre de la asociación]. Estamos preparando un ciclo de pedales de cuatro ruedas, con carrocería ligera, para [una / dos] personas, con un motor eléctrico auxiliar de 250 W de potencia nominal continua que solo actúa mientras se pedalea y deja de ayudar a 25 km/h. No lleva acelerador. Medidas previstas: [largo] × [ancho] m, [peso] kg en vacío.\n\nQuerríamos confirmar por escrito:\n1. Si este vehículo se considera bicicleta de pedales con pedaleo asistido, excluida del Reglamento (UE) 168/2013 (artículo 2.2.h), aunque tenga cuatro ruedas y carrocería.\n2. Si hay algún límite de anchura, de peso o de número de plazas para que lo sea.\n3. Si cambia algo que los pedales muevan un generador eléctrico en lugar de una cadena (pedaleo «sin cadena»), con la misma potencia y el mismo corte a 25 km/h.\n4. Por qué vías puede circular (carril bici, calzada urbana, vías interurbanas).\n\nMuchas gracias.\n[nombre y teléfono]',
      contactos: [{ nombre: 'Jefatura Provincial de Tráfico de tu provincia', web: 'https://sede.dgt.gob.es/', nota: 'No he leído un correo publicado para consultas: se presenta por registro electrónico o en la propia Jefatura.' }],
    },
  },
  {
    id: 'b-l1ea', padre: 'b-legal', tipo: 'opcion', titulo: 'Ciclo de motor (L1e-A)', estado: 'por-explorar', comprobado: 'leido',
    resumen: 'El escalón siguiente: pedales con ayuda de hasta 1.000 W, que también se corta a 25 km/h. Ya es un vehículo: matrícula, seguro y permiso AM.',
    detalle: ['Leído en la instrucción de la DGT: la categoría L1e-A admite hasta 1.000 W con corte a 25 km/h, y los ciclos de tres y cuatro ruedas que cumplen sus criterios se tratan igual que los de dos.', 'Exige homologación europea de tipo o individual: es volver al camino de la otra estrategia, con un vehículo más sencillo.'],
    aFavor: ['Cuatro veces más potencia: sube cuestas con dos personas'], enContra: ['Homologación, matrícula y seguro', 'Sigue limitado a 25 km/h'],
    fuentes: [F.dgt],
  },
  {
    id: 'b-l6e', padre: 'b-legal', tipo: 'opcion', titulo: 'Cuadriciclo ligero (L6e)', estado: 'despues',
    resumen: 'Hasta 45 km/h y 4 kW (6 kW si es cerrado). Es la estrategia del Aeromóvil, con su homologación; aquí solo se anota como el techo de esta.',
  },

  // ------------------------------------------------------------------ how to get the first one
  {
    id: 'b-como', padre: 'bici', tipo: 'decision', titulo: '¿De dónde sale el primero?', estado: 'ahora',
    resumen: 'Tres maneras de tener el bastidor rodando. Has elegido la primera.',
  },
  {
    id: 'b-china', padre: 'b-como', tipo: 'opcion', titulo: 'Comprar uno casi hecho en China y modificarlo', estado: 'elegida', comprobado: 'por-confirmar',
    resumen: 'Comprar un cuadriciclo de pedales con ayuda eléctrica ya fabricado, quitarle lo que sobra, adaptarlo a 250 W y montarle tu carrocería de velomóvil.',
    decidido: ['2026-11-24: eliges esta opción.'],
    detalle: [
      'Qué hay: fabricantes chinos de triciclos reclinados venden también cuadriciclos reclinados de pedales con motor. Uno leído: el TrikExplor F426E, de tracción a las cuatro ruedas y rueda ancha, a 7.198 $ en la página de un revendedor, con un motor de buje trasero de 500 W con acelerador. Esa página no da peso, medidas ni carga.',
      'Lo que no encaja de entrada: 500 W y acelerador no son una bicicleta de pedaleo asistido en Europa. Hay que pedirlo con motor de 250 W y sin acelerador, o cambiarlo aquí.',
      'El tamaño es la gran duda: estos cuadriciclos son de una plaza y cortos. Tu «Vehículo de producción» es un biplaza en tándem de 2,79 m entre ejes y 1,12 m de vía. O se alarga el bastidor (y deja de ser «casi hecho»), o la primera carrocería se dibuja para la base que se compre.',
      'Importar tiene un coste que hay que conocer antes de pagar: los aranceles de abajo.',
    ],
    aFavor: ['Un bastidor con dirección, frenos, suspensión y transmisión ya resueltos y probados', 'Semanas en lugar de meses hasta tenerlo rodando', 'Sirve para aprender qué pide la carrocería antes de diseñar un bastidor propio'],
    enContra: ['Una plaza y mucho más corto que tu diseño', 'Aranceles que pueden sumar mucho al precio', 'Quien lo importa y lo modifica responde de él como fabricante', 'Calidad y repuestos: no he leído pruebas independientes de estos modelos'],
    coste: 'Base: del orden de 7.000 $ por lo leído en un revendedor (el precio de fábrica no lo he leído), más transporte, aranceles e IVA.',
    descarta: 'Se descarta si ninguna base tiene la vía y la batalla que tu carrocería necesita, o si con aranceles y transporte cuesta más que construir el bastidor con piezas de bicicleta (≈ 9.400 € de piezas según el editor, con todo lo demás incluido).',
    siguiente: 'Pedir la ficha técnica y el precio a dos o tres fabricantes (borrador abajo) y decidir una plaza o dos.',
    preguntas: [
      '¿El primero puede ser de una sola plaza, o tiene que ser de dos en tándem como el «Vehículo de producción»?',
      '¿Aceptas que la primera carrocería se dibuje a la medida de la base comprada, aunque no sea la definitiva?',
      '¿Qué ancho máximo quieres? (un carril bici suele pedir menos de 1 m; tu diseño mide más)',
      '¿Empezamos con la cadena que traiga la base y dejamos el pedaleo sin cadena para el segundo?',
    ],
    fuentes: [F.f426],
    borrador: {
      para: 'Fabricante chino de cuadriciclos reclinados (en inglés)',
      asunto: 'Quotation request: 4-wheel recumbent pedelec, EU version (250 W, no throttle)',
      cuerpo: 'Hello,\n\nWe are an association in Spain preparing a small project with a four-wheel recumbent pedal cycle. Could you please send us:\n\n1. The full specification sheet of your four-wheel models: length, width, wheelbase, front and rear track, weight without battery, maximum load, wheel and tyre sizes, brakes, suspension travel, steering type.\n2. Whether you can supply an EU version: one 250 W rated motor (or two with 250 W in total), pedal assist only with torque or cadence sensor, no throttle, assistance cut at 25 km/h, with EN 15194 test report and CE declaration.\n3. Whether you can supply the rolling chassis without seat, without fenders and without battery.\n4. Whether the frame can be made longer for two riders in tandem, and with which wheelbase.\n5. A 2D or 3D drawing of the frame (STEP or DXF) to design a body shell around it.\n6. FOB price for 1 unit and for 5 units, lead time, and shipping cost to Valencia or Barcelona, Spain.\n7. Your company name as it appears in EU customs documents (to check the import duty that applies).\n\nThank you,\n[name]\n[association]',
      contactos: [{ nombre: 'TrikExplor / Motrike y fabricantes parecidos', nota: 'No he leído una dirección de correo publicada por ellos: se escribe por el formulario de su web o de su tienda en Alibaba. Conviene pedirlo a dos o tres a la vez.' }],
    },
  },
  {
    id: 'b-china-1', padre: 'b-china', tipo: 'paso', titulo: '1. Elegir la base', estado: 'ahora', comprobado: 'por-confirmar',
    resumen: 'Comparar dos o tres cuadriciclos por sus fichas: vía, batalla, peso, carga y precio de fábrica.',
    detalle: ['Lo que decide: que la vía y la batalla dejen sitio a la carrocería, y que la carga admita el peso de la carrocería más los ocupantes.', 'En el editor, «Vehículo de producción (bicicleta)» da el peso de cada parte de la carrocería para sumarlo.'],
  },
  {
    id: 'b-china-2', padre: 'b-china', tipo: 'paso', titulo: '2. Saber lo que cuesta traerlo', estado: 'por-explorar', comprobado: 'leido',
    resumen: 'La UE cobra derechos especiales a las bicicletas eléctricas chinas, prorrogados cinco años el 24 de enero de 2025.',
    detalle: [
      'Leído en la Comisión Europea: derechos antidumping de entre el 10,3 % y el 70,1 % y derechos compensatorios de entre el 3,9 % y el 17,2 %, según la empresa.',
      'Por confirmar: que un cuadriciclo de pedaleo asistido entre en la definición de «bicicleta eléctrica» de esos reglamentos (no pude abrir su texto), qué tipo tiene la empresa concreta, y el arancel normal y el IVA que se suman.',
      'Un agente de aduanas lo contesta en un día con el nombre del fabricante y la descripción del producto. Preguntarlo antes de pagar.',
    ],
    fuentes: [F.aranceles],
  },
  {
    id: 'b-china-3', padre: 'b-china', tipo: 'paso', titulo: '3. Dejarlo en 250 W, sin acelerador', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Pedirlo así de fábrica o cambiar aquí motor y controlador por unos de bicicleta de 250 W con sensor de pedaleo.',
    detalle: ['El catálogo del editor tiene motores de buje de 250 W (Bafang, Heinzmann, Cixi) y controladores de bicicleta, con peso y precio.', 'Quien importa de fuera de la UE o modifica el vehículo pasa a responder de él como fabricante (marcado CE, norma EN 15194): por confirmar con un laboratorio antes de vender ninguno. Para un prototipo propio, preguntarlo en la misma consulta.'],
  },
  {
    id: 'b-china-4', padre: 'b-china', tipo: 'paso', titulo: '4. Montar la carrocería', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Fabricar la carrocería de velomóvil y fijarla al bastidor comprado.',
    detalle: ['El editor avisa de tres cosas en la versión de bicicleta de tu diseño: con dos personas vuelca antes que el original (0,97 g frente al objetivo de 1,05 g), las rodillas tocan el volante al pedalear, y el bastidor necesita tubo de 55 × 2 mm.', 'Una carrocería cerrada con pedales necesita ventilación: no está calculada.'],
  },
  {
    id: 'b-china-5', padre: 'b-china', tipo: 'paso', titulo: '5. Rodarlo y enseñarlo', estado: 'por-explorar',
    resumen: 'Con la respuesta escrita de Tráfico en la mano: probarlo en la calle y grabarlo.',
  },
  {
    id: 'b-europa', padre: 'b-como', tipo: 'opcion', titulo: 'Partir de uno europeo', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Comprar un velomóvil o un cuadriciclo de pedales hecho en Europa (Quattrovelo, Podbike Frikar) y modificarlo.',
    detalle: ['El Quattrovelo es un velomóvil de cuatro ruedas ya carrozado: sirve de referencia de pesos y de piezas (sus frenos de tambor están en el catálogo del editor).', 'Sin aranceles y ya conforme a la norma europea, pero más caro, y su carrocería no es la tuya.'],
    fuentes: [F.quattrovelo],
  },
  {
    id: 'b-cero', padre: 'b-como', tipo: 'opcion', titulo: 'Construir el bastidor con piezas de bicicleta', estado: 'por-explorar', comprobado: 'por-confirmar',
    resumen: 'Soldar un bastidor propio a la medida de tu diseño y montarle ruedas, frenos, suspensión y motores de bicicleta del catálogo.',
    detalle: ['Es lo que calcula el editor en «Vehículo de producción (bicicleta)»: 144 kg en vacío y unos 9.400 € de piezas y materiales, sin horas de trabajo.', 'Es la única de las tres que da exactamente tu diseño de dos plazas.'],
    aFavor: ['Tu diseño, sin adaptar', 'Sin aranceles'], enContra: ['Meses, no semanas', 'Dirección y suspensión por diseñar y probar'],
  },

  // ------------------------------------------------------------------ what could stop it
  {
    id: 'b-riesgos', padre: 'bici', tipo: 'decision', titulo: 'Lo que puede pararlo', estado: 'por-explorar',
    resumen: 'Tres supuestos que hay que comprobar pronto, porque cualquiera de ellos cambia el plan.',
  },
  {
    id: 'b-r-peso', padre: 'b-riesgos', tipo: 'supuesto', titulo: 'Cabe en el peso de una bicicleta de carga', estado: 'dudosa', comprobado: 'leido',
    resumen: 'La norma europea de bicicletas de carga de varias huellas llega a 300 kg en total. Tu versión de bicicleta con dos personas pesa 304 kg según el editor.',
    detalle: ['Leído en un artículo sobre la norma EN 17860, no en la norma: 250 kg para las de una huella, 300 kg para las de varias huellas y 650 kg para las pesadas.', 'Una norma no es una ley, pero es con lo que se demuestra que el vehículo es seguro. Con una sola plaza, o con un interior más sencillo que el de lujo (que pesa unos 18 kg), entra.'],
    fuentes: [F.en17860],
  },
  {
    id: 'b-r-potencia', padre: 'b-riesgos', tipo: 'supuesto', titulo: 'Con 250 W se mueve con dignidad', estado: 'dudosa', comprobado: 'por-confirmar',
    resumen: 'Cálculo del editor, no una medida: con 304 kg y neumáticos de carga, 250 W sostienen unos 20 km/h en llano, y una cuesta del 3 % pide unos 800 W.',
    detalle: ['Lo que lo mejora: una sola plaza, neumáticos de menos rozamiento, y las piernas (100 W de pedaleo cubren la cuarta parte de lo que pide a 25 km/h).', 'La potencia de pico de un motor de 250 W nominales es mayor que 250 W; cuánto se admite, por confirmar.'],
  },
  {
    id: 'b-r-vuelco', padre: 'b-riesgos', tipo: 'supuesto', titulo: 'No vuelca en una curva', estado: 'dudosa', comprobado: 'por-confirmar',
    resumen: 'Al pesar tan poco, los ocupantes suben el centro de gravedad: el editor da 0,97 g con dos personas, por debajo de su objetivo de 1,05 g para un coche.',
    detalle: ['A 25 km/h una curva se toma con mucha menos fuerza lateral que a 90: el objetivo del editor es el de un coche y aquí sobra. No he leído qué pide la norma de bicicletas de carga.', 'Una base estrecha, de menos de 1 m de ancho, lo empeora.'],
  },
];
