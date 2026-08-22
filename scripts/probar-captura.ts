// ============================================================================
// QUE UN CAMBIO HECHO A MANO EN LA BASE DE DATOS QUEDE ANOTADO (2026-08-22)
// ============================================================================
//     npx tsx scripts/probar-captura.ts
//
// Esta es la prueba que de verdad contesta a «que nadie pueda corromper los
// datos»: **no se toca la aplicación en ningún momento**. Todo se escribe con
// SQL directo, como haría alguien con la contraseña de la base de datos a las
// tres de la mañana. Si el registro solo viera lo que hace el servidor, aquí no
// aparecería nada.
//
// Se hace sobre una base de datos de usar y tirar, que se crea y se borra.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { leerCadena, verificarCadena } from '../src/server/seguridad/registro.js';
import { sellarPendientes, comprobarFila, verificarMuestra } from '../src/server/seguridad/sellar.js';
import { generarPareja } from '../src/server/seguridad/firma.js';
import { registrarSelladoAutomatico } from '../src/server/seguridad/selladoAutomatico.js';

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = '') => {
  if (bien) console.log(`  ✓ ${que}`);
  else { fallos++; console.log(`  ✗ ${que}${detalle ? `\n      ${detalle}` : ''}`); }
};

const BD = 'prueba_captura_prog4';
const conexion = (database: string) => ({
  host: process.env.SQL_HOST || 'localhost',
  user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
  database,
  connectionTimeoutMillis: 4000,
});

const pareja = generarPareja();
const publicas = { [pareja.claveId]: pareja.publicaBase64 };
process.env.CLAVE_FIRMA_REGISTRO = pareja.privadaBase64;

let admin: pg.Client | null = null;
try {
  admin = new pg.Client(conexion('postgres'));
  await admin.connect();
} catch {
  console.log('\n  · NO SÉ: no hay Postgres a mano. Esta prueba NO se ha ejecutado.\n');
  process.exit(1);
}

await admin.query(`DROP DATABASE IF EXISTS ${BD}`);
await admin.query(`CREATE DATABASE ${BD}`);
await admin.end();

const pool = new pg.Pool(conexion(BD));
const db = drizzle(pool);
const migracion = (f: string) => fs.readFileSync(path.join(import.meta.dirname, '../drizzle/', f), 'utf8');

try {
  console.log('\nPREPARAR');
  await pool.query(migracion('0070_registro_sellado.sql'));
  // `users` tiene que existir ANTES de la 0071: el disparador se pone sobre las
  // tablas que hay. Es una versión mínima, con lo que la prueba necesita.
  await pool.query(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, role_level INT DEFAULT 1)`);
  await pool.query(migracion('0085_registro_captura.sql'));
  const disparador = await pool.query(
    `SELECT tgname FROM pg_trigger WHERE tgrelid = 'users'::regclass AND NOT tgisinternal`);
  comprobar('el disparador queda puesto sobre `users`', disparador.rows.length === 1);

  console.log('\nCAMBIOS HECHOS POR FUERA, SIN PASAR POR LA APLICACIÓN');
  await pool.query(`SET application_name = 'psql-de-madrugada'`);
  await pool.query(`INSERT INTO users (id, email, role_level) VALUES ('U_PRUEBA', 'ai-prueba@ejemplo.invalid', 1)`);
  await pool.query(`UPDATE users SET role_level = 4 WHERE id = 'U_PRUEBA'`);

  const buzon = await pool.query(`SELECT tabla, operacion, clave, actor_bd FROM registro_pendiente ORDER BY id`);
  comprobar('los dos cambios están capturados', buzon.rows.length === 2,
    JSON.stringify(buzon.rows));
  comprobar('el segundo es el que se da permisos de administrador',
    buzon.rows[1]?.operacion === 'UPDATE' && buzon.rows[1]?.clave === 'U_PRUEBA');
  comprobar('queda escrito QUIÉN lo escribió, y no fue el servidor',
    String(buzon.rows[0]?.actor_bd).includes('psql-de-madrugada'),
    String(buzon.rows[0]?.actor_bd));

  await pool.query(`UPDATE users SET role_level = 4 WHERE id = 'U_PRUEBA'`);
  const sinCambio = await pool.query(`SELECT count(*)::int AS n FROM registro_pendiente`);
  comprobar('un UPDATE que no cambia nada no ensucia el registro', sinCambio.rows[0].n === 2);

  console.log('\nDOS APUNTES DE LA MISMA TRANSACCIÓN');
  // El caso del libro de puntos: una transferencia son dos filas o no es nada.
  await pool.query(`INSERT INTO users VALUES ('U_ANA','ana@ejemplo.invalid',1), ('U_LUIS','luis@ejemplo.invalid',1)`);
  await pool.query('BEGIN');
  await pool.query(`UPDATE users SET role_level = 2 WHERE id = 'U_ANA'`);
  await pool.query(`UPDATE users SET role_level = 3 WHERE id = 'U_LUIS'`);
  await pool.query('COMMIT');
  const juntas = await pool.query(
    `SELECT txid FROM registro_pendiente WHERE clave IN ('U_ANA','U_LUIS') AND operacion = 'UPDATE'`);
  comprobar('las dos filas de una misma transacción comparten número de transacción',
    juntas.rows.length === 2 && juntas.rows[0].txid === juntas.rows[1].txid,
    JSON.stringify(juntas.rows));
  const sueltas = await pool.query(
    `SELECT txid FROM registro_pendiente WHERE clave = 'U_PRUEBA' AND operacion = 'UPDATE' LIMIT 1`);
  comprobar('y no lo comparten con las que se escribieron aparte',
    sueltas.rows[0].txid !== juntas.rows[0].txid);

  console.log('\nSELLAR');
  const r1 = await sellarPendientes(db);
  // Seis: el alta y el ascenso de U_PRUEBA, las dos altas de Ana y Luis (un
  // INSERT de dos filas son dos capturas, una por fila) y sus dos cambios.
  comprobar('se sellan las seis capturas que hay', r1.sellados === 6 && r1.huecos === 0, JSON.stringify(r1));
  const v1 = verificarCadena(await leerCadena(db), publicas);
  comprobar('la cadena queda VERIFICADA y firmada',
    v1.estado === 'VERIFICADA' && v1.firmas.estado === 'VALIDAS', JSON.stringify(v1.firmas));
  const mismaTx = (await pool.query(
    `SELECT datos ->> 'tx' AS tx FROM registro_sellado
     WHERE clase = 'dato' AND datos ->> 'clave' IN ('U_ANA','U_LUIS') AND datos ->> 'operacion' = 'UPDATE'`)).rows;
  comprobar('y el sello conserva que esas dos filas fueron la misma transacción',
    mismaTx.length === 2 && mismaTx[0].tx === mismaTx[1].tx, JSON.stringify(mismaTx));
  const r2 = await sellarPendientes(db);
  comprobar('sellar otra vez no duplica nada', r2.sellados === 0);

  console.log('\n¿SIGUE SIENDO LA MISMA FILA?');
  comprobar('recién sellada: IGUAL', (await comprobarFila(db, 'users', 'U_PRUEBA')).estado === 'IGUAL');
  comprobar('de una fila que nadie ha sellado: NO_SE, no «igual»',
    (await comprobarFila(db, 'users', 'U_QUE_NO_EXISTE')).estado === 'NO_SE');

  // El ataque de verdad: quitar el disparador y cambiar la fila por debajo.
  await pool.query(`ALTER TABLE users DISABLE TRIGGER registro_captura`);
  await pool.query(`UPDATE users SET email = 'suplantado@ejemplo.invalid' WHERE id = 'U_PRUEBA'`);
  const nada = await pool.query(`SELECT count(*)::int AS n FROM registro_pendiente WHERE sellado_at IS NULL`);
  comprobar('con el disparador quitado, el cambio NO se captura (así es como se corrompe)', nada.rows[0].n === 0);
  const vf = await comprobarFila(db, 'users', 'U_PRUEBA');
  comprobar('y aun así se detecta: la fila de ahora no da la huella sellada',
    vf.estado === 'DISTINTA', JSON.stringify(vf));
  await pool.query(`ALTER TABLE users ENABLE TRIGGER registro_captura`);

  console.log('\nHUECOS EN EL BUZÓN');
  await pool.query(`UPDATE users SET role_level = 2 WHERE id = 'U_PRUEBA'`);
  await pool.query(`UPDATE users SET role_level = 3 WHERE id = 'U_PRUEBA'`);
  const ids = (await pool.query(`SELECT id FROM registro_pendiente WHERE sellado_at IS NULL ORDER BY id`)).rows;
  comprobar('hay dos notas nuevas sin sellar', ids.length === 2);
  // Alguien borra una antes de que se selle.
  await pool.query(`DELETE FROM registro_pendiente WHERE id = ${ids[0].id}`);
  const r3 = await sellarPendientes(db);
  comprobar('el borrado del buzón deja marca: se anota el hueco',
    r3.huecos === 1 && r3.sellados === 1, JSON.stringify(r3));
  const hueco = (await pool.query(
    `SELECT datos FROM registro_sellado WHERE clase = 'hueco' ORDER BY n DESC LIMIT 1`)).rows[0];
  comprobar('y dice exactamente qué tramo falta', !!hueco && hueco.datos.cuantas === 1,
    JSON.stringify(hueco?.datos));
  const v2 = verificarCadena(await leerCadena(db), publicas);
  comprobar('con todo eso, la cadena sigue entera', v2.estado === 'VERIFICADA');

  console.log('\nLA COMPROBACIÓN AL AZAR');
  const m1 = await verificarMuestra(db, 10);
  comprobar('mira filas de verdad y las encuentra iguales',
    m1.miradas >= 1 && m1.distintas.length === 0, JSON.stringify(m1));
  // Se manipula otra vez por debajo, y la muestra tiene que cazarlo.
  await pool.query(`ALTER TABLE users DISABLE TRIGGER registro_captura`);
  await pool.query(`UPDATE users SET email = 'otra-vez@ejemplo.invalid' WHERE id = 'U_PRUEBA'`);
  await pool.query(`ALTER TABLE users ENABLE TRIGGER registro_captura`);
  const m2 = await verificarMuestra(db, 10);
  comprobar('con una fila manipulada, la muestra la señala con nombre y clave',
    m2.distintas.some((d) => d.tabla === 'users' && d.clave === 'U_PRUEBA'), JSON.stringify(m2));
  // Se deja como estaba antes de seguir, para que el resto de la prueba valga.
  await pool.query(`UPDATE users SET email = 'suplantado@ejemplo.invalid' WHERE id = 'U_PRUEBA'`);
  await sellarPendientes(db);

  console.log('\nEL SELLADO AUTOMÁTICO');
  // Lo que de verdad importa de él: que la PRIMERA pasada sea al arrancar. Un
  // temporizador que solo dispara a los dos minutos no recoge lo que quedó
  // pendiente del reinicio anterior, y en un contenedor que se reinicia a
  // diario eso es un buzón que crece a saltos.
  await pool.query(`UPDATE users SET role_level = 1 WHERE id = 'U_PRUEBA'`);
  const antes = (await pool.query(
    `SELECT count(*)::int AS n FROM registro_pendiente WHERE sellado_at IS NULL`)).rows[0].n;
  comprobar('hay algo esperando en el buzón', antes >= 1);
  registrarSelladoAutomatico(null, db);
  await new Promise((r) => setTimeout(r, 600));
  const despues = (await pool.query(
    `SELECT count(*)::int AS n FROM registro_pendiente WHERE sellado_at IS NULL`)).rows[0].n;
  comprobar('al arrancar, el sellador vacía el buzón sin que nadie se lo pida', despues === 0,
    `quedaban ${despues}`);
  comprobar('y la cadena sigue entera después',
    verificarCadena(await leerCadena(db), publicas).estado === 'VERIFICADA');

  console.log('\nEL BORRADO DE UNA FILA');
  await pool.query(`DELETE FROM users WHERE id = 'U_PRUEBA'`);
  await sellarPendientes(db);
  const vb = await comprobarFila(db, 'users', 'U_PRUEBA');
  comprobar('un borrado sellado se distingue de una fila alterada',
    vb.estado === 'NO_SE' && (vb.porque || '').includes('borrado'), JSON.stringify(vb));
} finally {
  await pool.end();
  const limpieza = new pg.Client(conexion('postgres'));
  await limpieza.connect();
  await limpieza.query(`DROP DATABASE IF EXISTS ${BD}`);
  await limpieza.end();
  console.log(`\n  · base de datos de prueba ${BD} borrada`);
}

console.log('');
if (fallos) { console.log(`✗ ${fallos} comprobación(es) mal.\n`); process.exit(1); }
console.log('✓ Todo correcto.\n');
