import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

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

export interface Conexion {
  /** El aparato. Nace con la conexión y muere con ella. */
  dispositivo: string;
  userId: string;
  res: Response;
  desde: number;
}

/** persona → sus aparatos conectados ahora mismo. */
const porUsuario = new Map<string, Map<string, Conexion>>();

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

  const soltar = () => {
    const m = porUsuario.get(userId);
    if (!m) return;
    m.delete(dispositivo);
    // Sin aparatos no se deja el hueco puesto: con el tiempo, el mapa serían
    // todas las personas que han entrado alguna vez.
    if (m.size === 0) porUsuario.delete(userId);
  };

  return { dispositivo, soltar };
}

/**
 * Manda un evento a TODOS los aparatos de una persona. Devuelve a cuántos ha
 * llegado — 0 significa «no está conectada», y eso es una respuesta útil: es
 * la diferencia entre una llamada que suena y una que ni siquiera empieza.
 */
export function enviarA(userId: string, evento: Evento): number {
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

/** A UN aparato concreto. Es lo que usa la señalización de las llamadas. */
export function enviarAlDispositivo(userId: string, dispositivo: string, evento: Evento): boolean {
  const c = porUsuario.get(userId)?.get(dispositivo);
  if (!c) return false;
  if (escribir(c, evento)) return true;
  porUsuario.get(userId)?.delete(dispositivo);
  return false;
}

/** A todos los aparatos MENOS uno. Para «ya la he cogido en el móvil». */
export function enviarAlResto(userId: string, exceptoDispositivo: string, evento: Evento): number {
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

export const estaConectado = (userId: string): boolean => (porUsuario.get(userId)?.size ?? 0) > 0;

/** Cuáles de estas personas están conectadas. Para pintar el puntito verde. */
export const conectadosDe = (ids: string[]): string[] => ids.filter(estaConectado);

/** Cuánta gente hay ahora mismo, y con cuántos aparatos. Para la página de servidores. */
export function recuento(): { personas: number; aparatos: number } {
  let aparatos = 0;
  for (const m of porUsuario.values()) aparatos += m.size;
  return { personas: porUsuario.size, aparatos };
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
  }, LATIDO_MS);
  // No mantiene el proceso vivo por sí solo: si el servidor se está apagando,
  // que se apague.
  latido.unref?.();
}
