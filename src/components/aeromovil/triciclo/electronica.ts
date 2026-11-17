// Power electronics of the Triciclo family (2026-11-17, Eugenio: «Crea un nuevo apartado dentro de MOTOR que sea
// Electronica de potencia y añade el control de potencia, todas logicas de arranque del termico y cuando se activa con
// sliders, mapa de motor, y esas cosas importantes»).
//
// Pure (no React, no three.js): the energy model (energia.ts), the homologation ficha (homologacion/ficha.ts) and the
// scripts read it. From the design's fields (`tEp…`, campos.ts) it says, mode by mode, how much power each motor may give
// and how much the whole drive gives, continuous and peak — the figures 901/2014 asks for in fields 1.8.3, 1.8.5, 1.8.7
// and 1.8.9 — and when the petrol engine starts.
//
// THE DEFAULTS CHANGE NOTHING: with no combined limit (0), the strategy «libre», no sport mode and the «normal» map, the
// electric motor gives its nominal and peak power as before and the hybrid's category power is the sum, as the
// homologation pre-check did before (ficha.ts). Every figure here is the controller's configuration, not a measurement.
import type { CamposTriciclo, ClaveNumTriciclo } from './campos';
import { limitarTriciclo } from './medidas';

export type EstrategiaEp = CamposTriciclo['tEpEstrategia'];
/** The eco map's cut of the electric peak (fraction of it). An assumption: Eugenio's map is not defined yet. */
export const ECO_PICO = 0.7;

/** One driving mode: what each motor gives in it and the drive's totals (kW, at each motor's shaft, as declared). */
export interface ModoEp {
  id: 'electrico' | 'termico' | 'hibrido' | 'sport' | 'eco';
  nombre: string;
  /** what the mode is, in plain Spanish */
  texto: string;
  termico: number;
  elecCont: number;
  elecPico: number;
  /** continuous total (the 30-minute figure the category counts) */
  cont: number;
  /** peak total, for at most `picoSeg` seconds */
  pico: number;
}

export interface Electronica {
  hibrido: boolean;
  estrategia: EstrategiaEp;
  /** the engine's net maximum as declared (field 1.8.3): after the derating of «térmico rebajado» */
  termicoNeto: number;
  /** what the engine could give unlimited (the Motor tab's slider or the catalogue engine) */
  termicoMotor: number;
  /** the e-motor's continuous (30 min) and peak power (field 1.8.5 and its peak) */
  elecCont: number;
  elecPico: number;
  limCont: number | null;
  limPico: number | null;
  picoSeg: number;
  regen: number;
  modos: ModoEp[];
  /** the mode with the highest continuous total and the highest peak (134/2014, annex X, app. 2.4: the highest result counts) */
  contTotal: number;
  picoTotal: number;
  modoCont: ModoEp;
  modoPico: ModoEp;
  /** the power the energy model drives with: the electric mode's (the speeds on electricity) and the engine's alone */
  ruedasElecCont: number;
  ruedasElecPico: number;
  ruedasTermico: number;
  /** the two independent limiters of 3/2014, annex XVIII */
  limitadores: { primero: CamposTriciclo['tEpLim1']; segundo: CamposTriciclo['tEpLim2']; independientes: boolean };
  arranque: { soc: number; kW: number | null; vel: number | null; histeresis: number; calentamiento: number };
  /** the user can switch to something stronger (a sport mode, or a map to choose) */
  elegibles: string[];
}

const INF = Number.POSITIVE_INFINITY;
const tope = (v: number, lim: number | null) => Math.min(v, lim ?? INF);

export function electronicaTriciclo(T: CamposTriciclo): Electronica {
  const L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  const hibrido = T.tPropulsion === 'phev';
  const limCont = L('tEpLimCont') > 0 ? L('tEpLimCont') : null, limPico = L('tEpLimPico') > 0 ? L('tEpLimPico') : null;
  const estrategia: EstrategiaEp = hibrido ? T.tEpEstrategia : 'libre';
  // without a strategy that manages the pair, the limits still bind the electric motor (its controller)
  const elecCont = L('tKWNom'), elecPicoMotor = L('tKWPico');
  const elecPico = T.tEpMapa === 'eco' ? Math.max(elecCont, ECO_PICO * elecPicoMotor) : elecPicoMotor;
  const termicoMotor = hibrido ? L('tPhevKW') : 0;
  // «térmico rebajado»: the engine is derated so that it and the e-motor's continuous fit the continuous limit
  const termicoNeto = estrategia === 'termico' && limCont != null ? Math.max(0, Math.min(termicoMotor, limCont - elecCont)) : termicoMotor;
  const modo = (id: ModoEp['id'], nombre: string, texto: string, t: number, ec: number, ep: number, cont: number, pico: number): ModoEp =>
    ({ id, nombre, texto, termico: t, elecCont: ec, elecPico: ep, cont, pico: Math.max(cont, pico) });
  const modos: ModoEp[] = [];
  const eCont = tope(elecCont, limCont), ePico = tope(elecPico, limPico);
  modos.push(modo('electrico', 'Eléctrico', hibrido ? 'Solo la batería y el motor eléctrico; el térmico parado.' : 'El único modo: la batería y el motor eléctrico.', 0, eCont, ePico, eCont, ePico));
  if (hibrido) {
    if (estrategia === 'modos') modos.push(modo('termico', 'Térmico', 'Solo el motor de gasolina empuja; el eléctrico no da tracción.', termicoNeto, 0, 0, tope(termicoNeto, limCont), tope(termicoNeto, limPico)));
    const suma = termicoNeto + elecCont, sumaPico = termicoNeto + elecPico;
    const libre = estrategia === 'libre';
    modos.push(modo('hibrido', 'Híbrido', libre
      ? 'Los dos motores a la vez, cada uno con toda su potencia: nadie limita la suma.'
      : estrategia === 'dinamica' ? 'Los dos a la vez; la unidad de control del híbrido calcula sin parar lo que da cada uno y recorta la suma al límite.'
        : estrategia === 'termico' ? 'Los dos a la vez, con el motor de gasolina rebajado para que la suma continua quepa en el límite.'
          : 'Los dos a la vez, con la suma recortada al límite.',
    termicoNeto, elecCont, elecPico, libre ? suma : tope(suma, limCont), libre ? sumaPico : tope(sumaPico, limPico)));
    if (T.tEpSport === 'si' && !libre) {
      const p = tope(sumaPico, limPico);
      modos.push(modo('sport', 'Sport', 'Quita el límite continuo: deja la potencia pico del conjunto todo el rato que el conductor la pida.', termicoNeto, elecCont, elecPico, p, p));
    }
  } else if (T.tEpSport === 'si') {
    const p = tope(elecPicoMotor, limPico);
    modos.push(modo('sport', 'Sport', 'Quita el límite continuo: deja el pico del motor todo el rato que se pida.', 0, elecCont, elecPicoMotor, p, p));
  }
  // a map the driver can choose is one more mode to test: the full map's
  const elegibles: string[] = [];
  if (T.tEpSport === 'si') elegibles.push('el modo sport');
  if (T.tEpMapa === 'elegible') {
    elegibles.push('el mapa normal (con el eco elegible)');
    if (!hibrido) modos.push(modo('eco', 'Eco', `El mapa eco: el pico eléctrico al ${Math.round(ECO_PICO * 100)} %.`, 0, elecCont, Math.max(elecCont, ECO_PICO * elecPicoMotor), eCont, tope(Math.max(elecCont, ECO_PICO * elecPicoMotor), limPico)));
  }
  // (on a tie the later, stronger-hardware mode is named: the hybrid over the electric)
  const modoCont = modos.reduce((a, b) => (b.cont >= a.cont ? b : a)), modoPico = modos.reduce((a, b) => (b.pico >= a.pico ? b : a));
  const primero = T.tEpLim1, segundo = T.tEpLim2;
  return {
    hibrido, estrategia, termicoNeto, termicoMotor, elecCont, elecPico: elecPicoMotor, limCont, limPico, picoSeg: L('tEpPicoSeg'), regen: L('tEpRegen'),
    modos, contTotal: modoCont.cont, picoTotal: modoPico.pico, modoCont, modoPico,
    ruedasElecCont: eCont, ruedasElecPico: ePico, ruedasTermico: tope(termicoNeto, limCont),
    limitadores: { primero, segundo, independientes: primero !== 'ninguno' && segundo !== 'ninguno' },
    arranque: { soc: L('tEpArrSoc'), kW: L('tEpArrKW') > 0 ? L('tEpArrKW') : null, vel: L('tEpArrVel') > 0 ? L('tEpArrVel') : null, histeresis: L('tEpHist'), calentamiento: L('tEpCalent') },
    elegibles,
  };
}

/** Why the petrol engine is running at a given speed and power demand, or null if it stays off (battery above its threshold). */
export function arrancaTermico(el: Electronica, kmh: number, kWPedidos: number, socBajo = false): string | null {
  if (!el.hibrido) return null;
  if (socBajo) return `la batería ha bajado del ${Math.round(el.arranque.soc)} %`;
  if (el.arranque.kW != null && kWPedidos > el.arranque.kW) return `se piden más de ${fmtKW(el.arranque.kW)}`;
  if (el.arranque.vel != null && kmh > el.arranque.vel) return `va a más de ${Math.round(el.arranque.vel)} km/h`;
  return null;
}
const fmtKW = (v: number) => `${v.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kW`;

/** The texts of the limiters, for the panel and the homologation study. */
export const TEXTO_LIMITADOR: Record<CamposTriciclo['tEpLim1'] | CamposTriciclo['tEpLim2'], string> = {
  ninguno: 'ninguno',
  hcu: 'gestión del par combinado en la unidad de control del híbrido (programa)',
  controlador: 'mapa de potencia en el controlador del motor eléctrico (programa)',
  rpm: 'recorte de potencia por las vueltas del motor eléctrico, por una vía de control aparte',
  velocidad: 'recorte de potencia por la velocidad del vehículo medida aparte del motor (sensor de rueda)',
  fisico: 'límite físico: la relación de la reductora y el régimen máximo del motor',
};
