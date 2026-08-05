import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CreateGraphModal from '../components/knowledge/CreateGraphModal';
import MetaGraphCanvas, { MetaItem } from '../components/knowledge/MetaGraphCanvas';

// ============================================================================
// Grafos de Conocimiento — la página ES un grafo (2026-08-05, decisión del
// usuario): un gran nodo central y cada grafo publicado como tarjeta
// conectada; clic → el grafo. El nodo «+» y el botón flotante crean uno nuevo.
// ============================================================================

interface GraphCard {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  is_ai_generated: boolean;
  views: number;
  creator_name: string | null;
  window_count: number;
  rating: { avg: number; count: number } | null;
  cover_image: string | null;
  cover_video_id: string | null;
  is_reto: boolean;
}

export default function Grafos() {
  const [graphs, setGraphs] = useState<GraphCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/graphs', { credentials: 'include' })
      .then(r => r.json())
      .then(json => setGraphs(Array.isArray(json) ? json : []))
      .catch(() => setGraphs([]))
      .finally(() => setLoading(false));
  }, []);

  const items: MetaItem[] = useMemo(() => graphs.map(g => ({
    id: g.id,
    title: g.title,
    subtitle: g.description,
    cover: g.cover_image,
    coverVideoId: g.cover_video_id,
    to: `/grafos/${g.slug}`,
    isReto: g.is_reto,
    kind: 'grafo' as const,
    creator: g.creator_name,
    views: g.views,
    windows: g.window_count,
  })), [graphs]);

  // Hoy todos los grafos publicados son retos de España — el centro lo cuenta.
  const allRetos = graphs.length > 0 && graphs.every(g => g.is_reto);

  const openCreate = () => (user ? setShowCreate(true) : navigate('/login'));

  return (
    <div className="relative w-full h-full">
      {loading ? (
        <p className="text-sm text-slate-400 py-16 text-center">Cargando…</p>
      ) : (
        <MetaGraphCanvas
          centerLabel={allRetos ? 'Retos de España' : 'Grafos'}
          centerSublabel="Conocimiento de la Humanidad"
          centerHint="cada tarjeta es un grafo — haz clic para entrar"
          accent={allRetos ? '#ef4444' : '#10b981'}
          items={items}
          createLabel="Crear grafo"
          onCreate={openCreate}
        />
      )}

      {/* Cabecera flotante + crear, siempre visible */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg pl-3 pr-1.5 py-1.5 flex items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
          <Network className="w-4 h-4 text-emerald-600" /> Grafos de Conocimiento
        </span>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-black shadow hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Crear grafo
        </button>
      </div>

      {!loading && graphs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-slate-400 italic bg-white/90 rounded-2xl px-6 py-4 border border-dashed border-slate-200">
            Todavía no hay grafos publicados. Crea el primero o pídeselo a la IA en la barra de abajo.
          </p>
        </div>
      )}

      {showCreate && (
        <CreateGraphModal onClose={() => setShowCreate(false)} onCreated={slug => navigate(`/grafos/${slug}`)} />
      )}
    </div>
  );
}
