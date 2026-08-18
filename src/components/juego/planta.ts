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

import type { Agente, ItemProyecto } from './tipos';

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
 * Las personas de una habitación NO flotan: están de pie, en un arco delante
 * de ti y más cerca que las tarjetas. Entras y están ahí, como en un salón
 * (petición de Eugenio: quería a la Anita de verdad dentro de la sala, con su
 * avatar, no una tarjeta nueva con su nombre).
 */
export function posicionHabitante(i: number, n: number): { x: number; z: number } {
  // Con una sola persona el abanico es cero: se queda justo enfrente, centrada.
  const abanico = n > 1 ? Math.min(Math.PI * 0.8, 0.5 * (n - 1)) : 0;
  const paso = n > 1 ? abanico / (n - 1) : 0;
  const ang = -Math.PI / 2 - abanico / 2 + paso * i;
  return { x: Math.cos(ang) * 5.5, z: Math.sin(ang) * 5.5 + 2 };
}

/** Radio de choque de una persona dentro de una habitación. */
export const RADIO_HABITANTE = 1.4;

// --- Quién vive en una habitación --------------------------------------------
// Esto vive AQUÍ, y no en `Interior.tsx`, por una razón de peso: la página lo
// necesita para contárselo a la IA, y `Interior.tsx` importa three.js. Traerlo
// desde allí metería el motor 3D entero (~1 MB) en el paquete que descarga
// TODO el mundo, juegue o no.

/** Compara nombres sin tildes ni mayúsculas: «Anita» y «anita» son la misma. */
const llave = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * ¿Esta tarjeta ES una persona de tu mundo? Dos caminos:
 *
 * 1. El bueno: la tarjeta trae un bloque `{tipo:'agente', agente_id}`, que es
 *    lo que se guarda desde que la IA sabe enlazar con quien ya existe.
 * 2. El rescate: las tarjetas creadas ANTES de esto solo tienen el nombre. Si
 *    coincide con el de alguien de tu mundo, es esa persona — así la «Anita»
 *    que la IA duplicó pasa a ser la Anita de verdad sin tocar la base de datos.
 */
export function agenteDeItem(it: ItemProyecto, agentes: Agente[]): Agente | null {
  const ref = (Array.isArray(it.bloques) ? it.bloques : [])
    .find(b => b?.tipo === 'agente' && b.agente_id);
  if (ref?.agente_id) return agentes.find(a => a.id === ref.agente_id) || null;
  const k = llave(it.titulo);
  return agentes.find(a => a.tipo === 'persona' && llave(a.nombre) === k) || null;
}

/**
 * Quién está de pie en una habitación. Un solo sitio lo decide, y lo leen la
 * escena (para dibujarlos), los obstáculos (para poder chocarte con ellos) y
 * la página (para contárselo a la IA).
 *
 * Desde 2026-08-18 la fuente principal es la MEMBRESÍA (`proyecto_ids` del
 * agente): quien forma parte del proyecto está de pie en su sala «Personas»,
 * sin tarjeta en el kanban (petición de Eugenio). Las tarjetas enlazadas de
 * antes se siguen leyendo como rescate.
 */
export function habitantesDeSala(
  items: ItemProyecto[], sala: string | null, agentes: Agente[], proyectoId?: string,
): Agente[] {
  if (!sala) return [];
  const out: Agente[] = [];
  const meter = (a: Agente) => { if (!out.some(x => x.id === a.id)) out.push(a); };
  if (sala === 'personas' && proyectoId) {
    for (const a of agentes) {
      if (a.tipo === 'persona' && a.proyecto_ids?.includes(proyectoId)) meter(a);
    }
  }
  for (const it of items) {
    if (it.grupo !== sala) continue;
    const a = agenteDeItem(it, agentes);
    if (a) meter(a);
  }
  return out;
}

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
