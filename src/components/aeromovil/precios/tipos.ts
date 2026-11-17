/**
 * Where the prices live in a design (2026-11-17): two optional fields of `Parametros`, stored with the design and
 * absent in every design saved before (which then gets the estimates). Declared here, by module augmentation, because
 * `geometria.ts` was claimed by another bot the day they were added: moving them into the interface itself is a
 * five-minute change (memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md).
 */
import type { Ajuste } from './manoObra';

declare module '../geometria' {
  interface Parametros {
    /** (2026-11-17) the user's own price of a part, € by the part's name in the mass model (`precios.ts`) */
    precios?: Record<string, number>;
    /** (2026-11-17) the user's own hours and €/h of a labour item, by its id (`manoObra.ts`) */
    manoObra?: Record<string, Ajuste>;
  }
}
export {};
