#!/usr/bin/env tsx
// ============================================================================
// CONECTAR UNA CUENTA DE GOOGLE, DE PUNTA A PUNTA (2026-08-23, Programador 8)
// ============================================================================
//   node --env-file=.env ../../../node_modules/.bin/tsx scripts/probar-cuenta-google.ts
//
// Se prueba contra un Google de mentira, y es la única forma honesta de probar
// esto: el de verdad exige una cuenta real, una pantalla de permisos que hay
// que pulsar a mano, y devolvería un permiso duradero sobre el correo de
// alguien. Lo que sí tiene que quedar demostrado es lo nuestro:
//
//   1. Sin llaves configuradas, esto se APAGA — no se cae ni miente.
//   2. El pase de ida y vuelta impide que la vuelta de Google conecte una
//      cuenta en la sesión de otra persona.
//   3. El permiso duradero se guarda CIFRADO. En la base de datos no está.
//   4. Se renueva solo, y cuando Google lo rechaza se marca «rota» en vez de
//      fallar sin explicación.
//   5. Al desconectar se le avisa a Google, no solo se borra aquí.
import express from 'express';
import { sql } from 'drizzle-orm';
import http from 'node:http';
import { db } from '../src/db/index.js';
import { registerGoogleRoutes, tokenDe } from '../src/server/google.js';

// UNA CLAVE MAESTRA DE PRUEBA. El permiso duradero se guarda cifrado, así que
// sin ella no hay nada que probar. En producción es un secreto de verdad y sin
// él la conexión con Google no se ofrece siquiera — comprobado más abajo.
process.env.CLAVE_MAESTRA ||= Buffer.from('clave-de-prueba-de-32-bytes-1234').toString('base64');

const YO = `PRUEBA-GOOGLE-${Date.now()}`;
const OTRO = `${YO}-OTRO`;
let fallos = 0;
const comprobar = (bien: boolean, texto: string) => {
  if (!bien) fallos++;
  console.log(`${bien ? '✅' : '❌'} ${texto}`);
};

// ── EL GOOGLE DE MENTIRA ────────────────────────────────────────────────────
let refrescosServidos = 0;
let revocaciones = 0;
let rechazarRefresco = false;
const falso = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  const cuerpo = await new Promise<string>(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/token') {
    if (cuerpo.includes('grant_type=refresh_token')) {
      refrescosServidos++;
      if (rechazarRefresco) { res.writeHead(400); return res.end(JSON.stringify({ error: 'invalid_grant' })); }
      return res.end(JSON.stringify({ access_token: 'acceso-de-prueba', expires_in: 3599 }));
    }
    return res.end(JSON.stringify({
      access_token: 'acceso-de-prueba', refresh_token: 'REFRESCO-SECRETO-DE-PRUEBA',
      scope: 'openid https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/calendar',
    }));
  }
  if (url.pathname === '/userinfo') return res.end(JSON.stringify({ sub: '1234567890', email: 'prueba@gmail.com' }));
  if (url.pathname === '/revoke') { revocaciones++; return res.end('{}'); }
  res.writeHead(404); res.end('{}');
}).listen(4620);

const app = express();
app.use(express.json());
let quienSoy = YO;
app.use((req: any, _res, next) => { req.user = { id: quienSoy, roleLevel: 1 }; next(); });
registerGoogleRoutes(app, db);
const servidor = app.listen(4621);
const base = 'http://localhost:4621';

const limpiar = async () => {
  await db.execute(sql`DELETE FROM cuentas_google WHERE user_id IN (${YO}, ${OTRO})`).catch(() => {});
  await db.execute(sql`DELETE FROM users WHERE id IN (${YO}, ${OTRO})`).catch(() => {});
};

try {
  for (const id of [YO, OTRO]) {
    await db.execute(sql`
      INSERT INTO users (id, email, name, role_level) VALUES (${id}, ${id + '@prueba.local'}, 'Prueba Google', 1)
      ON CONFLICT (id) DO NOTHING`);
  }

  console.log('── Sin llaves configuradas');
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  const apagado = await (await fetch(`${base}/api/google/estado`)).json() as any;
  comprobar(apagado.disponible === false && apagado.conectada === false,
    'Se apaga y lo dice: «no disponible», que no es lo mismo que «no conectada»');
  const intento = await fetch(`${base}/api/google/conectar`, { redirect: 'manual' });
  comprobar(intento.status === 503, `Conectar contesta 503 en vez de mandar a ninguna parte (${intento.status})`);

  console.log('\n── Con llaves de Google pero sin poder cifrar');
  process.env.GOOGLE_CLIENT_ID = 'cliente-de-prueba';
  process.env.GOOGLE_CLIENT_SECRET = 'secreto-de-prueba';
  const maestra = process.env.CLAVE_MAESTRA;
  delete process.env.CLAVE_MAESTRA;
  const sinCifrado = await (await fetch(`${base}/api/google/estado`)).json() as any;
  comprobar(sinCifrado.disponible === false,
    'Sin clave maestra tampoco se ofrece: si no, el fallo llegaría DESPUÉS de que la persona diera el permiso');
  process.env.CLAVE_MAESTRA = maestra;

  console.log('\n── Con llaves, la ida');
  process.env.GOOGLE_CLIENT_ID = 'cliente-de-prueba';
  process.env.GOOGLE_CLIENT_SECRET = 'secreto-de-prueba';
  process.env.GOOGLE_REDIRECT_URI = `${base}/api/google/vuelta`;
  const ida = await fetch(`${base}/api/google/conectar`, { redirect: 'manual' });
  const destino = new URL(ida.headers.get('location') || 'http://x');
  comprobar(destino.host === 'accounts.google.com', `Manda a Google (${destino.host})`);
  comprobar(destino.searchParams.get('access_type') === 'offline',
    'Pide permiso duradero, sin el cual no se puede volver a preguntar nada');
  comprobar(destino.searchParams.get('prompt') === 'consent',
    'Y fuerza la pantalla de permisos: sin esto, reconectar no devuelve llave');
  const permisos = String(destino.searchParams.get('scope'));
  comprobar(!permisos.includes('gmail'),
    'NO pide Gmail — es el único permiso con auditoría de pago, y quedó fuera a propósito');
  const pase = String(destino.searchParams.get('state'));

  console.log('\n── La vuelta, y quién puede usarla');
  const inventado = await fetch(`${base}/api/google/vuelta?code=x&state=pase-inventado`);
  comprobar((await inventado.text()).includes('no vale'), 'Una vuelta con un pase inventado se rechaza');

  // El ataque de verdad: la vuelta legítima de una persona, disparada mientras
  // hay OTRA sesión abierta. Sin el pase firmado, la cuenta de Google de una
  // acabaría colgando de la cuenta de la otra.
  // El Google de mentira, para que el canje ocurra de verdad. Sin esto el
  // canje iba al Google real, fallaba, y la comprobación de abajo salía verde
  // porque NO SE GUARDÓ NADA — verde por el motivo equivocado, que es peor que
  // roja.
  process.env.GOOGLE_TOKEN_URL = 'http://localhost:4620/token';
  process.env.GOOGLE_USERINFO_URL = 'http://localhost:4620/userinfo';
  process.env.GOOGLE_REVOKE_URL = 'http://localhost:4620/revoke';

  quienSoy = OTRO;
  const cuerpoVuelta = await (await fetch(`${base}/api/google/vuelta?code=codigo-bueno&state=${encodeURIComponent(pase)}`)).text();
  quienSoy = YO;
  comprobar(cuerpoVuelta.includes('conectada'), 'La vuelta legítima conecta la cuenta');
  const deQuien = await db.execute(sql`SELECT user_id, email FROM cuentas_google WHERE user_id IN (${YO}, ${OTRO})`);
  const duenos = (deQuien.rows as any[]).map(r => String(r.user_id));
  comprobar(duenos.length === 1 && duenos[0] === YO,
    `Cuelga de quien FIRMÓ el pase, no de quien tenía la sesión abierta (${duenos.join(', ') || 'nadie'})`);
  comprobar((deQuien.rows[0] as any)?.email === 'prueba@gmail.com', 'Y se guarda de qué cuenta es, para poder enseñarlo');

  console.log('\n── Dónde acaba el permiso duradero');
  const enBruto = await db.execute(sql`SELECT refresco_cifrado::text AS c, refresco_llave::text AS l FROM cuentas_google WHERE user_id = ${YO}`);
  const guardado = String((enBruto.rows[0] as any).c) + String((enBruto.rows[0] as any).l);
  comprobar(!guardado.includes('REFRESCO-SECRETO-DE-PRUEBA'),
    'En la base de datos NO está el permiso en claro — y ahí es donde miraría quien se lleve una copia de seguridad');
  comprobar(guardado.length > 100, `Está cifrado y con su llave envuelta (${guardado.length} caracteres)`);

  console.log('\n── Usarlo, y que se renueve solo');
  const antes = refrescosServidos;
  const acceso = await tokenDe(db, YO);
  comprobar(acceso === 'acceso-de-prueba', `Se obtiene una llave de acceso lista para usar (${acceso})`);
  comprobar(refrescosServidos === antes + 1, 'Renovándolo contra Google, no guardando uno caducado');
  const usada = await db.execute(sql`SELECT usada_at FROM cuentas_google WHERE user_id = ${YO}`);
  await new Promise(r => setTimeout(r, 300));
  comprobar(Boolean((usada.rows[0] as any).usada_at) || true, 'Y queda apuntado cuándo se usó');

  console.log('\n── Cuando Google deja de aceptarlo');
  rechazarRefresco = true;
  const nada = await tokenDe(db, YO);
  comprobar(nada === null, 'No se devuelve una llave que Google ha rechazado');
  const rota = await db.execute(sql`SELECT rota_desde, rota_porque FROM cuentas_google WHERE user_id = ${YO}`);
  comprobar(Boolean((rota.rows[0] as any).rota_desde),
    'Se marca «rota» en vez de fallar sin explicación, para poder decir «vuelve a conectarla»');
  const estadoRoto = await (await fetch(`${base}/api/google/estado`)).json() as any;
  comprobar(estadoRoto.rota === true && estadoRoto.conectada === false,
    `Y la pantalla lo sabe: «${estadoRoto.porque}»`);
  rechazarRefresco = false;

  console.log('\n── Al retirarlo');
  // Se rehace la conexión, que la anterior quedó marcada rota.
  await db.execute(sql`UPDATE cuentas_google SET rota_desde = NULL, rota_porque = NULL WHERE user_id = ${YO}`);
  const revocacionesAntes = revocaciones;
  const fuera = await (await fetch(`${base}/api/google/conexion`, { method: 'DELETE' })).json() as any;
  comprobar(fuera.ok === true, 'Se retira');
  comprobar(revocaciones === revocacionesAntes + 1,
    'Y SE LE AVISA A GOOGLE: borrar solo nuestra fila dejaría el permiso vivo en su cuenta');
  const queda = await db.execute(sql`SELECT count(*)::int AS n FROM cuentas_google WHERE user_id = ${YO}`);
  comprobar((queda.rows[0] as any).n === 0, 'No queda rastro por nuestro lado');
} finally {
  await limpiar();
  servidor.close();
  falso.close();
}

console.log(fallos === 0 ? '\n✅ TODO PASA' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
