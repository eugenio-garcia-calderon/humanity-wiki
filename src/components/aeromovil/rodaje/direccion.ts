// ============================================================================
// STEERING: THE OPTIONS, WHAT IS KNOWN ABOUT EACH, AND THE GEOMETRY BEHIND THEM (2026-11-24)
// ============================================================================
// Eugenio pasted a study of front steering systems for a four-wheel light vehicle with its two front wheels steering and
// asked for «la información más relevante, sobre todo con imágenes del tema de los ángulos, … que la rueda externa tiene
// que girar de forma distinta a la rueda interna, con el sistema Ackermann. Y las opciones que hay».
//
// Pure data, no three.js (the tunnel's Web Worker loads the Triciclo model, which reads this file through `bici/pedales.ts`).
//
// RULE OF THIS FILE (the same as `bici/catalogo.ts`): every figure says whether it is PUBLISHED or ESTIMATED, because both
// are shown. What the pasted study says and we could NOT open ourselves is marked `leido: false` and in the text.
// Opened and read on 2026-11-24:
//  - Gemini Karts «Compact Steering Rack (Complete Pack)»: £138.48 (the page does not say whether VAT is included), 3 kg;
//    rack 531 mm, travel 118 mm («59 mm each side»), 1.25 turns lock to lock, tie rods 200 mm each, and «rack with tie rods, centre to centre
//    of ball joint» 970 mm minimum and 1050 mm maximum (the page does not say it, but it reads as the whole span from one outer ball joint to the other);
//    it holds the rack and pinion, a short upper shaft, two universal joints, two rack clamps, two tie rods and two rod
//    ends (geminikarts.co.uk).
//  - ICE «Steering rod 8 mm»: €29.00, taxes included, weight and length not published (icletta.com).
//  - Intrepid kart tie rods in aluminium, 210–290 mm: €14.92 (210, 220 mm) and €21.45 (230–290 mm), VAT not said
//    (intrepid-kart.com).
//  - TRUBLU 4130 steering kit (crossmember with reamed bushes, kingpin assemblies, track rod, six rod ends, linkages,
//    handlebars): $885, an Australian shop whose page does not say the currency, weight not published
//    (mrrecumbenttrikes.com).
//  - The IHPVA's tadpole-trike front-end page (forum posts by trike builders): toe, caster, scrub radius, Ackermann.
// Not opened (Magickart refused our request): the kart spindles at €69–145 and columns from €25. They are the study's figures.
import { EUR_POR_GBP, type PrecioBici } from '../bici/catalogo';
import type { FuenteOpcion, OpcionRodaje, ParteOpcion } from './tipos';

export const LEIDO_DIRECCION = '2026-11-24';
const L = LEIDO_DIRECCION;
const f = (t: string, url: string, leido: string | false = L): FuenteOpcion => ({ t, url, leido });
const kgDe = (ps: ParteOpcion[]) => +ps.reduce((a, p) => a + (p.kg ?? 0) * p.cantidad, 0).toFixed(2);
const eurDe = (ps: ParteOpcion[]) => Math.round(ps.reduce((a, p) => a + (p.eur ?? 0) * p.cantidad, 0));

const FUENTE_GEMINI = f('Gemini Karts: Compact Steering Rack', 'https://www.geminikarts.co.uk/product/compact-steering-rack/');
const FUENTE_ICE = f('ICE: barra de dirección de 8 mm', 'https://icletta.com/en/products/ice-steering-rod-8-mm');
const FUENTE_BIELETA_KART = f('Intrepid: bieletas de aluminio de kart', 'https://www.intrepid-kart.com/en/parts-and-accessories/steering-system-and-accessories-7/tie-rod-387');
const FUENTE_TRUBLU = f('Mr Recumbent Trikes: kit de dirección TRUBLU 4130', 'https://mrrecumbenttrikes.com/parts/frame/');
const FUENTE_MAGICKART = f('Magickart: manguetas y columnas de dirección (no se pudo abrir)', 'https://magickart.eu/en/543-rocket', false);

// ---------------------------------------------------------------- the parts, option by option
const PARTES_RECLINADO: ParteOpcion[] = [
  { n: 'Barras de dirección de 8 mm', cantidad: 2, kg: 0.12, eur: 29, nota: 'Una a cada lado, del balancín a la mangueta. Las de ICE se venden por unidad y de varias longitudes.', origen: 'comprar', dato: 'publicado' },
  { n: 'Rótulas de las barras', cantidad: 4, kg: 0.04, eur: 8, nota: 'Una en cada extremo de cada barra. Las del kit TRUBLU son seis.', origen: 'comprar', dato: 'estimado' },
  { n: 'Balancín central y su eje', cantidad: 1, kg: 0.25, eur: 25, nota: 'La pieza que convierte el giro de la columna en el empuje de las dos barras. Se fabrica.', origen: 'fabricar', dato: 'estimado' },
  { n: 'Columna con su junta', cantidad: 1, kg: 0.6, eur: 30, nota: 'El tubo de la columna hasta el balancín, con una junta universal.', origen: 'comprar', dato: 'estimado' },
];
const PARTES_KART: ParteOpcion[] = [
  { n: 'Bieletas de aluminio regulables', cantidad: 2, kg: 0.09, eur: 21.45, nota: 'Barras de aluminio mecanizado con terminales roscados: se alargan y acortan para ajustar la convergencia. Precio de las de 230 a 290 mm.', origen: 'comprar', dato: 'publicado' },
  { n: 'Terminales de rótula', cantidad: 4, kg: 0.05, eur: 8, nota: 'Los extremos que se atornillan a las bieletas y a las manguetas.', origen: 'comprar', dato: 'estimado' },
  { n: 'Columna de acero con cardán', cantidad: 1, kg: 1.0, eur: 25, nota: 'Columna de kart con su junta universal. La tienda del estudio las pone «desde 25 €»; no pudimos abrirla.', origen: 'comprar', dato: 'estimado' },
  { n: 'Brazo central y soportes de la columna', cantidad: 1, kg: 0.5, eur: 20, nota: 'Lo que une la columna con las dos bieletas, y sus apoyos al chasis. Se fabrica.', origen: 'fabricar', dato: 'estimado' },
];
const PARTES_PROPIA: ParteOpcion[] = [
  { n: 'Balancín central y su eje', cantidad: 1, kg: 0.3, eur: 25, nota: 'Mecanizado, con la geometría Ackermann que salga del cálculo. Se fabrica.', origen: 'fabricar', dato: 'estimado' },
  { n: 'Bieletas ajustables', cantidad: 2, kg: 0.08, eur: 20, nota: 'Tubo con roscas a derecha e izquierda para ajustar la convergencia.', origen: 'fabricar', dato: 'estimado' },
  { n: 'Rótulas', cantidad: 4, kg: 0.04, eur: 9, nota: 'De acero, o de polímero técnico en las uniones secundarias (ver «Materiales»).', origen: 'comprar', dato: 'estimado' },
  { n: 'Columna con una junta universal', cantidad: 1, kg: 0.7, eur: 40, nota: 'Del volante o el manillar al balancín.', origen: 'comprar', dato: 'estimado' },
  { n: 'Soportes y casquillos del balancín', cantidad: 1, kg: 0.2, eur: 15, nota: 'Los apoyos al chasis y los casquillos donde gira. Se fabrican.', origen: 'fabricar', dato: 'estimado' },
];
const PARTES_CREMALLERA: ParteOpcion[] = [
  { n: 'Cremallera y piñón (531 mm)', cantidad: 1, nota: 'Recorrido máximo de 118 mm (59 a cada lado) y 1,25 vueltas de tope a tope.', origen: 'comprar', dato: 'publicado' },
  { n: 'Eje superior corto', cantidad: 1, nota: 'Del piñón a la columna.', origen: 'comprar', dato: 'publicado' },
  { n: 'Juntas universales', cantidad: 2, nota: 'Con sus horquillas.', origen: 'comprar', dato: 'publicado' },
  { n: 'Soportes de fijación', cantidad: 2, nota: 'Con placa para soldar al chasis.', origen: 'comprar', dato: 'publicado' },
  { n: 'Barras de dirección', cantidad: 2, nota: 'Dos barras de 200 mm con su rótula. Con la cremallera, el conjunto abarca de 970 a 1.050 mm de una rótula exterior a la otra.', origen: 'comprar', dato: 'publicado' },
  { n: 'Rótulas de las barras', cantidad: 2, nota: 'La rótula cónica sale aparte.', origen: 'comprar', dato: 'publicado' },
];

const precioEstimado = (ps: ParteOpcion[], nota: string): PrecioBici => ({ eur: eurDe(ps), tipo: 'estimado', nota });

export const DIRECCION_OPCIONES: OpcionRodaje[] = [
  {
    id: 'reclinado', n: 'Barras y balancín de triciclo reclinado (ICE, Greenspeed)', por: 'toda la dirección',
    resumen: 'La arquitectura de los triciclos reclinados de altas prestaciones: un pivote vertical por rueda, una barra ligera a cada lado y un balancín central. Pensada para vehículos de pedales, así que busca la menor masa.',
    kg: kgDe(PARTES_RECLINADO),
    masa: 'estimada: ni ICE ni Greenspeed publican lo que pesa su dirección. Lo único publicado es el precio de la barra de ICE',
    precio: precioEstimado(PARTES_RECLINADO, 'las dos barras de 8 mm a 29 € cada una son el precio de ICE (icletta.com, impuestos incluidos); el resto es estimado. Un kit de dirección completo TRUBLU 4130 (con travesaño y pivotes) cuesta 885 en una tienda australiana: es más que la dirección, porque trae también el eje delantero'),
    partes: PARTES_RECLINADO,
    pros: ['La más ligera según el estudio (peso potencial «muy bajo»): está pensada para vehículos de pedales', 'Pocas piezas y fáciles de ajustar', 'Piezas de recambio en distribuidores europeos (ICE)'],
    contras: ['Son piezas de cada plataforma: no se puede dar por hecho que unas barras o pivotes de AZUB o ICE se combinen con un chasis propio', 'Con volante hay que adaptar la columna (nacen para manillar)', 'Un kit completo (TRUBLU) cuesta unos 500 € y trae el eje delantero entero'],
    fuentes: [FUENTE_ICE, FUENTE_TRUBLU, f('AZUB: manual técnico (citado por el estudio; no se abrió)', 'https://azub.eu/wp-content/uploads/2022/11/AZUB-recumbent-trikes-ENGLISH-manual.pdf', false)],
  },
  {
    id: 'kart', n: 'Sistema de kart (bieletas, columna y brazo central)', por: 'toda la dirección',
    resumen: 'Los karts usan la misma arquitectura que necesita este vehículo: dos manguetas, brazos de dirección, bieletas y una columna central. Es la forma más rápida de comprar casi todo hecho.',
    kg: kgDe(PARTES_KART),
    masa: 'estimada: las tiendas de kart no publican el peso de las bieletas ni de la columna',
    precio: precioEstimado(PARTES_KART, 'las dos bieletas a 21,45 € son el precio de Intrepid (intrepid-kart.com, sin decir si lleva IVA); la columna «desde 25 €» es del estudio (no pudimos abrir su tienda); el resto es estimado. Las manguetas de kart (69–145 € cada una, según el estudio) cuentan en «Suspensión», no aquí'),
    partes: PARTES_KART,
    pros: ['Componentes comerciales y fáciles de conseguir', 'Se montan y se adaptan rápido', 'Columna y volante ya resueltos'],
    contras: ['Pesa más que un sistema de triciclo (acero y aluminio de competición)', 'No se compraría un eje delantero de kart entero: están pensados para una vía y una geometría de competición concretas', 'No se puede dar por hecho que el ángulo Ackermann de una mangueta de kart sirva: hay que comprobar dónde ancla su brazo'],
    fuentes: [FUENTE_BIELETA_KART, FUENTE_MAGICKART],
  },
  {
    id: 'propia', n: 'Fabricada con geometría Ackermann propia (balancín y bieletas)', por: 'toda la dirección',
    resumen: 'Se fabrica el balancín, las bieletas y los soportes, y se compran solo las rótulas, la junta y la tornillería. Cada rueda tiene su pivote, cada pivote un brazo, dos bieletas llegan a un balancín central y la columna lo mueve.',
    kg: kgDe(PARTES_PROPIA),
    masa: 'estimada, pieza a pieza, para piezas de su clase: aún no hay piezas dibujadas ni pesadas',
    precio: precioEstimado(PARTES_PROPIA, 'estimado, pieza a pieza. El estudio fija un presupuesto de referencia de 200 a 400 € por unidad para TODO el eje delantero (travesaño, soportes de pivote, manguetas, brazos, balancín, columna, rodamientos, ejes, rótulas, bieletas y tornillería), sin ruedas ni frenos ni ingeniería ni validación: es un objetivo, no una oferta de proveedor'),
    partes: PARTES_PROPIA,
    pros: ['La que más se puede optimizar: peso, geometría y coste a la medida', 'Para una serie de 100, una sola mangueta izquierda y otra derecha mecanizadas en lotes', 'Geometría ajustable y sin cremallera de automóvil'],
    contras: ['Hay que diseñarla, calcularla y validarla (ejes, pivotes y uniones críticas se dimensionan por esfuerzo, no por peso)', 'Más trabajo de ingeniería y de taller que comprar un conjunto', 'No hay precio ni peso reales hasta tener las piezas dibujadas'],
    fuentes: [f('Estudio pegado: arquitectura con balancín y bieletas (referencias universitarias citadas; no se abrieron)', 'https://ir.canterbury.ac.nz', false)],
  },
  {
    id: 'cremallera', n: 'Cremallera compacta de kart (Gemini Karts)', por: 'toda la dirección',
    resumen: 'Una cremallera y piñón pequeña con su eje, dos cardanes, dos soportes, dos barras y dos rótulas: una solución de automóvil adaptada a vehículos pequeños. Mecánicamente sencilla de entender y de ajustar.',
    kg: 3.0,
    masa: '3 kg publicados por Gemini Karts: solo este conjunto, sin manguetas, pivotes ni soportes de rueda',
    precio: { eur: Math.round(138.48 * EUR_POR_GBP), tipo: 'publicado', nota: `138,48 £ en geminikarts.co.uk (la página no dice si lleva IVA), ≈ ${Math.round(138.48 * EUR_POR_GBP)} € a ${EUR_POR_GBP.toLocaleString('es-ES')} €/£`, fuente: 'https://www.geminikarts.co.uk/product/compact-steering-rack/' },
    partes: PARTES_CREMALLERA,
    datos: [['Largo de la cremallera', '531 mm'], ['Recorrido máximo', '118 mm (59 mm a cada lado)'], ['Tope a tope', '1,25 vueltas del volante'], ['Cremallera con barras: de rótula a rótula', 'de 970 a 1.050 mm (cada barra mide 200 mm)']],
    pros: ['Es la única de las cuatro con peso y precio publicados', 'Precisa, y tiene un recorrido y una relación de giro conocidos (1,25 vueltas de tope a tope)', 'Todo en una caja: no hay que fabricar nada'],
    contras: ['Es la más pesada de las cuatro', 'Una cremallera no es una dirección Ackermann correcta por tener dos terminales: la geometría y el recorrido tienen que coincidir con tus medidas delanteras', 'Con sus barras (de 200 mm cada una) solo abarca de 970 a 1.050 mm de rótula a rótula: para otra vía hay que cambiar las barras'],
    fuentes: [FUENTE_GEMINI],
  },
];

export const direccionOpcion = (id?: string | null) => DIRECCION_OPCIONES.find(o => o.id === id) ?? null;
export const OPCIONES_DIRECCION_SELECTOR = [{ k: 'medida', n: 'A medida (lo que dice el deslizador de Masas)' }, ...DIRECCION_OPCIONES.map(o => ({ k: o.id, n: o.n }))];

/** The cremallera's published numbers, for the checks against the design (geminikarts.co.uk). */
export const CREMALLERA_GEMINI = { largo: 0.531, recorrido: 0.118, vueltas: 1.25, rotulasMin: 0.970, rotulasMax: 1.050, barra: 0.200 } as const;

// ---------------------------------------------------------------- the study's own table
/**
 * The study's valuation of the four architectures («mi valoración de ingeniería, no una clasificación comercial de los
 * proveedores»): kept as it says it, in its own column order.
 */
export const COMPARATIVA_ESTUDIO = {
  columnas: ['Triciclo reclinado', 'Kart', 'Fabricada (Ackermann propia)', 'Cremallera'],
  filas: [
    ['Peso potencial', 'Muy bajo', 'Medio-alto', 'Bajo', 'Medio'],
    ['Coste de componentes', 'Medio-alto', 'Medio', 'Bajo-medio', 'Medio'],
    ['Facilidad de montaje', 'Media', 'Alta', 'Media-baja', 'Alta'],
    ['Personalización', 'Media', 'Media', 'Muy alta', 'Media'],
    ['Mantenimiento', 'Alta', 'Alta', 'Depende del diseño', 'Alta'],
    ['Adaptación a volante', 'Requiere adaptar', 'Muy buena', 'Muy buena', 'Muy buena'],
    ['Adaptación a manillar', 'Muy buena', 'Posible', 'Posible', 'Posible'],
  ] as string[][],
  aviso: 'Es la valoración del estudio que pegó Eugenio, no una medida: los precios que hay detrás son de piezas y kits distintos, no de conjuntos equivalentes, y no incluyen portes ni adaptaciones.',
};

// ---------------------------------------------------------------- materials
export const MATERIALES_DIRECCION: { n: string; candidato: string }[] = [
  { n: 'Travesaño', candidato: 'Acero estructural o aluminio estructural' },
  { n: 'Soportes de pivote', candidato: 'Acero mecanizado' },
  { n: 'Ejes de pivote', candidato: 'Acero de resistencia adecuada' },
  { n: 'Manguetas', candidato: 'Acero mecanizado o conjunto fabricado' },
  { n: 'Brazos de dirección', candidato: 'Acero o aluminio dimensionado' },
  { n: 'Bieletas', candidato: 'Tubo de acero o aluminio estructural' },
  { n: 'Articulaciones', candidato: 'Rótulas esféricas o terminales de dirección' },
  { n: 'Rodamientos', candidato: 'Rodamientos sellados' },
];
export const AVISO_MATERIALES = 'El aluminio no se usa por sistema en lo que recibe golpes y fatiga: los ejes de rueda, los pivotes y las uniones críticas se dimensionan por los esfuerzos que soportan y no solo por su peso. Las rótulas de polímero técnico (igus igubal) se han usado en triciclos reclinados para ahorrar masa y absorber vibraciones: el estudio cita una reducción de cerca del 80 % en el peso de los rodamientos del Catrike Speed (Tech Briefs; no lo hemos podido comprobar). Servirían en las uniones secundarias y las bieletas, comprobando cargas, fatiga, temperatura, humedad y vida útil; no en una rótula estructural de seguridad sin dimensionarla.';

// ---------------------------------------------------------------- the geometry concepts
export type IdConcepto = 'ackermann' | 'avance' | 'pivote' | 'pivotamiento' | 'convergencia' | 'caida' | 'bump';
export interface ConceptoDireccion {
  id: IdConcepto; titulo: string; vista: 'planta' | 'lateral' | 'frontal';
  /** what it is, for someone who is not an engineer */
  queEs: string;
  /** what goes wrong when it is badly chosen, and what it does for the vehicle */
  porQue: string;
  /** what builders of trikes use, with who says it (never a rule: a starting point) */
  habitual?: string;
}
export const CONCEPTOS_DIRECCION: ConceptoDireccion[] = [
  {
    id: 'ackermann', titulo: 'Ackermann: la rueda de dentro gira más que la de fuera', vista: 'planta',
    queEs: 'En una curva las dos ruedas delanteras siguen círculos distintos: la de dentro, uno más pequeño. Para que ninguna arrastre de lado, la rueda de dentro tiene que girar más grados que la de fuera, de modo que las líneas perpendiculares a las dos ruedas (sus ejes) se corten en un solo punto, sobre la línea del eje trasero. Ese punto es el centro del giro.',
    porQue: 'Sin Ackermann (las dos ruedas giran lo mismo) las líneas no se cortan: una de las dos ruedas tiene que patinar de lado en cada curva. Se nota en el desgaste del neumático, en el esfuerzo del volante y en cómo se «cierra» o se «abre» la curva. Con las bieletas rectas de una dirección real, lo que sale de los brazos nunca es el Ackermann exacto en todo el giro: el constructor lo ajusta a la baja a propósito para la estabilidad.',
    habitual: 'Con bieletas rectas, un Ackermann cercano al 100 % puede pedir que los brazos de dirección, prolongados, se corten a «un 60 % de la distancia al eje trasero» (H. Sakurai, citando el texto de Dixon, en la IHPVA). Otro constructor probó el Ackermann inverso (brazos que se cortan 8 pulgadas por detrás del eje trasero): más estabilidad a alta velocidad y salida de curva más lenta, «un compromiso» (R. Horwitz, IHPVA).',
  },
  {
    id: 'avance', titulo: 'Avance (caster): la inclinación del pivote vista de lado', vista: 'lateral',
    queEs: 'El eje alrededor del que gira cada rueda no es vertical: visto de lado, está inclinado hacia atrás. La rueda queda «arrastrada» por detrás del eje, como la rueda de un carrito de la compra.',
    porQue: 'Da estabilidad en línea recta y hace que la rueda vuelva sola al centro al soltar el manillar o el volante (autocentrado). Con poco avance la dirección se siente ligera e inestable; con mucho, pesada.',
    habitual: '«12 grados de avance es un buen punto de partida» si la dirección se siente demasiado ligera (R. Horwitz); los Greenspeed usan 11° con dirección de punto central (I. Sims, ambos en la IHPVA). Un coche de calle suele estar entre 0° y 6°, unos 2° (I. Sims).',
  },
  {
    id: 'pivote', titulo: 'Inclinación del pivote (KPI): el pivote visto de frente', vista: 'frontal',
    queEs: 'Visto de frente, el eje de giro de la rueda también está inclinado, normalmente hacia dentro por arriba.',
    porQue: 'Afecta al esfuerzo de giro, al comportamiento de retorno al centro y, junto con la caída, a dónde corta el eje del pivote al suelo (el radio de pivotamiento). Con una rueda estrecha hace falta bastante inclinación para que el eje llegue al suelo cerca del centro del neumático.',
    habitual: 'La fuente consultada no da un valor numérico. Hay que dárselo al cálculo con el diseño de la mangueta.',
  },
  {
    id: 'pivotamiento', titulo: 'Radio de pivotamiento (scrub radius)', vista: 'frontal',
    queEs: 'La distancia, en el suelo y vista de frente, entre el punto donde el eje del pivote lo toca y el centro de la huella del neumático.',
    porQue: 'Decide cuánto esfuerzo de los baches y de las frenadas llega al manillar o al volante. Con la huella a un lado del pivote, cada vez que la rueda frena empuja la dirección hacia ese lado.',
    habitual: 'Dirección de «punto central» (Greenspeed): radio cero, con el eje del pivote pasando por el centro de la huella. Un radio de unos 30 mm o más «puede tirar del manillar al frenar» (I. Sims, IHPVA).',
  },
  {
    id: 'convergencia', titulo: 'Convergencia (toe): hacia dónde apuntan las ruedas parado', vista: 'planta',
    queEs: 'Vistas desde arriba, las dos ruedas delanteras no tienen por qué apuntar exactamente en paralelo: pueden apuntar un poco hacia dentro (convergencia) o hacia fuera (divergencia).',
    porQue: 'Con el vehículo en línea recta, una convergencia mal ajustada hace que las ruedas se arrastren una contra otra: desgaste del neumático y menos autonomía. Debe permitir un buen comportamiento en línea recta y un desgaste reducido.',
    habitual: 'Greenspeed recomienda de 0 a 2 mm de convergencia, medida con el conductor a bordo (I. Sims); el manual del TerraTrike 2.0 pide de 1 a 2 grados, que un propietario consideró demasiado (todo en la IHPVA). Por eso las bieletas llevan rosca: se ajusta con el vehículo montado.',
  },
  {
    id: 'caida', titulo: 'Caída (camber): la inclinación de la rueda vista de frente', vista: 'frontal',
    queEs: 'Visto de frente, la rueda puede estar inclinada: su parte de arriba hacia dentro (caída negativa) o hacia fuera (positiva).',
    porQue: 'Cambia dónde apoya el neumático y cómo agarra en curva, y desplaza el radio de pivotamiento.',
    habitual: 'La fuente consultada no da un valor numérico.',
  },
  {
    id: 'bump', titulo: 'Bump steer: que un bache no gire la rueda', vista: 'planta',
    queEs: 'Con suspensión independiente en las ruedas directrices, la rueda sube y baja, y la bieleta de dirección sube y baja con ella. Si el extremo de la bieleta no se mueve a lo largo del mismo arco que el brazo inferior, la rueda gira un poco sola al pasar un bache.',
    porQue: 'La dirección se mueve sin que nadie la toque: el vehículo da un tirón al pasar un bache. Se evita colocando bien los anclajes de la bieleta al diseñar la suspensión delantera.',
    habitual: 'En un tadpole de autoconstrucción, el constructor desplazó las rótulas de las bieletas para limitar el cambio de convergencia con los baches, y aun así espera algo de roce del neumático; también cuenta que la convergencia cambia en las curvas por los compromisos del mecanismo (bkhome.org, «Meanderer trike toe and Ackerman fine-tuning»).',
  },
];

/** The study's closing questions, each with where this design already answers it. */
export const PREGUNTAS_ESTUDIO: { q: string; opciones: string; clave: 'via' | 'batalla' | 'mando' | 'suspension' }[] = [
  { q: 'Anchura entre centros de las dos ruedas delanteras', opciones: '600 · 700 · 800 · 900 mm u otra', clave: 'via' },
  { q: 'Distancia entre ejes (rueda delantera a trasera)', opciones: '1.500 · 1.800 · 2.000 · 2.200 mm u otra', clave: 'batalla' },
  { q: 'Tipo de accionamiento', opciones: 'Volante · manillar · joystick', clave: 'mando' },
  { q: 'Suspensión delantera', opciones: 'Sin suspensión · independiente en las dos ruedas · por decidir', clave: 'suspension' },
];
export const OBJETIVO_ESTUDIO = 'Un diseño que se pueda construir como prototipo y después replicar en 100 unidades, con pocos componentes especiales, tolerancias controladas y la mínima masa posible sin comprometer la seguridad.';
export const HIPOTESIS_ESTUDIO = ['Cuatro ruedas, las dos delanteras directrices', 'Dos ruedas traseras fijas', 'Velocidad de diseño de hasta 25 km/h', 'Motor eléctrico auxiliar y pedaleo', 'Prioridad: poco peso, bajo coste, durabilidad y fabricación sencilla', 'Posibilidad de fabricar unas 100 unidades'];
