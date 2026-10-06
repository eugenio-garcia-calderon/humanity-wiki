import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, quienDe, type Quien } from './permisos.js';
import { paginaVisible } from './sitios.js';
import { avisar } from './avisos.js';
import { referenciasDe } from '../utils/menciones.js';

// ============================================================================
// @MENCIONES, [[ENLACES]] Y «ENLAZAN AQUÍ» (2026-10-06, carril editorB, #6)
// ============================================================================
// En el texto de una página una mención no es un tipo de bloque nuevo: es un
// enlace markdown de los de siempre, con una dirección que dice qué es:
//     [@Ana](/personas/U123)      una persona
//     [Mi plan](/paginas/W456)    una página (también se escribe con «[[»)
//     [@7 oct 2026](fecha:2026-10-07)   una fecha
// Así lo que no entiende de menciones (exportar a Word, el buscador, la IA)
// la lee como un enlace, y lo guardado no cambia de forma.
//
// Esta ruta lee la página YA GUARDADA —no se fía de lo que diga el cliente— y
// rehace dos cosas: el índice de quién enlaza a quién (`pagina_referencias`,
// para «Enlazan aquí») y el aviso a las personas nombradas.

/** ¿La puede ver? Por su rol, porque es pública o por la visibilidad heredada. */
async function puedeVer(db: any, quien: Quien, id: string) {
  return capacidades(await rolEnPagina(db, quien, id)).ver || await paginaVisible(db, id);
}

/**
 * REHACE EL ÍNDICE DE ENLACES DE UNA PÁGINA Y AVISA A QUIEN SE NOMBRÓ. Lee la
 * página YA GUARDADA. La llaman la ruta de abajo (el editor, tras guardar) y la
 * edición simultánea (`colabServidor.ts`, al derivar `config.bloques`), que no
 * tiene a quien pedírselo: así el índice se rehace igual lo escriba quien lo
 * escriba. `actor` es quien hizo el cambio (a quien nombra su propia mención no
 * se le avisa).
 */
export async function reindexarReferencias(db: any, id: string, actor: string, w?: any): Promise<{ avisados: number; sinAcceso: { id: string; nombre: string }[] }> {
  w ||= (await db.execute(sql`
    SELECT id, title, creator_user_id, config FROM knowledge_windows
    WHERE id = ${id} AND kind = 'pagina' AND archived_at IS NULL AND deleted_at IS NULL
  `)).rows[0] as any;
  if (!w) return { avisados: 0, sinAcceso: [] };
  const { personas, paginas } = referenciasDe(w.config?.bloques || [], id);
  // Sólo personas que existen (el id viene de un texto que cualquiera
  // puede haber escrito a mano).
  const reales = personas.length
    ? (await db.execute(sql`
        SELECT id, COALESCE(display_name, name) AS nombre FROM users
        WHERE archived_at IS NULL AND deleted_at IS NULL AND id IN (${sql.join(personas.map(p => sql`${p}`), sql`, `)})
      `)).rows as any[]
    : [];
  const idsPersonas = reales.map(r => r.id as string);

  // El índice se rehace: lo que ya no está, fuera; lo nuevo, dentro.
  await db.execute(sql`
    DELETE FROM pagina_referencias WHERE origen_id = ${id}
      AND NOT ((clase = 'pagina' AND destino_id IN (${paginas.length ? sql.join(paginas.map(p => sql`${p}`), sql`, `) : sql`''`}))
            OR (clase = 'persona' AND destino_id IN (${idsPersonas.length ? sql.join(idsPersonas.map(p => sql`${p}`), sql`, `) : sql`''`})))
  `);
  for (const p of paginas) {
    await db.execute(sql`INSERT INTO pagina_referencias (origen_id, clase, destino_id) VALUES (${id}, 'pagina', ${p}) ON CONFLICT DO NOTHING`);
  }
  for (const p of idsPersonas) {
    await db.execute(sql`INSERT INTO pagina_referencias (origen_id, clase, destino_id) VALUES (${id}, 'persona', ${p}) ON CONFLICT DO NOTHING`);
  }

  // A quién falta avisar.
  const pendientes = (await db.execute(sql`
    SELECT destino_id FROM pagina_referencias WHERE origen_id = ${id} AND clase = 'persona' AND NOT avisado
  `)).rows.map((r: any) => r.destino_id as string);
  const avisados: string[] = [];
  const sinAcceso: { id: string; nombre: string }[] = [];
  for (const uid of pendientes) {
    // Nombrarse a uno mismo no es noticia.
    if (uid === actor) { await db.execute(sql`UPDATE pagina_referencias SET avisado = true WHERE origen_id = ${id} AND clase = 'persona' AND destino_id = ${uid}`); continue; }
    const nombre = reales.find(r => r.id === uid)?.nombre || 'alguien';
    // Sin acceso no se avisa (se le contaría el título de una página que
    // no puede abrir); queda pendiente por si se le da acceso después.
    const ve = await puedeVer(db, { id: uid, nivel: 0 }, id);
    if (!ve) { sinAcceso.push({ id: uid, nombre }); continue; }
    const ok = await avisar(db, {
      paraQuien: uid, dePartede: actor, tipo: 'mencion',
      entidadTipo: 'knowledge_windows', entidadId: id,
      datos: { titulo: w.title || 'Sin título' },
    });
    if (ok) {
      avisados.push(uid);
      await db.execute(sql`UPDATE pagina_referencias SET avisado = true WHERE origen_id = ${id} AND clase = 'persona' AND destino_id = ${uid}`);
    }
  }
  return { avisados: avisados.length, sinAcceso };
}

export function registrarReferencias(app: Express, db: any) {
  /**
   * `POST /api/paginas/:id/referencias` — lo llama el editor tras guardar,
   * sólo si cambió el conjunto de menciones o enlaces. Devuelve a quién se
   * avisó y a quién se nombró sin que pueda ver la página (para decirlo:
   * un aviso con el título de una página privada sería filtrarla).
   */
  app.post('/api/paginas/:id/referencias', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const id = req.params.id;
      const w = (await db.execute(sql`
        SELECT id, title, creator_user_id, config FROM knowledge_windows
        WHERE id = ${id} AND kind = 'pagina' AND archived_at IS NULL AND deleted_at IS NULL
      `)).rows[0] as any;
      if (!w) return res.status(404).json({ error: 'No existe.' });
      const quien = quienDe(req);
      if (!capacidades(await rolEnPagina(db, quien, id)).editar) return res.status(403).json({ error: 'No puedes editar esa página.' });

      const r = await reindexarReferencias(db, id, req.user.id, w);
      res.json(r);
    } catch (e: any) { console.error('referencias de página:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * `GET /api/paginas/:id/enlazan` — «Enlazan aquí». Las páginas que nombran
   * o enlazan a ésta y que quien pregunta puede ver. Sirve también a quien
   * lee la página publicada: sólo salen las que ya son públicas.
   */
  app.get('/api/paginas/:id/enlazan', async (req: Request, res: Response) => {
    try {
      const quien = quienDe(req);
      if (!await puedeVer(db, quien, req.params.id)) return res.status(404).json({ error: 'No existe.' });
      const filas = (await db.execute(sql`
        SELECT w.id, w.title, w.publico, w.config->>'icono' AS icono, w.updated_at
        FROM pagina_referencias r JOIN knowledge_windows w ON w.id = r.origen_id
        WHERE r.clase = 'pagina' AND r.destino_id = ${req.params.id}
          AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
        ORDER BY w.updated_at DESC LIMIT 40
      `)).rows as any[];
      const out: { id: string; titulo: string; icono: string | null }[] = [];
      for (const f of filas) {
        // Públicas: sin más preguntas. El resto, por su rol.
        if (f.publico || await puedeVer(db, quien, f.id)) out.push({ id: f.id, titulo: f.title || 'Sin título', icono: f.icono || null });
        if (out.length >= 20) break;
      }
      res.json({ paginas: out });
    } catch (e: any) { console.error('enlazan aquí:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * `GET /api/menciones/buscar?q=` — lo que ofrece el selector de «@» y «[[»:
   * personas y páginas tuyas (o compartidas contigo). Sin texto, las más
   * cercanas: quienes tienen acceso a tus páginas y tus últimas páginas.
   */
  app.get('/api/menciones/buscar', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const q = String(req.query.q || '').trim().slice(0, 40);
      const like = `%${q.replace(/[\\%_]/g, m => '\\' + m)}%`;
      const yo = req.user.id;

      const paginas = (await db.execute(sql`
        SELECT w.id, w.title AS titulo, w.config->>'icono' AS icono FROM knowledge_windows w
        WHERE w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
          AND (w.creator_user_id = ${yo} OR EXISTS (
                SELECT 1 FROM accesos_entidad a WHERE a.entidad_tipo = 'pagina' AND a.entidad_id = w.id AND a.user_id = ${yo}))
          AND (${q} = '' OR w.title ILIKE ${like})
        ORDER BY w.updated_at DESC LIMIT 8
      `)).rows;

      const personas = q
        // Con texto: cualquiera de la plataforma por su nombre. No se busca por
        // correo: sirve para nombrar a alguien, no para descubrir su correo.
        ? (await db.execute(sql`
            SELECT id, COALESCE(display_name, name) AS nombre, avatar_url AS foto FROM users
            WHERE archived_at IS NULL AND deleted_at IS NULL
              AND (display_name ILIKE ${like} OR name ILIKE ${like})
            ORDER BY (display_name ILIKE ${q + '%'}) DESC, display_name LIMIT 8
          `)).rows
        // Sin texto: con quien ya compartes páginas, y tú.
        : (await db.execute(sql`
            SELECT u.id, COALESCE(u.display_name, u.name) AS nombre, u.avatar_url AS foto FROM users u
            WHERE u.archived_at IS NULL AND u.deleted_at IS NULL AND (u.id = ${yo} OR u.id IN (
              SELECT a.user_id FROM accesos_entidad a JOIN knowledge_windows w ON w.id = a.entidad_id
              WHERE a.entidad_tipo = 'pagina' AND w.creator_user_id = ${yo}
              UNION
              SELECT w.creator_user_id FROM accesos_entidad a JOIN knowledge_windows w ON w.id = a.entidad_id
              WHERE a.entidad_tipo = 'pagina' AND a.user_id = ${yo}))
            ORDER BY (u.id = ${yo}) DESC, u.display_name LIMIT 6
          `)).rows;
      res.json({ personas, paginas });
    } catch (e: any) { console.error('buscar menciones:', e); res.status(500).json({ error: e.message }); }
  });
}
