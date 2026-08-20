import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// EL MENÚ LATERAL (2026-08-20, petición de Eugenio: «divide el menú izquierdo
// en 4 secciones: los proyectos, las herramientas, los productos/servicios y
// las personas»).
// ============================================================================
// La plataforma se ordena en cuatro cosas y solo cuatro:
//
//   1. PROYECTOS       — dónde pasa el trabajo. Todo lo demás cuelga de aquí.
//   2. HERRAMIENTAS    — con qué se trabaja (páginas, esquemas, mapas…).
//   3. PRODUCTOS       — lo que un proyecto ofrece al mundo.
//   4. PERSONAS        — quién está dentro.
//
// Las HERRAMIENTAS no salen de aquí: son fijas, las mismas para todos, y viven
// en el cliente. Pedirle al servidor una lista que nunca cambia sería un viaje
// de ida y vuelta por nada.
//
// Lo que sí sale de aquí es lo que depende de ti: tus proyectos, tus productos
// y tu gente. Se sirve POCO Y PLANO a propósito: el menú solo necesita saber
// QUÉ hay, no lo que hay dentro. Lo de dentro de un proyecto se pide al
// desplegarlo (`/api/proyectos/:id/arbol`, Fase 2), porque un árbol entero de
// todos los proyectos sería una consulta enorme para enseñar cinco líneas.

export function registerMenuRoutes(app: Express, db: any) {
  app.get('/api/menu', async (req: Request, res: Response) => {
    // Sin sesión el menú es solo herramientas: no hay proyectos «de nadie».
    if (!req.user) return res.json({ proyectos: [], productos: [], personas: [], organizaciones: [] });
    try {
      const yo = req.user.id;

      const [proyectos, productos, agentes, seguidos, orgs] = await Promise.all([
        db.execute(sql`
          SELECT p.id, p.titulo, p.slug, p.publico
          FROM proyectos p
          WHERE p.creador_user_id = ${yo} AND p.archived_at IS NULL AND p.deleted_at IS NULL
          ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
          LIMIT 50
        `),
        db.execute(sql`
          SELECT pr.id, pr.name, pr.price_cents, pr.currency, pr.kind
          FROM products pr
          WHERE pr.created_by = ${yo} AND pr.archived_at IS NULL AND pr.status = 'activo'
          ORDER BY pr.updated_at DESC NULLS LAST, pr.created_at DESC
          LIMIT 50
        `),
        // Las personas de TU mundo: los agentes que has creado (Anita, Javier…).
        // Son representaciones, no cuentas — la ficha lo dirá con todas las
        // letras para que nadie confunda una cosa con la otra.
        db.execute(sql`
          SELECT a.id, a.nombre, a.rol, a.proyecto_id
          FROM game_agents a
          WHERE a.user_id = ${yo} AND a.tipo = 'persona' AND a.archived_at IS NULL
          ORDER BY a.nombre
          LIMIT 50
        `),
        // Y las personas de verdad a las que sigues.
        db.execute(sql`
          SELECT u.id, u.display_name, u.name, u.avatar_url
          FROM follows f
          JOIN users u ON u.id = f.entity_id AND u.archived_at IS NULL
          WHERE f.follower_user_id = ${yo} AND f.entity_type = 'users'
          ORDER BY coalesce(u.display_name, u.name)
          LIMIT 50
        `),
        db.execute(sql`
          SELECT o.id, o.name
          FROM organizations o
          JOIN users u ON u.organization_id = o.id
          WHERE u.id = ${yo} AND o.archived_at IS NULL
        `),
      ]);

      res.json({
        proyectos: (proyectos.rows as any[]).map(p => ({
          id: p.id, titulo: p.titulo, slug: p.slug, publico: !!p.publico,
        })),
        productos: (productos.rows as any[]).map(p => ({
          id: p.id, nombre: p.name, precio: p.price_cents, moneda: p.currency, tipo: p.kind,
        })),
        personas: [
          ...(seguidos.rows as any[]).map(u => ({
            id: u.id, nombre: u.display_name || u.name || 'Persona',
            avatar: u.avatar_url, real: true,
          })),
          ...(agentes.rows as any[]).map(a => ({
            id: a.id, nombre: a.nombre, rol: a.rol, real: false,
          })),
        ],
        organizaciones: (orgs.rows as any[]).map(o => ({ id: o.id, nombre: o.name })),
      });
    } catch (e: any) {
      console.error('menu error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================================================
  // LO QUE HAY DENTRO DE UN PROYECTO
  // ==========================================================================
  // Se pide al DESPLEGAR el proyecto en el menú, no antes: el árbol entero de
  // todos los proyectos a la vez serían seis consultas por proyecto para
  // enseñar cinco líneas. Así se paga solo por lo que abres.
  //
  // Devuelve las ramas en el mismo formato que las pinta el menú, y las vacías
  // NO se devuelven: un proyecto sin mapas no tiene por qué enseñar «Mapas 0».
  app.get('/api/proyectos/:id/arbol', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    try {
      const yo = req.user.id;
      const pid = req.params.id;

      // El proyecto tiene que ser tuyo o público: el árbol enseña lo de dentro.
      const p = await db.execute(sql`
        SELECT creador_user_id, publico FROM proyectos
        WHERE id = ${pid} AND archived_at IS NULL AND deleted_at IS NULL
      `);
      if (!p.rows.length) return res.status(404).json({ error: 'Ese proyecto no existe.' });
      const fila = p.rows[0] as any;
      const mio = fila.creador_user_id === yo || (req.user.roleLevel ?? 0) >= 4;
      if (!mio && !fila.publico) return res.status(403).json({ error: 'Ese proyecto es privado.' });

      const [tareas, paginas, esquemas, mapas, productos, personas] = await Promise.all([
        db.execute(sql`
          SELECT id, titulo, estado FROM roadmap_items
          WHERE proyecto_id = ${pid} AND archived_at IS NULL
          ORDER BY orden, created_at LIMIT 100
        `),
        db.execute(sql`
          SELECT id, title FROM knowledge_windows
          WHERE proyecto_id = ${pid} AND kind = 'pagina'
            AND archived_at IS NULL AND deleted_at IS NULL
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, title, slug FROM knowledge_graphs
          WHERE proyecto_id = ${pid} AND archived_at IS NULL AND deleted_at IS NULL
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, title, slug FROM user_maps
          WHERE proyecto_id = ${pid} AND archived_at IS NULL AND deleted_at IS NULL
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, name FROM products
          WHERE proyecto_id = ${pid} AND archived_at IS NULL AND status = 'activo'
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, nombre, rol FROM game_agents
          WHERE proyecto_id = ${pid} AND tipo = 'persona' AND archived_at IS NULL
          ORDER BY nombre LIMIT 100
        `),
      ]);

      const ramas: any[] = [];
      const rama = (clave: string, label: string, hijos: any[]) => {
        if (hijos.length) ramas.push({ clave, label, hijos });
      };
      rama('tareas', 'Tareas', (tareas.rows as any[]).map(t => ({
        id: t.id, label: t.titulo, destino: `/tareas?tarea=${encodeURIComponent(t.id)}`, estado: t.estado,
      })));
      rama('paginas', 'Páginas', (paginas.rows as any[]).map(w => ({
        id: w.id, label: w.title, destino: `/paginas/${w.id}`,
      })));
      rama('esquemas', 'Esquemas', (esquemas.rows as any[]).map(g => ({
        id: g.id, label: g.title, destino: `/esquemas/${g.slug}`,
      })));
      rama('mapas', 'Mapas', (mapas.rows as any[]).map(m => ({
        id: m.id, label: m.title, destino: `/mapas/${m.slug}`,
      })));
      rama('productos', 'Productos', (productos.rows as any[]).map(x => ({
        id: x.id, label: x.name, destino: `/mercado?producto=${encodeURIComponent(x.id)}`,
      })));
      rama('personas', 'Personas', (personas.rows as any[]).map(a2 => ({
        id: a2.id, label: a2.nombre, destino: `/juego?agente=${encodeURIComponent(a2.id)}`, rol: a2.rol,
      })));

      res.json({ ramas });
    } catch (e: any) {
      console.error('arbol proyecto error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
