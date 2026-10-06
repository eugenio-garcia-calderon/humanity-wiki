import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { madresValidas, rolEnPagina, capacidades, quienDe, PROFUNDIDAD, puedeEditarPagina, type Quien } from './permisos.js';
import { paginaVisible } from './sitios.js';
import { bloquesDe } from './bloquesSql.js';
import { registrarColaboracion } from './colaboracion.js';

const nuevoId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 46656).toString(36).toUpperCase()}`;

/** El contenido que llega: una lista de bloques, sin pasarse de tamaño. */
function contenidoValido(x: unknown): any[] | null {
  if (!Array.isArray(x)) return null;
  if (JSON.stringify(x).length > 500_000) return null;
  return x;
}

/** Pone `contenido` dentro de cada bloque sincronizado `sincId` del árbol. */
function conContenido(arbol: any[], sincId: string, contenido: any[]): { arbol: any[]; cambio: boolean } {
  let cambio = false;
  const ir = (bs: any[]): any[] => bs.map(b => {
    if (!b || typeof b !== 'object') return b;
    if (b.tipo === 'sincronizado' && b.sincId === sincId) { cambio = true; return { ...b, bloques: contenido }; }
    return Array.isArray(b.bloques) ? { ...b, bloques: ir(b.bloques) } : b;
  });
  const nuevo = ir(Array.isArray(arbol) ? arbol : []);
  return { arbol: nuevo, cambio };
}

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
  // Presencia y avisos de guardado (2026-10-06): su propio fichero.
  registrarColaboracion(app, db);

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

  // ══ BLOQUES SINCRONIZADOS (2026-10-06, #22) ════════════════════════════
  // Ver la migración `0139_bloques_sincronizados.sql`. El contenido vive en
  // `bloques_sincronizados`; cada página que lo usa guarda una copia dentro
  // de su bloque `sincronizado`, que se reescribe aquí en cada guardado.

  /** Las páginas que llevan este bloque sincronizado. */
  const paginasCon = async (sincId: string) => (await db.execute(sql`
    SELECT w.id, w.title, w.config->'bloques' AS bloques FROM knowledge_windows w
    WHERE w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
      AND ${bloquesDe('w')} @> jsonb_build_array(jsonb_build_object('tipo', 'sincronizado', 'sincId', ${sincId}::text))
    ORDER BY w.created_at LIMIT 200
  `)).rows as any[];

  /** Crear uno: `POST /api/sincronizados` con `{ pagina, bloques }`. */
  app.post('/api/sincronizados', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const pagina = String(req.body?.pagina || '');
      const bloques = contenidoValido(req.body?.bloques ?? []);
      if (!bloques) return res.status(400).json({ error: 'El contenido no es válido.' });
      if (!pagina || !await puedeEditarPagina(db, quienDe(req), pagina)) return res.status(403).json({ error: 'No puedes editar esa página.' });
      const id = nuevoId('BS');
      await db.execute(sql`
        INSERT INTO bloques_sincronizados (id, creator_user_id, pagina_origen, bloques, updated_by)
        VALUES (${id}, ${req.user.id}, ${pagina}, ${JSON.stringify(bloques)}::jsonb, ${req.user.id})
      `);
      res.json({ id, version: 1 });
    } catch (e: any) { console.error('crear sincronizado:', e); res.status(500).json({ error: e.message }); }
  });

  /** Leerlo: quien lo creó, o quien puede ver alguna página que lo lleve.
   *  Dice también en qué páginas está (las que quien pregunta puede ver). */
  app.get('/api/sincronizados/:id', async (req: Request, res: Response) => {
    try {
      const s = (await db.execute(sql`SELECT * FROM bloques_sincronizados WHERE id = ${req.params.id}`)).rows[0] as any;
      if (!s) return res.status(404).json({ error: 'Ese bloque sincronizado ya no existe.' });
      const quien = quienDe(req);
      const visibles: { id: string; titulo: string }[] = [];
      for (const p of await paginasCon(s.id)) {
        if (visibles.length >= 50) break;
        if (await puedeVer(db, quien, p.id)) visibles.push({ id: p.id, titulo: p.title || 'Sin título' });
      }
      const esSuyo = !!quien && (quien.id === s.creator_user_id || quien.nivel >= 4);
      if (!esSuyo && !visibles.length) return res.status(404).json({ error: 'Ese bloque sincronizado ya no existe.' });
      res.json({ id: s.id, bloques: s.bloques || [], version: s.version, origen: s.pagina_origen, paginas: visibles });
    } catch (e: any) { console.error('leer sincronizado:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Guardarlo: `PUT /api/sincronizados/:id` con `{ bloques, version_base,
   * pagina }`. Puede quien lo creó o quien puede editar `pagina` (una página
   * que lo lleve). Si alguien lo guardó entretanto (`version_base` vieja),
   * 409 con lo que hay ahora: el editor decide. Al guardar, la copia de cada
   * página que lo lleva se pone al día.
   */
  app.put('/api/sincronizados/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const bloques = contenidoValido(req.body?.bloques);
      if (!bloques) return res.status(400).json({ error: 'El contenido no es válido.' });
      const pagina = String(req.body?.pagina || '');
      const s = (await db.execute(sql`SELECT * FROM bloques_sincronizados WHERE id = ${req.params.id}`)).rows[0] as any;
      if (!s) return res.status(404).json({ error: 'Ese bloque sincronizado ya no existe.' });
      const paginas = await paginasCon(s.id);
      const quien = quienDe(req);
      const esSuyo = quien!.id === s.creator_user_id || quien!.nivel >= 4;
      const desdeSuPagina = !!pagina && paginas.some(p => p.id === pagina) && await puedeEditarPagina(db, quien, pagina);
      if (!esSuyo && !desdeSuPagina) return res.status(403).json({ error: 'No puedes editar este bloque sincronizado.' });
      const base = Number(req.body?.version_base);
      const r = await db.execute(sql`
        UPDATE bloques_sincronizados SET bloques = ${JSON.stringify(bloques)}::jsonb, version = version + 1,
          updated_at = now(), updated_by = ${quien!.id}
        WHERE id = ${s.id} AND (${Number.isFinite(base) ? base : null}::int IS NULL OR version = ${Number.isFinite(base) ? base : 0})
        RETURNING version
      `);
      if (!r.rows.length) {
        const ahora = (await db.execute(sql`SELECT bloques, version FROM bloques_sincronizados WHERE id = ${s.id}`)).rows[0] as any;
        return res.status(409).json({ error: 'Otra página lo cambió mientras tanto.', bloques: ahora.bloques, version: ahora.version });
      }
      // La copia de cada página, al día. La página desde la que se guarda ya
      // la lleva (la acaba de guardar el editor): a ésa no se le sube la
      // versión, para que su próximo guardado no choque consigo mismo.
      for (const p of paginas) {
        const { arbol, cambio } = conContenido(p.bloques, s.id, bloques);
        if (!cambio) continue;
        await db.execute(sql`
          UPDATE knowledge_windows SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{bloques}', ${JSON.stringify(arbol)}::jsonb),
            version = version + ${p.id === pagina ? 0 : 1}, updated_at = now()
          WHERE id = ${p.id}
        `);
      }
      res.json({ version: (r.rows[0] as any).version, paginas: paginas.length });
    } catch (e: any) { console.error('guardar sincronizado:', e); res.status(500).json({ error: e.message }); }
  });
}
