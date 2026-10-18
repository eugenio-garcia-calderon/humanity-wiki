// ============================================================================
// VALORACIONES · THE ROUTES (2026-10-18, Wikiproducts W4)
// ============================================================================
// Read one row's community ratings and vote on them. How a score is computed,
// and why it never reads commission, is in `bd/comunidad.ts`: this file only
// decides who may read and who may vote.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bdInterno } from './bd';
import { TIPO_COMUNIDAD, ajustesDe, votosDe, resumirTabla, celdasComunidad, notaMedia } from './bd/comunidad';
import { registrarHtml, esc } from './htmlBloques';
import { registrarAmpliacion } from './ampliarPagina';
import { opinionesTerceros, textoOpinion, type OpinionTercero } from './bd/opinionesTerceros';

// ── ROUTES ──────────────────────────────────────────────────────────────────

const nid = () => `VAL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export function registrarValoraciones(app: Express, db: any) {
  /** The row, its table's `comunidad` columns, and whether the caller may
   *  read it. `{ error, codigo }` when not. The server HTML asks as nobody
   *  (`req.user` undefined): what a search engine reads, anyone may read. */
  async function filaDe(req: Pick<Request, 'user'>, clave: string)
    : Promise<{ fila: any; columnas: any[] } | { error: string; codigo: number }> {
    // A row id, or the id of the row's page: the block on a row page only
    // knows the page it sits on.
    const f = (await db.execute(sql`
      SELECT id, tabla_id FROM bd_filas
      WHERE (id = ${clave} OR pagina_id = ${clave}) AND deleted_at IS NULL AND archived_at IS NULL
      LIMIT 1
    `)).rows[0] as any;
    if (!f) return { error: 'Esa ficha no existe.', codigo: 404 };
    if (!bdInterno.puedeConTabla) return { error: 'Las tablas no están listas todavía.', codigo: 503 };
    const permiso = await bdInterno.puedeConTabla(req, f.tabla_id, false);
    if ('error' in permiso) return permiso;
    const columnas = (await db.execute(sql`
      SELECT id, nombre, tipo, config FROM bd_columnas
      WHERE tabla_id = ${f.tabla_id} AND tipo = ${TIPO_COMUNIDAD} AND archived_at IS NULL
      ORDER BY orden, created_at
    `)).rows as any[];
    return { fila: f, columnas };
  }

  async function contexto(req: Request, res: Response) {
    const r = await filaDe(req, String(req.params.fila));
    if ('error' in r) { res.status(r.codigo).json({ error: r.error }); return null; }
    return r;
  }

  /** Has this person bought what this row is (or what links to it)? */
  async function esComprador(userId: string, filaId: string): Promise<boolean> {
    const r = await db.execute(sql`
      WITH comprado AS (
        SELECT DISTINCT pr.bd_fila_id AS fila
        FROM pedidos p
        LEFT JOIN pedido_lineas l ON l.pedido_id = p.id
        JOIN products pr ON pr.id = COALESCE(l.producto_id, p.producto_id)
        WHERE p.estado IN ('pagado', 'enviado', 'entregado') AND p.comprador_user_id = ${userId}
          AND pr.bd_fila_id IS NOT NULL
      )
      SELECT 1 FROM comprado WHERE fila = ${filaId}
      UNION ALL
      SELECT 1 FROM comprado c JOIN bd_enlaces e ON e.fila_origen = c.fila AND e.clase = 'fila' AND e.destino_id = ${filaId}
      LIMIT 1
    `);
    return r.rows.length > 0;
  }

  /**
   * Everything the rating block needs for one row: each criterion with its
   * score, mean, counts and distribution, my own votes, and `agregado` — the
   * schema.org AggregateRating, present ONLY when real votes pass the
   * threshold (SEO R4: never a made-up rating).
   */
  async function resumen(fila: any, columnas: any[], yo: string | null) {
    const votos = await votosDe(db, columnas.map(c => c.id));
    const { porCol, simples } = resumirTabla(columnas, votos);
    const celdas = celdasComunidad(columnas, [fila.id], votos)[fila.id] || {};
    const comprador = yo ? await esComprador(yo, fila.id) : false;

    const criterios = columnas.map(c => {
      const aj = ajustesDe(c.config);
      const s = aj.criterio === 'media' ? null : porCol[c.id]?.[fila.id];
      const celda: any = celdas[c.id];
      return {
        columna_id: c.id,
        nombre: c.nombre,
        criterio: aj.criterio,
        media_de_criterios: aj.criterio === 'media',
        solo_compradores: aj.solo_compradores,
        umbral: aj.umbral,
        // Below the threshold no number leaves the server, only the count:
        // the screen says how far it is («1 de 3 votos»).
        suficiente: celda?.estado === 'ok',
        nota: celda?.estado === 'ok' ? celda.valor : null,
        media: celda?.estado === 'ok' ? (celda.media ?? null) : null,
        votos: s?.votos ?? (celda?.votos || 0),
        verificados: s?.verificados ?? 0,
        media_verificados: celda?.estado === 'ok' ? (s?.media_verificados ?? null) : null,
        reparto: celda?.estado === 'ok' && s ? s.reparto : null,
      };
    });

    const mios: Record<string, number> = {};
    if (yo) for (const v of votos) if (v.user_id === yo && v.fila_id === fila.id) mios[v.columna_id] = v.nota;

    // AggregateRating: the plain mean people see (not the adjusted note that
    // orders), from the overall column if the table has one, otherwise the
    // mean of the criteria that pass. ratingCount = distinct voters.
    const general = criterios.find(c => c.media_de_criterios && c.media !== null);
    const valor = general?.media ?? notaMedia(criterios.filter(c => !c.media_de_criterios).map(c => c.media));
    const votantes = new Set(votos.filter(v => v.fila_id === fila.id && simples.some(s => s.id === v.columna_id)).map(v => v.user_id)).size;
    const agregado = valor !== null && votantes > 0
      ? { '@type': 'AggregateRating', ratingValue: valor, ratingCount: votantes, bestRating: 5, worstRating: 1 }
      : null;

    // Ratings published elsewhere: shown apart, never in `agregado`.
    const terceros: OpinionTercero[] = (await opinionesTerceros(db, [fila.id])).get(fila.id) || [];

    return { criterios, mios, comprador, agregado, terceros };
  }

  /** The block's data for the row (row id or its page id). */
  app.get('/api/valoraciones/fila/:fila', async (req: Request, res: Response) => {
    try {
      const ctx = await contexto(req, res);
      if (!ctx) return;
      const { fila, columnas } = ctx;
      const r = await resumen(fila, columnas, req.user?.id || null);
      res.json({
        fila_id: fila.id,
        criterios: r.criterios,
        mios: r.mios,
        sesion: !!req.user,
        comprador_verificado: r.comprador,
        agregado: r.agregado,
        terceros: r.terceros,
        metodo: {
          formula: '(C·m + Σ peso·nota) / (C + Σ peso)',
          peso_previo: columnas[0] ? ajustesDe(columnas[0].config).peso_previo : 5,
          peso_verificado: columnas[0] ? ajustesDe(columnas[0].config).peso_verificado : 2,
          umbral: columnas[0] ? ajustesDe(columnas[0].config).umbral : 3,
        },
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Vote, change my vote, or take it back (`nota: null`). Any signed-in
   *  person (level 1), or a site member whose category may comment
   *  (`miembros.ts`, RUTAS_DE_MIEMBRO). */
  app.put('/api/valoraciones/fila/:fila', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Entra para puntuar.' });
      if ((req.user.roleLevel ?? 0) < 1) return res.status(403).json({ error: 'Requiere nivel 1 o superior.' });
      const ctx = await contexto(req, res);
      if (!ctx) return;
      const columnaId = String(req.body?.columna_id || '');
      const col = ctx.columnas.find(c => c.id === columnaId);
      if (!col) return res.status(400).json({ error: 'Ese criterio no existe en esta base de datos.' });
      const aj = ajustesDe(col.config);
      if (aj.criterio === 'media') return res.status(400).json({ error: 'La nota media se calcula con las demás: no se vota.' });

      const bruto = req.body?.nota;
      if (bruto === null || bruto === undefined || bruto === '') {
        await db.execute(sql`DELETE FROM valoraciones WHERE fila_id = ${ctx.fila.id} AND columna_id = ${col.id} AND user_id = ${req.user.id}`);
        return res.json({ ok: true, nota: null });
      }
      const nota = Number(bruto);
      if (!Number.isInteger(nota) || nota < 1 || nota > 5) return res.status(400).json({ error: 'La nota va de 1 a 5.' });
      if (aj.solo_compradores && !(await esComprador(req.user.id, ctx.fila.id))) {
        return res.status(403).json({ error: 'Este criterio sólo lo puntúa quien ha comprado a través de la plataforma.' });
      }
      await db.execute(sql`
        INSERT INTO valoraciones (id, fila_id, columna_id, user_id, nota)
        VALUES (${nid()}, ${ctx.fila.id}, ${col.id}, ${req.user.id}, ${nota})
        ON CONFLICT (fila_id, columna_id, user_id) DO UPDATE SET nota = EXCLUDED.nota, updated_at = now()
      `);
      res.json({ ok: true, nota });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── SERVER HTML AND STRUCTURED DATA (SEO R4) ──────────────────────────────
  // What a search engine or an AI reads before React starts: each criterion
  // with its mean and vote count, or how far it is from one («1 de 3 votos»). Built as
  // nobody (no session), so it says only what any reader may see.

  const anonimo = { user: undefined } as Pick<Request, 'user'>;
  const claveDe = (b: any, pagina: any): string | null => {
    const f = b?.datos?.fila_id;
    return (typeof f === 'string' && f) || (pagina?.id ? String(pagina.id) : null);
  };
  const cifra = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const votosTxt = (n: number) => `${n} ${n === 1 ? 'voto' : 'votos'}`;

  registrarHtml('valoracion', (b, ctx) => {
    const r = ctx.extra.get('valoracion')?.get(claveDe(b, ctx.pagina) || '');
    if (!r) return '';
    const fuera = r.terceros.length
      ? `<section><h2>Opiniones en otras webs</h2><p>No cuentan en la puntuación de la comunidad.</p><ul>${r.terceros.map((o: OpinionTercero) =>
        `<li><a href="${esc(o.url)}" rel="nofollow noopener">${esc(textoOpinion(o))}</a></li>`).join('')}</ul></section>`
      : '';
    if (!r.criterios.length) return fuera;
    const lista = r.criterios.filter((c: any) => !c.media_de_criterios).map((c: any) =>
      `<li>${esc(c.nombre)}: ${c.suficiente && c.media !== null
        ? `${esc(cifra(c.media))} de 5 (${esc(votosTxt(c.votos))})`
        : `aún sin nota (${esc(c.votos)} de ${esc(c.umbral)} votos)`}</li>`).join('');
    const cabeza = r.agregado
      ? `<p>Nota media: ${esc(cifra(r.agregado.ratingValue))} de 5, de ${esc(r.agregado.ratingCount)} ${r.agregado.ratingCount === 1 ? 'persona' : 'personas'}.</p>`
      : `<p>Aún sin nota: aparece con ${esc(r.criterios[0].umbral)} votos por criterio. Si lo has usado, puntúalo.</p>`;
    return `<section><h2>Puntuación de la comunidad</h2>${cabeza}<ul>${lista}</ul></section>${fuera}`;
  }, async (_db, bloques, ctx) => {
    const claves = [...new Set(bloques.filter(b => b?.tipo === 'valoracion').map(b => claveDe(b, ctx.pagina)).filter(Boolean) as string[])];
    if (!claves.length) return;
    const m = new Map<string, any>();
    for (const k of claves) {
      const f = await filaDe(anonimo, k);
      if (!('error' in f)) m.set(k, await resumen(f.fila, f.columnas, null));
    }
    ctx.extra.set('valoracion', m);
  });

  /** The page's blocks, nested ones included (layouts keep them per column). */
  const bloquesDe = (lista: any, n = 0, out: any[] = []): any[] => {
    if (n > 12) return out;
    for (const b of Array.isArray(lista) ? lista : []) {
      if (!b || typeof b !== 'object') continue;
      out.push(b);
      if (Array.isArray(b.bloques)) bloquesDe(b.bloques, n + 1, out);
      if (Array.isArray(b.columnas)) for (const c of b.columnas) bloquesDe(c?.bloques, n + 1, out);
    }
    return out;
  };

  // AggregateRating in the JSON-LD, only if the page SHOWS the rating block
  // and real votes pass the threshold. If the product template (W1) already
  // wrote a Product, the rating goes inside it; otherwise a minimal Product.
  registrarAmpliacion(async (_db, _req, pagina) => {
    const b = bloquesDe(pagina?.config?.bloques).find(x => x.tipo === 'valoracion');
    if (!b) return;
    const k = claveDe(b, pagina);
    if (!k) return;
    const f = await filaDe(anonimo, k);
    if ('error' in f || !f.columnas.length) return;
    const { agregado } = await resumen(f.fila, f.columnas, null);
    if (!agregado) return;
    const rating = { ...agregado, ratingValue: Math.round(agregado.ratingValue * 10) / 10 };
    const meta = (pagina.meta = pagina.meta || {});
    const ld = meta.jsonLd ? (Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd]) : [];
    const producto: any = ld.find((x: any) => x && x['@type'] === 'Product');
    if (producto) { if (!producto.aggregateRating) producto.aggregateRating = rating; }
    else ld.push({ '@context': 'https://schema.org', '@type': 'Product', name: String(pagina.titulo || ''), url: '{{canonica}}', aggregateRating: rating });
    meta.jsonLd = ld;
  });
}
