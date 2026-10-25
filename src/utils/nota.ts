import { getColorForScore } from './scoreColor';

// ============================================================================
// LA NOTA DEL 1 AL 10 (2026-10-25, Eugenio)
// ============================================================================
// «Que en vez de porcentajes sea nota del 1 al 10, con el mismo gradiente de
// colores del mapa para no repetirlo.» Una sola escala para todo: el mapa, la
// ficha de un territorio y la propiedad «Nota» de las bases de datos. Por
// dentro el mapa sigue calculando sobre 100 (68 % = 6,8): solo cambia cómo se
// dice. Los colores son los de `scoreColor.ts`, sin copiarlos.

/** 68 (sobre 100) → 6,8. */
export const notaDePorcentaje = (pct: number) => Math.round(pct) / 10;

/** «6,8», «7», «10». Sin decimales cuando no los tiene. */
export function textoNota(nota: number | null | undefined): string {
  if (nota == null || !Number.isFinite(Number(nota))) return '—';
  return Number(nota).toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

/** Lo mismo desde un porcentaje (el mapa calcula sobre 100). */
export const textoNotaDePorcentaje = (pct: number | null | undefined) => (pct == null ? '—' : textoNota(notaDePorcentaje(pct)));

/** El color de una nota: el del mapa para su porcentaje. */
export const colorDeNota = (nota: number) => getColorForScore(Math.max(0, Math.min(10, nota)) * 10);

const hexARgb = (h: string) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbAHex = (r: number, g: number, b: number) => `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
const mezclar = (a: string, b: string, t: number) => { const x = hexARgb(a), y = hexARgb(b); return rgbAHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };

/** Los tonos para pintar una tarjeta o una celda con su nota, legibles sobre blanco:
 *  `fondo` (muy claro), `borde`, `color` (el del mapa) y `tinta` (oscurecido para el texto). */
export function tonosDeNota(nota: number) {
  const color = colorDeNota(nota);
  return {
    color,
    fondo: mezclar(color, '#ffffff', 0.86),
    borde: mezclar(color, '#ffffff', 0.6),
    // Bot de UX, ronda 2: con la escala de 10 pasos, el verde claro del 7–8 daba 2,4:1. Ahora ≥ 4,5:1.
    tinta: mezclar(color, '#000000', nota >= 9.5 ? 0.05 : nota >= 8.5 ? 0.3 : 0.5),
  };
}

/** Blanco o casi negro, el que se lea mejor encima de `color`. */
export function textoSobre(color: string): string {
  const [r, g, b] = hexARgb(color).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // WCAG: negro sobre los tonos claros (del ámbar al verde claro), blanco sobre los oscuros.
  return lum > 0.22 ? '#1c1917' : '#ffffff';
}
