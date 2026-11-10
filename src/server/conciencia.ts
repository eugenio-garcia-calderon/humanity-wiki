// ============================================================================
// ESTUDIO SOBRE LA CONCIENCIA DEL SER HUMANO — el mapa editable (2026-11-10)
// ============================================================================
// Eugenio: «que se puedan modificar los conceptos, las flechas, para que
// podamos ir perfilando; que se pueda pinchar y arrastrar los objetos».
//
// The page (`src/pages/Conciencia.tsx`) draws the map in the browser. The only
// thing kept here is the map itself as JSON, in `conciencia_mapas`
// (`drizzle/0179_conciencia_mapa.sql`). While nobody has saved, `datos` is NULL
// and the page shows the map that ships in the code
// (`src/data/concienciaMapa.ts`); «Volver al original» sets it back to NULL.
//
// ── WHO CAN WHAT (the map) ───────────────────────────────────────────────────────────
// Reading: anyone. Saving the shared map (and restoring or resetting it):
// a signed-in account, level 1 — the catalogue level for CREATE_KNOWLEDGE_GRAPH,
// which is what a concept map is (src/server/CLAUDE.md: reuse the catalogue).
// Without an account the page still lets people move and change things, kept
// on their own device, and download the result.
//
// The Calendario Arte and the Aeromóvil are open to anyone without an account
// because Eugenio asked for it explicitly (2026-11-05). He has not asked for
// that here; opening it is one line (`puedeGuardar`) if he does. What makes
// shared editing safe either way is three things, not good faith:
//
//   1. HISTORY. Before the map changes, a copy is kept (at most one every 10
//      minutes while someone edits, always before restoring or resetting).
//      Anything broken is undone with «Restaurar».
//   2. RATE. A brake per IP and hour in `frenos`: a person editing never
//      notices it; a loop does.
//   3. SHAPE. Only known fields with bounded lengths are stored (`limpiarMapa`):
//      no free URLs (a node points to a study by id, never to a link), no
//      unknown keys, colours only as #rrggbb.
//
// `version` makes two people editing at once get a 409 instead of the second
// one silently erasing the first one's work.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ipDe, ritmo, esperaPendiente, type Regla } from './limites/index.js';

const CLAVE = 'principal';
const MAX_NODOS = 400;
const MAX_FLECHAS = 800;
const MAX_JSON = 400_000;
const MINUTOS_ENTRE_COPIAS = 10;
const COPIAS = 300;

// 600 saves per hour and connection: autosave while someone drags and types
// stays far below; a loop does not.
const FRENO: Regla = { puerta: 'conciencia-escritura', gracia: 600, baseSegundos: 30, topeSegundos: 900, alFallar: 'cerrar' };
const horaActual = () => new Date().toISOString().slice(0, 13);

/** Level needed to change the shared map. 1 = any signed-in account. */
const NIVEL_GUARDAR = 1;
const puedeGuardar = (req: Request) => !!req.user && (req.user.roleLevel ?? 0) >= NIVEL_GUARDAR;

function exigirCuenta(req: Request, res: Response): boolean {
  if (!req.user) { res.status(401).json({ error: 'Inicia sesión en humanity.wiki para guardar el mapa para todos. Tus cambios siguen guardados en este dispositivo.' }); return false; }
  if (!puedeGuardar(req)) { res.status(403).json({ error: `Guardar el mapa requiere nivel ${NIVEL_GUARDAR} o superior.` }); return false; }
  return true;
}

// Comments: 20 an hour per connection is far above a person writing; a bot is not.
const FRENO_COMENTARIO: Regla = { puerta: 'conciencia-comentarios', gracia: 20, baseSegundos: 60, topeSegundos: 3600, alFallar: 'cerrar' };
const MAX_COMENTARIO = 4_000;
const MAX_AUTOR = 80;
const MAX_PENDIENTES = 500;
const ESTADOS_COMENTARIO = new Set(['pendiente', 'hecha', 'descartada']);

async function conRitmo(db: any, req: Request, res: Response, regla: Regla = FRENO): Promise<boolean> {
  const quien = `${ipDe(req)}@${horaActual()}`;
  try {
    const espera = await esperaPendiente(db, regla, quien);
    if (espera > 0) {
      res.setHeader('Retry-After', String(espera));
      res.status(429).json({ error: `Demasiados cambios seguidos desde esta conexión. Prueba en ${espera < 60 ? `${espera} segundos` : `${Math.ceil(espera / 60)} minutos`}.` });
      return false;
    }
  } catch (e: any) {
    console.error('conciencia: freno roto', e?.message || e);
    res.status(503).json({ error: 'No se puede comprobar el límite de cambios. Prueba en un momento.' });
    return false;
  }
  ritmo(db, regla, quien);
  return true;
}

// ── What a map may contain ─────────────────────────────────────────────────

const FORMAS = new Set(['matriz', 'campo', 'estado', 'nivel', 'capacidad', 'canal', 'nota', 'titulo', 'estudio', 'franja']);
const ESTILOS = new Set(['continua', 'discontinua', 'puntos', 'onda', 'energia']);
const DIRECCIONES = new Set(['ida', 'vuelta', 'doble', 'ninguna']);
const POSICIONES = new Set(['abajo', 'arriba', 'izquierda', 'derecha']);
const ICONO = /^[a-zA-Z]{2,20}$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const ID = /^[\w-]{1,80}$/;

const texto = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined);

/** Returns a clean copy with only the known fields, or an error message. */
export function limpiarMapa(d: any): { mapa?: any; error?: string } {
  if (!d || typeof d !== 'object' || !Array.isArray(d.nodos) || !Array.isArray(d.flechas)) return { error: 'El mapa no tiene la forma esperada.' };
  if (d.nodos.length > MAX_NODOS) return { error: `Como mucho ${MAX_NODOS} conceptos.` };
  if (d.flechas.length > MAX_FLECHAS) return { error: `Como mucho ${MAX_FLECHAS} flechas.` };
  const ids = new Set<string>();
  const nodos: any[] = [];
  for (const n of d.nodos) {
    if (!n || !ID.test(n.id) || ids.has(n.id) || !FORMAS.has(n.forma)) return { error: 'Hay un concepto que no es válido.' };
    const x = num(n.x, -5000, 10000), y = num(n.y, -5000, 10000);
    if (x === undefined || y === undefined) return { error: 'Hay un concepto sin posición.' };
    ids.add(n.id);
    const limpio: any = { id: n.id, x, y, forma: n.forma, titulo: texto(n.titulo, 200) ?? '', color: COLOR.test(n.color) ? n.color : '#c9d4e8' };
    const sub = texto(n.subtitulo, 300); if (sub) limpio.subtitulo = sub;
    const exp = texto(n.explicacion, 4000); if (exp) limpio.explicacion = exp;
    if (Array.isArray(n.etiquetas)) {
      const et = n.etiquetas.map((e: unknown) => texto(e, 60)).filter(Boolean).slice(0, 12);
      if (et.length) limpio.etiquetas = et;
    }
    if (typeof n.icono === 'string' && ICONO.test(n.icono)) limpio.icono = n.icono;
    const tam = num(n.tam, 0.5, 2.2); if (tam !== undefined && tam !== 1) limpio.tam = tam;
    if (POSICIONES.has(n.etiquetaPos)) limpio.etiquetaPos = n.etiquetaPos;
    if (n.espejo === true) limpio.espejo = true;
    if (typeof n.estudio === 'string' && ID.test(n.estudio)) limpio.estudio = n.estudio;
    const ancho = num(n.ancho, 20, 6000); if (ancho !== undefined) limpio.ancho = ancho;
    const alto = num(n.alto, 20, 6000); if (alto !== undefined) limpio.alto = alto;
    nodos.push(limpio);
  }
  const fids = new Set<string>();
  const flechas: any[] = [];
  for (const f of d.flechas) {
    if (!f || !ID.test(f.id) || fids.has(f.id)) return { error: 'Hay una flecha que no es válida.' };
    if (!ids.has(f.de) || !ids.has(f.a)) continue; // an arrow whose concept was deleted just disappears
    fids.add(f.id);
    const limpia: any = {
      id: f.id, de: f.de, a: f.a,
      estilo: ESTILOS.has(f.estilo) ? f.estilo : 'continua',
      direccion: DIRECCIONES.has(f.direccion) ? f.direccion : 'ida',
      color: COLOR.test(f.color) ? f.color : '#c9d4e8',
    };
    const et = texto(f.etiqueta, 200); if (et) limpia.etiqueta = et;
    const curva = num(f.curva, -0.7, 0.7); if (curva) limpia.curva = curva;
    const grosor = num(f.grosor, 1, 8); if (grosor !== undefined && grosor !== 2) limpia.grosor = grosor;
    flechas.push(limpia);
  }
  // `version` is the layout generation (ESQUEMA_ACTUAL in src/data/concienciaMapa.ts).
  const version = Number.isInteger(d.version) && d.version >= 1 && d.version <= 99 ? d.version : 1;
  const mapa = { version, nodos, flechas };
  if (JSON.stringify(mapa).length > MAX_JSON) return { error: 'El mapa es demasiado grande.' };
  return { mapa };
}

export function registerConcienciaRoutes(app: Express, db: any) {
  /** Keep a copy of the map as it is now, if it is time to. */
  const copiar = async (motivo: string, siempre = false) => {
    try {
      await db.execute(sql`
        INSERT INTO conciencia_mapas_historial (clave, datos, version, autor_user_id, motivo)
        SELECT m.clave, m.datos, m.version, m.updated_by, ${motivo}
        FROM conciencia_mapas m
        WHERE m.clave = ${CLAVE} AND m.datos IS NOT NULL
          AND (${siempre} OR NOT EXISTS (
            SELECT 1 FROM conciencia_mapas_historial h
            WHERE h.clave = ${CLAVE}
              AND h.created_at > now() - (${MINUTOS_ENTRE_COPIAS}::int || ' minutes')::interval
          ))
      `);
      await db.execute(sql`
        DELETE FROM conciencia_mapas_historial
        WHERE clave = ${CLAVE} AND id NOT IN (
          SELECT id FROM conciencia_mapas_historial WHERE clave = ${CLAVE}
          ORDER BY created_at DESC LIMIT ${COPIAS})
      `);
    } catch (e: any) {
      // No copy, no write: opening editing to anyone is only acceptable because it can be undone.
      throw new Error('No se ha podido guardar la copia de seguridad del mapa; el cambio no se ha aplicado. ' + (e?.message || ''));
    }
  };

  /** GET /api/conciencia/mapa — the shared map (datos null = the one in the code). */
  app.get('/api/conciencia/mapa', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`SELECT datos, version, updated_at FROM conciencia_mapas WHERE clave = ${CLAVE}`);
      const fila = r.rows[0] as any;
      res.set('Cache-Control', 'no-store');
      res.json({ datos: fila?.datos ?? null, version: fila?.version ?? 0, actualizado: fila?.updated_at ?? null, puedeGuardar: puedeGuardar(req), sesion: !!req.user });
    } catch (e: any) {
      console.error('conciencia get:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/conciencia/mapa — save. Body: { datos, version }. `version` is the
   * one the screen loaded (0 if never saved). If it no longer matches, 409.
   */
  app.put('/api/conciencia/mapa', async (req: Request, res: Response) => {
    try {
      if (!exigirCuenta(req, res)) return;
      const { mapa, error } = limpiarMapa(req.body?.datos);
      if (error) return res.status(400).json({ error });
      const version = Number(req.body?.version ?? 0);
      if (!Number.isInteger(version) || version < 0) return res.status(400).json({ error: 'Versión no válida.' });
      if (!(await conRitmo(db, req, res))) return;
      await copiar('edición');
      const r = await db.execute(sql`
        INSERT INTO conciencia_mapas (clave, datos, version, updated_by, updated_at)
        VALUES (${CLAVE}, ${JSON.stringify(mapa)}::jsonb, 1, ${req.user?.id ?? null}, now())
        ON CONFLICT (clave) DO UPDATE
          SET datos = EXCLUDED.datos,
              version = conciencia_mapas.version + 1,
              updated_by = EXCLUDED.updated_by,
              updated_at = now()
          WHERE conciencia_mapas.version = ${version}
        RETURNING version, updated_at
      `);
      if (!r.rows.length) {
        return res.status(409).json({ error: 'Otra persona ha guardado el mapa mientras lo editabas.' });
      }
      const fila = r.rows[0] as any;
      res.json({ version: fila.version, actualizado: fila.updated_at });
    } catch (e: any) {
      console.error('conciencia put:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** DELETE /api/conciencia/mapa — back to the map in the code. A copy is kept first. */
  app.delete('/api/conciencia/mapa', async (req: Request, res: Response) => {
    try {
      if (!exigirCuenta(req, res)) return;
      if (!(await conRitmo(db, req, res))) return;
      await copiar('antes de volver al original', true);
      const r = await db.execute(sql`
        UPDATE conciencia_mapas
        SET datos = NULL, version = version + 1, updated_by = ${req.user?.id ?? null}, updated_at = now()
        WHERE clave = ${CLAVE}
        RETURNING version, updated_at
      `);
      const fila = r.rows[0] as any;
      res.json({ version: fila?.version ?? 0, actualizado: fila?.updated_at ?? null });
    } catch (e: any) {
      console.error('conciencia delete:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/conciencia/mapa/historial — the saved copies, newest first. */
  app.get('/api/conciencia/mapa/historial', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT h.id, h.version, h.motivo, h.created_at,
               jsonb_array_length(COALESCE(h.datos->'nodos', '[]'::jsonb)) AS nodos,
               jsonb_array_length(COALESCE(h.datos->'flechas', '[]'::jsonb)) AS flechas,
               COALESCE(u.display_name, u.name) AS autor
        FROM conciencia_mapas_historial h
        LEFT JOIN users u ON u.id = h.autor_user_id
        WHERE h.clave = ${CLAVE}
        ORDER BY h.created_at DESC
        LIMIT ${COPIAS}
      `);
      res.set('Cache-Control', 'no-store');
      res.json(r.rows);
    } catch (e: any) {
      console.error('conciencia historial:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/conciencia/historial/:id/restaurar — leave the map as in that copy. */
  app.post('/api/conciencia/historial/:id/restaurar', async (req: Request, res: Response) => {
    try {
      if (!exigirCuenta(req, res)) return;
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Copia no válida.' });
      const c = await db.execute(sql`SELECT datos FROM conciencia_mapas_historial WHERE id = ${id} AND clave = ${CLAVE}`);
      const copia = c.rows[0] as any;
      if (!copia) return res.status(404).json({ error: 'Esa copia ya no existe.' });
      if (!(await conRitmo(db, req, res))) return;
      // What is there now is kept too: restoring by mistake can be undone the same way.
      await copiar('antes de restaurar', true);
      const r = await db.execute(sql`
        INSERT INTO conciencia_mapas (clave, datos, version, updated_by, updated_at)
        VALUES (${CLAVE}, ${JSON.stringify(copia.datos)}::jsonb, 1, ${req.user?.id ?? null}, now())
        ON CONFLICT (clave) DO UPDATE
          SET datos = EXCLUDED.datos, version = conciencia_mapas.version + 1,
              updated_by = EXCLUDED.updated_by, updated_at = now()
        RETURNING datos, version, updated_at
      `);
      const fila = r.rows[0] as any;
      res.json({ datos: fila.datos, version: fila.version, actualizado: fila.updated_at });
    } catch (e: any) {
      console.error('conciencia restaurar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── THE MAILBOX OF IMPROVEMENTS AND COMMENTS (2026-11-10) ─────────────────
  // Anyone can write (like the Aeromóvil's mailbox); only an administrator
  // marks a comment done or discarded.

  /** GET /api/conciencia/comentarios — newest first. */
  app.get('/api/conciencia/comentarios', async (req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT id, texto, autor, estado, respuesta, created_at, resuelto_at
        FROM conciencia_comentarios
        ORDER BY (estado = 'pendiente') DESC, created_at DESC
        LIMIT 300
      `);
      res.set('Cache-Control', 'no-store');
      res.json({ comentarios: r.rows, puedeDecidir: (req.user?.roleLevel ?? 0) >= 4 });
    } catch (e: any) {
      console.error('conciencia comentarios:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/conciencia/comentarios.txt — the pending ones, to paste to the AI. */
  app.get('/api/conciencia/comentarios.txt', async (_req: Request, res: Response) => {
    try {
      const r = await db.execute(sql`
        SELECT id, texto, autor, created_at FROM conciencia_comentarios
        WHERE estado = 'pendiente' ORDER BY created_at
      `);
      const lineas = (r.rows as any[]).map(c => `#${c.id}${c.autor ? ` (${c.autor})` : ''}: ${String(c.texto).replace(/\s+/g, ' ')}`);
      res.set('Cache-Control', 'no-store');
      res.type('text/plain; charset=utf-8').send(
        `Mejoras y comentarios pendientes del mapa de la teoría sintérgica (humanity.wiki/conciencia): ${lineas.length}\n\n${lineas.join('\n')}\n`,
      );
    } catch (e: any) {
      res.status(500).type('text/plain').send(e.message);
    }
  });

  /** POST /api/conciencia/comentarios — leave an improvement or a comment. Body: { texto, autor?, web? } */
  app.post('/api/conciencia/comentarios', async (req: Request, res: Response) => {
    try {
      // `web` is a field people never see: only a robot fills it. It gets a
      // normal-looking answer and nothing is stored.
      if (typeof req.body?.web === 'string' && req.body.web.trim()) return res.json({ ok: true });
      const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
      if (texto.length < 3) return res.status(400).json({ error: 'Escribe tu mejora o comentario.' });
      if (texto.length > MAX_COMENTARIO) return res.status(400).json({ error: `Como mucho ${MAX_COMENTARIO} caracteres.` });
      const autor = typeof req.body?.autor === 'string' && req.body.autor.trim() ? req.body.autor.trim().slice(0, MAX_AUTOR) : null;
      if (!(await conRitmo(db, req, res, FRENO_COMENTARIO))) return;
      const p = await db.execute(sql`SELECT count(*)::int AS n FROM conciencia_comentarios WHERE estado = 'pendiente'`);
      if (((p.rows[0] as any)?.n ?? 0) >= MAX_PENDIENTES) {
        return res.status(503).json({ error: 'El buzón está lleno de propuestas sin revisar. Prueba dentro de unos días.' });
      }
      const r = await db.execute(sql`
        INSERT INTO conciencia_comentarios (texto, autor, autor_user_id)
        VALUES (${texto}, ${autor}, ${req.user?.id ?? null})
        RETURNING id, texto, autor, estado, respuesta, created_at, resuelto_at
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('conciencia comentar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/conciencia/comentarios/:id — { estado, respuesta? }. Administrators only. */
  app.put('/api/conciencia/comentarios/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      if ((req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel 4 o superior.' });
      const id = Number(req.params.id);
      const estado = String(req.body?.estado || '');
      if (!Number.isInteger(id) || !ESTADOS_COMENTARIO.has(estado)) return res.status(400).json({ error: 'Datos no válidos.' });
      const respuesta = typeof req.body?.respuesta === 'string' && req.body.respuesta.trim() ? req.body.respuesta.trim().slice(0, MAX_COMENTARIO) : null;
      const r = await db.execute(sql`
        UPDATE conciencia_comentarios
        SET estado = ${estado}, respuesta = COALESCE(${respuesta}, respuesta),
            resuelto_at = CASE WHEN ${estado} = 'pendiente' THEN NULL ELSE now() END
        WHERE id = ${id}
        RETURNING id, texto, autor, estado, respuesta, created_at, resuelto_at
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Ese comentario no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('conciencia decidir:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
