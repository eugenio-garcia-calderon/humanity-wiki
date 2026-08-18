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

/** La extensión la decidimos NOSOTROS a partir del tipo declarado — nunca del
 *  nombre que envía el navegador. */
const IMAGENES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

/** Documentos que se pueden arrastrar al lienzo (2026-08-07). Se sirven SIEMPRE
 *  como descarga: un PDF o un SVG incrustado en nuestro dominio podría ejecutar
 *  cosas en él, y aquí no hace falta correr ese riesgo. */
const DOCUMENTOS: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

/** Audio para la música del mapa 3D (2026-08-18, petición de Eugenio): además
 *  de linkar Spotify, se puede subir la canción. Se sirve EN LÍNEA (un <audio>
 *  no ejecuta nada) y con un tope más alto: un MP3 decente ronda los 10 MB. */
const AUDIO: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
};

const TIPOS: Record<string, string> = { ...IMAGENES, ...DOCUMENTOS, ...AUDIO };

/** Lo que se puede mostrar dentro de la página; el resto, descarga. */
const EN_LINEA = new Set([
  ...Object.values(IMAGENES).filter(e => e !== 'svg'),
  ...Object.values(AUDIO),
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_AUDIO = 25 * 1024 * 1024; // 25 MB, solo para canciones

/** Dónde viven los ficheros. En producción es un volumen de Docker, para que
 *  sobrevivan a cada despliegue. */
export const uploadsDir = () =>
  process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

/**
 * Guarda unos bytes ya en memoria (no un `req` — lo usa también la
 * generación de imágenes por IA, que nunca pasa por el endpoint HTTP) y
 * devuelve la misma forma que `POST /api/uploads`. Mismo almacén, mismas
 * carpetas por mes, mismo nombre UUID: un origen único de verdad.
 */
export function guardarArchivo(tipo: string, bytes: Buffer): { url: string; bytes: number; type: string; esImagen: boolean } {
  const ext = TIPOS[tipo.toLowerCase()];
  if (!ext) throw new Error(`Formato no admitido: ${tipo}`);
  const tope = tipo.toLowerCase() in AUDIO ? MAX_AUDIO : MAX_BYTES;
  if (bytes.length > tope) throw new Error(`El archivo supera los ${Math.round(tope / 1024 / 1024)} MB.`);
  const raiz = uploadsDir();
  const ahora = new Date();
  const rel = path.join(String(ahora.getFullYear()), String(ahora.getMonth() + 1).padStart(2, '0'));
  mkdirSync(path.join(raiz, rel), { recursive: true });
  const nombre = `${randomUUID()}.${ext}`;
  writeFileSync(path.join(raiz, rel, nombre), bytes);
  return {
    url: `/uploads/${rel.split(path.sep).join('/')}/${nombre}`,
    bytes: bytes.length,
    type: tipo,
    esImagen: tipo in IMAGENES,
  };
}

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
    setHeaders: (res, ruta) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
      // Solo las imágenes de verdad se pintan en la página. Un PDF, un SVG o
      // un ZIP se descargan: así nada de lo subido se ejecuta en el dominio.
      const ext = path.extname(ruta).slice(1).toLowerCase();
      if (!EN_LINEA.has(ext)) res.setHeader('Content-Disposition', 'attachment');
    },
  }));

  app.post(
    '/api/uploads',
    express.raw({ type: 'application/octet-stream', limit: MAX_AUDIO }),
    async (req: Request, res: Response) => {
      try {
        if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión para subir archivos.' });

        const tipo = String(req.query.type || '').toLowerCase();
        const ext = TIPOS[tipo];
        if (!ext) {
          return res.status(400).json({
            error: `Formato no admitido. Se aceptan imágenes (PNG, JPG, WebP, GIF, AVIF, SVG), documentos (PDF, CSV, JSON, ZIP, DOCX, XLSX, PPTX) y audio (MP3, M4A, OGG, WAV, AAC, FLAC).`,
          });
        }

        const bytes = req.body as Buffer;
        if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
          return res.status(400).json({ error: 'El archivo llegó vacío.' });
        }
        const tope = tipo in AUDIO ? MAX_AUDIO : MAX_BYTES;
        if (bytes.length > tope) {
          return res.status(413).json({ error: `El archivo supera los ${Math.round(tope / 1024 / 1024)} MB.` });
        }
        res.json(guardarArchivo(tipo, bytes));
      } catch (e: any) {
        console.error('upload error:', e);
        res.status(500).json({ error: e.message });
      }
    },
  );
}
