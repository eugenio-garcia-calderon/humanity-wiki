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
import { sql } from 'drizzle-orm';

// ══ EL FRENO ════════════════════════════════════════════════════════════════
// Vive en Postgres (tabla `frenos`, migración 0097) y NO en memoria, y eso es
// una corrección de algo que este módulo tuvo mal desde el primer día.
//
// Con un `Map` de un proceso funcionaba — mientras hubiera un proceso. El día
// que el trabajo se reparta entre los ocho núcleos serían ocho frenos
// independientes y el límite real ocho veces el configurado, **sin un error y
// sin una línea en el registro**. Un límite que se afloja en silencio es peor
// que no tenerlo, porque además se cree que está.
//
// Se arregla ahora y no cuando llegue el `cluster`, porque después no se nota.
//
// EL COSTE: una consulta por intento, en el login, el registro, el restablecer
// y las transferencias. Son las rutas menos transitadas de la plataforma, y a
// cambio el freno sobrevive a un reinicio — hasta hoy, un despliegue le
// regalaba a quien estuviera probando contraseñas empezar de cero.
//
// NO CONFUNDIR CON `intentos_fallidos`: aquello es el rastro de lo que pasó y
// no se limpia nunca; esto es cuánto hay que esperar AHORA y se borra solo.

/** Barre los frenos que ya no frenan a nadie. Sin esto, la tabla crecería con
 *  la IP de todo el que se equivocó una vez hace tres meses. */
async function barrer(db: any): Promise<void> {
  try {
    await db.execute(sql`DELETE FROM frenos WHERE actualizado < now() - interval '2 days'`);
  } catch { /* que no se barra hoy no rompe nada */ }
}

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

  // ══ EL BUSCADOR ES DISTINTO A TODOS LOS DEMÁS ═════════════════════════════
  // Desde 2026-08-23 `/api/search` no se llama al pulsar: se llama MIENTRAS SE
  // TECLEA. Y por dentro recorre 20 tablas con `ILIKE '%…%'` en cada llamada,
  // sin pedir sesión.
  //
  // Eso cambia el número, no la idea. Un límite pensado para intentos de
  // contraseña y uno pensado para pulsaciones no se parecen: escribiendo se
  // producen varias llamadas por segundo, y ESO TIENE QUE PASAR. Si el freno
  // muerde a quien escribe, el buscador se siente roto y nadie sabrá por qué.
  //
  // 40 seguidas gratis: una búsqueda larga escrita del tirón no llega ahí. Y a
  // partir de ahí un segundo, lo justo para que un bucle deje de ser gratis sin
  // que una persona real note nada. El tope de 60 s es bajo a propósito: aquí
  // no estamos parando a nadie, estamos quitándole el interés a machacar.
  //
  // POR IP Y NO POR CUENTA: es pública, y la mayoría de quien busca no ha
  // iniciado sesión.
  //
  // Y `abrir` si el limitador no puede decidir: es una lectura. Cerrar el
  // buscador de toda la plataforma porque no se pudo consultar el freno sería
  // cambiar un problema que no existe por uno que sí.
  buscar: { puerta: 'buscar', gracia: 40, baseSegundos: 1, topeSegundos: 60, alFallar: 'abrir' },
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
 *  0 si puede pasar. Mira las DOS claves y manda la más restrictiva.
 *
 *  Si la consulta falla, LANZA. No devuelve 0: «no he podido comprobarlo» y
 *  «puede pasar» son dos cosas distintas, y quien decide qué hacer con la duda
 *  es la regla de la ruta (`alFallar`), no esta función. */
export async function esperaPendiente(db: any, regla: Regla, ip: string, cuenta?: string | null): Promise<number> {
  const claves = [clave(regla.puerta, 'ip', ip), ...(cuenta ? [clave(regla.puerta, 'cuenta', cuenta)] : [])];
  // `IN` con un hueco por clave y no `= ANY($1)`: node-postgres manda un array
  // de JavaScript como texto y Postgres contesta «requires array on right
  // side». Se descubrió probándolo contra una base de verdad — con la base de
  // mentira que tenía antes, esto habría pasado la prueba y fallado en
  // producción.
  const r = await db.execute(sql`
    SELECT COALESCE(MAX(CEIL(EXTRACT(EPOCH FROM (hasta - now()))))::int, 0) AS falta
    FROM frenos
    WHERE clave IN (${sql.join(claves.map((c) => sql`${c}`), sql`, `)}) AND hasta > now()
  `);
  return Math.max(0, Number(r.rows[0]?.falta ?? 0));
}

/** Un intento que salió mal: sube el freno de las dos claves y deja constancia.
 *
 *  El registro en la base de datos va en un `try` propio y NO tumba la petición
 *  si falla: perder una línea del rastro es malo, pero dejar de poder entrar en
 *  la plataforma porque no se pudo escribir una fila de auditoría es peor. Lo
 *  que sí decide `alFallar` es si el intento pasa cuando esto no puede decidir. */
/** Sube el freno de las dos claves. Común a `anotarFallo` y a `ritmo`.
 *
 *  El cálculo de la espera se hace EN LA BASE DE DATOS, en el mismo `UPDATE`
 *  que incrementa el contador. Leer, calcular y escribir por separado sería una
 *  carrera: dos procesos leyendo «llevas 3» a la vez escribirían los dos «4», y
 *  el atacante se llevaría un intento gratis por cada proceso. */
async function subirFreno(db: any, regla: Regla, ip: string, cuenta?: string | null): Promise<void> {
  const claves = [clave(regla.puerta, 'ip', ip), ...(cuenta ? [clave(regla.puerta, 'cuenta', cuenta)] : [])];
  for (const k of claves) {
    await db.execute(sql`
      INSERT INTO frenos (clave, fallos, hasta, actualizado)
      VALUES (${k}, 1, NULL, now())
      ON CONFLICT (clave) DO UPDATE SET
        fallos = frenos.fallos + 1,
        -- LOS ::int NO SON DECORACIÓN. Sin ellos los parámetros llegan como
        -- texto y LEAST('5','900') compara CADENAS: '5' es mayor que '900'
        -- letra a letra, así que devolvía siempre el tope y el primer fallo ya
        -- frenaba 15 minutos. Salió al probar contra una base de verdad; con
        -- una de mentira habría pasado la prueba y roto el login en producción.
        hasta = CASE
          WHEN frenos.fallos + 1 > ${regla.gracia}::int
          THEN now() + (LEAST(
                 ${regla.baseSegundos}::int * POWER(2, frenos.fallos + 1 - ${regla.gracia}::int - 1),
                 ${regla.topeSegundos}::int
               ) || ' seconds')::interval
          ELSE frenos.hasta END,
        actualizado = now()
    `);
  }
}

/** Un intento que salió mal: sube el freno de las dos claves y deja constancia.
 *
 *  El registro en `intentos_fallidos` va en su propio `try` y NO tumba la
 *  petición si falla: perder una línea del rastro es malo, pero dejar de poder
 *  entrar en la plataforma porque no se pudo escribir una fila de auditoría es
 *  peor. Lo que sí decide `alFallar` es si el intento pasa cuando el guardián
 *  no puede decidir. */
export async function anotarFallo(
  db: any, regla: Regla, ip: string,
  cuenta?: string | null, cuentaExiste?: boolean | null,
): Promise<void> {
  try {
    await subirFreno(db, regla, ip, cuenta);
  } catch (e: any) {
    console.error('[limites] no se pudo subir el freno:', e?.message || e);
  }
  try {
    await db.execute(sql`
      INSERT INTO intentos_fallidos (puerta, cuenta, cuenta_existe, ip)
      VALUES (${regla.puerta}, ${cuenta || null}, ${cuentaExiste ?? null}, ${ip})
    `);
  } catch (e: any) {
    // A la vista en el registro del servidor: un rastro que deja de escribirse
    // en silencio es lo mismo que no tenerlo.
    console.error('[limites] no se pudo anotar el intento fallido:', e?.message || e);
  }
  // De vez en cuando, y sin esperar a que termine: barrer no es urgente.
  if (Math.random() < 0.02) void barrer(db);
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
 *  Se puede llamar sin `await`: no lanza nunca. */
export async function ritmo(db: any, regla: Regla, ip: string, cuenta?: string | null): Promise<void> {
  try {
    await subirFreno(db, regla, ip, cuenta);
  } catch (e: any) {
    console.error('[limites] no se pudo subir el freno de ritmo:', e?.message || e);
  }
}

/** Salió bien: se levanta EL FRENO, y solo el freno.
 *
 *  `intentos_fallidos` NO SE TOCA. Es la regla 4, y es la que hace que el
 *  ataque que tuvo éxito siga viéndose después.
 *
 *  Se puede llamar sin `await`: no lanza nunca. */
export async function levantarFreno(db: any, regla: Regla, ip: string, cuenta?: string | null): Promise<void> {
  try {
    const claves = [clave(regla.puerta, 'ip', ip), ...(cuenta ? [clave(regla.puerta, 'cuenta', cuenta)] : [])];
    await db.execute(sql`DELETE FROM frenos WHERE clave IN (${sql.join(claves.map((c) => sql`${c}`), sql`, `)})`);
  } catch (e: any) {
    console.error('[limites] no se pudo levantar el freno:', e?.message || e);
  }
}

/** El guardián para poner delante de una ruta.
 *
 *  Contesta 429 con `Retry-After`, que es la cabecera que el navegador y
 *  cualquier cliente entienden, y un mensaje en castellano para la persona.
 *  Quien llama tiene que avisar después con `anotarFallo` o `levantarFreno`:
 *  esto no sabe si la contraseña era buena. */
export function guardian(db: any, regla: Regla, cuentaDe: (req: Request) => string | null | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const espera = await esperaPendiente(db, regla, ipDe(req), cuentaDe(req));
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
