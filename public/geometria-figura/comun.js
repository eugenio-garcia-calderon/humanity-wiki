/*
 * LA MISMA CUENTA EN EL NAVEGADOR Y EN EL SERVIDOR (2026-11-19)
 * ----------------------------------------------------------------
 * Estas funciones son la única definición de «qué nivel alcanza un aspecto» y de
 * «cuánto se parece una figura a un partido». La usan la página del test (lo que
 * ve la persona) y el servidor (el correo de resultados), así que nunca pueden
 * decir cosas distintas.
 *
 * Son las mismas reglas que la página de la geometría (`observatorio-polarizacion/index.html`):
 *   - CINCO NIVELES por aspecto (2026-11-25): 0 Antisistema, 1 Básico, 2 Intermedio, 3 Avanzado, 4 Ideal.
 *     El valor de cada aspecto ES su nivel; no hay posiciones intermedias.
 *   - Parecido = 100 − (diferencia media de nivel por aspecto) × 25, redondeado. Cuentan todos los aspectos.
 *   - Lo guardado antes de ese día iba de 0 a 10: se convierte con `aNiveles` (los cortes de entonces).
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

  var NOMBRE_NIVEL = ['Antisistema', 'Básico', 'Intermedio', 'Avanzado', 'Ideal'];
  var NMAX = NOMBRE_NIVEL.length - 1;
  // Un umbral por nivel, en la misma escala (se conserva el nombre por quien lo usa para dibujar los anillos)
  var UMBRAL = [0, 1, 2, 3, 4];

  /** El nivel de un valor, de 0 (antisistema) a 4 (ideal). */
  function nivelDe(x) {
    return Math.max(0, Math.min(NMAX, Math.floor(x + 0.01)));
  }

  /** ¿Llega el valor al nivel k? */
  function alcanza(x, k) {
    return x >= k - 0.01;
  }

  /** La etiqueta que se lee junto a cada deslizador. */
  function etiquetaDe(x) {
    return NOMBRE_NIVEL[nivelDe(x)];
  }

  /** De la escala de antes (0 a 10) al nivel: hasta 3, antisistema; 4 a 6, básico; 7 a 9, intermedio; 10, avanzado. */
  function nivelDeCifra(x) {
    return x >= 10 ? 3 : x >= 7 ? 2 : x >= 4 ? 1 : 0;
  }
  /** Convierte una matriz por tema guardada de 0 a 10 (figuras con `orden` 1 o 2, borradores v1 y v2). */
  function aNiveles(matrices) {
    return matrices.map(function (fila) { return fila.map(nivelDeCifra); });
  }

  /**
   * Parecido entre la figura `a` y un partido `b`, de 0 a 100. Cuentan todos los aspectos:
   * el nivel 0 (antisistema) es una posición como las demás.
   * Devuelve null si no hay ningún aspecto que comparar.
   */
  function parecido(a, b) {
    if (!a || !b || a.length !== b.length || a.length === 0) return null;
    var suma = 0;
    for (var i = 0; i < a.length; i++) suma += Math.abs(a[i] - b[i]);
    return Math.round(100 - (suma / a.length) * 25);
  }

  /** Los partidos con cifra, de más a menos parecidos. Los que no tienen cifra quedan fuera. */
  function conCifra(lista) {
    return lista.filter(function (p) { return p.parecido !== null; });
  }

  /** ¿Tiene la figura la forma de los datos? `puntuaciones[i]` es un array de niveles de 0 a 4 por tema. */
  function figuraValida(puntuaciones, datos) {
    if (!Array.isArray(puntuaciones) || puntuaciones.length !== datos.temas.length) return false;
    for (var i = 0; i < datos.temas.length; i++) {
      var fila = puntuaciones[i];
      if (!Array.isArray(fila) || fila.length !== datos.temas[i].ejes.length) return false;
      for (var j = 0; j < fila.length; j++) {
        var x = fila[j];
        if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x > NMAX) return false;
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
      // cuenta[k]: cuántos aspectos LLEGAN al nivel k (acumulado); en[k]: cuántos SE QUEDAN en él
      var cuenta = [0, 0, 0, 0, 0], en = [0, 0, 0, 0, 0];
      fila.forEach(function (x) {
        for (var k = 0; k <= NMAX; k++) if (alcanza(x, k)) cuenta[k]++;
        en[nivelDe(x)]++;
      });
      var parecidos = datos.partidos.map(function (p) {
        return { k: p.k, n: p.n, parecido: parecido(fila, t.v[p.k]) };
      });
      var mejor = conCifra(parecidos).reduce(function (m, p) { return m === null || p.parecido > m.parecido ? p : m; }, null);
      return {
        k: t.k,
        n: t.n,
        aspectos: fila.length,
        antisistema: en[0],
        basico: cuenta[1],
        intermedio: cuenta[2],
        avanzado: cuenta[3],
        ideal: cuenta[4],
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
    if (!ord.length) return 'Todavía no hay aspectos que comparar.';
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
    NMAX: NMAX,
    aNiveles: aNiveles,
    nivelDeCifra: nivelDeCifra,
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
