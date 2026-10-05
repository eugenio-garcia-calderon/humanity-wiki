import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { madresValidas, rolEnPagina, capacidades, quienDe, PROFUNDIDAD, type Quien } from './permisos.js';
import { paginaVisible } from './sitios.js';

/** ¿Puede verla? Por su rol, o porque es pública (también la visibilidad
 *  heredada de una madre publicada, que es la de `sitios.ts`). */
async function puedeVer(db: any, quien: Quien, id: string) {
  return capacidades(await rolEnPagina(db, quien, id)).ver || await paginaVisible(db, id);
}

// ============================================================================
// LO QUE EL EDITOR DE PÁGINAS PIDE AL SERVIDOR, MÁS ALLÁ DE GUARDAR (2026-10-05)
// ============================================================================
// Carril «editorA» (Eugenio: el editor «al nivel de Notion»). Aquí vive lo que
// no es guardar la página —eso sigue en `PUT /api/windows/:id`—, sino lo que
// la rodea: la ruta de páginas madre para el bloque de migas de pan.

export function registrarEdicionPaginas(app: Express, db: any) {
  /**
   * LA RUTA DE PÁGINAS MADRE — `GET /api/paginas/:id/ruta` — para el bloque
   * «Migas de pan». De la más alta a la madre directa (sin la propia página).
   *
   * Sube por las MISMAS madres que la herencia de permisos (`madresValidas`):
   * la página que tiene un bloque «Página» apuntando a ésta, o la que contiene
   * la base de datos de su fila, siempre del mismo dueño. Una madre que quien
   * mira no puede ver corta la ruta ahí: enseñar su título sería contar algo
   * de una página privada.
   */
  app.get('/api/paginas/:id/ruta', async (req: Request, res: Response) => {
    try {
      const quien = quienDe(req);
      if (!await puedeVer(db, quien, req.params.id)) return res.status(404).json({ error: 'Esa página no existe o no es visible.' });
      const ruta: { id: string; titulo: string; icono: string | null }[] = [];
      const vistas = new Set<string>([req.params.id]);
      let actual = req.params.id;
      for (let n = 0; n < PROFUNDIDAD; n++) {
        const m = (await db.execute(sql`
          SELECT w.id, w.title, w.config->>'icono' AS icono FROM knowledge_windows w
          WHERE w.id IN (${madresValidas(sql`${actual}::text`)})
          ORDER BY w.created_at LIMIT 1
        `)).rows[0] as any;
        if (!m || vistas.has(m.id)) break;
        if (!await puedeVer(db, quien, m.id)) break;
        vistas.add(m.id);
        ruta.unshift({ id: m.id, titulo: m.title || 'Sin título', icono: m.icono || null });
        actual = m.id;
      }
      res.json({ ruta });
    } catch (e: any) { console.error('ruta de página:', e); res.status(500).json({ error: e.message }); }
  });
}
