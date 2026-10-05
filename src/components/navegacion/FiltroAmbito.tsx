import { Globe, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// MÍO / TODOS, ARRIBA DEL MENÚ DE TEMAS (2026-10-05)
// ============================================================================
// Eugenio: «arriba un filtro donde puedes ver mi contenido o todo el
// contenido». Two tabs; whichever is on decides where a theme takes you
// (`/temas/:id/contenido?ambito=`). The feed page carries the same switch and
// both read and write one key, `humanity:temas-ambito`, so they never
// disagree.

export type Ambito = 'mio' | 'todos';

export function leerAmbito(conSesion: boolean): Ambito {
  try {
    const v = localStorage.getItem('humanity:temas-ambito');
    if (v === 'mio' || v === 'todos') return v === 'mio' && !conSesion ? 'todos' : v;
  } catch { /* sin almacenamiento */ }
  return conSesion ? 'mio' : 'todos';
}

export default function FiltroAmbito({ ambito, onCambiar, conSesion }: {
  ambito: Ambito; onCambiar: (a: Ambito) => void; conSesion: boolean;
}) {
  return (
    <div className="mb-1 shrink-0 border-b border-slate-200 pb-2">
      <p className="px-1 pb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Temas</p>
      <div role="tablist" aria-label="Qué contenido ver" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {([['mio', 'Mi contenido', Lock], ['todos', 'Todo', Globe]] as const).map(([k, etiqueta, I]) => (
          <button key={k} role="tab" aria-selected={ambito === k}
            disabled={k === 'mio' && !conSesion}
            title={k === 'mio' && !conSesion ? 'Inicia sesión para ver lo tuyo' : undefined}
            onClick={() => onCambiar(k)}
            className={cn('inline-flex h-8 items-center justify-center gap-1 rounded-lg text-[11px] font-black transition-colors disabled:opacity-40',
              ambito === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
            <I className="h-3 w-3" /> {etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
