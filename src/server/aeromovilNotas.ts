// ============================================================================
// AEROMÓVIL · notas por sección (2026-11-17, migración 0223)
// ============================================================================
// Eugenio: «permite añadir un comentario en cada una de ellas [las secciones] para poder tomar notas de cosas
// importantes… que ese comentario tenga una fecha y un autor».
//
// · Read: anyone (the Aeromóvil page is public, like its tasks and designs).
// · Write: a session (level 1, USER). Root CLAUDE.md rule 3: every write route checks the role. Without a session the
//   page keeps the note in that browser only, signed «Anónimo» (`components/aeromovil/notas/almacen.ts`).
// · Edit: only the author. Remove (archive, never DELETE): the author or an admin.
// The author is `created_by`; the name is resolved here at read time, so an emptied account reads «Usuario eliminado».
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { esperaPendiente, ritmo, type Regla } from './limites/index.js';

const VEHICULOS = new Set(['cuatro', 'rombo', 'bala', 'triciclo', 'basculante']);
const MAX_TEXTO = 2000;
const MAX_SECCION = 120;
// 60 notes or edits an hour per account: someone taking notes does not reach it; a loop does.
const FRENO: Regla = { puerta: 'aeromovil-notas', gracia: 60, baseSegundos: 30, topeSegundos: 1800, alFallar: 'cerrar' };

const nivel = (req: Request) => (req.user ? (req.user.roleLevel ?? 0) : -1);
/** Session of level ≥ min, or the answer is sent and false comes back. */
function requireLevel(req: Request, res: Response, min: number): boolean {
  if (!req.user) { res.status(401).json({ error: 'Inicia sesión para guardar notas con tu nombre.' }); return false; }
  if (nivel(req) < min) { res.status(403).json({ error: `Requiere nivel ${min} o superior.` }); return false; }
  return true;
}

async function conFreno(db: any, req: Request, res: Response): Promise<boolean> {
  const quien = `u:${req.user!.id}@${new Date().toISOString().slice(0, 13)}`;
  try {
    const espera = await esperaPendiente(db, FRENO, quien);
    if (espera > 0) {
      res.setHeader('Retry-After', String(espera));
      res.status(429).json({ error: `Demasiadas notas seguidas. Prueba en ${espera < 60 ? `${espera} segundos` : `${Math.ceil(espera / 60)} minutos`}.` });
      return false;
    }
  } catch (e: any) {
    console.error('aeromovil notas: freno roto', e?.message || e);
    res.status(503).json({ error: 'No se puede comprobar el límite de notas. Prueba en un momento.' });
    return false;
  }
  ritmo(db, FRENO, quien);
  return true;
}

const fila = (req: Request) => sql`
  n.id, n.diseno_id, n.vehiculo, n.seccion, n.texto,
  to_json(n.created_at) #>> '{}' AS created_at, to_json(n.updated_at) #>> '{}' AS updated_at,  -- ISO 8601, which every browser parses
  coalesce(nullif(u.display_name, ''), u.name, 'Usuario') AS autor,
  coalesce(n.created_by = ${req.user?.id ?? null}, false) AS mia`;

const disenoDe = (v: unknown): number | null | undefined => {
  if (v == null || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export function registrarNotasAeromovil(app: Express, db: any) {
  /** GET /api/aeromovil/notas?vehiculo=triciclo&diseno=12 (diseno empty: the vehicle's notes with no design open). */
  app.get('/api/aeromovil/notas', async (req: Request, res: Response) => {
    try {
      const vehiculo = String(req.query.vehiculo ?? ''), diseno = disenoDe(req.query.diseno);
      if (!VEHICULOS.has(vehiculo) || diseno === undefined) return res.status(400).json({ error: 'Vehículo o diseño no válido.' });
      const r = await db.execute(sql`
        SELECT ${fila(req)} FROM aeromovil_notas n LEFT JOIN users u ON u.id = n.created_by
        WHERE n.archived_at IS NULL AND n.vehiculo = ${vehiculo}
          AND (n.diseno_id = ${diseno} OR (${diseno}::int IS NULL AND n.diseno_id IS NULL))
        ORDER BY n.created_at DESC LIMIT 1000
      `);
      res.set('Cache-Control', 'no-store');
      res.json(r.rows);
    } catch (e: any) {
      console.error('aeromovil notas:', e);
      res.status(500).json({ error: 'No se han podido leer las notas.' });
    }
  });

  /** POST /api/aeromovil/notas — { vehiculo, diseno, seccion, texto } */
  app.post('/api/aeromovil/notas', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, 1)) return;
      const vehiculo = String(req.body?.vehiculo ?? ''), diseno = disenoDe(req.body?.diseno);
      const seccion = String(req.body?.seccion ?? '').trim().slice(0, MAX_SECCION);
      const texto = String(req.body?.texto ?? '').trim();
      if (!VEHICULOS.has(vehiculo) || diseno === undefined || !seccion) return res.status(400).json({ error: 'Sección no válida.' });
      if (!texto) return res.status(400).json({ error: 'Escribe la nota antes de guardarla.' });
      if (texto.length > MAX_TEXTO) return res.status(400).json({ error: `La nota es demasiado larga (máximo ${MAX_TEXTO} caracteres).` });
      if (diseno !== null) {
        const d = await db.execute(sql`SELECT 1 FROM aeromovil_disenos WHERE id = ${diseno} AND archived_at IS NULL`);
        if (!d.rows.length) return res.status(404).json({ error: 'Ese diseño ya no existe.' });
      }
      if (!(await conFreno(db, req, res))) return;
      const ins = await db.execute(sql`
        INSERT INTO aeromovil_notas (diseno_id, vehiculo, seccion, texto, created_by)
        VALUES (${diseno}, ${vehiculo}, ${seccion}, ${texto}, ${req.user!.id}) RETURNING id
      `);
      const r = await db.execute(sql`SELECT ${fila(req)} FROM aeromovil_notas n LEFT JOIN users u ON u.id = n.created_by WHERE n.id = ${(ins.rows[0] as any).id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('aeromovil nota post:', e);
      res.status(500).json({ error: 'No se ha podido guardar la nota.' });
    }
  });

  /** PATCH /api/aeromovil/notas/:id — { texto }. Only its author. */
  app.patch('/api/aeromovil/notas/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, 1)) return;
      const id = Number(req.params.id);
      const texto = String(req.body?.texto ?? '').trim();
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Nota no válida.' });
      if (!texto) return res.status(400).json({ error: 'La nota no puede quedar vacía: bórrala si ya no hace falta.' });
      if (texto.length > MAX_TEXTO) return res.status(400).json({ error: `La nota es demasiado larga (máximo ${MAX_TEXTO} caracteres).` });
      const f = (await db.execute(sql`SELECT created_by FROM aeromovil_notas WHERE id = ${id} AND archived_at IS NULL`)).rows[0] as any;
      if (!f) return res.status(404).json({ error: 'Esa nota no existe.' });
      if (f.created_by !== req.user!.id) return res.status(403).json({ error: 'Solo quien escribió la nota puede cambiarla.' });
      if (!(await conFreno(db, req, res))) return;
      await db.execute(sql`UPDATE aeromovil_notas SET texto = ${texto}, updated_at = now() WHERE id = ${id}`);
      const r = await db.execute(sql`SELECT ${fila(req)} FROM aeromovil_notas n LEFT JOIN users u ON u.id = n.created_by WHERE n.id = ${id}`);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('aeromovil nota patch:', e);
      res.status(500).json({ error: 'No se ha podido cambiar la nota.' });
    }
  });

  /** DELETE /api/aeromovil/notas/:id — archived, not deleted. Its author or an admin. */
  app.delete('/api/aeromovil/notas/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, 1)) return;
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Nota no válida.' });
      const f = (await db.execute(sql`SELECT created_by FROM aeromovil_notas WHERE id = ${id} AND archived_at IS NULL`)).rows[0] as any;
      if (!f) return res.status(404).json({ error: 'Esa nota no existe.' });
      if (f.created_by !== req.user!.id && nivel(req) < 4) return res.status(403).json({ error: 'Solo quien escribió la nota puede quitarla.' });
      await db.execute(sql`UPDATE aeromovil_notas SET archived_at = now() WHERE id = ${id}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: 'No se ha podido quitar la nota.' });
    }
  });
}
