import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// PERSONAS: EL CRM (2026-08-20, petición de Eugenio: «esto es como un CRM,
// tienes que tener complejidad de datos como Salesforce permitiendo conectarlo
// todo con las herramientas y proyectos»).
// ============================================================================
// NO HAY TABLA DE CONTACTOS NUEVA, y esa es la decisión que sostiene todo lo
// demás. La gente de tu mundo (`game_agents`) ya era tu fichero de contactos:
// la creas tú, tiene memoria, puede apuntar a una cuenta real y ya cuelga de
// proyectos. Lo único que le faltaba eran los datos de contacto y los grupos.
//
// LO QUE HACE QUE ESTO SEA UN CRM Y NO UNA AGENDA: una persona no es una
// ficha aislada. `GET /api/personas/:id/todo` devuelve TODO lo que la une al
// resto de la plataforma —sus proyectos, sus tareas, lo que os habéis escrito,
// lo que recuerda su representación— leyéndolo de donde ya vive. Nada de eso
// se copia aquí: se cruza al preguntar.

const nuevoId = (p: string) =>
  `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

/** Los campos de la ficha que se pueden escribir. Lista blanca: así un cuerpo
 *  con `user_id` dentro no puede cambiarle el dueño a nadie. */
const CAMPOS = [
  'nombre', 'rol', 'descripcion', 'email', 'telefono', 'empresa', 'web',
  'ubicacion', 'estado', 'foto_url', 'icono',
] as const;

export function registerPersonasRoutes(app: Express, db: any) {
  const mia = async (req: Request, id: string) => {
    const r = await db.execute(sql`
      SELECT user_id FROM game_agents WHERE id = ${id} AND archived_at IS NULL
    `);
    if (!r.rows.length) return null;
    return (r.rows[0] as any).user_id === req.user!.id || (req.user!.roleLevel ?? 0) >= 4;
  };

  // ==========================================================================
  // LA LISTA
  // ==========================================================================
  /**
   * GET /api/personas[?q=&grupo=&favoritos=1]
   * Tu gente, con lo que hace falta para pintar una tabla de CRM: quién es,
   * cómo contactarla, en qué grupos está y cuánto hace que no habláis.
   */
  app.get('/api/personas', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const yo = req.user.id;
      const q = String(req.query.q || '').trim();
      const like = q ? `%${q}%` : null;
      const grupo = (req.query.grupo as string) || null;
      const soloFavoritos = req.query.favoritos === '1';

      const [personas, grupos] = await Promise.all([
        db.execute(sql`
          SELECT a.id, a.nombre, a.rol, a.descripcion, a.foto_url, a.icono,
                 a.email, a.telefono, a.empresa, a.web, a.ubicacion, a.estado,
                 a.favorito, a.etiquetas, a.grupo_ids, a.proyecto_id, a.proyecto_ids,
                 a.persona_user_id, a.ultimo_contacto, a.created_at,
                 jsonb_array_length(coalesce(a.memoria, '[]'::jsonb)) AS recuerdos,
                 p.titulo AS proyecto_titulo, p.slug AS proyecto_slug,
                 u.display_name AS cuenta_nombre, u.avatar_url AS cuenta_avatar,
                 -- Cuántos mensajes os habéis escrito de verdad. Solo tiene
                 -- sentido si la ficha apunta a una cuenta real.
                 (SELECT count(*)::int FROM mensajes m
                   WHERE a.persona_user_id IS NOT NULL AND m.archived_at IS NULL
                     AND ((m.de_user_id = ${yo} AND m.para_user_id = a.persona_user_id)
                       OR (m.de_user_id = a.persona_user_id AND m.para_user_id = ${yo}))
                 ) AS mensajes
          FROM game_agents a
          LEFT JOIN proyectos p ON p.id = a.proyecto_id AND p.archived_at IS NULL
          LEFT JOIN users u ON u.id = a.persona_user_id AND u.archived_at IS NULL
          WHERE a.user_id = ${yo} AND a.tipo = 'persona' AND a.archived_at IS NULL
            AND (${like}::text IS NULL OR a.nombre ILIKE ${like}
                 OR coalesce(a.empresa,'') ILIKE ${like}
                 OR coalesce(a.rol,'') ILIKE ${like}
                 OR coalesce(a.email,'') ILIKE ${like})
            AND (${grupo}::text IS NULL OR a.grupo_ids @> ${JSON.stringify([grupo])}::jsonb)
            AND (${soloFavoritos} = false OR a.favorito)
          ORDER BY a.favorito DESC, a.nombre
          LIMIT 500
        `),
        db.execute(sql`
          SELECT g.id, g.nombre, g.icono, g.color, g.favorito, g.descripcion,
                 (SELECT count(*)::int FROM game_agents a2
                   WHERE a2.user_id = ${yo} AND a2.archived_at IS NULL
                     AND a2.grupo_ids @> to_jsonb(array[g.id])) AS cuantos
          FROM grupos_personas g
          WHERE g.user_id = ${yo} AND g.archived_at IS NULL
          ORDER BY g.favorito DESC, g.orden, g.nombre
        `),
      ]);

      res.json({ personas: personas.rows, grupos: grupos.rows });
    } catch (e: any) {
      console.error('personas error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/personas — una ficha nueva. */
  app.post('/api/personas', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const nombre = String(req.body?.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Ponle un nombre.' });
      const id = nuevoId('GA');
      await db.execute(sql`
        INSERT INTO game_agents (id, user_id, tipo, nombre, rol, empresa, email, telefono,
                                 descripcion, estado, created_by, updated_by, x, z)
        VALUES (${id}, ${req.user.id}, 'persona', ${nombre}, ${req.body?.rol || null},
                ${req.body?.empresa || null}, ${req.body?.email || null}, ${req.body?.telefono || null},
                ${req.body?.descripcion || null}, ${req.body?.estado || null},
                ${req.user.id}, ${req.user.id}, 0, 0)
      `);
      const r = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('crear persona error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/personas/:id — editar la ficha. Solo lo que venga en el cuerpo. */
  app.put('/api/personas/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const permiso = await mia(req, req.params.id);
      if (permiso === null) return res.status(404).json({ error: 'Esa persona no existe.' });
      if (!permiso) return res.status(403).json({ error: 'Esa ficha no es tuya.' });
      const d = req.body || {};

      for (const campo of CAMPOS) {
        if (d[campo] === undefined) continue;
        const valor = d[campo] === '' ? null : d[campo];
        // `sql.raw` solo con nombres de la lista blanca de arriba, nunca con
        // lo que mande nadie.
        await db.execute(sql`
          UPDATE game_agents SET ${sql.raw(campo)} = ${valor}, updated_at = now(), updated_by = ${req.user.id}
          WHERE id = ${req.params.id}
        `);
      }
      if (d.favorito !== undefined) {
        await db.execute(sql`
          UPDATE game_agents SET favorito = ${!!d.favorito}, updated_at = now() WHERE id = ${req.params.id}
        `);
      }
      if (Array.isArray(d.etiquetas)) {
        await db.execute(sql`
          UPDATE game_agents SET etiquetas = ${JSON.stringify(d.etiquetas.slice(0, 20))}::jsonb,
            updated_at = now() WHERE id = ${req.params.id}
        `);
      }
      if (Array.isArray(d.grupo_ids)) {
        await db.execute(sql`
          UPDATE game_agents SET grupo_ids = ${JSON.stringify(d.grupo_ids.slice(0, 30))}::jsonb,
            updated_at = now() WHERE id = ${req.params.id}
        `);
      }
      if (d.ultimo_contacto !== undefined) {
        await db.execute(sql`
          UPDATE game_agents SET ultimo_contacto = ${d.ultimo_contacto}::timestamptz,
            updated_at = now() WHERE id = ${req.params.id}
        `);
      }
      const r = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${req.params.id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('editar persona error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/personas/:id — se archiva, no se borra. */
  app.delete('/api/personas/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const permiso = await mia(req, req.params.id);
      if (permiso === null) return res.status(404).json({ error: 'Esa persona no existe.' });
      if (!permiso) return res.status(403).json({ error: 'Esa ficha no es tuya.' });
      await db.execute(sql`
        UPDATE game_agents SET archived_at = now() WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // LOS GRUPOS
  // ==========================================================================
  app.post('/api/grupos-personas', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const nombre = String(req.body?.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Ponle un nombre al grupo.' });
      const id = nuevoId('GRP');
      await db.execute(sql`
        INSERT INTO grupos_personas (id, nombre, descripcion, icono, color, favorito, user_id)
        VALUES (${id}, ${nombre}, ${req.body?.descripcion || null}, ${req.body?.icono || null},
                ${req.body?.color || null}, ${!!req.body?.favorito}, ${req.user.id})
      `);
      const r = await db.execute(sql`SELECT * FROM grupos_personas WHERE id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('crear grupo error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/grupos-personas/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const g = await db.execute(sql`
        SELECT user_id FROM grupos_personas WHERE id = ${req.params.id} AND archived_at IS NULL
      `);
      if (!g.rows.length) return res.status(404).json({ error: 'Ese grupo no existe.' });
      if ((g.rows[0] as any).user_id !== req.user.id && (req.user.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: 'Ese grupo no es tuyo.' });
      }
      const d = req.body || {};
      await db.execute(sql`
        UPDATE grupos_personas SET
          nombre      = coalesce(${d.nombre ?? null}, nombre),
          descripcion = coalesce(${d.descripcion ?? null}, descripcion),
          icono       = coalesce(${d.icono ?? null}, icono),
          color       = coalesce(${d.color ?? null}, color),
          favorito    = coalesce(${d.favorito ?? null}::boolean, favorito),
          orden       = coalesce(${d.orden ?? null}::int, orden),
          updated_at  = now()
        WHERE id = ${req.params.id}
      `);
      const r = await db.execute(sql`SELECT * FROM grupos_personas WHERE id = ${req.params.id}`);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Quitar un grupo: se archiva Y se saca de las fichas que lo tuvieran.
   *  Sin lo segundo, quedarían apuntando a un grupo que ya no está. */
  app.delete('/api/grupos-personas/:id', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const g = await db.execute(sql`
        SELECT user_id FROM grupos_personas WHERE id = ${req.params.id} AND archived_at IS NULL
      `);
      if (!g.rows.length) return res.status(404).json({ error: 'Ese grupo no existe.' });
      if ((g.rows[0] as any).user_id !== req.user.id && (req.user.roleLevel ?? 0) < 4) {
        return res.status(403).json({ error: 'Ese grupo no es tuyo.' });
      }
      await db.execute(sql`UPDATE grupos_personas SET archived_at = now() WHERE id = ${req.params.id}`);
      await db.execute(sql`
        UPDATE game_agents SET grupo_ids = grupo_ids - ${req.params.id}
        WHERE user_id = ${req.user.id} AND grupo_ids @> ${JSON.stringify([req.params.id])}::jsonb
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // LA VISTA DE 360°: TODO LO QUE TE UNE A ESA PERSONA
  // ==========================================================================
  // Esto es lo que separa un CRM de una agenda. Nada de lo que sale aquí se
  // guarda aquí: se cruza al preguntar, de las tablas donde ya vive. Añadir
  // una fuente mañana es una consulta más, no una columna ni una copia.
  app.get('/api/personas/:id/todo', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const permiso = await mia(req, req.params.id);
      if (permiso === null) return res.status(404).json({ error: 'Esa persona no existe.' });
      if (!permiso) return res.status(403).json({ error: 'Esa ficha no es tuya.' });
      const yo = req.user.id;

      const f = await db.execute(sql`
        SELECT a.*, p.titulo AS proyecto_titulo, p.slug AS proyecto_slug,
               u.display_name AS cuenta_nombre, u.avatar_url AS cuenta_avatar
        FROM game_agents a
        LEFT JOIN proyectos p ON p.id = a.proyecto_id AND p.archived_at IS NULL
        LEFT JOIN users u ON u.id = a.persona_user_id
        WHERE a.id = ${req.params.id}
      `);
      const persona = f.rows[0] as any;
      const cuenta = persona?.persona_user_id || null;
      const proyectoIds: string[] = [
        ...(persona?.proyecto_id ? [persona.proyecto_id] : []),
        ...(Array.isArray(persona?.proyecto_ids) ? persona.proyecto_ids : []),
      ];

      const [proyectos, mensajes, eventos] = await Promise.all([
        proyectoIds.length
          ? db.execute(sql`
              SELECT id, titulo, slug, icono FROM proyectos
              WHERE id = ANY(string_to_array(${proyectoIds.join(',')}, ','))
                AND archived_at IS NULL
            `)
          : Promise.resolve({ rows: [] }),
        cuenta
          ? db.execute(sql`
              SELECT id, texto, created_at, de_user_id = ${yo} AS mio
              FROM mensajes
              WHERE archived_at IS NULL
                AND ((de_user_id = ${yo} AND para_user_id = ${cuenta})
                  OR (de_user_id = ${cuenta} AND para_user_id = ${yo}))
              ORDER BY created_at DESC LIMIT 20
            `)
          : Promise.resolve({ rows: [] }),
        // Los eventos de sus proyectos: lo que viene con esa persona.
        proyectoIds.length
          ? db.execute(sql`
              SELECT id, titulo, inicio, todo_el_dia FROM eventos
              WHERE creador_user_id = ${yo} AND archived_at IS NULL
                AND proyecto_id = ANY(string_to_array(${proyectoIds.join(',')}, ','))
                AND inicio >= now() - interval '30 days'
              ORDER BY inicio LIMIT 20
            `)
          : Promise.resolve({ rows: [] }),
      ]);

      res.json({
        persona,
        proyectos: proyectos.rows,
        mensajes: mensajes.rows,
        eventos: eventos.rows,
        recuerdos: Array.isArray(persona?.memoria) ? persona.memoria.slice(-30).reverse() : [],
      });
    } catch (e: any) {
      console.error('persona 360 error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
