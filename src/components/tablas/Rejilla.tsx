import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, AlertTriangle, Loader2, Table2 } from 'lucide-react';
import CeldaTabla, { type Celda, type Columna } from './Celda';
import { useEsMovil } from '../../hooks/useEsMovil';
import { cn } from '../../utils/cn';

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
  celdas: Record<string, Celda>;
  apuntados?: Record<string, any[]>;
  archivos?: Record<string, any[]>;
};

export default function Rejilla({ tablaId, editable = true, alto }: {
  tablaId: string;
  editable?: boolean;
  /** Alto máximo cuando va incrustada en una página. Suelta ocupa lo que haya. */
  alto?: number;
}) {
  const esMovil = useEsMovil();
  const [datos, setDatos] = useState<{
    tabla: any; columnas: Columna[]; filas: Fila[]; ciclo?: string[]; total?: number; mostradas?: number;
  } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<string | null>(null);

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
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/60">
        <Table2 className="w-4 h-4 text-slate-400 shrink-0" />
        <p className="text-xs font-black text-slate-700 truncate">{datos.tabla.titulo}</p>
        <span className="text-[11px] text-slate-400">
          {/* Si hay filtro puesto se dice: sin este número, una tabla filtrada y
              una completa se ven igual y nadie sabe que mira un trozo. */}
          {datos.mostradas !== undefined && datos.total !== undefined && datos.mostradas !== datos.total
            ? `${datos.mostradas} de ${datos.total} filas`
            : `${filas.length} ${filas.length === 1 ? 'fila' : 'filas'}`}
        </span>
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

      {/* ── MÓVIL: FICHAS ─────────────────────────────────────────────────── */}
      {esMovil ? (
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
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">{c.nombre}</span>
                    <span className="ml-1.5 text-[10px] font-bold text-slate-300">{c.tipo}</span>
                  </th>
                ))}
                {editable && <th className="border-b border-slate-200 w-10" />}
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id} className="hover:bg-slate-50/40">
                  {columnas.map(c => (
                    <td key={c.id} className="border-b border-r border-slate-100 p-0 align-top">
                      <CeldaTabla celda={f.celdas[c.id] ?? { estado: 'vacia' }} columna={c}
                        apuntados={f.apuntados?.[c.id]} archivos={f.archivos?.[c.id]}
                        editable={editable} onGuardar={v => guardar(f.id, c.id, v)} />
                    </td>
                  ))}
                  {editable && (
                    <td className="border-b border-slate-100 text-center">
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

      {editable && (
        <button onClick={anadirFila}
          className="w-full flex items-center gap-1.5 px-3 h-11 border-t border-slate-100 text-xs font-bold text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors">
          <Plus className="w-4 h-4" /> Añadir fila
        </button>
      )}
    </div>
  );
}
