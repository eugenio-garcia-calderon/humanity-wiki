// «Otras propuestas» (Eugenio, 2026-11-12): at the top of every policy window,
// a slider from left to right showing what other political camps propose on
// the same subject, with this model in the middle. Same shape for every camp,
// so each gets the same space, the same fields and the same treatment.

export type PosturaId = 'izquierda' | 'centro-izquierda' | 'centro-derecha' | 'derecha';
export const POSTURA_IDS: PosturaId[] = ['izquierda', 'centro-izquierda', 'centro-derecha', 'derecha'];
export const POSTURA_NOMBRE: Record<PosturaId, string> = {
  izquierda: 'Izquierda',
  'centro-izquierda': 'Centro izquierda',
  'centro-derecha': 'Centro derecha',
  derecha: 'Derecha',
};

export interface FuenteEspectro { url: string; titulo: string }

export interface Postura {
  id: PosturaId;
  /** Who defends it in Spain today, in plain words (parties, unions, think tanks). No final full stop. */
  quien: string;
  /** When and where these proposals were published, shown on the card: «Programa para el 29-N, noviembre de 2026», «Programa electoral de 2023». */
  cuando: string;
  /** Its idea in one sentence. */
  idea: string;
  /** Three to five concrete proposals, each a short sentence. */
  propone: string[];
  /** Optional note when a camp has no concrete proposal on part of the subject («No hemos encontrado…»). */
  nota?: string;
  /** Their own best argument, in one or two sentences. */
  argumento: string;
  /** The main criticism others make of it, in one or two sentences. */
  critica: string;
  fuentes: FuenteEspectro[];
}

export interface Espectro {
  /** The subject, as in «Qué proponen otros sobre …». */
  tema: string;
  /** This model's proposal in three to five short sentences (the middle stop). */
  modelo: string[];
  /** What critics could say of this model on this subject (from the window's own challenges), two or three short sentences. */
  limites: string[];
  posturas: Postura[];
  /** Date the camps' positions were checked (YYYY-MM-DD). */
  revisado: string;
}
