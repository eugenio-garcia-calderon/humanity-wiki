// ============================================================================
// UNA SECCIÓN DEL MENÚ (2026-08-20, petición de Eugenio: «reparte el menú en
// 4 […] muestra 5 y si hay más se puede hacer scroll down en ese visor para
// ver el resto sin salir del menú»).
// ============================================================================
// Cinco filas visibles y el resto se desplaza DENTRO de la sección, no en todo
// el menú: si el menú entero se desplazara, buscar una persona te dejaría los
// proyectos fuera de la pantalla. Cada sección es su propio visor.
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

/** Alto de una fila (28 px) por las cinco que se ven, más un pelín para que
 *  la sexta asome y se vea que hay más. Que asome es lo que dice «esto se
 *  desplaza» sin tener que poner un cartel. */
const ALTO_VISOR = 5 * 28 + 12;

export default function SeccionMenu({
  titulo, icono: Icono, colapsado, plegada, onPlegar, cuantos, accion, children,
}: {
  titulo: string;
  icono: any;
  colapsado: boolean;
  plegada: boolean;
  onPlegar: () => void;
  cuantos?: number;
  /** Un botón a la derecha del título (crear, ver todo…). */
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
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
    <section className="border-b border-slate-100 last:border-0">
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
        <div className="px-1.5 pb-2 overflow-y-auto" style={{ maxHeight: ALTO_VISOR }}>
          {children}
        </div>
      )}
    </section>
  );
}
