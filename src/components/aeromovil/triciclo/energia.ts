// Triciclo energy: consumption, range, solar and areas.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { cifrasHibrido, factorCargaParcial } from '../hibrido';
import { RENDIMIENTO_SOLAR } from '../geometria';
import { areasBala } from '../geometriaBala';
import type { CamposTriciclo, ClaveNumTriciclo } from './campos';
import { crrMezcla } from '../ruedas/catalogo';
import { limitarTriciclo } from './medidas';
import type { ModeloTriciclo } from './modelo';
import { AGARRE } from './comprobaciones';

/** Rodadura de neumático de ciclomotor (0,011), motor de buje y controlador al 85 %, 80 W de equipos y la batería usable al 90 %. Supuestos, no medidos. */
export const CRR = 0.011, RENDIMIENTO = 0.85, AUXILIARES = 80, USABLE = 0.9;
/**
 * 2026-11-17: with a catalogue wheel (`ruedas/catalogo.ts`) on an axle, the mean of each wheel's own rolling resistance,
 * wheel by wheel (pods: `tRuedaDel`; the tail's, and in a diamond the nose's too: `tRuedaTras`). The old sizes roll at `CRR`.
 */
export const crrTriciclo = (T: Pick<CamposTriciclo, 'tRuedaDel' | 'tRuedaTras' | 'tTraseras' | 'tRuedas'>) =>
  crrMezcla([{ k: T.tRuedaDel, n: 2 }, { k: T.tRuedaTras, n: T.tRuedas === 'rombo' || T.tTraseras === 'dos' ? 2 : 1 }], CRR);
/** Consumo, autonomía y velocidades con el Cd del túnel (referido a su área: la sección mayor de la carrocería). */
/**
 * Lo que da el techo solar en un día (Wh), como en el Aeromóvil 1: el panel, curvo, recoge de media ~70 % de lo
 * que uno plano; rendimiento de las células `RENDIMIENTO_SOLAR`, `sol` kWh/m² al día sobre plano (4,5: media
 * anual en España) y 85 % de pérdidas de cableado, temperatura y carga. Estimación.
 */
export const solarDiaTriciclo = (area: number, sol = 4.5) => area * 0.7 * RENDIMIENTO_SOLAR * sol * 1000 * 0.85;
/** Petrol's lower heating value (kWh per litre: 32 MJ/L). */
export const KWH_LITRO_GASOLINA = 8.9;
export function energiaTriciclo(m: ModeloTriciclo, mTot: number, cd: { cd: number; areaRef: number }, areaSolar = m.solarTodo.area) {
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T), g = 9.81, CdA = cd.cd * cd.areaRef, CRR = crrTriciclo(T);
  // (2026-11-17: a central MG2 drives the wheels through the drop case and the chain, `m.motor.rend`; a hub motor, directly)
  const rendM = RENDIMIENTO * (m.motor.rend ?? 1);
  const potencia = (v: number) => (0.5 * 1.2 * CdA * v ** 3 + CRR * mTot * g * v) / rendM + AUXILIARES;
  const consumo = (kmh: number) => { const v = kmh / 3.6; return potencia(v) / v / 3.6; };
  const vel = L('tVel'), WhKm = consumo(vel), util = m.kWh * 1000 * USABLE;
  const vmaxCon = (kW: number) => { let v = 10; for (let i = 0; i < 80; i++) v *= Math.pow(kW * 1000 / potencia(v), 0.34); return v * 3.6; };
  // 0 → 50 km/h: peak power, limited by the grip of the one driven wheel (≈ 40 % of the weight on it, μ 0.9)
  const reparto = 0.4, Fmax = AGARRE * reparto * mTot * g;
  let v = 0.5, t = 0; const dt = 0.02;
  while (v < 50 / 3.6 && t < 60) { const Fz = Math.min(Fmax, L('tKWPico') * 1000 * rendM / v) - 0.5 * 1.2 * CdA * v * v - CRR * mTot * g; if (Fz <= 0) { t = 99; break; } v += Fz / (mTot * 1.03) * dt; t += dt; }
  // the plug-in hybrid (2026-11-15): once the battery is down to its reserve, the petrol engine drives through the
  // planetary gear (part straight to the wheels, part through the generator and the motor: `rendTrans` for both
  // together) and also feeds the equipment. Litres per 100 km: the energy at the wheels over both efficiencies, over
  // petrol's 8,9 kWh per litre (its lower heating value)
  // (2026-11-16: `rendTrans` follows from the architecture, hibrido.ts. In parallel the engine is tied to the wheels
  // and, at part load, runs off its best point: its efficiency times `factorCargaParcial`. In series every kW passes
  // through the electric motor, so the sustained speed on petrol is also capped by its rated power)
  const p = m.phev;
  const motorW = (kmh: number) => { if (!p) return 0; const v = kmh / 3.6; return (0.5 * 1.2 * CdA * v ** 3 + CRR * mTot * g * v) / p.rendTrans + AUXILIARES; };
  const rendTermA = (kmh: number) => !p ? 1 : p.arq === 'paralelo' ? p.rendTerm * factorCargaParcial(motorW(kmh) / (p.kW * 1000)) : p.rendTerm;
  const litros100 = (kmh: number) => {
    if (!p) return 0;
    const v = kmh / 3.6;
    return (motorW(kmh) / rendTermA(kmh)) / v / 3.6 / KWH_LITRO_GASOLINA / 10;
  };
  const vmaxGasolina = p ? vmaxCon(p.arq === 'serie' ? Math.min(p.kW * p.rendTrans / RENDIMIENTO, L('tKWNom')) : p.kW * p.rendTrans / RENDIMIENTO) : 0;
  const hibrido = p ? {
    litros100: litros100(vel), litros50: litros100(50), litros100kmh: litros100(100), kmDeposito: p.litros / litros100(vel) * 100, vmaxGasolina,
    /** 2026-11-16: the overall efficiency from the engine's shaft to the wheel, the engine's own at this speed, and the rpm (hibrido.ts) */
    rendTrans: p.rendTrans, rendTermVel: rendTermA(vel), cifras: cifrasHibrido(p.arq, vel, 2 * m.rR, motorW(vel), p.kW, p.mec),
  } : null;
  return { cd: cd.cd, areaRef: cd.areaRef, CdA, WhKm, autonomia: util / WhKm, kmSol: solarDiaTriciclo(areaSolar, m.P.sol) / WhKm, vmaxNominal: vmaxCon(L('tKWNom')), vmaxPico: vmaxCon(L('tKWPico')), acel50: t, potencia: potencia(vel / 3.6), WhKm50: consumo(50), WhKm100: consumo(100), hibrido };
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
