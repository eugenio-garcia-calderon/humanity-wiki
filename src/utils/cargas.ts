import { useSyncExternalStore } from 'react';
import { subirArchivo } from './subir';

// ============================================================================
// EL GESTOR DE CARGAS (2026-10-18, Eugenio)
// ============================================================================
// «Que cuando se sube un vídeo o una imagen que tarda, te puedas ir de esa
// página y el proceso no se interrumpa; y que abajo salga un gestor de carga
// con el porcentaje mientras sigues navegando y subiendo otras cosas.»
//
// Antes la subida vivía dentro del editor (`Documento.tsx`): al salir de la
// página, el componente desaparecía y, aunque el navegador terminara de
// mandar el archivo, nadie lo ponía en la página. Ahora vive aquí, fuera de
// React, y sobrevive a cualquier cambio de página dentro de la aplicación.
//
// Al terminar, el archivo va a su sitio por uno de dos caminos:
//   · si la página está abierta, su editor (el «receptor» que registra) lo
//     pone él mismo, como siempre: se ve al momento y entra en su guardado;
//   · si no, se escribe en el servidor: se lee la página, se pone la portada o
//     la dirección del bloque y se guarda con su `version_base` (reintentando
//     si alguien guardó entretanto).
// Recargar la pestaña sí corta la subida (el navegador la mata): por eso,
// mientras hay alguna en marcha, el navegador pregunta antes de salir.

export type DestinoCarga = { tipo: 'portada' } | { tipo: 'bloque'; id: string };
export type ResultadoCarga = { url: string; bytes?: number };

export interface Carga {
  id: string;
  nombre: string;
  bytes: number;
  paginaId: string;
  destino: DestinoCarga;
  /** La foto en local, para enseñarla mientras sube. */
  vista: string | null;
  fraccion: number;
  estado: 'subiendo' | 'hecha' | 'fallo';
  error?: string;
}

type Receptor = (destino: DestinoCarga, r: { ok: true; resultado: ResultadoCarga } | { ok: false; error: string }) => void;

let cargas: Carga[] = [];
const oyentes = new Set<() => void>();
const receptores = new Map<string, Receptor>();
let n = 0;

const avisar = () => { cargas = [...cargas]; oyentes.forEach(f => f()); vigilarSalida(); };
const cambiar = (id: string, c: Partial<Carga>) => { cargas = cargas.map(x => (x.id === id ? { ...x, ...c } : x)); avisar(); };

export const claveDestino = (d: DestinoCarga) => (d.tipo === 'portada' ? 'portada' : d.id);

/** El editor de una página dice «yo me encargo de lo que acabe aquí». Devuelve cómo darse de baja. */
export function registrarReceptor(paginaId: string, fn: Receptor) {
  receptores.set(paginaId, fn);
  return () => { if (receptores.get(paginaId) === fn) receptores.delete(paginaId); };
}

/** Empieza una subida. No espera: el resultado llega al receptor o al servidor. */
export function iniciarCarga(archivo: File, paginaId: string, destino: DestinoCarga) {
  const id = `C${Date.now().toString(36)}${(n++).toString(36)}`;
  const vista = archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null;
  cargas = [...cargas, { id, nombre: archivo.name || 'archivo', bytes: archivo.size, paginaId, destino, vista, fraccion: 0, estado: 'subiendo' }];
  avisar();
  (async () => {
    let r: { ok: true; resultado: ResultadoCarga } | { ok: false; error: string };
    try {
      const sub = await subirArchivo(archivo, undefined, f => cambiar(id, { fraccion: f }));
      r = sub.error || !sub.url ? { ok: false, error: sub.error || 'No se ha podido subir el archivo.' } : { ok: true, resultado: { url: sub.url, bytes: sub.bytes } };
    } catch (e: any) {
      r = { ok: false, error: e?.message || 'No se ha podido subir el archivo.' };
    }
    const receptor = receptores.get(paginaId);
    if (receptor) receptor(destino, r);
    else if (r.ok) {
      const puesto = await ponerEnServidor(paginaId, destino, r.resultado).catch(() => false);
      if (!puesto) r = { ok: false, error: 'Se subió, pero no he podido ponerlo en la página. Vuelve a abrirla y súbelo otra vez.' };
    }
    cambiar(id, r.ok ? { estado: 'hecha', fraccion: 1 } : { estado: 'fallo', error: (r as { error: string }).error });
    if (vista) setTimeout(() => URL.revokeObjectURL(vista), 8000);
    // Lo terminado se va solo a los pocos segundos; lo fallido se queda hasta que se cierre.
    if (r.ok) setTimeout(() => quitarCarga(id), 5000);
  })();
  return id;
}

export function quitarCarga(id: string) {
  cargas = cargas.filter(x => x.id !== id);
  avisar();
}

/** Pone la portada o la dirección de un bloque en la página guardada. */
async function ponerEnServidor(paginaId: string, destino: DestinoCarga, res: ResultadoCarga): Promise<boolean> {
  for (let intento = 0; intento < 4; intento++) {
    const g = await fetch(`/api/windows/${paginaId}`, { credentials: 'include' });
    if (!g.ok) return false;
    const w = await g.json();
    const config = { ...(w.config || {}) };
    if (destino.tipo === 'portada') config.portada = res.url;
    else if (!ponerEnBloque(config.bloques, destino.id, res)) return false;
    const p = await fetch(`/api/windows/${paginaId}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, version_base: w.version ?? null }),
    });
    if (p.ok) return true;
    if (p.status !== 409) return false;
  }
  return false;
}

/** Busca el bloque por su id en el árbol (los bloques pueden ir dentro de columnas o de otros). */
function ponerEnBloque(nodo: any, id: string, res: ResultadoCarga): boolean {
  if (Array.isArray(nodo)) return nodo.some(x => ponerEnBloque(x, id, res));
  if (!nodo || typeof nodo !== 'object') return false;
  if (nodo.id === id && typeof nodo.tipo === 'string') {
    nodo.url = res.url;
    if (res.bytes) nodo.medioBytes = res.bytes;
    return true;
  }
  return Object.values(nodo).some(v => typeof v === 'object' && ponerEnBloque(v, id, res));
}

// ── Recargar o cerrar con una subida en marcha la corta: se pregunta antes. ──
let vigilando = false;
const alSalir = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
function vigilarSalida() {
  const hay = cargas.some(c => c.estado === 'subiendo');
  if (hay && !vigilando) { window.addEventListener('beforeunload', alSalir); vigilando = true; }
  if (!hay && vigilando) { window.removeEventListener('beforeunload', alSalir); vigilando = false; }
}

const suscribir = (f: () => void) => { oyentes.add(f); return () => { oyentes.delete(f); }; };
const leer = () => cargas;

/** Todas las cargas, al día. */
export function useCargas(): Carga[] {
  return useSyncExternalStore(suscribir, leer, leer);
}
