import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// LAS CREACIONES PUBLICADAS (2026-11-05, la reestructuración)
// ============================================================================
// Eugenio: «la gente a través del buscador en esa página web podrá ver todas
// las creaciones. De momento solo está creando Eugenio, pero en un futuro
// habrá otros creadores». La portada de Humanity.Wiki enseña lo que hay hecho
// con la herramienta: cada sitio publicado (una página raíz con `config.sitio`)
// y cada página con dominio propio activo. No hay lista escrita a mano: quien
// publique un sitio mañana sale aquí sin tocar nada.
//
// La dirección de cada una: su dominio propio si lo tiene; «La Humanidad» su
// ruta fija `/humanidad`; y el resto, su dirección pública en casa
// (`/@quien/p/:id`). Cinco minutos de memoria: esto lo pide la portada de
// quien llega por primera vez, y la lista cambia poco.

const HUMANIDAD_ID = 'KWMHUMANIDAD';
type Creacion = { id: string; titulo: string; resumen: string | null; icono: string | null; imagen: string | null; handle: string | null; url: string };
let memoria: { t: number; lista: Creacion[] } | null = null;

export function registrarCreaciones(app: Express, db: any) {
  app.get('/api/creaciones', async (_req: Request, res: Response) => {
    try {
      if (!memoria || Date.now() - memoria.t > 5 * 60_000) {
        const r = await db.execute(sql`
          SELECT k.id, k.title, k.config->>'subtitulo' AS subtitulo, k.config->>'descripcion' AS descripcion,
                 k.config->>'icono' AS icono, k.config->>'imagenCompartir' AS imagen, u.handle, d.dominio
          FROM knowledge_windows k
          JOIN users u ON u.id = k.creator_user_id
          LEFT JOIN dominios_paginas d ON d.pagina_id = k.id AND d.estado = 'activo'
          WHERE k.publico = true AND k.deleted_at IS NULL AND k.archived_at IS NULL
            AND (k.config ? 'sitio' OR d.dominio IS NOT NULL)
          ORDER BY k.created_at
        `);
        const lista: Creacion[] = (r.rows as any[]).map(x => ({
          id: String(x.id),
          titulo: String(x.title || ''),
          resumen: x.subtitulo || x.descripcion || null,
          icono: x.icono || null,
          imagen: x.imagen || null,
          handle: x.handle || null,
          url: x.id === HUMANIDAD_ID ? '/humanidad'
            : x.dominio ? `https://${x.dominio}`
            : `/@${x.handle}/p/${x.id}`,
        }));
        memoria = { t: Date.now(), lista };
      }
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ creaciones: memoria.lista });
    } catch (e: any) { console.error('creaciones:', e); res.status(500).json({ error: e.message }); }
  });
}
