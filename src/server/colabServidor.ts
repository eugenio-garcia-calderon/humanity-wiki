// ============================================================================
// EDICIÓN COLABORATIVA EN TIEMPO REAL: EL SERVIDOR (2026-10-06, carril colab)
// ============================================================================
// Eugenio: «que varias personas editen la MISMA página a la vez, como en
// Notion: ver los cursores de los demás y que dos personas escribiendo en el
// mismo párrafo NO se pisen». El diseño (por qué Yjs, cómo se guarda una lista
// de bloques en un `Y.Doc`, qué pasa al mover o borrar mientras otro edita) está
// en la cabecera de `src/utils/colabModelo.ts`. Aquí está lo que hace falta
// para que ese documento viva en el servidor.
//
// ── QUÉ HACE ───────────────────────────────────────────────────────────────
//  · WebSocket en `/api/colab/:paginaId`, con el protocolo de sincronización de
//    Yjs (`y-protocols`) y la presencia (cursores, nombre, color) como
//    `awareness`.
//  · Una SALA por página abierta: el `Y.Doc` en memoria, quién está conectado
//    y los temporizadores. Se carga al conectarse el primero y se descarga un
//    minuto después de irse el último.
//  · PERSISTENCIA (`pagina_yjs` y `pagina_yjs_actualiz`): cada actualización
//    se añade al registro (decenas de bytes) y de vez en cuando se COMPACTA en
//    un único estado. Cargar = estado + lo que falte.
//  · DERIVACIÓN: unos segundos después de dejar de escribir, el documento se
//    escribe en `knowledge_windows.config.bloques` (la copia LEGIBLE: lectura
//    pública, buscador, API, IA, exportaciones no saben que existe Yjs), con
//    historial (`entity_history`), índice de enlaces (`pagina_referencias`),
//    aviso a quien sigue la página y atribuyendo el cambio a quien lo escribió.
//
// ── DOS VERDADES, UN SOLO DUEÑO A LA VEZ ───────────────────────────────────
// El documento Yjs y `config.bloques` dicen lo mismo, y alguien tiene que ser
// el dueño cuando discrepan:
//   1. Mientras alguien escribe, manda el documento; `config` es su proyección.
//   2. Si alguien escribe `config` por fuera (la IA, la API pública, restaurar
//      una versión, un `PUT` de siempre), lo detecta `knowledge_windows.version`:
//      cada derivación recuerda la versión que escribió, y si la de la fila es
//      otra, ESA ESCRITURA ES AJENA. Se reconcilia con la fusión de tres vías
//      de `fusionarBloques` (base: lo último derivado; mío: el documento; suyo:
//      la fila) y se aplica al documento como una edición más, así que llega a
//      quien esté conectado. Se mira cada 4 s en las salas abiertas, y al
//      cargar una sala comparando `version_derivada`.
//   3. El `PUT /api/windows/:id` de una página con documento Yjs ya no
//      escribe `config.bloques` por su cuenta: entra por aquí (`guardarPorColab`),
//      conserva el 409 por `version_base` de siempre, y se aplica al documento
//      con la misma traducción que usa el navegador. Es el camino sin
//      WebSocket (el respaldo): sigue funcionando y converge en el mismo sitio.
//   Si las tablas `pagina_yjs*` se borraran no se perdería ninguna página: se
//   reconstruye desde `config.bloques` al abrirla.
//
// ── SEGURIDAD ──────────────────────────────────────────────────────────────
//  · La identidad sale de la COOKIE DE SESIÓN en la actualización a WebSocket
//    (la misma consulta que usa Express, `usuarioDeCookie`), nunca de lo que
//    diga el cliente. Hay que ver la página (o que sea pública) para conectar.
//  · Permisos: `rolEnPagina`/`capacidades` de `permisos.ts`. Quien sólo ve o
//    comenta RECIBE los cambios pero sus actualizaciones se ignoran (y se le
//    avisa). El permiso se vuelve a mirar cada minuto: quitarle el acceso a
//    alguien lo desconecta; cerrar su sesión, también.
//  · Presencia: el servidor REESCRIBE el campo `user` de cada estado con la
//    identidad real (nombre, color y foto de su cuenta), descarta lo que no
//    conoce, limita su tamaño y no deja que una conexión escriba el estado de
//    otra. Un cliente no puede hacerse pasar por nadie.
//  · Origen: se rechaza un WebSocket de un navegador cuyo `Origin` no sea este
//    mismo sitio (secuestro de WebSocket entre sitios con la cookie del usuario).
//  · Límites: mensajes ≤ 4 MB, ritmo de mensajes y de bytes por conexión,
//    conexiones por persona y página (8), por persona (30), por página (200) y
//    en total (3000), conexiones nuevas por persona y minuto (40; la
//    reconexión en bucle de un cliente roto choca aquí), documento ≤ 16 MB
//    (pasado, se deja de aceptar escritura), ≤ 20.000 bloques.
//  · Un documento corrupto no tumba nada: cada actualización se aplica dentro
//    de un `try`; la que no se entiende cierra ESA conexión; un estado
//    guardado ilegible se descarta y la sala se reconstruye desde `config`.
//
// ── VARIOS PROCESOS ────────────────────────────────────────────────────────
// Como `telecomHub.ts`: `LISTEN/NOTIFY`. Cada proceso tiene su copia de la
// sala. Al guardar una actualización en el registro se avisa por `colab`
// (sólo el identificador de la fila, que cabe de sobra en los 8000 bytes de un
// NOTIFY); los demás procesos con la sala abierta la leen y la aplican, y sus
// clientes la reciben. La presencia viaja por `colab_aw` (el estado ya
// saneado, si cabe). Cada derivación avisa de la versión que escribió para que
// los demás no la tomen por una escritura ajena. Quien recibe la actualización
// de un cliente es quien la guarda y la deriva, así que no se escribe dos veces.
// Si la escucha se cae, al volver cada sala se resincroniza entera desde la
// base de datos. Hoy hay un proceso; esto está probado con dos
// (`scripts/probar-colab.mts`, prueba «dos procesos»).
//
// ── LO QUE NO HACE (y se sabe) ─────────────────────────────────────────────
//  · La atribución de la versión es de granularidad «quien escribió lo último
//    antes de derivar»: si dos personas escriben a la vez, el cambio de esos
//    segundos se anota a una (el historial agrupa por persona y dos minutos).
//  · Un contenido borrado y editado después de más de 24 h sin red por quien lo
//    editaba se pierde (se recoge a las 24 h; antes, «editar gana a borrar»).
//  · Un bloque dentro de un bloque sincronizado no tiene documento propio: va
//    en el de la página que lo tiene abierto.
// ============================================================================

import type { Express } from 'express';
import type { Server, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import { usuarioDeCookie } from './auth.js';
import { rolEnPagina, capacidades, quienDe } from './permisos.js';
import { paginaVisible } from './sitios.js';
import { registrarHistorial } from './historial.js';
import { avisarGuardado } from './colaboracion.js';
import { avisarSeguidoresDePagina } from './seguir.js';
import { reindexarReferencias } from './referencias.js';
import { sincronizarTituloDeFila } from './tituloFila.js';
import { aArbol, aplanar, nuevoIdBloque, normalizarNiveles, type Bloque } from '../utils/bloques.js';
import { fusionarBloques } from '../utils/colaboracion.js';
import { referenciasDe } from '../utils/menciones.js';
import {
  aplicarCambios, asegurarEstructura, construirDesdePlano, firma, leerPlano, limpiarOrden, recogerHuerfanos,
  resucitarEditados, vigilar, type Plano,
} from '../utils/colabModelo.js';

// ── CONSTANTES ─────────────────────────────────────────────────────────────

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

export const LIMITES = {
  /** Un mensaje de un cliente (el primero de uno que vuelve de estar sin red
   *  con mucho escrito es el mayor). */
  MENSAJE: 4 * 1024 * 1024,
  /** El estado de un documento: pasado esto, no se acepta más escritura. */
  ESTADO: 16 * 1024 * 1024,
  /** Lo que se deriva a `config.bloques`. */
  DERIVADO: 8 * 1024 * 1024,
  POR_USUARIO_PAGINA: 8,
  POR_USUARIO: 30,
  POR_PAGINA: 200,
  TOTAL: 3000,
  NUEVAS_POR_MINUTO: 40,
  /** Cubo de mensajes: ráfaga y ritmo sostenido por segundo. */
  RAFAGA_MSG: 300, RITMO_MSG: 120,
  /** Cubo de bytes: ráfaga y ritmo por segundo. */
  RAFAGA_BYTES: 8 * 1024 * 1024, RITMO_BYTES: 2 * 1024 * 1024,
  /** Estado de presencia (JSON). */
  PRESENCIA: 1800,
} as const;

const T = {
  PERSISTIR_MS: 250,
  DERIVAR_MS: 2000,
  DERIVAR_MAX_MS: 10_000,
  COMPACTAR_FILAS: 50,
  COMPACTAR_BYTES: 256 * 1024,
  DESCARGAR_MS: 60_000,
  EXTERNO_MS: 4000,
  LATIDO_MS: 30_000,
  REVISAR_PERMISOS_MS: 60_000,
} as const;

const PROCESO = randomUUID();

/** Colores de las personas: los mismos que `colaboracion.ts`, para que la cara
 *  de arriba (SSE) y el cursor (aquí) sean del mismo color. */
const COLORES = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6'];
const colorDe = (id: string) => COLORES[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORES.length];

// ── TIPOS ──────────────────────────────────────────────────────────────────

interface Conn {
  ws: WebSocket;
  sala: Sala;
  userId: string;
  nivel: number;
  nombre: string;
  avatar: string | null;
  color: string;
  cookie: string | undefined;
  escribe: boolean;
  /** `clientID`s de awareness que controla esta conexión. */
  ids: Set<number>;
  vivo: boolean;
  msgs: number; bytes: number; ultimo: number;
  invalidos: number;
  avisadoLectura: number;
  timerPermisos?: NodeJS.Timeout;
}

interface Sala {
  id: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<Conn>;
  pendientes: Uint8Array[];
  autor: string | null;
  filasDesde: number;
  bytesDesde: number;
  bloqueada: boolean;
  versionDerivada: number;
  ultimoPlano: Plano;
  refsFirma: string;
  cola: Promise<unknown>;
  derivando: Promise<unknown>;
  tPersistir?: NodeJS.Timeout;
  tDeriv?: NodeJS.Timeout;
  sucioDesde: number;
  tDescarga?: NodeJS.Timeout;
  cerrada: boolean;
  descargada?: Promise<void>;
  quitar: Array<() => void>;
}

let db: any = null;
let wss: WebSocketServer | null = null;
const cargando = new Map<string, Promise<Sala | null>>();
const listas = new Map<string, Sala>();
const porUsuario = new Map<string, number>();
const nuevas = new Map<string, number[]>();
let totalConexiones = 0;

// ── UTILIDADES ─────────────────────────────────────────────────────────────

/** El plano que sale de la fila de `knowledge_windows` (lo mismo que hace el
 *  editor al abrir: lista plana con ids y sin el H1 repetido del título). */
export function bloquesAPlano(arbol: any): Bloque[] {
  let bs: Bloque[] = aplanar(arbol || []);
  const vistos = new Set<string>();
  bs = bs.map(b => {
    if (typeof b.id !== 'string' || !b.id || vistos.has(b.id)) b = { ...b, id: nuevoIdBloque() + Math.floor(Math.random() * 1296).toString(36) };
    vistos.add(b.id);
    return b;
  });
  return normalizarNiveles(bs);
}

export function planoDeFila(w: { title?: string | null; config?: any }): Plano {
  let bs = bloquesAPlano(w.config?.bloques);
  const titulo = w.title || '';
  // Documentos de antes del arreglo del título duplicado (lo mismo que hace el
  // editor al abrir): un primer H1 idéntico al título se omite.
  if (bs[0]?.tipo === 'titulo1' && (bs[0].texto || '').trim() === titulo.trim()) bs = bs.slice(1);
  return { titulo, bloques: bs };
}

const firmaRefs = (arbol: any[], id: string) => {
  const r = referenciasDe(arbol, id);
  return JSON.stringify([[...r.personas].sort(), [...r.paginas].sort()]);
};

const enviar = (c: Conn, datos: Uint8Array | string) => {
  const ws = c.ws;
  if (ws.readyState !== WebSocket.OPEN) return;
  if (ws.bufferedAmount > 8 * 1024 * 1024) { cerrar(c, 1013, 'Conexión demasiado lenta'); return; }
  try { ws.send(datos); } catch { /* la cierra su `close` */ }
};
const enviarJSON = (c: Conn, o: unknown) => enviar(c, JSON.stringify(o));

function cerrar(c: Conn, codigo: number, motivo: string) {
  try { c.ws.close(codigo, motivo.slice(0, 100)); } catch { /* ya estaba cerrada */ }
  setTimeout(() => { try { c.ws.terminate(); } catch { /* ya */ } }, 3000).unref?.();
}

// ── CARGAR Y DESCARGAR SALAS ───────────────────────────────────────────────

async function leerFila(id: string): Promise<any | null> {
  const r = await db.execute(sql`
    SELECT * FROM knowledge_windows
    WHERE id = ${id} AND kind = 'pagina' AND archived_at IS NULL AND deleted_at IS NULL
  `);
  return (r.rows[0] as any) || null;
}

/** Está la página cargada o ha tenido alguna vez documento Yjs. */
async function esColab(id: string): Promise<boolean> {
  if (listas.has(id) || cargando.has(id)) return true;
  const r = await db.execute(sql`SELECT 1 FROM pagina_yjs WHERE pagina_id = ${id}`);
  return r.rows.length > 0;
}

export function obtenerSala(id: string): Promise<Sala | null> {
  const ya = cargando.get(id);
  if (ya) return ya;
  const p = cargarSala(id).catch(e => { cargando.delete(id); throw e; });
  cargando.set(id, p);
  return p;
}

async function cargarSala(id: string): Promise<Sala | null> {
  const w = await leerFila(id);
  if (!w) { cargando.delete(id); return null; }

  let doc = new Y.Doc();
  const fila = (await db.execute(sql`SELECT estado, version_derivada FROM pagina_yjs WHERE pagina_id = ${id}`)).rows[0] as any;
  let corrupto = false;
  if (fila) {
    try {
      Y.applyUpdate(doc, new Uint8Array(fila.estado), 'carga');
      const ups = (await db.execute(sql`SELECT actualiz FROM pagina_yjs_actualiz WHERE pagina_id = ${id} ORDER BY id`)).rows as any[];
      for (const u of ups) Y.applyUpdate(doc, new Uint8Array(u.actualiz), 'carga');
    } catch (e: any) {
      // Un estado que no se entiende no tumba la sala: la página está a salvo
      // en `config.bloques` (la copia legible) y se reconstruye desde ahí.
      console.error(`[colab] estado ilegible de ${id}, se reconstruye desde config.bloques:`, e?.message || e);
      corrupto = true;
    }
  }
  if (corrupto) {
    doc.destroy();
    doc = new Y.Doc();
    await db.execute(sql`DELETE FROM pagina_yjs_actualiz WHERE pagina_id = ${id}`);
    await db.execute(sql`DELETE FROM pagina_yjs WHERE pagina_id = ${id}`);
  }
  asegurarEstructura(doc);

  const nuevo = !fila || corrupto;
  const planoFila = planoDeFila(w);
  let versionDerivada = Number(w.version);
  let hayQueDerivar = false;
  if (nuevo) {
    construirDesdePlano(doc, planoFila);
  } else if (Number(w.version) > Number(fila.version_derivada)) {
    // Alguien escribió `config` por fuera mientras nadie tenía la página
    // abierta: la fila manda (nadie tenía cambios sin derivar: al descargar una
    // sala se deriva primero).
    const mio = leerPlano(doc);
    aplicarCambios(doc, mio, planoFila, 'externo');
  } else {
    // ¿Y si el servidor murió entre guardar y derivar? Se compara y se deriva.
    const mio = leerPlano(doc);
    if (firma(aArbol(mio.bloques)) !== firma(aArbol(planoFila.bloques)) || mio.titulo !== planoFila.titulo) hayQueDerivar = true;
  }

  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  const sala: Sala = {
    id, doc, awareness, conns: new Set(), pendientes: [], autor: null, filasDesde: 0, bytesDesde: 0, bloqueada: false,
    versionDerivada, ultimoPlano: leerPlano(doc), refsFirma: firmaRefs(w.config?.bloques || [], id),
    cola: Promise.resolve(), derivando: Promise.resolve(), sucioDesde: 0, cerrada: false, quitar: [],
  };
  engancharSala(sala);
  listas.set(id, sala);

  // El estado inicial queda guardado ya: sin él, otro proceso que cargue la
  // misma página construiría OTRO documento desde `config` (con otras
  // identidades internas) y los dos no se podrían fusionar.
  await compactar(sala, true);
  if (hayQueDerivar) programarDerivacion(sala, 500);
  return sala;
}

function engancharSala(sala: Sala) {
  const { doc, awareness } = sala;

  doc.on('update', (u: Uint8Array, origen: unknown) => {
    if (origen === 'carga') return;
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeUpdate(enc, u);
    const msg = encoding.toUint8Array(enc);
    for (const c of sala.conns) if (c !== origen) enviar(c, msg);
    if (origen === 'bd') return;
    if (typeof origen === 'object' && origen && 'userId' in (origen as any)) sala.autor = (origen as Conn).userId;
    sala.pendientes.push(u);
    sala.bytesDesde += u.length;
    programarPersistencia(sala);
    if (origen !== 'externo') programarDerivacion(sala);
  });

  // Editar gana a borrar: lo que otro editaba y alguien quitó, vuelve.
  sala.quitar.push(vigilar(doc, (c, txn) => {
    if (!(txn.origin && typeof txn.origin === 'object' && 'userId' in (txn.origin as any))) return;
    if (c.tocados.size) resucitarEditados(doc, c.tocados);
  }));

  const alPresencia = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origen: unknown) => {
    const cambiados = added.concat(updated, removed);
    if (origen && typeof origen === 'object' && 'ids' in (origen as any)) {
      const c = origen as Conn;
      for (const id of added) c.ids.add(id);
      for (const id of removed) c.ids.delete(id);
    }
    const msg = encoding.createEncoder();
    encoding.writeVarUint(msg, MSG_AWARENESS);
    encoding.writeVarUint8Array(msg, awarenessProtocol.encodeAwarenessUpdate(awareness, cambiados));
    const bytes = encoding.toUint8Array(msg);
    for (const c of sala.conns) if (c !== origen) enviar(c, bytes);
    if (origen !== 'bd') avisarOtrosProcesos('colab_aw', { p: sala.id, o: PROCESO, d: Buffer.from(awarenessProtocol.encodeAwarenessUpdate(awareness, cambiados)).toString('base64') });
  };
  awareness.on('update', alPresencia);
}

function descargarSala(sala: Sala): Promise<void> {
  if (sala.cerrada) return sala.descargada || Promise.resolve();
  sala.cerrada = true;
  clearTimeout(sala.tDescarga); clearTimeout(sala.tPersistir); clearTimeout(sala.tDeriv);
  listas.delete(sala.id);
  sala.descargada = descargarDentro(sala);
  return sala.descargada;
}

async function descargarDentro(sala: Sala) {
  try {
    await volcar(sala);
    await derivar(sala, { forzar: true });
    await compactar(sala, true);
  } catch (e: any) { console.error(`[colab] al descargar ${sala.id}:`, e?.message || e); }
  for (const q of sala.quitar) q();
  sala.awareness.destroy();
  sala.doc.destroy();
  cargando.delete(sala.id);
}

function programarDescarga(sala: Sala) {
  clearTimeout(sala.tDescarga);
  if (sala.conns.size) return;
  sala.tDescarga = setTimeout(() => { if (!sala.conns.size) void descargarSala(sala); }, T.DESCARGAR_MS);
  sala.tDescarga.unref?.();
}

// ── PERSISTENCIA ───────────────────────────────────────────────────────────

function programarPersistencia(sala: Sala) {
  if (sala.tPersistir) return;
  sala.tPersistir = setTimeout(() => { sala.tPersistir = undefined; void volcar(sala); }, T.PERSISTIR_MS);
  sala.tPersistir.unref?.();
}

/** Encadena trabajos de una sala para que no se pisen (guardar, compactar). */
const enCola = <T,>(sala: Sala, f: () => Promise<T>): Promise<T> => {
  const p = sala.cola.then(f, f);
  sala.cola = p.catch(() => {});
  return p;
};

/** Escribe en el registro lo que haya sin guardar y avisa a los otros procesos. */
function volcar(sala: Sala): Promise<void> {
  return enCola(sala, async () => {
    if (!sala.pendientes.length) return;
    const lote = sala.pendientes.splice(0);
    const u = lote.length === 1 ? lote[0] : Y.mergeUpdates(lote);
    try {
      const r = await db.execute(sql`
        INSERT INTO pagina_yjs_actualiz (pagina_id, actualiz, autor_id)
        VALUES (${sala.id}, ${Buffer.from(u)}, ${sala.autor}) RETURNING id
      `);
      const fid = Number((r.rows[0] as any).id);
      sala.filasDesde++;
      avisarOtrosProcesos('colab', { k: 'act', p: sala.id, i: fid, o: PROCESO });
    } catch (e: any) {
      // No se pierde: vuelve a la cola y se reintenta.
      sala.pendientes.unshift(...lote);
      console.error(`[colab] no se ha podido guardar ${sala.id}, se reintenta:`, e?.message || e);
      sala.tPersistir = setTimeout(() => { sala.tPersistir = undefined; void volcar(sala); }, 2000);
      sala.tPersistir.unref?.();
      return;
    }
    if (sala.filasDesde >= T.COMPACTAR_FILAS || sala.bytesDesde >= T.COMPACTAR_BYTES) await compactarDentro(sala);
  });
}

const compactar = (sala: Sala, forzar = false) => enCola(sala, () => compactarDentro(sala, forzar));

/** Junta el registro en un solo estado. Bajo un candado de Postgres por página:
 *  lee todo lo que haya (también lo de otros procesos), lo aplica a su copia, y
 *  sólo borra las filas que ha leído y metido en el estado. */
async function compactarDentro(sala: Sala, forzar = false) {
  if (sala.cerrada && !forzar) return;
  try {
    await db.transaction(async (tx: any) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'colab:' + sala.id}))`);
      const filas = (await tx.execute(sql`SELECT id, actualiz FROM pagina_yjs_actualiz WHERE pagina_id = ${sala.id} ORDER BY id`)).rows as any[];
      for (const f of filas) { try { Y.applyUpdate(sala.doc, new Uint8Array(f.actualiz), 'bd'); } catch (e: any) { console.error('[colab] fila ilegible', f.id, e?.message); } }
      limpiarOrden(sala.doc);
      recogerHuerfanos(sala.doc);
      const estado = Y.encodeStateAsUpdate(sala.doc);
      if (estado.length > LIMITES.ESTADO) { sala.bloqueada = true; console.error(`[colab] ${sala.id} pasa del límite (${estado.length} bytes): sólo lectura`); }
      await tx.execute(sql`
        INSERT INTO pagina_yjs (pagina_id, estado, version_derivada, bytes, compactado_en)
        VALUES (${sala.id}, ${Buffer.from(estado)}, ${sala.versionDerivada}, ${estado.length}, now())
        ON CONFLICT (pagina_id) DO UPDATE SET estado = EXCLUDED.estado, bytes = EXCLUDED.bytes,
          version_derivada = EXCLUDED.version_derivada, compactado_en = now()
      `);
      if (filas.length) {
        await tx.execute(sql`
          DELETE FROM pagina_yjs_actualiz WHERE pagina_id = ${sala.id}
            AND id IN (SELECT jsonb_array_elements_text(${JSON.stringify(filas.map((f: any) => Number(f.id)))}::jsonb)::bigint)
        `);
      }
    });
    sala.filasDesde = 0; sala.bytesDesde = 0;
  } catch (e: any) { console.error(`[colab] no se ha podido compactar ${sala.id}:`, e?.message || e); }
}

// ── DERIVAR A config.bloques ───────────────────────────────────────────────

function programarDerivacion(sala: Sala, espera: number = T.DERIVAR_MS) {
  const ahora = Date.now();
  if (!sala.sucioDesde) sala.sucioDesde = ahora;
  clearTimeout(sala.tDeriv);
  const t = Math.max(0, Math.min(espera, sala.sucioDesde + T.DERIVAR_MAX_MS - ahora));
  sala.tDeriv = setTimeout(() => { void derivar(sala); }, t);
  sala.tDeriv.unref?.();
}

interface OpcionesDerivar { forzar?: boolean; conexion?: string | null; config?: any | null; autor?: string | null }

/** Serializa las derivaciones de una sala. Devuelve la versión resultante. */
function derivar(sala: Sala, o: OpcionesDerivar = {}): Promise<number | null> {
  return enSerie(sala, () => derivarAhora(sala, o));
}
/** Derivar y reconciliar no pueden cruzarse: uno detrás de otro. */
function enSerie<T>(sala: Sala, f: () => Promise<T>): Promise<T> {
  const t = sala.derivando.then(f, f);
  sala.derivando = t.catch(() => {});
  return t;
}

async function derivarAhora(sala: Sala, o: OpcionesDerivar, intento = 0): Promise<number | null> {
  clearTimeout(sala.tDeriv); sala.tDeriv = undefined; sala.sucioDesde = 0;
  try {
    const antes = await leerFila(sala.id);
    if (!antes) { cerrarSalaBorrada(sala); return null; }
    // ¿Escribió alguien `config` por fuera? Se reconcilia antes de escribir.
    if (Number(antes.version) !== sala.versionDerivada) await reconciliarExterno(sala, antes);

    const plano = leerPlano(sala.doc);
    const arbol = aArbol(plano.bloques);
    const json = JSON.stringify(arbol);
    if (json.length > LIMITES.DERIVADO) { console.error(`[colab] ${sala.id}: derivado de ${json.length} caracteres, no se escribe`); return null; }
    const titulo = plano.titulo || 'Documento sin título';
    const version = Number(antes.version);
    const cambiaConfig = !!o.config;
    const igual = firma(antes.config?.bloques ?? []) === firma(arbol) && (antes.title || '') === titulo && !cambiaConfig;
    if (igual) { sala.ultimoPlano = plano; return version; }

    const autor = o.autor || sala.autor || antes.updated_by || antes.creator_user_id || null;
    const upd = await db.execute(sql`
      UPDATE knowledge_windows SET
        title = ${titulo},
        config = COALESCE(${cambiaConfig ? JSON.stringify(o.config) : null}::jsonb, config, '{}'::jsonb)
                 || jsonb_build_object('bloques', ${json}::jsonb),
        version = version + 1, updated_at = now(), updated_by = ${autor}
      WHERE id = ${sala.id} AND version = ${version}
      RETURNING version
    `);
    if (!upd.rows.length) {
      // Alguien escribió entre la lectura y la escritura: se vuelve a empezar.
      if (intento < 3) return derivarAhora(sala, o, intento + 1);
      console.error(`[colab] ${sala.id}: no se pudo derivar tras ${intento} intentos`);
      return null;
    }
    const nueva = Number((upd.rows[0] as any).version);
    sala.versionDerivada = nueva;
    sala.ultimoPlano = plano;
    await db.execute(sql`UPDATE pagina_yjs SET version_derivada = ${nueva} WHERE pagina_id = ${sala.id}`);
    avisarOtrosProcesos('colab', { k: 'der', p: sala.id, v: nueva, o: PROCESO });

    // Lo que acompaña a un guardado de siempre. Nada de esto retrasa ni rompe
    // la derivación: el texto ya está guardado.
    if (titulo !== (antes.title || '')) await sincronizarTituloDeFila(db, sala.id, titulo).catch((e: any) => console.error('[colab] título de fila:', e?.message));
    await registrarHistorial(db, {
      entidad: 'knowledge_windows', tabla: 'knowledge_windows', id: sala.id,
      operacion: 'update', previo: antes, actor: autor, agrupar: true,
    });
    if (autor) void avisarSeguidoresDePagina(db, sala.id, autor);
    const f = firmaRefs(arbol, sala.id);
    if (f !== sala.refsFirma && autor) {
      sala.refsFirma = f;
      void reindexarReferencias(db, sala.id, autor).catch((e: any) => console.error('[colab] referencias:', e?.message));
    }
    avisarGuardado(sala.id, nueva, autor, o.conexion ?? null);
    return nueva;
  } catch (e: any) {
    console.error(`[colab] no se ha podido derivar ${sala.id}:`, e?.message || e);
    // Se reintenta: el documento está guardado, sólo falta la copia legible.
    if (!sala.cerrada) programarDerivacion(sala, 5000);
    return null;
  }
}

function cerrarSalaBorrada(sala: Sala) {
  for (const c of [...sala.conns]) cerrar(c, 4404, 'La página ya no existe');
  void descargarSala(sala);
}

/** Alguien escribió `config` por fuera del documento: se funde con él. */
async function reconciliarExterno(sala: Sala, fila?: any) {
  const w = fila || await leerFila(sala.id);
  if (!w || Number(w.version) === sala.versionDerivada) return;
  const suyo = planoDeFila(w);
  const base = sala.ultimoPlano;
  const mio = leerPlano(sala.doc);
  const { bloques } = fusionarBloques(base.bloques, mio.bloques, suyo.bloques);
  const titulo = suyo.titulo !== base.titulo && mio.titulo === base.titulo ? suyo.titulo : mio.titulo;
  aplicarCambios(sala.doc, mio, { titulo, bloques: normalizarNiveles(bloques) }, 'externo');
  sala.versionDerivada = Number(w.version);
  sala.ultimoPlano = leerPlano(sala.doc);
  sala.refsFirma = firmaRefs(w.config?.bloques || [], sala.id);
  await db.execute(sql`UPDATE pagina_yjs SET version_derivada = ${sala.versionDerivada} WHERE pagina_id = ${sala.id}`);
  // Si el documento tiene cosas que la fila no, se derivan (un `externo` no lo
  // hace solo).
  if (firma(aArbol(sala.ultimoPlano.bloques)) !== firma(aArbol(suyo.bloques)) || sala.ultimoPlano.titulo !== suyo.titulo) programarDerivacion(sala, 500);
}

/** Cada pocos segundos, en las salas abiertas: ¿cambió la fila por fuera? */
async function vigilarExternos() {
  if (!db || !listas.size) return;
  try {
    const ids = [...listas.keys()];
    const r = await db.execute(sql`
      SELECT id, version FROM knowledge_windows
      WHERE id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
    `);
    for (const f of r.rows as any[]) {
      const sala = listas.get(f.id);
      if (!sala || sala.cerrada) continue;
      if (Number(f.version) !== sala.versionDerivada) await enSerie(sala, () => reconciliarExterno(sala)).catch((e: any) => console.error('[colab] externo:', e?.message));
    }
  } catch (e: any) { console.error('[colab] vigilar externos:', e?.message || e); }
}

// ── EL PUT DE SIEMPRE, CUANDO LA PÁGINA TIENE DOCUMENTO (respaldo sin WS) ──

/**
 * La llama `PUT /api/windows/:id`. Devuelve `null` si la página no es
 * colaborativa (el guardado sigue por su camino de siempre) o la respuesta
 * final. Sigue siendo `version_base` → 409 con lo que hay → fusión en el
 * cliente; lo que cambia es adónde va lo guardado: al documento, que es lo que
 * ven los demás en vivo.
 */
export async function guardarPorColab(dbx: any, id: string, d: any, userId: string): Promise<{ estado: number; cuerpo: any } | null> {
  db ||= dbx;
  if (d?.kind && d.kind !== 'pagina') return null;
  if (!await esColab(id)) return null;
  const sala = await obtenerSala(id);
  if (!sala) return null;
  const cfg = d?.config && typeof d.config === 'object' ? d.config : null;
  if (cfg && JSON.stringify(cfg).length > LIMITES.DERIVADO) return { estado: 413, cuerpo: { error: 'La página es demasiado grande.' } };

  // 1. Lo que hubiera sin derivar se escribe YA, para que la versión que se
  //    compara sea la de verdad (y el 409 de siempre funcione).
  await derivar(sala, { forzar: true });
  const fila = await leerFila(id);
  if (!fila) return null;
  const vBase = d.version_base === undefined || d.version_base === null ? null : Number(d.version_base);
  if (vBase !== null && vBase !== Number(fila.version)) {
    const por = fila.updated_by ? (await db.execute(sql`SELECT COALESCE(display_name, name, email) AS n FROM users WHERE id = ${fila.updated_by}`)).rows[0] as any : null;
    return { estado: 409, cuerpo: { error: 'Otra persona ha guardado esta página mientras tanto.', version: Number(fila.version), title: fila.title, config: fila.config, por: por?.n || null } };
  }

  // 2. Lo que trae se aplica al documento (los demás lo reciben en vivo).
  const actual = leerPlano(sala.doc);
  const hayBloques = !!cfg && Array.isArray(cfg.bloques);
  const mio: Plano = {
    titulo: typeof d.title === 'string' ? d.title : actual.titulo,
    bloques: hayBloques ? bloquesAPlano(cfg.bloques) : actual.bloques,
  };
  sala.autor = userId;
  try { aplicarCambios(sala.doc, actual, mio, 'put'); }
  catch (e: any) { return { estado: 400, cuerpo: { error: e?.message || 'Contenido no válido.' } }; }

  // 3. Y se escribe en la fila con el resto de la configuración de la petición.
  let resto: any = null;
  if (cfg) { resto = { ...cfg }; delete resto.bloques; }
  const version = await derivar(sala, { forzar: true, conexion: d.conexion ? String(d.conexion) : null, config: resto, autor: userId });
  if (version === null) return { estado: 500, cuerpo: { error: 'No se ha podido guardar.' } };
  return { estado: 200, cuerpo: { success: true, version } };
}

// ── PRESENCIA: SANEAR LO QUE ENVÍA UN CLIENTE ──────────────────────────────

/** Re-escribe una actualización de presencia con la identidad REAL. */
function sanearPresencia(c: Conn, bytes: Uint8Array): Uint8Array | null {
  const dec = decoding.createDecoder(bytes);
  const n = decoding.readVarUint(dec);
  if (n > 8) return null;
  const salida: Array<[number, number, string]> = [];
  for (let i = 0; i < n; i++) {
    const clientId = decoding.readVarUint(dec);
    const clock = decoding.readVarUint(dec);
    const texto = decoding.readVarString(dec);
    // Un clientID sólo es de quien lo estrenó: sin esto, una conexión podría
    // reescribir el cursor de otra.
    if (!c.ids.has(clientId)) {
      if (c.ids.size >= 4) continue;
      // Ya existe y es de otra conexión (de éste o de otro proceso): no.
      if (c.sala.awareness.getStates().has(clientId)) continue;
    }
    if (texto.length > LIMITES.PRESENCIA) continue;
    let estado: any;
    try { estado = JSON.parse(texto); } catch { continue; }
    if (estado === null) { salida.push([clientId, clock, 'null']); continue; }
    if (!estado || typeof estado !== 'object') continue;
    const limpio: any = {
      user: { id: c.userId, nombre: c.nombre, color: c.color, avatar: c.avatar, edita: c.escribe },
      bloque: typeof estado.bloque === 'string' ? estado.bloque.slice(0, 80) : null,
      cursor: estado.cursor && typeof estado.cursor === 'object' && JSON.stringify(estado.cursor).length <= 700 ? estado.cursor : null,
      sig: typeof estado.sig === 'string' ? estado.sig.slice(0, 80) : null,
    };
    salida.push([clientId, clock, JSON.stringify(limpio)]);
  }
  if (!salida.length) return null;
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, salida.length);
  for (const [id, clock, st] of salida) { encoding.writeVarUint(enc, id); encoding.writeVarUint(enc, clock); encoding.writeVarString(enc, st); }
  return encoding.toUint8Array(enc);
}

// ── CONEXIONES ─────────────────────────────────────────────────────────────

function rechazar(socket: Duplex, codigo: number, texto: string) {
  try {
    socket.write(`HTTP/1.1 ${codigo} ${texto}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  } catch { /* ya cerrado */ }
  socket.destroy();
}

function nuevaPermitida(clave: string): boolean {
  const ahora = Date.now();
  const l = (nuevas.get(clave) || []).filter(t => ahora - t < 60_000);
  if (l.length >= LIMITES.NUEVAS_POR_MINUTO) { nuevas.set(clave, l); return false; }
  l.push(ahora); nuevas.set(clave, l);
  return true;
}

async function alActualizar(req: IncomingMessage, socket: Duplex, head: Buffer) {
  try {
    const url = new URL(req.url || '', 'http://x');
    const m = url.pathname.match(/^\/api\/colab\/([A-Za-z0-9_-]{1,64})$/);
    if (!m) return rechazar(socket, 404, 'Not Found');
    const paginaId = m[1];

    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try { host = new URL(origin).host; } catch { /* mal formado */ }
      if (!host || host !== req.headers.host) return rechazar(socket, 403, 'Forbidden');
    }
    if (!db || !wss) return rechazar(socket, 503, 'Service Unavailable');
    if (totalConexiones >= LIMITES.TOTAL) return rechazar(socket, 503, 'Service Unavailable');

    const user = await usuarioDeCookie(db, req.headers.cookie);
    if (!user) return rechazar(socket, 401, 'Unauthorized');
    if (!nuevaPermitida(user.id)) return rechazar(socket, 429, 'Too Many Requests');

    const quien = { id: user.id, nivel: user.roleLevel ?? 0 };
    const acceso = await rolEnPagina(db, quien, paginaId);
    if (!acceso.existe) return rechazar(socket, 404, 'Not Found');
    const caps = capacidades(acceso);
    if (!caps.ver && !await paginaVisible(db, paginaId)) return rechazar(socket, 403, 'Forbidden');

    const clave = `${user.id}|${paginaId}`;
    if ((porUsuario.get(clave) || 0) >= LIMITES.POR_USUARIO_PAGINA || (porUsuario.get(user.id) || 0) >= LIMITES.POR_USUARIO) return rechazar(socket, 429, 'Too Many Requests');
    const sala0 = listas.get(paginaId);
    if (sala0 && sala0.conns.size >= LIMITES.POR_PAGINA) return rechazar(socket, 503, 'Service Unavailable');

    wss.handleUpgrade(req, socket, head, ws => { void alConectar(ws, req, user, caps.editar, paginaId); });
  } catch (e: any) {
    console.error('[colab] actualizar:', e?.message || e);
    rechazar(socket, 500, 'Internal Server Error');
  }
}

const contar = (clave: string, d: number) => { const n = (porUsuario.get(clave) || 0) + d; if (n <= 0) porUsuario.delete(clave); else porUsuario.set(clave, n); };

async function alConectar(ws: WebSocket, req: IncomingMessage, user: any, edita: boolean, paginaId: string) {
  // Se cuenta YA (antes de cargar la sala) para que una ráfaga de conexiones no
  // las deje pasar todas.
  const clave = `${user.id}|${paginaId}`;
  contar(clave, 1); contar(user.id, 1); totalConexiones++;
  let conn: Conn | null = null;
  const cola: RawData[] = [];
  let cerrado = false;
  ws.on('message', (data: RawData) => { if (conn) alMensaje(conn, data); else if (cola.length < 200) cola.push(data); });
  ws.on('error', () => { /* lo trata `close` */ });
  ws.on('close', () => {
    if (cerrado) return;
    cerrado = true;
    contar(clave, -1); contar(user.id, -1); totalConexiones--;
    if (conn) soltar(conn);
  });
  ws.on('pong', () => { if (conn) conn.vivo = true; });

  try {
    let sala = await obtenerSala(paginaId);
    // Si la sala se estaba descargando, se espera a que acabe y se carga de nuevo.
    if (sala?.cerrada) { await sala.descargada; sala = await obtenerSala(paginaId); }
    if (!sala || sala.cerrada) { ws.close(4404, 'La página no existe'); return; }
    if (cerrado) { programarDescarga(sala); return; }
    const u = (await db.execute(sql`SELECT COALESCE(display_name, name, email) AS nombre, avatar_url FROM users WHERE id = ${user.id}`)).rows[0] as any;
    conn = {
      ws, sala, userId: user.id, nivel: user.roleLevel ?? 0, nombre: String(u?.nombre || 'Alguien').slice(0, 80), avatar: u?.avatar_url || null,
      color: colorDe(user.id), cookie: req.headers.cookie, escribe: edita && !sala.bloqueada, ids: new Set(), vivo: true,
      msgs: LIMITES.RAFAGA_MSG, bytes: LIMITES.RAFAGA_BYTES, ultimo: Date.now(), invalidos: 0, avisadoLectura: 0,
    };
    sala.conns.add(conn);
    clearTimeout(sala.tDescarga);
    enviarJSON(conn, {
      t: 'hola', pagina: paginaId, esquema: 1, version: sala.versionDerivada,
      yo: { id: conn.userId, nombre: conn.nombre, color: conn.color, avatar: conn.avatar },
      edita: conn.escribe, lleno: sala.bloqueada,
    });
    // «Dime lo que no tengo» (paso 1 de la sincronización).
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeSyncStep1(enc, sala.doc);
    enviar(conn, encoding.toUint8Array(enc));
    const estados = sala.awareness.getStates();
    if (estados.size) {
      const e2 = encoding.createEncoder();
      encoding.writeVarUint(e2, MSG_AWARENESS);
      encoding.writeVarUint8Array(e2, awarenessProtocol.encodeAwarenessUpdate(sala.awareness, [...estados.keys()]));
      enviar(conn, encoding.toUint8Array(e2));
    }
    // Lo que llegó mientras se cargaba la sala.
    for (const d of cola.splice(0)) alMensaje(conn, d);

    // Cada minuto: ¿sigue la sesión? ¿sigue el permiso?
    conn.timerPermisos = setInterval(() => { void revisarPermisos(conn!); }, T.REVISAR_PERMISOS_MS);
    conn.timerPermisos.unref?.();
  } catch (e: any) {
    console.error('[colab] conectar:', e?.message || e);
    try { ws.close(1011, 'Error del servidor'); } catch { /* ya */ }
  }
}

function soltar(c: Conn) {
  clearInterval(c.timerPermisos);
  const sala = c.sala;
  sala.conns.delete(c);
  if (c.ids.size) awarenessProtocol.removeAwarenessStates(sala.awareness, [...c.ids], null);
  programarDescarga(sala);
}

async function revisarPermisos(c: Conn) {
  try {
    const user = await usuarioDeCookie(db, c.cookie);
    if (!user || user.id !== c.userId) return cerrar(c, 4401, 'La sesión ya no es válida');
    const acceso = await rolEnPagina(db, { id: user.id, nivel: user.roleLevel ?? 0 }, c.sala.id);
    if (!acceso.existe) return cerrar(c, 4404, 'La página ya no existe');
    const caps = capacidades(acceso);
    if (!caps.ver && !await paginaVisible(db, c.sala.id)) return cerrar(c, 4403, 'Ya no tienes acceso a esta página');
    const escribe = caps.editar && !c.sala.bloqueada;
    if (escribe !== c.escribe) { c.escribe = escribe; enviarJSON(c, { t: 'permiso', edita: escribe }); }
  } catch (e: any) { console.error('[colab] revisar permisos:', e?.message || e); }
}

function alMensaje(c: Conn, data: RawData) {
  const bytes = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
  // Ritmo: dos cubos (mensajes y bytes) que se rellenan con el tiempo.
  const ahora = Date.now();
  const dt = (ahora - c.ultimo) / 1000;
  c.ultimo = ahora;
  c.msgs = Math.min(LIMITES.RAFAGA_MSG, c.msgs + dt * LIMITES.RITMO_MSG) - 1;
  c.bytes = Math.min(LIMITES.RAFAGA_BYTES, c.bytes + dt * LIMITES.RITMO_BYTES) - bytes.length;
  if (c.msgs < 0 || c.bytes < 0) return cerrar(c, 1008, 'Demasiados mensajes');
  if (bytes.length > LIMITES.MENSAJE) return cerrar(c, 1009, 'Mensaje demasiado grande');

  const sala = c.sala;
  try {
    const dec = decoding.createDecoder(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length));
    const tipo = decoding.readVarUint(dec);
    if (tipo === MSG_SYNC) {
      const sub = decoding.peekVarUint(dec);
      // sub: 0 = «dime lo que no tengo», 1 = respuesta, 2 = actualización.
      if (sub !== 0) {
        if (!c.escribe) {
          if (ahora - c.avisadoLectura > 5000) { c.avisadoLectura = ahora; enviarJSON(c, { t: 'solo-lectura' }); }
          return;
        }
        if (sala.bloqueada) { enviarJSON(c, { t: 'lleno' }); return; }
      }
      // Se lee a mano (y no con `readSyncMessage`) porque ésa se traga los
      // errores de una actualización mal formada: aquí se cuentan.
      decoding.readVarUint(dec);
      if (sub === 0) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MSG_SYNC);
        syncProtocol.readSyncStep1(dec, enc, sala.doc);
        enviar(c, encoding.toUint8Array(enc));
      } else if (sub === 1 || sub === 2) {
        Y.applyUpdate(sala.doc, decoding.readVarUint8Array(dec), c);
        // Una actualización con huecos (referencias a lo que no existe) se queda
        // «pendiente» en Yjs; si crece, es basura o un ataque.
        const pend = (sala.doc as any).store?.pendingStructs;
        if (pend?.update && pend.update.length > LIMITES.MENSAJE) return cerrar(c, 1007, 'Actualización inválida');
      } else throw new Error('tipo de sincronización desconocido');
    } else if (tipo === MSG_AWARENESS) {
      const limpio = sanearPresencia(c, decoding.readVarUint8Array(dec));
      if (limpio) awarenessProtocol.applyAwarenessUpdate(sala.awareness, limpio, c);
    }
  } catch (e: any) {
    c.invalidos++;
    console.error(`[colab] mensaje no válido de ${c.userId} en ${sala.id}:`, e?.message || e);
    if (c.invalidos >= 3) cerrar(c, 1007, 'Mensajes no válidos');
  }
}

// ── VARIOS PROCESOS: LISTEN/NOTIFY ─────────────────────────────────────────

let escucha: pg.Client | null = null;
let reintento: NodeJS.Timeout | null = null;
let espera = 1000;

function avisarOtrosProcesos(canal: 'colab' | 'colab_aw', carga: Record<string, unknown>) {
  if (!db) return;
  const texto = JSON.stringify(carga);
  if (texto.length > 7500) return;      // un NOTIFY admite 8000 bytes
  db.execute(sql`SELECT pg_notify(${canal}, ${texto})`).catch((e: any) => console.error('[colab] notify:', e?.message || e));
}

function conectarEscucha() {
  if (reintento) { clearTimeout(reintento); reintento = null; }
  const cliente = new pg.Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
    password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
  });
  escucha = cliente;
  cliente.on('error', (e: any) => { console.error('[colab] la escucha se ha caído, reintentando:', e?.message || e); reconectarEscucha(); });
  cliente.on('end', () => reconectarEscucha());
  cliente.on('notification', (aviso: any) => {
    try { void alAviso(aviso.channel, JSON.parse(aviso.payload || '{}')); }
    catch (e: any) { console.error('[colab] aviso ilegible:', e?.message || e); }
  });
  cliente.connect()
    .then(async () => {
      await cliente.query('LISTEN colab');
      await cliente.query('LISTEN colab_aw');
      espera = 1000;
      // Por si se perdió algo mientras estaba caída.
      for (const s of listas.values()) void resincronizar(s);
    })
    .catch((e: any) => { console.error('[colab] no se ha podido escuchar:', e?.message || e); reconectarEscucha(); });
}

function reconectarEscucha() {
  if (reintento) return;
  try { escucha?.removeAllListeners(); escucha?.end?.(); } catch { /* ya */ }
  escucha = null;
  reintento = setTimeout(() => { reintento = null; espera = Math.min(espera * 2, 30_000); conectarEscucha(); }, espera);
  reintento.unref?.();
}

async function alAviso(canal: string, p: any) {
  if (!p || p.o === PROCESO) return;
  const sala = listas.get(p.p);
  if (!sala || sala.cerrada) return;
  if (canal === 'colab_aw' && typeof p.d === 'string') {
    awarenessProtocol.applyAwarenessUpdate(sala.awareness, new Uint8Array(Buffer.from(p.d, 'base64')), 'bd');
  } else if (canal === 'colab' && p.k === 'act') {
    const r = (await db.execute(sql`SELECT actualiz FROM pagina_yjs_actualiz WHERE id = ${Number(p.i)}`)).rows[0] as any;
    // Si ya no está, otro proceso la compactó: se relee todo.
    if (r) Y.applyUpdate(sala.doc, new Uint8Array(r.actualiz), 'bd'); else await resincronizar(sala);
  } else if (canal === 'colab' && p.k === 'der') {
    // Otro proceso derivó: esa versión no es una escritura ajena.
    if (Number(p.v) > sala.versionDerivada) { sala.versionDerivada = Number(p.v); sala.ultimoPlano = leerPlano(sala.doc); }
  }
}

async function resincronizar(sala: Sala) {
  try {
    const f = (await db.execute(sql`SELECT estado FROM pagina_yjs WHERE pagina_id = ${sala.id}`)).rows[0] as any;
    if (f) Y.applyUpdate(sala.doc, new Uint8Array(f.estado), 'bd');
    const ups = (await db.execute(sql`SELECT actualiz FROM pagina_yjs_actualiz WHERE pagina_id = ${sala.id} ORDER BY id`)).rows as any[];
    for (const u of ups) Y.applyUpdate(sala.doc, new Uint8Array(u.actualiz), 'bd');
  } catch (e: any) { console.error(`[colab] resincronizar ${sala.id}:`, e?.message || e); }
}

// ── ARRANQUE ───────────────────────────────────────────────────────────────

/** Para tests y estado: cuánta gente hay en cada sala. */
export function estadoSalas() {
  return [...listas.values()].map(s => ({ pagina: s.id, conexiones: s.conns.size, versionDerivada: s.versionDerivada, bloqueada: s.bloqueada, bloques: s.doc.getArray('orden').length }));
}

export function registrarColab(app: Express, dbx: any) {
  db = dbx;

  // Estado de una sala (quien puede VER la página): sirve para comprobar que
  // todo está en su sitio sin abrir un WebSocket.
  app.get('/api/colab/:id/estado', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Inicia sesión.' });
      const id = String(req.params.id);
      const acceso = await rolEnPagina(db, quienDe(req), id);
      if (!acceso.existe) return res.status(404).json({ error: 'Esa página no existe.' });
      if (!capacidades(acceso).ver) return res.status(403).json({ error: 'No puedes ver esa página.' });
      const sala = listas.get(id);
      const f = (await db.execute(sql`SELECT bytes, version_derivada, compactado_en, (SELECT count(*)::int FROM pagina_yjs_actualiz WHERE pagina_id = ${id}) AS filas FROM pagina_yjs WHERE pagina_id = ${id}`)).rows[0] as any;
      res.json({
        colaborativa: !!f, abierta: !!sala, conexiones: sala?.conns.size ?? 0,
        versionDerivada: sala?.versionDerivada ?? f?.version_derivada ?? null, bytes: f?.bytes ?? null, filasSinCompactar: f?.filas ?? null, proceso: PROCESO,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // El WebSocket cuelga del servidor HTTP, que `server.ts` (congelado) crea con
  // `app.listen`. En vez de tocarlo, se engancha aquí: cuando alguien llame a
  // `app.listen`, el servidor que salga se queda con el `upgrade`.
  const listen = app.listen.bind(app) as any;
  (app as any).listen = (...args: any[]) => {
    const servidor: Server = listen(...args);
    montar(servidor);
    return servidor;
  };
}

/** Engancha el WebSocket a un servidor HTTP (también lo usan las pruebas). */
export function montar(servidor: Server) {
  if (wss) return;
  wss = new WebSocketServer({ noServer: true, maxPayload: LIMITES.MENSAJE, perMessageDeflate: false });
  servidor.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/api/colab/')) {
      // Otro `upgrade` (si lo hubiera) lo atiende; si no hay otro, se cierra.
      if (servidor.listenerCount('upgrade') <= 1) socket.destroy();
      return;
    }
    void alActualizar(req, socket, head);
  });
  conectarEscucha();

  const latido = setInterval(() => {
    for (const s of listas.values()) for (const c of s.conns) {
      if (!c.vivo) { try { c.ws.terminate(); } catch { /* ya */ } continue; }
      c.vivo = false;
      try { c.ws.ping(); } catch { /* ya */ }
    }
  }, T.LATIDO_MS);
  latido.unref?.();
  const ext = setInterval(() => { void vigilarExternos(); }, T.EXTERNO_MS);
  ext.unref?.();

  // Docker para con SIGTERM: lo que esté a medias se guarda antes de salir.
  const despedirse = () => {
    const todo = [...listas.values()].map(s => volcar(s).catch(() => {}));
    Promise.race([Promise.all(todo), new Promise(r => setTimeout(r, 3000))]).finally(() => process.exit(0));
  };
  process.once('SIGTERM', despedirse);
}
