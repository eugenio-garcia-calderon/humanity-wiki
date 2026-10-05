import { sql } from 'drizzle-orm';

// ============================================================================
// VACIAR LAS CUENTAS QUE PIDIERON BORRARSE HACE MÁS DE 15 DÍAS
// ============================================================================
// La segunda mitad del borrado de cuenta (la primera —marcar `deleted_at` y
// cerrar sesiones— la hace la aplicación al pulsar el botón).
//
// ── POR QUÉ VIVE AQUÍ DESDE EL 2026-10-05 ──────────────────────────────────
// Corría como tarea programada de GitHub (`vaciar-cuentas.yml`) y NO SE HABÍA
// EJECUTADO NUNCA: le faltaba el secreto con la dirección de la base de datos,
// la base de datos de producción no es accesible desde fuera del servidor (y
// así debe seguir), y además fallaba antes al instalar `pg`. Cada día mandaba
// a Eugenio un correo de «Run failed». Comprobado ese día: ninguna cuenta
// estaba pendiente, así que no se había incumplido el plazo con nadie.
//
// Ahora corre dentro del propio servidor, una vez al día, con la conexión que
// ya tiene: ni contenedor nuevo, ni proceso aparte, ni puerto abierto.
//
// ── QUÉ SE VACÍA Y QUÉ NO ─────────────────────────────────────────────────
// Se vacía lo que identifica a una persona; se queda lo que escribió (49
// tablas apuntan a `users`), a nombre de «Usuario eliminado». Es lo que
// decidió Eugenio y lo que pide la ley.
//
// ── NINGUNA COLUMNA SIN CLASIFICAR ─────────────────────────────────────────
// Si `users` gana una columna que no está en ninguna de las dos listas, NO se
// vacía nada y se dice cuál es: «no clasificada» no puede acabar significando
// «se queda». Añadir una columna a `users` es añadir una línea aquí.

const DIAS = 15;

/** Lo que identifica a una persona. Se vacía. */
const SE_VACIAN = [
  'email', 'name', 'display_name', 'avatar_url', 'banner_url', 'bio', 'location',
  'website', 'socials', 'specialties', 'ubicaciones', 'objetivos', 'handle',
  'google_id', 'password_hash', 'email_verified', 'telefono', 'telefono_buscable',
  'llamadas_de',
];

/** Lo que se queda a propósito: no identifica a nadie, o sostiene la fila. */
const SE_QUEDAN = [
  'id', 'uuid', 'role', 'role_level', 'created_at', 'updated_at', 'created_by',
  'updated_by', 'version', 'archived_at', 'organization_id', 'reputation',
  'impact_score', 'last_login_at', 'ui_settings', 'puntos', 'deleted_at',
  'anonimizado_en',
];

export async function vaciarCuentas(db: any): Promise<void> {
  const columnas = (await db.execute(sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'users'
  `)).rows.map((c: any) => String(c.column_name));
  const sinClasificar = columnas.filter((c: string) => !SE_VACIAN.includes(c) && !SE_QUEDAN.includes(c));
  if (sinClasificar.length) {
    console.error(`[cuentas] NO se ha vaciado ninguna cuenta: «users» tiene columnas sin clasificar (${sinClasificar.join(', ')}). Añádelas a SE_VACIAN o SE_QUEDAN en src/server/vaciarCuentas.ts.`);
    return;
  }

  const pendientes = (await db.execute(sql`
    SELECT id FROM users
    WHERE deleted_at IS NOT NULL AND anonimizado_en IS NULL
      AND deleted_at < now() - (${String(DIAS)} || ' days')::interval
    ORDER BY deleted_at
  `)).rows as any[];
  if (!pendientes.length) return;

  for (const r of pendientes) {
    // Una transacción por cuenta: si una falla, las demás se vacían igual.
    try {
      await db.transaction(async (tx: any) => {
        await tx.execute(sql`
          UPDATE users SET
            email = 'borrado-' || gen_random_uuid()::text || '@cuenta.invalid',
            name = NULL,
            -- «Usuario eliminado»: es lo que la página pública promete.
            display_name = 'Usuario eliminado',
            avatar_url = NULL, banner_url = NULL, bio = NULL, location = NULL, website = NULL,
            socials = '{}'::jsonb, specialties = '[]'::jsonb, ubicaciones = '[]'::jsonb, objetivos = '[]'::jsonb,
            handle = NULL,
            -- El teléfono se va y se cierra: ni buscarlo ni llamarle.
            telefono = NULL, telefono_buscable = false, llamadas_de = 'nadie',
            google_id = NULL, password_hash = NULL, email_verified = false,
            anonimizado_en = now(), updated_at = now()
          WHERE id = ${r.id} AND anonimizado_en IS NULL
        `);
        // Ninguna puerta abierta: ni sesiones ni enlaces de recuperación vivos.
        await tx.execute(sql`UPDATE sessions SET revoked_at = now() WHERE user_id = ${r.id} AND revoked_at IS NULL`);
        await tx.execute(sql`UPDATE password_resets SET used_at = now() WHERE user_id = ${r.id} AND used_at IS NULL`);
      });
      console.log(`[cuentas] vaciada ${r.id} (pidió borrarse hace más de ${DIAS} días)`);
    } catch (e: any) {
      console.error(`[cuentas] FALLÓ ${r.id}: ${e.message}`);
    }
  }
}

/** Una pasada a los diez minutos de arrancar y después una al día. */
export function registrarVaciadoCuentas(_app: unknown, db: any) {
  const pasada = () => vaciarCuentas(db).catch(e => console.error('[cuentas] la pasada falló:', e.message));
  setTimeout(pasada, 10 * 60 * 1000).unref?.();
  setInterval(pasada, 24 * 60 * 60 * 1000).unref?.();
}
