import { useHelpers } from '../contexts/DataContext';
import { useParams, Link } from 'react-router-dom';

import { Card } from '../components/ui/core';
import { slugify } from '../utils/slugify';
import { getColorForScore } from '../utils/scoreColor';

export default function IndicatorDetail() {
  const { objectives, indicators, territories, loading } = useHelpers();
  const { id } = useParams();
  if (loading) return <div>Cargando...</div>;

  const decodedId = decodeURIComponent(id || '');

  const indicator = indicators.find((i: any) =>
    i.id.toLowerCase() === decodedId.toLowerCase() ||
    slugify(i.name) === decodedId.toLowerCase() ||
    i.name.toLowerCase() === decodedId.toLowerCase()
  );

  if (!indicator) return <div className="p-8 text-center text-slate-500">Indicador no encontrado</div>;

  const objective = objectives.find((o: any) => o.id === indicator.objective_id);
  const territory = territories.find((t: any) => t.id === indicator.territory_id);
  const color = indicator.score != null ? getColorForScore(indicator.score) : '#94a3b8';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400 via-slate-900 to-slate-900 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <Link to="/indicadores" className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              ← Volver a Indicadores
            </Link>
          </div>
          <p className="text-xs font-mono text-emerald-500 mb-1">
            [ INDICADOR{objective ? ` · ${objective.title}` : ''} ]
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{indicator.name}</h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            {indicator.raw_value || 'Sin dato asociado todavía.'}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Territorio</p>
          <p className="text-lg font-bold text-slate-900">{territory?.name || '—'}</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Peso</p>
          <p className="text-lg font-bold text-slate-900">{indicator.weight != null ? `${Math.round(indicator.weight * 100)}%` : '—'}</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Puntuación 0-100</p>
          <p className="text-lg font-black" style={{ color }}>{indicator.score != null ? indicator.score : '—'}</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Puntos ponderados</p>
          <p className="text-lg font-bold text-slate-900">{indicator.weighted_score != null ? indicator.weighted_score : '—'}</p>
        </Card>
      </div>

      <Card className="p-6 bg-slate-50 border-slate-100">
        <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase mb-3">Cálculo de la puntuación</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {indicator.methodology || 'Sin metodología especificada.'}
        </p>
      </Card>

      {indicator.source && (
        <p className="text-xs text-slate-400">
          Fuente: {indicator.source}
          {indicator.source_url && (
            <> — <a href={indicator.source_url} target="_blank" rel="noreferrer" className="underline hover:text-emerald-600">enlace</a></>
          )}
        </p>
      )}
    </div>
  );
}
