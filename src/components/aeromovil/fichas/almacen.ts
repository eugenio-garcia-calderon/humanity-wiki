// The records of the components of the vehicle on screen (2026-11-24): loaded once per vehicle family, edited in place,
// saved by themselves a moment after the last keystroke. Server side: src/server/aeromovilFichas.ts (one JSON document per
// family and component path, optimistic `version`). Same shape as `notas/almacen.ts`: a module-level store read with
// `useSyncExternalStore`, so the hover label, the panel and the page see the same data without passing it around.
import { useMemo, useSyncExternalStore } from 'react';
import type { Adjunto } from '../proveedores/datos';
import { enlaceSeguro } from '../proveedores/datos';

export interface AlternativaFicha { nombre: string; nota?: string; url?: string; eur?: number }
/** What the server keeps of one component (weight, price and supplier of its parts stay in the design). */
export interface FichaValor {
  /** The internal number the engineer gave it («Interior 1»); empty: the registry's own (`numeroPorDefecto`). */
  numero?: string;
  /** What it is, in the engineer's words; empty: the registry's `queEs`. */
  caracteristicas?: string;
  /** Units in hand. */
  stock?: number;
  alternativas?: AlternativaFicha[];
  imagenes?: Adjunto[];
  documentos?: Adjunto[];
  notas?: string;
}
export type EstadoGuardado = 'quieto' | 'pendiente' | 'guardando' | 'guardado' | 'error' | 'conflicto';

export const MAX_TEXTO_FICHA = 3000;
export const MAX_ALTERNATIVAS = 20;
export const MAX_ARCHIVOS_FICHA = 12;
const ESPERA_MS = 900;

interface Reg { valor: FichaValor; version: number; actualizado: string | null; por: string | null }

let vehiculo: string | null = null;
let carga: 'sin' | 'cargando' | 'listo' | 'error' = 'sin';
let pedido = 0;
let datos = new Map<string, Reg>();
const guardado = new Map<string, { estado: EstadoGuardado; mensaje?: string }>();
const temporizadores = new Map<string, ReturnType<typeof setTimeout>>();
const enCurso = new Set<string>();
const sucio = new Set<string>();
let v = 0;
const subs = new Set<() => void>();
const avisar = () => { v++; subs.forEach(f => f()); };
const suscribir = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

async function recargar() {
  const n = ++pedido, de = vehiculo;
  datos = new Map(); guardado.clear();
  if (!de) { carga = 'sin'; avisar(); return; }
  carga = 'cargando'; avisar();
  try {
    const r = await fetch(`/api/aeromovil/fichas?vehiculo=${encodeURIComponent(de)}`, { credentials: 'include' });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    if (n !== pedido) return;
    for (const [clave, x] of Object.entries<any>(j?.claves ?? {})) datos.set(clave, { valor: x.valor ?? {}, version: Number(x.version) || 1, actualizado: x.actualizado ?? null, por: x.por ?? null });
    carga = 'listo';
  } catch {
    if (n !== pedido) return;
    carga = 'error';
  }
  avisar();
}

/** The family whose components are on screen (`Parametros.disposicion`), or undefined for a vehicle with no records. */
export function ponerVehiculoFichas(nuevo: string | undefined) {
  const x = nuevo || null;
  if (x === vehiculo) return;
  for (const t of temporizadores.values()) clearTimeout(t);
  temporizadores.clear(); sucio.clear();
  vehiculo = x; void recargar();
}

/** Drops what cannot be stored: empty texts, blank alternatives, unsafe links, wrong types. Sent as is, kept as is. */
export function limpiarFicha(f: FichaValor): FichaValor {
  const o: FichaValor = {};
  const t = (s: unknown, max = MAX_TEXTO_FICHA) => (typeof s === 'string' ? s.slice(0, max) : '');
  if (t(f.numero, 40).trim()) o.numero = t(f.numero, 40);
  if (t(f.caracteristicas).trim()) o.caracteristicas = t(f.caracteristicas);
  if (t(f.notas).trim()) o.notas = t(f.notas);
  if (typeof f.stock === 'number' && Number.isFinite(f.stock) && f.stock >= 0) o.stock = Math.min(1_000_000, Math.round(f.stock));
  const alts = (f.alternativas ?? []).filter(a => t(a?.nombre, 120).trim()).slice(0, MAX_ALTERNATIVAS).map(a => {
    const r: AlternativaFicha = { nombre: t(a.nombre, 120) };
    if (t(a.nota, 400).trim()) r.nota = t(a.nota, 400);
    if (a.url && enlaceSeguro(a.url)) r.url = t(a.url, 500).trim();
    if (typeof a.eur === 'number' && Number.isFinite(a.eur) && a.eur >= 0) r.eur = Math.round(a.eur * 100) / 100;
    return r;
  });
  if (alts.length) o.alternativas = alts;
  if (f.imagenes?.length) o.imagenes = f.imagenes.slice(0, MAX_ARCHIVOS_FICHA);
  if (f.documentos?.length) o.documentos = f.documentos.slice(0, MAX_ARCHIVOS_FICHA);
  return o;
}

function poner(clave: string, estado: EstadoGuardado, mensaje?: string) { guardado.set(clave, { estado, mensaje }); avisar(); }

async function enviar(clave: string) {
  temporizadores.delete(clave);
  if (enCurso.has(clave)) { sucio.add(clave); return; }
  const de = vehiculo, reg = datos.get(clave);
  if (!de || !reg) return;
  enCurso.add(clave); poner(clave, 'guardando');
  try {
    const r = await fetch('/api/aeromovil/fichas', {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehiculo: de, clave, valor: limpiarFicha(reg.valor), version: reg.version }),
    });
    const j = await r.json().catch(() => ({}));
    if (de !== vehiculo) return;
    // the record may have been edited while the request was in the air: the NEW object takes the version
    if (r.ok) { const act = datos.get(clave); if (act) { act.version = j.version; act.actualizado = j.actualizado ?? null; } poner(clave, sucio.has(clave) ? 'pendiente' : 'guardado'); }
    else if (r.status === 409 && j.actual) { datos.set(clave, { valor: j.actual.valor ?? {}, version: j.actual.version, actualizado: null, por: null }); sucio.delete(clave); poner(clave, 'conflicto', j.error); }
    else { sucio.delete(clave); poner(clave, 'error', j.error || 'No se ha podido guardar la ficha.'); }
  } catch {
    sucio.delete(clave); poner(clave, 'error', 'Sin conexión: no se ha guardado. Sigue escribiendo y se intentará de nuevo.');
  } finally {
    enCurso.delete(clave);
    if (sucio.delete(clave) && de === vehiculo) void enviar(clave);
  }
}

/** Changes a record here at once and saves it a moment after the last change. */
export function cambiarFicha(clave: string, cambio: Partial<FichaValor> | ((antes: FichaValor) => FichaValor)) {
  const antes = datos.get(clave) ?? { valor: {}, version: 0, actualizado: null, por: null };
  const valor = typeof cambio === 'function' ? cambio(antes.valor) : { ...antes.valor, ...cambio };
  datos.set(clave, { ...antes, valor });
  const t = temporizadores.get(clave); if (t) clearTimeout(t);
  temporizadores.set(clave, setTimeout(() => void enviar(clave), ESPERA_MS));
  poner(clave, 'pendiente');
}

/** The records of the vehicle on screen: `leer(clave)` is always an object; `estado(clave)` says how its saving goes. */
export function useFichas() {
  const n = useSyncExternalStore(suscribir, () => v, () => v);
  return useMemo(() => {
    void n;
    return {
      carga,
      leer: (clave: string): FichaValor => datos.get(clave)?.valor ?? {},
      registro: (clave: string) => datos.get(clave) ?? null,
      estado: (clave: string) => guardado.get(clave) ?? { estado: 'quieto' as EstadoGuardado, mensaje: undefined },
    };
  }, [n]);
}
