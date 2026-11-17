// ============================================================================
// AEROMÓVIL · archivos de un componente (2026-11-17, migración 0224)
// ============================================================================
// Eugenio: «que todos los componentes… se pueda elegir un proveedor y un modelo… y también permitir que… se pueda meter
// un enlace o subir un archivo. De ese componente, subir varios archivos, igual hay presupuestos, hay información más
// detallada, un PDF o lo que sea».
//
// · The supplier, the model and the links go in the design itself (`Parametros.proveedores`): no route here.
// · The files: `POST /api/aeromovil/adjuntos` stores the bytes in the platform's upload store (`uploads.ts`
//   `guardarArchivo`: same volume, UUID names, served with nosniff + CSP, and as a download except images and PDF) and
//   writes one row in `aeromovil_adjuntos`, the register of who uploaded what. The page then puts `{ id, url, nombre… }`
//   in the part's list inside the design.
// · Write: a session of level 1 (root CLAUDE.md rule 3). Anonymous people can type names and links; to upload they log in.
// · Remove: its uploader or an admin. The bytes are deleted from disk and the row archived (the register keeps the name).
// Only a short list of types (quotes, datasheets, drawings, photos): no video, audio, zip or SVG here.
import express, { type Express, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { unlinkSync } from 'node:fs';
import { guardarArchivo, rutaLocalDeUpload } from './uploads.js';
import { esperaPendiente, ritmo, type Regla } from './limites/index.js';

/** What a part's file may be. The extension is decided by `uploads.ts` from this type, never from the browser's name. */
export const TIPOS_ADJUNTO = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/csv', 'text/plain',
]);
export const MAX_ADJUNTO = 10 * 1024 * 1024;   // 10 MB: a scanned quote or a datasheet; a phone photo is 2–4 MB
const MAX_NOMBRE = 160;
// 40 files an hour per account: someone attaching a supplier's papers does not reach it; a loop does.
const FRENO: Regla = { puerta: 'aeromovil-adjuntos', gracia: 40, baseSegundos: 30, topeSegundos: 1800, alFallar: 'cerrar' };

const nivel = (req: Request) => (req.user ? (req.user.roleLevel ?? 0) : -1);
function requireLevel(req: Request, res: Response, min: number): boolean {
  if (!req.user) { res.status(401).json({ error: 'Inicia sesión para subir archivos. El proveedor, el modelo y los enlaces se pueden escribir sin cuenta.' }); return false; }
  if (nivel(req) < min) { res.status(403).json({ error: `Requiere nivel ${min} o superior.` }); return false; }
  return true;
}

/** A file's name as shown: no path, no control characters, at most 160 characters. */
export const nombreLimpio = (v: unknown) =>
  String(v ?? '').split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_NOMBRE);

export function registrarAdjuntosAeromovil(app: Express, db: any) {
  // The raw body, with its errors answered in Spanish JSON: a file over the limit would otherwise get Express's HTML page.
  const crudo = express.raw({ type: 'application/octet-stream', limit: MAX_ADJUNTO + 1024 });
  const cuerpo = (req: Request, res: Response, next: (e?: unknown) => void) => crudo(req, res, (e?: any) => {
    if (!e) return next();
    res.status(e.status === 413 ? 413 : 400).json({ error: e.status === 413 ? 'El archivo supera los 10 MB.' : 'El archivo no ha llegado bien. Prueba otra vez.' });
  });
  /** POST /api/aeromovil/adjuntos?type=application/pdf&nombre=presupuesto.pdf&pieza=Batería — body: the raw bytes. */
  app.post('/api/aeromovil/adjuntos', cuerpo, async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, 1)) return;
      const tipo = String(req.query.type || '').toLowerCase().split(';')[0].trim();
      const nombre = nombreLimpio(req.query.nombre);
      const pieza = String(req.query.pieza ?? '').trim().slice(0, MAX_NOMBRE);
      if (!TIPOS_ADJUNTO.has(tipo)) return res.status(400).json({ error: 'Formato no admitido. Se aceptan PDF, imágenes (JPG, PNG, WebP), Word, Excel, PowerPoint (DOCX, XLSX, PPTX), CSV y texto.' });
      if (!nombre || !pieza) return res.status(400).json({ error: 'Falta el nombre del archivo o el componente.' });
      const bytes = req.body as Buffer;
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) return res.status(400).json({ error: 'El archivo llegó vacío.' });
      if (bytes.length > MAX_ADJUNTO) return res.status(413).json({ error: 'El archivo supera los 10 MB.' });
      const quien = `u:${req.user!.id}@${new Date().toISOString().slice(0, 13)}`;
      const espera = await esperaPendiente(db, FRENO, quien);
      if (espera > 0) {
        res.setHeader('Retry-After', String(espera));
        return res.status(429).json({ error: `Demasiados archivos seguidos. Prueba en ${espera < 60 ? `${espera} segundos` : `${Math.ceil(espera / 60)} minutos`}.` });
      }
      ritmo(db, FRENO, quien);
      const g = guardarArchivo(tipo, bytes);
      const r = await db.execute(sql`
        INSERT INTO aeromovil_adjuntos (url, nombre, tipo, bytes, pieza, created_by)
        VALUES (${g.url}, ${nombre}, ${tipo}, ${g.bytes}, ${pieza}, ${req.user!.id})
        RETURNING id, to_json(created_at) #>> '{}' AS fecha
      `);
      const f = r.rows[0] as any;
      res.json({ id: f.id, url: g.url, nombre, tipo, bytes: g.bytes, fecha: f.fecha });
    } catch (e: any) {
      console.error('aeromovil adjunto:', e?.message || e);
      res.status(500).json({ error: 'No se ha podido subir el archivo.' });
    }
  });

  /** DELETE /api/aeromovil/adjuntos/:id — deletes the bytes and archives the row. Its uploader or an admin. */
  app.delete('/api/aeromovil/adjuntos/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, 1)) return;
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Archivo no válido.' });
      const f = (await db.execute(sql`SELECT url, created_by FROM aeromovil_adjuntos WHERE id = ${id} AND archived_at IS NULL`)).rows[0] as any;
      if (!f) return res.status(404).json({ error: 'Ese archivo ya no está.' });
      if (f.created_by !== req.user!.id && nivel(req) < 4) return res.status(403).json({ error: 'Solo quien subió el archivo puede borrarlo. Puedes quitarlo de este diseño.' });
      const ruta = rutaLocalDeUpload(String(f.url));
      if (ruta) { try { unlinkSync(ruta); } catch (e: any) { if (e?.code !== 'ENOENT') throw e; } }
      await db.execute(sql`UPDATE aeromovil_adjuntos SET archived_at = now() WHERE id = ${id}`);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('aeromovil adjunto delete:', e?.message || e);
      res.status(500).json({ error: 'No se ha podido borrar el archivo.' });
    }
  });

  /** GET /api/aeromovil/adjuntos/mios?ids=1,2,3 — which of these the person looking may delete (uploader or admin). */
  app.get('/api/aeromovil/adjuntos/mios', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'no-store');
      if (!req.user) return res.json([]);
      const ids = String(req.query.ids ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 200);
      if (!ids.length) return res.json([]);
      const r = nivel(req) >= 4
        ? await db.execute(sql`SELECT id FROM aeromovil_adjuntos WHERE archived_at IS NULL AND id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})`)
        : await db.execute(sql`SELECT id FROM aeromovil_adjuntos WHERE archived_at IS NULL AND created_by = ${req.user.id} AND id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)})`);
      res.json(r.rows.map((x: any) => x.id));
    } catch (e: any) {
      console.error('aeromovil adjuntos mios:', e?.message || e);
      res.status(500).json({ error: 'No se ha podido comprobar.' });
    }
  });
}
