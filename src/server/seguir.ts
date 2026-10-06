import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { paginaVisible } from './sitios.js';
import { accesoMiembro } from './miembros.js';
import { avisar } from './avisos.js';

// ============================================================================
// SEGUIR PÁGINAS (2026-10-06, carril «acceso», #31)
// ============================================================================
// Seguir una persona ya existía (`POST /api/follow`, tabla `follows`). Aquí se
// añade seguir una PÁGINA: la misma tabla con `entity_type = 'pagina'`, así
// que no hay segunda tabla ni segundo contador que se separen.
//
// ── SÓLO SE SIGUE LO QUE SE VE ──────────────────────────────────────────────
// Seguir una página privada de otra persona sería una forma de enterarse de
// que cambia (y de que existe). Se exige poder verla, y cada vez que cambia se
// vuelve a comprobar: quien dejó de tener acceso deja de recibir avisos, y su
// fila de seguidor se queda ahí (si le devuelven el acceso, sigue).
//
// ── AVISAR CUANDO CAMBIA, SIN ENSORDECER ────────────────────────────────────
// El editor guarda cada 1,2 s. Un aviso por guardado serían cientos por
// sesión de escritura. Se avisa como mucho una vez cada seis horas por
// seguidor y página, y sólo si el aviso anterior ya se leyó o es viejo: una
// campana con diez «ha cambiado X» seguidos enseña a ignorarla.

const HORAS = 6;

/** Cuántos siguen una página, y si yo la sigo. */
async function resumen(db: any, paginaId: string, yo?: string) {
  const r = await db.execute(sql`
    SELECT count(*)::int AS n,
           bool_or(follower_user_id = ${yo ?? ''}) AS yo
    FROM follows WHERE entity_type = 'pagina' AND entity_id = ${paginaId}
  `);
  const f = r.rows[0] as any;
  return { seguidores: Number(f?.n ?? 0), siguiendo: !!f?.yo };
}

/**
 * Avisa a quienes siguen esta página de que ha cambiado. La llama el guardado
 * de páginas (`knowledge.ts`) sin esperar: nunca retrasa ni rompe un guardado.
 */
export async function avisarSeguidoresDePagina(db: any, paginaId: string, actor: string): Promise<void> {
  try {
    const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${paginaId} AND deleted_at IS NULL`)).rows[0] as any;
    if (!t) return;
    // Los que siguen y todavía no tienen un aviso reciente de esta página.
    const r = await db.execute(sql`
      SELECT f.follower_user_id AS id, u.role_level
      FROM follows f JOIN users u ON u.id = f.follower_user_id AND u.archived_at IS NULL AND u.deleted_at IS NULL
      WHERE f.entity_type = 'pagina' AND f.entity_id = ${paginaId} AND f.follower_user_id <> ${actor}
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = f.follower_user_id AND n.type = 'pagina_cambiada' AND n.entity_id = ${paginaId}
            AND n.created_at > now() - make_interval(hours => ${HORAS})
        )
      LIMIT 500
    `);
    if (!r.rows.length) return;
    const publica = await paginaVisible(db, paginaId);
    for (const s of r.rows as any[]) {
      const ve = publica || capacidades(await rolEnPagina(db, { id: s.id, nivel: Number(s.role_level ?? 1) }, paginaId)).ver;
      if (!ve) continue;
      await avisar(db, { paraQuien: s.id, dePartede: actor, tipo: 'pagina_cambiada', entidadTipo: 'knowledge_windows', entidadId: paginaId, datos: { titulo: t.title || 'Sin título' } });
    }
  } catch (e: any) { console.error('seguidores de página:', e?.message || e); }
}

export function registrarSeguir(app: Express, db: any) {
  async function puedeVer(req: Request, paginaId: string) {
    const a = await rolEnPagina(db, quienDe(req), paginaId);
    if (!a.existe) return null;
    if (capacidades(a).ver || await paginaVisible(db, paginaId)) return a;
    const m = await accesoMiembro(db, req, paginaId);
    return m && m.permitido && (m.restringida || m.esEquipo) ? a : false;
  }

  /** Cuántos la siguen y si yo la sigo. Cualquiera que la vea. */
  app.get('/api/seguir/pagina/:id', async (req: Request, res: Response) => {
    try {
      const a = await puedeVer(req, String(req.params.id));
      if (a === null) return res.status(404).json({ error: 'Esa página no existe.' });
      if (a === false) return res.status(403).json({ error: 'No tienes acceso a esta página.' });
      res.json({ ...(await resumen(db, String(req.params.id), req.user?.id)), es_duenyo: !!req.user && req.user.id === a.duenyo });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Seguir o dejar de seguir. Alterna, como `POST /api/follow`. */
  app.post('/api/seguir/pagina/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión para seguir páginas.' });
      const id = String(req.params.id);
      const a = await puedeVer(req, id);
      if (a === null) return res.status(404).json({ error: 'Esa página no existe.' });
      if (a === false) return res.status(403).json({ error: 'No tienes acceso a esta página.' });
      if (a.duenyo === req.user.id) return res.status(400).json({ error: 'Es tu página: ya te enteras de sus cambios.' });
      const quitado = await db.execute(sql`
        DELETE FROM follows WHERE follower_user_id = ${req.user.id} AND entity_type = 'pagina' AND entity_id = ${id} RETURNING 1
      `);
      let siguiendo = false;
      if (!quitado.rows.length) {
        await db.execute(sql`INSERT INTO follows (follower_user_id, entity_type, entity_id) VALUES (${req.user.id}, 'pagina', ${id})`);
        siguiendo = true;
        const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${id}`)).rows[0] as any;
        void avisar(db, { paraQuien: a.duenyo, dePartede: req.user.id, tipo: 'seguidor', entidadTipo: 'knowledge_windows', entidadId: id, datos: { titulo: t?.title || 'Sin título' } });
      }
      res.json({ ...(await resumen(db, id, req.user.id)), siguiendo });
    } catch (e: any) { console.error('seguir página:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * LA LISTA DE SEGUIDORES de una página. Sólo nombre y foto, y sólo a quien
   * la ve: es lo mismo que enseña el perfil de cada persona, no más.
   */
  app.get('/api/seguir/pagina/:id/seguidores', async (req: Request, res: Response) => {
    try {
      const a = await puedeVer(req, String(req.params.id));
      if (a === null) return res.status(404).json({ error: 'Esa página no existe.' });
      if (a === false) return res.status(403).json({ error: 'No tienes acceso a esta página.' });
      const r = await db.execute(sql`
        SELECT u.id, COALESCE(u.display_name, u.name) AS nombre, u.avatar_url AS foto, f.created_at
        FROM follows f JOIN users u ON u.id = f.follower_user_id AND u.archived_at IS NULL AND u.deleted_at IS NULL
        WHERE f.entity_type = 'pagina' AND f.entity_id = ${req.params.id}
          AND NOT bloqueado_entre(${req.user?.id ?? ''}, u.id)
        ORDER BY f.created_at DESC LIMIT 200
      `);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Las páginas que sigo (las que aún puedo ver). */
  app.get('/api/seguir/mis-paginas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const r = await db.execute(sql`
        SELECT w.id, w.title AS titulo, w.config->>'icono' AS icono, w.updated_at
        FROM follows f JOIN knowledge_windows w ON w.id = f.entity_id AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
        WHERE f.follower_user_id = ${req.user.id} AND f.entity_type = 'pagina'
        ORDER BY f.created_at DESC LIMIT 200
      `);
      const visibles: any[] = [];
      for (const p of r.rows as any[]) {
        if (await paginaVisible(db, p.id) || capacidades(await rolEnPagina(db, quienDe(req), p.id)).ver) visibles.push(p);
      }
      res.json({ paginas: visibles });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
