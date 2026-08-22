// ============================================================================
// BASES DE DATOS DE USUARIO — CAPA 1 (2026-08-21)
// ============================================================================
// Hasta hoy la plataforma no tenía base de datos de usuario: tenía páginas con
// bloques y un tablero con 18 campos escritos en el código. El bloque «tabla»
// del editor es texto plano — nada ahí sabe que 620 es un número, así que no se
// puede sumar, ni ordenar, ni comparar, ni validar.
//
// El criterio de aceptación de todo el mes es montar aquí el «astillero solar»
// que existe hoy en Notion: siete bases enlazadas con agregados y fórmulas de
// veredicto. Esta capa es la primera de tres — tipos, luego relaciones, luego
// fórmulas y agregados — y las decisiones de forma están razonadas en la
// migración `drizzle/0053_bases_de_datos_de_usuario.sql`.
//
// ── LOS TRES ESTADOS DE UNA CELDA, Y POR QUÉ DESDE HOY ──────────────────────
// Hacia fuera una celda NUNCA es un `null` pelado. Es siempre un objeto con su
// estado: `vacia`, `ok`, `sin_calcular` o `error`. Hoy solo pueden darse los
// dos primeros —no hay columnas calculadas hasta la capa 3—, y aun así el
// contrato nace con los cuatro.
//
// El motivo es que si la capa 1 devuelve `null` para «vacía», el día que
// aparezcan «sin calcular» y «con error» hay que cambiar TODOS los clientes ya
// escritos contra ella. Cuesta cero ahora y es imposible después. Y es además
// la regla de la casa aplicada al modelo de datos: una celda tiene que poder
// decir «no lo sé» de forma distinguible de un resultado válido — un cero que
// en realidad significa «no se pudo calcular» es exactamente el tipo de dato
// incorrecto presentado como correcto que este proyecto ya ha pagado caro.
//
// ── PERMISOS ────────────────────────────────────────────────────────────────
// Se preguntan SIEMPRE al proyecto que contiene la tabla, nunca a la tabla y
// nunca a la fila. Es la forma de `archivo.ts`: así no pueden existir dos
// verdades sobre quién ve qué, y un proyecto que pasa de privado a público
// arrastra sus tablas sin migrar nada.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { registrarHistorial } from './historial';
import { TIPOS, tipar, type Tipo } from './bd/tipos';
import { celdasDe, type Celda } from './bd/celdas';

const nid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Se re-exportan: hasta la fase 1 vivían en este fichero.
export { tipar, TIPOS } from './bd/tipos';
export { celdasDe } from './bd/celdas';
export type { Celda } from './bd/celdas';

// ── RUTAS ───────────────────────────────────────────────────────────────────

export function registerBdRoutes(app: Express, db: any) {
  /** Toda ruta de escritura comprueba el rol. Saltarse esto ya dejó un agujero
   *  abierto en producción una vez (`CLAUDE.md`, prohibición 3). */
  const exigeSesion = (req: Request, res: Response): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    return true;
  };

  /**
   * ¿Puede esta persona ver o escribir en esta tabla?
   *
   * Se pregunta por el PROYECTO que la contiene, nunca por la tabla. Devuelve
   * la tabla si puede, o el mensaje de por qué no.
   */
  async function puedeConTabla(req: Request, tablaId: string, escribir: boolean): Promise<{ tabla: any } | { error: string; codigo: number }> {
    const r = await db.execute(sql`
      SELECT t.*, p.creador_user_id AS proyecto_creador, p.publico AS proyecto_publico
      FROM bd_tablas t
      LEFT JOIN proyectos p ON p.id = t.proyecto_id
      WHERE t.id = ${tablaId} AND t.archived_at IS NULL AND t.deleted_at IS NULL
    `);
    const t = r.rows[0] as any;
    if (!t) return { error: 'Esa tabla no existe.', codigo: 404 };

    const yo = req.user?.id || null;
    const admin = (req.user?.roleLevel ?? 0) >= 4;
    if (admin) return { tabla: t };

    // Sin proyecto, la tabla es de quien la creó.
    const dueno = t.proyecto_id ? t.proyecto_creador : t.creador_user_id;
    if (dueno && dueno === yo) return { tabla: t };

    if (escribir) return { error: 'Solo quien creó el proyecto puede escribir en sus tablas.', codigo: 403 };
    if (t.proyecto_id ? t.proyecto_publico : false) return { tabla: t };
    return { error: 'No tienes acceso a esa tabla.', codigo: 403 };
  }

  const columnasDe = async (tablaId: string) => {
    const r = await db.execute(sql`
      SELECT id, nombre, tipo, opciones, config, orden
      FROM bd_columnas WHERE tabla_id = ${tablaId} AND archived_at IS NULL
      ORDER BY orden, created_at
    `);
    return r.rows as any[];
  };

  // ── LAS TABLAS ────────────────────────────────────────────────────────────

  /** Mis tablas, o las de un proyecto. */
  app.get('/api/bd/tablas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const proyecto = req.query.proyecto_id ? String(req.query.proyecto_id) : null;
      const r = await db.execute(sql`
        SELECT t.id, t.titulo, t.icono, t.descripcion, t.proyecto_id, t.creador_user_id, t.created_at,
               (SELECT count(*) FROM bd_filas f WHERE f.tabla_id = t.id AND f.archived_at IS NULL AND f.deleted_at IS NULL) AS filas
        FROM bd_tablas t
        LEFT JOIN proyectos p ON p.id = t.proyecto_id
        WHERE t.archived_at IS NULL AND t.deleted_at IS NULL
          AND (${proyecto}::text IS NULL OR t.proyecto_id = ${proyecto})
          AND (t.creador_user_id = ${req.user!.id} OR p.creador_user_id = ${req.user!.id} OR p.publico = true)
        ORDER BY t.orden, t.created_at DESC
      `);
      res.json(r.rows);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Una tabla entera: definición, columnas y filas ya en forma de celdas. */
  app.get('/api/bd/tablas/:id', async (req: Request, res: Response) => {
    try {
      const permiso = await puedeConTabla(req, req.params.id, false);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const columnas = await columnasDe(req.params.id);
      const f = await db.execute(sql`
        SELECT id, valores, pagina_id, orden, created_at, updated_at
        FROM bd_filas
        WHERE tabla_id = ${req.params.id} AND archived_at IS NULL AND deleted_at IS NULL
        ORDER BY orden, created_at
      `);

      res.json({
        tabla: {
          id: permiso.tabla.id, titulo: permiso.tabla.titulo, icono: permiso.tabla.icono,
          descripcion: permiso.tabla.descripcion, proyecto_id: permiso.tabla.proyecto_id,
        },
        columnas,
        filas: (f.rows as any[]).map(fila => ({
          id: fila.id,
          pagina_id: fila.pagina_id,
          orden: fila.orden,
          // Celdas etiquetadas, nunca `null` pelado. Ver la nota de arriba.
          celdas: celdasDe(fila.valores || {}, columnas),
        })),
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Crear una tabla. Nace con una columna de texto: una tabla sin ninguna
   *  columna no se puede ni mirar, y obligar a crear la primera a mano es una
   *  pantalla vacía como primera impresión. */
  app.post('/api/bd/tablas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const d = req.body || {};
      if (!d.titulo || !String(d.titulo).trim()) return res.status(400).json({ error: 'La tabla necesita un título.' });

      if (d.proyecto_id) {
        const p = await db.execute(sql`SELECT creador_user_id FROM proyectos WHERE id = ${d.proyecto_id} AND archived_at IS NULL`);
        const fila = p.rows[0] as any;
        if (!fila) return res.status(404).json({ error: 'Ese proyecto no existe.' });
        if (fila.creador_user_id !== req.user!.id && (req.user!.roleLevel ?? 0) < 4) {
          return res.status(403).json({ error: 'Solo quien creó el proyecto puede añadirle tablas.' });
        }
      }

      const id = nid('BDT');
      await db.execute(sql`
        INSERT INTO bd_tablas (id, titulo, icono, descripcion, proyecto_id, creador_user_id, created_by, updated_by)
        VALUES (${id}, ${String(d.titulo).trim().slice(0, 200)}, ${d.icono || null}, ${d.descripcion || null},
                ${d.proyecto_id || null}, ${req.user!.id}, ${req.user!.id}, ${req.user!.id})
      `);
      await db.execute(sql`
        INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, orden)
        VALUES (${nid('BDC')}, ${id}, 'Nombre', 'texto', 0)
      `);
      await registrarHistorial(db, { entidad: 'bd_tabla', tabla: 'bd_tablas', id, operacion: 'create', previo: null, actor: req.user!.id });
      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LAS COLUMNAS ──────────────────────────────────────────────────────────

  /** Añadir una columna. */
  app.post('/api/bd/tablas/:id/columnas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const d = req.body || {};
      const tipo = String(d.tipo || 'texto') as Tipo;
      if (!TIPOS.includes(tipo)) return res.status(400).json({ error: `Tipo no válido. Los de esta capa son: ${TIPOS.join(', ')}.` });
      if (!d.nombre || !String(d.nombre).trim()) return res.status(400).json({ error: 'La columna necesita un nombre.' });

      // CADA OPCIÓN LLEVA SU PROPIO `id`, generado aquí y no derivado del
      // texto: si el id saliera del nombre, renombrar la opción cambiaría su
      // identidad y con ella el significado de las filas que la usan.
      const opciones = Array.isArray(d.opciones)
        ? d.opciones.slice(0, 100).map((o: any) => ({
            id: String(o?.id || nid('OPT')),
            label: String(o?.label ?? o ?? '').slice(0, 100),
            color: o?.color || null,
          })).filter((o: any) => o.label)
        : [];

      const ultima = await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_columnas WHERE tabla_id = ${req.params.id}`);
      const id = nid('BDC');
      await db.execute(sql`
        INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, config, orden)
        VALUES (${id}, ${req.params.id}, ${String(d.nombre).trim().slice(0, 120)}, ${tipo},
                ${JSON.stringify(opciones)}::jsonb, ${JSON.stringify(d.config || {})}::jsonb,
                ${Number((ultima.rows[0] as any).m) + 1})
      `);
      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Renombrar una columna, cambiar sus opciones o su orden.
   *
   *  RENOMBRAR NO TOCA NI UN DATO, y ése es justamente el objetivo del diseño:
   *  las filas guardan el `id` de la columna, así que el nombre es solo lo que
   *  se ve. Cambiar el TIPO no se admite todavía: convertir una columna de
   *  texto a número obliga a decidir qué pasa con las celdas que no se pueden
   *  convertir, y esa decisión merece su propio trabajo en vez de colarse aquí
   *  y perder datos en silencio. */
  app.put('/api/bd/columnas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const c = await db.execute(sql`SELECT * FROM bd_columnas WHERE id = ${req.params.id} AND archived_at IS NULL`);
      const col = c.rows[0] as any;
      if (!col) return res.status(404).json({ error: 'Esa columna no existe.' });
      const permiso = await puedeConTabla(req, col.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const d = req.body || {};
      if (d.tipo && d.tipo !== col.tipo) {
        return res.status(400).json({ error: 'Cambiar el tipo de una columna todavía no se puede: habría que decidir qué pasa con las celdas que no se puedan convertir.' });
      }

      // Al tocar las opciones se CONSERVAN los `id` que ya existían. Una opción
      // que llega sin `id` es nueva; una que llega con el suyo se renombra sin
      // que las filas que la usan se enteren, que es lo que se busca.
      const opciones = Array.isArray(d.opciones)
        ? d.opciones.slice(0, 100).map((o: any) => ({
            id: String(o?.id || nid('OPT')),
            label: String(o?.label ?? '').slice(0, 100),
            color: o?.color || null,
          })).filter((o: any) => o.label)
        : null;

      await db.execute(sql`
        UPDATE bd_columnas SET
          nombre   = COALESCE(${d.nombre ? String(d.nombre).trim().slice(0, 120) : null}, nombre),
          opciones = COALESCE(${opciones ? JSON.stringify(opciones) : null}::jsonb, opciones),
          orden    = COALESCE(${typeof d.orden === 'number' ? d.orden : null}, orden),
          updated_at = now()
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Quitar una columna. Se archiva, no se borra: sus valores siguen en el
   *  jsonb de cada fila, así que restaurarla los devuelve intactos. Borrarlos
   *  de verdad sería destruir conocimiento sin que nadie lo haya pedido
   *  (constitución, regla 6). */
  app.delete('/api/bd/columnas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const c = await db.execute(sql`SELECT tabla_id FROM bd_columnas WHERE id = ${req.params.id}`);
      const col = c.rows[0] as any;
      if (!col) return res.status(404).json({ error: 'Esa columna no existe.' });
      const permiso = await puedeConTabla(req, col.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      await db.execute(sql`UPDATE bd_columnas SET archived_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── LAS FILAS ─────────────────────────────────────────────────────────────

  app.post('/api/bd/tablas/:id/filas', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const permiso = await puedeConTabla(req, req.params.id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const ultima = await db.execute(sql`SELECT COALESCE(max(orden), -1) AS m FROM bd_filas WHERE tabla_id = ${req.params.id}`);
      const id = nid('BDF');
      await db.execute(sql`
        INSERT INTO bd_filas (id, tabla_id, valores, orden, created_by, updated_by)
        VALUES (${id}, ${req.params.id}, '{}'::jsonb, ${Number((ultima.rows[0] as any).m) + 1}, ${req.user!.id}, ${req.user!.id})
      `);
      res.json({ id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Escribir celdas de una fila. El cuerpo es `{ celdas: { "<id_columna>": valor } }`.
   *
   * Se validan TODAS antes de guardar NINGUNA: si una celda no vale, no se
   * escribe media fila. Y se responde qué celda falló y por qué, en vez de un
   * «error al guardar» que obliga a adivinar cuál de las diez era.
   */
  app.put('/api/bd/filas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const f = await db.execute(sql`SELECT * FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Esa fila no existe.' });
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      const entrantes = (req.body || {}).celdas || {};
      const columnas = await columnasDe(fila.tabla_id);
      const porId = new Map(columnas.map(c => [c.id, c]));

      const valores = { ...(fila.valores || {}) };
      const fallos: Array<{ columna: string; error: string }> = [];

      for (const [colId, bruto] of Object.entries(entrantes)) {
        const col = porId.get(colId);
        if (!col) { fallos.push({ columna: colId, error: 'Esa columna no existe en la tabla.' }); continue; }
        const r = tipar(col.tipo as Tipo, bruto, col.opciones || [], col.config || {});
        // `'error' in r` en vez de `!r.ok`: este proyecto no compila con
        // `strict`, y sin él TypeScript no estrecha la unión por el campo
        // discriminante. Con la comprobación de presencia funciona igual en
        // los dos modos.
        if ('error' in r) { fallos.push({ columna: colId, error: r.error }); continue; }
        if (r.valor === undefined) delete valores[colId];   // vaciar ≠ guardar cero
        else valores[colId] = r.valor;
      }

      if (fallos.length) return res.status(400).json({ error: 'Hay celdas que no se pueden guardar.', fallos });

      // El historial se engancha al módulo que ya existe (`historial.ts`) en vez
      // de escribir una segunda forma de guardarlo. Se agrupa porque la rejilla
      // guarda al salir de cada celda y una instantánea por tecleo no sirve de
      // nada. Y nunca revienta el guardado: si falla el historial, el usuario
      // ya ha escrito su dato.
      await registrarHistorial(db, {
        entidad: 'bd_fila', tabla: 'bd_filas', id: fila.id, operacion: 'update',
        previo: fila, actor: req.user!.id, agrupar: true,
      });

      await db.execute(sql`
        UPDATE bd_filas SET valores = ${JSON.stringify(valores)}::jsonb, updated_by = ${req.user!.id}, updated_at = now()
        WHERE id = ${req.params.id}
      `);
      res.json({ celdas: celdasDe(valores, columnas) });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** A la papelera, no al vacío. Quince días para arrepentirse. */
  app.delete('/api/bd/filas/:id', async (req: Request, res: Response) => {
    try {
      if (!exigeSesion(req, res)) return;
      const f = await db.execute(sql`SELECT tabla_id FROM bd_filas WHERE id = ${req.params.id} AND deleted_at IS NULL`);
      const fila = f.rows[0] as any;
      if (!fila) return res.status(404).json({ error: 'Esa fila no existe.' });
      const permiso = await puedeConTabla(req, fila.tabla_id, true);
      if ('error' in permiso) return res.status(permiso.codigo).json({ error: permiso.error });

      await db.execute(sql`UPDATE bd_filas SET deleted_at = now(), updated_by = ${req.user!.id} WHERE id = ${req.params.id}`);
      res.json({ ok: true, diasParaBorradoDefinitivo: 15 });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
