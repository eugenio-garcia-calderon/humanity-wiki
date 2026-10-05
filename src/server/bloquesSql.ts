import { sql } from 'drizzle-orm';

// ============================================================================
// LOS BLOQUES DE UNA PÁGINA, A CUALQUIER PROFUNDIDAD, EN SQL (2026-10-05)
// ============================================================================
// Desde que el editor anida bloques (un desplegable guarda los suyos en
// `bloques`), «¿esta página contiene la subpágina X?» ya no se puede
// preguntar mirando sólo la primera fila de `config->'bloques'`: una subpágina
// metida en un desplegable desaparecería del menú, de su sitio web y de su
// miga de pan.
//
// Esto devuelve la lista PLANA de todos los bloques (cada objeto con `tipo`,
// esté donde esté), así que las consultas de siempre —`@>` para «contiene»,
// `jsonb_array_elements` para recorrer— siguen igual cambiando sólo de dónde
// leen. `strict` + `silent` (el `true` del final): sin repetidos, y una
// página sin `bloques` da una lista vacía en vez de un error.
//
// `alias` es el nombre de la tabla en la consulta (`w`, `p`…), o '' si no hay.
export function bloquesDe(alias = '') {
  const col = alias ? `${alias}.config` : 'config';
  return sql.raw(`jsonb_path_query_array(COALESCE(${col}, '{}'::jsonb), 'strict $.bloques.** ? (@.type() == "object" && exists(@.tipo))', '{}', true)`);
}
