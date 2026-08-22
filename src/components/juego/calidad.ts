// ============================================================================
// JUEGO VITAL — nivel de calidad visual (2026-08-19, fase 0 del realismo).
// Un solo sitio decide cuánto detalle puede pagar cada aparato: la página lo
// detecta al entrar y la escena degrada sola si los FPS caen. Se puede forzar
// con ?calidad=alta|media|baja en la URL (queda guardado) para comparar.
// ============================================================================

export type NivelCalidad = 'alta' | 'media' | 'baja';

const CLAVE = 'juego:calidad';

export function detectarCalidad(): NivelCalidad {
  try {
    const url = new URLSearchParams(window.location.search).get('calidad');
    if (url === 'alta' || url === 'media' || url === 'baja') {
      localStorage.setItem(CLAVE, url);
      return url;
    }
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'alta' || guardado === 'media' || guardado === 'baja') return guardado;
  } catch { /* sin localStorage (privacidad estricta): seguimos con la detección */ }

  const movil = matchMedia('(pointer: coarse)').matches
    || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const nucleos = navigator.hardwareConcurrency || 4;
  // deviceMemory (GB) no existe en Safari; 8 es un valor neutro que no penaliza.
  const memoria = (navigator as { deviceMemory?: number }).deviceMemory || 8;

  if (movil) return nucleos >= 8 && memoria >= 6 ? 'media' : 'baja';
  if (nucleos <= 4 || memoria <= 4) return 'media';
  return 'alta';
}

/** Los ajustes concretos de cada nivel, juntos para que las fases siguientes
 *  (hierba, vegetación, partículas…) lean de aquí y no inventen umbrales. */
export const AJUSTES: Record<NivelCalidad, {
  /** Rango de densidad de píxeles del lienzo. */
  dpr: [number, number];
  /** Lado del mapa de sombras del sol. */
  sombras: number;
  /** ¿Se montan los efectos de imagen (bloom, antialiasing fino, viñeta)? */
  efectos: boolean;
  /** ¿Oclusión ambiental (el sombreado de contacto que asienta los objetos)? */
  ao: boolean;
  /** Matas de hierba instanciadas en la aldea (fase 1). */
  hierba: number;
}> = {
  // La hierba en alta baja de 45.000 a 15.000 (2026-08-19). Medido: apagarla
  // entera no ahorra ni un fotograma —va instanciada, la tarjeta la dibuja de
  // una vez— pero SÍ cuesta memoria y tiempo de construirla al entrar, que es
  // lo que de verdad se nota. A 15.000 el suelo sigue cubierto.
  // ══ MEDIDO, Y BAJADO A LO QUE SE NOTA (2026-08-22) ═══════════════════════
  // Eugenio: «quita sofisticaciones de luces y cosas que quiten mucha RAM».
  // Los tres números que más pesaban, con su cuenta:
  //
  //   SOMBRAS 4096  ->  4096 × 4096 × 4 bytes = **67 MB** de tarjeta gráfica,
  //                     reservados siempre. A 2048 son 17: **50 MB menos** por
  //                     una diferencia que hay que buscar a propósito, porque
  //                     la cámara del juego mira desde arriba y de lejos.
  //   EFECTOS       ->  el composer guarda varias copias de la pantalla
  //                     entera. A DPR 2 en un portátil son ~19 MB cada una, y
  //                     entre bloom, antialiasing y oclusión salían 5-6.
  //                     ~100 MB para un brillo y una viñeta.
  //   HIERBA 15.000 ->  poca memoria (1 MB de matrices) pero **15.000 matas
  //                     que se dibujan dos veces**: una en pantalla y otra en
  //                     el mapa de sombras.
  //
  // El color de cine NO se pierde: la curva ACES la aplica ahora el propio
  // renderer (`toneMapping` en Escena.tsx), que es gratis. Lo que se va es el
  // composer, no el aspecto.
  alta:  { dpr: [1, 1.75], sombras: 2048, efectos: false, ao: false, hierba: 6000 },
  media: { dpr: [1, 1.5],  sombras: 1024, efectos: false, ao: false, hierba: 3500 },
  baja:  { dpr: [0.8, 1],  sombras: 1024, efectos: false, ao: false, hierba: 1200 },
};

/** Un escalón menos, para la degradación automática por FPS. */
export function bajarNivel(n: NivelCalidad): NivelCalidad {
  return n === 'alta' ? 'media' : 'baja';
}
