import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Eye, Sparkles, Map as MapIcon } from 'lucide-react';
import RatingWidget from '../components/knowledge/RatingWidget';
import EntityComments from '../components/knowledge/EntityComments';

// ============================================================================
// Mapa de usuario (Fase 12) — una vista del mapa de la humanidad publicada a
// nombre de una persona: mismo patrón que los Grafos de Conocimiento
// (autor, valoración, comentarios, indexado), pero el contenido es el mapa
// interactivo real embebido, no un lienzo de ventanas.
// ============================================================================

function buildMapSrc(config: any): string {
  const params = new URLSearchParams({ embed: '1' });
  if (config?.territorio) params.set('territorio', config.territorio);
  if (config?.nivel && config?.id) {
    params.set('nivel', config.nivel);
    params.set('id', config.id);
  }
  return `/mapa?${params.toString()}`;
}

export default function UserMapa() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/maps/${slug}`, { credentials: 'include' })
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'No se pudo cargar el mapa.');
        return json;
      })
      .then(json => { if (!cancelled) { setData(json); setError(null); } })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [slug]);

  if (error) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <MapIcon className="w-10 h-10 text-slate-200" />
        <p className="text-sm text-slate-500">{error}</p>
        <Link to="/" className="text-xs font-bold text-emerald-600 hover:underline">← Volver a Grafos de Conocimiento</Link>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-slate-400 py-16 text-center">Cargando mapa…</p>;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300 pb-16">
      <Link to="/" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest mb-3">
        <ArrowLeft className="w-3 h-3" /> Grafos de Conocimiento
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 leading-tight">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1"><UserIcon className="w-3.5 h-3.5" />{data.creator_name || 'Anónimo'}</span>
            <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{data.views}</span>
            {data.is_ai_generated && (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                <Sparkles className="w-2.5 h-2.5" /> IA · pendiente de revisión
              </span>
            )}
          </div>
        </div>
        <RatingWidget entityType="user_maps" entityId={data.id}
          avg={data.rating?.avg ?? null} count={data.rating?.count ?? 0} myScore={data.my_score ?? null} />
      </div>

      {data.description && (
        <p className="text-sm text-slate-600 leading-relaxed mt-3">{data.description}</p>
      )}

      <div className="mt-5 rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[70vh]">
        <iframe src={buildMapSrc(data.config)} title={data.title} className="w-full h-full" />
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <EntityComments entityType="user_maps" entityId={data.id} />
      </div>
    </div>
  );
}
