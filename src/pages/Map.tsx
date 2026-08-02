import React, { useState, useEffect } from 'react';
import HumanityMap, { ObjectiveKey } from '../components/HumanityMap';
import Objectives from './Objectives';
import { MapPin, X, Check, Droplet, Wheat, Home, Heart, Users, Leaf, Layers, ChevronDown } from 'lucide-react';
import { mapService } from '../services/MapService';
import { OBJECTIVE_ID_BY_KEY } from '../utils/objectiveIds';
import { INDICATOR_ICONS } from '../utils/indicatorIcons';
import { MARKER_ICONS } from '../utils/markerIcons';
import { METRIC_ICONS } from '../utils/metricIcons';


export default function MapPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoords, setNewCoords] = useState<[number, number] | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'municipality', description: '' });
  const [selectedTerritory, setSelectedTerritory] = useState<any>(null);
  const [reloadTrigger, setReloadTrigger] = useState(false);

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

  const handleObjectiveChange = (key: ObjectiveKey) => {
    setActiveObjective(key);
    setActiveIndicatorId(null);
    setActiveMarkerId(null);
    setActiveMetricId(null);
  };

  const handleIndicatorChange = (indicatorId: string) => {
    const isActive = activeIndicatorId === indicatorId;
    setActiveIndicatorId(isActive ? null : indicatorId);
    setActiveMarkerId(null);
    setActiveMetricId(null);
  };

  const handleMarkerChange = (markerId: string) => {
    const isActive = activeMarkerId === markerId;
    setActiveMarkerId(isActive ? null : markerId);
    setActiveMetricId(null);
  };

  const handleFeatureClick = async (id: string, type: string) => {
    try {
      const res = await fetch(`/api/territories/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTerritory({
          id: data.id,
          name: data.name,
          type: data.type,
          description: data.description,
          population: data.population || 0,
          area: data.area_km2 || 0,
          challenges: data.challenges
        });
      } else {
        setSelectedTerritory({
          id,
          name: id.startsWith('T_') ? id.replace('T_', '').replace(/_/g, ' ') : id,
          type,
          description: '',
          population: 0,
          area: 0,
          challenges: []
        });
      }
    } catch (e) {
      console.error(e);
      setSelectedTerritory({
        id,
        name: id.startsWith('T_') ? id.replace('T_', '').replace(/_/g, ' ') : id,
        type,
        description: '',
        population: 0,
        area: 0,
        challenges: []
      });
    }
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
  ];

  return (
    <div className="flex w-full h-full bg-slate-50 overflow-hidden font-sans relative">
      {/* COLUMN 1 (~1/5): vertical accordion filters — Objetivo > Indicador > Marcador > Métrica */}
      <div className="w-1/5 min-w-[210px] h-full overflow-y-auto bg-white border-r border-slate-200 shrink-0">
        <div className="px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Filtros</h2>
        </div>

        {objectivesList.map(obj => {
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
                <span className={`flex-1 font-semibold ${isObjActive ? 'text-sm' : 'text-xs'}`}>{obj.label}</span>
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
                          className={`w-full flex items-center gap-2 pl-6 pr-4 py-2 text-left text-xs font-semibold transition-colors ${
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
                                    className={`w-full flex items-center gap-2 pl-9 pr-4 py-1.5 text-left text-[11px] font-semibold transition-colors ${
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
                                            onClick={() => setActiveMetricId(isMetActive ? null : metric.id)}
                                            className={`w-full flex items-center gap-2 pl-12 pr-4 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide transition-colors ${
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

      {/* COLUMN 2 (~2/5): permanent territory panel (replaces the old floating panel) */}
      <div className="w-2/5 h-full overflow-y-auto bg-white border-r border-slate-200 shrink-0">
        {selectedTerritory ? (
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
            <Objectives embeddedTerritoryId={selectedTerritory.id} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <MapPin className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">Selecciona un territorio en el mapa</p>
            <p className="text-xs mt-1 text-slate-300">Aquí verás sus objetivos, retos y soluciones</p>
          </div>
        )}
      </div>

      {/* COLUMN 3 (~2/5): the map */}
      <div className="w-2/5 h-full relative">
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
