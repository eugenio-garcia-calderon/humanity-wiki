/**
 * 2026-11-12: the Aptera's body was redrawn after photos (nose and canopy). The
 * rows below are recomputed with it (Aptera 0.147 → 0.132; the other cars' own
 * estimates are unchanged, only their leave-one-out values move, since the
 * Aptera is in their fit). That fit now gives DCD_DETALLES 0.0565 and a band of
 * ±11 % (`ajusteActual`). By Eugenio's decision the constants in use stay the
 * earlier ones — DCD_DETALLES 0.051 and `banda` ±15 % — so no Cd shown for our
 * own designs moves; the wider band is kept on purpose. The tunnel tests check
 * `ajusteActual` and only warn about the difference.
 *
 * The calibration run, kept so the card can show it without recomputing five cars
 * (2026-11-09, «media» resolution, 80 km/h; rerun the same day after the XL1 and
 * 1-Litre silhouettes were rebuilt from photos: XL1 −13 % → −19 %, 1-Litre −3 % → +1 %,
 * band ±13 % → ±15 %). scripts/tunel-pruebas.ts recomputes
 * it and fails if these numbers no longer match the code: rerun it after changing
 * the method, the constants or a garage silhouette, and copy its output here.
 *
 * `sinEl`: the estimate when that car is left out of the fit (leave-one-out).
 * `banda`: root-mean-square relative error of `sinEl` over the four closed cars.
 * It is the uncertainty given to our design (also a closed body). The Twizy is
 * open at the sides and outside the method's reach: it is shown, not used.
 */
export const CALIBRACION = {
  fecha: '2026-11-12',
  resolucion: 'media',
  kmh: 80,
  /** The band in use: the earlier fit's (2026-11-09), kept on purpose; see above. */
  banda: 0.15,
  /** What the fit on today's cars gives (scripts/tunel-pruebas.ts checks it); not applied, by decision. */
  ajusteActual: { fecha: '2026-11-12', dcd: 0.0565, banda: 0.11 },
  coches: [
    { id: 'twizy', nombre: 'Renault Twizy', publicado: 0.64, estimado: 0.307, sinEl: 0.307, enAjuste: false },
    { id: 'aptera', nombre: 'Aptera', publicado: 0.13, estimado: 0.132, sinEl: 0.141, enAjuste: true },
    { id: 'xl1', nombre: 'VW XL1 2013', publicado: 0.189, estimado: 0.153, sinEl: 0.153, enAjuste: true },
    { id: 'unlitro', nombre: 'VW 1-Litro 2002', publicado: 0.159, estimado: 0.160, sinEl: 0.168, enAjuste: true },
    { id: 'szemission', nombre: 'SZEmission', publicado: 0.1365, estimado: 0.134, sinEl: 0.140, enAjuste: true },
  ] as { id: string; nombre: string; publicado: number; estimado: number; sinEl: number; enAjuste: boolean }[],
};
