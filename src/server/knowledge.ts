import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

// ============================================================================
// Grafos de Conocimiento — Fase 11
// ============================================================================
// La "memoria" de qué se muestra y dónde vive en la base de datos: el grafo
// es un acto editorial con autor, valorable y versionable. El chat resuelve
// "Ceuta Frontera Amenaza" contra `trigger_keywords` SIN gastar una llamada
// a la IA (fast-path); la IA solo entra si no hay coincidencia directa.
//
// Decisión del usuario (2026-08-05): crear grafos y ventanas está abierto a
// cualquier usuario registrado (nivel 1). Editar lo de otros exige ser el
// creador o administrador.

const newId = (prefix: string) =>
  `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`;

/** Normaliza para el matching: minúsculas y sin tildes. */
export const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const WINDOW_KINDS = new Set([
  'publicacion', 'imagen', 'video', 'wikipedia', 'enlace', 'mapa',
  'grafica', 'ficha', 'cronologia', 'autores', 'documento', 'grafo', 'texto',
]);

const EDGE_RELATIONS = new Set(['contexto', 'causa', 'dato', 'fuente', 'apoya', 'contradice', 'matiza']);

export function registerKnowledgeRoutes(app: Express, db: any) {

  const requireLevel = (req: Request, res: Response, min: number): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < min) {
      res.status(403).json({ error: `Esta acción requiere nivel ${min} o superior.` });
      return false;
    }
    return true;
  };

  /** El creador del recurso o un administrador. */
  const canEdit = (req: Request, creatorId: string | null) =>
    !!req.user && (req.user.id === creatorId || (req.user.roleLevel ?? 0) >= ROLE.ADMIN);

  /** Medias de valoración para un lote de entidades de un tipo. */
  const ratingsFor = async (entityType: string, ids: string[], userId?: string) => {
    if (!ids.length) return { agg: {}, mine: {} } as any;
    const agg = await db.execute(sql`
      SELECT entity_id, round(avg(score)::numeric, 1)::float AS avg, count(*)::int AS count
      FROM ratings WHERE entity_type = ${entityType} AND entity_id IN ${ids}
      GROUP BY entity_id
    `);
    const mine = userId
      ? await db.execute(sql`
          SELECT entity_id, score FROM ratings
          WHERE entity_type = ${entityType} AND user_id = ${userId} AND entity_id IN ${ids}
        `)
      : { rows: [] };
    return {
      agg: Object.fromEntries((agg.rows as any[]).map(r => [r.entity_id, { avg: r.avg, count: r.count }])),
      mine: Object.fromEntries((mine.rows as any[]).map(r => [r.entity_id, r.score])),
    };
  };

  // ==========================================================================
  // LISTADO Y RESOLUCIÓN
  // ==========================================================================
  app.get('/api/graphs', async (req: Request, res: Response) => {
    try {
      // ?creator_id= filtra los grafos de una persona (su carta de
      // presentación en el perfil). Los borradores solo los ve su creador o
      // un administrador.
      const creatorId = (req.query.creator_id as string) || null;
      const rows = await db.execute(sql`
        SELECT g.id, g.title, g.slug, g.description, g.status, g.is_ai_generated, g.views,
               g.created_at, u.display_name AS creator_name, u.avatar_url AS creator_avatar,
               (SELECT count(*)::int FROM graph_windows gw WHERE gw.graph_id = g.id) AS window_count
        FROM knowledge_graphs g
        LEFT JOIN users u ON u.id = g.creator_user_id
        WHERE g.archived_at IS NULL
          AND (${creatorId}::text IS NULL OR g.creator_user_id = ${creatorId})
          AND (g.status = 'publicado' OR g.creator_user_id = ${req.user?.id || null}
               OR ${(req.user?.roleLevel ?? 0) >= ROLE.ADMIN})
        ORDER BY g.views DESC, g.created_at DESC
        LIMIT 60
      `);
      const { agg } = await ratingsFor('knowledge_graphs', (rows.rows as any[]).map(r => r.id));
      res.json((rows.rows as any[]).map(r => ({ ...r, rating: agg[r.id] || null })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * GET /api/graphs/resolve?q=ceuta frontera amenaza
   * Matching directo por palabras clave — el fast-path del chat/buscador.
   * Puntúa: coincidencia de keywords (2 pts la frase entera, 1 por palabra)
   * + palabras del título. Devuelve candidatos ordenados.
   */
  app.get('/api/graphs/resolve', async (req: Request, res: Response) => {
    try {
      const q = normalize(String(req.query.q || ''));
      if (q.length < 3) return res.json({ query: q, matches: [] });
      const words = q.split(/\s+/).filter(w => w.length > 2);

      const rows = await db.execute(sql`
        SELECT id, title, slug, description, trigger_keywords
        FROM knowledge_graphs WHERE archived_at IS NULL AND status = 'publicado'
      `);

      const matches = (rows.rows as any[]).map(g => {
        const keywords: string[] = (Array.isArray(g.trigger_keywords) ? g.trigger_keywords : []).map(normalize);
        const titleWords = normalize(g.title).split(/\s+/);
        let score = 0;
        for (const kw of keywords) {
          if (q.includes(kw)) score += 2; // la frase clave completa aparece en la consulta
          else if (words.some(w => kw.includes(w) || w.includes(kw))) score += 1;
        }
        for (const w of words) if (titleWords.some(t => t.includes(w))) score += 1;
        return { id: g.id, title: g.title, slug: g.slug, description: g.description, score };
      }).filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      res.json({ query: q, matches, confident: matches.length > 0 && matches[0].score >= 3 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // DETALLE COMPLETO DE UN GRAFO
  // ==========================================================================
  app.get('/api/graphs/:slug', async (req: Request, res: Response) => {
    try {
      const g = await db.execute(sql`
        SELECT g.*, u.display_name AS creator_name, u.avatar_url AS creator_avatar
        FROM knowledge_graphs g LEFT JOIN users u ON u.id = g.creator_user_id
        WHERE (g.slug = ${req.params.slug} OR g.id = ${req.params.slug}) AND g.archived_at IS NULL
      `);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      const graph = g.rows[0] as any;
      if (graph.status !== 'publicado' && !canEdit(req, graph.creator_user_id)) {
        return res.status(404).json({ error: 'Grafo no encontrado.' });
      }

      const windows = await db.execute(sql`
        SELECT w.*, gw.x, gw.y, u.display_name AS creator_name, u.avatar_url AS creator_avatar
        FROM graph_windows gw
        JOIN knowledge_windows w ON w.id = gw.window_id
        LEFT JOIN users u ON u.id = w.creator_user_id
        WHERE gw.graph_id = ${graph.id} AND w.archived_at IS NULL
      `);
      const edges = await db.execute(sql`
        SELECT e.id, e.from_window_id, e.to_window_id, e.relation, e.label,
               e.description, e.created_at, u.display_name AS creator_name
        FROM graph_edges e LEFT JOIN users u ON u.id = e.created_by
        WHERE e.graph_id = ${graph.id}
      `);

      // Anclaje al grafo general de la plataforma (ontología, Fase 11b): de
      // qué entidades trata este grafo…
      const entityLinks = await db.execute(sql`
        SELECT entity_type, entity_id, relation FROM graph_entity_links WHERE graph_id = ${graph.id}
      `);
      // …e INFERENCIA sobre ese anclaje: grafos relacionados = comparten
      // entidades con este, ordenados por cuántas comparten. Nadie los
      // enlaza a mano; se derivan.
      const relatedGraphs = await db.execute(sql`
        SELECT g.id, g.title, g.slug, count(*)::int AS shared_entities
        FROM graph_entity_links l1
        JOIN graph_entity_links l2
          ON l2.entity_type = l1.entity_type AND l2.entity_id = l1.entity_id AND l2.graph_id <> l1.graph_id
        JOIN knowledge_graphs g ON g.id = l2.graph_id AND g.status = 'publicado' AND g.archived_at IS NULL
        WHERE l1.graph_id = ${graph.id}
        GROUP BY g.id, g.title, g.slug
        ORDER BY shared_entities DESC
        LIMIT 5
      `);

      const winIds = (windows.rows as any[]).map(w => w.id);
      const { agg, mine } = await ratingsFor('knowledge_windows', winIds, req.user?.id);
      // Las conexiones también se valoran (protagonismo de las uniones).
      const edgeIds = (edges.rows as any[]).map(e => String(e.id));
      const eRatings = await ratingsFor('graph_edges', edgeIds, req.user?.id);
      const gRating = await ratingsFor('knowledge_graphs', [graph.id], req.user?.id);
      const comments = winIds.length ? await db.execute(sql`
        SELECT entity_id, count(*)::int AS n FROM comments
        WHERE entity_type = 'knowledge_windows' AND entity_id IN ${winIds} AND archived_at IS NULL
        GROUP BY entity_id
      `) : { rows: [] };
      const cMap = Object.fromEntries((comments.rows as any[]).map(r => [r.entity_id, r.n]));

      // Contador de visitas: mejor aproximado que bloquear la respuesta.
      db.execute(sql`UPDATE knowledge_graphs SET views = views + 1 WHERE id = ${graph.id}`).catch(() => {});

      res.json({
        graph: { ...graph, rating: gRating.agg[graph.id] || null, my_score: gRating.mine[graph.id] ?? null },
        windows: (windows.rows as any[]).map(w => ({
          ...w,
          rating: agg[w.id] || null,
          my_score: mine[w.id] ?? null,
          comment_count: cMap[w.id] || 0,
        })),
        edges: (edges.rows as any[]).map(e => ({
          ...e,
          rating: eRatings.agg[String(e.id)] || null,
          my_score: eRatings.mine[String(e.id)] ?? null,
        })),
        entity_links: entityLinks.rows,
        related_graphs: relatedGraphs.rows,
        can_edit: canEdit(req, graph.creator_user_id),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // CREACIÓN Y EDICIÓN
  // ==========================================================================
  app.post('/api/graphs', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const d = req.body || {};
      if (!d.title) return res.status(400).json({ error: 'El grafo necesita un título.' });
      const id = newId('KG');
      const slug = d.slug || normalize(d.title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await db.execute(sql`
        INSERT INTO knowledge_graphs (id, title, slug, description, center, creator_user_id, trigger_keywords,
                                      status, is_ai_generated, created_by, updated_by)
        VALUES (${id}, ${d.title}, ${slug}, ${d.description || null},
                ${JSON.stringify(d.center || {})}::jsonb, ${req.user!.id},
                ${JSON.stringify(d.trigger_keywords || [])}::jsonb, ${d.status || 'publicado'},
                ${!!d.is_ai_generated}, ${req.user!.id}, ${req.user!.id})
      `);
      const row = await db.execute(sql`SELECT * FROM knowledge_graphs WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/graphs/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden editarlo.' });
      }
      const d = req.body || {};
      await db.execute(sql`
        UPDATE knowledge_graphs SET
          title = COALESCE(${d.title ?? null}, title),
          description = COALESCE(${d.description ?? null}, description),
          center = COALESCE(${d.center ? JSON.stringify(d.center) : null}::jsonb, center),
          trigger_keywords = COALESCE(${d.trigger_keywords ? JSON.stringify(d.trigger_keywords) : null}::jsonb, trigger_keywords),
          status = COALESCE(${d.status ?? null}, status),
          version = version + 1, updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Guardar posiciones del lienzo (arrastrar ventanas). */
  app.put('/api/graphs/:id/layout', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden mover sus ventanas.' });
      }
      const positions: Array<{ window_id: string; x: number; y: number }> = req.body?.positions || [];
      for (const p of positions) {
        await db.execute(sql`
          UPDATE graph_windows SET x = ${p.x}, y = ${p.y}
          WHERE graph_id = ${req.params.id} AND window_id = ${p.window_id}
        `);
      }
      res.json({ success: true, updated: positions.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Crear una ventana nueva y colocarla en un grafo (o adjuntar una existente con window_id). */
  app.post('/api/graphs/:id/windows', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden añadir ventanas.' });
      }
      const d = req.body || {};

      let windowId = d.window_id as string | undefined; // reutilizar ventana existente
      if (!windowId) {
        if (!d.title || !WINDOW_KINDS.has(d.kind)) {
          return res.status(400).json({ error: `La ventana necesita título y un tipo válido (${[...WINDOW_KINDS].join(', ')}).` });
        }
        windowId = newId('KW');
        await db.execute(sql`
          INSERT INTO knowledge_windows (id, title, kind, config, creator_user_id, is_ai_generated, created_by, updated_by)
          VALUES (${windowId}, ${d.title}, ${d.kind}, ${JSON.stringify(d.config || {})}::jsonb,
                  ${req.user!.id}, ${!!d.is_ai_generated}, ${req.user!.id}, ${req.user!.id})
        `);
      }
      await db.execute(sql`
        INSERT INTO graph_windows (graph_id, window_id, x, y)
        VALUES (${req.params.id}, ${windowId}, ${d.x ?? 0}, ${d.y ?? 0})
        ON CONFLICT (graph_id, window_id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y
      `);
      const row = await db.execute(sql`SELECT * FROM knowledge_windows WHERE id = ${windowId}`);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/windows/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const w = await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${req.params.id}`);
      if (!w.rows.length) return res.status(404).json({ error: 'Ventana no encontrada.' });
      if (!canEdit(req, (w.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador de la ventana o un administrador pueden editarla.' });
      }
      const d = req.body || {};
      await db.execute(sql`
        UPDATE knowledge_windows SET
          title = COALESCE(${d.title ?? null}, title),
          config = COALESCE(${d.config ? JSON.stringify(d.config) : null}::jsonb, config),
          version = version + 1, updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/windows/:id/view', async (req: Request, res: Response) => {
    try {
      await db.execute(sql`UPDATE knowledge_windows SET views = views + 1 WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Fijar de qué entidades de la plataforma trata un grafo (ontología). */
  app.put('/api/graphs/:id/entity-links', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden anclarlo a entidades.' });
      }
      const links: Array<{ entity_type: string; entity_id: string; relation?: string }> = req.body?.links || [];
      await db.execute(sql`DELETE FROM graph_entity_links WHERE graph_id = ${req.params.id}`);
      for (const l of links) {
        await db.execute(sql`
          INSERT INTO graph_entity_links (graph_id, entity_type, entity_id, relation)
          VALUES (${req.params.id}, ${l.entity_type}, ${l.entity_id}, ${l.relation || 'trata_sobre'})
          ON CONFLICT DO NOTHING
        `);
      }
      res.json({ success: true, count: links.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // ARISTAS
  // ==========================================================================
  app.post('/api/graphs/:id/edges', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden conectar ventanas.' });
      }
      const d = req.body || {};
      const relation = EDGE_RELATIONS.has(d.relation) ? d.relation : 'contexto';
      const insert = await db.execute(sql`
        INSERT INTO graph_edges (graph_id, from_window_id, to_window_id, relation, label, description, created_by, updated_by)
        VALUES (${req.params.id}, ${d.from_window_id || null}, ${d.to_window_id}, ${relation}, ${d.label || null},
                ${d.description || null}, ${req.user!.id}, ${req.user!.id})
        RETURNING *
      `);
      res.json(insert.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Editar los atributos de una conexión (creador del grafo o administrador). */
  app.put('/api/graphs/:id/edges/:edgeId', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden editar sus conexiones.' });
      }
      const d = req.body || {};
      const relation = d.relation && EDGE_RELATIONS.has(d.relation) ? d.relation : null;
      await db.execute(sql`
        UPDATE graph_edges SET
          relation = COALESCE(${relation}, relation),
          label = COALESCE(${d.label ?? null}, label),
          description = COALESCE(${d.description ?? null}, description),
          updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${Number(req.params.edgeId)} AND graph_id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // VALORACIÓN 0-10 (polimórfica)
  // ==========================================================================
  app.post('/api/rate', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { entity_type, entity_id, score } = req.body || {};
      const s = Number(score);
      if (!entity_type || !entity_id || !Number.isFinite(s) || s < 0 || s > 10) {
        return res.status(400).json({ error: 'Faltan entity_type/entity_id o la puntuación no está entre 0 y 10.' });
      }
      await db.execute(sql`
        INSERT INTO ratings (user_id, entity_type, entity_id, score)
        VALUES (${req.user!.id}, ${entity_type}, ${entity_id}, ${Math.round(s)})
        ON CONFLICT (user_id, entity_type, entity_id)
        DO UPDATE SET score = EXCLUDED.score, updated_at = now()
      `);
      const agg = await db.execute(sql`
        SELECT round(avg(score)::numeric, 1)::float AS avg, count(*)::int AS count
        FROM ratings WHERE entity_type = ${entity_type} AND entity_id = ${entity_id}
      `);
      res.json({ success: true, rating: agg.rows[0], my_score: Math.round(s) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // COMENTARIOS POLIMÓRFICOS (ventanas, grafos… y compatible con publicaciones)
  // ==========================================================================
  app.get('/api/comments', async (req: Request, res: Response) => {
    try {
      const { entity_type, entity_id } = req.query as any;
      if (!entity_type || !entity_id) return res.status(400).json({ error: 'Faltan entity_type y entity_id.' });
      const rows = await db.execute(sql`
        SELECT c.*, u.display_name AS author_name, u.avatar_url AS author_avatar
        FROM comments c LEFT JOIN users u ON u.id = c.author_user_id
        WHERE c.entity_type = ${entity_type} AND c.entity_id = ${entity_id} AND c.archived_at IS NULL
        ORDER BY c.created_at ASC
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/comments', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { entity_type, entity_id, body } = req.body || {};
      if (!entity_type || !entity_id || !body) return res.status(400).json({ error: 'Faltan entity_type, entity_id o el texto.' });
      const id = newId('CMT');
      await db.execute(sql`
        INSERT INTO comments (id, entity_type, entity_id, publication_id, author_user_id, body, created_by, updated_by)
        VALUES (${id}, ${entity_type}, ${entity_id},
                ${entity_type === 'publications' ? entity_id : null},
                ${req.user!.id}, ${body}, ${req.user!.id}, ${req.user!.id})
      `);
      const row = await db.execute(sql`
        SELECT c.*, u.display_name AS author_name, u.avatar_url AS author_avatar
        FROM comments c LEFT JOIN users u ON u.id = c.author_user_id WHERE c.id = ${id}
      `);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
