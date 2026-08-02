import React, { useState, useEffect } from 'react';
import HumanityMap, { ObjectiveKey } from '../components/HumanityMap';
import Objectives from './Objectives';
import { MapPin, X, Check, Droplet, Wheat, Home, Heart, Users, Leaf, Layers } from 'lucide-react';
import { mapService } from '../services/MapService';
import { OBJECTIVE_ID_BY_KEY } from '../utils/objectiveIds';
import { INDICATOR_ICONS } from '../utils/indicatorIcons';


export default function MapPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCoords, setNewCoords] = useState<[number, number] | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'municipality', description: '' });
  const [selectedTerritory, setSelectedTerritory] = useState<any>(null);
  const [reloadTrigger, setReloadTrigger] = useState(false);

  // Filters
  const [activeObjective, setActiveObjective] = useState<ObjectiveKey>('overall');
  const [activeIndicatorId, setActiveIndicatorId] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/data/indicators')
      .then(r => r.json())
      .then(setIndicators)
      .catch(err => console.error('Error loading indicators', err));
  }, []);

  const handleObjectiveChange = (key: ObjectiveKey) => {
    setActiveObjective(key);
    setActiveIndicatorId(null);
  };

  const activeObjectiveIndicators = activeObjective === 'overall'
    ? []
    : indicators.filter(i => i.objective_id === OBJECTIVE_ID_BY_KEY[activeObjective]);

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
    <div className="flex flex-col w-full h-full bg-slate-50 overflow-hidden font-sans relative">
      <div className="flex-1 relative z-0 flex min-h-0">
        <div className="flex-1 h-full relative">
          <HumanityMap 
            onFeatureClick={handleFeatureClick}
            onMapClick={() => setSelectedTerritory(null)}
            onMapDoubleClick={handleMapDoubleClick}
            shouldReload={reloadTrigger}
            activeObjective={activeObjective}
            activeChallenge={null}
            activeIndicatorId={activeIndicatorId}
            indicators={indicators}
          />

          {/* Centered Bottom Bar with 6 Objectives Icons (+ General) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-slate-200/80 max-w-[95vw] overflow-x-auto">
            {objectivesList.map(obj => {
              const Icon = obj.icon;
              const isActive = activeObjective === obj.key;
              return (
                <button
                  key={obj.key}
                  onClick={() => handleObjectiveChange(obj.key)}
                  title={obj.label}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md scale-105'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 opacity-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : obj.color}`} />
                  <span className={`hidden md:inline transition-all ${isActive ? 'text-base font-extrabold' : 'text-xs'}`}>{obj.label}</span>
                </button>
              );
            })}
          </div>

          {/* Indicator sub-filter: appears when an objective (not "General") is selected and has indicators */}
          {activeObjectiveIndicators.length > 0 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-slate-200/80 max-w-[95vw] overflow-x-auto">
              {activeObjectiveIndicators.map(indicator => {
                const Icon = INDICATOR_ICONS[indicator.id] || Layers;
                const isActive = activeIndicatorId === indicator.id;
                return (
                  <button
                    key={indicator.id}
                    onClick={() => setActiveIndicatorId(isActive ? null : indicator.id)}
                    title={indicator.name}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md scale-105'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{indicator.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CONTEXTUAL SIDE PANEL */}
        {selectedTerritory && (
          <div className="w-[45rem] max-w-full bg-white border-l border-slate-200 shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-right duration-300 relative min-h-0">
            <div className="absolute top-4 right-4 z-50 flex gap-2">
              <button
                onClick={() => {
                  const url = `/objetivos?territorio=${selectedTerritory.id}`;
                  window.open(url, '_blank');
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 transition-colors"
                title="Abrir en pantalla completa"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </button>
              <button 
                onClick={() => setSelectedTerritory(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-500 transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 pt-16 sm:pt-16">
              <Objectives embeddedTerritoryId={selectedTerritory.id} />
            </div>
          </div>
        )}
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
