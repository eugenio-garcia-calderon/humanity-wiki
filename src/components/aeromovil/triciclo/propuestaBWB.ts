// «Aeromóvil BWB (propuesta)» (2026-11-17): a built-in design, not a saved one. Eugenio: «prueba a crear tú un modelo que
// se parezca a un BWB copiando como nuevo el Aeromóvil Rombo que está creado, que tiene las ruedas en rombo».
// The parameters of «Aermovil Rombo» (saved design id 14, Triciclo family, `tRuedas: 'rombo'`), read from
// GET /api/aeromovil/disenos on 2026-11-17 (its `t…` fields and `disposicion`; the rest are the Triciclo's defaults), with
// the blended-wing-body fairing on (triciclo/bwb.ts), its values chosen to resemble Airbus's ZEROe BWB / MAVERIC within a
// road vehicle: a thick, reflexed centre (18 %) blending over 50 cm into a 12 % outer wing swept 34° with 5° dihedral and
// 3° washout, sharklet tips, and a fold just inboard of mid-span (45 %) so that folded at 120° it stays under 2,0 m.
// It lives in the design menu (Disenos.tsx `PROPUESTAS`) with a negative id: it never autosaves and is never written to
// the database; «Guardar como nuevo» makes a real copy. Headless: put `PROPUESTA_BWB` in localStorage
// 'aeromovil.parametros.v5' (see memory/08_CHANGELOG.md, 2026-11-17).
import type { Parametros } from '../geometria';
import type { CamposBWB } from './bwb';

/** «Aermovil Rombo» (id 14) as saved on 2026-11-17. */
const ROMBO_14 = {
  disposicion: "triciclo", tAcabado: "lujo", tAcceso: "puertas", tAleta: 0.85, tAlto: 1.292, tAmbiente: "ambar", tAncho: 0.92, tAsientos: "horcajadas",
  tBajosCurva: 0, tBajosIni: 0.2, tBajosMorro: 0.1, tBascBloqueo: 3, tBascBrazo: 0.1, tBascMargen: 2, tBascMax: 23, tBascTec: "electrica",
  tBascVel: 30, tBascula: "no", tBasculante: 0.55, tBatAlto: 0.095, tBatAncho: 100, tBatDisp: "chasis", tBatLargo: 1.7, tBatX: 0.33,
  tBatalla: 3.12, tBisagra2Inc: 15, tBisagra2Y: 0.85, tBisagraDentro: 20, tBisagraInc: 13, tBisagraY: 0.05, tBrazo: 0.185, tCaida: 0.35,
  tChD: 51, tChLargo: "torreta", tChMat: "cromoly", tChSep: 0.23, tChT: 2.9, tChUniones: 4.5, tCintura: 0, tCinturon: "negro",
  tCola: 0.37, tColaAncho: 0, tColaBombeo: 0.01, tColaCorte: "no", tColaGrosor: 0, tColaPlana: 1, tColaPlanaAncho: 0.55, tColaTrans: 1.12,
  tConAleta: "no", tConsDel: "serie", tConsolaCentral: "no", tConsolaTecho: "encendida", tCostura: "geometrica", tCosturaColor: "crema", tCubierta: "redonda", tCupFin: 2.52,
  tCupIni: 0.13, tDepX: 0, tDepY: 0, tDepZ: 0, tDeposito: 15, tEjeDel: 0.45, tEjeLat: 1.56, tEspCarenado: 1.5,
  tEspCristal: 3, tFaldon: 1, tFaro: "no", tFaroD: 0.16, tFila2: "abierta", tFila2N: "1", tFila2Tipo: "coche", tFila2X: 0.7,
  tFila3: "abierta", tFila3N: "1", tFila3Tipo: "coche", tFila3X: 0.72, tForroColor: "crema", tGiro: 29, tKWNom: 15, tKWPico: 31.5,
  tKWh: 20.5, tKammCavidad: 0, tKammSeccion: 0.5, tLineaCupula: 0.04, tMAsiento: 3.5, tMDir: 5, tMFreno: 1.4, tMInversor: 2.5,
  tMMotor: 13, tMOcc: 80, tMRueda: 5.9, tMSuspDel: 10.5, tMSuspTras: 7, tMVarios: 12, tMalAbre: 36, tMalIni: 1.81,
  tMalLado: 26, tMaletero: "aptera", tManX: 0.25, tManY: 0, tMando: "volante", tMarcoTecho: 0, tMatCarenado: "carbonoLino", tMoldura: "carbono",
  tMorro: 0.53, tMorroAlto: 0.045, tMorroAncho: 0, tMorroBombeo: 0.02, tMorroCurva: 0.15, tMorroGrosor: 0, tMorroLinea: 0, tMotX: 0,
  tMotY: 0, tMotZ: 0, tMotorElec: "buje", tNeuDel: "serie", tNeuTras: "serie", tPasX: 1.6400000000000001, tPasY: 0.363, tPhevKW: 20,
  tPiesX: 0.08, tPiesY: 0.01, tPilX: 1.03, tPilY: 0.328, tPilar: 0.5900000000000001, tPilarAncho: 0.045, tPilarBarrido: 0.8, tPodAncho: 0.921111111111111,
  tPodCola: 0.887777777777778, tPodEsc: 0.9, tPropulsion: "phev", tPuerta2Abre: 110, tPuerta2Parte: 1.33, tPuertaAbre: 110, tPuertaDel: 0.8, tPuertaTras: 1.86,
  tPuertas2: "no", tPuntaCola: 0.54, tPuntaMorro: 0.15, tRecDel: 110, tRecFila: 15, tRecPas: 35, tRecPil: 31, tRecTras: 110,
  tRendTerm: 38, tRendTrans: 91.5, tRetrovisores: "espejos", tRuedaDel: "26", tRuedaTras: "c14", tRuedas: "rombo", tSalpFondo: 0.16, tSalpY: 0,
  tSalpicadero: "blanco", tSolar: 1.01, tSolarCola: "si", tSolarM2: 2.2, tSolarMorro: "si", tSubida: -0.05, tSuelo: 0.178, tTapiz: "serie",
  tTechoPlano: 0.4, tTraseras: "una", tUmbral: 0.34, tVel: 120, tVentAlto: 0.43, tVentanas: "marco", tVia: 1.54, tViaTras: 1.4,
  tVolD: 0.32, tVolInc: 30, tVolX: 0, tVolY: 0, tWhKg: 195, tWhL: 240,
};
/** The BWB fairing of the proposal. */
export const BWB_PROPUESTA: CamposBWB = {
  tBwb: "si", tBwbEnv: 3.2, tBwbPos: 2.2, tBwbAltura: 0.55, tBwbCuerdaRaiz: 1.05, tBwbCuerdaPunta: 0.35,
  tBwbFlecha: 34, tBwbDiedro: 5, tBwbTorsion: -3, tBwbIncidencia: -1, tBwbEspesor: 12, tBwbEspesorRaiz: 18,
  tBwbPerfil: "reflejado", tBwbMezcla: 0.5, tBwbMezclaCuerda: 0.8, tBwbRadio: 0.15, tBwbPunta: "sharklet", tBwbWinglet: 0.4,
  tBwbWingletCant: 20, tBwbPliegue: 0.45, tBwbPliegueAng: 120, tBwbPlegadas: "no",
};
export const PROPUESTA_BWB = { ...ROMBO_14, ...BWB_PROPUESTA } as unknown as Parametros;
export const NOMBRE_PROPUESTA_BWB = 'Aeromóvil BWB (propuesta)';
