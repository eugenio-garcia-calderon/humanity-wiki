import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { enviarA, enviarAlResto, estaConectado } from './telecomHub.js';
import { avisar } from './avisos.js';

// ============================================================================
// MENSAJES ENTRE PERSONAS (2026-08-20, petición de Eugenio: «haz mensajería
// entre personas, pero que el agente de Anita y el agente de Eugenio memoricen
// el contenido resumido del mensaje para no perder esa memoria»).
// ============================================================================
// Hasta hoy en la plataforma solo se hablaba CON LA IA. Esto es lo otro: dos
// personas de verdad escribiéndose. Y la vuelta de tuerca que pidió Eugenio:
//
//   CADA MENSAJE DEJA HUELLA EN LOS AGENTES.
//
// En el Mundo 3D cada cual tiene representaciones de la gente que conoce
// (`game_agents` de tipo persona), y esas representaciones tienen memoria. Si
// Eugenio y Anita se escriben por aquí, esa conversación se perdería para sus
// agentes — y son justo ellos los que deberían saberlo. Así que al enviar un
// mensaje se apunta un resumen en los DOS lados: en el agente que representa a
// Anita dentro del mundo de Eugenio, y en el que representa a Eugenio dentro
// del de Anita. El puente entre un agente y una cuenta real es la columna
// `persona_user_id`, que ya existía.
//
// ── 2026-08-22: EL MENSAJE YA NO ESPERA A QUE RECARGUES ────────────────────
// Esto nació pidiendo la conversación al abrirla y nada más. Para sustituir a
// WhatsApp eso no vale: un mensaje tiene que APARECER. Ahora, al guardar uno,
// se empuja por la conexión abierta de la otra persona (`telecomHub`), que es
// el mismo cable por el que suena una llamada.
//
// Y CON ÉL LLEGAN LAS DOS MARCAS DE VERIFICACIÓN, que no son un adorno:
//   ✓   guardado en el servidor
//   ✓✓  entregado en el aparato de la otra persona
//   ✓✓  en verde: leído
// «Entregado» se apunta cuando el empujón llega de verdad a un aparato suyo,
// no cuando el servidor termina el INSERT. Si no hay nadie conectado, se queda
// sin entregar y se marca en cuanto vuelva a abrir la aplicación.
//
// EL «RESUMEN» NO LLAMA A LA IA. Se recorta el mensaje y se apunta quién lo
// dijo y cuándo. Resumir de verdad costaría una llamada al modelo por cada
// mensaje enviado —dinero real de Eugenio, en el camino crítico del envío— y
// para un mensaje corto no aporta nada. Si algún día interesa, se cambia esta
// función y ya está.

const nuevoId = () =>
  `MSG${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

/** Lo que se le queda grabado a un agente de un mensaje. */
const resumir = (texto: string, quien: string) => {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  const corto = limpio.length > 220 ? `${limpio.slice(0, 217)}…` : limpio;
  return `${quien} escribió: «${corto}»`;
};

export function registerMensajesRoutes(app: Express, db: any) {
  /** Cómo se llama alguien, para el resumen y para la bandeja. */
  const nombreDe = async (id: string) => {
    const r = await db.execute(sql`SELECT display_name, name FROM users WHERE id = ${id}`);
    const f = r.rows[0] as any;
    return f?.display_name || f?.name || 'Alguien';
  };

  /**
   * Apunta el resumen en el agente que representa a `sobre` dentro del mundo de
   * `dueño`. Si esa persona no tiene una representación de la otra, no pasa
   * nada: no se crea ninguna a la fuerza. Crear agentes sin que nadie los pida
   * llenaría el mundo de gente que nadie ha invitado.
   */
  const recordar = async (duenoId: string, sobreId: string, linea: string) => {
    const entrada = JSON.stringify([{ texto: linea, created_at: new Date().toISOString(), origen: 'mensaje' }]);
    await db.execute(sql`
      UPDATE game_agents
      SET memoria = coalesce(memoria, '[]'::jsonb) || ${entrada}::jsonb, updated_at = now()
      WHERE user_id = ${duenoId} AND persona_user_id = ${sobreId}
        AND tipo = 'persona' AND archived_at IS NULL
    `);
  };

  /** POST /api/mensajes  { para, texto } */
  app.post('/api/mensajes', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión para escribir.' });
      const para = String(req.body?.para || '').trim();
      const texto = String(req.body?.texto || '').trim();

      // EL ADJUNTO YA ESTÁ SUBIDO cuando llega aquí: el navegador lo manda
      // antes a `/api/uploads`, que es quien decide el tipo de verdad y dónde
      // vive el fichero. Aquí solo se apunta a qué mensaje pertenece — así
      // este endpoint sigue siendo JSON pequeño y no hay dos sitios que
      // decidan qué formatos se aceptan.
      const a = req.body?.adjunto;
      const adjuntoUrl = a?.url ? String(a.url).trim() : null;
      // Solo lo que sirve ESTE servidor. Una URL de fuera metida aquí sería un
      // rastreador —o algo peor— empotrado en la conversación de otro.
      if (adjuntoUrl && !adjuntoUrl.startsWith('/uploads/')) {
        return res.status(400).json({ error: 'Ese adjunto no es de aquí.' });
      }
      const adjuntoTipo = adjuntoUrl ? String(a?.tipo || 'archivo').slice(0, 40) : null;
      const adjuntoNombre = adjuntoUrl ? String(a?.nombre || '').slice(0, 200) || null : null;
      const adjuntoSegundos = adjuntoUrl && Number.isFinite(Number(a?.segundos))
        ? Math.max(0, Math.min(3600, Math.round(Number(a.segundos)))) : null;

      if (!para) return res.status(400).json({ error: '¿A quién se lo escribes?' });
      if (!texto && !adjuntoUrl) return res.status(400).json({ error: 'El mensaje está vacío.' });
      if (texto.length > 5000) return res.status(400).json({ error: 'El mensaje es demasiado largo.' });
      if (para === req.user.id) return res.status(400).json({ error: 'No puedes escribirte a ti.' });

      const destino = await db.execute(sql`
        SELECT id FROM users WHERE id = ${para} AND archived_at IS NULL
      `);
      if (!destino.rows.length) return res.status(404).json({ error: 'Esa persona no existe.' });

      // BLOQUEO (2026-08-22). Es el sitio donde más importa: un bloqueo que
      // esconde publicaciones pero deja pasar mensajes directos no protege de
      // nada a quien está siendo molestado, que es justo para lo que existe.
      //
      // `bloqueado_entre` mira los dos sentidos, así que esta única
      // comprobación cubre las dos: ni escribo a quien bloqueé ni me escribe
      // quien me bloqueó a mí.
      //
      // EL MENSAJE NO DICE QUIÉN BLOQUEÓ A QUIÉN, a propósito. «No has podido
      // bloquear» delataría la decisión del otro, y quien bloquea lo hace para
      // dejar de aparecer, no para anunciarlo.
      const bloq = await db.execute(sql`
        SELECT bloqueado_entre(${req.user.id}, ${para}) AS hay
      `);
      if ((bloq.rows[0] as any)?.hay) {
        return res.status(403).json({ error: 'No puedes escribir a esta persona.' });
      }

      const id = nuevoId();
      const fecha = new Date().toISOString();
      await db.execute(sql`
        INSERT INTO mensajes (id, de_user_id, para_user_id, texto,
                              adjunto_url, adjunto_tipo, adjunto_nombre, adjunto_segundos)
        VALUES (${id}, ${req.user.id}, ${para}, ${texto || null},
                ${adjuntoUrl}, ${adjuntoTipo}, ${adjuntoNombre}, ${adjuntoSegundos})
      `);

      // ── QUE APAREZCA SOLO ──────────────────────────────────────────────
      const sobre = {
        id, texto: texto || null, fecha,
        adjunto: adjuntoUrl ? { url: adjuntoUrl, tipo: adjuntoTipo, nombre: adjuntoNombre, segundos: adjuntoSegundos } : null,
      };
      const llegaron = enviarA(para, { tipo: 'mensaje', de: req.user.id, mensaje: { ...sobre, mio: false } });

      // TUS OTROS APARATOS TAMBIÉN. Si escribes desde el portátil, el móvil
      // tiene que enseñar lo que acabas de mandar: si no, cada aparato guarda
      // media conversación.
      const miAparato = String(req.body?.dispositivo || '');
      enviarAlResto(req.user.id, miAparato, { tipo: 'mensaje', de: req.user.id, con: para, mensaje: { ...sobre, mio: true } });

      let entregado = false;
      if (llegaron > 0) {
        entregado = true;
        await db.execute(sql`UPDATE mensajes SET entregado_at = now() WHERE id = ${id}`);
        enviarA(req.user.id, { tipo: 'entregados', ids: [id], con: para });
      } else {
        // NO ESTÁ. Entonces sí va a la campana: es lo único que le avisará.
        // Con la persona conectada, la campana sería ruido encima del mensaje
        // que ya ha visto aparecer.
        await avisar(db, {
          paraQuien: para, dePartede: req.user.id, tipo: 'mensaje',
          entidadTipo: 'mensajes', entidadId: id,
          datos: { texto: (texto || '📎 Un archivo').slice(0, 120) },
        });
      }

      // LA MEMORIA DE LOS DOS AGENTES. Va después de guardar y sin bloquear la
      // respuesta si falla: que la representación no se entere es un problema
      // menor; perder el mensaje, no.
      try {
        const [yo] = await Promise.all([nombreDe(req.user.id)]);
        const paraElResumen = texto || `un ${adjuntoTipo === 'audio' ? 'audio' : 'archivo'}`;
        await Promise.all([
          // En MI mundo, la representación de la otra persona recuerda lo que le dije.
          recordar(req.user.id, para, resumir(paraElResumen, yo)),
          // Y en SU mundo, la representación mía recuerda lo que recibió.
          recordar(para, req.user.id, resumir(paraElResumen, yo)),
        ]);
      } catch (e) {
        console.error('memoria de agentes tras mensaje:', e);
      }

      res.json({ id, ok: true, entregado, fecha });
    } catch (e: any) {
      console.error('enviar mensaje error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/mensajes — la bandeja: con quién hablas y qué falta por leer. */
  app.get('/api/mensajes', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const yo = req.user.id;
      // UNA SOLA CONSULTA, con el nombre ya unido. Se intentó primero agrupar
      // aquí y pedir los nombres después con `id = ANY(<lista>)`, y eso NO
      // funciona: una lista de JavaScript viaja como un parámetro suelto, no
      // como un array de Postgres, y la consulta revienta. Uniendo la tabla de
      // personas dentro se evita el problema y además es un viaje menos.
      const rows = await db.execute(sql`
        WITH hilos AS (
          SELECT
            CASE WHEN m.de_user_id = ${yo} THEN m.para_user_id ELSE m.de_user_id END AS con,
            max(m.created_at) AS ultima,
            count(*) FILTER (WHERE m.para_user_id = ${yo} AND m.leido_at IS NULL)::int AS sin_leer,
            count(*)::int AS total
          FROM mensajes m
          WHERE (m.de_user_id = ${yo} OR m.para_user_id = ${yo}) AND m.archived_at IS NULL
          GROUP BY 1
        ),
        ultimos AS (
          SELECT DISTINCT ON (LEAST(m.de_user_id, m.para_user_id), GREATEST(m.de_user_id, m.para_user_id))
                 CASE WHEN m.de_user_id = ${yo} THEN m.para_user_id ELSE m.de_user_id END AS con,
                 m.texto, m.adjunto_tipo, m.de_user_id
          FROM mensajes m
          WHERE (m.de_user_id = ${yo} OR m.para_user_id = ${yo}) AND m.archived_at IS NULL
          ORDER BY LEAST(m.de_user_id, m.para_user_id), GREATEST(m.de_user_id, m.para_user_id), m.created_at DESC
        )
        SELECT h.con, h.ultima, h.sin_leer, h.total,
               u.display_name, u.name, u.avatar_url,
               x.texto AS ultimo_texto, x.adjunto_tipo AS ultimo_adjunto, x.de_user_id AS ultimo_de
        FROM hilos h
        JOIN users u ON u.id = h.con AND u.archived_at IS NULL
        LEFT JOIN ultimos x ON x.con = h.con
        ORDER BY h.ultima DESC
        LIMIT 100
      `);

      res.json({
        conversaciones: (rows.rows as any[]).map(r => ({
          con: r.con,
          nombre: r.display_name || r.name || 'Persona',
          avatar: r.avatar_url || null,
          ultima: r.ultima, sinLeer: r.sin_leer, total: r.total,
          // LA ÚLTIMA LÍNEA DE CADA CONVERSACIÓN. Sin ella, la lista es una
          // columna de nombres y hay que entrar en cada uno para saber de qué
          // iba. Es lo primero que se mira en cualquier mensajería.
          vistazo: r.ultimo_texto
            || (r.ultimo_adjunto === 'audio' ? '🎤 Nota de voz'
              : r.ultimo_adjunto === 'imagen' ? '📷 Foto'
              : r.ultimo_adjunto ? '📎 Archivo' : ''),
          ultimoMio: r.ultimo_de === yo,
          conectado: estaConectado(r.con),
        })),
      });
    } catch (e: any) {
      console.error('bandeja error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/mensajes/:id — la conversación con esa persona. Al leerla, se
   *  marcan como leídos los que te mandó: entrar ES leer. */
  app.get('/api/mensajes/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const yo = req.user.id;
      const otro = req.params.id;
      const rows = await db.execute(sql`
        SELECT id, de_user_id, para_user_id, texto, created_at, leido_at, entregado_at,
               adjunto_url, adjunto_tipo, adjunto_nombre, adjunto_segundos
        FROM mensajes
        WHERE archived_at IS NULL
          AND ((de_user_id = ${yo} AND para_user_id = ${otro})
            OR (de_user_id = ${otro} AND para_user_id = ${yo}))
        ORDER BY created_at
        LIMIT 500
      `);
      const leidos = await db.execute(sql`
        UPDATE mensajes SET leido_at = now()
        WHERE para_user_id = ${yo} AND de_user_id = ${otro} AND leido_at IS NULL
        RETURNING id
      `);

      // QUE LA OTRA PERSONA VEA LAS DOS MARCAS PONERSE AZULES AHORA, no la
      // próxima vez que recargue. Es el mismo cable de las llamadas.
      const ids = (leidos.rows as any[]).map(r => r.id);
      if (ids.length) enviarA(otro, { tipo: 'leidos', ids, con: yo });

      res.json({
        conectado: estaConectado(otro),
        mensajes: (rows.rows as any[]).map(m => ({
          id: m.id, mio: m.de_user_id === yo, texto: m.texto, fecha: m.created_at,
          entregado: Boolean(m.entregado_at),
          leido: Boolean(m.leido_at),
          adjunto: m.adjunto_url
            ? { url: m.adjunto_url, tipo: m.adjunto_tipo, nombre: m.adjunto_nombre, segundos: m.adjunto_segundos }
            : null,
        })),
      });
    } catch (e: any) {
      console.error('conversación error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
