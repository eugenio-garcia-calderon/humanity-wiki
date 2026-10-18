// ============================================================================
// PRODUCT SHEETS: ONE LAYOUT FOR EVERY ROW OF A DATABASE (2026-10-18, W1)
// ============================================================================
// Wikiproducts (plan §3.1): «every row of a database shares one layout of
// blocks, and each product sheet comes out of its row's data». Until today
// every row page was unique: a hundred powerbanks meant a hundred pages laid
// out by hand, each drifting its own way.
//
// ── THE TEMPLATE IS A PAGE ──────────────────────────────────────────────────
// `bd_tablas.config.plantilla.pagina_id` points to an ordinary private page,
// edited with the ordinary editor. Nothing new to learn and nothing new to
// maintain: whatever the editor can do, a template can do. Its data blocks
// (propiedad, comparador, alternativas…) read «the current row»; on the
// template page itself that is a sample row, so the author sees real data
// while laying it out.
//
// A row page then reads as: the template's blocks, followed by the row page's
// own blocks (anything written for that one product only).
//
// ── WHAT THIS MODULE GIVES ──────────────────────────────────────────────────
//   fichaDePagina()  the `Ficha` (see `components/bloquesDatos/ficha/modelo.ts`)
//                    of a page, read through `GET /api/bd/tablas/:id` itself, so
//                    its permissions are exactly the screen's.
//   GET  /api/bd/ficha/:paginaId          the same, for the browser
//   PUT  /api/bd/tablas/:id/plantilla     create, set or clear the template
//   PUT  /api/bd/filas/:id/procedencia    where each value came from (0153)
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bdInterno } from '../bd';
import { nuevoIdBloque, type Bloque } from '../../utils/bloques';
import { NATURALEZAS, aTablaFicha, type Ficha, type FilaFicha, type TablaFicha, type Procedencia } from '../../components/bloquesDatos/ficha/modelo';

const nid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

/** The table read as a sheet needs it. `null` when the reader cannot see it. */
async function tablaFicha(req: Pick<Request, 'user'> | null, tablaId: string, soloFilas?: Set<string>): Promise<TablaFicha | null> {
  const r = await bdInterno.leerTabla!(req, tablaId);
  if (r.codigo !== 200) return null;
  // A column marked `interna` (working notes: «pendiente de comprobar») stays
  // out of what leaves for a reader who cannot edit. Not `visibilidad: nunca`:
  // that one only means «not in the generic property list», and the photo
  // and the summary use it because the sheet's header paints them itself.
  const escribe = req?.user ? !('error' in (await bdInterno.puedeConTabla!(req as any, tablaId, true))) : false;
  return aTablaFicha(r.cuerpo, { ocultarInternas: !escribe, soloFilas });
}

/** The template's blocks, or null. Read without a permission check on
 *  purpose: it is shown only as part of a row page whose visibility has
 *  already been decided, and its owner is the table's owner. */
async function bloquesPlantilla(db: any, paginaId: string | null | undefined): Promise<Bloque[] | null> {
  if (!paginaId) return null;
  const r = await db.execute(sql`
    SELECT config->'bloques' AS bloques FROM knowledge_windows
    WHERE id = ${paginaId} AND kind = 'pagina' AND deleted_at IS NULL AND archived_at IS NULL
  `);
  const b = (r.rows[0] as any)?.bloques;
  return Array.isArray(b) ? b : null;
}

export type ResultadoFicha = {
  ficha: Ficha;
  /** The template page's blocks, when the table has one. */
  plantilla: Bloque[] | null;
  plantilla_pagina_id: string | null;
};

/**
 * The sheet behind a page: the row's page, or the template page (with a
 * sample row). `null` for any other page, or when the reader cannot see the
 * table. `req` null = an anonymous reader (the HTML everybody gets).
 */
export async function fichaDePagina(db: any, req: Pick<Request, 'user'> | null, paginaId: string): Promise<ResultadoFicha | null> {
  if (!bdInterno.leerTabla) return null;
  const f = (await db.execute(sql`
    SELECT id, tabla_id FROM bd_filas
    WHERE pagina_id = ${paginaId} AND deleted_at IS NULL AND archived_at IS NULL LIMIT 1
  `)).rows[0] as any;
  let tablaId: string | null = f?.tabla_id || null;
  let filaId: string | null = f?.id || null;
  let vistaPrevia = false;
  if (!f) {
    const t = (await db.execute(sql`
      SELECT id FROM bd_tablas
      WHERE config->'plantilla'->>'pagina_id' = ${paginaId} AND deleted_at IS NULL AND archived_at IS NULL LIMIT 1
    `)).rows[0] as any;
    if (!t) return null;
    tablaId = t.id;
    vistaPrevia = true;
  }
  const tabla = await tablaFicha(req, tablaId!);
  if (!tabla) return null;
  if (vistaPrevia) {
    // The sample row: the first one with the most values, so the author sees
    // the layout full rather than half empty.
    const llenas = (x: FilaFicha) => Object.values(x.celdas).filter((c: any) => c?.estado === 'ok').length;
    filaId = [...tabla.filas].sort((a, b) => llenas(b) - llenas(a))[0]?.id || null;
    if (!filaId) return null;
  }
  const actual = tabla.filas.find(x => x.id === filaId);
  if (!actual) return null;

  // The tables this row points to, with only the rows it points to.
  const relacionadas: Record<string, TablaFicha> = {};
  const porTabla = new Map<string, Set<string>>();
  for (const c of tabla.columnas) {
    const destino = c.config?.tabla_destino;
    const ids = (actual.apuntados?.[c.id] || []).map(a => a.id);
    if (c.tipo !== 'relacion' || !destino || !ids.length || destino === tabla.id) continue;
    const s = porTabla.get(destino) || new Set<string>();
    ids.forEach(i => s.add(i));
    porTabla.set(destino, s);
  }
  await Promise.all([...porTabla].map(async ([destino, ids]) => {
    const t = await tablaFicha(req, destino, ids);
    if (t) relacionadas[destino] = t;
  }));

  const plantillaId = tabla.config?.plantilla?.pagina_id || null;
  return {
    ficha: { pagina_id: paginaId, vista_previa: vistaPrevia || undefined, fila_id: filaId!, tabla, relacionadas },
    plantilla: vistaPrevia ? null : await bloquesPlantilla(db, plantillaId),
    plantilla_pagina_id: plantillaId,
  };
}

/** A row page with its template: the template's blocks, then its own. */
export function fusionarPlantilla(plantilla: Bloque[] | null, propios: Bloque[]): Bloque[] {
  if (!plantilla?.length) return propios;
  // An empty paragraph is what a new page is born with: not content.
  const reales = propios.filter(b => !(b?.tipo === 'parrafo' && !String(b.texto || '').trim() && !b.bloques?.length));
  return [...plantilla, ...reales];
}

/** The layout a new template is born with: the sheet of plan §2.2, in order.
 *  The offers block (W5) and the ratings block (W4) go in when they exist; a
 *  declared but unbuilt block does not render on a published page. */
export function plantillaInicial(): Bloque[] {
  const b = (tipo: Bloque['tipo'], datos: Record<string, unknown>): Bloque => ({ id: nuevoIdBloque(), tipo, datos });
  return [
    b('propiedad', { estilo: 'cabecera' }),
    b('propiedad', { estilo: 'texto', rol: 'resumen' }),
    b('valoracion', {}),
    b('propiedad', { estilo: 'tabla', grupo: 'tecnico', titulo: 'Datos clave' }),
    b('propiedad', { estilo: 'tabla', grupo: 'origen', titulo: 'Origen y fabricación' }),
    b('propiedad', { estilo: 'tabla', grupo: 'garantia', titulo: 'Garantía' }),
    b('afirmacion', { modo: 'fila', titulo: 'Afirmaciones publicitarias' }),
    b('retirada', { modo: 'fila', titulo: 'Retiradas y alertas de seguridad' }),
    b('ofertas', {}),
    b('alternativas', { titulo: 'La mejor en cada criterio' }),
    b('comparador', { modo: 'fila', titulo: 'Comparar con otros' }),
    b('propiedad', { estilo: 'tabla', grupo: 'documentos', titulo: 'Documentos y enlaces' }),
    b('propiedad', { estilo: 'pie' }),
  ];
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Checks and normalises one provenance entry, or says why not. */
export function validarProcedencia(p: any): { ok: Procedencia } | { error: string } {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { error: 'tiene que ser un objeto {fuente, fecha, naturaleza, nota}' };
  const naturaleza = p.naturaleza ?? p.nature;
  if (!NATURALEZAS.includes(naturaleza)) return { error: `«naturaleza» tiene que ser una de: ${NATURALEZAS.join(', ')}` };
  const fuente = p.fuente ?? p.source ?? null;
  if (fuente !== null && (typeof fuente !== 'string' || !/^https?:\/\/\S+$/.test(fuente) || fuente.length > 1000)) return { error: '«fuente» tiene que ser una dirección http(s)' };
  // Measured or declared without a source is exactly what the house rule forbids.
  if (!fuente && (naturaleza === 'declarado' || naturaleza === 'medido')) return { error: `un dato «${naturaleza}» necesita su «fuente»` };
  const fecha = p.fecha ?? p.date ?? null;
  if (fecha !== null && (typeof fecha !== 'string' || !FECHA.test(fecha))) return { error: '«fecha» tiene que ser AAAA-MM-DD' };
  const nota = p.nota ?? p.note ?? null;
  if (nota !== null && typeof nota !== 'string') return { error: '«nota» tiene que ser texto' };
  return { ok: { naturaleza, fuente, fecha, ...(nota ? { nota: nota.slice(0, 500) } : {}) } };
}

/**
 * Writes provenance for some cells of a row. `entrada` is {columnId: entry |
 * null}; null removes it. Checks the writer can write the table. Shared with
 * `/api/v1` so both paths validate the same way.
 */
export async function guardarProcedencia(db: any, req: Pick<Request, 'user'>, filaId: string, entrada: Record<string, any>): Promise<{ codigo: number; cuerpo: any }> {
  if (!req.user) return { codigo: 401, cuerpo: { error: 'Debes iniciar sesión.' } };
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) return { codigo: 400, cuerpo: { error: '«procedencia» tiene que ser un objeto {columna: {fuente, fecha, naturaleza}}.' } };
  const f = (await db.execute(sql`SELECT id, tabla_id FROM bd_filas WHERE id = ${filaId} AND deleted_at IS NULL`)).rows[0] as any;
  if (!f) return { codigo: 404, cuerpo: { error: 'Esa fila no existe.' } };
  const permiso = await bdInterno.puedeConTabla!(req, f.tabla_id, true);
  if ('error' in permiso) return { codigo: permiso.codigo, cuerpo: { error: permiso.error } };
  const cols = new Set(((await db.execute(sql`SELECT id FROM bd_columnas WHERE tabla_id = ${f.tabla_id} AND archived_at IS NULL`)).rows as any[]).map(c => c.id));
  const poner: Record<string, Procedencia> = {};
  const quitar: string[] = [];
  const fallos: Record<string, string> = {};
  for (const [col, p] of Object.entries(entrada)) {
    if (!cols.has(col)) { fallos[col] = 'esa columna no es de esta tabla'; continue; }
    if (p === null) { quitar.push(col); continue; }
    const v = validarProcedencia(p);
    if ('error' in v) fallos[col] = v.error; else poner[col] = v.ok;
  }
  // All or nothing: half-written provenance would say «sourced» about values
  // whose source was rejected.
  if (Object.keys(fallos).length) return { codigo: 400, cuerpo: { error: 'Hay procedencias que no valen.', fallos } };
  // `jsonb - text[]` removes several keys at once. `string_to_array`, not an
  // array parameter: see the note in `bd/enlaces.ts` (ids never hold commas).
  await db.execute(sql`
    UPDATE bd_filas
    SET procedencia = (procedencia - string_to_array(${quitar.join(',')}, ',')) || ${JSON.stringify(poner)}::jsonb,
        updated_at = now(), updated_by = ${req.user.id}
    WHERE id = ${filaId}
  `);
  return { codigo: 200, cuerpo: { id: filaId, puestas: Object.keys(poner).length, quitadas: quitar.length } };
}

/**
 * The template of a table. Body `{ crear: true }` creates its page (once:
 * a second call returns the same), `{ pagina_id }` points at an existing
 * page of the same owner, `{ pagina_id: null }` stops using one (the page
 * is left as it is: removing a layout is not deleting someone's page).
 * Shared by the screen and `/api/v1`.
 */
export async function ponerPlantilla(db: any, req: Pick<Request, 'user'>, tablaId: string, cuerpoPeticion: any): Promise<{ codigo: number; cuerpo: any }> {
  if (!req.user) return { codigo: 401, cuerpo: { error: 'Debes iniciar sesión.' } };
  const permiso = await bdInterno.puedeConTabla!(req, tablaId, true);
  if ('error' in permiso) return { codigo: permiso.codigo, cuerpo: { error: permiso.error } };
  const t = permiso.tabla;
  const actual = t.config?.plantilla?.pagina_id || null;
  const d = cuerpoPeticion || {};
  let pagina: string | null;
  if (d.crear) {
    if (actual && (await bloquesPlantilla(db, actual))) return { codigo: 200, cuerpo: { pagina_id: actual, creada: false } };
    pagina = nid('KW');
    await db.execute(sql`
      INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
      VALUES (${pagina}, ${`Plantilla de ficha · ${t.titulo}`}, 'pagina', ${JSON.stringify({ bloques: plantillaInicial() })}::jsonb,
              false, ${req.user.id}, false, ${req.user.id}, ${req.user.id}, ${t.proyecto_id || null})
    `);
  } else if (d.pagina_id === null) {
    pagina = null;
  } else {
    const p = (await db.execute(sql`
      SELECT id, creator_user_id FROM knowledge_windows WHERE id = ${String(d.pagina_id || '')} AND kind = 'pagina' AND deleted_at IS NULL AND archived_at IS NULL
    `)).rows[0] as any;
    if (!p) return { codigo: 404, cuerpo: { error: 'Esa página no existe.' } };
    if (p.creator_user_id !== t.creador_user_id && (req.user.roleLevel ?? 0) < 4) return { codigo: 403, cuerpo: { error: 'La plantilla tiene que ser una página de quien creó la base de datos.' } };
    pagina = p.id;
  }
  await db.execute(sql`
    UPDATE bd_tablas SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{plantilla}', ${JSON.stringify(pagina ? { pagina_id: pagina } : null)}::jsonb),
      updated_at = now(), updated_by = ${req.user.id}
    WHERE id = ${t.id}
  `);
  return { codigo: 200, cuerpo: { pagina_id: pagina, creada: !!d.crear } };
}

export function registrarPlantillaFicha(app: Express, db: any) {
  /** The sheet of a page, for the blocks in the browser. */
  app.get('/api/bd/ficha/:paginaId', async (req: Request, res: Response) => {
    try {
      const r = await fichaDePagina(db, req, req.params.paginaId);
      res.set('Cache-Control', 'private, no-store');
      if (!r) return res.status(404).json({ error: 'Esta página no es la ficha de ninguna fila que puedas ver.' });
      res.json({ ficha: r.ficha, plantilla_pagina_id: r.plantilla_pagina_id, tiene_plantilla: !!r.plantilla });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.put('/api/bd/tablas/:id/plantilla', async (req: Request, res: Response) => {
    try {
      const r = await ponerPlantilla(db, req, req.params.id, req.body);
      res.status(r.codigo).json(r.cuerpo);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  app.put('/api/bd/filas/:id/procedencia', async (req: Request, res: Response) => {
    try {
      const r = await guardarProcedencia(db, req, req.params.id, req.body?.procedencia);
      res.status(r.codigo).json(r.cuerpo);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
