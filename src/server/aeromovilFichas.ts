// ============================================================================
// AEROMÓVIL · ficha de cada componente (2026-11-24, migración 0236)
// ============================================================================
// Eugenio: «si hago clic [en una pieza del 3D] se me despliega debajo de la pantalla 3D toda la información de ese
// componente… el proveedor, las alternativas, las características, el precio, el stock, el peso… una imagen de
// referencia… documentación… en cada componente se pueda manejar información en todos los niveles».
//
// · What lives here: what the design cannot hold (its parameters are capped at 20 KB and saved by hand): the internal
//   number («Interior 1»), what the part is, the alternatives, the stock, the reference images, the documents, the notes.
//   One JSON document per vehicle family and component path (see the migration). The weight, the price and the
//   supplier/model/files of a PART stay in the design (`Parametros.pesos/precios/proveedores`): one list, no second one.
// · The catalogue of components (which exist, where they are in the 3D) lives in the code:
//   `components/aeromovil/fichas/registro.ts`.
// · Read: anyone (the Aeromóvil page is public, designs and their suppliers included).
//   Write: the Aeromóvil's owner or an admin (root CLAUDE.md rule 3), the same rule as saving a design.
// · The files attached to a record are uploaded with `POST /api/aeromovil/adjuntos` (aeromovilAdjuntos.ts); this value
//   only keeps their `{ id, url, nombre… }`.
// · Nothing is ever deleted: a key holds its latest value (no edit history: tech debt, written down).
// · `valor` is jsonb: Postgres REORDERS the keys of an object and keeps the order of lists. A value must never rely on
//   key order: anything that has an order (alternatives, images, documents) is a list.
import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { esperaPendiente, ritmo, type Regla } from './limites/index.js';
import { dueno, puedeDecidir } from './aeromovil.js';

const VEHICULO = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const CLAVE = /^[a-z0-9][a-z0-9_/-]{0,119}$/;
/** The global `express.json()` refuses bodies over 100 KB; this is the limit of one value inside it (UTF-8 accents
 *  weigh two bytes, hence the margin). */
export const MAX_VALOR = 60_000;
// 600 saves an hour per account: the page saves a second after the last keystroke, so typing for an hour does not reach it.
const FRENO: Regla = { puerta: 'aeromovil-fichas', gracia: 600, baseSegundos: 30, topeSegundos: 1800, alFallar: 'cerrar' };

/** Who may write: the Aeromóvil's owner (the creator of its page) or a level-4 role: the one rule of `aeromovil.ts`
 *  (`dueno` + `puedeDecidir`, the same that decides saving a design and filling the expediente), not a copy of it. */
const puedeEscribir = async (req: Request, db: any): Promise<boolean> => !!req.user && puedeDecidir(req, await dueno(db));

export function registrarFichasAeromovil(app: Express, db: any) {
  /** GET /api/aeromovil/fichas?vehiculo=triciclo — every record of that family: { claves: { [clave]: { valor, version, actualizado, por } } }. */
  app.get('/api/aeromovil/fichas', async (req: Request, res: Response) => {
    try {
      const vehiculo = String(req.query.vehiculo ?? '');
      if (!VEHICULO.test(vehiculo)) return res.status(400).json({ error: 'Vehículo no válido.' });
      const r = await db.execute(sql`
        SELECT f.clave, f.valor, f.version, to_json(f.updated_at) #>> '{}' AS actualizado,
               coalesce(nullif(u.display_name, ''), u.name) AS por
        FROM aeromovil_fichas f LEFT JOIN users u ON u.id = f.updated_by
        WHERE f.vehiculo = ${vehiculo}
        ORDER BY f.clave LIMIT 500
      `);
      const claves: Record<string, unknown> = {};
      for (const f of r.rows as any[]) claves[f.clave] = { valor: f.valor, version: f.version, actualizado: f.actualizado, por: f.por ?? null };
      res.set('Cache-Control', 'no-store');
      res.json({ claves });
    } catch (e: any) {
      console.error('aeromovil fichas:', e?.message || e);
      res.status(500).json({ error: 'No se han podido leer las fichas de los componentes.' });
    }
  });

  /** PUT /api/aeromovil/fichas — { vehiculo, clave, valor, version }: `version` is the one the page read (0: the record is new). */
  app.put('/api/aeromovil/fichas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión con la cuenta del dueño del Aeromóvil para guardar la ficha.' });
      if (!(await puedeEscribir(req, db))) return res.status(403).json({ error: 'Las fichas de los componentes solo las cambia el dueño del Aeromóvil con su sesión iniciada.' });
      const { vehiculo, clave, valor } = req.body ?? {};
      const version = Number(req.body?.version);
      if (typeof vehiculo !== 'string' || !VEHICULO.test(vehiculo)) return res.status(400).json({ error: 'Vehículo no válido.' });
      if (typeof clave !== 'string' || !CLAVE.test(clave) || clave.includes('//') || clave.endsWith('/')) return res.status(400).json({ error: 'Componente no válido.' });
      if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return res.status(400).json({ error: 'El contenido no es válido.' });
      if (!Number.isInteger(version) || version < 0) return res.status(400).json({ error: 'Falta la versión que has leído.' });
      const texto = JSON.stringify(valor);
      if (texto.length > MAX_VALOR) return res.status(413).json({ error: `Esta ficha es demasiado larga (máximo ${Math.round(MAX_VALOR / 1000)} KB). Quita texto o documentos.` });
      const quien = `u:${req.user.id}@${new Date().toISOString().slice(0, 13)}`;
      try {
        const espera = await esperaPendiente(db, FRENO, quien);
        if (espera > 0) {
          res.setHeader('Retry-After', String(espera));
          return res.status(429).json({ error: `Demasiados guardados seguidos. Prueba en ${espera < 60 ? `${espera} segundos` : `${Math.ceil(espera / 60)} minutos`}.` });
        }
      } catch (e: any) {
        console.error('aeromovil fichas: freno roto', e?.message || e);
        return res.status(503).json({ error: 'No se puede comprobar el límite de guardados. Prueba en un momento.' });
      }
      ritmo(db, FRENO, quien);
      // One statement decides: insert when new, update only if the stored version is the one the page read.
      const r = version === 0
        ? await db.execute(sql`
            INSERT INTO aeromovil_fichas (vehiculo, clave, valor, version, updated_by) VALUES (${vehiculo}, ${clave}, ${texto}::jsonb, 1, ${req.user.id})
            ON CONFLICT (vehiculo, clave) DO NOTHING RETURNING version, to_json(updated_at) #>> '{}' AS actualizado`)
        : await db.execute(sql`
            UPDATE aeromovil_fichas SET valor = ${texto}::jsonb, version = version + 1, updated_by = ${req.user.id}, updated_at = now()
            WHERE vehiculo = ${vehiculo} AND clave = ${clave} AND version = ${version} RETURNING version, to_json(updated_at) #>> '{}' AS actualizado`);
      const f = r.rows[0] as any;
      if (f) return res.json({ version: f.version, actualizado: f.actualizado });
      const actual = (await db.execute(sql`SELECT valor, version FROM aeromovil_fichas WHERE vehiculo = ${vehiculo} AND clave = ${clave}`)).rows[0] as any;
      res.status(409).json({ error: 'Alguien ha cambiado esta ficha mientras la editabas (otra pestaña u otra sesión). Se ha cargado la versión nueva.', actual: actual ? { valor: actual.valor, version: actual.version } : null });
    } catch (e: any) {
      console.error('aeromovil fichas put:', e?.message || e);
      res.status(500).json({ error: 'No se ha podido guardar la ficha.' });
    }
  });
}
