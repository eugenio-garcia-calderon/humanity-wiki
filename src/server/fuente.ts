import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// DE DÓNDE VIENE ESTO — las piezas hermanas de una publicación (2026-08-25)
// ============================================================================
// Eugenio: «cuando se hace clic en una publicación y se expande la pantalla
// pop-up en grande, dale más relevancia al grafo o proyecto al que pertenezca
// esta publicación… ya que tenemos más superficie de pantalla, podemos meter
// una preview de esa fuente de publicación y dará a entender que hay más piezas
// en esa fuente de contenido».
//
// ── EL NÚMERO YA ESTABA; LO QUE FALTA ES ENSEÑARLO ──────────────────────────
// En la tarjeta pequeña la procedencia cabe en una línea: «PARTE DE X · 11
// piezas». En la ficha abierta hay sitio para algo que el número solo no puede
// hacer: **enseñar tres o cuatro de esas piezas**. Un «11» se lee y se olvida;
// tres portadas y sus títulos convierten «hay más» en «hay esto, esto y esto».
//
// ── SE PIDE APARTE, Y NO CON LA PUBLICACIÓN ─────────────────────────────────
// Sólo hace falta cuando alguien abre la ficha, que es una de cada muchas
// tarjetas que se ven. Colgarlo de la consulta del muro sería traer las piezas
// hermanas de cincuenta publicaciones para que se miren las de una.

export function registrarFuente(app: Express, db: any) {
  /**
   * `GET /api/fuente/:slug?excepto=<id>`
   *
   * Lo que hay dentro del lienzo donde vive una publicación: cuántas piezas
   * son y una muestra de las demás.
   */
  app.get('/api/fuente/:slug', async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug || '');
      const excepto = req.query.excepto ? String(req.query.excepto) : null;
      const usuarioId = req.user?.id || null;

      const grafo = await db.execute(sql`
        SELECT id, slug, title, description
        FROM knowledge_graphs
        WHERE slug = ${slug} AND archived_at IS NULL AND deleted_at IS NULL
          -- Un lienzo en borrador o personal sólo lo ve quien lo hizo. Sin esta
          -- línea, la ficha de una publicación pública sería una rendija por la
          -- que mirar dentro de un lienzo privado.
          AND (status = 'publicado' OR creator_user_id = ${usuarioId}::text)
          AND (coalesce(center->>'personal','') <> '1' OR creator_user_id = ${usuarioId}::text)
      `);
      if (!grafo.rows.length) return res.status(404).json({ error: 'Ese lienzo no está.' });
      const g = grafo.rows[0] as any;

      // Las piezas: TODAS para contar, unas pocas para enseñar. Se cuenta
      // aparte de la muestra porque el número tiene que ser el de verdad, no
      // el de lo que se ha traído.
      const cuenta = await db.execute(sql`
        SELECT count(*)::int AS n
        FROM graph_windows gw JOIN knowledge_windows w ON w.id = gw.window_id
        WHERE gw.graph_id = ${g.id} AND w.archived_at IS NULL AND w.deleted_at IS NULL
      `);

      const muestra = await db.execute(sql`
        SELECT w.id, w.title, w.kind, w.config
        FROM graph_windows gw JOIN knowledge_windows w ON w.id = gw.window_id
        WHERE gw.graph_id = ${g.id}
          AND w.archived_at IS NULL AND w.deleted_at IS NULL
          AND (${excepto}::text IS NULL OR w.id <> ${excepto})
          AND (w.publico OR w.creator_user_id = ${usuarioId}::text)
        -- Las que tienen algo que enseñar primero: una fila de portadas dice
        -- «mira lo que hay dentro» y una fila de títulos sueltos no.
        ORDER BY (w.config ? 'image_url' OR w.config ? 'youtube_id' OR w.config ? 'video_url') DESC,
                 w.created_at DESC
        LIMIT 8
      `);

      res.json({
        slug: g.slug,
        titulo: g.title,
        descripcion: g.description,
        piezas: (cuenta.rows[0] as any)?.n || 0,
        muestra: (muestra.rows as any[]).map(w => ({
          id: w.id,
          titulo: w.title,
          kind: w.kind,
          // Sólo lo que hace falta para pintar una miniatura. La `config`
          // entera de una ventana puede traer el cuerpo de un documento, y eso
          // no tiene por qué viajar para enseñar un recuadro de 80 px.
          imagen: w.config?.image_url || null,
          youtube: w.config?.youtube_id || null,
          video: w.config?.video_url || null,
        })),
      });
    } catch (e: any) {
      console.error('[fuente]', e);
      res.status(500).json({ error: e.message });
    }
  });
}
