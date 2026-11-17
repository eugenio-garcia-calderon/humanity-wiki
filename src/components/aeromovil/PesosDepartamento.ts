/**
 * The mass of each department, for the top bar's tabs (2026-11-16, Eugenio: «cuando pinche en un modelo, que en el
 * menú superior donde pone carrocería, pongas ahí debajo el número en kilogramos del peso de la carrocería de ese
 * modelo, donde pone chasis… el peso del chasis, y lo mismo con rodaje, motor e interior»).
 *
 * One source: the same pieces and the same grouping as the «Peso: todos los componentes» lists — the Triciclo's
 * `res.triciclo.piezas` grouped with `grupoPieza` (Aeromovil.tsx, `LadoTriciclo`), the Basculante's
 * `res.basculante.piezas` by their own `grupo` (LadoBasculante.tsx). «Proyecto» is the whole vehicle without
 * occupants (`res.mVeh`, the lists' «Total en vacío»); «Energía» is that list's Energía group (battery and the
 * charger/wiring/12 V, plus the solar panels on the Basculante).
 * Families without departments (Gota, A1, Bala) return null: no numbers under their tabs.
 */
import type { Resultados } from './geometria';
import { grupoPieza, type DepTriciclo } from './geometriaTriciclo';

export type KgDepartamento = Partial<Record<DepTriciclo | 'proyecto' | 'masas', number>>;

export function kgPorDepartamento(res: Resultados): KgDepartamento | null {
  const piezas: { kg: number; grupo: DepTriciclo }[] | null =
    res.triciclo ? res.triciclo.piezas.map(p => ({ kg: p.kg, grupo: grupoPieza(p.nombre) }))
      : res.basculante ? res.basculante.piezas.map(p => ({ kg: p.kg, grupo: p.grupo as DepTriciclo }))
        : null;
  if (!piezas || !Number.isFinite(res.mVeh)) return null;
  // (2026-11-17) «Masas»: with everyone on board, the mass its centre of gravity is for
  const kg: KgDepartamento = { proyecto: res.mVeh, ...(Number.isFinite(res.mTot) ? { masas: res.mTot } : {}) };
  for (const p of piezas) kg[p.grupo] = (kg[p.grupo] ?? 0) + p.kg;
  return kg;
}

/** «86 kg», rounded to the kilogram (the lists show one decimal; a tab has room for the whole number only). */
export const textoKg = (kg: number | undefined) => (kg != null && Number.isFinite(kg) ? `${Math.round(kg)} kg` : null);
