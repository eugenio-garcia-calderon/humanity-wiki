// ============================================================================
// «DAR FEEDBACK», EN UNA VENTANA Y SIN SALIR DE DONDE ESTÁS (2026-09-30)
// ============================================================================
// Eugenio: «pon el botón de feedback en el menú superior a la derecha de la
// barra de buscar, bien grande que se vea en naranja, y que ponga "Dar
// Feedback"» y «haz que feedback sea un pop up central que no te saque de la
// página en la que estás».
//
// POR QUÉ UNA VENTANA Y NO LA PÁGINA. Lo que falla se cuenta justo cuando
// acaba de fallar, mirándolo. Si contarlo te lleva a otra página, pierdes de
// vista lo que querías describir — y la mitad de las veces también el estado
// en el que estaba (un formulario a medias, un mapa girado). La ventana se
// abre encima, se cierra, y lo de debajo sigue exactamente como estaba.
//
// UNA SOLA PUERTA PARA TODOS LOS BOTONES: el evento `feedback:abrir`. El botón
// naranja, la entrada del menú de humanity.wiki y cualquiera que venga después
// lo disparan con `abrirFeedback()`; nadie necesita saber dónde vive la
// ventana. La página `/hormiguero` sigue existiendo para los enlaces que ya
// apuntan a ella: es el mismo componente, así que no hay dos versiones.
import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Loader2, X, ExternalLink } from 'lucide-react';
import { IconoFeedback } from '../ui/IconoFeedback';

const Hormiguero = lazy(() => import('../../pages/Hormiguero'));

const EVENTO = 'feedback:abrir';

/** Abre la ventana de feedback encima de la página actual. */
export function abrirFeedback() {
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export default function VentanaFeedback() {
  const [abierta, setAbierta] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const abrir = () => setAbierta(true);
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  // Escape cierra, como cualquier ventana. Y mientras está abierta la página
  // de debajo no se desplaza: si no, la rueda del ratón movería las dos.
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false); };
    window.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [abierta]);

  if (!abierta) return null;

  const desde = location.pathname + location.search;

  return (
    <div
      className="fixed inset-0 z-[9995] grid place-items-center bg-slate-900/40 p-3 backdrop-blur-sm sm:p-6"
      onClick={() => setAbierta(false)}
      role="dialog" aria-modal="true" aria-label="Dar feedback"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-500 text-white">
            <IconoFeedback className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black leading-tight text-slate-900">Dar Feedback</p>
            <p className="truncate text-[11px] text-slate-400">Lo que falla y lo que falta. Llega a quien programa.</p>
          </div>
          <Link
            to="/hormiguero"
            onClick={() => setAbierta(false)}
            title="Ver todo el feedback en su página"
            className="hidden items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Página completa
          </Link>
          <button
            onClick={() => setAbierta(false)}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <Suspense fallback={<div className="flex justify-center py-10 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
            <Hormiguero enVentana desde={desde} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * EL BOTÓN NARANJA DE LA BARRA DE ARRIBA. Grande y con palabras: es lo que se
 * busca en un mal momento, y encontrarlo rápido es media función. En un
 * teléfono no caben las dos palabras junto a todo lo demás, así que ahí se
 * queda el icono — naranja igual, que es lo que lo hace reconocible.
 */
export function BotonDarFeedback({ compacto = false }: { compacto?: boolean }) {
  return (
    <button
      type="button"
      onClick={abrirFeedback}
      title="Dar Feedback"
      aria-label="Dar Feedback"
      className={[
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-orange-500 font-black text-white shadow-sm',
        'transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300',
        compacto ? 'h-7 px-2 text-[11px]' : 'h-9 px-2.5 text-[13px] sm:h-10 sm:px-4 sm:text-sm',
      ].join(' ')}
    >
      <IconoFeedback className={compacto ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'} />
      <span className="hidden whitespace-nowrap sm:inline">Dar Feedback</span>
    </button>
  );
}
