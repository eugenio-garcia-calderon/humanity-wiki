import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Plus, Flame, Sprout, Info } from 'lucide-react';
import { slugify } from '../../utils/slugify';
import { LEVEL_LABELS } from '../../utils/metricIcons';
import { useEdit } from '../../contexts/EditContext';
import { useAuth } from '../../contexts/AuthContext';
import CauseDonutChart from './CauseDonutChart';
import ExplorerGraphCanvas from './ExplorerGraphCanvas';

// ============================================================================
// EXPLORADOR DEL MAPA — ahora es un GRAFO (2026-08-06, petición del usuario)
// ============================================================================
// Antes esto era una ficha de texto con tarjetas apiladas. Ahora la entidad
// que estás mirando es un NODO: le baja una conexión desde su objetivo (para
// que sepas dónde estás), y de ella cuelgan sus retos en rojo y, de cada reto,
// sus soluciones en verde. El reto que tiene grafo de conocimiento lleva
// dentro una previsualización viva de ese grafo.
//
// El menú de la izquierda sigue mandando: cada clic cambia nivel+id, el
// lienzo se reconstruye y el encuadre viaja al trozo que toca.

export type ExplorerLevel = 'objetivo' | 'indicador' | 'marcador' | 'metrica';

export interface BreadcrumbEntry {
  level: ExplorerLevel;
  id: string;
  name: string;
}

const EXPLORER_LEVEL_LABELS: Record<ExplorerLevel, string> = {
  objetivo: 'Objetivo',
  indicador: 'Indicador',
  marcador: 'Marcador',
  metrica: 'Métrica',
};

// Which relation array on a challenge links it to the entity at each level
// (see challenge_objectives/challenge_indicators/challenge_markers/challenge_metrics).
const CHALLENGE_RELATION_KEY: Record<ExplorerLevel, string> = {
  objetivo: 'objective_ids',
  indicador: 'indicator_ids',
  marcador: 'marker_ids',
  metrica: 'metric_ids',
};

interface EntityExplorerPanelProps {
  level: ExplorerLevel;
  id: string;
  territoryId: string;
  breadcrumb: BreadcrumbEntry[];
  onNavigate: (level: ExplorerLevel, id: string) => void;
  onClearFilter: () => void;
  indicators?: any[];
  markers?: any[];
  metrics?: any[];
}

export default function EntityExplorerPanel({
  level, id, territoryId, breadcrumb, onNavigate, onClearFilter,
}: EntityExplorerPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openEdit, updateCounter } = useEdit();

  // Only a real navigation (new level/entity/territory) should collapse the
  // open causes chart — a save/delete elsewhere (updateCounter) must NOT,
  // otherwise saving a new cause closes the very chart showing it.
  useEffect(() => {
    setSelectedChallengeId(null);
  }, [level, id, territoryId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/explorer/${level}/${id}?territoryId=${encodeURIComponent(territoryId)}`)
      .then(r => {
        if (!r.ok) throw new Error('No se pudo cargar la información');
        return r.json();
      })
      .then(json => { if (!cancelled) setData(json); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // updateCounter bumps after any save/delete anywhere in the app (via
    // EditContext), so this panel refetches and reflects the change.
  }, [level, id, territoryId, updateCounter]);

  // Los grafos de conocimiento, una sola vez: cada reto que tenga uno lo
  // enseña dentro de su nodo como previsualización viva.
  useEffect(() => {
    fetch('/api/graphs?with_windows=1', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setGraphs(Array.isArray(j) ? j : []))
      .catch(() => {});
  }, [updateCounter]);

  const graphsByChallenge = useMemo(() => {
    const out: Record<string, any> = {};
    for (const g of graphs) {
      for (const cid of (g.challenge_ids || [])) if (!out[cid]) out[cid] = g;
    }
    return out;
  }, [graphs]);

  // El padre es el escalón anterior del rastro de migas: la conexión que baja
  // desde arriba y te dice dentro de qué estás.
  const parent = useMemo(() => {
    const i = breadcrumb.findIndex(c => c.level === level && c.id === id);
    const prev = i > 0 ? breadcrumb[i - 1] : (i === -1 && breadcrumb.length ? breadcrumb[breadcrumb.length - 1] : null);
    if (!prev) return null;
    return { level: prev.level, id: prev.id, name: prev.name, levelLabel: EXPLORER_LEVEL_LABELS[prev.level] };
  }, [breadcrumb, level, id]);

  // La metodología y las unidades: antes eran un bloque de texto, ahora una
  // tarjeta discreta sobre el lienzo que se puede plegar.
  const ficha = useMemo(() => {
    if (!data?.entity) return null;
    const e = data.entity;
    const metadatos: string[] = [];
    if (e.unit) metadatos.push(`Unidad: ${e.unit}`);
    if (e.weight != null) metadatos.push(`Peso: ${Math.round(e.weight * 100)}%`);
    if (e.direction) metadatos.push(e.direction === 'higher_is_better' ? 'Cuanto más alto, mejor' : 'Cuanto más bajo, mejor');
    if (e.includes) metadatos.push(`Incluye: ${e.includes}`);
    if (e.lastUpdated) metadatos.push(`Última toma: ${e.lastUpdated}`);
    if (e.source) metadatos.push(`Fuente: ${e.source}`);
    const texto = e.methodology || e.description || '';
    if (!texto && !metadatos.length) return null;
    return { texto, metadatos };
  }, [data]);

  // En el nivel de métrica no hay hijos, pero sí estaciones de medición: son
  // lo que cuelga de ella, así que ocupan la misma columna.
  const dataConEstaciones = useMemo(() => {
    if (!data) return data;
    if (level !== 'metrica' || !data.stations?.length) return data;
    return {
      ...data,
      children: data.stations.map((s: any) => ({
        level: 'metrica', id: s.id, name: s.name, score: null,
        subtitle: s.withinTerritory ? 'En el territorio' : `A ${s.distanceKm} km`,
        riskLabel: s.level ? (LEVEL_LABELS[s.level] || s.level) : null,
        noNavega: true,
      })),
    };
  }, [data, level]);

  const handleAddChallenge = () => {
    const newChallenge: any = {
      id: `R${1000 + Math.floor(Math.random() * 9000)}`,
      title: '',
      scope: 'regional',
      description: '',
      priority: 'medium',
      territory_ids: [territoryId],
    };
    newChallenge[CHALLENGE_RELATION_KEY[level]] = [id];
    openEdit('Reto', newChallenge, () => {}, undefined);
  };

  const handleAddSolution = () => {
    const newSolution = {
      id: `S${1000 + Math.floor(Math.random() * 9000)}`,
      title: '',
      type: 'general',
      description: '',
      impact: '',
      cost: '',
      readiness: '',
      challenge_ids: (data?.challenges || []).map((c: any) => c.id),
    };
    openEdit('Solución', newSolution, () => {}, undefined);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Rastro de migas */}
      <div className="shrink-0 px-4 sm:px-5 pt-3 pb-2.5 border-b border-slate-100 flex items-center flex-wrap gap-1 text-xs bg-white">
        <button onClick={onClearFilter} className="font-bold text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {data?.territory?.name || '...'}
        </button>
        {breadcrumb.map((crumb, i) => {
          const isLast = i === breadcrumb.length - 1;
          return (
            <React.Fragment key={`${crumb.level}-${crumb.id}`}>
              <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
              {isLast ? (
                <span className="font-bold text-slate-800">{crumb.name}</span>
              ) : (
                <button
                  onClick={() => onNavigate(crumb.level, crumb.id)}
                  className="font-semibold text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {crumb.name}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {loading && <div className="text-sm text-slate-400 py-8 text-center">Cargando...</div>}
      {error && <div className="text-sm text-red-500 py-8 text-center">{error}</div>}

      {!loading && !error && dataConEstaciones && (
        <div className="flex-1 min-h-0 relative">
          <ExplorerGraphCanvas
            data={dataConEstaciones}
            level={level}
            levelLabel={EXPLORER_LEVEL_LABELS[level]}
            parent={parent}
            graphsByChallenge={graphsByChallenge}
            onNavigate={(lvl, entityId) => onNavigate(lvl as ExplorerLevel, entityId)}
            onOpenChallenge={cid => setSelectedChallengeId(prev => (prev === cid ? null : cid))}
            onOpenSolution={s => navigate(`/soluciones/${slugify(s.title)}`)}
            onOpenGraph={slug => navigate(`/esquemas/${slug}`)}
          />

          {/* La ficha de metodología, plegable, sobre el lienzo */}
          {ficha && (
            <div className="absolute top-3 right-3 z-10 max-w-[280px]">
              <button
                onClick={() => setFichaAbierta(o => !o)}
                className="w-full text-left bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg px-3.5 py-2.5 hover:border-slate-300 transition-colors"
              >
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 inline-flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" /> Información general
                </span>
                {fichaAbierta && (
                  <>
                    {ficha.texto && <p className="text-[11px] text-slate-600 leading-relaxed mt-1.5">{ficha.texto}</p>}
                    {ficha.metadatos.map((m, i) => (
                      <p key={i} className="text-[10px] text-slate-400 mt-0.5">{m}</p>
                    ))}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Crear: el lienzo también se edita */}
          {user?.isAdmin && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
              <button
                onClick={handleAddChallenge}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-red-200 shadow text-[10px] font-black text-red-600 hover:bg-red-50 transition-colors"
              >
                <Plus className="w-3 h-3" /> <Flame className="w-3 h-3" /> Reto
              </button>
              <button
                onClick={handleAddSolution}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-emerald-200 shadow text-[10px] font-black text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Plus className="w-3 h-3" /> <Sprout className="w-3 h-3" /> Solución
              </button>
            </div>
          )}

          {/* Causas del reto seleccionado, sobre el lienzo */}
          {selectedChallengeId && (
            <div className="absolute inset-x-3 bottom-3 z-20 max-h-[62%] overflow-y-auto rounded-2xl shadow-2xl bg-white border border-slate-200">
              <CauseDonutChart
                challengeId={selectedChallengeId}
                challengeTitle={(data.challenges || []).find((c: any) => c.id === selectedChallengeId)?.title || ''}
                territoryName={data.territory?.name || ''}
                onClose={() => setSelectedChallengeId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
