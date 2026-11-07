import type { Parametros } from '../geometria';
import type { Explicaciones, ExplicacionParametro } from './tipos';
import { EXPLICACIONES as geometria } from './geometria';
import { EXPLICACIONES as mecanica } from './mecanica';

export type { ExplicacionParametro } from './tipos';
/** Todas las explicaciones, por clave de parámetro. Las escriben dos bots: forma (geometría) y mecánica/energía/interior. */
export const EXPLICACIONES: Explicaciones = { ...geometria, ...mecanica };
export const explicacion = (k: keyof Parametros): ExplicacionParametro | undefined => EXPLICACIONES[k];
