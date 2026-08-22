// ============================================================================
// EL HORMIGUERO — el canal con quien programa (2026-08-22)
// ============================================================================
// Eugenio: «permite al usuario crear tareas para el equipo de desarrollo de la
// APP […] esta va a ser la forma en la que nos comuniques».
//
// Es de ida y vuelta: él escribe lo que falla o lo que quiere, y quien programa
// contesta cambiando el estado y dejando dicho qué le hace falta. Por eso hay
// `respuesta` y `necesita` y no solo un estado: un semáforo sin texto dice que
// algo está parado y no por qué, y entonces hay que preguntar por otro canal —
// que es justo lo que esto viene a sustituir.
//
// QUIÉN PUEDE QUÉ: cualquiera con sesión abre una incidencia y edita las suyas
// mientras estén esperando. El ESTADO solo lo cambia un administrador, porque
// es quien programa: si el que la abre pudiera marcarla «hecha», el tablero
// dejaría de decir lo que de verdad está hecho.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

const ESTADOS = new Set(['esperando', 'bloqueada', 'hecha']);
const CLASES = new Set(['fallo', 'mejora']);

const nuevoId = () => `INC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

export function registerIncidenciasRoutes(app: Express, db: any) {
  /** GET /api/incidencias — todo el hormiguero, lo más nuevo primero.
   *
   *  SIN FILTRO POR AUTOR: esto no es la bandeja de nadie, es un tablero
   *  común. Ver lo que ya reportó otro es lo que evita reportarlo dos veces. */
  app.get('/api/incidencias', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT i.*, u.display_name AS autor_nombre, u.avatar_url AS autor_foto
        FROM incidencias i LEFT JOIN users u ON u.id = i.autor_user_id
        WHERE i.archived_at IS NULL
        ORDER BY
          -- LO QUE NECESITA A UNA PERSONA, ARRIBA DEL TODO. Es lo único de esta
          -- lista que está parado esperando a alguien, y enterrarlo entre lo
          -- demás es cómo se quedan las cosas paradas una semana.
          CASE i.estado WHEN 'bloqueada' THEN 0 WHEN 'esperando' THEN 1 ELSE 2 END,
          i.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) {
      console.error('incidencias GET:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/incidencias — anotar algo que falla o que falta. */
  app.post('/api/incidencias', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para anotar algo.' });
    try {
      const titulo = String(req.body?.titulo || '').trim();
      if (!titulo) return res.status(400).json({ error: 'Cuéntame en una línea qué pasa.' });
      const clase = CLASES.has(String(req.body?.clase)) ? String(req.body.clase) : 'fallo';
      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO incidencias (id, titulo, detalle, clase, autor_user_id)
        VALUES (${id}, ${titulo.slice(0, 300)}, ${req.body?.detalle || null}, ${clase}, ${req.user.id})
      `);
      const r = await db.execute(sql`
        SELECT i.*, u.display_name AS autor_nombre, u.avatar_url AS autor_foto
        FROM incidencias i LEFT JOIN users u ON u.id = i.autor_user_id WHERE i.id = ${id}
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('incidencias POST:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/incidencias/:id — cambiar estado, responder, o corregir la tuya.
   *
   * EL ESTADO ES DE QUIEN PROGRAMA. Un administrador puede moverlo y dejar
   * dicho qué necesita; el autor solo puede corregir el texto de la suya
   * mientras siga esperando. Dejar que el autor la marcase hecha convertiría el
   * tablero en una lista de deseos con casillas marcadas por ilusión.
   */
  app.put('/api/incidencias/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const fila = await db.execute(sql`SELECT * FROM incidencias WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const i = fila.rows[0] as any;
      if (!i) return res.status(404).json({ error: 'Esa nota no existe.' });

      const admin = (req.user.roleLevel ?? 0) >= 4;
      const suya = i.autor_user_id === req.user.id;
      if (!admin && !suya) return res.status(403).json({ error: 'Esa nota no es tuya.' });

      const d = req.body || {};
      const estado = admin && ESTADOS.has(String(d.estado)) ? String(d.estado) : null;
      if (d.estado && !admin) {
        return res.status(403).json({ error: 'El estado lo cambia quien programa.' });
      }
      // «Bloqueada» SIN decir qué hace falta no se acepta: un naranja mudo es
      // exactamente el problema que este campo viene a resolver.
      if (estado === 'bloqueada' && !String(d.necesita || i.necesita || '').trim()) {
        return res.status(400).json({ error: 'Si está bloqueada, di qué hace falta.' });
      }

      await db.execute(sql`
        UPDATE incidencias SET
          titulo    = COALESCE(${suya && !i.respuesta ? (d.titulo ?? null) : null}, titulo),
          detalle   = COALESCE(${suya ? (d.detalle ?? null) : null}, detalle),
          estado    = COALESCE(${estado}, estado),
          necesita  = COALESCE(${admin ? (d.necesita ?? null) : null}, necesita),
          respuesta = COALESCE(${admin ? (d.respuesta ?? null) : null}, respuesta),
          updated_at = now()
        WHERE id = ${req.params.id}
      `);
      const r = await db.execute(sql`
        SELECT i.*, u.display_name AS autor_nombre, u.avatar_url AS autor_foto
        FROM incidencias i LEFT JOIN users u ON u.id = i.autor_user_id WHERE i.id = ${req.params.id}
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('incidencias PUT:', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE — se archiva, como todo aquí (regla 6 de la Constitución). */
  app.delete('/api/incidencias/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const fila = await db.execute(sql`SELECT autor_user_id FROM incidencias WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const i = fila.rows[0] as any;
      if (!i) return res.status(404).json({ error: 'Esa nota no existe.' });
      if (i.autor_user_id !== req.user.id && (req.user.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: 'Esa nota no es tuya.' });
      }
      await db.execute(sql`UPDATE incidencias SET archived_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GET /api/incidencias/cuenta — para el punto del botón de la hormiga.
   *  Solo el número, como la campana: pedir la lista entera para pintar un
   *  punto es traerse un tablero para mirar un color. */
  app.get('/api/incidencias/cuenta', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE estado = 'bloqueada')::int AS bloqueadas,
          count(*) FILTER (WHERE estado = 'esperando')::int AS esperando
        FROM incidencias WHERE archived_at IS NULL
      `);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
