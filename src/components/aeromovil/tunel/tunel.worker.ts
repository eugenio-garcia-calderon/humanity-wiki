/// <reference lib="webworker" />
import { calcularTunel, type PeticionTunel } from './calculo';

/**
 * The tunnel's Web Worker: one body at a time, off the main thread, so the 3D
 * view keeps turning while the panel method solves (0.5–3 s per body).
 * The cache lives in `cliente.ts`; the typed arrays are transferred, not copied.
 */
self.onmessage = (e: MessageEvent<{ n: number; peticion: PeticionTunel }>) => {
  const { n, peticion } = e.data;
  try {
    const r = calcularTunel(peticion);
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ n, resultado: r }, [r.piel.nodos.buffer, r.piel.cp.buffer, r.lineas.p.buffer, r.lineas.v.buffer, r.lineas.inicio.buffer, r.lineas.centro.buffer]);
  } catch (err) {
    (self as unknown as DedicatedWorkerGlobalScope).postMessage({ n, error: String((err as Error)?.message ?? err) });
  }
};
