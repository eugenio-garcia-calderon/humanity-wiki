#!/usr/bin/env node
// ============================================================================
// ¿QUÉ PUEDE HACER LA APLICACIÓN QUE NO DEBERÍA PODER? (fase C, 2026-08-22)
// ============================================================================
//     node --env-file=.env scripts/auditar-privilegios.mjs
//
// Fase C de `memory/09_TARGET_ARCHITECTURE/04_DATA_INTEGRITY_TIERS.md`: quitarle
// poder a la propia aplicación. Antes de quitar nada, **medir qué puede hacer
// hoy** — porque revocar a ciegas es la forma de tirar producción un domingo.
//
// Esto no escribe NADA, ni siquiera dentro de una transacción que se deshaga.
// Pregunta al catálogo de PostgreSQL qué permisos tiene el rol de la aplicación.
//
// La primera versión intentaba las cosas de verdad (un `DELETE FROM users`
// dentro de un `BEGIN`/`ROLLBACK`). Funcionaba, y contra producción habría sido
// una mala idea: aunque se deshaga, ese borrado bloquea la tabla entera y
// reescribe cada fila mientras dura. Una auditoría que puede tumbar el servicio
// no se ejecuta donde hace falta, y entonces no sirve de nada. El catálogo da la
// misma respuesta sin tocar ni una fila.
//
// ── POR QUÉ IMPORTA, EN UNA FRASE ─────────────────────────────────────────
// Los disparadores del registro paran el accidente. No paran a quien pueda
// quitarlos — y hoy quien puede quitarlos es **la propia aplicación**, porque
// se conecta con un rol que lo puede todo. Mientras eso siga así, un fallo en
// cualquiera de las 150 rutas de escritura es un fallo con permisos de dueño.
import pg from 'pg';

const usuario = process.env.SQL_USER || process.env.SQL_ADMIN_USER;
const clave = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;

const cliente = new pg.Client({
  host: process.env.SQL_HOST || 'localhost',
  user: usuario,
  password: clave,
  database: process.env.SQL_DB_NAME,
  connectionTimeoutMillis: 8000,
});

/** Una pregunta al catálogo. Tres respuestas y no dos: si la propia consulta
 *  falla (la tabla no existe en esta base, por ejemplo), la respuesta es «no
 *  lo sé» y no «está protegido». Dar por buena una protección que no se ha
 *  podido comprobar es la forma silenciosa de creerse seguro. */
async function mirar(descripcion, consulta) {
  try {
    const r = await cliente.query(consulta);
    const v = Object.values(r.rows[0] ?? {})[0];
    if (v === null || v === undefined) return { descripcion, estado: 'NO_SE', porque: 'sin respuesta' };
    return { descripcion, estado: v ? 'PUEDE' : 'DENEGADO' };
  } catch (e) {
    return { descripcion, estado: 'NO_SE', porque: String(e.message).split('\n')[0] };
  }
}

try {
  await cliente.connect();
} catch (e) {
  console.log(`\n· NO SÉ: no se ha podido conectar con las credenciales de la aplicación. ${e.message}\n`);
  process.exit(2);
}

const quien = (await cliente.query('SELECT current_user AS rol, current_database() AS bd')).rows[0];
const rol = (await cliente.query(
  `SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls FROM pg_roles WHERE rolname = current_user`)).rows[0] ?? {};
const superusuario = !!rol.rolsuper;

console.log(`\nQUÉ PUEDE LA APLICACIÓN  ·  rol "${quien.rol}" sobre "${quien.bd}"`);
console.log('─'.repeat(74));

const hayRegistro = (await cliente.query(
  `SELECT to_regclass('registro_sellado') IS NOT NULL AS existe`)).rows[0].existe;

const pruebas = [
  await mirar('crear tablas en el esquema público',
    `SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS r`),
  await mirar('ser DUEÑO de `users` (y por tanto poder alterarla o borrarla)',
    `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND tableowner = current_user) AS r`),
  await mirar('ser DUEÑO de `territories`',
    `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'territories' AND tableowner = current_user) AS r`),
  await mirar('borrar filas de `users`',
    `SELECT has_table_privilege(current_user, 'users', 'DELETE') AS r`),
  await mirar('crear roles nuevos', `SELECT ${rol.rolcreaterole === true} AS r`),
  await mirar('saltarse la seguridad por filas (RLS)', `SELECT ${rol.rolbypassrls === true} AS r`),
];

if (hayRegistro) {
  pruebas.push(
    await mirar('EDITAR el registro sellado',
      `SELECT has_table_privilege(current_user, 'registro_sellado', 'UPDATE') AS r`),
    await mirar('BORRAR del registro sellado',
      `SELECT has_table_privilege(current_user, 'registro_sellado', 'DELETE') AS r`),
    await mirar('VACIAR el registro sellado de golpe',
      `SELECT has_table_privilege(current_user, 'registro_sellado', 'TRUNCATE') AS r`),
    await mirar('ser DUEÑO del registro (y poder quitarle los disparadores)',
      `SELECT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'registro_sellado' AND tableowner = current_user) AS r`),
    await mirar('vaciar el buzón de cambios sin sellar',
      `SELECT has_table_privilege(current_user, 'registro_pendiente', 'DELETE') AS r`),
  );
} else {
  console.log('  · El registro sellado no existe en esta base: esas cinco pruebas NO se han hecho.\n');
}

const mal = pruebas.filter((p) => p.estado === 'PUEDE');
const sinSaber = pruebas.filter((p) => p.estado === 'NO_SE');
for (const p of pruebas) {
  const marca = { PUEDE: '✗ PUEDE   ', DENEGADO: '✓ denegado', NO_SE: '· no sé   ' }[p.estado];
  console.log(`  ${marca}  ${p.descripcion}`);
  if (p.estado === 'NO_SE') console.log(`               falló por otro motivo: ${p.porque}`);
}
console.log('─'.repeat(74));
if (superusuario) {
  console.log('  ⚠ Este rol es SUPERUSUARIO. Ninguna revocación le afecta: se salta todos los permisos,');
  console.log('    así que lo de arriba dice poco. Lo que importa es ejecutar esto en PRODUCCIÓN,');
  console.log('    con el rol con el que se conecta el servidor de verdad.');
}
console.log(`  puede ${mal.length} · denegadas ${pruebas.length - mal.length - sinSaber.length} · sin saber ${sinSaber.length}`);
console.log('');
if (sinSaber.length) {
  console.log('  Las «no sé» fallaron por algo que no son permisos (dependencias, datos).');
  console.log('  No cuentan como protección: hoy no se han podido hacer, mañana sí.\n');
}

if (mal.length === 0 && sinSaber.length === 0 && !superusuario) {
  console.log('✓ La aplicación no puede cambiar su propia estructura ni tocar el registro.\n');
  process.exit(0);
}

console.log('Lo que la fase C propone, por orden de lo que más quita con menos riesgo:');
console.log('  1. Un rol para la aplicación SIN dueño de las tablas: sin DDL, sin TRUNCATE.');
console.log('  2. Sobre `registro_sellado` y `registro_pendiente`: solo INSERT y SELECT.');
console.log('     Un disparador para el accidente; un permiso revocado para el resto.');
console.log('  3. Las migraciones, con otro rol distinto, desde un despliegue firmado.');
console.log('  4. Y comprobarlo volviendo a ejecutar esto: la prueba de la fase C es');
console.log('     que la propia aplicación FALLE al intentar estas cosas.\n');
process.exit(1);
