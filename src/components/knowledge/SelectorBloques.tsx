import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Wand2, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// EL SELECTOR DE BLOQUES (2026-10-05)
// ============================================================================
// Eugenio: «que el selector de crear un nuevo bloque sea más visual, con
// iconos y textos más grandes, separando las herramientas sofisticadas (mapa,
// base de datos, pizarra) de lo básico (texto, titular, imagen, vídeo,
// archivo, página web)».
//
// Tres alturas, de lo que más se usa a lo que menos:
//   1. BÁSICOS: fichas grandes, icono en su color y nombre. Lo que se pone
//      sin pensar.
//   2. HERRAMIENTAS: tarjetas con una línea que dice qué hace cada una. Son
//      cosas con dentro (columnas, un lienzo, un mapa); merecen explicarse.
//   3. FORMATO DE TEXTO: una fila de botones pequeños. Son variantes de
//      escribir, se reconocen por el nombre.
// Arriba, un buscador: al escribir, desaparecen los grupos y queda una lista
// sola, y Intro pone el primero. La lista sigue siendo la de `Documento.tsx`
// (`TIPOS_MENU`): aquí sólo se viste.

export type OpcionBloque = {
  tipo: string; label: string; icon: any;
  grupo: 'basico' | 'herramienta' | 'formato' | 'tienda';
  desc?: string; color?: string; claves?: string;
};

const GRUPOS: { id: OpcionBloque['grupo']; titulo: string }[] = [
  { id: 'basico', titulo: 'Básicos' },
  { id: 'herramienta', titulo: 'Herramientas' },
  { id: 'tienda', titulo: 'Tienda' },
  { id: 'formato', titulo: 'Formato de texto' },
];

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function SelectorBloques({ opciones, onElegir, movil, extra }: {
  opciones: OpcionBloque[];
  onElegir: (tipo: string) => void;
  movil?: boolean;
  /** Acciones sobre el bloque de al lado (mejorar con IA, eliminar). */
  extra?: { mejorar?: () => void; eliminar?: () => void };
}) {
  const [q, setQ] = useState('');
  const [elegido, setElegido] = useState(0);
  const buscador = useRef<HTMLInputElement>(null);
  // En el móvil no se abre el teclado solo: taparía la mitad del selector.
  useEffect(() => { if (!movil) buscador.current?.focus({ preventScroll: true }); }, [movil]);

  const filtradas = useMemo(() => {
    const t = sinTildes(q.trim());
    if (!t) return [];
    return opciones.filter(o => sinTildes(`${o.label} ${o.desc || ''} ${o.claves || ''} ${o.tipo}`).includes(t));
  }, [q, opciones]);

  const teclas = (e: React.KeyboardEvent) => {
    if (!filtradas.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setElegido(i => (i + 1) % filtradas.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setElegido(i => (i - 1 + filtradas.length) % filtradas.length); }
    else if (e.key === 'Enter') { e.preventDefault(); onElegir(filtradas[Math.min(elegido, filtradas.length - 1)].tipo); }
  };

  const Icono = ({ o, grande }: { o: OpcionBloque; grande?: boolean }) => (
    <span className={cn('grid place-items-center shrink-0 rounded-xl', grande ? 'w-11 h-11' : 'w-9 h-9', o.color || 'bg-slate-100 text-slate-600')}>
      <o.icon className={grande ? 'w-5 h-5' : 'w-[18px] h-[18px]'} strokeWidth={2} />
    </span>
  );

  return (
    <div className={cn('bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden',
      movil ? 'w-full rounded-t-3xl max-h-[80vh]' : 'w-[26rem] rounded-2xl max-h-[min(36rem,75vh)]')}
      onMouseDown={e => { if (e.target !== buscador.current) e.preventDefault(); }}>
      {movil && <span aria-hidden className="mx-auto mt-2 w-10 h-1 rounded-full bg-slate-200 shrink-0" />}
      <div className="p-3 pb-2 shrink-0">
        <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400/60 transition">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input ref={buscador} value={q} onChange={e => { setQ(e.target.value); setElegido(0); }} onKeyDown={teclas}
            placeholder="Buscar un bloque…" aria-label="Buscar un bloque"
            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none" />
        </label>
      </div>

      <div className="overflow-y-auto px-3 pb-3">
        {q.trim() ? (
          filtradas.length ? (
            <div role="listbox" aria-label="Bloques" className="flex flex-col gap-0.5">
              {filtradas.map((o, i) => (
                <button key={o.tipo} role="option" aria-selected={i === elegido} onClick={() => onElegir(o.tipo)}
                  onMouseEnter={() => setElegido(i)}
                  className={cn('flex items-center gap-3 p-1.5 rounded-xl text-left transition-colors', i === elegido ? 'bg-emerald-50' : 'hover:bg-slate-50')}>
                  <Icono o={o} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-800">{o.label}</span>
                    {o.desc && <span className="block text-xs text-slate-500 truncate">{o.desc}</span>}
                  </span>
                </button>
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">Ningún bloque se llama «{q}».</p>
        ) : GRUPOS.map(g => {
          const del = opciones.filter(o => o.grupo === g.id);
          if (!del.length) return null;
          return (
            <section key={g.id} className="pt-2 first:pt-0">
              <h3 className="px-1 pb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">{g.titulo}</h3>
              {g.id === 'basico' ? (
                <div className="grid grid-cols-3 gap-2">
                  {del.map(o => (
                    <button key={o.tipo} onClick={() => onElegir(o.tipo)} title={o.desc}
                      className="group flex flex-col items-center justify-center gap-2 h-[5.5rem] rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 hover:-translate-y-px active:translate-y-0 transition-all">
                      <Icono o={o} grande />
                      <span className="text-[13px] font-bold text-slate-700 group-hover:text-slate-900">{o.label}</span>
                    </button>
                  ))}
                </div>
              ) : g.id === 'formato' ? (
                <div className="flex flex-wrap gap-1.5">
                  {del.map(o => (
                    <button key={o.tipo} onClick={() => onElegir(o.tipo)}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-slate-200 text-[13px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                      <o.icon className="w-4 h-4 text-slate-400" /> {o.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {del.map(o => (
                    <button key={o.tipo} onClick={() => onElegir(o.tipo)}
                      className="flex items-start gap-2.5 p-2.5 rounded-2xl border border-slate-200 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
                      <Icono o={o} />
                      <span className="min-w-0 pt-0.5">
                        <span className="block text-[13px] font-bold text-slate-800 leading-tight">{o.label}</span>
                        {o.desc && <span className="block mt-0.5 text-[11px] leading-snug text-slate-500">{o.desc}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {(extra?.mejorar || extra?.eliminar) && (
        <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-t border-slate-100 bg-slate-50/70">
          {extra.mejorar && (
            <button onClick={extra.mejorar} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-bold text-indigo-600 hover:bg-indigo-50">
              <Wand2 className="w-4 h-4" /> Mejorar con IA
            </button>
          )}
          {extra.eliminar && (
            <button onClick={extra.eliminar} className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-bold text-rose-500 hover:bg-rose-50">
              <Trash2 className="w-4 h-4" /> Eliminar bloque
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * El selector flota sobre la página, no dentro de ella: la caja del editor
 * recorta lo que se sale (`overflow`), y el selector, más alto que una línea,
 * salía cortado. Se mide dónde está el ancla y se pinta en `body`, debajo si
 * cabe y encima si no.
 */
export function Flotante({ children }: { children: React.ReactNode }) {
  const ancla = useRef<HTMLSpanElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const medir = () => {
      const a = ancla.current?.getBoundingClientRect();
      const alto = caja.current?.offsetHeight || 480;
      const ancho = caja.current?.offsetWidth || 416;
      if (!a) return;
      const abajo = window.innerHeight - a.bottom - 12;
      const top = abajo >= alto || a.top < alto ? Math.min(a.bottom + 4, window.innerHeight - alto - 8) : a.top - alto - 4;
      setPos({ left: Math.max(8, Math.min(a.left, window.innerWidth - ancho - 8)), top: Math.max(8, top) });
    };
    medir();
    // Una segunda vez ya con el alto real de la caja.
    const r = requestAnimationFrame(medir);
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => { cancelAnimationFrame(r); window.removeEventListener('resize', medir); window.removeEventListener('scroll', medir, true); };
  }, []);
  return (
    <>
      <span ref={ancla} className="absolute left-0 top-full" />
      {createPortal(
        <div ref={caja} className="fixed z-50" style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
          onClick={e => e.stopPropagation()}>
          {children}
        </div>, document.body)}
    </>
  );
}
