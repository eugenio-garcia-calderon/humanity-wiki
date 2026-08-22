// ============================================================================
// DOS DEDOS EN EL TRACKPAD PARA IR ATRÁS Y ADELANTE (2026-08-20, petición de
// Eugenio: «si deslizo dos dedos en el pad, la ventana pase de izquierda a
// derecha, según la dirección del deslizamiento»).
// ============================================================================
// Un deslizamiento de dos dedos NO es un evento propio del navegador: llega
// como una ráfaga de eventos de rueda con `deltaX`. Así que hay que juntarlos
// y decidir cuándo eso ha sido «un gesto» y no un simple desplazamiento.
//
// Sentido, el mismo que en Chrome y Safari:
//   · dos dedos hacia la DERECHA → deltaX negativo → ATRÁS
//   · dos dedos hacia la IZQUIERDA → deltaX positivo → ADELANTE
//
// TRES REGLAS QUE EVITAN LOS FALSOS POSITIVOS, y las tres nacen de un problema
// real que tendría el gesto sin ellas:
//
//  1. Si el gesto EMPIEZA vertical, es un scroll y se queda en scroll aunque
//     luego se tuerza. Sin esto, bajar por una página con el dedo un poco
//     inclinado te mandaba a la página anterior.
//  2. Si debajo del cursor hay algo que se desplaza a lo ancho —una tabla, una
//     fila de tarjetas— y todavía le queda recorrido, manda ello. Mover una
//     tabla ancha no es querer cambiar de página.
//  3. Un gesto dispara UNA sola vez. Después del deslizamiento el trackpad
//     sigue mandando eventos por inercia durante un segundo largo; sin el
//     cierre, un gesto retrocedería tres o cuatro páginas de golpe.

/** Hacia dónde va el salto. */
export type Sentido = 'atras' | 'adelante';

/** Cuánto hay que deslizar para que cuente. Medido en píxeles acumulados: por
 *  debajo de esto entran los roces al desplazarse en vertical. */
const UMBRAL = 110;

/** Cuánto silencio cierra un gesto y permite empezar otro. */
const PAUSA = 250;

/** ¿Hay algo bajo el cursor que se pueda desplazar a lo ancho y le quede
 *  recorrido hacia ese lado? Entonces el deslizamiento es suyo, no nuestro. */
function loCogeOtro(destino: EventTarget | null, dx: number): boolean {
  let el = destino instanceof Element ? destino : null;
  while (el) {
    const desborde = getComputedStyle(el).overflowX;
    if ((desborde === 'auto' || desborde === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
      const queda = dx < 0 ? el.scrollLeft : el.scrollWidth - el.clientWidth - el.scrollLeft;
      if (queda > 1) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Devuelve el oyente de rueda que hay que enganchar. Se llama a `alGesto` una
 * vez por deslizamiento.
 *
 * Se entrega como fábrica y no como hook porque hace falta en tres sitios muy
 * distintos —el gestor de ventanas, el navegador remoto y la app cuando va
 * dentro de un marco— y solo uno de ellos es un componente con estado.
 */
export function detectorDeGesto(alGesto: (sentido: Sentido) => void) {
  let acumulado = 0;
  let disparado = false;
  let esScroll = false;
  let ultimo = 0;

  return (e: WheelEvent) => {
    const ahora = Date.now();
    if (ahora - ultimo > PAUSA) { acumulado = 0; disparado = false; esScroll = false; }
    ultimo = ahora;

    // Regla 1: lo que nace vertical, vertical se queda.
    if (esScroll || Math.abs(e.deltaY) > Math.abs(e.deltaX)) { esScroll = true; return; }
    // Regla 3: una vez por gesto.
    if (disparado) return;
    // Regla 2: si hay algo que desplazar debajo, es suyo.
    if (loCogeOtro(e.target, e.deltaX)) return;

    acumulado += e.deltaX;
    if (Math.abs(acumulado) < UMBRAL) return;
    disparado = true;
    alGesto(acumulado < 0 ? 'atras' : 'adelante');
  };
}
