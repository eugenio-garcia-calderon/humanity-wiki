#!/usr/bin/env node
// ============================================================================
// SELLAR LO PENDIENTE, Y PREGUNTAR SI UNA FILA SIGUE SIENDO LA MISMA
// ============================================================================
//     node --env-file=.env scripts/sellar.mjs                    ← sella todo lo pendiente
//     node --env-file=.env scripts/sellar.mjs users U_ADMIN_X    ← ¿esa fila sigue igual?
//
// Pensado para correr cada pocos minutos desde fuera de la aplicación (cron o
// launchd). Va aparte del servidor a propósito: si el sellado se cayera con el
// servidor, se caería justo cuando más interesa que alguien esté mirando.
//
// Está en .mjs y no en TypeScript porque se ejecuta suelto, sin build, y así
// sigue valiendo el día que nada esté compilado.
import pg from 'pg';

const [tabla, clave] = process.argv.slice(2);

const pool = new pg.Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
  connectionTimeoutMillis: 10000,
});

// El módulo de sellado es TypeScript; aquí se llama por su versión compilada si
// existe, y si no se usa `tsx`. Se resuelve en tiempo de ejecución para que
// este programa no dependa de que haya build.
const cargar = async () => {
  try { return await import('../dist/server/seguridad/sellar.js'); }
  catch { /* sin build: se intenta con tsx */ }
  const { register } = await import('tsx/esm/api');
  const quitar = register();
  const m = await import('../src/server/seguridad/sellar.ts');
  quitar();
  return m;
};

const { drizzle } = await import('drizzle-orm/node-postgres');
const db = drizzle(pool);
const { sellarPendientes, comprobarFila } = await cargar();

try {
  if (tabla && clave) {
    const v = await comprobarFila(db, tabla, clave);
    const etiqueta = { IGUAL: '✓ IGUAL', DISTINTA: '✗ DISTINTA', NO_SE: '· NO SÉ' }[v.estado];
    console.log(`\n  ${etiqueta}  ${tabla}#${clave}`);
    if (v.sellada_en) console.log(`  sellada por última vez: ${v.sellada_en}`);
    if (v.porque) console.log(`  ${v.porque}`);
    console.log('');
    process.exit(v.estado === 'DISTINTA' ? 1 : 0);
  }

  let total = 0, huecos = 0;
  for (;;) {
    const r = await sellarPendientes(db);
    if (!r.sellados) break;
    total += r.sellados; huecos += r.huecos;
  }
  const firmando = process.env.CLAVE_FIRMA_REGISTRO ? 'firmadas' : 'SIN FIRMAR (falta CLAVE_FIRMA_REGISTRO)';
  console.log(`\n  ${total} anotación(es) selladas, ${firmando}.`);
  if (huecos) {
    console.log(`  ⚠ ${huecos} hueco(s) en el buzón: alguien borró notas antes de sellarlas.`);
    console.log('    Quedan anotados en el registro con clase «hueco».');
  }
  console.log('');
  process.exit(huecos ? 2 : 0);
} finally {
  await pool.end();
}
