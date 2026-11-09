import { vehiculoGaraje } from '../garaje';
import { RUEDAS_GARAJE } from './arrastre';
import { areaSuperelipse, funcionSeccion } from './malla';
import type { CuerpoTunel } from './nuestro';

/**
 * The bodies that go through the tunnel: our design (tunel/nuestro.ts, pure, so
 * the worker can build it) and the garage cars, with what the calculation needs
 * (silhouette, section shape, reference area, wheels, axles) and where they stand.
 */
export { cuerpoAeromovil, envolventeModelo, peticionDe, type CuerpoTunel } from './nuestro';

/** A garage car, if it has a silhouette. Without a published area, the silhouette's largest section. */
export function cuerpoGaraje(v: { id: string; x: number; z: number; giro?: number }): CuerpoTunel | null {
  const d = vehiculoGaraje(v.id);
  if (!d?.envolvente) return null;
  const n = d.seccion ?? 3;
  let area = d.aero?.area ?? 0, fuenteArea = 'área frontal publicada o medida en su modelo';
  if (!area) {
    const { seccion, xMorro, xCola } = funcionSeccion(d.envolvente);
    for (let k = 0; k <= 200; k++) { const s = seccion(xMorro + (xCola - xMorro) * k / 200); area = Math.max(area, areaSuperelipse(s.a, s.b, n)); }
    fuenteArea = 'sección mayor de su silueta (no hay área publicada)';
  }
  return {
    id: d.id, nombre: d.nombre, x: v.x, z: v.z, giro: v.giro ?? 0, envolvente: d.envolvente, n,
    area, fuenteArea, ruedas: RUEDAS_GARAJE[d.id]?.ruedas ?? [], ejes: [0, -d.batalla], cdPublicado: d.aero?.cd,
  };
}
