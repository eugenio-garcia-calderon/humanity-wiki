// What the design says today about each part of the running gear (2026-11-24), read from the model and the price list that
// the rest of the page already computes: never a second source. Pure functions, no React: `scripts/rodaje.ts` could call them.
import type { PrecioParte, PreciosDiseno } from '../precios/precios';
import type { ModeloTriciclo, ResultadosTriciclo } from '../geometriaTriciclo';
import { cargasRueda, grupoPieza } from '../triciclo/masas';
import { fichaRueda } from '../ruedas/catalogo';
import { SUBSISTEMAS, subsistema } from './subsistemas';
import type { IdSub } from './tipos';

export interface NumerosSub {
  /** every part of the mass list that is this part of the running gear, with its kg and its price and where the price comes from */
  partes: PrecioParte[];
  kg: number;
  eur: number;
}

/** The mass and the price of a part of the running gear in the design as it is now: the favourite's, or the model's own estimate. */
export function numerosActuales(sub: IdSub, precios: PreciosDiseno | null): NumerosSub {
  const re = subsistema(sub).piezas, vistas = new Map<string, PrecioParte>();
  if (precios) {
    for (const s of Object.values(precios.secciones)) if (s.tipo === 'propia') for (const p of s.partes) if (re.test(p.nombre)) vistas.set(p.nombre, p);
    for (const l of Object.values(precios.sinSeccion)) for (const p of l ?? []) if (re.test(p.nombre)) vistas.set(p.nombre, p);
  }
  const partes = [...vistas.values()];
  return { partes, kg: partes.reduce((a, p) => a + p.kg, 0), eur: partes.reduce((a, p) => a + p.eur, 0) };
}

/**
 * The lines of a department's mass list that none of its parts claims (the pedals, the hybrid's planetary gear, the tilt
 * system): the department's summary says them, so its parts and its tab add up to the same figure.
 */
export function sinParteDe(dep: string, precios: PreciosDiseno | null): PrecioParte[] {
  if (!precios) return [];
  const propias = SUBSISTEMAS.filter(s => s.dep === dep).map(s => s.piezas), vistas = new Map<string, PrecioParte>();
  const mira = (p: PrecioParte) => { if (grupoPieza(p.nombre) === dep && !propias.some(re => re.test(p.nombre))) vistas.set(p.nombre, p); };
  for (const s of Object.values(precios.secciones)) if (s.tipo === 'propia') s.partes.forEach(mira);
  for (const l of Object.values(precios.sinSeccion)) (l ?? []).forEach(mira);
  return [...vistas.values()];
}

/** The numbers the steering's geometry needs, from the design: the wheelbase, the front track and what the model turns the wheels to. */
export interface DatosGiro {
  batalla: number;
  via: number;
  /** the steering lock the design asks for (the inner wheel, °), and the outer wheel's angle the model computes for it */
  dentro: number;
  fuera: number;
  /** the turning radius of the outer front wheel (m) */
  radio: number;
  mando: 'manillar' | 'volante';
}
export function datosGiro(m: ModeloTriciclo, rt: ResultadosTriciclo): DatosGiro {
  return { batalla: m.batalla, via: m.via.del, dentro: rt.giro.dentro, fuera: rt.giro.fuera, radio: rt.giro.radio, mando: m.campos.tMando };
}

export interface AguantaRueda {
  /** the heaviest load on a wheel of this axle (kg) and what the tyre carries (kg) */
  carga: number; capacidad: number; cargaOk: boolean;
  /** the speed the design is built for (km/h) and the tyre's top (km/h) */
  velocidad: number; vmax: number; velocidadOk: boolean;
}
/** Would this wheel hold the design: the heaviest load of its axle against the tyre's rating, the design's speed against the tyre's. */
export function aguantaRueda(id: string, eje: 'del' | 'tras', m: ModeloTriciclo, rt: ResultadosTriciclo): AguantaRueda | null {
  const f = fichaRueda(id); if (!f) return null;
  const c = cargasRueda(m, rt.piezas), carga = eje === 'del' ? c.del : c.tras, velocidad = m.campos.tVel;
  return { carga, capacidad: f.carga, cargaOk: carga <= f.carga, velocidad, vmax: f.vmax, velocidadOk: velocidad <= f.vmax };
}
