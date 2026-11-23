/* Revisión de una figura antes de publicarla.
 *
 * Son reglas fijas sobre la FORMA de la figura: si un tema está todo en 0 o en 10, si
 * dos temas son idénticos, si casi todo está en los extremos. No juzga las ideas de quien
 * la dibuja ni dice si una posición es buena o mala. No es una inteligencia artificial:
 * para la misma figura, siempre sale la misma revisión.
 *
 * revisar(v, datos) -> [{ tipo: 'aviso' | 'sugerencia', tema: índice o null, titulo, texto }]
 */
(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  else raiz.RevisorFiguras = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Si más del 80 % de los valores están en 0 o en 10, la figura queda en blanco o negro.
  var UMBRAL_EXTREMOS = 0.8;

  function iguales(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function revisar(v, datos) {
    var temas = datos.temas;
    var todos = [];
    v.forEach(function (fila) { todos = todos.concat(fila); });

    // Figura entera en un mismo valor: un solo aviso, no uno por tema.
    var todoIgual = todos.every(function (x) { return x === todos[0]; });
    if (todos.length && todoIgual && todos[0] === 0) {
      return [{ tipo: 'aviso', tema: null, titulo: 'La figura está en 0 en todo',
        texto: 'No has marcado ninguna posición por encima de lo nulo. Una figura así no dice nada de tu opinión. Empieza por los temas que más te importan.' }];
    }
    if (todos.length && todoIgual && todos[0] === 10) {
      return [{ tipo: 'sugerencia', tema: null, titulo: 'La figura está en 10 en todo',
        texto: 'Todos los aspectos de todos los temas están en lo más avanzado. ¿De verdad todo merece la misma nota? Baja los que matices.' }];
    }

    var items = [];
    temas.forEach(function (t, i) {
      var fila = v[i];
      var nombre = t.n;
      var min = Math.min.apply(null, fila);
      var max = Math.max.apply(null, fila);

      if (max === min && min === 0) {
        items.push({ tipo: 'aviso', tema: i, titulo: 'Todo «' + nombre + '» está en 0',
          texto: 'Ningún aspecto de este tema pasa de lo nulo. Si es tu posición, la figura lo dice; si no, marca al menos los aspectos que te importan.' });
      } else if (max === min && min === 10) {
        items.push({ tipo: 'sugerencia', tema: i, titulo: 'Todo «' + nombre + '» está en 10',
          texto: 'Todos los aspectos están en lo más avanzado. ¿Todos merecen la misma nota? Mira cuál bajarías.' });
      } else if (max === min) {
        items.push({ tipo: 'sugerencia', tema: i, titulo: '«' + nombre + '» sale como un círculo',
          texto: 'Todos los aspectos valen ' + min + '. La figura no dice qué te importa más en este tema. Sube unos y baja otros.' });
      }
    });

    // Dos temas con exactamente los mismos valores suelen ser un copia y pega.
    for (var a = 0; a < temas.length; a++) {
      for (var b = a + 1; b < temas.length; b++) {
        if (iguales(v[a], v[b]) && Math.max.apply(null, v[a]) !== Math.min.apply(null, v[a])) {
          items.push({ tipo: 'aviso', tema: b, titulo: '«' + temas[a].n + '» y «' + temas[b].n + '» son iguales',
            texto: 'Tienen los mismos valores aspecto por aspecto. Si no es lo que quieres decir, cambia alguno de los dos temas.' });
        }
      }
    }

    var extremos = todos.filter(function (x) { return x === 0 || x === 10; }).length;
    if (todos.length && extremos / todos.length > UMBRAL_EXTREMOS) {
      items.push({ tipo: 'sugerencia', tema: null, titulo: 'Casi todo está en los extremos',
        texto: 'Más del 80 % de los valores están en 0 o en 10. Los puntos intermedios son los que más matizan: ¿hay aspectos donde tu postura es más tibia?' });
    }

    return items;
  }

  return { revisar: revisar };
});
