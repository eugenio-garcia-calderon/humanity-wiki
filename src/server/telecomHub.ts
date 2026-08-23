import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { sql } from 'drizzle-orm';

// ============================================================================
// EL CABLE: UNA CONEXIÓN ABIERTA CON CADA APARATO (2026-08-22)
// ============================================================================
// Todo lo que hace falta para que esta plataforma sustituya a WhatsApp —que un
// mensaje aparezca solo, que un teléfono suene, que dos navegadores se pongan
// de acuerdo para verse la cara— necesita LO MISMO: que el servidor pueda
// hablarle a alguien sin que ese alguien lo haya pedido. La web normal no
// funciona así: el navegador pregunta y el servidor contesta.
//
// ── POR QUÉ SSE Y NO WEBSOCKETS ────────────────────────────────────────────
// Un WebSocket sería la respuesta de manual, y no se ha usado. Las razones,
// por orden de peso:
//
//   1. EXIGE TOCAR `server.ts`, QUE ESTÁ CONGELADO. Un WebSocket se engancha
//      al servidor HTTP (`app.listen(...)` devuelve el objeto), no a Express.
//      Eso es una línea más en el fichero prohibido número 8 del CLAUDE.md de
//      la raíz, y el motivo por el que hoy mismo nació la lista de módulos.
//      SSE es una ruta de Express como cualquier otra: entra por la lista y no
//      toca nada de nadie.
//   2. NO AÑADE DEPENDENCIA. `ws` son 40 KB y un paquete más que mantener.
//      SSE es HTTP: `text/event-stream` y escribir en la respuesta.
//   3. ATRAVIESA CLOUDFLARE Y CUALQUIER PROXY. Es una petición GET que no
//      termina. Los WebSockets también pasan, pero cuando no pasan te enteras
//      en producción y no hay dónde mirar.
//
// LO QUE CUESTA: SSE es de una sola dirección. El navegador contesta por
// POST normales (`/api/telecom/senal`). Para señalización eso es de sobra —son
// cuatro mensajes al empezar una llamada y ninguno después—, y para el chat
// también. Si algún día hace falta un canal de subida de verdad (audio por el
// servidor, muchos a la vez), el sitio donde cambiarlo es este fichero y solo
// este.
//
// ── UNA PERSONA SON VARIOS APARATOS ────────────────────────────────────────
// El móvil, el portátil y la pestaña que se dejó abierta en el trabajo. Por eso
// el registro es `persona → conjunto de conexiones`, y por eso cada conexión
// tiene su propio identificador de APARATO. Sin él, una videollamada se rompe
// de una forma preciosa: suenan los tres aparatos, contesta el móvil, y las
// respuestas del protocolo llegan también al portátil, que no sabe nada de esa
// llamada y contesta basura. La señalización va SIEMPRE a un aparato concreto.

// ── Y CUANDO HAYA OCHO PROCESOS (2026-08-23) ────────────────────────────────
// Este fichero guardaba los cables en un `Map` de la memoria del proceso. Con
// un proceso —lo de hoy— es perfecto. El día que la plataforma se reparta entre
// los ocho núcleos de la máquina, cada proceso conoce **solo sus propios
// cables**, y eso no se rompe con un error: se rompe callado.
//
// Ana tiene el cable en el proceso 3. Bea le escribe y su petición cae en el 6.
// El 6 no ha oído hablar de Ana. Sin error, sin registro: el mensaje no llega y
// el teléfono no suena. **Siete de cada ocho veces.**
//
// Lo encontró prog6 preparando el reparto entre núcleos, y paró su trabajo en
// vez de tocar este fichero.
//
// ── SON DOS PREGUNTAS DISTINTAS, Y SOLO UNA ES DE ENTREGA ───────────────────
//
//   «Llévale esto a Ana»   → ENTREGAR. Se resuelve con `LISTEN`/`NOTIFY`: el
//                            proceso que recibe la petición lo grita y el que
//                            tiene el cable de Ana se lo entrega.
//   «¿Está Ana?»           → SABER. Se pregunta ANTES, de forma síncrona, y de
//                            su respuesta depende que una llamada llegue a
//                            sonar. Un aviso no contesta preguntas: se manda y
//                            no se sabe si había alguien escuchando.
//
// Por eso hay dos piezas: los avisos para lo primero y la tabla
// `conexiones_vivas` para lo segundo. Con una sola, la mitad sigue rota.
//
// ── LO QUE NO CAMBIA CON UN SOLO PROCESO ────────────────────────────────────
// Todo. La entrega local sigue siendo el camino corto y no pasa por ninguna
// parte; los avisos solo salen cuando la persona tiene aparatos EN OTRO SITIO.
// Hoy eso no ocurre nunca, así que hoy esto no cuesta nada.

export interface Conexion {
  /** El aparato. Nace con la conexión y muere con ella. */
  dispositivo: string;
  userId: string;
  res: Response;
  desde: number;
}

/** persona → sus aparatos conectados ahora mismo. */
const porUsuario = new Map<string, Map<string, Conexion>>();


// ════════════════════════════════════════════════════════════════════════════
// EL CABLE ENTRE PROCESOS
// ════════════════════════════════════════════════════════════════════════════

/** Quién soy yo, para no entregarme a mí mismo lo que yo mismo he gritado. */
const PROCESO = `${process.pid}-${randomUUID().slice(0, 8)}`;

/** El canal por el que se gritan los eventos. Uno solo, y a propósito.
 *
 *  Se podría dar un canal a cada proceso y hablarle solo al que tiene el cable,
 *  pero para eso hay que saber cuál es y mantenerlo al día. Con ocho procesos,
 *  gritar a todos son siete despertares de más por mensaje: nada, comparado con
 *  la complicación de acertar siempre con el destinatario. */
const CANAL = 'telecom_cable';

/** El tope del payload de NOTIFY son 8000 bytes y pasarse no trunca: revienta.
 *  Se deja margen para el envoltorio JSON. */
const TOPE_AVISO = 7000;

/** Una fila de `conexiones_vivas` sin refrescar más de esto es de un proceso
 *  muerto. Dos latidos y pico: uno perdido no descuelga a nadie. */
const CADUCA_S = 70;

/** Cada cuánto se relee quién está conectado en el resto de procesos. */
const REFRESCO_PRESENCIA_MS = 10_000;

type Sobre = {
  /** Quién lo grita. Si soy yo, lo ignoro: ya lo he entregado en local. */
  o: string;
  /** A todos sus aparatos, a uno concreto, o a todos menos uno. */
  k: 'todos' | 'aparato' | 'resto';
  u: string;
  d?: string;
  /** El evento, si cabía en el aviso. */
  e?: Evento;
  /** O el número de fila en `eventos_grandes`, si no cabía. */
  g?: number;
};

let db: any = null;
let escucha: pg.Client | null = null;
let reintentoEscucha: NodeJS.Timeout | null = null;

/** persona → cuántos aparatos tiene conectados EN TODA LA PLATAFORMA.
 *
 *  Se relee de la tabla cada diez segundos y se corrige a mano en el momento en
 *  que alguien se conecta o se va de ESTE proceso. Es una caché, y como toda
 *  caché puede ir diez segundos por detrás de la verdad para los aparatos de
 *  otros procesos. Se acepta: lo que se decide con ella es si un teléfono suena
 *  —y si suena en un aparato que acaba de irse, no pasa nada— y el puntito
 *  verde de «está en línea», que ya era aproximado antes de esto. */
const presencia = new Map<string, number>();

const cuentaLocal = (userId: string) => porUsuario.get(userId)?.size ?? 0;

/**
 * Arranca el cable entre procesos. Se llama una vez, al levantar el servidor.
 *
 * SI ESTO NO SE LLAMA, TODO SIGUE FUNCIONANDO con un proceso: la entrega local
 * no depende de nada de aquí. Es la razón por la que este arranque puede fallar
 * sin tumbar la plataforma — se pierde el cruce entre procesos, que es lo que
 * hoy no se usa, y se dice en el registro.
 */
export function arrancarCable(conexionDb: any) {
  db = conexionDb;
  conectarEscucha();
  // La presencia se relee entera cada diez segundos. Es una consulta a una
  // tabla de unas pocas filas; la alternativa —fiarse solo de los avisos— deja
  // a un proceso recién arrancado creyendo que no hay nadie conectado.
  const t = setInterval(() => { void releerPresencia(); }, REFRESCO_PRESENCIA_MS);
  t.unref?.();
  void releerPresencia();

  // Limpieza de lo que dejaron los muertos. No es lo que da la corrección —eso
  // lo da el filtro por `visto_at` en cada lectura— sino que la tabla no crezca
  // con las filas de cada despliegue.
  // ── AL APAGARSE, BORRAR LAS PROPIAS FILAS ─────────────────────────────────
  // Un despliegue para el contenedor viejo y levanta el nuevo. Sin esto, las
  // filas del viejo siguen vivas hasta 70 segundos, y durante ese rato la
  // plataforma cree que hay gente conectada por cables que ya no existen: un
  // mensaje se marcaría como entregado sin haberlo sido. Con `SIGTERM` —que es
  // lo que manda Docker— la ventana se cierra del todo. El apagón bruto lo
  // sigue cubriendo el filtro por `visto_at`, que es la red de seguridad.
  const despedirse = () => {
    try { escucha?.end?.(); } catch { /* da igual, nos vamos */ }
    db?.execute(sql`DELETE FROM conexiones_vivas WHERE proceso = ${PROCESO}`).catch(() => {});
  };
  process.once('SIGTERM', despedirse);
  process.once('SIGINT', despedirse);

  const barrido = setInterval(() => {
    db?.execute(sql`DELETE FROM conexiones_vivas WHERE visto_at < now() - interval '5 minutes'`)
      .catch(() => { /* la limpieza puede esperar al siguiente barrido */ });
    db?.execute(sql`DELETE FROM eventos_grandes WHERE creado_at < now() - interval '2 minutes'`)
      .catch(() => {});
  }, 60_000);
  barrido.unref?.();
}

/**
 * La conexión que escucha. Es SUYA y no del pool.
 *
 * Un `LISTEN` vive en una conexión concreta: si se coge del pool, en cuanto se
 * devuelve y se recicla, el `LISTEN` se pierde y **nadie se entera**. El cable
 * entre procesos dejaría de funcionar exactamente igual que si no existiera:
 * sin error y sin registro, que es el fallo que este fichero viene a arreglar.
 *
 * Por lo mismo se reconecta sola y lo dice: una escucha caída en silencio es la
 * peor versión de esto.
 */
function conectarEscucha() {
  if (reintentoEscucha) { clearTimeout(reintentoEscucha); reintentoEscucha = null; }
  const cliente = new pg.Client({
    host: process.env.SQL_HOST,
    user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
    password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
  });
  escucha = cliente;

  cliente.on('error', (e: any) => {
    console.error('[cable] la escucha se ha caído, reintentando:', e?.message || e);
    reconectarEscucha();
  });
  cliente.on('end', () => reconectarEscucha());
  cliente.on('notification', (aviso: any) => {
    try { entregarDeFuera(JSON.parse(aviso.payload || '{}')); }
    catch (e: any) { console.error('[cable] aviso ilegible:', e?.message || e); }
  });

  cliente.connect()
    .then(() => cliente.query(`LISTEN ${CANAL}`))
    .catch((e: any) => {
      console.error('[cable] no se ha podido escuchar:', e?.message || e);
      reconectarEscucha();
    });
}

let esperaReconexion = 1000;
function reconectarEscucha() {
  if (reintentoEscucha) return;
  try { escucha?.removeAllListeners(); escucha?.end?.(); } catch { /* ya estaba */ }
  escucha = null;
  reintentoEscucha = setTimeout(() => {
    reintentoEscucha = null;
    esperaReconexion = Math.min(esperaReconexion * 2, 30_000);
    conectarEscucha();
  }, esperaReconexion);
  reintentoEscucha.unref?.();
}

/** Releer quién está conectado, en todos los procesos. */
async function releerPresencia() {
  if (!db) return;
  try {
    const r = await db.execute(sql`
      SELECT user_id, count(*)::int AS n FROM conexiones_vivas
      WHERE visto_at > now() - (${CADUCA_S} || ' seconds')::interval
      GROUP BY user_id
    `);
    presencia.clear();
    for (const f of r.rows as any[]) presencia.set(String(f.user_id), f.n);
    // Los míos, por si la tabla va por detrás de lo que acaba de pasar aquí.
    for (const [userId, aparatos] of porUsuario) {
      presencia.set(userId, Math.max(presencia.get(userId) ?? 0, aparatos.size));
    }
  } catch (e: any) {
    // NO SE VACÍA LA CACHÉ SI LA CONSULTA FALLA. Vaciarla diría «no hay nadie
    // conectado», que es una respuesta peor que una de hace diez segundos: con
    // ella, ninguna llamada sonaría en toda la plataforma.
    console.error('[cable] no se ha podido releer la presencia:', e?.message || e);
  }
}

/** Lo que llega de otro proceso. */
function entregarDeFuera(s: Sobre) {
  if (!s || s.o === PROCESO) return;
  // Si esta persona no tiene ningún cable AQUÍ, esto no es para mí. Se sale
  // antes de tocar la base de datos: con ocho procesos, siete salen por aquí.
  if (!porUsuario.has(s.u)) return;

  if (s.e) { repartirEnLocal(s, s.e); return; }
  if (typeof s.g !== 'number' || !db) return;

  // Un evento grande. NO se borra al leerlo: si la persona tiene aparatos en
  // dos procesos, los dos tienen que poder leerlo. Lo borra el barrido.
  db.execute(sql`SELECT evento FROM eventos_grandes WHERE id = ${s.g}`)
    .then((r: any) => {
      const e = r.rows[0]?.evento;
      if (e) repartirEnLocal(s, e as Evento);
    })
    .catch((err: any) => console.error('[cable] no se ha podido leer un evento grande:', err?.message || err));
}

function repartirEnLocal(s: Sobre, evento: Evento) {
  if (s.k === 'aparato' && s.d) repartoLocalAlDispositivo(s.u, s.d, evento);
  else if (s.k === 'resto' && s.d) repartoLocalAlResto(s.u, s.d, evento);
  else repartoLocalATodos(s.u, evento);
}

/**
 * Gritarlo para que lo oigan los demás procesos.
 *
 * NO LANZA NUNCA. Si el aviso no sale, lo que se pierde es la entrega a otros
 * procesos; la local ya se ha hecho. Que falle esto no puede tumbar el envío de
 * un mensaje.
 */
function gritar(s: Sobre) {
  if (!db) return;
  const texto = JSON.stringify(s);
  const mandar = (carga: string) =>
    db.execute(sql`SELECT pg_notify(${CANAL}, ${carga})`)
      .catch((e: any) => console.error('[cable] no se ha podido avisar:', e?.message || e));

  if (Buffer.byteLength(texto, 'utf8') <= TOPE_AVISO) { void mandar(texto); return; }

  // No cabe. Casi nada llega aquí —un mensaje de chat cabe de sobra— pero una
  // oferta de WebRTC con muchas candidatas sí, y perder justo esa es quedarse
  // sin llamada.
  const { e, ...sobre } = s;
  db.execute(sql`INSERT INTO eventos_grandes (para, evento) VALUES (${s.u}, ${JSON.stringify(e)}::jsonb) RETURNING id`)
    .then((r: any) => mandar(JSON.stringify({ ...sobre, g: Number(r.rows[0].id) })))
    .catch((err: any) => console.error('[cable] no se ha podido guardar un evento grande:', err?.message || err));
}

/** ¿Tiene esta persona aparatos en OTRO proceso? Si no, no hay a quién gritar. */
const hayFuera = (userId: string) => (presencia.get(userId) ?? 0) > cuentaLocal(userId);

/** Lo que se le manda a un aparato. `tipo` es lo único obligatorio. */
export type Evento = { tipo: string; [clave: string]: any };

/**
 * Escribe un evento en una conexión.
 *
 * SI FALLA, NO SE PROPAGA. Una conexión rota es lo más normal del mundo —se
 * cierra el portátil, se va el metro— y un error escribiendo en ella no puede
 * tumbar el envío de un mensaje ni una llamada en curso. Se devuelve `false` y
 * quien llama decide; aquí se limpia y ya está.
 */
function escribir(c: Conexion, evento: Evento): boolean {
  try {
    c.res.write(`data: ${JSON.stringify(evento)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Registra una conexión. Devuelve el identificador del aparato y la función
 * para soltarla, que quien la abre DEBE llamar en el `close` de la petición.
 */
export function apuntar(userId: string, res: Response): { dispositivo: string; soltar: () => void } {
  const dispositivo = randomUUID();
  const c: Conexion = { dispositivo, userId, res, desde: Date.now() };
  let aparatos = porUsuario.get(userId);
  if (!aparatos) { aparatos = new Map(); porUsuario.set(userId, aparatos); }
  aparatos.set(dispositivo, c);

  // Y en la tabla, para que los demás procesos sepan que esta persona está.
  // Si esto falla, el cable local funciona igual: lo que se pierde es que otro
  // proceso pueda encontrarla, y eso no puede impedirle conectarse.
  presencia.set(userId, (presencia.get(userId) ?? 0) + 1);
  db?.execute(sql`
    INSERT INTO conexiones_vivas (dispositivo, user_id, proceso)
    VALUES (${dispositivo}, ${userId}, ${PROCESO})
    ON CONFLICT (dispositivo) DO UPDATE SET visto_at = now()
  `).catch((e: any) => console.error('[cable] no se ha podido apuntar la conexión:', e?.message || e));

  const soltar = () => {
    const m = porUsuario.get(userId);
    if (!m) return;
    m.delete(dispositivo);
    // Sin aparatos no se deja el hueco puesto: con el tiempo, el mapa serían
    // todas las personas que han entrado alguna vez.
    if (m.size === 0) porUsuario.delete(userId);
    presencia.set(userId, Math.max(0, (presencia.get(userId) ?? 1) - 1));
    if ((presencia.get(userId) ?? 0) === 0) presencia.delete(userId);
    db?.execute(sql`DELETE FROM conexiones_vivas WHERE dispositivo = ${dispositivo}`)
      .catch(() => { /* si no se borra, el filtro por `visto_at` la tumba en 70 s */ });
  };

  return { dispositivo, soltar };
}

/**
 * Manda un evento a TODOS los aparatos de una persona. Devuelve a cuántos ha
 * llegado — 0 significa «no está conectada», y eso es una respuesta útil: es
 * la diferencia entre una llamada que suena y una que ni siquiera empieza.
 */
export function enviarA(userId: string, evento: Evento): number {
  const llegaron = repartoLocalATodos(userId, evento);
  if (hayFuera(userId)) gritar({ o: PROCESO, k: 'todos', u: userId, e: evento });
  // SE CUENTAN TAMBIÉN LOS DE FUERA, y es deliberado. Quien llama a esto usa el
  // número como «¿había alguien?», y de esa respuesta depende que una llamada
  // llegue a sonar. Decir 0 porque los aparatos de esa persona están en otro
  // proceso sería exactamente el fallo que este fichero viene a arreglar.
  return Math.max(llegaron, presencia.get(userId) ?? 0);
}

/** El reparto entre los cables que tengo YO. Es el camino corto: no pasa por
 *  ninguna parte y es el único que existe mientras haya un solo proceso. */
function repartoLocalATodos(userId: string, evento: Evento): number {
  const aparatos = porUsuario.get(userId);
  if (!aparatos) return 0;
  let llegaron = 0;
  for (const c of [...aparatos.values()]) {
    if (escribir(c, evento)) llegaron++;
    else aparatos.delete(c.dispositivo);
  }
  if (aparatos.size === 0) porUsuario.delete(userId);
  return llegaron;
}

/** A UN aparato concreto. Es lo que usa la señalización de las llamadas.
 *
 *  DEVUELVE `true` TAMBIÉN CUANDO EL APARATO ESTÁ EN OTRO PROCESO, y ahí el
 *  valor pasa a ser «se ha mandado», no «ha llegado». No hay forma de saber lo
 *  segundo sin esperar una confirmación, y la señalización de WebRTC ya tiene
 *  la suya: si la oferta no llega, la llamada no conecta y eso se ve. */
export function enviarAlDispositivo(userId: string, dispositivo: string, evento: Evento): boolean {
  if (repartoLocalAlDispositivo(userId, dispositivo, evento)) return true;
  if (hayFuera(userId)) {
    gritar({ o: PROCESO, k: 'aparato', u: userId, d: dispositivo, e: evento });
    return true;
  }
  return false;
}

function repartoLocalAlDispositivo(userId: string, dispositivo: string, evento: Evento): boolean {
  const c = porUsuario.get(userId)?.get(dispositivo);
  if (!c) return false;
  if (escribir(c, evento)) return true;
  porUsuario.get(userId)?.delete(dispositivo);
  return false;
}

/** A todos los aparatos MENOS uno. Para «ya la he cogido en el móvil». */
export function enviarAlResto(userId: string, exceptoDispositivo: string, evento: Evento): number {
  const llegaron = repartoLocalAlResto(userId, exceptoDispositivo, evento);
  if (hayFuera(userId)) gritar({ o: PROCESO, k: 'resto', u: userId, d: exceptoDispositivo, e: evento });
  return llegaron;
}

function repartoLocalAlResto(userId: string, exceptoDispositivo: string, evento: Evento): number {
  const aparatos = porUsuario.get(userId);
  if (!aparatos) return 0;
  let llegaron = 0;
  for (const c of [...aparatos.values()]) {
    if (c.dispositivo === exceptoDispositivo) continue;
    if (escribir(c, evento)) llegaron++;
    else aparatos.delete(c.dispositivo);
  }
  return llegaron;
}

/** ¿Está esta persona conectada EN CUALQUIER PROCESO?
 *
 *  Mira la caché de presencia, no el mapa local. Con un solo proceso las dos
 *  dicen lo mismo; con ocho, el mapa local diría que no está siete de cada
 *  ocho veces, y entonces su teléfono no sonaría nunca. */
export const estaConectado = (userId: string): boolean =>
  (presencia.get(userId) ?? 0) > 0 || cuentaLocal(userId) > 0;

/** Cuáles de estas personas están conectadas. Para pintar el puntito verde. */
export const conectadosDe = (ids: string[]): string[] => ids.filter(estaConectado);

/** Cuánta gente hay ahora mismo, y con cuántos aparatos. Para la página de servidores. */
/** Cuánta gente hay ahora mismo, y con cuántos aparatos. Sale en
 *  `GET /api/telecom/yo`, así que lo ve cualquiera que abra su Teléfono.
 *
 *  ES EL RECUENTO DE TODA LA PLATAFORMA, no el de este proceso. Contando solo
 *  los cables de aquí, con ocho procesos saldría un octavo de la gente — y
 *  saldría con toda la cara de ser el número bueno, que es lo que lo hace
 *  peligroso. */
export function recuento(): { personas: number; aparatos: number } {
  let aparatos = 0;
  for (const n of presencia.values()) aparatos += n;
  // Los míos mandan sobre la caché: son los únicos que conozco con certeza.
  for (const [userId, m] of porUsuario) {
    const enCache = presencia.get(userId) ?? 0;
    if (m.size > enCache) aparatos += m.size - enCache;
  }
  const personas = new Set([...presencia.keys(), ...porUsuario.keys()]).size;
  return { personas, aparatos };
}

// ── EL LATIDO ───────────────────────────────────────────────────────────────
// UNA CONEXIÓN CALLADA SE MUERE SIN AVISAR. Cloudflare corta a los 100 segundos
// sin datos, y un proxy de empresa mucho antes. Peor: el navegador no siempre
// se entera, así que el aparato cree que sigue escuchando y no le llega nada.
// Cada 25 segundos van dos puntos y un comentario —el formato de SSE para «no
// pasa nada, sigo aquí»—, que el cliente ignora y el proxy cuenta como tráfico.
//
// Es UN temporizador para toda la aplicación, no uno por conexión: con cien
// personas conectadas serían cien temporizadores haciendo lo mismo.
const LATIDO_MS = 25_000;
let latido: NodeJS.Timeout | null = null;

export function arrancarLatido() {
  if (latido) return;
  latido = setInterval(() => {
    for (const [userId, aparatos] of porUsuario) {
      for (const c of [...aparatos.values()]) {
        try { c.res.write(': latido\n\n'); }
        catch { aparatos.delete(c.dispositivo); }
      }
      if (aparatos.size === 0) porUsuario.delete(userId);
    }
    // EL MISMO LATIDO SIRVE PARA LAS DOS COSAS. Los navegadores necesitan
    // tráfico para que ningún proxy corte, y la tabla necesita saber que este
    // proceso sigue vivo: sin este refresco, sus filas caducan a los 70 s y la
    // plataforma daría por desconectada a toda la gente que cuelga de aquí.
    db?.execute(sql`UPDATE conexiones_vivas SET visto_at = now() WHERE proceso = ${PROCESO}`)
      .catch((e: any) => console.error('[cable] no se ha podido refrescar la presencia:', e?.message || e));
  }, LATIDO_MS);
  // No mantiene el proceso vivo por sí solo: si el servidor se está apagando,
  // que se apague.
  latido.unref?.();
}
