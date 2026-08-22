import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, LayoutGrid, Loader2, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  BLOQUES, PLANTILLAS, plantillaDe, type IdBloque, type Portada,
} from './portadaBloques';

/*
 * ELEGIR QUÉ SALE EN TU PORTADA Y EN QUÉ ORDEN (2026-08-22, Eugenio)
 * ============================================================================
 * SUBIR Y BAJAR CON BOTONES, NO ARRASTRANDO. Arrastrar es más bonito de enseñar
 * y peor de usar: con un dedo, en una lista que cabe justa en la pantalla, hay
 * que agarrar sin equivocarse y el propio arrastre hace scroll de la página.
 * Además no funciona con teclado ni con lector de pantalla sin escribir el
 * doble de código. Dos flechas se pulsan igual de bien con el pulgar que con el
 * tabulador.
 *
 * SE GUARDA AL TOCAR, SIN BOTÓN DE GUARDAR. No hay nada que confirmar: se ve el
 * efecto detrás y se deshace con otro toque. Un «Guardar» aquí solo añade una
 * forma de perder lo que acabas de configurar por cerrar el panel.
 */

export function PersonalizarPortada({
  portada,
  onCambiar,
  onCerrar,
}: {
  portada: Portada;
  onCambiar: (p: Portada) => Promise<void> | void;
  onCerrar: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const actual = plantillaDe(portada.bloques);

  const aplicar = async (bloques: IdBloque[]) => {
    setGuardando(true);
    try {
      await onCambiar({ plantilla: plantillaDe(bloques), bloques });
    } finally {
      setGuardando(false);
    }
  };

  const alternar = (id: IdBloque) => {
    const def = BLOQUES.find(b => b.id === id)!;
    if (def.fijo) return;
    aplicar(
      portada.bloques.includes(id)
        ? portada.bloques.filter(b => b !== id)
        // Se añade justo antes del contenido: casi todos estos bloques son
        // cabecera, y ponerlos debajo de las tarjetas sería esconderlos.
        : [...portada.bloques.filter(b => b !== 'contenido'), id, 'contenido'],
    );
  };

  const mover = (id: IdBloque, dir: -1 | 1) => {
    const i = portada.bloques.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= portada.bloques.length) return;
    const copia = [...portada.bloques];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    aplicar(copia);
  };

  const apagados = BLOQUES.filter(b => !portada.bloques.includes(b.id));

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 flex items-end sm:items-center justify-center" onClick={onCerrar}>
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto
                   pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-600" /> Tu portada
            {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />}
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="p-2 -mr-2 min-h-[44px] text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Plantillas</p>
          <div className="space-y-2">
            {PLANTILLAS.map(p => (
              <button
                key={p.id}
                onClick={() => aplicar(p.bloques)}
                className={cn(
                  'w-full min-h-[56px] flex items-start gap-3 p-3 rounded-2xl border text-left transition-colors',
                  actual === p.id
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200 hover:border-emerald-200',
                )}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{p.titulo}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{p.descripcion}</span>
                </span>
                {actual === p.id && <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />}
              </button>
            ))}
          </div>
          {actual === 'propia' && (
            <p className="mt-2 text-xs text-slate-400">
              Estás usando una portada tuya. Toca una plantilla para volver a ella.
            </p>
          )}
        </div>

        <div className="px-5 pt-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Lo que se ve, en orden
          </p>
          <ul className="space-y-2">
            {portada.bloques.map((id, i) => {
              const def = BLOQUES.find(b => b.id === id)!;
              return (
                <li key={id} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2.5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">{def.titulo}</span>
                    <span className="block text-xs text-slate-400 truncate">{def.descripcion}</span>
                  </span>
                  <button
                    onClick={() => mover(id, -1)}
                    disabled={i === 0}
                    aria-label={`Subir ${def.titulo}`}
                    className="w-11 h-11 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-25"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => mover(id, 1)}
                    disabled={i === portada.bloques.length - 1}
                    aria-label={`Bajar ${def.titulo}`}
                    className="w-11 h-11 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 disabled:opacity-25"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => alternar(id)}
                    disabled={def.fijo}
                    aria-label={def.fijo ? `${def.titulo} no se puede quitar` : `Quitar ${def.titulo}`}
                    title={def.fijo ? 'Sin esto la portada se queda vacía' : 'Quitar'}
                    className="w-11 h-11 grid place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {apagados.length > 0 && (
          <div className="px-5 pt-5 pb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Añadir</p>
            <div className="flex flex-wrap gap-2">
              {apagados.map(b => (
                <button
                  key={b.id}
                  onClick={() => alternar(b.id)}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                >
                  + {b.titulo}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
