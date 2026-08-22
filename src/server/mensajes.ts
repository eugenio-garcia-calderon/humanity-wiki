import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

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
      if (!para) return res.status(400).json({ error: '¿A quién se lo escribes?' });
      if (!texto) return res.status(400).json({ error: 'El mensaje está vacío.' });
      if (texto.length > 5000) return res.status(400).json({ error: 'El mensaje es demasiado largo.' });
      if (para === req.user.id) return res.status(400).json({ error: 'No puedes escribirte a ti.' });

      const destino = await db.execute(sql`
        SELECT id FROM users WHERE id = ${para} AND archived_at IS NULL
      `);
      if (!destino.rows.length) return res.status(404).json({ error: 'Esa persona no existe.' });

      const id = nuevoId();
      await db.execute(sql`
        INSERT INTO mensajes (id, de_user_id, para_user_id, texto)
        VALUES (${id}, ${req.user.id}, ${para}, ${texto})
      `);

      // LA MEMORIA DE LOS DOS AGENTES. Va después de guardar y sin bloquear la
      // respuesta si falla: que la representación no se entere es un problema
      // menor; perder el mensaje, no.
      try {
        const [yo, otro] = await Promise.all([nombreDe(req.user.id), nombreDe(para)]);
        await Promise.all([
          // En MI mundo, la representación de la otra persona recuerda lo que le dije.
          recordar(req.user.id, para, resumir(texto, yo)),
          // Y en SU mundo, la representación mía recuerda lo que recibió.
          recordar(para, req.user.id, resumir(texto, yo)),
        ]);
      } catch (e) {
        console.error('memoria de agentes tras mensaje:', e);
      }

      res.json({ id, ok: true });
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
        )
        SELECT h.con, h.ultima, h.sin_leer, h.total,
               u.display_name, u.name, u.avatar_url
        FROM hilos h
        JOIN users u ON u.id = h.con AND u.archived_at IS NULL
        ORDER BY h.ultima DESC
        LIMIT 100
      `);

      res.json({
        conversaciones: (rows.rows as any[]).map(r => ({
          con: r.con,
          nombre: r.display_name || r.name || 'Persona',
          avatar: r.avatar_url || null,
          ultima: r.ultima, sinLeer: r.sin_leer, total: r.total,
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
        SELECT id, de_user_id, para_user_id, texto, created_at, leido_at
        FROM mensajes
        WHERE archived_at IS NULL
          AND ((de_user_id = ${yo} AND para_user_id = ${otro})
            OR (de_user_id = ${otro} AND para_user_id = ${yo}))
        ORDER BY created_at
        LIMIT 500
      `);
      await db.execute(sql`
        UPDATE mensajes SET leido_at = now()
        WHERE para_user_id = ${yo} AND de_user_id = ${otro} AND leido_at IS NULL
      `);
      res.json({
        mensajes: (rows.rows as any[]).map(m => ({
          id: m.id, mio: m.de_user_id === yo, texto: m.texto, fecha: m.created_at,
        })),
      });
    } catch (e: any) {
      console.error('conversación error:', e);
      res.status(500).json({ error: e.message });
    }
  });
}
