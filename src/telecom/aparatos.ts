// ============================================================================
// ELEGIR MICRÓFONO, CÁMARA Y ALTAVOZ (2026-08-22)
// ============================================================================
// Hasta ahora la llamada cogía lo que el navegador quisiera darle. Eso funciona
// en un portátil pelado y falla en cuanto hay unos auriculares: te conectas los
// cascos, sigues saliendo por el micrófono de la pantalla y oyéndote por el
// altavoz del portátil, y no hay ningún sitio donde arreglarlo. La única
// salida era cerrar la pestaña, cambiar el aparato en el sistema y volver a
// llamar.
//
// ── LOS NOMBRES NO EXISTEN HASTA QUE DAS PERMISO ────────────────────────────
// `enumerateDevices()` siempre devuelve la lista, pero **las etiquetas vienen
// vacías si no se ha concedido permiso al micrófono**. Es una protección del
// navegador: la lista de tus aparatos identifica tu ordenador bastante bien.
// Por eso este menú solo tiene sentido dentro de una llamada, que es cuando el
// permiso ya está dado, y por eso hay un texto de reserva para el caso raro en
// que llegue vacío igualmente.
//
// ── EL ALTAVOZ ES DISTINTO DE LOS OTROS DOS ─────────────────────────────────
// Cambiar de micrófono o de cámara es cambiar lo que se CAPTURA: hay que pedir
// la nueva cinta y sustituirla en el carril que ya está en marcha. Cambiar de
// altavoz es cambiar dónde SUENA lo que ya llega, y eso se hace sobre el propio
// elemento `<audio>` con `setSinkId`.
//
// Y `setSinkId` no está en todas partes: Firefox lo trae desactivado por
// defecto y Safari no lo tiene. Cuando no está, la opción no se enseña — en vez
// de ofrecer un desplegable que no hace nada, que es peor que no ofrecer nada.

export interface Aparato { id: string; nombre: string }

export interface Aparatos {
  micros: Aparato[];
  camaras: Aparato[];
  altavoces: Aparato[];
  /** ¿Puede este navegador elegir por dónde suena? */
  sePuedeElegirAltavoz: boolean;
}

/** Un nombre presentable aunque el navegador no dé ninguno. */
function nombrar(d: MediaDeviceInfo, i: number, tipo: string): string {
  if (d.label) return d.label;
  if (d.deviceId === 'default') return `${tipo} del sistema`;
  return `${tipo} ${i + 1}`;
}

export async function listarAparatos(): Promise<Aparatos> {
  const sePuedeElegirAltavoz = typeof (HTMLMediaElement.prototype as any).setSinkId === 'function';
  try {
    const todos = await navigator.mediaDevices.enumerateDevices();
    const de = (tipo: MediaDeviceKind, etiqueta: string) =>
      todos.filter(d => d.kind === tipo)
        .map((d, i) => ({ id: d.deviceId, nombre: nombrar(d, i, etiqueta) }))
        // Algunos sistemas repiten el mismo aparato como «default» y con su id
        // propio. Dos líneas idénticas en un menú hacen dudar de cuál es cuál.
        .filter((a, i, todas) => todas.findIndex(b => b.nombre === a.nombre) === i);
    return {
      micros: de('audioinput', 'Micrófono'),
      camaras: de('videoinput', 'Cámara'),
      altavoces: sePuedeElegirAltavoz ? de('audiooutput', 'Altavoz') : [],
      sePuedeElegirAltavoz,
    };
  } catch {
    return { micros: [], camaras: [], altavoces: [], sePuedeElegirAltavoz };
  }
}

// ── LO QUE SE RECUERDA ENTRE LLAMADAS ───────────────────────────────────────
// Quien se pone los cascos para hablar se los pone SIEMPRE para hablar. Volver
// a elegirlos en cada llamada sería pedirle a alguien que repita cada día la
// misma decisión. Se guarda el identificador; si ese aparato ya no está
// enchufado, `getUserMedia` lo ignora y coge el que haya, que es exactamente lo
// que debe pasar.
const CLAVE = 'telecom.aparatos';

export interface Preferencias { micro?: string; camara?: string; altavoz?: string }

export function leerPreferencias(): Preferencias {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; }
}

export function guardarPreferencia(cual: keyof Preferencias, id: string) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ ...leerPreferencias(), [cual]: id }));
  } catch {
    // Modo privado de Safari: no se puede guardar. La elección vale para esta
    // llamada y se pierde al cerrar, que es mejor que reventar.
  }
}

/**
 * Enviar el sonido a otro altavoz.
 *
 * Falla en silencio a propósito: si el navegador no deja, lo que pasa es que
 * se sigue oyendo por donde se oía. Eso no merece un mensaje de error rojo.
 */
export async function sonarPor(elemento: HTMLMediaElement | null, idAltavoz: string) {
  const conSink = elemento as any;
  if (!elemento || typeof conSink.setSinkId !== 'function') return false;
  try { await conSink.setSinkId(idAltavoz); return true; } catch { return false; }
}
