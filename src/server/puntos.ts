import type { Express, Request, Response } from 'express';
import { sql } from 'drizzle-orm';

// ============================================================================
// PUNTOS DE HUMANITY.WIKI (2026-08-08, petición del usuario)
// ============================================================================
// Un sistema de puntos interno con saldo decimal — "en un futuro serán
// puntos tokenizados con blockchain, de momento es un sistema de puntos
// interno". Se usan para comprar dentro de la app y para la IA; se ganan
// céntimos de punto cuando una publicación pública propia recibe una vista.
//
// `otorgarPuntos` es el único sitio que toca `users.puntos` — cualquier
// módulo que necesite mover puntos (una vista, una compra, un gasto de IA)
// lo importa de aquí en vez de hacer su propio UPDATE, para que el saldo y
// su libro de movimientos nunca se desincronicen.

const newId = () => `MP${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`;

export type MotivoPuntos = 'regalo_bienvenida' | 'compra' | 'vista_publicacion' | 'gasto_ia' | 'ajuste_admin';

/**
 * Mueve puntos (positivos = ingreso, negativos = gasto) y deja su
 * justificante. No hay comprobación de saldo mínimo para los ingresos; los
 * gastos SÍ deberían comprobarlo antes de llamar (esta función no lo hace
 * por sí sola porque quien gasta sabe mejor qué mensaje de error dar).
 */
export async function otorgarPuntos(
  db: any, userId: string, cantidad: number, motivo: MotivoPuntos,
  extra?: { entidadTipo?: string; entidadId?: string; stripeSessionId?: string },
) {
  await db.execute(sql`UPDATE users SET puntos = puntos + ${cantidad} WHERE id = ${userId}`);
  await db.execute(sql`
    INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo, entidad_tipo, entidad_id, stripe_checkout_session_id)
    VALUES (${newId()}, ${userId}, ${cantidad}, ${motivo}, ${extra?.entidadTipo || null}, ${extra?.entidadId || null}, ${extra?.stripeSessionId || null})
  `);
}

/**
 * Solo el justificante del regalo de bienvenida — el saldo de 100 ya lo puso
 * el DEFAULT de `users.puntos` al crear la fila (migración 0026), así que
 * esto NO toca el saldo: si lo hiciera, lo duplicaría. Se llama una vez,
 * justo después de dar de alta a cada usuario nuevo.
 */
export async function registrarRegaloBienvenida(db: any, userId: string) {
  await db.execute(sql`
    INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo)
    VALUES (${newId()}, ${userId}, 100, 'regalo_bienvenida')
    ON CONFLICT DO NOTHING
  `);
}

export function registerPuntosRoutes(app: Express, db: any) {
  /** GET /api/puntos/saldo — tu saldo y tus últimos movimientos. */
  app.get('/api/puntos/saldo', async (req: Request, res: Response) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión.' });
      const saldo = await db.execute(sql`SELECT puntos FROM users WHERE id = ${req.user.id}`);
      const movimientos = await db.execute(sql`
        SELECT id, cantidad, motivo, entidad_tipo, entidad_id, created_at
        FROM movimientos_puntos WHERE user_id = ${req.user.id}
        ORDER BY created_at DESC LIMIT 20
      `);
      res.json({ puntos: Number((saldo.rows[0] as any)?.puntos ?? 0), movimientos: movimientos.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
