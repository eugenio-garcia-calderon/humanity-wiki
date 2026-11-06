// ============================================================================
// AEROMÓVIL 1 · catálogo de componentes (2026-11-06, Eugenio)
// ============================================================================
// Eugenio: «haz que sea profesional, con cada componente del vehículo con un
// botón que te lleve a esa página de componente y puedas ver las
// características, coste, peso, proveedor, y alternativas para reducir peso o
// coste, sin perder funcionalidad».
//
// Cada componente es una ficha: qué es, características, peso (sale del modelo
// paramétrico, así cambia con los deslizadores), coste estimado, proveedores y
// alternativas. Elegir una alternativa cambia los parámetros del diseño
// (`aplicar`) y queda apuntada en `P.variantes`, así que el peso y el coste
// del vehículo entero se recalculan con ella.
//
// Los precios son estimaciones de noviembre de 2026 para una unidad o un
// prototipo, en euros sin IVA, a partir de catálogos públicos (los enlaces de
// cada proveedor). Antes de comprar: pedir presupuesto.
import type { CapaId } from './Visor3D';
import { PARAMETROS_A1, MASAS_FIJAS_A1, largoTubo, masaFija, type Modelo, type Parametros, type PiezaManual, type Resultados } from './geometria';

export type GrupoComponente = 'Propulsión' | 'Energía' | 'Rodaje' | 'Suspensión y dirección' | 'Estructura y carrocería' | 'Habitáculo y equipo';

export interface Proveedor { nombre: string; url?: string; nota?: string }
export interface Alternativa {
  id: string;
  nombre: string;
  /** Qué mejora respecto a la de serie. */
  ahorra: 'peso' | 'coste' | 'peso y coste';
  descripcion: string;
  /** Masa (kg) y coste (€) por unidad de esta alternativa. */
  masaKg: number;
  costeEur: number;
  proveedor?: Proveedor;
  /** Parámetros del diseño que cambian al elegirla. */
  aplicar: Partial<Parametros>;
}
export interface Componente {
  id: string;
  nombre: string;
  /** Para el botón de la barra lateral. */
  corto: string;
  grupo: GrupoComponente;
  capa: CapaId;
  /** Qué hace y por qué está. */
  que: string;
  /** Características de la pieza de serie: [nombre, valor]. */
  caracteristicas: [string, string][];
  /** Cuántas lleva el vehículo. */
  unidades: number | ((P: Parametros) => number);
  /** Masa total (kg) de todas las unidades, calculada del diseño. */
  masaKg: (P: Parametros, res: Resultados, m: Modelo) => number;
  /** Coste total (€) de todas las unidades, de serie. */
  costeEur: (P: Parametros, res: Resultados, m: Modelo) => number;
  /** El parámetro del diseño que fija su masa, si lo hay (es el deslizador de «Peso del vehículo»). */
  parametroMasa?: keyof Parametros;
  /** Cómo se llama ese deslizador en la barra lateral. */
  deslizador?: string;
  proveedores: Proveedor[];
  alternativas: Alternativa[];
}

/** Metros de tubo del chasis (sin lo comprado), para el coste del material. */
const metrosTubo = (m: Modelo) => m.tubosChasis().filter(t => !t.comprado).reduce((s, t) => s + largoTubo(t), 0);
const EUR_M_TUBO: Record<Parametros['matChasis'], number> = { al6061: 9, cromoly: 16, carbono: 62 };
const EUR_M2_CARENADO: Record<Parametros['matCarenado'], number> = { carbono: 230, carbonoLino: 190, vidrio: 70 };
const MOLDE_CARENADO: Record<Parametros['matCarenado'], number> = { carbono: 3500, carbonoLino: 3500, vidrio: 2200 };

export const COMPONENTES: Componente[] = [
  // ── Propulsión ────────────────────────────────────────────────────────────
  {
    id: 'motor', corto: 'Motor', nombre: 'Motor eléctrico', grupo: 'Propulsión', capa: 'motor',
    que: 'Un motor síncrono de imanes permanentes, transversal, detrás del eje trasero. Mueve las ruedas traseras a través de la reductora. Es lo que fija la velocidad sostenida (potencia nominal) y la aceleración (potencia de pico).',
    caracteristicas: [['Tipo', 'PMSM trifásico, refrigerado por líquido'], ['Potencia nominal', '15 kW'], ['Potencia de pico', '32 kW (30 s)'], ['Tensión', '96–120 V'], ['Régimen', 'hasta 6.000 rpm'], ['Par de pico', '≈ 110 N·m'], ['Masa', '16 kg']],
    unidades: 1, masaKg: P => P.mMotor, costeEur: () => 1700, parametroMasa: 'mMotor', deslizador: 'Motor',
    proveedores: [
      { nombre: 'Motenergy ME1616 (Electric Motorsport, EE. UU.)', url: 'https://www.electricmotorsport.com/ev-parts/motors/brushless-pmac-ipm-motors/me1616-brushless-65hp-liquid-cooled-ipm-motor-24-120v.html', nota: '20 kW nominales / 55 kW de pico, 48–120 V, líquido, 21,8 kg: va sobrado' },
      { nombre: 'Golden Motor HPM-20KW (China)', url: 'https://www.goldenmotor.com/', nota: '20 kW nominales, 96 V, refrigerado por líquido, 24 kg' },
      { nombre: 'Motenergy ME1507 / ME1905 (10 kW nominales)', url: 'https://electricmotorsport.com/motors/me1905-me1507-pmac-motor.html', nota: 'Se queda corto para 140 km/h sostenidos: solo si se baja la velocidad objetivo' },
    ],
    alternativas: [
      { id: 'axial', nombre: 'Motor de flujo axial (clase EMRAX 188)', ahorra: 'peso', descripcion: '27 kW nominales y 52 kW de pico en 7,3 kg: la mitad de masa y el doble de potencia. Lo caro es el precio.', masaKg: 8, costeEur: 4200, proveedor: { nombre: 'EMRAX (Eslovenia)', url: 'https://emrax.com/' }, aplicar: { mMotor: 8 } },
      { id: 'chino', nombre: 'PMSM industrial de 15/30 kW (China)', ahorra: 'coste', descripcion: 'Misma potencia con carcasa de hierro y refrigeración por aire forzado: 28 kg, pero la mitad de precio. Cuesta 12 kg de masa.', masaKg: 28, costeEur: 850, proveedor: { nombre: 'Unite Motor / QS Motor (Alibaba)', url: 'https://www.alibaba.com/' }, aplicar: { mMotor: 28 } },
    ],
  },
  {
    id: 'inversor', corto: 'Inversor', nombre: 'Inversor (controlador del motor)', grupo: 'Propulsión', capa: 'motor',
    que: 'Convierte la corriente continua de la batería en trifásica para el motor y regula el par con el acelerador. Hace también el freno regenerativo. Va sobre el motor, en la cola.',
    caracteristicas: [['Tensión', '96–120 V'], ['Corriente de pico', '400 A (≈ 32 kW)'], ['Corriente continua', '200 A'], ['Comunicación', 'CAN, programable'], ['Refrigeración', 'líquido, mismo circuito que el motor'], ['Masa', '6 kg']],
    unidades: 1, masaKg: P => P.mInversor, costeEur: () => 1500, parametroMasa: 'mInversor', deslizador: 'Inversor',
    proveedores: [
      { nombre: 'Sevcon / BorgWarner Gen4 tamaño 6', url: 'https://www.borgwarner.com/', nota: 'El estándar en vehículos ligeros; necesita licencia de programación' },
      { nombre: 'Curtis 1239E', url: 'https://www.curtisinstruments.com/', nota: '96 V, 500 A de pico' },
    ],
    alternativas: [
      { id: 'fardriver', nombre: 'Fardriver ND96850 / Votol EM-300', ahorra: 'peso y coste', descripcion: 'Controladores de moto eléctrica de 96 V y 350–400 A de fase, 4 kg, programables por Bluetooth. Menos documentación y sin CAN de automoción.', masaKg: 4, costeEur: 480, proveedor: { nombre: 'Fardriver (China)', url: 'https://www.fardriver.com/' }, aplicar: { mInversor: 4 } },
    ],
  },
  {
    id: 'transmision', corto: 'Reductora', nombre: 'Reductora con diferencial y palieres', grupo: 'Propulsión', capa: 'transmision',
    que: 'Un escalón de engranajes (≈ 8:1) con diferencial, en carcasa de aluminio, pegado al motor; dos palieres homocinéticos llevan el giro a las ruedas traseras. No hay cambio de marchas ni embrague.',
    caracteristicas: [['Relación', '≈ 8:1, un escalón helicoidal'], ['Diferencial', 'abierto'], ['Palieres', '2, con juntas homocinéticas'], ['Lubricación', 'baño de aceite, 0,5 L'], ['Masa', '11 kg + 4 kg de palieres']],
    unidades: 1, masaKg: P => P.mReductora + 4, costeEur: () => 1800, parametroMasa: 'mReductora', deslizador: 'Reductora con diferencial',
    proveedores: [
      { nombre: 'Transeje de vehículo ligero (fabricantes de LSEV, China)', url: 'https://www.alibaba.com/', nota: 'Reductoras con diferencial para 10–30 kW, 600–900 €; pedir la relación que toca' },
      { nombre: 'Mecanizado a medida (taller local)', nota: 'Carcasa fresada y engranajes de catálogo: lo que más cuesta es el diseño' },
    ],
    alternativas: [
      { id: 'twizy', nombre: 'Transeje del Twizy, de desguace', ahorra: 'coste', descripcion: 'La reductora con diferencial del Twizy (9,23:1) y sus palieres, de segunda mano. Pesa 5 kg más y hay que adaptar la brida al motor.', masaKg: 20, costeEur: 420, proveedor: { nombre: 'Desguaces y eBay (Renault Twizy MAM)', url: 'https://www.ebay.es/' }, aplicar: { mReductora: 16 } },
      { id: 'cadena', nombre: 'Correa dentada + diferencial compacto', ahorra: 'peso y coste', descripcion: 'Una correa dentada del motor a un diferencial de kart-cross con palieres: 7 kg y piezas de catálogo. Algo más de ruido y hay que tensar la correa.', masaKg: 11, costeEur: 950, proveedor: { nombre: 'Gates (correas) + kart-cross', url: 'https://www.gates.com/' }, aplicar: { mReductora: 7 } },
    ],
  },
  {
    id: 'cargador', corto: 'Cargador', nombre: 'Cargador a bordo y convertidor 12 V', grupo: 'Propulsión', capa: 'motor',
    que: 'El cargador carga la batería desde un enchufe normal (3,3 kW, tipo 2 o schuko). El convertidor DC-DC alimenta a 12 V luces, pantalla y bombas desde la batería grande. Van en la cola, al lado de la toma de carga.',
    caracteristicas: [['Cargador', '3,3 kW, 230 V monofásico, tipo 2'], ['Carga 0–100 %', '≈ 9 h a 3,3 kW'], ['Convertidor', '12 V · 500 W'], ['Masa', '6 kg']],
    unidades: 1, masaKg: P => masaFija(P, 'cargador'), costeEur: () => 650,
    proveedores: [
      { nombre: 'TC Charger / Elcon', url: 'https://www.tccharger.com/', nota: 'Cargadores de 1,8–6,6 kW con CAN' },
      { nombre: 'Delta-Q', url: 'https://delta-q.com/', nota: 'Estancos, para exteriores' },
    ],
    alternativas: [
      { id: 'integrado', nombre: 'Cargador 3,3 kW con DC-DC integrado', ahorra: 'peso y coste', descripcion: 'Una caja en vez de dos: mismo tiempo de carga, 5 kg y menos cableado.', masaKg: 5, costeEur: 520, proveedor: { nombre: 'TC Charger (serie con DC-DC)', url: 'https://www.tccharger.com/' }, aplicar: {} },
    ],
  },
  // ── Energía ───────────────────────────────────────────────────────────────
  {
    id: 'bateria', corto: 'Batería', nombre: 'Batería de tracción', grupo: 'Energía', capa: 'baterias',
    que: 'El paquete de celdas de litio con su gestor (BMS), contactores y caja. Un módulo va bajo el asiento (es lo que sostiene al piloto) y el resto detrás, entre el arco principal y el eje trasero. Es la pieza más pesada y más cara del vehículo.',
    caracteristicas: [['Capacidad', '27 kWh (24,8 kWh usables)'], ['Química', 'NMC, celdas 21700'], ['Tensión', '96 V nominales (26s)'], ['Densidad del paquete', '165 Wh/kg · 200 Wh/L'], ['Autonomía a 100 km/h', '≈ 500 km'], ['Gestión', 'BMS con CAN, calefacción de celdas']],
    unidades: 1, masaKg: (_P, res) => res.masas['Batería'] ?? 0, costeEur: P => P.kWh * 300, parametroMasa: 'whKg', deslizador: 'Densidad del paquete (masa)',
    proveedores: [
      { nombre: 'Paquete a medida (integradores europeos)', nota: '≈ 300 €/kWh con BMS y caja en una unidad; baja a 200 €/kWh en serie corta' },
      { nombre: 'Módulos CATL / EVE / LG (distribuidores)', url: 'https://www.alibaba.com/', nota: 'Módulos de 2–5 kWh listos para apilar' },
      { nombre: 'Referencia: BloombergNEF 2025', url: 'https://www.energy-storage.news/li-ion-battery-pack-prices-fell-8-since-last-year-despite-metals-prices-rising-bloombergnef-says/', nota: 'Paquete medio de coche eléctrico a 99 $/kWh en gran serie: el precio del prototipo es 3 veces eso' },
    ],
    alternativas: [
      { id: 'lfp', nombre: 'Celdas LFP prismáticas', ahorra: 'coste', descripcion: 'Misma capacidad con litio-ferrofosfato: más barato, más seguro y de más ciclos, pero 125 Wh/kg: unos 50 kg más de batería.', masaKg: 216, costeEur: 27 * 180, proveedor: { nombre: 'CATL / EVE LF105', url: 'https://www.alibaba.com/' }, aplicar: { whKg: 125, whL: 180 } },
      { id: 'altaE', nombre: 'Celdas 21700 de alta energía', ahorra: 'peso', descripcion: 'Molicel P50B o Samsung 50S en paquete: 190 Wh/kg, unos 20 kg menos. Cuestan un tercio más.', masaKg: 142, costeEur: 27 * 400, proveedor: { nombre: 'Molicel (Taiwán) / Samsung SDI', url: 'https://www.molicel.com/' }, aplicar: { whKg: 190, whL: 230 } },
    ],
  },
  {
    id: 'solar', corto: 'Paneles solares', nombre: 'Paneles solares', grupo: 'Energía', capa: 'solar',
    que: 'Células de silicio laminadas en una película flexible que sigue la curva, sobre todo el techo de la cúpula (plano sobre la cabina y bajando hasta la cola, como el Aptera) y sobre el lomo a los lados. Cargan la batería al sol: unos kilómetros al día, y mantienen la batería sana si el vehículo se queda parado semanas.',
    caracteristicas: [['Células', 'monocristalinas de contacto posterior (SunPower Maxeon), 22 %'], ['Laminado', 'ETFE flexible, se pega a la cúpula'], ['Potencia', '≈ 200 W por m²'], ['Masa', '2,2 kg por m²'], ['Regulador', 'MPPT de 100 V a la batería de tracción']],
    unidades: 1, masaKg: (_P, res) => res.masas['Paneles solares'] ?? 0, costeEur: (_P, res) => res.areas.solar * 200 * 2 + 120, parametroMasa: 'mSolarM2', deslizador: 'Paneles solares por m²',
    proveedores: [
      { nombre: 'Solbian (Italia)', url: 'https://www.solbian.eu/', nota: 'Paneles flexibles a medida con células SunPower' },
      { nombre: 'Sunbeam Systems (Suecia)', url: 'https://sunbeamsystem.com/', nota: 'Paneles para barcos, muy resistentes al pisado' },
    ],
    alternativas: [
      { id: 'ultraligero', nombre: 'Laminado ultraligero (1,5 kg/m²)', ahorra: 'peso', descripcion: 'Sin capa trasera rígida: la mitad de masa por m², el doble de precio por vatio.', masaKg: 1.5, costeEur: 1.13 * 200 * 4 + 120, proveedor: { nombre: 'Solbian SP Flex', url: 'https://www.solbian.eu/' }, aplicar: { mSolarM2: 1.5 } },
      { id: 'pet', nombre: 'Laminado PET con células estándar', ahorra: 'coste', descripcion: 'Células PERC de 20 % en PET: 2,6 kg/m² y un 40 % más barato. Dura menos al sol (5–8 años).', masaKg: 2.6, costeEur: 1.13 * 190 * 1.2 + 120, proveedor: { nombre: 'Fabricantes genéricos (Alibaba)', url: 'https://www.alibaba.com/' }, aplicar: { mSolarM2: 2.6 } },
    ],
  },
  {
    id: 'cableado', corto: 'Cableado HV', nombre: 'Cableado de alta tensión y protecciones', grupo: 'Energía', capa: 'baterias',
    que: 'Los cables naranja de la batería al inversor, el cargador y el convertidor; contactores, fusible principal, resistencia de precarga, toma de carga y el circuito de interbloqueo que corta la tensión al abrir la caja. Sin esto el vehículo no es seguro ni legal.',
    caracteristicas: [['Cable', '35 mm² naranja, apantallado'], ['Contactores', '2 (positivo y negativo) + precarga'], ['Fusible', '250 A'], ['Toma de carga', 'tipo 2, con tapa en el costado izquierdo'], ['Masa', '5 kg']],
    unidades: 1, masaKg: P => masaFija(P, 'cableado'), costeEur: () => 600,
    proveedores: [
      { nombre: 'EV West / Electric Motorsport (kits)', url: 'https://www.electricmotorsport.com/' },
      { nombre: 'Amphenol / TE (conectores de alta tensión)', url: 'https://www.te.com/' },
    ],
    alternativas: [
      { id: 'kit', nombre: 'Kit de cableado de LSEV', ahorra: 'coste', descripcion: 'Contactores, precarga y cables ya montados en una caja de distribución de vehículo ligero chino. Igual de seguro si se revisa cada crimpado.', masaKg: 5, costeEur: 320, proveedor: { nombre: 'Alibaba (caja de distribución HV)', url: 'https://www.alibaba.com/' }, aplicar: {} },
    ],
  },
  // ── Rodaje ────────────────────────────────────────────────────────────────
  {
    id: 'ruedas', corto: 'Ruedas', nombre: 'Ruedas y neumáticos', grupo: 'Rodaje', capa: 'ruedas',
    que: 'Cuatro ruedas de 13 pulgadas de la clase del Twizy, con tapacubos planos por fuera como el SZEmission. Los neumáticos estrechos y de baja resistencia a la rodadura son los que marcan el consumo a baja velocidad.',
    caracteristicas: [['Delanteros', '125/80 R13 (Ø 530 mm)'], ['Traseros', '145/80 R13 (Ø 562 mm)'], ['Llantas', 'aluminio 4,5J × 13, 4 tornillos'], ['Índice de carga', '65 (290 kg por rueda)'], ['Presión', '2,4 bar'], ['Masa', '8 kg por rueda (llanta 5 + neumático 3)']],
    unidades: 4, masaKg: P => 4 * P.mRueda, costeEur: () => 4 * (90 + 75), parametroMasa: 'mRueda', deslizador: 'Una rueda con neumático',
    proveedores: [
      { nombre: 'Continental eContact 125/80 R13 y 145/80 R13 (los del Twizy)', url: 'https://www.continental-tires.com/', nota: '≈ 75 € cada uno' },
      { nombre: 'Llantas de aluminio 13″ (distribuidores de llantas)', nota: '≈ 90 € cada una' },
    ],
    alternativas: [
      { id: 'acero', nombre: 'Llantas de acero del Twizy', ahorra: 'coste', descripcion: 'Las de serie del Twizy, nuevas o de desguace: 45 € y 1,5 kg más por rueda.', masaKg: 9.5, costeEur: 4 * (45 + 75), proveedor: { nombre: 'Desguaces (Renault Twizy)', url: 'https://www.ebay.es/' }, aplicar: { mRueda: 9.5 } },
      { id: 'forjada', nombre: 'Llantas forjadas de aluminio', ahorra: 'peso', descripcion: '3,5 kg por llanta en vez de 5: 6 kg menos en masa no suspendida, que es la que más se nota.', masaKg: 6.5, costeEur: 4 * (260 + 75), proveedor: { nombre: 'Fabricantes de llantas forjadas a medida', nota: 'piezas de competición' }, aplicar: { mRueda: 6.5 } },
    ],
  },
  {
    id: 'frenos', corto: 'Frenos', nombre: 'Frenos', grupo: 'Rodaje', capa: 'ruedas',
    que: 'Discos ventilados con pinza flotante en las cuatro ruedas, bomba de freno con servo eléctrico y repartidor. El freno regenerativo del motor hace la mayor parte del trabajo en uso normal; los discos están para la frenada fuerte.',
    caracteristicas: [['Delanteros', 'discos ventilados Ø 214 mm (Twizy)'], ['Traseros', 'discos Ø 204 mm'], ['Pinzas', 'flotantes de un pistón, aluminio'], ['Mando', 'hidráulico, doble circuito, servo eléctrico'], ['Freno de mano', 'eléctrico sobre las pinzas traseras'], ['Masa', '2,8 kg por rueda, con su parte de bomba y latiguillos']],
    unidades: 4, masaKg: P => 4 * P.mFrenos, costeEur: () => 4 * (55 + 95 + 30) + 150, parametroMasa: 'mFrenos', deslizador: 'Un freno de disco con pinza',
    proveedores: [
      { nombre: 'Discos y pinzas de Twizy (Autodoc, Oscaro)', url: 'https://www.autodoc.es/', nota: 'Discos 50–60 €, pinzas 90–120 €, pastillas 30 € el juego' },
      { nombre: 'Bomba y servo (Brembo / ATE)', url: 'https://www.brembo.com/' },
    ],
    alternativas: [
      { id: 'moto', nombre: 'Discos y pinzas de moto', ahorra: 'peso', descripcion: 'Discos macizos de Ø 200 mm de acero inoxidable y pinzas de aluminio de dos pistones (Brembo P2): 1 kg menos por rueda con la misma frenada.', masaKg: 7.2, costeEur: 4 * (70 + 160) + 150, proveedor: { nombre: 'Brembo (moto)', url: 'https://www.brembo.com/' }, aplicar: { mFrenos: 1.8 } },
      { id: 'desguace', nombre: 'Frenos completos de Twizy, de desguace', ahorra: 'coste', descripcion: 'Las cuatro esquinas con disco, pinza y mangueta: un tercio del precio. Hay que cambiar pastillas y revisar los discos.', masaKg: 12.8, costeEur: 300, proveedor: { nombre: 'Desguaces (Renault Twizy)', url: 'https://www.ebay.es/' }, aplicar: { mFrenos: 3.2 } },
    ],
  },
  // ── Suspensión y dirección ────────────────────────────────────────────────
  {
    id: 'suspension', corto: 'Suspensión', nombre: 'Suspensión McPherson delante, brazos tirados detrás', grupo: 'Suspensión y dirección', capa: 'suspension',
    que: 'Delante, en cada rueda una columna McPherson (muelle y amortiguador en uno) anclada a una torreta del chasis, un brazo inferior en A fabricado en tubo y una mangueta. Detrás, un brazo tirado por rueda con el amortiguador tumbado y anclado bajo el suelo del maletero: sin torretas, para que el maletero quede plano y lo más grande posible (2026-11-06). Delante y detrás, barra estabilizadora.',
    caracteristicas: [['Tipo', 'McPherson delante · brazos tirados con amortiguador tumbado detrás'], ['Recorrido', '90 mm'], ['Muelles', '≈ 25 N/mm delante · 30 N/mm detrás'], ['Brazos', 'tubo de aluminio Ø 25 × 2,5, soldados'], ['Estabilizadoras', 'Ø 18 mm delante y detrás'], ['Masa', '26 kg lo comprado + brazos del chasis']],
    unidades: 4, masaKg: (_P, res) => res.masas['Suspensión'] ?? 0, costeEur: () => 4 * 130 + 4 * 60 + 2 * 90 + 4 * 40 + 120, parametroMasa: 'mSuspension', deslizador: 'Cuatro McPherson con manguetas',
    proveedores: [
      { nombre: 'Columnas McPherson de Twizy (KYB, Monroe, Autodoc)', url: 'https://www.autodoc.es/', nota: '≈ 130 € cada una' },
      { nombre: 'Manguetas y rótulas de Twizy (Motordoctor, Autodoc)', url: 'https://www.motordoctor.es/', nota: 'Rótulas 20–40 €' },
    ],
    alternativas: [
      { id: 'coilover', nombre: 'Amortiguadores ajustables de aluminio + manguetas mecanizadas', ahorra: 'peso', descripcion: 'Amortiguadores de quad/kart-cross con muelle (1,3 kg cada uno) y manguetas de aluminio a medida: 4 kg menos y reglaje de altura.', masaKg: 22, costeEur: 4 * 260 + 4 * 220 + 2 * 90 + 120, proveedor: { nombre: 'Öhlins / Fox (quad) + mecanizado', url: 'https://www.ohlins.com/' }, aplicar: { mSuspension: 22 } },
      { id: 'desguace', nombre: 'Suspensión completa de Twizy, de desguace', ahorra: 'coste', descripcion: 'Las cuatro columnas, brazos y manguetas del Twizy, usadas: un tercio del precio, 4 kg más y hay que revisar los amortiguadores.', masaKg: 30, costeEur: 450, proveedor: { nombre: 'Desguaces (Renault Twizy)', url: 'https://www.ebay.es/' }, aplicar: { mSuspension: 30 } },
    ],
  },
  {
    id: 'direccion', corto: 'Dirección', nombre: 'Dirección', grupo: 'Suspensión y dirección', capa: 'direccion',
    que: 'Cremallera manual delante del eje delantero, dos bieletas a las manguetas y una columna hasta un volante pequeño e inclinado. Sin asistencia: con 110 kg sobre el eje delantero no hace falta.',
    caracteristicas: [['Cremallera', 'manual, 2,6 vueltas de tope a tope'], ['Giro máximo de las ruedas', '22° (radio de giro ≈ 4,3 m)'], ['Volante', 'Ø 300 mm, inclinado 35°'], ['Columna', 'con junta cardán y absorción de impacto'], ['Masa', '7 kg en total']],
    unidades: 1, masaKg: P => P.mDireccion, costeEur: () => 520, parametroMasa: 'mDireccion', deslizador: 'Dirección completa',
    proveedores: [
      { nombre: 'Cremallera y bieletas de Twizy (Autodoc, Renault)', url: 'https://www.autodoc.es/', nota: 'Cremallera nueva 250–400 €' },
      { nombre: 'Volante y columna (Sparco, OMP)', url: 'https://www.sparco.com/' },
    ],
    alternativas: [
      { id: 'kart', nombre: 'Cremallera de aluminio de kart-cross + volante de carbono', ahorra: 'peso', descripcion: 'Cremallera corta de aluminio, columna de aluminio y volante de carbono: 2 kg menos.', masaKg: 5, costeEur: 800, proveedor: { nombre: 'Fabricantes de kart-cross / buggy', nota: 'piezas de competición' }, aplicar: { mDireccion: 5 } },
      { id: 'desguace', nombre: 'Dirección de Twizy, de desguace', ahorra: 'coste', descripcion: 'Cremallera, columna y bieletas usadas. Revisar las rótulas.', masaKg: 8, costeEur: 180, proveedor: { nombre: 'Desguaces (Renault Twizy)', url: 'https://www.ebay.es/' }, aplicar: { mDireccion: 8 } },
    ],
  },
  // ── Estructura y carrocería ───────────────────────────────────────────────
  {
    id: 'chasis', corto: 'Chasis', nombre: 'Chasis tubular', grupo: 'Estructura y carrocería', capa: 'chasis',
    que: 'Dos largueros entre ejes con travesaños, las torretas delanteras, el arco del salpicadero, los estribos de las puertas y, en acero cromoly, los dos montantes del parabrisas y el arco de seguridad entre el piloto y el pasajero (en esas barras cierra y se articula la puerta). Soldado en tubo de aluminio 6061 y tratado T6 después de soldar. Lleva el peso del piloto y la batería y sostiene la carrocería.',
    caracteristicas: [['Material', 'aluminio 6061-T6'], ['Largueros', 'Ø 40 × 2 mm'], ['Resto', 'Ø 32 × 2 y Ø 25 × 1,5 mm'], ['Tratamiento', 'T6 tras soldar (recupera el 90 % de la resistencia)'], ['Coeficiente de seguridad', 'calculado en «Estructura»']],
    unidades: 1, masaKg: (_P, res) => res.masas.Chasis ?? 0,
    costeEur: (P, _r, m) => Math.round(metrosTubo(m) * EUR_M_TUBO[P.matChasis] + 900 + (P.matChasis === 'al6061' ? 300 : 0)), parametroMasa: 'extraChasis', deslizador: 'Uniones, chapas y tornillería (y el material)',
    proveedores: [
      { nombre: 'Tubo 6061-T6 (Alu-Stock, Broncesval)', url: 'https://www.alu-stock.es/', nota: '≈ 9 €/m el Ø 40 × 2' },
      { nombre: 'Soldadura TIG + tratamiento T6 (taller y tratamientos térmicos locales)', nota: '≈ 900 € de soldadura con plantilla + 300 € de T6' },
    ],
    alternativas: [
      { id: 'cromoly', nombre: 'Acero cromoly 4130', ahorra: 'coste', descripcion: 'Se suelda sin tratamiento posterior y con tubos más finos; sale unos 6 kg más pesado pero más barato y fácil de reparar.', masaKg: 25, costeEur: 1500, proveedor: { nombre: 'Tubo 4130 (Aceros Hispania, Tubos Reunidos)', nota: '≈ 16 €/m' }, aplicar: { matChasis: 'cromoly', spineT: 1.5 } },
      { id: 'carbono', nombre: 'Tubo de carbono encolado', ahorra: 'peso', descripcion: 'Tubos de carbono pultrusionados con uniones de aluminio encoladas: la mitad de masa del chasis. Caro y sin soldadura: cada unión es una pieza mecanizada.', masaKg: 11, costeEur: 4800, proveedor: { nombre: 'Rock West Composites / Clipcarbono', url: 'https://www.rockwestcomposites.com/' }, aplicar: { matChasis: 'carbono' } },
    ],
  },
  {
    id: 'carroceria', corto: 'Carrocería', nombre: 'Carrocería', grupo: 'Estructura y carrocería', capa: 'carenado',
    que: 'La piel baja del vehículo: morro, costados, cubierta y cola, con los pasos de rueda y la banda negra de los bajos. Laminada en fibra de carbono con alma de espuma sobre un molde sacado del STEP. Es lo que da el Cd.',
    caracteristicas: [['Material', 'carbono con alma de espuma de 5 mm'], ['Espesor del laminado', '1,8 mm'], ['Superficie', 'calculada en «Rendimiento»'], ['Molde', 'fresado en poliuretano de alta densidad desde el STEP'], ['Acabado', 'gelcoat blanco, bajos en negro mate']],
    unidades: 1, masaKg: (_P, res) => res.masas['Carrocería'] ?? 0,
    costeEur: (P, res) => Math.round(res.areas.carroceria * EUR_M2_CARENADO[P.matCarenado] + MOLDE_CARENADO[P.matCarenado]), parametroMasa: 'espCarenado', deslizador: 'Espesor de la carrocería (y el material)',
    proveedores: [
      { nombre: 'Tejidos y resinas (Castro Composites, Clipcarbono)', url: 'https://www.castrocompositesshop.com/', nota: 'carbono 200 g/m² ≈ 40 €/m², epoxi ≈ 25 €/kg' },
      { nombre: 'Molde fresado (talleres de modelos y moldes)', nota: '≈ 3.500 € el molde en dos mitades' },
    ],
    alternativas: [
      { id: 'vidrio', nombre: 'Fibra de vidrio', ahorra: 'coste', descripcion: 'Mismo molde, laminado de vidrio: 6–8 kg más y un tercio del precio del material. Es lo normal en un primer prototipo.', masaKg: 36, costeEur: 2900, proveedor: { nombre: 'Castro Composites', url: 'https://www.castrocompositesshop.com/' }, aplicar: { matCarenado: 'vidrio' } },
      { id: 'fino', nombre: 'Carbono de 1,4 mm con alma más gruesa', ahorra: 'peso', descripcion: 'Menos capas de carbono y 8 mm de espuma: igual de rígido y un 20 % más ligero. Pide más cuidado en los bordes.', masaKg: 23, costeEur: 6200, proveedor: { nombre: 'Castro Composites', url: 'https://www.castrocompositesshop.com/' }, aplicar: { matCarenado: 'carbono', espCarenado: 1.4 } },
    ],
  },
  {
    id: 'cupula', corto: 'Cristales', nombre: 'Parabrisas y ventanillas', grupo: 'Estructura y carrocería', capa: 'cristales',
    que: 'Los cristales de la cabina: el parabrisas plano y estrecho (como el del VW XL1, con la curva suave del Aptera) y una ventanilla en cada puerta, en policarbonato termoformado con tratamiento duro contra rayas y filtro UV. El resto de la cúpula no es cristal: es carrocería con paneles solares encima, con los montantes inclinados y los marcos de las ventanillas.',
    caracteristicas: [['Material', 'policarbonato 4 mm, capa dura antirrayas'], ['Piezas', 'parabrisas + 2 ventanillas (en las puertas)'], ['Montantes', 'inclinados, de la base del parabrisas al techo'], ['Superficie', 'calculada en «Rendimiento»'], ['Limpiaparabrisas', 'uno, eléctrico, en la base']],
    unidades: 1, masaKg: (_P, res) => res.masas['Cúpula'] ?? 0, costeEur: (P, res) => Math.round(res.areas.cristal * (P.espCristal >= 4 ? 55 : 45) + 1200), parametroMasa: 'espCristal', deslizador: 'Espesor de la cúpula',
    proveedores: [
      { nombre: 'Policarbonato Lexan Margard (SABIC) en plancha', url: 'https://www.sabic.com/', nota: '≈ 55 €/m² en 4 mm' },
      { nombre: 'Termoformado de cúpulas (talleres de ultraligeros y planeadores)', nota: '≈ 1.200 € el molde y el formado' },
    ],
    alternativas: [
      { id: 'tres', nombre: 'Policarbonato de 3 mm', ahorra: 'peso y coste', descripcion: 'Un 25 % menos de masa en la cúpula. Suficiente con la curvatura de esta cúpula; el parabrisas se queda en 4 mm.', masaKg: 13, costeEur: 1300, proveedor: { nombre: 'SABIC Lexan Margard', url: 'https://www.sabic.com/' }, aplicar: { espCristal: 3 } },
    ],
  },
  {
    id: 'puertas', corto: 'Puertas', nombre: 'Puertas: bisagras, resortes y cierres', grupo: 'Estructura y carrocería', capa: 'carenado',
    que: 'Cada puerta de ala de gaviota es media cúpula con su panel lateral, colgada de dos bisagras en la línea central del techo. Dos resortes de gas la sostienen abierta y un cierre eléctrico la retiene. Juntas de goma alrededor.',
    caracteristicas: [['Bisagras', '2 por puerta, acero inoxidable, en el arco del techo'], ['Resortes de gas', '2 por puerta, 300 N'], ['Cierre', 'eléctrico con apertura de emergencia manual'], ['Juntas', 'perfil de EPDM en todo el contorno'], ['Masa', '4 kg en total']],
    unidades: 2, masaKg: P => masaFija(P, 'puertas'), costeEur: () => 380,
    proveedores: [
      { nombre: 'Resortes de gas (Stabilus, Suspa)', url: 'https://www.stabilus.com/' },
      { nombre: 'Cierres y bisagras (Southco)', url: 'https://www.southco.com/' },
    ],
    alternativas: [
      { id: 'manual', nombre: 'Cierres manuales', ahorra: 'coste', descripcion: 'Cierres de palanca en vez de eléctricos: sin cableado ni actuadores.', masaKg: 3.6, costeEur: 220, proveedor: { nombre: 'Southco', url: 'https://www.southco.com/' }, aplicar: {} },
    ],
  },
  {
    id: 'maleteros', corto: 'Maleteros', nombre: 'Tapas de los maleteros', grupo: 'Estructura y carrocería', capa: 'carenado',
    que: 'La tapa del capó (maletero delantero, bisagra atrás) y la cola de la cúpula (maletero trasero, bisagra delante). Cada una con un resorte de gas y un cierre.',
    caracteristicas: [['Delantera', 'capó, abre hacia delante y arriba 55°'], ['Trasera', 'cola de la cúpula, abre 50°'], ['Volumen', 'calculado en «Puertas y maleteros»'], ['Masa', '2 kg de herrajes']],
    unidades: 2, masaKg: P => masaFija(P, 'maleteros'), costeEur: () => 150,
    proveedores: [{ nombre: 'Stabilus / Southco', url: 'https://www.southco.com/' }],
    alternativas: [],
  },
  {
    id: 'luces', corto: 'Luces', nombre: 'Luces y retrovisores', grupo: 'Estructura y carrocería', capa: 'carenado',
    que: 'Faros LED en tira sobre los pómulos del morro, pilotos e intermitentes en la cola, tercera luz de freno en la cúpula y dos retrovisores pequeños en la base del parabrisas. Homologables como cuadriciclo (L7e).',
    caracteristicas: [['Faros', '2 tiras LED cruce/carretera, 2 × 12 W'], ['Pilotos', 'LED rojo con freno, intermitentes ámbar'], ['Retrovisores', '2 pods en la base del parabrisas'], ['Masa', '2 kg']],
    unidades: 1, masaKg: P => masaFija(P, 'luces'), costeEur: () => 320,
    proveedores: [{ nombre: 'Hella / Lazer (LED homologados)', url: 'https://www.hella.com/' }, { nombre: 'Retrovisores de moto (Rizoma, Puig)', url: 'https://www.puig.tv/' }],
    alternativas: [
      { id: 'camaras', nombre: 'Cámaras en vez de retrovisores', ahorra: 'peso', descripcion: 'Dos cámaras en el hombro y una pantalla: menos resistencia aerodinámica y 1 kg menos. Necesita homologación aparte.', masaKg: 1.4, costeEur: 420, proveedor: { nombre: 'Kits de cámara de retrovisión', nota: 'automoción' }, aplicar: {} },
    ],
  },
  // ── Habitáculo y equipo ───────────────────────────────────────────────────
  {
    id: 'asientos', corto: 'Asiento', nombre: 'Asiento', grupo: 'Habitáculo y equipo', capa: 'asientos',
    que: 'Asiento baquet reclinado 35°, con reposacabezas, apoyado sobre el módulo de batería. Cinturón de cuatro puntos. El reclinado es lo que permite la cúpula baja.',
    caracteristicas: [['Tipo', 'baquet de composite, respaldo fijo a 35°'], ['Reposacabezas', 'integrado'], ['Cinturón', '4 puntos'], ['Tapizado', 'espuma de 30 mm con tela técnica'], ['Masa', '7 kg']],
    unidades: P => P.plazas, masaKg: (_P, res) => res.masas.Asientos ?? 0, costeEur: P => P.plazas * 650, parametroMasa: 'mAsiento', deslizador: 'Un asiento',
    proveedores: [{ nombre: 'Sparco / OMP (baquets de fibra)', url: 'https://www.sparco.com/' }, { nombre: 'Tillett (baquets de composite ligeros)', url: 'https://www.tillett.co.uk/' }],
    alternativas: [
      { id: 'carbono', nombre: 'Baquet de carbono', ahorra: 'peso', descripcion: '4 kg con reposacabezas. El doble de precio.', masaKg: 4, costeEur: 1300, proveedor: { nombre: 'Tillett / Sparco carbono', url: 'https://www.tillett.co.uk/' }, aplicar: { mAsiento: 4 } },
      { id: 'vidrio', nombre: 'Baquet de fibra de vidrio', ahorra: 'coste', descripcion: '9 kg, menos de la mitad de precio.', masaKg: 9, costeEur: 280, proveedor: { nombre: 'Sparco / OMP (gama básica)', url: 'https://www.sparco.com/' }, aplicar: { mAsiento: 9 } },
    ],
  },
  {
    id: 'varios', corto: 'Equipo', nombre: 'Equipo: pantalla, cinturón, extintor, cableado 12 V', grupo: 'Habitáculo y equipo', capa: 'ocupantes',
    que: 'Lo que no es una pieza grande: pantalla e instrumentación, cinturón, extintor, bombas del circuito de refrigeración, ventilación de la cúpula, cableado de 12 V, claxon y pequeños herrajes.',
    caracteristicas: [['Pantalla', '7″ con CAN: velocidad, batería, consumo'], ['Refrigeración', 'bomba de 12 V y radiador pequeño en la cola'], ['Ventilación', 'ventilador en el salpicadero'], ['Masa', 'lo que falta hasta «Varios» en el peso']],
    unidades: 1, masaKg: P => Math.max(0, P.mVarios - Object.values(MASAS_FIJAS_A1).reduce((a, b) => a + b, 0)), costeEur: () => 600, parametroMasa: 'mVarios', deslizador: 'Varios: cables, cargador, luces, cierres',
    proveedores: [{ nombre: 'AEM / Haltech (pantallas CAN)', url: 'https://www.aemelectronics.com/' }, { nombre: 'Cinturones y extintor (Sparco)', url: 'https://www.sparco.com/' }],
    alternativas: [],
  },
];

export const GRUPOS: GrupoComponente[] = ['Propulsión', 'Energía', 'Rodaje', 'Suspensión y dirección', 'Estructura y carrocería', 'Habitáculo y equipo'];

export const componentePorId = (id: string) => COMPONENTES.find(c => c.id === id);

/** La alternativa elegida para un componente, si la hay. */
export const alternativaElegida = (c: Componente, P: Parametros) => c.alternativas.find(a => a.id === P.variantes?.[c.id]);

/** Lo escrito a mano en la ficha de este componente, si hay algo. */
export const piezaManual = (c: Componente, P: Parametros): PiezaManual | undefined => P.piezas?.[c.id];

/** Masa y coste de un componente con la alternativa elegida (o de serie) y lo escrito a mano. */
export function fichaComponente(c: Componente, P: Parametros, res: Resultados, m: Modelo) {
  const n = typeof c.unidades === 'function' ? c.unidades(P) : c.unidades;
  const alt = alternativaElegida(c, P), manual = piezaManual(c, P);
  // La masa siempre sale del modelo (ya lleva aplicados los parámetros de la alternativa y el peso escrito a mano);
  // el coste, del catálogo o de la ficha: el escrito a mano y el de la alternativa cubren todas las unidades.
  const masa = c.masaKg(P, res, m);
  const coste = manual?.coste ?? (alt ? alt.costeEur : c.costeEur(P, res, m));
  return { unidades: n, masa, coste, alternativa: alt, manual, nombre: manual?.nombre || c.nombre };
}

/**
 * Convierte un peso por unidad escrito a mano en el parámetro del diseño que
 * lo fija, para que el 3D, las comprobaciones y el peso total lo usen. Las
 * piezas sin deslizador (cargador, cableado, puertas, maleteros, luces)
 * guardan el peso en la ficha y «Varios» lo recoge.
 */
export function aplicarMasaManual(c: Componente, P: Parametros, res: Resultados, m: Modelo, masaUnidad: number | undefined): Partial<Parametros> {
  if (masaUnidad === undefined || !(masaUnidad > 0)) return {};
  const actual = c.masaKg(P, res, m), n = typeof c.unidades === 'function' ? c.unidades(P) : c.unidades;
  switch (c.id) {
    case 'motor': return { mMotor: masaUnidad };
    case 'inversor': return { mInversor: masaUnidad };
    case 'transmision': return { mReductora: Math.max(1, masaUnidad - 4) };
    case 'bateria': return { whKg: Math.max(40, Math.min(400, P.kWh * 1000 / masaUnidad)) };
    case 'ruedas': return { mRueda: masaUnidad };
    case 'frenos': return { mFrenos: masaUnidad };
    case 'direccion': return { mDireccion: masaUnidad };
    case 'asientos': return { mAsiento: masaUnidad };
    case 'suspension': return { mSuspension: Math.max(1, P.mSuspension + (masaUnidad * n - actual)) };
    case 'chasis': return { extraChasis: Math.max(0, P.extraChasis + (masaUnidad - actual)) };
    case 'carroceria': return actual > 0 ? { espCarenado: Math.max(0.3, Math.min(6, P.espCarenado * masaUnidad / actual)) } : {};
    case 'cupula': return actual > 0 ? { espCristal: Math.max(1, Math.min(8, P.espCristal * masaUnidad / actual)) } : {};
    case 'solar': return actual > 0 ? { mSolarM2: Math.max(0.3, Math.min(6, P.mSolarM2 * masaUnidad / actual)) } : {};
    case 'varios': return { mVarios: Math.max(0, masaUnidad + Object.values(MASAS_FIJAS_A1).reduce((a, b) => a + b, 0)) };
    default: return {};   // cargador, cableado, puertas, maleteros, luces: lo lee `masaFija`
  }
}

/** El diseño con la ficha de este componente escrita a mano (o borrada con `null`). */
export function escribirPieza(c: Componente, P: Parametros, res: Resultados, m: Modelo, datos: PiezaManual | null): Parametros {
  const piezas = { ...(P.piezas ?? {}) };
  if (datos) piezas[c.id] = datos; else delete piezas[c.id];
  const cambios = datos ? aplicarMasaManual(c, P, res, m, datos.masa) : {};
  return { ...P, ...cambios, piezas: Object.keys(piezas).length ? piezas : undefined };
}

/** Totales del vehículo con lo elegido. */
export function totalesComponentes(P: Parametros, res: Resultados, m: Modelo) {
  let masa = 0, coste = 0;
  for (const c of COMPONENTES) { const f = fichaComponente(c, P, res, m); masa += f.masa; coste += f.coste; }
  return { masa, coste };
}

/** El diseño con una alternativa elegida (o vuelta a la de serie con `null`). */
export function elegirAlternativa(P: Parametros, c: Componente, alt: Alternativa | null): Parametros {
  const variantes = { ...(P.variantes ?? {}) };
  if (alt) variantes[c.id] = alt.id; else delete variantes[c.id];
  // Al volver a la de serie se restauran los parámetros que la alternativa había tocado.
  const previa = alternativaElegida(c, P);
  const restaurar: Partial<Parametros> = {};
  if (previa) for (const k of Object.keys(previa.aplicar) as (keyof Parametros)[]) (restaurar as Record<string, unknown>)[k] = PARAMETROS_A1[k];
  return { ...P, ...restaurar, ...(alt?.aplicar ?? {}), variantes: Object.keys(variantes).length ? variantes : undefined };
}
