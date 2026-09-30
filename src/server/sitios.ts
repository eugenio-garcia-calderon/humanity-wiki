// ============================================================================
// SITIOS PUBLICADOS (2026-09-30)
// ============================================================================
// Eugenio: «que Humanity Wiki sea como un constructor de páginas web que
// permite ser oculto, donde no hay ninguna referencia a la infraestructura en
// esa página cuando está publicada y se accede desde un dominio propio, un
// subdominio o una URL corta. De esta manera puede compartir sin miedo a que
// quede cutre».
//
// Una página publicada deja de ser una página suelta: es un SITIO. Lo que
// cuelga de ella —los elementos de sus bases de datos, que son páginas— se
// abre dentro del mismo sitio, con la misma dirección y sin el armazón de la
// plataforma. Este módulo pone las tres cosas que el navegador no puede poner
// solo:
//
//   1. QUIÉN PUEDE VER UNA SUBPÁGINA. Una página que es elemento de una base
//      de datos se ve si la página que contiene esa base de datos se ve. Es la
//      regla de Notion: los permisos bajan por el árbol. Sin ella, publicar una
//      página con una galería enseñaba la galería vacía (o un «no tienes
//      acceso») a todo el que no fuera el autor.
//
//   2. LA VISTA PREVIA AL COMPARTIR. WhatsApp, LinkedIn o Google no ejecutan
//      JavaScript: leen el HTML tal cual llega. Si el título, la descripción y
//      la imagen se ponen desde el navegador, el enlace compartido sale como
//      «Humanity.wiki» con nuestro logo. Aquí se escriben dentro del HTML antes
//      de mandarlo.
//
//   3. SITEMAP Y ROBOTS POR DOMINIO. Un sitio con dominio propio necesita que
//      Google encuentre sus páginas bajo SU dominio.
import type { Express, Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';

const DOMINIO = 'humanity.wiki';
const RESERVADOS = new Set(['www', 'api', 'admin', 'app', 'mail', 'ftp', 'cdn', 'static', 'assets']);

/** Cuántos niveles de «página dentro de página» se suben como mucho. Evita
 *  que un ciclo (una tabla metida en su propia subpágina) sea un bucle. */
const PROFUNDIDAD = 8;

// ── 1. VISIBILIDAD HEREDADA ─────────────────────────────────────────────────

/** Las páginas desde las que se sube: la propia página. */
const subirDesdePagina = (id: string) => sql`
  WITH RECURSIVE sube(id, n) AS (
    SELECT ${id}::text, 0
    UNION
    SELECT w.id, s.n + 1 FROM sube s
    JOIN bd_filas f ON f.pagina_id = s.id AND f.deleted_at IS NULL
    JOIN knowledge_windows w ON w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
      AND w.config->'bloques' @> jsonb_build_array(jsonb_build_object('tabla_id', f.tabla_id))
    WHERE s.n < ${PROFUNDIDAD}
  )
  SELECT EXISTS (
    SELECT 1 FROM sube s JOIN knowledge_windows w ON w.id = s.id
    WHERE w.publico = true AND w.deleted_at IS NULL AND w.archived_at IS NULL
  ) AS visible
`;

/** ¿Puede verla cualquiera? Publicada ella, o alguna página por encima. */
export async function paginaVisible(db: any, id: string): Promise<boolean> {
  const r = await db.execute(subirDesdePagina(id));
  return !!(r.rows[0] as any)?.visible;
}

/** ¿Puede ver cualquiera esta tabla? Sí si está metida en una página que se
 *  ve. La tabla no tiene visibilidad propia: la hereda de dónde se enseña. */
export async function tablaVisible(db: any, tablaId: string): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT id FROM knowledge_windows
    WHERE kind = 'pagina' AND deleted_at IS NULL AND archived_at IS NULL
      AND config->'bloques' @> jsonb_build_array(jsonb_build_object('tabla_id', ${tablaId}::text))
    LIMIT 20
  `);
  for (const p of r.rows as any[]) if (await paginaVisible(db, p.id)) return true;
  return false;
}

// ── QUÉ SITIO ES ESTE ANFITRIÓN ─────────────────────────────────────────────
// La misma decisión que toma el navegador en `utils/subdominio.ts`, hecha
// aquí para poder escribir el HTML antes de que llegue.

type Sitio =
  | { forma: 'dominio'; host: string }
  | { forma: 'subdominio'; host: string; handle: string }
  | { forma: 'casa'; host: string };

function sitioDe(req: Request): Sitio {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (host === DOMINIO || host === 'localhost' || /^[0-9.]+$/.test(host) || !host) return { forma: 'casa', host };
  if (host.endsWith('.' + DOMINIO) || host.endsWith('.localhost')) {
    const primero = host.split('.')[0];
    if (!primero || RESERVADOS.has(primero)) return { forma: 'casa', host };
    return { forma: 'subdominio', host, handle: primero };
  }
  return { forma: 'dominio', host };
}

/** La página a la que apunta un dominio propio, o su dueño si apunta al
 *  espacio entero. */
async function dominioApunta(db: any, host: string) {
  const r = await db.execute(sql`
    SELECT dp.entidad_tipo, dp.entidad_id, u.handle
    FROM dominios_paginas dp JOIN users u ON u.id = dp.propietario_user_id
    WHERE dp.dominio = ${host} AND dp.estado IN ('pendiente', 'activo')
  `);
  return (r.rows[0] as any) || null;
}

/** Lo que hace falta para pintar una página y para describirla fuera. */
async function datosPagina(db: any, id: string) {
  const r = await db.execute(sql`
    SELECT w.id, w.title, w.config, w.indexable, w.publico, w.slug, w.created_at, w.updated_at,
           u.handle, u.display_name, u.name, u.avatar_url
    FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
    WHERE w.id = ${id} AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
  `);
  return (r.rows[0] as any) || null;
}

/** La descripción para buscadores y redes: la que escribió el autor, o el
 *  primer texto de la página. */
export function descripcionDe(config: any): string {
  const propia = typeof config?.descripcion === 'string' ? config.descripcion.trim() : '';
  if (propia) return propia.slice(0, 300);
  const bloques = Array.isArray(config?.bloques) ? config.bloques : [];
  for (const b of bloques) {
    const t = typeof b?.texto === 'string' ? b.texto.replace(/[*`#>\[\]]|\(http[^)]*\)/g, '').trim() : '';
    if (t) return t.length > 200 ? t.slice(0, 197) + '…' : t;
  }
  return '';
}

/** La imagen al compartir: la elegida, la portada, o la primera imagen. */
function imagenDe(config: any): string | null {
  if (config?.imagenCompartir) return config.imagenCompartir;
  if (config?.portada) return config.portada;
  const bloques = Array.isArray(config?.bloques) ? config.bloques : [];
  return bloques.find((b: any) => b?.tipo === 'imagen' && b.url)?.url || null;
}

// ── LAS RUTAS ───────────────────────────────────────────────────────────────

export function registrarSitios(app: Express, db: any) {
  /**
   * Una subpágina de un sitio publicado — `/p/:id` en cualquier forma de
   * sitio. Devuelve lo mismo que el resolvedor de páginas publicadas, más su
   * página madre para poder volver sin salir del sitio.
   */
  app.get('/api/sitio/pagina/:id', async (req: Request, res: Response) => {
    try {
      const w = await datosPagina(db, req.params.id);
      if (!w || !(await paginaVisible(db, w.id))) {
        return res.status(404).json({ error: 'Esa página no existe o no está publicada.' });
      }
      const pr = await db.execute(sql`
        SELECT p.id, p.title, p.slug, p.publico, u.handle
        FROM bd_filas f
        JOIN knowledge_windows p ON p.kind = 'pagina' AND p.deleted_at IS NULL AND p.archived_at IS NULL
          AND p.config->'bloques' @> jsonb_build_array(jsonb_build_object('tabla_id', f.tabla_id))
        JOIN users u ON u.id = p.creator_user_id
        WHERE f.pagina_id = ${w.id} AND f.deleted_at IS NULL
        ORDER BY p.publico DESC, p.created_at LIMIT 1
      `);
      const p = pr.rows[0] as any;
      res.json({
        id: w.id, titulo: w.title, config: w.config,
        // Una subpágina que no se publicó por su cuenta se indexa si su madre
        // se indexa: lo decide quien publicó el sitio.
        indexable: w.publico ? !!w.indexable : true,
        created_at: w.created_at, updated_at: w.updated_at,
        autor: { handle: w.handle, nombre: w.display_name || w.name, avatar: w.avatar_url },
        padre: p ? { id: p.id, titulo: p.title, slug: p.publico ? p.slug : null, handle: p.handle } : null,
      });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── 3. ROBOTS Y SITEMAP DE CADA SITIO ─────────────────────────────────────
  // Sólo en dominios propios y subdominios. En la casa común no se toca nada:
  // esa decisión es de la plataforma, no de este módulo.

  app.get('/robots.txt', async (req: Request, res: Response, next: NextFunction) => {
    const s = sitioDe(req);
    if (s.forma === 'casa') return next();
    res.type('txt').send(`User-agent: *\nAllow: /\nSitemap: https://${s.host}/sitemap.xml\n`);
  });

  app.get('/sitemap.xml', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const s = sitioDe(req);
      if (s.forma === 'casa') return next();
      const urls: Array<{ loc: string; mod: string }> = [];
      const fecha = (d: any) => new Date(d).toISOString().slice(0, 10);

      /** Las subpáginas de una página, recursivamente, como `/p/:id`. */
      const subpaginas = async (raiz: string) => {
        const r = await db.execute(sql`
          WITH RECURSIVE baja(id, n) AS (
            SELECT ${raiz}::text, 0
            UNION
            SELECT f.pagina_id, b.n + 1 FROM baja b
            JOIN knowledge_windows w ON w.id = b.id
            CROSS JOIN LATERAL jsonb_array_elements(COALESCE(w.config->'bloques', '[]'::jsonb)) blq
            JOIN bd_filas f ON f.tabla_id = blq->>'tabla_id' AND f.deleted_at IS NULL AND f.pagina_id IS NOT NULL
            WHERE b.n < ${PROFUNDIDAD} AND blq->>'tipo' = 'basedatos'
          )
          SELECT w.id, w.updated_at FROM baja b JOIN knowledge_windows w ON w.id = b.id
          WHERE b.n > 0 AND w.deleted_at IS NULL AND w.archived_at IS NULL
        `);
        for (const x of r.rows as any[]) urls.push({ loc: `https://${s.host}/p/${x.id}`, mod: fecha(x.updated_at) });
      };

      if (s.forma === 'dominio') {
        const d = await dominioApunta(db, s.host);
        if (!d) return res.status(404).type('txt').send('No existe ese fichero.');
        if (d.entidad_id && d.entidad_tipo === 'pagina') {
          const w = await datosPagina(db, d.entidad_id);
          if (w?.publico && w.indexable) {
            urls.push({ loc: `https://${s.host}/`, mod: fecha(w.updated_at) });
            await subpaginas(w.id);
          }
        } else if (!d.entidad_id) {
          await paginasDeEspacio(d.handle);
        }
      } else {
        await paginasDeEspacio(s.handle);
      }

      async function paginasDeEspacio(handle: string) {
        const r = await db.execute(sql`
          SELECT w.id, w.slug, w.updated_at FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
          WHERE u.handle = ${handle} AND w.kind = 'pagina' AND w.publico = true AND w.indexable = true
            AND w.slug IS NOT NULL AND w.deleted_at IS NULL AND w.archived_at IS NULL
        `);
        urls.push({ loc: `https://${s.host}/`, mod: fecha(Date.now()) });
        for (const x of r.rows as any[]) {
          urls.push({ loc: `https://${s.host}/${x.slug}`, mod: fecha(x.updated_at) });
          await subpaginas(x.id);
        }
      }

      const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      res.type('application/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.mod}</lastmod></url>`).join('\n') +
        `\n</urlset>\n`,
      );
    } catch (e: any) { console.error(e); res.status(500).type('txt').send('No se pudo generar.'); }
  });

  // ── 2. EL HTML CON SU TÍTULO, DESCRIPCIÓN E IMAGEN ────────────────────────
  // Sólo en producción: en desarrollo el HTML lo sirve Vite y no hay fichero
  // que reescribir. Si algo falla aquí se sirve el de siempre —una vista previa
  // genérica es mucho mejor que una página que no carga.
  const indice = path.join(process.cwd(), 'dist', 'index.html');
  let plantilla: string | null = null;

  app.get(/^\/(?!api\/|assets\/|uploads\/)[^.]*$/, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (process.env.NODE_ENV !== 'production') return next();
      if (!String(req.headers.accept || '').includes('text/html')) return next();
      const w = await paginaDeLaDireccion(req);
      if (!w) return next();
      if (plantilla === null) plantilla = fs.existsSync(indice) ? fs.readFileSync(indice, 'utf8') : '';
      if (!plantilla) return next();

      const s = sitioDe(req);
      const propio = s.forma !== 'casa';
      const titulo = String(w.title || '').trim() || 'Sin título';
      const desc = descripcionDe(w.config);
      const img = imagenDe(w.config);
      const abs = (u: string) => /^https?:/.test(u) ? u : `https://${s.host}${u.startsWith('/') ? '' : '/'}${u}`;
      const url = `https://${s.host}${req.path}`;
      const icono = w.config?.icono;
      const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const meta = [
        `<meta name="description" content="${esc(desc)}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:title" content="${esc(titulo)}">`,
        desc && `<meta property="og:description" content="${esc(desc)}">`,
        `<meta property="og:url" content="${esc(url)}">`,
        img && `<meta property="og:image" content="${esc(abs(img))}">`,
        `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">`,
        `<link rel="canonical" href="${esc(url)}">`,
        `<meta name="robots" content="${w.indexable === false ? 'noindex,nofollow' : 'index,follow'}">`,
      ].filter(Boolean).join('\n    ');

      let html = plantilla
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(propio ? titulo : `${titulo} · humanity.wiki`)}</title>`)
        .replace('</head>', `    ${meta}\n  </head>`);
      // En un sitio propio, el icono de la pestaña es el de la página. Un emoji
      // se convierte en un SVG; una imagen se usa tal cual.
      if (propio && icono) {
        const href = /^(https?:|\/)/.test(icono)
          ? abs(icono)
          : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icono}</text></svg>`)}`;
        html = html.replace(/<link[^>]+rel="icon"[^>]*>/g, '').replace('</head>', `    <link rel="icon" href="${esc(href)}">\n  </head>`);
      }
      res.type('html').set('Cache-Control', 'no-cache').send(html);
    } catch (e) {
      console.error('sitios: vista previa', e);
      next();
    }
  });

  /** Qué página publicada hay en esta dirección, si hay alguna. */
  async function paginaDeLaDireccion(req: Request): Promise<any | null> {
    const s = sitioDe(req);
    const tramos = req.path.split('/').filter(Boolean).map(decodeURIComponent);

    // `/p/:id` es la misma en todas las formas (y `/@quien/p/:id` en casa).
    const sub = tramos[0] === 'p' && tramos.length === 2 ? tramos[1]
      : s.forma === 'casa' && tramos[0]?.startsWith('@') && tramos[1] === 'p' && tramos.length === 3 ? tramos[2]
      : null;
    if (sub) {
      const w = await datosPagina(db, sub);
      if (!w || !(await paginaVisible(db, w.id))) return null;
      return { ...w, indexable: w.publico ? w.indexable : true };
    }

    const porSlug = async (handle: string, slug: string) => {
      const r = await db.execute(sql`
        SELECT w.id FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
        WHERE u.handle = ${handle.toLowerCase()} AND w.slug = ${slug.toLowerCase()}
          AND w.publico = true AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
      `);
      const id = (r.rows[0] as any)?.id;
      return id ? datosPagina(db, id) : null;
    };

    if (s.forma === 'dominio') {
      const d = await dominioApunta(db, s.host);
      if (!d) return null;
      if (d.entidad_id && d.entidad_tipo === 'pagina') {
        const w = await datosPagina(db, d.entidad_id);
        return w?.publico ? w : null;
      }
      if (!d.entidad_id && tramos.length === 1) return porSlug(d.handle, tramos[0]);
      return null;
    }
    if (s.forma === 'subdominio') return tramos.length === 1 ? porSlug(s.handle, tramos[0]) : null;
    if (tramos.length === 2 && tramos[0].startsWith('@')) return porSlug(tramos[0].slice(1), tramos[1]);
    return null;
  }
}
