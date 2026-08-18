import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ROLE } from './auth.js';

// ============================================================================
// JUEGO VITAL — agentes del mundo (2026-08-18)
// ============================================================================
// El jugador construye su mundo como en Los Sims: planta PERSONAS (gente real
// relevante para su vida) y PROYECTOS donde está parado, y a cada uno le va
// metiendo información. Cada agente guarda esa memoria y su propia
// conversación, así que hablar con él es hablar con alguien que recuerda lo
// suyo — el asistente de siempre, pero con una persona y un contexto.
//
// Diseño completo en memory/10_JUEGO_VITAL.md.

const TIPOS = ['persona', 'proyecto'] as const;

export function registerJuegoRoutes(app: Express, db: any) {
  /** Nivel 1 (USER) para construir; siempre en TU mundo. */
  const requiereUsuario = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < ROLE.USER) {
      res.status(403).json({ error: 'Necesitas una cuenta para construir tu mundo.' }); return false;
    }
    return true;
  };

  /** Devuelve el agente si existe y es tuyo (o eres admin); si no, responde y devuelve null. */
  const agenteMio = async (req: Request, res: Response) => {
    const filas = await db.execute(sql`
      SELECT * FROM game_agents WHERE id = ${req.params.id} AND archived_at IS NULL
    `);
    const a = filas.rows[0] as any;
    if (!a) { res.status(404).json({ error: 'Ese agente ya no existe.' }); return null; }
    if (a.user_id !== req.user!.id && (req.user!.roleLevel ?? 0) < ROLE.ADMIN) {
      res.status(403).json({ error: 'Ese agente vive en el mundo de otra persona.' }); return null;
    }
    return a;
  };

  /** GET /api/juego/agentes — los agentes de TU mundo. */
  app.get('/api/juego/agentes', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.json([]);
      const filas = await db.execute(sql`
        SELECT g.*, p.slug AS proyecto_slug,
               (SELECT count(*)::int FROM roadmap_items r
                 WHERE r.proyecto_id = g.proyecto_id AND r.archived_at IS NULL) AS tarjetas,
               (SELECT count(*)::int FROM roadmap_items r
                 WHERE r.proyecto_id = g.proyecto_id AND r.archived_at IS NULL AND r.estado = 'hecho') AS hechas
        FROM game_agents g
        LEFT JOIN proyectos p ON p.id = g.proyecto_id AND p.archived_at IS NULL
        WHERE g.user_id = ${req.user.id} AND g.archived_at IS NULL
        ORDER BY g.created_at ASC
      `);
      res.json(filas.rows);
    } catch (e: any) {
      // 42P01 = la tabla no existe todavía (código desplegado antes de aplicar
      // la migración 0029). El mundo se enseña vacío en vez de romperse: la
      // aldea, el robot y los proyectos siguen funcionando.
      if (e?.code === '42P01') {
        console.warn('game_agents no existe todavía: falta aplicar drizzle/0029_juego_agentes.sql');
        return res.json([]);
      }
      console.error('juego agentes error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/juego/agentes
   * { tipo, nombre, rol?, descripcion?, foto_url?, apariencia?, x?, z?, crear_proyecto? }
   *
   * Un agente de tipo `proyecto` con `crear_proyecto` levanta ADEMÁS el
   * proyecto real en la plataforma: lo que se construye en el juego existe
   * fuera del juego — es el pilar del diseño («todo es real»).
   */
  app.post('/api/juego/agentes', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const d = req.body || {};
      const tipo = String(d.tipo || '');
      if (!TIPOS.includes(tipo as any)) return res.status(400).json({ error: 'Tipo no válido (persona | proyecto).' });
      const nombre = String(d.nombre || '').trim();
      if (!nombre) return res.status(400).json({ error: 'Escribe un nombre.' });

      const id = `GA${Date.now()}${Math.floor(Math.random() * 1000)}`;
      let proyectoId: string | null = d.proyecto_id || null;

      if (tipo === 'proyecto' && !proyectoId && d.crear_proyecto !== false) {
        const pid = `PRY${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const slug = `${nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'proyecto'}-${Math.floor(Math.random() * 1000)}`;
        await db.execute(sql`
          INSERT INTO proyectos (id, titulo, descripcion, slug, creador_user_id, publico, created_by, updated_by)
          VALUES (${pid}, ${nombre}, ${d.descripcion || null}, ${slug}, ${req.user!.id}, false,
                  ${req.user!.id}, ${req.user!.id})
        `);
        proyectoId = pid;
      }

      await db.execute(sql`
        INSERT INTO game_agents (id, user_id, tipo, nombre, rol, descripcion, foto_url,
                                 apariencia, proyecto_id, x, z, created_by, updated_by)
        VALUES (${id}, ${req.user!.id}, ${tipo}, ${nombre}, ${d.rol || null}, ${d.descripcion || null},
                ${d.foto_url || null}, ${JSON.stringify(d.apariencia || {})}::jsonb, ${proyectoId},
                ${Number(d.x) || 0}, ${Number(d.z) || 0}, ${req.user!.id}, ${req.user!.id})
      `);
      const fila = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      console.error('crear agente error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/juego/agentes/:id — mover, renombrar, cambiar aspecto. */
  app.put('/api/juego/agentes/:id', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      const d = req.body || {};
      await db.execute(sql`
        UPDATE game_agents SET
          nombre      = ${d.nombre !== undefined ? String(d.nombre).trim() : a.nombre},
          rol         = ${d.rol !== undefined ? d.rol : a.rol},
          descripcion = ${d.descripcion !== undefined ? d.descripcion : a.descripcion},
          foto_url    = ${d.foto_url !== undefined ? d.foto_url : a.foto_url},
          apariencia  = ${JSON.stringify(d.apariencia !== undefined ? d.apariencia : a.apariencia)}::jsonb,
          x           = ${d.x !== undefined ? Number(d.x) : a.x},
          z           = ${d.z !== undefined ? Number(d.z) : a.z},
          updated_at  = now(),
          updated_by  = ${req.user!.id}
        WHERE id = ${a.id}
      `);
      const fila = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${a.id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      console.error('editar agente error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/juego/agentes/:id/memoria  { texto }
   * «Meterle info» al agente: se acumula y viaja en el contexto de la IA
   * cada vez que hablas con él.
   */
  app.post('/api/juego/agentes/:id/memoria', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      const texto = String(req.body?.texto || '').trim();
      if (!texto) return res.status(400).json({ error: 'Escribe algo que contarle.' });
      const entrada = JSON.stringify([{ texto, created_at: new Date().toISOString() }]);
      await db.execute(sql`
        UPDATE game_agents
        SET memoria = coalesce(memoria, '[]'::jsonb) || ${entrada}::jsonb,
            updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${a.id}
      `);
      const fila = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${a.id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      console.error('memoria agente error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/juego/agentes/:id/archivos  { url, nombre, tipo, es_imagen }
   * El archivo de cada amigo: fotos y documentos que se quedan con él. Los
   * bytes ya están subidos por `/api/uploads`; aquí solo se guarda la ficha.
   */
  app.post('/api/juego/agentes/:id/archivos', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      const url = String(req.body?.url || '').trim();
      // Solo rutas de nuestro propio almacén: nada de enlaces externos que
      // luego se pinten como si fueran del jugador.
      if (!url.startsWith('/uploads/')) {
        return res.status(400).json({ error: 'Sube el archivo primero.' });
      }
      const entrada = JSON.stringify([{
        url,
        nombre: String(req.body?.nombre || 'archivo').slice(0, 120),
        tipo: String(req.body?.tipo || ''),
        es_imagen: !!req.body?.es_imagen,
        created_at: new Date().toISOString(),
      }]);
      await db.execute(sql`
        UPDATE game_agents
        SET archivos = coalesce(archivos, '[]'::jsonb) || ${entrada}::jsonb,
            updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${a.id}
      `);
      const fila = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${a.id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      console.error('archivos agente error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/juego/agentes/:id/archivos { url } — quita uno del archivo. */
  app.delete('/api/juego/agentes/:id/archivos', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      const url = String(req.body?.url || '');
      // El fichero en disco NO se borra: puede estar embebido en otro sitio.
      await db.execute(sql`
        UPDATE game_agents
        SET archivos = coalesce((
              SELECT jsonb_agg(e) FROM jsonb_array_elements(coalesce(archivos, '[]'::jsonb)) e
              WHERE e->>'url' <> ${url}
            ), '[]'::jsonb),
            updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${a.id}
      `);
      const fila = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${a.id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      console.error('quitar archivo error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/juego/agentes/:id/conversacion { conversation_id } — fija su hilo. */
  app.put('/api/juego/agentes/:id/conversacion', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      await db.execute(sql`
        UPDATE game_agents SET conversation_id = ${req.body?.conversation_id || null},
               updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${a.id}
      `);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/juego/agentes/:id/archivar — regla 6: se archiva, no se destruye. */
  app.post('/api/juego/agentes/:id/archivar', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      await db.execute(sql`
        UPDATE game_agents SET archived_at = now(), updated_by = ${req.user!.id} WHERE id = ${a.id}
      `);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // Personas EN proyectos (2026-08-18, petición de Eugenio: «que las personas
  // formen parte de un proyecto y no se añadan en el kanban sino en una
  // sección de personas ad hoc»). La membresía vive en `proyecto_ids` del
  // agente: una persona puede estar en varios proyectos a la vez.
  // ==========================================================================

  /** POST /api/juego/agentes/:id/proyectos { proyecto_id, quitar? } */
  app.post('/api/juego/agentes/:id/proyectos', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      const pid = String(req.body?.proyecto_id || '');
      if (!pid) return res.status(400).json({ error: 'Falta el proyecto.' });
      const actuales: string[] = Array.isArray(a.proyecto_ids) ? a.proyecto_ids : [];
      const nuevos = req.body?.quitar
        ? actuales.filter(x => x !== pid)
        : (actuales.includes(pid) ? actuales : [...actuales, pid]);
      await db.execute(sql`
        UPDATE game_agents
        SET proyecto_ids = ${JSON.stringify(nuevos)}::jsonb, updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${a.id}
      `);
      res.json({ ok: true, proyecto_ids: nuevos });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/juego/proyectos/:id/personas — los miembros de un proyecto.
   * Solo para su creador: las personas de tu mundo son representaciones
   * privadas y no se enseñan a quien visita un proyecto público.
   */
  app.get('/api/juego/proyectos/:id/personas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.json([]);
      const filas = await db.execute(sql`
        SELECT id, nombre, rol, descripcion, foto_url, apariencia, proyecto_ids
        FROM game_agents
        WHERE user_id = ${req.user.id} AND archived_at IS NULL AND tipo = 'persona'
          AND proyecto_ids ? ${req.params.id}
        ORDER BY created_at ASC
      `);
      res.json(filas.rows);
    } catch (e: any) {
      if (e?.code === '42P01' || e?.code === '42703') return res.json([]);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // El mundo editable (2026-08-18, petición de Eugenio: «un Miro en 3D» —
  // crear, mover, cambiar el diseño y eliminar objetos, y plantar notas,
  // imágenes y documentos en el mapa).
  // ==========================================================================

  const TIPOS_MUNDO = new Set(['prop', 'nota', 'imagen', 'documento']);

  /** GET /api/juego/mundo — tus objetos + tus retoques del pueblo semilla. */
  app.get('/api/juego/mundo', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.json({ items: [], overrides: [] });
      const items = await db.execute(sql`
        SELECT * FROM game_world_items
        WHERE user_id = ${req.user.id} AND archived_at IS NULL
        ORDER BY created_at ASC
      `);
      const overrides = await db.execute(sql`
        SELECT seed_id, eliminado, x, z, rot, modelo FROM game_world_overrides
        WHERE user_id = ${req.user.id}
      `);
      res.json({ items: items.rows, overrides: overrides.rows });
    } catch (e: any) {
      // Código desplegado antes que la migración 0031: mundo sin editar.
      if (e?.code === '42P01') return res.json({ items: [], overrides: [] });
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/juego/mundo — plantar un objeto nuevo. */
  app.post('/api/juego/mundo', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const d = req.body || {};
      if (!TIPOS_MUNDO.has(d.tipo)) return res.status(400).json({ error: 'Tipo de objeto no válido.' });
      const id = `WM${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await db.execute(sql`
        INSERT INTO game_world_items (id, user_id, tipo, modelo, texto, url, nombre, x, z, rot, escala)
        VALUES (${id}, ${req.user!.id}, ${d.tipo}, ${d.modelo || null}, ${d.texto || null},
                ${d.url || null}, ${d.nombre || null},
                ${Number(d.x) || 0}, ${Number(d.z) || 0}, ${Number(d.rot) || 0},
                ${Number(d.escala) || 1})
      `);
      const fila = await db.execute(sql`SELECT * FROM game_world_items WHERE id = ${id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/juego/mundo/semilla — retocar el pueblo de serie: mover, eliminar
   * o cambiar el diseño de una casa, farola, árbol… Upsert por (user, seed_id).
   */
  app.put('/api/juego/mundo/semilla', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const d = req.body || {};
      const seed = String(d.seed_id || '');
      if (!seed) return res.status(400).json({ error: 'Falta el objeto a retocar.' });
      await db.execute(sql`
        INSERT INTO game_world_overrides (user_id, seed_id, eliminado, x, z, rot, modelo)
        VALUES (${req.user!.id}, ${seed}, ${!!d.eliminado},
                ${d.x ?? null}, ${d.z ?? null}, ${d.rot ?? null}, ${d.modelo ?? null})
        ON CONFLICT (user_id, seed_id) DO UPDATE SET
          eliminado  = ${!!d.eliminado},
          x          = COALESCE(${d.x ?? null}::double precision, game_world_overrides.x),
          z          = COALESCE(${d.z ?? null}::double precision, game_world_overrides.z),
          rot        = COALESCE(${d.rot ?? null}::double precision, game_world_overrides.rot),
          modelo     = COALESCE(${d.modelo ?? null}, game_world_overrides.modelo),
          updated_at = now()
      `);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // OJO: esta ruta va DESPUÉS de /mundo/semilla. Express prueba en orden de
  // registro y «semilla» encajaría en `:id` — pasó y el retoque devolvía 404.
  /** PUT /api/juego/mundo/:id — mover, girar, cambiar texto o diseño. */
  app.put('/api/juego/mundo/:id', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const d = req.body || {};
      const r = await db.execute(sql`
        UPDATE game_world_items
        SET x      = COALESCE(${d.x ?? null}::double precision, x),
            z      = COALESCE(${d.z ?? null}::double precision, z),
            rot    = COALESCE(${d.rot ?? null}::double precision, rot),
            escala = COALESCE(${d.escala ?? null}::double precision, escala),
            texto  = COALESCE(${d.texto ?? null}, texto),
            modelo = COALESCE(${d.modelo ?? null}, modelo),
            enlaces = COALESCE(${d.enlaces ? JSON.stringify(d.enlaces) : null}::jsonb, enlaces),
            updated_at = now()
        WHERE id = ${req.params.id} AND user_id = ${req.user!.id} AND archived_at IS NULL
        RETURNING *
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Ese objeto no está en tu mundo.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/juego/mundo/:id/archivar — quitar un objeto (regla 6). */
  app.post('/api/juego/mundo/:id/archivar', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      await db.execute(sql`
        UPDATE game_world_items SET archived_at = now()
        WHERE id = ${req.params.id} AND user_id = ${req.user!.id}
      `);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

}
