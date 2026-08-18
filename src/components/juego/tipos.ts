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

/** An inhabitant of the world the player built: a real person or a project.
 *  Each one has its own memory and its own AI conversation. */
export interface Agente {
  id: string;
  tipo: 'persona' | 'proyecto';
  nombre: string;
  rol: string | null;
  descripcion: string | null;
  foto_url: string | null;
  apariencia: Record<string, string>;
  memoria: Array<{ texto: string; created_at: string }>;
  proyecto_id: string | null;
  proyecto_slug?: string | null;
  tarjetas?: number;
  hechas?: number;
  conversation_id: string | null;
  x: number;
  z: number;
}

/** What the player is currently standing next to (drives the interaction UI). */
export type Cercania =
  | { tipo: 'robot' }
  | { tipo: 'agente'; agente: Agente }
  | { tipo: 'proyecto'; proyecto: ProyectoJuego }
  | null;

/** Per-frame distances written by scene components, arbitrated by the
 *  Coordinador (robot wins over buildings when both are close). */
export interface Medidas {
  robot: number;
  proyecto: { p: ProyectoJuego; d: number } | null;
  agente: { a: Agente; d: number } | null;
}
