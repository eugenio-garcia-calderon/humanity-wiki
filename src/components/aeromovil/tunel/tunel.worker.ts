/// <reference lib="webworker" />
import { calcularTunel, type PeticionTunel } from './calculo';
import { ajustarCarenado, areas, calcular, crearModelo, type Parametros } from '../geometria';
import { cuerpoAeromovil, peticionDe } from './nuestro';
import type { Resolucion } from './malla';

/**
 * The tunnel's Web Worker: one body at a time, off the main thread, so the 3D
 * view keeps turning while the panel method solves (0.5–3 s per body).
 * The cache lives in `cliente.ts`; the typed arrays are transferred, not copied.
 *
 * «Probar» (2026-11-09): a modified COPY of the design's parameters is turned
 * into a model, a silhouette and a tunnel run here, numbers only. Nothing is
 * saved and the visitor's design is not touched.
 */
const yo = self as unknown as DedicatedWorkerGlobalScope;
self.onmessage = (e: MessageEvent<{ n: number; peticion?: PeticionTunel; prueba?: { P: Parametros; resolucion: Resolucion } }>) => {
  const { n, peticion, prueba } = e.data;
  try {
    if (prueba) {
      const t0 = performance.now();
      const m = crearModelo(ajustarCarenado(prueba.P)), res = calcular(m, areas(m));
      const t1 = performance.now();
      // A: the tunnel body's reference area (the editor's frontal area, except on the Bala, whose tunnel sees its body only)
      const c = cuerpoAeromovil(m, res.A), R = calcularTunel({ ...peticionDe(c, prueba.resolucion, 'pocas'), soloNumeros: true });
      yo.postMessage({ n, prueba: { R, A: c.area, cdEditor: res.Cd, msModelo: t1 - t0 } });
      return;
    }
    const r = calcularTunel(peticion!);
    yo.postMessage({ n, resultado: r }, [r.piel.nodos.buffer, r.piel.cp.buffer, r.lineas.p.buffer, r.lineas.v.buffer, r.lineas.inicio.buffer, r.lineas.centro.buffer]);
  } catch (err) {
    yo.postMessage({ n, error: String((err as Error)?.message ?? err) });
  }
};
