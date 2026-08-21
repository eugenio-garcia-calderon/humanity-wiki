import type { Express, Request, Response } from 'express';
import { avisar, duenoDe, avisarMenciones } from './avisos';
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
  'knowledge_graphs', 'knowledge_windows', 'user_maps',
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

      // AVISAR (2026-08-21). Va DESPUÉS de responder y sin `await` en el
      // camino de la respuesta: quien comenta no tiene que esperar a que
      // suene la campana de otro.
      const padre = (req.body || {}).parent_comment_id || null;
      void (async () => {
        if (padre) {
          // Responder avisa a quien escribió el comentario, no al dueño de la
          // publicación: son dos conversaciones distintas.
          await avisar(db, {
            paraQuien: await duenoDe(db, 'comments', padre), dePartede: req.user!.id,
            tipo: 'respuesta', entidadTipo: 'publications', entidadId: req.params.id,
            datos: { comentario: id, texto: String(body).slice(0, 140) },
          });
        } else {
          await avisar(db, {
            paraQuien: await duenoDe(db, 'publications', req.params.id), dePartede: req.user!.id,
            tipo: 'comentario', entidadTipo: 'publications', entidadId: req.params.id,
            datos: { comentario: id, texto: String(body).slice(0, 140) },
          });
        }
        await avisarMenciones(db, {
          texto: String(body), dePartede: req.user!.id,
          entidadTipo: 'publications', entidadId: req.params.id,
          datos: { comentario: id, texto: String(body).slice(0, 140) },
        });
      })();

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
      // Solo al PONER la reacción, nunca al quitarla: «a alguien ya no le
      // gusta lo tuyo» no es una noticia que nadie quiera recibir.
      void (async () => {
        await avisar(db, {
          paraQuien: await duenoDe(db, entity_type, entity_id), dePartede: req.user!.id,
          tipo: 'reaccion', entidadTipo: entity_type, entidadId: entity_id, datos: { kind },
        });
      })();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/circulos — las personas que salen arriba de la portada.
   *
   * (2026-08-21, Eugenio: «aparecerán círculos modo Instagram de las personas
   * que tienes agregadas, y si no tienes agregado a nadie te aparecen canales
   * relevantes a los que siga mucha gente».)
   *
   * DOS LISTAS DISTINTAS Y SE DICE CUÁL ES CUÁL. Si sigues a alguien, salen
   * los tuyos. Si no sigues a nadie, salen los que más publican y más
   * seguidores tienen — pero la respuesta trae `origen`, para que la pantalla
   * pueda poner «Sugerencias» encima y no hacerte creer que ya sigues a gente
   * que no conoces. Un círculo sugerido y uno tuyo se ven igual; la diferencia
   * la tiene que decir la interfaz.
   *
   * SIN INVENTAR RELEVANCIA. «Canales relevantes» aquí es, medible: cuánta
   * gente les sigue y cuánto han publicado. No hay ningún otro dato con el que
   * ordenar, y ordenar por algo que no se tiene sería fingir un criterio.
   */
  app.get('/api/circulos', async (req: Request, res: Response) => {
    try {
      const yo = req.user?.id || null;
      const conteos = sql`
        SELECT u.id, u.display_name AS nombre, u.avatar_url AS foto,
               (SELECT count(*)::int FROM follows f WHERE f.entity_type = 'users' AND f.entity_id = u.id) AS seguidores,
               (SELECT count(*)::int FROM publications p
                 WHERE p.author_user_id = u.id AND p.archived_at IS NULL AND p.deleted_at IS NULL)
             + (SELECT count(*)::int FROM knowledge_windows w
                 WHERE w.creator_user_id = u.id AND w.archived_at IS NULL AND w.deleted_at IS NULL AND w.publico) AS publicaciones
        FROM users u
      `;

      if (yo) {
        const mios = await db.execute(sql`
          WITH gente AS (${conteos})
          SELECT g.* FROM gente g
          JOIN follows f ON f.entity_type = 'users' AND f.entity_id = g.id AND f.follower_user_id = ${yo}
          ORDER BY g.publicaciones DESC, g.nombre
          LIMIT 20
        `);
        if (mios.rows.length) return res.json({ origen: 'seguidos', personas: mios.rows });
      }

      // Nadie seguido todavía: los que más se siguen y más publican. Se
      // excluye a quien mira —seguirte a ti mismo no es una sugerencia— y a
      // quien no ha publicado nada, porque un círculo vacío no lleva a ningún
      // sitio.
      const sugeridos = await db.execute(sql`
        WITH gente AS (${conteos})
        SELECT g.* FROM gente g
        WHERE (${yo}::text IS NULL OR g.id <> ${yo}) AND g.publicaciones > 0
        ORDER BY g.seguidores DESC, g.publicaciones DESC, g.nombre
        LIMIT 20
      `);
      res.json({ origen: 'sugeridos', personas: sugeridos.rows });
    } catch (e: any) {
      console.error('circulos:', e?.cause?.message || e);
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
      void (async () => {
        await avisar(db, {
          paraQuien: await duenoDe(db, entity_type, entity_id), dePartede: req.user!.id,
          tipo: 'guardado', entidadTipo: entity_type, entidadId: entity_id,
        });
      })();
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
      // Solo cuando se sigue a una PERSONA: seguir un reto o un indicador no
      // tiene a quién avisar.
      if (entity_type === 'users') {
        void avisar(db, {
          paraQuien: entity_id, dePartede: req.user!.id,
          tipo: 'seguidor', entidadTipo: 'users', entidadId: req.user!.id,
        });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LO QUE LE FALTABA A LA RED SOCIAL (2026-08-21)
  // ══════════════════════════════════════════════════════════════════════════
  // Se podía comentar, responder, reaccionar, guardar, seguir y denunciar. No
  // se podía: corregir un comentario, borrarlo, reaccionar a un comentario,
  // ver quién sigue a quién, ver lo que has guardado, ni saber cuántos avisos
  // tienes sin leer. Todo eso son cosas que la gente da por hechas y cuya
  // ausencia no se reporta como fallo: simplemente se deja de usar.

  /** Corregir un comentario propio. Una errata no debería obligar a borrar y
   *  volver a escribir, que además pierde las respuestas colgadas debajo. */
  app.put('/api/comments/:id', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const body = String((req.body || {}).body || '').trim();
      if (!body) return res.status(400).json({ error: 'El comentario no puede quedar vacío.' });
      const c = await db.execute(sql`SELECT author_user_id FROM comments WHERE id = ${req.params.id} AND archived_at IS NULL`);
      if (!c.rows.length) return res.status(404).json({ error: 'Ese comentario no existe.' });
      // Un administrador puede BORRAR lo de otro, pero no reescribirlo: poner
      // palabras en boca de alguien no es moderar.
      if ((c.rows[0] as any).author_user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Solo quien lo escribió puede editarlo.' });
      }
      await db.execute(sql`
        UPDATE comments SET body = ${body}, updated_at = now(), updated_by = ${req.user!.id},
                            version = coalesce(version, 1) + 1
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true, body, editado: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Quitar un comentario. Se ARCHIVA (regla 6 de la Constitución): las
   *  respuestas que cuelgan de él siguen existiendo y no se quedan huérfanas. */
  app.delete('/api/comments/:id', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const c = await db.execute(sql`SELECT author_user_id FROM comments WHERE id = ${req.params.id} AND archived_at IS NULL`);
      if (!c.rows.length) return res.status(404).json({ error: 'Ese comentario no existe.' });
      const suyo = (c.rows[0] as any).author_user_id === req.user!.id;
      if (!suyo && (req.user!.roleLevel ?? 0) < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Solo quien lo escribió o un administrador pueden quitarlo.' });
      }
      await db.execute(sql`UPDATE comments SET archived_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Quién sigue a alguien, y a quién sigue. Dos listas que toda red social
   *  tiene y que aquí solo existían como un número en el perfil. */
  app.get('/api/users/:id/seguidores', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT u.id, u.display_name AS nombre, u.avatar_url AS foto, f.created_at
        FROM follows f JOIN users u ON u.id = f.follower_user_id
        WHERE f.entity_type = 'users' AND f.entity_id = ${req.params.id}
        ORDER BY f.created_at DESC LIMIT 100
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/users/:id/siguiendo', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT u.id, u.display_name AS nombre, u.avatar_url AS foto, f.created_at
        FROM follows f JOIN users u ON u.id = f.entity_id
        WHERE f.entity_type = 'users' AND f.follower_user_id = ${req.params.id}
        ORDER BY f.created_at DESC LIMIT 100
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Lo que has guardado. Se podía guardar y no había forma de volver a
   *  encontrarlo: exactamente el mismo defecto que tenían los archivos. */
  app.get('/api/guardados', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      const rows = await db.execute(sql`
        SELECT s.entity_type, s.entity_id, s.created_at,
               coalesce(p.title, w.title, g.title, m.title) AS titulo,
               coalesce(u1.display_name, u2.display_name, u3.display_name, u4.display_name) AS autor
        FROM saves s
        LEFT JOIN publications p      ON s.entity_type = 'publications'      AND p.id = s.entity_id AND p.archived_at IS NULL
        LEFT JOIN knowledge_windows w ON s.entity_type = 'knowledge_windows' AND w.id = s.entity_id AND w.archived_at IS NULL
        LEFT JOIN knowledge_graphs g  ON s.entity_type = 'knowledge_graphs'  AND g.id = s.entity_id AND g.archived_at IS NULL
        LEFT JOIN user_maps m         ON s.entity_type = 'user_maps'         AND m.id = s.entity_id AND m.archived_at IS NULL
        LEFT JOIN users u1 ON u1.id = p.author_user_id
        LEFT JOIN users u2 ON u2.id = w.creator_user_id
        LEFT JOIN users u3 ON u3.id = g.creator_user_id
        LEFT JOIN users u4 ON u4.id = m.creator_user_id
        WHERE s.user_id = ${req.user!.id}
        ORDER BY s.created_at DESC LIMIT 100
      `);
      // LO QUE YA NO EXISTE SE DICE, no se esconde. Si guardaste algo y quien
      // lo escribió lo archivó, la fila sigue aquí con `titulo` a null: la
      // pantalla puede decir «ya no está» en vez de enseñar un hueco.
      res.json(rows.rows.map((r: any) => ({ ...r, existe: !!r.titulo })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Quién ha reaccionado a algo. «12 apoyos» sin poder ver quiénes es un
   *  número; con la lista es gente. */
  app.get('/api/reacciones', async (req: Request, res: Response) => {
    try {
      const { entity_type, entity_id } = req.query as any;
      if (!entity_type || !entity_id) return res.status(400).json({ error: 'Faltan entity_type y entity_id.' });
      const rows = await db.execute(sql`
        SELECT r.kind, u.id, u.display_name AS nombre, u.avatar_url AS foto, r.created_at
        FROM reactions r LEFT JOIN users u ON u.id = r.user_id
        WHERE r.entity_type = ${entity_type} AND r.entity_id = ${entity_id}
        ORDER BY r.created_at DESC LIMIT 100
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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

  /** Cuántos sin leer. Es lo único que la campana necesita saber, y pedir las
   *  50 notificaciones enteras cada minuto para contarlas sería traerse una
   *  lista para mirar un número. */
  app.get('/api/notifications/sin-leer', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.json({ n: 0 });
      const r = await db.execute(sql`
        SELECT count(*)::int AS n FROM notifications WHERE user_id = ${req.user.id} AND read_at IS NULL
      `);
      res.json({ n: (r.rows[0] as any).n });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/notifications/read', async (req: Request, res: Response) => {
    try {
      if (!requireAuth(req, res)) return;
      // Con `id` se marca UNA; sin él, todas. Marcar todas al abrir la campana
      // haría desaparecer las que no has llegado a leer.
      const uno = (req.body || {}).id;
      if (uno) {
        await db.execute(sql`
          UPDATE notifications SET read_at = now()
          WHERE id = ${Number(uno)} AND user_id = ${req.user!.id} AND read_at IS NULL
        `);
        return res.json({ success: true });
      }
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
               socials, specialties, organization_id, reputation, impact_score, role_level, created_at,
               -- Las tres ubicaciones y los objetivos elegidos (2026-08-22).
               coalesce(ubicaciones, '[]'::jsonb) AS ubicaciones,
               coalesce(objetivos,   '[]'::jsonb) AS objetivos,
               -- SOLO esta clave de los ajustes. El resto de ui_settings es
               -- privado (favoritos del navegador, anchos de panel) y sacarlo
               -- entero aquí lo publicaría sin querer.
               ui_settings->'escaparate' AS escaparate
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
  // EL ESCAPARATE DE UNA PERSONA (2026-08-20, petición de Eugenio: «Mi Perfil
  // tiene que ser un escaparate donde puedas arrastrar y soltar tus grafos,
  // proyectos, archivos, mapas y mundos, con tu muro público»).
  // ==========================================================================
  // Devuelve TODO lo que esa persona ha hecho, de las cuatro tablas donde vive,
  // en un solo formato. El orden y lo que se enseña lo decide su dueño y se
  // guarda en `users.ui_settings->'escaparate'`; aquí solo se dice qué existe.
  //
  // DOS CANDADOS, no uno. Que el dueño arrastre una ficha al escaparate NO
  // publica lo que hay detrás: una cosa privada sigue siendo privada aunque
  // esté colocada. Para quien no eres tú, esta ruta filtra por la privacidad
  // REAL de cada objeto (`status`, `publico`); el orden del dueño solo decide
  // cómo se colocan las que ya podían verse. Así, tirar de una ficha nunca
  // puede destapar sin querer un proyecto privado.
  app.get('/api/users/:id/escaparate', async (req: Request, res: Response) => {
    try {
      const de = req.params.id;
      const soyYo = req.user?.id === de || (req.user?.roleLevel ?? 0) >= ROLE.ADMIN;

      const [grafos, proyectos, mapas, mundo] = await Promise.all([
        db.execute(sql`
          SELECT g.id, g.title, g.description, g.slug, g.status, g.views, g.updated_at, g.created_at,
                 (g.center->>'personal') AS personal,
                 -- La portada: la primera imagen del lienzo y, si no tiene
                 -- ninguna, la miniatura de su primer vídeo. Misma regla que
                 -- en la lista de Grafos, para que una cosa se vea igual esté
                 -- donde esté.
                 (SELECT w.config->>'image_url' FROM graph_windows gw
                    JOIN knowledge_windows w ON w.id = gw.window_id
                   WHERE gw.graph_id = g.id AND w.kind = 'imagen'
                     AND w.config->>'image_url' IS NOT NULL
                   ORDER BY w.created_at LIMIT 1) AS portada,
                 (SELECT w.config->>'youtube_id' FROM graph_windows gw
                    JOIN knowledge_windows w ON w.id = gw.window_id
                   WHERE gw.graph_id = g.id AND w.kind = 'video'
                     AND w.config->>'youtube_id' IS NOT NULL
                   ORDER BY w.created_at LIMIT 1) AS portada_video
          FROM knowledge_graphs g
          WHERE g.creator_user_id = ${de} AND g.archived_at IS NULL AND g.deleted_at IS NULL
            AND (${soyYo} OR (g.status = 'publicado' AND coalesce(g.center->>'personal','') <> '1'))
          ORDER BY g.updated_at DESC NULLS LAST, g.created_at DESC LIMIT 60
        `),
        db.execute(sql`
          SELECT p.id, p.titulo, p.descripcion, p.slug, p.publico, p.updated_at, p.created_at,
                 (SELECT count(*)::int FROM roadmap_items r
                   WHERE r.proyecto_id = p.id AND r.archived_at IS NULL) AS tarjetas,
                 -- La primera imagen que alguien pegó en una tarjeta del
                 -- proyecto. jsonb_path_query_first mira dentro del array de
                 -- bloques sin tener que traérselo entero a Node.
                 (SELECT jsonb_path_query_first(r.bloques, '$[*] ? (@.tipo == "imagen").url') #>> '{}'
                    FROM roadmap_items r
                   WHERE r.proyecto_id = p.id AND r.archived_at IS NULL
                     AND r.bloques @? '$[*] ? (@.tipo == "imagen")'
                   ORDER BY r.orden, r.created_at LIMIT 1) AS portada
          FROM proyectos p
          WHERE p.creador_user_id = ${de} AND p.archived_at IS NULL AND p.deleted_at IS NULL
            AND (${soyYo} OR p.publico)
          ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC LIMIT 60
        `),
        db.execute(sql`
          SELECT id, title, description, slug, status, views, updated_at, created_at
          FROM user_maps
          WHERE creator_user_id = ${de} AND archived_at IS NULL AND deleted_at IS NULL
            AND (${soyYo} OR status = 'publicado')
          ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 60
        `),
        // El mundo 3D no es una lista: es UN sitio. Una sola ficha, y solo si
        // esa persona ha plantado algo en él.
        db.execute(sql`
          SELECT count(*)::int AS n, max(coalesce(updated_at, created_at)) AS cuando,
                 (SELECT url FROM game_world_items i2
                   WHERE i2.user_id = ${de} AND i2.archived_at IS NULL
                     AND i2.tipo = 'imagen' AND i2.url IS NOT NULL
                   ORDER BY i2.created_at DESC LIMIT 1) AS portada
          FROM game_world_items
          WHERE user_id = ${de} AND archived_at IS NULL AND tipo <> 'prop'
        `),
      ]);

      const corta = (t: string | null, n = 140) =>
        (t || '').replace(/\s+/g, ' ').trim().slice(0, n) || null;

      const items: any[] = [];
      for (const g of grafos.rows as any[]) {
        items.push({
          clave: `grafo:${g.id}`, tipo: 'grafo', id: g.id,
          titulo: g.title, resumen: corta(g.description),
          url: `/esquemas/${g.slug}`, fecha: g.updated_at || g.created_at,
          privado: g.status !== 'publicado' || g.personal === '1',
          dato: g.views ? `${g.views} visitas` : null,
          imagen: g.portada || (g.portada_video ? `https://i.ytimg.com/vi/${g.portada_video}/mqdefault.jpg` : null),
        });
      }
      for (const p of proyectos.rows as any[]) {
        items.push({
          clave: `proyecto:${p.id}`, tipo: 'proyecto', id: p.id,
          titulo: p.titulo, resumen: corta(p.descripcion),
          url: `/proyectos/${p.slug}`, fecha: p.updated_at || p.created_at,
          privado: !p.publico,
          dato: p.tarjetas ? `${p.tarjetas} tarjetas` : null,
          imagen: p.portada || null,
        });
      }
      for (const m of mapas.rows as any[]) {
        items.push({
          clave: `mapa:${m.id}`, tipo: 'mapa', id: m.id,
          titulo: m.title, resumen: corta(m.description),
          url: `/mapas/${m.slug}`, fecha: m.updated_at || m.created_at,
          privado: m.status !== 'publicado',
          dato: m.views ? `${m.views} visitas` : null,
          // Un mapa no guarda ninguna imagen: se queda con su color de tipo.
          imagen: null,
        });
      }
      const w = (mundo.rows[0] || {}) as any;
      if (w.n > 0) {
        items.push({
          clave: 'mundo:propio', tipo: 'mundo', id: 'mundo',
          titulo: 'Mi Mundo 3D', resumen: 'La aldea donde vive lo que voy plantando.',
          url: '/juego', fecha: w.cuando, privado: false,
          dato: `${w.n} cosas`,
          imagen: w.portada || null,
        });
      }

      items.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
      res.json({ items });
    } catch (e: any) {
      console.error('escaparate error:', e);
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

  /**
   * PUT /api/products/:id/pizarra — la landing del producto (2026-08-19,
   * petición de Eugenio). Guarda SOLO los bloques: es una ruta aparte y no un
   * campo más del POST de arriba porque se llama en cada arrastre, y meterla
   * en el upsert general reescribiría precio, fotos y enlaces cada vez que
   * alguien mueve una foto un centímetro.
   *
   * Puede editarla QUIEN LA CREÓ, o un administrador. Cualquier otro se lleva
   * un 403: una landing es la cara pública de un producto.
   */
  app.put('/api/products/:id/pizarra', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const fila = await db.execute(sql`
        SELECT created_by FROM products WHERE id = ${req.params.id} AND archived_at IS NULL
      `);
      if (!fila.rows.length) return res.status(404).json({ error: 'Ese producto no existe.' });
      const suyo = (fila.rows[0] as any).created_by === req.user.id;
      if (!suyo && (req.user.roleLevel ?? 0) < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Solo quien creó el producto puede editar su página.' });
      }
      const bloques = Array.isArray(req.body?.bloques) ? req.body.bloques : [];
      await db.execute(sql`
        UPDATE products
        SET bloques = ${JSON.stringify(bloques)}::jsonb,
            version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true, bloques });
    } catch (e: any) {
      console.error('product board error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/products/:id/proyecto  { proyecto_id }
   * Mete un producto en un proyecto, o lo saca (`null`). Es lo que hace que la
   * sección «Productos» del menú pueda colgar de cada proyecto (2026-08-20).
   *
   * DOS COMPROBACIONES, no una: que el producto sea tuyo Y que el proyecto de
   * destino también. Sin la segunda, cualquiera podría colgar sus productos del
   * proyecto de otra persona.
   */
  app.put('/api/products/:id/proyecto', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const pr = await db.execute(sql`
        SELECT created_by FROM products WHERE id = ${req.params.id} AND archived_at IS NULL
      `);
      if (!pr.rows.length) return res.status(404).json({ error: 'Ese producto no existe.' });
      const esAdmin = (req.user.roleLevel ?? 0) >= ROLE.ADMIN;
      if ((pr.rows[0] as any).created_by !== req.user.id && !esAdmin) {
        return res.status(403).json({ error: 'Ese producto no es tuyo.' });
      }

      const pedido = typeof req.body?.proyecto_id === 'string' && req.body.proyecto_id.trim()
        ? req.body.proyecto_id.trim() : null;
      let destino: string | null = null;
      if (pedido) {
        const p = await db.execute(sql`
          SELECT creador_user_id FROM proyectos WHERE id = ${pedido} AND archived_at IS NULL
        `);
        if (!p.rows.length) return res.status(404).json({ error: 'Ese proyecto no existe.' });
        if ((p.rows[0] as any).creador_user_id !== req.user.id && !esAdmin) {
          return res.status(403).json({ error: 'Ese proyecto no es tuyo.' });
        }
        destino = pedido;
      }

      await db.execute(sql`
        UPDATE products SET proyecto_id = ${destino},
          version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true, proyecto_id: destino });
    } catch (e: any) {
      console.error('product proyecto error:', e);
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
