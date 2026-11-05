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
// ── QUIÉN PUEDE QUÉ: CUALQUIERA, CON FRENO ────────────────────────────────
// Igual que el Calendario Arte: proponer y marcar como hecha no pide cuenta.
// Lo sostienen un freno por IP y hora (`frenos`), un campo trampa para robots
// y un tope de tamaño. Nada se borra: «descartada» se puede reabrir.
//
// `/api/aeromovil/tareas.txt` devuelve las pendientes en texto plano para
// pegárselas a la IA: «haz las tareas de esta lista».
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { ipDe, ritmo, esperaPendiente, type Regla } from './limites/index.js';

const MAX_TEXTO = 4_000;
const MAX_AUTOR = 80;
const AREAS = new Set(['general', 'carenado', 'chasis', 'suspension', 'ruedas', 'asientos', 'motor', 'baterias', 'planos']);
const ESTADOS = ['pendiente', 'en_curso', 'hecha', 'descartada'];

// 30 propuestas por hora y conexión: una persona escribiendo no llega; un bucle sí.
const FRENO: Regla = { puerta: 'aeromovil-tareas', gracia: 30, baseSegundos: 60, topeSegundos: 3600, alFallar: 'cerrar' };
const horaActual = () => new Date().toISOString().slice(0, 13);

async function conRitmo(db: any, req: Request, res: Response): Promise<boolean> {
  const quien = `${ipDe(req)}@${horaActual()}`;
  try {
    const espera = await esperaPendiente(db, FRENO, quien);
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
  ritmo(db, FRENO, quien);
  return true;
}

const COLUMNAS = sql`id, area, texto, autor, origen, estado, respuesta, created_at, resuelta_at`;

export function registerAeromovilRoutes(app: Express, db: any) {
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
      if (!(await conRitmo(db, req, res))) return;
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
}
