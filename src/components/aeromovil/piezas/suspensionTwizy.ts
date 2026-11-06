import * as THREE from 'three';
import type { VehiculoGaraje } from '../garaje/tipos';

/**
 * Suspensión y frenos del Renault Twizy, pieza a pieza (pendiente: lo modela un
 * bot, 2026-11-06). `construirEsquina` devuelve una esquina completa (mangueta,
 * buje, disco, pinza, brazo, columna McPherson, bieleta…) con el centro de la
 * rueda en el origen, X hacia delante, Y arriba, Z hacia fuera del coche.
 */
export interface OpcionesEsquina { delantera: boolean; lado: 1 | -1; rRueda: number }
export function construirEsquina(_o: OpcionesEsquina): THREE.Group {
  return new THREE.Group();
}
/** Para verla sola en el visor (`?garaje=suspension-twizy`): las cuatro esquinas sobre un bastidor de referencia. */
export const VEHICULO: VehiculoGaraje = {
  id: 'suspension-twizy', nombre: 'Suspensión del Twizy (pieza a pieza)', largo: 2.34, ancho: 1.24, alto: 0.6, batalla: 1.69, fuente: 'Renault Twizy: batalla 1 686 mm, vías 1 094/1 080 mm',
  construir: () => {
    const g = new THREE.Group();
    for (const [x, del] of [[0, true], [-1.686, false]] as [number, boolean][]) for (const s of [1, -1] as (1 | -1)[]) {
      const e = construirEsquina({ delantera: del, lado: s, rRueda: 0.265 }); e.position.set(x, 0.265, s * 0.547); e.scale.z = s; g.add(e);
    }
    return g;
  },
};
