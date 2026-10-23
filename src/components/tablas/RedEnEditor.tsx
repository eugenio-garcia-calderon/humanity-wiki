import { useEffect, useState } from 'react';
import { Link2, Check, Layers } from 'lucide-react';
import RedRelaciones, { type Grupo } from '../sitio/RedRelaciones';
import PropiedadesFila from './PropiedadesFila';
import Rejilla from './Rejilla';

// ============================================================================
// LA RED DE UNA ENTRADA, EN EL EDITOR (2026-10-23, Eugenio)
// ============================================================================
// «La vista de una entrada con todos sus enlaces es distinta en el editor que
// en la página publicada. Haz que sea la misma.» → la misma `RedRelaciones`.
//
// Y LA VISTA ENLAZADA (el mismo día): «que desde ahí se pueda modificar la base
// de datos, crear entradas, cambiar la vista… que sea una vista de la
// original, como hace Notion». Al abrir una pestaña, en vez de tarjetas sale la
// base de datos ORIGINAL (`Rejilla`) filtrada a lo conectado con esta entrada:
//   - editar una celda edita la original (es la misma tabla);
//   - «Añadir» crea la entrada en la original y ya conectada con esta
//     (como un filtro «Relación contiene esta página» de Notion);
//   - galería, tabla, tablero… y sus filtros y orden propios, y la forma
//     elegida se recuerda por pestaña (`vista-red`).
export default function RedEnEditor({ paginaId, titulo, tablaId, filaId, editable }: {
  paginaId: string; titulo: string; tablaId: string; filaId: string; editable: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [vuelta, setVuelta] = useState(0);
  const [vistas, setVistas] = useState<Record<string, string>>({});
  // Lo que cambie una base de datos (aquí o en otra parte de la página) se ve en las pestañas.
  useEffect(() => {
    const otra = () => setVuelta(v => v + 1);
    window.addEventListener('bd:cambio', otra);
    return () => window.removeEventListener('bd:cambio', otra);
  }, []);

  const guardarVista = (g: Grupo, v: string) => {
    setVistas(x => ({ ...x, [g.columna_id]: v }));
    if (!editable) return;
    fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}/vista-red`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columna_id: g.columna_id, vista: v }),
    }).catch(() => {});
  };

  const vistaEnlazada = (g: Grupo, fila: string) => {
    if (!g.tabla_destino) return null;
    // Enlace de un solo lado (sin columna de vuelta en la otra tabla): se
    // filtra por las entradas conectadas y la nueva se conecta desde aquí.
    const directas = g.entradas.filter(e => !e.via).map(e => e.fila_id);
    const vinculo = g.vinculo ? { columna_id: g.vinculo, valor: fila } : { ids: g.entradas.map(e => e.fila_id) };
    const conectar = g.vinculo ? undefined : async (nueva: string) => {
      await fetch(`/api/bd/filas/${encodeURIComponent(fila)}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celdas: { [g.columna_id]: [...directas, nueva] } }),
      });
    };
    return (
      <div data-vista-enlazada={g.slug}>
        <p className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          Vista enlazada de <b className="text-slate-700">«{g.tabla_titulo || g.nombre}»</b>: solo lo conectado con <b className="text-slate-700">«{titulo || 'esta entrada'}»</b>.
          {editable && <span>Lo que cambies o añadas aquí cambia en la base de datos original.</span>}
        </p>
        <Rejilla key={g.slug} tablaId={g.tabla_destino} editable={editable}
          vista={vistas[g.columna_id] || g.vista || 'galeria'} onCambiarVista={v => guardarVista(g, String(v))}
          vinculo={vinculo} alCrearEnVinculo={conectar} />
      </div>
    );
  };

  return (
    <div data-red-editor className="mb-6">
      <RedRelaciones paginaId={paginaId} titulo={titulo} enEditor recarga={vuelta} renderGrupo={vistaEnlazada} />
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
