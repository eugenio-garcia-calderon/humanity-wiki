import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { avisar } from './avisos.js';
import { enviarCorreo, hayCorreo } from './correo.js';
import { bloquesDe } from './bloquesSql.js';
import { sitioYRegla, permisosDe } from './miembros.js';

// ============================================================================
// PERMISOS FINOS POR PÁGINA (2026-10-05, carril «acceso», #12)
// ============================================================================
// Eugenio: igualar a Notion en «compartir». Cuatro roles por página —Ver,
// Comentar, Editar, Administrar—, invitar por correo aunque esa persona aún no
// tenga cuenta, dar acceso a un equipo entero de una vez, y que una página
// hija herede los permisos de su madre salvo que se cambien.
//
// ── UNA SOLA FUNCIÓN DICE QUIÉN PUEDE QUÉ ───────────────────────────────────
// Hasta hoy la pregunta «¿puede esta persona editar esta página?» estaba
// escrita tres veces (`documentos.ts`, `knowledge.ts`, `ai/paginaIA.ts`), cada
// una con su consulta a `accesos_entidad`. Tres copias de una regla son tres
// reglas el día que alguien cambia una. Ahora las tres llaman a `rolEnPagina`
// y la regla vive aquí.
//
// ── DE DÓNDE SALE EL ROL DE ALGUIEN EN UNA PÁGINA ───────────────────────────
//   1. Quien la creó es su dueño. Un administrador de la plataforma, también.
//   2. Su fila en `accesos_entidad` (persona) o la de un equipo suyo en
//      `accesos_equipo`.
//   3. Si la página hereda (sin fila en `accesos_herencia`, o `hereda`), lo
//      mismo de su madre, y de la madre de su madre… Gana el rol más alto.
//
// ── LA HERENCIA NO PUEDE SER UNA PUERTA TRASERA ─────────────────────────────
// «Madre» ya tenía significado en la casa (`sitios.ts`): la página que tiene
// un bloque «Página» apuntando a ésta, o la que contiene la base de datos de
// la que esta página es una fila. Pero ese bloque lo puede escribir
// CUALQUIERA en SU página con el id de una página AJENA. Si la herencia
// subiera por ahí sin más, bastaría con enlazar la página privada de otra
// persona desde una mía y darle «Editar» de la mía a un amigo: el amigo
// editaría la de la víctima.
//
// Por eso un eslabón madre→hija SOLO cuenta si la madre es de la misma
// persona que la hija (bloque «Página»), o si la base de datos es de quien
// tiene la página madre (fila de base de datos: las filas las crea quien
// edita, pero la tabla es del dueño). `madresValidas` es esa regla, en SQL,
// y la usa también `sitios.ts` para la visibilidad heredada.
//
// ── LO QUE «ADMINISTRAR» NO ES ──────────────────────────────────────────────
// Administrar es decidir quién entra. No es borrar la página ni publicarla en
// la web: eso sigue siendo de quien la creó. Dar la llave de la puerta no es
// regalar la casa.

export const ROLES = ['ver', 'comentar', 'editar', 'admin'] as const;
export type Rol = typeof ROLES[number];
/** El dueño está por encima de todo rol que se pueda dar. */
export type RolEfectivo = Rol | 'duenyo';

const RANGO: Record<RolEfectivo, number> = { ver: 1, comentar: 2, editar: 3, admin: 4, duenyo: 5 };
export const rango = (r: RolEfectivo | null | undefined) => (r ? RANGO[r] : 0);
export const esRol = (r: unknown): r is Rol => typeof r === 'string' && (ROLES as readonly string[]).includes(r);
const mayor = (a: RolEfectivo | null, b: RolEfectivo | null) => (rango(a) >= rango(b) ? a : b);

/** Cuántos saltos hacia arriba como mucho. Igual que `sitios.ts`. */
export const PROFUNDIDAD = 8;
const ADMIN_PLATAFORMA = 4;

/**
 * Las madres VÁLIDAS de la página `hija` (una expresión SQL de id de texto),
 * como subconsulta de una columna `id`. Ver la cabecera: sólo cuentan los
 * eslabones que no puede fabricar un tercero.
 */
export const madresValidas = (hija: any) => sql`
  SELECT w.id FROM bd_filas f
  JOIN knowledge_windows h ON h.id = f.pagina_id
  JOIN bd_tablas t ON t.id = f.tabla_id
  JOIN knowledge_windows w ON w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
    AND ${bloquesDe('w')} @> jsonb_build_array(jsonb_build_object('tabla_id', f.tabla_id))
    AND w.creator_user_id = t.creador_user_id
  WHERE f.pagina_id = ${hija} AND f.deleted_at IS NULL
  UNION
  SELECT w.id FROM knowledge_windows w
  JOIN knowledge_windows h ON h.id = ${hija}
  WHERE w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
    AND w.creator_user_id = h.creator_user_id
    AND ${bloquesDe('w')} @> jsonb_build_array(jsonb_build_object('tipo', 'subpagina', 'entityId', ${hija}))
`;

export type Quien = { id: string; nivel: number } | null;
export const quienDe = (req: Request): Quien => (req.user ? { id: req.user.id, nivel: req.user.roleLevel ?? 0 } : null);

export interface Acceso {
  /** El rol que tiene; null si ninguno (puede verla igual si es pública). */
  rol: RolEfectivo | null;
  /** Si su mejor rol le llega de una madre, cuál. */
  heredadoDe: { id: string; titulo: string } | null;
  existe: boolean;
  publico: boolean;
  duenyo: string | null;
}

/**
 * EL ROL DE UNA PERSONA EN UNA PÁGINA. Una consulta: sube por las madres
 * válidas mientras la página herede, y en cada escalón mira la fila de la
 * persona y las de sus equipos.
 */
export async function rolEnPagina(db: any, quien: Quien, paginaId: string): Promise<Acceso> {
  const base = (await db.execute(sql`
    SELECT creator_user_id, publico FROM knowledge_windows
    WHERE id = ${paginaId} AND kind = 'pagina' AND archived_at IS NULL AND deleted_at IS NULL
  `)).rows[0] as any;
  if (!base) return { rol: null, heredadoDe: null, existe: false, publico: false, duenyo: null };
  const fuera = { existe: true, publico: !!base.publico, duenyo: base.creator_user_id as string };
  if (!quien) return { rol: null, heredadoDe: null, ...fuera };
  if (quien.id === base.creator_user_id) return { rol: 'duenyo', heredadoDe: null, ...fuera };
  if (quien.nivel >= ADMIN_PLATAFORMA) return { rol: 'duenyo', heredadoDe: null, ...fuera };

  const r = await db.execute(sql`
    WITH RECURSIVE sube(id, n, sigue) AS (
      SELECT ${paginaId}::text, 0,
             COALESCE((SELECT hereda FROM accesos_herencia WHERE entidad_tipo = 'pagina' AND entidad_id = ${paginaId}), true)
      UNION
      SELECT m.id, s.n + 1,
             COALESCE((SELECT hereda FROM accesos_herencia WHERE entidad_tipo = 'pagina' AND entidad_id = m.id), true)
      FROM sube s CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) m
      WHERE s.sigue AND s.n < ${PROFUNDIDAD}
    )
    SELECT s.id, min(s.n) AS n, w.title, w.creator_user_id,
      (SELECT a.rol FROM accesos_entidad a
        WHERE a.entidad_tipo = 'pagina' AND a.entidad_id = s.id AND a.user_id = ${quien.id}) AS rol_persona,
      (SELECT array_agg(ae.rol) FROM accesos_equipo ae
        JOIN equipo_miembros em ON em.equipo_id = ae.equipo_id AND em.user_id = ${quien.id}
        JOIN equipos e ON e.id = ae.equipo_id AND e.archived_at IS NULL
        WHERE ae.entidad_tipo = 'pagina' AND ae.entidad_id = s.id) AS roles_equipo
    FROM sube s JOIN knowledge_windows w ON w.id = s.id
    GROUP BY s.id, w.title, w.creator_user_id
    ORDER BY min(s.n)
  `);
  let rol: RolEfectivo | null = null;
  let heredadoDe: Acceso['heredadoDe'] = null;
  for (const f of r.rows as any[]) {
    // Ser dueño de una madre válida es ser dueño de la hija: las madres
    // válidas son, por construcción, de la misma persona.
    let aqui: RolEfectivo | null = f.creator_user_id === quien.id ? 'duenyo' : null;
    if (esRol(f.rol_persona)) aqui = mayor(aqui, f.rol_persona);
    for (const x of (f.roles_equipo || []) as string[]) if (esRol(x)) aqui = mayor(aqui, x);
    if (rango(aqui) > rango(rol)) {
      rol = aqui;
      heredadoDe = Number(f.n) > 0 ? { id: f.id, titulo: f.title || 'Sin título' } : null;
    }
  }
  // MIEMBROS DE UN SITIO CON CATEGORÍA «EDITAR» O «TODO» (carril acceso):
  // editan, con su misma cuenta, las páginas del sitio que su categoría ve.
  if (rango(rol) < RANGO.editar) {
    const sr = await sitioYRegla(db, paginaId);
    if (sr) {
      const m = (await db.execute(sql`
        SELECT m.categoria_id, c.permisos FROM sitio_miembros m JOIN sitio_categorias c ON c.id = m.categoria_id
        WHERE m.raiz_id = ${sr.sitio.raiz} AND m.user_id = ${quien.id} AND m.estado = 'activo'
      `)).rows[0] as any;
      const p = permisosDe(m?.permisos);
      const cats = sr.regla?.categorias || [];
      if (m && p.ver && p.editar && (!cats.length || cats.includes(m.categoria_id))) {
        rol = 'editar';
        heredadoDe = null;
      }
    }
  }
  return { rol, heredadoDe, ...fuera };
}

/** Lo que puede hacer, dicho como lo usa una pantalla. */
export function capacidades(a: Acceso) {
  const r = rango(a.rol);
  return {
    ver: a.existe && (a.publico || r >= RANGO.ver),
    comentar: a.existe && r >= RANGO.comentar,
    editar: a.existe && r >= RANGO.editar,
    gestionar: a.existe && r >= RANGO.admin,
    esDuenyo: a.rol === 'duenyo',
  };
}

export async function puedeEditarPagina(db: any, quien: Quien, paginaId: string) {
  return capacidades(await rolEnPagina(db, quien, paginaId)).editar;
}

const nuevoId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 46656).toString(36).toUpperCase()}`;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

/**
 * LAS INVITACIONES QUE ESPERABAN A ESTE CORREO SE CUMPLEN AL ENTRAR.
 *
 * La llama `auth.ts` cada vez que crea una sesión: da igual que sea un alta
 * nueva, Google o una contraseña. Lo que prueba que la invitación es tuya es
 * haber entrado en la cuenta de ese correo, así que no hace falta enlace ni
 * token que se pueda reenviar a otra persona.
 *
 * Nunca rompe el inicio de sesión: si falla, se anota y se sigue.
 */
export async function cumplirInvitaciones(db: any, userId: string): Promise<number> {
  try {
    const r = await db.execute(sql`
      WITH yo AS (SELECT lower(email) AS email FROM users WHERE id = ${userId}),
      pendientes AS (
        UPDATE invitaciones_acceso i SET cumplida_en = now(), cumplida_por = ${userId}
        FROM yo WHERE i.email = yo.email AND i.cumplida_en IS NULL
        RETURNING i.entidad_tipo, i.entidad_id, i.rol, i.invitado_por
      )
      INSERT INTO accesos_entidad (entidad_tipo, entidad_id, user_id, rol, otorgado_por)
      SELECT entidad_tipo, entidad_id, ${userId}, rol, invitado_por FROM pendientes
      ON CONFLICT (entidad_tipo, entidad_id, user_id) DO NOTHING
      RETURNING entidad_id
    `);
    return r.rows.length;
  } catch (e: any) {
    console.error('invitaciones:', e?.cause?.message || e?.message || e);
    return 0;
  }
}

export function registrarPermisos(app: Express, db: any) {
  /** Carga el acceso y corta con 401/403/404 si no llega a `minimo`. */
  async function exigir(req: Request, res: Response, minimo: 'ver' | 'gestionar') {
    if (!req.user) { res.status(401).json({ error: 'Inicia sesión.' }); return null; }
    const a = await rolEnPagina(db, quienDe(req), String(req.params.id));
    if (!a.existe) { res.status(404).json({ error: 'Esa página no existe.' }); return null; }
    const c = capacidades(a);
    if (minimo === 'gestionar' ? !c.gestionar : !(a.rol || a.publico)) {
      res.status(403).json({ error: minimo === 'gestionar'
        ? 'Solo quien administra la página decide quién entra.'
        : 'No tienes acceso a esta página.' });
      return null;
    }
    return { a, c };
  }

  /** La madre (válida) más cercana, para decir «heredado de…». */
  async function madreDe(id: string) {
    const r = await db.execute(sql`
      SELECT w.id, w.title FROM knowledge_windows w WHERE w.id IN (${madresValidas(sql`${id}::text`)}) ORDER BY w.created_at LIMIT 1
    `);
    const m = r.rows[0] as any;
    return m ? { id: m.id as string, titulo: (m.title || 'Sin título') as string } : null;
  }

  /**
   * QUIÉN TIENE ACCESO — lo que pinta el diálogo de compartir.
   *
   * La lista la ve cualquiera con acceso (en Notion también: saber con quién
   * compartes una página es parte de leerla). Los correos de las invitaciones
   * pendientes, sólo quien administra: es un dato de una persona que todavía
   * no ha dicho nada.
   */
  app.get('/api/permisos/pagina/:id', async (req: Request, res: Response) => {
    try {
      const x = await exigir(req, res, 'ver');
      if (!x) return;
      const id = String(req.params.id);
      const her = await db.execute(sql`SELECT hereda FROM accesos_herencia WHERE entidad_tipo = 'pagina' AND entidad_id = ${id}`);
      const hereda = (her.rows[0] as any)?.hereda ?? true;
      const madre = await madreDe(id);

      // Lo propio y, si hereda, lo de cada madre válida hacia arriba.
      const cadena = await db.execute(sql`
        WITH RECURSIVE sube(id, n, sigue) AS (
          SELECT ${id}::text, 0, ${hereda}::boolean
          UNION
          SELECT m.id, s.n + 1,
                 COALESCE((SELECT hereda FROM accesos_herencia WHERE entidad_tipo = 'pagina' AND entidad_id = m.id), true)
          FROM sube s CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) m
          WHERE s.sigue AND s.n < ${PROFUNDIDAD}
        )
        SELECT s.id, min(s.n) AS n, w.title FROM sube s JOIN knowledge_windows w ON w.id = s.id
        GROUP BY s.id, w.title ORDER BY min(s.n)
      `);
      const ids = (cadena.rows as any[]).map(f => f.id);
      const nivelDe = new Map((cadena.rows as any[]).map(f => [f.id, { n: Number(f.n), titulo: f.title || 'Sin título' }]));
      const lista = sql.join(ids.map(i => sql`${i}`), sql`, `);

      const p = await db.execute(sql`
        SELECT a.entidad_id, a.user_id, a.rol, COALESCE(u.display_name, u.name) AS nombre, u.avatar_url, u.handle
        FROM accesos_entidad a JOIN users u ON u.id = a.user_id
        WHERE a.entidad_tipo = 'pagina' AND a.entidad_id IN (${lista}) ORDER BY a.created_at
      `);
      const e = await db.execute(sql`
        SELECT a.entidad_id, a.equipo_id, a.rol, q.nombre, q.icono,
               (SELECT count(*)::int FROM equipo_miembros m WHERE m.equipo_id = q.id) AS miembros
        FROM accesos_equipo a JOIN equipos q ON q.id = a.equipo_id AND q.archived_at IS NULL
        WHERE a.entidad_tipo = 'pagina' AND a.entidad_id IN (${lista}) ORDER BY a.created_at
      `);
      // Cada persona o equipo una vez, con su rol más alto; si lo tiene de
      // arriba y no de aquí, se dice de dónde viene.
      const juntar = (filas: any[], clave: string) => {
        const m = new Map<string, any>();
        for (const f of filas) {
          const donde = nivelDe.get(f.entidad_id)!;
          const previo = m.get(f[clave]);
          const heredado = donde.n > 0 ? { id: f.entidad_id, titulo: donde.titulo } : null;
          if (!previo || rango(f.rol) > rango(previo.rol) || (rango(f.rol) === rango(previo.rol) && !heredado)) {
            const { entidad_id: _e, ...resto } = f;
            m.set(f[clave], { ...resto, heredado_de: heredado });
          }
        }
        return [...m.values()];
      };
      const duenyo = (await db.execute(sql`
        SELECT u.id, COALESCE(u.display_name, u.name) AS nombre, u.avatar_url
        FROM knowledge_windows w JOIN users u ON u.id = w.creator_user_id WHERE w.id = ${id}
      `)).rows[0] || null;
      const invitaciones = x.c.gestionar ? (await db.execute(sql`
        SELECT id, email, rol, created_at FROM invitaciones_acceso
        WHERE entidad_tipo = 'pagina' AND entidad_id = ${id} AND cumplida_en IS NULL ORDER BY created_at
      `)).rows : [];

      res.json({
        mi_rol: x.a.rol, puede_gestionar: x.c.gestionar, es_duenyo: x.c.esDuenyo,
        publico: x.a.publico, hereda, madre, duenyo,
        personas: juntar(p.rows as any[], 'user_id'),
        equipos: juntar(e.rows as any[], 'equipo_id'),
        invitaciones,
        correo_activo: hayCorreo(),
      });
    } catch (e: any) { console.error('permisos:', e); res.status(500).json({ error: e.message }); }
  });

  /** Mi rol en una página, sin la lista. Para que el editor sepa qué enseñar. */
  app.get('/api/permisos/mio/:id', async (req: Request, res: Response) => {
    try {
      const a = await rolEnPagina(db, quienDe(req), String(req.params.id));
      if (!a.existe) return res.status(404).json({ error: 'Esa página no existe.' });
      res.json({ rol: a.rol, heredado_de: a.heredadoDe, ...capacidades(a) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Dar o cambiar el rol de una persona. Repetir con otro rol es cambiarlo. */
  app.put('/api/permisos/pagina/:id/persona', async (req: Request, res: Response) => {
    try {
      const x = await exigir(req, res, 'gestionar');
      if (!x) return;
      const { user_id, rol } = req.body || {};
      if (!user_id || !esRol(rol)) return res.status(400).json({ error: 'Hace falta la persona y un rol: ver, comentar, editar o admin.' });
      // «Administrar» sólo lo da quien es dueño: si no, un administrador
      // podría nombrar a otros administradores en cadena sin que el dueño se
      // enterase de a quién le ha dado la llave.
      if (rol === 'admin' && !x.c.esDuenyo) return res.status(403).json({ error: 'Solo quien creó la página puede nombrar a otra persona administradora.' });
      if (user_id === x.a.duenyo) return res.status(400).json({ error: 'Esa persona es la dueña de la página.' });
      const existe = await db.execute(sql`SELECT id FROM users WHERE id = ${user_id} AND archived_at IS NULL AND deleted_at IS NULL`);
      if (!existe.rows.length) return res.status(404).json({ error: 'Esa persona no existe.' });
      const antes = await db.execute(sql`SELECT rol FROM accesos_entidad WHERE entidad_tipo = 'pagina' AND entidad_id = ${req.params.id} AND user_id = ${user_id}`);
      // Quitarle «admin» a otro administrador tampoco es cosa de un admin.
      if ((antes.rows[0] as any)?.rol === 'admin' && !x.c.esDuenyo) return res.status(403).json({ error: 'Solo quien creó la página puede cambiar a una persona administradora.' });
      await db.execute(sql`
        INSERT INTO accesos_entidad (entidad_tipo, entidad_id, user_id, rol, otorgado_por)
        VALUES ('pagina', ${req.params.id}, ${user_id}, ${rol}, ${req.user!.id})
        ON CONFLICT (entidad_tipo, entidad_id, user_id) DO UPDATE SET rol = EXCLUDED.rol
      `);
      if (!antes.rows.length) {
        const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${req.params.id}`)).rows[0] as any;
        await avisar(db, { paraQuien: user_id, dePartede: req.user!.id, tipo: 'acceso_concedido',
          entidadTipo: 'knowledge_windows', entidadId: String(req.params.id), datos: { titulo: t?.title || 'Sin título', rol } });
      }
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/permisos/pagina/:id/persona/:userId', async (req: Request, res: Response) => {
    try {
      // Irse uno mismo de una página compartida no exige administrarla.
      const yoMismo = req.user && req.params.userId === req.user.id;
      const x = yoMismo ? { c: { esDuenyo: false } } : await exigir(req, res, 'gestionar');
      if (!x) return;
      if (!yoMismo) {
        const antes = await db.execute(sql`SELECT rol FROM accesos_entidad WHERE entidad_tipo = 'pagina' AND entidad_id = ${req.params.id} AND user_id = ${req.params.userId}`);
        if ((antes.rows[0] as any)?.rol === 'admin' && !x.c.esDuenyo) return res.status(403).json({ error: 'Solo quien creó la página puede quitar a una persona administradora.' });
      }
      await db.execute(sql`
        DELETE FROM accesos_entidad WHERE entidad_tipo = 'pagina' AND entidad_id = ${req.params.id} AND user_id = ${req.params.userId}
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Dar acceso a un equipo. Sólo a un equipo del que formas parte: dar acceso
   *  a un equipo ajeno sería enseñarle tu página a gente que no conoces. */
  app.put('/api/permisos/pagina/:id/equipo', async (req: Request, res: Response) => {
    try {
      const x = await exigir(req, res, 'gestionar');
      if (!x) return;
      const { equipo_id, rol } = req.body || {};
      if (!equipo_id || !esRol(rol)) return res.status(400).json({ error: 'Hace falta el equipo y un rol.' });
      if (rol === 'admin' && !x.c.esDuenyo) return res.status(403).json({ error: 'Solo quien creó la página puede dar «Administrar».' });
      const mio = await db.execute(sql`
        SELECT 1 FROM equipos e WHERE e.id = ${equipo_id} AND e.archived_at IS NULL
          AND EXISTS (SELECT 1 FROM equipo_miembros m WHERE m.equipo_id = e.id AND m.user_id = ${req.user!.id})
      `);
      if (!mio.rows.length) return res.status(404).json({ error: 'Ese equipo no existe o no formas parte de él.' });
      await db.execute(sql`
        INSERT INTO accesos_equipo (entidad_tipo, entidad_id, equipo_id, rol, otorgado_por)
        VALUES ('pagina', ${req.params.id}, ${equipo_id}, ${rol}, ${req.user!.id})
        ON CONFLICT (entidad_tipo, entidad_id, equipo_id) DO UPDATE SET rol = EXCLUDED.rol
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/permisos/pagina/:id/equipo/:equipoId', async (req: Request, res: Response) => {
    try {
      if (!(await exigir(req, res, 'gestionar'))) return;
      await db.execute(sql`
        DELETE FROM accesos_equipo WHERE entidad_tipo = 'pagina' AND entidad_id = ${req.params.id} AND equipo_id = ${req.params.equipoId}
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * INVITAR POR CORREO — `{ emails: "a@x.com, b@y.com" | string[], rol }`
   *
   * Quien ya tiene cuenta entra al momento (y se le avisa en la campana). Quien
   * no, queda invitado: el día que se registre con ese correo, la página ya
   * estará en su lista. Si hay proveedor de correo, además se le escribe.
   *
   * Cincuenta como mucho por vez: es una invitación, no un envío masivo.
   */
  app.post('/api/permisos/pagina/:id/invitar', async (req: Request, res: Response) => {
    try {
      const x = await exigir(req, res, 'gestionar');
      if (!x) return;
      const rol = req.body?.rol;
      if (!esRol(rol)) return res.status(400).json({ error: 'Elige un rol.' });
      if (rol === 'admin' && !x.c.esDuenyo) return res.status(403).json({ error: 'Solo quien creó la página puede dar «Administrar».' });
      const crudo = Array.isArray(req.body?.emails) ? req.body.emails.join(',') : String(req.body?.emails || '');
      const emails = [...new Set(crudo.split(/[\s,;]+/).map((s: string) => s.trim().toLowerCase()).filter(Boolean))] as string[];
      const malos = emails.filter(e => !EMAIL.test(e));
      if (!emails.length) return res.status(400).json({ error: 'Escribe al menos un correo.' });
      if (emails.length > 50) return res.status(400).json({ error: 'Como mucho 50 correos de una vez.' });
      if (malos.length) return res.status(400).json({ error: `Estos correos no parecen válidos: ${malos.slice(0, 5).join(', ')}` });

      const id = String(req.params.id);
      const t = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${id}`)).rows[0] as any;
      const titulo = t?.title || 'Sin título';
      const de = req.user!.displayName || req.user!.name || 'Alguien';
      const origen = `${req.protocol}://${req.get('host')}`;
      let concedidos = 0, invitados = 0, correos = 0;
      for (const email of emails) {
        const u = (await db.execute(sql`
          SELECT id FROM users WHERE lower(email) = ${email} AND archived_at IS NULL AND deleted_at IS NULL
        `)).rows[0] as any;
        if (u) {
          if (u.id === x.a.duenyo) continue;
          const r = await db.execute(sql`
            INSERT INTO accesos_entidad (entidad_tipo, entidad_id, user_id, rol, otorgado_por)
            VALUES ('pagina', ${id}, ${u.id}, ${rol}, ${req.user!.id})
            ON CONFLICT (entidad_tipo, entidad_id, user_id) DO UPDATE SET rol = EXCLUDED.rol
              WHERE accesos_entidad.rol <> 'admin'
            RETURNING (xmax = 0) AS nuevo
          `);
          concedidos++;
          if ((r.rows[0] as any)?.nuevo) {
            await avisar(db, { paraQuien: u.id, dePartede: req.user!.id, tipo: 'acceso_concedido',
              entidadTipo: 'knowledge_windows', entidadId: id, datos: { titulo, rol } });
          }
        } else {
          await db.execute(sql`
            INSERT INTO invitaciones_acceso (id, entidad_tipo, entidad_id, email, rol, invitado_por)
            VALUES (${nuevoId('INV')}, 'pagina', ${id}, ${email}, ${rol}, ${req.user!.id})
            ON CONFLICT (entidad_tipo, entidad_id, email) WHERE cumplida_en IS NULL
            DO UPDATE SET rol = EXCLUDED.rol, invitado_por = EXCLUDED.invitado_por
          `);
          invitados++;
          if (await enviarCorreo({
            para: email,
            asunto: `${de} te ha invitado a «${titulo}»`,
            texto: `${de} te ha invitado a la página «${titulo}».\n\nCrea tu cuenta con este mismo correo y la tendrás en tu lista:\n${origen}/paginas/${id}\n`,
          })) correos++;
        }
      }
      res.json({ ok: true, concedidos, invitados, correos, correo_activo: hayCorreo() });
    } catch (e: any) { console.error('invitar:', e); res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/permisos/pagina/:id/invitacion/:invId', async (req: Request, res: Response) => {
    try {
      if (!(await exigir(req, res, 'gestionar'))) return;
      await db.execute(sql`
        DELETE FROM invitaciones_acceso
        WHERE id = ${req.params.invId} AND entidad_tipo = 'pagina' AND entidad_id = ${req.params.id} AND cumplida_en IS NULL
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /**
   * HEREDAR O NO DE LA MADRE — `{ hereda: boolean }`
   *
   * Al dejar de heredar, lo heredado SE COPIA a la página antes de cortar. Es
   * lo que hace Notion, y por lo mismo: si no, pulsar el interruptor dejaría
   * fuera de golpe a gente que estaba trabajando en ella, sin que quien lo
   * pulsa vea a quién ha echado. Así nadie pierde nada en silencio; si quiere
   * quitar a alguien, lo quita a la vista.
   */
  app.put('/api/permisos/pagina/:id/herencia', async (req: Request, res: Response) => {
    try {
      const x = await exigir(req, res, 'gestionar');
      if (!x) return;
      const hereda = !!req.body?.hereda;
      const id = String(req.params.id);
      if (!hereda) {
        // Todo lo que llega de arriba, con su rol más alto, a esta página.
        await db.execute(sql`
          WITH RECURSIVE sube(id, n, sigue) AS (
            SELECT ${id}::text, 0, true
            UNION
            SELECT m.id, s.n + 1,
                   COALESCE((SELECT hereda FROM accesos_herencia WHERE entidad_tipo = 'pagina' AND entidad_id = m.id), true)
            FROM sube s CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) m
            WHERE s.sigue AND s.n < ${PROFUNDIDAD}
          ),
          arriba AS (SELECT id FROM sube WHERE n > 0),
          personas AS (
            SELECT DISTINCT ON (a.user_id) a.user_id, a.rol FROM accesos_entidad a
            WHERE a.entidad_tipo = 'pagina' AND a.entidad_id IN (SELECT id FROM arriba)
            ORDER BY a.user_id, CASE a.rol WHEN 'admin' THEN 4 WHEN 'editar' THEN 3 WHEN 'comentar' THEN 2 ELSE 1 END DESC
          )
          INSERT INTO accesos_entidad (entidad_tipo, entidad_id, user_id, rol, otorgado_por)
          SELECT 'pagina', ${id}, user_id, rol, ${req.user!.id} FROM personas
          ON CONFLICT (entidad_tipo, entidad_id, user_id) DO NOTHING
        `);
        await db.execute(sql`
          WITH RECURSIVE sube(id, n, sigue) AS (
            SELECT ${id}::text, 0, true
            UNION
            SELECT m.id, s.n + 1,
                   COALESCE((SELECT hereda FROM accesos_herencia WHERE entidad_tipo = 'pagina' AND entidad_id = m.id), true)
            FROM sube s CROSS JOIN LATERAL (${madresValidas(sql`s.id`)}) m
            WHERE s.sigue AND s.n < ${PROFUNDIDAD}
          ),
          equipos_arriba AS (
            SELECT DISTINCT ON (a.equipo_id) a.equipo_id, a.rol FROM accesos_equipo a
            WHERE a.entidad_tipo = 'pagina' AND a.entidad_id IN (SELECT id FROM sube WHERE n > 0)
            ORDER BY a.equipo_id, CASE a.rol WHEN 'admin' THEN 4 WHEN 'editar' THEN 3 WHEN 'comentar' THEN 2 ELSE 1 END DESC
          )
          INSERT INTO accesos_equipo (entidad_tipo, entidad_id, equipo_id, rol, otorgado_por)
          SELECT 'pagina', ${id}, equipo_id, rol, ${req.user!.id} FROM equipos_arriba
          ON CONFLICT (entidad_tipo, entidad_id, equipo_id) DO NOTHING
        `);
      }
      await db.execute(sql`
        INSERT INTO accesos_herencia (entidad_tipo, entidad_id, hereda, cambiado_por)
        VALUES ('pagina', ${id}, ${hereda}, ${req.user!.id})
        ON CONFLICT (entidad_tipo, entidad_id) DO UPDATE SET hereda = EXCLUDED.hereda, cambiado_por = EXCLUDED.cambiado_por, updated_at = now()
      `);
      res.json({ ok: true, hereda });
    } catch (e: any) { console.error('herencia:', e); res.status(500).json({ error: e.message }); }
  });

  /**
   * LO QUE OTROS HAN COMPARTIDO CONMIGO — para el menú. Directo o por un
   * equipo, sin las páginas que son mías (ésas ya están en «Páginas»).
   */
  app.get('/api/permisos/compartidas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const r = await db.execute(sql`
        SELECT w.id, w.title, w.config->>'icono' AS icono, max(x.rango) AS rango,
               COALESCE(u.display_name, u.name) AS de
        FROM (
          SELECT a.entidad_id AS id, CASE a.rol WHEN 'admin' THEN 4 WHEN 'editar' THEN 3 WHEN 'comentar' THEN 2 ELSE 1 END AS rango
          FROM accesos_entidad a WHERE a.entidad_tipo = 'pagina' AND a.user_id = ${req.user.id}
          UNION ALL
          SELECT a.entidad_id, CASE a.rol WHEN 'admin' THEN 4 WHEN 'editar' THEN 3 WHEN 'comentar' THEN 2 ELSE 1 END
          FROM accesos_equipo a JOIN equipo_miembros m ON m.equipo_id = a.equipo_id AND m.user_id = ${req.user.id}
          JOIN equipos e ON e.id = a.equipo_id AND e.archived_at IS NULL
          WHERE a.entidad_tipo = 'pagina'
        ) x
        JOIN knowledge_windows w ON w.id = x.id AND w.kind = 'pagina' AND w.deleted_at IS NULL AND w.archived_at IS NULL
        JOIN users u ON u.id = w.creator_user_id
        WHERE w.creator_user_id <> ${req.user.id}
        GROUP BY w.id, w.title, w.config, u.display_name, u.name
        ORDER BY max(w.updated_at) DESC NULLS LAST
        LIMIT 100
      `);
      const nombres = ['', 'ver', 'comentar', 'editar', 'admin'];
      res.json({ paginas: (r.rows as any[]).map(f => ({ id: f.id, titulo: f.title || 'Sin título', icono: f.icono, de: f.de, rol: nombres[Number(f.rango)] })) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ══ EQUIPOS ════════════════════════════════════════════════════════════════
  // Crear uno, verlo, meter y sacar gente. Lo gestiona quien es admin del
  // equipo; quien lo crea nace admin.

  async function rolEnEquipo(equipoId: string, userId: string): Promise<'admin' | 'miembro' | null> {
    const r = await db.execute(sql`
      SELECT m.rol FROM equipo_miembros m JOIN equipos e ON e.id = m.equipo_id AND e.archived_at IS NULL
      WHERE m.equipo_id = ${equipoId} AND m.user_id = ${userId}
    `);
    return ((r.rows[0] as any)?.rol as any) || null;
  }

  app.get('/api/equipos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const r = await db.execute(sql`
        SELECT e.id, e.nombre, e.icono, e.descripcion, m.rol AS mi_rol,
               (SELECT count(*)::int FROM equipo_miembros x WHERE x.equipo_id = e.id) AS miembros
        FROM equipos e JOIN equipo_miembros m ON m.equipo_id = e.id AND m.user_id = ${req.user.id}
        WHERE e.archived_at IS NULL ORDER BY e.nombre
      `);
      res.json({ equipos: r.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/equipos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const nombre = String(req.body?.nombre || '').trim().slice(0, 80);
      if (!nombre) return res.status(400).json({ error: 'Ponle un nombre al equipo.' });
      const cuantos = await db.execute(sql`SELECT count(*)::int AS n FROM equipos WHERE creador_user_id = ${req.user.id} AND archived_at IS NULL`);
      if (Number((cuantos.rows[0] as any).n) >= 50) return res.status(400).json({ error: 'Ya tienes 50 equipos: archiva alguno antes.' });
      const id = nuevoId('EQ');
      await db.execute(sql`
        INSERT INTO equipos (id, nombre, icono, descripcion, creador_user_id)
        VALUES (${id}, ${nombre}, ${req.body?.icono ? String(req.body.icono).slice(0, 16) : null},
                ${req.body?.descripcion ? String(req.body.descripcion).slice(0, 500) : null}, ${req.user.id})
      `);
      await db.execute(sql`INSERT INTO equipo_miembros (equipo_id, user_id, rol, anadido_por) VALUES (${id}, ${req.user.id}, 'admin', ${req.user.id})`);
      res.json({ id, nombre });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/equipos/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if ((await rolEnEquipo(req.params.id, req.user.id)) !== 'admin') return res.status(403).json({ error: 'Solo quien administra el equipo puede cambiarlo.' });
      const nombre = req.body?.nombre === undefined ? null : String(req.body.nombre).trim().slice(0, 80) || null;
      await db.execute(sql`
        UPDATE equipos SET nombre = COALESCE(${nombre}, nombre),
          icono = CASE WHEN ${req.body?.icono === undefined} THEN icono ELSE ${req.body?.icono ? String(req.body.icono).slice(0, 16) : null} END,
          descripcion = CASE WHEN ${req.body?.descripcion === undefined} THEN descripcion ELSE ${req.body?.descripcion ? String(req.body.descripcion).slice(0, 500) : null} END,
          updated_at = now()
        WHERE id = ${req.params.id}
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  /** Archivar, no borrar: sus accesos dejan de valer al instante (las
   *  consultas miran `archived_at`) y se pueden recuperar si fue sin querer. */
  app.delete('/api/equipos/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if ((await rolEnEquipo(req.params.id, req.user.id)) !== 'admin') return res.status(403).json({ error: 'Solo quien administra el equipo puede archivarlo.' });
      await db.execute(sql`UPDATE equipos SET archived_at = now(), updated_at = now() WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/equipos/:id/miembros', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!(await rolEnEquipo(req.params.id, req.user.id))) return res.status(404).json({ error: 'Ese equipo no existe o no formas parte de él.' });
      const r = await db.execute(sql`
        SELECT m.user_id, m.rol, COALESCE(u.display_name, u.name) AS nombre, u.avatar_url
        FROM equipo_miembros m JOIN users u ON u.id = m.user_id
        WHERE m.equipo_id = ${req.params.id} ORDER BY m.rol, u.display_name
      `);
      res.json({ miembros: r.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/equipos/:id/miembros', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if ((await rolEnEquipo(req.params.id, req.user.id)) !== 'admin') return res.status(403).json({ error: 'Solo quien administra el equipo puede meter gente.' });
      const { user_id } = req.body || {};
      const rol = req.body?.rol === 'admin' ? 'admin' : 'miembro';
      const existe = await db.execute(sql`SELECT id FROM users WHERE id = ${user_id} AND archived_at IS NULL AND deleted_at IS NULL`);
      if (!existe.rows.length) return res.status(404).json({ error: 'Esa persona no existe.' });
      await db.execute(sql`
        INSERT INTO equipo_miembros (equipo_id, user_id, rol, anadido_por) VALUES (${req.params.id}, ${user_id}, ${rol}, ${req.user.id})
        ON CONFLICT (equipo_id, user_id) DO UPDATE SET rol = EXCLUDED.rol
      `);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/equipos/:id/miembros/:userId', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const yoMismo = req.params.userId === req.user.id;
      if (!yoMismo && (await rolEnEquipo(req.params.id, req.user.id)) !== 'admin') return res.status(403).json({ error: 'Solo quien administra el equipo puede sacar a alguien.' });
      // Un equipo no se queda sin nadie que lo administre: sería un equipo que
      // ya nadie puede tocar.
      const admins = await db.execute(sql`SELECT user_id FROM equipo_miembros WHERE equipo_id = ${req.params.id} AND rol = 'admin'`);
      const quedan = (admins.rows as any[]).filter(a => a.user_id !== req.params.userId);
      if (!quedan.length && (admins.rows as any[]).some(a => a.user_id === req.params.userId)) {
        return res.status(400).json({ error: 'Es quien administra el equipo: nombra antes a otra persona administradora.' });
      }
      await db.execute(sql`DELETE FROM equipo_miembros WHERE equipo_id = ${req.params.id} AND user_id = ${req.params.userId}`);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
