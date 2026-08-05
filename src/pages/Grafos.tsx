import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network, Eye, AppWindow, User as UserIcon, Sparkles, Plus, PlayCircle } from 'lucide-react';
import { useAuth, ROLE } from '../contexts/AuthContext';
import RatingWidget from '../components/knowledge/RatingWidget';
import CreateGraphModal from '../components/knowledge/CreateGraphModal';

// ============================================================================
// Grafos de Conocimiento — página de inicio (Fase 11)
// ============================================================================
// La nueva puerta de entrada a la plataforma: buscar un tema en la barra
// inferior (el chat de IA, siempre desplegado — vive en Layout/AIAssistant
// modo 'bar') o explorar los grafos publicados.

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
}

/** Portada de la tarjeta: primera imagen del grafo, o la miniatura de su
 *  primer vídeo, o un degradado con la red como identidad visual. */
function CardCover({ g }: { g: GraphCard }) {
  const src = g.cover_image || (g.cover_video_id ? `https://img.youtube.com/vi/${g.cover_video_id}/hqdefault.jpg` : null);
  if (src) {
    return (
      <div className="relative h-36 overflow-hidden">
        <img src={src} alt="" loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {!g.cover_image && g.cover_video_id && (
          <PlayCircle className="absolute inset-0 m-auto w-9 h-9 text-white/90 drop-shadow-lg" />
        )}
      </div>
    );
  }
  return (
    <div className="relative h-36 bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 flex items-center justify-center">
      <Network className="w-12 h-12 text-white/25" />
    </div>
  );
}

export default function Grafos() {
  const [graphs, setGraphs] = useState<GraphCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { user, can } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/graphs', { credentials: 'include' })
      .then(r => r.json())
      .then(json => setGraphs(Array.isArray(json) ? json : []))
      .catch(() => setGraphs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-44">
        {/* Cabecera */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 text-white shadow-xl shadow-emerald-500/25 mb-4">
            <Network className="w-7 h-7" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-3">
            Grafos de Conocimiento
          </h1>
          <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Cada grafo es un tema explicado en toda su complejidad: ventanas de conocimiento
            conectadas, con autor y valoradas por la comunidad. Busca un tema abajo
            o explora los grafos existentes.
          </p>
          <button
            onClick={() => (user ? setShowCreate(true) : navigate('/login'))}
            className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-base font-black shadow-xl shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> Crear grafo
          </button>
        </div>

        {/* Grafos publicados */}
        {loading && <p className="text-sm text-slate-400 py-12 text-center">Cargando…</p>}

        {!loading && graphs.length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
            <p className="text-sm text-slate-400 italic">Todavía no hay grafos publicados. Busca un tema abajo y la IA te propondrá crear el primero.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {graphs.map(g => (
            <Link
              key={g.id}
              to={`/grafos/${g.slug}`}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all overflow-hidden"
            >
              <CardCover g={g} />
              <div className="p-5 pt-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Network className="w-2.5 h-2.5" /> Grafo
                  </span>
                  <div className="flex items-center gap-1.5">
                    {g.status === 'borrador' && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Borrador</span>
                    )}
                    {g.is_ai_generated && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" /> IA
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight mb-1.5 group-hover:text-emerald-700 transition-colors">
                  {g.title}
                </h3>
                {g.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{g.description}</p>
                )}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" />{g.creator_name || 'Anónimo'}</span>
                  <RatingWidget entityType="knowledge_graphs" entityId={g.id}
                    avg={g.rating?.avg ?? null} count={g.rating?.count ?? 0} myScore={null} compact />
                  <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{g.views}</span>
                  <span className="inline-flex items-center gap-1"><AppWindow className="w-3 h-3" />{g.window_count} ventanas</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {can(ROLE.USER) && (
          <p className="text-center text-[11px] text-slate-400 mt-8 inline-flex items-center gap-1.5 w-full justify-center">
            <Plus className="w-3 h-3" />
            ¿Falta un tema? Pídeselo a la IA en la barra de abajo y creará un borrador de grafo para ti.
          </p>
        )}
      </div>

      {showCreate && (
        <CreateGraphModal onClose={() => setShowCreate(false)} onCreated={slug => navigate(`/grafos/${slug}`)} />
      )}
    </div>
  );
}
