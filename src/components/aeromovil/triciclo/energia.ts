// Triciclo energy: consumption, range, solar and areas.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { cifrasHibrido, factorCargaParcial } from '../hibrido';
import { RENDIMIENTO_SOLAR } from '../geometria';
import { areasBala } from '../geometriaBala';
import type { CamposTriciclo, ClaveNumTriciclo } from './campos';
import { fichaRueda } from '../ruedas/catalogo';
import { neumaticosTriciclo } from './neumaticos';
import { limitarTriciclo } from './medidas';
import type { ModeloTriciclo } from './modelo';
import { AGARRE } from './comprobaciones';
import { electronicaTriciclo } from './electronica';
import { dCdARefrigeracion } from './refrigeracion';
import { AUXILIARES_BICI, esBici } from '../bici/clase';
import { pedaleo } from '../bici/pedales';

/**
 * Rodadura de los neumáticos de las medidas antiguas (2026-11-17, decidido por Claude, delegado por Eugenio):
 * - ciclomotor de 16″ a 28″ (diagonal, con cámara): V. Cossalter, «Motorcycle Dynamics» (2.ª ed., 2006), cap. 2,
 *   f = 0,0085 + 0,018/p + 1,59·10⁻⁶·V²/p (p en bar, V en km/h), la parte estática a 2,25 bar: 0,0165. Antes, 0,011.
 *   La misma fórmula y fuente que el catálogo (`ruedas/catalogo.ts`); citada del libro, NO comprobada en internet hoy.
 * - coche de 13″ a 15″ (radial, de carretera): 0,011, como siempre.
 */
export const CRR_CICLOMOTOR = 0.0085 + 0.018 / 2.25, CRR_COCHE = 0.011;
/** Rodadura de neumático de ciclomotor (`CRR_CICLOMOTOR`), motor de buje y controlador al 85 %, 80 W de equipos y la batería usable al 90 %. Supuestos, no medidos. */
export const CRR = CRR_CICLOMOTOR, RENDIMIENTO = 0.85, AUXILIARES = 80, USABLE = 0.9;
/** The equipment's standing draw (W): a heavy vehicle's `AUXILIARES`, or a bicycle's lights and electronics (bici/clase.ts). */
export const auxiliaresTriciclo = (T: { tClase?: string }) => (esBici(T) ? AUXILIARES_BICI : AUXILIARES);
/** The rolling resistance of an older size's own tyre: the car sizes (c13–c15) `CRR_COCHE`, the moped ones `CRR_CICLOMOTOR`. */
const crrLegado = (k: string) => k.startsWith('c') ? CRR_COCHE : CRR_CICLOMOTOR;
/**
 * 2026-11-17: with a catalogue wheel (`ruedas/catalogo.ts`) on an axle, the mean of each wheel's own rolling resistance,
 * wheel by wheel (pods: `tRuedaDel`; the tail's, and in a diamond the nose's too: `tRuedaTras`). The old sizes roll at `crrLegado`.
 */
export const crrTriciclo = (T: Pick<CamposTriciclo, 'tRuedaDel' | 'tRuedaTras' | 'tTraseras' | 'tRuedas'> & Partial<Pick<CamposTriciclo, 'tNeuDel' | 'tNeuTras' | 'tConsDel' | 'tConsTras'>>) => {
  // 2026-11-17: each axle's tyre type multiplies its size's rolling resistance (exactly 1 «De serie»: `ruedas/neumaticos.ts`)
  const n = neumaticosTriciclo(T);
  // (2026-11-17: each older size at its own tyre's, `crrLegado`: the moped and the car sizes no longer share 0.011)
  const ejes = [{ k: T.tRuedaDel, n: 2, f: n.del.fCrr }, { k: T.tRuedaTras, n: T.tRuedas === 'rombo' || T.tTraseras === 'dos' ? 2 : 1, f: n.tras.fCrr }];
  return ejes.reduce((a, e) => a + e.n * (fichaRueda(e.k)?.crr ?? crrLegado(e.k)) * e.f, 0) / ejes.reduce((a, e) => a + e.n, 0);
};
/** What the rolling resistance figure is, in words, for the editors' notes: the older sizes' own tyres, or the chosen ones. */
export const textoCrrTriciclo = (T: Parameters<typeof crrTriciclo>[0]) => {
  const n = neumaticosTriciclo(T), propio = !fichaRueda(T.tRuedaDel) && !fichaRueda(T.tRuedaTras) && n.del.serie && n.tras.serie;
  if (!propio) return 'la media de los neumáticos elegidos, con su tipo, en «Ejes y ruedas»';
  const moto = [T.tRuedaDel, T.tRuedaTras].map(k => !k.startsWith('c'));
  return moto.every(Boolean) ? 'neumático de ciclomotor, fórmula de Cossalter a 2,25 bar' : moto.some(Boolean) ? 'la media de los de ciclomotor (Cossalter) y los de coche' : 'neumático de coche';
};
/** Consumo, autonomía y velocidades con el Cd del túnel (referido a su área: la sección mayor de la carrocería). */
/**
 * Lo que da el techo solar en un día (Wh), como en el Aeromóvil 1: el panel, curvo, recoge de media ~70 % de lo
 * que uno plano; rendimiento de las células `RENDIMIENTO_SOLAR`, `sol` kWh/m² al día sobre plano (4,5: media
 * anual en España) y 85 % de pérdidas de cableado, temperatura y carga. Estimación.
 */
export const solarDiaTriciclo = (area: number, sol = 4.5) => area * 0.7 * RENDIMIENTO_SOLAR * sol * 1000 * 0.85;
/** Petrol's lower heating value (kWh per litre: 32 MJ/L). */
export const KWH_LITRO_GASOLINA = 8.9;
// (2026-11-17, capo: plus the cooling air's drag, which the tunnel does not see: refrigeracion.ts `dCdARefrigeracion`)
export function energiaTriciclo(m: ModeloTriciclo, mTot: number, cd: { cd: number; areaRef: number }, areaSolar = m.solarTodo.area) {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), g = 9.81, CdA = cd.cd * cd.areaRef + dCdARefrigeracion(m), CRR = crrTriciclo(T);
  // (2026-11-17: a central MG2 drives the wheels through the drop case and the chain, `m.motor.rend`; a hub motor, directly)
  const rendM = RENDIMIENTO * (m.motor.rend ?? 1);
  // (2026-11-24, bici/clase.ts: a vehicle of bicycle components draws a bicycle's lights and electronics, not a car's 80 W)
  const aux = auxiliaresTriciclo(T);
  const potencia = (v: number) => (0.5 * 1.2 * CdA * v ** 3 + CRR * mTot * g * v) / rendM + aux;
  const consumo = (kmh: number) => { const v = kmh / 3.6; return potencia(v) / v / 3.6; };
  // (2026-11-17) the power electronics (electronica.ts): the electric mode's continuous and peak power after the configured
  // limits and map, the engine after its derating. Defaults: exactly the sliders, as before. A hybrid spends the battery
  // down to the engine's start threshold (`tEpArrSoc`; its default 10 % is the old USABLE 90 %)
  const el = electronicaTriciclo(T);
  const vel = L('tVel'), WhKm = consumo(vel), util = m.kWh * 1000 * (m.phev ? 1 - L('tEpArrSoc') / 100 : USABLE);
  const vmaxCon = (kW: number) => { let v = 10; for (let i = 0; i < 80; i++) v *= Math.pow(kW * 1000 / potencia(v), 0.34); return v * 3.6; };
  // 0 → 50 km/h: peak power, limited by the grip of the one driven wheel (≈ 40 % of the weight on it, μ: the rear tyre's own, absolute since 2026-11-17, `neumaticosTriciclo(T).tras.muSeco`)
  const reparto = 0.4, Fmax = AGARRE * neumaticosTriciclo(T).tras.fSeco * reparto * mTot * g;
  let v = 0.5, t = 0; const dt = 0.02;
  while (v < 50 / 3.6 && t < 60) { const Fz = Math.min(Fmax, el.ruedasElecPico * 1000 * rendM / v) - 0.5 * 1.2 * CdA * v * v - CRR * mTot * g; if (Fz <= 0) { t = 99; break; } v += Fz / (mTot * 1.03) * dt; t += dt; }
  // the plug-in hybrid (2026-11-15): once the battery is down to its reserve, the petrol engine drives through the
  // planetary gear (part straight to the wheels, part through the generator and the motor: `rendTrans` for both
  // together) and also feeds the equipment. Litres per 100 km: the energy at the wheels over both efficiencies, over
  // petrol's 8,9 kWh per litre (its lower heating value)
  // (2026-11-16: `rendTrans` follows from the architecture, hibrido.ts. In parallel the engine is tied to the wheels
  // and, at part load, runs off its best point: its efficiency times `factorCargaParcial`. In series every kW passes
  // through the electric motor, so the sustained speed on petrol is also capped by its rated power)
  const p = m.phev;
  const motorW = (kmh: number) => { if (!p) return 0; const v = kmh / 3.6; return (0.5 * 1.2 * CdA * v ** 3 + CRR * mTot * g * v) / p.rendTrans + aux; };
  const rendTermA = (kmh: number) => !p ? 1 : p.arq === 'paralelo' ? p.rendTerm * factorCargaParcial(motorW(kmh) / (p.kW * 1000)) : p.rendTerm;
  const litros100 = (kmh: number) => {
    if (!p) return 0;
    const v = kmh / 3.6;
    return (motorW(kmh) / rendTermA(kmh)) / v / 3.6 / KWH_LITRO_GASOLINA / 10;
  };
  const kWT = el.ruedasTermico;
  const vmaxGasolina = p ? vmaxCon(p.arq === 'serie' ? Math.min(kWT * p.rendTrans / RENDIMIENTO, el.ruedasElecCont) : kWT * p.rendTrans / RENDIMIENTO) : 0;
  // (2026-11-17) both motors at once, in the strongest mode, for at most the peak's seconds: what the vehicle can reach
  // when the hybrid adds them up (new figure: the others above are unchanged). The engine counted at the wheel's terms
  const mp = el.modoPico, sumaEq = mp.termico * (p ? p.rendTrans / RENDIMIENTO : 0) + mp.elecPico, sumaDecl = mp.termico + mp.elecPico;
  const vmaxConjunta = vmaxCon(sumaDecl > 0 ? sumaEq * Math.min(1, mp.pico / sumaDecl) : 0);
  const hibrido = p ? {
    litros100: litros100(vel), litros50: litros100(50), litros100kmh: litros100(100), kmDeposito: p.litros / litros100(vel) * 100, vmaxGasolina,
    /** 2026-11-16: the overall efficiency from the engine's shaft to the wheel, the engine's own at this speed, and the rpm (hibrido.ts) */
    rendTrans: p.rendTrans, rendTermVel: rendTermA(vel), cifras: cifrasHibrido(p.arq, vel, 2 * m.rR, motorW(vel), p.kW, p.mec),
  } : null;
  return { cd: cd.cd, areaRef: cd.areaRef, CdA, WhKm, autonomia: util / WhKm, kmSol: solarDiaTriciclo(areaSolar, m.P.sol) / WhKm, vmaxNominal: vmaxCon(el.ruedasElecCont), vmaxPico: vmaxCon(el.ruedasElecPico), vmaxConjunta, acel50: t, potencia: potencia(vel / 3.6), WhKm50: consumo(50), WhKm100: consumo(100), hibrido,
    /** 2026-11-24 (bici/pedales.ts): what the driver's pedalling changes at the speed of calculation, or null without pedals. */
    pedaleo: pedaleo(m.pedalesBici, potencia, vel, util), auxiliares: aux };
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
