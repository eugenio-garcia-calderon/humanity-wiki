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
      await db.execute(sql`
        UPDATE roadmap_items SET
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
}
