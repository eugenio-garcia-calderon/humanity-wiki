// ============================================================================
// PRUEBAS DE LA EDICIÓN SIMULTÁNEA (carril colab, 2026-10-06)
// ============================================================================
// Dos (o tres) clientes Yjs REALES —el mismo `y-protocols` y el mismo
// `colabModelo.ts` que usa el navegador— contra un servidor de verdad con su
// base de datos de verdad. Nada está simulado: si algo se rompe, se rompe aquí.
//
//   PORT=3027 node --env-file=.env node_modules/.bin/tsx server.ts &     (el servidor)
//   node --env-file=.env node_modules/.bin/tsx scripts/probar-colab.mts   (esto)
//
// Opciones por entorno:
//   COLAB_URL=http://127.0.0.1:3027      dónde está el servidor
//   COLAB_SEGUNDO=http://127.0.0.1:3127  un segundo servidor, el MISMO código y
//                                        la MISMA base de datos: activa la
//                                        prueba «dos procesos» (LISTEN/NOTIFY)
//   COLAB_LARGO=0                        salta la prueba de los 10 s sin red
//
// Crea sus propias sesiones de prueba y una página «PRUEBA-colab …» con tres
// personas (dueña, editora, comentarista) y lo borra todo al terminar. Usa los
// usuarios demo de la base local; no toca nada más.
// ============================================================================

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import WebSocket from 'ws';
import pg from 'pg';
import { randomBytes } from 'node:crypto';
import { aplicarCambios, construirDesdePlano, leerPlano, firma, type Plano } from '../src/utils/colabModelo.ts';
import { aArbol, aplanar } from '../src/utils/bloques.ts';

const BASE = process.env.COLAB_URL || 'http://127.0.0.1:3027';
const SEGUNDO = process.env.COLAB_SEGUNDO || '';
const LARGO = process.env.COLAB_LARGO !== '0';
const WS = (u: string) => u.replace(/^http/, 'ws');
const HOST = new URL(BASE).host;

// ── mini marco de pruebas ─────────────────────────────────────────────────
let fallos = 0, aciertos = 0;
const ok = (c: unknown, m: string) => { if (c) { aciertos++; console.log('  OK    ' + m); } else { fallos++; console.log('  FALLA ' + m); } };
const titulo = (t: string) => console.log('\n' + t);
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms));
async function esperar(cond: () => boolean | Promise<boolean>, ms = 8000, paso = 50): Promise<boolean> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) { if (await cond()) return true; await dormir(paso); }
  return !!(await cond());
}

// ── base de datos (sólo para sesiones de prueba y limpieza) ───────────────
const cliente = new pg.Client({
  host: process.env.SQL_HOST, user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
  password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD, database: process.env.SQL_DB_NAME,
});
const q = async (texto: string, args: any[] = []) => (await cliente.query(texto, args)).rows;

const USUARIOS = {
  duena: 'U_DEMO_LUCIA',      // crea la página
  editora: 'U_DEMO_AINHOA',   // rol «editar»
  comenta: 'U_DEMO_NEREA',    // rol «comentar»
  ajena: 'U1791216317245720', // sin acceso
};
const tokens: Record<string, string> = {};
let paginaId = '';

async function preparar() {
  await cliente.connect();
  for (const [k, uid] of Object.entries(USUARIOS)) {
    const t = 'colabtest' + randomBytes(24).toString('hex');
    tokens[k] = t;
    // La caducidad en UTC: con `now() + interval` salen sesiones ya caducadas.
    await q(`INSERT INTO sessions (token, user_id, expires_at, user_agent, ip) VALUES ($1, $2, (now() at time zone 'utc') + interval '6 hours', 'claude-dev-colab', '127.0.0.1')`, [t, uid]);
  }
  const r = await fetch(`${BASE}/api/documentos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `rh_session=${tokens.duena}` },
    body: JSON.stringify({ titulo: 'PRUEBA-colab ' + Date.now() }),
  });
  const j: any = await r.json();
  paginaId = j.id;
  if (!paginaId) throw new Error('no se pudo crear la página: ' + JSON.stringify(j));
  for (const [uid, rol] of [[USUARIOS.editora, 'editar'], [USUARIOS.comenta, 'comentar']]) {
    const x = await fetch(`${BASE}/api/permisos/pagina/${paginaId}/persona`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: `rh_session=${tokens.duena}` },
      body: JSON.stringify({ user_id: uid, rol }),
    });
    if (!x.ok) throw new Error('permiso: ' + await x.text());
  }
  // Contenido de partida, por el camino de siempre (PUT): todavía NO es colaborativa.
  const put = await api('duena', 'PUT', `/api/windows/${paginaId}`, {
    title: 'PRUEBA-colab',
    config: { bloques: [
      { id: 'P1', tipo: 'parrafo', texto: 'Primer párrafo.' },
      { id: 'P2', tipo: 'parrafo', texto: 'Segundo párrafo.' },
      { id: 'P3', tipo: 'desplegable', texto: 'Con hijos', bloques: [{ id: 'P4', tipo: 'lista', texto: 'hijo uno' }] },
      { id: 'P5', tipo: 'tabla', filas: [['a', 'b'], ['c', 'd']] },
    ] },
  });
  if (!put.ok) throw new Error('PUT inicial: ' + put.status);
}

async function limpiar() {
  try {
    if (paginaId) {
      await q(`DELETE FROM pagina_referencias WHERE origen_id = $1`, [paginaId]);
      await q(`DELETE FROM accesos_entidad WHERE entidad_tipo = 'pagina' AND entidad_id = $1`, [paginaId]);
      await q(`DELETE FROM entity_history WHERE entity_id = $1`, [paginaId]);
      await q(`DELETE FROM notifications WHERE entity_id = $1`, [paginaId]).catch(() => {});
      await q(`DELETE FROM graph_windows WHERE window_id = $1`, [paginaId]).catch(() => {});
      await q(`DELETE FROM knowledge_windows WHERE id = $1`, [paginaId]);
    }
    await q(`DELETE FROM sessions WHERE user_agent = 'claude-dev-colab'`);
  } finally { await cliente.end().catch(() => {}); }
}

function api(quien: keyof typeof USUARIOS, metodo: string, ruta: string, cuerpo?: unknown) {
  return fetch(BASE + ruta, {
    method: metodo, headers: { 'Content-Type': 'application/json', Cookie: `rh_session=${tokens[quien]}` },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

// ── un cliente Yjs real ───────────────────────────────────────────────────
class Cli {
  doc = new Y.Doc();
  awareness = new awarenessProtocol.Awareness(this.doc);
  ws: WebSocket | null = null;
  sincronizado = false;
  hola: any = null;
  textos: any[] = [];
  cierre: { codigo: number; motivo: string } | null = null;
  rechazo: number | null = null;
  /** Lo que el «editor» de este cliente sabe: base de `aplicarCambios`. */
  espejo: Plano = { titulo: '', bloques: [] };
  constructor(public quien: keyof typeof USUARIOS, public url = BASE, public galleta?: string, public origen?: string | null) {
    this.doc.on('update', (u: Uint8Array, o: unknown) => {
      if (o === 'remoto') return;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, 0);
      syncProtocol.writeUpdate(enc, u);
      this.enviar(encoding.toUint8Array(enc));
    });
    this.awareness.on('update', ({ added, updated, removed }: any, o: unknown) => {
      if (o === 'remoto') return;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, 1);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(this.awareness, added.concat(updated, removed)));
      this.enviar(encoding.toUint8Array(enc));
    });
  }
  enviar(b: Uint8Array) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(b); }
  conectar(): Promise<boolean> {
    this.sincronizado = false; this.cierre = null; this.rechazo = null;
    return new Promise(res => {
      const cab: Record<string, string> = { Cookie: this.galleta ?? `rh_session=${tokens[this.quien]}` };
      if (this.origen !== null) cab.Origin = this.origen ?? `http://${new URL(this.url).host}`;
      const ws = new WebSocket(`${WS(this.url)}/api/colab/${paginaId}`, { headers: cab });
      this.ws = ws;
      ws.binaryType = 'arraybuffer';
      ws.on('unexpected-response', (_rq, rs) => { this.rechazo = rs.statusCode || 0; res(false); });
      ws.on('error', () => { /* lo cuenta el cierre */ });
      ws.on('close', (codigo, motivo) => { this.cierre = { codigo, motivo: motivo.toString() }; res(false); });
      ws.on('open', () => {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, 0);
        syncProtocol.writeSyncStep1(enc, this.doc);
        ws.send(encoding.toUint8Array(enc));
      });
      ws.on('message', (data: any, esBinario: boolean) => {
        if (!esBinario) { const t = JSON.parse(data.toString()); this.textos.push(t); if (t.t === 'hola') { this.hola = t; } return; }
        const dec = decoding.createDecoder(new Uint8Array(data as ArrayBuffer));
        const tipo = decoding.readVarUint(dec);
        if (tipo === 0) {
          const enc = encoding.createEncoder();
          encoding.writeVarUint(enc, 0);
          const sub = syncProtocol.readSyncMessage(dec, enc, this.doc, 'remoto');
          if (encoding.length(enc) > 1) this.enviar(encoding.toUint8Array(enc));
          if (sub === 1 && !this.sincronizado) { this.sincronizado = true; res(true); }
        } else if (tipo === 1) {
          awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(dec), 'remoto');
        }
      });
    });
  }
  /** Cortar la red: se cierra el socket sin más. */
  cortar() { try { this.ws?.terminate(); } catch { /* ya */ } this.ws = null; this.sincronizado = false; }
  /** El «editor» entrega un plano nuevo; se traduce a Yjs con el mismo código que el navegador. */
  editar(f: (p: Plano) => void) {
    const mio: Plano = structuredClone(this.espejo);
    f(mio);
    aplicarCambios(this.doc, this.espejo, mio, 'local');
    this.espejo = mio;
  }
  /** «Llega lo remoto al editor»: el espejo se pone al día con el documento. */
  alDia() { this.espejo = leerPlano(this.doc); }
  plano() { return leerPlano(this.doc); }
  texto(id: string) { return this.plano().bloques.find(b => b.id === id)?.texto; }
  cerrar() { try { this.ws?.close(); } catch { /* ya */ } this.ws = null; }
}

const iguales = (...cs: Cli[]) => cs.every(c => firma(c.plano()) === firma(cs[0].plano()));
const unir = async (...cs: Cli[]) => esperar(() => iguales(...cs), 6000);
const derivada = async (): Promise<any> => (await (await api('duena', 'GET', `/api/windows/${paginaId}`)).json());

// ── LAS PRUEBAS ───────────────────────────────────────────────────────────
async function pruebas() {
  titulo('1. Conexión y estado inicial (la página se construye desde config.bloques)');
  const A = new Cli('duena'), B = new Cli('editora');
  ok(await A.conectar(), 'la dueña conecta y sincroniza');
  ok(await B.conectar(), 'la editora conecta y sincroniza');
  ok(A.hola?.edita === true && B.hola?.edita === true, 'las dos pueden escribir (rol editar o dueña)');
  ok(A.hola?.yo?.id === USUARIOS.duena && B.hola?.yo?.id === USUARIOS.editora, 'el servidor dice quién es cada una (por la cookie)');
  A.alDia(); B.alDia();
  ok(iguales(A, B), 'las dos ven lo mismo');
  const p0 = A.plano();
  ok(p0.bloques.map(b => b.id).join() === 'P1,P2,P3,P4,P5', 'los cinco bloques (con el hijo aplanado), en orden');
  ok(p0.bloques[3].nivel === 1, 'el hijo conserva su nivel');
  ok(JSON.stringify(p0.bloques[4].filas) === '[["a","b"],["c","d"]]', 'la tabla llega entera');
  const est: any = await (await api('duena', 'GET', `/api/colab/${paginaId}/estado`)).json();
  ok(est.colaborativa && est.abierta && est.conexiones === 2, 'el servidor dice que la sala está abierta con 2 conexiones');

  titulo('2. Dos personas escriben a la vez en el MISMO párrafo');
  A.editar(p => { p.bloques[0].texto = 'AAA ' + p.bloques[0].texto; });                  // al principio
  B.editar(p => { p.bloques[0].texto = p.bloques[0].texto + ' BBB'; });                  // al final, sin haber visto lo de A
  B.editar(p => { p.bloques[0].texto = p.bloques[0].texto.replace('Primer', 'Primerísimo'); });
  ok(await unir(A, B), 'convergen: idénticos en los dos');
  ok(A.texto('P1') === 'AAA Primerísimo párrafo. BBB', 'no se pierde ni una letra: «' + A.texto('P1') + '»');
  // Tecleando carácter a carácter en el mismo sitio, a la vez.
  for (const c of 'hola') A.editar(p => { p.bloques[1].texto = p.bloques[1].texto.replace('Segundo', 'Segundo' + c); });
  for (const c of 'XYZ') B.editar(p => { const t = p.bloques[1].texto; p.bloques[1].texto = t + c; });
  ok(await unir(A, B), 'tecleando a la vez al principio y al final: convergen');
  const t2 = A.texto('P2') || '';
  ok('hola'.split('').every(c => t2.includes(c)) && t2.includes('párrafo.'), 'lo de A (cuatro letras) sigue ahí: «' + t2 + '»');
  ok(t2.endsWith('XYZ'), 'lo de B (XYZ) está entero y en su sitio');
  A.alDia(); B.alDia();

  titulo('3. Mover un bloque mientras otra persona lo edita');
  A.editar(p => { const [b] = p.bloques.splice(1, 1); p.bloques.splice(4, 0, b); });     // P2 al final (antes de P5)
  B.editar(p => { p.bloques[1].texto += ' (editado mientras lo movían)'; });
  ok(await unir(A, B), 'convergen tras mover y editar a la vez');
  const ids = A.plano().bloques.map(b => b.id);
  ok(ids.filter(x => x === 'P2').length === 1, 'P2 aparece UNA sola vez: ' + ids.join());
  ok(A.texto('P2')!.includes('editado mientras lo movían'), 'el bloque movido conserva lo que escribió la otra persona');
  ok(ids.indexOf('P2') > ids.indexOf('P3'), 'y está donde lo dejó quien lo movió');
  A.alDia(); B.alDia();

  titulo('4. Mover un bloque con hijos mueve a los hijos');
  A.editar(p => {
    const i = p.bloques.findIndex(b => b.id === 'P3');
    const grupo = p.bloques.splice(i, 2);          // P3 y su hijo P4
    p.bloques.unshift(...grupo);
  });
  ok(await unir(A, B), 'convergen');
  ok(A.plano().bloques.slice(0, 2).map(b => b.id).join() === 'P3,P4', 'P3 y P4 (su hijo) están arriba, juntos');
  A.alDia(); B.alDia();

  titulo('5. Borrar un bloque que otra persona está editando (editar gana a borrar)');
  A.editar(p => { p.bloques = p.bloques.filter(b => b.id !== 'P1'); });
  B.editar(p => { p.bloques.find(b => b.id === 'P1')!.texto += ' ¡todavía escribía aquí!'; });
  ok(await esperar(() => iguales(A, B), 6000), 'convergen');
  ok(await esperar(() => A.plano().bloques.some(b => b.id === 'P1'), 6000), 'el bloque vuelve (alguien lo estaba escribiendo)');
  ok(await unir(A, B), 'y los dos lo ven');
  ok(A.texto('P1')!.includes('todavía escribía aquí'), 'con lo que se escribía dentro');
  A.alDia(); B.alDia();
  // Borrar sin que nadie lo toque: se borra de verdad.
  B.editar(p => { p.bloques = p.bloques.filter(b => b.id !== 'P1'); });
  await dormir(600);
  ok(await unir(A, B) && !A.plano().bloques.some(b => b.id === 'P1'), 'borrado sin edición simultánea: se borra');
  A.alDia(); B.alDia();

  titulo('6. Tablas: celdas distintas a la vez no se pisan');
  A.editar(p => { p.bloques.find(b => b.id === 'P5')!.filas![0][0] = 'A1'; });
  B.editar(p => { p.bloques.find(b => b.id === 'P5')!.filas![1][1] = 'D2'; });
  ok(await unir(A, B) && JSON.stringify(A.plano().bloques.find(b => b.id === 'P5')!.filas) === '[["A1","b"],["c","D2"]]', 'las dos celdas se conservan');
  A.alDia(); B.alDia();

  titulo('7. config.bloques (la copia legible) coincide con el documento');
  const okDerivada = await esperar(async () => {
    const j = await derivada();
    return firma(j.config?.bloques) === firma(aArbol(A.plano().bloques));
  }, 16000, 400);
  ok(okDerivada, 'tras unos segundos, config.bloques == el estado de Yjs (árbol con hijos)');
  const j = await derivada();
  ok(j.title === 'PRUEBA-colab', 'el título sigue siendo el de la página');
  const hist = await q(`SELECT count(*)::int AS n FROM entity_history WHERE entity_id = $1`, [paginaId]);
  ok(hist[0].n >= 1, 'hay instantánea en entity_history (' + hist[0].n + ')');
  const quien = await q(`SELECT updated_by, version FROM knowledge_windows WHERE id = $1`, [paginaId]);
  ok([USUARIOS.duena, USUARIOS.editora].includes(quien[0].updated_by), 'el cambio se atribuye a una de las dos personas que escribieron: ' + quien[0].updated_by);
  ok(!!(await q(`SELECT 1 FROM pagina_yjs WHERE pagina_id = $1`, [paginaId])).length, 'el estado binario está guardado en pagina_yjs');

  titulo('8. Permisos: quien sólo comenta recibe, pero no escribe');
  const C = new Cli('comenta');
  ok(await C.conectar(), 'la comentarista conecta');
  ok(C.hola?.edita === false, 'el servidor le dice que NO puede escribir');
  C.alDia();
  ok(iguales(A, C), 'recibe todo lo que hay');
  const antes = firma(A.plano());
  C.editar(p => { p.bloques[0].texto = 'INTRUSA ' + p.bloques[0].texto; p.bloques.push({ id: 'XX', tipo: 'parrafo', texto: 'colado' }); });
  await dormir(700);
  ok(firma(A.plano()) === antes, 'lo que intenta escribir NO llega a la editora');
  ok(!!C.textos.find(t => t.t === 'solo-lectura'), 'y el servidor se lo dice (solo-lectura)');
  ok(!(await derivada()).config?.bloques?.some((b: any) => b.id === 'XX'), 'ni a la base de datos');
  // Pero recibe lo que escriben los demás
  A.editar(p => { p.bloques.push({ id: 'P9', tipo: 'parrafo', texto: 'para todos' }); });
  ok(await esperar(() => !!C.plano().bloques.find(b => b.id === 'P9'), 4000), 'y sigue recibiendo lo de los demás');
  C.cerrar();
  const ajena = new Cli('ajena');
  await ajena.conectar();
  ok(ajena.rechazo === 403, 'una persona sin acceso: 403 (recibió ' + ajena.rechazo + ')');
  const sinCookie = new Cli('ajena', BASE, 'x=y');
  await sinCookie.conectar();
  ok(sinCookie.rechazo === 401, 'sin sesión: 401 (recibió ' + sinCookie.rechazo + ')');
  const otroOrigen = new Cli('editora', BASE, undefined, 'https://sitio-malo.example');
  await otroOrigen.conectar();
  ok(otroOrigen.rechazo === 403, 'desde otro sitio web (Origin ajeno): 403 (recibió ' + otroOrigen.rechazo + ')');
  const noExiste = await new Promise<number>(res => { const w = new WebSocket(`${WS(BASE)}/api/colab/NOEXISTE123`, { headers: { Cookie: `rh_session=${tokens.duena}` } }); w.on('unexpected-response', (_a, r) => res(r.statusCode || 0)); w.on('error', () => {}); });
  ok(noExiste === 404, 'una página que no existe: 404 (recibió ' + noExiste + ')');
  A.alDia();

  titulo('9. Presencia: cursores con la identidad REAL');
  A.awareness.setLocalState({ user: { id: 'FALSO', nombre: 'Administrador falso', color: '#000' }, bloque: 'P2', cursor: { a: { item: { client: 1, clock: 2 }, assoc: 0 }, h: { item: { client: 1, clock: 5 }, assoc: 0 } }, extra: 'x'.repeat(50) });
  const verA = () => [...B.awareness.getStates().values()].find((s: any) => s?.user?.id === USUARIOS.duena) as any;
  ok(await esperar(() => !!verA(), 4000), 'B ve el estado de A');
  ok(verA()?.user?.nombre !== 'Administrador falso' && verA()?.user?.id === USUARIOS.duena, 'el nombre y el id los pone el SERVIDOR, no el cliente: «' + verA()?.user?.nombre + '»');
  ok(verA()?.bloque === 'P2' && !!verA()?.cursor, 'pero el bloque y el cursor sí llegan');
  ok(verA()?.extra === undefined, 'y lo que el servidor no conoce se descarta');
  // Hacerse pasar por otro cliente: reescribir el estado del clientID de A.
  const idA = A.doc.clientID;
  const enc = encoding.createEncoder(); encoding.writeVarUint(enc, 1);
  const cuerpo = encoding.createEncoder(); encoding.writeVarUint(cuerpo, 1); encoding.writeVarUint(cuerpo, idA); encoding.writeVarUint(cuerpo, 9999); encoding.writeVarString(cuerpo, JSON.stringify({ bloque: 'SECUESTRADO' }));
  encoding.writeVarUint8Array(enc, encoding.toUint8Array(cuerpo));
  B.enviar(encoding.toUint8Array(enc));
  await dormir(500);
  ok(verA()?.bloque === 'P2', 'B no puede escribir el estado de A (clientID ajeno)');
  A.awareness.setLocalState(null);

  titulo('10. El camino de siempre (PUT) sigue funcionando sobre una página colaborativa');
  await esperar(async () => firma((await derivada()).config?.bloques) === firma(aArbol(A.plano().bloques)), 16000, 400);
  const v0 = (await derivada()).version;
  // PUT con la versión buena: entra al documento y llega en vivo a los demás.
  const base = (await derivada());
  const nuevo = aplanar(base.config.bloques); nuevo.find(b => b.id === 'P9')!.texto = 'cambiado por PUT';
  const r1 = await api('duena', 'PUT', `/api/windows/${paginaId}`, { title: base.title, config: { bloques: aArbol(nuevo) }, version_base: v0 });
  ok(r1.status === 200, 'PUT con la versión buena: 200');
  ok(await esperar(() => B.texto('P9') === 'cambiado por PUT', 4000), 'y los clientes en vivo lo reciben (' + B.texto('P9') + ')');
  A.alDia(); B.alDia();
  // PUT con versión vieja: 409 con lo que hay.
  const r2 = await api('duena', 'PUT', `/api/windows/${paginaId}`, { title: base.title, config: { bloques: aArbol(nuevo) }, version_base: v0 });
  ok(r2.status === 409, 'PUT con versión vieja: 409 (como siempre)');
  const j2: any = await r2.json();
  ok(Array.isArray(j2.config?.bloques), 'con el contenido actual para fusionar');
  // Los ajustes (portada, icono) también entran por el PUT, sin tocar bloques.
  const v1 = (await derivada()).version;
  const r3 = await api('duena', 'PUT', `/api/windows/${paginaId}`, { title: base.title, config: { portada: '/x.png', icono: '📝' }, version_base: v1 });
  ok(r3.status === 200, 'PUT sólo con ajustes: 200');
  const j3 = await derivada();
  ok(j3.config?.portada === '/x.png' && Array.isArray(j3.config?.bloques) && j3.config.bloques.length > 0, 'los ajustes se guardan y los bloques NO se pierden');

  titulo('11. Una escritura «por fuera» (la IA, la API, restaurar una versión) llega al documento');
  const ext = await derivada();
  const bsExt = aplanar(ext.config.bloques);
  bsExt.push({ id: 'EXT1', tipo: 'parrafo', texto: 'escrito por la IA' } as any);
  await q(`UPDATE knowledge_windows SET config = jsonb_set(config, '{bloques}', $2::jsonb), version = version + 1 WHERE id = $1`, [paginaId, JSON.stringify(aArbol(bsExt))]);
  ok(await esperar(() => !!A.plano().bloques.find(b => b.id === 'EXT1') && !!B.plano().bloques.find(b => b.id === 'EXT1'), 12000, 200), 'en pocos segundos los dos clientes ven el bloque nuevo');
  A.alDia(); B.alDia();

  titulo('12. Documento corrupto o mensajes malos NO tumban el servidor');
  const M = new Cli('editora');
  await M.conectar();
  const basura = encoding.createEncoder(); encoding.writeVarUint(basura, 0); encoding.writeVarUint(basura, 2); encoding.writeVarUint8Array(basura, new Uint8Array(randomBytes(300)));
  for (let i = 0; i < 4; i++) M.enviar(encoding.toUint8Array(basura));
  await esperar(() => M.cierre !== null, 4000);
  ok(M.cierre?.codigo === 1007, 'tras mensajes no válidos se cierra ESA conexión (código ' + M.cierre?.codigo + ')');
  const sano = await fetch(`${BASE}/api/colab/${paginaId}/estado`, { headers: { Cookie: `rh_session=${tokens.duena}` } });
  ok(sano.status === 200, 'el servidor sigue respondiendo');
  A.editar(p => { p.bloques.push({ id: 'P10', tipo: 'parrafo', texto: 'sigue funcionando' }); });
  ok(await esperar(() => !!B.plano().bloques.find(b => b.id === 'P10'), 4000), 'y A y B siguen editando juntos');
  A.alDia(); B.alDia();
  // Mensaje enorme.
  const G = new Cli('editora');
  await G.conectar();
  const grande = new Uint8Array(5 * 1024 * 1024); grande[0] = 0;
  try { G.ws!.send(grande); } catch { /* */ }
  await esperar(() => G.cierre !== null, 6000);
  ok(G.cierre?.codigo === 1009, 'un mensaje de 5 MB cierra la conexión (código ' + G.cierre?.codigo + ')');
  // Demasiadas conexiones de la misma persona a la misma página.
  const muchas: Cli[] = [];
  let rechazadas = 0;
  for (let i = 0; i < 11; i++) { const c = new Cli('comenta'); const bien = await c.conectar(); if (bien) muchas.push(c); else if (c.rechazo === 429) rechazadas++; }
  ok(muchas.length === 8 && rechazadas === 3, `límite de 8 conexiones por persona y página (abiertas ${muchas.length}, rechazadas con 429: ${rechazadas})`);
  muchas.forEach(c => c.cerrar());
  // Un documento grande: se aguanta.
  const P = new Cli('duena');
  await P.conectar(); P.alDia();
  const t0 = Date.now();
  P.editar(p => { for (let i = 0; i < 1500; i++) p.bloques.push({ id: 'G' + i, tipo: 'parrafo', texto: 'Párrafo de relleno número ' + i + ' con algo de texto para que pese.' }); });
  ok(await esperar(() => B.plano().bloques.length > 1500, 10000), `1.500 bloques de golpe llegan al otro cliente (${Date.now() - t0} ms)`);
  P.alDia(); A.alDia(); B.alDia();
  P.editar(p => { p.bloques = p.bloques.filter(b => !b.id.startsWith('G')); });
  await esperar(() => B.plano().bloques.length < 100, 10000);
  P.cerrar();

  if (LARGO) {
    titulo('13. Reconexión tras 10 s sin red (con cambios de los dos lados)');
    B.cortar();
    await dormir(300);
    A.editar(p => { p.bloques.find(b => b.id === 'P9')!.texto += ' [A mientras B sin red]'; p.bloques.push({ id: 'PA', tipo: 'parrafo', texto: 'nuevo de A' }); });
    B.editar(p => { p.bloques.find(b => b.id === 'P9')!.texto = '[B sin red] ' + p.bloques.find(b => b.id === 'P9')!.texto; p.bloques.push({ id: 'PB', tipo: 'parrafo', texto: 'nuevo de B' }); });
    await dormir(10_000);
    ok(!B.plano().bloques.find(b => b.id === 'PA'), 'B, sin red, no ha visto lo de A');
    ok(await B.conectar(), 'B vuelve y sincroniza');
    ok(await unir(A, B), 'convergen');
    const t = A.texto('P9') || '';
    ok(t.includes('[A mientras B sin red]') && t.includes('[B sin red]'), 'no se pierde nada de lo escrito en el mismo párrafo: «' + t + '»');
    ok(!!A.plano().bloques.find(b => b.id === 'PA') && !!A.plano().bloques.find(b => b.id === 'PB'), 'ni los bloques nuevos de cada uno');
    A.alDia(); B.alDia();
  }

  titulo('14. Todo acaba escrito en config.bloques (otra vez, tras los últimos cambios)');
  const igualFinal = await esperar(async () => {
    const j = await derivada();
    return firma(j.config?.bloques) === firma(aArbol(A.plano().bloques));
  }, 16000, 400);
  ok(igualFinal, 'config.bloques == estado de Yjs al final');
  const refs = await q(`SELECT count(*)::int AS n FROM pagina_yjs_actualiz WHERE pagina_id = $1`, [paginaId]);
  ok(refs[0].n < 80, `el registro de actualizaciones se compacta (${refs[0].n} filas sin compactar)`);

  A.cerrar(); B.cerrar();

  titulo('15. Cerrar todo y volver a abrir: nada se pierde (carga desde la base de datos)');
  await dormir(500);
  const A2 = new Cli('duena');
  await A2.conectar();
  ok(A2.sincronizado, 'la sala se vuelve a abrir');
  const finalDerivado = await derivada();
  ok(await esperar(async () => firma(A2.plano().bloques.map(b => ({ ...b, nivel: b.nivel || undefined }))) === firma(aplanar(finalDerivado.config.bloques)), 6000), 'lo que carga la sala es lo mismo que hay en config.bloques');
  A2.cerrar();

  if (SEGUNDO) await dosProcesos();
}

// ── DOS PROCESOS (LISTEN/NOTIFY) ──────────────────────────────────────────
async function dosProcesos() {
  titulo('16. Dos procesos, la misma base de datos (LISTEN/NOTIFY)');
  const X = new Cli('duena', BASE), Y_ = new Cli('editora', SEGUNDO);
  ok(await X.conectar() && await Y_.conectar(), 'una persona en cada proceso');
  const e1: any = await (await api('duena', 'GET', `/api/colab/${paginaId}/estado`)).json();
  const e2: any = await (await fetch(`${SEGUNDO}/api/colab/${paginaId}/estado`, { headers: { Cookie: `rh_session=${tokens.duena}` } })).json();
  ok(e1.proceso !== e2.proceso, 'son dos procesos distintos');
  X.alDia(); Y_.alDia();
  X.editar(p => { p.bloques.find(b => b.id === 'P9')!.texto = 'X ' + p.bloques.find(b => b.id === 'P9')!.texto; });
  Y_.editar(p => { p.bloques.find(b => b.id === 'P9')!.texto += ' Y'; });
  ok(await esperar(() => iguales(X, Y_), 8000), 'lo que escriben en procesos distintos converge');
  ok(/^X .* Y$/.test(X.texto('P9') || ''), 'sin perder nada: «' + X.texto('P9') + '»');
  X.awareness.setLocalState({ bloque: 'P1' });
  ok(await esperar(() => [...Y_.awareness.getStates().values()].some((s: any) => s?.user?.id === USUARIOS.duena && s.bloque === 'P1'), 5000), 'la presencia también cruza de proceso');
  const v0 = (await derivada()).version;
  await dormir(14_000);
  const v1 = (await derivada()).version;
  ok(v1 - v0 <= 2, `la derivación no se duplica entre procesos (versiones ${v0} -> ${v1})`);
  ok(firma((await derivada()).config.bloques) === firma(aArbol(X.plano().bloques)), 'y config.bloques coincide');
  X.cerrar(); Y_.cerrar();
}

// ── EJECUCIÓN ─────────────────────────────────────────────────────────────
try {
  await preparar();
  await pruebas();
} catch (e: any) {
  fallos++;
  console.error('\nERROR INESPERADO:', e?.stack || e);
} finally {
  await limpiar();
}
console.log(`\n${aciertos} comprobaciones bien, ${fallos} mal.`);
process.exit(fallos ? 1 : 0);
