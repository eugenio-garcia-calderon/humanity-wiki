// ============================================================================
// JUEGO VITAL — shared types between the page (light chunk) and the 3D scene
// (heavy lazy chunk). This file must NOT import three.js: the page imports it
// and would otherwise drag the whole engine into the main bundle.
// ============================================================================

/** Movement input written by the keyboard handler and the touch joystick,
 *  read every frame by the character. x: -1 left … 1 right, z: -1 up … 1 down
 *  (world axes; the follow camera keeps a fixed angle so screen == world). */
export interface EntradaMando {
  x: number;
  z: number;
}

/** The slice of a real `proyectos` row that the game world needs. */
export interface ProyectoJuego {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  /** Real kanban counters from GET /api/proyectos — they drive the building height. */
  tarjetas: number;
  hechas: number;
  publico: boolean;
}

/** What the player is currently standing next to (drives the interaction UI). */
export type Cercania =
  | { tipo: 'robot' }
  | { tipo: 'proyecto'; proyecto: ProyectoJuego }
  | null;

/** Per-frame distances written by scene components, arbitrated by the
 *  Coordinador (robot wins over buildings when both are close). */
export interface Medidas {
  robot: number;
  proyecto: { p: ProyectoJuego; d: number } | null;
}
