// The four parts of the running gear (2026-11-24): their names, which parts of the mass list they are, which of the 3D's
// layers show them, and which design field holds the favourite. Data only (no React): `PanelSubsistema.tsx` draws it.
import type { CapaId } from '../visor/capas';
import type { IdSub } from './tipos';

export interface Subsistema {
  id: IdSub;
  nombre: string;
  /** «Mostrar solo …» */
  solo: string;
  lema: string;
  /** the parts of the mass list (by name) that are this one: the weight and the price in the header read them */
  piezas: RegExp;
  /** the 3D's layers that show it by itself (`visor/capas.ts`); wheels stay in the steering and suspension views, which only mean something with them */
  capas: CapaId[];
  /** the design field that holds the favourite (the wheels have one per axle) */
  campo: string | { del: string; tras: string };
}

export const SUBSISTEMAS: Subsistema[] = [
  { id: 'ruedas', nombre: 'Ruedas', solo: 'las ruedas', lema: 'neumático, llanta y radios: lo único que toca el suelo', piezas: /^Ruedas?\b/, capas: ['ruedas'], campo: { del: 'tRuedaDel', tras: 'tRuedaTras' } },
  { id: 'frenos', nombre: 'Frenos', solo: 'los frenos', lema: 'parar el vehículo, en las cuatro ruedas', piezas: /^Frenos/, capas: ['ruedas'], campo: 'tBiciFreno' },
  { id: 'direccion', nombre: 'Dirección', solo: 'la dirección', lema: 'las dos ruedas de delante giran con un solo mando', piezas: /^Dirección/, capas: ['direccion', 'ruedas'], campo: 'tDirOpc' },
  { id: 'suspension', nombre: 'Suspensión', solo: 'la suspensión', lema: 'brazos, manguetas y amortiguadores de cada esquina', piezas: /^(Suspensión|Basculante y)/, capas: ['suspension', 'ruedas'], campo: 'tBiciSusp' },
];
export const subsistema = (id: IdSub) => SUBSISTEMAS.find(s => s.id === id)!;
export const esSub = (v: unknown): v is IdSub => SUBSISTEMAS.some(s => s.id === v);
