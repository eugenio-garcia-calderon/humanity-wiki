import { useEffect, useMemo, useState } from 'react';
import { calcularTunel, claveTunel, type CantidadLineas, type PeticionTunel, type ResultadoTunel } from './calculo';
import { peticionDe, type CuerpoTunel } from './nuestro';
import type { Resolucion } from './malla';
import type { Parametros } from '../geometria';

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
/** What «Probar» gets back: the tunnel on the modified copy, its reference area (the editor's frontal area; the Bala's body section) and the editor's Cd for it (none for the Bala). */
export interface ResultadoPrueba { R: ResultadoTunel; A: number; cdEditor: number; msModelo: number; msTotal: number }
const pruebas = new Map<string, ResultadoPrueba>();
const esperandoPrueba = new Map<string, Promise<ResultadoPrueba | null>>();
type Trabajo = { clave: string; prioridad: number; peticion?: PeticionTunel; prueba?: { P: Parametros; resolucion: Resolucion }; resolver: (r: any) => void; t0?: number };
const cola: Trabajo[] = [];
let trabajador: Worker | null | undefined;
let ocupado: Trabajo | null = null, numero = 0;
const avisos = new Set<() => void>();

function obtenerTrabajador(): Worker | null {
  if (trabajador !== undefined) return trabajador;
  try {
    trabajador = new Worker(new URL('./tunel.worker.ts', import.meta.url), { type: 'module' });
    trabajador.onmessage = (e: MessageEvent<{ n: number; resultado?: ResultadoTunel; prueba?: Omit<ResultadoPrueba, 'msTotal'>; error?: string }>) => terminar(e.data.resultado ?? e.data.prueba ?? null, e.data.error);
    trabajador.onerror = e => { console.error('[túnel] el trabajador falló:', e.message); trabajador?.terminate(); trabajador = null; terminar(null, e.message); };
  } catch (e) {
    console.warn('[túnel] sin Web Worker; se calcula en el hilo principal', e);
    trabajador = null;
  }
  return trabajador;
}

function terminar(r: ResultadoTunel | Omit<ResultadoPrueba, 'msTotal'> | null, error?: string) {
  const t = ocupado; ocupado = null;
  if (t) {
    if (!r) console.error(`[túnel] no se pudo calcular «${t.peticion?.id ?? 'prueba'}»:`, error);
    if (t.prueba) {
      const out = r ? { ...(r as Omit<ResultadoPrueba, 'msTotal'>), msTotal: performance.now() - (t.t0 ?? 0) } : null;
      if (out) { pruebas.set(t.clave, out); if (pruebas.size > 60) pruebas.delete(pruebas.keys().next().value!); }
      esperandoPrueba.delete(t.clave); t.resolver(out);
    } else {
      if (r) { cache.set(t.clave, r as ResultadoTunel); if (cache.size > 40) cache.delete(cache.keys().next().value!); }
      esperando.delete(t.clave); t.resolver(r);
    }
  }
  avisos.forEach(f => f());
  siguiente();
}

function siguiente() {
  if (ocupado || !cola.length) return;
  cola.sort((a, b) => a.prioridad - b.prioridad);
  ocupado = cola.shift()!;
  ocupado.t0 = performance.now();
  const w = obtenerTrabajador();
  if (w) w.postMessage({ n: ++numero, peticion: ocupado.peticion, prueba: ocupado.prueba });
  else {
    // Without a worker the calculation blocks the page for a moment: one body per tick.
    const t = ocupado;
    setTimeout(async () => {
      try {
        if (t.prueba) {
          const g = await import('../geometria'), nu = await import('./nuestro');
          const m = g.crearModelo(g.ajustarCarenado(t.prueba.P)), res = g.calcular(m, g.areas(m));
          const c = nu.cuerpoAeromovil(m, res.A);
          terminar({ R: calcularTunel({ ...nu.peticionDe(c, t.prueba.resolucion, 'pocas'), soloNumeros: true }), A: c.area, cdEditor: res.Cd, msModelo: 0 });
        } else terminar(calcularTunel(t.peticion!));
      } catch (e) { terminar(null, String(e)); }
    }, 30);
  }
}

/**
 * «Probar»: the tunnel on a modified COPY of the design's parameters (numbers only).
 * It never writes the parameters: the visitor's design, and what is saved, stay as they are.
 */
export function probarParametros(P: Parametros, resolucion: Resolucion): Promise<ResultadoPrueba | null> {
  const clave = `prueba:${resolucion}:${JSON.stringify(P)}`;
  const hecho = pruebas.get(clave); if (hecho) return Promise.resolve(hecho);
  const ya = esperandoPrueba.get(clave); if (ya) return ya;
  // the visitor asked for it: before the garage cars still waiting
  const p = new Promise<ResultadoPrueba | null>(resolver => { cola.push({ clave, prueba: { P, resolucion }, prioridad: -1, resolver }); });
  esperandoPrueba.set(clave, p);
  siguiente();
  return p;
}

/** The result for a body, from the cache or computed. A queued request for the same body with an older shape is dropped. */
export function pedirTunel(peticion: PeticionTunel, prioridad: number): Promise<ResultadoTunel | null> {
  const clave = claveTunel(peticion);
  const hecho = cache.get(clave); if (hecho) return Promise.resolve(hecho);
  const ya = esperando.get(clave); if (ya) return ya;
  // the same body with another shape or other options still waiting in the queue: it is stale
  for (let i = cola.length - 1; i >= 0; i--) if (cola[i].peticion?.id === peticion.id) {
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
