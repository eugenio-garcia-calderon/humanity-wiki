/*
 * LA MISMA CUENTA EN EL NAVEGADOR Y EN EL SERVIDOR (2026-11-19)
 * ----------------------------------------------------------------
 * Estas funciones son la única definición de «qué nivel alcanza un aspecto» y de
 * «cuánto se parece una figura a un partido». La usan la página del test (lo que
 * ve la persona) y el servidor (el correo de resultados), así que nunca pueden
 * decir cosas distintas.
 *
 * Son las mismas reglas que la página de la geometría (`observatorio-polarizacion/index.html`):
 *   - Escala de 0 a 10 por aspecto. Cada círculo es un umbral: básico desde 4,
 *     intermedio desde 7 y avanzado en 10 (ver «Cómo se lee» en la página).
 *   - Parecido = 100 − (diferencia media por aspecto) × 10, redondeado.
 *
 * Sin dependencias. Funciona como script de navegador (define `Geometria`) y como
 * módulo CommonJS (`require`).
 */
(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else raiz.Geometria = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Umbrales de los tres círculos, en la misma escala 0-10 que la página (10/3, 20/3, 10).
  var UMBRAL = [10 / 3, 20 / 3, 10];

  var NOMBRE_NIVEL = ['Básico', 'Intermedio', 'Avanzado'];

  /** Cuántos círculos alcanza una cifra: -1 si no llega a básico. */
  function nivelDe(x) {
    var n = -1;
    for (var k = 0; k < UMBRAL.length; k++) if (alcanza(x, k)) n = k;
    return n;
  }

  /** ¿Llega la cifra al círculo k (0 básico, 1 intermedio, 2 avanzado)? */
  function alcanza(x, k) {
    return x >= UMBRAL[k] - 0.01;
  }

  /** La etiqueta que se lee junto a cada deslizador. Los números son los de la página. */
  function etiquetaDe(x) {
    if (x === 0) return 'Lo ignora o lo rechaza';
    if (x <= 3) return 'No llega a lo básico';
    if (x <= 6) return 'Básico';
    if (x <= 9) return 'Intermedio';
    return 'Avanzado';
  }

  /**
   * Parecido entre la figura `a` y un partido `b`, de 0 a 100.
   * Un aspecto que la persona deja en 0 («lo ignoro») NO cuenta: ni penaliza ni premia.
   * Devuelve null si no queda ningún aspecto que comparar.
   */
  function parecido(a, b) {
    if (!a || !b || a.length !== b.length || a.length === 0) return null;
    var suma = 0, n = 0;
    for (var i = 0; i < a.length; i++) {
      if (a[i] === 0) continue;
      suma += Math.abs(a[i] - b[i]);
      n++;
    }
    if (n === 0) return null;
    return Math.round(100 - (suma / n) * 10);
  }

  /** Los partidos con cifra, de más a menos parecidos. Los que no tienen cifra quedan fuera. */
  function conCifra(lista) {
    return lista.filter(function (p) { return p.parecido !== null; });
  }

  /** ¿Tiene la figura la forma de los datos? `puntuaciones[i]` es un array de cifras de 0 a 10 por tema. */
  function figuraValida(puntuaciones, datos) {
    if (!Array.isArray(puntuaciones) || puntuaciones.length !== datos.temas.length) return false;
    for (var i = 0; i < datos.temas.length; i++) {
      var fila = puntuaciones[i];
      if (!Array.isArray(fila) || fila.length !== datos.temas[i].ejes.length) return false;
      for (var j = 0; j < fila.length; j++) {
        var x = fila[j];
        if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x > 10) return false;
      }
    }
    return true;
  }

  /**
   * El resumen de una figura, tema por tema y en conjunto.
   * Lo usa el correo de resultados y la pantalla del resultado.
   */
  function resumen(puntuaciones, datos) {
    var temas = datos.temas.map(function (t, i) {
      var fila = puntuaciones[i];
      var cuenta = [0, 0, 0];
      fila.forEach(function (x) {
        for (var k = 0; k < UMBRAL.length; k++) if (alcanza(x, k)) cuenta[k]++;
      });
      var parecidos = datos.partidos.map(function (p) {
        return { k: p.k, n: p.n, parecido: parecido(fila, t.v[p.k]) };
      });
      var mejor = conCifra(parecidos).reduce(function (m, p) { return m === null || p.parecido > m.parecido ? p : m; }, null);
      return {
        k: t.k,
        n: t.n,
        aspectos: fila.length,
        basico: cuenta[0],
        intermedio: cuenta[1],
        avanzado: cuenta[2],
        parecidos: parecidos,
        mejor: mejor,
      };
    });

    // En conjunto: todas las cifras seguidas, con la misma cuenta.
    var todas = [];
    var posiciones = {};
    datos.partidos.forEach(function (p) { posiciones[p.k] = []; });
    datos.temas.forEach(function (t, i) {
      todas = todas.concat(puntuaciones[i]);
      datos.partidos.forEach(function (p) { posiciones[p.k] = posiciones[p.k].concat(t.v[p.k]); });
    });
    var general = datos.partidos.map(function (p) {
      return { k: p.k, n: p.n, parecido: parecido(todas, posiciones[p.k]) };
    });
    var mejorGeneral = conCifra(general).reduce(function (m, p) { return m === null || p.parecido > m.parecido ? p : m; }, null);

    return { temas: temas, general: general, mejorGeneral: mejorGeneral };
  }

  /**
   * La frase de conjunto. Si el primero y el segundo distan 2 puntos o menos, se dice que están casi empatados:
   * con figuras al azar eso pasa casi siempre, y un ganador único sería una precisión falsa.
   * Lo usan la pantalla de resultado, la figura publicada y el correo, para que digan lo mismo.
   */
  function frasePrincipal(general, sujeto) {
    var ord = conCifra(general || []).slice().sort(function (a, b) { return b.parecido - a.parecido; });
    if (!ord.length) return 'Todavía no hay aspectos que comparar: deja alguno distinto de 0.';
    var a = ord[0], b = ord[1];
    if (b && a.parecido - b.parecido <= 2) {
      return 'En conjunto, ' + a.n + ' (' + a.parecido + ' %) y ' + b.n + ' (' + b.parecido + ' %) quedan casi empatados como lo más parecido a ' + sujeto + '.';
    }
    return 'En conjunto, lo que más se parece a ' + sujeto + ' es ' + a.n + ' (' + a.parecido + ' %).';
  }

  // ORDEN DE LOS ASPECTOS (2026-11-19). La versión 1 guardaba cada valor según la posición del aspecto
  // en la lista de antes. PERMUTACION_V2[t][p] = índice ANTIGUO del aspecto que hoy está en la posición p
  // del tema t (t en el orden de datos.temas). Lo que se guardó con el orden antiguo se convierte con
  // `aOrdenNuevo`. La misma tabla está en la página de la geometría (ORDEN_ANTERIOR): si cambia una, cambia la otra.
  var PERMUTACION_V2 = [
    [1, 0, 7, 6, 3, 5, 4, 2], // inm
    [4, 6, 5, 3, 1, 7, 0, 2], // ser
    [5, 4, 3, 1, 2, 0], // eco
    [2, 5, 3, 4, 1, 0], // tra
    [3, 2, 4, 5, 1, 0], // viv
    [2, 5, 4, 3, 1, 0], // amb
    [2, 1, 4, 3, 5, 0], // ter
    [5, 4, 3, 2, 1, 0], // der
    [0, 2, 3, 1, 5, 4], // ins
    [5, 0, 4, 1, 3, 2], // ext
  ];
  // Recibe una matriz por tema (la forma de `puntuaciones`, o de `v` y `m` en el borrador) y la devuelve en el orden nuevo.
  function aOrdenNuevo(matrices) {
    return matrices.map(function (fila, t) {
      return PERMUTACION_V2[t].map(function (o) { return fila[o]; });
    });
  }

  return {
    UMBRAL: UMBRAL,
    NOMBRE_NIVEL: NOMBRE_NIVEL,
    nivelDe: nivelDe,
    alcanza: alcanza,
    etiquetaDe: etiquetaDe,
    parecido: parecido,
    conCifra: conCifra,
    figuraValida: figuraValida,
    resumen: resumen,
    frasePrincipal: frasePrincipal,
    aOrdenNuevo: aOrdenNuevo,
    PERMUTACION_V2: PERMUTACION_V2,
  };
});
