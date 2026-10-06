import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bloquesDe } from './bloquesSql.js';

// ============================================================================
// EL ESPACIO: FAVORITOS, RECIENTES Y BÚSQUEDA (2026-10-06, carril «espacio»,
// #14 y #15 — igualar a Notion)
// ============================================================================
// Tres cosas que comparten una sola pregunta: «¿qué puede ver esta persona?».
// Por eso viven juntas y con UNA definición de «visible» (`visibles`), en vez
// de repetir la regla en cada consulta.
//
// ── QUÉ ES «VISIBLE» ────────────────────────────────────────────────────────
//   · Páginas: las que has creado tú, las que alguien te ha compartido a ti
//     (`accesos_entidad`) y las que le han compartido a un equipo tuyo
//     (`accesos_equipo`). Una página PÚBLICA de otra persona NO cuenta: estar
//     en la web no es estar en tu espacio, y un buscador que te enseñara
//     cualquier borrador «público por defecto» (la columna nació en `true`)
//     sería una fuga. Quien quiera lo público, tiene el buscador de la web.
//   · Bases de datos: las que están dentro de una página visible.
//   · Carpetas y personas (tu agenda): solo las tuyas.
//   Es más estricto que «lo que podrías abrir con el enlace», y es a
//   propósito: un buscador que se equivoca por poco no devuelve de menos, lo
//   hace de más, y eso no se nota hasta que alguien lo cuenta.
//
// ── LA BÚSQUEDA ─────────────────────────────────────────────────────────────
// Texto completo de Postgres en español (`to_tsvector('spanish', …)`), con el
// título pesando más que el cuerpo (ver `rh_doc_pagina`, migración 0141) y
// sin acentos (`rh_norm`): «avion» encuentra «avión». Cada palabra se busca
// como prefijo (`ast:*`), para que valga también al escribir. Se ordena por
// `ts_rank_cd` (con un empujón si el título coincide) y el fragmento sale del
// texto de la página, con las coincidencias marcadas entre ⟦ y ⟧: el cliente
// las pinta como nodos de React, sin `dangerouslySetInnerHTML`, así que un
// texto con `<script>` se muestra como texto.

const TIPOS = ['pagina', 'carpeta', 'bd'] as const;
type Tipo = typeof TIPOS[number];
const esTipo = (t: unknown): t is Tipo => typeof t === 'string' && (TIPOS as readonly string[]).includes(t);

const MAX_FAVORITOS = 100;
const MAX_RECIENTES_GUARDADOS = 30;
const MAX_RECIENTES_VISTOS = 10;

/** Misma tabla que `rh_norm` en SQL, letra por letra (la longitud no cambia). */
const DE = 'áéíóúüàèìòùâêîôûñ';
const A = 'aeiouuaeiouaeioun';
export const normalizar = (s: string) => s.toLowerCase().replace(/./gsu, c => { const i = DE.indexOf(c); return i >= 0 ? A[i] : c; });
const palabrasDe = (q: string) => normalizar(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, 8);

type Ids = { yo: string };

/** Las páginas que esta persona ve: suyas, compartidas con ella o con un equipo suyo. */
export const visibles = ({ yo }: Ids) => sql`
  SELECT w.id FROM knowledge_windows w
    WHERE w.kind = 'pagina' AND w.creator_user_id = ${yo} AND w.archived_at IS NULL AND w.deleted_at IS NULL
  UNION
  SELECT a.entidad_id FROM accesos_entidad a
    JOIN knowledge_windows w ON w.id = a.entidad_id AND w.kind = 'pagina' AND w.archived_at IS NULL AND w.deleted_at IS NULL
    WHERE a.entidad_tipo = 'pagina' AND a.user_id = ${yo}
  UNION
  SELECT a.entidad_id FROM accesos_equipo a
    JOIN equipo_miembros m ON m.equipo_id = a.equipo_id AND m.user_id = ${yo}
    JOIN equipos e ON e.id = a.equipo_id AND e.archived_at IS NULL
    JOIN knowledge_windows w ON w.id = a.entidad_id AND w.kind = 'pagina' AND w.archived_at IS NULL AND w.deleted_at IS NULL
    WHERE a.entidad_tipo = 'pagina'
`;

const ENT = { pagina: 'pagina', carpeta: 'carpeta', bd: 'bd' } as const;

export type Elemento = { tipo: Tipo; id: string; titulo: string; icono: string | null; ruta: string };

/** De ids a elementos pintables, SOLO los que esta persona puede ver. */
async function resolver(db: any, yo: string, pares: { tipo: Tipo; id: string }[]): Promise<Map<string, Elemento>> {
  const out = new Map<string, Elemento>();
  const por = (t: Tipo) => [...new Set(pares.filter(p => p.tipo === t).map(p => p.id))];
  const lista = (ids: string[]) => sql.join(ids.map(i => sql`${i}`), sql`, `);
  const pag = por('pagina'), car = por('carpeta'), bds = por('bd');
  if (pag.length) {
    const r = await db.execute(sql`
      SELECT w.id, w.title, w.config->>'icono' AS icono FROM knowledge_windows w
      WHERE w.id IN (${lista(pag)}) AND w.id IN (${visibles({ yo })})
    `);
    for (const x of r.rows as any[]) out.set(`pagina:${x.id}`, { tipo: 'pagina', id: x.id, titulo: x.title || 'Sin título', icono: x.icono || null, ruta: `/paginas/${x.id}` });
  }
  if (car.length) {
    const r = await db.execute(sql`
      SELECT id, titulo, slug, icono FROM proyectos
      WHERE id IN (${lista(car)}) AND creador_user_id = ${yo} AND archived_at IS NULL AND deleted_at IS NULL
    `);
    for (const x of r.rows as any[]) out.set(`carpeta:${x.id}`, { tipo: 'carpeta', id: x.id, titulo: x.titulo || 'Sin título', icono: x.icono || null, ruta: `/carpetas/${x.slug}` });
  }
  if (bds.length) {
    const r = await db.execute(sql`
      SELECT t.id, t.titulo, t.icono, h.id AS pagina_id FROM bd_tablas t
      JOIN LATERAL (
        SELECT w.id FROM knowledge_windows w
        WHERE w.id IN (${visibles({ yo })}) AND ${bloquesDe('w')} @> jsonb_build_array(jsonb_build_object('tabla_id', t.id))
        ORDER BY w.created_at LIMIT 1
      ) h ON true
      WHERE t.id IN (${lista(bds)}) AND t.archived_at IS NULL AND t.deleted_at IS NULL
    `);
    for (const x of r.rows as any[]) out.set(`bd:${x.id}`, { tipo: 'bd', id: x.id, titulo: x.titulo || 'Base de datos', icono: x.icono || null, ruta: `/paginas/${x.pagina_id}` });
  }
  return out;
}

export type Resultado = Elemento & {
  autor: string | null; autor_id: string | null; actualizado: string | null;
  carpeta: string | null; fragmento: string | null; puntos: number;
};

type Filtros = { q: string; tipos: string[]; autor: string | null; desde: string | null; hasta: string | null; carpeta: string | null; limite: number };

/** Un trozo del cuerpo alrededor de la primera coincidencia, con ⟦…⟧ marcando lo hallado. */
function fragmentoDe(cuerpo: string, palabras: string[]): string | null {
  if (!cuerpo) return null;
  const n = normalizar(cuerpo);
  if (n.length !== cuerpo.length) return cuerpo.slice(0, 160);
  // Se marca toda palabra que EMPIECE por la raíz de lo buscado: «casas» marca
  // «casa» y «casamiento». La raíz es la palabra sin sus dos últimas letras
  // (mínimo 3): lo que hace el stemmer, a ojo y sin pedirle nada a la base.
  const raices = palabras.map(p => p.slice(0, Math.max(3, p.length - 2)));
  const re = raices.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${raices.map(r => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[\\p{L}\\p{N}]*`, 'gu') : null;
  let primera = -1;
  const marcas: [number, number][] = [];
  if (re) for (let m; (m = re.exec(n));) { if (primera < 0) primera = m.index; marcas.push([m.index, m.index + m[0].length]); if (marcas.length > 40) break; }
  const ini = Math.max(0, (primera < 0 ? 0 : primera) - 50);
  const fin = Math.min(cuerpo.length, ini + 190);
  let t = '';
  let pos = ini;
  for (const [a, b] of marcas) {
    if (b <= ini || a >= fin) continue;
    const a2 = Math.max(a, pos), b2 = Math.min(b, fin);
    t += cuerpo.slice(pos, a2) + '⟦' + cuerpo.slice(a2, b2) + '⟧';
    pos = b2;
  }
  t += cuerpo.slice(pos, fin);
  return (ini > 0 ? '… ' : '') + t.replace(/\s+/g, ' ').trim() + (fin < cuerpo.length ? ' …' : '');
}

export async function buscar(db: any, yo: string, f: Filtros): Promise<Resultado[]> {
  const palabras = palabrasDe(f.q);
  const nq = palabras.join(' ');
  const hay = palabras.length > 0;
  const tsq = hay ? palabras.map(p => `${p}:*`).join(' & ') : '';
  const quiere = (t: string) => !f.tipos.length || f.tipos.includes(t);
  const out: Resultado[] = [];
  // Con un filtro de autor o carpeta solo pueden salir páginas y bases de datos: el resto no tiene autor ni carpeta de otra persona.
  const soloDocs = !!(f.autor && f.autor !== yo) || !!f.carpeta;

  if (quiere('pagina')) {
    const r = await db.execute(sql`
      WITH c AS (
        SELECT w.id, w.title, w.config->>'icono' AS icono, w.creator_user_id, w.updated_at, w.proyecto_id,
          CASE WHEN ${hay} THEN ts_rank_cd(rh_doc_pagina(w.title, w.config), to_tsquery('spanish', ${tsq}), 1) ELSE 0 END AS r,
          CASE WHEN ${hay} AND rh_norm(w.title) = ${nq} THEN 2 WHEN ${hay} AND strpos(rh_norm(w.title), ${nq}) > 0 THEN 0.5 ELSE 0 END AS extra
        FROM knowledge_windows w
        WHERE w.kind = 'pagina' AND w.archived_at IS NULL AND w.deleted_at IS NULL
          AND w.id IN (${visibles({ yo })})
          AND (${!hay} OR rh_doc_pagina(w.title, w.config) @@ to_tsquery('spanish', ${tsq}) OR strpos(rh_norm(w.title), ${nq}) > 0)
          AND (${f.autor}::text IS NULL OR w.creator_user_id = ${f.autor})
          AND (${f.desde}::timestamp IS NULL OR w.updated_at >= ${f.desde}::timestamp)
          AND (${f.hasta}::timestamp IS NULL OR w.updated_at < ${f.hasta}::timestamp + interval '1 day')
          AND (${f.carpeta}::text IS NULL OR w.proyecto_id = ${f.carpeta})
      )
      SELECT c.id, c.title, c.icono, c.creator_user_id, c.updated_at, c.r + c.extra AS puntos,
        COALESCE(u.display_name, u.name) AS autor, p.titulo AS carpeta,
        left(rh_texto_pagina(w.config), 6000) AS cuerpo
      FROM c JOIN knowledge_windows w ON w.id = c.id
      LEFT JOIN users u ON u.id = c.creator_user_id
      LEFT JOIN proyectos p ON p.id = c.proyecto_id AND p.archived_at IS NULL
      ORDER BY (c.r + c.extra) DESC, c.updated_at DESC NULLS LAST
      LIMIT ${f.limite}
    `);
    for (const x of r.rows as any[]) out.push({
      tipo: 'pagina', id: x.id, titulo: x.title || 'Sin título', icono: x.icono || null, ruta: `/paginas/${x.id}`,
      autor: x.autor || null, autor_id: x.creator_user_id, actualizado: x.updated_at ? new Date(x.updated_at).toISOString() : null,
      carpeta: x.carpeta || null, fragmento: hay ? fragmentoDe(x.cuerpo || '', palabras) : null,
      puntos: Number(x.puntos) || 0,
    });
  }

  if (quiere('bd')) {
    const r = await db.execute(sql`
      SELECT t.id, t.titulo, t.icono, t.descripcion, t.creador_user_id, t.updated_at, t.proyecto_id, h.id AS pagina_id,
        COALESCE(u.display_name, u.name) AS autor, p.titulo AS carpeta
      FROM bd_tablas t
      JOIN LATERAL (
        SELECT w.id FROM knowledge_windows w
        WHERE w.id IN (${visibles({ yo })}) AND ${bloquesDe('w')} @> jsonb_build_array(jsonb_build_object('tabla_id', t.id))
        ORDER BY w.created_at LIMIT 1
      ) h ON true
      LEFT JOIN users u ON u.id = t.creador_user_id
      LEFT JOIN proyectos p ON p.id = t.proyecto_id AND p.archived_at IS NULL
      WHERE t.archived_at IS NULL AND t.deleted_at IS NULL
        AND (${!hay} OR strpos(rh_norm(t.titulo), ${nq}) > 0 OR strpos(rh_norm(coalesce(t.descripcion, '')), ${nq}) > 0)
        AND (${f.autor}::text IS NULL OR t.creador_user_id = ${f.autor})
        AND (${f.desde}::timestamp IS NULL OR t.updated_at >= ${f.desde}::timestamp)
        AND (${f.hasta}::timestamp IS NULL OR t.updated_at < ${f.hasta}::timestamp + interval '1 day')
        AND (${f.carpeta}::text IS NULL OR t.proyecto_id = ${f.carpeta})
      ORDER BY t.updated_at DESC NULLS LAST
      LIMIT ${f.limite}
    `);
    for (const x of r.rows as any[]) {
      const nt = normalizar(x.titulo || '');
      out.push({
        tipo: 'bd', id: x.id, titulo: x.titulo || 'Base de datos', icono: x.icono || null, ruta: `/paginas/${x.pagina_id}`,
        autor: x.autor || null, autor_id: x.creador_user_id, actualizado: x.updated_at ? new Date(x.updated_at).toISOString() : null,
        carpeta: x.carpeta || null, fragmento: hay && x.descripcion ? fragmentoDe(x.descripcion, palabras) : null,
        puntos: hay ? (nt === nq ? 2 : nt.startsWith(nq) ? 1 : 0.5) : 0,
      });
    }
  }

  if (quiere('carpeta') && !soloDocs && !f.desde && !f.hasta) {
    const r = await db.execute(sql`
      SELECT id, titulo, slug, icono, updated_at FROM proyectos
      WHERE creador_user_id = ${yo} AND archived_at IS NULL AND deleted_at IS NULL
        AND (${!hay} OR strpos(rh_norm(titulo), ${nq}) > 0)
      ORDER BY updated_at DESC NULLS LAST LIMIT ${f.limite}
    `);
    for (const x of r.rows as any[]) {
      const nt = normalizar(x.titulo || '');
      out.push({
        tipo: 'carpeta', id: x.id, titulo: x.titulo || 'Sin título', icono: x.icono || null, ruta: `/carpetas/${x.slug}`,
        autor: null, autor_id: yo, actualizado: x.updated_at ? new Date(x.updated_at).toISOString() : null, carpeta: null, fragmento: null,
        puntos: hay ? (nt === nq ? 2 : nt.startsWith(nq) ? 1 : 0.5) : 0,
      });
    }
  }

  // Tu agenda de personas. Sin filtros de autor/fecha/carpeta: no tienen sentido en una ficha de contacto.
  if (quiere('persona') && !soloDocs && !f.desde && !f.hasta && !f.autor) {
    const r = await db.execute(sql`
      SELECT a.id, a.nombre, a.rol, a.empresa, a.icono, a.foto_url, a.updated_at FROM game_agents a
      WHERE a.user_id = ${yo} AND a.tipo = 'persona' AND a.archived_at IS NULL
        AND (${!hay} OR strpos(rh_norm(a.nombre), ${nq}) > 0 OR strpos(rh_norm(coalesce(a.empresa, '')), ${nq}) > 0
             OR strpos(rh_norm(coalesce(a.rol, '')), ${nq}) > 0 OR strpos(rh_norm(coalesce(a.email, '')), ${nq}) > 0)
      ORDER BY a.favorito DESC, a.nombre LIMIT ${f.limite}
    `);
    for (const x of r.rows as any[]) {
      const nt = normalizar(x.nombre || '');
      out.push({
        tipo: 'persona' as any, id: x.id, titulo: x.nombre || 'Sin nombre', icono: null, ruta: `/persona/${x.id}`,
        autor: [x.rol, x.empresa].filter(Boolean).join(' · ') || null, autor_id: null,
        actualizado: x.updated_at ? new Date(x.updated_at).toISOString() : null, carpeta: null, fragmento: null,
        puntos: hay ? (nt === nq ? 2 : nt.startsWith(nq) ? 1 : 0.5) : 0,
      });
    }
  }

  out.sort((a, b) => b.puntos - a.puntos || (b.actualizado || '').localeCompare(a.actualizado || ''));
  return out.slice(0, f.limite);
}

const fechaOk = (s: unknown) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
const texto = (s: unknown, max = 200) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

export function registrarEspacio(app: Express, db: any) {
  const entrar = (req: Request, res: Response) => {
    if (!req.user) { res.status(401).json({ error: 'Inicia sesión.' }); return null; }
    return req.user.id as string;
  };

  /** Favoritos y las 10 últimas cosas abiertas, ya resueltos para pintar el menú. */
  app.get('/api/espacio/inicio', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const [fav, rec] = await Promise.all([
        db.execute(sql`SELECT tipo, entidad_id FROM favoritos_espacio WHERE user_id = ${yo} ORDER BY orden, created_at LIMIT ${MAX_FAVORITOS}`),
        db.execute(sql`SELECT tipo, entidad_id FROM recientes_espacio WHERE user_id = ${yo} ORDER BY abierto_en DESC LIMIT ${MAX_RECIENTES_GUARDADOS}`),
      ]);
      const pares = [...fav.rows, ...rec.rows].map((x: any) => ({ tipo: x.tipo as Tipo, id: x.entidad_id as string }));
      const m = await resolver(db, yo, pares);
      const dame = (rows: any[], max: number) => rows.map(x => m.get(`${x.tipo}:${x.entidad_id}`)).filter((x): x is Elemento => !!x).slice(0, max);
      res.json({ favoritos: dame(fav.rows as any[], MAX_FAVORITOS), recientes: dame(rec.rows as any[], MAX_RECIENTES_VISTOS) });
    } catch (e: any) { console.error('espacio inicio:', e); res.status(500).json({ error: 'No se han podido leer tus favoritos.' }); }
  });

  /** Marcar o desmarcar un favorito. Solo cosas que ves. */
  app.put('/api/espacio/favoritos', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const tipo = req.body?.tipo, id = texto(req.body?.id, 64);
      if (!esTipo(tipo) || !id) return res.status(400).json({ error: 'Falta qué marcar.' });
      const favorito = req.body?.favorito !== false;
      if (!favorito) {
        await db.execute(sql`DELETE FROM favoritos_espacio WHERE user_id = ${yo} AND tipo = ${tipo} AND entidad_id = ${id}`);
        return res.json({ ok: true, favorito: false });
      }
      if (!(await resolver(db, yo, [{ tipo, id }])).size) return res.status(404).json({ error: 'No encuentro eso entre lo que puedes ver.' });
      const n = Number(((await db.execute(sql`SELECT count(*)::int AS n FROM favoritos_espacio WHERE user_id = ${yo}`)).rows[0] as any).n);
      if (n >= MAX_FAVORITOS) return res.status(400).json({ error: `Ya tienes ${MAX_FAVORITOS} favoritos: quita alguno antes.` });
      await db.execute(sql`
        INSERT INTO favoritos_espacio (user_id, tipo, entidad_id, orden)
        VALUES (${yo}, ${tipo}, ${id}, COALESCE((SELECT max(orden) + 1 FROM favoritos_espacio WHERE user_id = ${yo}), 0))
        ON CONFLICT DO NOTHING
      `);
      res.json({ ok: true, favorito: true });
    } catch (e: any) { console.error('espacio favorito:', e); res.status(500).json({ error: 'No se ha podido guardar el favorito.' }); }
  });

  /** Anotar que has abierto algo (alimenta «Recientes» y la paleta). */
  app.post('/api/espacio/recientes', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const tipo = req.body?.tipo;
      if (!esTipo(tipo)) return res.status(400).json({ error: 'Tipo desconocido.' });
      let id = texto(req.body?.id, 64);
      const slug = texto(req.body?.slug, 120);
      if (!id && tipo === 'carpeta' && slug) {
        id = ((await db.execute(sql`SELECT id FROM proyectos WHERE slug = ${slug} AND creador_user_id = ${yo} AND archived_at IS NULL AND deleted_at IS NULL LIMIT 1`)).rows[0] as any)?.id || '';
      }
      if (!id || !(await resolver(db, yo, [{ tipo, id }])).size) return res.json({ ok: false });
      await db.execute(sql`
        INSERT INTO recientes_espacio (user_id, tipo, entidad_id, abierto_en) VALUES (${yo}, ${tipo}, ${id}, now())
        ON CONFLICT (user_id, tipo, entidad_id) DO UPDATE SET abierto_en = now()
      `);
      await db.execute(sql`
        DELETE FROM recientes_espacio WHERE user_id = ${yo} AND (tipo, entidad_id) NOT IN (
          SELECT tipo, entidad_id FROM recientes_espacio WHERE user_id = ${yo} ORDER BY abierto_en DESC LIMIT ${MAX_RECIENTES_GUARDADOS})
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error('espacio reciente:', e); res.status(500).json({ error: 'No se ha podido anotar.' }); }
  });

  /** La búsqueda: paleta (`limite` bajo) y pantalla de resultados (con filtros). */
  app.get('/api/espacio/buscar', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const tipos = texto(req.query.tipo, 80).split(',').filter(t => ['pagina', 'bd', 'carpeta', 'persona'].includes(t));
      const f: Filtros = {
        q: texto(req.query.q, 200), tipos,
        autor: texto(req.query.autor, 64) || null,
        desde: fechaOk(req.query.desde), hasta: fechaOk(req.query.hasta),
        carpeta: texto(req.query.carpeta, 64) || null,
        limite: Math.min(Math.max(parseInt(String(req.query.limite)) || 30, 1), 100),
      };
      res.json({ resultados: await buscar(db, yo, f) });
    } catch (e: any) { console.error('espacio buscar:', e); res.status(500).json({ error: 'La búsqueda ha fallado. Prueba otra vez.' }); }
  });

  /** Lo que se puede elegir en los filtros: autores de lo que ves y tus carpetas. */
  app.get('/api/espacio/filtros', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const [autores, carpetas] = await Promise.all([
        db.execute(sql`
          SELECT u.id, COALESCE(u.display_name, u.name) AS nombre FROM users u
          WHERE u.id IN (SELECT w.creator_user_id FROM knowledge_windows w WHERE w.id IN (${visibles({ yo })}))
          ORDER BY (u.id = ${yo}) DESC, nombre LIMIT 100
        `),
        db.execute(sql`SELECT id, titulo FROM proyectos WHERE creador_user_id = ${yo} AND archived_at IS NULL AND deleted_at IS NULL ORDER BY titulo LIMIT 200`),
      ]);
      res.json({ autores: (autores.rows as any[]).map(a => ({ id: a.id, nombre: a.nombre || 'Sin nombre', yo: a.id === yo })), carpetas: carpetas.rows });
    } catch (e: any) { console.error('espacio filtros:', e); res.status(500).json({ error: e.message }); }
  });
}
