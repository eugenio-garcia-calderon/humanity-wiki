import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Database, AlertTriangle } from 'lucide-react';

// ============================================================================
// ¿SEGURO QUE QUIERES BORRAR ESTA BASE DE DATOS? (2026-10-20, Eugenio)
// ============================================================================
// «Una capa de seguridad para que, si por error se le da a borrar una base de
// datos, salga un mensaje que te obligue a decir sí o no, con dos opciones:
// "Mantener base de datos" o "Borrar base de datos". Para que no sea confuso.»
//
// Nada de «Aceptar / Cancelar»: cada botón dice lo que hace. Pinchar fuera no
// cierra (hay que elegir); Escape es «Mantener», que es lo seguro, y es el
// botón que lleva el foco.

type Opciones = {
  /** Las bases de datos que se van, para decir cuáles por su nombre. */
  tablaIds: string[];
  /** Qué pasa exactamente al borrar (depende de desde dónde se borre). */
  detalle?: string;
};

/** Pregunta y espera: `true` = borrar, `false` = mantener. */
export function preguntarBorrarBd(o: Opciones): Promise<boolean> {
  return new Promise(resolver => {
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    const raiz = createRoot(caja);
    const fin = (si: boolean) => { raiz.unmount(); caja.remove(); resolver(si); };
    raiz.render(<Pregunta {...o} onFin={fin} />);
  });
}

function Pregunta({ tablaIds, detalle, onFin }: Opciones & { onFin: (si: boolean) => void }) {
  const [nombres, setNombres] = useState<string[]>([]);
  const mantener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    mantener.current?.focus();
    const ids = [...new Set(tablaIds)].filter(Boolean);
    if (ids.length) {
      fetch(`/api/bd/titulos?ids=${encodeURIComponent(ids.join(','))}`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : {})).then((j: Record<string, string>) => setNombres(ids.map(i => j?.[i]).filter(Boolean))).catch(() => {});
    }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onFin(false); } };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const varias = tablaIds.length > 1;
  return (
    <div className="fixed inset-0 z-[10050] grid place-items-center bg-slate-900/50 p-4" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="pregunta-bd-titulo" aria-describedby="pregunta-bd-texto"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 id="pregunta-bd-titulo" className="text-lg font-black leading-tight text-slate-900">
              {varias ? `¿Seguro que quieres borrar estas ${tablaIds.length} bases de datos?` : '¿Seguro que quieres borrar esta base de datos?'}
            </h2>
            {nombres.length > 0 && (
              <ul className="mt-2 space-y-1">
                {nombres.map(n => (
                  <li key={n} className="flex items-center gap-1.5 text-sm font-bold text-slate-700"><Database className="h-3.5 w-3.5 text-slate-400" /> {n}</li>
                ))}
              </ul>
            )}
            <p id="pregunta-bd-texto" className="mt-2 text-sm leading-relaxed text-slate-500">
              {detalle || 'Se quitará con todas sus entradas.'}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button ref={mantener} type="button" onClick={() => onFin(false)}
            className="h-12 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300">
            Mantener base de datos
          </button>
          <button type="button" onClick={() => onFin(true)}
            className="h-12 rounded-xl border-2 border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200">
            Borrar base de datos
          </button>
        </div>
      </div>
    </div>
  );
}
