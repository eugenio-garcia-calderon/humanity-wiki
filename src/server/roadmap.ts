import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

// ============================================================================
// VISIÓN Y HOJA DE RUTA (2026-08-08, petición del usuario)
// ============================================================================
// El tablero operativo de la plataforma: qué está hecho, qué se está haciendo
// y qué falta, agrupado para que cientos de funcionalidades sigan siendo
// legibles. Cualquiera puede LEERLO (es parte de la transparencia del
// proyecto); solo administradores lo editan.

const newId = () =>
  `RM${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`;

export const GRUPOS = [
  'canvas', 'mapas', 'datos', 'social', 'mercado', 'diseno', 'ia', 'infra', 'gobernanza',
] as const;
const ESTADOS = new Set(['hecho', 'en_curso', 'por_hacer']);
const PRIORIDADES = new Set(['alta', 'media', 'baja']);

export function registerRoadmapRoutes(app: Express, db: any) {

  const requireAdmin = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < ROLE.ADMIN) {
      res.status(403).json({ error: 'Solo un administrador puede editar la hoja de ruta.' });
      return false;
    }
    return true;
  };

  /**
   * GET /api/roadmap[?proyecto=ID] — el tablero, con el autor de cada tarjeta.
   * Sin `proyecto` devuelve la hoja de ruta de la propia plataforma.
   */
  app.get('/api/roadmap', async (req: Request, res: Response) => {
    try {
      const proyecto = (req.query.proyecto as string) || null;
      const rows = await db.execute(sql`
        SELECT r.id, r.grupo, r.titulo, r.resumen, r.estado, r.prioridad, r.bloques, r.orden,
               r.autor_user_id, r.proyecto_id, r.updated_at,
               u.display_name AS autor_nombre, u.email AS autor_email, u.avatar_url AS autor_avatar
        FROM roadmap_items r
        LEFT JOIN users u ON u.id = r.autor_user_id
        WHERE r.archived_at IS NULL
          AND (${proyecto}::text IS NULL AND r.proyecto_id IS NULL
               OR r.proyecto_id = ${proyecto})
        ORDER BY r.grupo, r.orden, r.created_at
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // TODAS LAS TAREAS, AGRUPADAS POR PROYECTO (2026-08-20, petición de Eugenio:
  // «una página donde puedas ver todas las tareas ordenadas por PROYECTOS»).
  // ==========================================================================
  // `GET /api/roadmap` solo sabe traer las de UN proyecto (o las de la hoja de
  // ruta, que no tienen proyecto). Para una vista de conjunto haría falta una
  // llamada por proyecto; esta ruta las trae todas de una vez, ya repartidas.
  //
  // QUIÉN VE QUÉ: una tarea se ve si se ve su proyecto — público, o tuyo. Las
  // que no cuelgan de ningún proyecto son la hoja de ruta de humanity.wiki,
  // que ya es pública en /vision, y van en su propio grupo.
  app.get('/api/tareas', async (req: Request, res: Response) => {
    try {
      const yo = req.user?.id || null;
      const esAdmin = (req.user?.roleLevel ?? 0) >= ROLE.ADMIN;
      const rows = await db.execute(sql`
        SELECT r.id, r.grupo, r.titulo, r.resumen, r.estado, r.prioridad, r.orden,
               r.updated_at, r.created_at, r.proyecto_id,
               p.titulo AS proyecto_titulo, p.slug AS proyecto_slug, p.publico AS proyecto_publico,
               p.creador_user_id AS proyecto_creador,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar
        FROM roadmap_items r
        LEFT JOIN proyectos p ON p.id = r.proyecto_id
                             AND p.archived_at IS NULL AND p.deleted_at IS NULL
        LEFT JOIN users u ON u.id = r.autor_user_id
        WHERE r.archived_at IS NULL
          AND (
            -- La hoja de ruta de la plataforma: sin proyecto, y pública.
            r.proyecto_id IS NULL
            -- O un proyecto que puedas ver.
            OR (p.id IS NOT NULL AND (${esAdmin} OR p.publico OR p.creador_user_id = ${yo}))
          )
        ORDER BY r.orden, r.created_at
      `);

      // Se reparte aquí y no en el cliente: la página solo tiene que pintar.
      const grupos = new Map<string, any>();
      for (const t of rows.rows as any[]) {
        const clave = t.proyecto_id || '__hoja_de_ruta__';
        if (!grupos.has(clave)) {
          grupos.set(clave, {
            id: clave,
            esHojaDeRuta: !t.proyecto_id,
            titulo: t.proyecto_titulo || 'Hoja de ruta de humanity.wiki',
            url: t.proyecto_slug ? `/proyectos/${t.proyecto_slug}` : '/vision',
            publico: t.proyecto_id ? !!t.proyecto_publico : true,
            mio: !!yo && t.proyecto_creador === yo,
            tareas: [],
          });
        }
        grupos.get(clave).tareas.push({
          id: t.id, titulo: t.titulo, resumen: t.resumen, estado: t.estado,
          prioridad: t.prioridad, grupo: t.grupo,
          autor: t.autor_nombre, autorAvatar: t.autor_avatar,
          fecha: t.updated_at || t.created_at,
        });
      }

      // Tus proyectos primero, la hoja de ruta la última: lo tuyo es a lo que
      // vienes, y la hoja de ruta son 112 tareas que taparían todo lo demás.
      const lista = [...grupos.values()].sort((a, b) => {
        if (a.esHojaDeRuta !== b.esHojaDeRuta) return a.esHojaDeRuta ? 1 : -1;
        if (a.mio !== b.mio) return a.mio ? -1 : 1;
        return a.titulo.localeCompare(b.titulo, 'es');
      });
      res.json({ proyectos: lista });
    } catch (e: any) {
      console.error('list tareas error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // PROYECTOS DE CADA PERSONA (2026-08-08, petición del usuario)
  // ==========================================================================
  // El mismo tablero que lleva la hoja de ruta de humanity.wiki, pero para lo
  // que cada cual quiera organizar. Quien lo crea manda sobre él.

  const puedeEditarProyecto = async (req: Request, proyectoId: string) => {
    if (!req.user) return false;
    if ((req.user.roleLevel ?? 0) >= ROLE.ADMIN) return true;
    const p = await db.execute(sql`SELECT creador_user_id FROM proyectos WHERE id = ${proyectoId}`);
    return !!p.rows.length && (p.rows[0] as any).creador_user_id === req.user.id;
  };

  /** GET /api/proyectos — los públicos, y los tuyos aunque sean privados. */
  app.get('/api/proyectos', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT p.*, u.display_name AS creador_nombre, u.avatar_url AS creador_avatar,
               (SELECT count(*)::int FROM roadmap_items r
                 WHERE r.proyecto_id = p.id AND r.archived_at IS NULL) AS tarjetas,
               (SELECT count(*)::int FROM roadmap_items r
                 WHERE r.proyecto_id = p.id AND r.archived_at IS NULL AND r.estado = 'hecho') AS hechas
        FROM proyectos p LEFT JOIN users u ON u.id = p.creador_user_id
        WHERE p.archived_at IS NULL
          AND (p.publico OR p.creador_user_id = ${req.user?.id || null})
        ORDER BY p.created_at DESC
        LIMIT 100
      `);
      res.json(rows.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/proyectos/:slug', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT p.*, u.display_name AS creador_nombre, u.avatar_url AS creador_avatar
        FROM proyectos p LEFT JOIN users u ON u.id = p.creador_user_id
        WHERE (p.slug = ${req.params.slug} OR p.id = ${req.params.slug}) AND p.archived_at IS NULL
      `);
      if (!rows.rows.length) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      const p = rows.rows[0] as any;
      if (!p.publico && p.creador_user_id !== req.user?.id && (req.user?.roleLevel ?? 0) < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Este proyecto es privado.' });
      }
      res.json(p);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Grupos por defecto de un proyecto nuevo: sirven para casi todo. */
  const GRUPOS_POR_DEFECTO = [
    { id: 'producto', label: 'Producto', color: '#7c3aed' },
    { id: 'diseno', label: 'Diseño', color: '#db2777' },
    { id: 'tecnico', label: 'Técnico', color: '#0284c7' },
    { id: 'contenido', label: 'Contenido', color: '#16a34a' },
    { id: 'personas', label: 'Personas', color: '#d97706' },
    { id: 'dinero', label: 'Dinero', color: '#475569' },
  ];

  app.post('/api/proyectos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión para crear un proyecto.' });
      const d = req.body || {};
      if (!d.titulo) return res.status(400).json({ error: 'El proyecto necesita un título.' });
      const id = 'PRY' + Date.now().toString(36).toUpperCase();
      const base = String(d.titulo).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'proyecto';
      // Un sufijo corto evita chocar con un proyecto homónimo de otra persona.
      const slug = `${base}-${id.slice(-4).toLowerCase()}`;
      await db.execute(sql`
        INSERT INTO proyectos (id, titulo, descripcion, vision, slug, creador_user_id, grupos, publico, created_by, updated_by)
        VALUES (${id}, ${d.titulo}, ${d.descripcion || null}, ${d.vision || null}, ${slug}, ${req.user.id},
                ${JSON.stringify(d.grupos?.length ? d.grupos : GRUPOS_POR_DEFECTO)}::jsonb,
                ${d.publico !== false}, ${req.user.id}, ${req.user.id})
      `);
      const row = await db.execute(sql`SELECT * FROM proyectos WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/proyectos/:id', async (req: Request, res: Response) => {
    try {
      if (!(await puedeEditarProyecto(req, req.params.id))) {
        return res.status(403).json({ error: 'Solo quien creó el proyecto puede editarlo.' });
      }
      const d = req.body || {};
      await db.execute(sql`
        UPDATE proyectos SET
          titulo      = COALESCE(${d.titulo ?? null}, titulo),
          descripcion = COALESCE(${d.descripcion ?? null}, descripcion),
          vision      = COALESCE(${d.vision ?? null}, vision),
          grupos      = COALESCE(${d.grupos ? JSON.stringify(d.grupos) : null}::jsonb, grupos),
          publico     = COALESCE(${d.publico ?? null}, publico),
          updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      const row = await db.execute(sql`SELECT * FROM proyectos WHERE id = ${req.params.id}`);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * DELETE /api/proyectos/:id — quitar un proyecto (2026-08-20, petición de
   * Eugenio: «en la página de proyectos permite borrar un proyecto»).
   *
   * SE ARCHIVA, NO SE BORRA (regla 6 de la Constitución). Y lo que hay dentro
   * NO SE TOCA: las tareas, páginas y esquemas que hiciste siguen existiendo y
   * se quedan sueltos, igual que hace el `ON DELETE SET NULL` de la base de
   * datos. Llevarse por delante meses de trabajo por archivar la carpeta que
   * los agrupaba sería la peor sorpresa posible.
   */
  app.delete('/api/proyectos/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!(await puedeEditarProyecto(req, req.params.id))) {
        return res.status(403).json({ error: 'Ese proyecto no es tuyo.' });
      }
      const r = await db.execute(sql`
        UPDATE proyectos SET archived_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id} AND archived_at IS NULL
        RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Ese proyecto ya no existe.' });

      // Lo de dentro se queda suelto, no archivado.
      await Promise.all([
        db.execute(sql`UPDATE knowledge_windows SET proyecto_id = NULL WHERE proyecto_id = ${req.params.id}`),
        db.execute(sql`UPDATE knowledge_graphs SET proyecto_id = NULL WHERE proyecto_id = ${req.params.id}`),
        db.execute(sql`UPDATE user_maps       SET proyecto_id = NULL WHERE proyecto_id = ${req.params.id}`),
        db.execute(sql`UPDATE products        SET proyecto_id = NULL WHERE proyecto_id = ${req.params.id}`),
      ]);
      res.json({ ok: true });
    } catch (e: any) {
      console.error('archivar proyecto error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/proyectos/:id/herramienta   { tipo, titulo? }
   * Crea una cosa nueva YA DENTRO del proyecto (Eugenio: «permite añadir todas
   * las herramientas de la plataforma en esa página de proyecto»). Una sola
   * ruta para todas: lo que cambia entre crear una página y crear un mapa es
   * la tabla y poco más, y cinco rutas gemelas serían cinco sitios donde
   * arreglar lo mismo.
   *
   * Devuelve `abrir`, que es a dónde llevarte: crear algo es querer usarlo.
   */
  app.post('/api/proyectos/:id/herramienta', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!(await puedeEditarProyecto(req, req.params.id))) {
        return res.status(403).json({ error: 'Ese proyecto no es tuyo.' });
      }
      const yo = req.user.id;
      const pid = req.params.id;
      const titulo = String(req.body?.titulo || '').trim();
      const nid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;
      const babosa = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || nid('x').toLowerCase();

      switch (req.body?.tipo) {
        case 'pagina': {
          const id = nid('KW');
          const bloques = [{ id: `B${Date.now().toString(36)}0`, tipo: 'parrafo', texto: '' }];
          await db.execute(sql`
            INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
            VALUES (${id}, ${titulo || 'Página sin título'}, 'pagina', ${JSON.stringify({ bloques })}::jsonb,
                    false, ${yo}, false, ${yo}, ${yo}, ${pid})
          `);
          return res.json({ id, abrir: `/paginas/${id}` });
        }
        case 'esquema': {
          const id = nid('KG');
          const t = titulo || 'Esquema sin título';
          const slug = `${babosa(t)}-${id.slice(-4).toLowerCase()}`;
          await db.execute(sql`
            INSERT INTO knowledge_graphs (id, title, slug, status, creator_user_id, created_by, updated_by, proyecto_id)
            VALUES (${id}, ${t}, ${slug}, 'borrador', ${yo}, ${yo}, ${yo}, ${pid})
          `);
          return res.json({ id, abrir: `/esquemas/${slug}` });
        }
        case 'mapa': {
          const id = nid('UM');
          const t = titulo || 'Mapa sin título';
          const slug = `${babosa(t)}-${id.slice(-4).toLowerCase()}`;
          await db.execute(sql`
            INSERT INTO user_maps (id, title, slug, status, creator_user_id, created_by, updated_by, proyecto_id)
            VALUES (${id}, ${t}, ${slug}, 'borrador', ${yo}, ${yo}, ${yo}, ${pid})
          `);
          return res.json({ id, abrir: `/mapas/${slug}` });
        }
        case 'tarea': {
          const id = nid('RI');
          await db.execute(sql`
            INSERT INTO roadmap_items (id, grupo, titulo, estado, prioridad, autor_user_id, created_by, updated_by, proyecto_id)
            VALUES (${id}, 'general', ${titulo || 'Tarea sin título'}, 'por_hacer', 'media', ${yo}, ${yo}, ${yo}, ${pid})
          `);
          return res.json({ id, abrir: null });
        }
        default:
          return res.status(400).json({ error: 'Esa herramienta no se puede crear aquí.' });
      }
    } catch (e: any) {
      console.error('crear herramienta en proyecto error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/roadmap — nueva tarjeta. */
  app.post('/api/roadmap', async (req: Request, res: Response) => {
    try {
      const d = req.body || {};
      // En la hoja de ruta de la plataforma manda un administrador; en un
      // proyecto propio, quien lo creó.
      if (d.proyecto_id) {
        if (!(await puedeEditarProyecto(req, d.proyecto_id))) {
          return res.status(403).json({ error: 'Solo quien creó el proyecto puede añadir tarjetas.' });
        }
      } else if (!requireAdmin(req, res)) return;
      if (!d.titulo || !d.grupo || (!d.proyecto_id && !GRUPOS.includes(d.grupo))) {
        return res.status(400).json({ error: 'La tarjeta necesita título y grupo.' });
      }
      const id = newId();
      await db.execute(sql`
        INSERT INTO roadmap_items (id, grupo, titulo, resumen, estado, prioridad, autor_user_id,
                                   bloques, orden, proyecto_id, created_by, updated_by)
        VALUES (${id}, ${d.grupo}, ${d.titulo}, ${d.resumen || null},
                ${ESTADOS.has(d.estado) ? d.estado : 'por_hacer'},
                ${PRIORIDADES.has(d.prioridad) ? d.prioridad : 'media'},
                ${d.autor_user_id || req.user!.id},
                ${JSON.stringify(d.bloques || [])}::jsonb, ${d.orden ?? 0}, ${d.proyecto_id || null},
                ${req.user!.id}, ${req.user!.id})
      `);
      const row = await db.execute(sql`SELECT * FROM roadmap_items WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** PUT /api/roadmap/:id — mover de columna, editar, añadir bloques. */
  app.put('/api/roadmap/:id', async (req: Request, res: Response) => {
    try {
      const actual = await db.execute(sql`SELECT proyecto_id FROM roadmap_items WHERE id = ${req.params.id}`);
      if (!actual.rows.length) return res.status(404).json({ error: 'Tarjeta no encontrada.' });
      const proyectoId = (actual.rows[0] as any).proyecto_id;
      if (proyectoId) {
        if (!(await puedeEditarProyecto(req, proyectoId))) {
          return res.status(403).json({ error: 'Solo quien creó el proyecto puede editar sus tarjetas.' });
        }
      } else if (!requireAdmin(req, res)) return;
      const d = req.body || {};
      const estado = ESTADOS.has(d.estado) ? d.estado : null;
      const prioridad = PRIORIDADES.has(d.prioridad) ? d.prioridad : null;
      // En un proyecto propio los grupos los define su dueño.
      const grupo = d.grupo && (proyectoId || GRUPOS.includes(d.grupo)) ? d.grupo : null;
      // Mover la tarjeta a OTRO proyecto (2026-08-19, la ficha del juego):
      // hay que poder editar también el proyecto de destino.
      let nuevoProyecto: string | null = null;
      if (d.proyecto_id && d.proyecto_id !== proyectoId) {
        if (!(await puedeEditarProyecto(req, d.proyecto_id))) {
          return res.status(403).json({ error: 'No puedes mover la tarjeta a ese proyecto.' });
        }
        nuevoProyecto = String(d.proyecto_id);
      }
      await db.execute(sql`
        UPDATE roadmap_items SET
          proyecto_id = COALESCE(${nuevoProyecto}, proyecto_id),
          grupo     = COALESCE(${grupo}, grupo),
          titulo    = COALESCE(${d.titulo ?? null}, titulo),
          resumen   = COALESCE(${d.resumen ?? null}, resumen),
          estado    = COALESCE(${estado}, estado),
          prioridad = COALESCE(${prioridad}, prioridad),
          autor_user_id = COALESCE(${d.autor_user_id ?? null}, autor_user_id),
          bloques   = COALESCE(${d.bloques ? JSON.stringify(d.bloques) : null}::jsonb, bloques),
          orden     = COALESCE(${d.orden ?? null}, orden),
          updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${req.params.id}
      `);
      const row = await db.execute(sql`SELECT * FROM roadmap_items WHERE id = ${req.params.id}`);
      if (!row.rows.length) return res.status(404).json({ error: 'Tarjeta no encontrada.' });
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** DELETE — archiva, no borra (regla 6 de la Constitución). */
  app.delete('/api/roadmap/:id', async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      await db.execute(sql`
        UPDATE roadmap_items SET archived_at = now(), updated_by = ${req.user!.id} WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ==========================================================================
  // TEXTOS DE PÁGINA EDITABLES (2026-08-08, petición del usuario)
  // ==========================================================================
  // «Permite a eugenio@lighthumanity.org como ADMIN cambiar todos los textos
  // de esta web de visión.» El titular, los párrafos, la nueva declaración de
  // estrategia — todo vivía como JSX fijo. Sin fila = usa el texto por
  // defecto que trae el componente, así que añadir un sitio editable nuevo
  // nunca necesita una semilla.

  /** GET /api/textos/:pagina — de lectura pública, lo pintan todas las visitas. */
  app.get('/api/textos/:pagina', async (req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`SELECT clave, valor FROM page_texts WHERE pagina = ${req.params.pagina}`);
      res.json(Object.fromEntries((rows.rows as any[]).map(r => [r.clave, r.valor])));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** PUT /api/textos/:pagina/:clave  { valor } — solo administradores. */
  app.put('/api/textos/:pagina/:clave', async (req: Request, res: Response) => {
    try {
      if (!requireAdmin(req, res)) return;
      const valor = String(req.body?.valor ?? '').trim();
      if (!valor) return res.status(400).json({ error: 'El texto no puede quedar vacío.' });
      await db.execute(sql`
        INSERT INTO page_texts (pagina, clave, valor, updated_by)
        VALUES (${req.params.pagina}, ${req.params.clave}, ${valor}, ${req.user!.id})
        ON CONFLICT (pagina, clave) DO UPDATE SET valor = EXCLUDED.valor, updated_by = EXCLUDED.updated_by, updated_at = now()
      `);
      res.json({ success: true, valor });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
