// Eugenio's own marks on the strategy tree (2026-11-19): yes / no / unsure on a node, a note, and his answers to the
// questions. Kept in THIS BROWSER only (`localStorage`), on purpose: the page is public and the answers are personal
// (money, limits, family). Nothing here reaches the server. The panel says so, and offers «Copiar mis respuestas» to
// paste them into the chat, where Claude writes into `arbol.ts` whatever should become part of the tree.
// Debt logged in memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md: a private, per-account store in the database.
import { useSyncExternalStore } from 'react';

export type Marca = 'si' | 'no' | 'dudo';
export interface DatosEstrategia {
  marcas: Record<string, Marca>;
  notas: Record<string, string>;
  /** key: `${id del nodo}#${texto de la pregunta}` — the text, not its index: questions come and go as the tree is edited */
  respuestas: Record<string, string>;
}

const CLAVE = 'aeromovil.estrategia.v1';
const VACIO: DatosEstrategia = { marcas: {}, notas: {}, respuestas: {} };
let datos: DatosEstrategia | null = null;
const subs = new Set<() => void>();

function leer(): DatosEstrategia {
  if (datos) return datos;
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    datos = v && typeof v === 'object' ? { marcas: { ...v.marcas }, notas: { ...v.notas }, respuestas: { ...v.respuestas } } : VACIO;
  } catch { datos = VACIO; }
  return datos!;
}

function guardar(d: DatosEstrategia) {
  datos = d;
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* sin almacenamiento: vale para esta visita */ }
  subs.forEach(f => f());
}

const sinVacio = (o: Record<string, string>, k: string, v: string) => { const n = { ...o }; if (v.trim()) n[k] = v; else delete n[k]; return n; };

export function ponerMarca(id: string, m: Marca | null) {
  const d = leer(), marcas = { ...d.marcas };
  if (m) marcas[id] = m; else delete marcas[id];
  guardar({ ...d, marcas });
}
export const ponerNota = (id: string, texto: string) => { const d = leer(); guardar({ ...d, notas: sinVacio(d.notas, id, texto) }); };
export const ponerRespuesta = (clave: string, texto: string) => { const d = leer(); guardar({ ...d, respuestas: sinVacio(d.respuestas, clave, texto) }); };

export function useEstrategia(): DatosEstrategia {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, leer, () => VACIO);
}
