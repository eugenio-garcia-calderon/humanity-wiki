// ============================================================================
// OPINIONES EN OTRAS WEBS · RATINGS PUBLISHED BY THIRD PARTIES (2026-10-18, W4)
// ============================================================================
// What a product or a shop scores somewhere else (Trustpilot, the maker's own
// shop, a retailer), copied by hand with its source and the day it was read.
// Kept apart from the community score on purpose:
//
// - It NEVER enters the community note, never orders a ranking and never goes
//   into the AggregateRating JSON-LD (Google only accepts ratings collected on
//   the page itself, and a borrowed one would be a made-up rating to us).
// - It is a fact with a source and a date, shown as «Según X», nature
//   «tercero» (`ficha/modelo.ts`). A reader can open the link and check it.
//
// The value lives in a long-text column whose `config.clave` is
// `opiniones_terceros`, as JSON: `[{fuente, url, nota, escala, opiniones,
// fecha}]` (`scripts/wikiproducts/datos/opiniones-terceros.json`). Anything that
// does not validate is dropped: a rating with no link or no date is not shown.
import { sql } from 'drizzle-orm';
import { opinionesDe, type OpinionTercero } from '../../utils/opinionesTerceros';

export const CLAVE_TERCEROS = 'opiniones_terceros';
export { opinionesDe, textoOpinion, type OpinionTercero } from '../../utils/opinionesTerceros';

/** Third-party ratings of these rows, by row id. A row whose table has no
 *  such column, or whose cell is empty, is simply absent from the map. */
export async function opinionesTerceros(db: any, filaIds: string[]): Promise<Map<string, OpinionTercero[]>> {
  const out = new Map<string, OpinionTercero[]>();
  const ids = [...new Set(filaIds.filter(Boolean))];
  if (!ids.length) return out;
  const r = await db.execute(sql`
    SELECT f.id AS fila_id, f.valores -> c.id AS valor
    FROM bd_filas f
    JOIN bd_columnas c ON c.tabla_id = f.tabla_id AND c.archived_at IS NULL
      AND c.tipo IN ('texto', 'texto_largo') AND c.config->>'clave' = ${CLAVE_TERCEROS}
    WHERE f.id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) AND f.deleted_at IS NULL AND f.archived_at IS NULL
  `);
  for (const x of r.rows as any[]) {
    const lista = opinionesDe(x.valor);
    if (lista.length && !out.has(x.fila_id)) out.set(x.fila_id, lista);
  }
  return out;
}
