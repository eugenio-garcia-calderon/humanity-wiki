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

// ============================================================================
// RENOMBRAR Y PONER ICONO (2026-08-20, petición de Eugenio: «permite cambiar
// el nombre e icono desde el menú […] mediante una ventanita pop up»).
// ============================================================================
// Una lista blanca, no una ruta por tipo. Son siete tablas que se renombran
// igual, y siete endpoints idénticos serían siete sitios donde arreglar el
// mismo fallo. El precio de hacerlo genérico es que los nombres de tabla y
// columna entran en el SQL como texto: por eso salen SOLO de este mapa fijo y
// nunca de lo que mande nadie — es la única forma en la que `sql.raw` es
// segura, y es la regla que ya sigue `ENTITY_TABLES` en el proyecto.
const RENOMBRABLES: Record<string, {
  tabla: string; nombre: string; dueno: string;
  /** Las páginas guardan su icono dentro de `config`, no en una columna: el
   *  editor tipo Notion lo hace así desde que se construyó. */
  iconoEnConfig?: boolean;
}> = {
  proyecto: { tabla: 'proyectos',        nombre: 'titulo', dueno: 'creador_user_id' },
  esquema:  { tabla: 'knowledge_graphs', nombre: 'title',  dueno: 'creator_user_id' },
  mapa:     { tabla: 'user_maps',        nombre: 'title',  dueno: 'creator_user_id' },
  producto: { tabla: 'products',         nombre: 'name',   dueno: 'created_by' },
  tarea:    { tabla: 'roadmap_items',    nombre: 'titulo', dueno: 'autor_user_id' },
  persona:  { tabla: 'game_agents',      nombre: 'nombre', dueno: 'user_id' },
  pagina:   { tabla: 'knowledge_windows', nombre: 'title', dueno: 'creator_user_id', iconoEnConfig: true },
};

export function registerMenuRoutes(app: Express, db: any) {
  /**
   * PUT /api/elemento/:tipo/:id   { nombre?, icono? }
   * Cambia el nombre y/o el icono de una cosa. Solo su dueño (o un
   * administrador). Mandar `icono: null` lo quita.
   */
  app.put('/api/elemento/:tipo/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const def = RENOMBRABLES[req.params.tipo];
      if (!def) return res.status(400).json({ error: 'Eso no se puede renombrar.' });

      const fila = await db.execute(sql`
        SELECT ${sql.raw(def.dueno)} AS dueno FROM ${sql.raw(def.tabla)}
        WHERE id = ${req.params.id} AND archived_at IS NULL
      `);
      if (!fila.rows.length) return res.status(404).json({ error: 'Eso ya no existe.' });
      const esAdmin = (req.user.roleLevel ?? 0) >= 4;
      if ((fila.rows[0] as any).dueno !== req.user.id && !esAdmin) {
        return res.status(403).json({ error: 'Eso no es tuyo.' });
      }

      const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : null;
      if (nombre !== null && !nombre) return res.status(400).json({ error: 'El nombre no puede quedar vacío.' });
      // Un emoji y poco más: si cupiera texto largo, el menú se rompería.
      const icono = req.body?.icono === null ? null
        : typeof req.body?.icono === 'string' ? req.body.icono.trim().slice(0, 8) : undefined;

      if (nombre !== null) {
        await db.execute(sql`
          UPDATE ${sql.raw(def.tabla)} SET ${sql.raw(def.nombre)} = ${nombre}, updated_at = now()
          WHERE id = ${req.params.id}
        `);
      }
      if (icono !== undefined) {
        if (def.iconoEnConfig) {
          await db.execute(sql`
            UPDATE ${sql.raw(def.tabla)}
            SET config = jsonb_set(coalesce(config, '{}'::jsonb), '{icono}', ${JSON.stringify(icono)}::jsonb),
                updated_at = now()
            WHERE id = ${req.params.id}
          `);
        } else {
          await db.execute(sql`
            UPDATE ${sql.raw(def.tabla)} SET icono = ${icono}, updated_at = now()
            WHERE id = ${req.params.id}
          `);
        }
      }
      res.json({ ok: true, nombre, icono });
    } catch (e: any) {
      console.error('renombrar elemento error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/menu', async (req: Request, res: Response) => {
    // Sin sesión el menú es solo herramientas: no hay proyectos «de nadie».
    if (!req.user) return res.json({ proyectos: [], productos: [], personas: [], organizaciones: [] });
    try {
      const yo = req.user.id;

      const [proyectos, productos, agentes, seguidos, orgs] = await Promise.all([
        db.execute(sql`
          SELECT p.id, p.titulo, p.slug, p.publico, p.icono
          FROM proyectos p
          WHERE p.creador_user_id = ${yo} AND p.archived_at IS NULL AND p.deleted_at IS NULL
          ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC
          LIMIT 50
        `),
        db.execute(sql`
          SELECT pr.id, pr.name, pr.price_cents, pr.currency, pr.kind, pr.icono
          FROM products pr
          WHERE pr.created_by = ${yo} AND pr.archived_at IS NULL AND pr.status = 'activo'
          ORDER BY pr.updated_at DESC NULLS LAST, pr.created_at DESC
          LIMIT 50
        `),
        // Las personas de TU mundo: los agentes que has creado (Anita, Javier…).
        // Son representaciones, no cuentas — la ficha lo dirá con todas las
        // letras para que nadie confunda una cosa con la otra.
        db.execute(sql`
          SELECT a.id, a.nombre, a.rol, a.proyecto_id, a.icono
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
          id: p.id, titulo: p.titulo, slug: p.slug, publico: !!p.publico, icono: p.icono,
        })),
        productos: (productos.rows as any[]).map(p => ({
          id: p.id, nombre: p.name, precio: p.price_cents, moneda: p.currency, tipo: p.kind, icono: p.icono,
        })),
        personas: [
          ...(seguidos.rows as any[]).map(u => ({
            id: u.id, nombre: u.display_name || u.name || 'Persona',
            avatar: u.avatar_url, real: true,
          })),
          ...(agentes.rows as any[]).map(a => ({
            id: a.id, nombre: a.nombre, rol: a.rol, real: false, icono: a.icono,
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
  // LA DIRECCIÓN DE UNA COSA DENTRO DEL ÁRBOL (2026-08-20, petición de Eugenio:
  // «que tenga una URL debajo que corresponda con el árbol de donde está
  // almacenada en la base de datos, por ejemplo humanity.wiki/eugeniolighthumanity/
  // proyectos/camion-camper/tareas/baño»).
  // ==========================================================================
  // La barra de direcciones de una ventana no enseña la ruta interna de React,
  // que no dice nada («/paginas/KWMSKJJ98PDQ»), sino DÓNDE VIVE la cosa: de
  // quién es, de qué proyecto cuelga y qué es. Eso hay que preguntárselo a la
  // base de datos, porque la ruta sola no lo sabe.
  //
  // EL NOMBRE DE USUARIO sale del correo: `eugenio@lighthumanity.org` da
  // `eugeniolighthumanity`. Es lo que Eugenio escribió en su ejemplo y evita
  // una columna nueva; el día que haya nombres de usuario de verdad, se cambia
  // esta función y ya está.
  const nombreDeUsuario = (email: string | null, id: string) => {
    if (!email) return id.toLowerCase();
    const [local, dominio] = email.split('@');
    const marca = (dominio || '').split('.')[0] || '';
    return `${local}${marca}`.replace(/[^a-z0-9]/gi, '').toLowerCase();
  };

  app.get('/api/ruta', async (req: Request, res: Response) => {
    try {
      const destino = String(req.query.d || '');
      const [camino, consulta] = destino.split('?');
      const partes = camino.split('/').filter(Boolean);
      const params = new URLSearchParams(consulta || '');

      // Segmento raíz: de quién es esto. Sin sesión no hay dueño que enseñar.
      const segmentos: Array<{ label: string; url?: string }> = [];
      if (req.user) {
        const u = await db.execute(sql`SELECT email FROM users WHERE id = ${req.user.id}`);
        segmentos.push({
          label: nombreDeUsuario((u.rows[0] as any)?.email ?? null, req.user.id),
          url: `/personas/${req.user.id}`,
        });
      }

      /** Añade proyecto + tipo cuando la cosa cuelga de un proyecto. */
      const bajoProyecto = async (proyectoId: string | null, tipo: string) => {
        if (!proyectoId) { segmentos.push({ label: tipo }); return; }
        const p = await db.execute(sql`SELECT titulo, slug FROM proyectos WHERE id = ${proyectoId}`);
        const fila = p.rows[0] as any;
        if (!fila) { segmentos.push({ label: tipo }); return; }
        segmentos.push({ label: 'proyectos', url: '/proyectos' });
        segmentos.push({ label: fila.slug, url: `/proyectos/${fila.slug}` });
        segmentos.push({ label: tipo });
      };

      const trozo = (t: string) =>
        (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'sin-nombre';

      const seccion = partes[0] || '';
      const resto = partes[1] || '';

      if (seccion === 'paginas' && resto) {
        const w = await db.execute(sql`
          SELECT title, proyecto_id FROM knowledge_windows WHERE id = ${resto}
        `);
        const f = w.rows[0] as any;
        await bajoProyecto(f?.proyecto_id ?? null, 'paginas');
        segmentos.push({ label: trozo(f?.title || resto), url: destino });
      } else if (seccion === 'esquemas' && resto) {
        const g = await db.execute(sql`
          SELECT title, slug, proyecto_id FROM knowledge_graphs WHERE slug = ${resto} OR id = ${resto}
        `);
        const f = g.rows[0] as any;
        await bajoProyecto(f?.proyecto_id ?? null, 'esquemas');
        segmentos.push({ label: f?.slug || trozo(resto), url: destino });
      } else if (seccion === 'mapas' && resto) {
        const m = await db.execute(sql`
          SELECT title, slug, proyecto_id FROM user_maps WHERE slug = ${resto} OR id = ${resto}
        `);
        const f = m.rows[0] as any;
        await bajoProyecto(f?.proyecto_id ?? null, 'mapas');
        segmentos.push({ label: f?.slug || trozo(resto), url: destino });
      } else if (seccion === 'proyectos' && resto) {
        segmentos.push({ label: 'proyectos', url: '/proyectos' });
        segmentos.push({ label: resto, url: destino });
      } else if (seccion === 'tareas' && params.get('tarea')) {
        const t = await db.execute(sql`
          SELECT titulo, proyecto_id FROM roadmap_items WHERE id = ${params.get('tarea')}
        `);
        const f = t.rows[0] as any;
        await bajoProyecto(f?.proyecto_id ?? null, 'tareas');
        segmentos.push({ label: trozo(f?.titulo || ''), url: destino });
      } else if (seccion === 'personas' && resto) {
        // Un perfil ES la raíz de esa persona: no cuelga de nada tuyo.
        const u = await db.execute(sql`SELECT email FROM users WHERE id = ${resto}`);
        segmentos.length = 0;
        segmentos.push({
          label: nombreDeUsuario((u.rows[0] as any)?.email ?? null, resto),
          url: destino,
        });
      } else if (seccion) {
        // Una herramienta abierta sin nada dentro: «tú / esquemas».
        segmentos.push({ label: seccion, url: destino });
      }

      res.json({ segmentos });
    } catch (e: any) {
      console.error('ruta error:', e);
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
          SELECT id, titulo, estado, icono FROM roadmap_items
          WHERE proyecto_id = ${pid} AND archived_at IS NULL
          ORDER BY orden, created_at LIMIT 100
        `),
        db.execute(sql`
          SELECT id, title, config->>'icono' AS icono FROM knowledge_windows
          WHERE proyecto_id = ${pid} AND kind = 'pagina'
            AND archived_at IS NULL AND deleted_at IS NULL
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, title, slug, icono FROM knowledge_graphs
          WHERE proyecto_id = ${pid} AND archived_at IS NULL AND deleted_at IS NULL
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, title, slug, icono FROM user_maps
          WHERE proyecto_id = ${pid} AND archived_at IS NULL AND deleted_at IS NULL
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, name, icono FROM products
          WHERE proyecto_id = ${pid} AND archived_at IS NULL AND status = 'activo'
          ORDER BY updated_at DESC NULLS LAST LIMIT 100
        `),
        db.execute(sql`
          SELECT id, nombre, rol, icono FROM game_agents
          WHERE proyecto_id = ${pid} AND tipo = 'persona' AND archived_at IS NULL
          ORDER BY nombre LIMIT 100
        `),
      ]);

      const ramas: any[] = [];
      // `tipo` es lo que le dice al menú qué se puede renombrar y contra qué
      // tabla. Sin él, el menú tendría que adivinarlo por la ruta.
      const rama = (clave: string, label: string, tipo: string, hijos: any[]) => {
        if (hijos.length) ramas.push({ clave, label, tipo, hijos });
      };
      rama('tareas', 'Tareas', 'tarea', (tareas.rows as any[]).map(t => ({
        id: t.id, label: t.titulo, icono: t.icono, destino: `/tareas?tarea=${encodeURIComponent(t.id)}`, estado: t.estado,
      })));
      rama('paginas', 'Páginas', 'pagina', (paginas.rows as any[]).map(w => ({
        id: w.id, label: w.title, icono: w.icono, destino: `/paginas/${w.id}`,
      })));
      rama('esquemas', 'Esquemas', 'esquema', (esquemas.rows as any[]).map(g => ({
        id: g.id, label: g.title, icono: g.icono, destino: `/esquemas/${g.slug}`,
      })));
      rama('mapas', 'Mapas', 'mapa', (mapas.rows as any[]).map(m => ({
        id: m.id, label: m.title, icono: m.icono, destino: `/mapas/${m.slug}`,
      })));
      rama('productos', 'Productos', 'producto', (productos.rows as any[]).map(x => ({
        id: x.id, label: x.name, icono: x.icono, destino: `/mercado?producto=${encodeURIComponent(x.id)}`,
      })));
      rama('personas', 'Personas', 'persona', (personas.rows as any[]).map(a2 => ({
        id: a2.id, label: a2.nombre, icono: a2.icono, destino: `/juego?agente=${encodeURIComponent(a2.id)}`, rol: a2.rol,
      })));

      res.json({ ramas });
    } catch (e: any) {
      console.error('arbol proyecto error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
