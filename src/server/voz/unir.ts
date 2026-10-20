// ============================================================================
// UNIR LO QUE DEVUELVE EL TRANSCRIPTOR (2026-10-20, reescrito)
// ============================================================================
// Eugenio: «dices una frase y la escribe dos veces; sigues hablando y la vuelve
// a escribir hasta tres, cuatro veces, aunque ya estés hablando de otra cosa».
//
// El transcriptor no es constante: unas veces manda SOLO la frase de ahora,
// otras TODO lo dicho desde el principio, otras repite la última frase ya
// cerrada, y al repetir CORRIGE palabras («bicicletas» → «bici», una coma, una
// mayúscula). La versión anterior sólo reconocía el texto entero si empezaba
// exactamente por lo ya escrito; con una sola palabra corregida no lo
// reconocía, lo añadía detrás… y cada reenvío duplicaba otra vez todo.
//
// Ahora se compara por PALABRAS (sin tildes, mayúsculas ni signos) y con
// tolerancia: si lo nuevo encaja con el final de lo escrito —desde cualquier
// punto, aunque cambien algunas palabras—, lo nuevo SUSTITUYE ese final; si no
// encaja con nada, es una frase nueva y va detrás.

const normal = (p: string) => p.normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
/** Espacio tras el punto si dos frases vienen pegadas, y espacios simples. */
// Y dos palabras pegadas por el transcriptor («cosaCambia»): espacio entre una
// minúscula (tras al menos tres) y una mayúscula que empieza palabra.
export const limpio = (t: string) => t
  .replace(/([.!?…;:,])(?=\p{L})/gu, '$1 ')
  .replace(/(\p{Ll}{3})(\p{Lu}\p{Ll})/gu, '$1 $2')
  .replace(/(\p{N})(\p{Lu}\p{Ll})/gu, '$1 $2')
  .replace(/\s+/g, ' ').trim();

const palabras = (t: string) => limpio(t).split(' ').filter(Boolean);

/** Cuántas palabras de `a` y `b` coinciden en orden (subsecuencia común más larga). */
function comunes(a: string[], b: string[]): number {
  const n = a.length, m = b.length;
  if (!n || !m) return 0;
  let prev = new Array(m + 1).fill(0), cur = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[m];
}

/**
 * Lo ya escrito más un texto nuevo del transcriptor: el texto entero que
 * debe verse.
 */
export function unir(escrito: string, nuevo: string): string {
  const N = palabras(nuevo);
  if (!N.length) return limpio(escrito);
  const C = palabras(escrito);
  if (!C.length) return N.join(' ');
  const c = C.map(normal), n = N.map(normal);

  // 1. ¿Lo nuevo es un trozo de lo escrito desde la posición k, con alguna
  //    palabra cambiada? Se busca el k más temprano (el solape más largo). Sólo
  //    se miran las últimas 400 palabras: más atrás no reescribe nadie.
  const desde = Math.max(0, C.length - 400);
  for (let k = desde; k < C.length; k++) {
    const cola = c.slice(k);
    // Las últimas una o dos palabras, repetidas tal cual al empezar lo nuevo
    // («…para la» + «la sostenible…»): no se duplican.
    if (cola.length <= 2 && n.length > cola.length && cola.every((w, i) => w === n[i])) return [...C.slice(0, k), ...N].join(' ');
    // El solape tiene que arrancar cerca del principio de lo nuevo.
    if (!n.slice(0, 3).includes(cola[0])) continue;
    const largo = Math.min(cola.length, n.length);
    const tramoC = cola.slice(0, largo + 2), tramoN = n.slice(0, largo + 2);
    const iguales = comunes(tramoC, tramoN);
    // Solape fiable: casi todo lo que se superpone coincide, y no es una sola
    // palabra corta que aparece por casualidad.
    const minimo = cola.length >= 3 ? 3 : cola.length;
    if (iguales >= minimo && iguales >= 0.7 * Math.min(cola.length, n.length) && (iguales >= 2 || (cola[0]?.length || 0) >= 4)) {
      // Lo nuevo es más corto que lo que ya había a partir de k (una frase
      // repetida en medio): no se pierde lo de después.
      if (n.length < cola.length && iguales >= 0.7 * n.length && comunes(cola.slice(0, n.length + 2), n) >= 0.7 * n.length && cola.length - n.length > 2) {
        return C.join(' ');
      }
      return [...C.slice(0, k), ...N].join(' ');
    }
  }
  // 2. Una frase nueva: detrás.
  return [...C, ...N].join(' ');
}
