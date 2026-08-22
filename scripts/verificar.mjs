#!/usr/bin/env node
// ============================================================================
// ¿SIGUE TODO COMO LO SELLAMOS? (fase B, 2026-08-22)
// ============================================================================
//     node --env-file=.env scripts/verificar.mjs           ← cadena entera + muestra
//     node --env-file=.env scripts/verificar.mjs --muestra 50
//
// Pensado para correr solo, cada noche la cadena entera y cada hora una muestra.
// Sin esto, sellar es escribir en un cuaderno que nadie abre nunca.
//
// ── LO QUE DEVUELVE, Y POR QUÉ IMPORTA EL CÓDIGO DE SALIDA ─────────────────
//   0  todo cuadra
//   1  ALGO ESTÁ ALTERADO   ← esto es lo que tiene que despertar a alguien
//   2  no se ha podido comprobar (falta la llave pública, no hay nada sellado…)
//
// **Este programa no avisa a nadie por sí solo, a propósito.** Devuelve un
// código y un texto; quien lo llame decide si eso es una notificación, un
// mensaje o una luz roja. Un verificador que además intenta avisar tiene dos
// motivos para fallar y solo uno de ellos se nota.
//
// Y el 2 no es un aprobado. Si sale muchas veces seguidas, la respuesta correcta
// es «llevamos días sin poder comprobar nada», que es una noticia por sí sola.
import pg from 'pg';

const args = process.argv.slice(2);
const cuantas = Number(args[args.indexOf('--muestra') + 1]) || 25;
const soloMuestra = args.includes('--muestra');

const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
  connectionTimeoutMillis: 10000,
});

const cargar = async (rutaDist, rutaSrc) => {
  try { return await import(rutaDist); }
  catch { /* sin build */ }
  const { register } = await import('tsx/esm/api');
  const quitar = register();
  const m = await import(rutaSrc);
  quitar();
  return m;
};

const { drizzle } = await import('drizzle-orm/node-postgres');
const db = drizzle(pool);
const registro = await cargar('../dist/server/seguridad/registro.js', '../src/server/seguridad/registro.ts');
const sellar = await cargar('../dist/server/seguridad/sellar.js', '../src/server/seguridad/sellar.ts');

// Las llaves PÚBLICAS con las que se comprueban las firmas. Van en el entorno
// como `CLAVES_PUBLICAS_REGISTRO=idllave:base64,idllave2:base64`, para que
// rotar una llave no deje sin comprobar lo firmado con la anterior.
const publicas = Object.fromEntries(
  (process.env.CLAVES_PUBLICAS_REGISTRO || '')
    .split(',').map((p) => p.trim()).filter(Boolean)
    .map((p) => { const i = p.indexOf(':'); return [p.slice(0, i), p.slice(i + 1)]; }),
);

const linea = () => console.log('─'.repeat(70));
let peor = 0;

try {
  // Lo primero: ¿existe siquiera el registro aquí? Sin esto, una base de datos
  // sin la migración aplicada reventaba con un error de Postgres en crudo — que
  // es justo lo que esta casa no permite: no poder decir «no lo sé» de forma
  // distinguible de un resultado. Lo encontró la primera ejecución de verdad.
  const hay = await pool.query(`SELECT to_regclass('registro_sellado') IS NOT NULL AS existe`);
  if (!hay.rows[0].existe) {
    console.log('\n· NO SÉ: en esta base de datos no existe `registro_sellado`.');
    console.log('  Falta aplicar drizzle/0070_registro_sellado.sql. No es un aprobado ni un suspenso.\n');
    process.exit(2);
  }

  if (!soloMuestra) {
    const filas = await registro.leerCadena(db);
    const v = registro.verificarCadena(filas, publicas);

    console.log('\nEL REGISTRO SELLADO');
    linea();
    console.log(`  anotaciones comprobadas   ${String(v.comprobadas).padStart(6)}`);
    console.log(`  estado de la cadena       ${v.estado}`);
    console.log(`  estado de las firmas      ${v.firmas.estado}` +
      `  (válidas ${v.firmas.validas} · sin comprobar ${v.firmas.sinComprobar} · sin firmar ${v.firmas.sinFirmar})`);
    if (v.rota) {
      console.log(`\n  ✗ ROTA en la anotación nº ${v.rota.n} (${v.rota.motivo}), del ${v.rota.momento}`);
      console.log('    huella = alguien editó esa fila · eslabon = alguien borró una · firma = no la escribimos nosotros');
    }
    if (v.porque) console.log(`  · ${v.porque}`);
    linea();

    if (v.estado === 'ALTERADA' || v.firmas.estado === 'ALGUNA_INVALIDA') peor = Math.max(peor, 1);
    else if (v.estado === 'NO_SE' || v.firmas.estado === 'NO_SE') peor = Math.max(peor, 2);
    if (v.firmas.estado === 'SIN_FIRMAR') {
      console.log('  · Nada está firmado: falta CLAVE_FIRMA_REGISTRO donde se sella.');
      console.log('    La cadena demuestra que no se ha cambiado; no que lo escribiéramos nosotros.');
      peor = Math.max(peor, 2);
    }
  }

  const m = await sellar.verificarMuestra(db, cuantas);
  console.log('\nLOS DATOS, AL AZAR');
  linea();
  console.log(`  filas miradas             ${String(m.miradas).padStart(6)}`);
  console.log(`  iguales a lo sellado      ${String(m.iguales).padStart(6)}`);
  console.log(`  sin poder comprobar       ${String(m.sinSaber).padStart(6)}`);
  console.log(`  DISTINTAS                 ${String(m.distintas.length).padStart(6)}`);
  linea();
  for (const d of m.distintas) {
    console.log(`  ✗ ${d.tabla}#${d.clave} — cambió después de sellarse el ${d.sellada_en}`);
  }
  if (m.distintas.length) peor = Math.max(peor, 1);
  else if (!m.miradas) peor = Math.max(peor, 2);

  console.log('');
  console.log(peor === 0 ? '✓ Todo cuadra.\n'
    : peor === 1 ? '✗ HAY ALGO ALTERADO. Esto no espera a mañana.\n'
      : '· NO SÉ: no se ha podido comprobar del todo. No es un aprobado.\n');
  process.exit(peor);
} catch (e) {
  // Un fallo al comprobar NO es «está mal»: es «no lo sé». Confundirlos haría
  // que una caída de la base de datos pareciera una manipulación, y a la
  // tercera vez nadie miraría los avisos.
  console.log(`\n· NO SÉ: no se ha podido comprobar. ${e?.message || e}\n`);
  process.exit(2);
} finally {
  await pool.end();
}
