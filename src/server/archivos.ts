import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// ARCHIVOS (2026-08-20, petición de Eugenio: «que aparezcan ahí todos los
// archivos de todos los tipos que sean del usuario, todos los documentos,
// notas, imágenes… y poder abrirlos y editarlos. Tiene que estar sincronizado
// con lo que se crea en el mundo 3D y en los grafos y todo»).
// ============================================================================
// Tus cosas están repartidas por tres sitios, porque cada uno nació para algo
// distinto y eso está bien:
//
//   · `knowledge_windows` — lo que creas en los lienzos y en el chat
//     (documentos, notas, imágenes, vídeos, tablas, tareas…).
//   · `publications`      — lo que publicas en el muro.
//   · `game_world_items`  — lo que plantas en el MUNDO 3D (notas pegadas con
//     ⌘V, fotos, vídeos, música…).
//
// Esta ruta NO mueve nada de sitio: lee las tres y devuelve una sola lista
// ordenada por fecha. Así «Archivos» está sincronizado por construcción — no
// hay copia que mantener al día, se lee siempre la fuente. Cada fila dice
// dónde se abre (`abrir`), que es lo que convierte la lista en algo usable.
//
// SIEMPRE es lo del usuario que pregunta: aquí no hay listado público.

/** Dónde vive cada cosa, para que la ficha sepa a dónde llevarte. */
type Origen = 'lienzo' | 'paginas' | 'muro' | 'mundo3d';

export function registerArchivosRoutes(app: Express, db: any) {
  app.get('/api/archivos', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para ver tus archivos.' });
    try {
      const yo = req.user.id;
      const q = (req.query.q as string || '').trim();
      const like = q ? `%${q}%` : null;

      // 1) Lo de los lienzos y el chat. `LEFT JOIN` al grafo: un documento
      // nacido en el chat no cuelga de ningún lienzo y también es tuyo.
      const ventanas = await db.execute(sql`
        SELECT w.id, w.title, w.kind, w.config, w.created_at, w.updated_at, w.publico,
               g.slug AS grafo_slug, g.title AS grafo_titulo,
               p.titulo AS proyecto_titulo, p.slug AS proyecto_slug
        FROM knowledge_windows w
        LEFT JOIN graph_windows gw ON gw.window_id = w.id
        LEFT JOIN knowledge_graphs g ON g.id = gw.graph_id AND g.archived_at IS NULL AND g.deleted_at IS NULL
        LEFT JOIN proyectos p ON p.id = w.proyecto_id AND p.archived_at IS NULL
        WHERE w.creator_user_id = ${yo}
          AND w.archived_at IS NULL AND w.deleted_at IS NULL
          AND (${like}::text IS NULL OR w.title ILIKE ${like} OR w.config->>'body' ILIKE ${like})
        ORDER BY w.updated_at DESC NULLS LAST, w.created_at DESC
        LIMIT 300
      `);

      // 2) El muro.
      const muro = await db.execute(sql`
        SELECT p.id, p.title, p.body, p.created_at, p.updated_at, p.visibility
        FROM publications p
        WHERE p.author_user_id = ${yo}
          AND p.archived_at IS NULL AND p.deleted_at IS NULL
          AND (${like}::text IS NULL OR p.title ILIKE ${like} OR p.body ILIKE ${like})
        ORDER BY p.created_at DESC
        LIMIT 300
      `);

      // 3) El mundo 3D. Se dejan fuera los `prop` (mobiliario: un banco o un
      // árbol no es un archivo de nadie) y todo lo que no lleva contenido.
      const mundo = await db.execute(sql`
        SELECT i.id, i.tipo, i.nombre, i.texto, i.url, i.created_at, i.updated_at,
               i.proyecto_id, p.titulo AS proyecto_titulo, p.slug AS proyecto_slug
        FROM game_world_items i
        LEFT JOIN proyectos p ON p.id = i.proyecto_id AND p.archived_at IS NULL
        WHERE i.user_id = ${yo}
          AND i.archived_at IS NULL
          AND i.tipo NOT IN ('prop')
          AND (i.texto IS NOT NULL OR i.url IS NOT NULL OR i.nombre IS NOT NULL)
          AND (${like}::text IS NULL OR coalesce(i.nombre,'') ILIKE ${like} OR coalesce(i.texto,'') ILIKE ${like})
        ORDER BY i.updated_at DESC NULLS LAST, i.created_at DESC
        LIMIT 300
      `);

      const recorta = (t: string | null, n = 160) =>
        (t || '').replace(/\s+/g, ' ').trim().slice(0, n) || null;

      const salida = [
        ...(ventanas.rows as any[]).map(w => {
          const cfg = w.config || {};
          // DE DÓNDE VIENE DE VERDAD (2026-08-20). Todas las ventanas se
          // marcaban «Esquemas», así que una página de un proyecto salía
          // atribuida a un esquema al que no pertenece. Una ventana está en un
          // esquema solo si de verdad cuelga de uno; una página es una página.
          const esPagina = w.kind === 'pagina' || w.kind === 'documento';
          const origen: Origen = w.grafo_slug ? 'lienzo' : esPagina ? 'paginas' : 'lienzo';
          return {
            id: w.id,
            origen,
            tipo: w.kind,
            titulo: w.title || 'Sin título',
            resumen: recorta(cfg.body || cfg.descripcion || null),
            imagen: cfg.image_url || null,
            url: cfg.url || null,
            fecha: w.updated_at || w.created_at,
            privado: w.publico === false,
            // Una ventana con lienzo se abre EN su lienzo (contexto); una
            // suelta, en su ficha.
            abrir: w.grafo_slug ? `/esquemas/${w.grafo_slug}`
              : esPagina ? `/paginas/${w.id}`
              : `/explorar?ventana=${w.id}`,
            // El contexto es dónde vive: su esquema, o su proyecto.
            contexto: w.grafo_titulo || w.proyecto_titulo || null,
          };
        }),
        ...(muro.rows as any[]).map(p => ({
          id: p.id,
          origen: 'muro' as Origen,
          tipo: 'publicacion',
          titulo: p.title || 'Publicación',
          resumen: recorta(p.body),
          imagen: null,
          url: null,
          fecha: p.updated_at || p.created_at,
          privado: p.visibility === 'privada',
          abrir: `/muro?publicacion=${p.id}`,
          contexto: 'Muro',
        })),
        ...(mundo.rows as any[]).map(i => ({
          id: i.id,
          origen: 'mundo3d' as Origen,
          tipo: i.tipo,
          titulo: i.nombre || recorta(i.texto, 60) || `${i.tipo} en el mundo`,
          resumen: recorta(i.texto),
          imagen: i.tipo === 'imagen' ? i.url : null,
          url: i.url || null,
          fecha: i.updated_at || i.created_at,
          privado: true,
          // Se abre EN el mundo, centrado en la pieza: es donde vive.
          abrir: `/juego?item=${i.id}`,
          contexto: i.proyecto_titulo || 'Mundo 3D',
        })),
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      res.json(salida);
    } catch (e: any) {
      console.error('[archivos]', e);
      res.status(500).json({ error: e.message });
    }
  });
}
