// ============================================================================
// Las cinco reglas de `src/server/limites/`, comprobadas contra Postgres
// ============================================================================
// Desde que el freno vive en la base de datos (migración 0097) esto ya no se
// puede probar con una base de mentira: lo que se comprueba es precisamente que
// dos procesos distintos vean el MISMO freno, y eso solo lo demuestra la base.
//
//   npx tsx scripts/probar-limites.ts
//
// Necesita una base con la tabla `frenos` y `intentos_fallidos`. Crea sus
// propias filas con claves `AI-prueba-*` y las borra al terminar.
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { REGLAS, esperaPendiente, anotarFallo, levantarFreno, ritmo, ipDe } from '../src/server/limites/index.js';

const pool = new pg.Pool({
  host: process.env.SQL_HOST || 'localhost',
  user: process.env.SQL_ADMIN_USER,
  password: process.env.SQL_ADMIN_PASSWORD,
  database: process.env.SQL_DB_NAME,
  max: 4,
});
const db = drizzle(pool);

let ok = 0, mal = 0;
const es = (n: string, a: any, b: any) => {
  const g = JSON.stringify(a) === JSON.stringify(b);
  g ? ok++ : mal++;
  console.log(`${g ? '  ok  ' : ' FALLO'} ${n}: ${JSON.stringify(a)}${g ? '' : ' != ' + JSON.stringify(b)}`);
};

const R = REGLAS.login;
const IP = 'AI-prueba-1.1.1.1';
const ANA = 'AI-prueba-ana@example.com';
const BEA = 'AI-prueba-bea@example.com';
const RAPIDO = 'AI-prueba-rapido@example.com';

async function limpiar() {
  await db.execute(sql`DELETE FROM frenos WHERE clave LIKE '%AI-prueba-%'`);
  await db.execute(sql`DELETE FROM intentos_fallidos WHERE ip LIKE 'AI-prueba-%' OR cuenta LIKE 'AI-prueba-%'`);
}
const cuentaRastro = async (c: string) =>
  Number((await db.execute(sql`SELECT count(*)::int AS n FROM intentos_fallidos WHERE cuenta = ${c}`)).rows[0].n);

async function main() {
  await limpiar();

  console.log('\n== 1 · Los tres fallos de gracia no frenan a nadie ==');
  for (let i = 0; i < 3; i++) await anotarFallo(db, R, IP, ANA, true);
  es('espera tras 3 fallos', await esperaPendiente(db, R, IP, ANA), 0);

  console.log('\n== 2 · El cuarto empieza a frenar, y crece ==');
  await anotarFallo(db, R, IP, ANA, true);
  es('4o fallo -> 5 s', await esperaPendiente(db, R, IP, ANA), 5);
  await anotarFallo(db, R, IP, ANA, true);
  es('5o fallo -> 10 s', await esperaPendiente(db, R, IP, ANA), 10);
  await anotarFallo(db, R, IP, ANA, true);
  es('6o fallo -> 20 s', await esperaPendiente(db, R, IP, ANA), 20);

  console.log('\n== 3 · LA REGLA 3: quien acierta no paga el retraso ajeno ==');
  for (let i = 0; i < 6; i++) await anotarFallo(db, R, 'AI-prueba-9.9.9.9', BEA, true);
  es('los 6 intentos contra bea quedan escritos', await cuentaRastro(BEA), 6);
  es('bea frenada desde cualquier ip', (await esperaPendiente(db, R, 'AI-prueba-2.2.2.2', BEA)) > 0, true);
  await levantarFreno(db, R, 'AI-prueba-2.2.2.2', BEA);
  es('bea acierta y queda libre', await esperaPendiente(db, R, 'AI-prueba-2.2.2.2', BEA), 0);

  console.log('\n== 4 · LA REGLA 4: el freno se limpia, el rastro NO ==');
  es('el rastro sigue teniendo los 6 de bea', await cuentaRastro(BEA), 6);

  console.log('\n== 5 · LA REGLA 1: la IP frena aunque cambie de cuenta ==');
  for (let i = 0; i < 6; i++) await anotarFallo(db, R, 'AI-prueba-7.7.7.7', `AI-prueba-c${i}@example.com`, false);
  es('misma ip, cuentas distintas -> frenada', (await esperaPendiente(db, R, 'AI-prueba-7.7.7.7', 'AI-prueba-nueva@example.com')) > 0, true);
  es('otra ip con esa cuenta nueva, libre', await esperaPendiente(db, R, 'AI-prueba-3.3.3.3', 'AI-prueba-nueva@example.com'), 0);

  console.log('\n== 6 · El tope no se pasa ==');
  for (let i = 0; i < 30; i++) await anotarFallo(db, R, 'AI-prueba-8.8.8.8', 'AI-prueba-tope@example.com', true);
  const e = await esperaPendiente(db, R, 'AI-prueba-8.8.8.8', 'AI-prueba-tope@example.com');
  es(`espera <= tope de ${R.topeSegundos} s`, e <= R.topeSegundos && e > R.topeSegundos - 100, true);

  console.log('\n== 7 · La IP se lee de Cloudflare primero ==');
  es('cf-connecting-ip gana', ipDe({ headers: { 'cf-connecting-ip': '5.5.5.5', 'x-forwarded-for': '6.6.6.6' } } as any), '5.5.5.5');
  es('sin cf, el primero de xff', ipDe({ headers: { 'x-forwarded-for': '6.6.6.6, 10.0.0.1' } } as any), '6.6.6.6');

  console.log('\n== 8 · `ritmo` frena igual pero NO ensucia el rastro ==');
  const T = REGLAS.transferencia;
  for (let i = 0; i < T.gracia + 2; i++) await ritmo(db, T, 'AI-prueba-4.4.4.4', RAPIDO);
  es('frena igual que un fallo', (await esperaPendiente(db, T, 'AI-prueba-4.4.4.4', RAPIDO)) > 0, true);
  es('y no escribe NI UNA fila en el rastro', await cuentaRastro(RAPIDO), 0);
  es('no se mezcla con la puerta del login', await esperaPendiente(db, R, 'AI-prueba-4.4.4.4', RAPIDO), 0);

  console.log('\n== 9 · LO NUEVO: el freno lo ve OTRA conexión ==');
  // Es la razón de haberlo sacado de la memoria: con `cluster` serían ocho
  // procesos, y esto demuestra que el freno es uno solo para todos.
  const otra = drizzle(new pg.Pool({
    host: process.env.SQL_HOST || 'localhost', user: process.env.SQL_ADMIN_USER,
    password: process.env.SQL_ADMIN_PASSWORD, database: process.env.SQL_DB_NAME, max: 1,
  }));
  es('otro proceso ve el mismo freno de bea… tras volver a fallar', await (async () => {
    for (let i = 0; i < 6; i++) await anotarFallo(db, R, 'AI-prueba-5.5.5.5', BEA, true);
    return (await esperaPendiente(otra, R, 'AI-prueba-5.5.5.5', BEA)) > 0;
  })(), true);

  await limpiar();
  const quedan = Number((await db.execute(sql`SELECT count(*)::int AS n FROM frenos WHERE clave LIKE '%AI-prueba-%'`)).rows[0].n);
  es('no queda ni una fila de prueba', quedan, 0);

  console.log(`\n${mal === 0 ? 'TODO BIEN' : 'HAY FALLOS'} — ${ok} bien, ${mal} mal\n`);
  await pool.end();
  process.exit(mal === 0 ? 0 : 1);
}
main();
