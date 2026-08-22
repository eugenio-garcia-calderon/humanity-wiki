// ============================================================================
// QUE EL RESUMEN DEL DÍA SALGA DE VERDAD, Y QUE NO MIENTA SI NO SALE (2026-08-22)
// ============================================================================
//     npx tsx scripts/probar-anclaje.ts
//
// Lo importante de anclar no es que funcione cuando todo va bien: es que
// **cuando no se puede publicar, NO se marque como publicado**. Un día marcado
// como anclado sin recibo es una prueba que no existe, y de esas se entera uno
// el día que hace falta enseñarla.
//
// Los calendarios de verdad se sustituyen por uno de mentira que corre aquí al
// lado: así la prueba no depende de que internet vaya, y —más importante— se
// puede simular que están caídos, que es el caso que hay que comprobar.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { anotar } from '../src/server/seguridad/registro.js';

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = '') => {
  if (bien) console.log(`  ✓ ${que}`);
  else { fallos++; console.log(`  ✗ ${que}${detalle ? `\n      ${detalle}` : ''}`); }
};

// ── Un calendario de mentira, que se puede apagar ──────────────────────────
let contesta = true;
let recibidas: Buffer[] = [];
const calendario = http.createServer((req, res) => {
  const trozos: Buffer[] = [];
  req.on('data', (c) => trozos.push(c));
  req.on('end', () => {
    if (!contesta) { res.statusCode = 503; return res.end(); }
    recibidas.push(Buffer.concat(trozos));
    res.setHeader('Content-Type', 'application/vnd.opentimestamps.v1');
    res.end(Buffer.from('recibo-de-mentira'));
  });
});
await new Promise<void>((r) => calendario.listen(0, r));
const puerto = (calendario.address() as any).port;
process.env.CALENDARIOS_ANCLAJE = `http://127.0.0.1:${puerto}`;

const BD = 'prueba_anclaje_prog4';
const conexion = (database: string) => ({
  host: process.env.SQL_HOST || 'localhost',
  user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
  database, connectionTimeoutMillis: 4000,
});

let admin: pg.Client | null = null;
try { admin = new pg.Client(conexion('postgres')); await admin.connect(); }
catch { console.log('\n  · NO SÉ: no hay Postgres a mano. Esta prueba NO se ha ejecutado.\n'); process.exit(1); }
await admin.query(`DROP DATABASE IF EXISTS ${BD}`);
await admin.query(`CREATE DATABASE ${BD}`);
await admin.end();

const pool = new pg.Pool(conexion(BD));
const db = drizzle(pool);
const { anclarDia } = await import('../src/server/seguridad/anclaje.js');

try {
  await pool.query(fs.readFileSync(path.join(import.meta.dirname, '../drizzle/0070_registro_sellado.sql'), 'utf8'));
  const hoy = new Date().toISOString().slice(0, 10);

  console.log('\nUN DÍA SIN NADA');
  const vacio = await anclarDia(db, hoy);
  comprobar('un día sin anotaciones dice NADA_QUE_ANCLAR, no «anclado»',
    vacio.estado === 'NADA_QUE_ANCLAR', JSON.stringify(vacio));

  console.log('\nCON LOS CALENDARIOS CAÍDOS');
  await anotar(db, { clase: 'prueba', actor: 'prog4', asunto: 'A1', datos: { a: 1 } });
  await anotar(db, { clase: 'prueba', actor: 'prog4', asunto: 'A2', datos: { a: 2 } });
  contesta = false;
  const caido = await anclarDia(db, hoy);
  comprobar('si ningún calendario contesta: NO_SE, y se dice por qué',
    caido.estado === 'NO_SE' && !!caido.porque, JSON.stringify(caido));
  const sinPublicar = await pool.query(
    `SELECT publicado_en, publicado_at, raiz FROM registro_anclajes WHERE dia = $1`, [hoy]);
  comprobar('la raíz queda calculada…', !!sinPublicar.rows[0]?.raiz);
  comprobar('…y SIN marcar como publicada, que es lo que de verdad importa',
    sinPublicar.rows[0]?.publicado_en === null && sinPublicar.rows[0]?.publicado_at === null,
    JSON.stringify(sinPublicar.rows[0]));

  console.log('\nCON EL CALENDARIO EN PIE');
  contesta = true;
  const ok = await anclarDia(db, hoy);
  comprobar('se publica y se dice dónde', ok.estado === 'ANCLADO' && !!ok.calendarios?.length,
    JSON.stringify(ok));
  comprobar('lo que se mandó son los 32 bytes de la raíz, ni un byte más',
    recibidas.length >= 1 && recibidas[0].length === 32, `${recibidas[0]?.length} bytes`);
  comprobar('y lo mandado ES la raíz del día, no otra cosa',
    recibidas[0].toString('hex') === ok.raiz, `${recibidas[0]?.toString('hex')} vs ${ok.raiz}`);

  const publicado = await pool.query(
    `SELECT publicado_en, publicado_at, referencia FROM registro_anclajes WHERE dia = $1`, [hoy]);
  // El recibo es binario y se guarda en base64: hay que descodificarlo para
  // comprobarlo, no buscar el texto dentro. (La primera versión de esta prueba
  // buscaba la cadena tal cual y suspendía a un código que estaba bien.)
  const recibosGuardados = Object.values(JSON.parse(publicado.rows[0]?.referencia || '{}'))
    .map((b64) => Buffer.from(String(b64), 'base64').toString('utf8'));
  comprobar('queda guardado el recibo entero, no solo la fecha',
    recibosGuardados.includes('recibo-de-mentira'), JSON.stringify(recibosGuardados));
  comprobar('y la hora de publicación', !!publicado.rows[0]?.publicado_at);

  console.log('\nNO SE ANCLA DOS VECES');
  recibidas = [];
  const otraVez = await anclarDia(db, hoy);
  comprobar('un día ya publicado no se vuelve a mandar', otraVez.estado === 'ANCLADO' && recibidas.length === 0,
    `${recibidas.length} envíos`);
  comprobar('y devuelve la raíz de la primera vez', otraVez.raiz === ok.raiz);
} finally {
  calendario.close();
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
