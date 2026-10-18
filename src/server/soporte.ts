import type { Express, Request, Response } from 'express';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { enviarA, estaConectado } from './telecomHub.js';
import { avisar } from './avisos.js';
import { enviarCorreo, hayCorreo } from './correo.js';
import { sitioDePagina, paginaVisible } from './sitios.js';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { miembroActual, accesoMiembro, anfitrion } from './miembros.js';
import { guardian, ritmo, ipDe, type Regla } from './limites/index.js';

// ============================================================================
// EL CHAT DE AYUDA DE UN SITIO (2026-10-18, W6 de Wikiproducts)
// ============================================================================
// Eugenio: «tiene atención al usuario y atención al cliente que necesite
// resolver dudas sobre determinados productos. Se hace a través de un chat».
//
// Quien visita una web hecha con Wiki Creator escribe en el bloque «Chat de
// ayuda», y el EQUIPO DEL SITIO (quien puede editar la página raíz) le
// contesta desde ese mismo bloque, que a ellos les enseña la bandeja.
//
// ── POR QUÉ NO ES `mensajes.ts` ─────────────────────────────────────────────
// Los mensajes directos son de persona a persona y exigen la sesión de la
// plataforma. Aquí no hay «persona» al otro lado sino un sitio (lo atiende
// quien esté del equipo), y quien escribe muchas veces no tiene cuenta: es
// alguien que mira una powerbank y tiene una duda. Obligarle a registrarse
// para preguntar es perder la pregunta. Mismo motor de avisos y del cable
// en vivo (`telecomHub`), tablas propias.
//
// ── QUIÉN ES QUIEN ESCRIBE ──────────────────────────────────────────────────
// En este orden: su sesión de la plataforma; su sesión de miembro del sitio
// (`miembros.ts`); y si no tiene ninguna, un testigo aleatorio en una cookie
// de este anfitrión (`rh_soporte`). Del testigo se guarda la huella sha256,
// nunca el testigo: quien lea una copia de seguridad no puede hacerse pasar
// por nadie.
//
// ── QUÉ NO HACE TODAVÍA ─────────────────────────────────────────────────────
//  · Contestar con IA cuando no hay nadie del equipo conectado. Costaría una
//    llamada al modelo por pregunta y, en una enciclopedia que presume de no
//    inventar, una respuesta inventada es peor que «te contestamos en unas
//    horas». Se decide con Eugenio.
//  · Empujar la respuesta al visitante en vivo: la sesión de sitio no abre el
//    cable de la plataforma. El bloque pregunta cada pocos segundos mientras
//    está abierto, que para un chat de ayuda es suficiente.

const nuevoId = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const huella = (t: string) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

/** Ocho mensajes seguidos gratis por IP y por quien escribe; después 10 s,
 *  20, 40… hasta diez minutos. Nadie escribe nueve mensajes a mano en un
 *  minuto a un chat de ayuda; un bucle, sí. Se cierra si no puede decidir:
 *  lo que se protege es una escritura abierta al mundo. */
const REGLA_ESCRIBIR: Regla = { puerta: 'soporte_escribir', gracia: 8, baseSegundos: 10, topeSegundos: 600, alFallar: 'cerrar' };

const COOKIE = 'rh_soporte';
const COOKIE_DIAS = 180;
const seguro = () => (process.env.NODE_ENV === 'production' ? '; Secure' : '');

function leerCookie(req: Request, nombre: string): string | null {
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nombre) return decodeURIComponent(parte.slice(i + 1).trim());
  }
  return null;
}
function anadirCookie(res: Response, valor: string) {
  const previas = res.getHeader('Set-Cookie');
  const lista = Array.isArray(previas) ? previas.map(String) : previas ? [String(previas)] : [];
  res.setHeader('Set-Cookie', [...lista, valor]);
}

// ── EL SITIO, QUIEN ESCRIBE Y QUIEN ATIENDE ─────────────────────────────────

export type SitioSoporte = { raiz: string; nombre: string; duenyo: string; pagina: string };

/**
 * El sitio al que pertenece una página: la página raíz con menú de sitio más
 * cercana por encima (`sitioDePagina`), o la propia página si no hay sitio.
 * `null` si la página no existe o quien pregunta no puede verla: no se puede
 * escribir al soporte de una web que no se puede ver.
 */
export async function sitioDeSoporte(db: any, req: Request, paginaId: string): Promise<SitioSoporte | null> {
  const p = (await db.execute(sql`
    SELECT id FROM knowledge_windows
    WHERE id = ${paginaId} AND kind = 'pagina' AND archived_at IS NULL AND deleted_at IS NULL
  `)).rows[0] as any;
  if (!p) return null;
  const s = await sitioDePagina(db, paginaId);
  const raiz = s?.raizId || paginaId;
  const w = (await db.execute(sql`
    SELECT id, title, creator_user_id FROM knowledge_windows
    WHERE id = ${raiz} AND archived_at IS NULL AND deleted_at IS NULL
  `)).rows[0] as any;
  if (!w) return null;
  let puedeVer = await paginaVisible(db, paginaId);
  if (!puedeVer) puedeVer = await esEquipo(db, req, raiz);
  if (!puedeVer) puedeVer = !!(await accesoMiembro(db, req, paginaId))?.permitido;
  if (!puedeVer) return null;
  const nombre = String(s?.config?.menu?.nombre || s?.titulo || w.title || 'Sitio');
  return { raiz, nombre, duenyo: w.creator_user_id, pagina: paginaId };
}

/** ¿Atiende quien llama el soporte de este sitio? Quien puede editar la raíz. */
export async function esEquipo(db: any, req: Request, raiz: string): Promise<boolean> {
  if (!req.user) return false;
  return capacidades(await rolEnPagina(db, quienDe(req), raiz)).editar;
}

export type Cliente = {
  userId: string | null; huella: string | null; nombre: string | null; email: string | null;
  /** Testigo nuevo que hay que dejar en la cookie al responder. */
  testigoNuevo?: string;
};

/**
 * Quien escribe, sin crear nada. `null` si es un visitante que todavía no
 * ha escrito nunca (no tiene cookie): no se le inventa una identidad sólo
 * por mirar.
 */
export async function clienteActual(db: any, req: Request, raiz: string): Promise<Cliente | null> {
  if (req.user) {
    return { userId: req.user.id, huella: null, nombre: req.user.displayName || req.user.name || null, email: req.user.email || null };
  }
  const m = await miembroActual(db, req, raiz);
  if (m && m.estado === 'activo' && m.userId) return { userId: m.userId, huella: null, nombre: m.nombre, email: m.email };
  const t = leerCookie(req, COOKIE);
  if (t && /^[a-f0-9]{64}$/.test(t)) return { userId: null, huella: huella(t), nombre: null, email: null };
  return null;
}

/** Igual, pero si es un visitante sin cookie le da una (para escribir). */
export async function clienteParaEscribir(db: any, req: Request, raiz: string): Promise<Cliente> {
  const c = await clienteActual(db, req, raiz);
  if (c) return c;
  const t = crypto.randomBytes(32).toString('hex');
  return { userId: null, huella: huella(t), nombre: null, email: null, testigoNuevo: t };
}

export function dejarCookie(res: Response, c: Cliente) {
  if (!c.testigoNuevo) return;
  anadirCookie(res, `${COOKIE}=${c.testigoNuevo}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_DIAS * 86400}${seguro()}`);
}

/** ¿Es esta conversación de este cliente? */
const esSuya = (conv: any, c: Cliente | null) =>
  !!c && ((!!c.userId && conv.cliente_user_id === c.userId) || (!!c.huella && conv.invitado_huella === c.huella));

/** Qué papel tiene quien llama en una conversación: 'equipo' (el sitio, o el
 *  experto de esa conversación), 'cliente', o null si no es nada suyo. */
async function papelEn(db: any, req: Request, conv: any): Promise<'equipo' | 'cliente' | null> {
  if (await esEquipo(db, req, conv.raiz_id)) return 'equipo';
  if (req.user && conv.experto_id) {
    const e = (await db.execute(sql`SELECT user_id FROM expertos WHERE id = ${conv.experto_id}`)).rows[0] as any;
    if (e?.user_id && e.user_id === req.user.id) return 'equipo';
  }
  if (esSuya(conv, await clienteActual(db, req, conv.raiz_id))) return 'cliente';
  return null;
}

/** Quién atiende una conversación: el experto si tiene cuenta, si no el
 *  dueño del sitio. Es a quien se avisa. */
async function quienAtiende(db: any, conv: { raiz_id: string; experto_id: string | null }): Promise<string | null> {
  if (conv.experto_id) {
    const e = (await db.execute(sql`SELECT user_id FROM expertos WHERE id = ${conv.experto_id}`)).rows[0] as any;
    if (e?.user_id) return e.user_id;
  }
  const w = (await db.execute(sql`SELECT creator_user_id FROM knowledge_windows WHERE id = ${conv.raiz_id}`)).rows[0] as any;
  return w?.creator_user_id || null;
}

const aMensaje = (m: any) => ({ id: m.id, de: m.de, texto: m.texto, fecha: m.created_at, autor: m.autor_nombre || null });

async function mensajesDe(db: any, convId: string) {
  const r = await db.execute(sql`
    SELECT m.id, m.de, m.texto, m.created_at, COALESCE(u.display_name, u.name) AS autor_nombre
    FROM soporte_mensajes m LEFT JOIN users u ON u.id = m.autor_user_id
    WHERE m.conversacion_id = ${convId}
    ORDER BY m.created_at, m.id
    LIMIT 1000
  `);
  return (r.rows as any[]).map(aMensaje);
}

/**
 * Escribe un mensaje en una conversación y avisa al otro lado. La usan este
 * módulo y `expertos.ts` (que escribe los avisos de 'sistema').
 */
export async function escribir(db: any, a: {
  conv: { id: string; raiz_id: string; experto_id: string | null; pagina_id: string | null; cliente_user_id: string | null; cliente_email: string | null; sin_leer_cliente?: number };
  de: 'cliente' | 'equipo' | 'sistema'; autor: string | null; texto: string; nombreSitio?: string;
}) {
  const id = nuevoId('SMS');
  await db.execute(sql`
    INSERT INTO soporte_mensajes (id, conversacion_id, de, autor_user_id, texto)
    VALUES (${id}, ${a.conv.id}, ${a.de}, ${a.autor}, ${a.texto})
  `);
  const alEquipo = a.de === 'cliente';
  await db.execute(sql`
    UPDATE soporte_conversaciones SET
      ultimo_at = now(), updated_at = now(),
      estado = CASE WHEN ${alEquipo} THEN 'abierta' ELSE estado END,
      sin_leer_equipo = sin_leer_equipo + ${alEquipo ? 1 : 0},
      sin_leer_cliente = sin_leer_cliente + ${alEquipo ? 0 : 1}
    WHERE id = ${a.conv.id}
  `);
  const destino = a.conv.pagina_id ? `/paginas/${a.conv.pagina_id}?soporte=${a.conv.id}` : null;
  const corto = a.texto.replace(/\s+/g, ' ').trim().slice(0, 120);

  if (alEquipo) {
    // AL EQUIPO: en vivo si está conectado; a la campana si no. Las dos a la
    // vez serían ruido encima de un mensaje que ya ha visto aparecer.
    const para = await quienAtiende(db, a.conv);
    if (para && para !== a.autor) {
      const llego = enviarA(para, { tipo: 'soporte', conversacion: a.conv.id, texto: corto });
      if (!llego) {
        await avisar(db, {
          paraQuien: para, dePartede: a.autor, tipo: 'soporte_mensaje',
          entidadTipo: 'soporte', entidadId: a.conv.id,
          datos: { texto: corto, sitio: a.nombreSitio || null, destino },
        });
      }
    }
  } else if (a.conv.cliente_user_id) {
    // AL CLIENTE CON CUENTA: la campana, salvo que esté conectado.
    if (!estaConectado(a.conv.cliente_user_id)) {
      await avisar(db, {
        paraQuien: a.conv.cliente_user_id, dePartede: a.autor, tipo: 'soporte_mensaje',
        entidadTipo: 'soporte', entidadId: a.conv.id,
        datos: { texto: corto, sitio: a.nombreSitio || null, destino },
      });
    } else {
      enviarA(a.conv.cliente_user_id, { tipo: 'soporte', conversacion: a.conv.id, texto: corto });
    }
  } else if (a.conv.cliente_email && hayCorreo() && !(a.conv.sin_leer_cliente ?? 0)) {
    // AL VISITANTE SIN CUENTA que dejó su correo: un correo, sólo con la
    // PRIMERA respuesta sin leer. Diez respuestas seguidas no son diez correos.
    await enviarCorreo({
      para: a.conv.cliente_email,
      asunto: `Te han respondido en ${a.nombreSitio || 'el chat de ayuda'}`,
      texto: `${corto}\n\nVuelve a la página donde escribiste para leer la respuesta completa y contestar.`,
    }).catch((e: any) => console.error('correo de soporte:', e?.message || e));
  }
  return id;
}

export function registrarSoporte(app: Express, db: any) {
  /** El cuerpo de un mensaje: texto limpio o un error que se puede enseñar. */
  const textoDe = (crudo: unknown): { texto: string } | { error: string } => {
    const texto = String(crudo ?? '').trim();
    if (!texto) return { error: 'El mensaje está vacío.' };
    if (texto.length > 5000) return { error: 'El mensaje es demasiado largo (5.000 caracteres como mucho).' };
    return { texto };
  };

  /**
   * GET /api/soporte/sitio/:pagina — lo que necesita el bloque al abrirse:
   * el sitio, si quien mira es del equipo, si hay alguien conectado, y sus
   * conversaciones en este sitio (la de ayuda y las de sus consultas).
   */
  app.get('/api/soporte/sitio/:pagina', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const s = await sitioDeSoporte(db, req, String(req.params.pagina));
      if (!s) return res.status(404).json({ error: 'Esta página no existe o no es pública.' });
      const equipo = await esEquipo(db, req, s.raiz);
      const c = await clienteActual(db, req, s.raiz);
      let conversaciones: any[] = [];
      if (c) {
        const r = await db.execute(sql`
          SELECT c.id, c.estado, c.experto_id, c.sin_leer_cliente, c.ultimo_at, e.nombre AS experto_nombre
          FROM soporte_conversaciones c LEFT JOIN expertos e ON e.id = c.experto_id
          WHERE c.raiz_id = ${s.raiz} AND c.archived_at IS NULL
            AND (${c.userId ? sql`c.cliente_user_id = ${c.userId}` : sql`false`}
              OR ${c.huella ? sql`c.invitado_huella = ${c.huella}` : sql`false`})
          ORDER BY (c.experto_id IS NULL) DESC, c.ultimo_at DESC
          LIMIT 20
        `);
        conversaciones = (r.rows as any[]).map(x => ({
          id: x.id, estado: x.estado, experto: x.experto_id ? { id: x.experto_id, nombre: x.experto_nombre } : null,
          sinLeer: x.sin_leer_cliente, ultimo: x.ultimo_at,
        }));
      }
      let pendientesEquipo = 0;
      if (equipo) {
        const r = await db.execute(sql`
          SELECT count(*)::int AS n FROM soporte_conversaciones
          WHERE raiz_id = ${s.raiz} AND archived_at IS NULL AND estado = 'abierta' AND sin_leer_equipo > 0
        `);
        pendientesEquipo = (r.rows[0] as any)?.n || 0;
      }
      res.json({
        raiz: s.raiz, sitio: s.nombre, equipo, pendientesEquipo,
        // «En línea» es un hecho del cable, no una promesa: el dueño tiene la
        // aplicación abierta ahora mismo.
        enLinea: estaConectado(s.duenyo),
        yo: c ? { conCuenta: !!c.userId, nombre: c.nombre, email: c.email } : null,
        conversaciones,
      });
    } catch (e: any) {
      console.error('soporte sitio:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/soporte/sitio/:pagina/mensajes { texto, nombre?, email? }
   * Escribir al soporte del sitio. Abre la conversación la primera vez.
   */
  app.post('/api/soporte/sitio/:pagina/mensajes', guardian(db, REGLA_ESCRIBIR, r => r.user?.id), async (req: Request, res: Response) => {
    try {
      const s = await sitioDeSoporte(db, req, String(req.params.pagina));
      if (!s) return res.status(404).json({ error: 'Esta página no existe o no es pública.' });
      const t = textoDe(req.body?.texto);
      if ('error' in t) return res.status(400).json({ error: t.error });
      const c = await clienteParaEscribir(db, req, s.raiz);
      if (c.userId && c.userId === s.duenyo) {
        return res.status(400).json({ error: 'Este es tu propio sitio: aquí ves la bandeja, no el chat de visitante.' });
      }
      const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 200) || null;
      if (email && !EMAIL.test(email)) return res.status(400).json({ error: 'Ese correo no parece válido.' });
      const nombre = String(req.body?.nombre || '').trim().slice(0, 80) || null;

      void ritmo(db, REGLA_ESCRIBIR, ipDe(req), c.userId);

      let conv = (await db.execute(sql`
        SELECT * FROM soporte_conversaciones
        WHERE raiz_id = ${s.raiz} AND experto_id IS NULL AND archived_at IS NULL
          AND (${c.userId ? sql`cliente_user_id = ${c.userId}` : sql`false`}
            OR ${c.huella ? sql`invitado_huella = ${c.huella}` : sql`false`})
        ORDER BY ultimo_at DESC LIMIT 1
      `)).rows[0] as any;
      if (!conv) {
        const id = nuevoId('SCV');
        await db.execute(sql`
          INSERT INTO soporte_conversaciones (id, raiz_id, pagina_id, cliente_user_id, invitado_huella, cliente_nombre, cliente_email)
          VALUES (${id}, ${s.raiz}, ${s.pagina}, ${c.userId}, ${c.userId ? null : c.huella},
                  ${nombre || c.nombre}, ${email || c.email})
        `);
        conv = (await db.execute(sql`SELECT * FROM soporte_conversaciones WHERE id = ${id}`)).rows[0];
      } else if ((nombre && !conv.cliente_nombre) || (email && email !== conv.cliente_email)) {
        await db.execute(sql`
          UPDATE soporte_conversaciones
          SET cliente_nombre = COALESCE(cliente_nombre, ${nombre}), cliente_email = COALESCE(${email}, cliente_email)
          WHERE id = ${conv.id}
        `);
      }
      const id = await escribir(db, { conv, de: 'cliente', autor: c.userId, texto: t.texto, nombreSitio: s.nombre });
      dejarCookie(res, c);
      res.json({ ok: true, id, conversacion: conv.id });
    } catch (e: any) {
      console.error('soporte escribir:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/soporte/conversaciones/:id — los mensajes, para el cliente, el
   * equipo o el experto. Leer es marcar como leído lo del otro lado.
   */
  app.get('/api/soporte/conversaciones/:id', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      const conv = (await db.execute(sql`
        SELECT c.*, e.nombre AS experto_nombre FROM soporte_conversaciones c
        LEFT JOIN expertos e ON e.id = c.experto_id
        WHERE c.id = ${String(req.params.id)} AND c.archived_at IS NULL
      `)).rows[0] as any;
      const papel = conv ? await papelEn(db, req, conv) : null;
      // Mismo 404 exista o no: no se confirma a un extraño que hay una
      // conversación con ese código.
      if (!conv || !papel) return res.status(404).json({ error: 'Esa conversación no existe.' });
      if (papel === 'equipo') await db.execute(sql`UPDATE soporte_conversaciones SET sin_leer_equipo = 0 WHERE id = ${conv.id}`);
      else await db.execute(sql`UPDATE soporte_conversaciones SET sin_leer_cliente = 0 WHERE id = ${conv.id}`);
      const consulta = conv.experto_id ? (await db.execute(sql`
        SELECT id, inicio, fin, estado FROM consultas_experto WHERE conversacion_id = ${conv.id}
        ORDER BY inicio DESC LIMIT 1
      `)).rows[0] as any : null;
      res.json({
        id: conv.id, estado: conv.estado, papel,
        experto: conv.experto_id ? { id: conv.experto_id, nombre: conv.experto_nombre } : null,
        consulta: consulta ? { id: consulta.id, inicio: consulta.inicio, fin: consulta.fin, estado: consulta.estado } : null,
        // El nombre y el correo del cliente, sólo para quien atiende.
        cliente: papel === 'equipo' ? { nombre: conv.cliente_nombre, email: conv.cliente_email, conCuenta: !!conv.cliente_user_id } : null,
        mensajes: await mensajesDe(db, conv.id),
      });
    } catch (e: any) {
      console.error('soporte conversación:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/soporte/conversaciones/:id/mensajes { texto } — contestar. */
  app.post('/api/soporte/conversaciones/:id/mensajes', guardian(db, REGLA_ESCRIBIR, r => r.user?.id), async (req: Request, res: Response) => {
    try {
      const conv = (await db.execute(sql`
        SELECT * FROM soporte_conversaciones WHERE id = ${String(req.params.id)} AND archived_at IS NULL
      `)).rows[0] as any;
      const papel = conv ? await papelEn(db, req, conv) : null;
      if (!conv || !papel) return res.status(404).json({ error: 'Esa conversación no existe.' });
      const t = textoDe(req.body?.texto);
      if ('error' in t) return res.status(400).json({ error: t.error });
      const c = papel === 'cliente' ? await clienteActual(db, req, conv.raiz_id) : null;
      if (papel === 'cliente') void ritmo(db, REGLA_ESCRIBIR, ipDe(req), c?.userId);
      const sitio = (await db.execute(sql`SELECT title FROM knowledge_windows WHERE id = ${conv.raiz_id}`)).rows[0] as any;
      const id = await escribir(db, {
        conv, de: papel, autor: papel === 'equipo' ? req.user!.id : (c?.userId || null),
        texto: t.texto, nombreSitio: sitio?.title,
      });
      res.json({ ok: true, id });
    } catch (e: any) {
      console.error('soporte contestar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** PUT /api/soporte/conversaciones/:id/estado { estado } — cerrar o reabrir (equipo). */
  app.put('/api/soporte/conversaciones/:id/estado', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const conv = (await db.execute(sql`
        SELECT * FROM soporte_conversaciones WHERE id = ${String(req.params.id)} AND archived_at IS NULL
      `)).rows[0] as any;
      if (!conv || (await papelEn(db, req, conv)) !== 'equipo') return res.status(404).json({ error: 'Esa conversación no existe.' });
      const estado = String(req.body?.estado || '');
      if (!['abierta', 'cerrada'].includes(estado)) return res.status(400).json({ error: 'El estado es «abierta» o «cerrada».' });
      await db.execute(sql`UPDATE soporte_conversaciones SET estado = ${estado}, updated_at = now() WHERE id = ${conv.id}`);
      res.json({ ok: true, estado });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/soporte/bandeja/:pagina?estado=abierta|cerrada — las
   * conversaciones del sitio, para el equipo; o las de sus consultas, para un
   * experto que no es del equipo.
   */
  app.get('/api/soporte/bandeja/:pagina', async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'private, no-store');
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const s = await sitioDeSoporte(db, req, String(req.params.pagina));
      if (!s) return res.status(404).json({ error: 'Esta página no existe.' });
      const equipo = await esEquipo(db, req, s.raiz);
      const estado = req.query.estado === 'cerrada' ? 'cerrada' : 'abierta';
      const r = await db.execute(sql`
        SELECT c.id, c.estado, c.cliente_nombre, c.cliente_email, c.cliente_user_id, c.sin_leer_equipo,
               c.ultimo_at, c.experto_id, e.nombre AS experto_nombre,
               COALESCE(u.display_name, u.name) AS cuenta_nombre,
               (SELECT texto FROM soporte_mensajes m WHERE m.conversacion_id = c.id ORDER BY created_at DESC LIMIT 1) AS ultimo_texto
        FROM soporte_conversaciones c
        LEFT JOIN expertos e ON e.id = c.experto_id
        LEFT JOIN users u ON u.id = c.cliente_user_id
        WHERE c.raiz_id = ${s.raiz} AND c.archived_at IS NULL AND c.estado = ${estado}
          AND (${equipo} OR e.user_id = ${req.user.id})
        ORDER BY c.ultimo_at DESC
        LIMIT 200
      `);
      const filas = r.rows as any[];
      if (!equipo && !filas.length) {
        const esExperto = (await db.execute(sql`
          SELECT 1 FROM expertos WHERE raiz_id = ${s.raiz} AND user_id = ${req.user.id} AND archived_at IS NULL
        `)).rows.length > 0;
        if (!esExperto) return res.status(403).json({ error: 'Sólo el equipo del sitio ve la bandeja.' });
      }
      res.json({
        equipo,
        conversaciones: filas.map(x => ({
          id: x.id, estado: x.estado, sinLeer: x.sin_leer_equipo, ultimo: x.ultimo_at,
          cliente: x.cliente_nombre || x.cuenta_nombre || x.cliente_email || 'Visitante sin nombre',
          email: x.cliente_email || null, conCuenta: !!x.cliente_user_id,
          experto: x.experto_id ? { id: x.experto_id, nombre: x.experto_nombre } : null,
          vistazo: String(x.ultimo_texto || '').slice(0, 140),
        })),
      });
    } catch (e: any) {
      console.error('soporte bandeja:', e);
      res.status(500).json({ error: e.message });
    }
  });
}

/** El anfitrión y protocolo de la petición, para volver después de pagar. */
export function origenDe(req: Request): string {
  const host = anfitrion(req);
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const puerto = String(req.headers.host || '').match(/:(\d+)$/)?.[1];
  const local = host === 'localhost' || host === '127.0.0.1';
  return `${local ? 'http' : proto}://${host}${local && puerto ? `:${puerto}` : ''}`;
}
