import { useEffect, useState } from 'react';
import { Database, X, Table2, Rows3, Columns3, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// BASE DE DATOS (2026-08-06, petición del usuario)
// ============================================================================
// El inventario honesto de la plataforma: todas las tablas reales que hay
// ahora mismo en la base de datos. Clic en una tabla → pop-up central con
// su contenido; clic fuera (o Esc) lo cierra. Solo administradores, y las
// columnas sensibles (contraseñas, tokens) nunca salen del servidor.

interface TableInfo { name: string; columns: number; approxRows: number }
interface TableData {
  name: string; columns: string[]; types: Record<string, string>;
  redactedColumns: number; total: number; rows: any[];
}

/** Familia temática de cada tabla, para agrupar el inventario. */
const FAMILY: Array<{ label: string; color: string; match: (t: string) => boolean }> = [
  { label: 'Conocimiento', color: '#7c3aed', match: t => t.startsWith('knowledge_') || t.startsWith('graph_') || t.startsWith('ai_') },
  { label: 'Territorio', color: '#0284c7', match: t => t.startsWith('territor') || t.startsWith('geo') },
  { label: 'Medición', color: '#2563eb', match: t => t.startsWith('indicator') || t.startsWith('marker') || t.startsWith('metric') || t.includes('observation') },
  { label: 'Retos y soluciones', color: '#dc2626', match: t => t.startsWith('challenge') || t.startsWith('solution') || t.startsWith('cause') || t.startsWith('objective') },
  { label: 'Comunidad', color: '#f59e0b', match: t => ['users', 'follows', 'publications', 'comments', 'ratings', 'reactions'].some(p => t.startsWith(p)) },
  { label: 'Mercado', color: '#16a34a', match: t => ['product', 'order', 'payment', 'donation', 'demand', 'need', 'initiative', 'project', 'organization'].some(p => t.startsWith(p)) },
];
const familyOf = (t: string) => FAMILY.find(f => f.match(t)) || { label: 'Sistema', color: '#64748b' };

export default function BaseDeDatos() {
  const { user } = useAuth();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<TableData | null>(null);
  const [openLoading, setOpenLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/db/tables', { credentials: 'include' })
      .then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se pudieron leer las tablas.');
        return j;
      })
      .then(j => setTables(Array.isArray(j) ? j : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Esc cierra el pop-up, igual que el clic fuera.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openTable = (name: string) => {
    setOpenLoading(name);
    fetch(`/api/db/tables/${encodeURIComponent(name)}?limit=50`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (!j.error) setOpen(j); })
      .finally(() => setOpenLoading(null));
  };

  const totalRows = tables.reduce((s, t) => s + Math.max(t.approxRows, 0), 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-12 pb-32">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Database className="w-4.5 h-4.5" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Base de Datos</h1>
            <p className="text-[11px] text-slate-400">
              {tables.length} tablas · ~{totalRows.toLocaleString('es-ES')} filas · clic en una tabla para ver su contenido
            </p>
          </div>
        </div>

        {!user?.isAdmin && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-6">
            Esta página muestra los datos crudos de la plataforma, así que solo pueden verla los administradores.
          </p>
        )}
        {error && user?.isAdmin && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mt-6">{error}</p>
        )}
        {loading && <p className="text-sm text-slate-400 py-16 text-center">Leyendo el catálogo…</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-8">
          {tables.map(t => {
            const fam = familyOf(t.name);
            return (
              <button
                key={t.name}
                onClick={() => openTable(t.name)}
                className="group text-left rounded-2xl border border-slate-200 hover:border-slate-400 bg-white p-3.5 transition-all hover:shadow-md"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: fam.color }} />
                  <span className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: fam.color }}>{fam.label}</span>
                  {openLoading === t.name && <Loader2 className="w-3 h-3 text-slate-400 animate-spin ml-auto" />}
                </div>
                <p className="text-[13px] font-black text-slate-900 leading-tight truncate group-hover:text-slate-700">{t.name}</p>
                <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-0.5"><Rows3 className="w-2.5 h-2.5" />{Math.max(t.approxRows, 0).toLocaleString('es-ES')}</span>
                  <span className="inline-flex items-center gap-0.5"><Columns3 className="w-2.5 h-2.5" />{t.columns}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pop-up central: clic fuera cierra */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
                  <Table2 className="w-4 h-4" style={{ color: familyOf(open.name).color }} /> {open.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {open.total.toLocaleString('es-ES')} filas · {open.columns.length} columnas
                  {open.rows.length < open.total && ` · mostrando las primeras ${open.rows.length}`}
                  {open.redactedColumns > 0 && (
                    <span className="inline-flex items-center gap-1 ml-1.5 text-emerald-700">
                      <ShieldCheck className="w-2.5 h-2.5" /> {open.redactedColumns} columna(s) sensible(s) oculta(s)
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setOpen(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-auto flex-1">
              {open.rows.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-16">Esta tabla está vacía.</p>
              ) : (
                <table className="w-full text-[11px] border-collapse">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      {open.columns.map(c => (
                        <th key={c} className="text-left font-black text-slate-600 px-3 py-2 border-b border-slate-200 whitespace-nowrap">
                          {c}
                          <span className="block font-normal text-[9px] text-slate-400">{open.types[c]}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {open.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        {open.columns.map(c => {
                          const v = row[c];
                          const text = v === null || v === undefined ? '—'
                            : typeof v === 'object' ? JSON.stringify(v)
                            : String(v);
                          return (
                            <td key={c} className="px-3 py-1.5 border-b border-slate-50 text-slate-700 align-top max-w-[260px] truncate" title={text}>
                              {v === null || v === undefined ? <span className="text-slate-300">—</span> : text}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
