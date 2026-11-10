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
// the body (skin, canopy, nose, tail, fin, livery, lamps) is the Cuadriciclo
// Bala's default body to the last vertex (scripts/triciclo-disenos.ts checks it).
// What changes is the wheels: a tadpole layout.
//   · No front centre wheel. Where it was (the nose, around the front axle)
//     goes the battery: low and as far forward as it fits, which is where a
//     three-wheeler with two wheels in front wants its weight (see `vuelco`).
//   · Two front wheels in Aptera-like pods on streamlined arms, beside the
//     front of the body, at the front axle (x = 0, where the Cuadriciclo's
//     front wheel was). They steer, and the pods turn with them, as on the
//     Aptera: a fixed pod with room for a 28° lock inside would be twice as
//     wide. The check is that the turned pod clears the body.
//   · One rear wheel on the centre line inside the tail, on a swing arm, with
//     the motor in its hub.
//
// Pure (no three.js): the wind tunnel's Web Worker builds it for «Probar» and
// for the Cd the results use.

import type { Comprobacion, MaterialCarenado, MaterialChasis, Parametros, PuntosOcupante, Pulgadas, Resultados, Rueda, Tubo, P3 } from './geometria';
import { DIAMETRO_RUEDA, MATERIALES_CARENADO, MATERIALES_CHASIS, TRICICLO_DEFECTO, largoTubo } from './geometria';
import { crearForma, type DimBala, type FormaBala } from './garaje/balaForma';
import { APLASTADO_BALA, ASIENTO, alturasPod, anchoMaxPod, brazosDe, contornoCupula, escalaManillar, extremoManillar, podDe, semiAncho, techoEn, type Asientos } from './garaje/balaMedidas';
import {
  ANCHO_NEU, ANCHO_NEU_LAT, CADERA_SOBRE_ASIENTO, DESLIZADORES_BALA, HUECO_CARENADO, MEDIA_CABEZA, TALLA_SENTADO,
  areaFrontalBala, carenadoCuerpo, neumaticoCarenado, pielBala, rodilla, ruedaDentro, type ClaveBala, type ResultadosBala,
} from './geometriaBala';

/** Los parámetros propios del Triciclo (prefijo `t`). Opcionales en `Parametros`: los diseños de los otros tres vehículos no los llevan. */
export interface CamposTriciclo {
  // Carrocería: la forma del Cuadriciclo
  tAncho: number; tSuelo: number; tMorro: number; tPuntaMorro: number; tCola: number; tPuntaCola: number; tAleta: number;
  tCupIni: number; tCupFin: number; tAlto: number;
  // Carrocería: carenados de las ruedas delanteras, brazos y faldón trasero
  tPodEsc: number;     // tamaño del carenado delantero alrededor de la rueda (×)
  tPodAncho: number;   // anchura del carenado (×)
  tPodCola: number;    // largo de la cola del carenado, detrás del eje (×)
  tBrazo: number;      // cuerda del carenado del brazo de arriba (m)
  tFaldon: number;     // faldón de la rueda trasera: 0 sin faldón (asoma como en el Cuadriciclo) · 1 cerrado hasta 4 cm del suelo
  // Carrocería: material
  tMatCarenado: MaterialCarenado; tEspCarenado: number; tEspCristal: number;   // mm
  // Interior
  tPilX: number; tPilY: number; tPasX: number; tPasY: number;   // caderas detrás del eje delantero y sillines sobre el suelo (m)
  tRecPil: number; tRecPas: number;   // reclinado de los respaldos (° desde la vertical, + hacia atrás)
  tManX: number; tManY: number;       // manillar: + hacia el piloto, + arriba (m)
  tPiesX: number; tPiesY: number;     // plataformas del piloto: + hacia delante, + arriba (m)
  tMOcc: number; tMAsiento: number;   // kg
  // Chasis
  tChMat: MaterialChasis; tChD: number; tChT: number; tChUniones: number;   // mm, mm, kg
  // Rodaje
  tBatalla: number;    // la batalla de la carrocería (del Cuadriciclo): de donde iba su rueda delantera al eje trasero (m)
  tEjeDel: number;     // eje delantero: cuánto va detrás de donde iba la rueda delantera del Cuadriciclo (m)
  tVia: number; tRuedaDel: Pulgadas; tRuedaTras: Pulgadas;
  tGiro: number;       // giro máximo de la rueda delantera de dentro (°)
  tRecDel: number; tRecTras: number;   // recorrido de la suspensión (mm)
  tBasculante: number; // largo del basculante trasero (m)
  tMRueda: number; tMFreno: number; tMSuspDel: number; tMSuspTras: number; tMDir: number;   // kg
  // Propulsión
  tKWNom: number; tKWPico: number; tMMotor: number; tMInversor: number; tVel: number;
  // Energía
  tKWh: number; tWhKg: number; tWhL: number; tMVarios: number;
}
export type ClaveTriciclo = keyof CamposTriciclo;
type ClaveTexto = 'tMatCarenado' | 'tChMat' | 'tRuedaDel' | 'tRuedaTras';
export type ClaveNumTriciclo = Exclude<ClaveTriciclo, ClaveTexto>;

// ------------------------------------------------------------------ deslizadores
/** Los departamentos del Triciclo (los del Aeromóvil 1 que tienen algo que mover aquí). */
export type DepTriciclo = 'carroceria' | 'interior' | 'chasis' | 'rodaje' | 'propulsion' | 'energia';
export const DEPS_TRICICLO: DepTriciclo[] = ['carroceria', 'interior', 'chasis', 'rodaje', 'propulsion', 'energia'];
/** Lo que es cada departamento en el Triciclo (los lemas del Aeromóvil 1 hablan de sus piezas, no de estas). */
export const LEMAS_TRICICLO: Record<DepTriciclo | 'proyecto', string> = {
  proyecto: 'el resumen: comprobaciones, peso, consumo y vuelco',
  carroceria: 'la piel del Cuadriciclo, los carenados delanteros y el material',
  interior: 'los dos a horcajadas: sillines, respaldos, manillar y plataformas',
  chasis: 'el bastidor de tubos dentro de la carrocería',
  rodaje: 'ejes, vía, ruedas, suspensión y dirección',
  propulsion: 'el motor en el buje de la rueda trasera',
  energia: 'la batería en el morro y entre los pies',
};
export type Unidad = 'm' | 'cm' | 'mm' | '°' | 'kg' | 'kW' | 'kWh' | 'Wh/kg' | 'Wh/L' | 'km/h' | 'x';
/**
 * Un deslizador del Triciclo. `bala`: la forma es la del Cuadriciclo, y su
 * etiqueta, su rango y su paso se leen de su tabla (DESLIZADORES_BALA), no se
 * copian. `centrar`: el deslizador se recoloca con el valor por defecto en
 * medio (como todos en el editor); no, cuando el valor por defecto no es el
 * centro de su rango (se ve el rango entero).
 */
export interface FichaTriciclo { clave: ClaveNumTriciclo; n: string; dep: DepTriciclo; bloque: string; min: number; max: number; paso: number; unidad: Unidad; centrar: boolean; desde?: 1 | -1 }
export interface SelectorTriciclo { clave: ClaveTexto; n: string; dep: DepTriciclo; bloque: string; opciones: { k: string; n: string }[] }

type Fila = [ClaveNumTriciclo, DepTriciclo, string, ClaveBala | null, string, number, number, number, Unidad];
// [clave, departamento, bloque, del Cuadriciclo, etiqueta, mín, máx, paso, unidad]
const FILAS: Fila[] = [
  ['tAncho', 'carroceria', 'Forma', 'bAncho', '', 0, 0, 0, 'm'],
  ['tSuelo', 'carroceria', 'Forma', 'bSuelo', '', 0, 0, 0, 'cm'],
  ['tMorro', 'carroceria', 'Morro y cola', 'bMorro', '', 0, 0, 0, 'm'],
  ['tPuntaMorro', 'carroceria', 'Morro y cola', 'bPuntaMorro', '', 0, 0, 0, 'x'],
  ['tCola', 'carroceria', 'Morro y cola', 'bCola', '', 0, 0, 0, 'm'],
  ['tPuntaCola', 'carroceria', 'Morro y cola', 'bPuntaCola', '', 0, 0, 0, 'm'],
  ['tAleta', 'carroceria', 'Morro y cola', 'bAleta', '', 0, 0, 0, 'm'],
  ['tCupIni', 'carroceria', 'Cúpula', 'bCupIni', '', 0, 0, 0, 'm'],
  ['tCupFin', 'carroceria', 'Cúpula', 'bCupFin', '', 0, 0, 0, 'm'],
  ['tAlto', 'carroceria', 'Cúpula', 'bAlto', '', 0, 0, 0, 'm'],
  ['tPodEsc', 'carroceria', 'Carenados', null, 'Carenado delantero: tamaño', 0.90, 1.10, 0.01, 'x'],
  ['tPodAncho', 'carroceria', 'Carenados', null, 'Carenado delantero: anchura', 0.80, 1.20, 0.01, 'x'],
  ['tPodCola', 'carroceria', 'Carenados', null, 'Carenado delantero: largo de la cola', 0.70, 1.30, 0.01, 'x'],
  ['tBrazo', 'carroceria', 'Carenados', null, 'Brazo delantero: cuerda del carenado', 0.12, 0.28, 0.005, 'cm'],
  ['tFaldon', 'carroceria', 'Carenados', null, 'Rueda trasera: faldón (cuánto asoma)', 0, 1, 0.05, 'x'],
  ['tEspCarenado', 'carroceria', 'Material y espesores', null, 'Espesor de la carrocería', 0.6, 2.4, 0.1, 'mm'],
  ['tEspCristal', 'carroceria', 'Material y espesores', null, 'Espesor de la cúpula (policarbonato)', 1.5, 4.5, 0.5, 'mm'],
  ['tPilX', 'interior', 'Asientos', 'bPilX', '', 0, 0, 0, 'm'],
  ['tPilY', 'interior', 'Asientos', 'bPilY', '', 0, 0, 0, 'm'],
  ['tRecPil', 'interior', 'Asientos', null, 'Reclinado del piloto', -10, 20, 1, '°'],
  ['tPasX', 'interior', 'Asientos', 'bPasX', '', 0, 0, 0, 'm'],
  ['tPasY', 'interior', 'Asientos', 'bPasY', '', 0, 0, 0, 'm'],
  ['tRecPas', 'interior', 'Asientos', null, 'Reclinado del pasajero', -10, 20, 1, '°'],
  ['tManX', 'interior', 'Mandos', null, 'Manillar: hacia el piloto', -0.06, 0.10, 0.01, 'cm'],
  ['tManY', 'interior', 'Mandos', null, 'Manillar: altura', -0.02, 0.10, 0.01, 'cm'],
  ['tPiesX', 'interior', 'Mandos', null, 'Plataformas: hacia delante', -0.08, 0.08, 0.01, 'cm'],
  ['tPiesY', 'interior', 'Mandos', null, 'Plataformas: altura', -0.04, 0.04, 0.01, 'cm'],
  ['tMOcc', 'interior', 'Masas', null, 'Masa por ocupante', 50, 110, 1, 'kg'],
  ['tMAsiento', 'interior', 'Masas', null, 'Un asiento (sillín y respaldo)', 1.5, 5.5, 0.5, 'kg'],
  ['tChD', 'chasis', 'Bastidor', null, 'Tubos: diámetro', 30, 60, 1, 'mm'],
  ['tChT', 'chasis', 'Bastidor', null, 'Tubos: pared', 1.2, 3.6, 0.1, 'mm'],
  ['tChUniones', 'chasis', 'Bastidor', null, 'Uniones, chapas y tornillería', 1, 6, 0.5, 'kg'],
  ['tBatalla', 'rodaje', 'Ejes y ruedas', 'bBatalla', '', 0, 0, 0, 'm'],
  ['tEjeDel', 'rodaje', 'Ejes y ruedas', null, 'Eje delantero: atrasado', 0, 0.45, 0.01, 'cm'],
  ['tVia', 'rodaje', 'Ejes y ruedas', null, 'Vía delantera', 1.40, 2.20, 0.01, 'm'],
  ['tGiro', 'rodaje', 'Suspensión y dirección', null, 'Giro máximo de la dirección', 18, 38, 1, '°'],
  ['tRecDel', 'rodaje', 'Suspensión y dirección', null, 'Recorrido de la suspensión delantera', 50, 110, 5, 'mm'],
  ['tRecTras', 'rodaje', 'Suspensión y dirección', null, 'Recorrido de la suspensión trasera', 50, 110, 5, 'mm'],
  ['tBasculante', 'rodaje', 'Suspensión y dirección', null, 'Basculante trasero: largo', 0.40, 0.60, 0.01, 'm'],
  ['tMRueda', 'rodaje', 'Masas', null, 'Una rueda con neumático', 3, 6, 0.1, 'kg'],
  ['tMFreno', 'rodaje', 'Masas', null, 'Un freno de disco con pinza', 0.6, 1.8, 0.1, 'kg'],
  ['tMSuspDel', 'rodaje', 'Masas', null, 'Suspensión delantera (las dos)', 5, 13, 0.5, 'kg'],
  ['tMSuspTras', 'rodaje', 'Masas', null, 'Basculante y amortiguador trasero', 4, 8, 0.5, 'kg'],
  ['tMDir', 'rodaje', 'Masas', null, 'Dirección: columna, cremallera y bieletas', 3, 6, 0.5, 'kg'],
  ['tKWNom', 'propulsion', 'Motor', null, 'Potencia nominal', 2, 8, 0.5, 'kW'],
  ['tKWPico', 'propulsion', 'Motor', null, 'Potencia máxima', 5, 15, 0.5, 'kW'],
  ['tMMotor', 'propulsion', 'Motor', null, 'Motor de buje', 8, 18, 0.5, 'kg'],
  ['tMInversor', 'propulsion', 'Motor', null, 'Controlador (inversor)', 1.5, 3.5, 0.1, 'kg'],
  ['tVel', 'propulsion', 'Motor', null, 'Velocidad de cálculo', 40, 120, 5, 'km/h'],
  ['tKWh', 'energia', 'Batería', null, 'Batería', 5, 13, 0.5, 'kWh'],
  ['tWhKg', 'energia', 'Batería', null, 'Densidad del paquete (masa)', 120, 200, 5, 'Wh/kg'],
  ['tWhL', 'energia', 'Batería', null, 'Densidad del paquete (volumen)', 160, 300, 5, 'Wh/L'],
  ['tMVarios', 'energia', 'Varios', null, 'Varios: cargador, cables, luces, 12 V', 6, 18, 1, 'kg'],
];
let FICHAS: FichaTriciclo[] | null = null;
/**
 * The Triciclo's sliders: ONE table, read by the page (Aeromovil.tsx) and by the
 * tunnel's improvement options (tunel/explicaciones.ts). Built on first use: the
 * shape rows read the Cuadriciclo's table, and a module cycle through
 * geometria.ts must not find it half-built.
 */
export function deslizadoresTriciclo(): FichaTriciclo[] {
  return FICHAS ?? (FICHAS = FILAS.map(([clave, dep, bloque, bala, n, min, max, paso, unidad]) => {
    const b = bala ? DESLIZADORES_BALA.find(f => f.clave === bala)! : null, f = b ? { n: b.n, min: b.min, max: b.max, paso: b.paso } : { n, min, max, paso };
    // the editor's sliders put the default in the middle; where this vehicle's default is not the middle of the range, the whole range shows instead
    return { clave, dep, bloque, ...f, unidad, centrar: Math.abs(TRICICLO_DEFECTO[clave] - (f.min + f.max) / 2) < 1e-6 * (f.max - f.min), ...(DESDE_EJE[clave] ? { desde: DESDE_EJE[clave] } : {}) };
  }));
}
/**
 * The shape's lengths along the car are stored as the Cuadriciclo's, measured from
 * where ITS front wheel is (x = 0), so that the defaults give its body exactly.
 * The Triciclo's own front axle is `tEjeDel` further back: these sliders show
 * and take their value from that axle, so «al eje delantero» is true for this
 * vehicle (+1: ahead of the axle, the nose; −1: behind it).
 */
const DESDE_EJE: Partial<Record<ClaveNumTriciclo, 1 | -1>> = { tMorro: 1, tCupIni: -1, tCupFin: -1, tPilX: -1, tPasX: -1, tBatalla: -1 };
/** What a slider shows: its value and range from the Triciclo's front axle. */
export function vistaTriciclo(f: FichaTriciclo, T: CamposTriciclo): { valor: number; min: number; max: number; defecto: number } {
  const [a, b] = rangoTriciclo(f.clave, T), d = (f.desde ?? 0) * limitarTriciclo('tEjeDel', T);
  return { valor: limitarTriciclo(f.clave, T) + d, min: a + d, max: b + d, defecto: TRICICLO_DEFECTO[f.clave] + d };
}
/** The stored value for what a slider shows. */
export const guardarTriciclo = (f: FichaTriciclo, v: number, T: CamposTriciclo) => v - (f.desde ?? 0) * limitarTriciclo('tEjeDel', T);
export const fichaTriciclo = (k: ClaveNumTriciclo) => deslizadoresTriciclo().find(f => f.clave === k);
const ruedas = (l: Pulgadas[]) => l.map(k => ({ k, n: `${k}″ (${Math.round({ '16': 405, '20': 508, '24': 610, '26': 660, '28': 700 }[k])} mm)` }));
export const SELECTORES_TRICICLO: SelectorTriciclo[] = [
  { clave: 'tMatCarenado', n: 'Material de la carrocería', dep: 'carroceria', bloque: 'Material y espesores', opciones: [{ k: 'carbonoLino', n: 'Carbono-lino' }, { k: 'vidrio', n: 'Fibra de vidrio' }, { k: 'carbono', n: 'Fibra de carbono' }] },
  { clave: 'tChMat', n: 'Material de los tubos', dep: 'chasis', bloque: 'Bastidor', opciones: [{ k: 'al6061', n: 'Aluminio 6061-T6' }, { k: 'cromoly', n: 'Acero cromoly 4130' }, { k: 'carbono', n: 'Tubo de carbono' }] },
  { clave: 'tRuedaDel', n: 'Ruedas delanteras (en los carenados)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['16', '20', '24']) },
  { clave: 'tRuedaTras', n: 'Rueda trasera (dentro de la cola)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['20', '24', '26']) },
];

/** Los parámetros del Triciclo de un diseño: lo guardado (si es del tipo correcto y, en los selectores, una opción que existe) y lo que falte, el de por defecto. */
export function camposTriciclo(P: Partial<Parametros>): CamposTriciclo {
  const o = { ...TRICICLO_DEFECTO } as Record<string, unknown>;
  for (const k of Object.keys(TRICICLO_DEFECTO) as ClaveTriciclo[]) {
    const v = (P as Record<string, unknown>)[k], ref = TRICICLO_DEFECTO[k];
    if (typeof ref === 'number') { if (typeof v === 'number' && Number.isFinite(v)) o[k] = v; continue; }
    const sel = SELECTORES_TRICICLO.find(s => s.clave === k);
    if (typeof v === 'string' && sel?.opciones.some(x => x.k === v)) o[k] = v;
  }
  return o as unknown as CamposTriciclo;
}

/**
 * El rango de un deslizador para estos parámetros. Cuatro dependen de otro: la
 * cúpula acaba al menos 25 cm por delante del eje trasero y el pasajero va entre
 * 40 y 62 cm detrás del piloto (los dos, como en el Cuadriciclo); la potencia
 * máxima no baja de la nominal; el basculante no llega más allá de 70 cm del eje
 * trasero ni deja el pivote detrás de los estribos del pasajero.
 */
export function rangoTriciclo(k: ClaveNumTriciclo, T: CamposTriciclo): [number, number] {
  const f = fichaTriciclo(k)!;
  if (k === 'tCupFin') return [Math.min(f.min, T.tBatalla - 0.45), Math.min(f.max, T.tBatalla - 0.25)];
  if (k === 'tPasX') return [Math.max(f.min, T.tPilX + 0.40), Math.min(f.max, T.tPilX + 0.62)];
  if (k === 'tKWPico') return [Math.max(f.min, T.tKWNom), f.max];
  return [f.min, f.max];
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
  const rDel = DIAMETRO_RUEDA[T.tRuedaDel] / 2, rTras = DIAMETRO_RUEDA[T.tRuedaTras] / 2;
  const D: DimBala = {
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo: L('tSuelo'),
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    // the Cuadriciclo's «front and rear» wheel is our rear one; its «lateral» wheels, our front ones
    rDel: rTras, rLat: rDel, anchoNeu: ANCHO_NEU, anchoNeuLat: ANCHO_NEU_LAT, via: L('tVia'),
    xLat: -L('tEjeDel'), pod: { esc: L('tPodEsc'), ancho: L('tPodAncho'), cola: L('tPodCola') }, cuerdaBrazo: L('tBrazo'),
  };
  let F = crearForma(D);
  const giro = L('tGiro') * Math.PI / 180;
  // the pods only move sideways with the track: the gap grows by half of what the track grows
  const hueco = huecoGiro(F, giro);
  if (hueco < HUECO_GIRO) F = crearForma({ ...D, via: Math.ceil((D.via + 2 * (HUECO_GIRO - hueco)) * 100) / 100 });
  const asientos: Asientos = { xPiloto: -L('tPilX'), yPiloto: L('tPilY'), xPasajero: -L('tPasX'), yPasajero: L('tPasY') };
  return { D: F.D, F, asientos, aleta: L('tAleta'), viaPedida: D.via, giro };
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
 * los 91,8 cm sentado del percentil 50 (ANSUR II), como en el Cuadriciclo.
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
  const Fp: [number, number] = piloto ? [-0.52 + dxPil + pies[0], 0.235 + F.dSuelo + pies[1]] : [-1.30 + dxPas, 0.29 + F.dSuelo];
  const K = rodilla(H, Fp, 0.45 * escala, 0.47 * escala);
  const mano: [number, number] = piloto ? [-0.592 + man[0], 0.870 + F.dSuelo + man[1]] : [-1.45 + dxPas, 0.505 + (S.yPasajero - ASIENTO.yPasajero)];
  const kb = escalaManillar(F, man);
  return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: piloto ? 0.265 * kb : 0.19 * kz, anchoPiernas: piloto ? [0.13, 0.15 * kz] : [0.17, 0.20 * kz] };
}
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
/** El paquete de batería: un módulo ancho en el morro, donde iba la rueda delantera del Cuadriciclo, y si no cabe, el resto en un módulo estrecho entre los pies del piloto, bajo el depósito. Sobre los largueros. */
function bateriaEn(F: FormaBala, T: CamposTriciclo, yBase: number): Caja[] {
  const litros = T.tKWh * 1000 / T.tWhL, V = litros / 1000;
  const alto = 0.20, delante = 0.12, partido = -0.30;
  const aF = 0.30, aR = 0.18, Vmax = (delante - partido) * aF * alto;
  const cajas: Caja[] = [];
  if (V <= Vmax) cajas.push({ nombre: 'Módulo del morro', x0: delante - V / (aF * alto), x1: delante, y0: yBase, y1: yBase + alto, hz: aF / 2 });
  else {
    cajas.push({ nombre: 'Módulo del morro', x0: partido, x1: delante, y0: yBase, y1: yBase + alto, hz: aF / 2 });
    cajas.push({ nombre: 'Módulo entre los pies', x0: partido - (V - Vmax) / (aR * alto), x1: partido, y0: yBase, y1: yBase + alto, hz: aR / 2 });
  }
  void F;
  return cajas;
}

/** El modelo del Triciclo: la forma, los ocupantes, el bastidor, la batería, el motor y lo que lee el visor. */
export function crearModeloTriciclo(P: Parametros) {
  const T = camposTriciclo(P);
  const { D, F, asientos, aleta, viaPedida, giro } = medidasTriciclo(T);
  const cup = contornoCupula(F);
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  const rF = F.R_LAT, rR = F.R_DEL, xR = -F.BATALLA, via = F.VIA_LAT, xF = F.X_LAT;
  const semiPod = anchoMaxPod(F), anchoTotal = Math.round((via + 2 * semiPod) * 1000) / 1000;
  const ruedas: Rueda[] = [
    { nombre: 'Rueda delantera der.', x: xF, z: via / 2, r: rF, w: F.ANCHO_NEU_LAT }, { nombre: 'Rueda delantera izq.', x: xF, z: -via / 2, r: rF, w: F.ANCHO_NEU_LAT },
    { nombre: 'Rueda trasera', x: xR, z: 0, r: rR, w: F.ANCHO_NEU },
  ];
  const rec = { piloto: L('tRecPil'), pasajero: L('tRecPas') };
  const man: [number, number] = [-L('tManX'), L('tManY')], pies: [number, number] = [L('tPiesX'), L('tPiesY')];
  const occ = (piloto: boolean, escala = 1) => puntosTriciclo(F, asientos, piloto, piloto ? rec.piloto : rec.pasajero, man, pies, escala);

  // ── bastidor: dos largueros sobre la panza, travesaños, la cuna de la batería y la suspensión delantera, los soportes de los sillines y la torreta del amortiguador
  const dT = L('tChD') / 1000, pared = L('tChT') / 1000, mat = MATERIALES_CHASIS[T.tChMat].n;
  const yL = D.suelo + 0.035 + dT / 2, zL = Z_LARGUERO;
  const xPiv = xR + L('tBasculante'), yPiv = yL + 0.03;
  const yBat = yL + dT / 2 + 0.005;
  const baterias = bateriaEn(F, T, yBat);
  const yTopBat = Math.max(...baterias.map(b => b.y1));
  const yCuna = yTopBat + 0.03, xCuna = xF, zCuna = 0.18;
  const dyPil = asientos.yPiloto - ASIENTO.yPiloto, dyPas = asientos.yPasajero - ASIENTO.yPasajero, dxPil = asientos.xPiloto - ASIENTO.xPiloto, dxPas = asientos.xPasajero - ASIENTO.xPasajero;
  const T_ = (nombre: string, a: P3, b: P3, d = dT, curva?: P3[]): Tubo => ({ nombre, grupo: 'Chasis', a, b, d, pared, material: mat, ...(curva ? { curva } : {}) });
  const tubos: Tubo[] = [];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'der.' : 'izq.';
    tubos.push(T_(`Larguero ${lado}`, [0.10, yL, s * zL], [xPiv, yL, s * zL]));
    // the cradle round the nose module: a post each side up to the top bar, on which the front suspension pivots
    tubos.push(T_(`Cuna de la batería: poste ${lado}`, [xCuna, yL, s * zL], [xCuna, yCuna, s * zCuna]));
    // the pilot's saddle and the passenger's: a post each side from the rail up to the saddle's underside
    tubos.push(T_(`Soporte del sillín del piloto ${lado}`, [-0.95 + dxPil, yL, s * zL], [-1.02 + dxPil, 0.335 + dyPil + F.dSuelo * 0, s * 0.08]));
    tubos.push(T_(`Soporte del sillín del pasajero ${lado}`, [-1.50 + dxPas, yL, s * zL], [-1.55 + dxPas, 0.35 + dyPas, s * 0.08]));
    // the shock tower: from the rail at the swing-arm pivot up and back to the shock's top mount
    tubos.push(T_(`Torreta del amortiguador ${lado}`, [xPiv + 0.04, yL, s * zL], [xPiv - 0.06, yPiv + 0.26, s * 0.05]));
  }
  tubos.push(T_('Travesaño delantero', [0.10, yL, -zL], [0.10, yL, zL]));
  tubos.push(T_('Cuna de la batería: barra de arriba', [xCuna, yCuna, -zCuna], [xCuna, yCuna, zCuna]));
  tubos.push(T_('Travesaño de las plataformas', [-0.55 + dxPil + pies[0], yL, -zL], [-0.55 + dxPil + pies[0], yL, zL]));
  tubos.push(T_('Travesaño bajo los sillines', [-1.25, yL, -zL], [-1.25, yL, zL]));
  tubos.push(T_('Travesaño del basculante', [xPiv, yL, -zL], [xPiv, yL, zL]));
  // the steering-column support: from the cradle's top bar back and up to the steering head under the dash
  const cabeza: P3 = [-0.44 - man[0] * 0, 0.80 + F.dSuelo, 0];
  tubos.push(T_('Soporte de la columna de dirección', [xCuna, yCuna, 0], cabeza, dT, [[xCuna, yCuna, 0], [-0.22, yCuna + 0.20, 0], cabeza]));

  // ── suspensión, dirección y motor (posiciones; el visor los dibuja y la masa los cuenta por deslizador)
  const recTras = L('tRecTras') / 1000, recDel = L('tRecDel') / 1000;
  const basculante = { pivote: [xPiv, yPiv] as [number, number], eje: [xR, rR - APLASTADO_BALA] as [number, number], z: 0.075 };
  const amortiguador = { abajo: [xR + 0.4 * (xPiv - xR), (rR + yPiv) / 2 + 0.03] as [number, number], arriba: [xPiv - 0.06, yPiv + 0.26] as [number, number] };
  const brazos = brazosDe(F);
  const cremallera = { x: -0.03, y: Math.max(0.47, yTopBat + 0.05), z: 0.15 };
  const motor = { tipo: 'buje' as const, c: [xR, rR - APLASTADO_BALA] as [number, number], r: 0.115 * rR / 0.305, ancho: 0.10 };
  const inversor: Caja = { nombre: 'Controlador', x0: -1.86 + dxPas * 0, x1: -1.66, y0: yL + dT / 2 + 0.01, y1: yL + dT / 2 + 0.09, hz: 0.07 };

  const Lf = F.LARGO;
  const Pm: Parametros = { ...P, ...T, L: Lf, B: xF - xR, W: anchoTotal, H: D.alto, clear: D.suelo, track: via };
  return {
    tipo: 'triciclo' as const, P: Pm, campos: T, F, D, sillines: asientos, aleta, cup, viaPedida, giro, rec, man, pies,
    xn: F.X_MORRO, xt: F.X_COLA, Lf, rF, rR, rL: rF, xR, xL: xF, xF, batalla: xF - xR, anchoTotal, anchoCuerpo: D.ancho, alto: D.alto, semiPod,
    ruedas, via: { del: via, tras: 0 },
    tubos, baterias, inversor, motor, basculante, amortiguador, brazos, cremallera, cabezaDireccion: cabeza, recTras, recDel, yLarguero: yL,
    faldon: faldonDe(F, L('tFaldon'), xR, rR),
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
export interface ResultadosTriciclo extends ResultadosBala {
  /** Masa por partes con su centro (para el centro de gravedad); los ocupantes van aparte. */
  piezas: PiezaMasa[];
  cg: { x: number; y: number; masa: number; vacio: { x: number; y: number } };
  /** Umbral de vuelco estático (g) con dos ocupantes y con el piloto solo, y lo que pesa el eje delantero. */
  vuelco: { ssf: number; ssfSolo: number; repartoDel: number };
  /** Radio de giro (m): a la rueda delantera de fuera; ángulos de las dos ruedas (°). */
  giro: { radio: number; dentro: number; fuera: number };
  /** El bastidor: momento, tensión y coeficiente de seguridad de los largueros. */
  bastidor: { M: number; tension: number; seguridad: number; metros: number };
  bateria: { litros: number; kg: number; litrosMorro: number };
  /** Lo que depende del Cd del túnel (null mientras calcula). */
  energia: null | { cd: number; areaRef: number; CdA: number; WhKm: number; autonomia: number; vmaxNominal: number; vmaxPico: number; acel50: number; potencia: number; WhKm50: number; WhKm100: number };
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

/** Masa de cada parte (kg) con su centro (x, y). */
export function piezasTriciclo(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, centros: { xPiel: number; yPiel: number; xCristal: number; yCristal: number }, pods: { area: number }): PiezaMasa[] {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = m.F;
  const kgm2 = MATERIALES_CARENADO[T.tMatCarenado].kgm2mm * L('tEspCarenado');
  const densidad = MATERIALES_CHASIS[T.tChMat].densidad;
  let kgTubos = 0, xt = 0, yt = 0;
  for (const t of m.tubos) {
    const kg = Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) * largoTubo(t) * densidad;
    kgTubos += kg; xt += kg * (t.a[0] + t.b[0]) / 2; yt += kg * (t.a[1] + t.b[1]) / 2;
  }
  const bat = T.tKWh * 1000 / L('tWhKg');
  let vb = 0, xb = 0, yb = 0;
  for (const c of m.baterias) { const v = (c.x1 - c.x0) * (c.y1 - c.y0) * c.hz * 2; vb += v; xb += v * (c.x0 + c.x1) / 2; yb += v * (c.y0 + c.y1) / 2; }
  const ySillin = (piloto: boolean) => (piloto ? m.sillines.yPiloto : m.sillines.yPasajero) - 0.03;
  const yRF = m.rF - APLASTADO_BALA, yRR = m.rR - APLASTADO_BALA;
  return [
    { nombre: 'Carrocería', kg: ar.carroceria * kgm2, x: centros.xPiel, y: centros.yPiel },
    { nombre: 'Carenados y brazos delanteros', kg: pods.area * kgm2, x: m.xF, y: yRF + 0.05 },
    { nombre: 'Cúpula', kg: ar.cristal * L('tEspCristal') * 1.2, x: centros.xCristal, y: centros.yCristal },
    { nombre: 'Bastidor', kg: kgTubos + L('tChUniones'), x: kgTubos ? xt / kgTubos : -1, y: kgTubos ? yt / kgTubos : 0.3 },
    { nombre: 'Suspensión delantera', kg: L('tMSuspDel'), x: m.xF, y: yRF + 0.08 },
    { nombre: 'Basculante y amortiguador', kg: L('tMSuspTras'), x: (m.basculante.pivote[0] + m.xR) / 2, y: (m.basculante.pivote[1] + yRR) / 2 },
    { nombre: 'Ruedas', kg: 3 * L('tMRueda'), x: (2 * m.xF + m.xR) / 3, y: (2 * yRF + yRR) / 3 },
    { nombre: 'Frenos', kg: 3 * L('tMFreno'), x: (2 * m.xF + m.xR) / 3, y: (2 * yRF + yRR) / 3 },
    { nombre: 'Dirección', kg: L('tMDir'), x: (m.cremallera.x + m.cabezaDireccion[0]) / 2, y: (m.cremallera.y + m.cabezaDireccion[1]) / 2 },
    { nombre: 'Motor de buje', kg: L('tMMotor'), x: m.motor.c[0], y: m.motor.c[1] },
    { nombre: 'Controlador', kg: L('tMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2 },
    { nombre: 'Batería', kg: bat, x: vb ? xb / vb : 0, y: vb ? yb / vb : 0.3 },
    { nombre: 'Asientos', kg: 2 * L('tMAsiento'), x: (m.sillines.xPiloto + m.sillines.xPasajero) / 2, y: (ySillin(true) + ySillin(false)) / 2 },
    { nombre: 'Varios', kg: L('tMVarios'), x: -1.0, y: 0.40 + F.dSuelo },
  ];
}

/** Superficie (m²) de los dos carenados delanteros y sus brazos de arriba, para su masa. */
function pielCarenados(F: FormaBala): number {
  const POD = podDe(F); let A = 0;
  for (let i = 0; i + 1 < POD.length; i++) {
    const a = POD[i], b = POD[i + 1], per = (e: typeof a) => { const h = (e.yt - e.yb) / 2, w = e.wm; return Math.PI * (3 * (h + w) - Math.sqrt((3 * h + w) * (h + 3 * w))); };
    A += (per(a) + per(b)) / 2 * Math.abs(a.x - b.x);
  }
  const brazos = brazosDe(F).reduce((s, b) => s + 2.05 * b.cuerda * Math.max(0, F.VIA_LAT / 2 - F.ladoZ(F.X_LAT + b.x, b.y)), 0);
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
  const area = areaFrontalBala(m, extras);
  let vol = 0; for (let x = F.X_MORRO - 0.025; x > F.X_COLA; x -= 0.05) vol += F.areaSeccion(x, 80).area * 0.05;
  const s = pielBala(F, m.cup);
  const centros = { xPiel: s.xPiel / s.piel, yPiel: s.yPiel / s.piel, xCristal: s.cristal ? s.xCristal / s.cristal : -1, yCristal: s.cristal ? s.yCristal / s.cristal : 1 };
  const piezas = piezasTriciclo(m, ar, centros, { area: pielCarenados(F) });
  const masas: Record<string, number> = {}; for (const p of piezas) masas[p.nombre] = (masas[p.nombre] ?? 0) + p.kg;
  const mVeh = piezas.reduce((a, p) => a + p.kg, 0), mOcc = L('tMOcc');
  const momento = (l: PiezaMasa[]) => { const M = l.reduce((a, p) => a + p.kg, 0); return { masa: M, x: l.reduce((a, p) => a + p.kg * p.x, 0) / M, y: l.reduce((a, p) => a + p.kg * p.y, 0) / M }; };
  const ocupantes = ([true, false] as const).map(pil => { const [x, y] = cgOcupante(m.occPts(pil)); return { nombre: pil ? 'Piloto' : 'Pasajero', kg: mOcc, x, y }; });
  const cg = momento([...piezas, ...ocupantes]), cgSolo = momento([...piezas, ocupantes[0]]), vacio = momento(piezas);
  const Lb = m.batalla, t = F.VIA_LAT;
  const ssf = umbralVuelco(t, cg.x - m.xR, cg.y, Lb), ssfSolo = umbralVuelco(t, cgSolo.x - m.xR, cgSolo.y, Lb);
  const repartoDel = (cg.x - m.xR) / Lb;

  // steering: Ackermann, the turning circle to the outer front wheel
  const di = m.giro, dout = anguloFuera(di, Lb, t), radio = Lb / Math.sin(dout) + 0;

  // the frame: the two rails as one beam on two supports (the battery cradle at x = 0 and the swing-arm pivot), riders and seats on it
  const g = 9.81, apoyo = m.basculante.pivote[0], luz = m.xF - apoyo;
  const cargas: [number, number][] = [[m.xF - m.sillines.xPiloto, (mOcc + L('tMAsiento')) * g], [m.xF - m.sillines.xPasajero, (mOcc + L('tMAsiento')) * g]];
  let Mmax = 0; for (const [a, Fz] of cargas) { const aa = Math.min(luz, Math.max(0, a)); Mmax = Math.max(Mmax, Fz * aa * (luz - aa) / luz); }
  // both loads together: the moment at each load point of the sum
  for (const [a0] of cargas) { let M = 0; for (const [a, Fz] of cargas) { const lo = Math.min(a, a0), hi = Math.max(a, a0); M += Fz * lo * (luz - hi) / luz; } Mmax = Math.max(Mmax, M); }
  const Dm = L('tChD'), tw = L('tChT'), W = 2 * Math.PI * (Dm ** 4 - (Dm - 2 * tw) ** 4) / (32 * Dm);   // two rails, mm³
  const tension = 2.5 * Mmax * 1000 / W, seguridad = MATERIALES_CHASIS[T.tChMat].limite / tension;
  const metros = m.tubos.reduce((a, tb) => a + largoTubo(tb), 0);

  // ── checks
  const ch: (Comprobacion & { dep: DepTriciclo })[] = [];
  const c = (dep: DepTriciclo, nombre: string, holgura: number, minimo: number, mostrar?: string) => ch.push({ nombre, holgura, minimo, dep, ...(mostrar ? { mostrar } : {}) });
  const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  c('rodaje', `Vuelco: aceleración lateral que lo tumba, con dos (objetivo ${fmt(VUELCO_OBJETIVO)} g)`, ssf - AGARRE, VUELCO_OBJETIVO - AGARRE, `${fmt(ssf)} g`);
  c('rodaje', 'Vuelco: con el piloto solo', ssfSolo - AGARRE, VUELCO_OBJETIVO - AGARRE, `${fmt(ssfSolo)} g`);
  const cabezas = ([true, false] as const).map(piloto => {
    const a = cabezaTriciclo(m, piloto, TALLA_SENTADO.p50, esp), b = cabezaTriciclo(m, piloto, TALLA_SENTADO.p95, esp);
    return { quien: piloto ? 'piloto' as const : 'pasajero' as const, p50: a.holgura, p95: b.holgura, x: a.x };
  });
  for (const k of cabezas) {
    const quien = k.quien === 'piloto' ? 'del piloto' : 'del pasajero';
    c('interior', `Cabeza ${quien} a la cúpula (talla media, sin casco)`, k.p50, 0.03);
    c('interior', `Cabeza ${quien} a la cúpula (talla alta, sin casco)`, k.p95, 0.03);
  }
  // the pilot's backrest against the passenger: its back face (pad 3 cm, 14 cm behind the trunk's axis) to the passenger's belly (12 cm ahead of the hips)
  {
    const op = m.occPts(true), oq = m.occPts(false), t0 = 0.30;
    const xRespaldo = op.H[0] + op.d[0] * t0 - op.d[1] * 0.17, yR = op.H[1] + op.d[1] * t0;
    const xVientre = oq.H[0] + oq.d[0] * Math.max(0, (yR - oq.H[1]) / oq.d[1]) + 0.12;
    c('interior', 'Respaldo del piloto al vientre del pasajero', xRespaldo - xVientre, 0.03);
    c('interior', 'Cabeza del piloto a la del pasajero', Math.hypot(op.C[0] - oq.C[0], op.C[1] - oq.C[1]) - 2 * 0.105, 0.05);
    // reach: shoulder to grip, against a 58 cm arm (the viewer's 30 + 28 cm), elbows a little bent
    const hom: P3 = [op.H[0] + op.d[0] * 0.46, op.H[1] + op.d[1] * 0.46, 0.19], puno: P3 = [op.mano[0], op.mano[1], op.anchoMano];
    c('interior', 'Manos del piloto al manillar (alcance)', 0.55 - Math.hypot(puno[0] - hom[0], puno[1] - hom[1], puno[2] - hom[2]), 0.0);
  }
  const [xb, yb, zb] = extremoManillar(F, m.man);
  c('interior', 'Manillar dentro de la carrocería', F.ladoZ(xb, yb) - zb, 0.01);
  c('rodaje', 'Neumático delantero dentro de su carenado (gira con él)', neumaticoCarenado(F), 0.015);
  c('rodaje', 'Carenado delantero a la carrocería, recto', carenadoCuerpo(F), HUECO_CARENADO - 0.002);
  c('rodaje', `Carenado delantero a la carrocería, girado ${Math.round(m.giro * 180 / Math.PI)}°`, huecoGiro(F, m.giro), HUECO_GIRO - 0.002);
  c('rodaje', `Rueda trasera dentro de la cola, hundida ${Math.round(m.recTras * 1000)} mm`, ruedaDentro(F, m.xR, m.rR, F.ANCHO_NEU, m.recTras), 0.02);
  c('rodaje', `Bajos al suelo con la suspensión hundida`, F.D.suelo - Math.max(m.recDel, m.recTras) * 0.6, 0.03);
  // the swing arm's pivot ahead of the rear wheel and behind the passenger's footpegs
  c('rodaje', 'Pivote del basculante detrás de los estribos del pasajero', (-1.30 + (m.sillines.xPasajero - ASIENTO.xPasajero) - 0.06) - m.basculante.pivote[0], 0.02);
  let tub = 9, peor = ''; for (const tb of m.tubos) { const h = tuboDentro(F, tb); if (h < tub) { tub = h; peor = tb.nombre; } }
  c('chasis', `Bastidor dentro de la carrocería${tub < 0.01 ? ` (${peor.toLowerCase()})` : ''}`, tub, 0.01);
  c('chasis', 'Bastidor: coeficiente de seguridad de los largueros', seguridad - 1.3, 0.5, `×${fmt(seguridad, 1)}`);
  for (const b of m.baterias) c('energia', `Batería, ${b.nombre.toLowerCase()}: dentro de la carrocería`, cajaDentro(F, b), 0.01);
  // the pilot's toes (17 cm ahead of the ankle) and the saddle's nose behind the battery
  const pie = m.occPts(true).F[0] + 0.17, ultima = m.baterias[m.baterias.length - 1];
  if (m.baterias.length > 1) c('energia', 'Batería: el módulo de entre los pies, delante del sillín', ultima.x0 - (-0.835 + (m.sillines.xPiloto - ASIENTO.xPiloto) + 0.02), 0.0);
  else c('energia', 'Batería delante de los pies del piloto', m.baterias[0].x0 - pie, 0.02);
  c('propulsion', 'Controlador dentro de la carrocería', cajaDentro(F, m.inversor), 0.01);

  const bala: ResultadosTriciclo = {
    area, vol, piel: ar.carroceria + ar.cristal, cristal: ar.cristal, cupula: [-m.cup.XC0, -m.cup.XC1],
    viaSubida: F.VIA_LAT > m.viaPedida + 1e-9 ? F.VIA_LAT : null, cabezas,
    piezas, cg: { x: cg.x, y: cg.y, masa: cg.masa, vacio: { x: vacio.x, y: vacio.y } }, vuelco: { ssf, ssfSolo, repartoDel },
    giro: { radio, dentro: di * 180 / Math.PI, fuera: dout * 180 / Math.PI },
    bastidor: { M: Mmax, tension, seguridad, metros },
    bateria: { litros: T.tKWh * 1000 / L('tWhL'), kg: T.tKWh * 1000 / L('tWhKg'), litrosMorro: 0.42 * 0.30 * 0.20 * 1000 },
    energia: cd ? energiaTriciclo(m, mVeh + 2 * mOcc, cd) : null,
  };
  const e = bala.energia, nada = NaN;
  return {
    A: area.total, FR: nada, Cd: e?.cd ?? nada, CdA: e?.CdA ?? nada, Crr: CRR, vol, Paero: nada, Proll: nada, Pw: e?.potencia ?? nada, WhKm: e?.WhKm ?? nada, pedWhKm: 0,
    autonomia: e?.autonomia ?? nada, vmax: e?.vmaxNominal ?? nada,
    masas, mVeh, mTot: mVeh + 2 * mOcc, rangoMasa: [nada, nada], Mmax, tension, seguridad, cargaRueda: nada,
    solarPico: 0, solarDia: 0, kmSol: 0, areas: ar, comprobaciones: ch, triciclo: bala,
  };
}

/** Rodadura de neumático de ciclomotor (0,011), motor de buje y controlador al 85 %, 80 W de equipos y la batería usable al 90 %. Supuestos, no medidos. */
export const CRR = 0.011, RENDIMIENTO = 0.85, AUXILIARES = 80, USABLE = 0.9;
/** Consumo, autonomía y velocidades con el Cd del túnel (referido a su área: la sección mayor de la carrocería). */
export function energiaTriciclo(m: ModeloTriciclo, mTot: number, cd: { cd: number; areaRef: number }) {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), g = 9.81, CdA = cd.cd * cd.areaRef;
  const potencia = (v: number) => (0.5 * 1.2 * CdA * v ** 3 + CRR * mTot * g * v) / RENDIMIENTO + AUXILIARES;
  const consumo = (kmh: number) => { const v = kmh / 3.6; return potencia(v) / v / 3.6; };
  const vel = L('tVel'), WhKm = consumo(vel), util = T.tKWh * 1000 * USABLE;
  const vmaxCon = (kW: number) => { let v = 10; for (let i = 0; i < 80; i++) v *= Math.pow(kW * 1000 / potencia(v), 0.34); return v * 3.6; };
  // 0 → 50 km/h: peak power, limited by the grip of the one driven wheel (≈ 40 % of the weight on it, μ 0.9)
  const reparto = 0.4, Fmax = AGARRE * reparto * mTot * g;
  let v = 0.5, t = 0; const dt = 0.02;
  while (v < 50 / 3.6 && t < 60) { const Fz = Math.min(Fmax, L('tKWPico') * 1000 * RENDIMIENTO / v) - 0.5 * 1.2 * CdA * v * v - CRR * mTot * g; if (Fz <= 0) { t = 99; break; } v += Fz / (mTot * 1.03) * dt; t += dt; }
  return { cd: cd.cd, areaRef: cd.areaRef, CdA, WhKm, autonomia: util / WhKm, vmaxNominal: vmaxCon(L('tKWNom')), vmaxPico: vmaxCon(L('tKWPico')), acel50: t, potencia: potencia(vel / 3.6), WhKm50: consumo(50), WhKm100: consumo(100) };
}

/** Superficies de piel (m²): la carrocería y el cristal de la cúpula (como el Cuadriciclo: sin paneles solares). */
export { areasBala as areasTriciclo } from './geometriaBala';
/** ¿Es este modelo un Triciclo? */
export const esTriciclo = (m: { tipo: string }): m is ModeloTriciclo => m.tipo === 'triciclo';
