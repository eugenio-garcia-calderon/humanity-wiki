// ============================================================================
// TABLAS · LOS ENLACES — las celdas que apuntan a algo
// ============================================================================
// Cuatro destinos, una sola tabla: `bd_enlaces (columna, origen, clase,
// destino)`. Por qué una sola y no una por relación está razonado en
// `drizzle/0056_tablas_fase2_relaciones.sql`; en resumen, el `CLAUDE.md`
// prohíbe tablas de unión nuevas y una capa de relaciones las fabrica sin
// límite.
//
// LO QUE HACE ESTE MÓDULO Y LO QUE NO: guarda a quién apunta una celda y
// resuelve el nombre de lo apuntado para poder enseñarlo. La dirección
// CONTRARIA —«quién apunta a esto»— también sale de aquí, y es una consulta,
// nunca una segunda fila guardada.
import { sql } from 'drizzle-orm';
import { type Celda, VACIA, valor } from './celdas';

export type Clase = 'persona' | 'proyecto' | 'publicacion' | 'fila';

/** El tipo de columna → a qué clase de cosa apunta. */
export const CLASE_DE_TIPO: Record<string, Clase> = {
  persona: 'persona',
  proyecto: 'proyecto',
  publicacion: 'publicacion',
  relacion: 'fila',
};

/** Cómo se llama y dónde vive cada clase.
 *
 *  Está en una tabla y no repartido por el código porque `sql.raw()` solo puede
 *  usarse con identificadores de una lista cerrada — así lo exige el
 *  `src/server/CLAUDE.md`, y esta lista ES esa lista. Un destino nuevo se añade
 *  aquí y en el CHECK de la migración, en ningún otro sitio. */
const FUENTES: Record<Clase, { tabla: string; etiqueta: string; extra: string; filtro: string }> = {
  persona:     { tabla: 'users',             etiqueta: 'COALESCE(display_name, name, email)', extra: 'avatar_url',   filtro: 'archived_at IS NULL' },
  proyecto:    { tabla: 'proyectos',         etiqueta: 'titulo',                              extra: 'icono',        filtro: 'archived_at IS NULL AND deleted_at IS NULL' },
  publicacion: { tabla: 'knowledge_windows', etiqueta: 'title',                               extra: 'kind',         filtro: 'archived_at IS NULL AND deleted_at IS NULL' },
  fila:        { tabla: 'bd_filas',          etiqueta: "''",                                  extra: 'tabla_id',     filtro: 'archived_at IS NULL AND deleted_at IS NULL' },
};

/**
 * ¿Existe de verdad lo que se quiere enlazar?
 *
 * SE COMPRUEBA SIEMPRE, y no es paranoia: sin esto, una celda puede apuntar a
 * un identificador inventado y la tabla enseñaría un hueco sin poder decir por
 * qué está vacío. Es la regla de la casa —todo tiene que poder decir «eso no
 * existe» de forma distinguible de un resultado válido— aplicada al sitio donde
 * más barato es romperla.
 */
export async function existe(db: any, clase: Clase, id: string): Promise<boolean> {
  const f = FUENTES[clase];
  if (!f) return false;
  const r = await db.execute(sql`
    SELECT 1 FROM ${sql.raw(f.tabla)} WHERE id = ${id} AND ${sql.raw(f.filtro)} LIMIT 1
  `);
  return !!r.rows[0];
}

/** Escribe los enlaces de UNA celda, reemplazando los que hubiera.
 *
 *  Se borra y se vuelve a insertar en vez de calcular la diferencia: son tres o
 *  cuatro filas, la diferencia costaría más código del que ahorra, y así el
 *  orden que llega es exactamente el que queda. */
export async function comprobarEnlaces(
  db: any,
  clase: Clase,
  destinos: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const id of [...new Set(destinos.map(String))]) {
    if (!(await existe(db, clase, id))) {
      return { ok: false, error: `Eso a lo que apuntas no existe (${id}).` };
    }
  }
  return { ok: true };
}

/**
 * Escribe los enlaces. SE LLAMA SOLO DESPUÉS DE QUE TODO LO DEMÁS HAYA
 * VALIDADO: comprobar y escribir están separados a propósito, porque mezclarlos
 * dejaba escritos los enlaces buenos de una fila cuya celda de al lado había
 * fallado — media fila guardada, que es justo lo que la ruta promete no hacer.
 */
export async function guardarEnlaces(
  db: any,
  opciones: { columnaId: string; filaId: string; clase: Clase; destinos: string[]; actor: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { columnaId, filaId, clase, destinos, actor } = opciones;

  // Sin repetidos: dos veces el mismo enlace no significa nada y sí produce
  // sumas dobles en los agregados de la fase 5.
  const unicos = [...new Set(destinos.map(String))];

  await db.execute(sql`DELETE FROM bd_enlaces WHERE columna_id = ${columnaId} AND fila_origen = ${filaId}`);
  let orden = 0;
  for (const destino of unicos) {
    await db.execute(sql`
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      VALUES (${`BDE${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`},
              ${columnaId}, ${filaId}, ${clase}, ${destino}, ${orden++}, ${actor})
      ON CONFLICT (columna_id, fila_origen, clase, destino_id) DO NOTHING
    `);
  }
  return { ok: true };
}

export type Apuntado = { id: string; etiqueta: string; extra: any; clase: Clase; existe: boolean };

/**
 * Los enlaces de un conjunto de filas, ya con el nombre de lo apuntado.
 *
 * Se piden TODAS las filas de una vez y no una por una: con 500 filas y tres
 * columnas de relación, ir de una en una son 1.500 viajes a la base de datos
 * por cada vez que se pinta la tabla.
 */
export async function enlacesDe(
  db: any,
  filaIds: string[],
): Promise<Record<string, Record<string, Apuntado[]>>> {
  const salida: Record<string, Record<string, Apuntado[]>> = {};
  if (!filaIds.length) return salida;

  // `string_to_array` y no `= ANY(array)`: es el patrón que ya usa este
  // repositorio (`personas.ts`, `avisos.ts`) porque el controlador aplana el
  // array de JavaScript a un solo parámetro y Postgres recibe una cadena donde
  // esperaba una lista. Los identificadores de aquí no contienen comas nunca:
  // se generan con base 36 en mayúsculas.
  const r = await db.execute(sql`
    SELECT id, columna_id, fila_origen, clase, destino_id, orden
    FROM bd_enlaces
    WHERE fila_origen = ANY(string_to_array(${filaIds.join(',')}, ','))
    ORDER BY fila_origen, columna_id, orden
  `);
  const enlaces = r.rows as any[];
  if (!enlaces.length) return salida;

  // Se resuelven los nombres en un viaje por clase, no uno por enlace.
  const porClase = new Map<Clase, Set<string>>();
  for (const e of enlaces) {
    if (!porClase.has(e.clase)) porClase.set(e.clase, new Set());
    porClase.get(e.clase)!.add(e.destino_id);
  }

  const nombres = new Map<string, { etiqueta: string; extra: any }>();
  for (const [clase, ids] of porClase) {
    const f = FUENTES[clase];
    if (!f) continue;
    const q = await db.execute(sql`
      SELECT id, ${sql.raw(f.etiqueta)} AS etiqueta, ${sql.raw(f.extra)} AS extra
      FROM ${sql.raw(f.tabla)} WHERE id = ANY(string_to_array(${[...ids].join(',')}, ',')) AND ${sql.raw(f.filtro)}
    `);
    for (const fila of q.rows as any[]) {
      nombres.set(`${clase}:${fila.id}`, { etiqueta: fila.etiqueta ?? '', extra: fila.extra ?? null });
    }
  }

  for (const e of enlaces) {
    const clave = `${e.clase}:${e.destino_id}`;
    const encontrado = nombres.get(clave);
    (salida[e.fila_origen] ||= {});
    (salida[e.fila_origen][e.columna_id] ||= []).push({
      id: e.destino_id,
      clase: e.clase,
      // SI LO APUNTADO YA NO ESTÁ, SE DICE. Antes que enseñar un hueco mudo,
      // que es indistinguible de una celda vacía, se marca `existe: false` y se
      // pone una etiqueta que lo explica.
      etiqueta: encontrado ? encontrado.etiqueta : '(ya no existe)',
      extra: encontrado ? encontrado.extra : null,
      existe: !!encontrado,
    });
  }
  return salida;
}

/** La celda de una columna que apunta. Sin enlaces, está vacía —no es una lista
 *  vacía—, para que valga la misma regla que en todas las demás. */
export function celdaDeEnlaces(apuntados: Apuntado[] | undefined): Celda {
  if (!apuntados || !apuntados.length) return VACIA;
  return valor(apuntados.map(a => a.id));
}

/**
 * LA VUELTA: qué filas apuntan a esto.
 *
 * Es una consulta, nunca una fila guardada al revés. Ésta es la función sobre
 * la que se levantan los agregados de la fase 5, y por eso la migración crea el
 * índice por (clase, destino, columna): sin él, cada agregado recorrería la
 * tabla entera.
 */
export async function quienApuntaA(
  db: any,
  clase: Clase,
  destinoId: string,
  columnaId?: string,
): Promise<Array<{ fila_origen: string; columna_id: string }>> {
  const r = await db.execute(sql`
    SELECT fila_origen, columna_id FROM bd_enlaces
    WHERE clase = ${clase} AND destino_id = ${destinoId}
      AND (${columnaId || null}::text IS NULL OR columna_id = ${columnaId || null})
  `);
  return r.rows as any[];
}
