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
import { resolverDominio } from './dominios';
import { cabeceraEnHtml } from './cabeceraSitio';
import { bloquesDe } from './bloquesSql';
import { slugDe } from '../components/sitio/sitioWeb';
import { madresValidas, rolEnPagina, capacidades, quienDe } from './permisos.js';
import { accesoMiembro, filtrarBloques, muroDe } from './miembros.js';
import { peticionActual } from './peticionActual.js';

const DOMINIO = 'humanity.wiki';
const RESERVADOS = new Set(['www', 'api', 'admin', 'app', 'mail', 'ftp', 'cdn', 'static', 'assets']);

/** Cuántos niveles de «página dentro de página» se suben como mucho. Evita
 *  que un ciclo (una tabla metida en su propia subpágina) sea un bucle. */
const PROFUNDIDAD = 8;

// ── 1. VISIBILIDAD HEREDADA ─────────────────────────────────────────────────

/**
 * Las páginas desde las que se sube: la propia página y sus madres.
 *
 * DOS CORRECCIONES (2026-10-05, carril acceso):
 *  · Se sube sólo por MADRES VÁLIDAS (`permisos.ts`). Antes cualquiera podía
 *    poner en SU página pública un bloque «Página» con el id de la página
 *    privada de otra persona, y esa página ajena pasaba a verse en
 *    `/api/sitio/pagina/:id`. Ahora el eslabón exige que la madre sea de la
 *    misma dueña (o la base de datos, de la dueña de la madre).
 *  · No se sube desde una página «solo miembros» (`sitio_restricciones`): lo
 *    que cuelga de ella es de los miembros, y que su abuela sea pública no lo
 *    hace público. Una restringida nunca es pública (disparador de 0136).
 */
const subirDesdePagina = (id: string) => sql`
  WITH RECURSIVE sube(id, n) AS (
    SELECT ${id}::text, 0
    UNION
    SELECT madre.id, s.n + 1 FROM sube s
    CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) madre
    WHERE s.n < ${PROFUNDIDAD}
      -- Con el registro desactivado también: lo restringido queda para el
      -- equipo, no se abre de golpe al mundo por apagar un interruptor.
      AND NOT EXISTS (SELECT 1 FROM sitio_restricciones r WHERE r.pagina_id = s.id AND r.bloque_id = '')
  )
  SELECT EXISTS (
    SELECT 1 FROM sube s JOIN knowledge_windows w ON w.id = s.id
    WHERE w.publico = true AND w.deleted_at IS NULL AND w.archived_at IS NULL
  ) AS visible
`;

/**
 * EL MENÚ Y EL PIE DE ESTA PÁGINA (2026-10-02): los de la página más cercana
 * por encima —ella incluida— que los tenga en `config.sitio`. Se sube por el
 * mismo camino que la visibilidad, así que una subpágina de una galería
 * hereda el menú de la página que la enseña: uno para toda la web.
 */
export async function sitioDePagina(db: any, id: string) {
  const r = await db.execute(sql`
    WITH RECURSIVE sube(id, n) AS (
      SELECT ${id}::text, 0
      UNION
      SELECT madre.id, s.n + 1 FROM sube s
      CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) madre
      WHERE s.n < ${PROFUNDIDAD}
    )
    SELECT w.id, w.title, w.config->'sitio' AS sitio, w.config->>'icono' AS icono
    FROM sube s JOIN knowledge_windows w ON w.id = s.id
    WHERE w.config ? 'sitio' AND w.deleted_at IS NULL AND w.archived_at IS NULL
    ORDER BY s.n LIMIT 1
  `);
  const w = r.rows[0] as any;
  return w ? { config: w.sitio, raizId: w.id, titulo: w.title, icono: w.icono || null } : null;
}

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
      AND ${bloquesDe()} @> jsonb_build_array(jsonb_build_object('tabla_id', ${tablaId}::text))
    LIMIT 20
  `);
  for (const p of r.rows as any[]) if (await paginaVisible(db, p.id) || await laVeQuienPregunta(db, p.id)) return true;
  return false;
}

/**
 * ¿Ve esta página QUIEN HACE LA PETICIÓN, aunque no la vea cualquiera?
 * (2026-10-05, carril acceso). Por un rol en ella (compartida con él, #12) o
 * por ser miembro de su sitio con permiso. La petición no llega por
 * parámetro: `bd.ts` llama a `tablaVisible` sin ella, y por eso se toma de
 * `peticionActual()` (ver ese fichero).
 */
async function laVeQuienPregunta(db: any, paginaId: string): Promise<boolean> {
  const req = peticionActual();
  if (!req) return false;
  if (req.user && capacidades(await rolEnPagina(db, quienDe(req), paginaId)).ver) return true;
  const a = await accesoMiembro(db, req, paginaId);
  return !!a && a.permitido && (a.restringida || a.esEquipo);
}

/** ¿Puede ver cualquiera esta pizarra? Sí si está metida (bloque
 *  `pizarra`) en una página que se ve. Como las tablas: la hereda. */
export async function pizarraVisible(db: any, graphId: string): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT id FROM knowledge_windows
    WHERE kind = 'pagina' AND deleted_at IS NULL AND archived_at IS NULL
      AND ${bloquesDe()} @> jsonb_build_array(jsonb_build_object('tipo', 'pizarra', 'entityId', ${graphId}::text))
    LIMIT 20
  `);
  for (const p of r.rows as any[]) if (await paginaVisible(db, p.id) || await laVeQuienPregunta(db, p.id)) return true;
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


// ── LA PÁGINA PROPIA DE UNA BASE DE DATOS (2026-10-08) ──────────────────────
// Eugenio: «en cada base de datos un botón para que se abra en una pestaña
// nueva y sea una página en sí, con su URL, para el SEO». `/bd/:tabla/:nombre`.
//
// NO ES UNA PÁGINA GUARDADA: es la galería de la base de datos con el menú y
// el pie de la página que la enseña, armada al vuelo. Por eso no hay nada que
// mantener al día —si cambia la tabla, cambia aquí— y no se puede quedar una
// página huérfana. El `:nombre` de la dirección es sólo para los buscadores y
// para quien la lee: se ignora al buscar (manda el id) y el canonical lo
// vuelve a escribir bien.
//
// QUIÉN LA VE es quien ve la página que la contiene (`tablaVisible`). Si el
// bloque está restringido a miembros, para un anónimo no existe.

const buscarBloqueBd = (lista: any[], tabla: string): any | null => {
  for (const b of Array.isArray(lista) ? lista : []) {
    if (b?.tipo === 'basedatos' && b.tabla_id === tabla) return b;
    const dentro = buscarBloqueBd(b?.bloques, tabla);
    if (dentro) return dentro;
  }
  return null;
};

export async function baseDatosPublica(db: any, tablaId: string, req?: Request): Promise<any | null> {
  const t = (await db.execute(sql`SELECT id, titulo, icono, descripcion, updated_at FROM bd_tablas WHERE id = ${tablaId} AND deleted_at IS NULL AND archived_at IS NULL`)).rows[0] as any;
  if (!t) return null;
  const r = await db.execute(sql`
    SELECT id FROM knowledge_windows
    WHERE kind = 'pagina' AND deleted_at IS NULL AND archived_at IS NULL
      AND ${bloquesDe()} @> jsonb_build_array(jsonb_build_object('tabla_id', ${tablaId}::text))
    ORDER BY publico DESC, created_at LIMIT 20
  `);
  // La primera página que la contiene Y que se puede ver, con el bloque aún a la vista.
  for (const p of r.rows as any[]) {
    const acceso = await accesoMiembro(db, req, p.id);
    const publica = await paginaVisible(db, p.id);
    const porMiembro = !!acceso && acceso.permitido && (acceso.restringida || acceso.esEquipo);
    if (!publica && !porMiembro && !(req && await laVeQuienPregunta(db, p.id))) continue;
    const w = await datosPagina(db, p.id);
    if (!w) continue;
    const { config } = await filtrarBloques(db, w.id, w.config, acceso);
    const bloque = buscarBloqueBd(config?.bloques, tablaId);
    if (!bloque) continue;

    // Los primeros elementos: dan la descripción y la imagen para buscadores y redes.
    const filas = (await db.execute(sql`
      SELECT pw.title, pw.config->>'portada' AS portada FROM bd_filas f
      JOIN knowledge_windows pw ON pw.id = f.pagina_id AND pw.deleted_at IS NULL
      WHERE f.tabla_id = ${tablaId} AND f.deleted_at IS NULL AND f.archived_at IS NULL
      ORDER BY f.orden, f.created_at LIMIT 12
    `)).rows as any[];
    const nombres = filas.map(f => String(f.title || '').trim()).filter(Boolean);
    const titulo = String(t.titulo || '').trim() || 'Base de datos';
    const descripcion = String(t.descripcion || '').trim()
      || (nombres.length ? `${titulo}: ${nombres.join(', ')}`.slice(0, 300) : titulo);
    const portada = filas.find(f => f.portada)?.portada || null;

    const sitio = await sitioDePagina(db, w.id);
    return {
      id: `bd-${tablaId}`, titulo, virtual: true,
      title: titulo,
      // El bloque tal como lo dejó quien escribe la página (vista, tamaño,
      // propiedades) pero sin su título: lo pinta la cabecera, como h1.
      config: {
        bloques: [{ ...bloque, tituloOculto: true }],
        descripcion, imagenCompartir: portada, icono: t.icono || undefined,
        cabecera: undefined, mostrarAutor: false,
      },
      indexable: w.publico ? !!w.indexable : true,
      created_at: w.created_at, updated_at: t.updated_at,
      autor: { handle: w.handle, nombre: w.display_name || w.name, avatar: w.avatar_url },
      padre: { id: w.id, titulo: w.title, slug: w.publico ? w.slug : null, handle: w.handle },
      sitio,
      miembros: acceso ? { raiz: acceso.sitio.raiz, ocultos: 0 } : null,
    };
  }
  return null;
}

/** La descripción para buscadores y redes: la que escribió el autor, o el
 *  primer texto de la página. */
export function descripcionDe(config: any): string {
  const propia = typeof config?.descripcion === 'string' ? config.descripcion.trim() : '';
  if (propia) return propia.slice(0, 300);
  // La descripción bajo el título dice de qué va la página mejor que su
  // primer párrafo. Si está escrita es pública.
  const sub = typeof config?.subtitulo === 'string' ? config.subtitulo.trim() : '';
  if (sub) return sub.slice(0, 300);
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

/**
 * Una página publicada tal como la pinta el navegador: lo que contesta
 * `/api/sitio/pagina/:id`, o `null` si no se puede ver. Suelta (2026-10-01)
 * porque el HTML de la visita la deja escrita dentro (`precargado.ts`).
 */
async function paginaPublica(db: any, id: string, req?: Request): Promise<any> {
  const w = await datosPagina(db, id);
  if (!w) return null;
  // MIEMBROS (2026-10-05, carril acceso). Sin `req` —el HTML del servidor— se
  // mira como un anónimo: el HTML no lee cookies, nunca lleva lo de miembros.
  const acceso = await accesoMiembro(db, req, w.id);
  const publica = await paginaVisible(db, w.id);
  const porMiembro = !!acceso && acceso.permitido && (acceso.restringida || acceso.esEquipo);
  if (!publica && !porMiembro) {
    // Una página restringida de un sitio con miembros: no es «no existe», es
    // «entra». El muro lleva sólo la marca del sitio, nada de la página.
    if (acceso && acceso.restringida && !acceso.permitido) return { muro: await muroDe(db, acceso) };
    return null;
  }
  const { config, ocultos } = await filtrarBloques(db, w.id, w.config, acceso);
  w.config = config;
  const sitio = await sitioDePagina(db, w.id);
  const pr = await db.execute(sql`
    SELECT p.id, p.title, p.slug, p.publico, u.handle
    FROM bd_filas f
    JOIN knowledge_windows p ON p.kind = 'pagina' AND p.deleted_at IS NULL AND p.archived_at IS NULL
      AND ${bloquesDe('p')} @> jsonb_build_array(jsonb_build_object('tabla_id', f.tabla_id))
    JOIN users u ON u.id = p.creator_user_id
    WHERE f.pagina_id = ${w.id} AND f.deleted_at IS NULL
    ORDER BY p.publico DESC, p.created_at LIMIT 1
  `);
  let p = pr.rows[0] as any;
  if (!p) {
    const sr = await db.execute(sql`
      SELECT p.id, p.title, p.slug, p.publico, u.handle FROM knowledge_windows p
      JOIN users u ON u.id = p.creator_user_id
      WHERE p.kind = 'pagina' AND p.deleted_at IS NULL AND p.archived_at IS NULL
        AND ${bloquesDe('p')} @> jsonb_build_array(jsonb_build_object('tipo', 'subpagina', 'entityId', ${w.id}::text))
      ORDER BY p.publico DESC, p.created_at LIMIT 1
    `);
    p = sr.rows[0] as any;
  }
  return {
    id: w.id, titulo: w.title, config: w.config,
    // Una subpágina que no se publicó por su cuenta se indexa si su madre
    // se indexa: lo decide quien publicó el sitio.
    indexable: w.publico ? !!w.indexable : true,
    created_at: w.created_at, updated_at: w.updated_at,
    autor: { handle: w.handle, nombre: w.display_name || w.name, avatar: w.avatar_url },
    padre: p ? { id: p.id, titulo: p.title, slug: p.publico ? p.slug : null, handle: p.handle } : null,
    sitio,
    // El sitio con miembros al que pertenece, para la barra de «Entrar» y
    // para que el navegador vuelva a pedirla con su sesión si viene del HTML.
    miembros: acceso ? { raiz: acceso.sitio.raiz, ocultos } : null,
  };
}

/** Lo que `vite.config.ts` dejó dicho que necesita la web de un dominio
 *  propio, para anunciarlo con `modulepreload`. Se lee una vez. */
let precargaDominio: string[] | null = null;
function trozosDominio(): string[] {
  if (precargaDominio === null) {
    try {
      precargaDominio = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'dist', 'precarga.json'), 'utf8')).dominio || [];
    } catch { precargaDominio = []; }
  }
  return precargaDominio!;
}

/** JSON que se puede meter en un `<script>` sin que un `</script>` escrito en
 *  una página lo cierre antes de tiempo. */
const jsonEnScript = (x: unknown) => JSON.stringify(x)
  .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// ── LAS RUTAS ───────────────────────────────────────────────────────────────

export function registrarSitios(app: Express, db: any) {
  /** La página propia de una base de datos: `/bd/:tabla`. */
  app.get('/api/sitio/bd/:id', async (req: Request, res: Response) => {
    try {
      const p = await baseDatosPublica(db, req.params.id, req);
      if (!p) return res.status(404).json({ error: 'Esa base de datos no existe o no está publicada.' });
      res.set('Cache-Control', 'private, no-store');
      res.json(p);
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /**
   * Una subpágina de un sitio publicado — `/p/:id` en cualquier forma de
   * sitio. Devuelve lo mismo que el resolvedor de páginas publicadas, más su
   * página madre para poder volver sin salir del sitio.
   */
  app.get('/api/sitio/pagina/:id', async (req: Request, res: Response) => {
    try {
      const p = await paginaPublica(db, req.params.id, req);
      if (!p) return res.status(404).json({ error: 'Esa página no existe o no está publicada.' });
      // Lo que depende de la sesión no se guarda en ninguna caché compartida.
      res.set('Cache-Control', 'private, no-store');
      if (p.muro) return res.status(p.muro.motivo === 'entrar' ? 401 : 403).json({ error: 'Esta página es solo para miembros.', muro: p.muro });
      res.json(p);
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
            SELECT h.hijo, b.n + 1 FROM baja b
            JOIN knowledge_windows w ON w.id = b.id
            CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
            CROSS JOIN LATERAL (
              SELECT f.pagina_id AS hijo FROM bd_filas f
              WHERE blq->>'tipo' = 'basedatos' AND f.tabla_id = blq->>'tabla_id'
                AND f.deleted_at IS NULL AND f.pagina_id IS NOT NULL
              UNION ALL
              SELECT blq->>'entityId' WHERE blq->>'tipo' = 'subpagina' AND blq->>'entityId' IS NOT NULL
            ) h
            WHERE b.n < ${PROFUNDIDAD}
          )
          SELECT w.id, w.updated_at FROM baja b JOIN knowledge_windows w ON w.id = b.id
          WHERE b.n > 0 AND w.deleted_at IS NULL AND w.archived_at IS NULL
        `);
        for (const x of r.rows as any[]) urls.push({ loc: `https://${s.host}/p/${x.id}`, mod: fecha(x.updated_at) });
        // Y la página propia de cada base de datos que enseñan.
        const ids = [raiz, ...(r.rows as any[]).map(x => x.id)];
        const bd = await db.execute(sql`
          SELECT DISTINCT t.id, t.titulo, t.updated_at FROM knowledge_windows w
          CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
          JOIN bd_tablas t ON t.id = blq->>'tabla_id' AND t.deleted_at IS NULL AND t.archived_at IS NULL
          WHERE w.id = ANY(string_to_array(${ids.join(',')}, ',')) AND blq->>'tipo' = 'basedatos'
        `);
        for (const t of bd.rows as any[]) {
          const n = slugDe(t.titulo);
          urls.push({ loc: `https://${s.host}/bd/${t.id}${n ? `/${n}` : ''}`, mod: fecha(t.updated_at) });
        }
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
      const s = sitioDe(req);
      const w = await paginaDeLaDireccion(req);
      // En un dominio propio se reescribe SIEMPRE, haya página o no: aunque
      // apunte a un espacio entero, lo que el navegador va a preguntar ya se
      // sabe aquí (ver más abajo).
      if (!w && s.forma !== 'dominio') return next();
      if (plantilla === null) plantilla = fs.existsSync(indice) ? fs.readFileSync(indice, 'utf8') : '';
      if (!plantilla) return next();
      if (!w) return res.type('html').set('Cache-Control', 'no-cache').send(await rapido(plantilla, req, s, null));

      const propio = s.forma !== 'casa';
      const titulo = String(w.title || '').trim() || 'Sin título';
      // Sin los bloques de miembros: el HTML lo lee cualquiera (y Google).
      w.config = (await filtrarBloques(db, w.id, w.config, null)).config;
      const desc = descripcionDe(w.config);
      const img = imagenDe(w.config);
      const abs = (u: string) => /^https?:/.test(u) ? u : `https://${s.host}${u.startsWith('/') ? '' : '/'}${u}`;
      // La de una base de datos lleva su nombre en la dirección, venga como venga la visita.
      const arroba = /^\/(@[^/]+)\//.exec(req.path)?.[1];
      const url = w.virtual
        ? `https://${s.host}${arroba ? `/${arroba}` : ''}/bd/${String(w.id).slice(3)}${slugDe(titulo) ? `/${slugDe(titulo)}` : ''}`
        : `https://${s.host}${req.path}`;
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
      html = await rapido(html, req, s, w);
      res.type('html').set('Cache-Control', 'no-cache').send(html);
    } catch (e) {
      console.error('sitios: vista previa', e);
      next();
    }
  });

  /**
   * QUE EL TÍTULO SALGA EN MENOS DE UN SEGUNDO (2026-10-01).
   *
   * Eugenio: «el dominio propio tarda muchísimo en mostrar la primera imagen
   * o el primer título». Medido en luzhumanidad.com: 2,5 s, y no por el DNS
   * ni por la conexión (0,25 s hasta el HTML), sino por CINCO viajes en fila
   * que el navegador hacía después: la plataforma entera, «¿a qué apunta este
   * dominio?», la pantalla, «dame la página» y por fin la imagen.
   *
   * Aquí, que todo eso ya se sabe, se escribe dentro del HTML:
   *
   *   1. Las respuestas (`window.__SITIO__`, que lee `utils/precargado.ts`):
   *      el navegador no vuelve a preguntar.
   *   2. La cabecera ya dibujada dentro de `#root`: título e imagen se pintan
   *      con el HTML, antes de que llegue ningún JavaScript.
   *   3. Los trozos de JavaScript de la web del dominio, anunciados para que
   *      bajen todos a la vez; y fuera los de la plataforma, que aquí no se
   *      usan.
   */
  async function rapido(html: string, req: Request, s: Sitio, w: any | null): Promise<string> {
    const esSub = /^\/p\/[^/]+\/?$/.test(req.path) || /\/@[^/]+\/p\/[^/]+\/?$/.test(req.path);
    if (s.forma !== 'dominio' && !esSub) return html;

    // Las dos preguntas a la vez: cada una es un viaje a la base de datos y
    // el HTML no sale hasta que acaban.
    const [resuelto, publica] = await Promise.all([
      s.forma === 'dominio' ? resolverDominio(db, s.host) : null,
      w ? paginaPublica(db, w.id) : null,
    ]);
    const pre: { resolver?: any; paginas?: Record<string, any> } = {};
    if (resuelto) pre.resolver = { host: s.host, ...resuelto };

    // La página sólo se manda si es la que se va a pintar: la del dominio
    // (cuando apunta a una página) o la subpágina de la dirección.
    const pinta = esSub || (resuelto?.status === 200 && resuelto.body?.tipo !== 'espacio' && resuelto.body?.id === publica?.id);
    const pagina = pinta ? publica : null;
    if (pagina) pre.paginas = { [pagina.id]: pagina };

    // La cabecera, sólo en un dominio propio: en la plataforma la página va
    // dentro de su armazón, y pintarla suelta daría un salto al arrancar.
    let cabecera = '';
    if (pagina && s.forma === 'dominio') {
      try { cabecera = cabeceraEnHtml(pagina, String(req.headers['user-agent'] || ''), resuelto?.body?.id); }
      catch (e) { console.error('sitios: cabecera', e); }
    }

    if (s.forma === 'dominio') {
      html = html.replace(/\s*<link[^>]*data-app="casa"[^>]*>/g, '');
      const trozos = trozosDominio().map(f => `<link rel="modulepreload" crossorigin href="${f}">`).join('\n    ');
      if (trozos) html = html.replace('</head>', `    ${trozos}\n  </head>`);
    }
    return html
      .replace('</head>', `    <script>window.__SITIO__=${jsonEnScript(pre)}</script>\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root">${cabecera}</div>`);
  }

  /** Qué página publicada hay en esta dirección, si hay alguna. */
  async function paginaDeLaDireccion(req: Request): Promise<any | null> {
    const s = sitioDe(req);
    const tramos = req.path.split('/').filter(Boolean).map(decodeURIComponent);

    // `/bd/:tabla[/:nombre]`, en todas las formas (y `/@quien/bd/…` en casa).
    const sinArroba = s.forma === 'casa' && tramos[0]?.startsWith('@') ? tramos.slice(1) : tramos;
    if (sinArroba[0] === 'bd' && (sinArroba.length === 2 || sinArroba.length === 3)) {
      const b = await baseDatosPublica(db, sinArroba[1]);
      return b ? { ...b, publico: false } : null;
    }

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
