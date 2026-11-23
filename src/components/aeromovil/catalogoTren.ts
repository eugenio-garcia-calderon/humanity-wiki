/**
 * Catalogue of real powertrain parts for the Triciclo / Cuadriciclo Bala (2026-11-16, Eugenio: «añade marcas de
 * motores eléctricos y de motores térmicos que podamos seleccionar para configurar nuestro tren de potencia, y
 * también de engranajes planetarios, de controladoras, y todo»).
 *
 * Every figure below was read from the page in `fuente` on `leido` and copied as published. `null` means the source
 * does not publish it: nothing here is estimated or filled in. Where two sources disagree, `notas` says so and the
 * figure kept is the one in `fuente`. No logos.
 *
 * (2026-11-17, Eugenio: «sabiendo qué potencia y qué peso y qué cilindrada y qué consumo tienen cada uno de los
 * motores … y qué coste estimado también»): electric motors and petrol engines now carry `precio`, ONE shop's
 * listed price on the day it was read, as published (currency, with or without VAT). It is an estimate of the order
 * of magnitude, not a quote: prices move every week and differ a lot between shops. `null` = no public price found
 * (EMRAX, Saietta, Rotax sell on request).
 *
 * The design stores only the chosen `id` (tCatMotor, tCatCtrl, tCatReductora, tCatTermico); 'medida' (the first
 * option, «A medida (deslizadores)») keeps the sliders as they were, so every saved design is unchanged.
 */

export const LEIDO = '2026-11-16';
/** (2026-11-17) when the prices and the parts added that day were read. */
export const LEIDO_PRECIO = '2026-11-17';
/** «A medida (deslizadores)»: no catalogue part, the sliders decide. */
export const A_MEDIDA = 'medida';
/** (2026-11-24) when the bicycle parts (`clase: 'bici'`) were read. */
export const LEIDO_BICI = '2026-11-24';

/** Who published the figures: the maker's own datasheet, or a shop / distributor's listing. */
export type TipoFuente = 'fabricante' | 'distribuidor';

interface Base {
  id: string; marca: string; modelo: string;
  fuente: string; tipoFuente: TipoFuente; leido: string;
  /**
   * 2026-11-24 (Eugenio: «pon una marca que diferencia los componentes que son de bicicleta de los componentes que son
   * para vehículos pesados»): a bicycle part. Absent: a heavy vehicle's (every part before that day).
   */
  clase?: 'bici';
  /** what the source leaves out, disagreements between sources, conditions of a rating (in Spanish: it is shown) */
  notas?: string;
}

/** One shop's listed price for a new part, as published on `leido` (2026-11-17). An estimate, not a quote. */
export interface Precio {
  valor: number; moneda: 'EUR' | 'USD';
  /** what the listing says about VAT */
  iva: 'incluido' | 'sin IVA' | 'sin aclarar';
  fuente: string; leido: string;
  nota?: string;
}

export interface MotorCatalogo extends Base {
  /** hub motor (inside the wheel, as drawn today) or an inboard motor that needs a reduction gear to the wheel */
  montaje: 'buje' | 'central';
  tecnologia: string;
  /** nominal and allowed DC voltage (V) */
  vNom: number | null; vMin: number | null; vMax: number | null;
  /** DC voltage the maker says the peak power needs (EMRAX) */
  vPico?: number | null;
  kWCont: number | null; kWPico: number | null;
  nmCont: number | null; nmPico: number | null;
  rpmMax: number | null; kg: number | null;
  refrigeracion: string | null;
  /** a reduction gear built into the motor (QS 138: 1:2.35) */
  reduccion?: number;
  /** the inverter is built into the motor (Saietta AFT140i): no separate controller to buy */
  controladorIntegrado?: boolean;
  /** (2026-11-17) the efficiency (%) the maker publishes, when it does (peak, as published) */
  rendimiento?: number | null;
  precio?: Precio | null;
}

export interface ControladorCatalogo extends Base {
  vNom: number | null; vMin: number | null; vMax: number | null;
  /** short-time current (A) and for how long */
  aPico: number | null; aPicoTiempo: string;
  /** continuous (or one-hour) current (A) */
  aCont: number | null;
  /** what the published currents are: the motor's phase current (RMS for AC controllers), the battery's, or not said */
  corriente: 'fase' | 'bateria' | 'sin aclarar';
  /** battery (bus) current, when published apart from the phase current */
  aBat?: number | null;
  kg: number | null;
}

export interface ReductoraCatalogo extends Base {
  tipo: 'planetaria' | 'diferencial';
  relacion: number;
  /** nominal (continuous) output torque, and the maximum / emergency-stop one (N·m) */
  nmSalida: number | null; nmSalidaMax: number | null;
  /** maximum input torque, when that is what the maker rates (Hewland) */
  nmEntradaMax?: number | null;
  rpmEntradaMax: number | null;
  /** mechanical efficiency (%) */
  rendimiento: number | null;
  kg: number | null;
  diferencial: boolean;
}

export interface TermicoCatalogo extends Base {
  cc: number | null; cilindros: number; ciclo: string; refrigeracion: string;
  /** maximum power (kW) and whether the maker gives it net (SAE J1349: what reaches the shaft) or gross */
  kW: number; rpm: number | null; potencia: 'neta' | 'bruta' | 'máxima';
  /** continuous rated power (kW) */
  kWCont: number | null;
  nm: number | null; kg: number | null;
  /** fuel consumption the maker publishes (L/h) and the power it is measured at (kW) */
  consumoLh: number | null; consumoKW: number | null;
  precio?: Precio | null;
}

// ─────────────────────────────── electric motors ───────────────────────────────
export const MOTORES: MotorCatalogo[] = [
  {
    id: 'qs273v3', marca: 'QS Motor', modelo: '273 V3 40H, 8 kW (motor de buje)', montaje: 'buje', tecnologia: 'BLDC de imanes, buje directo, 16 pares de polos',
    vNom: 72, vMin: 48, vMax: 96, kWCont: 8, kWPico: null, nmCont: null, nmPico: 250, rpmMax: null, kg: null, refrigeracion: 'aire (IP54)',
    fuente: 'https://e-smartway.com/products/nbpower-qs-v3-273-40h-motorcycle-18-19-21-48-96v-8000w-ebike-motor-wheel-electric-bike-rear-hub-motor-150mm-dropout-width', tipoFuente: 'distribuidor', leido: LEIDO,
    precio: { valor: 898, moneda: 'USD', iva: 'sin aclarar', fuente: 'https://e-smartway.com/products/nbpower-qs-v3-273-40h-motorcycle-18-19-21-48-96v-8000w-ebike-motor-wheel-electric-bike-rear-hub-motor-150mm-dropout-width', leido: LEIDO_PRECIO, nota: 'el motor solo, sin controlador' },
    notas: 'La tienda no publica la potencia de pico, la masa ni las rpm; el par máximo lo da como «aprox. 250 N·m». 130 km/h de punta en llanta de moto.',
  },
  {
    id: 'qsv3-5kw', marca: 'QS Motor', modelo: 'V3 5 kW buje directo (EM3ev)', montaje: 'buje', tecnologia: 'BLDC de imanes, buje directo',
    vNom: 72, vMin: null, vMax: null, kWCont: 5, kWPico: 5, nmCont: null, nmPico: 220, rpmMax: null, kg: 12.8, refrigeracion: 'aire (IP54), sensor de temperatura',
    fuente: 'https://em3ev.com/shop/5kw-qs-v3-rear-direct-drive-hub-motor/', tipoFuente: 'distribuidor', leido: LEIDO,
    precio: { valor: 379, moneda: 'USD', iva: 'sin aclarar', fuente: 'https://em3ev.com/shop/5kw-qs-v3-rear-direct-drive-hub-motor/', leido: LEIDO_PRECIO, nota: 'el motor solo, sin llanta ni controlador' },
    notas: 'Da «5 kW nominal» y «5.000 W de pico» (5,7 kW a 72 V con un controlador de 80 A); par «más de 220 N·m»; 12,8 kg el motor desnudo.',
  },
  {
    id: 'qs260-4kw', marca: 'QS Motor', modelo: '260 de coche, 4 kW (motor de buje)', montaje: 'buje', tecnologia: 'BLDC de imanes, buje directo para coche',
    vNom: 72, vMin: 72, vMax: 96, kWCont: 4, kWPico: 8, nmCont: 30, nmPico: 181, rpmMax: null, kg: 18, refrigeracion: 'aire (IP54)',
    fuente: 'https://everythingpe.com/products/ev-traction-motors/qs-motor/1069-2210-4000w-260-car-motor', tipoFuente: 'distribuidor', leido: LEIDO,
    precio: null,
    notas: 'Ficha de un distribuidor: 30 N·m de par continuo y 181 N·m de pico, tal cual. Velocidad del vehículo 30–85 km/h; sin rpm.',
  },
  {
    id: 'qs138-90h', marca: 'QS Motor', modelo: '138 90H V4, 4 kW (motor central con reductora 1:2,35)', montaje: 'central', tecnologia: 'PMSM de imanes interiores, motor central',
    vNom: 72, vMin: null, vMax: null, kWCont: 4, kWPico: null, nmCont: null, nmPico: 150, rpmMax: 7000, kg: null, refrigeracion: null, reduccion: 2.35,
    fuente: 'https://e-smartway.com/products/qs-138-v4-90h-4000w-mid-drive-hub-motor-for-motorcycles-high-power-magnet-motor-with-1-2-35-gear-ratio', tipoFuente: 'distribuidor', leido: LEIDO,
    precio: { valor: 668, moneda: 'USD', iva: 'sin aclarar', fuente: 'https://e-smartway.com/products/qs-138-v4-90h-4000w-mid-drive-hub-motor-for-motorcycles-high-power-magnet-motor-with-1-2-35-gear-ratio', leido: LEIDO_PRECIO, nota: 'en oferta (738 $ de lista)' },
    notas: '4.800 rpm nominales y 7.000 con debilitamiento de campo; 150 N·m máximos. La tienda no publica potencia de pico ni masa. Lleva una reductora 1:2,35 dentro: hace falta otra (cadena o correa) hasta la rueda.',
  },
  {
    id: 'gm-hpm5000b', marca: 'Golden Motor', modelo: 'HPM5000B, refrigerado por líquido', montaje: 'central', tecnologia: 'BLDC',
    vNom: null, vMin: 48, vMax: 120, kWCont: null, kWPico: null, nmCont: null, nmPico: null, rpmMax: 6000, kg: 11.35, refrigeracion: 'líquido, con ventilador',
    fuente: 'https://goldenmotor.bike/product/48-volt-5kw-bldc-motor-liquid-cooled', tipoFuente: 'fabricante', leido: LEIDO,
    precio: null, rendimiento: 91,
    notas: 'Potencia nominal «3–7,5 kW» según la tensión (48, 72, 96 o 120 V), sin decir cuál a cuál: no se rellena la potencia. Sin par publicado. 2.000–6.000 rpm; rendimiento 91 %.',
  },
  {
    id: 'gm-hpm10kw', marca: 'Golden Motor', modelo: 'HPM10KW, refrigerado por líquido', montaje: 'central', tecnologia: 'BLDC',
    vNom: null, vMin: 48, vMax: 120, kWCont: null, kWPico: null, nmCont: null, nmPico: null, rpmMax: 6000, kg: 17.7, refrigeracion: 'líquido',
    fuente: 'https://goldenmotor.bike/product/48-volt-10kw-bldc-motor-liquid-cooled/', tipoFuente: 'fabricante', leido: LEIDO,
    precio: { valor: 1056, moneda: 'USD', iva: 'sin aclarar', fuente: 'https://goldenmotor.bike/product/48-volt-10kw-bldc-motor-liquid-cooled/', leido: LEIDO_PRECIO, nota: 'de 48 a 96 V; el de 120 V, 1.269 $' }, rendimiento: 91,
    notas: 'Potencia nominal «8–20 kW según la tensión», sin decir cuál a cuál: no se rellena la potencia. Sin pico ni par publicados. Hasta 91 % de rendimiento.',
  },
  {
    id: 'me1616', marca: 'Motenergy', modelo: 'ME1616, refrigerado por agua', montaje: 'central', tecnologia: 'PMSM de imanes interiores (IPM)',
    vNom: null, vMin: 48, vMax: 120, kWCont: 20, kWPico: 55, nmCont: null, nmPico: 134, rpmMax: 6000, kg: 21.8, refrigeracion: 'agua con 50 % de glicol',
    fuente: 'https://www.electricmotorsport.com/ev-parts/motors/brushless-pmac-ipm-motors/me1616-brushless-65hp-liquid-cooled-ipm-motor-24-120v.html', tipoFuente: 'distribuidor', leido: LEIDO,
    precio: { valor: 1170, moneda: 'USD', iva: 'sin aclarar', fuente: 'https://www.thunderstruck-ev.com/me1616.html', leido: LEIDO_PRECIO, nota: 'el motor solo' },
    notas: 'Electric Motorsport: 20 kW continuos, 55 kW de pico (sin decir a qué tensión), 134 N·m, 48 libras (21,8 kg). Otra tienda (Thunderstruck) da 120 N·m y 55 libras (24,9 kg): no coinciden.',
  },
  {
    id: 'emrax188-lv-lc', marca: 'EMRAX', modelo: '188 LV, refrigerado por líquido', montaje: 'central', tecnologia: 'flujo axial, imanes permanentes',
    vNom: null, vMin: 50, vMax: 830, vPico: 160, kWCont: 29, kWPico: 60, nmCont: 43, nmPico: 100, rpmMax: 8000, kg: 7.9, refrigeracion: 'líquido',
    fuente: 'https://emrax.com/wp-content/uploads/2025/03/EMRAX-188_datasheet_v1.7.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: null, rendimiento: 96,
    notas: '60 kW a 6.500 rpm durante 30 s, y para eso pide 160 V de continua; a menos tensión da menos pico. EMRAX dice que el 188 irá dejando de fabricarse.',
  },
  {
    id: 'emrax208-lv-lc', marca: 'EMRAX', modelo: '208 LV, refrigerado por líquido', montaje: 'central', tecnologia: 'flujo axial, imanes permanentes',
    vNom: null, vMin: 50, vMax: 830, vPico: 170, kWCont: 47, kWPico: 86, nmCont: 75, nmPico: 150, rpmMax: 7000, kg: 10.3, refrigeracion: 'líquido',
    fuente: 'https://emrax.com/wp-content/uploads/2025/03/EMRAX-208_datasheet_v1.7.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: null, rendimiento: 96,
    notas: '86 kW a 6.000 rpm, para lo que pide 170 V de continua. Más de lo que necesita un coche de 300–700 kg: es la cota alta.',
  },
  {
    id: 'aft140i-96', marca: 'Saietta (hoy Turntide)', modelo: 'AFT140i 96 V, con inversor integrado', montaje: 'central', tecnologia: 'flujo axial, imanes permanentes',
    vNom: 96, vMin: 60, vMax: 120, kWCont: 21, kWPico: 43, nmCont: 65, nmPico: 105, rpmMax: 8000, kg: 22, refrigeracion: 'agua-glicol, 9 L/min', controladorIntegrado: true,
    fuente: 'https://saietta.com/media/1vbiy5l2/aft140i-96v-spec-sheet-006.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: null,
    notas: '43 kW durante 2 min (45 kW y 135 N·m durante 10 s). Lleva el inversor dentro; la ficha no dice si sus 22 kg lo incluyen. El conjunto con reductora («eDrive») pesa 42 kg.',
  },
  // ── bicycle hub motors (2026-11-24): what a four-wheeled bicycle carries, one per driven wheel. Published figures only
  {
    id: 'bafang-g020-250', clase: 'bici', marca: 'Bafang', modelo: 'H400B (RM G020.250.D), 250 W trasero', montaje: 'buje', tecnologia: 'BLDC de buje con reductora planetaria interna',
    vNom: 36, vMin: 36, vMax: 48, kWCont: 0.25, kWPico: null, nmCont: null, nmPico: 45, rpmMax: null, kg: 3.3, refrigeracion: 'aire (IP X5)',
    fuente: 'https://www.bafang-e.com/en/oem-area/components/component/motor/rm-g020250350500ddc', tipoFuente: 'fabricante', leido: LEIDO_BICI,
    notas: 'El mismo motor se vende con 250, 350 y 500 W nominales a 36, 43 y 48 V; aquí, la versión de 250 W, la que deja el vehículo como bicicleta de pedaleo asistido. Para ruedas de 20″, 26″ y 28″, con freno de disco, corte a 25 o 32 km/h. No publica la potencia de pico, el rendimiento ni las rpm.',
  },
  {
    id: 'bafang-g0200-250', clase: 'bici', marca: 'Bafang', modelo: 'H550 (FM G0200.250.D), 250 W delantero', montaje: 'buje', tecnologia: 'BLDC de buje con reductora planetaria interna',
    vNom: 36, vMin: 36, vMax: 48, kWCont: 0.25, kWPico: null, nmCont: null, nmPico: 55, rpmMax: null, kg: 3.8, refrigeracion: 'aire (IP X6)',
    fuente: 'https://www.bafang-e.com/en/oem-area/components/component/motor/fm-g0200250500750d', tipoFuente: 'fabricante', leido: LEIDO_BICI,
    notas: 'La ficha da tres versiones (250, 500 y 750 W; 55, 65 y 85 N·m; 3,8, 4,2 y 4,7 kg) en el mismo orden, sin decir expresamente cuál va con cuál: se toma la primera de cada lista. Para ruedas de 20″ y 26″, freno de disco.',
  },
  {
    id: 'bafang-g0630-1000', clase: 'bici', marca: 'Bafang', modelo: 'RM G0630.1000.D, 1 kW trasero', montaje: 'buje', tecnologia: 'BLDC de buje con reductora planetaria interna',
    vNom: 48, vMin: 48, vMax: 52, kWCont: 1, kWPico: null, nmCont: null, nmPico: 100, rpmMax: null, kg: 4.9, refrigeracion: 'aire (IP X6)',
    fuente: 'https://www.bafang-e.com/en/oem-area/components/component/motor/rm-g06301000ddc', tipoFuente: 'fabricante', leido: LEIDO_BICI,
    notas: 'La ficha da cuatro versiones (250, 500, 750 y 1.000 W; 60, 70, 85 y 100 N·m; 4,2, 4,5, 4,9 y 4,9 kg) en el mismo orden, sin decir expresamente cuál va con cuál: se toma la última de cada lista. Con 1 kW el vehículo ya no es una bicicleta de pedaleo asistido: es un ciclomotor (categoría L). Buje ancho, de rueda de 20″ o 26″ gorda (175 mm entre punteras).',
  },
  {
    id: 'grin-all-axle', clase: 'bici', marca: 'Grin', modelo: 'All-Axle V3 (27 mm), delantero', montaje: 'buje', tecnologia: 'BLDC de buje directo, 23 pares de polos, sin reductora',
    vNom: 48, vMin: null, vMax: null, kWCont: 0.56, kWPico: null, nmCont: null, nmPico: null, rpmMax: null, kg: 4.05, refrigeracion: 'aire; con ferrofluido (Statorade) aguanta más',
    fuente: 'https://ebikes.ca/product-info/grin-products/all-axle-hub-motor.html', tipoFuente: 'fabricante', leido: LEIDO_BICI,
    notas: 'Grin no da una potencia nominal única: da la que aguanta de continuo con el núcleo a 110 °C según las vueltas (250 W a 100 rpm, 560 W a 200, 900 W a 300 y 1.250 W a 400, sin ferrofluido). Aquí, la de 200 rpm, unos 19 km/h con rueda de 20″. Buje directo: frena regenerando. Tiene versión de eje a un solo lado para triciclos y velomóviles. Trasero: 4,30 kg. No publica el par ni el rendimiento.',
  },
  {
    id: 'cixi-pers-buje', clase: 'bici', marca: 'Cixi', modelo: 'motor de buje del sistema PERS, 250 W', montaje: 'buje', tecnologia: 'motor de buje del sistema de pedaleo sin cadena PERS',
    vNom: null, vMin: null, vMax: null, kWCont: 0.25, kWPico: null, nmCont: null, nmPico: 75, rpmMax: null, kg: 4.5, refrigeracion: null,
    fuente: 'https://www.icetrikes.co/products/pers-chainless-e-assist-system', tipoFuente: 'distribuidor', leido: LEIDO_BICI,
    notas: 'Las cifras son las que da ICE Trikes para su triciclo con el sistema PERS: motor de buje trasero de 250 W, 75 N·m y 4,5 kg, con batería de 700 Wh. No publica la tensión. Va emparejado con su pedalier generador (en «Componentes de bicicleta»).',
  },
  {
    id: 'heinzmann-rn111', clase: 'bici', marca: 'Heinzmann', modelo: 'CargoPower RN 111, 250 W', montaje: 'buje', tecnologia: 'motor de buje con reductora planetaria de acero, en baño de aceite',
    vNom: 48, vMin: 36, vMax: 48, kWCont: 0.25, kWPico: null, nmCont: null, nmPico: 113, rpmMax: null, kg: null, refrigeracion: 'aceite',
    fuente: 'https://ebike.heinzmann.com/en/finder/products/ebike-motors/e-bike-rn-111/tabs-cargopower-e', tipoFuente: 'fabricante', leido: LEIDO_BICI,
    notas: 'Para bicis de carga. Heinzmann da 125 a 600 W de potencia nominal y 250 W por motor según la norma EN 15194; los 113 N·m en el eje son de la descripción del sistema sin cadena de Schaeffler y Heinzmann (IEEE Spectrum). No publica la masa: se queda la del deslizador.',
  },
];

// ─────────────────────────────── controllers (inverters) ───────────────────────────────
export const CONTROLADORES: ControladorCatalogo[] = [
  {
    id: 'gen4-s4-80', marca: 'Sevcon (hoy Turntide)', modelo: 'Gen4 tamaño 4, 80 V 350 A', vNom: 80, vMin: 39.1, vMax: 116,
    aPico: 350, aPicoTiempo: '2 min (420 A durante 10 s)', aCont: 140, corriente: 'fase', kg: null,
    fuente: 'https://turntide.com/wp-content/uploads/2024/05/Turntide-Gen4-Size-2-4-6-Datasheet.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: 'Corrientes eficaces (RMS) al motor. La ficha da medidas pero no la masa.',
  },
  {
    id: 'gen4-s6-80', marca: 'Sevcon (hoy Turntide)', modelo: 'Gen4 tamaño 6, 80 V 550 A', vNom: 80, vMin: 39.1, vMax: 116,
    aPico: 550, aPicoTiempo: '2 min (660 A durante 10 s)', aCont: 220, corriente: 'fase', kg: null,
    fuente: 'https://turntide.com/wp-content/uploads/2024/05/Turntide-Gen4-Size-2-4-6-Datasheet.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: 'Corrientes eficaces (RMS) al motor. Sin masa publicada.',
  },
  {
    id: 'gen4-s6-48', marca: 'Sevcon (hoy Turntide)', modelo: 'Gen4 tamaño 6, 48 V 650 A', vNom: 48, vMin: 19.3, vMax: 69.6,
    aPico: 650, aPicoTiempo: '2 min (780 A durante 10 s)', aCont: 260, corriente: 'fase', kg: null,
    fuente: 'https://turntide.com/wp-content/uploads/2024/05/Turntide-Gen4-Size-2-4-6-Datasheet.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: 'Corrientes eficaces (RMS) al motor. Sin masa publicada.',
  },
  {
    id: 'curtis1238e-65', marca: 'Curtis', modelo: '1238E-65XX (48–80 V, 550 A)', vNom: 80, vMin: 48, vMax: 80,
    aPico: 550, aPicoTiempo: '2 min', aCont: 190, corriente: 'fase', kg: null,
    fuente: 'https://shop.hainzl.at/media/pdf/0f/9f/68/123638E_datasheet_en.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: 'Ficha de Curtis (copia en un distribuidor). 190 A es la corriente S2 de 60 min. Sin masa publicada.',
  },
  {
    id: 'curtis1238e-76', marca: 'Curtis', modelo: '1238E-76XX (72–96 V, 650 A)', vNom: 96, vMin: 72, vMax: 96,
    aPico: 650, aPicoTiempo: '2 min', aCont: 200, corriente: 'fase', kg: null,
    fuente: 'https://shop.hainzl.at/media/pdf/0f/9f/68/123638E_datasheet_en.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: '200 A es la corriente S2 de 60 min. Sin masa publicada.',
  },
  {
    id: 'kls72601', marca: 'Kelly', modelo: 'KLS72601-8080I (72 V, 600 A)', vNom: 72, vMin: null, vMax: 72,
    aPico: 600, aPicoTiempo: '60 s', aCont: 240, corriente: 'fase', kg: null,
    fuente: 'https://kellycontroller.eu/download/KLS8080I-IPS/KellyKLS-8080I-IPSUserManualV1.11.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: 'Manual de Kelly: 288 × 186 × 81 mm, sin masa publicada.',
  },
  {
    id: 'kls96601', marca: 'Kelly', modelo: 'KLS96601-8080I (96 V, 600 A)', vNom: 96, vMin: null, vMax: 96,
    aPico: 600, aPicoTiempo: '30 s', aCont: 240, corriente: 'fase', kg: null,
    fuente: 'https://kellycontroller.eu/download/KLS8080I-IPS/KellyKLS-8080I-IPSUserManualV1.11.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: '288 × 186 × 81 mm, sin masa publicada.',
  },
  {
    id: 'nd72850', marca: 'Fardriver', modelo: 'ND72850 (48–72 V)', vNom: 72, vMin: 48, vMax: 88,
    aPico: 850, aPicoTiempo: 'pico de fase', aCont: null, corriente: 'fase', aBat: 400, kg: 3.5,
    fuente: 'https://manuals.plus/asin/B0B2RCHP4Z.pdf', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: 'Ficha de venta: 400 A de batería y 850 A de fase como máximos; no da corriente continua. 222 × 142 × 71 mm.',
  },
  {
    id: 'votol-em150', marca: 'Votol (SiAECOSYS)', modelo: 'EM-150 (48–72 V)', vNom: 72, vMin: 48, vMax: 72,
    aPico: 490, aPicoTiempo: 'pico de fase', aCont: null, corriente: 'fase', aBat: 150, kg: 2.04,
    fuente: 'https://manuals.plus/ae/1005009611758552', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: 'Ficha de venta: 150 A de batería (200 A en «boost»), 490 A de fase; sin corriente continua.',
  },
  {
    id: 'votol-em200', marca: 'Votol (SiAECOSYS)', modelo: 'EM-200/2SP (72 V)', vNom: 72, vMin: null, vMax: null,
    aPico: 600, aPicoTiempo: 'pico (sin decir de qué)', aCont: 200, corriente: 'sin aclarar', kg: 2.44,
    fuente: 'https://manuals.plus/ae/1005009707021960', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: 'La ficha da «600 A de pico» y «200 A nominales» sin decir si son de batería o de fase: se comparan como si fueran de fase.',
  },
  // ── bicycle controllers (2026-11-24)
  {
    id: 'grin-baserunner-l10', clase: 'bici', marca: 'Grin', modelo: 'Baserunner L10 V6 (encapsulado)', vNom: 48, vMin: null, vMax: 60,
    aPico: 80, aPicoTiempo: 'de pico', aCont: 45, corriente: 'fase', kg: 0.18,
    fuente: 'https://ebikes.ca/baserunner-l10-sa-controller.html', tipoFuente: 'fabricante', leido: LEIDO_BICI,
    notas: 'Control vectorial (FOC), con frenada regenerativa proporcional. 90 × 63 × 15 mm, encapsulado en epoxi. Continua: 45–50 A de fase. No publica la corriente máxima de batería. 290 USD.',
  },
  {
    id: 'grin-phaserunner-l10', clase: 'bici', marca: 'Grin', modelo: 'Phaserunner L10 V6', vNom: 72, vMin: 30, vMax: 90,
    aPico: 90, aPicoTiempo: 'de pico', aCont: 45, corriente: 'fase', aBat: 40, kg: 0.26,
    fuente: 'https://ebikes.ca/phaserunner-l10-motor-controller.html', tipoFuente: 'fabricante', leido: LEIDO_BICI,
    notas: 'Control vectorial (FOC), con frenada regenerativa. 99 × 40 × 34 mm. Batería de 30 a 90 V; la tensión nominal de 72 V es la del centro de ese rango, no una cifra de Grin. 350 USD.',
  },
];

// ─────────────────────────────── reduction gears ───────────────────────────────
export const REDUCTORAS: ReductoraCatalogo[] = [
  {
    id: 'ple120-4', marca: 'Neugart', modelo: 'PLE120, una etapa, i = 4', tipo: 'planetaria', relacion: 4,
    nmSalida: 155, nmSalidaMax: 520, rpmEntradaMax: 6500, rendimiento: 97, kg: 6, diferencial: false,
    fuente: 'https://infosys.beckhoff.com/content/1033/ag2250_ba/8411944459.html', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: 'Datos de Neugart publicados por Beckhoff. 520 N·m es el par de parada de emergencia, no de uso. Rendimiento 97–98 %.',
  },
  {
    id: 'ple120-5', marca: 'Neugart', modelo: 'PLE120, una etapa, i = 5', tipo: 'planetaria', relacion: 5,
    nmSalida: 195, nmSalidaMax: 500, rpmEntradaMax: 6500, rendimiento: 97, kg: 6, diferencial: false,
    fuente: 'https://infosys.beckhoff.com/content/1033/ag2250_ba/8411944459.html', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: '500 N·m es el par de parada de emergencia. Rendimiento 97–98 %.',
  },
  {
    id: 'plpe120-5', marca: 'Neugart', modelo: 'PLPE120, una etapa, i = 5', tipo: 'planetaria', relacion: 5,
    nmSalida: 146, nmSalidaMax: 275, rpmEntradaMax: 6500, rendimiento: 98, kg: 7.55, diferencial: false,
    fuente: 'https://cdn.neugart.com/fileadmin/user_upload/Downloads/Catalog_Chapters/05_2026/PLPE/PLPE_2026_05_EN.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    notas: 'Catálogo Neugart 05/2026: 146 N·m continuos, 275 N·m máximos; 7,4–7,7 kg (se usa 7,55). A 6.500 rpm de entrada como máximo mecánico, pero solo 2.150 rpm en continuo.',
  },
  {
    id: 'ab142-7', marca: 'Apex Dynamics', modelo: 'AB142, una etapa, i = 7', tipo: 'planetaria', relacion: 7,
    nmSalida: 550, nmSalidaMax: null, rpmEntradaMax: 6000, rendimiento: 97, kg: null, diferencial: false,
    fuente: 'https://datasheets.globalspec.com/ds/apex-dynamics-usa/ab142-7/a3bd6b91-512e-476d-bac7-e9d8fa5fd70a', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: 'Par de salida nominal 4.867 lbf·in (550 N·m). La ficha no da la masa.',
  },
  {
    id: 'comex-991', marca: 'Comex', modelo: 'Diferencial de dos etapas, 9,91 : 1', tipo: 'diferencial', relacion: 9.91,
    nmSalida: null, nmSalidaMax: 1000, rpmEntradaMax: null, rendimiento: 96, kg: 11.3, diferencial: true,
    fuente: 'https://electricmotorsport.com/me1616-liquid-cooled-motor-drive-system-4.html', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: 'Reductora con diferencial de ejes paralelos, vendida con el ME1616. 1.000 N·m de salida como máximo; sin modelo ni rpm de entrada publicados.',
  },
  {
    id: 'comex-157', marca: 'Comex', modelo: 'Diferencial de dos etapas, 15,7 : 1', tipo: 'diferencial', relacion: 15.7,
    nmSalida: null, nmSalidaMax: 1000, rpmEntradaMax: null, rendimiento: 96, kg: 11.3, diferencial: true,
    fuente: 'https://electricmotorsport.com/me1616-liquid-cooled-motor-drive-system-4.html', tipoFuente: 'distribuidor', leido: LEIDO,
    notas: 'La misma, con la relación larga.',
  },
  {
    id: 'gevd200-646', marca: 'Hewland', modelo: 'GEVD-200 con diferencial, 6,46 : 1', tipo: 'diferencial', relacion: 6.46,
    nmSalida: null, nmSalidaMax: null, nmEntradaMax: 500, rpmEntradaMax: null, rendimiento: null, kg: 32, diferencial: true,
    fuente: 'https://powertrain.hewland.com/upcp_product/gevd-200-ev-reducer-with-differential', tipoFuente: 'fabricante', leido: LEIDO,
    notas: 'De competición: 500 N·m de entrada y 32 kg. Relación a elegir entre 3 y 9 : 1 (6,46 es una de las de la tabla).',
  },
];

// ─────────────────────────────── petrol engines ───────────────────────────────
export const TERMICOS: TermicoCatalogo[] = [
  {
    id: 'gx200', marca: 'Honda', modelo: 'GX200', cc: 196, cilindros: 1, ciclo: '4 tiempos OHV', refrigeracion: 'aire',
    kW: 4.1, rpm: 3600, potencia: 'neta', kWCont: 3.7, nm: 12.4, kg: 16.1, consumoLh: 1.7, consumoKW: 3.7,
    fuente: 'https://cdn.honda.co.za/pub/general/gx200/brochure/GX200.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: { valor: 475, moneda: 'EUR', iva: 'incluido', fuente: 'https://www.mastercity.lt/en/honda-gx200-gasoline-engine-43-kw-20mm-shaft', leido: LEIDO_PRECIO, nota: '392,56 € sin IVA' },
    notas: '3,7 kW continuos a 3.600 rpm, gastando 1,7 L/h.',
  },
  {
    id: 'gx390', marca: 'Honda', modelo: 'GX390', cc: 389, cilindros: 1, ciclo: '4 tiempos OHV', refrigeracion: 'aire',
    kW: 8.7, rpm: 3600, potencia: 'neta', kWCont: 7.0, nm: 26.5, kg: 31.7, consumoLh: 3.5, consumoKW: 7.0,
    fuente: 'https://www.honda.co.jp/engines/pdf/GX390.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: { valor: 1263, moneda: 'EUR', iva: 'incluido', fuente: 'https://www.mastercity.lt/en/petrol-engine-honda-gx390-without-fuel-tank-for-generator-87-kw-crankshaft', leido: LEIDO_PRECIO, nota: 'versión para generador, sin depósito; 1.043,80 € sin IVA' },
    notas: '7,0 kW continuos a 3.600 rpm, gastando 3,5 L/h.',
  },
  {
    id: 'gx690', marca: 'Honda', modelo: 'GX690 (V2)', cc: 688, cilindros: 2, ciclo: '4 tiempos OHV', refrigeracion: 'aire',
    kW: 16.6, rpm: 3600, potencia: 'neta', kWCont: 13.0, nm: 48.3, kg: 44.4, consumoLh: 6.2, consumoKW: 13.0,
    fuente: 'https://www.honda.sk/content/dam/local/slovakia/industrial/engines/pdf/industrial/GX690.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: { valor: 2625, moneda: 'EUR', iva: 'sin aclarar', fuente: 'https://www.smartbuytool.gr/en/ergaleia/honda-gx690-kinitiras-benzinis-me-sfina-ilektriki-ekkinisi.html', leido: LEIDO_PRECIO, nota: 'con arranque eléctrico' },
    notas: '13,0 kW continuos a 3.600 rpm, gastando 6,2 L/h.',
  },
  {
    id: 'fs730v-efi', marca: 'Kawasaki', modelo: 'FS730V EFI (V2)', cc: 726, cilindros: 2, ciclo: '4 tiempos, inyección', refrigeracion: 'aire',
    kW: 17.2, rpm: 3600, potencia: 'neta', kWCont: null, nm: 50.4, kg: 46.5, consumoLh: null, consumoKW: null,
    fuente: 'https://www.kawasaki-engines.eu/pdf/en-GB_fs730v-efi.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: null,
    notas: 'Eje vertical (de cortacésped). Sin consumo publicado: el rendimiento no se rellena.',
  },
  {
    id: 'vanguard37-efi', marca: 'Vanguard (Briggs & Stratton)', modelo: 'Big Block 37 HP EFI (993 cc)', cc: 993, cilindros: 2, ciclo: '4 tiempos, inyección', refrigeracion: 'aire',
    kW: 27.6, rpm: null, potencia: 'bruta', kWCont: null, nm: null, kg: 56.7, consumoLh: null, consumoKW: null,
    fuente: 'https://www.vanguardpower.com/en-au/products/37hp-efi-hs', tipoFuente: 'fabricante', leido: LEIDO,
    precio: { valor: 4799, moneda: 'USD', iva: 'sin aclarar', fuente: 'https://smallenginewarehouse.com/61e377-0140', leido: LEIDO_PRECIO, nota: 'modelo 61E377-0140; agotado el día de la lectura' },
    notas: '«37,0 HP brutos» (27,6 kW; lo neto, lo que llega al eje, es menos). 125 libras (56,7 kg) sin decir si en seco. Sin par ni consumo publicados.',
  },
  {
    id: 'aixro-xr50', marca: 'Aixro', modelo: 'XR50 (rotativo Wankel)', cc: 294, cilindros: 1, ciclo: 'Wankel, mezcla de aceite 50:1', refrigeracion: 'por la mezcla que entra (rotor), y aire',
    kW: 35.8, rpm: 8750, potencia: 'máxima', kWCont: null, nm: 39.3, kg: 17.0, consumoLh: null, consumoKW: null,
    fuente: 'https://www.renntechmercedes.com/index.php/products/powersports/aixro-xr-50-rotary-karting-engine-w-standard-idm-magneto-ignition-791-detail', tipoFuente: 'distribuidor', leido: LEIDO,
    precio: { valor: 5480, moneda: 'USD', iva: 'sin IVA', fuente: 'https://www.renntechmercedes.com/index.php/products/powersports/aixro-xr-50-rotary-karting-engine-w-standard-idm-magneto-ignition-791-detail', leido: LEIDO_PRECIO },
    notas: 'Motor de kart: 48 CV a 8.750 rpm, 29 lbf·ft (39,3 N·m), 37,5 libras (17 kg). Quema aceite con la gasolina; no está pensado para un generador homologable.',
  },
  {
    id: 'rotax912is', marca: 'Rotax', modelo: '912 iS Sport (avión)', cc: 1352, cilindros: 4, ciclo: '4 tiempos bóxer, inyección', refrigeracion: 'culatas por líquido, cilindros por aire',
    kW: 73.5, rpm: 5800, potencia: 'máxima', kWCont: 72.0, nm: 132, kg: 63.6, consumoLh: null, consumoKW: null,
    fuente: 'https://www.flyrotax.com/assets/files/products/Datasheet-Aircraft-Engine-912-iS-iSc-Sport.pdf', tipoFuente: 'fabricante', leido: LEIDO,
    precio: null,
    notas: '63,6 kg con la reductora de hélice y el embrague; el escape, el alternador y las bombas van aparte. La cota alta: mucho más de lo que pide este coche.',
  },
  // (2026-11-17) two more, between the GX390 and the GX690, and a liquid-cooled three-cylinder (a car-like range extender)
  {
    id: 'gx270', marca: 'Honda', modelo: 'GX270', cc: 270, cilindros: 1, ciclo: '4 tiempos OHV', refrigeracion: 'aire',
    kW: 6.3, rpm: 3600, potencia: 'neta', kWCont: 5.1, nm: 19.1, kg: 25.8, consumoLh: 2.4, consumoKW: 5.1,
    fuente: 'https://www.honda.co.jp/engines/pdf/GX270.pdf', tipoFuente: 'fabricante', leido: LEIDO_PRECIO,
    precio: { valor: 1419.57, moneda: 'EUR', iva: 'incluido', fuente: 'https://manelservice.com/en/professional-engines/honda-gx270ut2-qhq4-engine', leido: LEIDO_PRECIO, nota: '1.163,58 € sin IVA' },
    notas: '5,1 kW continuos a 3.600 rpm, gastando 2,4 L/h; 19,1 N·m a 2.500 rpm.',
  },
  {
    id: 'kubota-wg752', marca: 'Kubota', modelo: 'WG752 (3 cilindros, agua)', cc: 736, cilindros: 3, ciclo: '4 tiempos, gasolina', refrigeracion: 'líquido',
    kW: 18.5, rpm: 3600, potencia: 'máxima', kWCont: null, nm: 56, kg: 62, consumoLh: null, consumoKW: null,
    fuente: 'https://www.lectura-specs.com/en/model/components/engines-kubota/wg752-g-e3-11703515', tipoFuente: 'distribuidor', leido: LEIDO_PRECIO,
    precio: null,
    notas: 'Ficha de una base de datos de maquinaria (Lectura): 0,74 L, tres en línea, 18,5 kW a 3.600 rpm, 56 N·m, 62 kg. Sin consumo publicado. Kubota vende por distribuidor, sin precio público.',
  },
];

// ─────────────────────────────── helpers ───────────────────────────────
/** Petrol's lower heating value (kWh per litre), the same 8,9 the hybrid's consumption uses (geometriaTriciclo.ts). */
const KWH_LITRO = 8.9;
/** The engine's efficiency (%) from its published consumption at a published power, or null when it is not published. */
export const rendimientoTermico = (t: TermicoCatalogo) => t.consumoLh && t.consumoKW ? t.consumoKW / (t.consumoLh * KWH_LITRO) * 100 : null;

export const motorDe = (id?: string) => MOTORES.find(m => m.id === id) ?? null;
export const controladorDe = (id?: string) => CONTROLADORES.find(c => c.id === id) ?? null;
export const reductoraDe = (id?: string) => REDUCTORAS.find(r => r.id === id) ?? null;
export const termicoDe = (id?: string) => TERMICOS.find(t => t.id === id) ?? null;

/** (2026-11-24) each option carries its class, so the selector groups and marks it: a bicycle's or a heavy vehicle's. */
const opcion = (p: Base) => ({ k: p.id, n: `${p.marca} ${p.modelo}`, clase: (p.clase ?? 'pesado') as 'bici' | 'pesado' });
const MEDIDA = { k: A_MEDIDA, n: 'A medida (deslizadores)' };
export const OPCIONES_MOTOR = [MEDIDA, ...MOTORES.map(opcion)];
export const OPCIONES_CONTROLADOR = [MEDIDA, ...CONTROLADORES.map(opcion)];
export const OPCIONES_REDUCTORA = [{ k: A_MEDIDA, n: 'Ninguna (motor de buje)' }, ...REDUCTORAS.map(opcion)];
export const OPCIONES_TERMICO = [MEDIDA, ...TERMICOS.map(opcion)];

/** The design's keys for the four choices, and whether an id is one of that list (a part removed later opens as «A medida»). */
export const CATALOGO_CLAVES = ['tCatMotor', 'tCatCtrl', 'tCatReductora', 'tCatTermico'] as const;
export const idValido = (k: typeof CATALOGO_CLAVES[number], id: string) => id === A_MEDIDA || (k === 'tCatMotor' ? MOTORES : k === 'tCatCtrl' ? CONTROLADORES : k === 'tCatReductora' ? REDUCTORAS : TERMICOS).some(p => p.id === id);

/** The choices a design keeps. Absent in a saved design = «A medida». */
export interface EleccionCatalogo { tCatMotor?: string; tCatCtrl?: string; tCatReductora?: string; tCatTermico?: string }

/**
 * What a catalogue choice fixes: the slider values it sets, from the published figures only. `motores` is how many
 * motors the car carries (two hub motors with two rear wheels: the sliders hold both together).
 */
export function valoresCatalogo(E: EleccionCatalogo, motores: 1 | 2): Partial<Record<'tKWNom' | 'tKWPico' | 'tMMotor' | 'tMInversor' | 'tPhevKW' | 'tRendTerm', number>> {
  const o: Partial<Record<'tKWNom' | 'tKWPico' | 'tMMotor' | 'tMInversor' | 'tPhevKW' | 'tRendTerm', number>> = {};
  const m = motorDe(E.tCatMotor), n = m?.montaje === 'buje' ? motores : 1;
  if (m) {
    if (m.kWCont != null) o.tKWNom = m.kWCont * n;
    if (m.kWPico != null) o.tKWPico = m.kWPico * n;
    if (m.kg != null) o.tMMotor = m.kg * n;
  }
  const c = controladorDe(E.tCatCtrl);
  if (c?.kg != null) o.tMInversor = c.kg * n;
  const t = termicoDe(E.tCatTermico);
  if (t) { o.tPhevKW = t.kW; const r = rendimientoTermico(t); if (r != null) o.tRendTerm = Math.round(r * 2) / 2; }
  return o;
}

/** A check line, the same shape as the editor's `Comprobacion` (geometria.ts). */
export interface ComprobacionCat { nombre: string; holgura: number; minimo: number; mostrar?: string; dep?: string }

const f1 = (v: number, d = 1) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * The checks that need only the parts and the car's geometry (no Cd): voltages agree, the controller's current
 * covers the motor's peak, the reduction gear's torque and speed. `kWPico` is the peak power in use (the slider,
 * filled by the catalogue when it publishes it), for the whole car; `dRueda` the driven wheel's diameter (m).
 */
export function comprobacionesCatalogo(E: EleccionCatalogo, x: { kWPico: number; motores: 1 | 2; dRueda: number; velCalculo: number; planetario?: number | null }): ComprobacionCat[] {
  const out: ComprobacionCat[] = [];
  const m = motorDe(E.tCatMotor), c = controladorDe(E.tCatCtrl), r = reductoraDe(E.tCatReductora);
  // (2026-11-17: `planetario`, the traction motor is MG2 on the power split's ring, one motor next to the engine; the value
  // is the ring's rpm at 100 km/h, hibrido.ts `CORONA_A_100`: passed in, so this leaf module imports nothing)
  const porMotor = m?.montaje === 'central' || x.planetario ? x.kWPico : x.kWPico / x.motores;
  if (x.planetario && m?.montaje === 'buje') {
    out.push({ dep: 'propulsion', nombre: `Motor eléctrico unido al planetario: el elegido (${m.marca}) es de buje`, holgura: -1, minimo: 0, mostrar: 'elige uno central en «Motor eléctrico: modelo comercial»' });
  }
  // the ring turns CORONA_A_100 rpm at 100 km/h (the chain is chosen for it, hibrido.ts): MG2 on it must reach the speed of calculation
  if (x.planetario && m?.montaje === 'central' && m.rpmMax != null) {
    const pide = x.planetario * x.velCalculo / 100 * (m.reduccion ?? 1);
    out.push({ dep: 'propulsion', nombre: `MG2 en la corona: vueltas a ${Math.round(x.velCalculo)} km/h`, holgura: m.rpmMax - pide, minimo: 0, mostrar: `${Math.round(pide)} de ${m.rpmMax} rpm` });
  }
  // voltage: the controller's nominal voltage within the motor's range
  if (m && c && c.vNom != null && (m.vMin != null || m.vMax != null)) {
    const v = c.vNom, lo = m.vMin ?? -Infinity, hi = m.vMax ?? Infinity;
    out.push({ dep: 'propulsion,energia', nombre: `Tensión: el controlador (${v} V) dentro de la que admite el motor`, holgura: Math.min(v - lo, hi - v), minimo: 0, mostrar: `${v} V · motor ${m.vMin ?? '?'}–${m.vMax ?? '?'} V` });
  }
  if (m?.vPico && c?.vNom != null) {
    out.push({ dep: 'propulsion,energia', nombre: `Tensión para el pico del motor (${m.vPico} V, dice ${m.marca})`, holgura: c.vNom - m.vPico, minimo: 0, mostrar: c.vNom >= m.vPico ? 'llega' : `con ${c.vNom} V da menos pico: unos ${f1(m.kWPico! * c.vNom / m.vPico, 0)} kW` });
  }
  if (m?.controladorIntegrado && c) {
    out.push({ dep: 'propulsion', nombre: `El ${m.modelo} ya lleva su inversor: sobra el controlador`, holgura: -1, minimo: 0, mostrar: 'sobra' });
  }
  // current: what the motor's peak asks at the controller's voltage (P = V × I, with 95 % in the controller); an AC
  // controller's phase RMS current is about its battery current at full voltage, so both are compared with it
  if (c && c.vNom != null && (c.aBat ?? c.aPico) != null) {
    const pide = porMotor * 1000 / (c.vNom * 0.95), da = c.aBat ?? c.aPico!;
    out.push({ dep: 'propulsion,energia', nombre: `Controlador: corriente para la potencia máxima (${f1(porMotor)} kW${x.motores === 2 && m?.montaje !== 'central' ? ' por motor' : ''} a ${c.vNom} V)`, holgura: da - pide, minimo: 0, mostrar: `pide ${Math.round(pide)} A · da ${Math.round(da)} A${c.aBat != null ? ' de batería' : ' (' + c.aPicoTiempo + ')'}` });
  }
  if (r) {
    const motorRpm = m?.rpmMax != null ? m.rpmMax / (m.reduccion ?? 1) : null;
    if (m?.nmPico != null) {
      const nmRueda = m.nmPico * (m.reduccion ?? 1);
      if (r.nmEntradaMax != null) out.push({ dep: 'propulsion', nombre: 'Reductora: par de entrada (el par máximo del motor)', holgura: r.nmEntradaMax - nmRueda, minimo: 0, mostrar: `${Math.round(nmRueda)} de ${r.nmEntradaMax} N·m` });
      const sal = nmRueda * r.relacion, lim = r.nmSalidaMax ?? r.nmSalida;
      if (lim != null) out.push({ dep: 'propulsion', nombre: `Reductora: par de salida (motor ${Math.round(nmRueda)} N·m × ${f1(r.relacion, 2)})`, holgura: lim - sal, minimo: 0, mostrar: `${Math.round(sal)} de ${lim} N·m${r.nmSalidaMax == null ? ' (nominal)' : r.nmSalida != null ? ` (nominal ${r.nmSalida})` : ''}` });
    }
    if (motorRpm != null) {
      if (r.rpmEntradaMax != null) out.push({ dep: 'propulsion', nombre: 'Reductora: revoluciones de entrada', holgura: r.rpmEntradaMax - motorRpm, minimo: 0, mostrar: `${Math.round(motorRpm)} de ${r.rpmEntradaMax} rpm` });
      const kmh = motorRpm / r.relacion / 60 * Math.PI * x.dRueda * 3.6;
      out.push({ dep: 'propulsion', nombre: `Velocidad a las rpm máximas del motor, con la reductora (rueda de ${Math.round(x.dRueda * 1000)} mm)`, holgura: kmh - x.velCalculo, minimo: 0, mostrar: `${Math.round(kmh)} km/h · de cálculo ${Math.round(x.velCalculo)} km/h` });
    }
  }
  // (on the planetary's ring, the drop case and the chain to the wheel are its reduction: nothing more to choose)
  if (m?.montaje === 'central' && !r && !m.reduccion && !x.planetario) {
    out.push({ dep: 'propulsion', nombre: `Motor central (${m.marca}): necesita una reductora hasta la rueda`, holgura: -1, minimo: 0, mostrar: 'elige una en «Reductora»' });
  }
  return out;
}

/** The mass a chosen reduction gear adds (kg), or 0; null when the maker does not publish it. */
export const masaReductora = (E: EleccionCatalogo) => { const r = reductoraDe(E.tCatReductora); return r ? r.kg : 0; };

// ─────────────────────────────── comparing (2026-11-17) ───────────────────────────────
/** Petrol's density (kg/L), the same 0,745 the tank's mass uses (triciclo/modelo.ts). */
const KG_LITRO = 0.745;
/**
 * Brake-specific fuel consumption (g/kWh): grams of petrol per kWh at the shaft, from the consumption the maker
 * publishes at a published power; null when it publishes none. A good small engine is ≈ 250–300 g/kWh at its best
 * point; an air-cooled one at its continuous rating, more.
 */
export const bsfc = (t: TermicoCatalogo) => t.consumoLh && t.consumoKW ? t.consumoLh * KG_LITRO * 1000 / t.consumoKW : null;
/** One horsepower (CV, metric) is 0,7355 kW. */
export const cv = (kW: number) => kW / 0.7355;
/**
 * A USD price in euros, at an approximate rate (0,86 € per dollar, autumn 2026): the comparison is an order of
 * magnitude; the card always shows the price as published too.
 */
export const EUR_POR_USD = 0.86;
export const precioEuros = (p: Precio | null | undefined) => p == null ? null : p.moneda === 'EUR' ? p.valor : p.valor * EUR_POR_USD;
