/**
 * Notes per section («desplegable») of the Aeromóvil (2026-11-17). Eugenio: «permite añadir un comentario en cada una
 * de ellas para poder tomar notas de cosas importantes… que ese comentario tenga una fecha y un autor».
 *
 * One store for the whole page, so the 60-odd blocks make ONE request per open design, not one each:
 * - where the notes belong (`ponerDestino`): the open saved design and the vehicle family. `MenuDisenos` sets it,
 *   because it is the piece that already knows both (`Disenos.tsx`); with no saved design open, the vehicle family;
 * - the server's notes for that place (`/api/aeromovil/notas`, src/server/aeromovilNotas.ts): need a session to write;
 * - this browser's anonymous notes (`localStorage` `aeromovil.notas.locales`): without a session a note is signed
 *   «Anónimo» and stays on this device. Rule 3 of the root CLAUDE.md: no write route without a role check.
 * A section is its block's title (`Bloque` `titulo`).
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';

export interface Nota {
  id: string;            // 's12' (server) or 'l…' (this browser)
  seccion: string;
  texto: string;
  fecha: string;         // ISO
  editada: string | null;
  autor: string;         // the account's name, resolved by the server; «Anónimo» for a local note
  mia: boolean;          // may be edited and removed from here
  local: boolean;
}

interface NotaLocal { id: string; diseno: number | null; vehiculo: string; seccion: string; texto: string; fecha: string; editada: string | null }
type Destino = { diseno: number | null; vehiculo: string };

const CLAVE_LOCAL = 'aeromovil.notas.locales';
let destino: Destino | null = null;
let usuario: string | null | undefined;            // undefined: not known yet
let servidor: Nota[] = [];
let estado: 'nada' | 'cargando' | 'listo' | 'error' = 'nada';
let version = 0;
let pedido = 0;
const subs = new Set<() => void>();
const avisar = () => { version++; subs.forEach(f => f()); };

const leerLocales = (): NotaLocal[] => { try { const v = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const guardarLocales = (l: NotaLocal[]) => { try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(l)); } catch { /* sin almacenamiento */ } };
const mismoDestino = (n: { diseno: number | null; vehiculo: string }) => !!destino && n.vehiculo === destino.vehiculo && (n.diseno ?? null) === destino.diseno;

function deServidor(f: any): Nota {
  return { id: `s${f.id}`, seccion: String(f.seccion), texto: String(f.texto), fecha: String(f.created_at), editada: f.updated_at ? String(f.updated_at) : null, autor: String(f.autor || 'Usuario'), mia: !!f.mia, local: false };
}

async function recargar() {
  if (!destino) { servidor = []; estado = 'nada'; avisar(); return; }
  const n = ++pedido, d = destino;
  estado = 'cargando'; avisar();
  try {
    const r = await fetch(`/api/aeromovil/notas?vehiculo=${encodeURIComponent(d.vehiculo)}&diseno=${d.diseno ?? ''}`, { credentials: 'include' });
    if (n !== pedido) return;
    if (!r.ok) throw new Error(String(r.status));
    const l = await r.json();
    servidor = Array.isArray(l) ? l.map(deServidor) : [];
    estado = 'listo';
  } catch {
    if (n !== pedido) return;
    servidor = []; estado = 'error';
  }
  avisar();
}

/** Where notes go now: the open saved design (or none) and the vehicle family. */
export function ponerDestino(diseno: number | null, vehiculo: string | undefined) {
  const d = vehiculo ? { diseno, vehiculo } : null;
  if (d?.diseno === destino?.diseno && d?.vehiculo === destino?.vehiculo) return;
  destino = d; void recargar();
}
/** Who is looking (the account id, or null): «mine» and the names change with it. */
export function ponerUsuario(id: string | null) {
  if (id === usuario) return;
  const antes = usuario; usuario = id;
  if (antes !== undefined && destino) void recargar();
}

const suscribir = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** The notes of one section, newest first, and whether notes can be taken here at all. */
export function useNotasSeccion(seccion: string, usuarioId: string | null) {
  const v = useSyncExternalStore(suscribir, () => version, () => version);
  useEffect(() => { ponerUsuario(usuarioId); }, [usuarioId]);
  return useMemo(() => {
    void v;
    const locales: Nota[] = leerLocales().filter(n => n.seccion === seccion && mismoDestino(n))
      .map(n => ({ id: n.id, seccion: n.seccion, texto: n.texto, fecha: n.fecha, editada: n.editada, autor: 'Anónimo', mia: true, local: true }));
    const notas = [...servidor.filter(n => n.seccion === seccion), ...locales].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
    return { activo: !!destino, conDiseno: destino?.diseno != null, estado, notas };
  }, [v, seccion]);
}

async function pedir(url: string, metodo: string, cuerpo?: unknown) {
  const r = await fetch(url, { method: metodo, credentials: 'include', headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'No se ha podido guardar la nota.');
  return j;
}

/** Adds a note: to the server with a session, to this browser without one. */
export async function anadirNota(seccion: string, texto: string, conSesion: boolean) {
  if (!destino) throw new Error('Abre un vehículo para tomar notas.');
  if (!conSesion) {
    guardarLocales([...leerLocales(), { id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, diseno: destino.diseno, vehiculo: destino.vehiculo, seccion, texto, fecha: new Date().toISOString(), editada: null }]);
    avisar(); return;
  }
  const f = await pedir('/api/aeromovil/notas', 'POST', { vehiculo: destino.vehiculo, diseno: destino.diseno, seccion, texto });
  servidor = [deServidor(f), ...servidor]; avisar();
}

export async function cambiarNota(n: Nota, texto: string) {
  if (n.local) {
    guardarLocales(leerLocales().map(x => (x.id === n.id ? { ...x, texto, editada: new Date().toISOString() } : x)));
    avisar(); return;
  }
  const f = await pedir(`/api/aeromovil/notas/${n.id.slice(1)}`, 'PATCH', { texto });
  servidor = servidor.map(x => (x.id === n.id ? deServidor(f) : x)); avisar();
}

export async function quitarNota(n: Nota) {
  if (n.local) { guardarLocales(leerLocales().filter(x => x.id !== n.id)); avisar(); return; }
  await pedir(`/api/aeromovil/notas/${n.id.slice(1)}`, 'DELETE');
  servidor = servidor.filter(x => x.id !== n.id); avisar();
}
