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
import { T3, T_CUBIERTA, crearForma, punto, type DimBala, type FormaBala } from './garaje/balaForma';
import { ALETA, APLASTADO_BALA, ASIENTO, BUTACA, alturasPod, anchoMaxPod, anchoSalpicadero, areaMarco, areaXT, bandaMarco, brazosDe, contornoCupula, escalaManillar, extremoManillar, podDe, semiAncho, semiRespaldoButaca, techoEn, ventanasDe, type Asientos, type OpcionesVentanas } from './garaje/balaMedidas';
import { MONTANTE_B, MONTANTE_C, choquesHojas, hojasPuerta, portonDe, puertaDe, vueloPorton, vueloPuerta, type OpcionesPorton, type OpcionesPuertas, type V3 } from './garaje/balaPuertas';
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
  tAsientos: 'horcajadas' | 'filas' | 'butacas';  // a horcajadas (2 plazas, como hasta ahora), tres filas 1 + 2 + 1 o (round 3 interior) dos butacas en tándem como el Aptera
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
  // 2026-11-12 (Eugenio, on the «Cuadriciclo Bala clásico»). Optional when saved: a design without them is built as before.
  tBatDisp: 'reparto' | 'chasis';   // batería repartida (morro, pies, bajo los sillines: hasta ahora) o un paquete a lo largo del bastidor
  tBatLargo: number;   // paquete a lo largo del bastidor: largo (m)
  tBatAncho: number;   // su ancho, en % del ancho del bastidor (de cara exterior a cara exterior de los largueros)
  tBatAlto: number;    // su alto (m)
  tBatX: number;       // dónde empieza (su cara delantera), detrás de donde iba la rueda delantera del Cuadriciclo en rombo (m)
  tMando: 'manillar' | 'volante';   // manillar de moto (hasta ahora) o volante en una columna
  tVolX: number; tVolY: number;      // volante: + hacia el piloto, + arriba (m)
  tVolInc: number;     // inclinación del aro respecto a la vertical, arriba hacia delante (°)
  tVolD: number;       // diámetro del aro (m)
  tSalpicadero: 'no' | 'si' | 'blanco';   // la pantallita sobre el depósito (hasta ahora), un salpicadero de lado a lado o (round 3 interior) uno blanco con más detalles
  tSalpY: number;      // salpicadero: + arriba (m)
  tSalpFondo: number;  // salpicadero: cuánto llega hacia el piloto desde el pie del parabrisas (m)
  tAcceso: 'cupula' | 'puertas';    // la cúpula entera se abre (hasta ahora) o dos puertas laterales como las del Aptera
  tPuertaDel: number;  // puerta: esquina de abajo-delante, detrás de donde iba la rueda delantera del Cuadriciclo en rombo (m)
  tPuertaTras: number; // puerta: canto de atrás, lo mismo (m)
  tUmbral: number;     // puerta: altura del umbral sobre el suelo (m, con la carrocería sin subir)
  tCintura: number;    // puerta: la ventanilla empieza esto por encima del borde del cristal de la cúpula (m)
  tBisagraY: number;   // puerta: dónde va la bisagra a lo largo del montante (0 su pie, 1 donde se junta con el techo)
  tBisagraInc: number; // puerta: el eje, girado desde la tangente del montante ahí (°, + más empinado)
  tBisagraDentro: number; // puerta: y se inclina hacia dentro arriba (°, de frente)
  tPuertaAbre: number; // puerta: ángulo de apertura (°)
  tRetrovisores: 'camaras' | 'espejos';   // cámaras en cápsulas (hasta ahora) o retrovisores de gota
  tMaletero: 'cola' | 'aptera';     // tapa de lo alto de la cola (hasta ahora) o portón largo como el del Aptera (solo con puertas)
  tMalIni: number;     // portón: su bisagra, detrás de donde iba la rueda delantera del Cuadriciclo en rombo (m)
  tMalAbre: number;    // portón: ángulo de apertura (°)
  tMalLado: number;    // portón: sus cantos, este ángulo hacia arriba desde el centro de la sección de la cola (°): más, más estrecho
  tSolarCola: 'no' | 'si';  // paneles solares: solo en la cúpula (hasta ahora) o también por encima de la cola hasta su aro
  // Round 3 interior (seats, dashboard, chassis, masses, battery ranges). Optional when saved: absent is today's frame.
  tChLargo: 'torreta' | 'eje';   // largueros hasta la torreta del amortiguador (hasta ahora) o hasta el eje trasero con una cuna trasera (solo con dos ruedas traseras)
  tChSep: number;      // separación de los dos largueros, de eje a eje (m), con una carrocería de 85 cm de ancho o más (más estrecha, se juntan con ella)
  // ── Round 3 body (nose, tail, roof, hatch, fin, solar, second door) — 2026-11-12, Eugenio on the «Cuadriciclo Bala
  // clásico». Optional when saved: a design without them is built as before (each default is today's shape).
  tMorroLinea: number;   // la punta del morro: 0 en aguja (la ojiva de hasta ahora) … 1 una línea ancha y horizontal como el Aptera
  tMorroAlto: number;    // la punta del morro, más arriba (+) o más abajo (−) que hasta ahora (m)
  tFaro: 'no' | 'si' | 'barra';    // un faro en el centro del morro, en su punta, como el de una moto; o (2026-11-13) una barra de luz por todo el borde del morro, como el Aptera
  tFaroD: number;        // su ancho (m); con el morro en línea se aplasta en óvalo
  tColaPlana: number;    // la punta de la cola: 0 en punta (hasta ahora) … 1 plana, ancha y cortada como el Aptera
  tTechoPlano: number;   // lo alto de la carrocería: 0 redondeado (hasta ahora) … 1 plano
  tCaida: number;        // la caída del techo hacia el maletero y la cola: − cae antes, + aguanta arriba y cae más tarde
  tConAleta: 'si' | 'no';    // la aleta de cola (hasta ahora, siempre)
  tSolarMorro: 'no' | 'si';  // paneles solares también encima del morro
  tPuertas2: 'no' | 'si';    // una segunda puerta por lado, para los pasajeros, que se abre hacia atrás
  tPuerta2Parte: number; // dónde se parten las dos puertas, detrás de donde iba la rueda delantera del Cuadriciclo en rombo (m)
  tBisagra2Y: number;    // puerta de atrás: dónde va su bisagra a lo largo de su canto de atrás (0 abajo, 1 arriba)
  tBisagra2Inc: number;  // puerta de atrás: su eje, con lo de arriba inclinado hacia delante (°)
  tPuerta2Abre: number;  // puerta de atrás: ángulo de apertura (°)
  tLineaCupula: number;  // la línea entre la carrocería pintada y el cristal de la cúpula, más arriba (+) o más abajo (−), todo alrededor (m)
  // ── Round 4 doors / roof frame / height (2026-11-13, Eugenio on the «Cuadriciclo Bala clásico»). Optional when saved:
  // absent, 0 (no frame), and the design is built exactly as before.
  tMarcoTecho: number;   // marco de laminado entre el techo solar y el cristal: arriba del parabrisas y a lo largo de los dos carriles del techo (m; 0, sin marco)
  // ── The smooth body (2026-11-13). Optional when saved: absent is 'redonda', the shape as before.
  tCubierta: 'redonda' | 'lisa';  // la parte de arriba del morro y de la cola: la de la cúpula (hasta ahora) o una cubierta lisa sin montículos, como el Aptera
  tColaAncho: number;    // la cola vista desde arriba: 0 se estrecha (hasta ahora) … 1 todo el ancho hasta un borde recto
  tColaGrosor: number;   // el grosor del borde de la cola (m): 0 se cierra en punta
  tColaBombeo: number;   // lo que sube la cubierta de la cola sobre la recta de su canto al centro (m): 0 plana
  tBajosIni: number;     // los bajos de la cola empiezan a subir esto por delante del eje trasero (m; − detrás)
  tBajosCurva: number;   // cuánto suben: 0 como hasta ahora … 1 una curva larga hasta el borde (Aptera)
  tMorroAncho: number;   // el morro visto desde arriba: 0 como hasta ahora … 1 todo el ancho, con el frente cuadrado y redondeado
  tMorroGrosor: number;  // el grosor del borde del morro (m): 0 se cierra en punta
  tMorroBombeo: number;  // lo que sube el capó sobre la recta de su canto al centro (m)
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
/**
 * Round 3 interior (2026-11-12, «revisa el tema de los pesos»): `carga`, what one tyre carries (kg): the car sizes' load
 * index (71, 75 and 77: 345, 387 and 412 kg, the ETRTO table; a 175/55 R15 77T, «max load 908 lbs»: tiresize.com); a
 * moped tyre of 70-80 mm, index 41-46, about 150-170 kg (approximate: the size alone does not fix it). And the car wheels
 * re-weighed: a 175/55 R15 tyre is 7.3 kg (Kumho Solus KH16, tiresize.com) and a 15 × 5.5″ cast alloy rim about 6 kg:
 * 13.3 kg, 2.96 times the moped wheel's 4.5 kg (it was 2.7: 12.2 kg). The 14″ and 13″ scaled the same way (tyre about
 * 6.3 and 5.6 kg, rim 5.5 and 5.0): 11.8 and 10.6 kg. Estimates on the published tyre, not weighed wheels.
 */
export const RUEDAS_TRICICLO: Record<RuedaTriciclo, { d: number; neuDel: number; neuTras: number; n: string; kg: number; kWBuje: number; carga: number }> = {
  '16': { d: 0.405, neuDel: 0.07, neuTras: 0.08, n: '16″ de ciclomotor (405 mm)', kg: 1, kWBuje: 6, carga: 150 },
  '20': { d: 0.508, neuDel: 0.07, neuTras: 0.08, n: '20″ de ciclomotor (508 mm)', kg: 1, kWBuje: 10, carga: 160 },
  '24': { d: 0.61, neuDel: 0.07, neuTras: 0.08, n: '24″ de ciclomotor (610 mm)', kg: 1, kWBuje: 12, carga: 165 },
  '26': { d: 0.66, neuDel: 0.07, neuTras: 0.08, n: '26″ de ciclomotor (660 mm)', kg: 1, kWBuje: 12, carga: 170 },
  '28': { d: 0.70, neuDel: 0.07, neuTras: 0.08, n: '28″ de ciclomotor (700 mm)', kg: 1, kWBuje: 12, carga: 170 },
  // tyre diameter = rim + 2 × width × profile: 330 + 2·145·0.70, 356 + 2·165·0.60, 381 + 2·175·0.55 (mm)
  c13: { d: 0.533, neuDel: 0.145, neuTras: 0.145, n: '13″ de coche, 145/70 R13 (533 mm)', kg: 2.36, kWBuje: 35, carga: 345 },
  c14: { d: 0.554, neuDel: 0.165, neuTras: 0.165, n: '14″ de coche, 165/60 R14 (554 mm)', kg: 2.62, kWBuje: 45, carga: 387 },
  c15: { d: 0.574, neuDel: 0.175, neuTras: 0.175, n: '15″ de coche, 175/55 R15 (574 mm)', kg: 2.96, kWBuje: 60, carga: 412 },
};
type ClaveTexto = 'tCubierta' | 'tChLargo' | 'tFaro' | 'tConAleta' | 'tSolarMorro' | 'tPuertas2' | 'tSolarCola' | 'tMatCarenado' | 'tChMat' | 'tRuedaDel' | 'tRuedaTras' | 'tVentanas' | 'tAsientos' | 'tFila2' | 'tFila3' | 'tTraseras' | 'tBatDisp' | 'tMando' | 'tSalpicadero' | 'tAcceso' | 'tRetrovisores' | 'tMaletero';
export type ClaveNumTriciclo = Exclude<ClaveTriciclo, ClaveTexto>;

// ------------------------------------------------------------------ deslizadores
/** Los departamentos del Triciclo (los del Aeromóvil 1 que tienen algo que mover aquí). */
export type DepTriciclo = 'carroceria' | 'interior' | 'chasis' | 'rodaje' | 'propulsion' | 'energia';
export const DEPS_TRICICLO: DepTriciclo[] = ['carroceria', 'interior', 'chasis', 'rodaje', 'propulsion', 'energia'];
/** Lo que es cada departamento en el Triciclo (los lemas del Aeromóvil 1 hablan de sus piezas, no de estas). */
export const LEMAS_TRICICLO: Record<DepTriciclo | 'proyecto', string> = {
  proyecto: 'el resumen: comprobaciones, peso, consumo y vuelco',
  carroceria: 'la piel del Cuadriciclo en rombo, techo solar y ventanas, carenados y material',
  interior: 'los asientos (a horcajadas, dos butacas como el Aptera o tres filas que se pliegan), manillar, plataformas y maletero',
  chasis: 'el bastidor de tubos dentro de la carrocería',
  rodaje: 'ejes, vía, ruedas, suspensión y dirección',
  propulsion: 'el motor en el buje de la rueda trasera',
  energia: 'la batería (morro, pies y bajo los sillines) y el techo solar',
};
/** The «Cuadriciclo Bala clásico» (2026-11-11): its name and its departments' one-liners where they differ. */
export const esCuatro = (T: Pick<CamposTriciclo, 'tTraseras'>) => T.tTraseras === 'dos';
export const nombreTriciclo = (T: Pick<CamposTriciclo, 'tTraseras'>) => esCuatro(T) ? 'Cuadriciclo Bala clásico' : 'Triciclo Bala';
/** The departments' one-liners for these parameters (2026-11-12: they follow the battery's layout, the controls and the access too). */
export const lemasTriciclo = (T: Pick<CamposTriciclo, 'tTraseras'> & Partial<CamposTriciclo>): Record<DepTriciclo | 'proyecto', string> => {
  const o = { ...LEMAS_TRICICLO };
  if (esCuatro(T)) o.propulsion = 'los dos motores en los bujes de las ruedas traseras';
  if (T.tBatDisp === 'chasis') o.energia = 'la batería (un paquete a lo largo del bastidor) y el techo solar';
  // (round 3 interior: either dashboard; with the Aptera buckets, pedals instead of footboards)
  if (T.tMando === 'volante' || conSalpicadero(T as CamposTriciclo) || T.tAsientos === 'butacas') o.interior = `los asientos (a horcajadas, dos butacas como el Aptera o tres filas que se pliegan), ${T.tMando === 'volante' ? 'volante' : 'manillar'}${conSalpicadero(T as CamposTriciclo) ? ', salpicadero' : ''}, ${T.tAsientos === 'butacas' ? 'pedales' : 'plataformas'} y maletero`;
  if (T.tAcceso === 'puertas') o.carroceria = 'la piel del Cuadriciclo en rombo, techo solar y ventanas, puertas y portón como el Aptera, carenados y material';
  return o;
};
export type Unidad = 'm' | 'cm' | 'mm' | '°' | 'kg' | 'kW' | 'kWh' | 'Wh/kg' | 'Wh/L' | 'km/h' | 'x' | 'kg/m²' | '%';
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
  // (round 3, 2026-11-12, «que el morro se pueda achatar más»: 20 cm shorter and a fuller tip than before; see rangoTriciclo)
  ['tMorro', 'carroceria', 'Morro y cola', 'bMorro', '', 0.20, 1.20, 0.01, 'm'],
  ['tPuntaMorro', 'carroceria', 'Morro y cola', 'bPuntaMorro', '', 0.15, 1.20, 0.01, 'x'],
  ['tCola', 'carroceria', 'Morro y cola', 'bCola', '', 0.45, 1.20, 0.01, 'm'],
  ['tPuntaCola', 'carroceria', 'Morro y cola', 'bPuntaCola', '', 0.30, 0.85, 0.005, 'm'],
  ['tAleta', 'carroceria', 'Morro y cola', 'bAleta', '', 0, 0, 0, 'm'],
  ['tCupIni', 'carroceria', 'Cúpula', 'bCupIni', '', 0, 0, 0, 'm'],
  // (round 3: «que el alto de la cúpula, de donde acaba la cúpula, no esté limitado»: from 1.30 m to 10 cm ahead of the
  // rear axle, and up to 1.90 m tall; the checks say what each end costs. Not lower than 1.15: at 1.05 the real clásico's
  // steering-column support stood 7 cm out of the body)
  ['tCupFin', 'carroceria', 'Cúpula', 'bCupFin', '', 1.30, 3.30, 0.01, 'm'],
  ['tAlto', 'carroceria', 'Cúpula', 'bAlto', '', 1.00, 1.90, 0.002, 'm'],
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
  // 2026-11-12: Aptera-style doors and hatch (only with «Dos puertas como el Aptera»)
  ['tPuertaDel', 'carroceria', 'Puertas y maletero', null, 'Puerta: esquina de abajo, delante', 0.62, 0.98, 0.01, 'm'],
  // (round 4, 2026-11-13, «la puerta trasera es demasiado estrecha»: up to 2.60, so a passengers' door can be wide; its real end is 20 cm ahead of the canopy's end, `rangoTriciclo`)
  ['tPuertaTras', 'carroceria', 'Puertas y maletero', null, 'Puerta: canto de atrás', 1.40, 2.60, 0.01, 'm'],
  ['tUmbral', 'carroceria', 'Puertas y maletero', null, 'Puerta: altura del umbral', 0.26, 0.42, 0.01, 'cm'],
  ['tCintura', 'carroceria', 'Puertas y maletero', null, 'Puerta: línea de la ventanilla (sobre el cristal)', 0, 0.16, 0.01, 'cm'],
  ['tBisagraY', 'carroceria', 'Puertas y maletero', null, 'Bisagra: dónde, a lo largo del montante', 0.02, 0.90, 0.01, 'x'],
  ['tBisagraInc', 'carroceria', 'Puertas y maletero', null, 'Bisagra: el eje, más empinado que el montante', -12, 20, 1, '°'],
  ['tBisagraDentro', 'carroceria', 'Puertas y maletero', null, 'Bisagra: el eje se inclina hacia dentro', 0, 28, 1, '°'],
  ['tPuertaAbre', 'carroceria', 'Puertas y maletero', null, 'Puerta: ángulo de apertura', 40, 115, 1, '°'],
  // (round 3: «que el maletero empiece un poco más atrás»: up to 45 cm from the tail's light ring, behind the doors; see rangoTriciclo)
  ['tMalIni', 'carroceria', 'Puertas y maletero', null, 'Portón: dónde está su bisagra', 1.10, 3.40, 0.01, 'm'],
  ['tMalAbre', 'carroceria', 'Puertas y maletero', null, 'Portón: ángulo de apertura', 26, 70, 1, '°'],
  // round 2: how wide the hatch is (its side edges' elevation on the tail section; the Aptera's, about 60°)
  ['tMalLado', 'carroceria', 'Puertas y maletero', null, 'Portón: altura de sus cantos (lo ancho que es)', 25, 75, 1, '°'],
  // ── Round 3 body (nose, tail, roof, hatch, fin, solar, second door), 2026-11-12
  ['tMorroLinea', 'carroceria', 'Morro y cola', null, 'Morro: en punta o en línea (como el Aptera)', 0, 1, 0.05, 'x'],
  ['tMorroAlto', 'carroceria', 'Morro y cola', null, 'Morro: altura de la punta (más baja, más alta)', -0.12, 0.40, 0.005, 'cm'],
  ['tFaroD', 'carroceria', 'Morro y cola', null, 'Faro central: ancho', 0.10, 0.24, 0.01, 'cm'],
  ['tColaPlana', 'carroceria', 'Morro y cola', null, 'Cola: en punta o plana y ancha (como el Aptera)', 0, 1, 0.05, 'x'],
  ['tTechoPlano', 'carroceria', 'Cúpula', null, 'Techo: redondeado o plano', 0, 1, 0.05, 'x'],
  ['tCaida', 'carroceria', 'Cúpula', null, 'Techo: caída hacia el maletero (antes o más tarde)', -0.60, 0.80, 0.05, 'x'],
  ['tLineaCupula', 'carroceria', 'Cúpula', null, 'Línea entre carrocería y cristal: altura', -0.03, 0.15, 0.005, 'cm'],
  // ── The smooth body (2026-11-13): only with «Cubierta lisa» (Aeromovil.tsx `visible`)
  ['tMorroAncho', 'carroceria', 'Morro y cola', null, 'Morro: ancho del frente (hasta todo el ancho, como el Aptera)', 0, 1, 0.05, 'x'],
  ['tMorroGrosor', 'carroceria', 'Morro y cola', null, 'Morro: grosor del borde de delante', 0, 0.25, 0.005, 'cm'],
  ['tMorroBombeo', 'carroceria', 'Morro y cola', null, 'Capó: bombeo (de plano a curvado)', 0, 0.05, 0.0025, 'cm'],
  ['tColaAncho', 'carroceria', 'Morro y cola', null, 'Cola: ancho al final (hasta todo el ancho, como el Aptera)', 0, 1, 0.05, 'x'],
  ['tColaGrosor', 'carroceria', 'Morro y cola', null, 'Cola: grosor del borde de atrás', 0, 0.25, 0.005, 'cm'],
  ['tColaBombeo', 'carroceria', 'Morro y cola', null, 'Cola: bombeo de la cubierta (de plana a curvada)', 0, 0.04, 0.0025, 'cm'],
  ['tBajosIni', 'carroceria', 'Morro y cola', null, 'Bajos de la cola: dónde empiezan a subir (desde el eje trasero)', -0.05, 0.80, 0.01, 'cm'],
  ['tBajosCurva', 'carroceria', 'Morro y cola', null, 'Bajos de la cola: cuánto suben hasta el borde', 0, 1, 0.05, 'x'],
  ['tPuerta2Parte', 'carroceria', 'Puertas y maletero', null, 'Segunda puerta: dónde se parten las dos', 0.90, 1.90, 0.01, 'm'],
  ['tBisagra2Y', 'carroceria', 'Puertas y maletero', null, 'Segunda puerta: bisagra a lo largo de su canto de atrás', 0.05, 0.95, 0.01, 'x'],
  ['tBisagra2Inc', 'carroceria', 'Puertas y maletero', null, 'Segunda puerta: el eje, inclinado hacia delante arriba', 0, 45, 1, '°'],
  ['tPuerta2Abre', 'carroceria', 'Puertas y maletero', null, 'Segunda puerta: ángulo de apertura', 40, 120, 1, '°'],
  // ── Round 4 doors / roof frame / height (2026-11-13)
  ['tMarcoTecho', 'carroceria', 'Techo solar y ventanas', null, 'Marco del techo solar: ancho (0, sin marco)', 0, 0.15, 0.005, 'cm'],
  ['tEspCarenado', 'carroceria', 'Material y espesores', null, 'Espesor de la carrocería', 0.6, 2.4, 0.1, 'mm'],
  ['tEspCristal', 'carroceria', 'Material y espesores', null, 'Espesor de la cúpula (policarbonato)', 1.5, 4.5, 0.5, 'mm'],
  ['tPilX', 'interior', 'Asientos', 'bPilX', '', 0, 0, 0, 'm'],
  // 2026-11-12 («que los asientos estén todavía más bajos, muy pegados al chasis»): down to 6 cm over what is under them (rangoTriciclo)
  ['tPilY', 'interior', 'Asientos', 'bPilY', '', 0.20, 0.50, 0.005, 'm'],
  ['tRecPil', 'interior', 'Asientos', null, 'Reclinado del piloto', -10, 35, 1, '°'],
  ['tPasX', 'interior', 'Asientos', 'bPasX', '', 0, 0, 0, 'm'],
  ['tPasY', 'interior', 'Asientos', 'bPasY', '', 0.20, 0.52, 0.005, 'm'],
  ['tRecPas', 'interior', 'Asientos', null, 'Reclinado del pasajero', -10, 35, 1, '°'],
  ['tManX', 'interior', 'Mandos', null, 'Manillar: hacia el piloto', -0.06, 0.25, 0.01, 'cm'],
  ['tManY', 'interior', 'Mandos', null, 'Manillar: altura', -0.02, 0.10, 0.01, 'cm'],
  ['tPiesX', 'interior', 'Mandos', null, 'Plataformas: hacia delante', -0.08, 0.08, 0.01, 'cm'],
  ['tPiesY', 'interior', 'Mandos', null, 'Plataformas: altura', -0.04, 0.04, 0.01, 'cm'],
  // 2026-11-12: the steering wheel (only with «Volante») and the dashboard (only with «Salpicadero de lado a lado»)
  ['tVolX', 'interior', 'Mandos', null, 'Volante: hacia el piloto', -0.10, 0.30, 0.01, 'cm'],
  ['tVolY', 'interior', 'Mandos', null, 'Volante: altura', -0.10, 0.10, 0.01, 'cm'],
  ['tVolInc', 'interior', 'Mandos', null, 'Volante: inclinación (arriba hacia delante)', 10, 50, 1, '°'],
  ['tVolD', 'interior', 'Mandos', null, 'Volante: diámetro', 0.28, 0.36, 0.01, 'cm'],
  ['tSalpY', 'interior', 'Salpicadero', null, 'Salpicadero: altura', -0.08, 0.08, 0.01, 'cm'],
  ['tSalpFondo', 'interior', 'Salpicadero', null, 'Salpicadero: fondo hacia el piloto', 0.14, 0.34, 0.01, 'cm'],
  ['tFila2X', 'interior', 'Tres filas', null, 'Fila 2: caderas detrás de las del piloto', 0.60, 0.85, 0.01, 'cm'],
  ['tFila3X', 'interior', 'Tres filas', null, 'Fila 3: caderas detrás de las de la fila 2', 0.55, 0.80, 0.01, 'cm'],
  ['tRecFila', 'interior', 'Tres filas', null, 'Reclinado de las filas 2 y 3', -5, 35, 1, '°'],
  ['tMOcc', 'interior', 'Masas', null, 'Masa por ocupante', 50, 110, 1, 'kg'],
  ['tMAsiento', 'interior', 'Masas', null, 'Un asiento (sillín y respaldo)', 1.5, 5.5, 0.5, 'kg'],
  ['tChD', 'chasis', 'Bastidor', null, 'Tubos: diámetro', 30, 60, 1, 'mm'],
  ['tChT', 'chasis', 'Bastidor', null, 'Tubos: pared', 1.2, 3.6, 0.1, 'mm'],
  ['tChUniones', 'chasis', 'Bastidor', null, 'Uniones, chapas y tornillería', 1, 6, 0.5, 'kg'],
  // round 3 interior (2026-11-12, «permite poder hacer un poco más ancho la separación entre los dos tubos»): its maximum, what keeps them on the belly (`rangoTriciclo`)
  ['tChSep', 'chasis', 'Bastidor', null, 'Largueros: separación', 0.18, 0.60, 0.01, 'cm'],
  // (round 2, 2026-11-12: up to 3.40 m, so «Largo total» can still grow the saved clásico, at 3.20)
  ['tBatalla', 'rodaje', 'Ejes y ruedas', 'bBatalla', '', 2.20, 3.40, 0.01, 'm'],
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
  // 2026-11-12: one pack along the frame (only with «A lo largo del bastidor»): its size decides its capacity
  // (round 3 interior, 2026-11-12, «no lo limites»: length and width up to what fits in the body, `rangoTriciclo`; the checks say the rest)
  ['tBatLargo', 'energia', 'Batería', null, 'Paquete: largo', 0.40, 3.20, 0.01, 'm'],
  ['tBatAncho', 'energia', 'Batería', null, 'Paquete: ancho (del ancho del bastidor)', 100, 400, 5, '%'],
  ['tBatAlto', 'energia', 'Batería', null, 'Paquete: alto', 0.05, 0.14, 0.005, 'cm'],
  ['tBatX', 'energia', 'Batería', null, 'Paquete: dónde empieza', 0.30, 1.20, 0.01, 'm'],
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
const DESDE_EJE: Partial<Record<ClaveNumTriciclo, 1 | -1>> = { tMorro: 1, tCupIni: -1, tCupFin: -1, tPilX: -1, tPasX: -1, tBatalla: -1, tSolar: -1, tPilar: -1, tBatX: -1, tPuertaDel: -1, tPuertaTras: -1, tMalIni: -1, tPuerta2Parte: -1 };
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
  { clave: 'tSolarCola', n: 'Paneles solares por detrás', dep: 'carroceria', bloque: 'Techo solar y ventanas', opciones: [{ k: 'no', n: 'Solo en la cúpula' }, { k: 'si', n: 'Hasta la punta de la cola (como el Aptera)' }] },
  { clave: 'tVentanas', n: 'Cúpula', dep: 'carroceria', bloque: 'Techo solar y ventanas', opciones: [{ k: 'marco', n: 'Ventanas laterales con montante (Aptera)' }, { k: 'burbuja', n: 'De una pieza (como el Cuadriciclo en rombo)' }] },
  { clave: 'tAsientos', n: 'Asientos', dep: 'interior', bloque: 'Asientos', opciones: [{ k: 'horcajadas', n: 'A horcajadas (2 plazas)' }, { k: 'butacas', n: 'Dos butacas como el Aptera (2 plazas)' }, { k: 'filas', n: 'Tres filas: 1 + 2 + 1 (4 plazas)' }] },
  { clave: 'tFila2', n: 'Fila 2 (dos asientos juntos)', dep: 'interior', bloque: 'Tres filas', opciones: [{ k: 'abierta', n: 'Abierta: dos pasajeros' }, { k: 'plegada', n: 'Plegada: maletero' }] },
  { clave: 'tFila3', n: 'Fila 3 (un asiento pequeño)', dep: 'interior', bloque: 'Tres filas', opciones: [{ k: 'abierta', n: 'Abierta: un pasajero' }, { k: 'plegada', n: 'Plegada: maletero' }] },
  { clave: 'tMatCarenado', n: 'Material de la carrocería', dep: 'carroceria', bloque: 'Material y espesores', opciones: [{ k: 'carbonoLino', n: 'Carbono-lino' }, { k: 'vidrio', n: 'Fibra de vidrio' }, { k: 'carbono', n: 'Fibra de carbono' }] },
  { clave: 'tChMat', n: 'Material de los tubos', dep: 'chasis', bloque: 'Bastidor', opciones: [{ k: 'al6061', n: 'Aluminio 6061-T6' }, { k: 'cromoly', n: 'Acero cromoly 4130' }, { k: 'carbono', n: 'Tubo de carbono' }] },
  { clave: 'tRuedaDel', n: 'Ruedas delanteras (en los carenados)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['16', '20', '24', '26', '28', 'c13', 'c14', 'c15']) },
  { clave: 'tRuedaTras', n: 'Rueda trasera (dentro de la cola)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['20', '24', '26', '28', 'c13', 'c14', 'c15']) },
  { clave: 'tTraseras', n: 'Ruedas traseras', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: [{ k: 'una', n: 'Una en la cola (triciclo)' }, { k: 'dos', n: 'Dos en carenados (cuatro ruedas)' }] },
  // 2026-11-12
  { clave: 'tAcceso', n: 'Acceso', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'cupula', n: 'La cúpula entera se abre' }, { k: 'puertas', n: 'Dos puertas como el Aptera' }] },
  { clave: 'tMaletero', n: 'Maletero', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'cola', n: 'Tapa en lo alto de la cola' }, { k: 'aptera', n: 'Portón largo como el Aptera (con puertas)' }] },
  { clave: 'tRetrovisores', n: 'Retrovisores', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'camaras', n: 'Cámaras en cápsulas' }, { k: 'espejos', n: 'Espejos de gota (como el Aptera)' }] },
  // ── Round 3 body (nose, tail, roof, hatch, fin, solar, second door), 2026-11-12
  { clave: 'tFaro', n: 'Faro del morro', dep: 'carroceria', bloque: 'Morro y cola', opciones: [{ k: 'no', n: 'Sin faro central' }, { k: 'si', n: 'Faro central redondo (como una moto)' }, { k: 'barra', n: 'Barra de luz por todo el borde (como el Aptera)' }] },
  // 2026-11-13: the smooth body
  { clave: 'tCubierta', n: 'Morro y cola por arriba', dep: 'carroceria', bloque: 'Morro y cola', opciones: [{ k: 'redonda', n: 'Como la cúpula (redondeados)' }, { k: 'lisa', n: 'Cubierta lisa, sin montículos (como el Aptera)' }] },
  { clave: 'tConAleta', n: 'Aleta', dep: 'carroceria', bloque: 'Morro y cola', opciones: [{ k: 'si', n: 'Con aleta' }, { k: 'no', n: 'Sin aleta' }] },
  { clave: 'tSolarMorro', n: 'Paneles solares en el morro', dep: 'carroceria', bloque: 'Techo solar y ventanas', opciones: [{ k: 'no', n: 'No' }, { k: 'si', n: 'Sí, encima del morro' }] },
  { clave: 'tPuertas2', n: 'Puertas por lado', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'no', n: 'Una' }, { k: 'si', n: 'Dos: la de atrás se abre hacia atrás' }] },
  { clave: 'tMando', n: 'Mando', dep: 'interior', bloque: 'Mandos', opciones: [{ k: 'manillar', n: 'Manillar' }, { k: 'volante', n: 'Volante' }] },
  { clave: 'tSalpicadero', n: 'Salpicadero', dep: 'interior', bloque: 'Salpicadero', opciones: [{ k: 'no', n: 'Pantallita sobre el depósito' }, { k: 'si', n: 'Salpicadero de lado a lado' }, { k: 'blanco', n: 'Salpicadero blanco con detalles (como el Aptera)' }] },
  // round 3 interior (2026-11-12, «el chasis no llega hasta el final»): only with two rear wheels (with one, the wheel is in the tail between them)
  { clave: 'tChLargo', n: 'Largueros: hasta', dep: 'chasis', bloque: 'Bastidor', opciones: [{ k: 'torreta', n: 'La torreta' }, { k: 'eje', n: 'El eje trasero' }] },
  { clave: 'tBatDisp', n: 'Dónde va la batería', dep: 'energia', bloque: 'Batería', opciones: [{ k: 'reparto', n: 'Morro, pies y bajo los sillines' }, { k: 'chasis', n: 'A lo largo del bastidor' }] },
];
/** 2026-11-12: which of those options are on (the Aptera hatch only with doors: it takes the canopy's rear part, which a one-piece canopy carries away when it opens). */
export const conPuertas = (T: Pick<CamposTriciclo, 'tAcceso'>) => T.tAcceso === 'puertas';
export const conPortonAptera = (T: Pick<CamposTriciclo, 'tAcceso' | 'tMaletero'>) => T.tAcceso === 'puertas' && T.tMaletero === 'aptera';
export const bateriaChasis = (T: Pick<CamposTriciclo, 'tBatDisp'>) => T.tBatDisp === 'chasis';
// Round 3 interior (2026-11-12): the Aptera bucket seats, the dashboard (either style), the rails to the rear axle
export const conButacas = (T: Pick<CamposTriciclo, 'tAsientos'>) => T.tAsientos === 'butacas';
export const conSalpicadero = (T: Pick<CamposTriciclo, 'tSalpicadero'>) => T.tSalpicadero === 'si' || T.tSalpicadero === 'blanco';
export const largueroAlEje = (T: Pick<CamposTriciclo, 'tChLargo' | 'tTraseras'>) => T.tChLargo === 'eje' && T.tTraseras === 'dos';

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

// ------------------------------------------------------------------ 2026-11-12: seats on the frame, the pack along it
/** The thinnest seat (m): a 6 cm pan and cushion, as the car seats' (`PAN_ASIENTO`). The saddle thins down to it. */
export const ESPESOR_ASIENTO = 0.06;
/**
 * How far back the pack along the frame may run (m behind x = 0, positive): with that layout the controller (20 cm)
 * moves behind the pack, and behind it stands the shock tower (round 2, 2026-11-12: the pack runs between the axles,
 * as long as fits). With the defaults, 1.645 m, where the controller used to start.
 */
export const finPaquete = (T: CamposTriciclo) => limitarTriciclo('tBatalla', T) - limitarTriciclo('tBasculante', T) - 0.305;
/** The pack along the frame in x (its front face, its rear face; shape coordinates), or null with the battery spread out. */
export function paqueteX(T: CamposTriciclo): [number, number] | null {
  if (!bateriaChasis(T)) return null;
  const x1 = -limitarTriciclo('tBatX', T);
  return [x1, x1 - limitarTriciclo('tBatLargo', T)];
}
/** The pack's half-width (m): `tBatAncho` % of the frame's width, outer face to outer face of the two rails. */
export const semiPaquete = (T: CamposTriciclo) => limitarTriciclo('tBatAncho', T) / 100 * anchoBastidor(T) / 2;
/** The frame's width (m): outer face to outer face of the two rails (round 3 interior: with their spacing, `semiLarguero`). */
const anchoBastidor = (T: CamposTriciclo) => 2 * semiLarguero(T) + limitarTriciclo('tChD', T) / 1000;

// ------------------------------------------------------------------ Round 3 interior (seats, dashboard, chassis, masses, battery ranges)
/**
 * The rails' half-spacing (m). Eugenio, 2026-11-12: «permite poder hacer un poco más ancho la separación entre los dos
 * tubos del chasis». `tChSep` is the spacing axis to axis with a body 85 cm wide or more; a narrower body closes them in
 * with it, as the rails always have. At its default (0.22 m) it is exactly the old `Z_LARGUERO`, unclamped, so a saved
 * design builds as before.
 */
export function semiLarguero(T: CamposTriciclo): number {
  const k = Math.min(1, limitarTriciclo('tAncho', T) / 0.85);
  return T.tChSep === TRICICLO_DEFECTO.tChSep ? Z_LARGUERO * k : limitarTriciclo('tChSep', T) / 2 * k;
}
let cacheSep: { clave: string; v: number } | null = null;
/**
 * The widest rail spacing (m, as the slider stores it) whose two rails keep their outer faces 1 cm inside the skin from
 * the front cradle back to the shock tower, at their height (ahead of the cradle they close in to the old spacing, and
 * behind the tower the extension to the rear axle follows the tail in by itself: `largueroTrasero`).
 */
function sepMaxima(T: CamposTriciclo): number {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = cuerpoDe(T), r = L('tChD') / 2000;
  const suelo = Math.min(L('tSuelo'), SUELO_RIGIDO), yL = suelo + 0.035 + r, x0 = -L('tEjeDel'), x1 = -L('tBatalla') + L('tBasculante');
  const clave = JSON.stringify([F.D, r, x0, x1]);
  if (cacheSep?.clave === clave) return cacheSep.v;
  let h = 9;
  for (let x = x0; x >= x1 - 1e-9; x -= 0.05) for (const y of [yL - r, yL + r]) h = Math.min(h, dentroDe(F, x, y, 0) - 0.01 - r);
  const v = Math.floor(2 * h / Math.min(1, L('tAncho') / 0.85) * 100 + 1e-6) / 100;
  cacheSep = { clave, v };
  return v;
}
let cacheCabe: { clave: string; v: { largo: number; semi: number } } | null = null;
/**
 * Round 3 interior (2026-11-12, Eugenio: «el largo de la batería, del paquete de baterías, no lo limites… el ancho tampoco
 * lo limites»): the longest and the widest pack that fits in the body, 1 cm inside the skin, lying on the belly (at most
 * 3 cm over its floor: a pack that only fits lifted would lift the seats on it). The length: back from its front face
 * while a box of its width and height still fits, and the controller (22 cm, right behind it, on the rails) too. The
 * width: the widest box of its height that fits at every station of its length. What it then runs into (the shock
 * tower, the rear wheel, the seats above) the checks say.
 */
function paqueteCabe(T: CamposTriciclo, hz: number, largo: number): { largo: number; semi: number } {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = cuerpoDe(T), alto = L('tBatAlto'), x1 = -L('tBatX');
  const suelo = Math.min(L('tSuelo'), SUELO_RIGIDO), clave = JSON.stringify([F.D, alto, x1, hz, largo]);
  if (cacheCabe?.clave === clave) return cacheCabe.v;
  const cabeEn = (x: number, z: number) => { for (let y = suelo + 0.012; y <= suelo + 0.042; y += 0.01) if ([y, y + alto].every(q => dentroDe(F, x, q, z) >= 0.01 && dentroDe(F, x, q, 0) >= 0.01)) return true; return false; };
  // the controller behind it: 20 cm long, 14 wide, from 1 to 9 cm over the rails' top (as `crearModeloTriciclo` puts it)
  const yC = suelo + 0.035 + L('tChD') / 1000, inversor = (x: number) => [x - 0.02, x - 0.22].every(xx => [yC + 0.01, yC + 0.09].every(y => dentroDe(F, xx, y, 0.07) >= 0.01));
  let x = x1; while (x - 0.01 > F.X_COLA && cabeEn(x - 0.01, hz)) x -= 0.01;
  while (x < x1 - 0.40 && !inversor(x)) x += 0.01;
  const xs = Array.from({ length: 9 }, (_, i) => x1 - largo * i / 8);
  let a = 0, b = 1.5; for (let i = 0; i < 24; i++) { const c = (a + b) / 2; if (xs.every(q => cabeEn(q, c))) a = c; else b = c; }
  const v = { largo: x1 - x, semi: a };
  cacheCabe = { clave, v };
  return v;
}
/**
 * Round 3 body (2026-11-12): the shape's new fields for `crearForma` (nose line and height, flat tail, flat roof, the
 * roof's fall), each only when it is not zero: absent, the body is built exactly as before, bit for bit.
 */
export const CLAVES_FORMA_R3: [ClaveNumTriciclo, keyof DimBala][] = [['tMorroLinea', 'morroLinea'], ['tMorroAlto', 'morroAlto'], ['tColaPlana', 'colaPlana'], ['tTechoPlano', 'techoPlano'], ['tCaida', 'caida'], ['tLineaCupula', 'lineaCupula']];
/** 2026-11-13, the smooth body: the hatch's side edge (t, on the deck's rounded edge just outboard of where the deck begins) and the panels' (a frame inside the deck). */
export const T_BORDE_LISA = 0.55, T_PANEL_LISA = T_CUBIERTA + 0.03;
/** 2026-11-13: the smooth body's fields, all of them (zeros included) when it is on, none when it is off. */
export const CLAVES_LISA: [ClaveNumTriciclo, keyof DimBala][] = [['tColaAncho', 'colaAncho'], ['tColaGrosor', 'colaGrosor'], ['tColaBombeo', 'colaBombeo'], ['tBajosIni', 'bajosIni'], ['tBajosCurva', 'bajosCurva'], ['tMorroAncho', 'morroAncho'], ['tMorroGrosor', 'morroGrosor'], ['tMorroBombeo', 'morroBombeo']];
export const conLisa = (T: Pick<CamposTriciclo, 'tCubierta'>) => T.tCubierta === 'lisa';
export function formaR3(T: CamposTriciclo): Partial<DimBala> {
  const o: Partial<Record<keyof DimBala, number>> = {};
  for (const [k, d] of CLAVES_FORMA_R3) { const v = limitarTriciclo(k, T); if (v) o[d] = v; }
  if (conLisa(T)) { o.lisa = 1; for (const [k, d] of CLAVES_LISA) o[d] = limitarTriciclo(k, T); }
  return o as unknown as Partial<DimBala>;
}
let cacheCuerpo: { clave: string; F: FormaBala } | null = null;
/** The body alone for these parameters, before its rigid lift (stored heights), cached per shape: for the ranges that need it. */
function cuerpoDe(T: CamposTriciclo): FormaBala {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), suelo = Math.min(L('tSuelo'), SUELO_RIGIDO);
  const forma = (['tBatalla', 'tMorro', 'tCola', 'tAncho', 'tAlto', 'tCupIni', 'tCupFin', 'tPuntaMorro', 'tPuntaCola', 'tEjeDel'] as ClaveNumTriciclo[]).map(L);
  const r3 = formaR3(T), clave = JSON.stringify([suelo, forma, r3]);
  if (cacheCuerpo?.clave === clave) return cacheCuerpo.F;
  const F = crearForma({
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo,
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    rDel: 0.3, rLat: 0.25, anchoNeu: 0.08, anchoNeuLat: 0.07, via: 1.8, xLat: -L('tEjeDel'), ...r3,
  });
  cacheCuerpo = { clave, F };
  return F;
}
/** Where the roof is highest (m behind x = 0, positive, as `tMalIni` is stored). */
export function cimaTecho(T: CamposTriciclo): number {
  const F = cuerpoDe(T); let x0 = 0, y0 = -1;
  for (let x = -limitarTriciclo('tPilar', T); x > -limitarTriciclo('tCupFin', T); x -= 0.01) { const y = techoEn(F, x); if (y > y0 + 1e-4) { y0 = y; x0 = x; } }
  return -x0;
}
let cacheFondo: { clave: string; v: number } | null = null;
/**
 * The pack's bottom (m, stored heights: the body before its rigid lift). Round 2 (2026-11-12, «muy pegados al
 * chasis»): the pack lies on the belly, 1.2 cm over its floor, and the two rails run through it (in channels), so
 * what stands on it is as low as it can be. Where the belly curves up under the pack's outer edges (a narrow body),
 * it rises until those edges are 1 cm inside the skin. The body is built once per shape (cached).
 */
export function fondoPaquete(T: CamposTriciclo): number {
  const p = paqueteX(T); if (!p) return 0;
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), suelo = Math.min(L('tSuelo'), SUELO_RIGIDO), hz = semiPaquete(T);
  const F = cuerpoDe(T), clave = JSON.stringify([suelo, hz, p, F.D]);
  if (cacheFondo?.clave === clave) return cacheFondo.v;
  const xs = [0, 0.25, 0.5, 0.75, 1].map(u => p[0] + (p[1] - p[0]) * u);
  let y = suelo + 0.012;
  while (y < suelo + 0.25 && xs.some(x => dentroDe(F, x, y, hz) < 0.01 || dentroDe(F, x, y, 0) < 0.01)) y += 0.002;
  cacheFondo = { clave, v: y };
  return y;
}
/**
 * What a seat stands on (m, in stored heights: the body before its rigid lift): the top of the frame's rails, or the
 * pack's top where the pack runs under the seat (astride: under the one long saddle; three rows: under the pilot's
 * seat, or under row 2's or row 3's for their common height).
 */
export function sueloAsiento(T: CamposTriciclo, piloto: boolean): number {
  const carril = Math.min(limitarTriciclo('tSuelo', T), SUELO_RIGIDO) + 0.035 + limitarTriciclo('tChD', T) / 1000;
  const p = paqueteX(T); if (!p) return carril;
  const xPil = -limitarTriciclo('tPilX', T), tramos: [number, number][] = [];
  // (round 3 interior: each Aptera bucket on its own footprint, `BUTACA`)
  if (T.tAsientos === 'butacas') { const x = piloto ? xPil : -limitarTriciclo('tPasX', T); tramos.push([x + BUTACA.delante, x - BUTACA.detras]); }
  else if (T.tAsientos !== 'filas') tramos.push([xPil + 0.23, -limitarTriciclo('tPasX', T) - 0.21]);
  else if (piloto) tramos.push([xPil + 0.29, xPil - 0.17]);
  else { const x2 = xPil - limitarTriciclo('tFila2X', T), x3 = x2 - limitarTriciclo('tFila3X', T); tramos.push([x2 + 0.27, x2 - 0.17], [x3 + 0.21, x3 - 0.17]); }
  // (the rails run through the pack: whichever is higher carries the seat)
  return tramos.some(([a, b]) => a > p[1] && b < p[0]) ? Math.max(carril, fondoPaquete(T) + limitarTriciclo('tBatAlto', T)) : carril;
}

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
 * cúpula acaba al menos 10 cm por delante del eje trasero (25 hasta la ronda 3) y el pasajero va entre
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
  // (round 3: up to 10 cm ahead of the rear axle, where it was 25; the canopy's end must stay ahead of the axle, the anchors of the shape's stretch)
  if (k === 'tCupFin') return [Math.min(f.min, T.tBatalla - 0.45), Math.min(f.max, T.tBatalla - 0.10)];
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
  // 2026-11-12 («que los asientos estén todavía más bajos, muy pegados al chasis»): a seat comes down until it has
  // ESPESOR_ASIENTO over what is under it, the frame's rails or the pack along the frame. (Before, the floor was
  // 38 cm for the pilot and 42 for the passenger, minus what the belly came down; a design saved before this opens
  // with that floor: `asientosDeAntes`, Disenos.tsx.)
  if (k === 'tPilY' || k === 'tPasY') return [Math.max(f.min, sueloAsiento(T, k === 'tPilY') + ESPESOR_ASIENTO), f.max];
  // the pack along the frame: its front face 6 cm behind the front axle (the cradle's posts and the front suspension
  // stand there) and its rear face 2 cm ahead of the controller
  if (k === 'tBatX') return [Math.max(f.min, limitarTriciclo('tEjeDel', T) + 0.06), Math.max(f.min, Math.min(f.max, finPaquete(T) - fichaTriciclo('tBatLargo')!.min))];
  // round 3 interior (2026-11-12, «no lo limites»): as long and as wide as fits in the body (`paqueteCabe`), no longer
  // stopped at the controller: the checks say what it runs into. The width's range reads the length within its own
  // range, and the length's reads the width only within the slider's ends, so the two never ask each other.
  if (k === 'tBatLargo' || k === 'tBatAncho') {
    const fa = fichaTriciclo('tBatAncho')!, fl = fichaTriciclo('tBatLargo')!, fijo = (g: FichaTriciclo, v: number) => Math.min(g.max, Math.max(g.min, v));
    const hz0 = fijo(fa, T.tBatAncho) / 100 * anchoBastidor(T) / 2, l0 = fijo(fl, T.tBatLargo);
    // (never less than the ranges had before, 2.40 m up to the controller's place and 200 % at the old spacing: a saved design keeps its values)
    const antes = Math.max(fl.min, Math.min(2.40, finPaquete(T) - limitarTriciclo('tBatX', T)));
    const c0 = paqueteCabe(T, hz0, l0), largoMax = Math.max(antes, Math.min(fl.max, Math.floor(c0.largo * 100 + 1e-6) / 100));
    if (k === 'tBatLargo') return [fl.min, largoMax];
    const c1 = l0 <= largoMax ? c0 : paqueteCabe(T, hz0, largoMax);
    // (the old 200 % only at the old rails' spacing, where it was the range: with wider rails, 200 % may not fit)
    return [f.min, Math.max(T.tChSep === TRICICLO_DEFECTO.tChSep ? 200 : f.min, Math.min(f.max, Math.floor(2 * c1.semi / anchoBastidor(T) * 100 / 5 + 1e-6) * 5))];
  }
  // round 3 interior: the rails' spacing up to what keeps them on the belly (never below the old spacing's 22 cm as its maximum)
  if (k === 'tChSep') return [f.min, Math.max(TRICICLO_DEFECTO.tChSep, Math.min(f.max, sepMaxima(T)))];
  // the doors: at least 45 cm long at the sill; the hatch's hinge behind the pillar's foot and ahead of the canopy's end
  if (k === 'tPuertaDel') return [Math.max(f.min, limitarTriciclo('tPilar', T) + 0.04), f.max];
  // (round 2: never closer than 20 cm to the canopy's end, where the tail crown starts: further back its top edge cut into it)
  if (k === 'tPuertaTras') { const hi = Math.max(f.min, Math.min(f.max, limitarTriciclo('tCupFin', T) - 0.20)); return [Math.min(hi, Math.max(f.min, limitarTriciclo('tPuertaDel', T) + 0.45)), hi]; }
  // (round 2: from the roof's highest point back, `cimaTecho`; ahead of it the hatch would swing into the roof)
  // (round 3, 2026-11-12, «que el maletero empiece un poco más atrás, como en el Aptera»: back to 45 cm ahead of the
  // tail's light ring, behind the doors and past the canopy's end; before, 30 cm ahead of the canopy's end at most)
  // (and with two doors a side, behind the C-pillar that carries the rear doors' hinges, 2 cm clear of it)
  if (k === 'tMalIni') {
    const hi = Math.max(f.min, Math.min(f.max, -cuerpoDe(T).X_ARO_COLA - 0.45)), tras = T.tPuertas2 === 'si' && conPuertas(T) ? limitarTriciclo('tPuertaTras', T) + MONTANTE_C + 0.02 : 0;
    return [Math.min(hi, Math.max(f.min, limitarTriciclo('tPilar', T) + 0.30, cimaTecho(T), tras)), hi];
  }
  // round 3: the split between the two doors leaves each at least 30 cm along the sill
  if (k === 'tPuerta2Parte') { const a = limitarTriciclo('tPuertaDel', T) + 0.30, b = limitarTriciclo('tPuertaTras', T) - 0.30; return a <= b ? [Math.max(f.min, a), Math.min(f.max, b)] : [(a + b) / 2, (a + b) / 2]; }
  // a smaller pod is also a narrower one: below 82 % of the drawn width in all, the tyre no longer fits inside
  const esc = Math.min(fichaTriciclo('tPodEsc')!.max, Math.max(fichaTriciclo('tPodEsc')!.min, T.tPodEsc));
  if (k === 'tPodAncho') return [Math.max(f.min, 0.82 / esc), f.max];
  // and a shorter one: its tail must still reach past the back of the tyre
  if (k === 'tPodCola') return [Math.max(f.min, 0.70 / esc), f.max];
  return [f.min, f.max];
}
/**
 * «Largo total» (round two, 2026-11-10: «hazlo un poco más grande»): one slider that stretches the body
 * without scaling the people. The length is nose + wheelbase + tail.
 *
 * 2026-11-12, Eugenio: «cuando se modifique el largo total, que no cambie la forma del morro y la cola. Ahora mismo
 * están conectadas y es un poco frustrante». Until then the change was shared among the three; now it goes into the
 * wheelbase alone. The shape is stretched piecewise between its anchors (balaForma.ts `tramos`: nose tip, x = 0,
 * the canopy's two ends, the rear axle, the tail tip), so the nose (tip to x = 0) and the tail (rear axle to tip)
 * keep their length and every section; the canopy's end goes back with the rear axle, so the canopy's rear slope
 * and the tail's line stay too, and only the middle (the cabin, from the canopy's start to its end) grows. The
 * riders, the doors, the hatch's hinge and the battery stay where they are (all measured from the front).
 * It writes `tBatalla` and `tCupFin`: there is no stored «largo» of its own, so a saved design is unaffected.
 */
export const PARTES_LARGO = ['tMorro', 'tBatalla', 'tCola'] as const;
export function largoTriciclo(T: CamposTriciclo): { valor: number; min: number; max: number } {
  const fijo = limitarTriciclo('tMorro', T) + limitarTriciclo('tCola', T), [a, b] = rangoTriciclo('tBatalla', T);
  return { valor: fijo + limitarTriciclo('tBatalla', T), min: fijo + a, max: fijo + b };
}
export function estirarTriciclo(T: CamposTriciclo, largo: number): Partial<CamposTriciclo> {
  const ahora = largoTriciclo(T), d = Math.min(ahora.max, Math.max(ahora.min, largo)) - ahora.valor;
  if (Math.abs(d) < 1e-9) return {};
  const b = limitarTriciclo('tBatalla', T), nb = Math.round((b + d) * 1e4) / 1e4;
  return { tBatalla: nb, tCupFin: Math.round((limitarTriciclo('tCupFin', T) + (nb - b)) * 1e4) / 1e4 };
}
/**
 * Round 4 (2026-11-13): «Alto total» below 1.15 m, its floor until this round. Only there do the steering-column support
 * and the dashboard come down with the roof, so every design that could be built before is built exactly as before.
 */
export const ALTO_ANTES = 1.15;
const techoBajo = (T: CamposTriciclo) => limitarTriciclo('tAlto', T) < ALTO_ANTES - 1e-9;
/** Un valor dentro de su rango (un diseño escrito a mano o de otra versión no puede construir un triciclo imposible). */
export const limitarTriciclo = (k: ClaveNumTriciclo, T: CamposTriciclo) => { const [a, b] = rangoTriciclo(k, T); return Math.min(b, Math.max(a, comoAntes(k, T[k], T))); };
/**
 * Round 3 (2026-11-12) widened some ranges. A value saved at an old end carries float noise (the editor stores what it
 * shows less the front axle's offset: the real clásico has «tMorro» 0.44999999999999996 for 0.45), and the old range
 * clamped it onto that end. Within a nanometre of an old end, it still builds at that end, so saved designs are built
 * vertex for vertex as before.
 */
function comoAntes(k: ClaveNumTriciclo, v: number, T: CamposTriciclo): number {
  const fin = (m: number) => (Math.abs(v - m) < 1e-9 ? m : v);
  // (2026-11-13: the nose's ranges widened again; their old ends snap the same way)
  const fines = (...ms: number[]) => { for (const m of ms) if (Math.abs(v - m) < 1e-9) return m; return v; };
  switch (k) {
    case 'tMorro': return fines(0.45, 0.25, 1.00);
    case 'tPuntaMorro': return fines(0.50, 0.25, 1.00);
    case 'tMorroAlto': return fines(-0.10, 0.12);
    case 'tPuntaCola': return fines(0.36, 0.58);
    case 'tAlto': return Math.abs(v - 1.15) < 1e-9 ? 1.15 : fin(1.584);
    case 'tCupFin': { const lo = Math.min(1.80, T.tBatalla - 0.45), hi = Math.min(3.10, T.tBatalla - 0.25); return Math.abs(v - lo) < 1e-9 ? lo : Math.abs(v - hi) < 1e-9 ? hi : v; }
    case 'tMalIni': return fin(1.70);
    case 'tPuertaTras': return fin(2.00);
    default: return v;
  }
}

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
    xLat: -L('tEjeDel'), pod: { esc: L('tPodEsc'), ancho: L('tPodAncho'), cola: L('tPodCola') }, cuerdaBrazo: L('tBrazo'), ...formaR3(T),
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
  // (round 3: «Quita la aleta»: none with «Sin aleta»)
  return { D: F.D, F, asientos, aleta: T.tConAleta === 'no' ? null : L('tAleta') + elevar, viaPedida: D.via, giro, elevar, traseras };
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
  const r3 = formaR3(Tsin), clave = JSON.stringify([T.tRuedaDel, T.tRuedaTras, ...(['tBatalla', 'tMorro', 'tCola', 'tAncho', 'tAlto', 'tSuelo', 'tCupIni', 'tCupFin', 'tPuntaMorro', 'tPuntaCola', 'tPodEsc', 'tPodAncho', 'tPodCola', 'tBrazo', 'tEjeDel'] as ClaveNumTriciclo[]).map(L), r3]);
  if (cacheMinima?.clave === clave) return cacheMinima.v;
  const wDel = RUEDAS_TRICICLO[T.tRuedaDel], wTras = RUEDAS_TRICICLO[T.tRuedaTras], suelo = L('tSuelo'), elevar = elevarDe(suelo);
  const F = crearForma({
    batalla: L('tBatalla'), morro: L('tMorro'), cola: L('tCola'), ancho: L('tAncho'), alto: L('tAlto'), suelo, ...(elevar > 0 ? { elevar } : {}),
    cupIni: L('tCupIni'), cupFin: L('tCupFin'), puntaMorro: L('tPuntaMorro'), puntaCola: L('tPuntaCola'),
    rDel: wTras.d / 2, rLat: wDel.d / 2, anchoNeu: wTras.neuTras, anchoNeuLat: wDel.neuDel, via: 1.8,
    xLat: -L('tEjeDel'), pod: { esc: L('tPodEsc'), ancho: L('tPodAncho'), cola: L('tPodCola') }, cuerdaBrazo: L('tBrazo'), ...r3,
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
/**
 * 2026-11-12: `extra.alzaPas` lifts the passenger's footpegs and feet onto the pack along the frame; with a steering
 * wheel (`extra.volante`: hub and rim radius) the pilot's hands hold its rim at a quarter to three.
 */
export interface ExtraOcupante { alzaPas?: number; volante?: { c: [number, number]; r: number } | null; butaca?: PiernasButaca }
/**
 * Round 3 interior (2026-11-12): a rider in an Aptera bucket. The legs go forward as in a car: the pilot's ankle at the
 * pedals, the passenger's beside the pilot's seat, its knees round the pilot's backrest (as the rear passenger of a
 * Renault Twizy); `anchoPiernas`: hip, foot and knee off the rider's centre line (m); the passenger's hands on its thighs.
 */
export interface PiernasButaca { F: [number, number]; anchoPiernas: [number, number, number]; manoMuslo: boolean }
export function puntosTriciclo(F: FormaBala, S: Asientos, piloto: boolean, rec: number, man: [number, number], pies: [number, number], escala = 1, extra: ExtraOcupante = {}): PuntosOcupante {
  const R = rec * Math.PI / 180, RH = R * 0.35;
  const d: [number, number] = [-Math.sin(R), Math.cos(R)], dh: [number, number] = [-Math.sin(RH), Math.cos(RH)];
  const xH = piloto ? S.xPiloto : S.xPasajero, yS = piloto ? S.yPiloto : S.yPasajero;
  const H: [number, number] = [xH, yS + CADERA_SOBRE_ASIENTO * escala];
  const Sh: [number, number] = [H[0] + d[0] * 0.5 * escala, H[1] + d[1] * 0.5 * escala];
  const C: [number, number] = [Sh[0] + dh[0] * 0.2 * escala, Sh[1] + dh[1] * 0.2 * escala];
  const dxPil = S.xPiloto - ASIENTO.xPiloto, dxPas = S.xPasajero - ASIENTO.xPasajero, kz = Math.min(1, F.kW);
  const Fp: [number, number] = extra.butaca ? extra.butaca.F : piloto ? [-0.52 + dxPil + pies[0], 0.235 + F.dSuelo + F.elevar + pies[1]] : [-1.30 + dxPas, 0.29 + F.dSuelo + F.elevar + (extra.alzaPas ?? 0)];
  const K = rodilla(H, Fp, 0.45 * escala, 0.47 * escala);
  if (extra.butaca?.manoMuslo) {
    // (round 3 interior: the passenger in a bucket, hands on its thighs, as `puntosFila`)
    const mano: [number, number] = [H[0] + (K[0] - H[0]) * 0.6, H[1] + (K[1] - H[1]) * 0.6 + 0.08];
    return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: 0.16, anchoPiernas: extra.butaca.anchoPiernas };
  }
  const vol = piloto ? extra.volante : null;
  const mano: [number, number] = vol ? [vol.c[0], vol.c[1]] : piloto ? [-0.592 + man[0], 0.870 + F.dSuelo + F.elevar + man[1]] : [-1.45 + dxPas, 0.505 + (S.yPasajero - ASIENTO.yPasajero)];
  const kb = escalaManillar(F, man);
  return { H, S: Sh, C, K, F: Fp, d, dh, hx: xH, mano, anchoMano: vol ? vol.r : piloto ? 0.265 * kb : 0.19 * kz, anchoPiernas: extra.butaca ? extra.butaca.anchoPiernas : piloto ? [0.13, 0.15 * kz] : [0.17, 0.20 * kz] };
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

/** Round 3 interior: the pilot's ankle ahead of the hips at the pedals (m, plus «Pedales: hacia delante»), and the legs' spread (hip, foot, knee off the centre line). */
const PEDAL_BUTACA = 0.76, PIES_BUTACA: [number, number, number] = [0.10, 0.12, 0.12];
/** The passenger's ankle ahead of its hips (m), beside the pilot's seat; its knees round the pilot's backrest (`BUTACA`: 22.5-24 cm half-width). */
const PIES_PASAJERO_BUTACA = 0.72, PIES_PASAJERO: [number, number, number] = [0.10, 0.31, 0.33];
/**
 * Round 3 interior (2026-11-12): the rails' run on from the shock tower to the rear axle (four wheels only: with one
 * rear wheel it runs in the tail between them). Where the tail sweeps up, the rail kicks up with the belly (3.5 cm over
 * it, as along the cabin) and closes in where the tail narrows, keeping 1.5 cm to the skin; at the rear axle a cradle
 * (a post each side and a top bar) up to where the rear pods' upper arms meet the body.
 */
export function largueroTrasero(F: FormaBala, Ft: FormaBala, xPiv: number, yL: number, zL: number, dT: number) {
  const xR = Ft.X_LAT, r = dT / 2, n = Math.max(2, Math.ceil((xPiv - xR) / 0.04));
  const vientre = (x: number) => { const s = F.seccionRapida(x); let yb = Infinity; for (let j = 1; j < s.length; j += 2) yb = Math.min(yb, s[j]); return Number.isFinite(yb) ? yb : F.D.suelo; };
  const cabe = (x: number, y: number, z: number) => dentroDe(F, x, y - r, z + r) >= 0.015 && dentroDe(F, x, y + r, z + r) >= 0.015;
  const ruta: P3[] = [];
  let z = zL;
  for (let i = 0; i <= n; i++) {
    const x = xPiv + (xR - xPiv) * i / n, y = Math.max(yL, vientre(x) + 0.035 + r);
    while (z > 0.05 && !cabe(x, y, z)) z -= 0.005;
    ruta.push([x, y, z]);
  }
  const [, y, zE] = ruta[ruta.length - 1], arriba = brazosDe(Ft)[0];
  const yArriba = Math.max(y + 0.10, arriba.yCuerpo);
  let zArriba = zE; while (zArriba > 0.05 && !(dentroDe(F, xR, yArriba, zArriba + r) >= 0.015)) zArriba -= 0.005;
  return { ruta, y, z: zE, yArriba, zArriba };
}

/** El modelo del Triciclo: la forma, los ocupantes, el bastidor, la batería, el motor y lo que lee el visor. */
export function crearModeloTriciclo(P: Parametros) {
  const T = camposTriciclo(P);
  const { D, F, asientos, aleta, viaPedida, giro, elevar, traseras } = medidasTriciclo(T);
  const cup = contornoCupula(F);
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  /** 2026-11-13: the smooth body (`tCubierta: 'lisa'`). */
  const lisa = conLisa(T);
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
  // ── bastidor: dos largueros sobre la panza, travesaños, la cuna de la batería y la suspensión delantera, los soportes de los sillines y la torreta del amortiguador
  const dT = L('tChD') / 1000, pared = L('tChT') / 1000, mat = MATERIALES_CHASIS[T.tChMat].n;
  // the rails narrow with a narrower body (they run along the flat of the belly)
  const yL = D.suelo + 0.035 + dT / 2, zL0 = Z_LARGUERO * Math.min(1, F.kW);
  // round 3 interior (2026-11-12): the rails' spacing (`tChSep`); wider than before, they close in to the old spacing ahead of the front cradle
  const zL = T.tChSep === TRICICLO_DEFECTO.tChSep ? zL0 : semiLarguero(T), xF0 = -L('tEjeDel'), xCodo = Math.min(xF0, -0.09);
  const zRiel = (x: number) => zL === zL0 || x <= xCodo ? zL : zL0 + (zL - zL0) * Math.min(1, (0.06 - x) / (0.06 - xCodo));
  const butacas = conButacas(T);
  // 2026-11-12 (Eugenio: «la batería esté a lo largo del chasis y que sobresalga un 50 % del ancho del chasis»): one pack
  // on the rails, centred, from `tBatX` back `tBatLargo`, `tBatAncho` % of the frame's width (outer face to outer face
  // of the two rails), `tBatAlto` tall. Where it runs, it is the floor: the feet and the seats stand on it.
  // round 2 (2026-11-12): on the belly, with the rails through it (`fondoPaquete`), so the seats come down onto it
  const px = paqueteX(T), yBat0 = px ? fondoPaquete(T) + elevar : 0;
  const paquete: Caja | null = px ? { nombre: 'Paquete a lo largo del bastidor', x0: px[1], x1: px[0], y0: yBat0, y1: yBat0 + L('tBatAlto'), hz: semiPaquete(T) } : null;
  /** How much a thing whose bottom is at `y`, between x0 and x1 and out to |z| ≥ z0 from the centre line, must rise to stand on the pack (m). */
  const sobrePaquete = (x0: number, x1: number, z0: number, y: number) => paquete && x1 > paquete.x0 - 0.02 && x0 < paquete.x1 + 0.02 && z0 < paquete.hz + 0.02 ? Math.max(0, paquete.y1 + 0.004 - y) : 0;
  const dxPil0 = asientos.xPiloto - ASIENTO.xPiloto, dxPas0 = asientos.xPasajero - ASIENTO.xPasajero, kz0 = Math.min(1, F.kW);
  // the pilot's footboards (their lowest point 4.7 cm under their centre: tilted 20°) and the passenger's footpegs (their bracket's foot)
  const alzaPil = butacas ? 0 : sobrePaquete(-0.67 + dxPil0 + L('tPiesX'), -0.43 + dxPil0 + L('tPiesX'), 0.15 * kz0 - 0.045, 0.205 + F.dSuelo + elevar + L('tPiesY') - 0.047);
  const alzaPas = T.tAsientos !== 'horcajadas' ? 0 : sobrePaquete(-1.33 + dxPas0, -1.27 + dxPas0, 0.10 * kz0, 0.23 + F.dSuelo + elevar);
  const man: [number, number] = [-L('tManX'), L('tManY')], pies: [number, number] = [L('tPiesX'), L('tPiesY') + alzaPil];
  // 2026-11-12: the steering wheel (Eugenio: «cambia el manillar por un volante»): hub and rim, tilted with its top forward
  const volante = T.tMando === 'volante' ? { c: [-0.60 - L('tVolX'), 0.90 + F.dSuelo + elevar + L('tVolY')] as [number, number], r: L('tVolD') / 2, inc: L('tVolInc') * Math.PI / 180, atras: 0, baja: 0 } : null;
  // the rim keeps 1 cm inside the body. Where the windscreen is too low for it (a low or long canopy, the wheel raised),
  // round 2 (2026-11-12): the column first grows back towards the pilot, where the canopy is higher (up to 25 cm,
  // `atras`), and only then the wheel comes down (`baja`), as the handlebar narrows (`escalaManillar`)
  if (volante) {
    const fuera = () => aroVolante(volante, 32).some(q => { const z = F.ladoZ(q[0], q[1]); return !(Number.isFinite(z) && z - Math.abs(q[2]) - 0.015 >= 0.01); });
    while (fuera() && volante.atras < 0.25) { volante.c[0] -= 0.005; volante.atras += 0.005; }
    while (fuera() && volante.baja < 0.30) { volante.c[1] -= 0.005; volante.baja += 0.005; }
  }
  const occ = (piloto: boolean, escala = 1) => puntosTriciclo(F, asientos, piloto, piloto ? rec.piloto : rec.pasajero, man, pies, escala, { alzaPas, volante, ...(butacas ? { butaca: piernasButaca(piloto) } : {}) });
  // three rows (round three): where rows 2 and 3 sit (their cushions at the passenger's saddle height), and the floor on the rails
  const filas = T.tAsientos === 'filas', yPiso = yL + dT / 2 + 0.02;
  const x2 = asientos.xPiloto - L('tFila2X'), x3 = x2 - L('tFila3X'), yAsiento = asientos.yPasajero;
  const xPiv = xR + L('tBasculante'), yPiv = yL + 0.03;
  const yBat = yL + dT / 2 + 0.005;
  const dyPil = asientos.yPiloto - ASIENTO.yPiloto, dyPas = asientos.yPasajero - ASIENTO.yPasajero, dxPil = asientos.xPiloto - ASIENTO.xPiloto, dxPas = asientos.xPasajero - ASIENTO.xPasajero;
  // (with the pack along the frame, the controller stands on the rails right behind it, `finPaquete`)
  const inversor: Caja = paquete ? { nombre: 'Controlador', x0: paquete.x0 - 0.22, x1: paquete.x0 - 0.02, y0: yL + dT / 2 + 0.01, y1: yL + dT / 2 + 0.09, hz: 0.07 }
    : { nombre: 'Controlador', x0: -1.86 + dxPas * 0, x1: -1.66, y0: yL + dT / 2 + 0.01, y1: yL + dT / 2 + 0.09, hz: 0.07 };
  // the battery's room: the pilot's saddle nose (2 cm), under the saddles' frame (3 cm) and ahead of the controller (2 cm)
  // the battery: spread out (morro, pies, bajo los sillines: until 2026-11-12, and still the default) or one pack along the frame,
  // whose size decides its capacity (its litres × the cells' Wh/L): the «Batería» kWh slider then only reads it
  const bat = paquete
    ? (() => { const litros = (paquete.x1 - paquete.x0) * (paquete.y1 - paquete.y0) * 2 * paquete.hz * 1000; return { cajas: [paquete], litros, capacidad: litros }; })()
    : bateriaEn(F, T, yBat, { xSillin: -0.835 + dxPil + 0.02, ySillin: Math.min(0.335 + dyPil, 0.35 + dyPas) - 0.03, xFin: inversor.x1 + 0.02 });
  const kWh = paquete ? bat.litros * L('tWhL') / 1000 : L('tKWh');
  const baterias = bat.cajas;
  const yTopBat = Math.max(...baterias.map(b => b.y1));
  const yCuna = yTopBat + 0.03, xCuna = xF, zCuna = 0.18;
  const T_ = (nombre: string, a: P3, b: P3, d = dT, curva?: P3[]): Tubo => ({ nombre, grupo: 'Chasis', a, b, d, pared, material: mat, ...(curva ? { curva } : {}) });
  const tubos: Tubo[] = [];
  // a seat's post: from the rail (or from the pack's top where it runs under it) up to the seat; none if the seat sits right on it
  const poste = (nombre: string, a: P3, b: P3) => {
    const base = paquete && a[0] > paquete.x0 - 0.02 && a[0] < paquete.x1 + 0.02 ? paquete.y1 : yL;
    const arriba = Math.max(b[1], base + 0.005);
    if (arriba - base >= 0.03) tubos.push(T_(nombre, [a[0], base, base === yL ? a[2] : Math.sign(a[2]) * Math.min(Math.abs(a[2]), Math.abs(b[2]))], [b[0], arriba, b[2]]));
  };
  // (with the pack along the frame there is no battery in the nose: the cradle only carries the front suspension)
  const cuna = paquete ? 'Cuna de la suspensión delantera' : 'Cuna de la batería';
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'der.' : 'izq.';
    if (zL === zL0) tubos.push(T_(`Larguero ${lado}`, [0.06, yL, s * zL], [xPiv, yL, s * zL]));
    else tubos.push(T_(`Larguero ${lado}`, [0.06, yL, s * zL0], [xPiv, yL, s * zL], dT, [[0.06, yL, s * zL0], [xCodo, yL, s * zL], [xPiv, yL, s * zL]]));
    // the cradle round the nose module: a post each side up to the top bar, on which the front suspension pivots
    tubos.push(T_(`${cuna}: poste ${lado}`, [xCuna, yL, s * zRiel(xCuna)], [xCuna, yCuna, s * zCuna]));
    // round 3 interior: an Aptera bucket each, on a post each side from the rail to its shell's underside, under its hips
    if (butacas) for (const [n, x, y] of [['piloto', asientos.xPiloto, asientos.yPiloto], ['pasajero', asientos.xPasajero, asientos.yPasajero]] as const) poste(`Soporte de la butaca del ${n} ${lado}`, [x + 0.02, yL, s * zL], [x + 0.02, y - BUTACA.pan, s * 0.13]);
    // the pilot's saddle and the passenger's: a post each side from the rail up to the saddle's underside
    else {
    poste(`Soporte del sillín del piloto ${lado}`, [-0.95 + dxPil, yL, s * zL], [-1.02 + dxPil, 0.335 + dyPil + F.dSuelo * 0, s * 0.08]);
    if (!filas) poste(`Soporte del sillín del pasajero ${lado}`, [-1.50 + dxPas, yL, s * zL], [-1.55 + dxPas, 0.35 + dyPas, s * 0.08]);
    else {
      // three rows (round three): a post under each seat of row 2 and a pair under row 3, from the rails to the seat's pan
      poste(`Soporte del asiento de la fila 2 ${lado}`, [x2 + 0.04, yL, s * zL], [x2 - 0.02, yAsiento - 0.09, s * Z_FILA2]);
      poste(`Soporte del asiento de la fila 3 ${lado}`, [x3 + 0.04, yL, s * zL], [x3 - 0.02, yAsiento - 0.09, s * 0.10]);
    }
    }
    // the shock tower: from the rail at the swing-arm pivot up and back to the shock's top mount
    tubos.push(T_(`Torreta del amortiguador ${lado}`, [xPiv + 0.04, yL, s * zL], [xPiv - 0.06, yPiv + 0.26, s * 0.05]));
  }
  tubos.push(T_('Travesaño delantero', [0.06, yL, -zL0], [0.06, yL, zL0]));
  tubos.push(T_(`${cuna}: barra de arriba`, [xCuna, yCuna, -zCuna], [xCuna, yCuna, zCuna]));
  tubos.push(T_('Travesaño de las plataformas', [-0.55 + dxPil + pies[0], yL, -zL], [-0.55 + dxPil + pies[0], yL, zL]));
  tubos.push(T_('Travesaño bajo los sillines', [-1.25, yL, -zL], [-1.25, yL, zL]));
  tubos.push(T_('Travesaño del basculante', [xPiv, yL, -zL], [xPiv, yL, zL]));
  // (seats down on the frame, 2026-11-12: the crossbar never below the rails' top)
  if (filas) { const yt = Math.max(yAsiento - 0.09, yL + dT); tubos.push(T_('Travesaño de la fila 2', [x2 - 0.02, yt, -(Z_FILA2 + 0.10)], [x2 - 0.02, yt, Z_FILA2 + 0.10])); }
  // the steering-column support: from the cradle's top bar back and up to the steering head under the dash
  // (round 4, 2026-11-13, «el alto total no se puede bajar más»: below the old floor of «Alto total», 1.15 m, the head comes
  // down to stay 2 cm under the top line there; at 1.15 and above, where every saved design is, it is where it always was)
  const cabeza: P3 = [-0.44 - man[0] * 0, techoBajo(T) ? Math.min(0.80 + F.dSuelo + elevar, techoEn(F, -0.44) - 0.02) : 0.80 + F.dSuelo + elevar, 0];
  tubos.push(T_('Soporte de la columna de dirección', [xCuna, yCuna, 0], cabeza, dT, [[xCuna, yCuna, 0], [-0.22, yCuna + 0.20, 0], cabeza]));
  // round 3 interior (2026-11-12, Eugenio: «el chasis no llega hasta el final. Debería alargarse el tubo»): with two rear
  // wheels, the rails on to the rear axle, where the rear pods' arms bring their loads in, and a cradle there
  const trasero = largueroAlEje(T) && traseras ? largueroTrasero(F, traseras, xPiv, yL, zL, dT) : null;
  if (trasero) {
    for (const s of [1, -1]) {
      const lado = s > 0 ? 'der.' : 'izq.', ruta = trasero.ruta.map(([x, y, z]) => [x, y, s * z] as P3);
      tubos.push(T_(`Larguero trasero ${lado}`, ruta[0], ruta[ruta.length - 1], dT, ruta));
      tubos.push(T_(`Cuna trasera: poste ${lado}`, [xR, trasero.y, s * trasero.z], [xR, trasero.yArriba, s * trasero.zArriba]));
    }
    tubos.push(T_('Travesaño del eje trasero', [xR, trasero.y, -trasero.z], [xR, trasero.y, trasero.z]));
    tubos.push(T_('Cuna trasera: barra de arriba', [xR, trasero.yArriba, -trasero.zArriba], [xR, trasero.yArriba, trasero.zArriba]));
  }
  // round 3 interior: where the legs go with the Aptera buckets (the pilot's heel on the floor between the rails, on the
  // pack, or on a plate over the front cradle's top bar; the passenger's beside the pilot's seat, on the belly or the pack)
  const pisoEn = (x: number, zi: number, zo: number) => {
    let y = D.suelo + 0.03; while (y < yL + 0.3 && dentroDe(F, x, y, zo) < 0.015) y += 0.005;
    if (zi < zL + dT / 2) y = Math.max(y, yL + dT / 2);
    return paquete && x > paquete.x0 - 0.02 && x < paquete.x1 + 0.02 && zi < paquete.hz + 0.02 ? Math.max(y, paquete.y1 + 0.004) : y;
  };
  const pedales = butacas ? (() => {
    const x = asientos.xPiloto + PEDAL_BUTACA + L('tPiesX');
    let y = pisoEn(x - 0.06, PIES_BUTACA[1] - 0.045, PIES_BUTACA[1] + 0.045);
    if (Math.abs(x - 0.06 - xCuna) < 0.12) y = Math.max(y, yCuna + dT / 2 + 0.012);
    return { x, talon: y + L('tPiesY'), z: PIES_BUTACA[1] };
  })() : null;
  function piernasButaca(piloto: boolean): PiernasButaca {
    if (piloto) return { F: [pedales!.x, pedales!.talon + 0.07], anchoPiernas: PIES_BUTACA, manoMuslo: false };
    // (its feet as far out as the body lets them, 1 cm inside the skin (as the check): in a narrow body they close in, and the check
    // «a los lados del asiento del piloto» says when they no longer pass)
    const x = asientos.xPasajero + PIES_PASAJERO_BUTACA, [zc, zf0, zk] = PIES_PASAJERO;
    let zf = zf0, y = pisoEn(x - 0.06, zf - 0.045, zf + 0.045);
    while (zf > 0.12 && ![x, x + 0.09, x + 0.18].every(xx => [y, y + 0.11].every(yy => dentroDe(F, xx, yy, zf + 0.045) >= 0.01))) { zf -= 0.005; y = pisoEn(x - 0.06, zf - 0.045, zf + 0.045); }
    return { F: [x, y + 0.07], anchoPiernas: zf === zf0 ? PIES_PASAJERO : [zc, zf, zk - (zf0 - zf)], manoMuslo: true };
  }

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
    // (the Aptera doors, 2026-11-12, are cut along the pillar and the rail: with doors the frame is always there)
    pilar: T.tVentanas === 'marco' || conPuertas(T) ? { x: -L('tPilar'), barrido: L('tPilarBarrido'), ancho: L('tPilarAncho') } : null,
    // round 4: the roof frame, only when asked (absent: the panel as before)
    ...(L('tMarcoTecho') > 0 ? { marcoTecho: L('tMarcoTecho') } : {}),
  };
  const ventanas = ventanasDe(F, cup, opcVentanas);
  const p = ventanas.panel, solar = p ? areaXT(F, p.x0, p.x1, x => [p.tLow(x), 1]) : { area: 0, x: -1.5, y: 1.2 };
  // the A-pillars and the rail frames: laminate (navy) instead of glass
  let marcoArea = areaMarco(F, bandaMarco(ventanas, cup.XC1 + 0.004));
  // round 4: the roof frame is laminate where there was panel (the panel's area above already lost it)
  const mt = ventanas.marco, marcoTecho = mt ? areaXT(F, mt.x0, mt.x1, x => [mt.tCuenta(x), mt.tHi(x)]).area : 0;
  marcoArea += marcoTecho;

  // ── 2026-11-12: Aptera-style doors and hatch (garaje/balaPuertas.ts), the dashboard and the mirrors
  const opcPuertas: OpcionesPuertas | null = conPuertas(T) ? {
    del: -L('tPuertaDel'), tras: -L('tPuertaTras'), umbral: L('tUmbral') + elevar, cintura: L('tCintura'),
    bisagraY: L('tBisagraY'), inc: L('tBisagraInc'), dentro: L('tBisagraDentro'), abre: L('tPuertaAbre'),
    // round 3: the passengers' door behind the split (absent with one door: the opening as before)
    ...(T.tPuertas2 === 'si' ? { segunda: { parte: -L('tPuerta2Parte'), bisagraY: L('tBisagra2Y'), inc: L('tBisagra2Inc'), abre: L('tPuerta2Abre') } } : {}),
  } : null;
  const puerta = opcPuertas ? puertaDe(F, ventanas, cup, opcPuertas) : null;
  const opcPorton: OpcionesPorton | null = puerta && T.tMaletero === 'aptera' ? { x: -L('tMalIni'), abre: L('tMalAbre'), lado: L('tMalLado') } : null;
  const porton0 = puerta && opcPorton ? portonDe(F, puerta, cup, opcPorton, F.X_ARO_COLA) : null;
  // 2026-11-13, the smooth body («la cola y el maletero tienen que ser la misma pieza»): behind the doors the hatch's side
  // edges ease (over the same 35 cm) onto the deck's own side edge, on the rounded edge just outboard of where the deck
  // begins (`T_BORDE_LISA`), and run on it to the trailing edge's light bar: the hatch is the whole rear deck.
  const porton = porton0 && lisa && puerta ? (() => {
    const xR = puerta.xR, base = porton0.tLo;
    return { ...porton0, tLo: (x: number) => { if (x >= xR) return base(x); const w = suaveCola((xR - x) / 0.35); return base(x) * (1 - w) + T_BORDE_LISA * w; } };
  })() : porton0;
  // round 3: the second door's B- and C-pillars, laminate where there was glass (from just under the glass edge to the rail)
  if (puerta?.segunda) {
    const r = (x: number): [number, number] => [Math.max(0, ventanas.tC(x) - 0.01), Math.max(Math.max(0, ventanas.tC(x) - 0.01), ventanas.tR(x))];
    const xS = puerta.segunda.xS, xR = puerta.xR;
    marcoArea += areaXT(F, xS - MONTANTE_B / 2, xS + MONTANTE_B / 2, r, 8, 8).area + areaXT(F, xR - MONTANTE_C, xR, r, 8, 8).area;
  }
  // the dashboard: from where the nose's top line is 3 cm over its top, `tSalpFondo` back towards the pilot, as wide as the cabin
  const salpicadero = conSalpicadero(T) ? (() => {
    // (round 4: below the old floor of «Alto total» its top comes down to 3 cm under the top line 30 cm behind the
    // windscreen's foot, so it stays inside; at 1.15 m and above it is where it always was)
    const y0 = 0.78 + F.dSuelo + elevar + L('tSalpY'), yTop = techoBajo(T) ? Math.min(y0, techoEn(F, cup.XC0 - 0.3) - 0.03) : y0;
    let x0 = 0; while (x0 > cup.XC0 - 0.3 && !(techoEn(F, x0) >= yTop + 0.03)) x0 -= 0.005;
    // (round 3 interior: «más bonito, blanco y con más detalles», the same volume drawn white with its details)
    return { x0, x1: x0 - L('tSalpFondo'), yTop, yBajo: yTop - 0.16, yBajoDel: yTop - 0.30, ...(T.tSalpicadero === 'blanco' ? { blanco: true } : {}) };
  })() : null;
  // the mirrors: a teardrop on a short stalk from the door, 9 cm behind the pillar's foot and 3.5 cm under the glass
  const retrovisor = T.tRetrovisores === 'espejos' ? (() => {
    const xb = (ventanas.pilar ? ventanas.pilar.xP : -L('tPilar')) - 0.09, yb = cup.Y_VIDRIO(xb) - 0.035, zb = F.ladoZ(xb, yb);
    return { base: [xb, yb, zb] as P3, cabeza: [xb - 0.035, yb + 0.05, zb + 0.115] as P3, largo: 0.13, alto: 0.08, fondo: 0.05, enPuerta: !!puerta };
  })() : null;
  // 2026-11-12 (Eugenio: «que los paneles solares lleguen hasta la punta de la cola, como en el aptera»): the panel
  // runs on from the canopy's end over the top of the tail back to its ring, inside the lid that opens there (the
  // Aptera hatch, 4 cm inside its edges; or the round-three lid, above t = 0.66), so it lifts with it. It widens from
  // the canopy's end (where the glass panel closes in its point) over 20 cm. On the body's laminate, as the Aptera's.
  const xColaIni = cup.XF1 - 0.005, xColaFin = F.X_ARO_COLA + 0.012;
  // (2026-11-13, the smooth body: the panel covers the whole deck, from its side edges inset by a frame, `T_PANEL_LISA`)
  // (with the smooth body it starts straight across, with all its width, right behind the canopy frame's rear tip: the deck
  // begins there, and a panel that widened over 20 cm from that tip read as a narrow shield inside the hatch)
  const tPanelCola = (x: number) => { const base0 = porton ? Math.min(0.97, porton.tLo(x) + 0.04) : 0.66; if (lisa) return Math.max(base0, T_PANEL_LISA); return 1 - (1 - base0) * suaveCola((xColaIni - x) / 0.20); };
  const solarCola = T.tSolarCola === 'si' && xColaIni > xColaFin ? { x0: xColaIni, x1: xColaFin, tLow: tPanelCola, ...areaXT(F, xColaFin, xColaIni, x => [tPanelCola(x), 1]) } : null;
  const solarTodo0 = solarCola && solarCola.area > 0 ? { area: solar.area + solarCola.area, x: (solar.area * solar.x + solarCola.area * solarCola.x) / (solar.area + solarCola.area), y: (solar.area * solar.y + solarCola.area * solarCola.y) / (solar.area + solarCola.area) } : solar;
  // ── Round 3 body (2026-11-12): the panel on top of the nose («pon paneles solares en la parte frontal del morro»), from
  // 2 cm behind the nose's light band back to 2 cm ahead of the canopy's frame, over the hood's top (t 0.58 and up), its
  // front end rounded off over 6 cm and its rear one over 10 (where the frame's line rises to the top); on the body's
  // laminate, as the one over the tail
  const solarMorro = T.tSolarMorro === 'si' ? (() => {
    const x0 = F.X_ARO_MORRO - 0.02, x1 = cup.XF0 + 0.02; if (!(x0 - x1 > 0.10)) return null;
    // (2026-11-13, the smooth body: on the hood's deck, inset from its side edges as the tail's)
    const tb = lisa ? T_PANEL_LISA : 0.58;
    const tLow = (x: number) => { const a = 1 - (1 - tb) * suaveCola((x - x1) / 0.10), b = 1 - (1 - tb) * suaveCola((x0 - x) / 0.06); return Math.max(a, b); };
    return { x0, x1, tLow, ...areaXT(F, x1, x0, x => [tLow(x), 1]) };
  })() : null;
  const solarTodo = solarMorro && solarMorro.area > 0 ? { area: solarTodo0.area + solarMorro.area, x: (solarTodo0.area * solarTodo0.x + solarMorro.area * solarMorro.x) / (solarTodo0.area + solarMorro.area), y: (solarTodo0.area * solarTodo0.y + solarMorro.area * solarMorro.y) / (solarTodo0.area + solarMorro.area) } : solarTodo0;
  // round 3: the central headlamp («un faro en el centro del morro, como una moto»): an ellipsoid on the nose's tip, on
  // the centre line at the height the nose closes to, its front 3 cm proud of the skin; round with a pointed nose, an
  // oval as wide as asked and flatter the more the nose is a line (the Aptera's)
  const faro = T.tFaro === 'si' ? (() => {
    const s = F.seccionRapida(F.X_MORRO - 0.004); let y0 = Infinity, y1 = -Infinity; for (let j = 1; j < s.length; j += 2) { y0 = Math.min(y0, s[j]); y1 = Math.max(y1, s[j]); }
    const ancho = L('tFaroD'), alto = ancho * (1 - 0.55 * L('tMorroLinea')), y = (y0 + y1) / 2;
    const xf = F.frenteX(0, y), x = (Number.isFinite(xf) ? xf : F.X_MORRO) + 0.03 - 0.06;
    return { c: [x, y, 0] as P3, fondo: 0.06, alto, ancho };
  })() : null;
  // 2026-11-13 (Eugenio: «hazlo como el aptera que tiene un faro a lo largo del morro»): a light bar along the nose's
  // leading line, the widest point of each section (t = T3), from where the nose cap is 55 % of the way to its tip round
  // to the centre, both sides; the 3D draws it (balaModelo.ts `barraFaro`). Its middle is its centre of mass.
  const faroBarra = T.tFaro === 'barra' ? (() => {
    const x0 = F.XN0 + 0.55 * (F.X_MORRO - F.XN0), xm = F.XN0 + 0.85 * (F.X_MORRO - F.XN0);
    return { x0, t: T3, c: [xm, punto(F.sec(xm), T3)[1], 0] as P3 };
  })() : null;

  // ── the seats and who sits on them (round three): astride, the two riders as before; in three rows, the pilot
  // on a car-style seat with the same posture, row 2's two side by side and row 3's one, unless their row is folded
  const asientosFilas: AsientoFila[] = [];
  // round 3 interior: the two Aptera buckets, in tandem on the centre line (the posture is the astride riders' trunk, `piernasButaca`)
  const butacasDe: AsientoFila[] | null = butacas ? [
    { fila: 1, x: asientos.xPiloto, z: 0, y: asientos.yPiloto, ancho: 2 * BUTACA.semi.cojin, fondo: BUTACA.delante + BUTACA.bisagra, respaldo: BUTACA.respaldo, rec: rec.piloto, plegado: false },
    { fila: 2, x: asientos.xPasajero, z: 0, y: asientos.yPasajero, ancho: 2 * BUTACA.semi.cojin, fondo: BUTACA.delante + BUTACA.bisagra, respaldo: BUTACA.respaldo, rec: rec.pasajero, plegado: false },
  ] : null;
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
      // (2026-11-12: on the pack along the frame where it runs under the foot)
      return paquete ? y + sobrePaquete(x - 0.20, x + 0.02, Math.abs(z) - ancho - 0.045, y) : y;
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
    opcVentanas, ventanas, solar, marcoArea, marcoTecho,
    /** 2026-11-12: the panel run back over the tail to its ring (or null), and all the panel together (area, centre). */
    solarCola, solarTodo,
    /** Round 3 (2026-11-12): the panel on the nose (or null) and the central headlamp (its centre, depth, height and width; or null). */
    solarMorro, faro,
    /** 2026-11-13: the light bar along the nose's leading line (or null); and whether the body is the smooth one. */
    faroBarra, lisa,
    /**
     * 2026-11-12: the battery's capacity (kWh: the slider's, or the pack's litres × Wh/L), the pack along the frame (or
     * null), how much the footboards and footpegs rose onto it; the steering wheel, the dashboard, the mirrors; the Aptera
     * doors and hatch (their options for the 3D builder and their outlines), or null.
     */
    kWh, paquete, alzaPil, alzaPas, volante, salpicadero, retrovisor, opcPuertas, puerta, opcPorton, porton,
    /** Round 3 interior: the Aptera buckets and the pilot's pedals (or null), and the rails' run on to the rear axle (or null). */
    butacas: butacasDe, pedales, larguerosTraseros: trasero,
    /** What the astride saddle stands on (m): the rails' top or the pack's; the 3D thins the saddle down to it. */
    sueloSillin: paquete && -0.835 + dxPil0 > paquete.x0 && -1.745 + dxPas0 < paquete.x1 ? paquete.y1 : yL + dT / 2,
    /** Los maniquíes de talla media (el visor los dibuja con la función de los otros vehículos). */
    occPts: (piloto: boolean) => occ(piloto),
    occTalla: occ,
  };
}
export type ModeloTriciclo = ReturnType<typeof crearModeloTriciclo>;
/**
 * What the Bala builder (garaje/balaModelo.ts `construirCon`, option `triciclo`) needs to draw a Triciclo as the viewer
 * does. 2026-11-12: plus the saddle's floor, the footpegs' lift, the steering wheel, the dashboard, the doors and the
 * mirrors (each absent or null with its option off, so the default draws exactly as before).
 */
export function opcionesCabinaTriciclo(m: ModeloTriciclo) {
  return {
    recPil: m.rec.piloto, recPas: m.rec.pasajero, man: m.man, pies: m.pies, faldon: m.faldon, ventanas: m.opcVentanas, maletero: true, ...(m.filas ? { filas: m.asientosFilas } : {}), traseras: m.traseras,
    sueloSillin: m.sueloSillin, alzaPas: m.alzaPas, volante: m.volante, cabezaDireccion: m.cabezaDireccion, salpicadero: m.salpicadero,
    puertas: m.puerta ? { puerta: m.puerta, porton: m.porton } : null, retrovisor: m.retrovisor,
    solarCola: m.solarCola,
    ...(m.butacas ? { butacas: m.butacas, pedales: m.pedales } : {}),
    // round 3
    solarMorro: m.solarMorro, faro: m.faro,
    // 2026-11-13 (absent with the bar off, so the default draws exactly as before)
    ...(m.faroBarra ? { faroBarra: m.faroBarra } : {}),
  };
}

const suaveCola = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
/** 2026-11-12: points on the steering wheel's rim (hub `c`, radius `r`, its plane tilted `inc` from the vertical with its top forward). */
export function aroVolante(v: { c: [number, number]; r: number; inc: number }, n = 32): P3[] {
  const o: P3[] = [], up = [Math.sin(v.inc), Math.cos(v.inc)];
  for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n, s = Math.sin(a) * v.r; o.push([v.c[0] + up[0] * s, v.c[1] + up[1] * s, Math.cos(a) * v.r]); }
  return o;
}
/** The right mirror's extreme points (its head's ends, top, bottom and outer face), for the swing and pod checks. */
export function puntasRetrovisor(r: { cabeza: P3; largo: number; alto: number; fondo: number }): V3[] {
  const [x, y, z] = r.cabeza;
  return [[x + r.largo / 2, y, z], [x - r.largo / 2, y, z], [x, y + r.alto / 2, z], [x, y - r.alto / 2, z], [x, y, z + r.fondo / 2], [x - r.largo / 3, y - r.alto / 3, z + r.fondo / 2]];
}
/** El faldón de la rueda trasera: un carenado estrecho bajo la cola que tapa la rueda hasta `y0` del suelo (null sin faldón). */
function faldonDe(F: FormaBala, k: number, xR: number, rR: number) {
  if (!(k > 0.001)) return null;
  const vientre = F.D.suelo, y0 = vientre - (vientre - 0.04) * k;
  return { x0: xR + rR * 0.95, x1: xR - rR * 0.95, y0, hz: F.ANCHO_NEU / 2 + 0.025 };
}

// ------------------------------------------------------------------ cálculo
export interface PiezaMasa {
  nombre: string; kg: number; x: number; y: number;
  /** Round 3 interior (2026-11-12): what it is made of or why it weighs that, for the «Proyecto» list (absent: nothing to add). */
  nota?: string;
}
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

/**
 * Masa de cada parte (kg) con su centro (x, y). 2026-11-12: plus what the new options add, each only when it is on
 * (estimates of parts of their class, not measured): the doors' and hatch's hinges, gas struts and latches (the
 * skin is the same skin, cut), the steering wheel and its column over the handlebar, the dashboard, the mirrors.
 */
export function piezasTriciclo(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, centros: { xPiel: number; yPiel: number; xCristal: number; yCristal: number }, pods: { area: number; areaTras?: number }): PiezaMasa[] {
  const o = piezasBase(m, ar, centros, pods);
  if (m.puerta) o.push({ nombre: 'Puertas: bisagras, cierres y amortiguadores', kg: 3.0, x: (m.puerta.xTip + m.puerta.xR) / 2, y: 0.75 + m.elevar });
  if (m.porton) o.push({ nombre: 'Portón: bisagras y amortiguadores de gas', kg: 2.0, x: m.porton.xH - 0.4, y: 1.1 + m.elevar });
  if (m.volante) o.push({ nombre: 'Volante y columna (más que el manillar)', kg: 1.8, x: m.volante.c[0] + 0.1, y: m.volante.c[1] - 0.05 });
  // (round 3 interior: the white one with its binnacle, vents, buttons, stalks and column shroud: `MASA_SALPICADERO_BLANCO`)
  if (m.salpicadero) { const s = m.salpicadero; o.push({ nombre: 'Salpicadero con sus pantallas', kg: 'blanco' in s ? MASA_SALPICADERO_BLANCO : 4.5, x: (s.x0 + s.x1) / 2, y: s.yTop - 0.1 }); }
  if (m.retrovisor) o.push({ nombre: 'Retrovisores (dos)', kg: 0.9, x: m.retrovisor.cabeza[0], y: m.retrovisor.cabeza[1] });
  // round 3 (estimates of parts of their class, not measured): the passengers' doors' hinges, struts and latches, and the headlamp
  if (m.puerta?.segunda) {
    o.push({ nombre: 'Puertas de atrás: bisagras, cierres y amortiguadores', kg: 2.4, x: m.puerta.segunda.x1, y: 0.8 + m.elevar });
    // the B- and C-pillars' laminate is counted in the body (their area moves from glass to laminate); this is what
    // stiffens them for the hinges and the latches: aluminium inserts and a thicker lay-up, both sides
    o.push({ nombre: 'Montantes B y C: refuerzos para bisagras y cierres', kg: 2.0, x: (m.puerta.segunda.xS + m.puerta.segunda.x1) / 2, y: 0.9 + m.elevar });
  }
  if (m.faro) o.push({ nombre: 'Faro central', kg: 0.7, x: m.faro.c[0], y: m.faro.c[1] });
  // (2026-11-13: an LED strip, its black housing and lens along the leading line: about 0.9 kg, an estimate)
  if (m.faroBarra) o.push({ nombre: 'Barra de luz del morro', kg: 0.9, x: m.faroBarra.c[0], y: m.faroBarra.c[1] });
  return dimensionar(m, o);
}
function piezasBase(m: ModeloTriciclo, ar: { carroceria: number; cristal: number; solar: number }, centros: { xPiel: number; yPiel: number; xCristal: number; yCristal: number }, pods: { area: number; areaTras?: number }): PiezaMasa[] {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), F = m.F;
  const kgm2 = MATERIALES_CARENADO[T.tMatCarenado].kgm2mm * L('tEspCarenado');
  const densidad = MATERIALES_CHASIS[T.tChMat].densidad;
  let kgTubos = 0, xt = 0, yt = 0;
  for (const t of m.tubos) {
    const kg = Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) * largoTubo(t) * densidad;
    kgTubos += kg; xt += kg * (t.a[0] + t.b[0]) / 2; yt += kg * (t.a[1] + t.b[1]) / 2;
  }
  const bat = m.kWh * 1000 / L('tWhKg');
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
      { nombre: 'Bastidor', kg: kgTubos + uniones(kgTubos, L('tChUniones')), x: kgTubos ? xt / kgTubos : -1, y: kgTubos ? yt / kgTubos : 0.3 },
      { nombre: 'Suspensión delantera', kg: L('tMSuspDel'), x: m.xF, y: yRF + 0.08 },
      { nombre: 'Suspensión trasera', kg: L('tMSuspTras'), x: m.xR, y: yRR + 0.08 },
      { nombre: 'Ruedas', kg: L('tMRueda') * nR, x: (2 * kDel * m.xF + kTras * m.xR) / nR, y: (2 * kDel * yRF + kTras * yRR) / nR },
      { nombre: 'Frenos', kg: 4 * L('tMFreno'), x: (m.xF + m.xR) / 2, y: (yRF + yRR) / 2 },
      { nombre: 'Dirección', kg: L('tMDir'), x: (m.cremallera.x + m.cabezaDireccion[0]) / 2, y: (m.cremallera.y + m.cabezaDireccion[1]) / 2 },
      { nombre: 'Motores de buje (dos)', kg: L('tMMotor'), x: m.motor.c[0], y: m.motor.c[1] },
      { nombre: 'Controlador', kg: L('tMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2 },
      { nombre: 'Batería', kg: bat, x: vb ? xb / vb : 0, y: vb ? yb / vb : 0.3 },
      m.filas ? asientosFilasMasa(m, L('tMAsiento')) : { nombre: 'Asientos', kg: 2 * (m.butacas ? masaButaca(L('tMAsiento')) : L('tMAsiento')), x: (m.sillines.xPiloto + m.sillines.xPasajero) / 2, y: (ySillin(true) + ySillin(false)) / 2 },
      { nombre: 'Varios', kg: L('tMVarios'), x: -1.0, y: 0.40 + F.dSuelo + m.elevar },
      ...(ar.solar > 0 ? [{ nombre: 'Paneles solares', kg: ar.solar * L('tSolarM2'), x: m.solarTodo.x, y: m.solarTodo.y }] : []),
    ];
  }
  const kTras = kTras0;
  return [
    { nombre: 'Carrocería', kg: ar.carroceria * kgm2, x: centros.xPiel, y: centros.yPiel },
    { nombre: 'Carenados y brazos delanteros', kg: pods.area * kgm2, x: m.xF, y: yRF + 0.05 },
    { nombre: 'Cúpula', kg: ar.cristal * L('tEspCristal') * 1.2, x: centros.xCristal, y: centros.yCristal },
    { nombre: 'Bastidor', kg: kgTubos + uniones(kgTubos, L('tChUniones')), x: kgTubos ? xt / kgTubos : -1, y: kgTubos ? yt / kgTubos : 0.3 },
    { nombre: 'Suspensión delantera', kg: L('tMSuspDel'), x: m.xF, y: yRF + 0.08 },
    { nombre: 'Basculante y amortiguador', kg: L('tMSuspTras'), x: (m.basculante.pivote[0] + m.xR) / 2, y: (m.basculante.pivote[1] + yRR) / 2 },
    // a car wheel weighs a multiple of the slider's moped wheel (RUEDAS_TRICICLO `kg`)
    { nombre: 'Ruedas', kg: L('tMRueda') * (2 * kDel + kTras), x: (2 * kDel * m.xF + kTras * m.xR) / (2 * kDel + kTras), y: (2 * kDel * yRF + kTras * yRR) / (2 * kDel + kTras) },
    { nombre: 'Frenos', kg: 3 * L('tMFreno'), x: (2 * m.xF + m.xR) / 3, y: (2 * yRF + yRR) / 3 },
    { nombre: 'Dirección', kg: L('tMDir'), x: (m.cremallera.x + m.cabezaDireccion[0]) / 2, y: (m.cremallera.y + m.cabezaDireccion[1]) / 2 },
    { nombre: 'Motor de buje', kg: L('tMMotor'), x: m.motor.c[0], y: m.motor.c[1] },
    { nombre: 'Controlador', kg: L('tMInversor'), x: (m.inversor.x0 + m.inversor.x1) / 2, y: (m.inversor.y0 + m.inversor.y1) / 2 },
    { nombre: 'Batería', kg: bat, x: vb ? xb / vb : 0, y: vb ? yb / vb : 0.3 },
    m.filas ? asientosFilasMasa(m, L('tMAsiento')) : { nombre: 'Asientos', kg: 2 * (m.butacas ? masaButaca(L('tMAsiento')) : L('tMAsiento')), x: (m.sillines.xPiloto + m.sillines.xPasajero) / 2, y: (ySillin(true) + ySillin(false)) / 2 },
    { nombre: 'Varios', kg: L('tMVarios'), x: -1.0, y: 0.40 + F.dSuelo + m.elevar },
    // the panel replaces the glass there (`areasTriciclo`): laminate under it (in «Carrocería») and the panel itself
    ...(ar.solar > 0 ? [{ nombre: 'Paneles solares', kg: ar.solar * L('tSolarM2'), x: m.solarTodo.x, y: m.solarTodo.y }] : []),
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

// ------------------------------------------------------------------ Round 3 interior: masses (2026-11-12)
/*
 * Eugenio: «revisa el tema de los pesos… creo que las suspensiones, las ruedas y tal, no están acorde al peso que pone
 * ahí. El chasis y todo». The running gear is now sized for the vehicle it carries: every seat taken plus `EQUIPAJE`
 * (the «masa de diseño»), split over the axles by its centre of gravity. Each slider stays, as the lightest it may be;
 * when the load asks for more, the load wins and the «Proyecto» list says so. Estimates of parts of their class, with
 * their references; nothing here is a measurement.
 */
/** Luggage counted for sizing the running gear and the tyres (kg): a suitcase and two cabin bags. Not in the consumption. */
export const EQUIPAJE = 40;
/**
 * One corner's suspension (kg) for `carga` kg on its wheel: two tubular steel wishbones (about 1.2 kg each), a coil-over
 * (motorcycle shocks: 1.5-2.5 kg on light machines; an Öhlins STX 46 road shock, 4-5 kg: polo-motorrad.com), the upright,
 * the hub and its bearing, ball joints and brackets. A rule through three classes, estimated: a Formula Student corner
 * (≈ 70 kg on the wheel, ≈ 6 kg), a light quadricycle such as the Renault Twizy (474 kg kerb: autozine.org; ≈ 150 kg on
 * each wheel, ≈ 10 kg) and a small car's McPherson corner (≈ 250 kg, ≈ 14 kg). The swing arm of the Triciclo, the same.
 */
export const masaEsquina = (carga: number) => 3.0 + 0.045 * carga;
/** One disc brake with its caliper (kg) for `carga` kg on its wheel: a motorcycle front disc (260-300 mm, 1.0-1.5 kg) and caliper (0.7-0.9 kg) stop some 250 kg. Estimate. */
export const masaFreno = (carga: number) => 0.6 + 0.008 * carga;
/** Welded brackets, gussets, suspension pick-ups and bolts: never less than 15 % of the tubes' mass (kg). Estimate. */
const uniones = (kgTubos: number, deslizador: number) => Math.max(deslizador, 0.15 * kgTubos);
/**
 * An Aptera-style bucket (kg) from the «Un asiento» slider, which is a saddle with its backrest: a moulded composite shell
 * (4-5 kg in a racing bucket of glass or carbon fibre), its pads and its mounting brackets, about 1.8 times a saddle.
 */
export const masaButaca = (asiento: number) => 1.8 * asiento;
/** The white dashboard (kg): its moulded shell, an instrument binnacle and a centre screen (≈ 0.8 kg each), vents and their ducts, switches, stalks and the column's shroud. Estimate; the plain one, 4.5. */
export const MASA_SALPICADERO_BLANCO = 6.5;
/** Where the luggage sits (m): in the boot, behind the last seat. */
function equipajeEn(m: ModeloTriciclo): { x: number; y: number } {
  const ult = m.filas ? Math.min(...m.asientosFilas.map(a => a.x)) : m.sillines.xPasajero;
  return { x: Math.max(m.xR + 0.10, ult - 0.55), y: m.yPiso + 0.15 };
}
/** The static load on each front and each rear wheel (kg) at the design mass: these parts, everyone on board and the luggage. */
export function cargasRueda(m: ModeloTriciclo, piezas: PiezaMasa[]): { del: number; tras: number; masa: number } {
  const mOcc = limitarTriciclo('tMOcc', m.campos), eq = equipajeEn(m);
  const todo = [...piezas.map(p => [p.kg, p.x] as const), ...m.plazas.map(q => [mOcc, cgOcupante(q.pts)[0]] as const), [EQUIPAJE, eq.x] as const];
  const M = todo.reduce((a, [k]) => a + k, 0), X = todo.reduce((a, [k, x]) => a + k * x, 0) / M;
  const b = Math.min(1, Math.max(0, (X - m.xR) / m.batalla));
  return { del: M * b / 2, tras: M * (1 - b) / (m.cuatro ? 2 : 1), masa: M };
}
const kg1 = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** The running gear for the load (a fixed point: its own mass is part of the load; four passes settle it to the gram). */
function dimensionar(m: ModeloTriciclo, piezas: PiezaMasa[]): PiezaMasa[] {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), nT = m.cuatro ? 2 : 1;
  const sD = L('tMSuspDel'), sT = L('tMSuspTras'), fr = L('tMFreno');
  const sube = (desliz: number, k: number, carga: number) => k > desliz + 1e-9 ? `sube por la carga: ${kg1(desliz)} kg del deslizador → ${kg1(k)} kg (${Math.round(carga)} kg en cada rueda)` : undefined;
  let o = piezas;
  for (let i = 0; i < 4; i++) {
    const c = cargasRueda(m, o), fD = Math.max(fr, masaFreno(c.del)), fT = Math.max(fr, masaFreno(c.tras));
    o = o.map(p => {
      if (p.nombre === 'Suspensión delantera') { const k = Math.max(sD, 2 * masaEsquina(c.del)); return { ...p, kg: k, nota: sube(sD, k, c.del) ?? 'las dos esquinas: brazos, amortiguadores, manguetas y bujes' }; }
      if (p.nombre === 'Suspensión trasera' || p.nombre === 'Basculante y amortiguador') {
        const k = Math.max(sT, nT * masaEsquina(c.tras));
        return { ...p, kg: k, nota: sube(sT, k, c.tras) ?? (m.cuatro ? 'las dos esquinas: brazos, amortiguadores y bujes' : 'basculante, amortiguador y eje') };
      }
      if (p.nombre === 'Frenos') {
        const k = 2 * fD + nT * fT;
        return { ...p, kg: k, nota: `${2 + nT} discos con pinza: ${kg1(fD)} kg delante${fT !== fD ? `, ${kg1(fT)} kg detrás` : ''}${k > (2 + nT) * fr + 1e-9 ? ` (sube por la carga desde ${kg1(fr)} kg del deslizador)` : ''}` };
      }
      return p;
    });
  }
  const kDel = RUEDAS_TRICICLO[T.tRuedaDel].kg * L('tMRueda'), kTras = RUEDAS_TRICICLO[T.tRuedaTras].kg * L('tMRueda');
  const metros = m.tubos.reduce((a, t) => a + largoTubo(t), 0);
  return o.map(p => p.nombre === 'Ruedas' ? { ...p, nota: kDel === kTras ? `${2 + nT} × ${kg1(kDel)} kg (llanta y neumático)` : `2 × ${kg1(kDel)} kg delante y ${nT} × ${kg1(kTras)} kg detrás (llanta y neumático)` }
    : p.nombre === 'Bastidor' ? { ...p, nota: `${kg1(metros)} m de tubo de ${Math.round(L('tChD'))} × ${kg1(L('tChT'))} mm y sus uniones` }
      : p.nombre === 'Batería' ? { ...p, nota: `${kg1(m.kWh)} kWh a ${Math.round(L('tWhKg'))} Wh/kg (el paquete entero)` }
        : p.nombre === 'Asientos' && m.butacas ? { ...p, nota: `dos butacas de ${kg1(p.kg / 2)} kg: carcasa, cojines y anclajes` }
          : p);
}
/** The department a part of the mass list belongs to (the «Proyecto» list groups by it; a part not named here, with the body). */
export function grupoPieza(nombre: string): DepTriciclo {
  if (nombre === 'Bastidor') return 'chasis';
  if (/^(Suspensión|Basculante|Ruedas|Frenos|Dirección)/.test(nombre)) return 'rodaje';
  if (/^(Motor|Controlador)/.test(nombre)) return 'propulsion';
  if (/^(Batería|Varios)/.test(nombre)) return 'energia';
  if (/^(Asientos|Volante|Salpicadero)/.test(nombre)) return 'interior';
  return 'carroceria';
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
 * Round 3 interior (2026-11-12): the Aptera buckets' own checks. The passenger's knees go round the pilot's backrest
 * (its half-width at their height, `semiRespaldoButaca`; a knee is 6 cm round); its feet beside the pilot's seat (the
 * shell's half-width at the cushion, a foot 4.5 cm to each side of its line); and both riders' feet inside the body
 * (heel to toes, 17-18 cm ahead of the ankle).
 */
function chequeosButacas(m: ModeloTriciclo, op: PuntosOcupante, oq: PuntosOcupante, c: (dep: DepTriciclo | `${DepTriciclo},${DepTriciclo}`, nombre: string, holgura: number, minimo: number) => void) {
  const F = m.F, bp = m.butacas![0], apQ = oq.anchoPiernas as number[], apP = op.anchoPiernas as number[];
  // the pilot's backrest: from its foot (`bisagra` behind the hips) up along its recline; the knee's height up its face
  const r = bp.rec * Math.PI / 180, alto = (y: number) => (y - bp.y) / Math.cos(r), atras = (y: number) => bp.x - BUTACA.bisagra - Math.max(0, y - bp.y) * Math.tan(r);
  // what stands beside the knee: the backrest (its half-width at that height), the cushion's bolsters (up to 8 cm over
  // it), or the pilot's own trunk between the two (half a chest, 20 cm with the arms close)
  const [kx, ky] = oq.K, hK = alto(ky), frente = atras(ky);
  let lado = 0;
  if (kx + 0.06 > frente - BUTACA.grueso && kx - 0.06 < frente + 0.02 && hK > -0.06 && hK < BUTACA.respaldo + BUTACA.cabezal) lado = Math.max(lado, semiRespaldoButaca(hK));
  if (kx + 0.06 > bp.x - BUTACA.detras && kx - 0.06 < bp.x + BUTACA.delante && ky - 0.06 < bp.y + 0.08) lado = Math.max(lado, BUTACA.semi.cojin);
  if (kx - 0.06 < frente + 0.30 && kx + 0.06 > frente && ky - 0.06 < op.S[1]) lado = Math.max(lado, 0.20);
  c('interior', 'Rodillas del pasajero a los lados del asiento del piloto', lado ? apQ[2] - 0.06 - lado : 0.5, 0.01);
  const pieBajo = oq.F[0] + 0.18 > bp.x - BUTACA.detras && oq.F[0] < bp.x + BUTACA.delante && oq.F[1] + 0.04 > bp.y - BUTACA.pan;
  c('interior', 'Pies del pasajero a los lados del asiento del piloto', pieBajo ? apQ[1] - 0.045 - BUTACA.semi.cojin : 0.5, 0.01);
  const pies = (o: PuntosOcupante, z: number, delante: number) => { let h = 9; for (const u of [0, 0.5, 1]) for (const y of [o.F[1] - 0.07, o.F[1] + 0.04]) h = Math.min(h, dentroDe(F, o.F[0] + delante * u, y, z + 0.045)); return h; };
  c('interior', 'Pies del piloto (en los pedales) dentro de la carrocería', pies(op, apP[1], 0.17), 0.01);
  c('interior', 'Pies del pasajero dentro de la carrocería', pies(oq, apQ[1], 0.18), 0.01);
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
  // (round 3 interior, 2026-11-12: with the rails on to the rear axle, the beam rests on the rear axle's cradle instead of the swing-arm pivot)
  const g = 9.81, apoyo = m.larguerosTraseros ? m.xR : m.basculante.pivote[0], luz = m.xF - apoyo;
  const kgAsiento = m.butacas ? masaButaca(L('tMAsiento')) : L('tMAsiento');
  const cargas: [number, number][] = !m.filas
    ? [[m.xF - m.sillines.xPiloto, (mOcc + kgAsiento) * g], [m.xF - m.sillines.xPasajero, (mOcc + kgAsiento) * g]]
    // three rows: each seat with its occupant (if its row is open), at its hips
    : m.asientosFilas.map(a => [m.xF - a.x, ((a.plegado ? 0 : mOcc) + L('tMAsiento') * (a.fila === 3 ? 1.2 : 1.5)) * g] as [number, number]);
  // round 3 interior (2026-11-12, «revisa… el chasis y todo»): the battery bears on the rails too (the pack runs through
  // them; the modules stand on them): the pack in eight slices along its length, each module at its centre, by volume
  {
    const kgBat = m.kWh * 1000 / L('tWhKg'), vols = m.baterias.map(b => (b.x1 - b.x0) * (b.y1 - b.y0) * b.hz), V = vols.reduce((a, v) => a + v, 0);
    if (m.paquete) for (let i = 0; i < 8; i++) cargas.push([m.xF - (m.paquete.x0 + (m.paquete.x1 - m.paquete.x0) * (i + 0.5) / 8), kgBat / 8 * g]);
    else if (V > 0) m.baterias.forEach((b, i) => cargas.push([m.xF - (b.x0 + b.x1) / 2, kgBat * vols[i] / V * g]));
  }
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
    if (m.butacas) chequeosButacas(m, op, oq, c);
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
    c('interior', `Manos del piloto al ${m.volante ? 'volante' : 'manillar'} (alcance)`, 0.55 - Math.hypot(puno[0] - hom[0], puno[1] - hom[1], puno[2] - hom[2]), 0.0);
  }
  if (!m.volante) {
    const [xb, yb, zb] = extremoManillar(F, m.man);
    c('interior', 'Manillar dentro de la carrocería', F.ladoZ(xb, yb) - zb, 0.01);
  } else {
    // 2026-11-12: the steering wheel's rim (1.5 cm tube) inside the body, and clear of the pilot's knees (6 cm round)
    // (round 3 interior: the knees' own spread where the posture gives one, the buckets')
    const ap = m.plazas[0].pts.anchoPiernas as number[] | undefined, v = m.volante, aro = aroVolante(v, 48), Ks = m.plazas[0].pts.K, zK = ap?.[2] ?? ap?.[0] ?? 0.13;
    let dentro = 9, rodillas = 9;
    for (const q of aro) {
      const z = F.ladoZ(q[0], q[1]); dentro = Math.min(dentro, (Number.isFinite(z) ? z : 0) - Math.abs(q[2]) - 0.015);
      for (const s of [1, -1]) rodillas = Math.min(rodillas, Math.hypot(q[0] - Ks[0], q[1] - Ks[1], q[2] - s * zK) - 0.06 - 0.015);
    }
    c('interior', 'Volante dentro de la carrocería', dentro, 0.01);
    c('interior', 'Rodillas del piloto al volante', rodillas, 0.02);
  }
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
  {
    // round 3 interior (2026-11-12): what each tyre carries at the design mass (everyone on board and the luggage) against what it is rated for
    const cr = cargasRueda(m, piezas), capD = RUEDAS_TRICICLO[T.tRuedaDel].carga, capT = RUEDAS_TRICICLO[T.tRuedaTras].carga;
    const peor = Math.min(capD / cr.del, capT / cr.tras), [carga, cap] = capD / cr.del <= capT / cr.tras ? [cr.del, capD] : [cr.tras, capT];
    c('rodaje', `Neumáticos: carga por rueda con todos a bordo y ${EQUIPAJE} kg de equipaje`, peor - 1, 0, `${Math.round(carga)} de ${cap} kg`);
  }
  // the swing arm's pivot ahead of the rear wheel and behind the passenger's footpegs
  if (!m.filas && !m.butacas && !m.traseras) c('rodaje', 'Pivote del basculante detrás de los estribos del pasajero', (-1.30 + (m.sillines.xPasajero - ASIENTO.xPasajero) - 0.06) - m.basculante.pivote[0], 0.02);
  let tub = 9, peor = ''; for (const tb of m.tubos) { const h = tuboDentro(F, tb); if (h < tub) { tub = h; peor = tb.nombre; } }
  c('chasis', `Bastidor dentro de la carrocería${tub < 0.01 ? ` (${peor.toLowerCase()})` : ''}`, tub, 0.01);
  c('chasis', 'Bastidor: coeficiente de seguridad de los largueros', seguridad - 1.3, 0.5, `×${fmt(seguridad, 1)}`);
  for (const b of m.baterias) c('energia', `Batería, ${b.nombre.toLowerCase()}: dentro de la carrocería`, cajaDentro(F, b), 0.01);
  const litrosBat = m.kWh * 1000 / L('tWhL');
  if (!m.paquete) {
    // the pilot's toes (17 cm ahead of the ankle) and the saddle's nose behind the battery
    const pie = m.occPts(true).F[0] + 0.17, pies = m.baterias.find(b => b.nombre === 'Módulo entre los pies');
    if (pies) c('energia', 'Batería: el módulo de entre los pies, delante del sillín', pies.x0 - (-0.835 + (m.sillines.xPiloto - ASIENTO.xPiloto) + 0.02), 0.0);
    else c('energia', 'Batería delante de los pies del piloto', m.baterias[0].x0 - pie, 0.02);
    // round two: what does not fit in the five places is not drawn; this says so (in litres)
    c('energia', 'Batería: cabe en su sitio (morro, entre los pies y bajo los sillines)', m.bateriaCabe - litrosBat + 1e-9, 0, litrosBat - m.bateriaCabe > 0.05 ? `${Math.round(litrosBat)} L · caben ${Math.round(m.bateriaCabe)}` : `${Math.round(litrosBat)} L`);
  } else {
    // 2026-11-12, the pack along the frame: clear of the cradle in front (its posts' rear face), of the controller
    // behind, of the rear wheel and its travel (one rear wheel), and under the seats (they stand on it, never in it)
    const k = m.paquete, rT = L('tChD') / 2000;
    c('energia', 'Batería: paquete a la cuna de la suspensión delantera', (m.xF - rT) - k.x1, 0.02);
    // (the controller stands right behind the pack: what bounds them both is the rear shock tower)
    c('energia,propulsion', 'Controlador (detrás del paquete) a la torreta del amortiguador', m.inversor.x0 - (m.basculante.pivote[0] + 0.04 + rT), 0.015);
    if (!m.traseras) c('energia,rodaje', 'Batería: paquete a la rueda trasera (hundida)', k.x0 - (m.xR + m.rR + 0.04), 0.02);
    const fondoSillin = Math.max(0.33 + Math.min(m.sillines.yPiloto - ASIENTO.yPiloto, m.sillines.yPasajero - ASIENTO.yPasajero), m.sueloSillin + 0.005);
    const bajos = [...(m.filas ? m.asientosFilas.map(a => ({ x0: a.x - 0.17, x1: a.x - 0.17 + a.fondo, y: a.y - PAN_ASIENTO }))
      : m.butacas ? m.butacas.map(a => ({ x0: a.x - BUTACA.detras, x1: a.x + BUTACA.delante, y: a.y - BUTACA.pan }))
        : [{ x0: -1.745 + (m.sillines.xPasajero - ASIENTO.xPasajero), x1: -0.835 + (m.sillines.xPiloto - ASIENTO.xPiloto), y: fondoSillin }])]
      .filter(a => a.x1 > k.x0 && a.x0 < k.x1);
    if (bajos.length) c('energia,interior', 'Batería: paquete bajo los asientos', Math.min(...bajos.map(a => a.y)) - k.y1, 0.0);
    c('energia', 'Batería: capacidad del paquete (sus litros × Wh/L)', 1, 0, `${fmt(m.kWh, 1)} kWh · ${Math.round(litrosBat)} L`);
  }
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
  // ── 2026-11-12: the doors and the hatch as they swing (garaje/balaPuertas.ts), the dashboard, the mirrors
  const cm1 = (v: number) => `${fmt(v * 100, 1)} cm`;
  if (m.puerta) {
    const espejo = m.retrovisor?.enPuerta ? puntasRetrovisor(m.retrovisor) : [];
    const giros = [m.giro, anguloFuera(m.giro, m.batalla, F.VIA_LAT)];
    // (round 3: with two doors a side, each leaf on its own hinge, densely sampled, and against the rear pods as well)
    const hojas = m.puerta.segunda ? hojasPuerta(m.puerta) : null;
    const v = hojas ? vueloPuerta(F, m.puerta, espejo, giros, hojas[0], m.traseras) : vueloPuerta(F, m.puerta, espejo, giros);
    const v2 = hojas ? vueloPuerta(F, m.puerta, [], giros, hojas[1], m.traseras) : null;
    c('carroceria', 'Puerta: al abrirse no entra en la carrocería', -v.entra, -0.005, v.entra < 0.001 ? 'no entra' : `entra ${cm1(v.entra)}`);
    c('carroceria,rodaje', `Puerta abierta al carenado delantero y sus brazos (ruedas rectas y giradas a tope)`, v.carenado, 0.02);
    if (v2) {
      c('carroceria', 'Puerta de atrás: al abrirse no entra en la carrocería', -v2.entra, -0.005, v2.entra < 0.001 ? 'no entra' : `entra ${cm1(v2.entra)}`);
      c('carroceria,rodaje', 'Puerta de atrás abierta a los carenados y sus brazos', v2.carenado, 0.02);
      c('carroceria', 'Puerta de atrás abierta al suelo', v2.suelo, 0.05);
    }
    // round 2 (2026-11-12): what is left of the open door over the way in, from the sill's front to its rear edge
    // (round 3: of both doors, with two)
    const entrada = Math.min(v.entrada, v2?.entrada ?? 9), alto = Math.max(v.alto, v2?.alto ?? 0);
    c('carroceria,interior', `Puerta${v2 ? 's abiertas' : ' abierta'}: altura libre para entrar`, entrada, 1.40, entrada > 8 ? `nada encima · arriba a ${fmt(alto, 2)} m` : `${fmt(entrada, 2)} m libres`);
    c('carroceria', 'Puerta abierta al suelo', v.suelo, 0.05);
    c('carroceria', `Puerta${v2 ? 's abiertas' : ' abierta'}: lo que sale de lado (desde el centro)`, 1, 0, cm1(Math.max(v.punta, v2?.punta ?? 0)));
    // round 3: the two doors opening together, and the doors against the hatch at any opening of each (balaPuertas.ts `choquesHojas`)
    const ch2 = choquesHojas(F, m.puerta, espejo, m.porton);
    if (T.tPuertas2 === 'si') c('carroceria', 'Segunda puerta: cabe (las dos con 30 cm abajo y el montante B entre ellas)', m.puerta.segunda ? 1 : -1, 0, m.puerta.segunda ? 'cabe' : 'no cabe: una sola puerta');
    // round 4 (2026-11-13, «la puerta trasera es demasiado estrecha»): the passengers' way in along the sill, from the
    // B-pillar to the hinge, at least 60 cm (the bucket's cushion is 52 cm long, and the hips and thighs pass bent), and
    // where the passenger's hips are in it
    if (m.puerta.segunda) {
      const s2 = m.puerta.segunda, ancho = s2.x0 - s2.x1, pas = m.filas ? null : m.plazas.find(q => !q.piloto);
      c('carroceria,interior', 'Puerta de atrás: paso abajo para el pasajero (60 cm o más)', ancho, 0.60, pas ? `${cm1(ancho)} · sus caderas a ${cm1(s2.x0 - pas.pts.H[0])} del canto de delante y a ${cm1(pas.pts.H[0] - s2.x1)} de la bisagra` : cm1(ancho));
    }
    if (ch2.entreHojas !== null) c('carroceria', 'Puertas: la de delante y la de atrás, abriéndose a la vez, no se tocan', ch2.entreHojas, 0.03, ch2.entreHojas >= 0.03 ? 'a más de 3 cm' : ch2.entreHojas < 0 ? `se cruzan en la junta (${cm1(-ch2.entreHojas)})` : `a ${cm1(ch2.entreHojas)}`);
    if (ch2.conPorton !== null) c('carroceria', 'Puertas y portón: abiertos a la vez, no se tocan', ch2.conPorton, 0.03, ch2.conPorton >= 0.03 ? 'a más de 3 cm' : ch2.conPorton < 0 ? `se cruzan en la junta (${cm1(-ch2.conPorton)})` : `a ${cm1(ch2.conPorton)}`);
  }
  if (m.porton) {
    // (round 2: with the fin's tip, which rides on the hatch: it is the highest point once the hatch opens)
    const vp = vueloPorton(F, m.porton, m.aleta === null ? [] : [[F.X(ALETA.punta[0][0]), m.aleta, 0], [F.X(ALETA.punta[1][0]), m.aleta - 0.01, 0]]);
    c('carroceria', 'Portón: al abrirse no entra en la carrocería', -vp.entra, -0.005, vp.entra < 0.001 ? 'no entra' : `entra ${cm1(vp.entra)}`);
    c('carroceria', 'Portón abierto: altura de su punto más alto', 1, 0, `${fmt(vp.alto, 2)} m`);
  }
  if (m.salpicadero) {
    const s = m.salpicadero, o = m.plazas[0].pts; let h = 9;
    for (const x of [s.x0 - 0.01, (s.x0 + s.x1) / 2, s.x1]) for (const y of [x === s.x1 ? s.yBajo : s.yBajoDel, s.yTop]) { const z = F.ladoZ(x, y); h = Math.min(h, Number.isFinite(z) ? z - anchoSalpicadero(F, x, y) : -0.05); }
    c('interior', 'Salpicadero dentro de la carrocería', h, 0.01);
    // the pilot's knees (6 cm round) behind its rear face, where they are as high as it
    c('interior', 'Rodillas del piloto al salpicadero', o.K[1] + 0.06 > s.yBajo ? s.x1 - (o.K[0] + 0.06) : 0.5, 0.02);
  }
  if (m.retrovisor && !m.retrovisor.enPuerta) {
    // fixed on the body (with the opening canopy): it must clear the front pod (wheels straight)
    let h = 9; const POD = podDe(F), w = semiAncho(POD);
    for (const q of puntasRetrovisor(m.retrovisor)) { const xr = q[0] - F.X_LAT, alt = alturasPod(POD, xr); h = Math.min(h, alt ? Math.max(q[1] - alt[1], Math.abs(q[2] - F.VIA_LAT / 2) - w(xr, Math.min(alt[1] - 1e-3, q[1]))) : 0.5); }
    c('carroceria', 'Retrovisor al carenado delantero', h, 0.02);
  }

  const bala: ResultadosTriciclo = {
    area, vol, piel: ar.carroceria + ar.cristal, cristal: ar.cristal, cupula: [-m.cup.XC0, -m.cup.XC1],
    viaSubida: F.VIA_LAT > m.viaPedida + 1e-9 ? F.VIA_LAT : null, cabezas,
    piezas, cg: { x: cg.x, y: cg.y, masa: cg.masa, vacio: { x: vacio.x, y: vacio.y } }, vuelco: { ssf, ssfSolo, repartoDel },
    giro: { radio, dentro: di * 180 / Math.PI, fuera: dout * 180 / Math.PI },
    bastidor: { M: Mmax, tension, seguridad, metros },
    bateria: { litros: m.kWh * 1000 / L('tWhL'), kg: m.kWh * 1000 / L('tWhKg'), litrosMorro: 0.42 * 0.30 * Math.max(1, F.kW) * 0.20 * 1000, cabe: m.bateriaCabe },
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
export function energiaTriciclo(m: ModeloTriciclo, mTot: number, cd: { cd: number; areaRef: number }, areaSolar = m.solarTodo.area) {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), g = 9.81, CdA = cd.cd * cd.areaRef;
  const potencia = (v: number) => (0.5 * 1.2 * CdA * v ** 3 + CRR * mTot * g * v) / RENDIMIENTO + AUXILIARES;
  const consumo = (kmh: number) => { const v = kmh / 3.6; return potencia(v) / v / 3.6; };
  const vel = L('tVel'), WhKm = consumo(vel), util = m.kWh * 1000 * USABLE;
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
export function areasTriciclo(m: Pick<ModeloTriciclo, 'F' | 'cup' | 'solar' | 'marcoArea'> & { solarCola?: { area: number } | null; solarMorro?: { area: number } | null }) {
  const b = areasBala(m), s = m.solar.area, k = m.marcoArea;
  // (2026-11-12: the panel over the tail lies on the body's laminate, not on glass: it only adds panel; round 3: the nose's too)
  const sc = m.solarCola ? s + m.solarCola.area : s;
  return { carroceria: b.carroceria + s + k, cristal: Math.max(0, b.cristal - s - k), solar: m.solarMorro ? sc + m.solarMorro.area : sc };
}
/** ¿Es este modelo un Triciclo? */
export const esTriciclo = (m: { tipo: string }): m is ModeloTriciclo => m.tipo === 'triciclo';
