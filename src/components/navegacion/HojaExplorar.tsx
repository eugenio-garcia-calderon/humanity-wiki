import { useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import type { Herramienta } from './Rail';

import { t as tr } from '../../i18n';
// ============================================================================
// EXPLORAR, POR ABAJO (2026-10-02)
// ============================================================================
// Eugenio: «el menú de la izquierda, oculto, y que solo se abra cuando el
// usuario le dé a Explorar —arriba a la derecha—; y que no sea un menú
// colapsable a un lado, sino un menú inferior, para que esté todo más
// ordenadito».
//
// Los lados quedan así: a la izquierda tus páginas, a la derecha la IA, y lo
// común —los temas de la humanidad— sube desde abajo cuando se pide y se va
// en cuanto eliges uno.

export default function HojaExplorar({ temas, onElegir, onCerrar, onPersonalizar }: {
  temas: Herramienta[];
  onElegir: (clave: string) => void;
  onCerrar: () => void;
  onPersonalizar?: () => void;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[9996] flex flex-col justify-end">
      <div onClick={onCerrar} aria-hidden className="absolute inset-0 bg-slate-900/25 animate-in fade-in duration-150" />
      <div role="dialog" aria-label={tr('Explorar')}
        className="relative w-full max-h-[62vh] overflow-y-auto bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur flex items-center gap-2 px-5 sm:px-8 pt-3 pb-2">
          <span aria-hidden className="absolute left-1/2 top-1.5 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-200" />
          <h2 className="text-base font-black text-slate-900 mt-2">{tr('Explorar')}</h2>
          <p className="hidden sm:block mt-2 text-xs text-slate-400">{tr('Los temas de la humanidad: elige uno para ver todo lo que hay.')}</p>
          <span className="flex-1" />
          {onPersonalizar && (
            <button type="button" onClick={onPersonalizar}
              className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <SlidersHorizontal className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{tr('Personalizar')}</span>
            </button>
          )}
          <button type="button" onClick={onCerrar} aria-label={tr('Cerrar')}
            className="mt-2 w-10 h-10 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 sm:px-8 pb-6 pt-2 grid grid-cols-2 min-[520px]:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 sm:gap-3">
          {temas.map(t => {
            const Icono = t.icono as any;
            return (
              <button key={t.clave} type="button" onClick={() => onElegir(t.clave)}
                className="group flex items-center gap-2.5 sm:flex-col sm:items-center sm:text-center p-3 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                <span className="w-10 h-10 shrink-0 grid place-items-center rounded-xl bg-slate-50 group-hover:bg-white">
                  {Icono ? <Icono className={`w-5 h-5 ${t.color || 'text-slate-600'}`} /> : null}
                </span>
                {/* Los temas vienen en mayúsculas («AGUA»): aquí se leen mejor en frase. */}
                <span className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">
                  {t.nombre.charAt(0) + t.nombre.slice(1).toLocaleLowerCase('es')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
