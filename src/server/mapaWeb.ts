import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { paginaVisible } from './sitios';
import { todosLosBloques } from '../utils/bloques';

// ============================================================================
// EL MAPA WEB DE UN SITIO (2026-10-26, Eugenio)
// ============================================================================
// «Que el pie de página sea un mapa web con todas las páginas que hay,
// ordenaditas.» Primero lo que enseña la portada (cada base de datos, con sus
// entradas), y después cada página del menú del sitio (las filas de
// `config.hijas`, en su orden) con lo que cuelga de ella: las entradas de sus
// bases de datos y sus subpáginas. Ocho por sección y el total, para «Ver
// todas». Lo pinta `MapaWeb` en `MenuSitio.tsx`.

const POR_SECCION = 8;
type Entrada = { id: string; titulo: string };
type Seccion = { titulo: string; pagina_id: string | null; entradas: Entrada[]; total: number };
const memoria = new Map<string, { t: number; secciones: Seccion[] }>();

async function entradasDeTablas(db: any, tablas: string[]): Promise<Map<string, Entrada[]>> {
  const out = new Map<string, Entrada[]>();
  if (!tablas.length) return out;
  const r = await db.execute(sql`
    SELECT f.tabla_id, f.pagina_id AS id, k.title AS titulo FROM bd_filas f
    JOIN knowledge_windows k ON k.id = f.pagina_id AND k.deleted_at IS NULL AND k.archived_at IS NULL
    WHERE f.tabla_id IN (${sql.join(tablas.map(t => sql`${t}`), sql`, `)}) AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false
      AND COALESCE(k.title, '') NOT IN ('', 'Sin título')
    ORDER BY f.orden, k.title
  `);
  for (const x of r.rows as any[]) {
    const l = out.get(x.tabla_id) || [];
    l.push({ id: String(x.id), titulo: String(x.titulo) });
    out.set(x.tabla_id, l);
  }
  return out;
}

async function seccionesDe(db: any, raizId: string): Promise<Seccion[] | null> {
  const raiz = (await db.execute(sql`
    SELECT id, title, config FROM knowledge_windows WHERE id = ${raizId} AND deleted_at IS NULL AND archived_at IS NULL AND config ? 'sitio'
  `)).rows[0] as any;
  if (!raiz) return null;
  const tablasDe = (config: any) => [...new Set(todosLosBloques(config?.bloques || [])
    .filter((b: any) => b?.tipo === 'basedatos' && (b.tabla_id || b.tablaId)).map((b: any) => String(b.tabla_id || b.tablaId)))];
  const subpaginasDe = (config: any) => todosLosBloques(config?.bloques || [])
    .filter((b: any) => b?.tipo === 'subpagina' && b.entityId).map((b: any) => String(b.entityId));

  // Las páginas del menú, en su orden.
  const menuTabla = raiz.config?.hijas?.tabla_id ? String(raiz.config.hijas.tabla_id) : null;
  const menu = menuTabla ? (await db.execute(sql`
    SELECT k.id, k.title, k.config FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id AND k.deleted_at IS NULL AND k.archived_at IS NULL
    WHERE f.tabla_id = ${menuTabla} AND f.deleted_at IS NULL AND f.oculta = false ORDER BY f.orden, k.title
  `)).rows as any[] : [];

  const tablasRaiz = tablasDe(raiz.config).filter(t => t !== menuTabla);
  const todas = [...new Set([...tablasRaiz, ...menu.flatMap(m => tablasDe(m.config))])];
  const porTabla = await entradasDeTablas(db, todas);
  const titulosTablas = todas.length ? new Map(((await db.execute(sql`
    SELECT id, titulo FROM bd_tablas WHERE id IN (${sql.join(todas.map(t => sql`${t}`), sql`, `)})
  `)).rows as any[]).map(x => [String(x.id), String(x.titulo || '')])) : new Map<string, string>();
  const subs = [...new Set([...subpaginasDe(raiz.config), ...menu.flatMap(m => subpaginasDe(m.config))])];
  const tituloSub = subs.length ? new Map(((await db.execute(sql`
    SELECT id, title FROM knowledge_windows WHERE id IN (${sql.join(subs.map(t => sql`${t}`), sql`, `)}) AND deleted_at IS NULL AND archived_at IS NULL
  `)).rows as any[]).map(x => [String(x.id), String(x.title || '')])) : new Map<string, string>();

  const seccion = (titulo: string, pagina_id: string | null, entradas: Entrada[]): Seccion => {
    const vistas = new Set<string>();
    const unicas = entradas.filter(e => e.titulo && !vistas.has(e.id) && vistas.add(e.id));
    return { titulo, pagina_id, entradas: unicas.slice(0, POR_SECCION), total: unicas.length };
  };
  const out: Seccion[] = [];
  // Lo de la portada: cada base de datos es una sección (los Sistemas, en Luz & Humanidad).
  for (const t of tablasRaiz) {
    const l = porTabla.get(t) || [];
    if (l.length) out.push(seccion(titulosTablas.get(t) || 'Inicio', null, l));
  }
  for (const m of menu) {
    const entradas = [
      ...tablasDe(m.config).flatMap(t => porTabla.get(t) || []),
      ...subpaginasDe(m.config).map(id => ({ id, titulo: tituloSub.get(id) || '' })),
    ];
    out.push(seccion(String(m.title || ''), String(m.id), entradas));
  }
  return out;
}

export function registrarMapaWeb(app: Express, db: any) {
  app.get('/api/sitio/mapa-web/:raiz', async (req: Request, res: Response) => {
    try {
      const raiz = String(req.params.raiz);
      const m = memoria.get(raiz);
      if (m && Date.now() - m.t < 5 * 60_000) { res.set('Cache-Control', 'public, max-age=300'); return res.json({ secciones: m.secciones }); }
      if (!(await paginaVisible(db, raiz))) return res.status(404).json({ error: 'No está.' });
      const secciones = await seccionesDe(db, raiz);
      if (!secciones) return res.status(404).json({ error: 'No es un sitio.' });
      memoria.set(raiz, { t: Date.now(), secciones });
      res.set('Cache-Control', 'public, max-age=300');
      res.json({ secciones });
    } catch (e: any) { console.error('mapa web:', e); res.status(500).json({ error: e.message }); }
  });
}
