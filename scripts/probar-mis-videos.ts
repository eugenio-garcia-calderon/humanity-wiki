#!/usr/bin/env tsx
// ============================================================================
// MIS VÍDEOS, DE PUNTA A PUNTA (2026-08-23, Programador 8) — fase 3 de 5
// ============================================================================
//   node --env-file=.env ../../../node_modules/.bin/tsx scripts/probar-mis-videos.ts
//
// Contra un YouTube de mentira, porque el de verdad exige una cuenta con vídeos
// guardados y gasta cuota real. Lo que hay que demostrar es lo nuestro, y sobre
// todo **lo que NO puede pasar**:
//
//   · Sin cuenta conectada no se rompe: se dice, y se sirve lo que hubiera.
//   · Cuando YouTube falla NO SE VACÍA la lista. Ese es el fallo que se lee
//     como «he perdido mis vídeos» y es el que más importa.
//   · Sincronizar dos veces no duplica.
//   · Quitar un «me gusta» escribe en Google ANTES que aquí.
import express from 'express';
import { sql } from 'drizzle-orm';
import http from 'node:http';
import { db } from '../src/db/index.js';
import { registerMisVideosRoutes } from '../src/server/misVideos.js';

process.env.CLAVE_MAESTRA ||= Buffer.from('clave-de-prueba-de-32-bytes-1234').toString('base64');
const YO = `PRUEBA-VIDEOS-${Date.now()}`;
let fallos = 0;
const comprobar = (bien: boolean, texto: string) => {
  if (!bien) fallos++;
  console.log(`${bien ? '✅' : '❌'} ${texto}`);
};

// ── EL YOUTUBE DE MENTIRA ───────────────────────────────────────────────────
let caido = false;
let cuotaAgotada = false;
let quitados: string[] = [];
let cuantosGusta = 2;
const falso = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  res.setHeader('Content-Type', 'application/json');
  if (caido) { res.writeHead(500); return res.end(JSON.stringify({ error: { message: 'boom' } })); }
  if (cuotaAgotada) {
    res.writeHead(403);
    return res.end(JSON.stringify({ error: { errors: [{ reason: 'quotaExceeded' }] } }));
  }
  if (url.pathname === '/videos/rate') { quitados.push(String(url.searchParams.get('id'))); return res.end('{}'); }
  if (url.pathname === '/videos') {
    return res.end(JSON.stringify({
      items: Array.from({ length: cuantosGusta }, (_, i) => ({
        id: `vid${i}`,
        snippet: { title: `Vídeo ${i}`, channelTitle: 'Canal de prueba', publishedAt: '2026-01-01T00:00:00Z', thumbnails: { medium: { url: 'http://x/m.jpg' } } },
        contentDetails: { duration: 'PT4M13S' },
      })),
    }));
  }
  if (url.pathname === '/playlists') {
    return res.end(JSON.stringify({ items: [{ id: 'lista1', snippet: { title: 'Para ver luego' } }] }));
  }
  if (url.pathname === '/playlistItems') {
    return res.end(JSON.stringify({
      items: [{ contentDetails: { videoId: 'vidL', videoPublishedAt: '2026-02-01T00:00:00Z' },
                snippet: { title: 'Vídeo de la lista', videoOwnerChannelTitle: 'Otro canal', thumbnails: { medium: { url: 'http://x/l.jpg' } } } }],
    }));
  }
  res.writeHead(404); res.end('{}');
}).listen(4630);
process.env.YOUTUBE_API_URL = 'http://localhost:4630';

// Un Google de mentira, para que `tokenDe` devuelva una llave.
const google = http.createServer((_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ access_token: 'acceso-de-prueba', expires_in: 3599 }));
}).listen(4631);
process.env.GOOGLE_TOKEN_URL = 'http://localhost:4631/token';
process.env.GOOGLE_CLIENT_ID = 'x';
process.env.GOOGLE_CLIENT_SECRET = 'y';

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => { req.user = { id: YO, roleLevel: 1 }; next(); });
registerMisVideosRoutes(app, db);
const servidor = app.listen(4632);
const base = 'http://localhost:4632';

const limpiar = async () => {
  await db.execute(sql`DELETE FROM videos_guardados WHERE user_id = ${YO}`).catch(() => {});
  await db.execute(sql`DELETE FROM cuentas_google WHERE user_id = ${YO}`).catch(() => {});
  await db.execute(sql`DELETE FROM users WHERE id = ${YO}`).catch(() => {});
};

try {
  await db.execute(sql`
    INSERT INTO users (id, email, name, role_level) VALUES (${YO}, ${YO + '@prueba.local'}, 'Prueba Vídeos', 1)
    ON CONFLICT (id) DO NOTHING`);

  console.log('── Sin cuenta de Google conectada');
  const sinCuenta = await (await fetch(`${base}/api/mis-videos`)).json() as any;
  comprobar(sinCuenta.aviso === 'sin-cuenta', `Se dice, no se rompe (aviso=${sinCuenta.aviso})`);
  comprobar(Array.isArray(sinCuenta.videos) && sinCuenta.videos.length === 0, 'Y la lista viene vacía, no rota');

  // Se conecta una cuenta a mano: el flujo entero ya tiene su propia prueba.
  const { cifrar } = await import('../src/server/seguridad/cifrado.js');
  const { paquete, llaveEnvuelta } = cifrar('refresco-de-prueba');
  await db.execute(sql`
    INSERT INTO cuentas_google (user_id, google_sub, email, refresco_cifrado, refresco_llave, permisos)
    VALUES (${YO}, 'sub', 'p@g.com', ${JSON.stringify(paquete)}::jsonb, ${JSON.stringify(llaveEnvuelta)}::jsonb, '{}')
    ON CONFLICT (user_id) DO NOTHING`);

  console.log('\n── Con cuenta: se traen');
  const traidos = await (await fetch(`${base}/api/mis-videos?forzar=si`)).json() as any;
  comprobar(traidos.videos.length === 3, `Llegan los «me gusta» y los de la lista (${traidos.videos.length})`);
  comprobar(traidos.videos.some((v: any) => v.origen === 'gusta') && traidos.videos.some((v: any) => v.origen === 'lista'),
    'Los dos orígenes, juntos — que en YouTube son dos pantallas distintas');
  comprobar(Boolean(traidos.alDia), 'Y se dice de cuándo es la copia');

  console.log('\n── Traerlos otra vez');
  await fetch(`${base}/api/mis-videos?forzar=si`);
  const otra = await (await fetch(`${base}/api/mis-videos`)).json() as any;
  comprobar(otra.videos.length === 3, `Sincronizar dos veces no duplica (${otra.videos.length})`);

  console.log('\n── Cuando YouTube falla');
  caido = true;
  const conFallo = await (await fetch(`${base}/api/mis-videos?forzar=si`)).json() as any;
  comprobar(conFallo.aviso === 'no-responde', `Se avisa (aviso=${conFallo.aviso})`);
  comprobar(conFallo.videos.length === 3,
    `Y NO SE VACÍA LA LISTA — este es el fallo que se lee como «he perdido mis vídeos» (${conFallo.videos.length})`);
  caido = false;

  console.log('\n── Cuando se acaba la cuota del día');
  cuotaAgotada = true;
  const conCuota = await (await fetch(`${base}/api/mis-videos?forzar=si`)).json() as any;
  comprobar(conCuota.aviso === 'cuota', `Se distingue de «no responde», que se arregla de otra forma (aviso=${conCuota.aviso})`);
  comprobar(conCuota.videos.length === 3, 'Tampoco se vacía');
  cuotaAgotada = false;

  console.log('\n── Quitar un «me gusta» desde aquí');
  const quita = await (await fetch(`${base}/api/mis-videos/gusta`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId: 'vid0', poner: false }),
  })).json() as any;
  comprobar(quita.ok === true, 'Se quita');
  comprobar(quitados.includes('vid0'), 'Y SE ESCRIBE EN YOUTUBE, no solo aquí: al revés, la próxima sincronización lo devolvería');
  const tras = await (await fetch(`${base}/api/mis-videos`)).json() as any;
  comprobar(!tras.videos.some((v: any) => v.video_id === 'vid0' && v.origen === 'gusta'),
    'Y desaparece de la lista');
} finally {
  await limpiar();
  servidor.close(); falso.close(); google.close();
}

console.log(fallos === 0 ? '\n✅ TODO PASA' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
