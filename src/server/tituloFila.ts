import { sql } from 'drizzle-orm';

/**
 * LA PÁGINA DE UNA FILA (2026-09-30): su título es el nombre de la fila en la
 * base de datos. Se reescribe la primera columna de texto para que la tabla y
 * la página no digan dos nombres distintos. Sacada del `PUT /api/windows/:id` (`knowledge.ts`)
 * para que la edición simultánea (`colabServidor.ts`), que también cambia el
 * título, haga exactamente lo mismo.
 */
export async function sincronizarTituloDeFila(db: any, paginaId: string, titulo: string) {
  let limpio = titulo.replace(/\s+/g, ' ').trim().slice(0, 2000);
  // Lo que el editor pone cuando no hay título no es un nombre.
  if (limpio === 'Documento sin título' || limpio === 'Sin título') limpio = '';
  await db.execute(sql`
    WITH c AS (
      SELECT f.id AS fila_id,
             (SELECT id FROM bd_columnas
              WHERE tabla_id = f.tabla_id AND archived_at IS NULL AND tipo = 'texto'
              ORDER BY orden, created_at LIMIT 1) AS col
      FROM bd_filas f
      WHERE f.pagina_id = ${paginaId} AND f.deleted_at IS NULL
    )
    UPDATE bd_filas f SET
      valores = CASE WHEN ${limpio}::text = '' THEN f.valores - c.col
                     ELSE jsonb_set(f.valores, ARRAY[c.col], to_jsonb(${limpio}::text)) END,
      updated_at = now()
    FROM c
    WHERE f.id = c.fila_id AND c.col IS NOT NULL
  `);
}

