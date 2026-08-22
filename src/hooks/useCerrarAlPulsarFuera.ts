// ============================================================================
// CERRAR AL PULSAR FUERA (2026-08-22)
// ============================================================================
// Estaba escrito SIETE veces: `AdminMenu`, `GlobalSearch`, `Layout`,
// `BarraElemento`, `Campana` y dos en `Navegador`. Y lo interesante no es que
// se repitiera, es que las siete copias NO hacían lo mismo:
//
//   · Seis escuchaban `mousedown` en `document`; `Campana` escuchaba `click`
//     en `window`, que se dispara DESPUÉS de soltar el botón — con lo que el
//     propio clic que abre el panel podía volver a cerrarlo.
//   · Solo `GlobalSearch` cerraba con Escape. Las otras seis no: se abría un
//     menú y la tecla que todo el mundo usa para salir no hacía nada.
//   · Ninguna se desenganchaba al cerrarse. Seis oyentes globales vivos
//     durante toda la sesión, comprobando en cada pulsación si hay que cerrar
//     algo que ya está cerrado.
//
// Cuando siete copias divergen, la pregunta ya no es cuál es la buena: es que
// no hay ninguna. Este es el comportamiento que queda para todas.
//
// ── POR QUÉ `pointerdown` Y NO `mousedown` ─────────────────────────────────
// Porque `pointerdown` cubre también el dedo. Con `mousedown`, en un móvil el
// menú no se cierra hasta que el navegador se inventa el evento de ratón
// después del toque, y en la plataforma hay pantallas pensadas para el
// teléfono. Un solo evento para las dos formas de señalar.
//
// ── POR QUÉ SE ENGANCHA SOLO CUANDO ESTÁ ABIERTO ───────────────────────────
// Un desplegable cerrado no tiene nada que cerrar. Y además evita el fallo de
// `Campana`: el oyente se añade en el efecto que corre DESPUÉS de que React
// haya pintado la apertura, así que el gesto que abrió no puede cerrarlo.
import { useEffect, useRef, type RefObject } from 'react';

export function useCerrarAlPulsarFuera(
  /** La caja que NO cierra: pulsar dentro de ella no hace nada. Admite varias
   *  (un botón y su menú flotante, por ejemplo, cuando no cuelgan del mismo
   *  nodo). Las referencias vacías se ignoran. */
  cajas: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>,
  /** Si no está abierto, esto no engancha nada. */
  abierto: boolean,
  cerrar: () => void,
  opciones?: {
    /** Escape cierra. Por defecto sí — es lo que espera cualquiera. Ponlo a
     *  `false` solo si algo por debajo ya usa Escape para otra cosa. */
    conEscape?: boolean;
  },
) {
  // La función de cerrar se guarda en una referencia para no volver a
  // enganchar y desenganchar los oyentes en cada pintado solo porque quien
  // llama pasa una función nueva cada vez.
  const alCerrar = useRef(cerrar);
  alCerrar.current = cerrar;

  const conEscape = opciones?.conEscape !== false;
  const lista = Array.isArray(cajas) ? cajas : [cajas];
  // Las referencias son objetos estables; lo que cambia es su `.current`. Se
  // guardan también en una referencia para que el efecto dependa de `abierto`
  // y no del array nuevo que crea cada pintado.
  const listaRef = useRef(lista);
  listaRef.current = lista;

  useEffect(() => {
    if (!abierto) return;

    const fuera = (e: Event) => {
      const destino = e.target as Node | null;
      if (!destino) return;
      // DENTRO DE CUALQUIERA DE LAS CAJAS NO CIERRA. Si ninguna existe todavía
      // tampoco se cierra: sin caja no se puede saber si el gesto fue fuera, y
      // cerrar por si acaso haría desaparecer menús al azar durante el primer
      // pintado.
      const cajasVivas = listaRef.current.map(r => r.current).filter(Boolean) as HTMLElement[];
      if (!cajasVivas.length) return;
      if (cajasVivas.some(c => c.contains(destino))) return;
      alCerrar.current();
    };

    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar.current();
    };

    document.addEventListener('pointerdown', fuera);
    if (conEscape) document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      if (conEscape) document.removeEventListener('keydown', tecla);
    };
  }, [abierto, conEscape]);
}

export default useCerrarAlPulsarFuera;
