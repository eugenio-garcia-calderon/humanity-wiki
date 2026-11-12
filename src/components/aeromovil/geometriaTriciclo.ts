// ============================================================================
// TRICICLO BALA · el cuarto vehículo del editor (2026-11-10, Eugenio)
// ============================================================================
// Eugenio: «Desarrolla una ramificación del cuadriciclo bala… que en vez de ser
// de 4 ruedas sea de 3… las dos ruedas delanteras están como en una posición
// como el aptera, y luego tiene una rueda trasera alineada con el eje del
// vehículo, y tiene una forma exactamente igual que la que tiene el cuadriciclo
// bala… Métele también dos pasajeros… la capacidad de reclinación del asiento»,
// y que se pueda modificar todo lo que se modifica en el «Aptera like» (el
// Aeromóvil 1): carrocería, carenados, chasis, rodaje, motor, batería, interior.
//
// THE SHAPE IS THE CUADRICICLO'S: the same parametrised code (garaje/balaForma.ts,
// balaMedidas.ts), fed with this vehicle's own `t…` fields. With the defaults
// the body (skin, canopy, nose, tail, fin, livery, lamps) is the Cuadriciclo en rombo
// Bala's default body to the last vertex (scripts/triciclo-disenos.ts checks it).
// What changes is the wheels: a tadpole layout.
//   · No front centre wheel. Where it was (the nose, around the front axle)
//     goes the battery: low and as far forward as it fits, which is where a
//     three-wheeler with two wheels in front wants its weight (see `vuelco`).
//   · Two front wheels in Aptera-like pods on streamlined arms, beside the
//     front of the body, at the front axle (x = 0, where the Cuadriciclo en rombo's
//     front wheel was). They steer, and the pods turn with them, as on the
//     Aptera: a fixed pod with room for a 28° lock inside would be twice as
//     wide. The check is that the turned pod clears the body.
//   · One rear wheel on the centre line inside the tail, on a swing arm, with
//     the motor in its hub.
//
// Pure (no three.js): the wind tunnel's Web Worker builds it for «Probar» and
// for the Cd the results use.

import type { Comprobacion, MaterialCarenado, MaterialChasis, Parametros, PuntosOcupante, Pulgadas, Resultados, Rueda, Tubo, P3 } from './geometria';
import { MATERIALES_CARENADO, MATERIALES_CHASIS, RENDIMIENTO_SOLAR, TRICICLO_DEFECTO, largoTubo } from './geometria';
import { crearForma, type DimBala, type FormaBala } from './garaje/balaForma';
import { APLASTADO_BALA, ASIENTO, alturasPod, anchoMaxPod, areaMarco, areaXT, bandaMarco, brazosDe, contornoCupula, escalaManillar, extremoManillar, podDe, semiAncho, techoEn, ventanasDe, type Asientos, type OpcionesVentanas } from './garaje/balaMedidas';
import {
  CADERA_SOBRE_ASIENTO, DESLIZADORES_BALA, HUECO_CARENADO, MEDIA_CABEZA, TALLA_SENTADO,
  areaFrontalBala, areasBala, carenadoCuerpo, neumaticoCarenado, pielBala, rodilla, ruedaDentro, type ClaveBala, type ResultadosBala,
} from './geometriaBala';

/** Los parámetros propios del Triciclo (prefijo `t`). Opcionales en `Parametros`: los diseños de los otros tres vehículos no los llevan. */
export interface CamposTriciclo {
  // Carrocería: la forma del Cuadriciclo en rombo
  tAncho: number; tSuelo: number; tMorro: number; tPuntaMorro: number; tCola: number; tPuntaCola: number; tAleta: number;
  tCupIni: number; tCupFin: number; tAlto: number;
  // Carrocería: techo solar y ventanas (2026-11-10, segunda versión). Opcionales al guardar: un diseño de antes los toma por defecto.
  tSolar: number;      // dónde empieza el panel solar, detrás de donde iba la rueda delantera del Cuadriciclo en rombo (m); al máximo, sin panel
  tVentAlto: number;   // alto de la ventana lateral: fracción del costado de cristal, de su borde de abajo a lo alto; encima, el techo
  tVentanas: 'marco' | 'burbuja';   // ventanas laterales con montante (como el Aptera) o una cúpula de una pieza (como el Cuadriciclo en rombo)
  tPilar: number;      // pie del montante delantero, detrás de donde iba la rueda delantera del Cuadriciclo en rombo (m)
  tPilarBarrido: number;   // cuánto más atrás llega el montante arriba, donde se junta con el techo (m)
  tPilarAncho: number; // ancho del montante (m)
  // Carrocería: carenados de las ruedas delanteras, brazos y faldón trasero
  tPodEsc: number;     // tamaño del carenado delantero alrededor de la rueda (×)
  tPodAncho: number;   // anchura del carenado (×)
  tPodCola: number;    // largo de la cola del carenado, detrás del eje (×)
  tBrazo: number;      // cuerda del carenado del brazo de arriba (m)
  tFaldon: number;     // faldón de la rueda trasera: 0 sin faldón (asoma como en el Cuadriciclo en rombo) · 1 cerrado hasta 4 cm del suelo
  // Carrocería: material
  tMatCarenado: MaterialCarenado; tEspCarenado: number; tEspCristal: number;   // mm
  // Interior
  tPilX: number; tPilY: number; tPasX: number; tPasY: number;   // caderas detrás del eje delantero y sillines sobre el suelo (m)
  tRecPil: number; tRecPas: number;   // reclinado de los respaldos (° desde la vertical, + hacia atrás)
  tManX: number; tManY: number;       // manillar: + hacia el piloto, + arriba (m)
  tPiesX: number; tPiesY: number;     // plataformas del piloto: + hacia delante, + arriba (m)
  tMOcc: number; tMAsiento: number;   // kg
  // Interior, round three (2026-11-11): the seating layout and the folding rows. Optional when saved: an older design takes the defaults (astride, as before).
  tAsientos: 'horcajadas' | 'filas';  // a horcajadas (2 plazas, como hasta ahora) o tres filas 1 + 2 + 1
  tFila2: 'abierta' | 'plegada';      // fila 2 (dos asientos juntos): con sus dos pasajeros, o plegada como suelo del maletero
  tFila3: 'abierta' | 'plegada';      // fila 3 (un asiento pequeño en el centro), lo mismo
  tFila2X: number;     // caderas de la fila 2 detrás de las del piloto (m)
  tFila3X: number;     // caderas de la fila 3 detrás de las de la fila 2 (m)
  tRecFila: number;    // reclinado de los respaldos de las filas 2 y 3 (°)
  // Chasis
  tChMat: MaterialChasis; tChD: number; tChT: number; tChUniones: number;   // mm, mm, kg
  // Rodaje
  tBatalla: number;    // la batalla de la carrocería (del Cuadriciclo en rombo): de donde iba su rueda delantera al eje trasero (m)
  tEjeDel: number;     // eje delantero: cuánto va detrás de donde iba la rueda delantera del Cuadriciclo en rombo (m)
  tVia: number; tRuedaDel: RuedaTriciclo; tRuedaTras: RuedaTriciclo;
  tGiro: number;       // giro máximo de la rueda delantera de dentro (°)
  tRecDel: number; tRecTras: number;   // recorrido de la suspensión (mm)
  tBasculante: number; // largo del basculante trasero (m)
  // The «Cuadriciclo Bala clásico» (2026-11-11, Eugenio: «haz un vehículo igual que el triciclo bala, pero esta vez que
  // tenga 4 ruedas»). Optional when saved: a design without them has one rear wheel, and its rear track is its front one.
  tTraseras: 'una' | 'dos';   // una rueda trasera en la cola (triciclo) o dos en carenados (cuatro ruedas)
  tViaTras: number;    // vía trasera, centro a centro de las dos ruedas traseras (m); solo con 'dos'
  tMRueda: number; tMFreno: number; tMSuspDel: number; tMSuspTras: number; tMDir: number;   // kg
  // Propulsión
  tKWNom: number; tKWPico: number; tMMotor: number; tMInversor: number; tVel: number;
  // Energía
  tKWh: number; tWhKg: number; tWhL: number; tMVarios: number;
  tSolarM2: number;    // paneles solares flexibles laminados (kg/m²), como en el Aeromóvil 1
}
export type ClaveTriciclo = keyof CamposTriciclo;
/**
 * The Triciclo's wheels (2026-11-10, round two: Eugenio, «ponle unas ruedas más grandes»). The bicycle/moped
 * sizes of the first version (moped tyres: 70 mm in front, 80 mm behind) and three car rims with low-profile
 * tyres. `kg`: a wheel's mass as a multiple of the «Una rueda con neumático» slider (which is a moped wheel's):
 * a 13–15″ car wheel with its tyre weighs 10–13 kg against a moped wheel's 4–5. `kWBuje`: the peak power a
 * motor in that hub can credibly give (the «Motor de buje» check): a rough rule from motors on sale (QS 273 in
 * motorcycle rims, ≈ 20 kW peak; Elaphe M700 in car rims, ≈ 75 kW peak), not a measurement.
 */
export type RuedaTriciclo = Pulgadas | 'c13' | 'c14' | 'c15';
export const RUEDAS_TRICICLO: Record<RuedaTriciclo, { d: number; neuDel: number; neuTras: number; n: string; kg: number; kWBuje: number }> = {
  '16': { d: 0.405, neuDel: 0.07, neuTras: 0.08, n: '16″ de ciclomotor (405 mm)', kg: 1, kWBuje: 6 },
  '20': { d: 0.508, neuDel: 0.07, neuTras: 0.08, n: '20″ de ciclomotor (508 mm)', kg: 1, kWBuje: 10 },
  '24': { d: 0.61, neuDel: 0.07, neuTras: 0.08, n: '24″ de ciclomotor (610 mm)', kg: 1, kWBuje: 12 },
  '26': { d: 0.66, neuDel: 0.07, neuTras: 0.08, n: '26″ de ciclomotor (660 mm)', kg: 1, kWBuje: 12 },
  '28': { d: 0.70, neuDel: 0.07, neuTras: 0.08, n: '28″ de ciclomotor (700 mm)', kg: 1, kWBuje: 12 },
  // tyre diameter = rim + 2 × width × profile: 330 + 2·145·0.70, 356 + 2·165·0.60, 381 + 2·175·0.55 (mm)
  c13: { d: 0.533, neuDel: 0.145, neuTras: 0.145, n: '13″ de coche, 145/70 R13 (533 mm)', kg: 2.3, kWBuje: 35 },
  c14: { d: 0.554, neuDel: 0.165, neuTras: 0.165, n: '14″ de coche, 165/60 R14 (554 mm)', kg: 2.5, kWBuje: 45 },
  c15: { d: 0.574, neuDel: 0.175, neuTras: 0.175, n: '15″ de coche, 175/55 R15 (574 mm)', kg: 2.7, kWBuje: 60 },
};
type ClaveTexto = 'tMatCarenado' | 'tChMat' | 'tRuedaDel' | 'tRuedaTras' | 'tVentanas' | 'tAsientos' | 'tFila2' | 'tFila3' | 'tTraseras';
export type ClaveNumTriciclo = Exclude<ClaveTriciclo, ClaveTexto>;

// ------------------------------------------------------------------ deslizadores
/** Los departamentos del Triciclo (los del Aeromóvil 1 que tienen algo que mover aquí). */
export type DepTriciclo = 'carroceria' | 'interior' | 'chasis' | 'rodaje' | 'propulsion' | 'energia';
export const DEPS_TRICICLO: DepTriciclo[] = ['carroceria', 'interior', 'chasis', 'rodaje', 'propulsion', 'energia'];
/** Lo que es cada departamento en el Triciclo (los lemas del Aeromóvil 1 hablan de sus piezas, no de estas). */
export const LEMAS_TRICICLO: Record<DepTriciclo | 'proyecto', string> = {
  proyecto: 'el resumen: comprobaciones, peso, consumo y vuelco',
  carroceria: 'la piel del Cuadriciclo en rombo, techo solar y ventanas, carenados y material',
  interior: 'los asientos (a horcajadas o en tres filas que se pliegan), manillar, plataformas y maletero',
  chasis: 'el bastidor de tubos dentro de la carrocería',
  rodaje: 'ejes, vía, ruedas, suspensión y dirección',
  propulsion: 'el motor en el buje de la rueda trasera',
  energia: 'la batería (morro, pies y bajo los sillines) y el techo solar',
};
/** The «Cuadriciclo Bala clásico» (2026-11-11): its name and its departments' one-liners where they differ. */
export const esCuatro = (T: Pick<CamposTriciclo, 'tTraseras'>) => T.tTraseras === 'dos';
export const nombreTriciclo = (T: Pick<CamposTriciclo, 'tTraseras'>) => esCuatro(T) ? 'Cuadriciclo Bala clásico' : 'Triciclo Bala';
export const lemasTriciclo = (T: Pick<CamposTriciclo, 'tTraseras'>): Record<DepTriciclo | 'proyecto', string> => esCuatro(T)
  ? { ...LEMAS_TRICICLO, propulsion: 'los dos motores en los bujes de las ruedas traseras' }
  : LEMAS_TRICICLO;
export type Unidad = 'm' | 'cm' | 'mm' | '°' | 'kg' | 'kW' | 'kWh' | 'Wh/kg' | 'Wh/L' | 'km/h' | 'x' | 'kg/m²';
/**
 * Un deslizador del Triciclo. `bala`: la forma es la del Cuadriciclo en rombo, y su
 * etiqueta, su rango y su paso se leen de su tabla (DESLIZADORES_BALA), no se
 * copian. `centrar`: el deslizador se recoloca con el valor por defecto en
 * medio (como todos en el editor); no, cuando el valor por defecto no es el
 * centro de su rango (se ve el rango entero).
 */
export interface FichaTriciclo { clave: ClaveNumTriciclo; n: string; dep: DepTriciclo; bloque: string; min: number; max: number; paso: number; unidad: Unidad; centrar: boolean; desde?: 1 | -1 }
export interface SelectorTriciclo { clave: ClaveTexto; n: string; dep: DepTriciclo; bloque: string; opciones: { k: string; n: string }[] }

type Fila = [ClaveNumTriciclo, DepTriciclo, string, ClaveBala | null, string, number, number, number, Unidad];
// [clave, departamento, bloque, del Cuadriciclo en rombo, etiqueta, mín, máx, paso, unidad]
// A row «del Cuadriciclo en rombo» takes its label from that table, and its range too when mín = máx = 0; since round two
// (2026-11-10, «lo has diseñado para algo muy pequeñito») most of them carry a wider range of their own.
const FILAS: Fila[] = [
  ['tAncho', 'carroceria', 'Forma', 'bAncho', '', 0.77, 1.30, 0.01, 'm'],
  // round three (2026-11-11, «mucho mayor»): up to 35 cm; above 15.8 cm the whole body rises (see SUELO_RIGIDO)
  ['tSuelo', 'carroceria', 'Forma', 'bSuelo', '', 0.04, 0.35, 0.002, 'cm'],
  ['tMorro', 'carroceria', 'Morro y cola', 'bMorro', '', 0.45, 1.00, 0.01, 'm'],
  ['tPuntaMorro', 'carroceria', 'Morro y cola', 'bPuntaMorro', '', 0, 0, 0, 'x'],
  ['tCola', 'carroceria', 'Morro y cola', 'bCola', '', 0.45, 1.20, 0.01, 'm'],
  ['tPuntaCola', 'carroceria', 'Morro y cola', 'bPuntaCola', '', 0, 0, 0, 'm'],
  ['tAleta', 'carroceria', 'Morro y cola', 'bAleta', '', 0, 0, 0, 'm'],
  ['tCupIni', 'carroceria', 'Cúpula', 'bCupIni', '', 0, 0, 0, 'm'],
  ['tCupFin', 'carroceria', 'Cúpula', 'bCupFin', '', 1.80, 2.90, 0.01, 'm'],
  ['tAlto', 'carroceria', 'Cúpula', 'bAlto', '', 1.15, 1.584, 0.002, 'm'],
  ['tSolar', 'carroceria', 'Techo solar y ventanas', null, 'Techo solar: dónde empieza', 0.40, 3.00, 0.01, 'm'],
  ['tVentAlto', 'carroceria', 'Techo solar y ventanas', null, 'Ventana lateral: alto (encima, el techo)', 0.30, 0.85, 0.01, 'x'],
  ['tPilar', 'carroceria', 'Techo solar y ventanas', null, 'Montante delantero: dónde nace', 0.40, 1.00, 0.01, 'm'],
  ['tPilarBarrido', 'carroceria', 'Techo solar y ventanas', null, 'Montante delantero: cuánto se tumba hacia atrás', 0.15, 0.80, 0.01, 'cm'],
  ['tPilarAncho', 'carroceria', 'Techo solar y ventanas', null, 'Montante delantero: ancho', 0.025, 0.08, 0.005, 'cm'],
  ['tPodEsc', 'carroceria', 'Carenados', null, 'Carenado delantero: tamaño', 0.90, 1.10, 0.01, 'x'],
  ['tPodAncho', 'carroceria', 'Carenados', null, 'Carenado delantero: anchura', 0.80, 1.20, 0.01, 'x'],
  ['tPodCola', 'carroceria', 'Carenados', null, 'Carenado delantero: largo de la cola', 0.70, 1.30, 0.01, 'x'],
  ['tBrazo', 'carroceria', 'Carenados', null, 'Brazo delantero: cuerda del carenado', 0.12, 0.28, 0.005, 'cm'],
  ['tFaldon', 'carroceria', 'Carenados', null, 'Rueda trasera: faldón (cuánto asoma)', 0, 1, 0.05, 'x'],
  ['tEspCarenado', 'carroceria', 'Material y espesores', null, 'Espesor de la carrocería', 0.6, 2.4, 0.1, 'mm'],
  ['tEspCristal', 'carroceria', 'Material y espesores', null, 'Espesor de la cúpula (policarbonato)', 1.5, 4.5, 0.5, 'mm'],
  ['tPilX', 'interior', 'Asientos', 'bPilX', '', 0, 0, 0, 'm'],
  ['tPilY', 'interior', 'Asientos', 'bPilY', '', 0.30, 0.50, 0.005, 'm'],
  ['tRecPil', 'interior', 'Asientos', null, 'Reclinado del piloto', -10, 35, 1, '°'],
  ['tPasX', 'interior', 'Asientos', 'bPasX', '', 0, 0, 0, 'm'],
  ['tPasY', 'interior', 'Asientos', 'bPasY', '', 0.34, 0.52, 0.005, 'm'],
  ['tRecPas', 'interior', 'Asientos', null, 'Reclinado del pasajero', -10, 35, 1, '°'],
  ['tManX', 'interior', 'Mandos', null, 'Manillar: hacia el piloto', -0.06, 0.25, 0.01, 'cm'],
  ['tManY', 'interior', 'Mandos', null, 'Manillar: altura', -0.02, 0.10, 0.01, 'cm'],
  ['tPiesX', 'interior', 'Mandos', null, 'Plataformas: hacia delante', -0.08, 0.08, 0.01, 'cm'],
  ['tPiesY', 'interior', 'Mandos', null, 'Plataformas: altura', -0.04, 0.04, 0.01, 'cm'],
  ['tFila2X', 'interior', 'Tres filas', null, 'Fila 2: caderas detrás de las del piloto', 0.60, 0.85, 0.01, 'cm'],
  ['tFila3X', 'interior', 'Tres filas', null, 'Fila 3: caderas detrás de las de la fila 2', 0.55, 0.80, 0.01, 'cm'],
  ['tRecFila', 'interior', 'Tres filas', null, 'Reclinado de las filas 2 y 3', -5, 35, 1, '°'],
  ['tMOcc', 'interior', 'Masas', null, 'Masa por ocupante', 50, 110, 1, 'kg'],
  ['tMAsiento', 'interior', 'Masas', null, 'Un asiento (sillín y respaldo)', 1.5, 5.5, 0.5, 'kg'],
  ['tChD', 'chasis', 'Bastidor', null, 'Tubos: diámetro', 30, 60, 1, 'mm'],
  ['tChT', 'chasis', 'Bastidor', null, 'Tubos: pared', 1.2, 3.6, 0.1, 'mm'],
  ['tChUniones', 'chasis', 'Bastidor', null, 'Uniones, chapas y tornillería', 1, 6, 0.5, 'kg'],
  ['tBatalla', 'rodaje', 'Ejes y ruedas', 'bBatalla', '', 2.20, 3.20, 0.01, 'm'],
  ['tEjeDel', 'rodaje', 'Ejes y ruedas', null, 'Eje delantero: atrasado', 0, 0.45, 0.01, 'cm'],
  ['tVia', 'rodaje', 'Ejes y ruedas', null, 'Vía delantera', 1.40, 2.40, 0.01, 'm'],
  // four wheels (2026-11-11): its real minimum is the narrowest track whose rear pods clear the tail (`viaTraseraMinima`)
  ['tViaTras', 'rodaje', 'Ejes y ruedas', null, 'Vía trasera', 0.80, 2.40, 0.01, 'm'],
  ['tGiro', 'rodaje', 'Suspensión y dirección', null, 'Giro máximo de la dirección', 18, 38, 1, '°'],
  ['tRecDel', 'rodaje', 'Suspensión y dirección', null, 'Recorrido de la suspensión delantera', 50, 110, 5, 'mm'],
  ['tRecTras', 'rodaje', 'Suspensión y dirección', null, 'Recorrido de la suspensión trasera', 50, 110, 5, 'mm'],
  ['tBasculante', 'rodaje', 'Suspensión y dirección', null, 'Basculante trasero: largo', 0.40, 0.60, 0.01, 'm'],
  ['tMRueda', 'rodaje', 'Masas', null, 'Una rueda con neumático', 3, 6, 0.1, 'kg'],
  ['tMFreno', 'rodaje', 'Masas', null, 'Un freno de disco con pinza', 0.6, 1.8, 0.1, 'kg'],
  ['tMSuspDel', 'rodaje', 'Masas', null, 'Suspensión delantera (las dos)', 5, 13, 0.5, 'kg'],
  ['tMSuspTras', 'rodaje', 'Masas', null, 'Basculante y amortiguador trasero', 4, 8, 0.5, 'kg'],
  ['tMDir', 'rodaje', 'Masas', null, 'Dirección: columna, cremallera y bieletas', 3, 6, 0.5, 'kg'],
  ['tKWNom', 'propulsion', 'Motor', null, 'Potencia nominal', 2, 30, 0.5, 'kW'],
  ['tKWPico', 'propulsion', 'Motor', null, 'Potencia máxima', 5, 60, 0.5, 'kW'],
  ['tMMotor', 'propulsion', 'Motor', null, 'Motor de buje', 5, 62, 0.5, 'kg'],
  ['tMInversor', 'propulsion', 'Motor', null, 'Controlador (inversor)', 1.4, 14, 0.1, 'kg'],
  ['tVel', 'propulsion', 'Motor', null, 'Velocidad de cálculo', 40, 120, 5, 'km/h'],
  ['tKWh', 'energia', 'Batería', null, 'Batería', 5, 30, 0.5, 'kWh'],
  ['tWhKg', 'energia', 'Batería', null, 'Densidad del paquete (masa)', 120, 200, 5, 'Wh/kg'],
  ['tWhL', 'energia', 'Batería', null, 'Densidad del paquete (volumen)', 160, 300, 5, 'Wh/L'],
  ['tMVarios', 'energia', 'Varios', null, 'Varios: cargador, cables, luces, 12 V', 6, 18, 1, 'kg'],
  ['tSolarM2', 'energia', 'Techo solar', null, 'Paneles solares: masa por m²', 1.2, 3.5, 0.1, 'kg/m²'],
];
let FICHAS: FichaTriciclo[] | null = null;
/**
 * The Triciclo's sliders: ONE table, read by the page (Aeromovil.tsx) and by the
 * tunnel's improvement options (tunel/explicaciones.ts). Built on first use: the
 * shape rows read the Cuadriciclo en rombo's table, and a module cycle through
 * geometria.ts must not find it half-built.
 */
export function deslizadoresTriciclo(): FichaTriciclo[] {
  return FICHAS ?? (FICHAS = FILAS.map(([clave, dep, bloque, bala, n, min, max, paso, unidad]) => {
    const b = bala ? DESLIZADORES_BALA.find(f => f.clave === bala)! : null, propio = min !== 0 || max !== 0;
    const f = b ? (propio ? { n: b.n, min, max, paso } : { n: b.n, min: b.min, max: b.max, paso: b.paso }) : { n, min, max, paso };
    // the editor's sliders put the default in the middle; where this vehicle's default is not the middle of the range, the whole range shows instead
    return { clave, dep, bloque, ...f, unidad, centrar: Math.abs(TRICICLO_DEFECTO[clave] - (f.min + f.max) / 2) < 1e-6 * (f.max - f.min), ...(DESDE_EJE[clave] ? { desde: DESDE_EJE[clave] } : {}) };
  }));
}
/**
 * The shape's lengths along the car are stored as the Cuadriciclo en rombo's, measured from
 * where ITS front wheel is (x = 0), so that the defaults give its body exactly.
 * The Triciclo's own front axle is `tEjeDel` further back: these sliders show
 * and take their value from that axle, so «al eje delantero» is true for this
 * vehicle (+1: ahead of the axle, the nose; −1: behind it).
 */
const DESDE_EJE: Partial<Record<ClaveNumTriciclo, 1 | -1>> = { tMorro: 1, tCupIni: -1, tCupFin: -1, tPilX: -1, tPasX: -1, tBatalla: -1, tSolar: -1, tPilar: -1 };
/** What a slider shows: its value and range from the Triciclo's front axle. */
export function vistaTriciclo(f: FichaTriciclo, T: CamposTriciclo): { valor: number; min: number; max: number; defecto: number } {
  const [a, b] = rangoTriciclo(f.clave, T), d = (f.desde ?? 0) * limitarTriciclo('tEjeDel', T);
  return { valor: limitarTriciclo(f.clave, T) + d, min: a + d, max: b + d, defecto: TRICICLO_DEFECTO[f.clave] + d };
}
/** The stored value for what a slider shows. */
export const guardarTriciclo = (f: FichaTriciclo, v: number, T: CamposTriciclo) => v - (f.desde ?? 0) * limitarTriciclo('tEjeDel', T);
export const fichaTriciclo = (k: ClaveNumTriciclo) => deslizadoresTriciclo().find(f => f.clave === k);
const ruedas = (l: RuedaTriciclo[]) => l.map(k => ({ k, n: RUEDAS_TRICICLO[k].n }));
export const SELECTORES_TRICICLO: SelectorTriciclo[] = [
  { clave: 'tVentanas', n: 'Cúpula', dep: 'carroceria', bloque: 'Techo solar y ventanas', opciones: [{ k: 'marco', n: 'Ventanas laterales con montante (Aptera)' }, { k: 'burbuja', n: 'De una pieza (como el Cuadriciclo en rombo)' }] },
  { clave: 'tAsientos', n: 'Asientos', dep: 'interior', bloque: 'Asientos', opciones: [{ k: 'horcajadas', n: 'A horcajadas (2 plazas)' }, { k: 'filas', n: 'Tres filas: 1 + 2 + 1 (4 plazas)' }] },
  { clave: 'tFila2', n: 'Fila 2 (dos asientos juntos)', dep: 'interior', bloque: 'Tres filas', opciones: [{ k: 'abierta', n: 'Abierta: dos pasajeros' }, { k: 'plegada', n: 'Plegada: maletero' }] },
  { clave: 'tFila3', n: 'Fila 3 (un asiento pequeño)', dep: 'interior', bloque: 'Tres filas', opciones: [{ k: 'abierta', n: 'Abierta: un pasajero' }, { k: 'plegada', n: 'Plegada: maletero' }] },
  { clave: 'tMatCarenado', n: 'Material de la carrocería', dep: 'carroceria', bloque: 'Material y espesores', opciones: [{ k: 'carbonoLino', n: 'Carbono-lino' }, { k: 'vidrio', n: 'Fibra de vidrio' }, { k: 'carbono', n: 'Fibra de carbono' }] },
  { clave: 'tChMat', n: 'Material de los tubos', dep: 'chasis', bloque: 'Bastidor', opciones: [{ k: 'al6061', n: 'Aluminio 6061-T6' }, { k: 'cromoly', n: 'Acero cromoly 4130' }, { k: 'carbono', n: 'Tubo de carbono' }] },
  { clave: 'tRuedaDel', n: 'Ruedas delanteras (en los carenados)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['16', '20', '24', '26', '28', 'c13', 'c14', 'c15']) },
  { clave: 'tRuedaTras', n: 'Rueda trasera (dentro de la cola)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['20', '24', '26', '28', 'c13', 'c14', 'c15']) },
  { clave: 'tTraseras', n: 'Ruedas traseras', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: [{ k: 'una', n: 'Una en la cola (triciclo)' }, { k: 'dos', n: 'Dos en carenados (cuatro ruedas)' }] },
];

// ------------------------------------------------------------------ tres filas (round three, 2026-11-11)
/**
 * Eugenio: «Permite que la altura libre sobre el suelo sea mucho mayor… añade asientos para los pasajeros que sean
 * dobles… pegaditos… 3 filas, la del piloto, que solo tiene un asiento, la de los pasajeros del centro, que tienen 2
 * asientos dobles, y luego… un asiento individual un poco más pequeño… que todo eso se pueda plegar para poder luego
 * tener maletero grande… y que se abra también el maletero».
 *
 * Up to SUELO_RIGIDO (15.8 cm, the old maximum) the clearance slider moves only the belly, as before. Above it the
 * body is drawn at 15.8 cm and lifted rigidly by the rest (`elevar`): skin, canopy, floor, frame, battery, seats and
 * riders all rise together; the wheels and their pods stay on the road and the arms and the swing arm tilt to
 * reach them. So every saved design (all ≤ 15.8 cm) is built exactly as before.
 */
export const SUELO_RIGIDO = 0.158;
export const elevarDe = (suelo: number) => Math.max(0, suelo - SUELO_RIGIDO);
/**
 * The seats of «tres filas» (car-style: cushion and backrest; m). A design proposal, not a product: sized on
 * ordinary car seats (a rear bench place is 44–48 cm wide), the third one smaller as asked. Row 2's two seats
 * sit 4 cm apart, their centres `Z_FILA2` off the centre line: 49 cm between the two passengers' centres is the
 * shoulder breadth of an average man (bideltoid 49 cm, ANSUR II 2012), so their shoulders just touch.
 */
export const ASIENTOS_FILAS = {
  piloto: { ancho: 0.46, fondo: 0.46, respaldo: 0.60 },
  fila2: { ancho: 0.45, fondo: 0.44, respaldo: 0.56 },
  fila3: { ancho: 0.40, fondo: 0.38, respaldo: 0.48 },
} as const;
export const Z_FILA2 = 0.245;
/** How far each foot goes from its passenger's centre line (m): row 2's close together (the belly curves up outside them), row 3's apart, outside the rails. */
const PIES_FILA2 = 0.04, PIES_FILA3 = 0.18;
/** A seat's pan: its cushion's underside this far below its top (m; a thin shell and pad, as a sports seat). */
export const PAN_ASIENTO = 0.06;
/** Half the shoulder breadth of an average man (m): the outer shoulder of a row-2 passenger is `Z_FILA2` + this. */
export const MEDIO_HOMBRO = 0.245;
/**
 * The body's width with three rows: at least this (m). At shoulder height the canopy is narrower than the body's
 * widest point (it curves in towards the top); 1.16 m gives the two outer shoulders of row 2 their 2 cm with the
 * default three-row canopy (`ALTO_FILAS`). A lower or shorter canopy can still pinch them: the check «Hombros de la fila 2» says so.
 */
export const ANCHO_FILAS = 1.16;
/**
 * The canopy's top with three rows: at least this (m). Measured on this model: with the canopy stretched back over
 * row 3 the crest moves back, and the default 1.452 m leaves the tall man's head (p95) 4 cm into the glass over the
 * pilot and row 3; 1.56 m gives every head its 3 cm (row 3, the tightest, 3.7 cm).
 */
export const ALTO_FILAS = 1.56;
/** From row 3's hips back to its backrest's rear face, plus 3 cm of air to the shock tower (m). */
const RESPALDO_FILA3 = 0.22;
/** The canopy ends at least this far behind row 3's hips (m), so that its falling line still clears that head. */
const CUPULA_TRAS_FILA3 = 0.62;
/** Row 3's hips behind where the Cuadriciclo en rombo's front wheel is (m, positive backwards). */
export const distanciaFila3 = (T: CamposTriciclo) => limitarTriciclo('tPilX', T) + limitarTriciclo('tFila2X', T) + limitarTriciclo('tFila3X', T);

/** Los parámetros del Triciclo de un diseño: lo guardado (si es del tipo correcto y, en los selectores, una opción que existe) y lo que falte, el de por defecto. */
export function camposTriciclo(P: Partial<Parametros>): CamposTriciclo {
  const o = { ...TRICICLO_DEFECTO } as Record<string, unknown>;
  for (const k of Object.keys(TRICICLO_DEFECTO) as ClaveTriciclo[]) {
    const v = (P as Record<string, unknown>)[k], ref = TRICICLO_DEFECTO[k];
    if (typeof ref === 'number') { if (typeof v === 'number' && Number.isFinite(v)) o[k] = v; continue; }
    const sel = SELECTORES_TRICICLO.find(s => s.clave === k);
    if (typeof v === 'string' && sel?.opciones.some(x => x.k === v)) o[k] = v;
  }
  // a design saved without a rear track (every one before the «Cuadriciclo Bala clásico») takes its front one
  const vt = (P as Record<string, unknown>).tViaTras;
  if (!(typeof vt === 'number' && Number.isFinite(vt))) o.tViaTras = o.tVia;
  return o as unknown as CamposTriciclo;
}

/**
 * El rango de un deslizador para estos parámetros. Cuatro dependen de otro: la
 * cúpula acaba al menos 25 cm por delante del eje trasero y el pasajero va entre
 * 40 y 62 cm detrás del piloto (los dos, como en el Cuadriciclo en rombo); la potencia
 * máxima no baja de la nominal; y el carenado pequeño no puede ser además
 * estrecho ni corto (el neumático dejaría de caber).
 */
export function rangoTriciclo(k: ClaveNumTriciclo, T: CamposTriciclo): [number, number] {
  const f = fichaTriciclo(k)!;
  // round three (2026-11-11): three rows need room. Only with that layout; astride, every range is as before.
  if (T.tAsientos === 'filas') {
    // the two seats of row 2 side by side need width at shoulder height, under the canopy's curve (see ANCHO_FILAS)
    if (k === 'tAncho') return [Math.max(f.min, ANCHO_FILAS), f.max];
    if (k === 'tAlto') return [Math.max(f.min, ALTO_FILAS), f.max];
    // row 3's backrest ahead of the rear shock tower, and the canopy long enough to cover row 3's head
    if (k === 'tBatalla') return [Math.min(f.max, Math.max(f.min, distanciaFila3(T) + RESPALDO_FILA3 + limitarTriciclo('tBasculante', T) - 0.01)), f.max];
    // and the rows only as far back as the longest wheelbase still leaves row 3 ahead of the shock tower. The order
    // breaks the circle: row 3 reads the swing arm as stored (in its own range), the swing arm reads row 3 limited.
    if (k === 'tFila2X' || k === 'tFila3X' || k === 'tBasculante') {
      const sitio = fichaTriciclo('tBatalla')!.max + 0.01 - RESPALDO_FILA3 - limitarTriciclo('tPilX', T);
      const bas = (() => { const b = fichaTriciclo('tBasculante')!; return Math.min(b.max, Math.max(b.min, T.tBasculante)); })();
      const hi = k === 'tFila2X' ? sitio - bas - fichaTriciclo('tFila3X')!.min
        : k === 'tFila3X' ? sitio - bas - limitarTriciclo('tFila2X', T)
          : sitio - limitarTriciclo('tFila2X', T) - limitarTriciclo('tFila3X', T);
      const top = Math.min(f.max, hi);
      return [Math.min(f.min, top), top];
    }
    if (k === 'tCupFin') {
      const b = limitarTriciclo('tBatalla', T), hi = Math.min(f.max, b - 0.25);
      return [Math.min(hi, Math.max(Math.min(f.min, b - 0.45), distanciaFila3(T) + CUPULA_TRAS_FILA3)), hi];
    }
  }
  if (k === 'tCupFin') return [Math.min(f.min, T.tBatalla - 0.45), Math.min(f.max, T.tBatalla - 0.25)];
  if (k === 'tPasX') return [Math.max(f.min, T.tPilX + 0.40), Math.min(f.max, T.tPilX + 0.62)];
  // the solar roof starts anywhere from over the pilot's knees to 10 cm behind the canopy's end (there: no panel)
  if (k === 'tSolar') return [f.min, Math.min(f.max, limitarTriciclo('tCupFin', T) + 0.10)];
  if (k === 'tKWPico') return [Math.max(f.min, T.tKWNom), f.max];
  // four wheels (2026-11-11): the rear track from the narrowest whose pods clear the tail by 3 cm to the front track's maximum
  if (k === 'tViaTras') { const hi = fichaTriciclo('tVia')!.max; return [Math.min(hi, Math.max(f.min, viaTraseraMinima(T))), hi]; }
  // round two (2026-11-10): the motor and its controller weigh what their power asks for, so a 60 kW motor
  // cannot weigh 8 kg. Hub motors on sale run from about 0.45 kg/kW of peak power (car in-wheel motors:
  // Elaphe M700, 34 kg for 75 kW) to 0.9 (moped hubs); controllers 0.08–0.2 kg/kW. Estimates, not measured.
  if (k === 'tMMotor' || k === 'tMInversor') {
    const p = limitarTriciclo('tKWPico', T);
    // four wheels (2026-11-11): two hub motors of half the power each, by the same rule; the slider is both together
    if (k === 'tMMotor' && T.tTraseras === 'dos') return [Math.max(f.min, 2 * (3 + 0.45 * p / 2)), Math.min(f.max, 2 * (8 + 0.9 * p / 2))];
    return k === 'tMMotor' ? [Math.max(f.min, 3 + 0.45 * p), Math.min(f.max, 8 + 0.9 * p)] : [Math.max(f.min, 1 + 0.08 * p), Math.min(f.max, 2 + 0.2 * p)];
  }
  // a lower belly lets the saddles come down with it (never closer than today's to the rails)
  if (k === 'tPilY' || k === 'tPasY') {
    const baja = Math.min(0, limitarTriciclo('tSuelo', T) - TRICICLO_DEFECTO.tSuelo);
    return [Math.max(f.min, (k === 'tPilY' ? 0.38 : 0.42) + baja), f.max];
  }
  // a smaller pod is also a narrower one: below 82 % of the drawn width in all, the tyre no longer fits inside
  const esc = Math.min(fichaTriciclo('tPodEsc')!.max, Math.max(fichaTriciclo('tPodEsc')!.min, T.tPodEsc));
  if (k === 'tPodAncho') return [Math.max(f.min, 0.82 / esc), f.max];
  // and a shorter one: its tail must still reach past the back of the tyre
  if (k === 'tPodCola') return [Math.max(f.min, 0.70 / esc), f.max];
  return [f.min, f.max];
}
/**
 * «Largo total» (round two, 2026-11-10: «hazlo un poco más grande»): one slider that stretches the body
 * without scaling the people. The length is nose + wheelbase + tail; moving it shares the change among the
 * three in proportion to the room each still has towards that end, so it is continuous and reaches both ends.
 * The canopy's end goes back with the rear axle (the tail keeps its line) and the riders stay where they are.
 * It writes those four fields: there is no stored «largo» of its own, so a saved design is unaffected.
 */
export const PARTES_LARGO = ['tMorro', 'tBatalla', 'tCola'] as const;
export function largoTriciclo(T: CamposTriciclo): { valor: number; min: number; max: number } {
  let valor = 0, min = 0, max = 0;
  for (const k of PARTES_LARGO) { const [a, b] = rangoTriciclo(k, T); valor += limitarTriciclo(k, T); min += a; max += b; }
  return { valor, min, max };
}
export function estirarTriciclo(T: CamposTriciclo, largo: number): Partial<CamposTriciclo> {
  const ahora = largoTriciclo(T), d = Math.min(ahora.max, Math.max(ahora.min, largo)) - ahora.valor;
  if (Math.abs(d) < 1e-9) return {};
  const sitio = PARTES_LARGO.map(k => { const [a, b] = rangoTriciclo(k, T), v = limitarTriciclo(k, T); return d > 0 ? b - v : v - a; });
  const total = sitio.reduce((s, v) => s + v, 0); if (total <= 0) return {};
  const o: Partial<CamposTriciclo> = {};
  PARTES_LARGO.forEach((k, i) => { o[k] = Math.round((limitarTriciclo(k, T) + d * sitio[i] / total) * 1e4) / 1e4; });
  o.tCupFin = Math.round((limitarTriciclo('tCupFin', T) + (o.tBatalla! - limitarTriciclo('tBatalla', T))) * 1e4) / 1e4;
  return o;
}
/** Un valor dentro de su rango (un diseño escrito a mano o de otra versión no puede construir un triciclo imposible). */
export const limitarTriciclo = (k: ClaveNumTriciclo, T: CamposTriciclo) => { const [a, b] = rangoTriciclo(k, T); return Math.min(b, Math.max(a, T[k])); };

// ------------------------------------------------------------------ medidas
/** Holgura mínima del carenado delantero, girado a tope, a la carrocería (m): la vía nunca deja menos. */
const HUECO_GIRO = 0.03;
/** Ackermann: el ángulo de la rueda de fuera cuando la de dentro gira `di` (rad), con batalla L y vía t. */
export const anguloFuera = (di: number, L: number, t: number) => Math.atan(L / (L / Math.tan(di) + t));

/** La forma, con los valores ya en su rango y la vía subida si el carenado girado no cabe. */
export function medidasTriciclo(T: CamposTriciclo) {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  const wDel = RUEDAS_TRICICLO[T.tRuedaDel], wTras = RUEDAS_TRICICLO[T.tRuedaTras], rDel = wDel.d / 2, rTras = wTras.d / 2;
  const suelo = L('tSuelo'), elevar = elevarDe(suelo);
  const D: DimBala = {
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo, ...(elevar > 0 ? { elevar } : {}),
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    // the Cuadriciclo en rombo's «front and rear» wheel is our rear one; its «lateral» wheels, our front ones
    rDel: rTras, rLat: rDel, anchoNeu: wTras.neuTras, anchoNeuLat: wDel.neuDel, via: L('tVia'),
    xLat: -L('tEjeDel'), pod: { esc: L('tPodEsc'), ancho: L('tPodAncho'), cola: L('tPodCola') }, cuerdaBrazo: L('tBrazo'),
  };
  let F = crearForma(D);
  const giro = L('tGiro') * Math.PI / 180;
  // the pods only move sideways with the track: the gap grows by half of what the track grows
  const hueco = huecoGiro(F, giro);
  if (hueco < HUECO_GIRO) F = crearForma({ ...D, via: Math.ceil((D.via + 2 * (HUECO_GIRO - hueco)) * 100) / 100 });
  // the seats rise with the lifted body (`+ 0` without a lift: the same numbers)
  const asientos: Asientos = { xPiloto: -L('tPilX'), yPiloto: L('tPilY') + elevar, xPasajero: -L('tPasX'), yPasajero: L('tPasY') + elevar };
  // four wheels (2026-11-11): the rear pods, as the front ones but round the rear wheels at the rear axle
  const traseras = T.tTraseras === 'dos' ? formaTrasera(F, rTras, wTras.neuTras, L('tViaTras')) : null;
  return { D: F.D, F, asientos, aleta: L('tAleta') + elevar, viaPedida: D.via, giro, elevar, traseras };
}

// ------------------------------------------------------------------ cuatro ruedas (2026-11-11)
/**
 * Eugenio: «Haz un vehículo igual que el triciclo bala, pero esta vez que tenga 4 ruedas… con las mismas medidas».
 * The «Cuadriciclo Bala clásico» is a Triciclo with `tTraseras: 'dos'`: the same body to the last vertex, the same front
 * pods, and instead of the one wheel in the tail, two rear wheels in pods mirroring the front ones (outboard, the
 * same skin, the same two faired arms from the body) that do not steer.
 *
 * The rear pods are drawn and measured by the very code of the front ones (balaMedidas.ts `podDe`, `brazosDe`,
 * geometriaBala.ts `carenadoCuerpo`, `neumaticoCarenado`, balaPiezas.ts `carenados`), handed a VIEW of the shape
 * in which the «wheel in a pod» is the rear one: its axle at the rear axle, its radius and tyre, the rear track.
 * The body's functions (ladoZ, sec…) are the same closures, so the view sees the same body. The tail sweeps up at
 * the rear axle: there the arms meet the body above its belly (`vientreBrazos`).
 */
export function formaTrasera(F: FormaBala, r: number, neu: number, via: number): FormaBala {
  const x = -F.BATALLA, s = F.seccionRapida(x); let yb = Infinity; for (let j = 1; j < s.length; j += 2) yb = Math.min(yb, s[j]);
  const vientre = Number.isFinite(yb) ? yb : F.D.suelo;
  return { ...F, X_LAT: x, R_LAT: r, ANCHO_NEU_LAT: neu, VIA_LAT: via, D: { ...F.D, xLat: x, rLat: r, anchoNeuLat: neu, via, vientreBrazos: vientre } };
}
/** One cached body per shape (the rear track's minimum asks for it on every slider read). */
let cacheMinima: { clave: string; v: number } | null = null;
/**
 * The narrowest rear track (m, to the cm) whose rear pods leave 3 cm to the body (as the Cuadriciclo en rombo's laterals):
 * the pods' inner face against the tail at the rear axle, all along the pod and up its height.
 */
export function viaTraseraMinima(T: CamposTriciclo): number {
  const Tsin = { ...T, tTraseras: 'una' as const };
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, Tsin);
  const clave = JSON.stringify([T.tRuedaDel, T.tRuedaTras, ...(['tBatalla', 'tMorro', 'tCola', 'tAncho', 'tAlto', 'tSuelo', 'tCupIni', 'tCupFin', 'tPuntaMorro', 'tPuntaCola', 'tPodEsc', 'tPodAncho', 'tPodCola', 'tBrazo', 'tEjeDel'] as ClaveNumTriciclo[]).map(L)]);
  if (cacheMinima?.clave === clave) return cacheMinima.v;
  const wDel = RUEDAS_TRICICLO[T.tRuedaDel], wTras = RUEDAS_TRICICLO[T.tRuedaTras], suelo = L('tSuelo'), elevar = elevarDe(suelo);
  const F = crearForma({
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo, ...(elevar > 0 ? { elevar } : {}),
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    rDel: wTras.d / 2, rLat: wDel.d / 2, anchoNeu: wTras.neuTras, anchoNeuLat: wDel.neuDel, via: 1.8,
    xLat: -L('tEjeDel'), pod: { esc: L('tPodEsc'), ancho: L('tPodAncho'), cola: L('tPodCola') }, cuerdaBrazo: L('tBrazo'),
  });
  // with the track at 0 the clearance is minus the widest reach of body + pod; the track adds half of itself
  const h0 = carenadoCuerpo(formaTrasera(F, wTras.d / 2, wTras.neuTras, 0));
  const v = Math.ceil(2 * (HUECO_CARENADO - h0) * 100 - 1e-6) / 100;
  cacheMinima = { clave, v };
  return v;
}

/**
 * Lo que queda (m) entre el carenado delantero girado `giro` (rad) hacia la
 * carrocería y la piel, en el peor lado. Cada carenado gira con su rueda
 * alrededor de un eje vertical por el centro de la rueda (como en el Aptera); al
 * girar, su cola entra hacia la carrocería por un lado y su morro por el otro.
 * Se recorre su contorno en planta a 10 alturas y en los dos sentidos.
 */
export function huecoGiro(F: FormaBala, giro: number): number {
  const POD = podDe(F), ancho = semiAncho(POD), zp = F.VIA_LAT / 2; let h = 9;
  for (const g of [giro, -giro]) {
    const c = Math.cos(g), s = Math.sin(g);
    for (let i = 0; i <= 30; i++) {
      const xr = POD[0].x + (POD[POD.length - 1].x - POD[0].x) * i / 30, alt = alturasPod(POD, xr); if (!alt) continue;
      for (let j = 1; j < 10; j++) {
        const y = alt[0] + (alt[1] - alt[0]) * j / 10, w = ancho(xr, y); if (w <= 0) continue;
        // the pod's inner face (towards the body), turned about the wheel's centre
        const zl = -w, xg = F.X_LAT + xr * c - zl * s, zg = zp + xr * s + zl * c;
        const zb = F.ladoZ(xg, y); if (!Number.isFinite(zb)) continue;
        h = Math.min(h, zg - zb);
      }
    }
  }
  return h;
}

// ------------------------------------------------------------------ ocupantes
/**
 * El maniquí sentado con el respaldo reclinado `rec` grados (+ hacia atrás), como
 * en el Aeromóvil 1: el tronco se inclina entero y la cabeza un tercio (el cuello
 * la endereza). Cadera 10,8 cm sobre el sillín, hombros 50 cm por el tronco y la
 * cabeza 20 cm más allá por el cuello: con la talla media y el tronco erguido son
 * los 91,8 cm sentado del percentil 50 (ANSUR II), como en el Cuadriciclo en rombo.
 * Manos en los puños (piloto) o en el asidero (pasajero); pies en las plataformas
 * o en los estribos. `escala` 1 es la talla media.
 */
export function puntosTriciclo(F: FormaBala, S: Asientos, piloto: boolean, rec: number, man: [number, number], pies: [number, number], escala = 1): PuntosOcupante {
  const R = rec * Math.PI / 180, RH = R * 0.35;
  const d: [number, number] = [-Math.sin(R), Math.cos(R)], dh: [number, number] = [-Math.sin(RH), Math.cos(RH)];
  const xH = piloto ? S.xPiloto : S.xPasajero, yS = piloto ? S.yPiloto : S.yPasajero;
  const H: [number, number] = [xH, yS + CADERA_SOBRE_ASIENTO * escala];
  const Sh: [number, number] = [H[0] + d[0] * 0.5 * escala, H[1] + d[1] * 0.5 * escala];
  const C: [number, number] = [Sh[0] + dh[0] * 0.2 * escala, Sh[1] + dh[1] * 0.2 * escala];
  const dxPil = S.xPiloto - ASIENTO.xPiloto, dxPas = S.xPasajero - ASIENTO.xPasajero, kz = Math.min(1, F.kW);
  const Fp: [number, number] = piloto ? [-0.52 + dxPil + pies[0], 0.235 + F.dSuelo + F.elevar + pies[1]] : [-1.30 + dxPas, 0.29 + F.dSuelo + F.elevar];
  const K = rodilla(H, Fp, 0.45 * escala, 0.47 * escala);
  const mano: [number, number] = piloto ? [-0.592 + man[0], 0.870 + F.dSuelo + F.elevar + man[1]] : [-1.45 + dxPas, 0.505 + (S.yPasajero - ASIENTO.yPasajero)];
  const kb = escalaManillar(F, man);
  return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: piloto ? 0.265 * kb : 0.19 * kz, anchoPiernas: piloto ? [0.13, 0.15 * kz] : [0.17, 0.20 * kz] };
}
/**
 * A passenger of «tres filas» (round three) on a car-style seat: the trunk and head as the astride riders
 * (`puntosTriciclo`), the feet forward on the floor (`yPiso`, heel down, ankle 7 cm up), 60 cm ahead of the hips
 * (under the seat in front, as in a car), the knees where the legs put them, the hands on the thighs.
 */
export function puntosFila(xH: number, yS: number, rec: number, yPiso: number, escala = 1, pies = 0.10): PuntosOcupante {
  const R = rec * Math.PI / 180, RH = R * 0.35;
  const d: [number, number] = [-Math.sin(R), Math.cos(R)], dh: [number, number] = [-Math.sin(RH), Math.cos(RH)];
  const H: [number, number] = [xH, yS + CADERA_SOBRE_ASIENTO * escala];
  const Sh: [number, number] = [H[0] + d[0] * 0.5 * escala, H[1] + d[1] * 0.5 * escala];
  const C: [number, number] = [Sh[0] + dh[0] * 0.2 * escala, Sh[1] + dh[1] * 0.2 * escala];
  const Fp: [number, number] = [xH + 0.60 * escala, yPiso + 0.07];
  const K = rodilla(H, Fp, 0.45 * escala, 0.47 * escala);
  const mano: [number, number] = [H[0] + (K[0] - H[0]) * 0.6, H[1] + (K[1] - H[1]) * 0.6 + 0.08];
  return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: 0.13, anchoPiernas: [0.09, pies] };
}
/** A seat of «tres filas»: hips x, centre z, cushion top y, its size, its recline and whether it is folded. */
export interface AsientoFila { fila: 1 | 2 | 3; x: number; z: number; y: number; ancho: number; fondo: number; respaldo: number; rec: number; plegado: boolean }
/** Who sits where (the viewer draws them, the mass and the checks count them). */
export interface Plaza { nombre: string; fila: 1 | 2 | 3; z: number; piloto: boolean; pts: PuntosOcupante; talla: (escala: number) => PuntosOcupante }

/**
 * Centro de gravedad de una persona sentada, de sus puntos: cabeza 8 %, tronco
 * 50 % (a 40 % de la cadera a los hombros), brazos 10 %, muslos 20 %, piernas y
 * pies 12 %. Reparto de Dempster (1955), redondeado.
 */
function cgOcupante(o: PuntosOcupante): [number, number] {
  const P: [number, [number, number]][] = [
    [0.08, o.C], [0.50, [o.H[0] + (o.S[0] - o.H[0]) * 0.4, o.H[1] + (o.S[1] - o.H[1]) * 0.4]],
    [0.10, [(o.S[0] + o.mano[0]) / 2, (o.S[1] + o.mano[1]) / 2]], [0.20, [(o.H[0] + o.K[0]) / 2, (o.H[1] + o.K[1]) / 2]], [0.12, [(o.K[0] + o.F[0]) / 2, (o.K[1] + o.F[1]) / 2]],
  ];
  return [P.reduce((s, [m, p]) => s + m * p[0], 0), P.reduce((s, [m, p]) => s + m * p[1], 0)];
}

// ------------------------------------------------------------------ piezas dentro
export interface Caja { nombre: string; x0: number; x1: number; y0: number; y1: number; hz: number }
/** Medio ancho de los dos largueros del bastidor (eje a eje), m. */
export const Z_LARGUERO = 0.11;
/**
 * El paquete de batería, sobre los largueros. Se llena por orden:
 *   1. un módulo ancho en el morro, donde iba la rueda delantera del Cuadriciclo en rombo (20 cm de alto);
 *   2. un módulo estrecho entre los pies del piloto, hasta 2 cm del morro de su sillín;
 * y desde la segunda versión (2026-11-10, «una batería más potente», hasta 30 kWh):
 *   3. el módulo del morro sube hasta 26 cm (por encima van la cremallera de la dirección y el salpicadero);
 *   4. el módulo del morro crece hacia la punta mientras quepa, a 1 cm de la piel;
 *   5. un módulo plano bajo los dos sillines, entre sus soportes, hasta el controlador.
 * Lo que no cabe en los cinco no se dibuja: se cuenta su masa (en el centro de lo dibujado) y la
 * comprobación «Batería: cabe en su sitio» dice cuántos litros faltan. Con un morro más largo o una
 * carrocería más ancha (el módulo del morro se ensancha con ella) cabe más; con celdas más densas, ocupa menos.
 */
function bateriaEn(F: FormaBala, T: CamposTriciclo, yBase: number, lim: { xSillin: number; ySillin: number; xFin: number }): { cajas: Caja[]; litros: number; capacidad: number } {
  const litros = limitarTriciclo('tKWh', T) * 1000 / limitarTriciclo('tWhL', T), V = litros / 1000;
  const alto = 0.20, alto2 = 0.26, partido = -0.30;
  // the nose module widens with a wider body (never narrower than today's 30 cm)
  const aF = 0.30 * Math.max(1, F.kW), aR = 0.18, aU = 0.10;
  // its front face at 12 cm ahead of the Cuadriciclo en rombo's front wheel, or further back where a low, short nose has no room there
  const cabeFrente = (x: number, h: number) => [yBase, yBase + h].every(y => [-aF / 2, aF / 2].every(z => dentroDe(F, x, y, z) > 0));
  let delante = 0.12; while (delante > partido + 0.1 && !cabeFrente(delante, alto)) delante -= 0.005;
  const Vmax = (delante - partido) * aF * alto;
  const cajas: Caja[] = [];
  if (V <= Vmax) {
    cajas.push({ nombre: 'Módulo del morro', x0: delante - V / (aF * alto), x1: delante, y0: yBase, y1: yBase + alto, hz: aF / 2 });
    return { cajas, litros, capacidad: litros };
  }
  const largoPies = Math.max(0, partido - lim.xSillin), Vpies = largoPies * aR * alto;
  if (V <= Vmax + Vpies) {
    cajas.push({ nombre: 'Módulo del morro', x0: partido, x1: delante, y0: yBase, y1: yBase + alto, hz: aF / 2 });
    cajas.push({ nombre: 'Módulo entre los pies', x0: partido - (V - Vmax) / (aR * alto), x1: partido, y0: yBase, y1: yBase + alto, hz: aR / 2 });
    return { cajas, litros, capacidad: litros };
  }
  let resto = V - Vmax - Vpies;
  // 3. the nose module taller
  const Valto = (delante - partido) * aF * (alto2 - alto), dAlto = Math.min(resto, Valto);
  const hN = alto + dAlto / ((delante - partido) * aF); resto -= dAlto;
  // 4. forward, while its front face stays 1 cm inside the skin
  let xFr = delante;
  if (resto > 0) for (let x = delante + 0.01; x < F.X_MORRO; x += 0.01) {
    let ok = true;
    for (const y of [yBase, yBase + hN]) for (const z of [-aF / 2, aF / 2]) if (dentroDe(F, x, y, z) < 0.01) ok = false;
    if (!ok) break;
    xFr = x;
  }
  const dFr = Math.min(resto, (xFr - delante) * aF * hN); resto -= dFr;
  cajas.push({ nombre: 'Módulo del morro', x0: partido, x1: delante + dFr / (aF * hN), y0: yBase, y1: yBase + hN, hz: aF / 2 });
  if (largoPies > 0) cajas.push({ nombre: 'Módulo entre los pies', x0: lim.xSillin, x1: partido, y0: yBase, y1: yBase + alto, hz: aR / 2 });
  // 5. under the saddles: from the pilot's saddle nose back to the controller, up to the saddles' frame
  const xU1 = Math.min(lim.xSillin, partido), hU = lim.ySillin - yBase, Vu = hU > 0.03 ? Math.max(0, xU1 - lim.xFin) * aU * hU : 0;
  const dU = Math.min(resto, Vu); resto -= dU;
  if (dU > 1e-6) cajas.push({ nombre: 'Módulo bajo los sillines', x0: xU1 - dU / (aU * hU), x1: xU1, y0: yBase, y1: yBase + hU, hz: aU / 2 });
  return { cajas, litros, capacidad: litros - resto * 1000 };
}

/** El modelo del Triciclo: la forma, los ocupantes, el bastidor, la batería, el motor y lo que lee el visor. */
export function crearModeloTriciclo(P: Parametros) {
  const T = camposTriciclo(P);
  const { D, F, asientos, aleta, viaPedida, giro, elevar, traseras } = medidasTriciclo(T);
  const cup = contornoCupula(F);
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  const rF = F.R_LAT, rR = F.R_DEL, xR = -F.BATALLA, via = F.VIA_LAT, xF = F.X_LAT;
  const semiPod = anchoMaxPod(F);
  // four wheels (2026-11-11): the widest of the two axles, each with its pods
  const viaTras = traseras ? traseras.VIA_LAT : 0, semiPodTras = traseras ? anchoMaxPod(traseras) : 0;
  const anchoTotal = Math.round((traseras ? Math.max(via + 2 * semiPod, viaTras + 2 * semiPodTras) : via + 2 * semiPod) * 1000) / 1000;
  const ruedas: Rueda[] = [
    { nombre: 'Rueda delantera der.', x: xF, z: via / 2, r: rF, w: F.ANCHO_NEU_LAT }, { nombre: 'Rueda delantera izq.', x: xF, z: -via / 2, r: rF, w: F.ANCHO_NEU_LAT },
    ...(traseras
      ? [{ nombre: 'Rueda trasera der.', x: xR, z: viaTras / 2, r: rR, w: F.ANCHO_NEU }, { nombre: 'Rueda trasera izq.', x: xR, z: -viaTras / 2, r: rR, w: F.ANCHO_NEU }]
      : [{ nombre: 'Rueda trasera', x: xR, z: 0, r: rR, w: F.ANCHO_NEU }]),
  ];
  const rec = { piloto: L('tRecPil'), pasajero: L('tRecPas') };
  const man: [number, number] = [-L('tManX'), L('tManY')], pies: [number, number] = [L('tPiesX'), L('tPiesY')];
  const occ = (piloto: boolean, escala = 1) => puntosTriciclo(F, asientos, piloto, piloto ? rec.piloto : rec.pasajero, man, pies, escala);

  // ── bastidor: dos largueros sobre la panza, travesaños, la cuna de la batería y la suspensión delantera, los soportes de los sillines y la torreta del amortiguador
  const dT = L('tChD') / 1000, pared = L('tChT') / 1000, mat = MATERIALES_CHASIS[T.tChMat].n;
  // the rails narrow with a narrower body (they run along the flat of the belly)
  const yL = D.suelo + 0.035 + dT / 2, zL = Z_LARGUERO * Math.min(1, F.kW);
  // three rows (round three): where rows 2 and 3 sit (their cushions at the passenger's saddle height), and the floor on the rails
  const filas = T.tAsientos === 'filas', yPiso = yL + dT / 2 + 0.02;
  const x2 = asientos.xPiloto - L('tFila2X'), x3 = x2 - L('tFila3X'), yAsiento = asientos.yPasajero;
  const xPiv = xR + L('tBasculante'), yPiv = yL + 0.03;
  const yBat = yL + dT / 2 + 0.005;
  const dyPil = asientos.yPiloto - ASIENTO.yPiloto, dyPas = asientos.yPasajero - ASIENTO.yPasajero, dxPil = asientos.xPiloto - ASIENTO.xPiloto, dxPas = asientos.xPasajero - ASIENTO.xPasajero;
  const inversor: Caja = { nombre: 'Controlador', x0: -1.86 + dxPas * 0, x1: -1.66, y0: yL + dT / 2 + 0.01, y1: yL + dT / 2 + 0.09, hz: 0.07 };
  // the battery's room: the pilot's saddle nose (2 cm), under the saddles' frame (3 cm) and ahead of the controller (2 cm)
  const bat = bateriaEn(F, T, yBat, { xSillin: -0.835 + dxPil + 0.02, ySillin: Math.min(0.335 + dyPil, 0.35 + dyPas) - 0.03, xFin: inversor.x1 + 0.02 });
  const baterias = bat.cajas;
  const yTopBat = Math.max(...baterias.map(b => b.y1));
  const yCuna = yTopBat + 0.03, xCuna = xF, zCuna = 0.18;
  const T_ = (nombre: string, a: P3, b: P3, d = dT, curva?: P3[]): Tubo => ({ nombre, grupo: 'Chasis', a, b, d, pared, material: mat, ...(curva ? { curva } : {}) });
  const tubos: Tubo[] = [];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'der.' : 'izq.';
    tubos.push(T_(`Larguero ${lado}`, [0.06, yL, s * zL], [xPiv, yL, s * zL]));
    // the cradle round the nose module: a post each side up to the top bar, on which the front suspension pivots
    tubos.push(T_(`Cuna de la batería: poste ${lado}`, [xCuna, yL, s * zL], [xCuna, yCuna, s * zCuna]));
    // the pilot's saddle and the passenger's: a post each side from the rail up to the saddle's underside
    tubos.push(T_(`Soporte del sillín del piloto ${lado}`, [-0.95 + dxPil, yL, s * zL], [-1.02 + dxPil, 0.335 + dyPil + F.dSuelo * 0, s * 0.08]));
    if (!filas) tubos.push(T_(`Soporte del sillín del pasajero ${lado}`, [-1.50 + dxPas, yL, s * zL], [-1.55 + dxPas, 0.35 + dyPas, s * 0.08]));
    else {
      // three rows (round three): a post under each seat of row 2 and a pair under row 3, from the rails to the seat's pan
      tubos.push(T_(`Soporte del asiento de la fila 2 ${lado}`, [x2 + 0.04, yL, s * zL], [x2 - 0.02, yAsiento - 0.09, s * Z_FILA2]));
      tubos.push(T_(`Soporte del asiento de la fila 3 ${lado}`, [x3 + 0.04, yL, s * zL], [x3 - 0.02, yAsiento - 0.09, s * 0.10]));
    }
    // the shock tower: from the rail at the swing-arm pivot up and back to the shock's top mount
    tubos.push(T_(`Torreta del amortiguador ${lado}`, [xPiv + 0.04, yL, s * zL], [xPiv - 0.06, yPiv + 0.26, s * 0.05]));
  }
  tubos.push(T_('Travesaño delantero', [0.06, yL, -zL], [0.06, yL, zL]));
  tubos.push(T_('Cuna de la batería: barra de arriba', [xCuna, yCuna, -zCuna], [xCuna, yCuna, zCuna]));
  tubos.push(T_('Travesaño de las plataformas', [-0.55 + dxPil + pies[0], yL, -zL], [-0.55 + dxPil + pies[0], yL, zL]));
  tubos.push(T_('Travesaño bajo los sillines', [-1.25, yL, -zL], [-1.25, yL, zL]));
  tubos.push(T_('Travesaño del basculante', [xPiv, yL, -zL], [xPiv, yL, zL]));
  if (filas) tubos.push(T_('Travesaño de la fila 2', [x2 - 0.02, yAsiento - 0.09, -(Z_FILA2 + 0.10)], [x2 - 0.02, yAsiento - 0.09, Z_FILA2 + 0.10]));
  // the steering-column support: from the cradle's top bar back and up to the steering head under the dash
  const cabeza: P3 = [-0.44 - man[0] * 0, 0.80 + F.dSuelo + elevar, 0];
  tubos.push(T_('Soporte de la columna de dirección', [xCuna, yCuna, 0], cabeza, dT, [[xCuna, yCuna, 0], [-0.22, yCuna + 0.20, 0], cabeza]));

  // ── suspensión, dirección y motor (posiciones; el visor los dibuja y la masa los cuenta por deslizador)
  const recTras = L('tRecTras') / 1000, recDel = L('tRecDel') / 1000;
  // the swing arm's legs clear the tyre by 3.5 cm (7.5 cm from the centre with the 80 mm moped tyre, as before)
  const basculante = { pivote: [xPiv, yPiv] as [number, number], eje: [xR, rR - APLASTADO_BALA] as [number, number], z: Math.max(0.075, F.ANCHO_NEU / 2 + 0.035) };
  const amortiguador = { abajo: [xR + 0.4 * (xPiv - xR), (rR + yPiv) / 2 + 0.03] as [number, number], arriba: [xPiv - 0.06, yPiv + 0.26] as [number, number] };
  const brazos = brazosDe(F);
  const cremallera = { x: -0.03, y: Math.max(0.47 + elevar, yTopBat + 0.05), z: 0.15 };
  const motor = { tipo: 'buje' as const, c: [xR, rR - APLASTADO_BALA] as [number, number], r: 0.115 * rR / 0.305, ancho: 0.10 };

  // ── techo solar y ventanas (balaMedidas.ts `ventanasDe`): on the canopy glass, the shape does not change
  const opcVentanas: OpcionesVentanas = {
    solar: L('tSolar') >= rangoTriciclo('tSolar', T)[1] - 1e-6 ? null : -L('tSolar'), alto: L('tVentAlto'),
    pilar: T.tVentanas === 'marco' ? { x: -L('tPilar'), barrido: L('tPilarBarrido'), ancho: L('tPilarAncho') } : null,
  };
  const ventanas = ventanasDe(F, cup, opcVentanas);
  const p = ventanas.panel, solar = p ? areaXT(F, p.x0, p.x1, x => [p.tLow(x), 1]) : { area: 0, x: -1.5, y: 1.2 };
  // the A-pillars and the rail frames: laminate (navy) instead of glass
  const marcoArea = areaMarco(F, bandaMarco(ventanas, cup.XC1 + 0.004));

  // ── the seats and who sits on them (round three): astride, the two riders as before; in three rows, the pilot
  // on a car-style seat with the same posture, row 2's two side by side and row 3's one, unless their row is folded
  const asientosFilas: AsientoFila[] = [];
  const plazas: Plaza[] = [
    { nombre: 'Piloto', fila: 1, z: 0, piloto: true, pts: occ(true), talla: e => occ(true, e) },
  ];
  if (!filas) plazas.push({ nombre: 'Pasajero', fila: 2, z: 0, piloto: false, pts: occ(false), talla: e => occ(false, e) });
  else {
    const A = ASIENTOS_FILAS, plegada2 = T.tFila2 === 'plegada', plegada3 = T.tFila3 === 'plegada';
    asientosFilas.push({ fila: 1, x: asientos.xPiloto, z: 0, y: asientos.yPiloto, ...A.piloto, rec: rec.piloto, plegado: false });
    const recF = L('tRecFila');
    for (const z of [Z_FILA2, -Z_FILA2]) asientosFilas.push({ fila: 2, x: x2, z, y: yAsiento, ...A.fila2, rec: recF, plegado: plegada2 });
    asientosFilas.push({ fila: 3, x: x3, z: 0, y: yAsiento, ...A.fila3, rec: recF, plegado: plegada3 });
    // the feet: forward on the floor beside the rails (row 2 under the pilot's seat, row 3 under row 2's), as low as the
    // belly's curve lets them at their outer edge (1.5 cm inside the skin, never below the belly's floor)
    const piso = (x: number, z: number, ancho: number) => {
      const zf = Math.abs(z) + ancho + 0.045; let y = D.suelo + 0.03;
      while (y < yPiso && dentroDe(F, x, y, zf) < 0.015) y += 0.005;
      return y;
    };
    const fila = (x: number, z: number, ancho: number, e = 1) => puntosFila(x, yAsiento, recF, piso(x + 0.60 + 0.09, z, ancho), e, ancho);
    if (!plegada2) for (const [z, n] of [[Z_FILA2, 'der.'], [-Z_FILA2, 'izq.']] as const) plazas.push({ nombre: `Fila 2 ${n}`, fila: 2, z, piloto: false, pts: fila(x2, z, PIES_FILA2), talla: e => fila(x2, z, PIES_FILA2, e) });
    if (!plegada3) plazas.push({ nombre: 'Fila 3', fila: 3, z: 0, piloto: false, pts: fila(x3, 0, PIES_FILA3), talla: e => fila(x3, 0, PIES_FILA3, e) });
  }

  const Lf = F.LARGO;
  const Pm: Parametros = { ...P, ...T, L: Lf, B: xF - xR, W: anchoTotal, H: D.alto + elevar, clear: D.suelo, track: via };
  return {
    tipo: 'triciclo' as const, P: Pm, campos: T, F, D, sillines: asientos, aleta, cup, viaPedida, giro, rec, man, pies,
    xn: F.X_MORRO, xt: F.X_COLA, Lf, rF, rR, rL: rF, xR, xL: xF, xF, batalla: xF - xR, anchoTotal, anchoCuerpo: D.ancho, alto: D.alto + elevar, semiPod,
    /** Round three: the rigid lift above 15.8 cm (m), the seating layout, its seats, who sits where, and the floor's height. */
    elevar, filas, asientosFilas, plazas, yPiso,
    ruedas, via: { del: via, tras: viaTras },
    /** Four wheels (2026-11-11): the rear pods' view of the shape (`formaTrasera`), or null with one rear wheel. */
    traseras, cuatro: !!traseras,
    tubos, baterias, bateriaCabe: bat.capacidad, inversor, motor, basculante, amortiguador, brazos, cremallera, cabezaDireccion: cabeza, recTras, recDel, yLarguero: yL,
    // (with two rear wheels there is no wheel under the tail to cover)
    faldon: traseras ? null : faldonDe(F, L('tFaldon'), xR, rR),
    /** The canopy's solar panel and side windows: what the 3D builder draws (`opcVentanas`), the curves, and the panel's area (m², both sides) and centre. */
    opcVentanas, ventanas, solar, marcoArea,
    /** Los maniquíes de talla media (el visor los dibuja con la función de los otros vehículos). */
    occPts: (piloto: boolean) => occ(piloto),
    occTalla: occ,
  };
}
export type ModeloTriciclo = ReturnType<typeof crearModeloTriciclo>;

/** El faldón de la rueda trasera: un carenado estrecho bajo la cola que tapa la rueda hasta `y0` del suelo (null sin faldón). */
function faldonDe(F: FormaBala, k: number, xR: number, rR: number) {
  if (!(k > 0.001)) return null;
  const vientre = F.D.suelo, y0 = vientre - (vientre - 0.04) * k;
  return { x0: xR + rR * 0.95, x1: xR - rR * 0.95, y0, hz: F.ANCHO_NEU / 2 + 0.025 };
}

// ------------------------------------------------------------------ cálculo
export interface PiezaMasa { nombre: string; kg: number; x: number; y: number }
export interface ResultadosTriciclo extends Omit<ResultadosBala, 'cabezas'> {
  /** Lo que queda sobre la cabeza de cada uno (m), sin casco: talla media y alta ('piloto', 'pasajero', 'fila 2', 'fila 3'). */
  cabezas: { quien: string; p50: number; p95: number; x: number }[];
  /** Round three: the boot (litres) now and in every state of the rows, and how many ride. */
  maletero: Maleteros;
  ocupantes: number;
  /** Masa por partes con su centro (para el centro de gravedad); los ocupantes van aparte. */
  piezas: PiezaMasa[];
  cg: { x: number; y: number; masa: number; vacio: { x: number; y: number } };
  /** Umbral de vuelco estático (g) con dos ocupantes y con el piloto solo, y lo que pesa el eje delantero. */
  vuelco: { ssf: number; ssfSolo: number; repartoDel: number };
  /** Radio de giro (m): a la rueda delantera de fuera; ángulos de las dos ruedas (°). */
  giro: { radio: number; dentro: number; fuera: number };
  /** El bastidor: momento, tensión y coeficiente de seguridad de los largueros. */
  bastidor: { M: number; tension: number; seguridad: number; metros: number };
  /** Litros y kilos del paquete; `litrosMorro`: lo que cabe en el módulo del morro a su tamaño de partida; `cabe`: los litros que caben en los cinco sitios (menos que `litros`: no cabe). */
  bateria: { litros: number; kg: number; litrosMorro: number; cabe: number };
  /** Lo que depende del Cd del túnel (null mientras calcula). */
  energia: null | { cd: number; areaRef: number; CdA: number; WhKm: number; autonomia: number; kmSol: number; vmaxNominal: number; vmaxPico: number; acel50: number; potencia: number; WhKm50: number; WhKm100: number };
}

/** Los que no llegan: 9 en una holgura que no tiene sentido (un tubo fuera de la piel, etc.). */
const dentroDe = (F: FormaBala, x: number, y: number, z: number) => {
  const zb = F.ladoZ(x, y); if (!Number.isFinite(zb)) return -0.05;
  if (y < techoEn(F, x) && y > 0) { const s = F.seccionRapida(x); let yb = Infinity; for (let j = 1; j < s.length; j += 2) yb = Math.min(yb, s[j]); if (y < yb) return y - yb; }
  return zb - Math.abs(z);
};
/** Holgura (m) de una caja a la piel: sus ocho esquinas y el centro de cada cara de abajo. */
const cajaDentro = (F: FormaBala, c: Caja) => {
  let h = 9;
  for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [-c.hz, c.hz]) h = Math.min(h, dentroDe(F, x, y, z));
  return h;
};
/** Holgura (m) de un tubo a la piel: muestreado cada 4 cm, menos su radio. */
function tuboDentro(F: FormaBala, t: Tubo): number {
  const pts = t.curva ?? [t.a, t.b]; let h = 9;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.04));
    for (let k = 0; k <= n; k++) { const u = k / n; h = Math.min(h, dentroDe(F, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u) - t.d / 2); }
  }
  return h;
}
/** Lo que queda sobre la cabeza (m): la parte de arriba y de atrás del cráneo (de 30° delante a 70° detrás), a la cara de dentro del cristal. */
function cabezaTriciclo(m: ModeloTriciclo, piloto: boolean, talla: number, esp: number) {
  const k = talla / TALLA_SENTADO.p50, o = m.occTalla(piloto, k);
  const a0 = Math.atan2(o.dh![0], o.dh![1]);   // the head's axis, from the vertical (negative: leaning back)
  let h = 9;
  for (let g = -30; g <= 70; g += 10) {
    const a = a0 - g * Math.PI / 180, x = o.C[0] + Math.sin(a) * MEDIA_CABEZA * k, y = o.C[1] + Math.cos(a) * MEDIA_CABEZA * k;
    h = Math.min(h, techoEn(m.F, x) - esp - y);
  }
  return { holgura: h, x: o.C[0] };
}

/**
 * Round three: what is left over a passenger's head off the centre line (row 2) or on it (row 3), m. The head is an
 * ellipsoid: 11 cm up and back from its centre (as `cabezaTriciclo`), 7.8 cm to each side; each of its points is
 * measured straight up to the inner face of the canopy above it, and its side to the canopy's side.
 */
function cabezaPlaza(m: ModeloTriciclo, q: Plaza, talla: number, esp: number) {
  const k = talla / TALLA_SENTADO.p50, o = q.talla(k), F = m.F, ANCHO = 0.078 * k;
  const a0 = Math.atan2(o.dh![0], o.dh![1]); let h = 9;
  for (const dz of [-1, -0.5, 0, 0.5, 1]) {
    const f = Math.sqrt(Math.max(0, 1 - (dz * 0.95) ** 2)), z = Math.abs(q.z + dz * 0.95 * ANCHO);
    for (let g = -30; g <= 70; g += 10) {
      const a = a0 - g * Math.PI / 180, x = o.C[0] + Math.sin(a) * MEDIA_CABEZA * k * f, y = o.C[1] + Math.cos(a) * MEDIA_CABEZA * k * f;
      const techo = F.arribaY(x, z); h = Math.min(h, Number.isFinite(techo) ? techo - esp - y : -0.05);
    }
  }
  const lado = F.ladoZ(o.C[0], o.C[1]); h = Math.min(h, Number.isFinite(lado) ? lado - esp - (Math.abs(q.z) + ANCHO) : -0.05);
  return { holgura: h, x: o.C[0] };
}

// ------------------------------------------------------------------ maletero (round three)
/** The boot in litres: now, and in each state of the rows (astride: one, behind the passenger). */
export interface Maleteros { ahora: number; estado: string; estados: { nombre: string; litros: number }[] }
/** Wall, lining and air between the luggage and the skin (m). */
const PARED_MALETERO = 0.02;
/**
 * The boot's volume (L) for rows 2 and 3 open or folded: the room inside the skin (2 cm in from it, up to the canopy's
 * roof) behind the pilot's backrest (astride: behind the passenger's), above the floor on the rails (on a folded seat,
 * above its folded backrest), less the space each seated passenger takes (from their toes to their backrest, as wide
 * as their seat), the rear wheel with its suspension travel, the shock tower, the battery modules and the controller.
 * A geometric volume, counted in 2 cm slices: it is not the VDA method (1-litre blocks), which gives some 15-25 % less
 * for the same shape. An estimate on this model, not a measurement.
 */
export function volumenMaletero(m: ModeloTriciclo, plegada2: boolean, plegada3: boolean): number {
  const F = m.F, P = PARED_MALETERO, paso = 0.02;
  // the front limit: the backrest of the pilot (three rows) or the passenger (astride); it leans back with its recline
  const delante = m.filas ? m.asientosFilas.find(a => a.fila === 1)! : { x: m.sillines.xPasajero, y: m.sillines.yPasajero, rec: m.rec.pasajero };
  const inicio = (y: number) => delante.x - 0.19 - Math.max(0, y - delante.y) * Math.tan(Math.max(0, delante.rec) * Math.PI / 180);
  const sentados = m.filas ? m.asientosFilas.filter(a => a.fila > 1 && !(a.fila === 2 ? plegada2 : plegada3)) : [];
  const plegados = m.filas ? m.asientosFilas.filter(a => a.fila > 1 && (a.fila === 2 ? plegada2 : plegada3)) : [];
  const xR = m.xR, rR = m.rR, piv = m.basculante.pivote;
  const cajas = [...m.baterias, m.inversor].map(c => ({ x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, z: c.hz }));
  // the rear wheel and its travel, 4 cm round; the swing arm and the shock tower above its pivot
  if (!m.cuatro) {
    cajas.push({ x0: xR - rR - 0.04, x1: xR + rR + 0.04, y0: 0, y1: 2 * rR + m.recTras + 0.04, z: F.ANCHO_NEU / 2 + 0.05 });
    cajas.push({ x0: xR, x1: piv[0] + 0.06, y0: 0, y1: piv[1] + 0.30, z: m.basculante.z + 0.04 });
  } else {
    // four wheels (2026-11-11): the wheels are outside, in their pods; inside stays the frame's tower (the frame is
    // unchanged), from 12 cm behind the pivot to 6 cm ahead of it, as wide as the swing arm's pivot tube was
    cajas.push({ x0: piv[0] - 0.12, x1: piv[0] + 0.06, y0: 0, y1: piv[1] + 0.30, z: m.basculante.z + 0.04 });
  }
  let V = 0;
  for (let y = m.yPiso + paso / 2; y < m.alto; y += paso) {
    const x0 = inicio(y);
    for (let x = x0 - paso / 2; x > F.X_COLA + 0.02; x -= paso) {
      const w = Math.min(F.ladoZ(x, y), F.ladoZ(x, y + P)) - P; if (!(w > 0.02)) continue;
      // the z-intervals taken, on the right half (the boot is symmetric)
      const fuera: [number, number][] = [];
      for (const c of cajas) if (x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1) fuera.push([0, c.z]);
      for (const a of sentados) {
        const atras = a.x - 0.19 - Math.max(0, y - a.y) * Math.tan(Math.max(0, a.rec) * Math.PI / 180);
        if (x < a.x + 0.60 + 0.20 && x > atras) fuera.push([Math.max(0, Math.abs(a.z) - a.ancho / 2 - 0.02), Math.abs(a.z) + a.ancho / 2 + 0.02]);
      }
      for (const a of plegados) if (y < a.y + 0.07 && x > a.x - 0.19 && x < a.x - 0.17 + Math.max(a.fondo, a.respaldo)) fuera.push([Math.max(0, Math.abs(a.z) - a.ancho / 2), Math.abs(a.z) + a.ancho / 2]);
      fuera.sort((p, q) => p[0] - q[0]);
      let libre = 0, z = 0;
      for (const [a, b] of fuera) { if (a > z) libre += Math.min(a, w) - z; z = Math.max(z, b); if (z >= w) break; }
      if (z < w) libre += w - z;
      V += 2 * Math.max(0, libre) * paso * paso;
    }
  }
  return V * 1000;
}
export function maleterosTriciclo(m: ModeloTriciclo): Maleteros {
  if (!m.filas) { const v = volumenMaletero(m, false, false); return { ahora: v, estado: 'detrás del pasajero', estados: [{ nombre: 'Detrás del pasajero', litros: v }] }; }
  const T = m.campos, p2 = T.tFila2 === 'plegada', p3 = T.tFila3 === 'plegada';
  const nombre = (a: boolean, b: boolean) => a && b ? 'filas 2 y 3 plegadas' : a ? 'fila 2 plegada' : b ? 'fila 3 plegada' : 'las tres filas abiertas';
  const estados = ([[false, false], [false, true], [true, false], [true, true]] as const).map(([a, b]) => ({ nombre: nombre(a, b), litros: volumenMaletero(m, a, b) }));
  return { ahora: estados.find(e => e.nombre === nombre(p2, p3))!.litros, estado: nombre(p2, p3), estados };
}

/** Masa de cada parte (kg) con su centro (x, y). */
export function piezasTriciclo(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, centros: { xPiel: number; yPiel: number; xCristal: number; yCristal: number }, pods: { area: number; areaTras?: number }): PiezaMasa[] {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = m.F;
  const kgm2 = MATERIALES_CARENADO[T.tMatCarenado].kgm2mm * L('tEspCarenado');
  const densidad = MATERIALES_CHASIS[T.tChMat].densidad;
  let kgTubos = 0, xt = 0, yt = 0;
  for (const t of m.tubos) {
    const kg = Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) * largoTubo(t) * densidad;
    kgTubos += kg; xt += kg * (t.a[0] + t.b[0]) / 2; yt += kg * (t.a[1] + t.b[1]) / 2;
  }
  const bat = L('tKWh') * 1000 / L('tWhKg');
  let vb = 0, xb = 0, yb = 0;
  for (const c of m.baterias) { const v = (c.x1 - c.x0) * (c.y1 - c.y0) * c.hz * 2; vb += v; xb += v * (c.x0 + c.x1) / 2; yb += v * (c.y0 + c.y1) / 2; }
  const ySillin = (piloto: boolean) => (piloto ? m.sillines.yPiloto : m.sillines.yPasajero) - 0.03;
  const yRF = m.rF - APLASTADO_BALA, yRR = m.rR - APLASTADO_BALA, kDel = RUEDAS_TRICICLO[T.tRuedaDel].kg, kTras0 = RUEDAS_TRICICLO[T.tRuedaTras].kg;
  if (m.cuatro) {
    // four wheels (2026-11-11): two rear wheels (as many kg each as the one was), their pods and arms (the front ones'
    // laminate), a simple suspension arm each where the swing arm was (the same slider's mass), four brakes and two
    // hub motors (the slider is both together: its range is two motors of half the power, `rangoTriciclo`)
    const kTras = 2 * kTras0, nR = 2 * kDel + kTras;
    return [
      { nombre: 'Carrocería', kg: ar.carroceria * kgm2, x: centros.xPiel, y: centros.yPiel },
      { nombre: 'Carenados y brazos delanteros', kg: pods.area * kgm2, x: m.xF, y: yRF + 0.05 },
      { nombre: 'Carenados y brazos traseros', kg: (pods.areaTras ?? 0) * kgm2, x: m.xR, y: yRR + 0.05 },
      { nombre: 'Cúpula', kg: ar.cristal * L('tEspCristal') * 1.2, x: centros.xCristal, y: centros.yCristal },
      { nombre: 'Bastidor', kg: kgTubos + L('tChUniones'), x: kgTubos ? xt / kgTubos : -1, y: kgTubos ? yt / kgTubos : 0.3 },
      { nombre: 'Suspensión delantera', kg: L('tMSuspDel'), x: m.xF, y: yRF + 0.08 },
      { nombre: 'Suspensión trasera', kg: L('tMSuspTras'), x: m.xR, y: yRR + 0.08 },
      { nombre: 'Ruedas', kg: L('tMRueda') * nR, x: (2 * kDel * m.xF + kTras * m.xR) / nR, y: (2 * kDel * yRF + kTras * yRR) / nR },
      { nombre: 'Frenos', kg: 4 * L('tMFreno'), x: (m.xF + m.xR) / 2, y: (yRF + yRR) / 2 },
      { nombre: 'Dirección', kg: L('tMDir'), x: (m.cremallera.x + m.cabezaDireccion[0]) / 2, y: (m.cremallera.y + m.cabezaDireccion[1]) / 2 },
      { nombre: 'Motores de buje (dos)', kg: L('tMMotor'), x: m.motor.c[0], y: m.motor.c[1] },
      { nombre: 'Controlador', kg: L('tMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2 },
      { nombre: 'Batería', kg: bat, x: vb ? xb / vb : 0, y: vb ? yb / vb : 0.3 },
      m.filas ? asientosFilasMasa(m, L('tMAsiento')) : { nombre: 'Asientos', kg: 2 * L('tMAsiento'), x: (m.sillines.xPiloto + m.sillines.xPasajero) / 2, y: (ySillin(true) + ySillin(false)) / 2 },
      { nombre: 'Varios', kg: L('tMVarios'), x: -1.0, y: 0.40 + F.dSuelo + m.elevar },
      ...(ar.solar > 0 ? [{ nombre: 'Paneles solares', kg: ar.solar * L('tSolarM2'), x: m.solar.x, y: m.solar.y }] : []),
    ];
  }
  const kTras = kTras0;
  return [
    { nombre: 'Carrocería', kg: ar.carroceria * kgm2, x: centros.xPiel, y: centros.yPiel },
    { nombre: 'Carenados y brazos delanteros', kg: pods.area * kgm2, x: m.xF, y: yRF + 0.05 },
    { nombre: 'Cúpula', kg: ar.cristal * L('tEspCristal') * 1.2, x: centros.xCristal, y: centros.yCristal },
    { nombre: 'Bastidor', kg: kgTubos + L('tChUniones'), x: kgTubos ? xt / kgTubos : -1, y: kgTubos ? yt / kgTubos : 0.3 },
    { nombre: 'Suspensión delantera', kg: L('tMSuspDel'), x: m.xF, y: yRF + 0.08 },
    { nombre: 'Basculante y amortiguador', kg: L('tMSuspTras'), x: (m.basculante.pivote[0] + m.xR) / 2, y: (m.basculante.pivote[1] + yRR) / 2 },
    // a car wheel weighs a multiple of the slider's moped wheel (RUEDAS_TRICICLO `kg`)
    { nombre: 'Ruedas', kg: L('tMRueda') * (2 * kDel + kTras), x: (2 * kDel * m.xF + kTras * m.xR) / (2 * kDel + kTras), y: (2 * kDel * yRF + kTras * yRR) / (2 * kDel + kTras) },
    { nombre: 'Frenos', kg: 3 * L('tMFreno'), x: (2 * m.xF + m.xR) / 3, y: (2 * yRF + yRR) / 3 },
    { nombre: 'Dirección', kg: L('tMDir'), x: (m.cremallera.x + m.cabezaDireccion[0]) / 2, y: (m.cremallera.y + m.cabezaDireccion[1]) / 2 },
    { nombre: 'Motor de buje', kg: L('tMMotor'), x: m.motor.c[0], y: m.motor.c[1] },
    { nombre: 'Controlador', kg: L('tMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2 },
    { nombre: 'Batería', kg: bat, x: vb ? xb / vb : 0, y: vb ? yb / vb : 0.3 },
    m.filas ? asientosFilasMasa(m, L('tMAsiento')) : { nombre: 'Asientos', kg: 2 * L('tMAsiento'), x: (m.sillines.xPiloto + m.sillines.xPasajero) / 2, y: (ySillin(true) + ySillin(false)) / 2 },
    { nombre: 'Varios', kg: L('tMVarios'), x: -1.0, y: 0.40 + F.dSuelo + m.elevar },
    // the panel replaces the glass there (`areasTriciclo`): laminate under it (in «Carrocería») and the panel itself
    ...(ar.solar > 0 ? [{ nombre: 'Paneles solares', kg: ar.solar * L('tSolarM2'), x: m.solar.x, y: m.solar.y }] : []),
  ];
}

/**
 * The seats of «tres filas» (round three): a car-style seat with its folding hinge weighs more than the slider's
 * saddle and backrest. Estimate, not measured: 1.5 times the slider for the pilot's and row 2's, 1.2 for row 3's
 * smaller one; folded or not, they are on board.
 */
function asientosFilasMasa(m: ModeloTriciclo, kgAsiento: number): PiezaMasa {
  let kg = 0, x = 0, y = 0;
  for (const a of m.asientosFilas) { const k = kgAsiento * (a.fila === 3 ? 1.2 : 1.5); kg += k; x += k * (a.x - 0.05); y += k * (a.y + 0.08); }
  return { nombre: 'Asientos', kg, x: x / kg, y: y / kg };
}

/** Superficie (m²) de los dos carenados delanteros y sus brazos de arriba, para su masa. */
function pielCarenados(F: FormaBala): number {
  const POD = podDe(F); let A = 0;
  for (let i = 0; i + 1 < POD.length; i++) {
    const a = POD[i], b = POD[i + 1], per = (e: typeof a) => { const h = (e.yt - e.yb) / 2, w = e.wm; return Math.PI * (3 * (h + w) - Math.sqrt((3 * h + w) * (h + 3 * w))); };
    A += (per(a) + per(b)) / 2 * Math.abs(a.x - b.x);
  }
  // (a lifted Triciclo's arms run down from the body to the pod: their length, not their span)
  const brazos = brazosDe(F).reduce((s, b) => s + 2.05 * b.cuerda * Math.hypot(Math.max(0, F.VIA_LAT / 2 - F.ladoZ(F.X_LAT + b.x, b.yCuerpo)), b.yCuerpo - b.y), 0);
  return 2 * (A + brazos);
}

/**
 * Umbral de vuelco estático (static stability factor) de un triciclo con dos
 * ruedas delante (tadpole), en g de aceleración lateral:
 *
 *     SSF = t · b / (2 · h · L)
 *
 * t vía delantera, L batalla, h altura del centro de gravedad y b su distancia
 * al eje trasero. El eje de vuelco va de una rueda delantera a la trasera; el
 * momento de la fuerza lateral m·a·h y el del peso m·g·(t/2)·(b/L) sobre ese eje
 * se igualan (la longitud del eje se va en las dos). Es (t/2)/h con la vía
 * «efectiva» a la altura del centro de gravedad: cuanto más cerca del eje
 * delantero, más vía. Sólido rígido: sin balanceo de la suspensión ni de los
 * neumáticos, que en la realidad lo bajan un 10-15 %, ni ocupantes que se inclinan.
 */
export const umbralVuelco = (t: number, b: number, h: number, L: number) => t * b / (2 * h * L);
const NUMERO: Record<number, string> = { 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro' };

/** Lo que agarra en seco un neumático de ciclomotor (μ ≈ 0,9): por debajo, en una curva vuelca antes de derrapar. */
export const AGARRE = 0.9;
/** Lo que se pide al umbral de vuelco: el agarre y un 15 % más, por lo que el cálculo rígido no ve. */
export const VUELCO_OBJETIVO = 1.05;

/**
 * Áreas, masas, centro de gravedad, vuelco, estructura y holguras. Lo que depende
 * del Cd (consumo, autonomía, velocidades) solo con `cd`: el del túnel, que se
 * calcula aparte (`energiaTriciclo`); sin él no hay cifra, nunca una inventada.
 */
export function calcularTriciclo(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, cd?: { cd: number; areaRef: number }): Resultados {
  const T = m.campos, F = m.F, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), esp = L('tEspCristal') / 1000;
  const extras = m.faldon ? [{ y0: m.faldon.y0, y1: F.D.suelo + 0.01, z: m.faldon.hz }] : [];
  const area = m.traseras ? areaFrontalBala(m, extras, [F, m.traseras]) : areaFrontalBala(m, extras);
  let vol = 0; for (let x = F.X_MORRO - 0.025; x > F.X_COLA; x -= 0.05) vol += F.areaSeccion(x, 80).area * 0.05;
  const s = pielBala(F, m.cup);
  const centros = { xPiel: s.xPiel / s.piel, yPiel: s.yPiel / s.piel, xCristal: s.cristal ? s.xCristal / s.cristal : -1, yCristal: s.cristal ? s.yCristal / s.cristal : 1 };
  const piezas = piezasTriciclo(m, ar, centros, { area: pielCarenados(F), ...(m.traseras ? { areaTras: pielCarenados(m.traseras) } : {}) });
  const masas: Record<string, number> = {}; for (const p of piezas) masas[p.nombre] = (masas[p.nombre] ?? 0) + p.kg;
  const mVeh = piezas.reduce((a, p) => a + p.kg, 0), mOcc = L('tMOcc');
  const momento = (l: PiezaMasa[]) => { const M = l.reduce((a, p) => a + p.kg, 0); return { masa: M, x: l.reduce((a, p) => a + p.kg * p.x, 0) / M, y: l.reduce((a, p) => a + p.kg * p.y, 0) / M }; };
  // everyone on board (round three: up to four; a folded row carries nobody)
  const ocupantes = m.plazas.map(q => { const [x, y] = cgOcupante(q.pts); return { nombre: q.nombre, kg: mOcc, x, y }; });
  const nOcc = ocupantes.length;
  const cg = momento([...piezas, ...ocupantes]), cgSolo = momento([...piezas, ocupantes[0]]), vacio = momento(piezas);
  const Lb = m.batalla, t = F.VIA_LAT;
  // four wheels (2026-11-11): SSF = t_eff / (2h), the track under the centre of gravity: the front and rear tracks
  // weighted by the load on each axle (the tadpole's formula is the same with a rear track of 0)
  const tTras = m.traseras ? m.traseras.VIA_LAT : 0;
  const ssf4 = (x: number, h: number) => { const b = (x - m.xR) / Lb; return (t * b + tTras * (1 - b)) / (2 * h); };
  const ssf = m.traseras ? ssf4(cg.x, cg.y) : umbralVuelco(t, cg.x - m.xR, cg.y, Lb), ssfSolo = m.traseras ? ssf4(cgSolo.x, cgSolo.y) : umbralVuelco(t, cgSolo.x - m.xR, cgSolo.y, Lb);
  const repartoDel = (cg.x - m.xR) / Lb;

  // steering: Ackermann, the turning circle to the outer front wheel
  const di = m.giro, dout = anguloFuera(di, Lb, t), radio = Lb / Math.sin(dout) + 0;

  // the frame: the two rails as one beam on two supports (the battery cradle at x = 0 and the swing-arm pivot), riders and seats on it
  const g = 9.81, apoyo = m.basculante.pivote[0], luz = m.xF - apoyo;
  const cargas: [number, number][] = !m.filas
    ? [[m.xF - m.sillines.xPiloto, (mOcc + L('tMAsiento')) * g], [m.xF - m.sillines.xPasajero, (mOcc + L('tMAsiento')) * g]]
    // three rows: each seat with its occupant (if its row is open), at its hips
    : m.asientosFilas.map(a => [m.xF - a.x, ((a.plegado ? 0 : mOcc) + L('tMAsiento') * (a.fila === 3 ? 1.2 : 1.5)) * g] as [number, number]);
  let Mmax = 0; for (const [a, Fz] of cargas) { const aa = Math.min(luz, Math.max(0, a)); Mmax = Math.max(Mmax, Fz * aa * (luz - aa) / luz); }
  // both loads together: the moment at each load point of the sum
  for (const [a0] of cargas) { let M = 0; for (const [a, Fz] of cargas) { const lo = Math.min(a, a0), hi = Math.max(a, a0); M += Fz * lo * (luz - hi) / luz; } Mmax = Math.max(Mmax, M); }
  const Dm = L('tChD'), tw = L('tChT'), W = 2 * Math.PI * (Dm ** 4 - (Dm - 2 * tw) ** 4) / (32 * Dm);   // two rails, mm³
  const tension = 2.5 * Mmax * 1000 / W, seguridad = MATERIALES_CHASIS[T.tChMat].limite / tension;
  const metros = m.tubos.reduce((a, tb) => a + largoTubo(tb), 0);

  // ── checks
  const ch: Comprobacion[] = [];
  const c = (dep: DepTriciclo | `${DepTriciclo},${DepTriciclo}`, nombre: string, holgura: number, minimo: number, mostrar?: string) => ch.push({ nombre, holgura, minimo, dep, ...(mostrar ? { mostrar } : {}) });
  const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  c('rodaje', `Vuelco: aceleración lateral que lo tumba, con ${NUMERO[nOcc] ?? nOcc} (objetivo ${fmt(VUELCO_OBJETIVO)} g)`, ssf - AGARRE, VUELCO_OBJETIVO - AGARRE, `${fmt(ssf)} g`);
  c('rodaje', 'Vuelco: con el piloto solo', ssfSolo - AGARRE, VUELCO_OBJETIVO - AGARRE, `${fmt(ssfSolo)} g`);
  let cabezas: { quien: string; p50: number; p95: number; x: number }[];
  if (!m.filas) {
    cabezas = ([true, false] as const).map(piloto => {
      const a = cabezaTriciclo(m, piloto, TALLA_SENTADO.p50, esp), b = cabezaTriciclo(m, piloto, TALLA_SENTADO.p95, esp);
      return { quien: piloto ? 'piloto' as const : 'pasajero' as const, p50: a.holgura, p95: b.holgura, x: a.x };
    });
  } else {
    // three rows: the pilot as astride (on the centre line); row 2's right seat (the left is its mirror) and row 3, off and on the centre line
    cabezas = [{ ...(() => { const a = cabezaTriciclo(m, true, TALLA_SENTADO.p50, esp), b = cabezaTriciclo(m, true, TALLA_SENTADO.p95, esp); return { p50: a.holgura, p95: b.holgura, x: a.x }; })(), quien: 'piloto' }];
    for (const q of m.plazas) if (q.fila > 1 && q.z >= 0) {
      const a = cabezaPlaza(m, q, TALLA_SENTADO.p50, esp), b = cabezaPlaza(m, q, TALLA_SENTADO.p95, esp);
      cabezas.push({ quien: q.fila === 2 ? 'fila 2' : 'fila 3', p50: a.holgura, p95: b.holgura, x: a.x });
    }
  }
  for (const k of cabezas) {
    const quien = k.quien === 'piloto' ? 'del piloto' : k.quien === 'pasajero' ? 'del pasajero' : `de la ${k.quien}`;
    c('interior,carroceria', `Cabeza ${quien} a la cúpula (talla media, sin casco)`, k.p50, 0.03);
    c('interior,carroceria', `Cabeza ${quien} a la cúpula (talla alta, sin casco)`, k.p95, 0.03);
  }
  const op = m.occPts(true);
  // the pilot's backrest against the passenger: its back face (pad 3 cm, 14 cm behind the trunk's axis) to the passenger's belly (12 cm ahead of the hips)
  if (!m.filas) {
    const oq = m.occPts(false), t0 = 0.30;
    const xRespaldo = op.H[0] + op.d[0] * t0 - op.d[1] * 0.17, yR = op.H[1] + op.d[1] * t0;
    const xVientre = oq.H[0] + oq.d[0] * Math.max(0, (yR - oq.H[1]) / oq.d[1]) + 0.12;
    c('interior', 'Respaldo del piloto al vientre del pasajero', xRespaldo - xVientre, 0.03);
    c('interior', 'Cabeza del piloto a la del pasajero', Math.hypot(op.C[0] - oq.C[0], op.C[1] - oq.C[1]) - 2 * 0.105, 0.05);
  } else {
    // three rows (round three): knees to the backrest in front (its rear face, 17 cm behind the trunk's axis; a knee is 6 cm round)
    const respaldoEn = (o: PuntosOcupante, y: number) => { const t = (y - o.H[1]) / o.d[1]; return o.H[0] + o.d[0] * t - o.d[1] * 0.17; };
    const fila2 = m.plazas.find(q => q.fila === 2 && q.z > 0), fila3 = m.plazas.find(q => q.fila === 3);
    if (fila2) c('interior', 'Rodillas de la fila 2 al respaldo del piloto', respaldoEn(op, fila2.pts.K[1]) - (fila2.pts.K[0] + 0.06), 0.02);
    // row 2's backrests stand (or lie folded, then the knees pass over them) in front of row 3
    const r2 = m.asientosFilas.find(a => a.fila === 2)!;
    if (fila3 && !r2.plegado) {
      const o2 = puntosFila(r2.x, r2.y, r2.rec, m.yPiso);
      c('interior', 'Rodillas de la fila 3 al respaldo de la fila 2', respaldoEn(o2, fila3.pts.K[1]) - (fila3.pts.K[0] + 0.06), 0.02);
    }
    // row 2's outer shoulder (an average man's: Z_FILA2 + MEDIO_HOMBRO from the centre line) to the canopy's inner face
    if (fila2) {
      const o = fila2.pts, S = [o.H[0] + o.d[0] * 0.44, o.H[1] + o.d[1] * 0.44];
      c('interior,carroceria', 'Hombros de la fila 2 a la cúpula (de lado)', Math.min(F.ladoZ(S[0], S[1]), F.ladoZ(o.S[0], o.S[1])) - esp - (Z_FILA2 + MEDIO_HOMBRO), 0.02);
    }
    // the feet (instep 4 cm over the ankle): inside the body where they rest, and under the seat in front (its pan's underside)
    const pies = (q: Plaza, delante: AsientoFila | undefined) => {
      const o = q.pts, zf = Math.abs(q.z) + (o.anchoPiernas?.[1] ?? 0.1) + 0.045, yPie = o.F[1] - 0.06;
      let h = 9; for (const x of [o.F[0], o.F[0] + 0.18]) h = Math.min(h, dentroDe(F, x, yPie, zf));
      c('interior', `Pies de la ${q.fila === 2 ? 'fila 2' : 'fila 3'} dentro de la carrocería`, h, 0.01);
      if (delante) {
        const x0 = delante.x - 0.17, x1 = x0 + delante.fondo, punta = o.F[0] + 0.18;
        // only where the foot (ankle to toes) is under that cushion
        const bajo = punta > x0 && o.F[0] < x1;
        c('interior', `Pies de la ${q.fila === 2 ? 'fila 2' : 'fila 3'} bajo el asiento de delante`, bajo ? (delante.y - PAN_ASIENTO) - (o.F[1] + 0.04) : 0.09, 0.01);
      }
    };
    if (fila2) pies(fila2, m.asientosFilas.find(a => a.fila === 1));
    if (fila3) pies(fila3, r2);
    // row 3's backrest ahead of the rear shock tower (its tube's front face)
    const r3 = m.asientosFilas.find(a => a.fila === 3)!;
    c('interior,rodaje', 'Respaldo de la fila 3 a la torreta del amortiguador', (r3.x - 0.19) - (m.basculante.pivote[0] - 0.06 + L('tChD') / 2000), 0.02);
  }
  {
    // reach: shoulder to grip, against a 58 cm arm (the viewer's 30 + 28 cm), elbows a little bent
    const hom: P3 = [op.H[0] + op.d[0] * 0.46, op.H[1] + op.d[1] * 0.46, 0.19], puno: P3 = [op.mano[0], op.mano[1], op.anchoMano];
    c('interior', 'Manos del piloto al manillar (alcance)', 0.55 - Math.hypot(puno[0] - hom[0], puno[1] - hom[1], puno[2] - hom[2]), 0.0);
  }
  const [xb, yb, zb] = extremoManillar(F, m.man);
  c('interior', 'Manillar dentro de la carrocería', F.ladoZ(xb, yb) - zb, 0.01);
  c('rodaje,carroceria', 'Neumático delantero dentro de su carenado (gira con él)', neumaticoCarenado(F), 0.015);
  c('rodaje,carroceria', 'Carenado delantero a la carrocería, recto', carenadoCuerpo(F), HUECO_CARENADO - 0.002);
  c('rodaje,carroceria', `Carenado delantero a la carrocería, girado ${Math.round(m.giro * 180 / Math.PI)}°`, huecoGiro(F, m.giro), HUECO_GIRO - 0.002);
  if (!m.traseras) c('rodaje', `Rueda trasera dentro de la cola, hundida ${Math.round(m.recTras * 1000)} mm`, ruedaDentro(F, m.xR, m.rR, F.ANCHO_NEU, m.recTras), 0.02);
  else {
    // four wheels (2026-11-11): the rear pods as the front ones, but they do not steer
    c('rodaje,carroceria', 'Neumático trasero dentro de su carenado', neumaticoCarenado(m.traseras), 0.015);
    c('rodaje,carroceria', 'Carenado trasero a la carrocería', carenadoCuerpo(m.traseras), HUECO_CARENADO - 0.002);
  }
  c('rodaje', `Bajos al suelo con la suspensión hundida`, F.D.suelo - Math.max(m.recDel, m.recTras) * 0.6, 0.03);
  // the swing arm's pivot ahead of the rear wheel and behind the passenger's footpegs
  if (!m.filas && !m.traseras) c('rodaje', 'Pivote del basculante detrás de los estribos del pasajero', (-1.30 + (m.sillines.xPasajero - ASIENTO.xPasajero) - 0.06) - m.basculante.pivote[0], 0.02);
  let tub = 9, peor = ''; for (const tb of m.tubos) { const h = tuboDentro(F, tb); if (h < tub) { tub = h; peor = tb.nombre; } }
  c('chasis', `Bastidor dentro de la carrocería${tub < 0.01 ? ` (${peor.toLowerCase()})` : ''}`, tub, 0.01);
  c('chasis', 'Bastidor: coeficiente de seguridad de los largueros', seguridad - 1.3, 0.5, `×${fmt(seguridad, 1)}`);
  for (const b of m.baterias) c('energia', `Batería, ${b.nombre.toLowerCase()}: dentro de la carrocería`, cajaDentro(F, b), 0.01);
  // the pilot's toes (17 cm ahead of the ankle) and the saddle's nose behind the battery
  const pie = m.occPts(true).F[0] + 0.17, pies = m.baterias.find(b => b.nombre === 'Módulo entre los pies');
  if (pies) c('energia', 'Batería: el módulo de entre los pies, delante del sillín', pies.x0 - (-0.835 + (m.sillines.xPiloto - ASIENTO.xPiloto) + 0.02), 0.0);
  else c('energia', 'Batería delante de los pies del piloto', m.baterias[0].x0 - pie, 0.02);
  // round two: what does not fit in the five places is not drawn; this says so (in litres)
  const litrosBat = L('tKWh') * 1000 / L('tWhL');
  c('energia', 'Batería: cabe en su sitio (morro, entre los pies y bajo los sillines)', m.bateriaCabe - litrosBat + 1e-9, 0, litrosBat - m.bateriaCabe > 0.05 ? `${Math.round(litrosBat)} L · caben ${Math.round(m.bateriaCabe)}` : `${Math.round(litrosBat)} L`);
  c('propulsion', 'Controlador dentro de la carrocería', cajaDentro(F, m.inversor), 0.01);
  // a hub motor has the room its rim gives it: above that power, a motor on the swing arm with a belt (as on
  // electric motorcycles) would be the honest drive, and that is not drawn here
  const kWBuje = RUEDAS_TRICICLO[T.tRuedaTras].kWBuje, kWp = L('tKWPico');
  // four wheels (2026-11-11): the power split between two hub motors, each in its own rim
  if (m.traseras) c('propulsion', 'Motor de buje: potencia que cabe en cada rueda trasera (regla aproximada)', kWBuje - kWp / 2, 0, `${fmt(kWp / 2, 1)} de ${kWBuje} kW por rueda`);
  else c('propulsion', 'Motor de buje: potencia que cabe en la rueda trasera (regla aproximada)', kWBuje - kWp, 0, `${fmt(kWp, 1)} de ${kWBuje} kW`);
  // round three: the boot, in litres (always passes: it says how much there is)
  const maletero = maleterosTriciclo(m);
  c('interior', `Maletero (${m.filas ? (maletero.estado) : 'detrás del pasajero'})`, maletero.ahora / 1000, 0, `${Math.round(maletero.ahora)} L`);

  const bala: ResultadosTriciclo = {
    area, vol, piel: ar.carroceria + ar.cristal, cristal: ar.cristal, cupula: [-m.cup.XC0, -m.cup.XC1],
    viaSubida: F.VIA_LAT > m.viaPedida + 1e-9 ? F.VIA_LAT : null, cabezas,
    piezas, cg: { x: cg.x, y: cg.y, masa: cg.masa, vacio: { x: vacio.x, y: vacio.y } }, vuelco: { ssf, ssfSolo, repartoDel },
    giro: { radio, dentro: di * 180 / Math.PI, fuera: dout * 180 / Math.PI },
    bastidor: { M: Mmax, tension, seguridad, metros },
    bateria: { litros: L('tKWh') * 1000 / L('tWhL'), kg: L('tKWh') * 1000 / L('tWhKg'), litrosMorro: 0.42 * 0.30 * Math.max(1, F.kW) * 0.20 * 1000, cabe: m.bateriaCabe },
    energia: cd ? energiaTriciclo(m, mVeh + nOcc * mOcc, cd, ar.solar) : null,
    maletero, ocupantes: nOcc,
  };
  const e = bala.energia, nada = NaN;
  return {
    A: area.total, FR: nada, Cd: e?.cd ?? nada, CdA: e?.CdA ?? nada, Crr: CRR, vol, Paero: nada, Proll: nada, Pw: e?.potencia ?? nada, WhKm: e?.WhKm ?? nada, pedWhKm: 0,
    autonomia: e?.autonomia ?? nada, vmax: e?.vmaxNominal ?? nada,
    masas, mVeh, mTot: mVeh + nOcc * mOcc, rangoMasa: [nada, nada], Mmax, tension, seguridad, cargaRueda: nada,
    solarPico: ar.solar * RENDIMIENTO_SOLAR * 1000, solarDia: solarDiaTriciclo(ar.solar, m.P.sol), kmSol: e?.kmSol ?? nada, areas: ar, comprobaciones: ch, triciclo: bala,
  };
}

/** Rodadura de neumático de ciclomotor (0,011), motor de buje y controlador al 85 %, 80 W de equipos y la batería usable al 90 %. Supuestos, no medidos. */
export const CRR = 0.011, RENDIMIENTO = 0.85, AUXILIARES = 80, USABLE = 0.9;
/** Consumo, autonomía y velocidades con el Cd del túnel (referido a su área: la sección mayor de la carrocería). */
/**
 * Lo que da el techo solar en un día (Wh), como en el Aeromóvil 1: el panel, curvo, recoge de media ~70 % de lo
 * que uno plano; rendimiento de las células `RENDIMIENTO_SOLAR`, `sol` kWh/m² al día sobre plano (4,5: media
 * anual en España) y 85 % de pérdidas de cableado, temperatura y carga. Estimación.
 */
export const solarDiaTriciclo = (area: number, sol = 4.5) => area * 0.7 * RENDIMIENTO_SOLAR * sol * 1000 * 0.85;
export function energiaTriciclo(m: ModeloTriciclo, mTot: number, cd: { cd: number; areaRef: number }, areaSolar = m.solar.area) {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), g = 9.81, CdA = cd.cd * cd.areaRef;
  const potencia = (v: number) => (0.5 * 1.2 * CdA * v ** 3 + CRR * mTot * g * v) / RENDIMIENTO + AUXILIARES;
  const consumo = (kmh: number) => { const v = kmh / 3.6; return potencia(v) / v / 3.6; };
  const vel = L('tVel'), WhKm = consumo(vel), util = L('tKWh') * 1000 * USABLE;
  const vmaxCon = (kW: number) => { let v = 10; for (let i = 0; i < 80; i++) v *= Math.pow(kW * 1000 / potencia(v), 0.34); return v * 3.6; };
  // 0 → 50 km/h: peak power, limited by the grip of the one driven wheel (≈ 40 % of the weight on it, μ 0.9)
  const reparto = 0.4, Fmax = AGARRE * reparto * mTot * g;
  let v = 0.5, t = 0; const dt = 0.02;
  while (v < 50 / 3.6 && t < 60) { const Fz = Math.min(Fmax, L('tKWPico') * 1000 * RENDIMIENTO / v) - 0.5 * 1.2 * CdA * v * v - CRR * mTot * g; if (Fz <= 0) { t = 99; break; } v += Fz / (mTot * 1.03) * dt; t += dt; }
  return { cd: cd.cd, areaRef: cd.areaRef, CdA, WhKm, autonomia: util / WhKm, kmSol: solarDiaTriciclo(areaSolar, m.P.sol) / WhKm, vmaxNominal: vmaxCon(L('tKWNom')), vmaxPico: vmaxCon(L('tKWPico')), acel50: t, potencia: potencia(vel / 3.6), WhKm50: consumo(50), WhKm100: consumo(100) };
}

/**
 * Superficies de piel (m²): la carrocería, el cristal de la cúpula y, desde la segunda versión, el panel solar.
 * El panel sustituye al cristal donde está: bajo él va laminado de carrocería (el panel flexible no es
 * estructural), así que su superficie cuenta como panel y como carrocería, como en el Aeromóvil 1.
 */
export function areasTriciclo(m: Pick<ModeloTriciclo, 'F' | 'cup' | 'solar' | 'marcoArea'>) {
  const b = areasBala(m), s = m.solar.area, k = m.marcoArea;
  return { carroceria: b.carroceria + s + k, cristal: Math.max(0, b.cristal - s - k), solar: s };
}
/** ¿Es este modelo un Triciclo? */
export const esTriciclo = (m: { tipo: string }): m is ModeloTriciclo => m.tipo === 'triciclo';
