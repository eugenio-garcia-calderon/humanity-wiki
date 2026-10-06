import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';

// ============================================================================
// UNA LISTA DE PERSONAS EN UNA VENTANA (2026-10-06, carril «acceso»)
// ============================================================================
// Seguidores de una página, o seguidores y seguidos de una persona. Sólo
// nombre y foto; cada fila lleva a su perfil.

export default function ListaPersonas({ titulo, url, onCerrar }: { titulo: string; url: string; onCerrar: () => void }) {
  const [lista, setLista] = useState<any[] | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    fetch(url, { credentials: 'include' }).then(r => (r.ok ? r.json() : Promise.reject())).then(j => setLista(Array.isArray(j) ? j : [])).catch(() => setFallo(true));
  }, [url]);
  useEffect(() => {
    const t = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', t);
    return () => window.removeEventListener('keydown', t);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-[9996] grid place-items-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div role="dialog" aria-label={titulo} className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-black text-slate-800">{titulo}</p>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {fallo && <p className="p-3 text-xs font-bold text-rose-700">No se ha podido cargar.</p>}
          {!lista && !fallo && <p className="flex items-center gap-2 p-3 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…</p>}
          {lista && !lista.length && <p className="p-4 text-center text-xs text-slate-400">Todavía nadie.</p>}
          {lista?.map(p => (
            <Link key={p.id} to={`/personas/${p.id}`} onClick={onCerrar} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
              {p.foto ? <img src={p.foto} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-black text-slate-500">{(p.nombre || '?').charAt(0).toUpperCase()}</span>}
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{p.nombre || 'Persona'}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
