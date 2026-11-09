import { useEffect, useMemo, useState } from 'react';
import { calcularTunel, claveTunel, type CantidadLineas, type PeticionTunel, type ResultadoTunel } from './calculo';
import { peticionDe, type CuerpoTunel } from './cuerpos';
import type { Resolucion } from './malla';

/**
 * Main-thread side of the tunnel: one Web Worker, a queue (our design first,
 * then the garage cars in order) and a cache by silhouette, so closing and
 * opening the tunnel, moving a car or switching speed costs nothing.
 *
 * Both the 3D view and the card ask through here; the same request made twice
 * waits for the same answer.
 */

/** What the visitor chose in the card. `kmh` only moves the separation line and the wake. */
export interface OpcionesTunel {
  resolucion: Resolucion;
  lineas: CantidadLineas;
  piel: boolean; verLineas: boolean; criticos: boolean; estela: boolean; grafica: boolean;
  kmh: number;
}

/** The same test as `CALIDAD_ALTA` in Visor3D.tsx: a phone gets fewer panels and fewer lines. */
export const ES_ESCRITORIO = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches && !/Mobi|Android/i.test(navigator.userAgent);

export function opcionesPorDefecto(): OpcionesTunel {
  return { resolucion: ES_ESCRITORIO ? 'media' : 'baja', lineas: ES_ESCRITORIO ? 'normal' : 'pocas', piel: true, verLineas: true, criticos: true, estela: true, grafica: true, kmh: 80 };
}

const cache = new Map<string, ResultadoTunel>();
const esperando = new Map<string, Promise<ResultadoTunel | null>>();
type Trabajo = { clave: string; peticion: PeticionTunel; prioridad: number; resolver: (r: ResultadoTunel | null) => void };
const cola: Trabajo[] = [];
let trabajador: Worker | null | undefined;
let ocupado: Trabajo | null = null, numero = 0;
const avisos = new Set<() => void>();

function obtenerTrabajador(): Worker | null {
  if (trabajador !== undefined) return trabajador;
  try {
    trabajador = new Worker(new URL('./tunel.worker.ts', import.meta.url), { type: 'module' });
    trabajador.onmessage = (e: MessageEvent<{ n: number; resultado?: ResultadoTunel; error?: string }>) => terminar(e.data.resultado ?? null, e.data.error);
    trabajador.onerror = e => { console.error('[túnel] el trabajador falló:', e.message); trabajador?.terminate(); trabajador = null; terminar(null, e.message); };
  } catch (e) {
    console.warn('[túnel] sin Web Worker; se calcula en el hilo principal', e);
    trabajador = null;
  }
  return trabajador;
}

function terminar(r: ResultadoTunel | null, error?: string) {
  const t = ocupado; ocupado = null;
  if (t) {
    if (r) { cache.set(t.clave, r); if (cache.size > 40) cache.delete(cache.keys().next().value!); }
    else console.error(`[túnel] no se pudo calcular «${t.peticion.id}»:`, error);
    esperando.delete(t.clave); t.resolver(r);
  }
  avisos.forEach(f => f());
  siguiente();
}

function siguiente() {
  if (ocupado || !cola.length) return;
  cola.sort((a, b) => a.prioridad - b.prioridad);
  ocupado = cola.shift()!;
  const w = obtenerTrabajador();
  if (w) w.postMessage({ n: ++numero, peticion: ocupado.peticion });
  else {
    // Without a worker the calculation blocks the page for a moment: one body per tick.
    const t = ocupado;
    setTimeout(() => { try { terminar(calcularTunel(t.peticion)); } catch (e) { terminar(null, String(e)); } }, 30);
  }
}

/** The result for a body, from the cache or computed. A queued request for the same body with an older shape is dropped. */
export function pedirTunel(peticion: PeticionTunel, prioridad: number): Promise<ResultadoTunel | null> {
  const clave = claveTunel(peticion);
  const hecho = cache.get(clave); if (hecho) return Promise.resolve(hecho);
  const ya = esperando.get(clave); if (ya) return ya;
  // the same body with another shape or other options still waiting in the queue: it is stale
  for (let i = cola.length - 1; i >= 0; i--) if (cola[i].peticion.id === peticion.id) {
    const [viejo] = cola.splice(i, 1); esperando.delete(viejo.clave); viejo.resolver(null);
  }
  const p = new Promise<ResultadoTunel | null>(resolver => { cola.push({ clave, peticion, prioridad, resolver }); });
  esperando.set(clave, p);
  siguiente();
  return p;
}

export function resultadoEnCache(peticion: PeticionTunel): ResultadoTunel | undefined { return cache.get(claveTunel(peticion)); }

/** Results for a list of bodies, filled in as they arrive (undefined while computing). */
export function useResultadosTunel(cuerpos: CuerpoTunel[], resolucion: Resolucion, lineas: CantidadLineas) {
  const peticiones = useMemo(() => cuerpos.map(c => peticionDe(c, resolucion, lineas)), [cuerpos, resolucion, lineas]);
  const claves = peticiones.map(claveTunel).join('|');
  const [, setVersion] = useState(0);
  useEffect(() => {
    let vivo = true;
    peticiones.forEach((p, i) => { pedirTunel(p, i).then(() => { if (vivo) setVersion(v => v + 1); }); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claves]);
  const out: Record<string, ResultadoTunel | undefined> = {};
  for (const p of peticiones) out[p.id] = cache.get(claveTunel(p));
  return out;
}
