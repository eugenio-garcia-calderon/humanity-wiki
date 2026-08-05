import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';
import { aiReplyToComment } from './knowledge.js';

// ============================================================================
// Red Social y Mercado — Fases 4 y 5
// ============================================================================
// Implementa 06_SOCIAL_NETWORK.md y 07_MARKETPLACE.md.
//
// Principio rector (01_PRINCIPLES.md nº2 y 99_CONSTITUTION.md nº1): nada se
// crea aislado. Publicaciones, productos y demandas se enlazan al grafo en el
// mismo momento de crearse, mediante `publication_links` y las tablas de
// unión correspondientes.

const newId = (prefix: string) =>
  `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`;

/** Tipos de entidad a los que una publicación (o cualquier otra cosa) puede enlazarse. */
const LINKABLE = new Set([
  'territories', 'objectives', 'indicators', 'markers', 'metrics', 'challenges',
  'causes', 'solutions', 'needs', 'products', 'demands', 'initiatives',
  'success_cases', 'users', 'organizations', 'projects',
  'knowledge_graphs', 'knowledge_windows',
]);

export function registerSocialRoutes(app: Express, db: any) {

  const requireAuth = (req: Request, res: Response): boolean => {
    if (!req.user) {
      res.status(401).json({ error: 'Debes iniciar sesión.' });
      return false;
    }
    return true;
  };

  const requireLevel = (req: Request, res: Response, min: number): boolean => {
    if (!requireAuth(req, res)) return false;
    if ((req.user!.roleLevel ?? 0) < min) {
      res.status(403).json({ error: `Esta acción requiere nivel ${min} o superior. Tu nivel actual es ${req.user!.roleLevel}.` });
      return false;
    }
    return true;
  };

  /** Reemplaza los enlaces al grafo de una publicación. */
  const setPublicationLinks = async (publicationId: string, links: any) => {
    await db.execute(sql`DELETE FROM publication_links WHERE publication_id = ${publicationId}`);
    if (!links || typeof links !== 'object') return;
    for (const [entityType, ids] of Object.entries(links)) {
      if (!LINKABLE.has(entityType) || !Array.isArray(ids)) continue;
      for (const entityId of ids as string[]) {
        await db.execute(sql`
          INSERT INTO publication_links (publication_id, entity_type, entity_id)
          VALUES (${publicationId}, ${entityType}, ${entityId})
          ON CONFLICT DO NOTHING
        `);
      }
    }
  };

  /** Reemplaza filas de una tabla de unión simple. */
  const setLinks = async (table: string, ownerCol: string, ownerId: string, otherCol: string, ids: any) => {
    if (!Array.isArray(ids)) return;
    await db.execute(sql`DELETE FROM ${sql.raw(table)} WHERE ${sql.raw(ownerCol)} = ${ownerId}`);
    for (const v of ids) {
      await db.execute(sql`
        INSERT INTO ${sql.raw(table)} (${sql.raw(ownerCol)}, ${sql.raw(otherCol)}) VALUES (${ownerId}, ${v})
        ON CONFLICT DO NOTHING
      `);
    }
  };

  // ==========================================================================
  // PUBLICACIONES
  // ==========================================================================
  app.post('/api/publications', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const d = req.body || {};
      if (!d.body && !d.title) return res.status(400).json({ error: 'La publicación necesita texto o título.' });

      const id = newId('PUB');
      await db.execute(sql`
        INSERT INTO publications (id, author_user_id, author_organization_id, title, body, media, links, created_by, updated_by)
        VALUES (${id}, ${req.user!.id}, ${d.organization_id || null}, ${d.title || null}, ${d.body || null},
                ${JSON.stringify(d.media || [])}::jsonb, ${JSON.stringify(d.links || [])}::jsonb,
                ${req.user!.id}, ${req.user!.id})
      `);
      await setPublicationLinks(id, d.entity_links);

      // Notificar a quienes siguen las entidades mencionadas.
      await notifyFollowersOfLinks(id, req.user!.id);

      const row = await db.execute(sql`SELECT * FROM publications WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) {
      console.error('create publication error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** Avisa a los seguidores de cada entidad mencionada en la publicación. */
  const notifyFollowersOfLinks = async (publicationId: string, authorId: string) => {
    try {
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, payload, entity_type, entity_id)
        SELECT DISTINCT f.follower_user_id, 'nueva_publicacion',
               jsonb_build_object('publication_id', ${publicationId}),
               pl.entity_type, pl.entity_id
        FROM publication_links pl
        JOIN follows f ON f.entity_type = pl.entity_type AND f.entity_id = pl.entity_id
        WHERE pl.publication_id = ${publicationId} AND f.follower_user_id <> ${authorId}
      `);
    } catch (e) {
      // Una notificación fallida nunca debe impedir publicar.
      console.error('notify followers error:', e);
    }
  };

  /**
   * Editar una publicación: su autor o un administrador (petición del
   * usuario, 2026-08-05 — el administrador puede editar TODAS).
   */
  app.put('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const row = await db.execute(sql`SELECT author_user_id FROM publications WHERE id = ${req.params.id} AND archived_at IS NULL`);
      if (!row.rows.length) return res.status(404).json({ error: 'Publicación no encontrada.' });
      const isAuthor = (row.rows[0] as any).author_user_id === req.user!.id;
      const isAdmin = (req.user!.roleLevel ?? 0) >= ROLE.ADMIN;
      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: 'Solo el autor o un administrador pueden editar esta publicación.' });
      }
      const d = req.body || {};
      await db.execute(sql`
        UPDATE publications SET
          title = COALESCE(${d.title ?? null}, title),
          body = COALESCE(${d.body ?? null}, body),
          version = version + 1, updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      const updated = await db.execute(sql`SELECT * FROM publications WHERE id = ${req.params.id}`);
      res.json(updated.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/publications', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const entityType = req.query.entity_type as string | undefined;
      const entityId = req.query.entity_id as string | undefined;
      const authorId = req.query.author_id as string | undefined;

      let rows;
      if (entityType && entityId) {
        // Publicaciones de una entidad concreta (la ficha de un reto, un
        // territorio, un producto...).
        rows = await db.execute(sql`
          SELECT p.*, u.display_name AS author_name, u.avatar_url AS author_avatar
          FROM publications p
          JOIN publication_links pl ON pl.publication_id = p.id
          LEFT JOIN users u ON u.id = p.author_user_id
          WHERE pl.entity_type = ${entityType} AND pl.entity_id = ${entityId}
            AND p.archived_at IS NULL AND p.status = 'publicada'
          ORDER BY p.pinned DESC, p.created_at DESC
          LIMIT ${limit}
        `);
      } else if (authorId) {
        // Publicaciones de un autor concreto (para su perfil público).
        rows = await db.execute(sql`
          SELECT p.*, u.display_name AS author_name, u.avatar_url AS author_avatar
          FROM publications p
          LEFT JOIN users u ON u.id = p.author_user_id
          WHERE p.author_user_id = ${authorId} AND p.archived_at IS NULL AND p.status = 'publicada'
          ORDER BY p.created_at DESC
          LIMIT ${limit}
        `);
      } else {
        rows = await db.execute(sql`
          SELECT p.*, u.display_name AS author_name, u.avatar_url AS author_avatar
          FROM publications p
          LEFT JOIN users u ON u.id = p.author_user_id
          WHERE p.archived_at IS NULL AND p.status = 'publicada'
          ORDER BY p.pinned DESC, p.created_at DESC
          LIMIT ${limit}
        `);
      }

      res.json(await decoratePublications(rows.rows, req.user?.id));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Añade a cada publicación sus enlaces, contadores y si el usuario ya reaccionó. */
  const decoratePublications = async (rows: any[], userId?: string) => {
    if (!rows.length) return rows;
    const ids = rows.map(r => r.id);
    const links = await db.execute(sql`
      SELECT publication_id, entity_type, entity_id FROM publication_links
      WHERE publication_id IN ${ids}
    `);
    const reactions = await db.execute(sql`
      SELECT entity_id, count(*)::int AS n FROM reactions
      WHERE entity_type = 'publications' AND entity_id IN ${ids} GROUP BY entity_id
    `);
    const comments = await db.execute(sql`
      SELECT publication_id, count(*)::int AS n FROM comments
      WHERE publication_id IN ${ids} AND archived_at IS NULL GROUP BY publication_id
    `);
    const mine = userId
      ? await db.execute(sql`
          SELECT entity_id FROM reactions
          WHERE entity_type = 'publications' AND user_id = ${userId} AND entity_id IN ${ids}
        `)
      : { rows: [] };

    const linkMap: Record<string, any[]> = {};
    for (const l of links.rows as any[]) (linkMap[l.publication_id] ||= []).push({ type: l.entity_type, id: l.entity_id });
    const rMap = Object.fromEntries((reactions.rows as any[]).map(r => [r.entity_id, r.n]));
    const cMap = Object.fromEntries((comments.rows as any[]).map(r => [r.publication_id, r.n]));
    const mineSet = new Set((mine.rows as any[]).map(r => r.entity_id));

    return rows.map(r => ({
      ...r,
      entity_links: linkMap[r.id] || [],
      reaction_count: rMap[r.id] || 0,
      comment_count: cMap[r.id] || 0,
      reacted_by_me: mineSet.has(r.id),
    }));
  };

  /**
   * Feed personalizado (06_SOCIAL_NETWORK.md): prioriza lo que el usuario
   * sigue — personas, territorios, objetivos, indicadores, retos — y cae a lo
   * más reciente si no sigue nada todavía.
   */
  app.get('/api/feed', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 30, 100);
      if (!req.user) {
        const rows = await db.execute(sql`
          SELECT p.*, u.display_name AS author_name, u.avatar_url AS author_avatar, 0 AS relevance
          FROM publications p LEFT JOIN users u ON u.id = p.author_user_id
          WHERE p.archived_at IS NULL AND p.status = 'publicada'
          ORDER BY p.created_at DESC LIMIT ${limit}
        `);
        return res.json(await decoratePublications(rows.rows, undefined));
      }

      // Relevancia = nº de entidades seguidas que menciona, +2 si sigo al autor.
      const rows = await db.execute(sql`
        SELECT p.*, u.display_name AS author_name, u.avatar_url AS author_avatar,
          (
            SELECT count(*) FROM publication_links pl
            JOIN follows f ON f.entity_type = pl.entity_type AND f.entity_id = pl.entity_id
            WHERE pl.publication_id = p.id AND f.follower_user_id = ${req.user.id}
          )
          + CASE WHEN EXISTS (
              SELECT 1 FROM follows f2
              WHERE f2.follower_user_id = ${req.user.id}
                AND f2.entity_type = 'users' AND f2.entity_id = p.author_user_id
            ) THEN 2 ELSE 0 END AS relevance
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_user_id
        WHERE p.archived_at IS NULL AND p.status = 'publicada'
        ORDER BY relevance DESC, p.created_at DESC
        LIMIT ${limit}
      `);
      res.json(await decoratePublications(rows.rows, req.user.id));
    } catch (e: any) {
      console.error('feed error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // COMENTARIOS, REACCIONES, GUARDADOS, SEGUIR
  // ==========================================================================
  app.post('/api/publications/:id/comments', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const body = (req.body || {}).body;
      if (!body) return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
      const id = newId('CMT');
      await db.execute(sql`
        INSERT INTO comments (id, publication_id, author_user_id, parent_comment_id, body, created_by, updated_by)
        VALUES (${id}, ${req.params.id}, ${req.user!.id}, ${(req.body || {}).parent_comment_id || null}, ${body},
                ${req.user!.id}, ${req.user!.id})
      `);
      const row = await db.execute(sql`
        SELECT c.*, u.display_name AS author_name, u.avatar_url AS author_avatar
        FROM comments c LEFT JOIN users u ON u.id = c.author_user_id WHERE c.id = ${id}
      `);
      res.json(row.rows[0]);

      // La IA de Conocimiento responde también en el Muro (en segundo plano).
      if (req.user!.id !== 'U_IA_CONOCIMIENTO') {
        void aiReplyToComment(db, {
          entityType: 'publications',
          entityId: req.params.id,
          parentCommentId: id,
          userName: req.user!.displayName || 'una persona',
          userComment: body,
        });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/publications/:id/comments', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT c.*, u.display_name AS author_name, u.avatar_url AS author_avatar
        FROM comments c LEFT JOIN users u ON u.id = c.author_user_id
        WHERE c.publication_id = ${req.params.id} AND c.archived_at IS NULL
        ORDER BY c.created_at ASC
      `);
      res.json(rows.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Reaccionar es un interruptor: repetir la acción la retira.
  app.post('/api/react', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { entity_type, entity_id, kind = 'apoyo' } = req.body || {};
      if (!entity_type || !entity_id) return res.status(400).json({ error: 'Faltan entity_type y entity_id.' });
      const existing = await db.execute(sql`
        SELECT 1 FROM reactions WHERE user_id = ${req.user!.id}
          AND entity_type = ${entity_type} AND entity_id = ${entity_id} AND kind = ${kind}
      `);
      if (existing.rows.length) {
        await db.execute(sql`
          DELETE FROM reactions WHERE user_id = ${req.user!.id}
            AND entity_type = ${entity_type} AND entity_id = ${entity_id} AND kind = ${kind}
        `);
        return res.json({ reacted: false });
      }
      await db.execute(sql`
        INSERT INTO reactions (user_id, entity_type, entity_id, kind)
        VALUES (${req.user!.id}, ${entity_type}, ${entity_id}, ${kind})
      `);
      res.json({ reacted: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/save', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { entity_type, entity_id } = req.body || {};
      if (!entity_type || !entity_id) return res.status(400).json({ error: 'Faltan entity_type y entity_id.' });
      const existing = await db.execute(sql`
        SELECT 1 FROM saves WHERE user_id = ${req.user!.id} AND entity_type = ${entity_type} AND entity_id = ${entity_id}
      `);
      if (existing.rows.length) {
        await db.execute(sql`DELETE FROM saves WHERE user_id = ${req.user!.id} AND entity_type = ${entity_type} AND entity_id = ${entity_id}`);
        return res.json({ saved: false });
      }
      await db.execute(sql`INSERT INTO saves (user_id, entity_type, entity_id) VALUES (${req.user!.id}, ${entity_type}, ${entity_id})`);
      res.json({ saved: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/follow', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { entity_type, entity_id } = req.body || {};
      if (!entity_type || !entity_id) return res.status(400).json({ error: 'Faltan entity_type y entity_id.' });
      if (entity_type === 'users' && entity_id === req.user!.id) {
        return res.status(400).json({ error: 'No puedes seguirte a ti mismo.' });
      }
      const existing = await db.execute(sql`
        SELECT 1 FROM follows WHERE follower_user_id = ${req.user!.id}
          AND entity_type = ${entity_type} AND entity_id = ${entity_id}
      `);
      if (existing.rows.length) {
        await db.execute(sql`
          DELETE FROM follows WHERE follower_user_id = ${req.user!.id}
            AND entity_type = ${entity_type} AND entity_id = ${entity_id}
        `);
        return res.json({ following: false });
      }
      await db.execute(sql`
        INSERT INTO follows (follower_user_id, entity_type, entity_id)
        VALUES (${req.user!.id}, ${entity_type}, ${entity_id})
      `);
      res.json({ following: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/notifications', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const rows = await db.execute(sql`
        SELECT * FROM notifications WHERE user_id = ${req.user!.id}
        ORDER BY created_at DESC LIMIT 50
      `);
      res.json(rows.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/notifications/read', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      await db.execute(sql`UPDATE notifications SET read_at = now() WHERE user_id = ${req.user!.id} AND read_at IS NULL`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Reportar contenido: nunca borra, solo marca para revisión (principio 6).
  app.post('/api/report', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { entity_type, entity_id, reason } = req.body || {};
      await db.execute(sql`
        INSERT INTO content_reports (reporter_user_id, entity_type, entity_id, reason)
        VALUES (${req.user!.id}, ${entity_type}, ${entity_id}, ${reason || null})
      `);
      res.json({ success: true, message: 'Gracias. El contenido queda marcado para revisión.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // PERFIL PÚBLICO
  // ==========================================================================
  app.get('/api/users/:id/profile', async (req: Request, res: Response) => {
    try {
      const u = await db.execute(sql`
        SELECT id, uuid, display_name, name, avatar_url, banner_url, bio, location, website,
               socials, specialties, organization_id, reputation, impact_score, role_level, created_at
        FROM users WHERE id = ${req.params.id} AND archived_at IS NULL
      `);
      if (!u.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

      const [followers, following, pubs] = await Promise.all([
        db.execute(sql`SELECT count(*)::int AS n FROM follows WHERE entity_type = 'users' AND entity_id = ${req.params.id}`),
        db.execute(sql`SELECT count(*)::int AS n FROM follows WHERE follower_user_id = ${req.params.id}`),
        db.execute(sql`SELECT count(*)::int AS n FROM publications WHERE author_user_id = ${req.params.id} AND archived_at IS NULL`),
      ]);

      res.json({
        user: u.rows[0],
        stats: {
          followers: followers.rows[0].n,
          following: following.rows[0].n,
          publications: pubs.rows[0].n,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // MERCADO — PRODUCTOS
  // ==========================================================================
  // Crear exige nivel 2 (usuario verificado), según 06_SOCIAL_NETWORK.md.
  app.post('/api/products', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.VERIFIED)) return;
      const d = req.body || {};
      if (!d.name) return res.status(400).json({ error: 'El producto necesita un nombre.' });
      const id = d.id || newId('PRD');
      await db.execute(sql`
        INSERT INTO products (id, name, description, category, price_cents, currency, kind, modality,
                              billing_period, stock, warranty, return_policy, images, organization_id,
                              created_by, updated_by)
        VALUES (${id}, ${d.name}, ${d.description || null}, ${d.category || null},
                ${d.price_cents ?? null}, ${d.currency || 'EUR'}, ${d.kind || 'fisico'},
                ${d.modality || 'unico'}, ${d.billing_period || null}, ${d.stock ?? null},
                ${d.warranty || null}, ${d.return_policy || null},
                ${JSON.stringify(d.images || [])}::jsonb, ${d.organization_id || null},
                ${req.user!.id}, ${req.user!.id})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
          price_cents = EXCLUDED.price_cents, currency = EXCLUDED.currency, kind = EXCLUDED.kind,
          modality = EXCLUDED.modality, billing_period = EXCLUDED.billing_period,
          stock = EXCLUDED.stock, warranty = EXCLUDED.warranty, return_policy = EXCLUDED.return_policy,
          images = EXCLUDED.images, organization_id = EXCLUDED.organization_id,
          version = products.version + 1, updated_at = now(), updated_by = EXCLUDED.updated_by
      `);

      await setLinks('product_territories', 'product_id', id, 'territory_id', d.territory_ids);
      await setLinks('product_objectives',  'product_id', id, 'objective_id', d.objective_ids);
      await setLinks('product_indicators',  'product_id', id, 'indicator_id', d.indicator_ids);
      await setLinks('product_challenges',  'product_id', id, 'challenge_id', d.challenge_ids);
      await setLinks('product_solutions',   'product_id', id, 'solution_id',  d.solution_ids);
      await setLinks('product_needs',       'product_id', id, 'need_id',      d.need_ids);

      const row = await db.execute(sql`SELECT * FROM products WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) {
      console.error('create product error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/products', async (req: Request, res: Response) => {
    try {
      const { territory_id, objective_id, indicator_id, challenge_id, category, kind, q } = req.query as any;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await db.execute(sql`
        SELECT DISTINCT p.*, o.name AS organization_name
        FROM products p
        LEFT JOIN organizations o ON o.id = p.organization_id
        LEFT JOIN product_territories pt ON pt.product_id = p.id
        LEFT JOIN product_objectives po ON po.product_id = p.id
        LEFT JOIN product_indicators pi ON pi.product_id = p.id
        LEFT JOIN product_challenges pc ON pc.product_id = p.id
        WHERE p.archived_at IS NULL AND p.status = 'activo'
          AND (${territory_id ?? null}::text IS NULL OR pt.territory_id = ${territory_id ?? null})
          AND (${objective_id ?? null}::text IS NULL OR po.objective_id = ${objective_id ?? null})
          AND (${indicator_id ?? null}::text IS NULL OR pi.indicator_id = ${indicator_id ?? null})
          AND (${challenge_id ?? null}::text IS NULL OR pc.challenge_id = ${challenge_id ?? null})
          AND (${category ?? null}::text IS NULL OR p.category = ${category ?? null})
          AND (${kind ?? null}::text IS NULL OR p.kind = ${kind ?? null})
          AND (${q ?? null}::text IS NULL OR p.name ILIKE ${'%' + (q || '') + '%'})
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `);
      res.json(rows.rows);
    } catch (e: any) {
      console.error('list products error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // MERCADO — DEMANDAS
  // ==========================================================================
  app.post('/api/demands', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.VERIFIED)) return;
      const d = req.body || {};
      if (!d.title) return res.status(400).json({ error: 'La demanda necesita un título.' });
      const id = d.id || newId('DEM');
      const validStatus = ['abierta', 'en_negociacion', 'cubierta', 'cancelada'];
      const status = validStatus.includes(d.status) ? d.status : 'abierta';

      await db.execute(sql`
        INSERT INTO demands (id, title, description, budget_cents, currency, urgency, status,
                             organization_id, created_by, updated_by)
        VALUES (${id}, ${d.title}, ${d.description || null}, ${d.budget_cents ?? null},
                ${d.currency || 'EUR'}, ${d.urgency || null}, ${status},
                ${d.organization_id || null}, ${req.user!.id}, ${req.user!.id})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title, description = EXCLUDED.description,
          budget_cents = EXCLUDED.budget_cents, currency = EXCLUDED.currency,
          urgency = EXCLUDED.urgency, status = EXCLUDED.status,
          organization_id = EXCLUDED.organization_id,
          version = demands.version + 1, updated_at = now(), updated_by = EXCLUDED.updated_by
      `);

      await setLinks('demand_territories', 'demand_id', id, 'territory_id', d.territory_ids);
      await setLinks('demand_indicators',  'demand_id', id, 'indicator_id', d.indicator_ids);
      await setLinks('demand_challenges',  'demand_id', id, 'challenge_id', d.challenge_ids);
      await setLinks('demand_needs',       'demand_id', id, 'need_id',      d.need_ids);
      await setLinks('demand_products',    'demand_id', id, 'product_id',   d.product_ids);

      const row = await db.execute(sql`SELECT * FROM demands WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) {
      console.error('create demand error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/demands', async (req: Request, res: Response) => {
    try {
      const { territory_id, challenge_id, status, q } = req.query as any;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await db.execute(sql`
        SELECT DISTINCT d.*, o.name AS organization_name
        FROM demands d
        LEFT JOIN organizations o ON o.id = d.organization_id
        LEFT JOIN demand_territories dt ON dt.demand_id = d.id
        LEFT JOIN demand_challenges dc ON dc.demand_id = d.id
        WHERE d.archived_at IS NULL
          AND (${territory_id ?? null}::text IS NULL OR dt.territory_id = ${territory_id ?? null})
          AND (${challenge_id ?? null}::text IS NULL OR dc.challenge_id = ${challenge_id ?? null})
          AND (${status ?? null}::text IS NULL OR d.status = ${status ?? null})
          AND (${q ?? null}::text IS NULL OR d.title ILIKE ${'%' + (q || '') + '%'})
        ORDER BY d.created_at DESC
        LIMIT ${limit}
      `);
      res.json(rows.rows);
    } catch (e: any) {
      console.error('list demands error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // NECESIDADES
  // ==========================================================================
  app.post('/api/needs', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.VERIFIED)) return;
      const d = req.body || {};
      if (!d.title) return res.status(400).json({ error: 'La necesidad necesita un título.' });
      const id = d.id || newId('NEC');
      await db.execute(sql`
        INSERT INTO needs (id, title, description, kind, quantity, urgency, status, created_by, updated_by)
        VALUES (${id}, ${d.title}, ${d.description || null}, ${d.kind || null}, ${d.quantity || null},
                ${d.urgency || null}, ${d.status || 'abierta'}, ${req.user!.id}, ${req.user!.id})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title, description = EXCLUDED.description, kind = EXCLUDED.kind,
          quantity = EXCLUDED.quantity, urgency = EXCLUDED.urgency, status = EXCLUDED.status,
          version = needs.version + 1, updated_at = now(), updated_by = EXCLUDED.updated_by
      `);
      await setLinks('solution_needs',   'need_id', id, 'solution_id',  d.solution_ids);
      await setLinks('need_territories', 'need_id', id, 'territory_id', d.territory_ids);
      const row = await db.execute(sql`SELECT * FROM needs WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/needs', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT * FROM needs WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 100
      `);
      res.json(rows.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
