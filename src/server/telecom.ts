import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import {
  apuntar, enviarA, enviarAlDispositivo, enviarAlResto,
  estaConectado, conectadosDe, arrancarLatido, recuento,
} from './telecomHub.js';
import { avisar } from './avisos.js';
import { normalizarTelefono } from '../utils/telefono.js';

// ============================================================================
// TELECOMUNICACIONES (2026-08-22)
// ============================================================================
// Eugenio: «quiero que esta plataforma sustituya a WhatsApp, que se pueda
// enviar mensajes y hacer llamadas y videollamadas compartiendo pantalla etc.
// Y que con un número de la persona le puedas encontrar en la base de datos y
// enviarle un mensaje o llamarle, y le saltará en su aplicación».
//
// ── LO QUE HACE ESTE FICHERO, Y LO QUE NO ──────────────────────────────────
// Este módulo NO transporta voz ni vídeo. Es importante entenderlo porque
// explica por qué una videollamada de cuatro personas no cuesta aquí ni un
// céntimo de servidor:
//
//   · EL AUDIO Y EL VÍDEO VAN DE UN NAVEGADOR AL OTRO, directamente (WebRTC).
//     No pasan por Hetzner. Van cifrados de extremo a extremo porque el
//     protocolo no admite otra cosa, y ni este servidor ni nadie que lo mire
//     puede oírlos.
//   · LO QUE HACE ESTE FICHERO ES PRESENTARLOS. Dos navegadores que no se
//     conocen no pueden encontrarse solos: necesitan un intermediario que les
//     pase cuatro sobres cerrados —«esto es lo que sé hacer», «esta es mi
//     dirección»— hasta que consiguen hablarse. Eso son cuarenta líneas de
//     reenvío y se acabó su trabajo. A partir de ahí, el servidor sobra.
//
// Se dice porque cambia la conversación sobre el coste: el mensaje cuesta una
// fila; la llamada, cero.
//
// ── EL AGUJERO QUE QUEDA ABIERTO Y HAY QUE SABER ───────────────────────────
// Sin un servidor TURN, entre el 10 % y el 15 % de las llamadas NO conectarán:
// las que salen de una red de empresa con NAT simétrico o de algunas redes
// móviles. Los dos navegadores se ven, se saludan, y no encuentran camino. Hoy
// solo hay STUN (que es gratis y solo sirve para preguntar «¿cuál es mi
// dirección pública?»). TURN reenvía el audio cuando no hay camino directo, y
// eso ya son bytes y ya cuesta dinero — unos 5-10 €/mes en el propio Hetzner
// con `coturn`, o un servicio contratado.
//
// LA DECISIÓN ESTÁ TOMADA A MEDIAS A PROPÓSITO: el código ya lee un TURN de
// las variables de entorno (`TURN_URL`, `TURN_USUARIO`, `TURN_CLAVE`). El día
// que se levante uno, se rellenan tres variables y funciona. Sin ellas, la
// llamada que no puede conectar lo DICE con esas palabras en vez de quedarse
// girando para siempre.

/** Cuánto suena antes de darse por perdida. WhatsApp corta cerca de los 45 s. */
const SONANDO_MS = 45_000;

/** Cuántas búsquedas por número puede hacer una persona en diez minutos. */
const BUSQUEDAS_POR_VENTANA = 40;
const VENTANA_MS = 10 * 60_000;

const nuevoId = (prefijo: string) =>
  `${prefijo}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

// ── LAS LLAMADAS VIVAS, EN MEMORIA ──────────────────────────────────────────
// Una negociación de WebRTC son entre 10 y 30 mensajes de «esta es otra
// dirección por la que puedes probar», y llegan en ráfaga en los dos primeros
// segundos. Comprobar en la base de datos, en cada uno de ellos, que quien
// habla es de verdad parte de esa llamada serían treinta consultas para una
// respuesta que no ha cambiado.
//
// POR QUÉ SE PUEDE TENER EN MEMORIA SIN MENTIR: una llamada en curso no
// sobrevive a un reinicio del servidor de todas formas —las conexiones abiertas
// se cortan y los dos navegadores se enteran—, así que aquí no hay ningún
// estado que se pueda perder y que importase. La FILA de la llamada sí va a la
// base de datos, y esa es la que se queda.
interface Viva {
  id: string;
  de: string;
  para: string;
  /** El aparato desde el que se llamó y el que descolgó. La señalización va a
   *  uno concreto: si fuera a todos, la pestaña que se dejó abierta en el
   *  trabajo contestaría a una negociación que no es suya. */
  deDispositivo: string;
  paraDispositivo: string | null;
  tipo: 'audio' | 'video';
  timbre: NodeJS.Timeout | null;
}
const vivas = new Map<string, Viva>();

/** Las llamadas en las que anda metida una persona ahora mismo. */
const vivaDe = (userId: string): Viva | undefined => {
  for (const v of vivas.values()) if (v.de === userId || v.para === userId) return v;
  return undefined;
};

const cerrarViva = (id: string) => {
  const v = vivas.get(id);
  if (v?.timbre) clearTimeout(v.timbre);
  vivas.delete(id);
};

// ── EL FRENO DE LA BÚSQUEDA POR NÚMERO ──────────────────────────────────────
// Buscar por número es, mirado de cerca, un oráculo: «¿está este número
// registrado?». Con él y una lista de números se puede ir raspando quién está
// en la plataforma y quién no. No es un fallo de seguridad grave —WhatsApp
// tiene exactamente el mismo y por eso se le han sacado directorios enteros—
// pero no hace falta regalarlo.
//
// NO SE USA `src/server/limites`, y conviene decir por qué: ese módulo cuenta
// FALLOS (contraseñas equivocadas, sobre todo) para frenar a quien prueba a
// ciegas. Aquí lo que hay que contar son ACIERTOS: cuarenta búsquedas buenas
// seguidas son justo la señal sospechosa. Es otra pregunta, así que es otro
// contador, y son ocho líneas.
const busquedas = new Map<string, { desde: number; cuantas: number }>();

/** Y el mismo freno para RECLAMAR un número, por un motivo distinto: decir «ese
 *  número ya está en otra cuenta» es, mirado con mala idea, otra forma de
 *  preguntar «¿está esta persona aquí?». El mensaje hace falta —quien se
 *  equivoca al escribir su propio número tiene derecho a saber por qué no
 *  entra— así que no se quita: se limita a cinco intentos por hora, que
 *  convierte el listín en imposible y no estorba a nadie de verdad. */
const reclamos = new Map<string, { desde: number; cuantas: number }>();
const RECLAMOS_POR_HORA = 5;
const dentroDelCupo = (mapa: Map<string, { desde: number; cuantas: number }>, clave: string, cupo: number, ventana: number): boolean => {
  const ahora = Date.now();
  const b = mapa.get(clave);
  if (!b || ahora - b.desde > ventana) { mapa.set(clave, { desde: ahora, cuantas: 1 }); return true; }
  b.cuantas++;
  return b.cuantas <= cupo;
};
const puedeBuscar = (userId: string) => dentroDelCupo(busquedas, userId, BUSQUEDAS_POR_VENTANA, VENTANA_MS);
const puedeReclamar = (userId: string) => dentroDelCupo(reclamos, userId, RECLAMOS_POR_HORA, 60 * 60_000);

export function registerTelecomRoutes(app: Express, db: any) {
  arrancarLatido();

  /** Los datos públicos de una persona, que es lo único que sale de aquí. */
  const fichaDe = async (id: string) => {
    const r = await db.execute(sql`
      SELECT id, display_name, name, avatar_url, handle FROM users WHERE id = ${id} AND archived_at IS NULL
    `);
    const u = r.rows[0] as any;
    if (!u) return null;
    return {
      id: u.id,
      nombre: u.display_name || u.name || 'Persona',
      avatar: u.avatar_url || null,
      handle: u.handle || null,
    };
  };

  /** Con quién hablas. Es a quien se le cuenta que te has conectado: nadie
   *  más tiene por qué saber cuándo abres la aplicación. */
  const interlocutoresDe = async (userId: string): Promise<string[]> => {
    const r = await db.execute(sql`
      SELECT DISTINCT CASE WHEN de_user_id = ${userId} THEN para_user_id ELSE de_user_id END AS otro
      FROM mensajes
      WHERE (de_user_id = ${userId} OR para_user_id = ${userId}) AND archived_at IS NULL
      LIMIT 500
    `);
    return (r.rows as any[]).map(f => f.otro).filter(Boolean);
  };

  // ══ LA CONEXIÓN ═══════════════════════════════════════════════════════════
  /**
   * GET /api/telecom/conexion — el cable abierto.
   *
   * Se queda colgada a propósito: es una respuesta que no termina nunca y por
   * la que el servidor va escribiendo. Mientras esté abierta, a esta persona
   * se le puede hacer sonar el teléfono.
   */
  app.get('/api/telecom/conexion', async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    const yo = req.user.id;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // `no-transform` NO ES ADORNO: sin él, un proxy que comprima por su
      // cuenta se guarda los eventos en un búfer hasta llenarlo, y un timbre
      // que llega treinta segundos tarde no es un timbre.
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const primeraDelAparato = !estaConectado(yo);
    const { dispositivo, soltar } = apuntar(yo, res);
    res.write(`data: ${JSON.stringify({ tipo: 'hola', dispositivo })}\n\n`);

    // LO QUE TE HA LLEGADO MIENTRAS NO ESTABAS. Se marca entregado ahora, que
    // es la verdad: ha llegado a tu aparato en este momento, no cuando el
    // servidor lo guardó. Y se le dice a quien escribió, para que su segunda
    // marca aparezca sola.
    try {
      const pendientes = await db.execute(sql`
        UPDATE mensajes SET entregado_at = now()
        WHERE para_user_id = ${yo} AND entregado_at IS NULL AND archived_at IS NULL
        RETURNING id, de_user_id
      `);
      const porQuien = new Map<string, string[]>();
      for (const m of pendientes.rows as any[]) {
        if (!porQuien.has(m.de_user_id)) porQuien.set(m.de_user_id, []);
        porQuien.get(m.de_user_id)!.push(m.id);
      }
      for (const [quien, ids] of porQuien) enviarA(quien, { tipo: 'entregados', ids, con: yo });
    } catch (e) {
      console.error('[telecom] marcar entregados:', e);
    }

    // QUE SE ENTEREN LOS TUYOS, Y SOLO LOS TUYOS.
    if (primeraDelAparato) {
      try {
        for (const otro of await interlocutoresDe(yo)) enviarA(otro, { tipo: 'presencia', quien: yo, conectado: true });
      } catch (e) { console.error('[telecom] presencia al entrar:', e); }
    }

    req.on('close', async () => {
      soltar();
      // SOLO SE AVISA DE QUE TE HAS IDO SI NO TE QUEDA NINGÚN APARATO. Cerrar
      // una pestaña de tres no es desconectarse.
      if (estaConectado(yo)) return;
      // Y si estabas en una llamada, la llamada se cae contigo. Dejarla
      // «en curso» para siempre dejaría a la otra persona mirando una pantalla
      // que no se va a mover nunca.
      const v = vivaDe(yo);
      if (v) await terminar(v.id, yo, 'terminada', 'se_fue');
      try {
        for (const otro of await interlocutoresDe(yo)) enviarA(otro, { tipo: 'presencia', quien: yo, conectado: false });
      } catch { /* si no se puede avisar, el otro lado lo verá al recargar */ }
    });
  });

  /** GET /api/telecom/presencia?ids=a,b,c — quién está ahora mismo. */
  app.get('/api/telecom/presencia', (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    const ids = String(req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 500);
    res.json({ conectados: conectadosDe(ids) });
  });

  /** GET /api/telecom/hielo — por dónde intentar la conexión directa.
   *
   *  Se sirve desde el servidor y no se escribe en el cliente porque el día que
   *  haya TURN, sus credenciales NO pueden estar en el código del navegador:
   *  cualquiera se las copiaría y usaría el servidor de reenvío de Eugenio para
   *  su propio tráfico. */
  app.get('/api/telecom/hielo', (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    const servidores: any[] = [
      // STUN público de Google. Solo contesta «tu dirección pública es esta»:
      // no ve tráfico, no transporta nada y no hay nada que filtrar.
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];
    if (process.env.TURN_URL) {
      servidores.push({
        urls: process.env.TURN_URL.split(',').map(s => s.trim()).filter(Boolean),
        username: process.env.TURN_USUARIO || undefined,
        credential: process.env.TURN_CLAVE || undefined,
      });
    }
    res.json({ servidores, hayTurn: Boolean(process.env.TURN_URL) });
  });

  // ══ EL NÚMERO ═════════════════════════════════════════════════════════════
  /** GET /api/telecom/yo — mi número y si dejo que me encuentren con él. */
  app.get('/api/telecom/yo', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const r = await db.execute(sql`SELECT telefono, telefono_buscable, llamadas_de FROM users WHERE id = ${req.user.id}`);
      const u = r.rows[0] as any;
      res.json({
        telefono: u?.telefono || null,
        buscable: u?.telefono_buscable !== false,
        llamadasDe: u?.llamadas_de || 'conocidos',
        ...recuento(),
      });
    } catch (e: any) {
      console.error('[telecom] yo:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * PUT /api/telecom/mi-numero — declarar mi número.
   *
   * DECLARAR, NO DEMOSTRAR, y eso hay que decirlo en la pantalla y aquí. No
   * hay SMS de confirmación porque no hay proveedor de SMS contratado, así que
   * a día de hoy alguien podría poner el número de otra persona y recibir las
   * llamadas que iban para ella. Lo que sí lo limita:
   *
   *   · El número es ÚNICO en toda la plataforma (índice de la base de datos).
   *     Quien lo tenga puesto primero lo tiene; el segundo recibe un error.
   *   · Hace falta una cuenta con sesión iniciada, no es anónimo.
   *
   * Cuando haya SMS —una línea de código y unos céntimos por mensaje—, esto
   * pasa a ser un código de seis cifras y el problema desaparece. Mientras
   * tanto está escrito, en la pantalla y aquí, y no escondido.
   */
  app.put('/api/telecom/mi-numero', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const bruto = req.body?.telefono;
      const buscable = req.body?.buscable !== false;
      if (!puedeReclamar(req.user.id)) {
        return res.status(429).json({ error: 'Has cambiado de número demasiadas veces seguidas. Prueba dentro de un rato.' });
      }

      // Quitarlo es tan legítimo como ponerlo.
      if (bruto === null || bruto === '') {
        await db.execute(sql`UPDATE users SET telefono = NULL, updated_at = now() WHERE id = ${req.user.id}`);
        return res.json({ telefono: null, buscable });
      }

      const n = normalizarTelefono(String(bruto || ''));
      if (!n) return res.status(400).json({ error: 'Ese número no se entiende. Escríbelo con el prefijo: +34 600 123 456.' });

      const ocupado = await db.execute(sql`
        SELECT id FROM users WHERE telefono = ${n} AND id <> ${req.user.id}
      `);
      if (ocupado.rows.length) {
        // NO SE DICE «ese número ya está en otra cuenta». Confirmarlo sería
        // decirle a quien pregunta que esa persona tiene cuenta aquí, que es
        // justo lo que la búsqueda por número se cuida de no revelar. Se dice
        // que no se puede y adónde ir, sin confirmar nada.
        return res.status(409).json({
          error: 'No se puede usar ese número en esta cuenta. Si es tuyo y crees que hay un error, escribe a soporte.',
        });
      }

      await db.execute(sql`
        UPDATE users SET telefono = ${n}, telefono_buscable = ${buscable}, updated_at = now()
        WHERE id = ${req.user.id}
      `);
      res.json({ telefono: n, buscable });
    } catch (e: any) {
      console.error('[telecom] mi-numero:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/telecom/buscar?telefono=+34600123456 — quién es este número.
   *
   * DEVUELVE UNA PERSONA O NINGUNA, NUNCA UNA LISTA. Nada de búsquedas
   * parciales por «600…»: eso sería un directorio telefónico de toda la
   * plataforma servido por la puerta de atrás.
   */
  app.get('/api/telecom/buscar', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!puedeBuscar(req.user.id)) {
        return res.status(429).json({ error: 'Demasiadas búsquedas seguidas. Prueba dentro de un rato.' });
      }
      const n = normalizarTelefono(String(req.query.telefono || ''));
      if (!n) return res.status(400).json({ error: 'Ese número no se entiende. Escríbelo con el prefijo: +34 600 123 456.' });

      const r = await db.execute(sql`
        SELECT id, display_name, name, avatar_url, handle
        FROM users
        WHERE telefono = ${n} AND telefono_buscable = true AND archived_at IS NULL
      `);
      const u = r.rows[0] as any;

      // CÓMO LE TIENES GUARDADO TÚ. Si ese número está en tu agenda importada,
      // el nombre que le pusiste tú vale más que el que puso él: es como le
      // vas a reconocer.
      const mio = await db.execute(sql`
        SELECT nombre FROM game_agents
        WHERE user_id = ${req.user.id} AND telefono = ${n} AND archived_at IS NULL
        LIMIT 1
      `);
      const enMiAgenda = (mio.rows[0] as any)?.nombre || null;

      res.json({
        telefono: n,
        enMiAgenda,
        persona: u ? {
          id: u.id,
          nombre: u.display_name || u.name || 'Persona',
          avatar: u.avatar_url || null,
          handle: u.handle || null,
          conectado: estaConectado(u.id),
        } : null,
      });
    } catch (e: any) {
      console.error('[telecom] buscar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/telecom/mis-contactos — de mi agenda, quién está aquí.
   *
   * Esto es LA función de WhatsApp, la que hizo que la gente se cambiara: no
   * buscas a nadie, abres la aplicación y tus contactos de siempre ya están
   * dentro. Se cruzan los números que importaste (que ya viven en tus agentes
   * del Mundo 3D) con los de las personas registradas.
   *
   * EL CRUCE LO HACE POSTGRES CON UN JOIN, no JavaScript con dos listas: con
   * 800 contactos y 5.000 personas, hacerlo aquí serían cuatro millones de
   * comparaciones por cada vez que se abre la pantalla.
   */
  app.get('/api/telecom/mis-contactos', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const r = await db.execute(sql`
        SELECT a.nombre AS nombre_en_mi_agenda, a.telefono,
               u.id, u.display_name, u.name, u.avatar_url, u.handle
        FROM game_agents a
        JOIN users u ON u.telefono = a.telefono
                    AND u.telefono_buscable = true
                    AND u.archived_at IS NULL
                    AND u.id <> ${req.user.id}
        WHERE a.user_id = ${req.user.id} AND a.telefono IS NOT NULL AND a.archived_at IS NULL
        ORDER BY a.nombre
        LIMIT 500
      `);
      res.json({
        contactos: (r.rows as any[]).map(c => ({
          id: c.id,
          // El nombre que le pusiste tú manda sobre el que se puso él.
          nombre: c.nombre_en_mi_agenda || c.display_name || c.name || 'Persona',
          avatar: c.avatar_url || null,
          handle: c.handle || null,
          telefono: c.telefono,
          conectado: estaConectado(c.id),
        })),
      });
    } catch (e: any) {
      console.error('[telecom] mis-contactos:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ══ LAS LLAMADAS ══════════════════════════════════════════════════════════

  /** Cierra una llamada, la apunta y avisa a los dos lados. Un solo sitio: si
   *  cada ruta cerrase por su cuenta acabarían discrepando, y la discrepancia
   *  se vería como una pantalla de llamada que no se va. */
  async function terminar(id: string, quienCuelga: string | null, estado: string, motivo: string) {
    const v = vivas.get(id);
    cerrarViva(id);
    let fila: any = null;
    try {
      const r = await db.execute(sql`
        UPDATE llamadas
        SET estado = ${estado},
            terminada_at = now(),
            segundos = CASE WHEN contestada_at IS NOT NULL
                            THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - contestada_at))::int)
                            ELSE 0 END
        WHERE id = ${id} AND estado IN ('sonando', 'en_curso')
        RETURNING de_user_id, para_user_id, estado, segundos, tipo
      `);
      fila = r.rows[0] as any;
    } catch (e) {
      console.error('[telecom] terminar:', e);
    }
    if (!fila && !v) return null;
    const de = fila?.de_user_id || v?.de;
    const para = fila?.para_user_id || v?.para;
    const evento = { tipo: 'llamada_terminada', llamadaId: id, estado, motivo, segundos: fila?.segundos ?? 0 };
    if (de) enviarA(de, evento);
    if (para) enviarA(para, evento);

    // UNA LLAMADA QUE NO SE COGIÓ ES UNA NOTICIA. Va a la campana, como todo
    // lo demás que le pasa a alguien mientras no mira.
    if ((estado === 'perdida' || estado === 'sin_conexion') && de && para) {
      await avisar(db, {
        paraQuien: para, dePartede: de, tipo: 'llamada_perdida',
        entidadTipo: 'llamadas', entidadId: id,
        datos: { llamada: fila?.tipo || v?.tipo || 'audio' },
      });
    }
    return fila;
  }


  /**
   * PUT /api/telecom/privacidad — quién puede hacer sonar tu teléfono.
   *
   * Va aparte de `mi-numero` a propósito: se cambia por motivos distintos y en
   * momentos distintos. Cerrar el teléfono un martes por la noche no debería
   * obligar a volver a tocar tu número.
   */
  app.put('/api/telecom/privacidad', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const quien = String(req.body?.llamadasDe || '');
      if (!['todos', 'conocidos', 'nadie'].includes(quien)) {
        return res.status(400).json({ error: 'Elige quién puede llamarte.' });
      }
      await db.execute(sql`UPDATE users SET llamadas_de = ${quien}, updated_at = now() WHERE id = ${req.user.id}`);
      res.json({ llamadasDe: quien });
    } catch (e: any) {
      console.error('[telecom] privacidad:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * ¿Puede esta persona hacer sonar el teléfono de esta otra?
   *
   * «Conocido» es cualquiera de las tres cosas que ya significan que os
   * conocéis, y se comprueban EN UNA SOLA CONSULTA porque esto está en el
   * camino de cada llamada:
   *
   *   · os habéis escrito, en cualquier dirección
   *   · le tienes en tu agenda importada (mismo número)
   *   · le sigues
   *
   * No hace falta que sea recíproco: si yo te tengo en mi agenda, tú puedes
   * llamarme. Al revés sería pedirle a quien recibe que hubiera dado un paso
   * que nadie le ha pedido dar.
   */
  const puedeLlamarme = async (deQuien: string, aQuien: string) => {
    const r = await db.execute(sql`
      SELECT
        (SELECT llamadas_de FROM users WHERE id = ${aQuien}) AS politica,
        EXISTS (SELECT 1 FROM mensajes
                 WHERE (de_user_id = ${deQuien} AND para_user_id = ${aQuien})
                    OR (de_user_id = ${aQuien} AND para_user_id = ${deQuien})) AS hablasteis,
        EXISTS (SELECT 1 FROM game_agents a
                 WHERE a.user_id = ${aQuien} AND a.archived_at IS NULL AND a.telefono IS NOT NULL
                   AND a.telefono = (SELECT telefono FROM users WHERE id = ${deQuien})) AS en_su_agenda,
        EXISTS (SELECT 1 FROM follows
                 WHERE follower_user_id = ${aQuien} AND entity_type = 'users' AND entity_id = ${deQuien}) AS te_sigue
    `);
    const f = r.rows[0] as any;
    const politica = f?.politica || 'conocidos';
    if (politica === 'todos') return { puede: true };
    if (politica === 'nadie') return { puede: false, porque: 'nadie' };
    const conocido = f?.hablasteis || f?.en_su_agenda || f?.te_sigue;
    return conocido ? { puede: true } : { puede: false, porque: 'desconocido' };
  };

  /**
   * POST /api/telecom/llamada — que suene el teléfono de alguien.
   * Cuerpo: `{ para | telefono, tipo: 'audio'|'video', dispositivo }`
   */
  app.post('/api/telecom/llamada', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const yo = req.user.id;
      const tipo = req.body?.tipo === 'video' ? 'video' : 'audio';
      const dispositivo = String(req.body?.dispositivo || '').trim();
      if (!dispositivo) return res.status(400).json({ error: 'Falta el aparato desde el que llamas.' });

      // A quién: por identificador o por número, las dos puertas.
      let destino = String(req.body?.para || '').trim();
      if (!destino && req.body?.telefono) {
        const n = normalizarTelefono(String(req.body.telefono));
        if (!n) return res.status(400).json({ error: 'Ese número no se entiende.' });
        const r = await db.execute(sql`
          SELECT id FROM users WHERE telefono = ${n} AND telefono_buscable = true AND archived_at IS NULL
        `);
        if (!r.rows.length) return res.status(404).json({ error: 'Ese número no está en la plataforma.' });
        destino = (r.rows[0] as any).id;
      }
      if (!destino) return res.status(400).json({ error: '¿A quién llamas?' });
      if (destino === yo) return res.status(400).json({ error: 'No puedes llamarte a ti.' });

      const ficha = await fichaDe(destino);
      if (!ficha) return res.status(404).json({ error: 'Esa persona no existe.' });

      // ¿QUIERE QUE LE LLAMEN, Y QUIERE QUE LE LLAMES TÚ? Se comprueba antes
      // de escribir la fila: una llamada que no se va a permitir no es una
      // llamada perdida, y no tiene por qué dejarle un aviso a nadie.
      const permiso = await puedeLlamarme(yo, destino);
      if (!permiso.puede) {
        return res.status(403).json({
          error: permiso.porque === 'nadie'
            ? `${ficha.nombre} tiene las llamadas cerradas. Puedes escribirle.`
            : `${ficha.nombre} solo acepta llamadas de gente con la que ya ha hablado. Escríbele un mensaje primero.`,
          escribirle: destino,
        });
      }

      // COMUNICANDO. Con una llamada viva no se abre otra: ni la tuya ni la
      // suya. Sin esto, dos llamadas cruzadas comparten micrófono y las dos
      // suenan a nada.
      const ocupadoYo = vivaDe(yo);
      if (ocupadoYo) return res.status(409).json({ error: 'Ya estás en una llamada.', llamadaId: ocupadoYo.id });
      if (vivaDe(destino)) return res.status(409).json({ error: `${ficha.nombre} está comunicando.` });

      const id = nuevoId('LLA');
      await db.execute(sql`
        INSERT INTO llamadas (id, de_user_id, para_user_id, tipo, estado)
        VALUES (${id}, ${yo}, ${destino}, ${tipo}, 'sonando')
      `);

      const quienLlama = await fichaDe(yo);
      const llegaron = enviarA(destino, {
        tipo: 'llamada_entrante',
        llamadaId: id, llamada: tipo,
        de: quienLlama, deDispositivo: dispositivo,
      });

      // NO ESTÁ CONECTADA. Se cierra ya y se dice con esas palabras, en vez de
      // dejar sonando cuarenta y cinco segundos a un teléfono que no existe.
      if (llegaron === 0) {
        await terminar(id, yo, 'sin_conexion', 'no_conectado');
        return res.json({ id, estado: 'sin_conexion', para: ficha, mensaje: `${ficha.nombre} no tiene la aplicación abierta. Le queda el aviso de llamada perdida.` });
      }

      const viva: Viva = { id, de: yo, para: destino, deDispositivo: dispositivo, paraDispositivo: null, tipo, timbre: null };
      viva.timbre = setTimeout(() => { terminar(id, null, 'perdida', 'nadie_lo_cogio').catch(() => {}); }, SONANDO_MS);
      viva.timbre.unref?.();
      vivas.set(id, viva);

      res.json({ id, estado: 'sonando', para: ficha, sonandoMs: SONANDO_MS });
    } catch (e: any) {
      console.error('[telecom] llamar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/telecom/llamada/:id/contestar — descolgar. */
  app.post('/api/telecom/llamada/:id/contestar', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const id = req.params.id;
      const dispositivo = String(req.body?.dispositivo || '').trim();
      const v = vivas.get(id);
      if (!v) return res.status(404).json({ error: 'Esa llamada ya no está.' });
      if (v.para !== req.user.id) return res.status(403).json({ error: 'Esa llamada no es para ti.' });
      if (!dispositivo) return res.status(400).json({ error: 'Falta el aparato.' });

      v.paraDispositivo = dispositivo;
      if (v.timbre) { clearTimeout(v.timbre); v.timbre = null; }

      await db.execute(sql`
        UPDATE llamadas SET estado = 'en_curso', contestada_at = now() WHERE id = ${id} AND estado = 'sonando'
      `);

      // A LOS DEMÁS APARATOS DE QUIEN CONTESTA: deja de sonar. Es lo que hace
      // el móvil cuando coges la llamada en el portátil, y sin ello el resto
      // de la casa sigue sonando.
      enviarAlResto(v.para, dispositivo, { tipo: 'llamada_cogida_en_otro_sitio', llamadaId: id });

      // A QUIEN LLAMÓ, Y A SU APARATO CONCRETO: ya puedes empezar a negociar,
      // y este es el aparato con el que hablas.
      enviarAlDispositivo(v.de, v.deDispositivo, {
        tipo: 'llamada_contestada', llamadaId: id, dispositivo,
      });

      res.json({ ok: true, llamadaId: id, con: v.de, dispositivoDelOtro: v.deDispositivo });
    } catch (e: any) {
      console.error('[telecom] contestar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/telecom/llamada/:id/colgar — colgar o rechazar, según cuándo. */
  app.post('/api/telecom/llamada/:id/colgar', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const id = req.params.id;
      const v = vivas.get(id);
      if (!v) return res.json({ ok: true, yaEstaba: true });
      if (v.de !== req.user.id && v.para !== req.user.id) {
        return res.status(403).json({ error: 'Esa llamada no es tuya.' });
      }
      // EL NOMBRE DEL FINAL DEPENDE DE QUIÉN CUELGA Y DE CUÁNDO:
      //   quien llama, antes de que la cojan  → cancelada
      //   quien recibe, antes de cogerla      → rechazada
      //   cualquiera, ya hablando             → terminada
      const contestada = v.paraDispositivo !== null;
      const estado = contestada ? 'terminada' : (req.user.id === v.de ? 'cancelada' : 'rechazada');
      const fila = await terminar(id, req.user.id, estado, 'colgo');
      res.json({ ok: true, estado, segundos: fila?.segundos ?? 0 });
    } catch (e: any) {
      console.error('[telecom] colgar:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/telecom/senal — el sobre cerrado que va de un navegador al otro.
   *
   * EL SERVIDOR NO MIRA DENTRO. `datos` es lo que WebRTC quiere decirle al otro
   * lado (una descripción de sesión o una dirección candidata) y aquí se
   * reenvía tal cual. Lo único que se comprueba —y es lo importante— es que
   * quien manda sea de verdad una de las dos personas de esa llamada. Sin esa
   * comprobación, cualquiera con un identificador de llamada podría meter una
   * descripción de sesión en la negociación de otros dos.
   */
  app.post('/api/telecom/senal', (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    const { llamadaId, tipo, datos } = req.body || {};
    const v = vivas.get(String(llamadaId || ''));
    if (!v) return res.status(404).json({ error: 'Esa llamada ya no está.' });
    const yo = req.user.id;
    if (v.de !== yo && v.para !== yo) return res.status(403).json({ error: 'Esa llamada no es tuya.' });
    if (!tipo) return res.status(400).json({ error: 'Falta el tipo de señal.' });

    const soyElQueLlama = v.de === yo;
    const otro = soyElQueLlama ? v.para : v.de;
    const suAparato = soyElQueLlama ? v.paraDispositivo : v.deDispositivo;
    if (!suAparato) return res.status(409).json({ error: 'Todavía no ha descolgado.' });

    const llego = enviarAlDispositivo(otro, suAparato, {
      tipo: 'senal', llamadaId: v.id, senal: tipo, datos,
    });
    // Si su aparato ya no está, la llamada está muerta y hay que decirlo: si
    // no, quien habla se queda esperando una respuesta que no llegará.
    if (!llego) { terminar(v.id, null, 'terminada', 'se_fue').catch(() => {}); return res.status(410).json({ error: 'La otra persona se ha desconectado.' }); }
    res.json({ ok: true });
  });

  /** POST /api/telecom/llamada/:id/pantalla — apuntar que alguien compartió
   *  pantalla. Lo que se ve va por el canal directo; esto solo deja constancia
   *  de qué clase de llamada fue. */
  app.post('/api/telecom/llamada/:id/pantalla', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const v = vivas.get(req.params.id);
      if (!v || (v.de !== req.user.id && v.para !== req.user.id)) return res.json({ ok: true });
      await db.execute(sql`UPDATE llamadas SET compartio_pantalla = true WHERE id = ${req.params.id}`);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/telecom/llamadas — el historial. */
  app.get('/api/telecom/llamadas', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const yo = req.user.id;
      const con = String(req.query.con || '').trim();
      const r = await db.execute(sql`
        SELECT l.id, l.de_user_id, l.para_user_id, l.tipo, l.estado, l.segundos,
               l.compartio_pantalla, l.creada_at,
               u.id AS otro_id, u.display_name, u.name, u.avatar_url
        FROM llamadas l
        JOIN users u ON u.id = CASE WHEN l.de_user_id = ${yo} THEN l.para_user_id ELSE l.de_user_id END
        WHERE (l.de_user_id = ${yo} OR l.para_user_id = ${yo})
          AND l.archived_at IS NULL AND l.deleted_at IS NULL
          AND (${con} = '' OR l.de_user_id = ${con} OR l.para_user_id = ${con})
        ORDER BY l.creada_at DESC
        LIMIT 100
      `);
      res.json({
        llamadas: (r.rows as any[]).map(l => {
          const mia = l.de_user_id === yo;   // ¿la hice yo o me la hicieron?
          return {
            id: l.id,
            mia,
            con: { id: l.otro_id, nombre: l.display_name || l.name || 'Persona', avatar: l.avatar_url || null },
            tipo: l.tipo,
            // A QUIEN LLAMÓ NO SE LE DICE QUE LE COLGARON A PROPÓSITO. Saber
            // que te han rechazado no aporta nada bueno y sí bastante daño, y
            // desde fuera es indistinguible de no haber llegado a tiempo: las
            // dos se cuentan como «no contestada». Quien recibió la llamada sí
            // ve la suya como perdida, que es lo que necesita para devolverla.
            estado: mia && (l.estado === 'rechazada' || l.estado === 'perdida')
              ? 'no_contestada'
              : l.estado,
            segundos: l.segundos ?? 0,
            pantalla: l.compartio_pantalla,
            fecha: l.creada_at,
          };
        }),
      });
    } catch (e: any) {
      console.error('[telecom] historial:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * POST /api/telecom/escribiendo — «está escribiendo…».
   *
   * NO SE GUARDA NADA. Es lo más efímero que hay en la plataforma: vale dos
   * segundos y luego es mentira. Escribirlo en la base de datos sería una fila
   * por cada tecla de cada conversación.
   */
  app.post('/api/telecom/escribiendo', (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
    const para = String(req.body?.para || '').trim();
    if (para && para !== req.user.id) {
      enviarA(para, { tipo: 'escribiendo', quien: req.user.id, hasta: Date.now() + 4000 });
    }
    res.json({ ok: true });
  });
}
