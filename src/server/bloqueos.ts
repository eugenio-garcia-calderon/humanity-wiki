import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ROLE } from './auth.js';

// ============================================================================
// BLOQUEAR A UNA PERSONA (2026-08-22)
// ============================================================================
// Último requisito de la App Store que dependía de nosotros. Apple rechaza una
// aplicación con contenido de otras personas que no permita **bloquear a
// alguien** además de denunciar contenido: denunciar es sobre una cosa,
// bloquear es sobre una persona.
//
// LA REGLA VIVE EN LA BASE DE DATOS, no aquí. `bloqueado_entre(a, b)`
// (migración `0091`) mira los dos sentidos, y cada consulta que filtra añade
// una línea que dice lo mismo. La alternativa —repetir un `NOT IN` en el muro,
// las publicaciones, los comentarios, los lienzos y las personas— son cinco
// sitios donde olvidarlo, y así es como un bloqueo acaba filtrando una lista
// y no las demás.
//
// NO SE AVISA A NADIE. No hay notificación al bloquear, a propósito: avisar
// convierte el bloqueo en una provocación, que es justo de lo que huye quien lo
// pulsa. Por la misma razón `GET /api/bloqueos` devuelve solo **a quién he
// bloqueado yo**, nunca quién me ha bloqueado a mí.

export function registerBloqueosRoutes(app: Express) {
  /*
   * El mismo ayudante que usa `social.ts`, con la misma forma. El
   * `requireLevel` exportado por `auth.ts` es un middleware —devuelve una
   * función— y no encaja dentro de un manejador. Copiarlo aquí es feo; usar el
   * exportado sin mirar su firma es lo que rompe la compilación, que es
   * exactamente lo que pasó al escribir esto.
   */
  const requireLevel = (req: Request, res: Response, min: number): boolean => {
    if (!req.user) { res.status(401).json({ error: 'Debes iniciar sesión.' }); return false; }
    if ((req.user.roleLevel ?? 0) < min) {
      res.status(403).json({ error: `Esta acción requiere nivel ${min} o superior.` });
      return false;
    }
    return true;
  };

  /**
   * A quién he bloqueado yo. Es lo que alimenta la lista de «desbloquear» de
   * Configuración; sin ella, bloquear sería una puerta de un solo sentido.
   */
  app.get('/api/bloqueos', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const filas = await db.execute(sql`
        SELECT b.id, b.bloqueado_id, b.created_at,
               u.display_name, u.avatar_url
          FROM bloqueos b
          JOIN users u ON u.id = b.bloqueado_id
         WHERE b.usuario_id = ${req.user!.id}
         ORDER BY b.created_at DESC
      `);
      res.json(filas.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Bloquear. Repetirlo no hace nada nuevo y no es un error. */
  app.post('/api/bloqueos', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const bloqueado = String(req.body?.usuario_id || '').trim();
      if (!bloqueado) return res.status(400).json({ error: 'Falta a quién bloquear.' });
      if (bloqueado === req.user!.id) {
        return res.status(400).json({ error: 'No puedes bloquearte a ti mismo.' });
      }

      const existe = await db.execute(sql`SELECT id FROM users WHERE id = ${bloqueado}`);
      if (!existe.rows.length) return res.status(404).json({ error: 'Esa persona no existe.' });

      // `ON CONFLICT DO NOTHING`: pulsar dos veces es la misma decisión, no dos.
      // Y sin él, un doble toque en un móvil daría un error de clave única que
      // la persona leería como «no se ha podido bloquear», que es falso.
      await db.execute(sql`
        INSERT INTO bloqueos (usuario_id, bloqueado_id)
        VALUES (${req.user!.id}, ${bloqueado})
        ON CONFLICT (usuario_id, bloqueado_id) DO NOTHING
      `);

      res.json({ ok: true, bloqueado_id: bloqueado });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * Desbloquear. Se borra de verdad, y aquí sí es correcto: un bloqueo no es
   * conocimiento de nadie, es una preferencia de quien lo puso — y guardar el
   * historial de a quién dejaste de bloquear es información sobre una relación
   * personal que no le sirve a nadie y viaja en cada copia de seguridad.
   *
   * El `usuario_id` en el WHERE no es decorativo: sin él, cualquiera con un id
   * podría desbloquearse a sí mismo del bloqueo de otro.
   */
  app.delete('/api/bloqueos/:id', async (req: Request, res: Response) => {
    try {
      if (!requireLevel(req, res, ROLE.USER)) return;
      const r = await db.execute(sql`
        DELETE FROM bloqueos
         WHERE id = ${Number(req.params.id)} AND usuario_id = ${req.user!.id}
        RETURNING id
      `);
      if (!r.rows.length) return res.status(404).json({ error: 'Ese bloqueo no es tuyo o ya no existe.' });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
