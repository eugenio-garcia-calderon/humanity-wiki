import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// LAS RAMAS DE UN PROYECTO (2026-08-25)
// ============================================================================
// Eugenio: «permite al usuario que en cada proyecto pueda crear ramas dentro
// del proyecto […] y esas ramas pueden tener subramas».
//
// El árbol vive en `proyecto_ramas` (0128), que lleva escrito por qué es una
// tabla y no una clave más en el JSON del proyecto.
//
// ── QUIÉN PUEDE TOCAR EL ÁRBOL DE UN PROYECTO ──────────────────────────────
// Quien pueda editar el proyecto: su creador, o nivel 4. No se hereda del
// «cualquiera con sesión» de los subtemas (0120) y la diferencia tiene motivo:
// los temas son de la Humanidad y un proyecto es de alguien. Meter una rama en
// el proyecto de otro es escribir dentro de su casa.

const nuevoId = () => `RM${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

/** ¿Puede esta persona tocar este proyecto? Devuelve el proyecto o null. */
async function proyectoQuePuedeTocar(db: any, req: Request, proyectoId: string) {
  const r = await db.execute(sql`
    SELECT id, titulo, creador_user_id FROM proyectos
    WHERE id = ${proyectoId} AND archived_at IS NULL AND deleted_at IS NULL
  `);
  const p = r.rows[0] as any;
  if (!p) return null;
  const yo = req.user?.id;
  const nivel = req.user?.roleLevel ?? 0;
  return (yo && (p.creador_user_id === yo || nivel >= 4)) ? p : null;
}

export function registrarRamas(app: Express, db: any) {
  /**
   * EL ÁRBOL ENTERO — `GET /api/proyectos/:id/ramas`
   *
   * Todas las ramas de una vez, planas y con `padre_id`: quien las pinta las
   * monta. Un proyecto no tiene cientos, así que traerlo entero cuesta menos
   * que una petición por nivel cada vez que alguien despliega algo — y el
   * dibujo necesita el árbol COMPLETO de todas formas, porque para centrar una
   * rama sobre sus hijas hay que saber cuánto ocupan sus nietas.
   *
   * Se puede leer sin ser el dueño si el proyecto es público: mirar no es
   * tocar.
   */
  app.get('/api/proyectos/:id/ramas', async (req: Request, res: Response) => {
    try {
      const p = await db.execute(sql`
        SELECT id, publico, creador_user_id FROM proyectos
        WHERE id = ${req.params.id} AND archived_at IS NULL AND deleted_at IS NULL
      `);
      const proy = p.rows[0] as any;
      if (!proy) return res.status(404).json({ error: 'Ese proyecto no existe.' });

      const yo = req.user?.id;
      const nivel = req.user?.roleLevel ?? 0;
      if (!proy.publico && proy.creador_user_id !== yo && nivel < 4) {
        return res.status(403).json({ error: 'Ese proyecto no es público.' });
      }

      const r = await db.execute(sql`
        SELECT id, padre_id, nombre, nota, color, orden, created_at
        FROM proyecto_ramas
        WHERE proyecto_id = ${req.params.id} AND archived_at IS NULL
        ORDER BY orden, created_at
      `);
      res.json({ ramas: r.rows, puedeEditar: !!yo && (proy.creador_user_id === yo || nivel >= 4) });
    } catch (e: any) {
      console.error('[ramas listar]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * CREAR UNA RAMA — `POST /api/proyectos/:id/ramas`  `{ nombre, padre?, color?, nota? }`
   */
  app.post('/api/proyectos/:id/ramas', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const proy = await proyectoQuePuedeTocar(db, req, req.params.id);
      if (!proy) return res.status(403).json({ error: 'Este proyecto no es tuyo.' });

      const nombre = String(req.body?.nombre || '').trim().slice(0, 60);
      if (nombre.length < 1) return res.status(400).json({ error: 'La rama necesita un nombre.' });
      const padre = req.body?.padre ? String(req.body.padre) : null;

      // La rama madre tiene que ser de ESTE proyecto. El disparador de 0128 ya
      // lo garantiza en la base, pero un 400 con motivo es mejor que una fila
      // que aparece en otro sitio sin que nadie entienda por qué.
      if (padre) {
        const m = await db.execute(sql`
          SELECT id FROM proyecto_ramas
          WHERE id = ${padre} AND proyecto_id = ${req.params.id} AND archived_at IS NULL
        `);
        if (!m.rows.length) return res.status(400).json({ error: 'Esa rama madre no es de este proyecto.' });
      }

      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO proyecto_ramas (id, proyecto_id, padre_id, nombre, nota, color, creador_user_id, orden)
        VALUES (${id}, ${req.params.id}, ${padre}, ${nombre},
                ${req.body?.nota || null}, ${req.body?.color || null}, ${req.user.id},
                coalesce((SELECT max(orden) + 1 FROM proyecto_ramas
                           WHERE proyecto_id = ${req.params.id}
                             AND coalesce(padre_id,'') = coalesce(${padre}::text,'')
                             AND archived_at IS NULL), 0))
      `);
      const fila = await db.execute(sql`SELECT * FROM proyecto_ramas WHERE id = ${id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      // Dos hermanas con el mismo nombre: no es un error que haya que enseñar
      // como un fallo del sistema, es que ya existe lo que se quería crear.
      if (String(e?.cause?.code || e?.code) === '23505') {
        return res.status(409).json({ error: 'Ya hay una rama con ese nombre en el mismo sitio.' });
      }
      console.error('[ramas crear]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * CAMBIARLA — `PUT /api/proyectos/:id/ramas/:rama`
   * `{ nombre?, nota?, color?, padre? }`
   *
   * `padre` también se puede cambiar: mover una rama entera con lo que cuelgue
   * de ella. Es lo que convierte un árbol en algo con lo que se puede pensar en
   * vez de en una decisión que hay que acertar a la primera.
   */
  app.put('/api/proyectos/:id/ramas/:rama', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const proy = await proyectoQuePuedeTocar(db, req, req.params.id);
      if (!proy) return res.status(403).json({ error: 'Este proyecto no es tuyo.' });

      const actual = await db.execute(sql`
        SELECT * FROM proyecto_ramas
        WHERE id = ${req.params.rama} AND proyecto_id = ${req.params.id} AND archived_at IS NULL
      `);
      if (!actual.rows.length) return res.status(404).json({ error: 'Esa rama no existe.' });

      let padre = req.body?.padre === undefined ? undefined
        : (req.body.padre ? String(req.body.padre) : null);

      // ── UNA RAMA NO PUEDE COLGAR DE SÍ MISMA NI DE SU PROPIA DESCENDENCIA ─
      // Sin esto, mover «Diseño» dentro de su propia hija crea un bucle: esas
      // ramas desaparecen del árbol —ya no cuelgan de la raíz— y ninguna
      // consulta recursiva vuelve a terminar. La base no puede impedirlo por sí
      // sola; hay que preguntarlo.
      if (padre) {
        const dentro = await db.execute(sql`
          WITH RECURSIVE bajo AS (
            SELECT id FROM proyecto_ramas WHERE id = ${req.params.rama}
            UNION ALL
            SELECT r.id FROM proyecto_ramas r JOIN bajo b ON r.padre_id = b.id
          )
          SELECT 1 FROM bajo WHERE id = ${padre}
        `);
        if (dentro.rows.length) {
          return res.status(400).json({ error: 'No puedes meter una rama dentro de sí misma.' });
        }
      }

      await db.execute(sql`
        UPDATE proyecto_ramas SET
          nombre = coalesce(${req.body?.nombre ?? null}::text, nombre),
          nota   = CASE WHEN ${req.body?.nota === undefined} THEN nota ELSE ${req.body?.nota ?? null}::text END,
          color  = CASE WHEN ${req.body?.color === undefined} THEN color ELSE ${req.body?.color ?? null}::text END,
          padre_id = CASE WHEN ${padre === undefined} THEN padre_id ELSE ${padre ?? null}::text END,
          updated_at = now()
        WHERE id = ${req.params.rama}
      `);
      const fila = await db.execute(sql`SELECT * FROM proyecto_ramas WHERE id = ${req.params.rama}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      if (String(e?.cause?.code || e?.code) === '23505') {
        return res.status(409).json({ error: 'Ya hay una rama con ese nombre en el mismo sitio.' });
      }
      console.error('[ramas cambiar]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * ARCHIVARLA — `DELETE /api/proyectos/:id/ramas/:rama`
   *
   * Se archiva, no se borra: regla 6 de la Constitución. Y **con todo lo que
   * cuelga**, porque dejar las hijas huérfanas las haría desaparecer del árbol
   * sin desaparecer de la base — visibles para nadie y borrables por nadie.
   * Se dice cuántas se llevó por delante, que es lo que permite deshacerlo si
   * era más de lo que se creía.
   */
  app.delete('/api/proyectos/:id/ramas/:rama', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const proy = await proyectoQuePuedeTocar(db, req, req.params.id);
      if (!proy) return res.status(403).json({ error: 'Este proyecto no es tuyo.' });

      const r = await db.execute(sql`
        WITH RECURSIVE bajo AS (
          SELECT id FROM proyecto_ramas
          WHERE id = ${req.params.rama} AND proyecto_id = ${req.params.id} AND archived_at IS NULL
          UNION ALL
          SELECT h.id FROM proyecto_ramas h JOIN bajo b ON h.padre_id = b.id
          WHERE h.archived_at IS NULL
        )
        UPDATE proyecto_ramas SET archived_at = now()
        WHERE id IN (SELECT id FROM bajo)
        RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa rama no existe.' });
      res.json({ archivadas: r.rows.length });
    } catch (e: any) {
      console.error('[ramas archivar]', e?.cause?.message || e);
      res.status(500).json({ error: e.message });
    }
  });
}
