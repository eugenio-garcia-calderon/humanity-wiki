import express, { type Express, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// ============================================================================
// UPLOADS — archivos subidos por las personas (2026-08-07)
// ============================================================================
// Nace para poder PEGAR imágenes en el lienzo de Mi Conocimiento. Se guardan
// como ficheros en disco, no como data-URL en la base de datos: una captura
// pegada ronda 1-3 MB, y `GET /api/graphs?with_windows=1` trae las ventanas
// de TODOS los grafos a la vez — meterlas en `config` haría esa respuesta de
// megabytes en cuanto hubiera unas pocas.
//
// El cuerpo llega como bytes crudos (`application/octet-stream`), no como
// base64: evita el +33% de tamaño y, sobre todo, esquiva el `express.json()`
// global de server.ts (100 kB) sin tener que tocar ese archivo congelado.

/** Solo imágenes, y la extensión la decidimos NOSOTROS a partir del tipo
 *  declarado — nunca del nombre que envía el navegador. */
const TIPOS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Dónde viven los ficheros. En producción es un volumen de Docker, para que
 *  sobrevivan a cada despliegue. */
export const uploadsDir = () =>
  process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

export function registerUploadRoutes(app: Express, _db: any) {
  const raiz = uploadsDir();
  mkdirSync(raiz, { recursive: true });

  // Servir lo subido. Los nombres son UUID generados aquí, así que no hay
  // nombre de usuario en la ruta; express.static ya bloquea el path traversal.
  app.use('/uploads', express.static(raiz, {
    maxAge: '365d',
    immutable: true,
    index: false,
    dotfiles: 'deny',
    setHeaders: res => {
      // Un SVG subido puede llevar scripts: se sirve como descarga inerte y
      // sin poder ejecutar nada en nuestro dominio.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
    },
  }));

  app.post(
    '/api/uploads',
    express.raw({ type: 'application/octet-stream', limit: MAX_BYTES }),
    async (req: Request, res: Response) => {
      try {
        if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión para subir archivos.' });

        const tipo = String(req.query.type || '').toLowerCase();
        const ext = TIPOS[tipo];
        if (!ext) {
          return res.status(400).json({
            error: `Formato no admitido. Se aceptan: ${Object.keys(TIPOS).join(', ')}.`,
          });
        }

        const bytes = req.body as Buffer;
        if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
          return res.status(400).json({ error: 'El archivo llegó vacío.' });
        }
        if (bytes.length > MAX_BYTES) {
          return res.status(413).json({ error: 'La imagen supera los 10 MB.' });
        }

        // Carpetas por mes: miles de ficheros en un solo directorio hacen
        // lento cualquier listado y las copias de seguridad.
        const ahora = new Date();
        const rel = path.join(String(ahora.getFullYear()), String(ahora.getMonth() + 1).padStart(2, '0'));
        mkdirSync(path.join(raiz, rel), { recursive: true });

        const nombre = `${randomUUID()}.${ext}`;
        writeFileSync(path.join(raiz, rel, nombre), bytes);

        res.json({
          url: `/uploads/${rel.split(path.sep).join('/')}/${nombre}`,
          bytes: bytes.length,
          type: tipo,
        });
      } catch (e: any) {
        console.error('upload error:', e);
        res.status(500).json({ error: e.message });
      }
    },
  );
}
