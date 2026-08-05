import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplet, Wheat, Home, Heart, Users, Leaf, ChevronRight, MapPin, Layers, Gauge, GraduationCap, Car, Zap, Cpu, Briefcase, Landmark, Coins, Palette, Plus } from 'lucide-react';
import { getColorForScore } from '../../utils/scoreColor';
import { slugify } from '../../utils/slugify';
import { challengeGraphTo } from '../../utils/entityLinks';
import { INDICATOR_ICONS, DEFAULT_INDICATOR_ICON } from '../../utils/indicatorIcons';
import { MARKER_ICONS, DEFAULT_MARKER_ICON } from '../../utils/markerIcons';
import { METRIC_ICONS, DEFAULT_METRIC_ICON, LEVEL_COLORS, LEVEL_LABELS } from '../../utils/metricIcons';
import { AdminMenu } from '../ui/AdminMenu';
import { useEdit } from '../../contexts/EditContext';
import { useAuth } from '../../contexts/AuthContext';
import CauseDonutChart from './CauseDonutChart';

// Circular "sphere" used for both Retos and Soluciones — a self-contained
// labeled bubble, laid out left-to-right in its card. Renders as a link
// (navigates to the entity's own page) or as a button (e.g. Retos, which
// toggle the causes chart open below instead of navigating away).
function EntitySphere({ title, to, onClick, gradient, active }: { title: string; to?: string; onClick?: () => void; gradient: string; active?: boolean }) {
  const className = `w-20 h-20 rounded-full shrink-0 bg-gradient-to-br ${gradient} shadow-md flex items-center justify-center text-center px-2 text-white text-[10px] font-bold uppercase leading-tight tracking-wide hover:scale-105 transition-transform ${active ? 'ring-4 ring-offset-2 ring-red-200' : ''}`;
  if (onClick) {
    return (
      <button onClick={onClick} className={className} title={title}>
        {title}
      </button>
    );
  }
  return (
    <Link to={to!} className={className} title={title}>
      {title}
    </Link>
  );
}

// Dashed "+" sphere, same footprint as EntitySphere, used to add a new Reto/Solución.
function AddSphere({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-20 h-20 rounded-full shrink-0 border-2 border-dashed border-slate-300 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 flex items-center justify-center transition-colors"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}

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

const OBJECTIVE_ICONS: Record<string, any> = {
  O001: Droplet,
  O002: Wheat,
  O003: Home,
  O004: Heart,
  O005: Users,
  O006: Leaf,
  O007: GraduationCap,
  O008: Car,
  O009: Zap,
  O010: Cpu,
  O011: Briefcase,
  O012: Landmark,
  O013: Coins,
  O014: Palette,
};

function iconForLevel(level: ExplorerLevel, id: string) {
  if (level === 'objetivo') return OBJECTIVE_ICONS[id] || Layers;
  if (level === 'indicador') return INDICATOR_ICONS[id] || DEFAULT_INDICATOR_ICON;
  if (level === 'marcador') return MARKER_ICONS[id] || DEFAULT_MARKER_ICON;
  return METRIC_ICONS[id] || DEFAULT_METRIC_ICON;
}

function ChildBadge({ child }: { child: { score: number | null; hasData: boolean; riskLevel: string | null } }) {
  if (child.riskLevel) {
    return (
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white shrink-0"
        style={{ backgroundColor: LEVEL_COLORS[child.riskLevel] || '#94a3b8' }}
      >
        {LEVEL_LABELS[child.riskLevel] || child.riskLevel}
      </span>
    );
  }
  if (child.score != null) {
    return (
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-black text-white shrink-0"
        style={{ backgroundColor: getColorForScore(child.score) }}
      >
        {child.score}%
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 shrink-0">
      Sin datos
    </span>
  );
}

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
  indicators = [], markers = [], metrics = [],
}: EntityExplorerPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
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

  const Icon = iconForLevel(level, id);

  const getChildEntity = (child: any) => {
    const list = child.level === 'indicador' ? indicators : child.level === 'marcador' ? markers : metrics;
    return list.find((e: any) => e.id === child.id) || { id: child.id, name: child.name };
  };

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
    <div className="p-4 sm:p-6 space-y-5 animate-in fade-in duration-300">
      {/* Breadcrumb */}
      <div className="flex items-center flex-wrap gap-1 text-xs">
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

      {!loading && !error && data && (
        <>
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{EXPLORER_LEVEL_LABELS[level]}</p>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">{data.entity.name}</h2>
            </div>
          </div>

          {/* General info */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Información general</h3>
            {level === 'objetivo' && (
              <p className="text-sm text-slate-600 leading-relaxed">{data.entity.description || 'Sin descripción.'}</p>
            )}
            {level === 'indicador' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 leading-relaxed">{data.entity.methodology || 'Sin metodología especificada.'}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
                  {data.entity.unit && <span><b className="text-slate-700">Unidad:</b> {data.entity.unit}</span>}
                  {data.entity.weight != null && <span><b className="text-slate-700">Peso en el objetivo:</b> {Math.round(data.entity.weight * 100)}%</span>}
                  {data.entity.direction && (
                    <span><b className="text-slate-700">Dirección:</b> {data.entity.direction === 'higher_is_better' ? 'Cuanto más alto, mejor' : 'Cuanto más bajo, mejor'}</span>
                  )}
                </div>
              </div>
            )}
            {level === 'marcador' && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 leading-relaxed">{data.entity.description || 'Sin descripción.'}</p>
                {data.entity.includes && <p className="text-xs text-slate-500"><b className="text-slate-700">Incluye:</b> {data.entity.includes}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
                  {data.entity.unit && <span><b className="text-slate-700">Unidad:</b> {data.entity.unit}</span>}
                  {data.entity.weight != null && <span><b className="text-slate-700">Peso en el indicador:</b> {Math.round(data.entity.weight * 100)}%</span>}
                  {data.entity.lastUpdated && <span><b className="text-slate-700">Última toma de datos:</b> {data.entity.lastUpdated}</span>}
                </div>
                {data.entity.source && <p className="text-xs text-slate-400">Fuente: {data.entity.source}</p>}
              </div>
            )}
            {level === 'metrica' && (
              <div className="space-y-1">
                <p className="text-sm text-slate-600 leading-relaxed">{data.entity.description || 'Sin descripción.'}</p>
                {data.entity.unit && <p className="text-xs text-slate-500"><b className="text-slate-700">Unidad de medida:</b> {data.entity.unit}</p>}
              </div>
            )}
          </div>

          {/* Territory-specific data */}
          {level !== 'metrica' ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Datos en {data.territory?.name}
              </h3>
              {level === 'objetivo' && (
                data.hasData ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${data.score}%`, backgroundColor: getColorForScore(data.score) }} />
                    </div>
                    <span className="text-2xl font-black" style={{ color: getColorForScore(data.score) }}>{data.score}%</span>
                  </div>
                ) : <p className="text-sm text-slate-400 italic">Sin datos para este territorio.</p>
              )}
              {(level === 'indicador' || level === 'marcador') && (
                data.observation ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      {data.observation.score != null && (
                        <>
                          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${data.observation.score}%`, backgroundColor: getColorForScore(data.observation.score) }} />
                          </div>
                          <span className="text-2xl font-black shrink-0" style={{ color: getColorForScore(data.observation.score) }}>{data.observation.score}%</span>
                        </>
                      )}
                    </div>
                    {data.observation.raw_value && <p className="text-xs text-slate-500">{data.observation.raw_value}</p>}
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                      {data.observation.date && <span>Fecha: {data.observation.date}</span>}
                      {data.observation.source && <span>Fuente: {data.observation.source}</span>}
                    </div>
                  </div>
                ) : <p className="text-sm text-slate-400 italic">Sin datos para este territorio todavía.</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5" /> Estaciones de medición ({data.territory?.name} y alrededores, radio {data.radiusKm} km)
              </h3>
              {data.stations && data.stations.length > 0 ? (
                <div className="space-y-2">
                  {data.stations.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {s.withinTerritory ? 'En el territorio' : `A ${s.distanceKm} km`}
                          {s.date && ` · ${s.date}`}
                          {s.value != null && ` · ${s.value} ${s.unit || ''}`}
                        </p>
                      </div>
                      {s.level ? (
                        <span
                          className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-white shrink-0"
                          style={{ backgroundColor: LEVEL_COLORS[s.level] || '#94a3b8' }}
                        >
                          {LEVEL_LABELS[s.level] || s.level}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 shrink-0">Sin dato</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No hay estaciones de medición registradas cerca de este territorio.</p>
              )}
            </div>
          )}

          {/* Children (drill-down) */}
          {data.children && data.children.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                {level === 'objetivo' && 'Indicadores'}
                {level === 'indicador' && 'Marcadores'}
                {level === 'marcador' && 'Métricas'}
              </h3>
              {level === 'objetivo' ? (
                <div className="flex flex-row items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {data.children.map((child: any) => {
                    const ChildIcon = iconForLevel(child.level, child.id);
                    return (
                      <div key={child.id} className="relative shrink-0 group">
                        <button
                          onClick={() => onNavigate(child.level, child.id)}
                          className="flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-full border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors whitespace-nowrap"
                        >
                          <ChildIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-700">{child.name}</span>
                          <ChildBadge child={child} />
                        </button>
                        {user?.isAdmin && (
                          <AdminMenu
                            className="absolute -top-1 -right-1 bg-white rounded-full shadow-sm"
                            onEdit={() => openEdit(
                              EXPLORER_LEVEL_LABELS[child.level as ExplorerLevel],
                              getChildEntity(child),
                              () => {},
                              () => {}
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.children.map((child: any) => {
                    const ChildIcon = iconForLevel(child.level, child.id);
                    return (
                      <div key={child.id} className="relative group">
                        <button
                          onClick={() => onNavigate(child.level, child.id)}
                          className="w-full flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors text-left"
                        >
                          <ChildIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="flex-1 text-xs font-semibold text-slate-700 truncate pr-5">{child.name}</span>
                          <ChildBadge child={child} />
                        </button>
                        {user?.isAdmin && (
                          <AdminMenu
                            className="absolute top-1 right-1"
                            onEdit={() => openEdit(
                              EXPLORER_LEVEL_LABELS[child.level as ExplorerLevel],
                              getChildEntity(child),
                              () => {},
                              () => {}
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {level === 'metrica' && (
            <p className="text-[11px] text-slate-300 italic">Este es el nivel más profundo de esta jerarquía — no hay más niveles por debajo.</p>
          )}

          {/* Retos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Retos</h3>
            </div>
            {(data.challenges && data.challenges.length > 0) || user?.isAdmin ? (
              <div className="flex flex-row flex-wrap gap-3">
                {(data.challenges || []).map((c: any) => {
                  const graphTo = challengeGraphTo(c.id);
                  return (
                  <div key={c.id} className="relative">
                    {graphTo ? (
                      <EntitySphere title={c.title} gradient="from-red-500 to-rose-600" to={graphTo} />
                    ) : (
                      <EntitySphere
                        title={c.title}
                        gradient="from-red-500 to-rose-600"
                        active={selectedChallengeId === c.id}
                        onClick={() => setSelectedChallengeId(prev => (prev === c.id ? null : c.id))}
                      />
                    )}
                    {user?.isAdmin && (
                      <AdminMenu
                        className="absolute -top-1 -right-1 bg-white rounded-full shadow-sm"
                        onEdit={() => openEdit('Reto', c, () => {}, () => { if (selectedChallengeId === c.id) setSelectedChallengeId(null); })}
                      />
                    )}
                  </div>
                  );
                })}
                {user?.isAdmin && <AddSphere title="Añadir reto" onClick={handleAddChallenge} />}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No hay retos registrados para este nivel en {data.territory?.name}.</p>
            )}
          </div>

          {/* Gráfico de causas del reto seleccionado */}
          {selectedChallengeId && (
            <CauseDonutChart
              challengeId={selectedChallengeId}
              challengeTitle={data.challenges.find((c: any) => c.id === selectedChallengeId)?.title || ''}
              territoryName={data.territory?.name || ''}
              onClose={() => setSelectedChallengeId(null)}
            />
          )}

          {/* Soluciones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Soluciones</h3>
            </div>
            {(data.solutions && data.solutions.length > 0) || user?.isAdmin ? (
              <div className="flex flex-row flex-wrap gap-3">
                {(data.solutions || []).map((s: any) => (
                  <div key={s.id} className="relative">
                    <EntitySphere title={s.title} to={`/soluciones/${slugify(s.title)}`} gradient="from-emerald-500 to-teal-600" />
                    {user?.isAdmin && (
                      <AdminMenu
                        className="absolute -top-1 -right-1 bg-white rounded-full shadow-sm"
                        onEdit={() => openEdit('Solución', s, () => {}, () => {})}
                      />
                    )}
                  </div>
                ))}
                {user?.isAdmin && <AddSphere title="Añadir solución" onClick={handleAddSolution} />}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No hay soluciones vinculadas todavía.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
