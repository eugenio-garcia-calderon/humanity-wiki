/*
 * The Kamm tail (2026-11-17): what the literature says a cut tail's base costs, as a separate estimate next to the wind
 * tunnel's. Pure (no three.js).
 *
 * Eugenio: «estudia los cortes drásticos de las colas de los vehículos para mejorar su aerodinámica sin tener que hacer una
 * cola muy alargada, y permite seleccionarla en el "Modelo 1"». The shape itself is garaje/balaForma.ts `corte`; this file
 * only holds the numbers from the sources below, so the panel and scripts/kamm-estudio.ts say the same thing.
 *
 * Why separate: the tunnel (tunel/arrastre.ts) charges every body's wake as K_BASE (0.2) × the area behind its predicted
 * separation line, one constant for every car, never re-fitted for a cut tail («tranqui con lo de los CD, de momento no lo
 * modifiques»). It does see the cut through the shape (the base appears as area behind the separation, the wetted area
 * and the length shrink), but it cannot see the base's own details: a cavity, the sharpness of the edge.
 *
 * Sources (read 2026-11-17):
 *  - Kamm's rule: cut where the section has fallen to about half the largest (Wikipedia, «Kammback»).
 *  - Mercedes-Benz Classic, «History of aerodynamics»: Kamm's K3 on a 170 V, Cd 0.23 in the model tunnel of the time.
 *  - SAE 2020-01-0673, «Streamlined Tails – The Effects of Truncation on Aerodynamic Drag»: on car-like bodies the drag
 *    saved by a longer tail is roughly proportional to the section it removes; a cut tail is not «as good as the long one».
 *  - Evrard, Cadot et al., «Fluid force and symmetry breaking modes of a 3D bluff body with a base cavity» (core.ac.uk
 *    52674332): square-back base suction Cb 0.149; a cavity 27 % of the base's height deep cuts it 18 % (ΔCd −0.026 of
 *    0.288, −9 %), saturating from about 24–27 %.
 *  - Transport Canada / NRC, trailer-based drag reduction (boat tails 2 ft and 4 ft long gave the same 6–7 %; other
 *    studies up to 10 %): a short taper of ~10–15° before a cut does most of the work.
 *  - Hucho, «Aerodynamics of Road Vehicles» (1998), via tunel/arrastre.ts K_BASE: −Cpb ≈ 0.2 on rounded and cut tails.
 */

/** Base suction (−Cpb) of a cut tail whose flow stays attached to a sharp edge: 0.15 (Evrard et al.) … 0.20 (Hucho). */
export const SUCCION_CULOTE = [0.15, 0.20] as const;
/** A base cavity: up to 18 % less base suction, reached at 27 % of the base's height (Evrard et al.). */
export const CAVIDAD = { reduccion: 0.18, profundidad: 0.27 };
/** Beyond this taper (°) just ahead of the cut the flow has left the skin before the cut. */
export const ANGULO_MAX = 15;

export interface CorteKamm { area: number; alto: number; cavidad: number; angTecho: number; angLado: number; angBajos: number }

/** The literature's base drag of the cut (ΔCd on `areaRef`), its range, and a warning if the taper is too steep. */
export function estimacionKamm(k: CorteKamm, areaRef: number) {
  const fCav = 1 - CAVIDAD.reduccion * Math.min(1, k.cavidad / Math.max(1e-6, CAVIDAD.profundidad * k.alto));
  const r = k.area / Math.max(1e-6, areaRef);
  const peor = Math.max(k.angTecho, k.angLado, k.angBajos);
  return {
    min: SUCCION_CULOTE[0] * r * fCav, max: SUCCION_CULOTE[1] * r * fCav, factorCavidad: fCav, angulo: peor,
    aviso: peor > ANGULO_MAX ? `la cola se cierra ${Math.round(peor)}° justo antes del corte: más de ${ANGULO_MAX}°, el aire se suelta antes y el culote real es mayor` : '',
  };
}
