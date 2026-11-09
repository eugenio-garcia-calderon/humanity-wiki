/**
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
  fecha: '2026-11-09',
  resolucion: 'media',
  kmh: 80,
  banda: 0.15,
  coches: [
    { id: 'twizy', nombre: 'Renault Twizy', publicado: 0.64, estimado: 0.307, sinEl: 0.307, enAjuste: false },
    { id: 'aptera', nombre: 'Aptera', publicado: 0.13, estimado: 0.147, sinEl: 0.156, enAjuste: true },
    { id: 'xl1', nombre: 'VW XL1 2013', publicado: 0.189, estimado: 0.153, sinEl: 0.147, enAjuste: true },
    { id: 'unlitro', nombre: 'VW 1-Litro 2002', publicado: 0.159, estimado: 0.160, sinEl: 0.161, enAjuste: true },
    { id: 'szemission', nombre: 'SZEmission', publicado: 0.1365, estimado: 0.134, sinEl: 0.133, enAjuste: true },
  ] as { id: string; nombre: string; publicado: number; estimado: number; sinEl: number; enAjuste: boolean }[],
};
