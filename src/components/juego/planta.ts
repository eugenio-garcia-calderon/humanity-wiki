// ============================================================================
// JUEGO VITAL — la planta del interior de un proyecto (2026-08-18, petición de
// Eugenio: «como en Pokémon, se abre un nuevo escenario»).
// ============================================================================
// UN SOLO SITIO define dónde está cada cosa, igual que `mapa.ts` hace con la
// aldea. Lo leen la escena (para dibujar) y los obstáculos (para chocar): si
// estuviera duplicado, entrarías por una puerta que ya no está ahí.
//
// La estructura NO es inventada: las habitaciones son los **grupos** del
// proyecto (Producto, Diseño, Técnico…, con su color), que es como Eugenio ya
// organiza su tablero. Entrar en una habitación es abrir esa carpeta.

/** Radio de la sala diáfana. Cabe holgado y se ve el techo. */
export const SALA_R = 24;
/** A qué distancia del centro se abren las puertas. */
export const PUERTA_R = 18.5;
/** Radio de choque de una puerta: rozarla ya te mete dentro. */
export const RADIO_PUERTA = 2.8;
/** Radio de choque de una foto o documento flotante. */
export const RADIO_ITEM = 1.5;
/** Dónde apareces al entrar (sur de la sala, mirando al núcleo). */
export const ENTRADA = { x: 0, z: SALA_R - 4 };

export interface Grupo { id: string; label: string; color: string }

/**
 * Puertas repartidas por el arco norte, dejando el sur libre para la entrada.
 * Con pocos grupos quedan centradas; con muchos, se reparten sin amontonarse.
 */
export function posicionPuerta(i: number, n: number): { x: number; z: number; ang: number } {
  const arco = Math.PI * 1.45;                  // 260°, el sur queda para salir
  const paso = n > 1 ? arco / (n - 1) : 0;
  const ang = -Math.PI / 2 - arco / 2 + paso * i;
  return { x: Math.cos(ang) * PUERTA_R, z: Math.sin(ang) * PUERTA_R, ang };
}

/** El portal de vuelta a la aldea, justo detrás de donde apareces. */
export const SALIDA = { x: 0, z: SALA_R - 1.2 };

// --- Habitación --------------------------------------------------------------
export const HAB_ANCHO = 34;
export const HAB_FONDO = 26;
/** Dónde apareces dentro de una habitación, y dónde está la puerta de vuelta. */
export const HAB_ENTRADA = { x: 0, z: HAB_FONDO / 2 - 3 };
export const HAB_SALIDA = { x: 0, z: HAB_FONDO / 2 - 0.5 };

/**
 * Las cosas de una habitación flotan en dos arcos concéntricos delante de ti:
 * el de dentro a la altura de la vista, el de fuera un poco más alto. Así se
 * ven todas de un vistazo sin taparse, sin importar cuántas haya.
 */
export function posicionItem(i: number, n: number): { x: number; y: number; z: number } {
  const porArco = Math.max(4, Math.ceil(n / 2));
  const arco = Math.min(1, i / porArco) >= 1 ? 1 : 0;   // 0 = interior, 1 = exterior
  const dentroDelArco = i % porArco;
  const cuantos = arco === 0 ? Math.min(n, porArco) : n - porArco;
  const abanico = Math.min(Math.PI * 0.9, 0.42 * Math.max(1, cuantos - 1));
  const paso = cuantos > 1 ? abanico / (cuantos - 1) : 0;
  const ang = -Math.PI / 2 - abanico / 2 + paso * dentroDelArco;
  const radio = arco === 0 ? 8.5 : 13.5;
  return {
    x: Math.cos(ang) * radio,
    y: arco === 0 ? 2.1 : 3.4,
    z: Math.sin(ang) * radio + 2,
  };
}
