// ============================================================================
// EL BUSCADOR DE UN SITIO PUBLICADO (2026-10-18, Wikiproducts W2, plan 3.8)
// ============================================================================
// El buscador de la plataforma busca en TODO humanity.wiki y el menú de un
// sitio publicado no tenía ninguno. Wikiproducts es una enciclopedia de
// productos: buscar es lo primero que se hace en ella.
//
// `GET /api/sitio/buscar?sitio=<página raíz>&q=<texto>` busca SÓLO dentro del
// sitio: la página raíz, sus subpáginas y las filas de las bases de datos que
// enseña (cada fila es una página), por su título, por los valores de sus
// columnas (marca, modelo, código de barras…) y por el texto de sus bloques.
//
// ── LO QUE NO SE ENSEÑA NO SE ENCUENTRA ────────────────────────────────────
// Se baja desde la raíz por el mismo camino que el sitemap, pero sin entrar en
// lo que es de miembros (`sitio_restricciones`: la página entera o el bloque),
// y no se mira dentro de las columnas que su autor ocultó siempre. Cada
// resultado se vuelve a comprobar con `paginaVisible`. Una búsqueda que
// encuentra lo que la página esconde es una forma de leerlo.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bloquesDe } from './bloquesSql';
import { paginaVisible, descripcionDe } from './sitios';
import { filtrarBloques } from './miembros.js';

/** Cuántos niveles de página dentro de página (como `sitios.ts`). */
const PROFUNDIDAD = 8;
const MAX_RESULTADOS = 30;

/** Minúsculas y sin acentos, en SQL: «Batería» encuentra «bateria». Sin la
 *  extensión `unaccent`, que pide permisos de superusuario (ver 0141). */
const plano = (x: any) => sql`translate(lower(${x}), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc')`;
const planoJs = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Todos los `texto` de un árbol de bloques. */
function textos(config: any): string[] {
  const out: string[] = [];
  const recorre = (l: any) => { for (const b of Array.isArray(l) ? l : []) {
    if (typeof b?.texto === 'string') out.push(b.texto);
    recorre(b?.bloques);
    if (Array.isArray(b?.columnas)) for (const c of b.columnas) recorre(c?.bloques);
  } };
  recorre(config?.bloques);
  if (typeof config?.subtitulo === 'string') out.push(config.subtitulo);
  return out;
}

export function registrarBuscadorSitio(app: Express, db: any) {
  app.get('/api/sitio/buscar', async (req: Request, res: Response) => {
    try {
      const raiz = String(req.query.sitio || '').trim();
      const q = planoJs(String(req.query.q || '').replace(/\s+/g, ' ').trim()).slice(0, 100);
      if (!raiz) return res.status(400).json({ error: 'Falta el sitio en el que buscar.' });
      if (q.length < 2) return res.json({ q, resultados: [] });
      if (!(await paginaVisible(db, raiz))) return res.status(404).json({ error: 'Ese sitio no existe o no está publicado.' });

      // `%` y `_` del texto buscado son letras, no comodines.
      const patron = `%${q.replace(/[\\%_]/g, m => '\\' + m)}%`;
      const r = await db.execute(sql`
        WITH RECURSIVE baja(id, n) AS (
          SELECT ${raiz}::text, 0
          UNION
          SELECT h.hijo, b.n + 1 FROM baja b
          JOIN knowledge_windows w ON w.id = b.id
          CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
          CROSS JOIN LATERAL (
            SELECT f.pagina_id AS hijo FROM bd_filas f
            WHERE blq->>'tipo' = 'basedatos' AND f.tabla_id = blq->>'tabla_id'
              AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.pagina_id IS NOT NULL
            UNION ALL
            SELECT blq->>'entityId' WHERE blq->>'tipo' = 'subpagina' AND blq->>'entityId' IS NOT NULL
          ) h
          WHERE b.n < ${PROFUNDIDAD}
            AND NOT EXISTS (
              SELECT 1 FROM sitio_restricciones rs
              WHERE rs.pagina_id = w.id AND (rs.bloque_id = '' OR rs.bloque_id = blq->>'id')
            )
        )
        SELECT DISTINCT ON (w.id) w.id, w.title, w.config, t.titulo AS tabla,
          (${plano(sql`w.title`)} LIKE ${patron}) AS en_titulo,
          EXISTS (
            SELECT 1 FROM jsonb_each_text(COALESCE(f.valores, '{}'::jsonb)) kv
            JOIN bd_columnas c ON c.id = kv.key AND c.archived_at IS NULL
            WHERE (c.config->>'visibilidad') IS DISTINCT FROM 'nunca'
              AND ${plano(sql`kv.value`)} LIKE ${patron}
          ) AS en_valores
        FROM baja b
        JOIN knowledge_windows w ON w.id = b.id AND w.kind = 'pagina'
          AND w.deleted_at IS NULL AND w.archived_at IS NULL
        LEFT JOIN bd_filas f ON f.pagina_id = w.id AND f.deleted_at IS NULL AND f.archived_at IS NULL
        LEFT JOIN bd_tablas t ON t.id = f.tabla_id
        WHERE ${plano(sql`w.title`)} LIKE ${patron}
          OR EXISTS (
            SELECT 1 FROM jsonb_each_text(COALESCE(f.valores, '{}'::jsonb)) kv
            JOIN bd_columnas c ON c.id = kv.key AND c.archived_at IS NULL
            WHERE (c.config->>'visibilidad') IS DISTINCT FROM 'nunca'
              AND ${plano(sql`kv.value`)} LIKE ${patron}
          )
          OR EXISTS (
            SELECT 1 FROM jsonb_path_query(w.config, 'lax $.**.texto') tx
            WHERE jsonb_typeof(tx) = 'string' AND ${plano(sql`tx #>> '{}'`)} LIKE ${patron}
          )
        ORDER BY w.id
        LIMIT 200
      `);

      // Los que lo dicen en el título, primero; luego por orden alfabético.
      const filas = (r.rows as any[]).sort((a, b) =>
        Number(b.en_titulo) - Number(a.en_titulo) || String(a.title || '').localeCompare(String(b.title || ''), 'es'));
      const resultados: any[] = [];
      for (const x of filas) {
        if (resultados.length >= MAX_RESULTADOS) break;
        if (!(await paginaVisible(db, x.id))) continue;
        // El texto, sin los bloques de miembros: si sólo coincidía ahí, no
        // es un resultado para quien no es miembro.
        const { config } = await filtrarBloques(db, x.id, x.config, null);
        if (!x.en_titulo && !x.en_valores && !textos(config).some(t => planoJs(t).includes(q))) continue;
        resultados.push({
          id: x.id,
          titulo: String(x.title || '').trim() || 'Sin título',
          descripcion: descripcionDe(config),
          tabla: x.tabla || null,
          portada: config?.portada || null,
        });
      }
      // Lo mismo para cualquiera que pregunte: se puede guardar un poco.
      res.set('Cache-Control', 'public, max-age=60');
      res.json({ q, resultados, mas: filas.length > resultados.length });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
