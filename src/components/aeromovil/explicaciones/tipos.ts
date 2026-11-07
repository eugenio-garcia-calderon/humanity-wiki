import type { Parametros } from '../geometria';

/**
 * La explicación de un parámetro del diseño (2026-11-07, Eugenio: «al pinchar
 * en un parámetro, que se abra un cuadro que explique más sobre él, la
 * importancia que tiene y las ventajas y desventajas de ponerlo más alto o
 * más bajo»). La escriben bots, en español y para alguien que no es
 * ingeniero; cada frase que afirme un número lleva de dónde sale.
 */
export interface ExplicacionParametro {
  nombre: string;                 // cómo se llama en el lateral
  queEs: string;                  // qué mide exactamente, en una o dos frases, con la unidad
  porQueImporta: string;          // qué cambia en el coche real cuando se toca (un párrafo)
  masAlto: { ventajas: string[]; desventajas: string[] };   // 2–5 cada una
  masBajo: { ventajas: string[]; desventajas: string[] };
  /** Valores de referencia de coches reales, con fuente («Twizy: 1,09 m, ficha Renault»). */
  referencias: string[];
  /** Con qué otros parámetros va de la mano (claves de `Parametros`), para enlazar. */
  relacionados: (keyof Parametros)[];
  /** Qué comprobación del lateral se resiente al moverlo, si alguna. */
  comprobaciones?: string[];
}
export type Explicaciones = Partial<Record<keyof Parametros, ExplicacionParametro>>;
