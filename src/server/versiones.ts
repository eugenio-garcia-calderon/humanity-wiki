import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { registrarHistorial } from './historial.js';

// ============================================================================
// HISTORIAL DE VERSIONES DE UNA PÁGINA (2026-10-06, carril «acceso», #8)
// ============================================================================
// El servidor guardaba desde B70 (`historial.ts`) una instantánea por tanda de
// cambios en `entity_history`, y no había forma de verla ni de volver atrás:
// un seguro que nadie podía cobrar.
//
// ── QUÉ ES UNA VERSIÓN ──────────────────────────────────────────────────────
// Cada fila de `entity_history` guarda `previous`: la página tal como estaba
// JUSTO ANTES de una tanda de cambios (el editor guarda cada 1,2 s y el
// historial agrupa por dos minutos). Ése es el dato fiable, y cada uno es una
// versión: su fecha y su autor salen de la propia fila guardada
// (`updated_at`, `updated_by`), o sea, quién escribió ESE estado y cuándo.
// La de arriba del todo es la página tal como está ahora.
//
// ── RESTAURAR NO BORRA NADA ─────────────────────────────────────────────────
// Volver a una versión es un cambio más: primero se guarda en el historial lo
// que hay ahora (sin agrupar), y luego se escribe la versión elegida con su
// número nuevo. Restaurar por error se deshace restaurando la de antes.

export function registrarVersiones(app: Express, db: any) {
  async function poder(req: Request, res: Response, id: string, para: 'ver' | 'editar') {
    if (!req.user) { res.status(401).json({ error: 'Inicia sesión.' }); return false; }
    const a = await rolEnPagina(db, quienDe(req), id);
    if (!a.existe) { res.status(404).json({ error: 'Esa página no existe.' }); return false; }
    const c = capacidades(a);
    // Ver el historial es de quien edita: enseña lo que se quitó, que puede
    // ser justo lo que no se quería enseñar a quien sólo lee.
    if (!c.editar) { res.status(403).json({ error: para === 'editar' ? 'Solo quien puede editar la página la restaura.' : 'El historial lo ve quien puede editar la página.' }); return false; }
    return true;
  }

  /** La lista: fecha, autor y número de cada versión, sin el contenido. */
  app.get('/api/versiones/pagina/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!(await poder(req, res, id, 'ver'))) return;
      const actual = (await db.execute(sql`
        SELECT w.version, w.updated_at, COALESCE(u.display_name, u.name) AS autor
        FROM knowledge_windows w LEFT JOIN users u ON u.id = COALESCE(w.updated_by, w.creator_user_id) WHERE w.id = ${id}
      `)).rows[0] as any;
      const r = await db.execute(sql`
        SELECT h.id, (h.previous->>'version')::int AS version,
               COALESCE(h.previous->>'updated_at', h.previous->>'created_at') AS fecha,
               COALESCE(u.display_name, u.name) AS autor, h.operation,
               jsonb_array_length(COALESCE(h.previous->'config'->'bloques', '[]'::jsonb)) AS bloques
        FROM entity_history h
        LEFT JOIN users u ON u.id = COALESCE(h.previous->>'updated_by', h.previous->>'creator_user_id')
        WHERE h.entity_type = 'knowledge_windows' AND h.entity_id = ${id} AND h.previous IS NOT NULL
        ORDER BY h.changed_at DESC
        LIMIT 300
      `);
      // Dos filas pueden guardar el mismo estado (dos personas a la vez): una.
      const vistas = new Set<number>([Number(actual?.version)]);
      const versiones = (r.rows as any[]).filter(v => !vistas.has(v.version) && vistas.add(v.version));
      res.json({ actual: { version: actual?.version, fecha: actual?.updated_at, autor: actual?.autor }, versiones });
    } catch (e: any) { console.error('versiones:', e); res.status(500).json({ error: e.message }); }
  });

  /** Una versión entera (título y bloques), para verla y compararla. */
  app.get('/api/versiones/pagina/:id/:hid', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!(await poder(req, res, id, 'ver'))) return;
      const h = (await db.execute(sql`
        SELECT previous->>'title' AS titulo, previous->'config' AS config, (previous->>'version')::int AS version
        FROM entity_history WHERE id = ${Number(req.params.hid) || 0} AND entity_type = 'knowledge_windows' AND entity_id = ${id}
      `)).rows[0] as any;
      if (!h) return res.status(404).json({ error: 'Esa versión no existe.' });
      res.json({ titulo: h.titulo, bloques: h.config?.bloques || [], version: h.version });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Restaurar una versión: crea una versión nueva con aquel contenido. */
  app.post('/api/versiones/pagina/:id/:hid/restaurar', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!(await poder(req, res, id, 'editar'))) return;
      const h = (await db.execute(sql`
        SELECT previous->>'title' AS titulo, previous->'config' AS config
        FROM entity_history WHERE id = ${Number(req.params.hid) || 0} AND entity_type = 'knowledge_windows' AND entity_id = ${id}
      `)).rows[0] as any;
      if (!h?.config) return res.status(404).json({ error: 'Esa versión no existe.' });
      const antes = (await db.execute(sql`SELECT * FROM knowledge_windows WHERE id = ${id}`)).rows[0];
      // Del `config` se recupera el contenido, no los ajustes que viven al lado
      // (el sitio publicado, el menú…): restaurar un párrafo no debe apagar el
      // menú de una web que se cambió después.
      await db.execute(sql`
        UPDATE knowledge_windows SET
          title = COALESCE(${h.titulo}, title),
          config = config || jsonb_build_object('bloques', COALESCE(${JSON.stringify(h.config)}::jsonb->'bloques', '[]'::jsonb)),
          version = version + 1, updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${id}
      `);
      await registrarHistorial(db, { entidad: 'knowledge_windows', tabla: 'knowledge_windows', id, operacion: 'restore', previo: antes, actor: req.user!.id });
      res.json({ ok: true });
    } catch (e: any) { console.error('restaurar:', e); res.status(500).json({ error: e.message }); }
  });
}
