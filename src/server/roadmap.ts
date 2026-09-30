import type { Express, Request, Response } from 'express';
import { iconoDeNombre } from '../utils/iconoDeNombre';
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
  // Tenth group (2026-08-22): the veracity area — debates, arguments and
  // sources. It lives in the SAME board on purpose, so there is never a
  // second list of what is pending. See memory/13_VERACIDAD.md.
  'veracidad',
] as const;
export const ESTADOS = new Set(['hecho', 'en_curso', 'por_hacer']);
export const PRIORIDADES = new Set(['alta', 'media', 'baja']);

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
               r.autor_user_id, r.proyecto_id, r.updated_at, r.responsable_agente_id,
               u.display_name AS autor_nombre, u.email AS autor_email, u.avatar_url AS autor_avatar,
               ag.nombre AS responsable_nombre, ag.foto_url AS responsable_foto, ag.icono AS responsable_icono,
               -- LA PORTADA Y CUÁNTOS ARCHIVOS LLEVA (2026-08-28, Eugenio:
               -- «que las tarjetas permitan subir una imagen o archivo»).
               --
               -- Viene AQUÍ y no con una petición por tarjeta: un tablero de
               -- cuarenta tarjetas serían cuarenta viajes para pintar cuarenta
               -- miniaturas, y el tablero se dibujaría a trozos durante un
               -- segundo largo. Con dos laterales, sigue siendo un viaje.
               --
               -- La columna adjuntos va aparte de portada a propósito: una tarjeta
               -- puede llevar un PDF y ninguna imagen, y entonces no hay
               -- miniatura que enseñar pero SÍ hay algo dentro. Sin ese número,
               -- el archivo existiría sin que nada en el tablero lo dijera.
               img.url AS portada,
               COALESCE(ad.n, 0)::int AS adjuntos
        FROM roadmap_items r
        LEFT JOIN users u ON u.id = r.autor_user_id
        LEFT JOIN game_agents ag ON ag.id = r.responsable_agente_id
        LEFT JOIN LATERAL (
          SELECT a.url FROM archivos a
           WHERE a.tarea_id = r.id AND a.archived_at IS NULL AND a.clase = 'imagen'
           ORDER BY a.created_at LIMIT 1
        ) img ON true
        LEFT JOIN LATERAL (
          SELECT count(*) AS n FROM archivos a
           WHERE a.tarea_id = r.id AND a.archived_at IS NULL
        ) ad ON true
        WHERE r.archived_at IS NULL
          AND (${proyecto}::text IS NULL AND r.proyecto_id IS NULL
               OR r.proyecto_id = ${proyecto})
        ORDER BY r.grupo, r.orden, r.created_at
      `);
      res.json(rows.rows);
    } catch (e: any) { console.error('roadmap GET:', e?.cause?.message || e); res.status(500).json({ error: e.message }); }
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
               -- LA FECHA DE VENCIMIENTO NO SALÍA DE AQUÍ (2026-08-21). La
               -- columna existe desde hace tiempo y el calendario la lee, pero
               -- esta ruta nunca la seleccionaba: la página de tareas recibía
               -- un campo llamado «fecha» que era la de MODIFICACIÓN, y una
               -- tarea con plazo se veía igual que una sin él.
               r.vence_el,
               r.updated_at, r.created_at, r.proyecto_id,
               p.titulo AS proyecto_titulo, p.slug AS proyecto_slug, p.publico AS proyecto_publico,
               -- El icono, para la portada (2026-08-22): sin él, los proyectos
               -- de la página de inicio saldrian sin cara.
               p.icono AS proyecto_icono,
               p.creador_user_id AS proyecto_creador,
               u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               ag.nombre AS responsable_nombre, ag.foto_url AS responsable_foto
        FROM roadmap_items r
        LEFT JOIN proyectos p ON p.id = r.proyecto_id
                             AND p.archived_at IS NULL AND p.deleted_at IS NULL
        LEFT JOIN users u ON u.id = r.autor_user_id
        LEFT JOIN game_agents ag ON ag.id = r.responsable_agente_id
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
            icono: t.proyecto_icono || null,
            mio: !!yo && t.proyecto_creador === yo,
            tareas: [],
          });
        }
        grupos.get(clave).tareas.push({
          id: t.id, titulo: t.titulo, resumen: t.resumen, estado: t.estado,
          prioridad: t.prioridad, grupo: t.grupo,
          autor: t.autor_nombre, autorAvatar: t.autor_avatar,
          responsable: t.responsable_nombre || null, responsableFoto: t.responsable_foto || null,
          // Dos fechas distintas con dos nombres distintos: cuándo VENCE y
          // cuándo se TOCÓ por última vez. Antes iban las dos bajo el mismo
          // nombre, `fecha`, y ganaba la que no importaba.
          vence: t.vence_el || null,
          actualizada: t.updated_at || t.created_at,
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
      /*
       * ── LAS PERSONAS DE CADA PROYECTO (2026-08-26) ────────────────────────
       * Eugenio: «cuando aparecen todos los proyectos de un perfil, no pongas
       * en todos el creador del proyecto, porque en realidad sí va a ser el
       * del perfil. Pon en su defecto las personas asociadas a ese proyecto
       * que no sean el propio perfil».
       *
       * Tiene razón y va más allá del ruido visual: un dato que es idéntico en
       * las doce tarjetas no distingue nada, y ocupa el sitio del único dato
       * que sí distingue, que es con quién está hecho cada uno.
       *
       * ── SÓLO LAS TUYAS, Y ESO NO ES UNA LIMITACIÓN ────────────────────────
       * Las personas de un proyecto son `game_agents` del Juego Vital:
       * representaciones PRIVADAS que cada cual hace en su mundo. Se filtra por
       * `user_id`, así que en el proyecto público de otro no verás las suyas —
       * ni él las tuyas. Es la misma regla que ya aplica
       * `GET /api/juego/proyectos/:id/personas`, y cambiarla aquí sería abrir
       * por la puerta de atrás lo que allí está cerrado.
       *
       * ── VA EN SU PROPIA CONSULTA, Y A PROPÓSITO ───────────────────────────
       * Como subconsulta dentro de la de arriba, un día que `game_agents` no
       * exista —o le falte una columna— la lista de proyectos entera devuelve
       * 500. Aparte, ese fallo se traga aquí y los proyectos siguen saliendo
       * sin personas, que es exactamente lo que debe pasar: esto adorna la
       * tarjeta, no la sostiene.
       */
      let personasPorProyecto: Record<string, any[]> = {};
      if (req.user && rows.rows.length) {
        try {
          const ids = (rows.rows as any[]).map(p => String(p.id));
          // Un array de JavaScript metido en una plantilla `sql` NO viaja como
          // array: se expande a `($1, $2, …)`, que es una lista y no vale para
          // `?|`. Hay que construir el ARRAY de Postgres a mano. Me costó una
          // tarde la primera vez que lo di por hecho, en el agregador.
          const comoArray = sql`ARRAY[${sql.join(ids.map(i => sql`${i}`), sql`, `)}]::text[]`;
          const gente = await db.execute(sql`
            SELECT g.id, g.nombre, g.rol, g.foto_url, g.proyecto_ids
            FROM game_agents g
            WHERE g.user_id = ${req.user.id} AND g.archived_at IS NULL AND g.tipo = 'persona'
              AND g.proyecto_ids ?| ${comoArray}
            ORDER BY g.created_at ASC
          `);
          // Una persona puede estar en varios proyectos: se reparte en memoria
          // en vez de pedirla una vez por proyecto.
          for (const g of gente.rows as any[]) {
            const suyos: string[] = Array.isArray(g.proyecto_ids) ? g.proyecto_ids : [];
            for (const pid of suyos) {
              if (!ids.includes(pid)) continue;
              (personasPorProyecto[pid] ||= []).push({
                id: g.id, nombre: g.nombre, rol: g.rol, foto_url: g.foto_url,
              });
            }
          }
        } catch { personasPorProyecto = {}; }
      }
      const filas = (rows.rows as any[]).map(p => {
        const con = { ...p, personas: personasPorProyecto[p.id] || [] };
        // A QUIEN NO HA ENTRADO NO SE LE DA EL ID DEL CREADOR (2026-08-20).
        // No es una fuga —los proyectos que salen son los públicos— pero un id
        // interno de usuario no le sirve de nada a un visitante y sí sirve
        // para relacionar cosas entre sí. Se manda el nombre, que es lo que se
        // pinta.
        return req.user ? con : { ...con, creador_user_id: undefined, created_by: undefined, updated_by: undefined };
      });
      res.json(filas);
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
        -- EL ICONO SE ELIGE SOLO a partir del nombre (D90, 2026-08-21). Si
        -- quien crea el proyecto manda uno, manda el suyo: automático no es
        -- obligatorio.
        INSERT INTO proyectos (id, titulo, descripcion, vision, slug, creador_user_id, grupos, publico, icono, created_by, updated_by)
        VALUES (${id}, ${d.titulo}, ${d.descripcion || null}, ${d.vision || null}, ${slug}, ${req.user.id},
                ${JSON.stringify(d.grupos?.length ? d.grupos : GRUPOS_POR_DEFECTO)}::jsonb,
                ${d.publico !== false}, ${d.icono || iconoDeNombre(d.titulo)}, ${req.user.id}, ${req.user.id})
      `);
      const row = await db.execute(sql`SELECT * FROM proyectos WHERE id = ${id}`);
      res.json(row.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * Los nombres de las tres columnas del tablero, saneados.
   *
   * SOLO SE ACEPTAN LAS TRES CLAVES DE SIEMPRE. El nombre lo escribe una
   * persona, pero la clave no: si se dejara pasar cualquiera, el tablero
   * podría acabar con una columna que ninguna tarea puede ocupar, porque el
   * estado que se guarda sigue siendo por_hacer / en_curso / hecho.
   */
  const limpiarColumnas = (v: any) => {
    if (!v || typeof v !== 'object') return null;
    const salida: Record<string, string> = {};
    for (const clave of ['por_hacer', 'en_curso', 'hecho']) {
      const nombre = String(v[clave] ?? '').trim();
      if (nombre) salida[clave] = nombre.slice(0, 40);
    }
    return Object.keys(salida).length ? salida : null;
  };

  app.put('/api/proyectos/:id', async (req: Request, res: Response) => {
    try {
      if (!(await puedeEditarProyecto(req, req.params.id))) {
        return res.status(403).json({ error: 'Solo quien creó el proyecto puede editarlo.' });
      }
      const d = req.body || {};
      await db.execute(sql`
        UPDATE proyectos SET
          titulo      = COALESCE(${d.titulo ?? null}, titulo),
          -- LA DESCRIPCIÓN Y EL ICONO SE PUEDEN VACIAR (2026-08-26). Con
          -- COALESCE, mandar null significa «déjalo como estaba», así que
          -- borrar la descripción era imposible desde aquí: se escribía y no
          -- pasaba nada, que es la peor forma de no funcionar. Ahora null y
          -- cadena vacía borran, y no mandar el campo es lo que lo respeta.
          descripcion = CASE WHEN ${d.descripcion === undefined} THEN descripcion ELSE ${d.descripcion ?? null}::text END,
          -- La columna icono la escribía sólo /api/elemento. Entra aquí para que la
          -- ventanita de editar una tarjeta guarde sus cuatro campos en UNA
          -- llamada: dos llamadas es un guardado que puede quedarse a medias.
          icono       = CASE WHEN ${d.icono === undefined} THEN icono ELSE ${d.icono ?? null}::text END,
          vision      = COALESCE(${d.vision ?? null}, vision),
          grupos      = COALESCE(${d.grupos ? JSON.stringify(d.grupos) : null}::jsonb, grupos),
          columnas    = COALESCE(${d.columnas ? JSON.stringify(limpiarColumnas(d.columnas)) : null}::jsonb, columnas),
          publico     = COALESCE(${d.publico ?? null}, publico),
          -- La portada se quita mandando null, así que no puede ir con
          -- COALESCE: ahí null significa «déjalo como estaba».
          portada_url = CASE WHEN ${d.portada_url === undefined} THEN portada_url ELSE ${d.portada_url ?? null}::text END,
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
          // LA ETIQUETA TIENE QUE EXISTIR EN ESTE PROYECTO (2026-08-20). Se
          // metía 'general' a pelo, que no está en la lista de ningún tablero:
          // la tarjeta se pintaba con la etiqueta del primer grupo, el contador
          // de ese grupo decía 0 y filtrando por él no aparecía. Tres sitios
          // contando cosas distintas de la misma tarjeta.
          const g = await db.execute(sql`SELECT grupos FROM proyectos WHERE id = ${pid}`);
          const lista = ((g.rows[0] as any)?.grupos || []) as any[];
          const grupo = lista[0]?.id || 'general';
          const id = nid('RI');
          await db.execute(sql`
            INSERT INTO roadmap_items (id, grupo, titulo, estado, prioridad, autor_user_id, created_by, updated_by, proyecto_id)
            VALUES (${id}, ${grupo}, ${titulo || 'Tarea sin título'}, 'por_hacer', 'media', ${yo}, ${yo}, ${yo}, ${pid})
          `);
          return res.json({ id, abrir: null });
        }
        case 'publicacion': {
          // NACE VACÍA Y SE QUEDA AQUÍ (Eugenio, 2026-08-22: «crear
          // publicaciones dentro del proyecto de manera sencilla»). No devuelve
          // `abrir`: a diferencia de una página o un mapa, una publicación se
          // escribe en la misma pantalla del proyecto, sin salir de él. Sacarte
          // de la página para escribir dos líneas es justo lo que hacía que
          // nadie publicara nada dentro de su proyecto.
          const id = nid('PUB');
          await db.execute(sql`
            INSERT INTO publications (id, author_user_id, title, body, media, links, visibility, proyecto_id, created_by, updated_by)
            VALUES (${id}, ${yo}, ${titulo || null}, '', '[]'::jsonb, '[]'::jsonb, 'publica', ${pid}, ${yo}, ${yo})
          `);
          return res.json({ id, abrir: null, publicacion: true });
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

      // EL RESPONSABLE (2026-08-20): una de TUS personas, o nadie. Se
      // comprueba que la persona es tuya: poner de responsable a la persona
      // de otro usuario sería escribir en su mundo desde el tuyo.
      // `undefined` = no tocar; `null` o '' = quitar el responsable.
      let responsable: string | null | undefined = undefined;
      if ('responsable_agente_id' in d) {
        if (!d.responsable_agente_id) {
          responsable = null;
        } else {
          const ag = await db.execute(sql`
            SELECT id FROM game_agents
            WHERE id = ${String(d.responsable_agente_id)} AND user_id = ${req.user!.id} AND archived_at IS NULL
          `);
          if (!ag.rows.length) return res.status(400).json({ error: 'Esa persona no existe o no es tuya.' });
          responsable = String(d.responsable_agente_id);
        }
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
          responsable_agente_id = CASE WHEN ${responsable !== undefined} THEN ${responsable ?? null} ELSE responsable_agente_id END,
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

  /**
   * LAS PUBLICACIONES DE UN PROYECTO (Eugenio, 2026-08-22).
   *
   * Viven aquí y no en `social.ts` a propósito: lo que las hace distintas no es
   * ser publicaciones, es colgar de un proyecto, y el permiso que las gobierna
   * es el del proyecto —`puedeEditarProyecto`— no el del muro.
   *
   * `GET` devuelve, además del texto, **cuántos adjuntos de cada clase lleva**.
   * Eugenio pidió «que me diga si la publicación tiene imagen o vídeo»: eso se
   * cuenta aquí, en la consulta, y no en la pantalla — si lo contara cada
   * pantalla, cada una contaría distinto.
   */
  app.get('/api/proyectos/:id/publicaciones', async (req: Request, res: Response) => {
    try {
      const filas = await db.execute(sql`
        SELECT p.id, p.title, p.body, p.media, p.links, p.created_at, p.visibility,
               p.author_user_id, u.display_name AS autor_nombre, u.avatar_url AS autor_avatar,
               (SELECT count(*) FROM jsonb_array_elements(p.media) m WHERE m->>'tipo' = 'imagen')    AS n_imagenes,
               (SELECT count(*) FROM jsonb_array_elements(p.media) m WHERE m->>'tipo' = 'video')     AS n_videos,
               (SELECT count(*) FROM jsonb_array_elements(p.media) m WHERE m->>'tipo' NOT IN ('imagen','video')) AS n_documentos,
               jsonb_array_length(coalesce(p.links, '[]'::jsonb)) AS n_referencias
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_user_id
        WHERE p.proyecto_id = ${req.params.id}
          AND p.archived_at IS NULL AND p.deleted_at IS NULL
          -- Una publicación privada la ve su autor y nadie más, esté donde esté.
          AND (coalesce(p.visibility,'publica') <> 'privada' OR p.author_user_id = ${req.user?.id || null}::text)
          -- BLOQUEO. La regla vive en bloqueado_entre (migracion 0091) para que
          -- todos los listados digan lo mismo; este es el séptimo que la usa.
          -- Sin sesión el primer argumento es NULL, la función da falso y no
          -- filtra nada: quien no ha entrado no ha bloqueado a nadie.
          AND NOT bloqueado_entre(${req.user?.id || null}::text, p.author_user_id)
        ORDER BY p.created_at DESC
        LIMIT 200
      `);
      res.json(filas.rows);
    } catch (e: any) {
      console.error('publicaciones de proyecto error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Editar una publicación del proyecto: texto, adjuntos y referencias.
   *
   * `PUT /api/publications/:id` (el del muro) **no toca `media` ni `links`**, y
   * por eso hasta hoy no había forma de adjuntar nada después de publicar. Aquí
   * sí, que es la otra mitad de lo que pidió Eugenio.
   *
   * Los adjuntos se suben antes por `/api/uploads`, que ya sabe de tipos y
   * tamaños; lo que llega aquí son las URL que aquello devolvió.
   */
  app.put('/api/proyectos/:pid/publicaciones/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const fila = await db.execute(sql`
        SELECT author_user_id, proyecto_id FROM publications
        WHERE id = ${req.params.id} AND archived_at IS NULL AND deleted_at IS NULL
      `);
      if (!fila.rows.length) return res.status(404).json({ error: 'Esa publicación no existe.' });
      const p = fila.rows[0] as any;
      if (p.proyecto_id !== req.params.pid) {
        return res.status(404).json({ error: 'Esa publicación no es de este proyecto.' });
      }
      // El autor siempre; y quien puede editar el proyecto, porque el proyecto
      // es suyo y lo que cuelga de él también.
      const esAutor = p.author_user_id === req.user.id;
      if (!esAutor && !(await puedeEditarProyecto(req, req.params.pid))) {
        return res.status(403).json({ error: 'Esta publicación no es tuya.' });
      }
      const d = req.body || {};
      // Cada lista se guarda solo si viene. Mandar `{ body }` no debe borrarte
      // los adjuntos, que es como se pierde el trabajo sin que nadie lo note.
      const media = Array.isArray(d.media) ? JSON.stringify(d.media) : null;
      const links = Array.isArray(d.links) ? JSON.stringify(d.links) : null;
      await db.execute(sql`
        UPDATE publications SET
          title = COALESCE(${d.title ?? null}, title),
          body  = COALESCE(${d.body ?? null}, body),
          media = COALESCE(${media}::jsonb, media),
          links = COALESCE(${links}::jsonb, links),
          version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id}
      `);
      const fin = await db.execute(sql`SELECT id, title, body, media, links FROM publications WHERE id = ${req.params.id}`);
      res.json(fin.rows[0]);
    } catch (e: any) {
      console.error('editar publicacion de proyecto error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
