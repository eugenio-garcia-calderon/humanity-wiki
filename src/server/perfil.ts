import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { paginaVisible, sitioDePagina } from './sitios';
import { miembroActual } from './miembros.js';
import { rolEnPagina, capacidades } from './permisos.js';

// ============================================================================
// EL PERFIL DE UNA PERSONA (2026-10-26, Eugenio)
// ============================================================================
// «En la página de perfil de una persona: el nombre en grande y los apellidos
// debajo, en gris; las áreas en las que trabaja a la derecha, y al pinchar una,
// sus proyectos de ese área; su localización y su alcance territorial; y si es
// ella la que mira, un botón de editar su perfil.»
//
// Una persona es una fila (de «Personas») con página. Lo que se enseña sale de
// sus columnas: la de tipo correo, «Localización», «Alcance territorial» (una
// selección) y «Áreas» (la relación con los sistemas). Lo pinta el bloque
// `perfil` (`bloquesDatos/perfil`).
//
// Edita su perfil quien puede editar la página o la propia persona: quien ha
// entrado (en la web o en la plataforma) con el correo de su fila.

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const id = (p: string) => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 8).toUpperCase();

async function datosPersona(db: any, paginaId: string) {
  const fila = (await db.execute(sql`
    SELECT f.id, f.tabla_id, f.valores, k.title, k.config->>'portada' AS portada, k.config->>'icono' AS icono
    FROM bd_filas f JOIN knowledge_windows k ON k.id = f.pagina_id AND k.deleted_at IS NULL
    WHERE f.pagina_id = ${paginaId} AND f.deleted_at IS NULL LIMIT 1
  `)).rows[0] as any;
  if (!fila) return null;
  const cols = (await db.execute(sql`
    SELECT id, nombre, tipo, config, opciones FROM bd_columnas WHERE tabla_id = ${fila.tabla_id} AND archived_at IS NULL ORDER BY orden, created_at
  `)).rows as any[];
  const col = {
    nombre: cols.find(c => c.tipo === 'texto') || null,
    correo: cols.find(c => c.tipo === 'email') || null,
    localizacion: cols.find(c => /^locali[sz]aci/.test(plano(c.nombre))) || null,
    alcance: cols.find(c => /^alcance/.test(plano(c.nombre)) && c.tipo === 'seleccion') || null,
    areas: cols.find(c => c.tipo === 'relacion' && /^(areas?|ambitos?)$/.test(plano(c.nombre))) || null,
  };
  return { fila, col };
}

/** ¿Puede quien llama cambiar este perfil? */
async function puedeEditar(db: any, req: Request, paginaId: string, correo: string | null) {
  if (req.user && !(req as any).miembroSitio) {
    const nivel = req.user.roleLevel ?? 0;
    if (capacidades(await rolEnPagina(db, { id: req.user.id, nivel }, paginaId)).editar) return true;
  }
  if (!correo) return false;
  const c = correo.trim().toLowerCase();
  if (req.user?.email && req.user.email.toLowerCase() === c) return true;
  const sitio = await sitioDePagina(db, paginaId);
  const m = sitio ? await miembroActual(db, req, sitio.raizId) : null;
  if (m && m.estado === 'activo' && m.email.toLowerCase() === c) return true;
  if (m?.userId && m.estado === 'activo') {
    const u = (await db.execute(sql`SELECT role_level FROM users WHERE id = ${m.userId} AND deleted_at IS NULL`)).rows[0] as any;
    if (u && capacidades(await rolEnPagina(db, { id: m.userId, nivel: Number(u.role_level) || 0 }, paginaId)).editar) return true;
  }
  return false;
}

export function registrarPerfil(app: Express, db: any) {
  app.get('/api/perfil/:paginaId', async (req: Request, res: Response) => {
    try {
      const paginaId = String(req.params.paginaId);
      if (!(await paginaVisible(db, paginaId))) {
        const nivel = req.user?.roleLevel ?? 0;
        if (!req.user || !capacidades(await rolEnPagina(db, { id: req.user.id, nivel }, paginaId)).ver) return res.status(404).json({ error: 'No está.' });
      }
      const d = await datosPersona(db, paginaId);
      if (!d) return res.status(404).json({ error: 'Esta página no es la de una persona.' });
      const { fila, col } = d;
      const v = fila.valores || {};
      const correo = col.correo ? String(v[col.correo.id] || '').trim() || null : null;
      const opcionesAlcance = (Array.isArray(col.alcance?.opciones) ? col.alcance.opciones : []).map((o: any) => ({ id: String(o.id), label: String(o.label) }));
      const alcanceId = col.alcance ? String(v[col.alcance.id] || '') : '';

      // Sus áreas, en el orden en que se pusieron.
      let areas: any[] = [];
      let opcionesAreas: any[] = [];
      if (col.areas) {
        const inversa = col.areas.config?.inversa_de || null;
        areas = (await db.execute(inversa ? sql`
          SELECT f.id, f.pagina_id, k.title AS titulo, k.config->>'icono' AS icono, k.config->>'portada' AS portada
          FROM bd_enlaces e JOIN bd_filas f ON f.id = e.fila_origen AND f.deleted_at IS NULL LEFT JOIN knowledge_windows k ON k.id = f.pagina_id
          WHERE e.columna_id = ${inversa} AND e.destino_id = ${fila.id} ORDER BY k.title
        ` : sql`
          SELECT f.id, f.pagina_id, k.title AS titulo, k.config->>'icono' AS icono, k.config->>'portada' AS portada
          FROM bd_enlaces e JOIN bd_filas f ON f.id = e.destino_id AND f.deleted_at IS NULL LEFT JOIN knowledge_windows k ON k.id = f.pagina_id
          WHERE e.columna_id = ${col.areas.id} AND e.fila_origen = ${fila.id} ORDER BY e.orden, e.created_at
        `)).rows as any[];
        // Lo que tiene conectado (proyectos, publicaciones…) que también está conectado con cada área.
        if (areas.length) {
          const r = (await db.execute(sql`
            WITH l AS (
              SELECT destino_id AS id FROM bd_enlaces WHERE fila_origen = ${fila.id}
              UNION SELECT fila_origen FROM bd_enlaces WHERE destino_id = ${fila.id}
            )
            SELECT a.id AS area, l.id AS fila FROM unnest(string_to_array(${areas.map(a => a.id).join(',')}, ',')) AS a(id)
            JOIN l ON l.id <> a.id AND EXISTS (
              SELECT 1 FROM bd_enlaces e WHERE (e.fila_origen = l.id AND e.destino_id = a.id) OR (e.fila_origen = a.id AND e.destino_id = l.id)
            )
          `)).rows as any[];
          for (const a of areas) a.filas = r.filter(x => x.area === a.id).map(x => String(x.fila));
        }
        const destino = col.areas.config?.tabla_destino;
        const puede = await puedeEditar(db, req, paginaId, correo);
        if (destino && puede) {
          opcionesAreas = (await db.execute(sql`
            SELECT f.id, COALESCE(k.title, '') AS titulo FROM bd_filas f LEFT JOIN knowledge_windows k ON k.id = f.pagina_id
            WHERE f.tabla_id = ${destino} AND f.deleted_at IS NULL AND f.oculta = false ORDER BY k.title
          `)).rows as any[];
        }
      }
      res.set('Cache-Control', 'private, no-store');
      res.json({
        fila_id: fila.id, tabla_id: fila.tabla_id,
        nombre: String(fila.title || (col.nombre ? v[col.nombre.id] : '') || ''),
        foto: fila.portada || null,
        correo,
        localizacion: col.localizacion ? String(v[col.localizacion.id] || '') : '',
        alcance: alcanceId ? (opcionesAlcance.find((o: any) => o.id === alcanceId)?.label || '') : '',
        alcance_id: alcanceId || null,
        areas: areas.map(a => ({ id: a.id, pagina_id: a.pagina_id, titulo: a.titulo || '', icono: a.icono || null, portada: a.portada || null, filas: a.filas || [] })),
        puede_editar: await puedeEditar(db, req, paginaId, correo),
        columnas: { localizacion: !!col.localizacion, alcance: !!col.alcance, areas: !!col.areas },
        opciones: { alcance: opcionesAlcance, areas: opcionesAreas },
      });
    } catch (e: any) { console.error('perfil:', e); res.status(500).json({ error: e.message }); }
  });

  app.put('/api/perfil/:paginaId', async (req: Request, res: Response) => {
    try {
      const paginaId = String(req.params.paginaId);
      const d = await datosPersona(db, paginaId);
      if (!d) return res.status(404).json({ error: 'Esta página no es la de una persona.' });
      const { fila, col } = d;
      const correo = col.correo ? String((fila.valores || {})[col.correo.id] || '').trim() || null : null;
      if (!(await puedeEditar(db, req, paginaId, correo))) return res.status(403).json({ error: 'Solo la propia persona o quien gestiona la web puede cambiar este perfil.' });
      const b = req.body || {};
      const cambios: Record<string, unknown> = {};
      let titulo: string | null = null;
      if (typeof b.nombre === 'string') {
        titulo = b.nombre.replace(/\s+/g, ' ').trim().slice(0, 160);
        if (!titulo) return res.status(400).json({ error: 'El nombre no puede quedar vacío.' });
        if (col.nombre) cambios[col.nombre.id] = titulo;
      }
      if (typeof b.localizacion === 'string' && col.localizacion) cambios[col.localizacion.id] = b.localizacion.trim().slice(0, 160);
      if (b.alcance !== undefined && col.alcance) {
        const ok = (col.alcance.opciones || []).some((o: any) => String(o.id) === String(b.alcance));
        if (b.alcance && !ok) return res.status(400).json({ error: 'Ese alcance no existe.' });
        cambios[col.alcance.id] = b.alcance || null;
      }
      if (Object.keys(cambios).length) {
        await db.execute(sql`UPDATE bd_filas SET valores = COALESCE(valores, '{}'::jsonb) || ${JSON.stringify(cambios)}::jsonb, updated_at = now() WHERE id = ${fila.id}`);
      }
      if (titulo) await db.execute(sql`UPDATE knowledge_windows SET title = ${titulo}, version = COALESCE(version, 0) + 1, updated_at = now() WHERE id = ${paginaId}`);
      if (Array.isArray(b.areas) && col.areas && !col.areas.config?.inversa_de) {
        const destino = col.areas.config?.tabla_destino;
        const pedidas = [...new Set(b.areas.map(String))].slice(0, 40) as string[];
        const validas = pedidas.length ? ((await db.execute(sql`
          SELECT id FROM bd_filas WHERE tabla_id = ${destino} AND deleted_at IS NULL AND id IN (${sql.join(pedidas.map(x => sql`${x}`), sql`, `)})
        `)).rows as any[]).map(x => String(x.id)) : [];
        await db.execute(sql`DELETE FROM bd_enlaces WHERE columna_id = ${col.areas.id} AND fila_origen = ${fila.id}`);
        const autor = req.user?.id || ((await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${paginaId}`)).rows[0] as any)?.creator_user_id || null;
        let orden = 0;
        for (const a of pedidas.filter(x => validas.includes(x))) {
          await db.execute(sql`INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
            VALUES (${id('BDE')}, ${col.areas.id}, ${fila.id}, 'fila', ${a}, ${orden++}, ${autor})`);
        }
      }
      res.json({ ok: true });
    } catch (e: any) { console.error('perfil (guardar):', e); res.status(500).json({ error: e.message }); }
  });
}
