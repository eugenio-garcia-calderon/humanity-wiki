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
  /** Mayúsculas (Shift): corre. A pie y en bici multiplica la velocidad. */
  turbo: boolean;
  /** Barra espaciadora: un toque salta. El personaje lo consume (lo pone a
   *  false) para que un toque sea UN salto y no uno por fotograma. */
  salto: boolean;
}

/** Where the camera is looking. Written by the look-drag (right half of the
 *  screen on mobile, mouse drag on desktop) and read every frame. `yaw` 0 is
 *  the classic over-the-shoulder view; `pitch` is how high it hangs. */
export interface Camara {
  yaw: number;
  pitch: number;
  /** El dedo o el ratón están girando la vista AHORA. Mientras dura, la
   *  cámara no persigue el rumbo del personaje: mandas tú. */
  arrastrando?: boolean;
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
  /** Un bloque `{tipo:'agente', agente_id}` NO es contenido: dice que esta
   *  tarjeta ES una persona del mundo, y entonces en la habitación aparece su
   *  avatar de verdad en vez de una lámina de cristal (petición de Eugenio:
   *  «me ha creado una Anita nueva; yo quiero la original, con su avatar»). */
  bloques: Array<{ tipo: string; texto?: string; url?: string; pie?: string; agente_id?: string }>;
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
  /** Proyectos de los que esta persona FORMA PARTE (sección de personas,
   *  fuera del kanban — petición de Eugenio). */
  proyecto_ids?: string[];
  tarjetas?: number;
  hechas?: number;
  conversation_id: string | null;
  x: number;
  z: number;
}

// ---------------------------------------------------------------------------
// El mundo editable: un Miro en 3D (2026-08-18, petición de Eugenio)
// ---------------------------------------------------------------------------

/** Un objeto plantado por el jugador: un prop del catálogo, una nota, una
 *  imagen o un documento. Vive en `game_world_items`. */
export interface ItemMundo {
  id: string;
  tipo: 'prop' | 'nota' | 'imagen' | 'documento' | 'enlace' | 'video' | 'musica' | 'lienzo' | 'mapa';
  modelo: string | null;
  texto: string | null;
  url: string | null;
  nombre: string | null;
  x: number;
  z: number;
  rot: number;
  escala: number;
  /** Hilos de conocimiento: a qué apunta este objeto. Cada destino es
   *  'item:WM…', 'agente:GA…' o 'proy:PRY…'. Desde 2026-08-18 el hilo lleva
   *  información, como las aristas de los grafos: una RELACIÓN (contexto,
   *  causa, dato…) y un texto corto — la pregunta a la que responde. */
  enlaces?: Array<{ a: string; rel?: string; texto?: string }>;
}

/** Las relaciones de un hilo: las MISMAS de los grafos de conocimiento, con
 *  su color. Un hilo del mundo 3D y una arista del lienzo dicen lo mismo. */
export const RELACIONES_HILO: Array<{ id: string; label: string; color: string }> = [
  { id: 'contexto', label: 'Contexto', color: '#64748b' },
  { id: 'causa', label: 'Causa', color: '#e11d48' },
  { id: 'dato', label: 'Dato', color: '#0284c7' },
  { id: 'fuente', label: 'Fuente', color: '#7c3aed' },
  { id: 'apoya', label: 'Apoya', color: '#16a34a' },
  { id: 'contradice', label: 'Contradice', color: '#ea580c' },
  { id: 'matiza', label: 'Matiza', color: '#ca8a04' },
];

/** Un hilo señalado con el ratón: el objeto de origen y cuál de sus enlaces. */
export interface SeleccionHilo {
  itemId: string;
  indice: number;
}

/** El catálogo de props que se pueden plantar. Vive aquí (y no en el editor
 *  3D) porque el panel de creación es HTML de la página, que NO importa three. */
export const CATALOGO_PROPS: Array<{ modelo: string; nombre: string; icono: string }> = [
  { modelo: 'arbol', nombre: 'Árbol', icono: '🌳' },
  { modelo: 'pino', nombre: 'Pino', icono: '🌲' },
  { modelo: 'casa', nombre: 'Casa', icono: '🏠' },
  { modelo: 'banco', nombre: 'Banco', icono: '🪑' },
  { modelo: 'farola', nombre: 'Farola', icono: '💡' },
  { modelo: 'puesto', nombre: 'Puesto', icono: '⛺' },
  { modelo: 'pozo', nombre: 'Pozo', icono: '🪣' },
  { modelo: 'roca', nombre: 'Roca', icono: '🪨' },
  { modelo: 'arbusto', nombre: 'Arbusto', icono: '🌿' },
];

/** Un retoque sobre el pueblo de serie: mover, eliminar o cambiar el diseño
 *  de una casa, una farola, un árbol… `seed_id` es 'casa:3', 'arbol:517'… */
export interface OverrideMundo {
  seed_id: string;
  eliminado: boolean;
  x: number | null;
  z: number | null;
  rot: number | null;
  modelo: string | null;
}

/** Lo que el jugador tiene seleccionado en modo edición. */
export interface SeleccionMundo {
  /** 'semilla' = objeto del pueblo de serie; 'item' = creado por el jugador. */
  clase: 'semilla' | 'item';
  id: string;
  /** casa | arbol | farola | banco | puesto | pozo | carro | nave | prop | nota | imagen | documento */
  tipo: string;
  etiqueta: string;
  x: number;
  z: number;
  rot: number;
  /** Solo los objetos con variantes de diseño enseñan el botón «Diseño». */
  modelo?: string | null;
  texto?: string | null;
  url?: string | null;
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
