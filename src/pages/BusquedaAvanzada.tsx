import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { ETIQUETA_TIPO, IconoResultado, Resaltado, type TipoResultado } from '../components/espacio/Resaltado';
import { cn } from '../utils/cn';

// ============================================================================
// BÚSQUEDA AVANZADA — la pantalla de resultados (2026-10-06, #15)
// ============================================================================
// Todo lo que está en la dirección (`?q=&tipo=&autor=&desde=&hasta=&carpeta=`)
// es el estado de la pantalla: se puede copiar el enlace, volver atrás o
// recargar sin perder la búsqueda. Ordenada por relevancia (título primero),
// con el trozo donde aparece lo buscado. Solo sale lo que puedes ver: lo
// decide el servidor, no esta pantalla.

type Fila = {
  tipo: TipoResultado; id: string; titulo: string; icono: string | null; ruta: string;
  autor: string | null; autor_id: string | null; actualizado: string | null; carpeta: string | null; fragmento: string | null;
};
const TIPOS: { id: string; etiqueta: string }[] = [
  { id: '', etiqueta: 'Todo' }, { id: 'pagina', etiqueta: 'Páginas' }, { id: 'bd', etiqueta: 'Bases de datos' },
  { id: 'carpeta', etiqueta: 'Carpetas' }, { id: 'persona', etiqueta: 'Personas' },
];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const haceDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const RANGOS: { id: string; etiqueta: string; desde: () => string }[] = [
  { id: 'hoy', etiqueta: 'Hoy', desde: () => ymd(new Date()) },
  { id: '7', etiqueta: 'Últimos 7 días', desde: () => haceDias(7) },
  { id: '30', etiqueta: 'Últimos 30 días', desde: () => haceDias(30) },
  { id: '365', etiqueta: 'Último año', desde: () => haceDias(365) },
];
const campo = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-emerald-400';

export default function BusquedaAvanzada() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const tipo = params.get('tipo') || '';
  const autor = params.get('autor') || '';
  const desde = params.get('desde') || '';
  const hasta = params.get('hasta') || '';
  const carpeta = params.get('carpeta') || '';
  const [texto, setTexto] = useState(q);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<{ autores: { id: string; nombre: string; yo: boolean }[]; carpetas: { id: string; titulo: string }[] }>({ autores: [], carpetas: [] });

  useEffect(() => { document.title = q ? `${q} · Búsqueda` : 'Búsqueda'; }, [q]);
  useEffect(() => { setTexto(q); }, [q]);
  useEffect(() => {
    fetch('/api/espacio/filtros', { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => j && setFiltros(j)).catch(() => {});
  }, []);

  const consulta = params.toString();
  useEffect(() => {
    const ctl = new AbortController();
    setFilas(null); setFallo(null);
    fetch(`/api/espacio/buscar?limite=60&${consulta}`, { credentials: 'include', signal: ctl.signal })
      .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'La búsqueda ha fallado.'); return j; })
      .then(j => setFilas(j.resultados || []))
      .catch(e => { if (e.name !== 'AbortError') setFallo(e.message); });
    return () => ctl.abort();
  }, [consulta]);

  const poner = (cambios: Record<string, string>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) { if (v) n.set(k, v); else n.delete(k); }
    setParams(n, { replace: true });
  };
  const rangoActivo = useMemo(() => RANGOS.find(r => hasta === '' && desde === r.desde())?.id || '', [desde, hasta]);
  const hayFiltros = !!(tipo || autor || desde || hasta || carpeta);
  const conFiltroDeDocs = !!(autor || carpeta);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="mb-4 text-xl font-black text-slate-900">Búsqueda</h1>
      <form onSubmit={e => { e.preventDefault(); poner({ q: texto.trim() }); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={texto} onChange={e => setTexto(e.target.value)} autoFocus placeholder="Busca en tus páginas, bases de datos, carpetas y personas" aria-label="Buscar"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[15px] text-slate-900 outline-none focus:border-emerald-400" />
        </div>
        <button type="submit" className="h-11 rounded-xl bg-slate-900 px-4 text-[13px] font-bold text-white hover:bg-slate-800">Buscar</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Tipo">
        {TIPOS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tipo === t.id} onClick={() => poner({ tipo: t.id })}
            className={cn('rounded-full border px-3 py-1 text-[12px] font-bold', tipo === t.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {t.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select aria-label="Autor" value={autor} onChange={e => poner({ autor: e.target.value })} className={campo}>
          <option value="">Cualquier autor</option>
          {filtros.autores.map(a => <option key={a.id} value={a.id}>{a.yo ? 'Yo' : a.nombre}</option>)}
        </select>
        <select aria-label="Última edición" value={rangoActivo} onChange={e => { const r = RANGOS.find(x => x.id === e.target.value); poner({ desde: r ? r.desde() : '', hasta: '' }); }} className={campo}>
          <option value="">Cualquier fecha</option>
          {RANGOS.map(r => <option key={r.id} value={r.id}>{r.etiqueta}</option>)}
          {!rangoActivo && (desde || hasta) && <option value="" disabled>Rango elegido</option>}
        </select>
        <label className="flex items-center gap-1 text-[12px] text-slate-500">Desde <input type="date" value={desde} max={hasta || undefined} onChange={e => poner({ desde: e.target.value })} className={campo} aria-label="Editada desde" /></label>
        <label className="flex items-center gap-1 text-[12px] text-slate-500">hasta <input type="date" value={hasta} min={desde || undefined} onChange={e => poner({ hasta: e.target.value })} className={campo} aria-label="Editada hasta" /></label>
        <select aria-label="Carpeta" value={carpeta} onChange={e => poner({ carpeta: e.target.value })} className={campo}>
          <option value="">Cualquier carpeta</option>
          {filtros.carpetas.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select>
        {hayFiltros && (
          <button type="button" onClick={() => poner({ tipo: '', autor: '', desde: '', hasta: '', carpeta: '' })} className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-500 hover:text-slate-800">
            <X className="h-3.5 w-3.5" /> Quitar filtros
          </button>
        )}
      </div>
      {conFiltroDeDocs && <p className="mt-2 text-[11px] text-slate-400">Con autor o carpeta solo se buscan páginas y bases de datos.</p>}

      <div className="mt-5" aria-live="polite">
        {filas === null && !fallo && <p className="flex items-center gap-2 text-[13px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Buscando…</p>}
        {fallo && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-bold text-rose-700">{fallo}</p>}
        {filas && filas.length === 0 && <p className="py-8 text-center text-[14px] text-slate-500">{q || hayFiltros ? 'No hay nada que coincida. Prueba con menos palabras o quita algún filtro.' : 'Aún no hay nada que buscar.'}</p>}
        {filas && filas.length > 0 && <p className="mb-2 text-[12px] text-slate-400">{filas.length} resultado{filas.length === 1 ? '' : 's'}{q ? ' · por relevancia' : ' · lo último editado primero'}</p>}
        <ul className="divide-y divide-slate-100">
          {filas?.map(f => (
            <li key={`${f.tipo}:${f.id}`}>
              <Link to={f.ruta} className="flex items-start gap-3 rounded-xl px-2 py-3 hover:bg-slate-50">
                <span className="mt-0.5"><IconoResultado tipo={f.tipo} icono={f.icono} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-slate-900">{f.titulo}</span>
                  {f.fragmento && <span className="mt-0.5 block text-[13px] leading-snug text-slate-600"><Resaltado texto={f.fragmento} /></span>}
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                    <span className="font-bold uppercase tracking-wide">{ETIQUETA_TIPO[f.tipo]}</span>
                    {f.autor && <span>{f.autor}</span>}
                    {f.carpeta && <span>en {f.carpeta}</span>}
                    {f.actualizado && <span>editada {new Date(f.actualizado).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
