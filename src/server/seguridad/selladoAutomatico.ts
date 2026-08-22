// ============================================================================
// SELLAR SOLO, CADA POCOS MINUTOS (fase B, 2026-08-22)
// ============================================================================
// El disparador de `drizzle/0085_registro_captura.sql` deja una nota por cada
// cambio en `registro_pendiente`. Si nadie las recoge, esa tabla **solo crece**.
//
// Por eso la captura y esto salen JUNTOS y no por separado: poner los
// disparadores sin nada que vacíe el buzón es dejar encendido un grifo con el
// desagüe tapado, y el día que alguien se dé cuenta será porque el disco está
// lleno.
//
// ── POR QUÉ DENTRO DEL SERVIDOR Y NO EN UN CRON ────────────────────────────
// Lo natural sería un temporizador del sistema. Se descartó por una razón
// medida: en producción la aplicación va empaquetada (`dist/server.cjs`) y
// `tsx` no está instalado, así que un programa suelto que importe TypeScript
// **no arranca ahí**. Lo comprobé antes de escribirlo.
//
// Dentro del proceso funciona, y el modo de fallo es benigno: si el servidor
// está caído no se sella nada — y tampoco se está escribiendo nada, porque
// quien escribe es él. Lo que quede sin sellar se sella en el siguiente
// arranque, que es lo primero que hace esto.
//
// El riesgo conocido de un temporizador en un contenedor que se reinicia a
// diario (lo aprendió prog7 con su cuadre de saldos: 24 h no suenan nunca) aquí
// no aplica, porque el intervalo es de minutos y **además se ejecuta al
// arrancar**.
import { sellarPendientes } from './sellar.js';

/** Cada cuánto se vacía el buzón.
 *
 *  Dos minutos es el ancho de la ventana en la que un cambio existe capturado
 *  pero todavía no encadenado — el hueco que reconocí al Programador 7 cuando
 *  hablamos de transferencias. Bajarlo cuesta consultas; subirlo ensancha esa
 *  ventana. Dos es un punto medio, no una constante sagrada: si el buzón se
 *  llena más rápido de lo que se vacía, se baja. */
const CADA_MS = 2 * 60 * 1000;

/** Cuántas notas por pasada. La cadena es serie: encadenar 10.000 de golpe
 *  tras un atraso bloquearía la conexión un buen rato. Se sellan por tandas y
 *  se vuelve a la siguiente pasada. */
const POR_TANDA = 200;

export function registrarSelladoAutomatico(_app: unknown, db: any) {
  let corriendo = false;

  const pasada = async () => {
    // Sin solaparse: si una tanda tarda más que el intervalo, la siguiente
    // espera. Dos selladores a la vez chocarían en el índice de `huella_previa`
    // y se pasarían el rato reintentando el uno contra el otro.
    if (corriendo) return;
    corriendo = true;
    try {
      const r = await sellarPendientes(db, POR_TANDA);
      if (r.sellados) {
        console.log(`[registro] selladas ${r.sellados} anotación(es)` +
          (r.huecos ? ` · ⚠ ${r.huecos} hueco(s) en el buzón` : ''));
      }
      if (r.huecos) {
        // Un hueco significa que alguien borró notas del buzón antes de que se
        // sellaran. Queda anotado en el registro con su clase, pero también se
        // dice aquí: es de las pocas cosas que merecen mirarse el mismo día.
        console.warn(`[registro] ⚠ ${r.huecos} hueco(s): faltan notas del buzón que nadie ha sellado. ` +
          'Están anotadas en el registro sellado como clase «hueco».');
      }
    } catch (e: any) {
      // Fallar sellando no puede tumbar el servidor: quien escribe sigue
      // escribiendo y el buzón guarda las notas hasta la siguiente pasada.
      console.error('[registro] no se ha podido sellar esta vez:', e?.message || e);
    } finally {
      corriendo = false;
    }
  };

  // Al arrancar, lo primero: recoge lo que quedara de antes del reinicio.
  pasada();
  const reloj = setInterval(pasada, CADA_MS);
  // No mantiene vivo el proceso por sí mismo: si el servidor se está apagando,
  // que se apague.
  reloj.unref?.();
}
