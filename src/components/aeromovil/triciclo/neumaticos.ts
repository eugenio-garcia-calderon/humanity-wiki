// The tyre of each axle of the Triciclo family (2026-11-17, «Permite también añadir el tipo de neumático»): what the
// chosen type and construction do to rolling, wheel mass, grip, life and price, over the size's own tyre
// (`../ruedas/neumaticos.ts`). «De serie» on both axles gives factors of exactly 1: a saved design keeps its numbers.
// «Tras» is every wheel of `tRuedaTras` (the tail's; in a diamond, the nose's too).
import { RUEDAS_TRICICLO, type CamposTriciclo, type RuedaTriciclo } from './campos';
import { efectoNeumatico, type PropioNeumatico } from '../ruedas/neumaticos';

/** Dry grip of the older sizes' own tyre (g): the same 0.9 as `AGARRE` in `comprobaciones.ts` (kept here to avoid a load cycle). */
const AGARRE_SERIE = 0.9;
/** What the older sizes are fitted with: moped 16″–28″ bias tyres with a tube; the car 13″–15″ radial tubeless road tyres. */
const legadoT = (k: string): PropioNeumatico => {
  const r = RUEDAS_TRICICLO[k as RuedaTriciclo] ?? RUEDAS_TRICICLO['24'], coche = k.startsWith('c');
  return { tipo: 'carretera', radial: coche, camara: !coche, d: r.d, w: r.neuTras, perfil: coche ? 'coche' : 'moto' };
};
type CamposNeu = Pick<CamposTriciclo, 'tRuedaDel' | 'tRuedaTras'> & Partial<Pick<CamposTriciclo, 'tNeuDel' | 'tNeuTras' | 'tConsDel' | 'tConsTras'>>;
/** The two axles' tyres. `precio` is € per tyre (estimate): the price list can read it from here. */
export const neumaticosTriciclo = (T: CamposNeu) => ({
  del: efectoNeumatico(T.tRuedaDel, T.tNeuDel, T.tConsDel, legadoT, AGARRE_SERIE, true),
  tras: efectoNeumatico(T.tRuedaTras, T.tNeuTras, T.tConsTras, legadoT, AGARRE_SERIE),
});
