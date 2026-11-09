/**
 * The calibration run, kept so the card can show it without recomputing five cars
 * (2026-11-09, «media» resolution, 80 km/h). scripts/tunel-pruebas.ts recomputes
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
  banda: 0.13,
  coches: [
    { id: 'twizy', nombre: 'Renault Twizy', publicado: 0.64, estimado: 0.307, sinEl: 0.307, enAjuste: false },
    { id: 'aptera', nombre: 'Aptera', publicado: 0.13, estimado: 0.147, sinEl: 0.155, enAjuste: true },
    { id: 'xl1', nombre: 'VW XL1 2013', publicado: 0.189, estimado: 0.165, sinEl: 0.161, enAjuste: true },
    { id: 'unlitro', nombre: 'VW 1-Litro 2002', publicado: 0.159, estimado: 0.154, sinEl: 0.153, enAjuste: true },
    { id: 'szemission', nombre: 'SZEmission', publicado: 0.1365, estimado: 0.134, sinEl: 0.133, enAjuste: true },
  ] as { id: string; nombre: string; publicado: number; estimado: number; sinEl: number; enAjuste: boolean }[],
};
