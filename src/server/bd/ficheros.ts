// ============================================================================
// TABLAS · LAS CELDAS QUE LLEVAN FICHEROS
// ============================================================================
// Imagen, vídeo y documento. Los bytes NO se guardan aquí: viven donde ya
// vivían, en `/data/uploads`, y se anotan en `archivos`, la misma tabla que usa
// el resto de la plataforma. Esta capa solo dice de qué fila y de qué columna
// cuelga cada uno.
//
// Reaprovechar ese almacén en vez de inventar uno es lo que evita tener dos
// sitios donde un fichero puede perderse, dos formas de calcular quién puede
// verlo, y una limpieza de huérfanos que tenga que saber de los dos.
import { sql } from 'drizzle-orm';
import { type Celda, VACIA, valor } from './celdas';

export type ClaseFichero = 'imagen' | 'video' | 'documento';

/** Qué acepta cada tipo de columna.
 *
 *  Se comprueba el `mime` que declara el fichero ya subido, no la extensión del
 *  nombre: un `.pdf` renombrado a `.png` seguiría siendo un PDF, y una celda de
 *  imagen que intenta pintarlo enseñaría un roto sin poder explicar por qué. */
const ACEPTA: Record<ClaseFichero, RegExp> = {
  imagen: /^image\//i,
  video: /^video\//i,
  // Un documento es todo lo demás: PDF, hojas de cálculo, texto, comprimidos.
  // Definirlo por exclusión y no por lista evita que subir un formato raro pero
  // legítimo sea imposible por un descuido nuestro.
  documento: /^(?!image\/|video\/).+/i,
};

const MOTIVO: Record<ClaseFichero, string> = {
  imagen: 'Esta columna solo admite imágenes.',
  video: 'Esta columna solo admite vídeos.',
  documento: 'Esta columna no admite imágenes ni vídeos: para eso usa una columna de imagen o de vídeo.',
};

export const CLASE_FICHERO: Record<string, ClaseFichero> = {
  imagen: 'imagen', video: 'video', documento: 'documento',
};

/**
 * Cuelga de una celda ficheros YA SUBIDOS.
 *
 * Recibe identificadores de `archivos`, no bytes. Subir sigue siendo cosa de
 * `/api/uploads`, que ya funciona: partir la subida en dos pasos —primero el
 * fichero, después de qué cuelga— es exactamente lo que hace `archivo.ts` y lo
 * que permite que un mismo fichero pueda colgar de sitios distintos sin
 * duplicar los bytes.
 */
export async function comprobarFicheros(
  db: any,
  clase: ClaseFichero,
  archivoIds: string[],
  usuarioId: string,
  esAdmin: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const id of [...new Set(archivoIds.map(String))]) {
    const r = await db.execute(sql`
      SELECT id, mime, subido_por FROM archivos WHERE id = ${id} AND archived_at IS NULL
    `);
    const a = r.rows[0] as any;
    if (!a) return { ok: false, error: `Ese archivo no existe (${id}).` };
    // Solo se puede colgar lo que has subido tú. Sin esto, conocer el
    // identificador de un fichero ajeno bastaría para meterlo en tu tabla y,
    // de paso, enseñárselo a quien pueda ver tu tabla.
    if (a.subido_por !== usuarioId && !esAdmin) {
      return { ok: false, error: 'Solo puedes usar archivos que hayas subido tú.' };
    }
    if (!ACEPTA[clase].test(String(a.mime || ''))) return { ok: false, error: MOTIVO[clase] };
  }
  return { ok: true };
}

/** Reemplaza los ficheros de una celda.
 *
 *  Los que salen se ARCHIVAN, no se borran: los bytes pueden estar colgando de
 *  otro sitio, y borrar la fila de `archivos` dejaría ese otro sitio apuntando
 *  a la nada. Constitución, regla 6. */
export async function guardarFicheros(
  db: any,
  opciones: { columnaId: string; filaId: string; archivoIds: string[] },
): Promise<void> {
  const { columnaId, filaId, archivoIds } = opciones;
  await db.execute(sql`
    UPDATE archivos SET archived_at = now()
    WHERE fila_id = ${filaId} AND columna_id = ${columnaId} AND archived_at IS NULL
  `);
  for (const id of [...new Set(archivoIds.map(String))]) {
    await db.execute(sql`
      UPDATE archivos SET fila_id = ${filaId}, columna_id = ${columnaId}, archived_at = NULL
      WHERE id = ${id}
    `);
  }
}

export type Fichero = { id: string; url: string; nombre: string; mime: string; bytes: number };

/** Los ficheros de un conjunto de filas, en un viaje. */
export async function ficherosDe(
  db: any,
  filaIds: string[],
): Promise<Record<string, Record<string, Fichero[]>>> {
  const salida: Record<string, Record<string, Fichero[]>> = {};
  if (!filaIds.length) return salida;
  // `string_to_array`, el patrón de la casa: el controlador aplana un array de
  // JavaScript a un solo parámetro y Postgres recibe una cadena.
  const r = await db.execute(sql`
    SELECT id, url, nombre, mime, bytes, fila_id, columna_id
    FROM archivos
    WHERE fila_id = ANY(string_to_array(${filaIds.join(',')}, ','))
      AND columna_id IS NOT NULL AND archived_at IS NULL
    ORDER BY created_at
  `);
  for (const a of r.rows as any[]) {
    (salida[a.fila_id] ||= {});
    (salida[a.fila_id][a.columna_id] ||= []).push({
      id: a.id, url: a.url, nombre: a.nombre, mime: a.mime, bytes: Number(a.bytes || 0),
    });
  }
  return salida;
}

/** Sin ficheros, la celda está VACÍA — no es una lista vacía. Misma regla que
 *  en todas las demás, para que quien lee no tenga que aprender excepciones. */
export function celdaDeFicheros(ficheros: Fichero[] | undefined): Celda {
  if (!ficheros || !ficheros.length) return VACIA;
  return valor(ficheros.map(f => f.id));
}
