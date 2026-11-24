// The decisions taken about the vehicle's parts (2026-11-24, «las decisiones tomadas»), kept in the design
// (`Parametros.decisionesRodaje`, by part, newest last). Pure: the star writes one, the engineer adds the reason.
import type { Parametros } from '../geometria';
import type { DecisionRodaje, IdSub } from './tipos';

export type Decisiones = NonNullable<Parametros['decisionesRodaje']>;
const MAXIMO = 12;

export const hoy = () => new Date().toISOString().slice(0, 10);

/** The log with one more decision. Choosing the option that is already the latest (same axle, same decision of the part) changes nothing. */
export function anotarDecision(actual: Parametros['decisionesRodaje'], sub: IdSub, d: Omit<DecisionRodaje, 'porque'>): Decisiones {
  const lista = actual?.[sub] ?? [], ultima = lista[lista.length - 1];
  if (ultima && ultima.opcion === d.opcion && ultima.eje === d.eje && ultima.decision === d.decision) return { ...actual };
  return { ...actual, [sub]: [...lista, { ...d, porque: '' }].slice(-MAXIMO) };
}

/** The log with the reason written on the latest decision of a part (nothing happens when there is none yet). */
export function escribirPorque(actual: Parametros['decisionesRodaje'], sub: IdSub, porque: string): Decisiones {
  const lista = actual?.[sub] ?? [];
  if (lista.length === 0) return { ...actual };
  return { ...actual, [sub]: [...lista.slice(0, -1), { ...lista[lista.length - 1], porque }] };
}

export const ultimaDecision = (actual: Parametros['decisionesRodaje'], sub: IdSub): DecisionRodaje | null => {
  const l = actual?.[sub]; return l && l.length ? l[l.length - 1] : null;
};
