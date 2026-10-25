// LA ESCALA DE COLOR DE UNA NOTA (2026-10-25). Una por cada punto de la nota
// del 1 al 10, del rojo (lo urgente) al verde oscuro (resuelto). La usan el
// mapa, su ficha y la propiedad «Nota» de las bases de datos (`utils/nota.ts`).
// Antes tenía 11 tramos sobre 100 con huecos: el 5 y el 6 salían iguales, y el
// 7 en ocre parecía peor que el 6 (bot evaluador de «Evolución», ronda 1).
// `score` va sobre 100 (68 = nota 6,8).
export function getColorForScore(score: number): string {
  if (score >= 95) return '#14532d'; // 10 · verde muy oscuro
  if (score >= 85) return '#16a34a'; // 9
  if (score >= 75) return '#4ade80'; // 8
  if (score >= 65) return '#a3e635'; // 7 · verde lima
  if (score >= 55) return '#facc15'; // 6 · amarillo
  if (score >= 45) return '#f59e0b'; // 5 · ámbar
  if (score >= 35) return '#f97316'; // 4 · naranja
  if (score >= 25) return '#ea580c'; // 3 · naranja oscuro
  if (score >= 15) return '#dc2626'; // 2 · rojo
  return '#991b1b';                  // 0-1 · rojo oscuro
}
