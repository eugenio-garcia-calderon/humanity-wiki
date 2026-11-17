import { ajustarCarenado, areas, calcular, crearModelo, type Parametros } from '../geometria';
import type { ResultadoTunel } from '../tunel/calculo';
import { RUIDO, fichasDe, hallazgos, tipoDe, type Base, type Contexto, type Gravedad, type Hallazgo, type Prueba } from './reglas';

/**
 * The study itself (2026-11-17): the tunnel on the design as it is, the rules (reglas.ts), and the tunnel again on a
 * copy of the design for every change a rule proposes. Pure: the page passes `probar` (the tunnel's Web Worker,
 * `tunel/cliente.ts` `probarParametros`), the script `scripts/estudio-aerodinamico.ts` passes the tunnel run in Node.
 * It never writes the design: every change is tried on a copy.
 */

/** What the tunnel gave for one copy of the design: its result and its reference area. */
export interface Medicion { R: ResultadoTunel; A: number }
export type Probar = (P: Parametros) => Promise<Medicion | null>;

export type Estado = 'calculado' | 'estimado' | 'descartado' | 'noVisto';
export interface PruebaHecha { prueba: Prueba; dCdA: number | null; rompe: string[] }
export interface Pega extends Hallazgo {
  /** calculado: the tunnel computed a gain ≥ RUIDO; estimado: a part the tunnel does not see; descartado: tried and no gain;
   *  noVisto: something the tunnel leaves out of the Cd (it adds, it does not save). */
  estado: Estado;
  elegida?: PruebaHecha;
  probadas: PruebaHecha[];
  /** ΔCdA (m², negative = saved), its fraction of today's CdA and the energy it saves every 100 km at the study's speed. */
  dCdA?: number; fraccion?: number; kWh100?: number;
  gravedadFinal: Gravedad;
}
export interface Estudio {
  clave: string; kmh: number; base: Base; pegas: Pega[];
  /** Checks that already fail on the design as it is (a change is only blamed for the new ones). */
  fallosBase: string[];
}

const RHO = 1.2;
/** kWh every 100 km for a CdA change at a speed: ½ρv²·ΔCdA newtons over 100 km (1 N for 100 km = 1/36 kWh). */
export const kWh100De = (dCdA: number, kmh: number) => 0.5 * RHO * (kmh / 3.6) ** 2 * dCdA / 36;
export const claveEstudio = (P: Parametros) => JSON.stringify(P);

/** The tunnel result at the speed closest to `kmh` (it computes 50, 80 and 120 km/h). */
export function aVelocidad(R: ResultadoTunel, kmh: number) {
  return R.porVelocidad.reduce((a, b) => (Math.abs(b.kmh - kmh) < Math.abs(a.kmh - kmh) ? b : a));
}
const baseDe = (m: Medicion, kmh: number): Base => { const q = aVelocidad(m.R, kmh); return { cd: q.cd.total, A: m.A, cdA: q.cd.total * m.A, R: m.R, q }; };
/** The checks that fail on a design (their names). */
export function fallos(P: Parametros): string[] {
  const m = crearModelo(ajustarCarenado(P)), res = calcular(m, areas(m));
  return res.comprobaciones.filter(c => c.holgura < c.minimo).map(c => c.nombre);
}
export const gravedadDe = (fraccion: number): Gravedad => (fraccion >= 0.04 ? 'alta' : fraccion >= 0.015 ? 'media' : 'baja');
const ORDEN: Record<Gravedad, number> = { alta: 0, media: 1, baja: 2 };
const ORDEN_ESTADO: Record<Estado, number> = { calculado: 0, estimado: 1, noVisto: 2, descartado: 3 };

export async function hacerEstudio(P: Parametros, probar: Probar, kmh: number, alAvanzar?: (hecho: number, total: number) => void): Promise<Estudio | null> {
  const m0 = await probar(P); if (!m0) return null;
  const base = baseDe(m0, kmh), modelo = crearModelo(ajustarCarenado(P)), res = calcular(modelo, areas(modelo));
  const fallosBase = res.comprobaciones.filter(c => c.holgura < c.minimo).map(c => c.nombre);
  const fichas = fichasDe(P);
  const cx: Contexto = { P, tipo: tipoDe(P), modelo, res, base, kmh, ficha: k => fichas[k] };
  const hs = hallazgos(cx);
  const total = hs.reduce((s, h) => s + (h.pruebas?.length ?? 0), 0);
  let hecho = 0; alAvanzar?.(0, total);
  const pegas: Pega[] = [];
  for (const h of hs) {
    const probadas: PruebaHecha[] = [];
    for (const prueba of h.pruebas ?? []) {
      const Q = { ...P, ...prueba.cambios } as Parametros;
      let rompe: string[] = [];
      try { rompe = fallos(Q).filter(n => !fallosBase.includes(n)); } catch { rompe = ['(el diseño con este cambio no se pudo construir)']; }
      let dCdA: number | null = null;
      if (prueba.tunel !== false) { const r = await probar(Q); if (r) dCdA = baseDe(r, kmh).cdA - base.cdA; }
      probadas.push({ prueba, dCdA, rompe });
      alAvanzar?.(++hecho, total);
    }
    const conTunel = probadas.filter(p => p.dCdA != null);
    let pega: Pega;
    if (conTunel.length) {
      const buenas = conTunel.filter(p => -(p.dCdA as number) / base.cdA >= RUIDO).sort((a, b) => (a.dCdA as number) - (b.dCdA as number));
      // the best that breaks no check; if every one breaks something, the best with its warning
      const elegida = buenas.find(p => !p.rompe.length) ?? buenas[0];
      if (elegida) {
        const d = elegida.dCdA as number, f = -d / base.cdA;
        pega = { ...h, estado: 'calculado', elegida, probadas, dCdA: d, fraccion: f, kWh100: kWh100De(-d, kmh), gravedadFinal: gravedadDe(f) };
      } else pega = { ...h, estado: 'descartado', probadas, gravedadFinal: 'baja' };
    } else if (h.estimacion) {
      const d = h.estimacion.dCdA, f = Math.abs(d) / base.cdA;
      pega = { ...h, estado: d > 0 ? 'noVisto' : 'estimado', elegida: probadas[0], probadas, dCdA: d, fraccion: f, kWh100: kWh100De(Math.abs(d), kmh), gravedadFinal: gravedadDe(f) === 'baja' && h.gravedad === 'baja' ? 'baja' : 'media' }; // an estimate is never «importante»: it is not computed
    } else pega = { ...h, estado: 'descartado', probadas, gravedadFinal: 'baja' };
    pegas.push(pega);
  }
  pegas.sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || ORDEN[a.gravedadFinal] - ORDEN[b.gravedadFinal] || (b.fraccion ?? 0) - (a.fraccion ?? 0));
  return { clave: claveEstudio(P), kmh, base, pegas, fallosBase };
}
