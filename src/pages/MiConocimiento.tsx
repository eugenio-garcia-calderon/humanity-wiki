import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BrainCircuit, Network, Map as MapIcon, ShoppingBag, CheckSquare, Table2, Rocket,
  FileText, Image as ImageIcon, PlayCircle, Link2, BookOpen, MessageSquare,
  GitBranch, Compass, X, Search, User as UserIcon, Sparkles, Plus, Flame, Sprout,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { GrafoLienzo, type LienzoApi } from './GrafoCanvas';
import CreateGraphModal from '../components/knowledge/CreateGraphModal';
import { cn } from '../utils/cn';
import { slugify } from '../utils/slugify';

// ============================================================================
// MI CONOCIMIENTO — el lienzo infinito personal (2026-08-07, petición)
// ============================================================================
// El espacio PRIVADO de cada persona: un lienzo infinito (el mismo motor que
// los grafos de conocimiento) cuyo CENTRO es el propio usuario. Todo lo que
// crea —grafos, mapas, proyectos, tareas, productos, tablas, publicaciones—
// cuelga de su nombre como una rama, y se guarda en la base de datos GENERAL
// (knowledge_windows, knowledge_graphs, user_maps, products…), no en un silo.
//
// La otra mitad del sistema es el RECOMENDADOR: antes de crear sobre un tema,
// enseña cuánta información existe ya en el común y permite CONECTAR esas
// piezas (referenciarlas, no duplicarlas) — todos los espacios personales
// están unidos por el mismo conocimiento compartido.

/** Las herramientas del lienzo, estilo Miro: cada una crea algo real. */
const TOOLS: Array<{ id: string; icon: any; label: string; kind?: string; sep?: boolean }> = [
  { id: 'grafo-nuevo', icon: Network, label: 'Nuevo grafo' },
  { id: 'mapa-nuevo', icon: MapIcon, label: 'Nuevo mapa' },
  { id: 'producto-nuevo', icon: ShoppingBag, label: 'Nuevo producto' },
  { id: 'proyecto', icon: Rocket, label: 'Nuevo proyecto', kind: 'proyecto', sep: true },
  { id: 'tarea', icon: CheckSquare, label: 'Nueva tarea', kind: 'tarea' },
  { id: 'tabla', icon: Table2, label: 'Nueva tabla', kind: 'tabla' },
  { id: 'texto', icon: FileText, label: 'Nota de texto', kind: 'texto', sep: true },
  { id: 'publicacion', icon: MessageSquare, label: 'Mi publicación', kind: 'publicacion' },
  { id: 'imagen', icon: ImageIcon, label: 'Imagen', kind: 'imagen' },
  { id: 'video', icon: PlayCircle, label: 'Vídeo', kind: 'video' },
  { id: 'enlace', icon: Link2, label: 'Enlace / documento', kind: 'enlace' },
  { id: 'wikipedia', icon: BookOpen, label: 'Wikipedia', kind: 'wikipedia' },
  { id: 'conectar', icon: GitBranch, label: 'Conectar nodos', sep: true },
  { id: 'reco', icon: Compass, label: 'Descubrir y conectar el común' },
];

/** Un hueco libre en el anillo exterior para colocar lo recién creado. */
const spot = () => {
  const ang = Math.random() * 2 * Math.PI;
  return { x: Math.round(Math.cos(ang) * 640) - 128, y: Math.round(Math.sin(ang) * 500) - 110 };
};

export default function MiConocimiento() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [graph, setGraph] = useState<{ id: string; slug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<LienzoApi | null>(null);

  const [showCreateGraph, setShowCreateGraph] = useState(false);
  const [showMapa, setShowMapa] = useState(false);
  const [showProducto, setShowProducto] = useState(false);
  const [showReco, setShowReco] = useState(false);

  // El lienzo personal se asegura al entrar: uno por usuario, en la BD general.
  useEffect(() => {
    if (!user) return;
    fetch('/api/knowledge/personal', { method: 'POST', credentials: 'include' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; })
      .then(setGraph)
      .catch(e => setError(e.message));
  }, [user]);

  /** Añade una ventana al lienzo y la conecta al usuario (el centro). */
  const addWindow = async (win: { title: string; kind: string; config?: any; window_id?: string }, relation = 'contexto') => {
    const api = apiRef.current;
    if (!api) return;
    const { x, y } = spot();
    const res = await fetch(`/api/graphs/${api.graphId}/windows`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ ...win, x, y }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo crear.');
    await fetch(`/api/graphs/${api.graphId}/edges`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ from_window_id: null, to_window_id: json.id, relation, label: null }),
    }).catch(() => {});
    api.reload();
  };

  const onTool = (id: string, kind?: string) => {
    const api = apiRef.current;
    if (!api) return;
    if (kind) return api.openAdd(kind);
    if (id === 'grafo-nuevo') return setShowCreateGraph(true);
    if (id === 'mapa-nuevo') return setShowMapa(true);
    if (id === 'producto-nuevo') return setShowProducto(true);
    if (id === 'conectar') return api.openConnect();
    if (id === 'reco') return setShowReco(o => !o);
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <BrainCircuit className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-black text-slate-900">Mi Conocimiento</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Tu lienzo infinito personal: crea grafos, mapas, proyectos, tareas y publicaciones
            que cuelgan de tu nombre y se conectan con el conocimiento común.
          </p>
          <Link to="/login" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
            <UserIcon className="w-4 h-4" /> Entrar para empezar
          </Link>
        </div>
      </div>
    );
  }
  if (error) return <p className="text-sm text-red-600 text-center py-16">{error}</p>;
  if (!graph) return <p className="text-sm text-slate-400 text-center py-16">Preparando tu lienzo…</p>;

  return (
    <div className="relative w-full h-full">
      <GrafoLienzo
        slug={graph.slug}
        toolbar={api => {
          apiRef.current = api;
          return (
            <>
              {/* La barra de herramientas, estilo Miro: vertical, a la izquierda */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-0.5 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl p-1.5">
                {TOOLS.map(t => (
                  <div key={t.id}>
                    {t.sep && <div className="h-px bg-slate-100 my-1 mx-1" />}
                    <button
                      onClick={() => onTool(t.id, t.kind)}
                      title={t.label}
                      className={cn(
                        'group relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                        t.id === 'reco' && showReco
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                      )}
                    >
                      <t.icon className="w-4.5 h-4.5" />
                      <span className="absolute left-11 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                        {t.label}
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {showReco && <RecoPanel graphId={api.graphId} addWindow={addWindow} onClose={() => setShowReco(false)} />}
            </>
          );
        }}
      />

      {showCreateGraph && (
        <CreateGraphModal
          onClose={() => setShowCreateGraph(false)}
          onCreated={async slug => {
            setShowCreateGraph(false);
            // El grafo recién creado cuelga del usuario como tarjeta-portal.
            try {
              const g = await fetch(`/api/graphs/${slug}`, { credentials: 'include' }).then(r => r.json());
              await addWindow({
                title: g.graph?.title || 'Mi grafo',
                kind: 'grafo',
                config: { graph_slug: slug, title: g.graph?.title, creator_name: user.displayName },
              }, 'apoya');
            } catch { /* el grafo existe aunque el portal falle */ }
          }}
        />
      )}
      {showMapa && (
        <MiniModal title="Nuevo mapa" onClose={() => setShowMapa(false)}
          onSubmit={async (campos) => {
            const res = await fetch('/api/maps', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
              body: JSON.stringify({ title: campos.titulo, description: campos.descripcion || null, config: { map_url: '/mapa?embed=1' } }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || 'No se pudo crear el mapa.');
            await addWindow({
              title: campos.titulo, kind: 'mapa',
              config: { map_url: '/mapa?embed=1', user_map_slug: j.slug },
            }, 'dato');
          }}
          fields={[
            { id: 'titulo', label: 'Nombre del mapa', required: true },
            { id: 'descripcion', label: 'Descripción (opcional)', textarea: true },
          ]}
        />
      )}
      {showProducto && (
        <MiniModal title="Nuevo producto" onClose={() => setShowProducto(false)}
          onSubmit={async (campos) => {
            const cents = campos.precio ? Math.round(parseFloat(campos.precio.replace(',', '.')) * 100) : null;
            const res = await fetch('/api/products', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
              body: JSON.stringify({ name: campos.nombre, description: campos.descripcion || null, price_cents: cents }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || 'No se pudo crear el producto.');
            await addWindow({
              title: campos.nombre, kind: 'producto',
              config: { product_id: j.id, name: j.name, description: j.description, price_cents: j.price_cents, currency: j.currency, image_url: null },
            }, 'apoya');
          }}
          fields={[
            { id: 'nombre', label: 'Nombre del producto', required: true },
            { id: 'precio', label: 'Precio en € (opcional)' },
            { id: 'descripcion', label: 'Descripción (opcional)', textarea: true },
          ]}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Modal genérico pequeño para las herramientas que crean una entidad real.
// ----------------------------------------------------------------------------
function MiniModal({ title, fields, onSubmit, onClose }: {
  title: string;
  fields: Array<{ id: string; label: string; required?: boolean; textarea?: boolean }>;
  onSubmit: (valores: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300';

  const enviar = async () => {
    for (const f of fields) {
      if (f.required && !(valores[f.id] || '').trim()) { setError(`Falta: ${f.label}.`); return; }
    }
    setSaving(true); setError(null);
    try { await onSubmit(valores); onClose(); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5"><Plus className="w-4 h-4 text-emerald-600" /> {title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {fields.map(f => (
            <div key={f.id}>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{f.label}</label>
              {f.textarea
                ? <textarea rows={2} value={valores[f.id] || ''} onChange={e => setValores(v => ({ ...v, [f.id]: e.target.value }))} className={cn(input, 'resize-none')} />
                : <input value={valores[f.id] || ''} onChange={e => setValores(v => ({ ...v, [f.id]: e.target.value }))} className={input} />}
            </div>
          ))}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</p>}
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={enviar} disabled={saving} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40">
            {saving ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// El RECOMENDADOR: cuánto sabe ya el común sobre un tema, y conectar sin
// duplicar — la pieza que une todos los espacios personales.
// ----------------------------------------------------------------------------
function RecoPanel({ graphId, addWindow, onClose }: {
  graphId: string;
  addWindow: (win: any, relation?: string) => Promise<void>;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setData(null); return; }
    const t = setTimeout(() => {
      setBusy(true);
      fetch(`/api/knowledge/related?q=${encodeURIComponent(query)}&exclude_graph=${graphId}`)
        .then(r => r.json()).then(setData).catch(() => setData(null))
        .finally(() => setBusy(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, graphId]);

  const conectar = async (clave: string, fn: () => Promise<void>) => {
    try { await fn(); setAdded(s => new Set(s).add(clave)); } catch { /* el botón se queda activo para reintentar */ }
  };

  const boton = (clave: string, fn: () => Promise<void>) => (
    added.has(clave)
      ? <span className="text-[10px] font-black text-emerald-600 shrink-0">Conectado ✓</span>
      : (
        <button onClick={() => conectar(clave, fn)}
          className="shrink-0 text-[10px] font-black text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 rounded-full px-2 py-0.5 transition-colors">
          Conectar
        </button>
      )
  );

  const t = data?.totales;
  return (
    <div className="absolute right-3 top-3 bottom-3 z-10 w-80 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
        <span className="text-xs font-black text-slate-900 inline-flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-600" /> El común ya sabe…
        </span>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="px-4 py-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder="Un tema — p. ej. incendios"
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300"
          />
        </div>
        {t && (
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            Sobre «{data.q}» hay ya <b className="text-slate-900">{t.grafos} grafos</b>, <b className="text-slate-900">{t.publicaciones} publicaciones</b>,{' '}
            <b className="text-slate-900">{t.retos} retos</b> y <b className="text-slate-900">{t.soluciones} soluciones</b> de{' '}
            <b className="text-slate-900">{t.autores} {t.autores === 1 ? 'autor' : 'autores'}</b>. Conecta antes de duplicar.
          </p>
        )}
        {busy && <p className="text-[11px] text-slate-400 mt-2">Buscando en el común…</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {(data?.grafos || []).map((g: any) => (
          <div key={g.id} className="flex items-start justify-between gap-2 border border-emerald-100 bg-emerald-50/40 rounded-xl p-2.5">
            <button onClick={() => navigate(`/grafos/${g.slug}`)} className="text-left min-w-0">
              <p className="text-[11px] font-black text-slate-900 leading-tight inline-flex items-center gap-1"><Network className="w-3 h-3 text-emerald-600 shrink-0" /> {g.title}</p>
              <p className="text-[10px] text-slate-400">{g.window_count} publicaciones · de {g.creator_name || 'Anónimo'}</p>
            </button>
            {boton(`g-${g.id}`, () => addWindow({
              title: g.title, kind: 'grafo',
              config: { graph_slug: g.slug, title: g.title, creator_name: g.creator_name },
            }, 'contexto'))}
          </div>
        ))}
        {(data?.publicaciones || []).map((w: any) => (
          <div key={w.id} className="flex items-start justify-between gap-2 border border-slate-100 rounded-xl p-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 leading-tight">{w.title}</p>
              <p className="text-[10px] text-slate-400">{w.kind} · en «{w.graph_title}» · de {w.creator_name || 'Anónimo'}</p>
            </div>
            {/* Se REUTILIZA la ventana original (window_id): la misma pieza de
                conocimiento, viva en dos lienzos — sin duplicar. */}
            {boton(`w-${w.id}`, () => addWindow({ title: w.title, kind: w.kind, window_id: w.id } as any, 'dato'))}
          </div>
        ))}
        {(data?.retos || []).map((r: any) => (
          <div key={r.id} className="flex items-start justify-between gap-2 border border-red-100 bg-red-50/40 rounded-xl p-2.5">
            <p className="text-[11px] font-bold text-slate-800 leading-tight inline-flex items-center gap-1"><Flame className="w-3 h-3 text-red-600 shrink-0" /> {r.title}</p>
            {boton(`r-${r.id}`, () => addWindow({
              title: r.title, kind: 'enlace',
              config: { url: `/retos/${slugify(r.title)}`, description: 'Reto del conocimiento común' },
            }, 'contexto'))}
          </div>
        ))}
        {(data?.soluciones || []).map((s: any) => (
          <div key={s.id} className="flex items-start justify-between gap-2 border border-emerald-100 rounded-xl p-2.5">
            <p className="text-[11px] font-bold text-slate-800 leading-tight inline-flex items-center gap-1"><Sprout className="w-3 h-3 text-emerald-600 shrink-0" /> {s.title}</p>
            {boton(`s-${s.id}`, () => addWindow({
              title: s.title, kind: 'enlace',
              config: { url: `/soluciones/${slugify(s.title)}`, description: 'Solución del conocimiento común' },
            }, 'apoya'))}
          </div>
        ))}
        {data && !busy && !data.grafos?.length && !data.publicaciones?.length && !data.retos?.length && !data.soluciones?.length && (
          <p className="text-[11px] text-slate-400 italic text-center py-6">
            El común aún no tiene nada sobre «{data.q}» — sé quien lo empiece.
          </p>
        )}
        {!data && !busy && (
          <p className="text-[11px] text-slate-400 leading-relaxed text-center py-6 px-3">
            <Sparkles className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
            Escribe un tema y verás cuánta información existe ya en Humanity.wiki — y podrás
            conectarla a tu lienzo sin duplicarla.
          </p>
        )}
      </div>
    </div>
  );
}
