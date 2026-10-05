import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, FileText } from 'lucide-react';
import { PAGINAS_INFO } from '../../paginasInfo';
import { cn } from '../../utils/cn';

// ============================================================================
// LA MARCA, EN LA FILA DE ARRIBA DEL MENÚ IZQUIERDO (2026-10-05, 2.ª vuelta)
// ============================================================================
// Eugenio: «lo de humanity.wiki metido en el menú aprovechando el hueco de
// arriba que está al lado del colapsable, a la derecha del botón de colapsar;
// y sácalo del menú principal para que solo se vea cuando descolapsas».
//
// It lives in the rail's top row (`Rail` → `junto`), right of the fold button.
// The name goes home; the chevron opens the information pages as an in-place
// accordion that drops to its own line (`basis-full` in a wrapping row) — a
// floating panel would be clipped by the rail's scroll.

export function MarcaCabecera({ onIrAlInicio }: { onIrAlInicio: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);
  const enInfo = PAGINAS_INFO.some(p => location.pathname.startsWith(`/${p.ruta}`));
  const oscuro = abierto || enInfo;

  return (
    <>
      <div className={cn('flex h-8 min-w-0 flex-1 items-center rounded-lg transition-colors',
        oscuro ? 'bg-slate-900 text-white' : 'text-slate-900')}>
        <button
          onClick={onIrAlInicio}
          title="humanity.wiki — ir al inicio"
          className={cn('flex h-full min-w-0 flex-1 items-center rounded-l-lg pl-2 pr-1 transition-colors',
            oscuro ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
        >
          <span className="truncate text-[14px] font-black tracking-tight">
            humanity<span className={oscuro ? 'text-emerald-400' : 'text-emerald-600'}>.wiki</span>
          </span>
        </button>
        <button
          onClick={() => setAbierto(a => !a)}
          title="Sobre humanity.wiki"
          aria-label="Sobre humanity.wiki"
          aria-expanded={abierto}
          className={cn('grid h-full w-8 shrink-0 place-items-center rounded-r-lg transition-colors',
            oscuro ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', abierto && 'rotate-180')} />
        </button>
      </div>

      {abierto && (
        <div className="mt-1 basis-full rounded-xl bg-slate-50 py-1">
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Información</p>
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
    </>
  );
}

/** «Todas mis páginas»: la tabla de todas tus páginas. Va debajo de tu perfil
 *  y encabeza la lista de carpetas y páginas que viene después. */
export default function TodasMisPaginas() {
  const navigate = useNavigate();
  const location = useLocation();
  const enPaginas = location.pathname === '/paginas';
  return (
    <button
      onClick={() => navigate('/paginas')}
      title="Todas tus páginas, en una tabla"
      aria-current={enPaginas ? 'page' : undefined}
      className={cn('mb-1 flex h-9 w-full shrink-0 items-center gap-3 rounded-xl px-[10px] text-left text-[12px] font-black transition-colors',
        enPaginas ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">Todas mis páginas</span>
    </button>
  );
}
