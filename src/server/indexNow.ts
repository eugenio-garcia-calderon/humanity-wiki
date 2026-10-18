// ============================================================================
// AVISAR A LOS BUSCADORES EN CUANTO ALGO CAMBIA — IndexNow (2026-10-18, W2, SEO R12)
// ============================================================================
// Google pasa por el sitemap cuando quiere. Bing (y, a través de Bing,
// ChatGPT y Copilot), Yandex y Seznam aceptan que se les AVISE: IndexNow. Una
// ficha nueva o con un precio cambiado se ve allí en minutos, no en días.
//
// · Lo enciende quien publica el sitio, sitio por sitio («Menú y pie» →
//   «Datos legales» → «Avisar a Bing…»): `config.sitio.avisarBuscadores`.
//   Apagado en todos los que ya existían.
// · Sólo para un sitio con su propia dirección (`dominios_paginas` activo:
//   un dominio comprado o su `algo.humanity.wiki`), que es la canónica.
// · La clave no es un secreto: IndexNow la pide publicada en
//   `https://<dominio>/<clave>.txt` para comprobar que el aviso es del dueño
//   del dominio. Se saca del propio dominio, así que no se guarda en ningún
//   sitio y es siempre la misma.
// · Al minuto de arrancar y cada 15 minutos se miran las direcciones del
//   sitemap del sitio y se avisa de las que cambiaron desde la última vuelta.
//   La primera mira las últimas 24 horas: lo que cambió mientras se
//   desplegaba no se pierde, y repetir un aviso no hace daño.
// · Sólo en producción. `INDEXNOW=off` en el entorno lo apaga para todos.
import type { Express, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { sitioDe, urlsDelAnfitrion } from './sitios';

const CADA_MS = 15 * 60 * 1000;
const PRIMERA_VEZ_MS = 24 * 60 * 60 * 1000;
/** El máximo de direcciones por aviso que admite IndexNow. */
const POR_AVISO = 10_000;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** La clave de un dominio: 32 cifras hexadecimales, siempre las mismas. */
export const claveIndexNow = (host: string) =>
  crypto.createHash('sha256').update(`indexnow:${host.toLowerCase()}`).digest('hex').slice(0, 32);

/** Los dominios cuyos sitios piden avisar, con su página raíz. */
async function dominiosQueAvisan(db: any): Promise<string[]> {
  const r = await db.execute(sql`
    SELECT DISTINCT ON (w.id) d.dominio FROM dominios_paginas d
    JOIN knowledge_windows w ON w.id = d.entidad_id AND d.entidad_tipo = 'pagina'
    WHERE d.estado = 'activo' AND w.publico = true AND w.indexable = true
      AND w.deleted_at IS NULL AND w.archived_at IS NULL
      AND (w.config->'sitio'->>'avisarBuscadores') = 'true'
    -- Si un sitio tiene dos, el comprado: es el canónico (ver canonicaDe).
    ORDER BY w.id, (d.dominio LIKE '%.humanity.wiki')
  `);
  return (r.rows as any[]).map(x => String(x.dominio));
}

async function avisar(host: string, urls: string[]) {
  const key = claveIndexNow(host);
  for (let i = 0; i < urls.length; i += POR_AVISO) {
    // `INDEXNOW_URL`: otro destino, para probarlo sin avisar a nadie de verdad.
    const r = await fetch(process.env.INDEXNOW_URL || ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls.slice(i, i + POR_AVISO) }),
      signal: AbortSignal.timeout(15_000),
    });
    // 200 y 202 son «recibido». Lo demás se apunta y se intenta en la próxima vuelta.
    if (r.status !== 200 && r.status !== 202) throw new Error(`IndexNow ${host}: ${r.status}`);
  }
}

export function registrarIndexNow(app: Express, db: any) {
  // La clave publicada, en el dominio del sitio: `/<clave>.txt`.
  app.get(/^\/([0-9a-f]{32})\.txt$/, (req: Request, res: Response, next: NextFunction) => {
    const s = sitioDe(req);
    if (s.forma !== 'dominio' || req.params[0] !== claveIndexNow(s.host)) return next();
    res.type('text/plain').set('Cache-Control', 'public, max-age=86400').send(req.params[0]);
  });

  if (process.env.NODE_ENV !== 'production' || process.env.INDEXNOW === 'off') return;
  let desde = Date.now() - PRIMERA_VEZ_MS;
  const vuelta = async () => {
    const ahora = Date.now();
    let fallo = false;
    for (const host of await dominiosQueAvisan(db)) {
      try {
        const urls = ((await urlsDelAnfitrion(host)) || []).filter(u => (u.t || 0) > desde).map(u => u.loc);
        if (urls.length) {
          await avisar(host, urls);
          console.log(`[indexnow] ${host}: ${urls.length} dirección(es)`);
        }
      } catch (e: any) { fallo = true; console.error('[indexnow]', e?.message || e); }
    }
    // Si algo falló, la próxima vuelta vuelve a mirar desde el mismo punto.
    if (!fallo) desde = ahora;
  };
  const otra = () => { vuelta().catch(e => console.error('[indexnow]', e?.message || e)); };
  // La primera, al minuto de arrancar (lo que cambió durante el despliegue).
  setTimeout(otra, 60_000).unref?.();
  setInterval(otra, CADA_MS).unref?.();
}
