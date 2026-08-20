// ============================================================================
// GUARDAR LO QUE HABÍA ANTES (B70, 2026-08-21)
// ============================================================================
// La plataforma tenía `entity_history` bien hecha —instantánea completa, qué
// había antes, quién lo cambió— y una sola forma de escribirla: la ruta
// genérica `/api/data/:entity` de `server.ts`. El editor de páginas NO pasa por
// ahí: guarda con `PUT /api/windows/:id`, que subía `version = version + 1` sin
// escribir ninguna instantánea.
//
// EL RESULTADO ERA UNA MENTIRA CON NÚMERO: la versión 47 de una página existía
// como contador y no como contenido. Y el editor GUARDA SOLO, cada 1,2
// segundos, sin que nadie pulse nada. Junta las dos cosas —autoguardado y cero
// historial— y sale que seleccionas un párrafo, se te va el dedo, escribes
// encima, y a los pocos segundos eso está en el servidor y lo anterior no
// existe en ninguna parte.
//
// ESTE MÓDULO NO ES UNA SEGUNDA IMPLEMENTACIÓN. `server.ts` delega aquí, así
// que la instantánea se escribe en un solo sitio y no hay dos formatos que
// puedan separarse con el tiempo.
import { sql } from 'drizzle-orm';

export type Operacion = 'create' | 'update' | 'archive' | 'restore';

/** Cada cuánto se guarda una instantánea del MISMO editor sobre la MISMA cosa.
 *
 *  El editor guarda cada 1,2 s. Una instantánea por guardado serían ~1.500
 *  copias en media hora de escritura —y una página pesa 611 bytes de media, o
 *  sea casi un mega por sesión— para poder volver a mil versiones que se
 *  diferencian en una letra. No sirven de nada: nadie quiere «como estaba hace
 *  1,2 segundos», quiere «como estaba antes de ponerme a escribir».
 *
 *  Con dos minutos, media hora de trabajo deja 15 instantáneas y unos 10 KB, y
 *  siempre queda guardado el estado ANTERIOR a cada tanda de cambios, que es lo
 *  que se quiere recuperar. */
export const AGRUPAR_MINUTOS = 2;

/**
 * Anota en `entity_history` lo que había y lo que hay.
 *
 * `previo` es la fila LEÍDA ANTES de actualizar. Es el dato que de verdad
 * importa: la instantánea de después se puede volver a mirar en la tabla, pero
 * lo de antes, si no se guarda aquí, no está en ningún sitio.
 *
 * Con `agrupar`, no escribe si esa misma persona ya dejó una instantánea de esa
 * misma cosa hace menos de `AGRUPAR_MINUTOS`. Se usa desde los guardados
 * automáticos; los cambios que alguien pide a mano no se agrupan.
 *
 * NUNCA REVIENTA LA OPERACIÓN QUE LA LLAMA. Si falla el historial, el usuario
 * ya ha guardado su texto y decirle que no se ha guardado sería mentirle. Se
 * anota en el registro del servidor y se sigue.
 */
export async function registrarHistorial(
  db: any,
  opciones: {
    entidad: string;
    tabla: string;
    id: string;
    operacion: Operacion;
    previo: any | null;
    actor: string | null;
    agrupar?: boolean;
  },
): Promise<boolean> {
  const { entidad, tabla, id, operacion, previo, actor, agrupar } = opciones;
  try {
    if (agrupar) {
      const reciente = await db.execute(sql`
        SELECT 1 FROM entity_history
        WHERE entity_type = ${entidad} AND entity_id = ${id}
          AND changed_by IS NOT DISTINCT FROM ${actor}
          AND changed_at > now() - (${AGRUPAR_MINUTOS} || ' minutes')::interval
        LIMIT 1
      `);
      if (reciente.rows.length) return false;
    }

    const fila = await db.execute(sql`SELECT * FROM ${sql.raw(tabla)} WHERE id = ${id}`);
    const instantanea = fila.rows[0] as any;
    if (!instantanea) return false;

    await db.execute(sql`
      INSERT INTO entity_history (entity_type, entity_id, entity_uuid, version, operation, snapshot, previous, changed_by)
      VALUES (
        ${entidad}, ${id}, ${instantanea.uuid ?? null}, ${instantanea.version ?? 1}, ${operacion},
        ${JSON.stringify(instantanea)}::jsonb,
        ${previo ? JSON.stringify(previo) : null}::jsonb,
        ${actor}
      )
    `);
    return true;
  } catch (e: any) {
    console.error('historial:', e?.cause?.message || e?.message || e);
    return false;
  }
}
