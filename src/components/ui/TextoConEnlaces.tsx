import { Fragment } from 'react';
import { cn } from '../../utils/cn';

// ============================================================================
// UN ENLACE PEGADO SE VE Y SE PULSA (2026-08-26)
// ============================================================================
// Eugenio: «haz que cuando se pega un enlace en la plataforma, este se pueda
// hacer click y salga en un azulito con subrayado».
//
// Hasta hoy una dirección pegada en una publicación, un mensaje o una tarjeta
// era texto gris igual que el resto: no se distinguía y no se podía pulsar. Y
// no es un detalle estético — un enlace que no se puede pulsar obliga a
// seleccionarlo con el ratón, copiarlo y pegarlo en otro sitio, que es
// exactamente el trabajo que un enlace existe para ahorrar.
//
// ── SE PINTA, NO SE GUARDA ─────────────────────────────────────────────────
// El texto se guarda tal cual lo escribió su autor. Esto sólo lo PINTA. Guardar
// HTML con etiquetas dentro habría convertido cada mensaje en algo que hay que
// desinfectar antes de enseñar, y un `dangerouslySetInnerHTML` alimentado por
// lo que escribe cualquiera es la forma clásica de que alguien meta un script
// en el muro de otro. Aquí no hay HTML: hay trozos de texto y elementos
// React, que no pueden ejecutar nada.
//
// ── Y AL PULSARLO SE ABRE EL NAVEGADOR DE LA PLATAFORMA ────────────────────
// No hace falta nada aquí para eso: `GestorVentanas` intercepta el clic de
// cualquier enlace externo de la aplicación. Escribirlo también aquí sería una
// segunda regla sobre lo mismo, y el día que una de las dos cambie, un enlace
// se comportaría distinto según en qué pantalla esté.

/*
 * ── LA EXPRESIÓN ───────────────────────────────────────────────────────────
 * Dos formas: la dirección entera (`https://…`) y la abreviada (`www.…`), que
 * es como la gente escribe cuando no copia y pega.
 *
 * El final es lo delicado. Una dirección al final de una frase se lleva por
 * delante el punto —«mira https://humanity.wiki.»— y un paréntesis de cierre
 * cuando va entre paréntesis. Por eso el último carácter no puede ser de
 * puntuación: se corta y se devuelve al texto, donde estaba.
 */
const ENLACE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

/** Le devuelve al texto la puntuación que la expresión se llevó al final. */
function partirCola(bruto: string): [string, string] {
  let url = bruto;
  let cola = '';
  /*
   * LOS PARÉNTESIS SE CUENTAN, Y SOBRE LA DIRECCIÓN ENTERA. `(…)` dentro de una
   * dirección de la Wikipedia es parte de la dirección y cortarlo la rompe;
   * pero el `)` de «(mira https://…)» no lo es y llevárselo rompe el enlace.
   * Lo que los distingue es si ese paréntesis tiene pareja DENTRO de la
   * dirección:
   *
   *   …/Foo_(bar)  → 1 abre, 1 cierra → es suyo, se queda
   *   …/Bicicleta) → 0 abre, 1 cierra → es de la frase, se devuelve
   *
   * La primera versión contaba sobre la dirección SIN ese paréntesis, y
   * entonces los dos casos daban «equilibrado» y el enlace se llevaba el
   * paréntesis de la frase. Lo vi en pantalla, no compilando.
   */
  const suyoEsElParentesis = (s: string) =>
    (s.match(/\(/g) || []).length >= (s.match(/\)/g) || []).length;
  while (url.length > 1) {
    const ultimo = url[url.length - 1];
    if (')' === ultimo && suyoEsElParentesis(url)) break;
    if (!'.,;:!?)]}»"\''.includes(ultimo)) break;
    cola = ultimo + cola;
    url = url.slice(0, -1);
  }
  return [url, cola];
}

export default function TextoConEnlaces({ texto, className }: {
  texto: string;
  /** Las clases del párrafo que lo envuelve, para que quien lo use no pierda
   *  el tamaño ni el color que ya tenía su texto. */
  className?: string;
}) {
  if (!texto) return null;

  const trozos = texto.split(ENLACE);

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {trozos.map((t, i) => {
        // `split` con un grupo de captura devuelve los enlaces en las
        // posiciones impares. Es lo que evita tener que buscar dos veces.
        if (i % 2 === 0 || !t) return <Fragment key={i}>{t}</Fragment>;
        const [url, cola] = partirCola(t);
        const href = url.startsWith('www.') ? `https://${url}` : url;
        return (
          <Fragment key={i}>
            <a
              href={href}
              // `noreferrer` además de `noopener`: la página de destino no tiene
              // por qué saber desde qué pantalla de la plataforma vienes.
              rel="noopener noreferrer"
              target="_blank"
              className="text-sky-600 underline decoration-sky-300 underline-offset-2 hover:text-sky-800 hover:decoration-sky-500 break-words"
            >
              {url}
            </a>
            {cola}
          </Fragment>
        );
      })}
    </span>
  );
}
