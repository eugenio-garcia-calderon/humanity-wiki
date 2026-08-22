// ============================================================================
// QUE EL REGISTRO SELLADO SE DÉ CUENTA (2026-08-22)
// ============================================================================
//     npx tsx scripts/probar-registro.ts
//
// Dos partes, y la segunda es la que convence:
//
//   1. EL NÚCLEO, sin base de datos: que la huella salga siempre igual, que
//      distinga los tres modos de romper una cadena, y que el resumen del día
//      se construya de forma reproducible.
//   2. DE VERDAD, contra Postgres: se crea una base de datos aparte, se aplica
//      la migración, se anota, se manipula por debajo — quitando el disparador,
//      como haría quien tuviera permisos — y se comprueba que el verificador lo
//      canta y dice en cuál. Al terminar se borra esa base de datos entera.
//
// Si no hay Postgres a mano, la segunda parte dice NO SÉ y no se pasa por
// aprobada. Una prueba saltada que sale en verde es peor que ninguna.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import {
  GENESIS, huellaDe, verificarCadena, raizMerkle, anotar, leerCadena, calcularAnclajeDelDia,
  type Anotacion,
} from '../src/server/seguridad/registro.js';
import { generarPareja, firmante } from '../src/server/seguridad/firma.js';

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = '') => {
  if (bien) console.log(`  ✓ ${que}`);
  else { fallos++; console.log(`  ✗ ${que}${detalle ? `\n      ${detalle}` : ''}`); }
};

// ── 1. EL NÚCLEO ────────────────────────────────────────────────────────────

const base: Anotacion = {
  n: 1, momento: '2026-08-22T10:00:00.000Z', clase: 'puntos', actor: 'U_ADMIN_EUGENIO',
  asunto: 'MP123', datos: { cantidad: 100, motivo: 'regalo_bienvenida' },
  sal: 'a1b2c3', huella_previa: GENESIS,
};

console.log('\nLA HUELLA');
comprobar('la misma anotación da siempre la misma huella', huellaDe(base) === huellaDe({ ...base }));
comprobar('el orden de las claves de `datos` no cambia la huella',
  huellaDe(base) === huellaDe({ ...base, datos: { motivo: 'regalo_bienvenida', cantidad: 100 } }),
  'sin esto, el mismo hecho escrito por dos rutas daría huellas distintas y la cadena se rompería sola');
comprobar('la misma hora en otro huso da la misma huella',
  huellaDe(base) === huellaDe({ ...base, momento: '2026-08-22T12:00:00.000+02:00' }));
comprobar('cambiar un céntimo cambia la huella',
  huellaDe(base) !== huellaDe({ ...base, datos: { cantidad: 100.01, motivo: 'regalo_bienvenida' } }));
comprobar('dos campos distintos no pueden dar el mismo texto',
  huellaDe({ ...base, clase: 'ab', actor: 'c' }) !== huellaDe({ ...base, clase: 'a', actor: 'bc' }),
  'es para lo que está el separador 0x1F');

// Una cadena sana de tres. Cada una con SU PROPIO `datos`: si compartieran el
// objeto, tocar el de una tocaría el de las tres y la prueba señalaría la
// primera en vez de la manipulada — que es exactamente lo que pasó al escribirla.
const cadena = [1, 2, 3].map((n) => ({
  ...base, n, asunto: `MP${n}`, datos: { cantidad: 100, motivo: 'regalo_bienvenida' },
})) as (Anotacion & { huella: string })[];
cadena[0].huella_previa = GENESIS;
cadena[0].huella = huellaDe(cadena[0]);
for (let i = 1; i < cadena.length; i++) {
  cadena[i].huella_previa = cadena[i - 1].huella;
  cadena[i].huella = huellaDe(cadena[i]);
}

console.log('\nLAS TRES RESPUESTAS');
comprobar('una cadena sana: VERIFICADA', verificarCadena(cadena).estado === 'VERIFICADA');
comprobar('sin anotaciones: NO_SE, que no es lo mismo que «bien»',
  verificarCadena([]).estado === 'NO_SE');

const editada = structuredClone(cadena);
(editada[1].datos as any).cantidad = 999_999;
const v1 = verificarCadena(editada);
comprobar('alguien edita una fila: ALTERADA, y dice cuál y por qué',
  v1.estado === 'ALTERADA' && v1.rota?.n === 2 && v1.rota?.motivo === 'huella',
  JSON.stringify(v1));

const sinLaDelMedio = [cadena[0], cadena[2]];
const v2 = verificarCadena(sinLaDelMedio);
comprobar('alguien borra una fila: ALTERADA por eslabón, no por huella',
  v2.estado === 'ALTERADA' && v2.rota?.motivo === 'eslabon', JSON.stringify(v2));

const desordenada = [cadena[0], cadena[2], cadena[1]];
comprobar('alguien reordena: ALTERADA', verificarCadena(desordenada).estado === 'ALTERADA');

console.log('\nLA FIRMA');
// La cadena demuestra que nada cambió. La firma demuestra que lo escribimos
// nosotros: sin ella, quien pueda escribir en la tabla fabrica una cadena
// entera, coherente y falsa.
const pareja = generarPareja();
const publicas = { [pareja.claveId]: pareja.publicaBase64 };
process.env.CLAVE_FIRMA_REGISTRO = pareja.privadaBase64;
const f4 = firmante()!;

comprobar('el firmante sale de la llave del entorno', f4?.claveId === pareja.claveId);

const firmada = cadena.map((a) => ({ ...a, firma: f4.firmar(a.huella), clave_id: f4.claveId }));
const vf = verificarCadena(firmada, publicas);
comprobar('cadena firmada y comprobable: VERIFICADA y firmas VÁLIDAS',
  vf.estado === 'VERIFICADA' && vf.firmas.estado === 'VALIDAS' && vf.firmas.validas === 3, JSON.stringify(vf.firmas));

comprobar('sin la llave pública dice NO SÉ, no «inválida»',
  verificarCadena(firmada, {}).firmas.estado === 'NO_SE',
  'acusar de manipulación a algo firmado con una llave anterior es el error caro de la rotación');

comprobar('una cadena sin firmar se distingue de una firmada',
  verificarCadena(cadena, publicas).firmas.estado === 'SIN_FIRMAR');

const otraPareja = generarPareja();
const suplantada = firmada.map((a, i) => (i === 1
  ? { ...a, firma: Buffer.from(otraPareja.privadaBase64, 'base64').toString('base64url').slice(0, 86) }
  : a));
const vs = verificarCadena(suplantada, publicas);
comprobar('una firma que no cuadra: ALTERADA por firma, señalando la anotación',
  vs.estado === 'ALTERADA' && vs.rota?.motivo === 'firma' && vs.rota?.n === 2, JSON.stringify(vs));

// Y el caso que de verdad importa: alguien con acceso a la base de datos
// reescribe una anotación Y recalcula su huella, dejando la cadena coherente.
const rehecha = structuredClone(firmada);
(rehecha[1].datos as any).cantidad = 999_999;
rehecha[1].huella = huellaDe(rehecha[1]);
rehecha[2].huella_previa = rehecha[1].huella;
rehecha[2].huella = huellaDe(rehecha[2]);
const vr = verificarCadena(rehecha, publicas);
comprobar('cadena rehecha entera por dentro: las huellas cuadran y la FIRMA la delata',
  vr.estado === 'ALTERADA' && vr.rota?.motivo === 'firma',
  'esto es lo que la firma añade sobre la cadena: ' + JSON.stringify(vr));

delete process.env.CLAVE_FIRMA_REGISTRO;

console.log('\nEL RESUMEN DEL DÍA');
comprobar('sin hojas no hay raíz (y se dice, no se inventa)', raizMerkle([]) === null);
const h = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
comprobar('una sola hoja es su propia raíz', raizMerkle([h('a')]) === h('a'));
const dos = crypto.createHash('sha256')
  .update(Buffer.concat([Buffer.from(h('a'), 'hex'), Buffer.from(h('b'), 'hex')])).digest('hex');
comprobar('dos hojas: la raíz es el resumen de las dos juntas', raizMerkle([h('a'), h('b')]) === dos);
comprobar('con tres hojas se duplica la última, como está documentado',
  raizMerkle([h('a'), h('b'), h('c')]) === raizMerkle([h('a'), h('b'), h('c'), h('c')]));
comprobar('cambiar una hoja cambia la raíz',
  raizMerkle([h('a'), h('b'), h('c')]) !== raizMerkle([h('a'), h('b'), h('z')]));

// ── 2. CONTRA POSTGRES DE VERDAD ────────────────────────────────────────────

const BD_PRUEBA = 'prueba_registro_prog4';
const conexion = (database: string) => ({
  host: process.env.SQL_HOST || 'localhost',
  user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || process.env.USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
  database,
  connectionTimeoutMillis: 4000,
});

console.log('\nCONTRA POSTGRES');
let admin: pg.Client | null = null;
try {
  admin = new pg.Client(conexion('postgres'));
  await admin.connect();
} catch {
  console.log('  · NO SÉ: no hay Postgres a mano. Esta parte NO se ha comprobado.');
  admin = null;
  fallos++; // no se aprueba lo que no se ha probado
}

if (admin) {
  // Se crea y se borra entera: nada de esto toca la base de datos de nadie.
  await admin.query(`DROP DATABASE IF EXISTS ${BD_PRUEBA}`);
  await admin.query(`CREATE DATABASE ${BD_PRUEBA}`);
  await admin.end();

  const pool = new pg.Pool(conexion(BD_PRUEBA));
  const db = drizzle(pool);
  try {
    const migracion = fs.readFileSync(path.join(import.meta.dirname, '../drizzle/0070_registro_sellado.sql'), 'utf8');
    await pool.query(migracion);
    comprobar('la migración se aplica sobre una base de datos vacía', true);

    process.env.CLAVE_FIRMA_REGISTRO = pareja.privadaBase64;
    const primera = await anotar(db, { clase: 'puntos', actor: 'U_ADMIN_EUGENIO', asunto: 'MP1', datos: { cantidad: 100 } });
    comprobar('con llave configurada, la anotación sale firmada', primera.firmada === true);
    await anotar(db, { clase: 'puntos', actor: 'U_ADMIN_EUGENIO', asunto: 'MP2', datos: { cantidad: -5 } });
    await anotar(db, { clase: 'permiso', actor: 'sistema', asunto: 'U_X', datos: { nivel: 4 } });

    const filas = await leerCadena(db);
    comprobar('se han anotado las tres', filas.length === 3);
    comprobar('la primera dice venir del génesis', filas[0].huella_previa === GENESIS);
    const vBd = verificarCadena(filas, publicas);
    comprobar('recién anotadas: VERIFICADA y con las tres firmas válidas',
      vBd.estado === 'VERIFICADA' && vBd.firmas.estado === 'VALIDAS' && vBd.firmas.validas === 3,
      JSON.stringify(vBd.firmas));

    // Anotar a la vez desde varios sitios no puede partir la cadena.
    // Diez a la vez, no cinco: con cinco y sin espera entre reintentos esto
    // fallaba una de cada tantas, y una prueba de concurrencia que sólo falla
    // a veces es una prueba que se acaba ignorando.
    const alaVez = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    await Promise.all(alaVez.map((i) =>
      anotar(db, { clase: 'concurrencia', actor: 'prueba', asunto: `C${i}`, datos: { i } })));
    const tras = await leerCadena(db);
    comprobar('diez anotaciones a la vez: la cadena sigue entera',
      tras.length === 13 && verificarCadena(tras, publicas).estado === 'VERIFICADA',
      `${tras.length} anotaciones`);

    // El disparador para el accidente.
    let paro = false;
    try { await pool.query(`UPDATE registro_sellado SET actor = 'otro' WHERE n = 1`); }
    catch { paro = true; }
    comprobar('un UPDATE por descuido no entra', paro);
    paro = false;
    try { await pool.query(`DELETE FROM registro_sellado WHERE n = 1`); }
    catch { paro = true; }
    comprobar('un DELETE por descuido tampoco', paro);
    paro = false;
    try { await pool.query(`TRUNCATE registro_sellado`); }
    catch { paro = true; }
    comprobar('y un TRUNCATE, que es el que se cuela: no hay filas que recorrer', paro,
      'un disparador FOR EACH ROW no se dispara con TRUNCATE; hace falta uno de sentencia');

    // Y ahora, quien SÍ tiene permisos: se quita el disparador y se manipula.
    // Es exactamente el ataque contra el que la cadena de huellas existe.
    await pool.query(`ALTER TABLE registro_sellado DISABLE TRIGGER registro_sellado_sin_update`);
    await pool.query(`UPDATE registro_sellado SET datos = '{"cantidad": 999999}'::jsonb WHERE n = 2`);
    const manipuladas = await leerCadena(db);
    const v = verificarCadena(manipuladas, publicas);
    comprobar('quien puede quitar el disparador y edita: se le ve, y se dice en cuál',
      v.estado === 'ALTERADA' && v.rota?.n === 2 && v.rota?.motivo === 'huella',
      JSON.stringify(v));

    const anclaje = await calcularAnclajeDelDia(db, new Date().toISOString().slice(0, 10));
    comprobar('el resumen del día se calcula y se guarda', !!anclaje?.raiz && anclaje!.raiz.length === 64);
    const anclajes = await pool.query(`SELECT publicado_en FROM registro_anclajes`);
    comprobar('calculado no es publicado: nace sin sitio de publicación',
      anclajes.rows.every((r: any) => r.publicado_en === null),
      'si naciera «publicado» estaríamos prometiendo una prueba que nadie puede comprobar');
  } finally {
    await pool.end();
    const limpieza = new pg.Client(conexion('postgres'));
    await limpieza.connect();
    await limpieza.query(`DROP DATABASE IF EXISTS ${BD_PRUEBA}`);
    await limpieza.end();
    console.log(`  · base de datos de prueba ${BD_PRUEBA} borrada`);
  }
}

console.log('');
if (fallos) { console.log(`✗ ${fallos} comprobación(es) mal o sin hacer.\n`); process.exit(1); }
console.log('✓ Todo correcto.\n');
