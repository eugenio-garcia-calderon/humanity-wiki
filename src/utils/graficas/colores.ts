// ============================================================================
// LOS COLORES DE LAS GRÁFICAS (2026-08-23)
// ============================================================================
// No están elegidos a ojo. Salen de una paleta categórica validada y se han
// vuelto a comprobar contra NUESTRO fondo (blanco, no el gris de la paleta de
// referencia) con el validador de seis pruebas:
//
//   banda de luminosidad  PASA (los 8 dentro de L 0,43–0,77)
//   suelo de croma        PASA
//   separación daltónica  PASA (peor pareja contigua ΔE 9,1 · protan)
//   suelo de visión normal PASA (peor pareja contigua ΔE 19,6)
//   contraste con el fondo AVISO — tres colores bajan de 3:1
//
// EL AVISO OBLIGA A ALGO, no se ignora: tres colores (aqua, amarillo y
// magenta) no llegan a 3:1 sobre blanco, así que el color NUNCA es lo único
// que identifica una serie. Por eso las líneas llevan su nombre escrito al
// final —como en Our World in Data— y por eso hay una pestaña «Tabla» con los
// números. Si algún día se quitan esas dos cosas, hay que volver a mirar esto.
//
// EL ORDEN ES EL MECANISMO, no la decoración: es el orden lo que garantiza que
// dos series contiguas se distingan con daltonismo. No se reordena por gusto y
// NO SE REPITE EN CICLO. La serie novena no recibe «otra vez el azul»: se
// agrupa en «Otros». Un color repetido dice que dos países son el mismo.
//
// SIN MODO OSCURO. La plataforma no lo tiene (cero clases `dark:` en todo
// `src/`), y una gráfica oscura dentro de una aplicación clara es un fallo, no
// una mejora. Los pasos oscuros están apuntados y validados para el día que se
// añada; lo que no se hace es invertir los claros, que es lo que se ve mal.

/** Los ocho de identidad, en el orden que pasa las pruebas. */
export const SERIES = [
  '#2a78d6', // 1 azul
  '#eb6834', // 2 naranja
  '#1baf7a', // 3 aqua
  '#eda100', // 4 amarillo
  '#e87ba4', // 5 magenta
  '#008300', // 6 verde
  '#4a3aa7', // 7 violeta
  '#e34948', // 8 rojo
] as const;

/** Los mismos ocho tonos escalonados para un fondo oscuro. Sin usar todavía. */
export const SERIES_OSCURO = [
  '#3987e5', '#d95926', '#199e70', '#c98500',
  '#d55181', '#008300', '#9085e9', '#e66767',
] as const;

/** Cuántas series se pueden pintar antes de agrupar en «Otros». */
export const TOPE_SERIES = SERIES.length;

/**
 * Formas donde TODAS las parejas se ven a la vez —dispersión, mapa, burbujas—
 * y no solo las contiguas. Ahí los ocho no pasan el suelo: solo los tres
 * primeros. Es un límite medido, no una preferencia.
 */
export const TOPE_SERIES_TODAS_PAREJAS = 3;

export const GRIS_OTROS = '#898781';

/**
 * El color de una serie por su POSICIÓN, no por su valor ni por su puesto en
 * la clasificación: filtrar o reordenar no puede repintar a los que quedan, o
 * la gráfica de antes y la de después parecen hablar de países distintos.
 */
export function colorDeSerie(indice: number): string {
  return indice < SERIES.length ? SERIES[indice] : GRIS_OTROS;
}

// ----------------------------------------------------------------------------
// El mapa: magnitud, no identidad
// ----------------------------------------------------------------------------
// Un solo tono de claro a oscuro. Nunca un arcoíris: el arcoíris inventa
// fronteras donde los datos no las tienen.

export const RAMPA_SECUENCIAL = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec',
  '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab',
  '#184f95', '#104281', '#0d366b',
] as const;

/** Dos polos y un gris en medio, para cuando el cero significa algo. */
export const RAMPA_DIVERGENTE = {
  frio: ['#0d366b', '#256abf', '#5598e7', '#9ec5f4', '#cde2fb'] as const,
  centro: '#f0efec',
  calor: ['#f9d3d3', '#ef9a9a', '#e34948', '#c22b2b', '#8f1d1d'] as const,
};

/** El gris de «aquí no hay dato». Nunca el primer paso de la rampa: el país
 *  sin dato y el país con el valor más bajo no pueden verse igual. */
export const SIN_DATO = '#e8e6e1';

/** El cromado: rejilla, ejes y rótulos. Discretos, siempre por detrás. */
export const CROMADO = {
  fondo: '#ffffff',
  tintaPrimaria: '#0b0b0b',
  tintaSecundaria: '#52514e',
  tintaApagada: '#898781',
  rejilla: '#e1e0d9',
  ejeBase: '#c3c2b7',
};
