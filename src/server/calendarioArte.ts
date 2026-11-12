// ============================================================================
// CALENDARIO ARTE PARA LA HUMANIDAD (2026-11-04)
// ============================================================================
// Eugenio: doce ilustraciones, una por mes, con una franja de herramienta o
// juego y una frase pedagógica para cada día; editable desde cualquier
// dispositivo, con una carpeta de referencias por mes y un buzón de ideas que
// la IA lee de vez en cuando para implementar las mejoras pendientes.
//
// Tablas en `drizzle/0161_calendario_arte.sql` y `0162_…_historial.sql`. El
// contenido por defecto vive en `src/data/calendarioArte.ts`: aquí solo se
// guarda lo que alguien cambió.
//
// ── QUIÉN PUEDE QUÉ: CUALQUIERA (2026-11-05) ──────────────────────────────
// Eugenio: «haz que cualquier persona sin necesidad de registrarse pueda
// editar el contenido desde este enlace, pero que no se indexe en Google».
// Hasta ese día editar pedía nivel 3. Ahora todas las rutas de escritura están
// abiertas, y lo que sostiene eso son tres piezas, no la buena fe:
//
//   1. HISTORIAL. Antes de cambiar un mes se guarda una copia (como mucho una
//      cada 10 minutos mientras se edita, y siempre antes de restaurar). Lo
//      que estropee alguien se deshace con «Restaurar», también sin cuenta.
//   2. RITMO. Un freno por IP y por hora en `frenos` (el limitador de la casa):
//      quien escribe a mano no lo nota; un bucle sí. Las fotos tienen el suyo,
//      más estricto, porque ocupan disco de verdad.
//   3. NADA DE FUERA. Las imágenes solo pueden ser subidas aquí o de la
//      propia carpeta del calendario: un enlace https a otra web permitiría a
//      cualquiera meter una imagen que rastrea a quien abre la página.
//
// Y para que Google no lo indexe: `X-Robots-Tag: noindex` en la página, en
// sus imágenes y en su API (más la etiqueta `robots` que pone la propia página).
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { guardarArchivo } from './uploads';
import { ipDe, ritmo, esperaPendiente, type Regla } from './limites/index.js';

/** Un mes entero cabe holgado en 60 kB (31 frases, franja, textos). */
const MAX_CONTENIDO = 200_000;
const MAX_REFERENCIAS = 200;
const MAX_IDEA = 4_000;
/** Cada cuánto, como mucho, se guarda una copia mientras alguien edita. */
const MINUTOS_ENTRE_COPIAS = 10;
/** Copias que se conservan por mes. */
const COPIAS_POR_MES = 300;

// ── LOS FRENOS ─────────────────────────────────────────────────────────────
// El contador de `frenos` no baja solo, así que la clave lleva la HORA: cada
// hora empieza limpia y el barrido de 2 días se lleva las viejas. 600
// guardados por hora es ~10 por minuto sin parar durante una hora: el
// autoguardado de una persona escribiendo no llega; un bucle sí.
const FRENO_ESCRITURA: Regla = { puerta: 'calendario-escritura', gracia: 600, baseSegundos: 30, topeSegundos: 900, alFallar: 'cerrar' };
const FRENO_SUBIDA: Regla = { puerta: 'calendario-subida', gracia: 40, baseSegundos: 60, topeSegundos: 3600, alFallar: 'cerrar' };
const FRENO_IDEA: Regla = { puerta: 'calendario-idea', gracia: 30, baseSegundos: 60, topeSegundos: 3600, alFallar: 'cerrar' };

// Diseños nuevos pedidos con el botón (2026-11-05). Pedir uno es barato para
// el servidor (una fila), pero cada uno cuesta un rato de dibujo: 6 por hora y
// conexión, y como mucho 30 esperando a la vez.
const FRENO_DISENO: Regla = { puerta: 'calendario-diseno', gracia: 6, baseSegundos: 300, topeSegundos: 3600, alFallar: 'cerrar' };
const FRENO_ROBOT: Regla = { puerta: 'calendario-robot', gracia: 300, baseSegundos: 30, topeSegundos: 900, alFallar: 'cerrar' };
const MAX_EN_COLA = 30;
const MAX_PROMPT = 2_000;
/** Lo que tarda, más o menos, en dibujarse un diseño, y cuántos caben en una pasada. */
const MIN_POR_DISENO = 20;
const DISENOS_POR_PASADA = 3;
const ESTADOS_DISENO = new Set(['en_cola', 'dibujando', 'listo', 'error', 'descartado']);

/**
 * La hora a la que, más o menos, estará listo el encargo que ocupa `posicion`
 * en la cola (0 = el siguiente). Sale de la última pasada del dibujante y su
 * intervalo. Nulo si nunca ha pasado: entonces NO se inventa una hora.
 */
function horaEstimada(posicion: number, ultima: Date | null, intervaloMin: number, ahora = Date.now()): string | null {
  if (!ultima) return null;
  const intervalo = intervaloMin * 60_000;
  let proxima = ultima.getTime() + intervalo;
  // Si se saltó pasadas (ordenador apagado, límite de uso), la siguiente es la
  // primera que aún no ha llegado.
  while (proxima < ahora - 5 * 60_000) proxima += intervalo;
  const tanda = Math.floor(posicion / DISENOS_POR_PASADA);
  const dentro = (posicion % DISENOS_POR_PASADA) + 1;
  return new Date(Math.max(proxima, ahora) + tanda * intervalo + dentro * MIN_POR_DISENO * 60_000).toISOString();
}

const horaActual = () => new Date().toISOString().slice(0, 13);

/** Comprueba y anota el ritmo. Devuelve false (y ya contestó) si hay que esperar. */
async function conRitmo(db: any, regla: Regla, req: Request, res: Response): Promise<boolean> {
  const quien = `${ipDe(req)}@${horaActual()}`;
  try {
    const espera = await esperaPendiente(db, regla, quien);
    if (espera > 0) {
      res.setHeader('Retry-After', String(espera));
      res.status(429).json({ error: `Demasiados cambios seguidos desde esta conexión. Prueba en ${espera < 60 ? `${espera} segundos` : Math.ceil(espera / 60) === 1 ? '1 minuto' : `${Math.ceil(espera / 60)} minutos`}.` });
      return false;
    }
  } catch (e: any) {
    console.error('calendario-arte: freno roto', e?.message || e);
    res.status(503).json({ error: 'No se puede comprobar el límite de cambios. Prueba en un momento.' });
    return false;
  }
  ritmo(db, regla, quien);
  return true;
}

function anioValido(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2020 && n <= 2100 ? n : null;
}
function mesValido(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}
/** Para las hojas: 1-12 son los meses y 0 lo común (principios, carpeta de estilo). */
function hojaValida(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 12 ? n : null;
}

/** Solo imágenes subidas a la plataforma o de la carpeta del calendario. */
function urlImagenValida(u: unknown): u is string {
  return typeof u === 'string' && u.length < 2_000
    && (u.startsWith('/uploads/') || u.startsWith('/calendario-arte/'));
}

/** Qué es cada imagen de la carpeta del mes (2026-11-05): una ilustración
 *  candidata, un boceto o una referencia de inspiración. Sin tipo = referencia
 *  (así estaban guardadas las de antes). */
const TIPOS_CARPETA = new Set(['ilustracion', 'boceto', 'referencia']);

/** Limpia la carpeta: url válida, tipo conocido y una nota corta opcional. */
function limpiarReferencias(lista: unknown): { url: string; nota?: string; tipo?: string }[] | null {
  if (!Array.isArray(lista) || lista.length > MAX_REFERENCIAS) return null;
  const out: { url: string; nota?: string; tipo?: string }[] = [];
  for (const r of lista) {
    if (!r || !urlImagenValida((r as any).url)) return null;
    const x: { url: string; nota?: string; tipo?: string } = { url: (r as any).url };
    if (typeof (r as any).nota === 'string' && (r as any).nota.trim()) x.nota = (r as any).nota.slice(0, 500);
    if (TIPOS_CARPETA.has((r as any).tipo)) x.tipo = (r as any).tipo;
    out.push(x);
  }
  return out;
}

/** ¿Hay alguna imagen de fuera en el contenido? (ilustración o cualquier campo `imagen`). */
function imagenesValidas(contenido: any): boolean {
  if (contenido?.imagen && !urlImagenValida(contenido.imagen)) return false;
  if (contenido?.alternativa && !urlImagenValida(contenido.alternativa)) return false;
  return composicionValida(contenido?.composicion);
}

/** Lo movido y añadido en las ilustraciones por elementos (2026-11-12):
 *  números normales y, en lo añadido, solo imágenes subidas aquí. */
function composicionValida(comp: unknown): boolean {
  if (comp === undefined || comp === null) return true;
  if (typeof comp !== 'object' || Array.isArray(comp)) return false;
  const num = (v: unknown, a: number, b: number) => v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b);
  for (const [clave, d] of Object.entries(comp as Record<string, any>)) {
    if (!/^mes-\d{2}(-[a-z])?$/.test(clave) || !d || typeof d !== 'object') return false;
    if (d.capas !== undefined) {
      if (typeof d.capas !== 'object' || Array.isArray(d.capas)) return false;
      for (const a of Object.values(d.capas as Record<string, any>)) {
        if (!a || typeof a !== 'object' || !num(a.dx, -2, 2) || !num(a.dy, -2, 2) || !num(a.escala, 0.05, 10)) return false;
      }
    }
    if (d.extra !== undefined) {
      if (!Array.isArray(d.extra) || d.extra.length > 60) return false;
      for (const e of d.extra) {
        if (!e || typeof e.id !== 'string' || e.id.length > 40 || !urlImagenValida(e.src)) return false;
        if (!num(e.x, -1, 2) || !num(e.y, -1, 2) || !num(e.ancho, 0.005, 3)) return false;
      }
    }
  }
  return true;
}

const IMAGENES_SUBIBLES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);

export function registerCalendarioArteRoutes(app: Express, db: any) {
  // ── QUE GOOGLE NO LO INDEXE ───────────────────────────────────────────────
  // Va antes que el comodín de la aplicación (server.ts) porque los módulos se
  // montan antes; solo pone la cabecera y deja pasar. Cubre la página
  // (`/calendario-arte` y `/calendario-arte/`), sus imágenes y su API.
  // A propósito NO se pone en `robots.txt`: si se prohíbe rastrear, Google no
  // llega a leer el `noindex` y puede indexar la dirección igualmente.
  app.use(['/calendario-arte', '/api/calendario-arte'], (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, noimageindex');
    next();
  });

  /** Guarda una copia del mes tal como está ahora, si toca. */
  const copiar = async (anio: number, mes: number, motivo: string, siempre = false) => {
    try {
      await db.execute(sql`
        INSERT INTO calendario_arte_historial (anio, mes, contenido, referencias, version, autor_user_id, motivo)
        SELECT m.anio, m.mes, m.contenido, m.referencias, m.version, m.updated_by, ${motivo}
        FROM calendario_arte_meses m
        WHERE m.anio = ${anio} AND m.mes = ${mes}
          AND (${siempre} OR NOT EXISTS (
            SELECT 1 FROM calendario_arte_historial h
            WHERE h.anio = ${anio} AND h.mes = ${mes}
              AND h.created_at > now() - (${MINUTOS_ENTRE_COPIAS}::int || ' minutes')::interval
          ))
      `);
      await db.execute(sql`
        DELETE FROM calendario_arte_historial
        WHERE anio = ${anio} AND mes = ${mes} AND id NOT IN (
          SELECT id FROM calendario_arte_historial WHERE anio = ${anio} AND mes = ${mes}
          ORDER BY created_at DESC LIMIT ${COPIAS_POR_MES})
      `);
    } catch (e: any) {
      // Sin copia no se escribe: abrir la edición solo es aceptable porque se
      // puede deshacer. Si no se puede guardar el «antes», no hay «después».
      throw new Error('No se ha podido guardar la copia de seguridad del mes; el cambio no se ha aplicado. ' + (e?.message || ''));
    }
  };

  /** GET /api/calendario-arte/:anio — lo editado de los doce meses. */
  app.get('/api/calendario-arte/:anio', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      const r = await db.execute(sql`
        SELECT mes, contenido, referencias, version, updated_at
        FROM calendario_arte_meses WHERE anio = ${anio} ORDER BY mes
      `);
      res.set('Cache-Control', 'no-store');
      // Abierto a todos: lo dice el servidor para que la pantalla no tenga
      // que adivinarlo (y para poder cerrarlo mañana cambiando una línea).
      res.json({ anio, meses: r.rows, puedeEditar: true, puedeProponer: true, sesion: !!req.user });
    } catch (e: any) {
      console.error('calendario-arte get:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/calendario-arte/:anio/:mes — guardar el contenido de un mes.
   * Cuerpo: { contenido, version }. `version` es la que tenía la pantalla al
   * empezar a editar (0 si el mes nunca se había guardado). Si no coincide,
   * 409: alguien guardó entretanto y hay que recargar antes de pisarle.
   */
  app.put('/api/calendario-arte/:anio/:mes', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      const contenido = req.body?.contenido;
      if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)) {
        return res.status(400).json({ error: 'Falta el contenido del mes.' });
      }
      const texto = JSON.stringify(contenido);
      if (texto.length > MAX_CONTENIDO) return res.status(413).json({ error: 'El contenido de este mes es demasiado grande.' });
      if (!imagenesValidas(contenido)) {
        return res.status(400).json({ error: 'La ilustración y los elementos añadidos tienen que ser imágenes subidas desde el calendario.' });
      }
      if (!(await conRitmo(db, FRENO_ESCRITURA, req, res))) return;
      const version = Number(req.body?.version ?? 0);

      await copiar(anio, mes, 'edición');
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_meses (anio, mes, contenido, version, updated_by, updated_at)
        VALUES (${anio}, ${mes}, ${texto}::jsonb, 1, ${req.user?.id ?? null}, now())
        ON CONFLICT (anio, mes) DO UPDATE
          SET contenido = EXCLUDED.contenido,
              version = calendario_arte_meses.version + 1,
              updated_by = EXCLUDED.updated_by,
              updated_at = now()
          WHERE calendario_arte_meses.version = ${version}
        RETURNING mes, contenido, referencias, version, updated_at
      `);
      if (!r.rows.length) {
        return res.status(409).json({ error: 'Otra persona ha guardado este mes mientras lo editabas. Recarga para ver sus cambios antes de guardar los tuyos.' });
      }
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte put:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/calendario-arte/:anio/:mes/referencias — AÑADIR una imagen a la
   * carpeta del mes (2026-11-10, Eugenio: «que cualquier persona con el link
   * pueda agregar referencias en cada mes… con un más»).
   *
   * Why not the PUT below: the PUT replaces the whole list with what the
   * browser believes the folder holds. With anyone able to add from any open
   * tab, someone who opened the page an hour ago and adds one picture would
   * silently erase every picture added since. Appending happens in the
   * database, in one statement, so two people adding at once both keep theirs.
   * Body: `{ url, tipo?, nota? }`, the same shape as one entry of the list.
   */
  app.post('/api/calendario-arte/:anio/:mes/referencias', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      const nueva = limpiarReferencias([req.body ?? {}])?.[0];
      if (!nueva) return res.status(400).json({ error: 'Imagen no válida: tiene que estar subida desde el calendario.' });
      if (!(await conRitmo(db, FRENO_ESCRITURA, req, res))) return;
      await copiar(anio, mes, 'carpeta');
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_meses (anio, mes, referencias, version, updated_by, updated_at)
        VALUES (${anio}, ${mes}, ${JSON.stringify([nueva])}::jsonb, 0, ${req.user?.id ?? null}, now())
        ON CONFLICT (anio, mes) DO UPDATE
          SET referencias = CASE
                WHEN calendario_arte_meses.referencias @> ${JSON.stringify([{ url: nueva.url }])}::jsonb
                  THEN calendario_arte_meses.referencias
                ELSE calendario_arte_meses.referencias || EXCLUDED.referencias END,
              updated_by = EXCLUDED.updated_by, updated_at = now()
          WHERE jsonb_array_length(calendario_arte_meses.referencias) < ${MAX_REFERENCIAS}
        RETURNING mes, contenido, referencias, version, updated_at
      `);
      if (!r.rows[0]) return res.status(409).json({ error: `La carpeta de este mes está llena (máximo ${MAX_REFERENCIAS} imágenes). Quita alguna antes de añadir otra.` });
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte añadir referencia:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/calendario-arte/:anio/:mes/referencias — la carpeta del mes.
   * Va aparte del contenido para que añadir una foto de referencia no choque
   * con alguien que está corrigiendo frases al mismo tiempo.
   */
  app.put('/api/calendario-arte/:anio/:mes/referencias', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      const referencias = limpiarReferencias(req.body?.referencias);
      if (!referencias) return res.status(400).json({ error: `Lista de referencias no válida (máximo ${MAX_REFERENCIAS} imágenes subidas desde el calendario).` });
      if (!(await conRitmo(db, FRENO_ESCRITURA, req, res))) return;
      await copiar(anio, mes, 'carpeta');
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_meses (anio, mes, referencias, version, updated_by, updated_at)
        VALUES (${anio}, ${mes}, ${JSON.stringify(referencias)}::jsonb, 0, ${req.user?.id ?? null}, now())
        ON CONFLICT (anio, mes) DO UPDATE
          SET referencias = EXCLUDED.referencias, updated_by = EXCLUDED.updated_by, updated_at = now()
        RETURNING mes, contenido, referencias, version, updated_at
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte referencias:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * DELETE /api/calendario-arte/:anio/:mes — volver al contenido original del
   * código. Las referencias NO se tocan: son trabajo de alguien, no un ajuste.
   * Antes se guarda una copia, así que también esto se puede deshacer.
   */
  app.delete('/api/calendario-arte/:anio/:mes', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      if (!(await conRitmo(db, FRENO_ESCRITURA, req, res))) return;
      await copiar(anio, mes, 'antes de volver al original', true);
      await db.execute(sql`
        UPDATE calendario_arte_meses
        SET contenido = '{}'::jsonb, version = version + 1, updated_by = ${req.user?.id ?? null}, updated_at = now()
        WHERE anio = ${anio} AND mes = ${mes}
      `);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── HISTORIAL ─────────────────────────────────────────────────────────────

  /** GET /api/calendario-arte/:anio/:mes/historial — las copias guardadas. */
  app.get('/api/calendario-arte/:anio/:mes/historial', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      const mes = hojaValida(req.params.mes);
      if (!anio || mes === null) return res.status(400).json({ error: 'Año o mes no válido.' });
      const r = await db.execute(sql`
        SELECT h.id, h.version, h.motivo, h.created_at,
               h.contenido->>'tema' AS tema, h.contenido->>'lema' AS lema,
               jsonb_array_length(COALESCE(h.contenido->'dias', '[]'::jsonb)) AS dias,
               jsonb_array_length(h.referencias) AS referencias,
               COALESCE(u.display_name, u.name) AS autor
        FROM calendario_arte_historial h
        LEFT JOIN users u ON u.id = h.autor_user_id
        WHERE h.anio = ${anio} AND h.mes = ${mes}
        ORDER BY h.created_at DESC
        LIMIT ${COPIAS_POR_MES}
      `);
      res.set('Cache-Control', 'no-store');
      res.json(r.rows);
    } catch (e: any) {
      console.error('calendario-arte historial:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/calendario-arte/historial/:id/restaurar — dejar el mes como en esa copia. */
  app.post('/api/calendario-arte/historial/:id/restaurar', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Copia no válida.' });
      const c = await db.execute(sql`SELECT anio, mes, contenido, referencias FROM calendario_arte_historial WHERE id = ${id}`);
      const copia = c.rows[0] as any;
      if (!copia) return res.status(404).json({ error: 'Esa copia ya no existe.' });
      if (!(await conRitmo(db, FRENO_ESCRITURA, req, res))) return;
      // Lo de ahora también se guarda: restaurar por error se deshace igual.
      await copiar(copia.anio, copia.mes, 'antes de restaurar', true);
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_meses (anio, mes, contenido, referencias, version, updated_by, updated_at)
        VALUES (${copia.anio}, ${copia.mes}, ${JSON.stringify(copia.contenido)}::jsonb, ${JSON.stringify(copia.referencias)}::jsonb, 1, ${req.user?.id ?? null}, now())
        ON CONFLICT (anio, mes) DO UPDATE
          SET contenido = EXCLUDED.contenido, referencias = EXCLUDED.referencias,
              version = calendario_arte_meses.version + 1, updated_by = EXCLUDED.updated_by, updated_at = now()
        RETURNING mes, contenido, referencias, version, updated_at
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte restaurar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── SUBIR IMÁGENES SIN CUENTA ─────────────────────────────────────────────
  // `/api/uploads` pide sesión (y debe seguir pidiéndola: sirve a toda la
  // plataforma). Esta puerta es solo para el calendario y solo admite
  // imágenes, con el mismo tope de tamaño que la general y su propio freno.
  app.post('/api/calendario-arte/subir',
    express.raw({ type: 'application/octet-stream', limit: 12 * 1024 * 1024 }),
    async (req: Request, res: Response) => {
      try {
        const tipo = String(req.query.type || '').toLowerCase().split(';')[0].trim();
        if (!IMAGENES_SUBIBLES.has(tipo)) {
          return res.status(400).json({ error: 'Aquí solo se pueden subir imágenes (JPG, PNG, WebP, GIF o AVIF).' });
        }
        const bytes = req.body as Buffer;
        if (!Buffer.isBuffer(bytes) || bytes.length === 0) return res.status(400).json({ error: 'La imagen llegó vacía.' });
        if (!(await conRitmo(db, FRENO_SUBIDA, req, res))) return;
        res.json(guardarArchivo(tipo, bytes));
      } catch (e: any) {
        console.error('calendario-arte subir:', e);
        res.status(/supera/.test(e?.message || '') ? 413 : 500).json({ error: e.message });
      }
    },
  );

  // ── BUZÓN DE IDEAS ────────────────────────────────────────────────────────

  const listarIdeas = async (anio: number, estado: string | null) => db.execute(sql`
    SELECT i.id, i.mes, i.texto, i.imagenes, i.estado, i.respuesta, i.created_at, i.resuelta_at,
           COALESCE(u.display_name, u.name) AS autor
    FROM calendario_arte_ideas i
    LEFT JOIN users u ON u.id = i.created_by
    WHERE i.anio = ${anio} AND (${estado}::text IS NULL OR i.estado = ${estado})
    ORDER BY (i.estado = 'pendiente') DESC, i.created_at DESC
    LIMIT 500
  `);

  /** GET /api/calendario-arte/:anio/ideas[?estado=pendiente] */
  app.get('/api/calendario-arte/:anio/ideas', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      const estado = ['pendiente', 'hecha', 'descartada'].includes(String(req.query.estado)) ? String(req.query.estado) : null;
      const r = await listarIdeas(anio, estado);
      res.set('Cache-Control', 'no-store');
      res.json(r.rows);
    } catch (e: any) {
      console.error('calendario-arte ideas:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/calendario-arte/:anio/ideas.txt — las pendientes en texto plano,
   * listas para pegárselas a la IA: «haz todas las tareas de esta lista».
   */
  app.get('/api/calendario-arte/:anio/ideas.txt', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).type('text/plain').send('Año no válido.');
      const r = await listarIdeas(anio, 'pendiente');
      const lineas = (r.rows as any[]).map(i =>
        `#${i.id} [${i.mes ? `mes ${i.mes}` : 'general'}] ${String(i.texto).replace(/\s+/g, ' ').trim()}`
        + ((i.imagenes || []) as string[]).map(u => `\n    imagen: https://humanity.wiki${u}`).join(''));
      res.set('Cache-Control', 'no-store');
      res.type('text/plain; charset=utf-8').send(
        `Calendario Arte para la Humanidad ${anio} — ideas pendientes (${lineas.length})\n\n${lineas.join('\n')}\n`);
    } catch (e: any) {
      res.status(500).type('text/plain').send(e.message);
    }
  });

  /** POST /api/calendario-arte/:anio/ideas — { texto, mes? } */
  app.post('/api/calendario-arte/:anio/ideas', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      // Campo trampa: invisible para las personas. Un robot lo rellena y se le
      // contesta «bien» sin guardar nada, para que no aprenda a esquivarlo.
      if (String(req.body?.web ?? '').trim()) return res.json({ id: 0, estado: 'pendiente' });
      const imagenes = Array.isArray(req.body?.imagenes) ? (req.body.imagenes as unknown[]).filter(urlImagenValida).slice(0, 3) : [];
      const texto = String(req.body?.texto ?? '').trim() || (imagenes.length ? '(propuesta con imágenes)' : '');
      if (!texto) return res.status(400).json({ error: 'Escribe la propuesta antes de enviarla.' });
      if (texto.length > MAX_IDEA) return res.status(400).json({ error: `La idea es demasiado larga (máximo ${MAX_IDEA} caracteres).` });
      const mes = req.body?.mes == null || req.body?.mes === '' ? null : mesValido(req.body.mes);
      if (!(await conRitmo(db, FRENO_IDEA, req, res))) return;
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_ideas (anio, mes, texto, imagenes, created_by)
        VALUES (${anio}, ${mes}, ${texto}, ${JSON.stringify(imagenes)}::jsonb, ${req.user?.id ?? null})
        RETURNING id, mes, texto, imagenes, estado, respuesta, created_at, resuelta_at
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte idea post:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PATCH /api/calendario-arte/ideas/:id — { estado, respuesta? } */
  app.patch('/api/calendario-arte/ideas/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const estado = String(req.body?.estado ?? '');
      if (!Number.isInteger(id) || !['pendiente', 'hecha', 'descartada'].includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido: pendiente, hecha o descartada.' });
      }
      if (!(await conRitmo(db, FRENO_IDEA, req, res))) return;
      const respuesta = req.body?.respuesta == null ? null : String(req.body.respuesta).slice(0, MAX_IDEA);
      const r = await db.execute(sql`
        UPDATE calendario_arte_ideas
        SET estado = ${estado},
            respuesta = COALESCE(${respuesta}, respuesta),
            resuelta_at = CASE WHEN ${estado} = 'pendiente' THEN NULL ELSE now() END
        WHERE id = ${id}
        RETURNING id, mes, texto, imagenes, estado, respuesta, created_at, resuelta_at
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa idea no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── DISEÑOS NUEVOS: LA COLA DEL DIBUJANTE AUTOMÁTICO ─────────────────────
  // Ver `drizzle/0169_calendario_arte_disenos.sql`. El botón apunta el encargo;
  // lo dibuja una tarea programada de Claude en la cuenta de Eugenio, que llama
  // a `robot/pasada` al empezar y marca cada encargo con PATCH al terminar.

  const leerRobot = async () => {
    const r = await db.execute(sql`SELECT ultima_pasada, intervalo_min FROM calendario_arte_robot WHERE id = 1`);
    const f = r.rows[0] as any;
    const ultima = f?.ultima_pasada ? new Date(f.ultima_pasada) : null;
    const intervalo = Number(f?.intervalo_min) || 60;
    // «Activo» = ha pasado en las dos últimas vueltas. Si no, la pantalla lo
    // dice en vez de prometer una hora que nadie va a cumplir.
    // Con el vigilante de 30 s (intervalo 1 min) se deja un margen de 10 min
    // para el relevo de una sesión a la siguiente.
    const activo = !!ultima && Date.now() - ultima.getTime() < Math.max(2.5 * intervalo, 10) * 60_000;
    return { ultima, intervalo, activo };
  };

  /** Lista con la hora estimada de cada encargo pendiente. */
  const listarDisenos = async (anio: number, todos: boolean) => {
    const robot = await leerRobot();
    const r = await db.execute(sql`
      SELECT id, mes, prompt, estado, url, nota, created_at, empezado_at, terminado_at
      FROM calendario_arte_disenos
      WHERE anio = ${anio} AND (${todos} OR estado <> 'descartado')
      ORDER BY created_at ASC, id ASC
      LIMIT 500
    `);
    let posicion = 0;
    const disenos = (r.rows as any[]).map(d => {
      let listo_hacia: string | null = null;
      if (d.estado === 'en_cola') listo_hacia = horaEstimada(posicion++, robot.ultima, robot.intervalo);
      else if (d.estado === 'dibujando' && d.empezado_at) {
        listo_hacia = new Date(Math.max(Date.now() + 2 * 60_000, new Date(d.empezado_at).getTime() + MIN_POR_DISENO * 60_000)).toISOString();
      }
      return { ...d, listo_hacia };
    });
    return {
      disenos,
      robot: { ultima_pasada: robot.ultima?.toISOString() ?? null, intervalo_min: robot.intervalo, activo: robot.activo },
    };
  };

  /** GET /api/calendario-arte/:anio/disenos[?todos=1] */
  app.get('/api/calendario-arte/:anio/disenos', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      res.set('Cache-Control', 'no-store');
      res.json(await listarDisenos(anio, req.query.todos === '1'));
    } catch (e: any) {
      console.error('calendario-arte disenos:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/calendario-arte/:anio/disenos — { mes, prompt } */
  app.post('/api/calendario-arte/:anio/disenos', async (req: Request, res: Response) => {
    try {
      const anio = anioValido(req.params.anio);
      if (!anio) return res.status(400).json({ error: 'Año no válido.' });
      if (String(req.body?.web ?? '').trim()) return res.json({ id: 0, estado: 'en_cola' });
      const mes = mesValido(req.body?.mes);
      if (!mes) return res.status(400).json({ error: 'Falta el mes del diseño.' });
      const prompt = String(req.body?.prompt ?? '').trim();
      if (prompt.length < 5) return res.status(400).json({ error: 'Describe el diseño que quieres antes de pedirlo.' });
      if (prompt.length > MAX_PROMPT) return res.status(400).json({ error: `La descripción es demasiado larga (máximo ${MAX_PROMPT} caracteres).` });
      const cola = await db.execute(sql`SELECT count(*)::int AS n FROM calendario_arte_disenos WHERE estado IN ('en_cola', 'dibujando')`);
      if (((cola.rows[0] as any)?.n ?? 0) >= MAX_EN_COLA) {
        return res.status(429).json({ error: `Ya hay ${MAX_EN_COLA} diseños esperando. Prueba cuando se hayan dibujado algunos.` });
      }
      if (!(await conRitmo(db, FRENO_DISENO, req, res))) return;
      const r = await db.execute(sql`
        INSERT INTO calendario_arte_disenos (anio, mes, prompt) VALUES (${anio}, ${mes}, ${prompt}) RETURNING id
      `);
      const id = (r.rows[0] as any).id;
      const lista = await listarDisenos(anio, false);
      res.json({ ...lista.disenos.find(d => d.id === id), robot: lista.robot });
    } catch (e: any) {
      console.error('calendario-arte diseno post:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/calendario-arte/robot/pasada — el dibujante automático avisa de
   * que mira la cola (cada 30 s mientras vigila, con `intervalo_min: 1`). Devuelve lo que tiene que dibujar: lo que está en
   * cola y lo que se quedó «dibujando» más de dos horas (una pasada que murió).
   */
  app.post('/api/calendario-arte/robot/pasada', async (req: Request, res: Response) => {
    try {
      if (!(await conRitmo(db, FRENO_ROBOT, req, res))) return;
      const intervalo = Number(req.body?.intervalo_min);
      await db.execute(sql`
        INSERT INTO calendario_arte_robot (id, ultima_pasada, intervalo_min)
        VALUES (1, now(), ${Number.isInteger(intervalo) && intervalo >= 1 && intervalo <= 1440 ? intervalo : 60})
        ON CONFLICT (id) DO UPDATE SET ultima_pasada = now(),
          intervalo_min = COALESCE(${Number.isInteger(intervalo) && intervalo >= 1 && intervalo <= 1440 ? intervalo : null}::int, calendario_arte_robot.intervalo_min)
      `);
      const r = await db.execute(sql`
        SELECT id, anio, mes, prompt, estado, created_at FROM calendario_arte_disenos
        WHERE estado = 'en_cola' OR (estado = 'dibujando' AND empezado_at < now() - interval '2 hours')
        ORDER BY created_at ASC, id ASC LIMIT ${DISENOS_POR_PASADA}
      `);
      res.json({ encargos: r.rows });
    } catch (e: any) {
      console.error('calendario-arte robot:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PATCH /api/calendario-arte/disenos/:id — { estado, url?, nota? } */
  app.patch('/api/calendario-arte/disenos/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const estado = String(req.body?.estado ?? '');
      if (!Number.isInteger(id) || !ESTADOS_DISENO.has(estado)) {
        return res.status(400).json({ error: 'Estado no válido: en_cola, dibujando, listo, error o descartado.' });
      }
      const url = req.body?.url == null || req.body?.url === '' ? null : req.body.url;
      if (url !== null && !urlImagenValida(url)) return res.status(400).json({ error: 'La imagen tiene que estar subida aquí.' });
      if (estado === 'listo' && !url) {
        const ya = await db.execute(sql`SELECT url FROM calendario_arte_disenos WHERE id = ${id}`);
        if (!(ya.rows[0] as any)?.url) return res.status(400).json({ error: 'Un diseño listo necesita su imagen.' });
      }
      if (!(await conRitmo(db, FRENO_ROBOT, req, res))) return;
      const nota = req.body?.nota == null ? null : String(req.body.nota).slice(0, MAX_IDEA);
      const r = await db.execute(sql`
        UPDATE calendario_arte_disenos
        SET estado = ${estado},
            url = COALESCE(${url}, url),
            nota = COALESCE(${nota}, nota),
            empezado_at = CASE WHEN ${estado} = 'dibujando' THEN now() ELSE empezado_at END,
            terminado_at = CASE WHEN ${estado} IN ('listo', 'error') THEN now()
                                WHEN ${estado} IN ('en_cola', 'dibujando') THEN NULL ELSE terminado_at END
        WHERE id = ${id}
          -- Coger un encargo es atómico: si dos dibujantes lo intentan a la
          -- vez (el relevo de una hora a la siguiente), solo uno lo consigue.
          AND (${estado} <> 'dibujando' OR estado = 'en_cola'
               OR (estado = 'dibujando' AND empezado_at < now() - interval '2 hours'))
        RETURNING id, anio, mes, prompt, estado, url, nota, created_at, empezado_at, terminado_at
      `);
      if (!r.rows.length) {
        const existe = await db.execute(sql`SELECT estado FROM calendario_arte_disenos WHERE id = ${id}`);
        if (!existe.rows.length) return res.status(404).json({ error: 'Ese diseño no existe.' });
        return res.status(409).json({ error: 'Ese encargo ya lo está dibujando otro.' });
      }
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('calendario-arte diseno patch:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
