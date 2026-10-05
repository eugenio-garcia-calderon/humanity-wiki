import { useEffect, useRef, useState } from 'react';
import { Mic, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Microfono } from '../../hooks/useVoiceDictation';

// ============================================================================
// EL BOTÓN DEL MICRÓFONO, COMO EN CLAUDE (2026-10-02)
// ============================================================================
// Eugenio: «cuando pulsas en el icono del micrófono, que se ponga en azulito
// como en Claude, y que tenga una pestañita que te permita elegir el
// micrófono, por si quieres utilizar uno u otro».
//
// Azul mientras escucha, con un pulso suave para que se vea que está vivo. La
// pestañita al lado abre la lista de micrófonos; el elegido se recuerda en
// este navegador. Si algo falla, se dice aquí mismo, encima del botón.

export default function BotonMicrofono({ escuchando, onPulsar, microfonos, microfono, onElegir, onAbrirLista, error, nivel = 0, numero }: {
  escuchando: boolean;
  onPulsar: () => void;
  microfonos: Microfono[];
  microfono: string;
  onElegir: (id: string) => void;
  onAbrirLista: () => void;
  error?: string | null;
  /** Cuánto suena ahora, 0–1: el halo crece con la voz, como en Claude. */
  nivel?: number;
  /** Mientras se prueban los tres métodos (2026-10-05): el número del botón. */
  numero?: number;
}) {
  const [abierta, setAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);

  // El fallo se enseña unos segundos y se va solo.
  useEffect(() => {
    if (!error) return;
    setAviso(error);
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierta(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierta]);

  const opciones: Microfono[] = [{ id: '', nombre: 'El del sistema' }, ...microfonos];

  return (
    <div ref={caja} className="relative flex items-center">
      <button type="button" onClick={onPulsar}
        title={escuchando ? 'Detener el dictado' : 'Dictar por voz'}
        aria-label={escuchando ? 'Detener el dictado' : 'Dictar por voz'}
        aria-pressed={escuchando}
        className={cn('relative w-8 h-8 grid place-items-center rounded-full transition-colors',
          escuchando ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/40' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}>
        {/* EL HALO SIGUE A LA VOZ (2026-10-02): si no se mueve al hablar, el
            micrófono no está captando nada, y se ve antes de esperar al texto. */}
        {escuchando && (
          <span aria-hidden className="absolute inset-0 rounded-full bg-blue-400/40 transition-transform duration-150"
            style={{ transform: `scale(${1 + Math.min(0.9, nivel * 1.8)})` }} />
        )}
        <Mic className="relative w-4 h-4" />
        {numero && <Numero n={numero} />}
      </button>
      <button type="button" onClick={() => { if (!abierta) onAbrirLista(); setAbierta(a => !a); }}
        title="Elegir el micrófono" aria-label="Elegir el micrófono" aria-expanded={abierta}
        className={cn('w-4 h-8 grid place-items-center rounded-md transition-colors',
          escuchando ? 'text-blue-500' : 'text-slate-300 hover:text-slate-600')}>
        <ChevronDown className="w-3 h-3" />
      </button>

      {abierta && (
        <div role="menu" className="absolute left-0 bottom-full mb-1 z-40 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-1">
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">Micrófono</p>
          {opciones.map(m => (
            <button key={m.id || 'sistema'} role="menuitemradio" aria-checked={microfono === m.id}
              onClick={() => { onElegir(m.id); setAbierta(false); }}
              className="w-full flex items-center gap-2 px-2 h-9 rounded-lg text-left text-xs font-bold text-slate-600 hover:bg-slate-50">
              <span className="w-4 shrink-0">{microfono === m.id && <Check className="w-3.5 h-3.5 text-blue-500" />}</span>
              <span className="flex-1 truncate">{m.nombre}</span>
            </button>
          ))}
          {microfonos.length === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-slate-400 leading-snug">
              Los nombres de tus micrófonos aparecen después de usar el dictado una vez.
            </p>
          )}
        </div>
      )}

      {aviso && !abierta && (
        <div role="alert" className="absolute left-0 bottom-full mb-1 z-40 w-64 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}

function Numero({ n }: { n: number }) {
  return (
    <span aria-hidden className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 grid place-items-center rounded-full bg-slate-700 text-white text-[9px] font-black leading-none">{n}</span>
  );
}

/**
 * LOS BOTONES 2 Y 3 (2026-10-05). Otro método de dictado cada uno, para que
 * Eugenio pruebe y se quede con el que funcione. Sin lista de micrófonos: el
 * 2 usa el que elige Chrome y el 3 el elegido en la flechita del 1.
 */
export function BotonVozAlternativo({ numero, titulo, escuchando, procesando, onPulsar, error }: {
  numero: number; titulo: string; escuchando: boolean; procesando?: boolean; onPulsar: () => void; error?: string | null;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!error) return;
    setAviso(error);
    const t = setTimeout(() => setAviso(null), 8000);
    return () => clearTimeout(t);
  }, [error]);
  return (
    <div className="relative flex items-center">
      <button type="button" onClick={onPulsar} disabled={procesando}
        title={procesando ? 'Transcribiendo…' : escuchando ? `Detener (${titulo})` : `Dictar — ${titulo}`}
        aria-label={escuchando ? `Detener el dictado ${numero}` : `Dictar por voz, método ${numero}`}
        aria-pressed={escuchando}
        className={cn('relative w-8 h-8 grid place-items-center rounded-full transition-colors',
          escuchando ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/40 animate-pulse'
          : procesando ? 'bg-blue-50 text-blue-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')}>
        {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="relative w-4 h-4" />}
        <Numero n={numero} />
      </button>
      {aviso && (
        <div role="alert" className="absolute left-0 bottom-full mb-1 z-40 w-64 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-700 shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}
