import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, LayoutGrid, X } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// LA GALERÍA EN CARRUSEL (2026-10-06)
// ============================================================================
// Eugenio: «una única fila de imágenes que se van moviendo lentamente en modo
// carrusel, para hacer ver que hay muchas entradas. Con el ratón encima, se
// para. Flechas bien grandes a los lados, y también se puede pinchar y
// arrastrar como una galería de fotos. Debajo, un botón sutil pero visible,
// "Ver todo", que abre en un pop-up la misma galería con todas las entradas,
// sin carrusel; pinchar fuera lo cierra».
//
// CÓMO ESTÁ HECHO
//   · Una fila con `overflow-x: auto` (scrollbar oculta) y la lista DUPLICADA.
//     Al pasar de la mitad se resta la mitad, y al llegar al principio se
//     suma: el salto es invisible porque las dos mitades son idénticas. Es el
//     truco de siempre y evita animar con `transform`, que habría obligado a
//     reimplementar el arrastre y el desplazamiento táctil.
//   · Con el dedo se usa el desplazamiento nativo del navegador (inercia
//     incluida). Con el ratón se arrastra a mano, y un arrastre NO es un clic:
//     pasados 5 px se anula el clic que vendría detrás, o cada vez que alguien
//     soltara el ratón sobre una tarjeta se abriría su página.
//   · Se mueve sola con `requestAnimationFrame` y el tiempo real entre cuadros,
//     no con un número de píxeles por cuadro: en una pantalla de 120 Hz iría
//     al doble. Se para con el ratón encima, al arrastrar, con el foco dentro,
//     en una pestaña oculta (el navegador ya detiene los cuadros) y si la
//     persona pidió «reducir movimiento» en su sistema.
//   · Si TODAS caben en la fila no hay nada que mover: se muestran quietas,
//     centradas, sin flechas ni «Ver todo». Un carrusel que gira con tres
//     tarjetas parece roto.

/** La velocidad de siempre; cada vista Carrusel puede elegir otra (2026-10-06). */
export const VELOCIDAD_CARRUSEL = 28;
const HUECO = 16;

export default function GaleriaCarrusel({ tarjetas, copias, ancho, pie, todo, titulo = 'Todas las entradas', velocidad = VELOCIDAD_CARRUSEL }: {
  /** Píxeles por segundo. */
  velocidad?: number;
  /** Las tarjetas, ya pintadas. */
  tarjetas: ReactNode[];
  /** Las mismas, para la segunda vuelta (sin foco, ocultas a lectores). */
  copias: ReactNode[];
  /** Ancho de cada tarjeta, en píxeles. */
  ancho: number;
  /** Lo que va junto al botón «Ver todo» (por ejemplo «Nueva página»). */
  pie?: ReactNode;
  /** La galería completa, sin carrusel, para el pop-up. */
  todo: ReactNode;
  titulo?: string;
}) {
  const fila = useRef<HTMLDivElement>(null);
  const primera = useRef<HTMLDivElement>(null);
  const [desborda, setDesborda] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const encima = useRef(false);
  const arrastrando = useRef(false);
  const foco = useRef(false);
  const pausaHasta = useRef(0);
  const pos = useRef(0);
  // En un ref: cambiar la velocidad no reinicia el movimiento ni lo hace saltar.
  const rapidez = useRef(velocidad);
  rapidez.current = velocidad;
  const [reducir] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });

  /** ¿Caben todas? Se mide la mitad del contenido contra el ancho visible. */
  const medir = useCallback(() => {
    const f = fila.current, p = primera.current;
    if (!f || !p) return;
    const cabe = p.scrollWidth <= f.clientWidth + 1;
    setDesborda(!cabe);
  }, []);
  useLayoutEffect(() => { medir(); }, [medir, tarjetas.length, ancho]);
  useEffect(() => {
    const f = fila.current;
    if (!f || typeof ResizeObserver === 'undefined') return;
    const o = new ResizeObserver(medir); o.observe(f);
    return () => o.disconnect();
  }, [medir]);

  const mitad = () => primera.current?.offsetWidth ?? 0;
  /** Mantiene `scrollLeft` dentro de la zona donde el salto no se nota. */
  const envolver = () => {
    const f = fila.current, m = mitad();
    if (!f || !m) return;
    if (f.scrollLeft >= m) { f.scrollLeft -= m; pos.current = f.scrollLeft; }
    else if (f.scrollLeft <= 0) { f.scrollLeft += m; pos.current = f.scrollLeft; }
  };
  // Al empezar se coloca en la mitad: así hay sitio para ir hacia atrás.
  useLayoutEffect(() => {
    const f = fila.current;
    if (f && desborda) { f.scrollLeft = mitad(); pos.current = f.scrollLeft; }
  }, [desborda, ancho, tarjetas.length]);

  // El movimiento lento.
  useEffect(() => {
    if (!desborda || reducir) return;
    let id = 0, antes = performance.now();
    const paso = (t: number) => {
      const dt = Math.min(0.1, (t - antes) / 1000); antes = t;
      const f = fila.current;
      if (f && !encima.current && !arrastrando.current && !foco.current && t > pausaHasta.current) {
        // Si alguien movió la fila por su cuenta, se sigue desde donde quedó.
        if (Math.abs(f.scrollLeft - pos.current) > 1.5) pos.current = f.scrollLeft;
        pos.current += rapidez.current * dt;
        f.scrollLeft = pos.current;
        envolver();
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [desborda, reducir]);

  const flecha = (dir: -1 | 1) => {
    const f = fila.current; if (!f) return;
    pausaHasta.current = performance.now() + 1500;
    // Antes de saltar a mano se asegura que queda margen para el salto.
    envolver();
    f.scrollBy({ left: dir * Math.max(ancho + HUECO, f.clientWidth * 0.8), behavior: 'smooth' });
  };

  // Arrastrar con el ratón.
  const gesto = useRef<{ x: number; izq: number; movido: boolean } | null>(null);
  const abajo = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const f = fila.current; if (!f) return;
    gesto.current = { x: e.clientX, izq: f.scrollLeft, movido: false };
  };
  const mueve = (e: React.PointerEvent) => {
    const g = gesto.current, f = fila.current; if (!g || !f) return;
    const dx = e.clientX - g.x;
    if (!g.movido && Math.abs(dx) > 5) {
      g.movido = true; arrastrando.current = true;
      try { f.setPointerCapture(e.pointerId); } catch { /* ya no está */ }
    }
    if (g.movido) { f.scrollLeft = g.izq - dx; pos.current = f.scrollLeft; envolver(); }
  };
  const suelta = () => {
    const g = gesto.current; gesto.current = null;
    if (g?.movido) { arrastrando.current = false; pausaHasta.current = performance.now() + 600; huboArrastre.current = true; setTimeout(() => { huboArrastre.current = false; }, 0); }
  };
  const huboArrastre = useRef(false);

  // El pop-up: Escape cierra, y el fondo no se desplaza detrás.
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [abierto]);

  const boton = 'absolute top-1/2 z-10 -translate-y-1/2 grid h-14 w-14 place-items-center rounded-full bg-white/95 text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900 hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-400 sm:h-16 sm:w-16';

  return (
    <div>
      <div className="relative"
        onMouseEnter={() => { encima.current = true; }}
        onMouseLeave={() => { encima.current = false; }}
        onFocusCapture={() => { foco.current = true; }}
        onBlurCapture={() => { foco.current = false; }}>
        {desborda && (
          <>
            <button type="button" aria-label="Ver las anteriores" onClick={() => flecha(-1)} className={cn(boton, '-left-1 sm:left-1')}>
              <ChevronLeft className="h-8 w-8" strokeWidth={2.5} />
            </button>
            <button type="button" aria-label="Ver las siguientes" onClick={() => flecha(1)} className={cn(boton, '-right-1 sm:right-1')}>
              <ChevronRight className="h-8 w-8" strokeWidth={2.5} />
            </button>
          </>
        )}
        <div ref={fila}
          onPointerDown={abajo} onPointerMove={mueve} onPointerUp={suelta} onPointerCancel={suelta}
          onClickCapture={e => { if (huboArrastre.current) { e.preventDefault(); e.stopPropagation(); } }}
          onScroll={desborda ? envolver : undefined}
          onTouchStart={() => { pausaHasta.current = performance.now() + 2500; }}
          className={cn('flex overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            desborda ? 'cursor-grab active:cursor-grabbing select-none' : 'justify-center')}
          style={{ touchAction: 'pan-x pan-y' }}>
          <div ref={primera} className="flex shrink-0" style={{ gap: HUECO, paddingRight: desborda ? HUECO : 0 }}>
            {tarjetas.map((t, i) => <div key={i} className="shrink-0" style={{ width: ancho }}>{t}</div>)}
          </div>
          {desborda && (
            <div className="flex shrink-0" style={{ gap: HUECO, paddingRight: HUECO }} aria-hidden>
              {copias.map((t, i) => <div key={i} className="shrink-0" style={{ width: ancho }}>{t}</div>)}
            </div>
          )}
        </div>
      </div>

      {(desborda || pie) && (
        <div className="mt-3 flex items-center justify-center gap-3">
          {desborda && (
            <button type="button" onClick={() => setAbierto(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[13px] font-bold text-slate-600 shadow-sm transition-colors hover:border-emerald-400 hover:text-emerald-700">
              <LayoutGrid className="h-4 w-4" /> Ver todo
            </button>
          )}
          {pie}
        </div>
      )}

      {abierto && createPortal(
        <div role="dialog" aria-modal="true" aria-label={titulo}
          onClick={e => { if (e.target === e.currentTarget) setAbierto(false); }}
          className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-8">
          <div className="relative my-auto w-full max-w-6xl rounded-3xl bg-white p-4 shadow-2xl sm:p-8">
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar"
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <X className="h-5 w-5" />
            </button>
            <p className="mb-4 pr-12 text-sm font-black text-slate-500">{titulo} · {tarjetas.length}</p>
            {todo}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
