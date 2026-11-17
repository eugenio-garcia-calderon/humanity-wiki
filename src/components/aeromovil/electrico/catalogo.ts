/**
 * Catalogue of the electrical system's parts for the Triciclo family (2026-11-17, Eugenio: «en energía, llámalo batería.
 * Y ahí añade también la parte de toda la configuración solar y todos los controladores que tiene que tener, también los
 * cargadores eléctricos, el cargador MPPT solar, todos los componentes tienes que detallarlos en profundidad para que
 * tengamos una lista de todos los elementos. Y podemos ir jugando también con su precio, los proveedores…»).
 *
 * Same rule as `catalogoTren.ts`: every figure was read from the page in `fuente` on `leido` and copied as published.
 * `kg: null` = the page read does not publish the mass; then `kgEstimado` is the model's estimate for a part of its
 * class and `notaKg` says so (shown). Parts with no product chosen yet (fuse, precharge, service disconnect, wiring)
 * are `generico: true`: their figures are estimates by rule, labelled as such, never a product's.
 * Prices: ONE shop's listed price on `leido`, as published (an order of magnitude, not a quote). `null` = none found.
 */
import type { Precio, TipoFuente } from '../catalogoTren';

export const LEIDO_ELECTRICO = '2026-11-17';

export type TipoElectrico =
  | 'celula' | 'mppt' | 'bms' | 'obc' | 'dcdc' | 'toma' | 'contactor' | 'fusible' | 'precarga' | 'desconectador' | 'cableado' | 'bateria12';

export interface PiezaElectrica {
  id: string; tipo: TipoElectrico; marca: string; modelo: string;
  /** null for a generic part (no product chosen yet) */
  fuente: string | null; tipoFuente: TipoFuente | null; leido: string;
  generico?: boolean;
  /** published mass (kg), or null */
  kg: number | null;
  /** the model's estimate when `kg` is null (kg), and why */
  kgEstimado?: number; notaKg?: string;
  /** efficiency (0–1) at its rating, as published; null = not published */
  rendimiento: number | null;
  /** battery (output) side voltage it works with (V): min–max */
  vBatMin?: number; vBatMax?: number;
  /** input side (V): an MPPT's panel voltage, a DC-DC's pack voltage */
  vEntMin?: number; vEntMax?: number;
  /** MPPT: boost (panel voltage below the battery's) or buck (panel above) */
  boost?: boolean;
  /** current (A): an MPPT's panel input, a charger's output, a DC-DC's 12 V output, a BMS's/contactor's continuous */
  a?: number | null;
  /** power (W): rated */
  w?: number | null;
  /** cells it can watch (BMS) */
  celdasMax?: number;
  precio: Precio | null;
  /** what the source leaves out, disagreements, conditions (Spanish: shown) */
  notas?: string;
}

const L = LEIDO_ELECTRICO;
const eur = (valor: number, iva: Precio['iva'], fuente: string, nota?: string): Precio => ({ valor, moneda: 'EUR', iva, fuente, leido: L, ...(nota ? { nota } : {}) });
const usd = (valor: number, iva: Precio['iva'], fuente: string, nota?: string): Precio => ({ valor, moneda: 'USD', iva, fuente, leido: L, ...(nota ? { nota } : {}) });

// ─────────────────────────────── solar cells ───────────────────────────────
/**
 * The cell the panels are counted in. The editor's own solar figures (`RENDIMIENTO_SOLAR`, 21 %, `res.solarPico`,
 * `res.solarDia`) are NOT changed by this: the cell only decides how many fit and the strings' voltage and current.
 */
export const CELULA: PiezaElectrica & { vmp: number; imp: number; voc: number; wp: number; area: number } = {
  id: 'maxeon-gen3', tipo: 'celula', marca: 'Maxeon (SunPower)', modelo: 'Gen III, célula de contacto trasero de 125 mm',
  fuente: 'https://midsummerwholesale.co.uk/pdfs/sunpower-back-contact-gen3-solar-cell-ds-en-a4-m3.pdf', tipoFuente: 'fabricante', leido: L,
  kg: null, kgEstimado: 0.0075, notaKg: 'la ficha no da la masa; el panel entero se cuenta con «Paneles solares: masa por m²»',
  rendimiento: 0.237, vmp: 0.62, imp: 5.83, voc: 0.73, wp: 3.64,
  // area of one cell from its published power and efficiency (P = η × 1000 W/m² × área)
  area: 3.64 / (0.237 * 1000),
  precio: null,
  notas: 'Clase «Premium Performance» de la ficha: 3,64 W, 23,7 %, 0,62 V y 5,83 A en el punto de máxima potencia (1000 W/m², 25 °C). Los demás números del editor siguen con células al 21 % (más prudente: el panel curvo y caliente rinde menos).',
};

// ─────────────────────────────── MPPT solar charge controllers ───────────────────────────────
export const MPPTS: PiezaElectrica[] = [
  {
    id: 'victron-100-20', tipo: 'mppt', marca: 'Victron Energy', modelo: 'SmartSolar MPPT 100/20 (hasta 48 V)', boost: false,
    vBatMin: 12, vBatMax: 48, vEntMin: 0, vEntMax: 100, a: 20, w: 1160, kg: 0.65, rendimiento: 0.98,
    fuente: 'https://www.offgridtec.com/en/victron-smartsolar-mppt-100-20-48-20a-12v-24v-48v-solar-charge-controller.html', tipoFuente: 'distribuidor', leido: L,
    precio: eur(97.10, 'incluido', 'https://www.offgridtec.com/en/victron-smartsolar-mppt-100-20-48-20a-12v-24v-48v-solar-charge-controller.html', 'con IVA alemán del 19 %'),
    notas: 'Reductor («buck»): el panel tiene que dar más tensión que la batería (hasta 100 V en vacío). 20 A de carga; 1.160 W de panel con batería de 48 V. Solo baterías de 12, 24 o 48 V.',
  },
  {
    id: 'genasun-gvb8-58', tipo: 'mppt', marca: 'Genasun', modelo: 'GVB-8 Li 58 V (elevador, 8 A)', boost: true,
    vBatMin: 40, vBatMax: 58, vEntMin: 5, vEntMax: 50, a: 8, w: 350, kg: 0.28, rendimiento: 0.96,
    fuente: 'https://cdn.shopify.com/s/files/1/0607/9699/3689/files/Genasun_GVB-8-WP_Datasheet-2018-1.pdf', tipoFuente: 'fabricante', leido: L,
    precio: usd(175, 'sin aclarar', 'https://ebikes.ca/genasun-52v-solar-mppt.html', 'oferta (precio normal 210 USD); 0,28 kg según esa tienda'),
    notas: 'Elevador («boost»): el panel da menos tensión que la batería (panel de hasta 50 V en vacío, 8 A). 96–99 % de rendimiento según la ficha (se toma 96 %). Para baterías de 48 V (14–16 celdas de litio).',
  },
  {
    id: 'grin-400-boost', tipo: 'mppt', marca: 'Grin Technologies', modelo: 'MPPT elevador ajustable de 400 W', boost: true,
    vBatMin: 24, vBatMax: 84, a: null, w: 400, kg: 0.46, rendimiento: null,
    fuente: 'https://ebikes.ca/adjustable-400w-boost-mppt.html', tipoFuente: 'distribuidor', leido: L,
    precio: null,
    notas: 'Salida programable de 24 a 84 V, 400 W. La página no publica la tensión ni la corriente de entrada, ni el rendimiento, ni el precio.',
  },
  {
    id: 'elmar-140', tipo: 'mppt', marca: 'Elmar Solar', modelo: 'MPPT 140 V serie B (coches solares)', boost: true,
    vBatMin: 22, vBatMax: 165, vEntMin: 20, vEntMax: 150, a: 7, w: null, kg: 0.395, rendimiento: 0.984,
    fuente: 'https://nusolar.github.io/training-f23/pdfs/mppt.pdf', tipoFuente: 'distribuidor', leido: L,
    precio: null,
    notas: 'El de los equipos de la World Solar Challenge. Entrada de 20 a 150 V y hasta 7 A; salida de fábrica a cualquier tensión por debajo de 165 V; 98,4–99,3 % (se toma 98,4 %); 395 g con caja. Ficha copiada en la formación de un equipo universitario (NU Solar); precio a pedir (hello@elmar.solar).',
  },
];

// ─────────────────────────────── BMS ───────────────────────────────
export const BMSS: PiezaElectrica[] = [
  {
    id: 'daly-24s-100', tipo: 'bms', marca: 'Daly', modelo: 'Smart BMS LiFePO4 24S 100 A', celdasMax: 24, a: 100,
    kg: null, kgEstimado: 0.6, notaKg: 'la tienda no da la masa; estimada como una placa de 24S con disipador', rendimiento: null,
    fuente: 'https://evcomponents.com/daly-smart-bms-for-lifepo4.html', tipoFuente: 'distribuidor', leido: L,
    precio: usd(70.30, 'sin aclarar', 'https://evcomponents.com/daly-smart-bms-for-lifepo4.html', '32 USD de base + 20 por 24S + 18,30 por 100 A, sumado a mano'),
    notas: 'Corta la corriente él mismo con transistores: solo para paquetes pequeños (hasta 24 celdas y 100 A). La misma tienda da corrientes que no cuadran entre su título y su tabla.',
  },
  {
    id: 'orion-bms2', tipo: 'bms', marca: 'Ewert Energy', modelo: 'Orion BMS 2', celdasMax: 180, a: null,
    kg: 1.13, rendimiento: null,
    fuente: 'https://www.orionbms.com/downloads/documents/orionbms2_specifications.pdf', tipoFuente: 'fabricante', leido: L,
    precio: eur(880, 'sin IVA', 'https://evshop.eu/en/bms/558-standard-orion-2-bms-kit-configurator.html', 'versión de 36 celdas en EVShop (770 € la de 24), más sensor de corriente 90–115 € y adaptador CAN 85 €'),
    notas: 'No corta la corriente: manda abrir los contactores. 1,13 kg (2,5 libras) hasta 72 celdas, 1,47 kg hasta 108, 2,18 kg hasta 180. Gasta menos de 2 W; equilibra a 200 mA; habla CAN con el cargador y el inversor.',
  },
];
/** The Orion's mass by cell count (its datasheet's three sizes). */
export const kgOrion = (celdas: number) => (celdas <= 72 ? 1.13 : celdas <= 108 ? 1.47 : 2.18);

// ─────────────────────────────── on-board chargers (OBC) ───────────────────────────────
const TC_NOTA = 'TC Charger (Elcon) de 3,3 kW, con CAN y estanco (IP67). Entrada 90–265 V de alterna: carga en un enchufe de casa. Rendimiento «hasta 95 %, al menos 93 % a plena carga» (se toma 93 %). Masa: la tienda da 6,4 kg en la ficha técnica y 3,0 kg en otra parte; la ficha del fabricante de la versión de 144 V, 3,9 kg sin disipador ni ventilador. Se toma 6,4 kg.';
export const CARGADORES: PiezaElectrica[] = [
  {
    id: 'tc-3k3-72', tipo: 'obc', marca: 'TC Charger (Elcon)', modelo: 'HK-J 3,3 kW CAN 72 V (25–99 V, 40 A)', vBatMin: 25, vBatMax: 99, a: 40, w: 3300, kg: 6.4, rendimiento: 0.93,
    fuente: 'https://evshop.eu/en/chargers/221-tc-charger-33kw-can-72v-25-99v-40a.html', tipoFuente: 'distribuidor', leido: L,
    precio: eur(650, 'sin IVA', 'https://evshop.eu/en/chargers/221-tc-charger-33kw-can-72v-25-99v-40a.html'), notas: TC_NOTA,
  },
  {
    id: 'tc-3k3-96', tipo: 'obc', marca: 'TC Charger (Elcon)', modelo: 'HK-J 3,3 kW CAN 96 V (34–132 V, 32 A)', vBatMin: 34, vBatMax: 132, a: 32, w: 3300, kg: 6.4, rendimiento: 0.93,
    fuente: 'https://evshop.eu/en/home/222-tc-charger-33kw-can-96v-34-132v-32a.html', tipoFuente: 'distribuidor', leido: L,
    precio: eur(650, 'sin IVA', 'https://evshop.eu/en/home/222-tc-charger-33kw-can-96v-34-132v-32a.html'), notas: TC_NOTA,
  },
  {
    id: 'tc-3k3-144', tipo: 'obc', marca: 'TC Charger (Elcon)', modelo: 'HK-J 3,3 kW CAN 144 V (50–198 V, 23 A)', vBatMin: 50, vBatMax: 198, a: 23, w: 3300, kg: 3.9, rendimiento: 0.94,
    fuente: 'https://cdn.shopify.com/s/files/1/1976/6951/files/HK-J-H198-23-verA1.pdf', tipoFuente: 'fabricante', leido: L,
    precio: null, notas: 'Ficha del fabricante: 3,3 kW a 220 V, 50–198 V de salida, 32 A como máximo, al menos 94 % a plena potencia, IP67, 3,9 kg sin disipador ni ventilador. Sin precio en la página leída.',
  },
];

// ─────────────────────────────── DC-DC 12 V ───────────────────────────────
const SD_KG = 'la página leída no da la masa; estimada como un convertidor cerrado de 300–500 W';
export const DCDCS: PiezaElectrica[] = [
  {
    id: 'mw-sd500l-12', tipo: 'dcdc', marca: 'Mean Well', modelo: 'SD-500L-12 (19–72 V → 12 V, 40 A)', vEntMin: 19, vEntMax: 72, a: 40, w: 480,
    kg: null, kgEstimado: 1.3, notaKg: SD_KG, rendimiento: 0.86,
    fuente: 'https://www.meanwellaustralia.com.au/products/SD-500', tipoFuente: 'distribuidor', leido: L, precio: null,
    notas: 'Para baterías de 24 o 48 V. 86 % según el distribuidor oficial de Mean Well en Australia.',
  },
  {
    id: 'mw-rsd300f-12', tipo: 'dcdc', marca: 'Mean Well', modelo: 'RSD-300F-12 (50,4–93,6 V → 12 V, 25 A)', vEntMin: 50.4, vEntMax: 93.6, a: 25, w: 300,
    kg: null, kgEstimado: 0.9, notaKg: SD_KG, rendimiento: null,
    fuente: 'https://www.bravoelectro.com/rsd-300f-12.html', tipoFuente: 'distribuidor', leido: L,
    precio: usd(139.70, 'sin aclarar', 'https://www.bravoelectro.com/rsd-300f-12.html'),
    notas: 'Convertidor de ferrocarril (EN 50155) para 72 V nominales. La tienda no publica el rendimiento ni la masa (216 × 97 × 40 mm).',
  },
  {
    id: 'mw-sd500h-12', tipo: 'dcdc', marca: 'Mean Well', modelo: 'SD-500H-12 (72–144 V → 12 V, 40 A)', vEntMin: 72, vEntMax: 144, a: 40, w: 480,
    kg: null, kgEstimado: 1.3, notaKg: SD_KG, rendimiento: 0.87,
    fuente: 'https://www.meanwellaustralia.com.au/products/SD-500', tipoFuente: 'distribuidor', leido: L, precio: null,
    notas: 'Para baterías de 96 V («110 V» en la ficha). 87 %. La misma página da 72–114 V en el texto y 72–144 V en la tabla: se toma la tabla.',
  },
];

// ─────────────────────────────── charge inlet, switching, protection, wiring, 12 V ───────────────────────────────
export const TOMA: PiezaElectrica = {
  id: 'charx-t2hci12', tipo: 'toma', marca: 'Phoenix Contact', modelo: 'CHARX T2HCI12 3AC32 (toma Tipo 2, 32 A)', a: 32,
  kg: null, kgEstimado: 0.8, notaKg: 'la ficha leída no da la masa; estimada con sus 5 m de hilos', rendimiento: null,
  fuente: 'https://www.phoenixcontact.com/en-ie/products/vehicle-charging-inlet-charx-t2hci12-3ac32-50m2-1767998', tipoFuente: 'fabricante', leido: L, precio: null,
  notas: 'Toma Tipo 2 (la europea de alterna), 32 A, 480 V, con 5 m de hilos. Vale para un poste público y para un cable de «modo 2» al enchufe de casa (Schuko, 10 A ≈ 2,3 kW). Sin CCS: la carga rápida en continua pide otra toma y comunicación ISO 15118, y con 3,3 kW de cargador a bordo no hace falta para este coche.',
};
export const CONTACTOR: PiezaElectrica = {
  id: 'te-lev200', tipo: 'contactor', marca: 'TE Connectivity', modelo: 'Kilovac LEV200 (500 A, bobina de 12 V)', a: 500,
  kg: null, kgEstimado: 0.43, notaKg: 'sin masa en la fuente del precio; estimada como un contactor sellado de 500 A', rendimiento: null,
  fuente: null, tipoFuente: 'distribuidor', leido: '2026-11-06',
  precio: eur(289, 'sin IVA', 'RS España (precio anotado por el departamento de Energía el 2026-11-06)', 'cada uno; van dos'),
  notas: 'Dos: uno en el positivo y otro en el negativo. Los abre el BMS si algo va mal y al apagar el coche.',
};
export const GENERICOS: PiezaElectrica[] = [
  { id: 'fusible', tipo: 'fusible', marca: 'Por elegir', modelo: 'Fusible principal de alta tensión', generico: true, fuente: null, tipoFuente: null, leido: L, kg: null, kgEstimado: 0.15, notaKg: 'estimado: fusible de vehículo eléctrico con su portafusibles', rendimiento: null, precio: null,
    notas: 'Se dimensiona a la corriente de pico de la batería (arriba). El departamento lo dejó «modelo por confirmar».' },
  { id: 'precarga', tipo: 'precarga', marca: 'Por elegir', modelo: 'Precarga: relé y resistencia', generico: true, fuente: null, tipoFuente: null, leido: L, kg: null, kgEstimado: 0.25, notaKg: 'estimado: un relé pequeño y una resistencia de potencia', rendimiento: null, precio: null,
    notas: 'Carga despacio los condensadores del controlador antes de cerrar el contactor positivo: sin ella, chispazo y contactor soldado. La mandan el BMS o el controlador.' },
  { id: 'desconectador', tipo: 'desconectador', marca: 'Por elegir', modelo: 'Desconectador de servicio (MSD) e interbloqueo', generico: true, fuente: null, tipoFuente: null, leido: L, kg: null, kgEstimado: 0.35, notaKg: 'estimado: un seccionador manual enchufable', rendimiento: null, precio: null,
    notas: 'Parte la batería en dos a mano para trabajar sin tensión; el circuito de interbloqueo abre los contactores si se abre una tapa (UN R136).' },
];
export const BATERIA_12: PiezaElectrica = {
  id: 'bat12-lfp', tipo: 'bateria12', marca: 'Por elegir', modelo: 'Batería auxiliar de 12 V (LiFePO4, ~6 Ah)', generico: true, fuente: null, tipoFuente: null, leido: L,
  kg: null, kgEstimado: 0.8, notaKg: 'estimado: una batería de litio-ferrofosfato de 12 V y 6 Ah', rendimiento: null, precio: null,
  notas: 'Mantiene vivos el BMS, el cierre, las luces de emergencia y la bobina de los contactores con el coche apagado (el DC-DC solo funciona con los contactores cerrados).',
};
/** Orange high-voltage cable: copper section × 8.96 kg/dm³ plus ~25 % insulation and sheath (estimate by rule). */
export const kgMetroCable = (mm2: number) => mm2 * 1e-6 * 8960 * 1.25;
/** Cable sections on sale (mm²) and what each takes continuously in a short, ventilated run (a conservative rule of thumb). */
export const SECCIONES_CABLE: [number, number][] = [[16, 80], [25, 110], [35, 140], [50, 175], [70, 220], [95, 270]];
