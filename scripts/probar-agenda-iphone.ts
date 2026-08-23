#!/usr/bin/env tsx
// ============================================================================
// LA AGENDA DEL IPHONE, DE PUNTA A PUNTA (2026-08-23, Programador 8)
// ============================================================================
//   node --env-file=.env ../../../node_modules/.bin/tsx scripts/probar-agenda-iphone.ts
//
// Prueba la puerta por la que entra el Atajo del iPhone contra la base de datos
// de verdad, sin navegador: es una API que va a usar una aplicación de Apple, no
// una pantalla. Lo que hay que demostrar es que **una llave abre solo lo suyo**
// y que lo que llega se entiende venga en la forma que venga, porque el Atajo
// lo monta una persona a mano y no hay dos iguales.
//
// Se crea una persona de prueba y se borra al final, pase lo que pase.
import express from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { registerAgendaRoutes } from '../src/server/agenda.js';

const PUERTO = 4610;
const YO = `PRUEBA-AGENDA-${Date.now()}`;

let fallos = 0;
const comprobar = (bien: boolean, texto: string) => {
  if (!bien) fallos++;
  console.log(`${bien ? '✅' : '❌'} ${texto}`);
};

const app = express();
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));
// Una sesión de mentira: la ruta de la llave necesita `req.user`; la del Atajo,
// a propósito, no —esa es toda la gracia—.
app.use((req: any, _res, next) => { req.user = { id: YO, roleLevel: 1 }; next(); });
registerAgendaRoutes(app, db);
const servidor = app.listen(PUERTO);
const base = `http://localhost:${PUERTO}`;

const limpiar = async () => {
  await db.execute(sql`DELETE FROM game_agents WHERE user_id = ${YO}`).catch(() => {});
  await db.execute(sql`DELETE FROM llaves_agenda WHERE user_id = ${YO}`).catch(() => {});
};

try {
  await db.execute(sql`
    INSERT INTO users (id, email, name, role_level) VALUES (${YO}, ${YO + '@prueba.local'}, 'Prueba Agenda', 1)
    ON CONFLICT (id) DO NOTHING
  `);

  console.log('── La llave');
  const creada = await (await fetch(`${base}/api/agenda/llave`, { method: 'POST' })).json();
  comprobar(typeof creada.llave === 'string' && creada.llave.startsWith('hw_agenda_'),
    'Se puede hacer una llave, y se reconoce a simple vista por su prefijo');
  const llave = creada.llave;

  const guardada = await db.execute(sql`SELECT huella FROM llaves_agenda WHERE user_id = ${YO} AND revocada_at IS NULL`);
  const huella = (guardada.rows[0] as any)?.huella || '';
  comprobar(huella.length === 64 && !huella.includes(llave.slice(10)),
    'En la base de datos vive la huella, no la llave');

  console.log('\n── Lo que puede y lo que no puede una llave');
  const sinLlave = await fetch(`${base}/api/agenda/contactos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactos: [{ nombre: 'Colado', telefono: '+34600000001' }] }),
  });
  comprobar(sinLlave.status === 401, 'Sin llave no entra nadie');

  const inventada = await fetch(`${base}/api/agenda/contactos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer hw_agenda_' + 'f'.repeat(64) },
    body: JSON.stringify({ contactos: [{ nombre: 'Colado', telefono: '+34600000002' }] }),
  });
  comprobar(inventada.status === 401, 'Una llave inventada tampoco');

  console.log('\n── Lo que manda el Atajo, en las tres formas que puede mandarlo');
  const conLlave = (cuerpo: any, tipo = 'application/json') => fetch(`${base}/api/agenda/contactos`, {
    method: 'POST',
    headers: { 'Content-Type': tipo, Authorization: `Bearer ${llave}` },
    body: tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo,
  }).then(r => r.json());

  const a = await conLlave({ contactos: [{ nombre: 'Ana Ruiz', telefono: '+34600111222' }] });
  comprobar(a.nuevos === 1, `Como pide la documentación: ${a.resumen}`);

  const b = await conLlave([{ nombre: 'Luis Soto', telefono: '600333444' }]);
  comprobar(b.nuevos === 1, `La lista pelada, sin envoltorio: ${b.resumen}`);

  const c = await conLlave('Marta Gil, +34600555666\nPedro Paz; 600777888', 'text/plain');
  comprobar(c.nuevos === 2, `Texto plano, una línea por contacto: ${c.resumen}`);

  console.log('\n── Lo que no puede pasar por mucho que se insista');
  const otraVez = await conLlave({ contactos: [{ nombre: 'Ana Ruiz', telefono: '+34600111222' }] });
  comprobar(otraVez.nuevos === 0 && otraVez.actualizados === 1,
    'Volver a ejecutar el Atajo no duplica a nadie');

  const renombrada = await conLlave({ contactos: [{ nombre: 'Ana la del gimnasio', telefono: '+34600111222' }] });
  comprobar(renombrada.actualizados === 1, 'Y no le pisa el nombre que tú le pusiste');
  // El número se guarda normalizado (sin el «+»), no como llegó: buscarlo tal
  // cual escrito en el Atajo no encuentra nada, y el fallo se lee como «se ha
  // perdido el contacto» cuando lo que está mal es la búsqueda.
  const comoSeLlama = await db.execute(sql`SELECT nombre FROM game_agents WHERE user_id = ${YO} AND telefono = '34600111222'`);
  comprobar((comoSeLlama.rows[0] as any)?.nombre === 'Ana Ruiz', 'Sigue llamándose como la primera vez');

  const sinNumero = await conLlave({ contactos: [{ nombre: 'Nadie' }, { telefono: '+34600999000' }] });
  comprobar(sinNumero.nuevos === 0 && sinNumero.ignorados === 2, 'Sin nombre o sin número, no entra');

  console.log('\n── Se sabe si el Atajo ha llegado');
  const estado = await (await fetch(`${base}/api/agenda/llave`)).json();
  comprobar(estado.hay === true && Boolean(estado.usada), 'Queda apuntado cuándo entró lo último');

  console.log('\n── Retirar la llave');
  await fetch(`${base}/api/agenda/llave`, { method: 'DELETE' });
  const despues = await fetch(`${base}/api/agenda/contactos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llave}` },
    body: JSON.stringify({ contactos: [{ nombre: 'Tarde', telefono: '+34600123123' }] }),
  });
  comprobar(despues.status === 401, `Retirada la llave, el Atajo deja de entrar (${despues.status})`);

  console.log('\n── El freno de la puerta');
  // Adivinar 256 bits no es la amenaza; un bucle apuntado aquí sí, porque cada
  // intento es una consulta a la base de datos. Con cinco de gracia, el sexto
  // empieza a esperar.
  //
  // VA AL FINAL A PROPÓSITO: el freno es por IP y en esta prueba todo sale de la
  // misma, así que en cuanto se levanta tiñe de 429 cualquier comprobación
  // posterior. Puesto en medio, lo de abajo pasaría o fallaría por el motivo
  // equivocado, que es la peor clase de prueba verde.
  let frenado = 0;
  for (let i = 0; i < 9; i++) {
    const r = await fetch(`${base}/api/agenda/contactos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer hw_agenda_' + 'a'.repeat(64) },
      body: JSON.stringify({ contactos: [] }),
    });
    if (r.status === 429) frenado++;
  }
  comprobar(frenado > 0, `Un bucle de llaves falsas acaba frenado (${frenado} de 9 rechazados con espera)`);


  const total = await db.execute(sql`SELECT count(*)::int AS n FROM game_agents WHERE user_id = ${YO}`);
  const n = (total.rows[0] as any).n;
  comprobar(n === 4, `Han quedado exactamente los 4 de verdad (${n})`);
} finally {
  await limpiar();
  await db.execute(sql`DELETE FROM users WHERE id = ${YO}`).catch(() => {});
  servidor.close();
}

console.log(fallos === 0 ? '\n✅ TODO PASA · la persona de prueba queda borrada' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
