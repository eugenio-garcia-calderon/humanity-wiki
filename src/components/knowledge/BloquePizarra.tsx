import { Suspense, lazy, useEffect, useState } from 'react';
import { PenTool, Maximize2, X, Loader2, Link2, LayoutPanelTop } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// UNA PIZARRA DENTRO DE LA PÁGINA (2026-10-01)
// ============================================================================
// Eugenio: «que uno de los bloques sea una pizarra al estilo Miro. Ya tenemos
// el componente: recíclalo, embebida dentro de la página o como un enlace
// para hacer clic y entrar».
//
// Es la MISMA pizarra de «Esquemas» (`GrafoLienzo`), no una copia: lo que se
// dibuja aquí es esa pizarra, y se puede abrir también desde allí. Se carga
// sólo cuando la página la tiene: React Flow pesa, y una página sin pizarra
// no lo descarga.
//
// Dos formas, las dos con «pantalla completa»:
//   · incrustada → la pizarra viva, a media altura, dentro de la página;
//   · enlace     → una tarjeta; al pulsar, la pizarra ocupa la pantalla.

const GrafoLienzo = lazy(() => import('../../pages/GrafoCanvas').then(m => ({ default: m.GrafoLienzo })));

export default function BloquePizarra({ id, titulo, vista, editable, onCambiarVista }: {
  id: string;
  titulo?: string;
  /** `tarjeta` = enlace; cualquier otra cosa, incrustada. */
  vista?: 'tarjeta' | 'embebido';
  editable: boolean;
  onCambiarVista?: (v: 'tarjeta' | 'embebido') => void;
}) {
  const [completa, setCompleta] = useState(false);
  const enlace = vista === 'tarjeta';

  // Escape cierra la pantalla completa.
  useEffect(() => {
    if (!completa) return;
    const t = (e: KeyboardEvent) => { if (e.key === 'Escape') setCompleta(false); };
    window.addEventListener('keydown', t);
    return () => window.removeEventListener('keydown', t);
  }, [completa]);

  const nombre = titulo || 'Pizarra';
  const cargando = (
    <div className="h-full grid place-items-center text-xs text-slate-400">
      <span className="inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando la pizarra…</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Cabecera: nombre y mandos. */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/60">
        <PenTool className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="text-xs font-black text-slate-700 truncate flex-1 min-w-0">{nombre}</p>
        {editable && onCambiarVista && (
          <button onClick={() => onCambiarVista(enlace ? 'embebido' : 'tarjeta')}
            title={enlace ? 'Enseñarla dentro de la página' : 'Enseñarla como un enlace'}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[11px] font-bold text-slate-500 hover:bg-white hover:text-slate-800">
            {enlace ? <><LayoutPanelTop className="w-3.5 h-3.5" /> Incrustar</> : <><Link2 className="w-3.5 h-3.5" /> Como enlace</>}
          </button>
        )}
        <button onClick={() => setCompleta(true)} title="Pantalla completa"
          className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[11px] font-bold text-slate-500 hover:bg-white hover:text-slate-800">
          <Maximize2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Pantalla completa</span>
        </button>
      </div>

      {enlace ? (
        <button onClick={() => setCompleta(true)}
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 transition-colors">
          <span className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 grid place-items-center shrink-0"><PenTool className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-800 truncate">{nombre}</span>
            <span className="block text-xs text-slate-400">Pulsa para abrir la pizarra</span>
          </span>
        </button>
      ) : (
        // La altura la pone la página: la pizarra llena lo que le den.
        <div className="relative h-[420px] sm:h-[520px]">
          {!completa && <Suspense fallback={cargando}><GrafoLienzo slug={id} incrustado /></Suspense>}
        </div>
      )}

      {completa && (
        <div className="fixed inset-0 z-[95] bg-white flex flex-col" role="dialog" aria-label={nombre}>
          <div className="flex items-center gap-2 px-4 h-12 border-b border-slate-200 shrink-0">
            <PenTool className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-black text-slate-800 truncate flex-1">{nombre}</p>
            <button onClick={() => setCompleta(false)} aria-label="Cerrar la pizarra"
              className={cn('w-11 h-11 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100')}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative flex-1 min-h-0">
            <Suspense fallback={cargando}><GrafoLienzo slug={id} incrustado /></Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
