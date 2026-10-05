import { useLocation, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
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
