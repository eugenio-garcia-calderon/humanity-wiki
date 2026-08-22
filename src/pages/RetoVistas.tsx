import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Flame, ArrowLeft } from 'lucide-react';
import { useHelpers } from '../contexts/DataContext';
import { slugify } from '../utils/slugify';
import MetaGraphCanvas, { MetaItem } from '../components/knowledge/MetaGraphCanvas';

// ============================================================================
// Vistas de un RETO (2026-08-06, del prompt del usuario en PDF)
// ============================================================================
// Un mismo reto puede explicarse desde varios ángulos: la cadena causal, la
// teoría de juegos… Esta página es el cruce de caminos: el reto en el centro
// (rojo) y cada VISTA como un grafo conectado con su preview — clic y entras.

export default function RetoVistas() {
  const { id } = useParams();
  const helpers = useHelpers();
  const [graphs, setGraphs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/graphs?challenge=${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => setGraphs(Array.isArray(j) ? j : []))
      .catch(() => setGraphs([]))
      .finally(() => setLoading(false));
  }, [id]);

  const challenge = (helpers.challenges || []).find((c: any) => c.id === id);

  const items: MetaItem[] = useMemo(() => graphs.map((g: any, i: number) => ({
    id: g.id,
    title: g.title,
    subtitle: `Vista ${i + 1} · ${g.center?.vista || 'Grafo de conocimiento'}`,
    cover: g.cover_image,
    coverVideoId: g.cover_video_id,
    to: `/esquemas/${g.slug}`,
    isReto: true,
    kind: 'grafo' as const,
    creator: g.creator_name,
    views: g.views,
    windows: g.window_count,
  })), [graphs]);

  return (
    <div className="relative w-full h-full">
      {loading ? (
        <p className="text-sm text-slate-400 py-16 text-center">Cargando…</p>
      ) : (
        <MetaGraphCanvas
          centerLabel={challenge?.title || 'Reto'}
          centerSublabel="Un reto · varias vistas"
          centerHint="cada tarjeta es una forma distinta de entender el mismo reto"
          accent="#dc2626"
          items={items}
          createLabel="Crear otra vista"
          onCreate={() => window.dispatchEvent(new CustomEvent('ai:prefill', { detail: `Crea un grafo nuevo sobre el reto «${challenge?.title || ''}» con un enfoque de ` }))}
        />
      )}

      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur border border-slate-200 rounded-full pl-1.5 pr-4 py-1.5 flex items-center gap-2 shadow-lg">
        <Link
          to={challenge ? `/retos/${slugify(challenge.title)}` : '/retos'}
          title="Ficha del reto"
          className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
          <Flame className="w-4 h-4 text-red-600" /> {challenge?.title || 'Reto'}
          <span className="text-[9px] font-bold uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-full ml-1">
            {graphs.length} vistas
          </span>
        </span>
      </div>
    </div>
  );
}
