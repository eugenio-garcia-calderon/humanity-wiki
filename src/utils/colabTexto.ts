// ============================================================================
// EDICIÓN COLABORATIVA: LO QUE NO NECESITA YJS (2026-10-06, carril colab)
// ============================================================================
// Funciones puras de `colabModelo.ts` que el editor usa SIEMPRE (comparar
// textos, mover el cursor) y que por eso no pueden vivir en un fichero que
// importa `yjs`: el editor sólo carga Yjs cuando se abre una página para
// editar (carga perezosa; ver `useColab.ts`), no con la aplicación.
// ============================================================================

import type { Bloque } from './bloques';

/** Lo que el editor entrega y recibe: título y lista PLANA de bloques con su
 *  texto ya puesto. */
export interface Plano { titulo: string; bloques: Bloque[] }

/** JSON con las claves ordenadas: dos objetos iguales dan el mismo texto. */
export function firma(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.entries(x as any).filter(([, y]) => y !== undefined).sort(([a], [c]) => a < c ? -1 : a > c ? 1 : 0))
    : x)) ?? 'undefined';
}

// ── TEXTO: PREFIJO Y SUFIJO COMUNES ────────────────────────────────────────

const altoSust = (c: number) => c >= 0xd800 && c <= 0xdbff;
const bajoSust = (c: number) => c >= 0xdc00 && c <= 0xdfff;

/** Qué cambió entre dos textos: desde `i` se quitan `quitar` caracteres y se
 *  ponen `poner`. Nunca parte un par sustituto (un emoji), que dejaría medio
 *  carácter suelto al fusionarse con otra edición. */
export function diferencia(viejo: string, nuevo: string): { i: number; quitar: number; poner: string } | null {
  if (viejo === nuevo) return null;
  const max = Math.min(viejo.length, nuevo.length);
  let i = 0;
  while (i < max && viejo.charCodeAt(i) === nuevo.charCodeAt(i)) i++;
  let j = 0;
  while (j < max - i && viejo.charCodeAt(viejo.length - 1 - j) === nuevo.charCodeAt(nuevo.length - 1 - j)) j++;
  if (i > 0 && altoSust(viejo.charCodeAt(i - 1))) i--;
  if (j > 0 && bajoSust(viejo.charCodeAt(viejo.length - j))) j--;
  return { i, quitar: viejo.length - i - j, poner: nuevo.slice(i, nuevo.length - j) };
}

/** Dónde queda un índice del texto tras aplicar un `delta` de Yjs (el cursor de
 *  quien escribe en ese bloque se mueve con lo que otros hacen delante). */
export function moverIndice(indice: number, delta: any[], asociarDerecha = false): number {
  let pos = 0, res = indice;
  for (const op of delta) {
    if (op.retain != null) { pos += op.retain; continue; }
    if (op.insert != null) {
      const n = typeof op.insert === 'string' ? op.insert.length : 1;
      if (pos < indice || (pos === indice && asociarDerecha)) res += n;
      pos += 0;      // la inserción no avanza en el texto antiguo
      continue;
    }
    if (op.delete != null) {
      const fin = pos + op.delete;
      if (indice > pos) res -= Math.min(indice, fin) - pos;
      pos = fin;
    }
  }
  return res;
}

/** Dónde acaba el cursor de quien DESHACE: tras lo último que se insertó o,
 *  si sólo se borró, donde se borró. `null` si el delta no cambia nada. */
export function posTrasDelta(delta: any[]): number | null {
  let pos = 0, fin: number | null = null;
  for (const op of delta) {
    if (op.retain != null) pos += op.retain;
    else if (op.insert != null) { pos += typeof op.insert === 'string' ? op.insert.length : 1; fin = pos; }
    else if (op.delete != null) fin = pos;
  }
  return fin;
}

/** Dónde queda el índice `i` de un texto tras reemplazar `quitar` caracteres
 *  desde `d.i` por `poner` (el resultado de `diferencia`). */
export function indiceTrasDiferencia(i: number, d: { i: number; quitar: number; poner: string }): number {
  if (i <= d.i) return i;
  if (i >= d.i + d.quitar) return i - d.quitar + d.poner.length;
  return d.i + d.poner.length;
}
