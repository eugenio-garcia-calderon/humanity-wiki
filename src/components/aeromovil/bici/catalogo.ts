// ============================================================================
// BICYCLE COMPONENTS: BRAKES, SUSPENSION AND PEDAL GENERATORS (2026-11-24)
// ============================================================================
// Eugenio: «Añade la capacidad de crear vehículos ligeros con componentes de piezas de bicicleta, tipo cuadriciclos con
// piezas de bicicleta, para hacer velomóviles muy ligeros … Los frenos, la suspensión, pero todo componentes que son de
// bicicletas grandes. Es decir, bicicletas de 4 ruedas. Inspírate en el Quattrevelo … y vamos a trabajar siempre con
// chainless electric pedaling … y añade también precio de cada componente.»
//
// Pure data, no three.js (the tunnel's Web Worker loads the Triciclo model, which reads this file). The other bicycle
// components live where their kind already lived, each marked `clase: 'bici'`: the wheels in `ruedas/catalogo.ts`
// (groups «Bicicleta» and «Bici de carga»), the hub motors and controllers in `catalogoTren.ts`.
//
// RULE OF THIS FILE: `kg` and `precio` say what is PUBLISHED and what is ESTIMATED, in `masa` and `precio.nota`, in
// Spanish, because both are shown. Read on `LEIDO`:
//  - Sturmey-Archer drum hubs: X-FD 70 mm, 770 g, £74.99; XL-FD 90 mm, 970 g, £89.99 (sjscycles.co.uk). The single-sided
//    versions that trikes and velomobiles mount (X-SD, XL-SD): 705–790 g and 935–1,020 g by axle (Sturmey-Archer's
//    specification sheet, «Side drum brake hubs»). The Quattrovelo mounts the 70 mm as standard and offers the 90 mm
//    (+€50, +580 g the pair) and rear TRP Spyre discs (+€400, +1,300 g) as options (en.velomobiel.nl, technical details).
//  - TRP Spyre mechanical caliper: 154 g, «manufacturer information», for 140 or 160 mm rotors (bike24.com).
//  - Shimano Deore BL-M6100 + BR-M6120 four-piston hydraulic brake: 653 g weighed (r2-bike.com; the page does not say
//    whether it is one wheel's lever, hose and caliper, which is how it is sold).
//  - RockShox Monarch RL air shock, 165 × 38 mm: 215 g without hardware (starbike.com). DNM AOY-36RC 165 × 35 mm: 300 g
//    (newegg.com). No shop showed a price for either on that day: their prices are estimates.
//  - Podbike Frikar (a four-wheeled, chainless, enclosed pedelec, 90 kg): double wishbones in front, rigid rear, Tektro
//    brakes, two 250 W motors, a belt-driven pedal generator, one 877 Wh battery, €7,500 (vision-mobility.de road test).
//  - Pedal generators: Schaeffler's, «four-kilo crank-driven e-machine» (IEEE Spectrum, «emotor chain free cargo bike»);
//    Cixi PERS, 3.5 kg, cadence 58–90 rpm, back-pedalling brakes and recharges (icetrikes.co). Neither publishes its
//    power, its efficiency or its price.
//  - Generator efficiency: the first chainless bicycles had «brushed generators with peak efficiencies of between 55
//    and 70%» and «brushed motors with about 80% peak efficiency» (A. Fuchs, Human Power eJournal, art. 15, 2008). No
//    maker of today's brushless ones publishes a figure: the default 82 % is an ESTIMATE, chosen so that with the
//    editor's motor and controller (85 %) the legs reach the wheel at 70 %, the figure the Aeromóvil Gota always used.
//  - What a person gives: «an average, healthy, well-fed and motivated manual laborer may sustain» about 75 W over an
//    8-hour shift; «an adult of good fitness is more likely to average between 50 and 150 watts» for an hour of
//    vigorous exercise; an elite cyclist about 440 W over an hour (en.wikipedia.org, «Human power»).

export const LEIDO = '2026-11-24';
/** Sterling to euros: an assumed round rate for prices read in a British shop (as `EUR_POR_USD` in catalogoTren.ts). */
export const EUR_POR_GBP = 1.15;
/** «A medida»: no catalogue part; the slider and the load decide, as before. */
export const A_MEDIDA = 'medida';

export interface PrecioBici {
  /** in euros, converted when the shop sells in another currency (`nota` says from what) */
  eur: number;
  /** a shop's listed price (with its page) or an estimate with no shop behind it */
  tipo: 'publicado' | 'estimado';
  /** where it was read, or how it was estimated (Spanish: it is shown) */
  nota: string;
  fuente?: string;
}

export interface PiezaBici {
  id: string; n: string;
  /** what one of them weighs as mounted (kg): per wheel for a brake, per corner for a suspension, the unit for a generator */
  kg: number;
  /** what of `kg` is published and what is estimated (Spanish: it is shown) */
  masa: string;
  precio: PrecioBici;
  /** what it is and what to know before choosing it (Spanish: it is shown) */
  nota: string;
  fuente: string;
}

export interface FrenoBici extends PiezaBici { tipo: 'tambor' | 'disco mecánico' | 'disco hidráulico' }
/** A plain disc hub (kg) and a 160 mm rotor (kg): estimates of parts of their class, counted with each disc brake. */
export const BUJE_DISCO = 0.25, DISCO_160 = 0.12;

export const FRENOS_BICI: FrenoBici[] = [
  {
    id: 'tambor70', tipo: 'tambor', n: 'Tambor de 70 mm en el buje (Sturmey-Archer X-FD)', kg: 0.77,
    masa: '770 g publicados: es el buje entero con su tambor, así que la rueda no lleva otro buje',
    precio: { eur: Math.round(74.99 * EUR_POR_GBP), tipo: 'publicado', nota: `74,99 £ en sjscycles.co.uk (≈ ${Math.round(74.99 * EUR_POR_GBP)} € a ${EUR_POR_GBP.toLocaleString('es-ES')} €/£)`, fuente: 'https://sjscycles.co.uk/hubs-internal-hub-gear-brake/sturmey-archer-xfd-aluminium-front-hub-with-70mm-drum-brake-36-hole' },
    nota: 'El freno de serie del Quattrovelo y de casi todos los velomóviles: cerrado, sin mantenimiento y montado a un solo lado. Frena menos que un disco y se calienta en bajadas largas. La versión de un solo lado (X-SD) pesa de 705 a 790 g según el eje.',
    fuente: 'https://sjscycles.co.uk/hubs-internal-hub-gear-brake/sturmey-archer-xfd-aluminium-front-hub-with-70mm-drum-brake-36-hole',
  },
  {
    id: 'tambor90', tipo: 'tambor', n: 'Tambor de 90 mm en el buje (Sturmey-Archer XL-FD)', kg: 0.97,
    masa: '970 g publicados: el buje entero con su tambor',
    precio: { eur: Math.round(89.99 * EUR_POR_GBP), tipo: 'publicado', nota: `89,99 £ en sjscycles.co.uk (≈ ${Math.round(89.99 * EUR_POR_GBP)} € a ${EUR_POR_GBP.toLocaleString('es-ES')} €/£)`, fuente: 'https://www.sjscycles.co.uk/sturmey-archer-aluminium-front-hub-with-90-mm-drum-brake-xl-fd-36-hole-prod22069/' },
    nota: 'El tambor grande, la opción del Quattrovelo para ir cargado o por montaña (allí, 50 € y 580 g más la pareja). La versión de un solo lado (XL-SD) pesa de 935 a 1.020 g según el eje.',
    fuente: 'https://www.sjscycles.co.uk/sturmey-archer-aluminium-front-hub-with-90-mm-drum-brake-xl-fd-36-hole-prod22069/',
  },
  {
    id: 'discoMecanico', tipo: 'disco mecánico', n: 'Disco mecánico de dos pistones (TRP Spyre)', kg: +(0.154 + DISCO_160 + BUJE_DISCO).toFixed(2),
    masa: 'pinza de 154 g publicados; el disco de 160 mm (≈ 120 g) y el buje de disco (≈ 250 g) son estimaciones',
    precio: { eur: 200, tipo: 'publicado', nota: 'los discos traseros con pinzas Spyre son una opción de 400 € la pareja en el Quattrovelo (velomobiel.nl): 200 € por rueda, montado', fuente: 'https://en.velomobiel.nl/quatrevelo/technische_gegevens.php' },
    nota: 'De cable, con las dos pastillas móviles. Frena más que un tambor y se ajusta a mano; necesita un buje de disco. En el Quattrovelo es la opción para las ruedas traseras.',
    fuente: 'https://www.bike24.com/p2225128.html',
  },
  {
    id: 'discoHidraulico', tipo: 'disco hidráulico', n: 'Disco hidráulico de cuatro pistones (Shimano Deore M6120)', kg: +(0.653 + DISCO_160 + BUJE_DISCO).toFixed(2),
    masa: 'maneta, latiguillo y pinza: 653 g pesados por la tienda; el disco (≈ 120 g) y el buje de disco (≈ 250 g) son estimaciones',
    precio: { eur: 110, tipo: 'estimado', nota: 'estimado: la tienda no mostraba precio ese día; un freno Deore de cuatro pistones con su disco ronda los 110 € por rueda' },
    nota: 'El freno de bicicleta de montaña y de carga: el que más frena de la lista. Cada pinza trae su maneta; en cuatro ruedas hay que unir dos pinzas a cada maneta con un repartidor, que no está contado.',
    fuente: 'https://r2-bike.com/SHIMANO-Deore-Disc-Brake-4-Pistons-BL-M6100-BR-M6120-Set',
  },
];

export interface SuspensionBici extends PiezaBici { recorrido: number /* mm at the wheel, about */ }
/** A corner's arms, upright and stub axle in bicycle tube (kg): an estimate, no published figure. */
export const BRAZOS_ESQUINA = 0.9;

export const SUSPENSIONES_BICI: SuspensionBici[] = [
  {
    id: 'rigida', n: 'Sin suspensión: solo el neumático', kg: 0.5, recorrido: 0,
    masa: 'estimado: la mangueta y el eje de la rueda (≈ 0,5 kg por esquina)',
    precio: { eur: 40, tipo: 'estimado', nota: 'estimado: mangueta y eje de la rueda, 40 € por esquina' },
    nota: 'El eje trasero del Podbike Frikar va rígido, y muchos triciclos reclinados también: la suspensión la hace un neumático balón a poca presión. Lo más ligero y lo más barato; en mal asfalto se nota.',
    fuente: 'https://vision-mobility.de/en/news/vm-road-test-podbike-frikar-freed-from-the-car-119137.html',
  },
  {
    id: 'aireMonarch', n: 'Amortiguador de aire de bici (RockShox Monarch RL) y brazos', kg: +(0.215 + BRAZOS_ESQUINA).toFixed(2), recorrido: 70,
    masa: `amortiguador de 215 g publicados (165 × 38 mm, sin tornillería); los brazos y la mangueta (≈ ${BRAZOS_ESQUINA.toLocaleString('es-ES')} kg) son una estimación`,
    precio: { eur: 260, tipo: 'estimado', nota: 'estimado: ninguna tienda mostraba el precio ese día; un amortiguador de aire de esta gama ronda los 200 €, más 60 € de brazos y rótulas' },
    nota: 'Un amortiguador de bicicleta de montaña por rueda, con brazos de tubo de bici, como los trapecios delanteros del Podbike Frikar. Se ajusta con una bomba de aire al peso que lleve.',
    fuente: 'https://www.starbike.com/en/rockshox-monarch-rl/',
  },
  {
    id: 'aireDNM', n: 'Amortiguador de aire económico (DNM AOY-36RC) y brazos', kg: +(0.30 + BRAZOS_ESQUINA).toFixed(2), recorrido: 65,
    masa: `amortiguador de 300 g publicados (165 × 35 mm); los brazos y la mangueta (≈ ${BRAZOS_ESQUINA.toLocaleString('es-ES')} kg) son una estimación`,
    precio: { eur: 150, tipo: 'estimado', nota: 'estimado: la tienda no mostraba precio ese día; un amortiguador de esta gama ronda los 90 €, más 60 € de brazos y rótulas' },
    nota: 'Lo mismo con un amortiguador más sencillo: rebote, bloqueo y presión.',
    fuente: 'https://www.newegg.com/hi-bike-aoy-36rc-165x35mm-4-system-gold/p/05R-01PP-000P7',
  },
];

export interface GeneradorPedal extends PiezaBici {
  /** cadence the maker gives (rpm), or null */
  cadencia: [number, number] | null;
  /** back-pedalling brakes and recharges */
  regenera: boolean;
}

export const GENERADORES_PEDAL: GeneradorPedal[] = [
  {
    id: 'schaeffler', n: 'Schaeffler (pedaleo por cable, con Heinzmann)', kg: 4, cadencia: null, regenera: false,
    masa: '4 kg publicados: el generador que mueven las bielas',
    precio: { eur: 500, tipo: 'estimado', nota: 'estimado: Schaeffler lo vende a fabricantes y no publica precio; se pone lo que cuesta un motor central de bicicleta de su tamaño' },
    nota: 'El primer sistema de serie sin cadena para bicis de carga: el pedalier mueve un generador y la electricidad va por cable a dos motores de buje Heinzmann. La centralita devuelve a los pedales una resistencia que imita la de una cadena, con nueve desarrollos. No publica la potencia ni el rendimiento del generador.',
    fuente: 'https://spectrum.ieee.org/emotor-chain-free-cargo-bike',
  },
  {
    id: 'cixi', n: 'Cixi PERS (pedalier generador)', kg: 3.5, cadencia: [58, 90], regenera: true,
    masa: '3,5 kg publicados',
    precio: { eur: 500, tipo: 'estimado', nota: 'estimado: Cixi y ICE Trikes no publican el precio del pedalier suelto; se pone lo que cuesta un motor central de bicicleta de su tamaño' },
    nota: 'Pedalier generador para triciclos reclinados y vehículos ligeros: mantiene la cadencia entre 58 y 90 vueltas por minuto y, pedaleando hacia atrás, frena y recarga. ICE Trikes lo monta con un motor de buje de 250 W y una batería de 700 Wh. No publica la potencia ni el rendimiento del generador.',
    fuente: 'https://www.icetrikes.co/products/pers-chainless-e-assist-system',
  },
];

export const frenoBici = (id?: string) => FRENOS_BICI.find(f => f.id === id) ?? null;
export const suspensionBici = (id?: string) => SUSPENSIONES_BICI.find(f => f.id === id) ?? null;
export const generadorPedal = (id?: string) => GENERADORES_PEDAL.find(f => f.id === id) ?? null;

type Opcion = { k: string; n: string; clase?: 'bici' | 'pesado' };
const opciones = (medida: string, l: PiezaBici[]): Opcion[] => [{ k: A_MEDIDA, n: medida }, ...l.map(p => ({ k: p.id, n: p.n, clase: 'bici' as const }))];
export const OPCIONES_FRENO: Opcion[] = opciones('A medida (por la carga)', FRENOS_BICI);
export const OPCIONES_SUSPENSION: Opcion[] = opciones('A medida (por la carga)', SUSPENSIONES_BICI);
export const OPCIONES_GENERADOR: Opcion[] = opciones('A medida (deslizadores)', GENERADORES_PEDAL);

/**
 * The price of a bicycle wheel without its hub (€): the tyre at its maker's recommended price, the rim, 36 spokes and
 * the tube. Read on `LEIDO`: Schwalbe's recommended prices (Marathon Racer 40-406 €38.90, Green Marathon 47-406 €32.90,
 * Marathon Plus 47-406 €45.90, Pick-Up 60-406 €45.90, Marathon Plus Tour 47-622 €45.90: schwalbe.com; G-One Speed
 * 40-406 US$41 and Big Ben Plus 55-406 and 55-507 US$38: schwalbetires.com); the rim, a Ryde Andra 40 of 20″, £34.99
 * (sjscycles.co.uk). Spokes, nipples, tube and tape (≈ 30 €) are an estimate; so is the rim of the other sizes.
 */
export const PRECIO_RUEDA_BICI: Record<string, { neumatico: number; llanta: number; como: string }> = {
  biciRacer20: { neumatico: 38.9, llanta: 35, como: 'Schwalbe Marathon Racer, 38,90 € (schwalbe.com)' },
  biciGOne20: { neumatico: 41 * 0.86, llanta: 35, como: 'Schwalbe G-One Speed, 41 $ (schwalbetires.com)' },
  biciMarathon20: { neumatico: 32.9, llanta: 40, como: 'Schwalbe Green Marathon, 32,90 € (schwalbe.com)' },
  biciPlus20: { neumatico: 45.9, llanta: 40, como: 'Schwalbe Marathon Plus, 45,90 € (schwalbe.com)' },
  biciBalon20: { neumatico: 38 * 0.86, llanta: 40, como: 'Schwalbe Big Ben Plus, 38 $ (schwalbetires.com)' },
  biciBalon24: { neumatico: 38 * 0.86, llanta: 45, como: 'Schwalbe Big Ben Plus, 38 $ (schwalbetires.com)' },
  biciTour28: { neumatico: 45.9, llanta: 50, como: 'Schwalbe Marathon Plus Tour, 45,90 € (schwalbe.com)' },
  cargo20: { neumatico: 45.9, llanta: Math.round(34.99 * EUR_POR_GBP), como: 'Schwalbe Pick-Up, 45,90 € (schwalbe.com), en llanta Ryde Andra 40, 34,99 £ (sjscycles.co.uk)' },
  velomovil20: { neumatico: 38.9, llanta: 35, como: 'Schwalbe Marathon Racer, 38,90 € (schwalbe.com)' },
};
/** Spokes, nipples, tube and rim tape of one wheel (€): an estimate. */
export const PRECIO_RADIOS_CAMARA = 30;
export const precioRuedaBici = (id: string): { eur: number; como: string } | null => {
  const p = PRECIO_RUEDA_BICI[id];
  return p ? { eur: p.neumatico + p.llanta + PRECIO_RADIOS_CAMARA, como: `${p.como}, llanta (≈ ${Math.round(p.llanta)} €) y radios, cámara y fondo (≈ ${PRECIO_RADIOS_CAMARA} €, estimado)` } : null;
};
