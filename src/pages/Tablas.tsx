import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Table2, Plus, Loader2, ArrowLeft } from 'lucide-react';
import Rejilla from '../components/tablas/Rejilla';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

// ============================================================================
// TABLAS — la herramienta
// ============================================================================
// Lista de tus tablas, y una abierta. Qué tabla se está mirando vive en la
// dirección (`?tabla=`) y no en el estado: así una tabla concreta se puede
// compartir con un enlace, y volver atrás en el navegador funciona.

export default function Tablas() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const abierta = params.get('tabla');
  const [tablas, setTablas] = useState<any[] | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    const r = await fetch('/api/bd/tablas', { credentials: 'include' });
    setTablas(r.ok ? await r.json() : []);
  };
  useEffect(() => { if (user) cargar(); }, [user?.id]);

  const crear = async () => {
    setCreando(true);
    const r = await fetch('/api/bd/tablas', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Tabla sin título' }),
    });
    const j = await r.json();
    setCreando(false);
    if (j.id) { await cargar(); setParams({ tabla: j.id }); }
  };

  if (!user) {
    return <p className="p-6 text-sm text-slate-500">Inicia sesión para ver tus tablas.</p>;
  }

  if (abierta) {
    return (
      <div className="space-y-3">
        <button onClick={() => setParams({})}
          className="inline-flex items-center gap-1.5 h-11 px-2 -ml-2 text-xs font-bold text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Todas las tablas
        </button>
        <Rejilla tablaId={abierta} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Tablas</h1>
        <button onClick={crear} disabled={creando}
          className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
          {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Nueva tabla
        </button>
      </div>

      {tablas === null && <p className="text-sm text-slate-400">Cargando…</p>}

      {tablas?.length === 0 && (
        <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Table2 className="w-8 h-8 mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-600">Todavía no tienes tablas.</p>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Una tabla es una base de datos tuya: columnas con tipo, relaciones con otras tablas,
            y columnas que se calculan solas.
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(tablas || []).map(t => (
          <button key={t.id} onClick={() => setParams({ tabla: t.id })}
            className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl text-left hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
            <span className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 grid place-items-center">
              <Table2 className="w-4 h-4 text-slate-500" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-800 truncate">{t.titulo}</span>
              <span className="block text-[11px] text-slate-400">{t.filas} {Number(t.filas) === 1 ? 'fila' : 'filas'}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
