// ============================================================================
// DIRECCIONES LEGIBLES PARA LAS FILAS DE UNA BASE DE DATOS (2026-10-18)
// ============================================================================
// Wikiproducts, SEO R2. Cada producto es una fila, y cada fila es una página
// que se abría en `/p/BDF…`: una dirección que no dice nada a quien la lee ni a
// un buscador. Ahora una base de datos puede llevar una PLANTILLA de dirección
// en `bd_tablas.config.ruta`:
//
//     "powerbanks/{Marca}-{Modelo}"      →  /powerbanks/anker-737-powercore-24k
//
// Lo fijo se escribe tal cual (la categoría es la propia tabla) y cada
// `{Columna}` se sustituye por el valor de esa columna en la fila, como se lee
// (una selección por su etiqueta), en minúsculas, sin acentos y con guiones.
// `{Nombre}` sirve aunque la columna del título se llame de otra forma.
//
// La dirección se guarda en `knowledge_windows.slug` de la página de la fila
// (único por dueño, el índice ya existe) y la que deja de valer pasa a
// `direcciones_anteriores`, que la convierte en un 301 para siempre.
//
// SE CALCULA AL LEER, NO AL ESCRIBIR. Una fila se escribe por cinco caminos
// (la tabla, la página, la API pública, el chat, las recurrencias) y poner un
// gancho en todos es la forma de olvidarse uno. `asegurarRutas` compara y sólo
// escribe lo que cambió; lo llaman el sitemap, la visita a `/p/:id` y
// `POST /api/bd/tablas/:id/rutas` (para quien carga datos en bloque).
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { bdInterno } from './bd';
import { slugDe } from '../components/sitio/sitioWeb';
import { formatear } from '../components/tablas/Celda';
import { enlacesDe, type Apuntado } from './bd/enlaces';

/** Cuántos tramos puede tener una dirección. `categoria/producto` son dos, y
 *  al menos dos: con uno solo chocaría con las páginas de siempre
 *  (`quien.humanity.wiki/mi-pagina`), que se buscan por otro camino. */
const MIN_TRAMOS = 2;
const MAX_TRAMOS = 3;

/** Primeros tramos que ya son de la aplicación (`App.tsx`, `AplicacionDeDominio`,
 *  `sitios.ts`): una plantilla no puede empezar por ellos. */
export const TRAMOS_RESERVADOS = new Set(['p', 'bd', 'buscar', 'pedido', 'producto', 'carpetas', 'proyectos', 'api', 'assets', 'uploads']);

/** Lo que se puede escribir en una plantilla: letras, números, guiones,
 *  barras y `{Columna}`. */
export function plantillaValida(p: unknown): string | null {
  if (typeof p !== 'string') return null;
  const t = p.trim().replace(/^\/+|\/+$/g, '');
  if (!t || t.length > 200 || !/\{[^}]+\}/.test(t)) return null;
  const tramos = t.split('/');
  if (tramos.length < MIN_TRAMOS || tramos.length > MAX_TRAMOS || tramos.some(x => !x.trim())) return null;
  if (TRAMOS_RESERVADOS.has(slugDe(tramos[0]))) return null;
  return t;
}

/** La dirección de una fila según la plantilla, o `null` si le falta algo. */
export function rutaDeFila(
  plantilla: string,
  columnas: Array<{ id: string; nombre: string; tipo: string; opciones?: any; config?: any }>,
  valores: Record<string, any>,
  titulo: string,
  /** Lo que apuntan sus columnas de relación (`enlacesDe`): la marca de un
   *  producto es otra fila, y en la dirección va su nombre. */
  apuntados: Record<string, Apuntado[]> = {},
): string | null {
  const porNombre = new Map(columnas.map(c => [slugDe(c.nombre), c]));
  let falta = false;
  const tramos = plantilla.split('/').map(tramo => {
    const lleno = tramo.replace(/\{([^}]+)\}/g, (_, nombre: string) => {
      const v = valor(nombre);
      if (!slugDe(v)) falta = true;
      return v;
    });
    return slugDe(lleno);
  });
  // Una columna vacía (un producto sin marca todavía) no deja una dirección a
  // medias: la ficha sigue en `/p/:id` hasta que estén todos sus datos.
  if (falta || tramos.some(t => !t) || TRAMOS_RESERVADOS.has(tramos[0])) return null;
  return tramos.join('/');

  function valor(nombre: string): string {
    const clave = slugDe(nombre);
    const c = porNombre.get(clave);
    if (!c) return clave === 'nombre' || clave === 'titulo' ? titulo : '';
    const ap = (apuntados[c.id] || []).find(a => a.existe !== false);
    if (ap) return String(ap.etiqueta || '');
    const v = valores?.[c.id];
    if (v !== null && typeof v === 'object') return '';
    if (v === undefined || v === null || v === '') return '';
    return formatear({ estado: 'ok', valor: v }, c as any);
  }
}

/**
 * Pone al día las direcciones de las filas de una tabla (o de una sola).
 * Devuelve cuántas cambió. Sin plantilla, no toca nada.
 */
export async function asegurarRutas(db: any, tablaId: string, soloFila?: string): Promise<number> {
  const t = (await db.execute(sql`
    SELECT config FROM bd_tablas WHERE id = ${tablaId} AND deleted_at IS NULL AND archived_at IS NULL
  `)).rows[0] as any;
  const plantilla = plantillaValida(t?.config?.ruta);
  if (!plantilla) return 0;
  const columnas = (await db.execute(sql`
    SELECT id, nombre, tipo, opciones, config FROM bd_columnas
    WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
  `)).rows as any[];
  const colTitulo = columnas.find(c => c.tipo === 'texto')?.id;
  const filas = (await db.execute(sql`
    SELECT f.id, f.valores, w.id AS pagina_id, w.slug, w.title, w.creator_user_id
    FROM bd_filas f JOIN knowledge_windows w ON w.id = f.pagina_id AND w.deleted_at IS NULL
    WHERE f.tabla_id = ${tablaId} AND f.deleted_at IS NULL AND f.archived_at IS NULL
      ${soloFila ? sql`AND f.id = ${soloFila}` : sql``}
  `)).rows as any[];

  const enlaces = await enlacesDe(db, filas.map(f => f.id));

  let cambios = 0;
  for (const f of filas) {
    const titulo = String((colTitulo && f.valores?.[colTitulo]) || f.title || '');
    const quiere = rutaDeFila(plantilla, columnas, f.valores || {}, titulo, enlaces[f.id] || {});
    if (!quiere) continue;
    // Si ya tiene esa (o esa con su sufijo de desempate), no se toca.
    if (f.slug && (f.slug === quiere || new RegExp(`^${quiere.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$`).test(f.slug))) continue;
    try {
      const libre = await direccionLibre(db, f.creator_user_id, quiere, f.pagina_id);
      if (f.slug) {
        await db.execute(sql`
          INSERT INTO direcciones_anteriores (duenyo_user_id, slug, pagina_id)
          VALUES (${f.creator_user_id}, ${f.slug}, ${f.pagina_id})
          ON CONFLICT (duenyo_user_id, slug) DO UPDATE SET pagina_id = EXCLUDED.pagina_id, created_at = now()
        `);
      }
      await db.execute(sql`UPDATE knowledge_windows SET slug = ${libre}, updated_at = updated_at WHERE id = ${f.pagina_id}`);
      // Si la nueva era la vieja de esta misma página, ya no es «anterior».
      await db.execute(sql`DELETE FROM direcciones_anteriores WHERE duenyo_user_id = ${f.creator_user_id} AND slug = ${libre}`);
      cambios++;
    } catch (e) {
      // Dos visitas a la vez pueden querer la misma dirección: la segunda
      // choca con el índice único y esta fila se queda como estaba, hasta la
      // próxima vez. No tumba las demás.
      console.error('rutasFila:', f.pagina_id, e);
    }
  }
  return cambios;
}

/** La dirección, o la misma con `-2`, `-3`… si otra página del mismo dueño
 *  ya la tiene (o la tuvo: una dirección vieja sigue siendo de su página). */
async function direccionLibre(db: any, duenyo: string, base: string, paginaId: string): Promise<string> {
  for (let n = 1; n < 100; n++) {
    const cand = n === 1 ? base : `${base}-${n}`;
    const r = (await db.execute(sql`
      SELECT 1 FROM knowledge_windows WHERE creator_user_id = ${duenyo} AND slug = ${cand} AND id <> ${paginaId}
      UNION ALL
      SELECT 1 FROM direcciones_anteriores WHERE duenyo_user_id = ${duenyo} AND slug = ${cand} AND pagina_id <> ${paginaId}
      LIMIT 1
    `)).rows[0];
    if (!r) return cand;
  }
  return `${base}-${paginaId.toLowerCase()}`;
}

/** Si la página es la fila de una tabla con plantilla, pone al día SU dirección. */
export async function asegurarRutaDePagina(db: any, paginaId: string): Promise<void> {
  const f = (await db.execute(sql`
    SELECT id, tabla_id FROM bd_filas WHERE pagina_id = ${paginaId} AND deleted_at IS NULL LIMIT 1
  `)).rows[0] as any;
  if (f) await asegurarRutas(db, f.tabla_id, f.id);
}

/** `POST /api/bd/tablas/:id/rutas`: pone al día las direcciones de toda una
 *  tabla de una vez, para quien acaba de cargar datos en bloque. Pide poder
 *  escribir en la tabla, como cambiar sus filas. */
export function registrarRutasFila(app: Express, db: any) {
  app.post('/api/bd/tablas/:id/rutas', async (req: Request, res: Response) => {
    try {
      if (!bdInterno.puedeConTabla) return res.status(503).json({ error: 'Las bases de datos no están disponibles.' });
      const permiso = await bdInterno.puedeConTabla(req, String(req.params.id), true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });
      const plantilla = plantillaValida(permiso.tabla?.config?.ruta);
      if (!plantilla) {
        return res.status(400).json({ error: 'Esta base de datos no tiene plantilla de dirección (config.ruta), o no es válida: dos o tres tramos y al menos un {Columna}, p. ej. «powerbanks/{Marca}-{Modelo}».' });
      }
      const cambiadas = await asegurarRutas(db, String(req.params.id));
      res.json({ plantilla, cambiadas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
