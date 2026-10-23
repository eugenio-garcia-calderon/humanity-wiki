import { useEffect, useState } from 'react';
import { Link2, Check } from 'lucide-react';
import RedRelaciones from '../sitio/RedRelaciones';
import PropiedadesFila from './PropiedadesFila';

// ============================================================================
// LA RED DE UNA ENTRADA, EN EL EDITOR (2026-10-23, Eugenio)
// ============================================================================
// «La vista de una entrada con todos sus enlaces es distinta en el editor que
// en la página publicada, que ya tiene el submenú con todos los enlaces
// ordenados. Haz que sea la misma.» Así que aquí va la misma `RedRelaciones`
// (pestañas «Todo» + un grupo por enlace, en galería), y para cambiar los
// enlaces, «Editar enlaces» abre las celdas de siempre debajo.
export default function RedEnEditor({ paginaId, titulo, tablaId, filaId, editable }: {
  paginaId: string; titulo: string; tablaId: string; filaId: string; editable: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [vuelta, setVuelta] = useState(0);
  // Lo que cambie otra base de datos de la página también se ve aquí.
  useEffect(() => {
    const otra = () => setVuelta(v => v + 1);
    window.addEventListener('bd:cambio', otra);
    return () => window.removeEventListener('bd:cambio', otra);
  }, []);
  return (
    <div data-red-editor className="mb-6">
      <RedRelaciones key={vuelta} paginaId={paginaId} titulo={titulo} enEditor />
      {editable && (
        <div className="-mt-4 mb-2">
          <button type="button" onClick={() => setEditando(e => !e)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700">
            {editando ? <><Check className="h-3.5 w-3.5" /> Hecho</> : <><Link2 className="h-3.5 w-3.5" /> Editar enlaces</>}
          </button>
          {editando && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <PropiedadesFila tablaId={tablaId} filaId={filaId} editable soloRelaciones alCambiar={() => setVuelta(v => v + 1)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
