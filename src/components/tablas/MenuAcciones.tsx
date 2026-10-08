import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

// ============================================================================
// UN MENÚ FLOTANTE DE ACCIONES (2026-10-08)
// ============================================================================
// Eugenio: «con el Mac pinchando con dos dedos, con el PC con el botón
// derecho, y en el móvil con tres puntitos; hacerlo como Notion».
//
// Se pinta en un portal, con `position: fixed` en las coordenadas que le dan
// (el puntero, o la esquina del botón «⋯»): una tarjeta de galería tiene
// `overflow-hidden` y el carrusel hace scroll, y un menú dentro de ellas
// quedaría recortado. Se recoloca para no salirse de la pantalla, se cierra
// con Escape, al pinchar fuera, al desplazarse y al cambiar de tamaño, y se
// maneja con las flechas.

export type AccionMenu = {
  etiqueta: string;
  icono?: ComponentType<{ className?: string }>;
  onClick: () => void;
  /** En rojo: lo que borra. Siempre al final y separado. */
  peligro?: boolean;
  deshabilitada?: boolean;
};

export default function MenuAcciones({ x, y, acciones, onCerrar, etiqueta = 'Acciones' }: {
  x: number; y: number; acciones: AccionMenu[]; onCerrar: () => void; etiqueta?: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [activo, setActivo] = useState(0);

  // Dentro de la pantalla: si no cabe a la derecha o abajo, se abre hacia el otro lado.
  useLayoutEffect(() => {
    const c = caja.current; if (!c) return;
    const { width, height } = c.getBoundingClientRect();
    const m = 8;
    setPos({
      x: Math.max(m, Math.min(x, window.innerWidth - width - m)),
      y: Math.max(m, y + height > window.innerHeight - m ? y - height : y),
    });
  }, [x, y, acciones.length]);

  // Al cerrar, el foco vuelve a donde estaba (la tarjeta o el botón «⋯»).
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    return () => { if (antes && document.contains(antes)) antes.focus?.(); };
  }, []);

  useEffect(() => {
    caja.current?.focus();
    const cerrar = () => onCerrar();
    const fuera = (e: Event) => { if (!caja.current?.contains(e.target as Node)) onCerrar(); };
    document.addEventListener('pointerdown', fuera, true);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    window.addEventListener('blur', cerrar);
    return () => {
      document.removeEventListener('pointerdown', fuera, true);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
      window.removeEventListener('blur', cerrar);
    };
  }, [onCerrar]);

  const habilitadas = acciones.map((a, i) => (a.deshabilitada ? -1 : i)).filter(i => i >= 0);
  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const k = habilitadas.indexOf(activo);
      const sig = habilitadas[(k + (e.key === 'ArrowDown' ? 1 : habilitadas.length - 1)) % habilitadas.length];
      setActivo(sig);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const a = acciones[activo]; if (a && !a.deshabilitada) { onCerrar(); a.onClick(); }
    }
  };

  return createPortal(
    <div ref={caja} role="menu" aria-label={etiqueta} tabIndex={-1} onKeyDown={tecla}
      onContextMenu={e => e.preventDefault()} onClick={e => e.stopPropagation()}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[400] w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl outline-none">
      {acciones.map((a, i) => {
        const I = a.icono;
        return (
          <div key={a.etiqueta}>
            {a.peligro && i > 0 && !acciones[i - 1].peligro && <div className="my-1 border-t border-slate-100" />}
            <button type="button" role="menuitem" disabled={a.deshabilitada} tabIndex={activo === i ? 0 : -1}
              onMouseEnter={() => !a.deshabilitada && setActivo(i)}
              onClick={() => { onCerrar(); a.onClick(); }}
              className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] font-bold transition-colors disabled:opacity-40',
                a.peligro
                  ? (activo === i ? 'bg-rose-50 text-rose-700' : 'text-rose-600')
                  : (activo === i ? 'bg-slate-100 text-slate-900' : 'text-slate-700'))}>
              {I && <I className={cn('h-4 w-4 shrink-0', a.peligro ? 'text-rose-500' : 'text-slate-400')} />}
              {a.etiqueta}
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
