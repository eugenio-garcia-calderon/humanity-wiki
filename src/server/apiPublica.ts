import type { Express, Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import { filaAUsuario } from './auth';
import { bdInterno } from './bd';
import { visibles } from './espacio';
import { rolEnPagina, capacidades, puedeEditarPagina, quienDe } from './permisos';
import { registrarHistorial } from './historial';
import { markdownABloques, bloquesAMarkdown } from '../utils/bloques';

// ============================================================================
// LA API PÚBLICA, /api/v1 (2026-10-06, carril «espacio», #24)
// ============================================================================
// Lo que hace falta para conectar humanity.wiki con otras herramientas (Zapier,
// un script, una hoja de cálculo): leer y escribir páginas y filas con una
// clave, sin pasar por el navegador. Documentada en `/desarrolladores`.
//
// ── LAS CLAVES ──────────────────────────────────────────────────────────────
//   · `hw_live_` + 32 bytes aleatorios en base64url. Se enseña UNA vez; en la
//     base de datos solo está su hash SHA-256 (ver la migración 0143).
//   · Dos alcances: `lectura` (solo GET) y `escritura` (también POST y PATCH).
//   · Revocable al instante: se mira la base de datos en cada petición.
//   · Se manda como `Authorization: Bearer <clave>`. La cookie de sesión NO
//     vale en /api/v1: sin cookies no hay CSRF, y una página ajena no puede
//     hacer que tu navegador llame a la API con tu sesión.
//
// ── LA CLAVE NUNCA ES ADMINISTRADOR ─────────────────────────────────────────
// Aunque su dueña sea administradora de la plataforma, con su clave actúa como
// una persona verificada y nada más. Una clave suele acabar pegada en un script
// o en un servicio de terceros; que esa fuga dé poderes de administración sería
// pagar un riesgo enorme por una comodidad que nadie pidió.
//
// ── LOS PERMISOS SON LOS DE SIEMPRE ─────────────────────────────────────────
// La API no tiene reglas propias: pregunta lo mismo que la pantalla
// (`rolEnPagina`, `puedeConTabla`, `escribirCeldas`). Una clave ve y escribe
// exactamente lo que vería y escribiría su dueña, y menos si es de lectura.
//
// ── LÍMITE DE TASA ──────────────────────────────────────────────────────────
// 120 peticiones por minuto y clave (30 las de escritura), contadas en Postgres
// (tabla `api_uso`) para que valga igual con varios procesos. Al pasarse:
// 429 con `Retry-After`. Cada respuesta lleva `X-RateLimit-*`.

const LIMITE_LECTURA = 120;
const LIMITE_ESCRITURA = 30;
const MAX_CLAVES = 10;
const PREFIJO = 'hw_live_';

const nid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const hashDe = (clave: string) => crypto.createHash('sha256').update(clave).digest('hex');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express { interface Request { apiClave?: { id: string; alcance: 'lectura' | 'escritura' } } }
}

/** Instante en ISO: lo que sale de `timestamp` sin zona se interpreta como la hora del servidor, igual que al guardarlo. */
const iso = (x: any) => (x ? new Date(x).toISOString() : null);
const cursorDe = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
const deCursor = (c: unknown): any => { try { return c ? JSON.parse(Buffer.from(String(c), 'base64url').toString()) : null; } catch { return null; } };
const limiteDe = (v: unknown, def = 50) => Math.min(Math.max(parseInt(String(v)) || def, 1), 100);

export function registrarApiPublica(app: Express, db: any) {
  // ══ GESTIONAR TUS CLAVES (con sesión; una clave no gestiona claves) ════════
  const entrar = (req: Request, res: Response) => {
    if (!req.user) { res.status(401).json({ error: 'Inicia sesión.' }); return null; }
    return req.user.id as string;
  };

  app.get('/api/desarrolladores/claves', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const r = await db.execute(sql`
        SELECT id, nombre, prefijo, alcance, creada_en, ultimo_uso, revocada_en FROM api_claves
        WHERE user_id = ${yo} ORDER BY creada_en DESC LIMIT 100
      `);
      res.json({ claves: (r.rows as any[]).map(c => ({ ...c, creada_en: iso(c.creada_en), ultimo_uso: iso(c.ultimo_uso), revocada_en: iso(c.revocada_en) })) });
    } catch (e: any) { console.error('claves lista:', e); res.status(500).json({ error: 'No se han podido leer tus claves.' }); }
  });

  app.post('/api/desarrolladores/claves', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const nombre = String(req.body?.nombre || '').trim().slice(0, 60);
      const alcance = req.body?.alcance === 'escritura' ? 'escritura' : req.body?.alcance === 'lectura' ? 'lectura' : null;
      if (!nombre) return res.status(400).json({ error: 'Ponle un nombre a la clave (por ejemplo «Zapier»).' });
      if (!alcance) return res.status(400).json({ error: 'Elige el alcance: lectura, o lectura y escritura.' });
      const n = Number(((await db.execute(sql`SELECT count(*)::int AS n FROM api_claves WHERE user_id = ${yo} AND revocada_en IS NULL`)).rows[0] as any).n);
      if (n >= MAX_CLAVES) return res.status(400).json({ error: `Ya tienes ${MAX_CLAVES} claves activas: revoca alguna antes.` });
      const clave = PREFIJO + crypto.randomBytes(32).toString('base64url');
      const id = nid('AK');
      await db.execute(sql`
        INSERT INTO api_claves (id, user_id, nombre, prefijo, hash, alcance)
        VALUES (${id}, ${yo}, ${nombre}, ${clave.slice(0, PREFIJO.length + 4)}, ${hashDe(clave)}, ${alcance})
      `);
      // La única vez que la clave sale del servidor.
      res.json({ id, nombre, alcance, clave });
    } catch (e: any) { console.error('claves crear:', e); res.status(500).json({ error: 'No se ha podido crear la clave.' }); }
  });

  app.delete('/api/desarrolladores/claves/:id', async (req: Request, res: Response) => {
    try {
      const yo = entrar(req, res); if (!yo) return;
      const r = await db.execute(sql`UPDATE api_claves SET revocada_en = now() WHERE id = ${req.params.id} AND user_id = ${yo} AND revocada_en IS NULL RETURNING id`);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa clave no existe o ya estaba revocada.' });
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: 'No se ha podido revocar.' }); }
  });

  // ══ LA PUERTA: AUTENTICACIÓN, ALCANCE Y LÍMITE ═════════════════════════════
  // Sin ruta montada (`app.use(fn)`): hay que poder reescribir `req.url` para
  // las lecturas de tablas, y eso solo funciona fuera de un `use` con prefijo.
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api/v1')) return next();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(204).end();
    try {
      // La cookie no cuenta aquí, aunque llegue: solo la clave.
      req.user = null;
      const m = String(req.headers.authorization || '').match(/^Bearer\s+(hw_live_[A-Za-z0-9_-]{20,100})$/);
      if (!m) return res.status(401).json({ error: 'Falta la clave de API. Envíala como «Authorization: Bearer hw_live_…».' });
      const r = await db.execute(sql`
        SELECT k.id AS clave_id, k.alcance, k.ultimo_uso, u.*
        FROM api_claves k JOIN users u ON u.id = k.user_id
        WHERE k.hash = ${hashDe(m[1])} AND k.revocada_en IS NULL AND u.archived_at IS NULL AND u.deleted_at IS NULL
      `);
      const fila = r.rows[0] as any;
      if (!fila) return res.status(401).json({ error: 'Clave de API no válida o revocada.' });
      const user = filaAUsuario(fila);
      // Nunca administrador por API (ver la cabecera).
      user.roleLevel = Math.min(user.roleLevel, 2);
      user.isAdmin = false;
      req.user = user;
      req.apiClave = { id: fila.clave_id, alcance: fila.alcance };

      const escribe = !['GET', 'HEAD'].includes(req.method);
      if (escribe && fila.alcance !== 'escritura') {
        return res.status(403).json({ error: 'Esta clave es de solo lectura. Crea una con alcance de escritura para modificar datos.' });
      }
      // Límite por minuto, contado en la base de datos.
      const tope = escribe ? LIMITE_ESCRITURA : LIMITE_LECTURA;
      const u = await db.execute(sql`
        INSERT INTO api_uso (clave_id, minuto, n) VALUES (${fila.clave_id}, date_trunc('minute', now()) + ${escribe ? '1 second' : '0 second'}::interval, 1)
        ON CONFLICT (clave_id, minuto) DO UPDATE SET n = api_uso.n + 1
        RETURNING n, extract(epoch FROM (date_trunc('minute', now()) + interval '1 minute' - now()))::int AS reinicia
      `);
      const { n, reinicia } = u.rows[0] as any;
      res.setHeader('X-RateLimit-Limit', String(tope));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(tope - Number(n), 0)));
      res.setHeader('X-RateLimit-Reset', String(Number(reinicia)));
      if (Number(n) > tope) {
        res.setHeader('Retry-After', String(Math.max(Number(reinicia), 1)));
        return res.status(429).json({ error: `Demasiadas peticiones: el límite es de ${tope} por minuto.`, retry_after: Math.max(Number(reinicia), 1) });
      }
      // Último uso, como mucho una vez por minuto (no una escritura por petición).
      if (!fila.ultimo_uso || Date.now() - new Date(fila.ultimo_uso).getTime() > 60_000) {
        db.execute(sql`UPDATE api_claves SET ultimo_uso = now() WHERE id = ${fila.clave_id}`).catch(() => {});
      }
      if (Math.random() < 0.01) db.execute(sql`DELETE FROM api_uso WHERE minuto < now() - interval '2 hours'`).catch(() => {});
      next();
    } catch (e: any) { console.error('api v1 puerta:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  // ══ /api/v1 ═════════════════════════════════════════════════════════════════
  app.get('/api/v1/me', (req: Request, res: Response) => {
    res.json({ id: req.user!.id, name: req.user!.displayName, scope: req.apiClave!.alcance === 'escritura' ? 'read_write' : 'read' });
  });

  // ── PÁGINAS ───────────────────────────────────────────────────────────────
  const paginaPublica = (w: any, extra: Record<string, any> = {}) => ({
    id: w.id, title: w.title || '', icon: w.icono || null, folder_id: w.proyecto_id || null,
    created_at: w.created_at ? new Date(w.created_at).toISOString() : null,
    updated_at: w.updated_at ? new Date(w.updated_at).toISOString() : null,
    url: `https://humanity.wiki/paginas/${w.id}`, ...extra,
  });

  app.get('/api/v1/pages', async (req: Request, res: Response) => {
    try {
      const yo = req.user!.id;
      const limite = limiteDe(req.query.limit);
      const c = deCursor(req.query.cursor);
      const r = await db.execute(sql`
        SELECT w.id, w.title, w.config->>'icono' AS icono, w.proyecto_id, w.created_at, w.updated_at
        FROM knowledge_windows w
        WHERE w.kind = 'pagina' AND w.archived_at IS NULL AND w.deleted_at IS NULL AND w.id IN (${visibles({ yo })})
          AND (${c?.u ?? null}::timestamp IS NULL OR (w.updated_at, w.id) < (${c?.u ?? null}::timestamp, ${c?.i ?? ''}))
        ORDER BY w.updated_at DESC, w.id DESC LIMIT ${limite + 1}
      `);
      const filas = r.rows as any[];
      const hay = filas.length > limite;
      const pagina = filas.slice(0, limite);
      res.json({ data: pagina.map(w => paginaPublica(w)), next_cursor: hay ? cursorDe({ u: new Date(pagina[pagina.length - 1].updated_at).toISOString(), i: pagina[pagina.length - 1].id }) : null });
    } catch (e: any) { console.error('v1 pages:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  const leerPagina = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const a = await rolEnPagina(db, quienDe(req), id);
    if (!a.existe) { res.status(404).json({ error: 'Esa página no existe.' }); return null; }
    if (!(a.rol || a.publico) || !capacidades(a).ver) { res.status(403).json({ error: 'No tienes acceso a esa página.' }); return null; }
    const w = (await db.execute(sql`
      SELECT id, title, config, config->>'icono' AS icono, proyecto_id, created_at, updated_at, version FROM knowledge_windows WHERE id = ${id}
    `)).rows[0] as any;
    return { w, a };
  };

  app.get('/api/v1/pages/:id', async (req: Request, res: Response) => {
    try {
      const x = await leerPagina(req, res); if (!x) return;
      const bloques = Array.isArray(x.w.config?.bloques) ? x.w.config.bloques : [];
      res.json(paginaPublica(x.w, { version: x.w.version, markdown: bloquesAMarkdown(bloques), blocks: bloques, can_edit: capacidades(x.a).editar }));
    } catch (e: any) { console.error('v1 page:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  const MAX_MD = 200_000;
  app.post('/api/v1/pages', async (req: Request, res: Response) => {
    try {
      const yo = req.user!.id;
      const title = String(req.body?.title ?? '').trim().slice(0, 300) || 'Documento sin título';
      const md = req.body?.markdown === undefined ? '' : String(req.body.markdown);
      if (md.length > MAX_MD) return res.status(413).json({ error: `El contenido es demasiado largo (máximo ${MAX_MD} caracteres).` });
      let carpeta: string | null = null;
      if (req.body?.folder_id) {
        const c = (await db.execute(sql`SELECT creador_user_id FROM proyectos WHERE id = ${String(req.body.folder_id)} AND archived_at IS NULL AND deleted_at IS NULL`)).rows[0] as any;
        if (!c || c.creador_user_id !== yo) return res.status(404).json({ error: 'Esa carpeta no existe o no es tuya.' });
        carpeta = String(req.body.folder_id);
      }
      const bloques = md.trim() ? markdownABloques(md) : [{ id: `B${Date.now().toString(36)}0`, tipo: 'parrafo', texto: '' }];
      const id = nid('KW');
      await db.execute(sql`
        INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
        VALUES (${id}, ${title}, 'pagina', ${JSON.stringify({ bloques })}::jsonb, false, ${yo}, false, ${yo}, ${yo}, ${carpeta})
      `);
      const w = (await db.execute(sql`SELECT id, title, config->>'icono' AS icono, proyecto_id, created_at, updated_at, version FROM knowledge_windows WHERE id = ${id}`)).rows[0] as any;
      res.status(201).json(paginaPublica(w, { version: w.version }));
    } catch (e: any) { console.error('v1 crear página:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  app.patch('/api/v1/pages/:id', async (req: Request, res: Response) => {
    try {
      const yo = req.user!.id;
      const id = String(req.params.id);
      const a = await rolEnPagina(db, quienDe(req), id);
      if (!a.existe) return res.status(404).json({ error: 'Esa página no existe.' });
      if (!(await puedeEditarPagina(db, quienDe(req), id))) return res.status(403).json({ error: 'No puedes editar esa página.' });
      const titulo = req.body?.title === undefined ? null : String(req.body.title).trim().slice(0, 300);
      const md = req.body?.markdown === undefined ? null : String(req.body.markdown);
      if (titulo === null && md === null) return res.status(400).json({ error: 'Manda «title» y/o «markdown».' });
      if (md !== null && md.length > MAX_MD) return res.status(413).json({ error: `El contenido es demasiado largo (máximo ${MAX_MD} caracteres).` });
      const base = req.body?.version === undefined ? null : Number(req.body.version);
      const antes = (await db.execute(sql`SELECT * FROM knowledge_windows WHERE id = ${id}`)).rows[0] as any;
      const bloques = md === null ? null : (md.trim() ? markdownABloques(md) : [{ id: `B${Date.now().toString(36)}0`, tipo: 'parrafo', texto: '' }]);
      // `version` opcional: si mandas la que leíste y alguien ha guardado entretanto, 409 (como el editor).
      const u = await db.execute(sql`
        UPDATE knowledge_windows SET
          title = COALESCE(${titulo === '' ? null : titulo}, title),
          config = CASE WHEN ${bloques === null} THEN config ELSE jsonb_set(COALESCE(config, '{}'::jsonb), '{bloques}', ${JSON.stringify(bloques ?? [])}::jsonb) END,
          version = version + 1, updated_at = now(), updated_by = ${yo}
        WHERE id = ${id} AND (${base}::int IS NULL OR version = ${base}::int)
        RETURNING id, title, config->>'icono' AS icono, proyecto_id, created_at, updated_at, version
      `);
      if (!u.rows.length) return res.status(409).json({ error: 'Otra persona ha guardado esta página mientras tanto. Vuelve a leerla y repite el cambio.', current_version: antes?.version });
      await registrarHistorial(db, { entidad: 'knowledge_windows', tabla: 'knowledge_windows', id, operacion: 'update', previo: antes, actor: yo, agrupar: true });
      res.json(paginaPublica(u.rows[0], { version: (u.rows[0] as any).version }));
    } catch (e: any) { console.error('v1 editar página:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  // ── BASES DE DATOS ────────────────────────────────────────────────────────
  app.get('/api/v1/databases', async (req: Request, res: Response) => {
    try {
      const yo = req.user!.id;
      const r = await db.execute(sql`
        SELECT t.id, t.titulo, t.descripcion, t.created_at, t.updated_at,
          (SELECT count(*)::int FROM bd_filas f WHERE f.tabla_id = t.id AND f.archived_at IS NULL AND f.deleted_at IS NULL) AS filas
        FROM bd_tablas t
        WHERE t.archived_at IS NULL AND t.deleted_at IS NULL AND (
          t.creador_user_id = ${yo}
          OR EXISTS (SELECT 1 FROM knowledge_windows w WHERE w.id IN (${visibles({ yo })})
                     AND jsonb_path_exists(COALESCE(w.config, '{}'::jsonb), '$.bloques[*] ? (@.tabla_id == $t)', jsonb_build_object('t', t.id))))
        ORDER BY t.updated_at DESC, t.id LIMIT 200
      `);
      res.json({ data: (r.rows as any[]).map(t => ({ id: t.id, title: t.titulo, description: t.descripcion || null, row_count: t.filas, created_at: new Date(t.created_at).toISOString(), updated_at: new Date(t.updated_at).toISOString() })) });
    } catch (e: any) { console.error('v1 databases:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  /** Permiso de lectura/escritura de la tabla con la regla de siempre. */
  const conTabla = async (req: Request, res: Response, escribir: boolean) => {
    const r = await bdInterno.puedeConTabla!(req, String(req.params.id), escribir);
    if ('error' in r) { res.status(r.codigo).json({ error: r.error }); return null; }
    return r.tabla;
  };
  const columnasDe = async (tablaId: string) => (await db.execute(sql`
    SELECT id, nombre, tipo, opciones FROM bd_columnas WHERE tabla_id = ${tablaId} AND archived_at IS NULL ORDER BY orden, created_at
  `)).rows as any[];
  const columnaPublica = (c: any) => ({ id: c.id, name: c.nombre, type: c.tipo, options: Array.isArray(c.opciones) && c.opciones.length ? c.opciones.map((o: any) => o.label ?? o) : undefined });

  app.get('/api/v1/databases/:id', async (req: Request, res: Response) => {
    try {
      const t = await conTabla(req, res, false); if (!t) return;
      res.json({ id: t.id, title: t.titulo, description: t.descripcion || null, columns: (await columnasDe(t.id)).map(columnaPublica) });
    } catch (e: any) { console.error('v1 database:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  // Las filas las calcula la ruta de siempre (fórmulas, relaciones…): se le pide
  // la tabla entera reescribiendo la dirección, y su respuesta se traduce al
  // formato público al salir. Sus permisos son, por tanto, exactamente los de la pantalla.
  const traducirFilas = (cuerpo: any) => {
    const cols: any[] = cuerpo.columnas || [];
    const filas = (cuerpo.filas || []).map((f: any) => {
      const values: Record<string, any> = {};
      for (const c of cols) {
        const apuntados = f.apuntados?.[c.id];
        const celda = f.celdas?.[c.id];
        if (apuntados?.length) values[c.nombre] = apuntados.map((a: any) => ({ id: a.id, label: a.etiqueta }));
        else if (celda?.estado === 'ok') values[c.nombre] = celda.valor;
        else if (celda?.estado === 'error') values[c.nombre] = { error: celda.mensaje };
        else values[c.nombre] = null;
      }
      return { id: f.id, page_id: f.pagina_id || null, values };
    });
    return { columns: cols.map(columnaPublica), rows: filas };
  };
  const reenviarATabla = (req: Request, res: Response, next: NextFunction, despues: (cuerpo: any) => any) => {
    const original = res.json.bind(res);
    res.json = ((cuerpo: any) => {
      res.json = original;
      if (res.statusCode >= 400 || !cuerpo || cuerpo.error) return original(cuerpo);
      try { return original(despues(traducirFilas(cuerpo))); }
      catch (e: any) { console.error('v1 traducir:', e); return res.status(500).json({ error: 'Error interno.' }); }
    }) as any;
    req.url = `/api/bd/tablas/${encodeURIComponent(String(req.params.id))}`;
    req.method = 'GET';
    next();
  };

  app.get('/api/v1/databases/:id/rows', (req: Request, res: Response, next: NextFunction) => {
    const limite = limiteDe(req.query.limit);
    const desde = Math.max(parseInt(String(deCursor(req.query.cursor)?.o ?? 0)) || 0, 0);
    reenviarATabla(req, res, next, ({ rows }) => ({
      data: rows.slice(desde, desde + limite),
      next_cursor: desde + limite < rows.length ? cursorDe({ o: desde + limite }) : null,
      total: rows.length,
    }));
  });

  app.get('/api/v1/databases/:id/rows/:rowId', (req: Request, res: Response, next: NextFunction) => {
    const rowId = String(req.params.rowId);
    reenviarATabla(req, res, next, ({ rows }) => rows.find((r: any) => r.id === rowId) || (res.status(404), { error: 'Esa fila no existe en esta base de datos.' }));
  });

  /** {"Nombre de columna": valor} (o por id de columna) → {idColumna: valor}. */
  const mapearValores = (cols: any[], values: any): { celdas: Record<string, any> } | { error: string } => {
    if (!values || typeof values !== 'object' || Array.isArray(values)) return { error: '«values» tiene que ser un objeto {columna: valor}.' };
    const porNombre = new Map(cols.map(c => [String(c.nombre).toLowerCase(), c.id]));
    const ids = new Set(cols.map(c => c.id));
    const celdas: Record<string, any> = {};
    const desconocidas: string[] = [];
    for (const [k, v] of Object.entries(values)) {
      const id = ids.has(k) ? k : porNombre.get(k.toLowerCase());
      if (!id) desconocidas.push(k); else celdas[id] = v;
    }
    return desconocidas.length ? { error: `Columnas que no existen en esta base de datos: ${desconocidas.map(d => `«${d.slice(0, 60)}»`).join(', ')}.` } : { celdas };
  };

  app.post('/api/v1/databases/:id/rows', async (req: Request, res: Response) => {
    try {
      const t = await conTabla(req, res, true); if (!t) return;
      const cols = await columnasDe(t.id);
      const m = mapearValores(cols, req.body?.values ?? {});
      if ('error' in m) return res.status(400).json({ error: m.error });
      const creada = await bdInterno.crearFila!(req, t.id, undefined);
      if ('error' in creada) return res.status(creada.codigo).json({ error: creada.error });
      if (Object.keys(m.celdas).length) {
        const w = await bdInterno.escribirCeldas!(req, creada.id, m.celdas);
        if (w.codigo !== 200) {
          // Nada de filas a medias: si los valores no valen, la fila no se queda.
          await db.execute(sql`UPDATE bd_filas SET deleted_at = now() WHERE id = ${creada.id}`);
          await db.execute(sql`UPDATE knowledge_windows SET deleted_at = now() WHERE id = ${creada.pagina_id}`);
          return res.status(w.codigo).json(w.cuerpo);
        }
      }
      res.status(201).json({ id: creada.id, page_id: creada.pagina_id, database_id: t.id });
    } catch (e: any) { console.error('v1 crear fila:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  app.patch('/api/v1/databases/:id/rows/:rowId', async (req: Request, res: Response) => {
    try {
      const t = await conTabla(req, res, true); if (!t) return;
      const f = (await db.execute(sql`SELECT id FROM bd_filas WHERE id = ${String(req.params.rowId)} AND tabla_id = ${t.id} AND deleted_at IS NULL`)).rows[0];
      if (!f) return res.status(404).json({ error: 'Esa fila no existe en esta base de datos.' });
      const m = mapearValores(await columnasDe(t.id), req.body?.values);
      if ('error' in m) return res.status(400).json({ error: m.error });
      const w = await bdInterno.escribirCeldas!(req, String(req.params.rowId), m.celdas);
      if (w.codigo !== 200) return res.status(w.codigo).json(w.cuerpo);
      res.json({ id: String(req.params.rowId), database_id: t.id, updated: Object.keys(m.celdas).length });
    } catch (e: any) { console.error('v1 editar fila:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  // Lo que no existe bajo /api/v1 es un 404 de la API, no de la web.
  app.all('/api/v1/*', (_req: Request, res: Response) => res.status(404).json({ error: 'Ese endpoint no existe. Mira /desarrolladores.' }));
}
