import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// LA GALERÍA DE UN PROYECTO (2026-08-26)
// ============================================================================
// Eugenio: «permite añadir una galería de imágenes general al proyecto, justo
// debajo del título, con descripción de cada imagen opcional».
//
// La tabla es `proyecto_imagenes` (0130), donde está escrito por qué no se
// reutiliza `archivos`.
//
// ── MIRAR NO ES TOCAR ──────────────────────────────────────────────────────
// La galería de un proyecto público la ve cualquiera, igual que su título y su
// descripción: es lo que el proyecto enseña de sí mismo. Escribir en ella es
// otra cosa, y ahí vale la misma regla que en las ramas — su creador, o nivel
// 4. Un proyecto es de alguien.

const nuevoId = () => `PI${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

/** El proyecto, si esta persona puede escribir en él. Si no, null. */
async function proyectoQuePuedeTocar(db: any, req: Request, proyectoId: string) {
  const r = await db.execute(sql`
    SELECT id, creador_user_id FROM proyectos
    WHERE id = ${proyectoId} AND archived_at IS NULL AND deleted_at IS NULL
  `);
  const p = r.rows[0] as any;
  if (!p) return null;
  const yo = req.user?.id;
  return (yo && (p.creador_user_id === yo || (req.user?.roleLevel ?? 0) >= 4)) ? p : null;
}

/** El proyecto, si esta persona puede al menos verlo. */
async function proyectoQuePuedeVer(db: any, req: Request, proyectoId: string) {
  const r = await db.execute(sql`
    SELECT id, creador_user_id, publico FROM proyectos
    WHERE (id = ${proyectoId} OR slug = ${proyectoId}) AND archived_at IS NULL AND deleted_at IS NULL
  `);
  const p = r.rows[0] as any;
  if (!p) return null;
  if (p.publico) return p;
  return (req.user && (p.creador_user_id === req.user.id || (req.user.roleLevel ?? 0) >= 4)) ? p : null;
}

export function registrarGaleria(app: Express, db: any) {
  /**
   * LA GALERÍA — `GET /api/proyectos/:id/galeria`
   *
   * Devuelve `{ imagenes, puedeEditar }`. Las dos cosas juntas y no sólo la
   * lista: quien pinta esto necesita saber si enseñar los botones de añadir, y
   * preguntárselo por su cuenta —comparando el creador con el usuario— sería
   * una segunda opinión que un día no coincide con la del servidor.
   */
  app.get('/api/proyectos/:id/galeria', async (req: Request, res: Response) => {
    try {
      const p = await proyectoQuePuedeVer(db, req, req.params.id);
      if (!p) return res.status(404).json({ error: 'Proyecto no encontrado.' });
      const filas = await db.execute(sql`
        SELECT id, url, descripcion, orden, created_at
        FROM proyecto_imagenes
        WHERE proyecto_id = ${p.id} AND archived_at IS NULL
        ORDER BY orden ASC, created_at ASC
      `);
      const puede = !!req.user
        && (p.creador_user_id === req.user.id || (req.user.roleLevel ?? 0) >= 4);
      res.json({ imagenes: filas.rows, puedeEditar: puede });
    } catch (e: any) {
      console.error('[galeria leer]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * AÑADIR UNA — `POST /api/proyectos/:id/galeria` `{ url, descripcion? }`
   *
   * La imagen se sube antes por `/api/uploads`, que es la única puerta de
   * subida que hay; aquí sólo se cuelga en el proyecto.
   */
  app.post('/api/proyectos/:id/galeria', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const p = await proyectoQuePuedeTocar(db, req, req.params.id);
      if (!p) return res.status(403).json({ error: 'Este proyecto no es tuyo.' });

      const url = String(req.body?.url || '').trim();
      if (!url) return res.status(400).json({ error: 'Falta la imagen.' });

      // AL FINAL, NO AL PRINCIPIO. Quien añade una foto la añade detrás de las
      // que ya hay: si apareciera la primera, cada foto nueva reordenaría una
      // galería que alguien colocó a mano.
      const ultimo = await db.execute(sql`
        SELECT coalesce(max(orden), -1) AS n FROM proyecto_imagenes
        WHERE proyecto_id = ${p.id} AND archived_at IS NULL
      `);
      const orden = Number((ultimo.rows[0] as any)?.n ?? -1) + 1;

      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO proyecto_imagenes (id, proyecto_id, url, descripcion, orden, creador_user_id)
        VALUES (${id}, ${p.id}, ${url},
                ${req.body?.descripcion ? String(req.body.descripcion).slice(0, 300) : null},
                ${orden}, ${req.user.id})
      `);
      const fila = await db.execute(sql`
        SELECT id, url, descripcion, orden, created_at FROM proyecto_imagenes WHERE id = ${id}
      `);
      res.json(fila.rows[0]);
    } catch (e: any) {
      console.error('[galeria añadir]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * CAMBIARLA — `PUT /api/proyectos/:id/galeria/:img` `{ descripcion?, orden? }`
   *
   * `descripcion` a `null` o a cadena vacía la quita: el pie de foto es
   * opcional, y opcional incluye poder arrepentirse.
   */
  app.put('/api/proyectos/:id/galeria/:img', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const p = await proyectoQuePuedeTocar(db, req, req.params.id);
      if (!p) return res.status(403).json({ error: 'Este proyecto no es tuyo.' });

      const desc = req.body?.descripcion === undefined
        ? undefined
        : (String(req.body.descripcion || '').trim().slice(0, 300) || null);

      const r = await db.execute(sql`
        UPDATE proyecto_imagenes SET
          descripcion = CASE WHEN ${desc === undefined} THEN descripcion ELSE ${desc ?? null}::text END,
          orden       = COALESCE(${req.body?.orden ?? null}::int, orden),
          updated_at  = now()
        WHERE id = ${req.params.img} AND proyecto_id = ${p.id} AND archived_at IS NULL
        RETURNING id, url, descripcion, orden, created_at
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa imagen no está en este proyecto.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('[galeria cambiar]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * QUITARLA — `DELETE /api/proyectos/:id/galeria/:img`
   *
   * Se archiva, no se borra: regla 6 de la Constitución. El archivo subido
   * sigue donde estaba — quitarlo de la galería no lo destruye, y por eso
   * quitar una foto que también está en otro sitio no rompe el otro sitio.
   */
  app.delete('/api/proyectos/:id/galeria/:img', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const p = await proyectoQuePuedeTocar(db, req, req.params.id);
      if (!p) return res.status(403).json({ error: 'Este proyecto no es tuyo.' });
      const r = await db.execute(sql`
        UPDATE proyecto_imagenes SET archived_at = now()
        WHERE id = ${req.params.img} AND proyecto_id = ${p.id} AND archived_at IS NULL
        RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa imagen no está en este proyecto.' });
      res.json({ ok: true });
    } catch (e: any) {
      console.error('[galeria quitar]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });
}
