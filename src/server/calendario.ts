import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// CALENDARIO (2026-08-20, petición de Eugenio: «que sea un calendario TOP, con
// todas las funcionalidades»).
// ============================================================================
// LA IDEA QUE MANDA: el calendario NO es un sitio donde se guardan cosas. Es
// una FORMA DE MIRAR lo que ya existe, ordenado por cuándo pasa.
//
// Por eso `GET /api/calendario` no lee una tabla, lee varias y las junta:
//
//   · `eventos`        — lo que pasa en un momento (reuniones, viajes…). Es lo
//                        único que nace aquí, porque no existía.
//   · `roadmap_items`  — tus tareas, las que tienen fecha de vencimiento. NO
//                        se copian: se leen de donde viven. Copiarlas habría
//                        creado dos verdades que se separan al primer cambio.
//
// Añadir una fuente más el día de mañana (un pago que vence, una publicación
// programada) es añadir una consulta aquí y nada más: ni tabla, ni copia, ni
// sincronización que se pueda romper.

const nuevoId = () =>
  `EVT${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

export function registerCalendarioRoutes(app: Express, db: any) {
  /** Solo el dueño toca su evento (o un administrador). */
  const mio = async (req: Request, id: string) => {
    const r = await db.execute(sql`
      SELECT creador_user_id FROM eventos WHERE id = ${id} AND archived_at IS NULL
    `);
    if (!r.rows.length) return null;
    const suyo = (r.rows[0] as any).creador_user_id === req.user!.id;
    return (suyo || (req.user!.roleLevel ?? 0) >= 4) ? true : false;
  };

  /**
   * GET /api/calendario?desde=YYYY-MM-DD&hasta=YYYY-MM-DD[&proyecto=ID]
   * Todo lo que te pasa en ese tramo, de todas las fuentes, en un solo formato.
   */
  app.get('/api/calendario', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para ver tu calendario.' });
    try {
      const yo = req.user.id;
      const desde = String(req.query.desde || '');
      const hasta = String(req.query.hasta || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
        return res.status(400).json({ error: 'Faltan las fechas del tramo.' });
      }
      const proyecto = (req.query.proyecto as string) || null;

      const [eventos, tareas] = await Promise.all([
        db.execute(sql`
          SELECT e.id, e.titulo, e.descripcion, e.inicio, e.fin, e.todo_el_dia,
                 e.lugar, e.color, e.icono, e.proyecto_id, e.repeticion,
                 p.titulo AS proyecto_titulo, p.slug AS proyecto_slug, p.icono AS proyecto_icono
          FROM eventos e
          LEFT JOIN proyectos p ON p.id = e.proyecto_id AND p.archived_at IS NULL
          WHERE e.creador_user_id = ${yo} AND e.archived_at IS NULL
            -- Un evento entra si SOLAPA con el tramo, no solo si empieza
            -- dentro: un viaje de tres días que arrancó el mes pasado sigue
            -- ocupando estos días.
            AND e.inicio < (${hasta}::date + 1)
            AND coalesce(e.fin, e.inicio) >= ${desde}::date
            AND (${proyecto}::text IS NULL OR e.proyecto_id = ${proyecto})
          ORDER BY e.inicio
          LIMIT 1000
        `),
        db.execute(sql`
          SELECT r.id, r.titulo, r.estado, r.prioridad, r.vence_el, r.proyecto_id,
                 r.icono, p.titulo AS proyecto_titulo, p.slug AS proyecto_slug
          FROM roadmap_items r
          LEFT JOIN proyectos p ON p.id = r.proyecto_id AND p.archived_at IS NULL
          WHERE r.archived_at IS NULL AND r.vence_el IS NOT NULL
            AND r.vence_el BETWEEN ${desde}::date AND ${hasta}::date
            -- Tuyas: las que escribiste o las de un proyecto tuyo.
            AND (r.autor_user_id = ${yo} OR p.creador_user_id = ${yo})
            AND (${proyecto}::text IS NULL OR r.proyecto_id = ${proyecto})
          ORDER BY r.vence_el
          LIMIT 1000
        `),
      ]);

      const items = [
        ...(eventos.rows as any[]).map(e => ({
          clase: 'evento' as const,
          id: e.id, titulo: e.titulo, descripcion: e.descripcion,
          inicio: e.inicio, fin: e.fin, todoElDia: !!e.todo_el_dia,
          lugar: e.lugar, color: e.color, icono: e.icono || e.proyecto_icono,
          proyectoId: e.proyecto_id, proyecto: e.proyecto_titulo,
          proyectoSlug: e.proyecto_slug, repeticion: e.repeticion,
          url: null,
        })),
        ...(tareas.rows as any[]).map(t => ({
          clase: 'tarea' as const,
          id: t.id, titulo: t.titulo, descripcion: null,
          // Una tarea vence un DÍA, no a una hora: va como todo el día.
          inicio: t.vence_el, fin: null, todoElDia: true,
          lugar: null, color: null, icono: t.icono,
          proyectoId: t.proyecto_id, proyecto: t.proyecto_titulo,
          proyectoSlug: t.proyecto_slug, repeticion: null,
          estado: t.estado, prioridad: t.prioridad,
          url: t.proyecto_slug ? `/proyectos/${t.proyecto_slug}` : '/tareas',
        })),
      ];

      res.json({ items });
    } catch (e: any) {
      console.error('calendario error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/eventos — crear. */
  app.post('/api/eventos', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const d = req.body || {};
      const titulo = String(d.titulo || '').trim();
      if (!titulo) return res.status(400).json({ error: 'El evento necesita un nombre.' });
      if (!d.inicio) return res.status(400).json({ error: 'Falta cuándo empieza.' });
      // Un fin anterior al inicio pintaría un bloque de alto negativo.
      if (d.fin && new Date(d.fin) < new Date(d.inicio)) {
        return res.status(400).json({ error: 'No puede acabar antes de empezar.' });
      }
      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO eventos (id, titulo, descripcion, inicio, fin, todo_el_dia, lugar,
                             color, icono, proyecto_id, creador_user_id, created_by, updated_by)
        VALUES (${id}, ${titulo}, ${d.descripcion || null}, ${d.inicio}, ${d.fin || null},
                ${!!d.todo_el_dia}, ${d.lugar || null}, ${d.color || null}, ${d.icono || null},
                ${d.proyecto_id || null}, ${req.user.id}, ${req.user.id}, ${req.user.id})
      `);
      const r = await db.execute(sql`SELECT * FROM eventos WHERE id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('crear evento error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/eventos/:id — editar. Solo se toca lo que venga en el cuerpo. */
  app.put('/api/eventos/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const permiso = await mio(req, req.params.id);
      if (permiso === null) return res.status(404).json({ error: 'Ese evento no existe.' });
      if (!permiso) return res.status(403).json({ error: 'Ese evento no es tuyo.' });
      const d = req.body || {};
      if (d.fin && d.inicio && new Date(d.fin) < new Date(d.inicio)) {
        return res.status(400).json({ error: 'No puede acabar antes de empezar.' });
      }
      await db.execute(sql`
        UPDATE eventos SET
          titulo      = coalesce(${d.titulo ?? null}, titulo),
          descripcion = coalesce(${d.descripcion ?? null}, descripcion),
          inicio      = coalesce(${d.inicio ?? null}::timestamptz, inicio),
          fin         = ${d.fin === undefined ? sql`fin` : sql`${d.fin}::timestamptz`},
          todo_el_dia = coalesce(${d.todo_el_dia ?? null}::boolean, todo_el_dia),
          lugar       = coalesce(${d.lugar ?? null}, lugar),
          color       = coalesce(${d.color ?? null}, color),
          icono       = coalesce(${d.icono ?? null}, icono),
          proyecto_id = ${d.proyecto_id === undefined ? sql`proyecto_id` : sql`${d.proyecto_id}`},
          version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id}
      `);
      const r = await db.execute(sql`SELECT * FROM eventos WHERE id = ${req.params.id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('editar evento error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/eventos/:id — se archiva, no se borra. */
  app.delete('/api/eventos/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const permiso = await mio(req, req.params.id);
      if (permiso === null) return res.status(404).json({ error: 'Ese evento no existe.' });
      if (!permiso) return res.status(403).json({ error: 'Ese evento no es tuyo.' });
      await db.execute(sql`
        UPDATE eventos SET archived_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * PUT /api/tareas/:id/vence  { vence_el }
   * Ponerle o quitarle fecha a una tarea. Vive aquí y no en el módulo de la
   * hoja de ruta porque es una operación DEL CALENDARIO: es lo que hace que
   * una tarea aparezca en él, y arrastrarla de día es esto mismo.
   */
  app.put('/api/tareas/:id/vence', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const t = await db.execute(sql`
        SELECT r.autor_user_id, p.creador_user_id AS dueno_proyecto
        FROM roadmap_items r
        LEFT JOIN proyectos p ON p.id = r.proyecto_id
        WHERE r.id = ${req.params.id} AND r.archived_at IS NULL
      `);
      if (!t.rows.length) return res.status(404).json({ error: 'Esa tarea no existe.' });
      const f = t.rows[0] as any;
      const puede = f.autor_user_id === req.user.id
        || f.dueno_proyecto === req.user.id
        || (req.user.roleLevel ?? 0) >= 4;
      if (!puede) return res.status(403).json({ error: 'Esa tarea no es tuya.' });

      const fecha = req.body?.vence_el ? String(req.body.vence_el) : null;
      if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return res.status(400).json({ error: 'Esa fecha no vale.' });
      }
      await db.execute(sql`
        UPDATE roadmap_items SET vence_el = ${fecha}::date, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true, vence_el: fecha });
    } catch (e: any) {
      console.error('fecha de tarea error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
