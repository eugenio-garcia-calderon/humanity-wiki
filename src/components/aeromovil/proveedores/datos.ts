/**
 * Supplier, model and files of each part (2026-11-17, Eugenio: «que todos los componentes, aparte de tener un peso y
 * un precio, se pueda elegir un proveedor y un modelo… o escrito, como el nombre, y también… meter un enlace o subir un
 * archivo. De ese componente, subir varios archivos, igual hay presupuestos, hay información más detallada, un PDF»).
 *
 * Everything lives in the design, by the part's name in the mass model (the same key as `Parametros.precios`):
 * `P.proveedores['Batería'] = { proveedor, proveedorUrl, modelo, modeloUrl, adjuntos: [...] }`. A saved design carries
 * it, the browser's copy carries it, and a design without it reads exactly as before.
 * The files' bytes are on the server (`src/server/aeromovilAdjuntos.ts`, migration 0224); the design keeps their id,
 * URL, name, type and size.
 * Where a catalogue already names the part (the powertrain catalogue `catalogoTren.ts`, the wheel catalogue
 * `ruedas/catalogo.ts`), that is shown as the suggestion until the person writes their own.
 */
import type { Parametros } from '../geometria';
import { controladorDe, motorDe, reductoraDe, termicoDe } from '../catalogoTren';
import { fichaRueda } from '../ruedas/catalogo';

export interface Adjunto { id: number; url: string; nombre: string; tipo: string; bytes: number; fecha: string }
export interface ProveedorPieza {
  proveedor?: string; proveedorUrl?: string;
  modelo?: string; modeloUrl?: string;
  adjuntos?: Adjunto[];
}

// The field is declared here, not in geometria.ts (claimed by another bot the day this was written): TypeScript merges
// this into `Parametros` everywhere. Moving it next to `precios` is a two-minute change (tech debt, 2026-11-17).
declare module '../geometria' {
  interface Parametros {
    /** (2026-11-17) supplier, model, their links and the files of a part, by its name in the mass model (`proveedores/datos.ts`) */
    proveedores?: Record<string, ProveedorPieza>;
  }
}

export const MAX_TEXTO = 120;
export const MAX_URL = 500;
export const MAX_ADJUNTOS = 12;
/** What the server accepts (`aeromovilAdjuntos.ts` `TIPOS_ADJUNTO`), for the file picker and a message before uploading. */
export const ACEPTA = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.docx,.xlsx,.pptx,.csv,.txt,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,text/plain';
export const MAX_BYTES = 10 * 1024 * 1024;
const POR_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv', txt: 'text/plain',
};
/** The type to send: the browser's, or from the extension when the browser gives none (Windows often does for .docx). */
export function tipoDe(f: File): string | null {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const t = (f.type || '').toLowerCase();
  if (Object.values(POR_EXTENSION).includes(t)) return t;
  return POR_EXTENSION[ext] ?? null;
}

/** Only http(s) links are kept; «www.x.com» becomes «https://www.x.com». Anything else (javascript:, data:…) is dropped. */
export function enlaceSeguro(v: string | undefined | null): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const con = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(con);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
}

/** What a catalogue already says about this part (shown as a suggestion), or null. */
export interface Sugerencia { proveedor?: string; proveedorUrl?: string; modelo?: string; modeloUrl?: string; de: string }
export function sugerencia(nombre: string, P: Parametros): Sugerencia | null {
  const desde = (p: { marca: string; modelo: string; fuente: string; tipoFuente: string } | null, de: string): Sugerencia | null => {
    if (!p) return null;
    const url = enlaceSeguro(p.fuente) ?? undefined;
    return p.tipoFuente === 'fabricante'
      ? { proveedor: p.marca, modelo: p.modelo, modeloUrl: url, de }
      : { proveedor: p.marca, modelo: p.modelo, proveedorUrl: url, de };
  };
  if (/^Motor(es)? de buje/.test(nombre)) return desde(motorDe(P.tCatMotor), 'el catálogo de motores');
  if (nombre === 'Controlador') return desde(controladorDe(P.tCatCtrl), 'el catálogo de controladores');
  if (/reductora/i.test(nombre)) return desde(reductoraDe(P.tCatReductora), 'el catálogo de reductoras');
  if (/^Motor de gasolina/.test(nombre)) return desde(termicoDe(P.tCatTermico), 'el catálogo de motores de gasolina');
  if (nombre === 'Ruedas' || /^Rueda delantera/.test(nombre)) {
    const d = fichaRueda(P.tRuedaDel), t = fichaRueda(P.tRuedaTras);
    if (!d && !t) return null;
    const modelo = d && t && d.medida !== t.medida ? `delante ${d.medida} · detrás ${t.medida}` : (d ?? t)!.medida;
    return { modelo, de: 'el catálogo de ruedas (la medida; la marca la eliges tú)' };
  }
  return null;
}

export const fichaDe = (P: Parametros, nombre: string): ProveedorPieza => P.proveedores?.[nombre] ?? {};

/** Something to show on the line: the person's own data or a file. */
export const tieneDatos = (f: ProveedorPieza) => !!(f.proveedor || f.modelo || f.proveedorUrl || f.modeloUrl || f.adjuntos?.length);

/** The new `proveedores` of the design with this part changed; empty entries are removed, and an empty map is `undefined`. */
export function conFicha(P: Parametros, nombre: string, cambios: Partial<ProveedorPieza>): Record<string, ProveedorPieza> | undefined {
  const antes = fichaDe(P, nombre);
  const f: ProveedorPieza = { ...antes, ...cambios };
  for (const k of ['proveedor', 'modelo'] as const) { const v = (f[k] ?? '').slice(0, MAX_TEXTO); if (v.trim()) f[k] = v; else delete f[k]; }
  for (const k of ['proveedorUrl', 'modeloUrl'] as const) { const v = (f[k] ?? '').slice(0, MAX_URL); if (v.trim()) f[k] = v; else delete f[k]; }
  if (!f.adjuntos?.length) delete f.adjuntos;
  const todo = { ...(P.proveedores ?? {}) };
  if (tieneDatos(f)) todo[nombre] = f; else delete todo[nombre];
  return Object.keys(todo).length ? todo : undefined;
}

export const tamano = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`);

/** Uploads one file for a part; the server checks the session, type and size. Throws with the server's Spanish message. */
export async function subirAdjunto(f: File, pieza: string): Promise<Adjunto> {
  const tipo = tipoDe(f);
  if (!tipo) throw new Error(`«${f.name}»: formato no admitido. Sirven PDF, JPG, PNG, WebP, Word, Excel, PowerPoint, CSV y texto.`);
  if (f.size > MAX_BYTES) throw new Error(`«${f.name}» pesa ${tamano(f.size)}: el máximo son 10 MB.`);
  const q = new URLSearchParams({ type: tipo, nombre: f.name, pieza });
  const r = await fetch(`/api/aeromovil/adjuntos?${q}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/octet-stream' }, body: f });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `No se ha podido subir «${f.name}».`);
  return j as Adjunto;
}

/** Deletes a file from the server (only its uploader or an admin may). */
export async function borrarAdjunto(id: number): Promise<void> {
  const r = await fetch(`/api/aeromovil/adjuntos/${id}`, { method: 'DELETE', credentials: 'include' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || 'No se ha podido borrar el archivo.');
}

/** Which of these files the person looking may delete from the server. */
export async function adjuntosMios(ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  try {
    const r = await fetch(`/api/aeromovil/adjuntos/mios?ids=${ids.join(',')}`, { credentials: 'include' });
    const l = r.ok ? await r.json() : [];
    return new Set(Array.isArray(l) ? l.map(Number) : []);
  } catch { return new Set(); }
}
