// The client store of the pedal cycle's file (2026-11-24): one JSON document per key on the server
// (`src/server/aeromovilExpediente.ts`), kept here while the page is open. Nothing is kept in localStorage: the server
// is the only copy, so there is no stale local copy that could outlive a fix (root CLAUDE.md).
//
// Saving: every change updates the local value at once (the page never waits) and is sent a second after the last
// keystroke, one request at a time per key, with the `version` that was read. The server answers 409 when somebody else
// saved that key meanwhile (another tab, an AI session): then the newer value replaces the local one and the page says so.
// Changes that could not be sent stay marked and are retried; closing the tab with some unsent asks first.
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { OBLIGACIONES, claveObligacion } from './catalogo';
import { ENSAYOS } from './ensayos';
import { DOCUMENTOS } from './documentos';
import { FABRICANTE_VACIO, type DocGuardado, type EnsayoGuardado, type Fabricante, type ObligacionGuardada } from './tipos';
import type { Estados } from './progreso';

interface Entrada { valor: any; version: number; sucio: boolean; enVuelo: boolean }
export type EstadoCarga = 'inactivo' | 'cargando' | 'listo' | 'sinAcceso' | 'error';

const entradas = new Map<string, Entrada>();
const temporizadores = new Map<string, ReturnType<typeof setTimeout>>();
const oyentes = new Set<() => void>();
let carga: EstadoCarga = 'inactivo';
let mensaje: string | null = null;
let aviso: string | null = null;
let instantanea = { v: 0 };
const avisar = () => { instantanea = { v: instantanea.v + 1 }; oyentes.forEach(f => f()); };
const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };

export const pendientes = () => [...entradas.values()].filter(e => e.sucio).length;

async function respuesta(r: Response): Promise<any> { return r.json().catch(() => ({})); }

/** Reads every key. Safe to call again: a key with unsent changes keeps the local value. */
export async function cargar(): Promise<void> {
  carga = 'cargando'; mensaje = null; avisar();
  try {
    const r = await fetch('/api/aeromovil/expediente', { credentials: 'include', cache: 'no-store' });
    const j = await respuesta(r);
    if (r.status === 401 || r.status === 403) { carga = 'sinAcceso'; mensaje = j?.error || 'El expediente es del dueño del Aeromóvil.'; avisar(); return; }
    if (!r.ok) { carga = 'error'; mensaje = j?.error || 'No se ha podido leer el expediente.'; avisar(); return; }
    for (const [clave, x] of Object.entries<any>(j.claves ?? {})) {
      const e = entradas.get(clave);
      if (e?.sucio || e?.enVuelo) { e.version = x.version; continue; }   // never overwrite what the engineer just typed
      entradas.set(clave, { valor: x.valor, version: x.version, sucio: false, enVuelo: false });
    }
    carga = 'listo'; avisar();
  } catch {
    carga = 'error'; mensaje = 'Sin conexión con el servidor. Prueba otra vez en un momento.'; avisar();
  }
}

export const leer = <T,>(clave: string, vacio: T): T => (entradas.get(clave)?.valor as T | undefined) ?? vacio;

/** Applies `f` to the local value (immutably: return a new object) and schedules the save. */
export function cambiar<T>(clave: string, vacio: T, f: (v: T) => T): void {
  const e = entradas.get(clave);
  const nuevo = f(e?.valor ?? vacio);
  entradas.set(clave, { valor: nuevo, version: e?.version ?? 0, sucio: true, enVuelo: e?.enVuelo ?? false });
  programar(clave, 1000);
  avisar();
}

function programar(clave: string, ms: number) {
  const t = temporizadores.get(clave); if (t) clearTimeout(t);
  temporizadores.set(clave, setTimeout(() => { temporizadores.delete(clave); void guardar(clave); }, ms));
}

async function guardar(clave: string): Promise<void> {
  const e = entradas.get(clave);
  if (!e || !e.sucio) return;
  if (e.enVuelo) { programar(clave, 400); return; }
  e.enVuelo = true;
  const enviado = e.valor;
  try {
    const r = await fetch(`/api/aeromovil/expediente/${encodeURIComponent(clave)}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valor: enviado, version: e.version }),
    });
    const j = await respuesta(r);
    const ahora = entradas.get(clave)!;
    ahora.enVuelo = false;
    if (r.ok) {
      ahora.version = j.version; aviso = null;
      if (ahora.valor === enviado) ahora.sucio = false; else programar(clave, 400);   // typed while it was travelling
    } else if (r.status === 409) {
      if (j.actual) { ahora.valor = j.actual.valor; ahora.version = j.actual.version; }
      ahora.sucio = false;
      aviso = j.error || 'Alguien ha cambiado esto mientras lo editabas. Se ha cargado la versión nueva.';
    } else if (r.status === 429) {
      aviso = j.error || 'Demasiados guardados seguidos.';
      programar(clave, (Number(r.headers.get('Retry-After')) || 30) * 1000 + 1000);
    } else if (r.status === 401 || r.status === 403) {
      aviso = j.error || 'Ya no tienes permiso para guardar el expediente.';
    } else {
      aviso = `${j?.error || 'No se ha podido guardar.'} Tus cambios siguen aquí y se reintentan solos.`;
      programar(clave, 8000);
    }
  } catch {
    const ahora = entradas.get(clave); if (ahora) ahora.enVuelo = false;
    aviso = 'Sin conexión: tus cambios siguen aquí y se guardarán en cuanto vuelva.';
    programar(clave, 8000);
  }
  avisar();
}

/** Sends everything unsent now (leaving the page, pressing «Guardar»). */
export function guardarYa() {
  for (const [clave, e] of entradas) if (e.sucio) { const t = temporizadores.get(clave); if (t) clearTimeout(t); temporizadores.delete(clave); void guardar(clave); }
}
export const cerrarAviso = () => { aviso = null; avisar(); };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', ev => { if (pendientes() > 0) { guardarYa(); ev.preventDefault(); ev.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarYa(); });
}

/** Everything stored, parsed with its defaults, for `progreso.ts`. */
export function estadosActuales(): Estados {
  const obligaciones: Estados['obligaciones'] = {};
  for (const o of OBLIGACIONES) { const v = entradas.get(claveObligacion(o.id))?.valor as ObligacionGuardada | undefined; if (v) obligaciones[o.id] = { ...v, huecos: v.huecos ?? {} }; }
  const ensayos: Estados['ensayos'] = {}; for (const e of ENSAYOS) ensayos[e.id] = entradas.get(`ensayo-${e.id}`)?.valor as EnsayoGuardado | undefined;
  const docs: Estados['docs'] = {}; for (const d of DOCUMENTOS) docs[d.id] = entradas.get(`doc-${d.id}`)?.valor as DocGuardado | undefined;
  return { fab: { ...FABRICANTE_VACIO, ...(entradas.get('fabricante')?.valor as Partial<Fabricante> | undefined) }, obligaciones, ensayos, docs };
}

export const OBLIGACION_VACIA = (): ObligacionGuardada => ({ huecos: {} });
export const claveEnsayo = (id: string) => `ensayo-${id}`;
export const claveDoc = (id: string) => `doc-${id}`;
export const CLAVE_FABRICANTE = 'fabricante';

/** For the page: re-renders on every change; loads the file once when `activo` (the owner or an admin is looking). */
export function useExpediente(activo: boolean) {
  const snap = useSyncExternalStore(suscribir, () => instantanea);
  useEffect(() => { if (activo && carga === 'inactivo') void cargar(); }, [activo]);
  const estados = useMemo(() => estadosActuales(), [snap]); // eslint-disable-line react-hooks/exhaustive-deps
  return { carga, mensaje, aviso, pendientes: pendientes(), estados, recargar: cargar };
}
