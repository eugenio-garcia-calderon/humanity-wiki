import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { paginaVisible, sitioDePagina } from './sitios';
import { todosLosBloques } from '../utils/bloques';

// ============================================================================
// LA RUTA DE UNA ENTRADA POR SUS RELACIONES (2026-10-26, Eugenio)
// ============================================================================
// «He pinchado en Movilidad, luego en un objetivo y luego en un indicador, y la
// ruta decía “Evolución de la Humanidad › Objetivos e indicadores”: está mal.
// Debería ser Sistemas de la Humanidad (la portada) › Movilidad › el objetivo
// › el indicador, con su icono y su desplegable para cambiar.»
//
// Se sube de la fila de la página por su relación de un solo valor (el
// indicador → su objetivo → su sistema) hasta llegar a una base de datos de la
// portada del sitio. Cada paso lleva sus hermanos (los que cuelgan del mismo
// padre) para el desplegable. Lo pinta `RutaRelaciones.tsx`.

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
type Opcion = { id: string; nombre: string; pagina_id: string; icono: string | null };

async function datosFila(db: any, filaId: string) {
  return (await db.execute(sql`
    SELECT f.id, f.tabla_id, f.pagina_id, f.valores, k.title, COALESCE(k.config->>'portada', k.config->>'icono') AS icono
    FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id AND k.deleted_at IS NULL
    WHERE f.id = ${filaId} AND f.deleted_at IS NULL
  `)).rows[0] as any;
}

async function columnasDe(db: any, tablaId: string) {
  return (await db.execute(sql`SELECT id, nombre, tipo, config, orden FROM bd_columnas WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at`)).rows as any[];
}

/** El nombre corto de una fila: su «Nombre en la ruta» si la tabla lo tiene; si no, el título de su página. */
const nombreCorto = (cols: any[], valores: any, titulo: string) => {
  const c = cols.find(x => x.tipo === 'texto' && /nombre en la ruta/.test(plano(x.nombre)));
  const v = c ? String(valores?.[c.id] || '').trim() : '';
  return v || titulo || '';
};

async function hermanos(db: any, tablaId: string, cols: any[], columnaPadre: string | null, padreId: string | null): Promise<Opcion[]> {
  const r = (await db.execute(columnaPadre && padreId ? sql`
    SELECT f.id, f.pagina_id, f.valores, k.title, COALESCE(k.config->>'portada', k.config->>'icono') AS icono
    FROM bd_enlaces e JOIN bd_filas f ON f.id = e.fila_origen AND f.deleted_at IS NULL AND f.oculta = false
    JOIN knowledge_windows k ON k.id = f.pagina_id AND k.deleted_at IS NULL
    WHERE e.columna_id = ${columnaPadre} AND e.destino_id = ${padreId} ORDER BY f.orden, k.title LIMIT 80
  ` : sql`
    SELECT f.id, f.pagina_id, f.valores, k.title, COALESCE(k.config->>'portada', k.config->>'icono') AS icono
    FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id AND k.deleted_at IS NULL
    WHERE f.tabla_id = ${tablaId} AND f.deleted_at IS NULL AND f.oculta = false ORDER BY f.orden, k.title LIMIT 80
  `)).rows as any[];
  return r.map(x => ({ id: String(x.id), pagina_id: String(x.pagina_id), nombre: nombreCorto(cols, x.valores, x.title), icono: x.icono || null }));
}

export function registrarRutaRelaciones(app: Express, db: any) {
  app.get('/api/ruta-relaciones/:paginaId', async (req: Request, res: Response) => {
    try {
      const paginaId = String(req.params.paginaId);
      if (!(await paginaVisible(db, paginaId))) return res.json({ pasos: [] });
      const sitio = await sitioDePagina(db, paginaId);
      if (!sitio) return res.json({ pasos: [] });
      const raiz = (await db.execute(sql`SELECT config FROM knowledge_windows WHERE id = ${sitio.raizId}`)).rows[0] as any;
      const tablasRaiz = new Set(todosLosBloques(raiz?.config?.bloques || [])
        .filter((b: any) => b?.tipo === 'basedatos' && b.tabla_id).map((b: any) => String(b.tabla_id)));
      const inicio = (await db.execute(sql`SELECT id FROM bd_filas WHERE pagina_id = ${paginaId} AND deleted_at IS NULL LIMIT 1`)).rows[0] as any;
      if (!inicio) return res.json({ pasos: [] });

      const pasos: any[] = [];
      const vistos = new Set<string>();
      let fila = await datosFila(db, inicio.id);
      let llegada = false;
      while (fila && !vistos.has(fila.id) && pasos.length < 6) {
        vistos.add(fila.id);
        const cols = await columnasDe(db, fila.tabla_id);
        const paso: any = { fila_id: fila.id, pagina_id: fila.pagina_id, titulo: fila.title || '', nombre: nombreCorto(cols, fila.valores, fila.title), icono: fila.icono || null, opciones: [] };
        pasos.unshift(paso);
        if (tablasRaiz.has(fila.tabla_id)) {
          // Arriba del todo (un sistema): sus hermanos son todos los de su base de datos.
          paso.opciones = await hermanos(db, fila.tabla_id, cols, null, null);
          llegada = true;
          break;
        }
        // Su padre: por una relación de un solo valor. Primero la más concreta: la que va a una tabla que a su
        // vez cuelga de la portada (el indicador → su objetivo, no directamente a su sistema); después, la que va
        // a la portada; y al final las demás (un territorio no es un padre en esta ruta).
        const candidatas = cols.filter(c => c.tipo === 'relacion' && c.config?.tabla_destino && c.config.tabla_destino !== fila.tabla_id
          && c.config?.varios === false && !c.config?.inversa_de);
        const rango = new Map<string, number>();
        for (const c of candidatas) {
          const d = String(c.config.tabla_destino);
          if (tablasRaiz.has(d)) { rango.set(c.id, 1); continue; }
          const sube = (await columnasDe(db, d)).some(x => x.tipo === 'relacion' && x.config?.varios === false && !x.config?.inversa_de && tablasRaiz.has(String(x.config?.tabla_destino)));
          rango.set(c.id, sube ? 0 : 2);
        }
        candidatas.sort((a, b) => (rango.get(a.id) ?? 2) - (rango.get(b.id) ?? 2));
        let padre: any = null, columna: any = null;
        for (const c of candidatas) {
          const e = (await db.execute(sql`SELECT destino_id FROM bd_enlaces WHERE columna_id = ${c.id} AND fila_origen = ${fila.id} ORDER BY orden LIMIT 1`)).rows[0] as any;
          if (e) { padre = await datosFila(db, String(e.destino_id)); columna = c; if (padre) break; }
        }
        if (!padre) break;
        paso.opciones = await hermanos(db, fila.tabla_id, cols, columna.id, padre.id);
        fila = padre;
      }
      // Solo si se llega a la portada: si no, la ruta no diría la verdad (mejor las migas de siempre).
      if (!llegada) return res.json({ pasos: [] });
      res.set('Cache-Control', 'private, max-age=60');
      res.json({ raiz: { pagina_id: sitio.raizId, titulo: String(sitio.config?.rutaRaiz || 'Inicio') }, pasos });
    } catch (e: any) { console.error('ruta por relaciones:', e); res.status(500).json({ error: e.message }); }
  });
}
