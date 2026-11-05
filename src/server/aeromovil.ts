// ============================================================================
// AEROMÓVIL GOTA (2026-11-05)
// ============================================================================
// Eugenio: «publícalo en humanity.wiki/aeromovil, que desde ahí pueda dar
// comentarios de mejora y que se añadan en un menú superior las tareas
// pendientes para mejorar el diseño».
//
// La página es estática (el diseño, los planos y el plan se calculan en el
// navegador); lo único que se guarda aquí es el buzón de mejoras, en
// `aeromovil_tareas` (`drizzle/0164_aeromovil.sql`). Un comentario ES una
// tarea pendiente: cambia de estado, no de tabla.
//
// ── QUIÉN PUEDE QUÉ ───────────────────────────────────────────────────────
// · Comentar (proponer una mejora): cualquiera, sin cuenta. Lo sostienen un
//   freno por IP y hora (`frenos`), un campo trampa para robots y un tope.
// · Decidir (en curso, hecha, descartada, reabrir): el DUEÑO del Aeromóvil o
//   un administrador (2026-11-05, Eugenio: «haz que la página sea de la
//   propiedad de eugenio@lighthumanity.org»). El dueño es quien creó la página
//   `KW_AEROMOVIL_GOTA` (migración 0165), la que sale en su menú lateral.
//   Si esa fila no existe, solo deciden los administradores.
//
// `/api/aeromovil/tareas.txt` devuelve las pendientes en texto plano para
// pegárselas a la IA: «haz las tareas de esta lista».
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { ipDe, ritmo, esperaPendiente, type Regla } from './limites/index.js';

const MAX_TEXTO = 4_000;
const MAX_AUTOR = 80;
const AREAS = new Set(['general', 'carenado', 'chasis', 'suspension', 'ruedas', 'asientos', 'motor', 'baterias', 'planos']);
const ESTADOS = ['pendiente', 'en_curso', 'hecha', 'descartada'];

// 30 propuestas por hora y conexión: una persona escribiendo no llega; un bucle sí.
const FRENO_DISENO: Regla = { puerta: 'aeromovil-disenos', gracia: 120, baseSegundos: 30, topeSegundos: 1800, alFallar: 'cerrar' };
const MAX_PARAMETROS = 20_000;
const huella = (clave: string) => createHash('sha256').update(clave).digest('hex');
const FRENO: Regla = { puerta: 'aeromovil-tareas', gracia: 30, baseSegundos: 60, topeSegundos: 3600, alFallar: 'cerrar' };
const horaActual = () => new Date().toISOString().slice(0, 13);

async function conRitmo(db: any, req: Request, res: Response, regla: Regla = FRENO): Promise<boolean> {
  const quien = `${ipDe(req)}@${horaActual()}`;
  try {
    const espera = await esperaPendiente(db, regla, quien);
    if (espera > 0) {
      res.setHeader('Retry-After', String(espera));
      res.status(429).json({ error: `Demasiados comentarios seguidos desde esta conexión. Prueba en ${espera < 60 ? `${espera} segundos` : `${Math.ceil(espera / 60)} minutos`}.` });
      return false;
    }
  } catch (e: any) {
    console.error('aeromovil: freno roto', e?.message || e);
    res.status(503).json({ error: 'No se puede comprobar el límite de comentarios. Prueba en un momento.' });
    return false;
  }
  ritmo(db, regla, quien);
  return true;
}

const COLUMNAS = sql`id, area, texto, autor, origen, estado, respuesta, created_at, resuelta_at`;
/** La página del menú lateral cuyo creador es el dueño del Aeromóvil. */
const PAGINA_DUENO = 'KW_AEROMOVIL_GOTA';

async function dueno(db: any): Promise<{ id: string | null; nombre: string | null }> {
  const r = await db.execute(sql`
    SELECT w.creator_user_id AS id, coalesce(u.display_name, u.name) AS nombre
    FROM knowledge_windows w LEFT JOIN users u ON u.id = w.creator_user_id
    WHERE w.id = ${PAGINA_DUENO} AND w.archived_at IS NULL AND w.deleted_at IS NULL
  `);
  const f = r.rows[0] as any;
  return { id: f?.id ?? null, nombre: f?.nombre ?? null };
}

const puedeDecidir = (req: Request, d: { id: string | null }) =>
  !!req.user && ((d.id !== null && req.user.id === d.id) || (req.user.roleLevel ?? 0) >= 4);

export function registerAeromovilRoutes(app: Express, db: any) {
  /** GET /api/aeromovil/dueno — de quién es y si quien mira puede decidir. */
  app.get('/api/aeromovil/dueno', async (req: Request, res: Response) => {
    try {
      const d = await dueno(db);
      res.set('Cache-Control', 'no-store');
      res.json({ nombre: d.nombre, puedeDecidir: puedeDecidir(req, d), sesion: !!req.user });
    } catch (e: any) {
      console.error('aeromovil dueno:', e);
      res.status(500).json({ error: 'No se ha podido saber de quién es la página.' });
    }
  });

  /** GET /api/aeromovil/tareas[?estado=pendiente] */
  app.get('/api/aeromovil/tareas', async (req: Request, res: Response) => {
    try {
      const estado = ESTADOS.includes(String(req.query.estado)) ? String(req.query.estado) : null;
      const r = await db.execute(sql`
        SELECT ${COLUMNAS} FROM aeromovil_tareas
        WHERE (${estado}::text IS NULL OR estado = ${estado})
        ORDER BY (estado IN ('pendiente', 'en_curso')) DESC, created_at DESC
        LIMIT 500
      `);
      res.set('Cache-Control', 'no-store');
      res.json(r.rows);
    } catch (e: any) {
      console.error('aeromovil tareas:', e);
      res.status(500).json({ error: 'No se han podido leer las tareas.' });
    }
  });

  /** GET /api/aeromovil/tareas.txt — las pendientes, listas para la IA. */
  app.get('/api/aeromovil/tareas.txt', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT id, area, texto, autor FROM aeromovil_tareas
        WHERE estado IN ('pendiente', 'en_curso') ORDER BY created_at
      `);
      const lineas = (r.rows as any[]).map(t => `#${t.id} [${t.area}] ${String(t.texto).replace(/\s+/g, ' ').trim()}${t.autor ? ` — ${t.autor}` : ''}`);
      res.set('Cache-Control', 'no-store');
      res.type('text/plain; charset=utf-8').send(`Aeromóvil Gota — tareas pendientes (${lineas.length})\n\n${lineas.join('\n')}\n`);
    } catch (e: any) {
      res.status(500).type('text/plain').send('No se han podido leer las tareas.');
    }
  });

  /** POST /api/aeromovil/tareas — { texto, area?, autor? } */
  app.post('/api/aeromovil/tareas', async (req: Request, res: Response) => {
    try {
      // Campo trampa: invisible para las personas. Un robot lo rellena y se le
      // contesta «bien» sin guardar nada, para que no aprenda a esquivarlo.
      if (String(req.body?.web ?? '').trim()) return res.json({ id: 0, estado: 'pendiente' });
      const texto = String(req.body?.texto ?? '').trim();
      if (!texto) return res.status(400).json({ error: 'Escribe el comentario antes de enviarlo.' });
      if (texto.length > MAX_TEXTO) return res.status(400).json({ error: `El comentario es demasiado largo (máximo ${MAX_TEXTO} caracteres).` });
      const area = AREAS.has(String(req.body?.area)) ? String(req.body.area) : 'general';
      const autor = String(req.body?.autor ?? '').trim().slice(0, MAX_AUTOR) || null;
      if (!(await conRitmo(db, req, res))) return;
      const r = await db.execute(sql`
        INSERT INTO aeromovil_tareas (area, texto, autor, created_by)
        VALUES (${area}, ${texto}, ${autor}, ${req.user?.id ?? null})
        RETURNING ${COLUMNAS}
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('aeromovil tarea post:', e);
      res.status(500).json({ error: 'No se ha podido guardar el comentario.' });
    }
  });

  /** PATCH /api/aeromovil/tareas/:id — { estado, respuesta? } */
  app.patch('/api/aeromovil/tareas/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const estado = String(req.body?.estado ?? '');
      if (!Number.isInteger(id) || !ESTADOS.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido: pendiente, en_curso, hecha o descartada.' });
      }
      const d = await dueno(db);
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión con la cuenta del dueño para cambiar el estado de las tareas.' });
      if (!puedeDecidir(req, d)) return res.status(403).json({ error: `Solo ${d.nombre || 'el dueño del Aeromóvil'} puede marcar las tareas. Tú puedes comentar.` });
      const respuesta = req.body?.respuesta == null ? null : String(req.body.respuesta).slice(0, MAX_TEXTO);
      const r = await db.execute(sql`
        UPDATE aeromovil_tareas
        SET estado = ${estado},
            respuesta = COALESCE(${respuesta}, respuesta),
            resuelta_at = CASE WHEN ${estado} IN ('hecha', 'descartada') THEN now() ELSE NULL END
        WHERE id = ${id}
        RETURNING ${COLUMNAS}
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa tarea no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: 'No se ha podido cambiar la tarea.' });
    }
  });

  // ── DISEÑOS GUARDADOS (migración 0166) ────────────────────────────────────
  // Eugenio: «guardar configuraciones y tener varios diseños… que estén en el
  // menú». Crear: cualquiera. Cambiar o quitar: el dueño, un administrador o
  // quien lo creó (con la clave que se le dio al crearlo, guardada en su navegador).
  const COLS_DISENO = sql`id, nombre, parametros, autor, origen, created_at, updated_at`;
  const parametrosValidos = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= MAX_PARAMETROS;
  const nombreValido = (v: unknown) => String(v ?? '').trim().slice(0, 80);

  /** GET /api/aeromovil/disenos — los diseños vivos, el más reciente primero. */
  app.get('/api/aeromovil/disenos', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`SELECT ${COLS_DISENO} FROM aeromovil_disenos WHERE archived_at IS NULL ORDER BY (origen = 'equipo') DESC, updated_at DESC LIMIT 200`);
      res.set('Cache-Control', 'no-store');
      res.json(r.rows);
    } catch (e: any) {
      console.error('aeromovil disenos:', e);
      res.status(500).json({ error: 'No se han podido leer los diseños.' });
    }
  });

  /** POST /api/aeromovil/disenos — { nombre, parametros, autor? } → el diseño y su clave de edición. */
  app.post('/api/aeromovil/disenos', async (req: Request, res: Response) => {
    try {
      if (String(req.body?.web ?? '').trim()) return res.json({ diseno: null, clave: null });
      const nombre = nombreValido(req.body?.nombre);
      if (!nombre) return res.status(400).json({ error: 'Ponle un nombre al diseño.' });
      if (!parametrosValidos(req.body?.parametros)) return res.status(400).json({ error: 'Los parámetros del diseño no son válidos.' });
      const autor = String(req.body?.autor ?? '').trim().slice(0, MAX_AUTOR) || null;
      if (!(await conRitmo(db, req, res, FRENO_DISENO))) return;
      const clave = randomBytes(18).toString('base64url');
      const r = await db.execute(sql`
        INSERT INTO aeromovil_disenos (nombre, parametros, autor, clave_hash, created_by)
        VALUES (${nombre}, ${JSON.stringify(req.body.parametros)}::jsonb, ${autor}, ${huella(clave)}, ${req.user?.id ?? null})
        RETURNING ${COLS_DISENO}
      `);
      res.json({ diseno: r.rows[0], clave });
    } catch (e: any) {
      console.error('aeromovil diseno post:', e);
      res.status(500).json({ error: 'No se ha podido guardar el diseño.' });
    }
  });

  /** ¿Puede quien llama cambiar este diseño? Dueño, admin, quien lo creó con su cuenta, o la clave. */
  const puedeCambiarDiseno = async (req: Request, id: number) => {
    const r = await db.execute(sql`SELECT clave_hash, created_by, origen FROM aeromovil_disenos WHERE id = ${id} AND archived_at IS NULL`);
    const f = r.rows[0] as any;
    if (!f) return { existe: false, puede: false };
    if (puedeDecidir(req, await dueno(db))) return { existe: true, puede: true };
    if (f.origen === 'equipo') return { existe: true, puede: false };
    const clave = String(req.body?.clave ?? '');
    const puede = (!!req.user && f.created_by === req.user.id) || (!!clave && !!f.clave_hash && huella(clave) === f.clave_hash);
    return { existe: true, puede };
  };

  /** PUT /api/aeromovil/disenos/:id — { nombre?, parametros?, clave? } */
  app.put('/api/aeromovil/disenos/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Diseño no válido.' });
      const nombre = req.body?.nombre == null ? null : nombreValido(req.body.nombre);
      if (nombre === '') return res.status(400).json({ error: 'El nombre no puede quedar vacío.' });
      const params = req.body?.parametros;
      if (params != null && !parametrosValidos(params)) return res.status(400).json({ error: 'Los parámetros del diseño no son válidos.' });
      const p = await puedeCambiarDiseno(req, id);
      if (!p.existe) return res.status(404).json({ error: 'Ese diseño no existe.' });
      if (!p.puede) return res.status(403).json({ error: 'Este diseño es de otra persona: guárdalo como uno nuevo con tus cambios.' });
      if (!(await conRitmo(db, req, res, FRENO_DISENO))) return;
      const r = await db.execute(sql`
        UPDATE aeromovil_disenos
        SET nombre = COALESCE(${nombre}, nombre),
            parametros = COALESCE(${params == null ? null : JSON.stringify(params)}::jsonb, parametros),
            updated_at = now()
        WHERE id = ${id} RETURNING ${COLS_DISENO}
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('aeromovil diseno put:', e);
      res.status(500).json({ error: 'No se ha podido guardar el diseño.' });
    }
  });

  /** DELETE /api/aeromovil/disenos/:id — se archiva, no se borra. Body { clave? }. */
  app.delete('/api/aeromovil/disenos/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Diseño no válido.' });
      const p = await puedeCambiarDiseno(req, id);
      if (!p.existe) return res.status(404).json({ error: 'Ese diseño no existe.' });
      if (!p.puede) return res.status(403).json({ error: 'Solo quien creó este diseño o el dueño del Aeromóvil puede quitarlo.' });
      await db.execute(sql`UPDATE aeromovil_disenos SET archived_at = now() WHERE id = ${id}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: 'No se ha podido quitar el diseño.' });
    }
  });
}
