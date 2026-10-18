// ============================================================================
// VALORACIONES DE LA COMUNIDAD, POR CRITERIO (2026-10-18, Wikiproducts W4)
// ============================================================================
// Eugenio: «un lugar donde tú puedes calificar a los productos en función de la
// calidad, precio, garantía, ecología, salud, estética y ética… y todos los
// distribuidores, que a su vez estarán puntuados por su atención al cliente».
//
// ── THE SHAPE: ONE CRITERION = ONE COLUMN OF TYPE `comunidad` ──────────────
// A criterion is a column of the table whose rows are rated, with
// `config.criterio` naming it ('calidad', 'precio'…, 'atencion' on a
// distributor table, or 'media' for the overall note). The votes live in
// `valoraciones` (drizzle/0152). The column stores nothing in the row: its
// cell is filled on read with the score, from `calcularTabla` (calculo.ts),
// the same way the buy button is filled from the shop. Because it is a column:
//   · the gallery sorts by it with zero new code (`?orden=`, «ordenar por
//     ética» — plan 3.10), and empty cells already sort last;
//   · formulas, the comparator and «la mejor en cada criterio» (W1) read it
//     like any number;
//   · the public API and the row page show it like any other property.
//
// ── HOW A SCORE IS COMPUTED (published in «Cómo ordenamos») ────────────────
//   · one vote per person, row and criterion, 1 to 5, editable (unique index);
//   · a verified buyer's vote weighs ×2 (`peso_verificado`). Verified = has a
//     paid, sent or delivered order of the product behind this row, or behind
//     a row that links to this one (an offer → its distributor). Read from
//     `pedidos` every time: a refund takes the weight away by itself;
//   · Bayesian average: (C·m + Σ wᵢ·xᵢ) / (C + Σ wᵢ), with m = 3, the middle
//     of the scale, and C = 5 (`peso_previo`). Two votes of 5 do not beat 300
//     of 4.6. m is NOT the table's mean, on purpose: measured in
//     `scripts/probar-valoraciones.ts`, with the table's mean as prior one
//     popular 4.6 product lifts the prior to 4.6 and three 5s then outrank it
//     (4.75 against 4.6) — exactly what the rule exists to prevent;
//   · that adjusted number ORDERS; the plain weighted mean (`media` on the
//     cell) is what is SHOWN next to the vote count. Showing 3.75 to someone
//     whose three voters all gave 5 would read as an error;
//   · fewer than 3 distinct voters (`umbral`) → the cell is EMPTY, not a
//     number. The screen says «aún sin votos suficientes».
//   · 'media' is the mean of the other criteria's scores, and only when at
//     least half of them have enough votes.
//
// ── THE RANKING NEVER READS COMMISSION ─────────────────────────────────────
// Ethics code, plan §2.3. Nothing in this file receives a row's other cells:
// the score is a function of the votes and nothing else. The commission word
// does not appear in this file on purpose, and `scripts/probar-valoraciones.ts`
// fails if it ever does, and proves that changing every row's commission
// leaves the order untouched.
import { sql } from 'drizzle-orm';
import type { Celda } from './celdas';

export const TIPO_COMUNIDAD = 'comunidad';
/** The criteria Wikiproducts uses. Any other slug is accepted: a creator may
 *  rate recipes on «sabor». This list only gives the labels a default. */
export const CRITERIOS: Record<string, string> = {
  calidad: 'Calidad', precio: 'Precio', garantia: 'Garantía', ecologia: 'Ecología',
  salud: 'Salud', estetica: 'Estética', etica: 'Ética', atencion: 'Atención al cliente',
  media: 'Nota media',
};

export type Ajustes = {
  criterio: string;
  umbral: number;
  peso_previo: number;
  peso_verificado: number;
  solo_compradores: boolean;
};

const entre = (v: any, min: number, max: number, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

/** A column's config, cleaned. Read on every use: the column route stores the
 *  config as it came, so the limits are enforced here. */
export function ajustesDe(config: any): Ajustes {
  const c = config && typeof config === 'object' ? config : {};
  const criterio = String(c.criterio || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40) || 'calidad';
  return {
    criterio,
    umbral: Math.round(entre(c.umbral, 1, 50, 3)),
    peso_previo: entre(c.peso_previo, 0, 100, 5),
    peso_verificado: entre(c.peso_verificado, 1, 10, 2),
    solo_compradores: !!c.solo_compradores,
  };
}

export type Voto = { fila_id: string; columna_id: string; user_id: string; nota: number; verificado: boolean };

export type Resumen = {
  /** Bayesian score, the number that orders. `null` below the threshold. */
  nota: number | null;
  /** Plain weighted mean of this row's votes, `null` with no votes. */
  media: number | null;
  votos: number;
  verificados: number;
  media_verificados: number | null;
  suficiente: boolean;
  /** How many voters gave each note, 1..5. */
  reparto: [number, number, number, number, number];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
/** The prior mean: the middle of the 1-5 scale. See the header. */
export const PRIOR = 3;

/**
 * The scores of one criterion for every row, from its votes and NOTHING else.
 * Pure on purpose: it is what the commission test calls.
 */
export function resumirCriterio(votos: Voto[], aj: Ajustes): Record<string, Resumen> {
  const w = (v: Voto) => (v.verificado ? aj.peso_verificado : 1);
  const m = PRIOR;

  const porFila = new Map<string, Voto[]>();
  for (const v of votos) {
    if (!porFila.has(v.fila_id)) porFila.set(v.fila_id, []);
    porFila.get(v.fila_id)!.push(v);
  }
  const out: Record<string, Resumen> = {};
  for (const [fila, vs] of porFila) {
    let pw = 0, pwx = 0, nv = 0, sv = 0;
    const reparto: Resumen['reparto'] = [0, 0, 0, 0, 0];
    for (const v of vs) {
      pw += w(v); pwx += w(v) * v.nota;
      reparto[v.nota - 1]++;
      if (v.verificado) { nv++; sv += v.nota; }
    }
    const suficiente = vs.length >= aj.umbral;
    out[fila] = {
      nota: suficiente ? r2((aj.peso_previo * m + pwx) / (aj.peso_previo + pw)) : null,
      media: r2(pwx / pw),
      votos: vs.length,
      verificados: nv,
      media_verificados: nv ? r2(sv / nv) : null,
      suficiente,
      reparto,
    };
  }
  return out;
}

/** The overall note: mean of the criteria that have one, if at least half do. */
export function notaMedia(notas: Array<number | null>): number | null {
  if (!notas.length) return null;
  const con = notas.filter((n): n is number => typeof n === 'number');
  if (con.length * 2 < notas.length) return null;
  return r2(con.reduce((a, b) => a + b, 0) / con.length);
}

/** A score as a cell: `valor` is the adjusted note that orders. `votos` and
 *  `media` ride along: the screen shows the plain mean and the count, and can
 *  say «2 votos, aún no bastan» on an empty cell. */
function celdaDe(nota: number | null, votos: number, media: number | null): Celda {
  const c: any = nota === null ? { estado: 'vacia' } : { estado: 'ok', valor: nota };
  c.votos = votos;
  c.media = media;
  return c as Celda;
}

/**
 * Every vote of these columns, with whether its author is a verified buyer of
 * the row voted. Votes on retired rows are left out: they must not move the
 * table's mean either.
 */
export async function votosDe(db: any, columnaIds: string[]): Promise<Voto[]> {
  if (!columnaIds.length) return [];
  const ids = sql.join(columnaIds.map(i => sql`${i}`), sql`, `);
  const r = await db.execute(sql`
    WITH votantes AS (
      SELECT DISTINCT user_id FROM valoraciones WHERE columna_id IN (${ids})
    ), comprado AS (
      SELECT DISTINCT p.comprador_user_id AS user_id, pr.bd_fila_id AS fila
      FROM pedidos p
      LEFT JOIN pedido_lineas l ON l.pedido_id = p.id
      JOIN products pr ON pr.id = COALESCE(l.producto_id, p.producto_id)
      WHERE p.estado IN ('pagado', 'enviado', 'entregado')
        AND p.comprador_user_id IN (SELECT user_id FROM votantes)
        AND pr.bd_fila_id IS NOT NULL
    ), alcance AS (
      SELECT user_id, fila FROM comprado
      UNION
      SELECT c.user_id, e.destino_id FROM comprado c
      JOIN bd_enlaces e ON e.fila_origen = c.fila AND e.clase = 'fila'
    )
    SELECT v.fila_id, v.columna_id, v.user_id, v.nota,
           EXISTS (SELECT 1 FROM alcance a WHERE a.user_id = v.user_id AND a.fila = v.fila_id) AS verificado
    FROM valoraciones v
    JOIN bd_filas f ON f.id = v.fila_id AND f.deleted_at IS NULL AND f.archived_at IS NULL
    WHERE v.columna_id IN (${ids})
  `);
  return (r.rows as any[]).map(x => ({
    fila_id: x.fila_id, columna_id: x.columna_id, user_id: x.user_id,
    nota: Number(x.nota), verificado: !!x.verificado,
  }));
}

/** Per column: the summary of every row. Pure, given the votes. */
export function resumirTabla(columnas: Array<{ id: string; config: any }>, votos: Voto[]) {
  const porCol: Record<string, Record<string, Resumen>> = {};
  const simples = columnas.filter(c => ajustesDe(c.config).criterio !== 'media');
  for (const c of simples) {
    porCol[c.id] = resumirCriterio(votos.filter(v => v.columna_id === c.id), ajustesDe(c.config));
  }
  return { porCol, simples };
}

/**
 * The cells of every `comunidad` column for these rows. Called by
 * `calcularTabla` before formulas run, so a formula can read a score.
 */
export function celdasComunidad(
  columnas: Array<{ id: string; tipo: string; config: any }>,
  filaIds: string[],
  votos: Voto[],
): Record<string, Record<string, Celda>> {
  const mias = columnas.filter(c => c.tipo === TIPO_COMUNIDAD);
  const out: Record<string, Record<string, Celda>> = {};
  for (const id of filaIds) out[id] = {};
  if (!mias.length) return out;
  const { porCol, simples } = resumirTabla(mias, votos);
  for (const id of filaIds) {
    for (const c of simples) {
      const s = porCol[c.id][id];
      out[id][c.id] = celdaDe(s?.nota ?? null, s?.votos ?? 0, s?.suficiente ? s.media : null);
    }
    for (const c of mias) {
      if (ajustesDe(c.config).criterio !== 'media') continue;
      const notas = simples.map(s => porCol[s.id][id]?.nota ?? null);
      const votantes = new Set(votos.filter(v => v.fila_id === id && simples.some(s => s.id === v.columna_id)).map(v => v.user_id));
      const medias = simples.map(s => (porCol[s.id][id]?.suficiente ? porCol[s.id][id].media : null));
      const nota = notaMedia(notas);
      out[id][c.id] = celdaDe(nota, votantes.size, nota === null ? null : notaMedia(medias));
    }
  }
  return out;
}

/** The hook for `calcularTabla`: one query for the whole table. */
export async function notasComunidad(
  db: any,
  columnas: Array<{ id: string; tipo: string; config: any }>,
  filaIds: string[],
): Promise<Record<string, Record<string, Celda>>> {
  const mias = columnas.filter(c => c.tipo === TIPO_COMUNIDAD);
  if (!mias.length) return {};
  try {
    return celdasComunidad(mias, filaIds, await votosDe(db, mias.map(c => c.id)));
  } catch (e: any) {
    // The table must still read if this fails: the cells say why.
    console.error('[valoraciones]', e?.message || e);
    const out: Record<string, Record<string, Celda>> = {};
    for (const id of filaIds) out[id] = Object.fromEntries(mias.map(c => [c.id, { estado: 'error', mensaje: 'Las valoraciones no responden ahora.' } as Celda]));
    return out;
  }
}


/**
 * The customer-service note of these distributor rows, for the «Ofertas»
 * block (W5): the adjusted note (the one that orders) or `null` when the row
 * has fewer voters than the threshold, or its table has no `atencion` column.
 * Rows not found are left out of the map.
 */
export async function notaAtencionDistribuidores(db: any, filaIds: string[]): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  const ids = [...new Set(filaIds.filter(Boolean))];
  if (!ids.length) return out;
  const r = await db.execute(sql`
    SELECT f.id AS fila_id, c.id, c.tipo, c.config
    FROM bd_filas f
    LEFT JOIN bd_columnas c ON c.tabla_id = f.tabla_id AND c.tipo = ${TIPO_COMUNIDAD}
      AND c.archived_at IS NULL AND c.config->>'criterio' = 'atencion'
    WHERE f.id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) AND f.deleted_at IS NULL AND f.archived_at IS NULL
  `);
  const columnaDe = new Map<string, { id: string; tipo: string; config: any } | null>();
  for (const x of r.rows as any[]) if (!columnaDe.get(x.fila_id)) columnaDe.set(x.fila_id, x.id ? { id: x.id, tipo: x.tipo, config: x.config } : null);
  const columnas = [...new Map([...columnaDe.values()].filter(Boolean).map(c => [c!.id, c!])).values()];
  const votos = await votosDe(db, columnas.map(c => c.id));
  const celdas = celdasComunidad(columnas, [...columnaDe.keys()], votos);
  for (const [fila, col] of columnaDe) {
    const c = col ? celdas[fila]?.[col.id] : null;
    out.set(fila, c && c.estado === 'ok' ? (c.valor as number) : null);
  }
  return out;
}
