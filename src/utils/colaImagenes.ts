// ============================================================================
// LAS IMÁGENES, EN ORDEN DE PÁGINA (2026-10-18, petición de Eugenio)
// ============================================================================
// Una página con muchas bases de datos, cada una con muchas tarjetas, pedía
// todas sus imágenes a la vez: se veían a medias durante un buen rato. Ahora
// cada imagen pide turno a esta cola. Entra antes la de menor «prioridad»: la
// posición de su base de datos en la página (la de arriba, 0) por 1000, más
// la posición de la tarjeta dentro de ella. Solo unas pocas descargan a la vez.

/** Cuántas imágenes descargan a la vez. Pocas: lo que cuenta es el orden. */
const SIMULTANEAS = 4;

type Turno = { prioridad: number; orden: number; arrancar: (liberar: () => void) => void };

let activas = 0;
let secuencia = 0;
const esperan: Turno[] = [];

function siguiente() {
  while (activas < SIMULTANEAS && esperan.length) {
    esperan.sort((a, b) => a.prioridad - b.prioridad || a.orden - b.orden);
    const t = esperan.shift()!;
    activas++;
    let libre = false;
    // Cada turno se libera una sola vez, aunque la imagen avise dos veces.
    t.arrancar(() => { if (libre) return; libre = true; activas--; siguiente(); });
  }
}

/**
 * Pide turno para cargar una imagen. `arrancar` recibe la función que hay que
 * llamar cuando la imagen termina (o falla), para que pase el turno al
 * siguiente. Devuelve cancelar: si la imagen ya no hace falta, sale de la cola.
 */
export function pedirTurno(prioridad: number, arrancar: (liberar: () => void) => void): () => void {
  const t: Turno = { prioridad, orden: secuencia++, arrancar };
  esperan.push(t);
  siguiente();
  return () => {
    const i = esperan.indexOf(t);
    if (i >= 0) esperan.splice(i, 1);
  };
}
