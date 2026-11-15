// ============================================================================
// CUADRICICLO BASCULANTE · el quinto vehículo del editor (2026-11-15, Eugenio)
// ============================================================================
// Eugenio: «…falta un vehículo de cuatro ruedas basculantes entre la moto y el
// microcoche tipo Twizy de unos 250 kg, como el francés, pero reclinado como el
// velomóvil. Ahí añade el vehículo Lumeneo Smera… un modelo 3D de alta calidad
// pero con un techo un 25 % más bajo y un culo terminado más como el Aptera de
// forma curva hasta la cola, y hazle el carenado a las ruedas delanteras;
// permite modificarlo con slider todos los aspectos. ¡Y que bascule! Con un
// botón».
//
// What it is (see memory/03_DECISIONS.md, 2026-11-15):
//   · Four wheels that all lean, as the Lumeneo Smera's: at each axle two arms
//     across the car pivot on the frame's centre line and hold an upright at
//     each end (a parallelogram). The body leans about the ground under its
//     centre line, the arms stay level with the road and the four wheels lean
//     with the body. An electric actuator drives the lean (the Smera's way).
//   · Tandem two-seater, both riders reclined as in a velomobile: that is what
//     lets the roof be 25 % lower than the Smera's.
//   · The body: ONE closed smooth skin (basculante/forma.ts), narrow nose between
//     two front wheel fairings that steer and lean with their wheels, a glass
//     canopy with a solar roof, and the Aptera's tail curving down to a thin edge.
//   · The two rear wheels sit inside the body, in arches cut in its lower sides
//     big enough for them to rise and fall as the car leans; a hub motor in each.
//
// Pure (no three.js): the tunnel's Web Worker builds it too.

import type { Comprobacion, MaterialCarenado, MaterialChasis, Parametros, PuntosOcupante, Resultados, Rueda, Tubo, P3 } from './geometria';
import { MATERIALES_CARENADO, MATERIALES_CHASIS, RENDIMIENTO_SOLAR, largoTubo } from './geometria';
import { BASCULANTE_DEFECTO, type CamposBasculante, type RuedaBasculante } from './basculante/defecto';
import { crearForma, crearPod, largoCapNariz, limiteCarenados, type DimForma, type EsquinaDel, type FormaBasculante, type Pod } from './basculante/forma';
import { SMERA_REF, dentroPoligono, detallesSmera, mapaSmera, mapearPoligono, perfilSmera } from './basculante/smera';
import { CADERA_SOBRE_ASIENTO, MEDIA_CABEZA, TALLA_SENTADO, rodilla } from './geometriaBala';

export type { CamposBasculante, RuedaBasculante };
export type ClaveBasculante = keyof CamposBasculante;
type ClaveTexto = 'qCarroceria' | 'qRuedasDel' | 'qSolarTecho' | 'qSolarMorro' | 'qSolarCola' | 'qMatCarenado' | 'qChMat' | 'qRuedaDel' | 'qRuedaTras';
export type ClaveNumBasculante = Exclude<ClaveBasculante, ClaveTexto>;

export const NOMBRE_BASCULANTE = 'Cuadriciclo Basculante';

/**
 * The wheels. `d`, `w`: tyre diameter and width (m); `kg`: a wheel with its tyre as a multiple of the «Una rueda» slider
 * (a 14″ scooter wheel); `carga`: what one tyre carries (kg, its load index: 130/70-13 63P = 272 kg, 120/70-14 61P =
 * 257 kg, 120/70-15 56H = 224 kg, 125/80 R13 65Q = 290 kg; the ETRTO table); `inclina`: how far it can lean on its
 * own tread (°): a scooter tyre's round crown about 45°, a car tyre's flat one a few degrees before it rolls onto its
 * shoulder; `kWBuje`: the peak power a hub motor in that rim can credibly give (a rough rule, as the Triciclo's).
 */
export const RUEDAS_BASCULANTE: Record<RuedaBasculante, { d: number; w: number; n: string; kg: number; carga: number; inclina: number; kWBuje: number }> = {
  m13: { d: 0.512, w: 0.13, n: '13″ de scooter, 130/70-13 (512 mm)', kg: 0.95, carga: 272, inclina: 45, kWBuje: 8 },
  m14: { d: 0.524, w: 0.12, n: '14″ de scooter, 120/70-14 (524 mm)', kg: 1, carga: 257, inclina: 45, kWBuje: 9 },
  m15: { d: 0.549, w: 0.12, n: '15″ de scooter, 120/70-15 (549 mm)', kg: 1.08, carga: 224, inclina: 45, kWBuje: 10 },
  c13: { d: 0.530, w: 0.125, n: '13″ de coche, 125/80 R13 (530 mm, Twizy)', kg: 1.25, carga: 290, inclina: 6, kWBuje: 12 },
  // the Smera's: 145/70 R14 in auto123.com's sheet (559 mm); 520 mm measured on Lumeneo's side photo, which is what
  // the replica draws. A round crown as a scooter's (the press front view shows the tread wrapping round the shoulder).
  s14: { d: 0.520, w: 0.145, n: '14″ del Smera, 145/70 R14 (520 mm medidos en la foto)', kg: 1.15, carga: 325, inclina: 40, kWBuje: 15 },
};

// ------------------------------------------------------------------ sliders
export type DepBasculante = 'carroceria' | 'interior' | 'chasis' | 'rodaje' | 'propulsion' | 'energia';
export const DEPS_BASCULANTE: DepBasculante[] = ['carroceria', 'interior', 'chasis', 'rodaje', 'propulsion', 'energia'];
export const LEMAS_BASCULANTE: Record<DepBasculante | 'proyecto', string> = {
  proyecto: 'el resumen: peso, basculación y vuelco, consumo y comprobaciones',
  carroceria: 'la piel lisa, el morro entre los carenados, la cúpula, la cola como el Aptera y el material',
  interior: 'los dos asientos reclinados como en un velomóvil, volante y pedales',
  chasis: 'el bastidor de tubos y las torres de los paralelogramos',
  rodaje: 'ejes, vías, ruedas, la basculación (paralelogramos y actuador), suspensión y dirección',
  propulsion: 'los dos motores en los bujes de las ruedas traseras',
  energia: 'la batería bajo las piernas y los asientos, y el techo solar',
};
export type UnidadB = 'm' | 'cm' | 'mm' | '°' | 'kg' | 'kW' | 'kWh' | 'Wh/kg' | 'Wh/L' | 'km/h' | 'x' | 'kg/m²';
export interface FichaBasculante { clave: ClaveNumBasculante; n: string; dep: DepBasculante; bloque: string; min: number; max: number; paso: number; unidad: UnidadB }
export interface SelectorBasculante { clave: ClaveTexto; n: string; dep: DepBasculante; bloque: string; opciones: { k: string; n: string }[] }

type Fila = [ClaveNumBasculante, DepBasculante, string, string, number, number, number, UnidadB];
// [clave, departamento, bloque, etiqueta, mín, máx, paso, unidad]
const FILAS: Fila[] = [
  ['qAncho', 'carroceria', 'Forma', 'Ancho de la carrocería', 0.72, 1.10, 0.01, 'm'],
  ['qAlto', 'carroceria', 'Forma', 'Alto total (lo más alto del techo)', 0.95, 1.60, 0.005, 'm'],
  ['qSuelo', 'carroceria', 'Forma', 'Altura libre al suelo', 0.08, 0.35, 0.005, 'cm'],
  ['qAnchoIni', 'carroceria', 'Forma', 'Ancho completo: desde (tras el eje delantero)', 0.45, 1.20, 0.01, 'm'],
  ['qAnchoFin', 'carroceria', 'Forma', 'Ancho completo: hasta (tras el eje delantero)', 1.00, 2.20, 0.01, 'm'],
  ['qSeccion', 'carroceria', 'Sección', 'Sección arriba: redonda o en cajón', 1.8, 3.6, 0.05, 'x'],
  ['qPanza', 'carroceria', 'Sección', 'Sección abajo: en quilla, redonda o plana', 1.4, 3.6, 0.05, 'x'],
  ['qCentro', 'carroceria', 'Sección', 'Cintura (lo más ancho): altura', 0.30, 0.60, 0.01, 'x'],
  ['qMorro', 'carroceria', 'Morro y cola', 'Morro: del eje delantero a la punta', 0.20, 0.80, 0.01, 'm'],
  ['qMorroAlto', 'carroceria', 'Morro y cola', 'Morro: altura de la punta', 0.22, 0.55, 0.005, 'cm'],
  ['qMorroPunta', 'carroceria', 'Morro y cola', 'Morro: en punta o redondo', 0, 1, 0.05, 'x'],
  ['qMorroRedondo', 'carroceria', 'Morro y cola', 'Morro: largo de la punta redondeada', 0.10, 0.45, 0.01, 'cm'],
  ['qMorroAncho', 'carroceria', 'Morro y cola', 'Morro: ancho de la punta', 0.30, 0.90, 0.01, 'x'],
  ['qCola', 'carroceria', 'Morro y cola', 'Cola: del eje trasero al borde', 0.25, 1.00, 0.01, 'm'],
  ['qColaAlto', 'carroceria', 'Morro y cola', 'Cola: altura del borde', 0.40, 0.80, 0.005, 'cm'],
  ['qColaCurva', 'carroceria', 'Morro y cola', 'Cola: la curva del techo hasta ella (Aptera)', 1.2, 3.2, 0.05, 'x'],
  ['qColaAncho', 'carroceria', 'Morro y cola', 'Cola: ancho del borde', 0.20, 0.90, 0.01, 'x'],
  ['qColaGrosor', 'carroceria', 'Morro y cola', 'Cola: grosor del borde', 0.02, 0.16, 0.005, 'cm'],
  ['qBajosCola', 'carroceria', 'Morro y cola', 'Bajos de la cola: empiezan a subir (desde el eje trasero)', -0.20, 0.60, 0.01, 'cm'],
  ['qLineaEje', 'carroceria', 'Cúpula', 'Línea del morro: altura sobre el eje delantero', 0.45, 0.95, 0.005, 'cm'],
  ['qParabrisasX', 'carroceria', 'Cúpula', 'Parabrisas: su pie, tras el eje delantero', 0, 0.70, 0.01, 'm'],
  ['qParabrisas', 'carroceria', 'Cúpula', 'Parabrisas: largo (más, más tumbado)', 0.40, 1.20, 0.01, 'm'],
  ['qCaida', 'carroceria', 'Cúpula', 'Techo: empieza a caer hacia la cola', 1.10, 2.40, 0.01, 'm'],
  ['qCintura', 'carroceria', 'Cúpula', 'Ventanas: altura de la cintura', 0.05, 0.60, 0.01, 'x'],
  ['qVentAlto', 'carroceria', 'Cúpula', 'Ventanas: borde de arriba (encima, el techo)', 0.55, 0.97, 0.01, 'x'],
  ['qCupFin', 'carroceria', 'Cúpula', 'Ventanas: acaban (tras el eje delantero)', 1.40, 2.80, 0.01, 'm'],
  ['qSolarIni', 'carroceria', 'Techo solar', 'Techo solar: empieza (tras el eje delantero)', 0.50, 2.20, 0.01, 'm'],
  ['qSolarFin', 'carroceria', 'Techo solar', 'Techo solar: acaba (tras el eje delantero)', 0.80, 2.80, 0.01, 'm'],
  ['qMorroSobre', 'carroceria', 'Ruedas delanteras', 'Morro: altura sobre los pasos de rueda', 0.03, 0.30, 0.005, 'cm'],
  ['qPasoHueco', 'carroceria', 'Ruedas delanteras', 'Paso de rueda: hueco al neumático', 0.015, 0.06, 0.005, 'cm'],
  ['qPasoAbre', 'carroceria', 'Ruedas delanteras', 'Paso de rueda: hasta dónde se abre por el lado (sobre el eje)', 0, 0.45, 0.005, 'cm'],
  ['qPodAlto', 'carroceria', 'Carenados delanteros', 'Carenado: tamaño alrededor de la rueda', 1.03, 1.40, 0.01, 'x'],
  ['qPodAncho', 'carroceria', 'Carenados delanteros', 'Carenado: anchura', 0.90, 1.80, 0.01, 'x'],
  ['qPodFrente', 'carroceria', 'Carenados delanteros', 'Carenado: largo por delante del eje', 1.05, 1.90, 0.01, 'x'],
  ['qPodCola', 'carroceria', 'Carenados delanteros', 'Carenado: largo de la cola', 1.05, 2.60, 0.01, 'x'],
  ['qPodForma', 'carroceria', 'Carenados delanteros', 'Carenado: cola redonda o en punta', 0, 1, 0.05, 'x'],
  ['qPodHueco', 'carroceria', 'Carenados delanteros', 'Carenado: hueco al neumático', 0.015, 0.08, 0.005, 'cm'],
  ['qPodCubre', 'carroceria', 'Carenados delanteros', 'Carenado: cuánto baja (bajo el eje)', 0, 0.90, 0.01, 'x'],
  ['qHuecoCuerpo', 'carroceria', 'Carenados delanteros', 'Carenado a la carrocería (girado e inclinado a tope)', 0.015, 0.08, 0.005, 'cm'],
  ['qEspCarenado', 'carroceria', 'Material y espesores', 'Espesor de la carrocería', 0.6, 2.4, 0.1, 'mm'],
  ['qEspCristal', 'carroceria', 'Material y espesores', 'Espesor de la cúpula (policarbonato)', 1.5, 4.5, 0.5, 'mm'],
  ['qPilX', 'interior', 'Asientos', 'Piloto: cadera tras el eje delantero', 0.30, 1.30, 0.01, 'm'],
  ['qPilY', 'interior', 'Asientos', 'Piloto: altura del asiento', 0.18, 0.75, 0.005, 'cm'],
  ['qRecPil', 'interior', 'Asientos', 'Piloto: reclinado del respaldo', 20, 65, 1, '°'],
  ['qPasX', 'interior', 'Asientos', 'Pasajero: cadera tras el eje delantero', 0.90, 2.10, 0.01, 'm'],
  ['qPasY', 'interior', 'Asientos', 'Pasajero: altura del asiento', 0.18, 0.85, 0.005, 'cm'],
  ['qRecPas', 'interior', 'Asientos', 'Pasajero: reclinado del respaldo', 20, 65, 1, '°'],
  ['qVolX', 'interior', 'Mandos', 'Volante: hacia delante', -0.12, 0.12, 0.01, 'cm'],
  ['qVolY', 'interior', 'Mandos', 'Volante: altura', -0.10, 0.10, 0.01, 'cm'],
  ['qPedX', 'interior', 'Mandos', 'Pedales: hacia delante', -0.15, 0.15, 0.01, 'cm'],
  ['qPedY', 'interior', 'Mandos', 'Pedales: altura', -0.08, 0.30, 0.01, 'cm'],
  ['qMOcc', 'interior', 'Masas', 'Masa por ocupante', 50, 110, 1, 'kg'],
  ['qMAsiento', 'interior', 'Masas', 'Un asiento (carcasa y cojín)', 1.5, 7, 0.5, 'kg'],
  ['qChD', 'chasis', 'Bastidor', 'Tubos: diámetro', 25, 60, 1, 'mm'],
  ['qChT', 'chasis', 'Bastidor', 'Tubos: pared', 1.0, 3.6, 0.1, 'mm'],
  ['qChUniones', 'chasis', 'Bastidor', 'Uniones, chapas y tornillería', 1, 8, 0.5, 'kg'],
  ['qBatalla', 'rodaje', 'Ejes y ruedas', 'Batalla: eje delantero a eje trasero', 1.40, 2.40, 0.01, 'm'],
  ['qViaDel', 'rodaje', 'Ejes y ruedas', 'Vía delantera', 0.50, 1.00, 0.01, 'm'],
  ['qViaTras', 'rodaje', 'Ejes y ruedas', 'Vía trasera', 0.50, 1.00, 0.01, 'm'],
  ['qBascMax', 'rodaje', 'Basculación', 'Inclinación máxima', 5, 40, 1, '°'],
  ['qBrazoAlto', 'rodaje', 'Basculación', 'Paralelogramo: altura del brazo de abajo', 0.16, 0.40, 0.005, 'cm'],
  ['qBrazoSep', 'rodaje', 'Basculación', 'Paralelogramo: separación entre brazos', 0.12, 0.34, 0.005, 'cm'],
  ['qGiro', 'rodaje', 'Suspensión y dirección', 'Giro máximo de las ruedas delanteras', 10, 40, 1, '°'],
  ['qRecDel', 'rodaje', 'Suspensión y dirección', 'Recorrido de la suspensión delantera', 40, 140, 5, 'mm'],
  ['qRecTras', 'rodaje', 'Suspensión y dirección', 'Recorrido de la suspensión trasera', 40, 140, 5, 'mm'],
  ['qMRueda', 'rodaje', 'Masas', 'Una rueda con neumático (14″ de scooter)', 4, 10, 0.1, 'kg'],
  ['qMFreno', 'rodaje', 'Masas', 'Un freno de disco con pinza', 0.6, 2.4, 0.1, 'kg'],
  ['qMSusp', 'rodaje', 'Masas', 'Un pilar telescópico con su muelle', 1.2, 5, 0.1, 'kg'],
  ['qMBrazos', 'rodaje', 'Masas', 'Brazos y cojinetes de los dos paralelogramos', 3, 16, 0.5, 'kg'],
  ['qMActuador', 'rodaje', 'Masas', 'Actuador de la basculación (motor y reductora)', 3, 14, 0.5, 'kg'],
  ['qMDir', 'rodaje', 'Masas', 'Dirección: columna, cremallera y bieletas', 2, 8, 0.5, 'kg'],
  ['qKWNom', 'propulsion', 'Motores', 'Potencia nominal (los dos)', 2, 30, 0.5, 'kW'],
  ['qKWPico', 'propulsion', 'Motores', 'Potencia máxima (los dos)', 4, 50, 0.5, 'kW'],
  ['qMMotor', 'propulsion', 'Motores', 'Motores de buje (los dos)', 8, 50, 0.5, 'kg'],
  ['qMInversor', 'propulsion', 'Motores', 'Controladores (los dos)', 1.5, 12, 0.1, 'kg'],
  ['qVel', 'propulsion', 'Motores', 'Velocidad de cálculo', 40, 120, 5, 'km/h'],
  ['qKWh', 'energia', 'Batería', 'Batería', 2, 20, 0.5, 'kWh'],
  ['qWhKg', 'energia', 'Batería', 'Densidad del paquete (masa)', 120, 220, 5, 'Wh/kg'],
  ['qWhL', 'energia', 'Batería', 'Densidad del paquete (volumen)', 160, 340, 5, 'Wh/L'],
  ['qMVarios', 'energia', 'Varios', 'Varios: cargador, cables, luces, 12 V', 6, 24, 1, 'kg'],
  ['qSolarM2', 'energia', 'Techo solar', 'Paneles solares: masa por m²', 1.2, 3.5, 0.1, 'kg/m²'],
];
let FICHAS: FichaBasculante[] | null = null;
/** The sliders: ONE table, read by the page and by the sweep script. */
export function deslizadoresBasculante(): FichaBasculante[] {
  return FICHAS ?? (FICHAS = FILAS.map(([clave, dep, bloque, n, min, max, paso, unidad]) => ({ clave, dep, bloque, n, min, max, paso, unidad })));
}
export const fichaBasculante = (k: ClaveNumBasculante) => deslizadoresBasculante().find(f => f.clave === k)!;
const ruedas = (l: RuedaBasculante[]) => l.map(k => ({ k, n: RUEDAS_BASCULANTE[k].n }));
export const SELECTORES_BASCULANTE: SelectorBasculante[] = [
  { clave: 'qCarroceria', n: 'Carrocería', dep: 'carroceria', bloque: 'Forma', opciones: [{ k: 'aero', n: 'Aerodinámica (gota, cola del Aptera)' }, { k: 'smera', n: 'Como el Lumeneo Smera (la réplica)' }] },
  { clave: 'qSolarTecho', n: 'Paneles en el techo', dep: 'carroceria', bloque: 'Techo solar', opciones: [{ k: 'si', n: 'Sí' }, { k: 'no', n: 'No' }] },
  { clave: 'qRuedasDel', n: 'Las ruedas delanteras van', dep: 'carroceria', bloque: 'Ruedas delanteras', opciones: [{ k: 'morro', n: 'Dentro del morro (una sola pieza)' }, { k: 'carenados', n: 'Cada una en su carenado (giran con ella)' }] },
  { clave: 'qSolarMorro', n: 'Paneles también en el morro', dep: 'carroceria', bloque: 'Techo solar', opciones: [{ k: 'si', n: 'Sí, delante del parabrisas (como el Aptera)' }, { k: 'no', n: 'Solo techo y cola' }] },
  { clave: 'qSolarCola', n: 'Paneles también en la cola', dep: 'carroceria', bloque: 'Techo solar', opciones: [{ k: 'no', n: 'Solo en el techo' }, { k: 'si', n: 'También en la cubierta de la cola' }] },
  { clave: 'qMatCarenado', n: 'Material de la carrocería', dep: 'carroceria', bloque: 'Material y espesores', opciones: [{ k: 'carbonoLino', n: 'Carbono-lino' }, { k: 'vidrio', n: 'Fibra de vidrio' }, { k: 'carbono', n: 'Fibra de carbono' }] },
  { clave: 'qChMat', n: 'Material de los tubos', dep: 'chasis', bloque: 'Bastidor', opciones: [{ k: 'al6061', n: 'Aluminio 6061-T6' }, { k: 'cromoly', n: 'Acero cromoly 4130' }, { k: 'carbono', n: 'Tubo de carbono' }] },
  { clave: 'qRuedaDel', n: 'Ruedas delanteras', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['m13', 'm14', 'm15', 'c13', 's14']) },
  { clave: 'qRuedaTras', n: 'Ruedas traseras', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['m13', 'm14', 'm15', 'c13', 's14']) },
];
const OPCIONES: Record<ClaveTexto, readonly string[]> = {
  qCarroceria: ['aero', 'smera'], qRuedasDel: ['morro', 'carenados'], qSolarTecho: ['no', 'si'], qSolarMorro: ['no', 'si'], qSolarCola: ['no', 'si'], qMatCarenado: ['carbonoLino', 'vidrio', 'carbono'], qChMat: ['al6061', 'cromoly', 'carbono'],
  qRuedaDel: ['m13', 'm14', 'm15', 'c13', 's14'], qRuedaTras: ['m13', 'm14', 'm15', 'c13', 's14'],
};

/** This vehicle's fields from a design: the defaults for what is missing, a wrong type or an unknown option. */
export function camposBasculante(P: Partial<Parametros>): CamposBasculante {
  const o = { ...BASCULANTE_DEFECTO } as Record<string, unknown>, p = P as Record<string, unknown>;
  for (const k of Object.keys(BASCULANTE_DEFECTO)) {
    const v = p[k], ref = o[k];
    if (v === undefined) continue;
    if (typeof ref === 'number') { if (typeof v === 'number' && Number.isFinite(v)) o[k] = v; }
    else if (typeof v === 'string' && (OPCIONES as Record<string, readonly string[]>)[k]?.includes(v)) o[k] = v;
  }
  return o as unknown as CamposBasculante;
}
/** A slider's value inside its range (a design written by hand cannot build an impossible car). */
export const limitarBasculante = (k: ClaveNumBasculante, Q: CamposBasculante) => { const f = fichaBasculante(k); return Math.min(f.max, Math.max(f.min, Q[k])); };

/** «Largo total»: one lever for the length; it moves only the wheelbase (the nose and the tail keep their shape). */
export function largoBasculante(Q: CamposBasculante) {
  const L = (k: ClaveNumBasculante) => limitarBasculante(k, Q), fb = fichaBasculante('qBatalla');
  const resto = L('qMorro') + L('qCola');
  return { valor: resto + L('qBatalla'), min: resto + fb.min, max: resto + fb.max };
}

// ------------------------------------------------------------------ occupants
/**
 * A reclined rider (velomobile): the hips 10.8 cm over the seat, the trunk `rec` degrees back from the vertical, the
 * head straighter than the trunk (45 % of its recline, so the eyes look ahead and not at the roof), the feet where the
 * pedals or footrests are, the knee where the legs put it. `escala` grows every segment (the tall rider).
 */
export function puntosReclinado(xH: number, yS: number, rec: number, pies: [number, number], escala = 1, mano: { c: [number, number]; ancho: number } | null = null, anchoPiernas?: [number, number, number]): PuntosOcupante {
  const R = rec * Math.PI / 180, RH = R * 0.45;
  const d: [number, number] = [-Math.sin(R), Math.cos(R)], dh: [number, number] = [-Math.sin(RH), Math.cos(RH)];
  const H: [number, number] = [xH, yS + CADERA_SOBRE_ASIENTO * escala];
  const S: [number, number] = [H[0] + d[0] * 0.5 * escala, H[1] + d[1] * 0.5 * escala];
  const C: [number, number] = [S[0] + dh[0] * 0.2 * escala, S[1] + dh[1] * 0.2 * escala];
  const K = rodilla(H, pies, 0.45 * escala, 0.47 * escala);
  const m: [number, number] = mano ? mano.c : [H[0] + (K[0] - H[0]) * 0.6, H[1] + (K[1] - H[1]) * 0.6 + 0.08];
  return { H, S, C, K, F: pies, d, dh, hx: xH, mano: m, anchoMano: mano ? mano.ancho : 0.15, ...(anchoPiernas ? { anchoPiernas } : {}) };
}

// ------------------------------------------------------------------ the model
export interface Esquina {
  id: 'del-der' | 'del-izq' | 'tras-der' | 'tras-izq'; eje: 'del' | 'tras'; s: 1 | -1;
  /** axle x, arm half-length to the upright, the wheel's plane outboard of the upright, tyre radius and width (m) */
  x: number; Lk: number; e: number; r: number; w: number;
  /** the two arms' pivot heights on the frame (m) */
  yInf: number; ySup: number;
}
/**
 * Where one corner is at a lean `phi` (rad, + to the right) and a steering angle `delta` (rad, + to the left), in the
 * body's own axes. The arms turn against the body by β = φ + asin(e·sin φ / Lk): with that, both tyres touch the
 * ground (y = 0 in the world, where the body is turned φ about the ground under its centre line). `base` and `sup`: the
 * two arm ends (the upright between them, parallel to the body); `centro`: the wheel's centre.
 */
export function esquinaEn(q: Esquina, phi: number, delta = 0) {
  const beta = phi + Math.asin(Math.max(-1, Math.min(1, q.e * Math.sin(phi) / Math.max(1e-6, q.Lk))));
  const zb = q.s * q.Lk * Math.cos(beta), dy = q.s * q.Lk * Math.sin(beta);
  const base: P3 = [q.x, q.yInf + dy, zb], sup: P3 = [q.x, q.ySup + dy, zb];
  const centro: P3 = [q.x + q.s * q.e * Math.sin(delta), q.r + dy, zb + q.s * q.e * Math.cos(delta)];
  return { beta, base, sup, centro };
}
/** A point of the body (its own axes) seen in the world at a lean `phi` (the viewer turns the car about x by phi). */
export const alMundo = (p: P3, phi: number): P3 => [p[0], p[1] * Math.cos(phi) - p[2] * Math.sin(phi), p[1] * Math.sin(phi) + p[2] * Math.cos(phi)];

export interface Caja { nombre: string; x0: number; x1: number; y0: number; y1: number; hz: number }
export type ZonaPiel = 'carroceria' | 'cristal' | 'solar' | 'bajos' | 'morro' | 'faro' | 'piloto';
/** The front light bar's distance back from the nose tip and its width, and the tail lamp's (m). */
const FARO_X = 0.055, FARO_W = 0.016, FARO_X_MORRO = 0.022, PILOTO_X0 = 0.014, PILOTO_X1 = 0.036;
/** The canopy's hinge is at the windscreen's foot; it opens this far (°, the rear rises). */
export const ANGULO_CUPULA_B = -50;

/** A front wheel well (`qRuedasDel: 'morro'`): the opening in the side, the well's roof and inner wall, what the nose must hold. */
export interface PasoDel {
  /** the well: centre x, half-length, its foot (the axle's height), its roof's top (m) and the opening's top over the axle (m) */
  arco: { x: number; rx: number; y0: number; yTop: number; abre: number };
  /** the opening in the side and the belly: the skin is cut under this height at x (m), and only outboard of `zIn` */
  yAbre: (x: number) => number;
  /** the well's roof at x (m), inside the body */
  yTecho: (x: number) => number;
  /** the inner wall's z at x (m): the steered and leaned tyre's inner face, less the gap; Infinity away from it */
  zIn: (x: number) => number;
  /** its least value (m) */
  zInMin: number;
  /** the tyre's outer surface in every position, above the opening (x, y, z ≥ 0), with the gap round it */
  rueda: P3[];
  /** what the nose must hold: those points and the well's roof (for crearForma) */
  pts: P3[];
}
/**
 * The front wheel's well (2026-11-15, Eugenio: «quiero que el carenado frontal, el morro, envuelva las 2 ruedas
 * delanteras basculantes con una sola pieza»): the tyre in every position it can take, steered to full lock either way,
 * leaned to the maximum either way (the arms swing it up by Lk·sin β and in by Lk·(1 − cos β)) and with the
 * suspension 60 % in. The nose holds all of it that is above the opening, with `hueco` round it: as a velomobile's, the
 * wheel goes inside the body and only its lower part comes out under it, through an opening `abre` m over the axle
 * at its middle (a flat arch along the well). The well's inner wall follows, along x, the closest the tyre's inner face
 * comes (at the axle, where the tyre only pivots, it stands further out than at its ends, which swing in: the pilot's
 * feet go there); its roof clears the tyre at its highest.
 */
function pasoDelantero(q: Esquina, phiMax: number, giroDentro: number, giroFuera: number, subeSusp: number, hueco: number, abre: number): PasoDel {
  const r = q.r, e = q.e, w = q.w, betaMax = Math.abs(esquinaEn(q, phiMax).beta);
  let rx = 0; for (let k = 0; k <= 20; k++) { const d = Math.max(giroDentro, giroFuera) * k / 20; rx = Math.max(rx, r * Math.cos(d) + (e + w / 2) * Math.sin(d)); }
  rx += hueco;
  const yTop = 2 * r + q.Lk * Math.sin(betaMax) + subeSusp + hueco;
  // (never above the well's own roof: past it, the opening would show the inside of the car)
  abre = Math.min(abre, yTop - r - 0.02);
  const yAbre = (x: number) => { const u = (x - q.x) / rx; return Math.abs(u) >= 1 ? -1 : r + abre * Math.sqrt(1 - u * u); };
  const yTecho = (x: number) => { const u = (x - q.x) / rx; return Math.abs(u) >= 1 ? r : r + (yTop - r) * Math.sqrt(1 - u * u); };
  // the inner face's swept points, seen from above (x, z)
  const mues: [number, number][] = [];
  for (const zK of [q.Lk, q.Lk * Math.cos(betaMax)]) for (let k = 0; k <= 12; k++) {
    const d = -giroDentro + (giroDentro + giroFuera) * k / 12, cs = Math.cos(d), sn = Math.sin(d), lat = e - w / 2;
    for (let i = 0; i <= 24; i++) { const u = -r + 2 * r * i / 24; mues.push([q.x + u * cs + lat * sn, zK + (-u * sn + lat * cs)]); }
  }
  const x0 = q.x - rx - 0.5, x1 = q.x + rx + 0.5, paso = 0.005, rho = 0.10, tabla: number[] = [];
  for (let x = x0; x <= x1 + 1e-9; x += paso) { let m = Infinity; for (const [px, pz] of mues) { const v = pz + (x - px) * (x - px) / (2 * rho); if (v < m) m = v; } tabla.push(m - hueco); }
  const zIn = (x: number) => {
    if (x < x0 || x > x1) return Infinity;
    const u = (x - x0) / paso, i = Math.min(tabla.length - 2, Math.floor(u)), t = u - i;
    return tabla[i] + (tabla[i + 1] - tabla[i]) * t;
  };
  // the tyre's outer half (a scooter tyre: a round section of radius w/2 on a ring of radius r − w/2), in every
  // position, where it is above the opening; each point pushed out by the gap
  const rueda: P3[] = [];
  const giros: number[] = []; for (let k = 0; k <= 8; k++) giros.push(-giroDentro + (giroDentro + giroFuera) * k / 8);
  for (const phi of [-phiMax, 0, phiMax]) for (const sube of [0, subeSusp]) for (const d of giros) {
    const E = esquinaEn(q, phi, 0), cs = Math.cos(d), sn = Math.sin(d), yC = E.centro[1] + sube, zb = E.base[2] * q.s;
    for (const psi of [0, Math.PI / 4, Math.PI / 2]) {
      const rho2 = r - w / 2 + (w / 2) * Math.sin(psi), lat = e + (w / 2) * Math.cos(psi);
      for (let k = 0; k < 32; k++) {
        const a = 2 * Math.PI * k / 32, u = rho2 * Math.sin(a), v = rho2 * Math.cos(a);
        const x = q.x + u * cs + lat * sn, z = zb + (-u * sn + lat * cs), y = yC + v;
        if (y < yAbre(x)) continue;   // under the opening's edge: it shows there
        rueda.push([x, y + hueco * Math.max(0, Math.cos(a)), z + hueco]);
      }
    }
  }
  // the well's roof, 2.5 cm under the skin (the liner and the laminate)
  const techo: P3[] = [];
  for (let i = 0; i <= 30; i++) { const x = q.x - 0.9 * rx + 1.8 * rx * i / 30; techo.push([x, yTecho(x) + 0.025, Math.max(0, zIn(x))]); }
  return { arco: { x: q.x, rx, y0: r, yTop, abre }, yAbre, yTecho, zIn, zInMin: Math.min(...tabla), rueda, pts: [...rueda, ...techo] };
}

export function crearModeloBasculante(P: Parametros) {
  const Q = camposBasculante(P), L = (k: ClaveNumBasculante) => limitarBasculante(k, Q);
  const rd = RUEDAS_BASCULANTE[Q.qRuedaDel], rt = RUEDAS_BASCULANTE[Q.qRuedaTras];
  const rF = rd.d / 2, rR = rt.d / 2, B = L('qBatalla'), xR = -B;
  const xt = xR - L('qCola');
  /** the body: the aerodynamic drop, or as the Lumeneo Smera (the replica, 2026-11-15: basculante/smera.ts) */
  const smera = Q.qCarroceria === 'smera';
  /** the front wheels inside the nose (2026-11-15, the default) or each in its own fairing; the Smera's in its wells */
  const enMorro = smera || Q.qRuedasDel === 'morro';
  const phiMax = L('qBascMax') * Math.PI / 180, giro = L('qGiro') * Math.PI / 180;
  const yInf = L('qBrazoAlto'), ySup = yInf + L('qBrazoSep');
  // the upright stands 3.5 cm inboard of the tyre's inner face; the arms reach it
  const eF = rd.w / 2 + 0.035, eT = rt.w / 2 + 0.035;
  const aF = L('qViaDel') / 2, aT = L('qViaTras') / 2;
  const LkF = Math.max(0.12, aF - eF), LkT = Math.max(0.12, aT - eT);
  const esquinas: Esquina[] = ([['del-der', 'del', 1], ['del-izq', 'del', -1], ['tras-der', 'tras', 1], ['tras-izq', 'tras', -1]] as const).map(([id, eje, s]) => ({
    id, eje, s, x: eje === 'del' ? 0 : xR, Lk: eje === 'del' ? LkF : LkT, e: eje === 'del' ? eF : eT, r: eje === 'del' ? rF : rR, w: eje === 'del' ? rd.w : rt.w, yInf, ySup,
  }));
  const betaMax = (q: Esquina) => esquinaEn(q, phiMax).beta;
  const pod: Pod | null = enMorro ? null : crearPod({ r: rF, w: rd.w, hueco: L('qPodHueco'), alto: L('qPodAlto'), ancho: L('qPodAncho'), frente: L('qPodFrente'), cola: L('qPodCola'), forma: L('qPodForma'), cubre: L('qPodCubre'), n: 2.6 });
  // Ackermann: the outer wheel turns less (its turning circle is the inner one's plus the track)
  const giroFuera = Math.atan(B / (B / Math.tan(giro) + L('qViaDel')));
  const qDel: EsquinaDel = { x: 0, zK: LkF, e: eF, Lk: LkF, betaMax: betaMax(esquinas[0]), giroDentro: giro, giroFuera };
  const limite = pod ? limiteCarenados(pod, qDel, L('qHuecoCuerpo')) : () => Infinity;
  // the front wheel wells, and the nose long enough that its rounded tip starts ahead of them (it would squeeze them)
  // (the Smera's wells open to their roof, as the real car's: the wheels show in them)
  const pasoDel = enMorro ? pasoDelantero(esquinas[0], phiMax, giro, giroFuera, L('qRecDel') / 1000 * 0.6, L('qPasoHueco'), smera ? 9 : L('qPasoAbre')) : null;
  const mapa = smera ? mapaSmera({ morro: L('qMorro'), cola: L('qCola'), batalla: B, alto: L('qAlto'), suelo: L('qSuelo'), ancho: L('qAncho') }) : null;
  const det = mapa ? detallesSmera(mapa) : null;
  const xn = smera ? L('qMorro') : pasoDel ? Math.max(L('qMorro'), pasoDel.arco.x + pasoDel.arco.rx + largoCapNariz({ largoPunta: L('qMorroRedondo'), puntaMorro: L('qMorroPunta') })) : L('qMorro');
  const D0: DimForma = {
    xn, xt, H: L('qAlto'), W: L('qAncho'), suelo: L('qSuelo'),
    yMorro: Math.max(L('qMorroAlto'), L('qSuelo') + 0.06), puntaMorro: L('qMorroPunta'), largoPunta: L('qMorroRedondo'), anchoMorro: L('qMorroAncho'),
    yCapo: 0, lineaEje: L('qLineaEje'), xParabrisas: Math.min(xn - 0.12, -L('qParabrisasX')), largoParabrisas: L('qParabrisas'), xCaida: Math.max(xt + 0.25, -L('qCaida')),
    yCola: Math.max(L('qColaAlto'), L('qSuelo') + L('qColaGrosor') / 2 + 0.03), curvaCola: L('qColaCurva'), anchoCola: L('qColaAncho'), grosorCola: L('qColaGrosor'),
    xBajosCola: Math.max(xt + 0.20, xR + L('qBajosCola')), xBajosMorro: Math.min(0.10, xn - 0.15),
    nU: L('qSeccion'), nL: L('qPanza'), centro: L('qCentro'),
    xAncho0: Math.min(xn - 0.15, -L('qAnchoIni')), xAncho1: Math.max(xt + 0.25, Math.min(-L('qAnchoIni') - 0.05, -L('qAnchoFin'))),
    cintura: L('qCintura'), ventAlto: Math.max(L('qVentAlto'), L('qCintura') + 0.15), xCupFin: Math.max(xt + 0.15, -L('qCupFin')),
    // the Smera: its traced lines, its short round nose cap, and the windscreen's foot where the roof line crosses the bonnet's height
    ...(mapa && det ? (() => {
      const xWsS = mapa.x(-0.098);
      return { perfil: perfilSmera(mapa), yMorro: mapa.y(SMERA_REF.techo[0][1]), largoPunta: SMERA_REF.capLargo, puntaMorro: SMERA_REF.capRedondo, xParabrisas: xWsS, largoParabrisas: xWsS - det.techoIni, xCupFin: det.lunetaX };
    })() : {}),
  };
  const F: FormaBasculante = crearForma(D0, limite, pasoDel && !smera ? { pts: pasoDel.pts, sobre: L('qMorroSobre') } : undefined);
  // (the body as built: with the wheels in the nose its roof and width may have grown to hold them)
  const D = F.D;
  const xWs = D.xParabrisas, xCup = Math.min(xWs - 0.25, D.xCupFin);
  const xS0 = Math.min(xWs - 0.6 * D.largoParabrisas, -L('qSolarIni')), xS1 = Math.max(xCup + 0.03, Math.min(xS0 - 0.10, -L('qSolarFin')));
  const conSolar = Q.qSolarTecho === 'si' && (smera || xS0 - xS1 > 0.05);
  const solarCola = Q.qSolarCola === 'si';
  // the nose's panel (as the Aptera's, on its bonnet): from just ahead of the windscreen forwards over the top of the
  // nose, stopping where the nose starts turning down to its tip (half way from the front axle), on the top of the
  // section only (halfway between the belt and the windows' top): seen from above, a strip with the roof's and the tail's
  const faroX = enMorro ? FARO_X_MORRO : FARO_X;
  const xSM0 = Math.min(xn - faroX - FARO_W - 0.10, xn * 0.5), xSM1 = D.xParabrisas + 0.05, solarMorro = Q.qSolarMorro === 'si' && xSM0 - xSM1 > 0.08;

  // ── the rear wheel arches: big enough for the wheel at full lean and full bump, cut in the lower sides
  const qT = esquinas[2], bT = betaMax(qT), subeT = qT.Lk * Math.sin(bT) + L('qRecTras') / 1000 * 0.6;
  const arco = { x: xR, rx: rR + 0.045, y0: rR, yTop: 2 * rR + subeT + 0.03, zIn: qT.Lk * Math.cos(bT) + qT.e - qT.w / 2 - 0.025, zOut: aT + qT.w / 2 + 0.03 };
  const yArco = (x: number) => { const u = (x - arco.x) / arco.rx; return Math.abs(u) >= 1 ? -1 : arco.y0 + (arco.yTop - arco.y0) * Math.sqrt(1 - u * u); };
  const arcoDel = pasoDel?.arco ?? null;
  /** the front well's roof at x (inside the body), and the side opening's edge (the skin is cut under it) */
  const yArcoDel = (x: number) => pasoDel ? pasoDel.yTecho(x) : -1, yAbreDel = (x: number) => pasoDel ? pasoDel.yAbre(x) : -1;
  /** Is this point of the skin inside a wheel arch's opening (the rear ones, and the front ones in the nose)? */
  const hueco = (p: P3) => (Math.abs(p[2]) > arco.zIn && p[1] < yArco(p[0])) || (!!pasoDel && p[1] < yAbreDel(p[0]) && Math.abs(p[2]) > pasoDel.zIn(p[0]));

  // ── the skin's grid: its lines fall on every zone's edge, so each cell is one zone
  const thB = F.thCintura, thR = F.thVentana, thK = F.thBajos;
  const segTh: [number, number, number][] = [[-Math.PI / 2, thK, 8], [thK, 0, 16], [0, thB, 10], [thB, thR, 12], [thR, Math.PI / 2, 10], [Math.PI / 2, Math.PI - thR, 10], [Math.PI - thR, Math.PI - thB, 12], [Math.PI - thB, Math.PI, 10], [Math.PI, Math.PI - thK, 16], [Math.PI - thK, 1.5 * Math.PI, 8]];
  const ths: number[] = [];
  // (the Smera's windows and door are drawn on the skin by height, not by angle: a finer grid for clean edges)
  for (const [a, b, n] of segTh) for (let j = 0; j < (smera ? 2 * n : n); j++) ths.push(a + (b - a) * j / (smera ? 2 * n : n));
  ths.push(1.5 * Math.PI);
  // (the nose's dark tip, `faroX`: shorter when the nose is the wide one round the wheels, else it is most of its front)
  const nudos = [...(solarMorro ? [xSM0, xSM1] : []), xn, xn - faroX, xn - faroX - FARO_W, xWs, ...(conSolar ? [xS0, xS1] : []), xCup, ...(solarCola ? [xCup - 0.05, xt + 0.10] : []), arco.x + arco.rx, arco.x - arco.rx, ...(arcoDel ? [arcoDel.x + arcoDel.rx, arcoDel.x - arcoDel.rx] : []), xt + PILOTO_X1, xt + PILOTO_X0, xt]
    .filter(x => x <= xn + 1e-9 && x >= xt - 1e-9).sort((a, b) => b - a);
  const xs: number[] = [];
  for (let k = 0; k < nudos.length - 1; k++) {
    const a = nudos[k], b = nudos[k + 1], Lseg = a - b; if (Lseg < 1e-4) continue;
    const enArco = (a <= arco.x + arco.rx + 1e-9 && b >= arco.x - arco.rx - 1e-9) || (!!arcoDel && a <= arcoDel.x + arcoDel.rx + 1e-9 && b >= arcoDel.x - arcoDel.rx - 1e-9);
    const n = Math.max(1, Math.ceil(Lseg / (enArco || smera ? 0.007 : 0.012)));
    for (let i = 0; i < n; i++) {
      // the first segments (the nose cap) cluster towards the tip, where the section shrinks fast
      const t = i / n, u = k === 0 ? 1 - Math.cos(t * Math.PI / 2) : t;
      xs.push(a - Lseg * u);
    }
  }
  xs.push(xt);
  // ── the Smera's skin, by where each point is (side view and how much it faces sideways)
  const polS = det ? { ventana: det.ventana, ventanaTras: det.ventanaTras, pilarB: mapearPoligono(mapa!, [[-1.33, 1.13], [-1.392, 1.15], [-1.392, 1.364], [-1.336, 1.351]]), puerta: det.puerta } : null;
  const yPilarTop = det ? mapa!.y(1.362) : 0, yLuneta = det ? mapa!.y(1.03) : 0;
  const xPilarEn = (y: number) => !det ? 0 : y >= yPilarTop ? det.techoIni : det.pilarX(y);
  const zonaSmera = (x: number, th: number): ZonaPiel => {
    const f = F.frame(x), p = F.sec(f, th), y = p[1], az = Math.abs(p[2]), lado = az > 0.55 * f.hw;
    if (!det || !polS) return 'carroceria';
    // (the rear window: between the two C-pillars, not seen from the side, where the fins are)
    if (x < det.lunetaX && y > yLuneta && az < 0.62 * f.hw) return solarCola ? 'solar' : 'cristal';
    if (y >= det.capoAlto && x > xPilarEn(y)) return 'cristal';
    if (y >= det.mascaraBaja && y < det.capoAlto && x > xPilarEn(det.capoAlto) && az < 0.5 * f.hw) return 'bajos';
    if (lado && (dentroPoligono(polS.ventana, x, y) || dentroPoligono(polS.ventanaTras, x, y))) return 'cristal';
    if (lado && dentroPoligono(polS.pilarB, x, y)) return 'bajos';
    if (conSolar && !lado && x < det.techoIni - 0.04 && x > det.lunetaX + 0.03 && y > yPilarTop - 0.02) return 'solar';
    return 'carroceria';
  };
  /** The Smera's doors: the cells inside the door's outline on each side (+1 right, −1 left, 0 none). */
  const enPuerta = (x: number, th: number): 0 | 1 | -1 => {
    if (!polS) return 0;
    const f = F.frame(x), p = F.sec(f, th);
    return Math.abs(p[2]) > 0.3 * f.hw && dentroPoligono(polS.puerta, x, p[1]) ? (p[2] > 0 ? 1 : -1) : 0;
  };
  const zona = (x: number, th: number): ZonaPiel => {
    if (smera) return zonaSmera(x, th);
    const t = ((th + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI / 2;   // into [−π/2, 3π/2)
    const vientre = t < thK || t > Math.PI - thK;
    if (x > xn - faroX) return 'morro';
    if (x > xn - faroX - FARO_W) return vientre ? 'morro' : 'faro';
    if (x < xt + PILOTO_X0) return 'bajos';
    if (x < xt + PILOTO_X1) return vientre ? 'bajos' : 'piloto';
    if (vientre) return 'bajos';
    if (x <= xWs && x >= xCup && t >= thB && t <= Math.PI - thB) return conSolar && x <= xS0 && x >= xS1 && t >= thR && t <= Math.PI - thR ? 'solar' : 'cristal';
    if (solarMorro && x <= xSM0 && x >= xSM1 && t >= (thB + thR) / 2 && t <= Math.PI - (thB + thR) / 2) return 'solar';
    if (solarCola && x <= xCup - 0.05 && x >= xt + 0.10 && t >= thB + 0.12 && t <= Math.PI - thB - 0.12) return 'solar';
    return 'carroceria';
  };
  /** The canopy that lifts (glass, solar roof and their frame): the cells between the windscreen's foot and the windows' end, above the belt. */
  const enCupula = (x: number, th: number) => { if (smera) return false; const t = ((th + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI / 2; return x <= xWs + 1e-9 && x >= xCup - 1e-9 && t >= thB - 1e-9 && t <= Math.PI - thB + 1e-9; };
  const bisagra: P3 = [xWs, F.techo(xWs) - 0.01, 0];

  // ── trims (black rubber lines) along the canopy's edges, the A-pillars and the arches' lips; the light bars' ends
  const sobre = (x: number, th: number, off = 0.003) => F.sec(F.frame(x), th, off);
  const linea = (n: number, f: (t: number) => P3) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
  const xTechoIni = xWs - D.largoParabrisas;
  const lineas: P3[][] = [];
  // the Smera's: along the door's and the windows' outlines on the side, the windscreen's foot and top across the front
  const ladoEn = (x: number, y: number, s: number, off = 0.003): P3 | null => { const z = F.ladoZ(x, y); return Number.isFinite(z) ? [x, y, s * (z + off)] : null; };
  const contorno = (pol: [number, number][], s: number, n = 24) => {
    const pts: P3[] = [];
    for (let i = 0; i <= pol.length; i++) {
      const a = pol[i % pol.length], b = pol[(i + 1) % pol.length];
      if (i === pol.length) break;
      for (let k = 0; k < n; k++) { const u = k / n, q = ladoEn(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, s); if (q) pts.push(q); }
    }
    if (pts.length) pts.push(pts[0]);
    return pts;
  };
  // the wells' inner edges: where the cut meets the inner wall's plane, along the belly's sides (the opening's edge
  // seen from below and from the front: without a trim the cells' steps show there)
  const bordeDentro = (x: number, zIn: number, yMax: number): number | null => {
    const f = F.frame(x); if (!(f.hw > zIn)) return null;
    let lo = f.bot, hi = Math.min(f.yc, yMax); if (hi <= lo) return null;
    const w = (y: number) => F.ladoZ(x, y);
    if (!(w(hi) >= zIn)) return null;
    for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2, v = w(mid); if (Number.isFinite(v) && v >= zIn) hi = mid; else lo = mid; }
    return hi;
  };
  /** And on the upper half, where the opening reaches above the waist (the nose's sides between the wells). */
  const bordeArriba = (x: number, zIn: number, yMax: number): number | null => {
    const f = F.frame(x); if (!(f.hw > zIn) || yMax <= f.yc) return null;
    const w = (y: number) => F.ladoZ(x, y);
    if (w(yMax) >= zIn) return null;
    let lo = f.yc, hi = yMax;
    for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2, v = w(mid); if (Number.isFinite(v) && v >= zIn) lo = mid; else hi = mid; }
    return lo;
  };
  if (smera && pasoDel && arcoDel) for (const s of [1, -1]) {
    const pts: P3[] = [];
    for (let i = 0; i <= 60; i++) { const x = arcoDel.x - arcoDel.rx + 2 * arcoDel.rx * i / 60, zi = pasoDel.zIn(x), y = bordeDentro(x, zi, yAbreDel(x)); if (y != null) pts.push([x, y, s * (zi + 0.002)]); }
    if (pts.length > 3) lineas.push(pts);
    const alto: P3[] = [];
    for (let i = 0; i <= 60; i++) { const x = arcoDel.x - arcoDel.rx + 2 * arcoDel.rx * i / 60, zi = pasoDel.zIn(x), y = bordeArriba(x, zi, yAbreDel(x)); if (y != null) alto.push([x, y, s * (zi + 0.002)]); }
    if (alto.length > 3) lineas.push(alto);
  }
  if (smera) for (const s of [1, -1]) {
    const pts: P3[] = [];
    for (let i = 0; i <= 50; i++) { const x = arco.x - arco.rx + 2 * arco.rx * i / 50, y = bordeDentro(x, arco.zIn, yArco(x)); if (y != null) pts.push([x, y, s * (arco.zIn + 0.002)]); }
    if (pts.length > 3) lineas.push(pts);
  }
  if (det && polS) {
    for (const s of [1, -1]) for (const pol of [polS.puerta, polS.ventana, polS.ventanaTras]) { const c = contorno(pol, s); if (c.length > 3) lineas.push(c); }
    // the windscreen's foot: across the front at its height, from one A-pillar round the nose to the other
    const xP = xPilarEn(det.capoAlto), pie: P3[] = [];
    let xF = xP; while (xF < xn && F.techo(xF) > det.capoAlto) xF += 0.005;
    for (const s of [-1, 1]) for (let i = 0; i <= 40; i++) { const u = s < 0 ? i / 40 : 1 - i / 40, x = xP + (xF - xP) * u, q = ladoEn(x, det.capoAlto, s); if (q) pie.push(q); }
    if (pie.length > 3) lineas.push(pie);
    // its top (the roof's front) and the rear window's top, across the roof
    for (const xc of [det.techoIni, det.lunetaX]) { const f = F.frame(xc), tope: P3[] = []; for (let i = 0; i <= 48; i++) { const q = F.sec(f, Math.PI * i / 48, 0.003); if (q[1] > yPilarTop - 0.03) tope.push(q); } if (tope.length > 3) lineas.push(tope); }
  }
  for (const s of [1, -1]) {
    const th = (t: number) => (s > 0 ? t : Math.PI - t);
    if (!smera) lineas.push(linea(60, u => sobre(xWs + (xCup - xWs) * u, th(thB))));                                    // the belt
    if (!smera) lineas.push(linea(40, u => sobre(xTechoIni + 0.10 * D.largoParabrisas + (xCup - xTechoIni - 0.10 * D.largoParabrisas) * u, th(thR))));   // the roof rail
    if (!smera) lineas.push(linea(30, u => sobre(xWs - 0.02 - 0.85 * D.largoParabrisas * u, th(thB + (thR - thB) * Math.pow(u, 0.8)))));   // the A-pillar, raked back
    // the rear arch's lip
    const pts: P3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = arco.x - arco.rx + 2 * arco.rx * i / 40, y = Math.max(F.bajos(x) + 0.004, yArco(x)), z = F.ladoZ(x, y);
      if (Number.isFinite(z) && z > arco.zIn) pts.push([x, y, s * (z + 0.003)]);
    }
    if (pts.length > 2) lineas.push(pts);
    // the front arch's lip (the wheels in the nose)
    if (arcoDel && pasoDel) {
      const pd: P3[] = [];
      for (let i = 0; i <= 50; i++) {
        const x = arcoDel.x - arcoDel.rx + 2 * arcoDel.rx * i / 50, y = Math.max(F.bajos(x) + 0.004, yAbreDel(x)), z = F.ladoZ(x, y);
        if (Number.isFinite(z) && z > pasoDel.zIn(x)) pd.push([x, y, s * (z + 0.003)]);
      }
      if (pd.length > 2) lineas.push(pd);
    }
  }
  if (!smera) lineas.push(linea(40, u => sobre(xWs, thB + (Math.PI - 2 * thB) * u)), linea(40, u => sobre(xCup, thB + (Math.PI - 2 * thB) * u)));
  if (conSolar && !smera) lineas.push(linea(30, u => sobre(xS0, thR + (Math.PI - 2 * thR) * u, 0.004)), linea(30, u => sobre(xS1, thR + (Math.PI - 2 * thR) * u, 0.004)));
  // the nose's and the tail's panels framed as the roof's
  const bandaS = (x0: number, x1: number, a: number) => {
    const b = Math.PI - a;
    lineas.push(linea(30, u => sobre(x0, a + (b - a) * u, 0.004)), linea(30, u => sobre(x1, a + (b - a) * u, 0.004)), linea(40, u => sobre(x0 + (x1 - x0) * u, a, 0.004)), linea(40, u => sobre(x0 + (x1 - x0) * u, b, 0.004)));
  };
  if (solarMorro) bandaS(xSM0, xSM1, (thB + thR) / 2);
  if (solarCola) bandaS(xCup - 0.05, xt + 0.10, thB + 0.12);

  // ── interior: the floor, the seats, the riders, the controls
  const sueloIn = D.suelo + 0.025;
  const xPil = -L('qPilX'), yPil = L('qPilY'), recPil = L('qRecPil');
  const xPas = Math.min(xPil - 0.30, -L('qPasX')), yPas = L('qPasY'), recPas = L('qRecPas');
  // the pedals: the heels up, as in a velomobile, so the knees bend and clear the steering wheel
  const pedal: [number, number] = [0.02 + L('qPedX'), 0.38 + L('qPedY')];
  // the steering wheel (a yoke) ahead of the pilot's chest, its rim leaning back with the rider
  const hombroPil = puntosReclinado(xPil, yPil, recPil, pedal).S;
  // (sitting up, as in the Smera, a round wheel lower and nearer, in front of the chest)
  const volante = smera
    ? { c: [hombroPil[0] + 0.32 + L('qVolX'), hombroPil[1] - 0.22 + L('qVolY')] as [number, number], r: 0.17, inc: (60 - recPil * 0.6) * Math.PI / 180 }
    : { c: [hombroPil[0] + 0.40 + L('qVolX'), hombroPil[1] - 0.05 + L('qVolY')] as [number, number], r: 0.15, inc: (25 + recPil * 0.4) * Math.PI / 180 };
  // the passenger's feet on two footrests beside the pilot's seat, outside it (seat 21 cm off the centre line, a foot 5 cm)
  // (in the Smera the passenger sits higher, his feet on the floor beside a slimmer driver's seat, where the body is narrower)
  const piesPas: [number, number] = [xPil + 0.08, sueloIn + (smera ? 0.22 : 0.14)];
  const ANCHO_PIERNAS_PAS: [number, number, number] = smera ? [0.12, 0.19, 0.27] : [0.13, 0.27, 0.29];
  const occTalla = (piloto: boolean, k = 1) => piloto
    ? puntosReclinado(xPil, yPil, recPil, pedal, k, { c: volante.c, ancho: volante.r * 0.92 }, [0.09, 0.075, 0.10])
    : puntosReclinado(xPas, yPas, recPas, piesPas, k, null, ANCHO_PIERNAS_PAS);
  /** A seat's side outline (x, y) and width: cushion, backrest along the trunk and a headrest, 2 cm under the rider. */
  const asiento = (piloto: boolean) => {
    const o = occTalla(piloto), d = o.d, dh = o.dh ?? d, n: [number, number] = [-d[1], d[0]];   // n: perpendicular to the trunk, backwards
    const yS = piloto ? yPil : yPas, H = o.H, bk = 0.10;
    const at = (t: number, off: number): [number, number] => [H[0] + d[0] * t - n[0] * -off, H[1] + d[1] * t - n[1] * -off];
    const frente: [number, number] = [H[0] + 0.30, yS + 0.03], bajo: [number, number] = [H[0] + 0.02, yS - 0.025];
    const cab: [number, number] = [o.S[0] + dh[0] * 0.30 + n[0] * bk, o.S[1] + dh[1] * 0.30 + n[1] * bk];
    // (the passenger's is 30 cm, a velomobile shell's width: its backrest stands between the rear wheel wells, which
    // come in to 18 cm off the centre line when the wheels swing at full lean)
    return { contorno: [frente, bajo, at(-0.02, bk), at(0.55, bk), cab] as [number, number][], ancho: piloto ? (smera ? 0.36 : 0.42) : 0.30, grosor: 0.05 };
  };

  // ── the battery: under the pilot's thighs (between his seat and his heels), then under the passenger's seat
  const kWhPedidos = L('qKWh'), litros = kWhPedidos * 1000 / L('qWhL');
  const zRiel = 0.20, dCh = L('qChD') / 1000, yRiel0 = D.suelo + 0.025 + dCh / 2;
  /** The floor rails' distance off the centre line at x: 20 cm, or 3.5 cm inside the belly where it is narrower (in the nose, 7.5 cm at least). */
  const zRielEn = (x: number) => { const w = F.ladoZ(x, yRiel0 - dCh / 2); return Math.max(0.075, Math.min(zRiel, (Number.isFinite(w) ? w : 0.075) - dCh / 2 - 0.035, pasoDel ? pasoDel.zIn(x) - dCh / 2 - 0.012 : Infinity)); };
  const cajaEn = (nombre: string, x0: number, x1: number, alto: number): Caja | null => {
    if (x1 - x0 < 0.08) return null;
    const y0 = sueloIn, y1 = y0 + alto;
    // between the floor rails (they follow the belly: `zRielEn`), and 1.5 cm inside the skin
    let hz = zRielEn(x0) - dCh / 2 - 0.012; hz = Math.min(hz, zRielEn(x1) - dCh / 2 - 0.012, zRielEn((x0 + x1) / 2) - dCh / 2 - 0.012);
    for (let k = 0; k <= 8; k++) { const x = x0 + (x1 - x0) * k / 8, z = F.ladoZ(x, y1), z0 = F.ladoZ(x, y0); hz = Math.min(hz, (Number.isFinite(z) ? z : 0) - 0.03, (Number.isFinite(z0) ? z0 : 0) - 0.015); }
    return hz > 0.04 ? { nombre, x0, x1, y0, y1, hz } : null;
  };
  const muslo = occTalla(true), pas0 = occTalla(false);
  const volCaja = (c: Caja) => (c.x1 - c.x0) * (c.y1 - c.y0) * 2 * c.hz * 1000;
  const cajas: Caja[] = [];
  // 1. between the rear wheels, under the passenger's backrest (as a Twizy's under its rear seat): from the rear tower
  // to the passenger's pelvis, as tall as the backrest lets it, as wide as the wheel arches' inner walls
  {
    const x0 = xR + 0.075, x1 = Math.min(xPas - 0.17, x0 + 0.45);
    const nP: [number, number] = [-pas0.d[1], pas0.d[0]];   // backwards from the passenger's trunk
    const yRes = (x: number) => pas0.H[1] + (x - (pas0.H[0] - 0.13 * nP[0])) / (pas0.d[0] || -1e-6) * pas0.d[1] - 0.03;   // under the backrest at x
    const alto = Math.max(0.04, Math.min(0.26, Math.min(yRes(x0), yRes(x1)) - sueloIn));
    const c0 = cajaEn('Paquete entre las ruedas traseras, bajo el respaldo del pasajero', x0, x1, alto);
    if (c0) cajas.push(c0);
  }
  // 1b. the Smera's: under the driver's seat, as the real car's (techno-science.net), between the floor and the cushion
  if (smera) { const c = cajaEn('Paquete bajo el asiento del piloto', xPil - 0.12, xPil + 0.22, Math.max(0.03, yPil - 0.03 - sueloIn)); if (c) cajas.push(c); }
  // 2. under the pilot's thighs, where the body is already full width (ahead of that the front fairings narrow it)
  {
    // (it ends where the floor rails start closing in towards the nose)
    let x1 = xPil + 0.13; while (x1 < Math.min(muslo.F[0] - 0.18, -0.02) && zRielEn(x1 + 0.01) > zRielEn(xPil) - 0.01) x1 += 0.01;
    const altoA = Math.min(0.12, Math.max(0.05, Math.min(muslo.H[1] - 0.06, (muslo.K[1] + muslo.F[1]) / 2 - 0.07) - sueloIn));
    const A = litros - cajas.reduce((s, c) => s + volCaja(c), 0) > 0.5 ? cajaEn('Paquete bajo los muslos del piloto', xPil + 0.13, x1, altoA) : null; if (A) cajas.push(A);
  }
  // 3. a flat module under the passenger's seat
  if (litros - cajas.reduce((s, c) => s + volCaja(c), 0) > 0.5) {
    const Bc = cajaEn('Módulo bajo el asiento del pasajero', xPas - 0.10, xPas + 0.24, Math.max(0.03, yPas - 0.025 - sueloIn - 0.01));
    if (Bc) cajas.push(Bc);
  }
  const cabe = cajas.reduce((s, c) => s + volCaja(c), 0);
  // what is drawn is what is asked: each box shrinks in length in proportion if there is more room than litres
  const k = cabe > litros ? litros / cabe : 1;
  const baterias = cajas.map(c => ({ ...c, x0: c.x1 - (c.x1 - c.x0) * k }));

  // ── the frame: two floor rails (in at the nose, between the front fairings), the two towers that carry the
  // parallelograms, cross members under the seats and a hoop behind the pilot up to the belt
  const yRiel = sueloIn + dCh / 2;
  const mat = MATERIALES_CHASIS[Q.qChMat as MaterialChasis].n, dT = dCh, pT = L('qChT') / 1000;
  const tubo = (nombre: string, a: P3, b: P3, curva?: P3[], d = dT): Tubo => ({ nombre, grupo: 'Chasis', a, b, d, pared: pT, material: mat, ...(curva ? { curva } : {}) });
  const tubos: Tubo[] = [];
  const zNariz = 0.075, xTorreT = xR;
  for (const s of [1, -1]) {
    // (they follow the belly: 3.5 cm inside the skin where the body narrows, between the front fairings)
    const pts: P3[] = [];
    for (let i = 0; i <= 20; i++) { const x = xTorreT + (0.04 - xTorreT) * i / 20; pts.push([x, yRiel, s * (i === 0 ? Math.min(zRiel * 0.85, zRielEn(x)) : zRielEn(x))]); }
    pts[pts.length - 1][2] = s * zNariz;
    tubos.push(tubo(`Larguero ${s > 0 ? 'der.' : 'izq.'}`, pts[0], pts[pts.length - 1], pts));
    // the two towers' posts, up to the upper arm's pivot
    tubos.push(tubo(`Torre delantera ${s > 0 ? 'der.' : 'izq.'}`, [0.02, yRiel, s * zNariz], [0.0, ySup + 0.03, s * 0.045]));
    tubos.push(tubo(`Torre trasera ${s > 0 ? 'der.' : 'izq.'}`, pts[0], [xTorreT, ySup + 0.03, s * 0.05]));
    // the hoop behind the pilot's back, up to the belt
    const xa = xPil - 0.42, ya = F.frame(xa).yc + (F.techo(xa) - F.frame(xa).yc) * D.cintura - 0.03, za = (F.ladoZ(xa, ya) || 0.3) - 0.035;
    tubos.push(tubo(`Arco ${s > 0 ? 'der.' : 'izq.'}`, [xa + 0.06, yRiel, s * zRielEn(xa + 0.06)], [xa, ya, s * za]));
  }
  tubos.push(tubo('Travesaño delantero', [0.04, yRiel, -zNariz], [0.04, yRiel, zNariz]));
  // (from rail to rail where they are: where the belly is narrow they come in with it)
  tubos.push(tubo('Travesaño bajo el piloto', [xPil + 0.10, yRiel, -zRielEn(xPil + 0.10)], [xPil + 0.10, yRiel, zRielEn(xPil + 0.10)]));
  tubos.push(tubo('Travesaño bajo el pasajero', [xPas + 0.05, yRiel, -zRielEn(xPas + 0.05)], [xPas + 0.05, yRiel, zRielEn(xPas + 0.05)]));
  { const z0 = Math.abs(tubos[0].a[2]); tubos.push(tubo('Travesaño trasero', [xTorreT, yRiel, -z0], [xTorreT, yRiel, z0])); }
  { const xa = xPil - 0.42, ya = F.frame(xa).yc + (F.techo(xa) - F.frame(xa).yc) * D.cintura - 0.03, za = (F.ladoZ(xa, ya) || 0.3) - 0.035; tubos.push(tubo('Arco: travesaño de arriba', [xa, ya, -za], [xa, ya, za])); }
  tubos.push(tubo('Torre delantera: travesaño', [0.0, ySup + 0.03, -0.045], [0.0, ySup + 0.03, 0.045]));
  tubos.push(tubo('Torre trasera: travesaño', [xTorreT, ySup + 0.03, -0.05], [xTorreT, ySup + 0.03, 0.05]));

  // ── the motors in the rear hubs, their controllers behind the passenger, the tilt actuator on the front tower
  const motor = { r: Math.min(0.11, rR * 0.42), ancho: 0.07 };
  // (on the rear tower, over the arms, between the two motors they feed)
  const inversor: Caja = { nombre: 'Controladores', x0: xR + 0.04, x1: xR + 0.24, y0: ySup + 0.07, y1: ySup + 0.14, hz: 0.10 };
  const actuador = { c: [0.0, (yInf + ySup) / 2, 0] as P3, r: 0.045, largo: 0.16 };
  const cremallera = { x: 0.11, y: yInf + 0.05, z: Math.max(0.05, LkF - 0.08) };
  const columna: [P3, P3] = [[volante.c[0], volante.c[1], 0], [cremallera.x, cremallera.y, 0]];

  // ── the cameras on the A-pillars (as the Aptera's), the indicators at the light bars' ends
  const camaras = [1, -1].map(s => sobre(xWs - 0.08, s > 0 ? thB + 0.08 : Math.PI - thB - 0.08, 0.0));

  const ruedasR: Rueda[] = esquinas.map(q => ({ nombre: q.id, x: q.x, z: q.s * (q.Lk + q.e), r: q.r, w: q.w }));
  const anchoPods = pod ? 2 * (LkF + eF + pod.hz(0)) + 0.01 : 0;
  // (the body's widest: its own width, or, with the wheels in the nose, the nose round them)
  let anchoCuerpo = D.W; for (let x = xn; x >= xt; x -= 0.01) anchoCuerpo = Math.max(anchoCuerpo, 2 * F.frame(x).hw);
  // (the Smera's wheels stand out at the sides: its overall width is over them)
  const anchoTotal = Math.max(anchoCuerpo, anchoPods, smera ? Math.max(aF + eF, aT + eT) * 2 + 0.005 : 0);
  const Lf = xn - xt;
  const Pm: Parametros = { ...P, ...Q, L: Lf, B, W: anchoTotal, H: D.H, clear: D.suelo, track: L('qViaDel'), tiltMax: L('qBascMax') };
  return {
    tipo: 'basculante' as const, P: Pm, campos: Q, F, D, pod,
    xn, xt, Lf, xR, xF: 0, rF, rR, batalla: B, anchoTotal, anchoCuerpo, alto: D.H,
    via: { del: L('qViaDel'), tras: L('qViaTras') }, ruedas: ruedasR, esquinas, phiMax, giro, giroFuera, yInf, ySup,
    /** The most it leans (°): the «Circuito» section reads it (circuito/datos.ts `fichaDeDiseno`). */
    inclinacionMax: L('qBascMax'),
    smera, det, mapa, enPuerta,
    enMorro, pasoDel, arcoDel, yArcoDel, yAbreDel, morroAlargado: xn > L('qMorro') + 0.005,
    arco, hueco, rejilla: { xs, ths }, zona, enCupula, bisagra, lineas, xWs, xCup, xS0, xS1, conSolar, solarCola, solarMorro,
    faro: { x: xn - faroX - FARO_W / 2, thK }, piloto: { x: xt + (PILOTO_X0 + PILOTO_X1) / 2 },
    sueloIn, volante, columna, cremallera, actuador, motor, inversor, camaras,
    asientos: [asiento(true), asiento(false)], plazas: [true, false].map(piloto => ({ piloto, z: 0, pts: occTalla(piloto) })),
    baterias, bateria: { litros, cabe, kWh: kWhPedidos }, tubos,
    occPts: (piloto: boolean) => occTalla(piloto), occTalla,
  };
}
export type ModeloBasculante = ReturnType<typeof crearModeloBasculante>;
export const esBasculante = (m: { tipo: string }): m is ModeloBasculante => m.tipo === 'basculante';

// ------------------------------------------------------------------ areas
const triA = (p: P3, q: P3, r: P3) => {
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
};
/**
 * Skin areas (m²) on the 3D model's own grid: the body's laminate (paint, the black belly, the lamps), the canopy's
 * glass and the solar panel (which lies on laminate, so it counts as both, as in the Aeromóvil 1). The arches'
 * openings are not skin. Plus the two fairings' shells (`carenados`).
 */
export function areasBasculante(m: Pick<ModeloBasculante, 'F' | 'rejilla' | 'zona' | 'hueco' | 'pod'>) {
  const { xs, ths } = m.rejilla, o = { carroceria: 0, cristal: 0, solar: 0, carenados: 0, xPiel: 0, yPiel: 0 };
  const fr = xs.map(x => m.F.frame(x)), pts = fr.map(f => ths.map(t => m.F.sec(f, t)));
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ths.length - 1; j++) {
    const a = pts[i][j], b = pts[i + 1][j], c = pts[i][j + 1], d = pts[i + 1][j + 1];
    const c0: P3 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2, (a[2] + d[2]) / 2];
    if (m.hueco(c0)) continue;
    const s = triA(a, b, c) + triA(b, d, c), z = m.zona((xs[i] + xs[i + 1]) / 2, (ths[j] + ths[j + 1]) / 2);
    if (z === 'cristal') o.cristal += s;
    else { o.carroceria += s; o.xPiel += s * c0[0]; o.yPiel += s * c0[1]; if (z === 'solar') o.solar += s; }
  }
  // the fairing's shell, both of them
  const p = m.pod, nx = 30, nt = 24;
  if (p) for (let i = 0; i < nx; i++) for (let j = 0; j < nt; j++) {
    const x0 = p.x0 + (p.x1 - p.x0) * i / nx, x1 = p.x0 + (p.x1 - p.x0) * (i + 1) / nx;
    const th = (x: number, jj: number) => { const t0 = p.th0(x); return t0 + (Math.PI - 2 * t0) * jj / nt; };
    const a = p.punto(x0, th(x0, j)), b = p.punto(x1, th(x1, j)), c = p.punto(x0, th(x0, j + 1)), d = p.punto(x1, th(x1, j + 1));
    o.carenados += 2 * (triA(a, b, c) + triA(b, d, c));
  }
  return { carroceria: o.carroceria, cristal: o.cristal, solar: o.solar, carenados: o.carenados, centroPiel: [o.xPiel / Math.max(1e-6, o.carroceria), o.yPiel / Math.max(1e-6, o.carroceria)] as [number, number] };
}

// ------------------------------------------------------------------ masses, dynamics and checks
export interface PiezaMasaB { nombre: string; kg: number; x: number; y: number; grupo: DepBasculante; nota?: string }
export interface ResultadosBasculante {
  area: { total: number; cuerpo: number; carenados: number; ruedas: number };
  vol: number; piezas: PiezaMasaB[];
  cg: { x: number; y: number; masa: number; vacio: { x: number; y: number } };
  basculacion: { phiMax: number; aEquilibrada: number; ssfInclinado: number; ssfRecto: number; repartoDel: number; viaEf: number; radio: number };
  bastidor: { metros: number; kg: number };
  bateria: { litros: number; cabe: number; kg: number };
  energia: ReturnType<typeof energiaBasculante> | null;
  ocupantes: number;
  pielCarenados: number;
}
/** Scooter tyres at 2.5 bar (rolling 0.010), hub motors and controllers at 88 %, 80 W of equipment, 90 % of the battery usable. Assumed, not measured. */
export const CRR_B = 0.010, RENDIMIENTO_B = 0.88, AUXILIARES_B = 80, USABLE_B = 0.9;
/** Dry grip of a scooter tyre (g): the lean holds a curve without leaning on the tyres' sideways grip up to tan φ. */
export const AGARRE_B = 0.9;
/** Luggage counted for the tyres' load (kg). */
export const EQUIPAJE_B = 20;

export const grupoPiezaB = (p: PiezaMasaB) => p.grupo;

export function piezasBasculante(m: ModeloBasculante, ar: ReturnType<typeof areasBasculante>): PiezaMasaB[] {
  const Q = m.campos, L = (k: ClaveNumBasculante) => limitarBasculante(k, Q);
  const kgm2mm = MATERIALES_CARENADO[Q.qMatCarenado as MaterialCarenado].kgm2mm;
  const rd = RUEDAS_BASCULANTE[Q.qRuedaDel], rt = RUEDAS_BASCULANTE[Q.qRuedaTras];
  const densidad = MATERIALES_CHASIS[Q.qChMat as MaterialChasis].densidad;
  let kgTubos = 0, metros = 0;
  for (const t of m.tubos) { const l = largoTubo(t); metros += l; kgTubos += Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) * l * densidad; }
  const xc = (m.xWs + m.xCup) / 2, yc = m.F.techo(xc) - 0.15;
  const kgBat = m.bateria.kWh * 1000 / L('qWhKg');
  const vb = m.baterias.reduce((s, c) => s + (c.x1 - c.x0) * (c.y1 - c.y0) * c.hz, 0) || 1;
  const xb = m.baterias.reduce((s, c) => s + (c.x0 + c.x1) / 2 * (c.x1 - c.x0) * (c.y1 - c.y0) * c.hz, 0) / vb, yb = m.baterias[0] ? (m.baterias[0].y0 + m.baterias[0].y1) / 2 : m.sueloIn + 0.05;
  const kgAsiento = L('qMAsiento');
  const a0 = m.occPts(true), a1 = m.occPts(false);
  return [
    { nombre: 'Carrocería', kg: ar.carroceria * L('qEspCarenado') * kgm2mm, x: ar.centroPiel[0], y: ar.centroPiel[1], grupo: 'carroceria', nota: `${ar.carroceria.toFixed(2).replace('.', ',')} m² de laminado` },
    ...(m.pod ? [{ nombre: 'Carenados delanteros (los dos)', kg: ar.carenados * L('qEspCarenado') * kgm2mm, x: 0, y: m.rF, grupo: 'carroceria' as const }] : []),
    { nombre: 'Cúpula de policarbonato', kg: ar.cristal * L('qEspCristal') * 1.2, x: xc, y: yc, grupo: 'carroceria' },
    { nombre: 'Paneles solares', kg: ar.solar * L('qSolarM2'), x: (m.xS0 + m.xS1) / 2, y: m.D.H, grupo: 'energia' },
    { nombre: 'Luces, cámaras y juntas', kg: 3, x: (m.xn + m.xt) / 2, y: 0.6, grupo: 'carroceria' },
    // what a real body carries besides its skin (estimates of parts of their class, not weighed): a sandwich floor with
    // the crash structure under the riders (about 4 kg/m²), the inner lining and insulation (0.8 kg/m² of skin), the
    // canopy's frame, hinge and gas struts, the fan and the demister
    { nombre: 'Suelo de sándwich y refuerzos de choque', kg: 4 * Math.max(0.3, (m.xn - 0.3 - m.xR) * 0.36), x: (m.xR - 0.3) / 2, y: m.sueloIn, grupo: 'carroceria', nota: 'unos 4 kg/m²' },
    { nombre: 'Forro interior y aislamiento', kg: 0.8 * ar.carroceria, x: ar.centroPiel[0], y: ar.centroPiel[1], grupo: 'carroceria' },
    { nombre: 'Marco de la cúpula, bisagra y amortiguadores de gas', kg: 4, x: xc, y: yc, grupo: 'carroceria' },
    { nombre: 'Ventilación y desempañado', kg: 3, x: m.xWs - 0.1, y: m.D.yCapo - 0.1, grupo: 'interior' },
    { nombre: 'Bastidor', kg: kgTubos + L('qChUniones'), x: (m.xR + 0) / 2, y: m.sueloIn + 0.1, grupo: 'chasis', nota: `${metros.toFixed(1).replace('.', ',')} m de tubo` },
    { nombre: 'Ruedas delanteras', kg: 2 * L('qMRueda') * rd.kg, x: 0, y: m.rF, grupo: 'rodaje' },
    { nombre: 'Ruedas traseras', kg: 2 * L('qMRueda') * rt.kg, x: m.xR, y: m.rR, grupo: 'rodaje' },
    { nombre: 'Frenos (cuatro)', kg: 4 * L('qMFreno'), x: m.xR / 2, y: (m.rF + m.rR) / 2, grupo: 'rodaje' },
    { nombre: 'Pilares telescópicos (cuatro)', kg: 4 * L('qMSusp'), x: m.xR / 2, y: (m.yInf + m.ySup) / 2, grupo: 'rodaje' },
    { nombre: 'Paralelogramos (brazos y cojinetes)', kg: L('qMBrazos'), x: m.xR / 2, y: (m.yInf + m.ySup) / 2, grupo: 'rodaje' },
    { nombre: 'Actuador de la basculación', kg: L('qMActuador'), x: m.actuador.c[0], y: m.actuador.c[1], grupo: 'rodaje', nota: 'motor y reductora que inclinan los dos paralelogramos (como el del Smera)' },
    { nombre: 'Dirección', kg: L('qMDir'), x: 0.05, y: m.yInf + 0.1, grupo: 'rodaje' },
    { nombre: 'Motores de buje (los dos)', kg: L('qMMotor'), x: m.xR, y: m.rR, grupo: 'propulsion' },
    { nombre: 'Controladores (los dos)', kg: L('qMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2, grupo: 'propulsion' },
    { nombre: 'Batería', kg: kgBat, x: xb, y: yb, grupo: 'energia', nota: `${m.bateria.kWh.toFixed(1).replace('.', ',')} kWh a ${Math.round(L('qWhKg'))} Wh/kg` },
    { nombre: 'Varios: cargador, cables, 12 V', kg: L('qMVarios'), x: m.xR * 0.6, y: m.sueloIn + 0.1, grupo: 'energia' },
    { nombre: 'Asientos (los dos)', kg: 2 * kgAsiento, x: (a0.H[0] + a1.H[0]) / 2 - 0.1, y: (a0.H[1] + a1.H[1]) / 2 + 0.05, grupo: 'interior' },
    { nombre: 'Volante, pedales y salpicadero', kg: 4, x: m.volante.c[0], y: m.volante.c[1] - 0.1, grupo: 'interior' },
  ];
}

/** Centre of gravity of a seated person from its points (Dempster, 1955, rounded): head 8 %, trunk 50 %, arms 10 %, thighs 20 %, legs 12 %. */
function cgOcupante(o: PuntosOcupante): [number, number] {
  const P: [number, [number, number]][] = [
    [0.08, o.C], [0.50, [o.H[0] + (o.S[0] - o.H[0]) * 0.4, o.H[1] + (o.S[1] - o.H[1]) * 0.4]],
    [0.10, [(o.S[0] + o.mano[0]) / 2, (o.S[1] + o.mano[1]) / 2]], [0.20, [(o.H[0] + o.K[0]) / 2, (o.H[1] + o.K[1]) / 2]], [0.12, [(o.K[0] + o.F[0]) / 2, (o.K[1] + o.F[1]) / 2]],
  ];
  return [P.reduce((s, [mm, p]) => s + mm * p[0], 0), P.reduce((s, [mm, p]) => s + mm * p[1], 0)];
}

/** Consumption, range and speeds with the tunnel's Cd (referred to its area, the body's largest section). */
export function energiaBasculante(m: ModeloBasculante, mTot: number, cd: { cd: number; areaRef: number }, areaSolar: number, reparto = 0.45) {
  const Q = m.campos, L = (k: ClaveNumBasculante) => limitarBasculante(k, Q), g = 9.81, CdA = cd.cd * cd.areaRef;
  const potencia = (v: number) => (0.5 * 1.2 * CdA * v ** 3 + CRR_B * mTot * g * v) / RENDIMIENTO_B + AUXILIARES_B;
  const consumo = (kmh: number) => { const v = kmh / 3.6; return potencia(v) / v / 3.6; };
  const vel = L('qVel'), WhKm = consumo(vel), util = m.bateria.kWh * 1000 * USABLE_B;
  const vmaxCon = (kW: number) => { let v = 10; for (let i = 0; i < 80; i++) v *= Math.pow(kW * 1000 / potencia(v), 0.34); return v * 3.6; };
  // 0 → 50 km/h: peak power, limited by the grip of the two driven rear wheels (their share of the weight, μ 0.9)
  const Fmax = AGARRE_B * (1 - reparto) * mTot * g;
  let v = 0.5, t = 0; const dt = 0.02;
  while (v < 50 / 3.6 && t < 60) { const Fz = Math.min(Fmax, L('qKWPico') * 1000 * RENDIMIENTO_B / v) - 0.5 * 1.2 * CdA * v * v - CRR_B * mTot * g; if (Fz <= 0) { t = 99; break; } v += Fz / (mTot * 1.03) * dt; t += dt; }
  const solarDia = areaSolar * 0.7 * RENDIMIENTO_SOLAR * 4.5 * 1000 * 0.85;
  return { cd: cd.cd, areaRef: cd.areaRef, CdA, WhKm, autonomia: util / WhKm, kmSol: solarDia / WhKm, vmaxNominal: vmaxCon(L('qKWNom')), vmaxPico: vmaxCon(L('qKWPico')), acel50: t, potencia: potencia(vel / 3.6), WhKm50: consumo(50), WhKm100: consumo(100) };
}

/** Is the point inside the body's skin, and by how much (m, sideways; negative outside)? */
function dentro(F: FormaBasculante, x: number, y: number, z: number) {
  if (x > F.D.xn || x < F.D.xt) return -0.1;
  const f = F.frame(x);
  if (y >= f.top || y <= f.bot) return Math.min(y - f.bot, f.top - y) - 0.001;
  const w = F.ladoZ(x, y);
  return Number.isFinite(w) ? Math.min(w - Math.abs(z), f.top - y, y - f.bot) : -0.1;
}

/** The lean's dynamics, for the cornering simulation (`nube/circuito`) and the «Proyecto» block. */
export interface DinamicaBasculante {
  nombre: string;
  /** empty, with both riders, and with them and the luggage (kg) */
  masaVacio: number; masa: number; masaDiseno: number;
  /** centre of gravity with both riders: height over the ground and distance behind the front axle (m) */
  cgAltura: number; cgDetrasEjeDel: number; repartoDel: number;
  viaDel: number; viaTras: number; batalla: number;
  /** the most it leans (°) and the lateral acceleration it balances there (g): tan φ */
  inclinacionMax: number; aEquilibrada: number;
  /** the lateral acceleration that tips it over its outer wheels: upright (tilt locked, at a stop) and leaning to the maximum (g) */
  vuelcoRecto: number; vuelcoInclinado: number;
  /** the tyres' dry grip (g) and how far they can lean on their tread (°) */
  agarre: number; inclinaNeumatico: number;
  /** full front lock (°) and the turning circle to the outer front wheel (m) */
  giroMax: number; radioGiro: number;
  /** frontal area (m², body + fairings + wheels) */
  areaFrontal: number;
}

export function calcularBasculante(m: ModeloBasculante, ar: ReturnType<typeof areasBasculante>, cd?: { cd: number; areaRef: number }): Resultados {
  const Q = m.campos, F = m.F, L = (k: ClaveNumBasculante) => limitarBasculante(k, Q), esp = L('qEspCristal') / 1000;
  const piezas = piezasBasculante(m, ar);
  const masas: Record<string, number> = {}; for (const p of piezas) masas[p.nombre] = (masas[p.nombre] ?? 0) + p.kg;
  const mVeh = piezas.reduce((a, p) => a + p.kg, 0), mOcc = L('qMOcc');
  const momento = (l: { kg: number; x: number; y: number }[]) => { const M = l.reduce((a, p) => a + p.kg, 0); return { masa: M, x: l.reduce((a, p) => a + p.kg * p.x, 0) / M, y: l.reduce((a, p) => a + p.kg * p.y, 0) / M }; };
  const ocupantes = m.plazas.map(q => { const [x, y] = cgOcupante(q.pts); return { kg: mOcc, x, y }; });
  const cg = momento([...piezas, ...ocupantes]), vacio = momento(piezas);
  const Lb = m.batalla, repartoDel = (cg.x - m.xR) / Lb;
  const tEf = m.via.del * repartoDel + m.via.tras * (1 - repartoDel), h = cg.y, phi = m.phiMax;
  const ssfRecto = tEf / (2 * h), ssfInclinado = (tEf / 2 + h * Math.sin(phi)) / (h * Math.cos(phi)), aEq = Math.tan(phi);
  // Ackermann: the turning circle to the outer front wheel
  const di = m.giro, dout = Math.atan(Lb / (Lb / Math.tan(di) + m.via.del)), radio = Lb / Math.sin(dout);

  // ── frontal area: the body's largest section, the fairings' (the shell's projection), the tyres below the skin
  let secMax = 0, vol = 0;
  for (let x = m.xn - 0.01; x > m.xt; x -= 0.02) { const a = F.areaSeccion(x); secMax = Math.max(secMax, a); vol += a * 0.02; }
  let podSec = 0; if (m.pod) for (let xl = m.pod.x0; xl <= m.pod.x1; xl += 0.01) { const t0 = m.pod.th0(xl), hy = m.pod.hy(xl), hz = m.pod.hz(xl); const a = Math.PI * hy * hz * (0.5 + 0.5 * (1 - Math.cos(Math.PI / 2 + t0))) * 0.9; podSec = Math.max(podSec, a); }
  // the front tyres' frontal area: under their fairing's lip, or (in the nose) under the nose's skin just ahead of them
  const sueloDel = m.pod ? m.rF * (1 - L('qPodCubre')) : (() => {
    const a = m.arcoDel!, x = a.x + a.rx + 0.02, f = F.frame(x), zR = m.esquinas[0].Lk + m.esquinas[0].e;
    if (zR >= f.hw) return 2 * m.rF;
    const k = Math.pow(1 - Math.pow(zR / f.hw, F.D.nL), 1 / F.D.nL);
    return Math.max(0, Math.min(2 * m.rF, f.yc - (f.yc - f.bot) * k));
  })(), ruedasA = 2 * RUEDAS_BASCULANTE[Q.qRuedaDel].w * sueloDel * 0.8 + 2 * RUEDAS_BASCULANTE[Q.qRuedaTras].w * Math.max(0, F.D.suelo) * 0.8;
  const area = { cuerpo: secMax, carenados: 2 * podSec, ruedas: ruedasA, total: secMax + 2 * podSec + ruedasA };

  // ── checks
  const ch: Comprobacion[] = [];
  const c = (dep: string, nombre: string, holgura: number, minimo: number, mostrar?: string) => ch.push({ nombre, holgura, minimo, dep, ...(mostrar ? { mostrar } : {}) });
  const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  const grados = Math.round(phi * 180 / Math.PI), lock = Math.round(m.giro * 180 / Math.PI);
  // the lean: the most it can hold and what tips it
  c('rodaje', `Vuelco inclinado a ${grados}° (objetivo 1,05 g)`, ssfInclinado - AGARRE_B, 1.05 - AGARRE_B, `${fmt(ssfInclinado)} g`);
  c('rodaje', `Curva equilibrada inclinándose ${grados}° (sin cargar los neumáticos de lado)`, 1, 0, `${fmt(aEq)} g`);
  c('rodaje', 'Vuelco sin bascular (parado o a paso de peatón, basculación bloqueada)', 1, 0, `${fmt(ssfRecto)} g`);
  // heads (as the Triciclo: the top and back of the skull, every 10° round it, to the inside of the canopy)
  for (const piloto of [true, false]) for (const [talla, n] of [[TALLA_SENTADO.p50, 'talla media'], [TALLA_SENTADO.p95, 'talla alta']] as const) {
    const k = talla / TALLA_SENTADO.p50, o = m.occTalla(piloto, k), a0 = Math.atan2(o.dh![0], o.dh![1]);
    let hh = 9;
    for (let g = -30; g <= 80; g += 10) { const a = a0 - g * Math.PI / 180, x = o.C[0] + Math.sin(a) * MEDIA_CABEZA * k, y = o.C[1] + Math.cos(a) * MEDIA_CABEZA * k; hh = Math.min(hh, F.techo(x) - esp - y); }
    c('interior,carroceria', `Cabeza del ${piloto ? 'piloto' : 'pasajero'} a la cúpula (${n}, sin casco)`, hh, 0.03);
  }
  const op = m.occPts(true), oq = m.occPts(false);
  // shoulders (an average man's, 24.5 cm off the centre line) to the canopy's sides
  for (const [o, n] of [[op, 'piloto'], [oq, 'pasajero']] as const) {
    const S: [number, number] = [o.H[0] + o.d[0] * 0.46, o.H[1] + o.d[1] * 0.46];
    c('interior,carroceria', `Hombros del ${n} a los costados`, (F.ladoZ(S[0], S[1]) || 0) - esp - 0.245, 0.02);
  }
  // the pilot's backrest (its frame, 12 cm behind the trunk's axis) against the passenger's belly (12 cm ahead of his)
  {
    const nP: [number, number] = [op.d[1], -op.d[0]];   // forwards, perpendicular to the pilot's trunk
    const dist = (p: [number, number]) => (p[0] - op.H[0]) * nP[0] + (p[1] - op.H[1]) * nP[1];
    let peor = 9;
    for (let t = 0.05; t <= 0.45; t += 0.05) { const p: [number, number] = [oq.H[0] + oq.d[0] * t, oq.H[1] + oq.d[1] * t]; peor = Math.min(peor, -dist(p) - 0.12 - 0.12); }
    c('interior', 'Respaldo del piloto al vientre del pasajero', peor, 0.03);
    // the passenger's knees round the pilot's backrest (seat half-width 21 cm, knee 6 cm round)
    c('interior', 'Rodillas del pasajero a los lados del asiento del piloto', (oq.anchoPiernas?.[2] ?? 0.27) - 0.06 - m.asientos[0].ancho / 2, 0.0);
    c('interior,carroceria', 'Rodillas del pasajero a los costados', (F.ladoZ(oq.K[0], oq.K[1]) || 0) - esp - ((oq.anchoPiernas?.[2] ?? 0.27) + 0.065), 0.01);
    c('interior,carroceria', 'Pies del pasajero dentro de la carrocería', dentro(F, oq.F[0] + 0.10, oq.F[1] - 0.05, (oq.anchoPiernas?.[1] ?? 0.25) + 0.05), 0.01);
  }
  // the pilot's feet in the nose, toes 17 cm ahead of the ankle
  { const zp = (op.anchoPiernas?.[1] ?? 0.08) + 0.05; c('interior,carroceria', 'Pies del piloto dentro del morro', Math.min(dentro(F, op.F[0] + 0.17, op.F[1] + 0.04, zp), dentro(F, op.F[0], op.F[1] - 0.05, zp)), 0.01); }
  c('interior,carroceria', 'Rodillas del piloto bajo el capó', F.techo(op.K[0]) - 0.015 - (op.K[1] + 0.065), 0.02);
  c('interior,carroceria', m.pod ? 'Rodillas del piloto a los costados (entre los carenados)' : 'Rodillas del piloto a los costados', (F.ladoZ(op.K[0], op.K[1]) || 0) - 0.015 - ((op.anchoPiernas?.[2] ?? 0.11) + 0.065), 0.01);
  // the steering wheel: inside the body, clear of the knees, within reach (shoulder to grip, a 58 cm arm with the elbows a little bent)
  {
    const v = m.volante; let dentroV = 9, rod = 9;
    for (let k = 0; k < 36; k++) {
      const a = 2 * Math.PI * k / 36, z = v.r * Math.cos(a), yy = v.r * Math.sin(a);
      const p: P3 = [v.c[0] + yy * Math.sin(v.inc) * -1, v.c[1] + yy * Math.cos(v.inc), z];
      dentroV = Math.min(dentroV, dentro(F, p[0], p[1], p[2]) - 0.015);
      for (const s of [1, -1]) rod = Math.min(rod, Math.hypot(p[0] - op.K[0], p[1] - op.K[1], p[2] - s * 0.12) - 0.06 - 0.015);
    }
    c('interior', 'Volante dentro de la carrocería', dentroV, 0.01);
    c('interior', 'Rodillas del piloto al volante', rod, 0.02);
    const hom: P3 = [op.H[0] + op.d[0] * 0.46, op.H[1] + op.d[1] * 0.46, 0.19], puno: P3 = [op.mano[0], op.mano[1], op.anchoMano];
    c('interior', 'Manos del piloto al volante (alcance)', 0.55 - Math.hypot(puno[0] - hom[0], puno[1] - hom[1], puno[2] - hom[2]), 0);
  }

  // ── the front corners: steering and lean together (the fairings turn and lean with their wheels)
  if (m.pod) {
    const q = m.esquinas[0], p = m.pod;
    let alCuerpo = 9, alSuelo = 9, neu = 9;
    const pasos = [-1, -0.5, 0, 0.5, 1];
    // (the right-hand corner: a right turn (−) makes it the inner wheel, at full lock; a left turn the outer one, at less)
    for (const fphi of pasos) for (const fdel of pasos) {
      const phiV = fphi * m.phiMax, del = fdel < 0 ? fdel * m.giro : fdel * m.giroFuera, E = esquinaEn(q, phiV, del), cs = Math.cos(del), sn = Math.sin(del);
      for (let i = 0; i <= 20; i++) {
        const xl = p.x0 + (p.x1 - p.x0) * i / 20, t0 = p.th0(xl);
        for (let j = 0; j <= 12; j++) {
          const th = t0 + (Math.PI - 2 * t0) * j / 12, lp = p.punto(xl, th);
          // from the kingpin (the lower arm's end), turned about the upright by the steering
          const lz = q.e + lp[2], bx = q.x + lp[0] * cs + lz * sn, bz = E.base[2] + (-lp[0] * sn + lz * cs);
          const by = E.centro[1] + lp[1];
          // to the body (only where the body is at that height)
          const w = F.ladoZ(bx, by); if (Number.isFinite(w) && lp[2] < 0) alCuerpo = Math.min(alCuerpo, Math.abs(bz) - w);
          // to the ground: the shell's lower lips, in the world
          if (j === 0 || j === 12) alSuelo = Math.min(alSuelo, alMundo([bx, by, bz], phiV)[1]);
        }
      }
    }
    // the tyre's corners against the shell (the steering does not change it: the shell turns with the wheel)
    for (let i = -10; i <= 10; i++) {
      const xl = (q.r + 0) * i / 10, ht = Math.sqrt(Math.max(0, q.r * q.r - xl * xl)), w2 = q.w / 2;
      for (const yy of [ht, -Math.min(ht, -p.yCorte)]) {
        const hy = p.hy(xl), hz = p.hz(xl), kk = Math.pow(Math.pow(w2 / hz, 2.6) + Math.pow(Math.abs(yy) / Math.max(1e-6, hy), 2.6), 1 / 2.6);
        neu = Math.min(neu, (1 - kk) * Math.hypot(w2, yy));
      }
    }
    neu = Math.min(neu, p.x1 - q.r, -p.x0 - q.r);
    c('rodaje,carroceria', 'Neumático delantero dentro de su carenado (gira e inclina con él)', neu, 0.012);
    c('rodaje,carroceria', `Carenado delantero a la carrocería, girado ${lock}° e inclinado ${grados}°`, alCuerpo, L('qHuecoCuerpo') - 0.006);
    c('rodaje,carroceria', `Carenado delantero al suelo, inclinado ${grados}° y girado`, alSuelo, 0.03);
  }
  // ── the front wheels in the nose: the arch's roof under the skin, the pilot's feet and knees clear of the wells
  if (m.pasoDel && m.arcoDel) {
    const a = m.arcoDel, pd = m.pasoDel;
    // the tyre in every position, above the opening, inside the skin (its points already carry the gap); the Smera's
    // wheels show in their wells, as the real car's, so only the well's roof under the bonnet is checked there
    if (!m.smera) { let dentroR = 9; for (const p of pd.rueda) dentroR = Math.min(dentroR, dentro(F, p[0], p[1], p[2])); c('rodaje,carroceria', `Rueda delantera dentro del morro (girada ${lock}°, inclinada ${grados}° y hundida)`, dentroR, -0.005); }
    c('rodaje,carroceria', 'Techo del paso de rueda delantero bajo el capó', F.techo(a.x) - (a.yTop + 0.02), 0.01);
    // the feet (the pedals 7.5 cm off the centre line, a shoe 3.5 cm), heel to toe, beside the wells' inner walls
    const zp = (op.anchoPiernas?.[1] ?? 0.075) + 0.035;
    let pies = 9; for (let k = 0; k <= 10; k++) { const x = op.F[0] - 0.05 + 0.22 * k / 10; if (Math.abs(x - a.x) < a.rx) pies = Math.min(pies, pd.zIn(x) - zp); }
    c('interior,rodaje', 'Pies del piloto entre los pasos de rueda delanteros', pies > 8 ? 0.1 : pies, 0.01);
    // the knees (6.5 cm round) over the wells where they are beside them
    const zK = (op.anchoPiernas?.[2] ?? 0.11) + 0.065, sobre = Math.abs(op.K[0] - a.x) < a.rx && zK > pd.zIn(op.K[0]);
    c('interior,rodaje', 'Rodillas del piloto sobre los pasos de rueda delanteros', sobre ? op.K[1] - 0.065 - m.yArcoDel(op.K[0]) : 0.1, 0.02);
  }
  // ── the body to the ground at full lean (its lowest point, turned about the ground under its centre line)
  {
    let bajo = 9;
    // (not where the skin is cut away for a wheel arch: there is no body there)
    for (let x = m.xn - 0.01; x > m.xt; x -= 0.03) { const f = F.frame(x); for (let j = 0; j <= 24; j++) { const p = F.sec(f, Math.PI + Math.PI * j / 24); if (m.hueco(p)) continue; bajo = Math.min(bajo, alMundo(p, m.phiMax)[1]); } }
    c('rodaje,carroceria', `Carrocería al suelo inclinada ${grados}°`, bajo, 0.03);
  }
  // ── the rear wheels in their arches: the arch top under the body's side (else the cut runs through the side),
  // the passenger's hips clear of the wheel well's inner wall (pelvis 19 cm off the centre line and the seat's shell 2 cm)
  {
    const a = m.arco, zA = F.ladoZ(a.x, a.yTop + 0.02);
    // (the Smera's rear wheels stand out at the sides, as the real car's: its check is the arch's top under the body)
    if (m.smera) c('rodaje,carroceria', `Paso de rueda trasero bajo la carrocería (rueda inclinada ${grados}° y hundida)`, F.techo(a.x) - (a.yTop + 0.02), 0.01);
    else c('rodaje,carroceria', `Paso de rueda trasero cubierto (rueda inclinada ${grados}° y hundida)`, (Number.isFinite(zA) ? zA : 0) - a.zOut, 0.01);
    const solapa = oq.H[0] + 0.12 > a.x - a.rx && oq.H[0] - 0.15 < a.x + a.rx && oq.H[1] < a.yTop;
    c('interior,rodaje', 'Caderas del pasajero al paso de rueda trasero', solapa ? a.zIn - 0.015 - 0.21 : 0.10, 0.015);
    // the passenger's seat (its outline, 2.5 cm thick, half its width plus the edge's 1 cm) beside the wheel wells' inner walls
    {
      const as = m.asientos[1], semi = as.ancho / 2 + 0.01;
      const dentroArco = as.contorno.some(([x, y]) => Math.abs(x - a.x) < a.rx && y < a.yTop);
      c('interior,rodaje', 'Asiento del pasajero al paso de rueda trasero', dentroArco ? a.zIn - semi : 0.10, 0.015);
    }
    // the rear tyre inside the body above its arch: the swept tyre's outer face under the side skin
    let lado = 9;
    const q = m.esquinas[2];
    for (const fphi of [-1, -0.5, 0, 0.5, 1]) {
      const E = esquinaEn(q, fphi * m.phiMax), zo = E.centro[2] + q.w / 2;
      // round the tyre's upper half, from the front to the back (α from the top)
      for (let i = -8; i <= 8; i++) {
        const al = Math.abs(i) / 8 * Math.PI / 2, x = q.x + Math.sign(i) * (q.r + 0.0) * Math.sin(al), y = E.centro[1] + q.r * Math.cos(al);
        const u = (x - a.x) / a.rx, ya = Math.abs(u) < 1 ? a.y0 + (a.yTop - a.y0) * Math.sqrt(1 - u * u) : -1;
        if (y < ya - 0.005) continue;   // in the arch's opening: the tyre shows there, as a car's does
        const w = F.ladoZ(x, y); lado = Math.min(lado, (Number.isFinite(w) ? w : 0) - zo);
      }
    }
    if (!m.smera) c('rodaje,carroceria', 'Rueda trasera bajo la carrocería, fuera del hueco de su paso', lado > 8 ? 0.1 : lado, 0.01);
  }
  // ── the tyres: how far they lean on their tread, and their load (everyone on board and the luggage)
  {
    const nd = RUEDAS_BASCULANTE[Q.qRuedaDel], nt = RUEDAS_BASCULANTE[Q.qRuedaTras], inc = Math.min(nd.inclina, nt.inclina);
    c('rodaje', `Neumáticos: inclinación que admiten (${inc}°) frente a la máxima (${grados}°)`, (inc - grados) / 100, 0, `${grados} de ${inc}°`);
    const mD = mVeh + 2 * mOcc + EQUIPAJE_B, del = mD * repartoDel / 2 * 1.0, tras = mD * (1 - repartoDel) / 2;
    const peor = Math.min(nd.carga / del, nt.carga / tras), [carga, cap] = nd.carga / del <= nt.carga / tras ? [del, nd.carga] : [tras, nt.carga];
    c('rodaje', `Neumáticos: carga por rueda con los dos y ${EQUIPAJE_B} kg de equipaje`, peor - 1, 0, `${Math.round(carga)} de ${cap} kg`);
  }
  c('rodaje', 'Bajos al suelo con la suspensión hundida', F.D.suelo - Math.max(L('qRecDel'), L('qRecTras')) / 1000 * 0.6, 0.03);
  // ── the frame, the battery, the motors
  {
    let tub = 9, peor = '';
    for (const t of m.tubos) {
      const pts = t.curva ?? [t.a, t.b];
      for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k <= 6; k++) { const u = k / 6, p = [0, 1, 2].map(j => pts[i][j] + (pts[i + 1][j] - pts[i][j]) * u) as P3; const hh = dentro(F, p[0], p[1], p[2]) - t.d / 2; if (hh < tub) { tub = hh; peor = t.nombre; } }
    }
    c('chasis', `Bastidor dentro de la carrocería${tub < 0.005 ? ` (${peor.toLowerCase()})` : ''}`, tub, 0.005);
  }
  for (const b of m.baterias) {
    let hh = 9; for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) hh = Math.min(hh, dentro(F, x, y, b.hz));
    c('energia', `Batería, ${b.nombre.toLowerCase()}: dentro de la carrocería`, hh, 0.01);
  }
  const litros = m.bateria.litros, cabe = m.bateria.cabe;
  c('energia', 'Batería: cabe bajo las piernas y los asientos', cabe - litros + 1e-9, 0, litros - cabe > 0.05 ? `${Math.round(litros)} L · caben ${Math.round(cabe)}` : `${Math.round(litros)} L`);
  {
    let hh = 9; const iv = m.inversor; for (const x of [iv.x0, iv.x1]) for (const y of [iv.y0, iv.y1]) hh = Math.min(hh, dentro(F, x, y, iv.hz));
    c('propulsion', 'Controladores dentro de la carrocería', hh, 0.01);
    const kWBuje = RUEDAS_BASCULANTE[Q.qRuedaTras].kWBuje, kWp = L('qKWPico') / 2;
    c('propulsion', 'Motor de buje: potencia que cabe en cada rueda trasera (regla aproximada)', kWBuje - kWp, 0, `${fmt(kWp, 1)} de ${kWBuje} kW por rueda`);
  }

  const kgBat = m.bateria.kWh * 1000 / L('qWhKg');
  const energia = cd ? energiaBasculante(m, mVeh + 2 * mOcc, cd, ar.solar, repartoDel) : null;
  const rb: ResultadosBasculante = {
    area, vol, piezas, cg: { x: cg.x, y: cg.y, masa: cg.masa, vacio: { x: vacio.x, y: vacio.y } },
    basculacion: { phiMax: phi, aEquilibrada: aEq, ssfInclinado, ssfRecto, repartoDel, viaEf: tEf, radio },
    bastidor: { metros: m.tubos.reduce((a, t) => a + largoTubo(t), 0), kg: masas['Bastidor'] ?? 0 },
    bateria: { litros, cabe, kg: kgBat }, energia, ocupantes: 2, pielCarenados: ar.carenados,
  };
  const e = energia, nada = NaN;
  const solarDia = ar.solar * 0.7 * RENDIMIENTO_SOLAR * 4.5 * 1000 * 0.85;
  return {
    A: area.total, FR: nada, Cd: e?.cd ?? nada, CdA: e?.CdA ?? nada, Crr: CRR_B, vol, Paero: nada, Proll: nada, Pw: e?.potencia ?? nada, WhKm: e?.WhKm ?? nada, pedWhKm: 0,
    autonomia: e?.autonomia ?? nada, vmax: e?.vmaxNominal ?? nada,
    masas, mVeh, mTot: mVeh + 2 * mOcc, rangoMasa: [nada, nada], Mmax: nada, tension: nada, seguridad: nada, cargaRueda: nada,
    solarPico: ar.solar * RENDIMIENTO_SOLAR * 1000, solarDia, kmSol: e?.kmSol ?? nada, areas: { carroceria: ar.carroceria, cristal: ar.cristal, solar: ar.solar }, comprobaciones: ch, basculante: rb,
    // the centre of gravity with both riders, where the «Circuito» section looks for it (circuito/datos.ts `fichaDeDiseno`)
    cg: { x: cg.x, y: cg.y, masa: cg.masa },
  };
}

/**
 * The lean's dynamics from a design's parameters (for `nube/circuito`'s cornering simulation): build the model, its
 * masses and its centre of gravity. Pure; about 30 ms.
 */
export function dinamicaBasculante(P: Parametros): DinamicaBasculante {
  const m = crearModeloBasculante(P), ar = areasBasculante(m), r = calcularBasculante(m, ar), b = r.basculante!;
  const L = (k: ClaveNumBasculante) => limitarBasculante(k, m.campos);
  return {
    nombre: NOMBRE_BASCULANTE, masaVacio: r.mVeh, masa: r.mTot, masaDiseno: r.mTot + EQUIPAJE_B,
    cgAltura: b.cg.y, cgDetrasEjeDel: -b.cg.x, repartoDel: b.basculacion.repartoDel,
    viaDel: m.via.del, viaTras: m.via.tras, batalla: m.batalla,
    inclinacionMax: L('qBascMax'), aEquilibrada: b.basculacion.aEquilibrada, vuelcoRecto: b.basculacion.ssfRecto, vuelcoInclinado: b.basculacion.ssfInclinado,
    agarre: AGARRE_B, inclinaNeumatico: Math.min(RUEDAS_BASCULANTE[m.campos.qRuedaDel].inclina, RUEDAS_BASCULANTE[m.campos.qRuedaTras].inclina),
    giroMax: L('qGiro'), radioGiro: b.basculacion.radio, areaFrontal: b.area.total,
  };
}
