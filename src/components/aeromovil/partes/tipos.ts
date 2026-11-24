// The vehicle split into parts that behave as an element each (2026-11-24: the running gear's four; the same day the rest of the departments'). Eugenio: «En rodaje, añade las diferentes partes dentro del
// rodaje. Por ejemplo, frenos, dirección, ruedas… que se comporte como un elemento en sí … y que uno pueda seleccionar la
// opción favorita con una estrellita … la opción favorita es la que luego muestra el peso y el precio y lo manda arriba
// al proyecto»). Types only: a LEAF module, so the model files (`bici/pedales.ts`, `triciclo/masas.ts`) can read the
// catalogues without a cycle. The pure data is in `direccion.ts`, `opciones.ts`; the screens in `PanelSubsistema.tsx`.
import type { PrecioBici } from '../bici/catalogo';

/** The id of a part of the vehicle (`subsistemas.ts` lists them all: the running gear's four since 2026-11-24, the rest of the departments' the same day). */
export type IdSub = string;

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
  /** the figures are still being worked out by the model (an option of a part whose numbers come from recomputing the design) */
  calculando?: boolean;
  /**
   * The option's own decision when the part has several (the chassis: «Material de los tubos» and «Largueros hasta»): the
   * design field its star writes. Options of one decision are compared together (`grupo` is its title).
   */
  decision?: string;
  grupo?: string;
  /** what the source leaves out or says about its own figures (catalogue parts; Spanish: it is shown) */
  notas?: string;
  /** what the mass is made of when `partes` does not say (a catalogue part with no published mass uses the model's estimate) */
  datoKg?: 'publicado' | 'estimado' | 'mixto';
  /** what the project carries and says with this option, once the model has tried it (`alternativas.ts`) */
  proyecto?: ProyectoConOpcion;
}

/** What the whole design says with an option chosen: the part's own lines of the mass and price lists, and the model's checks about it. */
export interface ProyectoConOpcion {
  partes: { nombre: string; kg: number; eur: number; como: string }[];
  vehiculoKg: number;
  proyectoEur: number | null;
  comprobaciones: { nombre: string; bien: boolean; mostrar?: string }[];
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
  /** which of the part's decisions it was, when the part has several (the chassis: the tubes' material, how far the side rails go) */
  decision?: string;
  eje?: 'del' | 'tras' | 'todas';
  /** `YYYY-MM-DD` */
  fecha: string;
  /** why, in the engineer's words; empty until he writes it */
  porque: string;
}
