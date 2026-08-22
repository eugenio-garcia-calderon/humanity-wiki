// ============================================================================
// LÍMITES DE PETICIONES (2026-08-22, prog6)
// ============================================================================
// `auth.ts` no tenía ninguno: diez contraseñas mal seguidas, diez 401 y ninguna
// traba. Encontrado por prog4. Se podían probar contraseñas sin parar y sin
// ruido, y fabricar enlaces de restablecer en bucle.
//
// Cinco reglas, acordadas con prog4 antes de escribir una línea. Cada una está
// aquí porque sin ella el límite hace daño o no sirve:
//
//   1 · POR CUENTA Y POR IP A LA VEZ. Muchas IP contra una cuenta es robo de
//       credenciales; una IP contra muchas cuentas es rastreo. Quien mire solo
//       una de las dos no ve la otra.
//
//   2 · RETRASO CRECIENTE, NO PUERTA CERRADA. Quien se equivoca de verdad
//       espera unos segundos; quien prueba en serie espera minutos. Una puerta
//       cerrada deja fuera al dueño de la cuenta igual que al atacante.
//
//   3 · QUIEN ACIERTA NO PAGA EL RETRASO DE LOS QUE FALLARON. Sin esto,
//       cualquiera deja fuera de su cuenta a otra persona fallando adrede: el
//       límite se convierte en el ataque.
//
//   4 · DOS CONTADORES, NO UNO (corrección de prog4). El FRENO se limpia al
//       acertar; el REGISTRO DE FALLOS no se limpia nunca. Si fueran el mismo,
//       quien prueba mil contraseñas y acierta la última se llevaría borrado su
//       propio rastro. Regla de la casa: dos verdades distintas no se colapsan
//       en un número.
//
//   5 · FALLAR HACIA UN LADO DECIDIDO, Y POR RUTA. Si esto no puede decidir,
//       en el login se cierra y en una lectura se abre. No hay un valor por
//       defecto que sirva para las dos.
import type { Request, Response, NextFunction } from 'express';

// ══ EL FRENO ════════════════════════════════════════════════════════════════
// En memoria a propósito: se consulta en cada intento y tiene que costar nada.
// Perderlo en un reinicio regala, como mucho, un reinicio de intentos.
//
// ⚠️ CUANDO LLEGUE EL `cluster` ESTO SE PARTE EN OCHO FRENOS INDEPENDIENTES,
// uno por proceso, y el límite real pasa a ser ocho veces el configurado. Hoy
// hay un solo proceso y no es un problema; el día que se reparta el trabajo
// entre los ocho núcleos, este mapa tiene que mudarse a un sitio compartido
// —Postgres o Redis— O el límite hay que dividirlo entre ocho a sabiendas.
// Está escrito también en `CLAUDE.md`, porque es la clase de detalle que se
// descubre en producción.
interface Freno { fallos: number; hasta: number }
const freno = new Map<string, Freno>();

/** Se barre de vez en cuando para que un mapa no crezca sin fin con las IP de
 *  todo el que se equivocó una vez hace tres días. */
function barrer() {
  const ahora = Date.now();
  for (const [k, v] of freno) if (v.hasta < ahora && v.fallos === 0) freno.delete(k);
}
setInterval(barrer, 10 * 60_000).unref();

export interface Regla {
  /** Para qué puerta es: 'login' | 'registro' | 'restablecer'. Se guarda tal cual. */
  puerta: string;
  /** Fallos gratis antes de que empiece el retraso. Equivocarse una vez es normal. */
  gracia: number;
  /** Segundos de espera al primer fallo pasado el margen. Se dobla con cada uno. */
  baseSegundos: number;
  /** Techo, para que el retraso no crezca hasta lo absurdo. */
  topeSegundos: number;
  /** Si esto no puede decidir: 'cerrar' (login) o 'abrir' (una lectura). */
  alFallar: 'cerrar' | 'abrir';
}

export const REGLAS: Record<string, Regla> = {
  // El login: tres fallos gratis, y a partir de ahí 5 s, 10, 20, 40… hasta 15
  // minutos. Con esos números, probar mil contraseñas pasa de tardar segundos a
  // tardar días, y quien se equivoca dos veces no nota nada.
  login:       { puerta: 'login',       gracia: 3, baseSegundos: 5, topeSegundos: 900, alFallar: 'cerrar' },
  // Registrarse y pedir el enlace de restablecer no comprueban ningún secreto,
  // así que aquí «fallo» es «lo has pedido otra vez». Menos gracia y menos
  // castigo: lo que se frena es el bucle, no a la persona.
  registro:    { puerta: 'registro',    gracia: 2, baseSegundos: 10, topeSegundos: 600, alFallar: 'cerrar' },
  restablecer: { puerta: 'restablecer', gracia: 2, baseSegundos: 10, topeSegundos: 600, alFallar: 'cerrar' },
  // Enviar puntos a otra persona (2026-08-23, Programador 7, a sugerencia de
  // prog6): el tope diario de puntos limita CUÁNTO, no CUÁNTAS VECES — cien
  // envíos de un punto caben en el tope y son cien apuntes en un libro que no
  // se limpia. Aquí «fallo» es «has enviado otra vez»: diez envíos seguidos
  // gratis (nadie envía más a mano), y después 20 s, 40, 80… hasta una hora.
  // La clave es la CUENTA, que es lo que de verdad envía.
  transferencia: { puerta: 'transferencia', gracia: 10, baseSegundos: 20, topeSegundos: 3600, alFallar: 'cerrar' },
};

/** La IP de quien pide, con Cloudflare y Caddy delante.
 *
 *  IMPORTA MUCHO ACERTAR AQUÍ: si esto devolviera siempre la IP del proxy,
 *  todo el mundo compartiría freno y el primer torpe dejaría fuera al resto.
 *  `CF-Connecting-IP` la pone Cloudflare y no se puede falsear desde fuera
 *  porque Cloudflare la reescribe; `x-forwarded-for` sí se puede, así que solo
 *  se usa si no hay la otra. */
export function ipDe(req: Request): string {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'desconocida';
}

const clave = (puerta: string, tipo: 'ip' | 'cuenta', valor: string) => `${puerta}:${tipo}:${valor.toLowerCase()}`;

/** ¿Puede intentarlo, o tiene que esperar? Devuelve los segundos que faltan, o
 *  0 si puede pasar. Mira las DOS claves y manda la más restrictiva. */
export function esperaPendiente(regla: Regla, ip: string, cuenta?: string | null): number {
  const ahora = Date.now();
  let falta = 0;
  for (const k of [clave(regla.puerta, 'ip', ip), ...(cuenta ? [clave(regla.puerta, 'cuenta', cuenta)] : [])]) {
    const f = freno.get(k);
    if (f && f.hasta > ahora) falta = Math.max(falta, Math.ceil((f.hasta - ahora) / 1000));
  }
  return falta;
}

/** Un intento que salió mal: sube el freno de las dos claves y deja constancia.
 *
 *  El registro en la base de datos va en un `try` propio y NO tumba la petición
 *  si falla: perder una línea del rastro es malo, pero dejar de poder entrar en
 *  la plataforma porque no se pudo escribir una fila de auditoría es peor. Lo
 *  que sí decide `alFallar` es si el intento pasa cuando esto no puede decidir. */
export async function anotarFallo(
  db: any, regla: Regla, ip: string,
  cuenta?: string | null, cuentaExiste?: boolean | null,
): Promise<void> {
  const ahora = Date.now();
  for (const k of [clave(regla.puerta, 'ip', ip), ...(cuenta ? [clave(regla.puerta, 'cuenta', cuenta)] : [])]) {
    const f = freno.get(k) || { fallos: 0, hasta: 0 };
    f.fallos += 1;
    if (f.fallos > regla.gracia) {
      const segundos = Math.min(regla.baseSegundos * 2 ** (f.fallos - regla.gracia - 1), regla.topeSegundos);
      f.hasta = ahora + segundos * 1000;
    }
    freno.set(k, f);
  }
  try {
    const { sql } = await import('drizzle-orm');
    await db.execute(sql`
      INSERT INTO intentos_fallidos (puerta, cuenta, cuenta_existe, ip)
      VALUES (${regla.puerta}, ${cuenta || null}, ${cuentaExiste ?? null}, ${ip})
    `);
  } catch (e: any) {
    // A la vista en el registro del servidor: un rastro que deja de escribirse
    // en silencio es lo mismo que no tenerlo.
    console.error('[limites] no se pudo anotar el intento fallido:', e?.message || e);
  }
}

/** Un intento que salió BIEN pero cuenta para el ritmo: sube el freno y NO
 *  escribe nada en `intentos_fallidos`.
 *
 *  ══ POR QUÉ EXISTE, Y ES UNA CORRECCIÓN DE PROG7 ═══════════════════════════
 *  Este módulo nació para el login, donde «frenar» y «fallar» son lo mismo: se
 *  frena a quien se equivoca. Pero un límite de RITMO es otra cosa — enviar
 *  puntos once veces seguidas no es un fallo, es que nadie hace eso a mano.
 *
 *  Con solo `anotarFallo` había que elegir entre dos cosas malas: no frenar el
 *  ritmo, o meter actividad legítima en `intentos_fallidos`. Lo segundo es peor
 *  de lo que parece: esa tabla es el rastro de los ataques, y llenarla de
 *  transferencias correctas es exactamente cómo se entierra la línea que
 *  importa. Anotar lo normal es cómo lo raro pasa desapercibido.
 *
 *  Así que se separan las dos verdades, que es la regla de la casa:
 *    · `anotarFallo` — algo salió mal. Frena Y deja rastro.
 *    · `ritmo`       — algo salió bien pero va demasiado rápido. Solo frena.
 *
 *  El freno no distingue: para él son lo mismo. Lo que cambia es qué queda
 *  escrito, y eso es lo que alguien va a leer dentro de seis meses. */
export function ritmo(regla: Regla, ip: string, cuenta?: string | null): void {
  const ahora = Date.now();
  for (const k of [clave(regla.puerta, 'ip', ip), ...(cuenta ? [clave(regla.puerta, 'cuenta', cuenta)] : [])]) {
    const f = freno.get(k) || { fallos: 0, hasta: 0 };
    f.fallos += 1;
    if (f.fallos > regla.gracia) {
      const segundos = Math.min(regla.baseSegundos * 2 ** (f.fallos - regla.gracia - 1), regla.topeSegundos);
      f.hasta = ahora + segundos * 1000;
    }
    freno.set(k, f);
  }
}

/** Salió bien: se levanta EL FRENO, y solo el freno.
 *
 *  `intentos_fallidos` NO SE TOCA. Es la regla 4, y es la que hace que el
 *  ataque que tuvo éxito siga viéndose después. */
export function levantarFreno(regla: Regla, ip: string, cuenta?: string | null): void {
  freno.delete(clave(regla.puerta, 'ip', ip));
  if (cuenta) freno.delete(clave(regla.puerta, 'cuenta', cuenta));
}

/** El guardián para poner delante de una ruta.
 *
 *  Contesta 429 con `Retry-After`, que es la cabecera que el navegador y
 *  cualquier cliente entienden, y un mensaje en castellano para la persona.
 *  Quien llama tiene que avisar después con `anotarFallo` o `levantarFreno`:
 *  esto no sabe si la contraseña era buena. */
export function guardian(regla: Regla, cuentaDe: (req: Request) => string | null | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const espera = esperaPendiente(regla, ipDe(req), cuentaDe(req));
      if (espera > 0) {
        res.setHeader('Retry-After', String(espera));
        return res.status(429).json({
          error: espera < 60
            ? `Demasiados intentos. Prueba en ${espera} segundos.`
            : `Demasiados intentos. Prueba en ${Math.ceil(espera / 60)} minutos.`,
          espera,
        });
      }
      next();
    } catch (e: any) {
      console.error('[limites] guardián roto:', e?.message || e);
      // Regla 5: si esto no puede decidir, lo decide la ruta y no un valor por
      // defecto cómodo. Dejar pasar «porque el limitador está roto» es cómo un
      // fallo del limitador se convierte en la puerta abierta.
      if (regla.alFallar === 'cerrar') {
        return res.status(503).json({ error: 'No se puede comprobar el límite de intentos. Prueba en un momento.' });
      }
      next();
    }
  };
}

/**
 * Alguien pidió que le borraran la cuenta: se le quita el nombre del rastro.
 *
 * ══ POR QUÉ EXISTE ESTO (2026-08-22, aviso de prog1) ═════════════════════════
 * `intentos_fallidos` guarda el correo en claro, porque sin él no se puede
 * responder «¿atacaron esta cuenta?», que es para lo que existe la tabla. Pero
 * el borrado de cuenta vacía la fila de `users` a los 15 días, y **el correo
 * seguiría aquí para siempre**: una persona que pidió ser olvidada, y no lo fue
 * del todo. Desde que hay copias diarias, además, eso sale del servidor todas
 * las noches.
 *
 * SE BORRA EL NOMBRE, NO LA FILA. La IP, la fecha y el recuento se quedan:
 * «cuántos intentos vinieron de esa IP» sigue siendo la señal de un ataque y no
 * es de nadie en particular. Lo que se pierde es poder decir a qué cuenta
 * apuntaban — de una cuenta que ya no existe.
 *
 * Se llama desde el borrado DEFINITIVO, no al pedirlo: durante los 15 días la
 * persona puede volver, y entonces su rastro tiene que seguir entero.
 */
export async function olvidarCuenta(db: any, correo: string): Promise<number> {
  const { sql } = await import('drizzle-orm');
  const r = await db.execute(sql`
    UPDATE intentos_fallidos SET cuenta = NULL
    WHERE lower(cuenta) = ${String(correo).trim().toLowerCase()}
  `);
  return r.rowCount ?? 0;
}
