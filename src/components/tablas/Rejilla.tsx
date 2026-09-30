import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, AlertTriangle, Loader2, Table2, Settings2, LayoutGrid, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Galeria from './Galeria';
import type { TamanoGaleria } from '../../utils/bloques';
import { useSitio } from '../sitio/ContextoSitio';
import EditorColumna from './EditorColumna';
import CeldaTabla, { type Celda, type Columna } from './Celda';
import { useEsMovil } from '../../hooks/useEsMovil';
import { cn } from '../../utils/cn';
import { tonoDe } from '../../utils/coloresBloque';

// ============================================================================
// TABLAS · LA REJILLA
// ============================================================================
// Ver, escribir, añadir y quitar. Se usa igual dentro de la herramienta
// «Tablas» que incrustada en una página, porque es el mismo componente: una
// tabla metida en un documento no es otra cosa, es la misma mirada desde otro
// sitio.
//
// ── EN MÓVIL NO ES UNA REJILLA, SON FICHAS ──────────────────────────────────
// Una tabla de diez columnas en 390 px no es una tabla: son diez columnas de
// 39 px. Por debajo del punto de ruptura, cada fila se pinta como una ficha con
// sus campos en vertical. Es la misma decisión que con el escritorio de
// ventanas: en un teléfono no se traduce, se sustituye.

type Fila = {
  id: string;
  pagina_id?: string | null;
  pagina?: { titulo: string; imagen: string | null; icono: string | null; resumen: string; descripcion?: string | null; encuadre?: { x: number; y: number } | null } | null;
  celdas: Record<string, Celda>;
  apuntados?: Record<string, any[]>;
  archivos?: Record<string, any[]>;
};

export type FormaVista = 'galeria' | 'tabla';

export default function Rejilla({ tablaId, editable = true, alto, vista: vistaInicial, onCambiarVista, color, tamano = 'mediano', onCambiarTamano }: {
  tablaId: string;
  editable?: boolean;
  /** Alto máximo cuando va incrustada en una página. Suelta ocupa lo que haya. */
  alto?: number;
  /** Galería o tabla (2026-09-30). Sin valor, tabla: es lo que se veía hasta
   *  hoy en la herramienta «Tablas». El bloque de página pasa `galeria`. */
  vista?: FormaVista;
  /** Quien la incrusta guarda la elección; si no se pasa, cambiar de vista
   *  vale solo para quien mira y no se recuerda. */
  onCambiarVista?: (v: FormaVista) => void;
  /** El color elegido en el menú del bloque. Ver `tonoDe`. */
  color?: string;
  /** Tamaño de las tarjetas de la galería, y quién lo guarda (el editor). */
  tamano?: TamanoGaleria;
  onCambiarTamano?: (t: TamanoGaleria) => void;
}) {
  const tono = tonoDe(color);
  const esMovil = useEsMovil();
  const navigate = useNavigate();
  const sitio = useSitio();
  const [vista, setVista] = useState<FormaVista>(vistaInicial || 'tabla');
  useEffect(() => { if (vistaInicial) setVista(vistaInicial); }, [vistaInicial]);
  const cambiarVista = (v: FormaVista) => { setVista(v); onCambiarVista?.(v); };
  const [datos, setDatos] = useState<{
    tabla: any; columnas: Columna[]; filas: Fila[]; ciclo?: string[]; total?: number; mostradas?: number;
    columna_titulo?: string | null;
  } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);
  /** `'nueva'` para crear, o la columna que se está editando. */
  const [editorColumna, setEditorColumna] = useState<'nueva' | any | null>(null);

  const cargar = useCallback(async () => {
    setFallo(null);
    try {
      const r = await fetch(`/api/bd/tablas/${tablaId}`, { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) { setFallo(j.error || 'No se pudo cargar la tabla.'); setDatos(null); }
      else setDatos(j);
    } catch (e: any) { setFallo(e.message); }
    setCargando(false);
  }, [tablaId]);

  useEffect(() => { cargar(); }, [cargar]);

  /**
   * Guarda una celda.
   *
   * SE VUELVE A CARGAR LA TABLA ENTERA después de escribir, y no solo la celda.
   * Es a propósito: al cambiar un precio cambian también su fórmula, el agregado
   * del proveedor y el veredicto que depende de él, y ninguno de los tres está
   * en esta fila. Actualizar solo lo tocado dejaría los cálculos enseñando el
   * valor de antes — que es exactamente el fallo que estas fases existen para
   * no tener.
   */
  const guardar = async (filaId: string, columnaId: string, valor: any) => {
    const r = await fetch(`/api/bd/filas/${filaId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ celdas: { [columnaId]: valor } }),
    });
    const j = await r.json();
    if (!r.ok) {
      // El servidor dice QUÉ celda y POR QUÉ. Se devuelve el motivo concreto
      // para que la celda lo enseñe, en vez de un «no se pudo guardar».
      const suyo = (j.fallos || []).find((f: any) => f.columna === columnaId);
      return { error: suyo?.error || j.error || 'No se pudo guardar.' };
    }
    await cargar();
  };

  const anadirFila = async () => {
    await fetch(`/api/bd/tablas/${tablaId}/filas`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    cargar();
  };

  /** El nombre mientras se edita; `null` cuando no se está editando. */
  const [nombre, setNombre] = useState<string | null>(null);
  const [falloNombre, setFalloNombre] = useState<string | null>(null);
  const guardarNombre = async () => {
    if (nombre === null || !datos) return;
    const limpio = nombre.trim();
    if (!limpio || limpio === datos.tabla.titulo) { setNombre(null); setFalloNombre(null); return; }
    const r = await fetch(`/api/bd/tablas/${tablaId}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: limpio }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setFalloNombre(j.error || 'No se pudo cambiar el nombre.'); return; }
    setDatos(d => d ? { ...d, tabla: { ...d.tabla, titulo: j.titulo ?? limpio } } : d);
    setNombre(null); setFalloNombre(null);
  };

  /** Abrir la página de una fila desde la tabla — el «ABRIR» de Notion. */
  const abrirPagina = async (f: Fila) => {
    if (f.pagina_id) { navigate(sitio ? sitio.enlacePagina(f.pagina_id) : `/paginas/${f.pagina_id}`); return; }
    if (sitio) return;
    const r = await fetch(`/api/bd/filas/${f.id}/pagina`, { method: 'POST', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.pagina_id) navigate(`/paginas/${j.pagina_id}`);
    else setFallo(j.error || 'No se pudo abrir la página.');
  };

  const borrarFila = async (filaId: string) => {
    await fetch(`/api/bd/filas/${filaId}`, { method: 'DELETE', credentials: 'include' });
    cargar();
  };

  if (cargando) {
    return <div className="flex items-center gap-2 p-6 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Cargando la tabla…</div>;
  }
  if (fallo) {
    return (
      <div className="flex items-center gap-2 p-4 text-rose-600 text-sm font-bold">
        <AlertTriangle className="w-4 h-4" /> {fallo}
      </div>
    );
  }
  if (!datos) return null;

  const { columnas, filas } = datos;

  return (
    <div className={cn('border border-slate-200 rounded-xl overflow-hidden', tono.fondo || 'bg-white')}>
      <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-slate-100', tono.fondo ? 'bg-white/40' : 'bg-slate-50/60')}>
        <Table2 className="w-4 h-4 text-slate-400 shrink-0" />
        {/* El nombre se cambia pinchando en él (2026-09-30, Eugenio: «permite
            cambiar el nombre de la base de datos»). Enter o salir guarda;
            Escape deja el de antes. */}
        {editable && nombre !== null ? (
          <input autoFocus value={nombre} maxLength={200} aria-label="Nombre de la base de datos"
            onChange={e => setNombre(e.target.value)}
            onBlur={guardarNombre}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') { setNombre(null); setFalloNombre(null); }
            }}
            className={cn('min-w-0 flex-1 max-w-xs h-7 px-1.5 -mx-1.5 rounded border border-slate-300 bg-white text-xs font-black outline-none focus:border-emerald-400', tono.texto || 'text-slate-700')} />
        ) : editable ? (
          <button onClick={() => setNombre(datos.tabla.titulo || '')} title="Cambiar el nombre"
            className={cn('min-w-0 h-7 px-1.5 -mx-1.5 rounded text-xs font-black truncate hover:bg-slate-100 transition-colors', tono.texto || 'text-slate-700')}>
            {datos.tabla.titulo}
          </button>
        ) : (
          <p className={cn('text-xs font-black truncate', tono.texto || 'text-slate-700')}>{datos.tabla.titulo}</p>
        )}
        {falloNombre && <span className="text-[11px] font-bold text-rose-600 truncate">{falloNombre}</span>}
        <span className="text-[11px] text-slate-400">
          {/* Si hay filtro puesto se dice: sin este número, una tabla filtrada y
              una completa se ven igual y nadie sabe que mira un trozo. */}
          {datos.mostradas !== undefined && datos.total !== undefined && datos.mostradas !== datos.total
            ? `${datos.mostradas} de ${datos.total} filas`
            : `${filas.length} ${filas.length === 1 ? 'fila' : 'filas'}`}
        </span>
        {/* Las dos vistas, como las pestañas de Notion. */}
        {/* Tamaño de las tarjetas: sólo en galería y sólo para quien edita. */}
        {vista === 'galeria' && onCambiarTamano && (
          <label className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0">
            <span className="hidden sm:inline">Tamaño</span>
            <select value={tamano} onChange={e => onCambiarTamano(e.target.value as TamanoGaleria)}
              aria-label="Tamaño de las tarjetas"
              className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-bold text-slate-600 outline-none focus:border-emerald-400">
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
              <option value="muy-grande">Muy grande</option>
            </select>
          </label>
        )}
        <div className={cn('flex items-center gap-0.5 shrink-0', !(vista === 'galeria' && onCambiarTamano) && 'ml-auto')} role="tablist">
          {([['galeria', 'Galería', LayoutGrid], ['tabla', 'Tabla', Table2]] as const).map(([v, label, Icono]) => (
            <button key={v} role="tab" aria-selected={vista === v} onClick={() => cambiarVista(v)}
              className={cn('inline-flex items-center gap-1 h-8 px-2 rounded-md text-[11px] font-bold transition-colors',
                vista === v ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-700')}>
              <Icono className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {datos.ciclo?.length && (
        <div className="flex items-start gap-2 px-3 py-2 bg-rose-50 border-b border-rose-100 text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-bold">
            Hay un cálculo circular entre {datos.ciclo.join(' y ')}: esas columnas no se pueden calcular.
            Las demás sí.
          </p>
        </div>
      )}

      {vista === 'galeria' ? (
        <div style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
          <Galeria tablaId={tablaId} columnas={columnas} filas={filas}
            columnaTitulo={datos.columna_titulo ?? null} editable={editable} onCambio={cargar}
            claseTitulo={tono.texto} tamano={tamano} />
        </div>
      ) : esMovil ? (
        <div className="divide-y divide-slate-100" style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
          {filas.map(f => (
            <div key={f.id} className="p-3 space-y-1.5">
              {columnas.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className="w-28 shrink-0 pt-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400 truncate">{c.nombre}</span>
                  <div className="flex-1 min-w-0">
                    <CeldaTabla celda={f.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
                      apuntados={f.apuntados?.[c.id]} archivos={f.archivos?.[c.id]}
                      editable={editable} onGuardar={v => guardar(f.id, c.id, v)} />
                  </div>
                </div>
              ))}
              <button onClick={() => abrirPagina(f)}
                className="mt-1 inline-flex items-center gap-1 h-11 px-2 text-[11px] font-bold text-slate-500 active:text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" /> Abrir página
              </button>
              {editable && (
                <button onClick={() => borrarFila(f.id)}
                  className="mt-1 inline-flex items-center gap-1 h-11 px-2 text-[11px] font-bold text-slate-400 active:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" /> Borrar fila
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ── ESCRITORIO: REJILLA ────────────────────────────────────────── */
        <div className="overflow-x-auto" style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {columnas.map(c => (
                  <th key={c.id} className="border-b border-r border-slate-200 px-2 py-2 text-left min-w-[9rem]">
                    <button
                      onClick={() => editable && setEditorColumna(c)}
                      className={cn('group inline-flex items-baseline gap-1.5 max-w-full', editable && 'cursor-pointer')}>
                      <span className="text-[11px] font-black uppercase tracking-wide text-slate-500 truncate">{c.nombre}</span>
                      <span className="text-[10px] font-bold text-slate-300">{c.tipo}</span>
                      {editable && <Settings2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />}
                    </button>
                  </th>
                ))}
                {editable && (
                  <th className="border-b border-slate-200 w-11 text-center">
                    <button onClick={() => setEditorColumna('nueva')} title="Añadir columna"
                      aria-label="Añadir columna"
                      className="w-11 h-9 grid place-items-center text-slate-400 hover:text-emerald-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/40">
                  {columnas.map((c, ci) => (
                    <td key={c.id} className="group/celda relative border-b border-r border-slate-100 p-0 align-top">
                      {ci === 0 && (
                        <button onClick={() => abrirPagina(f)} title="Abrir la página de esta fila"
                          className="absolute right-1 top-1 z-[1] inline-flex items-center gap-0.5 h-6 px-1.5 rounded border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wide text-slate-500 opacity-0 group-hover/celda:opacity-100 focus:opacity-100 hover:text-emerald-600 transition-opacity">
                          <ArrowUpRight className="w-3 h-3" /> Abrir
                        </button>
                      )}
                      <CeldaTabla celda={f.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
                        apuntados={f.apuntados?.[c.id]} archivos={f.archivos?.[c.id]}
                        editable={editable} onGuardar={v => guardar(f.id, c.id, v)} />
                    </td>
                  ))}
                  {editable && (
                    <td className="border-b border-slate-100 text-center w-11">
                      <button onClick={() => borrarFila(f.id)} title="Borrar la fila"
                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editable && esMovil && vista === 'tabla' && (
        <button onClick={() => setEditorColumna('nueva')}
          className="w-full flex items-center gap-1.5 px-3 h-11 border-t border-slate-100 text-xs font-bold text-slate-400 active:text-emerald-600">
          <Settings2 className="w-4 h-4" /> Añadir columna
        </button>
      )}

      {editorColumna && (
        <EditorColumna
          tablaId={tablaId}
          columna={editorColumna === 'nueva' ? undefined : editorColumna}
          columnas={columnas}
          onCerrar={() => setEditorColumna(null)}
          onHecho={cargar}
        />
      )}

      {editable && vista === 'tabla' && (
        <button onClick={anadirFila}
          className="w-full flex items-center gap-1.5 px-3 h-11 border-t border-slate-100 text-xs font-bold text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors">
          <Plus className="w-4 h-4" /> Añadir fila
        </button>
      )}
    </div>
  );
}
