// ============================================================================
// JUEGO VITAL — shared types between the page (light chunk) and the 3D scene
// (heavy lazy chunk). This file must NOT import three.js: the page imports it
// and would otherwise drag the whole engine into the main bundle.
// ============================================================================

/** Movement input written by the keyboard handler and the touch joystick,
 *  read every frame by the character. x: -1 left … 1 right, z: -1 forward …
 *  1 back, RELATIVE TO THE CAMERA (the camera turns now, so screen ≠ world;
 *  the character rotates the vector by the camera's yaw). `y` only matters in
 *  the flyer: -1 descends, 1 climbs. */
export interface EntradaMando {
  x: number;
  z: number;
  y: number;
  /** Barra espaciadora: corre. A pie y en bici multiplica la velocidad; en el
   *  planeador no, porque allí la barra es lo que te hace subir. */
  turbo: boolean;
}

/** Where the camera is looking. Written by the look-drag (right half of the
 *  screen on mobile, mouse drag on desktop) and read every frame. `yaw` 0 is
 *  the classic over-the-shoulder view; `pitch` is how high it hangs. */
export interface Camara {
  yaw: number;
  pitch: number;
}

/** Cómo te mueves por el mundo. La bici es el doble de rápida; la Aptera es
 *  un planeador de despegue vertical (petición de Eugenio, 2026-08-18). */
export type Vehiculo = 'pie' | 'bici' | 'aptera';

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
  /** Los grupos del tablero. Dentro del edificio son sus habitaciones. */
  grupos?: Array<{ id: string; label: string; color: string }>;
}

/** Una tarjeta del tablero del proyecto (`roadmap_items`), tal y como la
 *  devuelve GET /api/roadmap?proyecto=… Sus `bloques` traen las notas y las
 *  fotos que flotan dentro de la habitación. */
export interface ItemProyecto {
  id: string;
  grupo: string;
  titulo: string;
  resumen: string | null;
  estado: string;
  prioridad: string;
  bloques: Array<{ tipo: string; texto?: string; url?: string; pie?: string }>;
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
  /** Su archivo: fotos y documentos que el jugador le ha dejado. */
  archivos: Array<{ url: string; nombre: string; tipo: string; es_imagen: boolean; created_at: string }>;
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
