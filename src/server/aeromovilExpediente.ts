// ============================================================================
// AEROMÓVIL · expediente del fabricante del ciclo de pedales con pedaleo asistido (2026-11-24, migración 0234)
// ============================================================================
// Eugenio: «gestión documental de todo lo necesario… un checklist de lo que nos falta… un generador y un editor de esos
// documentos para que entre la IA y el ingeniero podamos ir resolviéndolos».
//
// · What lives here: the maker's details, the conformity matrix, the test reports and the legal documents, one JSON
//   document per key (see the migration). What must exist (the catalogue) lives in the code, in
//   `components/aeromovil/homologacion/epac/`.
// · Read AND write: only the Aeromóvil's owner or an admin (`puedeDecidir`). The page is public, the file is not: it holds
//   the company's details and the evidence of the product's safety. Root CLAUDE.md rule 3: every write route checks the role.
// · The files attached to a matrix row, a test or a document are uploaded with `POST /api/aeromovil/adjuntos`
//   (aeromovilAdjuntos.ts); this value only keeps their `{ id, url, nombre… }`.
// · Nothing is ever deleted: a key holds its latest value (the history of edits is not kept: tech debt, written down).
// · `valor` is jsonb: Postgres REORDERS the keys of an object (shorter first, then alphabetical) and keeps the order of
//   lists. So a value must never rely on key order: anything that has an order (sections, attempts, files) is a list.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { esperaPendiente, ritmo, type Regla } from './limites/index.js';
import { dueno, puedeDecidir } from './aeromovil.js';

const CLAVE = /^[a-z0-9][a-z0-9:_-]{0,79}$/;
/** The global `express.json()` already refuses bodies over 100 KB; this is the limit of one value inside it (UTF-8 accents weigh two bytes, hence the margin). */
export const MAX_VALOR = 80_000;
// 600 saves an hour: the page saves a second after the last keystroke, so typing for an hour does not reach it; a loop does.
const FRENO: Regla = { puerta: 'aeromovil-expediente', gracia: 600, baseSegundos: 30, topeSegundos: 1800, alFallar: 'cerrar' };

/** Session of the owner or an admin, or the answer is sent and false comes back. */
async function exigirDueno(req: Request, res: Response, db: any): Promise<boolean> {
  if (!req.user) { res.status(401).json({ error: 'Inicia sesión con la cuenta del dueño del Aeromóvil para ver el expediente.' }); return false; }
  const d = await dueno(db);
  if (!puedeDecidir(req, d)) { res.status(403).json({ error: `El expediente del fabricante es de ${d.nombre || 'el dueño del Aeromóvil'}. Tú puedes consultar la normativa.` }); return false; }
  return true;
}

export function registrarExpedienteAeromovil(app: Express, db: any) {
  /** GET /api/aeromovil/expediente — every key: { [clave]: { valor, version, actualizado, por } }. */
  app.get('/api/aeromovil/expediente', async (req: Request, res: Response) => {
    try {
      if (!(await exigirDueno(req, res, db))) return;
      const r = await db.execute(sql`
        SELECT e.clave, e.valor, e.version, to_json(e.updated_at) #>> '{}' AS actualizado,
               coalesce(nullif(u.display_name, ''), u.name) AS por
        FROM aeromovil_expediente e LEFT JOIN users u ON u.id = e.updated_by
        ORDER BY e.clave LIMIT 500
      `);
      const claves: Record<string, unknown> = {};
      for (const f of r.rows as any[]) claves[f.clave] = { valor: f.valor, version: f.version, actualizado: f.actualizado, por: f.por ?? null };
      res.set('Cache-Control', 'no-store');
      res.json({ claves });
    } catch (e: any) {
      console.error('aeromovil expediente:', e?.message || e);
      res.status(500).json({ error: 'No se ha podido leer el expediente.' });
    }
  });

  /** PUT /api/aeromovil/expediente/:clave — { valor, version }: `version` is the one the page read (0: the key is new). */
  app.put('/api/aeromovil/expediente/:clave', async (req: Request, res: Response) => {
    try {
      if (!(await exigirDueno(req, res, db))) return;
      const clave = String(req.params.clave);
      const valor = req.body?.valor, version = Number(req.body?.version);
      if (!CLAVE.test(clave)) return res.status(400).json({ error: 'Clave no válida.' });
      if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return res.status(400).json({ error: 'El contenido no es válido.' });
      if (!Number.isInteger(version) || version < 0) return res.status(400).json({ error: 'Falta la versión que has leído.' });
      const texto = JSON.stringify(valor);
      if (texto.length > MAX_VALOR) return res.status(413).json({ error: `Este apartado es demasiado largo (máximo ${Math.round(MAX_VALOR / 1000)} KB). Divídelo o quita texto.` });
      const quien = `u:${req.user!.id}@${new Date().toISOString().slice(0, 13)}`;
      try {
        const espera = await esperaPendiente(db, FRENO, quien);
        if (espera > 0) {
          res.setHeader('Retry-After', String(espera));
          return res.status(429).json({ error: `Demasiados guardados seguidos. Prueba en ${espera < 60 ? `${espera} segundos` : `${Math.ceil(espera / 60)} minutos`}.` });
        }
      } catch (e: any) {
        console.error('aeromovil expediente: freno roto', e?.message || e);
        return res.status(503).json({ error: 'No se puede comprobar el límite de guardados. Prueba en un momento.' });
      }
      ritmo(db, FRENO, quien);
      // One statement decides: insert when new, update only if the stored version is the one the page read.
      const r = version === 0
        ? await db.execute(sql`
            INSERT INTO aeromovil_expediente (clave, valor, version, updated_by) VALUES (${clave}, ${texto}::jsonb, 1, ${req.user!.id})
            ON CONFLICT (clave) DO NOTHING RETURNING version, to_json(updated_at) #>> '{}' AS actualizado`)
        : await db.execute(sql`
            UPDATE aeromovil_expediente SET valor = ${texto}::jsonb, version = version + 1, updated_by = ${req.user!.id}, updated_at = now()
            WHERE clave = ${clave} AND version = ${version} RETURNING version, to_json(updated_at) #>> '{}' AS actualizado`);
      const f = r.rows[0] as any;
      if (f) return res.json({ version: f.version, actualizado: f.actualizado });
      const actual = (await db.execute(sql`SELECT valor, version FROM aeromovil_expediente WHERE clave = ${clave}`)).rows[0] as any;
      res.status(409).json({ error: 'Alguien ha cambiado esto mientras lo editabas (otra pestaña u otra sesión). Se ha cargado la versión nueva.', actual: actual ? { valor: actual.valor, version: actual.version } : null });
    } catch (e: any) {
      console.error('aeromovil expediente put:', e?.message || e);
      res.status(500).json({ error: 'No se ha podido guardar.' });
    }
  });
}
