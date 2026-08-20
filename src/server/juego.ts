import type { Express, Request, Response } from 'express';
import { iconoDeNombre } from '../utils/iconoDeNombre';
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
  /**
   * GET /api/juego/agentes/:id — una sola representación, con su memoria y su
   * conversación (2026-08-20, petición de Eugenio: «para hablar con alguien
   * haz que no haga falta que cargue el mundo 3D»).
   *
   * Hablar con Anita cargaba el Mundo 3D entero —un megabyte de three.js y
   * toda la escena— para lo que en el fondo es una ficha y un chat. Esta ruta
   * sirve justo eso.
   */
  app.get('/api/juego/agentes/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const f = await db.execute(sql`
        SELECT g.*, p.titulo AS proyecto_titulo, p.slug AS proyecto_slug
        FROM game_agents g
        LEFT JOIN proyectos p ON p.id = g.proyecto_id AND p.archived_at IS NULL
        WHERE g.id = ${req.params.id} AND g.user_id = ${req.user.id} AND g.archived_at IS NULL
      `);
      if (!f.rows.length) return res.status(404).json({ error: 'Esa persona no está en tu mundo.' });
      const a = f.rows[0] as any;

      // Lo que os habéis dicho. Si todavía no hay hilo, la lista va vacía.
      let mensajes: any[] = [];
      if (a.conversation_id) {
        const m = await db.execute(sql`
          SELECT role, content, created_at FROM ai_messages
          WHERE conversation_id = ${a.conversation_id}
          ORDER BY created_at ASC LIMIT 500
        `);
        mensajes = (m.rows as any[]).map(x => ({
          mio: x.role === 'user', texto: x.content, fecha: x.created_at,
        }));
      }
      res.json({ agente: a, mensajes });
    } catch (e: any) {
      console.error('agente error:', e);
      res.status(500).json({ error: e.message });
    }
  });

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
          INSERT INTO proyectos (id, titulo, descripcion, slug, creador_user_id, publico, icono, created_by, updated_by)
          VALUES (${pid}, ${nombre}, ${d.descripcion || null}, ${slug}, ${req.user!.id}, false,
                  ${iconoDeNombre(nombre)}, ${req.user!.id}, ${req.user!.id})
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

  const TIPOS_MUNDO = new Set(['prop', 'nota', 'imagen', 'documento', 'enlace', 'video', 'musica', 'lienzo', 'mapa', 'producto']);

  /** GET /api/juego/mundo — tus objetos + tus retoques del pueblo semilla. */
  app.get('/api/juego/mundo', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.json({ items: [], overrides: [] });
      // La ficha del PRODUCTO viaja con el objeto (2026-08-19): el mundo lo
      // dibuja con su foto y su precio, y si el precio cambia en el Mercado
      // cambia también en la aldea porque aquí no se copia nada, se lee.
      // Va como LEFT JOIN y no como consulta aparte: los objetos ya vienen en
      // una sola petición y no merece la pena partirla por dos campos.
      const items = await db.execute(sql`
        SELECT i.*,
               CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
                 'id', p.id, 'name', p.name, 'price_cents', p.price_cents,
                 'currency', p.currency, 'images', p.images, 'modelo', i.modelo,
                 'descripcion', p.description, 'bloques', p.bloques,
                 'creador', p.created_by
               ) END AS producto
        FROM game_world_items i
        LEFT JOIN products p
          ON p.id = i.producto_id AND p.archived_at IS NULL
        WHERE i.user_id = ${req.user.id} AND i.archived_at IS NULL
        ORDER BY i.created_at ASC
      `);
      const overrides = await db.execute(sql`
        SELECT seed_id, eliminado, x, z, rot, modelo, texto, portal_proyecto_id
        FROM game_world_overrides
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
      // Un vídeo de YouTube llega con la URL pelada: se le pregunta a YouTube
      // el TÍTULO y el CANAL por oEmbed (público, sin clave) y se guardan en
      // `nombre` y `texto` — la tarjeta 3D enseña eso y su miniatura, nunca la
      // URL (petición de Eugenio). Si oEmbed no contesta, el objeto se crea
      // igual: el título ya llegará de otra pasada o lo pondrá el jugador.
      const videoId = d.tipo === 'video' && d.url
        ? String(d.url).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1]
        : null;
      if (videoId) {
        const urlSinNombre = !d.nombre || /^(https?:\/\/|www\.|youtu)/i.test(String(d.nombre));
        if (urlSinNombre || !d.texto) {
          try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3500);
            // La URL se normaliza al vídeo pelado: al oEmbed le sientan mal
            // los parámetros extra de las búsquedas (pp=…, comprobado).
            const limpia = `https://www.youtube.com/watch?v=${videoId}`;
            const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(limpia)}`, { signal: ctrl.signal });
            clearTimeout(timer);
            if (r.ok) {
              const meta: any = await r.json();
              if (urlSinNombre && meta.title) d.nombre = String(meta.title).slice(0, 120);
              if (!d.texto && meta.author_name) d.texto = String(meta.author_name).slice(0, 80);
            }
          } catch { /* sin metadatos también vale */ }
        }
      }
      // Un PRODUCTO tiene que apuntar a una ficha que exista y esté viva: sin
      // esto se podría plantar una vitrina hacia un producto archivado, y en el
      // mundo saldría un hueco sin explicación.
      if (d.tipo === 'producto') {
        const p = await db.execute(sql`
          SELECT id FROM products WHERE id = ${d.producto_id || ''} AND archived_at IS NULL
        `);
        if (!p.rows.length) return res.status(400).json({ error: 'Ese producto no existe en el Mercado.' });
      }

      const id = `WM${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await db.execute(sql`
        INSERT INTO game_world_items (id, user_id, tipo, modelo, texto, url, nombre, x, z, rot, escala, proyecto_id, producto_id)
        VALUES (${id}, ${req.user!.id}, ${d.tipo}, ${d.modelo || null}, ${d.texto || null},
                ${d.url || null}, ${d.nombre || null},
                ${Number(d.x) || 0}, ${Number(d.z) || 0}, ${Number(d.rot) || 0},
                ${Number(d.escala) || 1}, ${d.proyecto_id || null},
                ${d.tipo === 'producto' ? d.producto_id : null})
      `);
      const fila = await db.execute(sql`
        SELECT i.*,
               CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
                 'id', p.id, 'name', p.name, 'price_cents', p.price_cents,
                 'currency', p.currency, 'images', p.images, 'modelo', i.modelo,
                 'descripcion', p.description, 'bloques', p.bloques,
                 'creador', p.created_by
               ) END AS producto
        FROM game_world_items i
        LEFT JOIN products p ON p.id = i.producto_id AND p.archived_at IS NULL
        WHERE i.id = ${id}
      `);
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
        INSERT INTO game_world_overrides (user_id, seed_id, eliminado, x, z, rot, modelo, texto)
        VALUES (${req.user!.id}, ${seed}, ${!!d.eliminado},
                ${d.x ?? null}, ${d.z ?? null}, ${d.rot ?? null}, ${d.modelo ?? null},
                ${d.texto ?? null})
        ON CONFLICT (user_id, seed_id) DO UPDATE SET
          eliminado  = ${!!d.eliminado},
          x          = COALESCE(${d.x ?? null}::double precision, game_world_overrides.x),
          z          = COALESCE(${d.z ?? null}::double precision, game_world_overrides.z),
          rot        = COALESCE(${d.rot ?? null}::double precision, game_world_overrides.rot),
          modelo     = COALESCE(${d.modelo ?? null}, game_world_overrides.modelo),
          -- El texto tiene TRES casos, no dos, y por eso no vale un COALESCE:
          --   · no viene el campo  → se deja como estaba (mover o girar un
          --     cartel no puede borrarle el nombre; pasó en pruebas)
          --   · viene vacío        → se borra, y vuelve al nombre de fábrica
          --   · viene con texto    → se guarda
          texto      = CASE WHEN ${d.texto === undefined}::boolean
                            THEN game_world_overrides.texto
                            ELSE ${d.texto || null} END,
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

  // -------------------------------------------------------------------------
  // Convertir en PORTAL (2026-08-18, petición de Eugenio): un objeto o una
  // persona se transforma en un portal que lleva a un MAPA NUEVO. Por debajo
  // el mapa nuevo es un proyecto real de la plataforma (mismo pilar del
  // builder: lo del juego existe fuera del juego), así que su plaza se edita
  // y se ancla con proyecto_id como cualquier otra.
  // -------------------------------------------------------------------------

  /** Levanta el proyecto real que hará de mapa del portal. */
  const crearProyectoDePortal = async (req: Request, titulo: string): Promise<string> => {
    const pid = `PRY${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const slug = `${titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'portal'}-${Math.floor(Math.random() * 1000)}`;
    await db.execute(sql`
      INSERT INTO proyectos (id, titulo, slug, creador_user_id, publico, icono, created_by, updated_by)
      VALUES (${pid}, ${titulo}, ${slug}, ${req.user!.id}, false, ${iconoDeNombre(titulo)}, ${req.user!.id}, ${req.user!.id})
    `);
    return pid;
  };

  /**
   * POST /api/juego/agentes/:id/convertir-en-portal — una PERSONA gana la
   * CAPACIDAD de portal SIN cambiar de forma (aclaración de Eugenio): sigue
   * siendo el mismo muñeco, y su proyecto_id apunta al mapa nuevo.
   */
  app.post('/api/juego/agentes/:id/convertir-en-portal', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const a = await agenteMio(req, res);
      if (!a) return;
      if (a.proyecto_id) return res.status(400).json({ error: 'Ya es un portal.' });
      const proyectoId = await crearProyectoDePortal(req, a.nombre);
      await db.execute(sql`
        UPDATE game_agents SET proyecto_id = ${proyectoId},
               updated_at = now(), updated_by = ${req.user!.id}
        WHERE id = ${a.id}
      `);
      const fila = await db.execute(sql`SELECT * FROM game_agents WHERE id = ${a.id}`);
      res.json(fila.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // OJO: esta ruta va ANTES de /mundo/:id/convertir-en-portal — Express
  // prueba en orden y «semilla» encajaria en `:id` (ya paso con el retoque).
  /**
   * POST /api/juego/mundo/semilla/convertir-en-portal { seed_id, titulo } —
   * una PIEZA del pueblo (el camión camper, una casa, el pozo…) gana la
   * capacidad de portal sin perder su forma. El vínculo viaja en el retoque.
   */
  app.post('/api/juego/mundo/semilla/convertir-en-portal', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const seed = String(req.body?.seed_id || '');
      const titulo = String(req.body?.titulo || '').trim() || 'Portal';
      if (!seed) return res.status(400).json({ error: 'Falta la pieza.' });
      const ya = await db.execute(sql`
        SELECT portal_proyecto_id FROM game_world_overrides
        WHERE user_id = ${req.user!.id} AND seed_id = ${seed}
      `);
      if ((ya.rows[0] as any)?.portal_proyecto_id) return res.status(400).json({ error: 'Ya es un portal.' });
      const proyectoId = await crearProyectoDePortal(req, titulo);
      await db.execute(sql`
        INSERT INTO game_world_overrides (user_id, seed_id, eliminado, portal_proyecto_id)
        VALUES (${req.user!.id}, ${seed}, false, ${proyectoId})
        ON CONFLICT (user_id, seed_id) DO UPDATE SET
          portal_proyecto_id = ${proyectoId}, updated_at = now()
      `);
      res.json({ ok: true, portal_proyecto_id: proyectoId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/juego/mundo/:id/convertir-en-portal — un OBJETO gana la
   * capacidad de portal SIN perder su forma: mismo objeto, con
   * portal_proyecto_id apuntando a su mapa nuevo (migración 0036).
   */
  app.post('/api/juego/mundo/:id/convertir-en-portal', async (req: Request, res: Response) => {
    try {
      if (!requiereUsuario(req, res)) return;
      const r = await db.execute(sql`
        SELECT * FROM game_world_items
        WHERE id = ${req.params.id} AND user_id = ${req.user!.id} AND archived_at IS NULL
      `);
      const it = r.rows[0] as any;
      if (!it) return res.status(404).json({ error: 'Ese objeto no está en tu mundo.' });
      if (it.portal_proyecto_id) return res.status(400).json({ error: 'Ya es un portal.' });
      // Nunca una URL como título: mejor un genérico por tipo.
      const GENERICOS: Record<string, string> = {
        nota: 'Nota', imagen: 'Imagen', video: 'Vídeo', documento: 'Documento',
        enlace: 'Enlace', musica: 'Música', lienzo: 'Lienzo', mapa: 'Mapa', prop: 'Portal',
      };
      const crudo = String(it.nombre || '').trim();
      const titulo = crudo && !/^(https?:\/\/|www\.|youtu)/i.test(crudo)
        ? crudo : (GENERICOS[it.tipo] || 'Portal');

      const proyectoId = await crearProyectoDePortal(req, titulo);
      const fila = await db.execute(sql`
        UPDATE game_world_items SET portal_proyecto_id = ${proyectoId}, updated_at = now()
        WHERE id = ${it.id} AND user_id = ${req.user!.id}
        RETURNING *
      `);
      res.json(fila.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


}
