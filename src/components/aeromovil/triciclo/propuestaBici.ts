// «Vehículo de producción (bicicleta)» (2026-11-24): a built-in design, not a saved one. Eugenio: «crea, en base al
// modelo 3d llamado "vehículo de producción", un modelo exactamente igual que ese, pero con componentes de bicicleta, es
// decir, con ruedas de bicicleta, con chasis mucho más ligero de bicicleta, y permite poner pedales al conductor».
// The parameters of «Vehiculo de producción» (saved design id 19, Triciclo family, four wheels), read from
// GET /api/aeromovil/disenos on 2026-11-24 (saved 2026-11-19 21:45; its `t…` fields and `disposicion`), with:
//  - `VALORES_BICI` (bici/clase.ts): bicycle class, cargo-bicycle wheels, 55 × 2 mm chromoly tube, two hub motors of
//    125 W, 250 W in all, a small battery in the same place in the frame, 25 km/h;
//  - `BICI_PROPUESTA` (bici/pedales.ts): hydraulic bicycle discs, an air shock a corner, the driver's pedals on a
//    chainless generator;
//  - and three values of this design's own, found by trying (scripts/bici.ts prints the result): the pods 8 % wider
//    (`tPodAncho` 0.92 → 1.0: a 60 mm cargo tyre is wider than the car tyre's pod left room for, by 2 mm), and the crank
//    axle 3 cm ahead and 6 cm above where the drawn feet put it, with 150 mm cranks (lower, the shoes went through the
//    floor by 5 cm).
// Its shape, seats, doors, canopy, interior and steering wheel are the original's, untouched. It is NOT a copy that
// follows the original: if Eugenio changes design 19, this one stays as read that day.
// What stays red in it, on purpose (a consequence to show, not to hide by changing his geometry): rollover (lighter
// vehicle, same riders, same track), the driver's knees against the steering wheel while pedalling, and the pilot's
// head to the canopy (already red in the original).
import type { Parametros } from '../geometria';
import { VALORES_BICI } from '../bici/clase';
import { BICI_PROPUESTA } from '../bici/pedales';

/** «Vehiculo de producción» (id 19) as saved on 2026-11-19 and read on 2026-11-24. */
const PRODUCCION_19 = {
  disposicion: "triciclo", tAcabado: "lujo", tAcceso: "puertas", tAleta: 0.85, tAlto: 1.292, tAmbiente: "ambar", tAncho: 0.92, tAsientos: "butacas",
  tBajosCurva: 0, tBajosIni: 0.2, tBajosMorro: 0.1, tBascBloqueo: 3, tBascBrazo: 0.1, tBascMargen: 2, tBascMax: 23, tBascTec: "electrica",
  tBascVel: 30, tBascula: "no", tBasculante: 0.55, tBatAlto: 0.095, tBatAncho: 100, tBatDisp: "chasis", tBatLargo: 1.33, tBatX: 0.33, tBatalla: 3.16,
  tBisagra2Inc: 15, tBisagra2Y: 0.85, tBisagraDentro: 20, tBisagraInc: 13, tBisagraY: 0.05, tBrazo: 0.185, tCaida: 0.35, tCatReductora: "ple120-4",
  tChD: 51, tChLargo: "torreta", tChMat: "cromoly", tChSep: 0.23, tChT: 2.9, tChUniones: 4.5, tCintura: 0, tCinturon: "negro", tCola: 0.69,
  tColaAncho: 0, tColaBombeo: 0.01, tColaCorte: "no", tColaGrosor: 0, tColaPlana: 1, tColaPlanaAncho: 0.85, tColaTrans: 1.19, tConAleta: "no",
  tConsDel: "serie", tConsTras: "serie", tConsolaCentral: "no", tConsolaTecho: "encendida", tCostura: "geometrica", tCosturaColor: "crema",
  tCubierta: "redonda", tCupFin: 2.52, tCupIni: 0.13, tDepX: 0, tDepY: 0, tDepZ: 0, tDeposito: 15, tEjeDel: 0.37, tEjeLat: 0.86, tEpArrKW: 0,
  tEpArrSoc: 10, tEpArrVel: 0, tEpCalent: 30, tEpEstrategia: "libre", tEpHist: 10, tEpLim1: "ninguno", tEpLim2: "ninguno", tEpLimCont: 0,
  tEpLimPico: 0, tEpMapa: "normal", tEpPicoSeg: 10, tEpRegen: 10, tEpSport: "no", tEspCarenado: 1.5, tEspCristal: 3, tFaldon: 1, tFaro: "no",
  tFaroD: 0.16, tFila2: "abierta", tFila2N: "1", tFila2Tipo: "coche", tFila2X: 0.7, tFila3: "abierta", tFila3N: "1", tFila3Tipo: "coche",
  tFila3X: 0.72, tForroColor: "crema", tGiro: 29, tKWNom: 15, tKWPico: 31.5, tKWh: 20.5, tKammCavidad: 0, tKammSeccion: 0.5, tLineaCupula: 0.04,
  tMAsiento: 3.5, tMDir: 5, tMFreno: 1.4, tMInversor: 2.5, tMMotor: 13, tMOcc: 80, tMRueda: 5.4, tMSuspDel: 10.5, tMSuspTras: 7, tMVarios: 12,
  tMalAbre: 36, tMalIni: 1.81, tMalLado: 26, tMaletero: "aptera", tManX: 0.25, tManY: 0, tMando: "volante", tMarcoTecho: 0,
  tMatCarenado: "carbonoLino", tMoldura: "carbono", tMorro: 0.53, tMorroAlto: 0.045, tMorroAncho: 0, tMorroBombeo: 0.02, tMorroCurva: 0.15,
  tMorroGrosor: 0, tMorroLinea: 0, tMotX: 0, tMotY: 0, tMotZ: 0, tMotorElec: "buje", tNeuDel: "serie", tNeuTras: "serie", tPasX: 1.75, tPasY: 0.325,
  tPhevKW: 20, tPiesX: 0.08, tPiesY: 0.01, tPilX: 1.13, tPilY: 0.325, tPilar: 0.5900000000000001, tPilarAncho: 0.045, tPilarBarrido: 0.8,
  tPodAncho: 0.921111111111111, tPodCola: 0.887777777777778, tPodEsc: 0.9, tPropulsion: "phev", tPuerta2Abre: 110, tPuerta2Parte: 1.33,
  tPuertaAbre: 110, tPuertaDel: 0.8, tPuertaTras: 1.86, tPuertas2: "no", tPuntaCola: 0.605, tPuntaMorro: 0.15, tRecDel: 110, tRecFila: 15,
  tRecPas: 25, tRecPil: 20, tRecTras: 110, tRendTerm: 38, tRendTrans: 91.5, tRetrovisores: "espejos", tRuedaDel: "c13", tRuedaTras: "c13",
  tRuedas: "clasica", tSalpFondo: 0.16, tSalpY: 0, tSalpicadero: "blanco", tSolar: 1.01, tSolarCola: "si", tSolarM2: 2.2, tSolarMorro: "si",
  tSubida: -0.05, tSuelo: 0.178, tTapiz: "serie", tTechoPlano: 0.4, tTraseras: "dos", tUmbral: 0.34, tVel: 120, tVentAlto: 0.43, tVentanas: "marco",
  tVia: 1.12, tViaTras: 1.13, tVolD: 0.32, tVolInc: 30, tVolX: 0, tVolY: 0, tWhKg: 195, tWhL: 240,
};

export const NOMBRE_PROPUESTA_BICI = 'Vehículo de producción (bicicleta)';
export const PROPUESTA_BICI = { ...PRODUCCION_19, ...VALORES_BICI, ...BICI_PROPUESTA, tPodAncho: 1.0, tPedX: 30, tPedY: 60, tPedBiela: 150 } as unknown as Partial<Parametros>;
