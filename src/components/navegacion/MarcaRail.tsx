import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, FileText } from 'lucide-react';
import { PAGINAS_INFO } from '../../paginasInfo';
import { cn } from '../../utils/cn';

// ============================================================================
// LA MARCA Y «TODAS MIS PÁGINAS», DENTRO DEL MENÚ IZQUIERDO (2026-10-05)
// ============================================================================
// Eugenio: «el botón de mis páginas incrustado en el menú desplegable de la
// izquierda, que se llame Todas mis páginas, y ahí la lista de todas las
// páginas; así despejamos el menú superior. El botón de humanity.wiki con el
// desplegable también, dentro del menú izquierdo colapsable. Y el icono del
// logo elimínalo: si la gente pincha en humanity.wiki que vaya al inicio».
//
// Two rows at the top of the left rail, above your avatar:
//   · humanity.wiki — the name goes home; its chevron opens the «about» pages
//     IN PLACE, as an accordion. Not a floating panel: the rail scrolls
//     (`overflow-y-auto`), and a floating panel would be clipped by it.
//   · Todas mis páginas — the table of every page. The folders and loose pages
//     listed right under it are that list, so this row is their heading.
//
// Feedback is no longer in the dropdown: it has its own button in the top bar.

export default function MarcaRail({ onIrAlInicio }: {
  /** Going home also closes whatever the rail had open; the Layout decides. */
  onIrAlInicio: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);
  const enInfo = PAGINAS_INFO.some(p => location.pathname.startsWith(`/${p.ruta}`));
  const enPaginas = location.pathname === '/paginas';

  return (
    <div className="mb-1 shrink-0 border-b border-slate-200 pb-1">
      <div className={cn('flex h-10 items-center rounded-xl transition-colors',
        abierto || enInfo ? 'bg-slate-900 text-white' : 'text-slate-900')}>
        <button
          onClick={onIrAlInicio}
          title="humanity.wiki — ir al inicio"
          className={cn('flex h-full min-w-0 flex-1 items-center rounded-l-xl pl-2.5 pr-1 transition-colors',
            abierto || enInfo ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
        >
          <span className="truncate text-[15px] font-black tracking-tight">
            humanity<span className={abierto || enInfo ? 'text-emerald-400' : 'text-emerald-600'}>.wiki</span>
          </span>
        </button>
        <button
          onClick={() => setAbierto(a => !a)}
          title="Sobre humanity.wiki"
          aria-label="Sobre humanity.wiki"
          aria-expanded={abierto}
          className={cn('grid h-full w-9 shrink-0 place-items-center rounded-r-xl transition-colors',
            abierto || enInfo ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', abierto && 'rotate-180')} />
        </button>
      </div>

      {abierto && (
        <div className="mt-1 rounded-xl bg-slate-50 py-1">
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Información</p>
          {PAGINAS_INFO.filter(op => op.enMenu !== false).map(op => {
            const aqui = location.pathname.startsWith(`/${op.ruta}`);
            return (
              <button key={op.ruta}
                onClick={() => { setAbierto(false); navigate(`/${op.ruta}`); }}
                className={cn('flex h-9 w-full items-center gap-2 px-3 text-left text-[12px] font-bold hover:bg-white',
                  aqui ? 'text-emerald-700' : 'text-slate-700')}>
                <op.icono className="h-3.5 w-3.5 shrink-0 text-slate-400" /> <span className="truncate">{op.titulo}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate('/paginas')}
        title="Todas tus páginas, en una tabla"
        aria-current={enPaginas ? 'page' : undefined}
        className={cn('mt-1 flex h-9 w-full items-center gap-3 rounded-xl px-[10px] text-left text-[12px] font-black transition-colors',
          enPaginas ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')}
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">Todas mis páginas</span>
      </button>
    </div>
  );
}
