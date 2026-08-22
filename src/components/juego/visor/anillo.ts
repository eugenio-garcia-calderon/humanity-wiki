// ============================================================================
// EL REPARTO EQUIDISTANTE (2026-08-22)
// ============================================================================
// Eugenio: «haz que sea equidistantes, como hicimos con el grafo, que los
// elementos a medida que se añaden se ordenan de forma equidistante».
//
// UN CENTRO Y UN ANILLO. Las cosas se reparten en círculo alrededor del
// centro, a ángulos iguales. Con tres proyectos hay 120° entre cada uno; con
// diez, 36°. No hay filas, ni calles, ni un hueco raro al final: el que llega
// no se coloca «después del último», sino que todos se recolocan.
//
// EL RADIO CRECE CON LA CANTIDAD, y esa es la parte que se olvida. A radio
// fijo, veinte elementos se tocarían entre sí; aquí el círculo se ensancha lo
// justo para que entre todos con su hueco. Se calcula del arco que necesita
// cada uno: si cada cosa ocupa `separacion` metros de arco y hay `n`, la
// circunferencia mínima es `n · separacion` y el radio, eso partido por 2π.
//
// Y HAY UN MÍNIMO Y UN MÁXIMO. El mínimo, para que con un solo elemento no se
// plante encima del centro; el máximo, porque un anillo de 200 m obliga a
// cruzar el mundo entero para llegar a la primera cosa.
//
// ES UNA SOLA FUNCIÓN Y LA USAN TODOS: la escena, las colisiones y el
// minimapa. Cuando cada uno calculaba su sitio por su cuenta, mover el mapa
// dejaba las colisiones apuntando al sitio viejo — ya pasó con las casas.

export interface Punto { x: number; z: number }

/** Cuánto arco se le reserva a cada cosa, en metros. Un portal mide 4,6 de
 *  radio, así que ~14 deja pasar entre dos sin rozarlos. */
export const SEPARACION = 14;
export const RADIO_MIN = 16;
export const RADIO_MAX = 74;

/** El radio del anillo para `n` elementos. */
export function radioAnillo(n: number): number {
  if (n <= 1) return RADIO_MIN;
  return Math.min(RADIO_MAX, Math.max(RADIO_MIN, (n * SEPARACION) / (Math.PI * 2)));
}

/**
 * Dónde va el elemento `i` de `n`, repartidos a ángulos iguales.
 *
 * EMPIEZA ARRIBA (−Z) Y VA EN SENTIDO HORARIO. El jugador aparece mirando al
 * norte, así que el primero de la lista es el que tiene delante: el orden que
 * se ve en la pantalla es el mismo que el de la lista de al lado.
 */
export function enAnillo(i: number, n: number, radio = radioAnillo(n)): Punto {
  const paso = (Math.PI * 2) / Math.max(n, 1);
  const ang = -Math.PI / 2 + i * paso;
  return { x: Math.cos(ang) * radio, z: Math.sin(ang) * radio };
}

/** Todas las posiciones de golpe. */
export function anillo(n: number, radio = radioAnillo(n)): Punto[] {
  return Array.from({ length: n }, (_, i) => enAnillo(i, n, radio));
}

/**
 * El ángulo (en radianes) al que mira un elemento del anillo para quedar de
 * cara al centro. Sin esto, las pantallas del borde enseñan el canto o la
 * espalda según en qué lado del círculo hayan caído.
 */
export function miraAlCentro(p: Punto): number {
  return Math.atan2(-p.x, -p.z);
}
