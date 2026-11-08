// ============================================================================
// AEROMÓVIL 1 · aranceles de importación desde China (2026-11-08, Eugenio)
// ============================================================================
// Eugenio: «añade una sección que sea de aranceles de importación de China a
// España con todos los componentes que habrá que importar, menos el chasis y
// el carenado, y el coste aproximado en China; si es solo IVA, ponlo aparte;
// si hay un arancel especial para determinados componentes, ponlo; y
// compáralo con importar el vehículo completo desde China ya fabricado».
//
// What is sourced and what is estimated (the page says the same to the reader):
// - Duty rates (erga omnes, Combined Nomenclature 2026): read code by code on
//   third-party mirrors of TARIC (celna24.pl, zolltarifnummern.de,
//   tariffnumber.com) on 2026-11-08, because the official TARIC site refuses
//   automated reads. Lines marked `confirmar` were not read for that exact
//   code, or the classification itself is doubtful.
// - Trade-defence duties (anti-dumping, countervailing): from the regulations
//   and the Commission's own notices (links in FUENTES).
// - Prices in China, freight and assembly: ESTIMATES with no quotation behind
//   them. Each piece says what its price is based on.
// Everything is per vehicle and follows the current design (battery kWh,
// solar and window areas, seats), like the component catalogue.
import { COMPONENTES } from './componentes';
import type { Modelo, Parametros, Resultados } from './geometria';

/** One line of the customs declaration: what is declared under one CN code. */
export interface Partida {
  /** CN code, 8 digits with spaces (or 6 when the exact subheading is not known). */
  codigo: string;
  /** What is declared under it, in plain words. */
  que: string;
  /** Share of the piece's price in China declared under this code (the shares of a piece add up to 1). */
  parte: number;
  /** Conventional third-country duty, as a fraction (0.027 = 2.7 %). */
  arancel: number;
  /** Trade-defence duty that also applies, if any (id in ESPECIALES). */
  especial?: IdEspecial;
  /** Why this line should be confirmed with a binding ruling before importing. */
  confirmar?: string;
}

export interface PiezaChina {
  /** Component id in `componentes.ts`. */
  id: string;
  /** Estimated price in China, FOB (loaded on the ship), for one vehicle, in euros. */
  china: (P: Parametros, res: Resultados, m: Modelo) => number;
  /** What that price is based on. */
  base: string;
  partidas: Partida[];
}

export type IdEspecial = 'neumaticos' | 'llantasAluminio';

export interface DerechoEspecial {
  id: IdEspecial | 'tornilleria' | 'llantasAcero' | 'cocheElectrico';
  nombre: string;
  /** Rate used in the calculation (the one for an unnamed Chinese maker), as a fraction; null if not computed. */
  tipo: number | null;
  /** All the rates of the measure, as published. */
  tipos: string;
  norma: string;
  url: string;
  /** What it means for the Aeromóvil and how to avoid it. */
  nota: string;
}

/** Spanish general VAT rate, also charged on imports. */
export const IVA = 0.21;
/** Conventional duty on a new car with only an electric motor (CN 8703 80 10). */
export const ARANCEL_COCHE = 0.10;
/** Countervailing duty on Chinese BEVs for «all other companies» (Implementing Regulation (EU) 2024/2754). */
export const COMPENSATORIO_RESTO = 0.353;
/** Same, for the cooperating companies listed in its annex. */
export const COMPENSATORIO_COOPERANTES = 0.207;

/** Freight and costs for one vehicle's worth of parts (ESTIMATES, see SUPUESTOS). */
export const FLETE_PIEZAS = 1000;
export const GASTOS_DESTINO_PIEZAS = 350;
/** Same for one complete vehicle. */
export const FLETE_COCHE = 1400;
export const GASTOS_DESTINO_COCHE = 450;
/** Cargo insurance, as a fraction of the goods' value. */
export const SEGURO = 0.005;
/** What a Chinese factory would charge for chassis and body, relative to the catalogue (made in Spain). */
export const FACTOR_CHINA_ESTRUCTURA = 0.5;
/** Assembly, testing and the Chinese maker's margin for one complete vehicle. */
export const MONTAJE_CHINA = 1500;

export const ESPECIALES: DerechoEspecial[] = [
  {
    id: 'neumaticos', nombre: 'Antidumping sobre neumáticos de turismo chinos', tipo: 0.453,
    tipos: '4,3 % (grupo Hankook) · 24,4 % (otras empresas que colaboraron, en la lista del reglamento) · 45,3 % (el resto)',
    norma: 'Reglamento de Ejecución (UE) 2026/1540, definitivo desde el 8 de julio de 2026 (neumáticos 4011 10 00 y 4011 20 10 con índice de carga de 121 o menos)',
    url: 'https://eur-lex.europa.eu/eli/reg/2026/1540/oj',
    nota: 'Los del Aeromóvil (125/80 R13 y 145/80 R13) entran de lleno. El cálculo usa el 45,3 %, el de un fabricante que no está en la lista. El derecho va por dónde se fabricó el neumático, no por dónde se compra: unos neumáticos hechos fuera de China no lo pagan.',
  },
  {
    id: 'llantasAluminio', nombre: 'Antidumping sobre llantas de aluminio chinas', tipo: 0.223,
    tipos: '22,3 % para todos los fabricantes',
    norma: 'Reglamento de Ejecución (UE) 2023/112: prorrogado en enero de 2023 (llantas de aluminio de vehículos de las partidas 8701 a 8705)',
    url: 'https://policy.trade.ec.europa.eu/news/eu-maintains-duties-aluminium-road-wheels-china-2023-01-19_en',
    nota: 'Las llantas de 13″ del Aeromóvil son de aluminio: lo pagan, con o sin el neumático montado.',
  },
  {
    id: 'tornilleria', nombre: 'Antidumping sobre tornillería de hierro o acero china', tipo: null,
    tipos: 'del 22,1 % al 86,5 % según el fabricante; 86,5 % el resto',
    norma: 'Reglamento de Ejecución (UE) 2022/191, en vigor desde el 18 de febrero de 2022',
    url: 'https://fastenerandfixing.com/industry-news/eu-confirms-anti-dumping-duties',
    nota: 'No está en la tabla porque la tornillería que viene montada dentro de una pieza (una pinza de freno, una columna) se declara con la pieza. Pero tornillos, pernos y tuercas de acero comprados sueltos en China pagan hasta el 86,5 %: mejor comprarlos aquí.',
  },
  {
    id: 'llantasAcero', nombre: 'Antidumping sobre llantas de acero chinas', tipo: null,
    tipos: 'tipo por confirmar',
    norma: 'Renovado tras la reconsideración por expiración (noticia del 27 de febrero de 2026)',
    url: 'https://antidumping.vn/eu-imposes-definitive-anti-dumping-duty-on-chinese-steel-road-wheels-following-expiry-review-n29909.html',
    nota: 'Solo importa si se cambian las llantas de aluminio por unas de acero hechas en China.',
  },
  {
    id: 'cocheElectrico', nombre: 'Derecho compensatorio sobre coches eléctricos chinos', tipo: null,
    tipos: '7,8 % (Tesla Shanghái) · 17,0 % (BYD) · 18,8 % (Geely) · 20,7 % (otras empresas que colaboraron) · 35,3 % (SAIC y el resto)',
    norma: 'Reglamento de Ejecución (UE) 2024/2754, desde el 30 de octubre de 2024 y por cinco años, encima del 10 % de arancel',
    url: 'https://trade.ec.europa.eu/access-to-markets/en/news/eu-commission-imposes-countervailing-duties-imports-battery-electric-vehicles-bevs-china',
    nota: 'Solo para el coche entero, nunca para piezas. Y deja fuera los vehículos de categoría L: un Aeromóvil homologado como cuadriciclo pesado (L7e) no lo paga; como turismo (M1), sí. Desde 2026 un fabricante puede librarse si la Comisión le acepta un precio mínimo (la primera, el 10 de febrero de 2026, fue la del Cupra Tavascan).',
  },
];

const cat = (id: string, P: Parametros, res: Resultados, m: Modelo) => COMPONENTES.find(c => c.id === id)?.costeEur(P, res, m) ?? 0;

export const PIEZAS_CHINA: PiezaChina[] = [
  {
    id: 'motor', china: () => 900,
    base: 'Motor síncrono de 15 kW nominales y 32 de pico, refrigerado por líquido, de un fabricante chino. Como referencia, el industrial chino de aire del catálogo cuesta 850 € puesto aquí.',
    partidas: [{ codigo: '8501 52 30', que: 'motor de corriente alterna polifásico, de 7,5 a 37 kW', parte: 1, arancel: 0.027 }],
  },
  {
    id: 'inversor', china: () => 500,
    base: 'Controlador de 96 V y 400 A (los Fardriver y Votol del catálogo, 480 €).',
    partidas: [{ codigo: '8504 40', que: 'convertidor estático (inversor)', parte: 1, arancel: 0, confirmar: 'si aduanas lo considera un cuadro de mando (8537 10), paga hasta el 2,1 %' }],
  },
  {
    id: 'transmision', china: () => 750,
    base: 'Reductora con diferencial de vehículo ligero eléctrico chino y dos palieres (600–900 € según el catálogo).',
    partidas: [{ codigo: '8708 40 50', que: 'caja de cambios de vehículo (reductora con diferencial)', parte: 1, arancel: 0.045, confirmar: 'como eje motor con diferencial (8708 50 35) también es el 4,5 %; con autorización de montaje industrial, el 3 %' }],
  },
  {
    id: 'cargador', china: () => 380,
    base: 'Cargador de 3,3 kW con su convertidor a 12 V, de fabricante chino.',
    partidas: [
      { codigo: '8504 40 60', que: 'cargador de acumuladores', parte: 0.75, arancel: 0 },
      { codigo: '8504 40', que: 'convertidor de continua a 12 V', parte: 0.25, arancel: 0 },
    ],
  },
  {
    id: 'bateria', china: P => P.kWh * 190,
    base: 'Paquete de 96 V con gestor (BMS), contactores y caja, de un integrador chino: unos 190 € por kWh en un pedido de una unidad. En gran serie la media china fue de 84 $/kWh en 2025 (BNEF), unos 75 €. China quitó en abril de 2026 parte de la devolución del IVA a la exportación de baterías (del 9 al 6 %) y la quita del todo el 1 de enero de 2027: el precio chino puede subir algo.',
    partidas: [{ codigo: '8507 60 00', que: 'acumuladores de iones de litio', parte: 1, arancel: 0.027, confirmar: 'algunas subpartidas TARIC tienen una suspensión al 1,3 % o al 0 % para un uso final concreto, con autorización' }],
  },
  {
    id: 'solar', china: (_P, res) => Math.round(res.areas.solar * 150 + 60),
    base: 'Laminado flexible a medida a unos 150 €/m², más el regulador MPPT. China dejó de devolver el IVA a la exportación de productos fotovoltaicos el 1 de abril de 2026.',
    partidas: [
      { codigo: '8541 43 00', que: 'células fotovoltaicas montadas en módulos', parte: 0.9, arancel: 0 },
      { codigo: '8504 40 84', que: 'convertidor con seguimiento del punto de máxima potencia (MPPT)', parte: 0.1, arancel: 0 },
    ],
  },
  {
    id: 'cableado', china: () => 320,
    base: 'Caja de distribución de alta tensión de vehículo ligero chino, con cables y toma (el «kit de LSEV» del catálogo, 320 €).',
    partidas: [
      { codigo: '8544 42 90', que: 'cables con conectores, hasta 1.000 V', parte: 0.4, arancel: 0.033 },
      { codigo: '8544 49 95', que: 'cable sin conectores, de 80 a 1.000 V', parte: 0.2, arancel: 0.037 },
      { codigo: '8536 49 00', que: 'contactores (relés de más de 60 V)', parte: 0.25, arancel: 0.023 },
      { codigo: '8536 10 90', que: 'fusible de más de 63 A', parte: 0.05, arancel: 0.023 },
      { codigo: '8536 69 90', que: 'toma de carga tipo 2 (conector)', parte: 0.1, arancel: 0.023 },
    ],
  },
  {
    id: 'ruedas', china: () => 4 * (45 + 28),
    base: 'Cuatro llantas de aluminio de 13″ a unos 45 € y cuatro neumáticos a unos 28 €.',
    partidas: [
      { codigo: '8708 70 50', que: 'llantas de aluminio', parte: 45 / 73, arancel: 0.045, especial: 'llantasAluminio' },
      { codigo: '4011 10 00', que: 'neumáticos nuevos de turismo', parte: 28 / 73, arancel: 0.045, especial: 'neumaticos' },
    ],
  },
  {
    id: 'frenos', china: () => 380,
    base: 'Cuatro discos con sus pinzas y pastillas, la bomba y el servo eléctrico.',
    partidas: [
      { codigo: '8708 30 91', que: 'frenos de disco y sus partes', parte: 0.85, arancel: 0.045 },
      { codigo: '8708 30 99', que: 'bomba y servo de freno', parte: 0.15, arancel: 0.045 },
    ],
  },
  {
    id: 'suspension', china: () => 520,
    base: 'Cuatro columnas con muelle, rótulas, manguetas y las dos estabilizadoras.',
    partidas: [
      { codigo: '8708 80 35', que: 'amortiguadores (columnas)', parte: 0.55, arancel: 0.045 },
      { codigo: '8708 80 99', que: 'manguetas, rótulas y brazos', parte: 0.3, arancel: 0.035 },
      { codigo: '8708 80 55', que: 'barras estabilizadoras', parte: 0.15, arancel: 0.035 },
    ],
  },
  {
    id: 'direccion', china: () => 240,
    base: 'Cremallera manual, columna con cardán y volante.',
    partidas: [{ codigo: '8708 94 35', que: 'volante, columna y caja de dirección', parte: 1, arancel: 0.045 }],
  },
  {
    id: 'cupula', china: (_P, res) => Math.round(res.areas.cristal * 35 + 700),
    base: 'Policarbonato de 4 mm termoformado en China: unos 35 €/m² más 700 € de molde y formado.',
    partidas: [{ codigo: '8708 29 90', que: 'partes de carrocería (parabrisas y ventanillas de plástico)', parte: 1, arancel: 0.045, confirmar: 'sin marco ni resistencia, aduanas podría llevarlo a manufacturas de plástico (3926), con otro tipo' }],
  },
  {
    id: 'puertas', china: () => 160,
    base: 'Bisagras, resortes de gas, cierres y juntas de las dos puertas.',
    partidas: [
      { codigo: '8302 10 00', que: 'bisagras y herrajes', parte: 0.6, arancel: 0.027 },
      { codigo: '8301 20 00', que: 'cerraduras para vehículos', parte: 0.4, arancel: 0.027, confirmar: 'tipo no leído para este código' },
    ],
  },
  {
    id: 'maleteros', china: () => 60,
    base: 'Solo los herrajes: las tapas son carrocería y se hacen aquí.',
    partidas: [{ codigo: '8302 10 00', que: 'bisagras, resortes y cierres', parte: 1, arancel: 0.027 }],
  },
  {
    id: 'luces', china: () => 160,
    base: 'Faros y pilotos LED con marca de homologación europea (E), y los dos retrovisores.',
    partidas: [
      { codigo: '8512 20 00', que: 'aparatos de alumbrado y señalización', parte: 0.75, arancel: 0.027 },
      { codigo: '7009 10 00', que: 'retrovisores', parte: 0.25, arancel: 0.04, confirmar: 'tipo no leído para este código' },
    ],
  },
  {
    id: 'asientos', china: P => P.plazas * 220,
    base: 'Baquet de composite con reposacabezas, unos 220 € cada uno.',
    partidas: [{ codigo: '9401 20 00', que: 'asientos de vehículos', parte: 1, arancel: 0.037 }],
  },
  {
    id: 'varios', china: () => 300,
    base: 'Pantalla de 7″ con CAN, cinturones, cableado de 12 V, bomba, ventilador y extintor.',
    partidas: [
      { codigo: '9029 20 31', que: 'indicador de velocidad (pantalla del salpicadero)', parte: 0.3, arancel: 0.026, confirmar: 'tipo no leído para este código; y si se declara como monitor (8528) puede pagar hasta el 14 %: pedir la clasificación por escrito' },
      { codigo: '8708 21 90', que: 'cinturones de seguridad', parte: 0.25, arancel: 0.045 },
      { codigo: '8544 30 00', que: 'juegos de cables para vehículos', parte: 0.2, arancel: 0.037 },
      { codigo: '8413 / 8414 / 8424', que: 'bomba, ventilador y extintor', parte: 0.25, arancel: 0.02, confirmar: 'entre el 1,7 y el 2,3 % según el aparato; no leído código a código' },
    ],
  },
];

/** What stays out of the import: it is made in Spain. */
export const NO_SE_IMPORTA = ['chasis', 'carroceria'];

export interface FilaPartida extends Partida { valor: number; aduana: number; derecho: number; antidumping: number }
export interface FilaPieza { pieza: PiezaChina; nombre: string; europa: number; china: number; partidas: FilaPartida[]; aduana: number; derecho: number; antidumping: number; soloIva: boolean }

export interface Escenario {
  /** FOB value in China. */
  fob: number;
  flete: number; seguro: number;
  /** Customs value: FOB + freight + insurance up to the EU border (CIF). */
  aduana: number;
  arancel: number; antidumping: number; compensatorio: number;
  derechos: number;
  gastosDestino: number;
  /** Import VAT base: customs value + duties + costs up to the first destination. */
  baseIva: number;
  iva: number;
}

function escenario(fob: number, flete: number, gastosDestino: number, arancel: number, antidumping: number, compensatorio: number): Escenario {
  const seguro = fob * SEGURO, aduana = fob + flete + seguro, derechos = arancel + antidumping + compensatorio, baseIva = aduana + derechos + gastosDestino;
  return { fob, flete, seguro, aduana, arancel, antidumping, compensatorio, derechos, gastosDestino, baseIva, iva: baseIva * IVA };
}

/** The whole page's numbers for the current design. */
export function calcularAranceles(P: Parametros, res: Resultados, m: Modelo) {
  const base = PIEZAS_CHINA.map(p => ({ p, china: p.china(P, res, m) }));
  const fob = base.reduce((s, b) => s + b.china, 0);
  // Freight and insurance are shared out by value: each piece's customs value is its FOB price plus its share.
  const factor = (fob + FLETE_PIEZAS + fob * SEGURO) / fob;
  const filas: FilaPieza[] = base.map(({ p, china }) => {
    const partidas = p.partidas.map(pt => {
      const valor = china * pt.parte, aduana = valor * factor;
      const esp = pt.especial ? ESPECIALES.find(e => e.id === pt.especial)?.tipo ?? 0 : 0;
      return { ...pt, valor, aduana, derecho: aduana * pt.arancel, antidumping: aduana * esp };
    });
    const c = COMPONENTES.find(k => k.id === p.id);
    return {
      pieza: p, nombre: c?.nombre ?? p.id, europa: c ? c.costeEur(P, res, m) : 0, china, partidas,
      aduana: partidas.reduce((s, x) => s + x.aduana, 0), derecho: partidas.reduce((s, x) => s + x.derecho, 0), antidumping: partidas.reduce((s, x) => s + x.antidumping, 0),
      soloIva: partidas.every(x => x.arancel === 0 && !x.especial),
    };
  });
  const arancel = filas.reduce((s, f) => s + f.derecho, 0), antidumping = filas.reduce((s, f) => s + f.antidumping, 0);
  const piezas = escenario(fob, FLETE_PIEZAS, GASTOS_DESTINO_PIEZAS, arancel, antidumping, 0);

  // Made in Spain in the parts route; made in China (cheaper) in the complete-vehicle route.
  const estructuraEspana = NO_SE_IMPORTA.reduce((s, id) => s + cat(id, P, res, m), 0);
  const fobCoche = fob + estructuraEspana * FACTOR_CHINA_ESTRUCTURA + MONTAJE_CHINA;
  const aduanaCoche = fobCoche + FLETE_COCHE + fobCoche * SEGURO;
  const l7e = escenario(fobCoche, FLETE_COCHE, GASTOS_DESTINO_COCHE, aduanaCoche * ARANCEL_COCHE, 0, 0);
  const m1 = escenario(fobCoche, FLETE_COCHE, GASTOS_DESTINO_COCHE, aduanaCoche * ARANCEL_COCHE, 0, aduanaCoche * COMPENSATORIO_RESTO);
  const europa = filas.reduce((s, f) => s + f.europa, 0);
  return { filas, piezas, l7e, m1, estructuraEspana, fobCoche, europa };
}

export const FUENTES: { nombre: string; url: string; que: string }[] = [
  { nombre: 'Comisión Europea, Access2Markets: derechos compensatorios sobre coches eléctricos chinos', url: 'https://trade.ec.europa.eu/access-to-markets/en/news/eu-commission-imposes-countervailing-duties-imports-battery-electric-vehicles-bevs-china', que: 'Tipos por fabricante, código 8703 80 10 y exclusión de la categoría L' },
  { nombre: 'Comisión Europea: primer compromiso de precios aceptado (10 de febrero de 2026)', url: 'https://policy.trade.ec.europa.eu/news/commission-accepts-price-undertaking-chinese-electric-car-producer-2026-02-10_en', que: 'Cupra Tavascan, exento del derecho compensatorio si respeta un precio mínimo' },
  { nombre: 'Reglamento de Ejecución (UE) 2026/1540: neumáticos chinos', url: 'https://eur-lex.europa.eu/eli/reg/2026/1540/oj', que: 'Antidumping definitivo del 4,3 al 45,3 %' },
  { nombre: 'Comisión Europea: se mantienen los derechos sobre llantas de aluminio chinas (enero de 2023)', url: 'https://policy.trade.ec.europa.eu/news/eu-maintains-duties-aluminium-road-wheels-china-2023-01-19_en', que: 'Antidumping del 22,3 %' },
  { nombre: 'Fastener + Fixing: antidumping definitivo sobre tornillería china (febrero de 2022)', url: 'https://fastenerandfixing.com/industry-news/eu-confirms-anti-dumping-duties', que: 'Del 22,1 al 86,5 %' },
  { nombre: 'Celna24: arancel de la UE 2026, partida 8708 (piezas de vehículos)', url: 'https://celna24.pl/en/customs-tariff/8708', que: 'Frenos, cajas de cambio, ruedas, suspensión, dirección, carrocería, cinturones' },
  { nombre: 'Celna24: arancel de la UE 2026, partida 8703 (coches)', url: 'https://celna24.pl/en/customs-tariff/8703', que: '10 % para 8703 80 10' },
  { nombre: 'Celna24: arancel de la UE 2026, partida 8501 (motores)', url: 'https://celna24.pl/customs-tariff/8501', que: '2,7 %' },
  { nombre: 'Celna24: arancel de la UE 2026, partida 8504 (convertidores y cargadores)', url: 'https://celna24.pl/customs-tariff/8504', que: '0 % en todas las subpartidas de 8504 40' },
  { nombre: 'Celna24: arancel de la UE 2026, partida 8536 (contactores, fusibles, conectores)', url: 'https://celna24.pl/en/customs-tariff/8536', que: '2,3 %' },
  { nombre: 'Celna24: arancel de la UE 2026, partida 8544 (cables)', url: 'https://celna24.pl/customs-tariff/8544', que: '3,3 y 3,7 %' },
  { nombre: 'Zolltarifnummern: 8507 60 00 (baterías de litio)', url: 'https://www.zolltarifnummern.de/2026/85076000', que: '2,7 %, con suspensiones al 1,3 % y al 0 % para usos concretos' },
  { nombre: 'Tariffnumber: 9401 20 00 (asientos de vehículos)', url: 'https://www.tariffnumber.com/2026/94012000', que: '3,7 %' },
  { nombre: 'Comisión Europea, Access2Markets: IVA a la importación', url: 'https://trade.ec.europa.eu/access-to-markets/es/content/impuesto-sobre-el-valor-anadido-0', que: 'Base: valor en aduana + derechos + gastos hasta el lugar de destino' },
  { nombre: 'BloombergNEF: precio de los paquetes de baterías (diciembre de 2025)', url: 'https://about.bnef.com/insights/clean-energy/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour/', que: '84 $/kWh de media en China' },
  { nombre: 'Gobierno de Henan: China recorta la devolución del IVA a la exportación de baterías y placas', url: 'https://english.henan.gov.cn/2026/01-10/3308135.html', que: 'Baterías del 9 al 6 % en abril de 2026 y a cero en enero de 2027; fotovoltaica, a cero en abril de 2026' },
  { nombre: 'gCaptain: índice Drewry de fletes (noviembre de 2025)', url: 'https://gcaptain.com/carriers-push-december-fak-increases-as-asia-europe-demand-holds', que: 'Shanghái–Génova a 2.319 $ el contenedor de 40 pies: referencia del flete' },
];

export const SUPUESTOS: string[] = [
  `Flete de las piezas: ${FLETE_PIEZAS.toLocaleString('es-ES')} € por un vehículo (unos 3 m³ y 330 kg en grupaje marítimo Shanghái–Valencia, con la batería como mercancía peligrosa de clase 9, que lleva recargo y su certificado UN 38.3). Un contenedor entero de 40 pies Shanghái–Génova estaba en 2.319 $ en noviembre de 2025 (índice Drewry).`,
  `Gastos en destino: ${GASTOS_DESTINO_PIEZAS} € las piezas y ${GASTOS_DESTINO_COCHE} € el coche (agente de aduanas y declaración, descarga y transporte hasta el taller). Entran en la base del IVA, no en la del arancel.`,
  `Seguro de la mercancía: ${(SEGURO * 100).toLocaleString('es-ES')} % de su valor.`,
  `Coche completo hecho en China: las mismas piezas al precio chino, más el chasis y la carrocería a la mitad de lo que cuestan aquí, más ${MONTAJE_CHINA.toLocaleString('es-ES')} € de montaje, pruebas y margen del fabricante, y ${FLETE_COCHE.toLocaleString('es-ES')} € de flete en caja, también como mercancía peligrosa.`,
  'Los precios en China son estimaciones sin presupuesto, por vehículo y en una sola unidad. En una serie bajan los moldes, el flete por unidad y la batería, pero los porcentajes de los derechos son los mismos.',
];
