import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

// ============================================================================
// Añadir una Ventana de Conocimiento al lienzo (Fase 11d)
// ============================================================================
// Las herramientas de creación del grafo: el usuario puede enlazar sus
// propias publicaciones, escribir texto, embeber vídeo/imagen/Wikipedia,
// enlazar la web… y referenciar OTRO grafo (con portada clicable).
// La ventana nueva se conecta al centro con la relación elegida.

const KINDS: Array<{ kind: string; label: string }> = [
  { kind: 'publicacion', label: 'Mi publicación' },
  { kind: 'texto', label: 'Texto' },
  { kind: 'enlace', label: 'Enlace' },
  { kind: 'video', label: 'Vídeo (YouTube)' },
  { kind: 'imagen', label: 'Imagen' },
  { kind: 'wikipedia', label: 'Wikipedia' },
  { kind: 'grafo', label: 'Otro grafo' },
];

const RELATIONS = ['contexto', 'causa', 'dato', 'fuente', 'apoya', 'contradice', 'matiza'];

export default function AddWindowPanel({ graphId, onClose, onAdded }: {
  graphId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [kind, setKind] = useState('publicacion');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [wikiPage, setWikiPage] = useState('');
  const [relation, setRelation] = useState('contexto');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [connectCenter, setConnectCenter] = useState(true);
  const [myPubs, setMyPubs] = useState<any[]>([]);
  const [selectedPub, setSelectedPub] = useState<any>(null);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [selectedGraph, setSelectedGraph] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (kind === 'publicacion' && user) {
      fetch(`/api/publications?author_id=${user.id}`, { credentials: 'include' })
        .then(r => r.json()).then(j => setMyPubs(Array.isArray(j) ? j : [])).catch(() => {});
    }
    if (kind === 'grafo') {
      fetch('/api/graphs', { credentials: 'include' })
        .then(r => r.json()).then(j => setGraphs((Array.isArray(j) ? j : []).filter((g: any) => g.id !== graphId))).catch(() => {});
    }
  }, [kind, user, graphId]);

  const buildWindow = (): { title: string; config: any } | null => {
    switch (kind) {
      case 'publicacion': {
        if (!selectedPub) { setError('Elige una de tus publicaciones.'); return null; }
        return {
          title: title.trim() || selectedPub.title || (selectedPub.body || '').slice(0, 60),
          config: {
            publication_id: selectedPub.id,
            author_name: user?.displayName || null,
            excerpt: (selectedPub.body || '').slice(0, 220),
            body: selectedPub.body || '',
          },
        };
      }
      case 'texto':
        if (!body.trim()) { setError('Escribe el texto de la ventana.'); return null; }
        return { title: title.trim() || 'Nota', config: { body: body.trim() } };
      case 'enlace':
        if (!url.trim()) { setError('Falta la URL.'); return null; }
        return { title: title.trim() || url.trim(), config: { url: url.trim(), description: body.trim() || undefined } };
      case 'video': {
        const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
        if (!m) { setError('Pega un enlace de YouTube válido.'); return null; }
        return { title: title.trim() || 'Vídeo', config: { youtube_id: m[1], channel: sourceName.trim() || undefined } };
      }
      case 'imagen':
        if (!url.trim()) { setError('Falta la URL de la imagen.'); return null; }
        return {
          title: title.trim() || 'Imagen',
          config: { image_url: url.trim(), caption: body.trim() || undefined, source_name: sourceName.trim() || undefined },
        };
      case 'wikipedia':
        if (!wikiPage.trim()) { setError('Indica el título de la página de Wikipedia.'); return null; }
        return { title: title.trim() || wikiPage.trim(), config: { wiki_lang: 'es', wiki_page: wikiPage.trim() } };
      case 'grafo': {
        if (!selectedGraph) { setError('Elige el grafo a referenciar.'); return null; }
        return {
          title: title.trim() || `Grafo: ${selectedGraph.title}`,
          config: { graph_slug: selectedGraph.slug, title: selectedGraph.title, description: selectedGraph.description, creator_name: selectedGraph.creator_name },
        };
      }
      default:
        return null;
    }
  };

  const submit = async () => {
    if (saving) return;
    setError(null);
    const w = buildWindow();
    if (!w) return;
    setSaving(true);
    try {
      // Colocación inicial: en el anillo exterior, en un ángulo aleatorio —
      // el creador la arrastra después y la posición queda grabada.
      const ang = Math.random() * 2 * Math.PI;
      const res = await fetch(`/api/graphs/${graphId}/windows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: w.title, kind, config: w.config,
          x: Math.round(Math.cos(ang) * 640) - 128,
          y: Math.round(Math.sin(ang) * 500) - 110,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo crear la ventana.');
      if (connectCenter) {
        await fetch(`/api/graphs/${graphId}/edges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ from_window_id: null, to_window_id: json.id, relation, label: edgeLabel.trim() || null }),
        });
      }
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" /> Nueva Ventana de Conocimiento
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Tipo */}
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map(k => (
              <button key={k.kind} onClick={() => { setKind(k.kind); setError(null); }}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                  kind === k.kind ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300')}>
                {k.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Título de la ventana</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Opcional — se deduce del contenido" className={input} />
          </div>

          {kind === 'publicacion' && (
            <div className="space-y-1.5 max-h-44 overflow-y-auto border border-slate-100 rounded-xl p-2">
              {myPubs.length === 0 && <p className="text-xs text-slate-400 italic p-2">No tienes publicaciones todavía — crea una en el Muro.</p>}
              {myPubs.map(p => (
                <button key={p.id} onClick={() => setSelectedPub(p)}
                  className={cn('w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                    selectedPub?.id === p.id ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'hover:bg-slate-50 border border-transparent text-slate-600')}>
                  <span className="font-bold block truncate">{p.title || '(sin título)'}</span>
                  <span className="line-clamp-1 text-slate-400">{p.body}</span>
                </button>
              ))}
            </div>
          )}

          {kind === 'grafo' && (
            <div className="space-y-1.5 max-h-44 overflow-y-auto border border-slate-100 rounded-xl p-2">
              {graphs.map(g => (
                <button key={g.id} onClick={() => setSelectedGraph(g)}
                  className={cn('w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
                    selectedGraph?.id === g.id ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' : 'hover:bg-slate-50 border border-transparent text-slate-600')}>
                  <span className="font-bold block truncate">{g.title}</span>
                  <span className="text-slate-400">{g.window_count} ventanas · de {g.creator_name || 'Anónimo'}</span>
                </button>
              ))}
            </div>
          )}

          {kind === 'texto' && (
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="El contenido de la ventana." className={cn(input, 'resize-none')} />
          )}
          {(kind === 'enlace' || kind === 'video' || kind === 'imagen') && (
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder={kind === 'video' ? 'https://youtu.be/…' : kind === 'imagen' ? 'https://…/imagen.png' : 'https://…'} className={input} />
          )}
          {(kind === 'enlace' || kind === 'imagen') && (
            <input value={body} onChange={e => setBody(e.target.value)} placeholder={kind === 'imagen' ? 'Pie de imagen (opcional)' : 'Descripción (opcional)'} className={input} />
          )}
          {(kind === 'video' || kind === 'imagen') && (
            <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder={kind === 'video' ? 'Canal (crédito)' : 'Fuente (crédito)'} className={input} />
          )}
          {kind === 'wikipedia' && (
            <input value={wikiPage} onChange={e => setWikiPage(e.target.value)} placeholder="Título exacto de la página, ej. Ceuta" className={input} />
          )}

          {/* Conexión con el centro */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={connectCenter} onChange={e => setConnectCenter(e.target.checked)} className="accent-emerald-600" />
              Conectar al centro del grafo
            </label>
            {connectCenter && (
              <div className="grid grid-cols-2 gap-2">
                <select value={relation} onChange={e => setRelation(e.target.value)} className={cn(input, 'text-xs')}>
                  {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input value={edgeLabel} onChange={e => setEdgeLabel(e.target.value)} placeholder="Etiqueta del círculo (opcional)" className={cn(input, 'text-xs')} />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition-colors">
            {saving ? 'Añadiendo…' : 'Añadir al grafo'}
          </button>
        </div>
      </div>
    </div>
  );
}
