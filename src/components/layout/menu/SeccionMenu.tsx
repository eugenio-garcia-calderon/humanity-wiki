// ============================================================================
// UNA SECCIÓN DEL MENÚ (2026-08-20, petición de Eugenio: «reparte el menú en
// 4 […] muestra 5 y si hay más se puede hacer scroll down en ese visor para
// ver el resto sin salir del menú», y después: «permite que el espacio que
// ocupan una sección se pueda ampliar o reducir arrastrando la línea que los
// separa»).
// ============================================================================
// Cinco filas visibles de partida y el resto se desplaza DENTRO de la sección,
// no en todo el menú: si el menú entero se desplazara, buscar una persona te
// dejaría los proyectos fuera de la pantalla. Cada sección es su propio visor.
//
// Y ese visor SE ESTIRA: la raya de abajo es un tirador. Cuánto sitio merece
// cada sección depende de en qué andes metido, y eso no lo puede decidir el
// que programa — hoy vives en Proyectos, mañana en Personas.
import { useCallback, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

/** Alto de una fila (28 px) por las cinco que se ven, más un pelín para que
 *  la sexta asome y se vea que hay más. Que asome es lo que dice «esto se
 *  desplaza» sin tener que poner un cartel. */
export const ALTO_VISOR = 5 * 28 + 12;
const ALTO_MIN = 40;
const ALTO_MAX = 900;

export default function SeccionMenu({
  titulo, icono: Icono, colapsado, plegada, onPlegar, cuantos, accion,
  alto = ALTO_VISOR, onAlto, children,
}: {
  titulo: string;
  icono: any;
  colapsado: boolean;
  plegada: boolean;
  onPlegar: () => void;
  cuantos?: number;
  /** Un botón a la derecha del título (crear, ver todo…). */
  accion?: React.ReactNode;
  /** Cuánto sitio ocupa el visor. Se guarda en tus ajustes. */
  alto?: number;
  /** Se avisa al soltar, no en cada píxel: guardar en cada movimiento del
   *  ratón serían cien escrituras por arrastre. */
  onAlto?: (alto: number) => void;
  children: React.ReactNode;
}) {
  const altoVivo = useRef(alto);

  /** Arrastrar la raya de abajo. Se toca el estilo del elemento a mano
   *  mientras dura el gesto y solo se avisa a React al soltar: pasar por el
   *  estado en cada píxel repinta el menú entero sesenta veces por segundo. */
  const empezarAEstirar = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const caja = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement | null;
    if (!caja) return;
    const y0 = e.clientY;
    const alto0 = caja.getBoundingClientRect().height;
    const tirador = e.currentTarget as HTMLElement;
    tirador.setPointerCapture(e.pointerId);

    const mover = (ev: PointerEvent) => {
      const nuevo = Math.min(ALTO_MAX, Math.max(ALTO_MIN, alto0 + (ev.clientY - y0)));
      altoVivo.current = nuevo;
      caja.style.maxHeight = `${nuevo}px`;
    };
    const soltar = () => {
      tirador.removeEventListener('pointermove', mover);
      tirador.removeEventListener('pointerup', soltar);
      onAlto?.(Math.round(altoVivo.current));
    };
    tirador.addEventListener('pointermove', mover);
    tirador.addEventListener('pointerup', soltar);
  }, [onAlto]);

  // Plegado el menú no hay títulos de sección: solo una raya que separa los
  // grupos de iconos. Un título de 9 px en una columna de 56 px no se lee.
  if (colapsado) {
    return (
      <div className="py-1.5 border-b border-slate-100 last:border-0">
        <div className="flex flex-col gap-1 items-center">{children}</div>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-1 px-2 pt-2.5 pb-1">
        <button
          onClick={onPlegar}
          className="flex-1 min-w-0 flex items-center gap-1.5 text-left group"
        >
          <ChevronDown className={cn('w-3 h-3 shrink-0 text-slate-400 transition-transform',
            plegada && '-rotate-90')} />
          <Icono className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 truncate group-hover:text-slate-600">
            {titulo}
          </span>
          {typeof cuantos === 'number' && cuantos > 0 && (
            <span className="text-[9px] font-bold text-slate-300">{cuantos}</span>
          )}
        </button>
        {accion}
      </div>

      {!plegada && (
        <div className="px-1.5 pb-2 overflow-y-auto" style={{ maxHeight: alto }}>
          {children}
        </div>
      )}

      {/* LA RAYA DE ABAJO ES UN TIRADOR. Plegada la sección no hay nada que
          estirar, así que solo es una raya. */}
      {!plegada ? (
        <div
          onPointerDown={empezarAEstirar}
          onDoubleClick={() => onAlto?.(ALTO_VISOR)}
          title="Arrastra para dar más o menos sitio · doble clic para el tamaño de siempre"
          className="h-1.5 cursor-ns-resize group relative touch-none"
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-100 group-hover:bg-emerald-400 group-hover:h-0.5 transition-all" />
        </div>
      ) : (
        <div className="h-px bg-slate-100" />
      )}
    </section>
  );
}
