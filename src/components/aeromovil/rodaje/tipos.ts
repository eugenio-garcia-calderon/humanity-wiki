// The running gear split into its four parts (2026-11-24, Eugenio: «En rodaje, añade las diferentes partes dentro del
// rodaje. Por ejemplo, frenos, dirección, ruedas… que se comporte como un elemento en sí … y que uno pueda seleccionar la
// opción favorita con una estrellita … la opción favorita es la que luego muestra el peso y el precio y lo manda arriba
// al proyecto»). Types only: a LEAF module, so the model files (`bici/pedales.ts`, `triciclo/masas.ts`) can read the
// catalogues without a cycle. The pure data is in `direccion.ts`, `opciones.ts`; the screens in `PanelSubsistema.tsx`.
import type { PrecioBici } from '../bici/catalogo';

export type IdSub = 'ruedas' | 'frenos' | 'direccion' | 'suspension';

/**
 * One part of an option's bill of materials. `dato` says what is behind the figures, because both are shown:
 * `publicado` = a maker's or a shop's page says it (with its source); `estimado` = a figure of a part of its class.
 */
export interface ParteOpcion {
  n: string;
  cantidad: number;
  /** each, kg; absent when only the whole set's mass is published */
  kg?: number;
  /** each, € ; absent when only the whole set's price is published */
  eur?: number;
  /** what it is and what it does, in plain Spanish */
  nota: string;
  /** made in our workshop or bought */
  origen: 'fabricar' | 'comprar';
  dato: 'publicado' | 'estimado';
}

export interface FuenteOpcion { t: string; url: string; /** read on this date; false: cited in the study Eugenio pasted and not opened by us */ leido: string | false }

/** An option for a part of the running gear: what it is, what it weighs, what it costs, what is in it. */
export interface OpcionRodaje {
  id: string;
  n: string;
  /** one or two sentences, plain Spanish */
  resumen: string;
  /** the whole option, as mounted on the vehicle (kg): the sum of `partes` unless the maker publishes the whole set */
  kg: number;
  /** what of `kg` is published and what is estimated (Spanish: it is shown) */
  masa: string;
  precio: PrecioBici;
  partes: ParteOpcion[];
  pros: string[];
  contras: string[];
  fuentes: FuenteOpcion[];
  /** the unit the figures are for: «por rueda», «por esquina», «el conjunto» */
  por: string;
  /** the option's own data sheet, as [label, value] rows (the rack's travel, the wheel's load and speed…) */
  datos?: [string, string][];
}

/** The sentence under an option that is the reference to compare the rest against: what the design does with no option chosen. */
export const A_MEDIDA_RODAJE = 'medida';

/**
 * One decision taken about a part of the running gear (2026-11-24, «las decisiones tomadas»): written when a star is
 * pressed (the option, the day), with the reason the engineer types after. Kept in the design (`Parametros.decisionesRodaje`,
 * by `IdSub`, newest last), so it travels with the design and with every copy of it.
 */
export interface DecisionRodaje {
  /** the option's id (a wheel's also says the axle: `eje`) */
  opcion: string;
  eje?: 'del' | 'tras' | 'todas';
  /** `YYYY-MM-DD` */
  fecha: string;
  /** why, in the engineer's words; empty until he writes it */
  porque: string;
}
