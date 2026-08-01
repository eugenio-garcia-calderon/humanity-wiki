import { useState, useEffect as _useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/core';
import { useEffect } from 'react';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { useDesign } from '../contexts/DesignContext';
import { cn } from '../utils/cn';
import { Droplets, Wheat, Home as HomeIcon, HeartPulse, Users, TreePine, Plus, X, MapPin } from 'lucide-react';

const iconMap: Record<string, any> = {
  'AGUA': Droplets,
  'ALIMENTACIÓN': Wheat,
  'VIVIENDA': HomeIcon,
  'SALUD': HeartPulse,
  'CONVIVENCIA': Users,
  'ECOSISTEMAS': TreePine,
};

export default function Home() {
  const navigate = useNavigate();
  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  const { objectiveImages } = useDesign();
  
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>(["T001", "T002", "T003", "T004", "T005"]);
  const [selectorOpenFor, setSelectorOpenFor] = useState<number | null>(null);
  
  const [territories, setTerritories] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  
  _useEffect(() => {
    fetch('/api/territories').then(r => r.json()).then(data => setTerritories(data));
    fetch('/api/objectives').then(r => r.json()).then(data => setObjectives(data));
  }, []);

  const handleTerritorySelect = (index: number, id: string) => {
    const newSelection = [...selectedTerritories];
    newSelection[index] = id;
    setSelectedTerritories(newSelection);
    setSelectorOpenFor(null);
  };

  const removeTerritory = (index: number) => {
    const newSelection = [...selectedTerritories];
    newSelection.splice(index, 1);
    setSelectedTerritories(newSelection);
    if (selectorOpenFor === index) {
      setSelectorOpenFor(null);
    }
  };

  const addComparison = () => {
    if (selectedTerritories.length < 10) {
      setSelectedTerritories([...selectedTerritories, "T003"]); // Default second to Spain
    }
  };

  const territoryTypes = ['planet', 'continent', 'country', 'region', 'municipality', 'comunidad_vecinos', 'aldea'];
  const typeLabels: Record<string, string> = {
    planet: 'Mundo',
    continent: 'Continente',
    country: 'País',
    region: 'Región',
    municipality: 'Municipio',
    comunidad_vecinos: 'Comunidad de Vecinos',
    aldea: 'Aldea'
  };

  const bgColors = [
    "bg-slate-50",
    "bg-blue-50/30",
    "bg-amber-50/30",
    "bg-purple-50/30",
    "bg-rose-50/30",
    "bg-cyan-50/30",
    "bg-indigo-50/30",
    "bg-orange-50/30",
    "bg-teal-50/30",
    "bg-pink-50/30",
  ];
  const borderColors = [
    "border-slate-200",
    "border-blue-200",
    "border-amber-200",
    "border-purple-200",
    "border-rose-200",
    "border-cyan-200",
    "border-indigo-200",
    "border-orange-200",
    "border-teal-200",
    "border-pink-200",
  ];
  const textColors = [
    "text-slate-900",
    "text-blue-900",
    "text-amber-900",
    "text-purple-900",
    "text-rose-900",
    "text-cyan-900",
    "text-indigo-900",
    "text-orange-900",
    "text-teal-900",
    "text-pink-900",
  ];
  const progressColors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-pink-500",
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      
      <div className="flex flex-col gap-8">
        {selectedTerritories.map((selectedId, index) => {
          const selectedTerritory = territories.find(t => t.id === selectedId);
          return (
            <div key={`row-${index}`} className={cn("p-4 sm:p-6 rounded-3xl border relative", bgColors[index % 10], borderColors[index % 10])}>
              
              {/* Header & Selector */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className={cn("text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3", textColors[index % 10])}>
                      {selectedTerritory?.name}
                      <button 
                        onClick={() => setSelectorOpenFor(selectorOpenFor === index ? null : index)}
                        className="text-sm font-medium px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-black/5 shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <MapPin className="w-4 h-4" />
                        Elegir otro territorio
                      </button>
                    </h2>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1">
                      {typeLabels[selectedTerritory?.type || '']}
                    </p>
                  </div>
                </div>

                {selectorOpenFor === index && (
                  <div className="absolute top-20 left-4 right-4 z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-black/10 shadow-xl flex flex-wrap items-center gap-2">
                    <div className="w-full flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Seleccionar territorio</span>
                      <button onClick={() => setSelectorOpenFor(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {territoryTypes.map(type => {
                      const typeTerritories = territories.filter(t => t.type === type);
                      if (typeTerritories.length === 0) return null;
                      
                      return (
                        <div key={type} className="flex-1 min-w-[100px]">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">{typeLabels[type]}</label>
                          <select
                            value={typeTerritories.find(t => t.id === selectedId) ? selectedId : ""}
                            onChange={(e) => {
                              if (e.target.value) handleTerritorySelect(index, e.target.value);
                            }}
                            className={cn(
                              "w-full px-2 py-1.5 border rounded-lg text-xs transition-all focus:outline-none focus:ring-2",
                              typeTerritories.find(t => t.id === selectedId) 
                                ? "border-slate-300 bg-slate-50 text-slate-900 font-medium shadow-sm focus:ring-slate-200" 
                                : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100"
                            )}
                          >
                            <option value="" disabled className="text-slate-400">Seleccionar...</option>
                            {typeTerritories.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {index > 0 && (
                  <button onClick={() => removeTerritory(index)} className="p-2 ml-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 absolute top-4 right-4">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Objectives Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {objectives.map(obj => {
                  const Icon = iconMap[obj.title] || TreePine;
                  const imgPath = objectiveImages[obj.title];
                  const progress = obj.progress_by_territory?.[selectedId] || 0;
                  
                  return (
                    <Card 
                      key={obj.id} 
                      className={cn("p-4 relative group transition-all flex flex-col h-full bg-white hover:border-slate-400 shadow-sm cursor-pointer")}
                      onClick={(e) => {
                        // Avoid navigating if clicking on admin menu
                        if ((e.target as HTMLElement).closest('.admin-menu-trigger')) return;
                        navigate(`/objetivos/${obj.title.toLowerCase()}`);
                      }}
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity admin-menu-trigger z-10">
                        <AdminMenu onEdit={() => {
                          // Allow editing only the current territory progress
                          const editData = {
                            ...obj,
                            progress_by_territory: {
                              [selectedId]: obj.progress_by_territory?.[selectedId] || 0
                            }
                          };
                          openEdit('Objetivo', editData, (data) => {
                            obj.title = data.title;
                            obj.description = data.description;
                            if (data.progress_by_territory) {
                              obj.progress_by_territory = {
                                ...obj.progress_by_territory,
                                [selectedId]: data.progress_by_territory[selectedId]
                              };
                            }
                          });
                        }} />
                      </div>
                      
                      {imgPath ? (
                        <div className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform flex items-center justify-center relative">
                          <img 
                            src={imgPath} 
                            alt={obj.title} 
                            className="max-w-full max-h-full object-contain mix-blend-multiply opacity-80"
                            onError={(e) => {
                              // Fallback to icon if image is missing
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextElementSibling) {
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                          <div className={cn("w-12 h-12 rounded-lg items-center justify-center bg-slate-50", "hidden")}>
                            <Icon className={cn("w-6 h-6 text-slate-700")} strokeWidth={2} />
                          </div>
                        </div>
                      ) : (
                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform bg-slate-50")}>
                          <Icon className={cn("w-6 h-6 text-slate-700")} strokeWidth={2} />
                        </div>
                      )}
                      
                      <h3 className="font-bold text-xs tracking-tight text-slate-900 mb-1">{obj.title}</h3>
                      <p className="text-[10px] text-slate-500 leading-snug mb-4 flex-1 line-clamp-4">{obj.description}</p>
                      
                      <div className="mt-auto pt-3 border-t border-slate-50">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Desarrollo
                          </span>
                          <span className="text-sm font-semibold text-slate-900">{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              progress > 90 ? "bg-emerald-400" :
                              progress >= 80 ? "bg-lime-400" :
                              progress >= 70 ? "bg-amber-400" :
                              progress >= 60 ? "bg-orange-500" :
                              progress >= 50 ? "bg-rose-400" :
                              progress >= 30 ? "bg-rose-800" : "bg-stone-800"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {selectedTerritories.length < 10 && (
          <button 
            onClick={addComparison}
            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Añadir territorio para comparar
          </button>
        )}
      </div>
    </div>
  );
}
