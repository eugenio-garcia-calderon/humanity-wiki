// Registry of scales. España is the default and has no entry: every window already shows it.
import type { Ambito, AmbitoId } from './tipos';
import { AMBITO as MADRID } from './madrid';
import { AMBITO as TALAMANCA } from './talamanca';
import { AMBITO as EUROPA } from './europa';
import { AMBITO as ONU } from './onu';

export const AMBITOS: Record<Exclude<AmbitoId, 'espana'>, Ambito | null> = {
  madrid: MADRID, talamanca: TALAMANCA, europa: EUROPA, onu: ONU,
};

/** The selector, in order from the person outwards to the planet. */
export const OPCIONES_AMBITO: { id: AmbitoId; nombre: string; corto: string }[] = [
  { id: 'talamanca', nombre: 'Talamanca de Jarama', corto: 'Talamanca' },
  { id: 'madrid', nombre: 'Comunidad de Madrid', corto: 'Madrid' },
  { id: 'espana', nombre: 'España', corto: 'España' },
  { id: 'europa', nombre: 'Unión Europea', corto: 'Europa' },
  { id: 'onu', nombre: 'Naciones Unidas (el planeta)', corto: 'ONU' },
];
