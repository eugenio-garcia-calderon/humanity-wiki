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
// is why this is not built on top of it (drizzle/0078 has the long version).

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

/**
 * The rungs a person decides. `sin_fuente` and `con_fuente` are missing on
 * purpose: those two follow the citations, and a hand that could set them would
 * make the badge say something the sources do not.
 */
export const VERACIDADES_REVISABLES = ['verificada', 'disputada', 'refutada'] as const;

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

  /**
   * Recalcula el promedio guardado en `argumentos` a partir de los votos.
   *
   * ES UNA COPIA A PROPÓSITO: el promedio vive también en `ratings` y se podría
   * calcular al leer, pero entonces ordenar un debate por impacto obligaría a
   * agregar toda la tabla de puntuaciones de la plataforma en cada apertura de
   * pantalla. Se guarda aquí, y se refresca en el mismo momento en que cambia
   * — que es la única forma en que una copia no miente.
   *
   * SIN VOTOS VUELVE A `NULL`, NO A CERO. Cero es «la gente votó y no mueve a
   * nadie»; NULL es «nadie ha votado». Son dos cosas distintas y la pantalla
   * las dice distinto.
   */
  const refrescarImpacto = async (argumentoId: string) => {
    const agg = (await db.execute(sql`
      SELECT round(avg(score)::numeric, 2)::float AS media, count(*)::int AS votos
      FROM ratings WHERE entity_type = 'argumento' AND entity_id = ${argumentoId}
    `)).rows[0] as any;
    const media = agg?.votos ? agg.media : null;
    await db.execute(sql`
      UPDATE argumentos SET impacto = ${media}, votos = ${agg?.votos || 0}, updated_at = now()
      WHERE id = ${argumentoId}
    `);
    return { impacto: media, votos: agg?.votos || 0 };
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

      // `mi_voto` sale de la misma tabla `ratings` que guarda el resto de
      // puntuaciones de la plataforma. Sin sesión es NULL — y NULL aquí
      // significa «no has votado», que no es lo mismo que votar bajo.
      const yo = req.user?.id || null;
      const args = await db.execute(sql`
        SELECT a.id, a.debate_id, a.parent_id, a.postura, a.texto, a.profundidad, a.veracidad,
               a.veracidad_por, a.veracidad_en, a.veracidad_motivo,
               a.impacto, a.votos, a.autor_user_id, a.is_ai_generated, a.created_at, a.updated_at,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               v.score AS mi_voto
        FROM argumentos a
        LEFT JOIN users u ON u.id = a.autor_user_id
        LEFT JOIN ratings v ON v.entity_type = 'argumento' AND v.entity_id = a.id
                           AND v.user_id = ${yo}
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

      // ── LO QUE MÁS MUEVE, PRIMERO ──────────────────────────────────────
      // Y lo que nadie ha votado NO se hunde al fondo: iría al fondo el día
      // que se escribe, donde nadie lo lee, y de ahí no sale nunca — el voto
      // que le faltaba se lo negaría el propio orden. Va justo detrás de lo
      // más votado y por delante de lo que ya se juzgó flojo, que es lo más
      // cerca de «todavía no lo sé» que puede estar una lista.
      const porImpacto = (a: any, b: any) => {
        const ia = a.impacto, ib = b.impacto;
        if (ia === null && ib === null) return +new Date(b.created_at) - +new Date(a.created_at);
        if (ia === null) return ib >= 3 ? 1 : -1;
        if (ib === null) return ia >= 3 ? -1 : 1;
        return ib - ia;
      };
      const ordenar = (lista: any[]) => {
        lista.sort(porImpacto);
        for (const n of lista) ordenar(n.hijos);
      };
      ordenar(raiz);

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
  // THE SPECTRUM OF VIEWS (phase 6)
  // ==========================================================================

  /**
   * Which side of the thesis an argument ends up supporting.
   *
   * A stance is relative to what it answers, not to the thesis: «a favor» hung
   * under an «en contra» argument reinforces the AGAINST side. So the side is
   * the product of the signs down the path — the reason a debate is a tree and
   * not a list of opinions.
   *
   * `matiza` scores 0 for itself (it takes no side, that is the point) but its
   * children keep the side of what it qualifies. Otherwise a whole branch would
   * fall silent because somebody added a nuance halfway.
   */
  const ladosDelArbol = (filas: any[]): Map<string, number> => {
    const hijosDe = new Map<string, any[]>();
    for (const a of filas) {
      const k = a.parent_id || '';
      (hijosDe.get(k) || hijosDe.set(k, []).get(k)!).push(a);
    }
    const lados = new Map<string, number>();
    const bajar = (padreId: string, ladoDelPadre: number) => {
      for (const a of hijosDe.get(padreId) || []) {
        const propio = a.postura === 'matiza' ? 0 : ladoDelPadre * (a.postura === 'a_favor' ? 1 : -1);
        lados.set(a.id, propio);
        bajar(a.id, propio !== 0 ? propio : ladoDelPadre);
      }
    };
    bajar('', 1);
    return lados;
  };

  /** Las cinco bandas, de un extremo al otro. El orden es el del dibujo. */
  const BANDAS = [
    { clave: 'muy_en_contra', label: 'Muy en contra', hasta: -0.6 },
    { clave: 'en_contra', label: 'En contra', hasta: -0.2 },
    { clave: 'en_medio', label: 'En medio', hasta: 0.2 },
    { clave: 'a_favor', label: 'A favor', hasta: 0.6 },
    { clave: 'muy_a_favor', label: 'Muy a favor', hasta: 1.01 },
  ] as const;

  /**
   * GET /api/debates/:slug/espectro — el reparto de posturas, no un veredicto.
   *
   * Lo que Eugenio pidió por su nombre: «poder generar un espectro de visiones
   * sobre una verdad». La postura de cada persona NO se le pregunta: **sale de
   * lo que ha votado**, porque lo que alguien dice que piensa y lo que le mueve
   * de verdad no siempre coinciden — y porque dos personas pueden estar a favor
   * por razones opuestas, y eso solo se ve mirando QUÉ argumento sostiene cada
   * una.
   *
   * Se puede leer sin sesión: el reparto es del debate, no tuyo.
   */
  app.get('/api/debates/:slug/espectro', async (req: Request, res: Response) => {
    try {
      const d = (await db.execute(sql`
        SELECT id, tesis FROM debates WHERE slug = ${req.params.slug} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!d) return res.status(404).json({ error: 'Ese debate no existe.' });

      const filas = (await db.execute(sql`
        SELECT id, parent_id, postura, texto, impacto, votos
        FROM argumentos WHERE debate_id = ${d.id} AND archived_at IS NULL
        ORDER BY profundidad, created_at
      `)).rows as any[];

      const votos = (await db.execute(sql`
        SELECT v.user_id, v.entity_id, v.score, u.display_name AS nombre, u.avatar_url AS avatar
        FROM ratings v
        LEFT JOIN users u ON u.id = v.user_id
        WHERE v.entity_type = 'argumento'
          AND v.entity_id IN (SELECT id FROM argumentos WHERE debate_id = ${d.id} AND archived_at IS NULL)
      `)).rows as any[];

      const lados = ladosDelArbol(filas);
      const porArgumento = new Map(filas.map((a) => [a.id, a]));

      // Cada persona: cuánto peso ha puesto de cada lado.
      const gente = new Map<string, { nombre: string; avatar: string | null; favor: number; contra: number; matices: number; votos: number }>();
      for (const v of votos) {
        const lado = lados.get(v.entity_id);
        if (lado === undefined) continue;
        const p = gente.get(v.user_id) || { nombre: v.nombre || 'Alguien', avatar: v.avatar, favor: 0, contra: 0, matices: 0, votos: 0 };
        p.votos++;
        if (lado > 0) p.favor += v.score;
        else if (lado < 0) p.contra += v.score;
        else p.matices += v.score;
        gente.set(v.user_id, p);
      }

      const bandas = BANDAS.map((b) => ({ ...b, personas: 0, sumaPorArgumento: new Map<string, { suma: number; n: number }>() }));
      let sinPostura = 0;

      for (const [userId, p] of gente) {
        const peso = p.favor + p.contra;
        // SOLO HA VOTADO MATICES: no tiene postura, y eso NO es estar en medio.
        // Meterlo en la banda central inventaría un centrista que no existe.
        if (peso === 0) { sinPostura++; continue; }
        const posicion = (p.favor - p.contra) / peso;   // −1 … +1
        const banda = bandas.find((b) => posicion < b.hasta) || bandas[bandas.length - 1];
        banda.personas++;
        for (const v of votos) {
          if (v.user_id !== userId) continue;
          const acc = banda.sumaPorArgumento.get(v.entity_id) || { suma: 0, n: 0 };
          acc.suma += v.score; acc.n++;
          banda.sumaPorArgumento.set(v.entity_id, acc);
        }
      }

      const conPostura = bandas.reduce((n, b) => n + b.personas, 0);

      res.json({
        tesis: d.tesis,
        personas: conPostura,
        sin_postura: sinPostura,
        // POCA GENTE NO ES UN REPARTO. Se dice aquí, y no se deja que la
        // pantalla lo deduzca de un número que también podría no mirar.
        suficiente: conPostura >= 3,
        bandas: bandas.map((b) => {
          // El argumento que más mueve a ESTA banda: su mejor razón, la que
          // habría que rebatir para moverla de sitio.
          let mejor: any = null;
          for (const [argId, acc] of b.sumaPorArgumento) {
            const media = acc.suma / acc.n;
            if (!mejor || media > mejor.media) {
              const a = porArgumento.get(argId);
              if (a) mejor = { id: a.id, texto: a.texto, media: Math.round(media * 100) / 100, personas: acc.n };
            }
          }
          return { clave: b.clave, label: b.label, personas: b.personas, mejor_argumento: mejor };
        }),
      });
    } catch (e: any) {
      console.error('espectro GET:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // THE IMPACT VOTE (phase 5)
  // ==========================================================================

  /**
   * PUT /api/argumentos/:id/voto — «¿cuánto te mueve esto?», de 1 a 5.
   *
   * NO ES UN «ME GUSTA». Un argumento puede caerte fatal y moverte mucho, y ese
   * es exactamente el que tiene que subir. La pregunta de la pantalla no es si
   * te gusta, es cuánto te cambia la postura.
   *
   * PUEDES VOTAR LO TUYO. Kialo tampoco lo impide, y el motivo no es pereza:
   * un voto propio entre cientos no mueve nada, y prohibirlo obligaría a
   * explicar por qué el autor es el único que no puede decir cuánto le importa
   * su propio argumento. Distinto de revisar, que sí está prohibido: revisar
   * afirma sobre el común, votar solo dice lo que te pasa a ti.
   *
   * Se guarda en `ratings`, la tabla que la plataforma ya usa para puntuar
   * cosas — la misma que escribe `POST /api/rate` en `knowledge.ts`. Esta ruta
   * existe aparte porque además refresca el promedio guardado en `argumentos`,
   * que es lo que ordena las ramas; `/api/rate` no sabe nada de eso.
   */
  app.put('/api/argumentos/:id/voto', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const valor = Number(req.body?.valor);
      if (!Number.isInteger(valor) || valor < 1 || valor > 5) {
        return res.status(400).json({ error: 'El voto va de 1 a 5: cuánto te mueve este argumento.' });
      }

      const argumento = (await db.execute(sql`
        SELECT id, debate_id FROM argumentos WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!argumento) return res.status(404).json({ error: 'Ese argumento no existe.' });

      // Un debate cerrado se lee: ni se argumenta ni se vota. Si no, el
      // resultado seguiría moviéndose después de darlo por cerrado.
      const debate = (await db.execute(sql`
        SELECT estado FROM debates WHERE id = ${argumento.debate_id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (debate?.estado === 'cerrado') {
        return res.status(409).json({ error: 'Ese debate está cerrado: ya no se vota.' });
      }

      await db.execute(sql`
        INSERT INTO ratings (user_id, entity_type, entity_id, score)
        VALUES (${req.user!.id}, 'argumento', ${argumento.id}, ${valor})
        ON CONFLICT (user_id, entity_type, entity_id)
        DO UPDATE SET score = EXCLUDED.score, updated_at = now()
      `);
      const agg = await refrescarImpacto(argumento.id);
      res.json({ ok: true, ...agg, mi_voto: valor });
    } catch (e: any) {
      console.error('voto PUT:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * DELETE /api/argumentos/:id/voto — retirar el voto.
   *
   * Cambiar de opinión al leer es lo que se quiere que pase, y eso incluye
   * dejar de tener opinión. Sin esta ruta, un voto sería para siempre.
   */
  app.delete('/api/argumentos/:id/voto', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      await db.execute(sql`
        DELETE FROM ratings
        WHERE user_id = ${req.user!.id} AND entity_type = 'argumento' AND entity_id = ${req.params.id}
      `);
      const agg = await refrescarImpacto(req.params.id);
      res.json({ ok: true, ...agg, mi_voto: null });
    } catch (e: any) {
      console.error('voto DELETE:', e?.cause?.message || e);
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
   * PUT /api/argumentos/:id/veracidad — a reviewer moves the badge.
   *
   * Level 3 (KNOWLEDGE), and never the author of the claim: signing off your
   * own argument as verified is not a review, it is an assertion with extra
   * steps. `sin_fuente` and `con_fuente` are not on offer here — those two the
   * sources decide by themselves, and letting a person set them by hand would
   * make the badge say something the citations do not.
   */
  app.put('/api/argumentos/:id/veracidad', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.KNOWLEDGE)) return;
      const { veracidad, motivo } = req.body || {};
      if (!valorValido(res, 'veracidad', veracidad, VERACIDADES_REVISABLES)) return;

      const previo = (await db.execute(sql`
        SELECT * FROM argumentos WHERE id = ${req.params.id} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!previo) return res.status(404).json({ error: 'Ese argumento no existe.' });

      // An admin is not exempt: the rule is about who wrote it, not about rank.
      if (previo.autor_user_id === req.user!.id) {
        return res.status(403).json({
          error: 'No puedes revisar tu propio argumento. Pídeselo a otra persona de nivel Conocimiento.',
        });
      }
      // Saying something is false without saying why leaves the author nothing
      // to answer and the reader nothing to check.
      if ((veracidad === 'refutada' || veracidad === 'disputada') && !motivo?.trim()) {
        return res.status(400).json({
          error: 'Di por qué. Marcar algo como refutado o disputado sin motivo no se puede responder ni comprobar.',
        });
      }

      await db.execute(sql`
        UPDATE argumentos SET
          veracidad = ${veracidad},
          veracidad_por = ${req.user!.displayName || req.user!.email || req.user!.id},
          veracidad_en = now(),
          veracidad_motivo = ${motivo?.trim() || null},
          version = version + 1, updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${req.params.id}
      `);
      await registrarHistorial(db, {
        entidad: 'argumento', tabla: 'argumentos', id: req.params.id, operacion: 'update',
        previo, actor: req.user!.id,
      });
      res.json({ ok: true });
    } catch (e: any) {
      console.error('veracidad PUT:', e?.cause?.message || e);
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
