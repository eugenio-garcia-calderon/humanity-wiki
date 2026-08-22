import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';
import { slugify } from '../utils/slugify.js';
import { registrarHistorial } from './historial.js';

// ============================================================================
// VERACIDAD · debates, arguments and sources (2026-08-22, Eugenio)
// ============================================================================
// «Un sistema de veracidad para que lo que la gente publique sea información
// coherente con la otra información que hay, y poder generar un espectro de
// visiones sobre una verdad, con debates visuales sobre los temas relevantes.»
//
// This module holds phase 1 of the ten in memory/13_VERACIDAD.md: the data and
// the routes. No screen uses it yet.
//
// The shape to keep in mind: a debate is a TREE. Its thesis is the root, every
// argument answers exactly one claim, and that constraint is the whole point —
// it is what lets a reader arrive at message 300 and still know what is being
// argued about. The knowledge graph next door is deliberately not a tree, which
// is why this is not built on top of it (drizzle/0065 has the long version).

const newId = (prefix: string) =>
  `${prefix}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296)
    .toString(36).toUpperCase().padStart(2, '0')}`;

/** The three stances, the same three words the knowledge graph uses. */
export const POSTURAS = ['a_favor', 'en_contra', 'matiza'] as const;

/** The veracity ladder of a claim. Phase 2 governs the transitions. */
export const VERACIDADES = [
  'sin_fuente', 'con_fuente', 'verificada', 'disputada', 'refutada',
] as const;

export const TIPOS_FUENTE = [
  'estudio', 'informe', 'noticia', 'dato', 'documento', 'observacion', 'otra',
] as const;

/** What a source may be attached to today. */
export const ENTIDADES_CITABLES = ['debate', 'argumento'] as const;

// A tree this deep is no longer a debate, it is a corridor. Kialo's own deep
// threads live around 6–8; 12 leaves room and still stops a runaway script.
const PROFUNDIDAD_MAXIMA = 12;

const TEXTO_MAXIMO = 2000;

export function registerVeracidadRoutes(app: Express, db: any) {

  const requireLevel = (req: Request, res: Response, min: number): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < min) {
      res.status(403).json({ error: `Requiere nivel ${min} o superior.` }); return false;
    }
    return true;
  };

  /** The author, or someone who reviews knowledge. Never anybody else. */
  const puedeEditar = (req: Request, autorUserId: string | null): boolean =>
    !!req.user && (req.user.id === autorUserId || (req.user.roleLevel ?? 0) >= ROLE.KNOWLEDGE);

  /**
   * Rejects a value that is not in the list, saying which ones exist.
   *
   * This is here rather than inline because of the `grupos[0]` bug of
   * 2026-08-20: an unrecognised value fell back to the first option and was
   * stored silently. Never choose for the user when you do not know.
   */
  const valorValido = <T extends readonly string[]>(
    res: Response, campo: string, valor: any, validos: T,
  ): boolean => {
    if (typeof valor === 'string' && (validos as readonly string[]).includes(valor)) return true;
    res.status(400).json({
      error: `«${valor}» no es un valor válido para ${campo}. Opciones: ${validos.join(', ')}.`,
    });
    return false;
  };

  /** A slug nobody else holds. Two debates may legitimately share a thesis. */
  const slugLibre = async (tesis: string): Promise<string> => {
    const base = slugify(tesis).slice(0, 80) || 'debate';
    for (let intento = 0; intento < 5; intento++) {
      const candidato = intento === 0
        ? base
        : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const existe = await db.execute(sql`SELECT 1 FROM debates WHERE slug = ${candidato} LIMIT 1`);
      if (!existe.rows.length) return candidato;
    }
    return `${base}-${Date.now().toString(36)}`;
  };

  /** Every source of a set of entities, in one query. */
  const fuentesDe = async (tipo: string, ids: string[]): Promise<Record<string, any[]>> => {
    if (!ids.length) return {};
    const rows = await db.execute(sql`
      SELECT id, entidad_tipo, entidad_id, titulo, url, autor, publicado_en, tipo, cita,
             autor_user_id, created_at
      FROM veracidad_fuentes
      WHERE archived_at IS NULL AND entidad_tipo = ${tipo}
        AND entidad_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
      ORDER BY created_at
    `);
    const porEntidad: Record<string, any[]> = {};
    for (const f of rows.rows as any[]) (porEntidad[f.entidad_id] ||= []).push(f);
    return porEntidad;
  };

  // ==========================================================================
  // READING
  // ==========================================================================

  /**
   * GET /api/debates — the list.
   *
   * Filters: `?entidad_tipo=&entidad_id=` (what it hangs off), `?territorio=`,
   * `?estado=`, `?q=` (free text over thesis and context).
   */
  app.get('/api/debates', async (req: Request, res: Response) => {
    try {
      const entidadTipo = (req.query.entidad_tipo as string) || null;
      const entidadId = (req.query.entidad_id as string) || null;
      const territorio = (req.query.territorio as string) || null;
      const estado = (req.query.estado as string) || null;
      const q = (req.query.q as string)?.trim() || null;

      if (estado && !valorValido(res, 'estado', estado, ['abierto', 'cerrado'])) return;

      const rows = await db.execute(sql`
        SELECT d.id, d.slug, d.tesis, d.contexto, d.estado, d.territory_id, d.entidad_tipo,
               d.entidad_id, d.autor_user_id, d.vistas, d.is_ai_generated, d.created_at, d.updated_at,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               t.name AS territorio_nombre,
               (SELECT count(*) FROM argumentos a
                 WHERE a.debate_id = d.id AND a.archived_at IS NULL) AS total_argumentos
        FROM debates d
        LEFT JOIN users u ON u.id = d.autor_user_id
        LEFT JOIN territories t ON t.id = d.territory_id
        WHERE d.archived_at IS NULL
          AND (${entidadTipo}::text IS NULL OR d.entidad_tipo = ${entidadTipo})
          AND (${entidadId}::text IS NULL OR d.entidad_id = ${entidadId})
          AND (${territorio}::text IS NULL OR d.territory_id = ${territorio})
          AND (${estado}::text IS NULL OR d.estado = ${estado})
          AND (${q}::text IS NULL OR d.tesis ILIKE '%' || ${q} || '%'
                                  OR d.contexto ILIKE '%' || ${q} || '%')
        ORDER BY d.updated_at DESC
        LIMIT 200
      `);
      res.json(rows.rows);
    } catch (e: any) {
      console.error('debates GET:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/debates/:slug — the debate, its whole tree and every source.
   *
   * The tree is assembled here and not in the client so that «this argument
   * hangs from that one» is decided once, by the side that owns the data.
   * Two queries for the arguments and their sources, never one per node.
   */
  app.get('/api/debates/:slug', async (req: Request, res: Response) => {
    try {
      const debate = await db.execute(sql`
        SELECT d.*, u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               t.name AS territorio_nombre
        FROM debates d
        LEFT JOIN users u ON u.id = d.autor_user_id
        LEFT JOIN territories t ON t.id = d.territory_id
        WHERE d.slug = ${req.params.slug} AND d.archived_at IS NULL
        LIMIT 1
      `);
      const d = debate.rows[0] as any;
      // Saying «this debate does not exist» is a result, not a failure. Without
      // it the screen would have to guess between «no existe» and «no ha
      // cargado» — src/server/CLAUDE.md, the rule of «I don't know».
      if (!d) return res.status(404).json({ error: 'Ese debate no existe.' });

      const args = await db.execute(sql`
        SELECT a.id, a.debate_id, a.parent_id, a.postura, a.texto, a.profundidad, a.veracidad,
               a.impacto, a.votos, a.autor_user_id, a.is_ai_generated, a.created_at, a.updated_at,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar
        FROM argumentos a
        LEFT JOIN users u ON u.id = a.autor_user_id
        WHERE a.debate_id = ${d.id} AND a.archived_at IS NULL
        ORDER BY a.profundidad, a.created_at
      `);
      const filas = args.rows as any[];

      const fuentesArg = await fuentesDe('argumento', filas.map((a) => a.id));
      const fuentesDebate = await fuentesDe('debate', [d.id]);

      // One pass to index, one to link. Rows arrive ordered by depth, so a
      // parent is always in the map before its children are read.
      const porId = new Map<string, any>();
      for (const a of filas) porId.set(a.id, { ...a, fuentes: fuentesArg[a.id] || [], hijos: [] });
      const raiz: any[] = [];
      for (const a of filas) {
        const nodo = porId.get(a.id);
        const padre = a.parent_id ? porId.get(a.parent_id) : null;
        if (padre) padre.hijos.push(nodo);
        else raiz.push(nodo);
      }

      res.json({
        ...d,
        fuentes: fuentesDebate[d.id] || [],
        argumentos: raiz,
        // Counted from what was actually loaded, so the screen never shows a
        // total it cannot also show the rows for.
        total_argumentos: filas.length,
        a_favor: filas.filter((a) => a.postura === 'a_favor').length,
        en_contra: filas.filter((a) => a.postura === 'en_contra').length,
      });
    } catch (e: any) {
      console.error('debate GET:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // WRITING
  // ==========================================================================

  /**
   * POST /api/debates — open a debate. Level 1, same as publishing.
   *
   * A debate is a question put to everyone, not an assertion about the commons,
   * so it needs no more standing than a publication. What it costs to be wrong
   * here is an argument against, which is the point of the thing.
   */
  app.post('/api/debates', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { tesis, contexto, territoryId, entidadTipo, entidadId } = req.body || {};

      if (!tesis || typeof tesis !== 'string' || tesis.trim().length < 10) {
        return res.status(400).json({
          error: 'La tesis es obligatoria y debe poder afirmarse o negarse (mínimo 10 caracteres).',
        });
      }
      // Half a reference points at nothing.
      if ((entidadTipo && !entidadId) || (!entidadTipo && entidadId)) {
        return res.status(400).json({ error: 'Para colgar el debate de algo hacen falta entidadTipo y entidadId.' });
      }

      const id = newId('DEB');
      const slug = await slugLibre(tesis.trim());
      await db.execute(sql`
        INSERT INTO debates (id, slug, tesis, contexto, territory_id, entidad_tipo, entidad_id,
                             autor_user_id, created_by, updated_by)
        VALUES (${id}, ${slug}, ${tesis.trim()}, ${contexto?.trim() || null},
                ${territoryId || null}, ${entidadTipo || null}, ${entidadId || null},
                ${req.user!.id}, ${req.user!.id}, ${req.user!.id})
      `);
      await registrarHistorial(db, {
        entidad: 'debate', tabla: 'debates', id, operacion: 'create',
        previo: null, actor: req.user!.id,
      });
      res.status(201).json({ id, slug });
    } catch (e: any) {
      console.error('debate POST:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/debates/:id — the author corrects the wording, or level 3 does. */
  app.put('/api/debates/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const previo = (await db.execute(sql`
        SELECT * FROM debates WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!previo) return res.status(404).json({ error: 'Ese debate no existe.' });
      if (!puedeEditar(req, previo.autor_user_id)) {
        return res.status(403).json({ error: 'Solo quien lo abrió, o alguien de nivel Conocimiento, puede editarlo.' });
      }

      const { tesis, contexto, estado } = req.body || {};
      if (estado !== undefined && !valorValido(res, 'estado', estado, ['abierto', 'cerrado'])) return;
      // Closing a debate is a judgement about the commons, not housekeeping.
      if (estado && estado !== previo.estado && (req.user!.roleLevel ?? 0) < ROLE.KNOWLEDGE) {
        return res.status(403).json({ error: 'Cerrar o reabrir un debate requiere nivel Conocimiento.' });
      }

      await db.execute(sql`
        UPDATE debates SET
          tesis = COALESCE(${tesis?.trim() || null}, tesis),
          contexto = COALESCE(${contexto?.trim() || null}, contexto),
          estado = COALESCE(${estado || null}, estado),
          version = version + 1, updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${req.params.id}
      `);
      await registrarHistorial(db, {
        entidad: 'debate', tabla: 'debates', id: req.params.id, operacion: 'update',
        previo, actor: req.user!.id,
      });
      res.json({ ok: true });
    } catch (e: any) {
      console.error('debate PUT:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/debates/:id/argumentos — add an argument.
   *
   * `parentId` absent means it hangs from the thesis. With it, the argument
   * answers another argument and its depth is the parent's plus one: depth is
   * derived here, never sent by the client, so no request can flatten the tree.
   */
  app.post('/api/debates/:id/argumentos', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { postura, texto, parentId } = req.body || {};

      const debate = (await db.execute(sql`
        SELECT id, estado FROM debates WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!debate) return res.status(404).json({ error: 'Ese debate no existe.' });
      if (debate.estado === 'cerrado') {
        return res.status(409).json({ error: 'Ese debate está cerrado: se puede leer, no argumentar.' });
      }

      if (!valorValido(res, 'postura', postura, POSTURAS)) return;
      if (!texto || typeof texto !== 'string' || texto.trim().length < 3) {
        return res.status(400).json({ error: 'El argumento necesita un texto.' });
      }
      if (texto.length > TEXTO_MAXIMO) {
        return res.status(400).json({
          error: `Un argumento son ${TEXTO_MAXIMO} caracteres como mucho. Si necesitas más, pártelo en dos: se puede responder a cada uno por separado.`,
        });
      }

      let profundidad = 1;
      if (parentId) {
        const padre = (await db.execute(sql`
          SELECT id, debate_id, profundidad FROM argumentos
          WHERE id = ${parentId} AND archived_at IS NULL
        `)).rows[0] as any;
        if (!padre) return res.status(404).json({ error: 'El argumento al que respondes no existe.' });
        // A parent from another debate would silently move the branch across.
        if (padre.debate_id !== debate.id) {
          return res.status(400).json({ error: 'Ese argumento pertenece a otro debate.' });
        }
        if (padre.profundidad >= PROFUNDIDAD_MAXIMA) {
          return res.status(409).json({
            error: `El hilo ha llegado a ${PROFUNDIDAD_MAXIMA} niveles. A esa profundidad ya no se discute la tesis: abre un debate propio para esto.`,
          });
        }
        profundidad = padre.profundidad + 1;
      }

      const id = newId('ARG');
      await db.execute(sql`
        INSERT INTO argumentos (id, debate_id, parent_id, postura, texto, profundidad,
                                autor_user_id, created_by, updated_by)
        VALUES (${id}, ${debate.id}, ${parentId || null}, ${postura}, ${texto.trim()},
                ${profundidad}, ${req.user!.id}, ${req.user!.id}, ${req.user!.id})
      `);
      // The debate moved: the list orders by this.
      await db.execute(sql`UPDATE debates SET updated_at = now() WHERE id = ${debate.id}`);
      await registrarHistorial(db, {
        entidad: 'argumento', tabla: 'argumentos', id, operacion: 'create',
        previo: null, actor: req.user!.id,
      });
      res.status(201).json({ id, profundidad });
    } catch (e: any) {
      console.error('argumento POST:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/argumentos/:id — correct the wording. The stance never changes. */
  app.put('/api/argumentos/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const previo = (await db.execute(sql`
        SELECT * FROM argumentos WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!previo) return res.status(404).json({ error: 'Ese argumento no existe.' });
      if (!puedeEditar(req, previo.autor_user_id)) {
        return res.status(403).json({ error: 'Solo quien lo escribió, o alguien de nivel Conocimiento, puede editarlo.' });
      }

      const { texto } = req.body || {};
      if (!texto || typeof texto !== 'string' || texto.trim().length < 3) {
        return res.status(400).json({ error: 'El argumento necesita un texto.' });
      }
      if (texto.length > TEXTO_MAXIMO) {
        return res.status(400).json({ error: `Un argumento son ${TEXTO_MAXIMO} caracteres como mucho.` });
      }
      // `postura` is deliberately not editable: people have already answered
      // this argument as a pro or as a con, and flipping it would turn every
      // reply below into an answer to something nobody wrote. Archive it and
      // write the other one instead.

      await db.execute(sql`
        UPDATE argumentos SET texto = ${texto.trim()}, version = version + 1,
          updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${req.params.id}
      `);
      await registrarHistorial(db, {
        entidad: 'argumento', tabla: 'argumentos', id: req.params.id, operacion: 'update',
        previo, actor: req.user!.id,
      });
      res.json({ ok: true });
    } catch (e: any) {
      console.error('argumento PUT:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/argumentos/:id/archivar — take it out of sight, keep it.
   *
   * Constitution rule 6: archive, never delete. Children stay attached to their
   * archived parent, so restoring the parent restores the branch intact.
   */
  app.post('/api/argumentos/:id/archivar', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const previo = (await db.execute(sql`
        SELECT * FROM argumentos WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!previo) return res.status(404).json({ error: 'Ese argumento no existe.' });
      if (!puedeEditar(req, previo.autor_user_id)) {
        return res.status(403).json({ error: 'Solo quien lo escribió, o alguien de nivel Conocimiento, puede retirarlo.' });
      }
      await db.execute(sql`
        UPDATE argumentos SET archived_at = now(), updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${req.params.id}
      `);
      await registrarHistorial(db, {
        entidad: 'argumento', tabla: 'argumentos', id: req.params.id, operacion: 'archive',
        previo, actor: req.user!.id,
      });
      res.json({ ok: true });
    } catch (e: any) {
      console.error('argumento archivar:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/debates/:id/archivar — same rule, for the whole debate. */
  app.post('/api/debates/:id/archivar', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const previo = (await db.execute(sql`
        SELECT * FROM debates WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!previo) return res.status(404).json({ error: 'Ese debate no existe.' });
      if (!puedeEditar(req, previo.autor_user_id)) {
        return res.status(403).json({ error: 'Solo quien lo abrió, o alguien de nivel Conocimiento, puede retirarlo.' });
      }
      await db.execute(sql`
        UPDATE debates SET archived_at = now(), updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${req.params.id}
      `);
      await registrarHistorial(db, {
        entidad: 'debate', tabla: 'debates', id: req.params.id, operacion: 'archive',
        previo, actor: req.user!.id,
      });
      res.json({ ok: true });
    } catch (e: any) {
      console.error('debate archivar:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // SOURCES
  // ==========================================================================

  /**
   * POST /api/veracidad/fuentes — cite something.
   *
   * Anyone at level 1 may add a source to anyone's claim, on purpose: bringing
   * evidence to someone else's argument is the cooperative act this whole area
   * exists to make easy.
   */
  app.post('/api/veracidad/fuentes', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const { entidadTipo, entidadId, titulo, url, autor, publicadoEn, tipo, cita } = req.body || {};

      if (!valorValido(res, 'entidadTipo', entidadTipo, ENTIDADES_CITABLES)) return;
      if (tipo !== undefined && !valorValido(res, 'tipo', tipo, TIPOS_FUENTE)) return;
      if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
        return res.status(400).json({ error: 'La fuente necesita un título: un enlace suelto no dice qué es.' });
      }

      const tabla = entidadTipo === 'debate' ? 'debates' : 'argumentos';
      const existe = await db.execute(sql`
        SELECT id FROM ${sql.raw(tabla)} WHERE id = ${entidadId} AND archived_at IS NULL
      `);
      if (!existe.rows.length) {
        return res.status(404).json({ error: 'No existe aquello que quieres citar.' });
      }

      const id = newId('FUE');
      await db.execute(sql`
        INSERT INTO veracidad_fuentes (id, entidad_tipo, entidad_id, titulo, url, autor,
                                       publicado_en, tipo, cita, autor_user_id, created_by, updated_by)
        VALUES (${id}, ${entidadTipo}, ${entidadId}, ${titulo.trim()}, ${url?.trim() || null},
                ${autor?.trim() || null}, ${publicadoEn || null}, ${tipo || 'documento'},
                ${cita?.trim() || null}, ${req.user!.id}, ${req.user!.id}, ${req.user!.id})
      `);

      // A claim that had nothing behind it now has something. This is the only
      // automatic step of the ladder: everything above `con_fuente` is a human
      // judgement and belongs to phase 2, not to the act of pasting a link.
      if (entidadTipo === 'argumento') {
        await db.execute(sql`
          UPDATE argumentos SET veracidad = 'con_fuente', updated_at = now()
          WHERE id = ${entidadId} AND veracidad = 'sin_fuente'
        `);
      }
      res.status(201).json({ id });
    } catch (e: any) {
      console.error('fuente POST:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * DELETE /api/veracidad/fuentes/:id — withdraw a citation.
   *
   * If it was the last one, the claim goes back to saying `sin_fuente`. A claim
   * that once had a source and lost it must not keep the badge: that would be
   * the interface asserting something it can no longer show.
   */
  app.delete('/api/veracidad/fuentes/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const fuente = (await db.execute(sql`
        SELECT * FROM veracidad_fuentes WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!fuente) return res.status(404).json({ error: 'Esa fuente no existe.' });
      if (!puedeEditar(req, fuente.autor_user_id)) {
        return res.status(403).json({ error: 'Solo quien la citó, o alguien de nivel Conocimiento, puede retirarla.' });
      }

      await db.execute(sql`
        UPDATE veracidad_fuentes SET archived_at = now(), updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${req.params.id}
      `);

      if (fuente.entidad_tipo === 'argumento') {
        const quedan = await db.execute(sql`
          SELECT 1 FROM veracidad_fuentes
          WHERE entidad_tipo = 'argumento' AND entidad_id = ${fuente.entidad_id}
            AND archived_at IS NULL LIMIT 1
        `);
        if (!quedan.rows.length) {
          await db.execute(sql`
            UPDATE argumentos SET veracidad = 'sin_fuente', updated_at = now()
            WHERE id = ${fuente.entidad_id} AND veracidad = 'con_fuente'
          `);
        }
      }
      res.json({ ok: true });
    } catch (e: any) {
      console.error('fuente DELETE:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });
}
