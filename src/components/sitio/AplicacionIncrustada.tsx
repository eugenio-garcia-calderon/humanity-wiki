import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/core';

// ============================================================================
// AN APPLICATION EMBEDDED IN A SITE PAGE (2026-11-12, Eugenio)
// ============================================================================
// «Quiero que el modelo socioeconómico optimizado esté embebido en la página de
// luzhumanidad.com, que aparezca el menú de Luz & Humanidad arriba, y que se
// pueda expandir a pantalla completa y salir de pantalla completa.»
//
// The site's own header stays on top (it belongs to the page, outside this
// box). The application lives in a box as tall as the screen allows, with its
// own scroll, so its sticky header and its «#section» links work inside it.
// One button puts the box in full screen and takes it out again.
//
// Full screen uses the browser's Fullscreen API when there is one. The iPhone
// has none for a normal element, so there the box covers the window with CSS
// instead: same button, same result for the reader. Esc leaves both.

export default function AplicacionIncrustada({ titulo, children }: { titulo: string; children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  // `nativa`: the browser's full screen; `css`: the fallback covering the window.
  const [modo, setModo] = useState<null | 'nativa' | 'css'>(null);

  useEffect(() => {
    const alCambiar = () => setModo(m => (document.fullscreenElement === caja.current ? 'nativa' : m === 'nativa' ? null : m));
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  // The CSS fallback: the page behind must not scroll, and Esc closes it the
  // way it closes the native one.
  useEffect(() => {
    if (modo !== 'css') return;
    const antes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setModo(null); };
    window.addEventListener('keydown', tecla);
    return () => { document.documentElement.style.overflow = antes; window.removeEventListener('keydown', tecla); };
  }, [modo]);

  const entrar = async () => {
    const el = caja.current;
    if (el && document.fullscreenEnabled && el.requestFullscreen) {
      try { await el.requestFullscreen(); setModo('nativa'); return; } catch { /* refused: fall back below */ }
    }
    setModo('css');
  };
  const salir = async () => {
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* already out */ } }
    setModo(null);
  };
  const completa = modo !== null;

  return (
    <div
      ref={caja}
      data-aplicacion-incrustada
      role="region"
      aria-label={titulo}
      className={completa
        ? 'fixed inset-0 z-[70] flex flex-col bg-white'
        : 'mx-auto flex h-[calc(100dvh-6rem)] min-h-[32rem] w-full max-w-[120rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'}
    >
      {/* Only the button: the app's own header right below already says what it is. */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-b border-slate-200 bg-slate-50 px-3 py-1">
        <Button variant="ghost" onClick={completa ? salir : entrar} aria-pressed={completa}
          className="shrink-0 gap-1.5 px-2.5 py-1 text-sm font-semibold normal-case tracking-normal text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400">
          {completa
            ? <><Minimize2 className="h-4 w-4" aria-hidden />Salir de pantalla completa</>
            : <><Maximize2 className="h-4 w-4" aria-hidden />Pantalla completa</>}
        </Button>
      </div>
      {/* The scroll lives here: the app's sticky header and its anchors stay inside. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}
