#!/usr/bin/env node
// ============================================================================
// DAR DE ALTA UN PROGRAMADOR IA (2026-08-22)
// ============================================================================
// Eugenio: «crea un código que te permita sin mayor complicación tener un
// usuario de programador IA propia, crea uno para ti y otro para el programador
// de IA 2».
//
//     node scripts/agente-ia.mjs crear "Claude 1" claude1@lighthumanity.org
//     node scripts/agente-ia.mjs listar
//     node scripts/agente-ia.mjs apagar AIA123...
//
// ── DA DOS COSAS DISTINTAS, Y CONVIENE NO CONFUNDIRLAS ─────────────────────
// 1. UN TOKEN, para escribir en el hormiguero desde cualquier sitio sin sesión.
//    Solo abre esa puerta. Es lo que permite poner una nota en verde sin
//    fabricar la sesión de nadie.
// 2. UNA CUENTA de la plataforma, de nivel USUARIO (1), para poder ENTRAR y
//    mirar la interfaz — que es lo que hacía falta para comprobar los arreglos
//    de pantalla (el panel de notificaciones, el botón del menú, el buscador de
//    iconos): todo eso solo se ve con la sesión iniciada.
//
// POR QUÉ LA CUENTA ES DE NIVEL 1 Y NO DE ADMINISTRADOR. Para revisar cómo se
// ve una pantalla basta con entrar; no hace falta poder tocar nada de nadie. Un
// agente lee el hormiguero, donde escribe cualquiera: cuanto menos abra su
// cuenta, menos puede conseguir una nota escrita con mala idea. Lo que necesite
// permisos de verdad sigue pasando por el token, que solo llega al hormiguero.
//
// ── EL TOKEN SE ENSEÑA UNA VEZ Y NO SE GUARDA EN NINGÚN SITIO ──────────────
// Se imprime al crearlo y se acabó: en la base de datos queda solo su huella
// (SHA-256), como con una contraseña. Si se pierde, no se recupera — se apaga
// ese agente y se crea otro. Es incómodo a propósito: un token que se puede
// volver a leer es un token que cualquiera con acceso a la base de datos puede
// leer también.
//
// DÓNDE PONERLO DESPUÉS: en `.env`, que no va al repositorio, como
// `TOKEN_AGENTE_IA=hw_ia_…`. Nunca en un fichero versionado, nunca pegado en un
// chat que quede escrito, nunca en un commit. La regla 4 de la casa.
//
// ── CONTRA QUÉ BASE DE DATOS CORRE ─────────────────────────────────────────
// Contra la que digan las variables de entorno, igual que el servidor. En local
// eso es la de desarrollo; para crear los agentes de PRODUCCIÓN hay que
// ejecutarlo en el servidor (o con `DATABASE_URL` apuntando allí), y eso lo
// hace una persona: este programa no se conecta solo a producción.
import pg from 'pg';
import crypto from 'node:crypto';

const PREFIJO = 'hw_ia_';
const huella = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');

/** El mismo formato que usa `auth.ts` para las contraseñas de las personas:
 *  `scrypt$N$sal$hash`. Se repite aquí en vez de importarlo porque este
 *  programa corre suelto, sin TypeScript ni el servidor levantado — y si
 *  aquello cambiara, esta copia dejaría de valer y la cuenta no entraría, que
 *  es un fallo ruidoso y no uno silencioso. */
const SCRYPT_N = 16384;
const hashContrasena = (clave) => {
  const sal = crypto.randomBytes(16);
  const h = crypto.scryptSync(clave, sal, 64, { N: SCRYPT_N, r: 8, p: 1 });
  return `scrypt$${SCRYPT_N}$${sal.toString('hex')}$${h.toString('hex')}`;
};

const cliente = new pg.Client(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE || 'evolucion_humanidad',
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      },
);

const [orden, ...resto] = process.argv.slice(2);

await cliente.connect();
try {
  if (orden === 'crear') {
    const nombre = (resto.join(' ') || '').trim();
    if (!nombre) {
      console.error('Dile cómo se llama:  node scripts/agente-ia.mjs crear "Claude 1" claude1@lighthumanity.org');
      process.exit(1);
    }
    const correo = (resto.length > 1 ? resto[resto.length - 1] : '').includes('@')
      ? resto[resto.length - 1].toLowerCase()
      : null;
    const soloNombre = correo ? resto.slice(0, -1).join(' ').trim() : nombre;

    const token = PREFIJO + crypto.randomBytes(32).toString('hex');
    const id = 'AIA' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
    await cliente.query(
      'INSERT INTO agentes_ia (id, nombre, token_hash) VALUES ($1, $2, $3)',
      [id, soloNombre, huella(token)],
    );

    // LA CUENTA, si se ha dado un correo. Nivel 1 (usuario corriente): entrar y
    // mirar, nada más.
    let clave = null;
    if (correo) {
      clave = crypto.randomBytes(12).toString('base64url');
      const uid = 'U_IA_' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const ins = await cliente.query(
        `INSERT INTO users (id, email, name, display_name, password_hash, role_level, email_verified, created_by)
         VALUES ($1, $2, $3, $3, $4, 1, true, $1)
         ON CONFLICT (email) DO NOTHING`,
        [uid, correo, soloNombre, hashContrasena(clave)],
      );
      // SI ESE CORREO YA TENÍA CUENTA, NO SE TOCA SU CONTRASEÑA. Se mira si la
      // inserción llegó a ocurrir (`rowCount`), no si el correo existe después
      // — eso último es cierto en los dos casos, y enseñaría una contraseña que
      // no vale para entrar.
      if (!ins.rowCount) clave = null;
    }
    console.log(`\n  Agente creado: ${soloNombre}  (${id})\n`);
    console.log('  Su llave — se enseña UNA vez, guárdala ahora:\n');
    console.log(`      ${token}\n`);
    console.log('  Ponla en el .env de quien la vaya a usar:\n');
    console.log(`      TOKEN_AGENTE_IA=${token}\n`);
    console.log('  Y no la pegues en ningún sitio que quede escrito.\n');
    console.log('  Con ella puede: crear notas del hormiguero, cambiarles el estado');
    console.log('  y contestarlas. Nada más — ni entrar como nadie, ni tocar');
    console.log('  proyectos, páginas, tablas ni publicaciones.\n');
    if (correo && clave) {
      console.log('  ── Y su cuenta para ENTRAR y mirar la interfaz ─────────────\n');
      console.log(`      correo:     ${correo}`);
      console.log(`      contraseña: ${clave}\n`);
      console.log('  Nivel 1 (usuario corriente): entra y ve las pantallas, y no');
      console.log('  puede tocar nada de nadie. Es lo que hace falta para revisar');
      console.log('  cómo se ve algo sin darle la plataforma entera.\n');
    } else if (correo) {
      console.log(`  (Ya existía una cuenta con ${correo}: no le he tocado la contraseña.)\n`);
    }
  } else if (orden === 'listar') {
    const { rows } = await cliente.query(
      'SELECT id, nombre, activo, ultimo_uso, created_at FROM agentes_ia ORDER BY created_at',
    );
    if (!rows.length) { console.log('No hay ningún programador IA dado de alta.'); }
    for (const a of rows) {
      const uso = a.ultimo_uso ? new Date(a.ultimo_uso).toLocaleString('es-ES') : 'nunca';
      console.log(`${a.activo ? '●' : '○'} ${a.nombre.padEnd(18)} ${a.id.padEnd(20)} último uso: ${uso}`);
    }
  } else if (orden === 'apagar') {
    const id = resto[0];
    if (!id) { console.error('Dime cuál:  node scripts/agente-ia.mjs apagar AIA…'); process.exit(1); }
    const r = await cliente.query('UPDATE agentes_ia SET activo = false WHERE id = $1', [id]);
    // NO SE BORRA, SE APAGA: así el tablero sigue diciendo quién contestó qué
    // aunque ese agente ya no trabaje aquí.
    console.log(r.rowCount ? `Apagado ${id}. Su llave deja de valer ya.` : `No hay ningún agente ${id}.`);
  } else {
    console.log('Órdenes:  crear "Nombre"  |  listar  |  apagar <id>');
    process.exit(1);
  }
} finally {
  await cliente.end();
}
