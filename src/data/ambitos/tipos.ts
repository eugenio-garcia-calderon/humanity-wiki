// «Ámbitos» (Eugenio, 2026-11-13): the same optimised model applied at other
// scales, chosen top right — Spain (the default, what every window already
// shows), the Comunidad de Madrid, one of its municipalities (Talamanca de
// Jarama), Europe and the United Nations — «con un ejemplo de cada escala».
// Each scale has a short overview and, per area, what changes there.

export type AmbitoId = 'espana' | 'madrid' | 'talamanca' | 'europa' | 'onu';

/** The areas a scale can speak about: every window, and the three parts of Economía. */
export type AreaId =
  | 'escalas' | 'impuestos' | 'categorias' | 'pensiones' | 'presupuestos'
  | 'deuda' | 'banca' | 'moneda'
  | 'vivienda' | 'seguridad' | 'justicia' | 'sanidad' | 'educacion' | 'legal' | 'digital';

export interface FuenteAmbito { url: string; titulo: string }

/** A real figure, with its source. Estimates say so in `texto`. */
export interface CifraAmbito { valor: string; texto: string; fuente: FuenteAmbito }

export interface AreaAmbito {
  /** What this scale does on this subject today, in one or two plain sentences. */
  hoy: string;
  /** What this scale would do with the model: two to four short sentences. */
  propuesta: string[];
  /** One or two figures that make it concrete. */
  cifras?: CifraAmbito[];
  /** Sources for the sentences above that are not behind a figure. */
  fuentes?: FuenteAmbito[];
}

export interface Ambito {
  id: AmbitoId;
  /** As shown in the selector: «Comunidad de Madrid». */
  nombre: string;
  /** The model's scale it corresponds to (an ESCALAS id: region, municipio, continente, planeta). */
  escala: string;
  /** Who governs it today: «Gobierno de la Comunidad de Madrid y su Asamblea». */
  quien: string;
  /** Three to five sentences: what the model means at this scale. */
  resumen: string[];
  /** Three or four key figures: population, budget, debt… */
  cifras: CifraAmbito[];
  areas: Partial<Record<AreaId, AreaAmbito>>;
  /** YYYY-MM-DD */
  revisado: string;
}
