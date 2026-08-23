// ============================================================================
// ¿VA BIEN LA LLAMADA? (2026-08-22)
// ============================================================================
// Cuando el audio se entrecorta, la pregunta que se hace todo el mundo es «¿soy
// yo o es el otro?», y hasta ahora la aplicación no contestaba: se veía igual
// una llamada perfecta que una que estaba perdiendo uno de cada cinco paquetes.
// Eso convierte un problema de red en una discusión entre dos personas.
//
// ── LO QUE SE MIDE, Y POR QUÉ ESOS TRES ─────────────────────────────────────
// `getStats()` devuelve más de cien números. Solo tres cuentan para lo que una
// persona percibe como «se oye mal»:
//
//   PÉRDIDA   paquetes que no llegaron. Es lo que suena a robot y a sílabas
//             que faltan. El que más pesa con diferencia.
//   IDA Y VUELTA  lo que tarda tu voz en llegar. No se oye mal, pero por
//             encima de medio segundo la gente empieza a pisarse al hablar.
//   NERVIOSISMO (jitter) los paquetes llegan, pero desordenados en el tiempo.
//             El amortiguador del navegador lo tapa hasta cierto punto; pasado
//             ese punto, se nota como un tartamudeo.
//
// ── POR QUÉ SE MIDE POR TRAMOS Y NO EN TOTAL ────────────────────────────────
// Los contadores de WebRTC son acumulados desde el principio de la llamada. Si
// se dividiera el total de perdidos entre el total de recibidos, una llamada de
// veinte minutos que empezó fatal y ahora va perfecta seguiría marcando rojo, y
// una que lleva veinte minutos bien y acaba de romperse seguiría marcando
// verde durante minutos. Lo que importa es **cómo va AHORA**, así que se guarda
// la lectura anterior y se compara con la nueva: la diferencia entre dos
// fotos, no la foto entera.
//
// ── Y POR QUÉ NO SE ENSEÑA EL NÚMERO ────────────────────────────────────────
// A nadie le sirve «3,7 % de pérdida, 180 ms». Le sirve saber si tiene que
// repetir la frase o cambiarse de sitio. Tres barritas y, cuando de verdad va
// mal, una frase. Los números están, y se pueden pedir para depurar, pero no
// se le ponen delante a quien solo quería hablar con alguien.

/** De mejor a peor. `sin-datos` es todavía no lo sé, no «va mal». */
export type Calidad = 'buena' | 'regular' | 'mala' | 'sin-datos';

export interface MedidaCalidad {
  calidad: Calidad;
  /** Fracción de paquetes perdidos en el último tramo, de 0 a 1. */
  perdida: number;
  /** Ida y vuelta en milisegundos, o null si el navegador no lo dice. */
  idaVuelta: number | null;
  /** Nerviosismo en milisegundos. */
  nerviosismo: number;
}

// ── LOS LÍMITES, Y DE DÓNDE SALEN ───────────────────────────────────────────
// No son inventados: son los que usa la industria para voz sobre IP. Por
// debajo del 2 % de pérdida una conversación se oye entera; entre el 2 % y el
// 8 % se notan cortes pero se entiende; por encima del 8 % hay que repetir
// frases. Con la ida y vuelta pasa lo mismo en 300 ms y 600 ms: a partir de
// ahí dos personas empiezan a hablar a la vez sin querer.
const LIMITES = {
  perdidaRegular: 0.02,
  perdidaMala: 0.08,
  idaVueltaRegular: 300,
  idaVueltaMala: 600,
  nerviosismoRegular: 30,
  nerviosismoMala: 80,
};

interface Foto { perdidos: number; recibidos: number }

/**
 * Vigila una conexión y avisa cuando cambia lo que una persona notaría.
 *
 * Devuelve la función de parar. **Hay que llamarla al colgar**: un cronómetro
 * suelto sobre una conexión cerrada es una pestaña despertándose cada dos
 * segundos para siempre.
 */
export function vigilarCalidad(
  conexion: RTCPeerConnection,
  alCambiar: (m: MedidaCalidad) => void,
  cadaMs = 2000,
): () => void {
  let anterior: Foto | null = null;
  let ultima: Calidad | null = null;
  let vivo = true;

  const mirar = async () => {
    if (!vivo) return;
    try {
      const informe = await conexion.getStats();
      let perdidos = 0, recibidos = 0, nerviosismo = 0, idaVuelta: number | null = null;

      informe.forEach((d: any) => {
        // Solo el audio. El vídeo pierde paquetes constantemente y no pasa
        // nada —se ve un fotograma feo—, pero mezclarlo aquí teñiría de rojo
        // una llamada que se oye perfectamente.
        if (d.type === 'inbound-rtp' && d.kind === 'audio') {
          perdidos += d.packetsLost || 0;
          recibidos += d.packetsReceived || 0;
          // `jitter` viene en segundos. En milisegundos se puede comparar con
          // algo que una persona reconozca.
          nerviosismo = Math.max(nerviosismo, (d.jitter || 0) * 1000);
        }
        if (d.type === 'candidate-pair' && d.state === 'succeeded' && (d.selected || d.nominated)) {
          if (typeof d.currentRoundTripTime === 'number') idaVuelta = d.currentRoundTripTime * 1000;
        }
      });

      const foto: Foto = { perdidos, recibidos };
      let perdida = 0;
      if (anterior) {
        const dPerdidos = Math.max(0, perdidos - anterior.perdidos);
        const dRecibidos = Math.max(0, recibidos - anterior.recibidos);
        const total = dPerdidos + dRecibidos;
        // SIN PAQUETES EN EL TRAMO NO SE OPINA. Al principio de la llamada, o
        // en un silencio con supresión de ruido activa, no llega nada; decir
        // «100 % de pérdida» ahí sería pintar rojo por estar callado.
        perdida = total > 0 ? dPerdidos / total : 0;
      }
      anterior = foto;

      const calidad: Calidad =
        !anterior || recibidos === 0 ? 'sin-datos'
        : perdida >= LIMITES.perdidaMala
          || (idaVuelta !== null && idaVuelta >= LIMITES.idaVueltaMala)
          || nerviosismo >= LIMITES.nerviosismoMala ? 'mala'
        : perdida >= LIMITES.perdidaRegular
          || (idaVuelta !== null && idaVuelta >= LIMITES.idaVueltaRegular)
          || nerviosismo >= LIMITES.nerviosismoRegular ? 'regular'
        : 'buena';

      // SOLO SE AVISA CUANDO CAMBIA EL ESCALÓN. Publicar cada dos segundos
      // repintaría la llamada entera sin que nada haya cambiado a la vista.
      if (calidad !== ultima) {
        ultima = calidad;
        alCambiar({ calidad, perdida, idaVuelta, nerviosismo });
      }
    } catch {
      // Una lectura fallida no dice nada malo de la llamada: se ignora y se
      // prueba dentro de dos segundos.
    }
  };

  const t = setInterval(mirar, cadaMs);
  void mirar();
  return () => { vivo = false; clearInterval(t); };
}
