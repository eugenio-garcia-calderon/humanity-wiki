// LA ESCALA DE COLOR DE UNA NOTA. Una por cada punto de la nota del 0 al 10.
// La usan el mapa, su ficha, el termómetro, las galerías y la propiedad «Nota»
// de las bases de datos (`utils/nota.ts`): cambiarla aquí la cambia en todas.
// `score` va sobre 100 (68 = nota 6,8).
//
// EL ESPECTRO DE LA LUZ VISIBLE (2026-10-26, Eugenio: «el rojo, las notas más
// bajas; el 5, verde, el neutro; el amarillo, un suspenso alto; el azul claro,
// un notable; y el morado o azul oscuro, un sobresaliente»). Antes iba del rojo
// al verde oscuro pasando por el ámbar.
export function getColorForScore(score: number): string {
  if (score >= 95) return '#5b2a8e'; // 10 · morado
  if (score >= 85) return '#3b2fc9'; // 9 · azul añil
  if (score >= 75) return '#1f5fe0'; // 8 · azul
  if (score >= 65) return '#1aa7ec'; // 7 · azul claro (notable)
  if (score >= 55) return '#12b5a0'; // 6 · turquesa
  if (score >= 45) return '#22bf3c'; // 5 · verde (el neutro)
  if (score >= 35) return '#f2cc0c'; // 4 · amarillo (suspenso alto)
  if (score >= 25) return '#ff8a00'; // 3 · naranja
  if (score >= 15) return '#f04a00'; // 2 · rojo anaranjado
  return '#d10000';                  // 0-1 · rojo
}
