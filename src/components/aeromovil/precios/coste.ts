/**
 * The project's cost (2026-11-17): materials and parts by department (`precios.ts`) + labour (`manoObra.ts`) = total,
 * and € per kg of the empty vehicle. One function, used by «Proyecto», the «Mano de obra» tab and the check script.
 */
import type { Parametros, Resultados } from '../geometria';
import { pesosSecciones } from '../masasSecciones';
import { preciosDiseno, type PreciosDiseno } from './precios';
import { partidasManoObra, totalManoObra, type PartidaManoObra } from './manoObra';

export interface CosteProyecto {
  precios: PreciosDiseno; partidas: PartidaManoObra[];
  materiales: number; manoObra: number; total: number;
  /** € per kg of the empty vehicle (null when its mass is not known) */
  eurKg: number | null;
}

/** The cost of this design, or null for a vehicle without sections (the Cuadriciclo Bala). */
export function costeProyecto(P: Parametros, modelo: { tipo: string }, res: Resultados): CosteProyecto | null {
  const ps = pesosSecciones(res, modelo); if (!ps) return null;
  const m = modelo as { tipo: string } & Record<string, unknown>;
  const precios = preciosDiseno(ps, { P, modelo: m, res }), partidas = partidasManoObra(P, m, res);
  const materiales = precios.total, manoObra = totalManoObra(partidas), total = materiales + manoObra;
  return { precios, partidas, materiales, manoObra, total, eurKg: res.mVeh > 0 && Number.isFinite(res.mVeh) ? total / res.mVeh : null };
}
