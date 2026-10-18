// ============================================================================
// SITIOS PUBLICADOS (2026-09-30)
// ============================================================================
// Eugenio: «que Wiki Creator sea como un constructor de páginas web que
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
//      «Wiki Creator» con nuestro logo. Aquí se escriben dentro del HTML antes
//      de mandarlo.
//
//   3. SITEMAP Y ROBOTS POR DOMINIO. Un sitio con dominio propio necesita que
//      Google encuentre sus páginas bajo SU dominio.
import type { Express, Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { resolverDominio, esSubdominioDeSitio } from './dominios';
import { cabeceraEnHtml } from './cabeceraSitio';
import { cuerpoEnHtml, esc as escHtml, enLinea } from './htmlBloques';
import { ampliar, type MetaPagina } from './ampliarPagina';
import { asegurarRutas, asegurarRutaDePagina, TRAMOS_RESERVADOS } from './rutasFila';
import { sitioConAnfitrion, sitioEnCasa } from '../components/sitio/ContextoSitio';
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
      -- Ni desde la página de una entrada oculta (migración 0154): «que no se
      -- vea cuando esté publicada». Quien edita la tabla la sigue viendo por
      -- su rol (laVeQuienPregunta), que no pasa por aquí.
      AND NOT EXISTS (SELECT 1 FROM bd_filas fo WHERE fo.pagina_id = s.id AND fo.oculta AND fo.deleted_at IS NULL)
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

/**
 * ¿Cuelga esta página de esa otra (o es ella)? Se sube por el mismo camino
 * que la visibilidad y la canónica (`canonicaDe`): si su canónica está en el
 * dominio de esa raíz, aquí sale que sí.
 */
export async function cuelgaDe(db: any, id: string, raizId: string): Promise<boolean> {
  if (id === raizId) return true;
  const r = await db.execute(sql`
    WITH RECURSIVE sube(id, n) AS (
      SELECT ${id}::text, 0
      UNION
      SELECT madre.id, s.n + 1 FROM sube s
      CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) madre
      WHERE s.n < ${PROFUNDIDAD}
    )
    SELECT EXISTS (SELECT 1 FROM sube WHERE id = ${raizId}) AS si
  `);
  return !!(r.rows[0] as any)?.si;
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

export function sitioDe(req: Request): Sitio {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (host === DOMINIO || host === 'localhost' || /^[0-9.]+$/.test(host) || !host) return { forma: 'casa', host };
  if (host.endsWith('.' + DOMINIO) || host.endsWith('.localhost')) {
    const primero = host.split('.')[0];
    if (!primero || RESERVADOS.has(primero)) return { forma: 'casa', host };
    // UN SUBDOMINIO DE SITIO (2026-10-18, `dominios.ts`): se porta como un
    // dominio propio. En desarrollo, `algo.localhost` hace de `algo.humanity.wiki`.
    const comoSitio = host.endsWith('.localhost') ? `${primero}.${DOMINIO}` : host;
    if (esSubdominioDeSitio(comoSitio)) return { forma: 'dominio', host: comoSitio };
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
      WHERE f.tabla_id = ${tablaId} AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.oculta = false
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
  const out: any = {
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
  // Los módulos que amplían la página (la plantilla de ficha, W1).
  await ampliar(db, req, out);
  return out;
}

/**
 * LA DIRECCIÓN CANÓNICA DE UNA PÁGINA (2026-10-18, SEO R3): la de su dominio
 * propio si su sitio tiene uno activo; si no, la de su subdominio
 * (`quien.humanity.wiki/…`), que es la que se comparte. `null` si no se puede
 * saber (y entonces manda la dirección de la visita, como antes).
 */
async function canonicaDe(db: any, w: any, publica: any): Promise<string | null> {
  const handle = w?.handle || publica?.autor?.handle;
  if (!handle || !publica || publica.muro) return null;
  // El dominio de la página o el de la más cercana por encima (la portada
  // del sitio), subiendo por el mismo camino que la visibilidad; o el que
  // apunta al espacio entero de su dueña.
  const desde = w.virtual ? publica.padre?.id : w.id;
  const ruta = (deRaiz: boolean) => w.virtual
    ? `/bd/${String(w.id).slice(3)}${slugDe(w.title) ? `/${slugDe(w.title)}` : ''}`
    : deRaiz ? '/' : w.slug && (w.publico || String(w.slug).includes('/')) ? `/${w.slug}` : `/p/${w.id}`;
  const d = (await db.execute(sql`
    WITH RECURSIVE sube(id, n) AS (
      SELECT ${desde || ''}::text, 0
      UNION
      SELECT madre.id, s.n + 1 FROM sube s
      CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) madre
      WHERE s.n < ${PROFUNDIDAD}
    )
    SELECT d.dominio, d.pagina_id FROM dominios_paginas d JOIN users u ON u.id = d.propietario_user_id
    LEFT JOIN sube s ON s.id = d.pagina_id
    WHERE u.handle = ${handle} AND d.estado = 'activo' AND (d.pagina_id IS NULL OR s.id IS NOT NULL)
    -- Un dominio comprado gana a un subdominio de humanity.wiki: es el definitivo.
    ORDER BY (d.dominio LIKE ${'%.' + DOMINIO}), (d.pagina_id IS NULL), s.n LIMIT 1
  `)).rows[0] as any;
  if (d?.pagina_id) return `https://${d.dominio}${ruta(!w.virtual && w.id === d.pagina_id)}`;
  if (d) return `https://${d.dominio}${ruta(false)}`;
  return `https://${handle}.${DOMINIO}${ruta(false)}`;
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

/** Una dirección del sitemap. `t`: cuándo cambió por última vez. */
export type UrlSitio = { loc: string; mod: string; t?: number; img?: string | null };
let urlsDeAnfitrion: ((host: string) => Promise<UrlSitio[] | null>) | null = null;
/** Las direcciones del sitio de un anfitrión, las mismas del sitemap. Para
 *  IndexNow (`indexNow.ts`), que no tiene petición de la que sacarlo. */
export const urlsDelAnfitrion = (host: string) => urlsDeAnfitrion ? urlsDeAnfitrion(host) : Promise.resolve(null);

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

  // ── LA DIRECCIÓN LEGIBLE DE UNA FICHA, PARA EL NAVEGADOR (SEO R2) ──────────
  // `GET /api/sitio/ruta?camino=/powerbanks/anker-737`: qué página es, en el
  // sitio por el que se pregunta (el anfitrión de la petición). Lo usa
  // `RutaSitio.tsx` cuando la respuesta no vino ya en el HTML.
  app.get('/api/sitio/ruta', async (req: Request, res: Response) => {
    try {
      const camino = String(req.query.camino || '');
      if (!camino.startsWith('/')) return res.status(400).json({ error: 'Falta la dirección.' });
      const t = camino.split('/').filter(Boolean);
      const sinArroba = t[0]?.startsWith('@') ? t.slice(1) : t;
      // Un tramo: una página del sitio por su nombre corto, sólo en un dominio propio.
      const uno = sinArroba.length === 1 && t.length === 1 && sitioDe(req).forma === 'dominio';
      if (!uno && (sinArroba.length < 2 || sinArroba.length > 3)) return res.status(404).json({ error: 'Esa página no existe o no está publicada.' });
      const w = await paginaDeLaDireccion(req, camino);
      if (w?.redirigir) return res.json({ redirigir: w.redirigir });
      if (!w?.porRuta) return res.status(404).json({ error: 'Esa página no existe o no está publicada.' });
      res.json({ id: w.id });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  // ── 3. ROBOTS Y SITEMAP DE CADA SITIO ─────────────────────────────────────
  // Sólo en dominios propios y subdominios. En la casa común no se toca nada:
  // esa decisión es de la plataforma, no de este módulo.

  app.get('/robots.txt', async (req: Request, res: Response, next: NextFunction) => {
    const s = sitioDe(req);
    if (s.forma === 'casa') return next();
    // LOS BUSCADORES DE IA, CON NOMBRE (2026-10-18, SEO R6). `User-agent: *`
    // ya los deja pasar, pero varios leen sólo su propio grupo, y decirlo
    // explícito deja escrito que este sitio QUIERE que lo lean y lo citen.
    // Lo que no se indexa: los resultados del buscador del sitio y las
    // ordenaciones de una galería (la misma lista mil veces).
    const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];
    const reglas = 'Allow: /\nDisallow: /buscar\nDisallow: /*?*orden=\n';
    res.type('txt').send(
      `User-agent: *\n${reglas}\n` +
      bots.map(b => `User-agent: ${b}\n${reglas}`).join('\n') +
      `\nSitemap: https://${s.host}/sitemap.xml\n`,
    );
  });

  /**
   * `/llms.txt` (2026-10-18, SEO R6): qué es este sitio y sus páginas
   * principales, en Markdown, para los asistentes de IA. Es una convención
   * nueva y barata; no sustituye al HTML del servidor (R1), lo acompaña.
   */
  app.get('/llms.txt', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const s = sitioDe(req);
      if (s.forma === 'casa') return next();
      const lineas: string[] = [];
      const linea = (titulo: string, url: string, desc?: string) =>
        lineas.push(`- [${titulo.replace(/[\[\]]/g, '')}](${url})${desc ? `: ${desc.replace(/\s+/g, ' ').slice(0, 200)}` : ''}`);
      let nombre = s.host, resumen = '';
      // Las bases de datos que la página enseña a cualquiera: sin las de los
      // bloques de miembros, que un anónimo no ve.
      const conTablas = async (w: any, base: string) => {
        const { config } = await filtrarBloques(db, w.id, w.config, null);
        const ids = new Set<string>();
        const recorre = (l: any[]) => { for (const b of Array.isArray(l) ? l : []) {
          if (b?.tipo === 'basedatos' && b.tabla_id) ids.add(String(b.tabla_id));
          recorre(b?.bloques);
        } };
        recorre(config?.bloques);
        if (!ids.size) return;
        const bd = await db.execute(sql`
          SELECT id, titulo, descripcion FROM bd_tablas
          WHERE id = ANY(string_to_array(${[...ids].join(',')}, ',')) AND deleted_at IS NULL AND archived_at IS NULL
        `);
        for (const t of bd.rows as any[]) {
          const n = slugDe(t.titulo);
          linea(String(t.titulo || 'Base de datos'), `${base}/bd/${t.id}${n ? `/${n}` : ''}`, t.descripcion || '');
        }
      };
      const base = `https://${s.host}`;
      const d = s.forma === 'dominio' ? await dominioApunta(db, s.host) : null;
      if (s.forma === 'dominio' && !d) return res.status(404).type('txt').send('No existe ese fichero.');
      if (d?.entidad_id && d.entidad_tipo === 'pagina') {
        const w = await datosPagina(db, d.entidad_id);
        if (!w?.publico || !w.indexable) return res.status(404).type('txt').send('No existe ese fichero.');
        nombre = String(w.title || s.host); resumen = descripcionDe(w.config);
        linea(nombre, `${base}/`, resumen);
        await conTablas(w, base);
        // Y las demás páginas del sitio, con sus bases de datos: las que
        // cuelgan de la portada por bloques «Página» y las del menú. Antes
        // sólo salían las tablas de la portada, y en un sitio como Wikiproducts
        // (portada → categorías → subcategorías) eso es casi nada.
        const vistas = new Set<string>([w.id]);
        const cola: string[] = [];
        const cortos: string[] = [];
        // Todo lo que enlaza a otra página, esté donde esté: un bloque
        // «Página» (`entityId`), un destino del menú (`{tipo:'pagina', id}`) o
        // un enlace escrito como `/paginas/<id>` (texto, menú de temas…). En
        // producción las categorías de Wikiproducts cuelgan del menú y de
        // bloques de temas, no sólo de bloques «Página».
        const apunta = (x: any, n = 0) => {
          if (n > 12 || !x) return;
          if (typeof x === 'string') {
            for (const m of x.matchAll(/\/paginas\/([A-Za-z0-9_-]+)/g)) cola.push(m[1]);
            return;
          }
          if (typeof x !== 'object') return;
          if (Array.isArray(x)) { for (const y of x) apunta(y, n + 1); return; }
          if (x.tipo === 'pagina' && typeof x.id === 'string') cola.push(x.id);
          if (x.tipo === 'subpagina' && typeof x.entityId === 'string') cola.push(x.entityId);
          // Un destino del menú escrito como dirección del propio sitio
          // (`{tipo:'url', url:'/energia-portatil'}`): su nombre corto.
          if (x.tipo === 'url' && typeof x.url === 'string' && /^\/[a-z0-9-]+\/?$/.test(x.url)) cortos.push(x.url.replace(/\//g, ''));
          for (const v of Object.values(x)) apunta(v, n + 1);
        };
        apunta(w.config?.sitio?.menu);
        const hijas = async (pw: any) => {
          const { config } = await filtrarBloques(db, pw.id, pw.config, null);
          apunta(config?.bloques);
        };
        await hijas(w);
        // Los nombres cortos, a páginas de la dueña (una consulta).
        const deCortos = async () => {
          if (!cortos.length) return;
          const r = await db.execute(sql`
            SELECT w.id FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
            WHERE u.handle = ${d.handle} AND w.publico = true AND w.kind = 'pagina'
              AND w.slug = ANY(string_to_array(${cortos.splice(0).join(',')}, ','))
              AND w.deleted_at IS NULL AND w.archived_at IS NULL
          `);
          for (const x of r.rows as any[]) cola.push(String(x.id));
        };
        await deCortos();
        while (cola.length && vistas.size < 200) {
          const id = cola.shift()!;
          if (vistas.has(id)) continue;
          vistas.add(id);
          const pw = await datosPagina(db, id);
          // Sólo páginas de la dueña del sitio: un enlace a la página de otra
          // persona no la hace parte de este sitio.
          if (!pw || pw.handle !== d.handle || !(await paginaVisible(db, pw.id))) continue;
          // Las de miembros no: no se anuncian en ningún sitio (ver el sitemap).
          const rs = await db.execute(sql`SELECT 1 FROM sitio_restricciones WHERE pagina_id = ${pw.id} AND bloque_id = '' LIMIT 1`);
          if (rs.rows.length) continue;
          const corto = pw.publico && pw.slug && !String(pw.slug).includes('/') && pw.handle === d.handle
            && !TRAMOS_RESERVADOS.has(String(pw.slug)) && await cuelgaDe(db, pw.id, w.id);
          const camino = corto ? encodeURIComponent(pw.slug)
            : pw.slug && String(pw.slug).includes('/') ? String(pw.slug).split('/').map(encodeURIComponent).join('/')
            : `p/${pw.id}`;
          linea(String(pw.title || 'Página'), `${base}/${camino}`, descripcionDe(pw.config));
          await conTablas(pw, base);
          await hijas(pw);
          await deCortos();
        }
      } else {
        const handle = d ? d.handle : (s as any).handle;
        const r = await db.execute(sql`
          SELECT w.id, w.slug, w.title, w.config FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
          WHERE u.handle = ${handle} AND w.kind = 'pagina' AND w.publico = true AND w.indexable = true
            AND w.slug IS NOT NULL AND w.deleted_at IS NULL AND w.archived_at IS NULL
          ORDER BY w.created_at LIMIT 200
        `);
        for (const w of r.rows as any[]) {
          linea(String(w.title || w.slug), `${base}/${w.slug}`, descripcionDe(w.config));
          await conTablas(w, base);
        }
      }
      // Cinco minutos y no una hora (2026-10-18): tras un despliegue o un cambio
      // en el sitio, una hora de copia en el navegador (o en Cloudflare) hizo
      // creer que el arreglo de esta lista no había llegado.
      res.type('text/markdown').set('Cache-Control', 'public, max-age=300').send(
        `# ${nombre}\n\n${resumen ? `> ${resumen.replace(/\s+/g, ' ')}\n\n` : ''}` +
        `## Páginas\n\n${lineas.join('\n') || '- (todavía no hay páginas públicas)'}\n\n` +
        `Todas las direcciones: ${base}/sitemap.xml\n`,
      );
    } catch (e: any) { console.error(e); res.status(500).type('txt').send('No se pudo generar.'); }
  });

  // EL SITEMAP (SEO R11, R12). La fecha de cada dirección es la de su último
  // cambio real (la de la fila si se cambió un dato, no la de hoy), lleva su
  // imagen de portada, y pasadas las 50.000 direcciones se parte en trozos
  // (`/sitemap-1.xml`…) con un índice en `/sitemap.xml`, que es el límite de
  // Google por fichero.
  const POR_TROZO = 50_000;
  /** Las direcciones del sitio de ese anfitrión; `null` si no es un sitio.
   *  `t`: el momento del último cambio, para IndexNow (`indexNow.ts`). */
  async function urlsDelSitio(s: Sitio): Promise<UrlSitio[] | null> {
    if (s.forma === 'casa') return null;
    const urls: UrlSitio[] = [];
    const fecha = (d: any) => new Date(d).toISOString().slice(0, 10);
    const abs = (u: string | null | undefined) => !u ? null
      : /^https?:\/\//.test(u) ? u : u.startsWith('/') && !u.startsWith('//') ? `https://${s.host}${u}` : null;

    /** De quién es el sitio: una página suya publicada con nombre corto se
     *  anuncia por él (`/powerbanks`), que es su canónica (`canonicaDe`). */
    let duenyo = s.forma === 'subdominio' ? s.handle : '';
    /** Las subpáginas de una página, recursivamente. Devuelve la fecha más
     *  reciente de todas, que es la de la página que las enseña. */
    const subpaginas = async (raiz: string): Promise<number> => {
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
              AND f.deleted_at IS NULL AND f.archived_at IS NULL AND f.pagina_id IS NOT NULL AND f.oculta = false
            UNION ALL
            SELECT blq->>'entityId' WHERE blq->>'tipo' = 'subpagina' AND blq->>'entityId' IS NOT NULL
          ) h
          WHERE b.n < ${PROFUNDIDAD}
            -- Lo que es sólo de miembros no se anuncia (como el buscador del sitio).
            AND NOT EXISTS (
              SELECT 1 FROM sitio_restricciones rs
              WHERE rs.pagina_id = w.id AND (rs.bloque_id = '' OR rs.bloque_id = blq->>'id')
            )
        )
        SELECT DISTINCT ON (w.id) w.id, w.config->>'portada' AS portada,
          GREATEST(w.updated_at, f.updated_at) AS cambio, (f.id IS NOT NULL) AS es_fila
        FROM baja b JOIN knowledge_windows w ON w.id = b.id
        LEFT JOIN bd_filas f ON f.pagina_id = w.id AND f.deleted_at IS NULL
        WHERE b.n > 0 AND w.deleted_at IS NULL AND w.archived_at IS NULL
        ORDER BY w.id
      `);
      // La página propia de cada base de datos que enseñan.
      const ids = [raiz, ...(r.rows as any[]).map(x => x.id)];
      const bd = await db.execute(sql`
        SELECT DISTINCT t.id, t.titulo, t.updated_at, (t.config->>'ruta') IS NOT NULL AS con_ruta FROM knowledge_windows w
        CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
        JOIN bd_tablas t ON t.id = blq->>'tabla_id' AND t.deleted_at IS NULL AND t.archived_at IS NULL
        WHERE w.id = ANY(string_to_array(${ids.join(',')}, ',')) AND blq->>'tipo' = 'basedatos'
      `);
      // Las fichas, con su dirección legible si su tabla tiene plantilla
      // (SEO R2, `rutasFila.ts`): se pone al día aquí, que es lo que lee Google.
      for (const t of bd.rows as any[]) await asegurarRutas(db, t.id).catch(e => console.error('sitemap: rutas', e));
      const slugs = new Map<string, string>();
      if (r.rows.length) {
        const q = await db.execute(sql`
          SELECT w.id, w.slug FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
          WHERE w.id = ANY(string_to_array(${(r.rows as any[]).map(x => x.id).join(',')}, ','))
            AND (w.slug LIKE '%/%' OR (w.publico AND w.slug <> '' AND u.handle = ${duenyo}
              AND NOT (w.slug = ANY(string_to_array(${[...TRAMOS_RESERVADOS].join(',')}, ',')))))
        `);
        for (const x of q.rows as any[]) slugs.set(x.id, x.slug);
      }
      // UN SITIO QUE YA USA DIRECCIONES LEGIBLES (alguna de sus tablas tiene
      // plantilla, `rutasFila.ts`) anuncia sólo lo que tiene dirección propia:
      // sus páginas y las fichas con dirección legible. Las demás filas (una
      // oferta, una fila de una tabla auxiliar) siguen abriéndose por `/p/…`,
      // pero no se le ofrecen a Google como páginas; y la página propia de cada
      // tabla (`/bd/…`) tampoco, porque repite la página del sitio que la
      // enseña. Un sitio sin plantillas sigue como antes (2026-10-18).
      const conRutas = (bd.rows as any[]).some(t => t.con_ruta);
      let ultimo = 0;
      for (const x of r.rows as any[]) {
        const ruta = slugs.get(x.id);
        ultimo = Math.max(ultimo, new Date(x.cambio).getTime());
        if (conRutas && x.es_fila && !(ruta && ruta.includes('/'))) continue;
        urls.push({ loc: `https://${s.host}/${ruta || `p/${x.id}`}`, mod: fecha(x.cambio), t: new Date(x.cambio).getTime(), img: abs(x.portada) });
      }
      if (!conRutas) for (const t of bd.rows as any[]) {
        const n = slugDe(t.titulo);
        ultimo = Math.max(ultimo, new Date(t.updated_at).getTime());
        urls.push({ loc: `https://${s.host}/bd/${t.id}${n ? `/${n}` : ''}`, mod: fecha(t.updated_at), t: new Date(t.updated_at).getTime() });
      }
      return ultimo;
    };

    if (s.forma === 'dominio') {
      const d = await dominioApunta(db, s.host);
      if (!d) return null;
      duenyo = d.handle;
      if (d.entidad_id && d.entidad_tipo === 'pagina') {
        const w = await datosPagina(db, d.entidad_id);
        if (w?.publico && w.indexable) {
          const portada: UrlSitio = { loc: `https://${s.host}/`, mod: '', img: abs(w.config?.portada) };
          urls.push(portada);
          portada.t = Math.max(new Date(w.updated_at).getTime(), await subpaginas(w.id));
          portada.mod = fecha(portada.t);
        }
      } else if (!d.entidad_id) {
        await paginasDeEspacio(d.handle);
      }
    } else {
      await paginasDeEspacio(s.handle);
    }

    async function paginasDeEspacio(handle: string) {
      const r = await db.execute(sql`
        SELECT w.id, w.slug, w.updated_at, w.config->>'portada' AS portada FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
        WHERE u.handle = ${handle} AND w.kind = 'pagina' AND w.publico = true AND w.indexable = true
          AND w.slug IS NOT NULL AND w.deleted_at IS NULL AND w.archived_at IS NULL
      `);
      // La portada del espacio cambia cuando cambia algo de lo que enseña, no cada día.
      const inicio: UrlSitio = { loc: `https://${s.host}/`, mod: '' };
      urls.push(inicio);
      let ultimo = 0;
      for (const x of r.rows as any[]) {
        const pagina: UrlSitio = { loc: `https://${s.host}/${x.slug}`, mod: '', img: abs(x.portada) };
        urls.push(pagina);
        const t = Math.max(new Date(x.updated_at).getTime(), await subpaginas(x.id));
        pagina.mod = fecha(t);
        pagina.t = t;
        ultimo = Math.max(ultimo, t);
      }
      inicio.mod = fecha(ultimo || Date.now());
      inicio.t = ultimo || undefined;
    }
    // Una página del espacio que además cuelga de otra sale dos veces con la
    // misma dirección: una basta.
    const vistas = new Set<string>();
    return urls.filter(u => !vistas.has(u.loc) && !!vistas.add(u.loc));
  }
  urlsDeAnfitrion = (host: string) => urlsDelSitio(sitioDe({ headers: { host } } as any));

  const escXml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const urlset = (urls: UrlSitio[]) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    urls.map(u => `  <url><loc>${escXml(u.loc)}</loc><lastmod>${u.mod}</lastmod>` +
      (u.img ? `<image:image><image:loc>${escXml(u.img)}</image:loc></image:image>` : '') + `</url>`).join('\n') +
    `\n</urlset>\n`;

  app.get(/^\/sitemap(?:-(\d+))?\.xml$/, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (sitioDe(req).forma === 'casa') return next();
      const urls = await urlsDelSitio(sitioDe(req));
      if (!urls) return res.status(404).type('txt').send('No existe ese fichero.');
      const trozos = Math.max(1, Math.ceil(urls.length / POR_TROZO));
      const n = req.params[0] ? Number(req.params[0]) : 0;
      res.type('application/xml');
      if (!n && trozos === 1) return res.send(urlset(urls));
      if (!n) {
        const host = sitioDe(req).host;
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          Array.from({ length: trozos }, (_, i) => `  <sitemap><loc>https://${escXml(host)}/sitemap-${i + 1}.xml</loc></sitemap>`).join('\n') +
          `\n</sitemapindex>\n`);
      }
      if (n > trozos) return res.status(404).type('txt').send('No existe ese fichero.');
      res.send(urlset(urls.slice((n - 1) * POR_TROZO, n * POR_TROZO)));
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
      let w = await paginaDeLaDireccion(req);
      // UNA DIRECCIÓN QUE CAMBIÓ SIGUE LLEVANDO A SU PÁGINA (SEO R2): con un
      // 301, que le dice a Google que traslade lo que sabía de la vieja.
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      if (w?.redirigir) return res.redirect(301, w.redirigir + query);
      // `/p/:id` de una ficha que tiene dirección legible lleva a ella.
      if (w && !w.virtual && /^(\/@[^/]+)?\/p\/[^/]+\/?$/.test(req.path)) {
        await asegurarRutaDePagina(db, w.id).catch(e => console.error('sitios: ruta', e));
        const r = (await db.execute(sql`SELECT slug FROM knowledge_windows WHERE id = ${w.id}`)).rows[0] as any;
        if (r?.slug && String(r.slug).includes('/')) {
          const prefijo = s.forma === 'casa' ? `/@${w.handle}` : '';
          return res.redirect(301, `${prefijo}/${r.slug}${query}`);
        }
        // Y una página publicada con nombre corto, a él: es su canónica
        // (`canonicaDe`), y `/p/:id` sería una segunda dirección del mismo
        // contenido. Sólo donde ese nombre se abre de verdad.
        const corto = w.publico && typeof r?.slug === 'string' && r.slug && !r.slug.includes('/') && !TRAMOS_RESERVADOS.has(r.slug) ? r.slug : null;
        if (corto) {
          let destino: string | null = null;
          if (s.forma === 'casa') destino = `/@${w.handle}/${encodeURIComponent(corto)}`;
          else if (s.forma === 'subdominio') destino = w.handle === s.handle ? `/${encodeURIComponent(corto)}` : null;
          else if (s.forma === 'dominio') {
            const d = await dominioApunta(db, s.host);
            if (d?.entidad_id && d.entidad_tipo === 'pagina') {
              destino = w.id === d.entidad_id ? '/' : (await cuelgaDe(db, w.id, d.entidad_id)) ? `/${encodeURIComponent(corto)}` : null;
            }
          }
          if (destino) return res.redirect(301, `${destino}${query}`);
        }
      }
      // En un dominio propio se reescribe SIEMPRE, haya página o no: aunque
      // apunte a un espacio entero, lo que el navegador va a preguntar ya se
      // sabe aquí (ver más abajo).
      if (!w && s.forma !== 'dominio' && !esDeSitio(req)) return next();
      if (plantilla === null) plantilla = fs.existsSync(indice) ? fs.readFileSync(indice, 'utf8') : '';
      if (!plantilla) return next();
      if (!w) {
        // UN 404 DE VERDAD (2026-10-18, SEO R16). Una dirección con forma de
        // página del sitio que no lleva a ninguna contestaba 200 con la
        // aplicación vacía, y un buscador la guardaba como página (fina). El
        // HTML es el mismo —la aplicación pinta su «no está»—; cambia el
        // código y se le dice al buscador que no la guarde.
        const html = await rapido(plantilla, req, s, null);
        if (!esDeSitio(req)) return res.type('html').set('Cache-Control', 'no-cache').send(html);
        return res.status(404).type('html').set('Cache-Control', 'no-cache')
          .send(html.replace('</head>', '    <meta name="robots" content="noindex">\n  </head>'));
      }

      const propio = s.forma !== 'casa';
      // Sin los bloques de miembros: el HTML lo lee cualquiera (y Google).
      w.config = (await filtrarBloques(db, w.id, w.config, null)).config;
      // La página tal como se pinta, ampliada por los módulos que se apuntan
      // (`ampliarPagina.ts`): la ficha de producto cambia título, tipo y robots.
      const publica = w.virtual ? w : await paginaPublica(db, w.id);
      const m: MetaPagina = (publica && !publica.muro && publica.meta) || {};
      const cfg = (publica && !publica.muro ? publica.config : null) || w.config;
      const titulo = String(m.titulo || w.title || '').trim() || 'Sin título';
      const desc = (typeof m.descripcion === 'string' && m.descripcion.trim()) || descripcionDe(cfg);
      const img = imagenDe(cfg);
      const abs = (u: string) => /^https?:/.test(u) ? u : `https://${s.host}${u.startsWith('/') ? '' : '/'}${u}`;
      // La de una base de datos lleva su nombre en la dirección, venga como venga la visita.
      const arroba = /^\/(@[^/]+)\//.exec(req.path)?.[1];
      const url = w.virtual
        ? `https://${s.host}${arroba ? `/${arroba}` : ''}/bd/${String(w.id).slice(3)}${slugDe(titulo) ? `/${slugDe(titulo)}` : ''}`
        : `https://${s.host}${req.path}`;
      // UNA SOLA DIRECCIÓN POR CONTENIDO (2026-10-18, SEO R3). La misma página
      // se abre por `humanity.wiki/@quien/…`, por `quien.humanity.wiki/…` y por
      // su dominio propio; si cada una se declara canónica a sí misma, Google
      // ve tres copias y reparte la autoridad entre ellas.
      const canonica = (await direccionCanonica(w, publica)) || url;
      const icono = cfg?.icono;
      const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const indexable = w.perdida ? false : m.indexable === false ? false : w.indexable !== false;
      // FILTROS Y ORDENACIONES FUERA DEL ÍNDICE (SEO R8). Cada combinación de
      // `?…` es otra dirección con el mismo contenido: una página basura por
      // cada una. Se siguen sus enlaces, pero no se guarda; la canónica ya
      // apunta a la dirección sin `?`. Las marcas de campaña no cuentan.
      const conFiltros = Object.keys(req.query).some(k => !/^(utm_[a-z]+|gclid|fbclid|msclkid|ref)$/i.test(k));
      // Las direcciones de los datos estructurados, contra la canónica (ver `MetaPagina.jsonLd`).
      const origen = (() => { try { return new URL(canonica).origin; } catch { return `https://${s.host}`; } })();
      // `{{inicio}}`: la canónica de la portada del sitio (las migas de pan de
      // una ficha, W1). Sólo se calcula si alguien la usa.
      let inicio = `${origen}/`;
      if (m.jsonLd && JSON.stringify(m.jsonLd).includes('{{inicio}}') && publica?.sitio?.raizId) {
        const raiz = publica.sitio.raizId === w.id ? w : await datosPagina(db, publica.sitio.raizId);
        if (raiz) inicio = (await direccionCanonica(raiz, { autor: { handle: raiz.handle } })) || inicio;
      }
      const completar = (x: any): any => typeof x === 'string'
        ? (x === '{{canonica}}' ? canonica : x === '{{inicio}}' ? inicio : x.startsWith('/') && !x.startsWith('//') ? origen + x : x)
        : Array.isArray(x) ? x.map(completar)
        : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, completar(v)]))
        : x;
      const ld = (m.jsonLd ? (Array.isArray(m.jsonLd) ? m.jsonLd : [m.jsonLd]) : []).map(completar);

      const meta = [
        `<meta name="description" content="${esc(desc)}">`,
        `<meta property="og:type" content="${esc(m.ogType || 'website')}">`,
        `<meta property="og:title" content="${esc(titulo)}">`,
        desc && `<meta property="og:description" content="${esc(desc)}">`,
        `<meta property="og:url" content="${esc(canonica)}">`,
        img && `<meta property="og:image" content="${esc(abs(img))}">`,
        `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">`,
        `<link rel="canonical" href="${esc(canonica)}">`,
        `<meta name="robots" content="${!indexable ? 'noindex,nofollow' : conFiltros ? 'noindex,follow' : 'index,follow'}">`,
        ...(m.metas || []).filter(x => x && (x.property || x.name)).map(x => x.property
          ? `<meta property="${esc(String(x.property))}" content="${esc(String(x.content ?? ''))}">`
          : `<meta name="${esc(String(x.name))}" content="${esc(String(x.content ?? ''))}">`),
        ...ld.map(x => `<script type="application/ld+json">${jsonEnScript(x)}</script>`),
      ].filter(Boolean).join('\n    ');

      let html = plantilla
        .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(propio ? titulo : `${titulo} · humanity.wiki`)}</title>`)
        .replace('</head>', () => `    ${meta}\n  </head>`);
      // En un sitio propio, el icono de la pestaña es el de la página. Un emoji
      // se convierte en un SVG; una imagen se usa tal cual.
      if (propio && icono) {
        const href = /^(https?:|\/)/.test(icono)
          ? abs(icono)
          : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icono}</text></svg>`)}`;
        html = html.replace(/<link[^>]+rel="icon"[^>]*>/g, '').replace('</head>', () => `    <link rel="icon" href="${esc(href)}">\n  </head>`);
      }
      html = await rapido(html, req, s, w, publica);
      res.status(w.perdida ? 404 : 200).type('html').set('Cache-Control', 'no-cache').send(html);
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
  async function rapido(html: string, req: Request, s: Sitio, w: any | null, yaArmada?: any): Promise<string> {
    const esSub = /^\/p\/[^/]+\/?$/.test(req.path) || /\/@[^/]+\/p\/[^/]+\/?$/.test(req.path) || !!w?.porRuta;
    const precarga = s.forma === 'dominio' || esSub;

    // Las dos preguntas a la vez: cada una es un viaje a la base de datos y
    // el HTML no sale hasta que acaban. La página de una base de datos ya
    // viene armada (`baseDatosPublica`): no hay otra que pedir.
    const [resuelto, publica] = await Promise.all([
      s.forma === 'dominio' ? resolverDominio(db, s.host) : null,
      yaArmada !== undefined ? yaArmada : w ? (w.virtual ? w : paginaPublica(db, w.id)) : null,
    ]);
    const pre: { resolver?: any; paginas?: Record<string, any>; rutas?: Record<string, string>; legibles?: Record<string, string> } = {};
    if (resuelto) pre.resolver = { host: s.host, ...resuelto };

    // La página sólo se manda si es la que se va a pintar: la del dominio
    // (cuando apunta a una página) o la subpágina de la dirección.
    const pinta = esSub || (resuelto?.status === 200 && resuelto.body?.tipo !== 'espacio' && resuelto.body?.id === publica?.id);
    const pagina = pinta ? publica : null;
    if (pagina && !pagina.virtual) pre.paginas = { [pagina.id]: pagina };
    // La dirección legible de una ficha (R2): qué página es, para que el
    // navegador no tenga que preguntarlo (`RutaSitio`).
    if (pagina && w?.porRuta) pre.rutas = { [req.path]: pagina.id };

    // EL CONTENIDO, EN EL HTML (2026-10-18, SEO R1, ver `htmlBloques.ts`).
    // En TODAS las formas de sitio y para toda página que se pueda leer: la
    // portada de un sitio, sus subpáginas y la página de una base de datos.
    // Una página de miembros (`muro`) no lleva nada: no es de cualquiera.
    const legible = publica && !publica.muro ? publica : null;
    const raizDominio = s.forma === 'dominio' ? resuelto?.body?.id : null;
    const enlaces = s.forma === 'casa'
      ? sitioEnCasa(legible?.autor?.handle || String(/^\/@([^/]+)/.exec(req.path)?.[1] || ''))
      // Las mismas direcciones que arma el navegador en cada forma
      // (`AplicacionDeDominio`, `PaginaPublica`, `SubpaginaSitio`).
      : sitioConAnfitrion(s.forma === 'dominio' ? raizDominio || null : null);
    let cuerpo = '';
    if (legible) {
      // Las fichas con dirección legible se enlazan por ella (R2).
      const prefijo = s.forma === 'casa' ? `/@${legible.autor?.handle || String(/^\/@([^/]+)/.exec(req.path)?.[1] || '')}` : '';
      const enlaceRuta = (slug: string) => `${prefijo}/${slug.split('/').map(encodeURIComponent).join('/')}`;
      try { cuerpo = await cuerpoEnHtml(db, legible, enlaces.enlacePagina, enlaceRuta); }
      catch (e) { console.error('sitios: cuerpo', e); }
    }

    // La cabecera, sólo en un dominio propio: en la plataforma la página va
    // dentro de su armazón, y pintarla suelta daría un salto al arrancar.
    let raiz = '';
    if (pagina && s.forma === 'dominio') {
      try {
        raiz = cabeceraEnHtml(pagina, String(req.headers['user-agent'] || ''), resuelto?.body?.id);
        if (cuerpo) raiz = raiz.replace('</article>', `${cuerpo}</article>`);
      } catch (e) { console.error('sitios: cabecera', e); }
    }
    // En las demás formas, el contenido sin adornos: un `<h1>`, la entradilla
    // y los bloques. Lo sustituye la página viva al arrancar React.
    if (!raiz && legible && cuerpo) {
      const titulo = String(legible.titulo || legible.title || '').trim() || 'Sin título';
      const sub = typeof legible.config?.subtitulo === 'string' && legible.config.subtitulo.trim()
        ? `<p>${enLinea(legible.config.subtitulo, enlaces)}</p>` : '';
      raiz = `<main><article><h1>${escHtml(titulo)}</h1>${sub}${cuerpo}</article></main>`;
    }

    // LOS ENLACES A FICHAS, POR SU DIRECCIÓN LEGIBLE (SEO R2/R7). Los bloques
    // y el menú enlazan por id (`/p/:id`), que sólo redirige a la legible: un
    // salto de más para el buscador en cada enlace. Se cambian aquí todos de
    // una vez, y el navegador recibe las mismas en `__SITIO__.legibles` para
    // armar igual los suyos (`rutasLegibles.ts`).
    if (raiz) {
      const ids = [...new Set([...raiz.matchAll(/href="(?:\/@[^/"]+)?\/p\/([^"/?#]+)"/g)].map(m => m[1]))].slice(0, 500);
      if (ids.length) {
        try {
          const r = await db.execute(sql`
            SELECT w.id, w.slug, w.publico, u.handle FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
            WHERE w.id IN (${sql.join(ids.map(i => sql`${i}`), sql`, `)}) AND w.slug IS NOT NULL AND w.slug <> ''
              AND w.deleted_at IS NULL AND w.archived_at IS NULL
          `);
          const legibles: Record<string, string> = {};
          for (const x of r.rows as any[]) {
            const slug = String(x.slug);
            if (slug.includes('/')) { legibles[x.id] = slug; continue; }
            // Una página publicada con nombre corto (`/powerbanks`), donde ese
            // nombre se abre: en su subdominio, o en el dominio del sitio del
            // que cuelga. En la casa común, no: allí manda el arroba.
            if (!x.publico || TRAMOS_RESERVADOS.has(slug) || x.id === raizDominio) continue;
            if (s.forma === 'subdominio' && x.handle === s.handle) legibles[x.id] = slug;
            else if (s.forma === 'dominio' && raizDominio && await cuelgaDe(db, x.id, raizDominio)) legibles[x.id] = slug;
          }
          if (Object.keys(legibles).length) {
            const ruta = (slug: string) => slug.split('/').map(encodeURIComponent).join('/');
            raiz = raiz.replace(/href="(\/@[^/"]+)?\/p\/([^"/?#]+)"/g, (todo, arroba, id) =>
              legibles[id] ? `href="${arroba || ''}/${ruta(legibles[id])}"` : todo);
            pre.legibles = legibles;
          }
        } catch (e) { console.error('sitios: legibles', e); }
      }
    }

    if (s.forma === 'dominio') {
      html = html.replace(/\s*<link[^>]*data-app="casa"[^>]*>/g, '');
      const trozos = trozosDominio().map(f => `<link rel="modulepreload" crossorigin href="${f}">`).join('\n    ');
      if (trozos) html = html.replace('</head>', `    ${trozos}\n  </head>`);
    }
    if (precarga) html = html.replace('</head>', `    <script>window.__SITIO__=${jsonEnScript(pre)}</script>\n  </head>`);
    // Una función de reemplazo y no una cadena: un `$&` escrito en una
    // página no debe interpretarse como patrón de `replace`.
    return raiz ? html.replace('<div id="root"></div>', () => `<div id="root">${raiz}</div>`) : html;
  }

  /**
   * ¿Tiene esta dirección forma de página de un sitio? Si la tiene y no hay
   * página, es un 404. Las de la aplicación que comparten forma (`/pedido`
   * en un subdominio, `App.tsx`) no lo son.
   */
  function esDeSitio(req: Request): boolean {
    const s = sitioDe(req);
    const t = req.path.split('/').filter(Boolean);
    const sinArroba = s.forma === 'casa' && t[0]?.startsWith('@') ? t.slice(1) : t;
    if (s.forma === 'casa' && sinArroba === t) return false;
    if (sinArroba[0] === 'p' && sinArroba.length === 2) return true;
    if (sinArroba[0] === 'bd' && (sinArroba.length === 2 || sinArroba.length === 3)) return true;
    // `buscar` es la página de resultados del buscador del sitio.
    if (sinArroba.length === 1 && sinArroba[0] === 'buscar') return false;
    // Dos o tres tramos: la dirección legible de una ficha (SEO R2).
    const ruta = sinArroba.length >= 2 && sinArroba.length <= 3 && !TRAMOS_RESERVADOS.has(sinArroba[0]);
    if (s.forma === 'subdominio') return (t.length === 1 && t[0] !== 'pedido') || ruta;
    if (s.forma === 'casa') return sinArroba.length === 1 || ruta;
    return false;
  }

  const direccionCanonica = (w: any, publica: any) => canonicaDe(db, w, publica).catch(e => { console.error('sitios: canónica', e); return null; });

  /** Qué página publicada hay en esta dirección, si hay alguna. */
  async function paginaDeLaDireccion(req: Request, camino: string = req.path): Promise<any | null> {
    const s = sitioDe(req);
    let tramos: string[];
    try { tramos = camino.split('/').filter(Boolean).map(decodeURIComponent); } catch { return null; }

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

    /** La dirección que tuvo una página y ya no tiene (`direcciones_anteriores`):
     *  a dónde se fue, para contestar con un 301. */
    const anterior = async (handle: string, slug: string, prefijo: string) => {
      const r = (await db.execute(sql`
        SELECT w.id, w.slug FROM direcciones_anteriores d
        JOIN users u ON u.id = d.duenyo_user_id
        JOIN knowledge_windows w ON w.id = d.pagina_id AND w.deleted_at IS NULL AND w.archived_at IS NULL
        WHERE u.handle = ${handle.toLowerCase()} AND d.slug = ${slug.toLowerCase()}
      `)).rows[0] as any;
      if (!r?.slug || r.slug === slug.toLowerCase() || !(await paginaVisible(db, r.id))) return null;
      return { redirigir: `${prefijo}/${r.slug.split('/').map(encodeURIComponent).join('/')}` };
    };

    /** `categoria/producto`: la dirección legible de una ficha (SEO R2,
     *  `rutasFila.ts`). La ficha no está publicada por sí misma, sino por la
     *  página que enseña su base de datos: se mira con `paginaVisible`. */
    const porRuta = async (handle: string, ruta: string[], prefijo: string) => {
      if (ruta.length < 2 || ruta.length > 3 || TRAMOS_RESERVADOS.has(ruta[0])) return null;
      const slug = ruta.join('/').toLowerCase();
      const r = (await db.execute(sql`
        SELECT w.id FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id
        WHERE u.handle = ${handle.toLowerCase()} AND w.slug = ${slug}
          AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
      `)).rows[0] as any;
      if (!r) return anterior(handle, slug, prefijo);
      const w = await datosPagina(db, r.id);
      if (!w || !(await paginaVisible(db, w.id))) return null;
      return { ...w, indexable: w.publico ? w.indexable : true, porRuta: true };
    };

    if (s.forma === 'dominio') {
      const d = await dominioApunta(db, s.host);
      if (!d) return null;
      if (tramos.length >= 2) {
        const f = await porRuta(d.handle, tramos, '');
        if (f) return f;
      }
      // `dominio.com/powerbanks`: una página del sitio por su nombre corto,
      // que es la dirección canónica que se le da (`canonicaDe`). Sólo las que
      // cuelgan de la página a la que apunta el dominio: otra página pública
      // de la misma dueña no se abre en el dominio de este sitio.
      if (d.entidad_id && d.entidad_tipo === 'pagina' && tramos.length === 1 && tramos[0] !== 'buscar') {
        const p = await porSlug(d.handle, tramos[0]);
        if (p && p.id === d.entidad_id) return { redirigir: '/' };
        if (p && await cuelgaDe(db, p.id, d.entidad_id)) return { ...p, porRuta: true };
        if (!p) {
          const a = await anterior(d.handle, tramos[0], '');
          if (a) return a;
        }
      }
      if (d.entidad_id && d.entidad_tipo === 'pagina') {
        const w = await datosPagina(db, d.entidad_id);
        if (!w?.publico) return null;
        // `lamieldelasierra.com/loquesea` sigue enseñando la miel (decisión de
        // 2026-08-22, `AplicacionDeDominio.tsx`), pero al buscador se le dice
        // la verdad: esa dirección no existe (SEO R16). `/buscar` sí existe.
        const perdida = tramos.length > 0 && !(tramos.length === 1 && tramos[0] === 'buscar');
        return perdida ? { ...w, perdida: true } : w;
      }
      if (!d.entidad_id && tramos.length === 1) return porSlug(d.handle, tramos[0]);
      return null;
    }
    if (s.forma === 'subdominio') {
      if (tramos.length === 1) return (await porSlug(s.handle, tramos[0])) || anterior(s.handle, tramos[0], '');
      return porRuta(s.handle, tramos, '');
    }
    if (tramos.length === 2 && tramos[0].startsWith('@')) {
      const h = tramos[0].slice(1);
      return (await porSlug(h, tramos[1])) || anterior(h, tramos[1], `/@${h}`);
    }
    if (tramos.length >= 3 && tramos[0].startsWith('@')) return porRuta(tramos[0].slice(1), tramos.slice(1), `/@${tramos[0].slice(1)}`);
    return null;
  }
}
