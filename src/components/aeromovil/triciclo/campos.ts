// Triciclo fields: the CamposTriciclo type, wheels, departments, the slider table (FILAS) and the selectors.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { OPCIONES_NUM_FILA, OPCIONES_TIPO_FILA, type NumFila, type TipoAsientoFila } from '../filasTriciclo';
import { TECNOLOGIAS_BASCULA, type TecBascula } from '../basculacion';
import { ACABADOS, AMBIENTES, CINTURONES, COLORES_COSTURA, COLORES_FORRO, CONSOLAS_CENTRALES, CONSOLAS_TECHO, COSTURAS, MOLDURAS, TAPICES, type CamposInterior } from '../interiorTriciclo';
import { ARQUITECTURAS_HIBRIDO, type ArqHibrido } from '../hibrido';
import type { MaterialCarenado, MaterialChasis, Pulgadas } from '../geometria';
import { TRICICLO_DEFECTO } from './defecto';
import { DESLIZADORES_BALA, type ClaveBala } from '../geometriaBala';
import { rangoTriciclo, limitarTriciclo } from './medidas';

/** Los parámetros propios del Triciclo (prefijo `t`). Opcionales en `Parametros`: los diseños de los otros tres vehículos no los llevan. */
// (2026-11-16: the interior finish's fields, `tAcabado`… `tAmbiente`, are in interiorTriciclo.ts `CamposInterior`)
export interface CamposTriciclo extends CamposInterior {
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
  // 2026-11-16, row by row (filasTriciclo.ts): places side by side and the kind of seat of rows 2 and 3. A design saved without them takes the old layout (2 + 1 car seats).
  tFila2N: NumFila; tFila3N: NumFila;
  tFila2Tipo: TipoAsientoFila; tFila3Tipo: TipoAsientoFila;
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
  // 2026-11-15 (Eugenio: «haz que pueda bascular», on his «Smeraptera»). Optional when saved: absent, it does not lean.
  tBascula: 'no' | 'si';   // con cuatro ruedas: la cabina y los cuatro carenados se inclinan en las curvas, cada carenado sobre sus brazos en paralelogramo
  tBascMax: number;    // inclinación máxima (°)
  // 2026-11-16 (Eugenio: «basculación tiene que ser un menú entero dentro de rodaje … qué tipo de tecnología»): basculacion.ts
  tBascTec: TecBascula;  // activa eléctrica, activa hidráulica o libre con bloqueo
  tBascVel: number;      // velocidad de inclinación (°/s)
  tBascMargen: number;   // margen de diseño sobre el momento del coche parado e inclinado
  tBascBrazo: number;    // brazo del balancín, del eje a la bieleta (m)
  tBascBloqueo: number;  // por debajo de esta velocidad, derecho y bloqueado (km/h)
  // 2026-11-15 (Eugenio, «Rombo Bala»: «quiero que tenga las ruedas en rombo, una delante, una atrás y dos laterales basculantes»)
  tRuedas: 'clasica' | 'rombo';   // dos delante en carenados (hasta ahora) o en rombo: una en el morro, que gira, dos laterales en carenados y una en la cola
  tEjeLat: number;     // en rombo: las ruedas laterales, cuánto van detrás de la del morro (m)
  // 2026-11-15 (Eugenio: «añadir una opción de motor híbrido tipo PHEV con ejes planetarios como el Prius»)
  tPropulsion: 'electrico' | 'phev';   // solo eléctrico (hasta ahora) o híbrido enchufable: motor de gasolina unido por un engranaje planetario
  tPhevKW: number;     // potencia del motor de gasolina (kW)
  tRendTerm: number;   // rendimiento del motor de gasolina (%): energía del combustible que sale en el eje
  // 2026-11-16 (Eugenio: «las opciones que hay para conectar el motor híbrido y el eléctrico»): hibrido.ts. They replace the
  // single «Conversión mecánica» (`tRendTrans`), which a design saved before opens as (`camposTriciclo`, hibrido.ts `migrarRendTrans`)
  tHibArq: ArqHibrido; // reparto con planetario (Prius), en serie (i3 REx, e-Power) o en paralelo P2
  tHibMec: number;     // reparto: parte de la potencia que pasa directa por el planetario (%)
  tRendElec: number;   // reparto y serie: rendimiento del camino eléctrico, generador → inversores → motor (%)
  tRendCaja: number;   // paralelo: rendimiento de la caja de cambios y la cadena (%)
  tDeposito: number;   // depósito de gasolina (L)
  // 2026-11-16 (Eugenio: «añade marcas de motores eléctricos y de motores térmicos … y de engranajes planetarios, de
  // controladoras»): a real part from catalogoTren.ts, or 'medida' (the sliders decide, as before). Optional when saved.
  tCatMotor?: string; tCatCtrl?: string; tCatReductora?: string; tCatTermico?: string;
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
  // 2026-11-15 (Eugenio: «formas tan perfectas como el avión jet»)
  tSubida: number;       // la subida de la cúpula desde el capó: + sube antes y más derecha (cabina de jet), − más tarde y tumbada
  tBajosMorro: number;   // los bajos del morro suben hacia la punta (0 plano … 1, hasta 20 cm)
  tMorroCurva: number;   // con la cubierta lisa: cómo cae el capó hacia el borde del morro
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
  // 2026-11-16: the flat tail without the smooth body, towards the body's full width (0 as before … 1 the Aptera's)
  tColaPlanaAncho: number;
  // 2026-11-16 (Eugenio: «una especie de parte intermedia que comunique con las dos»): the cabin–tail transition's length (m)
  tColaTrans: number;
  // 2026-11-17 (Eugenio: «estudia los cortes drásticos de las colas… permite seleccionarla en el "Modelo 1"»): the Kamm tail
  tColaCorte: 'no' | 'kamm';   // la cola: larga hasta la punta (hasta ahora) o cortada en recto (cola Kamm)
  tKammSeccion: number;        // dónde se corta: la fracción de la sección mayor que queda en el corte (Kamm: 0,5)
  tKammCavidad: number;        // hueco en el culote (m): 0 plano
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
export type ClaveTexto = 'tCubierta' | 'tChLargo' | 'tFaro' | 'tConAleta' | 'tSolarMorro' | 'tPuertas2' | 'tSolarCola' | 'tMatCarenado' | 'tChMat' | 'tRuedaDel' | 'tRuedaTras' | 'tVentanas' | 'tAsientos' | 'tFila2' | 'tFila3' | 'tFila2N' | 'tFila3N' | 'tFila2Tipo' | 'tFila3Tipo' | 'tTraseras' | 'tBascula' | 'tRuedas' | 'tPropulsion' | 'tHibArq' | 'tBascTec' | 'tBatDisp' | 'tMando' | 'tSalpicadero' | 'tAcceso' | 'tRetrovisores' | 'tMaletero'
  | 'tAcabado' | 'tTapiz' | 'tCostura' | 'tCosturaColor' | 'tForroColor' | 'tMoldura' | 'tConsolaTecho' | 'tConsolaCentral' | 'tCinturon' | 'tAmbiente'
  | 'tCatMotor' | 'tCatCtrl' | 'tCatReductora' | 'tCatTermico' | 'tColaCorte';
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
/** 2026-11-15: the wheels in a diamond (`tRuedas`): one in the nose, steering; the two pods at the sides; one in the tail. */
export const esRombo = (T: Partial<Pick<CamposTriciclo, 'tRuedas'>>) => T.tRuedas === 'rombo';
/** Two rear wheels in pods (a diamond always has one in the tail, whatever `tTraseras` was left at). */
export const esCuatro = (T: Pick<CamposTriciclo, 'tTraseras'> & Partial<Pick<CamposTriciclo, 'tRuedas'>>) => T.tTraseras === 'dos' && !esRombo(T);
export const nombreTriciclo = (T: Pick<CamposTriciclo, 'tTraseras'> & Partial<Pick<CamposTriciclo, 'tRuedas'>>) => esRombo(T) ? 'Cuadriciclo Bala en rombo' : esCuatro(T) ? 'Cuadriciclo Bala clásico' : 'Triciclo Bala';
/** The departments' one-liners for these parameters (2026-11-12: they follow the battery's layout, the controls and the access too). */
export const lemasTriciclo = (T: Pick<CamposTriciclo, 'tTraseras'> & Partial<CamposTriciclo>): Record<DepTriciclo | 'proyecto', string> => {
  const o = { ...LEMAS_TRICICLO };
  if (esCuatro(T)) o.propulsion = 'los dos motores en los bujes de las ruedas traseras';
  // (2026-11-16) the plug-in hybrid: the petrol engine and its connection join the hub motor(s)
  if (T.tPropulsion === 'phev') o.propulsion = `híbrido enchufable: el motor de gasolina, cómo se une a las ruedas, y ${esCuatro(T) ? 'los dos motores eléctricos en los bujes traseros' : 'el motor eléctrico en el buje trasero'}`;
  if (T.tBatDisp === 'chasis') o.energia = 'la batería (un paquete a lo largo del bastidor) y el techo solar';
  // (round 3 interior: either dashboard; with the Aptera buckets, pedals instead of footboards)
  if (T.tMando === 'volante' || conSalpicadero(T as CamposTriciclo) || T.tAsientos === 'butacas') o.interior = `los asientos (a horcajadas, dos butacas como el Aptera o tres filas que se pliegan), ${T.tMando === 'volante' ? 'volante' : 'manillar'}${conSalpicadero(T as CamposTriciclo) ? ', salpicadero' : ''}, ${T.tAsientos === 'butacas' ? 'pedales' : 'plataformas'} y maletero`;
  if (T.tAcceso === 'puertas') o.carroceria = 'la piel del Cuadriciclo en rombo, techo solar y ventanas, puertas y portón como el Aptera, carenados y material';
  return o;
};
export type Unidad = 'm' | 'cm' | 'mm' | '°' | 'kg' | 'kW' | 'kWh' | 'Wh/kg' | 'Wh/L' | 'km/h' | 'x' | 'kg/m²' | '%' | 'L' | '°/s';
/**
 * Un deslizador del Triciclo. `bala`: la forma es la del Cuadriciclo en rombo, y su
 * etiqueta, su rango y su paso se leen de su tabla (DESLIZADORES_BALA), no se
 * copian. `centrar`: el deslizador se recoloca con el valor por defecto en
 * medio (como todos en el editor); no, cuando el valor por defecto no es el
 * centro de su rango (se ve el rango entero).
 */
export interface FichaTriciclo { clave: ClaveNumTriciclo; n: string; dep: DepTriciclo; bloque: string; min: number; max: number; paso: number; unidad: Unidad; centrar: boolean; desde?: 1 | -1 }
export interface SelectorTriciclo { clave: ClaveTexto; n: string; dep: DepTriciclo; bloque: string; opciones: { k: string; n: string }[] }

export type Fila = [ClaveNumTriciclo, DepTriciclo, string, ClaveBala | null, string, number, number, number, Unidad];
// [clave, departamento, bloque, del Cuadriciclo en rombo, etiqueta, mín, máx, paso, unidad]
// A row «del Cuadriciclo en rombo» takes its label from that table, and its range too when mín = máx = 0; since round two
// (2026-11-10, «lo has diseñado para algo muy pequeñito») most of them carry a wider range of their own.
export const FILAS: Fila[] = [
  ['tAncho', 'carroceria', 'Forma', 'bAncho', '', 0.77, 1.30, 0.01, 'm'],
  // round three (2026-11-11, «mucho mayor»): up to 35 cm; above 15.8 cm the whole body rises (see SUELO_RIGIDO)
  ['tSuelo', 'carroceria', 'Forma', 'bSuelo', '', 0.04, 0.35, 0.002, 'cm'],
  // (round 3, 2026-11-12, «que el morro se pueda achatar más»: 20 cm shorter and a fuller tip than before; see rangoTriciclo)
  ['tMorro', 'carroceria', 'Morro', 'bMorro', '', 0.20, 1.20, 0.01, 'm'],
  ['tPuntaMorro', 'carroceria', 'Morro', 'bPuntaMorro', '', 0.15, 1.20, 0.01, 'x'],
  // (2026-11-16, «que la cola sea mucho más flexible… súper grande o súper pequeña»: 0.30–1.80 m, was 0.45–1.20; the tip's
  // height 0.20–1.10, was 0.30–0.85, kept 3 cm inside the tail's section by the shape itself, balaForma.ts `cyColaPlana`)
  ['tCola', 'carroceria', 'Cola', 'bCola', '', 0.30, 1.80, 0.01, 'm'],
  ['tPuntaCola', 'carroceria', 'Cola', 'bPuntaCola', '', 0.20, 1.10, 0.005, 'm'],
  ['tAleta', 'carroceria', 'Cola', 'bAleta', '', 0, 0, 0, 'm'],
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
  ['tMorroLinea', 'carroceria', 'Morro', null, 'Morro: en punta o en línea (como el Aptera)', 0, 1, 0.05, 'x'],
  ['tMorroAlto', 'carroceria', 'Morro', null, 'Morro: altura de la punta (más baja, más alta)', -0.12, 0.40, 0.005, 'cm'],
  ['tFaroD', 'carroceria', 'Morro', null, 'Faro central: ancho', 0.10, 0.24, 0.01, 'cm'],
  ['tColaPlana', 'carroceria', 'Cola', null, 'Cola: en punta o plana y ancha (como el Aptera)', 0, 1, 0.05, 'x'],
  // 2026-11-16: only with the flat tail and without «Cubierta lisa» (Aeromovil.tsx `visible`)
  // (2026-11-16: up to 1.5, wider than the cabin)
  ['tColaPlanaAncho', 'carroceria', 'Cola', null, 'Cola plana: ancho al final (1 = todo el ancho, como el Aptera; más, más ancha que la cabina)', 0, 1.5, 0.05, 'x'],
  // 2026-11-16: the cabin–tail transition (garaje/transicionCola.ts); with the smooth body only near the rear axle
  ['tColaTrans', 'carroceria', 'Cola', null, 'Transición cabina–cola: largo', 0.10, 1.20, 0.01, 'm'],
  // 2026-11-17: the Kamm tail, only with «Cola cortada» (LadoTriciclo.tsx `visible`); garaje/balaForma.ts `corte`
  ['tKammSeccion', 'carroceria', 'Cola', null, 'Cola cortada: dónde se corta (sección que queda)', 0.20, 0.80, 0.01, 'x'],
  ['tKammCavidad', 'carroceria', 'Cola', null, 'Cola cortada: hueco en el culote', 0, 0.15, 0.005, 'cm'],
  ['tTechoPlano', 'carroceria', 'Cúpula', null, 'Techo: redondeado o plano', 0, 1, 0.05, 'x'],
  ['tCaida', 'carroceria', 'Cúpula', null, 'Techo: caída hacia el maletero (antes o más tarde)', -0.60, 0.80, 0.05, 'x'],
  // 2026-11-15
  ['tSubida', 'carroceria', 'Cúpula', null, 'Parabrisas: subida desde el capó (tumbada o derecha, como un jet)', -0.80, 0.80, 0.05, 'x'],
  ['tBajosMorro', 'carroceria', 'Morro', null, 'Bajos del morro: cuánto suben hacia la punta', 0, 1, 0.05, 'x'],
  ['tMorroCurva', 'carroceria', 'Morro', null, 'Capó: caída hacia el borde (antes o más tarde; cubierta lisa)', -0.80, 0.80, 0.05, 'x'],
  ['tLineaCupula', 'carroceria', 'Cúpula', null, 'Línea entre carrocería y cristal: altura', -0.03, 0.15, 0.005, 'cm'],
  // ── The smooth body (2026-11-13): only with «Cubierta lisa» (Aeromovil.tsx `visible`)
  ['tMorroAncho', 'carroceria', 'Morro', null, 'Morro: ancho del frente (hasta todo el ancho, como el Aptera)', 0, 1, 0.05, 'x'],
  ['tMorroGrosor', 'carroceria', 'Morro', null, 'Morro: grosor del borde de delante', 0, 0.25, 0.005, 'cm'],
  ['tMorroBombeo', 'carroceria', 'Morro', null, 'Capó: bombeo (de plano a curvado)', 0, 0.05, 0.0025, 'cm'],
  ['tColaAncho', 'carroceria', 'Cola', null, 'Cola: ancho al final (hasta todo el ancho, como el Aptera)', 0, 1, 0.05, 'x'],
  ['tColaGrosor', 'carroceria', 'Cola', null, 'Cola: grosor del borde de atrás', 0, 0.25, 0.005, 'cm'],
  ['tColaBombeo', 'carroceria', 'Cola', null, 'Cola: bombeo de la cubierta (de plana a curvada)', 0, 0.04, 0.0025, 'cm'],
  ['tBajosIni', 'carroceria', 'Cola', null, 'Bajos de la cola: dónde empiezan a subir (desde el eje trasero)', -0.05, 0.80, 0.01, 'cm'],
  ['tBajosCurva', 'carroceria', 'Cola', null, 'Bajos de la cola: cuánto suben hasta el borde', 0, 1, 0.05, 'x'],
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
  // 2026-11-15: only in a diamond (the page hides it otherwise)
  ['tEjeLat', 'rodaje', 'Ejes y ruedas', null, 'Ruedas laterales: detrás de la del morro', 0.60, 2.40, 0.01, 'm'],
  ['tVia', 'rodaje', 'Ejes y ruedas', null, 'Vía delantera', 1.40, 2.40, 0.01, 'm'],
  // four wheels (2026-11-11): its real minimum is the narrowest track whose rear pods clear the tail (`viaTraseraMinima`)
  ['tViaTras', 'rodaje', 'Ejes y ruedas', null, 'Vía trasera', 0.80, 2.40, 0.01, 'm'],
  ['tGiro', 'rodaje', 'Suspensión y dirección', null, 'Giro máximo de la dirección', 18, 38, 1, '°'],
  // 2026-11-15: only with four wheels leaning (the page hides it otherwise)
  ['tBascMax', 'rodaje', 'Basculación', null, 'Inclinación máxima', 5, 30, 1, '°'],
  // 2026-11-16: the tilt system (basculacion.ts); only when it leans (the page hides them otherwise)
  ['tBascVel', 'rodaje', 'Basculación', null, 'Velocidad de inclinación', 10, 60, 1, '°/s'],
  ['tBascMargen', 'rodaje', 'Basculación', null, 'Margen de diseño sobre el coche parado e inclinado', 1.2, 3, 0.1, 'x'],
  ['tBascBrazo', 'rodaje', 'Basculación', null, 'Brazo del balancín (del eje a cada bieleta)', 0.06, 0.18, 0.005, 'cm'],
  ['tBascBloqueo', 'rodaje', 'Basculación', null, 'Bloqueado derecho por debajo de', 0, 10, 0.5, 'km/h'],
  ['tRecDel', 'rodaje', 'Suspensión y dirección', null, 'Recorrido de la suspensión delantera', 50, 110, 5, 'mm'],
  ['tRecTras', 'rodaje', 'Suspensión y dirección', null, 'Recorrido de la suspensión trasera', 50, 110, 5, 'mm'],
  ['tBasculante', 'rodaje', 'Suspensión y dirección', null, 'Basculante trasero: largo', 0.40, 0.60, 0.01, 'm'],
  ['tMRueda', 'rodaje', 'Masas', null, 'Una rueda con neumático', 3, 6, 0.1, 'kg'],
  ['tMFreno', 'rodaje', 'Masas', null, 'Un freno de disco con pinza', 0.6, 1.8, 0.1, 'kg'],
  ['tMSuspDel', 'rodaje', 'Masas', null, 'Suspensión delantera (las dos)', 5, 13, 0.5, 'kg'],
  ['tMSuspTras', 'rodaje', 'Masas', null, 'Basculante y amortiguador trasero', 4, 8, 0.5, 'kg'],
  ['tMDir', 'rodaje', 'Masas', null, 'Dirección: columna, cremallera y bieletas', 3, 6, 0.5, 'kg'],
  ['tKWNom', 'propulsion', 'Motor eléctrico', null, 'Potencia nominal', 2, 30, 0.5, 'kW'],
  ['tKWPico', 'propulsion', 'Motor eléctrico', null, 'Potencia máxima', 5, 60, 0.5, 'kW'],
  ['tMMotor', 'propulsion', 'Motor eléctrico', null, 'Motor de buje', 5, 62, 0.5, 'kg'],
  ['tMInversor', 'propulsion', 'Motor eléctrico', null, 'Controlador (inversor)', 1.4, 14, 0.1, 'kg'],
  ['tVel', 'propulsion', 'Motor eléctrico', null, 'Velocidad de cálculo', 40, 120, 5, 'km/h'],
  // 2026-11-15: only with the plug-in hybrid (the page hides them otherwise)
  ['tPhevKW', 'propulsion', 'Híbrido enchufable', null, 'Motor de gasolina: potencia', 8, 60, 0.5, 'kW'],
  ['tRendTerm', 'propulsion', 'Híbrido enchufable', null, 'Motor de gasolina: rendimiento', 20, 42, 0.5, '%'],
  // 2026-11-16: per architecture (the page shows each with its own: `tHibMec` power split, `tRendElec` split and series, `tRendCaja` parallel)
  ['tHibMec', 'propulsion', 'Híbrido enchufable', null, 'Reparto: parte que va directa por el planetario', 20, 100, 1, '%'],
  ['tRendElec', 'propulsion', 'Híbrido enchufable', null, 'Camino eléctrico: generador, inversores y motor', 65, 92, 0.5, '%'],
  ['tRendCaja', 'propulsion', 'Híbrido enchufable', null, 'Caja de cambios y cadena', 85, 97, 0.5, '%'],
  ['tDeposito', 'propulsion', 'Híbrido enchufable', null, 'Depósito de gasolina', 5, 45, 1, 'L'],
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
export let FICHAS: FichaTriciclo[] | null = null;
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
export const DESDE_EJE: Partial<Record<ClaveNumTriciclo, 1 | -1>> = { tMorro: 1, tCupIni: -1, tCupFin: -1, tPilX: -1, tPasX: -1, tBatalla: -1, tSolar: -1, tPilar: -1, tBatX: -1, tPuertaDel: -1, tPuertaTras: -1, tMalIni: -1, tPuerta2Parte: -1 };
/** What a slider shows: its value and range from the Triciclo's front axle. */
export function vistaTriciclo(f: FichaTriciclo, T: CamposTriciclo): { valor: number; min: number; max: number; defecto: number } {
  const [a, b] = rangoTriciclo(f.clave, T), d = (f.desde ?? 0) * ejeDesde(T);
  return { valor: limitarTriciclo(f.clave, T) + d, min: a + d, max: b + d, defecto: TRICICLO_DEFECTO[f.clave] + d };
}
/** The stored value for what a slider shows. */
/** Where the sliders that read «from the front axle» start: the pods' axle, or in a diamond the nose wheel (x = 0). */
export const ejeDesde = (T: CamposTriciclo) => esRombo(T) ? 0 : limitarTriciclo('tEjeDel', T);
export const guardarTriciclo = (f: FichaTriciclo, v: number, T: CamposTriciclo) => v - (f.desde ?? 0) * ejeDesde(T);
export const fichaTriciclo = (k: ClaveNumTriciclo) => deslizadoresTriciclo().find(f => f.clave === k);
export const ruedas = (l: RuedaTriciclo[]) => l.map(k => ({ k, n: RUEDAS_TRICICLO[k].n }));
export const SELECTORES_TRICICLO: SelectorTriciclo[] = [
  { clave: 'tSolarCola', n: 'Paneles solares por detrás', dep: 'carroceria', bloque: 'Techo solar y ventanas', opciones: [{ k: 'no', n: 'Solo en la cúpula' }, { k: 'si', n: 'Hasta la punta de la cola (como el Aptera)' }] },
  { clave: 'tVentanas', n: 'Cúpula', dep: 'carroceria', bloque: 'Techo solar y ventanas', opciones: [{ k: 'marco', n: 'Ventanas laterales con montante (Aptera)' }, { k: 'burbuja', n: 'De una pieza (como el Cuadriciclo en rombo)' }] },
  { clave: 'tAsientos', n: 'Asientos', dep: 'interior', bloque: 'Asientos', opciones: [{ k: 'horcajadas', n: 'A horcajadas (2 plazas)' }, { k: 'butacas', n: 'Dos butacas como el Aptera (2 plazas)' }, { k: 'filas', n: 'Tres filas: el piloto y dos filas detrás (de serie 1 + 2 + 1, 4 plazas)' }] },
  { clave: 'tFila2', n: 'Fila 2: abierta o plegada', dep: 'interior', bloque: 'Tres filas', opciones: [{ k: 'abierta', n: 'Abierta: con sus pasajeros' }, { k: 'plegada', n: 'Plegada: maletero' }] },
  { clave: 'tFila3', n: 'Fila 3: abierta o plegada', dep: 'interior', bloque: 'Tres filas', opciones: [{ k: 'abierta', n: 'Abierta: con sus pasajeros' }, { k: 'plegada', n: 'Plegada: maletero' }] },
  // 2026-11-16, row by row (filasTriciclo.ts)
  { clave: 'tFila2N', n: 'Fila 2: plazas una al lado de otra', dep: 'interior', bloque: 'Tres filas', opciones: OPCIONES_NUM_FILA },
  { clave: 'tFila2Tipo', n: 'Fila 2: tipo de asiento', dep: 'interior', bloque: 'Tres filas', opciones: OPCIONES_TIPO_FILA },
  { clave: 'tFila3N', n: 'Fila 3: plazas una al lado de otra', dep: 'interior', bloque: 'Tres filas', opciones: OPCIONES_NUM_FILA },
  { clave: 'tFila3Tipo', n: 'Fila 3: tipo de asiento', dep: 'interior', bloque: 'Tres filas', opciones: OPCIONES_TIPO_FILA },
  { clave: 'tMatCarenado', n: 'Material de la carrocería', dep: 'carroceria', bloque: 'Material y espesores', opciones: [{ k: 'carbonoLino', n: 'Carbono-lino' }, { k: 'vidrio', n: 'Fibra de vidrio' }, { k: 'carbono', n: 'Fibra de carbono' }] },
  { clave: 'tChMat', n: 'Material de los tubos', dep: 'chasis', bloque: 'Bastidor', opciones: [{ k: 'al6061', n: 'Aluminio 6061-T6' }, { k: 'cromoly', n: 'Acero cromoly 4130' }, { k: 'carbono', n: 'Tubo de carbono' }] },
  { clave: 'tRuedaDel', n: 'Ruedas delanteras (en los carenados)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['16', '20', '24', '26', '28', 'c13', 'c14', 'c15']) },
  { clave: 'tRuedaTras', n: 'Rueda trasera (dentro de la cola)', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: ruedas(['20', '24', '26', '28', 'c13', 'c14', 'c15']) },
  // (2026-11-16, Eugenio: «la parte de propulsión es tan importante que tiene que estar arriba del todo»: its own block, first)
  { clave: 'tPropulsion', n: 'Propulsión', dep: 'propulsion', bloque: 'Propulsión', opciones: [{ k: 'electrico', n: 'Eléctrica: solo batería' }, { k: 'phev', n: 'Híbrida enchufable (PHEV): batería y motor de gasolina' }] },
  { clave: 'tHibArq', n: 'Arquitectura del híbrido', dep: 'propulsion', bloque: 'Híbrido enchufable', opciones: ARQUITECTURAS_HIBRIDO },
  { clave: 'tRuedas', n: 'Disposición de las ruedas', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: [{ k: 'clasica', n: 'Dos delante en carenados' }, { k: 'rombo', n: 'En rombo: una en el morro, dos laterales en carenados, una en la cola' }] },
  { clave: 'tTraseras', n: 'Ruedas traseras', dep: 'rodaje', bloque: 'Ejes y ruedas', opciones: [{ k: 'una', n: 'Una en la cola (triciclo)' }, { k: 'dos', n: 'Dos en carenados (cuatro ruedas)' }] },
  // 2026-11-15: only with four wheels (the page hides it otherwise)
  { clave: 'tBascula', n: 'Bascular en las curvas', dep: 'rodaje', bloque: 'Basculación', opciones: [{ k: 'no', n: 'No: va siempre derecho' }, { k: 'si', n: 'Sí: la cabina y los carenados se inclinan' }] },
  { clave: 'tBascTec', n: 'Tecnología de la basculación', dep: 'rodaje', bloque: 'Basculación', opciones: TECNOLOGIAS_BASCULA },
  // 2026-11-12
  { clave: 'tAcceso', n: 'Acceso', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'cupula', n: 'La cúpula entera se abre' }, { k: 'puertas', n: 'Dos puertas como el Aptera' }] },
  { clave: 'tMaletero', n: 'Maletero', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'cola', n: 'Tapa en lo alto de la cola' }, { k: 'aptera', n: 'Portón largo como el Aptera (con puertas)' }] },
  { clave: 'tRetrovisores', n: 'Retrovisores', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'camaras', n: 'Cámaras en cápsulas' }, { k: 'espejos', n: 'Espejos de gota (como el Aptera)' }] },
  // ── Round 3 body (nose, tail, roof, hatch, fin, solar, second door), 2026-11-12
  { clave: 'tFaro', n: 'Faro del morro', dep: 'carroceria', bloque: 'Morro', opciones: [{ k: 'no', n: 'Sin faro central' }, { k: 'si', n: 'Faro central redondo (como una moto)' }, { k: 'barra', n: 'Barra de luz por todo el borde (como el Aptera)' }] },
  // 2026-11-13: the smooth body
  { clave: 'tCubierta', n: 'Morro y cola por arriba', dep: 'carroceria', bloque: 'Forma', opciones: [{ k: 'redonda', n: 'Como la cúpula (redondeados)' }, { k: 'lisa', n: 'Cubierta lisa, sin montículos (como el Aptera)' }] },
  { clave: 'tColaCorte', n: 'Formato de la cola', dep: 'carroceria', bloque: 'Cola', opciones: [{ k: 'no', n: 'Larga, hasta la punta (como siempre)' }, { k: 'kamm', n: 'Cortada en recto (cola Kamm)' }] },
  { clave: 'tConAleta', n: 'Aleta', dep: 'carroceria', bloque: 'Cola', opciones: [{ k: 'si', n: 'Con aleta' }, { k: 'no', n: 'Sin aleta' }] },
  { clave: 'tSolarMorro', n: 'Paneles solares en el morro', dep: 'carroceria', bloque: 'Techo solar y ventanas', opciones: [{ k: 'no', n: 'No' }, { k: 'si', n: 'Sí, encima del morro' }] },
  { clave: 'tPuertas2', n: 'Puertas por lado', dep: 'carroceria', bloque: 'Puertas y maletero', opciones: [{ k: 'no', n: 'Una' }, { k: 'si', n: 'Dos: la de atrás se abre hacia atrás' }] },
  { clave: 'tMando', n: 'Mando', dep: 'interior', bloque: 'Mandos', opciones: [{ k: 'manillar', n: 'Manillar' }, { k: 'volante', n: 'Volante' }] },
  { clave: 'tSalpicadero', n: 'Salpicadero', dep: 'interior', bloque: 'Salpicadero', opciones: [{ k: 'no', n: 'Pantallita sobre el depósito' }, { k: 'si', n: 'Salpicadero de lado a lado' }, { k: 'blanco', n: 'Salpicadero blanco con detalles (como el Aptera)' }] },
  // round 3 interior (2026-11-12, «el chasis no llega hasta el final»): only with two rear wheels (with one, the wheel is in the tail between them)
  { clave: 'tChLargo', n: 'Largueros: hasta', dep: 'chasis', bloque: 'Bastidor', opciones: [{ k: 'torreta', n: 'La torreta' }, { k: 'eje', n: 'El eje trasero' }] },
  // 2026-11-16 (Eugenio, after the Vision Jet's cabin: «que el interior se diseñe en 3D y se pueda elegir con mucho detalle»): interiorTriciclo.ts
  { clave: 'tAcabado', n: 'Forro del interior', dep: 'interior', bloque: 'Acabado interior', opciones: ACABADOS },
  { clave: 'tForroColor', n: 'Color del forro y del techo', dep: 'interior', bloque: 'Acabado interior', opciones: COLORES_FORRO },
  { clave: 'tMoldura', n: 'Molduras', dep: 'interior', bloque: 'Acabado interior', opciones: MOLDURAS },
  { clave: 'tConsolaTecho', n: 'Consola de techo', dep: 'interior', bloque: 'Acabado interior', opciones: CONSOLAS_TECHO },
  { clave: 'tAmbiente', n: 'Luz ambiente', dep: 'interior', bloque: 'Acabado interior', opciones: AMBIENTES },
  { clave: 'tConsolaCentral', n: 'Reposabrazos y consola', dep: 'interior', bloque: 'Acabado interior', opciones: CONSOLAS_CENTRALES },
  { clave: 'tTapiz', n: 'Tapicería de los asientos', dep: 'interior', bloque: 'Tapicería', opciones: TAPICES },
  { clave: 'tCostura', n: 'Costura', dep: 'interior', bloque: 'Tapicería', opciones: COSTURAS },
  { clave: 'tCosturaColor', n: 'Color de la costura', dep: 'interior', bloque: 'Tapicería', opciones: COLORES_COSTURA },
  { clave: 'tCinturon', n: 'Cinturones', dep: 'interior', bloque: 'Tapicería', opciones: CINTURONES },
  { clave: 'tBatDisp', n: 'Dónde va la batería', dep: 'energia', bloque: 'Batería', opciones: [{ k: 'reparto', n: 'Morro, pies y bajo los sillines' }, { k: 'chasis', n: 'A lo largo del bastidor' }] },
];
/** 2026-11-12: which of those options are on (the Aptera hatch only with doors: it takes the canopy's rear part, which a one-piece canopy carries away when it opens). */
export const conPuertas = (T: Pick<CamposTriciclo, 'tAcceso'>) => T.tAcceso === 'puertas';
export const conPortonAptera = (T: Pick<CamposTriciclo, 'tAcceso' | 'tMaletero'>) => T.tAcceso === 'puertas' && T.tMaletero === 'aptera';
export const bateriaChasis = (T: Pick<CamposTriciclo, 'tBatDisp'>) => T.tBatDisp === 'chasis';
// Round 3 interior (2026-11-12): the Aptera bucket seats, the dashboard (either style), the rails to the rear axle
export const conButacas = (T: Pick<CamposTriciclo, 'tAsientos'>) => T.tAsientos === 'butacas';
export const conSalpicadero = (T: Pick<CamposTriciclo, 'tSalpicadero'>) => T.tSalpicadero === 'si' || T.tSalpicadero === 'blanco';
export const largueroAlEje = (T: Pick<CamposTriciclo, 'tChLargo' | 'tTraseras'> & Partial<Pick<CamposTriciclo, 'tRuedas'>>) => T.tChLargo === 'eje' && esCuatro(T);
