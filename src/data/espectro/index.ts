// Registry of «Otras propuestas» per window. A window with null shows nothing.
import type { Espectro } from './tipos';
import { ESPECTRO as E_IMPUESTOS } from './impuestos';
import { ESPECTRO as E_PENSIONES } from './pensiones';
import { ESPECTRO as E_PRESUPUESTOS } from './presupuestos';
import { ESPECTRO as E_DEUDA } from './deuda';
import { ESPECTRO as E_VIVIENDA } from './vivienda';
import { ESPECTRO as E_SEGURIDAD } from './seguridad';
import { ESPECTRO as E_JUSTICIA } from './justicia';
import { ESPECTRO as E_LEGAL } from './legal';
import { ESPECTRO as E_SANIDAD } from './sanidad';
import { ESPECTRO as E_EDUCACION } from './educacion';
import { ESPECTRO as E_DIGITAL } from './digital';
import { ESPECTRO as E_ESCALAS } from './escalas';

export const ESPECTROS: Record<string, Espectro | null> = {
  impuestos: E_IMPUESTOS,
  pensiones: E_PENSIONES,
  presupuestos: E_PRESUPUESTOS,
  deuda: E_DEUDA,
  vivienda: E_VIVIENDA,
  seguridad: E_SEGURIDAD,
  justicia: E_JUSTICIA,
  legal: E_LEGAL,
  sanidad: E_SANIDAD,
  educacion: E_EDUCACION,
  digital: E_DIGITAL,
  escalas: E_ESCALAS,
};
