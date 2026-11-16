/*
 * The transition between the cabin and the tail (2026-11-16).
 *
 * Eugenio, on his «Modelo 1» (round canopy, wide flat tail with the solar panel): «haz que esto no pueda ocurrir, este
 * salto que hay entre la cola y la cabina. Tiene que haber como una especie de parte intermedia que comunique con las
 * dos y también que la cola sea mucho más flexible… para que esto no pueda ocurrir más.»
 *
 * Where the jump came from. The plain (round-canopy) body is drawn once, for the reference dimensions, and reaches every
 * other design through a piecewise-linear stretch along x between six anchors (nose tip, front axle, canopy start,
 * canopy end, rear axle, tail tip). Where two neighbouring stretches differ, every line along the car bends at the
 * anchor: a crease right round the body. At the canopy's end it is exactly where the glass meets the tail, and it grows
 * with the difference: a long canopy ending close to the rear axle compresses the reference's 45 cm fall between the two
 * into a few centimetres, and the roof drops off a corner. Behind it, the tail cap joined the body with its slopes
 * clipped (0 … 0.95 of the body's) and its flat-tail wedge thinning linearly from the joint: two more creases, at the
 * cap's start.
 *
 * The fix, in two parts, both used only when `transCola` is set (the Triciclo always sets it; the garage models never do,
 * so they stay bit for bit):
 *  1. `estiramientoSuave`: the stretch's slope, instead of jumping at the canopy's end and at the rear axle, changes
 *     over `largo` metres centred on each, along a «smootherstep» (C2). Every line along the car is then G2 through the
 *     transition, for any canopy and tail. The correction integrates to exactly zero across each window (the blend is
 *     symmetric), so outside the windows the map is the old one, bit for bit: the nose, the cabin and the tail's tip
 *     keep their numbers, and the glass's line, the solar panel and the hatch, all read off the same skin, follow.
 *     Where the windows overlap (a short gap between the canopy's end and the axle) the slope is still a convex blend
 *     of the stretches, so the map stays increasing.
 *  2. `relContinua`: the tail cap takes the body's own slopes at its joint, unclipped within [−1, 4] (the cap's ogive
 *     handles both: with a slope above its sharpness it closes with that slope, below 0 it first widens), and its
 *     wedge thins as s²(2 − s), which leaves the joint level. The cap then starts tangent to the body.
 */

/** C2 step from 0 (u ≤ −½) to 1 (u ≥ ½), symmetric: H(u) + H(−u) = 1. */
const paso = (u: number) => { const p = Math.min(1, Math.max(0, u + 0.5)); return p * p * p * (p * (6 * p - 15) + 10); };
/** ∫ from −½ to u of (H − the unit step): 0 outside (−½, ½), since H is symmetric. */
function area(u: number): number {
  if (u <= -0.5 || u >= 0.5) return 0;
  const p = u + 0.5, P = p * p * p * p * (p * (p - 3) + 2.5);
  return u > 0 ? P - u : P;
}

/**
 * The piecewise-linear map `lineal` (anchors `de` → `a`, both decreasing, as `tramos` builds it) with its corners at the
 * anchors `indices` rounded over `largo` m each; and its inverse. Null when there is nothing to round (equal stretches
 * on both sides of every one of those anchors: the reference drawing itself, which then stays the exact identity).
 */
export function estiramientoSuave(de: number[], a: number[], indices: number[], largo: number, lineal: (x: number) => number, inversaLineal: (y: number) => number) {
  const s = (i: number) => (a[i + 1] - a[i]) / (de[i + 1] - de[i]);
  // a corner at de[i]: slope s(i − 1) on the side towards the front (x > de[i]), s(i) behind it
  const esquinas = indices.filter(i => i > 0 && i < de.length - 1).map(i => ({ x: de[i], d: s(i - 1) - s(i) })).filter(e => Math.abs(e.d) > 1e-12);
  if (!esquinas.length || !(largo > 0)) return null;
  // (never wider than twice the shorter neighbour of each corner, so a window cannot reach past the next anchor but one)
  const L = esquinas.map(e => { const i = de.indexOf(e.x); return Math.min(largo, 2 * Math.abs(de[i - 1] - de[i]), 2 * Math.abs(de[i + 1] - de[i])); });
  const L0 = Math.min(...L);
  // R'(x) = s(i) + d·H((x − c)/L): behind the corner the rear slope, ahead the front one. R − lineal = d·L·area(u).
  const R = (x: number) => {
    let y = lineal(x);
    for (const e of esquinas) { const u = (x - e.x) / L0; if (u > -0.5 && u < 0.5) y += e.d * L0 * area(u); }
    return y;
  };
  const dentro = (x: number) => esquinas.some(e => Math.abs(x - e.x) < L0 / 2);
  const X = (y: number) => {
    const g = inversaLineal(y);
    if (!dentro(g)) return g;
    let lo = g - L0, hi = g + L0;
    while (R(lo) > y) lo -= L0; while (R(hi) < y) hi += L0;
    for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (R(m) < y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  };
  return { R, X, largo: L0 };
}

/** The tail cap's slope at its joint, relative (as `tapa` measures it), kept within what the ogive can follow. */
export const relContinua = (v0: number, vIn: number, e: number, largo: number, ref: number) =>
  Math.min(4, Math.max(-1, ((vIn - v0) / e) * largo / Math.max(1e-3, ref)));
/** The flat tail's wedge, thinning from the joint without a slope of its own (the old one: 1 − ½·linea·s). */
export const cunaContinua = (linea: number, s: number) => 1 - 0.5 * linea * s * s * (2 - s);
