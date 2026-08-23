#!/usr/bin/env tsx
// ============================================================================
// EL CABLE ENTRE DOS PROCESOS DE VERDAD (2026-08-23, Programador 8)
// ============================================================================
//   node --env-file=.env ../../../node_modules/.bin/tsx scripts/probar-cable-entre-procesos.ts
//
// Esta prueba **tiene que levantar dos procesos de sistema**, y no es por
// aparentar rigor: el fallo que se está arreglando es que cada proceso solo
// conoce sus propios cables. Dos servidores dentro del mismo `node` comparten
// el módulo, comparten el `Map`, y todo pasaría igual de verde con el fallo
// intacto. Una prueba que no puede fallar no prueba nada.
//
// Lo que se demuestra:
//
//   1. Ana abre su cable en el proceso A. Se le manda algo desde el proceso B.
//      **Le llega.** Sin el arreglo, esto se pierde en silencio.
//   2. El proceso B sabe que Ana está conectada aunque su cable esté en A.
//      Es la pregunta que decide si un teléfono suena.
//   3. Un evento que no cabe en un aviso de Postgres (más de 8000 bytes) cruza
//      igual, por la tabla. Es el caso de una oferta de WebRTC con candidatas.
//   4. Cuando Ana se va, deja de constar. Si no, las llamadas «sonarían» en un
//      cable que ya no existe.
//
// El mismo fichero hace de padre y de hijo: con `CABLE_PUERTO` puesto se
// comporta como uno de los dos servidores.
import express from 'express';
import { sql } from 'drizzle-orm';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { db } from '../src/db/index.js';
import {
  apuntar, enviarA, estaConectado, recuento, arrancarCable, arrancarLatido,
} from '../src/server/telecomHub.js';

// ── EL HIJO: un servidor mínimo con el cable enchufado ──────────────────────
if (process.env.CABLE_PUERTO) {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  arrancarLatido();
  arrancarCable(db);

  const sueltas = new Map<string, () => void>();

  app.get('/cable', (req, res) => {
    const userId = String(req.query.user);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': abierto\n\n');
    const { dispositivo, soltar } = apuntar(userId, res);
    sueltas.set(dispositivo, soltar);
    req.on('close', () => { soltar(); sueltas.delete(dispositivo); });
  });

  app.post('/enviar', (req, res) => res.json({ llegaron: enviarA(req.body.user, req.body.evento) }));
  app.get('/esta', (req, res) => res.json({ esta: estaConectado(String(req.query.user)) }));
  app.get('/recuento', (_req, res) => res.json(recuento()));
  app.listen(Number(process.env.CABLE_PUERTO), () => process.send?.('listo'));
  // El hijo no sigue leyendo.
} else {
  // ── EL PADRE: levanta los dos y los hace hablar ───────────────────────────
  const ANA = `PRUEBA-CABLE-${Date.now()}`;
  let fallos = 0;
  const comprobar = (bien: boolean, texto: string) => {
    if (!bien) fallos++;
    console.log(`${bien ? '✅' : '❌'} ${texto}`);
  };

  const hijos: ChildProcess[] = [];
  const levantar = (puerto: number) => new Promise<ChildProcess>((res, rej) => {
    // SE LANZA `tsx` A MANO Y NO `process.argv`. Al arrancar con
    // `node --env-file=.env .../tsx script.ts`, `argv` ya viene masticado por el
    // cargador y relanzarlo tal cual no vuelve a montar TypeScript.
    // `fileURLToPath` y no `.pathname`: esta carpeta tiene un espacio en el
    // nombre («Luz & Humanidad») y `.pathname` lo devuelve como `%20`, que no
    // existe en el disco. Es el fallo de siempre de este repositorio.
    const tsx = fileURLToPath(new URL('../../../../node_modules/.bin/tsx', import.meta.url));
    const h = spawn(process.execPath, [tsx, fileURLToPath(import.meta.url)], {
      env: { ...process.env, CABLE_PUERTO: String(puerto) },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    h.stderr?.on('data', d => {
      const t = String(d);
      // Los avisos del cable interesan; y si el hijo se cae, hay que ver por qué.
      if (t.includes('[cable]') || t.includes('Error')) process.stdout.write(`  [proceso ${puerto}] ${t}`);
    });
    h.on('message', () => res(h));
    h.on('exit', c => rej(new Error(`el proceso ${puerto} se fue con ${c}`)));
    hijos.push(h);
    setTimeout(() => rej(new Error(`el proceso ${puerto} no arrancó`)), 30000);
  });

  const limpiar = async () => {
    for (const h of hijos) { try { h.kill('SIGKILL'); } catch { /* ya estaba */ } }
    await db.execute(sql`DELETE FROM conexiones_vivas WHERE user_id = ${ANA}`).catch(() => {});
    await db.execute(sql`DELETE FROM eventos_grandes WHERE para = ${ANA}`).catch(() => {});
  };

  try {
    console.log('── Dos procesos, como los ocho de mañana');
    // PUERTOS AL AZAR, y no fijos. Si una ejecución anterior dejó un hijo vivo
    // —pasa cuando la prueba revienta antes del `finally`—, con puertos fijos la
    // siguiente falla con `EADDRINUSE` y parece que el cable está roto cuando
    // lo que hay es un cadáver ocupando el sitio.
    const A = 4700 + Math.floor(Math.random() * 200) * 2;
    const B = A + 1;
    await Promise.all([levantar(A), levantar(B)]);
    comprobar(true, `Levantados dos procesos de sistema (${A} y ${B})`);

    // El cable de Ana, en A y solo en A.
    const recibidos: string[] = [];
    const cable = await fetch(`http://localhost:${A}/cable?user=${ANA}`);
    const lector = cable.body!.getReader();
    const decodificador = new TextDecoder();
    void (async () => {
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        for (const linea of decodificador.decode(value).split('\n')) {
          if (linea.startsWith('data: ')) recibidos.push(linea.slice(6));
        }
      }
    })();

    // Que la tabla se entere. La presencia se relee cada 10 s, pero la fila se
    // escribe al conectar, así que al otro proceso le llega en su siguiente
    // relectura.
    await new Promise(r => setTimeout(r, 12000));

    console.log('\n── La pregunta que decide si un teléfono suena');
    const desdeB = await (await fetch(`http://localhost:${B}/esta?user=${ANA}`)).json() as any;
    comprobar(desdeB.esta === true, 'El proceso B sabe que Ana está conectada, con su cable en A');

    console.log('\n── Lo que antes se perdía en silencio');
    const envio = await (await fetch(`http://localhost:${B}/enviar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: ANA, evento: { tipo: 'prueba', texto: 'cruzo de B a A' } }),
    })).json() as any;
    comprobar(envio.llegaron > 0, `B dice que había alguien (${envio.llegaron})`);

    await new Promise(r => setTimeout(r, 2000));
    comprobar(recibidos.some(t => t.includes('cruzo de B a A')),
      `A Ana le llega en A lo que se mandó desde B (${recibidos.length} eventos recibidos)`);

    console.log('\n── Lo que no cabe en un aviso de Postgres');
    // Más de 8000 bytes: el tope duro de NOTIFY. Es el tamaño al que se acerca
    // una oferta de WebRTC con muchas candidatas de TURN, y perder justo esa
    // es quedarse sin llamada.
    const enorme = 'x'.repeat(9000);
    await fetch(`http://localhost:${B}/enviar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: ANA, evento: { tipo: 'oferta', sdp: enorme, marca: 'EVENTO-GRANDE' } }),
    });
    await new Promise(r => setTimeout(r, 2500));
    const grande = recibidos.find(t => t.includes('EVENTO-GRANDE'));
    comprobar(Boolean(grande), 'Un evento de 9.000 bytes cruza igual, por la tabla');
    comprobar(Boolean(grande && JSON.parse(grande).sdp?.length === 9000),
      'Y llega entero, no recortado');

    console.log('\n── El recuento es de la plataforma, no del proceso');
    const cuenta = await (await fetch(`http://localhost:${B}/recuento`)).json() as any;
    comprobar(cuenta.aparatos >= 1, `B cuenta el aparato de Ana aunque no sea suyo (${cuenta.aparatos})`);

    console.log('\n── Cuando Ana se va');
    await lector.cancel().catch(() => {});
    await new Promise(r => setTimeout(r, 12000));
    const trasIrse = await (await fetch(`http://localhost:${B}/esta?user=${ANA}`)).json() as any;
    comprobar(trasIrse.esta === false, 'B deja de creer que Ana está');
    const filas = await db.execute(sql`SELECT count(*)::int AS n FROM conexiones_vivas WHERE user_id = ${ANA}`);
    comprobar((filas.rows[0] as any).n === 0, 'Y no queda ninguna fila suya en la tabla');
  } finally {
    await limpiar();
  }

  console.log(fallos === 0 ? '\n✅ TODO PASA · el cable cruza procesos' : `\n❌ ${fallos} fallos`);
  process.exit(fallos === 0 ? 0 : 1);
}
