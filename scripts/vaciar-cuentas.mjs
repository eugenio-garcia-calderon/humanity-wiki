#!/usr/bin/env node
// ============================================================================
// VACIAR LAS CUENTAS QUE PIDIERON BORRARSE HACE MÁS DE 15 DÍAS (2026-08-22)
// ============================================================================
// La segunda mitad del borrado de cuenta. La primera —marcar `deleted_at` y
// cerrar las sesiones— la hace la propia aplicación al pulsar el botón. Esto
// es lo que pasa **cuando se cumple el plazo**, y corre solo todos los días
// (`.github/workflows/vaciar-cuentas.yml`): nadie tiene que acordarse.
//
// ── QUÉ SE VACÍA Y QUÉ NO ─────────────────────────────────────────────────
// SE VACÍA lo que identifica a una persona: nombre, correo, avatar, banner,
// biografía, ubicación, web, redes, `google_id`, `handle` y la contraseña.
//
// NO SE TOCA nada de lo que escribió. Medido: **49 tablas apuntan a `users`**.
// Sus proyectos, sus publicaciones y los comentarios que otros dejaron debajo
// se quedan, a nombre de una cuenta sin persona detrás. Es lo que decidió
// Eugenio y es lo que la ley pide: que desaparezcan sus datos personales, no
// que se lleve por delante el trabajo de los demás.
//
// ── EL CORREO NO PUEDE QUEDARSE EN NULL ───────────────────────────────────
// `users.email` es `NOT NULL` y tiene dos índices únicos. Dos cuentas vaciadas
// chocarían, y la segunda persona que borrara su cuenta se encontraría con que
// no se ejecutó. Se pone `borrado-<uuid>@cuenta.invalid`: único por el uuid,
// **irreversible** porque el uuid no tiene ninguna relación con el correo de
// antes (no es un hash: no se puede probar contra una lista), y `.invalid`
// está reservado por la RFC 2606 para no existir nunca.
//
// ── SE PUEDE VOLVER A PASAR SIN MIEDO ─────────────────────────────────────
// Solo toca filas con `deleted_at` cumplido y `anonimizado_en IS NULL`. Al
// terminar, esa fila ya no vuelve a entrar. Correrlo dos veces el mismo día no
// hace nada la segunda.
import pg from 'pg';

const DIAS = 15;

// ── LAS DOS LISTAS, Y POR QUÉ SON DOS ──────────────────────────────────────
// Esta tarea vacía columnas de `users` **escritas a mano**. Eso significa que
// cada columna nueva que alguien añada a esa tabla es un agujero silencioso
// hasta que alguien se acuerda de venir aquí.
//
// Ya ha pasado dos veces el mismo día: `telefono` (una cuenta vaciada seguía
// saliendo al buscar por número) y `llamadas_de` (seguiría recibiendo llamadas
// perdidas, porque se puede llamar por identificador y no solo por número). La
// segunda la vio el Programador 8 revisando esta lista, no su propio código.
//
// CON UNA SOLA LISTA, «no clasificada» acaba significando «se queda», que es
// exactamente el silencio de hoy. Con dos, una columna que aparezca sin
// clasificar es un error con nombre y apellidos, y la tarea **no vacía nada**
// hasta que alguien decida en cuál va.
//
// Añadir una columna a `users` es, a partir de ahora, añadir una línea aquí.

/** Lo que identifica a una persona. Se vacía. */
const SE_VACIAN = [
  'email', 'name', 'display_name', 'avatar_url', 'banner_url', 'bio', 'location',
  'website', 'socials', 'specialties', 'ubicaciones', 'objetivos', 'handle',
  'google_id', 'password_hash', 'email_verified', 'telefono', 'telefono_buscable',
  'llamadas_de',
];

/** Lo que se queda A PROPÓSITO: no identifica a nadie, o hace falta para que la
 *  fila siga existiendo y sosteniendo lo que esa persona escribió. */
const SE_QUEDAN = [
  'id', 'uuid', 'role', 'role_level', 'created_at', 'updated_at', 'created_by',
  'updated_by', 'version', 'archived_at', 'organization_id', 'reputation',
  'impact_score', 'last_login_at', 'ui_settings', 'puntos', 'deleted_at',
  'anonimizado_en',
];

const cliente = new pg.Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      },
);

const seco = process.argv.includes('--en-seco');

await cliente.connect();
try {
  // ══ NINGUNA COLUMNA SIN CLASIFICAR ═══════════════════════════════════════
  // Se pregunta a la base de datos qué columnas tiene `users` HOY y se compara
  // con las dos listas. Si aparece una que nadie ha clasificado, se para aquí
  // — antes de vaciar nada — y se dice cómo se llama. Un fallo que no dice
  // cuál es obliga a buscarlo.
  const { rows: columnas } = await cliente.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
  );
  const reales = columnas.map(c => c.column_name);
  const sinClasificar = reales.filter(c => !SE_VACIAN.includes(c) && !SE_QUEDAN.includes(c));
  if (sinClasificar.length) {
    console.error('\nNo se ha vaciado ninguna cuenta.\n');
    console.error(`La tabla «users» tiene ${sinClasificar.length} columna(s) que nadie ha clasificado:\n`);
    for (const c of sinClasificar) console.error(`    ${c}`);
    console.error('\nAñádela a SE_VACIAN o a SE_QUEDAN en este mismo fichero.');
    console.error('Si guarda algo de la persona, va en SE_VACIAN — y hay que');
    console.error('añadirla también a la sentencia UPDATE de abajo.\n');
    process.exit(1);
  }
  // Y al revés: una columna de la lista que ya no existe se dice, pero no
  // impide vaciar — sobra una línea, no falta protección.
  const fantasmas = [...SE_VACIAN, ...SE_QUEDAN].filter(c => !reales.includes(c));
  if (fantasmas.length) console.warn(`Aviso: estas columnas ya no existen en «users»: ${fantasmas.join(', ')}`);

  const { rows } = await cliente.query(
    `SELECT id, deleted_at FROM users
     WHERE deleted_at IS NOT NULL
       AND anonimizado_en IS NULL
       AND deleted_at < now() - ($1 || ' days')::interval
     ORDER BY deleted_at`,
    [String(DIAS)],
  );

  if (!rows.length) {
    console.log(`Ninguna cuenta cumple los ${DIAS} días. Nada que vaciar.`);
    process.exit(0);
  }

  console.log(`Cuentas que cumplen los ${DIAS} días: ${rows.length}`);
  for (const r of rows) console.log(`  ${r.id}  (lo pidió el ${new Date(r.deleted_at).toISOString().slice(0, 10)})`);

  if (seco) {
    console.log('\n--en-seco: no se ha tocado nada.');
    process.exit(0);
  }

  for (const r of rows) {
    // Una transacción por cuenta: si una falla, las demás se vacían igual y
    // el fallo se ve con su id al lado en vez de perderse en un error global.
    try {
      await cliente.query('BEGIN');
      await cliente.query(
        `UPDATE users SET
           email          = 'borrado-' || gen_random_uuid()::text || '@cuenta.invalid',
           name           = NULL,
           -- «Usuario eliminado», no «Cuenta borrada»: es lo que la página
           -- pública promete que va a aparecer firmando sus cosas, y es una
           -- página que se enseña a App Store y a Google Play como compromiso.
           -- Además el texto es mejor: habla de una persona que se fue, no de
           -- una fila de una tabla. Lo cazó el Programador 3 pidiendo que se
           -- comparara la promesa con lo que el programa hace de verdad.
           display_name   = 'Usuario eliminado',
           avatar_url     = NULL,
           banner_url     = NULL,
           bio            = NULL,
           location       = NULL,
           website        = NULL,
           socials        = '{}'::jsonb,
           specialties    = '[]'::jsonb,
           ubicaciones    = '[]'::jsonb,
           objetivos      = '[]'::jsonb,
           handle         = NULL,
           -- EL TELÉFONO TAMBIÉN SE VA (2026-08-22, Programador 8, con la capa
           -- de telecomunicaciones). Sin estas dos líneas, una cuenta vaciada
           -- seguiría apareciendo al buscar por su número y seguiría
           -- recibiendo llamadas; y peor: el número queda pillado para
           -- siempre por el índice único, así que su dueño no podría usarlo
           -- en una cuenta nueva.
           telefono          = NULL,
           telefono_buscable = false,
           -- Y EL TELÉFONO SE CIERRA DEL TODO. Se puede llamar a alguien por su
           -- identificador, no solo por su número, y la página pública de una
           -- cuenta vaciada sigue existiendo con su «Usuario eliminado». Sin
           -- esta línea, alguien podría seguir llamando a una cuenta que ya no
           -- es de nadie: no se conectaría nunca, pero dejaría llamadas
           -- perdidas y avisos para una persona que se fue. «nadie» y no NULL:
           -- la columna no admite nulos y además lleva su restricción.
           llamadas_de       = 'nadie',
           google_id      = NULL,
           password_hash  = NULL,
           email_verified = false,
           anonimizado_en = now(),
           updated_at     = now()
         WHERE id = $1 AND anonimizado_en IS NULL`,
        [r.id],
      );
      // Y que no quede ninguna puerta abierta ni ningún enlace de recuperación
      // vivo: si no, un correo de restablecer pedido antes del borrado seguiría
      // sirviendo para entrar en una cuenta que ya no es de nadie.
      await cliente.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [r.id]);
      await cliente.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [r.id]);
      // EL HISTORIAL DE LLAMADAS NO SE TOCA, y es a propósito (2026-08-22): al
      // otro lado de cada llamada hay otra persona y ese historial es suyo.
      // Se comporta igual que los mensajes, que tampoco se borran: el nombre
      // ya ha pasado a «Usuario eliminado» con la anonimización de arriba, que
      // es lo que hay que quitar de en medio.
      await cliente.query('COMMIT');
      console.log(`  vaciada: ${r.id}`);
    } catch (e) {
      await cliente.query('ROLLBACK');
      console.error(`  FALLÓ ${r.id}: ${e.message}`);
      process.exitCode = 1;
    }
  }
} finally {
  await cliente.end();
}
