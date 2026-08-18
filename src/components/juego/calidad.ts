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
  alta: { dpr: [1, 2], sombras: 4096, efectos: true, ao: true, hierba: 45000 },
  media: { dpr: [1, 1.5], sombras: 2048, efectos: true, ao: false, hierba: 16000 },
  baja: { dpr: [0.8, 1], sombras: 1024, efectos: false, ao: false, hierba: 3000 },
};

/** Un escalón menos, para la degradación automática por FPS. */
export function bajarNivel(n: NivelCalidad): NivelCalidad {
  return n === 'alta' ? 'media' : 'baja';
}
