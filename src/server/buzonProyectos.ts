// ============================================================================
// BUZÓN DE MEJORAS DE LOS PROYECTOS (2026-11-10)
// ============================================================================
// One mailbox for every project page (`buzon_proyectos`, migration 0183), so a
// new project does not need a new table: add its key to PROYECTOS and use
// <BuzonProyecto proyecto="…" /> on the page. First user: the «Modelo
// socioeconómico optimizado». The consciousness map and the Aeromóvil still
// have their own tables (debt, logged).
//
// Anyone can write (an improvement is welcome from anyone); only an
// administrator (level 4) marks an item done or discarded. The pending items of
// a project are also at /api/buzon/:proyecto/comentarios.txt, to paste to the AI.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ipDe, ritmo, esperaPendiente, type Regla } from './limites/index.js';

/** The projects that have a mailbox, and the name the .txt export uses. */
export const PROYECTOS: Record<string, string> = {
  'modelo-socioeconomico': 'Modelo de optimización socioeconómica (humanity.wiki/modelo-socioeconomico)',
};

// 20 an hour per connection is far above a person writing; a bot is not.
const FRENO: Regla = { puerta: 'buzon-proyectos', gracia: 20, baseSegundos: 60, topeSegundos: 3600, alFallar: 'cerrar' };
const MAX_TEXTO = 4_000;
const MAX_AUTOR = 80;
const MAX_PENDIENTES = 500;
const ESTADOS = new Set(['pendiente', 'hecha', 'descartada']);
/** Where on the page a proposal was written: a section anchor such as 'vivienda-rustica'. */
const paginaDe = (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]{1,60}$/.test(v) ? v : null);
const horaActual = () => new Date().toISOString().slice(0, 13);

function proyectoDe(req: Request, res: Response): string | null {
  const p = String(req.params.proyecto || '');
  if (!PROYECTOS[p]) { res.status(404).json({ error: 'Ese proyecto no tiene buzón.' }); return null; }
  return p;
}

export function registerBuzonProyectosRoutes(app: Express, db: any) {
  /** GET /api/buzon/:proyecto/comentarios — pending first, newest first. */
  app.get('/api/buzon/:proyecto/comentarios', async (req: Request, res: Response) => {
    const p = proyectoDe(req, res); if (!p) return;
    try {
      const r = await db.execute(sql`
        SELECT id, texto, autor, pagina, estado, respuesta, created_at, resuelto_at
        FROM buzon_proyectos WHERE proyecto = ${p}
        ORDER BY (estado = 'pendiente') DESC, created_at DESC
        LIMIT 300
      `);
      res.set('Cache-Control', 'no-store');
      res.json({ comentarios: r.rows, puedeDecidir: (req.user?.roleLevel ?? 0) >= 4 });
    } catch (e: any) {
      console.error('buzón proyectos:', e);
      res.status(500).json({ error: 'No se han podido cargar las propuestas.' });
    }
  });

  /** GET /api/buzon/:proyecto/comentarios.txt — the pending ones, as plain text. */
  app.get('/api/buzon/:proyecto/comentarios.txt', async (req: Request, res: Response) => {
    const p = proyectoDe(req, res); if (!p) return;
    try {
      const r = await db.execute(sql`
        SELECT id, texto, autor, pagina FROM buzon_proyectos
        WHERE proyecto = ${p} AND estado = 'pendiente' ORDER BY created_at
      `);
      const lineas = (r.rows as any[]).map(c => `#${c.id}${c.pagina ? ` [${c.pagina}]` : ''}${c.autor ? ` (${c.autor})` : ''}: ${String(c.texto).replace(/\s+/g, ' ')}`);
      res.set('Cache-Control', 'no-store');
      res.type('text/plain; charset=utf-8').send(`Mejoras pendientes · ${PROYECTOS[p]}: ${lineas.length}\n\n${lineas.join('\n')}\n`);
    } catch (e: any) {
      res.status(500).type('text/plain').send('No se han podido cargar las propuestas.');
    }
  });

  /** POST /api/buzon/:proyecto/comentarios — Body: { texto, autor?, pagina?, web? } */
  app.post('/api/buzon/:proyecto/comentarios', async (req: Request, res: Response) => {
    const p = proyectoDe(req, res); if (!p) return;
    try {
      // `web` is a field people never see: only a robot fills it in.
      if (typeof req.body?.web === 'string' && req.body.web.trim()) return res.json({ ok: true });
      const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
      if (texto.length < 3) return res.status(400).json({ error: 'Escribe tu propuesta.' });
      if (texto.length > MAX_TEXTO) return res.status(400).json({ error: `Como mucho ${MAX_TEXTO} caracteres.` });
      const autor = typeof req.body?.autor === 'string' && req.body.autor.trim() ? req.body.autor.trim().slice(0, MAX_AUTOR) : null;

      const quien = `${ipDe(req)}@${horaActual()}`;
      try {
        const espera = await esperaPendiente(db, FRENO, quien);
        if (espera > 0) {
          res.setHeader('Retry-After', String(espera));
          return res.status(429).json({ error: `Demasiadas propuestas seguidas desde esta conexión. Prueba en ${espera < 60 ? `${espera} segundos` : `${Math.ceil(espera / 60)} minutos`}.` });
        }
      } catch (e: any) {
        console.error('buzón proyectos: freno roto', e?.message || e);
        return res.status(503).json({ error: 'No se puede comprobar el límite de envíos. Prueba en un momento.' });
      }
      ritmo(db, FRENO, quien);

      const n = await db.execute(sql`SELECT count(*)::int AS n FROM buzon_proyectos WHERE proyecto = ${p} AND estado = 'pendiente'`);
      if (((n.rows[0] as any)?.n ?? 0) >= MAX_PENDIENTES) {
        return res.status(503).json({ error: 'El buzón está lleno de propuestas sin revisar. Prueba dentro de unos días.' });
      }
      const r = await db.execute(sql`
        INSERT INTO buzon_proyectos (proyecto, texto, autor, autor_user_id, pagina)
        VALUES (${p}, ${texto}, ${autor}, ${req.user?.id ?? null}, ${paginaDe(req.body?.pagina)})
        RETURNING id, texto, autor, pagina, estado, respuesta, created_at, resuelto_at
      `);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('buzón proyectos, enviar:', e);
      res.status(500).json({ error: 'No se ha podido enviar.' });
    }
  });

  /** PUT /api/buzon/:proyecto/comentarios/:id — { estado, respuesta? }. Administrators only. */
  app.put('/api/buzon/:proyecto/comentarios/:id', async (req: Request, res: Response) => {
    const p = proyectoDe(req, res); if (!p) return;
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      if ((req.user.roleLevel ?? 0) < 4) return res.status(403).json({ error: 'Requiere nivel 4 o superior.' });
      const id = Number(req.params.id);
      const estado = String(req.body?.estado || '');
      if (!Number.isInteger(id) || !ESTADOS.has(estado)) return res.status(400).json({ error: 'Datos no válidos.' });
      const respuesta = typeof req.body?.respuesta === 'string' && req.body.respuesta.trim() ? req.body.respuesta.trim().slice(0, MAX_TEXTO) : null;
      const r = await db.execute(sql`
        UPDATE buzon_proyectos
        SET estado = ${estado}, respuesta = COALESCE(${respuesta}, respuesta),
            resuelto_at = CASE WHEN ${estado} = 'pendiente' THEN NULL ELSE now() END
        WHERE id = ${id} AND proyecto = ${p}
        RETURNING id, texto, autor, pagina, estado, respuesta, created_at, resuelto_at
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa propuesta no existe.' });
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('buzón proyectos, decidir:', e);
      res.status(500).json({ error: 'No se ha podido cambiar.' });
    }
  });
}
