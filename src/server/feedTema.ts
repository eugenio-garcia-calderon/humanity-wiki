import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { TEMAS_SERVIDOR, ES_TEMA } from '../utils/palabrasObjetivos';

// ============================================================================
// EL FEED DE UN TEMA: TODO LO TUYO, O TODO LO PÚBLICO, SOBRE «MOVILIDAD» (2026-10-05)
// ============================================================================
// Eugenio: «cuando pinches en una de esas temáticas, que puedas ver todo tu
// contenido que habla sobre movilidad, ordenado en bases de datos, en
// páginas… una landing page de todo lo que tienes sobre movilidad. Y luego un
// botón de contenido universal: todo lo público de humanity.wiki sobre ese
// tema».
//
// ── CÓMO SE SABE QUE ALGO «HABLA DE» UN TEMA ────────────────────────────────
// No existe ninguna columna que una una página con un tema (ver
// `objetivos.ts`). Hay dos pistas, y se usan las dos:
//   1. CLASIFICADO: la persona (o un administrador) lo colgó de un subtema de
//      ese tema (`subtema_contenido`), o la publicación se enlazó al objetivo
//      al crearla (`publication_links`). Es la señal fuerte: va primero y se
//      marca como tal.
//   2. POR PALABRAS: el título o el cuerpo contienen las raíces del tema
//      («hidric», «riego»…) o el nombre de alguno de sus subtemas. Es la
//      misma lista que usa Explorar en el navegador (`palabrasObjetivos.ts`),
//      aplicada aquí en SQL, sin tildes.
// Cada tarjeta dice cuál de las dos fue, para que nadie tome una
// coincidencia de palabras por una clasificación que nadie hizo.
//
// ── DOS ÁMBITOS, DOS PREGUNTAS DISTINTAS ────────────────────────────────────
//   mio   = lo mío, público o privado (hace falta sesión). Incluye lo que no
//           se publica nunca: filas de bases de datos, personas de tu mundo.
//   todos = lo público de toda la plataforma, de cualquiera. Sin sesión vale.
// Se filtran los bloqueos entre personas, como en el resto de la plataforma.
//
// ── SECCIONES, CON SU TOTAL Y SU «VER MÁS» ──────────────────────────────────
// La respuesta llega por secciones (páginas, bases de datos, publicaciones,
// carpetas, esquemas y mapas, personas, de fuera), cada una con un total y
// los primeros N. `?seccion=&offset=` trae la siguiente tanda de una sola.

const POR_SECCION = 12;
const TOPE_TEXTO = 40_000;

/** Sin tildes ni mayúsculas, como `sinTildes` del navegador. */
const normalizar = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'u', 'en', 'a', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'un', 'una', 'unos', 'unas', 'al', 'que', 'como', 'mas', 'otros', 'otras']);

/** Las palabras con contenido de un nombre de subtema («Movilidad eléctrica
 *  ligera» → movilidad, electrica, ligera). Mínimo 4 letras: «sol» y «mar»
 *  encajan en demasiadas cosas. */
function palabrasDe(nombres: string[]): string[] {
  const out = new Set<string>();
  for (const n of nombres) {
    for (const p of normalizar(n).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)) {
      if (p.length >= 4 && !VACIAS.has(p)) out.add(p);
    }
  }
  return [...out];
}

/** El patrón de Postgres: raíces al principio de palabra, sobre el texto ya
 *  sin tildes. Se escapa todo lo que no sea letra o dígito. */
function patronDe(palabras: string[]): string | null {
  // Single stems, or whole phrases already joined with `\s+`.
  const limpias = [...new Set(palabras.map(p => (p.includes('\\s+') ? p : normalizar(p))).filter(p => /^[a-z0-9\\s+]{3,}$/.test(p)))];
  return limpias.length ? `\\m(${limpias.join('|')})` : null;
}

/** `translate(lower(x), …)`: lo más parecido a `unaccent` sin instalarlo. */
const sinTildesSql = (expr: any) => sql`translate(lower(${expr}), 'áéíóúüñ', 'aeiouun')`;

/** Un extracto legible: sin marcas de markdown, cortado en una palabra y
 *  con «…» cuando se corta. «## 🌿 Programa **Seed**» → «🌿 Programa Seed». */
function corto(t: unknown, n = 180): string {
  const limpio = String(t ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ').trim();
  if (limpio.length <= n) return limpio;
  const cortado = limpio.slice(0, n);
  const ultimo = cortado.lastIndexOf(' ');
  return (ultimo > n * 0.6 ? cortado.slice(0, ultimo) : cortado).replace(/[,;:(]$/, '') + '…';
}

/** Un adelanto y una imagen a partir de los bloques de una página. */
function deBloques(config: any): { extracto: string | null; imagen: string | null } {
  const bloques: any[] = Array.isArray(config?.bloques) ? config.bloques : [];
  const texto = bloques.find(b => b && typeof b.texto === 'string' && b.texto.trim() && !/^titulo/.test(String(b.tipo)))?.texto;
  const img = config?.portada || bloques.find(b => b?.tipo === 'imagen' && b.url)?.url || null;
  return { extracto: texto ? corto(texto.replace(/[#*_>`]/g, '')) : null, imagen: img };
}

type Item = {
  tipo: string; id: string; titulo: string; extracto: string | null; ruta: string;
  fecha: string | null; imagen?: string | null; clasificado: boolean; publico?: boolean;
  autor?: { id: string; nombre: string; avatar: string | null } | null; extra?: string | null;
};

export function registrarFeedTema(app: Express, db: any) {
  app.get('/api/feed-tema/:objetivo', async (req: Request, res: Response) => {
    try {
      const objetivo = String(req.params.objetivo);
      if (!ES_TEMA(objetivo)) return res.status(404).json({ error: 'Ese tema no existe.' });
      const ambito = req.query.ambito === 'mio' ? 'mio' : 'todos';
      const yo = req.user?.id ?? null;
      if (ambito === 'mio' && !yo) return res.status(401).json({ error: 'Inicia sesión para ver lo tuyo.' });
      const q = corto(req.query.q, 80);
      const subtemaPedido = typeof req.query.subtema === 'string' && /^ST_[A-Za-z0-9_-]+$/.test(req.query.subtema) ? req.query.subtema : null;
      const seccionPedida = typeof req.query.seccion === 'string' ? req.query.seccion : null;
      const offset = Math.max(0, Math.min(500, Number(req.query.offset) || 0));
      const limite = seccionPedida ? POR_SECCION * 2 : POR_SECCION;

      // ── Los subtemas del tema y, con ellos, las palabras ──────────────
      // `cosas` counts the whole branch (children included), the same way the
      // menu does — round 2 found the chip saying 1 while the menu said 64.
      const subtemas = (await db.execute(sql`
        SELECT s.id, s.nombre, s.padre_id,
               (WITH RECURSIVE r AS (
                  SELECT s.id UNION ALL SELECT h.id FROM subtemas h JOIN r ON h.padre_id = r.id WHERE h.archived_at IS NULL)
                SELECT count(DISTINCT (sc.tipo, sc.entity_id))::int FROM subtema_contenido sc
                WHERE sc.subtema_id IN (SELECT id FROM r)
                  -- External items that are gone or broken are not shown, so they are not counted.
                  AND (sc.tipo <> 'agregado' OR EXISTS (SELECT 1 FROM contenido_agregado c WHERE c.id = sc.entity_id AND c.archived_at IS NULL AND coalesce(c.estado, 'vivo') = 'vivo'))) AS cosas
        FROM subtemas s WHERE s.objetivo_id = ${objetivo} AND s.archived_at IS NULL
        ORDER BY s.orden, s.nombre
      `)).rows as Array<{ id: string; nombre: string; padre_id: string | null; cosas: number }>;
      // Which subtopic words are THIS theme's and nobody else's. Round 2 of the
      // review: «público», «personas», «carga» from subtopic names dragged a
      // migration post and a water post into Movilidad. A word that names
      // subtopics of several themes names none of them.
      const todasRamas = (await db.execute(sql`
        SELECT objetivo_id, nombre FROM subtemas WHERE padre_id IS NULL AND archived_at IS NULL
      `)).rows as Array<{ objetivo_id: string; nombre: string }>;
      const dueños = new Map<string, Set<string>>();
      for (const r of todasRamas) for (const p of palabrasDe([r.nombre])) {
        if (!dueños.has(p)) dueños.set(p, new Set());
        dueños.get(p)!.add(r.objetivo_id);
      }
      const propiasDeEsteTema = (nombres: string[]) => palabrasDe(nombres).filter(p => dueños.get(p)?.size === 1 && dueños.get(p)!.has(objetivo));
      /** El nombre entero como frase («transporte publico urbano»), que es
       *  inequívoco aunque sus palabras sueltas no lo sean. */
      const frasesDe = (nombres: string[]) => nombres.map(n => normalizar(n).replace(/[^a-z0-9\s]/g, ' ').trim().replace(/\s+/g, '\\s+')).filter(f => f.length >= 6);
      // A subtopic of another theme (a stale link): the theme is shown whole,
      // not an error page with no way out. The response says `subtema: null`.
      const subtemaValido = subtemaPedido && subtemas.some(s => s.id === subtemaPedido) ? subtemaPedido : null;
      // The subtopic AND everything under it: the chip's count includes the
      // branch, so the filter has to as well (round 3: «64» became «1»).
      const ramaEntera = subtemaValido ? (await db.execute(sql`
        WITH RECURSIVE r AS (
          SELECT id FROM subtemas WHERE id = ${subtemaValido}
          UNION ALL SELECT h.id FROM subtemas h JOIN r ON h.padre_id = r.id WHERE h.archived_at IS NULL)
        SELECT id FROM r
      `)).rows.map((r: any) => String(r.id)) : [];
      const enRama = (col: any) => (subtemaValido ? sql`AND ${col} = ANY(${sql`ARRAY[${sql.join(ramaEntera.map(i => sql`${i}`), sql`, `)}]::text[]`})` : sql``);
      const tema = TEMAS_SERVIDOR[objetivo];
      // With a subtopic: ITS words (and what hangs from it); otherwise the
      // theme's stems plus the names of its first-level branches.
      // ── PRECISIÓN: el cuerpo sólo cuenta con las raíces del tema ──────
      // Measured on 2026-10-05: with the subtopic words («tráfico»,
      // «carga», «transporte»…) applied to whole bodies, a housing canvas
      // landed in Movilidad. Subtopic words now match TITLES only; the
      // theme's own stems match title and body. With a subtopic chosen, its
      // words are the whole pattern, on titles.
      // Round 3: even a word unique to this theme («crisis», from «Crisis de
      // vivienda») is too loose on its own. Single subtopic words are gone;
      // what counts is the theme's curated stems and whole subtopic phrases.
      // With a subtopic chosen, its own words do count: that is the ask.
      const raices = subtemaValido ? [] : tema.palabras;
      const nombresRamas = subtemaValido
        ? [subtemas.find(s => s.id === subtemaValido)!.nombre]
        : subtemas.filter(s => !s.padre_id).map(s => s.nombre);
      const deRamas = [...(subtemaValido ? palabrasDe(nombresRamas) : []), ...frasesDe(nombresRamas)];
      void propiasDeEsteTema;
      // The search box narrows further: every word typed must appear.
      const extras = q ? palabrasDe([q]).map(p => `\\m${p}`) : [];
      const patron = patronDe(raices);
      const patronTitulo = patronDe([...raices, ...deRamas]);

      // ── Lo clasificado a mano ─────────────────────────────────────────
      const clas = (await db.execute(sql`
        SELECT sc.tipo, sc.entity_id FROM subtema_contenido sc
        JOIN subtemas s ON s.id = sc.subtema_id
        WHERE s.objetivo_id = ${objetivo} AND s.archived_at IS NULL
          ${enRama(sql`s.id`)}
      `)).rows as Array<{ tipo: string; entity_id: string }>;
      const enlaces = subtemaValido ? [] : (await db.execute(sql`
        SELECT publication_id FROM publication_links WHERE entity_type = 'objectives' AND entity_id = ${objetivo}
      `)).rows as Array<{ publication_id: string }>;
      const idsDe = (...tipos: string[]) => [...new Set([
        ...clas.filter(c => tipos.includes(c.tipo)).map(c => c.entity_id),
        ...(tipos.includes('publicacion') ? enlaces.map(e => e.publication_id) : []),
      ])];
      const arr = (ids: string[]) => sql`ARRAY[${ids.length ? sql.join(ids.map(i => sql`${i}`), sql`, `) : sql`''`}]::text[]`;

      /** ¿Habla del tema? El título con todas las palabras; el cuerpo sólo
       *  con las raíces del tema. `tituloExpr` puede ser el texto entero
       *  cuando no hay título aparte. */
      // Round 1 of the UX review (2026-10-05): a migration post landed in
      // Movilidad because its body said «transporte» once. One stem in a long
      // body is a mention, not a subject: the body now needs TWO different
      // stems; the title still counts with one.
      const hablaDelTema = (tituloExpr: any, cuerpoExpr: any) => {
        const partes: any[] = [];
        if (patronTitulo) partes.push(sql`${sinTildesSql(tituloExpr)} ~ ${patronTitulo}`);
        // Two different stems; three in a long text, where two mentions of
        // «coste» and «inversión» happen in a page about forest fires.
        if (patron) partes.push(sql`(SELECT count(DISTINCT m[1]) FROM regexp_matches(${sinTildesSql(cuerpoExpr)}, ${patron}, 'g') AS m) >= CASE WHEN length(${cuerpoExpr}) > 4000 THEN 3 ELSE 2 END`);
        return partes.length ? sql`(${sql.join(partes, sql` OR `)})` : sql`false`;
      };
      /** Y además, con búsqueda, cada palabra tecleada tiene que aparecer. */
      const buscado = (textoExpr: any) => (extras.length
        ? sql`AND ${sql.join(extras.map(e => sql`${sinTildesSql(textoExpr)} ~ ${e}`), sql` AND `)}`
        : sql``);
      const habla = (textoExpr: any, tituloExpr?: any) => sql`${hablaDelTema(tituloExpr ?? textoExpr, textoExpr)} ${buscado(textoExpr)}`;
      /** Clasificado O habla del tema; con búsqueda, además lo buscado. */
      const cumple = (ids: string[], idExpr: any, textoExpr: any, tituloExpr?: any) =>
        sql`(${idExpr} = ANY(${arr(ids)}) OR ${hablaDelTema(tituloExpr ?? textoExpr, textoExpr)}) ${buscado(textoExpr)}`;
      const bloqueo = (autorExpr: any) => (yo ? sql`AND NOT bloqueado_entre(${yo}::text, ${autorExpr})` : sql``);

      // ── Las secciones ─────────────────────────────────────────────────
      const secciones: Array<{ clave: string; titulo: string; total: number; items: Item[] }> = [];
      const quiere = (clave: string) => !seccionPedida || seccionPedida === clave;
      const off = (clave: string) => (seccionPedida === clave ? offset : 0);

      // 1. PÁGINAS
      if (quiere('paginas')) {
        const ids = idsDe('pagina', 'ventana');
        const r = await db.execute(sql`
          SELECT w.id, w.title, w.config, w.publico, w.updated_at, w.created_at,
                 u.id AS autor_id, coalesce(u.display_name, u.name) AS autor_nombre, u.avatar_url,
                 (w.id = ANY(${arr(ids)})) AS clasificado, count(*) OVER() AS total
          FROM knowledge_windows w LEFT JOIN users u ON u.id = w.creator_user_id
          WHERE w.kind IN ('pagina', 'documento') AND w.archived_at IS NULL AND w.deleted_at IS NULL
            ${ambito === 'mio' ? sql`AND w.creator_user_id = ${yo}` : sql`AND w.publico = true AND u.deleted_at IS NULL ${bloqueo(sql`w.creator_user_id`)}`}
            AND ${cumple(ids, sql`w.id`, sql`coalesce(w.title, '') || ' ' || left(coalesce(w.config::text, ''), ${TOPE_TEXTO})`, sql`coalesce(w.title, '')`)}
          ORDER BY clasificado DESC, coalesce(w.updated_at, w.created_at) DESC NULLS LAST
          LIMIT ${limite} OFFSET ${off('paginas')}
        `);
        secciones.push({ clave: 'paginas', titulo: 'Páginas', total: Number(r.rows[0]?.total ?? 0), items: (r.rows as any[]).map(w => {
          const b = deBloques(w.config);
          return { tipo: 'pagina', id: w.id, titulo: w.title || 'Sin título', extracto: b.extracto, imagen: b.imagen, ruta: `/paginas/${w.id}`,
            fecha: w.updated_at || w.created_at, clasificado: !!w.clasificado, publico: !!w.publico,
            autor: w.autor_id ? { id: w.autor_id, nombre: w.autor_nombre || '', avatar: w.avatar_url } : null };
        }) });
      }

      // 2. BASES DE DATOS (sus entradas)
      if (quiere('basedatos')) {
        const r = await db.execute(sql`
          SELECT f.id, f.valores, f.pagina_id, f.updated_at, f.created_at, t.titulo AS tabla, t.id AS tabla_id,
                 w.title AS titulo_pagina, w.config, w.publico,
                 u.id AS autor_id, coalesce(u.display_name, u.name) AS autor_nombre, u.avatar_url,
                 count(*) OVER() AS total
          FROM bd_filas f
          JOIN bd_tablas t ON t.id = f.tabla_id AND t.archived_at IS NULL AND t.deleted_at IS NULL
          LEFT JOIN knowledge_windows w ON w.id = f.pagina_id
          LEFT JOIN users u ON u.id = t.creador_user_id
          WHERE f.deleted_at IS NULL AND f.archived_at IS NULL
            ${ambito === 'mio' ? sql`AND t.creador_user_id = ${yo}` : sql`AND w.publico = true AND w.deleted_at IS NULL ${bloqueo(sql`t.creador_user_id`)}`}
            AND ${habla(sql`coalesce(t.titulo, '') || ' ' || coalesce(w.title, '') || ' ' || coalesce(f.valores::text, '') || ' ' || left(coalesce(w.config::text, ''), ${TOPE_TEXTO})`, sql`coalesce(t.titulo, '') || ' ' || coalesce(w.title, '') || ' ' || coalesce(f.valores::text, '')`)}
          ORDER BY coalesce(f.updated_at, f.created_at) DESC NULLS LAST
          LIMIT ${limite} OFFSET ${off('basedatos')}
        `);
        secciones.push({ clave: 'basedatos', titulo: 'Entradas de bases de datos', total: Number(r.rows[0]?.total ?? 0), items: (r.rows as any[]).map(f => {
          const valores = f.valores && typeof f.valores === 'object' ? Object.values(f.valores).filter(v => typeof v === 'string') as string[] : [];
          const b = deBloques(f.config);
          return { tipo: 'fila', id: f.id, titulo: f.titulo_pagina || valores[0] || 'Entrada', extracto: b.extracto || corto(valores.slice(1).join(' · ')) || null,
            imagen: b.imagen, ruta: f.pagina_id ? `/paginas/${f.pagina_id}` : `/tablas?tabla=${encodeURIComponent(f.tabla_id)}`,
            fecha: f.updated_at || f.created_at, clasificado: false, publico: !!f.publico, extra: f.tabla,
            autor: f.autor_id ? { id: f.autor_id, nombre: f.autor_nombre || '', avatar: f.avatar_url } : null };
        }) });
      }

      // 3. PUBLICACIONES (el muro)
      if (quiere('publicaciones')) {
        const ids = idsDe('publicacion');
        const r = await db.execute(sql`
          SELECT p.id, p.title, p.body, p.media, p.visibility, p.updated_at, p.created_at,
                 u.id AS autor_id, coalesce(u.display_name, u.name) AS autor_nombre, u.avatar_url,
                 (p.id = ANY(${arr(ids)})) AS clasificado, count(*) OVER() AS total
          FROM publications p LEFT JOIN users u ON u.id = p.author_user_id
          WHERE p.archived_at IS NULL AND p.deleted_at IS NULL
            ${ambito === 'mio' ? sql`AND p.author_user_id = ${yo}` : sql`AND coalesce(p.visibility, 'publica') <> 'privada' AND coalesce(p.status, 'publicada') = 'publicada' AND u.deleted_at IS NULL ${bloqueo(sql`p.author_user_id`)}`}
            AND ${cumple(ids, sql`p.id`, sql`coalesce(p.title, '') || ' ' || coalesce(p.body, '')`, sql`coalesce(nullif(p.title, ''), left(coalesce(p.body, ''), 80))`)}
          ORDER BY clasificado DESC, p.created_at DESC
          LIMIT ${limite} OFFSET ${off('publicaciones')}
        `);
        secciones.push({ clave: 'publicaciones', titulo: 'Publicaciones', total: Number(r.rows[0]?.total ?? 0), items: (r.rows as any[]).map(p => ({
          tipo: 'publicacion', id: p.id, titulo: p.title || corto(p.body, 80) || 'Publicación', extracto: corto(p.body),
          imagen: Array.isArray(p.media) ? (p.media.find((m: any) => m?.tipo === 'imagen' && m.url)?.url ?? null) : null,
          ruta: `/muro?p=${p.id}`, fecha: p.created_at, clasificado: !!p.clasificado, publico: (p.visibility || 'publica') !== 'privada',
          autor: p.autor_id ? { id: p.autor_id, nombre: p.autor_nombre || '', avatar: p.avatar_url } : null,
        })) });
      }

      // 4. CARPETAS
      if (quiere('carpetas')) {
        const ids = idsDe('proyecto');
        const r = await db.execute(sql`
          SELECT p.id, p.titulo, p.descripcion, p.slug, p.icono, p.portada_url, p.publico, p.updated_at, p.created_at,
                 u.id AS autor_id, coalesce(u.display_name, u.name) AS autor_nombre, u.avatar_url,
                 (p.id = ANY(${arr(ids)})) AS clasificado, count(*) OVER() AS total,
                 (SELECT count(*)::int FROM knowledge_windows w WHERE w.proyecto_id = p.id AND w.kind = 'pagina' AND w.archived_at IS NULL AND w.deleted_at IS NULL) AS paginas
          FROM proyectos p LEFT JOIN users u ON u.id = p.creador_user_id
          WHERE p.archived_at IS NULL AND p.deleted_at IS NULL
            ${ambito === 'mio' ? sql`AND p.creador_user_id = ${yo}` : sql`AND p.publico = true AND u.deleted_at IS NULL ${bloqueo(sql`p.creador_user_id`)}`}
            AND ${cumple(ids, sql`p.id`, sql`coalesce(p.titulo, '') || ' ' || coalesce(p.descripcion, '') || ' ' || coalesce(p.vision, '')`, sql`coalesce(p.titulo, '') || ' ' || coalesce(p.descripcion, '')`)}
          ORDER BY clasificado DESC, coalesce(p.updated_at, p.created_at) DESC
          LIMIT ${limite} OFFSET ${off('carpetas')}
        `);
        secciones.push({ clave: 'carpetas', titulo: 'Carpetas', total: Number(r.rows[0]?.total ?? 0), items: (r.rows as any[]).map(p => ({
          tipo: 'carpeta', id: p.id, titulo: p.titulo, extracto: corto(p.descripcion) || null, imagen: p.portada_url,
          ruta: `/carpetas/${p.slug || p.id}`, fecha: p.updated_at || p.created_at, clasificado: !!p.clasificado, publico: !!p.publico,
          extra: p.paginas === 1 ? '1 página' : p.paginas ? `${p.paginas} páginas` : 'Carpeta',
          autor: p.autor_id ? { id: p.autor_id, nombre: p.autor_nombre || '', avatar: p.avatar_url } : null,
        })) });
      }

      // 5. ESQUEMAS Y MAPAS
      if (quiere('lienzos')) {
        const r = await db.execute(sql`
          SELECT * FROM (
            SELECT 'esquema' AS tipo, g.id, g.title, g.description, g.slug, g.updated_at, g.created_at, g.creator_user_id AS autor_id,
                   (g.status = 'publicado') AS publico
            FROM knowledge_graphs g
            WHERE g.archived_at IS NULL AND g.deleted_at IS NULL AND coalesce(g.center->>'personal', '0') <> '1'
              ${ambito === 'mio' ? sql`AND g.creator_user_id = ${yo}` : sql`AND g.status = 'publicado'`}
              AND ${habla(sql`coalesce(g.title, '') || ' ' || coalesce(g.description, '')`, sql`coalesce(g.title, '')`)}
            UNION ALL
            SELECT 'mapa', m.id, m.title, m.description, m.slug, m.updated_at, m.created_at, m.creator_user_id, (m.status = 'publicado')
            FROM user_maps m
            WHERE m.archived_at IS NULL AND m.deleted_at IS NULL
              ${ambito === 'mio' ? sql`AND m.creator_user_id = ${yo}` : sql`AND m.status = 'publicado'`}
              AND ${habla(sql`coalesce(m.title, '') || ' ' || coalesce(m.description, '')`, sql`coalesce(m.title, '')`)}
          ) x LEFT JOIN users u ON u.id = x.autor_id
          ${ambito === 'todos' ? sql`WHERE u.deleted_at IS NULL ${bloqueo(sql`x.autor_id`)}` : sql``}
          ORDER BY coalesce(x.updated_at, x.created_at) DESC NULLS LAST
          LIMIT ${limite} OFFSET ${off('lienzos')}
        `);
        const total = r.rows.length; // la unión no lleva ventana; basta con lo que cabe
        secciones.push({ clave: 'lienzos', titulo: 'Esquemas y mapas', total, items: (r.rows as any[]).map(x => ({
          tipo: x.tipo, id: x.id, titulo: x.title || 'Sin título', extracto: corto(x.description) || null,
          ruta: x.tipo === 'mapa' ? `/mapas/${x.slug || x.id}` : `/esquemas/${x.slug || x.id}`,
          fecha: x.updated_at || x.created_at, clasificado: false, publico: !!x.publico,
          autor: x.autor_id ? { id: x.autor_id, nombre: x.display_name || x.name || '', avatar: x.avatar_url } : null,
        })) });
      }

      // 6. PERSONAS
      if (quiere('personas')) {
        if (ambito === 'mio') {
          // Las personas de tu mundo que tienen que ver con el tema: por su
          // papel o su descripción, que es lo que tú escribiste de ellas.
          const r = await db.execute(sql`
            SELECT g.id, g.nombre, g.rol, g.descripcion, g.foto_url, g.updated_at, g.created_at, count(*) OVER() AS total
            FROM game_agents g
            WHERE g.user_id = ${yo} AND g.archived_at IS NULL AND g.tipo = 'persona'
              AND ${habla(sql`coalesce(g.nombre, '') || ' ' || coalesce(g.rol, '') || ' ' || coalesce(g.descripcion, '')`)}
            ORDER BY g.updated_at DESC NULLS LAST
            LIMIT ${limite} OFFSET ${off('personas')}
          `);
          secciones.push({ clave: 'personas', titulo: 'Personas de tu mundo', total: Number(r.rows[0]?.total ?? 0), items: (r.rows as any[]).map(g => ({
            tipo: 'persona', id: g.id, titulo: g.nombre, extracto: corto([g.rol, g.descripcion].filter(Boolean).join(' · ')) || null,
            imagen: g.foto_url, ruta: `/persona/${g.id}`, fecha: g.updated_at || g.created_at, clasificado: false, publico: false,
          })) });
        } else {
          // Quien dice en su perfil que este tema le importa.
          const r = await db.execute(sql`
            SELECT u.id, coalesce(u.display_name, u.name) AS nombre, u.avatar_url, u.bio, u.handle, count(*) OVER() AS total
            FROM users u
            WHERE u.deleted_at IS NULL AND u.archived_at IS NULL AND u.objetivos ? ${objetivo}
              ${yo ? sql`AND NOT bloqueado_entre(${yo}::text, u.id)` : sql``}
              ${extras.length ? sql`AND ${sql.join(extras.map(e => sql`${sinTildesSql(sql`coalesce(u.display_name, '') || ' ' || coalesce(u.name, '') || ' ' || coalesce(u.bio, '')`)} ~ ${e}`), sql` AND `)}` : sql``}
            ORDER BY u.display_name NULLS LAST
            LIMIT ${limite} OFFSET ${off('personas')}
          `);
          secciones.push({ clave: 'personas', titulo: 'Personas a las que les importa', total: Number(r.rows[0]?.total ?? 0), items: (r.rows as any[]).map(u => ({
            tipo: 'usuario', id: u.id, titulo: u.nombre || u.handle || 'Alguien', extracto: corto(u.bio) || null, imagen: u.avatar_url,
            ruta: `/personas/${u.id}`, fecha: null, clasificado: true, publico: true,
          })) });
        }
      }

      // 7. DE FUERA (vídeos, artículos…), sólo en lo universal
      if (ambito === 'todos' && quiere('fuera')) {
        const r = await db.execute(sql`
          SELECT DISTINCT ON (c.id) c.id, c.titulo, c.fuente, c.url, c.medio_url, c.formato, c.calidad, c.publicado_el, c.nota_ia
          FROM contenido_agregado c
          JOIN subtema_contenido sc ON sc.tipo = 'agregado' AND sc.entity_id = c.id
          JOIN subtemas s ON s.id = sc.subtema_id AND s.objetivo_id = ${objetivo}
            ${enRama(sql`s.id`)}
          WHERE c.archived_at IS NULL AND coalesce(c.estado, 'vivo') = 'vivo'
            ${extras.length ? sql`AND ${sql.join(extras.map(e => sql`${sinTildesSql(sql`coalesce(c.titulo, '') || ' ' || coalesce(c.nota_ia, '')`)} ~ ${e}`), sql` AND `)}` : sql``}
          ORDER BY c.id
        `);
        const ordenados = (r.rows as any[]).sort((a, b) => Number(b.calidad || 0) - Number(a.calidad || 0));
        const tanda = ordenados.slice(off('fuera'), off('fuera') + limite);
        secciones.push({ clave: 'fuera', titulo: 'De fuera de la plataforma', total: ordenados.length, items: tanda.map(c => ({
          tipo: `fuera:${c.formato || 'texto'}`, id: c.id, titulo: c.titulo || c.url, extracto: corto(c.nota_ia) || null, imagen: c.medio_url,
          ruta: c.url, fecha: c.publicado_el, clasificado: true, publico: true, extra: c.fuente,
        })) });
      }

      // Las secciones vacías no se mandan: una sección que dice «0» es ruido.
      const conAlgo = secciones.filter(s => s.items.length);
      res.json({
        tema: { id: objetivo, titulo: tema.titulo },
        ambito, q, subtema: subtemaValido,
        subtemas: subtemas.filter(s => !s.padre_id).map(s => ({ id: s.id, nombre: s.nombre, cosas: s.cosas })),
        porSeccion: POR_SECCION,
        secciones: seccionPedida ? secciones : conAlgo,
        total: conAlgo.reduce((n, s) => n + s.total, 0),
      });
    } catch (e: any) { console.error('[feed-tema]', e); res.status(500).json({ error: e.message }); }
  });
}
