// Triciclo family defaults (every `t…` field). Moved out of geometria.ts unchanged (2026-11-16, refactor «ordenar»),
// as basculante/defecto.ts: a new Triciclo field no longer touches geometria.ts. geometria.ts re-exports it.
import type { CamposTriciclo } from './campos';

/**
 * El Triciclo Bala (2026-11-10): la forma, la del Cuadriciclo en rombo (los mismos
 * valores, en sus campos `t…`); lo demás, propuesto (ver geometriaTriciclo.ts
 * y memory/03_DECISIONS.md del 2026-11-10). Lo que no son campos `t…` viene del
 * Gota y el Triciclo no lo usa.
 */
export const TRICICLO_DEFECTO: CamposTriciclo = {
  tAncho: 0.85, tSuelo: 0.124, tMorro: 0.60, tPuntaMorro: 0.75, tCola: 0.65, tPuntaCola: 0.47, tAleta: 1.0, tCupIni: 0.15, tCupFin: 2.00, tAlto: 1.452,
  tSolar: 1.10, tVentAlto: 0.42, tVentanas: 'marco', tPilar: 0.62, tPilarBarrido: 0.48, tPilarAncho: 0.055,
  tPodEsc: 1, tPodAncho: 1, tPodCola: 1, tBrazo: 0.20, tFaldon: 0,
  tMatCarenado: 'carbonoLino', tEspCarenado: 1.5, tEspCristal: 3,
  tPilX: 1.06, tPilY: 0.40, tPasX: 1.54, tPasY: 0.43, tRecPil: 5, tRecPas: 0, tManX: 0, tManY: 0, tPiesX: 0, tPiesY: 0, tMOcc: 80, tMAsiento: 3.5,
  tAsientos: 'horcajadas', tFila2: 'abierta', tFila3: 'abierta', tFila2X: 0.70, tFila3X: 0.72, tRecFila: 15,
  // 2026-11-16, row by row (filasTriciclo.ts): rows 2 and 3 as they always were, two car seats and one
  tFila2N: '2', tFila3N: '1', tFila2Tipo: 'coche', tFila3Tipo: 'coche',
  tChMat: 'cromoly', tChD: 45, tChT: 2.4, tChUniones: 3.5,
  tBatalla: 2.45, tEjeDel: 0.30, tEjeTras: 0, tVia: 1.80, tRuedaDel: '20', tRuedaTras: '24', tGiro: 28, tRecDel: 80, tRecTras: 80, tBasculante: 0.50,
  // the «Cuadriciclo Bala clásico» (2026-11-11): one rear wheel in the tail by default; a design without `tViaTras` takes its own `tVia` (camposTriciclo)
  tTraseras: 'una', tViaTras: 1.80,
  // 2026-11-15 (Eugenio, «Smeraptera»): the four-wheeler tilting in bends, its cabin and the four pods on their arms; off by default
  tBascula: 'no', tBascMax: 15,
  // 2026-11-16: the tilt system itself (basculacion.ts)
  tBascTec: 'electrica', tBascVel: 30, tBascMargen: 2, tBascBrazo: 0.10, tBascBloqueo: 3,
  // 2026-11-15 (Eugenio, «Rombo Bala»): the wheels in a diamond, one in the nose, two lateral in pods, one in the tail; off by default
  tRuedas: 'clasica', tEjeLat: 1.35,
  // 2026-11-15 (Eugenio): a plug-in hybrid like the Prius (power-split planetary gear); off by default
  tPropulsion: 'electrico', tPhevKW: 25, tRendTerm: 38, tDeposito: 20,
  // 2026-11-16: the hybrid's architecture (hibrido.ts). The power split at 50 % mechanical (97 %) and 83 % electrical gives
  // 90 %, the old «Conversión mecánica» default: an untouched hybrid gives the same litres as before
  tHibArq: 'reparto', tHibMec: 50, tRendElec: 83, tRendCaja: 93,
  // 2026-11-17 (masas): the engine and the tank where they go by default (hibrido.ts), not moved
  tMotX: 0, tMotY: 0, tMotZ: 0, tDepX: 0, tDepY: 0, tDepZ: 0,
  // 2026-11-17: the electric motor in the hub, as every design saved before (the central MG2 on the planetary is chosen)
  tMotorElec: 'buje',
  // 2026-11-17 (electrónica de potencia, triciclo/electronica.ts): no combined limit, no sport, the full map, no limiter
  // declared, and the engine starting when the battery reaches the 10 % the range has always left in it (USABLE = 90 %):
  // a design saved without these keys has the same power, speeds, range and homologation figures as before
  tEpLimCont: 0, tEpLimPico: 0, tEpPicoSeg: 10, tEpRegen: 10, tEpArrSoc: 10, tEpArrKW: 0, tEpArrVel: 0, tEpHist: 10, tEpCalent: 30,
  tEpEstrategia: 'libre', tEpSport: 'no', tEpMapa: 'normal', tEpLim1: 'ninguno', tEpLim2: 'ninguno',
  tMRueda: 4.5, tMFreno: 1.2, tMSuspDel: 9, tMSuspTras: 6, tMDir: 4.5,
  tKWNom: 5, tKWPico: 10, tMMotor: 13, tMInversor: 2.5, tVel: 80,
  // (2026-11-17: «Varios» 12 → 18 kg, the catalogue's charging and 12 V parts add up to 16.5 kg, electrico/sistema.ts; a design that
  // stored 12 keeps 12: camposTriciclo takes every stored number)
  tKWh: 9, tWhKg: 160, tWhL: 230, tMVarios: 18, tSolarM2: 2.2,
  // 2026-11-12 (Eugenio, the «Cuadriciclo Bala clásico»): battery layout, steering wheel, dashboard, Aptera doors,
  // mirrors and boot. Every option's default is what there was before, so a design saved without them is unchanged.
  tBatDisp: 'reparto', tBatLargo: 0.94, tBatAncho: 150, tBatAlto: 0.10, tBatX: 0.70,
  tMando: 'manillar', tVolX: 0, tVolY: 0, tVolInc: 30, tVolD: 0.32,
  tSalpicadero: 'no', tSalpY: 0, tSalpFondo: 0.16,
  tAcceso: 'cupula', tPuertaDel: 0.80, tPuertaTras: 1.86, tUmbral: 0.34, tCintura: 0, tBisagraY: 0.05, tBisagraInc: 13, tBisagraDentro: 20, tPuertaAbre: 110,
  tRetrovisores: 'camaras',
  tMaletero: 'cola', tMalIni: 1.40, tMalAbre: 36, tMalLado: 55, tSolarCola: 'no',
  // Round 3 interior (2026-11-12): the rails to the rear axle and their spacing. 0.22 m is 2 × Z_LARGUERO, the spacing until now.
  // (2026-11-15: rails to the rear axle by default; it only applies with two rear wheels, which have no shock tower to stop at)
  tChLargo: 'eje', tChSep: 0.22,
  // Round 3 body (2026-11-12, the «Cuadriciclo Bala clásico»: nose, tail, roof, fin, solar, second door). Every default is
  // the shape and the options as they were, so a design saved without these keys is built exactly as before.
  tMorroLinea: 0, tMorroAlto: 0, tFaro: 'no', tFaroD: 0.16, tColaPlana: 0, tTechoPlano: 0, tCaida: 0, tSubida: 0, tBajosMorro: 0, tMorroCurva: 0, tConAleta: 'si', tSolarMorro: 'no',
  tPuertas2: 'no', tPuerta2Parte: 1.33, tBisagra2Y: 0.85, tBisagra2Inc: 15, tPuerta2Abre: 110, tLineaCupula: 0,
  // Round 4 doors / roof frame / height (2026-11-13): no roof frame by default, so every saved design is built as before
  tMarcoTecho: 0,
  // The smooth body (2026-11-13, the clásico: «la cola y el maletero… la misma pieza… nunca… montículos», the Aptera's
  // wide nose and tail, its light bar and the belly's sweep). Off by default: every other key below acts only with it on.
  tCubierta: 'redonda', tColaAncho: 0, tColaGrosor: 0, tColaBombeo: 0.01, tBajosIni: 0.20, tBajosCurva: 0, tMorroAncho: 0, tMorroGrosor: 0, tMorroBombeo: 0.02,
  // 2026-11-16 (Eugenio, after the Vision Jet's cabin): the interior finish (interiorTriciclo.ts). Every default is today's
  // look (no lining, the grey quilted seats, no belts drawn), so a saved design opens as it was, with the same masses.
  tAcabado: 'chasis', tTapiz: 'serie', tCostura: 'geometrica', tCosturaColor: 'crema', tForroColor: 'crema', tMoldura: 'carbono',
  tConsolaTecho: 'no', tConsolaCentral: 'no', tCinturon: 'no', tAmbiente: 'no',
  // 2026-11-16 (Eugenio: «que la cola pueda ser más ancha en el formato de cola plana… como en el aptera»): the round
  // body's flat tail towards the full width; 0 by default, so every saved design is built as before
  tColaPlanaAncho: 0,
  // 2026-11-16 (Eugenio: «haz que esto no pueda ocurrir, este salto que hay entre la cola y la cabina»): the cabin–tail
  // transition, 40 cm. Every saved design of the round body takes it: the crease it removes was a bug
  tColaTrans: 0.40,
  // 2026-11-17: the Kamm tail, off: every saved design keeps its long tail. Kamm's own rule when it is chosen: cut at half
  // the largest section, flat base
  tColaCorte: 'no', tKammSeccion: 0.50, tKammCavidad: 0,
  // 2026-11-24 (bici/clase.ts): a heavy vehicle's components, as every design until now
  tClase: 'pesado',
};
