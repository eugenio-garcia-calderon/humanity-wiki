import type { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { ANCHOS_MINIATURA } from '../utils/miniatura';

// ============================================================================
// LAS MINIATURAS WEBP (2026-10-22, Eugenio: «conviértelas en miniaturas WebP por
// defecto, siempre»)
// ============================================================================
// El bot evaluador midió 7,6 MB de imágenes en la página de Movilidad: fotos
// PNG de 2,8 MB pintadas en una tarjeta de 250 px. Ahora `/uploads/…png?w=400`
// devuelve esa imagen en WebP, del ancho pedido (de una lista fija, para no
// fabricar mil tamaños) y girada según su EXIF. Se hace una vez y se guarda al
// lado (`.mini/<ancho>/…webp`): las siguientes salen del disco, con caché de un
// año en el navegador y en Cloudflare. El original no se toca; sin `?w` sale
// tal cual. Si algo falla, también sale el original: nunca una imagen rota.

const EXT = /\.(png|jpe?g|webp|avif|tiff?)$/i;
const enMarcha = new Map<string, Promise<void>>();
let sharpCargado: any = null;
async function sharp() {
  if (!sharpCargado) sharpCargado = (await import('sharp')).default;
  return sharpCargado;
}

export function miniaturas(raiz: string) {
  const base = path.resolve(raiz);
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pedido = Number(req.query.w);
      if (!pedido || (req.method !== 'GET' && req.method !== 'HEAD') || !EXT.test(req.path)) return next();
      const ancho = ANCHOS_MINIATURA.find(a => a >= pedido) || ANCHOS_MINIATURA[ANCHOS_MINIATURA.length - 1];
      let rel: string;
      try { rel = decodeURIComponent(req.path).replace(/^\/+/, ''); } catch { return next(); }
      const origen = path.resolve(base, rel);
      if (!origen.startsWith(base + path.sep) || rel.startsWith('.mini/') || rel.startsWith('privado/') || !existsSync(origen)) return next();
      const destino = path.join(base, '.mini', String(ancho), `${rel}.webp`);
      if (!existsSync(destino)) {
        let p = enMarcha.get(destino);
        if (!p) {
          p = (async () => {
            mkdirSync(path.dirname(destino), { recursive: true });
            const tmp = `${destino}.${process.pid}.tmp`;
            const s = await sharp();
            await s(origen, { failOn: 'none' }).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(tmp);
            renameSync(tmp, destino);
          })().finally(() => enMarcha.delete(destino));
          enMarcha.set(destino, p);
        }
        await p;
      }
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(destino, { dotfiles: 'allow' }, e => { if (e && !res.headersSent) next(); });
    } catch (e) {
      console.error('miniaturas:', (e as Error)?.message || e);
      next();
    }
  };
}
