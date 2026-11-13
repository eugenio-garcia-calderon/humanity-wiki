/**
 * The body's colours (2026-11-13, Eugenio: «permite también cambiar el color de la carrocería»).
 *
 * Two colours a design carries in its parameters (`colorCarroceria`, `colorAcento`) and saves with it: the paint of the
 * body and the accent (the navy of the nose piece, the lower band, the pods' bottoms, the pillars and frames). Absent,
 * the defaults below, which are exactly the pearl white and the navy every design had until now, so every saved design
 * looks as it did. The viewer only recolours the materials (grain and clear coat stay): the geometry is not rebuilt.
 *
 * Hex values live here and in the three.js materials, never in the page (src/components/ui/CLAUDE.md).
 */
export const COLOR_CARROCERIA = '#f4f5f6';
export const COLOR_ACENTO = '#182544';

export interface ColorNombrado { k: string; n: string; hex: string }
/** Presets for the body (Spanish names, as on the swatches). */
export const COLORES_CARROCERIA: ColorNombrado[] = [
  { k: 'perla', n: 'Perla', hex: COLOR_CARROCERIA },
  { k: 'plata', n: 'Plata', hex: '#a9afb6' },
  { k: 'grafito', n: 'Grafito', hex: '#3a3e44' },
  { k: 'negro', n: 'Negro', hex: '#121315' },
  { k: 'marino', n: 'Azul marino', hex: '#1d2b4f' },
  { k: 'azul', n: 'Azul cielo', hex: '#5b8fc7' },
  { k: 'rojo', n: 'Rojo', hex: '#b3202a' },
  { k: 'verde', n: 'Verde inglés', hex: '#1f4a35' },
  { k: 'arena', n: 'Arena', hex: '#d9c9a8' },
  { k: 'naranja', n: 'Naranja', hex: '#e07a2b' },
];
/** Presets for the accent. */
export const COLORES_ACENTO: ColorNombrado[] = [
  { k: 'marino', n: 'Azul marino', hex: COLOR_ACENTO },
  { k: 'negro', n: 'Negro', hex: '#121315' },
  { k: 'grafito', n: 'Grafito', hex: '#3a3e44' },
  { k: 'plata', n: 'Plata', hex: '#a9afb6' },
  { k: 'rojo', n: 'Rojo', hex: '#b3202a' },
  { k: 'verde', n: 'Verde inglés', hex: '#1f4a35' },
  { k: 'perla', n: 'Perla', hex: COLOR_CARROCERIA },
];
const HEX = /^#[0-9a-f]{6}$/i;
/** A design's colours: what it saved, if it is a valid `#rrggbb`, or the default (lower case, so equal colours compare equal). */
export function coloresDe(P: { colorCarroceria?: unknown; colorAcento?: unknown }): { carroceria: string; acento: string } {
  const v = (x: unknown, d: string) => (typeof x === 'string' && HEX.test(x) ? x.toLowerCase() : d);
  return { carroceria: v(P.colorCarroceria, COLOR_CARROCERIA), acento: v(P.colorAcento, COLOR_ACENTO) };
}
/** The preset's name for a colour, or null for a free one. */
export const nombreColor = (lista: ColorNombrado[], hex: string) => lista.find(c => c.hex.toLowerCase() === hex.toLowerCase())?.n ?? null;
/** The parameter keys that are only colour: changing them must not rebuild the 3D model. */
export const CLAVES_COLOR = ['colorCarroceria', 'colorAcento'] as const;
