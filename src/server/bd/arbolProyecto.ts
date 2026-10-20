import { sql } from 'drizzle-orm';
import { bloquesDe } from '../bloquesSql';

// ============================================================================
// LAS BASES DE DATOS DEL MISMO PROYECTO (2026-10-20, Eugenio)
// ============================================================================
// «Al enlazar una base de datos con otra me salen tantas que no encuentro la
// del proyecto. Que salgan solo las que cuelgan de la misma página madre, no
// las de otra raíz del menú; y un botón para conectar con otros proyectos.»
//
// El «proyecto» es el árbol del menú (`/api/paginas/arbol`): una página, sus
// subpáginas (bloques «Página») y las páginas de las entradas de sus bases de
// datos, a cualquier profundidad. Para una tabla:
//   1. se sube desde la página donde vive (su bloque «Base de datos») por sus
//      madres —la página que la tiene como subpágina, o, si es la página de una
//      entrada, la página de la tabla de esa entrada— hasta la raíz;
//   2. se baja desde la raíz por todo lo que cuelga de ella y se recogen las
//      bases de datos que aparecen.
// Con topes, para que una página enorme no se coma el servidor.

const MAX_SUBIDA = 40;
const MAX_PAGINAS = 3000;

/** Todos los bloques de una configuración, estén donde estén (desplegables, columnas…). */
function recorrer(nodo: any, fn: (b: any) => void) {
  if (Array.isArray(nodo)) { for (const x of nodo) recorrer(x, fn); return; }
  if (!nodo || typeof nodo !== 'object') return;
  if (typeof nodo.tipo === 'string') fn(nodo);
  for (const v of Object.values(nodo)) if (v && typeof v === 'object') recorrer(v, fn);
}

/** La página donde vive una tabla: mejor una página normal que la de una entrada. */
async function hogarDe(db: any, tablaId: string): Promise<string | null> {
  const r = await db.execute(sql`
    SELECT p.id, EXISTS (SELECT 1 FROM bd_filas f WHERE f.pagina_id = p.id) AS es_fila FROM knowledge_windows p
    WHERE p.kind = 'pagina' AND p.deleted_at IS NULL AND p.archived_at IS NULL
      AND ${bloquesDe('p')} @> jsonb_build_array(jsonb_build_object('tabla_id', ${tablaId}::text))
    ORDER BY 2, p.created_at LIMIT 1
  `);
  return (r.rows[0] as any)?.id || null;
}

/** La madre de una página en el árbol del menú, o null si es raíz. */
async function madreDe(db: any, paginaId: string): Promise<string | null> {
  const sub = await db.execute(sql`
    SELECT p.id FROM knowledge_windows p
    WHERE p.kind = 'pagina' AND p.deleted_at IS NULL AND p.archived_at IS NULL AND p.id <> ${paginaId}
      AND ${bloquesDe('p')} @> jsonb_build_array(jsonb_build_object('tipo', 'subpagina', 'entityId', ${paginaId}::text))
    ORDER BY p.created_at LIMIT 1
  `);
  if (sub.rows[0]) return (sub.rows[0] as any).id;
  const fila = (await db.execute(sql`SELECT tabla_id FROM bd_filas WHERE pagina_id = ${paginaId} AND deleted_at IS NULL LIMIT 1`)).rows[0] as any;
  return fila ? hogarDe(db, fila.tabla_id) : null;
}

/** Las tablas del árbol al que pertenece `tablaId`, y la raíz. `null` si la tabla no está en ninguna página. */
export async function tablasDelProyecto(db: any, tablaId: string): Promise<{ raiz: { id: string; titulo: string }; tablas: string[] } | null> {
  const hogar = await hogarDe(db, tablaId);
  if (!hogar) return null;
  // 1. Subir hasta la raíz.
  let raiz = hogar;
  const vistas = new Set([hogar]);
  for (let i = 0; i < MAX_SUBIDA; i++) {
    const m = await madreDe(db, raiz);
    if (!m || vistas.has(m)) break;
    vistas.add(m); raiz = m;
  }
  // 2. Bajar por todo lo que cuelga de la raíz, nivel a nivel.
  const tablas = new Set<string>();
  const visitadas = new Set<string>([raiz]);
  let nivel = [raiz];
  while (nivel.length && visitadas.size < MAX_PAGINAS) {
    const filas = (await db.execute(sql`
      SELECT id, config FROM knowledge_windows
      WHERE id IN (${sql.join(nivel.map(i => sql`${i}`), sql`, `)}) AND deleted_at IS NULL AND archived_at IS NULL
    `)).rows as any[];
    const siguientes: string[] = [];
    const nuevasTablas: string[] = [];
    for (const f of filas) {
      recorrer([f.config?.bloques, f.config?.botones], b => {
        if (b.tipo === 'subpagina' && typeof b.entityId === 'string' && !visitadas.has(b.entityId)) { visitadas.add(b.entityId); siguientes.push(b.entityId); }
        if (typeof b.tabla_id === 'string' && !tablas.has(b.tabla_id)) { tablas.add(b.tabla_id); nuevasTablas.push(b.tabla_id); }
      });
    }
    // Las páginas de las entradas de esas tablas también cuelgan del árbol.
    if (nuevasTablas.length) {
      const pags = (await db.execute(sql`
        SELECT pagina_id FROM bd_filas
        WHERE tabla_id IN (${sql.join(nuevasTablas.map(i => sql`${i}`), sql`, `)}) AND pagina_id IS NOT NULL AND deleted_at IS NULL
        LIMIT ${MAX_PAGINAS}
      `)).rows as any[];
      for (const p of pags) if (!visitadas.has(p.pagina_id) && visitadas.size < MAX_PAGINAS) { visitadas.add(p.pagina_id); siguientes.push(p.pagina_id); }
    }
    nivel = siguientes.slice(0, MAX_PAGINAS);
  }
  const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${raiz}`)).rows[0] as any;
  return { raiz: { id: raiz, titulo: t?.title || 'Sin título' }, tablas: [...tablas] };
}
