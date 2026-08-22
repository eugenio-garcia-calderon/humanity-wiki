import type { Express, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { registrarRegaloBienvenida } from './puntos.js';
// ══ LOS LÍMITES DE INTENTOS (2026-08-22, prog6) ══════════════════════════════
// Van aquí y no en la lista de módulos por dos razones que no son de estilo:
//
//  1. En Express el orden es comportamiento. Un guardián registrado DESPUÉS de
//     la ruta que protege no llega a ejecutarse nunca: la ruta contesta antes.
//     `registerAuthRoutes` se monta desde `server.ts`, así que el guardián
//     tiene que nacer con ella.
//  2. Y sobre todo: el guardián solo sabe frenar. Quien sabe si la contraseña
//     era buena es la ruta, y por eso cada una avisa con `anotarFallo` o
//     `levantarFreno`. Eso no se puede montar desde fuera.
import { REGLAS, guardian, ipDe, anotarFallo, levantarFreno } from './limites/index.js';

// ============================================================================
// Módulo de autenticación — Fase 2
// ============================================================================
// Implementa 06_SOCIAL_NETWORK.md (4 niveles de usuario) y la parte de
// usuarios/sesiones de 04_DATABASE.md.
//
// Módulo independiente según 03_ARCHITECTURE.md ("cada módulo deberá ser
// independiente; los cambios en un módulo no deberán afectar al resto").
// La única superficie de acoplamiento con el resto del servidor es
// `registerAuthRoutes(app, db)` y el middleware `attachUser` que expone
// `req.user`.

export const ROLE = {
  VISITOR: 0,       // no registrado: solo consulta
  USER: 1,          // publicar, comentar, reaccionar, seguir
  VERIFIED: 2,      // + crear retos/soluciones/productos/demandas en su territorio
  KNOWLEDGE: 3,     // + revisar contenido y crear en cualquier territorio
  ADMIN: 4,         // todo
} as const;

export const ROLE_LABELS: Record<number, string> = {
  0: 'Visitante',
  1: 'Usuario',
  2: 'Usuario verificado',
  3: 'Generador de conocimiento',
  4: 'Administrador',
};

const SESSION_COOKIE = 'rh_session';

/** La papelera de una cuenta borrada. Mismo plazo que la de la Constitución
 *  para el conocimiento: si el contenido se puede recuperar 15 días, la cuenta
 *  que lo escribió también. */
export const DIAS_PAPELERA_CUENTA = 15;

// CUÁNTO DURA UNA SESIÓN. En producción, 30 días: una sesión eterna en un
// ordenador ajeno o robado es un agujero, y 30 días ya es generoso.
//
// EN LOCAL, 10 AÑOS (petición de Eugenio, 2026-08-20: «haz que no se me cierre
// la sesión nunca en este localhost»). Aquí la máquina es la suya, la base de
// datos es de mentira y volver a entrar cada mes mientras desarrollas es una
// molestia sin nada a cambio. La diferencia la marca `NODE_ENV`, que en el
// servidor de verdad vale «production»: si algún día esto se despliega, vuelve
// solo a los 30 días sin que nadie tenga que acordarse.
const SESSION_DAYS = process.env.NODE_ENV === 'production' ? 30 : 3650;

// ----------------------------------------------------------------------------
// Contraseñas
// ----------------------------------------------------------------------------
// scrypt nativo de Node: es un KDF diseñado para contraseñas (resistente a
// GPU/ASIC), viene en la librería estándar y no requiere compilación nativa
// como bcrypt/argon2 — una dependencia menos que mantener, sin perder
// robustez. Formato almacenado: scrypt$N$salt_hex$hash_hex
const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: 8, p: 1 });
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const N = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'hex');
  const expected = Buffer.from(parts[3], 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length, { N, r: 8, p: 1 });
  // Comparación en tiempo constante: evita filtrar información por el tiempo
  // que tarda en fallar.
  return crypto.timingSafeEqual(expected, actual);
}

// ----------------------------------------------------------------------------
// Cookies (sin dependencias)
// ----------------------------------------------------------------------------
function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

/** La huella de un token de un solo uso. Se guarda esto, nunca el token. */
const huellaDeToken = (t: string) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

/**
 * LA SESIÓN VALE TAMBIÉN EN LAS TIENDAS (2026-08-22, Programador 7, a petición
 * de Eugenio al probar los puntos en el carrito). La cookie nacía solo para
 * `humanity.wiki`, así que en `nombre.humanity.wiki` — donde vive la cesta —
 * cualquiera con sesión era un anónimo: ni «pagar con puntos» ni «compra
 * verificada» podían existir allí. Con `COOKIE_DOMAIN=.humanity.wiki` en el
 * entorno, la cookie se emite para todo el dominio y sus subdominios. Sin esa
 * variable (desarrollo, otros despliegues) no cambia nada.
 *
 * Las dos cookies — la antigua de solo `humanity.wiki` y la nueva de dominio —
 * pueden convivir en un navegador que ya tenía sesión. Por eso al poner la
 * nueva se CADUCA la antigua, y al cerrar sesión se caducan las dos: si no,
 * alguien pulsaría «cerrar sesión» y seguiría dentro en el dominio principal.
 */
const dominioCookie = () => (process.env.COOKIE_DOMAIN || '').trim();

function setSessionCookie(res: Response, token: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const base = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
  const dom = dominioCookie();
  if (!dom) { res.setHeader('Set-Cookie', base); return; }
  res.setHeader('Set-Cookie', [
    `${base}; Domain=${dom}`,
    // La de solo-host, caducada: que no quede una segunda sesión pegada.
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  ]);
}

function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const dom = dominioCookie();
  const sinDominio = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  res.setHeader('Set-Cookie', dom ? [sinDominio, `${sinDominio}; Domain=${dom}`] : sinDominio);
}

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------
export interface AuthUser {
  id: string;
  uuid: string;
  email: string;
  name: string | null;
  displayName: string | null;
  roleLevel: number;
  roleLabel: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  socials: Record<string, string>;
  specialties: string[];
  organizationId: string | null;
  reputation: number;
  impactScore: number;
  isAdmin: boolean;
  uiSettings: Record<string, any>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser | null;
      sessionToken?: string | null;
    }
  }
}

function rowToUser(r: any): AuthUser {
  const level = Number(r.role_level ?? 1);
  return {
    id: r.id,
    uuid: r.uuid,
    email: r.email,
    name: r.name ?? null,
    displayName: r.display_name ?? r.name ?? null,
    roleLevel: level,
    roleLabel: ROLE_LABELS[level] || 'Usuario',
    emailVerified: !!r.email_verified,
    avatarUrl: r.avatar_url ?? null,
    bannerUrl: r.banner_url ?? null,
    bio: r.bio ?? null,
    location: r.location ?? null,
    website: r.website ?? null,
    socials: r.socials ?? {},
    specialties: r.specialties ?? [],
    organizationId: r.organization_id ?? null,
    reputation: Number(r.reputation ?? 0),
    impactScore: Number(r.impact_score ?? 0),
    isAdmin: level >= ROLE.ADMIN,
    uiSettings: r.ui_settings ?? {},
  };
}

// ----------------------------------------------------------------------------
// Registro de rutas
// ----------------------------------------------------------------------------
/** Los 14 objetivos que existen. Se comprueba contra esto y no contra la base
 *  en cada guardado: son catorce filas fijas desde que existe la plataforma, y
 *  una consulta por perfil guardado para verificar una constante es un viaje
 *  que no lleva a nada. */
const OBJETIVOS_VALIDOS = new Set([
  'O001', 'O002', 'O003', 'O004', 'O005', 'O006', 'O007',
  'O008', 'O009', 'O010', 'O011', 'O012', 'O013', 'O014',
]);

export function registerAuthRoutes(app: Express, db: any) {

  // Middleware: resuelve req.user a partir de la cookie de sesión. Se monta
  // para TODA la aplicación, así cualquier endpoint puede consultar
  // req.user sin repetir lógica.
  const attachUser = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      req.user = null;
      req.sessionToken = token || null;
      if (!token) return next();

      const result = await db.execute(sql`
        SELECT u.* FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ${token}
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
          AND u.archived_at IS NULL
          -- UNA CUENTA EN LA PAPELERA NO TIENE SESIÓN. Al pedir el borrado se
          -- revocan todas, pero esto es el cinturón: si alguna sobreviviera
          -- —otro dispositivo, una carrera— seguiría dando acceso a una cuenta
          -- que su dueño ha pedido borrar. Volver se hace por la puerta, con
          -- contraseña, que es lo que cancela el borrado a propósito.
          AND u.deleted_at IS NULL
      `);
      const row = result.rows[0];
      if (row) {
        req.user = rowToUser(row);
        // Best-effort: no bloquea la petición si falla.
        db.execute(sql`UPDATE sessions SET last_seen_at = now() WHERE token = ${token}`).catch(() => {});
      }
    } catch (e) {
      console.error('attachUser error:', e);
      req.user = null;
    }
    next();
  };
  app.use(attachUser);

  const createSession = async (req: Request, res: Response, userId: string) => {
    const token = crypto.randomBytes(32).toString('hex');
    const maxAge = SESSION_DAYS * 24 * 60 * 60;
    await db.execute(sql`
      INSERT INTO sessions (token, user_id, expires_at, user_agent, ip)
      VALUES (${token}, ${userId}, now() + interval '${sql.raw(String(SESSION_DAYS))} days',
              ${req.header('user-agent') || null}, ${req.ip || null})
    `);
    await db.execute(sql`UPDATE users SET last_login_at = now() WHERE id = ${userId}`);
    setSessionCookie(res, token, maxAge);
    return token;
  };

  // --------------------------------------------------------------------------
  // POST /api/auth/register
  // --------------------------------------------------------------------------
  app.post('/api/auth/register', guardian(REGLAS.registro, r => r.body?.email), async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();

      const existing = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${normalizedEmail}`);
      if (existing.rows.length > 0) {
        // Este 409 dice «ese correo ya está registrado», y repetido en serie es
        // una forma de averiguar quién tiene cuenta aquí. Frenarlo es el motivo
        // de que el registro tenga límite, no el registro en sí.
        await anotarFallo(db, REGLAS.registro, ipDe(req), normalizedEmail, true);
        return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
      }

      const id = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
      // email_verified se marca true de momento: no hay proveedor de correo
      // configurado todavía (decisión del usuario: avanzar sin verificación).
      // Cuando se configure, basta con ponerlo a false y activar el envío.
      await db.execute(sql`
        INSERT INTO users (id, email, name, display_name, password_hash, role_level, email_verified, created_by)
        VALUES (${id}, ${normalizedEmail}, ${name || null}, ${name || null},
                ${hashPassword(String(password))}, ${ROLE.USER}, true, ${id})
      `);
      // El regalo de bienvenida: `users.puntos` ya nace en 100 por el valor
      // por defecto de la columna (migración 0026) — no se vuelve a sumar
      // aquí, solo se deja su justificante en el libro de movimientos.
      await registrarRegaloBienvenida(db, id);

      await createSession(req, res, id);
      const result = await db.execute(sql`SELECT * FROM users WHERE id = ${id}`);
      res.json({ user: rowToUser(result.rows[0]) });
    } catch (e: any) {
      console.error('register error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // Login con Google (Fase 13) — Google Identity Services
  // --------------------------------------------------------------------------
  // El frontend obtiene un ID token (JWT) del botón de Google y lo manda
  // aquí. Se verifica contra el endpoint oficial de Google (tokeninfo) sin
  // añadir dependencias: audiencia = nuestro client id y email verificado.
  // Si el usuario existe (por google_id o por email) se vincula/inicia
  // sesión; si no, se crea con nivel 1 — sin contraseña.

  /** Configuración pública de autenticación (qué proveedores están activos). */
  app.get('/api/auth/config', (_req: Request, res: Response) => {
    res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
  });

  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return res.status(503).json({ error: 'El login con Google no está configurado.' });
      const { credential } = req.body || {};
      if (!credential) return res.status(400).json({ error: 'Falta el token de Google.' });

      const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(String(credential))}`);
      if (!infoRes.ok) return res.status(401).json({ error: 'Token de Google inválido.' });
      const info: any = await infoRes.json();

      if (info.aud !== clientId) return res.status(401).json({ error: 'Token de Google de otra aplicación.' });
      if (info.email_verified !== 'true' && info.email_verified !== true) {
        return res.status(401).json({ error: 'Tu email de Google no está verificado.' });
      }
      const googleId = String(info.sub);
      const email = String(info.email).trim().toLowerCase();

      // 1) ¿Ya vinculado a Google?
      let row = (await db.execute(sql`SELECT * FROM users WHERE google_id = ${googleId} AND archived_at IS NULL`)).rows[0];

      // 2) ¿Cuenta existente con ese email? → vincular (Google verifica el
      //    email, así que es el mismo dueño).
      if (!row) {
        const byEmail = (await db.execute(sql`SELECT * FROM users WHERE lower(email) = ${email} AND archived_at IS NULL`)).rows[0];
        if (byEmail) {
          await db.execute(sql`
            UPDATE users SET google_id = ${googleId}, email_verified = true,
              avatar_url = COALESCE(avatar_url, ${info.picture || null})
            WHERE id = ${(byEmail as any).id}
          `);
          row = (await db.execute(sql`SELECT * FROM users WHERE id = ${(byEmail as any).id}`)).rows[0];
        }
      }

      // 3) Usuario nuevo: alta con nivel 1, sin contraseña.
      if (!row) {
        const id = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
        await db.execute(sql`
          INSERT INTO users (id, email, name, display_name, avatar_url, google_id, role_level, email_verified, created_by)
          VALUES (${id}, ${email}, ${info.name || null}, ${info.name || null},
                  ${info.picture || null}, ${googleId}, ${ROLE.USER}, true, ${id})
        `);
        await registrarRegaloBienvenida(db, id);
        row = (await db.execute(sql`SELECT * FROM users WHERE id = ${id}`)).rows[0];
      }

      // VOLVER CANCELA EL BORRADO, TAMBIÉN POR AQUÍ. Sin esto, quien entró con
      // Google podría pedir el borrado y no tener forma de arrepentirse: la
      // papelera de 15 días existiría para él en la base de datos y no en la
      // práctica. Misma regla que en el inicio de sesión con contraseña.
      let recuperada = false;
      if ((row as any).deleted_at && !(row as any).anonimizado_en) {
        await db.execute(sql`UPDATE users SET deleted_at = NULL, updated_at = now() WHERE id = ${(row as any).id}`);
        (row as any).deleted_at = null;
        recuperada = true;
        console.warn('[cuenta] borrado cancelado al entrar con Google:', (row as any).id);
      }

      await createSession(req, res, (row as any).id);
      res.json({ user: rowToUser(row), ...(recuperada ? { borrado_cancelado: true } : {}) });
    } catch (e: any) {
      console.error('google login error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // POST /api/auth/login
  // --------------------------------------------------------------------------
  // El guardián primero: si toca esperar, la ruta ni se ejecuta. La cuenta que
  // se mira es la que viene en el cuerpo, para que el freno sea por cuenta Y
  // por IP y no solo por una de las dos.
  app.post('/api/auth/login', guardian(REGLAS.login, r => r.body?.email), async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const result = await db.execute(sql`
        SELECT * FROM users WHERE lower(email) = ${normalizedEmail} AND archived_at IS NULL
      `);
      const row = result.rows[0];

      // Mismo mensaje y mismo coste aproximado tanto si el email no existe
      // como si la contraseña es incorrecta, para no revelar qué emails están
      // registrados.
      if (!row || !verifyPassword(String(password), row.password_hash)) {
        // Se anota si existía o no la cuenta: distingue «se equivocó de
        // contraseña» de «está probando a ver qué correos hay dados de alta»,
        // que son dos ataques distintos. Al que intenta no se le dice nada
        // diferente — el mensaje y el coste siguen siendo los mismos.
        await anotarFallo(db, REGLAS.login, ipDe(req), normalizedEmail, !!row);
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
      }

      // ACERTÓ: se levanta el freno, y SOLO el freno. `intentos_fallidos` no se
      // toca. Si se limpiara, quien prueba mil contraseñas y acierta la última
      // se llevaría borrado su propio rastro — que es justo el caso que hay que
      // poder ver después.
      levantarFreno(REGLAS.login, ipDe(req), normalizedEmail);

      // ══ VOLVER CANCELA EL BORRADO ══════════════════════════════════════
      // La papelera de 15 días no es un plazo administrativo: es que alguien
      // borre su cuenta un mal día y vuelva el jueves. Que entrar la recupere,
      // **sin un paso más y sin tener que pedirlo a nadie**, es lo que la hace
      // de verdad reversible.
      //
      // Solo llega aquí quien ha puesto su contraseña bien, así que cancelarlo
      // no lo puede hacer otro. Y pasados los 15 días la cuenta ya está vacía:
      // no hay contraseña con la que entrar, así que este camino ya no existe.
      let recuperada = false;
      if (row.deleted_at && !row.anonimizado_en) {
        await db.execute(sql`UPDATE users SET deleted_at = NULL, updated_at = now() WHERE id = ${row.id}`);
        row.deleted_at = null;
        recuperada = true;
        console.warn('[cuenta] borrado cancelado al volver a entrar:', row.id);
      }

      await createSession(req, res, row.id);
      res.json({ user: rowToUser(row), ...(recuperada ? { borrado_cancelado: true } : {}) });
    } catch (e: any) {
      console.error('login error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // POST /api/auth/logout
  // --------------------------------------------------------------------------
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      if (req.sessionToken) {
        await db.execute(sql`UPDATE sessions SET revoked_at = now() WHERE token = ${req.sessionToken}`);
      }
      clearSessionCookie(res);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/auth/me — sesión actual
  // --------------------------------------------------------------------------
  app.get('/api/auth/me', (req: Request, res: Response) => {
    res.json({ user: req.user || null });
  });

  // --------------------------------------------------------------------------
  // PUT /api/auth/me — editar el propio perfil
  // --------------------------------------------------------------------------
  app.put('/api/auth/me', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado.' });
      const d = req.body || {};
      // El rol NUNCA se toca aquí: un usuario no puede ascenderse a sí mismo.
      // Eso solo ocurre por /api/admin/users/:id/role, que exige nivel 4.
      await db.execute(sql`
        UPDATE users SET
          name = COALESCE(${d.name ?? null}, name),
          display_name = COALESCE(${d.display_name ?? null}, display_name),
          avatar_url = COALESCE(${d.avatar_url ?? null}, avatar_url),
          banner_url = COALESCE(${d.banner_url ?? null}, banner_url),
          bio = COALESCE(${d.bio ?? null}, bio),
          location = COALESCE(${d.location ?? null}, location),
          website = COALESCE(${d.website ?? null}, website),
          socials = COALESCE(${d.socials ? JSON.stringify(d.socials) : null}::jsonb, socials),
          specialties = COALESCE(${d.specialties ? JSON.stringify(d.specialties) : null}::jsonb, specialties),
          -- HASTA TRES UBICACIONES, Y EL TOPE SE APLICA AQUÍ (2026-08-22). Si
          -- solo lo comprobara la pantalla, cualquiera podría mandar treinta
          -- desde fuera y el perfil de otro se llenaría de banderas. El límite
          -- va donde no se puede saltar.
          ubicaciones = COALESCE(${d.ubicaciones ? JSON.stringify((d.ubicaciones as any[]).slice(0, 3)) : null}::jsonb, ubicaciones),
          -- LOS OBJETIVOS, FILTRADOS CONTRA EL CATÁLOGO REAL. Solo entran ids
          -- que existen: uno inventado se pintaría como un hueco sin nombre.
          objetivos = COALESCE(${d.objetivos ? JSON.stringify((d.objetivos as any[]).filter(o => OBJETIVOS_VALIDOS.has(String(o))).slice(0, 14)) : null}::jsonb, objetivos),
          organization_id = COALESCE(${d.organization_id ?? null}, organization_id),
          version = version + 1,
          updated_at = now(),
          updated_by = ${req.user.id}
        WHERE id = ${req.user.id}
      `);

      for (const [table, col, ids] of [
        ['user_territories', 'territory_id', d.territory_ids],
        ['user_objectives', 'objective_id', d.objective_ids],
        ['user_indicators', 'indicator_id', d.indicator_ids],
      ] as const) {
        if (!Array.isArray(ids)) continue;
        await db.execute(sql`DELETE FROM ${sql.raw(table)} WHERE user_id = ${req.user.id}`);
        for (const v of ids) {
          await db.execute(sql`
            INSERT INTO ${sql.raw(table)} (user_id, ${sql.raw(col)}) VALUES (${req.user.id}, ${v})
            ON CONFLICT DO NOTHING
          `);
        }
      }

      const result = await db.execute(sql`SELECT * FROM users WHERE id = ${req.user.id}`);
      res.json({ user: rowToUser(result.rows[0]) });
    } catch (e: any) {
      console.error('update profile error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // PUT /api/auth/ui-settings — preferencias de interfaz (ancho de paneles...)
  // --------------------------------------------------------------------------
  // Separado de PUT /api/auth/me porque se llama muy a menudo (cada vez que
  // el usuario suelta un panel redimensionado) y hace una fusión superficial
  // jsonb (`||`) en vez de reemplazar el perfil entero.
  app.put('/api/auth/ui-settings', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado.' });
      const patch = req.body || {};
      const result = await db.execute(sql`
        UPDATE users SET ui_settings = ui_settings || ${JSON.stringify(patch)}::jsonb
        WHERE id = ${req.user.id}
        RETURNING *
      `);
      res.json({ user: rowToUser(result.rows[0]) });
    } catch (e: any) {
      console.error('update ui-settings error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // POST /api/auth/password/change
  // --------------------------------------------------------------------------
  app.post('/api/auth/password/change', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'No autenticado.' });
      const { current_password, new_password } = req.body || {};
      if (!new_password || String(new_password).length < 8) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      }
      const result = await db.execute(sql`SELECT password_hash FROM users WHERE id = ${req.user.id}`);
      if (!verifyPassword(String(current_password || ''), result.rows[0]?.password_hash)) {
        return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
      }
      await db.execute(sql`
        UPDATE users SET password_hash = ${hashPassword(String(new_password))},
          version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.user.id}
      `);
      // Cambiar la contraseña cierra las demás sesiones: si alguien te la
      // había robado, deja de tener acceso.
      await db.execute(sql`
        UPDATE sessions SET revoked_at = now()
        WHERE user_id = ${req.user.id} AND token <> ${req.sessionToken} AND revoked_at IS NULL
      `);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // BORRAR LA CUENTA — obligatorio en App Store y Google Play (2026-08-22)
  // --------------------------------------------------------------------------
  // Una aplicación que deja crear cuenta y no deja borrarla se rechaza. Esto
  // bloqueaba el lanzamiento en las dos tiendas.
  //
  // Lo decidió Eugenio así: el contenido se anonimiza y **se queda** —nadie
  // pierde lo que construyó encima de lo que escribió otro— y hay papelera de
  // 15 días. La fila no se borra: **49 tablas apuntan a `users`**, y borrarla
  // se llevaría por delante proyectos, mensajes y los comentarios que otras
  // personas dejaron debajo. Se vacía, que es lo que la ley pide.
  //
  // ── POR QUÉ PIDE LA CONTRASEÑA OTRA VEZ ─────────────────────────────────
  // Un `POST` sin fricción es un borrado por accidente y, peor, un borrado
  // ajeno: bastaría con que alguien te hiciera cargar una página con un
  // formulario apuntando aquí. Volver a escribir la contraseña demuestra que
  // quien lo pide está delante del teclado. Es la misma razón por la que
  // cambiar una contraseña pide la anterior.
  app.post('/api/auth/borrar-cuenta', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const { password, correo } = req.body || {};
      const r = await db.execute(sql`SELECT id, email, password_hash, deleted_at FROM users WHERE id = ${req.user.id}`);
      const row = r.rows[0] as any;
      if (!row) return res.status(404).json({ error: 'Esa cuenta ya no existe.' });

      // ══ QUIEN ENTRÓ CON GOOGLE NO TIENE CONTRASEÑA ═══════════════════════
      // Este endpoint salió pidiendo `password` y comprobándola siempre. Para
      // una cuenta de Google `password_hash` es `null`, `verifyPassword`
      // devuelve `false` con cualquier cosa, y el resultado era que **esas
      // personas no podían borrar su cuenta por ninguna vía** — con el añadido
      // de que el mensaje les decía «la contraseña no es correcta» sobre una
      // contraseña que nunca tuvieron. Lo encontró el Programador 3 leyendo el
      // código desplegado.
      //
      // Y no es un caso raro: **Apple exige el borrado desde dentro de la
      // aplicación**. Si una parte de los usuarios no puede, el requisito
      // sigue incumplido y el rechazo llega igual.
      //
      // ── POR QUÉ EL CORREO Y NO «CREA UNA CONTRASEÑA PRIMERO» ─────────────
      // Escribir tu propio correo es fricción equivalente: hay que teclear algo
      // que solo tú sabes que es tuyo, y no se puede hacer con un formulario
      // ajeno cargado a traición. Obligar a inventarse una credencial NUEVA
      // como paso previo a marcharse es justo el patrón oscuro que estas normas
      // de tienda existen para evitar.
      const conContrasena = !!row.password_hash;
      if (conContrasena) {
        if (!password) {
          return res.status(400).json({ error: 'Escribe tu contraseña para confirmar que eres tú.', pide: 'contrasena' });
        }
        if (!verifyPassword(String(password), row.password_hash)) {
          return res.status(401).json({ error: 'La contraseña no es correcta.' });
        }
      } else {
        // El mensaje DICE cuál es la confirmación que hace falta, en vez de
        // dejar a la pantalla adivinarla.
        if (!correo) {
          return res.status(400).json({
            error: 'Esta cuenta entra con Google y no tiene contraseña. Escribe tu correo para confirmar.',
            pide: 'correo',
          });
        }
        if (String(correo).trim().toLowerCase() !== String(row.email).trim().toLowerCase()) {
          return res.status(401).json({ error: 'Ese correo no es el de esta cuenta.' });
        }
      }
      // Pedirlo dos veces no hace nada nuevo, y sobre todo NO reinicia la
      // cuenta atrás: si no, quien insistiera se alejaría del vaciado en vez
      // de acercarse.
      if (row.deleted_at) {
        return res.json({ ok: true, ya_estaba: true, dias: DIAS_PAPELERA_CUENTA });
      }

      await db.execute(sql`
        UPDATE users SET deleted_at = now(), updated_at = now() WHERE id = ${row.id}
      `);
      // Todas las sesiones fuera, en todos sus dispositivos. Una cuenta que se
      // está borrando no puede quedarse abierta en el móvil de nadie.
      await db.execute(sql`
        UPDATE sessions SET revoked_at = now() WHERE user_id = ${row.id} AND revoked_at IS NULL
      `);
      clearSessionCookie(res);
      console.warn('[cuenta] borrado pedido:', row.id);
      res.json({
        ok: true,
        dias: DIAS_PAPELERA_CUENTA,
        mensaje: `Tu cuenta se borrará en ${DIAS_PAPELERA_CUENTA} días. Si vuelves a entrar antes, se cancela.`,
      });
    } catch (e: any) {
      console.error('borrar cuenta:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Cancelar sin llegar a entrar del todo. `POST /api/auth/login` ya lo cancela
  // por su cuenta; esto existe para una pantalla que diga «has pedido borrar tu
  // cuenta, ¿seguro?» sin obligar a navegar a otro sitio. Pide la contraseña
  // por lo mismo que el borrado.
  app.post('/api/auth/cancelar-borrado', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
      const r = await db.execute(sql`
        SELECT * FROM users WHERE lower(email) = ${String(email).trim().toLowerCase()} AND archived_at IS NULL
      `);
      const row = r.rows[0] as any;
      if (!row || !verifyPassword(String(password), row.password_hash)) {
        // Una cuenta de Google no tiene contraseña, así que por aquí no puede
        // cancelar nada — y no hace falta: entrar con Google lo cancela solo,
        // igual que entrar con contraseña. Esta ruta existe para una pantalla
        // que pregunte «¿seguro?» sin navegar a otro sitio, no como único
        // camino.
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
      }
      // Ya vaciada: no hay nada que cancelar y no se puede deshacer. Se dice
      // claro en vez de fingir que ha funcionado.
      if (row.anonimizado_en) {
        return res.status(410).json({ error: 'Esa cuenta ya se borró y no se puede recuperar.' });
      }
      if (!row.deleted_at) return res.json({ ok: true, ya_estaba: true });

      await db.execute(sql`UPDATE users SET deleted_at = NULL, updated_at = now() WHERE id = ${row.id}`);
      console.warn('[cuenta] borrado cancelado:', row.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // Recuperación de contraseña
  // --------------------------------------------------------------------------
  // Estructura completa y funcional salvo el envío del correo, que queda
  // pendiente de configurar un proveedor. En desarrollo, el token se devuelve
  // en la respuesta para poder probar el flujo de extremo a extremo; en
  // producción NUNCA debe devolverse (ver comprobación de NODE_ENV).
  app.post('/api/auth/password/forgot', guardian(REGLAS.restablecer, r => r.body?.email), async (req: Request, res: Response) => {
    try {
      const email = String((req.body || {}).email || '').trim().toLowerCase();
      const result = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${email} AND archived_at IS NULL`);
      const row = result.rows[0];

      // Respuesta idéntica exista o no la cuenta: no se revela qué emails
      // están registrados.
      const genericResponse: any = { success: true, message: 'Si existe una cuenta con ese email, recibirás instrucciones.' };

      // AQUÍ SE CUENTA CADA PETICIÓN, ACIERTE O NO, y es la única puerta donde
      // se hace así. En las otras dos «fallo» es equivocarse; aquí no hay nada
      // que acertar: pedir el enlace cien veces seguidas es el abuso, exista la
      // cuenta o no. Y como la respuesta es idéntica en los dos casos, contar
      // solo una de las ramas convertiría el freno en la pista que la respuesta
      // se cuida de no dar.
      await anotarFallo(db, REGLAS.restablecer, ipDe(req), email, !!row);

      if (!row) return res.json(genericResponse);

      const token = crypto.randomBytes(32).toString('hex');
      // SE GUARDA LA HUELLA, NUNCA EL TOKEN. Hasta hoy esta tabla guardaba el
      // token tal cual: quien leyera la base de datos —una copia de seguridad,
      // una réplica, un `pg_dump` pegado en un chat— se llevaba todos los
      // enlaces de restablecer vivos, y con cada uno se cambia la contraseña de
      // esa persona sin saber la anterior. Es el mismo patrón que
      // `agentes_ia.token_hash` usa desde el primer día. Lo encontró el
      // Programador 4 revisando otra cosa.
      //
      // La columna `token` se sigue rellenando con un valor inservible mientras
      // exista: es la clave primaria de la tabla y no se puede dejar vacía.
      await db.execute(sql`
        INSERT INTO password_resets (token, token_hash, user_id, expires_at)
        VALUES (${'gastado-' + crypto.randomUUID()}, ${huellaDeToken(token)}, ${row.id}, now() + interval '1 hour')
      `);

      // TODO(correo): enviar el enlace por email cuando haya proveedor.
      if (process.env.NODE_ENV !== 'production') {
        genericResponse.dev_token = token;
        genericResponse.dev_note = 'Token expuesto solo en desarrollo: no hay proveedor de correo configurado todavía.';
      }
      res.json(genericResponse);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/password/reset', async (req: Request, res: Response) => {
    try {
      const { token, new_password } = req.body || {};
      if (!token || !new_password || String(new_password).length < 8) {
        return res.status(400).json({ error: 'Token y contraseña (mínimo 8 caracteres) obligatorios.' });
      }
      // GASTAR Y LEER EN UNA SOLA SENTENCIA. Antes eran dos —`SELECT` y luego
      // `UPDATE`— y entre las dos hay una rendija: dos peticiones que llegan a
      // la vez pasan las dos el `SELECT` y las dos cambian la contraseña. Con
      // `RETURNING` decide la base de datos y solo gana una.
      const result = await db.execute(sql`
        UPDATE password_resets SET used_at = now()
        WHERE token_hash = ${huellaDeToken(String(token))}
          AND used_at IS NULL AND expires_at > now()
        RETURNING user_id
      `);
      const row = result.rows[0];
      // Inválido, caducado y ya usado dan la MISMA respuesta: distinguirlos le
      // regala a quien prueba tokens la información de si acertó alguno.
      if (!row) return res.status(400).json({ error: 'Token inválido o caducado.' });

      await db.execute(sql`
        UPDATE users SET password_hash = ${hashPassword(String(new_password))},
          version = version + 1, updated_at = now() WHERE id = ${row.user_id}
      `);
      // Restablecer la contraseña cierra todas las sesiones abiertas.
      await db.execute(sql`UPDATE sessions SET revoked_at = now() WHERE user_id = ${row.user_id} AND revoked_at IS NULL`);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --------------------------------------------------------------------------
  // Administración de usuarios (nivel 4)
  // --------------------------------------------------------------------------
  app.get('/api/admin/users', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const result = await db.execute(sql`
        SELECT id, uuid, email, name, display_name, role_level, email_verified,
               reputation, impact_score, puntos, last_login_at, created_at, archived_at
        FROM users ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/admin/users   { email, name?, role_level? }
   * Un administrador da de alta una cuenta directamente, sin que la persona
   * tenga que pasar por /login → «Crear una cuenta» (petición del usuario:
   * «tampoco me deja registrar usuarios nuevos desde esa página siendo
   * ADMIN»). Nace con una contraseña aleatoria que NUNCA se transmite en
   * claro: en su lugar se genera de una vez el mismo enlace de
   * restablecimiento que usa «Contraseña» en el resto de la tabla, listo
   * para copiar y entregar. No crea sesión — el navegador del admin sigue
   * siendo el del admin.
   */
  app.post('/api/admin/users', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Escribe un email válido.' });
      }
      const name = String(req.body?.name || '').trim() || null;
      const roleLevel = [0, 1, 2, 3, 4].includes(Number(req.body?.role_level)) ? Number(req.body.role_level) : ROLE.USER;

      const existente = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${email}`);
      if (existente.rows.length > 0) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
      }

      const id = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await db.execute(sql`
        INSERT INTO users (id, email, name, display_name, password_hash, role_level, email_verified, created_by, updated_by)
        VALUES (${id}, ${email}, ${name}, ${name},
                ${hashPassword(crypto.randomBytes(24).toString('hex'))}, ${roleLevel}, true, ${req.user.id}, ${req.user.id})
      `);
      await registrarRegaloBienvenida(db, id);

      const token = crypto.randomBytes(32).toString('hex');
      await db.execute(sql`
        INSERT INTO password_resets (token, token_hash, user_id, expires_at)
        VALUES (${'gastado-' + crypto.randomUUID()}, ${huellaDeToken(token)}, ${id}, now() + interval '24 hours')
      `);
      res.json({ id, email, url: `/restablecer?token=${token}`, caduca_horas: 24 });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/users/:id/role', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const level = Number((req.body || {}).role_level);
      if (![0, 1, 2, 3, 4].includes(level)) {
        return res.status(400).json({ error: 'Nivel de rol inválido (0-4).' });
      }
      // Un administrador no puede quitarse a sí mismo el nivel 4: evita
      // quedarse sin ningún administrador por accidente.
      if (req.params.id === req.user.id && level < ROLE.ADMIN) {
        return res.status(400).json({ error: 'No puedes reducir tu propio nivel de administrador.' });
      }
      await db.execute(sql`
        UPDATE users SET role_level = ${level}, version = version + 1,
          updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id}
      `);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/admin/users/:id/reset-link
   * Un administrador genera un enlace de restablecimiento para entregárselo
   * al usuario por el canal que sea (no hay proveedor de correo todavía).
   * Reutiliza la misma tabla y la misma página /restablecer que el flujo de
   * «he olvidado mi contraseña»; el token caduca en 24 h.
   */
  app.post('/api/admin/users/:id/reset-link', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const fila = await db.execute(sql`SELECT id, email FROM users WHERE id = ${req.params.id} AND archived_at IS NULL`);
      if (!fila.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado.' });
      const token = crypto.randomBytes(32).toString('hex');
      await db.execute(sql`
        INSERT INTO password_resets (token, user_id, expires_at)
        VALUES (${token}, ${req.params.id}, now() + interval '24 hours')
      `);
      res.json({ url: `/restablecer?token=${token}`, caduca_horas: 24, email: (fila.rows[0] as any).email });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/admin/users/:id/archivar  y  /restaurar
   * «Borrar» un usuario es archivarlo (regla 6 de la Constitución: nunca un
   * DELETE a secas): no puede volver a entrar —login, Google y attachUser
   * filtran archived_at— y sus sesiones abiertas se revocan al momento, pero
   * lo que publicó no se destruye. Restaurar deshace todo salvo las sesiones.
   */
  app.post('/api/admin/users/:id/archivar', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'No puedes borrarte a ti mismo.' });
      }
      const r = await db.execute(sql`
        UPDATE users SET archived_at = now(), version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id} AND archived_at IS NULL RETURNING email
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado (o ya estaba borrado).' });
      await db.execute(sql`UPDATE sessions SET revoked_at = now() WHERE user_id = ${req.params.id} AND revoked_at IS NULL`);
      res.json({ success: true, email: (r.rows[0] as any).email });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/users/:id/restaurar', async (req: Request, res: Response) => {
    try {
      if (!req.user || req.user.roleLevel < ROLE.ADMIN) {
        return res.status(403).json({ error: 'Requiere nivel de administrador.' });
      }
      const r = await db.execute(sql`
        UPDATE users SET archived_at = NULL, version = version + 1, updated_at = now(), updated_by = ${req.user.id}
        WHERE id = ${req.params.id} AND archived_at IS NOT NULL RETURNING email
      `);
      if (!r.rows[0]) return res.status(404).json({ error: 'Usuario no encontrado (o no estaba borrado).' });
      res.json({ success: true, email: (r.rows[0] as any).email });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}

// ----------------------------------------------------------------------------
// Guardas reutilizables para el resto de módulos
// ----------------------------------------------------------------------------
export function requireLevel(min: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    if (req.user.roleLevel < min) {
      return res.status(403).json({ error: `Requiere nivel ${min} (${ROLE_LABELS[min]}) o superior.` });
    }
    next();
  };
}
