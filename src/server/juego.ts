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
}
