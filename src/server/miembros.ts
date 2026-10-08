import type { Express, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, filaAUsuario } from './auth.js';
import { guardian, anotarFallo, levantarFreno, ipDe, type Regla } from './limites/index.js';
import { madresValidas, rolEnPagina, capacidades, quienDe, PROFUNDIDAD, rango } from './permisos.js';
import { avisar } from './avisos.js';
import { bloquesDe } from './bloquesSql.js';
import { enviarCorreo, hayCorreo } from './correo.js';

// ============================================================================
// MIEMBROS REGISTRADOS EN LOS SITIOS PUBLICADOS, AL ESTILO SOFTR
// (2026-10-05, carril «acceso»)
// ============================================================================
// Eugenio: «lo más importante, y la gran diferencia con Notion». Quien publica
// una página (con su subdominio o su dominio propio) activa «Permitir
// registro». Desde ese momento su web tiene MIEMBROS: gente que se registra o
// entra DENTRO de esa web —con su marca, sin oír hablar de humanity.wiki—, y
// que según su categoría ve unas páginas, secciones o bloques y no otros.
//
// ── LAS PIEZAS ──────────────────────────────────────────────────────────────
//   · `sitio_config`        una fila por página raíz: activo, cómo se entra
//                           (abierto / con aprobación / sólo invitación),
//                           enlace mágico sí o no, categoría por defecto.
//   · `sitio_categorias`    los roles con nombre propio («Socios», «Alumnos»)
//                           y qué puede cada uno: ver, comentar, guardar,
//                           comprar, editar, todo.
//   · `sitio_miembros`      quién es miembro de qué sitio, en qué categoría y
//                           en qué estado (invitado, pendiente, activo,
//                           bloqueado), con su última visita.
//   · `sitio_restricciones` qué ve cada categoría: una página entera (y lo
//                           que cuelga de ella), un bloque o una sección.
//   · `sitio_sesiones`, `sitio_enlaces`, `sitio_guardados`.
//
// ── UNA PERSONA, UNA CUENTA ─────────────────────────────────────────────────
// Un miembro ES una cuenta de la plataforma (`users`): misma contraseña con
// scrypt, mismo correo único. Si ya tenía cuenta, entra con ella; si se
// registra en el sitio, se le crea una. Así lo que ya existe (comentarios,
// favoritos, compras, avisos) funciona sin una segunda base de personas que
// mantener. Lo que NO se le da es el regalo de bienvenida de puntos: viene a
// la web de otra persona, no a humanity.wiki, y abrir esa puerta a altas en
// serie desde cualquier dominio sería imprimir puntos.
//
// ── PERO LA SESIÓN DEL SITIO NO ES LA DE LA PLATAFORMA ──────────────────────
// Ésta es la decisión de seguridad que sostiene todo lo demás:
//   1. La cookie es OTRA (`rh_sitio_<raiz>`), sin `Domain`: vale sólo en el
//      anfitrión que la emitió (el dominio propio, el subdominio o la casa) y
//      sólo para ese sitio. Se guarda la huella sha256, nunca el testigo.
//   2. NO abre la plataforma. Con ella no se entra en el editor, ni en los
//      mensajes, ni en nada. Sólo dos cosas la leen: este módulo (para decidir
//      qué se ve) y `identidadDeSitio`, que la convierte en `req.user` para una
//      lista CERRADA de rutas —comentar, guardar favoritos, comprar— y sólo si
//      su categoría tiene ese permiso. Si el dueño de un dominio consiguiera
//      meter código en su web, lo más que podría hacer con la sesión de un
//      miembro es comentar o guardar algo en su nombre, no vaciarle la cuenta.
//   3. Los intentos se frenan con el mismo guardián que el inicio de sesión
//      (`limites/`), con puertas propias: por cuenta y por IP.
//   4. CSRF: `SameSite=Lax` y todas las escrituras son POST/PUT con JSON.
//
// ── NADA PRIVADO EN EL HTML NI EN LAS RUTAS PÚBLICAS ────────────────────────
// Hay más de cien sitios que leen `publico = true` (muro, buscador, sitemap,
// perfiles…). Enseñarles a todos las restricciones es la receta para que el
// número cien y uno se olvide. Así que:
//   · Una página «solo miembros» tiene `publico = false`, SIEMPRE: lo
//     garantiza un disparador de la base de datos (migración 0136), da igual
//     qué ruta intente publicarla. Para el resto del código es una página
//     privada más, y nada de lo que ya existe puede filtrarla.
//   · Lo que cuelga de ella también: la visibilidad heredada de `sitios.ts`
//     deja de subir al llegar a una página restringida.
//   · Sólo `GET /api/sitio/pagina/:id` (y la lectura de sus bases de datos)
//     pregunta aquí si quien llama es miembro y puede verla.
//   · El HTML que escribe el servidor se arma SIN mirar la cookie: nunca lleva
//     lo de los miembros. El navegador lo pide después con su sesión.
//   · Los bloques y secciones restringidos dentro de una página pública se
//     quitan en las tres salidas que dan el contenido (`/api/sitio/pagina`,
//     `/api/publicar/resolver`, `/api/windows/:id` para quien no edita) y en la
//     descripción del HTML. Limitación conocida: el índice del buscador y el
//     resumen del muro leen el texto de los bloques de las páginas públicas;
//     para algo de verdad privado, restringe la página entera.
//
// ── LA RAÍZ, LA HERENCIA Y LAS MADRES VÁLIDAS ───────────────────────────────
// El sitio de una página es el de la página más cercana por encima (ella
// incluida) con `sitio_config.activo`, subiendo SÓLO por madres válidas
// (`permisos.ts`: nadie puede colgar la página de otro de su sitio). La regla
// que manda sobre una página es la restricción más cercana por encima, hasta
// la raíz: restringir una página restringe lo que cuelga de ella.
//
// ── QUIÉN VE UNA PÁGINA RESTRINGIDA ─────────────────────────────────────────
//   · quien tiene rol en ella (dueño, editores… `permisos.ts`), siempre;
//   · un miembro ACTIVO cuya categoría tenga «ver» y esté en la lista de la
//     restricción (lista vacía = cualquier miembro).
// Y a quien no, se le dice por qué, para que la pantalla le ofrezca lo justo:
// 'entrar' (no hay sesión), 'pendiente' (falta que lo aprueben), 'bloqueado',
// o 'categoria' (es miembro pero su categoría no llega → «pedir acceso»).

export const PERMISOS = ['ver', 'comentar', 'guardar', 'comprar', 'editar', 'todo'] as const;
export type Permiso = typeof PERMISOS[number];
export type Permisos = Record<Permiso, boolean>;

const SESION_DIAS = 30;
const ENLACE_MIN = 20;
const huella = (t: string) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const nuevoId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

// Las puertas del guardián, propias de los sitios: un atacante que prueba
// contraseñas en el dominio de alguien no gasta el margen del login de la casa,
// ni al revés.
const REGLA_ENTRAR: Regla = { puerta: 'sitio_entrar', gracia: 3, baseSegundos: 5, topeSegundos: 900, alFallar: 'cerrar' };
const REGLA_REGISTRO: Regla = { puerta: 'sitio_registro', gracia: 3, baseSegundos: 10, topeSegundos: 600, alFallar: 'cerrar' };
const REGLA_ENLACE: Regla = { puerta: 'sitio_enlace', gracia: 2, baseSegundos: 15, topeSegundos: 900, alFallar: 'cerrar' };
const REGLA_PEDIR: Regla = { puerta: 'sitio_pedir', gracia: 3, baseSegundos: 30, topeSegundos: 3600, alFallar: 'cerrar' };

/** Los permisos de una categoría, con «todo» desplegado. */
export function permisosDe(crudo: any): Permisos {
  const p = (crudo && typeof crudo === 'object') ? crudo : {};
  const todo = !!p.todo;
  return Object.fromEntries(PERMISOS.map(k => [k, todo || !!p[k]])) as Permisos;
}
const limpiarPermisos = (crudo: any) => Object.fromEntries(PERMISOS.map(k => [k, !!crudo?.[k]]));

/** El anfitrión de la petición, como lo ve quien navega. */
export function anfitrion(req: Request): string {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
}

const nombreCookie = (raiz: string) => `rh_sitio_${raiz.replace(/[^A-Za-z0-9_]/g, '')}`;
function leerCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) out[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
  }
  return out;
}
/** Añade una cookie sin pisar las que otra parte ya haya puesto. */
function anadirCookie(res: Response, valor: string) {
  const previas = res.getHeader('Set-Cookie');
  const lista = Array.isArray(previas) ? previas.map(String) : previas ? [String(previas)] : [];
  res.setHeader('Set-Cookie', [...lista, valor]);
}
const seguro = () => (process.env.NODE_ENV === 'production' ? '; Secure' : '');
const ponerCookie = (res: Response, raiz: string, token: string) =>
  anadirCookie(res, `${nombreCookie(raiz)}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESION_DIAS * 86400}${seguro()}`);
const quitarCookie = (res: Response, raiz: string) =>
  anadirCookie(res, `${nombreCookie(raiz)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${seguro()}`);

// ── EL SITIO DE UNA PÁGINA ──────────────────────────────────────────────────

/** Las páginas desde ésta hacia arriba por madres válidas, con su distancia. */
const cadenaHaciaArriba = (id: string) => sql`
  WITH RECURSIVE sube(id, n) AS (
    SELECT ${id}::text, 0
    UNION
    SELECT m.id, s.n + 1 FROM sube s CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) m
    WHERE s.n < ${PROFUNDIDAD}
  )
  SELECT id, min(n) AS n FROM sube GROUP BY id
`;

export type Sitio = { raiz: string; registro: string; enlaceMagico: boolean; categoriaDefecto: string | null; mensaje: string | null; duenyo: string; titulo: string };

/**
 * El sitio con miembros al que pertenece una página (el más cercano por
 * encima, ella incluida), y la restricción que manda sobre ella. `null` si la
 * página no está en ningún sitio con miembros activos.
 */
export async function sitioYRegla(db: any, paginaId: string): Promise<{ sitio: Sitio; regla: { pagina: string; categorias: string[] } | null } | null> {
  const r = await db.execute(sql`
    WITH cadena AS (${cadenaHaciaArriba(paginaId)}),
    raiz AS (
      SELECT c.id, c.n, sc.registro, sc.enlace_magico, sc.categoria_defecto, sc.mensaje, w.creator_user_id, w.title
      FROM cadena c JOIN sitio_config sc ON sc.raiz_id = c.id AND sc.activo
      JOIN knowledge_windows w ON w.id = c.id
      ORDER BY c.n LIMIT 1
    )
    SELECT raiz.*,
      (SELECT json_build_object('pagina', r.pagina_id, 'categorias', r.categorias)
         FROM sitio_restricciones r JOIN cadena c ON c.id = r.pagina_id
        WHERE r.bloque_id = '' AND r.raiz_id = raiz.id AND c.n <= raiz.n
        ORDER BY c.n LIMIT 1) AS regla
    FROM raiz
  `);
  const f = r.rows[0] as any;
  if (!f) return null;
  return {
    sitio: { raiz: f.id, registro: f.registro, enlaceMagico: !!f.enlace_magico, categoriaDefecto: f.categoria_defecto, mensaje: f.mensaje, duenyo: f.creator_user_id, titulo: f.title || 'Sin título' },
    regla: f.regla ? { pagina: f.regla.pagina, categorias: f.regla.categorias || [] } : null,
  };
}

// ── QUIÉN ES EL MIEMBRO DE ESTA PETICIÓN ────────────────────────────────────

export type Miembro = {
  id: string; userId: string | null; email: string; nombre: string | null;
  estado: string; categoria: string | null; categoriaNombre: string | null; permisos: Permisos;
};

const filaAMiembro = (f: any): Miembro => ({
  id: f.id, userId: f.user_id, email: f.email, nombre: f.nombre, estado: f.estado,
  categoria: f.categoria_id, categoriaNombre: f.categoria_nombre || null, permisos: permisosDe(f.permisos),
});

/**
 * El miembro de ESTE sitio que hace la petición: por su cookie de sitio (que
 * tiene que ser de este anfitrión), o por su sesión de la plataforma si es
 * miembro (en la casa y en los subdominios la sesión de humanity.wiki viaja).
 * Las peticiones guardan el resultado: una página con diez bloques no pregunta
 * diez veces.
 */
export async function miembroActual(db: any, req: Request, raiz: string): Promise<Miembro | null> {
  const cache: Map<string, Miembro | null> = ((req as any)._miembros ||= new Map());
  if (cache.has(raiz)) return cache.get(raiz)!;
  let m: Miembro | null = null;
  const token = leerCookies(req)[nombreCookie(raiz)];
  if (token) {
    const r = await db.execute(sql`
      SELECT m.*, c.permisos, c.nombre AS categoria_nombre FROM sitio_sesiones s
      JOIN sitio_miembros m ON m.id = s.miembro_id
      LEFT JOIN sitio_categorias c ON c.id = m.categoria_id
      WHERE s.huella = ${huella(token)} AND s.raiz_id = ${raiz} AND s.host = ${anfitrion(req)}
        AND s.revocada IS NULL AND s.caduca > now()
    `);
    if (r.rows[0]) m = filaAMiembro(r.rows[0]);
  }
  // `req.user` puede venir de la propia sesión de sitio (`identidadDeSitio`):
  // entonces ya es el mismo miembro y no hay nada más que mirar.
  if (!m && req.user && !(req as any).miembroSitio) {
    const r = await db.execute(sql`
      SELECT m.*, c.permisos, c.nombre AS categoria_nombre FROM sitio_miembros m
      LEFT JOIN sitio_categorias c ON c.id = m.categoria_id
      WHERE m.raiz_id = ${raiz} AND m.user_id = ${req.user.id}
    `);
    if (r.rows[0]) m = filaAMiembro(r.rows[0]);
  }
  if (m && m.estado === 'activo') {
    // La última visita, como mucho una vez cada cinco minutos.
    db.execute(sql`
      UPDATE sitio_miembros SET ultima_visita = now(), visitas = visitas + 1
      WHERE id = ${m.id} AND (ultima_visita IS NULL OR ultima_visita < now() - interval '5 minutes')
    `).catch(() => {});
  }
  cache.set(raiz, m);
  return m;
}

export type Acceso = {
  sitio: Sitio;
  miembro: Miembro | null;
  /** Tiene rol en la página (dueño, editor…): lo ve todo. */
  esEquipo: boolean;
  permitido: boolean;
  motivo: null | 'entrar' | 'pendiente' | 'bloqueado' | 'categoria';
  restringida: boolean;
};

/** Qué puede ver de esta página quien hace la petición, si está en un sitio
 *  con miembros. `null` si no lo está (mandan las reglas de siempre). */
export async function accesoMiembro(db: any, req: Request | undefined, paginaId: string): Promise<Acceso | null> {
  const sr = await sitioYRegla(db, paginaId);
  if (!sr) return null;
  const { sitio, regla } = sr;
  const esEquipo = req ? rango((await rolEnPagina(db, quienDe(req), paginaId)).rol) > 0 : false;
  const miembro = req ? await miembroActual(db, req, sitio.raiz) : null;
  const base = { sitio, miembro, esEquipo, restringida: !!regla };
  if (esEquipo || !regla) return { ...base, permitido: true, motivo: null };
  if (!miembro) return { ...base, permitido: false, motivo: 'entrar' };
  if (miembro.estado === 'pendiente' || miembro.estado === 'invitado') return { ...base, permitido: false, motivo: 'pendiente' };
  if (miembro.estado === 'bloqueado') return { ...base, permitido: false, motivo: 'bloqueado' };
  const ok = miembro.permisos.ver && (!regla.categorias.length || (!!miembro.categoria && regla.categorias.includes(miembro.categoria)));
  return { ...base, permitido: ok, motivo: ok ? null : 'categoria' };
}

/** Lo que el navegador necesita para pintar el muro de «entra o regístrate». */
export async function muroDe(db: any, a: Acceso) {
  const w = (await db.execute(sql`SELECT title, config->'sitio' AS sitio, config->>'icono' AS icono FROM knowledge_windows WHERE id = ${a.sitio.raiz}`)).rows[0] as any;
  const menu = w?.sitio?.menu || {};
  return {
    motivo: a.motivo,
    sitio: {
      raiz: a.sitio.raiz,
      nombre: menu.nombre || w?.title || 'Sitio',
      logo: menu.logo || null, icono: w?.icono || null,
      acento: menu.acento || null,
      registro: a.sitio.registro,
      enlace_magico: a.sitio.enlaceMagico && (hayCorreo() || process.env.NODE_ENV !== 'production'),
      mensaje: a.sitio.mensaje,
    },
    yo: a.miembro ? { nombre: a.miembro.nombre, email: a.miembro.email, estado: a.miembro.estado, categoria: a.miembro.categoriaNombre } : null,
  };
}

// ── LOS BLOQUES Y LAS SECCIONES ─────────────────────────────────────────────

/** El árbol de bloques en una lista, con su sangría (`_n`). */
const aplanados = (lista: any[], n = 0, out: any[] = []): any[] => {
  for (const b of lista) { out.push({ ...b, _n: n }); if (Array.isArray(b?.bloques)) aplanados(b.bloques, n + 1, out); }
  return out;
};
const nivelTitulo = (t: string) => (t === 'titulo1' ? 1 : t === 'titulo2' ? 2 : t === 'titulo3' ? 3 : 0);

/**
 * Quita de una página los bloques y secciones que quien la lee no puede ver.
 * Devuelve el `config` nuevo (copia) y cuántos quitó. Con `esEquipo`, nada.
 * Sin `req` (el HTML del servidor), se quita todo lo restringido: el HTML no
 * mira cookies, nunca.
 */
export async function filtrarBloques(db: any, paginaId: string, config: any, acceso: Acceso | null): Promise<{ config: any; ocultos: number }> {
  const bloques: any[] = Array.isArray(config?.bloques) ? config.bloques : [];
  if (!bloques.length || acceso?.esEquipo) return { config, ocultos: 0 };
  const r = await db.execute(sql`
    SELECT x.bloque_id, x.alcance, x.categorias FROM sitio_restricciones x
    JOIN sitio_config sc ON sc.raiz_id = x.raiz_id AND sc.activo
    WHERE x.pagina_id = ${paginaId} AND x.bloque_id <> ''
  `);
  if (!r.rows.length) return { config, ocultos: 0 };
  const m = acceso?.miembro;
  const puede = (cats: string[]) => !!m && m.estado === 'activo' && m.permisos.ver && (!cats.length || (!!m.categoria && cats.includes(m.categoria)));
  const regla = new Map<string, { alcance: string; ok: boolean }>();
  for (const f of r.rows as any[]) regla.set(f.bloque_id, { alcance: f.alcance, ok: puede(f.categorias || []) });

  let ocultos = 0;
  const filtrar = (lista: any[]): any[] => {
    const out: any[] = [];
    let saltandoHasta = 0; // >0: dentro de una sección oculta de ese nivel
    for (const b of lista) {
      const nivel = nivelTitulo(b?.tipo);
      if (saltandoHasta && nivel && nivel <= saltandoHasta) saltandoHasta = 0;
      if (saltandoHasta) { ocultos++; continue; }
      const x = b?.id ? regla.get(b.id) : undefined;
      if (x && !x.ok) {
        ocultos++;
        if (x.alcance === 'seccion' && nivel) saltandoHasta = nivel;
        continue;
      }
      // Bloques que llevan otros dentro (sangrados, desplegables: desde el
      // editor en árbol cada bloque lleva a sus hijos en `bloques`): también.
      if (Array.isArray(b?.bloques) && b.bloques.length) out.push({ ...b, bloques: filtrar(b.bloques) });
      else out.push(b);
    }
    return out;
  };
  const nuevos = filtrar(bloques);
  return { config: { ...config, bloques: nuevos }, ocultos };
}

/** Atajo para las rutas que ya tienen la página: filtra según la petición. */
export async function filtrarParaLector(db: any, req: Request | undefined, paginaId: string, config: any) {
  const a = await accesoMiembro(db, req, paginaId);
  return { ...(await filtrarBloques(db, paginaId, config, a)), raiz: a?.sitio.raiz ?? null };
}

// ── LA SESIÓN DE SITIO COMO IDENTIDAD, PARA UNAS POCAS RUTAS ────────────────
// Ver la cabecera, punto 2. La lista es CERRADA y cada entrada dice qué
// permiso de la categoría hace falta. Una ruta que no está aquí no ve al
// miembro, aunque traiga la cookie.
const RUTAS_DE_MIEMBRO: { re: RegExp; metodos: string[]; permiso: Permiso }[] = [
  { re: /^\/api\/comments\/?$/, metodos: ['POST'], permiso: 'comentar' },
  { re: /^\/api\/comentarios(\/|$)/, metodos: ['GET', 'POST', 'PUT', 'DELETE'], permiso: 'comentar' },
  { re: /^\/api\/publicar\/favoritos(\/|$)/, metodos: ['GET', 'PUT', 'DELETE'], permiso: 'guardar' },
  { re: /^\/api\/publicar\/(comprar|cotizar|cupon\/comprobar)\/?$/, metodos: ['POST'], permiso: 'comprar' },
  { re: /^\/api\/stripe\/checkout\/product\/?$/, metodos: ['POST'], permiso: 'comprar' },
];

export function identidadDeSitio(db: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user) return next();
      const ruta = RUTAS_DE_MIEMBRO.find(x => x.re.test(req.path) && x.metodos.includes(req.method));
      if (!ruta) return next();
      const tokens = Object.entries(leerCookies(req)).filter(([k]) => k.startsWith('rh_sitio_')).map(([, v]) => huella(v));
      if (!tokens.length) return next();
      const r = await db.execute(sql`
        SELECT u.*, m.id AS _miembro, c.permisos AS _permisos
        FROM sitio_sesiones s
        JOIN sitio_miembros m ON m.id = s.miembro_id AND m.estado = 'activo'
        JOIN sitio_config sc ON sc.raiz_id = s.raiz_id AND sc.activo
        LEFT JOIN sitio_categorias c ON c.id = m.categoria_id
        JOIN users u ON u.id = m.user_id AND u.archived_at IS NULL AND u.deleted_at IS NULL
        WHERE s.huella IN (${sql.join(tokens.map(t => sql`${t}`), sql`, `)}) AND s.host = ${anfitrion(req)}
          AND s.revocada IS NULL AND s.caduca > now()
      `);
      const f = (r.rows as any[]).find(x => permisosDe(x._permisos)[ruta.permiso]);
      if (f) { req.user = filaAUsuario(f); (req as any).miembroSitio = f._miembro; }
    } catch (e) { console.error('identidad de sitio:', e); }
    next();
  };
}

// ── LAS RUTAS ───────────────────────────────────────────────────────────────

export function registrarMiembros(app: Express, db: any) {
  app.use(identidadDeSitio(db));

  /** ¿Gestiona quien llama este sitio? Dueño o «Administrar» en la raíz. */
  async function gestiona(req: Request, res: Response): Promise<string | null> {
    if (!req.user || (req as any).miembroSitio) { res.status(401).json({ error: 'Inicia sesión.' }); return null; }
    const raiz = String(req.params.raiz);
    const a = await rolEnPagina(db, quienDe(req), raiz);
    if (!a.existe) { res.status(404).json({ error: 'Esa página no existe.' }); return null; }
    if (!capacidades(a).gestionar) { res.status(403).json({ error: 'Solo quien administra la página gestiona sus miembros.' }); return null; }
    return raiz;
  }

  /** La configuración tiene que existir para casi todo lo del panel. */
  async function config(raiz: string) {
    return (await db.execute(sql`SELECT * FROM sitio_config WHERE raiz_id = ${raiz}`)).rows[0] as any;
  }

  // ════ PANEL DEL EDITOR ════════════════════════════════════════════════════

  /** Todo lo del panel de una vez: ajustes, categorías y cifras. */
  app.get('/api/sitio-miembros/:raiz/panel', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const w = (await db.execute(sql`
        SELECT w.id, w.title, w.slug, w.publico, u.handle,
          (SELECT json_agg(dominio) FROM dominios_paginas d WHERE d.entidad_tipo = 'pagina' AND d.entidad_id = w.id AND d.estado IN ('pendiente','activo')) AS dominios,
          EXISTS (SELECT 1 FROM sitio_restricciones r WHERE r.pagina_id = w.id AND r.bloque_id = '') AS raiz_restringida
        FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id WHERE w.id = ${raiz}
      `)).rows[0] as any;
      const c = await config(raiz);
      const cats = (await db.execute(sql`
        SELECT c.*, (SELECT count(*)::int FROM sitio_miembros m WHERE m.categoria_id = c.id) AS miembros
        FROM sitio_categorias c WHERE c.raiz_id = ${raiz} ORDER BY c.orden, c.created_at
      `)).rows;
      const cifras = (await db.execute(sql`
        SELECT count(*) FILTER (WHERE estado = 'activo')::int AS activos,
               count(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
               count(*) FILTER (WHERE estado = 'invitado')::int AS invitados,
               count(*) FILTER (WHERE estado = 'bloqueado')::int AS bloqueados
        FROM sitio_miembros WHERE raiz_id = ${raiz}
      `)).rows[0];
      res.json({
        pagina: { id: w.id, titulo: w.title, slug: w.slug, publico: w.publico, handle: w.handle, dominios: w.dominios || [], raiz_restringida: w.raiz_restringida },
        config: c ? { activo: c.activo, registro: c.registro, enlace_magico: c.enlace_magico, categoria_defecto: c.categoria_defecto, mensaje: c.mensaje } : null,
        categorias: cats, cifras, correo_activo: hayCorreo(),
      });
    } catch (e: any) { console.error('miembros panel:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * ACTIVAR / CAMBIAR LOS AJUSTES — `{ activo?, registro?, enlace_magico?,
   * categoria_defecto?, mensaje? }`. La primera vez crea la categoría
   * «Miembros» (ver, comentar, guardar, comprar) y la pone por defecto: un
   * sitio sin ninguna categoría no sabría dónde meter al primero que llega.
   */
  app.put('/api/sitio-miembros/:raiz/config', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const b = req.body || {};
      if (b.registro !== undefined && !['abierto', 'aprobacion', 'invitacion'].includes(b.registro)) return res.status(400).json({ error: 'El registro es abierto, con aprobación o solo por invitación.' });
      let c = await config(raiz);
      if (!c) {
        await db.execute(sql`INSERT INTO sitio_config (raiz_id, creado_por) VALUES (${raiz}, ${req.user!.id}) ON CONFLICT DO NOTHING`);
        const cat = nuevoId('SC');
        await db.execute(sql`
          INSERT INTO sitio_categorias (id, raiz_id, nombre, permisos, orden)
          VALUES (${cat}, ${raiz}, 'Miembros', '{"ver":true,"comentar":true,"guardar":true,"comprar":true}'::jsonb, 0)
        `);
        await db.execute(sql`UPDATE sitio_config SET categoria_defecto = ${cat} WHERE raiz_id = ${raiz}`);
        c = await config(raiz);
      }
      if (b.categoria_defecto) {
        const ok = await db.execute(sql`SELECT 1 FROM sitio_categorias WHERE id = ${b.categoria_defecto} AND raiz_id = ${raiz}`);
        if (!ok.rows.length) return res.status(400).json({ error: 'Esa categoría no es de este sitio.' });
      }
      await db.execute(sql`
        UPDATE sitio_config SET
          activo = COALESCE(${typeof b.activo === 'boolean' ? b.activo : null}::boolean, activo),
          registro = COALESCE(${b.registro ?? null}::text, registro),
          enlace_magico = COALESCE(${typeof b.enlace_magico === 'boolean' ? b.enlace_magico : null}::boolean, enlace_magico),
          categoria_defecto = COALESCE(${b.categoria_defecto ?? null}::text, categoria_defecto),
          mensaje = CASE WHEN ${b.mensaje === undefined} THEN mensaje ELSE ${b.mensaje ? String(b.mensaje).slice(0, 500) : null} END,
          updated_at = now()
        WHERE raiz_id = ${raiz}
      `);
      res.json({ ok: true });
    } catch (e: any) { console.error('miembros config:', e); res.status(500).json({ error: e.message }); }
  });

  app.post('/api/sitio-miembros/:raiz/categorias', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      if (!(await config(raiz))) return res.status(400).json({ error: 'Activa antes los miembros.' });
      const nombre = String(req.body?.nombre || '').trim().slice(0, 60);
      if (!nombre) return res.status(400).json({ error: 'Ponle un nombre a la categoría.' });
      const n = (await db.execute(sql`SELECT count(*)::int AS n FROM sitio_categorias WHERE raiz_id = ${raiz}`)).rows[0] as any;
      if (Number(n.n) >= 30) return res.status(400).json({ error: 'Como mucho 30 categorías por sitio.' });
      const id = nuevoId('SC');
      await db.execute(sql`
        INSERT INTO sitio_categorias (id, raiz_id, nombre, color, permisos, orden)
        VALUES (${id}, ${raiz}, ${nombre}, ${req.body?.color ? String(req.body.color).slice(0, 20) : null},
                ${JSON.stringify(limpiarPermisos(req.body?.permisos || { ver: true }))}::jsonb, ${Number(n.n)})
      `);
      res.json({ id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/sitio-miembros/:raiz/categorias/:id', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const b = req.body || {};
      const nombre = b.nombre === undefined ? null : String(b.nombre).trim().slice(0, 60) || null;
      const r = await db.execute(sql`
        UPDATE sitio_categorias SET
          nombre = COALESCE(${nombre}, nombre),
          color = CASE WHEN ${b.color === undefined} THEN color ELSE ${b.color ? String(b.color).slice(0, 20) : null} END,
          permisos = COALESCE(${b.permisos ? JSON.stringify(limpiarPermisos(b.permisos)) : null}::jsonb, permisos)
        WHERE id = ${req.params.id} AND raiz_id = ${raiz} RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Esa categoría no existe.' });
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Borrar una categoría: sus miembros pasan a la de por defecto, y se quita
   *  de las restricciones. La de por defecto no se borra. */
  app.delete('/api/sitio-miembros/:raiz/categorias/:id', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const c = await config(raiz);
      if (c?.categoria_defecto === req.params.id) return res.status(400).json({ error: 'Es la categoría por defecto: elige antes otra por defecto.' });
      await db.execute(sql`UPDATE sitio_miembros SET categoria_id = ${c?.categoria_defecto ?? null} WHERE raiz_id = ${raiz} AND categoria_id = ${req.params.id}`);
      await db.execute(sql`UPDATE sitio_restricciones SET categorias = array_remove(categorias, ${req.params.id}::text) WHERE raiz_id = ${raiz}`);
      await db.execute(sql`DELETE FROM sitio_categorias WHERE id = ${req.params.id} AND raiz_id = ${raiz}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** La lista de miembros, con búsqueda y filtros. */
  app.get('/api/sitio-miembros/:raiz/miembros', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const q = String(req.query.q || '').trim();
      const estado = String(req.query.estado || '');
      const cat = String(req.query.categoria || '');
      const like = `%${q}%`;
      const r = await db.execute(sql`
        SELECT m.id, m.email, COALESCE(m.nombre, u.display_name, u.name) AS nombre, m.estado, m.categoria_id,
               c.nombre AS categoria, m.ultima_visita, m.visitas, m.created_at, m.user_id IS NOT NULL AS tiene_cuenta
        FROM sitio_miembros m
        LEFT JOIN sitio_categorias c ON c.id = m.categoria_id
        LEFT JOIN users u ON u.id = m.user_id
        WHERE m.raiz_id = ${raiz}
          AND (${q} = '' OR m.email ILIKE ${like} OR m.nombre ILIKE ${like} OR u.display_name ILIKE ${like})
          AND (${estado} = '' OR m.estado = ${estado})
          AND (${cat} = '' OR m.categoria_id = ${cat})
        ORDER BY (m.estado = 'pendiente') DESC, m.created_at DESC
        LIMIT 500
      `);
      res.json({ miembros: r.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Cambiar de categoría, aprobar (estado activo) o bloquear. */
  app.put('/api/sitio-miembros/:raiz/miembros/:id', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const { categoria_id, estado } = req.body || {};
      if (estado !== undefined && !['activo', 'bloqueado', 'pendiente'].includes(estado)) return res.status(400).json({ error: 'Estado no válido.' });
      if (categoria_id) {
        const ok = await db.execute(sql`SELECT 1 FROM sitio_categorias WHERE id = ${categoria_id} AND raiz_id = ${raiz}`);
        if (!ok.rows.length) return res.status(400).json({ error: 'Esa categoría no es de este sitio.' });
      }
      const r = await db.execute(sql`
        UPDATE sitio_miembros SET
          categoria_id = COALESCE(${categoria_id ?? null}::text, categoria_id),
          estado = CASE WHEN ${estado ?? null}::text IS NULL THEN estado
                        WHEN estado = 'invitado' AND ${estado ?? null}::text = 'activo' THEN 'invitado'
                        ELSE ${estado ?? null}::text END,
          aprobado_en = CASE WHEN ${estado ?? null}::text = 'activo' AND estado = 'pendiente' THEN now() ELSE aprobado_en END,
          updated_at = now()
        WHERE id = ${req.params.id} AND raiz_id = ${raiz} RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Ese miembro no existe.' });
      // Bloquear cierra sus sesiones en el sitio al momento.
      if (estado === 'bloqueado') await db.execute(sql`UPDATE sitio_sesiones SET revocada = now() WHERE miembro_id = ${req.params.id} AND revocada IS NULL`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/sitio-miembros/:raiz/miembros/:id', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      await db.execute(sql`DELETE FROM sitio_miembros WHERE id = ${req.params.id} AND raiz_id = ${raiz}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * INVITAR EN BLOQUE — `{ emails, categoria_id? }`. Hasta 500 de una vez.
   * Quien ya era miembro cambia de categoría; los demás quedan «invitados» y
   * entran en cuanto se registran o piden el enlace con ese correo, también si
   * el registro está cerrado a invitaciones.
   */
  app.post('/api/sitio-miembros/:raiz/invitar', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const c = await config(raiz);
      if (!c) return res.status(400).json({ error: 'Activa antes los miembros.' });
      const cat = req.body?.categoria_id || c.categoria_defecto;
      const ok = await db.execute(sql`SELECT 1 FROM sitio_categorias WHERE id = ${cat} AND raiz_id = ${raiz}`);
      if (!ok.rows.length) return res.status(400).json({ error: 'Esa categoría no es de este sitio.' });
      const crudo = Array.isArray(req.body?.emails) ? req.body.emails.join('\n') : String(req.body?.emails || '');
      const emails = [...new Set(crudo.split(/[\s,;]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean))] as string[];
      const validos = emails.filter(e => EMAIL.test(e));
      if (!validos.length) return res.status(400).json({ error: 'No hay ningún correo válido.' });
      if (validos.length > 500) return res.status(400).json({ error: 'Como mucho 500 de una vez.' });
      const titulo = ((await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${raiz}`)).rows[0] as any)?.title || 'el sitio';
      let nuevos = 0, actualizados = 0, correos = 0;
      for (const email of validos) {
        const r = await db.execute(sql`
          INSERT INTO sitio_miembros (id, raiz_id, email, categoria_id, estado, invitado_por)
          VALUES (${nuevoId('SM')}, ${raiz}, ${email}, ${cat}, 'invitado', ${req.user!.id})
          ON CONFLICT (raiz_id, email) DO UPDATE SET categoria_id = EXCLUDED.categoria_id, updated_at = now()
          RETURNING (xmax = 0) AS nuevo
        `);
        if ((r.rows[0] as any)?.nuevo) {
          nuevos++;
          if (req.body?.avisar && await enviarCorreo({ para: email, asunto: `Te han invitado a ${titulo}`, texto: `Te han invitado a ${titulo}. Entra con este correo para acceder.` })) correos++;
        } else actualizados++;
      }
      res.json({ ok: true, nuevos, actualizados, descartados: emails.length - validos.length, correos, correo_activo: hayCorreo() });
    } catch (e: any) { console.error('miembros invitar:', e); res.status(500).json({ error: e.message }); }
  });

  /** CSV para llevárselo a una hoja de cálculo. */
  app.get('/api/sitio-miembros/:raiz/miembros.csv', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const r = await db.execute(sql`
        SELECT m.email, COALESCE(m.nombre, u.display_name, '') AS nombre, COALESCE(c.nombre, '') AS categoria, m.estado,
               to_char(m.created_at, 'YYYY-MM-DD HH24:MI') AS alta, COALESCE(to_char(m.ultima_visita, 'YYYY-MM-DD HH24:MI'), '') AS ultima_visita, m.visitas
        FROM sitio_miembros m LEFT JOIN sitio_categorias c ON c.id = m.categoria_id LEFT JOIN users u ON u.id = m.user_id
        WHERE m.raiz_id = ${raiz} ORDER BY m.created_at
      `);
      // Una celda que empieza por = + - @ la ejecuta la hoja de cálculo como
      // fórmula: se le pone un apóstrofo delante (inyección CSV).
      const celda = (v: any) => {
        let s = String(v ?? '');
        if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const filas = [['correo', 'nombre', 'categoria', 'estado', 'alta', 'ultima_visita', 'visitas'], ...(r.rows as any[]).map(f => [f.email, f.nombre, f.categoria, f.estado, f.alta, f.ultima_visita, f.visitas])];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="miembros-${raiz}.csv"`);
      res.send('﻿' + filas.map(f => f.map(celda).join(',')).join('\n'));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * LAS PÁGINAS DEL SITIO Y QUIÉN VE CADA COSA — para la pestaña «Acceso».
   * La raíz y todo lo que cuelga de ella (por madres válidas), cada una con su
   * regla, y sus bloques con un adelanto y su regla.
   */
  app.get('/api/sitio-miembros/:raiz/paginas', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      const r = await db.execute(sql`
        WITH RECURSIVE baja(id, n, madre) AS (
          SELECT ${raiz}::text, 0, NULL::text
          UNION
          SELECT h.id, b.n + 1, b.id FROM baja b
          CROSS JOIN LATERAL (
            -- Las hijas por los mismos eslabones que madresValidas, al revés:
            -- un bloque «Página» a una página de la misma dueña, o las filas de
            -- una base de datos que es de la dueña de la madre.
            SELECT k.id FROM knowledge_windows w
            CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
            JOIN knowledge_windows k ON k.id = blq->>'entityId' AND blq->>'tipo' = 'subpagina'
              AND k.creator_user_id = w.creator_user_id AND k.kind = 'pagina' AND k.deleted_at IS NULL AND k.archived_at IS NULL
            WHERE w.id = b.id
            UNION
            SELECT f.pagina_id FROM knowledge_windows w
            CROSS JOIN LATERAL jsonb_array_elements(${bloquesDe('w')}) blq
            JOIN bd_tablas t ON t.id = blq->>'tabla_id' AND blq->>'tipo' = 'basedatos' AND t.creador_user_id = w.creator_user_id
            JOIN bd_filas f ON f.tabla_id = t.id AND f.deleted_at IS NULL AND f.pagina_id IS NOT NULL
            WHERE w.id = b.id
          ) h
          WHERE b.n < ${PROFUNDIDAD}
        )
        SELECT DISTINCT ON (w.id) w.id, w.title, w.config->>'icono' AS icono, b.n, b.madre, w.config->'bloques' AS bloques
        FROM baja b JOIN knowledge_windows w ON w.id = b.id
        ORDER BY w.id, b.n
      `);
      const reglas = (await db.execute(sql`SELECT pagina_id, bloque_id, alcance, categorias FROM sitio_restricciones WHERE raiz_id = ${raiz}`)).rows as any[];
      const reglaDe = (p: string, b: string) => reglas.find(x => x.pagina_id === p && x.bloque_id === b) || null;
      const adelanto = (b: any) => String(b?.texto || b?.pubTitulo || b?.pie || b?.url || '').replace(/[*_`#>\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
      const paginas = (r.rows as any[]).sort((a, b) => a.n - b.n).map(p => ({
        id: p.id, titulo: p.title || 'Sin título', icono: p.icono, nivel: p.n, madre: p.madre,
        regla: reglaDe(p.id, ''),
        bloques: aplanados(Array.isArray(p.bloques) ? p.bloques : []).filter((b: any) => b?.id && b?.tipo).slice(0, 300).map((b: any) => ({
          id: b.id, tipo: b.tipo, adelanto: adelanto(b), titulo: nivelTitulo(b.tipo) > 0, sangria: b._n || 0, regla: reglaDe(p.id, b.id),
        })),
      }));
      res.json({ paginas });
    } catch (e: any) { console.error('miembros paginas:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * QUIÉN VE ESTO — `{ pagina_id, bloque_id?, acceso: 'todos'|'miembros'|'categorias',
   * categorias?, seccion? }`. 'todos' quita la regla.
   *
   * Al restringir una página entera se despublica en la misma operación (y el
   * disparador de 0136 impide volver a publicarla mientras siga restringida).
   * Al quitar la regla de una página que tenía dirección, vuelve a ser
   * pública: es lo que significa «todos».
   */
  app.put('/api/sitio-miembros/:raiz/restricciones', async (req: Request, res: Response) => {
    try {
      const raiz = await gestiona(req, res);
      if (!raiz) return;
      if (!(await config(raiz))) return res.status(400).json({ error: 'Activa antes los miembros.' });
      const { pagina_id, acceso } = req.body || {};
      const bloque = String(req.body?.bloque_id || '');
      if (!pagina_id || !['todos', 'miembros', 'categorias'].includes(acceso)) return res.status(400).json({ error: 'Falta la página o el acceso.' });
      // La página tiene que ser del sitio: la raíz o algo que cuelgue de ella.
      const del = await db.execute(sql`WITH c AS (${cadenaHaciaArriba(String(pagina_id))}) SELECT 1 FROM c WHERE id = ${raiz}`);
      if (!del.rows.length) return res.status(400).json({ error: 'Esa página no es de este sitio.' });
      if (acceso === 'todos') {
        // La página vuelve a estar como estaba antes de restringirla: si era
        // pública, pública. Se borra la regla ANTES, o el disparador de 0136
        // volvería a despublicarla.
        const antes = (await db.execute(sql`
          DELETE FROM sitio_restricciones WHERE pagina_id = ${pagina_id} AND bloque_id = ${bloque} RETURNING era_publica
        `)).rows[0] as any;
        if (!bloque && antes?.era_publica) await db.execute(sql`UPDATE knowledge_windows SET publico = true WHERE id = ${pagina_id}`);
        return res.json({ ok: true });
      }
      let cats: string[] = [];
      if (acceso === 'categorias') {
        cats = (Array.isArray(req.body?.categorias) ? req.body.categorias : []).map(String);
        if (!cats.length) return res.status(400).json({ error: 'Elige al menos una categoría.' });
        const ok = await db.execute(sql`SELECT count(*)::int AS n FROM sitio_categorias WHERE raiz_id = ${raiz} AND id IN (${sql.join(cats.map(c => sql`${c}`), sql`, `)})`);
        if (Number((ok.rows[0] as any).n) !== new Set(cats).size) return res.status(400).json({ error: 'Alguna categoría no es de este sitio.' });
      }
      const alcance = !bloque ? 'pagina' : req.body?.seccion ? 'seccion' : 'bloque';
      await db.execute(sql`
        INSERT INTO sitio_restricciones (pagina_id, bloque_id, raiz_id, alcance, categorias, creado_por, era_publica)
        VALUES (${pagina_id}, ${bloque}, ${raiz}, ${alcance}, string_to_array(${cats.join(',')}, ',')::text[], ${req.user!.id},
                (SELECT publico FROM knowledge_windows WHERE id = ${pagina_id}))
        ON CONFLICT (pagina_id, bloque_id) DO UPDATE SET alcance = EXCLUDED.alcance, categorias = EXCLUDED.categorias
      `);
      if (!bloque) await db.execute(sql`UPDATE knowledge_windows SET publico = false WHERE id = ${pagina_id}`);
      res.json({ ok: true });
    } catch (e: any) { console.error('miembros restricciones:', e); res.status(500).json({ error: e.message }); }
  });

  // ════ EL LADO DEL VISITANTE ═══════════════════════════════════════════════

  /** Cómo está el sitio y quién soy en él. Sin sesión: lo pide el muro. */
  app.get('/api/sitio-miembros/:raiz/estado', async (req: Request, res: Response) => {
    try {
      const raiz = String(req.params.raiz);
      const c = await config(raiz);
      if (!c?.activo) return res.json({ activo: false });
      const a = await accesoMiembro(db, req, raiz);
      if (!a) return res.json({ activo: false });
      const muro = await muroDe(db, a);
      const m = a.miembro;
      // La foto de perfil de quien ha entrado (la de su cuenta), para el icono del menú. Y, si es del equipo
      // (la persona que gestiona la web), su nombre y su foto de la plataforma.
      const foto = async (uid: string | null | undefined) => uid
        ? ((await db.execute(sql`SELECT avatar_url FROM users WHERE id = ${uid}`)).rows[0] as any)?.avatar_url || null
        : null;
      res.set('Cache-Control', 'private, no-store');
      res.json({
        activo: true, ...muro.sitio, es_equipo: a.esEquipo,
        yo: m ? { nombre: m.nombre, email: m.email, estado: m.estado, categoria: m.categoriaNombre, avatar: await foto(m.userId), permisos: m.estado === 'activo' ? m.permisos : null } : null,
        equipo: a.esEquipo && req.user ? { nombre: req.user.displayName || req.user.name || req.user.email, avatar: req.user.avatarUrl || null } : null,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * «MIS PEDIDOS», DENTRO DE LA WEB (2026-10-08). Los pedidos que esta persona ha hecho EN ESTA TIENDA (los de quien
   * publica la web): por su cuenta o por el correo con el que compró antes de registrarse. Sólo para quien tiene su
   * sesión de sitio activa; no abre nada de la plataforma ni enseña pedidos de otras tiendas.
   */
  app.get('/api/sitio-miembros/:raiz/mis-pedidos', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const raiz = String(req.params.raiz);
      const c = await config(raiz);
      if (!c?.activo) return res.json({ pedidos: [] });
      const m = await miembroActual(db, req, raiz);
      if (!m || m.estado !== 'activo') return res.status(401).json({ error: 'Entra para ver tus pedidos.' });
      const dueno = ((await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${raiz}`)).rows[0] as any)?.creator_user_id;
      if (!dueno) return res.json({ pedidos: [] });
      const r = await db.execute(sql`
        SELECT codigo, producto_nombre, importe_centimos, envio_centimos, moneda, estado, seguimiento, entrega_estimada, created_at
        FROM pedidos
        WHERE vendedor_user_id = ${dueno}
          AND ((${m.userId}::text IS NOT NULL AND comprador_user_id = ${m.userId}) OR lower(comprador_email) = lower(${m.email}))
        ORDER BY created_at DESC LIMIT 30
      `);
      res.json({ pedidos: (r.rows as any[]).map(p => ({
        codigo: p.codigo, resumen: p.producto_nombre, total_centimos: Number(p.importe_centimos || 0), moneda: p.moneda || 'EUR',
        estado: p.estado, seguimiento: p.seguimiento || null, entrega_estimada: p.entrega_estimada || null, fecha: p.created_at,
      })) });
    } catch (e: any) { console.error(e); res.status(500).json({ error: e.message }); }
  });

  /** Abrir sesión en el sitio para un miembro ya decidido. */
  async function abrirSesion(req: Request, res: Response, raiz: string, miembroId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    await db.execute(sql`
      INSERT INTO sitio_sesiones (huella, miembro_id, raiz_id, host, caduca, ip, user_agent)
      VALUES (${huella(token)}, ${miembroId}, ${raiz}, ${anfitrion(req)}, now() + make_interval(days => ${SESION_DIAS}),
              ${ipDe(req)}, ${String(req.headers['user-agent'] || '').slice(0, 300)})
    `);
    await db.execute(sql`UPDATE sitio_miembros SET ultima_visita = now(), visitas = visitas + 1 WHERE id = ${miembroId}`);
    ponerCookie(res, raiz, token);
  }

  /**
   * Hacer miembro a esta cuenta, según cómo se entra en el sitio. Devuelve el
   * miembro y en qué estado queda, o un error que se puede enseñar.
   */
  async function hacerMiembro(c: any, user: { id: string; email: string; nombre: string | null }) {
    const raiz = c.raiz_id;
    const previo = (await db.execute(sql`SELECT * FROM sitio_miembros WHERE raiz_id = ${raiz} AND (user_id = ${user.id} OR email = ${user.email}) ORDER BY user_id NULLS LAST LIMIT 1`)).rows[0] as any;
    if (previo) {
      if (previo.estado === 'bloqueado') return { error: 'Tu acceso a este sitio está bloqueado.', codigo: 403 };
      // Una invitación se cumple al entrar: pasa a activo con su categoría.
      const estado = previo.estado === 'invitado' ? 'activo' : previo.estado;
      await db.execute(sql`
        UPDATE sitio_miembros SET user_id = ${user.id}, estado = ${estado}, nombre = COALESCE(nombre, ${user.nombre}),
          aprobado_en = CASE WHEN ${estado} = 'activo' AND aprobado_en IS NULL THEN now() ELSE aprobado_en END, updated_at = now()
        WHERE id = ${previo.id}
      `);
      return { id: previo.id as string, estado };
    }
    if (c.registro === 'invitacion') return { error: 'Este sitio es solo por invitación. Pide a quien lo gestiona que te invite con este correo.', codigo: 403 };
    const estado = c.registro === 'aprobacion' ? 'pendiente' : 'activo';
    const id = nuevoId('SM');
    await db.execute(sql`
      INSERT INTO sitio_miembros (id, raiz_id, user_id, email, nombre, categoria_id, estado, aprobado_en)
      VALUES (${id}, ${raiz}, ${user.id}, ${user.email}, ${user.nombre}, ${c.categoria_defecto}, ${estado}, ${estado === 'activo' ? sql`now()` : sql`NULL`})
    `);
    if (estado === 'pendiente') {
      const t = (await db.execute(sql`SELECT title, creator_user_id FROM knowledge_windows WHERE id = ${raiz}`)).rows[0] as any;
      await avisar(db, { paraQuien: t?.creator_user_id, dePartede: user.id, tipo: 'miembro_pendiente', entidadTipo: 'sitio_miembros', entidadId: raiz,
        datos: { titulo: t?.title || '', destino: `/paginas/${raiz}/miembros` } });
    }
    return { id, estado };
  }

  const sitioActivo = async (raiz: string) => {
    const c = await config(raiz);
    return c?.activo ? c : null;
  };
  const respuestaEstado = (estado: string) => estado === 'pendiente'
    ? { ok: true, estado, mensaje: 'Gracias. Tu registro está pendiente de aprobación: te avisaremos cuando te acepten.' }
    : { ok: true, estado };

  /**
   * REGISTRARSE EN EL SITIO — `{ email, password, nombre }`.
   * Correo nuevo: se crea la cuenta (sin regalo de puntos, ver la cabecera).
   * Correo que ya tiene cuenta: se le pide que entre con su contraseña, igual
   * que en la casa (decir «ya existe» es inevitable; el guardián lo frena).
   */
  app.post('/api/sitio-miembros/:raiz/registro', guardian(db, REGLA_REGISTRO, r => r.body?.email), async (req: Request, res: Response) => {
    try {
      const c = await sitioActivo(String(req.params.raiz));
      if (!c) return res.status(404).json({ error: 'Este sitio no admite registros.' });
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const nombre = String(req.body?.nombre || '').trim().slice(0, 80) || null;
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Escribe un correo válido.' });
      if (password.length < 8) return res.status(400).json({ error: 'La contraseña necesita al menos 8 caracteres.' });
      if (c.registro === 'invitacion') {
        const inv = await db.execute(sql`SELECT 1 FROM sitio_miembros WHERE raiz_id = ${c.raiz_id} AND email = ${email}`);
        if (!inv.rows.length) {
          await anotarFallo(db, REGLA_REGISTRO, ipDe(req), email, false);
          return res.status(403).json({ error: 'Este sitio es solo por invitación. Pide a quien lo gestiona que te invite con este correo.' });
        }
      }
      const existe = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${email}`);
      if (existe.rows.length) {
        await anotarFallo(db, REGLA_REGISTRO, ipDe(req), email, true);
        return res.status(409).json({ error: 'Ya tienes cuenta con ese correo: entra con tu contraseña.', entrar: true });
      }
      const id = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await db.execute(sql`
        INSERT INTO users (id, email, name, display_name, password_hash, role_level, email_verified, created_by)
        VALUES (${id}, ${email}, ${nombre}, ${nombre}, ${hashPassword(password)}, 1, true, ${id})
      `);
      const m = await hacerMiembro(c, { id, email, nombre });
      if ('error' in m) return res.status(m.codigo).json({ error: m.error });
      if (m.estado === 'activo') await abrirSesion(req, res, c.raiz_id, m.id);
      res.json(respuestaEstado(m.estado));
    } catch (e: any) { console.error('sitio registro:', e); res.status(500).json({ error: e.message }); }
  });

  /** ENTRAR — `{ email, password }`. Mismo mensaje exista o no la cuenta. */
  app.post('/api/sitio-miembros/:raiz/entrar', guardian(db, REGLA_ENTRAR, r => r.body?.email), async (req: Request, res: Response) => {
    try {
      const c = await sitioActivo(String(req.params.raiz));
      if (!c) return res.status(404).json({ error: 'Este sitio no tiene miembros.' });
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '');
      const u = (await db.execute(sql`
        SELECT id, email, password_hash, COALESCE(display_name, name) AS nombre FROM users
        WHERE lower(email) = ${email} AND archived_at IS NULL AND deleted_at IS NULL
      `)).rows[0] as any;
      if (!u || !verifyPassword(password, u.password_hash)) {
        await anotarFallo(db, REGLA_ENTRAR, ipDe(req), email, !!u);
        return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      }
      await levantarFreno(db, REGLA_ENTRAR, ipDe(req), email);
      const m = await hacerMiembro(c, { id: u.id, email, nombre: u.nombre });
      if ('error' in m) return res.status(m.codigo).json({ error: m.error });
      if (m.estado === 'activo') await abrirSesion(req, res, c.raiz_id, m.id);
      res.json(respuestaEstado(m.estado));
    } catch (e: any) { console.error('sitio entrar:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * PEDIR UN ENLACE MÁGICO — `{ email, volver? }`. La respuesta es la misma
   * exista o no el correo. El enlace lleva a la web (no a esta ruta) con
   * `?acceso=…`, y es la web la que lo canjea con un POST: los antivirus del
   * correo abren los enlaces para mirarlos, y un GET que gastara el enlace se
   * lo gastaría al antivirus.
   */
  app.post('/api/sitio-miembros/:raiz/enlace', guardian(db, REGLA_ENLACE, r => r.body?.email), async (req: Request, res: Response) => {
    try {
      const c = await sitioActivo(String(req.params.raiz));
      if (!c || !c.enlace_magico) return res.status(404).json({ error: 'Este sitio no entra con enlace.' });
      // Sin proveedor de correo, en producción no se finge que sale un correo.
      // En desarrollo el enlace se devuelve en la respuesta para poder probar
      // el camino entero (como `dev_token` en el restablecer de `auth.ts`).
      const enDesarrollo = process.env.NODE_ENV !== 'production';
      if (!hayCorreo() && !enDesarrollo) return res.status(503).json({ error: 'Ahora mismo no se pueden enviar correos. Entra con tu contraseña.' });
      const email = String(req.body?.email || '').trim().toLowerCase();
      await anotarFallo(db, REGLA_ENLACE, ipDe(req), email, true);
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Escribe un correo válido.' });
      const generico = { ok: true, mensaje: 'Si ese correo puede entrar, te acabamos de enviar un enlace. Caduca en 20 minutos.' };
      // Puede entrar: tiene cuenta, o está invitado, o el registro está abierto.
      const puede = c.registro !== 'invitacion'
        || (await db.execute(sql`SELECT 1 FROM sitio_miembros WHERE raiz_id = ${c.raiz_id} AND email = ${email} AND estado <> 'bloqueado'`)).rows.length > 0;
      if (!puede) return res.json(generico);
      const token = crypto.randomBytes(32).toString('hex');
      const host = anfitrion(req);
      await db.execute(sql`
        INSERT INTO sitio_enlaces (huella, raiz_id, email, host, caduca)
        VALUES (${huella(token)}, ${c.raiz_id}, ${email}, ${host}, now() + make_interval(mins => ${ENLACE_MIN}))
      `);
      const volver = typeof req.body?.volver === 'string' && req.body.volver.startsWith('/') && !req.body.volver.startsWith('//') ? req.body.volver : '/';
      const url = `${req.protocol === 'http' && host !== 'localhost' ? 'https' : req.protocol}://${req.get('host')}${volver}${volver.includes('?') ? '&' : '?'}acceso=${token}`;
      const nombre = ((await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${c.raiz_id}`)).rows[0] as any)?.title || 'el sitio';
      const enviado = await enviarCorreo({ para: email, asunto: `Tu enlace para entrar en ${nombre}`, texto: `Pulsa este enlace para entrar en ${nombre}. Caduca en ${ENLACE_MIN} minutos y solo sirve una vez:\n\n${url}\n\nSi no lo has pedido tú, ignora este correo.` });
      res.json(!enviado && enDesarrollo ? { ...generico, dev_enlace: url } : generico);
    } catch (e: any) { console.error('sitio enlace:', e); res.status(500).json({ error: e.message }); }
  });

  /** Canjear el enlace mágico (un solo uso, este anfitrión, sin caducar). */
  app.post('/api/sitio-miembros/:raiz/enlace/canjear', guardian(db, REGLA_ENTRAR, () => null), async (req: Request, res: Response) => {
    try {
      const c = await sitioActivo(String(req.params.raiz));
      if (!c) return res.status(404).json({ error: 'Este sitio no tiene miembros.' });
      const r = await db.execute(sql`
        UPDATE sitio_enlaces SET usado_en = now()
        WHERE huella = ${huella(String(req.body?.token || ''))} AND raiz_id = ${c.raiz_id} AND host = ${anfitrion(req)}
          AND usado_en IS NULL AND caduca > now()
        RETURNING email
      `);
      const f = r.rows[0] as any;
      if (!f) {
        await anotarFallo(db, REGLA_ENTRAR, ipDe(req), null, false);
        return res.status(400).json({ error: 'Ese enlace ya no vale: pide otro.' });
      }
      let u = (await db.execute(sql`SELECT id, COALESCE(display_name, name) AS nombre FROM users WHERE lower(email) = ${f.email} AND archived_at IS NULL AND deleted_at IS NULL`)).rows[0] as any;
      if (!u) {
        // Quien entra por enlace sin cuenta: se le crea, sin contraseña (como
        // con Google). Si algún día quiere una, la restablece.
        const id = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
        await db.execute(sql`INSERT INTO users (id, email, role_level, email_verified, created_by) VALUES (${id}, ${f.email}, 1, true, ${id})`);
        u = { id, nombre: null };
      }
      const m = await hacerMiembro(c, { id: u.id, email: f.email, nombre: u.nombre });
      if ('error' in m) return res.status(m.codigo).json({ error: m.error });
      if (m.estado === 'activo') await abrirSesion(req, res, c.raiz_id, m.id);
      res.json(respuestaEstado(m.estado));
    } catch (e: any) { console.error('sitio canjear:', e); res.status(500).json({ error: e.message }); }
  });

  app.post('/api/sitio-miembros/:raiz/salir', async (req: Request, res: Response) => {
    try {
      const raiz = String(req.params.raiz);
      const token = leerCookies(req)[nombreCookie(raiz)];
      if (token) await db.execute(sql`UPDATE sitio_sesiones SET revocada = now() WHERE huella = ${huella(token)}`);
      quitarCookie(res, raiz);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** PEDIR ACCESO a una página que tu categoría no ve: avisa al dueño. */
  app.post('/api/sitio-miembros/:raiz/pedir-acceso', guardian(db, REGLA_PEDIR, r => r.body?.pagina_id), async (req: Request, res: Response) => {
    try {
      const raiz = String(req.params.raiz);
      const m = await miembroActual(db, req, raiz);
      if (!m) return res.status(401).json({ error: 'Entra antes en el sitio.' });
      await anotarFallo(db, REGLA_PEDIR, ipDe(req), m.id, true);
      const p = String(req.body?.pagina_id || raiz);
      const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${p}`)).rows[0] as any;
      const duenyo = ((await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${raiz}`)).rows[0] as any)?.creator_user_id;
      await avisar(db, { paraQuien: duenyo, dePartede: m.userId, tipo: 'miembro_pendiente', entidadTipo: 'sitio_miembros', entidadId: raiz,
        datos: { titulo: t?.title || '', texto: `${m.email} pide acceso${req.body?.mensaje ? `: ${String(req.body.mensaje).slice(0, 200)}` : ''}`, destino: `/paginas/${raiz}/miembros` } });
      res.json({ ok: true, mensaje: 'Hemos avisado a quien gestiona el sitio.' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** GUARDAR una página del sitio en «mis guardados» (permiso «guardar»). */
  app.get('/api/sitio-miembros/:raiz/guardados', async (req: Request, res: Response) => {
    try {
      const m = await miembroActual(db, req, String(req.params.raiz));
      if (!m || m.estado !== 'activo') return res.status(401).json({ error: 'Entra antes en el sitio.' });
      const r = await db.execute(sql`
        SELECT g.pagina_id AS id, w.title AS titulo, g.created_at FROM sitio_guardados g JOIN knowledge_windows w ON w.id = g.pagina_id
        WHERE g.miembro_id = ${m.id} AND w.deleted_at IS NULL ORDER BY g.created_at DESC LIMIT 200
      `);
      res.json({ guardados: r.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/sitio-miembros/:raiz/guardados/:pagina', async (req: Request, res: Response) => {
    try {
      const raiz = String(req.params.raiz);
      const m = await miembroActual(db, req, raiz);
      if (!m || m.estado !== 'activo' || !m.permisos.guardar) return res.status(403).json({ error: 'Tu categoría no puede guardar.' });
      const a = await accesoMiembro(db, req, String(req.params.pagina));
      if (!a || a.sitio.raiz !== raiz || !a.permitido) return res.status(403).json({ error: 'No puedes ver esa página.' });
      await db.execute(sql`INSERT INTO sitio_guardados (miembro_id, pagina_id) VALUES (${m.id}, ${req.params.pagina}) ON CONFLICT DO NOTHING`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/sitio-miembros/:raiz/guardados/:pagina', async (req: Request, res: Response) => {
    try {
      const m = await miembroActual(db, req, String(req.params.raiz));
      if (!m) return res.status(401).json({ error: 'Entra antes en el sitio.' });
      await db.execute(sql`DELETE FROM sitio_guardados WHERE miembro_id = ${m.id} AND pagina_id = ${req.params.pagina}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
