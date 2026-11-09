/**
 * The Cp colour scale, shared by the 3D skin and streamlines (three.js colours)
 * and the card's legend (Tailwind classes of the same colours). Fixed range,
 * −1 … +1, so two cars can be compared by eye; values beyond it take the end colour.
 */
export const ESCALA_CP: { cp: number; hex: number; clase: string }[] = [
  { cp: -1.0, hex: 0x1e3a8a, clase: 'bg-blue-900' },
  { cp: -0.6, hex: 0x2563eb, clase: 'bg-blue-600' },
  { cp: -0.3, hex: 0x60a5fa, clase: 'bg-blue-400' },
  { cp: -0.1, hex: 0xbfdbfe, clase: 'bg-blue-200' },
  { cp: 0.05, hex: 0xf1f5f9, clase: 'bg-slate-100' },
  { cp: 0.3, hex: 0xfcd34d, clase: 'bg-amber-300' },
  { cp: 0.6, hex: 0xf97316, clase: 'bg-orange-500' },
  { cp: 1.0, hex: 0xdc2626, clase: 'bg-red-600' },
];

/** Colour of the wake (smoke that has left the body). */
export const COLOR_ESTELA = 0x7c3aed;

const rgb = ESCALA_CP.map(e => [((e.hex >> 16) & 255) / 255, ((e.hex >> 8) & 255) / 255, (e.hex & 255) / 255]);

/** Cp → linear-ish RGB triple in [0, 1] (sRGB values; the material converts). */
export function colorDeCp(cp: number, out: number[] | Float32Array, o = 0) {
  const E = ESCALA_CP;
  let k = 0;
  if (cp <= E[0].cp) k = 0; else if (cp >= E[E.length - 1].cp) k = E.length - 2; else while (k < E.length - 2 && cp > E[k + 1].cp) k++;
  const t = Math.max(0, Math.min(1, (cp - E[k].cp) / (E[k + 1].cp - E[k].cp)));
  for (let c = 0; c < 3; c++) out[o + c] = rgb[k][c] + (rgb[k + 1][c] - rgb[k][c]) * t;
}
