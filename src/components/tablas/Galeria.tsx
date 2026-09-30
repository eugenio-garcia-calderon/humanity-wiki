import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Plus } from 'lucide-react';
import { formatear, type Celda, type Columna } from './Celda';
import { cn } from '../../utils/cn';

// ============================================================================
// TABLAS · LA GALERÍA (2026-09-30)
// ============================================================================
// Eugenio: «una vista de galería como la que tiene Notion, y que sea la vista
// por defecto; cuando pinchas en la imagen se te abre esa página dentro de esa
// base de datos».
//
// Cada tarjeta ES una página: la fila y su cuerpo. La imagen sale de la
// portada de la página o, si no tiene, de la primera imagen que haya dentro
// —lo mismo que hace Notion con «contenido de la página»—. Las filas de antes
// del 30 de septiembre no tienen página todavía: se crea al abrirlas.

type Fila = {
  id: string;
  pagina_id?: string | null;
  pagina?: { titulo: string; imagen: string | null; icono: string | null; resumen: string } | null;
  celdas: Record<string, Celda>;
  apuntados?: Record<string, any[]>;
  archivos?: Record<string, any[]>;
};

/** Cuántas propiedades se enseñan bajo el título. Más no caben sin que la
 *  tarjeta se convierta en una ficha. */
const PROPIEDADES = 3;

/** ¿El icono es una imagen subida o un emoji? */
const esUrl = (s: string) => /^(https?:|\/)/.test(s);

export default function Galeria({ tablaId, columnas, filas, columnaTitulo, editable, onCambio }: {
  tablaId: string;
  columnas: Columna[];
  filas: Fila[];
  columnaTitulo: string | null;
  editable: boolean;
  /** Tras crear algo, para que la tabla se recargue. */
  onCambio: () => void;
}) {
  const navigate = useNavigate();
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const colTitulo = columnas.find(c => c.id === columnaTitulo) || null;
  const otras = columnas.filter(c => c.id !== columnaTitulo).slice(0, PROPIEDADES);

  const abrir = async (f: Fila) => {
    setFallo(null);
    if (f.pagina_id) { navigate(`/paginas/${f.pagina_id}`); return; }
    setAbriendo(f.id);
    try {
      const r = await fetch(`/api/bd/filas/${f.id}/pagina`, { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (!r.ok || !j.pagina_id) throw new Error(j.error || 'No se pudo abrir la página.');
      navigate(`/paginas/${j.pagina_id}`);
    } catch (e: any) { setFallo(e.message); setAbriendo(null); }
  };

  /** «+ Nuevo», como en Notion: la página nace y se abre para escribirla. */
  const nueva = async () => {
    setFallo(null);
    setAbriendo('nueva');
    try {
      const r = await fetch(`/api/bd/tablas/${tablaId}/filas`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const j = await r.json();
      if (!r.ok || !j.pagina_id) throw new Error(j.error || 'No se pudo crear la página.');
      onCambio();
      navigate(`/paginas/${j.pagina_id}`);
    } catch (e: any) { setFallo(e.message); setAbriendo(null); }
  };

  return (
    <div className="p-3">
      {fallo && <p className="mb-2 text-xs font-bold text-rose-600">{fallo}</p>}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filas.map(f => {
          const nombre = (colTitulo && formatear(f.celdas[colTitulo.id] ?? { estado: 'vacia' }, colTitulo))
            || f.pagina?.titulo || '';
          const icono = f.pagina?.icono;
          return (
            <button key={f.id} onClick={() => abrir(f)}
              className="group text-left rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="aspect-[16/9] bg-slate-50 border-b border-slate-100 overflow-hidden grid place-items-center">
                {f.pagina?.imagen ? (
                  <img src={f.pagina.imagen} alt="" loading="lazy"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                ) : f.pagina?.resumen ? (
                  // Sin imagen, Notion enseña el principio del texto. Mejor
                  // que un hueco gris: dice de qué va sin abrirla.
                  <p className="w-full h-full p-3 text-[11px] leading-snug text-slate-400 overflow-hidden">{f.pagina.resumen}</p>
                ) : (
                  <FileText className="w-8 h-8 text-slate-200" />
                )}
              </div>
              <div className="px-3 py-2.5 space-y-1">
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800 min-w-0">
                  {abriendo === f.id ? <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-400" />
                    : icono ? (esUrl(icono)
                      ? <img src={icono} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                      : <span className="shrink-0">{icono}</span>)
                    : null}
                  <span className={cn('truncate', !nombre && 'text-slate-400')}>{nombre || 'Sin título'}</span>
                </p>
                {otras.map(c => {
                  const v = formatear(f.celdas[c.id] ?? { estado: 'vacia' }, c,
                    { apuntados: f.apuntados?.[c.id], archivos: f.archivos?.[c.id] });
                  return v ? (
                    <p key={c.id} className="text-xs text-slate-500 truncate">
                      <span className="text-slate-400">{c.nombre}: </span>{v}
                    </p>
                  ) : null;
                })}
              </div>
            </button>
          );
        })}
        {editable && (
          <button onClick={nueva} disabled={abriendo === 'nueva'}
            className="min-h-[9rem] rounded-xl border border-dashed border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-colors">
            {abriendo === 'nueva' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Nueva página
          </button>
        )}
      </div>
      {!filas.length && !editable && (
        <p className="py-6 text-center text-xs text-slate-400">Todavía no hay nada en esta base de datos.</p>
      )}
    </div>
  );
}
