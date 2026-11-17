// ============================================================================
// CUADRICICLO BASCULANTE · parameters and defaults (2026-11-15)
// ============================================================================
// A leaf module (no imports): geometria.ts builds PARAMETROS_BASCULANTE from it
// and geometriaBasculante.ts reads it, without the two importing each other at
// load time.
//
// Every field has the prefix `q` (the Cuadriciclo Bala uses `b`, the Triciclo
// `t`). Lengths along the car are measured from the FRONT AXLE (x = 0): `…X`
// fields behind it are positive numbers. A design saved without one of these
// keys takes the value here.

import type { IdRueda } from '../ruedas/catalogo';

/** Wheels: scooter tyres (round profile, they lean like a motorcycle's) and the Twizy's car tyre (flat: it hardly leans). */
/** 2026-11-17: or any wheel of the catalogue (`ruedas/catalogo.ts`): motorcycle, eco car, velomobile. */
export type RuedaBasculante = 'm13' | 'm14' | 'm15' | 'c13' | 's14' | IdRueda;

export interface CamposBasculante {
  // ── Carrocería: forma
  qCarroceria: 'aero' | 'smera';   // la carrocería: la gota aerodinámica, o como el Lumeneo Smera (la réplica, 2026-11-15)
  qMorro: number;       // del eje delantero a la punta del morro (m)
  qCola: number;        // del eje trasero al borde de la cola (m)
  qAncho: number;       // ancho de la carrocería (m)
  qAlto: number;        // alto total: lo más alto del techo (m)
  qSuelo: number;       // altura libre de la panza al suelo (m)
  qSeccion: number;     // forma de la mitad de arriba de la sección: 2 redonda … 3,5 casi un cajón redondeado
  qPanza: number;       // forma de la mitad de abajo: 2 redonda (deja inclinar) … 3,5 plana
  qCentro: number;      // altura de la cintura (lo más ancho) entre la panza y el techo (fracción)
  qAnchoIni: number;    // el ancho completo empieza esto detrás del eje delantero (m)
  qAnchoFin: number;    // y acaba esto detrás del eje delantero (m)
  // ── Carrocería: morro y cola
  qMorroAlto: number;   // altura de la punta del morro (m)
  qMorroPunta: number;  // 0 en punta … 1 redondo
  qMorroRedondo: number;// largo de la punta redondeada (m)
  qMorroAncho: number;  // ancho del morro entre los carenados (fracción del ancho)
  qColaAlto: number;    // altura del borde de la cola (m)
  qColaCurva: number;   // la curva del techo hasta la cola (Aptera): 1,2 casi recta … 3 aguanta arriba y cae al final
  qColaAncho: number;   // ancho del borde de la cola (fracción del ancho)
  qColaGrosor: number;  // grosor del borde de la cola (m)
  qBajosCola: number;   // los bajos empiezan a subir esto por delante del eje trasero (m)
  // ── Carrocería: cúpula
  qLineaEje: number;    // altura de la línea del morro sobre el eje delantero (m): una sola línea de la punta al techo, sin capó propio
  qParabrisasX: number; // pie del parabrisas, detrás del eje delantero (m)
  qParabrisas: number;  // largo del parabrisas a lo largo del coche (m): más, más tumbado
  qCaida: number;       // el techo empieza a caer hacia la cola esto detrás del eje delantero (m)
  qCintura: number;     // altura de la cintura de las ventanas (fracción de la mitad de arriba)
  qVentAlto: number;    // borde de arriba de las ventanas (fracción de la mitad de arriba)
  qCupFin: number;      // las ventanas acaban esto detrás del eje delantero (m)
  // ── Carrocería: techo solar
  qSolarIni: number; qSolarFin: number;   // detrás del eje delantero (m)
  qSolarTecho: 'no' | 'si';               // paneles en el techo
  qSolarMorro: 'no' | 'si';               // paneles también en el morro, delante del parabrisas (como el Aptera)
  qSolarCola: 'no' | 'si';                // paneles también en la cubierta de la cola
  // ── Carrocería: las ruedas delanteras (2026-11-15: dentro del morro, de serie; o cada una en su carenado)
  qRuedasDel: 'morro' | 'carenados';
  qMorroSobre: number;  // morro: altura del techo sobre lo más alto de los pasos de rueda (m)
  qPasoHueco: number;   // paso de rueda: hueco al neumático, girado e inclinado a tope (m)
  qPasoAbre: number;    // paso de rueda: la abertura por el lado y por debajo llega a esto sobre el eje (m)
  // ── Carrocería: carenados de las ruedas delanteras (solo con qRuedasDel 'carenados')
  qPodAlto: number;     // tamaño (alto) alrededor de la rueda (×)
  qPodAncho: number;    // anchura (×)
  qPodFrente: number;   // largo por delante del eje (×)
  qPodCola: number;     // largo de la cola, por detrás del eje (×)
  qPodForma: number;    // la cola: 0 redonda … 1 en punta
  qPodHueco: number;    // del neumático al carenado (m)
  qPodCubre: number;    // cuánto baja por debajo del eje (fracción del radio)
  qHuecoCuerpo: number; // del carenado a la carrocería, girado e inclinado a tope (m)
  // ── Carrocería: material
  qMatCarenado: 'carbonoLino' | 'vidrio' | 'carbono'; qEspCarenado: number; qEspCristal: number;   // mm
  // ── Interior
  qPilX: number; qPilY: number; qRecPil: number;   // cadera del piloto detrás del eje delantero (m), asiento sobre el suelo (m), reclinado (° desde la vertical)
  qPasX: number; qPasY: number; qRecPas: number;   // lo mismo del pasajero
  qVolX: number; qVolY: number;                    // volante: + hacia delante, + arriba (m)
  qPedX: number; qPedY: number;                    // pedales: + hacia delante, + arriba (m)
  qMOcc: number; qMAsiento: number;                // kg
  // ── Chasis
  qChMat: 'al6061' | 'cromoly' | 'carbono'; qChD: number; qChT: number; qChUniones: number;   // mm, mm, kg
  // ── Rodaje
  qBatalla: number;     // eje delantero a eje trasero (m)
  qViaDel: number; qViaTras: number;               // centro a centro de las ruedas (m)
  qRuedaDel: RuedaBasculante; qRuedaTras: RuedaBasculante;
  qBascMax: number;     // inclinación máxima (°)
  qBrazoAlto: number;   // altura del brazo de abajo del paralelogramo (m)
  qBrazoSep: number;    // separación entre los dos brazos (m)
  qGiro: number;        // giro máximo de las ruedas delanteras (°)
  qRecDel: number; qRecTras: number;               // recorrido de la suspensión (mm)
  qMRueda: number; qMFreno: number; qMSusp: number; qMBrazos: number; qMActuador: number; qMDir: number;   // kg
  // ── Motor
  qKWNom: number; qKWPico: number;   // los dos motores juntos (kW)
  qMMotor: number; qMInversor: number;   // los dos (kg)
  qVel: number;         // velocidad de cálculo (km/h)
  // ── Energía
  qKWh: number; qWhKg: number; qWhL: number; qMVarios: number; qSolarM2: number;
}

/**
 * The default design: the Lumeneo Smera's layout (a tandem two-seater on four tilting wheels, about 0.8–0.96 m wide,
 * a 0.655 m track and 25° of lean: Wikipedia and the 2008 Paris show reports) made lower and longer. Its roof, 1.10 m,
 * is 25 % under the Smera's (1.48 m: auto123.com's prototype sheet, the
 * same source nube/circuito uses for its Smera row in circuito/datos.ts), which is why both riders recline 45–47° as in a velomobile; the Aptera's curved tail
 * makes it 2.85 m long against the Smera's 2.40–2.50. Masses aim at the 250 kg Eugenio asked for.
 *
 * 2026-11-15, Eugenio: «quiero que el carenado frontal, el morro, envuelva las 2 ruedas delanteras basculantes con una
 * sola pieza muy aerodinámica, y haz que las ruedas basculantes tengan un ancho de vía un 20 % menor del actual». The
 * front wheels now go inside the nose, in wheel wells (`qRuedasDel: 'morro'`), and the front track is 0.69 m (0.86 m
 * less 20 %). The separate fairings stay as an option.
 */
export const BASCULANTE_DEFECTO: CamposBasculante = {
  qCarroceria: 'aero', qMorro: 0.57, qCola: 0.50, qAncho: 0.86, qAlto: 1.10, qSuelo: 0.14,
  qSeccion: 2.6, qPanza: 2.5, qCentro: 0.42, qAnchoIni: 0.78, qAnchoFin: 1.85,
  qMorroAlto: 0.34, qMorroPunta: 0.65, qMorroRedondo: 0.28, qMorroAncho: 0.60,
  qColaAlto: 0.52, qColaCurva: 1.6, qColaAncho: 0.52, qColaGrosor: 0.06, qBajosCola: 0.10,
  qLineaEje: 0.70, qParabrisasX: 0.24, qParabrisas: 0.78, qCaida: 1.95, qCintura: 0.32, qVentAlto: 0.84, qCupFin: 2.06,
  qSolarIni: 1.08, qSolarFin: 1.96, qSolarTecho: 'si', qSolarMorro: 'si', qSolarCola: 'si',
  qRuedasDel: 'morro', qMorroSobre: 0.15, qPasoHueco: 0.025, qPasoAbre: 0.06,
  qPodAlto: 1.20, qPodAncho: 1.15, qPodFrente: 1.12, qPodCola: 1.18, qPodForma: 0.6, qPodHueco: 0.035, qPodCubre: 0.35, qHuecoCuerpo: 0.03,
  qMatCarenado: 'carbonoLino', qEspCarenado: 1.5, qEspCristal: 3,
  qPilX: 0.96, qPilY: 0.24, qRecPil: 45, qPasX: 1.48, qPasY: 0.26, qRecPas: 47,
  qVolX: 0, qVolY: 0, qPedX: -0.10, qPedY: 0, qMOcc: 80, qMAsiento: 3.5,
  qChMat: 'al6061', qChD: 40, qChT: 2.0, qChUniones: 3,
  qBatalla: 1.94, qViaDel: 0.69, qViaTras: 0.62, qRuedaDel: 'm14', qRuedaTras: 'm14',
  qBascMax: 25, qBrazoAlto: 0.24, qBrazoSep: 0.22, qGiro: 20, qRecDel: 90, qRecTras: 90,
  qMRueda: 6.5, qMFreno: 1.2, qMSusp: 2.5, qMBrazos: 7, qMActuador: 6.5, qMDir: 4,
  qKWNom: 8, qKWPico: 15, qMMotor: 26, qMInversor: 4, qVel: 80,
  qKWh: 6, qWhKg: 165, qWhL: 250, qMVarios: 14, qSolarM2: 2.2,
};
