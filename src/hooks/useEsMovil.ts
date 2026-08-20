import { useEffect, useState } from 'react';

// ============================================================================
// ¿ESTAMOS EN UN MÓVIL? UN SOLO SITIO LO DECIDE (2026-08-20, Fase móvil)
// ============================================================================
// El listón que ha puesto Eugenio es un iPhone 12 con Chrome: 390×844 puntos.
// La plataforma está construida sobre una metáfora de escritorio (ventanas que
// se arrastran, barra lateral de 240 px, tableros de varias columnas) y nada de
// eso cabe ahí. Lo que se hace NO es traducir el escritorio: es tener una rama
// móvil de ese comportamiento, y el escritorio se queda exactamente como está.
//
// POR QUÉ UN HOOK Y NO UN CONTEXTO: esto lo van a preguntar tres o cuatro
// sitios (la barra lateral, el gestor de ventanas, el armazón). `matchMedia`
// ya es un valor compartido del navegador y cada instancia cuesta un listener;
// un contexto añadiría un proveedor y un re-render de toda la app para ahorrar
// tres listeners. Si algún día lo preguntan veinte sitios, se sube a contexto.
//
// POR QUÉ ANCHURA Y NO EL USER-AGENT: lo que rompe la maqueta son los píxeles,
// no la marca del aparato. Una ventana de escritorio estrechada a 500 px sufre
// exactamente lo mismo que un teléfono, y así se puede probar sin un teléfono.

/** El punto de ruptura, en píxeles CSS. Es el `md` de Tailwind, para que las
 *  clases `md:` del resto del proyecto y esta decisión digan lo mismo: por
 *  debajo de 768 no cabe la barra lateral de 240 px sin comerse la pantalla. */
export const ANCHO_MOVIL = 768;

/** Y el alto, que es lo que delata a UN TELÉFONO GIRADO (2026-08-21).
 *
 *  Sin esto había un agujero, y lo encontré probando el Mundo 3D: un iPhone 12
 *  en apaisado mide 844×390. Son 844 de ancho, o sea POR ENCIMA de 768, así
 *  que la plataforma se creía en un ordenador, devolvía la barra lateral de
 *  240 px y dejaba el mundo en 332. Girar el teléfono deshacía el arreglo
 *  entero.
 *
 *  Ningún ordenador tiene 390 px de alto; ningún teléfono en apaisado pasa de
 *  500. Una tableta apaisada (1024×768) se queda en escritorio, que es lo
 *  correcto: ahí la barra sí cabe.
 *
 *  LO QUE CUESTA: una ventana de escritorio muy ancha y muy baja (1400×450,
 *  que casi nadie tiene) también contará como móvil. El daño es pequeño —
 *  cajón en vez de columna, con el botón «Menú» a la vista— y la alternativa
 *  era añadir `(pointer: coarse)`, que aquí no se puede verificar porque este
 *  navegador no emula el puntero táctil por encima de 768 px de ancho. Entre
 *  arreglar el iPhone girado a ciertas y afinar un caso raro a ciegas, esto. */
export const ALTO_MOVIL = 500;

const CONSULTA = `(max-width: ${ANCHO_MOVIL - 1}px), (max-height: ${ALTO_MOVIL}px)`;

/**
 * `true` cuando la ventana es de ancho de móvil.
 *
 * Se recalcula al girar el teléfono o al estrechar la ventana del navegador,
 * así que un componente puede pasar de una rama a la otra en caliente. Lo que
 * NO puede hacer ninguna rama es borrar el estado de la otra: ver la nota de
 * `GestorVentanas` sobre las ventanas guardadas.
 */
export function useEsMovil(): boolean {
  const [esMovil, setEsMovil] = useState<boolean>(() => {
    // `typeof window` porque este hook también se importa desde módulos que se
    // evalúan fuera del navegador (las pruebas y el bundle del servidor).
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(CONSULTA).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(CONSULTA);
    const alCambiar = (e: MediaQueryListEvent) => setEsMovil(e.matches);
    // La foto inicial se toma en el `useState`, pero entre ese primer render y
    // este efecto la ventana ha podido cambiar (girar el teléfono durante la
    // carga). Se vuelve a leer para no quedarse con un valor de hace 200 ms.
    setEsMovil(mq.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  return esMovil;
}
