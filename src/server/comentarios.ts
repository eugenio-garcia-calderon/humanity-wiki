import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { accesoMiembro } from './miembros.js';
import { paginaVisible } from './sitios.js';
import { avisar } from './avisos.js';

// ============================================================================
// COMENTARIOS DE PÁGINA, COMPLETOS (2026-10-06, carril «acceso», #11)
// ============================================================================
// Como en Notion: se selecciona un trozo de texto y se comenta; el comentario
// queda ANCLADO a ese trozo. Cada comentario abre un hilo con respuestas, se
// resuelve (y se reabre), y una mención con @ avisa a esa persona.
//
// ── QUIÉN VE Y QUIÉN COMENTA ────────────────────────────────────────────────
// Antes sólo se comentaban bloques de páginas públicas. Ahora también las
// privadas, entre quienes tienen acceso:
//   · ver los hilos: quien ve la página (rol en ella, pública, o miembro del
//     sitio que puede verla);
//   · comentar: rol «Comentar» o más; en una página pública, cualquiera con
//     sesión (lo que ya había); en un sitio con miembros, el miembro cuya
//     categoría tiene «comentar» (llega como `req.user` por la identidad de
//     sitio de `miembros.ts`, sólo para estas rutas);
//   · resolver: quien escribió el hilo, o quien puede editar la página;
//   · borrar un comentario: su autor, o quien administra la página.
//
// ── LAS MENCIONES NO PUEDEN SER UNA FUGA ────────────────────────────────────
// La pantalla manda los ids de las personas mencionadas (las elige de un
// buscador que sólo ofrece a quien ve la página). Aun así, aquí se vuelve a
// comprobar: mencionar a alguien que no ve la página no le avisa, porque el
// aviso le enseñaría el título y un trozo de algo que no puede ver.

const nuevoId = () => `CP${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 46656).toString(36).toUpperCase()}`;

/** Lo que puede hacer quien llama con los comentarios de esta página. */
export async function poderesEnComentarios(db: any, req: Request, paginaId: string) {
  const a = await rolEnPagina(db, quienDe(req), paginaId);
  if (!a.existe) return null;
  const c = capacidades(a);
  const publica = c.ver ? true : await paginaVisible(db, paginaId);
  const m = await accesoMiembro(db, req, paginaId);
  const porMiembro = !!m && m.permitido && (m.restringida || m.esEquipo);
  const ver = c.ver || publica || porMiembro;
  const comentar = !!req.user && (c.comentar || (ver && (publica || porMiembro)));
  return { ver, comentar, editar: c.editar, gestionar: c.gestionar, duenyo: a.duenyo };
}

/** ¿Ve esta persona (por su id) la página? Para no avisar a quien no. */
async function laVe(db: any, userId: string, paginaId: string) {
  const u = (await db.execute(sql`SELECT role_level FROM users WHERE id = ${userId} AND archived_at IS NULL AND deleted_at IS NULL`)).rows[0] as any;
  if (!u) return false;
  const c = capacidades(await rolEnPagina(db, { id: userId, nivel: Number(u.role_level ?? 1) }, paginaId));
  return c.ver;
}

export function registrarComentarios(app: Express, db: any) {
  async function cargar(req: Request, res: Response, paginaId: string, para: 'ver' | 'comentar') {
    const p = await poderesEnComentarios(db, req, paginaId);
    if (!p) { res.status(404).json({ error: 'Esa página no existe.' }); return null; }
    if (para === 'ver' && !p.ver) { res.status(403).json({ error: 'No tienes acceso a esta página.' }); return null; }
    if (para === 'comentar' && !p.comentar) { res.status(req.user ? 403 : 401).json({ error: req.user ? 'No puedes comentar en esta página.' : 'Inicia sesión para comentar.' }); return null; }
    return p;
  }

  /** Los hilos de una página, con sus respuestas. */
  app.get('/api/comentarios/pagina/:id', async (req: Request, res: Response) => {
    try {
      const p = await cargar(req, res, String(req.params.id), 'ver');
      if (!p) return;
      const r = await db.execute(sql`
        SELECT c.id, c.hilo_id, c.autor_user_id, c.cuerpo, c.ancla, c.resuelto_en, c.editado_en, c.borrado_en, c.created_at,
               COALESCE(u.display_name, u.name) AS autor, u.avatar_url AS foto,
               COALESCE(rp.display_name, rp.name) AS resuelto_por
        FROM comentarios_pagina c
        JOIN users u ON u.id = c.autor_user_id
        LEFT JOIN users rp ON rp.id = c.resuelto_por
        WHERE c.pagina_id = ${req.params.id}
        ORDER BY c.created_at
        LIMIT 2000
      `);
      const hilos = new Map<string, any>();
      for (const f of r.rows as any[]) {
        // Lo borrado deja su sitio («comentario borrado») para que las
        // respuestas sigan teniendo sentido, pero sin su texto.
        const c = { ...f, cuerpo: f.borrado_en ? '' : f.cuerpo, mio: !!req.user && req.user.id === f.autor_user_id };
        if (!f.hilo_id) hilos.set(f.id, { ...c, respuestas: [] });
        else hilos.get(f.hilo_id)?.respuestas.push(c);
      }
      // Un hilo cuya raíz está borrada y sin respuestas vivas no se enseña.
      const lista = [...hilos.values()].filter(h => !h.borrado_en || h.respuestas.some((x: any) => !x.borrado_en));
      res.json({ hilos: lista, puedo: { comentar: p.comentar, resolver: p.editar, gestionar: p.gestionar } });
    } catch (e: any) { console.error('comentarios:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * COMENTAR — `{ cuerpo, ancla?, hilo_id?, menciones?: string[] }`.
   * Sin `hilo_id` abre un hilo (anclado a un trozo si trae `ancla`); con él,
   * responde. Responder a un hilo resuelto lo reabre: si alguien vuelve a
   * hablar, es que no estaba resuelto.
   */
  app.post('/api/comentarios/pagina/:id', async (req: Request, res: Response) => {
    try {
      const paginaId = String(req.params.id);
      const p = await cargar(req, res, paginaId, 'comentar');
      if (!p) return;
      const cuerpo = String(req.body?.cuerpo || '').trim().slice(0, 5000);
      if (!cuerpo) return res.status(400).json({ error: 'Escribe algo.' });
      let hilo: any = null;
      if (req.body?.hilo_id) {
        hilo = (await db.execute(sql`SELECT id, autor_user_id, resuelto_en FROM comentarios_pagina WHERE id = ${req.body.hilo_id} AND pagina_id = ${paginaId} AND hilo_id IS NULL`)).rows[0];
        if (!hilo) return res.status(404).json({ error: 'Ese hilo no existe.' });
      }
      let ancla: any = null;
      if (!hilo && req.body?.ancla && typeof req.body.ancla === 'object') {
        const a = req.body.ancla;
        ancla = {
          bloque: String(a.bloque || '').slice(0, 80),
          texto: String(a.texto || '').slice(0, 500),
          antes: String(a.antes || '').slice(-60),
          despues: String(a.despues || '').slice(0, 60),
        };
        if (!ancla.bloque) ancla = null;
      }
      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO comentarios_pagina (id, pagina_id, hilo_id, autor_user_id, cuerpo, ancla)
        VALUES (${id}, ${paginaId}, ${hilo?.id ?? null}, ${req.user!.id}, ${cuerpo}, ${ancla ? JSON.stringify(ancla) : null}::jsonb)
      `);
      if (hilo?.resuelto_en) await db.execute(sql`UPDATE comentarios_pagina SET resuelto_en = NULL, resuelto_por = NULL WHERE id = ${hilo.id}`);

      // ── AVISOS ──────────────────────────────────────────────────────────
      const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${paginaId}`)).rows[0] as any;
      const datos = { titulo: t?.title || 'Sin título', texto: cuerpo.slice(0, 140), comentario: hilo?.id || id };
      const avisados = new Set<string>([req.user!.id]);
      const aviso = async (para: string | null | undefined, tipo: 'comentario' | 'respuesta' | 'mencion') => {
        if (!para || avisados.has(para)) return;
        avisados.add(para);
        await avisar(db, { paraQuien: para, dePartede: req.user!.id, tipo, entidadTipo: 'knowledge_windows', entidadId: paginaId, datos });
      };
      const menciones = (Array.isArray(req.body?.menciones) ? req.body.menciones : []).map(String).slice(0, 20);
      for (const u of menciones) if (await laVe(db, u, paginaId)) await aviso(u, 'mencion');
      if (hilo) {
        // Quien abrió el hilo y quien ha respondido en él.
        await aviso(hilo.autor_user_id, 'respuesta');
        const otros = await db.execute(sql`SELECT DISTINCT autor_user_id FROM comentarios_pagina WHERE hilo_id = ${hilo.id} AND borrado_en IS NULL`);
        for (const o of otros.rows as any[]) await aviso(o.autor_user_id, 'respuesta');
      }
      await aviso(p.duenyo, 'comentario');
      res.json({ ok: true, id });
    } catch (e: any) { console.error('comentar:', e); res.status(500).json({ error: e.message }); }
  });

  async function comentario(id: string) {
    return (await db.execute(sql`SELECT * FROM comentarios_pagina WHERE id = ${id}`)).rows[0] as any;
  }

  /** Editar el propio comentario. */
  app.put('/api/comentarios/:cid', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const c = await comentario(String(req.params.cid));
      if (!c || c.borrado_en) return res.status(404).json({ error: 'Ese comentario no existe.' });
      if (c.autor_user_id !== req.user.id) return res.status(403).json({ error: 'Solo quien lo escribió puede cambiarlo.' });
      const cuerpo = String(req.body?.cuerpo || '').trim().slice(0, 5000);
      if (!cuerpo) return res.status(400).json({ error: 'Escribe algo.' });
      await db.execute(sql`UPDATE comentarios_pagina SET cuerpo = ${cuerpo}, editado_en = now() WHERE id = ${c.id}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Borrar: su autor, o quien administra la página. Queda la marca. */
  app.delete('/api/comentarios/:cid', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const c = await comentario(String(req.params.cid));
      if (!c || c.borrado_en) return res.status(404).json({ error: 'Ese comentario no existe.' });
      if (c.autor_user_id !== req.user.id) {
        const p = await poderesEnComentarios(db, req, c.pagina_id);
        if (!p?.gestionar) return res.status(403).json({ error: 'Solo quien lo escribió o quien administra la página puede borrarlo.' });
      }
      await db.execute(sql`UPDATE comentarios_pagina SET borrado_en = now() WHERE id = ${c.id}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Resolver o reabrir un hilo — `{ resuelto: boolean }`. */
  app.post('/api/comentarios/:cid/resolver', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const c = await comentario(String(req.params.cid));
      if (!c || c.hilo_id) return res.status(404).json({ error: 'Ese hilo no existe.' });
      const p = await poderesEnComentarios(db, req, c.pagina_id);
      if (!p?.ver || (c.autor_user_id !== req.user.id && !p.editar)) return res.status(403).json({ error: 'Solo quien abrió el hilo o quien edita la página puede resolverlo.' });
      const resuelto = !!req.body?.resuelto;
      await db.execute(sql`
        UPDATE comentarios_pagina SET resuelto_en = ${resuelto ? sql`now()` : sql`NULL`}, resuelto_por = ${resuelto ? req.user.id : null}
        WHERE id = ${c.id}
      `);
      if (resuelto) {
        const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${c.pagina_id}`)).rows[0] as any;
        await avisar(db, { paraQuien: c.autor_user_id, dePartede: req.user.id, tipo: 'comentario_resuelto', entidadTipo: 'knowledge_windows', entidadId: c.pagina_id,
          datos: { titulo: t?.title || 'Sin título', texto: String(c.cuerpo).slice(0, 140) } });
      }
      res.json({ ok: true, resuelto });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * A QUIÉN SE PUEDE MENCIONAR — `?q=` — sólo a quien ve la página: la dueña,
   * las personas y los equipos con acceso directo, y quien ya ha comentado.
   * En una página pública, además, cualquiera por su nombre.
   */
  app.get('/api/comentarios/pagina/:id/mencionables', async (req: Request, res: Response) => {
    try {
      const p = await cargar(req, res, String(req.params.id), 'comentar');
      if (!p) return;
      const q = String(req.query.q || '').trim();
      const like = `%${q}%`;
      const publica = await paginaVisible(db, String(req.params.id));
      const r = await db.execute(sql`
        SELECT DISTINCT u.id, COALESCE(u.display_name, u.name) AS nombre, u.avatar_url
        FROM users u
        WHERE u.archived_at IS NULL AND u.deleted_at IS NULL AND u.id <> ${req.user!.id}
          AND (u.display_name ILIKE ${like} OR u.name ILIKE ${like})
          AND (
            ${publica}
            OR u.id = ${p.duenyo}
            OR u.id IN (SELECT user_id FROM accesos_entidad WHERE entidad_tipo = 'pagina' AND entidad_id = ${req.params.id})
            OR u.id IN (SELECT m.user_id FROM accesos_equipo a JOIN equipo_miembros m ON m.equipo_id = a.equipo_id
                        WHERE a.entidad_tipo = 'pagina' AND a.entidad_id = ${req.params.id})
            OR u.id IN (SELECT autor_user_id FROM comentarios_pagina WHERE pagina_id = ${req.params.id})
          )
        ORDER BY nombre LIMIT 8
      `);
      res.json({ personas: r.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
