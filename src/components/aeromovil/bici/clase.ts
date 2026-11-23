// The vehicle's class of components (2026-11-24): a heavy vehicle's (moped, motorcycle and car parts: every design until
// that day) or a bicycle's. Eugenio: «vehículos ligeros con componentes de piezas de bicicleta … bicicletas de 4 ruedas».
//
// A LEAF MODULE: types only from the Triciclo, so `triciclo/medidas.ts` and `triciclo/masas.ts` can read it without a
// cycle. What the class changes, and nothing else:
//  - the RANGE AND STEP of the sliders whose heavy-vehicle range starts above anything a bicycle carries (a 250 W motor
//    does not fit a slider that starts at 2 kW, nor a 1 kWh battery one that starts at 5): `RANGOS_BICI`;
//  - how the running gear is SIZED FOR ITS LOAD when no catalogue part is chosen (`masaEsquinaBici`, `masaFrenoBici`
//    instead of the motorcycle-class rules of `triciclo/masas.ts`);
//  - the equipment's standing draw (`AUXILIARES_BICI`).
// With `tClase: 'pesado'` (the default; a design saved before has no `tClase`) every number is exactly as before.
import type { CamposTriciclo, ClaveNumTriciclo } from '../triciclo/campos';

export type ClaseVehiculo = 'pesado' | 'bici';
export const OPCIONES_CLASE: { k: ClaseVehiculo; n: string; clase: 'bici' | 'pesado' }[] = [
  { k: 'pesado', n: 'Vehículo pesado: piezas de moto y de coche', clase: 'pesado' },
  { k: 'bici', n: 'Bicicleta: piezas de bicicleta', clase: 'bici' },
];
export const esBici = (T: { tClase?: string }) => T.tClase === 'bici';

/**
 * [min, max, step] of a slider when the vehicle is built from bicycle components. Estimates of what bicycle parts
 * weigh and give, around the published ones of `bici/catalogo.ts` and `catalogoTren.ts`:
 *  - motor: from 250 W (the pedal-assist limit) to 4 kW (a light moped's, L1e-B); 1.5–14 kg for all the hub motors
 *    together (a Bafang 250 W hub is 3.3 kg; two Grin All-Axle, 8.1 kg); controller from 0.15 kg (a Grin Baserunner
 *    is 0.18 kg);
 *  - battery: 0.3–6 kWh (ICE Trikes' is 700 Wh, the Podbike Frikar's 877 Wh each of one or two);
 *  - running gear: each slider is the lightest it may be, and the load raises it (`masaEsquinaBici`, `masaFrenoBici`);
 *  - frame: bicycle tube, 20–55 mm across and 0.8–3 mm of wall. No source read for these: an estimate; the check
 *    «Bastidor: coeficiente de seguridad de los largueros» says whether the tube chosen holds;
 *  - a wheel's mass is the catalogue's own (the «Una rueda con neumático» slider is the moped wheel the older sizes are
 *    multiples of: fixed at its reference, 4.5 kg, so a bicycle wheel weighs what its sheet says).
 */
export const RANGOS_BICI: Partial<Record<ClaveNumTriciclo, [number, number, number]>> = {
  tKWNom: [0.25, 4, 0.05], tKWPico: [0.25, 8, 0.05], tMMotor: [1.5, 14, 0.1], tMInversor: [0.15, 3, 0.05], tVel: [15, 60, 1],
  tKWh: [0.3, 6, 0.1], tMVarios: [1, 15, 0.5],
  tMRueda: [4.5, 4.5, 0.1], tMSuspDel: [0.8, 8, 0.1], tMSuspTras: [0.8, 8, 0.1], tMFreno: [0.15, 1.5, 0.05], tMDir: [0.8, 5, 0.1],
  tMAsiento: [0.8, 5.5, 0.1], tChD: [20, 55, 1], tChT: [0.8, 3, 0.1], tChUniones: [0.3, 4, 0.1], tEspCristal: [1, 4.5, 0.5],
};
export const rangoBici = (k: ClaveNumTriciclo, T: { tClase?: string }): [number, number, number] | null => (esBici(T) ? RANGOS_BICI[k] ?? null : null);

/**
 * One corner's suspension in bicycle parts (kg) for `carga` kg on its wheel: an air shock (a RockShox Monarch RL is
 * 215 g, a DNM AOY-36RC 300 g: `bici/catalogo.ts`) and its arms, upright and stub axle in bicycle tube. About 1.1 kg
 * with 75 kg on the wheel, more with more. An estimate: no maker publishes a corner's mass.
 */
export const masaEsquinaBici = (carga: number) => 0.5 + 0.008 * carga;
/**
 * One bicycle brake (kg) for `carga` kg on its wheel, through the two published drum hubs: a 70 mm one (770 g) with
 * 80 kg on the wheel, a 90 mm one (970 g) with 130 kg. Their makers publish no load: the pairing is an estimate.
 */
export const masaFrenoBici = (carga: number) => 0.45 + 0.004 * carga;
/** Lights, display and the controllers' standing draw (W): two LED headlamps and the electronics. An estimate (a heavy vehicle's: 80 W). */
export const AUXILIARES_BICI = 12;

/**
 * What «pasar a componentes de bicicleta» sets on a Triciclo-family design, leaving its shape, seats and doors alone:
 * cargo-bicycle wheels (125 kg each: the ones that carry a two-seater), a frame of thin bicycle tube, electric only,
 * 250 W in all (two hub motors of 125 W, as Schaeffler and Heinzmann's chainless cargo bike: the pedal-assist limit is
 * for the whole vehicle), two 0.18 kg controllers (a Grin Baserunner's mass), 1.4 kWh (two e-bike batteries of 700 Wh at the 189 Wh/kg of ICE
 * Trikes' pack), 25 km/h. Each value is inside `RANGOS_BICI`. The bicycle brakes, suspension and pedals are the
 * bicycle block's own fields (`bici/pedales.ts` `BICI_PROPUESTA`).
 */
export const VALORES_BICI: Partial<CamposTriciclo> = {
  tClase: 'bici', tRuedaDel: 'cargo20', tRuedaTras: 'cargo20', tNeuDel: 'serie', tNeuTras: 'serie', tConsDel: 'serie', tConsTras: 'serie', tMRueda: 4.5,
  tChMat: 'cromoly', tChD: 38, tChT: 1.2, tChUniones: 1.5,
  tMSuspDel: 2.2, tMSuspTras: 2.2, tMFreno: 0.75, tMDir: 1.5, tMAsiento: 1.5,
  tPropulsion: 'electrico', tMotorElec: 'buje', tCatMotor: 'medida', tCatCtrl: 'medida', tCatReductora: 'medida', tCatTermico: 'medida',
  tKWNom: 0.25, tKWPico: 0.6, tMMotor: 6.6, tMInversor: 0.36, tVel: 25,
  tKWh: 1.4, tWhKg: 190, tBatDisp: 'reparto', tMVarios: 3,
};
