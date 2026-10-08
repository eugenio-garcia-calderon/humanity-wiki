import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { sitioDe } from './sitios.js';
import { CONSOLA_POR_DEFECTO, limpiarConsola } from '../utils/consola.js';

// ============================================================================
// LA CONSOLA DE UNA WEB (2026-10-08)
// ============================================================================
// Eugenio: «la consola es una página privada que nunca se puede hacer pública:
// se accede con inicio de sesión, si eres administrador, desde Humanity Wiki;
// no desde la URL pública de luzhumanidad.com». Es la cadena de valor del
// negocio en círculo, cada eslabón con su estado (rojo, amarillo, verde), sus
// objetivos, tareas, personas y protocolos.
//
// DOS CERROJOS, y los dos hacen falta:
//   1. QUIÉN: sólo quien GESTIONA la página (dueño, administrador del equipo o
//      de la plataforma). Un editor ve la página, no cómo va el negocio.
//   2. DESDE DÓNDE: sólo en humanity.wiki. En un dominio propio o un
//      subdominio la ruta contesta 404 como si no existiera, aunque la cookie
//      de la plataforma viaje hasta allí: la web pública no sabe que hay consola.
// Y los datos viven en su propia tabla (`consolas`), no en `config`: ninguna
// ruta pública la lee, así que no hay forma de que salga por descuido.

export function registrarConsola(app: Express, db: any) {
  const entrar = async (req: Request, res: Response): Promise<string | null> => {
    res.set('Cache-Control', 'private, no-store');
    if (sitioDe(req).forma !== 'casa') { res.status(404).json({ error: 'No existe.' }); return null; }
    if (!req.user) { res.status(401).json({ error: 'Entra en tu cuenta.' }); return null; }
    const id = String(req.params.id || '');
    const a = await rolEnPagina(db, quienDe(req), id);
    if (!capacidades(a).gestionar) { res.status(403).json({ error: 'La consola es solo para quien gestiona esta web.' }); return null; }
    return id;
  };

  /** GET /api/consola/:id → la consola de esta página (la de por defecto si aún no se ha tocado). */
  app.get('/api/consola/:id', async (req: Request, res: Response) => {
    try {
      const id = await entrar(req, res); if (!id) return;
      const f = (await db.execute(sql`SELECT datos, updated_at FROM consolas WHERE pagina_id = ${id}`)).rows[0] as any;
      res.json({ consola: limpiarConsola(f?.datos ?? CONSOLA_POR_DEFECTO), guardada: !!f, actualizada: f?.updated_at || null });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** PUT /api/consola/:id { consola } → guarda (se limpia: tamaños, tipos y estados válidos). */
  app.put('/api/consola/:id', async (req: Request, res: Response) => {
    try {
      const id = await entrar(req, res); if (!id) return;
      const datos = limpiarConsola(req.body?.consola);
      await db.execute(sql`
        INSERT INTO consolas (pagina_id, datos, updated_by, updated_at) VALUES (${id}, ${JSON.stringify(datos)}::jsonb, ${req.user!.id}, now())
        ON CONFLICT (pagina_id) DO UPDATE SET datos = EXCLUDED.datos, updated_by = EXCLUDED.updated_by, updated_at = now()
      `);
      res.json({ ok: true, consola: datos });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });
}
