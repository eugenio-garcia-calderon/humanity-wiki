import type { Parametros } from '../geometria';
import type { Explicaciones, ExplicacionParametro } from './tipos';
import { EXPLICACIONES as geometria } from './geometria';
import { EXPLICACIONES as mecanica } from './mecanica';
import { EXPLICACIONES as bala } from './bala';
import { EXPLICACIONES as triciclo } from './triciclo';

export type { ExplicacionParametro } from './tipos';
/** Todas las explicaciones, por clave de parámetro. Las escriben dos bots: forma (geometría) y mecánica/energía/interior; las del Cuadriciclo Bala (claves `b…`) y las del Triciclo Bala (claves `t…`) van aparte. */
export const EXPLICACIONES: Explicaciones = { ...geometria, ...mecanica, ...bala, ...triciclo };
export const explicacion = (k: keyof Parametros): ExplicacionParametro | undefined => EXPLICACIONES[k];
