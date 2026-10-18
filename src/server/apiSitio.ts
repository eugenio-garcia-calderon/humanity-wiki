import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { rolEnPagina, capacidades, puedeEditarPagina, quienDe } from './permisos';
import { registrarHistorial } from './historial';
import { completarSitio, type Enlace } from '../components/sitio/sitioWeb';

// ============================================================================
// EL MENÚ DE UN SITIO POR LA API (2026-10-18, Wikiproducts W2)
// ============================================================================
// El menú de un sitio publicado vive en `config.sitio.menu.enlaces` de su
// página raíz y sólo se podía cambiar desde el editor, en un navegador. Los
// sitios que se construyen por la API (Wikiproducts, desde un flujo de GitHub)
// no podían añadir «Expertos» al menú sin que alguien abriera la pantalla.
//
//   GET    /api/v1/pages/:id/site                 el menú y el pie, tal cual
//   POST   /api/v1/pages/:id/site/menu/links      añade un enlace
//          { link: { text, page_id } | { text, home: true } | { text, path: "/..." },
//            after?: "<id de enlace>" | null, style?: "texto" | "boton" }
//   DELETE /api/v1/pages/:id/site/menu/links/:linkId
//
// Como los bloques (`apiPublica.ts`): sólo destinos que no sacan a nadie del
// sitio. Una página de la misma dueña, la portada o una dirección del propio
// sitio. Una clave filtrada no puede poner en el menú un enlace a otra web.
// La página tiene que ser ya la raíz de un sitio (tener `config.sitio`): por
// aquí no se convierte una página cualquiera en un sitio.

const MAX_TEXTO = 60;
const MAX_ENLACES = 20;

export function registrarApiSitio(app: Express, db: any) {
  const raizParaEditar = async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const a = await rolEnPagina(db, quienDe(req), id);
    if (!a.existe) { res.status(404).json({ error: 'Esa página no existe.' }); return null; }
    if (!(await puedeEditarPagina(db, quienDe(req), id))) { res.status(403).json({ error: 'No puedes editar esa página.' }); return null; }
    const w = (await db.execute(sql`SELECT * FROM knowledge_windows WHERE id = ${id}`)).rows[0] as any;
    if (!w?.config?.sitio) { res.status(409).json({ error: 'Esa página no es la raíz de un sitio: su menú se edita en la página raíz.' }); return null; }
    return w;
  };

  const guardarMenu = async (req: Request, res: Response, antes: any, enlaces: Enlace[]) => {
    const base = req.body?.version === undefined ? null : Number(req.body.version);
    const u = await db.execute(sql`
      UPDATE knowledge_windows SET
        config = jsonb_set(config, '{sitio,menu}', COALESCE(config->'sitio'->'menu', '{}'::jsonb) || jsonb_build_object('enlaces', ${JSON.stringify(enlaces)}::jsonb)),
        version = version + 1, updated_at = now(), updated_by = ${req.user!.id}
      WHERE id = ${antes.id} AND version = ${base ?? antes.version}::int
      RETURNING version
    `);
    if (!u.rows.length) { res.status(409).json({ error: 'Otra persona ha guardado esta página mientras tanto. Vuelve a leerla y repite el cambio.' }); return null; }
    await registrarHistorial(db, { entidad: 'knowledge_windows', tabla: 'knowledge_windows', id: antes.id, operacion: 'update', previo: antes, actor: req.user!.id, agrupar: true });
    return Number((u.rows[0] as any).version);
  };

  const comoSale = (s: any) => {
    const c = completarSitio(s);
    return {
      menu: { active: c.menu.activo, search: c.menu.buscador === true, links: c.menu.enlaces },
      footer: { active: c.pie.activo, links: c.pie.enlaces },
    };
  };

  app.get('/api/v1/pages/:id/site', async (req: Request, res: Response) => {
    try {
      const a = await rolEnPagina(db, quienDe(req), String(req.params.id));
      if (!a.existe) return res.status(404).json({ error: 'Esa página no existe.' });
      if (!(a.rol || a.publico) || !capacidades(a).ver) return res.status(403).json({ error: 'No tienes acceso a esa página.' });
      const w = (await db.execute(sql`SELECT config->'sitio' AS sitio, version FROM knowledge_windows WHERE id = ${req.params.id}`)).rows[0] as any;
      if (!w?.sitio) return res.status(409).json({ error: 'Esa página no es la raíz de un sitio.' });
      res.json({ page_id: String(req.params.id), version: w.version, ...comoSale(w.sitio) });
    } catch (e: any) { console.error('v1 sitio:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  app.post('/api/v1/pages/:id/site/menu/links', async (req: Request, res: Response) => {
    try {
      const antes = await raizParaEditar(req, res); if (!antes) return;
      const l = req.body?.link || {};
      const texto = String(l.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO);
      if (!texto) return res.status(400).json({ error: 'Falta «text»: lo que dice el enlace.' });
      let destino: Enlace['destino'];
      if (l.home === true) destino = { tipo: 'inicio' };
      else if (typeof l.page_id === 'string' && l.page_id) {
        // De la misma dueña y que se pueda editar con esta clave: como una subpágina.
        const h = (await db.execute(sql`
          SELECT h.title FROM knowledge_windows h
          WHERE h.id = ${l.page_id} AND h.kind = 'pagina' AND h.deleted_at IS NULL AND h.archived_at IS NULL
            AND h.creator_user_id = ${antes.creator_user_id}
        `)).rows[0] as any;
        if (!h || !(await puedeEditarPagina(db, quienDe(req), l.page_id))) return res.status(404).json({ error: 'Esa página no existe o no es de quien es este sitio.' });
        destino = { tipo: 'pagina', id: l.page_id, titulo: h.title || undefined };
      } else if (typeof l.path === 'string' && /^\/(?!\/)[A-Za-z0-9/_.~%-]*$/.test(l.path)) destino = { tipo: 'url', url: l.path };
      else return res.status(400).json({ error: 'El destino es «page_id» (una página de este sitio), «home: true» o «path» (una dirección del sitio que empieza por /).' });

      const enlaces: Enlace[] = completarSitio(antes.config.sitio).menu.enlaces.slice();
      if (enlaces.length >= MAX_ENLACES) return res.status(400).json({ error: `El menú ya tiene ${MAX_ENLACES} enlaces.` });
      const tras = req.body?.after ? enlaces.findIndex(e => e?.id === String(req.body.after)) : -1;
      if (req.body?.after && tras < 0) return res.status(404).json({ error: 'No hay un enlace con ese «after» en el menú.' });
      const nuevo: Enlace = { id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, texto, destino,
        ...(req.body?.style === 'boton' ? { estilo: 'boton' as const } : {}) };
      enlaces.splice(tras < 0 ? enlaces.length : tras + 1, 0, nuevo);
      const version = await guardarMenu(req, res, antes, enlaces); if (version === null) return;
      res.status(201).json({ link: nuevo, version });
    } catch (e: any) { console.error('v1 menú añadir:', e); res.status(500).json({ error: 'Error interno.' }); }
  });

  app.delete('/api/v1/pages/:id/site/menu/links/:linkId', async (req: Request, res: Response) => {
    try {
      const antes = await raizParaEditar(req, res); if (!antes) return;
      const enlaces: Enlace[] = completarSitio(antes.config.sitio).menu.enlaces;
      const quitado = enlaces.find(e => e?.id === String(req.params.linkId));
      if (!quitado) return res.status(404).json({ error: 'El menú no tiene un enlace con ese id.' });
      const version = await guardarMenu(req, res, antes, enlaces.filter(e => e !== quitado)); if (version === null) return;
      res.json({ removed: quitado, version });
    } catch (e: any) { console.error('v1 menú quitar:', e); res.status(500).json({ error: 'Error interno.' }); }
  });
}
