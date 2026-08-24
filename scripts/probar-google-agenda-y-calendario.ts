#!/usr/bin/env tsx
// ============================================================================
// CONTACTOS Y CALENDARIO DE GOOGLE (2026-08-23, Programador 8) — fases 4 y 5
// ============================================================================
//   node --env-file=.env ../../../node_modules/.bin/tsx scripts/probar-google-agenda-y-calendario.ts
//
// Contra unas API de mentira. Lo que hay que demostrar:
//
//   4. La agenda de Google entra por la MISMA puerta que el .vcf y el Atajo:
//      no duplica, no pisa el nombre que tú pusiste, y cuenta los que se
//      quedan fuera por no tener número.
//   5. El calendario NO guarda copia —se comprueba que la tabla no existe— y
//      no deja crear una cita que acabe antes de empezar.
import express from 'express';
import { sql } from 'drizzle-orm';
import http from 'node:http';
import { db } from '../src/db/index.js';
import { registerContactosGoogleRoutes } from '../src/server/contactosGoogle.js';
import { registerCalendarioGoogleRoutes } from '../src/server/calendarioGoogle.js';
import { cifrar } from '../src/server/seguridad/cifrado.js';

process.env.CLAVE_MAESTRA ||= Buffer.from('clave-de-prueba-de-32-bytes-1234').toString('base64');
process.env.GOOGLE_CLIENT_ID = 'x';
process.env.GOOGLE_CLIENT_SECRET = 'y';

const YO = `PRUEBA-GAGENDA-${Date.now()}`;
let fallos = 0;
const comprobar = (bien: boolean, texto: string) => {
  if (!bien) fallos++;
  console.log(`${bien ? '✅' : '❌'} ${texto}`);
};

let creadas: any[] = [];
const falso = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  const cuerpo = await new Promise<string>(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname === '/token') return res.end(JSON.stringify({ access_token: 'acc', expires_in: 3599 }));
  if (url.pathname.endsWith('/connections')) {
    return res.end(JSON.stringify({
      connections: [
        { names: [{ displayName: 'Ana Ruiz' }], phoneNumbers: [{ value: '+34600111222' }] },
        { names: [{ displayName: 'Luis Soto' }], phoneNumbers: [{ value: '600333444' }] },
        { names: [{ displayName: 'Sin Número' }] },
        { phoneNumbers: [{ value: '+34600999888' }] },
      ],
    }));
  }
  if (url.pathname.includes('/events') && req.method === 'GET') {
    return res.end(JSON.stringify({
      items: [
        { id: 'e1', summary: 'Reunión', start: { dateTime: '2026-09-01T10:00:00Z' }, end: { dateTime: '2026-09-01T11:00:00Z' }, location: 'Sala 2', htmlLink: 'http://g/e1', attendees: [{ email: 'secreto@x.com' }] },
        { id: 'e2', summary: 'Cumpleaños', start: { date: '2026-09-04' }, end: { date: '2026-09-05' } },
      ],
    }));
  }
  if (url.pathname.includes('/events') && req.method === 'POST') {
    creadas.push(JSON.parse(cuerpo));
    return res.end(JSON.stringify({ id: 'nueva', htmlLink: 'http://g/nueva' }));
  }
  res.writeHead(404); res.end('{}');
}).listen(4640);
process.env.GOOGLE_TOKEN_URL = 'http://localhost:4640/token';
process.env.PEOPLE_API_URL = 'http://localhost:4640/v1';
process.env.CALENDAR_API_URL = 'http://localhost:4640/v3';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => { req.user = { id: YO, roleLevel: 1 }; next(); });
registerContactosGoogleRoutes(app, db);
registerCalendarioGoogleRoutes(app, db);
const servidor = app.listen(4641);
const base = 'http://localhost:4641';

const limpiar = async () => {
  await db.execute(sql`DELETE FROM game_agents WHERE user_id = ${YO}`).catch(() => {});
  await db.execute(sql`DELETE FROM cuentas_google WHERE user_id = ${YO}`).catch(() => {});
  await db.execute(sql`DELETE FROM users WHERE id = ${YO}`).catch(() => {});
};

try {
  await db.execute(sql`
    INSERT INTO users (id, email, name, role_level) VALUES (${YO}, ${YO + '@prueba.local'}, 'Prueba', 1)
    ON CONFLICT (id) DO NOTHING`);

  console.log('── Sin cuenta conectada');
  const sin = await fetch(`${base}/api/agenda/google/traer`, { method: 'POST' });
  comprobar(sin.status === 409, `409 y no 500: falta un paso que la persona puede dar (${sin.status})`);
  const sinCal = await fetch(`${base}/api/calendario/google`);
  comprobar(sinCal.status === 409, `El calendario dice lo mismo (${sinCal.status})`);

  const { paquete, llaveEnvuelta } = cifrar('refresco');
  await db.execute(sql`
    INSERT INTO cuentas_google (user_id, google_sub, email, refresco_cifrado, refresco_llave, permisos)
    VALUES (${YO}, 's', 'p@g.com', ${JSON.stringify(paquete)}::jsonb, ${JSON.stringify(llaveEnvuelta)}::jsonb, '{}')
    ON CONFLICT (user_id) DO NOTHING`);

  console.log('\n── Fase 4: la agenda de Google');
  const a = await (await fetch(`${base}/api/agenda/google/traer`, { method: 'POST' })).json() as any;
  comprobar(a.nuevos === 2, `Entran los que tienen nombre Y número (${a.nuevos})`);
  comprobar(a.sinTelefono === 1,
    `Se cuentan los que Google tiene sin número (${a.sinTelefono}) — sin este dato, alguien busca a los que faltan`);

  // Se le cambia el nombre a mano, como haría una persona.
  await db.execute(sql`UPDATE game_agents SET nombre = 'Ana la del gimnasio' WHERE user_id = ${YO} AND telefono = '34600111222'`);
  const b = await (await fetch(`${base}/api/agenda/google/traer`, { method: 'POST' })).json() as any;
  comprobar(b.nuevos === 0 && b.actualizados === 2, `Traerla otra vez no duplica (${b.nuevos} nuevos)`);
  const comoSeLlama = await db.execute(sql`SELECT nombre FROM game_agents WHERE user_id = ${YO} AND telefono = '34600111222'`);
  comprobar((comoSeLlama.rows[0] as any)?.nombre === 'Ana la del gimnasio',
    'Y NO pisa el nombre que le pusiste tú — la misma regla que el .vcf y el Atajo');

  console.log('\n── Fase 5: el calendario');
  const c = await (await fetch(`${base}/api/calendario/google`)).json() as any;
  comprobar(c.citas.length === 2, `Llegan las citas (${c.citas.length})`);
  comprobar(c.citas[1].todoElDia === true, 'Se distingue la que dura todo el día, que se pinta distinto');
  comprobar(!JSON.stringify(c).includes('secreto@x.com'),
    'NO se manda al navegador la lista de invitados: lo que no viaja no se puede filtrar');

  const tablas = await db.execute(sql`
    SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_name LIKE '%calendario%' OR table_name LIKE '%citas%'`);
  comprobar((tablas.rows[0] as any).n === 0,
    'Y NO hay tabla de calendario: no se guarda copia, a propósito');

  const alReves = await fetch(`${base}/api/calendario/google`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo: 'Imposible', empieza: '2026-09-01T12:00:00Z', acaba: '2026-09-01T11:00:00Z' }),
  });
  comprobar(alReves.status === 400, `No deja crear una cita que acabe antes de empezar (${alReves.status})`);

  const nueva = await (await fetch(`${base}/api/calendario/google`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo: 'Café', empieza: '2026-09-01T10:00:00Z', acaba: '2026-09-01T10:30:00Z' }),
  })).json() as any;
  comprobar(nueva.ok === true, 'Se crea una cita en tu Google');
  const puesta = creadas[creadas.length - 1];
  comprobar(!puesta.attendees && !puesta.conferenceData && !puesta.reminders,
    'Sin invitados, sin videollamada y sin recordatorios que nadie pidió');
} finally {
  await limpiar();
  servidor.close(); falso.close();
}

console.log(fallos === 0 ? '\n✅ TODO PASA' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
