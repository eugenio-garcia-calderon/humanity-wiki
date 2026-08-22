import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// EL ESTADO DE LAS HERRAMIENTAS — `/api/herramientas` (2026-08-22)
// ============================================================================
// Eugenio: «crea una página que sea de información sobre las herramientas… y
// haz que esa página sea el dashboard de información y seguimiento de cómo
// avanzan las herramientas».
//
// ── POR QUÉ ESTO ES UNA RUTA Y NO UN TEXTO EN LA PANTALLA ───────────────────
// Un panel de seguimiento escrito a mano miente a los dos días. Dice «en
// marcha» de algo que se terminó, y «funciona» de algo que se rompió, y nadie
// se entera porque nadie vuelve a leerlo.
//
// Así que aquí se MIDE. Cuántas cosas hay de cada tipo, ahora mismo, contra la
// base de datos. Si mañana alguien rompe las tablas, este panel lo dice solo.
//
// Lo que NO se puede medir —para qué sirve una herramienta, qué se decidió, a
// dónde va— se escribe a mano en el cliente y lleva fecha. Las dos cosas
// separadas y sin mezclarse: una es un hecho de hoy y la otra es una
// intención.

export function registerHerramientasRoutes(app: Express, db: any) {
  /**
   * Cuántas cosas hay de cada herramienta, y qué notas del hormiguero le
   * tocan. Sin sesión: es información sobre la plataforma, no sobre nadie.
   *
   * Las cuentas son GLOBALES, no del usuario que pregunta. Es un panel de
   * cómo va la plataforma, no de lo que uno tiene; enseñar «0 páginas» a
   * alguien recién llegado diría que la herramienta no se usa, y lo que no
   * hay son sus páginas.
   */
  app.get('/api/herramientas', async (_req: Request, res: Response) => {
    try {
      // Una sola consulta con subconsultas en vez de doce viajes. Cada
      // `COALESCE` es para que una tabla vacía cuente 0 y no rompa la fila
      // entera.
      const r = await db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM knowledge_windows WHERE kind = 'pagina' AND archived_at IS NULL AND deleted_at IS NULL) AS paginas,
          (SELECT COUNT(*) FROM knowledge_windows WHERE kind = 'pagina' AND publico = true AND slug IS NOT NULL AND archived_at IS NULL) AS paginas_publicas,
          (SELECT COUNT(*) FROM bd_tablas WHERE archived_at IS NULL) AS tablas,
          (SELECT COUNT(*) FROM products WHERE archived_at IS NULL) AS productos,
          (SELECT COUNT(*) FROM pedidos) AS pedidos,
          (SELECT COUNT(*) FROM proyectos WHERE archived_at IS NULL AND deleted_at IS NULL) AS proyectos,
          -- Las tareas viven en roadmap_items, no en una tabla llamada
          -- tareas. Lo descubri al escribir esto: la tabla que el nombre
          -- sugiere no existe. Queda escrito para quien busque igual.
          (SELECT COUNT(*) FROM roadmap_items) AS tareas,
          (SELECT COUNT(*) FROM users WHERE handle IS NOT NULL) AS espacios,
          (SELECT COUNT(*) FROM users) AS personas
      `);
      const c = (r.rows[0] || {}) as any;
      const n = (k: string) => Number(c[k] ?? 0);

      // Las notas abiertas del hormiguero. Se devuelven enteras y la pantalla
      // decide a qué herramienta pertenece cada una: el reparto es una regla
      // de presentación y cambiará más veces que esta consulta.
      const notas = await db.execute(sql`
        SELECT id, titulo, clase, estado, created_at
        FROM incidencias
        WHERE estado IN ('esperando', 'bloqueada', 'en_curso')
          AND archived_at IS NULL
        ORDER BY created_at DESC
        LIMIT 120
      `);

      res.json({
        medido_en: new Date().toISOString(),
        cuentas: {
          paginas: n('paginas'),
          paginas_publicas: n('paginas_publicas'),
          tablas: n('tablas'),
          productos: n('productos'),
          pedidos: n('pedidos'),
          proyectos: n('proyectos'),
          tareas: n('tareas'),
          espacios: n('espacios'),
          personas: n('personas'),
        },
        notas: notas.rows,
      });
    } catch (e: any) {
      console.error('herramientas:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
