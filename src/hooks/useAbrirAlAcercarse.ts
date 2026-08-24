import { useEffect, useRef, type RefObject } from 'react';

// ============================================================================
// ABRIR ALGO AL ACERCAR EL RATÓN — un solo sitio para todos (2026-08-24)
// ============================================================================
// Eugenio pidió, en tres mensajes distintos, que se abran solas cinco cosas al
// pasar el ratón: el menú lateral izquierdo desde el borde, el derecho desde su
// borde, los tres menús de la barra desde sus botones, y la vista previa del
// calendario.
//
// ── POR QUÉ ESTO ES UN SITIO Y NO CINCO ─────────────────────────────────────
// Si cada uno pone su retardo, su zona y su forma de cerrarse, quien usa la
// aplicación aprende un gesto y le fallan los otros cuatro: uno se abre
// enseguida, otro tarda, otro se queda abierto, otro se cierra antes de llegar.
// Y todos se abren cuando cruzas la pantalla para ir a otra cosa.
//
// Aquí se decide UNA VEZ, y las cinco lo usan.
//
// ── LO QUE HACE QUE ESTO NO MOLESTE ─────────────────────────────────────────
// Abrir por acercarse es cómodo si acierta y odioso si falla. Tres cosas lo
// separan:
//
//   1. UN RETARDO ANTES DE ABRIR. Sin él se abre al cruzar de camino a otro
//      sitio: al ir a por la barra de desplazamiento, al volver de otra ventana,
//      al mover el ratón en diagonal. 150 ms no se notan al querer entrar y
//      bastan para no abrirse al pasar de largo.
//
//   2. UN RETARDO MÁS LARGO ANTES DE CERRAR. Lo que se abre suele estar al lado,
//      no debajo: al ir hacia el menú el ratón sale un instante del botón. Si se
//      cierra al instante, es imposible llegar. Cerrar más despacio que abrir no
//      es una asimetría caprichosa: es la única forma de que se pueda usar.
//
//   3. NADA DE ESTO CON EL DEDO. En una pantalla táctil no existe «acercarse»:
//      el primer toque sería a la vez abrir y pulsar. Se desactiva solo.

export type OpcionesDeAcercarse = {
  /** Cuánto esperar antes de abrir. Ver la nota 1. */
  msAbrir?: number;
  /** Cuánto esperar antes de cerrar. Más que el de abrir, ver la nota 2. */
  msCerrar?: number;
  /** Si ya está abierto, no se vuelve a abrir ni se programa nada. */
  abierto?: boolean;
  /** Apagarlo sin desmontarlo: en móvil, mientras se arrastra algo, etc. */
  activo?: boolean;
};

const ABRIR = 150;
const CERRAR = 400;

/**
 * ¿Estamos en algo que se toca con el dedo?
 *
 * `hover: none` es la pregunta correcta y no «¿es un móvil?»: hay tabletas con
 * ratón y portátiles con pantalla táctil, y lo que importa es si el aparato
 * sabe estar «encima de» algo sin pulsarlo.
 */
export function hayRaton(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Devuelve los manejadores para poner en un elemento: al entrar el ratón abre
 * tras un momento, al salir cierra tras un momento algo más largo.
 *
 *   const gesto = useAbrirAlAcercarse(() => setAbierto(true), () => setAbierto(false));
 *   <button {...gesto}>…</button>
 */
export function useAbrirAlAcercarse(
  abrir: () => void,
  cerrar: () => void,
  o: OpcionesDeAcercarse = {},
) {
  const reloj = useRef<number | null>(null);
  const abrirRef = useRef(abrir);
  const cerrarRef = useRef(cerrar);
  abrirRef.current = abrir;
  cerrarRef.current = cerrar;

  const parar = () => {
    if (reloj.current !== null) { window.clearTimeout(reloj.current); reloj.current = null; }
  };

  // Un temporizador vivo cuando el componente desaparece dispara sobre algo que
  // ya no está. Se limpia siempre.
  useEffect(() => parar, []);

  const activo = o.activo !== false && hayRaton();
  if (!activo) return {};

  return {
    onMouseEnter: () => {
      parar();
      if (o.abierto) return;
      reloj.current = window.setTimeout(() => abrirRef.current(), o.msAbrir ?? ABRIR);
    },
    onMouseLeave: () => {
      parar();
      reloj.current = window.setTimeout(() => cerrarRef.current(), o.msCerrar ?? CERRAR);
    },
  };
}

/**
 * Lo mismo, pero desde el BORDE de la pantalla y sin nada que señalar.
 *
 * Eugenio: «cuando el ratón esté muy cercano al borde izquierdo se abra el menú
 * lateral izquierdo, y lo mismo con el derecho».
 *
 * ── POR QUÉ SE ESCUCHA LA PANTALLA ENTERA ───────────────────────────────────
 * No hay ningún elemento en el borde al que colgarle un `onMouseEnter`: el
 * borde es un sitio, no una cosa. Así que se mira dónde está el ratón, y para
 * que eso no cueste caro se compara un número y se sale.
 *
 * ── LA FRANJA ES ESTRECHA A PROPÓSITO ───────────────────────────────────────
 * 8 píxeles. Con una franja ancha el menú se abre al usar cualquier cosa que
 * viva pegada a ese lado, y sobre todo **al ir a por la barra de
 * desplazamiento**, que está justo en el borde derecho. Ocho píxeles obligan a
 * ir al borde de verdad.
 *
 * ── Y SÓLO SI EL RATÓN VIENE DE FUERA DE LA FRANJA ──────────────────────────
 * Si no, al cerrar el menú con el ratón todavía en el borde se volvería a abrir
 * solo, y la única salida sería apartar el ratón — que es exactamente la clase
 * de cosa que hace que alguien odie una función.
 */
export function useAbrirDesdeElBorde(
  lado: 'izquierda' | 'derecha',
  abrir: () => void,
  o: { anchoPx?: number; ms?: number; abierto?: boolean; activo?: boolean } = {},
) {
  const reloj = useRef<number | null>(null);
  const dentro = useRef(false);
  const abrirRef = useRef(abrir);
  abrirRef.current = abrir;
  const abiertoRef = useRef(!!o.abierto);
  abiertoRef.current = !!o.abierto;

  useEffect(() => {
    if (o.activo === false || !hayRaton()) return;
    const ancho = o.anchoPx ?? 8;
    const espera = o.ms ?? 150;

    const mover = (e: MouseEvent) => {
      const enLaFranja = lado === 'izquierda'
        ? e.clientX <= ancho
        : e.clientX >= window.innerWidth - ancho;

      if (!enLaFranja) {
        dentro.current = false;
        if (reloj.current !== null) { window.clearTimeout(reloj.current); reloj.current = null; }
        return;
      }
      // Ya estaba en la franja: no se reabre. Ver la nota de arriba.
      if (dentro.current || abiertoRef.current) return;
      dentro.current = true;
      reloj.current = window.setTimeout(() => {
        if (!abiertoRef.current) abrirRef.current();
      }, espera);
    };

    // `passive`: este manejador no llama a `preventDefault`, y decírselo al
    // navegador le deja no esperar a que termine antes de desplazar la página.
    window.addEventListener('mousemove', mover, { passive: true });
    return () => {
      window.removeEventListener('mousemove', mover);
      if (reloj.current !== null) window.clearTimeout(reloj.current);
    };
  }, [lado, o.anchoPx, o.ms, o.activo]);
}

/**
 * CERRAR AL ALEJARSE — cuando lo que se abrió no está pegado a lo que lo abrió.
 *
 * ── POR QUÉ NO VALE UN `onMouseLeave` ──────────────────────────────────────
 * Probado en el navegador el 2026-08-24, y por eso existe esto: se pasa el
 * ratón por el círculo de «Explorar», que está abajo en el centro, y el menú
 * aparece pegado al borde izquierdo. Si desde el círculo el ratón se va a
 * cualquier otro sitio de la pantalla **nunca entra en el menú**, así que el
 * `onMouseLeave` del menú no se dispara jamás y el menú se queda abierto para
 * siempre. Un menú que sólo sabe cerrarse si primero lo visitas es un menú que
 * no se cierra.
 *
 * Lo que hay que preguntar no es «¿ha salido de esta caja?» sino «¿sigue el
 * ratón en alguno de los sitios que cuentan?» — el menú o el botón que lo abre.
 * Eso se contesta mirando dónde está el ratón, que es lo que hace esto.
 *
 * ── Y SE PREGUNTA POR PERTENENCIA, NO POR COORDENADAS ──────────────────────
 * `contains` en vez de comparar rectángulos: los tres círculos viven dentro de
 * una tira que ocupa TODO el ancho de la pantalla y no deja pasar el ratón
 * salvo en los botones. Con rectángulos, recorrer la parte de abajo de la
 * pantalla mantendría el menú abierto sin tocar nada.
 */
export function useCerrarAlAlejarse(
  activo: boolean,
  zonas: Array<RefObject<HTMLElement | null>>,
  cerrar: () => void,
  ms = 400,
) {
  const reloj = useRef<number | null>(null);
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  const zonasRef = useRef(zonas);
  zonasRef.current = zonas;

  useEffect(() => {
    if (!activo || !hayRaton()) return;
    const parar = () => {
      if (reloj.current !== null) { window.clearTimeout(reloj.current); reloj.current = null; }
    };
    const mover = (e: MouseEvent) => {
      const donde = e.target as Node | null;
      const dentro = !!donde && zonasRef.current.some(z => z.current?.contains(donde));
      if (dentro) { parar(); return; }
      // Ya hay una cuenta atrás en marcha: no se reinicia con cada píxel, o
      // moverse despacio por fuera la aplazaría indefinidamente.
      if (reloj.current !== null) return;
      reloj.current = window.setTimeout(() => { reloj.current = null; cerrarRef.current(); }, ms);
    };
    window.addEventListener('mousemove', mover, { passive: true });
    return () => { window.removeEventListener('mousemove', mover); parar(); };
  }, [activo, ms]);
}

export default useAbrirAlAcercarse;
