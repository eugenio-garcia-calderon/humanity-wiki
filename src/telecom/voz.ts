// ============================================================================
// ¿QUIÉN ESTÁ HABLANDO? (2026-08-22)
// ============================================================================
// Dos cosas distintas se resuelven con el mismo aparato, y por eso están
// juntas:
//
//   1. QUIÉN HABLA. En una llamada de voz sin cámara, la pantalla es una
//      inicial dentro de un círculo y no se mueve nada. Si el otro se queda
//      callado no se distingue de si se ha caído la llamada, y la gente acaba
//      diciendo «¿me oyes?» cada quince segundos.
//
//   2. **ESTÁS HABLANDO CON EL MICRÓFONO CERRADO.** Este es el fallo universal
//      de las videollamadas: se dice una frase entera y alguien contesta «no
//      te oímos». El navegador lo sabe —la pista sigue capturando aunque esté
//      apagada para el otro lado— así que se puede avisar en el momento en vez
//      de dejar que se descubra después.
//
// ── POR QUÉ NO BASTA CON UN UMBRAL ──────────────────────────────────────────
// El volumen de una voz no es una línea plana: sube y baja dentro de una misma
// palabra, y entre dos palabras cae a cero. Con un umbral pelado, el indicador
// parpadearía varias veces por frase, que es peor que no tenerlo.
//
// Por eso ataque rápido y caída lenta: se enciende en cuanto se pasa el umbral
// —para que no llegue tarde— y no se apaga hasta que llevas 700 ms callado, que
// es más que cualquier pausa entre palabras y menos que cualquier pausa entre
// turnos de conversación.
//
// ── Y POR QUÉ SE MIRA EL VOLUMEN Y NO SI HAY VOZ ────────────────────────────
// Distinguir voz de ruido de fondo es un problema de verdad y hay bibliotecas
// enteras para ello. Aquí no hace falta: el navegador ya trae supresión de
// ruido activada en `getUserMedia`, así que lo que llega al medidor ya viene
// bastante limpio. Un umbral sobre el volumen medio acierta lo suficiente para
// encender un puntito, y equivocarse aquí no rompe nada.

/** Lo que se considera «hay voz». Sobre 1, siendo 1 el máximo del micrófono. */
const UMBRAL = 0.02;
/** Lo que se espera en silencio antes de apagar el indicador. */
const CAIDA_MS = 700;

/**
 * Escucha una cinta de audio y avisa cuando empieza y deja de sonar una voz.
 *
 * Devuelve la función de parar, que **hay que llamar siempre**: un
 * `AudioContext` abierto mantiene despierta la tarjeta de sonido, y los
 * navegadores limitan cuántos puede tener una página a la vez. Dejarse uno
 * abierto por llamada significa que a la sexta llamada ya no funciona ninguno.
 */
export function escucharVoz(
  cinta: MediaStream,
  alCambiar: (hablando: boolean) => void,
): () => void {
  // Sin pista de audio no hay nada que medir: una llamada de solo pantalla
  // compartida entra aquí, y montarle un analizador sería gastar por nada.
  if (cinta.getAudioTracks().length === 0) return () => {};

  let contexto: AudioContext;
  try {
    contexto = new AudioContext();
  } catch {
    // Safari en algunas versiones se niega si no venimos de un gesto del
    // usuario. Perder el indicador es aceptable; romper la llamada, no.
    return () => {};
  }

  const fuente = contexto.createMediaStreamSource(cinta);
  const analizador = contexto.createAnalyser();
  // 512 es suficiente para un volumen medio y es barato. Más resolución solo
  // serviría para dibujar un espectro, que no es lo que se pinta.
  analizador.fftSize = 512;
  fuente.connect(analizador);

  const muestras = new Uint8Array(analizador.frequencyBinCount);
  let hablando = false;
  let ultimaVez = 0;
  let vivo = true;
  let cuadro = 0;

  const mirar = () => {
    if (!vivo) return;
    analizador.getByteTimeDomainData(muestras);
    // Volumen eficaz: la media cuadrática de lo que se separa del centro.
    // 128 es el silencio en esta representación, y 128 también es el máximo
    // hacia cada lado.
    let suma = 0;
    for (let i = 0; i < muestras.length; i++) {
      const v = (muestras[i] - 128) / 128;
      suma += v * v;
    }
    const volumen = Math.sqrt(suma / muestras.length);
    const ahora = performance.now();

    if (volumen > UMBRAL) {
      ultimaVez = ahora;
      if (!hablando) { hablando = true; alCambiar(true); }
    } else if (hablando && ahora - ultimaVez > CAIDA_MS) {
      hablando = false;
      alCambiar(false);
    }
    cuadro = requestAnimationFrame(mirar);
  };
  cuadro = requestAnimationFrame(mirar);

  return () => {
    vivo = false;
    cancelAnimationFrame(cuadro);
    try { fuente.disconnect(); } catch { /* ya desconectado */ }
    void contexto.close().catch(() => {});
  };
}
