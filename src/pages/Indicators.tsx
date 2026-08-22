import { useHelpers } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

import { getColorForScore } from '../utils/scoreColor';
import MarcaOrigen from '../components/ui/OrigenDelDato';
import { origenDe, origenDeVarios } from '../utils/origenDelDato';

export default function Indicators() {
  const { objectives, indicators, loading } = useHelpers();
  const navigate = useNavigate();
  if (loading) return <div>Cargando...</div>;

  // El origen del conjunto: manda el peor de los que se están enseñando
  // (`origenDeVarios`). Una rejilla con un solo indicador inventado dentro no
  // es una rejilla de datos medidos.
  const origenDeTodo = origenDeVarios(
    indicators.filter((i: any) => i.score != null).map((i: any) => i.source),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Indicadores</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Indicadores que componen la puntuación de cada objetivo, agrupados por objetivo y con el dato asociado a cada territorio.
        </p>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Sus cifras</span>
          <MarcaOrigen origen={origenDeTodo} tamano="pequeno" />
        </div>
      </div>

      <div className="flex flex-col gap-12">
        {objectives.map(obj => {
          const objIndicators = indicators.filter(i => i.objective_id === obj.id);
          if (objIndicators.length === 0) return null;

          return (
            <div key={obj.id} className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block"></span>
                {obj.title}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {objIndicators.map(indicator => {
                  const color = indicator.score != null ? getColorForScore(indicator.score) : '#94a3b8';
                  return (
                    <div
                      key={indicator.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500 hover:shadow-md transition-all h-full flex flex-col relative group cursor-pointer"
                      onClick={() => navigate(`/indicadores/${indicator.id}`)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">INDICADOR</span>
                        {indicator.score != null && (
                          <span className="flex items-center gap-1.5">
                            {/* Solo la excepción: la cabecera ya dice lo que valen
                                todas. Cuarenta y dos pastillas iguales no informan
                                de nada y enseñan a no mirarlas. */}
                            {origenDe(indicator.source) !== origenDeTodo && (
                              <MarcaOrigen origen={origenDe(indicator.source)} tamano="pequeno" />
                            )}
                            <span className="text-sm font-black" style={{ color }}>{indicator.score}%</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                        {indicator.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-auto">
                        {indicator.raw_value || 'Sin dato asociado todavía.'}
                      </p>
                      {indicator.weight != null && (
                        <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest">
                          Peso {Math.round(indicator.weight * 100)}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
