import type { Express, Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { filaAUsuario } from './auth.js';
import { accesoMiembro, filtrarParaLector } from './miembros.js';
import { rolEnPagina, capacidades } from './permisos.js';
import { bdInterno } from './bd.js';

// ============================================================================
// AÑADIR ENTRADAS DESDE LA PÁGINA PUBLICADA (2026-10-20, Eugenio)
// ============================================================================
// «Que la persona registrada no edite la página ni se la mande al Wiki
// Creator, sino que dentro de la página publicada pueda añadir entradas:
// crear nuevas líneas en la base de datos, enlazarlas con otras bases de
// datos, subir imágenes y texto. Pero no crear propiedades. Es crear
// contenido nuevo.»
//
// QUIÉN puede (`contribuidor`):
//   · quien tiene rol de editar (o más) en la página: el dueño y el equipo,
//     entren con la sesión de humanity.wiki o con su cuenta de miembro;
//   · un miembro ACTIVO de la web cuya categoría tenga «editar», si puede ver
//     la página.
// QUÉ puede: crear filas en las bases de datos QUE ESTÁN EN ESA PÁGINA (un
// bloque «Base de datos» que ella misma puede ver), con valores para las
// propiedades que YA EXISTEN y que no son privadas, calculadas ni de ficheros;
// enlazarlas con filas de la tabla a la que apunte una relación; y darle a la
// página de la entrada una portada, texto e imágenes. Nada más: ni columnas,
// ni opciones nuevas por la puerta de atrás, ni tocar la página.
//
// CÓMO: la fila la crea el DUEÑO de la tabla (`crearFila`/`escribirCeldas`
// con su identidad, como los formularios públicos), así pasa por la misma
// validación y nace con su página; después se apunta quién la trajo
// (`created_by`). La sesión del miembro sigue sin abrir nada más.

/** Los tipos de propiedad que se pueden rellenar desde fuera. */
const TIPOS_CONTRIBUIBLES = new Set([
  'texto', 'texto_largo', 'numero', 'moneda', 'porcentaje', 'valoracion', 'fecha',
  'seleccion', 'seleccion_multiple', 'casilla', 'url', 'email', 'telefono', 'relacion',
]);
const MAX_BLOQUES = 60;
const MAX_TEXTO = 8000;
const urlValida = (u: unknown) => typeof u === 'string' && u.length < 2000 && /^(\/uploads\/|https:\/\/)/.test(u);

type Contribuidor = { userId: string; esEquipo: boolean };

/** ¿Puede quien llama añadir entradas en esta página? */
export async function contribuidor(db: any, req: Request, paginaId: string): Promise<Contribuidor | null> {
  const plataforma = req.user && !(req as any).miembroSitio ? req.user : null;
  const puedeEditar = async (userId: string) => {
    const u = (await db.execute(sql`SELECT role_level FROM users WHERE id = ${userId} AND deleted_at IS NULL AND archived_at IS NULL`)).rows[0] as any;
    return !!u && capacidades(await rolEnPagina(db, { id: userId, nivel: Number(u.role_level) || 0 }, paginaId)).editar;
  };
  const a = await accesoMiembro(db, req, paginaId);
  if (a) {
    if (!a.permitido) return null;
    for (const id of [plataforma?.id, a.miembro?.estado === 'activo' ? a.miembro.userId : null]) {
      if (id && await puedeEditar(id)) return { userId: id, esEquipo: true };
    }
    const m = a.miembro;
    if (m && m.estado === 'activo' && m.permisos.editar && m.userId) return { userId: m.userId, esEquipo: false };
    return null;
  }
  if (plataforma && await puedeEditar(plataforma.id)) return { userId: plataforma.id, esEquipo: true };
  return null;
}

/** Las bases de datos que se ven en la página para quien llama (sin los bloques que tiene restringidos). */
async function tablasDePagina(db: any, req: Request, paginaId: string): Promise<string[]> {
  const w = (await db.execute(sql`
    SELECT config FROM knowledge_windows WHERE id = ${paginaId} AND kind = 'pagina' AND deleted_at IS NULL AND archived_at IS NULL
  `)).rows[0] as any;
  if (!w) return [];
  const { config } = await filtrarParaLector(db, req, paginaId, w.config || {});
  const out = new Set<string>();
  const recorrer = (n: any) => {
    if (Array.isArray(n)) { n.forEach(recorrer); return; }
    if (!n || typeof n !== 'object') return;
    // `sinAnadir` (2026-10-26, Eugenio: «que no se pueda añadir una entrada en los sistemas de la humanidad»):
    // ese bloque no ofrece «Añadir entrada» a nadie.
    if (n.tipo === 'basedatos' && typeof (n.tabla_id || n.tablaId) === 'string' && !n.sinAnadir) out.add(n.tabla_id || n.tablaId);
    for (const v of Object.values(n)) if (v && typeof v === 'object') recorrer(v);
  };
  recorrer(config?.bloques);
  return [...out];
}

async function columnasContribuibles(db: any, tablaId: string) {
  const r = await db.execute(sql`
    SELECT id, nombre, tipo, opciones, config, orden FROM bd_columnas
    WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
  `);
  const todas = r.rows as any[];
  const titulo = todas.find(c => c.tipo === 'texto')?.id || null;
  const columnas = todas
    .filter(c => TIPOS_CONTRIBUIBLES.has(c.tipo) && c.config?.visibilidad !== 'nunca' && !c.config?.inversa_de)
    .map(c => ({
      id: c.id, nombre: c.nombre, tipo: c.tipo,
      opciones: Array.isArray(c.opciones) ? c.opciones.map((o: any) => ({ id: o.id, label: o.label, color: o.color || null })) : [],
      varios: !!c.config?.varios, destino: c.tipo === 'relacion' ? c.config?.tabla_destino || null : null,
    }));
  return { titulo, columnas };
}

/**
 * LAS BASES DE DATOS CERRADAS (2026-10-21): con el candado puesto
 * (`bd_tablas.config.cerrada`) sólo añaden entradas el dueño de la tabla, el
 * de la página o un superadministrador; nadie más, ni el equipo ni los
 * miembros con «Añadir contenido».
 */
async function abiertaPara(db: any, tablaId: string, paginaId: string, userId: string): Promise<boolean> {
  const t = (await db.execute(sql`SELECT config, creador_user_id FROM bd_tablas WHERE id = ${tablaId}`)).rows[0] as any;
  if (!t?.config?.cerrada) return true;
  if (t.creador_user_id === userId) return true;
  const w = (await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${paginaId}`)).rows[0] as any;
  if (w?.creator_user_id === userId) return true;
  const u = (await db.execute(sql`SELECT role_level FROM users WHERE id = ${userId}`)).rows[0] as any;
  return Number(u?.role_level) >= 4;
}

/** Lo común a las rutas de una tabla: quién es, y que la tabla esté en la página. */
async function permiso(db: any, req: Request, res: Response): Promise<{ quien: Contribuidor; paginaId: string; tablaId: string } | null> {
  const paginaId = String(req.params.paginaId), tablaId = String(req.params.tablaId);
  const quien = await contribuidor(db, req, paginaId);
  if (!quien) { res.status(403).json({ error: 'Para añadir entradas, entra con una cuenta que pueda editar en esta web.' }); return null; }
  if (!(await tablasDePagina(db, req, paginaId)).includes(tablaId)) { res.status(404).json({ error: 'Esa base de datos no está en esta página.' }); return null; }
  if (!(await abiertaPara(db, tablaId, paginaId, quien.userId))) { res.status(403).json({ error: 'Esta base de datos está cerrada: solo su dueño añade entradas.' }); return null; }
  return { quien, paginaId, tablaId };
}

/**
 * Para la subida de imágenes: `POST /api/uploads?contribuir=<página>` con la
 * sesión de miembro de quien puede añadir entradas en esa página. Montado
 * ANTES de las rutas de subida (ver `modulos.ts`).
 */
export function identidadDeContribuidor(db: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user || req.method !== 'POST' || req.path !== '/api/uploads' || typeof req.query.contribuir !== 'string') return next();
      const quien = await contribuidor(db, req, req.query.contribuir);
      if (!quien) return next();
      const u = (await db.execute(sql`SELECT * FROM users WHERE id = ${quien.userId} AND deleted_at IS NULL AND archived_at IS NULL`)).rows[0];
      if (u) { req.user = filaAUsuario(u); (req as any).miembroSitio = (req as any).miembroSitio || 'contribuir'; }
    } catch (e) { console.error('identidad de contribuidor:', e); }
    next();
  };
}

export function registrarContribuir(app: Express, db: any) {
  /** ¿Puedo añadir entradas aquí? Y en qué bases de datos. */
  app.get('/api/sitio-contribuir/:paginaId', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const quien = await contribuidor(db, req, String(req.params.paginaId));
      if (!quien) return res.json({ puede: false, tablas: [] });
      const todas = await tablasDePagina(db, req, String(req.params.paginaId));
      const abiertas: string[] = [];
      for (const t of todas) if (await abiertaPara(db, t, String(req.params.paginaId), quien.userId)) abiertas.push(t);
      res.json({ puede: true, equipo: quien.esEquipo, tablas: abiertas });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Las propiedades que se pueden rellenar en una entrada nueva. */
  app.get('/api/sitio-contribuir/:paginaId/tablas/:tablaId', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const p = await permiso(db, req, res);
      if (!p) return;
      const t = (await db.execute(sql`SELECT titulo FROM bd_tablas WHERE id = ${p.tablaId} AND deleted_at IS NULL AND archived_at IS NULL`)).rows[0] as any;
      if (!t) return res.status(404).json({ error: 'Esa base de datos ya no existe.' });
      const { titulo, columnas } = await columnasContribuibles(db, p.tablaId);
      res.json({ tabla: t.titulo || 'Base de datos', columna_titulo: titulo, columnas: columnas.filter(c => c.id !== titulo) });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Las entradas de la tabla a la que apunta una relación, para enlazarlas. */
  app.get('/api/sitio-contribuir/:paginaId/tablas/:tablaId/relacion/:columnaId', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const p = await permiso(db, req, res);
      if (!p) return;
      const { columnas } = await columnasContribuibles(db, p.tablaId);
      const col = columnas.find(c => c.id === req.params.columnaId && c.tipo === 'relacion');
      if (!col?.destino) return res.status(404).json({ error: 'Esa relación no existe.' });
      const tituloDestino = (await columnasContribuibles(db, col.destino)).titulo;
      const q = String(req.query.q || '').trim().slice(0, 80);
      const r = await db.execute(sql`
        SELECT f.id, COALESCE(NULLIF(f.valores->>${tituloDestino || ''}, ''), w.title, 'Sin título') AS titulo
        FROM bd_filas f LEFT JOIN knowledge_windows w ON w.id = f.pagina_id
        WHERE f.tabla_id = ${col.destino} AND f.deleted_at IS NULL AND COALESCE(f.oculta, false) = false
          AND (${q} = '' OR COALESCE(f.valores->>${tituloDestino || ''}, w.title, '') ILIKE ${'%' + q + '%'})
        ORDER BY f.orden LIMIT 30
      `);
      res.json({ filas: r.rows });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Una entrada nueva: `{ titulo, celdas, portada, cuerpo: [{ tipo: 'parrafo', texto } | { tipo: 'imagen', url }] }`. */
  app.post('/api/sitio-contribuir/:paginaId/tablas/:tablaId/filas', async (req: Request, res: Response) => {
    try {
      const p = await permiso(db, req, res);
      if (!p) return;
      if (!bdInterno.crearFila || !bdInterno.escribirCeldas) return res.status(503).json({ error: 'Las bases de datos no están listas.' });
      const b = req.body || {};
      const titulo = String(b.titulo || '').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!titulo) return res.status(400).json({ error: 'Ponle un nombre a la entrada.' });

      // Sólo las propiedades permitidas; lo demás se ignora (no se crea nada nuevo).
      const { columnas } = await columnasContribuibles(db, p.tablaId);
      const permitidas = new Map(columnas.map(c => [c.id, c]));
      const celdas: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(b.celdas && typeof b.celdas === 'object' ? b.celdas : {})) {
        const c = permitidas.get(k);
        if (!c) continue;
        // Una opción que no existe NO se crea: se rechaza.
        if (c.tipo === 'seleccion' && v && !c.opciones.some((o: any) => o.id === v)) return res.status(400).json({ error: `«${c.nombre}»: esa opción no existe.` });
        if (c.tipo === 'seleccion_multiple' && Array.isArray(v) && v.some(x => !c.opciones.some((o: any) => o.id === x))) return res.status(400).json({ error: `«${c.nombre}»: alguna opción no existe.` });
        celdas[k] = v;
      }

      const t = (await db.execute(sql`SELECT creador_user_id FROM bd_tablas WHERE id = ${p.tablaId}`)).rows[0] as any;
      if (!t?.creador_user_id) return res.status(404).json({ error: 'Esa base de datos ya no existe.' });
      const duenyo = { user: { id: t.creador_user_id, roleLevel: 0 } } as Pick<Request, 'user'>;

      const nueva = await bdInterno.crearFila(duenyo, p.tablaId, titulo);
      if ('error' in nueva) return res.status(nueva.codigo).json({ error: nueva.error });
      if (Object.keys(celdas).length) {
        const w = await bdInterno.escribirCeldas(duenyo, nueva.id, celdas);
        if (w.codigo !== 200) {
          // Todo o nada: una entrada a medias no se queda.
          await db.execute(sql`UPDATE bd_filas SET deleted_at = now() WHERE id = ${nueva.id}`);
          await db.execute(sql`UPDATE knowledge_windows SET deleted_at = now() WHERE id = ${nueva.pagina_id}`);
          return res.status(400).json({ error: w.cuerpo?.error || 'Hay valores que no se pueden guardar.', fallos: w.cuerpo?.fallos });
        }
      }
      await db.execute(sql`UPDATE bd_filas SET created_by = ${p.quien.userId}, updated_by = ${p.quien.userId} WHERE id = ${nueva.id}`);

      // La página de la entrada: portada, texto e imágenes.
      const bloques: any[] = [];
      for (const x of (Array.isArray(b.cuerpo) ? b.cuerpo : []).slice(0, MAX_BLOQUES)) {
        const id = `B${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        if (x?.tipo === 'parrafo' && typeof x.texto === 'string' && x.texto.trim()) bloques.push({ id, tipo: 'parrafo', texto: x.texto.slice(0, MAX_TEXTO) });
        else if (x?.tipo === 'imagen' && urlValida(x.url)) bloques.push({ id, tipo: 'imagen', url: x.url });
      }
      const extra: Record<string, unknown> = { bloques };
      if (urlValida(b.portada)) extra.portada = b.portada;
      await db.execute(sql`
        UPDATE knowledge_windows SET config = COALESCE(config, '{}'::jsonb) || ${JSON.stringify(extra)}::jsonb, updated_at = now()
        WHERE id = ${nueva.pagina_id}
      `);
      res.json({ id: nueva.id, pagina_id: nueva.pagina_id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
