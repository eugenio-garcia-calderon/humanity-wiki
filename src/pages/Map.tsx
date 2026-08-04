import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import HumanityMap, { ObjectiveKey } from '../components/HumanityMap';
import Objectives from './Objectives';
import EntityExplorerPanel, { ExplorerLevel, BreadcrumbEntry } from '../components/explorer/EntityExplorerPanel';
import { MapPin, X, Check, Droplet, Wheat, Home, Heart, Users, Leaf, Layers, ChevronDown, Menu, GraduationCap, Car, Zap, Cpu, Briefcase, Landmark, Coins, Palette } from 'lucide-react';
import { mapService } from '../services/MapService';
import { useHelpers } from '../contexts/DataContext';
import { slugify } from '../utils/slugify';
import { OBJECTIVE_ID_BY_KEY } from '../utils/objectiveIds';
import { INDICATOR_ICONS } from '../utils/indicatorIcons';
import { MARKER_ICONS } from '../utils/markerIcons';
import { METRIC_ICONS } from '../utils/metricIcons';
import { usePanelWidth } from '../hooks/usePanelWidth';
import ResizeHandle from '../components/ui/ResizeHandle';

const OBJECTIVE_KEY_BY_ID: Record<string, ObjectiveKey> = Object.fromEntries(
  Object.entries(OBJECTIVE_ID_BY_KEY).map(([key, id]) => [id, key])
) as Record<string, ObjectiveKey>;

async function loadTerritoryDetail(tid: string) {
  try {
    const res = await fetch(`/api/territories/${tid}`);
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        population: data.population || 0,
        area: data.area_km2 || 0,
        challenges: data.challenges,
        isAiGenerated: !!data.is_ai_generated,
      };
    }
  } catch (e) {
    console.error(e);
  }
  return {
    id: tid,
    name: tid.startsWith('T_') ? tid.replace('T_', '').replace(/_/g, ' ') : tid,
    type: 'region',
    description: '',
    population: 0,
    area: 0,
    challenges: [],
    isAiGenerated: false,
  };
}

export default function MapPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoords, setNewCoords] = useState<[number, number] | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'municipality', description: '' });
  const [selectedTerritory, setSelectedTerritory] = useState<any>(null);
  const [reloadTrigger, setReloadTrigger] = useState(false);
  // Filters menu: collapsed to a slim icon rail by default on mobile, open by
  // default on tablet/desktop. While collapsed, hovering the rail reveals the
  // full menu as a floating flyout (like VS Code/Codex's sidebar) without
  // pushing the other two columns.
  const [menuCollapsed, setMenuCollapsed] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  ));
  const [menuHoverPeek, setMenuHoverPeek] = useState(false);
  const menuShowFull = !menuCollapsed || menuHoverPeek;
  const menuIsFlyout = menuCollapsed && menuHoverPeek;
  // Anchos de columna redimensionables y grabados en la cuenta del usuario
  // (ver 04_ROADMAP.md, petición de ensanchar/estrechar todas las ventanas).
  const { width: filtrosWidth, startResize: startResizeFiltros, dragging: draggingFiltros } =
    usePanelWidth('filtros', 16, { min: 10, max: 30 });
  const { width: explorerWidth, startResize: startResizeExplorer, dragging: draggingExplorer } =
    usePanelWidth('explorer', 40, { min: 25, max: 60 });
  const [searchParams, setSearchParams] = useSearchParams();
  const { territories, loading: territoriesLoading } = useHelpers();
  const [territoryResolved, setTerritoryResolved] = useState(false);

  // Filters
  const [activeObjective, setActiveObjective] = useState<ObjectiveKey>('overall');
  const [activeIndicatorId, setActiveIndicatorId] = useState<string | null>(null);
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/data/indicators')
      .then(r => r.json())
      .then(setIndicators)
      .catch(err => console.error('Error loading indicators', err));
    fetch('/api/data/markers')
      .then(r => r.json())
      .then(setMarkers)
      .catch(err => console.error('Error loading markers', err));
    fetch('/api/data/metrics')
      .then(r => r.json())
      .then(setMetrics)
      .catch(err => console.error('Error loading metrics', err));
  }, []);

  const updateUrlParams = (patch: Record<string, string | null>, opts?: { replace?: boolean }) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value == null) next.delete(key);
        else next.set(key, value);
      });
      return next;
    }, opts?.replace ? { replace: true } : undefined);
  };

  // Resolve which territory to show on first load: the `territorio` slug
  // already in the URL if it matches one we know, otherwise a best-effort
  // guess from the visitor's IP (falls back to "Mundo" — see /api/geo/locate).
  useEffect(() => {
    if (territoriesLoading || territoryResolved) return;
    let cancelled = false;
    (async () => {
      const slug = searchParams.get('territorio');
      const match = slug ? territories.find((t: any) => slugify(t.name) === slug) : null;

      if (match) {
        const detail = await loadTerritoryDetail(match.id);
        if (!cancelled) setSelectedTerritory(detail);
      } else {
        let territoryId = 'T001';
        try {
          const res = await fetch('/api/geo/locate');
          if (res.ok) {
            const json = await res.json();
            territoryId = json.territoryId || 'T001';
          }
        } catch (e) {
          console.error('Error locating default territory', e);
        }
        const detail = await loadTerritoryDetail(territoryId);
        if (!cancelled) {
          setSelectedTerritory(detail);
          updateUrlParams({ territorio: slugify(detail.name) }, { replace: true });
        }
      }
      if (!cancelled) setTerritoryResolved(true);
    })();
    return () => { cancelled = true; };
  }, [territoriesLoading, territoryResolved]);

  // Resolve the full ancestor chain (Objetivo -> Indicador -> Marcador -> Métrica)
  // for a given level+id using the already-loaded lists, so a deep link (or a
  // browser back/forward step) lands on a fully consistent filter state.
  const resolveAncestors = (level: ExplorerLevel, id: string) => {
    let objectiveId: string | null = null;
    let indicatorId: string | null = null;
    let markerId: string | null = null;
    let metricId: string | null = null;

    if (level === 'objetivo') {
      objectiveId = id;
    } else if (level === 'indicador') {
      indicatorId = id;
      objectiveId = indicators.find(i => i.id === id)?.objective_id ?? null;
    } else if (level === 'marcador') {
      markerId = id;
      indicatorId = markers.find(m => m.id === id)?.indicator_id ?? null;
      objectiveId = indicators.find(i => i.id === indicatorId)?.objective_id ?? null;
    } else if (level === 'metrica') {
      metricId = id;
      markerId = metrics.find(m => m.id === id)?.marker_id ?? null;
      indicatorId = markers.find(m => m.id === markerId)?.indicator_id ?? null;
      objectiveId = indicators.find(i => i.id === indicatorId)?.objective_id ?? null;
    }

    return { objectiveId, indicatorId, markerId, metricId };
  };

  // Keep the 4 cascading filter states in sync with the URL's `nivel`+`id`,
  // so the left menu, the center panel and browser back/forward all agree.
  useEffect(() => {
    const nivel = searchParams.get('nivel') as ExplorerLevel | null;
    const entId = searchParams.get('id');
    if (nivel && entId) {
      const { objectiveId, indicatorId, markerId, metricId } = resolveAncestors(nivel, entId);
      setActiveObjective(objectiveId ? (OBJECTIVE_KEY_BY_ID[objectiveId] || 'overall') : 'overall');
      setActiveIndicatorId(indicatorId);
      setActiveMarkerId(markerId);
      setActiveMetricId(metricId);
    } else {
      setActiveObjective('overall');
      setActiveIndicatorId(null);
      setActiveMarkerId(null);
      setActiveMetricId(null);
    }
  }, [searchParams, indicators, markers, metrics]);

  const navigateExplorer = (level: ExplorerLevel, id: string) => {
    const { objectiveId, indicatorId, markerId, metricId } = resolveAncestors(level, id);
    setActiveObjective(objectiveId ? (OBJECTIVE_KEY_BY_ID[objectiveId] || 'overall') : 'overall');
    setActiveIndicatorId(indicatorId);
    setActiveMarkerId(markerId);
    setActiveMetricId(metricId);
    updateUrlParams({ nivel: level, id });
  };

  const clearExplorer = () => {
    setActiveObjective('overall');
    setActiveIndicatorId(null);
    setActiveMarkerId(null);
    setActiveMetricId(null);
    updateUrlParams({ nivel: null, id: null });
  };

  const handleObjectiveChange = (key: ObjectiveKey) => {
    if (key === 'overall' || key === activeObjective) {
      // Clicking the already-active objective collapses its indicator accordion.
      clearExplorer();
    } else {
      navigateExplorer('objetivo', OBJECTIVE_ID_BY_KEY[key]);
    }
  };

  const handleIndicatorChange = (indicatorId: string) => {
    const isActive = activeIndicatorId === indicatorId;
    if (isActive) {
      const objId = OBJECTIVE_ID_BY_KEY[activeObjective];
      if (objId) navigateExplorer('objetivo', objId); else clearExplorer();
    } else {
      navigateExplorer('indicador', indicatorId);
    }
  };

  const handleMarkerChange = (markerId: string) => {
    const isActive = activeMarkerId === markerId;
    if (isActive) {
      if (activeIndicatorId) navigateExplorer('indicador', activeIndicatorId); else clearExplorer();
    } else {
      navigateExplorer('marcador', markerId);
    }
  };

  const handleMetricChange = (metricId: string) => {
    const isActive = activeMetricId === metricId;
    if (isActive) {
      if (activeMarkerId) navigateExplorer('marcador', activeMarkerId); else clearExplorer();
    } else {
      navigateExplorer('metrica', metricId);
    }
  };

  const currentExplorerLevel: ExplorerLevel | null = activeMetricId
    ? 'metrica' : activeMarkerId
    ? 'marcador' : activeIndicatorId
    ? 'indicador' : (activeObjective !== 'overall' ? 'objetivo' : null);
  const currentExplorerId: string | null = activeMetricId || activeMarkerId || activeIndicatorId
    || (activeObjective !== 'overall' ? OBJECTIVE_ID_BY_KEY[activeObjective] : null);

  const buildBreadcrumb = (): BreadcrumbEntry[] => {
    const crumbs: BreadcrumbEntry[] = [];
    if (activeObjective !== 'overall') {
      const objId = OBJECTIVE_ID_BY_KEY[activeObjective];
      const objLabel = objectivesList.find(o => o.key === activeObjective)?.label || activeObjective;
      crumbs.push({ level: 'objetivo', id: objId, name: objLabel });
    }
    if (activeIndicatorId) {
      const ind = indicators.find(i => i.id === activeIndicatorId);
      crumbs.push({ level: 'indicador', id: activeIndicatorId, name: ind?.name || activeIndicatorId });
    }
    if (activeMarkerId) {
      const mk = markers.find(m => m.id === activeMarkerId);
      crumbs.push({ level: 'marcador', id: activeMarkerId, name: mk?.name || activeMarkerId });
    }
    if (activeMetricId) {
      const me = metrics.find(m => m.id === activeMetricId);
      crumbs.push({ level: 'metrica', id: activeMetricId, name: me?.name || activeMetricId });
    }
    return crumbs;
  };

  const handleFeatureClick = async (id: string, type: string) => {
    const detail = await loadTerritoryDetail(id);
    setSelectedTerritory(detail);
    updateUrlParams({ territorio: slugify(detail.name) });
  };

  const handleMapDoubleClick = (lngLat: any) => {
    if (selectedTerritory) {
      setSelectedTerritory(null);
    } else {
      setNewCoords([lngLat.lng, lngLat.lat]); 
      setShowAddModal(true);
    }
  };

  const handleSaveTerritory = async () => {
    if (!newCoords || !formData.name) return;
    try {
      await mapService.createTerritory({
        name: formData.name,
        type: formData.type,
        description: formData.description,
        coordinates: newCoords
      });
      setShowAddModal(false);
      setFormData({ name: '', type: 'municipality', description: '' });
      setReloadTrigger(prev => !prev);
    } catch (e) {
      console.error(e);
      alert("Error al guardar el territorio");
    }
  };

  const objectivesList: { key: ObjectiveKey; label: string; icon: any; color: string }[] = [
    { key: 'overall', label: 'General', icon: Layers, color: 'text-slate-600' },
    { key: 'agua', label: 'Agua', icon: Droplet, color: 'text-blue-500' },
    { key: 'alimentacion', label: 'Alimentación', icon: Wheat, color: 'text-amber-500' },
    { key: 'vivienda', label: 'Vivienda', icon: Home, color: 'text-indigo-500' },
    { key: 'salud', label: 'Salud', icon: Heart, color: 'text-rose-500' },
    { key: 'convivencia', label: 'Convivencia', icon: Users, color: 'text-purple-500' },
    { key: 'ecosistemas', label: 'Ecosistemas', icon: Leaf, color: 'text-emerald-500' },
    { key: 'educacion', label: 'Educación', icon: GraduationCap, color: 'text-sky-500' },
    { key: 'movilidad', label: 'Movilidad', icon: Car, color: 'text-orange-500' },
    { key: 'energia', label: 'Energía', icon: Zap, color: 'text-yellow-500' },
    { key: 'tecnologia', label: 'Tecnología', icon: Cpu, color: 'text-cyan-500' },
    { key: 'empleo', label: 'Empleo', icon: Briefcase, color: 'text-lime-500' },
    { key: 'gobernanza', label: 'Gobernanza', icon: Landmark, color: 'text-fuchsia-500' },
    { key: 'economia', label: 'Economía', icon: Coins, color: 'text-violet-500' },
    { key: 'cultura', label: 'Cultura', icon: Palette, color: 'text-pink-500' },
  ];

  return (
    <div className="flex w-full h-full bg-slate-50 overflow-hidden font-sans relative">
      {/* COLUMN 1 (~1/6): vertical accordion filters — Objetivo > Indicador > Marcador > Métrica.
          Collapses to a 56px icon rail; hovering the rail while collapsed opens
          the full menu as a floating flyout instead of resizing the layout. */}
      <div
        className={`relative h-full shrink-0 ${menuCollapsed ? 'w-14 transition-[width] duration-200' : ''}`}
        style={!menuCollapsed ? { width: `${filtrosWidth}%`, minWidth: 168 } : undefined}
        onMouseEnter={() => { if (menuCollapsed) setMenuHoverPeek(true); }}
        onMouseLeave={() => setMenuHoverPeek(false)}
      >
        <div
          className={
            menuIsFlyout
              ? 'absolute inset-y-0 left-0 w-[260px] bg-white border border-slate-200 rounded-r-2xl shadow-2xl z-40 overflow-y-auto'
              : 'h-full w-full bg-white border-r border-slate-200 overflow-y-auto'
          }
        >
          <div className={`sticky top-0 z-10 bg-white border-b border-slate-100 flex items-center ${menuShowFull ? 'justify-between px-4 py-3' : 'justify-center py-3'}`}>
            {menuShowFull && <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Filtros</h2>}
            <button
              onClick={() => setMenuCollapsed(c => !c)}
              title={menuCollapsed ? 'Explorar el conocimiento de la Humanidad' : 'Colapsar menú de filtros'}
              className="relative w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
            >
              <span className="relative w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-600 shadow-lg shadow-emerald-500/40 flex items-center justify-center text-white">
                <Menu className="w-4 h-4" />
              </span>
            </button>
          </div>

          {!menuShowFull && (
            <div className="flex flex-col items-center gap-1 py-2">
              {objectivesList.map(obj => {
                const Icon = obj.icon;
                const isObjActive = activeObjective === obj.key;
                return (
                  <button
                    key={obj.key}
                    title={obj.label}
                    onClick={() => handleObjectiveChange(obj.key)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isObjActive ? 'bg-slate-900 text-emerald-400' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          )}

          {menuShowFull && objectivesList.map(obj => {
          const Icon = obj.icon;
          const isObjActive = activeObjective === obj.key;
          const objIndicators = obj.key === 'overall' ? [] : indicators.filter(i => i.objective_id === OBJECTIVE_ID_BY_KEY[obj.key]);

          return (
            <div key={obj.key} className="border-b border-slate-100">
              <button
                onClick={() => handleObjectiveChange(obj.key)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${
                  isObjActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isObjActive ? 'text-emerald-400' : obj.color}`} />
                <span className={`flex-1 font-semibold ${isObjActive ? 'text-base' : 'text-sm'}`}>{obj.label}</span>
                {objIndicators.length > 0 && (
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isObjActive ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                )}
              </button>

              {isObjActive && objIndicators.length > 0 && (
                <div className="bg-slate-50">
                  {objIndicators.map(indicator => {
                    const IIcon = INDICATOR_ICONS[indicator.id] || Layers;
                    const isIndActive = activeIndicatorId === indicator.id;
                    const indMarkers = markers.filter(m => m.indicator_id === indicator.id);

                    return (
                      <div key={indicator.id}>
                        <button
                          onClick={() => handleIndicatorChange(indicator.id)}
                          className={`w-full flex items-center gap-2 pl-6 pr-4 py-2 text-left text-sm font-semibold transition-colors ${
                            isIndActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <IIcon className={`w-3.5 h-3.5 shrink-0 ${isIndActive ? 'text-white' : 'text-emerald-600'}`} />
                          <span className="flex-1">{indicator.name}</span>
                          {indMarkers.length > 0 && (
                            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isIndActive ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {isIndActive && indMarkers.length > 0 && (
                          <div className="bg-slate-100">
                            {indMarkers.map(marker => {
                              const MIcon = MARKER_ICONS[marker.id] || Layers;
                              const isMarkActive = activeMarkerId === marker.id;
                              const markMetrics = metrics.filter(me => me.marker_id === marker.id);

                              return (
                                <div key={marker.id}>
                                  <button
                                    onClick={() => handleMarkerChange(marker.id)}
                                    className={`w-full flex items-center gap-2 pl-9 pr-4 py-1.5 text-left text-xs font-semibold transition-colors ${
                                      isMarkActive ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200/60'
                                    }`}
                                  >
                                    <MIcon className={`w-3 h-3 shrink-0 ${isMarkActive ? 'text-white' : 'text-slate-500'}`} />
                                    <span className="flex-1">{marker.name}</span>
                                    {markMetrics.length > 0 && (
                                      <ChevronDown className={`w-2.5 h-2.5 shrink-0 transition-transform ${isMarkActive ? 'rotate-180' : ''}`} />
                                    )}
                                  </button>

                                  {isMarkActive && markMetrics.length > 0 && (
                                    <div className="bg-slate-200/40">
                                      {markMetrics.map(metric => {
                                        const MeIcon = METRIC_ICONS[metric.id] || Layers;
                                        const isMetActive = activeMetricId === metric.id;
                                        return (
                                          <button
                                            key={metric.id}
                                            onClick={() => handleMetricChange(metric.id)}
                                            className={`w-full flex items-center gap-2 pl-12 pr-4 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                                              isMetActive ? 'bg-red-600 text-white' : 'text-slate-400 hover:bg-slate-200'
                                            }`}
                                          >
                                            <MeIcon className={`w-3 h-3 shrink-0 ${isMetActive ? 'text-white' : 'text-slate-400'}`} />
                                            <span>{metric.name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
          })}
        </div>
        {!menuCollapsed && (
          <ResizeHandle onMouseDown={startResizeFiltros('right')} edge="right" active={draggingFiltros} />
        )}
      </div>

      {/* COLUMN 2 (~2/5 por defecto, redimensionable): permanent territory panel (replaces the old floating panel) */}
      <div
        className="relative h-full overflow-y-auto bg-white border-r border-slate-200 shrink-0"
        style={{ width: `${explorerWidth}%` }}
      >
        <ResizeHandle onMouseDown={startResizeExplorer('right')} edge="right" active={draggingExplorer} />
        {selectedTerritory ? (
          currentExplorerLevel && currentExplorerId ? (
            <EntityExplorerPanel
              level={currentExplorerLevel}
              id={currentExplorerId}
              territoryId={selectedTerritory.id}
              breadcrumb={buildBreadcrumb()}
              onNavigate={navigateExplorer}
              onClearFilter={clearExplorer}
              indicators={indicators}
              markers={markers}
              metrics={metrics}
            />
          ) : (
            <div className="p-4 sm:p-6">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => {
                    const url = `/objetivos?territorio=${selectedTerritory.id}`;
                    window.open(url, '_blank');
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 transition-colors"
                  title="Abrir en pantalla completa"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </button>
              </div>
              <Objectives
                embeddedTerritoryId={selectedTerritory.id}
                onSelectObjective={(objId) => navigateExplorer('objetivo', objId)}
              />
            </div>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <MapPin className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">Selecciona un territorio en el mapa</p>
            <p className="text-xs mt-1 text-slate-300">Aquí verás sus objetivos, retos y soluciones</p>
          </div>
        )}
      </div>

      {/* COLUMN 3: the map — fills whatever width remains after columns 1 and 2,
          so it reclaims the space freed when the filters menu collapses. */}
      <div className="flex-1 min-w-0 h-full relative">
        <HumanityMap
          onFeatureClick={handleFeatureClick}
          onMapClick={() => setSelectedTerritory(null)}
          onMapDoubleClick={handleMapDoubleClick}
          shouldReload={reloadTrigger}
          activeObjective={activeObjective}
          activeChallenge={null}
          activeIndicatorId={activeIndicatorId}
          indicators={indicators}
          activeMarkerId={activeMarkerId}
          activeMetricId={activeMetricId}
        />
      </div>

      {showAddModal && newCoords && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-500" />
                Nuevo Territorio
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500 font-mono mb-4">
                Coordenadas: Lat {newCoords[1].toFixed(4)}, Lng {newCoords[0].toFixed(4)}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ej. Madrid"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="planet">Planeta</option>
                  <option value="continent">Continente</option>
                  <option value="country">País</option>
                  <option value="region">Región</option>
                  <option value="municipality">Municipio</option>
                  <option value="comunidad_vecinos">Comunidad</option>
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button onClick={handleSaveTerritory} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <Check className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
