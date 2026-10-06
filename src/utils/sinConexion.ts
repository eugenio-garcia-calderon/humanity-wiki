import { useEffect, useState } from 'react';
import { aplanar, aArbol, type Bloque } from './bloques';
import { fusionarBloques } from './colaboracion';

// ============================================================================
// EDITAR SIN CONEXIÓN (2026-10-06, carril «espacio», #33)
// ============================================================================
// El service worker (`public/sw.js`) ya deja LEER tus páginas sin red. Esto
// completa la otra mitad: ESCRIBIRLAS. El editor sigue funcionando, y lo que
// no ha podido enviarse se guarda en IndexedDB —un borrador por página— hasta
// que vuelve la red.
//
// ── CÓMO SE ENVÍA AL VOLVER ─────────────────────────────────────────────────
//   · Si la página está ABIERTA en el editor, es el propio editor quien
//     reenvía (`Documento.tsx`, al oír `online`): sigue su camino de siempre,
//     con su `version_base` y su fusión si alguien guardó entretanto.
//   · Si NO está abierta (cerraste la pestaña sin red, o recargaste), la manda
//     `enviarPendientes()` desde aquí —al volver la red, al arrancar y cada
//     30 s mientras quede algo— con la MISMA regla de conflictos del editor: se
//     envía con `version_base`; si el servidor contesta 409 (alguien guardó
//     entretanto) se hace la fusión de tres vías bloque a bloque
//     (`fusionarBloques`) entre lo que había al abrir (`base`), lo tuyo y lo
//     que hay ahora, y se reenvía. Nada de lo de la otra persona se pierde.
//   · Al REABRIR una página con borrador pendiente, el editor lo recupera y
//     lo fusiona con lo último del servidor antes de enseñártelo (si no, abrir
//     la página te enseñaría lo de antes y tu trabajo parecería perdido).
//
// ── LO QUE NO SE HACE, Y SE DICE ────────────────────────────────────────────
//   · Solo el TEXTO y los ajustes de la página. Subir una imagen o un archivo,
//     escribir en una base de datos, crear una página o comentar necesitan
//     red y fallan con su aviso de siempre.
//   · No se crea una página nueva sin conexión (hace falta que el servidor le
//     dé identidad).
//   · Un borrador al que el servidor responde 403/404 (te quitaron el acceso,
//     o se borró la página) NO se tira: se marca con su error y se avisa, por
//     si quieres copiar el texto.
//   · Sin IndexedDB (modo privado de algún navegador) se usa localStorage, y
//     si tampoco hay, el borrador vive en memoria mientras no cierres la pestaña.

export interface Borrador {
  pageId: string;
  titulo: string;
  /** El cuerpo de `config` tal como lo manda el editor (con `bloques` en árbol). */
  config: any;
  /** La versión del servidor con la que se partía. */
  versionBase: number | null;
  /** La página, en lista plana, tal como estaba al abrirla o guardarla (BASE de la fusión). */
  base: Bloque[];
  guardadoEn: number;
  /** Si el servidor lo rechazó (403/404): el motivo. */
  error?: string;
}

const BD = 'humanity-sinconexion';
const ALMACEN = 'borradores';
const CLAVE_LS = 'humanity:borrador:';
const memoria = new Map<string, Borrador>();

const avisar = () => { try { window.dispatchEvent(new CustomEvent('humanity:borradores')); } catch { /* sin ventana */ } };

function abrir(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const r = indexedDB.open(BD, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(ALMACEN, { keyPath: 'pageId' }); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}

const envolver = <T,>(req: IDBRequest<T>): Promise<T | undefined> => new Promise(res => { req.onsuccess = () => res(req.result); req.onerror = () => res(undefined); });

export async function guardarBorrador(b: Borrador): Promise<void> {
  memoria.set(b.pageId, b);
  const db = await abrir();
  if (db) {
    try { await envolver(db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN).put(b)); db.close(); avisar(); return; } catch { /* a localStorage */ }
  }
  try { localStorage.setItem(CLAVE_LS + b.pageId, JSON.stringify(b)); } catch { /* queda en memoria */ }
  avisar();
}

export async function leerBorrador(pageId: string): Promise<Borrador | null> {
  const db = await abrir();
  if (db) {
    try { const x = await envolver(db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).get(pageId)); db.close(); if (x) return x as Borrador; } catch { /* sigue */ }
  }
  try { const s = localStorage.getItem(CLAVE_LS + pageId); if (s) return JSON.parse(s); } catch { /* sigue */ }
  return memoria.get(pageId) || null;
}

export async function borrarBorrador(pageId: string): Promise<void> {
  memoria.delete(pageId);
  try { localStorage.removeItem(CLAVE_LS + pageId); } catch { /* ok */ }
  const db = await abrir();
  if (db) { try { await envolver(db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN).delete(pageId)); db.close(); } catch { /* ok */ } }
  avisar();
}

export async function todosLosBorradores(): Promise<Borrador[]> {
  const out = new Map<string, Borrador>();
  const db = await abrir();
  if (db) {
    try { const l = await envolver(db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN).getAll()); db.close(); for (const b of (l || []) as Borrador[]) out.set(b.pageId, b); } catch { /* sigue */ }
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CLAVE_LS)) { const b = JSON.parse(localStorage.getItem(k) || 'null'); if (b?.pageId) out.set(b.pageId, b); }
    }
  } catch { /* ok */ }
  for (const [k, b] of memoria) if (!out.has(k)) out.set(k, b);
  return [...out.values()];
}

// ── Los editores abiertos mandan sobre sus propias páginas ──────────────────
const abiertos = new Map<string, number>();
export function registrarEditorAbierto(pageId: string): () => void {
  abiertos.set(pageId, (abiertos.get(pageId) || 0) + 1);
  return () => { const n = (abiertos.get(pageId) || 1) - 1; if (n <= 0) abiertos.delete(pageId); else abiertos.set(pageId, n); };
}

export const hayRed = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

type Resultado = 'ok' | 'red' | 'rechazada';

async function enviarBorrador(b: Borrador): Promise<Resultado> {
  const poner = (cuerpo: any) => fetch(`/api/windows/${b.pageId}`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
  }).catch(() => null);
  let r = await poner({ title: b.titulo, config: b.config, version_base: b.versionBase ?? undefined });
  if (!r) return 'red';
  if (r.status === 409) {
    const j = await r.json().catch(() => ({}));
    const suyo = aplanar(j.config?.bloques || []);
    const mio = aplanar(b.config?.bloques || []);
    const { bloques } = fusionarBloques(b.base || [], mio, suyo);
    r = await poner({ title: b.titulo, config: { ...b.config, bloques: aArbol(bloques) }, version_base: typeof j.version === 'number' ? j.version : undefined });
    if (!r) return 'red';
  }
  if (r.ok) { await borrarBorrador(b.pageId); return 'ok'; }
  if (r.status === 403 || r.status === 404) {
    const j = await r.json().catch(() => ({}));
    await guardarBorrador({ ...b, error: j.error || (r.status === 404 ? 'La página ya no existe.' : 'Ya no tienes permiso para editar esta página.') });
    return 'rechazada';
  }
  return 'red'; // 401 (sesión caducada), 5xx…: se reintenta más tarde
}

let enviando = false;
/** Manda los borradores de páginas que NO están abiertas en un editor. Devuelve cuántos se enviaron. */
export async function enviarPendientes(): Promise<number> {
  if (enviando || !hayRed()) return 0;
  enviando = true;
  let enviados = 0;
  try {
    for (const b of await todosLosBorradores()) {
      if (abiertos.has(b.pageId) || b.error) continue;
      if (await enviarBorrador(b) === 'ok') {
        enviados++;
        window.dispatchEvent(new CustomEvent('humanity:borrador-enviado', { detail: { pageId: b.pageId, titulo: b.titulo } }));
        window.dispatchEvent(new CustomEvent('humanity:menu-cambiado'));
      }
    }
  } finally { enviando = false; }
  return enviados;
}

/** Arranca el reenvío: al volver la red, al empezar y cada 30 s. Una sola vez. */
let iniciado = false;
export function iniciarSinConexion() {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  const intentar = () => { void enviarPendientes(); };
  window.addEventListener('online', intentar);
  setInterval(intentar, 30_000);
  setTimeout(intentar, 3000);
}

/** Estado para pintar avisos: sin red, y cuántas páginas esperan enviarse (o fueron rechazadas). */
export function useEstadoSinConexion() {
  const [red, setRed] = useState(hayRed());
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  useEffect(() => {
    const r = () => setRed(hayRed());
    let vivo = true;
    const leer = () => { void todosLosBorradores().then(l => { if (vivo) setBorradores(l); }); };
    window.addEventListener('online', r); window.addEventListener('offline', r);
    window.addEventListener('humanity:borradores', leer);
    leer();
    return () => { vivo = false; window.removeEventListener('online', r); window.removeEventListener('offline', r); window.removeEventListener('humanity:borradores', leer); };
  }, []);
  return { red, borradores };
}
