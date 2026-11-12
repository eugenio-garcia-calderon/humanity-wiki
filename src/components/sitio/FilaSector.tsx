import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// UN SECTOR DE INNOVACIÓN, EN UNA LÍNEA (2026-11-12, Eugenio en luzhumanidad.com)
// ============================================================================
// «Que cada sector de innovación ocupe una línea. Y si hay varios proyectos,
// que se pueda pasar de un proyecto a otro con un slider, con unas flechas, o
// un botón de mostrar más… y que todos los proyectos tengan el mismo tamaño.»
//
// One panel per sector, as wide as the page: the header (icon, title, count,
// the two arrows and «Mostrar todos») and one row of cards of the same width
// (1 and a bit on a phone, then 2, 3, 4 and 5 as the screen grows) that slides
// sideways. «Mostrar todos» turns the row into a grid with every card of the
// sector, same width. The arrows only show when something is hidden.

/** The width of every card in the row, by screen: the same in every sector. */
// UN 30 % MÁS GRANDES (2026-11-12, Eugenio: «haz las tarjetas de los proyectos un 30 % más grandes»): el ancho
// de antes por 1,3. En la fila asoma la siguiente, que invita a deslizar; en «Mostrar todos», una columna menos.
const ANCHO_EN_FILA = 'w-[85%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2*1.3)] lg:w-[calc((100%-2rem)/3*1.3)] xl:w-[calc((100%-3rem)/4*1.3)] min-[1800px]:w-[calc((100%-4rem)/5*1.3)]';
const REJILLA = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4';

export default function FilaSector<T>({ id, titulo, icono, colorBorde, colorIcono, filas, pintar }: {
  id: string;
  titulo: ReactNode;
  icono: ReactNode;
  colorBorde: string;
  colorIcono: string;
  filas: T[];
  /** Draws one card; `claseLi` is its width in the row (empty in the grid). */
  pintar: (f: T, claseLi: string) => ReactNode;
}) {
  const pista = useRef<HTMLUListElement>(null);
  const [todos, setTodos] = useState(false);
  const [puede, setPuede] = useState({ atras: false, adelante: false });

  useEffect(() => {
    const el = pista.current;
    if (!el || todos) { setPuede({ atras: false, adelante: false }); return; }
    const medir = () => setPuede({ atras: el.scrollLeft > 4, adelante: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const o = new ResizeObserver(medir); o.observe(el);
    return () => { el.removeEventListener('scroll', medir); o.disconnect(); };
  }, [todos, filas.length]);

  const mover = (sentido: 1 | -1) => {
    const el = pista.current;
    if (el) el.scrollBy({ left: sentido * el.clientWidth * 0.9, behavior: 'smooth' });
  };
  const hayMas = puede.atras || puede.adelante;
  const flecha = 'grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-500 hover:text-slate-950 disabled:opacity-30 disabled:hover:border-slate-300';

  return (
    <section data-sector aria-labelledby={id}
      className={cn('min-w-0 sm:rounded-3xl sm:border sm:border-t-4 sm:border-slate-200 sm:bg-slate-50 sm:p-5', colorBorde)}>
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <span aria-hidden className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200', colorIcono)}>{icono}</span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-lg font-black leading-tight tracking-tight text-slate-900 sm:text-xl 2xl:text-2xl">{titulo}</h2>
          <p className="text-[13px] font-semibold text-slate-500">
            {filas.length === 1 ? '1 proyecto' : `${filas.length} proyectos`}
            {hayMas && <span aria-hidden className="sm:hidden"> · desliza →</span>}
          </p>
        </div>
        {(hayMas || todos) && (
          <div className="flex shrink-0 items-center gap-2">
            {!todos && <>
              <button type="button" onClick={() => mover(-1)} disabled={!puede.atras} aria-label="Proyectos anteriores" className={cn(flecha, 'hidden sm:grid')}><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => mover(1)} disabled={!puede.adelante} aria-label="Más proyectos" className={cn(flecha, 'hidden sm:grid')}><ChevronRight className="h-5 w-5" /></button>
            </>}
            <button type="button" onClick={() => setTodos(t => !t)} aria-expanded={todos}
              className="inline-flex h-9 items-center rounded-full px-3 text-sm font-bold text-slate-700 hover:bg-white hover:text-slate-950">
              {todos ? 'Mostrar menos' : 'Mostrar todos'}
            </button>
          </div>
        )}
      </div>
      <ul ref={pista} className={cn('list-none gap-4 p-0', todos
        ? REJILLA
        : '-mx-4 flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden')}>
        {filas.map(f => pintar(f, todos ? '' : ANCHO_EN_FILA))}
      </ul>
    </section>
  );
}
