// The «Categorías» window (Eugenio, 2026-11-12): what falls into the basics,
// the secondary, leisure and luxury, sector by sector, so anyone can see which
// tier a purchase pays. The four tiers and their rates live in
// `modeloSocioeconomico.ts` (TRAMOS); this file is the list a person looks up.
//
// This is a first proposal, not a law: where the line is debatable it says so
// in `CASOS_FRONTERA`, and every threshold is for each assembly to set.
import type { Tramo } from './modeloSocioeconomico';

export interface Sector { id: string; nombre: string; tramo: Tramo; ejemplos: string }

export const SECTORES: Sector[] = [
  // Lo básico: what a person needs to live with dignity.
  { id: 'alimentos', nombre: 'Comida y bebidas sin alcohol', tramo: 1, ejemplos: 'Pan, fruta, verdura, legumbres, leche, carne, pescado, huevos, agua embotellada' },
  { id: 'agua', nombre: 'Agua del grifo', tramo: 1, ejemplos: 'El recibo del agua de la vivienda habitual' },
  { id: 'energia', nombre: 'Luz, gas y calefacción de la vivienda habitual', tramo: 1, ejemplos: 'Recibos de luz y gas, bombona, gasóleo de calefacción, leña' },
  { id: 'vivienda', nombre: 'La vivienda en la que se vive', tramo: 1, ejemplos: 'Alquiler, compra o hipoteca de la vivienda habitual, comunidad de vecinos' },
  { id: 'transporte-publico', nombre: 'Transporte público', tramo: 1, ejemplos: 'Autobús, metro, tren de cercanías y de media distancia, taxi para ir al médico' },
  { id: 'primer-vehiculo', nombre: 'El primer vehículo del hogar', tramo: 1, ejemplos: 'Compra, combustible o carga eléctrica, seguro obligatorio, taller, ITV, bicicleta' },
  { id: 'salud', nombre: 'Salud', tramo: 1, ejemplos: 'Medicinas, consultas, dentista, fisioterapia, gafas, audífonos, sillas de ruedas' },
  { id: 'educacion', nombre: 'Educación', tramo: 1, ejemplos: 'Escuela infantil, colegio, universidad, formación profesional, libros de texto, material escolar' },
  { id: 'cuidados', nombre: 'Cuidados', tramo: 1, ejemplos: 'Ayuda a domicilio, centro de día, residencia, cuidado de niños' },
  { id: 'higiene', nombre: 'Higiene y limpieza', tramo: 1, ejemplos: 'Jabón, pasta de dientes, pañales, compresas, papel higiénico, detergente' },
  { id: 'funeraria', nombre: 'Servicios funerarios', tramo: 1, ejemplos: 'Entierro o incineración' },

  // Lo secundario: useful and common, but not what a life depends on.
  { id: 'ropa', nombre: 'Ropa y calzado', tramo: 2, ejemplos: 'Ropa de diario, abrigos, zapatos, ropa de trabajo' },
  { id: 'hogar', nombre: 'Muebles y equipamiento del hogar', tramo: 2, ejemplos: 'Muebles, electrodomésticos, colchones, menaje, textil de casa' },
  { id: 'comunicaciones', nombre: 'Móvil, internet y aparatos', tramo: 2, ejemplos: 'Tarifa del móvil y de internet, ordenadores, tabletas, televisores' },
  { id: 'seguros', nombre: 'Seguros y bancos', tramo: 2, ejemplos: 'Seguro de hogar, de vida y de salud, comisiones bancarias' },
  { id: 'personal', nombre: 'Cuidado personal', tramo: 2, ejemplos: 'Peluquería, cosmética, perfumería corriente' },
  { id: 'segunda-vivienda', nombre: 'Segunda vivienda', tramo: 2, ejemplos: 'La casa del pueblo o de la playa, un trastero, una plaza de garaje que no es la de casa' },
  { id: 'segundo-vehiculo', nombre: 'Segundo vehículo del hogar', tramo: 2, ejemplos: 'El segundo coche o la moto, y su combustible' },
  { id: 'reparaciones', nombre: 'Reparaciones y bricolaje', tramo: 2, ejemplos: 'Obras en casa, fontanero, electricista, herramientas' },
  { id: 'mascotas', nombre: 'Animales de compañía', tramo: 2, ejemplos: 'Pienso, veterinario, accesorios' },
  { id: 'lectura', nombre: 'Libros, prensa y suscripciones', tramo: 2, ejemplos: 'Libros que no son de texto, periódicos, revistas' },

  // El ocio: what is enjoyed in free time.
  { id: 'restaurantes', nombre: 'Restaurantes, bares y cafeterías', tramo: 3, ejemplos: 'Comidas y cenas fuera, cañas, cafés, comida a domicilio' },
  { id: 'alojamiento', nombre: 'Hoteles y alojamientos', tramo: 3, ejemplos: 'Hoteles, apartamentos turísticos, campings, casas rurales' },
  { id: 'viajes', nombre: 'Viajes', tramo: 3, ejemplos: 'Vuelos y trenes de vacaciones, paquetes turísticos, cruceros, excursiones' },
  { id: 'espectaculos', nombre: 'Espectáculos y cultura', tramo: 3, ejemplos: 'Cine, teatro, conciertos, museos, partidos, festivales' },
  { id: 'deporte', nombre: 'Deporte', tramo: 3, ejemplos: 'Gimnasio, clubes, material deportivo, esquí' },
  { id: 'pantallas', nombre: 'Juegos y pantallas', tramo: 3, ejemplos: 'Plataformas de series y música, videojuegos, consolas, juguetes' },
  { id: 'alcohol', nombre: 'Alcohol y tabaco', tramo: 3, ejemplos: 'Vino, cerveza, licores, tabaco, vapeadores' },
  { id: 'apuestas', nombre: 'Juego y apuestas', tramo: 3, ejemplos: 'Loterías, apuestas deportivas, casinos, bingo' },

  // El lujo: what costs far more than something that does the same job.
  { id: 'joyas', nombre: 'Joyas y relojes', tramo: 4, ejemplos: 'Oro, piedras preciosas, relojes de alta gama' },
  { id: 'moda-lujo', nombre: 'Moda y bolsos de lujo', tramo: 4, ejemplos: 'Ropa, bolsos, zapatos y complementos de las grandes marcas de lujo' },
  { id: 'coches-lujo', nombre: 'Coches de alta gama', tramo: 4, ejemplos: 'Deportivos y coches de lujo por encima del precio que fije el umbral' },
  { id: 'barcos', nombre: 'Barcos y aviones privados', tramo: 4, ejemplos: 'Yates, veleros de recreo, avionetas, helicópteros, jets privados, sus amarres y hangares' },
  { id: 'arte', nombre: 'Arte y objetos de colección', tramo: 4, ejemplos: 'Obras de arte, antigüedades, vinos y coches de colección' },
  { id: 'perfumeria-lujo', nombre: 'Cosmética y perfumería de lujo', tramo: 4, ejemplos: 'Perfumes y cremas de las marcas de lujo' },
  { id: 'servicios-lujo', nombre: 'Servicios de lujo', tramo: 4, ejemplos: 'Hoteles de gran lujo, primera clase, clubes privados' },
];

/** How to decide the tier of something not on the list: four questions, in order. */
export const CRITERIOS: { tramo: Tramo; pregunta: string; explica: string }[] = [
  { tramo: 4, pregunta: '¿Cuesta mucho más que algo que hace lo mismo?', explica: 'Un reloj de 5.000 € da la hora igual que uno de 50 €. Si se paga sobre todo la marca o la exclusividad, es lujo.' },
  { tramo: 3, pregunta: '¿Es para disfrutar del tiempo libre?', explica: 'Comer fuera, viajar, un concierto o una copa. Si se compra por placer y no por necesidad, es ocio.' },
  { tramo: 1, pregunta: '¿Sin ello no se puede vivir con dignidad?', explica: 'Comer, tener casa, luz y agua, moverse, curarse, aprender, ser cuidado. Si falta, falta la vida digna: es básico.' },
  { tramo: 2, pregunta: 'Si no es nada de lo anterior', explica: 'Lo útil y corriente que no es imprescindible: ropa, muebles, el móvil, la segunda casa o el segundo coche. Es secundario.' },
];

/** Where the line is debatable, and how this page draws it for now. */
export const CASOS_FRONTERA: { t: string; d: string }[] = [
  { t: 'El primer coche y el segundo', d: 'El primero es básico, porque en muchos pueblos no hay otra forma de ir a trabajar. El segundo del mismo hogar es secundario. Un coche por encima del umbral de precio es lujo, aunque sea el primero.' },
  { t: 'La casa en la que vives y las demás', d: 'La vivienda habitual es básica. La segunda es secundaria. Una vivienda muy por encima del precio medio de su zona podría ser lujo: lo decide el umbral.' },
  { t: 'El menú del día', d: 'Comer fuera es ocio, también el menú del día de quien trabaja lejos de casa. Una salida: que el comedor de empresa o el cheque comida cuente como básico.' },
  { t: 'Ropa de diario y ropa de lujo', d: 'La ropa es secundaria. La de las grandes marcas de lujo, o por encima de un precio por prenda, es lujo.' },
  { t: 'Salud y estética', d: 'Lo que cura o previene es básico. La estética es secundaria, y lujo por encima del umbral.' },
  { t: 'Lo que compran las empresas', d: 'Las categorías solo cuentan cuando compra una persona. Entre empresas, todo paga el 10 %, sea lo que sea, y nadie deduce nada.' },
];

/** Thresholds that turn something into luxury: a proposal, for each assembly to set. */
export const UMBRALES: { t: string; v: string }[] = [
  { t: 'Un reloj o una joya', v: 'más de 1.000 €' },
  { t: 'Una prenda, un bolso o unos zapatos', v: 'más de 500 €' },
  { t: 'Un coche', v: 'más del doble del precio medio de un coche nuevo' },
  { t: 'Una noche de hotel', v: 'más de 500 € por persona' },
];
