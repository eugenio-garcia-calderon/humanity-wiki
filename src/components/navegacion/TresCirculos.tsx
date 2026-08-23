import { useEffect } from 'react';
import { Compass, Plus, LayoutGrid } from 'lucide-react';
import { cn } from '../../utils/cn';

/*
 * LOS TRES CÍRCULOS (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Eugenio: «vamos a simplificar el diseño poniendo abajo del todo tres grandes
 * círculos flotantes que servirán para abrir tres menús distintos».
 *
 * TRES, Y CADA UNO ES UNA PREGUNTA DISTINTA:
 *
 *   · EXPLORAR   — «¿qué hay en el mundo?» → los 14 objetivos, a la izquierda.
 *   · CREAR      — «¿qué quiero hacer?»    → las herramientas, desde abajo.
 *   · ORGANIZAR  — «¿qué tengo yo?»        → tus cosas, a la derecha.
 *
 * Y **de dónde sale cada menú dice de qué va**: lo del mundo entra por la
 * izquierda, lo tuyo por la derecha, y lo que vas a hacer sube desde el propio
 * botón. Un menú que aparece siempre por el mismo sitio obliga a leer el título
 * para saber qué es; así se sabe antes de mirar.
 *
 * POR QUÉ SUSTITUYEN A LA BARRA DE CINCO. La anterior tenía Inicio, Proyectos,
 * buscar, Red y Crear: cinco destinos del mismo tamaño, o sea ninguna jerarquía.
 * Tres círculos grandes dicen que hay exactamente tres cosas que hacer aquí, y
 * el del medio —crear— es el más grande porque es a lo que se viene.
 *
 * FLOTANTES, sobre el contenido y no dentro de una barra: la barra ocupaba
 * altura siempre; esto flota encima y deja la página entera para la página.
 * El hueco de abajo lo sigue reservando `--hueco-muelle`, que ya usan las
 * pantallas para no esconder su última fila debajo.
 */

export type Circulo = 'explorar' | 'crear' | 'organizar';

export default function TresCirculos({ abierto, onPulsar }: {
  abierto: Circulo | null;
  onPulsar: (c: Circulo) => void;
}) {
  /*
   * QUIEN TAPA, RESERVA. Los círculos flotan sobre el contenido, así que sin
   * esto la última fila de cada página queda debajo de ellos y no se puede
   * pulsar. `--hueco-muelle` ya la usan todas las pantallas —la publicaba la
   * barra de cinco que estos sustituyen—, así que basta con seguir
   * publicándola desde aquí y ninguna página tiene que cambiar.
   *
   * 92 px: 64 del círculo grande, 14 de su palabra y el aire de abajo. Más
   * `env(safe-area-inset-bottom)`, que vale 0 en el navegador y ~34 px con la
   * aplicación instalada en un iPhone.
   */
  useEffect(() => {
    const raiz = document.documentElement;
    const movil = window.matchMedia('(max-width: 767px)');
    /*
     * SE VUELVE A CALCULAR AL CAMBIAR DE TAMAÑO (2026-08-24).
     *
     * La primera versión lo leía UNA vez, al montarse, y se quedaba con ese
     * número para siempre. Consecuencia medida: montado en una ventana
     * estrecha reservaba 70 px —el del móvil— y al ensanchar la ventana los
     * círculos crecían a 92 px pero el hueco seguía en 70, así que **la hoja de
     * Crear acababa 23 px por debajo del botón que la abre** y se le metía
     * detrás. Un valor que depende del tamaño y sólo se lee al arrancar es un
     * valor que miente en cuanto alguien gira el teléfono.
     */
    const publicar = () => {
      const alto = movil.matches ? 70 : 92;
      raiz.style.setProperty('--hueco-muelle', `calc(${alto}px + env(safe-area-inset-bottom))`);
      raiz.style.setProperty('--alto-circulos', `${alto}px`);
    };
    publicar();
    movil.addEventListener('change', publicar);
    return () => {
      movil.removeEventListener('change', publicar);
      raiz.style.setProperty('--hueco-muelle', '0px');
    };
  }, []);

  const boton = (c: Circulo, Icono: any, etiqueta: string, grande = false) => {
    const activo = abierto === c;
    return (
      <button
        onClick={() => onPulsar(c)}
        title={etiqueta}
        aria-label={etiqueta}
        aria-pressed={activo}
        className={cn(
          'pointer-events-auto flex flex-col items-center gap-1 transition-transform active:scale-95',
          grande ? 'mb-1' : '',
        )}
      >
        <span
          className={cn(
            'grid place-items-center rounded-full shadow-xl transition-all duration-200',
            // UN 25 % MÁS PEQUEÑOS EN EL MÓVIL (2026-08-23, Eugenio). Allí la
            // pantalla es lo escaso y tres círculos de 64 px se comen una
            // franja que hace falta para leer; en un ordenador sobra sitio y
            // grandes se aciertan mejor con el ratón.
            grande ? 'h-12 w-12 sm:h-16 sm:w-16' : 'h-[42px] w-[42px] sm:h-14 sm:w-14',
            activo
              ? 'bg-slate-900 text-white shadow-slate-900/40'
              : grande
                ? 'bg-emerald-600 text-white shadow-emerald-600/40 hover:bg-emerald-700'
                : 'bg-white text-slate-700 shadow-slate-400/30 hover:bg-slate-50',
          )}
        >
          <Icono className={grande ? 'h-5 w-5 sm:h-7 sm:w-7' : 'h-[18px] w-[18px] sm:h-6 sm:w-6'} />
        </span>
        {/* La palabra debajo y siempre visible: tres iconos sin texto son tres
            adivinanzas, y ésta es la barra de la que cuelga todo. */}
        <span className={cn('text-[9px] font-black uppercase tracking-wider sm:text-[10px]',
          activo ? 'text-slate-900' : 'text-slate-500')}>
          {etiqueta}
        </span>
      </button>
    );
  };

  return (
    <div
      // z-[9999]: POR ENCIMA DE LA HOJA DE CREAR (2026-08-23). Eugenio: «que
      // cuando le dé a crear se sigan viendo los 3 botones de abajo». La hoja
      // se levanta hasta justo encima de ellos y además éstos quedan delante,
      // así que el botón que la ha abierto no desaparece bajo lo que abre.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex items-end justify-center gap-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-12 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {boton('explorar', Compass, 'Explorar')}
      {boton('crear', Plus, 'Crear', true)}
      {boton('organizar', LayoutGrid, 'Organizar')}
    </div>
  );
}
