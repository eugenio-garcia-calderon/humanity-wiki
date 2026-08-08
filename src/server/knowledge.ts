import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';
import { getProvider } from './ai/provider.js';
import { graphLimitReached } from './ai/assistant.js';
import { otorgarPuntos } from './puntos.js';

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
  'grafica', 'ficha', 'cronologia', 'autores', 'documento', 'grafo', 'texto', 'producto', 'soluciones',
  // Mi Conocimiento (2026-08-07): work items on the personal canvas.
  'tarea', 'tabla', 'proyecto',
]);

/** Días que algo permanece en la papelera antes de borrarse de verdad. */
const PAPELERA_DIAS = 15;

const EDGE_RELATIONS = new Set(['contexto', 'causa', 'dato', 'fuente', 'apoya', 'contradice', 'matiza']);

/**
 * La IA de Conocimiento responde a cada comentario humano (petición del
 * usuario, 2026-08-05): la persona se siente respondida al instante y recibe
 * matices si su punto de vista es incompleto — antídoto de desinformación.
 * Se ejecuta en segundo plano (fire-and-forget): nunca bloquea ni rompe el
 * comentario original. Firma siempre como U_IA_CONOCIMIENTO.
 */
export async function aiReplyToComment(db: any, opts: {
  entityType: string;
  entityId: string;
  parentCommentId: string;
  userName: string;
  userComment: string;
}) {
  try {
    const provider = getProvider();
    if (!provider.isReady()) return;

    // Contexto real de aquello que se comenta.
    let contextText = '';
    if (opts.entityType === 'knowledge_windows') {
      const w = await db.execute(sql`SELECT title, kind, config FROM knowledge_windows WHERE id = ${opts.entityId}`);
      if (w.rows.length) {
        const win = w.rows[0] as any;
        const c = win.config || {};
        contextText = `Ventana de conocimiento "${win.title}" (tipo ${win.kind}). Contenido: ${(c.body || c.excerpt || c.quote || c.description || c.caption || '').slice(0, 800)}`;
      }
    } else if (opts.entityType === 'graph_edges') {
      const e = await db.execute(sql`SELECT relation, label, description FROM graph_edges WHERE id = ${Number(opts.entityId)}`);
      if (e.rows.length) {
        const ed = e.rows[0] as any;
        contextText = `Conexión de un grafo de conocimiento (relación "${ed.relation}"${ed.label ? `, etiqueta "${ed.label}"` : ''}). Significado: ${(ed.description || '').slice(0, 600)}`;
      }
    } else if (opts.entityType === 'publications') {
      const p = await db.execute(sql`SELECT title, body FROM publications WHERE id = ${opts.entityId}`);
      if (p.rows.length) {
        const pub = p.rows[0] as any;
        contextText = `Publicación "${pub.title || 'sin título'}": ${(pub.body || '').slice(0, 800)}`;
      }
    }

    const result = await provider.complete({
      system: `Eres la IA de Conocimiento de la plataforma "Humanity.wiki". Respondes brevemente (2-4 frases, español) al comentario de una persona sobre un contenido. Reglas: agradece o reconoce lo válido de su punto; aporta UN matiz, dato o perspectiva que le falte, con honestidad y sin condescendencia; si afirma algo incorrecto, corrígelo con delicadeza citando en qué se basa la corrección; nunca inventes cifras; termina invitando a seguir explorando el grafo. No uses markdown.`,
      messages: [{ role: 'user', content: `CONTENIDO COMENTADO:\n${contextText || '(sin contexto disponible)'}\n\nCOMENTARIO DE ${opts.userName}:\n${opts.userComment.slice(0, 600)}` }],
      maxTokens: 300,
      temperature: 0.4,
    });
    const reply = result.text.trim();
    if (!reply) return;

    const id = `CMT${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
    await db.execute(sql`
      INSERT INTO comments (id, entity_type, entity_id, publication_id, parent_comment_id, author_user_id, body, created_by, updated_by)
      VALUES (${id}, ${opts.entityType}, ${opts.entityId},
              ${opts.entityType === 'publications' ? opts.entityId : null},
              ${opts.parentCommentId}, 'U_IA_CONOCIMIENTO', ${reply},
              'U_IA_CONOCIMIENTO', 'U_IA_CONOCIMIENTO')
    `);
  } catch (e) {
    console.error('aiReplyToComment error:', e);
  }
}

/**
 * Organiza automáticamente las publicaciones del usuario en carpetas
 * temáticas: le pide a la IA que las lea y las agrupe, crea las carpetas
 * que falten y las rellena. La usa tanto el botón «Ordenar con IA» como la
 * acción ORGANIZAR_CARPETAS del asistente de chat.
 */
export const autoOrganizarCarpetas = async (db: any, userId: string): Promise<{ ok: true; carpetas: { nombre: string; piezas: number }[] } | { ok: false; error: string }> => {
  const ventanas = await db.execute(sql`
    SELECT w.id, w.title, w.kind, g.title AS grafo_titulo
    FROM knowledge_windows w JOIN graph_windows gw ON gw.window_id = w.id JOIN knowledge_graphs g ON g.id = gw.graph_id
    WHERE w.creator_user_id = ${userId} AND w.archived_at IS NULL AND w.deleted_at IS NULL
    ORDER BY w.created_at DESC LIMIT 60
  `);
  const lienzos = await db.execute(sql`
    SELECT id, title FROM knowledge_graphs
    WHERE creator_user_id = ${userId} AND archived_at IS NULL AND deleted_at IS NULL
      AND coalesce(center->>'personal','') <> '1'
    ORDER BY created_at DESC LIMIT 30
  `);
  const proyectos = await db.execute(sql`
    SELECT id, titulo AS title FROM proyectos
    WHERE creador_user_id = ${userId} AND archived_at IS NULL AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 30
  `);
  const mapas = await db.execute(sql`
    SELECT id, title FROM user_maps
    WHERE creator_user_id = ${userId} AND archived_at IS NULL AND deleted_at IS NULL
    ORDER BY created_at DESC LIMIT 30
  `);

  const candidatas = [
    ...(ventanas.rows as any[]).map(w => ({ tipo: 'ventana', id: w.id, texto: `${w.title} (${w.kind}, en «${w.grafo_titulo}»)` })),
    ...(lienzos.rows as any[]).map(g => ({ tipo: 'lienzo', id: g.id, texto: `${g.title} (lienzo)` })),
    ...(proyectos.rows as any[]).map(p => ({ tipo: 'proyecto', id: p.id, texto: `${p.title} (proyecto)` })),
    ...(mapas.rows as any[]).map(m => ({ tipo: 'mapa', id: m.id, texto: `${m.title} (mapa)` })),
  ];
  if (!candidatas.length) return { ok: false, error: 'Todavía no tienes publicaciones que organizar.' };

  const provider = getProvider();
  const listado = candidatas.map((c, i) => `${i}. [${c.tipo}] ${c.texto}`).join('\n');
  const system = `Agrupas por TEMA una lista de publicaciones de una persona. Devuelve SOLO un JSON válido, sin explicación ni bloque de código, con esta forma exacta:
{"carpetas": [{"nombre": "Salud", "indices": [0, 4, 7]}, ...]}
Reglas: nombres de carpeta cortos (una o dos palabras, en español, con mayúscula inicial, p. ej. "Vivienda", "Incendios", "Retos"). Como máximo 8 carpetas. Cada índice puede aparecer en más de una carpeta si de verdad encaja en varios temas. No dejes fuera algo por no encajar bien: mételo en la carpeta más cercana. No inventes índices que no existan en la lista.`;
  let texto = '';
  try {
    const result = await provider.complete({ system, messages: [{ role: 'user', content: listado }] });
    texto = result.text;
  } catch (e: any) {
    return { ok: false, error: `La IA no ha podido clasificar: ${e.message}` };
  }

  let parsed: { carpetas: { nombre: string; indices: number[] }[] };
  try {
    const m = texto.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : texto);
  } catch {
    return { ok: false, error: 'La IA no ha devuelto una clasificación legible. Inténtalo de nuevo.' };
  }
  if (!Array.isArray(parsed?.carpetas)) return { ok: false, error: 'La IA no ha devuelto carpetas.' };

  const resumen: { nombre: string; piezas: number }[] = [];
  for (const grupo of parsed.carpetas) {
    const nombre = String(grupo?.nombre || '').trim().slice(0, 40);
    const indices = Array.isArray(grupo?.indices) ? grupo.indices : [];
    if (!nombre || !indices.length) continue;

    const existente = await db.execute(sql`SELECT id FROM carpetas WHERE user_id = ${userId} AND lower(nombre) = ${nombre.toLowerCase()}`);
    let carpetaId = (existente.rows[0] as any)?.id as string | undefined;
    if (!carpetaId) {
      carpetaId = newId('CAR');
      const orden = await db.execute(sql`SELECT coalesce(max(orden), -1) + 1 AS n FROM carpetas WHERE user_id = ${userId}`);
      await db.execute(sql`
        INSERT INTO carpetas (id, user_id, nombre, orden) VALUES (${carpetaId}, ${userId}, ${nombre}, ${(orden.rows[0] as any).n})
      `);
    }
    let metidas = 0;
    for (const i of indices) {
      const c = candidatas[i];
      if (!c) continue;
      await db.execute(sql`
        INSERT INTO carpeta_publicaciones (carpeta_id, tipo, entity_id, added_by)
        VALUES (${carpetaId}, ${c.tipo}, ${c.id}, ${userId})
        ON CONFLICT DO NOTHING
      `);
      metidas++;
    }
    if (metidas) resumen.push({ nombre, piezas: metidas });
  }
  return { ok: true, carpetas: resumen };
};

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
      // ?challenge=R021 — solo los grafos anclados a ese reto (sus VISTAS).
      const challengeId = (req.query.challenge as string) || null;
      const rows = await db.execute(sql`
        SELECT g.id, g.title, g.slug, g.description, g.status, g.is_ai_generated, g.views,
               g.created_at, g.center, u.display_name AS creator_name, u.avatar_url AS creator_avatar,
               (SELECT count(*)::int FROM graph_windows gw WHERE gw.graph_id = g.id) AS window_count,
               (SELECT w.config->>'image_url' FROM graph_windows gw JOIN knowledge_windows w ON w.id = gw.window_id
                 WHERE gw.graph_id = g.id AND w.kind = 'imagen' AND w.config->>'image_url' IS NOT NULL
                 ORDER BY w.created_at LIMIT 1) AS cover_image,
               (SELECT w.config->>'youtube_id' FROM graph_windows gw JOIN knowledge_windows w ON w.id = gw.window_id
                 WHERE gw.graph_id = g.id AND w.kind = 'video' AND w.config->>'youtube_id' IS NOT NULL
                 ORDER BY w.created_at LIMIT 1) AS cover_video_id,
               EXISTS(SELECT 1 FROM graph_entity_links gel
                 WHERE gel.graph_id = g.id AND gel.entity_type = 'challenges') AS is_reto,
               -- Retos a los que está anclado: el explorador del mapa empareja
               -- cada reto con su grafo para previsualizarlo, sin una consulta
               -- por reto.
               (SELECT coalesce(array_agg(gel3.entity_id), '{}')
                  FROM graph_entity_links gel3
                 WHERE gel3.graph_id = g.id AND gel3.entity_type = 'challenges') AS challenge_ids
        FROM knowledge_graphs g
        LEFT JOIN users u ON u.id = g.creator_user_id
        WHERE g.archived_at IS NULL AND g.deleted_at IS NULL
          -- Los lienzos personales (Mi Conocimiento) no son parte del común.
          AND coalesce(g.center->>'personal','') <> '1'
          AND (${creatorId}::text IS NULL OR g.creator_user_id = ${creatorId})
          AND (${challengeId}::text IS NULL OR EXISTS (
            SELECT 1 FROM graph_entity_links gel2
            WHERE gel2.graph_id = g.id AND gel2.entity_type = 'challenges' AND gel2.entity_id = ${challengeId}))
          AND (g.status = 'publicado' OR g.creator_user_id = ${req.user?.id || null}
               OR ${(req.user?.roleLevel ?? 0) >= ROLE.ADMIN})
        ORDER BY g.views DESC, g.created_at DESC
        LIMIT 60
      `);
      const { agg } = await ratingsFor('knowledge_graphs', (rows.rows as any[]).map(r => r.id));
      let out = (rows.rows as any[]).map(r => ({ ...r, rating: agg[r.id] || null }));

      // ?with_windows=1 — la PIZARRA INFINITA necesita las ventanas de todos
      // los grafos a la vez para desplegarlas al hacer zoom, sin navegar.
      if (req.query.with_windows === '1' && out.length) {
        const ids = out.map(r => r.id);
        const wins = await db.execute(sql`
          SELECT gw.graph_id, w.id, w.title, w.kind, w.config, w.is_ai_generated, gw.x, gw.y
          FROM graph_windows gw JOIN knowledge_windows w ON w.id = gw.window_id
          WHERE gw.graph_id IN ${ids} AND w.archived_at IS NULL AND w.deleted_at IS NULL
        `);
        const byGraph: Record<string, any[]> = {};
        for (const w of wins.rows as any[]) (byGraph[w.graph_id] ||= []).push(w);

        // Las aristas del CENTRO llevan la categoría de conocimiento
        // (contexto, causa, dato…): son los círculos de relación que la
        // Esfera dibuja entre el grafo y cada publicación.
        const eds = await db.execute(sql`
          SELECT graph_id, id, from_window_id, to_window_id, relation, label
          FROM graph_edges WHERE graph_id IN ${ids}
        `);
        const edgesByGraph: Record<string, any[]> = {};
        for (const e of eds.rows as any[]) (edgesByGraph[e.graph_id] ||= []).push(e);

        out = out.map(r => ({ ...r, windows: byGraph[r.id] || [], edges: edgesByGraph[r.id] || [] }));
      }
      res.json(out);
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
        FROM knowledge_graphs WHERE archived_at IS NULL AND deleted_at IS NULL AND status = 'publicado'
          AND coalesce(center->>'personal','') <> '1'
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

  /**
   * GET /api/publications/resolve?q=…
   * Cuando la pregunta del usuario coincide fuertemente con una publicación
   * EXISTENTE, el chat no genera una respuesta nueva: abre esa publicación en
   * un pop-up central, junto con los grafos donde está enlazada (petición del
   * usuario, 2026-08-05 — la plataforma responde con su conocimiento real).
   */
  app.get('/api/publications/resolve', async (req: Request, res: Response) => {
    try {
      const q = normalize(String(req.query.q || ''));
      if (q.length < 4) return res.json({ query: q, matches: [], confident: false });
      const words = [...new Set(q.split(/\s+/).filter(w => w.length > 3))];
      if (!words.length) return res.json({ query: q, matches: [], confident: false });

      const pubs = await db.execute(sql`
        SELECT p.id, p.title, p.body, p.created_at, p.author_user_id,
               u.display_name AS author_name
        FROM publications p LEFT JOIN users u ON u.id = p.author_user_id
        WHERE p.archived_at IS NULL AND p.status = 'publicada'
      `);

      const scored = (pubs.rows as any[]).map(p => {
        const title = normalize(p.title || '');
        const body = normalize(p.body || '');
        let score = 0;
        for (const w of words) {
          if (title.includes(w)) score += 3;
          else if (body.includes(w)) score += 1;
        }
        return { p, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

      const matches = [];
      for (const { p, score } of scored) {
        // Grafos donde aparece: como ventana de tipo publicación o enlazada.
        const graphs = await db.execute(sql`
          SELECT DISTINCT g.slug, g.title FROM knowledge_windows w
          JOIN graph_windows gw ON gw.window_id = w.id
          JOIN knowledge_graphs g ON g.id = gw.graph_id AND g.status = 'publicado' AND g.archived_at IS NULL
          WHERE w.kind = 'publicacion' AND w.config->>'publication_id' = ${p.id} AND w.archived_at IS NULL
          UNION
          SELECT g.slug, g.title FROM publication_links pl
          JOIN knowledge_graphs g ON g.id = pl.entity_id AND g.status = 'publicado' AND g.archived_at IS NULL
          WHERE pl.publication_id = ${p.id} AND pl.entity_type = 'knowledge_graphs'
        `);
        matches.push({ publication: p, score, graphs: graphs.rows });
      }

      res.json({ query: q, matches, confident: matches.length > 0 && matches[0].score >= 5 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // MAPAS DE USUARIO (Fase 12) — vistas del mapa publicadas a nombre de una
  // persona, indexadas y valorables. La config dice qué carga el mapa.
  // ==========================================================================
  app.get('/api/maps', async (req: Request, res: Response) => {
    try {
      const creatorId = (req.query.creator_id as string) || null;
      const rows = await db.execute(sql`
        SELECT m.id, m.title, m.slug, m.description, m.config, m.status, m.is_ai_generated, m.views,
               m.created_at, u.display_name AS creator_name
        FROM user_maps m LEFT JOIN users u ON u.id = m.creator_user_id
        WHERE m.archived_at IS NULL AND m.deleted_at IS NULL
          AND (${creatorId}::text IS NULL OR m.creator_user_id = ${creatorId})
          AND (m.status = 'publicado' OR m.creator_user_id = ${req.user?.id || null}
               OR ${(req.user?.roleLevel ?? 0) >= ROLE.ADMIN})
        ORDER BY m.views DESC, m.created_at DESC
        LIMIT 60
      `);
      const { agg } = await ratingsFor('user_maps', (rows.rows as any[]).map(r => r.id));
      res.json((rows.rows as any[]).map(r => ({ ...r, rating: agg[r.id] || null })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/maps/:slug', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT m.*, u.display_name AS creator_name
        FROM user_maps m LEFT JOIN users u ON u.id = m.creator_user_id
        WHERE (m.slug = ${req.params.slug} OR m.id = ${req.params.slug})
          AND m.archived_at IS NULL AND m.deleted_at IS NULL
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Mapa no encontrado.' });
      const map = r.rows[0] as any;
      if (map.status !== 'publicado' && !canEdit(req, map.creator_user_id)) {
        return res.status(404).json({ error: 'Mapa no encontrado.' });
      }
      const { agg, mine } = await ratingsFor('user_maps', [map.id], req.user?.id);
      db.execute(sql`UPDATE user_maps SET views = views + 1 WHERE id = ${map.id}`).catch(() => {});
      res.json({ ...map, rating: agg[map.id] || null, my_score: mine[map.id] ?? null, can_edit: canEdit(req, map.creator_user_id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/maps', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const limitMsg = await graphLimitReached(db, req.user!.id, req.user!.roleLevel ?? 0, 'user_maps');
      if (limitMsg) return res.status(403).json({ error: limitMsg });
      const d = req.body || {};
      if (!d.title) return res.status(400).json({ error: 'El mapa necesita un título.' });
      const id = newId('UM');
      const slug = normalize(String(d.slug || d.title)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id.toLowerCase();
      await db.execute(sql`
        INSERT INTO user_maps (id, title, slug, description, creator_user_id, config, trigger_keywords, status, created_by, updated_by)
        VALUES (${id}, ${d.title}, ${slug}, ${d.description || null}, ${req.user!.id},
                ${JSON.stringify(d.config || {})}::jsonb, ${JSON.stringify(d.trigger_keywords || [])}::jsonb,
                ${d.status || 'publicado'}, ${req.user!.id}, ${req.user!.id})
      `);
      res.json({ id, slug });
    } catch (e: any) {
      if (String(e.message).includes('unique')) return res.status(400).json({ error: 'Ya existe un mapa con ese título/slug.' });
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // DETALLE COMPLETO DE UN GRAFO
  // ==========================================================================
  app.get('/api/graphs/:slug', async (req: Request, res: Response) => {
    try {
      const g = await db.execute(sql`
        SELECT g.*, u.display_name AS creator_name, u.avatar_url AS creator_avatar
        FROM knowledge_graphs g LEFT JOIN users u ON u.id = g.creator_user_id
        WHERE (g.slug = ${req.params.slug} OR g.id = ${req.params.slug})
          AND g.archived_at IS NULL AND g.deleted_at IS NULL
      `);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      const graph = g.rows[0] as any;
      if (graph.status !== 'publicado' && !canEdit(req, graph.creator_user_id)) {
        return res.status(404).json({ error: 'Grafo no encontrado.' });
      }

      const windows = await db.execute(sql`
        SELECT w.*, gw.x, gw.y, gw.w, gw.h, gw.rot, gw.z, gw.locked,
               u.display_name AS creator_name, u.avatar_url AS creator_avatar
        FROM graph_windows gw
        JOIN knowledge_windows w ON w.id = gw.window_id
        LEFT JOIN users u ON u.id = w.creator_user_id
        WHERE gw.graph_id = ${graph.id} AND w.archived_at IS NULL AND w.deleted_at IS NULL
          -- Una pieza marcada como privada solo la ve quien la escribió.
          AND (w.publico OR w.creator_user_id = ${req.user?.id || null}::text
               OR ${(req.user?.roleLevel ?? 0) >= ROLE.ADMIN})
      `);
      const edges = await db.execute(sql`
        SELECT e.id, e.from_window_id, e.to_window_id, e.relation, e.label, e.style, e.layout, e.locked,
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
      const limitMsg = await graphLimitReached(db, req.user!.id, req.user!.roleLevel ?? 0, 'knowledge_graphs');
      if (limitMsg) return res.status(403).json({ error: limitMsg });
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
      // Cada campo es opcional: mover manda solo x/y, redimensionar manda w/h,
      // rotar manda rot… y COALESCE deja intacto lo que no viaja.
      const positions: Array<{
        window_id: string; x?: number; y?: number;
        w?: number | null; h?: number | null; rot?: number; z?: number; locked?: boolean;
      }> = req.body?.positions || [];
      for (const p of positions) {
        await db.execute(sql`
          UPDATE graph_windows SET
            x      = COALESCE(${p.x ?? null}, x),
            y      = COALESCE(${p.y ?? null}, y),
            w      = CASE WHEN ${p.w === null} THEN NULL ELSE COALESCE(${p.w ?? null}, w) END,
            h      = CASE WHEN ${p.h === null} THEN NULL ELSE COALESCE(${p.h ?? null}, h) END,
            rot    = COALESCE(${p.rot ?? null}, rot),
            z      = COALESCE(${p.z ?? null}, z),
            locked = COALESCE(${p.locked ?? null}, locked)
          WHERE graph_id = ${req.params.id} AND window_id = ${p.window_id}
        `);
      }
      res.json({ success: true, updated: positions.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // LIENZO ESTILO MIRO (2026-08-08, petición del usuario)
  // ==========================================================================

  /**
   * DELETE /api/graphs/:id/windows/:windowId
   * QUITAR DEL LIENZO: se borra la colocación, no el conocimiento. La ventana
   * sigue viva en la base de datos y en los demás lienzos donde esté — que es
   * justo lo que permite conectar sin duplicar.
   */
  app.delete('/api/graphs/:id/windows/:windowId', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden quitar sus ventanas.' });
      }
      // Las conexiones de esa ventana en ESTE lienzo se van con ella.
      await db.execute(sql`
        DELETE FROM graph_edges
        WHERE graph_id = ${req.params.id}
          AND (from_window_id = ${req.params.windowId} OR to_window_id = ${req.params.windowId})
      `);
      await db.execute(sql`
        DELETE FROM graph_windows
        WHERE graph_id = ${req.params.id} AND window_id = ${req.params.windowId}
      `);
      const resto = await db.execute(sql`
        SELECT count(*)::int AS n FROM graph_windows WHERE window_id = ${req.params.windowId}
      `);
      res.json({ success: true, sigueEnOtrosLienzos: (resto.rows[0] as any).n });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * POST /api/windows/:id/papelera  y  /restaurar
   * PAPELERA (decisión del usuario, 2026-08-08): borrar de verdad manda la
   * ventana a la papelera; a los 15 días se elimina definitivamente. Es una
   * excepción consciente a la regla 6 de la Constitución («archivar, nunca
   * borrar»), registrada en memory/03_DECISIONS.md.
   */
  app.post('/api/windows/:id/papelera', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const w = await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${req.params.id}`);
      if (!w.rows.length) return res.status(404).json({ error: 'Ventana no encontrada.' });
      if (!canEdit(req, (w.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo quien la creó (o un administrador) puede borrarla.' });
      }
      await db.execute(sql`
        UPDATE knowledge_windows SET deleted_at = now(), updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true, diasParaBorradoDefinitivo: PAPELERA_DIAS });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/windows/:id/restaurar', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const w = await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${req.params.id}`);
      if (!w.rows.length) return res.status(404).json({ error: 'Ventana no encontrada.' });
      if (!canEdit(req, (w.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo quien la creó (o un administrador) puede restaurarla.' });
      }
      await db.execute(sql`
        UPDATE knowledge_windows SET deleted_at = NULL, updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * GET /api/papelera — lo que borraste y cuántos días le quedan.
   * Los cinco tipos en una sola lista: para quien la mira, todo lo que ha
   * tirado está en el mismo sitio, venga de la tabla que venga.
   */
  app.get('/api/papelera', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const esAdmin = (req.user!.roleLevel ?? 0) >= ROLE.ADMIN;
      const yo = req.user!.id;
      const dias = sql`${PAPELERA_DIAS} - floor(extract(epoch FROM now() - t.deleted_at) / 86400)::int`;
      const rows = await db.execute(sql`
        SELECT * FROM (
          SELECT 'ventana' AS tipo, t.id, t.title AS titulo, t.kind, t.config, t.deleted_at,
                 ${dias} AS dias_restantes, u.display_name AS autor_nombre
          FROM knowledge_windows t LEFT JOIN users u ON u.id = t.creator_user_id
          WHERE t.deleted_at IS NOT NULL AND (${esAdmin} OR t.creator_user_id = ${yo})
          UNION ALL
          SELECT 'lienzo', t.id, t.title, 'grafo',
                 jsonb_build_object('title', t.title, 'description', t.description, 'graph_slug', t.slug),
                 t.deleted_at, ${dias}, u.display_name
          FROM knowledge_graphs t LEFT JOIN users u ON u.id = t.creator_user_id
          WHERE t.deleted_at IS NOT NULL AND (${esAdmin} OR t.creator_user_id = ${yo})
          UNION ALL
          SELECT 'mapa', t.id, t.title, 'mapa',
                 jsonb_build_object('title', t.title, 'description', t.description),
                 t.deleted_at, ${dias}, u.display_name
          FROM user_maps t LEFT JOIN users u ON u.id = t.creator_user_id
          WHERE t.deleted_at IS NOT NULL AND (${esAdmin} OR t.creator_user_id = ${yo})
          UNION ALL
          SELECT 'proyecto', t.id, t.titulo, 'proyecto',
                 jsonb_build_object('goal', t.descripcion),
                 t.deleted_at, ${dias}, u.display_name
          FROM proyectos t LEFT JOIN users u ON u.id = t.creador_user_id
          WHERE t.deleted_at IS NOT NULL AND (${esAdmin} OR t.creador_user_id = ${yo})
          UNION ALL
          SELECT 'muro', t.id, coalesce(t.title, left(t.body, 70)), 'publicacion',
                 jsonb_build_object('body', t.body),
                 t.deleted_at, ${dias}, u.display_name
          FROM publications t LEFT JOIN users u ON u.id = t.author_user_id
          WHERE t.deleted_at IS NOT NULL AND (${esAdmin} OR t.author_user_id = ${yo})
        ) q
        ORDER BY q.deleted_at DESC
        LIMIT 200
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // MI CONOCIMIENTO — the personal infinite canvas (2026-08-07, user request)
  // ==========================================================================

  /**
   * POST /api/knowledge/personal
   * Ensures the logged-in user's personal canvas exists and returns it.
   * It is a normal knowledge graph marked center.personal = '1':
   *  - the CENTER is the user (their branch root: everything they create
   *    hangs from them, "creado por <name>"),
   *  - status 'borrador' so it never surfaces in the common space,
   *  - one per user, with a deterministic slug.
   */
  app.post('/api/knowledge/personal', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const existing = await db.execute(sql`
        SELECT id, slug, title FROM knowledge_graphs
        WHERE creator_user_id = ${req.user!.id} AND center->>'personal' = '1' AND archived_at IS NULL
        LIMIT 1
      `);
      if (existing.rows.length) return res.json(existing.rows[0]);

      const id = newId('KG');
      const name = req.user!.displayName || 'Mi espacio';
      const slug = `mi-conocimiento-${normalize(req.user!.id).replace(/[^a-z0-9]+/g, '-')}`;
      const center = {
        personal: '1',
        category: name,
        variable: 'Mi Conocimiento',
        short: name.split(' ')[0] || 'Yo',
      };
      await db.execute(sql`
        INSERT INTO knowledge_graphs (id, title, slug, description, center, creator_user_id,
                                      trigger_keywords, status, is_ai_generated, created_by, updated_by)
        VALUES (${id}, ${'Conocimiento de ' + name}, ${slug},
                ${'El lienzo personal de ' + name + ': todo lo que crea cuelga de su nombre.'},
                ${JSON.stringify(center)}::jsonb, ${req.user!.id},
                '[]'::jsonb, 'borrador', false, ${req.user!.id}, ${req.user!.id})
      `);
      const row = await db.execute(sql`SELECT id, slug, title FROM knowledge_graphs WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * GET /api/publicaciones[?autor=U_…][&q=…]
   * TODO lo publicado en la plataforma, de todo el mundo, en un solo listado:
   * las ventanas de conocimiento de los grafos públicos, las publicaciones del
   * muro y —desde 2026-08-08— los lienzos y los proyectos en sí, que también
   * son cosas que la gente publica, no solo contenedores de lo que cuelga
   * dentro. Es lo que alimenta «Explorar» y «Mis publicaciones».
   * Los lienzos personales quedan fuera salvo que pidas los tuyos.
   */
  app.get('/api/publicaciones', async (req: Request, res: Response) => {
    try {
      const autor = (req.query.autor as string) || null;
      const q = (req.query.q as string || '').trim();
      const like = q ? `%${q}%` : null;
      const limit = Math.min(Number(req.query.limit) || 120, 300);
      const usuarioId = req.user?.id || null;
      const esAdmin = (req.user?.roleLevel ?? 0) >= ROLE.ADMIN;
      // Solo el dueño ve lo suyo de su lienzo personal.
      const incluirPersonales = !!autor && autor === req.user?.id;

      const ventanas = await db.execute(sql`
        SELECT DISTINCT ON (w.id)
               w.id, w.title, w.kind, w.config, w.views, w.is_ai_generated, w.created_at,
               w.publico, w.creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               g.slug AS grafo_slug, g.title AS grafo_titulo,
               coalesce(g.center->>'personal','') = '1' AS es_personal,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM knowledge_windows w
        JOIN graph_windows gw ON gw.window_id = w.id
        JOIN knowledge_graphs g ON g.id = gw.graph_id
        LEFT JOIN users u ON u.id = w.creator_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'ventana' AND pm.entity_id = w.id
        WHERE w.archived_at IS NULL AND w.deleted_at IS NULL
          AND g.archived_at IS NULL AND g.deleted_at IS NULL
          AND (${incluirPersonales} OR (g.status = 'publicado' AND coalesce(g.center->>'personal','') <> '1'))
          AND (w.publico OR w.creator_user_id = ${usuarioId}::text)
          AND (${autor}::text IS NULL OR w.creator_user_id = ${autor})
          AND (${like}::text IS NULL OR w.title ILIKE ${like} OR w.config->>'body' ILIKE ${like})
        ORDER BY w.id, w.created_at DESC
        LIMIT ${limit}
      `);

      const muro = await db.execute(sql`
        SELECT p.id, p.title, p.body, p.created_at, p.visibility, p.author_user_id AS creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'muro' AND pm.entity_id = p.id
        WHERE p.archived_at IS NULL AND p.deleted_at IS NULL
          -- Las filas que ya había usan 'publica'; se considera privado solo
          -- lo marcado explícitamente como tal, para no ocultar nada por un
          -- valor antiguo o vacío.
          AND (coalesce(p.visibility,'publica') <> 'privada' OR p.author_user_id = ${usuarioId}::text)
          AND (${autor}::text IS NULL OR p.author_user_id = ${autor})
          AND (${like}::text IS NULL OR p.title ILIKE ${like} OR p.body ILIKE ${like})
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `);

      // Un lienzo es en sí mismo una publicación: es lo que la persona ha
      // construido, no solo el contenedor de lo que cuelga dentro.
      const lienzos = await db.execute(sql`
        SELECT g.id, g.slug, g.title, g.description, g.views, g.created_at, g.status,
               g.is_ai_generated, g.creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               coalesce(g.center->>'personal','') = '1' AS es_personal,
               (SELECT count(*)::int FROM graph_windows gw WHERE gw.graph_id = g.id) AS piezas,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM knowledge_graphs g
        LEFT JOIN users u ON u.id = g.creator_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'lienzo' AND pm.entity_id = g.id
        WHERE g.archived_at IS NULL AND g.deleted_at IS NULL
          AND (g.status = 'publicado' OR g.creator_user_id = ${usuarioId}::text)
          AND (${incluirPersonales} OR coalesce(g.center->>'personal','') <> '1')
          AND (${autor}::text IS NULL OR g.creator_user_id = ${autor})
          AND (${like}::text IS NULL OR g.title ILIKE ${like} OR g.description ILIKE ${like})
        ORDER BY g.created_at DESC
        LIMIT ${limit}
      `);

      const proyectos = await db.execute(sql`
        SELECT p.id, p.slug, p.titulo, p.descripcion, p.vision, p.publico, p.created_at,
               p.creador_user_id AS creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               (SELECT count(*)::int FROM roadmap_items r WHERE r.proyecto_id = p.id) AS tarjetas,
               (SELECT count(*)::int FROM roadmap_items r WHERE r.proyecto_id = p.id AND r.estado = 'hecho') AS hechas,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM proyectos p
        LEFT JOIN users u ON u.id = p.creador_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'proyecto' AND pm.entity_id = p.id
        WHERE p.archived_at IS NULL AND p.deleted_at IS NULL
          AND (p.publico OR p.creador_user_id = ${usuarioId}::text)
          AND (${autor}::text IS NULL OR p.creador_user_id = ${autor})
          AND (${like}::text IS NULL OR p.titulo ILIKE ${like} OR p.descripcion ILIKE ${like})
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `);

      // Un mapa también lo publicó alguien: el Mapa de Indicadores de la
      // Humanidad es de Eugenio igual que lo es cualquier mapa que crees tú.
      const mapas = await db.execute(sql`
        SELECT m.id, m.slug, m.title, m.description, m.config, m.views, m.status,
               m.is_ai_generated, m.created_at, m.creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM user_maps m
        LEFT JOIN users u ON u.id = m.creator_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'mapa' AND pm.entity_id = m.id
        WHERE m.archived_at IS NULL AND m.deleted_at IS NULL
          AND (m.status = 'publicado' OR m.creator_user_id = ${usuarioId}::text)
          AND (${autor}::text IS NULL OR m.creator_user_id = ${autor})
          AND (${like}::text IS NULL OR m.title ILIKE ${like} OR m.description ILIKE ${like})
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `);

      // `puedo_editar` viaja resuelto desde aquí: la tarjeta no debe deducir
      // permisos por su cuenta, y así el lápiz, el candado y la papelera sólo
      // aparecen cuando el servidor va a aceptarlos de verdad.
      //   editar  → autor, colaborador o administrador
      //   mandar / visibilidad / colaboradores → solo autor o administrador
      const comun = (r: any) => ({
        estado: r.estado as 'en_desarrollo' | 'terminado',
        n_colaboradores: r.n_colaboradores as number,
        puedo_editar: !!usuarioId && (r.creator_user_id === usuarioId || esAdmin || r.soy_colaborador),
        soy_autor: !!usuarioId && (r.creator_user_id === usuarioId || esAdmin),
      });

      const todo = [
        ...(ventanas.rows as any[]).map(w => ({
          tipo: 'ventana', id: w.id, titulo: w.title, kind: w.kind, config: w.config,
          vistas: w.views, ia: w.is_ai_generated, fecha: w.created_at,
          autor_id: w.creator_user_id, autor_nombre: w.autor_nombre, autor_avatar: w.autor_avatar,
          donde: w.grafo_titulo, donde_slug: w.grafo_slug, personal: w.es_personal,
          ruta: w.grafo_slug ? `/grafos/${w.grafo_slug}` : null,
          publico: w.publico, ...comun(w),
        })),
        ...(muro.rows as any[]).map(p => ({
          tipo: 'muro', id: p.id, titulo: p.title || (p.body || '').slice(0, 70),
          kind: 'publicacion', config: { body: p.body },
          vistas: 0, ia: false, fecha: p.created_at,
          autor_id: p.creator_user_id, autor_nombre: p.autor_nombre, autor_avatar: p.autor_avatar,
          donde: 'El muro', donde_slug: null, personal: false,
          ruta: '/muro',
          publico: (p.visibility || 'publica') !== 'privada', ...comun(p),
        })),
        ...(lienzos.rows as any[]).map(g => ({
          tipo: 'lienzo', id: g.id, titulo: g.title, kind: 'grafo',
          config: {
            title: g.title, description: g.description,
            graph_slug: g.slug, creator_name: g.autor_nombre,
          },
          vistas: g.views, ia: g.is_ai_generated, fecha: g.created_at,
          autor_id: g.creator_user_id, autor_nombre: g.autor_nombre, autor_avatar: g.autor_avatar,
          donde: `${g.piezas} ${g.piezas === 1 ? 'pieza' : 'piezas'}`, donde_slug: g.slug,
          personal: g.es_personal,
          ruta: `/grafos/${g.slug}`,
          publico: g.status === 'publicado', ...comun(g),
        })),
        ...(proyectos.rows as any[]).map(p => ({
          tipo: 'proyecto', id: p.id, titulo: p.titulo, kind: 'proyecto',
          config: {
            goal: p.descripcion || p.vision,
            // El estado del proyecto no se inventa: sale de sus tarjetas.
            status: !p.tarjetas ? 'idea' : p.hechas === p.tarjetas ? 'terminado' : 'en_marcha',
            steps: [],
          },
          vistas: 0, ia: false, fecha: p.created_at,
          autor_id: p.creator_user_id, autor_nombre: p.autor_nombre, autor_avatar: p.autor_avatar,
          donde: p.tarjetas ? `${p.hechas}/${p.tarjetas} hechas` : 'Sin tarjetas aún',
          donde_slug: p.slug, personal: false,
          ruta: `/proyectos/${p.slug}`,
          publico: p.publico, ...comun(p),
        })),
        ...(mapas.rows as any[]).map(m => ({
          tipo: 'mapa', id: m.id, titulo: m.title, kind: 'mapa',
          // El mapa principal de la plataforma vive en /mapa; los demás en su
          // propia página. `config.principal` es lo que los distingue.
          config: { ...(m.config || {}), title: m.title, description: m.description },
          vistas: m.views, ia: m.is_ai_generated, fecha: m.created_at,
          autor_id: m.creator_user_id, autor_nombre: m.autor_nombre, autor_avatar: m.autor_avatar,
          donde: 'Mapas', donde_slug: m.slug, personal: false,
          ruta: (m.config || {}).principal ? '/mapa' : `/mapas/${m.slug}`,
          publico: m.status === 'publicado', ...comun(m),
        })),
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      res.json(todo.slice(0, limit));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // UNA PUBLICACIÓN ES UNA PUBLICACIÓN (2026-08-08, petición del usuario)
  // ==========================================================================
  // Un mapa, un lienzo, un proyecto, un libro, un documento: para quien lo
  // escribe son todos lo mismo, «algo que ha publicado». Viven en cuatro
  // tablas distintas, así que estas tres rutas son la única puerta común:
  // editar, hacer pública o privada, y mandar a la papelera. Los permisos se
  // comprueban aquí una sola vez, no en cada tabla.

  const TIPOS_PUB = new Set(['ventana', 'muro', 'lienzo', 'proyecto', 'mapa']);

  /** Autor y colaboradores de una publicación. `undefined` = no existe. */
  const cargarPublicacion = async (tipo: string, id: string) => {
    const r = tipo === 'ventana'
      ? await db.execute(sql`SELECT creator_user_id AS autor FROM knowledge_windows WHERE id = ${id}`)
      : tipo === 'muro'
      ? await db.execute(sql`SELECT author_user_id AS autor FROM publications WHERE id = ${id}`)
      : tipo === 'lienzo'
      ? await db.execute(sql`SELECT creator_user_id AS autor, center->>'personal' AS personal FROM knowledge_graphs WHERE id = ${id}`)
      : tipo === 'mapa'
      ? await db.execute(sql`SELECT creator_user_id AS autor, config->>'principal' AS principal FROM user_maps WHERE id = ${id}`)
      : await db.execute(sql`SELECT creador_user_id AS autor FROM proyectos WHERE id = ${id}`);
    if (!r.rows.length) return undefined;
    const meta = await db.execute(sql`
      SELECT estado, colaboradores FROM publicacion_meta WHERE tipo = ${tipo} AND entity_id = ${id}
    `);
    const m = (meta.rows[0] as any) || {};
    return {
      ...(r.rows[0] as any),
      estado: m.estado || 'en_desarrollo',
      colaboradores: Array.isArray(m.colaboradores) ? (m.colaboradores as string[]) : [],
    };
  };

  /**
   * Sesión + tipo válido + permiso.
   * `exigirAutor` separa las dos cosas que no son lo mismo: un colaborador
   * ayuda a escribir, pero no decide si la publicación es pública, ni la
   * manda a la papelera, ni cambia quién más puede entrar.
   */
  const accesoPublicacion = async (
    req: Request, res: Response, tipo: string, id: string, exigirAutor: boolean,
  ) => {
    if (!TIPOS_PUB.has(tipo)) { res.status(400).json({ error: 'Ese tipo de publicación no existe.' }); return null; }
    if (!requireLevel(req, res, ROLE.USER)) return null;
    const fila = await cargarPublicacion(tipo, id);
    if (!fila) { res.status(404).json({ error: 'Esa publicación ya no existe.' }); return null; }
    const esAutor = canEdit(req, fila.autor ?? null);
    const esColaborador = fila.colaboradores.includes(req.user!.id);
    if (!esAutor && !(esColaborador && !exigirAutor)) {
      res.status(403).json({
        error: exigirAutor
          ? 'Solo quien la publicó (o un administrador) puede hacer eso.'
          : 'Solo quien la publicó, sus colaboradores o un administrador pueden editarla.',
      });
      return null;
    }
    return { ...fila, esAutor };
  };

  /** Crea o actualiza la fila de metadatos sin pisar lo que no se toca. */
  const guardarMeta = async (
    tipo: string, id: string, yo: string,
    cambios: { estado?: string; colaboradores?: string[] },
  ) => {
    await db.execute(sql`
      INSERT INTO publicacion_meta (tipo, entity_id, estado, colaboradores, updated_by, updated_at)
      VALUES (${tipo}, ${id},
              ${cambios.estado ?? 'en_desarrollo'},
              ${JSON.stringify(cambios.colaboradores ?? [])}::jsonb,
              ${yo}, now())
      ON CONFLICT (tipo, entity_id) DO UPDATE SET
        estado        = COALESCE(${cambios.estado ?? null}, publicacion_meta.estado),
        colaboradores = COALESCE(${cambios.colaboradores ? JSON.stringify(cambios.colaboradores) : null}::jsonb,
                                 publicacion_meta.colaboradores),
        updated_by = ${yo}, updated_at = now()
    `);
  };

  /**
   * PATCH /api/publicaciones/:tipo/:id
   * { titulo?, config?, cuerpo?, descripcion?, publico? }
   * `publico` se traduce a la columna que ya usaba cada tabla: no se inventa
   * una nueva forma de decir «privado» por cada tipo.
   */
  app.patch('/api/publicaciones/:tipo/:id', async (req: Request, res: Response) => {
    try {
      const { tipo, id } = req.params;
      const d = req.body || {};
      const publico = typeof d.publico === 'boolean' ? d.publico : null;
      const estado = d.estado === 'terminado' || d.estado === 'en_desarrollo' ? d.estado : null;
      // Cambiar la visibilidad no es editar: eso lo decide solo quien publica.
      const fila = await accesoPublicacion(req, res, tipo, id, publico !== null);
      if (!fila) return;

      const titulo = typeof d.titulo === 'string' && d.titulo.trim() ? d.titulo.trim() : null;
      const cuerpo = typeof d.cuerpo === 'string' ? d.cuerpo : null;
      const descripcion = typeof d.descripcion === 'string' ? d.descripcion : null;
      const yo = req.user!.id;

      if (estado) await guardarMeta(tipo, id, yo, { estado });

      if (tipo === 'ventana') {
        await db.execute(sql`
          UPDATE knowledge_windows SET
            title = COALESCE(${titulo}, title),
            config = COALESCE(${d.config ? JSON.stringify(d.config) : null}::jsonb, config),
            publico = COALESCE(${publico}, publico),
            version = version + 1, updated_at = now(), updated_by = ${yo}
          WHERE id = ${id}
        `);
      } else if (tipo === 'muro') {
        await db.execute(sql`
          UPDATE publications SET
            title = COALESCE(${titulo}, title),
            body = COALESCE(${cuerpo}, body),
            visibility = COALESCE(${publico === null ? null : publico ? 'publica' : 'privada'}, visibility),
            version = version + 1, updated_at = now(), updated_by = ${yo}
          WHERE id = ${id}
        `);
      } else if (tipo === 'lienzo') {
        await db.execute(sql`
          UPDATE knowledge_graphs SET
            title = COALESCE(${titulo}, title),
            description = COALESCE(${descripcion}, description),
            status = COALESCE(${publico === null ? null : publico ? 'publicado' : 'borrador'}, status),
            version = version + 1, updated_at = now(), updated_by = ${yo}
          WHERE id = ${id}
        `);
      } else if (tipo === 'mapa') {
        await db.execute(sql`
          UPDATE user_maps SET
            title = COALESCE(${titulo}, title),
            description = COALESCE(${descripcion}, description),
            config = COALESCE(${d.config ? JSON.stringify(d.config) : null}::jsonb, config),
            status = COALESCE(${publico === null ? null : publico ? 'publicado' : 'borrador'}, status),
            version = version + 1, updated_at = now(), updated_by = ${yo}
          WHERE id = ${id}
        `);
      } else {
        await db.execute(sql`
          UPDATE proyectos SET
            titulo = COALESCE(${titulo}, titulo),
            descripcion = COALESCE(${descripcion}, descripcion),
            publico = COALESCE(${publico}, publico),
            updated_at = now(), updated_by = ${yo}
          WHERE id = ${id}
        `);
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Marca o desmarca la papelera de cualquiera de los cinco tipos. */
  const marcarPapelera = async (tipo: string, id: string, yo: string, borrar: boolean) => {
    const cuando = borrar ? sql`now()` : sql`NULL`;
    if (tipo === 'ventana') {
      await db.execute(sql`UPDATE knowledge_windows SET deleted_at = ${cuando}, updated_at = now(), updated_by = ${yo} WHERE id = ${id}`);
    } else if (tipo === 'muro') {
      await db.execute(sql`UPDATE publications SET deleted_at = ${cuando}, updated_at = now(), updated_by = ${yo} WHERE id = ${id}`);
    } else if (tipo === 'lienzo') {
      await db.execute(sql`UPDATE knowledge_graphs SET deleted_at = ${cuando}, updated_at = now(), updated_by = ${yo} WHERE id = ${id}`);
    } else if (tipo === 'mapa') {
      await db.execute(sql`UPDATE user_maps SET deleted_at = ${cuando}, updated_at = now(), updated_by = ${yo} WHERE id = ${id}`);
    } else {
      await db.execute(sql`UPDATE proyectos SET deleted_at = ${cuando}, updated_at = now(), updated_by = ${yo} WHERE id = ${id}`);
    }
  };

  /** DELETE /api/publicaciones/:tipo/:id — a la papelera, 15 días. */
  app.delete('/api/publicaciones/:tipo/:id', async (req: Request, res: Response) => {
    try {
      const { tipo, id } = req.params;
      if (!await accesoPublicacion(req, res, tipo, id, true)) return;
      await marcarPapelera(tipo, id, req.user!.id, true);
      res.json({ success: true, diasParaBorradoDefinitivo: PAPELERA_DIAS });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** POST /api/publicaciones/:tipo/:id/restaurar — sacarla de la papelera. */
  app.post('/api/publicaciones/:tipo/:id/restaurar', async (req: Request, res: Response) => {
    try {
      const { tipo, id } = req.params;
      if (!await accesoPublicacion(req, res, tipo, id, true)) return;
      await marcarPapelera(tipo, id, req.user!.id, false);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/publicaciones/:tipo/:id/colaboradores — quién más puede escribir. */
  app.get('/api/publicaciones/:tipo/:id/colaboradores', async (req: Request, res: Response) => {
    try {
      const { tipo, id } = req.params;
      if (!await accesoPublicacion(req, res, tipo, id, false)) return;
      const filas = await db.execute(sql`
        SELECT u.id, u.display_name, u.email, u.avatar_url
        FROM publicacion_meta pm
        JOIN jsonb_array_elements_text(pm.colaboradores) AS c(uid) ON true
        JOIN users u ON u.id = c.uid
        WHERE pm.tipo = ${tipo} AND pm.entity_id = ${id}
        ORDER BY u.display_name
      `);
      res.json(filas.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * PUT /api/publicaciones/:tipo/:id/colaboradores   { personas: ["a@b.com", …] }
   * Se aceptan correos o identificadores; devuelve cuáles no existen todavía
   * para poder decírselo a quien invita, en vez de fallar en silencio.
   */
  app.put('/api/publicaciones/:tipo/:id/colaboradores', async (req: Request, res: Response) => {
    try {
      const { tipo, id } = req.params;
      const fila = await accesoPublicacion(req, res, tipo, id, true);
      if (!fila) return;
      const entrada: string[] = Array.isArray(req.body?.personas)
        ? req.body.personas.map((p: any) => String(p).trim()).filter(Boolean)
        : [];
      if (!entrada.length) {
        await guardarMeta(tipo, id, req.user!.id, { colaboradores: [] });
        return res.json({ colaboradores: [], no_encontrados: [] });
      }
      const encontrados = await db.execute(sql`
        SELECT id, email, display_name FROM users
        WHERE lower(email) IN ${entrada.map(e => e.toLowerCase())} OR id IN ${entrada}
      `);
      const filas = encontrados.rows as any[];
      const ids = [...new Set(filas.map(u => u.id))].filter(u => u !== fila.autor);
      const conocidos = new Set(filas.flatMap(u => [String(u.email || '').toLowerCase(), u.id]));
      const noEncontrados = entrada.filter(e => !conocidos.has(e.toLowerCase()) && !conocidos.has(e));
      await guardarMeta(tipo, id, req.user!.id, { colaboradores: ids });
      res.json({ colaboradores: filas.filter(u => ids.includes(u.id)), no_encontrados: noEncontrados });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // CARPETAS PERSONALES (2026-08-08, petición del usuario)
  // ==========================================================================
  // «Un menú lateral izquierdo que sean carpetas donde el usuario puede
  // ordenar sus publicaciones… una publicación puede estar en muchas carpetas
  // a la vez.» Son carpetas de MARCADORES: cualquier publicación que puedas
  // ver (tuya o de otra persona) se puede guardar en tus carpetas; guardarla
  // no cambia su autoría ni su visibilidad, solo la organiza para ti.

  /**
   * Resuelve un conjunto concreto de referencias (tipo, entity_id) al mismo
   * formato que usa /api/publicaciones, respetando las mismas reglas de
   * visibilidad (privado solo lo ve su autor). Es lo que rellena una carpeta
   * y lo que arma cada tarjeta del resultado de organizar-con-IA.
   */
  const resolverPublicaciones = async (
    refs: { tipo: string; entity_id: string }[], usuarioId: string | null, esAdmin: boolean,
  ) => {
    if (!refs.length) return [];
    const porTipo: Record<string, string[]> = {};
    for (const r of refs) (porTipo[r.tipo] ||= []).push(r.entity_id);
    const salida: any[] = [];
    const mio = (creador: string | null) => !!usuarioId && (creador === usuarioId || esAdmin);

    if (porTipo.ventana?.length) {
      const rows = await db.execute(sql`
        SELECT w.id, w.title, w.kind, w.config, w.views, w.is_ai_generated, w.created_at,
               w.publico, w.creator_user_id, u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               g.slug AS grafo_slug, g.title AS grafo_titulo, coalesce(g.center->>'personal','') = '1' AS es_personal,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM knowledge_windows w
        JOIN graph_windows gw ON gw.window_id = w.id
        JOIN knowledge_graphs g ON g.id = gw.graph_id
        LEFT JOIN users u ON u.id = w.creator_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'ventana' AND pm.entity_id = w.id
        WHERE w.id IN ${porTipo.ventana} AND w.archived_at IS NULL AND w.deleted_at IS NULL
          AND (w.publico OR w.creator_user_id = ${usuarioId}::text OR ${esAdmin})
      `);
      for (const w of rows.rows as any[]) salida.push({
        tipo: 'ventana', id: w.id, titulo: w.title, kind: w.kind, config: w.config,
        vistas: w.views, ia: w.is_ai_generated, fecha: w.created_at,
        autor_id: w.creator_user_id, autor_nombre: w.autor_nombre, autor_avatar: w.autor_avatar,
        donde: w.grafo_titulo, donde_slug: w.grafo_slug, personal: w.es_personal,
        ruta: w.grafo_slug ? `/grafos/${w.grafo_slug}` : null,
        publico: w.publico, estado: w.estado, n_colaboradores: w.n_colaboradores,
        puedo_editar: mio(w.creator_user_id) || (!!usuarioId && w.soy_colaborador), soy_autor: mio(w.creator_user_id),
      });
    }
    if (porTipo.muro?.length) {
      const rows = await db.execute(sql`
        SELECT p.id, p.title, p.body, p.created_at, p.visibility, p.author_user_id AS creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM publications p LEFT JOIN users u ON u.id = p.author_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'muro' AND pm.entity_id = p.id
        WHERE p.id IN ${porTipo.muro} AND p.archived_at IS NULL AND p.deleted_at IS NULL
          AND (coalesce(p.visibility,'publica') <> 'privada' OR p.author_user_id = ${usuarioId}::text OR ${esAdmin})
      `);
      for (const p of rows.rows as any[]) salida.push({
        tipo: 'muro', id: p.id, titulo: p.title || (p.body || '').slice(0, 70),
        kind: 'publicacion', config: { body: p.body },
        vistas: 0, ia: false, fecha: p.created_at,
        autor_id: p.creator_user_id, autor_nombre: p.autor_nombre, autor_avatar: p.autor_avatar,
        donde: 'El muro', donde_slug: null, personal: false, ruta: '/muro',
        publico: (p.visibility || 'publica') !== 'privada', estado: p.estado, n_colaboradores: p.n_colaboradores,
        puedo_editar: mio(p.creator_user_id) || (!!usuarioId && p.soy_colaborador), soy_autor: mio(p.creator_user_id),
      });
    }
    if (porTipo.lienzo?.length) {
      const rows = await db.execute(sql`
        SELECT g.id, g.slug, g.title, g.description, g.views, g.created_at, g.status, g.is_ai_generated, g.creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar, coalesce(g.center->>'personal','') = '1' AS es_personal,
               (SELECT count(*)::int FROM graph_windows gw WHERE gw.graph_id = g.id) AS piezas,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM knowledge_graphs g LEFT JOIN users u ON u.id = g.creator_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'lienzo' AND pm.entity_id = g.id
        WHERE g.id IN ${porTipo.lienzo} AND g.archived_at IS NULL AND g.deleted_at IS NULL
          AND (g.status = 'publicado' OR g.creator_user_id = ${usuarioId}::text OR ${esAdmin})
      `);
      for (const g of rows.rows as any[]) salida.push({
        tipo: 'lienzo', id: g.id, titulo: g.title, kind: 'grafo',
        config: { title: g.title, description: g.description, graph_slug: g.slug, creator_name: g.autor_nombre },
        vistas: g.views, ia: g.is_ai_generated, fecha: g.created_at,
        autor_id: g.creator_user_id, autor_nombre: g.autor_nombre, autor_avatar: g.autor_avatar,
        donde: `${g.piezas} ${g.piezas === 1 ? 'pieza' : 'piezas'}`, donde_slug: g.slug, personal: g.es_personal,
        ruta: `/grafos/${g.slug}`,
        publico: g.status === 'publicado', estado: g.estado, n_colaboradores: g.n_colaboradores,
        puedo_editar: mio(g.creator_user_id) || (!!usuarioId && g.soy_colaborador), soy_autor: mio(g.creator_user_id),
      });
    }
    if (porTipo.proyecto?.length) {
      const rows = await db.execute(sql`
        SELECT p.id, p.slug, p.titulo, p.descripcion, p.vision, p.publico, p.created_at, p.creador_user_id AS creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               (SELECT count(*)::int FROM roadmap_items r WHERE r.proyecto_id = p.id) AS tarjetas,
               (SELECT count(*)::int FROM roadmap_items r WHERE r.proyecto_id = p.id AND r.estado = 'hecho') AS hechas,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM proyectos p LEFT JOIN users u ON u.id = p.creador_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'proyecto' AND pm.entity_id = p.id
        WHERE p.id IN ${porTipo.proyecto} AND p.archived_at IS NULL AND p.deleted_at IS NULL
          AND (p.publico OR p.creador_user_id = ${usuarioId}::text OR ${esAdmin})
      `);
      for (const p of rows.rows as any[]) salida.push({
        tipo: 'proyecto', id: p.id, titulo: p.titulo, kind: 'proyecto',
        config: { goal: p.descripcion || p.vision, status: !p.tarjetas ? 'idea' : p.hechas === p.tarjetas ? 'terminado' : 'en_marcha', steps: [] },
        vistas: 0, ia: false, fecha: p.created_at,
        autor_id: p.creator_user_id, autor_nombre: p.autor_nombre, autor_avatar: p.autor_avatar,
        donde: p.tarjetas ? `${p.hechas}/${p.tarjetas} hechas` : 'Sin tarjetas aún', donde_slug: p.slug, personal: false,
        ruta: `/proyectos/${p.slug}`,
        publico: p.publico, estado: p.estado, n_colaboradores: p.n_colaboradores,
        puedo_editar: mio(p.creator_user_id) || (!!usuarioId && p.soy_colaborador), soy_autor: mio(p.creator_user_id),
      });
    }
    if (porTipo.mapa?.length) {
      const rows = await db.execute(sql`
        SELECT m.id, m.slug, m.title, m.description, m.config, m.views, m.status, m.is_ai_generated, m.created_at, m.creator_user_id,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               coalesce(pm.estado, 'en_desarrollo') AS estado,
               coalesce(jsonb_array_length(pm.colaboradores), 0) AS n_colaboradores,
               coalesce(jsonb_exists(pm.colaboradores, ${usuarioId}), false) AS soy_colaborador
        FROM user_maps m LEFT JOIN users u ON u.id = m.creator_user_id
        LEFT JOIN publicacion_meta pm ON pm.tipo = 'mapa' AND pm.entity_id = m.id
        WHERE m.id IN ${porTipo.mapa} AND m.archived_at IS NULL AND m.deleted_at IS NULL
          AND (m.status = 'publicado' OR m.creator_user_id = ${usuarioId}::text OR ${esAdmin})
      `);
      for (const m of rows.rows as any[]) salida.push({
        tipo: 'mapa', id: m.id, titulo: m.title, kind: 'mapa',
        config: { ...(m.config || {}), title: m.title, description: m.description },
        vistas: m.views, ia: m.is_ai_generated, fecha: m.created_at,
        autor_id: m.creator_user_id, autor_nombre: m.autor_nombre, autor_avatar: m.autor_avatar,
        donde: 'Mapas', donde_slug: m.slug, personal: false,
        ruta: (m.config || {}).principal ? '/mapa' : `/mapas/${m.slug}`,
        publico: m.status === 'publicado', estado: m.estado, n_colaboradores: m.n_colaboradores,
        puedo_editar: mio(m.creator_user_id) || (!!usuarioId && m.soy_colaborador), soy_autor: mio(m.creator_user_id),
      });
    }
    return salida;
  };

  /** GET /api/carpetas — las carpetas del usuario, con cuántas piezas tiene cada una. */
  app.get('/api/carpetas', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const rows = await db.execute(sql`
        SELECT c.id, c.nombre, c.color, c.orden, c.created_at,
               (SELECT count(*)::int FROM carpeta_publicaciones cp WHERE cp.carpeta_id = c.id) AS piezas
        FROM carpetas c WHERE c.user_id = ${req.user!.id}
        ORDER BY c.orden, c.created_at
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** POST /api/carpetas  { nombre, color? } */
  app.post('/api/carpetas', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const nombre = String(req.body?.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'La carpeta necesita un nombre.' });
      const id = newId('CAR');
      const orden = await db.execute(sql`SELECT coalesce(max(orden), -1) + 1 AS n FROM carpetas WHERE user_id = ${req.user!.id}`);
      await db.execute(sql`
        INSERT INTO carpetas (id, user_id, nombre, color, orden)
        VALUES (${id}, ${req.user!.id}, ${nombre}, ${req.body?.color || null}, ${(orden.rows[0] as any).n})
      `);
      res.json({ id, nombre, color: req.body?.color || null, piezas: 0 });
    } catch (e: any) {
      if (String(e.message).includes('unique')) return res.status(400).json({ error: 'Ya tienes una carpeta con ese nombre.' });
      res.status(500).json({ error: e.message });
    }
  });

  const propiaCarpeta = async (req: Request, res: Response, id: string) => {
    if (!requireLevel(req, res, ROLE.USER)) return null;
    const c = await db.execute(sql`SELECT user_id FROM carpetas WHERE id = ${id}`);
    if (!c.rows.length) { res.status(404).json({ error: 'Carpeta no encontrada.' }); return null; }
    if ((c.rows[0] as any).user_id !== req.user!.id) {
      res.status(403).json({ error: 'Esta carpeta no es tuya.' }); return null;
    }
    return c.rows[0];
  };

  /** PUT /api/carpetas/:id  { nombre?, color?, orden? } */
  app.put('/api/carpetas/:id', async (req: Request, res: Response) => {
    try {
      if (!await propiaCarpeta(req, res, req.params.id)) return;
      const d = req.body || {};
      await db.execute(sql`
        UPDATE carpetas SET
          nombre = COALESCE(${d.nombre ? String(d.nombre).trim() : null}, nombre),
          color = COALESCE(${d.color ?? null}, color),
          orden = COALESCE(${typeof d.orden === 'number' ? d.orden : null}, orden),
          updated_at = now()
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** DELETE /api/carpetas/:id — borra la carpeta; lo de dentro sigue existiendo, solo deja de estar archivado ahí. */
  app.delete('/api/carpetas/:id', async (req: Request, res: Response) => {
    try {
      if (!await propiaCarpeta(req, res, req.params.id)) return;
      await db.execute(sql`DELETE FROM carpetas WHERE id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/carpetas/:id/publicaciones — lo que hay dentro. */
  app.get('/api/carpetas/:id/publicaciones', async (req: Request, res: Response) => {
    try {
      const carpeta = await propiaCarpeta(req, res, req.params.id);
      if (!carpeta) return;
      const refs = await db.execute(sql`SELECT tipo, entity_id FROM carpeta_publicaciones WHERE carpeta_id = ${req.params.id}`);
      const items = await resolverPublicaciones(refs.rows as any[], req.user!.id, (req.user!.roleLevel ?? 0) >= ROLE.ADMIN);
      res.json(items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/publicaciones/:tipo/:id/carpetas — en cuáles de MIS carpetas está ya. */
  app.get('/api/publicaciones/:tipo/:id/carpetas', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const rows = await db.execute(sql`
        SELECT c.id, c.nombre, c.color
        FROM carpetas c
        JOIN carpeta_publicaciones cp ON cp.carpeta_id = c.id
        WHERE c.user_id = ${req.user!.id} AND cp.tipo = ${req.params.tipo} AND cp.entity_id = ${req.params.id}
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * PUT /api/publicaciones/:tipo/:id/carpetas  { carpeta_ids: string[] }
   * Sustituye de golpe el conjunto de carpetas propias que contienen esta
   * publicación — es lo que usa el selector «Guardar en:» (marcar/desmarcar).
   */
  app.put('/api/publicaciones/:tipo/:id/carpetas', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { tipo, id } = req.params;
      if (!TIPOS_PUB.has(tipo) && tipo !== 'ventana') return res.status(400).json({ error: 'Tipo desconocido.' });
      const pedidas: string[] = Array.isArray(req.body?.carpeta_ids) ? req.body.carpeta_ids.map(String) : [];
      // Solo se tocan carpetas propias — no se puede colar en carpetas ajenas.
      const mias = await db.execute(sql`SELECT id FROM carpetas WHERE user_id = ${req.user!.id}`);
      const idsMias = new Set((mias.rows as any[]).map(c => c.id));
      const validas = pedidas.filter(cid => idsMias.has(cid));
      await db.execute(sql`
        DELETE FROM carpeta_publicaciones
        WHERE tipo = ${tipo} AND entity_id = ${id} AND carpeta_id IN ${[...idsMias]}
      `);
      for (const carpetaId of validas) {
        await db.execute(sql`
          INSERT INTO carpeta_publicaciones (carpeta_id, tipo, entity_id, added_by)
          VALUES (${carpetaId}, ${tipo}, ${id}, ${req.user!.id})
          ON CONFLICT DO NOTHING
        `);
      }
      res.json({ success: true, carpeta_ids: validas });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** POST /api/carpetas/auto-organizar — el botón «Ordenar con IA». */
  app.post('/api/carpetas/auto-organizar', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const resultado = await autoOrganizarCarpetas(db, req.user!.id);
      if (resultado.ok === false) return res.status(400).json({ error: resultado.error });
      res.json(resultado);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * GET /api/knowledge/related?q=incendios&exclude_graph=KG…
   * The connection recommender: how much does the common space already know
   * about a topic, and which concrete pieces could you link instead of
   * duplicating them. Searches published graphs, their windows, challenges
   * and solutions. Returns counts (the "cuánta info hay" gauge) + top items.
   */
  app.get('/api/knowledge/related', async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q || '').trim();
      if (q.length < 2) return res.json({ q, totales: null, grafos: [], publicaciones: [], retos: [], soluciones: [] });
      const like = `%${q}%`;
      const exclude = (req.query.exclude_graph as string) || null;

      const grafos = await db.execute(sql`
        SELECT g.id, g.slug, g.title, u.display_name AS creator_name,
               (SELECT count(*)::int FROM graph_windows gw WHERE gw.graph_id = g.id) AS window_count
        FROM knowledge_graphs g LEFT JOIN users u ON u.id = g.creator_user_id
        WHERE g.archived_at IS NULL AND g.deleted_at IS NULL AND g.status = 'publicado'
          AND coalesce(g.center->>'personal','') <> '1'
          AND (${exclude}::text IS NULL OR g.id <> ${exclude})
          AND (g.title ILIKE ${like} OR g.description ILIKE ${like} OR g.trigger_keywords::text ILIKE ${like})
        ORDER BY g.views DESC LIMIT 6
      `);

      const publicaciones = await db.execute(sql`
        SELECT DISTINCT ON (w.id) w.id, w.title, w.kind, g.slug AS graph_slug, g.title AS graph_title,
               u.display_name AS creator_name
        FROM knowledge_windows w
        JOIN graph_windows gw ON gw.window_id = w.id
        JOIN knowledge_graphs g ON g.id = gw.graph_id
        LEFT JOIN users u ON u.id = w.creator_user_id
        WHERE w.archived_at IS NULL AND w.deleted_at IS NULL AND w.publico
          AND g.archived_at IS NULL AND g.deleted_at IS NULL AND g.status = 'publicado'
          AND coalesce(g.center->>'personal','') <> '1'
          AND (${exclude}::text IS NULL OR g.id <> ${exclude})
          AND (w.title ILIKE ${like} OR w.config->>'body' ILIKE ${like})
        LIMIT 10
      `);

      const retos = await db.execute(sql`
        SELECT id, title FROM challenges
        WHERE archived_at IS NULL AND (title ILIKE ${like} OR description ILIKE ${like})
        LIMIT 5
      `);
      const soluciones = await db.execute(sql`
        SELECT id, title FROM solutions
        WHERE archived_at IS NULL AND (title ILIKE ${like} OR description ILIKE ${like})
        LIMIT 5
      `);

      // The gauge: how much the común already holds about this topic.
      const autores = new Set([
        ...(grafos.rows as any[]).map(r => r.creator_name),
        ...(publicaciones.rows as any[]).map(r => r.creator_name),
      ].filter(Boolean));
      res.json({
        q,
        totales: {
          grafos: grafos.rows.length,
          publicaciones: publicaciones.rows.length,
          retos: retos.rows.length,
          soluciones: soluciones.rows.length,
          autores: autores.size,
        },
        grafos: grafos.rows, publicaciones: publicaciones.rows,
        retos: retos.rows, soluciones: soluciones.rows,
      });
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
      // «Convert to»: cambiar el tipo de una ventana ya creada.
      const kind = d.kind && WINDOW_KINDS.has(d.kind) ? d.kind : null;
      await db.execute(sql`
        UPDATE knowledge_windows SET
          title = COALESCE(${d.title ?? null}, title),
          kind = COALESCE(${kind}, kind),
          config = COALESCE(${d.config ? JSON.stringify(d.config) : null}::jsonb, config),
          version = version + 1, updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/windows/:id/view', async (req: Request, res: Response) => {
    try {
      const w = await db.execute(sql`
        UPDATE knowledge_windows SET views = views + 1 WHERE id = ${req.params.id}
        RETURNING creator_user_id, publico
      `);
      // «Ganar céntimos de punto cuando contribuyen con una publicación
      // pública... y es vista por otros usuarios» (2026-08-08). No se
      // distingue visitante único — cada vista suma un céntimo de punto a
      // quien la escribió, salvo que se esté viendo a sí mismo.
      const fila = w.rows[0] as any;
      if (fila?.publico && fila.creator_user_id && fila.creator_user_id !== req.user?.id) {
        await otorgarPuntos(db, fila.creator_user_id, 0.01, 'vista_publicacion', {
          entidadTipo: 'knowledge_windows', entidadId: req.params.id,
        }).catch(() => {});
      }
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
          -- El aspecto se FUNDE con lo que ya había: la barra manda solo lo
          -- que acabas de tocar (el color, o la punta), no la ficha entera.
          style  = style  || COALESCE(${d.style ? JSON.stringify(d.style) : null}::jsonb, '{}'::jsonb),
          layout = layout || COALESCE(${d.layout ? JSON.stringify(d.layout) : null}::jsonb, '{}'::jsonb),
          locked = COALESCE(${d.locked ?? null}, locked),
          updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${Number(req.params.edgeId)} AND graph_id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // VALORACIÓN 0-10 (polimórfica)
  // ==========================================================================
  /** Invertir el sentido de una conexión (la flecha cambia de lado). */
  app.post('/api/graphs/:id/edges/:edgeId/invertir', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden editar sus conexiones.' });
      }
      // Las aristas del CENTRO (from_window_id NULL) no se pueden invertir:
      // el centro no puede ser destino de sí mismo.
      const e = await db.execute(sql`
        SELECT from_window_id FROM graph_edges WHERE id = ${Number(req.params.edgeId)} AND graph_id = ${req.params.id}
      `);
      if (!e.rows.length) return res.status(404).json({ error: 'Conexión no encontrada.' });
      if (!(e.rows[0] as any).from_window_id) {
        return res.status(400).json({ error: 'Las conexiones que nacen del centro del grafo no se pueden invertir.' });
      }
      await db.execute(sql`
        UPDATE graph_edges
        SET from_window_id = to_window_id, to_window_id = from_window_id,
            updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${Number(req.params.edgeId)} AND graph_id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Quitar una conexión del lienzo (une dos cosas, no es conocimiento en sí). */
  app.delete('/api/graphs/:id/edges/:edgeId', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const g = await db.execute(sql`SELECT creator_user_id FROM knowledge_graphs WHERE id = ${req.params.id}`);
      if (!g.rows.length) return res.status(404).json({ error: 'Grafo no encontrado.' });
      if (!canEdit(req, (g.rows[0] as any).creator_user_id)) {
        return res.status(403).json({ error: 'Solo el creador del grafo o un administrador pueden quitar sus conexiones.' });
      }
      await db.execute(sql`DELETE FROM graph_edges WHERE id = ${Number(req.params.edgeId)} AND graph_id = ${req.params.id}`);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // El BARRIDO de la papelera: lo que lleve más de PAPELERA_DIAS se borra de
  // verdad. Corre al arrancar y una vez al día; `unref()` para que no impida
  // que el proceso termine.
  const vaciarPapelera = async () => {
    const caducados = async (tabla: any) => {
      const r = await db.execute(sql`
        SELECT id FROM ${tabla}
        WHERE deleted_at IS NOT NULL AND deleted_at < now() - (${PAPELERA_DIAS} || ' days')::interval
      `);
      return (r.rows as any[]).map(x => x.id as string);
    };
    // Nada se borra sin soltar antes lo que le apunta: si queda una clave
    // ajena viva, el barrido falla entero y la papelera deja de vaciarse.
    const soltarMeta = async (tipo: string, ids: string[]) => {
      await db.execute(sql`DELETE FROM publicacion_meta WHERE tipo = ${tipo} AND entity_id IN ${ids}`);
    };

    try {
      const ventanas = await caducados(sql.raw('knowledge_windows'));
      if (ventanas.length) {
        await db.execute(sql`DELETE FROM graph_edges WHERE from_window_id IN ${ventanas} OR to_window_id IN ${ventanas}`);
        await db.execute(sql`DELETE FROM graph_windows WHERE window_id IN ${ventanas}`);
        await db.execute(sql`DELETE FROM ratings WHERE entity_type = 'knowledge_windows' AND entity_id IN ${ventanas}`);
        await db.execute(sql`DELETE FROM comments WHERE entity_type = 'knowledge_windows' AND entity_id IN ${ventanas}`);
        await soltarMeta('ventana', ventanas);
        await db.execute(sql`DELETE FROM knowledge_windows WHERE id IN ${ventanas}`);
      }

      const lienzos = await caducados(sql.raw('knowledge_graphs'));
      if (lienzos.length) {
        await db.execute(sql`DELETE FROM graph_edges WHERE graph_id IN ${lienzos}`);
        await db.execute(sql`DELETE FROM graph_windows WHERE graph_id IN ${lienzos}`);
        await db.execute(sql`DELETE FROM graph_entity_links WHERE graph_id IN ${lienzos}`);
        await db.execute(sql`DELETE FROM ratings WHERE entity_type = 'knowledge_graphs' AND entity_id IN ${lienzos}`);
        await db.execute(sql`DELETE FROM comments WHERE entity_type = 'knowledge_graphs' AND entity_id IN ${lienzos}`);
        await soltarMeta('lienzo', lienzos);
        await db.execute(sql`DELETE FROM knowledge_graphs WHERE id IN ${lienzos}`);
      }

      const mapas = await caducados(sql.raw('user_maps'));
      if (mapas.length) {
        await db.execute(sql`DELETE FROM ratings WHERE entity_type = 'user_maps' AND entity_id IN ${mapas}`);
        await db.execute(sql`DELETE FROM comments WHERE entity_type = 'user_maps' AND entity_id IN ${mapas}`);
        await soltarMeta('mapa', mapas);
        await db.execute(sql`DELETE FROM user_maps WHERE id IN ${mapas}`);
      }

      const proyectos = await caducados(sql.raw('proyectos'));
      if (proyectos.length) {
        await db.execute(sql`DELETE FROM roadmap_items WHERE proyecto_id IN ${proyectos}`);
        await soltarMeta('proyecto', proyectos);
        await db.execute(sql`DELETE FROM proyectos WHERE id IN ${proyectos}`);
      }

      const muro = await caducados(sql.raw('publications'));
      if (muro.length) {
        await db.execute(sql`DELETE FROM publication_links WHERE publication_id IN ${muro}`);
        await db.execute(sql`DELETE FROM comments WHERE publication_id IN ${muro}`);
        await soltarMeta('muro', muro);
        await db.execute(sql`DELETE FROM publications WHERE id IN ${muro}`);
      }

      const total = ventanas.length + lienzos.length + mapas.length + proyectos.length + muro.length;
      if (total) console.log(`papelera: ${total} publicaciones eliminadas definitivamente`);
    } catch (e: any) {
      console.error('papelera: fallo al vaciar —', e.message);
    }
  };
  setTimeout(vaciarPapelera, 30_000).unref?.();
  setInterval(vaciarPapelera, 24 * 60 * 60 * 1000).unref?.();

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

      // La IA responde en segundo plano (nunca a sí misma).
      if (req.user!.id !== 'U_IA_CONOCIMIENTO') {
        void aiReplyToComment(db, {
          entityType: entity_type,
          entityId: entity_id,
          parentCommentId: id,
          userName: req.user!.displayName || 'una persona',
          userComment: body,
        });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
